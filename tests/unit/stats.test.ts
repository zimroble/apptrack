import { describe, expect, it } from "vitest";
import { computeStats, weekStart, type StatApp, type StatEvent } from "@/lib/stats";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const NOW = d("2026-10-20"); // a Tuesday

describe("weekStart", () => {
  it("returns Monday 00:00 UTC", () => {
    expect(weekStart(d("2026-10-20")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(weekStart(d("2026-10-25")).toISOString()).toBe("2026-10-19T00:00:00.000Z"); // Sunday
    expect(weekStart(d("2026-10-19")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });
});

describe("computeStats", () => {
  const apps: StatApp[] = [
    { id: "w", status: "WISHLIST", appliedAt: null, createdAt: d("2026-10-01") },
    { id: "a", status: "APPLIED", appliedAt: d("2026-10-01"), createdAt: d("2026-10-01") },
    { id: "r", status: "REJECTED", appliedAt: d("2026-10-01"), createdAt: d("2026-10-01") },
    { id: "i", status: "REJECTED", appliedAt: d("2026-09-20"), createdAt: d("2026-09-20") }, // interviewed, then rejected
    { id: "o", status: "OFFER", appliedAt: d("2026-09-10"), createdAt: d("2026-09-10") },
  ];
  const events: StatEvent[] = [
    { applicationId: "r", to: "REJECTED", at: d("2026-10-05") }, // 4 days
    { applicationId: "i", to: "INTERVIEW", at: d("2026-09-30") }, // 10 days
    { applicationId: "i", to: "REJECTED", at: d("2026-10-10") },
    { applicationId: "o", to: "ASSESSMENT", at: d("2026-09-16") }, // 6 days
    { applicationId: "o", to: "INTERVIEW", at: d("2026-09-25") },
    { applicationId: "o", to: "OFFER", at: d("2026-10-08") },
  ];
  const s = computeStats(apps, events, NOW);

  it("counts current statuses", () => {
    expect(s.total).toBe(5);
    expect(s.byStatus.REJECTED).toBe(2);
    expect(s.byStatus.WISHLIST).toBe(1);
  });

  it("uses history for the funnel", () => {
    expect(s.submitted).toBe(4);
    expect(s.responded).toBe(3);
    expect(s.interviewed).toBe(2); // "i" counts even though it ended rejected
    expect(s.offers).toBe(1);
    expect(s.responseRate).toBe(0.75);
    expect(s.interviewRate).toBe(0.5);
  });

  it("computes median days to first response", () => {
    expect(s.medianDaysToResponse).toBe(6); // median of 4, 6, 10
  });

  it("buckets applications per week, oldest first", () => {
    expect(s.weekly).toHaveLength(12);
    expect(s.weekly.at(-1)!.weekStart).toBe("2026-10-19");
    const byWeek = Object.fromEntries(s.weekly.map((w) => [w.weekStart, w.count]));
    expect(byWeek["2026-09-28"]).toBe(2); // Oct 1 x2
    expect(byWeek["2026-09-14"]).toBe(1); // Sep 20 (Sunday)
    expect(byWeek["2026-09-07"]).toBe(1); // Sep 10
    expect(s.weekly.reduce((n, w) => n + w.count, 0)).toBe(4);
  });

  it("handles an empty account", () => {
    const e = computeStats([], [], NOW);
    expect(e.responseRate).toBeNull();
    expect(e.medianDaysToResponse).toBeNull();
  });
});
