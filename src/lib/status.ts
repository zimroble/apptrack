import type { Status } from "@prisma/client";

export const STATUSES: Status[] = [
  "WISHLIST",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

export const STATUS_LABEL: Record<Status, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  ASSESSMENT: "Online assessment",
  INTERVIEW: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

// Tailwind classes for the small colored dot / badge next to each status.
export const STATUS_DOT: Record<Status, string> = {
  WISHLIST: "bg-slate-400",
  APPLIED: "bg-sky-500",
  ASSESSMENT: "bg-violet-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-emerald-500",
  REJECTED: "bg-rose-500",
  WITHDRAWN: "bg-zinc-400",
};

/** Statuses that mean the company responded to an application. */
export const RESPONDED: ReadonlySet<Status> = new Set(["ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED"]);

export function isStatus(s: unknown): s is Status {
  return typeof s === "string" && (STATUSES as string[]).includes(s);
}
