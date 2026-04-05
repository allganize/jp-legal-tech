"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepStepper from "@/components/strategy/StepStepper";
import { createStrategyBrief } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const SECTIONS = [
  { id: "header", label: "表題・当事者" },
  { id: "facts", label: "事実関係" },
  { id: "issues", label: "争点整理" },
  { id: "arguments", label: "主張" },
  { id: "evidence", label: "証拠" },
  { id: "conclusion", label: "結語" },
];

function BriefContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "";

  const [content, setContent] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [activeSections, setActiveSections] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("セッションIDが見つかりません。");
      return;
    }

    let cancelled = false;

    const startStreaming = async () => {
      try {
        const { brief_id } = await createStrategyBrief(sessionId);
        if (cancelled) return;

        setStreaming(true);

        const res = await fetch(
          `${API_BASE}/strategy/${sessionId}/brief/${brief_id}/stream`,
          {
            headers: { "ngrok-skip-browser-warning": "true" },
          }
        );

        if (!res.ok) {
          throw new Error("ストリーミングの開始に失敗しました。");
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("ストリーミングを開始できません。");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone || cancelled) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                setStreaming(false);
                setDone(true);
                return;
              }
              if (data.startsWith("[ERROR]")) {
                setError(data.slice(8));
                setStreaming(false);
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "text" && parsed.content) {
                  setContent((prev) => prev + parsed.content);
                }
              } catch {
                setContent((prev) => prev + data);
              }
            }
          }
        }

        setStreaming(false);
        setDone(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "書面生成に失敗しました。"
          );
          setStreaming(false);
        }
      }
    };

    startStreaming();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Detect active sections based on content
  useEffect(() => {
    const active = new Set<string>();
    if (content.includes("原告") || content.includes("被告"))
      active.add("header");
    if (content.includes("事実") || content.includes("経緯"))
      active.add("facts");
    if (content.includes("争点")) active.add("issues");
    if (content.includes("主張") || content.includes("よって"))
      active.add("arguments");
    if (content.includes("証拠") || content.includes("甲号証"))
      active.add("evidence");
    if (content.includes("結語") || content.includes("以上"))
      active.add("conclusion");
    setActiveSections(active);
  }, [content]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (streaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, streaming]);

  const handleNext = () => {
    router.push(`/strategy/review?session=${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <StepStepper currentStep={4} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-stone-900">書面生成</h1>
          <p className="text-stone-500 mt-2">
            AIが訴訟戦略に基づいた準備書面を生成しています。
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* Minimap Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-4">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                セクション
              </h3>
              <div className="space-y-1">
                {SECTIONS.map((section) => {
                  const isActive = activeSections.has(section.id);
                  return (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 py-1.5"
                    >
                      <div
                        className={`w-2 h-2 rounded-full transition-colors ${
                          isActive ? "bg-emerald-500" : "bg-stone-200"
                        }`}
                      />
                      <span
                        className={`text-xs transition-colors ${
                          isActive
                            ? "text-stone-800 font-medium"
                            : "text-stone-400"
                        }`}
                      >
                        {section.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {streaming && (
                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600">
                  <svg
                    className="animate-spin h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  生成中...
                </div>
              )}
              {done && (
                <div className="mt-4 text-xs text-emerald-600 font-medium">
                  生成完了
                </div>
              )}
            </div>
          </div>

          {/* Document Paper */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 overflow-hidden">
            {/* Paper Header */}
            <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                準備書面
              </div>
              {streaming && (
                <span className="text-xs text-emerald-600 animate-pulse">
                  ストリーミング中
                </span>
              )}
            </div>

            {/* Paper Content */}
            <div
              ref={contentRef}
              className="px-8 py-8 md:px-12 md:py-10 max-h-[70vh] overflow-y-auto"
              style={{ fontFamily: '"Noto Serif JP", serif' }}
            >
              {!content && !error && (
                <div className="text-center py-16 text-stone-400">
                  <svg
                    className="animate-spin h-8 w-8 mx-auto mb-4 text-emerald-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  書面を生成しています...
                </div>
              )}
              {content && (
                <div
                  className={`prose prose-stone max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-p:text-stone-700 ${
                    streaming ? "streaming-cursor" : ""
                  }`}
                  style={{
                    fontFamily: '"Noto Serif JP", serif',
                    lineHeight: "2",
                    fontSize: "15px",
                  }}
                >
                  {content.split("\n").map((line, i) => {
                    if (!line.trim()) return <br key={i} />;
                    if (
                      line.startsWith("# ") ||
                      line.startsWith("## ") ||
                      line.startsWith("### ")
                    ) {
                      const level = line.match(/^#+/)?.[0].length || 1;
                      const text = line.replace(/^#+\s*/, "");
                      if (level === 1)
                        return (
                          <h1
                            key={i}
                            className="text-xl font-bold text-stone-900 text-center mt-6 mb-4"
                          >
                            {text}
                          </h1>
                        );
                      if (level === 2)
                        return (
                          <h2
                            key={i}
                            className="text-lg font-bold text-stone-900 mt-6 mb-3 border-b border-stone-200 pb-1"
                          >
                            {text}
                          </h2>
                        );
                      return (
                        <h3
                          key={i}
                          className="text-base font-semibold text-stone-800 mt-4 mb-2"
                        >
                          {text}
                        </h3>
                      );
                    }
                    return (
                      <p key={i} className="mb-1 text-stone-700 indent-4">
                        {line}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition"
          >
            戻る
          </button>
          <button
            onClick={handleNext}
            disabled={!done}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {done ? "自己検証へ \u2192" : "生成完了をお待ちください..."}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BriefPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
          読み込み中...
        </div>
      }
    >
      <BriefContent />
    </Suspense>
  );
}
