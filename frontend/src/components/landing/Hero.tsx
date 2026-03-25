"use client";

import { motion } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

function stagger(i: number) {
  return { ...spring, delay: i * 0.1 };
}

export default function Hero() {
  return (
    <section className="min-h-[100dvh] flex flex-col">
      {/* Inline nav */}
      <nav className="w-full px-6 md:px-12 lg:px-20 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight text-stone-900"
          >
            Machu Picchu
          </a>
          <div className="flex gap-1">
            {[
              { label: "판사 분석", href: "/dashboard" },
              { label: "관할 최적화", href: "/venue" },
              { label: "규제 에이전트", href: "/regulation" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
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
              className="text-4xl md:text-6xl tracking-tighter font-bold text-stone-900"
            >
              Machu Picchu
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(1)}
              className="text-xl text-stone-500 mt-4 max-w-md"
            >
              변호사를 위한 AI 리걸 인텔리전스
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(2)}
              className="font-mono text-sm text-stone-400 mt-3"
            >
              판결 데이터 170,000+ 건 분석
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(3)}
              className="flex gap-3 mt-8"
            >
              <a
                href="/dashboard"
                className="bg-emerald-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-emerald-700 transition active:scale-[0.98]"
              >
                지금 시작하기
              </a>
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="border border-stone-300 text-stone-600 rounded-lg px-6 py-3 font-medium hover:bg-stone-50 transition"
              >
                기능 살펴보기
              </a>
            </motion.div>
          </div>

          {/* Right: geometric decoration */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(4)}
            className="relative hidden md:block h-[420px]"
          >
            <div className="absolute top-8 left-8 w-64 h-64 rounded-3xl bg-stone-100 rotate-3" />
            <div className="absolute top-20 left-20 w-56 h-56 rounded-3xl bg-stone-200/80 -rotate-2" />
            <div className="absolute top-32 left-12 w-48 h-48 rounded-3xl border-2 border-emerald-600/30 rotate-6" />
            <div className="absolute top-16 right-8 w-32 h-32 rounded-2xl bg-stone-100 -rotate-6" />
            <div className="absolute bottom-12 left-32 w-40 h-24 rounded-2xl border border-stone-200 bg-white/60 rotate-1" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
