// app/page.tsx
'use client'

import { useState } from 'react'
import Vista360 from '@/components/Vista360'
import VisitTerminalButton from '@/components/VisitTerminalButton'
import InteriorTour from '@/components/InteriorTour'

// Página raíz. Vista360 (el planeta) sigue funcionando igual — se le pasa
// "paused" para que deje de dibujar mientras el recorrido interior está
// abierto (así no compite por la GPU con panolens y se acaba el lenteo).
export default function Home() {
  const [mode, setMode] = useState<'planet' | 'entered'>('planet')
  const [visiting, setVisiting] = useState(false)

  return (
    <main>
      <Vista360 onModeChange={setMode} paused={visiting} />

      <VisitTerminalButton onClick={() => setVisiting(true)} visible={mode === 'entered' && !visiting} />

      {visiting ? <InteriorTour onExit={() => setVisiting(false)} /> : null}
    </main>
  )
}