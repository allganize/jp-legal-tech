"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface CaseDetail {
  id: string;
  case_number: string;
  case_name: string | null;
  court_name: string | null;
  trial_type: string | null;
  decision_date: string | null;
  result_type: string | null;
  result: string | null;
  gist: string | null;
  case_gist: string | null;
  ref_law: string | null;
  reference_cases: string | null;
  full_text: string | null;
  article_info: string | null;
  detail_page_link: string | null;
  full_pdf_link: string | null;
  original_court_name: string | null;
  original_case_number: string | null;
  judges: { judge_id: number; name: string; role: string | null }[];
}

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Highlight structural keywords in judgment text */
function formatJudgmentText(text: string): ReactNode[] {
  const lines = text.split("\n");
  const structuralKeywords = /^(主\s*文|理\s*由|事\s*実|判\s*決|事実及び理由|第\d+\s|結\s*論|争点|当裁判所の判断)/;

  return lines.map((line, i) => {
    const trimmed = line.replace(/\s+/g, "").trim();
    if (structuralKeywords.test(trimmed) && trimmed.length < 20) {
      return (
        <div key={i} className="mt-8 mb-3 pt-4 border-t border-stone-200 first:border-t-0 first:mt-0 first:pt-0">
          <span className="text-base font-bold text-stone-900 tracking-wide">
            {line}
          </span>
        </div>
      );
    }
    if (line.trim() === "") {
      return <div key={i} className="h-3" />;
    }
    return (
      <div key={i} className="text-stone-700">
        {line}
      </div>
    );
  });
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = String(params.id);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    fetch(`${API_BASE}/cases/${caseId}`)
      .then((r) => r.json())
      .then(setCaseData)
      .catch(() => setCaseData(null))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <div className="text-center py-20 text-stone-400">読み込み中...</div>;
  if (!caseData) return <div className="text-center py-20 text-stone-400">判例が見つかりません</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-4">
          {caseData.case_name || caseData.case_number}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <MetaItem label="事件番号" value={caseData.case_number} />
          <MetaItem label="判決日" value={caseData.decision_date} />
          <MetaItem label="裁判所" value={caseData.court_name} />
          <MetaItem label="種類" value={caseData.trial_type} />
          <MetaItem label="裁判形式" value={caseData.result_type} />
          <MetaItem label="結果" value={caseData.result} />
          {caseData.original_court_name && (
            <MetaItem label="原審裁判所" value={caseData.original_court_name} />
          )}
          {caseData.original_case_number && (
            <MetaItem label="原審事件番号" value={caseData.original_case_number} />
          )}
          {caseData.article_info && (
            <MetaItem label="掲載" value={caseData.article_info} />
          )}
        </div>

        {/* External links */}
        {(caseData.detail_page_link || caseData.full_pdf_link) && (
          <div className="mt-4 flex gap-3">
            {caseData.detail_page_link && (
              <a
                href={caseData.detail_page_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
              >
                裁判所サイト →
              </a>
            )}
            {caseData.full_pdf_link && (
              <a
                href={caseData.full_pdf_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
              >
                判決文PDF →
              </a>
            )}
          </div>
        )}

        {/* Judges */}
        {caseData.judges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {caseData.judges.map((j) => (
              <a
                key={j.judge_id}
                href={`/judge/${j.judge_id}`}
                className="px-3 py-1 text-sm bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors"
              >
                {j.name}
                {j.role && <span className="text-emerald-400 ml-1">({j.role})</span>}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Gist — highlighted with left border */}
      {caseData.gist && (
        <HighlightSection title="判示事項" content={stripHtml(caseData.gist)} />
      )}
      {caseData.case_gist && (
        <HighlightSection title="判決要旨" content={stripHtml(caseData.case_gist)} />
      )}

      {/* Reference sections */}
      {caseData.ref_law && (
        <Section title="参照条文" content={stripHtml(caseData.ref_law)} />
      )}
      {caseData.reference_cases && (
        <Section title="参照判例" content={stripHtml(caseData.reference_cases)} />
      )}

      {/* Full text — with structural formatting */}
      {caseData.full_text && (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8 md:p-10">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">判例内容</h2>
          <div className="text-[15px] leading-[1.9] font-[350]">
            {formatJudgmentText(stripHtml(caseData.full_text))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="py-1">
      <span className="text-stone-400">{label}: </span>
      <strong className="text-stone-700">{value || "-"}</strong>
    </div>
  );
}

function HighlightSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-8 md:p-10 border-l-4 border-l-emerald-400">
      <h2 className="text-lg font-semibold text-emerald-900 mb-4">{title}</h2>
      <div className="text-[15px] leading-[1.9] text-emerald-950 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8 md:p-10">
      <h2 className="text-lg font-semibold text-stone-900 mb-4">{title}</h2>
      <div className="text-[15px] leading-[1.9] text-stone-700 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
