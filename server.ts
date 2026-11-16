import 'dotenv/config';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const KPX_ENDPOINT =
  'https://apis.data.go.kr/B552115/SmpWithForecastDemand/getSmpWithForecastDemand';
const CSV_PATH = path.resolve(
  __dirname,
  'public/assets/aistudio/_____________________20251231_____53c15985.txt'
);

interface CsvDayRecord {
  date: string; // YYYY-MM-DD
  mmdd: string; // MM-DD
  month: number;
  hours: number[]; // 24 hourly MW values
  avgMw: number;
  maxMw: number;
  maxHour: number;
  minMw: number;
  minHour: number;
}

interface MonthlyAverage2025 {
  month: number;
  label: string;
  avgMw: number;
  peakMw: number;
  minMw: number;
  hourlyAvg: number[];
}

interface AnnualStats2025 {
  totalDays: number;
  avgMw: number;
  peak: { date: string; hour: number; mw: number };
  low: { date: string; hour: number; mw: number };
}

interface KpxRawItem {
  date: string;
  hour: string;
  areaName: string;
  smp: number;
  slfd: number;
  mlfd: number;
  jlfd: number;
}

function loadCsv2025Data() {
  const dayMap = new Map<string, CsvDayRecord>();
  const mmddMap = new Map<string, CsvDayRecord>();
  const days: CsvDayRecord[] = [];

  if (!fs.existsSync(CSV_PATH)) {
    console.warn('[ClearVolt] 2025 CSV file not found at:', CSV_PATH);
    return {
      days,
      dayMap,
      mmddMap,
      monthlyAverages: [] as MonthlyAverage2025[],
      annualStats: {
        totalDays: 0,
        avgMw: 0,
        peak: { date: '2025-07-08', hour: 17, mw: 0 },
        low: { date: '2025-05-04', hour: 12, mw: 0 },
      } as AnnualStats2025,
    };
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  let totalSum = 0;
  let totalPoints = 0;
  let globalPeak = { date: '2025-01-01', hour: 1, mw: -Infinity };
  let globalLow = { date: '2025-01-01', hour: 1, mw: Infinity };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',')) continue;
    const cols = line.split(',');
    const dateStr = cols[0]?.trim();
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || cols.length < 25) {
      continue;
    }

    const hours: number[] = [];
    let daySum = 0;
    let maxMw = -Infinity;
    let maxHour = 1;
    let minMw = Infinity;
    let minHour = 1;

    for (let h = 1; h <= 24; h++) {
      const val = Number(cols[h]);
      const safeVal = Number.isFinite(val) ? val : 0;
      hours.push(safeVal);
      daySum += safeVal;
      totalSum += safeVal;
      totalPoints += 1;

      if (safeVal > maxMw) {
        maxMw = safeVal;
        maxHour = h;
      }
      if (safeVal < minMw) {
        minMw = safeVal;
        minHour = h;
      }
      if (safeVal > globalPeak.mw) {
        globalPeak = { date: dateStr, hour: h, mw: safeVal };
      }
      if (safeVal < globalLow.mw) {
        globalLow = { date: dateStr, hour: h, mw: safeVal };
      }
    }

    const month = Number(dateStr.slice(5, 7));
    const mmdd = dateStr.slice(5, 10);
    const record: CsvDayRecord = {
      date: dateStr,
      mmdd,
      month,
      hours,
      avgMw: Math.round(daySum / 24),
      maxMw,
      maxHour,
      minMw,
      minHour,
    };

    days.push(record);
    dayMap.set(dateStr, record);
    mmddMap.set(mmdd, record);
  }

  const monthlyAverages: MonthlyAverage2025[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthDays = days.filter((d) => d.month === m);
    if (monthDays.length === 0) continue;
    const hourlySums = new Array<number>(24).fill(0);
    let mPeak = -Infinity;
    let mMin = Infinity;
    let mSum = 0;

    for (const d of monthDays) {
      mSum += d.avgMw;
      if (d.maxMw > mPeak) mPeak = d.maxMw;
      if (d.minMw < mMin) mMin = d.minMw;
      for (let h = 0; h < 24; h++) {
        hourlySums[h] += d.hours[h];
      }
    }

    monthlyAverages.push({
      month: m,
      label: `${m}월`,
      avgMw: Math.round(mSum / monthDays.length),
      peakMw: mPeak,
      minMw: mMin,
      hourlyAvg: hourlySums.map((s) => Math.round(s / monthDays.length)),
    });
  }

  return {
    days,
    dayMap,
    mmddMap,
    monthlyAverages,
    annualStats: {
      totalDays: days.length,
      avgMw: totalPoints > 0 ? Math.round(totalSum / totalPoints) : 0,
      peak: globalPeak,
      low: globalLow,
    },
  };
}

