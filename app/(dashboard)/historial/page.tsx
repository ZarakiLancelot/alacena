import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string; tienda?: string; fecha?: string }>;
}) {
  const { producto, tienda, fecha } = await searchParams;
  const supabase = await createClient();

  const [{ data: productos }, { data: tiendas }] = await Promise.all([
    supabase.from("productos").select("id, nombre").order("nombre"),
    supabase.from("tiendas").select("id, nombre").order("nombre"),
  ]);

  let query = supabase
    .from("vista_precio_unitario")
    .select("*")
    .order("fecha_compra", { ascending: false });

  if (producto) query = query.eq("producto_id", producto);
  if (tienda) query = query.eq("tienda_id", tienda);
  if (fecha) query = query.eq("fecha_compra", fecha);

  const { data: historial } = await query;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 pb-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Historial de compras
      </h1>

      <form method="get" className="flex flex-col gap-2">
        <select
          name="producto"
          defaultValue={producto ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Todos los productos</option>
          {(productos ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          name="tienda"
          defaultValue={tienda ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Todas las tiendas</option>
          {(tiendas ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="fecha"
          defaultValue={fecha ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Filtrar
          </button>
          {producto || tienda || fecha ? (
            <Link
              href="/historial"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400"
            >
              Quitar filtros
            </Link>
          ) : null}
        </div>
      </form>

      {!historial || historial.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No hay compras que coincidan con el filtro.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {historial.map((h) => (
            <li
              key={h.compra_id}
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {h.producto_nombre}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {h.tamaño} {h.unidad} · {h.tienda_nombre}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDate(h.fecha_compra)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(h.precio_pagado)}
                  </p>
                  {h.precio_oferta !== null ? (
                    <p className="text-xs text-zinc-400 line-through">
                      {formatCurrency(h.precio_normal)}
                    </p>
                  ) : null}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatCurrency(h.precio_por_unidad)} / {h.unidad}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
