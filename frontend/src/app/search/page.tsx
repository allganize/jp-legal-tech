"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  type CitedChunk,
  type SearchFilterOptions,
  type TimelineEvent,
  type SearchFilters,
  getSearchFilters,
  searchSimilarCases,
  searchAndAnalyze,
  generateTimeline,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const COURT_LEVELS: Record<string, number> = {
  最高裁判所: 4,
  高等裁判所: 3,
  地方裁判所: 2,
  簡易裁判所: 1,
  家庭裁判所: 2,
  知的財産高等裁判所: 3,
};

function getCourtLevel(name: string | null): number {
  if (!name) return 2;
  for (const [key, val] of Object.entries(COURT_LEVELS)) {
    if (name.includes(key)) return val;
  }
  return 2;
}

const FAVORABLE = ["認容", "一部認容", "破棄差戻", "破棄自判", "取消", "変更"];

function isFavorable(result: string | null): boolean | null {
  if (!result) return null;
  return FAVORABLE.some((f) => result.includes(f));
}

function SearchSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-stone-200 bg-white p-5"
        >
          <div className="flex gap-2">
            <div className="h-4 w-32 rounded bg-stone-200" />
            <div className="h-4 w-24 rounded bg-stone-100" />
            <div className="h-4 w-20 rounded bg-stone-100" />
          </div>
          <div className="mt-2 h-4 w-3/4 rounded bg-stone-100" />
          <div className="mt-2 h-3 w-full rounded bg-stone-50" />
          <div className="mt-1 h-3 w-2/3 rounded bg-stone-50" />
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-stone-400">読み込み中...</div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [filterOpts, setFilterOpts] = useState<SearchFilterOptions | null>(
    null
  );
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<CitedChunk[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");

  useEffect(() => {
    getSearchFilters().then(setFilterOpts).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (query.length < 10) return;
    setSearching(true);
    setSearchDone(false);
    setSearchError("");
    setResults([]);
    setAiText("");
    setAiDone(false);
    setTimeline([]);
    setTimelineError("");
    setSelectedIds(new Set());

    try {
      const result = await searchSimilarCases(query, filters, 15);
      setResults(result.cases);
      if (result.analysis) {
        setAiText(result.analysis);
        setAiDone(true);
      }
    } catch (err: unknown) {
      setSearchError(
        err instanceof Error ? err.message : "検索に失敗しました"
      );
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [query, filters]);

  const handleAnalyze = useCallback(() => {
    setAiText("");
    setAiLoading(true);
    setAiDone(false);

    searchAndAnalyze(
      query,
      Object.keys(filters).length > 0 ? filters : null,
      15,
      (chunk) => {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed.type === "cases" && parsed.data) {
            setResults(parsed.data);
            return;
          }
          if (parsed.type === "error") {
            setAiText(`エラー: ${parsed.message}`);
            setAiLoading(false);
            return;
          }
        } catch {
          // テキストチャンク
        }
        setAiText((prev) => prev + chunk);
      },
      () => {
        setAiLoading(false);
        setAiDone(true);
      },
      (err) => {
        setAiText(`エラー: ${err}`);
        setAiLoading(false);
      }
    );
  }, [query, filters]);

  const handleTimeline = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setTimelineLoading(true);
    setTimelineError("");
    try {
      const events = await generateTimeline(ids, query);
      setTimeline(events);
    } catch (err: unknown) {
      setTimelineError(
        err instanceof Error
          ? err.message
          : "タイムラインの生成に失敗しました"
      );
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [selectedIds, query]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(results.map((r) => r.case_id)));
  };

  // Invalid Date 防御
  const chartData = timeline
    .filter((e) => e.date && !isNaN(new Date(e.date).getTime()))
    .map((e) => ({
      x: new Date(e.date).getTime(),
      y: getCourtLevel(e.court_name),
      ...e,
    }));

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          {t("search.title")}
        </h1>
        <p className="mt-2 text-stone-500 text-sm md:text-base">
          {t("search.subtitle")}
        </p>
      </div>

      {/* 検索入力 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 md:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
          }}
          rows={5}
          className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          placeholder={t("search.placeholder")}
        />

        {/* フィルタ */}
        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3">
          <select
            value={filters.court_name || ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                court_name: e.target.value || undefined,
              }))
            }
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700"
          >
            <option value="">{t("search.court_all")}</option>
            {filterOpts?.courts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.trial_type || ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                trial_type: e.target.value || undefined,
              }))
            }
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700"
          >
            <option value="">{t("search.type_all")}</option>
            {filterOpts?.trial_types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {filterOpts && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={`${filterOpts.year_range.min}`}
                min={filterOpts.year_range.min}
                max={filterOpts.year_range.max}
                value={filters.year_from || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    year_from: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                className="w-24 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700"
              />
              <span className="text-sm text-stone-400">～</span>
              <input
                type="number"
                placeholder={`${filterOpts.year_range.max}`}
                min={filterOpts.year_range.min}
                max={filterOpts.year_range.max}
                value={filters.year_to || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    year_to: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                className="w-24 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSearch}
            disabled={searching || query.length < 10}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {searching ? t("search.searching") : t("search.button")}
          </button>
          {results.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={aiLoading}
              className="rounded-xl border border-emerald-600 px-6 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? t("search.analyzing") : t("search.ai_analyze")}
            </button>
          )}
        </div>

        {query.length > 0 && query.length < 10 && (
          <p className="mt-2 text-xs text-stone-400">
            {t("search.min_chars")}（{query.length}/10）
          </p>
        )}

        {searchError && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {searchError}
            <button
              onClick={handleSearch}
              className="ml-2 underline hover:no-underline"
            >
              {t("search.retry")}
            </button>
          </div>
        )}
      </div>

      {/* 検索中スケルトン */}
      {searching && <SearchSkeleton />}

      {/* 検索結果なし */}
      {searchDone && !searching && results.length === 0 && !searchError && !aiText && (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <p className="text-stone-500">
            {t("search.no_results")}
          </p>
          <p className="mt-2 text-sm text-stone-400">
            {t("search.no_results_hint")}
          </p>
        </div>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-stone-900">
              {t("search.results")}（{results.length}{t("common.cases")}）
            </h2>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                {t("search.select_all")}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleTimeline}
                  disabled={timelineLoading}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {timelineLoading
                    ? t("search.generating")
                    : `${t("search.timeline")}（${selectedIds.size}${t("common.cases")}）`}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {results.map((c) => {
              const fav = isFavorable(c.result);
              return (
                <div
                  key={c.case_id || c.case_number}
                  className={`rounded-2xl border bg-white p-4 md:p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-colors ${
                    selectedIds.has(c.case_id)
                      ? "border-emerald-400 ring-2 ring-emerald-50"
                      : "border-stone-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="font-mono font-medium text-stone-900">
                          {c.case_number}
                        </span>
                        {c.court_name && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 whitespace-nowrap">
                            {c.court_name}
                          </span>
                        )}
                        {c.decision_date && (
                          <span className="text-xs text-stone-400">
                            {c.decision_date}
                          </span>
                        )}
                        {c.result && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                              fav === true
                                ? "bg-emerald-50 text-emerald-700"
                                : fav === false
                                ? "bg-red-50 text-red-700"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {c.result}
                          </span>
                        )}
                      </div>
                      {c.case_name && (
                        <p className="mt-1 text-sm text-stone-700 truncate">
                          {c.case_name}
                        </p>
                      )}
                      {c.chunk_text && (
                        <p className="mt-2 text-xs leading-relaxed text-stone-500 line-clamp-3">
                          {c.chunk_text}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex items-center gap-2 shrink-0">
                      {c.case_id && (
                        <a
                          href={`/case/${c.case_id}`}
                          className="text-sm text-emerald-600 hover:text-emerald-700 whitespace-nowrap hidden sm:inline"
                        >
                          {t("search.detail")} &rarr;
                        </a>
                      )}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.case_id)}
                        onChange={() => toggleSelect(c.case_id)}
                        className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        aria-label={`${c.case_number}を選択`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI分析 */}
      {(aiText || aiLoading) && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 md:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            {t("search.ai_title")}
          </h2>
          <div className="prose prose-sm prose-stone max-w-none">
            <ReactMarkdown>{aiText}</ReactMarkdown>
            {aiLoading && (
              <span className="inline-block h-4 w-1 animate-pulse bg-emerald-500 ml-0.5" />
            )}
          </div>
          {aiDone && (
            <p className="mt-4 text-xs text-stone-400">
              {t("search.ai_disclaimer")}
            </p>
          )}
        </div>
      )}

      {/* タイムラインエラー */}
      {timelineError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {timelineError}
          <button
            onClick={handleTimeline}
            className="ml-2 underline hover:no-underline"
          >
            再試行
          </button>
        </div>
      )}

      {/* タイムライン */}
      {timeline.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 md:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            {t("search.timeline_title")}
          </h2>

          {/* チャート */}
          {chartData.length > 0 && (
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart
                  margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
                >
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(v) => `${new Date(v).getFullYear()}`}
                    tick={{ fontSize: 12 }}
                    name="判決日"
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    domain={[0.5, 4.5]}
                    ticks={[1, 2, 3, 4]}
                    tickFormatter={(v: number) => {
                      const labels: Record<number, string> = {
                        1: "簡裁",
                        2: "地裁",
                        3: "高裁",
                        4: "最高裁",
                      };
                      return labels[v] || "";
                    }}
                    tick={{ fontSize: 12 }}
                    name="裁判所"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload as TimelineEvent & {
                        x: number;
                        y: number;
                      };
                      return (
                        <div className="rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-lg max-w-xs">
                          <p className="font-medium text-stone-900">
                            {d.case_number}
                          </p>
                          <p className="text-stone-500">{d.court_name}</p>
                          <p className="text-stone-500">{d.date}</p>
                          <p className="text-stone-500">{d.result}</p>
                          <p className="mt-1 text-stone-700">
                            {d.fact_summary}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={chartData}>
                    {chartData.map((entry, i) => {
                      const fav = isFavorable(entry.result);
                      return (
                        <Cell
                          key={i}
                          fill={
                            fav === true
                              ? "#059669"
                              : fav === false
                              ? "#dc2626"
                              : "#78716c"
                          }
                          r={8}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  {t("search.favorable")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                  {t("search.unfavorable")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-stone-500" />
                  {t("search.other")}
                </span>
              </div>
            </div>
          )}

          {/* 縦型タイムライン */}
          <div className="relative border-l-2 border-stone-200 pl-6 space-y-6">
            {timeline.map((e, i) => {
              const fav = isFavorable(e.result);
              return (
                <div key={`${e.case_id}-${i}`} className="relative">
                  <div
                    className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      fav === true
                        ? "bg-emerald-500"
                        : fav === false
                        ? "bg-red-500"
                        : "bg-stone-400"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-mono font-medium text-stone-900">
                      {e.date}
                    </span>
                    <span className="text-stone-500">{e.court_name}</span>
                    {e.result && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          fav === true
                            ? "bg-emerald-50 text-emerald-700"
                            : fav === false
                            ? "bg-red-50 text-red-700"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {e.result}
                      </span>
                    )}
                  </div>
                  <a
                    href={`/case/${e.case_id}`}
                    className="mt-0.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {e.case_number}
                  </a>
                  <p className="mt-1 text-xs text-stone-600">
                    {e.fact_summary}
                  </p>
                  {e.relevance && (
                    <p className="mt-0.5 text-xs text-stone-400">
                      {t("search.relevance")}: {e.relevance}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
