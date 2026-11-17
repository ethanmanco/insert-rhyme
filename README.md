# Insert Rhyme

Free 8-bit freestyle rap practice. Pick a beat, watch the ball bounce across each bar, and land your rhymes on the bright blocks. No accounts, no ads, nothing to pay for, and nothing leaves your device.

**Play it:** https://ethanmanco.github.io/insert-rhyme/

![A session of Insert Rhyme: the ball hops across four blocks per bar while rhyme words wait on the fourth beat, then the rhyme helper opens](docs/demo.gif)

## What it does

- **7 beats, all made in code:** Dusty boom bap, Night trap, Rainy lo-fi, Bounce house, Dark alley, Sunset funk and Cold drill. Tempo from 70 to 160 BPM.
- **A bar view that shows exactly when to rhyme.** Each bar is a row of four blocks, one per beat. The ball lands on each block right on the beat, the target block where your rhyme should land is highlighted, and the next three bars wait underneath so you can plan.
- **6 rhyme schemes:** AABB, ABAB, AAAA, skip-line (only every other line rhymes), half-time (a rhyme every two bars) and double-time (two rhymes per bar).
- **Word prompts with three levels:** every rhyme word shown, only the first word of each rhyme shown (you find the rest), or no words (free practice with the scheme only).
- **Rhyme helper:** tap any word for its perfect and near rhymes, or type your own.
- **Tap tempo:** rapping over music from somewhere else? Tap along and the bars follow, with no built-in beat.
- **Recording:** record your verse over the beat, play it back, and download it. It stays on your device.
- **Daily streak and stats:** sessions and minutes practiced, saved in your browser.
- **Family-friendly by default.** Explicit words are behind a switch in Options, off by default. Slurs are behind a separate second switch, also off by default.

Works in portrait on a phone, with big controls. Keyboard: Space plays and stops, T taps the tempo, R records, and the arrow keys change the tempo. With reduced motion turned on in your system (or the ball switched off in Options), the bouncing ball becomes a block that lights up on each beat. Screen readers hear the next rhyme word once when each new rhyme starts, never over every beat.

## How it stays on the beat

The ball never runs on its own timer. Every frame, the app asks the audio clock where the music is (minus the delay before sound reaches your ears) and draws the ball at exactly that spot, so it cannot drift away from the beat, even after an hour. A headless browser check (`scripts/check.mjs`) plays the beat and confirms, frame by frame, that the lit block is always the beat the audio clock is on.

## How the rhyme matching works

Rhymes are found by sound, not spelling, using pronunciations from the CMU Pronouncing Dictionary. "Night" is `N AY1 T`: phonemes, with a stress number on each vowel.

- **Perfect rhymes** share the stressed vowel and everything after it, with a different sound just before it. Night, light and bite all end in `AY T`. "Knight" is left out (it sounds the same), and so is "believe" for "leave" (same sound before the vowel too, so it is an echo, not a rhyme).
- **Near rhymes** share the vowel sounds from the stressed vowel on, while the consonants differ: night, ride and time all have `AY`.
- Results are sorted by how common the word is (using the SCOWL word lists), then by how close the syllable count is.

Prompt words come from nearly 200 everyday seed words with lots of easy rhymes. A test checks that every seed still has at least 8 common rhymes, so a player never gets an impossible word.

Everything works offline after the first load. `scripts/build-rhymes.ts` builds the word files in `public/data` from pinned copies of the sources: the dictionary and the word lists are joined, and every word is sorted into one of three files. Everyday words go in the default file. Explicit words and slurs each get their own file, which only downloads when its switch is on.

## The explicit-word filter

The filter (`filter/`) is thorough because the pronunciation dictionary contains plenty of profanity and slurs. It catches listed words and their forms (plurals, -ed, -ing, -er, -y and so on), and a few roots that are explicit wherever they appear inside a word. An allowlist protects innocent words that happen to match, like "scatter", "spicy", "cocky" and "snigger". Every word it still flags in the common word lists was reviewed by hand.

The tests check every listed word and its forms, a set of innocent look-alikes, and every single word in the shipped default file. The word lists are stored in ROT13 so the repository does not show them as plain text.

## Credits and licenses

- **CMU Pronouncing Dictionary**, Copyright (C) 1993-2015 Carnegie Mellon University, under a BSD-style license that asks you to keep the notice. Used at commit 7479086 of [cmusphinx/cmudict](https://github.com/cmusphinx/cmudict). Full notice: [licenses/cmudict.txt](licenses/cmudict.txt), also shipped next to the data.
- **SCOWL** (Spell Checker Oriented Word Lists) 2020.12.07, Copyright 2000-2018 by Kevin Atkinson, under an MIT-like license. Used for how common each word is. Full notice: [licenses/scowl.txt](licenses/scowl.txt), also shipped next to the data.
- **List of Dirty, Naughty, Obscene, and Otherwise Bad Words** (English), (c) 2012-2020 Shutterstock, Inc., [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Its single-word entries seed the filter, stored encoded in `filter/lists.ts`; phrases are left out.
- **Fonts:** Press Start 2P and VT323, both under the SIL Open Font License ([licenses](licenses)).
- **Sounds:** the drum and synth engine comes from [Steplab](https://github.com/ethanmanco/steplab), my browser beat maker. Every sound is made in code, with no audio samples.
- One pronunciation is fixed by hand: "mic" rhymes with "like".

## Future ideas

- Video recording
- Speech recognition to check whether you actually hit the rhymes
- Sharing takes and sessions
- More beats
- Accounts, to keep your streak across devices

## Development

```bash
npm install
npm run dev
```

```bash
npm test
```

To rebuild the rhyme data, download the two pinned sources listed at the top of `scripts/build-rhymes.ts` into one folder, then run `node scripts/build-rhymes.ts <that folder>`.

Built with Claude Code. I designed, directed, reviewed, and tested it.
