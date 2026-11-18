// Browser integration runner with an actual emulated viewport, including Chrome's <500px case.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const [url, widthArg, artifacts, stem] = process.argv.slice(2);
const width = Number(widthArg),
  height = width < 800 ? 844 : 1100;
if (
  !/^http:\/\/localhost:5173\/tests\/proposition-live\.html$/.test(url) ||
  ![390, 1440].includes(width)
)
  throw new Error(
    "Use the isolated Proposition test URL and supported viewport.",
  );
await mkdir(artifacts, { recursive: true });
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${path.join(artifacts, `chrome-cdp-${stem}`)}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
);
let logs = "",
  socket,
  sequence = 0;
const pending = new Map();
chrome.stderr.on("data", (data) => {
  logs += data.toString();
});
const deadline = Date.now() + 38000;
async function until(get, message) {
  while (Date.now() < deadline) {
    const value = await get();
    if (value) return value;
    await pause(100);
  }
  throw new Error(message);
}
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  return (
    await command("Runtime.evaluate", { expression, returnByValue: true })
  ).result.value;
}
try {
  const endpoint = await until(
    () => /DevTools listening on (ws:\/\/[^\s]+)/.exec(logs)?.[1],
    "Chrome did not start DevTools",
  );
  const endpointUrl = new URL(endpoint);
  const pages = await (
    await fetch(`http://${endpointUrl.host}/json/list`)
  ).json();
  socket = new WebSocket(
    pages.find((page) => page.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data),
      waiter = pending.get(message.id);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800,
  });
  await command("Page.enable");
  await command("Page.navigate", { url });
  const result = await until(
    () => evaluate("document.body?.dataset.testResult"),
    "Browser flow did not finish",
  );
  const layout = await evaluate(
    "({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,pageRight:document.querySelector('.prop-page')?.getBoundingClientRect().right})",
  );
  const dom = await evaluate("document.documentElement.outerHTML");
  await writeFile(path.join(artifacts, `${stem}-dom.html`), dom);
  const screenshot = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    path.join(artifacts, `${stem}.png`),
    Buffer.from(screenshot.data, "base64"),
  );
  if (result !== "passed")
    throw new Error("Proposition browser flow failed; inspect DOM artifact.");
  if (
    layout.viewport !== width ||
    layout.scrollWidth > width ||
    layout.pageRight > width
  )
    throw new Error(
      `Layout exceeds intended viewport: ${JSON.stringify(layout)}`,
    );
  process.stdout.write(
    `PASS: real backend flow; viewport ${width}x${height}; no horizontal page overflow.\n`,
  );
} finally {
  if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ id: ++sequence, method: "Browser.close" }));
  for (const waiter of pending.values()) clearTimeout(waiter.timer);
  socket?.close();
  chrome.kill();
  await writeFile(path.join(artifacts, `${stem}-chrome.log`), logs);
}
