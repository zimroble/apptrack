"use server";

import type { Status } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { needsRebalance, positionBetween, POSITION_STEP } from "@/lib/position";
import { isStatus } from "@/lib/status";
import { applicationSchema, fieldErrors } from "@/lib/validation";
import type { FormState } from "./auth";

/** Position at the bottom of a column. */
async function bottomOf(userId: string, status: Status): Promise<number> {
  const last = await db.application.findFirst({
    where: { userId, status },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return positionBetween(last?.position ?? null, null);
}

export async function createApplication(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  const data = parsed.data;
  const status = data.status as Status;
  const appliedAt = data.appliedAt ?? (status !== "WISHLIST" ? new Date() : null);
  await db.application.create({
    data: {
      ...data,
      status,
      appliedAt,
      userId: user.id,
      position: await bottomOf(user.id, status),
      events: { create: { from: null, to: status } },
    },
  });
  revalidatePath("/board");
  redirect("/board");
}

export async function updateApplication(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  const existing = await db.application.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { errors: { form: "Application not found" } };

  const status = parsed.data.status as Status;
  const statusChanged = status !== existing.status;
  await db.application.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      status,
      appliedAt: parsed.data.appliedAt ?? existing.appliedAt ?? (status !== "WISHLIST" ? new Date() : null),
      ...(statusChanged && {
        position: await bottomOf(user.id, status),
        events: { create: { from: existing.status, to: status } },
      }),
    },
  });
  revalidatePath("/board");
  redirect("/board");
}

export async function deleteApplication(id: string): Promise<void> {
  const user = await requireUser();
  await db.application.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/board");
  redirect("/board");
}

/**
 * Drag-and-drop move: put card `id` into column `status`, between the cards
 * `beforeId` and `afterId` (either may be null for the ends of the column).
 */
export async function moveApplication(
  id: string,
  status: string,
  beforeId: string | null,
  afterId: string | null,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isStatus(status)) return { ok: false };

  const ids = [id, beforeId, afterId].filter((x): x is string => !!x);
  const rows = await db.application.findMany({
    where: { id: { in: ids }, userId: user.id },
    select: { id: true, status: true, position: true, appliedAt: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const card = byId.get(id);
  // Every referenced card must exist, belong to this user, and neighbours must be in the target column.
  if (!card || rows.length !== ids.length) return { ok: false };
  const before = beforeId ? byId.get(beforeId)! : null;
  const after = afterId ? byId.get(afterId)! : null;
  if ((before && before.status !== status) || (after && after.status !== status)) return { ok: false };
  if (before && after && after.position <= before.position) return { ok: false };

  let position = positionBetween(before?.position ?? null, after?.position ?? null);
  if (before && after && needsRebalance(before.position, after.position)) {
    // Neighbours are too close together: renumber the column, then place the card.
    const column = await db.application.findMany({
      where: { userId: user.id, status, id: { not: id } },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await db.$transaction(
      column.map((c, i) => db.application.update({ where: { id: c.id }, data: { position: (i + 1) * POSITION_STEP } })),
    );
    const idx = column.findIndex((c) => c.id === before.id);
    position = (idx + 1) * POSITION_STEP + POSITION_STEP / 2;
  }

  const changed = card.status !== status;
  await db.application.update({
    where: { id },
    data: {
      status,
      position,
      ...(changed && !card.appliedAt && status !== "WISHLIST" && { appliedAt: new Date() }),
      ...(changed && { events: { create: { from: card.status, to: status } } }),
    },
  });
  revalidatePath("/board");
  revalidatePath("/stats");
  return { ok: true };
}
