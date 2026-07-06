export function startOfLocalDay(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function daysAgoStart(days: number): Date {
  const out = startOfLocalDay();
  out.setDate(out.getDate() - days);
  return out;
}

export function localDayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  const start = daysAgoStart(n - 1);
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    keys.push(localDayKey(d));
  }
  return keys;
}

export function mondayIndex(d: Date): number {
  const jsDow = d.getDay();
  return (jsDow + 6) % 7;
}

export const DOW_SHORT_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DOW_PT_BR = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
