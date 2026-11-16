import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, HelpCircle, X } from 'lucide-react';
import { getStatusMeta } from '../data/marketData';
import { RegionMarketSnapshot } from '../types/market';

interface MarketMetricCardsProps {
  snapshot: RegionMarketSnapshot;
  isPhoneView: boolean;
}

type TooltipKey = 'smp' | 'demand' | 'reserve' | null;

export function MarketMetricCards({ snapshot, isPhoneView }: MarketMetricCardsProps) {
  const [openTooltip, setOpenTooltip] = useState<TooltipKey>(null);

  const smpDeltaPct = Number(
    (((snapshot.currentSmp - snapshot.yesterdayAvgSmp) / Math.max(1, snapshot.yesterdayAvgSmp)) * 100).toFixed(1)
  );
  const isSmpDown = smpDeltaPct <= 0;
  const statusMeta = getStatusMeta(snapshot.status);
  const recPerKwh = (snapshot.recSpotPrice / 1000).toFixed(1);

  const demandDiffMw =
    snapshot.actual2025CurrentMw !== null
      ? snapshot.demandMw - snapshot.actual2025CurrentMw
      : null;
  const demandDiffPct =
    snapshot.actual2025CurrentMw && snapshot.actual2025CurrentMw > 0 && demandDiffMw !== null
      ? Number(((demandDiffMw / snapshot.actual2025CurrentMw) * 100).toFixed(1))
      : null;

  const toggleTooltip = (key: Exclude<TooltipKey, null>) => {
    setOpenTooltip((prev) => (prev === key ? null : key));
  };

  return (
    <section
      id="overview"
      aria-label="핵심 전력 시장 지표"
      className={`grid gap-3 scroll-mt-16 ${
        isPhoneView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3 sm:gap-4'
      }`}
    >
      {/* Card 1: Live KPX SMP */}
      <article
        className={`card-level-1 rounded-2xl relative flex flex-col justify-between gap-3 ${
          isPhoneView ? 'p-4' : 'p-4 sm:p-6 sm:gap-4'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-[#434655] truncate">
                {snapshot.currentHour}시 계통한계가격 (SMP)
              </h3>
              <button
                type="button"
                onClick={() => toggleTooltip('smp')}
                aria-label="SMP 용어 설명 보기"
                aria-expanded={openTooltip === 'smp'}
                className="w-8 h-8 -my-1.5 inline-flex items-center justify-center rounded-lg text-[#747686] hover:text-[#1d4ed8] hover:bg-[#eff4ff] transition-colors shrink-0 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
            >
              {statusMeta.label}
            </span>
          </div>

          {openTooltip === 'smp' && (
            <div className="mt-2.5 p-3 rounded-lg bg-[#f8f9ff] border border-[#dce9ff] text-xs text-[#434655] leading-relaxed relative">
              <button
                type="button"
                onClick={() => setOpenTooltip(null)}
                aria-label="설명 닫기"
                className="absolute top-2 right-2 text-[#747686] hover:text-[#0b1c30] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="font-semibold text-[#0b1c30] mb-0.5">KPX 계통한계가격(SMP)</p>
              공공데이터포털 KPX API에서 조회한 시간대별 실제 도매 전력 단가(원/kWh)입니다.
            </div>
          )}

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold tracking-tight text-[#0b1c30] tabular-nums font-mono leading-none">
              {snapshot.currentSmp.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-[#434655]">원/kWh</span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <div className="flex items-center gap-1 font-semibold tabular-nums">
            {isSmpDown ? (
              <span className="inline-flex items-center gap-0.5 text-[#059669]">
                <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
                {Math.abs(smpDeltaPct).toFixed(1)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[#dc2626]">
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                +{smpDeltaPct.toFixed(1)}%
              </span>
            )}
            <span className="font-normal text-[#747686]">
              전일 ({snapshot.yesterdayAvgSmp.toFixed(1)}원)
            </span>
          </div>
          <span className="text-[#434655] font-medium tabular-nums whitespace-nowrap">
            최저 {snapshot.dailyMinSmp.toFixed(1)} · 최고 {snapshot.dailyMaxSmp.toFixed(1)}
          </span>
        </div>
      </article>

      {/* Card 2: KPX Forecast Demand vs 2025 CSV Actual */}
      <article
        className={`card-level-1 rounded-2xl relative flex flex-col justify-between gap-3 ${
          isPhoneView ? 'p-4' : 'p-4 sm:p-6 sm:gap-4'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-[#434655] truncate">
                예측 전력수요 ({snapshot.regionLabel})
              </h3>
              <button
                type="button"
                onClick={() => toggleTooltip('demand')}
                aria-label="전력수요 비교 설명 보기"
                aria-expanded={openTooltip === 'demand'}
                className="w-8 h-8 -my-1.5 inline-flex items-center justify-center rounded-lg text-[#747686] hover:text-[#1d4ed8] hover:bg-[#eff4ff] transition-colors shrink-0 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <span className="text-xs font-semibold text-[#0037b0] whitespace-nowrap tabular-nums">
              {snapshot.demandGw.toFixed(2)} GW
            </span>
          </div>

          {openTooltip === 'demand' && (
            <div className="mt-2.5 p-3 rounded-lg bg-[#f8f9ff] border border-[#dce9ff] text-xs text-[#434655] leading-relaxed relative">
              <button
                type="button"
                onClick={() => setOpenTooltip(null)}
                aria-label="설명 닫기"
                className="absolute top-2 right-2 text-[#747686] hover:text-[#0b1c30] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="font-semibold text-[#0b1c30] mb-0.5">KPX 수요예측 vs 2025 실측 CSV</p>
              실시간 KPX 하루전 수요예측(SLFD/MLFD/JLFD)과 첨부된 2025년 시간별 전국 전력수요 CSV의 동일 날짜·시간대 실측치를 비교합니다.
            </div>
          )}

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold tracking-tight text-[#0b1c30] tabular-nums font-mono leading-none">
              {snapshot.demandMw.toLocaleString('ko-KR')}
            </span>
            <span className="text-xs font-semibold text-[#434655]">MW</span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          {snapshot.actual2025CurrentMw !== null && demandDiffPct !== null ? (
            <>
              <div className="flex items-center gap-1 font-semibold tabular-nums">
                {demandDiffPct <= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[#059669]">
                    <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
                    {Math.abs(demandDiffPct).toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[#1d4ed8]">
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    +{demandDiffPct.toFixed(1)}%
                  </span>
                )}
                <span className="font-normal text-[#747686]">
                  2025 동기 ({snapshot.actual2025CurrentMw.toLocaleString('ko-KR')} MW)
                </span>
              </div>
              <span className="text-[#434655] font-medium tabular-nums whitespace-nowrap">
                {snapshot.csv2025Date}
              </span>
            </>
          ) : (
            <span className="text-[#747686]">전년 동기 CSV 기준 비교</span>
          )}
        </div>
      </article>

      {/* Card 3: Power Reserve & REC Spot Reference */}
      <article
        className={`card-level-1 rounded-2xl relative flex flex-col justify-between gap-3 ${
          isPhoneView ? 'p-4' : 'p-4 sm:p-6 sm:gap-4'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-[#434655] truncate">
                공급예비율 · REC 현물
              </h3>
              <button
                type="button"
                onClick={() => toggleTooltip('reserve')}
                aria-label="공급예비율 및 REC 설명 보기"
                aria-expanded={openTooltip === 'reserve'}
                className="w-8 h-8 -my-1.5 inline-flex items-center justify-center rounded-lg text-[#747686] hover:text-[#1d4ed8] hover:bg-[#eff4ff] transition-colors shrink-0 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <span className="text-xs font-semibold text-[#059669] whitespace-nowrap">
              {snapshot.reserveMarginPct >= 15 ? '수급 안정' : '예비율 주시'}
            </span>
          </div>

          {openTooltip === 'reserve' && (
            <div className="mt-2.5 p-3 rounded-lg bg-[#f8f9ff] border border-[#dce9ff] text-xs text-[#434655] leading-relaxed relative">
              <button
                type="button"
                onClick={() => setOpenTooltip(null)}
                aria-label="설명 닫기"
                className="absolute top-2 right-2 text-[#747686] hover:text-[#0b1c30] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="font-semibold text-[#0b1c30] mb-0.5">공급예비율 및 REC 1매(1,000kWh)</p>
              추정 공급능력({snapshot.supplyCapacityGw.toFixed(1)}GW) 대비 예비 전력 비율과 화·목 현물시장 REC 참고 단가입니다.
            </div>
          )}

          <div className="mt-3 flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-bold tracking-tight text-[#0b1c30] tabular-nums font-mono leading-none">
                {snapshot.reserveMarginPct.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-[#434655]">% 여유</span>
            </div>
            <div className="text-right text-xs text-[#434655] tabular-nums">
              REC <span className="font-semibold text-[#004f35]">{snapshot.recSpotPrice.toLocaleString('ko-KR')}원</span>
            </div>
          </div>

          <div className="mt-2.5 h-2 w-full rounded-full bg-[#e5eeff] overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-[#1d4ed8] transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((snapshot.demandGw / snapshot.supplyCapacityGw) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="pt-2.5 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[#434655] tabular-nums">
          <span>
            공급능력 <strong className="text-[#0b1c30] font-semibold">{snapshot.supplyCapacityGw.toFixed(1)} GW</strong>
          </span>
          <span>
            REC 환산 <strong className="text-[#004f35] font-semibold">{recPerKwh} 원/kWh</strong>
          </span>
        </div>
      </article>
    </section>
  );
}
