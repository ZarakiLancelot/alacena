"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBarChart2, FiPackage, FiSettings, FiShoppingCart, FiTrendingUp } from "react-icons/fi";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; Icon: IconType }[] = [
  { href: "/inventario", label: "Inventario", Icon: FiPackage },
  { href: "/compras", label: "Nueva compra", Icon: FiShoppingCart },
  { href: "/historial", label: "Historial", Icon: FiBarChart2 },
  { href: "/analytics", label: "Analytics", Icon: FiTrendingUp },
  { href: "/ajustes", label: "Ajustes", Icon: FiSettings },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-10 flex border-t border-zinc-200 bg-white/95 backdrop-blur
        dark:border-zinc-800 dark:bg-zinc-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
              active
                ? "text-emerald-600"
                : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
