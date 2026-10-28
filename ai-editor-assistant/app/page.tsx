import { Workspace } from "@/components/workspace";

const FEATURES = [
  {
    title: "Стриминг токен за токеном",
    text: "NDJSON поверх ReadableStream: текст появляется сразу, без «крутилки на 10 секунд».",
  },
  {
    title: "Отмена в один клик",
    text: "AbortController рвёт и клиентский fetch, и запрос к провайдеру на сервере.",
  },
  {
    title: "Понятные ошибки",
    text: "429, 401, таймаут и пустой ответ разведены по кодам — с подсказкой и кнопкой «Повторить».",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-indigo-300">
            Портфолио
          </span>
          <span className="text-xs text-slate-400">Next.js · App Router · TypeScript</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          AI-ассистент внутри текстового редактора
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Выделите фрагмент черновика и нажмите «Улучшить с AI» — ответ придёт
          потоком в боковую панель. Запрос можно отменить на полуслове, ошибку —
          повторить, результат — вставить обратно в текст.
        </p>
      </header>

      <Workspace />

      <section aria-label="Ключевые решения" className="grid gap-3 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4"
          >
            <h2 className="text-sm font-semibold text-slate-100">{feature.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {feature.text}
            </p>
          </article>
        ))}
      </section>

      <footer className="border-t border-slate-800 pt-4 text-xs text-slate-400">
        Ключ OpenAI живёт только в серверном route handler и не попадает в клиентский
        бандл. Демо-режим без ключа включается переменной{" "}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">AI_MOCK=1</code>.
      </footer>
    </main>
  );
}
