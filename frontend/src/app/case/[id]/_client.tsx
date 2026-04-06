"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import FactVisualizationPanel from "@/components/case/FactVisualizationPanel";
import { useI18n } from "@/lib/i18n";

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
  const [error, setError] = useState<string>("");
  const { t } = useI18n();

  const fetchCase = () => {
    setLoading(true);
    setError("");
    setCaseData(null);
    fetch(`${API_BASE}/cases/${caseId}`)
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error(t("case.not_found"));
          if (r.status >= 500) throw new Error(t("case.server_error"));
          throw new Error(t("case.fetch_error"));
        }
        return r.json();
      })
      .then(setCaseData)
      .catch((e) => {
        if (e instanceof TypeError) {
          setError(t("case.network_error"));
        } else {
          setError(e.message || t("case.fetch_error"));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!caseId) return;
    fetchCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 animate-pulse">
          <div className="h-7 bg-stone-100 rounded w-2/3 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-stone-100 rounded w-3/4" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-8 animate-pulse">
          <div className="h-5 bg-stone-100 rounded w-1/4 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-stone-100 rounded w-full" />
            <div className="h-4 bg-stone-100 rounded w-5/6" />
            <div className="h-4 bg-stone-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isRetryable = error !== t("case.not_found");
    return (
      <div className="text-center py-20">
        <p className="text-stone-500 mb-4">{error}</p>
        {isRetryable && (
          <button
            onClick={fetchCase}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            {t("case.retry")}
          </button>
        )}
      </div>
    );
  }

  if (!caseData) return <div className="text-center py-20 text-stone-400">{t("case.not_found")}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-4">
          {caseData.case_name || caseData.case_number}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <MetaItem label={t("case.case_number")} value={caseData.case_number} />
          <MetaItem label={t("case.decision_date")} value={caseData.decision_date} />
          <MetaItem label={t("case.court")} value={caseData.court_name} />
          <MetaItem label={t("case.type")} value={caseData.trial_type} />
          <MetaItem label={t("case.result_type")} value={caseData.result_type} />
          <MetaItem label={t("case.result")} value={caseData.result} />
          {caseData.original_court_name && (
            <MetaItem label={t("case.original_court")} value={caseData.original_court_name} />
          )}
          {caseData.original_case_number && (
            <MetaItem label={t("case.original_case")} value={caseData.original_case_number} />
          )}
          {caseData.article_info && (
            <MetaItem label={t("case.article_info")} value={caseData.article_info} />
          )}
        </div>

        {/* External links + similar search */}
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`https://www.courts.go.jp/hanrei/search1/index.html?text=${encodeURIComponent(
              caseData.case_number
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
          >
            {t("case.search_court")}
          </a>
          {(caseData.case_gist || caseData.gist) && (
            <a
              href={`/search?q=${encodeURIComponent(
                (caseData.case_gist || caseData.gist || "").slice(0, 500)
              )}`}
              className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              {t("case.search_similar")}
            </a>
          )}
        </div>

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
        <HighlightSection title={t("case.gist")} content={stripHtml(caseData.gist)} />
      )}
      {caseData.case_gist && (
        <HighlightSection title={t("case.case_gist")} content={stripHtml(caseData.case_gist)} />
      )}

      {/* 関連判例 */}
      <RelatedCases caseId={caseData.id} />

      {/* 事実の可視化 */}
      {(caseData.full_text || caseData.gist || caseData.case_gist) && (
        <FactVisualizationPanel caseId={caseData.id} />
      )}

      {/* Reference sections */}
      {caseData.ref_law && (
        <Section title={t("case.ref_law")} content={stripHtml(caseData.ref_law)} />
      )}
      {caseData.reference_cases && (
        <Section title={t("case.ref_cases")} content={stripHtml(caseData.reference_cases)} />
      )}

      {/* Full text — with structural formatting */}
      {caseData.full_text && (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8 md:p-10">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">{t("case.full_text")}</h2>
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

interface RelatedCase {
  id: string;
  case_number: string;
  case_name: string | null;
  court_name: string | null;
  decision_date: string | null;
  result: string | null;
}

function RelatedCases({ caseId }: { caseId: string }) {
  const [related, setRelated] = useState<RelatedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    fetch(`${API_BASE}/cases/${caseId}/related?limit=5`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRelated)
      .catch(() => setRelated([]))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading || related.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6 md:p-8">
      <h2 className="text-lg font-semibold text-stone-900 mb-4">{t("case.related")}</h2>
      <div className="space-y-3">
        {related.map((r) => (
          <a
            key={r.id}
            href={`/case/${r.id}`}
            className="flex items-center justify-between rounded-xl border border-stone-100 p-3 hover:bg-stone-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">
                {r.case_name || r.case_number}
              </p>
              <p className="text-xs text-stone-500">
                {r.court_name} {r.decision_date && `| ${r.decision_date}`}
              </p>
            </div>
            {r.result && (
              <span className="ml-2 shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {r.result}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
