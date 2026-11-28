import { hasSaved, load, save } from "./storage";

/**
 * Anonymous usage counts, so the maker can see how many people use the app.
 * Once a day this device sends "visit" (and "new" the very first time), and
 * the first press of play that day sends "play". Nothing else: no ID, no
 * cookies, nothing about you or what you rap. The server (stats.mancolabs.dev,
 * source in the app-stats worker) only adds 1 to that day's counts.
 *
 * Off when the browser asks sites not to track (Global Privacy Control or
 * Do Not Track), when storage is blocked (it could not count once a day),
 * and anywhere but the published site.
 */

const ENDPOINT = "https://stats.mancolabs.dev/hit";
const APP = "insert-rhyme";
const SITE = "ethanmanco.github.io";

interface UsageState {
  /** The last UTC day a visit was counted. */
  day: string;
  /** The last UTC day a play was counted. */
  played: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function on(): boolean {
  if (location.hostname !== SITE) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !nav.globalPrivacyControl && nav.doNotTrack !== "1";
}

/** Saves the new state, and says whether it stuck (so a blocked storage never counts twice). */
function remember(state: UsageState): boolean {
  save("usage", state);
  const back = load<UsageState | null>("usage", null);
  return back?.day === state.day && back.played === state.played;
}

function send(kinds: string[]): void {
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      // Plain text keeps it a simple request, with no extra preflight call.
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ app: APP, kinds }),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Counting never gets in the way of the app.
  }
}

/** Count today's visit, once per device per day. Call before anything else is saved. */
export function countVisit(): void {
  if (!on()) return;
  const state = load<UsageState | null>("usage", null);
  const day = today();
  if (state?.day === day) return;
  // Someone who used the app before counting began has saved settings or words: not new.
  const fresh = !state && !hasSaved();
  if (!remember({ day, played: state?.played ?? "" })) return;
  send(fresh ? ["visit", "new"] : ["visit"]);
}

/** Count the first press of play today. */
export function countPlay(): void {
  if (!on()) return;
  const state = load<UsageState | null>("usage", null);
  const day = today();
  if (!state || state.played === day) return;
  if (!remember({ ...state, played: day })) return;
  send(["play"]);
}
