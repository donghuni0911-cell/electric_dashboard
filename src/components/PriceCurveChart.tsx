import React, { useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { getStatusMeta } from '../data/marketData';
import { ChartMetric, PricePoint, RegionMarketSnapshot, TimeRange } from '../types/market';

interface PriceCurveChartProps {
  snapshot: RegionMarketSnapshot;
  timeRange: TimeRange;
  onChangeTimeRange: (range: TimeRange) => void;
  isPhoneView: boolean;
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '24H', label: '24H' },
  { id: '7D', label: '7D' },
  { id: '1M', label: '1M' },
];

export function PriceCurveChart({
  snapshot,
  timeRange,
  onChangeTimeRange,
  isPhoneView,
}: PriceCurveChartProps) {
  const points: PricePoint[] = snapshot.series[timeRange];
  const defaultIdx =
    timeRange === '24H'
      ? Math.min(Math.max(0, snapshot.currentHour - 1), points.length - 1)
      : Math.max(0, points.length - 1);

  const [selectedIndex, setSelectedIndex] = useState<number>(defaultIdx);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('smp');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const safeIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, points.length - 1));
  const activePoint = points[safeIndex] || points[0];

  const isDemandMode = chartMetric === 'demand';
  const isCompact = isPhoneView;

  const getPrimaryVal = (p: PricePoint) => (isDemandMode ? p.demandMw : p.smp);
  const getCompareVal = (p: PricePoint) => {
    if (isDemandMode) {
      return p.actual2025Mw ?? p.demandMw;
    }
    return p.yesterdaySmp;
  };

  const has2025Comparison = isDemandMode
    ? points.some((p) => p.actual2025Mw !== null)
    : true;

  const chartStats = useMemo(() => {
    if (points.length === 0) return { minVal: 0, maxVal: 100, avgVal: 50 };
    const allValues = points.flatMap((p) =>
      showComparison && has2025Comparison
        ? [getPrimaryVal(p), getCompareVal(p)]
        : [getPrimaryVal(p)]
    );
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const pad = Math.max(isDemandMode ? 1500 : 3, (rawMax - rawMin) * 0.16);
    const step = isDemandMode ? 1000 : 5;
    const minVal = Math.max(0, Math.floor((rawMin - pad) / step) * step);
    const maxVal = Math.ceil((rawMax + pad) / step) * step;
    const avgVal = points.reduce((sum, p) => sum + getPrimaryVal(p), 0) / points.length;
    return { minVal, maxVal, avgVal };
  }, [points, showComparison, isDemandMode, has2025Comparison]);

  if (!activePoint) return null;

  const width = isCompact ? 380 : 820;
  const height = isCompact ? 200 : 280;
  const padLeft = isCompact ? (isDemandMode ? 44 : 34) : isDemandMode ? 62 : 50;
  const padRight = isCompact ? 10 : 20;
  const padTop = isCompact ? 14 : 26;
  const padBottom = isCompact ? 28 : 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    points.length <= 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (points.length - 1)) * plotW;

  const getY = (val: number) => {
    const ratio = (val - chartStats.minVal) / Math.max(1, chartStats.maxVal - chartStats.minVal);
    return padTop + plotH - ratio * plotH;
  };

  const buildSmoothPath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX.toFixed(1)} ${p0.y.toFixed(1)}, ${cpX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const primaryCoords = points.map((p, i) => ({ x: getX(i), y: getY(getPrimaryVal(p)) }));
  const compareCoords = points.map((p, i) => ({ x: getX(i), y: getY(getCompareVal(p)) }));

  const primaryLinePath = buildSmoothPath(primaryCoords);
  const compareLinePath = buildSmoothPath(compareCoords);
  const primaryAreaPath = `${primaryLinePath} L ${primaryCoords[primaryCoords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${primaryCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

  const handlePointerScrub = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;
    const clamped = Math.min(Math.max(relX, padLeft), padLeft + plotW);
    const ratio = (clamped - padLeft) / plotW;
    const idx = Math.round(ratio * (points.length - 1));
    setSelectedIndex(idx);
  };

  const handleRangeChange = (range: TimeRange) => {
    onChangeTimeRange(range);
    const nextLen = snapshot.series[range].length;
    setSelectedIndex(
      range === '24H' ? Math.min(Math.max(0, snapshot.currentHour - 1), nextLen - 1) : Math.max(0, nextLen - 1)
    );
  };

  const tickRatios = isCompact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const yTicks = tickRatios.map((t) => {
    const val = chartStats.minVal + t * (chartStats.maxVal - chartStats.minVal);
    return { val: Math.round(val), y: getY(val) };
  });

  const activeX = primaryCoords[safeIndex].x;
  const activeY = primaryCoords[safeIndex].y;
  const activeMeta = getStatusMeta(activePoint.status);
  const primaryVal = getPrimaryVal(activePoint);
  const diffVsAvg = Number(
    (((primaryVal - chartStats.avgVal) / Math.max(1, chartStats.avgVal)) * 100).toFixed(1)
  );

  const tooltipOnRight = safeIndex < points.length * 0.63;
  const tooltipX = tooltipOnRight ? activeX + 14 : activeX - 196;
  const tooltipY = Math.max(padTop, Math.min(activeY - 36, padTop + plotH - 78));

  const compareLabel = isDemandMode
    ? `2025 동기 실측 (${snapshot.csv2025Date || 'CSV'})`
    : `어제 (${snapshot.yesterdayDateDash}) SMP`;

  return (
    <section
      id="price-curve"
      aria-label="시간대별 전력 시세 및 수요 곡선"
      className={`card-level-1 rounded-2xl scroll-mt-16 ${isCompact ? 'p-4' : 'p-4 sm:p-6'}`}
    >
      {/* Card Header */}
      <div
        className={`flex justify-between gap-3 ${
          isCompact ? 'flex-col' : 'flex-col lg:flex-row lg:items-center sm:gap-4'
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className={`${isCompact ? 'text-base' : 'text-base sm:text-xl'} font-semibold text-[#0b1c30]`}>
              {isDemandMode ? '시간대별 전력수요 비교 곡선' : '시간대별 전력 시세 곡선'}
            </h2>
            <span className="text-xs font-medium text-[#747686]">
              · {snapshot.regionLabel} · {isDemandMode ? 'MW' : '원/kWh'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#434655] mt-0.5">
            {isDemandMode
              ? 'KPX 예측 전력수요와 2025년 동기 실측 전력수요를 비교합니다.'
              : '그래프를 터치하거나 슬라이더로 시간대별 도매 단가를 확인하세요.'}
          </p>
        </div>

        <div
          className={`flex items-stretch gap-2 ${
            isCompact ? 'flex-col w-full' : 'flex-col sm:flex-row sm:items-center w-full lg:w-auto'
          }`}
        >
          {/* Metric Switcher */}
          <div
            role="tablist"
            aria-label="지표 전환"
            className="grid grid-cols-2 items-center p-1 rounded-lg bg-[#eff4ff] border border-[#dce9ff]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={chartMetric === 'smp'}
              onClick={() => setChartMetric('smp')}
              className={`min-h-[40px] px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                chartMetric === 'smp'
                  ? 'bg-white text-[#0037b0] shadow-sm'
                  : 'text-[#434655] hover:text-[#0b1c30]'
              }`}
            >
              SMP 시세 (원)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartMetric === 'demand'}
              onClick={() => setChartMetric('demand')}
              className={`min-h-[40px] px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                chartMetric === 'demand'
                  ? 'bg-white text-[#0037b0] shadow-sm'
                  : 'text-[#434655] hover:text-[#0b1c30]'
              }`}
            >
              전력수요 (MW)
            </button>
          </div>

          {/* Segmented Time-Range Switcher */}
          <div
            role="tablist"
            aria-label="조회 기간 선택"
            className="grid grid-cols-3 items-center p-1 rounded-lg bg-[#f1f5f9]"
          >
            {TIME_RANGES.map((item) => {
              const isActive = timeRange === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleRangeChange(item.id)}
                  className={`min-h-[40px] px-3.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] ${
                    isActive
                      ? 'bg-white text-[#0b1c30] shadow-sm'
                      : 'text-[#434655] hover:text-[#0b1c30]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Point Live Readout Strip */}
      <div
        className={`mt-4 pt-3 border-t border-[#f1f5f9] gap-x-5 gap-y-2.5 ${
          isCompact
            ? 'grid grid-cols-2 items-center'
            : 'grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between sm:pt-4'
        }`}
      >
        <div>
          <span className="block text-[11px] font-medium text-[#747686]">선택 시점</span>
          <span className="text-xs sm:text-sm font-semibold text-[#0b1c30] tabular-nums">
            {isCompact ? activePoint.shortLabel : activePoint.label}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-[#747686]">
            {isDemandMode ? 'KPX 예측 수요' : '실시간 SMP'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold text-[#1d4ed8] tabular-nums font-mono">
              {isDemandMode
                ? activePoint.demandMw.toLocaleString('ko-KR')
                : activePoint.smp.toFixed(2)}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-[#434655]">
              {isDemandMode ? 'MW' : '원/kWh'}
            </span>
          </div>
        </div>
        {isDemandMode && activePoint.actual2025Mw !== null ? (
          <div>
            <span className="block text-[11px] font-medium text-[#747686]">2025 동기 실측</span>
            <span className="text-xs sm:text-sm font-semibold text-[#059669] tabular-nums font-mono">
              {activePoint.actual2025Mw.toLocaleString('ko-KR')} MW
            </span>
          </div>
        ) : (
          <div>
            <span className="block text-[11px] font-medium text-[#747686]">구간 평균 대비</span>
            <span
              className={`text-xs sm:text-sm font-semibold tabular-nums ${
                diffVsAvg <= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
              }`}
            >
              {diffVsAvg > 0 ? `+${diffVsAvg}%` : `${diffVsAvg}%`}
            </span>
          </div>
        )}
        <div>
          <span className="block text-[11px] font-medium text-[#747686]">
            {isDemandMode ? '해당 시점 SMP' : '예측 수요'}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[#0b1c30] tabular-nums font-mono">
            {isDemandMode
              ? `${activePoint.smp.toFixed(2)} 원`
              : `${activePoint.demandMw.toLocaleString('ko-KR')} MW`}
          </span>
        </div>

        {/* Comparison Checkbox */}
        {has2025Comparison && (
          <label
            className={`inline-flex items-center gap-2 cursor-pointer select-none min-h-[36px] ${
              isCompact ? 'col-span-2' : 'col-span-2 sm:col-span-1 sm:ml-auto'
            }`}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={showComparison}
              onClick={() => setShowComparison((prev) => !prev)}
              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] ${
                showComparison
                  ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white'
                  : 'bg-white border-[#cbd5e1] text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
            </button>
            <span className="text-xs font-semibold text-[#434655] flex items-center gap-1.5">
              <span
                className={`inline-block w-3.5 border-t-2 border-dashed ${
                  isDemandMode ? 'border-[#10b981]' : 'border-[#0ea5e9]'
                }`}
              />
              {compareLabel}
            </span>
          </label>
        )}
      </div>

      {/* Interactive SVG Curve */}
      <div className="mt-3 relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full touch-none cursor-crosshair overflow-visible ${
            isCompact ? 'h-[200px]' : 'h-[200px] sm:h-[280px]'
          }`}
          role="img"
          aria-label={`${snapshot.regionLabel} ${timeRange} ${isDemandMode ? '전력수요' : 'SMP 시세'} 그래프`}
          onPointerDown={(e: React.PointerEvent<SVGSVGElement>) => handlePointerScrub(e.clientX)}
          onPointerMove={(e: React.PointerEvent<SVGSVGElement>) => {
            if (e.buttons > 0 || e.pointerType === 'mouse') {
              handlePointerScrub(e.clientX);
            }
          }}
        >
          <defs>
            <linearGradient id="clearvoltAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {!isDemandMode &&
            points.map((p, idx) => {
              if (p.status !== 'low') return null;
              const segW = plotW / Math.max(1, points.length - 1);
              const x = Math.max(padLeft, getX(idx) - segW / 2);
              const rightBound = Math.min(padLeft + plotW, getX(idx) + segW / 2);
              return (
                <rect
                  key={`low-zone-${p.id}`}
                  x={x}
                  y={padTop}
                  width={Math.max(0, rightBound - x)}
                  height={plotH}
                  fill="#10b981"
                  fillOpacity="0.06"
                />
              );
            })}

          {yTicks.map((tick, idx) => (
            <g key={`ytick-${idx}`}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={padLeft + plotW}
                y2={tick.y}
                stroke="#e5eeff"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[#747686] text-[11px] font-mono tabular-nums"
              >
                {isCompact && isDemandMode
                  ? `${(tick.val / 1000).toFixed(0)}k`
                  : tick.val.toLocaleString('ko-KR')}
              </text>
            </g>
          ))}

          {points.map((p, idx) => {
            const step = isCompact
              ? points.length > 16
                ? 6
                : points.length > 10
                ? 5
                : 2
              : points.length > 16
              ? 4
              : points.length > 10
              ? 2
              : 1;
            const showLabel = idx % step === 0 || idx === points.length - 1;
            if (!showLabel) return null;
            return (
              <text
                key={`xlabel-${p.id}`}
                x={getX(idx)}
                y={height - 8}
                textAnchor="middle"
                className={`text-[11px] tabular-nums ${
                  idx === safeIndex ? 'fill-[#1d4ed8] font-bold' : 'fill-[#747686]'
                }`}
              >
                {p.shortLabel}
              </text>
            );
          })}

          <path d={primaryAreaPath} fill="url(#clearvoltAreaGrad)" />

          {showComparison && has2025Comparison && (
            <path
              d={compareLinePath}
              fill="none"
              stroke={isDemandMode ? '#10b981' : '#0ea5e9'}
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
          )}

          <path
            d={primaryLinePath}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth={isCompact ? '2.5' : '2.75'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={padTop + plotH}
            stroke="#1d4ed8"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />

          {showComparison && has2025Comparison && (
            <circle
              cx={activeX}
              cy={compareCoords[safeIndex].y}
              r="4"
              fill="#ffffff"
              stroke={isDemandMode ? '#10b981' : '#0ea5e9'}
              strokeWidth="2"
            />
          )}

          <circle
            cx={activeX}
            cy={activeY}
            r={isCompact ? '5.5' : '6'}
            fill="#1d4ed8"
            stroke="#ffffff"
            strokeWidth="2.5"
          />

          {!isCompact && (
            <g transform={`translate(${tooltipX}, ${tooltipY})`}>
              <rect
                width="184"
                height="68"
                rx="10"
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="1"
                style={{ filter: 'drop-shadow(0 6px 16px rgba(15, 23, 42, 0.08))' }}
              />
              <text x="12" y="21" className="fill-[#434655] text-[11px] font-semibold">
                {activePoint.shortLabel} · {activeMeta.shortLabel}
              </text>
              <text x="12" y="43" className="fill-[#0b1c30] text-[15px] font-bold font-mono tabular-nums">
                {isDemandMode
                  ? `${activePoint.demandMw.toLocaleString('ko-KR')} MW`
                  : `${activePoint.smp.toFixed(2)} 원/kWh`}
              </text>
              {showComparison && has2025Comparison && (
                <text
                  x="12"
                  y="59"
                  className={`${isDemandMode ? 'fill-[#059669]' : 'fill-[#006591]'} text-[11px] tabular-nums`}
                >
                  {isDemandMode
                    ? `2025 실측 ${(activePoint.actual2025Mw ?? 0).toLocaleString('ko-KR')} MW`
                    : `전일 동일 시점 ${activePoint.yesterdaySmp.toFixed(2)}원`}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Touch Scrub Bar */}
      <div className="mt-2 pt-2 flex items-center gap-3">
        <span className="text-[11px] font-medium text-[#747686] whitespace-nowrap">시점 이동</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, points.length - 1)}
          value={safeIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          aria-label="그래프 시점 탐색 슬라이더"
          className="w-full h-3 rounded-lg appearance-none bg-[#e5eeff] accent-[#1d4ed8] cursor-pointer"
        />
        <span className="text-xs font-semibold text-[#1d4ed8] tabular-nums whitespace-nowrap min-w-[48px] text-right">
          {activePoint.shortLabel}
        </span>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] sm:text-xs text-[#434655]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#1d4ed8] inline-block" />
          {isDemandMode ? `KPX 예측 (${snapshot.targetDateDash})` : '실시간 SMP'}
        </span>
        {showComparison && has2025Comparison && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-3 border-t-2 border-dashed inline-block ${
                isDemandMode ? 'border-[#10b981]' : 'border-[#0ea5e9]'
              }`}
            />
            {compareLabel}
          </span>
        )}
        {!isDemandMode && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#10b981]/20 border border-[#10b981]/40 inline-block" />
            저렴 시간대
          </span>
        )}
      </div>
    </section>
  );
}
