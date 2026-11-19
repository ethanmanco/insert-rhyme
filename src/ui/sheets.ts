import { BEATS, beatById } from "../core/beats";
import { CATEGORIES } from "../core/categories";
import { LYRIC_SONGS } from "../core/lyricCounts";
import type { Accent } from "../core/phonetics";
import type { RhymeIndex, Tier } from "../core/rhymes";
import { PACES, SCHEMES } from "../core/schemes";
import { currentStreak, dayKey, type Stats } from "../core/stats";
import { DIFFICULTIES, type Settings } from "../settings";

/** A modal panel that slides up from the bottom. Escape and the close button shut it. */
function sheet(title: string, id: string): { dialog: HTMLDialogElement; body: HTMLDivElement } {
  const dialog = document.createElement("dialog");
  dialog.className = "sheet";
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  dialog.innerHTML = `
    <div class="sheet-head">
      <h2 id="${id}-title">${title}</h2>
      <button class="btn px close" type="button" aria-label="Close">X</button>
    </div>
    <div class="sheet-body"></div>`;
  dialog.querySelector(".close")!.addEventListener("click", () => dialog.close());
  // A tap on the dimmed area outside the panel closes it too.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.body.append(dialog);
  return { dialog, body: dialog.querySelector(".sheet-body")! };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const REPO = "https://github.com/ethanmanco/insert-rhyme";

/** A 9 by 9 pixel star, drawn in the text color. */
const STAR_ICON = (() => {
  const rows = ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##.", ".#.....#."];
  const rects = rows.flatMap((row, y) => [...row].map((c, x) => (c === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "")));
  return `<svg class="star-icon" viewBox="0 0 9 9" width="27" height="27" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor">${rects.join("")}</svg>`;
})();

/* ---------- Options ---------- */

/** Parts of the Options sheet a chip can jump to. */
export type OptionsSection = "stats" | "music" | "beat" | "scheme" | "pace" | "words" | "theme";

export interface OptionsSheet {
  /** Open the sheet, scrolled to a section when one is given (else where it was left). */
  open(section?: OptionsSection): void;
  render(): void;
}

export function optionsSheet(get: () => Settings, stats: () => Stats, change: (patch: Partial<Settings>) => void): OptionsSheet {
  const { dialog, body } = sheet("OPTIONS", "options");

  const radios = (name: string, label: string, items: { id: string; name: string; hint: string }[], value: string, section = name) => `
    <fieldset class="group" data-section="${section}">
      <legend>${label}</legend>
      ${items
        .map(
          (it) => `<label class="choice px">
            <input type="radio" name="${name}" value="${it.id}" ${it.id === value ? "checked" : ""} />
            <span class="choice-name">${esc(it.name)}</span>
            <span class="choice-hint">${esc(it.hint)}</span>
          </label>`,
        )
        .join("")}
    </fieldset>`;

  const mini = (id: string, name: string, hint: string, value: string) => `
    <label class="choice mini px" title="${esc(hint)}">
      <input type="radio" name="category" value="${id}" ${id === value ? "checked" : ""} />
      <span class="choice-name">${esc(name)}</span>
    </label>`;

  /** What the picked theme is about, and for a rap style, the artists it draws on. */
  const themeNote = (id: string) => {
    const c = CATEGORIES.find((x) => x.id === id);
    if (!c) return "ANY WORDS: everyday words with lots of rhymes.";
    const names = c.artists ?? [];
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
    const accent = c.accent === "uk" ? " Rhymes the UK way: car with ma." : c.accent === "south" ? " Rhymes the Southern way: Benz with wins." : "";
    const songs = LYRIC_SONGS[c.id];
    const from = !list ? "" : songs ? ` Words and rhymes from ${songs.toLocaleString("en-US")} songs by ${list}.` : ` Words and swearing in the style of ${list}.`;
    return `${c.name}: ${c.hint}${from}${accent}`;
  };

  const themes = (value: string) => `
    <fieldset class="group" data-section="theme">
      <legend>WORD THEME</legend>
      <p class="choice-hint">With a theme, each rhyme starts with one of its words. Rap styles fill the rest with words their artists use and rhyme, before everyday ones. Drug and weapon words in the rap styles only show with explicit words on.</p>
      <p class="choice-hint theme-note" aria-live="polite">${esc(themeNote(value))}</p>
      <div class="minis">${mini("any", "ANY WORDS", "Everyday words with lots of rhymes.", value)}</div>
      <p class="sub">RAP STYLES</p>
      <div class="minis">${CATEGORIES.filter((c) => c.kind === "style").map((c) => mini(c.id, c.name, c.hint, value)).join("")}</div>
      <p class="sub">TOPICS</p>
      <div class="minis">${CATEGORIES.filter((c) => c.kind === "topic").map((c) => mini(c.id, c.name, c.hint, value)).join("")}</div>
    </fieldset>`;

  const toggle = (key: keyof Settings, name: string, hint: string, on: boolean) => `
    <div class="toggle-row">
      <div><p class="choice-name">${name}</p><p class="choice-hint">${hint}</p></div>
      <button class="btn px switch" type="button" data-key="${key}" aria-pressed="${on}" aria-label="${name}">${on ? "ON" : "OFF"}</button>
    </div>`;

  function render() {
    const s = get();
    const st = stats();
    const streak = currentStreak(st, dayKey(new Date()));
    const minutes = Math.floor(st.seconds / 60);
    body.innerHTML = `
      <section class="stats" aria-label="Your stats" data-section="stats">
        <div class="stat px"><span class="stat-n">${streak}</span><span>DAY STREAK</span></div>
        <div class="stat px"><span class="stat-n">${st.sessions}</span><span>SESSIONS</span></div>
        <div class="stat px"><span class="stat-n">${minutes}</span><span>MINUTES</span></div>
      </section>
      <p class="choice-hint center">Best streak: ${st.best} ${st.best === 1 ? "day" : "days"}. A session counts after 15 seconds of play.</p>
      ${radios(
        "mode",
        "MUSIC",
        [
          { id: "beat", name: "BUILT-IN BEAT", hint: "Rap over one of the beats below." },
          { id: "own", name: "YOUR OWN BEAT", hint: "Pick a song or beat file on this device. It never leaves it." },
          { id: "tap", name: "TAP TEMPO", hint: "Music playing somewhere else? Tap along and the bars follow." },
        ],
        s.mode,
        "music",
      )}
      <fieldset class="group" data-section="beat">
        <legend>BEAT</legend>
        <div class="minis">${BEATS.map(
          (b) => `<label class="choice mini px" title="${esc(`${b.style} by ${b.credit.artist}`)}">
            <input type="radio" name="beat" value="${b.id}" ${b.id === s.beat ? "checked" : ""} />
            <span><span class="choice-name">${esc(b.name.toUpperCase())}</span><span class="choice-hint mini-hint">${esc(b.style)}, ${Math.round(b.bpm)}</span></span>
          </label>`,
        ).join("")}</div>
      </fieldset>
      ${radios("scheme", "RHYME SCHEME", SCHEMES, s.scheme)}
      ${radios("pace", "RHYME PACE", PACES, s.pace)}
      ${radios("difficulty", "WORDS", DIFFICULTIES, s.difficulty, "words")}
      ${themes(s.category)}
      <fieldset class="group">
        <legend>DISPLAY AND WORDS</legend>
        ${toggle("ball", "BOUNCING BALL", "Off: the block for each beat lights up instead.", s.ball)}
        ${toggle("announce", "SCREEN READER NEWS", "Say the next rhyme word when a new rhyme starts.", s.announce)}
        ${toggle("explicit", "EXPLICIT WORDS", "Swear words and crude words in prompts and rhymes.", s.explicit)}
        ${toggle("slurs", "SLURS", "Hate words too. A separate switch, off by default.", s.slurs)}
        ${s.slurs ? toggle("white", "I'M WHITE", "Leaves the n-word out of prompts and rhymes.", s.white) : ""}
      </fieldset>
      <fieldset class="group">
        <legend>LIKE INSERT RHYME?</legend>
        <a class="btn star px" href="${REPO}" target="_blank" rel="noopener">${STAR_ICON}<span>STAR IT ON GITHUB</span></a>
        <p class="choice-hint center">It's free and has no ads. A star helps other people find it.</p>
      </fieldset>
      <p class="choice-hint center">Beat: ${esc(beatById(s.beat).credit.title)} by ${esc(beatById(s.beat).credit.artist)}, <a href="${beatById(s.beat).credit.url}">${beatById(s.beat).credit.license}</a>, cut to a loop.</p>
      <p class="choice-hint center">Everything stays on this device. Words: CMU Pronouncing Dictionary and SCOWL. <a href="${REPO}">Source and credits</a></p>`;
  }

  body.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.type !== "radio") return;
    change({ [input.name]: input.value } as Partial<Settings>);
    const note = body.querySelector(".theme-note");
    if (input.name === "category" && note) note.textContent = themeNote(input.value);
  });
  body.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(".switch");
    if (!button) return;
    const key = button.dataset.key as keyof Settings;
    change({ [key]: !get()[key] } as Partial<Settings>);
    render();
    body.querySelector<HTMLButtonElement>(`.switch[data-key="${key}"]`)?.focus();
  });

  /** Scroll a section to the top of the sheet, and keep its chosen item in view (the beat and theme lists are long). */
  function jumpTo(section: OptionsSection) {
    const part = body.querySelector<HTMLElement>(`[data-section="${section}"]`);
    if (!part) return;
    const top = () => body.getBoundingClientRect().top;
    body.scrollTop += part.getBoundingClientRect().top - top() - 12;
    const chosen = part.querySelector<HTMLInputElement>("input:checked");
    if (!chosen) return;
    const item = (chosen.closest("label") ?? chosen).getBoundingClientRect();
    const bottom = body.getBoundingClientRect().bottom;
    if (item.bottom > bottom - 12) body.scrollTop += item.bottom - bottom + body.clientHeight / 3;
    chosen.focus({ preventScroll: true });
  }

  return {
    open(section) {
      render();
      dialog.showModal();
      if (section) jumpTo(section);
    },
    render,
  };
}

