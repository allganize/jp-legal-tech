"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRegulationFeed,
  type RegulationItem,
  type RegulationFeedResponse,
} from "@/lib/api";

const CATEGORIES = ["전체", "AI규제", "데이터보호", "금융규제", "전자금융"];
const IMPACT_COLORS: Record<string, string> = {
  높음: "bg-red-100 text-red-700",
  중간: "bg-amber-100 text-amber-700",
  낮음: "bg-green-100 text-green-700",
};
const TYPE_COLORS: Record<string, string> = {
  입법예고: "bg-purple-100 text-purple-700",
  가이드라인: "bg-blue-100 text-blue-700",
  제재사례: "bg-orange-100 text-orange-700",
  시행령: "bg-teal-100 text-teal-700",
};

export default function RegulationFeedPage() {
  const [category, setCategory] = useState("전체");
  const [data, setData] = useState<RegulationFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const cat = category === "전체" ? undefined : category;
    getRegulationFeed(cat)
      .then((d) => { console.log("feed data:", d); setData(d); })
      .catch((e) => { console.error("feed error:", e); setData(null); })
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="space-y-6">
      {/* 카테고리 탭 */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              category === cat
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
            {data && cat !== "전체" && (
              <span className="ml-1.5 text-xs opacity-70">
                {data.items.filter((r) => cat === "전체" || r.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 규제 카드 리스트 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">불러오는 중...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">규제 항목이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {data.items.map((reg) => (
            <button
              key={reg.id}
              onClick={() => router.push(`/regulation/${reg.id}`)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        IMPACT_COLORS[reg.impact_level] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {reg.impact_level}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        TYPE_COLORS[reg.reg_type] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {reg.reg_type}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">
                      {reg.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">
                    {reg.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {reg.summary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">{reg.source}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {reg.published_date}
                  </div>
                  {reg.effective_date && (
                    <div className="text-xs text-blue-500 mt-1">
                      시행 {reg.effective_date}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
