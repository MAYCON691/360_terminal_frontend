// components/VisitTerminalButton.tsx
'use client'

interface VisitTerminalButtonProps {
  onClick: () => void
  /**
   * Controla si se ve o no. Siempre está montado (para poder animar la
   * entrada y la salida con una transición CSS en vez de un mount/unmount
   * de golpe); page.tsx decide cuándo vale true — solo mientras estás en la
   * vista normal del planeta (ya hiciste clic en INGRESAR) y no estás
   * dentro del recorrido interior.
   */
  visible: boolean
}

// Botón "hero", centrado en la pantalla — el segundo punto de entrada,
// paralelo al INGRESAR del planeta. Vive en su propio componente para no
// tocar ni Vista360.tsx ni Navbar.tsx.
export default function VisitTerminalButton({ onClick, visible }: VisitTerminalButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`tvisit-cta ${visible ? 'tvisit-cta--visible' : ''}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span className="tvisit-cta__ring" />
      <span className="tvisit-cta__label">VISITAR TERMINAL METROPOLITANA</span>
    </button>
  )
}