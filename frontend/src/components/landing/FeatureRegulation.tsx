"use client";

import { Bell, FileText, EnvelopeSimple } from "@phosphor-icons/react";
import FadeIn from "./FadeIn";

const features = [
  { icon: Bell, text: "リアルタイム規制モニタリング" },
  { icon: FileText, text: "リサーチメモ自動生成" },
  { icon: EnvelopeSimple, text: "クライアント案内文生成" },
];

const regulations = [
  {
    title: "AI基本法施行令改正案",
    level: "高",
    color: "bg-red-500",
    date: "2025.12.15",
  },
  {
    title: "個人情報処理ガイドライン",
    level: "中",
    color: "bg-amber-500",
    date: "2025.12.12",
  },
  {
    title: "電子金融取引法改正",
    level: "低",
    color: "bg-emerald-500",
    date: "2025.12.10",
  },
];

export default function FeatureRegulation() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] md:grid-rows-2 gap-4 md:gap-6">
          {/* Left main card */}
          <FadeIn delay={0}>
            <div className="md:row-span-2 rounded-2xl bg-white border border-stone-200 p-8 md:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] h-full">
              <span className="font-mono text-sm text-emerald-600">04</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mt-2">
                規制変化を自動で
                <br />
                追跡し対応します
              </h2>
              <p className="text-stone-500 text-base max-w-md leading-relaxed mt-4">
                最新の法律および規制変更事項をリアルタイムでモニタリングし、AIが
                自動でリサーチメモとクライアント案内文を生成します。
              </p>

              <div className="mt-6 space-y-3">
                {features.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon size={20} className="text-emerald-600 shrink-0" />
                    <span className="text-sm text-stone-600">{text}</span>
                  </div>
                ))}
              </div>

              <a
                href="/regulation"
                className="inline-block mt-6 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                規制フィードを見る &rarr;
              </a>
            </div>
          </FadeIn>

          {/* Top-right: latest regulations */}
          <FadeIn delay={0.1}>
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
                最新規制
              </h3>
              <div className="space-y-3">
                {regulations.map((reg) => (
                  <div key={reg.title} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${reg.color}`}
                    />
                    <div>
                      <p className="text-sm text-stone-700">{reg.title}</p>
                      <p className="text-xs text-stone-400">{reg.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Bottom-right: auto-generated docs */}
          <FadeIn delay={0.2}>
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
                自動生成文書
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {["リサーチメモ", "クライアント案内文", "ニュースレター"].map((tag) => (
                  <span
                    key={tag}
                    className="bg-stone-100 rounded-lg px-3 py-2 text-xs text-stone-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded bg-stone-200 w-full" />
                <div className="h-3 rounded bg-stone-200 w-4/5" />
                <div className="h-3 rounded bg-stone-100 w-3/5" />
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
