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
  "#059669", "#ef4444", "#f59e0b", "#0891b2", "#78716c",
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
      .catch((e) => setPersonaError(e.message || "ペルソナの生成に失敗しました。"))
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
    return <div className="text-center py-20 text-stone-400">読み込み中...</div>;
  }

  if (!profile) {
    return <div className="text-center py-20 text-stone-400">裁判官が見つかりません</div>;
  }

  return (
    <div className="space-y-10">
      {/* Summary Card */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-stone-900">
              {profile.name}
              {profile.is_supreme_court && (
                <span className="ml-3 px-3 py-1 text-sm bg-amber-50 text-amber-700 rounded-full font-medium">
                  最高裁判事
                </span>
              )}
            </h1>
            <p className="text-stone-500 mt-2">
              {profile.court_name || "裁判所不明"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-semibold font-mono text-emerald-600">{profile.case_count}</div>
            <div className="text-sm text-stone-400">総判決数</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          <InfoCard label="活動開始" value={profile.first_seen_date?.slice(0, 4) || "-"} />
          <InfoCard label="最近の活動" value={profile.last_seen_date?.slice(0, 4) || "-"} />
          <InfoCard
            label="所属裁判所"
            value={`${profile.courts_served.length}箇所`}
          />
          <InfoCard
            label="主な役割"
            value={profile.role_distribution[0]?.role || "-"}
          />
        </div>

        {/* Courts served */}
        {profile.courts_served.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.courts_served.map((c) => (
              <span
                key={c.court}
                className="px-3 py-1 text-sm bg-stone-100 text-stone-600 rounded-full"
              >
                {c.court} ({c.count})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Persona Section */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">AI裁判官傾向分析</h2>
            {persona?.generated_at && (
              <p className="text-xs text-stone-400 mt-1">
                {new Date(persona.generated_at).toLocaleDateString("ja-JP")} 生成
                {persona.is_cached && " (キャッシュ)"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadPersona(true)}
              disabled={personaLoading}
              className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50"
            >
              {personaLoading ? "分析中..." : "再生成"}
            </button>
            <Link
              href={`/judge/${judgeId}/review`}
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition"
            >
              文書レビューを受ける &rarr;
            </Link>
          </div>
        </div>

        {personaLoading && !persona ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-stone-100 rounded w-3/4" />
            <div className="h-4 bg-stone-100 rounded w-1/2" />
            <div className="h-4 bg-stone-100 rounded w-2/3" />
            <div className="h-4 bg-stone-100 rounded w-1/3" />
          </div>
        ) : personaError ? (
          <div className="text-center py-8 text-stone-400">{personaError}</div>
        ) : persona ? (
          <div className="space-y-6">
            {/* 傾向要約 */}
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                判決傾向の要約
              </h3>
              <p className="text-stone-700 leading-relaxed">{persona.tendency_summary}</p>
            </div>

            {/* 主要法理 */}
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                主要法理原則
              </h3>
              <div className="flex flex-wrap gap-2">
                {persona.key_legal_principles.map((p, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm bg-emerald-50 text-emerald-700 rounded-full"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* 頻繁な引用 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {persona.frequently_cited.articles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    頻繁に引用する条文
                  </h3>
                  <ul className="space-y-1">
                    {persona.frequently_cited.articles.map((a, i) => (
                      <li key={i} className="text-sm text-stone-600">
                        &bull; {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {persona.frequently_cited.cases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    頻繁に引用する判例
                  </h3>
                  <ul className="space-y-1">
                    {persona.frequently_cited.cases.map((c, i) => (
                      <li key={i} className="text-sm text-stone-600">
                        &bull; {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 判決文スタイル */}
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                判決文スタイル
              </h3>
              <p className="text-stone-700 leading-relaxed">{persona.writing_style}</p>
            </div>

            {/* 文書作成のヒント */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-2">
                文書作成時の注意事項
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
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">事件種類分布</h2>
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
            <div className="h-[300px] flex items-center justify-center text-stone-400">
              データなし
            </div>
          )}
        </div>

        {/* Yearly Timeline */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">年度別判決推移</h2>
          {profile.yearly_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profile.yearly_distribution}>
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} name="判決数" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-stone-400">
              データなし
            </div>
          )}
        </div>
      </div>

      {/* Role & Decision Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">役割分布</h2>
          <div className="space-y-2">
            {profile.role_distribution.map((r) => (
              <div key={r.role} className="flex items-center justify-between">
                <span className="text-stone-600">{r.role}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-emerald-400 rounded-full"
                    style={{
                      width: `${(r.count / profile.case_count) * 200}px`,
                    }}
                  />
                  <span className="text-sm font-mono text-stone-500">{r.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">判決類型分布</h2>
          <div className="space-y-2">
            {profile.result_type_distribution.map((d) => (
              <div key={d.type} className="flex items-center justify-between">
                <span className="text-stone-600">{d.type}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-emerald-400 rounded-full"
                    style={{
                      width: `${(d.count / profile.case_count) * 200}px`,
                    }}
                  />
                  <span className="text-sm font-mono text-stone-500">{d.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">判決一覧</h2>
          <select
            value={caseTypeFilter}
            onChange={(e) => {
              setCaseTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-700"
          >
            <option value="">全事件種類</option>
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
                  <tr className="border-b border-stone-200 text-left text-stone-500">
                    <th className="pb-3 pr-4">判決日</th>
                    <th className="pb-3 pr-4">事件番号</th>
                    <th className="pb-3 pr-4">事件名</th>
                    <th className="pb-3 pr-4">裁判所</th>
                    <th className="pb-3 pr-4">種類</th>
                    <th className="pb-3">役割</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {caseData.cases.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50">
                      <td className="py-3 pr-4 text-stone-600 whitespace-nowrap">
                        {c.decision_date || "-"}
                      </td>
                      <td className="py-3 pr-4 font-medium text-emerald-600">
                        <a href={`/case/${c.id}`}>{c.case_number}</a>
                      </td>
                      <td className="py-3 pr-4 text-stone-700 max-w-xs truncate">
                        {c.case_name || "-"}
                      </td>
                      <td className="py-3 pr-4 text-stone-500 whitespace-nowrap">
                        {c.court_name || "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-1 text-xs bg-stone-50 text-stone-600 rounded-full">
                          {c.trial_type || "-"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            c.role === "裁判長"
                              ? "bg-emerald-50 text-emerald-700"
                              : c.role === "主任"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-stone-50 text-stone-600"
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
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">
                <span className="text-sm text-stone-500">
                  全{caseData.total}件中 {(page - 1) * 20 + 1}-
                  {Math.min(page * 20, caseData.total)}件
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50"
                  >
                    前へ
                  </button>
                  <span className="px-3 py-1 text-sm font-mono text-stone-600">
                    {page} / {caseData.total_pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(caseData.total_pages, p + 1))}
                    disabled={page === caseData.total_pages}
                    className="px-3 py-1 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-stone-400">判決データがありません</div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 rounded-lg p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-semibold text-stone-900">{value}</div>
    </div>
  );
}
