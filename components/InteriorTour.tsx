'use client'

import { useEffect, useRef, useState } from 'react'
import type * as PanolensNS from 'panolens'

interface InteriorTourProps {
  onExit: () => void
}

type SceneId =
  | 'terminal'
  | 'metroarena'
  | 'puerta1'
  | 'puertaprincipal'
  | 'puerta3'
  | 'helipuerto'
  | 'ascensor'
  | 'piso2'
  | 'piso3'
  | 'patiocomidas2'

type Vec3 = [number, number, number]
type HotspotPos = PanolensNS.Infospot['position']

interface ArrowHotspot {
  to: SceneId
  position: Vec3
  size?: number
  label: string
}

interface InfoHotspot {
  position: Vec3
  size?: number
  label: string
  lines: string[]
  link?: { url: string; text: string }
}

interface SceneDef {
  id: SceneId
  src: string
  label: string
  backTo: SceneId | null
  arrows: ArrowHotspot[]
  infos: InfoHotspot[]
  maxTextureDim?: number
}

type PanoEvents = {
  addEventListener: (type: string, cb: (e?: unknown) => void) => void
  removeEventListener: (type: string, cb: (e?: unknown) => void) => void
}

/* =========================================================
   ESCENAS
   ========================================================= */

const SCENES: Record<SceneId, SceneDef> = {
  terminal: {
    id: 'terminal',
    // IMPORTANTE: en producción (Linux) importan las mayúsculas.
    // Esta es la extensión que funcionaba: .jpg en minúscula.
    src: '/DJI_085511.jpg',
    label: 'Terminal Metropolitana',
    backTo: null,
    maxTextureDim: 4096,
    arrows: [
      { to: 'metroarena', position: [3534.34, -344.61, 3507.92], size: 220, label: 'METRO ARENA' },
      { to: 'puerta1', position: [3469.79, -937.11, 3461.12], size: 220, label: 'INGRESO 2' },
      { to: 'puertaprincipal', position: [4683.2, -1693.66, 329.35], size: 220, label: 'INGRESO PRINCIPAL' },
      { to: 'puerta3', position: [2791.8, -1400.19, -3897.7], size: 220, label: 'INGRESO 3' },
      { to: 'helipuerto', position: [2568.12, -488.73, -4253.94], size: 220, label: 'HELIPUERTO' },
    ],
    infos: [],
  },

  metroarena: {
    id: 'metroarena',
    src: '/METROARENA1.JPG',
    label: 'Metro Arena',
    backTo: 'terminal',
    arrows: [],
    infos: [
      {
        position: [4744.73, -1362.31, 728.25],
        size: 500,
        label: 'Metro Arena',
        lines: [
          'Capacidad: Puede recibir a más de 6.000 personas de manera cómoda y organizada.',
          'Ubicación: Está situado en el interior de la Terminal Metropolitana El Alto, la estación terrestre más grande de Bolivia.',
          'Uso habitual: Se utiliza para acoger eventos culturales, presentaciones de grupos musicales en vivo y retransmisiones deportivas de gran interés público.',
        ],
      },
    ],
  },

  puerta1: {
    id: 'puerta1',
    src: '/PUERTA_1.jpg',
    label: 'Ingreso 2',
    backTo: 'terminal',
    arrows: [],
    infos: [],
  },

  puertaprincipal: {
    id: 'puertaprincipal',
    src: '/PUERTA_PRINCIPAL.jpg',
    label: 'Ingreso Principal',
    backTo: 'terminal',
    arrows: [
      { to: 'patiocomidas2', position: [4336.71, 2372.56, 691.85], size: 220, label: 'PATIO DE COMIDAS' },
    ],
    infos: [
      {
        position: [3872.03, 278.91, -3135.24],
        size: 400,
        label: 'ATT',
        lines: [
          'ATT: Autoridad de Regulación y Fiscalización de Telecomunicaciones y Transportes.',
          'Función: Entidad del Estado boliviano encargada de regular, controlar y supervisar los servicios de telecomunicaciones, transportes y correos.',
        ],
        link: { url: 'https://www.att.gob.bo/', text: 'Visitar página web de la ATT' },
      },
    ],
  },

  puerta3: {
    id: 'puerta3',
    src: '/PUERTA_3.jpg',
    label: 'Ingreso 3',
    backTo: 'terminal',
    arrows: [
      { to: 'ascensor', position: [2232.09, -162.75, -4459.47], size: 220, label: 'ENTRAR A ASCENSOR' },
    ],
    infos: [],
  },

  helipuerto: {
    id: 'helipuerto',
    src: '/HELIPUERTO.jpg',
    label: 'Helipuerto',
    backTo: 'terminal',
    arrows: [],
    infos: [],
  },

  ascensor: {
    id: 'ascensor',
    src: '/ASCENSOR.jpg',
    label: 'Ascensor',
    backTo: 'puerta3',
    arrows: [
      { to: 'piso3', position: [-3887.04, -1329.8, 2842.11], size: 220, label: 'PISO 3' },
      { to: 'piso2', position: [-3785.22, -1721.29, 2773.27], size: 220, label: 'PISO 2' },
      { to: 'puerta3', position: [-3598.28, -2220.54, 2662.06], size: 220, label: 'PLANTA BAJA' },
    ],
    infos: [],
  },

  piso2: {
    id: 'piso2',
    src: '/PISO_2.jpg',
    label: 'Piso 2',
    backTo: 'ascensor',
    arrows: [],
    infos: [],
  },

  piso3: {
    id: 'piso3',
    src: '/PISO_3.jpg',
    label: 'Piso 3',
    backTo: 'ascensor',
    arrows: [],
    infos: [],
  },

  patiocomidas2: {
    id: 'patiocomidas2',
    src: '/PATIO_DE_COMIDAS_2.jpg',
    label: 'Patio de Comidas',
    backTo: 'puertaprincipal',
    arrows: [],
    infos: [],
  },
}

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const START_SCENE: SceneId = 'terminal'

