# Альтернатива: Vercel AI SDK

В MVP выбран «ручной» вариант — `fetch` + `response.body.getReader()` + `TextDecoder`.
Это осознанное решение, а не «не успели переписать». Ниже — честное сравнение
и готовый код, если захочется перейти.

## Сравнение

| Критерий | Ручной стрим (в проекте) | Vercel AI SDK (`ai` + `@ai-sdk/openai`) |
| --- | --- | --- |
| Пакеты | 0 дополнительных | `ai`, `@ai-sdk/openai` (~сотни КБ) |
| Контроль протокола | полный: сам формат событий, ошибки, метаданные | внутри SDK, свой data-протокол |
| Смена провайдера | вручную, но изолированно в `lib/ai/openai.ts` | одна строка, десятки провайдеров из коробки |
| `useChat` из коробки | нет, свой хук | да: сообщения, статусы, отмена, повторы |
| Отладка | видно каждый чанк | нужно знать внутренний протокол |
| Портфолио-ценность | видно, что понимаешь механику | видно, что знаешь экосистему |

Для портфолио ручной вариант выигрывает: интервьюер видит, что кандидат
понимает, что такое `ReadableStream`, `AbortController` и парсинг чанков,
а не просто нажал «npm install».

## Как выглядел бы route handler на AI SDK

```ts
// app/api/ai/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

import { buildMessages, maxInputChars } from "@/lib/ai/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { text, mode } = await request.json();

  if (typeof text !== "string" || !text.trim() || text.length > maxInputChars()) {
    return Response.json({ error: { code: "bad_request" } }, { status: 400 });
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: buildMessages(text, mode),
    abortSignal: request.signal,
  });

  // SDK сам отдаёт data-stream, который понимает useChat на клиенте
  return result.toDataStreamResponse();
}
```

## Как выглядел бы клиент

```tsx
"use client";

import { useChat } from "@ai-sdk/react";

export function AssistantPanel() {
  const { messages, status, error, append, stop, reload } = useChat({
    api: "/api/ai",
  });

  // status: 'ready' | 'submitted' | 'streaming' | 'error'
  // stop() — это и есть AbortController внутри SDK
  // reload() — повтор последнего запроса
}
```

## Что пришлось бы дописать руками

Даже с AI SDK понадобится:

1. Свои состояния `aborted` и `success` — SDK знает только `ready/submitted/streaming/error`.
2. Свой маппинг ошибок провайдера в человеческие сообщения (401/429/timeout).
3. Свой фокус-менеджмент и `aria-live` — доступность SDK не решает.
4. Свой лимит входа и валидацию — иначе любой может отправить 100 КБ текста.

То есть экономия — примерно 120 строк сетевого кода, а UI-слой всё равно свой.
