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
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">
          管轄/裁判部最適化推薦
        </h1>
        <p className="text-stone-500 mt-2">
          事件類型を選択すると裁判所別の判決統計を比較できます。
          裁判所を2~5箇所選択して詳細比較してください。
        </p>
      </div>

      {/* Case Type Selector */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
        <label className="block text-sm font-medium text-stone-700 mb-2">
          事件類型の選択
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full max-w-md border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 bg-white"
        >
          <option value="">事件類型を選択してください</option>
          {caseTypes.map((ct) => (
            <option key={ct.type} value={ct.type}>
              {ct.type} ({ct.count}件)
            </option>
          ))}
        </select>
      </div>

      {/* Court Grid */}
      {loading && (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      )}

      {!loading && courts.length > 0 && (
        <>
          {/* Compare Button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {courts.length}箇所の裁判所 | {selected.size}箇所選択済
            </p>
            <button
              onClick={goCompare}
              disabled={selected.size < 2}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              選択裁判所を比較する ({selected.size}/2~5)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court) => {
              const isSelected = selected.has(court.court_name);
              return (
                <button
                  key={court.court_name}
                  onClick={() => toggle(court.court_name)}
                  className={`text-left bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border-2 p-6 transition-all hover:shadow-md ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-100"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-stone-900">
                        {court.court_name}
                      </h3>
                      <p className="text-sm text-stone-500 mt-1">
                        {selectedType} 関連判決
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600"
                          : "border-stone-300"
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
                      <span className="text-3xl font-semibold font-mono text-stone-900">
                        {court.total_cases}
                      </span>
                      <span className="text-sm text-stone-500 ml-1">件</span>
                    </div>
                    {court.acceptance_rate != null && court.classified_cases > 0 && (
                      <div className="text-right">
                        <div className={`text-lg font-semibold font-mono ${
                          court.acceptance_rate >= 50
                            ? "text-emerald-600"
                            : court.acceptance_rate >= 30
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}>
                          {court.acceptance_rate}%
                        </div>
                        <div className="text-[10px] text-stone-400">
                          認容率 ({court.classified_cases}件)
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
        <div className="text-center py-12 text-stone-400">
          該当事件類型の判決データがありません
        </div>
      )}
    </div>
  );
}
