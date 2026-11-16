import { useState } from 'react';
import { Calculator, Leaf, Zap } from 'lucide-react';
import { CalculatorMode, RegionCode, RegionMarketSnapshot } from '../types/market';

interface MarketComparisonAndCalculatorProps {
  snapshots: Record<RegionCode, RegionMarketSnapshot>;
  selectedRegion: RegionCode;
  onSelectRegion: (region: RegionCode) => void;
  isPhoneView: boolean;
}

export function MarketComparisonAndCalculator({
  snapshots,
  selectedRegion,
  onSelectRegion,
  isPhoneView,
}: MarketComparisonAndCalculatorProps) {
  const activeSnapshot = snapshots[selectedRegion];
  const [mode, setMode] = useState<CalculatorMode>('consumer');
  const [usageKwh, setUsageKwh] = useState<string>('40');
  const [solarKw, setSolarKw] = useState<string>('100');
  const [recWeight, setRecWeight] = useState<number>(1.2);

  const parsedUsage = Math.max(0, Number(usageKwh) || 0);
  const parsedSolarKw = Math.max(0, Number(solarKw) || 0);

  const offPeakSmp = activeSnapshot.dailyMinSmp;
  const peakSmp = activeSnapshot.dailyMaxSmp;
  const currentCost = Math.round(parsedUsage * activeSnapshot.currentSmp);
  const offPeakCost = Math.round(parsedUsage * offPeakSmp);
  const peakCost = Math.round(parsedUsage * peakSmp);
  const monthlySavings = Math.max(0, Math.round((peakCost - offPeakCost) * 20));

  const dailyGenKwh = parsedSolarKw * 3.6;
  const monthlyGenKwh = dailyGenKwh * 30;
  const recPerKwh = (activeSnapshot.recSpotPrice / 1000) * recWeight;
  const totalUnitPrice = activeSnapshot.currentSmp + recPerKwh;
  const estimatedMonthlyRevenue = Math.round(monthlyGenKwh * totalUnitPrice);
  const smpRevenuePart = Math.round(monthlyGenKwh * activeSnapshot.currentSmp);
  const recRevenuePart = Math.round(monthlyGenKwh * recPerKwh);

  const regionalList: { code: RegionCode; name: string; desc: string }[] = [
    { code: 'all', name: '전국 통합', desc: '육지·제주 평균' },
    { code: 'land', name: '육지', desc: '수도권·산업 중심' },
    { code: 'jeju', name: '제주', desc: '재생에너지 특화' },
  ];

  const maxRegionalSmp = Math.max(
    ...regionalList.map((r) => snapshots[r.code].currentSmp),
    120
  );

  return (
    <section
      id="calculator"
      aria-label="수익 계산기 및 지역별 전력 비교"
      className={`grid scroll-mt-16 ${
        isPhoneView ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5'
      }`}
    >
      {/* Left: Consumer Savings & Solar Revenue Calculator */}
      <article
        className={`card-level-1 rounded-2xl flex flex-col justify-between ${
          isPhoneView ? 'p-4' : 'p-4 sm:p-6 lg:col-span-7'
        }`}
      >
        <div>
          <div
            className={`flex justify-between gap-3 ${
              isPhoneView ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'
            }`}
          >
            <div>
              <h2
                className={`font-semibold text-[#0b1c30] flex items-center gap-2 ${
                  isPhoneView ? 'text-base' : 'text-base sm:text-xl'
                }`}
              >
                <Calculator className="w-5 h-5 text-[#1d4ed8] shrink-0" aria-hidden="true" />
                <span>전기 절약 · 태양광 계산기</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#434655] mt-0.5">
                {activeSnapshot.regionLabel} 시세 기준 예상 비용과 발전 수익을 계산합니다.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="계산기 모드 선택"
              className={`grid grid-cols-2 items-center p-1 rounded-lg bg-[#f1f5f9] ${
                isPhoneView ? 'w-full' : 'sm:inline-flex w-full sm:w-auto'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'consumer'}
                onClick={() => setMode('consumer')}
                className={`min-h-[40px] px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'consumer'
                    ? 'bg-white text-[#0b1c30] shadow-sm'
                    : 'text-[#434655] hover:text-[#0b1c30]'
                }`}
              >
                일반 소비 절약
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'solar'}
                onClick={() => setMode('solar')}
                className={`min-h-[40px] px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'solar'
                    ? 'bg-white text-[#0b1c30] shadow-sm'
                    : 'text-[#434655] hover:text-[#0b1c30]'
                }`}
              >
                태양광 (SMP+REC)
              </button>
            </div>
          </div>

          {mode === 'consumer' ? (
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="consumer-kwh-input"
                  className="block text-xs font-semibold text-[#434655] mb-2"
                >
                  1회 사용 전력량 (kWh)
                </label>
                <div className={`flex gap-2.5 ${isPhoneView ? 'flex-col' : 'flex-col sm:flex-row'}`}>
                  <input
                    id="consumer-kwh-input"
                    type="number"
                    min="0"
                    max="10000"
                    value={usageKwh}
                    onChange={(e) => setUsageKwh(e.target.value)}
                    className={`h-12 px-3.5 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-base font-semibold text-[#0b1c30] tabular-nums font-mono ${
                      isPhoneView ? 'w-full' : 'w-full sm:w-40'
                    }`}
                    placeholder="예: 40"
                  />
                  <div
                    className={`gap-1.5 ${
                      isPhoneView
                        ? 'grid grid-cols-3'
                        : 'grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2'
                    }`}
                  >
                    {[
                      { label: '건조기 3kWh', val: '3' },
                      { label: '전기차 40kWh', val: '40' },
                      { label: '설비 120kWh', val: '120' },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setUsageKwh(preset.val)}
                        className={`min-h-[44px] px-2 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isPhoneView ? '' : 'sm:min-h-[40px] sm:px-3 sm:text-xs'
                        } ${
                          usageKwh === preset.val
                            ? 'bg-[#eff4ff] border-[#1d4ed8] text-[#0037b0]'
                            : 'bg-white border-[#cbd5e1] text-[#434655] hover:bg-[#f8f9ff]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`pt-4 border-t border-[#f1f5f9] grid gap-3.5 ${
                  isPhoneView ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 gap-4'
                }`}
              >
                <div>
                  <span className="text-xs font-medium text-[#747686]">지금 도매원가</span>
                  <p
                    className={`mt-1 font-bold text-[#0b1c30] tabular-nums font-mono ${
                      isPhoneView ? 'text-xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {currentCost.toLocaleString('ko-KR')}
                    <span className="text-xs font-semibold text-[#434655] ml-1">원</span>
                  </p>
                  <span className="text-[11px] text-[#434655] tabular-nums">
                    현 시세 {activeSnapshot.currentSmp.toFixed(1)}원/kWh
                  </span>
                </div>
                <div>
                  <span className="text-xs font-medium text-[#747686]">피크 대비 차이</span>
                  <p
                    className={`mt-1 font-bold text-[#059669] tabular-nums font-mono ${
                      isPhoneView ? 'text-xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    -{Math.max(0, peakCost - offPeakCost).toLocaleString('ko-KR')}
                    <span className="text-xs font-semibold text-[#059669] ml-1">원</span>
                  </p>
                  <span className="text-[11px] text-[#747686] tabular-nums">
                    최저 {offPeakSmp.toFixed(1)} vs {peakSmp.toFixed(1)}원
                  </span>
                </div>
                <div
                  className={
                    isPhoneView
                      ? 'col-span-2 pt-2.5 border-t border-[#f1f5f9]'
                      : 'col-span-2 sm:col-span-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f1f5f9]'
                  }
                >
                  <span className="text-xs font-medium text-[#747686]">월 20회 이동 시 절감액</span>
                  <p
                    className={`mt-1 font-bold text-[#1d4ed8] tabular-nums font-mono ${
                      isPhoneView ? 'text-xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {monthlySavings.toLocaleString('ko-KR')}
                    <span className="text-xs font-semibold text-[#1d4ed8] ml-1">원/월</span>
                  </p>
                  <span className="text-[11px] text-[#434655]">비수기 예약 사용 권장</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div
                className={`grid gap-3.5 ${
                  isPhoneView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 gap-4'
                }`}
              >
                <div>
                  <label
                    htmlFor="solar-kw-input"
                    className="block text-xs font-semibold text-[#434655] mb-2"
                  >
                    태양광 설비 용량 (kW)
                  </label>
                  <input
                    id="solar-kw-input"
                    type="number"
                    min="1"
                    max="50000"
                    value={solarKw}
                    onChange={(e) => setSolarKw(e.target.value)}
                    className="h-12 w-full px-3.5 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-base font-semibold text-[#0b1c30] tabular-nums font-mono"
                    placeholder="예: 100"
                  />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#434655] mb-2">
                    REC 가중치 선택
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 h-12">
                    {[
                      { label: '일반 1.0', val: 1.0 },
                      { label: '임야 1.2', val: 1.2 },
                      { label: '지붕 1.5', val: 1.5 },
                    ].map((w) => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => setRecWeight(w.val)}
                        className={`h-12 px-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          recWeight === w.val
                            ? 'bg-[#ecfdf5] border-[#059669] text-[#004f35]'
                            : 'bg-white border-[#cbd5e1] text-[#434655] hover:bg-[#f8f9ff]'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`pt-4 border-t border-[#f1f5f9] grid gap-3.5 ${
                  isPhoneView ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 gap-4'
                }`}
              >
                <div>
                  <span className="text-xs font-medium text-[#747686]">월 예상 총 정산금</span>
                  <p
                    className={`mt-1 font-bold text-[#1d4ed8] tabular-nums font-mono ${
                      isPhoneView ? 'text-xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {estimatedMonthlyRevenue.toLocaleString('ko-KR')}
                    <span className="text-xs font-semibold text-[#1d4ed8] ml-1">원</span>
                  </p>
                  <span className="text-[11px] text-[#434655] tabular-nums">
                    일 3.6h · {Math.round(monthlyGenKwh).toLocaleString('ko-KR')}kWh
                  </span>
                </div>
                <div>
                  <span className="text-xs font-medium text-[#747686]">SMP + REC 합산</span>
                  <p
                    className={`mt-1 font-bold text-[#0b1c30] tabular-nums font-mono ${
                      isPhoneView ? 'text-xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {totalUnitPrice.toFixed(1)}
                    <span className="text-xs font-semibold text-[#434655] ml-1">원</span>
                  </p>
                  <span className="text-[11px] text-[#059669] tabular-nums">
                    SMP {activeSnapshot.currentSmp.toFixed(1)} + {recPerKwh.toFixed(1)}
                  </span>
                </div>
                <div
                  className={
                    isPhoneView
                      ? 'col-span-2 pt-2.5 border-t border-[#f1f5f9]'
                      : 'col-span-2 sm:col-span-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f1f5f9]'
                  }
                >
                  <span className="text-xs font-medium text-[#747686]">수익 구성 (SMP / REC)</span>
                  <div
                    className={`mt-1 flex items-center gap-3 text-xs font-semibold tabular-nums ${
                      isPhoneView ? '' : 'sm:block sm:text-sm'
                    }`}
                  >
                    <p className="text-[#0b1c30]">SMP {smpRevenuePart.toLocaleString('ko-KR')}원</p>
                    <p className="text-[#004f35]">REC {recRevenuePart.toLocaleString('ko-KR')}원</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-2 text-[11px] text-[#747686]">
          <span className="inline-flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-[#10b981] shrink-0" aria-hidden="true" />
            시뮬레이션 수치는 현재 실시간 현물 단가 기준 참고용입니다.
          </span>
        </div>
      </article>

      {/* Right: Regional SMP Spread & Generation Mix */}
      <article
        className={`card-level-1 rounded-2xl flex flex-col justify-between gap-5 ${
          isPhoneView ? 'p-4' : 'p-4 sm:p-6 lg:col-span-5'
        }`}
      >
        <div>
          <h2
            className={`font-semibold text-[#0b1c30] flex items-center gap-2 ${
              isPhoneView ? 'text-base' : 'text-base sm:text-xl'
            }`}
          >
            <Zap className="w-5 h-5 text-[#1d4ed8] shrink-0" aria-hidden="true" />
            <span>권역별 시세 · 발전원 비중</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#434655] mt-0.5">
            권역을 터치하면 대시보드 전체 지표가 해당 시장으로 전환됩니다.
          </p>

          <div className="mt-4 space-y-2.5">
            {regionalList.map((item) => {
              const snap = snapshots[item.code];
              const isSelected = selectedRegion === item.code;
              const pct = Math.round((snap.currentSmp / maxRegionalSmp) * 100);
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onSelectRegion(item.code)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] ${
                    isSelected
                      ? 'bg-[#eff4ff] border-[#1d4ed8]'
                      : 'bg-white border-[#e2e8f0] hover:bg-[#f8f9ff]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-[#0b1c30] shrink-0">{item.name}</span>
                      <span className="text-xs text-[#747686] truncate">{item.desc}</span>
                    </div>
                    <span className="font-bold text-[#0b1c30] tabular-nums font-mono shrink-0">
                      {snap.currentSmp.toFixed(2)} <span className="text-xs font-normal text-[#434655]">원</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#e5eeff] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSelected ? 'bg-[#1d4ed8]' : 'bg-[#0ea5e9]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-[#f1f5f9]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0b1c30]">
              {activeSnapshot.regionLabel} 발전원별 전력 믹스
            </h3>
            <span className="text-xs text-[#747686] tabular-nums">합계 100%</span>
          </div>

          <div className="h-3 w-full rounded-full overflow-hidden flex bg-[#f1f5f9]" aria-hidden="true">
            {activeSnapshot.energyMix.map((mix) => (
              <div
                key={mix.source}
                style={{ width: `${mix.sharePct}%`, backgroundColor: mix.color }}
                title={`${mix.source} ${mix.sharePct}%`}
              />
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {activeSnapshot.energyMix.map((mix) => (
              <div
                key={mix.source}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: mix.color }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-[#0b1c30]">{mix.source}</span>
                  {!isPhoneView && (
                    <span className="text-[#747686] hidden sm:inline">· {mix.note}</span>
                  )}
                </div>
                <span className="font-semibold text-[#0b1c30] tabular-nums font-mono">
                  {mix.sharePct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
