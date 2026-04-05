"use client";

import { useEffect, useState } from "react";
import { getWeeklyBriefing, type WeeklyBriefing } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  AI規制: "bg-violet-100 text-violet-700",
  データ保護: "bg-emerald-100 text-emerald-700",
  金融規制: "bg-sky-100 text-sky-700",
  電子金融: "bg-orange-100 text-orange-700",
};

const ACTION_DOT: Record<string, string> = {
  "緊急対応": "bg-red-500",
  "通知必要": "bg-amber-500",
  "検討必要": "bg-sky-500",
};

export default function WeeklyBriefingPage() {
  const [data, setData] = useState<WeeklyBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeeklyBriefing()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-stone-400">読み込み中...</div>;
  }
  if (!data) {
    return <div className="text-center py-12 text-stone-400">データを読み込めませんでした。</div>;
  }

  const totalRegs = Object.values(data.category_counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-10">
      {/* カテゴリ別件数 */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">規制現況サマリー</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-stone-400 mb-1">すべて</div>
            <div className="text-3xl font-semibold font-mono text-stone-900">{totalRegs}</div>
          </div>
          {data.categories.map((cat) => (
            <div
              key={cat}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]"
            >
              <div className="text-xs text-stone-400 mb-1">{cat}</div>
              <div className="text-3xl font-semibold font-mono text-stone-900">
                {data.category_counts[cat] || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ヒートマップ */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">
          クライアント × 規制カテゴリ影響度
        </h3>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500">
                    クライアント
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500">
                    担当
                  </th>
                  {data.categories.map((cat) => (
                    <th
                      key={cat}
                      className="text-center px-3 py-3 text-xs font-medium text-stone-500"
                    >
                      {cat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.heatmap.map((row) => (
                  <tr key={row.client} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900 whitespace-nowrap">
                      {row.client}
                    </td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                      {row.lawyer}
                    </td>
                    {data.categories.map((cat) => {
                      const score = Number(row[cat]) || 0;
                      return (
                        <td key={cat} className="px-3 py-3 text-center">
                          {score > 0 ? (
                            <div
                              className={`inline-block w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold font-mono text-white ${
                                score >= 70
                                  ? "bg-red-500"
                                  : score >= 40
                                  ? "bg-amber-500"
                                  : "bg-emerald-400"
                              }`}
                            >
                              {score}
                            </div>
                          ) : (
                            <div className="inline-block w-8 h-8 rounded-lg bg-stone-50 border border-stone-100" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-500" /> 緊急
              (70+)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-amber-500" />{" "}
              通知 (40-69)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-emerald-400" />{" "}
              検討 (1-39)
            </span>
          </div>
        </div>
      </div>

      {/* 弁護士別タスク */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">
          弁護士別アクションアイテム
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {Object.entries(data.lawyer_actions).map(([lawyer, actions]) => (
            <div
              key={lawyer}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-stone-900">{lawyer}</h4>
                <span className="text-xs text-stone-400 font-mono">
                  {actions.length}件
                </span>
              </div>
              <div className="space-y-2">
                {actions.slice(0, 8).map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        ACTION_DOT[action.action_type] || "bg-stone-300"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-stone-900 font-medium truncate">
                        {action.client}
                      </div>
                      <div className="text-xs text-stone-400 truncate">
                        {action.regulation}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-1 text-xs rounded-full ${
                        CATEGORY_COLORS[action.category] || "bg-stone-100"
                      }`}
                    >
                      {action.category}
                    </span>
                  </div>
                ))}
                {actions.length > 8 && (
                  <div className="text-xs text-stone-400 pt-1">
                    +{actions.length - 8}件...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
