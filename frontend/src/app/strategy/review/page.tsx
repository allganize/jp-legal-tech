"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepStepper from "@/components/strategy/StepStepper";
import {
  generateStrategyReview,
  type ReviewItemData,
} from "@/lib/api";

const STRENGTH_COLORS: Record<string, string> = {
  "強": "bg-red-100 text-red-700 border-red-200",
  "中": "bg-amber-100 text-amber-700 border-amber-200",
  "弱": "bg-stone-100 text-stone-600 border-stone-200",
};

const EFFECTIVENESS_COLORS: Record<string, string> = {
  "高": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "中": "bg-emerald-100 text-emerald-600 border-emerald-200",
  "低": "bg-stone-100 text-stone-600 border-stone-200",
};

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "";

  const [counterarguments, setCounterarguments] = useState<ReviewItemData[]>([]);
  const [responses, setResponses] = useState<ReviewItemData[]>([]);
  const [readinessScore, setReadinessScore] = useState(0);
  const [criticalWeakness, setCriticalWeakness] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("セッションIDが見つかりません。");
      setLoading(false);
      return;
    }
    generateStrategyReview(sessionId)
      .then((data) => {
        setCounterarguments(data.counterarguments);
        setResponses(data.responses);
        setReadinessScore(data.readiness_score);
        setCriticalWeakness(data.critical_weakness);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "検証に失敗しました。")
      )
      .finally(() => setLoading(false));
  }, [sessionId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "準備万全";
    if (score >= 60) return "概ね良好";
    return "要改善";
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <StepStepper currentStep={5} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-stone-900">自己検証</h1>
          <p className="text-stone-500 mt-2">
            Red
            Teamが反論シナリオを生成し、あなたの戦略の弱点を検証します。
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-emerald-600 mb-4">
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
                AIが反論シナリオを分析しています...
              </span>
            </div>
            <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
              {[0, 1].map((side) => (
                <div key={side} className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="animate-pulse bg-white rounded-xl h-28 border border-stone-200"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Review View */}
        {!loading && !error && (
          <>
            {/* Summary Bar */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-5 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`text-4xl font-bold font-mono ${getScoreColor(
                      readinessScore
                    )}`}
                  >
                    {readinessScore}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-stone-800">
                      準備スコア
                    </div>
                    <div
                      className={`text-xs font-semibold ${getScoreColor(
                        readinessScore
                      )}`}
                    >
                      {getScoreLabel(readinessScore)}
                    </div>
                  </div>
                </div>
                <div className="h-10 w-px bg-stone-200 hidden sm:block" />
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-stone-500">反論: </span>
                    <span className="font-semibold text-red-600">
                      {counterarguments.length}
                    </span>
                    件
                  </div>
                  <div>
                    <span className="text-stone-500">対応: </span>
                    <span className="font-semibold text-emerald-600">
                      {responses.length}
                    </span>
                    件
                  </div>
                </div>
                {criticalWeakness && (
                  <>
                    <div className="h-10 w-px bg-stone-200 hidden sm:block" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-red-600 mb-0.5">
                        重大な弱点
                      </div>
                      <div className="text-sm text-stone-700 truncate">
                        {criticalWeakness}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
              {/* Red Panel: Counterarguments */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <h2 className="text-lg font-semibold text-red-700">
                    想定反論
                  </h2>
                  <span className="text-xs text-stone-500 ml-auto">
                    Red Team
                  </span>
                </div>
                <div className="space-y-3">
                  {counterarguments.map((item) => (
                    <div
                      key={item.id}
                      className="bg-red-50/50 rounded-xl border border-red-100 p-4 hover:border-red-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-stone-900 text-sm">
                          {item.title}
                        </h3>
                        {item.strength && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${
                              STRENGTH_COLORS[item.strength] ||
                              STRENGTH_COLORS["中"]
                            }`}
                          >
                            {item.strength}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {item.description}
                      </p>
                      {(item.precedent_ref || item.citation_rate) && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
                          {item.precedent_ref && (
                            <span>判例: {item.precedent_ref}</span>
                          )}
                          {item.citation_rate && (
                            <span>引用率: {item.citation_rate}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* VS Indicator */}
              <div className="hidden lg:flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">VS</span>
                </div>
                <div className="w-px flex-1 bg-gradient-to-b from-red-200 via-stone-200 to-emerald-200 mt-4" />
              </div>

              {/* Mobile VS */}
              <div className="lg:hidden flex items-center justify-center py-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xs">VS</span>
                </div>
              </div>

              {/* Blue Panel: Responses */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h2 className="text-lg font-semibold text-emerald-700">
                    対応策
                  </h2>
                  <span className="text-xs text-stone-500 ml-auto">
                    Blue Team
                  </span>
                </div>
                <div className="space-y-3">
                  {responses.map((item) => (
                    <div
                      key={item.id}
                      className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-stone-900 text-sm">
                          {item.title}
                        </h3>
                        {item.effectiveness && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${
                              EFFECTIVENESS_COLORS[item.effectiveness] ||
                              EFFECTIVENESS_COLORS["中"]
                            }`}
                          >
                            {item.effectiveness}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {item.description}
                      </p>
                      {(item.precedent_ref || item.citation_rate) && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
                          {item.precedent_ref && (
                            <span>判例: {item.precedent_ref}</span>
                          )}
                          {item.citation_rate && (
                            <span>引用率: {item.citation_rate}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => router.back()}
                  className="px-5 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-200 transition"
                >
                  戻る
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    generateStrategyReview(sessionId)
                      .then((data) => {
                        setCounterarguments(data.counterarguments);
                        setResponses(data.responses);
                        setReadinessScore(data.readiness_score);
                        setCriticalWeakness(data.critical_weakness);
                      })
                      .catch((e) =>
                        setError(
                          e instanceof Error
                            ? e.message
                            : "再分析に失敗しました。"
                        )
                      )
                      .finally(() => setLoading(false));
                  }}
                  className="px-5 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition"
                >
                  再分析
                </button>
                <button
                  onClick={() => router.push("/strategy")}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition"
                >
                  完了
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
          読み込み中...
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
