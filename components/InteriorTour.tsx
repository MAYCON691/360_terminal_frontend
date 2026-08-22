// components/InteriorTour.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type * as PanolensNS from 'panolens'

interface InteriorTourProps {
  /** Ruta de la foto 360° del interior, dentro de /public. */
  src: string
  /** Se llama cuando el usuario toca "Volver" (después del fundido de salida). */
  onExit: () => void
}

// ---------------------------------------------------------------------------
// Ajustes de la transición de entrada
// ---------------------------------------------------------------------------
// Arranca "cerrado" (poco campo de visión, como mirando por un caño) y se
// abre hasta el FOV de reposo — el efecto de "vuelo hacia adentro" que pide
// el diseño, pero hecho con la cámara real de panolens en vez de un truco de
// CSS. Subí REVEAL_FOV_START para un efecto más sutil, bajalo para uno más
// dramático.
const REVEAL_FOV_START = 18
const REVEAL_FOV_END = 65
const REVEAL_DURATION = 1100 // ms
// Tiempo mínimo que se ve el overlay de carga, aunque la foto cargue antes —
// evita el parpadeo de un loading de 40ms.
const MIN_OVERLAY_TIME = 700
const EXIT_DURATION = 500 // ms del fundido al tocar "Volver"

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

// Recorrido interior real: esfera + cámara de Three.js de panolens, con su
// propio control bar nativo (abajo a la derecha — fullscreen + ajustes). Acá
// es donde después van los Infospots (hotspots) y las demás fotos del
// recorrido. Vive separado de Vista360 a propósito: es una experiencia
// distinta, con su propia foto, así que no necesita heredar nada del planeta.
export default function InteriorTour({ src, onExit }: InteriorTourProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<PanolensNS.Viewer | null>(null)
  const revealRafRef = useRef<number | null>(null)

  const [ready, setReady] = useState(false) // textura cargada + tiempo mínimo de overlay cumplido
  const [revealed, setRevealed] = useState(false) // ya terminó de abrirse la cámara
  const [exiting, setExiting] = useState(false)

  // ---- Arma el visor de panolens al montar. Import dinámico porque
  // panolens toca `window` apenas se lo importa, y este componente también
  // podría evaluarse en el servidor si Next lo prerenderiza. ----
  useEffect(() => {
    let cancelled = false
    const mountedAt = performance.now()

    import('panolens').then((PANOLENS) => {
      if (cancelled || !containerRef.current) return

      const viewer = new PANOLENS.Viewer({
        container: containerRef.current,
        controlBar: true,
        controlButtons: ['fullscreen', 'setting'],
        autoRotate: false,
        cameraFov: REVEAL_FOV_START,
        output: 'none',
      })
      viewerRef.current = viewer

      const panorama = new PANOLENS.ImagePanorama(src)

      panorama.addEventListener('load', () => {
        if (cancelled) return
        const elapsed = performance.now() - mountedAt
        const wait = Math.max(0, MIN_OVERLAY_TIME - elapsed)
        setTimeout(() => {
          if (!cancelled) setReady(true)
        }, wait)
      })

      viewer.add(panorama)
    })

    return () => {
      cancelled = true
      if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current)
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // ---- Apenas la foto está lista: "vuelo hacia adentro" — el FOV se abre
  // de a poco mientras el overlay de carga se desvanece encima. ----
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
      }
    }

    revealRafRef.current = requestAnimationFrame(animateReveal)
    return () => {
      if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current)
    }
  }, [ready])

  const handleExit = () => {
    if (exiting) return
    setExiting(true)
    setTimeout(onExit, EXIT_DURATION)
  }

  return (
    <div className={`tvisit-stage ${exiting ? 'tvisit-stage--exiting' : ''}`}>
      <div ref={containerRef} className="tvisit-viewer" />

      <div className={`tvisit-overlay ${revealed ? 'tvisit-overlay--hidden' : ''}`}>
        <div className="tvisit-overlay__card v360-glass">
          <div className="tvisit-overlay__spinner" />
          <span className="tvisit-overlay__text">Entrando a Terminal Metropolitana…</span>
        </div>
      </div>

      {revealed ? (
        <button onClick={handleExit} className="tvisit-back v360-glass">
          <span className="tvisit-back__arrow">←</span>
          <span>Volver</span>
        </button>
      ) : null}
    </div>
  )
}