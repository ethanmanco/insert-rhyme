import { barPlan, layoutName, type BarPlan, type Layout, type Target } from "../core/schemes";
import { ballPoint, beatPosition, BEATS_PER_BAR, snap, type BeatPosition } from "../core/timing";

/** How many bars show below the current one. */
const AHEAD = 3;
/** How long a beat's block stays lit while the ball is on, as a share of the beat. */
const FLASH = 0.35;
/** Hop heights in pixels: a normal hop, and the long hop back to the start of the row. */
const HOP = 28;
const WRAP_HOP = 36;

/** What a target block shows: a word, a hidden word to find, or only its letter. */
export interface Label {
  text: string;
  /** The word, when it is shown and can be looked up. */
  word?: string;
}

export interface StageOptions {
  layout: Layout;
  label: (target: Target) => Label;
  /** Screen reader news. */
  announce: (text: string) => void;
  /** A shown word was tapped. */
  onWord: (word: string) => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

/** Longer words get a smaller size, so they fit the block. */
const sizeClass = (text: string) => (text.length <= 4 ? "w-l" : text.length <= 6 ? "w-m" : "w-s");

/**
 * The bar visualizer: the current bar as a row of four big blocks with the
 * ball hopping over them, and the next bars underneath so you can plan.
 * It holds no clock of its own. update() is handed the position in beats,
 * read from the audio clock, and draws exactly that.
 */
export class Stage {
  readonly root: HTMLElement;
  private caption: HTMLParagraphElement;
  private lane: HTMLDivElement;
  private ball: HTMLDivElement;
  private current: HTMLDivElement;
  private next: HTMLDivElement;
  private blocks: HTMLElement[] = [];
  private shownBar = Number.NaN;
  private litBeat = -1;
  private lastGroup = -1;
  ballOn = true;
  announceOn = true;

  constructor(private opts: StageOptions) {
    this.root = el("section", "stage");
    this.root.setAttribute("aria-label", "Bars");
    this.caption = el("p", "caption");
    this.lane = el("div", "lane");
    this.lane.setAttribute("aria-hidden", "true");
    this.ball = el("div", "ball");
    this.lane.append(this.ball);
    this.current = el("div", "row current");
    const label = el("p", "caption", "> NEXT");
    label.setAttribute("aria-hidden", "true");
    this.next = el("div", "next");
    this.root.append(this.caption, this.lane, this.current, label, this.next);
    this.showBar(0, false);
  }

  setBallOn(on: boolean): void {
    this.ballOn = on;
    this.root.classList.toggle("no-ball", !on);
  }

  setLayout(layout: Layout): void {
    this.opts.layout = layout;
    this.refresh();
  }

  /** Redraw the bars in place (after the scheme, words or difficulty change). */
  refresh(): void {
    const bar = Number.isNaN(this.shownBar) ? 0 : this.shownBar;
    this.lastGroup = -1;
    this.showBar(bar, false, true);
  }

  /** Back to the top, as when playback stops. */
  reset(): void {
    this.lastGroup = -1;
    this.showBar(0, false);
    this.light(-1);
    this.placeBall({ bar: 0, beat: 0, frac: 0 });
  }

  /** Draw the moment `beats` (from the audio clock), or the resting state when null. */
  update(beats: number | null): void {
    if (beats === null || beats < 0) {
      if (this.shownBar !== 0) this.showBar(0, false);
      this.light(-1);
      this.placeBall({ bar: 0, beat: 0, frac: 0 });
      return;
    }
    const pos = beatPosition(beats);
    if (pos.bar !== this.shownBar) this.showBar(pos.bar, true);
    this.light(!this.ballOn || pos.frac < FLASH ? pos.beat : -1);
    this.placeBall(pos);
  }

  private placeBall(pos: BeatPosition) {
    if (!this.ballOn) return;
    const width = this.current.clientWidth;
    const gap = 8;
    const block = (width - gap * (BEATS_PER_BAR - 1)) / BEATS_PER_BAR;
    const p = ballPoint(pos);
    const x = p.x * (block + gap) + block / 2 - 10;
    const y = p.y * (p.wrap ? WRAP_HOP : HOP);
    this.ball.style.transform = `translate(${snap(x)}px, ${-snap(y)}px)`;
  }

  private light(beat: number) {
    if (beat === this.litBeat) return;
    this.blocks[this.litBeat]?.classList.remove("lit");
    this.litBeat = beat;
    this.blocks[beat]?.classList.add("lit");
  }

  private showBar(bar: number, animate: boolean, quiet = false) {
    this.shownBar = bar;
    this.litBeat = -1;
    const plan = barPlan(this.opts.layout, bar);
    const line = plan.intro ? "COUNT IN" : plan.targets.length ? `LINE ${plan.line + 1}` : `LINE ${plan.line + 1}: FREE`;
    // With a random scheme or pace, say which one is in play.
    const { scheme, pace } = this.opts.layout;
    const now = scheme === "mix" || pace === "mix" ? layoutName({ scheme: plan.scheme, pace: plan.pace }) : "";
    this.caption.textContent = now ? `${line} - ${now}` : line;
    this.blocks = this.fillRow(this.current, plan, true);
    this.next.replaceChildren();
    for (let i = 1; i <= AHEAD; i++) {
      const row = el("div", "row");
      this.fillRow(row, barPlan(this.opts.layout, bar + i), false);
      this.next.append(row);
    }
    if (animate) {
      for (const node of [this.current, this.next]) {
        node.classList.remove("shift");
        void node.offsetWidth;
        node.classList.add("shift");
      }
    }
    if (!quiet) this.speak(plan);
  }

  private fillRow(row: HTMLDivElement, plan: BarPlan, current: boolean): HTMLElement[] {
    const blocks: HTMLElement[] = [];
    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
      const target = plan.targets.find((t) => t.beat === beat);
      let block: HTMLElement;
      if (target) {
        const label = this.opts.label(target);
        if (label.word) {
          const word = label.word;
          block = el("button", "block px target");
          (block as HTMLButtonElement).type = "button";
          block.setAttribute("aria-label", `${word}, rhyme ${target.letter}, beat ${beat + 1}. Show rhymes.`);
          block.addEventListener("click", () => this.opts.onWord(word));
        } else {
          block = el("div", "block px target");
        }
        block.classList.add(target.group % 2 === 0 ? "a" : "b", sizeClass(label.text));
        block.append(el("span", "", label.text));
      } else {
        block = el("div", "block px");
        if (current) block.append(el("span", "num", String(beat + 1)));
      }
      if (!target || !(block instanceof HTMLButtonElement)) block.setAttribute("aria-hidden", "true");
      blocks.push(block);
    }
    row.replaceChildren(...blocks);
    return blocks;
  }

  /**
   * Screen reader news, kept rare so it never talks over the beat: once
   * when a new rhyme group starts, naming its word when words are shown.
   */
  private speak(plan: BarPlan) {
    if (!this.announceOn || plan.intro) return;
    const target = plan.targets[0];
    if (!target || target.group === this.lastGroup) return;
    this.lastGroup = target.group;
    const label = this.opts.label(target);
    this.opts.announce(label.word ? `Next rhyme: ${label.word}.` : `New rhyme, group ${target.letter}.`);
  }
}
