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
  "긴급 대응": "bg-red-100 text-red-700 border-red-200",
  "통지 필요": "bg-amber-100 text-amber-700 border-amber-200",
  "검토 필요": "bg-blue-100 text-blue-700 border-blue-200",
};

const STAGE_ORDER = ["입법예고", "시행령공포", "시행", "폐지"];

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
    return <div className="text-center py-12 text-stone-400">불러오는 중...</div>;
  }
  if (!reg) {
    return <div className="text-center py-12 text-stone-400">규제 항목을 찾을 수 없습니다.</div>;
  }

  const currentStageIdx = STAGE_ORDER.indexOf(reg.lifecycle_stage);

  return (
    <div className="space-y-10">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.push("/regulation")}
        className="text-sm text-stone-500 hover:text-stone-700"
      >
        &larr; 규제 피드로 돌아가기
      </button>

      {/* 규제 상세 카드 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  reg.impact_level === "높음"
                    ? "bg-red-50 text-red-700"
                    : reg.impact_level === "중간"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                영향도: {reg.impact_level}
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
            <div className="mt-1">공포일: {reg.published_date}</div>
            {reg.effective_date && (
              <div className="text-emerald-600 mt-1">시행일: {reg.effective_date}</div>
            )}
          </div>
        </div>

        {/* 라이프사이클 타임라인 */}
        <div className="pt-4 border-t border-stone-100">
          <div className="text-xs text-stone-500 mb-3 font-medium">규제 라이프사이클</div>
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

        {/* 요약 + 상세 */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <div>
            <div className="text-xs text-stone-500 font-medium mb-1">요약</div>
            <p className="text-sm text-stone-700">{reg.summary}</p>
          </div>
          {reg.detail_text && (
            <div>
              <div className="text-xs text-stone-500 font-medium mb-1">상세 내용</div>
              <p className="text-sm text-stone-600 whitespace-pre-line">{reg.detail_text}</p>
            </div>
          )}
        </div>
      </div>

      {/* 영향 클라이언트 */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">
          영향 클라이언트
          <span className="ml-2 text-sm font-normal text-stone-500">
            {impacts.length}곳
          </span>
        </h3>

        {impacts.length === 0 ? (
          <p className="text-stone-400 text-sm">영향받는 클라이언트가 없습니다.</p>
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
                      {item.industry} · 담당: {item.assigned_lawyer}
                    </div>

                    {/* 영향 사유 */}
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

                    {/* 라이선스 & 서비스 */}
                    <div className="text-xs text-stone-400 space-y-0.5">
                      {item.licenses.length > 0 && (
                        <div>라이선스: {item.licenses.join(", ")}</div>
                      )}
                      <div>서비스: {item.services.join(", ")}</div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right space-y-3">
                    {/* 영향도 점수 */}
                    <div>
                      <div className="text-2xl font-semibold font-mono text-stone-900">
                        {item.impact_score}
                      </div>
                      <div className="text-xs text-stone-400">영향도 점수</div>
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

                    {/* 문서 생성 버튼 */}
                    <button
                      onClick={() =>
                        router.push(
                          `/regulation/${id}/generate?client_id=${item.client_id}`
                        )
                      }
                      className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-colors"
                    >
                      문서 생성
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
