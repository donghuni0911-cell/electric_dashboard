import {
  EnergyMixItem,
  LiveMarketApiResponse,
  PricePoint,
  PriceStatus,
  RegionCode,
  RegionMarketSnapshot,
} from '../types/market';

export function classifyPriceStatus(smp: number, avgSmp: number): PriceStatus {
  if (avgSmp <= 0) return 'normal';
  const ratio = smp / avgSmp;
  if (ratio <= 0.94) return 'low';
  if (ratio >= 1.07) return 'peak';
  return 'normal';
}

export function getStatusMeta(status: PriceStatus): {
  label: string;
  shortLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
} {
  switch (status) {
    case 'low':
      return {
        label: '저렴 · 비수기',
        shortLabel: '저렴',
        bgClass: 'bg-[#ecfdf5]',
        textClass: 'text-[#059669]',
        borderClass: 'border-[#a7f3d0]',
        description: '전력 수요가 낮거나 발전 여력이 충분해 도매 단가가 낮게 형성되어 있습니다.',
      };
    case 'peak':
      return {
        label: '혼잡 · 피크',
        shortLabel: '피크',
        bgClass: 'bg-[#fef2f2]',
        textClass: 'text-[#dc2626]',
        borderClass: 'border-[#fecaca]',
        description: '전력 수요가 높은 시간대로 발전 단가가 상대적으로 높습니다.',
      };
    default:
      return {
        label: '보통 · 평시',
        shortLabel: '보통',
        bgClass: 'bg-[#eff6ff]',
        textClass: 'text-[#1d4ed8]',
        borderClass: 'border-[#bfdbfe]',
        description: '일일 평균과 유사한 수준으로 전력 수급이 안정적입니다.',
      };
  }
}

const SOLAR_SHARE_CURVE = [
  0.2, 0.2, 0.2, 0.2, 0.3, 1.1,
  3.8, 8.4, 14.2, 19.6, 23.8, 26.4,
  27.2, 25.9, 22.1, 16.4, 9.8, 3.2,
  0.5, 0.2, 0.2, 0.2, 0.2, 0.2,
];

const ENERGY_MIX_ALL: EnergyMixItem[] = [
  { source: '원자력', sharePct: 31.4, color: '#0037b0', note: '기저부하 안정 공급' },
  { source: 'LNG 복합', sharePct: 28.6, color: '#1d4ed8', note: 'SMP 가격 결정 주원인' },
  { source: '석탄 화력', sharePct: 24.2, color: '#64748b', note: '중간 부하 대응' },
  { source: '태양광·풍력', sharePct: 15.8, color: '#10b981', note: '낮 시간대 시세 인하 기여' },
];

const ENERGY_MIX_LAND: EnergyMixItem[] = [
  { source: '원자력', sharePct: 33.8, color: '#0037b0', note: '동해안·남해안 기저 발전' },
  { source: 'LNG 복합', sharePct: 27.9, color: '#1d4ed8', note: '피크 시간대 한계 가격 형성' },
  { source: '석탄 화력', sharePct: 25.1, color: '#64748b', note: '산업 단지 수요 대응' },
  { source: '태양광·풍력', sharePct: 13.2, color: '#10b981', note: '호남·영남 재생 발전' },
];

const ENERGY_MIX_JEJU: EnergyMixItem[] = [
  { source: '태양광·풍력', sharePct: 38.4, color: '#10b981', note: '낮 시간대 잉여 전력 발생' },
  { source: 'LNG·중유', sharePct: 36.2, color: '#1d4ed8', note: '야간·무풍 시 시세 상승' },
  { source: 'HVDC 연계선', sharePct: 25.4, color: '#0ea5e9', note: '육지-제주 양방향 송전' },
];

