"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRegulationFeed,
  type RegulationItem,
  type RegulationFeedResponse,
} from "@/lib/api";

const CATEGORIES = ["すべて", "AI規制", "データ保護", "金融規制", "電子金融"];
const IMPACT_COLORS: Record<string, string> = {
  高: "bg-red-50 text-red-700",
  中: "bg-amber-50 text-amber-700",
  低: "bg-green-50 text-green-700",
};
const TYPE_COLORS: Record<string, string> = {
  立法予告: "bg-purple-50 text-purple-700",
  ガイドライン: "bg-blue-50 text-blue-700",
  制裁事例: "bg-orange-50 text-orange-700",
  施行令: "bg-teal-50 text-teal-700",
};

export default function RegulationFeedPage() {
  const [category, setCategory] = useState("すべて");
  const [data, setData] = useState<RegulationFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const cat = category === "すべて" ? undefined : category;
    getRegulationFeed(cat)
      .then((d) => { setData(d); })
      .catch(() => { setData(null); })
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="space-y-6">
      {/* カテゴリタブ */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              category === cat
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {cat}
            {data && cat !== "すべて" && (
              <span className="ml-1.5 text-xs opacity-70">
                {data.items.filter((r) => cat === "すべて" || r.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 規制カードリスト */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-12 text-stone-400">規制項目がありません</div>
      ) : (
        <div className="space-y-3">
          {data.items.map((reg) => (
            <button
              key={reg.id}
              onClick={() => router.push(`/regulation/${reg.id}`)}
              className="w-full text-left bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:border-stone-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        IMPACT_COLORS[reg.impact_level] || "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {reg.impact_level}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        TYPE_COLORS[reg.reg_type] || "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {reg.reg_type}
                    </span>
                    <span className="px-2 py-1 text-xs bg-stone-100 text-stone-500 rounded-full">
                      {reg.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-stone-900 mb-1">
                    {reg.title}
                  </h3>
                  <p className="text-sm text-stone-500 line-clamp-2">
                    {reg.summary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-stone-400">{reg.source}</div>
                  <div className="text-xs text-stone-400 mt-1">
                    {reg.published_date}
                  </div>
                  {reg.effective_date && (
                    <div className="text-xs text-emerald-500 mt-1">
                      施行 {reg.effective_date}
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
