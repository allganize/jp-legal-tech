"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StepStepper from "@/components/strategy/StepStepper";
import {
  searchJudges,
  getJudgeProfile,
  createStrategySession,
  type JudgeSearchResult,
  type JudgeProfile,
} from "@/lib/api";

const CASE_TYPES = [
  {
    value: "civil",
    label: "民事訴訟",
    desc: "損害賠償、契約紛争、不動産等",
    icon: "\u2696\uFE0F",
  },
  {
    value: "criminal",
    label: "刑事訴訟",
    desc: "刑事事件の弁護戦略",
    icon: "\uD83D\uDD28",
  },
  {
    value: "administrative",
    label: "行政訴訟",
    desc: "行政処分取消、国家賠償等",
    icon: "\uD83C\uDFDB\uFE0F",
  },
];

export default function StrategyPage() {
  const router = useRouter();
  const [caseType, setCaseType] = useState("");
  const [partyPosition, setPartyPosition] = useState<"plaintiff" | "defendant">(
    "plaintiff"
  );
  const [overview, setOverview] = useState("");
  const [judgeQuery, setJudgeQuery] = useState("");
  const [judgeResults, setJudgeResults] = useState<JudgeSearchResult[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<JudgeSearchResult | null>(
    null
  );
  const [judgeProfile, setJudgeProfile] = useState<JudgeProfile | null>(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Judge search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!judgeQuery.trim()) {
      setJudgeResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setJudgeLoading(true);
      try {
        const data = await searchJudges(judgeQuery);
        setJudgeResults(data);
      } catch {
        setJudgeResults([]);
      } finally {
        setJudgeLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [judgeQuery]);

  // Load judge profile when selected
  useEffect(() => {
    if (!selectedJudge) {
      setJudgeProfile(null);
      return;
    }
    getJudgeProfile(selectedJudge.id)
      .then(setJudgeProfile)
      .catch(() => setJudgeProfile(null));
  }, [selectedJudge]);

  const handleSelectJudge = (judge: JudgeSearchResult) => {
    setSelectedJudge(judge);
    setJudgeQuery(judge.name);
    setJudgeResults([]);
  };

  const handleSubmit = async () => {
    if (!caseType || !overview.trim()) {
      setError("案件種類と概要は必須です。");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const session = await createStrategySession({
        case_type: caseType,
        party_position: partyPosition,
        overview: overview.trim(),
        judge_id: selectedJudge?.id ?? null,
      });
      router.push(`/strategy/issues?session=${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "セッション作成に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = caseType && overview.trim().length >= 10;

  return (
    <div className="min-h-screen bg-stone-50">
      <StepStepper currentStep={1} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-stone-900">
            訴訟戦略シミュレーター
          </h1>
          <p className="text-stone-500 mt-2">
            案件情報を入力して、AIによる訴訟戦略の分析を開始します。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Type */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">
                案件種類
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CASE_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setCaseType(ct.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      caseType === ct.value
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="text-2xl mb-2">{ct.icon}</div>
                    <div className="font-semibold text-stone-900">
                      {ct.label}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">{ct.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Party Position */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">
                当事者の立場
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPartyPosition("plaintiff")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                    partyPosition === "plaintiff"
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  原告
                </button>
                <button
                  onClick={() => setPartyPosition("defendant")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                    partyPosition === "defendant"
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  被告
                </button>
              </div>
            </div>

            {/* Case Overview */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">
                案件概要
              </h2>
              <textarea
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                placeholder="事案の事実関係を詳しく記述してください（例：原告は被告との間で不動産売買契約を締結したが、被告が引渡し期限を経過しても物件の引渡しを行わず...）"
                className="w-full h-40 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 resize-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none"
              />
              <div className="flex justify-end mt-2">
                <span
                  className={`text-xs ${
                    overview.length >= 10 ? "text-stone-400" : "text-amber-500"
                  }`}
                >
                  {overview.length}文字（10文字以上）
                </span>
              </div>
            </div>

            {/* Judge Search */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-1">
                担当裁判官（任意）
              </h2>
              <p className="text-sm text-stone-500 mb-4">
                裁判官が分かっている場合は選択すると、傾向分析を加味した戦略を生成します。
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={judgeQuery}
                  onChange={(e) => {
                    setJudgeQuery(e.target.value);
                    if (selectedJudge && e.target.value !== selectedJudge.name) {
                      setSelectedJudge(null);
                    }
                  }}
                  placeholder="裁判官名で検索..."
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none"
                />
                {judgeLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                    検索中...
                  </div>
                )}
                {judgeResults.length > 0 && !selectedJudge && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-stone-200 shadow-lg max-h-60 overflow-y-auto">
                    {judgeResults.map((judge) => (
                      <button
                        key={judge.id}
                        onClick={() => handleSelectJudge(judge)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors text-left border-b border-stone-100 last:border-b-0"
                      >
                        <div>
                          <span className="font-semibold text-stone-800">
                            {judge.name}
                          </span>
                          {judge.is_supreme_court && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full">
                              最高裁判事
                            </span>
                          )}
                          <div className="text-xs text-stone-500 mt-0.5">
                            {judge.court_name || "裁判所不明"}
                          </div>
                        </div>
                        <div className="text-sm font-mono text-emerald-600 font-semibold">
                          {judge.case_count}件
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedJudge && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                    {selectedJudge.name}（{selectedJudge.court_name || "裁判所不明"}）
                  </span>
                  <button
                    onClick={() => {
                      setSelectedJudge(null);
                      setJudgeQuery("");
                    }}
                    className="text-stone-400 hover:text-stone-600 text-sm"
                  >
                    解除
                  </button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full bg-emerald-600 text-white rounded-xl py-3 font-semibold hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "作成中..." : "次のステップ \u2192"}
            </button>
          </div>

          {/* Right: Judge Profile Panel (1/3) */}
          <div className="lg:col-span-1">
            {judgeProfile ? (
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">
                  裁判官プロフィール
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-semibold text-stone-900">
                      {judgeProfile.name}
                    </div>
                    <div className="text-sm text-stone-500 mt-1">
                      {judgeProfile.court_name || "裁判所不明"}
                    </div>
                    {judgeProfile.is_supreme_court && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full">
                        最高裁判事
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 rounded-lg p-3">
                      <div className="text-xs text-stone-500">判決件数</div>
                      <div className="text-xl font-semibold font-mono text-stone-800">
                        {judgeProfile.case_count.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-3">
                      <div className="text-xs text-stone-500">活動期間</div>
                      <div className="text-sm font-semibold text-stone-800 mt-1">
                        {judgeProfile.first_seen_date?.slice(0, 4) || "?"} ~{" "}
                        {judgeProfile.last_seen_date?.slice(0, 4) || "?"}
                      </div>
                    </div>
                  </div>

                  {/* Case type distribution */}
                  {judgeProfile.case_type_distribution.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-stone-700 mb-2">
                        事件種類別
                      </div>
                      <div className="space-y-1.5">
                        {judgeProfile.case_type_distribution
                          .slice(0, 5)
                          .map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="flex-1 text-xs text-stone-600 truncate">
                                {d.type}
                              </div>
                              <div className="w-24 bg-stone-100 rounded-full h-1.5">
                                <div
                                  className="bg-emerald-500 h-1.5 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (d.count / judgeProfile.case_count) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <div className="text-xs text-stone-500 font-mono w-8 text-right">
                                {d.count}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Result distribution */}
                  {judgeProfile.result_type_distribution.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-stone-700 mb-2">
                        判決結果
                      </div>
                      <div className="space-y-1.5">
                        {judgeProfile.result_type_distribution.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 text-xs text-stone-600 truncate">
                              {d.type}
                            </div>
                            <div className="text-xs text-stone-500 font-mono">
                              {d.count}件
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6 sticky top-24">
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-30">
                    {"\uD83D\uDC68\u200D\u2696\uFE0F"}
                  </div>
                  <p className="text-sm text-stone-400">
                    裁判官を検索して選択すると
                    <br />
                    プロフィールが表示されます
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
