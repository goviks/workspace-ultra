const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const TEXT =
  "Привет! Мы хотим запустить лендинг 14 ноября и надо чтобы к этому времени были готовы тексты, дизайн и аналитика.";

async function post(body, signal) {
  return fetch(`${BASE_URL}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify(body),
    signal,
  });
}

async function readStream(response, startedAt) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buffer = "";
  let firstChunkAt = null;
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstChunkAt === null && value.length > 0) firstChunkAt = performance.now() - startedAt;
    size += value.length;
    buffer += decoder.decode(value, { stream: true });

    let index = buffer.indexOf("\n");
    while (index !== -1) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      index = buffer.indexOf("\n");
      if (line) events.push({ at: performance.now() - startedAt, event: JSON.parse(line) });
    }
  }

  return { events, firstChunkAt, totalMs: performance.now() - startedAt, size };
}

const checks = [];
function check(name, condition, detail = "") {
  checks.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

{
  const response = await fetch(BASE_URL);
  const html = await response.text();
  check("GET / → 200", response.status === 200, `status=${response.status}`);
  check("HTML содержит заголовок панели", html.includes("AI-ассистент"));
  check("HTML содержит кнопку улучшения", html.includes("Улучшить с AI"));
}

{
  const requestStartedAt = performance.now();
  const response = await post({ text: TEXT, mode: "improve" });
  check("POST /api/ai → 200", response.status === 200, `status=${response.status}`);
  check(
    "Content-Type = NDJSON",
    (response.headers.get("content-type") ?? "").includes("x-ndjson"),
    response.headers.get("content-type") ?? "",
  );

  const { events, firstChunkAt, totalMs, size } = await readStream(response, requestStartedAt);
  const deltas = events.filter((entry) => entry.event.type === "delta");
  const final = events.at(-1)?.event;

  check("несколько delta-событий", deltas.length > 5, `${deltas.length} дельт`);
  check("первый чанк быстрее полного ответа", (firstChunkAt ?? 0) < totalMs, `TTFB=${Math.round(firstChunkAt)}ms, всего=${Math.round(totalMs)}ms`);
  check("последнее событие = done", final?.type === "done", final?.type ?? "нет");
  check("meta.model заполнена", Boolean(final?.meta?.model), final?.meta?.model);

  const text = deltas.map((entry) => entry.event.text).join("");
  check("текст собран целиком", text.length > 100, `${text.length} символов, ${size} байт`);
  check("дельты приходят во времени, а не пачкой", deltas.at(-1).at - deltas[0].at > 200, `${Math.round(deltas.at(-1).at - deltas[0].at)}ms разброс`);
}

{
  const controller = new AbortController();
  const response = await post({ text: TEXT, mode: "shorten" }, controller.signal);
  const reader = response.body.getReader();
  await reader.read();
  controller.abort();

  let aborted = false;
  try {
    while (!(await reader.read()).done) {
    }
  } catch (error) {
    aborted = error.name === "AbortError";
  }
  check("AbortController рвёт поток", aborted, "AbortError");
}

{
  const empty = await post({ text: "   ", mode: "improve" });
  const body = await empty.json();
  check("пустой текст → 400 + bad_request", empty.status === 400 && body.error?.code === "bad_request", `${empty.status}/${body.error?.code}`);

  const long = await post({ text: "а".repeat(7000), mode: "improve" });
  const longBody = await long.json();
  check("длинный текст → 413 + payload_too_large", long.status === 413 && longBody.error?.code === "payload_too_large", `${long.status}/${longBody.error?.code}`);

  const broken = await fetch(`${BASE_URL}/api/ai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{oops" });
  const brokenBody = await broken.json();
  check("битый JSON → 400", broken.status === 400 && brokenBody.error?.code === "bad_request", `${broken.status}/${brokenBody.error?.code}`);

  const unauthorized = await post({ text: TEXT, mode: "improve" });
  check("проверка ключа не течёт в ответ", !/sk-[a-zA-Z0-9]/.test(await unauthorized.text()));
}

const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} проверок пройдено`);
process.exitCode = failed.length === 0 ? 0 : 1;
