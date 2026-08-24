"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiShare2 } from "react-icons/fi";

export function CodigoInvitacion({
  codigo,
  hogarNombre,
}: {
  codigo: string;
  hogarNombre: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard puede fallar (permiso denegado, contexto no seguro); no es
      // grave, el código sigue visible en pantalla para copiarlo a mano.
    }
  }

  async function compartir() {
    const texto = `Unite a nuestro hogar en Alacena con el código ${codigo}`;
    // `navigator.share` no está disponible en todos los navegadores
    // (desktop Firefox/Chrome, por ejemplo): si falta, se cae a copiar.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Alacena", text: texto });
        return;
      } catch {
        // Usuario canceló el share sheet u ocurrió un error: no hacer nada
        // ruidoso, solo queda la opción de copiar.
        return;
      }
    }
    await copiar();
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Código de invitación de <span className="font-medium">{hogarNombre}</span>
      </p>
      <p className="text-3xl font-semibold tracking-[0.3em] text-zinc-900 dark:text-zinc-50">
        {codigo}
      </p>
      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={copiar}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2.5
            text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          {copiado ? (
            <>
              <FiCheck className="h-4 w-4" aria-hidden /> Copiado
            </>
          ) : (
            <>
              <FiCopy className="h-4 w-4" aria-hidden /> Copiar
            </>
          )}
        </button>
        <button
          type="button"
          onClick={compartir}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5
            text-sm font-medium text-white"
        >
          <FiShare2 className="h-4 w-4" aria-hidden /> Compartir
        </button>
      </div>
    </div>
  );
}
