"use client";

import { useActionState, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { SubmitButton } from "@/components/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/types";

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "signup";
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  next?: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        {state.fieldErrors?.email?.map((msg) => (
          <p key={msg} className="text-sm text-red-600">
            {msg}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={mostrarPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            className="w-full rounded-lg border border-zinc-300 px-3 py-3 pr-11 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => setMostrarPassword((v) => !v)}
            aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={mostrarPassword}
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            {mostrarPassword ? (
              <FiEyeOff className="h-5 w-5" aria-hidden />
            ) : (
              <FiEye className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        {state.fieldErrors?.password?.map((msg) => (
          <p key={msg} className="text-sm text-red-600">
            {msg}
          </p>
        ))}
      </div>

      {state.error ? (
        <p
          className={
            state.success
              ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          }
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton>{mode === "login" ? "Ingresar" : "Crear cuenta"}</SubmitButton>
    </form>
  );
}
