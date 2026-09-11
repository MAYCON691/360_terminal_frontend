"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, RotateCw } from "lucide-react";

const UMBRAL_TAMANIO = 160;

function esCelularOTablet() {
  if (typeof window === "undefined") return true;
  const sinMouseFino = !window.matchMedia("(pointer: fine)").matches;
  const uaMovil = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(
    navigator.userAgent
  );
  return sinMouseFino || uaMovil;
}

export default function DevToolsGuard() {
  const [esPc, setEsPc] = useState(false);
  const [detectado, setDetectado] = useState(false);

  // Se decide una sola vez, del lado del cliente, apenas monta.
  useEffect(() => {
    setEsPc(!esCelularOTablet());
  }, []);

  useEffect(() => {
    if (!esPc) return; // en celular/tablet no se engancha NADA de esto

    const bloquearClicDerecho = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", bloquearClicDerecho);

    const bloquearAtajos = (e: KeyboardEvent) => {
      const tecla = e.key.toUpperCase();
      const bloqueado =
        tecla === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(tecla)) ||
        (e.ctrlKey && tecla === "U");
      if (bloqueado) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", bloquearAtajos, true);

    const chequearTamanio = () => {
      const anchoDiff = window.outerWidth - window.innerWidth > UMBRAL_TAMANIO;
      const altoDiff = window.outerHeight - window.innerHeight > UMBRAL_TAMANIO;
      if (anchoDiff || altoDiff) setDetectado(true);
    };

    const chequearDebugger = () => {
      const inicio = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const fin = performance.now();
      if (fin - inicio > 100) setDetectado(true);
    };

    chequearTamanio();
    const intervalo = setInterval(() => {
      chequearTamanio();
      chequearDebugger();
    }, 1000);

    return () => {
      document.removeEventListener("contextmenu", bloquearClicDerecho);
      document.removeEventListener("keydown", bloquearAtajos, true);
      clearInterval(intervalo);
    };
  }, [esPc]);

  if (!esPc || !detectado) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-400" />

        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <ShieldAlert size={32} className="text-orange-500" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            ACCESO RESTRINGIDO
          </h1>

          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Advertencia de seguridad del sistema
          </p>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Se ha detectado la apertura de las{" "}
            <span className="font-bold underline">Herramientas de Desarrollo</span>{" "}
            del navegador.
          </p>

          <div className="mt-5 w-full space-y-3 rounded-xl bg-slate-50 p-4 text-left">
            <p className="text-sm text-slate-700">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />
              Está terminantemente prohibido ejecutar{" "}
              <span className="font-bold">comandos o scripts</span> en la consola.
            </p>
            <p className="text-sm text-slate-700">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />
              El uso malintencionado del inspector será reportado como un{" "}
              <span className="font-bold">intento de vulneración</span>.
            </p>
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">
            Para restaurar tu sesión
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Cierra el inspector del navegador y recarga la pestaña.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            <RotateCw size={16} />
            Recargar Página
          </button>
        </div>
      </div>
    </div>
  );
}