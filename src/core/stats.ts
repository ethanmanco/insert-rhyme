/**
 * Daily streak and simple stats. A session is one stretch of playing; it
 * counts once it lasts at least MIN_SESSION seconds. A day counts toward the
 * streak once it has any counted session. Days are the player's local dates.
 */

export const MIN_SESSION = 15;

export interface Stats {
  sessions: number;
  seconds: number;
  streak: number;
  best: number;
  /** Local date of the last day practiced, as YYYY-MM-DD, or "" before the first. */
  lastDay: string;
}

export const EMPTY_STATS: Stats = { sessions: 0, seconds: 0, streak: 0, best: 0, lastDay: "" };

export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Whole days from one YYYY-MM-DD to another (daylight saving safe). */
export function daysBetween(from: string, to: string): number {
  const utc = (d: string) => {
    const [y, m, day] = d.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** Read stored stats, falling back to empty for anything missing or broken. */
export function cleanStats(raw: unknown): Stats {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  return {
    sessions: n(r.sessions),
    seconds: n(r.seconds),
    streak: n(r.streak),
    best: n(r.best),
    lastDay: typeof r.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.lastDay) ? r.lastDay : "",
  };
}

/** Add one session. Short ones are ignored so a quick tap of Play does not count. */
export function addSession(stats: Stats, seconds: number, today: string): Stats {
  if (seconds < MIN_SESSION) return stats;
  let streak = stats.streak;
  if (!stats.lastDay) streak = 1;
  else {
    const gap = daysBetween(stats.lastDay, today);
    if (gap === 1) streak += 1;
    else if (gap > 1 || gap < 0) streak = 1;
  }
  return {
    sessions: stats.sessions + 1,
    seconds: stats.seconds + Math.round(seconds),
    streak,
    best: Math.max(stats.best, streak),
    lastDay: today,
  };
}

/** The streak as it stands today: it drops to 0 once a whole day is missed. */
export function currentStreak(stats: Stats, today: string): number {
  if (!stats.lastDay) return 0;
  return daysBetween(stats.lastDay, today) <= 1 ? stats.streak : 0;
}
