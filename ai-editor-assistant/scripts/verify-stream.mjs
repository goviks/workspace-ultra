import assert from "node:assert/strict";

import { streamMockCompletion } from "../lib/ai/mock.ts";
import { createEventParser, encodeEvent } from "../lib/stream/ndjson.ts";

function createRouteStream(mode, signal) {
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  return new ReadableStream({
    async start(controller) {
      try {
        await streamMockCompletion({
          mode,
          signal,
          onDelta: (text) => {
            controller.enqueue(encoder.encode(encodeEvent({ type: "delta", text })));
          },
        });
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              type: "done",
              meta: { model: "mock-editor", durationMs: Date.now() - startedAt },
            }),
          ),
        );
      } catch {
        controller.enqueue(
          encoder.encode(
            encodeEvent({ type: "error", error: { code: "aborted", message: "aborted", retryable: true } }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}

async function consume(response, { onDelta, chunkSize = 7 } = {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createEventParser();
  let text = "";
  let doneEvent = null;
  let errorEvent = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (let offset = 0; offset < value.length; offset += chunkSize) {
      const slice = value.subarray(offset, Math.min(offset + chunkSize, value.length));
      for (const event of parser.push(decoder.decode(slice, { stream: true }))) {
        if (event.type === "delta") {
          text += event.text;
          onDelta?.(event.text);
        } else if (event.type === "done") {
          doneEvent = event;
        } else if (event.type === "error") {
          errorEvent = event;
        }
      }
    }
  }

  return { text, doneEvent, errorEvent };
}

{
  const controller = new AbortController();
  const response = new Response(createRouteStream("improve", controller.signal));
  const startedAt = performance.now();
  const chunks = [];
  let firstDeltaAt = null;

  const { text, doneEvent, errorEvent } = await consume(response, {
    onDelta: () => {
      firstDeltaAt ??= performance.now() - startedAt;
      chunks.push(1);
    },
  });

  assert.ok(text.length > 100, `текст слишком короткий: ${text.length}`);
  assert.equal(chunks.length > 5, true, "ответ пришёл одним куском, а не потоком");
  assert.ok(doneEvent, "не получено событие done");
  assert.equal(doneEvent.meta.model, "mock-editor");
  assert.equal(errorEvent, null);
  assert.ok(
    firstDeltaAt >= 600,
    `первый токен пришёл слишком рано (${Math.round(firstDeltaAt)}ms): состояние loading не увидеть`,
  );
  console.log(
    `ok  stream: TTFT=${Math.round(firstDeltaAt)}ms, ${chunks.length} дельт, ${text.length} символов`,
  );
}

{
  const controller = new AbortController();
  const response = new Response(createRouteStream("formalize", controller.signal));

  setTimeout(() => controller.abort(), 1400);
  const { text, errorEvent } = await consume(response, { chunkSize: 11 });

  assert.equal(errorEvent?.error.code, "aborted");
  assert.ok(text.length > 0, "должен остаться частичный текст");
  assert.ok(text.length < 500, "отмена не остановила генерацию");
  console.log(`ok  abort: остановлено после ${text.length} символов, код=${errorEvent.error.code}`);
}

{
  const results = new Map();
  for (const mode of ["improve", "shorten", "formalize"]) {
    const controller = new AbortController();
    const response = new Response(createRouteStream(mode, controller.signal));
    const { text } = await consume(response, { chunkSize: 64 });
    results.set(mode, text);
  }

  assert.notEqual(results.get("improve"), results.get("shorten"));
  assert.notEqual(results.get("improve"), results.get("formalize"));
  assert.ok(results.get("shorten").length < results.get("improve").length, "shorten должен быть короче");
  console.log("ok  modes: improve/shorten/formalize различаются, shorten короче");
}

console.log("\nВсе проверки протокола пройдены.");
