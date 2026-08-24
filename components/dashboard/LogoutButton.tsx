import { logout } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="cursor-pointer text-sm font-medium text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        Salir
      </button>
    </form>
  );
}
