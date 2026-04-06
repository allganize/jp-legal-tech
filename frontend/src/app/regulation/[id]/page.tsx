import RegulationDetailClient from "./_client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function RegulationDetailPage() {
  return <RegulationDetailClient />;
}
