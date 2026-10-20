import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeStats } from "@/lib/stats";
import { STATUS_DOT, STATUS_LABEL, STATUSES } from "@/lib/status";

export const metadata = { title: "Stats · AppTrack" };

const pct = (x: number | null) => (x === null ? "–" : `${Math.round(x * 100)}%`);

export default async function StatsPage() {
  const user = await requireUser();
  const [apps, events] = await Promise.all([
    db.application.findMany({ where: { userId: user.id }, select: { id: true, status: true, appliedAt: true, createdAt: true } }),
    db.statusEvent.findMany({
      where: { application: { userId: user.id } },
      select: { applicationId: true, to: true, at: true },
    }),
  ]);
  const s = computeStats(apps, events);
  const funnel = [
    { label: "Applied", value: s.submitted },
    { label: "Heard back", value: s.responded },
    { label: "Interviewed", value: s.interviewed },
    { label: "Offers", value: s.offers },
  ];
  const maxWeek = Math.max(1, ...s.weekly.map((w) => w.count));

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Pipeline stats</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Applications sent" value={String(s.submitted)} sub={`${s.byStatus.WISHLIST} on wishlist`} testId="kpi-sent" />
        <Kpi label="Response rate" value={pct(s.responseRate)} sub={`${s.responded} heard back`} testId="kpi-response" />
        <Kpi label="Interview rate" value={pct(s.interviewRate)} sub={`${s.interviewed} reached interviews`} testId="kpi-interview" />
        <Kpi
          label="Median time to response"
          value={s.medianDaysToResponse === null ? "–" : `${Math.round(s.medianDaysToResponse)}d`}
          sub="from application date"
          testId="kpi-median"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 font-medium">Funnel</h2>
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="tabular-nums text-zinc-500">{f.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2.5 rounded-full bg-accent"
                    style={{ width: `${s.submitted ? (f.value / s.submitted) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-medium">Applications per week</h2>
          <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Applications sent per week, last 12 weeks">
            {s.weekly.map((w) => (
              <div key={w.weekStart} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[10px] tabular-nums text-zinc-400 opacity-0 group-hover:opacity-100">{w.count}</span>
                <div
                  className="w-full rounded-t bg-accent/80 transition group-hover:bg-accent"
                  style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count ? 4 : 0 }}
                  title={`Week of ${w.weekStart}: ${w.count}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-zinc-400">
            <span>{s.weekly[0]?.weekStart}</span>
            <span>this week</span>
          </div>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-medium">By status</h2>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((st) => (
            <div key={st} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st]}`} />
              {STATUS_LABEL[st]}
              <span className="font-semibold tabular-nums">{s.byStatus[st]}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Kpi({ label, value, sub, testId }: { label: string; value: string; sub: string; testId: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums" data-testid={testId}>{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{sub}</p>
    </div>
  );
}
