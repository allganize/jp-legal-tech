const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const DEFAULT_HEADERS: Record<string, string> = {
  "ngrok-skip-browser-warning": "true",
};

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: DEFAULT_HEADERS,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface JudgeSearchResult {
  id: number;
  name: string;
  court_name: string | null;
  is_supreme_court: boolean;
  first_seen_date: string | null;
  last_seen_date: string | null;
  case_count: number;
}

export interface Distribution {
  type?: string;
  role?: string;
  court?: string;
  year?: string;
  count: number;
}

export interface JudgeProfile {
  id: number;
  name: string;
  court_name: string | null;
  is_supreme_court: boolean;
  first_seen_date: string | null;
  last_seen_date: string | null;
  case_count: number;
  case_type_distribution: Distribution[];
  result_type_distribution: Distribution[];
  yearly_distribution: Distribution[];
  role_distribution: Distribution[];
  courts_served: Distribution[];
}

export interface CaseItem {
  id: string;
  case_number: string;
  case_name: string | null;
  court_name: string | null;
  trial_type: string | null;
  decision_date: string | null;
  result_type: string | null;
  role: string | null;
}

export interface CaseListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  cases: CaseItem[];
}

export interface CollectionStatus {
  total_cases: number;
  with_judge_info: number;
  total_judges: number;
  total_case_judge_links: number;
}

export interface JudgePersona {
  tendency_summary: string;
  key_legal_principles: string[];
  frequently_cited: {
    articles: string[];
    cases: string[];
  };
  writing_style: string;
  document_tips: string;
  generated_at: string;
  case_count: number;
  is_cached: boolean;
}

export function getJudgePersona(
  id: number,
  regenerate = false
): Promise<JudgePersona> {
  return fetchApi(`/judges/${id}/persona?regenerate=${regenerate}`);
}

async function consumeSSE(
  res: Response,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) {
    onError("ストリーミングを開始できません。");
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
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }
        if (data.startsWith("[ERROR]")) {
          onError(data.slice(8));
          return;
        }
        // サーバーからJSON エンコードされたチャンクをデコード
        try {
          onChunk(JSON.parse(data));
        } catch {
          onChunk(data);
        }
      }
    }
  }
  onDone();
}

export async function reviewDocument(
  judgeId: number,
  document: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/agent/${judgeId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({ document }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
    onError(err.detail || `API error: ${res.status}`);
    return;
  }
  await consumeSSE(res, onChunk, onDone, onError);
}

export async function reviseDocument(
  judgeId: number,
  document: string,
  feedback: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/agent/${judgeId}/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({ document, feedback }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
    onError(err.detail || `API error: ${res.status}`);
    return;
  }
  await consumeSSE(res, onChunk, onDone, onError);
}

// ── 規制エージェント型 ──────────────────────────────────────

export interface RegulationItem {
  id: number;
  title: string;
  source: string;
  category: string;
  reg_type: string;
  impact_level: string;
  summary: string;
  detail_text?: string;
  published_date: string;
  effective_date: string | null;
  lifecycle_stage: string;
}

export interface RegulationFeedResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: RegulationItem[];
}

export interface ClientInfo {
  id: number;
  company_name: string;
  industry: string;
  licenses: string[];
  services: string[];
  assigned_lawyer: string;
  impact_count?: number;
  urgent_count?: number;
}

export interface ClientImpactItem {
  client_id: number;
  company_name: string;
  industry: string;
  licenses: string[];
  services: string[];
  assigned_lawyer: string;
  impact_score: number;
  impact_reasons: string[];
  action_type: string;
}

export interface HeatmapRow {
  client: string;
  lawyer: string;
  [category: string]: string | number;
}

export interface LawyerAction {
  client: string;
  regulation: string;
  action_type: string;
  impact_score: number;
  category: string;
}

export interface WeeklyBriefing {
  category_counts: Record<string, number>;
  recent_regulations: RegulationItem[];
  lawyer_actions: Record<string, LawyerAction[]>;
  heatmap: HeatmapRow[];
  categories: string[];
}

// ── 規制エージェント API ──────────────────────────────────────

export function getRegulationFeed(
  category?: string,
  regType?: string,
  impactLevel?: string,
  page = 1
): Promise<RegulationFeedResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  if (regType) params.set("reg_type", regType);
  if (impactLevel) params.set("impact_level", impactLevel);
  return fetchApi(`/regulation/feed?${params}`);
}

export function getRegulationDetail(id: number): Promise<RegulationItem> {
  return fetchApi(`/regulation/feed/${id}`);
}

export function getRegulationImpacts(id: number): Promise<ClientImpactItem[]> {
  return fetchApi(`/regulation/feed/${id}/impacts`);
}

export function getRegulationClients(): Promise<ClientInfo[]> {
  return fetchApi("/regulation/clients");
}

export function getWeeklyBriefing(): Promise<WeeklyBriefing> {
  return fetchApi("/regulation/weekly-briefing");
}

