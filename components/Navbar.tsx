// components/Navbar.tsx
'use client'

interface NavbarProps {
  /** Se llama al hacer clic en "Inicio" — es el único botón que hace algo. */
  onGoHome: () => void
  /** Ruta del logo dentro de /public. */
  logoSrc?: string
}

// Barra superior — liquid glass. Logo a la izquierda, Inicio/Espacios al
// centro (solo Inicio navega, Espacios es decorativo) e Iniciar sesión a la
// derecha (también decorativo). Vive en su propio componente para que
// Vista360.tsx se quede enfocado en el canvas/WebGL.
export default function Navbar({ onGoHome, logoSrc = '/LOGO.png' }: NavbarProps) {
  return (
    <div className="v360-navbar">
      <div className="v360-navbar__logo">
        <img src={logoSrc} alt="Terminal Metropolitana" />
      </div>

      <nav className="v360-navbar__pills v360-glass">
        <button onClick={onGoHome} className="v360-pill v360-pill--active">
          Inicio
        </button>
        <button className="v360-pill">Espacios</button>
      </nav>

      <button className="v360-navbar__login v360-glass">Iniciar sesión</button>
    </div>
  )
}