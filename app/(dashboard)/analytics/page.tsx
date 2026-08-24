import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatTiendaNombre } from "@/lib/utils";
import {
  cambioDePrecio,
  comparadorTiendas,
  fechasUnicas,
  gastoPorCampo,
  mapaDeColores,
  parsePeriodo,
  rangoPeriodo,
  seriesPorTienda,
  totalGastado,
  type PrecioUnitarioRow,
} from "@/lib/analytics";
import { PriceTrendChart } from "@/components/analytics/PriceTrendChart";
import { StoreComparisonTable } from "@/components/analytics/StoreComparisonTable";
import { PriceAlert } from "@/components/analytics/PriceAlert";
import { SpendBarChart } from "@/components/analytics/SpendBarChart";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string; periodo?: string }>;
}) {
  const { producto, periodo: periodoParam } = await searchParams;
  const periodo = parsePeriodo(periodoParam);
  const supabase = await createClient();

  const [{ data: productos }, { data: tiendas }, { data: productosCategorias }] =
    await Promise.all([
      supabase.from("productos").select("id, nombre").order("nombre"),
      supabase.from("tiendas").select("nombre, ubicacion").order("nombre"),
      supabase.from("productos").select("categoria").not("categoria", "is", null),
    ]);

  // Si no vino producto por query, usamos el de la compra más reciente: así
  // la página siempre abre mostrando algo en vez de una selección vacía.
  let productoId = producto;
  if (!productoId) {
    const { data: reciente } = await supabase
      .from("vista_precio_unitario")
      .select("producto_id")
      .order("fecha_compra", { ascending: false })
      .limit(1)
      .maybeSingle();
    productoId = reciente?.producto_id ?? undefined;
  }

  const { inicio, fin } = rangoPeriodo(periodo);

  const [{ data: historialProductoRaw }, { data: gastoRowsRaw }] = await Promise.all([
    productoId
      ? supabase
          .from("vista_precio_unitario")
          .select("*")
          .eq("producto_id", productoId)
          .order("fecha_compra", { ascending: true })
      : Promise.resolve({ data: [] as PrecioUnitarioRow[] }),
    supabase
      .from("vista_precio_unitario")
      .select("categoria, tienda_nombre, tienda_ubicacion, precio_pagado, fecha_compra")
      .gte("fecha_compra", inicio)
      .lte("fecha_compra", fin),
  ]);

  const historialProducto = historialProductoRaw ?? [];
  // gastoPorCampo agrupa genéricamente por el campo "tienda_nombre" del row;
  // se reemplaza acá por el nombre ya combinado con ubicación (en vez de
  // tocar la función genérica) para que dos sucursales de una misma cadena
  // no se mezclen en una sola barra.
  const gastoRows = (gastoRowsRaw ?? []).map((row) => ({
    ...row,
    tienda_nombre: formatTiendaNombre(row.tienda_nombre, row.tienda_ubicacion),
  }));

  // Colores fijos por nombre (mismo color en todo el dashboard), asignados
  // sobre el universo completo de tiendas/categorías del usuario — no solo
  // las que aparecen en la selección actual — para que no "salten" de color
  // al cambiar de producto o de período.
  const colorTienda = mapaDeColores(
    (tiendas ?? []).map((t) => formatTiendaNombre(t.nombre, t.ubicacion))
  );
  const colorCategoria = mapaDeColores((productosCategorias ?? []).map((p) => p.categoria));

  const productoSeleccionado = (productos ?? []).find((p) => p.id === productoId);
  const unidadProducto = historialProducto[0]?.unidad ?? null;

  const gastoPorCategoria = gastoPorCampo(gastoRows, "categoria", "Sin categoría", colorCategoria);
  const gastoPorTienda = gastoPorCampo(gastoRows, "tienda_nombre", "Sin tienda", colorTienda);
  const total = totalGastado(gastoRows);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h1>

      <form method="get" className="flex flex-col gap-2">
        <select
          name="producto"
          defaultValue={productoId ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {(productos ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input type="hidden" name="periodo" value={periodo} />
        <button
          type="submit"
          className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Ver producto
        </button>
      </form>

      {productoSeleccionado ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
              {productoSeleccionado.nombre}
            </h2>
            {unidadProducto ? (
              <span className="text-xs text-zinc-400">precio por {unidadProducto}</span>
            ) : null}
          </div>

          <PriceAlert cambio={cambioDePrecio(historialProducto)} />

          <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Tendencia de precio (normal vs. oferta, por tienda)
            </p>
            <PriceTrendChart
              fechas={fechasUnicas(historialProducto)}
              series={seriesPorTienda(historialProducto, colorTienda)}
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Comparador de tiendas (precio por unidad, más barata primero)
            </p>
            <StoreComparisonTable
              filas={comparadorTiendas(historialProducto, colorTienda)}
              unidad={unidadProducto}
            />
          </div>
        </section>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay compras registradas para armar analytics de productos.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Resumen de gasto</h2>
          <form method="get" className="flex gap-1 text-xs">
            {productoId ? <input type="hidden" name="producto" value={productoId} /> : null}
            {(["semana", "mes"] as const).map((p) => (
              <button
                key={p}
                type="submit"
                name="periodo"
                value={p}
                className={
                  p === periodo
                    ? "cursor-pointer rounded-full bg-emerald-600 px-3 py-1 font-medium text-white"
                    : "cursor-pointer rounded-full border border-zinc-300 px-3 py-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                }
              >
                {p === "semana" ? "Esta semana" : "Este mes"}
              </button>
            ))}
          </form>
        </div>

        <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {formatCurrency(total)}
        </p>

        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Por categoría</p>
          <SpendBarChart
            data={gastoPorCategoria}
            emptyLabel="No hay compras registradas en este período."
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Por tienda</p>
          <SpendBarChart
            data={gastoPorTienda}
            emptyLabel="No hay compras registradas en este período."
          />
        </div>
      </section>
    </div>
  );
}
