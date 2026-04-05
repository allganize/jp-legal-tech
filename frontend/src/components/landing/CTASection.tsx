"use client";

import FadeIn from "./FadeIn";

export default function CTASection() {
  return (
    <section className="bg-emerald-700">
      {/* CTA area */}
      <div className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <FadeIn direction="up">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
              判例AIを始めましょう
            </h2>
            <p className="text-lg text-slate-300 max-w-lg mt-4">
              65,000件以上の判例データで訴訟戦略を最適化
            </p>
            <div className="mt-8">
              <a
                href="/dashboard"
                className="inline-block bg-white text-stone-800 px-8 py-4 rounded-lg font-medium hover:bg-emerald-50 transition active:scale-[0.98]"
              >
                今すぐ始める
              </a>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              &copy; 2026 判例AI. All rights reserved.
            </p>
            <nav className="flex gap-6">
              <a
                href="/dashboard"
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                裁判官分析
              </a>
              <a
                href="/venue"
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                管轄最適化
              </a>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
