"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export interface FactTimelineEvent {
  date: string;
  date_sort: string;
  actor: string;
  action: string;
  category: "contract" | "payment" | "dispute" | "filing" | "ruling" | "other";
  significance: "high" | "medium" | "low";
  source_text?: string;
}

export interface FactTimelineData {
  events: FactTimelineEvent[];
  summary: string;
  parties: string[];
  error?: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  contract: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  payment: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  dispute: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  filing: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  ruling: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  other: { bg: "bg-stone-100", text: "text-stone-600", dot: "bg-stone-400" },
};

const CATEGORY_LABELS: Record<string, string> = {
  contract: "契約",
  payment: "支払",
  dispute: "紛争",
  filing: "申立",
  ruling: "判決",
  other: "その他",
};

const DOT_SIZES: Record<string, string> = {
  high: "w-3.5 h-3.5",
  medium: "w-2.5 h-2.5",
  low: "w-2 h-2",
};

export default function FactTimeline({ data }: { data: FactTimelineData }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!data.events.length) {
    return (
      <div className="text-center py-8 text-stone-400">
        日付情報を抽出できませんでした。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 border-l-4 border-l-emerald-400">
          <p className="text-sm text-emerald-900">{data.summary}</p>
          {data.parties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.parties.map((p, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative border-l-2 border-stone-200 pl-6 space-y-5 ml-3">
        {data.events.map((event, i) => {
          const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.other;
          const dotSize = DOT_SIZES[event.significance] || DOT_SIZES.medium;
          const isExpanded = expandedIdx === i;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="relative"
            >
              {/* Dot on the line */}
              <div
                className={`absolute -left-[calc(1.5rem+1px)] top-1.5 rounded-full ${style.dot} ${dotSize} transform -translate-x-1/2`}
              />

              {/* Event card */}
              <div
                className={`rounded-lg border border-stone-100 p-3 hover:border-stone-200 transition-colors ${
                  event.source_text ? "cursor-pointer" : ""
                }`}
                onClick={() =>
                  event.source_text &&
                  setExpandedIdx(isExpanded ? null : i)
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-stone-400">
                    {event.date}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full ${style.bg} ${style.text}`}
                  >
                    {CATEGORY_LABELS[event.category] || event.category}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-stone-600 shrink-0">
                    {event.actor}
                  </span>
                  <span className="text-sm text-stone-700">{event.action}</span>
                </div>

                {/* Source citation (expandable) */}
                {isExpanded && event.source_text && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 pt-2 border-t border-stone-100"
                  >
                    <p className="text-xs text-stone-400 mb-1">原文引用:</p>
                    <p className="text-xs text-stone-500 leading-relaxed bg-stone-50 rounded p-2">
                      {event.source_text}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
