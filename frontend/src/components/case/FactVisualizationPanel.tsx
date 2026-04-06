"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import FactTimeline, { type FactTimelineData } from "./FactTimeline";
import RelationshipDiagram, { type RelationshipDiagramData } from "./RelationshipDiagram";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type VizState = "idle" | "extracting" | "analyzing" | "done" | "error";
type ActiveTab = "timeline" | "relationships";

export default function FactVisualizationPanel({ caseId }: { caseId: string }) {
  const { t } = useI18n();
  const [vizState, setVizState] = useState<VizState>("idle");
  const [timelineData, setTimelineData] = useState<FactTimelineData | null>(null);
  const [relationshipData, setRelationshipData] = useState<RelationshipDiagramData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("timeline");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setVizState("analyzing");
    setError("");
    setTimelineData(null);
    setRelationshipData(null);
    setStatusMsg(t("viz.analyzing"));

    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/visualize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
        setError(err.detail || `API error: ${res.status}`);
        setVizState("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("ストリーミングを開始できません。");
        setVizState("error");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") {
            setVizState("done");
            return;
          }
          if (data.startsWith("[ERROR]")) {
            setError(data.slice(8));
            setVizState("error");
            return;
          }

          try {
            const event = JSON.parse(data) as Record<string, unknown>;

            if (event.type === "status") {
              const step = event.step as string;
              const msgKey = `viz.${step}` as const;
              setStatusMsg(t(msgKey));
              if (step === "extracting") setVizState("extracting");
            } else if (event.type === "timeline") {
              setTimelineData(event.data as FactTimelineData);
            } else if (event.type === "relationships") {
              setRelationshipData(event.data as RelationshipDiagramData);
            } else if (event.type === "error") {
              setError((event.message as string) || "エラーが発生しました。");
              setVizState("error");
              return;
            } else if (event.type === "done") {
              setVizState("done");
              return;
            }
          } catch {
            // Ignore unparseable chunks
          }
        }
      }

      setVizState("done");
    } catch (e) {
      setError(e instanceof TypeError ? "ネットワークエラー" : "予期しないエラーが発生しました。");
      setVizState("error");
    }
  }, [caseId]);

  // Idle state: show button
  if (vizState === "idle") {
    return (
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{t("viz.title")}</h2>
            <p className="text-sm text-stone-500 mt-1">
              {t("viz.description")}
            </p>
          </div>
          <button
            onClick={generate}
            className="px-4 py-2.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium shrink-0"
          >
            {t("viz.button")}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  const isLoading = vizState === "extracting" || vizState === "analyzing";
  const hasResults = timelineData || relationshipData;

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-stone-900">{t("viz.title")}</h2>
        {vizState === "done" && (
          <button
            onClick={generate}
            className="px-3 py-1.5 text-xs text-stone-500 bg-stone-100 rounded-lg hover:bg-stone-200 transition"
          >
            {t("viz.regenerate")}
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-stone-500">{statusMsg}</span>
        </div>
      )}

      {/* Error state */}
      {vizState === "error" && (
        <div className="text-center py-8">
          <p className="text-stone-500 mb-4">{error}</p>
          <button
            onClick={generate}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            {t("viz.retry")}
          </button>
        </div>
      )}

      {/* Results with tabs */}
      {hasResults && (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-stone-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md transition ${
                activeTab === "timeline"
                  ? "bg-white text-stone-900 shadow-sm font-medium"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t("viz.tab_timeline")}
            </button>
            <button
              onClick={() => setActiveTab("relationships")}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md transition ${
                activeTab === "relationships"
                  ? "bg-white text-stone-900 shadow-sm font-medium"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t("viz.tab_relationships")}
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "timeline" && timelineData && (
            <FactTimeline data={timelineData} />
          )}
          {activeTab === "timeline" && !timelineData && (
            <div className="text-center py-8 text-stone-400">
              {t("viz.no_data")}
            </div>
          )}
          {activeTab === "relationships" && relationshipData && (
            <RelationshipDiagram data={relationshipData} />
          )}
          {activeTab === "relationships" && !relationshipData && (
            <div className="text-center py-8 text-stone-400">
              {t("viz.no_diagram")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
