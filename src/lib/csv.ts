/** RFC 4180 CSV: quote fields containing commas, quotes or newlines; double inner quotes. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell).
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}
