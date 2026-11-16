import { useCallback, useEffect, useState } from 'react';
import { Calendar, Monitor, Pause, Play, RefreshCw, Smartphone } from 'lucide-react';
import { AiCommentarySection } from './components/AiCommentarySection';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { DailySmpSummarySection } from './components/DailySmpSummarySection';
import { Header } from './components/Header';
import { HistoricalDemand2025 } from './components/HistoricalDemand2025';
import { HourlyLedgerTable } from './components/HourlyLedgerTable';
import { LivePowerSupplySection } from './components/LivePowerSupplySection';
import { MarketComparisonAndCalculator } from './components/MarketComparisonAndCalculator';
import { MarketMetricCards } from './components/MarketMetricCards';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PriceAlertBanner } from './components/PriceAlertBanner';
import { PriceCurveChart } from './components/PriceCurveChart';
import { buildSnapshotsFromApi } from './data/marketData';
import {
  AlertRule,
  LiveMarketApiResponse,
  RegionCode,
  RegionMarketSnapshot,
  TimeRange,
} from './types/market';

const INITIAL_RULES: AlertRule[] = [
  {
    id: 'rule-1',
    region: 'all',
    condition: 'below',
    thresholdWon: 100,
    notifyOnSolarSurplus: true,
    notifyOnPeakSurge: false,
    enabled: true,
    createdAt: '오늘 09:30',
  },
];

