"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@/components/compras/Combobox";
import { PresentacionField, type Presentacion } from "@/components/compras/PresentacionField";
import { SubmitButton } from "@/components/SubmitButton";
import { crearCompra } from "@/app/(dashboard)/compras/actions";
import { resolveCombo, today } from "@/lib/utils";
import { initialActionState } from "@/lib/types";

type Producto = { id: string; nombre: string; categoria: string | null; marca: string | null };
type Tienda = { id: string; nombre: string };

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <>
      {errors.map((msg) => (
        <p key={msg} className="text-sm text-red-600">
          {msg}
        </p>
      ))}
    </>
  );
}

export function NuevaCompraForm({
  tiendas,
  productos,
  presentaciones,
}: {
  tiendas: Tienda[];
  productos: Producto[];
  presentaciones: Presentacion[];
}) {
  const [state, formAction] = useActionState(crearCompra, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  const [tiendaText, setTiendaText] = useState("");
  const [productoText, setProductoText] = useState("");

  const tiendaItems = useMemo(
    () => tiendas.map((t) => ({ id: t.id, label: t.nombre })),
    [tiendas]
  );
  const productoItems = useMemo(
    () => productos.map((p) => ({ id: p.id, label: p.nombre })),
    [productos]
  );

  const productoSelection = useMemo(
    () => resolveCombo(productoItems, productoText),
    [productoItems, productoText]
  );
  const productoIdExistente =
    productoSelection.type === "existing" ? productoSelection.id : null;

  // Patrón "ajustar estado durante el render" (no un efecto: evita el
  // set-state-in-effect lint) para vaciar los combobox controlados apenas
  // llega un nuevo resultado exitoso del action.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setTiendaText("");
      setProductoText("");
    }
  }

  // El reset del <form> nativo (inputs no controlados: precio, fechas,
  // cantidad, tamaño/unidad) sí es un efecto legítimo: sincroniza con el DOM.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <Combobox
        label="Tienda"
        name="tienda"
        items={tiendaItems}
        value={tiendaText}
        onChange={setTiendaText}
        placeholder="Ej. Coto, Carrefour…"
        required
      />
      <FieldErrors errors={state.fieldErrors?.tienda} />

      <Combobox
        label="Producto"
        name="producto"
        items={productoItems}
        value={productoText}
        onChange={setProductoText}
        placeholder="Ej. Leche entera La Serenísima"
        required
      />
      <FieldErrors errors={state.fieldErrors?.producto} />

      {productoSelection.type === "new" ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Categoría (opcional)
            </label>
            <input
              name="producto_categoria"
              placeholder="Ej. Lácteos"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Marca (opcional)
            </label>
            <input
              name="producto_marca"
              placeholder="Ej. La Serenísima"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
      ) : null}

      <PresentacionField
        key={productoIdExistente ?? "new"}
        presentaciones={presentaciones}
        productoId={productoIdExistente}
      />
      <FieldErrors errors={state.fieldErrors?.presentacion_tamano} />
      <FieldErrors errors={state.fieldErrors?.presentacion_unidad} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Precio normal
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            name="precio_normal"
            required
            className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldErrors errors={state.fieldErrors?.precio_normal} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Precio oferta
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            name="precio_oferta"
            placeholder="Opcional"
            className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldErrors errors={state.fieldErrors?.precio_oferta} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fecha de compra
          </label>
          <input
            type="date"
            name="fecha_compra"
            defaultValue={today()}
            required
            className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldErrors errors={state.fieldErrors?.fecha_compra} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Vencimiento
          </label>
          <input
            type="date"
            name="fecha_vencimiento"
            placeholder="Opcional"
            className="rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldErrors errors={state.fieldErrors?.fecha_vencimiento} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Cantidad
        </label>
        <input
          type="number"
          step="any"
          min="0.01"
          inputMode="decimal"
          name="cantidad"
          defaultValue={1}
          required
          className="w-32 rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldErrors errors={state.fieldErrors?.cantidad} />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Compra registrada ✅
        </p>
      ) : null}

      <SubmitButton pendingLabel="Registrando…">Registrar compra</SubmitButton>
    </form>
  );
}
