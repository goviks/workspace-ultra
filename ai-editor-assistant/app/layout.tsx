import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI-редактор — ассистент со стримингом",
  description:
    "Портфолио-проект: AI-ассистент внутри текстового редактора. Стриминг токенов, отмена запроса, обработка ошибок и доступность.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-900 font-sans text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
