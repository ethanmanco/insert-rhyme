import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countPlay, countVisit } from "../src/usage";

/** A fake browser: storage, the page's host, privacy signals and the network. */
function browser(opts: { host?: string; gpc?: boolean; dnt?: string; blocked?: boolean; saved?: Record<string, string> } = {}) {
  const store = new Map<string, string>(Object.entries(opts.saved ?? {}));
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.blocked) throw new Error("blocked");
      store.set(k, v);
    },
  };
  const sent: string[][] = [];
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("location", { hostname: opts.host ?? "ethanmanco.github.io" });
  vi.stubGlobal("navigator", { globalPrivacyControl: opts.gpc, doNotTrack: opts.dnt ?? null });
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: { body: string }) => {
      sent.push(JSON.parse(init.body).kinds);
      return Promise.resolve(new Response(null, { status: 204 }));
    }),
  );
  return sent;
}

describe("usage counts", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-11-27T12:00:00Z") }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("count a new person once a day, and play once a day", () => {
    const sent = browser();
    countVisit();
    countVisit();
    countPlay();
    countPlay();
    expect(sent).toEqual([["visit", "new"], ["play"]]);
    vi.setSystemTime(new Date("2026-11-28T12:00:00Z"));
    countVisit();
    countPlay();
    expect(sent.slice(2)).toEqual([["visit"], ["play"]]);
  });

  it("know someone who used the app before counting began is not new", () => {
    const sent = browser({ saved: { "insert-rhyme:settings": "{}" } });
    countVisit();
    expect(sent).toEqual([["visit"]]);
  });

  it("send nothing off the published site, with privacy signals on, or without storage", () => {
    for (const opts of [{ host: "localhost" }, { host: "" }, { gpc: true }, { dnt: "1" }, { blocked: true }]) {
      const sent = browser(opts);
      countVisit();
      countPlay();
      expect([opts, sent]).toEqual([opts, []]);
      vi.unstubAllGlobals();
    }
  });
});
