"use client";

import { ChartBar, UserCircle, MagnifyingGlass } from "@phosphor-icons/react";
import FadeIn from "./FadeIn";

const features = [
  { icon: ChartBar, text: "판결 성향 통계 분석" },
  { icon: UserCircle, text: "AI 판사 페르소나 생성" },
  { icon: MagnifyingGlass, text: "판사별 전문 분야 탐색" },
];

export default function FeatureJudge() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 md:gap-16 items-center">
          {/* Left: text */}
          <FadeIn direction="left">
            <div>
              <span className="font-mono text-sm text-emerald-600">01</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mt-2">
                판사의 판결 패턴을
                <br />
                AI가 분석합니다
              </h2>
              <p className="text-stone-500 text-base max-w-sm leading-relaxed mt-4">
                수천 건의 판결 데이터를 기반으로 판사별 성향을 분석하고, 소송
                전략 수립에 필요한 인사이트를 제공합니다.
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
                href="/dashboard"
                className="inline-block mt-6 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                판사 검색하기 &rarr;
              </a>
            </div>
          </FadeIn>

          {/* Right: mock card */}
          <FadeIn direction="up" delay={0.15}>
            <div className="rounded-2xl bg-white border border-stone-200 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
              <div className="mb-6">
                <p className="font-semibold text-stone-900">김정원 판사</p>
                <p className="text-sm text-stone-500">서울중앙지방법원</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "인용률", width: "70%" },
                  { label: "각하율", width: "45%" },
                  { label: "기각률", width: "85%" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-stone-400">
                        {bar.label}
                      </span>
                      <span className="text-xs font-mono text-stone-400">
                        {bar.width}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-emerald-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
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