const REVEAL_FOV_START = 18
const REVEAL_FOV_END = 65
const REVEAL_DURATION = 1100

const MIN_OVERLAY_TIME = 1400
const EXIT_DURATION = 500

// Tamaño máximo (lado mayor) de textura para cualquier escena
// que no defina el suyo. Si al girar todavía se siente pesado,
// bajá TERMINAL_MAX_DIM (en SCENES.terminal.maxTextureDim) a 3072 o 2560.
const MAX_TEXTURE_DIM = 4096

// Tiempo máximo esperando que la textura termine de cargar en el visor.
const LOAD_TIMEOUT = 25000

// Tiempo máximo de descarga de cada archivo.
const FETCH_TIMEOUT = 45000

// Calentamiento de GPU: se renderizan frames MIENTRAS el loader
// sigue visible, para que al girar no haya tirones.
const WARMUP_FRAMES = 40
const WARMUP_MAX_MS = 4000

const MAX_PIXEL_RATIO = 1

const WALK_TURN_MS = 700
const WALK_ZOOM_MS = 950
const WALK_ZOOM_FACTOR = 0.42

const BACK_ZOOM_MS = 450
const BACK_ZOOM_FACTOR = 0.8

const ARRIVE_MS = 1000
const ARRIVE_START_FACTOR = 0.72

const SPINNER_DELAY = 400

const TEXTO_OPTIMIZANDO = 'Optimizando imagen 360°...'

/* =========================================================
   ANIMACIONES
   ========================================================= */

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

const easeInCubic = (x: number) => x * x * x

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)

/* =========================================================
   ESPERAR FRAMES (con tope de tiempo)
   ========================================================= */

function esperarFrames(n: number, maxMs: number = WARMUP_MAX_MS): Promise<void> {
  return new Promise((resolve) => {
    let restantes = n
    let terminado = false

    const terminar = () => {
      if (terminado) return
      terminado = true
      clearTimeout(timer)
      resolve()
    }

    const timer = setTimeout(terminar, maxMs)

    const paso = () => {
      if (terminado) return
      restantes -= 1
      if (restantes <= 0) {
        terminar()
      } else {
        requestAnimationFrame(paso)
      }
    }

    requestAnimationFrame(paso)
  })
}

