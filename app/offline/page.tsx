// Fallback offline básico (requisito 3). El service worker (app/sw.ts) sirve esta
// página cuando una navegación falla por falta de red y no hay nada cacheado para
// esa URL. Se precachea explícitamente en app/serwist/[path]/route.ts porque, al no
// ser un asset del build de Next, `defaultCache` no la agregaría sola.
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-4xl">📡</span>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Sin conexión
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No pudimos cargar esta página porque no hay internet. Las páginas que ya
        visitaste siguen disponibles offline; volvé a intentar cuando recuperes
        señal.
      </p>
    </div>
  );
}
