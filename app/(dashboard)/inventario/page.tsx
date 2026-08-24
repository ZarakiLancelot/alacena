import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ExpiryBadge } from "@/components/inventario/ExpiryBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { consumirCompra } from "@/app/(dashboard)/inventario/actions";
import { formatDate } from "@/lib/utils";

type CompraPendiente = {
  id: string;
  cantidad: number;
  fecha_compra: string;
  fecha_vencimiento: string | null;
  presentaciones: {
    tamaño: number;
    unidad: string;
    productos: {
      id: string;
      nombre: string;
      categoria: string | null;
      marca: string | null;
    } | null;
  } | null;
  tiendas: { nombre: string } | null;
};

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [{ data: comprasRaw }, { data: productosCategorias }, { data: alertaConfig }] =
    await Promise.all([
      supabase
        .from("compras")
        .select(
          "id, cantidad, fecha_compra, fecha_vencimiento, presentaciones(tamaño, unidad, productos(id, nombre, categoria, marca)), tiendas(nombre)"
        )
        .eq("consumido", false)
        .order("fecha_vencimiento", { ascending: true, nullsFirst: false }),
      supabase.from("productos").select("categoria").not("categoria", "is", null),
      // Desde supabase/migrations/20260823160300, alertas_config es visible
      // para todo el hogar (no solo para su dueño): sin el .eq acá, un hogar
      // con 2+ integrantes que configuraron sus alertas devolvería más de
      // una fila y .maybeSingle() lanzaría un error. El umbral que se
      // muestra en esta pantalla sigue siendo el propio del usuario logueado.
      supabase.from("alertas_config").select("dias_antes").eq("user_id", user.id).maybeSingle(),
    ]);

  const compras = (comprasRaw ?? []) as unknown as CompraPendiente[];
  const diasAntes = alertaConfig?.dias_antes ?? 3;

  const categorias = Array.from(
    new Set((productosCategorias ?? []).map((p) => p.categoria).filter(Boolean))
  ).sort() as string[];

  const items = categoria
    ? compras.filter((c) => c.presentaciones?.productos?.categoria === categoria)
    : compras;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Inventario
        </h1>
        <Link href="/compras" className="text-sm font-medium text-emerald-600">
          + Nueva compra
        </Link>
      </div>

      {categorias.length > 0 ? (
        <form method="get" className="flex gap-2">
          <select
            name="categoria"
            defaultValue={categoria ?? ""}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Filtrar
          </button>
        </form>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No hay productos en stock{categoria ? " en esta categoría" : ""}.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((compra) => {
            const producto = compra.presentaciones?.productos;
            return (
              <li
                key={compra.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {producto?.nombre ?? "Producto"}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {compra.presentaciones?.tamaño} {compra.presentaciones?.unidad} ·
                    {" "}
                    {compra.cantidad} u. · {compra.tiendas?.nombre}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Comprado {formatDate(compra.fecha_compra)}
                  </p>
                  <div className="mt-1">
                    <ExpiryBadge
                      fechaVencimiento={compra.fecha_vencimiento}
                      diasAntes={diasAntes}
                    />
                  </div>
                </div>
                <form action={consumirCompra.bind(null, compra.id)}>
                  <SubmitButton
                    pendingLabel="…"
                    className="w-auto whitespace-nowrap bg-zinc-800 px-3 py-2 text-sm dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Consumir
                  </SubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
