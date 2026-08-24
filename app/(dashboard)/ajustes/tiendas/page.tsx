import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { createClient } from "@/lib/supabase/server";
import { EditarTiendaForm } from "@/components/tiendas/EditarTiendaForm";

export default async function AjustesTiendasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [{ data: tiendas }, { data: cadenas }] = await Promise.all([
    supabase
      .from("tiendas")
      .select("id, nombre, cadena_id, ubicacion, created_by")
      .order("nombre"),
    supabase.from("cadenas").select("id, nombre, created_by").order("nombre"),
  ]);

  const cadenaItems = (cadenas ?? []).map((c) => ({ id: c.id, nombre: c.nombre }));
  const nombreCadena = (id: string | null) =>
    id ? (cadenaItems.find((c) => c.id === id)?.nombre ?? "—") : "Sin cadena";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-6">
      <div className="flex items-center gap-2">
        <Link
          href="/ajustes"
          className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400"
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden />
          Ajustes
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tiendas</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Catálogo compartido ({tiendas?.length ?? 0})
        </h2>
        {!tiendas || tiendas.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no hay tiendas cargadas.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tiendas.map((tienda) => (
              <li
                key={tienda.id}
                className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">
                  {tienda.nombre}
                </p>
                {tienda.created_by === user.id ? (
                  <EditarTiendaForm
                    tiendaId={tienda.id}
                    cadenaId={tienda.cadena_id}
                    ubicacion={tienda.ubicacion}
                    cadenas={cadenaItems}
                  />
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {nombreCadena(tienda.cadena_id)}
                    {tienda.ubicacion ? ` — ${tienda.ubicacion}` : ""}
                    <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                      (solo quien la creó puede editarla)
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Cadenas conocidas ({cadenas?.length ?? 0})
        </h2>
        <ul className="flex flex-wrap gap-2">
          {(cadenas ?? []).map((c) => (
            <li
              key={c.id}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              {c.nombre}
            </li>
          ))}
        </ul>
        <p className="px-1 text-xs text-zinc-400 dark:text-zinc-500">
          Catálogo compartido de referencia, usado para agrupar sucursales de
          una misma cadena. Las cadenas sembradas por la app no se pueden
          editar desde acá.
        </p>
      </section>
    </div>
  );
}
