"use client";

import { useEffect, useState } from "react";
import { getRegulationClients, type ClientInfo } from "@/lib/api";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRegulationClients()
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-stone-400">読み込み中...</div>;
  }

  // 担当弁護士別グループ
  const byLawyer: Record<string, ClientInfo[]> = {};
  for (const c of clients) {
    if (!byLawyer[c.assigned_lawyer]) byLawyer[c.assigned_lawyer] = [];
    byLawyer[c.assigned_lawyer].push(c);
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <StatCard label="全クライアント" value={clients.length} />
        <StatCard
          label="緊急対応必要"
          value={clients.filter((c) => (c.urgent_count || 0) > 0).length}
          color="red"
        />
        <StatCard
          label="担当弁護士"
          value={Object.keys(byLawyer).length}
        />
        <StatCard
          label="総影響件数"
          value={clients.reduce((sum, c) => sum + (c.impact_count || 0), 0)}
        />
      </div>

      {Object.entries(byLawyer).map(([lawyer, lawyerClients]) => (
        <div key={lawyer}>
          <h3 className="text-sm font-semibold text-stone-500 mb-3">
            担当: {lawyer}
            <span className="ml-1 font-normal">({lawyerClients.length}件)</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {lawyerClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-stone-900">
                      {client.company_name}
                    </h4>
                    <div className="text-sm text-stone-500">{client.industry}</div>
                  </div>
                  <div className="text-right">
                    {(client.urgent_count || 0) > 0 && (
                      <span className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded-full">
                        緊急 {client.urgent_count}件
                      </span>
                    )}
                    <div className="text-xs text-stone-400 mt-1">
                      影響 <span className="font-mono">{client.impact_count || 0}</span>件
                    </div>
                  </div>
                </div>

                {client.licenses.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-stone-400 mb-1">ライセンス</div>
                    <div className="flex flex-wrap gap-1">
                      {client.licenses.map((lic) => (
                        <span
                          key={lic}
                          className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded border border-purple-100"
                        >
                          {lic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-stone-400 mb-1">サービス</div>
                  <div className="flex flex-wrap gap-1">
                    {client.services.map((svc) => (
                      <span
                        key={svc}
                        className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded border border-emerald-100"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
      <div className="text-xs text-stone-400 mb-1">{label}</div>
      <div
        className={`text-2xl font-semibold font-mono ${
          color === "red" ? "text-red-600" : "text-stone-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
