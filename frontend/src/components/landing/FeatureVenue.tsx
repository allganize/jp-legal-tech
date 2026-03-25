"use client";

import { Scales, MapPin, Trophy } from "@phosphor-icons/react";
import FadeIn from "./FadeIn";

const features = [
  { icon: Scales, text: "법원별 판결 경향 비교" },
  { icon: MapPin, text: "지역 관할 분석" },
  { icon: Trophy, text: "최적 관할 추천" },
];

function CourtCard({
  name,
  rate,
  recommended,
}: {
  name: string;
  rate: string;
  recommended?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white border border-stone-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <p className="font-semibold text-sm text-stone-900">{name}</p>
        {recommended && (
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            추천
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-emerald-100 mb-2">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: rate }}
        />
      </div>
      <p className="font-mono text-xs text-stone-400">인용률 {rate}</p>
    </div>
  );
}

export default function FeatureVenue() {
  return (
    <section className="py-24 md:py-32 bg-stone-50/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-12 md:gap-16 items-center">
          {/* Left: visual (order-last on mobile) */}
          <FadeIn direction="up">
            <div className="order-last md:order-none grid grid-cols-2 gap-4">
              <CourtCard name="서울중앙지법" rate="67.2%" />
              <CourtCard name="수원지방법원" rate="74.8%" recommended />
            </div>
          </FadeIn>

          {/* Right: text */}
          <FadeIn direction="right" delay={0.15}>
            <div className="order-first md:order-none">
              <span className="font-mono text-sm text-emerald-600">02</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mt-2">
                최적의 관할을
                <br />
                데이터로 찾습니다
              </h2>
              <p className="text-stone-500 text-base max-w-sm leading-relaxed mt-4">
                법원별 판결 경향과 인용률을 비교 분석하여 가장 유리한 관할법원을
                데이터 기반으로 추천합니다.
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
                href="/venue"
                className="inline-block mt-6 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                관할 분석하기 &rarr;
              </a>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
