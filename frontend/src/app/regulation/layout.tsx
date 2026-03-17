"use client";

import { usePathname } from "next/navigation";

const tabs = [
  { href: "/regulation", label: "규제 피드" },
  { href: "/regulation/clients", label: "클라이언트" },
  { href: "/regulation/weekly", label: "주간 브리핑" },
];

export default function RegulationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">
          규제 에이전트
        </h1>
        <p className="text-sm text-slate-500">
          AI·금융 규제 모니터링 → 클라이언트 영향 매핑 → 액션/문서 자동 생성
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/regulation"
              ? pathname === "/regulation"
              : pathname.startsWith(tab.href);
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {children}
    </div>
  );
}
