// Date helpers. Everything domain-facing uses plain 'YYYY-MM-DD' strings
// (matching Postgres `date` columns) rather than JS Date objects with
// implicit timezones — the only place a timezone matters is deciding what
// "today" is, which we pin to APP_TIMEZONE (see todayISO) so the app behaves
// the same regardless of which timezone the server process happens to run
// in. Set APP_TIMEZONE in .env.local if the household isn't in US/Eastern.

const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/New_York";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]; // Monday-first
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type YMD = { y: number; m: number; d: number };

export function todayISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function parseISO(iso: string): YMD {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function toISO(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toUTCDate({ y, m, d }: YMD): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, delta: number): string {
  const dt = toUTCDate(parseISO(iso));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  const a = toUTCDate(parseISO(fromISO)).getTime();
  const b = toUTCDate(parseISO(toISOStr)).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 0 = Monday .. 6 = Sunday */
export function weekdayIndexMon0(iso: string): number {
  const dow = toUTCDate(parseISO(iso)).getUTCDay(); // 0 = Sunday .. 6 = Saturday
  return (dow + 6) % 7;
}

export function startOfWeekMonday(iso: string): string {
  return addDays(iso, -weekdayIndexMon0(iso));
}

export function weekDates(weekStartISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartISO, i));
}

export function weekdayLetter(iso: string): string {
  return WEEKDAY_LETTERS[weekdayIndexMon0(iso)];
}

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[weekdayIndexMon0(iso)];
}

export function dayNumber(iso: string): number {
  return parseISO(iso).d;
}

export function monthShort(iso: string): string {
  return MONTHS[parseISO(iso).m - 1];
}

export function monthLong(monthIndex0: number): string {
  return MONTHS_LONG[monthIndex0];
}

/** 0 = Monday .. 6 = Sunday, for the 1st of the given month. */
export function firstWeekdayOfMonthMon0(year: number, month0: number): number {
  return weekdayIndexMon0(toISO(year, month0 + 1, 1));
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** "20:30" -> "8:30pm" */
export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr}${period}`;
}

/** "9 Sep" */
export function formatDayMonth(iso: string): string {
  const { d } = parseISO(iso);
  return `${d} ${monthShort(iso)}`;
}

/** "Wed 9 Sep" */
export function formatWeekdayDayMonth(iso: string): string {
  return `${weekdayShort(iso)} ${formatDayMonth(iso)}`;
}

/** "9 Sep 2026" */
export function formatDayMonthYear(iso: string): string {
  const { y } = parseISO(iso);
  return `${formatDayMonth(iso)} ${y}`;
}

/** "7–13 Sep" for a Monday-start week; crosses months as "28 Sep–4 Oct" */
export function formatWeekRange(weekStartISO: string): string {
  const end = addDays(weekStartISO, 6);
  const start = parseISO(weekStartISO);
  const endYmd = parseISO(end);
  if (start.m === endYmd.m) {
    return `${start.d}–${endYmd.d} ${monthShort(weekStartISO)}`;
  }
  return `${start.d} ${monthShort(weekStartISO)}–${endYmd.d} ${monthShort(end)}`;
}

export function relativeDaysAgo(iso: string, fromISO: string = todayISO()): string {
  const n = daysBetween(iso, fromISO);
  if (n <= 0) return "today";
  if (n === 1) return "1d ago";
  return `${n}d ago`;
}

export function isFuture(iso: string, fromISO: string = todayISO()): boolean {
  return daysBetween(fromISO, iso) > 0;
}

/** "12d ago" style label for a recipe's daysSinceLastCooked (which uses
 *  NEVER_COOKED_DAYS as a sentinel for "never cooked" — see types.ts). */
export function formatCookedAgo(days: number, neverCookedSentinel: number): string {
  if (days >= neverCookedSentinel) return "never cooked";
  if (days <= 0) return "today";
  return `${days}d ago`;
}

/** "just now" / "12m ago" / "3h ago" / "5d ago" from an ISO timestamp. */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const then = new Date(isoTimestamp).getTime();
  const diffSeconds = Math.max(0, Math.round((now.getTime() - then) / 1000));
  if (diffSeconds < 60) return "just now";
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