/* ---------- Rhyme helper ---------- */

export interface HelperSheet {
  open(word?: string): void;
  /** Look up again (after the data loads or a toggle changes). */
  refresh(): void;
}

export function helperSheet(
  index: () => RhymeIndex | null,
  allowed: () => ReadonlySet<Tier>,
  explicitOn: () => boolean,
  hidden: () => ((word: string) => boolean) | undefined = () => undefined,
  accent: () => Accent = () => "us",
): HelperSheet {
  const { dialog, body } = sheet("RHYMES", "rhymes");
  body.innerHTML = `
    <form class="search" role="search">
      <label class="sr-only" for="rhyme-word">Word to rhyme</label>
      <input id="rhyme-word" class="px" type="search" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="night" />
      <button class="btn px" type="submit">FIND</button>
    </form>
    <div class="results" aria-live="polite"></div>`;
  const input = body.querySelector("input")!;
  const results = body.querySelector<HTMLDivElement>(".results")!;
  let word = "";

  const list = (title: string, words: string[], hint: string) =>
    `<h3>${title} <span class="choice-hint">${hint}</span></h3>` +
    (words.length
      ? `<ul class="words">${words.map((w) => `<li><button class="word px" type="button">${esc(w)}</button></li>`).join("")}</ul>`
      : `<p class="choice-hint">None found.</p>`);

  function show() {
    const ix = index();
    if (!word) {
      results.innerHTML = `<p class="choice-hint">Type a word, or tap any word on the blocks.</p>`;
      return;
    }
    if (!ix) {
      results.innerHTML = `<p class="choice-hint">Loading the word list...</p>`;
      return;
    }
    const r = ix.lookup(word, allowed(), 60, hidden(), accent());
    if (!r.known) {
      const more = explicitOn() ? "" : " Some words only show with explicit words turned on in Options.";
      results.innerHTML = `<p class="choice-hint">No rhymes found for "${esc(word)}". Try another spelling or a more common word.${more}</p>`;
      return;
    }
    results.innerHTML =
      list("PERFECT", r.perfect, "Same sound from the stressed vowel on, the way rappers say it: -er and -a match.") +
      list("SLANT", r.slant, "Same vowels and the same ending, like dinner, killer and picture. How most rap rhymes.") +
      list("NEAR", r.near, "Same vowel sounds, different consonants.");
  }

  body.querySelector("form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    word = input.value.trim().toLowerCase();
    show();
  });
  results.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".word");
    if (!b) return;
    word = b.textContent ?? "";
    input.value = word;
    show();
    dialog.querySelector(".sheet-body")!.scrollTop = 0;
  });

  return {
    open(w) {
      if (w) {
        word = w.toLowerCase();
        input.value = word;
      }
      show();
      dialog.showModal();
      if (!w) input.focus();
    },
    refresh: () => dialog.open && show(),
  };
}

/* ---------- Microphone explanation ---------- */

/** Explains recording before the browser's own permission prompt. Resolves true to go ahead. */
export function micExplainer(): () => Promise<boolean> {
  const { dialog, body } = sheet("RECORD", "record");
  body.innerHTML = `
    <p>Record your verse over the beat, play it back, and save it.</p>
    <p>Your recording stays on this device. Nothing is uploaded.</p>
    <p>Next, your browser will ask to use the microphone. Headphones keep the beat out of the mic, so your voice comes through clean.</p>
    <div class="row-buttons">
      <button class="btn px" type="button" data-answer="no">NOT NOW</button>
      <button class="btn px main" type="button" data-answer="yes">USE MIC</button>
    </div>`;
  return () =>
    new Promise((resolve) => {
      let answer = false;
      const onClick = (e: Event) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-answer]");
        if (!b) return;
        answer = b.dataset.answer === "yes";
        dialog.close();
      };
      body.addEventListener("click", onClick);
      dialog.addEventListener(
        "close",
        () => {
          body.removeEventListener("click", onClick);
          resolve(answer);
        },
        { once: true },
      );
      dialog.showModal();
    });
}
