import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-stone-50 border-t border-stone-200 py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-8">
          {/* Brand */}
          <div>
            <p className="font-semibold text-stone-800">Machu Picchu</p>
            <p className="text-sm text-stone-500 mt-1">
              변호사를 위한 AI 리걸 인텔리전스 플랫폼
            </p>
            <p className="text-xs text-stone-400 mt-4">
              2025 Machu Picchu. All rights reserved.
            </p>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
              제품
            </h4>
            <nav className="space-y-2">
              <Link
                href="/dashboard"
                className="text-sm text-stone-600 hover:text-stone-900 block"
              >
                판사 분석
              </Link>
              <Link
                href="/venue"
                className="text-sm text-stone-600 hover:text-stone-900 block"
              >
                관할 최적화
              </Link>
              <Link
                href="/regulation"
                className="text-sm text-stone-600 hover:text-stone-900 block"
              >
                규제 에이전트
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
              리소스
            </h4>
            <nav className="space-y-2">
              <span className="text-sm text-stone-600 block">문서</span>
              <span className="text-sm text-stone-600 block">지원</span>
              <span className="text-sm text-stone-600 block">문의</span>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
