"use client";

import { useEffect, useState } from "react";
import { getWeeklyBriefing, type WeeklyBriefing } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  AI규제: "bg-violet-100 text-violet-700",
  데이터보호: "bg-emerald-100 text-emerald-700",
  금융규제: "bg-sky-100 text-sky-700",
  전자금융: "bg-orange-100 text-orange-700",
};

const ACTION_DOT: Record<string, string> = {
  "긴급 대응": "bg-red-500",
  "통지 필요": "bg-amber-500",
  "검토 필요": "bg-sky-500",
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
    return <div className="text-center py-12 text-stone-400">불러오는 중...</div>;
  }
  if (!data) {
    return <div className="text-center py-12 text-stone-400">데이터를 불러올 수 없습니다.</div>;
  }

  const totalRegs = Object.values(data.category_counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-10">
      {/* 카테고리별 건수 */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">규제 현황 요약</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-stone-400 mb-1">전체</div>
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

      {/* 히트맵 */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">
          클라이언트 × 규제 카테고리 영향도
        </h3>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500">
                    클라이언트
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500">
                    담당
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
              <span className="inline-block w-3 h-3 rounded bg-red-500" /> 긴급
              (70+)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-amber-500" />{" "}
              통지 (40-69)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-emerald-400" />{" "}
              검토 (1-39)
            </span>
          </div>
        </div>
      </div>

      {/* 변호사별 할 일 */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">
          변호사별 액션 아이템
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
                  {actions.length}건
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
                    +{actions.length - 8}건 더...
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
