import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legal Tech Platform",
  description: "판사 판결 분석 & 규제 에이전트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <a href="/" className="text-xl font-bold text-slate-800">
                Legal Tech
              </a>
              <nav className="flex gap-1">
                <a
                  href="/"
                  className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  &#9878; 판사 분석
                </a>
                <a
                  href="/venue"
                  className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  &#9878; 관할 최적화
                </a>
                <a
                  href="/regulation"
                  className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  &#9881; 규제 에이전트
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
