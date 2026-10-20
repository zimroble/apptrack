/**
 * Fractional ordering for kanban cards: a card dropped between two others gets
 * a position halfway between them, so a move updates a single row.
 */
export const POSITION_STEP = 1024;

export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_STEP;
  if (before === null) return (after as number) - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  if (after <= before) throw new Error("`after` must be greater than `before`");
  return before + (after - before) / 2;
}

/** True when two neighbours are so close that halving would lose precision. */
export function needsRebalance(before: number, after: number): boolean {
  return after - before < 1e-6;
}
