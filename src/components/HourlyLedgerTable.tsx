import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { getStatusMeta } from '../data/marketData';
import { PriceStatus, RegionMarketSnapshot } from '../types/market';

interface HourlyLedgerTableProps {
  snapshot: RegionMarketSnapshot;
  isPhoneView: boolean;
}

type FilterOption = 'all' | PriceStatus;

export function HourlyLedgerTable({ snapshot, isPhoneView }: HourlyLedgerTableProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [query, setQuery] = useState<string>('');
  const [showAllMobile, setShowAllMobile] = useState<boolean>(false);

  const rows = snapshot.series['24H'];

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false;
      if (query.trim() && !row.label.includes(query.trim()) && !row.shortLabel.includes(query.trim())) {
        return false;
      }
      return true;
    });
  }, [rows, filter, query]);

  // On mobile, show around current hour (8 rows) by default unless expanded or filtered
  const mobileRows = useMemo(() => {
    if (showAllMobile || filter !== 'all' || query.trim() !== '') {
      return filteredRows;
    }
    const startIdx = Math.max(0, Math.min(snapshot.currentHour - 3, filteredRows.length - 8));
    return filteredRows.slice(startIdx, startIdx + 8);
  }, [filteredRows, showAllMobile, filter, query, snapshot.currentHour]);

  const filterButtons: { id: FilterOption; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'low', label: '저렴' },
    { id: 'normal', label: '보통' },
    { id: 'peak', label: '피크' },
  ];

  return (
    <section
      id="ledger"
      aria-label="시간대별 전력 시세 상세표"
      className={`card-level-1 rounded-2xl scroll-mt-16 ${isPhoneView ? 'p-4' : 'p-4 sm:p-6'}`}
    >
      <div
        className={`flex justify-between gap-3 ${
          isPhoneView ? 'flex-col' : 'flex-col md:flex-row md:items-center sm:gap-4'
        }`}
      >
        <div>
          <h2 className={`font-semibold text-[#0b1c30] ${isPhoneView ? 'text-base' : 'text-base sm:text-xl'}`}>
            시간대별 SMP · 수요 · 2025 비교
          </h2>
          <p className="text-xs sm:text-sm text-[#434655] mt-0.5">
            {snapshot.regionLabel} {snapshot.targetDateDash} (1~24시)와 {snapshot.csv2025Date || '2025년 동기'} 실측 비교입니다.
          </p>
        </div>

        <div
          className={`flex items-stretch gap-2.5 ${
            isPhoneView ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'
          }`}
        >
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#747686] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="시간 검색 (예: 14시)"
              aria-label="시간대 검색"
              className={`h-11 pl-9 pr-3 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-sm text-[#0b1c30] ${
                isPhoneView ? 'w-full' : 'w-full sm:w-44'
              }`}
            />
          </div>

          <div
            role="tablist"
            aria-label="시세 상태 필터"
            className={`grid grid-cols-4 items-center p-1 rounded-lg bg-[#f1f5f9] ${
              isPhoneView ? '' : 'sm:inline-flex'
            }`}
          >
            {filterButtons.map((btn) => {
              const isActive = filter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilter(btn.id)}
                  className={`min-h-[38px] px-2.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0b1c30] shadow-sm'
                      : 'text-[#434655] hover:text-[#0b1c30]'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredRows.length === 0 ? (
        <div className="mt-5 py-10 text-center border-t border-[#f1f5f9]">
          <p className="text-sm font-semibold text-[#0b1c30]">조건에 맞는 시간대 데이터가 없습니다</p>
          <p className="text-xs text-[#747686] mt-1">검색어나 상태 필터를 초기화해 주세요.</p>
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setQuery('');
            }}
            className="mt-3 h-11 px-4 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#0b1c30] hover:bg-[#f8f9ff] cursor-pointer"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Native List View (Zero Horizontal Scrolling) */}
          <div className={`mt-4 divide-y divide-[#f1f5f9] border-t border-[#f1f5f9] ${isPhoneView ? 'block' : 'md:hidden'}`}>
            {mobileRows.map((row) => {
              const meta = getStatusMeta(row.status);
              const smpDiff = Number((row.smp - row.yesterdaySmp).toFixed(2));
              const isSmpCheaper = smpDiff <= 0;
              const yoyPct =
                row.actual2025Mw && row.actual2025Mw > 0
                  ? Number((((row.demandMw - row.actual2025Mw) / row.actual2025Mw) * 100).toFixed(1))
                  : null;
              const isCurrentHour = row.hour === snapshot.currentHour;

              return (
                <div
                  key={`mob-${row.id}`}
                  className={`py-3 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 ${
                    isCurrentHour ? 'bg-[#eff4ff]/80' : ''
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#0b1c30] tabular-nums font-mono">
                        {row.shortLabel}
                      </span>
                      {isCurrentHour && (
                        <span className="text-[11px] font-bold text-[#1d4ed8]">현재</span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                      >
                        {meta.shortLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#434655] tabular-nums truncate">
                      예측 {row.demandMw.toLocaleString('ko-KR')} MW
                      {yoyPct !== null && (
                        <span className={yoyPct <= 0 ? 'text-[#059669]' : 'text-[#1d4ed8]'}>
                          {' '}· 2025 대비 {yoyPct > 0 ? `+${yoyPct}%` : `${yoyPct}%`}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-[#0b1c30] tabular-nums font-mono">
                      {row.smp.toFixed(2)} <span className="text-xs font-normal text-[#434655]">원</span>
                    </p>
                    <p
                      className={`text-[11px] font-semibold tabular-nums font-mono ${
                        isSmpCheaper ? 'text-[#059669]' : 'text-[#dc2626]'
                      }`}
                    >
                      전일 {smpDiff > 0 ? `+${smpDiff.toFixed(2)}` : smpDiff.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}

            {filter === 'all' && query.trim() === '' && filteredRows.length > 8 && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setShowAllMobile((v) => !v)}
                  className="w-full h-11 rounded-lg bg-[#f8f9ff] border border-[#dce9ff] text-xs font-semibold text-[#0037b0] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {showAllMobile ? (
                    <>
                      <span>현재 시간대 주변만 보기</span>
                      <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <span>24시간 전체 시간대 펼치기 ({filteredRows.length}개)</span>
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Desktop / Tablet Full Table */}
          {!isPhoneView && (
            <div className="mt-5 hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-y border-[#e2e8f0] text-xs font-semibold text-[#747686]">
                    <th className="py-3 pr-4">시간대</th>
                    <th className="py-3 px-4">시세 상태</th>
                    <th className="py-3 px-4 text-right">실시간 SMP (원/kWh)</th>
                    <th className="py-3 px-4 text-right">전일 대비</th>
                    <th className="py-3 px-4 text-right">KPX 예측수요 (MW)</th>
                    <th className="py-3 px-4 text-right">2025 동기 실측 (MW)</th>
                    <th className="py-3 pl-4 text-right">전년 대비</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] text-sm">
                  {filteredRows.map((row) => {
                    const meta = getStatusMeta(row.status);
                    const smpDiff = Number((row.smp - row.yesterdaySmp).toFixed(2));
                    const isSmpCheaper = smpDiff <= 0;
                    const yoyPct =
                      row.actual2025Mw && row.actual2025Mw > 0
                        ? Number((((row.demandMw - row.actual2025Mw) / row.actual2025Mw) * 100).toFixed(1))
                        : null;
                    const isCurrentHour = row.hour === snapshot.currentHour;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors h-11 ${
                          isCurrentHour ? 'bg-[#eff4ff]/70' : 'hover:bg-[#f8f9ff]'
                        }`}
                      >
                        <td className="py-2.5 pr-4 font-semibold text-[#0b1c30] tabular-nums font-mono whitespace-nowrap">
                          {row.shortLabel}
                          {isCurrentHour && (
                            <span className="ml-2 text-[11px] font-semibold text-[#1d4ed8]">현재</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#0b1c30] tabular-nums font-mono">
                          {row.smp.toFixed(2)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-semibold tabular-nums font-mono ${
                            isSmpCheaper ? 'text-[#059669]' : 'text-[#dc2626]'
                          }`}
                        >
                          {smpDiff > 0 ? `+${smpDiff.toFixed(2)}` : smpDiff.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-[#0b1c30] tabular-nums font-mono">
                          {row.demandMw.toLocaleString('ko-KR')}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#434655] tabular-nums font-mono">
                          {row.actual2025Mw !== null
                            ? row.actual2025Mw.toLocaleString('ko-KR')
                            : '—'}
                        </td>
                        <td
                          className={`py-2.5 pl-4 text-right font-semibold tabular-nums font-mono ${
                            yoyPct === null
                              ? 'text-[#747686]'
                              : yoyPct <= 0
                              ? 'text-[#059669]'
                              : 'text-[#1d4ed8]'
                          }`}
                        >
                          {yoyPct === null ? '—' : yoyPct > 0 ? `+${yoyPct}%` : `${yoyPct}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
