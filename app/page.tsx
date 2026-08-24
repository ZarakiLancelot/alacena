import { redirect } from "next/navigation";

// `proxy.ts` ya redirige "/" a /inventario (con sesión) o /login (sin
// sesión); este redirect es una capa defensiva por si esta página se
// renderiza igual.
export default function RootPage() {
  redirect("/inventario");
}
