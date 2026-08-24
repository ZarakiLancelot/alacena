"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/inventario", label: "Inventario", icon: "📦" },
  { href: "/compras", label: "Nueva compra", icon: "🧾" },
  { href: "/historial", label: "Historial", icon: "📊" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/ajustes", label: "Ajustes", icon: "⚙️" },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-10 flex border-t border-zinc-200 bg-white/95 backdrop-blur
        dark:border-zinc-800 dark:bg-zinc-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
              active
                ? "text-emerald-600"
                : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <span className="text-xl leading-none">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
