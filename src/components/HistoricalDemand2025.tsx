import { useEffect, useState } from 'react';
import { BarChart3, Calendar } from 'lucide-react';
import { Demand2025ApiResponse } from '../types/market';

interface HistoricalDemand2025Props {
  defaultDate2025: string;
  isPhoneView: boolean;
}

export function HistoricalDemand2025({ defaultDate2025, isPhoneView }: HistoricalDemand2025Props) {
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate2025);
  const [data, setData] = useState<Demand2025ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeHourIdx, setActiveHourIdx] = useState<number>(13);

  useEffect(() => {
    setSelectedDate(defaultDate2025);
  }, [defaultDate2025]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/demand-2025?date=${encodeURIComponent(selectedDate)}`)
      .then((res) => res.json())
      .then((json: Demand2025ApiResponse) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const day = data?.selectedDay;
  const maxDayMw = day ? Math.max(...day.hours, 1) : 100000;
  const minDayMw = day ? Math.min(...day.hours) : 40000;
  const maxMonthlyPeak = data
    ? Math.max(...data.monthlyAverages.map((m) => m.peakMw), 95000)
    : 96000;

  return (
    <section
      id="historical-2025"
      aria-label="2025년 전국 전력수요 실측 탐색기"
      className={`card-level-1 rounded-2xl space-y-5 scroll-mt-16 ${
        isPhoneView ? 'p-4' : 'p-4 sm:p-6 sm:space-y-6'
      }`}
    >
      {/* Header + 2025 Date Controls */}
      <div
        className={`flex justify-between gap-3 ${
          isPhoneView ? 'flex-col' : 'flex-col lg:flex-row lg:items-center sm:gap-4'
        }`}
      >
        <div>
          <h2
            className={`font-semibold text-[#0b1c30] flex items-center gap-2 ${
              isPhoneView ? 'text-base' : 'text-base sm:text-xl'
            }`}
          >
            <BarChart3 className="w-5 h-5 text-[#1d4ed8] shrink-0" aria-hidden="true" />
            <span>2025년 전국 전력수요 실측</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#434655] mt-0.5">
            2025년 365일 시간별 전국 전력수요 실측치를 날짜·월별로 확인하세요.
          </p>
        </div>

        <div
          className={`flex items-stretch gap-2 ${
            isPhoneView ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'
          }`}
        >
          <div className="relative flex items-center">
            <Calendar
              className="w-4 h-4 text-[#1d4ed8] absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="date"
              min="2025-01-01"
              max="2025-12-31"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              aria-label="2025년 실측 조회 날짜 선택"
              className={`h-11 pl-9 pr-3 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-sm font-semibold text-[#0b1c30] tabular-nums ${
                isPhoneView ? 'w-full' : 'w-full sm:w-auto'
              }`}
            />
          </div>

          <div
            className={`grid grid-cols-3 items-center gap-1.5 ${
              isPhoneView ? '' : 'sm:flex sm:gap-2'
            }`}
          >
            {[
              { label: '여름 07-08', date: '2025-07-08' },
              { label: '겨울 01-09', date: '2025-01-09' },
              { label: '봄 05-04', date: '2025-05-04' },
            ].map((preset) => (
              <button
                key={preset.date}
                type="button"
                onClick={() => setSelectedDate(preset.date)}
                className={`h-11 px-2 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isPhoneView ? '' : 'sm:px-3 sm:text-xs'
                } ${
                  selectedDate === preset.date
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

      {/* Annual & Selected Day Summary Row */}
      {data && (
        <div
          className={`grid gap-3 pt-4 border-t border-[#f1f5f9] ${
            isPhoneView ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4 sm:gap-4'
          }`}
        >
          <div>
            <span className="text-[11px] text-[#747686]">2025 연간 평균</span>
            <p className={`mt-1 font-bold text-[#0b1c30] tabular-nums font-mono ${isPhoneView ? 'text-lg' : 'text-lg sm:text-xl'}`}>
              {data.annualStats.avgMw.toLocaleString('ko-KR')}{' '}
              <span className="text-[11px] font-semibold text-[#434655]">MW</span>
            </p>
            <span className="text-[11px] text-[#747686]">총 {data.annualStats.totalDays}일 실측</span>
          </div>
          <div>
            <span className="text-[11px] text-[#747686]">2025 연간 피크</span>
            <p className={`mt-1 font-bold text-[#dc2626] tabular-nums font-mono ${isPhoneView ? 'text-lg' : 'text-lg sm:text-xl'}`}>
              {data.annualStats.peak.mw.toLocaleString('ko-KR')}{' '}
              <span className="text-[11px] font-semibold text-[#434655]">MW</span>
            </p>
            <span className="text-[11px] text-[#747686] tabular-nums">
              {data.annualStats.peak.date} · {data.annualStats.peak.hour}시
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#747686]">{selectedDate.slice(5)} 평균</span>
            <p className={`mt-1 font-bold text-[#1d4ed8] tabular-nums font-mono ${isPhoneView ? 'text-lg' : 'text-lg sm:text-xl'}`}>
              {day ? day.avgMw.toLocaleString('ko-KR') : '—'}{' '}
              <span className="text-[11px] font-semibold text-[#434655]">MW</span>
            </p>
            <span className="text-[11px] text-[#747686] tabular-nums">
              최저 {day ? day.minMw.toLocaleString('ko-KR') : '—'} ({day?.minHour}시)
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#747686]">{selectedDate.slice(5)} 최대</span>
            <p className={`mt-1 font-bold text-[#0b1c30] tabular-nums font-mono ${isPhoneView ? 'text-lg' : 'text-lg sm:text-xl'}`}>
              {day ? day.maxMw.toLocaleString('ko-KR') : '—'}{' '}
              <span className="text-[11px] font-semibold text-[#434655]">MW</span>
            </p>
            <span className="text-[11px] text-[#747686] tabular-nums">
              피크 시점 {day?.maxHour ?? '—'}시
            </span>
          </div>
        </div>
      )}

      {/* Selected 2025 Date 24H Bar Profile + 12-Month Seasonal Bars */}
      <div
        className={`grid gap-6 pt-4 border-t border-[#f1f5f9] ${
          isPhoneView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        <div className={isPhoneView ? '' : 'lg:col-span-7'}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-[#0b1c30]">
              {selectedDate} 시간별 실측 (1~24시)
            </h3>
            {day && (
              <span className="text-xs font-semibold text-[#1d4ed8] tabular-nums font-mono">
                {activeHourIdx + 1}시: {day.hours[activeHourIdx]?.toLocaleString('ko-KR')} MW
              </span>
            )}
          </div>

          {loading || !day ? (
            <div className="h-40 rounded-xl bg-[#f8f9ff] flex items-center justify-center text-xs text-[#747686]">
              2025년 실측 데이터를 불러오는 중입니다...
            </div>
          ) : (
            <div className="space-y-2">
              <div className={`flex items-end pt-4 px-0.5 ${isPhoneView ? 'h-36 gap-[3px]' : 'h-40 sm:h-44 gap-[3px] sm:gap-1.5'}`}>
                {day.hours.map((mw, idx) => {
                  const range = Math.max(1000, maxDayMw - minDayMw * 0.7);
                  const heightPct = Math.max(
                    12,
                    Math.round(((mw - minDayMw * 0.7) / range) * 100)
                  );
                  const isActive = idx === activeHourIdx;
                  const isPeak = idx + 1 === day.maxHour;
                  return (
                    <button
                      key={`csv-h-${idx}`}
                      type="button"
                      onClick={() => setActiveHourIdx(idx)}
                      onMouseEnter={() => setActiveHourIdx(idx)}
                      aria-label={`${idx + 1}시 ${mw.toLocaleString('ko-KR')} MW`}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus-visible:outline-none"
                    >
                      <div
                        className={`w-full rounded-t transition-colors ${
                          isActive
                            ? 'bg-[#0037b0]'
                            : isPeak
                            ? 'bg-[#ef4444]/80'
                            : 'bg-[#1d4ed8]/70 group-hover:bg-[#1d4ed8]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-[#747686] font-mono tabular-nums px-0.5">
                <span>1시</span>
                <span>6시</span>
                <span>12시</span>
                <span>18시</span>
                <span>24시</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: 2025 12-Month Average vs Peak */}
        <div className={isPhoneView ? '' : 'lg:col-span-5'}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-[#0b1c30]">
              2025년 월별 평균 · 최대 수요
            </h3>
            <span className="text-[11px] text-[#747686]">평균 / 최대</span>
          </div>

          <div className="space-y-1.5">
            {data?.monthlyAverages.map((m) => {
              const avgPct = Math.round((m.avgMw / maxMonthlyPeak) * 100);
              const peakPct = Math.round((m.peakMw / maxMonthlyPeak) * 100);
              const isCurrentMonth = Number(selectedDate.slice(5, 7)) === m.month;
              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() =>
                    setSelectedDate(`2025-${String(m.month).padStart(2, '0')}-15`)
                  }
                  className={`w-full flex items-center gap-2.5 text-xs py-1 rounded px-1.5 transition-colors cursor-pointer ${
                    isCurrentMonth ? 'bg-[#eff4ff]' : 'hover:bg-[#f8f9ff]'
                  }`}
                >
                  <span className="w-7 text-left font-semibold text-[#0b1c30] tabular-nums shrink-0">
                    {m.label}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#f1f5f9] relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#cbd5e1]"
                      style={{ width: `${peakPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#1d4ed8]"
                      style={{ width: `${avgPct}%` }}
                    />
                  </div>
                  {isPhoneView ? (
                    <span className="w-20 text-right font-mono tabular-nums text-[11px] text-[#434655] shrink-0">
                      {(m.avgMw / 1000).toFixed(1)} / {(m.peakMw / 1000).toFixed(1)}G
                    </span>
                  ) : (
                    <>
                      <span className="hidden sm:inline w-28 text-right font-mono tabular-nums text-[#434655] shrink-0">
                        {m.avgMw.toLocaleString('ko-KR')} / {m.peakMw.toLocaleString('ko-KR')}
                      </span>
                      <span className="sm:hidden w-20 text-right font-mono tabular-nums text-[11px] text-[#434655] shrink-0">
                        {(m.avgMw / 1000).toFixed(1)} / {(m.peakMw / 1000).toFixed(1)}G
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