/* =========================================================
   ESPERAR QUE UN PANORAMA CARGUE
   true = cargó, false = error o tiempo agotado
   ========================================================= */

function esperarCargaPanorama(
  pano: PanolensNS.ImagePanorama,
  timeoutMs: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const target = pano as unknown as PanoEvents & { loaded?: boolean }

    if (target.loaded) {
      resolve(true)
      return
    }

    let terminado = false

    const limpiar = () => {
      terminado = true
      clearTimeout(timer)
      clearInterval(poll)
      target.removeEventListener('load', onLoad)
      target.removeEventListener('error', onError)
    }

    const onLoad = () => {
      if (terminado) return
      limpiar()
      resolve(true)
    }

    const onError = () => {
      if (terminado) return
      limpiar()
      resolve(false)
    }

    const timer = setTimeout(() => {
      if (terminado) return
      limpiar()
      resolve(!!target.loaded)
    }, timeoutMs)

    const poll = setInterval(() => {
      if (terminado) return
      if (target.loaded) {
        limpiar()
        resolve(true)
      }
    }, 200)

    target.addEventListener('load', onLoad)
    target.addEventListener('error', onError)
  })
}

/* =========================================================
   LÍMITE DE TEXTURA DEL DISPOSITIVO
   ========================================================= */

function limiteTexturaDispositivo(): number {
  try {
    const canvas = document.createElement('canvas')

    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null

    const maxGpu = gl ? (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) : 4096

    const ua = navigator.userAgent

    const esIOS =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    const limiteSistema = esIOS ? 4096 : 8192

    return Math.max(2048, Math.min(maxGpu, limiteSistema))
  } catch {
    return 4096
  }
}

/* =========================================================
   CANDIDATOS DE URL
   Linux distingue mayúsculas/minúsculas. Si el archivo no
   existe con el nombre exacto, probamos con la otra variante
   de la extensión (.jpg <-> .JPG).
   ========================================================= */

function candidatosUrl(src: string): string[] {
  const lista = [src]

  const match = src.match(/^(.*)\.(jpe?g)$/i)

  if (match) {
    const base = match[1]
    const ext = match[2]

    const variantes = [
      `${base}.jpg`,
      `${base}.JPG`,
      `${base}.jpeg`,
      `${base}.JPEG`,
    ]

    variantes.forEach((v) => {
      if (v !== src && v.toLowerCase() !== ext && !lista.includes(v)) {
        lista.push(v)
      }
    })

    // Aseguramos las dos variantes principales
    ;[`${base}.jpg`, `${base}.JPG`].forEach((v) => {
      if (!lista.includes(v)) lista.push(v)
    })
  }

  return lista
}

/* =========================================================
   DESCARGA CON PROGRESO, TIMEOUT Y VARIANTES DE NOMBRE
   ========================================================= */