const csv2025 = loadCsv2025Data();

// 5-minute server-side cache for KPX OpenAPI calls
interface CacheEntry {
  fetchedAt: number;
  data: unknown;
}
const kpxCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getKstHourAndDate() {
  const now = new Date();
  const kstDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const kstHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    hour12: false,
  });
  const dateDash = kstDateFormatter.format(now); // YYYY-MM-DD
  const rawHour = Number(kstHourFormatter.format(now)); // 0..23 or 24
  const kstHour = rawHour === 0 || rawHour === 24 ? 24 : rawHour; // KPX uses 1..24
  return {
    dateCompact: dateDash.replaceAll('-', ''),
    dateDash,
    kstHour,
  };
}

function formatCompactToDash(compact: string): string {
  if (compact.length !== 8) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function shiftDateCompact(compact: string, deltaDays: number): string {
  const y = Number(compact.slice(0, 4));
  const m = Number(compact.slice(4, 6)) - 1;
  const d = Number(compact.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

async function fetchKpxItems(numOfRows: number, dateCompact?: string): Promise<KpxRawItem[]> {
  const apiKey = process.env.KPX_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('KPX_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: '1',
    numOfRows: String(numOfRows),
    dataType: 'json',
  });
  if (dateCompact) {
    params.set('date', dateCompact);
  }

  const url = `${KPX_ENDPOINT}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`KPX HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      response?: {
        header?: { resultCode?: string; resultMsg?: string };
        body?: { items?: { item?: KpxRawItem[] | KpxRawItem } };
      };
    };

    const code = json?.response?.header?.resultCode;
    if (code && code !== '00') {
      throw new Error(json?.response?.header?.resultMsg || `KPX error ${code}`);
    }

    const rawItem = json?.response?.body?.items?.item;
    if (!rawItem) return [];
    return Array.isArray(rawItem) ? rawItem : [rawItem];
  } finally {
    clearTimeout(timer);
  }
}

interface BuiltDaySeries {
  date: string; // YYYYMMDD
  dateDash: string; // YYYY-MM-DD
  land: Array<{ hour: number; smp: number; mlfd: number; slfd: number; jlfd: number }>;
  jeju: Array<{ hour: number; smp: number; mlfd: number; slfd: number; jlfd: number }>;
}

function groupByDate(items: KpxRawItem[]): BuiltDaySeries[] {
  const map = new Map<string, { land: Map<number, KpxRawItem>; jeju: Map<number, KpxRawItem> }>();

  for (const item of items) {
    const d = String(item.date || '').trim();
    const h = Number(item.hour);
    if (!d || !Number.isFinite(h) || h < 1 || h > 24) continue;
    if (!map.has(d)) {
      map.set(d, { land: new Map(), jeju: new Map() });
    }
    const bucket = map.get(d)!;
    if (item.areaName === '제주') {
      bucket.jeju.set(h, item);
    } else {
      bucket.land.set(h, item);
    }
  }

  const sortedDates = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return sortedDates.map((d) => {
    const bucket = map.get(d)!;
    const land: BuiltDaySeries['land'] = [];
    const jeju: BuiltDaySeries['jeju'] = [];

    for (let h = 1; h <= 24; h++) {
      const l = bucket.land.get(h);
      const j = bucket.jeju.get(h);
      if (l) {
        land.push({
          hour: h,
          smp: Number(l.smp),
          mlfd: Number(l.mlfd),
          slfd: Number(l.slfd),
          jlfd: Number(l.jlfd),
        });
      }
      if (j) {
        jeju.push({
          hour: h,
          smp: Number(j.smp),
          mlfd: Number(j.mlfd),
          slfd: Number(j.slfd),
          jlfd: Number(j.jlfd),
        });
      }
    }

    return {
      date: d,
      dateDash: formatCompactToDash(d),
      land,
      jeju,
    };
  });
}

