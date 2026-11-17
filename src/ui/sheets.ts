import { BEATS } from "../core/beats";
import type { RhymeIndex, Tier } from "../core/rhymes";
import { SCHEMES } from "../core/schemes";
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

/* ---------- Options ---------- */

export interface OptionsSheet {
  open(): void;
  render(): void;
}

export function optionsSheet(get: () => Settings, stats: () => Stats, change: (patch: Partial<Settings>) => void): OptionsSheet {
  const { dialog, body } = sheet("OPTIONS", "options");

  const radios = (name: string, label: string, items: { id: string; name: string; hint: string }[], value: string) => `
    <fieldset class="group">
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
      <section class="stats" aria-label="Your stats">
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
          { id: "tap", name: "TAP TEMPO", hint: "Playing your own music? Tap along and the bars follow." },
        ],
        s.mode,
      )}
      ${radios(
        "beat",
        "BEAT",
        BEATS.map((b) => ({ id: b.id, name: b.name.toUpperCase(), hint: `${b.bpm} BPM` })),
        s.beat,
      )}
      ${radios("scheme", "RHYME SCHEME", SCHEMES.map((x) => ({ id: x.id, name: x.name, hint: x.hint })), s.scheme)}
      ${radios("difficulty", "WORDS", DIFFICULTIES, s.difficulty)}
      <fieldset class="group">
        <legend>DISPLAY AND WORDS</legend>
        ${toggle("ball", "BOUNCING BALL", "Off: the block for each beat lights up instead.", s.ball)}
        ${toggle("announce", "SCREEN READER NEWS", "Say the next rhyme word when a new rhyme starts.", s.announce)}
        ${toggle("explicit", "EXPLICIT WORDS", "Swear words and crude words in prompts and rhymes.", s.explicit)}
        ${toggle("slurs", "SLURS", "Hate words too. A separate switch, off by default.", s.slurs)}
      </fieldset>
      <p class="choice-hint center">Everything stays on this device. Words: CMU Pronouncing Dictionary and SCOWL. <a href="https://github.com/ethanmanco/insert-rhyme">Source and credits</a></p>`;
  }

  body.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.type !== "radio") return;
    change({ [input.name]: input.value } as Partial<Settings>);
  });
  body.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(".switch");
    if (!button) return;
    const key = button.dataset.key as keyof Settings;
    change({ [key]: !get()[key] } as Partial<Settings>);
    render();
    body.querySelector<HTMLButtonElement>(`.switch[data-key="${key}"]`)?.focus();
  });

  return {
    open() {
      render();
      dialog.showModal();
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

export function helperSheet(index: () => RhymeIndex | null, allowed: () => ReadonlySet<Tier>, explicitOn: () => boolean): HelperSheet {
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
    const r = ix.lookup(word, allowed());
    if (!r.known) {
      const more = explicitOn() ? "" : " Some words only show with explicit words turned on in Options.";
      results.innerHTML = `<p class="choice-hint">No rhymes found for "${esc(word)}". Try another spelling or a more common word.${more}</p>`;
      return;
    }
    results.innerHTML =
      list("PERFECT", r.perfect, "Same sound from the stressed vowel on.") + list("NEAR", r.near, "Same vowel sounds, different consonants.");
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
