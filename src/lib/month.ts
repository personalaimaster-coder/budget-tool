// Month keys are "YYYY-MM-01" strings representing a calendar month in IST.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function keyFrom(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-01`;
}

export function currentMonthKey(): string {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  return keyFrom(nowIst.getUTCFullYear(), nowIst.getUTCMonth());
}

export function isValidMonthKey(s: string): boolean {
  return /^\d{4}-\d{2}-01$/.test(s);
}

export function parseMonthKey(key: string): { year: number; month0: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month0: m - 1 };
}

export function addMonths(key: string, delta: number): string {
  const { year, month0 } = parseMonthKey(key);
  const d = new Date(Date.UTC(year, month0 + delta, 1));
  return keyFrom(d.getUTCFullYear(), d.getUTCMonth());
}

export function prevMonthKey(key: string): string {
  return addMonths(key, -1);
}

export function nextMonthKey(key: string): string {
  return addMonths(key, 1);
}

// UTC instant for the IST start of this month (for timestamptz range filters).
export function monthStartUtcISO(key: string): string {
  const { year, month0 } = parseMonthKey(key);
  return new Date(Date.UTC(year, month0, 1) - IST_OFFSET_MS).toISOString();
}

export function monthEndUtcISO(key: string): string {
  return monthStartUtcISO(nextMonthKey(key));
}

// "June 2026"
export function formatMonthLabel(key: string): string {
  const { year, month0 } = parseMonthKey(key);
  return new Date(Date.UTC(year, month0, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
