"use client";

import FadeIn from "./FadeIn";

export default function CTASection() {
  return (
    <section className="bg-stone-900 py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn direction="up">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            소송 준비의 방식을
            <br />
            바꿔보세요
          </h2>
          <p className="text-lg text-stone-400 max-w-lg mt-4">
            판결 데이터 분석과 규제 모니터링으로 더 정확한 소송 전략을
            세우세요
          </p>
          <div className="mt-8">
            <a
              href="/dashboard"
              className="inline-block bg-emerald-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-emerald-500 transition active:scale-[0.98]"
            >
              무료로 시작하기
            </a>
          </div>
          <a
            href="#features"
            className="text-stone-500 hover:text-stone-300 mt-4 inline-block text-sm transition-colors"
          >
            기능 더 알아보기
          </a>
        </FadeIn>
      </div>
    </section>
  );
}
