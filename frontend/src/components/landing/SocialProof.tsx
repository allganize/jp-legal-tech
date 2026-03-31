"use client";

import FadeIn from "./FadeIn";
import AnimatedCounter from "./AnimatedCounter";

export default function SocialProof() {
  return (
    <section className="bg-[#1B2A4A] py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <FadeIn delay={0}>
            <AnimatedCounter
              target={65466}
              suffix="+"
              label="分析済み判例"
            />
          </FadeIn>
          <FadeIn delay={0.1}>
            <AnimatedCounter
              target={12266}
              suffix="+"
              label="登録裁判官"
            />
          </FadeIn>
          <FadeIn delay={0.2}>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-bold font-mono text-[#C5A55A]">
                  80年
                </span>
                <span className="text-3xl md:text-4xl font-bold font-mono text-[#C5A55A]">
                  +
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-2">データ蓄積年数</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
