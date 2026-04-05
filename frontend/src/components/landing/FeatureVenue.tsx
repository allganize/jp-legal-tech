"use client";

import { Scales, MapPin, Trophy } from "@phosphor-icons/react";
import FadeIn from "./FadeIn";

const features = [
  { icon: Scales, text: "裁判所別判決傾向の比較" },
  { icon: MapPin, text: "地域管轄分析" },
  { icon: Trophy, text: "最適管轄の推薦" },
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
    <div className="rounded-xl bg-white border border-emerald-700/15 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <p className="font-semibold text-sm text-[#2D2D2D]">{name}</p>
        {recommended && (
          <span className="text-xs bg-white/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
            推薦
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-emerald-100 mb-2">
        <div
          className="h-2 rounded-full bg-emerald-700"
          style={{ width: rate }}
        />
      </div>
      <p className="font-mono text-xs text-[#2D2D2D]/40">認容率 {rate}</p>
    </div>
  );
}

export default function FeatureVenue() {
  return (
    <section className="py-24 md:py-32 bg-emerald-100/30">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-12 md:gap-16 items-center">
          {/* Left: visual (order-last on mobile) */}
          <FadeIn direction="up">
            <div className="order-last md:order-none grid grid-cols-2 gap-4">
              <CourtCard name="東京地方裁判所" rate="67.2%" />
              <CourtCard name="大阪地方裁判所" rate="74.8%" recommended />
            </div>
          </FadeIn>

          {/* Right: text */}
          <FadeIn direction="right" delay={0.15}>
            <div className="order-first md:order-none">
              <span className="font-mono text-sm text-emerald-400">02</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#2D2D2D] mt-2">
                最適な管轄を
                <br />
                データで見つけます
              </h2>
              <p className="text-[#2D2D2D]/60 text-base max-w-sm leading-relaxed mt-4">
                裁判所別の判決傾向と認容率を比較分析し、最も有利な管轄裁判所を
                データに基づいて推薦します。
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
                href="/venue"
                className="inline-block mt-6 text-sm font-medium text-stone-800 hover:text-emerald-800 transition-colors"
              >
                管轄を分析する &rarr;
              </a>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
