"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepStepper from "@/components/strategy/StepStepper";
import {
  analyzeStrategyIssues,
  type StrategyIssue,
} from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  "事実認定": "bg-teal-100 text-teal-700",
  "法律解釈": "bg-purple-100 text-purple-700",
  "手続": "bg-amber-100 text-amber-700",
  "損害論": "bg-red-100 text-red-700",
  "因果関係": "bg-teal-100 text-teal-700",
  "責任論": "bg-orange-100 text-orange-700",
};

function getCategoryClass(category: string): string {
  return CATEGORY_COLORS[category] || "bg-stone-100 text-stone-700";
}

function IssuesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "";

  const [issues, setIssues] = useState<StrategyIssue[]>([]);
  const [totalPrecedents, setTotalPrecedents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    if (!sessionId) {
      setError("セッションIDが見つかりません。");
      setLoading(false);
      return;
    }
    analyzeStrategyIssues(sessionId)
      .then((data) => {
        setIssues(data.issues);
        setTotalPrecedents(data.total_precedents);
        // Auto-select issues that come pre-selected
        const preSelected = new Set(
          data.issues.filter((i) => i.selected).map((i) => i.id)
        );
        setSelectedIds(preSelected);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "争点分析に失敗しました。")
      )
      .finally(() => setLoading(false));
  }, [sessionId]);

  const toggleIssue = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categories = ["all", ...new Set(issues.map((i) => i.category))];
  const filtered =
    filterCategory === "all"
      ? issues
      : issues.filter((i) => i.category === filterCategory);

  const selectedIssues = issues.filter((i) => selectedIds.has(i.id));
  const avgScore =
    selectedIssues.length > 0
      ? Math.round(
          selectedIssues.reduce((sum, i) => sum + i.score, 0) /
            selectedIssues.length
        )
      : 0;

  const handleNext = () => {
    if (selectedIds.size === 0) return;
    const params = new URLSearchParams({
      session: sessionId,
      issues: Array.from(selectedIds).join(","),
    });
    router.push(`/strategy/battle?${params}`);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <StepStepper currentStep={2} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-stone-900">争点分析</h1>
          <p className="text-stone-500 mt-2">
            AIが抽出した争点を確認し、戦略立案に進む争点を選択してください。
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-12">
            <div className="text-center">
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
                  AIが争点を抽出しています...
                </span>
              </div>
              <div className="space-y-3 max-w-md mx-auto">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="animate-pulse flex items-center gap-3">
                    <div className="w-8 h-8 bg-stone-200 rounded-full" />
                    <div className="flex-1 h-4 bg-stone-200 rounded" />
                    <div className="w-16 h-4 bg-stone-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Issues */}
        {!loading && !error && (
          <>
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="bg-white rounded-xl border border-stone-200 px-4 py-2 text-sm">
                <span className="text-stone-500">分析判例: </span>
                <span className="font-semibold font-mono text-stone-800">
                  {totalPrecedents.toLocaleString()}
                </span>
                <span className="text-stone-500">件</span>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 px-4 py-2 text-sm">
                <span className="text-stone-500">抽出争点: </span>
                <span className="font-semibold font-mono text-stone-800">
                  {issues.length}
                </span>
                <span className="text-stone-500">件</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    filterCategory === cat
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {cat === "all" ? "全て" : cat}
                </button>
              ))}
            </div>

            {/* Issues Table */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left px-4 py-3 text-stone-500 font-medium w-10">
                        #
                      </th>
                      <th className="text-left px-4 py-3 text-stone-500 font-medium">
                        争点名
                      </th>
                      <th className="text-left px-4 py-3 text-stone-500 font-medium w-24">
                        カテゴリ
                      </th>
                      <th className="text-left px-4 py-3 text-stone-500 font-medium w-32">
                        重要度
                      </th>
                      <th className="text-center px-4 py-3 text-stone-500 font-medium w-16">
                        頻度
                      </th>
                      <th className="text-center px-4 py-3 text-stone-500 font-medium w-24">
                        勝率
                      </th>
                      <th className="text-center px-4 py-3 text-stone-500 font-medium w-16">
                        選択
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((issue) => {
                      const isSelected = selectedIds.has(issue.id);
                      return (
                        <tr
                          key={issue.id}
                          className={`transition-colors ${
                            isSelected ? "bg-emerald-50/50" : "hover:bg-stone-50"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-stone-400">
                            {issue.rank}
                          </td>
                          <td className="px-4 py-3 font-medium text-stone-800">
                            {issue.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryClass(
                                issue.category
                              )}`}
                            >
                              {issue.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-stone-100 rounded-full h-2">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${issue.score}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-stone-500 w-8 text-right">
                                {issue.score}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-stone-600">
                            {issue.frequency}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs font-mono text-emerald-600">
                                {issue.win_rate}%
                              </span>
                              <span className="text-stone-300">/</span>
                              <span className="text-xs font-mono text-red-500">
                                {issue.lose_rate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleIssue(issue.id)}
                              className={`w-10 h-5 rounded-full relative transition-colors ${
                                isSelected ? "bg-emerald-500" : "bg-stone-300"
                              }`}
                            >
                              <div
                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  isSelected
                                    ? "translate-x-5"
                                    : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="mt-6 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-stone-500">選択済: </span>
                  <span className="font-semibold text-emerald-600">
                    {selectedIds.size}
                  </span>
                  <span className="text-stone-500">件</span>
                </div>
                <div>
                  <span className="text-stone-500">平均重要度: </span>
                  <span className="font-semibold font-mono text-stone-800">
                    {avgScore}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition"
                >
                  戻る
                </button>
                <button
                  onClick={handleNext}
                  disabled={selectedIds.size === 0}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  戦略立案へ {"\u2192"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
          読み込み中...
        </div>
      }
    >
      <IssuesContent />
    </Suspense>
  );
}
