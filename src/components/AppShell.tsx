import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { NavLink } from "./NavLink";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <Link href="/board" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm text-white">A</span>
            AppTrack
          </Link>
          <nav className="flex gap-1 text-sm">
            <NavLink href="/board">Board</NavLink>
            <NavLink href="/stats">Stats</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <a href="/api/export" className="btn-ghost hidden sm:inline-flex">Export CSV</a>
            <span className="hidden text-zinc-500 md:inline" data-testid="user-name">{user.name}</span>
            <form action={logout}>
              <button className="btn-ghost">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
