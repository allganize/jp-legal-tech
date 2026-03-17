"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  getJudgeProfile,
  reviewDocument,
  reviseDocument,
  type JudgeProfile,
} from "@/lib/api";

function highlightMarkers(text: string): ReactNode[] {
  const parts = text.split(/(【추가】|【수정】|【삭제[^】]*】)/g);
  return parts.map((part, i) => {
    if (part === "【추가】") {
      return (
        <span
          key={i}
          className="inline-block bg-green-100 text-green-800 text-[11px] font-semibold px-1.5 py-0.5 rounded mr-0.5"
        >
          추가
        </span>
      );
    }
    if (part === "【수정】") {
      return (
        <span
          key={i}
          className="inline-block bg-amber-100 text-amber-800 text-[11px] font-semibold px-1.5 py-0.5 rounded mr-0.5"
        >
          수정
        </span>
      );
    }
    if (part.startsWith("【삭제")) {
      return (
        <span
          key={i}
          className="inline-block bg-red-100 text-red-800 text-[11px] font-semibold px-1.5 py-0.5 rounded mr-0.5"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

type StreamState = "idle" | "streaming" | "done" | "error";

export default function JudgeReviewPage() {
  const params = useParams();
  const judgeId = Number(params.id);
  const [profile, setProfile] = useState<JudgeProfile | null>(null);

  // Document input
  const [document, setDocument] = useState("");

  // Review state
  const [feedback, setFeedback] = useState("");
  const [reviewState, setReviewState] = useState<StreamState>("idle");
  const [reviewError, setReviewError] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Revise state
  const [revised, setRevised] = useState("");
  const [reviseState, setReviseState] = useState<StreamState>("idle");
  const [reviseError, setReviseError] = useState("");
  const revisedRef = useRef<HTMLDivElement>(null);

  // Active tab for mobile
  const [activeTab, setActiveTab] = useState<"input" | "review" | "revised">(
    "input"
  );

  useEffect(() => {
    if (!judgeId) return;
    getJudgeProfile(judgeId).then(setProfile);
  }, [judgeId]);

  // Auto-scroll feedback
  useEffect(() => {
    if (feedbackRef.current) {
      feedbackRef.current.scrollTop = feedbackRef.current.scrollHeight;
    }
  }, [feedback]);

  // Auto-scroll revised
  useEffect(() => {
    if (revisedRef.current) {
      revisedRef.current.scrollTop = revisedRef.current.scrollHeight;
    }
  }, [revised]);

  const handleReview = async () => {
    if (!document.trim() || reviewState === "streaming") return;
    setFeedback("");
    setReviewError("");
    setRevised("");
    setReviseState("idle");
    setReviewState("streaming");
    setActiveTab("review");

    await reviewDocument(
      judgeId,
      document,
      (chunk) => setFeedback((prev) => prev + chunk),
      () => setReviewState("done"),
      (err) => {
        setReviewError(err);
        setReviewState("error");
      }
    );
  };

  const handleRevise = async () => {
    if (!feedback || reviseState === "streaming") return;
    setRevised("");
    setReviseError("");
    setReviseState("streaming");
    setActiveTab("revised");

    await reviseDocument(
      judgeId,
      document,
      feedback,
      (chunk) => setRevised((prev) => prev + chunk),
      () => setReviseState("done"),
      (err) => {
        setReviseError(err);
        setReviseState("error");
      }
    );
  };

  const handleReset = () => {
    setDocument("");
    setFeedback("");
    setRevised("");
    setReviewError("");
    setReviseError("");
    setReviewState("idle");
    setReviseState("idle");
    setActiveTab("input");
  };

  const isStreaming =
    reviewState === "streaming" || reviseState === "streaming";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/judge/${judgeId}`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            &larr; {profile?.name || "판사"} 프로필로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            {profile?.name || "..."} 판사 AI 문서 검토
            {profile?.is_supreme_court && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                대법관
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            판결 성향 기반 검토 &rarr; 피드백 반영 보완본 자동 생성
          </p>
        </div>
        {(reviewState === "done" || reviseState === "done") && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700"
          >
            새 문서 검토
          </button>
        )}
      </div>

      {/* Mobile Tabs */}
      <div className="flex gap-1 lg:hidden bg-slate-100 rounded-lg p-1">
        {(
          [
            ["input", "원본 문서"],
            ["review", "검토 결과"],
            ["revised", "보완본"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 text-sm rounded-md transition ${
              activeTab === key
                ? "bg-white text-slate-800 shadow-sm font-medium"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            {key === "review" && reviewState === "streaming" && (
              <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block animate-pulse" />
            )}
            {key === "revised" && reviseState === "streaming" && (
              <span className="ml-1 w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Document Input */}
        <div
          className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${
            activeTab !== "input" ? "hidden lg:block" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-800">
              원본 문서
            </h2>
            <span
              className={`text-xs ${
                document.length > 45000 ? "text-red-500" : "text-slate-400"
              }`}
            >
              {document.length.toLocaleString()} / 50,000
            </span>
          </div>
          <textarea
            value={document}
            onChange={(e) => setDocument(e.target.value.slice(0, 50000))}
            disabled={isStreaming}
            placeholder="소장, 준비서면, 항소이유서 등 법률 문서를 붙여넣으세요..."
            className="w-full h-[560px] p-3 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 leading-relaxed"
          />
          <button
            onClick={handleReview}
            disabled={!document.trim() || reviewState === "streaming"}
            className="w-full mt-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            {reviewState === "streaming" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                검토 중...
              </span>
            ) : (
              "검토 요청"
            )}
          </button>
        </div>

        {/* Column 2: Review Feedback */}
        <div
          className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${
            activeTab !== "review" ? "hidden lg:block" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-800">
              AI 검토 결과
            </h2>
            {reviewState === "done" && (
              <button
                onClick={handleRevise}
                disabled={reviseState === "streaming"}
                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 font-medium"
              >
                {reviseState === "streaming" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    생성 중...
                  </span>
                ) : (
                  "보완본 생성 &rarr;"
                )}
              </button>
            )}
          </div>

          {reviewState === "idle" && !feedback ? (
            <div className="flex flex-col items-center justify-center h-[580px] text-slate-400">
              <svg
                className="w-12 h-12 mb-3 text-slate-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">검토 결과가 여기에 표시됩니다</p>
            </div>
          ) : (
            <>
              {reviewError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                  <p className="text-xs text-red-700">{reviewError}</p>
                  <button
                    onClick={handleReview}
                    className="mt-1 text-xs text-red-600 underline"
                  >
                    다시 시도
                  </button>
                </div>
              )}
              <div
                ref={feedbackRef}
                className="h-[560px] overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:text-slate-600 [&_h4]:mt-3 [&_h4]:mb-1 [&_p]:mb-2.5 [&_p]:text-slate-600 [&_p]:font-normal [&_ul]:mb-2 [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:pl-4 [&_li]:mb-1 [&_li]:text-slate-600 [&_strong]:text-slate-800 [&_strong]:font-semibold [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_blockquote]:border-l-blue-400 [&_blockquote]:bg-blue-50 [&_blockquote]:py-1 [&_blockquote]:px-3 [&_blockquote]:text-slate-600 [&_hr]:my-4 [&_hr]:border-slate-200">
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                  {reviewState === "streaming" && (
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
              {reviewState === "done" && (
                <p className="text-xs text-slate-400 mt-1.5 text-right">
                  {profile?.name} 판사 판결 데이터 {profile?.case_count}건 기반
                </p>
              )}
            </>
          )}
        </div>

        {/* Column 3: Revised Document */}
        <div
          className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${
            activeTab !== "revised" ? "hidden lg:block" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-800">
              보완된 문서
            </h2>
            {reviseState === "done" && revised && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(revised);
                }}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600"
              >
                복사
              </button>
            )}
          </div>

          {reviseState === "idle" && !revised ? (
            <div className="flex flex-col items-center justify-center h-[580px] text-slate-400">
              <svg
                className="w-12 h-12 mb-3 text-slate-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <p className="text-sm">검토 완료 후 보완본을 생성하세요</p>
              <p className="text-xs mt-1 text-slate-300">
                피드백이 반영된 문서가 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <>
              {reviseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                  <p className="text-xs text-red-700">{reviseError}</p>
                  <button
                    onClick={handleRevise}
                    className="mt-1 text-xs text-red-600 underline"
                  >
                    다시 시도
                  </button>
                </div>
              )}
              <div
                ref={revisedRef}
                className="h-[560px] overflow-y-auto p-4 bg-emerald-50/50 rounded-lg border border-emerald-100"
              >
                <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:mb-2.5 [&_p]:text-slate-600 [&_p]:font-normal [&_ul]:mb-2 [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:pl-4 [&_li]:mb-1 [&_li]:text-slate-600 [&_strong]:text-slate-800 [&_strong]:font-semibold">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => {
                        const processChild = (child: ReactNode): ReactNode => {
                          if (typeof child === "string") return highlightMarkers(child);
                          return child;
                        };
                        const processed = Array.isArray(children)
                          ? children.map(processChild)
                          : processChild(children);
                        return <p>{processed}</p>;
                      },
                      li: ({ children }) => {
                        const processChild = (child: ReactNode): ReactNode => {
                          if (typeof child === "string") return highlightMarkers(child);
                          return child;
                        };
                        const processed = Array.isArray(children)
                          ? children.map(processChild)
                          : processChild(children);
                        return <li>{processed}</li>;
                      },
                    }}
                  >
                    {revised}
                  </ReactMarkdown>
                  {reviseState === "streaming" && (
                    <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
              {reviseState === "done" && (
                <p className="text-xs text-slate-400 mt-1.5 text-right">
                  보완 완료 &mdash; 【추가】 【수정】 표시 확인
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
