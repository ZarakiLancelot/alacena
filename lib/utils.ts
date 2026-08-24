export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const currencyFormatter = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return currencyFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** Formatea una fecha `date` de Postgres (YYYY-MM-DD) sin desfasarla por timezone. */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

/** Fecha de hoy en formato YYYY-MM-DD, para valores por defecto de inputs date. */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Días entre hoy y `fechaVencimiento` (negativo si ya venció). Null si no hay fecha. */
export function diasParaVencer(fechaVencimiento: string | null | undefined) {
  if (!fechaVencimiento) return null;
  const hoyUTC = Date.UTC(...dateParts(today()));
  const vencUTC = Date.UTC(...dateParts(fechaVencimiento));
  return Math.round((vencUTC - hoyUTC) / (1000 * 60 * 60 * 24));
}

function dateParts(value: string): [number, number, number] {
  const [y, m, d] = value.split("-").map(Number);
  return [y, m - 1, d];
}

/**
 * "PriceSmart — Fraijanes" si la tienda tiene ubicación cargada, si no solo
 * el nombre. Varias sucursales de una misma cadena pueden compartir nombre
 * (ver supabase/migrations/20260823180000_cadenas.sql), así que en
 * cualquier lugar donde se liste/compare por tienda conviene mostrar (y
 * agrupar) por este combinado, no solo por `nombre`.
 */
export function formatTiendaNombre(
  nombre: string | null | undefined,
  ubicacion?: string | null
): string {
  if (!nombre) return "—";
  return ubicacion ? `${nombre} — ${ubicacion}` : nombre;
}

export type ComboSelection =
  | { type: "existing"; id: string; label: string }
  | { type: "new"; label: string }
  | { type: "empty" };

/**
 * Resuelve el texto libre de un combobox (autocomplete/crear) contra una
 * lista de opciones existentes, por coincidencia exacta de label
 * (case-insensitive). Si no matchea ninguna, se interpreta como "crear nueva".
 */
export function resolveCombo(
  items: Array<{ id: string; label: string }>,
  text: string
): ComboSelection {
  const trimmed = text.trim();
  if (!trimmed) return { type: "empty" };
  const match = items.find(
    (item) => item.label.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return { type: "existing", id: match.id, label: match.label };
  return { type: "new", label: trimmed };
}

/** Codifica una ComboSelection al string que viaja en el input hidden del form. */
export function encodeCombo(selection: ComboSelection): string {
  if (selection.type === "existing") return selection.id;
  if (selection.type === "new") return `new:${selection.label}`;
  return "";
}

/** Inverso de encodeCombo: separa "new:<nombre>" de un id existente. */
export function decodeCombo(value: string): { id: string } | { nombre: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("new:")) {
    const nombre = trimmed.slice(4).trim();
    return nombre ? { nombre } : null;
  }
  return { id: trimmed };
}
