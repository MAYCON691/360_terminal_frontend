// app/page.tsx
'use client'

import { useState } from 'react'
import Vista360 from '@/components/Vista360'
import VisitTerminalButton from '@/components/VisitTerminalButton'
import InteriorTour from '@/components/InteriorTour'

// Página raíz. Vista360 (el planeta) sigue funcionando igual — lo único que
// se le agregó fue un aviso opcional (onModeChange) para saber si ya se hizo
// clic en INGRESAR o si se volvió a Inicio. Ese aviso es lo que decide
// cuándo se ve el botón "VISITAR TERMINAL METROPOLITANA": solo en la vista
// normal del planeta, nunca en la esfera chiquita ni dentro del recorrido
// interior.
export default function Home() {
  const [mode, setMode] = useState<'planet' | 'entered'>('planet')
  const [visiting, setVisiting] = useState(false)

  return (
    <main>
      <Vista360 onModeChange={setMode} />

      <VisitTerminalButton onClick={() => setVisiting(true)} visible={mode === 'entered' && !visiting} />

      {visiting ? (
        <InteriorTour src="/DJI_085511.jpg" onExit={() => setVisiting(false)} />
      ) : null}
    </main>
  )
}