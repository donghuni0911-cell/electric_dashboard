export type RegionCode = 'all' | 'land' | 'jeju';

export type TimeRange = '24H' | '7D' | '1M';

export type ChartMetric = 'smp' | 'demand';

export type PriceStatus = 'low' | 'normal' | 'peak';

export interface PricePoint {
  id: string;
  hour?: number;
  label: string;
  shortLabel: string;
  smp: number;
  yesterdaySmp: number;
  demandMw: number;
  demandGw: number;
  actual2025Mw: number | null;
  solarSharePct: number;
  status: PriceStatus;
}

export interface EnergyMixItem {
  source: string;
  sharePct: number;
  color: string;
  note: string;
}

export interface RegionMarketSnapshot {
  region: RegionCode;
  regionLabel: string;
  targetDateDash: string;
  yesterdayDateDash: string;
  currentHour: number;
  currentSmp: number;
  yesterdayAvgSmp: number;
  dailyMinSmp: number;
  dailyMaxSmp: number;
  recSpotPrice: number;
  recDeltaPct: number;
  demandMw: number;
  demandGw: number;
  actual2025CurrentMw: number | null;
  actual2025AvgMw: number | null;
  csv2025Date: string | null;
  supplyCapacityGw: number;
  reserveMarginPct: number;
  solarSurplusPct: number;
  status: PriceStatus;
  updatedAt: string;
  source: 'kpx_api' | 'csv_fallback';
  series: Record<TimeRange, PricePoint[]>;
  energyMix: EnergyMixItem[];
}

export interface AlertRule {
  id: string;
  region: RegionCode;
  condition: 'below' | 'above';
  thresholdWon: number;
  notifyOnSolarSurplus: boolean;
  notifyOnPeakSurge: boolean;
  enabled: boolean;
  createdAt: string;
}

export type CalculatorMode = 'consumer' | 'solar';

export interface KpxApiHourRow {
  hour: number;
  smp: number;
  mlfd: number;
  slfd: number;
  jlfd: number;
}

export interface KpxApiHistoryDay {
  date: string;
  dateDash: string;
  landAvgSmp: number;
  jejuAvgSmp: number;
  allAvgSmp: number;
  avgSlfdMw: number;
  avgMlfdMw: number;
  avgJlfdMw: number;
}

export interface CsvDayRecord {
  date: string;
  mmdd: string;
  month: number;
  hours: number[];
  avgMw: number;
  maxMw: number;
  maxHour: number;
  minMw: number;
  minHour: number;
}

export interface LiveMarketApiResponse {
  source: 'kpx_api' | 'csv_fallback';
  kstHour: number;
  targetDate: string;
  targetDateDash: string;
  yesterdayDateDash: string;
  fetchedAt: string;
  today: {
    land: KpxApiHourRow[];
    jeju: KpxApiHourRow[];
  };
  yesterday: {
    land: KpxApiHourRow[];
    jeju: KpxApiHourRow[];
  };
  history: KpxApiHistoryDay[];
  csv2025SameDay: CsvDayRecord | null;
}

export interface MonthlyAverage2025 {
  month: number;
  label: string;
  avgMw: number;
  peakMw: number;
  minMw: number;
  hourlyAvg: number[];
}

export interface AnnualStats2025 {
  totalDays: number;
  avgMw: number;
  peak: { date: string; hour: number; mw: number };
  low: { date: string; hour: number; mw: number };
}

export interface Demand2025ApiResponse {
  annualStats: AnnualStats2025;
  monthlyAverages: MonthlyAverage2025[];
  selectedDay: CsvDayRecord | null;
  dateRange: { min: string; max: string };
}
