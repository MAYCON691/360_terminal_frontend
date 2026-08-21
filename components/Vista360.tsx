// components/Vista360.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from './Navbar'

// ---------------------------------------------------------------------------
// Ajustes rápidos
// ---------------------------------------------------------------------------
const AUTO_ROTATE_SPEED = 0.00006 // radianes/ms del giro automático del planeta
// Ojo con la intuición aquí: en esta proyección, un valor MÁS ALTO de zoom
// es lo que aleja la cámara (planeta chiquito flotando, mucho espacio alrededor).
// Un valor más bajo acerca la cámara (te "pega" al piso, casi sin curvatura).
const INITIAL_ZOOM_DESKTOP = 1.1 // qué tan alejado se ve el planeta al abrir, en computadora
// 👇 ACÁ AJUSTAS EL ZOOM DE CELULAR. Recordá la intuición invertida de arriba:
// subí este número para que el planeta arranque MÁS ALEJADO en celular, bajalo
// para acercarlo. No toca nada de computadora (esa usa INITIAL_ZOOM_DESKTOP).
const INITIAL_ZOOM_MOBILE = 2.2
const MOBILE_BREAKPOINT = 600 // px — mismo breakpoint de celular que usa app/globals.css
const MIN_ZOOM = 0.3 // límite de acercamiento al arrastrar/hacer scroll
const MAX_ZOOM = 6 // límite de alejamiento al arrastrar/hacer scroll
const INITIAL_PITCH = 0.15 // inclinación de reposo del modo planeta (a dónde vuelve "Inicio")
// Cuánto se corre el planeta hacia abajo en pantalla (en el mismo espacio que
// vUv, que va de -1 a 1). Solo aplica en modo planeta: se desvanece a 0 justo
// cuando terminás de entrar, para que la vista normal quede perfectamente
// centrada/nivelada. Súbelo para bajar más el planeta, bájalo para subirlo.
const PLANET_VERTICAL_OFFSET = 0.22
const SHOW_BUTTON_DELAY = 1600 // ms desde que termina de cargar hasta mostrar el botón de entrada
const MORPH_DURATION = 2200 // ms de la animación planeta -> vista normal (el "vuelo hacia adentro"), y también de vuelta
const NORMAL_FOV = 75 // grados, campo de visión al terminar de entrar
// Rango de inclinación permitido al arrastrar (en radianes). Lo ensanché para
// que cubra tanto el modo planeta (cerca de 0) como el modo normal (cerca de
// -90°), y así no haya ningún "salto" al tocar el límite en ningún modo.
const MIN_PITCH = -2.3
const MAX_PITCH = 1.3

// Hacia dónde debe quedar mirando la cámara justo al terminar de entrar.
// - null  -> se queda mirando exactamente hacia donde estaba apuntando el
//            planeta en el momento de hacer clic en "Ingresar" (puede variar
//            según cuánto haya girado el auto-rotate).
// - un número (en grados, 0-360) -> SIEMPRE entra mirando hacia ese rumbo fijo,
//            sin importar dónde haya quedado el planeta al hacer clic.
// Arrastra en modo normal, mira el número de la cajita de arriba a la
// izquierda, y cuando encuentres el ángulo que te guste, pásamelo y lo dejo
// puesto aquí.
const FIXED_ENTER_YAW_DEG: number | null = 6.2

interface Vista360Props {
  /** Ruta de tu foto 360° equirectangular dentro de /public */
  src?: string
}

