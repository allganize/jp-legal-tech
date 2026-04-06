"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRegulationDetail,
  getRegulationImpacts,
  type RegulationItem,
  type ClientImpactItem,
} from "@/lib/api";

const ACTION_COLORS: Record<string, string> = {
  "緊急対応": "bg-red-100 text-red-700 border-red-200",
  "通知必要": "bg-amber-100 text-amber-700 border-amber-200",
  "検討必要": "bg-blue-100 text-blue-700 border-blue-200",
};

const STAGE_ORDER = ["立法予告", "施行令公布", "施行", "廃止"];

export default function RegulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reg, setReg] = useState<RegulationItem | null>(null);
  const [impacts, setImpacts] = useState<ClientImpactItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const regId = Number(id);
    Promise.all([getRegulationDetail(regId), getRegulationImpacts(regId)])
      .then(([r, i]) => {
        setReg(r);
        setImpacts(i);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-stone-400">読み込み中...</div>;
  }
  if (!reg) {
    return <div className="text-center py-12 text-stone-400">規制項目が見つかりません。</div>;
  }

  const currentStageIdx = STAGE_ORDER.indexOf(reg.lifecycle_stage);

  return (
    <div className="space-y-10">
      {/* 戻る */}
      <button
        onClick={() => router.push("/regulation")}
        className="text-sm text-stone-500 hover:text-stone-700"
      >
        &larr; 規制フィードに戻る
      </button>

      {/* 規制詳細カード */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  reg.impact_level === "高"
                    ? "bg-red-50 text-red-700"
                    : reg.impact_level === "中"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                影響度: {reg.impact_level}
              </span>
              <span className="px-2.5 py-1 text-xs bg-stone-100 text-stone-600 rounded-full">
                {reg.category}
              </span>
              <span className="px-2.5 py-1 text-xs bg-stone-100 text-stone-600 rounded-full">
                {reg.reg_type}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-stone-900">{reg.title}</h2>
          </div>
          <div className="text-right text-sm text-stone-500 shrink-0">
            <div>{reg.source}</div>
            <div className="mt-1">公布日: {reg.published_date}</div>
            {reg.effective_date && (
              <div className="text-emerald-600 mt-1">施行日: {reg.effective_date}</div>
            )}
          </div>
        </div>

        {/* ライフサイクルタイムライン */}
        <div className="pt-4 border-t border-stone-100">
          <div className="text-xs text-stone-500 mb-3 font-medium">規制ライフサイクル</div>
          <div className="flex items-center gap-0">
            {STAGE_ORDER.map((stage, idx) => (
              <div key={stage} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                    idx <= currentStageIdx
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {idx <= currentStageIdx ? "\u2713" : "\u25CB"} {stage}
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      idx < currentStageIdx ? "bg-emerald-600" : "bg-stone-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 要約 + 詳細 */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <div>
            <div className="text-xs text-stone-500 font-medium mb-1">要約</div>
            <p className="text-sm text-stone-700">{reg.summary}</p>
          </div>
          {reg.detail_text && (
            <div>
              <div className="text-xs text-stone-500 font-medium mb-1">詳細内容</div>
              <p className="text-sm text-stone-600 whitespace-pre-line">{reg.detail_text}</p>
            </div>
          )}
        </div>
      </div>

      {/* 影響クライアント */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">
          影響クライアント
          <span className="ml-2 text-sm font-normal text-stone-500">
            {impacts.length}件
          </span>
        </h3>

        {impacts.length === 0 ? (
          <p className="text-stone-400 text-sm">影響を受けるクライアントがありません。</p>
        ) : (
          <div className="space-y-3">
            {impacts.map((item) => (
              <div
                key={item.client_id}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-stone-900">
                        {item.company_name}
                      </h4>
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          ACTION_COLORS[item.action_type] || "bg-stone-100"
                        }`}
                      >
                        {item.action_type}
                      </span>
                    </div>
                    <div className="text-sm text-stone-500 mb-3">
                      {item.industry} · 担当: {item.assigned_lawyer}
                    </div>

                    {/* 影響理由 */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.impact_reasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-stone-50 text-stone-600 rounded border border-stone-200"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>

                    {/* ライセンス & サービス */}
                    <div className="text-xs text-stone-400 space-y-0.5">
                      {item.licenses.length > 0 && (
                        <div>ライセンス: {item.licenses.join(", ")}</div>
                      )}
                      <div>サービス: {item.services.join(", ")}</div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right space-y-3">
                    {/* 影響度スコア */}
                    <div>
                      <div className="text-2xl font-semibold font-mono text-stone-900">
                        {item.impact_score}
                      </div>
                      <div className="text-xs text-stone-400">影響度スコア</div>
                      <div className="w-24 h-2 bg-stone-100 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full ${
                            item.impact_score >= 70
                              ? "bg-red-500"
                              : item.impact_score >= 40
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${item.impact_score}%` }}
                        />
                      </div>
                    </div>

                    {/* 文書生成ボタン */}
                    <button
                      onClick={() =>
                        router.push(
                          `/regulation/${id}/generate?client_id=${item.client_id}`
                        )
                      }
                      className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-colors"
                    >
                      文書生成
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
