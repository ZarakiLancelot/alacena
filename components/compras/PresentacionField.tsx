"use client";

import { useId, useState } from "react";

export type Presentacion = {
  id: string;
  producto_id: string;
  // Alias ASCII de la columna `tamaño` (ver el `select` en compras/page.tsx).
  tamano: number;
  unidad: string;
};

const UNIDADES_COMUNES = ["unidad", "kg", "g", "L", "ml", "paquete", "docena"];

const NUEVA = "__nueva__";

/**
 * Selector de presentación (tamaño + unidad), dependiente del producto
 * elegido en el paso anterior. Si el producto no tiene presentaciones
 * cargadas (o es un producto nuevo), fuerza directamente el modo "crear".
 *
 * El padre (NuevaCompraForm) le pasa `key={productoId ?? "new"}`, así React
 * remonta este componente —y resetea todo su estado interno— cada vez que
 * cambia el producto elegido, en vez de sincronizarlo con un useEffect.
 */
export function PresentacionField({
  presentaciones,
  productoId,
}: {
  presentaciones: Presentacion[];
  productoId: string | null;
}) {
  const unidadListId = useId();
  const disponibles = productoId
    ? presentaciones.filter((p) => p.producto_id === productoId)
    : [];

  const [selectedId, setSelectedId] = useState<string>(
    disponibles[0]?.id ?? NUEVA
  );
  const [tamano, setTamano] = useState("");
  const [unidad, setUnidad] = useState("");

  const modoNueva = selectedId === NUEVA;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Presentación
      </label>

      {disponibles.length > 0 ? (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        >
          {disponibles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.tamano} {p.unidad}
            </option>
          ))}
          <option value={NUEVA}>+ Nueva presentación…</option>
        </select>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {productoId
            ? "Este producto todavía no tiene presentaciones. Cargá una nueva:"
            : "Elegí primero el producto (o escribí uno nuevo) para cargar la presentación:"}
        </p>
      )}

      {modoNueva ? (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            min="0.01"
            inputMode="decimal"
            name="presentacion_tamano"
            value={tamano}
            onChange={(e) => setTamano(e.target.value)}
            placeholder="Tamaño (ej. 1)"
            className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            list={unidadListId}
            name="presentacion_unidad"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            placeholder="Unidad (ej. L, kg)"
            autoComplete="off"
            className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <datalist id={unidadListId}>
            {UNIDADES_COMUNES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      ) : (
        <input type="hidden" name="presentacion_id" value={selectedId} />
      )}
    </div>
  );
}
