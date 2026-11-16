import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Sun, TrendingDown, TrendingUp } from 'lucide-react';
import { getBeginnerInsightMessage } from '../data/marketData';
import { RegionMarketSnapshot } from '../types/market';

interface PriceAlertBannerProps {
  snapshot: RegionMarketSnapshot;
  isPhoneView: boolean;
}

export function PriceAlertBanner({ snapshot, isPhoneView }: PriceAlertBannerProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const insight = getBeginnerInsightMessage(snapshot);

  return (
    <section
      aria-label="실시간 시세 안내"
      className={`rounded-2xl bg-[#eff4ff] border border-[#dce9ff] transition-colors ${
        isPhoneView ? 'p-4' : 'p-4 sm:p-5'
      }`}
    >
      <div
        className={`flex justify-between gap-3.5 ${
          isPhoneView ? 'flex-col' : 'flex-col md:flex-row md:items-center gap-4'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#dce9ff] flex items-center justify-center shrink-0 text-[#1d4ed8] mt-0.5">
            {insight.isCheaper ? (
              <TrendingDown className="w-5 h-5 text-[#059669]" aria-hidden="true" />
            ) : (
              <TrendingUp className="w-5 h-5 text-[#1d4ed8]" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#434655]">
              <span className="font-semibold text-[#0037b0]">오늘의 전력 시세 요약</span>
              <span aria-hidden="true">·</span>
              <span>{snapshot.regionLabel} 기준</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[#004f35] font-semibold">
                <Sun className="w-3.5 h-3.5 text-[#10b981]" aria-hidden="true" />
                태양광 비중 {snapshot.solarSurplusPct.toFixed(1)}%
              </span>
            </div>
            <h2
              className={`font-semibold text-[#0b1c30] leading-snug ${
                isPhoneView ? 'text-[15px]' : 'text-base sm:text-[17px]'
              }`}
            >
              {insight.headline}
            </h2>
            <p className={`text-[#434655] leading-relaxed ${isPhoneView ? 'text-xs' : 'text-sm'}`}>
              {insight.detail} <span className="text-[#0b1c30] font-medium">{insight.tip}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGuideOpen((prev) => !prev)}
          aria-expanded={guideOpen}
          className={`inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg bg-white hover:bg-[#f8f9ff] border border-[#cbd5e1] text-xs sm:text-sm font-semibold text-[#0b1c30] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] ${
            isPhoneView ? 'w-full' : 'self-start md:self-center'
          }`}
        >
          <Info className="w-4 h-4 text-[#1d4ed8]" aria-hidden="true" />
          <span>초보자 시장 가이드</span>
          {guideOpen ? (
            <ChevronUp className="w-4 h-4 text-[#434655]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#434655]" aria-hidden="true" />
          )}
        </button>
      </div>

      {guideOpen && (
        <div
          className={`mt-4 pt-4 border-t border-[#dce9ff] grid gap-4 text-xs sm:text-sm ${
            isPhoneView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
          }`}
        >
          <div className="space-y-1">
            <p className="font-semibold text-[#0037b0]">SMP (계통한계가격)란?</p>
            <p className="text-[#434655] leading-relaxed">
              발전소에서 한국전력으로 전기를 판매할 때 적용되는 1kWh당 실시간 도매 가격입니다.
              보통 낮 12~15시(태양광 집중)와 심야에 낮아지고, 저녁 18~20시에 높아집니다.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#004f35]">REC (공급인증서)란?</p>
            <p className="text-[#434655] leading-relaxed">
              태양광·풍력 등 신재생에너지 1,000kWh(1MWh)를 생산할 때마다 발급되는 친환경 인증서입니다.
              태양광 발전 사업자는 SMP 수익에 REC 판매 수익을 더해 정산받습니다.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#0b1c30]">일반 소비자·전기차 활용법</p>
            <p className="text-[#434655] leading-relaxed">
              전력 시장 시세가 저렴한 시간대는 국가 전력망 여유가 충분할 때입니다.
              계시별 요금제나 전기차 충전 예약 시 이 시간대를 활용하면 요금과 탄소 배출을 함께 줄일 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
