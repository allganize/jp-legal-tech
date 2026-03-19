"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getVenueCaseTypes,
  getVenueCourts,
  type Distribution,
  type CourtSummary,
} from "@/lib/api";

export default function VenuePage() {
  const router = useRouter();
  const [caseTypes, setCaseTypes] = useState<Distribution[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [courts, setCourts] = useState<CourtSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getVenueCaseTypes().then(setCaseTypes);
  }, []);

  useEffect(() => {
    if (!selectedType) {
      setCourts([]);
      return;
    }
    setLoading(true);
    setSelected(new Set());
    getVenueCourts(selectedType)
      .then(setCourts)
      .finally(() => setLoading(false));
  }, [selectedType]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < 5) next.add(name);
      return next;
    });
  };

  const goCompare = () => {
    if (selected.size < 2) return;
    const params = new URLSearchParams({
      courts: Array.from(selected).join(","),
      case_type: selectedType,
    });
    router.push(`/venue/compare?${params}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          관할/재판부 최적화 추천
        </h1>
        <p className="text-slate-500 mt-2">
          사건 유형을 선택하면 법원별 판결 통계를 비교할 수 있습니다.
          법원을 2~5개 선택하여 상세 비교하세요.
        </p>
      </div>

      {/* Case Type Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          사건 유형 선택
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full max-w-md border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 bg-white"
        >
          <option value="">사건 유형을 선택하세요</option>
          {caseTypes.map((ct) => (
            <option key={ct.type} value={ct.type}>
              {ct.type} ({ct.count}건)
            </option>
          ))}
        </select>
      </div>

      {/* Court Grid */}
      {loading && (
        <div className="text-center py-12 text-slate-400">로딩중...</div>
      )}

      {!loading && courts.length > 0 && (
        <>
          {/* Compare Button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {courts.length}개 법원 | {selected.size}개 선택됨
            </p>
            <button
              onClick={goCompare}
              disabled={selected.size < 2}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              선택 법원 비교하기 ({selected.size}/2~5)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map((court) => {
              const isSelected = selected.has(court.court_name);
              return (
                <button
                  key={court.court_name}
                  onClick={() => toggle(court.court_name)}
                  className={`text-left bg-white rounded-xl shadow-sm border-2 p-5 transition-all hover:shadow-md ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {court.court_name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {selectedType} 관련 판결
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "border-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold text-slate-800">
                        {court.total_cases}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">건</span>
                    </div>
                    {court.acceptance_rate != null && court.classified_cases > 0 && (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          court.acceptance_rate >= 50
                            ? "text-emerald-600"
                            : court.acceptance_rate >= 30
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}>
                          {court.acceptance_rate}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          승소율 ({court.classified_cases}건)
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!loading && selectedType && courts.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          해당 사건 유형의 판결 데이터가 없습니다
        </div>
      )}
    </div>
  );
}
