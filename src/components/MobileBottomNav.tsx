import { Activity, Calculator, LineChart, TableProperties } from 'lucide-react';

interface MobileBottomNavProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
  isPhoneView: boolean;
}

const NAV_ITEMS = [
  { id: 'overview', label: '실시간', icon: Activity },
  { id: 'price-curve', label: '시세곡선', icon: LineChart },
  { id: 'calculator', label: '계산기', icon: Calculator },
  { id: 'ledger', label: '상세·통계', icon: TableProperties },
];

export function MobileBottomNav({
  activeSection,
  onSelectSection,
  isPhoneView,
}: MobileBottomNavProps) {
  if (!isPhoneView) return null;

  const handleJump = (id: string) => {
    onSelectSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      aria-label="모바일 빠른 이동"
      className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0]"
    >
      <div className="grid grid-cols-4 items-center h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleJump(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d4ed8] ${
                isActive ? 'text-[#1d4ed8]' : 'text-[#747686] hover:text-[#0b1c30]'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                aria-hidden="true"
              />
              <span className={`text-[11px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
