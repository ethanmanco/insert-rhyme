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
  await page.evaluate(() => window.__ir.engine.setBpm(160));
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

  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await sleep(200);
  await shot(page, "09-dark");
} finally {
  await browser.close();
  server.close();
}
console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "No problems found.");
process.exitCode = problems.length ? 1 : 0;
