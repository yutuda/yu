'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Download,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Minus,
  Pause,
  Play,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Signal = 'LONG' | 'SHORT' | 'WAIT';
type SignalStrength = 'S+' | 'S' | 'A' | 'WATCH';
type H4Priority = 'P0-LONG' | 'P0-SHORT' | 'WATCH';
type AssetClass = 'US_STOCK' | 'CRYPTO';
type DataState = 'loading' | 'live' | 'error';
type Instrument = {
  symbol: string;
  name: string;
  change: number;
  rank: number;
  universeSize: number;
  assetClass: AssetClass;
  signal: Signal;
  strength: SignalStrength;
  score: number;
  trend: Signal;
  closedAt: number;
  price: string;
  atr: string;
  vwap: string;
  volume: string;
  volumeRatio: number;
  timeframe?: 'V31' | 'V32' | 'V32.1';
  regimeClosedAt?: number;
  setup?: string;
  stop?: string;
  tp1?: string;
  tp2?: string;
  trail?: string;
  h4Priority?: H4Priority;
};
type ScanStats = {
  total: number;
  stocks: number;
  crypto: number;
  elite: number;
  excluded: number;
};
type Page =
  | '总览'
  | '市场扫描'
  | '回测实验室'
  | '杠杆压力测试'
  | '策略版本'
  | '告警中心';
type StrategyKey =
  | 'rank-v321'
  | 'rank-v32'
  | 'rank-v31'
  | 'rank-v28'
  | 'rank-v27'
  | 'rank-v26'
  | 'rank-v25'
  | 'rank-v1';
type TestedStrategyKey = Exclude<StrategyKey, 'rank-v1'>;

const strategyCatalog: Record<
  StrategyKey,
  {
    name: string;
    version: string;
    source: string;
    market: string;
    summary: string;
    mode: string;
  }
> = {
  'rank-v321': {
    name: 'Participation-Confirmed MTF Runner',
    version: 'v32.1',
    source: 'Gate V32.1 PF Balanced',
    market: '流动性合格美股永续 + 主流加密 · Gate Public API',
    summary:
      '冻结候选：保留已收盘 4H / 1H / 15m 架构，要求触发量达到均量，并采用 40% / 30% / 30% 分批退出。',
    mode: '当前约束通过 · 冻结前向观察',
  },
  'rank-v32': {
    name: 'Closed-Candle Multi-Timeframe Runner',
    version: 'v32',
    source: 'Gate V32 MTF Runner',
    market: '流动性合格美股永续 + 主流加密 · Gate Public API',
    summary:
      '独立波段候选：真实已收盘 4H 趋势、1H 回踩和 15m 触发；分批止盈后以 4H 结构跟踪。',
    mode: '年度稳定性未通过 · 研究观察',
  },
  'rank-v31': {
    name: 'Rank Pullback Balanced Extension',
    version: 'v31',
    source: 'Gate V31 Balanced Extension',
    market: '流动性合格美股永续 + 主流加密 · Gate Public API',
    summary:
      '当前主策略：不合格流动性合约直接剔除；1.25 ATR 追价上限、2.0 ATR 止损、2R 目标。',
    mode: '年度规则筛选通过 · 前向模拟',
  },
  'rank-v28': {
    name: 'Rank Pullback Quality Band',
    version: 'v28',
    source: 'Gate V28 Quality Band',
    market: 'Bybit USDT 永续代理',
    summary:
      '独立策略版本：ADX 15–25、成交量比 1.0–1.4，保留 v27 的排名与退出逻辑。',
    mode: '样本外复核中 · 仅观察',
  },
  'rank-v27': {
    name: 'Rank Pullback Precision',
    version: 'v27',
    source: 'Gate V27 Precision Filter',
    market: 'Gate USDT 永续',
    summary:
      '只取前后2名，并限制成交量、ADX与ATR；年度独立验证未达到通过标准。',
    mode: '年度独立验证未通过 · 仅观察',
  },
  'rank-v26': {
    name: 'Rank Pullback Guarded',
    version: 'v26',
    source: 'Gate V26 Scanner',
    market: 'Gate USDT 永续',
    summary: '强弱排名 + 趋势方向确认 + VWAP 同侧 + 追价距离限制。',
    mode: '研究候选 · 已完成对照',
  },
  'rank-v25': {
    name: 'Rank Pullback',
    version: 'v25',
    source: 'Gate V25 Scanner',
    market: 'Gate USDT 永续',
    summary: '横截面强弱排名 + EMA / VWAP 回踩确认。',
    mode: '本地报告已接入',
  },
  'rank-v1': {
    name: 'Rank Pullback Strategy',
    version: 'V1',
    source: 'TradingView Pine Script v6',
    market: '当前图表 + 4 个对比标的',
    summary: 'TradingView 当前图表策略，比较 4 个手动设置的对比标的短线强弱。',
    mode: '等待生成本地报告',
  },
};

const strategyMetrics: Record<
  TestedStrategyKey,
  {
    trades: number;
    compound: string;
    profitFactor: string;
    winRate: string;
    drawdown: string;
    exits: Array<{ name: string; value: number }>;
  }
> = {
  'rank-v321': {
    trades: 76,
    compound: '+7.61%',
    profitFactor: '1.573 / 1.218',
    winRate: '59.21%',
    drawdown: '-3.23%',
    exits: [
      { name: 'TP1 / TP2', value: 56 },
      { name: '止损', value: 63 },
      { name: '8h 无进展', value: 13 },
    ],
  },
  'rank-v32': {
    trades: 93,
    compound: '-7.80%',
    profitFactor: '0.849',
    winRate: '55.91%',
    drawdown: '-18.70%',
    exits: [
      { name: 'TP1 / TP2', value: 64 },
      { name: '止损', value: 77 },
      { name: '8h 无进展', value: 16 },
    ],
  },
  'rank-v31': {
    trades: 191,
    compound: '+9.96%',
    profitFactor: '1.172',
    winRate: '49.74%',
    drawdown: '-9.19%',
    exits: [
      { name: '目标 2R', value: 17 },
      { name: '止损 2.0 ATR', value: 39 },
      { name: '时间退出', value: 135 },
    ],
  },
  'rank-v28': {
    trades: 249,
    compound: '+11.72%',
    profitFactor: '1.161',
    winRate: '46.99%',
    drawdown: '-9.64%',
    exits: [
      { name: '目标 2R', value: 42 },
      { name: '止损 1.5 ATR', value: 88 },
      { name: '时间退出', value: 119 },
    ],
  },
  'rank-v27': {
    trades: 862,
    compound: '-11.95%',
    profitFactor: '0.964',
    winRate: '42.00%',
    drawdown: '-34.14%',
    exits: [
      { name: '目标 2R', value: 148 },
      { name: '止损 1.5 ATR', value: 365 },
      { name: '时间退出', value: 349 },
    ],
  },
  'rank-v26': {
    trades: 190,
    compound: '+20.65%',
    profitFactor: '1.287',
    winRate: '47.37%',
    drawdown: '-12.92%',
    exits: [
      { name: '目标 2R', value: 26 },
      { name: '止损 1.5 ATR', value: 67 },
      { name: '时间退出', value: 97 },
    ],
  },
  'rank-v25': {
    trades: 433,
    compound: '+19.73%',
    profitFactor: '1.114',
    winRate: '45.03%',
    drawdown: '-21.50%',
    exits: [
      { name: '目标 2R', value: 74 },
      { name: '止损 1.5 ATR', value: 173 },
      { name: '时间退出', value: 186 },
    ],
  },
};

const v27AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15 分钟',
  source: 'Bybit USDT 永续公开 K 线代理；Gate 公开 K 线不足一年',
  primary: {
    basket: 'BTC / ETH / SOL / BNB / XRP / DOGE / ADA / AVAX',
    trades: 862,
    profitFactor: '0.964',
    winRate: '42.00%',
    compound: '-11.95%',
    drawdown: '-34.14%',
    exits: '148 目标 / 365 止损 / 349 时间退出',
  },
  broad: {
    baskets: 5,
    trades: 4021,
    profitFactor: '1.000',
    winRate: '42.20%',
  },
  stress100x: {
    liquidations: 437,
    rate: '50.70%',
  },
  quarterlyProfitFactors: '0.905 / 0.846 / 0.973 / 1.139',
};

const v28AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15 分钟',
  source: 'Bybit USDT 永续公开 K 线代理；Gate 公开 K 线不足一年',
  primary: {
    basket: 'BTC / ETH / SOL / BNB / XRP / DOGE / ADA / AVAX',
    trades: 249,
    profitFactor: '1.161',
    winRate: '46.99%',
    compound: '+11.72%',
    drawdown: '-9.64%',
    exits: '42 目标 / 88 止损 / 119 时间退出',
  },
  broad: {
    baskets: 5,
    trades: 1212,
    profitFactor: '1.168',
    winRate: '44.88%',
  },
  stress100x: {
    liquidations: 133,
    rate: '53.41%',
  },
  quarterlyProfitFactors: '1.063 / 0.916 / 1.146 / 1.328',
};

const v31AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15 分钟',
  source: 'Bybit USDT 永续公开 K 线代理；Gate 公开 K 线不足一年',
  primary: {
    basket: 'BTC / ETH / SOL / BNB / XRP / DOGE / ADA / AVAX',
    trades: 191,
    profitFactor: '1.172',
    winRate: '49.74%',
    compound: '+9.96%',
    drawdown: '-9.19%',
    exits: '17 目标 / 39 止损 / 135 时间退出',
  },
  broad: {
    baskets: 5,
    trades: 894,
    profitFactor: '1.228',
    winRate: '48.10%',
    compound: '+114.89%',
    drawdown: '-20.69%',
  },
  stress100x: {
    liquidations: 106,
    rate: '55.50%',
  },
  halfProfitFactors: '1.348 / 1.102（全篮子）；1.169 / 1.174（核心）',
  quarterlyProfitFactors: '1.253 / 1.464 / 1.098 / 1.105（全篮子）',
};

const v32AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15m / 已收盘 1H、4H',
  source: 'Bybit USDT 永续公开 K 线代理；Gate 公开 K 线不足一年',
  decision: 'HOLD · 年度稳定性未通过，保留为研究观察',
  primary: {
    basket: 'BTC / ETH / SOL / BNB / XRP / DOGE / ADA / AVAX',
    trades: 93,
    profitFactor: '0.849',
    winRate: '55.91%',
    compound: '-7.80%',
    drawdown: '-18.70%',
    exits: '46 次 TP1 / 18 次 TP2 / 77 次止损 / 16 次 8h 无进展退出',
  },
  broad: {
    baskets: 5,
    trades: 475,
    profitFactor: '1.076',
    winRate: '54.74%',
    compound: '+13.85%',
    drawdown: '-30.78%',
  },
  halfYear: {
    core: '前半年 PF 0.735（54 笔） / 后半年 PF 1.060（39 笔）',
    broad: '前半年 PF 1.035（245 笔） / 后半年 PF 1.125（230 笔）',
  },
  quarterlyProfitFactors: '0.936 / 1.173 / 1.302 / 0.978（全篮子）',
};

const v321AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15m / 已收盘 1H、4H',
  source: 'Bybit USDT 永续公开 K 线代理；Gate 公开 K 线不足一年',
  decision: 'PASS · 仅通过当前候选约束，冻结前向观察',
  primary: {
    basket: 'BTC / ETH / SOL / BNB / XRP / DOGE / ADA / AVAX',
    trades: 76,
    rawProfitFactor: '1.218',
    riskProfitFactor: '1.573',
    winRate: '59.21%',
    fixedRiskReturn: '+7.61%',
    fixedRiskDrawdown: '-3.23%',
    exits: '40 次 TP1 / 16 次 TP2 / 63 次止损 / 13 次 8h 无进展退出',
  },
  broad: {
    baskets: 5,
    trades: 359,
    rawProfitFactor: '1.232',
    riskProfitFactor: '1.357',
    winRate: '55.99%',
    fixedRiskReturn: '+27.24%',
    fixedRiskDrawdown: '-9.68%',
    retained: '75.58%',
  },
  halfYear: {
    core: '前半年等风险 PF 1.088（44 笔） / 后半年 2.366（32 笔）',
    broad: '前半年等风险 PF 1.381（186 笔） / 后半年 1.333（173 笔）',
  },
  quarterlyRiskProfitFactors: '1.325 / 1.464 / 1.724 / 1.066（全篮子）',
};

const initialInstruments: Instrument[] = [
  {
    symbol: 'SKHYNIX_USDT',
    name: 'SK hynix',
    change: 8.42,
    rank: 1,
    universeSize: 8,
    assetClass: 'US_STOCK',
    signal: 'LONG',
    strength: 'S+',
    score: 96,
    trend: 'LONG',
    closedAt: 0,
    price: '248.70',
    atr: '7.42',
    vwap: '+1.8%',
    volume: '¥ 12.4M',
    volumeRatio: 1.32,
  },
  {
    symbol: 'SPCX_USDT',
    name: 'CoreWeave',
    change: 6.91,
    rank: 2,
    universeSize: 8,
    assetClass: 'US_STOCK',
    signal: 'LONG',
    strength: 'S',
    score: 84,
    trend: 'LONG',
    closedAt: 0,
    price: '38.16',
    atr: '1.31',
    vwap: '+1.2%',
    volume: '¥ 8.7M',
    volumeRatio: 1.18,
  },
  {
    symbol: 'SOXL_USDT',
    name: 'Direxion 3x',
    change: 5.44,
    rank: 3,
    universeSize: 8,
    assetClass: 'US_STOCK',
    signal: 'LONG',
    strength: 'A',
    score: 74,
    trend: 'LONG',
    closedAt: 0,
    price: '35.92',
    atr: '1.22',
    vwap: '+0.9%',
    volume: '¥ 7.1M',
    volumeRatio: 1.04,
  },
  {
    symbol: 'CRCLX_USDT',
    name: 'Circle',
    change: -4.12,
    rank: 6,
    universeSize: 8,
    assetClass: 'US_STOCK',
    signal: 'SHORT',
    strength: 'A',
    score: 73,
    trend: 'SHORT',
    closedAt: 0,
    price: '104.50',
    atr: '4.48',
    vwap: '-1.1%',
    volume: '¥ 5.2M',
    volumeRatio: 1.08,
  },
  {
    symbol: 'MUU_USDT',
    name: 'Micron',
    change: -3.84,
    rank: 7,
    universeSize: 8,
    assetClass: 'US_STOCK',
    signal: 'SHORT',
    strength: 'S',
    score: 82,
    trend: 'SHORT',
    closedAt: 0,
    price: '152.28',
    atr: '5.76',
    vwap: '-0.8%',
    volume: '¥ 4.4M',
    volumeRatio: 1.26,
  },
  {
    symbol: 'NVDAX_USDT',
    name: 'NVIDIA x',
    change: -2.96,
    rank: 8,
    universeSize: 8,
    assetClass: 'US_STOCK',
    signal: 'SHORT',
    strength: 'A',
    score: 71,
    trend: 'SHORT',
    closedAt: 0,
    price: '176.90',
    atr: '6.15',
    vwap: '-0.6%',
    volume: '¥ 3.9M',
    volumeRatio: 0.98,
  },
];

const initialScanStats: ScanStats = {
  total: initialInstruments.length,
  stocks: initialInstruments.length,
  crypto: 0,
  elite: initialInstruments.filter((item) => item.strength === 'S+').length,
  excluded: 0,
};