function formatKoreanDateFromStr(dateDash: string): string {
  const parts = dateDash.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateDash;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return dt.toLocaleDateString('ko-KR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export default function App() {
  const [snapshots, setSnapshots] = useState<Record<RegionCode, RegionMarketSnapshot> | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [queryDate, setQueryDate] = useState<string>('');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState<boolean>(false);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(INITIAL_RULES);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<string>('overview');
  const [viewportMode, setViewportMode] = useState<'phone' | 'desktop'>('phone');
  const [isNarrowViewport, setIsNarrowViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPhoneView = viewportMode === 'phone' || isNarrowViewport;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const fetchMarketData = useCallback(
    async (dateOpt?: string, isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        const qs = dateOpt ? `?date=${encodeURIComponent(dateOpt)}` : '';
        const res = await fetch(`/api/market/live${qs}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as LiveMarketApiResponse;
        const built = buildSnapshotsFromApi(json);
        setSnapshots(built);
        setErrorMsg(null);
        if (isManual) {
          showToast(
            json.source === 'kpx_api'
              ? '공공데이터포털 KPX 최신 시세를 반영했습니다.'
              : '오프라인 백업 시세로 갱신했습니다.'
          );
        }
      } catch (err) {
        console.error('Market fetch error:', err);
        setErrorMsg('전력 시장 데이터를 불러오는 중 일시적인 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchMarketData(queryDate || undefined, false);
  }, [fetchMarketData, queryDate]);

  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = window.setInterval(() => {
      setRefreshTick((prev) => prev + 1);
      fetchMarketData(queryDate || undefined, false);
    }, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [isLiveStreaming, fetchMarketData, queryDate]);

  useEffect(() => {
    const sectionIds = ['overview', 'price-curve', 'calculator', 'ledger'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveMobileTab(entry.target.id);
          }
        }
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: 0.05 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [snapshots]);

  const handleManualRefresh = () => {
    setRefreshTick((prev) => prev + 1);
    fetchMarketData(queryDate || undefined, true);
  };

  const handleAddRule = (newRule: Omit<AlertRule, 'id' | 'createdAt'>) => {
    const rule: AlertRule = {
      ...newRule,
      id: `rule-${Date.now()}`,
      createdAt: '방금 전',
    };
    setAlertRules((prev) => [rule, ...prev]);
    showToast(`${rule.thresholdWon.toFixed(1)}원/kWh 알림 규칙이 추가되었습니다.`);
  };

  const handleToggleRule = (id: string) => {
    setAlertRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== id));
    showToast('알림 규칙이 삭제되었습니다.');
  };

  const activeSnapshot = snapshots ? snapshots[selectedRegion] : null;
  const enabledAlertCount = alertRules.filter((r) => r.enabled).length;

  const displayDateLabel = activeSnapshot
    ? formatKoreanDateFromStr(activeSnapshot.targetDateDash)
    : formatKoreanDateFromStr(new Date().toISOString().slice(0, 10));

  const default2025Date = activeSnapshot?.csv2025Date || '2025-11-16';

  return (
    <div
      className={
        viewportMode === 'phone'
          ? 'min-h-screen bg-[#f8f9ff] sm:bg-[#eef2f9] sm:py-5 sm:px-4 flex flex-col items-center'
          : 'min-h-screen bg-[#f8f9ff] flex flex-col'
      }
    >
      {/* Desktop Preview Frame Mode Switcher (hidden on actual smartphones) */}
      <div
        className={`hidden sm:flex items-center justify-center gap-2 ${
          viewportMode === 'phone'
            ? 'mb-3'
            : 'bg-[#eef2f9] border-b border-[#dce9ff] py-2 px-4 w-full'
        }`}
      >
        <div
          role="group"
          aria-label="화면 크기 전환"
          className="inline-flex items-center p-1 rounded-xl bg-white border border-[#cbd5e1] shadow-sm"
        >
          <button
            type="button"
            onClick={() => setViewportMode('phone')}
            aria-pressed={viewportMode === 'phone'}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              viewportMode === 'phone'
                ? 'bg-[#1d4ed8] text-white'
                : 'text-[#434655] hover:text-[#0b1c30]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>스마트폰 화면 (412px)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewportMode('desktop')}
            aria-pressed={viewportMode === 'desktop'}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              viewportMode === 'desktop'
                ? 'bg-[#1d4ed8] text-white'
                : 'text-[#434655] hover:text-[#0b1c30]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
            <span>데스크톱 와이드</span>
          </button>
        </div>
      </div>

      {/* App Shell: Constrained to 412px smartphone screen size when in phone mode */}
      <div
        id="top"
        className={`text-[#0b1c30] bg-[#f8f9ff] flex flex-col w-full ${
          viewportMode === 'phone'
            ? 'max-w-[412px] min-h-screen sm:min-h-[844px] sm:rounded-[28px] sm:border sm:border-[#cbd5e1] sm:shadow-xl overflow-x-clip'
            : 'min-h-screen'
        }`}
      >
        <Header
          activeAlertCount={enabledAlertCount}
          onOpenAlerts={() => setAlertModalOpen(true)}
          isPhoneView={isPhoneView}
        />

        <main
          className={`flex-1 w-full mx-auto space-y-4 ${
            isPhoneView ? 'px-4 py-4' : 'max-w-7xl px-4 sm:px-6 py-4 sm:py-8 sm:space-y-6'
          }`}
        >
          {/* Hero / Workspace Control Row */}
          <section
            className={`flex justify-between gap-3.5 ${
              isPhoneView ? 'flex-col' : 'flex-col lg:flex-row lg:items-end gap-4'
            }`}
          >
            <div className="space-y-1 max-w-2xl">
              <div
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-[#434655] ${
                  isPhoneView ? 'text-xs' : 'text-xs sm:text-sm'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0037b0] tabular-nums">
                  <Calendar className="w-4 h-4 text-[#1d4ed8] shrink-0" aria-hidden="true" />
                  {displayDateLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {activeSnapshot?.source === 'kpx_api' ? 'KPX 실시간 연동' : 'KPX 시장 기준'}
                </span>
                {activeSnapshot && !isPhoneView && (
                  <>
                    <span aria-hidden="true" className="hidden sm:inline">·</span>
                    <span className="tabular-nums hidden sm:inline">
                      최근 갱신 {activeSnapshot.updatedAt}
                    </span>
                  </>
                )}
              </div>
              <h1
                className={`font-bold tracking-tight text-[#0b1c30] leading-tight text-balance ${
                  isPhoneView ? 'text-[22px]' : 'text-[22px] sm:text-[32px]'
                }`}
              >
                실시간 전기 시세 및 전력 수급 대시보드
              </h1>
              <p className={`text-[#434655] ${isPhoneView ? 'text-xs' : 'text-xs sm:text-base'}`}>
                한국전력거래소(KPX) 실시간 SMP·예측수요와 2025년 전국 전력수요 실측을 한눈에 비교하세요.
              </p>
            </div>

            {/* Workspace Toolbar: Region Switcher + Date Picker + Live Controls */}
            <div
              className={`flex shrink-0 ${
                isPhoneView
                  ? 'flex-col items-stretch gap-2 w-full'
                  : 'flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto'
              }`}
            >
              <div
                role="tablist"
                aria-label="권역 선택"
                className={`grid grid-cols-3 items-center p-1 rounded-lg bg-[#eff4ff] border border-[#dce9ff] ${
                  isPhoneView ? 'w-full' : 'sm:inline-flex w-full sm:w-auto'
                }`}
              >
                {(
                  [
                    { id: 'all', label: '전국 통합' },
                    { id: 'land', label: '육지' },
                    { id: 'jeju', label: '제주' },
                  ] as { id: RegionCode; label: string }[]
                ).map((r) => {
                  const isActive = selectedRegion === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedRegion(r.id)}
                      className={`min-h-[40px] px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#0037b0] shadow-sm'
                          : 'text-[#434655] hover:text-[#0b1c30]'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              <div className={`flex items-center gap-2 ${isPhoneView ? 'w-full' : 'w-full sm:w-auto'}`}>
                <select
                  value={queryDate || activeSnapshot?.targetDateDash || ''}
                  onChange={(e) => setQueryDate(e.target.value)}
                  aria-label="날짜 선택 드롭다운"
                  className={`h-11 px-3 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-xs font-semibold text-[#0b1c30] tabular-nums min-w-0 cursor-pointer ${
                    isPhoneView ? 'flex-1' : 'flex-1 sm:min-w-[168px] sm:flex-none'
                  }`}
                >
                  {(() => {
                    const historyDates = (activeSnapshot?.series['1M'] || [])
                      .map((p) => p.label.slice(0, 10))
                      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
                      .reverse();
                    const baseDates = [
                      activeSnapshot?.targetDateDash,
                      queryDate,
                      ...historyDates,
                    ].filter((d): d is string => Boolean(d));
                    const uniqueDates = Array.from(new Set(baseDates)).sort((a, b) =>
                      b.localeCompare(a)
                    );
                    if (uniqueDates.length === 0) {
                      const todayIso = new Date().toISOString().slice(0, 10);
                      return <option value={todayIso}>{todayIso}</option>;
                    }
                    return uniqueDates.map((d, idx) => (
                      <option key={d} value={d}>
                        {idx === 0 ? `${d} (최신)` : d}
                      </option>
                    ));
                  })()}
                </select>
                {queryDate && activeSnapshot && queryDate !== activeSnapshot.targetDateDash && (
                  <button
                    type="button"
                    onClick={() => setQueryDate('')}
                    className="h-11 px-2.5 rounded-lg bg-[#eff4ff] border border-[#dce9ff] text-xs font-semibold text-[#0037b0] hover:bg-[#e5eeff] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    최신일
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsLiveStreaming((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-lg bg-white hover:bg-[#f8f9ff] border border-[#cbd5e1] text-xs font-semibold text-[#0b1c30] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isLiveStreaming ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-[#1d4ed8]" aria-hidden="true" />
                      <span>{isPhoneView ? '자동' : '자동갱신 중'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-[#434655]" aria-hidden="true" />
                      <span>{isPhoneView ? '정지' : '자동갱신 정지'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleManualRefresh}
                  aria-label="시세 즉시 새로고침"
                  className="w-11 h-11 rounded-lg bg-white hover:bg-[#f8f9ff] border border-[#cbd5e1] flex items-center justify-center text-[#0b1c30] transition-colors shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#1d4ed8]' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Dedicated Live KPX Power Supply Section */}
          <LivePowerSupplySection
            isPhoneView={isPhoneView}
            refreshTick={refreshTick}
          />

          {errorMsg && !activeSnapshot ? (
            <div className="card-level-1 rounded-2xl p-8 text-center space-y-3">
              <p className="text-base font-semibold text-[#0b1c30]">{errorMsg}</p>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="h-11 px-5 rounded-lg bg-[#1d4ed8] text-white text-sm font-semibold cursor-pointer"
              >
                다시 불러오기
              </button>
            </div>
          ) : isLoading || !activeSnapshot || !snapshots ? (
            <div className="space-y-4" aria-label="데이터 불러오는 중">
              <div className="h-24 rounded-2xl bg-[#eff4ff] animate-pulse" />
              <div
                className={`grid gap-3 ${
                  isPhoneView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3 gap-4'
                }`}
              >
                <div className="h-40 rounded-2xl bg-white border border-[#e2e8f0] animate-pulse" />
                <div className="h-40 rounded-2xl bg-white border border-[#e2e8f0] animate-pulse" />
                <div className="h-40 rounded-2xl bg-white border border-[#e2e8f0] animate-pulse" />
              </div>
              <div className="h-72 rounded-2xl bg-white border border-[#e2e8f0] animate-pulse" />
            </div>
          ) : (
            <>
              {/* Beginner Conversational Context Banner */}
              <PriceAlertBanner snapshot={activeSnapshot} isPhoneView={isPhoneView} />

              {/* Middle Left: Daily Avg SMP Card + Middle Right: 1h-24h Bar Chart */}
              <DailySmpSummarySection snapshot={activeSnapshot} isPhoneView={isPhoneView} />

              {/* Core 3 Metric Cards */}
              <MarketMetricCards snapshot={activeSnapshot} isPhoneView={isPhoneView} />

              {/* Interactive Hourly Price & Demand Curve */}
              <PriceCurveChart
                snapshot={activeSnapshot}
                timeRange={timeRange}
                onChangeTimeRange={setTimeRange}
                isPhoneView={isPhoneView}
              />

              {/* Calculator & Regional Spread / Energy Mix */}
              <MarketComparisonAndCalculator
                snapshots={snapshots}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
                isPhoneView={isPhoneView}
              />

              {/* 24-Hour Market Ledger */}
              <HourlyLedgerTable snapshot={activeSnapshot} isPhoneView={isPhoneView} />

              {/* 2025 CSV Historical National Demand Explorer */}
              <HistoricalDemand2025 defaultDate2025={default2025Date} isPhoneView={isPhoneView} />

              {/* Bottom: AI Commentary Button + Paragraph + Source Attribution */}
              <AiCommentarySection snapshot={activeSnapshot} isPhoneView={isPhoneView} />
            </>
          )}
        </main>

        <footer className="border-t border-[#e2e8f0] bg-white mt-4">
          <div
            className={`mx-auto px-4 py-5 flex flex-col items-start justify-between gap-2 text-xs text-[#747686] ${
              isPhoneView ? '' : 'max-w-7xl sm:px-6 sm:py-6 sm:flex-row sm:items-center'
            }`}
          >
            <p>
              <strong className="font-semibold text-[#0b1c30]">ClearVolt</strong> · 공공데이터포털(KPX SmpWithForecastDemand) 및 2025년 시간별 전국 전력수요 CSV 연동
            </p>
            <p>실시간 도매 시세(원/kWh) 및 예측·실측 전력수요(MW) 기준</p>
          </div>
        </footer>

        <MobileBottomNav
          activeSection={activeMobileTab}
          onSelectSection={setActiveMobileTab}
          isPhoneView={isPhoneView}
        />
      </div>

      {/* Alert Settings Modal / Bottom Sheet */}
      <AlertSettingsModal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        rules={alertRules}
        defaultRegion={selectedRegion}
        onAddRule={handleAddRule}
        onToggleRule={handleToggleRule}
        onDeleteRule={handleDeleteRule}
        isPhoneView={isPhoneView}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[#0b1c30] text-white text-xs sm:text-sm font-medium shadow-lg whitespace-nowrap ${
            isPhoneView ? 'bottom-20' : 'bottom-6'
          }`}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
