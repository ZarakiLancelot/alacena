"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white transition-colors",
        "active:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {pending ? (pendingLabel ?? "Guardando…") : children}
    </button>
  );
}
