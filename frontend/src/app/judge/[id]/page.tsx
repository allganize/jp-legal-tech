"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getJudgeProfile,
  getJudgeCases,
  getJudgePersona,
  type JudgeProfile,
  type JudgePersona,
  type CaseListResponse,
} from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function JudgeProfilePage() {
  const params = useParams();
  const judgeId = Number(params.id);
  const [profile, setProfile] = useState<JudgeProfile | null>(null);
  const [caseData, setCaseData] = useState<CaseListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [persona, setPersona] = useState<JudgePersona | null>(null);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [personaError, setPersonaError] = useState<string>("");

  useEffect(() => {
    if (!judgeId) return;
    setLoading(true);
    getJudgeProfile(judgeId)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [judgeId]);

  const loadPersona = (regenerate = false) => {
    setPersonaLoading(true);
    setPersonaError("");
    getJudgePersona(judgeId, regenerate)
      .then(setPersona)
      .catch((e) => setPersonaError(e.message || "페르소나 생성에 실패했습니다."))
      .finally(() => setPersonaLoading(false));
  };

  useEffect(() => {
    if (!judgeId) return;
    loadPersona();
  }, [judgeId]);

  useEffect(() => {
    if (!judgeId) return;
    getJudgeCases(judgeId, page, 20, caseTypeFilter || undefined).then(setCaseData);
  }, [judgeId, page, caseTypeFilter]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">로딩중...</div>;
  }

  if (!profile) {
    return <div className="text-center py-20 text-slate-400">판사를 찾을 수 없습니다</div>;
  }

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {profile.name}
              {profile.is_supreme_court && (
                <span className="ml-3 px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-full font-medium">
                  대법관
                </span>
              )}
            </h1>
            <p className="text-slate-500 mt-2">
              {profile.court_name || "법원 미상"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">{profile.case_count}</div>
            <div className="text-sm text-slate-400">총 판결 수</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <InfoCard label="활동 시작" value={profile.first_seen_date?.slice(0, 4) || "-"} />
          <InfoCard label="최근 활동" value={profile.last_seen_date?.slice(0, 4) || "-"} />
          <InfoCard
            label="활동 법원"
            value={`${profile.courts_served.length}개`}
          />
          <InfoCard
            label="주요 역할"
            value={profile.role_distribution[0]?.role || "-"}
          />
        </div>

        {/* Courts served */}
        {profile.courts_served.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.courts_served.map((c) => (
              <span
                key={c.court}
                className="px-3 py-1 text-sm bg-slate-100 text-slate-600 rounded-full"
              >
                {c.court} ({c.count})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Persona Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">AI 판사 성향 분석</h2>
            {persona?.generated_at && (
              <p className="text-xs text-slate-400 mt-1">
                {new Date(persona.generated_at).toLocaleDateString("ko-KR")} 생성
                {persona.is_cached && " (캐시)"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadPersona(true)}
              disabled={personaLoading}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {personaLoading ? "분석 중..." : "재생성"}
            </button>
            <Link
              href={`/judge/${judgeId}/review`}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              문서 검토 받기 &rarr;
            </Link>
          </div>
        </div>

        {personaLoading && !persona ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
            <div className="h-4 bg-slate-100 rounded w-1/3" />
          </div>
        ) : personaError ? (
          <div className="text-center py-8 text-slate-400">{personaError}</div>
        ) : persona ? (
          <div className="space-y-6">
            {/* 성향 요약 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                판결 성향 요약
              </h3>
              <p className="text-slate-700 leading-relaxed">{persona.tendency_summary}</p>
            </div>

            {/* 주요 법리 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                주요 관심 법리
              </h3>
              <div className="flex flex-wrap gap-2">
                {persona.key_legal_principles.map((p, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* 자주 인용 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {persona.frequently_cited.articles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    자주 인용하는 조문
                  </h3>
                  <ul className="space-y-1">
                    {persona.frequently_cited.articles.map((a, i) => (
                      <li key={i} className="text-sm text-slate-600">
                        &bull; {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {persona.frequently_cited.cases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    자주 인용하는 판례
                  </h3>
                  <ul className="space-y-1">
                    {persona.frequently_cited.cases.map((c, i) => (
                      <li key={i} className="text-sm text-slate-600">
                        &bull; {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 판결문 스타일 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                판결문 스타일
              </h3>
              <p className="text-slate-700 leading-relaxed">{persona.writing_style}</p>
            </div>

            {/* 문서 작성 팁 */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-2">
                문서 작성 시 유의사항
              </h3>
              <p className="text-amber-900 leading-relaxed whitespace-pre-line text-sm">
                {persona.document_tips}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Case Type Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">사건 종류 분포</h2>
          {profile.case_type_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={profile.case_type_distribution}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {profile.case_type_distribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              데이터 없음
            </div>
          )}
        </div>

        {/* Yearly Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">연도별 판결 추이</h2>
          {profile.yearly_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profile.yearly_distribution}>
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="판결 수" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              데이터 없음
            </div>
          )}
        </div>
      </div>

      {/* Role & Decision Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">역할 분포</h2>
          <div className="space-y-2">
            {profile.role_distribution.map((r) => (
              <div key={r.role} className="flex items-center justify-between">
                <span className="text-slate-600">{r.role}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-blue-400 rounded-full"
                    style={{
                      width: `${(r.count / profile.case_count) * 200}px`,
                    }}
                  />
                  <span className="text-sm text-slate-500">{r.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">판결 유형 분포</h2>
          <div className="space-y-2">
            {profile.decision_type_distribution.map((d) => (
              <div key={d.type} className="flex items-center justify-between">
                <span className="text-slate-600">{d.type}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-emerald-400 rounded-full"
                    style={{
                      width: `${(d.count / profile.case_count) * 200}px`,
                    }}
                  />
                  <span className="text-sm text-slate-500">{d.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">판결 목록</h2>
          <select
            value={caseTypeFilter}
            onChange={(e) => {
              setCaseTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
          >
            <option value="">전체 사건종류</option>
            {profile.case_type_distribution.map((d) => (
              <option key={d.type} value={d.type}>
                {d.type} ({d.count})
              </option>
            ))}
          </select>
        </div>

        {caseData && caseData.cases.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3 pr-4">선고일</th>
                    <th className="pb-3 pr-4">사건번호</th>
                    <th className="pb-3 pr-4">사건명</th>
                    <th className="pb-3 pr-4">법원</th>
                    <th className="pb-3 pr-4">종류</th>
                    <th className="pb-3">역할</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {caseData.cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                        {c.decision_date || "-"}
                      </td>
                      <td className="py-3 pr-4 font-medium text-blue-600">
                        <a href={`/case/${c.id}`}>{c.case_number}</a>
                      </td>
                      <td className="py-3 pr-4 text-slate-700 max-w-xs truncate">
                        {c.case_name || "-"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                        {c.court_name || "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                          {c.case_type_name || "-"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            c.role === "재판장"
                              ? "bg-blue-100 text-blue-700"
                              : c.role === "주심"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {c.role || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {caseData.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  총 {caseData.total}건 중 {(page - 1) * 20 + 1}-
                  {Math.min(page * 20, caseData.total)}건
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <span className="px-3 py-1 text-sm text-slate-600">
                    {page} / {caseData.total_pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(caseData.total_pages, p + 1))}
                    disabled={page === caseData.total_pages}
                    className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-slate-400">판결 데이터가 없습니다</div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
