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
    return <div className="text-center py-12 text-slate-400">불러오는 중...</div>;
  }

  // 담당 변호사별 그룹핑
  const byLawyer: Record<string, ClientInfo[]> = {};
  for (const c of clients) {
    if (!byLawyer[c.assigned_lawyer]) byLawyer[c.assigned_lawyer] = [];
    byLawyer[c.assigned_lawyer].push(c);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="전체 클라이언트" value={clients.length} />
        <StatCard
          label="긴급 대응 필요"
          value={clients.filter((c) => (c.urgent_count || 0) > 0).length}
          color="red"
        />
        <StatCard
          label="담당 변호사"
          value={Object.keys(byLawyer).length}
        />
        <StatCard
          label="총 영향 건수"
          value={clients.reduce((sum, c) => sum + (c.impact_count || 0), 0)}
        />
      </div>

      {Object.entries(byLawyer).map(([lawyer, lawyerClients]) => (
        <div key={lawyer}>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">
            담당: {lawyer}
            <span className="ml-1 font-normal">({lawyerClients.length}곳)</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {lawyerClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      {client.company_name}
                    </h4>
                    <div className="text-sm text-slate-500">{client.industry}</div>
                  </div>
                  <div className="text-right">
                    {(client.urgent_count || 0) > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                        긴급 {client.urgent_count}건
                      </span>
                    )}
                    <div className="text-xs text-slate-400 mt-1">
                      영향 {client.impact_count || 0}건
                    </div>
                  </div>
                </div>

                {client.licenses.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-slate-400 mb-1">라이선스</div>
                    <div className="flex flex-wrap gap-1">
                      {client.licenses.map((lic) => (
                        <span
                          key={lic}
                          className="px-2 py-0.5 text-xs bg-purple-50 text-purple-600 rounded border border-purple-100"
                        >
                          {lic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-400 mb-1">서비스</div>
                  <div className="flex flex-wrap gap-1">
                    {client.services.map((svc) => (
                      <span
                        key={svc}
                        className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded border border-blue-100"
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
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${
          color === "red" ? "text-red-600" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
