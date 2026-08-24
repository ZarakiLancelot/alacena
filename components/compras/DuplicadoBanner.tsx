"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiInfo } from "react-icons/fi";
import { buscarComprasDuplicadas } from "@/app/(dashboard)/compras/actions";
import { formatDate } from "@/lib/utils";

/**
 * Banner NO bloqueante: avisa si ya hay una compra cargada en la misma
 * tienda y fecha, pero no impide guardar (el botón "Registrar compra" sigue
 * habilitado). Solo se activa con una tienda YA EXISTENTE (`tiendaId` no
 * nulo) — una tienda nueva, por definición, no puede tener duplicados.
 */
export function DuplicadoBanner({
  tiendaId,
  tiendaNombre,
  fecha,
}: {
  tiendaId: string | null;
  tiendaNombre: string;
  fecha: string;
}) {
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    let cancelado = false;
    // Debounce corto: evita disparar una consulta por cada tecla mientras el
    // usuario todavía está escribiendo/corrigiendo la tienda. El caso
    // "sin tienda existente todavía" también se resuelve en el callback del
    // timer (no de forma síncrona en el cuerpo del efecto) para no violar
    // react-hooks/set-state-in-effect.
    const timer = setTimeout(() => {
      if (!tiendaId || !fecha) {
        if (!cancelado) setCantidad(0);
        return;
      }
      buscarComprasDuplicadas(tiendaId, fecha)
        .then((count) => {
          if (!cancelado) setCantidad(count);
        })
        .catch(() => {
          if (!cancelado) setCantidad(0);
        });
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [tiendaId, fecha]);

  if (cantidad === 0) return null;

  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900
        dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <FiInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>
          Ya hay {cantidad === 1 ? "una compra registrada" : `${cantidad} compras registradas`}{" "}
          en <span className="font-medium">{tiendaNombre}</span> el{" "}
          {formatDate(fecha)}. ¿Querés revisarla antes de continuar?
        </p>
        <Link
          href={`/historial?tienda=${encodeURIComponent(tiendaId ?? "")}&fecha=${encodeURIComponent(fecha)}`}
          target="_blank"
          className="mt-1 inline-block font-medium underline underline-offset-2"
        >
          Ver en el historial
        </Link>
      </div>
    </div>
  );
}
