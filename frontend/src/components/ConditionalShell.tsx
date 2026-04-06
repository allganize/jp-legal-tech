"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

const NAV_KEYS = [
  { href: "/dashboard", key: "nav.judge" },
  { href: "/search", key: "nav.search" },
  { href: "/strategy", key: "nav.strategy" },
];

export default function ConditionalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { locale, setLocale, locales, localeLabels, t } = useI18n();
  const { user, logout } = useAuth();

  if (pathname === "/") {
    return <main>{children}</main>;
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <a href="/" className="text-xl font-semibold text-stone-800">
              判例AI
            </a>
            {/* Desktop nav */}
            <nav className="hidden md:flex gap-1">
              {NAV_KEYS.map(({ href, key }) => (
                <a
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    isActive(href)
                      ? "bg-emerald-600 text-white"
                      : "text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {t(key)}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-stone-500">{user.name || user.email}</span>
                <button
                  onClick={logout}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
            {/* Language dropdown */}
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              aria-label="言語選択"
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeLabels[l]}
                </option>
              ))}
            </select>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
              aria-label="メニューを開く"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {mobileOpen ? (
                  <path d="M5 5l10 10M15 5L5 15" />
                ) : (
                  <path d="M3 5h14M3 10h14M3 15h14" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-stone-100 bg-white px-4 py-2 space-y-1">
            {NAV_KEYS.map(({ href, key }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 text-sm rounded-lg ${
                  isActive(href)
                    ? "bg-emerald-600 text-white"
                    : "text-stone-600 hover:bg-emerald-50"
                }`}
              >
                {t(key)}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        {children}
      </main>
    </>
  );
}