export async function generateRegulationDocument(
  regulationId: number,
  clientId: number | null,
  docType: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  force = false
): Promise<void> {
  const res = await fetch(`${API_BASE}/regulation/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({
      regulation_id: regulationId,
      client_id: clientId,
      doc_type: docType,
      force,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
    onError(err.detail || `API error: ${res.status}`);
    return;
  }
  await consumeSSE(res, onChunk, onDone, onError);
}

export async function seedRegulationData(): Promise<void> {
  await fetch(`${API_BASE}/regulation/seed`, { method: "POST", headers: DEFAULT_HEADERS });
}

// ── 管轄最適化型 ──────────────────────────────────────

export interface CourtSummary {
  court_name: string;
  total_cases: number;
  acceptance_rate: number | null;
  classified_cases: number;
}

export interface CourtJudgeSummary {
  judge_id: number;
  name: string;
  case_count: number;
  acceptance_rate: number;
  dismissal_rate: number;
  result_type_distribution: Distribution[];
}

export interface CourtStats {
  court_name: string;
  total_cases: number;
  date_range: { min: string | null; max: string | null };
  acceptance_rate: number;
  dismissal_rate: number;
  unclassified_rate: number;
  outcome_distribution: Distribution[];
  result_type_distribution: Distribution[];
  case_type_distribution: Distribution[];
  yearly_distribution: Distribution[];
  top_judges: CourtJudgeSummary[];
  rank?: number;
}

export interface CourtComparison {
  courts: CourtStats[];
  case_type: string | null;
}

// ── 管轄最適化 API ──────────────────────────────────────

export function getVenueCaseTypes(): Promise<Distribution[]> {
  return fetchApi("/venue/case-types");
}

export function getVenueCourts(caseType?: string): Promise<CourtSummary[]> {
  const params = new URLSearchParams();
  if (caseType) params.set("case_type", caseType);
  const qs = params.toString();
  return fetchApi(`/venue/courts${qs ? `?${qs}` : ""}`);
}

export function getCourtStats(
  courtName: string,
  caseType?: string
): Promise<CourtStats> {
  const params = new URLSearchParams({ court: courtName });
  if (caseType) params.set("case_type", caseType);
  return fetchApi(`/venue/court-stats?${params}`);
}

export async function compareVenueCourts(
  courtNames: string[],
  caseType?: string
): Promise<CourtComparison> {
  const res = await fetch(`${API_BASE}/venue/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({ court_names: courtNames, case_type: caseType || null }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getVenueRecommendation(
  caseType: string,
  courtNames: string[] | null,
  caseDescription: string | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/venue/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({
      case_type: caseType,
      court_names: courtNames,
      case_description: caseDescription,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
    onError(err.detail || `API error: ${res.status}`);
    return;
  }
  await consumeSSE(res, onChunk, onDone, onError);
}

// ── 類似判例検索型 ──────────────────────────────────────

export interface SearchFilters {
  court_name?: string;
  trial_type?: string;
  year_from?: number;
  year_to?: number;
}

export interface CitedChunk {
  case_id: string;
  case_number: string;
  case_name: string | null;
  court_name: string | null;
  decision_date: string | null;
  result: string | null;
  chunk_text: string;
}

export interface SimilarCaseResult {
  query: string;
  total_found: number;
  cases: CitedChunk[];
  analysis: string | null;
}

export interface TimelineEvent {
  case_id: string;
  case_number: string;
  date: string;
  court_name: string | null;
  result: string | null;
  fact_summary: string;
  relevance: string;
}

export interface SearchFilterOptions {
  courts: string[];
  trial_types: string[];
  year_range: { min: number; max: number };
}

export interface StoreStatus {
  store_id: string;
  display_name: string;
  active_documents: number;
  pending_documents: number;
  failed_documents: number;
  size_bytes: number;
  status: string;
}

// ── 類似判例検索 API ──────────────────────────────────────

export function getSearchFilters(): Promise<SearchFilterOptions> {
  return fetchApi("/search/filters");
}

export function getStoreStatus(): Promise<StoreStatus> {
  return fetchApi("/search/store-status");
}

export async function searchSimilarCases(
  query: string,
  filters?: SearchFilters,
  topK = 10
): Promise<SimilarCaseResult> {
  const res = await fetch(`${API_BASE}/search/similar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({ query, filters: filters || null, top_k: topK }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export async function searchAndAnalyze(
  query: string,
  filters: SearchFilters | null,
  topK: number,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/search/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({ query, filters, top_k: topK }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
    onError(err.detail || `API error: ${res.status}`);
    return;
  }
  await consumeSSE(res, onChunk, onDone, onError);
}

export async function generateTimeline(
  caseIds: string[],
  query = ""
): Promise<TimelineEvent[]> {
  const res = await fetch(`${API_BASE}/search/timeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...DEFAULT_HEADERS },
    body: JSON.stringify({ case_ids: caseIds, query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "サーバーエラー" }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

// ── 裁判官分析 API ──────────────────────────────────────────

export function searchJudges(query: string): Promise<JudgeSearchResult[]> {
  return fetchApi(`/judges?q=${encodeURIComponent(query)}`);
}

export function getJudgeProfile(id: number): Promise<JudgeProfile> {
  return fetchApi(`/judges/${id}/profile`);
}

export function getJudgeCases(
  id: number,
  page = 1,
  pageSize = 20,
  caseType?: string,
  year?: number,
  sort = "date_desc"
): Promise<CaseListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort,
  });
  if (caseType) params.set("case_type", caseType);
  if (year) params.set("year", String(year));
  return fetchApi(`/judges/${id}/cases?${params}`);
}

export function getCollectionStatus(): Promise<CollectionStatus> {
  return fetchApi("/collection/status");
}

