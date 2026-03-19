"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  compareVenueCourts,
  getVenueRecommendation,
  type CourtStats,
} from "@/lib/api";
import ReactMarkdown from "react-markdown";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
];

// 법률 용어 → 일반 용어 매핑
const OUTCOME_LABELS: Record<string, string> = {
  "원고승": "승소",
  "원고패": "패소",
  "일부인용": "일부 승소",
  "파기환송": "원심 파기 (유리)",
  "파기자판": "원심 파기·확정 (유리)",
  "상고기각": "상고 기각 (불리)",
  "상고각하": "상고 각하 (불리)",
  "각하": "소 각하 (불리)",
};

function toLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome] || outcome;
}

export default function VenueComparePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">로딩중...</div>}>
      <VenueCompareContent />
    </Suspense>
  );
}

function VenueCompareContent() {
  const searchParams = useSearchParams();
  const courtNames = searchParams.get("courts")?.split(",") || [];
  const caseType = searchParams.get("case_type") || "";

  const [courts, setCourts] = useState<CourtStats[]>([]);
  const [loading, setLoading] = useState(true);

  // AI recommendation
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [caseDescription, setCaseDescription] = useState("");
  const [showDescInput, setShowDescInput] = useState(false);

  useEffect(() => {
    if (courtNames.length < 2) return;
    setLoading(true);
    compareVenueCourts(courtNames, caseType || undefined)
      .then((data) => setCourts(data.courts))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const requestAI = () => {
    setAiText("");
    setAiLoading(true);
    setAiDone(false);
    getVenueRecommendation(
      caseType,
      courtNames,
      caseDescription || null,
      (chunk) => setAiText((prev) => prev + chunk),
      () => {
        setAiLoading(false);
        setAiDone(true);
      },
      (err) => {
        setAiText(`오류: ${err}`);
        setAiLoading(false);
      }
    );
  };

  if (courtNames.length < 2) {
    return (
      <div className="text-center py-20 text-slate-400">
        비교할 법원을 2개 이상 선택해 주세요.
        <br />
        <Link href="/venue" className="text-blue-600 underline mt-2 inline-block">
          법원 선택으로 돌아가기
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400">통계 로딩중...</div>;
  }

  // Build comparison bar chart data for parsed outcomes (미분류 제외, 라벨 변환)
  const allOutcomes = Array.from(
    new Set(courts.flatMap((c) => (c.outcome_distribution || []).map((d) => d.type || "미분류")))
  ).filter((t) => t !== "미분류");
  const outcomeChartData = allOutcomes.map((otype) => {
    const row: Record<string, string | number> = { type: toLabel(otype) };
    courts.forEach((court) => {
      const found = (court.outcome_distribution || []).find((d) => (d.type || "미분류") === otype);
      row[court.court_name] = found?.count || 0;
    });
    return row;
  });

  // Build yearly comparison data
  const allYears = Array.from(
    new Set(courts.flatMap((c) => c.yearly_distribution.map((y) => y.year || "")))
  ).sort();
  const yearlyChartData = allYears.map((yr) => {
    const row: Record<string, string | number> = { year: yr };
    courts.forEach((court) => {
      const found = court.yearly_distribution.find((y) => y.year === yr);
      row[court.court_name] = found?.count || 0;
    });
    return row;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/venue"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; 법원 선택
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 mt-2">
            관할 법원 비교
          </h1>
          <p className="text-slate-500 mt-1">
            사건유형: <span className="font-medium text-slate-700">{caseType}</span>
          </p>
        </div>
      </div>

      {/* Rate Cards */}
      <div className={`grid gap-4 ${courts.length === 2 ? "grid-cols-2" : courts.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
        {courts.map((court, i) => (
          <div
            key={court.court_name}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
              court.rank === 1
                ? "border-emerald-400 ring-2 ring-emerald-50"
                : "border-slate-200"
            }`}
          >
            {court.rank === 1 && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                가장 유리한 법원
              </span>
            )}
            <h3 className="font-semibold text-slate-800 mt-2">
              {court.court_name}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <div
                  className={`text-4xl font-bold ${
                    court.acceptance_rate >= 50
                      ? "text-emerald-600"
                      : court.acceptance_rate >= 30
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {court.acceptance_rate}%
                </div>
                <div className="text-xs text-slate-500">
                  승소율
                  {(() => {
                    const classified = (court.outcome_distribution || [])
                      .filter((d) => d.type !== "미분류" && d.type)
                      .reduce((sum, d) => sum + d.count, 0);
                    return classified > 0 ? ` (분류된 ${classified}건 기준)` : "";
                  })()}
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-medium text-red-600">
                    {court.dismissal_rate}%
                  </span>
                  <span className="text-slate-400 ml-1">패소율</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">
                    {court.total_cases}
                  </span>
                  <span className="text-slate-400 ml-1">건</span>
                </div>
              </div>
              {(court.unclassified_rate || 0) >= 80 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                  미분류 {court.unclassified_rate}% — 통계 신뢰도 낮음
                </p>
              )}
              {(court.unclassified_rate || 0) >= 20 && (court.unclassified_rate || 0) < 80 && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                  미분류 {court.unclassified_rate}%
                </p>
              )}
              {court.total_cases < 30 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                  샘플 수 부족 (30건 미만)
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Outcome Comparison Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          판결 결과 비교
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          각 법원에서 승소·패소·일부 승소 등 판결 결과가 몇 건인지 비교합니다.
        </p>
        {outcomeChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={outcomeChartData}>
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {courts.map((court, i) => (
                <Bar
                  key={court.court_name}
                  dataKey={court.court_name}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-slate-400">
            데이터 없음
          </div>
        )}
      </div>

      {/* Yearly Trend Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          연도별 판결 추이 비교
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          각 법원의 연도별 판결 건수 추이를 비교합니다.
        </p>
        {yearlyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyChartData}>
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {courts.map((court, i) => (
                <Bar
                  key={court.court_name}
                  dataKey={court.court_name}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            데이터 없음
          </div>
        )}
      </div>

      {/* Top Judges per Court */}
      <div className={`grid gap-6 ${courts.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
        {courts.map((court) => (
          <div
            key={court.court_name}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {court.court_name} 주요 판사
            </h3>
            {court.top_judges.length > 0 ? (
              <div className="space-y-3">
                {court.top_judges.slice(0, 5).map((judge) => (
                  <Link
                    key={judge.judge_id}
                    href={`/judge/${judge.judge_id}`}
                    className="block p-3 rounded-lg hover:bg-slate-50 transition border border-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        {judge.name}
                      </span>
                      <span className="text-sm text-slate-500">
                        {judge.case_count}건
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-emerald-600">
                        승소 {judge.acceptance_rate}%
                      </span>
                      <span className="text-red-500">
                        패소 {judge.dismissal_rate}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">판사 데이터 없음</p>
            )}
          </div>
        ))}
      </div>

      {/* Methodology */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-800">
            분석 근거 및 방법론
          </summary>
          <div className="mt-4 space-y-4 text-sm text-slate-600 leading-relaxed">
            <div>
              <h4 className="font-semibold text-slate-700 mb-1">데이터 출처</h4>
              <p>
                대법원 판례 공개 시스템(law.go.kr)에서 수집한 판결문 원문을 규칙 기반으로 분석하여 산출합니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-1">결과 분류 방법</h4>
              <ul className="space-y-1 ml-4 list-disc">
                <li>
                  <span className="font-medium">승소</span>: 판결문 주문에 &quot;지급하라&quot;, &quot;인도하라&quot;, &quot;이행하라&quot;, &quot;취소한다&quot; 등 원고 청구를 받아들이는 표현이 포함된 경우
                </li>
                <li>
                  <span className="font-medium">패소</span>: 주문에 &quot;청구를 기각&quot;, &quot;항소를 기각&quot; 등 원고 청구를 거부하는 표현이 포함된 경우
                </li>
                <li>
                  <span className="font-medium">일부 승소</span>: 청구의 일부만 받아들여진 경우 (승소와 패소 표현이 동시에 존재)
                </li>
                <li>
                  <span className="font-medium">원심 파기 (유리)</span> (대법원): 하급심 판결에 오류가 있어 다시 재판하라고 돌려보낸 경우 — 원고에게 유리
                </li>
                <li>
                  <span className="font-medium">상고 기각 (불리)</span> (대법원): 하급심 판결을 그대로 유지한 경우 — 원고에게 불리
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-1">승소율 계산</h4>
              <p>
                승소율 = (승소 + 일부 승소 + 원심 파기) / 분류된 판결 수 &times; 100
              </p>
              <p>
                패소율 = (패소 + 상고 기각 + 소 각하) / 분류된 판결 수 &times; 100
              </p>
              <p className="text-slate-400 mt-1">
                ※ 판결문에서 결과를 파악할 수 없는 건(미분류)은 계산에서 제외됩니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-1">한계 및 유의사항</h4>
              <ul className="space-y-1 ml-4 list-disc">
                <li>행정사건은 &quot;처분청 승소/패소&quot;로 명시되어 높은 정확도를 보입니다.</li>
                <li>민사/형사 사건은 판결문 텍스트 파싱 기반으로, 복잡한 주문의 경우 미분류될 수 있습니다.</li>
                <li>미분류 비율이 높은 법원은 통계 신뢰도가 낮을 수 있습니다.</li>
                <li>판례 수가 30건 미만인 경우 통계적 의미가 제한적입니다.</li>
                <li>대법원 원심 파기는 원고에게 유리한 결과로 분류하나, 재심리 후 결과는 다를 수 있습니다.</li>
              </ul>
            </div>
          </div>
        </details>
      </div>

      {/* AI Recommendation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          AI 관할 추천
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          통계 데이터를 기반으로 AI가 최적 관할 법원을 분석합니다.
          사건 개요를 입력하면 더 구체적인 추천을 받을 수 있습니다.
        </p>

        {/* Optional case description */}
        <div className="mb-4">
          <button
            onClick={() => setShowDescInput(!showDescInput)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showDescInput ? "사건 개요 입력 숨기기" : "사건 개요 입력하기 (선택)"}
          </button>
          {showDescInput && (
            <textarea
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              placeholder="사건의 주요 쟁점, 청구 내용 등을 입력하세요..."
              rows={4}
              className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 resize-y"
            />
          )}
        </div>

        <button
          onClick={requestAI}
          disabled={aiLoading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {aiLoading ? "분석 중..." : "AI 관할 추천 받기"}
        </button>

        {/* AI Output */}
        {(aiText || aiLoading) && (
          <div className="mt-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown>{aiText}</ReactMarkdown>
              {aiLoading && (
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
              )}
            </div>
            {aiDone && (
              <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-200">
                본 분석은 과거 판결 통계에 기반한 참고 자료이며, 실제 소송 결과를 보장하지 않습니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
