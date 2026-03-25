"use client";

import { Bell, FileText, EnvelopeSimple } from "@phosphor-icons/react";
import FadeIn from "./FadeIn";

const features = [
  { icon: Bell, text: "실시간 규제 모니터링" },
  { icon: FileText, text: "리서치 메모 자동 생성" },
  { icon: EnvelopeSimple, text: "클라이언트 안내문 생성" },
];

const regulations = [
  {
    title: "AI 기본법 시행령 개정안",
    level: "높음",
    color: "bg-red-500",
    date: "2025.12.15",
  },
  {
    title: "개인정보 처리 가이드라인",
    level: "중간",
    color: "bg-amber-500",
    date: "2025.12.12",
  },
  {
    title: "전자금융거래법 개정",
    level: "낮음",
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
              <span className="font-mono text-sm text-emerald-600">03</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mt-2">
                규제 변화를 자동으로
                <br />
                추적하고 대응합니다
              </h2>
              <p className="text-stone-500 text-base max-w-md leading-relaxed mt-4">
                최신 법률 및 규제 변경 사항을 실시간으로 모니터링하고, AI가
                자동으로 리서치 메모와 클라이언트 안내문을 생성합니다.
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
                규제 피드 보기 &rarr;
              </a>
            </div>
          </FadeIn>

          {/* Top-right: latest regulations */}
          <FadeIn delay={0.1}>
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
                최신 규제
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
                자동 생성 문서
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {["리서치 메모", "클라이언트 안내문", "뉴스레터"].map((tag) => (
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
