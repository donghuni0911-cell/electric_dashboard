import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, RefreshCw } from 'lucide-react';

interface PowerSupplyLiveSuccess {
  ok: true;
  endpoint: string;
  fetchedAt: string;
  targetDate: string;
  targetDateDash: string;
  kstHour: number;
  currentHour: number;
  current: {
    slfdMw: number;
    mlfdMw: number;
    jlfdMw: number;
    landSmp: number;
    jejuSmp: number;
  };
  dailyStats: {
    avgSlfdMw: number;
    maxSlfdMw: number;
    maxHour: number;
    minSlfdMw: number;
  };
  hourly: Array<{
    hour: number;
    slfdMw: number;
    mlfdMw: number;
    jlfdMw: number;
    landSmp: number;
    jejuSmp: number;
  }>;
}

interface PowerSupplyLiveError {
  ok: false;
  endpoint?: string;
  errorCode?: string;
  errorMessage: string;
  detail?: string;
}

type PowerSupplyLiveResponse = PowerSupplyLiveSuccess | PowerSupplyLiveError;

interface LivePowerSupplySectionProps {
  isPhoneView: boolean;
  refreshTick: number;
}

export function LivePowerSupplySection({
  isPhoneView,
  refreshTick,
}: LivePowerSupplySectionProps) {
  const [data, setData] = useState<PowerSupplyLiveResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadLiveSupply = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/power-supply/live');
      const rawText = await res.text();
      let parsed: PowerSupplyLiveResponse;
      try {
        parsed = JSON.parse(rawText) as PowerSupplyLiveResponse;
      } catch {
        parsed = {
          ok: false,
          endpoint: 'https://apis.data.go.kr/B552115/SmpWithForecastDemand',
          errorCode: `HTTP_${res.status}`,
          errorMessage: `서버 응답을 해석할 수 없습니다 (HTTP ${res.status}).`,
          detail: rawText.slice(0, 220),
        };
      }
      setData(parsed);
    } catch (err) {
      setData({
        ok: false,
        endpoint: 'https://apis.data.go.kr/B552115/SmpWithForecastDemand',
        errorCode: 'NETWORK_ERROR',
        errorMessage:
          err instanceof Error
            ? `네트워크 요청 실패: ${err.message}`
            : '실시간 전력 수급 API 요청 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLiveSupply(false);
  }, [loadLiveSupply]);

  useEffect(() => {
    if (refreshTick > 0) {
      loadLiveSupply(true);
    }
  }, [refreshTick, loadLiveSupply]);

  return (
    <section
      id="live-power-supply"
      aria-label="실시간 전력 수급"
      className={`card-level-1 rounded-2xl scroll-mt-16 ${isPhoneView ? 'p-4' : 'p-4 sm:p-6'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className={`font-semibold text-[#0b1c30] flex items-center gap-2 ${
              isPhoneView ? 'text-base' : 'text-base sm:text-xl'
            }`}
          >
            <Activity className="w-5 h-5 text-[#1d4ed8] shrink-0" aria-hidden="true" />
            <span>실시간 전력 수급</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#434655] mt-0.5 truncate">
            공공데이터포털 KPX SmpWithForecastDemand 실데이터 연동
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadLiveSupply(true)}
          disabled={refreshing}
          aria-label="실시간 전력 수급 새로고침"
          className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg bg-white hover:bg-[#f8f9ff] border border-[#cbd5e1] text-xs font-semibold text-[#0b1c30] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#1d4ed8]' : ''}`}
            aria-hidden="true"
          />
          <span>새로고침</span>
        </button>
      </div>

      {loading ? (
        <div className="mt-4 py-8 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] text-center text-xs text-[#434655]">
          KPX 실시간 전력 수급 데이터를 요청하는 중입니다...
        </div>
      ) : data && !data.ok ? (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] p-4 space-y-2.5"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-[#991b1b]">
                실시간 전력 수급 API 요청 실패
                {data.errorCode ? ` (${data.errorCode})` : ''}
              </p>
              <p className="text-xs sm:text-sm text-[#7f1d1d] leading-relaxed break-words">
                {data.errorMessage}
              </p>
              {data.detail && (
                <p className="text-xs text-[#991b1b]/90 bg-white/70 border border-[#fecaca] rounded-lg px-3 py-2 font-mono break-all">
                  {data.detail}
                </p>
              )}
              <p className="text-[11px] text-[#7f1d1d]/80 break-all">
                요청 주소: {data.endpoint || 'https://apis.data.go.kr/B552115/SmpWithForecastDemand'}
              </p>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => loadLiveSupply(true)}
              className="h-10 px-3.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              다시 요청
            </button>
          </div>
        </div>
      ) : data && data.ok ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#434655] pb-3 border-b border-[#f1f5f9]">
            <span className="font-semibold text-[#0037b0] tabular-nums">
              기준 일시: {data.targetDateDash} · {data.currentHour}시
            </span>
            <span className="tabular-nums text-[#747686]">
              최신 응답: {new Date(data.fetchedAt).toLocaleTimeString('ko-KR', { hour12: false })}
            </span>
          </div>

          <div
            className={`grid gap-3 ${
              isPhoneView ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
            }`}
          >
            <div className="rounded-xl bg-[#f8f9ff] border border-[#dce9ff] p-3">
              <span className="text-[11px] font-medium text-[#747686]">전국 예측수요 (SLFD)</span>
              <p className="mt-1 text-lg sm:text-xl font-bold text-[#0b1c30] tabular-nums font-mono">
                {data.current.slfdMw.toLocaleString('ko-KR')}
                <span className="text-xs font-semibold text-[#434655] ml-1">MW</span>
              </p>
              <span className="text-[11px] text-[#1d4ed8] font-semibold tabular-nums">
                {(data.current.slfdMw / 1000).toFixed(2)} GW
              </span>
            </div>

            <div className="rounded-xl bg-[#f8f9ff] border border-[#dce9ff] p-3">
              <span className="text-[11px] font-medium text-[#747686]">육지 · 제주 예측</span>
              <p className="mt-1 text-sm sm:text-base font-bold text-[#0b1c30] tabular-nums font-mono">
                {data.current.mlfdMw.toLocaleString('ko-KR')}
                <span className="text-[11px] font-normal text-[#434655] ml-1">MW</span>
              </p>
              <span className="text-[11px] text-[#434655] tabular-nums">
                제주 {data.current.jlfdMw.toLocaleString('ko-KR')} MW
              </span>
            </div>

            <div className="rounded-xl bg-[#f8f9ff] border border-[#dce9ff] p-3">
              <span className="text-[11px] font-medium text-[#747686]">실시간 SMP (육지/제주)</span>
              <p className="mt-1 text-lg sm:text-xl font-bold text-[#1d4ed8] tabular-nums font-mono">
                {data.current.landSmp.toFixed(2)}
                <span className="text-xs font-semibold text-[#434655] ml-1">원</span>
              </p>
              <span className="text-[11px] text-[#434655] tabular-nums">
                제주 {data.current.jejuSmp.toFixed(2)}원/kWh
              </span>
            </div>

            <div className="rounded-xl bg-[#f8f9ff] border border-[#dce9ff] p-3">
              <span className="text-[11px] font-medium text-[#747686]">금일 최대 예측수요</span>
              <p className="mt-1 text-lg sm:text-xl font-bold text-[#0b1c30] tabular-nums font-mono">
                {data.dailyStats.maxSlfdMw.toLocaleString('ko-KR')}
                <span className="text-xs font-semibold text-[#434655] ml-1">MW</span>
              </p>
              <span className="text-[11px] text-[#434655] tabular-nums">
                {data.dailyStats.maxHour}시 피크 · 평균 {data.dailyStats.avgSlfdMw.toLocaleString('ko-KR')} MW
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
