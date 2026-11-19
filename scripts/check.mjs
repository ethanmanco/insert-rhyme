// A browser check of a built copy: serves a folder, opens it in headless
// Chrome on a phone-sized screen, and walks through the app: the ball on
// the audio clock, prompt words, the rhyme helper, options and toggles, tap
// tempo, and recording with Chrome's fake microphone. Saves screenshots.
//   node scripts/check.mjs <built folder> <screenshot folder>
// Build with: npx vite build --base ./ --outDir <built folder>
// Set CHROME_PATH if Chrome is not in the default Windows location.

import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";

const [root, out] = process.argv.slice(2);
if (!root || !out) throw new Error("Usage: node scripts/check.mjs <built folder> <screenshot folder>");
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, "index.html") : path;
  if (!existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const problems = [];
const check = (ok, message) => ok || problems.push(message);
const shot = (page, name) => page.screenshot({ path: join(out, `${name}.png`) });

try {
  const page = await browser.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${base}?debug`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await shot(page, "01-start");

  await page.click(".start .btn");
  // Prompt words appear once the word list loads.
  await page.waitForFunction(() => [...document.querySelectorAll(".block.target")].some((b) => (b.textContent ?? "").length > 1), { timeout: 8000 });
  await shot(page, "02-playing-words");

  // Is there sound?
  const peak = await page.evaluate(async () => {
    window.__ir.engine.level();
    let max = -Infinity;
    const end = performance.now() + 1500;
    while (performance.now() < end) {
      await new Promise((r) => setTimeout(r, 20));
      max = Math.max(max, window.__ir.engine.level());
    }
    return max;
  });
  console.log(`peak level ${peak.toFixed(1)} dB`);
  check(peak > -30, `the beat is silent or very quiet: ${peak} dB`);

  // The lit block must always be the beat the audio clock is on.
  // MP3 timing: does this browser keep the encoder's lead-in? (The app corrects for it.)
  const decoded = await page.evaluate(() => [...window.__ir.loops.entries()].map(([id, l]) => ({ id, seconds: l.buffer.duration, start: l.start })));
  console.log("decoded loops:", JSON.stringify(decoded));
  await page.evaluate(() => window.__ir.engine.setBpm(130));
  const samples = await page.evaluate(async () => {
    const rows = [];
    const end = performance.now() + 5000;
    while (performance.now() < end) {
      await new Promise((r) => requestAnimationFrame(r));
      const beats = window.__ir.engine.heardBeats();
      const lit = [...document.querySelectorAll(".current .block")].findIndex((b) => b.classList.contains("lit"));
      rows.push({ beats, lit });
    }
    return rows;
  });
  let checked = 0;
  for (const s of samples) {
    if (s.beats === null || s.beats < 0 || s.lit < 0) continue;
    checked++;
    const beat = Math.floor(s.beats) % 4;
    check(beat === s.lit, `lit block ${s.lit} but the clock is on beat ${beat} (${s.beats.toFixed(3)})`);
  }
  console.log(`clock check: ${samples.length} frames, ${checked} lit frames matched`);
  check(checked > 50, "too few lit frames to check the clock");

  // Recording with the fake microphone: explain screen, then a short take.
  await page.click(".btn.rec");
  await page.waitForSelector("dialog[open] [data-answer='yes']");
  await shot(page, "03-mic-explain");
  await page.click("dialog[open] [data-answer='yes']");
  await page.waitForFunction(() => document.querySelector(".btn.rec")?.classList.contains("on"), { timeout: 5000 });
  await sleep(2500);
  await page.click(".btn.rec");
  await page.waitForSelector(".take audio", { timeout: 5000 });
  const takeSize = await page.evaluate(async () => (await (await fetch(document.querySelector(".take audio").src)).blob()).size);
  console.log(`recorded take: ${takeSize} bytes`);
  check(takeSize > 5000, `the recording is empty or tiny: ${takeSize} bytes`);
  await shot(page, "04-take");

  // Rhyme helper from a word on a block.
  await page.evaluate(() => document.querySelector("button.block.target")?.click());
  await page.waitForSelector("dialog[open] .words .word", { timeout: 5000 });
  const looked = await page.evaluate(() => ({ word: document.querySelector("dialog[open] input").value, n: document.querySelectorAll("dialog[open] .word").length }));
  console.log(`rhyme helper: "${looked.word}" with ${looked.n} rhymes`);
  check(looked.n > 3, "the rhyme helper showed too few rhymes");
  await shot(page, "05-rhymes");
  await page.keyboard.press("Escape");

  // Options: switch scheme and difficulty, check the blocks follow.
  await page.click("[data-tool='options']");
  await page.waitForSelector("dialog[open] input[value='double']");
  await shot(page, "06-options");
  await page.click("dialog[open] input[value='double']");
  await page.click("dialog[open] input[value='first']");
  await page.click("dialog[open] input[value='food']");
  await shot(page, "06b-themes");
  await page.keyboard.press("Escape");
  const themeChip = await page.evaluate(() => document.querySelector("[data-chip='theme']").textContent);
  check(themeChip === "FOOD", `the theme chip should say FOOD, got ${themeChip}`);
  await sleep(300);
  const blocks = await page.evaluate(() => [...document.querySelectorAll(".next .row")].map((r) => [...r.children].map((b) => b.textContent).join("|")));
  console.log("double-time, first word only:", JSON.stringify(blocks));
  check(blocks.every((r) => r.split("|").filter((x) => x).length === 2), "double-time rows should have two targets each");
  check(blocks.join(" ").includes("????"), "first-word difficulty should hide later words");
  await shot(page, "07-double-first");
  const schemeChip = await page.evaluate(() => document.querySelector("[data-chip='scheme']").textContent);
  check(schemeChip === "AABB 2X", `the scheme chip should say AABB 2X, got ${schemeChip}`);

  // A UK style: the note says it rhymes the UK way, and the rhyme helper does too (car with spa).
  await page.click("[data-tool='options']");
  await page.waitForSelector("dialog[open] input[value='ukdrill']");
  await page.click("dialog[open] input[value='ukdrill']");
  const ukNote = await page.evaluate(() => document.querySelector("dialog[open] .theme-note").textContent);
  check(ukNote.includes("UK way"), `the UK drill note should mention the UK way, got ${ukNote}`);
  check(/Words and rhymes from [\d,]+ songs by/.test(ukNote), `the UK drill note should say how many songs it learned from, got ${ukNote}`);
  await page.keyboard.press("Escape");
  await page.click("[data-tool='rhymes']");
  await page.waitForSelector("dialog[open] #rhyme-word");
  await page.$eval("dialog[open] #rhyme-word", (el) => (el.value = ""));
  // Results follow the box as you type, with no Enter: half a word suggests whole ones.
  await page.type("dialog[open] #rhyme-word", "ca");
  await page.waitForFunction(() => [...document.querySelectorAll("dialog[open] .results h3")].some((h) => h.textContent.startsWith("KEEP TYPING")), { timeout: 5000 });
  const half = await page.evaluate(() => [...document.querySelectorAll("dialog[open] .word")].map((b) => b.textContent));
  console.log(`typed "ca", suggestions: ${half.join(" ")}`);
  check(half.length > 3 && half.every((w) => w.startsWith("ca")), "half a word should suggest whole words that start with it");
  await page.type("dialog[open] #rhyme-word", "r");
  await page.waitForFunction(() => document.querySelector("dialog[open] #rhyme-word")?.value === "car" && [...document.querySelectorAll("dialog[open] .results h3")].some((h) => h.textContent.startsWith("PERFECT")), { timeout: 5000 });
  const ukRhymes = await page.evaluate(() => [...document.querySelectorAll("dialog[open] .word")].map((b) => b.textContent));
  console.log(`UK drill, rhymes for car: ${ukRhymes.slice(0, 12).join(" ")}`);
  check(ukRhymes.includes("spa"), "with UK drill picked, car should rhyme with spa");
  // The first Escape clears the search box; the second closes the sheet.
  await page.keyboard.press("Escape");
  if (await page.$("dialog[open]")) await page.keyboard.press("Escape");
  await sleep(300);
  const ukWords = await page.evaluate(() => [...document.querySelectorAll(".row.current .target, .next .row .target")].map((b) => b.textContent).filter((t) => t && t !== "????"));
  console.log("UK drill prompts:", JSON.stringify(ukWords));

  // ABAB with a skipped line: every other bar is free, and the rhyming bars alternate A and B.
  await page.click("[data-tool='options']");
  await page.waitForSelector("dialog[open] input[value='skip']");
  await page.click("dialog[open] input[value='abab']");
  await page.click("dialog[open] input[value='skip']");
  await page.click("dialog[open] input[value='none']");
  await page.keyboard.press("Escape");
  await sleep(300);
  const skipRows = await page.evaluate(() => [...document.querySelectorAll(".row.current, .next .row")].map((r) => [...r.querySelectorAll(".target")].map((b) => b.textContent).join("")));
  console.log("ABAB SKIP, no words:", JSON.stringify(skipRows));
  const rhyming = skipRows.filter((r) => r);
  check(rhyming.length === 2 && skipRows.length === 4 && rhyming[0] !== rhyming[1], "ABAB SKIP should show two rhyming bars of four, A then B");
  await shot(page, "07b-abab-skip");
  await page.click("[data-tool='options']");
  await page.waitForSelector("dialog[open] input[value='every']");
  await page.click("dialog[open] input[value='aabb']");
  await page.click("dialog[open] input[value='every']");
  await page.click("dialog[open] input[value='first']");
  await page.keyboard.press("Escape");

  // Tapping a chip opens Options at that chip's section, even after scrolling somewhere else.
  await page.click("[data-tool='options']");
  await page.evaluate(() => (document.querySelector("dialog[open] .sheet-body").scrollTop = 99999));
  await page.keyboard.press("Escape");
  for (const [chip, section] of [["theme", "theme"], ["scheme", "scheme"], ["words", "words"], ["beat", "beat"]]) {
    await page.click(`[data-chip='${chip}']`);
    await sleep(150);
    const spot = await page.evaluate((section) => {
      const body = document.querySelector("dialog[open] .sheet-body").getBoundingClientRect();
      const part = document.querySelector(`dialog[open] [data-section='${section}']`).getBoundingClientRect();
      const chosen = document.querySelector(`dialog[open] [data-section='${section}'] input:checked`)?.closest("label")?.getBoundingClientRect();
      return { partTop: part.top - body.top, chosenIn: !chosen || (chosen.top >= body.top && chosen.bottom <= body.bottom) };
    }, section);
    check(spot.chosenIn && spot.partTop < 400, `the ${chip} chip should open Options at ${section}: ${JSON.stringify(spot)}`);
    if (chip === "theme") await shot(page, "06c-theme-chip");
    await page.keyboard.press("Escape");
  }

  // Random scheme and pace: the bar title says which scheme is in play.
  await page.click("[data-chip='scheme']");
  await page.click("dialog[open] input[name='scheme'][value='mix']");
  await page.click("dialog[open] input[name='pace'][value='mix']");
  await page.keyboard.press("Escape");
  await sleep(300);
  const mixChip = await page.evaluate(() => document.querySelector("[data-chip='scheme']").textContent);
  const caption = await page.evaluate(() => document.querySelector(".caption").textContent);
  console.log("random:", mixChip, "/", caption);
  check(mixChip === "RANDOM MIXED", `the scheme chip should say RANDOM MIXED, got ${mixChip}`);
  check(/ - (AABB|ABAB|AAAA|ABBA|AAXA)/.test(caption), `the bar title should name the scheme in play, got ${caption}`);
  await page.click("[data-chip='scheme']");
  await page.click("dialog[open] input[name='scheme'][value='aabb']");
  await page.click("dialog[open] input[name='pace'][value='every']");
  await page.keyboard.press("Escape");

  // Explicit words: switch them on and check a good share of prompt groups use them.
  await page.click("[data-tool='options']");
  await page.click("dialog[open] .switch[data-key='explicit']");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__ir.index()?.loaded.has("profane") && window.__ir.deck(), { timeout: 8000 });
  await sleep(300);
  const explicitShare = await page.evaluate(() => {
    const deck = window.__ir.deck();
    const index = window.__ir.index();
    let hit = 0;
    for (let g = 1000; g < 1060; g++) if ([0, 1, 2, 3].some((s) => index.entry(deck.word(g, s))?.tier === "profane")) hit++;
    return hit / 60;
  });
  console.log(`explicit on: ${Math.round(explicitShare * 100)}% of groups use a swear word`);
  check(explicitShare >= 0.25, "explicit words were too rare with the switch on");

  // Space stops.
  await page.keyboard.press("Space");
  await sleep(200);
  check(!(await page.evaluate(() => window.__ir.engine.playing)), "Space did not stop playback");

  // Tap tempo: steady taps at 100 BPM.
  await page.click("[data-tool='options']");
  await page.click("dialog[open] input[value='tap']");
  await page.keyboard.press("Escape");
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("t");
    await sleep(600);
  }
  const tapState = await page.evaluate(() => ({ bpm: window.__ir.tap.bpm, running: window.__ir.tap.running, text: document.querySelector(".taprow output").textContent }));
  console.log("tap tempo:", JSON.stringify(tapState));
  check(tapState.running && Math.abs(tapState.bpm - 100) <= 3, `tap tempo should run near 100 BPM, got ${tapState.bpm}`);
  await shot(page, "08-tap");

  // Your own beat: load a file from disk and let the app find its tempo.
  const ownFile = process.env.OWN_BEAT;
  if (ownFile) {
    await page.keyboard.press("Space");
    await page.click("[data-tool='options']");
    await page.click("dialog[open] input[value='own']");
    await page.keyboard.press("Escape");
    const input = await page.$(".ownrow input[type=file]");
    await input.uploadFile(ownFile);
    await page.waitForFunction(() => window.__ir.own(), { timeout: 30000 });
    const ownInfo = await page.evaluate(() => ({ bpm: window.__ir.own().grid.bpm, start: window.__ir.own().grid.start, text: document.querySelector(".own-name").textContent }));
    console.log("own beat:", JSON.stringify(ownInfo));
    await page.click(".dock .play");
    await sleep(1500);
    check(await page.evaluate(() => window.__ir.engine.playing), "own beat did not play");
    await shot(page, "09-own-beat");
  }
} finally {
  await browser.close();
  server.close();
}
console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "No problems found.");
process.exitCode = problems.length ? 1 : 0;
