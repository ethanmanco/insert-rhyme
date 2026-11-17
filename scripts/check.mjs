// A browser check of a built copy: serves a folder, opens it in headless
// Chrome on a phone-sized screen, presses start, and checks the ball stays
// on the audio clock. Saves screenshots to the output folder.
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
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff" };
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

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const problems = [];
try {
  const page = await browser.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${base}?debug`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "1-start.png") });

  await page.click(".start .btn");
  await sleep(300);
  await page.screenshot({ path: join(out, "2-count-in.png") });

  // Is there sound? Peak level of the mix over two seconds.
  const peak = await page.evaluate(async () => {
    window.__ir.engine.level();
    let max = -Infinity;
    const end = performance.now() + 2000;
    while (performance.now() < end) {
      await new Promise((r) => setTimeout(r, 20));
      max = Math.max(max, window.__ir.engine.level());
    }
    return max;
  });
  console.log(`peak level ${peak.toFixed(1)} dB`);
  if (!(peak > -30)) problems.push(`the beat is silent or very quiet: ${peak} dB`);

  // Sample the drawn ball against the audio clock for a few seconds at full tempo.
  await page.evaluate(() => window.__ir.engine.setBpm(160));
  const samples = await page.evaluate(async () => {
    const rows = [];
    const end = performance.now() + 6000;
    while (performance.now() < end) {
      await new Promise((r) => requestAnimationFrame(r));
      const beats = window.__ir.engine.heardBeats();
      const lit = [...document.querySelectorAll(".current .block")].findIndex((b) => b.classList.contains("lit"));
      const caption = document.querySelector(".stage .caption").textContent;
      rows.push({ beats, lit, caption });
    }
    return rows;
  });
  // Whenever a block is lit, it must be the beat the audio clock says.
  let checked = 0;
  for (const s of samples) {
    if (s.beats === null || s.beats < 0 || s.lit < 0) continue;
    checked++;
    const beat = Math.floor(s.beats) % 4;
    if (beat !== s.lit) problems.push(`lit block ${s.lit} but the clock is on beat ${beat} (${s.beats.toFixed(3)})`);
  }
  const last = samples.at(-1);
  console.log(`frames ${samples.length}, lit frames checked ${checked}, last position ${last.beats?.toFixed(2)} beats, caption "${last.caption}"`);
  if (!last.beats || last.beats < 14) problems.push(`music did not move as expected: ${last.beats}`);

  await page.screenshot({ path: join(out, "3-playing.png") });
  // Catch the moment a target block is hit.
  await page.waitForFunction(() => document.querySelector(".current .block.target.lit"), { timeout: 5000 });
  await page.screenshot({ path: join(out, "3b-target-hit.png") });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await sleep(200);
  await page.screenshot({ path: join(out, "4-dark.png") });
  await page.keyboard.press("Space");
  await sleep(200);
  const state = await page.evaluate(() => ({ playing: window.__ir.engine.playing, label: document.querySelector(".btn.main:not(.start .btn)")?.textContent }));
  console.log("after Space:", JSON.stringify(state));
  if (state.playing) problems.push("Space did not stop playback");
} finally {
  await browser.close();
  server.close();
}
console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "No problems found.");
process.exitCode = problems.length ? 1 : 0;
