import type { ChatMessage } from "@/lib/ai/prompt";

export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class UpstreamError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
    this.detail = detail;
  }
}

interface StreamOptions {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

export async function streamChatCompletion({
  apiKey,
  model,
  messages,
  signal,
  onDelta,
}: StreamOptions): Promise<{ completionTokens?: number }> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.6,
      max_tokens: 800,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => "");
    let detail = raw.slice(0, 300);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      detail = parsed.error?.message ?? detail;
    } catch {
    }
    throw new UpstreamError(
      response.status || 502,
      detail || "OpenAI вернул ошибку без описания",
      detail,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completionTokens: number | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).replace(/\r$/, "").trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");

        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return { completionTokens };

        try {
          const chunk = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { completion_tokens?: number } | null;
          };
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) onDelta(delta);
          if (chunk.usage?.completion_tokens) {
            completionTokens = chunk.usage.completion_tokens;
          }
        } catch {
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { completionTokens };
}