async function descargarUno(
  url: string,
  onProgress?: (pct: number | null) => void
): Promise<Blob | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      console.warn('[InteriorTour] no se pudo descargar:', url, response.status)
      return null
    }

    const total = Number(response.headers.get('content-length')) || 0

    if (!response.body || !total) {
      onProgress?.(null)
      return await response.blob()
    }

    const reader = response.body.getReader()
    const partes: BlobPart[] = []
    let recibido = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        partes.push(value)
        recibido += value.length
        onProgress?.(Math.min(100, Math.round((recibido / total) * 100)))
      }
    }

    return new Blob(partes, {
      type: response.headers.get('content-type') || 'image/jpeg',
    })
  } catch (error) {
    console.warn('[InteriorTour] error descargando:', url, error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function descargarBlob(
  src: string,
  onProgress?: (pct: number | null) => void
): Promise<Blob | null> {
  for (const url of candidatosUrl(src)) {
    const blob = await descargarUno(url, onProgress)
    if (blob && blob.size > 0) {
      if (url !== src) {
        console.warn(
          `[InteriorTour] "${src}" no existe en el servidor, se usó "${url}". Renombrá el archivo para evitar esta búsqueda extra.`
        )
      }
      return blob
    }
  }

  return null
}

/* =========================================================
   PREPARAR IMAGEN
   - descarga (con variantes de nombre)
   - decodifica
   - reduce con canvas si supera el tamaño máximo
   Devuelve null si el archivo no existe.
   ========================================================= */

async function prepararImagen(
  src: string,
  maxDim: number,
  onProgress?: (pct: number | null) => void
): Promise<string | null> {
  const blob = await descargarBlob(src, onProgress)

  if (!blob) {
    return null
  }

  const objectUrl = URL.createObjectURL(blob)

  try {
    const img = new Image()

    img.src = objectUrl

    try {
      await img.decode()
    } catch {
      await new Promise<void>((resolve) => {
        if (img.complete) {
          resolve()
        } else {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }
      })
    }

    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height

    const limite = Math.min(maxDim, limiteTexturaDispositivo())

    const ladoMayor = Math.max(width, height)

    // Si ya entra dentro del límite, usamos el archivo tal cual.
    if (!ladoMayor || ladoMayor <= limite) {
      return objectUrl
    }

    const escala = limite / ladoMayor

    const canvas = document.createElement('canvas')

    canvas.width = Math.max(1, Math.floor(width * escala))
    canvas.height = Math.max(1, Math.floor(height * escala))

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return objectUrl
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const reducida = await new Promise<string | null>((resolve) => {
      canvas.toBlob(
        (nuevoBlob) => {
          resolve(nuevoBlob ? URL.createObjectURL(nuevoBlob) : null)
        },
        'image/jpeg',
        0.92
      )
    })

    if (reducida) {
      URL.revokeObjectURL(objectUrl)
      return reducida
    }

    return objectUrl
  } catch {
    return objectUrl
  }
}

/* =========================================================
   FUENTE DE CADA ESCENA
   nivel 0 = tamaño normal de la escena
   nivel 1 = reducida a 2048 (plan B si la GPU no aguanta)
   ========================================================= */

function fuenteParaEscena(
  definition: SceneDef,
  nivel: number = 0,
  onProgress?: (pct: number | null) => void
): Promise<string | null> {
  const dim = nivel >= 1 ? 2048 : definition.maxTextureDim ?? MAX_TEXTURE_DIM

  return prepararImagen(definition.src, dim, onProgress)
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function InteriorTour({ onExit }: InteriorTourProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<PanolensNS.Viewer | null>(null)
  const panolensRef = useRef<typeof PanolensNS | null>(null)

  const panoramaCacheRef = useRef<Map<SceneId, PanolensNS.ImagePanorama>>(
    new Map()
  )

  const pendingPanoRef = useRef<
    Map<SceneId, Promise<PanolensNS.ImagePanorama | null>>
  >(new Map())

  const revealRafRef = useRef<number | null>(null)
  const walkRafRef = useRef<number | null>(null)
  const veilRef = useRef<HTMLDivElement | null>(null)
  const sceneIdRef = useRef<SceneId>(START_SCENE)
  const switchingRef = useRef(false)

  const [sceneId, setSceneId] = useState<SceneId>(START_SCENE)
  const [ready, setReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const [overlayText, setOverlayText] = useState(TEXTO_OPTIMIZANDO)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [overlayMounted, setOverlayMounted] = useState(true)

  const [infoPanel, setInfoPanel] = useState<{
    label: string
    lines: string[]
    link?: { url: string; text: string }
  } | null>(null)

  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorFatal, setErrorFatal] = useState(false)

  useEffect(() => {
    sceneIdRef.current = sceneId
  }, [sceneId])

  useEffect(() => {
    switchingRef.current = switching
  }, [switching])

  /* =======================================================
     OVERLAY
     ======================================================= */

  useEffect(() => {
    if (overlayVisible) {
      setOverlayMounted(true)
      return
    }

    const timeout = setTimeout(() => {
      setOverlayMounted(false)
    }, 500)

    return () => {
      clearTimeout(timeout)
    }
  }, [overlayVisible])

  /* =======================================================
     CREAR PANORAMA
     ======================================================= */

  const buildScenePanorama = (
    PANOLENS: typeof PanolensNS,
    id: SceneId,
    srcSeguro: string
  ): PanolensNS.ImagePanorama => {
    const scene = SCENES[id]

    const panorama = new PANOLENS.ImagePanorama(srcSeguro)

    panorama.addEventListener(
      'click',
      (event: {
        intersects?: Array<{ point: { x: number; y: number; z: number } }>
      }) => {
        const point = event.intersects?.[0]?.point

        if (!point) return

        console.log(
          `[${id}] click:`,
          point.x.toFixed(2),
          point.y.toFixed(2),
          point.z.toFixed(2)
        )
      }
    )

    scene.arrows.forEach(({ to, position, size = 220, label }) => {
      const arrow = new PANOLENS.Infospot(size, PANOLENS.DataImage.Arrow)

      arrow.position.set(position[0], position[1], position[2])

      arrow.addHoverText(label, 24)

      arrow.addEventListener('click', () => {
        goToScene(to, arrow.position)
      })

      panorama.add(arrow)
    })

    scene.infos.forEach(({ position, size = 220, label, lines, link }) => {
      const info = new PANOLENS.Infospot(size, PANOLENS.DataImage.Info)

      info.position.set(position[0], position[1], position[2])

      info.addHoverText(label, 24)

      info.addEventListener('click', () => {
        setInfoPanel({ label, lines, link })
      })

      panorama.add(info)
    })

    return panorama
  }

  /* =======================================================
     INICIALIZAR PANOLENS
     ======================================================= */

  useEffect(() => {
    let cancelled = false

    const mountedAt = performance.now()

    const iniciar = async () => {
      try {
        setErrorCarga(null)
        setErrorFatal(false)
        setReady(false)
        setRevealed(false)
        setOverlayText(TEXTO_OPTIMIZANDO)
        setOverlayVisible(true)

        const PANOLENS = await import('panolens')

        if (cancelled || !containerRef.current) {
          return
        }

        panolensRef.current = PANOLENS

        const viewer = new PANOLENS.Viewer({
          container: containerRef.current,
          controlBar: true,
          controlButtons: ['fullscreen', 'setting'],
          autoRotate: false,
          cameraFov: REVEAL_FOV_START,
          output: 'none',
        })

        viewerRef.current = viewer

        /* RENDIMIENTO */

        try {
          const internal = viewer as unknown as {
            renderer?: { setPixelRatio: (ratio: number) => void }
            onWindowResize?: () => void
          }

          internal.renderer?.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
          )

          internal.onWindowResize?.()
        } catch {
          // continuar
        }

        /* CARGAR TERMINAL
           nivel 0: tamaño normal de la escena
           nivel 1: reducida a 2048 (plan B) */

        const startDefinition = SCENES[START_SCENE]

        let primera: PanolensNS.ImagePanorama | null = null

        for (let nivel = 0; nivel <= 1; nivel++) {
          if (cancelled) return

          setOverlayText(
            nivel === 0
              ? TEXTO_OPTIMIZANDO
              : 'Ajustando imagen para tu dispositivo...'
          )

          const srcSeguro = await fuenteParaEscena(
            startDefinition,
            nivel,
            (pct) => {
              if (cancelled) return
              setOverlayText(
                pct === null
                  ? 'Descargando imagen 360°...'
                  : `Descargando imagen 360°... ${pct}%`
              )
            }
          )

          if (cancelled) return

          // null = el archivo no existe en el servidor (ni con otra capitalización)
          if (!srcSeguro) {
            setOverlayVisible(false)
            setErrorFatal(true)
            setErrorCarga(
              `No se encontró la imagen ${startDefinition.src} en el servidor. Verificá que el archivo exista en /public con ese nombre exacto.`
            )
            return
          }

          setOverlayText(TEXTO_OPTIMIZANDO)

          const pano = buildScenePanorama(PANOLENS, START_SCENE, srcSeguro)

          viewer.add(pano)

          if (nivel > 0) {
            viewer.setPanorama(pano)
          }

          const ok = await esperarCargaPanorama(pano, LOAD_TIMEOUT)

          if (cancelled) return

          if (ok) {
            primera = pano
            break
          }

          console.warn(
            `[InteriorTour] la textura no cargó (nivel ${nivel}). Probando plan B...`
          )

          try {
            viewer.remove(pano)
          } catch {
            // ignorar
          }

          try {
            pano.dispose()
          } catch {
            // ignorar
          }
        }

        if (!primera) {
          setOverlayVisible(false)
          setErrorFatal(true)
          setErrorCarga(
            'No se pudo cargar el recorrido 360°. Revisá tu conexión e intentá de nuevo.'
          )
          return
        }

        panoramaCacheRef.current.set(START_SCENE, primera)

        // Calentamiento: renderiza frames con el loader todavía encima
        // para que la textura ya esté en la GPU cuando el usuario gire.
        setOverlayText(TEXTO_OPTIMIZANDO)

        await esperarFrames(WARMUP_FRAMES, WARMUP_MAX_MS)

        if (cancelled) return

        const elapsed = performance.now() - mountedAt

        const wait = Math.max(0, MIN_OVERLAY_TIME - elapsed)

        setTimeout(() => {
          if (!cancelled) {
            setReady(true)
          }
        }, wait)
      } catch (error) {
        console.error('[InteriorTour]', error)

        setOverlayVisible(false)
        setErrorFatal(true)
        setErrorCarga('No se pudo cargar el recorrido 360°.')
      }
    }

    iniciar()

    return () => {
      cancelled = true

      if (revealRafRef.current !== null) {
        cancelAnimationFrame(revealRafRef.current)
      }

      if (walkRafRef.current !== null) {
        cancelAnimationFrame(walkRafRef.current)
      }

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy()
        } catch {
          // ignorar
        }

        viewerRef.current = null
      }

      panoramaCacheRef.current.clear()
      pendingPanoRef.current.clear()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey])

  /* =======================================================
     REVELAR TERMINAL
     ======================================================= */

  useEffect(() => {
    if (!ready) {
      return
    }

    const viewer = viewerRef.current

    if (!viewer) {
      return
    }

    const startTime = performance.now()

    const animateReveal = (now: number) => {
      const progress = Math.min(1, (now - startTime) / REVEAL_DURATION)

      const eased = easeInOutCubic(progress)

      viewer.camera.fov =
        REVEAL_FOV_START + (REVEAL_FOV_END - REVEAL_FOV_START) * eased

      viewer.camera.updateProjectionMatrix()

      if (progress < 1) {
        revealRafRef.current = requestAnimationFrame(animateReveal)
        return
      }

      revealRafRef.current = null

      setRevealed(true)
      setOverlayVisible(false)
    }

    revealRafRef.current = requestAnimationFrame(animateReveal)

    return () => {
      if (revealRafRef.current !== null) {
        cancelAnimationFrame(revealRafRef.current)
      }
    }
  }, [ready])

  /* =======================================================
     OBTENER / CREAR OTRAS ESCENAS
     ======================================================= */

  const getOrCreatePanorama = async (
    id: SceneId
  ): Promise<PanolensNS.ImagePanorama | null> => {
    const PANOLENS = panolensRef.current

    const viewer = viewerRef.current

    if (!PANOLENS || !viewer) {
      return null
    }

    const cache = panoramaCacheRef.current

    const existente = cache.get(id)

    if (existente) {
      return existente
    }

    const enCurso = pendingPanoRef.current.get(id)

    if (enCurso) {
      return enCurso
    }

    const promesa = (async () => {
      const definition = SCENES[id]

      const srcSeguro = await fuenteParaEscena(definition)

      if (!srcSeguro || !viewerRef.current) {
        return null
      }

      const panorama = buildScenePanorama(PANOLENS, id, srcSeguro)

      cache.set(id, panorama)

      viewerRef.current.add(panorama)

      return panorama
    })()

    pendingPanoRef.current.set(id, promesa)

    promesa.finally(() => {
      pendingPanoRef.current.delete(id)
    })

    return promesa
  }

  /* =======================================================
     ANIMACIÓN GENÉRICA
     ======================================================= */

  const runAnimation = (
    duration: number,
    onFrame: (progress: number) => void
  ): Promise<void> =>
    new Promise((resolve) => {
      const start = performance.now()

      const step = (now: number) => {
        if (!viewerRef.current) {
          resolve()
          return
        }

        const progress = Math.min(1, (now - start) / duration)

        onFrame(progress)

        if (progress < 1) {
          walkRafRef.current = requestAnimationFrame(step)
        } else {
          walkRafRef.current = null
          resolve()
        }
      }

      walkRafRef.current = requestAnimationFrame(step)
    })

  /* =======================================================
     VELO
     ======================================================= */

  const setVeil = (opacity: number) => {
    const element = veilRef.current

    if (!element) {
      return
    }

    element.style.opacity = String(opacity)

    element.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible'
  }

  const restoreView = (viewer: PanolensNS.Viewer, fov: number) => {
    viewer.camera.fov = fov

    viewer.camera.updateProjectionMatrix()

    setVeil(0)
  }

  /* =======================================================
     CAMBIAR ESCENA
     ======================================================= */

  const goToScene = async (targetId: SceneId, fromPosition?: HotspotPos) => {
    const viewer = viewerRef.current

    if (!viewer || switchingRef.current || targetId === sceneIdRef.current) {
      return
    }

    switchingRef.current = true

    setInfoPanel(null)

    setErrorCarga(null)

    setOverlayText(`Entrando a ${SCENES[targetId].label}...`)

    setSwitching(true)

    const baseFov = viewer.camera.fov

    const targetPromise = getOrCreatePanorama(targetId)

    /* GIRAR HACIA FLECHA */

    if (fromPosition) {
      const internal = viewer as unknown as {
        tweenControlCenter?: (vector: unknown, duration?: number) => void
      }

      try {
        internal.tweenControlCenter?.(fromPosition, WALK_TURN_MS)
      } catch {
        // continuar
      }
    }

    const zoomFactor = fromPosition ? WALK_ZOOM_FACTOR : BACK_ZOOM_FACTOR

    const zoomDuration = fromPosition ? WALK_ZOOM_MS : BACK_ZOOM_MS

    const finalFov = baseFov * zoomFactor

    await runAnimation(zoomDuration, (progress) => {
      viewer.camera.fov =
        baseFov + (finalFov - baseFov) * easeInCubic(progress)

      viewer.camera.updateProjectionMatrix()

      setVeil(progress < 0.55 ? 0 : easeInOutCubic((progress - 0.55) / 0.45))
    })

    if (!viewerRef.current) {
      return
    }

    /* LOADER SI TARDA */

    const spinnerTimer = setTimeout(() => {
      setOverlayVisible(true)
    }, SPINNER_DELAY)

    const hideSpinner = () => {
      clearTimeout(spinnerTimer)
      setOverlayVisible(false)
    }

    const fallar = (mensaje: string) => {
      hideSpinner()

      restoreView(viewer, baseFov)

      switchingRef.current = false

      setSwitching(false)

      setErrorCarga(mensaje)

      setTimeout(() => {
        setErrorCarga((actual) => (actual === mensaje ? null : actual))
      }, 4000)
    }

    const target = await targetPromise

    if (!target) {
      fallar('No se pudo cargar esta escena. Volvé a intentar.')
      return
    }

    /* LLEGADA */

    viewer.setPanorama(target)

    const cargada = await esperarCargaPanorama(target, LOAD_TIMEOUT)

    if (!viewerRef.current) {
      return
    }

    if (!cargada) {
      panoramaCacheRef.current.delete(targetId)

      fallar('La imagen está tardando demasiado en cargar. Volvé a intentar.')
      return
    }

    // Calentamiento de la nueva textura con la pantalla todavía oscura
    setOverlayText(TEXTO_OPTIMIZANDO)

    await esperarFrames(20, 1500)

    hideSpinner()

    const startFov = baseFov * ARRIVE_START_FACTOR

    viewer.camera.fov = startFov

    viewer.camera.updateProjectionMatrix()

    await runAnimation(ARRIVE_MS, (progress) => {
      const eased = easeOutCubic(progress)

      viewer.camera.fov = startFov + (baseFov - startFov) * eased

      viewer.camera.updateProjectionMatrix()

      setVeil(1 - eased)
    })

    sceneIdRef.current = targetId

    setSceneId(targetId)

    setVeil(0)

    switchingRef.current = false

    setSwitching(false)
  }

  /* =======================================================
     SALIR
     ======================================================= */

  const handleExit = () => {
    if (exiting) {
      return
    }

    setExiting(true)

    setTimeout(onExit, EXIT_DURATION)
  }

  /* =======================================================
     VOLVER
     ======================================================= */

  const handleBack = () => {
    if (exiting || switchingRef.current) {
      return
    }

    const current = SCENES[sceneIdRef.current]

    if (current.backTo) {
      goToScene(current.backTo)
      return
    }

    handleExit()
  }

  /* =======================================================
     REINTENTAR
     ======================================================= */

  const handleRetry = () => {
    setErrorCarga(null)
    setErrorFatal(false)
    setOverlayVisible(true)
    setRetryKey((k) => k + 1)
  }

  const infoLink = infoPanel?.link ?? null

  /* =======================================================
     JSX
     ======================================================= */

  return (
    <div className={`tvisit-stage ${exiting ? 'tvisit-stage--exiting' : ''}`}>
      {/* El visor no recibe toques hasta que todo terminó de cargar */}
      <div
        ref={containerRef}
        className="tvisit-viewer"
        style={{ pointerEvents: revealed ? 'auto' : 'none' }}
      />

      <div
        ref={veilRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0,
          visibility: 'hidden',
          zIndex: 3,
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(6,10,18,0.96) 80%)',
        }}
      />

      {infoPanel ? (
        <>
          <div
            className="tvisit-info-backdrop"
            onClick={() => setInfoPanel(null)}
          />

          <div className="tvisit-info-panel v360-glass">
            <button
              type="button"
              className="tvisit-info-panel__close"
              onClick={() => setInfoPanel(null)}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="tvisit-info-panel__eyebrow">Punto de interés</div>

            <h3 className="tvisit-info-panel__title">{infoPanel.label}</h3>

            {infoPanel.lines.map((line, index) => (
              <p key={index} className="tvisit-info-panel__text">
                {line}
              </p>
            ))}

            {infoLink ? (
              <button
                type="button"
                onClick={() =>
                  window.open(infoLink.url, '_blank', 'noopener,noreferrer')
                }
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#0b57d0',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {infoLink.text}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {overlayMounted && !errorFatal ? (
        <div
          className={`tvisit-overlay ${
            overlayVisible ? '' : 'tvisit-overlay--hidden'
          }`}
        >
          <div className="tvisit-overlay__card v360-glass">
            <div className="tvisit-overlay__spinner" />

            <span className="tvisit-overlay__text">{overlayText}</span>
          </div>
        </div>
      ) : null}

      {errorCarga ? (
        <div className="tvisit-overlay">
          <div className="tvisit-overlay__card v360-glass">
            <span className="tvisit-overlay__text">{errorCarga}</span>

            {errorFatal ? (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 14,
                  justifyContent: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={handleRetry}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#0b57d0',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reintentar
                </button>

                <button
                  type="button"
                  onClick={handleExit}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Salir
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {revealed ? (
        <button
          type="button"
          onClick={handleBack}
          disabled={switching}
          className="tvisit-back v360-neu"
        >
          <span className="tvisit-back__arrow">←</span>

          <span>Volver</span>
        </button>
      ) : null}
    </div>
  )
}