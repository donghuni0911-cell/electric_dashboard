import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart2 } from 'lucide-react';
import { RegionMarketSnapshot } from '../types/market';

interface DailySmpSummarySectionProps {
  snapshot: RegionMarketSnapshot;
  isPhoneView: boolean;
}

export function DailySmpSummarySection({
  snapshot,
  isPhoneView,
}: DailySmpSummarySectionProps) {
  const hours = snapshot.series['24H'];
  const [selectedHourIdx, setSelectedHourIdx] = useState<number>(() =>
    Math.min(Math.max(0, snapshot.currentHour - 1), Math.max(0, hours.length - 1))
  );

  if (hours.length === 0) return null;

  const dailyAvgSmp = Number(
    (hours.reduce((sum, h) => sum + h.smp, 0) / hours.length).toFixed(2)
  );
  const diffPct = Number(
    (((dailyAvgSmp - snapshot.yesterdayAvgSmp) / Math.max(1, snapshot.yesterdayAvgSmp)) * 100).toFixed(1)
  );
  const isCheaperThanYesterday = diffPct <= 0;

  let minPoint = hours[0];
  let maxPoint = hours[0];
  for (const h of hours) {
    if (h.smp < minPoint.smp) minPoint = h;
    if (h.smp > maxPoint.smp) maxPoint = h;
  }

  const chartMin = Math.max(0, Math.floor(minPoint.smp * 0.8));
  const chartMax = Math.max(chartMin + 10, maxPoint.smp * 1.05);
  const safeIdx = Math.min(Math.max(0, selectedHourIdx), hours.length - 1);
  const activeBar = hours[safeIdx];

  return (
    <section
      aria-label="하루 평균 SMP 및 1시~24시 막대 차트"
      className={`grid gap-4 ${
        isPhoneView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
      }`}
    >
      {/* Middle Left: '하루 평균 SMP' Big Number Card (원/kWh) */}
      <article
        className={`card-level-1 rounded-2xl bg-white flex flex-col justify-between gap-4 ${
          isPhoneView ? 'p-4' : 'p-5 sm:p-6 lg:col-span-5'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-[#0b1c30]">
              하루 평균 SMP
            </h2>
            <span className="text-xs font-semibold text-[#1d4ed8] tabular-nums">
              {snapshot.targetDateDash} · {snapshot.regionLabel}
            </span>
          </div>

          <div className="pt-1 flex items-baseline gap-2">
            <span
              className={`font-bold tracking-tight text-[#1d4ed8] tabular-nums font-mono leading-none ${
                isPhoneView ? 'text-[38px]' : 'text-[44px] sm:text-[50px]'
              }`}
            >
              {dailyAvgSmp.toFixed(2)}
            </span>
            <span className="text-base sm:text-lg font-semibold text-[#434655]">
              원/kWh
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
            {isCheaperThanYesterday ? (
              <span className="inline-flex items-center gap-0.5 text-[#059669]">
                <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
                전일 평균 대비 {Math.abs(diffPct).toFixed(1)}% 하락
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[#dc2626]">
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                전일 평균 대비 +{diffPct.toFixed(1)}% 상승
              </span>
            )}
            <span className="font-normal text-[#747686]">
              (전일 {snapshot.yesterdayAvgSmp.toFixed(2)}원)
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-[#f1f5f9] grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#f8f9ff] border border-[#dce9ff] p-2.5">
            <span className="block text-[11px] text-[#747686]">최저 SMP ({minPoint.shortLabel})</span>
            <span className="mt-0.5 block text-sm font-bold text-[#059669] font-mono">
              {minPoint.smp.toFixed(2)} 원/kWh
            </span>
          </div>
          <div className="rounded-xl bg-[#f8f9ff] border border-[#dce9ff] p-2.5">
            <span className="block text-[11px] text-[#747686]">최고 SMP ({maxPoint.shortLabel})</span>
            <span className="mt-0.5 block text-sm font-bold text-[#dc2626] font-mono">
              {maxPoint.smp.toFixed(2)} 원/kWh
            </span>
          </div>
        </div>
      </article>

      {/* Middle Right: 1시~24시 막대 차트 */}
      <article
        className={`card-level-1 rounded-2xl bg-white flex flex-col justify-between gap-3 ${
          isPhoneView ? 'p-4' : 'p-5 sm:p-6 lg:col-span-7'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[#0b1c30] flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-[#1d4ed8] shrink-0" aria-hidden="true" />
              <span>1시~24시 시간별 SMP 막대 차트</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-[#747686] mt-0.5">
              막대를 터치하거나 마우스를 올려 시간대별 단가를 확인하세요.
            </p>
          </div>

          {activeBar && (
            <div className="rounded-lg bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 text-right tabular-nums">
              <span className="text-[11px] font-semibold text-[#0037b0] mr-1.5">
                {activeBar.shortLabel}
              </span>
              <span className="text-sm font-bold text-[#1d4ed8] font-mono">
                {activeBar.smp.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#434655] ml-0.5">원/kWh</span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <div
            className={`flex items-end border-b border-[#e2e8f0] pb-1 px-0.5 ${
              isPhoneView ? 'h-36 gap-[3px]' : 'h-44 gap-1 sm:gap-1.5'
            }`}
            role="img"
            aria-label="1시부터 24시까지 시간별 SMP 막대 차트"
          >
            {hours.map((pt, idx) => {
              const pct = Math.max(
                14,
                Math.round(((pt.smp - chartMin) / Math.max(1, chartMax - chartMin)) * 100)
              );
              const isSelected = idx === safeIdx;
              const isCurrent = pt.hour === snapshot.currentHour;
              return (
                <button
                  key={`bar-24h-${pt.id}`}
                  type="button"
                  onClick={() => setSelectedHourIdx(idx)}
                  onMouseEnter={() => setSelectedHourIdx(idx)}
                  aria-label={`${pt.shortLabel} SMP ${pt.smp.toFixed(2)} 원/kWh`}
                  className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus-visible:outline-none"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isSelected
                        ? 'bg-[#1d4ed8] ring-2 ring-[#93c5fd]'
                        : isCurrent
                        ? 'bg-[#0ea5e9]'
                        : pt.status === 'low'
                        ? 'bg-[#60a5fa]/75 group-hover:bg-[#1d4ed8]'
                        : 'bg-[#1d4ed8]/65 group-hover:bg-[#1d4ed8]'
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-[#747686] px-0.5">
            <span>1시</span>
            <span>6시</span>
            <span>12시</span>
            <span>18시</span>
            <span>24시</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#434655] pt-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1d4ed8] inline-block" />
              선택 시간
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0ea5e9] inline-block" />
              현재 ({snapshot.currentHour}시)
            </span>
          </div>
          {activeBar && (
            <span className="tabular-nums text-[#747686]">
              예측수요 {activeBar.demandMw.toLocaleString('ko-KR')} MW
            </span>
          )}
        </div>
      </article>
    </section>
  );
}
