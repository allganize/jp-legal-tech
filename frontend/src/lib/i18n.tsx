"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "ja" | "ko" | "en";

const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  ko: "한국어",
  en: "English",
};

const translations: Record<string, Record<Locale, string>> = {
  // Nav
  "nav.judge": { ja: "裁判官分析", ko: "판사 분석", en: "Judge Analysis" },
  "nav.venue": { ja: "管轄最適化", ko: "관할 최적화", en: "Venue Optimization" },
  "nav.search": { ja: "類似判例検索", ko: "유사 판례 검색", en: "Case Search" },
  "nav.regulation": { ja: "規制追跡", ko: "규제 추적", en: "Regulation Tracking" },
  "nav.strategy": { ja: "戦略シミュレーター", ko: "전략 시뮬레이터", en: "Strategy Simulator" },

  // Search page
  "search.title": { ja: "事実関係類似判例検索", ko: "사실관계 유사 판례 검색", en: "Fact-based Similar Case Search" },
  "search.subtitle": {
    ja: "事件の事実関係を入力すると、類似する過去の判例をAIが検索します。",
    ko: "사건의 사실관계를 입력하면, 유사한 과거 판례를 AI가 검색합니다.",
    en: "Enter the facts of your case, and AI will search for similar past precedents.",
  },
  "search.placeholder": {
    ja: "事実関係を詳しく記述してください（例：保育園が発達障害を持つ子供の入園を取り消し、保護者が損害賠償を請求した事案...）",
    ko: "사실관계를 상세히 기술하세요 (예: 보육원이 발달장애 아동의 입원을 취소하고, 보호자가 손해배상을 청구한 사안...)",
    en: "Describe the facts in detail (e.g., a daycare center cancelled enrollment of a child with developmental disability, and the parents filed for damages...)",
  },
  "search.court_all": { ja: "裁判所（全て）", ko: "법원 (전체)", en: "Court (All)" },
  "search.type_all": { ja: "事件種類（全て）", ko: "사건유형 (전체)", en: "Case Type (All)" },
  "search.button": { ja: "類似判例を検索", ko: "유사 판례 검색", en: "Search Similar Cases" },
  "search.searching": { ja: "検索中...", ko: "검색 중...", en: "Searching..." },
  "search.ai_analyze": { ja: "AI詳細分析", ko: "AI 상세 분석", en: "AI Analysis" },
  "search.analyzing": { ja: "分析中...", ko: "분석 중...", en: "Analyzing..." },
  "search.results": { ja: "検索結果", ko: "검색 결과", en: "Search Results" },
  "search.select_all": { ja: "全て選択", ko: "전체 선택", en: "Select All" },
  "search.timeline": { ja: "タイムライン表示", ko: "타임라인 보기", en: "Show Timeline" },
  "search.generating": { ja: "生成中...", ko: "생성 중...", en: "Generating..." },
  "search.detail": { ja: "詳細", ko: "상세", en: "Detail" },
  "search.min_chars": { ja: "10文字以上入力してください", ko: "10자 이상 입력하세요", en: "Please enter at least 10 characters" },
  "search.no_results": {
    ja: "該当する類似判例が見つかりませんでした。",
    ko: "해당하는 유사 판례를 찾지 못했습니다.",
    en: "No similar cases found.",
  },
  "search.no_results_hint": {
    ja: "検索条件を変更するか、より詳しい事実関係を入力してお試しください。",
    ko: "검색 조건을 변경하거나 더 상세한 사실관계를 입력해 보세요.",
    en: "Try changing filters or entering more detailed facts.",
  },
  "search.retry": { ja: "再試行", ko: "재시도", en: "Retry" },
  "search.ai_title": { ja: "AI分析", ko: "AI 분석", en: "AI Analysis" },
  "search.ai_disclaimer": {
    ja: "※ AI分析は統計的参考資料であり、法的助言ではありません。",
    ko: "※ AI 분석은 통계적 참고자료이며 법적 조언이 아닙니다.",
    en: "※ AI analysis is for statistical reference only and does not constitute legal advice.",
  },
  "search.timeline_title": { ja: "判例タイムライン", ko: "판례 타임라인", en: "Case Timeline" },
  "search.favorable": { ja: "認容（原告勝訴）", ko: "인용 (원고 승소)", en: "Accepted (Plaintiff wins)" },
  "search.unfavorable": { ja: "棄却（原告敗訴）", ko: "기각 (원고 패소)", en: "Dismissed (Plaintiff loses)" },
  "search.other": { ja: "その他", ko: "기타", en: "Other" },
  "search.relevance": { ja: "関連性", ko: "관련성", en: "Relevance" },

  // Case detail
  "case.case_number": { ja: "事件番号", ko: "사건번호", en: "Case No." },
  "case.decision_date": { ja: "判決日", ko: "선고일", en: "Decision Date" },
  "case.court": { ja: "裁判所", ko: "법원", en: "Court" },
  "case.type": { ja: "種類", ko: "종류", en: "Type" },
  "case.result_type": { ja: "裁判形式", ko: "재판형식", en: "Format" },
  "case.result": { ja: "結果", ko: "결과", en: "Result" },
  "case.original_court": { ja: "原審裁判所", ko: "원심법원", en: "Original Court" },
  "case.original_case": { ja: "原審事件番号", ko: "원심 사건번호", en: "Original Case No." },
  "case.article_info": { ja: "掲載", ko: "게재", en: "Published" },
  "case.search_court": { ja: "裁判所サイトで検索 →", ko: "법원 사이트에서 검색 →", en: "Search on Court Site →" },
  "case.search_similar": { ja: "類似判例を検索 →", ko: "유사 판례 검색 →", en: "Search Similar Cases →" },
  "case.gist": { ja: "判示事項", ko: "판시사항", en: "Holdings" },
  "case.case_gist": { ja: "判決要旨", ko: "판결요지", en: "Case Summary" },
  "case.related": { ja: "関連判例", ko: "관련 판례", en: "Related Cases" },
  "case.ref_law": { ja: "参照条文", ko: "참조 조문", en: "Referenced Laws" },
  "case.ref_cases": { ja: "参照判例", ko: "참조 판례", en: "Referenced Cases" },
  "case.full_text": { ja: "判例内容", ko: "판례 내용", en: "Judgment Text" },
  "case.not_found": { ja: "判例が見つかりません", ko: "판례를 찾을 수 없습니다", en: "Case not found" },
  "case.retry": { ja: "再試行", ko: "재시도", en: "Retry" },
  "case.network_error": { ja: "ネットワークエラー", ko: "네트워크 오류", en: "Network error" },
  "case.server_error": { ja: "サーバーエラーが発生しました", ko: "서버 오류가 발생했습니다", en: "Server error" },
  "case.fetch_error": { ja: "データの取得に失敗しました", ko: "데이터를 가져오지 못했습니다", en: "Failed to fetch data" },

  // Fact visualization
  "viz.title": { ja: "事実の可視化", ko: "사실관계 시각화", en: "Fact Visualization" },
  "viz.description": {
    ja: "AIが判決文の事実関係を分析し、タイムラインと相関図で表示します",
    ko: "AI가 판결문의 사실관계를 분석하여 타임라인과 관계도로 표시합니다",
    en: "AI analyzes the facts and displays them as a timeline and relationship diagram",
  },
  "viz.button": { ja: "事実をAIで可視化する", ko: "AI로 사실관계 시각화", en: "Visualize Facts with AI" },
  "viz.regenerate": { ja: "再生成", ko: "재생성", en: "Regenerate" },
  "viz.retry": { ja: "再試行", ko: "재시도", en: "Retry" },
  "viz.tab_timeline": { ja: "時系列チャート", ko: "시계열 차트", en: "Timeline" },
  "viz.tab_relationships": { ja: "相関図", ko: "관계도", en: "Relationship Diagram" },
  "viz.extracting": { ja: "事実セクション抽出中...", ko: "사실 섹션 추출 중...", en: "Extracting facts..." },
  "viz.analyzing": { ja: "AIで事実を分析中...", ko: "AI로 사실 분석 중...", en: "Analyzing facts with AI..." },
  "viz.cached": { ja: "キャッシュから読み込み中...", ko: "캐시에서 불러오는 중...", en: "Loading from cache..." },
  "viz.no_timeline": { ja: "日付情報を抽出できませんでした。", ko: "날짜 정보를 추출할 수 없었습니다.", en: "Could not extract date information." },
  "viz.no_relationships": { ja: "当事者関係を抽出できませんでした。", ko: "당사자 관계를 추출할 수 없었습니다.", en: "Could not extract party relationships." },
  "viz.no_data": { ja: "タイムラインデータがありません", ko: "타임라인 데이터가 없습니다", en: "No timeline data" },
  "viz.no_diagram": { ja: "相関図データがありません", ko: "관계도 데이터가 없습니다", en: "No diagram data" },
  "viz.source": { ja: "原文引用:", ko: "원문 인용:", en: "Source citation:" },

  // Common
  "common.loading": { ja: "読み込み中...", ko: "로딩 중...", en: "Loading..." },
  "common.cases": { ja: "件", ko: "건", en: " cases" },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  locales: readonly Locale[];
  localeLabels: Record<Locale, string>;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ja");

  const t = useCallback(
    (key: string): string => {
      return translations[key]?.[locale] ?? translations[key]?.ja ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales: ["ja", "ko", "en"] as const,
        localeLabels: LOCALE_LABELS,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
