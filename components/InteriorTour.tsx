// components/InteriorTour.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import type * as PanolensNS from 'panolens'
interface InteriorTourProps {
  /** Se llama cuando el usuario toca "Volver" desde la escena raíz (después del fundido de salida). */
  onExit: () => void
}
// ---------------------------------------------------------------------------
// El recorrido: escenas + hotspots — hotspots NATIVOS de panolens
// (PANOLENS.Infospot con los íconos de fábrica DataImage.Arrow /
// DataImage.Info), posicionados con coordenadas X, Y, Z reales del mundo
// 3D. Nada de proyección propia ni HTML flotante: es el mismo mecanismo que
// ya usa panolens puertas adentro.
//
// Para encontrar la posición de un hotspot nuevo: entrá al recorrido, abrí
// la consola del navegador, hacé clic en el punto exacto de la esfera donde
// querés el hotspot, y vas a ver el X/Y/Z impreso ahí (con el prefijo
// "[terminal] click:" o "[metroarena] click:") — pegame esos tres números y
// agrego el hotspot.
// ---------------------------------------------------------------------------

// Escenas del recorrido (cada id es el nombre interno de la escena).
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
// Tipo de la posición 3D de un hotspot (se usa para "caminar hacia" él).
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
  /** Cada string es un párrafo/línea propia dentro de la tarjeta. */
  lines: string[]
  /** Link opcional que se muestra como botón al final de la tarjeta. */
  link?: { url: string; text: string }
}
interface SceneDef {
  id: SceneId
  src: string
  label: string
  backTo: SceneId | null
  arrows: ArrowHotspot[]
  infos: InfoHotspot[]
}
const SCENES: Record<SceneId, SceneDef> = {
  terminal: {
    id: 'terminal',
    src: '/DJI_085511.jpg',
    label: 'Terminal Metropolitana',
    backTo: null,
    // -----------------------------------------------------------------------
    // HOTSPOTS DE LA ESCENA "terminal" (foto de dron DJI_085511).
    // Las coordenadas [X, Y, Z] son las del punto de la esfera 360 donde
    // aparece la flecha. Cada flecha manda a la escena indicada en "to".
    // -----------------------------------------------------------------------
    arrows: [
      // Flecha hacia Metro Arena
      { to: 'metroarena', position: [3534.34, -344.61, 3507.92], size: 220, label: 'METRO ARENA' },
      // Flecha "INGRESO 2" -> lleva a /PUERTA_1.jpg
      { to: 'puerta1', position: [3469.79, -937.11, 3461.12], size: 220, label: 'INGRESO 2' },
      // Flecha "INGRESO PRINCIPAL" -> lleva a /PUERTA_PRINCIPAL.jpg
      { to: 'puertaprincipal', position: [4683.2, -1693.66, 329.35], size: 220, label: 'INGRESO PRINCIPAL' },
      // Flecha "INGRESO 3" -> lleva a /PUERTA_3.jpg
      { to: 'puerta3', position: [2791.8, -1400.19, -3897.7], size: 220, label: 'INGRESO 3' },
      // Flecha "HELIPUERTO" -> lleva a /HELIPUERTO.jpg
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
  // Escena INGRESO 2. El botón "Volver" regresa a la terminal.
  puerta1: {
    id: 'puerta1',
    src: '/PUERTA_1.jpg',
    label: 'Ingreso 2',
    backTo: 'terminal',
    arrows: [],
    infos: [],
  },
  // Escena INGRESO PRINCIPAL. El botón "Volver" regresa a la terminal.
  puertaprincipal: {
    id: 'puertaprincipal',
    src: '/PUERTA_PRINCIPAL.jpg',
    label: 'Ingreso Principal',
    backTo: 'terminal',
    // Flecha hacia el patio de comidas (PATIO_DE_COMIDAS_2.jpg)
    arrows: [
      { to: 'patiocomidas2', position: [4336.71, 2372.56, 691.85], size: 220, label: 'PATIO DE COMIDAS' },
    ],
    // Hotspot de información de la ATT (con link a su página web)
    infos: [
      {
        // ⚠️ POSICIÓN PROVISORIA: todavía no me pasaste las coordenadas de la ATT.
        // Hacé clic en la esfera donde lo querés, copiá X/Y/Z de la consola
        // ("[puertaprincipal] click:") y reemplazá estos tres números.
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
  // Escena INGRESO 3. El botón "Volver" regresa a la terminal.
  puerta3: {
    id: 'puerta3',
    src: '/PUERTA_3.jpg',
    label: 'Ingreso 3',
    backTo: 'terminal',
    // Flecha "ENTRAR A ASCENSOR" -> lleva a /ASCENSOR.jpg
    arrows: [
      { to: 'ascensor', position: [2232.09, -162.75, -4459.47], size: 220, label: 'ENTRAR A ASCENSOR' },
    ],
    infos: [],
  },
  // Escena HELIPUERTO. El botón "Volver" regresa a la terminal.
  helipuerto: {
    id: 'helipuerto',
    src: '/HELIPUERTO.jpg',
    label: 'Helipuerto',
    backTo: 'terminal',
    arrows: [],
    infos: [],
  },
  // Escena ASCENSOR (se entra desde PUERTA_3). "Volver" regresa a PUERTA_3.
  ascensor: {
    id: 'ascensor',
    src: '/ASCENSOR.jpg',
    label: 'Ascensor',
    backTo: 'puerta3',
    arrows: [
      // Flecha "PISO 3" -> lleva a /PISO_3.jpg
      { to: 'piso3', position: [-3887.04, -1329.8, 2842.11], size: 220, label: 'PISO 3' },
      // Flecha "PISO 2" -> lleva a /PISO_2.jpg
      // ⚠️ La Y que me pasaste era -17212.89 (parece un error de tipeo, todas las
      // demás están en el rango de ±5000). Usé -1721.29; si no coincide, cambiala.
      { to: 'piso2', position: [-3785.22, -1721.29, 2773.27], size: 220, label: 'PISO 2' },
      // Flecha "PLANTA BAJA" -> vuelve a /PUERTA_3.jpg
      { to: 'puerta3', position: [-3598.28, -2220.54, 2662.06], size: 220, label: 'PLANTA BAJA' },
    ],
    infos: [],
  },
  // Escena PISO 2 (se llega desde el ascensor). "Volver" regresa al ascensor.
  piso2: {
    id: 'piso2',
    src: '/PISO_2.jpg',
    label: 'Piso 2',
    backTo: 'ascensor',
    arrows: [],
    infos: [],
  },
  // Escena PISO 3 (se llega desde el ascensor). "Volver" regresa al ascensor.
  piso3: {
    id: 'piso3',
    src: '/PISO_3.jpg',
    label: 'Piso 3',
    backTo: 'ascensor',
    arrows: [],
    infos: [],
  },
  // Escena PATIO DE COMIDAS 2 (se llega desde INGRESO PRINCIPAL). "Volver" regresa allá.
  patiocomidas2: {
    id: 'patiocomidas2',
    src: '/PATIO_DE_COMIDAS_2.jpg',
    label: 'Patio de Comidas',
    backTo: 'puertaprincipal',
    arrows: [],
    infos: [],
  },
}
const START_SCENE: SceneId = 'terminal'
const REVEAL_FOV_START = 18
const REVEAL_FOV_END = 65
const REVEAL_DURATION = 1100
const MIN_OVERLAY_TIME = 700
const EXIT_DURATION = 500
// Límite de lado más largo para cualquier textura de panorama. 4096 es un
// tamaño que soportan prácticamente todos los navegadores y dispositivos
// (incluido Safari en iPhone), a diferencia de las fotos de dron originales
// que suelen venir en 8000px+ de ancho. Si en algún iPhone viejo sigue
// fallando, bajalo a 2048.
const MAX_TEXTURE_DIM = 4096
// Si una textura no termina de cargar en este tiempo, dejamos de esperar y
// avisamos en vez de quedarnos colgados para siempre.
const LOAD_TIMEOUT = 15000
// Intensidad del filtro de nitidez (0 = sin filtro, 0.3–0.5 = recomendado,
// más de 0.7 empieza a verse artificial y con "halos"). Si ves demasiado
// grano en alguna foto, bajalo a 0.25.
const SHARPEN_AMOUNT = 0.4

// ---------------------------------------------------------------------------
// Parámetros de la transición "caminar hacia adelante" (estilo Street View).
// Secuencia: 1) la cámara gira hacia la flecha, 2) se hace zoom hacia ella
// (sensación de avanzar) mientras se oscurece el borde de la pantalla,
// 3) se cambia la escena, 4) la nueva escena "se asienta" con un zoom suave.
// ---------------------------------------------------------------------------
const WALK_TURN_MS = 700 // giro de la cámara hacia el hotspot
const WALK_ZOOM_MS = 950 // duración del "avance" (zoom hacia el hotspot)
const WALK_ZOOM_FACTOR = 0.42 // FOV final = FOV actual × este valor (menor = avanza más)
const BACK_ZOOM_MS = 450 // transición corta para el botón "Volver" (sin hotspot)
const BACK_ZOOM_FACTOR = 0.8
const ARRIVE_MS = 1000 // duración de la llegada a la nueva escena
const ARRIVE_START_FACTOR = 0.72 // FOV inicial al llegar = FOV normal × este valor
const SPINNER_DELAY = 400 // el cartel "Entrando a…" solo aparece si la carga tarda más que esto
const PREFETCH_DELAY = 900 // espera antes de precargar las escenas vecinas

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeInCubic = (x: number) => x * x * x
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)

/**
 * Filtro de nitidez (sharpen) aplicado directamente sobre los píxeles
 * del canvas. Usa un kernel 3x3 clásico:
 *      0   -a    0
 *     -a  1+4a  -a
 *      0   -a    0
 * Realza los bordes y detalles finos, que es lo que da la sensación de
 * "alta definición" en fotos livianas (500 KB – 1 MB). Los bordes de la
 * imagen se dejan sin tocar para evitar errores de índice.
 */
function aplicarNitidez(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const imageData = ctx.getImageData(0, 0, w, h)
  const src = imageData.data
  const copia = new Uint8ClampedArray(src) // copia intacta para leer los vecinos
  const centro = 1 + 4 * amount
  const stride = w * 4
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * stride + x * 4
      // Solo canales R, G, B (el alfa no se toca)
      for (let c = 0; c < 3; c++) {
        const k = i + c
        const valor =
          copia[k] * centro -
          amount * (copia[k - 4] + copia[k + 4] + copia[k - stride] + copia[k + stride])
        src[k] = valor // Uint8ClampedArray limita solo a 0–255
      }
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

/**
 * Devuelve una URL lista para usar como textura: la original si ya entra
 * dentro de MAX_TEXTURE_DIM, o una versión reescalada (como blob URL) si no.
 * Es el mismo control que ya existe en Vista360.tsx, aplicado acá a cada
 * escena del recorrido interior — en Safari (iPhone y Mac) una textura
 * demasiado grande no solo se ve mal: puede hacer que la pestaña se
 * reinicie por presión de memoria, que es el síntoma de "se vuelve al
 * principio" al entrar a Metro Arena.
 *
 * TODAS las imágenes pasan por el canvas para poder aplicarles el filtro
 * de nitidez ("modo HD"):
 *  - Si la foto es más chica que MAX_TEXTURE_DIM, se agranda con suavizado de
 *    alta calidad hasta ese tamaño (nunca lo supera, así iPhone/Safari no
 *    se quedan sin memoria).
 *  - Si es más grande, se reduce igual que antes.
 *  - Luego se aplica el filtro de nitidez.
 *  - Si ALGO falla (canvas no disponible, falta de memoria, etc.) se usa la
 *    imagen original, así el recorrido nunca se rompe.
 */
function prepararFuenteSegura(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        // La escala puede ser mayor a 1 (agrandar) o menor a 1 (reducir)
        const escala = MAX_TEXTURE_DIM / Math.max(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.floor(img.width * escala))
        canvas.height = Math.max(1, Math.floor(img.height * escala))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(src)
          return
        }
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        // Filtro de nitidez ("calidad HD")
        aplicarNitidez(ctx, canvas.width, canvas.height, SHARPEN_AMOUNT)
        canvas.toBlob(
          (blob) => resolve(blob ? URL.createObjectURL(blob) : src),
          'image/jpeg',
          0.92
        )
      } catch {
        resolve(src) // ante cualquier error, usamos la original
      }
    }
    img.onerror = () => resolve(src) // si falla el análisis, probamos igual con la original
    img.src = src
  })
}
export default function InteriorTour({ onExit }: InteriorTourProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<PanolensNS.Viewer | null>(null)
  const panolensRef = useRef<typeof PanolensNS | null>(null)
  const panoramaCacheRef = useRef<Map<SceneId, PanolensNS.ImagePanorama>>(new Map())
  // Promesas de escenas que se están preparando (evita crear la misma escena dos veces
  // si el usuario toca una flecha mientras se está precargando)
  const pendingPanoRef = useRef<Map<SceneId, Promise<PanolensNS.ImagePanorama | null>>>(new Map())
  const revealRafRef = useRef<number | null>(null)
  // id del requestAnimationFrame de la transición "caminar"
  const walkRafRef = useRef<number | null>(null)
  // Capa que oscurece los bordes durante la transición
  const veilRef = useRef<HTMLDivElement | null>(null)
  const sceneIdRef = useRef<SceneId>(START_SCENE)
  const switchingRef = useRef(false)
  const [sceneId, setSceneId] = useState<SceneId>(START_SCENE)
  const [ready, setReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [overlayText, setOverlayText] = useState(`Entrando a ${SCENES[START_SCENE].label}…`)
  const [overlayVisible, setOverlayVisible] = useState(true)
  // La tarjeta de info puede llevar un link
  const [infoPanel, setInfoPanel] = useState<{
    label: string
    lines: string[]
    link?: { url: string; text: string }
  } | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  useEffect(() => { sceneIdRef.current = sceneId }, [sceneId])
  useEffect(() => { switchingRef.current = switching }, [switching])
  useEffect(() => {
    let cancelled = false
    const mountedAt = performance.now()
    import('panolens').then(async (PANOLENS) => {
      if (cancelled || !containerRef.current) return
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
      const srcSeguro = await prepararFuenteSegura(SCENES[START_SCENE].src)
      if (cancelled) return
      const first = buildScenePanorama(PANOLENS, START_SCENE, srcSeguro)
      panoramaCacheRef.current.set(START_SCENE, first)
      first.addEventListener('load', () => {
        if (cancelled) return
        const elapsed = performance.now() - mountedAt
        const wait = Math.max(0, MIN_OVERLAY_TIME - elapsed)
        setTimeout(() => { if (!cancelled) setReady(true) }, wait)
      })
      viewer.add(first)
    })
    return () => {
      cancelled = true
      if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current)
      // También cancelamos la animación de transición si el componente se desmonta
      if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current)
      if (viewerRef.current) { viewerRef.current.destroy(); viewerRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!ready) return
    const viewer = viewerRef.current
    const startTime = performance.now()
    const animateReveal = (now: number) => {
      const t = Math.min(1, (now - startTime) / REVEAL_DURATION)
      const eased = easeInOutCubic(t)
      if (viewer) {
        viewer.camera.fov = REVEAL_FOV_START + (REVEAL_FOV_END - REVEAL_FOV_START) * eased
        viewer.camera.updateProjectionMatrix()
      }
      if (t < 1) {
        revealRafRef.current = requestAnimationFrame(animateReveal)
      } else {
        setRevealed(true)
        setOverlayVisible(false)
        // Con la escena inicial ya visible, preparamos en segundo plano las escenas vecinas
        prefetchNeighbors(START_SCENE)
      }
    }
    revealRafRef.current = requestAnimationFrame(animateReveal)
    return () => { if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  const buildScenePanorama = (PANOLENS: typeof PanolensNS, id: SceneId, srcSeguro: string): PanolensNS.ImagePanorama => {
    const scene = SCENES[id]
    const pano = new PANOLENS.ImagePanorama(srcSeguro)
    pano.addEventListener('click', (event: { intersects?: Array<{ point: { x: number; y: number; z: number } }> }) => {
      const point = event.intersects?.[0]?.point
      if (point) {
        console.log(`[${id}] click:`, point.x.toFixed(2), point.y.toFixed(2), point.z.toFixed(2))
      }
    })
    scene.arrows.forEach(({ to, position, size = 220, label }) => {
      const arrow = new PANOLENS.Infospot(size, PANOLENS.DataImage.Arrow)
      arrow.position.set(...position)
      arrow.addHoverText(label, 24)
      // Le pasamos la posición de la flecha para que la cámara "camine" hacia ella
      arrow.addEventListener('click', () => goToScene(to, arrow.position))
      pano.add(arrow)
    })
    scene.infos.forEach(({ position, size = 220, label, lines, link }) => {
      const info = new PANOLENS.Infospot(size, PANOLENS.DataImage.Info)
      info.position.set(...position)
      info.addHoverText(label, 24)
      info.addEventListener('click', () => setInfoPanel({ label, lines, link }))
      pano.add(info)
    })
    return pano
  }
  const getOrCreatePanorama = async (id: SceneId): Promise<PanolensNS.ImagePanorama | null> => {
    const PANOLENS = panolensRef.current
    const viewer = viewerRef.current
    if (!PANOLENS || !viewer) return null
    const cache = panoramaCacheRef.current
    const existente = cache.get(id)
    if (existente) return existente
    // Si ya se está preparando (precarga), esperamos esa misma promesa
    const enCurso = pendingPanoRef.current.get(id)
    if (enCurso) return enCurso
    const promesa = (async () => {
      const srcSeguro = await prepararFuenteSegura(SCENES[id].src)
      // Si mientras tanto se cerró el visor, no hacemos nada
      if (!viewerRef.current) return null
      const pano = buildScenePanorama(PANOLENS, id, srcSeguro)
      cache.set(id, pano)
      viewerRef.current.add(pano)
      return pano
    })()
    pendingPanoRef.current.set(id, promesa)
    promesa.finally(() => pendingPanoRef.current.delete(id))
    return promesa
  }
  // Prepara (en segundo plano) las escenas a las que se puede ir desde la actual,
  // así al tocar una flecha la imagen ya está redimensionada y con el filtro aplicado.
  // Se hace de a una, con pausas, para no trabar el celular.
  const prefetchNeighbors = async (id: SceneId) => {
    await new Promise((r) => setTimeout(r, PREFETCH_DELAY))
    for (const { to } of SCENES[id].arrows) {
      if (!viewerRef.current) return
      if (!panoramaCacheRef.current.has(to)) {
        await getOrCreatePanorama(to)
        await new Promise((r) => setTimeout(r, 250))
      }
    }
  }
  // Corre una animación de "duration" ms llamando onFrame(t) con t de 0 a 1.
  const runAnimation = (duration: number, onFrame: (t: number) => void): Promise<void> =>
    new Promise((resolve) => {
      const start = performance.now()
      const step = (now: number) => {
        if (!viewerRef.current) { resolve(); return }
        const t = Math.min(1, (now - start) / duration)
        onFrame(t)
        if (t < 1) {
          walkRafRef.current = requestAnimationFrame(step)
        } else {
          walkRafRef.current = null
          resolve()
        }
      }
      walkRafRef.current = requestAnimationFrame(step)
    })
  // Cambia la opacidad de la capa que oscurece los bordes (0 = invisible, 1 = total)
  const setVeil = (opacity: number) => {
    if (veilRef.current) veilRef.current.style.opacity = String(opacity)
  }
  // Devuelve la cámara a su zoom normal (se usa si algo falla a mitad de la transición)
  const restoreView = (viewer: PanolensNS.Viewer, fov: number) => {
    viewer.camera.fov = fov
    viewer.camera.updateProjectionMatrix()
    setVeil(0)
  }
  // "fromPosition" es opcional: si viene (flecha), la cámara gira y "camina" hacia ese punto;
  // si no viene (botón Volver), se hace una transición corta.
  const goToScene = async (targetId: SceneId, fromPosition?: HotspotPos) => {
    const viewer = viewerRef.current
    if (!viewer || switchingRef.current || targetId === sceneIdRef.current) return
    switchingRef.current = true // bloquea toques dobles de inmediato
    setInfoPanel(null)
    setErrorCarga(null)
    setOverlayText(`Entrando a ${SCENES[targetId].label}…`)
    setSwitching(true)
    setSceneId(targetId)

    const baseFov = viewer.camera.fov
    // Mientras se hace la animación, ya vamos preparando la imagen de destino
    const targetPromise = getOrCreatePanorama(targetId)

    // ---- FASE 1: girar hacia el hotspot y "avanzar" con zoom ----
    if (fromPosition) {
      // Gira suavemente la cámara para que el hotspot quede en el centro de la pantalla
      const v = viewer as unknown as { tweenControlCenter?: (vec: unknown, ms?: number) => void }
      try { v.tweenControlCenter?.(fromPosition, WALK_TURN_MS) } catch { /* si no está disponible, seguimos igual */ }
    }
    const zoomFactor = fromPosition ? WALK_ZOOM_FACTOR : BACK_ZOOM_FACTOR
    const zoomMs = fromPosition ? WALK_ZOOM_MS : BACK_ZOOM_MS
    const walkFovEnd = baseFov * zoomFactor
    await runAnimation(zoomMs, (t) => {
      viewer.camera.fov = baseFov + (walkFovEnd - baseFov) * easeInCubic(t)
      viewer.camera.updateProjectionMatrix()
      // El oscurecimiento de los bordes empieza al 55% del avance y llega al máximo al final
      setVeil(t < 0.55 ? 0 : easeInOutCubic((t - 0.55) / 0.45))
    })
    if (!viewerRef.current) return

    // El cartel "Entrando a…" solo aparece si la carga tarda más de SPINNER_DELAY
    const spinnerTimer = setTimeout(() => setOverlayVisible(true), SPINNER_DELAY)
    const hideSpinner = () => { clearTimeout(spinnerTimer); setOverlayVisible(false) }

    const target = await targetPromise
    if (!target) {
      hideSpinner()
      restoreView(viewer, baseFov)
      setSwitching(false)
      setErrorCarga('No se pudo cargar esta escena. Volvé a intentar.')
      return
    }

    // ---- FASE 2: llegada a la nueva escena (zoom suave + se aclara la pantalla) ----
    const arrive = async () => {
      hideSpinner()
      const startFov = baseFov * ARRIVE_START_FACTOR
      viewer.camera.fov = startFov
      viewer.camera.updateProjectionMatrix()
      await runAnimation(ARRIVE_MS, (t) => {
        const e = easeOutCubic(t)
        viewer.camera.fov = startFov + (baseFov - startFov) * e
        viewer.camera.updateProjectionMatrix()
        setVeil(1 - e)
      })
      setSwitching(false)
      // Con la nueva escena ya visible, preparamos en segundo plano sus escenas vecinas
      prefetchNeighbors(targetId)
    }

    if (target.loaded) {
      viewer.setPanorama(target)
      arrive()
      return
    }
    let resuelto = false
    const onLoad = () => {
      if (resuelto) return
      resuelto = true
      target.removeEventListener('load', onLoad)
      arrive()
    }
    target.addEventListener('load', onLoad)
    viewer.setPanorama(target)
    // Si la textura nunca termina de cargar, no nos quedamos colgados: lo
    // avisamos y dejamos que el usuario reintente en vez de que la app
    // parezca "trabada" o vuelva sola al inicio sin explicación.
    setTimeout(() => {
      if (resuelto) return
      resuelto = true
      target.removeEventListener('load', onLoad)
      hideSpinner()
      restoreView(viewer, baseFov)
      setSwitching(false)
      setErrorCarga('La imagen está tardando demasiado en cargar. Volvé a intentar.')
    }, LOAD_TIMEOUT)
  }
  const handleExit = () => {
    if (exiting) return
    setExiting(true)
    setTimeout(onExit, EXIT_DURATION)
  }
  const handleBack = () => {
    if (exiting || switching) return
    const backTo = SCENES[sceneId].backTo
    if (backTo) { goToScene(backTo) } else { handleExit() }
  }
  // Link de la tarjeta de info (si tiene). Se guarda en una constante aparte para que
  // TypeScript sepa que no es undefined dentro del botón.
  const infoLink = infoPanel?.link ?? null
  return (
    <div className={`tvisit-stage ${exiting ? 'tvisit-stage--exiting' : ''}`}>
      <div ref={containerRef} className="tvisit-viewer" />
      {/* Capa que oscurece los bordes y deja un brillo al centro durante la transición.
          Su opacidad se anima por código (setVeil); no captura clics. */}
      <div
        ref={veilRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0,
          zIndex: 3,
          willChange: 'opacity',
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(6,10,18,0.96) 80%)',
        }}
      />
      {infoPanel ? (
        <>
          <div className="tvisit-info-backdrop" onClick={() => setInfoPanel(null)} />
          <div className="tvisit-info-panel v360-glass">
            <button className="tvisit-info-panel__close" onClick={() => setInfoPanel(null)} aria-label="Cerrar">×</button>
            <div className="tvisit-info-panel__eyebrow">Punto de interés</div>
            <h3 className="tvisit-info-panel__title">{infoPanel.label}</h3>
            {infoPanel.lines.map((line, i) => (
              <p key={i} className="tvisit-info-panel__text">{line}</p>
            ))}
            {/* Botón con el link (solo aparece si el hotspot tiene "link").
                Abre la página en una pestaña nueva. */}
            {infoLink ? (
              <button
                type="button"
                onClick={() => window.open(infoLink.url, '_blank', 'noopener,noreferrer')}
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
                {infoLink.text} ↗
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      <div className={`tvisit-overlay ${overlayVisible ? '' : 'tvisit-overlay--hidden'}`}>
        <div className="tvisit-overlay__card v360-glass">
          <div className="tvisit-overlay__spinner" />
          <span className="tvisit-overlay__text">{overlayText}</span>
        </div>
      </div>
      {errorCarga ? (
        <div className="tvisit-overlay">
          <div className="tvisit-overlay__card v360-glass">
            <span className="tvisit-overlay__text">{errorCarga}</span>
          </div>
        </div>
      ) : null}
      {revealed ? (
        <button onClick={handleBack} disabled={switching} className="tvisit-back v360-glass">
          <span className="tvisit-back__arrow">←</span>
          <span>Volver</span>
        </button>
      ) : null}
    </div>
  )
}