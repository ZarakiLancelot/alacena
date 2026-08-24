"use client";

import { useId, useMemo } from "react";
import { encodeCombo, resolveCombo } from "@/lib/utils";

export type ComboItem = { id: string; label: string };

/**
 * Input de autocomplete/crear: usa <datalist> nativo (funciona bien en
 * mobile sin JS extra) y resuelve el texto tipeado contra `items`. Si no
 * matchea ninguno existente, se interpreta como "crear nuevo" y el input
 * hidden manda `new:<texto>` para que el Server Action lo cree.
 */
export function Combobox({
  label,
  name,
  items,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  items: ComboItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const listId = useId();
  const selection = useMemo(() => resolveCombo(items, value), [items, value]);
  const hiddenValue = encodeCombo(selection);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
      />
      <datalist id={listId}>
        {items.map((item) => (
          <option key={item.id} value={item.label} />
        ))}
      </datalist>
      <input type="hidden" name={name} value={hiddenValue} />
      {selection.type === "new" ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Se creará nuevo: &ldquo;{selection.label}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
