"use client";

import { useActionState } from "react";
import { FiHome, FiUsers } from "react-icons/fi";
import { SubmitButton } from "@/components/SubmitButton";
import { crearHogar, unirseAHogar } from "@/app/onboarding/actions";
import { initialActionState } from "@/lib/types";

export function OnboardingForms() {
  const [crearState, crearAction] = useActionState(crearHogar, initialActionState);
  const [unirseState, unirseAction] = useActionState(unirseAHogar, initialActionState);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          <FiHome className="h-5 w-5" aria-hidden />
          Crear mi hogar
        </h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Vas a quedar como dueño y vas a poder invitar a otras personas con un
          código.
        </p>
        <form action={crearAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre" className="sr-only">
              Nombre del hogar
            </label>
            <input
              id="nombre"
              name="nombre"
              placeholder="Ej. Casa de Ana y Tomás"
              required
              maxLength={80}
              className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            {crearState.fieldErrors?.nombre?.map((msg) => (
              <p key={msg} className="text-sm text-red-600">
                {msg}
              </p>
            ))}
          </div>
          {crearState.error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {crearState.error}
            </p>
          ) : null}
          <SubmitButton pendingLabel="Creando…">Crear hogar</SubmitButton>
        </form>
      </section>

      <div className="flex items-center gap-3 text-xs font-medium text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        O
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          <FiUsers className="h-5 w-5" aria-hidden />
          Unirme con un código
        </h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Pedile el código de invitación a alguien que ya esté en el hogar.
        </p>
        <form action={unirseAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="codigo" className="sr-only">
              Código de invitación
            </label>
            <input
              id="codigo"
              name="codigo"
              placeholder="ABC123"
              required
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              className="rounded-lg border border-zinc-300 px-3 py-3 text-center text-lg font-medium uppercase
                tracking-[0.3em] focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            {unirseState.fieldErrors?.codigo?.map((msg) => (
              <p key={msg} className="text-sm text-red-600">
                {msg}
              </p>
            ))}
          </div>
          {unirseState.error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {unirseState.error}
            </p>
          ) : null}
          <SubmitButton
            pendingLabel="Uniéndome…"
            className="bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Unirme al hogar
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
