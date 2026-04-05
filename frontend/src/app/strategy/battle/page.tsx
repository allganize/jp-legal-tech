"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepStepper from "@/components/strategy/StepStepper";
import GaugeChart from "@/components/strategy/GaugeChart";
import {
  generateStrategies,
  type StrategyItemData,
} from "@/lib/api";

function BattleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "";
  const issueIds = (searchParams.get("issues") || "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  const [attacks, setAttacks] = useState<StrategyItemData[]>([]);
  const [defenses, setDefenses] = useState<StrategyItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId || issueIds.length === 0) {
      setError("セッション情報が不足しています。");
      setLoading(false);
      return;
    }
    generateStrategies(sessionId, issueIds)
      .then((data) => {
        setAttacks(data.attacks);
        setDefenses(data.defenses);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "戦略生成に失敗しました。")
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleNext = () => {
    router.push(`/strategy/brief?session=${sessionId}`);
  };

  return (
    <div className="bg-[#111318] min-h-screen text-stone-100">
      {/* Stepper on dark bg */}
      <div className="bg-[#1a1d24] border-b border-stone-700/50">
        <StepStepper currentStep={3} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-white">戦略立案</h1>
          <p className="text-stone-400 mt-2">
            攻撃戦略と防御戦略を比較分析します。
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-emerald-400 mb-4">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-lg font-semibold">
                AIが戦略を生成しています...
              </span>
            </div>
            <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
              {[0, 1].map((side) => (
                <div key={side} className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="animate-pulse bg-stone-800/50 rounded-xl h-32"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm max-w-xl mx-auto">
            {error}
          </div>
        )}

        {/* Battle View */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
              {/* Attack Panel */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <h2 className="text-lg font-semibold text-red-400">
                    攻撃戦略
                  </h2>
                  <span className="text-xs text-stone-500 ml-auto">
                    {attacks.length}件
                  </span>
                </div>
                <div className="space-y-4">
                  {attacks.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gradient-to-br from-[#1a1d24] to-[#1f2229] rounded-xl border border-stone-700/50 p-5 hover:border-red-800/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <GaugeChart
                          percent={item.strength_pct}
                          color="#ef4444"
                          bgColor="#292524"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm">
                            {item.title}
                          </h3>
                          <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-500">有効度:</span>
                          <div className="w-20 bg-stone-700 rounded-full h-1.5">
                            <div
                              className="bg-red-500 h-1.5 rounded-full"
                              style={{ width: `${item.score_pct}%` }}
                            />
                          </div>
                          <span className="text-red-400 font-mono">
                            {item.score_pct}%
                          </span>
                        </div>
                        <div className="text-stone-500">
                          判例{" "}
                          <span className="text-stone-300 font-mono">
                            {item.precedent_count}
                          </span>
                          件
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS Indicator */}
              <div className="hidden lg:flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <span className="text-white font-bold text-lg">VS</span>
                </div>
                <div className="w-px h-full bg-gradient-to-b from-transparent via-stone-600 to-transparent mt-4" />
              </div>

              {/* Mobile VS */}
              <div className="lg:hidden flex items-center justify-center py-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">VS</span>
                </div>
              </div>

              {/* Defense Panel */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h2 className="text-lg font-semibold text-emerald-400">
                    防御戦略
                  </h2>
                  <span className="text-xs text-stone-500 ml-auto">
                    {defenses.length}件
                  </span>
                </div>
                <div className="space-y-4">
                  {defenses.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-stone-200 p-5 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <GaugeChart
                          percent={item.strength_pct}
                          color="#059669"
                          bgColor="#e7e5e4"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-stone-900 text-sm">
                            {item.title}
                          </h3>
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400">有効度:</span>
                          <div className="w-20 bg-stone-100 rounded-full h-1.5">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${item.score_pct}%` }}
                            />
                          </div>
                          <span className="text-emerald-600 font-mono">
                            {item.score_pct}%
                          </span>
                        </div>
                        <div className="text-stone-400">
                          判例{" "}
                          <span className="text-stone-600 font-mono">
                            {item.precedent_count}
                          </span>
                          件
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="px-6 py-2.5 bg-stone-800 text-stone-300 rounded-xl font-medium hover:bg-stone-700 transition"
              >
                戻る
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-[0.98] transition"
              >
                戦略確定 {"\u2192"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#111318] min-h-screen flex items-center justify-center text-stone-500">
          読み込み中...
        </div>
      }
    >
      <BattleContent />
    </Suspense>
  );
}
