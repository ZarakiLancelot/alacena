import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

const UNIQUE_VIOLATION = "23505";

/**
 * Helpers "get or create" para el catálogo compartido (tiendas, productos,
 * presentaciones). Usados por los Server Actions de app/(dashboard)/compras.
 *
 * tiendas/productos/presentaciones tienen índices únicos por nombre
 * normalizado (ver supabase/migrations). Si dos usuarios crean "Coto" al
 * mismo tiempo, el insert de uno falla por violación de unicidad (23505) y
 * en ese caso se busca y reusa la fila que ya quedó insertada, en vez de
 * fallar la compra completa.
 */

export async function getOrCreateTienda(
  supabase: Client,
  nombre: string
): Promise<string> {
  const trimmed = nombre.trim();

  const { data, error } = await supabase
    .from("tiendas")
    .insert({ nombre: trimmed })
    .select("id")
    .single();

  if (!error) return data.id;
  if (error.code !== UNIQUE_VIOLATION) {
    throw new Error(`No se pudo crear la tienda "${trimmed}": ${error.message}`);
  }

  const { data: existing, error: findError } = await supabase
    .from("tiendas")
    .select("id")
    .ilike("nombre", trimmed)
    .limit(1)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error(`No se pudo crear ni encontrar la tienda "${trimmed}".`);
  }
  return existing.id;
}

export async function getOrCreateProducto(
  supabase: Client,
  nombre: string,
  categoria?: string,
  marca?: string
): Promise<string> {
  const trimmed = nombre.trim();
  const categoriaValue = categoria?.trim() || null;
  const marcaValue = marca?.trim() || null;

  const { data, error } = await supabase
    .from("productos")
    .insert({ nombre: trimmed, categoria: categoriaValue, marca: marcaValue })
    .select("id")
    .single();

  if (!error) return data.id;
  if (error.code !== UNIQUE_VIOLATION) {
    throw new Error(`No se pudo crear el producto "${trimmed}": ${error.message}`);
  }

  let query = supabase.from("productos").select("id").ilike("nombre", trimmed);
  query = marcaValue ? query.ilike("marca", marcaValue) : query.is("marca", null);

  const { data: existing, error: findError } = await query.limit(1).maybeSingle();

  if (findError || !existing) {
    throw new Error(`No se pudo crear ni encontrar el producto "${trimmed}".`);
  }
  return existing.id;
}

export async function getOrCreatePresentacion(
  supabase: Client,
  productoId: string,
  tamano: number,
  unidad: string
): Promise<string> {
  const unidadTrimmed = unidad.trim();

  const { data, error } = await supabase
    .from("presentaciones")
    .insert({ producto_id: productoId, tamaño: tamano, unidad: unidadTrimmed })
    .select("id")
    .single();

  if (!error) return data.id;
  if (error.code !== UNIQUE_VIOLATION) {
    throw new Error(`No se pudo crear la presentación: ${error.message}`);
  }

  const { data: existing, error: findError } = await supabase
    .from("presentaciones")
    .select("id")
    .eq("producto_id", productoId)
    .eq("tamaño", tamano)
    .ilike("unidad", unidadTrimmed)
    .limit(1)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error("No se pudo crear ni encontrar la presentación.");
  }
  return existing.id;
}
