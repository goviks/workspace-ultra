import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3101";
const CDP_PORT = process.env.CDP_PORT ?? "9222";
const OUT = join(process.cwd(), "docs", "screenshots");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

mkdirSync(OUT, { recursive: true });

const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("Не найден page-таргет: запущен ли Edge с --remote-debugging-port?");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let messageId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  const resolver = pending.get(message.id);
  if (!resolver) return;
  pending.delete(message.id);
  if (message.error) {
    resolver.reject(new Error(JSON.stringify(message.error)));
  } else {
    resolver.resolve(message.result);
  }
};

function send(method, params = {}) {
  const id = ++messageId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
  }
  return result.result.value;
}

async function shot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(OUT, name), Buffer.from(data, "base64"));
  console.log(`saved ${name}`);
}

async function goto(url) {
  await send("Page.navigate", { url });
  await sleep(1800);
}

const selectAndRun = `(async () => {
  const area = document.querySelector('textarea');
  if (!area) throw new Error('textarea not found');
  area.focus();
  area.setSelectionRange(0, 160);
  area.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  area.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 150));
  const button = [...document.querySelectorAll('button')].find((item) =>
    item.textContent?.includes('Улучшить с AI'),
  );
  if (!button) throw new Error('improve button not found');
  if (button.disabled) throw new Error('button disabled: выделение не применилось');
  button.click();
  return document.querySelector('[role="log"]')?.getAttribute('aria-busy');
})()`;

const clickText = (text) => `(() => {
  const button = [...document.querySelectorAll('button')].find((item) =>
    item.textContent?.trim().includes(${JSON.stringify(text)}),
  );
  if (!button) throw new Error('кнопка не найдена: ${text}');
  button.click();
  return true;
})()`;

const desktopViewport = {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
};

await send("Page.enable");
await send("Runtime.enable");

await send("Emulation.setDeviceMetricsOverride", desktopViewport);

await goto(BASE);
await shot("01-idle.png");

await evaluate(selectAndRun);
await sleep(250);
await shot("02-loading.png");

await sleep(1000);
await shot("03-streaming.png");

await sleep(3200);
await shot("04-success.png");

await evaluate(clickText("Повторить"));
await sleep(1400);
await evaluate(clickText("Отменить"));
await sleep(300);
await shot("05-aborted.png");

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await goto(BASE);
await evaluate(selectAndRun);
await sleep(4600);
await shot("06-mobile.png");
await send("Emulation.clearDeviceMetricsOverride");

if (process.env.ERROR_BASE) {
  await send("Emulation.setDeviceMetricsOverride", desktopViewport);
  await goto(process.env.ERROR_BASE);
  await evaluate(selectAndRun);
  await sleep(1500);
  await shot("07-error.png");
}

socket.close();
console.log("Готово:", OUT);
