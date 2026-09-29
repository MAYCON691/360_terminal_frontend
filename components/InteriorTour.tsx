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
  link?: {
    url: string
    text: string
  }
}

interface SceneDef {
  id: SceneId
  src: string
  label: string
  backTo: SceneId | null
  arrows: ArrowHotspot[]
  infos: InfoHotspot[]
}

/* =========================================================
   ESCENAS
   ========================================================= */

const SCENES: Record<SceneId, SceneDef> = {
  terminal: {
    id: 'terminal',
    src: '/DJI_085511.JPG',
    label: 'Terminal Metropolitana',
    backTo: null,

    arrows: [
      {
        to: 'metroarena',
        position: [3534.34, -344.61, 3507.92],
        size: 220,
        label: 'METRO ARENA',
      },
      {
        to: 'puerta1',
        position: [3469.79, -937.11, 3461.12],
        size: 220,
        label: 'INGRESO 2',
      },
      {
        to: 'puertaprincipal',
        position: [4683.2, -1693.66, 329.35],
        size: 220,
        label: 'INGRESO PRINCIPAL',
      },
      {
        to: 'puerta3',
        position: [2791.8, -1400.19, -3897.7],
        size: 220,
        label: 'INGRESO 3',
      },
      {
        to: 'helipuerto',
        position: [2568.12, -488.73, -4253.94],
        size: 220,
        label: 'HELIPUERTO',
      },
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
      {
        to: 'patiocomidas2',
        position: [4336.71, 2372.56, 691.85],
        size: 220,
        label: 'PATIO DE COMIDAS',
      },
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
        link: {
          url: 'https://www.att.gob.bo/',
          text: 'Visitar página web de la ATT',
        },
      },
    ],
  },

  puerta3: {
    id: 'puerta3',
    src: '/PUERTA_3.jpg',
    label: 'Ingreso 3',
    backTo: 'terminal',

    arrows: [
      {
        to: 'ascensor',
        position: [2232.09, -162.75, -4459.47],
        size: 220,
        label: 'ENTRAR A ASCENSOR',
      },
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
      {
        to: 'piso3',
        position: [-3887.04, -1329.8, 2842.11],
        size: 220,
        label: 'PISO 3',
      },
      {
        to: 'piso2',
        position: [-3785.22, -1721.29, 2773.27],
        size: 220,
        label: 'PISO 2',
      },
      {
        to: 'puerta3',
        position: [-3598.28, -2220.54, 2662.06],
        size: 220,
        label: 'PLANTA BAJA',
      },
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

// Mantiene el rendimiento que ya conseguiste.
const MAX_PIXEL_RATIO = 1.5

const REVEAL_FOV_START = 18
const REVEAL_FOV_END = 65
const REVEAL_DURATION = 1100

const MIN_LOADING_TIME = 900
const WARMUP_FRAMES = 12
const LOAD_TIMEOUT = 20000

const WALK_TURN_MS = 700
const WALK_ZOOM_MS = 900
const WALK_ZOOM_FACTOR = 0.42

const BACK_ZOOM_MS = 450
const BACK_ZOOM_FACTOR = 0.8

const ARRIVE_MS = 900
const ARRIVE_START_FACTOR = 0.72

const EXIT_DURATION = 500

/* =========================================================
   FUNCIONES AUXILIARES
   ========================================================= */

function easeInOutCubic(x: number) {
  return x < 0.5
    ? 4 * x * x * x
    : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function easeInCubic(x: number) {
  return x * x * x
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3)
}

function esperarFrames(cantidad: number): Promise<void> {
  return new Promise((resolve) => {
    let frames = 0

    const siguiente = () => {
      frames++

      if (frames >= cantidad) {
        resolve()
        return
      }

      requestAnimationFrame(siguiente)
    }

    requestAnimationFrame(siguiente)
  })
}

/* =========================================================
   PRECARGAR IMAGEN NORMAL

   IMPORTANTE:
   NO canvas
   NO toBlob()
   NO blob:
   NO createObjectURL()

   Simplemente hacemos que el navegador descargue y decodifique
   el JPG real antes de entregárselo a Panolens.
   ========================================================= */

function precargarImagen(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    let terminado = false

    const completar = () => {
      if (terminado) return

      terminado = true

      resolve(src)
    }

    const fallar = () => {
      if (terminado) return

      terminado = true

      reject(new Error(`No se pudo cargar ${src}`))
    }

    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode()
        }
      } catch {
        // onload ya confirmó que la imagen existe.
      }

      completar()
    }

    img.onerror = fallar

    // Mismo origen: no necesitamos crossOrigin.
    img.src = src

    if (img.complete && img.naturalWidth > 0) {
      completar()
    }
  })
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function InteriorTour({
  onExit,
}: InteriorTourProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const viewerRef = useRef<PanolensNS.Viewer | null>(null)

  const panolensRef = useRef<typeof PanolensNS | null>(null)

  const panoramaCacheRef =
    useRef<Map<SceneId, PanolensNS.ImagePanorama>>(new Map())

  const pendingRef =
    useRef<
      Map<SceneId, Promise<PanolensNS.ImagePanorama | null>>
    >(new Map())

  const currentSceneRef = useRef<SceneId>(START_SCENE)

  const switchingRef = useRef(false)

  const animationRef = useRef<number | null>(null)

  const veilRef = useRef<HTMLDivElement | null>(null)

  const [sceneId, setSceneId] = useState<SceneId>(START_SCENE)

  const [ready, setReady] = useState(false)

  const [revealed, setRevealed] = useState(false)

  const [switching, setSwitching] = useState(false)

  const [exiting, setExiting] = useState(false)

  const [loadingVisible, setLoadingVisible] = useState(true)

  const [loadingText, setLoadingText] =
    useState('Cargando Terminal Metropolitana...')

  const [errorCarga, setErrorCarga] =
    useState<string | null>(null)

  const [infoPanel, setInfoPanel] = useState<{
    label: string
    lines: string[]
    link?: {
      url: string
      text: string
    }
  } | null>(null)

  useEffect(() => {
    currentSceneRef.current = sceneId
  }, [sceneId])

  useEffect(() => {
    switchingRef.current = switching
  }, [switching])

  /* =======================================================
     CREAR PANORAMA
     ======================================================= */

  const crearPanorama = (
    PANOLENS: typeof PanolensNS,
    id: SceneId
  ): PanolensNS.ImagePanorama => {
    const scene = SCENES[id]

    // AQUÍ usamos directamente /DJI_085511.JPG.
    const panorama = new PANOLENS.ImagePanorama(scene.src)

    /* =====================================================
       COORDENADAS AL HACER CLIC
       ===================================================== */

    panorama.addEventListener(
      'click',
      (event: {
        intersects?: Array<{
          point: {
            x: number
            y: number
            z: number
          }
        }>
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

    /* =====================================================
       FLECHAS
       ===================================================== */

    scene.arrows.forEach(
      ({
        to,
        position,
        size = 220,
        label,
      }) => {
        const arrow = new PANOLENS.Infospot(
          size,
          PANOLENS.DataImage.Arrow
        )

        arrow.position.set(
          position[0],
          position[1],
          position[2]
        )

        arrow.addHoverText(label, 24)

        arrow.addEventListener('click', () => {
          goToScene(to, arrow.position)
        })

        panorama.add(arrow)
      }
    )

    /* =====================================================
       INFORMACIÓN
       ===================================================== */

    scene.infos.forEach(
      ({
        position,
        size = 220,
        label,
        lines,
        link,
      }) => {
        const info = new PANOLENS.Infospot(
          size,
          PANOLENS.DataImage.Info
        )

        info.position.set(
          position[0],
          position[1],
          position[2]
        )

        info.addHoverText(label, 24)

        info.addEventListener('click', () => {
          setInfoPanel({
            label,
            lines,
            link,
          })
        })

        panorama.add(info)
      }
    )

    return panorama
  }

  /* =======================================================
     OBTENER PANORAMA
     ======================================================= */

  const getOrCreatePanorama = async (
    id: SceneId
  ): Promise<PanolensNS.ImagePanorama | null> => {
    const cached = panoramaCacheRef.current.get(id)

    if (cached) {
      return cached
    }

    const pending = pendingRef.current.get(id)

    if (pending) {
      return pending
    }

    const PANOLENS = panolensRef.current
    const viewer = viewerRef.current

    if (!PANOLENS || !viewer) {
      return null
    }

    const promise = (async () => {
      const scene = SCENES[id]

      try {
        // Descarga + decodificación anticipada.
        await precargarImagen(scene.src)
      } catch (error) {
        console.error(error)
        return null
      }

      if (!viewerRef.current) {
        return null
      }

      const panorama = crearPanorama(
        PANOLENS,
        id
      )

      panoramaCacheRef.current.set(
        id,
        panorama
      )

      viewerRef.current.add(panorama)

      return panorama
    })()

    pendingRef.current.set(id, promise)

    promise.finally(() => {
      pendingRef.current.delete(id)
    })

    return promise
  }

  /* =======================================================
     INICIALIZAR
     ======================================================= */

  useEffect(() => {
    let cancelled = false

    const mountedAt = performance.now()

    const iniciar = async () => {
      try {
        setLoadingVisible(true)

        setLoadingText(
          'Cargando Terminal Metropolitana...'
        )

        const PANOLENS = await import('panolens')

        if (
          cancelled ||
          !containerRef.current
        ) {
          return
        }

        panolensRef.current = PANOLENS

        /* =================================================
           VIEWER
           ================================================= */

        const viewer = new PANOLENS.Viewer({
          container: containerRef.current,

          controlBar: true,

          controlButtons: [
            'fullscreen',
            'setting',
          ],

          autoRotate: false,

          cameraFov: REVEAL_FOV_START,

          output: 'none',
        })

        viewerRef.current = viewer

        /* =================================================
           OPTIMIZACIÓN DE RENDER

           ESTA PARTE SE MANTIENE.

           Es una de las razones por las que ahora no lentea.
           ================================================= */

        try {
          const internal = viewer as unknown as {
            renderer?: {
              setPixelRatio?: (
                ratio: number
              ) => void
            }

            onWindowResize?: () => void
          }

          const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            MAX_PIXEL_RATIO
          )

          internal.renderer?.setPixelRatio?.(
            pixelRatio
          )

          internal.onWindowResize?.()
        } catch (error) {
          console.warn(
            'No se pudo configurar pixelRatio:',
            error
          )
        }

        /* =================================================
           PRECARGAR JPG REAL

           No creamos Blob.
           No creamos Canvas.
           ================================================= */

        const startScene = SCENES[START_SCENE]

        await precargarImagen(startScene.src)

        if (cancelled) return

        setLoadingText(
          'Preparando recorrido 360°...'
        )

        /* =================================================
           PANORAMA
           ================================================= */

        const first = crearPanorama(
          PANOLENS,
          START_SCENE
        )

        panoramaCacheRef.current.set(
          START_SCENE,
          first
        )

        /* =================================================
           ESPERAR LOAD REAL DE PANOLENS
           ================================================= */

        const loadedPromise =
          new Promise<void>((resolve) => {
            let finished = false

            const finish = () => {
              if (finished) return

              finished = true
              resolve()
            }

            first.addEventListener(
              'load',
              finish
            )

            setTimeout(
              finish,
              LOAD_TIMEOUT
            )
          })

        viewer.add(first)

        await loadedPromise

        if (cancelled) return

        /* =================================================
           WARM-UP

           Mantenemos el loader mientras WebGL estabiliza
           la textura.
           ================================================= */

        setLoadingText(
          'Optimizando visualización...'
        )

        await esperarFrames(
          WARMUP_FRAMES
        )

        if (cancelled) return

        /* =================================================
           TIEMPO MÍNIMO DEL LOADER
           ================================================= */

        const elapsed =
          performance.now() -
          mountedAt

        if (elapsed < MIN_LOADING_TIME) {
          await new Promise<void>(
            (resolve) => {
              setTimeout(
                resolve,
                MIN_LOADING_TIME -
                  elapsed
              )
            }
          )
        }

        if (cancelled) return

        setReady(true)
      } catch (error) {
        console.error(
          'Error iniciando recorrido:',
          error
        )

        setLoadingVisible(false)

        setErrorCarga(
          'No se pudo cargar el recorrido 360°.'
        )
      }
    }

    iniciar()

    return () => {
      cancelled = true

      if (animationRef.current !== null) {
        cancelAnimationFrame(
          animationRef.current
        )

        animationRef.current = null
      }

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy()
        } catch {
          // Ignorar
        }

        viewerRef.current = null
      }

      panoramaCacheRef.current.clear()
      pendingRef.current.clear()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =======================================================
     REVELADO INICIAL
     ======================================================= */

  useEffect(() => {
    if (!ready) return

    const viewer = viewerRef.current

    if (!viewer) return

    const startTime = performance.now()

    const animate = (now: number) => {
      const progress = Math.min(
        1,
        (now - startTime) /
          REVEAL_DURATION
      )

      const eased =
        easeInOutCubic(progress)

      viewer.camera.fov =
        REVEAL_FOV_START +
        (
          REVEAL_FOV_END -
          REVEAL_FOV_START
        ) *
          eased

      viewer.camera.updateProjectionMatrix()

      if (progress < 1) {
        animationRef.current =
          requestAnimationFrame(animate)

        return
      }

      animationRef.current = null

      setRevealed(true)

      // Recién aquí desaparece el loader.
      setLoadingVisible(false)
    }

    animationRef.current =
      requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(
          animationRef.current
        )
      }
    }
  }, [ready])

  /* =======================================================
     VELO
     ======================================================= */

  const setVeil = (opacity: number) => {
    const element = veilRef.current

    if (!element) return

    element.style.opacity =
      String(opacity)

    element.style.visibility =
      opacity <= 0.001
        ? 'hidden'
        : 'visible'
  }

  /* =======================================================
     ANIMACIÓN
     ======================================================= */

  const runAnimation = (
    duration: number,
    onFrame: (
      progress: number
    ) => void
  ): Promise<void> => {
    return new Promise((resolve) => {
      const start = performance.now()

      const step = (now: number) => {
        if (!viewerRef.current) {
          resolve()
          return
        }

        const progress = Math.min(
          1,
          (now - start) / duration
        )

        onFrame(progress)

        if (progress < 1) {
          animationRef.current =
            requestAnimationFrame(step)
        } else {
          animationRef.current = null
          resolve()
        }
      }

      animationRef.current =
        requestAnimationFrame(step)
    })
  }

  /* =======================================================
     CAMBIAR DE ESCENA
     ======================================================= */

  const goToScene = async (
    targetId: SceneId,
    fromPosition?: PanolensNS.Infospot['position']
  ) => {
    const viewer = viewerRef.current

    if (!viewer) return

    if (switchingRef.current) return

    if (
      targetId ===
      currentSceneRef.current
    ) {
      return
    }

    switchingRef.current = true

    setSwitching(true)
    setInfoPanel(null)
    setErrorCarga(null)

    const destination =
      SCENES[targetId]

    const baseFov =
      viewer.camera.fov

    /* =====================================================
       EMPEZAMOS A CARGAR DESTINO
       ===================================================== */

    const targetPromise =
      getOrCreatePanorama(targetId)

    /* =====================================================
       MIRAR HACIA HOTSPOT
       ===================================================== */

    if (fromPosition) {
      try {
        const internal =
          viewer as unknown as {
            tweenControlCenter?: (
              position: unknown,
              duration?: number
            ) => void
          }

        internal.tweenControlCenter?.(
          fromPosition,
          WALK_TURN_MS
        )
      } catch {
        // continuar
      }
    }

    /* =====================================================
       ZOOM DE CAMINATA
       ===================================================== */

    const zoomFactor =
      fromPosition
        ? WALK_ZOOM_FACTOR
        : BACK_ZOOM_FACTOR

    const zoomDuration =
      fromPosition
        ? WALK_ZOOM_MS
        : BACK_ZOOM_MS

    const targetFov =
      baseFov * zoomFactor

    await runAnimation(
      zoomDuration,
      (progress) => {
        const eased =
          easeInCubic(progress)

        viewer.camera.fov =
          baseFov +
          (
            targetFov -
            baseFov
          ) *
            eased

        viewer.camera.updateProjectionMatrix()

        if (progress > 0.55) {
          const veilProgress =
            (progress - 0.55) /
            0.45

          setVeil(
            easeInOutCubic(
              veilProgress
            )
          )
        }
      }
    )

    if (!viewerRef.current) return

    /* =====================================================
       LOADER ENTRE ESCENAS
       ===================================================== */

    setLoadingText(
      `Entrando a ${destination.label}...`
    )

    setLoadingVisible(true)

    const target =
      await targetPromise

    if (!target) {
      setLoadingVisible(false)

      viewer.camera.fov =
        baseFov

      viewer.camera.updateProjectionMatrix()

      setVeil(0)

      switchingRef.current = false
      setSwitching(false)

      setErrorCarga(
        'No se pudo cargar esta escena.'
      )

      return
    }

    /* =====================================================
       ESPERAR NUEVA TEXTURA
       ===================================================== */

    const loadPromise =
      new Promise<void>((resolve) => {
        let finished = false

        const finish = () => {
          if (finished) return

          finished = true
          resolve()
        }

        if (target.loaded) {
          finish()
          return
        }

        target.addEventListener(
          'load',
          finish
        )

        setTimeout(
          finish,
          LOAD_TIMEOUT
        )
      })

    viewer.setPanorama(target)

    await loadPromise

    /* =====================================================
       WARMUP
       ===================================================== */

    await esperarFrames(5)

    currentSceneRef.current =
      targetId

    setSceneId(targetId)

    /* =====================================================
       LLEGADA
       ===================================================== */

    const arrivalFov =
      baseFov *
      ARRIVE_START_FACTOR

    viewer.camera.fov =
      arrivalFov

    viewer.camera.updateProjectionMatrix()

    await runAnimation(
      ARRIVE_MS,
      (progress) => {
        const eased =
          easeOutCubic(progress)

        viewer.camera.fov =
          arrivalFov +
          (
            baseFov -
            arrivalFov
          ) *
            eased

        viewer.camera.updateProjectionMatrix()

        setVeil(1 - eased)
      }
    )

    setVeil(0)

    setLoadingVisible(false)

    switchingRef.current = false

    setSwitching(false)
  }

  /* =======================================================
     VOLVER
     ======================================================= */

  const handleBack = () => {
    if (
      exiting ||
      switchingRef.current
    ) {
      return
    }

    const current =
      SCENES[
        currentSceneRef.current
      ]

    if (current.backTo) {
      goToScene(current.backTo)
      return
    }

    handleExit()
  }

  /* =======================================================
     SALIR
     ======================================================= */

  const handleExit = () => {
    if (exiting) return

    setExiting(true)

    setTimeout(
      onExit,
      EXIT_DURATION
    )
  }

  const infoLink =
    infoPanel?.link ?? null

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      className={`tvisit-stage ${
        exiting
          ? 'tvisit-stage--exiting'
          : ''
      }`}
    >
      {/* PANOLENS */}

      <div
        ref={containerRef}
        className="tvisit-viewer"
      />

      {/* TRANSICIÓN */}

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

      {/* INFORMACIÓN */}

      {infoPanel ? (
        <>
          <div
            className="tvisit-info-backdrop"
            onClick={() =>
              setInfoPanel(null)
            }
          />

          <div className="tvisit-info-panel v360-glass">
            <button
              type="button"
              className="tvisit-info-panel__close"
              onClick={() =>
                setInfoPanel(null)
              }
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="tvisit-info-panel__eyebrow">
              Punto de interés
            </div>

            <h3 className="tvisit-info-panel__title">
              {infoPanel.label}
            </h3>

            {infoPanel.lines.map(
              (line, index) => (
                <p
                  key={index}
                  className="tvisit-info-panel__text"
                >
                  {line}
                </p>
              )
            )}

            {infoLink ? (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    infoLink.url,
                    '_blank',
                    'noopener,noreferrer'
                  )
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

      {/* CARGANDO */}

      {loadingVisible ? (
        <div className="tvisit-overlay">
          <div className="tvisit-overlay__card v360-glass">
            <div className="tvisit-overlay__spinner" />

            <span className="tvisit-overlay__text">
              {loadingText}
            </span>
          </div>
        </div>
      ) : null}

      {/* ERROR */}

      {errorCarga ? (
        <div className="tvisit-overlay">
          <div className="tvisit-overlay__card v360-glass">
            <span className="tvisit-overlay__text">
              {errorCarga}
            </span>
          </div>
        </div>
      ) : null}

      {/* VOLVER */}

      {revealed ? (
        <button
          type="button"
          onClick={handleBack}
          disabled={switching}
          className="tvisit-back v360-neu"
        >
          <span className="tvisit-back__arrow">
            ←
          </span>

          <span>Volver</span>
        </button>
      ) : null}
    </div>
  )
}