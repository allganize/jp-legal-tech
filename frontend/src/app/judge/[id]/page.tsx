import JudgeDetailClient from "./_client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function JudgeDetailPage() {
  return <JudgeDetailClient />;
}
