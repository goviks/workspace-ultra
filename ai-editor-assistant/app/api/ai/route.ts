import type { NextRequest } from "next/server";
import { z } from "zod";

import { streamMockCompletion } from "@/lib/ai/mock";
import { streamChatCompletion, UpstreamError } from "@/lib/ai/openai";
import { buildMessages, maxInputChars } from "@/lib/ai/prompt";
import { createAIError, errorFromStatus, normalizeError } from "@/lib/errors";
import { encodeEvent } from "@/lib/stream/ndjson";
import type { AIError, StreamEvent } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UPSTREAM_TIMEOUT_MS = Number.parseInt(
  process.env.AI_REQUEST_TIMEOUT_MS ?? "45000",
  10,
);

function jsonError(error: AIError, status: number): Response {
  return Response.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function toStreamError(error: unknown): AIError {
  if (error instanceof UpstreamError) {
    return errorFromStatus(error.status);
  }
  return normalizeError(error);
}

export async function POST(request: NextRequest): Promise<Response> {
  const startedAt = Date.now();
  const limit = maxInputChars();

  const bodySchema = z.object({
    text: z.string().trim().min(1).max(limit),
    mode: z.enum(["improve", "shorten", "formalize"]).default("improve"),
  });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(
      createAIError("bad_request", { message: "Тело запроса должно быть JSON." }),
      400,
    );
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    const tooLong =
      typeof (payload as { text?: unknown }).text === "string" &&
      ((payload as { text: string }).text.length as number) > limit;

    return tooLong
      ? jsonError(
          createAIError("payload_too_large", {
            message: `Фрагмент длиннее ${limit} символов (${(payload as { text: string }).text.length}).`,
          }),
          413,
        )
      : jsonError(createAIError("bad_request"), 400);
  }

  const { text, mode } = parsed.data;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const useMock = !apiKey && process.env.AI_MOCK === "1";

  if (!apiKey && !useMock) {
    return jsonError(createAIError("missing_key"), 500);
  }

  const model = useMock ? "mock-editor" : (process.env.OPENAI_MODEL ?? "gpt-4o-mini");
  const encoder = new TextEncoder();
  let streamClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          streamClosed = true;
        }
      };

      const upstream = new AbortController();
      const abortUpstream = () => upstream.abort();
      request.signal.addEventListener("abort", abortUpstream, { once: true });

      const timeout = setTimeout(() => {
        upstream.abort();
      }, UPSTREAM_TIMEOUT_MS);

      try {
        let chars = 0;
        let completionTokens: number | undefined;

        const onDelta = (delta: string) => {
          chars += delta.length;
          send({ type: "delta", text: delta });
        };

        if (useMock) {
          await streamMockCompletion({ mode, signal: upstream.signal, onDelta });
        } else {
          const result = await streamChatCompletion({
            apiKey: apiKey as string,
            model,
            messages: buildMessages(text, mode),
            signal: upstream.signal,
            onDelta,
          });
          completionTokens = result.completionTokens;
        }

        if (request.signal.aborted) return;

        if (chars === 0) {
          send({ type: "error", error: createAIError("empty_response") });
        } else {
          send({
            type: "done",
            meta: { model, durationMs: Date.now() - startedAt, completionTokens },
          });
        }
      } catch (error) {
        if (request.signal.aborted) return;

        if (upstream.signal.aborted) {
          send({ type: "error", error: createAIError("timeout") });
        } else {
          send({ type: "error", error: toStreamError(error) });
        }
      } finally {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", abortUpstream);
        if (!streamClosed) {
          streamClosed = true;
          try {
            controller.close();
          } catch {
          }
        }
      }
    },

    cancel() {
      streamClosed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
