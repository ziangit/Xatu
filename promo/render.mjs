// Renders promo/intro.html to promo/out/xatu-intro.mp4.
//
//   node promo/render.mjs            render the film
//   node promo/render.mjs --serve    just serve it, for previewing over http
//
// The page is a pure function of time, so this steps t through every frame
// at 30fps, renders the soundtrack offline on the same clock, and hands both
// to ffmpeg. Needs Chrome and ffmpeg on the machine; nothing else.
//
// Sprites are proxied from Showdown through this server so the canvas stays
// same-origin and exportable. They are cached in promo/out/, which is
// gitignored — CLAUDE.md: never commit sprite assets.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out");
const CACHE = path.join(OUT, ".sprites");
fs.mkdirSync(CACHE, { recursive: true });
const FPS = 30, DUR = 30;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const sprite = url.pathname.match(/^\/sprites\/([a-z0-9-]+)\.png$/);
  if (sprite) {
    const file = path.join(CACHE, `${sprite[1]}.png`);
    if (!fs.existsSync(file)) {
      const remote = sprite[1] === "pokemonicons-sheet"
        ? "https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png"
        : `https://play.pokemonshowdown.com/sprites/gen5/${sprite[1]}.png`;
      const r = await fetch(remote);
      if (!r.ok) { res.writeHead(404).end(); return; }
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    res.writeHead(200, { "content-type": "image/png" }).end(fs.readFileSync(file));
    return;
  }
  if (url.pathname === "/" || url.pathname === "/intro.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(fs.readFileSync(path.join(HERE, "intro.html")));
    return;
  }
  res.writeHead(404).end();
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const PAGE = `http://127.0.0.1:${server.address().port}/intro.html`;

if (process.argv.includes("--serve")) {
  console.log(`serving ${PAGE}  (ctrl-c to stop)`);
} else {
  await render();
  server.close();
}

async function render() {
  const chrome = process.env.CHROME ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "xatu-render-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(chrome, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    // No --mute-audio: with it, OfflineAudioContext never finishes rendering
    // in headless Chrome, and the render sat at 0% CPU forever.
    "--no-first-run", "about:blank",
  ], { stdio: "ignore" });

  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await new Promise(r => setTimeout(r, 150));
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page"); } catch {}
  }
  if (!target) throw new Error("Chrome did not start — set CHROME to its binary");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const { ok, no } = pending.get(m.id); pending.delete(m.id); m.error ? no(new Error(m.error.message)) : ok(m.result); }
  };
  const send = (method, params = {}) => new Promise((ok, no) => { pending.set(++id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
  // Every call carries a timeout: a render that stalls should say where, not
  // sit at 0% CPU forever (which is exactly what the first version did).
  const evaluate = async (expr, ms = 60000) => {
    const r = await Promise.race([
      send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }),
      new Promise((_, no) => setTimeout(() => no(new Error(`timed out after ${ms}ms: ${expr.slice(0, 60)}`)), ms)),
    ]);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };

  console.log("chrome up — loading the page");
  // Runtime has to be enabled for `awaitPromise` to ever resolve. Without it
  // every synchronous evaluate works and the first async one — the offline
  // soundtrack render — hangs forever, which is how this was found.
  await send("Runtime.enable");
  await send("Page.enable");
  const loaded = new Promise(r => { const prev = ws.onmessage; ws.onmessage = e => { prev(e); if (JSON.parse(e.data).method === "Page.loadEventFired") r(); }; });
  await send("Page.navigate", { url: `${PAGE}?render` });
  await Promise.race([loaded, new Promise(r => setTimeout(r, 20000))]);
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    ready = await evaluate("window.ready === true", 5000).catch(() => false);
    if (!ready) await new Promise(r => setTimeout(r, 250));
  }
  if (!ready) throw new Error("the page never became ready (fonts or sprites did not load)");
  console.log("page ready");

  // Large values cannot come back through the DevTools socket in a single
  // message: the 7.7MB soundtrack simply never arrived, and the render sat at
  // 0% CPU waiting for it. So a value is parked on the page and pulled out in
  // slices.
  const pull = async (expr, ms = 60000) => {
    const len = await evaluate(`Promise.resolve(${expr}).then(v => (window.__pull = v).length)`, ms);
    const parts = [];
    for (let i = 0; i < len; i += 1 << 18) parts.push(await evaluate(`window.__pull.slice(${i}, ${i + (1 << 18)})`));
    return parts.join("");
  };

  process.stdout.write("soundtrack… ");
  const wav = path.join(OUT, "soundtrack.wav");
  fs.writeFileSync(wav, Buffer.from(await pull("window.renderWav()"), "base64"));
  console.log("done");

  const mp4 = path.join(OUT, "xatu-intro.mp4");
  const ff = spawn("ffmpeg", [
    "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-i", wav,
    // JPEG frames are full-range; X has a history of washing out or refusing
    // full-range (yuvj420p) uploads, so convert to broadcast range explicitly.
    "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-color_range", "tv",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", mp4,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  const frames = FPS * DUR;
  for (let f = 0; f < frames; f++) {
    const jpg = Buffer.from(await pull(`(window.seek(${f / FPS}), window.frame(0.95))`), "base64");
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once("drain", r));
    if (f % 90 === 0) console.log(`frames ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((ok, no) => ff.on("close", c => (c === 0 ? ok() : no(new Error(`ffmpeg exited ${c}`)))));
  console.log(`frames ${frames}/${frames}\n→ ${path.relative(process.cwd(), mp4)}`);

  ws.close();
  // Wait for Chrome to exit before removing its profile; it writes to the
  // directory while it shuts down.
  await new Promise(r => { proc.once("exit", r); proc.kill(); setTimeout(r, 3000); });
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
