"use client";

import { motion } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

function stagger(i: number) {
  return { ...spring, delay: i * 0.1 };
}

export default function Hero() {
  return (
    <section className="min-h-[100dvh] flex flex-col bg-[#FAFAF8]">
      {/* Inline nav */}
      <nav className="w-full px-6 md:px-12 lg:px-20 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight text-[#1B2A4A]"
          >
            判例AI
          </a>
          <div className="flex gap-1">
            {[
              { label: "裁判官分析", href: "/dashboard" },
              { label: "管轄最適化", href: "/venue" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm rounded-lg text-[#2D2D2D]/60 hover:bg-[#E8EDF5] hover:text-[#1B2A4A] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero grid */}
      <div className="flex-1 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] min-h-[calc(100dvh-72px)] items-center gap-12">
          {/* Left: text */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(0)}
              className="text-4xl md:text-6xl tracking-tighter font-bold text-[#1B2A4A]"
            >
              判例AI
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(1)}
              className="text-xl text-[#2D2D2D]/60 mt-4 max-w-md"
            >
              弁護士のためのAI判例分析プラットフォーム
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(2)}
              className="font-mono text-sm text-[#2D2D2D]/40 mt-3"
            >
              日本の裁判所判例65,000件以上をAIが分析
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(3)}
              className="flex gap-3 mt-8"
            >
              <a
                href="/dashboard"
                className="bg-[#1B2A4A] text-white rounded-lg px-6 py-3 font-medium hover:bg-[#243656] transition active:scale-[0.98]"
              >
                今すぐ始める
              </a>
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="border border-[#1B2A4A] text-[#1B2A4A] rounded-lg px-6 py-3 font-medium hover:bg-[#E8EDF5] transition"
              >
                機能を見る
              </a>
            </motion.div>
          </div>

          {/* Right: Zen-inspired vertical gold accent with mini stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(4)}
            className="relative hidden md:flex items-center justify-center h-[420px]"
          >
            {/* Vertical gold accent line */}
            <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-72 bg-gradient-to-b from-transparent via-[#C5A55A] to-transparent" />

            {/* Mini stat cards floating beside the line */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={stagger(5)}
              className="absolute top-12 left-[55%] bg-white border border-stone-200 rounded-xl px-5 py-4 shadow-sm"
            >
              <p className="text-xs text-[#2D2D2D]/50 mb-1">裁判官プロフィール</p>
              <p className="font-semibold text-[#1B2A4A]">田中太郎</p>
              <p className="text-xs text-[#2D2D2D]/40 mt-0.5">東京地方裁判所</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={stagger(6)}
              className="absolute top-[170px] right-[55%] bg-white border border-stone-200 rounded-xl px-5 py-4 shadow-sm"
            >
              <p className="text-xs text-[#2D2D2D]/50 mb-1">認容率</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-[#1B2A4A]">72.4</span>
                <span className="text-sm font-mono text-[#C5A55A]">%</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={stagger(7)}
              className="absolute bottom-16 left-[55%] bg-white border border-stone-200 rounded-xl px-5 py-4 shadow-sm"
            >
              <p className="text-xs text-[#2D2D2D]/50 mb-1">分析済み判例</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-[#1B2A4A]">65,466</span>
                <span className="text-sm font-mono text-[#C5A55A]">件</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
