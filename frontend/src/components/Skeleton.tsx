/**
 * 共通スケルトンローディングコンポーネント
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-stone-200 ${className}`}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-2/5 rounded bg-stone-200" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-stone-100"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetaGrid() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-3/5 rounded bg-stone-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 rounded bg-stone-100" />
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-24 rounded-lg bg-stone-100" />
          <div className="h-8 w-24 rounded-lg bg-stone-100" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-1/4 rounded bg-stone-200" />
        <div className="h-48 w-full rounded-xl bg-stone-50" />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <SkeletonMetaGrid />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={6} />
    </div>
  );
}
