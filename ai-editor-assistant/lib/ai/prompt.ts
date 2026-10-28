import type { AssistMode } from "@/types/ai";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export const MODE_LABELS: Record<AssistMode, string> = {
  improve: "Улучшить",
  shorten: "Сократить",
  formalize: "Формальнее",
};

const SYSTEM_PROMPT = [
  "Ты — опытный редактор русскоязычных текстов.",
  "Ты получаешь фрагмент черновика и переписываешь его.",
  "Правила:",
  "1. Отвечай только готовым текстом — без вступлений, пояснений и markdown.",
  "2. Сохраняй смысл, факты, имена, цифры и обращение к адресату.",
  "3. Не добавляй факты, которых нет во фрагменте.",
  "4. Пиши на том же языке, что и фрагмент.",
  "5. Длина результата — близкая к исходной, если не просят иное.",
].join("\n");

const MODE_INSTRUCTIONS: Record<AssistMode, string> = {
  improve:
    "Сделай текст яснее и грамотнее: убери канцелярит и повторы, поправь грамматику, сохрани авторский голос.",
  shorten:
    "Сократи текст примерно на треть, оставив только существенное. Смысл и все факты должны сохраниться.",
  formalize:
    "Переведи текст в деловой, нейтральный тон. Убери разговорные выражения и эмоциональные оценки.",
};

export function buildMessages(text: string, mode: AssistMode): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        MODE_INSTRUCTIONS[mode],
        "",
        "Фрагмент (между маркерами):",
        "<<<",
        text,
        ">>>",
      ].join("\n"),
    },
  ];
}

export function maxInputChars(): number {
  const parsed = Number.parseInt(process.env.AI_MAX_INPUT_CHARS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 6000;
}
