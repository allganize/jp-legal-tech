"use client";

import FadeIn from "./FadeIn";
import AnimatedCounter from "./AnimatedCounter";

export default function SocialProof() {
  return (
    <section className="bg-stone-100 py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <FadeIn delay={0}>
            <AnimatedCounter
              target={170000}
              suffix="+"
              label="분석된 판결문"
            />
          </FadeIn>
          <FadeIn delay={0.1}>
            <AnimatedCounter
              target={15000}
              suffix="+"
              label="등록된 판사 프로필"
            />
          </FadeIn>
          <FadeIn delay={0.2}>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-bold font-mono text-stone-900">
                  실시간
                </span>
              </div>
              <p className="text-sm text-stone-500 mt-2">규제 모니터링</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
