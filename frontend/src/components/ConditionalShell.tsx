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
            <a href="/" className="text-xl font-semibold text-[#1B2A4A]">
              判例AI
            </a>
            <nav className="flex gap-1">
              <a
                href="/dashboard"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-[#E8EDF5] hover:text-[#1B2A4A] transition-colors"
              >
                裁判官分析
              </a>
              <a
                href="/venue"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-[#E8EDF5] hover:text-[#1B2A4A] transition-colors"
              >
                管轄最適化
              </a>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8">{children}</main>
    </>
  );
}