export default function Vista360({ src = '/DJI_0855.jpg' }: Vista360Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [showEnterButton, setShowEnterButton] = useState(false)
  const [morphing, setMorphing] = useState(false)
  const morphingRef = useRef(false)
  const [yawDisplayDeg, setYawDisplayDeg] = useState(0)

  // ---- WebGL ----
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({})
  const rafIdRef = useRef<number | null>(null)
  const morphRafRef = useRef<number | null>(null)
  const buttonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)

  const rotationRef = useRef({ yaw: 0, pitch: INITIAL_PITCH })
  const zoomRef = useRef(INITIAL_ZOOM_DESKTOP)
  const blendRef = useRef(0) // 0 = planeta pequeño, 1 = vista normal — TODO ocurre sobre el MISMO canvas

  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })

  const VERT_SRC = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `

  const FRAG_SRC = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform float uYaw;
    uniform float uPitch;
    uniform float uAspect;
    uniform float uZoom;
    uniform float uBlend;
    uniform float uFocal;
    uniform float uOffsetY;

    const float PI = 3.14159265359;

    void main() {
      vec2 p = vUv;
      p.x *= uAspect;
      p *= uZoom;
      p.y += uOffsetY;
      float r = length(p);
      float theta = atan(p.y, p.x);

      float cPlanet = 2.0 * atan(r);
      float cNormal = atan(r / uFocal);
      float c = mix(cPlanet, cNormal, uBlend);

      vec3 dir = vec3(sin(c) * cos(theta), -cos(c), sin(c) * sin(theta));

      float cp = cos(uPitch); float sp = sin(uPitch);
      vec3 d2 = vec3(dir.x, dir.y * cp - dir.z * sp, dir.y * sp + dir.z * cp);

      float cy = cos(uYaw); float sy = sin(uYaw);
      vec3 d3 = vec3(d2.x * cy + d2.z * sy, d2.y, -d2.x * sy + d2.z * cy);

      float lon = atan(d3.x, d3.z);
      float lat = asin(clamp(d3.y, -1.0, 1.0));

      float u = fract(0.5 + lon / (2.0 * PI));
      float v = clamp(0.5 - lat / PI, 0.0, 1.0);

      gl_FragColor = vec4(texture2D(uTex, vec2(u, v)).rgb, 1.0);
    }
  `

  // En celular arrancamos con el planeta más alejado (ver INITIAL_ZOOM_MOBILE
  // arriba). Se decide una sola vez al cargar, según el ancho de pantalla.
  const getInitialZoom = () =>
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
      ? INITIAL_ZOOM_MOBILE
      : INITIAL_ZOOM_DESKTOP

  const compileShader = (gl: WebGLRenderingContext, type: number, sourceCode: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, sourceCode)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader))
    }
    return shader
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    const gl = glRef.current
    if (!canvas || !gl) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(canvas.clientWidth * dpr)
    const h = Math.floor(canvas.clientHeight * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    const uniforms = uniformsRef.current
    if (uniforms.uAspect) gl.uniform1f(uniforms.uAspect, canvas.width / canvas.height)
  }

  const renderFrame = () => {
    const gl = glRef.current
    const uniforms = uniformsRef.current
    if (!gl) return
    gl.uniform1f(uniforms.uYaw, rotationRef.current.yaw)
    gl.uniform1f(uniforms.uPitch, rotationRef.current.pitch)
    gl.uniform1f(uniforms.uZoom, zoomRef.current)
    gl.uniform1f(uniforms.uBlend, blendRef.current)
    // El corrimiento del planeta se desvanece a 0 a medida que uBlend avanza,
    // así la vista normal final siempre queda perfectamente nivelada.
    gl.uniform1f(uniforms.uOffsetY, PLANET_VERTICAL_OFFSET * (1 - blendRef.current))
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  // ---- Inicializa el WebGL y carga la textura ----
  // Este mismo canvas se usa SIEMPRE: para el planeta, para la animación de
  // entrada y para la vista normal después. Nunca se cambia de elemento, así
  // que no hay ningún salto ni "cambio feo" — es literalmente la misma imagen
  // todo el tiempo, solo que la proyección con la que se dibuja va cambiando.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    zoomRef.current = getInitialZoom()

    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) {
      console.error('WebGL no está disponible en este navegador.')
      return
    }
    glRef.current = gl

    const program = gl.createProgram()!
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC))
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC))
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPosition = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    uniformsRef.current = {
      uTex: gl.getUniformLocation(program, 'uTex'),
      uYaw: gl.getUniformLocation(program, 'uYaw'),
      uPitch: gl.getUniformLocation(program, 'uPitch'),
      uAspect: gl.getUniformLocation(program, 'uAspect'),
      uZoom: gl.getUniformLocation(program, 'uZoom'),
      uBlend: gl.getUniformLocation(program, 'uBlend'),
      uFocal: gl.getUniformLocation(program, 'uFocal'),
      uOffsetY: gl.getUniformLocation(program, 'uOffsetY'),
    }

    const focal = 1 / Math.tan((NORMAL_FOV / 2) * (Math.PI / 180))
    gl.uniform1f(uniformsRef.current.uFocal, focal)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.uniform1i(uniformsRef.current.uTex, 0)

      setLoading(false)
      buttonTimerRef.current = setTimeout(() => setShowEnterButton(true), SHOW_BUTTON_DELAY)

      const loop = (time: number) => {
        if (lastFrameTimeRef.current == null) lastFrameTimeRef.current = time
        const dt = time - lastFrameTimeRef.current
        lastFrameTimeRef.current = time

        // El giro automático solo aplica en el modo "planeta" puro: se detiene
        // apenas empieza el vuelo de entrada y no vuelve a activarse hasta
        // que volvamos a Inicio.
        if (!isDraggingRef.current && !morphingRef.current && blendRef.current === 0) {
          rotationRef.current.yaw += AUTO_ROTATE_SPEED * dt
        }
        renderFrame()
        rafIdRef.current = requestAnimationFrame(loop)
      }
      rafIdRef.current = requestAnimationFrame(loop)
    }
    img.onerror = () => console.error(`No se pudo cargar la imagen: ${src}`)
    img.src = src

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (morphRafRef.current) cancelAnimationFrame(morphRafRef.current)
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current)
      window.removeEventListener('resize', resizeCanvas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // ---- Cajita de coordenadas: refresca el yaw en pantalla varias veces por
  // segundo, sin interferir con el loop de WebGL (que corre aparte). ----
  useEffect(() => {
    const id = setInterval(() => {
      const deg = ((rotationRef.current.yaw * 180) / Math.PI) % 360
      setYawDisplayDeg(deg < 0 ? deg + 360 : deg)
    }, 150)
    return () => clearInterval(id)
  }, [])

  // ---- Arrastrar para rotar (funciona igual antes y después de entrar) ----
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (morphingRef.current) return
    isDraggingRef.current = true
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastPointerRef.current.x
    const dy = e.clientY - lastPointerRef.current.y
    lastPointerRef.current = { x: e.clientX, y: e.clientY }

    rotationRef.current.yaw += dx * 0.005
    rotationRef.current.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, rotationRef.current.pitch + dy * 0.005))
  }

  const stopDragging = () => {
    isDraggingRef.current = false
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (morphingRef.current) return
    e.preventDefault()
    const delta = e.deltaY * 0.0006
    zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current + delta))
  }

  const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

  // ---- "INGRESAR": vuelo continuo dentro del mismo canvas, de planeta a vista normal ----
  const handleEnter = () => {
    if (morphingRef.current) return
    setShowEnterButton(false)
    setMorphing(true)
    morphingRef.current = true

    const startYaw = rotationRef.current.yaw
    const startPitch = rotationRef.current.pitch
    const startZoom = zoomRef.current
    const targetYaw =
      FIXED_ENTER_YAW_DEG !== null ? (FIXED_ENTER_YAW_DEG * Math.PI) / 180 : startYaw
    // OJO: es -PI/2, no +PI/2. Con +PI/2 la vista queda espejada (mira "al
    // otro lado" y con el cielo abajo) — con -PI/2 queda perfecta, mirando
    // exactamente al horizonte, en el mismo sentido en que ya estabas mirando.
    const targetPitch = -Math.PI / 2
    const targetZoom = 1
    const startTime = performance.now()

    const animateMorph = (now: number) => {
      const t = Math.min(1, (now - startTime) / MORPH_DURATION)
      const eased = easeInOutCubic(t)

      rotationRef.current.yaw = startYaw + (targetYaw - startYaw) * eased
      rotationRef.current.pitch = startPitch + (targetPitch - startPitch) * eased
      zoomRef.current = startZoom + (targetZoom - startZoom) * eased
      blendRef.current = eased

      if (t < 1) {
        morphRafRef.current = requestAnimationFrame(animateMorph)
      } else {
        // Terminó el vuelo: ya estamos en vista normal, sobre el mismo canvas.
        // A partir de aquí, arrastrar y hacer scroll siguen funcionando igual.
        morphingRef.current = false
        setMorphing(false)
      }
    }

    morphRafRef.current = requestAnimationFrame(animateMorph)
  }

  // ---- "INICIO": el único botón del menú que hace algo. Si ya entraste al
  // recorrido, te regresa (con la animación inversa, sobre el mismo canvas)
  // al planeta pequeño girando, exactamente como estaba al abrir. ----
  const handleGoHome = () => {
    if (morphingRef.current) return
    if (blendRef.current === 0) return // ya estamos en el inicio, no hay nada que hacer

    setShowEnterButton(false)
    setMorphing(true)
    morphingRef.current = true

    const startYaw = rotationRef.current.yaw
    const startPitch = rotationRef.current.pitch
    const startZoom = zoomRef.current
    const startBlend = blendRef.current
    const targetPitch = INITIAL_PITCH
    const targetZoom = getInitialZoom()
    const startTime = performance.now()

    const animateHome = (now: number) => {
      const t = Math.min(1, (now - startTime) / MORPH_DURATION)
      const eased = easeInOutCubic(t)

      rotationRef.current.pitch = startPitch + (targetPitch - startPitch) * eased
      zoomRef.current = startZoom + (targetZoom - startZoom) * eased
      blendRef.current = startBlend + (0 - startBlend) * eased
      // El yaw no cambia: el planeta reaparece mirando hacia donde ya estabas.
      rotationRef.current.yaw = startYaw

      if (t < 1) {
        morphRafRef.current = requestAnimationFrame(animateHome)
      } else {
        morphingRef.current = false
        setMorphing(false)
        setShowEnterButton(true)
      }
    }

    morphRafRef.current = requestAnimationFrame(animateHome)
  }

  return (
    <div className="v360-root">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
        className={`v360-canvas ${morphing ? 'v360-canvas--default' : 'v360-canvas--grab'}`}
        style={{ opacity: loading ? 0 : 1 }}
      />

      {/* Velo oscuro muy sutil sobre toda la escena */}
      <div className="v360-scrim" />

      {/* Animación de carga */}
      {loading ? (
        <div className="v360-loading">
          <div className="v360-loading__card v360-glass">
            <div className="v360-loading__spinner" />
            <span className="v360-loading__text">Cargando vista 360°...</span>
          </div>
        </div>
      ) : null}

      {/* Barra superior */}
      {!loading ? <Navbar onGoHome={handleGoHome} /> : null}

      {/* Cuadradito de coordenadas — herramienta temporal, se quita después */}
      {!loading ? (
        <div className="v360-coords v360-glass">
          <div className="v360-coords__value">{yawDisplayDeg.toFixed(1)}°</div>
        </div>
      ) : null}

      {/* Botón "INGRESAR" */}
      {showEnterButton && !morphing ? (
        <button onClick={handleEnter} className="v360-cta v360-glass">
          <span>INGRESAR</span>
          <span className="v360-cta__arrow">→</span>
        </button>
      ) : null}
    </div>
  )
}