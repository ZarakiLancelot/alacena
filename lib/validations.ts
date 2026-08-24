import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;
const emptyToNaN = (v: unknown) => (v === "" || v === null ? NaN : v);

export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresá tu email")
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Ingresá un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type AuthFormValues = z.infer<typeof authSchema>;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (usá el selector de fecha)");

export const compraSchema = z
  .object({
    tienda: z.string().trim().min(1, "Elegí o creá una tienda"),
    producto: z.string().trim().min(1, "Elegí o creá un producto"),
    producto_categoria: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(80).optional()
    ),
    producto_marca: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(80).optional()
    ),
    presentacion_id: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional()
    ),
    presentacion_tamano: z.preprocess(
      emptyToUndefined,
      z.coerce.number().positive("El tamaño debe ser mayor a 0").optional()
    ),
    presentacion_unidad: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(20).optional()
    ),
    precio_normal: z.preprocess(
      emptyToNaN,
      z.coerce.number().nonnegative("El precio no puede ser negativo")
    ),
    precio_oferta: z.preprocess(
      emptyToUndefined,
      z.coerce.number().nonnegative("El precio no puede ser negativo").optional()
    ),
    fecha_compra: dateString,
    fecha_vencimiento: z.preprocess(emptyToUndefined, dateString.optional()),
    cantidad: z.preprocess(
      emptyToNaN,
      z.coerce.number().positive("La cantidad debe ser mayor a 0")
    ),
  })
  .superRefine((data, ctx) => {
    if (!data.presentacion_id) {
      if (!data.presentacion_tamano) {
        ctx.addIssue({
          code: "custom",
          path: ["presentacion_tamano"],
          message: "Ingresá el tamaño de la presentación",
        });
      }
      if (!data.presentacion_unidad) {
        ctx.addIssue({
          code: "custom",
          path: ["presentacion_unidad"],
          message: "Ingresá la unidad (ej. L, kg, unidad)",
        });
      }
    }
    if (
      data.precio_oferta !== undefined &&
      data.precio_oferta > data.precio_normal
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["precio_oferta"],
        message: "No puede ser mayor al precio normal",
      });
    }
  });

export type CompraFormValues = z.infer<typeof compraSchema>;
