"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validations";
import { getSiteUrl } from "@/lib/site-url";
import type { ActionState } from "@/lib/types";

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/inventario");
}

export async function signup(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    // Sin esto, Supabase usa el "Site URL" configurado en su dashboard para
    // el link del email de confirmación — que en proyectos creados/probados
    // en local suele quedar en http://localhost:3000 (ver lib/site-url.ts).
    options: siteUrl ? { emailRedirectTo: `${siteUrl}/login` } : undefined,
  });

  if (error) {
    return { error: error.message };
  }

  // Si el proyecto tiene confirmación de email activada, `session` viene null.
  if (!data.session) {
    return {
      success: true,
      error: "Te enviamos un email de confirmación. Revisá tu bandeja de entrada.",
    };
  }

  redirect("/inventario");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
