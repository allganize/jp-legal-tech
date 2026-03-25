"use client";

import { usePathname } from "next/navigation";

export default function ConditionalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <main>{children}</main>;
  }

  return (
    <>
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-semibold text-stone-900">
              Machu Picchu
            </a>
            <nav className="flex gap-1">
              <a
                href="/dashboard"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
              >
                판사 분석
              </a>
              <a
                href="/venue"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
              >
                관할 최적화
              </a>
              <a
                href="/regulation"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
              >
                규제 에이전트
              </a>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8">{children}</main>
    </>
  );
}
