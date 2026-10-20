import { notFound } from "next/navigation";
import { deleteApplication, updateApplication } from "@/app/actions/applications";
import { AppShell } from "@/components/AppShell";
import { ApplicationForm } from "@/components/ApplicationForm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/status";

export const metadata = { title: "Edit application · AppTrack" };

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // Scoped by user: another user's id is indistinguishable from a missing one.
  const app = await db.application.findFirst({
    where: { id, userId: user.id },
    include: { events: { orderBy: { at: "asc" } } },
  });
  if (!app) notFound();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{app.company}</h1>
          <form action={deleteApplication.bind(null, app.id)}>
            <button className="btn-danger">Delete</button>
          </form>
        </div>
        <ApplicationForm
          action={updateApplication.bind(null, app.id)}
          submitLabel="Save changes"
          defaults={{ ...app, appliedAt: app.appliedAt?.toISOString().slice(0, 10) ?? null }}
        />
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-500">History</h2>
          <ol className="space-y-2 border-l border-zinc-200 pl-4 text-sm dark:border-zinc-800">
            {app.events.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.from ? `${STATUS_LABEL[e.from]} → ${STATUS_LABEL[e.to]}` : `Created as ${STATUS_LABEL[e.to]}`}</span>
                <span className="ml-2 text-zinc-400">{e.at.toLocaleDateString("en-CA")}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
