// Records docs/demo.gif: a few bars of a session on a phone-sized screen,
// then a look at the rhyme helper. Adapted from Earcade's record-demo.mjs.
//   node scripts/record-demo.mjs <built folder>
// Build with: npx vite build --base ./ --outDir <built folder>
// Set CHROME_PATH if Chrome is not in the default Windows location.

import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import gifenc from "gifenc";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";

const { GIFEncoder, applyPalette, quantize } = gifenc;
const root = process.argv[2];
if (!root) throw new Error("Usage: node scripts/record-demo.mjs <built folder>");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, "index.html") : path;
  if (!existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await page.setViewport({ width: 375, height: 700, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await page.click(".start .btn");
await page.waitForFunction(() => [...document.querySelectorAll(".block.target")].some((b) => (b.textContent ?? "").length > 1), { timeout: 8000 });

const frames = [];
let stop = false;
const camera = (async () => {
  while (!stop) {
    frames.push({ buf: await page.screenshot({ type: "png" }), t: Date.now() });
    await sleep(40);
  }
})();

// About three lines of the verse, then the rhyme helper on the current word.
await sleep(9000);
await page.evaluate(() => document.querySelector(".current button.block.target, button.block.target")?.click());
await sleep(2600);
stop = true;
await camera;
await browser.close();
server.close();

// Merge repeated frames (the earlier one just shows longer), then give each
// frame its own small palette: the 8-bit look needs few colors.
const unique = [];
for (const f of frames) {
  const png = PNG.sync.read(f.buf);
  const last = unique[unique.length - 1];
  if (last && Buffer.compare(last.png.data, png.data) === 0) continue;
  unique.push({ png, t: f.t });
}
const gif = GIFEncoder();
unique.forEach(({ png, t }, i) => {
  const next = unique[i + 1];
  const delay = next ? next.t - t : 2000;
  const rgba = new Uint8Array(png.data);
  const palette = quantize(rgba, 64);
  gif.writeFrame(applyPalette(rgba, palette), png.width, png.height, { palette, delay: Math.max(20, delay) });
});
gif.finish();
mkdirSync("docs", { recursive: true });
writeFileSync("docs/demo.gif", gif.bytes());
console.log(`docs/demo.gif: ${unique.length} frames, ${(gif.bytes().length / 1024).toFixed(0)} KB`);
