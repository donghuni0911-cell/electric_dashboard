import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { RegionMarketSnapshot } from '../types/market';

interface AiCommentarySectionProps {
  snapshot: RegionMarketSnapshot;
  isPhoneView: boolean;
}

export function AiCommentarySection({ snapshot, isPhoneView }: AiCommentarySectionProps) {
  const [commentary, setCommentary] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Reset commentary when user switches date or region so it stays accurate to selection
  useEffect(() => {
    setCommentary(null);
    setGeneratedAt(null);
    setErrorMsg(null);
  }, [snapshot.targetDateDash, snapshot.region]);

  const hours = snapshot.series['24H'];
  const dailyAvgSmp =
    hours.length > 0
      ? Number((hours.reduce((sum, h) => sum + h.smp, 0) / hours.length).toFixed(2))
      : snapshot.currentSmp;

  let minPoint = hours[0];
  let maxPoint = hours[0];
  for (const h of hours) {
    if (h.smp < minPoint.smp) minPoint = h;
    if (h.smp > maxPoint.smp) maxPoint = h;
  }

  const handleRequestCommentary = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const hourlySummary = hours
        .filter((_, idx) => idx % 3 === 0 || idx === hours.length - 1)
        .map((h) => `${h.shortLabel}:${h.smp.toFixed(1)}원`)
        .join(', ');

      const res = await fetch('/api/ai/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDateDash: snapshot.targetDateDash,
          regionLabel: snapshot.regionLabel,
          dailyAvgSmp,
          yesterdayAvgSmp: snapshot.yesterdayAvgSmp,
          dailyMinSmp: minPoint?.smp ?? snapshot.dailyMinSmp,
          minHour: minPoint?.hour ?? 1,
          dailyMaxSmp: maxPoint?.smp ?? snapshot.dailyMaxSmp,
          maxHour: maxPoint?.hour ?? 18,
          currentHour: snapshot.currentHour,
          currentSmp: snapshot.currentSmp,
          demandMw: snapshot.demandMw,
          actual2025AvgMw: snapshot.actual2025AvgMw,
          hourlySummary,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        commentary?: string;
        generatedAt?: string;
        errorMessage?: string;
      };

      if (!res.ok || !data.ok || !data.commentary) {
        setErrorMsg(data.errorMessage || 'AI 해설을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setCommentary(data.commentary);
        setGeneratedAt(data.generatedAt || null);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `네트워크 오류로 AI 해설 요청에 실패했습니다: ${err.message}`
          : 'AI 해설 요청 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="ai-commentary"
      aria-label="AI 전력 시세 해설"
      className={`card-level-1 rounded-2xl bg-white space-y-4 ${
        isPhoneView ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      <div
        className={`flex justify-between gap-3 ${
          isPhoneView ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'
        }`}
      >
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#0b1c30] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1d4ed8] shrink-0" aria-hidden="true" />
            <span>오늘의 전력 시세 AI 해설</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#434655] mt-0.5">
            {snapshot.targetDateDash} ({snapshot.regionLabel}) 1시~24시 SMP와 수급 흐름을 요약합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRequestCommentary}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-[0.99] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
            isPhoneView ? 'w-full' : ''
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>AI 해설 생성 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>AI 해설</span>
            </>
          )}
        </button>
      </div>

      {/* Commentary Paragraph Area */}
      {errorMsg ? (
        <div
          role="alert"
          className="rounded-xl bg-[#fef2f2] border border-[#fecaca] p-4 flex items-start gap-2.5 text-xs sm:text-sm text-[#991b1b]"
        >
          <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      ) : commentary ? (
        <div className="rounded-xl bg-[#eff4ff] border border-[#dce9ff] p-4 space-y-2">
          <p className="text-sm text-[#0b1c30] leading-relaxed whitespace-pre-line">
            {commentary}
          </p>
          {generatedAt && (
            <p className="text-[11px] text-[#434655] tabular-nums">
              해설 생성 시각: {new Date(generatedAt).toLocaleTimeString('ko-KR', { hour12: false })}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] p-4 text-xs sm:text-sm text-[#434655] leading-relaxed">
          &lsquo;AI 해설&rsquo; 버튼을 누르면 {snapshot.targetDateDash} ({snapshot.regionLabel}) 하루 평균 SMP(
          <strong className="font-semibold text-[#1d4ed8] tabular-nums">
            {dailyAvgSmp.toFixed(2)}원/kWh
          </strong>
          )와 1시~24시 시간대별 등락 요인을 한눈에 알기 쉬운 문단으로 정리해 드립니다.
        </div>
      )}

      {/* Source Attribution */}
      <div className="pt-3 border-t border-[#f1f5f9] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] sm:text-xs text-[#747686]">
        <span>
          <strong className="font-semibold text-[#434655]">출처:</strong> 한국전력거래소(KPX) · 공공데이터포털 계통한계가격 및 하루전 예측수요 API (SmpWithForecastDemand)
        </span>
        <span>2025년 시간별 전국 전력수요 실측 데이터 병행 표기</span>
      </div>
    </section>
  );
}
