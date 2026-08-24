import type { Tables } from "@/types/database.types";
import { formatTiendaNombre, today } from "@/lib/utils";

/**
 * Todo lo de acá lee filas de `vista_precio_unitario` (ver
 * supabase/migrations/20260823140500_vistas_precio_y_stock.sql) tal cual las
 * devuelve Supabase: solo agrupa/ordena/compara en JS. El cálculo de precio
 * por unidad (`precio_por_unidad`) ya viene resuelto por la vista — nada acá
 * lo recalcula.
 */
export type PrecioUnitarioRow = Tables<"vista_precio_unitario">;

export type Periodo = "semana" | "mes";

export function parsePeriodo(value: string | undefined): Periodo {
  return value === "semana" ? "semana" : "mes";
}

function utcMillis(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoFromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Rango [inicio, fin] (fechas de Postgres, inclusive) del período actual. */
export function rangoPeriodo(periodo: Periodo): { inicio: string; fin: string } {
  const fin = today();
  const finMs = utcMillis(fin);

  if (periodo === "semana") {
    const dia = new Date(finMs).getUTCDay(); // 0 = domingo … 6 = sábado
    const diasDesdeLunes = dia === 0 ? 6 : dia - 1;
    return { inicio: isoFromUtc(finMs - diasDesdeLunes * 86_400_000), fin };
  }

  const [y, m] = fin.split("-").map(Number);
  return { inicio: isoFromUtc(Date.UTC(y, m - 1, 1)), fin };
}

// ---------------------------------------------------------------------------
// Colores: un mismo nombre (tienda o categoría) siempre resuelve al mismo
// color en todo el dashboard (gráfico de tendencia, comparador y resumen de
// gasto), asignado por orden alfabético — nunca por magnitud/ranking. Paleta
// categórica validada (8 slots, CVD-safe) definida como custom properties en
// app/globals.css.
// ---------------------------------------------------------------------------

const SLOTS_COLOR = 8;

function colorPorIndice(indice: number): string {
  return indice < SLOTS_COLOR
    ? `var(--viz-series-${indice + 1})`
    : "var(--viz-text-muted)"; // más de 8 series: se pliegan a "otras"
}

/** Mapa nombre → color fijo, asignado por orden alfabético sobre `claves`. */
export function mapaDeColores(claves: Array<string | null | undefined>): Map<string, string> {
  const unicas = Array.from(new Set(claves.filter((c): c is string => !!c))).sort((a, b) =>
    a.localeCompare(b, "es")
  );
  return new Map(unicas.map((clave, i) => [clave, colorPorIndice(i)]));
}

function colorDe(mapa: Map<string, string>, clave: string | null): string {
  return (clave && mapa.get(clave)) || "var(--viz-text-muted)";
}

// ---------------------------------------------------------------------------
// 1) Tendencia de precios por producto (línea normal/oferta, por tienda)
// ---------------------------------------------------------------------------

export type PuntoPrecio = {
  fecha: string;
  precio_normal: number | null;
  precio_oferta: number | null;
};

export type SerieTienda = {
  nombre: string;
  color: string;
  puntos: PuntoPrecio[];
  tieneOferta: boolean;
};

/** Fechas únicas ordenadas: fijan el orden cronológico del eje X (categórico). */
export function fechasUnicas(rows: PrecioUnitarioRow[]): { fecha: string }[] {
  const fechas = Array.from(
    new Set(rows.map((r) => r.fecha_compra).filter((f): f is string => !!f))
  ).sort();
  return fechas.map((fecha) => ({ fecha }));
}

/** Una serie (con sus propios puntos, en su propio orden temporal) por tienda. */
export function seriesPorTienda(
  rows: PrecioUnitarioRow[],
  colorTienda: Map<string, string>
): SerieTienda[] {
  const porTienda = new Map<string, PuntoPrecio[]>();
  for (const row of rows) {
    if (!row.tienda_nombre || !row.fecha_compra) continue;
    // Distintas sucursales de una misma cadena pueden compartir `nombre`
    // (ver supabase/migrations/20260823180000_cadenas.sql): agrupar por el
    // combinado nombre+ubicación evita mezclarlas en una sola serie.
    const clave = formatTiendaNombre(row.tienda_nombre, row.tienda_ubicacion);
    const puntos = porTienda.get(clave) ?? [];
    puntos.push({
      fecha: row.fecha_compra,
      precio_normal: row.precio_normal,
      precio_oferta: row.precio_oferta,
    });
    porTienda.set(clave, puntos);
  }

  return Array.from(porTienda, ([nombre, puntos]) => {
    const ordenados = puntos.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
    return {
      nombre,
      color: colorDe(colorTienda, nombre),
      puntos: ordenados,
      tieneOferta: ordenados.some((p) => p.precio_oferta != null),
    };
  });
}

// ---------------------------------------------------------------------------
// 2) Comparador de tiendas: último precio por unidad registrado en cada
//    tienda donde se compró el producto, más barato → más caro.
// ---------------------------------------------------------------------------

export type FilaComparador = {
  nombre: string;
  color: string;
  precioPorUnidad: number;
  fecha: string;
};

/** `rows` debe venir ordenado ascendente por fecha_compra (así "la última" gana el set). */
export function comparadorTiendas(
  rows: PrecioUnitarioRow[],
  colorTienda: Map<string, string>
): FilaComparador[] {
  const ultimaPorTienda = new Map<string, PrecioUnitarioRow>();
  for (const row of rows) {
    if (!row.tienda_nombre || !row.fecha_compra || row.precio_por_unidad == null) continue;
    // Mismo motivo que en seriesPorTienda: agrupar por nombre+ubicación, no
    // solo por nombre.
    ultimaPorTienda.set(formatTiendaNombre(row.tienda_nombre, row.tienda_ubicacion), row);
  }

  return Array.from(ultimaPorTienda.entries())
    .map(([nombre, row]) => ({
      nombre,
      color: colorDe(colorTienda, nombre),
      precioPorUnidad: row.precio_por_unidad!,
      fecha: row.fecha_compra!,
    }))
    .sort((a, b) => a.precioPorUnidad - b.precioPorUnidad);
}

// ---------------------------------------------------------------------------
// 3) Resumen de gasto por período, agrupado por categoría o por tienda.
// ---------------------------------------------------------------------------

export type GastoItem = { label: string; total: number; color: string };

/**
 * El color de cada barra se resuelve acá, server-side, y viaja ya como
 * string dentro de `GastoItem` — SpendBarChart (Client Component) no puede
 * recibir `colorPorNombre` ni una función `colorDe` como prop (los Server
 * Components no pueden pasar funciones a Client Components a través del
 * límite RSC).
 */
export function gastoPorCampo(
  rows: Array<Pick<PrecioUnitarioRow, "categoria" | "tienda_nombre" | "precio_pagado">>,
  campo: "categoria" | "tienda_nombre",
  sinDato: string,
  colorPorNombre: Map<string, string>
): GastoItem[] {
  const totales = new Map<string, number>();
  for (const row of rows) {
    const key = row[campo] ?? sinDato;
    totales.set(key, (totales.get(key) ?? 0) + (row.precio_pagado ?? 0));
  }
  return Array.from(totales, ([label, total]) => ({
    label,
    total,
    color: colorDe(colorPorNombre, label),
  })).sort((a, b) => b.total - a.total);
}

export function totalGastado(rows: Array<Pick<PrecioUnitarioRow, "precio_pagado">>): number {
  return rows.reduce((acc, row) => acc + (row.precio_pagado ?? 0), 0);
}

// ---------------------------------------------------------------------------
// 4) Alerta: ¿el precio por unidad subió vs. la última compra registrada?
// ---------------------------------------------------------------------------

export type CambioPrecio =
  | { estado: "sin-datos" }
  | {
      estado: "sube" | "baja" | "igual";
      actual: number;
      anterior: number;
      deltaPct: number;
      fecha: string;
      tienda: string;
      fechaAnterior: string;
      tiendaAnterior: string;
    };

/** Compara las dos compras más recientes del producto (cualquier tienda) por precio_por_unidad. */
export function cambioDePrecio(rows: PrecioUnitarioRow[]): CambioPrecio {
  const validas = rows
    .filter((r) => r.precio_por_unidad != null && r.fecha_compra)
    .slice()
    .sort((a, b) => a.fecha_compra!.localeCompare(b.fecha_compra!));

  if (validas.length < 2) return { estado: "sin-datos" };

  const actual = validas[validas.length - 1];
  const anterior = validas[validas.length - 2];
  const precioActual = actual.precio_por_unidad!;
  const precioAnterior = anterior.precio_por_unidad!;
  const deltaPct = precioAnterior === 0 ? 0 : ((precioActual - precioAnterior) / precioAnterior) * 100;

  return {
    estado: precioActual > precioAnterior ? "sube" : precioActual < precioAnterior ? "baja" : "igual",
    actual: precioActual,
    anterior: precioAnterior,
    deltaPct,
    fecha: actual.fecha_compra!,
    tienda: formatTiendaNombre(actual.tienda_nombre, actual.tienda_ubicacion),
    fechaAnterior: anterior.fecha_compra!,
    tiendaAnterior: formatTiendaNombre(anterior.tienda_nombre, anterior.tienda_ubicacion),
  };
}
