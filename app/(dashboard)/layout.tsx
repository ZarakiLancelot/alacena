import { NavBar } from "@/components/dashboard/NavBar";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { AlertasBanner } from "@/components/push/AlertasBanner";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          🥫 Alacena
        </span>
        <div className="flex items-center gap-3">
          {user?.email ? (
            <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
              {user.email}
            </span>
          ) : null}
          <LogoutButton />
        </div>
      </header>

      <AlertasBanner />

      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>

      <NavBar />
    </div>
  );
}
