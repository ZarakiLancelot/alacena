import Link from "next/link";
import { FiArrowLeft, FiUser } from "react-icons/fi";
import { createClient } from "@/lib/supabase/server";
import { getHogarIdActual } from "@/lib/supabase/hogar";
import { CodigoInvitacion } from "@/components/hogar/CodigoInvitacion";
import { RegenerarCodigoForm } from "@/components/hogar/RegenerarCodigoForm";
import { EditarNombreHogarForm } from "@/components/hogar/EditarNombreHogarForm";
import { formatDate } from "@/lib/utils";

export default async function AjustesHogarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // El proxy ya garantiza que quien llega hasta acá tiene hogar (ver
  // lib/supabase/middleware.ts, gating de onboarding).
  const hogarId = await getHogarIdActual(supabase, user.id);
  if (!hogarId) throw new Error("Tu cuenta todavía no pertenece a ningún hogar.");

  const [{ data: hogar }, { data: miembros }] = await Promise.all([
    supabase.from("hogares").select("id, nombre, codigo_invitacion").eq("id", hogarId).single(),
    supabase
      .from("hogar_miembros")
      .select("id, user_id, rol, joined_at")
      .eq("hogar_id", hogarId)
      .order("joined_at", { ascending: true }),
  ]);

  if (!hogar) throw new Error("No se pudo cargar el hogar.");

  const soyOwner =
    miembros?.some((m) => m.user_id === user.id && m.rol === "owner") ?? false;

  // profiles: RLS (comparte_hogar_con) ya limita esto a "el propio + quien
  // comparta un hogar conmigo" (ver supabase/README.md, sección "Profiles"),
  // así que no hace falta filtrar de nuevo acá — el .in solo evita traer de
  // más si el usuario está en otros hogares además de este.
  const userIds = (miembros ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, nombre_completo").in("id", userIds)
    : { data: [] };
  const nombresPorUsuario = new Map(
    (profiles ?? []).map((p) => [p.id, p.nombre_completo])
  );

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

      {soyOwner ? (
        <EditarNombreHogarForm hogarId={hogar.id} nombreActual={hogar.nombre} />
      ) : (
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {hogar.nombre}
        </h1>
      )}

      <CodigoInvitacion codigo={hogar.codigo_invitacion} hogarNombre={hogar.nombre} />

      {soyOwner ? <RegenerarCodigoForm hogarId={hogar.id} /> : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Miembros ({miembros?.length ?? 0})
        </h2>
        <ul className="flex flex-col gap-2">
          {(miembros ?? []).map((miembro) => {
            const esVos = miembro.user_id === user.id;
            const rolFallback = miembro.rol === "owner" ? "Dueño" : "Miembro";
            const nombre = nombresPorUsuario.get(miembro.user_id) || rolFallback;
            return (
              <li
                key={miembro.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3
                  dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <FiUser className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {nombre}
                    {esVos ? " (vos)" : ""}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Desde {formatDate(miembro.joined_at.slice(0, 10))}
                  </p>
                </div>
                <span
                  className={
                    miembro.rol === "owner"
                      ? "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                  }
                >
                  {miembro.rol === "owner" ? "Dueño" : "Miembro"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
