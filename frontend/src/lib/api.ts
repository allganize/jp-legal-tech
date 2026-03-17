const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
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
  decision_type_distribution: Distribution[];
  yearly_distribution: Distribution[];
  role_distribution: Distribution[];
  courts_served: Distribution[];
}

export interface CaseItem {
  id: number;
  case_number: string;
  case_name: string | null;
  court_name: string | null;
  case_type_name: string | null;
  decision_date: string | null;
  decision_type: string | null;
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
  detail_fetched: number;
  with_judge_info: number;
  total_judges: number;
  total_case_judge_links: number;
  is_running: boolean;
  phases: Record<string, { status: string; page: number; total_pages: number | null; total_count: number | null }>;
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
    onError("스트리밍을 시작할 수 없습니다.");
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
        // 서버에서 JSON 인코딩된 청크를 디코딩
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "서버 오류" }));
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, feedback }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "서버 오류" }));
    onError(err.detail || `API error: ${res.status}`);
    return;
  }
  await consumeSSE(res, onChunk, onDone, onError);
}

// ── 규제 에이전트 타입 ──────────────────────────────────────

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

// ── 규제 에이전트 API ──────────────────────────────────────

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      regulation_id: regulationId,
      client_id: clientId,
      doc_type: docType,
      force,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "서버 오류" }));
    onError(err.detail || `API error: ${res.status}`);
    return;
  }
  await consumeSSE(res, onChunk, onDone, onError);
}

export async function seedRegulationData(): Promise<void> {
  await fetch(`${API_BASE}/regulation/seed`, { method: "POST" });
}

// ── 판사 분석 API ──────────────────────────────────────────

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

export async function startCollection(phase: string): Promise<void> {
  await fetch(`${API_BASE}/collection/start/${phase}`, { method: "POST" });
}

export async function stopCollection(): Promise<void> {
  await fetch(`${API_BASE}/collection/stop`, { method: "POST" });
}
