import CaseDetailClient from "./_client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function CaseDetailPage() {
  return <CaseDetailClient />;
}