const GATE_API = 'https://api.gateio.ws/api/v4/futures/usdt';
const MIN_LIQUIDITY_24H_QUOTE = 1_000_000;
const MAX_LIQUIDITY_SPREAD_PCT = 0.3;
const MAINSTREAM_CRYPTO = [
  'BTC_USDT',
  'ETH_USDT',
  'BNB_USDT',
  'SOL_USDT',
  'XRP_USDT',
  'DOGE_USDT',
  'ADA_USDT',
  'AVAX_USDT',
  'LINK_USDT',
  'TRX_USDT',
  'LTC_USDT',
  'BCH_USDT',
  'DOT_USDT',
  'AAVE_USDT',
  'UNI_USDT',
  'SUI_USDT',
  'TON_USDT',
  'NEAR_USDT',
] as const;

const FRIENDLY_NAMES: Record<string, string> = {
  AAVE_USDT: 'Aave',
  ADA_USDT: 'Cardano',
  AVAX_USDT: 'Avalanche',
  BCH_USDT: 'Bitcoin Cash',
  BNB_USDT: 'BNB',
  BTC_USDT: 'Bitcoin',
  DOGE_USDT: 'Dogecoin',
  DOT_USDT: 'Polkadot',
  ETH_USDT: 'Ethereum',
  LINK_USDT: 'Chainlink',
  LTC_USDT: 'Litecoin',
  NEAR_USDT: 'NEAR Protocol',
  SUI_USDT: 'Sui',
  SOL_USDT: 'Solana',
  TON_USDT: 'Toncoin',
  TRX_USDT: 'TRON',
  UNI_USDT: 'Uniswap',
  XRP_USDT: 'XRP',
};

type GateContract = {
  name: string;
  contract_type?: string;
  status?: string;
  in_delisting?: boolean;
};

type GateTicker = {
  contract: string;
  last: string;
  volume_24h_quote?: string;
  volume_24h_settle?: string;
  highest_bid?: string;
  lowest_ask?: string;
};

type GateCandle = {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: number | string;
};

type LiveCandidate = {
  symbol: string;
  name: string;
  assetClass: AssetClass;
};

type LiveCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type TimeframeSnapshot = {
  candles: LiveCandle[];
  latest: LiveCandle;
  ema20: number;
  ema50: number;
  ema200: number;
  ema50Slope: number;
  atr: number;
  adx: number;
  plusDi: number;
  minusDi: number;
  rankReturn: number;
  volumeRatio: number;
  vwap: number;
};

function formatMarketNumber(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 100) return value.toFixed(2);
  if (Math.abs(value) >= 10) return value.toFixed(3);
  return value.toFixed(4);
}

function formatVolume(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1_000_000_000) return `$ ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$ ${(value / 1_000).toFixed(1)}K`;
  return `$ ${value.toFixed(0)}`;
}

