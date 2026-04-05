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
  "#059669",
  "#ef4444",
  "#f59e0b",
  "#0891b2",
  "#78716c",
];

// 法律用語 → 一般用語マッピング
const OUTCOME_LABELS: Record<string, string> = {
  "原告勝訴": "勝訴",
  "原告敗訴": "敗訴",
  "一部認容": "一部勝訴",
  "破棄差戻": "原審破棄（有利）",
  "破棄自判": "原審破棄・確定（有利）",
  "上告棄却": "上告棄却（不利）",
  "上告却下": "上告却下（不利）",
  "却下": "訴え却下（不利）",
};

function toLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome] || outcome;
}

export default function VenueComparePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-stone-400">読み込み中...</div>}>
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
  const [fetchError, setFetchError] = useState<string>("");

  // AI recommendation
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [aiError, setAiError] = useState<string>("");
  const [caseDescription, setCaseDescription] = useState("");
  const [showDescInput, setShowDescInput] = useState(false);

  const fetchComparison = () => {
    if (courtNames.length < 2) return;
    setLoading(true);
    setFetchError("");
    compareVenueCourts(courtNames, caseType || undefined)
      .then((data) => setCourts(data.courts))
      .catch((e) => {
        setFetchError(
          e instanceof TypeError
            ? "ネットワークエラーが発生しました"
            : "比較データの取得に失敗しました"
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComparison();
  }, [searchParams]);

  const requestAI = () => {
    setAiText("");
    setAiLoading(true);
    setAiDone(false);
    setAiError("");
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
        setAiError(err || "AI推薦の取得に失敗しました");
        setAiLoading(false);
      }
    );
  };

  if (courtNames.length < 2) {
    return (
      <div className="text-center py-20 text-stone-400">
        比較する裁判所を2箇所以上選択してください。
        <br />
        <Link href="/venue" className="text-emerald-600 underline mt-2 inline-block">
          裁判所選択に戻る
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-stone-400">統計読み込み中...</div>;
  }

  if (fetchError) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500 mb-4">{fetchError}</p>
        <button
          onClick={fetchComparison}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          再試行
        </button>
      </div>
    );
  }

  // Build comparison bar chart data for parsed outcomes (未分類除外、ラベル変換)
  const allOutcomes = Array.from(
    new Set(courts.flatMap((c) => (c.outcome_distribution || []).map((d) => d.type || "未分類")))
  ).filter((t) => t !== "未分類");
  const outcomeChartData = allOutcomes.map((otype) => {
    const row: Record<string, string | number> = { type: toLabel(otype) };
    courts.forEach((court) => {
      const found = (court.outcome_distribution || []).find((d) => (d.type || "未分類") === otype);
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
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/venue"
            className="text-sm text-emerald-600 hover:underline"
          >
            &larr; 裁判所選択
          </Link>
          <h1 className="text-3xl font-semibold text-stone-900 mt-2">
            管轄裁判所比較
          </h1>
          <p className="text-stone-500 mt-1">
            事件類型: <span className="font-medium text-stone-700">{caseType}</span>
          </p>
        </div>
      </div>

      {/* Rate Cards */}
      <div className={`grid gap-6 ${courts.length === 2 ? "grid-cols-2" : courts.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
        {courts.map((court, i) => (
          <div
            key={court.court_name}
            className={`bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border-2 p-6 ${
              court.rank === 1
                ? "border-emerald-400 ring-2 ring-emerald-50"
                : "border-stone-200"
            }`}
          >
            {court.rank === 1 && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                最も有利な裁判所
              </span>
            )}
            <h3 className="font-semibold text-stone-900 mt-2">
              {court.court_name}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <div
                  className={`text-4xl font-semibold font-mono ${
                    court.acceptance_rate >= 50
                      ? "text-emerald-600"
                      : court.acceptance_rate >= 30
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {court.acceptance_rate}%
                </div>
                <div className="text-xs text-stone-500">
                  認容率
                  {(() => {
                    const classified = (court.outcome_distribution || [])
                      .filter((d) => d.type !== "未分類" && d.type)
                      .reduce((sum, d) => sum + d.count, 0);
                    return classified > 0 ? ` (分類済${classified}件基準)` : "";
                  })()}
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-medium text-red-600">
                    {court.dismissal_rate}%
                  </span>
                  <span className="text-stone-400 ml-1">棄却率</span>
                </div>
                <div>
                  <span className="font-medium font-mono text-stone-700">
                    {court.total_cases}
                  </span>
                  <span className="text-stone-400 ml-1">件</span>
                </div>
              </div>
              {(court.unclassified_rate || 0) >= 80 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                  未分類 {court.unclassified_rate}% — 統計信頼度低
                </p>
              )}
              {(court.unclassified_rate || 0) >= 20 && (court.unclassified_rate || 0) < 80 && (
                <p className="text-xs text-stone-500 bg-stone-50 rounded px-2 py-1">
                  未分類 {court.unclassified_rate}%
                </p>
              )}
              {court.total_cases < 30 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                  サンプル数不足（30件未満）
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Outcome Comparison Chart */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-1">
          判決結果比較
        </h2>
        <p className="text-xs text-stone-400 mb-4">
          各裁判所での勝訴・敗訴・一部勝訴等の判決結果件数を比較します。
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
          <div className="h-[350px] flex items-center justify-center text-stone-400">
            データなし
          </div>
        )}
      </div>

      {/* Yearly Trend Comparison */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-1">
          年度別判決推移比較
        </h2>
        <p className="text-xs text-stone-400 mb-4">
          各裁判所の年度別判決件数の推移を比較します。
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
          <div className="h-[300px] flex items-center justify-center text-stone-400">
            データなし
          </div>
        )}
      </div>

      {/* Top Judges per Court */}
      <div className={`grid gap-6 ${courts.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
        {courts.map((court) => (
          <div
            key={court.court_name}
            className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6"
          >
            <h3 className="text-lg font-semibold text-stone-900 mb-4">
              {court.court_name} 主要裁判官
            </h3>
            {court.top_judges.length > 0 ? (
              <div className="space-y-3">
                {court.top_judges.slice(0, 5).map((judge) => (
                  <Link
                    key={judge.judge_id}
                    href={`/judge/${judge.judge_id}`}
                    className="block p-3 rounded-lg hover:bg-stone-50 transition border border-stone-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-stone-800">
                        {judge.name}
                      </span>
                      <span className="text-sm text-stone-500">
                        {judge.case_count}件
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-emerald-600">
                        認容 {judge.acceptance_rate}%
                      </span>
                      <span className="text-red-500">
                        棄却 {judge.dismissal_rate}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm">裁判官データなし</p>
            )}
          </div>
        ))}
      </div>

      {/* Methodology */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-stone-600 hover:text-stone-800">
            分析根拠および方法論
          </summary>
          <div className="mt-4 space-y-4 text-sm text-stone-600 leading-relaxed">
            <div>
              <h4 className="font-semibold text-stone-700 mb-1">データ出典</h4>
              <p>
                裁判所の判例公開システムから収集した判決文原文をルールベースで分析して算出しています。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-700 mb-1">結果分類方法</h4>
              <ul className="space-y-1 ml-4 list-disc">
                <li>
                  <span className="font-medium">勝訴</span>: 判決主文に&quot;支払え&quot;、&quot;引き渡せ&quot;、&quot;履行せよ&quot;、&quot;取り消す&quot;等の原告請求を認容する表現が含まれる場合
                </li>
                <li>
                  <span className="font-medium">敗訴</span>: 主文に&quot;請求を棄却&quot;、&quot;控訴を棄却&quot;等の原告請求を棄却する表現が含まれる場合
                </li>
                <li>
                  <span className="font-medium">一部勝訴</span>: 請求の一部のみが認容された場合（勝訴と敗訴の表現が同時に存在）
                </li>
                <li>
                  <span className="font-medium">原審破棄（有利）</span>（最高裁）: 下級審判決に誤りがあり差し戻した場合 — 原告に有利
                </li>
                <li>
                  <span className="font-medium">上告棄却（不利）</span>（最高裁）: 下級審判決をそのまま維持した場合 — 原告に不利
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-stone-700 mb-1">認容率の計算</h4>
              <p>
                認容率 = (勝訴 + 一部勝訴 + 原審破棄) / 分類済判決数 &times; 100
              </p>
              <p>
                棄却率 = (敗訴 + 上告棄却 + 訴え却下) / 分類済判決数 &times; 100
              </p>
              <p className="text-stone-400 mt-1">
                ※ 判決文から結果を把握できない件（未分類）は計算から除外されます。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-700 mb-1">限界および注意事項</h4>
              <ul className="space-y-1 ml-4 list-disc">
                <li>行政事件は&quot;処分庁勝訴/敗訴&quot;と明示されており、高い精度を示します。</li>
                <li>民事/刑事事件は判決文テキスト解析に基づくため、複雑な主文の場合は未分類となる場合があります。</li>
                <li>未分類の割合が高い裁判所は統計信頼度が低い可能性があります。</li>
                <li>判例数が30件未満の場合、統計的意味が限定的です。</li>
                <li>最高裁の原審破棄は原告に有利な結果として分類しますが、再審理後の結果は異なる場合があります。</li>
              </ul>
            </div>
          </div>
        </details>
      </div>

      {/* AI Recommendation */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">
          AI管轄推薦
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          統計データに基づきAIが最適な管轄裁判所を分析します。
          事件概要を入力するとより具体的な推薦を受けられます。
        </p>

        {/* Optional case description */}
        <div className="mb-4">
          <button
            onClick={() => setShowDescInput(!showDescInput)}
            className="text-sm text-emerald-600 hover:underline"
          >
            {showDescInput ? "事件概要入力を隠す" : "事件概要を入力する（任意）"}
          </button>
          {showDescInput && (
            <textarea
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              placeholder="事件の主要争点、請求内容等を入力してください..."
              rows={4}
              className="mt-2 w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-700 resize-y"
            />
          )}
        </div>

        <button
          onClick={requestAI}
          disabled={aiLoading}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50"
        >
          {aiLoading ? "分析中..." : "AI管轄推薦を受ける"}
        </button>

        {/* AI Output */}
        {aiError && (
          <div className="mt-6 p-6 bg-red-50 rounded-lg border border-red-200 text-center">
            <p className="text-red-600 mb-3">{aiError}</p>
            <button
              onClick={requestAI}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              再試行
            </button>
          </div>
        )}
        {!aiError && (aiText || aiLoading) && (
          <div className="mt-6 p-6 bg-stone-50 rounded-lg border border-stone-200">
            <div className="prose prose-stone prose-sm max-w-none">
              <ReactMarkdown>{aiText}</ReactMarkdown>
              {aiLoading && (
                <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-0.5" />
              )}
            </div>
            {aiDone && (
              <p className="text-xs text-stone-400 mt-4 pt-4 border-t border-stone-200">
                本分析は過去の判決統計に基づく参考資料であり、実際の訴訟結果を保証するものではありません。
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
