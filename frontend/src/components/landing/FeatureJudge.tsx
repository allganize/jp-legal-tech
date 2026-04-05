"use client";

import { ChartBar, UserCircle, MagnifyingGlass } from "@phosphor-icons/react";
import FadeIn from "./FadeIn";

const features = [
  { icon: ChartBar, text: "判決傾向の統計分析" },
  { icon: UserCircle, text: "AI裁判官ペルソナ生成" },
  { icon: MagnifyingGlass, text: "裁判官別専門分野の探索" },
];

export default function FeatureJudge() {
  return (
    <section id="features" className="py-24 md:py-32 bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 md:gap-16 items-center">
          {/* Left: text */}
          <FadeIn direction="left">
            <div>
              <span className="font-mono text-sm text-emerald-400">01</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#2D2D2D] mt-2">
                裁判官の判決パターンを
                <br />
                AIが分析します
              </h2>
              <p className="text-[#2D2D2D]/60 text-base max-w-sm leading-relaxed mt-4">
                数千件の判決データに基づき裁判官別の傾向を分析し、訴訟戦略
                策定に必要なインサイトを提供します。
              </p>

              <div className="mt-6 space-y-3">
                {features.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon size={20} className="text-stone-800 shrink-0" />
                    <span className="text-sm text-[#2D2D2D]/70">{text}</span>
                  </div>
                ))}
              </div>

              <a
                href="/dashboard"
                className="inline-block mt-6 text-sm font-medium text-stone-800 hover:text-emerald-800 transition-colors"
              >
                裁判官を検索する &rarr;
              </a>
            </div>
          </FadeIn>

          {/* Right: mock card */}
          <FadeIn direction="up" delay={0.15}>
            <div className="rounded-2xl bg-white border border-stone-200 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
              <div className="mb-6">
                <p className="font-semibold text-[#2D2D2D]">田中太郎 裁判官</p>
                <p className="text-sm text-[#2D2D2D]/50">東京地方裁判所</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "認容率", width: "70%" },
                  { label: "却下率", width: "45%" },
                  { label: "棄却率", width: "85%" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[#2D2D2D]/40">
                        {bar.label}
                      </span>
                      <span className="text-xs font-mono text-[#2D2D2D]/40">
                        {bar.width}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-emerald-100">
                      <div
                        className="h-2 rounded-full bg-emerald-700"
                        style={{ width: bar.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