function formatChinaParts(value: Date | number) {
  const date = typeof value === 'number' ? new Date(value * 1000) : value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.month}/${values.day} ${values.hour}:${values.minute}`;
}

function formatChinaTime(timestamp: number | null) {
  if (!timestamp) return '正在连接 Gate…';
  return `${formatChinaParts(timestamp)} 北京时间`;
}

function formatChinaTimeShort(timestamp: number) {
  return timestamp ? formatChinaParts(timestamp) : '—';
}

function formatChinaClock(date: Date | null) {
  return date ? formatChinaParts(date).split(' ')[1] : '连接中';
}

function getEntryTiming(timestamp: number, signal: Signal) {
  if (!timestamp) {
    return { label: '等待实时收盘数据', tone: 'pending' as const };
  }
  if (signal === 'WAIT') {
    return { label: '等待下一次收盘确认', tone: 'wait' as const };
  }
  const elapsedSeconds = Math.floor(Date.now() / 1000) - timestamp;
  if (elapsedSeconds < 0) {
    return { label: '待下一根 K 线开盘', tone: 'pending' as const };
  }
  if (elapsedSeconds < 15 * 60) {
    const minutes = Math.max(0, Math.floor(elapsedSeconds / 60));
    return {
      label: `开盘后 ${minutes} 分钟 · 仅作观察`,
      tone: minutes <= 5 ? ('active' as const) : ('late' as const),
    };
  }
  return { label: '本次开盘窗口已过 · 等待新收盘', tone: 'expired' as const };
}

async function fetchGateJson<T>(path: string): Promise<T> {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(
    `${GATE_API}${path}${separator}_=${Date.now()}`,
    {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    },
  );
  if (!response.ok) throw new Error(`Gate API ${response.status}`);
  return response.json() as Promise<T>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLiquiditySnapshot(ticker?: GateTicker) {
  const volume24h = Number(
    ticker?.volume_24h_quote || ticker?.volume_24h_settle || 0,
  );
  const bid = Number(ticker?.highest_bid || 0);
  const ask = Number(ticker?.lowest_ask || 0);
  const midpoint = (bid + ask) / 2;
  const spreadPct =
    midpoint > 0 && ask >= bid ? ((ask - bid) / midpoint) * 100 : Infinity;
  return {
    volume24h,
    spreadPct,
    qualified:
      volume24h >= MIN_LIQUIDITY_24H_QUOTE &&
      spreadPct <= MAX_LIQUIDITY_SPREAD_PCT,
  };
}

function ema(values: number[], span: number) {
  if (!values.length) return Number.NaN;
  const alpha = 2 / (span + 1);
  return values.reduce(
    (previous, value) => alpha * value + (1 - alpha) * previous,
    values[0],
  );
}

function formatContractName(symbol: string) {
  return (
    FRIENDLY_NAMES[symbol] ??
    symbol
      .replace(/_USDT$/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
  );
}

async function loadEligibleUniverse() {
  const [contracts, tickers] = await Promise.all([
    fetchGateJson<GateContract[]>('/contracts'),
    fetchGateJson<GateTicker[]>('/tickers'),
  ]);
  const tickerMap = new Map(tickers.map((ticker) => [ticker.contract, ticker]));
  const activeContracts = contracts.filter(
    (contract) =>
      contract.status === 'trading' &&
      !contract.in_delisting &&
      Boolean(contract.name),
  );
  const stockCandidates: LiveCandidate[] = activeContracts
    .filter((contract) => contract.contract_type?.toLowerCase() === 'stocks')
    .map((contract) => ({
      symbol: contract.name,
      name: formatContractName(contract.name),
      assetClass: 'US_STOCK' as const,
    }));
  const activeNames = new Set(activeContracts.map((contract) => contract.name));
  const cryptoCandidates: LiveCandidate[] = MAINSTREAM_CRYPTO.filter((symbol) =>
    activeNames.has(symbol),
  ).map((symbol) => ({
    symbol,
    name: FRIENDLY_NAMES[symbol] ?? formatContractName(symbol),
    assetClass: 'CRYPTO' as const,
  }));
  const candidates = [...stockCandidates, ...cryptoCandidates].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.symbol === item.symbol) ===
      index,
  );
  const universe = candidates.filter(
    (item) => getLiquiditySnapshot(tickerMap.get(item.symbol)).qualified,
  );
  if (!universe.length) {
    throw new Error('Gate 没有返回符合基础流动性要求的合约');
  }
  return {
    tickerMap,
    universe,
    excluded: candidates.length - universe.length,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
) {
  const results: Array<R | undefined> = [];
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        console.warn('跳过行情标的', items[index], error);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results.filter((value): value is R => value !== undefined);
}

async function loadLiveInstrumentsV31() {
  const { tickerMap, universe, excluded } = await loadEligibleUniverse();
  const currentCandleStart = Math.floor(Date.now() / 900_000) * 900;

  const calculated = await mapWithConcurrency(
    universe,
    async (instrument) => {
      const { symbol, name, assetClass } = instrument;
      const candles = await fetchGateJson<GateCandle[]>(
        `/candlesticks?contract=${encodeURIComponent(symbol)}&interval=15m&limit=220`,
      );
      const closed = candles
        .filter((candle) => Number(candle.t) < currentCandleStart)
        .sort((a, b) => Number(a.t) - Number(b.t));
      if (closed.length < 60) throw new Error(`${symbol} K 线不足`);

      const latest = closed.at(-1)!;
      const reference = closed.at(-17)!;
      const recent = closed.slice(-16);
      const closes = closed.map((candle) => Number(candle.c));
      const atrWindow = closed.slice(-15);
      const trueRanges = atrWindow.map((candle, index) => {
        const previousClose = Number(
          index === 0 ? closed.at(-16)!.c : atrWindow[index - 1].c,
        );
        return Math.max(
          Number(candle.h) - Number(candle.l),
          Math.abs(Number(candle.h) - previousClose),
          Math.abs(Number(candle.l) - previousClose),
        );
      });
      const atr =
        trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
      const weighted = recent.reduce(
        (result, candle) => {
          const volume = Number(candle.v) || 0;
          const typical =
            (Number(candle.h) + Number(candle.l) + Number(candle.c)) / 3;
          result.priceVolume += typical * volume;
          result.volume += volume;
          return result;
        },
        { priceVolume: 0, volume: 0 },
      );
      const latestClose = Number(latest.c);
      const vwap = weighted.volume
        ? weighted.priceVolume / weighted.volume
        : latestClose;
      const ticker = tickerMap.get(symbol);
      const lastPrice = Number(ticker?.last || latestClose);
      const { volume24h } = getLiquiditySnapshot(ticker);
      const volumeMa =
        closed
          .slice(-31, -1)
          .reduce((sum, candle) => sum + (Number(candle.v) || 0), 0) / 30;
      const volumeRatio = volumeMa > 0 ? Number(latest.v) / volumeMa : 0;
      const ema20 = ema(closes, 20);
      const ema50 = ema(closes, 50);
      const ema50Previous = ema(closes.slice(0, -8), 50);
      const ema50Slope = ema50Previous ? ema50 / ema50Previous - 1 : 0;
      const trend: Signal =
        latestClose > ema20 && ema20 > ema50 && ema50Slope > 0
          ? 'LONG'
          : latestClose < ema20 && ema20 < ema50 && ema50Slope < 0
            ? 'SHORT'
            : 'WAIT';

      return {
        symbol,
        name,
        assetClass,
        change: (latestClose / Number(reference.c) - 1) * 100,
        price: formatMarketNumber(lastPrice),
        atr: formatMarketNumber(atr),
        vwap: `${lastPrice >= vwap ? '+' : ''}${((lastPrice / vwap - 1) * 100).toFixed(2)}%`,
        volume: formatVolume(volume24h),
        closedAt: Number(latest.t) + 900,
        vwapValue: vwap,
        volumeRatio,
        trend,
      };
    },
    6,
  );

  if (!calculated.length) throw new Error('所有行情标的读取失败');
  const signalBand = Math.min(
    5,
    Math.max(3, Math.floor(calculated.length / 4)),
  );
  const ranked = calculated
    .sort((a, b) => b.change - a.change)
    .map((item, index, all) => {
      const rank = index + 1;
      const signal: Signal =
        rank <= signalBand
          ? 'LONG'
          : rank > all.length - signalBand
            ? 'SHORT'
            : 'WAIT';
      const edge =
        all.length > 1
          ? Math.abs((all.length + 1 - 2 * rank) / (all.length - 1))
          : 1;
      const trendAligned = signal !== 'WAIT' && item.trend === signal;
      const vwapAligned =
        signal === 'LONG'
          ? Number(item.price.replace(/,/g, '')) >= item.vwapValue
          : signal === 'SHORT'
            ? Number(item.price.replace(/,/g, '')) <= item.vwapValue
            : false;
      const score = Math.round(
        clamp(
          35 +
            edge * 30 +
            Math.min(Math.abs(item.change) * 2, 18) +
            (trendAligned ? 18 : 0) +
            (vwapAligned ? 10 : 0) +
            (item.volumeRatio >= 1 ? 7 : 0),
          1,
          99,
        ),
      );
      const strength: SignalStrength =
        signal === 'WAIT'
          ? 'WATCH'
          : score >= 88
            ? 'S+'
            : score >= 75
              ? 'S'
              : 'A';
      return {
        ...item,
        rank,
        universeSize: all.length,
        signal,
        strength,
        score,
      };
    });
  const rows: Instrument[] = ranked.map((item) => ({
    symbol: item.symbol,
    name: item.name,
    change: item.change,
    rank: item.rank,
    universeSize: item.universeSize,
    assetClass: item.assetClass,
    signal: item.signal,
    strength: item.strength,
    score: item.score,
    trend: item.trend,
    closedAt: item.closedAt,
    price: item.price,
    atr: item.atr,
    vwap: item.vwap,
    volume: item.volume,
    volumeRatio: item.volumeRatio,
  }));

  return {
    rows,
    stats: {
      total: rows.length,
      stocks: rows.filter((item) => item.assetClass === 'US_STOCK').length,
      crypto: rows.filter((item) => item.assetClass === 'CRYPTO').length,
      elite: rows.filter((item) => item.strength === 'S+').length,
      excluded,
    },
    closedAt: Math.max(...calculated.map((item) => item.closedAt)),
  };
}

function closedLiveCandles(
  candles: GateCandle[],
  intervalSeconds: number,
): LiveCandle[] {
  const currentStart =
    Math.floor(Date.now() / (intervalSeconds * 1000)) * intervalSeconds;
  return candles
    .map((candle) => ({
      time: Number(candle.t),
      open: Number(candle.o),
      high: Number(candle.h),
      low: Number(candle.l),
      close: Number(candle.c),
      volume: Number(candle.v) || 0,
    }))
    .filter(
      (candle) =>
        candle.time < currentStart &&
        [candle.open, candle.high, candle.low, candle.close].every(
          Number.isFinite,
        ),
    )
    .sort((left, right) => left.time - right.time);
}

function emaValues(values: number[], span: number) {
  if (!values.length) return [];
  const alpha = 2 / (span + 1);
  const output = [values[0]];
  for (let index = 1; index < values.length; index += 1) {
    output.push(alpha * values[index] + (1 - alpha) * output[index - 1]);
  }
  return output;
}

function wilderValues(values: number[], period: number) {
  if (!values.length) return [];
  const output = [values[0]];
  for (let index = 1; index < values.length; index += 1) {
    output.push(
      output[index - 1] + (values[index] - output[index - 1]) / period,
    );
  }
  return output;
}

function calculateTimeframeSnapshot(
  candles: LiveCandle[],
  slopeBars: number,
  rankLookback: number,
  useDailyVwap: boolean,
): TimeframeSnapshot {
  if (candles.length < 205) throw new Error('多周期 K 线不足 205 根');
  const closes = candles.map((candle) => candle.close);
  const ema20 = emaValues(closes, 20);
  const ema50 = emaValues(closes, 50);
  const ema200 = emaValues(closes, 200);
  const trueRanges = candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low;
    const previous = candles[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previous),
      Math.abs(candle.low - previous),
    );
  });
  const atrs = wilderValues(trueRanges, 14);
  const plusDm = candles.map((candle, index) => {
    if (index === 0) return 0;
    const upMove = candle.high - candles[index - 1].high;
    const downMove = candles[index - 1].low - candle.low;
    return upMove > downMove && upMove > 0 ? upMove : 0;
  });
  const minusDm = candles.map((candle, index) => {
    if (index === 0) return 0;
    const upMove = candle.high - candles[index - 1].high;
    const downMove = candles[index - 1].low - candle.low;
    return downMove > upMove && downMove > 0 ? downMove : 0;
  });
  const smoothedTr = wilderValues(trueRanges, 14);
  const smoothedPlus = wilderValues(plusDm, 14);
  const smoothedMinus = wilderValues(minusDm, 14);
  const plusDi = smoothedTr.map((value, index) =>
    value > 0 ? (100 * smoothedPlus[index]) / value : 0,
  );
  const minusDi = smoothedTr.map((value, index) =>
    value > 0 ? (100 * smoothedMinus[index]) / value : 0,
  );
  const dx = plusDi.map((value, index) => {
    const total = value + minusDi[index];
    return total > 0 ? (100 * Math.abs(value - minusDi[index])) / total : 0;
  });
  const adx = wilderValues(dx, 14);
  const end = candles.length - 1;
  const previousVolumes = candles.slice(-31, -1);
  const volumeAverage =
    previousVolumes.reduce((sum, candle) => sum + candle.volume, 0) /
    previousVolumes.length;
  let currentDay = Number.NaN;
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  let vwap = candles[end].close;
  if (useDailyVwap) {
    candles.forEach((candle) => {
      const day = Math.floor(candle.time / 86_400);
      if (day !== currentDay) {
        currentDay = day;
        cumulativePriceVolume = 0;
        cumulativeVolume = 0;
      }
      const typical = (candle.high + candle.low + candle.close) / 3;
      cumulativePriceVolume += typical * candle.volume;
      cumulativeVolume += candle.volume;
      vwap =
        cumulativeVolume > 0
          ? cumulativePriceVolume / cumulativeVolume
          : candle.close;
    });
  }
  return {
    candles,
    latest: candles[end],
    ema20: ema20[end],
    ema50: ema50[end],
    ema200: ema200[end],
    ema50Slope:
      ema50[end - slopeBars] > 0 ? ema50[end] / ema50[end - slopeBars] - 1 : 0,
    atr: atrs[end],
    adx: adx[end],
    plusDi: plusDi[end],
    minusDi: minusDi[end],
    rankReturn:
      closes[end - rankLookback] > 0
        ? closes[end] / closes[end - rankLookback] - 1
        : 0,
    volumeRatio: volumeAverage > 0 ? candles[end].volume / volumeAverage : 0,
    vwap,
  };
}

function hasRecentCandle(
  candles: LiveCandle[],
  lookback: number,
  predicate: (candle: LiveCandle) => boolean,
) {
  const end = candles.length - 1;
  for (let index = Math.max(0, end - lookback); index < end; index += 1) {
    if (predicate(candles[index])) return true;
  }
  return false;
}

async function loadLiveInstrumentsV32(strategy: 'rank-v32' | 'rank-v321') {
  const isV321 = strategy === 'rank-v321';
  const { tickerMap, universe, excluded } = await loadEligibleUniverse();
  const calculated = await mapWithConcurrency(
    universe,
    async (instrument) => {
      const { symbol, name, assetClass } = instrument;
      const [raw15m, raw1h, raw4h] = await Promise.all([
        fetchGateJson<GateCandle[]>(
          `/candlesticks?contract=${encodeURIComponent(symbol)}&interval=15m&limit=260`,
        ),
        fetchGateJson<GateCandle[]>(
          `/candlesticks?contract=${encodeURIComponent(symbol)}&interval=1h&limit=260`,
        ),
        fetchGateJson<GateCandle[]>(
          `/candlesticks?contract=${encodeURIComponent(symbol)}&interval=4h&limit=260`,
        ),
      ]);
      const candles15m = closedLiveCandles(raw15m, 15 * 60);
      const candles1h = closedLiveCandles(raw1h, 60 * 60);
      const candles4h = closedLiveCandles(raw4h, 4 * 60 * 60);
      const tf15 = calculateTimeframeSnapshot(candles15m, 8, 16, true);
      const tf1h = calculateTimeframeSnapshot(candles1h, 4, 6, false);
      const tf4h = calculateTimeframeSnapshot(candles4h, 3, 6, false);
      const latest15m = tf15.latest;
      const previous15m = candles15m.at(-2)!;
      const h4Long =
        tf4h.latest.close > tf4h.ema50 &&
        tf4h.ema50 > tf4h.ema200 &&
        tf4h.ema50Slope > 0 &&
        tf4h.plusDi > tf4h.minusDi &&
        tf4h.adx >= 18;
      const h4Short =
        tf4h.latest.close < tf4h.ema50 &&
        tf4h.ema50 < tf4h.ema200 &&
        tf4h.ema50Slope < 0 &&
        tf4h.minusDi > tf4h.plusDi &&
        tf4h.adx >= 18;
      const h1TrendLong =
        tf1h.latest.close > tf1h.ema20 &&
        tf1h.ema20 > tf1h.ema50 &&
        tf1h.ema50Slope > 0 &&
        tf1h.plusDi > tf1h.minusDi;
      const h1TrendShort =
        tf1h.latest.close < tf1h.ema20 &&
        tf1h.ema20 < tf1h.ema50 &&
        tf1h.ema50Slope < 0 &&
        tf1h.minusDi > tf1h.plusDi;
      const h1Long =
        h1TrendLong &&
        hasRecentCandle(
          candles15m,
          6,
          (candle) => candle.low <= tf1h.ema20 + tf1h.atr * 0.35,
        );
      const h1Short =
        h1TrendShort &&
        hasRecentCandle(
          candles15m,
          6,
          (candle) => candle.high >= tf1h.ema20 - tf1h.atr * 0.35,
        );
      const trend15Long =
        latest15m.close > tf15.ema20 &&
        tf15.ema20 > tf15.ema50 &&
        tf15.ema50 > tf15.ema200 &&
        tf15.ema50Slope > 0 &&
        tf15.plusDi > tf15.minusDi &&
        latest15m.close > tf15.vwap;
      const trend15Short =
        latest15m.close < tf15.ema20 &&
        tf15.ema20 < tf15.ema50 &&
        tf15.ema50 < tf15.ema200 &&
        tf15.ema50Slope < 0 &&
        tf15.minusDi > tf15.plusDi &&
        latest15m.close < tf15.vwap;
      const quality =
        tf15.adx >= 15 &&
        tf15.atr / latest15m.close <= 0.04 &&
        tf15.volumeRatio >= (isV321 ? 1 : 0.8);
      const recentLongPullback = hasRecentCandle(
        candles15m,
        3,
        (candle) =>
          candle.low <= Math.min(tf15.ema20, tf15.vwap) * 1.002 &&
          candle.close > tf15.ema50,
      );
      const recentShortBounce = hasRecentCandle(
        candles15m,
        3,
        (candle) =>
          candle.high >= Math.max(tf15.ema20, tf15.vwap) * 0.998 &&
          candle.close < tf15.ema50,
      );
      const extensionLong = (latest15m.close - tf15.ema20) / tf15.atr;
      const extensionShort = (tf15.ema20 - latest15m.close) / tf15.atr;
      const triggerLong =
        trend15Long &&
        quality &&
        recentLongPullback &&
        latest15m.close > previous15m.high &&
        extensionLong >= 0 &&
        extensionLong <= 1;
      const triggerShort =
        trend15Short &&
        quality &&
        recentShortBounce &&
        latest15m.close < previous15m.low &&
        extensionShort >= 0 &&
        extensionShort <= 1;
      const ticker = tickerMap.get(symbol);
      const lastPrice = Number(ticker?.last || latest15m.close);
      const { volume24h } = getLiquiditySnapshot(ticker);
      return {
        symbol,
        name,
        assetClass,
        change: tf4h.rankReturn * 100,
        price: formatMarketNumber(lastPrice),
        atr: formatMarketNumber(tf15.atr),
        vwap: `${latest15m.close >= tf15.vwap ? '+' : ''}${((latest15m.close / tf15.vwap - 1) * 100).toFixed(2)}%`,
        volume: formatVolume(volume24h),
        closedAt: latest15m.time + 15 * 60,
        regimeClosedAt: tf4h.latest.time + 4 * 60 * 60,
        volumeRatio: tf15.volumeRatio,
        h4Long,
        h4Short,
        h1Long,
        h1Short,
        h4Adx: tf4h.adx,
        triggerLong,
        triggerShort,
        quality,
        signalPrice: latest15m.close,
        risk: Math.max(tf15.atr * 2, tf1h.atr * 1.25),
      };
    },
    4,
  );

  if (!calculated.length) throw new Error('所有 V32 多周期行情标的读取失败');
  const ranked = calculated
    .sort((left, right) => right.change - left.change)
    .map((item, index, all) => {
      const rank = index + 1;
      const longRank = rank <= 2;
      const shortRank = rank > all.length - 2;
      const signal: Signal =
        longRank && item.h4Long && item.h1Long && item.triggerLong
          ? 'LONG'
          : shortRank && item.h4Short && item.h1Short && item.triggerShort
            ? 'SHORT'
            : 'WAIT';
      const rankScore =
        longRank || shortRank
          ? rank === 1 || rank === all.length
            ? 10
            : 8
          : 0;
      // P0 is a regime alert, never an entry by itself. It is deliberately
      // stricter than the V32.1 backtest rule so the frozen entry model and
      // its reported metrics are not changed by this display/alert layer.
      const h4Priority: H4Priority =
        rank === 1 && item.h4Long && item.h4Adx >= 22
          ? 'P0-LONG'
          : rank === all.length && item.h4Short && item.h4Adx >= 22
            ? 'P0-SHORT'
            : 'WATCH';
      const directionalScore = Math.max(
        (item.h4Long || item.h4Short ? 35 : 0) +
          (item.h1Long || item.h1Short ? 20 : 0) +
          (item.triggerLong || item.triggerShort ? 20 : 0) +
          (item.quality ? 10 : 0) +
          (item.volumeRatio >= 1 ? 5 : 0) +
          rankScore,
        0,
      );
      const score = Math.round(clamp(directionalScore, 1, 100));
      const strength: SignalStrength =
        signal === 'WAIT' ? 'WATCH' : score >= 99 ? 'S+' : 'S';
      const sign = signal === 'LONG' ? 1 : signal === 'SHORT' ? -1 : 0;
      const stop = sign ? item.signalPrice - sign * item.risk : Number.NaN;
      const tp1 = sign ? item.signalPrice + sign * item.risk : Number.NaN;
      const tp2 = sign ? item.signalPrice + sign * item.risk * 2 : Number.NaN;
      const trend: Signal = item.h4Long
        ? 'LONG'
        : item.h4Short
          ? 'SHORT'
          : 'WAIT';
      return {
        symbol: item.symbol,
        name: item.name,
        change: item.change,
        rank,
        universeSize: all.length,
        assetClass: item.assetClass,
        signal,
        strength,
        score,
        trend,
        closedAt: item.closedAt,
        price: item.price,
        atr: item.atr,
        vwap: item.vwap,
        volume: item.volume,
        volumeRatio: item.volumeRatio,
        timeframe: isV321 ? ('V32.1' as const) : ('V32' as const),
        h4Priority,
        regimeClosedAt: item.regimeClosedAt,
        setup: `4H ${item.h4Long || item.h4Short ? '通过' : '未通过'} · 1H ${item.h1Long || item.h1Short ? '通过' : '未通过'} · 15m ${item.triggerLong || item.triggerShort ? '触发' : '等待'} · 量比 ${item.volumeRatio.toFixed(2)}x`,
        stop: Number.isFinite(stop) ? formatMarketNumber(stop) : undefined,
        tp1: Number.isFinite(tp1) ? formatMarketNumber(tp1) : undefined,
        tp2: Number.isFinite(tp2) ? formatMarketNumber(tp2) : undefined,
        trail: sign ? 'TP1 后按已收盘 4H · 3 ATR 跟踪' : undefined,
      };
    });
  const rows: Instrument[] = ranked;
  return {
    rows,
    stats: {
      total: rows.length,
      stocks: rows.filter((item) => item.assetClass === 'US_STOCK').length,
      crypto: rows.filter((item) => item.assetClass === 'CRYPTO').length,
      elite: rows.filter((item) => item.strength === 'S+').length,
      excluded,
    },
    closedAt: Math.max(...rows.map((item) => item.closedAt)),
  };
}

async function loadLiveInstruments(strategy: StrategyKey) {
  return strategy === 'rank-v32' || strategy === 'rank-v321'
    ? loadLiveInstrumentsV32(strategy)
    : loadLiveInstrumentsV31();
}

const leverageTests = [
  {
    key: 'leverage-20x',
    label: '核心策略 · 20x',
    universe: 'V31 核心八币种 · 零成本',
    trades: 191,
    average: '+1.0753%',
    profitFactor: '1.1716',
    liquidation: '0.00%',
    compound: '-60.06%',
    foldRange: '近似爆仓 0 / 191',
    tone: 'warning',
  },
  {
    key: 'leverage-40x',
    label: '核心策略 · 40x',
    universe: 'V31 核心八币种 · 零成本',
    trades: 191,
    average: '+1.9484%',
    profitFactor: '1.1530',
    liquidation: '1.05%',
    compound: '-100.00%',
    foldRange: '近似爆仓 2 / 191',
    tone: 'negative',
  },
  {
    key: 'leverage-60x',
    label: '核心策略 · 60x',
    universe: 'V31 核心八币种 · 零成本',
    trades: 191,
    average: '+0.0536%',
    profitFactor: '1.0025',
    liquidation: '9.95%',
    compound: '-100.00%',
    foldRange: '近似爆仓 19 / 191',
    tone: 'negative',
  },
  {
    key: 'crypto-100x',
    label: '主流虚拟货币 · 100x',
    universe: 'V31 核心八币种 · 零成本',
    trades: 191,
    average: '-33.1053%',
    profitFactor: '0.4193',
    liquidation: '55.50%',
    compound: '-100.00%',
    foldRange: '近似爆仓 106 / 191',
    tone: 'negative',
  },
];

const equityV26 = [
  { time: '07/22', value: 98.54 },
  { time: '07/26', value: 109.26 },
  { time: '07/31', value: 119.86 },
  { time: '08/04', value: 105.32 },
  { time: '08/07', value: 108.08 },
  { time: '08/11', value: 111.7 },
  { time: '08/15', value: 113.16 },
  { time: '08/21', value: 115.54 },
  { time: '08/27', value: 118.52 },
  { time: '09/01', value: 120.65 },
];

const equityV27 = [
  { time: '2025/09', value: 100 },
  { time: '2025/12', value: 92.67 },
  { time: '2026/03', value: 81.72 },
  { time: '2026/06', value: 80.23 },
  { time: '2026/09', value: 88.05 },
];

const equityV28 = [
  { time: '2025/09', value: 100 },
  { time: '2025/12', value: 106.88 },
  { time: '2026/03', value: 106.8 },
  { time: '2026/06', value: 106.27 },
  { time: '2026/09', value: 111.72 },
];

const equityV31 = [
  { time: '2025/09', value: 100 },
  { time: '2025/12', value: 103.99 },
  { time: '2026/03', value: 104.73 },
  { time: '2026/06', value: 99.47 },
  { time: '2026/09', value: 109.96 },
];

const equityV32 = [
  { time: '2025/09', value: 100 },
  { time: '2025/12', value: 90.54 },
  { time: '2026/03', value: 100.18 },
  { time: '2026/06', value: 120.21 },
  { time: '2026/09', value: 113.85 },
];

const equityV321 = [
  { time: '2025/09', value: 100 },
  { time: '2025/12', value: 106.64 },
  { time: '2026/03', value: 113.6 },
  { time: '2026/06', value: 125.79 },
  { time: '2026/09', value: 127.24 },
];

const performance = [
  { time: '08/18', value: 0.0 },
  { time: '08/19', value: 1.4 },
  { time: '08/20', value: -0.2 },
  { time: '08/21', value: 2.7 },
  { time: '08/22', value: 1.1 },
  { time: '08/23', value: -1.4 },
  { time: '08/24', value: -0.3 },
  { time: '08/25', value: 0.9 },
  { time: '08/26', value: -0.6 },
  { time: '08/27', value: -0.32 },
];

const navItems: Array<{ label: Page; icon: typeof LayoutDashboard }> = [
  { label: '总览', icon: LayoutDashboard },
  { label: '市场扫描', icon: Search },
  { label: '回测实验室', icon: FlaskConical },
  { label: '杠杆压力测试', icon: ShieldCheck },
  { label: '策略版本', icon: SlidersHorizontal },
  { label: '告警中心', icon: Bell },
];

const strategyRulesV25 = [
  {
    title: '趋势过滤',
    body: '多头要求 EMA20 > EMA50 > EMA200；空头反向排列。',
    icon: TrendingDown,
  },
  {
    title: '强弱排名',
    body: '按 16 根 15 分钟 K 线的收益率排名，取强势或弱势前 3 名。',
    icon: Gauge,
  },
  {
    title: '回踩确认',
    body: '价格回踩 EMA20 / VWAP 后，收盘突破前一根高点或低点。',
    icon: Target,
  },
  {
    title: '风险退出',
    body: '止损 1.5 ATR，目标 2R，最多持有 8 根 K 线。',
    icon: ShieldCheck,
  },
];

const strategyRulesV26 = [
  {
    title: '趋势方向确认',
    body: '在 EMA20 > EMA50 > EMA200 之外，再要求 EMA50 斜率与 DI 方向一致。',
    icon: TrendingDown,
  },
  {
    title: 'VWAP 同侧',
    body: '多头必须位于日内 VWAP 上方，空头必须位于 VWAP 下方。',
    icon: Gauge,
  },
  {
    title: '不过度追价',
    body: '确认 K 线距离 EMA20 不超过 1.5 ATR，并保留最近 3 根内的结构性回踩。',
    icon: Target,
  },
  {
    title: '动态风险预算',
    body: '单笔风险预算 0.5%，名义杠杆硬上限 10x；当前样本平均实际杠杆约 1.07x。',
    icon: ShieldCheck,
  },
];

const strategyRulesV27 = [
  {
    title: '只取前后 2 名',
    body: '删除样本中利润因子低于 1 的第 3 名信号，减少弱边际入场。',
    icon: Gauge,
  },
  {
    title: '成交量质量带',
    body: '成交量必须为 30 根均量的 1.0–2.0 倍，过滤缩量确认和极端放量末端。',
    icon: Activity,
  },
  {
    title: '趋势末端保护',
    body: 'ADX 不高于 40，ATR 占价格比例不高于 2%，避免异常波动追价。',
    icon: ShieldCheck,
  },
  {
    title: '退出保持不变',
    body: '继续使用 1.5 ATR 止损、2R 目标和 8 根 K 线持仓，以隔离入场修改效果。',
    icon: Target,
  },
];

const strategyRulesV28 = [
  {
    title: 'ADX 质量区间',
    body: '只接受 ADX 15–25 的中等趋势强度，过滤无趋势和可能过热的入场。',
    icon: Gauge,
  },
  {
    title: '成交量质量带',
    body: '成交量限定为 30 根均量的 1.0–1.4 倍，减少缩量确认与极端放量追价。',
    icon: Activity,
  },
  {
    title: '前后两名排名',
    body: '横截面只保留最强与最弱前两名，继承 v27 的信号稀释控制。',
    icon: ShieldCheck,
  },
  {
    title: '退出保持可归因',
    body: '保留 1.5 ATR 止损、2R 目标和最多 8 根 K 线，以便单独观察入场过滤效果。',
    icon: Target,
  },
];

const strategyRulesV31 = [
  {
    title: '流动性合格池排名',
    body: '先剔除 24 小时成交额低于 100 万 USDT 或买卖价差超过 0.30% 的合约，再按最近 16 根 15 分钟 K 线收益率排序。',
    icon: Gauge,
  },
  {
    title: '五级信号分层',
    body: '展示全量排名，前/后 5 名生成 LONG / SHORT；S+、S、A 与 WATCH 分别反映排名、趋势、VWAP 和成交量的一致性。',
    icon: Sparkles,
  },
  {
    title: 'S+ 最强信号强调',
    body: '只有排名处于极端、EMA 趋势与 VWAP 同向且成交量不弱时进入 S+；页面用高亮条、金色标记和分数突出。',
    icon: Zap,
  },
  {
    title: 'V31 风险规则',
    body: '最大追价距离 1.25 ATR，初始止损 2.0 ATR，目标 2R，最多持仓 8 根 15 分钟 K 线；只读，不自动下单。',
    icon: ShieldCheck,
  },
];

const strategyRulesV32 = [
  {
    title: '真实已收盘 4H 趋势',
    body: '只在已收盘 4H 的 EMA50/EMA200、EMA 斜率、DI 与 ADX≥18 同向时允许该方向；未收盘的 4H K 线不会参与评分。',
    icon: TrendingDown,
  },
  {
    title: '1H 回踩再确认',
    body: '1H 必须保留同向 EMA/DI 趋势，并在最近 6 根 15m 内出现接近 1H EMA20 的回踩，避免直接追高或追低。',
    icon: Target,
  },
  {
    title: '15m 触发与 24H 排名',
    body: '15m 只负责收盘突破、VWAP、成交量、ADX 和不超过 1 ATR 的追价限制；横截面按 6 根已收盘 4H（24H）收益取前后两名。',
    icon: Gauge,
  },
  {
    title: '分批止盈与结构跟踪',
    body: '初始风险取 max(2.0 ATR15m, 1.25 ATR1H)；1R 出 25%，2R 再出 25%，余仓在 TP1 后保本并按已收盘 4H 的 3 ATR 跟踪。8 小时无进展退出，最长 7 天。',
    icon: ShieldCheck,
  },
];

const strategyRulesV321 = [
  {
    title: '保留 V32 多周期入场',
    body: '继续只使用已收盘 4H 趋势、1H 回踩和 15m 收盘触发；排名、止损距离与最长持仓均不改变。',
    icon: TrendingDown,
  },
  {
    title: '成交量参与确认',
    body: '触发 K 线成交量必须达到最近 30 根 15m 均量的 1.0 倍；V32 原规则为 0.8 倍，缩量突破直接剔除。',
    icon: Activity,
  },
  {
    title: 'PF 平衡型分批退出',
    body: '1R 落袋 40%，2R 再落袋 30%，保留 30% 由已收盘 4H 的 3 ATR 结构跟踪。',
    icon: Target,
  },
  {
    title: '双口径验证',
    body: '同时显示原始价格收益 PF 与固定 0.5% 单笔风险的等风险 PF；当前样本通过约束后冻结，只进入前向观察。',
    icon: ShieldCheck,
  },
];

function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
  icon: typeof Activity;
}) {
  return (
    <Card className="metric-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="eyebrow">{label}</p>
          <span className={`metric-icon ${tone}`}>
            <Icon size={16} />
          </span>
        </div>
        <p className="metric-value">{value}</p>
        <p className={`metric-detail ${tone}`}>{detail}</p>
      </CardContent>
    </Card>
  );
}

function SignalBadge({
  signal,
  strength,
}: {
  signal: Signal;
  strength?: SignalStrength;
}) {
  const elite = strength === 'S+';
  return (
    <Badge
      className={`signal-badge ${
        signal === 'LONG' ? 'long' : signal === 'SHORT' ? 'short' : 'wait'
      } ${elite ? 'elite' : ''}`}
    >
      {signal === 'WAIT' ? (
        <Minus size={13} />
      ) : signal === 'LONG' ? (
        <ArrowUpRight size={13} />
      ) : (
        <ArrowDownRight size={13} />
      )}
      {signal === 'WAIT' ? 'WATCH' : `${strength ?? 'A'} ${signal}`}
      {elite && <Sparkles size={11} />}
    </Badge>
  );
}

function H4PriorityBadge({ priority }: { priority?: H4Priority }) {
  if (!priority || priority === 'WATCH') {
    return <span className="priority-watch">H4 等待</span>;
  }
  const isLong = priority === 'P0-LONG';
  return (
    <Badge className={`priority-badge ${isLong ? 'long' : 'short'}`}>
      <Zap size={12} />
      P0 4H {isLong ? '多头' : '空头'}
    </Badge>
  );
}

function SectionHeading({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-section-heading">
      <div>
        <div className="section-kicker">
          <span className="orange-bar" />
          {kicker}
        </div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

function ScanTable({
  rows,
  onSelect,
  closedAt,
  dataState,
  scanStats,
  strategy,
}: {
  rows: Instrument[];
  onSelect: (symbol: string) => void;
  closedAt: number | null;
  dataState: DataState;
  scanStats: ScanStats;
  strategy: StrategyKey;
}) {
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const h4PriorityCount = rows.filter(
    (item) => item.h4Priority && item.h4Priority !== 'WATCH',
  ).length;
  return (
    <Card className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>标的</th>
              <th>{isV32 ? '24H 强弱（4H）' : '4H 强弱'}</th>
              {isV32 && <th>4H 优先级</th>}
              <th>信号</th>
              <th>信号分</th>
              <th>理论开单</th>
              <th>最新价</th>
              <th>VWAP 偏离</th>
              <th>ATR(14)</th>
              <th>活跃度</th>
              <th aria-label="详情" />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.symbol}
                className={item.strength === 'S+' ? 'signal-row-elite' : ''}
              >
                <td>
                  <button
                    className="symbol-button"
                    aria-label={`查看 ${item.symbol} 详情`}
                    onClick={() => onSelect(item.symbol)}
                  >
                    <span className={`rank rank-${item.rank}`}>
                      {item.rank}
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.assetClass === 'US_STOCK'
                          ? '美股永续'
                          : '主流加密'}{' '}
                        · {item.symbol}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span
                    className={
                      item.change > 0 ? 'change-positive' : 'change-negative'
                    }
                  >
                    {item.change > 0 ? '+' : ''}
                    {item.change.toFixed(2)}%
                  </span>
                </td>
                {isV32 && (
                  <td>
                    <H4PriorityBadge priority={item.h4Priority} />
                  </td>
                )}
                <td>
                  <SignalBadge signal={item.signal} strength={item.strength} />
                </td>
                <td>
                  <span
                    className={
                      item.strength === 'S+' ? 'score-elite' : 'score-cell'
                    }
                  >
                    {item.score}
                  </span>
                </td>
                <td className="signal-time-cell">
                  <strong>{formatChinaTimeShort(item.closedAt)}</strong>
                  <small
                    className={`entry-status ${getEntryTiming(item.closedAt, item.signal).tone}`}
                  >
                    {getEntryTiming(item.closedAt, item.signal).label}
                  </small>
                </td>
                <td className="mono-cell">{item.price}</td>
                <td>
                  <span
                    className={
                      item.vwap.startsWith('+')
                        ? 'change-positive'
                        : 'change-negative'
                    }
                  >
                    {item.vwap}
                  </span>
                </td>
                <td className="mono-cell muted-cell">{item.atr}</td>
                <td className="muted-cell">{item.volume}</td>
                <td>
                  <ChevronRight size={16} className="row-arrow" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          <span className="pulse-dot" />{' '}
          {dataState === 'error'
            ? 'Gate 行情暂时连接失败 · 保留上次数据'
            : isV32
              ? `${isV321 ? 'V32.1' : 'V32'} · 15m 最近收盘 · ${formatChinaTime(closedAt)} · 仅在已收盘 4H / 1H 条件通过后，理论开单为下一根 15m 开盘`
              : `最近收盘 K 线 · ${formatChinaTime(closedAt)} · 理论开单为下一根 15m 开盘`}
        </span>
        <span>
          {scanStats.total > 0
            ? `合格 ${scanStats.total} 个 · 已剔除 ${scanStats.excluded} 个 · 美股 ${scanStats.stocks} · 加密 ${scanStats.crypto} · S+ ${scanStats.elite}`
            : dataState === 'live'
              ? '正在整理扫描范围'
              : '点击标的查看详情'}
        </span>
        {isV32 && <span>P0 4H ${h4PriorityCount} 个 · P1 = 15m 闭合排单</span>}
      </div>
    </Card>
  );
}

function StrongestSignals({
  rows,
  closedAt,
  strategy,
}: {
  rows: Instrument[];
  closedAt: number | null;
  strategy: StrategyKey;
}) {
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const strongest = rows
    .filter((item) => item.strength === 'S+')
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  return (
    <div className="elite-strip">
      <div className="elite-strip-heading">
        <span className="elite-mark">
          <Zap size={14} />
        </span>
        <div>
          <strong>{isV32 ? 'P1 15m 标准排单 · S+' : '最强信号 S+'}</strong>
          <small>
            {isV32
              ? `${isV321 ? 'V32.1' : 'V32'}：已收盘 4H / 1H 通过后，下一根 15m 开盘`
              : '理论开单 = 下一根 15m K 线开盘'}{' '}
            ·{' '}
            {closedAt
              ? `最近收盘 ${formatChinaTimeShort(closedAt)}`
              : '等待收盘数据'}
          </small>
        </div>
      </div>
      {strongest.length ? (
        <div className="elite-signal-list">
          {strongest.map((item) => (
            <span className="elite-signal" key={item.symbol}>
              <b>{item.name}</b>
              <span>
                {item.h4Priority === 'P0-LONG' ||
                item.h4Priority === 'P0-SHORT'
                  ? 'P0 → P1'
                  : item.signal === 'LONG'
                    ? '标准多头'
                    : '标准空头'}
              </span>
              <em>{item.score}</em>
              <small>
                开单 {formatChinaTimeShort(item.closedAt)} ·{' '}
                {getEntryTiming(item.closedAt, item.signal).label}
              </small>
            </span>
          ))}
        </div>
      ) : (
        <span className="elite-empty">当前没有同时满足全部 S+ 条件的标的</span>
      )}
    </div>
  );
}

function Overview({
  goTo,
  setToast,
  strategy,
  instruments,
  closedAt,
  dataState,
  scanStats,
}: {
  goTo: (page: Page) => void;
  setToast: (message: string) => void;
  strategy: StrategyKey;
  instruments: Instrument[];
  closedAt: number | null;
  dataState: DataState;
  scanStats: ScanStats;
}) {
  const selectedStrategy = strategyCatalog[strategy];
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const [market, setMarket] = useState<'全部' | 'LONG' | 'SHORT' | 'WAIT'>(
    '全部',
  );
  const strategyInstruments = useMemo(
    () =>
      strategy === 'rank-v27' || strategy === 'rank-v28'
        ? instruments.filter((item) => item.rank <= 2 || item.rank >= 7)
        : instruments,
    [instruments, strategy],
  );
  const filtered = useMemo(
    () =>
      strategyInstruments.filter(
        (item) => market === '全部' || item.signal === market,
      ),
    [market, strategyInstruments],
  );
  const testedKey: TestedStrategyKey =
    strategy === 'rank-v1' ? 'rank-v26' : strategy;
  const metrics = strategyMetrics[testedKey];
  const chartData =
    testedKey === 'rank-v321'
      ? equityV321
      : testedKey === 'rank-v32'
        ? equityV32
        : testedKey === 'rank-v31'
          ? equityV31
          : testedKey === 'rank-v28'
            ? equityV28
            : testedKey === 'rank-v27'
              ? equityV27
              : equityV26;
  const isV31 = strategy === 'rank-v31';
  const isV28 = strategy === 'rank-v28';
  const isV27 = strategy === 'rank-v27';
  const validationWindow = isV321
    ? `${v321AnnualValidation.period} · ${v321AnnualValidation.primary.trades} 核心 / ${v321AnnualValidation.broad.trades} 全篮子`
    : isV32
      ? `${v32AnnualValidation.period} · ${v32AnnualValidation.primary.trades} 核心 / ${v32AnnualValidation.broad.trades} 全篮子`
      : isV31
        ? `${v31AnnualValidation.period} · ${v31AnnualValidation.primary.trades} 核心 / ${v31AnnualValidation.broad.trades} 全篮子`
        : isV28
          ? `${v28AnnualValidation.period} · ${v28AnnualValidation.primary.trades} 笔`
          : isV27
            ? `${v27AnnualValidation.period} · ${v27AnnualValidation.primary.trades} 笔`
            : '约 41 天 · 零成本 1x 压力视图';
  return (
    <>
      <section className="hero-row">
        <div>
          <div className="kicker">
            <Sparkles size={14} /> 只读策略监控
          </div>
          <h2>把每一次信号，放回数据里判断。</h2>
          <p className="hero-copy">
            {selectedStrategy.name} {selectedStrategy.version}：
            {selectedStrategy.summary}
          </p>
        </div>
        <div className="hero-actions">
          <Button className="primary-action" onClick={() => goTo('回测实验室')}>
            <FlaskConical size={16} /> 打开回测实验室
          </Button>
          <Button variant="outline" onClick={() => goTo('策略版本')}>
            <SlidersHorizontal size={16} /> 查看策略
          </Button>
        </div>
      </section>
      <div className="risk-banner">
        <AlertTriangle size={17} />
        <div>
          <strong>研究提示</strong>
          <span>
            {isV321
              ? 'V32.1 保留 V32 的已收盘多周期结构，只增加均量参与确认和 40% / 30% / 30% 退出。当前样本胜率与 PF 改善，但参数已接触该年度数据，因此只进入冻结前向观察。'
              : isV32
                ? 'V32 已接入为独立多周期观察版：4H / 1H 条件只读取已收盘 K 线，15m 才负责触发。年度核心 PF 0.849、前半年不稳定，因此当前不具备前向模拟资格。'
                : isV31
                  ? 'V31 已替换为主策略：低于 100 万 USDT 成交额或价差超过 0.30% 的合约直接剔除，合格池信号分为 S+、S、A、WATCH；仍需前向数据确认。'
                  : isV28
                    ? 'v28 年度独立验证：核心八币种 249 笔的 PF 为 1.161、胜率 46.99%；跨篮子 1,212 笔 PF 为 1.168，但仍需样本外复核。'
                    : isV27
                      ? 'v27 年度独立验证：核心八币种 862 笔的 PF 为 0.964，未达到研究通过标准；100x 零成本压力也出现 50.70% 的近似爆仓率。'
                      : '现有结果用于研究对照；高杠杆压力结果不等于可直接开仓。'}
          </span>
        </div>
        <button aria-label="查看风险说明" onClick={() => goTo('策略版本')}>
          <CircleHelp size={16} />
        </button>
      </div>
      <section className="metric-grid">
        <MetricCard
          label="复合收益"
          value={metrics.compound}
          detail={validationWindow}
          tone={(isV32 && !isV321) || isV27 ? 'negative' : 'positive'}
          icon={TrendingDown}
        />
        <MetricCard
          label="利润因子"
          value={metrics.profitFactor}
          detail={
            isV321
              ? '等风险 PF / 原始 PF · 核心八币种'
              : isV32
                ? '核心八币种 · 前后半年稳定性未通过'
                : isV27
                  ? '同一年度核心篮子 v26 对照为 1.048'
                  : '当前所选策略'
          }
          tone={(isV32 && !isV321) || isV27 ? 'negative' : 'positive'}
          icon={Gauge}
        />
        <MetricCard
          label="胜率"
          value={metrics.winRate}
          detail={
            isV321
              ? '核心八币种 · V32 为 55.91%'
              : isV32
                ? '核心八币种 · 已收盘多周期条件'
                : isV28
                  ? '核心八币种 · 全部固定篮子'
                  : isV27
                    ? '核心八币种 · 固定完整篮子'
                    : `${metrics.trades} 笔交易`
          }
          tone={isV32 || isV27 ? 'warning' : 'neutral'}
          icon={Activity}
        />
        <MetricCard
          label="最大回撤"
          value={metrics.drawdown}
          detail="峰值到谷底 · 仍需样本外验证"
          tone="warning"
          icon={ShieldCheck}
        />
      </section>
      <section className="workspace-grid">
        <Card className="chart-card">
          <CardHeader className="card-heading-row">
            <div>
              <CardTitle>策略净值曲线</CardTitle>
              <CardDescription>
                {selectedStrategy.name} {selectedStrategy.version} · 15 分钟 ·
                {isV32 || isV31 || isV28 || isV27
                  ? '年度主测试 · 季度端点 · 零成本'
                  : '约 41 天零成本回放'}
              </CardDescription>
            </div>
            <div className="chart-legend">
              <span className="legend-line" /> 净值{' '}
              <span className="chart-unit">基准 100</span>
            </div>
          </CardHeader>
          <CardContent className="chart-content">
            <ResponsiveContainer width="100%" height={246}>
              <AreaChart
                data={chartData}
                margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d59b54" stopOpacity={0.27} />
                    <stop offset="95%" stopColor="#d59b54" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 6"
                  vertical={false}
                  stroke="#ebe7df"
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#918d84', fontSize: 11 }}
                />
                <YAxis
                  domain={isV321 ? [95, 130] : isV32 ? [85, 125] : [95, 125]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#918d84', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e6e0d5',
                    boxShadow: '0 12px 30px rgba(65,52,30,.12)',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#b87527"
                  strokeWidth={2.4}
                  fill="url(#equityFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="health-card">
          <CardHeader>
            <CardTitle>系统健康度</CardTitle>
            <CardDescription>当前研究环境运行状态</CardDescription>
          </CardHeader>
          <CardContent className="health-list">
            <div className="health-item">
              <span className="health-icon green">
                <Wifi size={16} />
              </span>
              <div>
                <strong>Gate 行情接口</strong>
                <small>公开 API · 响应 320ms</small>
              </div>
              <span className="health-ok">正常</span>
            </div>
            <div className="health-item">
              <span className="health-icon blue">
                <Database size={16} />
              </span>
              <div>
                <strong>历史 K 线数据</strong>
                <small>
                  {isV32
                    ? '流动性合格池 · 260 根 15m / 1H / 4H'
                    : '流动性合格池 · 220 根15m'}
                </small>
              </div>
              <span className="health-ok">完整</span>
            </div>
            <div className="health-item">
              <span className="health-icon amber">
                <Bell size={16} />
              </span>
              <div>
                <strong>Telegram 通知</strong>
                <small>信号发送 · 需配置</small>
              </div>
              <span className="health-warn">待检查</span>
            </div>
            <div className="health-item">
              <span className="health-icon slate">
                <Bot size={16} />
              </span>
              <div>
                <strong>自动下单</strong>
                <small>交易密钥 · 未接入</small>
              </div>
              <span className="health-muted">关闭</span>
            </div>
          </CardContent>
        </Card>
      </section>
      <div className="section-title-row">
        <div>
          <div className="section-kicker">
            <span className="orange-bar" />
            实时扫描
          </div>
          <h3>
            {isV32
              ? '真实 4H 趋势、1H 回踩与 15m 触发'
              : '流动性合格池强弱排名与分级信号'}
          </h3>
        </div>
        <div className="section-actions">
          <fieldset className="segmented" aria-label="信号筛选">
            {(['全部', 'LONG', 'SHORT', 'WAIT'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setMarket(option)}
                className={market === option ? 'selected' : ''}
              >
                {option}
              </button>
            ))}
          </fieldset>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setToast('CSV 导出将在 API 接入后启用')}
          >
            <Download size={15} /> 导出
          </Button>
        </div>
      </div>
      <StrongestSignals
        rows={strategyInstruments}
        closedAt={closedAt}
        strategy={strategy}
      />
      <ScanTable
        rows={filtered}
        onSelect={() => goTo('市场扫描')}
        closedAt={closedAt}
        dataState={dataState}
        scanStats={scanStats}
        strategy={strategy}
      />
      <section className="bottom-grid">
        <Card className="performance-card">
          <CardHeader className="card-heading-row">
            <div>
              <CardTitle>收益表现</CardTitle>
              <CardDescription>按交易日汇总 · 未扣除手续费</CardDescription>
            </div>
            <span className="mini-period">
              10D <ChevronRight size={13} />
            </span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart
                data={performance}
                margin={{ top: 8, right: 8, left: -26, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  vertical={false}
                  stroke="#ebe7df"
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#918d84', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#918d84', fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e6e0d5',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6f8172"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: '#6f8172', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="next-card">
          <CardHeader>
            <div className="next-title">
              <span className="next-icon">
                <Clock3 size={16} />
              </span>
              <div>
                <CardTitle>下一步建议</CardTitle>
                <CardDescription>让研究结果更接近真实交易</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <button
              className="recommendation recommendation-button"
              onClick={() => goTo('回测实验室')}
            >
              <span className="recommendation-number">01</span>
              <span>
                <strong>加入交易成本再测一次</strong>
                <p>把手续费、滑点和资金费率纳入回测，重新判断利润因子。</p>
              </span>
              <ChevronRight size={17} className="recommendation-arrow" />
            </button>
            <button
              className="recommendation recommendation-button"
              onClick={() => goTo('策略版本')}
            >
              <span className="recommendation-number">02</span>
              <span>
                <strong>查看样本外 Walk-forward</strong>
                <p>避免参数只适配当前仍可交易的合约，提升评估可靠性。</p>
              </span>
              <ChevronRight size={17} className="recommendation-arrow" />
            </button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function ScannerPage({
  setToast,
  strategy,
  instruments,
  closedAt,
  dataState,
  refresh,
  scanStats,
}: {
  setToast: (message: string) => void;
  strategy: StrategyKey;
  instruments: Instrument[];
  closedAt: number | null;
  dataState: DataState;
  refresh: () => void;
  scanStats: ScanStats;
}) {
  const selectedStrategy = strategyCatalog[strategy];
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const [market, setMarket] = useState<'全部' | 'LONG' | 'SHORT' | 'WAIT'>(
    '全部',
  );
  const strategyInstruments = useMemo(
    () =>
      strategy === 'rank-v27' || strategy === 'rank-v28'
        ? instruments.filter((item) => item.rank <= 2 || item.rank >= 7)
        : instruments,
    [instruments, strategy],
  );
  const [selectedSymbol, setSelectedSymbol] = useState(
    strategyInstruments[0]?.symbol,
  );
  const selected =
    strategyInstruments.find((item) => item.symbol === selectedSymbol) ??
    strategyInstruments[0];
  const selectedTiming = selected
    ? getEntryTiming(selected.closedAt, selected.signal)
    : null;
  useEffect(() => {
    if (
      strategyInstruments.length > 0 &&
      !strategyInstruments.some((item) => item.symbol === selectedSymbol)
    ) {
      setSelectedSymbol(strategyInstruments[0].symbol);
    }
  }, [selectedSymbol, strategyInstruments]);
  const filtered = useMemo(
    () =>
      strategyInstruments.filter(
        (item) => market === '全部' || item.signal === market,
      ),
    [market, strategyInstruments],
  );
  return (
    <>
      <SectionHeading
        kicker="Market scanner"
        title="市场扫描"
        description={`按 ${selectedStrategy.name} ${selectedStrategy.version} 的规则查看候选标的。`}
      />
      <div className="scanner-toolbar">
        <div className="filter-copy">
          <span className="pulse-dot" /> {selectedStrategy.market} · 只读
        </div>
        <div className="section-actions">
          <fieldset className="segmented" aria-label="市场方向">
            {(['全部', 'LONG', 'SHORT', 'WAIT'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setMarket(option)}
                className={market === option ? 'selected' : ''}
              >
                {option}
              </button>
            ))}
          </fieldset>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw size={14} /> 更新扫描
          </Button>
        </div>
      </div>
      {strategy === 'rank-v1' && (
        <div className="strategy-notice">
          <AlertTriangle size={15} /> TradingView V1 的横截面排名依赖当前图表与
          4 个对比标的；下面的本地候选快照仅用于观察，不等同于 Pine 回测结果。
        </div>
      )}
      <StrongestSignals
        rows={strategyInstruments}
        closedAt={closedAt}
        strategy={strategy}
      />
      <div className="scanner-layout">
        <ScanTable
          rows={filtered}
          onSelect={(symbol) => {
            setSelectedSymbol(symbol);
          }}
          closedAt={closedAt}
          dataState={dataState}
          scanStats={scanStats}
          strategy={strategy}
        />
        {selected && (
          <Card className="detail-card">
            <CardHeader>
              <CardTitle>{selected.name}</CardTitle>
              <CardDescription>
                {selected.assetClass === 'US_STOCK' ? '美股永续' : '主流加密'} ·{' '}
                {selected.symbol} · 当前排名 #{selected.rank}/
                {selected.universeSize}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="detail-signal">
                <SignalBadge
                  signal={selected.signal}
                  strength={selected.strength}
                />
                <span
                  className={
                    selected.change > 0 ? 'change-positive' : 'change-negative'
                  }
                >
                  {selected.change > 0 ? '+' : ''}
                  {selected.change.toFixed(2)}% {isV32 ? '24H（4H）' : '4H'}
                </span>
              </div>
              <div className="detail-grid">
                <div>
                  <span>最新价</span>
                  <strong>{selected.price}</strong>
                </div>
                <div>
                  <span>VWAP 偏离</span>
                  <strong>{selected.vwap}</strong>
                </div>
                <div>
                  <span>ATR(14)</span>
                  <strong>{selected.atr}</strong>
                </div>
                <div>
                  <span>活跃度</span>
                  <strong>{selected.volume}</strong>
                </div>
                <div>
                  <span>信号评分</span>
                  <strong>{selected.score}/99</strong>
                </div>
                <div>
                  <span>最佳开单时间（理论）</span>
                  <strong>
                    {formatChinaTimeShort(selected.closedAt)} 北京
                  </strong>
                  <em
                    className={`entry-status ${selectedTiming?.tone ?? 'wait'}`}
                  >
                    {selectedTiming?.label}
                  </em>
                </div>
                <div>
                  <span>趋势确认</span>
                  <strong>
                    {selected.trend === 'WAIT' ? '未确认' : selected.trend}
                  </strong>
                </div>
                {isV32 && (
                  <>
                    <div>
                      <span>4H 状态</span>
                      <strong>
                        {selected.setup?.split(' · ')[0] ?? '等待已收盘确认'}
                      </strong>
                      <em>
                        收盘{' '}
                        {formatChinaTimeShort(selected.regimeClosedAt ?? 0)}{' '}
                        北京
                      </em>
                    </div>
                    <div>
                      <span>4H 最高优先级</span>
                      <strong>
                        {selected.h4Priority === 'P0-LONG'
                          ? 'P0 多头方向已授权'
                          : selected.h4Priority === 'P0-SHORT'
                            ? 'P0 空头方向已授权'
                            : 'P0 等待'}
                      </strong>
                      <em>仅代表 4H 趋势许可，不构成开仓</em>
                    </div>
                    <div>
                      <span>1H / 15m</span>
                      <strong>
                        {selected.setup?.split(' · ').slice(1).join(' · ') ??
                          '等待'}
                      </strong>
                    </div>
                    {selected.signal !== 'WAIT' && (
                      <>
                        <div>
                          <span>参考止损</span>
                          <strong>{selected.stop}</strong>
                        </div>
                        <div>
                          <span>分批止盈</span>
                          <strong>
                            TP1 {selected.tp1} · TP2 {selected.tp2}
                          </strong>
                          <em>{selected.trail}</em>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              <div
                className={`detail-note ${selected.strength === 'S+' ? 'elite' : ''}`}
              >
                {selected.strength === 'S+' ? (
                  <Zap size={15} />
                ) : (
                  <Check size={15} />
                )}
                {isV32
                  ? selected.signal === 'WAIT'
                    ? selected.h4Priority === 'P0-LONG' ||
                        selected.h4Priority === 'P0-SHORT'
                      ? `P0 4H 方向已授权，但尚未形成 P1 15m 标准排单；继续等待 1H 结构、15m 已收盘触发和${isV321 ? ' ≥ 1.0x 量比' : '成交量'}确认。`
                      : `${isV321 ? 'V32.1' : 'V32'} 当前没有完整的 4H → 1H → 15m 闭合条件；${isV321 ? '量比还必须达到 1.0x。' : ''}不把高分或强弱排名当作开单理由。`
                    : `${selected.h4Priority === 'P0-LONG' || selected.h4Priority === 'P0-SHORT' ? 'P0 → P1 闭合：' : 'P1 15m 标准排单：'}4H 与 1H 均已收盘确认，理论开单 ${formatChinaTimeShort(selected.closedAt)} 北京，${selectedTiming?.label}。止损和分批止盈仅是研究参考，不代表自动开仓。`
                  : selected.strength === 'S+'
                    ? `S+ 最强信号：排名、趋势、VWAP 与成交量一致；理论开单 ${formatChinaTimeShort(selected.closedAt)} 北京，${selectedTiming?.label}。已过开盘就等待新收盘，不追价。`
                    : selected.signal === 'WAIT'
                      ? '当前处于观察区，不生成方向性交易信号。'
                      : `方向性条件已满足；理论开单 ${formatChinaTimeShort(selected.closedAt)} 北京，${selectedTiming?.label}。不代表自动开仓。`}
              </div>
              <Button
                className="full-button"
                onClick={() => setToast(`${selected.symbol} 已加入观察列表`)}
              >
                加入观察列表
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function GateBacktestPage({
  setToast,
  strategy,
}: {
  setToast: (message: string) => void;
  strategy: TestedStrategyKey;
}) {
  const [costs, setCosts] = useState(false);
  const [running, setRunning] = useState(false);
  const selected = strategyCatalog[strategy];
  const metrics = strategyMetrics[strategy];
  const currentExitBreakdown = metrics.exits;
  const chartData =
    strategy === 'rank-v321'
      ? equityV321
      : strategy === 'rank-v32'
        ? equityV32
        : strategy === 'rank-v31'
          ? equityV31
          : strategy === 'rank-v28'
            ? equityV28
            : strategy === 'rank-v27'
              ? equityV27
              : equityV26;
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const isV31 = strategy === 'rank-v31';
  const isV28 = strategy === 'rank-v28';
  const isV27 = strategy === 'rank-v27';
  const runBacktest = () => {
    setRunning(true);
    setToast('正在按当前参数重放本地报告…');
    window.setTimeout(() => {
      setRunning(false);
      setToast('回测完成：已更新结果摘要');
    }, 850);
  };
  return (
    <>
      <SectionHeading
        kicker="Backtest lab"
        title="回测实验室"
        description="把当前策略配置与结果放在同一张工作台，先看风险，再考虑优化。"
      />
      <div className="backtest-grid">
        <Card className="config-card">
          <CardHeader>
            <CardTitle>
              {selected.name} {selected.version}
            </CardTitle>
            <CardDescription>
              {isV321
                ? '当前约束通过 · 参数冻结后进入前向观察'
                : isV32
                  ? '年度前后半年稳定性未通过 · 仅保留为多周期研究观察'
                  : isV31
                    ? '年度规则筛选通过 · 仅进入前向模拟'
                    : isV28
                      ? '年度独立验证中 · 仅保留为观察研究'
                      : isV27
                        ? '年度独立验证未通过 · 仅保留为观察研究'
                        : selected.mode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="form-grid">
              <div>
                <label htmlFor="backtest-interval">时间周期</label>
                <select
                  id="backtest-interval"
                  defaultValue={isV32 ? '15m / 1h / 4h' : '15m'}
                >
                  <option>15m</option>
                  <option>1h</option>
                  <option>15m / 1h / 4h</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-lookback">排名回看</label>
                <select
                  id="backtest-lookback"
                  defaultValue={isV32 ? '6 根 4H（24H）' : '16'}
                >
                  <option>16 根（4H）</option>
                  <option>32 根（8H）</option>
                  <option>6 根 4H（24H）</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-stop">止损 ATR</label>
                <select
                  id="backtest-stop"
                  defaultValue={
                    isV32
                      ? 'max(2.0 ATR15m, 1.25 ATR1h)'
                      : isV31
                        ? '2.0'
                        : '1.5'
                  }
                >
                  <option>2.0 ATR</option>
                  <option>1.5 ATR</option>
                  <option>max(2.0 ATR15m, 1.25 ATR1h)</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-target">目标 R</label>
                <select
                  id="backtest-target"
                  defaultValue={isV32 ? 'TP1 1R / TP2 2R' : '2.0'}
                >
                  <option>2.0 R</option>
                  <option>1.5 R</option>
                  <option>TP1 1R / TP2 2R</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-holding">最大持仓</label>
                <select
                  id="backtest-holding"
                  defaultValue={isV32 ? '32 根无进展 / 最多672根' : '8'}
                >
                  <option>8 根 K 线</option>
                  <option>12 根 K 线</option>
                  <option>32 根无进展 / 最多672根</option>
                </select>
              </div>
              <div className="toggle-field">
                <span>计入交易成本</span>
                <button
                  type="button"
                  aria-label="是否计入交易成本"
                  aria-pressed={costs}
                  className={`toggle ${costs ? 'on' : ''}`}
                  onClick={() => setCosts(!costs)}
                >
                  <span />
                </button>
              </div>
            </div>
            <div className={`cost-warning ${costs ? 'enabled' : ''}`}>
              {costs ? <Check size={15} /> : <AlertTriangle size={15} />}{' '}
              {costs
                ? '成本开关已打开；当前页面展示的是本地基准报告，需重新生成报告才能反映新成本。'
                : '基准报告尚未计入手续费、滑点和资金费率。'}
            </div>
            <Button
              className="full-button"
              onClick={runBacktest}
              disabled={running}
            >
              {running ? (
                <RefreshCw className="spin" size={15} />
              ) : (
                <Play size={15} />
              )}{' '}
              {running ? '回测中…' : '运行离线回测'}
            </Button>
          </CardContent>
        </Card>
        <Card className="backtest-result-card">
          <CardHeader className="card-heading-row">
            <div>
              <CardTitle>结果摘要</CardTitle>
              <CardDescription>
                {isV32 || isV31 || isV28 || isV27
                  ? `${metrics.trades} 笔交易 · 一年期核心八币种 · 零成本`
                  : `${metrics.trades} 笔交易 · 约 41 天零成本回放`}
              </CardDescription>
            </div>
            <Badge className="status-badge warning">
              {isV321
                ? '冻结观察'
                : isV32
                  ? '年度 HOLD'
                  : isV31
                    ? '前向模拟'
                    : isV28
                      ? '样本外复核中'
                      : isV27
                        ? '年度未通过'
                        : '需要复核'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="result-metrics">
              <div>
                <span>复合收益</span>
                <strong>{metrics.compound}</strong>
              </div>
              <div>
                <span>利润因子</span>
                <strong>{metrics.profitFactor}</strong>
              </div>
              <div>
                <span>胜率</span>
                <strong>{metrics.winRate}</strong>
              </div>
              <div>
                <span>最大回撤</span>
                <strong className="negative-text">{metrics.drawdown}</strong>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={205}>
              <AreaChart
                data={chartData}
                margin={{ top: 14, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  vertical={false}
                  stroke="#ebe7df"
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#918d84', fontSize: 10 }}
                />
                <YAxis
                  domain={
                    isV321
                      ? [95, 130]
                      : isV32
                        ? [85, 125]
                        : isV31
                          ? [95, 115]
                          : isV28
                            ? [95, 115]
                            : isV27
                              ? [75, 105]
                              : [95, 125]
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#918d84', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e6e0d5',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#b87527"
                  fill="#f3dfc3"
                  fillOpacity={0.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      {(isV32 || isV31 || isV28 || isV27) && (
        <Card className="exit-card">
          <CardHeader>
            <CardTitle>
              {isV321 ? '年度候选筛选 · 结论' : '年度独立验证 · 结论'}
            </CardTitle>
            <CardDescription>
              {isV321
                ? v321AnnualValidation.period
                : isV32
                  ? v32AnnualValidation.period
                  : isV31
                    ? v31AnnualValidation.period
                    : isV28
                      ? v28AnnualValidation.period
                      : v27AnnualValidation.period}
              ；
              {isV321
                ? v321AnnualValidation.source
                : isV32
                  ? v32AnnualValidation.source
                  : isV31
                    ? v31AnnualValidation.source
                    : isV28
                      ? v28AnnualValidation.source
                      : v27AnnualValidation.source}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="result-metrics">
              <div>
                <span>主测试</span>
                <strong>
                  {isV321
                    ? v321AnnualValidation.primary.trades
                    : isV32
                      ? v32AnnualValidation.primary.trades
                      : isV31
                        ? v31AnnualValidation.primary.trades
                        : isV28
                          ? v28AnnualValidation.primary.trades
                          : v27AnnualValidation.primary.trades}{' '}
                  笔
                </strong>
              </div>
              <div>
                <span>全篮子复核</span>
                <strong>
                  {isV321
                    ? v321AnnualValidation.broad.trades
                    : isV32
                      ? v32AnnualValidation.broad.trades
                      : isV31
                        ? v31AnnualValidation.broad.trades
                        : isV28
                          ? v28AnnualValidation.broad.trades
                          : v27AnnualValidation.broad.trades}{' '}
                  笔
                </strong>
              </div>
              <div>
                <span>全篮子 PF</span>
                <strong>
                  {isV321
                    ? `${v321AnnualValidation.broad.riskProfitFactor} 等风险 / ${v321AnnualValidation.broad.rawProfitFactor} 原始`
                    : isV32
                      ? v32AnnualValidation.broad.profitFactor
                      : isV31
                        ? v31AnnualValidation.broad.profitFactor
                        : isV28
                          ? v28AnnualValidation.broad.profitFactor
                          : v27AnnualValidation.broad.profitFactor}
                </strong>
              </div>
              {isV321 ? (
                <div>
                  <span>前后半年等风险 PF</span>
                  <strong>1.381 / 1.333</strong>
                </div>
              ) : isV32 ? (
                <div>
                  <span>前后半年 PF</span>
                  <strong className="negative-text">
                    0.735 / 1.060（核心）
                  </strong>
                </div>
              ) : (
                <div>
                  <span>100x 近似爆仓</span>
                  <strong className="negative-text">
                    {isV31
                      ? v31AnnualValidation.stress100x.liquidations
                      : isV28
                        ? v28AnnualValidation.stress100x.liquidations
                        : v27AnnualValidation.stress100x.liquidations}{' '}
                    /{' '}
                    {isV31
                      ? v31AnnualValidation.stress100x.rate
                      : isV28
                        ? v28AnnualValidation.stress100x.rate
                        : v27AnnualValidation.stress100x.rate}
                  </strong>
                </div>
              )}
            </div>
            <div className="cost-warning">
              <AlertTriangle size={15} /> 四个时间段 PF：
              {isV321
                ? v321AnnualValidation.quarterlyRiskProfitFactors
                : isV32
                  ? v32AnnualValidation.quarterlyProfitFactors
                  : isV31
                    ? v31AnnualValidation.quarterlyProfitFactors
                    : isV28
                      ? v28AnnualValidation.quarterlyProfitFactors
                      : v27AnnualValidation.quarterlyProfitFactors}
              。
              {isV321
                ? `V32.1 保留 359 笔（原 V32 的 75.58%），胜率 55.99%；全篮子等风险 PF 1.357、原始 PF 1.232。${v321AnnualValidation.halfYear.broad}；核心为 ${v321AnnualValidation.halfYear.core}。第四段等风险 PF 仅 1.066，且规则从同一年度样本中选出，所以只能冻结前向观察。`
                : isV32
                  ? `V32 的预先声明门槛为全篮子 PF ≥ 1.15、两半各 PF ≥ 1.05，且每半至少 75 笔；实际全篮子为 ${v32AnnualValidation.halfYear.broad}，核心为 ${v32AnnualValidation.halfYear.core}。因此页面只允许研究观察，不把它标成可执行策略。`
                  : isV31
                    ? 'V31 的规则门槛通过，但参数与本次复核使用同一年度样本；核心第三季度 PF 仅 0.613，必须先做新的前向模拟。'
                    : isV28
                      ? 'v28 的整体指标优于 v27，但核心样本量较小，且仍未完成独立样本外验证；不应按当前规则开仓或使用 100x。'
                      : '核心主测试与跨篮子复核均未显示稳定正期望；不应按当前规则开仓或使用 100x。'}
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="exit-card">
        <CardHeader>
          <CardTitle>退出原因分布</CardTitle>
          <CardDescription>当前报告的目标、止损和时间退出次数</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={currentExitBreakdown}
              layout="vertical"
              margin={{ top: 5, right: 25, left: 25, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 6"
                horizontal={false}
                stroke="#ebe7df"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#918d84', fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6f6a61', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #e6e0d5',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#b87527" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}

function TradingViewBacktest({
  setToast,
}: {
  setToast: (message: string) => void;
}) {
  return (
    <>
      <SectionHeading
        kicker="TradingView import"
        title="Rank Pullback Strategy · V1"
        description="这套策略已从 Pine Script v6 导入策略库；当前先展示规则与参数，尚未生成与 Gate 报告同口径的本地回测。"
      />
      <div className="strategy-hero">
        <div>
          <div className="version-row">
            <Badge className="version-badge">PINE v6 · IMPORTED</Badge>
            <span className="muted-label">当前图表 + 4 个对比标的</span>
          </div>
          <h2>横截面强弱过滤</h2>
          <p>
            策略运行在 TradingView 当前图表标的上，通过 request.security 读取
            AMZN、NVDA、MSFT、TSLA 的同周期收益率进行 5 标的排名。
          </p>
        </div>
        <Button
          onClick={() =>
            setToast('TradingView V1 已选中，可复制到 TradingView 使用')
          }
        >
          <Check size={15} /> 已选中
        </Button>
      </div>
      <div className="strategy-layout">
        <Card className="rules-card">
          <CardHeader>
            <CardTitle>策略逻辑</CardTitle>
            <CardDescription>
              来自 Rank Pullback Strategy — V1.pine
            </CardDescription>
          </CardHeader>
          <CardContent className="rule-list">
            <div className="rule-item">
              <span className="rule-index">01</span>
              <span className="rule-icon">
                <Gauge size={16} />
              </span>
              <div>
                <strong>五标的强弱排名</strong>
                <p>
                  当前标的与 4 个手动设置的对比标的比较 16 根 K
                  线收益率；多头取强势前 N 名，空头取弱势前 N 名。
                </p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-index">02</span>
              <span className="rule-icon">
                <TrendingDown size={16} />
              </span>
              <div>
                <strong>趋势与回踩</strong>
                <p>
                  多头要求 close &gt; EMA20 &gt; EMA50 &gt;
                  EMA200；空头反向排列，并检查 EMA20 / VWAP 回踩或反弹。
                </p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-index">03</span>
              <span className="rule-icon">
                <Target size={16} />
              </span>
              <div>
                <strong>收盘确认突破</strong>
                <p>
                  多头收盘突破前一根高点，空头收盘跌破前一根低点，并要求成交量不低于
                  20 根均量的 80%。
                </p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-index">04</span>
              <span className="rule-icon">
                <ShieldCheck size={16} />
              </span>
              <div>
                <strong>仓位与退出</strong>
                <p>
                  禁止加仓；止损 1.5 ATR，止盈 2R，最长持仓 8 根 K
                  线，支持做空。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="params-card">
          <CardHeader>
            <CardTitle>V1 参数快照</CardTitle>
            <CardDescription>可在 TradingView 输入面板调整</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="params-list">
              <div>
                <dt>初始资金</dt>
                <dd>10,000</dd>
              </div>
              <div>
                <dt>手续费</dt>
                <dd>0%</dd>
              </div>
              <div>
                <dt>滑点</dt>
                <dd>0 ticks</dd>
              </div>
              <div>
                <dt>排名回看</dt>
                <dd>16 根 K 线</dd>
              </div>
              <div>
                <dt>进入前 N</dt>
                <dd>2</dd>
              </div>
              <div>
                <dt>对比标的</dt>
                <dd>AMZN / NVDA</dd>
              </div>
              <div>
                <dt>最长持仓</dt>
                <dd>8 根 K 线</dd>
              </div>
              <div>
                <dt>处理订单</dt>
                <dd>非收盘成交</dd>
              </div>
            </dl>
            <Button
              variant="outline"
              className="full-button"
              onClick={() => setToast('参数已复制到剪贴板的功能将在下一版接入')}
            >
              <Download size={15} /> 导出参数说明
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="strategy-notice">
        <AlertTriangle size={15} /> 风险提示：Pine 源码设置手续费和滑点为
        0；使用前请在 TradingView
        策略测试器中补齐真实成本，并确认对比标的属于同一市场与合约类型。
      </div>
    </>
  );
}

function BacktestPage({
  setToast,
  strategy,
}: {
  setToast: (message: string) => void;
  strategy: StrategyKey;
}) {
  return strategy === 'rank-v1' ? (
    <TradingViewBacktest setToast={setToast} />
  ) : (
    <GateBacktestPage setToast={setToast} strategy={strategy} />
  );
}

function LeverageStressPage() {
  return (
    <>
      <SectionHeading
        kicker="Leverage stress test"
        title="杠杆压力测试"
        description="V31 核心八币种的零成本近似压力测试；均按要求忽略手续费、滑点与资金费率。"
      />
      <div className="risk-banner">
        <AlertTriangle size={17} />
        <div>
          <strong>研究结论</strong>
          <span>
            V31 在 20x、40x、60x、100x 下的近似爆仓率为 0%、1.05%、9.95% 和
            55.50%；100x 明确不通过，20x 也只是压力测试上限，不是开仓建议。
          </span>
        </div>
        <ShieldCheck size={17} />
      </div>
      <div className="stress-grid">
        {leverageTests.map((test) => (
          <Card className="stress-card" key={test.key}>
            <CardHeader>
              <div className="card-heading-row">
                <div>
                  <CardTitle>{test.label}</CardTitle>
                  <CardDescription>{test.universe}</CardDescription>
                </div>
                <Badge
                  className={`status-badge ${test.tone === 'warning' ? 'warning' : 'danger'}`}
                >
                  {test.tone === 'warning' ? '相对最低风险' : '高风险'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="stress-metrics">
                <div>
                  <span>交易数</span>
                  <strong>{test.trades}</strong>
                </div>
                <div>
                  <span>平均单笔净收益</span>
                  <strong
                    className={
                      test.key === 'leverage-20x'
                        ? 'change-positive'
                        : 'negative-text'
                    }
                  >
                    {test.average}
                  </strong>
                </div>
                <div>
                  <span>利润因子</span>
                  <strong
                    className={
                      test.key === 'leverage-20x'
                        ? 'change-positive'
                        : 'negative-text'
                    }
                  >
                    {test.profitFactor}
                  </strong>
                </div>
                <div>
                  <span>近似爆仓占比</span>
                  <strong className="negative-text">{test.liquidation}</strong>
                </div>
              </div>
              <div className="stress-foot">
                <span>序列复合收益</span>
                <strong>{test.compound}</strong>
                <span>{test.foldRange}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="strategy-layout stress-lower">
        <Card className="rules-card">
          <CardHeader>
            <CardTitle>建议提取</CardTitle>
            <CardDescription>
              V31 年度核心八币种，隔离保证金近似模型
            </CardDescription>
          </CardHeader>
          <CardContent className="rule-list">
            <div className="rule-item">
              <span className="rule-index">01</span>
              <span className="rule-icon">
                <ShieldCheck size={16} />
              </span>
              <div>
                <strong>20x 仍只作为压力上限</strong>
                <p>
                  V31 在 20x 下无近似爆仓，但按逐笔序列复合仍为
                  -60.06%；不能据此直接开实盘仓位。
                </p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-index">02</span>
              <span className="rule-icon">
                <AlertTriangle size={16} />
              </span>
              <div>
                <strong>杠杆越高，爆仓越集中</strong>
                <p>
                  V31 年度核心样本中，20x、40x、60x、100x 的近似爆仓占比分别为
                  0%、1.05%、9.95% 和 55.50%；杠杆放大的是尾部风险，不是稳定性。
                </p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-index">03</span>
              <span className="rule-icon">
                <FlaskConical size={16} />
              </span>
              <div>
                <strong>年度验证未通过，先停止部署</strong>
                <p>
                  V31 的规则筛选虽然通过，但核心第三季度 PF 仅
                  0.613，且参数选择与复核仍在同一年度；
                  下一步应冻结参数，先做新的前向模拟和成本敏感性测试。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="params-card">
          <CardHeader>
            <CardTitle>测试口径</CardTitle>
            <CardDescription>可复现的压力假设</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="params-list">
              <div>
                <dt>数据</dt>
                <dd>Gate 公共 15m</dd>
              </div>
              <div>
                <dt>历史窗口</dt>
                <dd>全年回测 · 实时220根</dd>
              </div>
              <div>
                <dt>手续费</dt>
                <dd>忽略</dd>
              </div>
              <div>
                <dt>滑点</dt>
                <dd>忽略</dd>
              </div>
              <div>
                <dt>资金费率</dt>
                <dd>忽略</dd>
              </div>
              <div>
                <dt>爆仓模型</dt>
                <dd>孤立保证金近似</dd>
              </div>
              <div>
                <dt>自动下单</dt>
                <dd>关闭</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StrategyPage({
  setToast,
  strategy,
  onSelect,
}: {
  setToast: (message: string) => void;
  strategy: StrategyKey;
  onSelect: (strategy: StrategyKey) => void;
}) {
  const picker = (
    <div className="strategy-picker">
      <span>策略库</span>
      {(
        Object.entries(strategyCatalog) as Array<
          [StrategyKey, (typeof strategyCatalog)[StrategyKey]]
        >
      ).map(([key, item]) => (
        <button
          key={key}
          className={strategy === key ? 'selected' : ''}
          onClick={() => onSelect(key)}
        >
          <span className="asset-dot amber" />
          {item.name} <small>{item.version}</small>
        </button>
      ))}
    </div>
  );
  if (strategy === 'rank-v1')
    return (
      <>
        {picker}
        <TradingViewBacktest setToast={setToast} />
      </>
    );
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const isV31 = strategy === 'rank-v31';
  const isV28 = strategy === 'rank-v28';
  const isV27 = strategy === 'rank-v27';
  const isV26 = strategy === 'rank-v26';
  const rules = isV321
    ? strategyRulesV321
    : isV32
      ? strategyRulesV32
      : isV31
        ? strategyRulesV31
        : isV28
          ? strategyRulesV28
          : isV27
            ? strategyRulesV27
            : isV26
              ? strategyRulesV26
              : strategyRulesV25;
  const selected = strategyCatalog[strategy];
  return (
    <>
      {picker}
      <SectionHeading
        kicker="Strategy registry"
        title="策略版本"
        description={
          isV321
            ? 'v32.1 是独立的 PF 平衡候选，V31 与 V32 都保留。它只增加均量参与确认和新的分批比例；当前约束通过后参数冻结，仅允许前向观察。'
            : isV32
              ? 'v32 是独立的多周期波段候选，保留 v31 作为短线版本。它使用真实已收盘 4H / 1H 上下文，但一年期前后半年稳定性未通过，因此仅允许研究观察。'
              : isV31
                ? 'v31 已替换为当前主策略：不合格流动性合约直接剔除，只对合格美股永续与主流加密进行排名；年度规则筛选通过，仍需前向模拟。'
                : isV28
                  ? 'v28 是基于 v27 诊断结果独立生成的质量带版本，年度代理数据已有改善，但核心样本量仍需扩大。'
                  : isV27
                    ? 'v27 的短样本表现较好，但年度独立验证没有通过；当前仅作为规则研究保留。'
                    : isV26
                      ? 'v26 已完成与 v25 的同数据对照，作为宽松候选保留。'
                      : 'v25 作为旧版基线保留，用于比较过滤规则和风险变化。'
        }
      />
      <div className="strategy-hero">
        <div>
          <div className="version-row">
            <Badge className="version-badge">
              {isV321
                ? 'v32.1 · PF BALANCED MTF'
                : isV32
                  ? 'v32 · CLOSED-CANDLE MTF'
                  : isV31
                    ? 'v31 · BALANCED EXTENSION'
                    : isV28
                      ? 'v28 · QUALITY BAND'
                      : isV27
                        ? 'v27 · PRECISION'
                        : isV26
                          ? 'v26 · CANDIDATE'
                          : 'v25 · BASELINE'}
            </Badge>
            <span className="muted-label">Gate stocks + mainstream crypto</span>
          </div>
          <h2>{selected.name}</h2>
          <p>
            {isV321
              ? 'V32.1 不替换 V31 或 V32。它把触发量门槛从 0.8x 提高到 1.0x，并采用 40%@1R、30%@2R、30% 趋势尾仓。当前年度筛选中，全篮子胜率 55.99%，等风险 PF 1.357、原始 PF 1.232；由于规则已接触本样本，只能冻结前向观察。'
              : isV32
                ? 'V32 不替换 V31：它先以已收盘 4H 的趋势结构决定方向，再要求 1H 回踩和 15m 收盘触发。年度核心 PF 为 0.849、前半年 PF 0.735，未达到预设稳定性标准，所以部署为透明的研究观察而非前向模拟。'
                : isV31
                  ? '在 V28 质量带基础上增加流动性硬过滤：24 小时成交额至少 100 万 USDT、买卖价差不超过 0.30%。合格结果再按排名、趋势、VWAP 和成交量综合成 S+ / S / A / WATCH。'
                  : isV28
                    ? '在 v27 基础上生成的独立策略：保持前后两名和原退出规则，只把 ADX 收窄至 15–25、成交量比收窄至 1.0–1.4。核心八币种一年期 PF 1.161、胜率 46.99%，目前仍只用于观察。'
                    : isV27
                      ? '在 v26 基础上只保留最强和最弱前两名，并限定成交量、ADX 与 ATR。短样本改善未迁移到一年期验证：核心八币种 PF 0.964、胜率 42.00%，因此不具备部署条件。'
                      : isV26
                        ? '在横截面排名基础上增加趋势方向、VWAP 同侧和最大追价距离过滤，信号收盘确认后于下一根 15 分钟 K 线开盘模拟成交。'
                        : '用横截面强弱排名寻找趋势中的回踩延续，信号收盘确认，下一根 15 分钟 K 线开盘模拟成交。'}
          </p>
        </div>
        <Button
          onClick={() =>
            setToast(`${selected.version} 已选为研究版本，自动下单仍关闭`)
          }
        >
          <Check size={15} />{' '}
          {isV321
            ? '冻结观察'
            : isV32
              ? '研究观察'
              : isV31
                ? '前向模拟'
                : isV28
                  ? '样本外复核中'
                  : isV27
                    ? '仅观察'
                    : isV26
                      ? '研究候选'
                      : '对照版本'}
        </Button>
      </div>
      <div className="strategy-layout">
        <Card className="rules-card">
          <CardHeader>
            <CardTitle>信号规则</CardTitle>
            <CardDescription>
              来自{' '}
              {isV321
                ? 'Gate_V32_1_PF_Balanced'
                : isV32
                  ? 'Gate_V32_MTF_Runner'
                  : isV31
                    ? 'Gate_V31_Balanced_Extension'
                    : isV28
                      ? 'Gate_V28_Quality_Band'
                      : isV27
                        ? 'Gate_V27_Precision_Filter'
                        : isV26
                          ? 'Gate_V26_Scanner_Improved'
                          : 'Gate_V25_Scanner_Improved'}
            </CardDescription>
          </CardHeader>
          <CardContent className="rule-list">
            {rules.map(({ title, body, icon: Icon }, index) => (
              <div className="rule-item" key={title}>
                <span className="rule-index">0{index + 1}</span>
                <span className="rule-icon">
                  <Icon size={16} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="params-card">
          <CardHeader>
            <CardTitle>参数快照</CardTitle>
            <CardDescription>
              {isV321
                ? 'V321Config · participation-confirmed'
                : isV32
                  ? 'V32Config · closed-candle-mtf'
                  : isV31
                    ? 'V31Config · balanced-extension'
                    : isV28
                      ? 'V28Config · quality-band'
                      : isV27
                        ? 'V27Config · precision'
                        : isV26
                          ? 'V26Config · guarded'
                          : 'StrategyConfig · v25'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="params-list">
              <div>
                <dt>周期</dt>
                <dd>{isV32 ? '15m 触发 / 1H / 4H' : '15 分钟'}</dd>
              </div>
              <div>
                <dt>EMA</dt>
                <dd>{isV32 ? '4H 50 / 200 · 1H 20 / 50' : '20 / 50 / 200'}</dd>
              </div>
              <div>
                <dt>ATR</dt>
                <dd>
                  {isV32
                    ? 'max(2.0×15m, 1.25×1H)'
                    : isV31
                      ? '14 · 止损 2.0x'
                      : '14 · 止损 1.5x'}
                </dd>
              </div>
              <div>
                <dt>目标</dt>
                <dd>
                  {isV321
                    ? '40%@1R · 30%@2R · 30% 跟踪'
                    : isV32
                      ? '25%@1R · 25%@2R · 余仓跟踪'
                      : '2.0R'}
                </dd>
              </div>
              <div>
                <dt>排名窗口</dt>
                <dd>{isV32 ? '6 根已收盘 4H（24H）' : '16 根 K 线'}</dd>
              </div>
              <div>
                <dt>排名数量</dt>
                <dd>
                  {isV32
                    ? 'Top / Bottom 2'
                    : isV31
                      ? 'Top / Bottom 5（S+ 优先）'
                      : isV27 || isV28
                        ? 'Top / Bottom 2'
                        : 'Top / Bottom 3'}
                </dd>
              </div>
              {(isV32 || isV31 || isV27 || isV28) && (
                <>
                  <div>
                    <dt>成交量比例</dt>
                    <dd>
                      {isV321
                        ? '≥ 1.0x'
                        : isV32
                          ? '≥ 0.8x'
                          : isV31 || isV28
                            ? '1.0–1.4x'
                            : '1.0–2.0x'}
                    </dd>
                  </div>
                  <div>
                    <dt>质量上限</dt>
                    <dd>
                      {isV32
                        ? '4H ADX ≥ 18 · 15m ATR ≤ 4%'
                        : isV31 || isV28
                          ? 'ADX 15–25 · ATR ≤ 2%'
                          : 'ADX ≤ 40 · ATR ≤ 2%'}
                    </dd>
                  </div>
                </>
              )}
              {isV32 && (
                <>
                  <div>
                    <dt>无进展退出</dt>
                    <dd>32 根 15m（8 小时）未到 1R</dd>
                  </div>
                  <div>
                    <dt>余仓跟踪</dt>
                    <dd>已收盘 4H high/low ± 3 ATR</dd>
                  </div>
                </>
              )}
              {isV31 && (
                <>
                  <div>
                    <dt>追价上限</dt>
                    <dd>1.25 ATR</dd>
                  </div>
                  <div>
                    <dt>信号层级</dt>
                    <dd>S+ / S / A / WATCH</dd>
                  </div>
                </>
              )}
              <div>
                <dt>最多持仓</dt>
                <dd>{isV32 ? '672 根 15m（7 天）' : '8 根 K 线'}</dd>
              </div>
              {(isV26 || isV27 || isV28 || isV31 || isV32) && (
                <div>
                  <dt>单笔风险</dt>
                  <dd>
                    {isV32 ? '0.5% · 研究上限 5x' : '0.5% · 杠杆上限 10x'}
                  </dd>
                </div>
              )}
              <div>
                <dt>执行模式</dt>
                <dd>只读模拟</dd>
              </div>
            </dl>
            <Button
              variant="outline"
              className="full-button"
              onClick={() => setToast('参数编辑将在样本外验证接入后开放')}
            >
              <Settings2 size={15} /> 查看参数边界
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="version-history">
        <CardHeader>
          <CardTitle>版本历史</CardTitle>
          <CardDescription>
            保留变更轨迹，避免把优化结果误当成实盘表现。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`history-row ${isV321 ? 'active' : ''}`}>
            <span className={`history-dot ${isV321 ? '' : 'muted'}`} />
            <div>
              <strong>v32.1 · Participation-Confirmed MTF Runner</strong>
              <small>
                冻结候选 · 76 笔核心 / 359 笔全篮子 · 等风险 PF 1.573 / 1.357 ·
                胜率 59.21% / 55.99% · 仍需新数据前向验证
              </small>
            </div>
            <Badge className="status-badge warning">冻结观察</Badge>
          </div>
          <div
            className={`history-row ${strategy === 'rank-v32' ? 'active' : ''}`}
          >
            <span
              className={`history-dot ${strategy === 'rank-v32' ? '' : 'muted'}`}
            />
            <div>
              <strong>v32 · Closed-Candle Multi-Timeframe Runner</strong>
              <small>
                独立波段候选 · 93 笔核心 / 475 笔全篮子 · PF 0.849 / 1.076 ·
                核心前后半年 PF 0.735 / 1.060 · 未通过稳定性门槛
              </small>
            </div>
            <Badge className="status-badge warning">研究观察</Badge>
          </div>
          <div className={`history-row ${isV31 ? 'active' : ''}`}>
            <span className={`history-dot ${isV31 ? '' : 'muted'}`} />
            <div>
              <strong>v31 · Rank Pullback Balanced Extension</strong>
              <small>
                当前主策略 · 191 笔核心 / 894 笔全篮子 · PF 1.172 / 1.228 ·
                核心胜率 49.74% · 最大回撤 -9.19%
              </small>
            </div>
            <Badge className="status-badge success">前向模拟</Badge>
          </div>
          <div className="history-row">
            <span className="history-dot muted" />
            <div>
              <strong>v28 · Rank Pullback Quality Band</strong>
              <small>
                年度代理验证 · 249 笔核心 / 1,212 笔全篮子 · PF 1.161 · 胜率
                46.99% · 最大回撤 -9.64%
              </small>
            </div>
            <Badge className="status-badge warning">历史对照</Badge>
          </div>
          <div className="history-row">
            <span className="history-dot muted" />
            <div>
              <strong>v27 · Rank Pullback Precision</strong>
              <small>
                年度验证未通过 · 862 笔 · PF 0.964 · 胜率 42.00% · 最大回撤
                -34.14%
              </small>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect('rank-v27')}
            >
              打开对照 <ChevronRight size={14} />
            </Button>
          </div>
          <div className="history-row">
            <span className="history-dot muted" />
            <div>
              <strong>v26 · Rank Pullback Guarded</strong>
              <small>研究候选 · PF 1.287 · 最大回撤 -12.92%</small>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect('rank-v26')}
            >
              打开对照 <ChevronRight size={14} />
            </Button>
          </div>
          <div className="history-row">
            <span className="history-dot muted" />
            <div>
              <strong>v25 · Rank Pullback</strong>
              <small>基线对照 · PF 1.114 · 最大回撤 -21.50%</small>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect('rank-v25')}
            >
              打开对照 <ChevronRight size={14} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AlertsPage({ setToast }: { setToast: (message: string) => void }) {
  const [enabled, setEnabled] = useState(true);
  return (
    <>
      <SectionHeading
        kicker="Alert center"
        title="告警中心"
        description="P0 只提示已收盘 4H 的最高优先级方向；P1 只在 15m 完整闭合时生成标准排单提醒。不会自动下单。"
      />
      <div className="alert-grid">
        <Card className="telegram-card">
          <CardHeader>
            <div className="card-title-with-icon">
              <span className="telegram-icon">
                <Send size={17} />
              </span>
              <div>
                <CardTitle>Telegram 通知</CardTitle>
                <CardDescription>P0 方向预警 + P1 15m 标准排单</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="alert-state">
              <span className={`state-dot ${enabled ? 'on' : 'off'}`} />
              <div>
                <strong>{enabled ? '研究告警已启用' : '研究告警已暂停'}</strong>
                <small>
                  {enabled
                    ? 'P0 为 4H 趋势许可；P1 才包含下一根 15m 开盘、止损与分批退出参考。'
                    : '重新开启后才会生成通知。'}
                </small>
              </div>
              <button
                type="button"
                aria-label="启用或暂停研究告警"
                aria-pressed={enabled}
                className={`toggle ${enabled ? 'on' : ''}`}
                onClick={() => setEnabled(!enabled)}
              >
                <span />
              </button>
            </div>
            <div className="secret-placeholder">
              <span>BOT_TOKEN</span>
              <strong>未配置</strong>
              <small>出于安全原因，令牌不会显示在页面。</small>
            </div>
            <div className="alert-actions">
              <Button
                onClick={() => setToast('测试消息已加入本地发送队列')}
                disabled={!enabled}
              >
                <Send size={15} /> 发送测试消息
              </Button>
              <Button
                variant="outline"
                onClick={() => setToast('告警规则设置已打开')}
              >
                <Settings2 size={15} /> 告警规则
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="alert-history">
          <CardHeader>
            <CardTitle>最近事件</CardTitle>
            <CardDescription>本地研究事件流</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="event-row">
              <span className="event-icon green">
                <Zap size={14} />
              </span>
              <div>
                <strong>P0 · 4H 最高优先级</strong>
                <small>仅限强弱排名第一/末位、4H 趋势与 ADX ≥ 22 的已收盘方向；只预警，不开仓。</small>
              </div>
              <span className="event-tag">方向许可</span>
            </div>
            <div className="event-row">
              <span className="event-icon amber">
                <Target size={14} />
              </span>
              <div>
                <strong>P1 · 15m 标准排单</strong>
                <small>4H / 1H / 15m 均已收盘，触发量比合格后才提示；内容包含理论下一根开盘、止损、TP1 与 TP2。</small>
              </div>
              <span className="event-tag warn">执行观察</span>
            </div>
            <div className="event-row">
              <span className="event-icon slate">
                <Pause size={14} />
              </span>
              <div>
                <strong>自动下单</strong>
                <small>交易密钥未接入，执行通道保持关闭</small>
              </div>
              <span className="event-tag muted">关闭</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="alert-safety">
        <ShieldCheck size={17} />
        <div>
          <strong>安全边界</strong>
          <p>
            这个版本不会保存交易密钥、不会提交订单，也不会把本地报告以外的数据伪装成实盘结果。
          </p>
        </div>
        <X size={16} />
      </div>
    </>
  );
}

export default function Home() {
  const [activeNav, setActiveNav] = useState<Page>('总览');
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyKey>('rank-v31');
  const [instruments, setInstruments] =
    useState<Instrument[]>(initialInstruments);
  const [scanStats, setScanStats] = useState<ScanStats>(initialScanStats);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [dataState, setDataState] = useState<DataState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  const runRefresh = useCallback(
    async (notify = true) => {
      setRefreshing(true);
      if (notify) setToast('正在读取 Gate 最新公开行情…');
      try {
        const result = await loadLiveInstruments(selectedStrategy);
        setInstruments(result.rows);
        setScanStats(result.stats);
        setClosedAt(result.closedAt);
        setLastUpdatedAt(new Date());
        setDataState('live');
        if (notify) setToast('扫描完成：实时行情已更新');
      } catch (error) {
        console.error(error);
        setDataState('error');
        if (notify) setToast('Gate 行情连接失败，已保留上次数据');
      } finally {
        setRefreshing(false);
        if (notify) window.setTimeout(() => setToast(''), 2600);
      }
    },
    [selectedStrategy],
  );

  useEffect(() => {
    void runRefresh(false);
    const timer = window.setInterval(() => void runRefresh(false), 60_000);
    return () => window.clearInterval(timer);
  }, [runRefresh]);
  const goTo = (page: Page) => {
    setActiveNav(page);
    setToast(`已打开${page}`);
  };
  const chooseStrategy = (strategy: StrategyKey) => {
    setSelectedStrategy(strategy);
    setDataState('loading');
    setInstruments([]);
    setClosedAt(null);
    setActiveNav('策略版本');
    setToast(
      `${strategyCatalog[strategy].name} ${strategyCatalog[strategy].version} 已选中`,
    );
  };
  const pageContent =
    activeNav === '总览' ? (
      <Overview
        goTo={goTo}
        setToast={setToast}
        strategy={selectedStrategy}
        instruments={instruments}
        closedAt={closedAt}
        dataState={dataState}
        scanStats={scanStats}
      />
    ) : activeNav === '市场扫描' ? (
      <ScannerPage
        setToast={setToast}
        strategy={selectedStrategy}
        instruments={instruments}
        closedAt={closedAt}
        dataState={dataState}
        refresh={() => void runRefresh(true)}
        scanStats={scanStats}
      />
    ) : activeNav === '回测实验室' ? (
      <BacktestPage setToast={setToast} strategy={selectedStrategy} />
    ) : activeNav === '杠杆压力测试' ? (
      <LeverageStressPage />
    ) : activeNav === '策略版本' ? (
      <StrategyPage
        setToast={setToast}
        strategy={selectedStrategy}
        onSelect={chooseStrategy}
      />
    ) : (
      <AlertsPage setToast={setToast} />
    );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <ChartNoAxesCombined size={19} />
          </div>
          <div>
            <p className="brand-name">GATE QUANT LAB</p>
            <p className="brand-subtitle">Research console</p>
          </div>
        </div>
        <div className="sidebar-section-label">工作台</div>
        <nav className="sidebar-nav" aria-label="主导航">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? 'active' : ''}`}
              onClick={() => setActiveNav(label)}
            >
              <Icon size={17} strokeWidth={activeNav === label ? 2.3 : 1.8} />
              <span>{label}</span>
              {label === '告警中心' && <span className="nav-count">2</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label">策略库</div>
        <div className="asset-list">
          <button
            className={`asset-item ${selectedStrategy === 'rank-v321' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v321')}
          >
            <span className="asset-dot violet" />
            Participation-Confirmed MTF{' '}
            <span className="asset-version">v32.1</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v32' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v32')}
          >
            <span className="asset-dot violet" />
            Closed-Candle MTF Runner <span className="asset-version">v32</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v31' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v31')}
          >
            <span className="asset-dot amber" />
            Rank Pullback Balanced Extension{' '}
            <span className="asset-version">v31</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v28' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v28')}
          >
            <span className="asset-dot amber" />
            Rank Pullback Quality Band{' '}
            <span className="asset-version">v28</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v27' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v27')}
          >
            <span className="asset-dot amber" />
            Rank Pullback Precision <span className="asset-version">v27</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v26' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v26')}
          >
            <span className="asset-dot amber" />
            Rank Pullback Guarded <span className="asset-version">v26</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v25' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v25')}
          >
            <span className="asset-dot amber" />
            Rank Pullback <span className="asset-version">v25</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v1' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v1')}
          >
            <span className="asset-dot violet" />
            Rank Pullback Strategy <span className="asset-version">V1</span>
          </button>
          <button
            className="asset-item"
            onClick={() => setToast('BTC Trend Scout 尚未接入报告')}
          >
            <span className="asset-dot blue" />
            BTC Trend Scout
          </button>
          <button
            className="asset-item"
            onClick={() => setToast('US Equity Factors 尚未接入报告')}
          >
            <span className="asset-dot blue" />
            US Equity Factors
          </button>
        </div>
        <div className="sidebar-footer">
          <div className="status-pill">
            <span className="pulse-dot" /> Scanner online
          </div>
          <p className="footer-note">
            仅用于研究与模拟
            <br />
            自动下单：已关闭
          </p>
        </div>
      </aside>
      <section className="main-panel">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              <span>工作台</span>
              <ChevronRight size={13} />
              <strong>{activeNav}</strong>
            </p>
            <h1>{activeNav === '总览' ? '策略研究总览' : activeNav}</h1>
          </div>
          <div className="topbar-actions">
            <div className="data-status">
              <span className="pulse-dot" />
              <span>Gate Public API</span>
              <small>
                {dataState === 'loading'
                  ? '连接中'
                  : dataState === 'error'
                    ? '连接失败'
                    : `更新于 ${formatChinaClock(lastUpdatedAt)} 北京`}
              </small>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runRefresh(true)}
              disabled={refreshing}
              className="refresh-button"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />{' '}
              {refreshing ? '刷新中' : '刷新数据'}
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="设置"
              onClick={() => setToast('设置页将在接入权限后开放')}
            >
              <Settings2 size={16} />
            </Button>
          </div>
        </header>
        <div className="content-wrap">
          {pageContent}
          <footer className="page-footer">
            <span>
              Gate Quant Lab · V31 short-term + V32 / V32.1 MTF research
            </span>
            <span>
              <ShieldCheck size={14} /> 不构成投资建议
            </span>
            <span>
              <Send size={14} /> Telegram alerts
            </span>
          </footer>
        </div>
      </section>
      {toast && (
        <output className="toast">
          <span className="toast-mark">
            <ShieldCheck size={14} />
          </span>
          {toast}
        </output>
      )}
    </main>
  );
}
