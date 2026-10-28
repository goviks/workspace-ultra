import type { AIError, AIErrorCode } from "@/types/ai";

const CATALOG: Record<
  AIErrorCode,
  { message: string; hint?: string; retryable: boolean }
> = {
  missing_key: {
    message: "AI-ключ не настроен на сервере.",
    hint: "Добавьте OPENAI_API_KEY в .env.local и перезапустите dev-сервер.",
    retryable: false,
  },
  unauthorized: {
    message: "OpenAI отклонил запрос: неверный или отозванный ключ.",
    hint: "Проверьте OPENAI_API_KEY в .env.local — ключ должен начинаться с sk-.",
    retryable: false,
  },
  rate_limit: {
    message: "Слишком много запросов к модели.",
    hint: "Подождите 10–20 секунд и нажмите «Повторить».",
    retryable: true,
  },
  payload_too_large: {
    message: "Выделенный фрагмент слишком длинный.",
    hint: "Выделите текст короче и попробуйте снова.",
    retryable: false,
  },
  bad_request: {
    message: "Запрос не принят: выделенный текст пустой или некорректный.",
    hint: "Выделите фрагмент ещё раз и нажмите «Улучшить с AI».",
    retryable: false,
  },
  timeout: {
    message: "Модель не ответила за 45 секунд.",
    hint: "Сеть или провайдер тормозят. Попробуйте повторить запрос.",
    retryable: true,
  },
  empty_response: {
    message: "Модель вернула пустой ответ.",
    hint: "Попробуйте другой фрагмент или нажмите «Повторить».",
    retryable: true,
  },
  network: {
    message: "Не удалось соединиться с сервером.",
    hint: "Проверьте интернет-соединение и повторите попытку.",
    retryable: true,
  },
  aborted: {
    message: "Генерация отменена.",
    hint: "Часть ответа сохранена — можно вставить её или запустить заново.",
    retryable: true,
  },
  server: {
    message: "Сервер не смог обработать запрос.",
    hint: "Это не ваша ошибка. Попробуйте ещё раз через несколько секунд.",
    retryable: true,
  },
};

export function createAIError(
  code: AIErrorCode,
  overrides: Partial<Omit<AIError, "code">> = {},
): AIError {
  const base = CATALOG[code];
  return {
    code,
    message: overrides.message ?? base.message,
    hint: overrides.hint ?? base.hint,
    retryable: overrides.retryable ?? base.retryable,
    status: overrides.status,
  };
}

export function codeFromStatus(status: number): AIErrorCode {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 429) return "rate_limit";
  if (status === 413) return "payload_too_large";
  if (status === 400 || status === 422) return "bad_request";
  return "server";
}

export function errorFromStatus(status: number): AIError {
  return createAIError(codeFromStatus(status), { status });
}

export function normalizeError(error: unknown): AIError {
  if (error instanceof Error && error.name === "AbortError") {
    return createAIError("aborted");
  }
  if (error instanceof TypeError) {
    return createAIError("network");
  }
  return createAIError("server", {
    message: error instanceof Error ? error.message : undefined,
  });
}
