import type { AssistMode } from "@/types/ai";

const MOCK_RESULTS: Record<AssistMode, string> = {
  improve:
    "Привет! Хочу обсудить запуск лендинга. Мы планируем выйти в релиз 14 ноября, и к этому моменту нужно закрыть три вещи: тексты, дизайн и аналитику. По текстам я жду правки от тебя до пятницы. Дизайн почти готов — осталось согласовать главный экран. Аналитику настроим на следующей неделе. Если сроки не подходят, напиши, что именно сдвинуть.",
  shorten:
    "Привет! Планируем выпустить лендинг 14 ноября. До релиза нужно закрыть тексты, дизайн и аналитику: правки по текстам жду до пятницы, главный экран дизайна осталось согласовать, аналитику настроим на следующей неделе. Если сроки не подходят, напиши, что сдвинуть.",
  formalize:
    "Здравствуйте! Хочу обсудить запуск лендинга. Релиз запланирован на 14 ноября. До этой даты необходимо завершить три задачи: подготовку текстов, доработку дизайна и настройку аналитики. Правки по текстам ожидаются до пятницы. В дизайне осталось согласовать главный экран; настройка аналитики запланирована на следующую неделю. Если указанные сроки не подходят, сообщите, какие из них следует скорректировать.",
};

const FIRST_TOKEN_DELAY_MS = 700;
const TOKEN_DELAY_MS = 35;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function streamMockCompletion({
  mode,
  signal,
  onDelta,
}: {
  mode: AssistMode;
  signal: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<void> {
  await sleep(FIRST_TOKEN_DELAY_MS, signal);

  const words = MOCK_RESULTS[mode].split(/(\s+)/);

  for (const word of words) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (word.trim().length > 0) {
      onDelta(word);
      await sleep(TOKEN_DELAY_MS, signal);
    } else {
      onDelta(word);
    }
  }
}
