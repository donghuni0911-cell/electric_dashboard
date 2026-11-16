import { Bell } from 'lucide-react';

interface HeaderProps {
  activeAlertCount: number;
  onOpenAlerts: () => void;
  isPhoneView: boolean;
}

export function Header({ activeAlertCount, onOpenAlerts, isPhoneView }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#f8f9ff]/95 backdrop-blur-md border-b border-[#e2e8f0]">
      <div
        className={`mx-auto px-4 flex items-center justify-between gap-4 ${
          isPhoneView ? 'h-14' : 'max-w-7xl sm:px-6 h-14 sm:h-16 sm:gap-8'
        }`}
      >
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-[#0b1c30] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] rounded-md px-1 -ml-1"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-[#1d4ed8] shrink-0"
          >
            <rect width="24" height="24" rx="6" fill="#1d4ed8" />
            <path
              d="M13.2 5.5L7.5 13.1H12L10.8 18.5L16.5 10.9H12L13.2 5.5Z"
              fill="#ffffff"
            />
          </svg>
          <span>ClearVolt</span>
        </a>

        {/* Zone 2: 4 Single-line Navigation Links (Desktop view only) */}
        {!isPhoneView && (
          <nav
            aria-label="주요 메뉴"
            className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#434655]"
          >
            <a
              href="#overview"
              className="hover:text-[#0037b0] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
            >
              실시간 시세
            </a>
            <a
              href="#price-curve"
              className="hover:text-[#0037b0] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
            >
              시세 곡선
            </a>
            <a
              href="#calculator"
              className="hover:text-[#0037b0] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
            >
              수익 계산기
            </a>
            <a
              href="#ledger"
              className="hover:text-[#0037b0] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
            >
              시간대별 표
            </a>
          </nav>
        )}

        {/* Zone 3: 1 Primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenAlerts}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-[0.99] text-white font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2 ${
              isPhoneView ? 'h-10 px-3 text-xs' : 'h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              시세 알림{activeAlertCount > 0 ? ` (${activeAlertCount})` : ''}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
