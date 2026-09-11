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
type SceneId = 'terminal' | 'metroarena'
type Vec3 = [number, number, number]

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
    arrows: [{ to: 'metroarena', position: [3534.34, -344.61, 3507.92], size: 220, label: 'METRO ARENA' }],
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
}

const START_SCENE: SceneId = 'terminal'

const REVEAL_FOV_START = 18
const REVEAL_FOV_END = 65
const REVEAL_DURATION = 1100
const MIN_OVERLAY_TIME = 700
const MIN_SWITCH_OVERLAY_TIME = 450
const SWITCH_OVERLAY_HOLD = 300
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

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/**
 * Devuelve una URL lista para usar como textura: la original si ya entra
 * dentro de MAX_TEXTURE_DIM, o una versión reescalada (como blob URL) si no.
 * Es el mismo control que ya existe en Vista360.tsx, aplicado acá a cada
 * escena del recorrido interior — en Safari (iPhone y Mac) una textura
 * demasiado grande no solo se ve mal: puede hacer que la pestaña se
 * reinicie por presión de memoria, que es el síntoma de "se vuelve al
 * principio" al entrar a Metro Arena.
 */
function prepararFuenteSegura(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (img.width <= MAX_TEXTURE_DIM && img.height <= MAX_TEXTURE_DIM) {
        resolve(src)
        return
      }
      const escala = MAX_TEXTURE_DIM / Math.max(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(img.width * escala))
      canvas.height = Math.max(1, Math.floor(img.height * escala))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(src)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(blob ? URL.createObjectURL(blob) : src),
        'image/jpeg',
        0.9
      )
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

  const revealRafRef = useRef<number | null>(null)
  const sceneIdRef = useRef<SceneId>(START_SCENE)
  const switchingRef = useRef(false)

  const [sceneId, setSceneId] = useState<SceneId>(START_SCENE)
  const [ready, setReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [overlayText, setOverlayText] = useState(`Entrando a ${SCENES[START_SCENE].label}…`)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [infoPanel, setInfoPanel] = useState<{ label: string; lines: string[] } | null>(null)
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
      }
    }

    revealRafRef.current = requestAnimationFrame(animateReveal)
    return () => { if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current) }
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
      arrow.addEventListener('click', () => goToScene(to))
      pano.add(arrow)
    })

    scene.infos.forEach(({ position, size = 220, label, lines }) => {
      const info = new PANOLENS.Infospot(size, PANOLENS.DataImage.Info)
      info.position.set(...position)
      info.addHoverText(label, 24)
      info.addEventListener('click', () => setInfoPanel({ label, lines }))
      pano.add(info)
    })

    return pano
  }

  const getOrCreatePanorama = async (id: SceneId): Promise<PanolensNS.ImagePanorama | null> => {
    const PANOLENS = panolensRef.current
    const viewer = viewerRef.current
    if (!PANOLENS || !viewer) return null

    const cache = panoramaCacheRef.current
    let pano = cache.get(id)
    if (!pano) {
      const srcSeguro = await prepararFuenteSegura(SCENES[id].src)
      pano = buildScenePanorama(PANOLENS, id, srcSeguro)
      cache.set(id, pano)
      viewer.add(pano)
    }
    return pano
  }

  const goToScene = async (targetId: SceneId) => {
    const viewer = viewerRef.current
    if (!viewer || switchingRef.current || targetId === sceneIdRef.current) return

    setInfoPanel(null)
    setErrorCarga(null)
    setOverlayText(`Entrando a ${SCENES[targetId].label}…`)
    setOverlayVisible(true)
    setSwitching(true)
    setSceneId(targetId)

    const target = await getOrCreatePanorama(targetId)
    if (!target) {
      setSwitching(false)
      setOverlayVisible(false)
      setErrorCarga('No se pudo cargar esta escena. Volvé a intentar.')
      return
    }

    const stopOverlay = () => {
      setTimeout(() => { setOverlayVisible(false); setSwitching(false) }, SWITCH_OVERLAY_HOLD)
    }

    if (target.loaded) {
      viewer.setPanorama(target)
      stopOverlay()
      return
    }

    const startedAt = performance.now()
    let resuelto = false

    const onLoad = () => {
      if (resuelto) return
      resuelto = true
      target.removeEventListener('load', onLoad)
      const elapsed = performance.now() - startedAt
      const wait = Math.max(0, MIN_SWITCH_OVERLAY_TIME - elapsed)
      setTimeout(stopOverlay, wait)
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
      setSwitching(false)
      setOverlayVisible(false)
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

  return (
    <div className={`tvisit-stage ${exiting ? 'tvisit-stage--exiting' : ''}`}>
      <div ref={containerRef} className="tvisit-viewer" />

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