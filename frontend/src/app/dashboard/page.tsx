"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  searchJudges,
  getCollectionStatus,
  startCollection,
  stopCollection,
  type JudgeSearchResult,
  type CollectionStatus,
} from "@/lib/api";

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JudgeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CollectionStatus | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchJudges(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setStatus(await getCollectionStatus());
      } catch {
        /* backend not running */
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-10">
      <div className="text-center py-12">
        <h1 className="text-4xl font-semibold text-stone-900 mb-4">
          판사 판결 분석 대시보드
        </h1>
        <p className="text-lg text-stone-500 mb-8">
          판사 이름을 검색하여 판결 이력과 성향을 분석하세요
        </p>

        <div className="max-w-xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="판사 이름을 입력하세요..."
            className="w-full px-6 py-4 text-lg border-2 border-stone-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none shadow-sm bg-white text-stone-800 placeholder-stone-400"
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">
              검색중...
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 divide-y divide-stone-100">
          {results.map((judge) => (
            <button
              key={judge.id}
              onClick={() => router.push(`/judge/${judge.id}`)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors text-left"
            >
              <div>
                <span className="font-semibold text-stone-800">
                  {judge.name}
                </span>
                {judge.is_supreme_court && (
                  <span className="ml-2 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-full">
                    대법관
                  </span>
                )}
                <div className="text-sm text-stone-500 mt-1">
                  {judge.court_name || "법원 미상"}
                  {judge.first_seen_date && judge.last_seen_date && (
                    <span className="ml-2">
                      ({judge.first_seen_date.slice(0, 4)} ~{" "}
                      {judge.last_seen_date.slice(0, 4)})
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold font-mono text-emerald-600">
                  {judge.case_count}
                </div>
                <div className="text-xs text-stone-400">판결</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <p className="text-center text-stone-400">검색 결과가 없습니다</p>
      )}

      {status && (
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            {showAdmin ? "▼" : "▶"} 데이터 수집 현황 (판례{" "}
            {status.total_cases.toLocaleString()}건 / 판사{" "}
            {status.total_judges.toLocaleString()}명)
          </button>

          {showAdmin && (
            <div className="mt-4 p-6 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 space-y-4">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <Stat label="전체 판례" value={status.total_cases} />
                <Stat label="상세 수집" value={status.detail_fetched} />
                <Stat label="파싱 판결문" value={status.with_judge_info} />
                <Stat label="판사 수" value={status.total_judges} />
              </div>

              <div className="flex gap-2 flex-wrap">
                {["all", "search", "detail", "parse"].map((phase) => (
                  <button
                    key={phase}
                    onClick={() => startCollection(phase)}
                    disabled={status.is_running}
                    className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50"
                  >
                    {{ all: "전체 수집", search: "검색 수집", detail: "상세 수집", parse: "파싱" }[phase]}
                  </button>
                ))}
                {status.is_running && (
                  <button
                    onClick={() => stopCollection()}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    중지
                  </button>
                )}
              </div>

              {status.is_running && (
                <div className="text-sm text-green-600 animate-pulse">
                  ● 수집 진행 중...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-stone-50 rounded-lg p-3">
      <div className="text-stone-500 text-xs">{label}</div>
      <div className="text-xl font-semibold font-mono text-stone-800">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
