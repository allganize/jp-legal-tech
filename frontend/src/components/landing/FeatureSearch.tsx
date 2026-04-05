"use client";

import { MagnifyingGlass, FileText, ChartLine } from "@phosphor-icons/react";
import FadeIn from "./FadeIn";

const features = [
  { icon: MagnifyingGlass, text: "事実関係の類似性に基づく判例検索" },
  { icon: FileText, text: "AIによる関連判例の自動分析" },
  { icon: ChartLine, text: "タイムライン・チャートで視覚的に把握" },
];

function SearchPreview() {
  return (
    <div className="rounded-xl bg-white border border-[#1B2A4A]/15 p-5 shadow-sm space-y-3">
      <div className="rounded-lg bg-[#E8EDF5]/50 p-3">
        <p className="text-xs text-[#2D2D2D]/50 mb-1">事実関係</p>
        <p className="text-sm text-[#2D2D2D]/80 leading-relaxed">
          保育園が発達障害を持つ子供の入園を取り消し、保護者が損害賠償を請求...
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
          <span className="text-xs text-emerald-800 font-medium">
            東京地裁 令和4年 — 一部認容
          </span>
          <span className="text-[10px] font-mono text-emerald-600">
            高い関連性
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
          <span className="text-xs text-stone-700 font-medium">
            大阪高裁 令和2年 — 棄却
          </span>
          <span className="text-[10px] font-mono text-stone-500">関連あり</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
          <span className="text-xs text-stone-700 font-medium">
            横浜地裁 平成30年 — 認容
          </span>
          <span className="text-[10px] font-mono text-stone-500">関連あり</span>
        </div>
      </div>
    </div>
  );
}

export default function FeatureSearch() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 md:gap-16 items-center">
          {/* Left: text */}
          <FadeIn direction="left" delay={0.15}>
            <div>
              <span className="font-mono text-sm text-[#C5A55A]">03</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#2D2D2D] mt-2">
                事実関係で
                <br />
                類似判例を検索
              </h2>
              <p className="text-[#2D2D2D]/60 text-base max-w-sm leading-relaxed mt-4">
                キーワードではなく、事件の事実関係を入力するだけで
                AIが類似する過去の判例を自動的に検索・分析します。
              </p>

              <div className="mt-6 space-y-3">
                {features.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon size={20} className="text-[#1B2A4A] shrink-0" />
                    <span className="text-sm text-[#2D2D2D]/70">{text}</span>
                  </div>
                ))}
              </div>

              <a
                href="/search"
                className="inline-block mt-6 text-sm font-medium text-[#1B2A4A] hover:text-[#243656] transition-colors"
              >
                類似判例を検索する &rarr;
              </a>
            </div>
          </FadeIn>

          {/* Right: visual */}
          <FadeIn direction="up">
            <SearchPreview />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
