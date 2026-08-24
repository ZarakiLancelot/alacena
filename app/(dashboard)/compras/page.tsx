import { NuevaCompraForm } from "@/components/compras/NuevaCompraForm";
import { createClient } from "@/lib/supabase/server";

export default async function ComprasPage() {
  const supabase = await createClient();

  const [{ data: tiendas }, { data: productos }, { data: presentaciones }] =
    await Promise.all([
      supabase.from("tiendas").select("id, nombre").order("nombre"),
      supabase
        .from("productos")
        .select("id, nombre, categoria, marca")
        .order("nombre"),
      // Alias ASCII + columna entre comillas: el parser de tipos de
      // supabase-js no reconoce la "ñ" de `tamaño` como identificador salvo
      // que vaya citada.
      supabase
        .from("presentaciones")
        .select('id, producto_id, tamano:"tamaño", unidad')
        .order("tamaño"),
    ]);

  return (
    <div className="mx-auto max-w-lg pb-6">
      <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Registrar compra
      </h1>
      <NuevaCompraForm
        tiendas={tiendas ?? []}
        productos={productos ?? []}
        presentaciones={presentaciones ?? []}
      />
    </div>
  );
}