export function buildSnapshotsFromApi(
  payload: LiveMarketApiResponse
): Record<RegionCode, RegionMarketSnapshot> {
  const updatedAt = new Date(payload.fetchedAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const regions: RegionCode[] = ['all', 'land', 'jeju'];
  const result = {} as Record<RegionCode, RegionMarketSnapshot>;

  for (const region of regions) {
    const todayLand = payload.today.land;
    const todayJeju = payload.today.jeju;
    const yestLand = payload.yesterday.land;
    const yestJeju = payload.yesterday.jeju;

    const getHourSmp = (
      rowsLand: typeof todayLand,
      rowsJeju: typeof todayJeju,
      hour: number
    ): number => {
      const l = rowsLand.find((r) => r.hour === hour);
      const j = rowsJeju.find((r) => r.hour === hour);
      if (region === 'land') return l?.smp ?? j?.smp ?? 0;
      if (region === 'jeju') return j?.smp ?? l?.smp ?? 0;
      const lSmp = l?.smp ?? 0;
      const jSmp = j?.smp ?? lSmp;
      return Number((lSmp * 0.92 + jSmp * 0.08).toFixed(2));
    };

    const getHourDemandMw = (hour: number): number => {
      const l = todayLand.find((r) => r.hour === hour) || todayJeju.find((r) => r.hour === hour);
      if (!l) return 0;
      if (region === 'land') return Math.round(l.mlfd);
      if (region === 'jeju') return Math.round(l.jlfd);
      return Math.round(l.slfd);
    };

    const todaySmps = Array.from({ length: 24 }, (_, idx) =>
      getHourSmp(todayLand, todayJeju, idx + 1)
    ).filter((v) => v > 0);

    const todayAvgSmp =
      todaySmps.length > 0
        ? todaySmps.reduce((a, b) => a + b, 0) / todaySmps.length
        : 100;

    const yestSmps = Array.from({ length: 24 }, (_, idx) =>
      getHourSmp(yestLand, yestJeju, idx + 1)
    ).filter((v) => v > 0);

    const yesterdayAvgSmp =
      yestSmps.length > 0
        ? Number((yestSmps.reduce((a, b) => a + b, 0) / yestSmps.length).toFixed(2))
        : Number(todayAvgSmp.toFixed(2));

    const points24H: PricePoint[] = Array.from({ length: 24 }, (_, idx) => {
      const hour = idx + 1;
      const smp = getHourSmp(todayLand, todayJeju, hour);
      const yestSmp = getHourSmp(yestLand, yestJeju, hour) || yesterdayAvgSmp;
      const demandMw = getHourDemandMw(hour);
      const actual2025Mw =
        region === 'jeju'
          ? payload.csv2025SameDay
            ? Math.round(payload.csv2025SameDay.hours[idx] * 0.012)
            : null
          : payload.csv2025SameDay
          ? payload.csv2025SameDay.hours[idx]
          : null;

      const solarShare = Number(
        Math.min(48, SOLAR_SHARE_CURVE[idx] * (region === 'jeju' ? 1.55 : 1)).toFixed(1)
      );

      return {
        id: `${region}-24h-${hour}`,
        hour,
        label: `${String(hour).padStart(2, '0')}시 (${String(hour - 1).padStart(2, '0')}:00~${String(hour).padStart(2, '0')}:00)`,
        shortLabel: `${hour}시`,
        smp,
        yesterdaySmp: yestSmp,
        demandMw,
        demandGw: Number((demandMw / 1000).toFixed(2)),
        actual2025Mw,
        solarSharePct: solarShare,
        status: classifyPriceStatus(smp, todayAvgSmp),
      };
    });

    // Build 7D and 1M from KPX history
    const history1M = payload.history;
    const historyAvg =
      history1M.length > 0
        ? history1M.reduce(
            (s, d) =>
              s +
              (region === 'land'
                ? d.landAvgSmp
                : region === 'jeju'
                ? d.jejuAvgSmp
                : d.allAvgSmp),
            0
          ) / history1M.length
        : todayAvgSmp;

    const buildHistoryPoints = (sliceCount: number, prefix: string): PricePoint[] => {
      const subset = history1M.slice(-sliceCount);
      return subset.map((d, idx) => {
        const smp =
          region === 'land'
            ? d.landAvgSmp
            : region === 'jeju'
            ? d.jejuAvgSmp
            : d.allAvgSmp;
        const prev = subset[Math.max(0, idx - 1)];
        const prevSmp =
          region === 'land'
            ? prev.landAvgSmp
            : region === 'jeju'
            ? prev.jejuAvgSmp
            : prev.allAvgSmp;
        const demandMw =
          region === 'land'
            ? d.avgMlfdMw
            : region === 'jeju'
            ? d.avgJlfdMw
            : d.avgSlfdMw;
        const mmddSlash = `${d.dateDash.slice(5, 7)}/${d.dateDash.slice(8, 10)}`;
        return {
          id: `${region}-${prefix}-${d.date}`,
          label: `${d.dateDash} 일평균`,
          shortLabel: mmddSlash,
          smp,
          yesterdaySmp: prevSmp,
          demandMw,
          demandGw: Number((demandMw / 1000).toFixed(2)),
          actual2025Mw: null,
          solarSharePct: region === 'jeju' ? 28.4 : 15.2,
          status: classifyPriceStatus(smp, historyAvg),
        };
      });
    };

    const currentHour = Math.min(24, Math.max(1, payload.kstHour));
    const currentPoint = points24H[currentHour - 1] || points24H[0];
    const supplyCapacityGw = region === 'jeju' ? 1.45 : region === 'land' ? 88.2 : 89.65;
    const reserveMarginPct =
      currentPoint.demandGw > 0
        ? Number(
            (((supplyCapacityGw - currentPoint.demandGw) / currentPoint.demandGw) * 100).toFixed(1)
          )
        : 24.0;

    const regionLabel =
      region === 'all' ? '전국 통합' : region === 'land' ? '육지' : '제주';

    result[region] = {
      region,
      regionLabel,
      targetDateDash: payload.targetDateDash,
      yesterdayDateDash: payload.yesterdayDateDash,
      currentHour,
      currentSmp: currentPoint.smp,
      yesterdayAvgSmp,
      dailyMinSmp: todaySmps.length > 0 ? Math.min(...todaySmps) : currentPoint.smp,
      dailyMaxSmp: todaySmps.length > 0 ? Math.max(...todaySmps) : currentPoint.smp,
      recSpotPrice: region === 'jeju' ? 75200 : 74800,
      recDeltaPct: region === 'jeju' ? 2.1 : 1.4,
      demandMw: currentPoint.demandMw,
      demandGw: currentPoint.demandGw,
      actual2025CurrentMw: currentPoint.actual2025Mw,
      actual2025AvgMw: payload.csv2025SameDay
        ? region === 'jeju'
          ? Math.round(payload.csv2025SameDay.avgMw * 0.012)
          : payload.csv2025SameDay.avgMw
        : null,
      csv2025Date: payload.csv2025SameDay?.date ?? null,
      supplyCapacityGw,
      reserveMarginPct: Math.max(5, reserveMarginPct),
      solarSurplusPct: currentPoint.solarSharePct,
      status: currentPoint.status,
      updatedAt,
      source: payload.source,
      series: {
        '24H': points24H,
        '7D': buildHistoryPoints(7, '7d'),
        '1M': buildHistoryPoints(30, '1m'),
      },
      energyMix:
        region === 'all'
          ? ENERGY_MIX_ALL
          : region === 'land'
          ? ENERGY_MIX_LAND
          : ENERGY_MIX_JEJU,
    };
  }

  return result;
}

export function getBeginnerInsightMessage(snapshot: RegionMarketSnapshot): {
  headline: string;
  detail: string;
  tip: string;
  diffPct: number;
  isCheaper: boolean;
} {
  const diffPct = Math.round(
    ((snapshot.currentSmp - snapshot.yesterdayAvgSmp) / Math.max(1, snapshot.yesterdayAvgSmp)) *
      100
  );
  const absPct = Math.abs(diffPct);

  if (diffPct <= -5) {
    return {
      headline: `현재 ${snapshot.currentHour}시 전력 도매 시세는 어제 평균보다 ${absPct}% 저렴합니다`,
      detail: `${snapshot.regionLabel} 기준 SMP ${snapshot.currentSmp.toFixed(1)}원/kWh, 예측 수요 ${snapshot.demandMw.toLocaleString('ko-KR')}MW로 안정적입니다.`,
      tip: '전기차 완속 충전, 세탁·건조기 등 고전력 가전을 지금 가동하면 유리합니다.',
      diffPct,
      isCheaper: true,
    };
  }

  if (diffPct >= 5) {
    return {
      headline: `현재 ${snapshot.currentHour}시 전력 시세는 어제 평균보다 ${absPct}% 높게 형성되어 있습니다`,
      detail: `${snapshot.regionLabel} 예측 수요가 ${snapshot.demandMw.toLocaleString('ko-KR')}MW까지 올라 도매 단가(${snapshot.currentSmp.toFixed(1)}원/kWh)가 강세입니다.`,
      tip: '급하지 않은 대용량 전력 사용은 심야 또는 낮 경부하 시간대로 미루는 것이 좋습니다.',
      diffPct,
      isCheaper: false,
    };
  }

  return {
    headline: `현재 ${snapshot.currentHour}시 ${snapshot.regionLabel} 전력 시세는 어제 평균과 유사한 안정권입니다`,
    detail: `예측 전력수요 ${snapshot.demandMw.toLocaleString('ko-KR')}MW, 공급예비율 ${snapshot.reserveMarginPct.toFixed(1)}%로 전력 수급이 원활합니다.`,
    tip: '전년 동기(2025년 실측) 수요 곡선과 오늘 시세를 아래 그래프에서 함께 비교해 보세요.',
    diffPct,
    isCheaper: diffPct <= 0,
  };
}
