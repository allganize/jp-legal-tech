"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface CaseDetail {
  id: number;
  case_number: string;
  case_name: string | null;
  court_name: string | null;
  case_type_name: string | null;
  decision_date: string | null;
  decision_type: string | null;
  summary: string | null;
  ruling_gist: string | null;
  reference_articles: string | null;
  reference_cases: string | null;
  full_text: string | null;
  judges: { judge_id: number; name: string; role: string | null }[];
}

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = Number(params.id);
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

  if (loading) return <div className="text-center py-20 text-slate-400">로딩중...</div>;
  if (!caseData) return <div className="text-center py-20 text-slate-400">판례를 찾을 수 없습니다</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {caseData.case_name || caseData.case_number}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-3">
          <span>사건번호: <strong className="text-slate-700">{caseData.case_number}</strong></span>
          <span>선고일: <strong className="text-slate-700">{caseData.decision_date || "-"}</strong></span>
          <span>법원: <strong className="text-slate-700">{caseData.court_name || "-"}</strong></span>
          <span>종류: <strong className="text-slate-700">{caseData.case_type_name || "-"}</strong></span>
          <span>유형: <strong className="text-slate-700">{caseData.decision_type || "-"}</strong></span>
        </div>

        {/* Judges */}
        {caseData.judges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {caseData.judges.map((j) => (
              <a
                key={j.judge_id}
                href={`/judge/${j.judge_id}`}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                {j.name}
                {j.role && <span className="text-blue-400 ml-1">({j.role})</span>}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      {caseData.summary && (
        <Section title="판시사항" content={stripHtml(caseData.summary)} />
      )}
      {caseData.ruling_gist && (
        <Section title="판결요지" content={stripHtml(caseData.ruling_gist)} />
      )}
      {caseData.reference_articles && (
        <Section title="참조조문" content={stripHtml(caseData.reference_articles)} />
      )}
      {caseData.reference_cases && (
        <Section title="참조판례" content={stripHtml(caseData.reference_cases)} />
      )}
      {caseData.full_text && (
        <Section title="판례내용" content={stripHtml(caseData.full_text)} />
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">{title}</h2>
      <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
