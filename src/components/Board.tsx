"use client";

import type { Status } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { moveApplication } from "@/app/actions/applications";
import { STATUS_DOT, STATUS_LABEL, STATUSES } from "@/lib/status";

export type BoardCard = {
  id: string;
  company: string;
  role: string;
  location: string | null;
  url: string | null;
  status: Status;
  appliedAt: string | null;
};

type Drop = { status: Status; beforeId: string | null; afterId: string | null };

/** Neighbours of the slot under the cursor, from the midpoints of the column's cards. */
function slotAt(columnEl: HTMLElement, clientY: number, draggingId: string) {
  const items = [...columnEl.querySelectorAll<HTMLElement>("[data-card]")].filter((el) => el.dataset.card !== draggingId);
  let index = items.findIndex((el) => {
    const r = el.getBoundingClientRect();
    return clientY < r.top + r.height / 2;
  });
  if (index === -1) index = items.length;
  return { beforeId: items[index - 1]?.dataset.card ?? null, afterId: items[index]?.dataset.card ?? null };
}

function DropLine() {
  return <li aria-hidden className="h-0.5 rounded-full bg-accent" />;
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

export function Board({ initial }: { initial: BoardCard[] }) {
  const [cards, setCards] = useState(initial);
  // When the server sends fresh data (e.g. after a move is revalidated), adopt it.
  const [serverCards, setServerCards] = useState(initial);
  if (initial !== serverCards) {
    setServerCards(initial);
    setCards(initial);
  }
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  // Event handlers read the dragged id from a ref: drag events can fire before
  // React re-renders with the new state.
  const draggingRef = useRef<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  // Marks the board as interactive once hydrated (used by the E2E tests).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const router = useRouter();

  const q = query.trim().toLowerCase();
  const columns = useMemo(() => {
    const visible = q ? cards.filter((c) => `${c.company} ${c.role} ${c.location ?? ""}`.toLowerCase().includes(q)) : cards;
    return STATUSES.map((s) => ({ status: s, cards: visible.filter((c) => c.status === s) }));
  }, [cards, q]);

  function move(id: string, status: Status, beforeId: string | null, afterId: string | null) {
    const card = cards.find((c) => c.id === id)!;
    const col = cards.filter((c) => c.status === status);
    const at = col.findIndex((c) => c.id === id);
    // Dropped back into its own slot: nothing to do.
    if (at !== -1 && (col[at - 1]?.id ?? null) === beforeId && (col[at + 1]?.id ?? null) === afterId) return;

    // Optimistic update: rebuild the list with the card in its new slot.
    const moved = { ...card, status, appliedAt: card.appliedAt ?? (status !== "WISHLIST" ? new Date().toISOString() : null) };
    const rest = cards.filter((c) => c.id !== id);
    const insertAt = afterId
      ? rest.findIndex((c) => c.id === afterId)
      : beforeId
        ? rest.findIndex((c) => c.id === beforeId) + 1
        : rest.length;
    const prev = cards;
    setCards([...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)]);

    startTransition(async () => {
      const res = await moveApplication(id, status, beforeId, afterId);
      if (!res.ok) {
        setCards(prev);
        router.refresh();
      }
    });
  }

  function endDrag() {
    draggingRef.current = null;
    setDragging(null);
    setDrop(null);
  }

  /** Move to the bottom of a column (used by the status dropdown). */
  function moveToEnd(id: string, status: Status) {
    const col = cards.filter((c) => c.status === status && c.id !== id);
    move(id, status, col.at(-1)?.id ?? null, null);
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by company, role or location…"
          className="input max-w-sm"
          aria-label="Filter applications"
        />
        <span aria-live="polite" className="text-xs text-zinc-400">
          {saving ? "Saving…" : ""}
        </span>
      </div>
      <div
        data-testid="board"
        data-hydrated={hydrated ? "true" : undefined}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6"
      >
        {columns.map(({ status, cards: colCards }) => (
          <section
            key={status}
            data-testid={`column-${status}`}
            className={`flex w-72 shrink-0 flex-col rounded-xl border p-2 transition ${
              drop?.status === status
                ? "border-accent/50 bg-accent/5"
                : "border-transparent bg-zinc-100/70 dark:bg-zinc-900/50"
            }`}
            onDragOver={(e) => {
              if (!draggingRef.current) return;
              e.preventDefault();
              const slot = slotAt(e.currentTarget, e.clientY, draggingRef.current);
              if (drop?.status !== status || drop.beforeId !== slot.beforeId || drop.afterId !== slot.afterId)
                setDrop({ status, ...slot });
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = draggingRef.current;
              if (id) {
                const slot = slotAt(e.currentTarget, e.clientY, id);
                move(id, status, slot.beforeId, slot.afterId);
              }
              endDrag();
            }}
          >
            <header className="flex items-center gap-2 px-2 py-2 text-sm font-medium">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
              {STATUS_LABEL[status]}
              <span className="ml-auto rounded-full bg-zinc-200 px-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {colCards.length}
              </span>
            </header>
            <ol className="flex min-h-24 flex-1 flex-col gap-2">
              {colCards.map((c) => (
                <Fragment key={c.id}>
                {dragging && drop?.status === status && drop.afterId === c.id && <DropLine />}
                <li
                  data-card={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", c.id);
                    draggingRef.current = c.id;
                    setDragging(c.id);
                  }}
                  onDragEnd={endDrag}
                  className={`card group cursor-grab p-3 active:cursor-grabbing ${dragging === c.id ? "opacity-40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.company}</p>
                      <p className="truncate text-sm text-zinc-500">{c.role}</p>
                    </div>
                    <Link
                      href={`/applications/${c.id}`}
                      className="rounded px-1.5 text-xs text-zinc-400 opacity-0 transition hover:text-accent group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Edit ${c.company}`}
                    >
                      Edit
                    </Link>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    {c.location && <span>{c.location}</span>}
                    {c.appliedAt && <span>Applied {daysAgo(c.appliedAt)}</span>}
                  </div>
                  {/* Keyboard / touch alternative to drag-and-drop. The menu is only
                      rendered for the card being moved, which keeps large boards light. */}
                  {menuFor === c.id ? (
                    <select
                      autoFocus
                      aria-label={`Move ${c.company} to`}
                      value={c.status}
                      onChange={(e) => {
                        setMenuFor(null);
                        moveToEnd(c.id, e.target.value as Status);
                      }}
                      onBlur={() => setMenuFor(null)}
                      className="mt-2 w-full rounded-md border border-zinc-200 bg-transparent px-1.5 py-1 text-xs text-zinc-500 dark:border-zinc-700"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMenuFor(c.id)}
                      className="mt-2 text-xs text-zinc-400 hover:text-accent sm:hidden sm:group-focus-within:inline sm:group-hover:inline"
                    >
                      Move to…
                    </button>
                  )}
                </li>
                </Fragment>
              ))}
              {dragging && drop?.status === status && drop.afterId === null && colCards.length > 0 && <DropLine />}
              {colCards.length === 0 && (
                <li className="grid h-24 place-items-center rounded-lg border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
                  {q ? "No matches" : "Drop here"}
                </li>
              )}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
