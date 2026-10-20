import type { Status } from "@prisma/client";
import { RESPONDED, STATUSES } from "./status";

export interface StatApp {
  id: string;
  status: Status;
  appliedAt: Date | null;
  createdAt: Date;
}

export interface StatEvent {
  applicationId: string;
  to: Status;
  at: Date;
}

export interface PipelineStats {
  total: number;
  byStatus: Record<Status, number>;
  submitted: number;
  responded: number;
  interviewed: number;
  offers: number;
  responseRate: number | null;
  interviewRate: number | null;
  medianDaysToResponse: number | null;
  weekly: { weekStart: string; count: number }[];
}

const DAY = 86_400_000;

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Monday 00:00 UTC of the week containing `d`. */
export function weekStart(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

/**
 * Pipeline analytics from current statuses plus the status-change history.
 * "Reached" counts use history, so an application that was interviewed and then
 * rejected still counts as interviewed.
 */
export function computeStats(apps: StatApp[], events: StatEvent[], now = new Date(), weeks = 12): PipelineStats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const reached = new Map<string, Set<Status>>();
  const firstResponse = new Map<string, Date>();

  for (const a of apps) {
    byStatus[a.status]++;
    reached.set(a.id, new Set([a.status]));
  }
  for (const e of [...events].sort((x, y) => x.at.getTime() - y.at.getTime())) {
    reached.get(e.applicationId)?.add(e.to);
    if (RESPONDED.has(e.to) && !firstResponse.has(e.applicationId)) firstResponse.set(e.applicationId, e.at);
  }

  const submittedApps = apps.filter((a) => a.status !== "WISHLIST" || a.appliedAt !== null);
  const hit = (a: StatApp, ss: Status[]) => ss.some((s) => reached.get(a.id)!.has(s));
  const responded = submittedApps.filter((a) => hit(a, [...RESPONDED])).length;
  const interviewed = submittedApps.filter((a) => hit(a, ["INTERVIEW", "OFFER"])).length;
  const offers = submittedApps.filter((a) => hit(a, ["OFFER"])).length;

  const delays: number[] = [];
  for (const a of submittedApps) {
    const r = firstResponse.get(a.id);
    if (a.appliedAt && r && r >= a.appliedAt) delays.push((r.getTime() - a.appliedAt.getTime()) / DAY);
  }

  const thisWeek = weekStart(now).getTime();
  const weekly = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(thisWeek - (weeks - 1 - i) * 7 * DAY).toISOString().slice(0, 10),
    count: 0,
  }));
  for (const a of submittedApps) {
    const when = a.appliedAt ?? a.createdAt;
    const idx = weeks - 1 - Math.round((thisWeek - weekStart(when).getTime()) / (7 * DAY));
    if (idx >= 0 && idx < weeks) weekly[idx].count++;
  }

  const n = submittedApps.length;
  return {
    total: apps.length,
    byStatus,
    submitted: n,
    responded,
    interviewed,
    offers,
    responseRate: n ? responded / n : null,
    interviewRate: n ? interviewed / n : null,
    medianDaysToResponse: median(delays),
    weekly,
  };
}
