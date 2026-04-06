import GenerateDocClient from "./_client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function GenerateDocPage() {
  return <GenerateDocClient />;
}
