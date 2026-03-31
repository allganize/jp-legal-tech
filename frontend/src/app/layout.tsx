import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/ConditionalShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Machu Picchu — AIリーガルインテリジェンス",
  description: "弁護士のためのAIリーガルインテリジェンスプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", var(--font-geist-sans), sans-serif' }}
      >
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
