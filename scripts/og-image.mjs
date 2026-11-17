// Makes public/og.png: the picture shown when the app's link is shared in a
// chat or on social media. Takes a phone screenshot of a real session, then
// lays it out on a 1200 by 630 card next to the name and what the app does.
//   node scripts/og-image.mjs <built folder>
// Build with: npx vite build --base ./ --outDir <built folder>
// Set CHROME_PATH if Chrome is not in the default Windows location.

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";

const root = process.argv[2];
if (!root) throw new Error("Usage: node scripts/og-image.mjs <built folder>");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const font = (pkg, file) => readFileSync(`node_modules/@fontsource/${pkg}/files/${file}`).toString("base64");

const server = createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, "index.html") : path;
  if (!existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  // 1. A phone screenshot a few lines into a session, with words on the blocks.
  const phone = await browser.newPage();
  await phone.setViewport({ width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await phone.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle0" });
  await phone.evaluate(() => document.fonts.ready);
  await phone.click(".start .btn");
  await phone.waitForFunction(() => [...document.querySelectorAll(".block.target")].some((b) => (b.textContent ?? "").length > 1), { timeout: 8000 });
  // Wait for line 1, when a whole AABB verse shows: the current bar and the three below.
  await phone.waitForFunction(() => /^LINE 1$/.test(document.querySelector(".caption")?.textContent ?? ""), { timeout: 20000, polling: 50 });
  await sleep(700);
  const shot = Buffer.from(await phone.screenshot({ type: "png" })).toString("base64");
  await phone.close();

  // 2. The card.
  const card = await browser.newPage();
  await card.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await card.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: "Press Start 2P"; src: url(data:font/woff2;base64,${font("press-start-2p", "press-start-2p-latin-400-normal.woff2")}) format("woff2"); }
    @font-face { font-family: "VT323"; src: url(data:font/woff2;base64,${font("vt323", "vt323-latin-400-normal.woff2")}) format("woff2"); }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
    body {
      background-color: #2e2c33;
      background-image:
        linear-gradient(#35333b 2px, transparent 2px),
        linear-gradient(90deg, #35333b 2px, transparent 2px);
      background-size: 40px 40px;
      color: #ece6dc;
      font-family: "VT323", monospace;
      position: relative;
    }
    .px { clip-path: polygon(0 8px, 8px 8px, 8px 0, calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)); }
    .left { position: absolute; left: 72px; top: 64px; width: 650px; }
    .tag { display: inline-block; font-size: 30px; color: #2e2c33; background: #b8c0ef; padding: 2px 16px 4px; }
    h1 { font-family: "Press Start 2P", monospace; font-weight: 400; font-size: 76px; line-height: 1.15; margin: 28px 0 0; color: #f4c7a1; text-shadow: 6px 6px 0 #1f1e23; }
    h1 span { color: #ece6dc; }
    ul { list-style: none; padding: 0; margin: 22px 0 0; display: flex; gap: 30px; font-size: 34px; white-space: nowrap; color: #f4c7a1; }
    li::before { content: "> "; color: #a39ea9; }
    p { font-size: 42px; line-height: 1.08; margin: 26px 0 0; }
    .url { position: absolute; left: 72px; bottom: 44px; font-size: 32px; color: #a39ea9; }
    .phone { position: absolute; right: 86px; top: 46px; width: 318px; padding: 12px; background: #1f1e23; }
    .phone img { display: block; width: 100%; }
  </style></head><body>
    <div class="left">
      <span class="tag px">FREE. NO ADS. NO ACCOUNT.</span>
      <h1>INSERT<br><span>RHYME</span></h1>
      <p>Freestyle rap practice. Rap over a beat and see exactly where to land your rhymes.</p>
      <ul><li>61 beats</li><li>rhyme prompts</li><li>58 themes</li></ul>
    </div>
    <div class="url">ethanmanco.github.io/insert-rhyme</div>
    <div class="phone px"><img class="px" src="data:image/png;base64,${shot}"></div>
  </body></html>`);
  await card.evaluate(() => document.fonts.ready);
  await card.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await card.screenshot({ path: "public/og.png", type: "png" });
  console.log("wrote public/og.png");
} finally {
  await browser.close();
  server.close();
}
