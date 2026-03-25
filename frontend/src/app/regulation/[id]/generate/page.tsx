"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  getRegulationDetail,
  generateRegulationDocument,
  type RegulationItem,
} from "@/lib/api";

const DOC_TYPES = [
  { key: "research_memo", label: "리서치 메모" },
  { key: "advisory_letter", label: "클라이언트 안내 레터" },
  { key: "newsletter", label: "뉴스레터 초안" },
];

export default function GenerateDocPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("client_id");

  const [reg, setReg] = useState<RegulationItem | null>(null);
  const [docType, setDocType] = useState("research_memo");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) getRegulationDetail(Number(id)).then(setReg).catch(() => {});
  }, [id]);

  const handleGenerate = (force = false) => {
    setOutput("");
    setDone(false);
    setError("");
    setGenerating(true);
    setEditing(false);

    generateRegulationDocument(
      Number(id),
      clientId ? Number(clientId) : null,
      docType,
      (chunk) => setOutput((prev) => prev + chunk),
      () => {
        setGenerating(false);
        setDone(true);
      },
      (err) => {
        setError(err);
        setGenerating(false);
      },
      force
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push(`/regulation/${id}`)}
        className="text-sm text-stone-500 hover:text-stone-700"
      >
        &larr; 규제 상세로 돌아가기
      </button>

      {reg && (
        <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">문서 생성 대상</div>
          <div className="font-semibold text-stone-900">{reg.title}</div>
          <div className="text-sm text-stone-500 mt-1">
            {reg.source} · {reg.category} · {reg.impact_level}
          </div>
        </div>
      )}

      {/* 문서 유형 탭 */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {DOC_TYPES.map((dt) => (
          <button
            key={dt.key}
            onClick={() => {
              setDocType(dt.key);
              setOutput("");
              setDone(false);
              setError("");
              setEditing(false);
            }}
            disabled={generating}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              docType === dt.key
                ? "bg-white text-stone-900 font-medium shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            } disabled:opacity-50`}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* 생성 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-colors"
        >
          {generating ? "생성 중..." : "문서 생성"}
        </button>
        {done && (
          <button
            onClick={() => handleGenerate(true)}
            className="px-4 py-2.5 bg-stone-100 text-stone-600 text-sm rounded-lg hover:bg-stone-200 transition-colors"
          >
            재생성
          </button>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 출력 영역 */}
      {(output || generating) && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-700">
                {DOC_TYPES.find((d) => d.key === docType)?.label}
              </span>
              {generating && (
                <span className="text-xs text-emerald-500 animate-pulse">
                  AI 생성 중...
                </span>
              )}
              {done && (
                <span className="text-xs text-green-600">생성 완료</span>
              )}
            </div>
            {done && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-2.5 py-1 text-xs bg-stone-200 text-stone-600 rounded hover:bg-stone-300 transition-colors"
                >
                  {editing ? "미리보기" : "편집"}
                </button>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs bg-stone-200 text-stone-600 rounded hover:bg-stone-300 transition-colors"
                >
                  복사
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              className="w-full p-6 text-sm text-stone-700 min-h-[500px] focus:outline-none resize-y font-mono"
            />
          ) : (
            <div className="p-6 min-h-[300px] prose prose-stone prose-sm max-w-none prose-headings:text-stone-900 prose-h1:text-xl prose-h1:font-semibold prose-h1:border-b prose-h1:border-stone-200 prose-h1:pb-2 prose-h1:mb-4 prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-5 prose-h3:mb-2 prose-p:text-stone-600 prose-p:leading-relaxed prose-p:mb-3 prose-li:text-stone-600 prose-li:leading-relaxed prose-strong:text-stone-900 prose-hr:my-6 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown>{output}</ReactMarkdown>
              {generating && (
                <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
