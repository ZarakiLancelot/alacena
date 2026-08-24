"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { Combobox } from "@/components/compras/Combobox";
import { PresentacionField, type Presentacion } from "@/components/compras/PresentacionField";
import { DuplicadoBanner } from "@/components/compras/DuplicadoBanner";
import { SubmitButton } from "@/components/SubmitButton";
import { crearCompra } from "@/app/(dashboard)/compras/actions";
import { formatTiendaNombre, resolveCombo, today } from "@/lib/utils";
import { initialActionState } from "@/lib/types";

type Producto = { id: string; nombre: string; categoria: string | null; marca: string | null };
type Tienda = { id: string; nombre: string; ubicacion: string | null };
type Cadena = { id: string; nombre: string };

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
  cadenas,
}: {
  tiendas: Tienda[];
  productos: Producto[];
  presentaciones: Presentacion[];
  cadenas: Cadena[];
}) {
  const [state, formAction] = useActionState(crearCompra, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  const [tiendaText, setTiendaText] = useState("");
  const [productoText, setProductoText] = useState("");
  const [fechaCompra, setFechaCompra] = useState(today());

  const tiendaItems = useMemo(
    () => tiendas.map((t) => ({ id: t.id, label: formatTiendaNombre(t.nombre, t.ubicacion) })),
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

  const tiendaSelection = useMemo(
    () => resolveCombo(tiendaItems, tiendaText),
    [tiendaItems, tiendaText]
  );
  const tiendaIdExistente =
    tiendaSelection.type === "existing" ? tiendaSelection.id : null;

  // Patrón "ajustar estado durante el render" (no un efecto: evita el
  // set-state-in-effect lint) para vaciar los combobox controlados apenas
  // llega un nuevo resultado exitoso del action.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setTiendaText("");
      setProductoText("");
      setFechaCompra(today());
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

      {tiendaSelection.type === "new" ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Cadena (opcional)
            </label>
            <select
              name="tienda_cadena_id"
              defaultValue=""
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Sin cadena / tienda de barrio</option>
              {cadenas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Ubicación (opcional)
            </label>
            <input
              name="tienda_ubicacion"
              placeholder="Ej. Fraijanes"
              maxLength={120}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
      ) : null}

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
            value={fechaCompra}
            onChange={(e) => setFechaCompra(e.target.value)}
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

      <DuplicadoBanner
        tiendaId={tiendaIdExistente}
        tiendaNombre={tiendaText}
        fecha={fechaCompra}
      />

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
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <FiCheckCircle className="h-4 w-4 shrink-0" aria-hidden />
          Compra registrada
        </p>
      ) : null}

      <SubmitButton pendingLabel="Registrando…">Registrar compra</SubmitButton>
    </form>
  );
}