async function buildLiveMarketPayload(requestedDateCompact?: string) {
  const cacheKey = requestedDateCompact || 'latest';
  const cached = kpxCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const { kstHour, dateCompact: todayCompact } = getKstHourAndDate();
  const hasApiKey = Boolean(process.env.KPX_API_KEY?.trim());

  let days: BuiltDaySeries[] = [];
  let source: 'kpx_api' | 'csv_fallback' = 'kpx_api';

  if (hasApiKey) {
    try {
      if (requestedDateCompact) {
        const prevCompact = shiftDateCompact(requestedDateCompact, -1);
        const [targetItems, prevItems, recentItems] = await Promise.all([
          fetchKpxItems(48, requestedDateCompact),
          fetchKpxItems(48, prevCompact),
          fetchKpxItems(1440),
        ]);
        const merged = [...targetItems, ...prevItems, ...recentItems];
        days = groupByDate(merged);
        days.sort((a, b) => {
          if (a.date === requestedDateCompact) return -1;
          if (b.date === requestedDateCompact) return 1;
          return b.date.localeCompare(a.date);
        });
      } else {
        const items = await fetchKpxItems(1440);
        days = groupByDate(items);
      }

      if (days.length === 0) {
        throw new Error('Empty items from KPX API');
      }
    } catch (err) {
      console.warn('[ClearVolt] KPX API unavailable, using CSV-backed fallback:', err instanceof Error ? err.message : err);
      source = 'csv_fallback';
      days = [];
    }
  } else {
    source = 'csv_fallback';
  }

  if (days.length === 0) {
    const fallbackDateCompact = requestedDateCompact || todayCompact;
    const makeDayFromCsv = (targetCompact: string): BuiltDaySeries => {
      const mmdd = `${targetCompact.slice(4, 6)}-${targetCompact.slice(6, 8)}`;
      const csvDay = csv2025.mmddMap.get(mmdd) || csv2025.days[0];
      const baseHours = csvDay?.hours || new Array(24).fill(60000);
      const land = baseHours.map((mw, idx) => ({
        hour: idx + 1,
        smp: Number((92 + (mw - 48000) / 1400).toFixed(2)),
        slfd: mw,
        mlfd: Math.round(mw * 0.988),
        jlfd: Math.round(mw * 0.012),
      }));
      const jeju = land.map((row) => ({
        ...row,
        smp: Number((row.smp * (row.hour >= 11 && row.hour <= 15 ? 0.92 : 1.04)).toFixed(2)),
      }));
      return {
        date: targetCompact,
        dateDash: formatCompactToDash(targetCompact),
        land,
        jeju,
      };
    };

    days = Array.from({ length: 30 }, (_, offset) =>
      makeDayFromCsv(shiftDateCompact(fallbackDateCompact, -offset))
    );
  }

  const primaryDay = days[0];
  const yesterdayDay =
    days.find((d) => d.date === shiftDateCompact(primaryDay.date, -1)) || days[1] || primaryDay;

  const targetMmdd = primaryDay.dateDash.slice(5, 10);
  const csvSameDay = csv2025.mmddMap.get(targetMmdd) || csv2025.days[0] || null;

  // Build 30-day & 7-day history sorted chronologically ascending
  const historyChronological = days
    .filter((d) => d.land.length > 0)
    .slice(0, 30)
    .reverse()
    .map((d) => {
      const landAvgSmp =
        d.land.reduce((s, r) => s + r.smp, 0) / Math.max(1, d.land.length);
      const jejuAvgSmp =
        d.jeju.length > 0
          ? d.jeju.reduce((s, r) => s + r.smp, 0) / d.jeju.length
          : landAvgSmp;
      const avgSlfd =
        d.land.reduce((s, r) => s + r.slfd, 0) / Math.max(1, d.land.length);
      const avgMlfd =
        d.land.reduce((s, r) => s + r.mlfd, 0) / Math.max(1, d.land.length);
      const avgJlfd =
        d.land.reduce((s, r) => s + r.jlfd, 0) / Math.max(1, d.land.length);
      return {
        date: d.date,
        dateDash: d.dateDash,
        landAvgSmp: Number(landAvgSmp.toFixed(2)),
        jejuAvgSmp: Number(jejuAvgSmp.toFixed(2)),
        allAvgSmp: Number((landAvgSmp * 0.92 + jejuAvgSmp * 0.08).toFixed(2)),
        avgSlfdMw: Math.round(avgSlfd),
        avgMlfdMw: Math.round(avgMlfd),
        avgJlfdMw: Math.round(avgJlfd),
      };
    });

  const payload = {
    source,
    kstHour,
    targetDate: primaryDay.date,
    targetDateDash: primaryDay.dateDash,
    yesterdayDateDash: yesterdayDay.dateDash,
    fetchedAt: new Date().toISOString(),
    today: {
      land: primaryDay.land,
      jeju: primaryDay.jeju,
    },
    yesterday: {
      land: yesterdayDay.land,
      jeju: yesterdayDay.jeju,
    },
    history: historyChronological,
    csv2025SameDay: csvSameDay,
  };

  kpxCache.set(cacheKey, { fetchedAt: Date.now(), data: payload });
  return payload;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, csvDaysLoaded: csv2025.days.length });
  });

  app.get('/api/power-supply/live', async (_req, res) => {
    const endpoint = KPX_ENDPOINT;
    let apiKey = process.env.KPX_API_KEY?.trim() || '';

    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
        if (typeof parsed.KPX_API_KEY === 'string') {
          apiKey = parsed.KPX_API_KEY.trim();
        }
      } catch (readErr) {
        console.warn('[ClearVolt] Failed to parse .env:', readErr);
      }
    }

    if (!apiKey) {
      res.status(401).json({
        ok: false,
        endpoint,
        errorCode: 'MISSING_API_KEY',
        errorMessage: '.env 파일에 인증키(KPX_API_KEY)가 입력되지 않았습니다.',
        detail: '프로젝트 루트의 .env 파일에 KPX_API_KEY="인증키"를 입력한 뒤 다시 요청해 주세요.',
      });
      return;
    }

    const encodedKey = apiKey.includes('%') ? apiKey : encodeURIComponent(apiKey);
    const url = `${endpoint}?serviceKey=${encodedKey}&pageNo=1&numOfRows=96&dataType=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    try {
      const apiRes = await fetch(url, { signal: controller.signal });
      const rawText = await apiRes.text();

      if (!apiRes.ok) {
        res.status(502).json({
          ok: false,
          endpoint,
          errorCode: `HTTP_${apiRes.status}`,
          errorMessage: `KPX API HTTP 오류가 발생했습니다 (HTTP ${apiRes.status}).`,
          detail: rawText.slice(0, 260) || apiRes.statusText,
        });
        return;
      }

      const trimmed = rawText.trim();
      if (trimmed.startsWith('<')) {
        const reasonCode = trimmed.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/)?.[1]
          || trimmed.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1]
          || 'XML_ERROR';
        const authMsg = trimmed.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/)?.[1]
          || trimmed.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1]
          || trimmed.match(/<errMsg>([^<]+)<\/errMsg>/)?.[1]
          || '공공데이터포털 인증 또는 요청 오류가 반환되었습니다.';
        res.status(502).json({
          ok: false,
          endpoint,
          errorCode: reasonCode,
          errorMessage: `KPX API 오류 [${reasonCode}]: ${authMsg}`,
          detail: trimmed.slice(0, 260),
        });
        return;
      }

      const json = JSON.parse(trimmed) as {
        response?: {
          header?: { resultCode?: string; resultMsg?: string };
          body?: { items?: { item?: KpxRawItem[] | KpxRawItem } };
        };
      };

      const resultCode = json?.response?.header?.resultCode;
      const resultMsg = json?.response?.header?.resultMsg;
      if (resultCode && resultCode !== '00') {
        res.status(502).json({
          ok: false,
          endpoint,
          errorCode: resultCode,
          errorMessage: `KPX API 오류 [${resultCode}]: ${resultMsg || '알 수 없는 오류'}`,
          detail: JSON.stringify(json?.response?.header || {}),
        });
        return;
      }

      const rawItem = json?.response?.body?.items?.item;
      const items = rawItem ? (Array.isArray(rawItem) ? rawItem : [rawItem]) : [];
      const days = groupByDate(items);

      if (days.length === 0 || days[0].land.length === 0) {
        res.status(502).json({
          ok: false,
          endpoint,
          errorCode: 'EMPTY_DATA',
          errorMessage: 'KPX API 응답에 유효한 전력 수급 데이터가 없습니다.',
          detail: '잠시 후 다시 시도해 주세요.',
        });
        return;
      }

      const { kstHour } = getKstHourAndDate();
      const latest = days[0];
      const currentHour = Math.min(24, Math.max(1, kstHour));
      const currentLand = latest.land.find((r) => r.hour === currentHour) || latest.land[latest.land.length - 1];
      const currentJeju = latest.jeju.find((r) => r.hour === currentHour) || latest.jeju[latest.jeju.length - 1];

      const slfdValues = latest.land.map((r) => r.slfd);
      const maxSlfd = Math.max(...slfdValues);
      const minSlfd = Math.min(...slfdValues);
      const avgSlfd = Math.round(slfdValues.reduce((s, v) => s + v, 0) / slfdValues.length);
      const maxRow = latest.land.find((r) => r.slfd === maxSlfd) || currentLand;

      res.json({
        ok: true,
        endpoint,
        fetchedAt: new Date().toISOString(),
        targetDate: latest.date,
        targetDateDash: latest.dateDash,
        kstHour,
        currentHour: currentLand.hour,
        current: {
          slfdMw: Math.round(currentLand.slfd),
          mlfdMw: Math.round(currentLand.mlfd),
          jlfdMw: Math.round(currentLand.jlfd),
          landSmp: Number(currentLand.smp.toFixed(2)),
          jejuSmp: Number((currentJeju?.smp ?? currentLand.smp).toFixed(2)),
        },
        dailyStats: {
          avgSlfdMw: avgSlfd,
          maxSlfdMw: Math.round(maxSlfd),
          maxHour: maxRow.hour,
          minSlfdMw: Math.round(minSlfd),
        },
        hourly: latest.land.map((row) => {
          const j = latest.jeju.find((jr) => jr.hour === row.hour);
          return {
            hour: row.hour,
            slfdMw: Math.round(row.slfd),
            mlfdMw: Math.round(row.mlfd),
            jlfdMw: Math.round(row.jlfd),
            landSmp: Number(row.smp.toFixed(2)),
            jejuSmp: Number((j?.smp ?? row.smp).toFixed(2)),
          };
        }),
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'KPX API 요청 시간이 초과되었습니다 (9초).'
            : err.message
          : '알 수 없는 네트워크 오류';
      const safeDetail = String(err).replaceAll(apiKey, '***');
      res.status(502).json({
        ok: false,
        endpoint,
        errorCode: 'REQUEST_FAILED',
        errorMessage: `KPX API 요청에 실패했습니다: ${msg.replaceAll(apiKey, '***')}`,
        detail: safeDetail,
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.get('/api/market/live', async (req, res) => {
    try {
      const rawDate = typeof req.query.date === 'string' ? req.query.date.trim() : '';
      const compactDate = rawDate ? rawDate.replaceAll('-', '') : undefined;
      if (compactDate && !/^\d{8}$/.test(compactDate)) {
        res.status(400).json({ error: 'Invalid date format. Use YYYYMMDD or YYYY-MM-DD.' });
        return;
      }
      const payload = await buildLiveMarketPayload(compactDate);
      res.json(payload);
    } catch (err) {
      console.error('[ClearVolt] /api/market/live error:', err);
      res.status(500).json({ error: 'Failed to load live market data' });
    }
  });

  app.get('/api/demand-2025', (req, res) => {
    const rawDate = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    let selectedDay = rawDate ? csv2025.dayMap.get(rawDate) : undefined;
    if (!selectedDay) {
      const { dateDash } = getKstHourAndDate();
      const mmdd = dateDash.slice(5, 10);
      selectedDay = csv2025.mmddMap.get(mmdd) || csv2025.days[0];
    }

    res.json({
      annualStats: csv2025.annualStats,
      monthlyAverages: csv2025.monthlyAverages,
      selectedDay: selectedDay || null,
      dateRange: {
        min: csv2025.days[0]?.date || '2025-01-01',
        max: csv2025.days[csv2025.days.length - 1]?.date || '2025-12-31',
      },
    });
  });

  app.post('/api/ai/commentary', async (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiKey) {
      res.status(503).json({
        ok: false,
        errorMessage: 'GEMINI_API_KEY가 설정되어 있지 않아 AI 해설을 생성할 수 없습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
      });
      return;
    }

    try {
      const body = (req.body || {}) as {
        targetDateDash?: string;
        regionLabel?: string;
        dailyAvgSmp?: number;
        yesterdayAvgSmp?: number;
        dailyMinSmp?: number;
        minHour?: number;
        dailyMaxSmp?: number;
        maxHour?: number;
        currentHour?: number;
        currentSmp?: number;
        demandMw?: number;
        actual2025AvgMw?: number | null;
        hourlySummary?: string;
      };

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = [
        `다음은 대한민국 전력 시장(${body.regionLabel || '전국 통합'}) ${body.targetDateDash || '오늘'} 데이터입니다.`,
        `- 하루 평균 SMP: ${Number(body.dailyAvgSmp || 0).toFixed(2)} 원/kWh (전일 평균: ${Number(body.yesterdayAvgSmp || 0).toFixed(2)} 원/kWh)`,
        `- 최저 SMP: ${Number(body.dailyMinSmp || 0).toFixed(2)} 원/kWh (${body.minHour || '-'}시)`,
        `- 최고 SMP: ${Number(body.dailyMaxSmp || 0).toFixed(2)} 원/kWh (${body.maxHour || '-'}시)`,
        `- 현재(${body.currentHour || '-'}시) SMP: ${Number(body.currentSmp || 0).toFixed(2)} 원/kWh, 예측수요: ${Number(body.demandMw || 0).toLocaleString('ko-KR')} MW`,
        body.actual2025AvgMw ? `- 2025년 동일 일자 평균 실측 수요: ${Number(body.actual2025AvgMw).toLocaleString('ko-KR')} MW` : '',
        body.hourlySummary ? `- 1시~24시 SMP 추이: ${body.hourlySummary}` : '',
        '위 데이터를 바탕으로 일반 소비자와 태양광 발전 사업자가 이해하기 쉽게 오늘의 SMP 시세 흐름, 저렴/피크 시간대 특징, 실생활 활용 팁을 한국어 3~4문장의 자연스러운 해설 문단으로 작성해 주세요.',
      ]
        .filter(Boolean)
        .join('\n');

      let commentary = '';
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              systemInstruction:
                '당신은 한국전력거래소(KPX) 전력 시장 데이터를 쉽게 설명해 주는 전력 시장 애널리스트입니다. 과장 없이 제공된 숫자만 인용해 정확하고 간결한 한국어 문단으로 해설하세요. 마크다운 기호(*, # 등) 없이 깔끔한 평문 문단으로 작성하세요.',
            },
          });
          commentary = response.text?.trim() || '';
          if (commentary) break;
        } catch (attemptErr) {
          lastErr = attemptErr;
          const errText = String(attemptErr);
          if (attempt === 0 && (errText.includes('503') || errText.includes('UNAVAILABLE'))) {
            await new Promise((r) => setTimeout(r, 900));
            continue;
          }
          throw attemptErr;
        }
      }

      if (!commentary) {
        if (lastErr) throw lastErr;
        res.status(502).json({
          ok: false,
          errorMessage: 'AI 해설 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.',
        });
        return;
      }

      res.json({
        ok: true,
        commentary,
        model: 'gemini-4-hydrogen',
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[ClearVolt] /api/ai/commentary error:', err);
      const rawMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      const friendlyMsg = rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')
        ? 'AI 서버 요청이 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.'
        : `AI 해설 요청 중 오류가 발생했습니다: ${rawMsg}`;
      res.status(502).json({
        ok: false,
        errorMessage: friendlyMsg,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[ClearVolt] Server listening on http://0.0.0.0:${PORT} (2025 CSV days: ${csv2025.days.length})`
    );
  });
}

startServer();
