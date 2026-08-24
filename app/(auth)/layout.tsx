import { FiArchive } from "react-icons/fi";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 flex items-center justify-center gap-2 text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          <FiArchive className="h-6 w-6" aria-hidden />
          Alacena
        </h1>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {children}
        </div>
      </div>
    </div>
  );
}
