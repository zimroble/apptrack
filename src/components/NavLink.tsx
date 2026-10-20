"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 transition ${
        active
          ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
