import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Board, type BoardCard } from "@/components/Board";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Board · AppTrack" };

export default async function BoardPage() {
  const user = await requireUser();
  const apps = await db.application.findMany({
    where: { userId: user.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, company: true, role: true, location: true, status: true, appliedAt: true, url: true },
  });
  const cards: BoardCard[] = apps.map((a) => ({ ...a, appliedAt: a.appliedAt?.toISOString() ?? null }));

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-zinc-500">
            {apps.length} total · drag cards between columns to update their status
          </p>
        </div>
        <Link href="/applications/new" className="btn-primary">
          + Add application
        </Link>
      </div>
      <Board initial={cards} />
    </AppShell>
  );
}
