'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
type HoldingStage = 'WAIT' | 'QUICK' | 'INTRADAY' | 'SWING';
type EntryState =
  | 'READY'
  | 'RESEARCH_REJECTED'
  | 'OVEREXTENDED'
  | 'WAIT_BREAKOUT'
  | 'WAIT_PULLBACK'
  | 'WAIT_CONFIRM'
  | 'INVALIDATED'
  | 'EXPIRED'
  | 'NO_BIAS';
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
  timeframe?: 'V31' | 'V32' | 'V32.1' | 'V33' | 'V34' | 'V36' | 'V37';
  regimeClosedAt?: number;
  setup?: string;
  stop?: string;
  tp1?: string;
  tp2?: string;
  trail?: string;
  h4Priority?: H4Priority;
  h1Trend?: Signal;
  h4Trend?: Signal;
  holdingStage?: HoldingStage;
  holdingWindow?: string;
  holdingReason?: string;
  holdingUpgrade?: string;
  bias?: Signal;
  entryState?: EntryState;
  entryReason?: string;
  extensionAtr?: number;
  regime?: 'TREND' | 'RANGE' | 'TRANSITION';
  regimeDirection?: Signal;
  regimeEfficiency?: number;
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
  | 'rank-v37'
  | 'rank-v36'
  | 'rank-v34'
  | 'rank-v33'
  | 'rank-v321'
  | 'rank-v32'
  | 'rank-v31'
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
  'rank-v37': {
    name: 'Guarded Reclaim',
    version: 'v37',
    source: 'Gate V37 Guarded Reclaim',
    market: '40 个主流加密代理回测；Gate 实时行情只读',
    summary:
      '4H 状态＋15m 正常回踩或异常波动冷静收复，并预留事件否决接口。全年与冻结后段均未通过，只读展示，不生成开单许可。',
    mode: '年度未通过 · 失败研究观察',
  },
  'rank-v36': {
    name: 'Composite Regime Research',
    version: 'v36',
    source: 'Gate V36 Composite Regime',
    market: '40 个主流加密代理回测；Gate 实时行情仅作状态观察',
    summary:
      '4H 市场状态先区分趋势、震荡与过渡，再由 15m 价格回撤触发；年度联合目标未通过，只读展示，不生成开单许可。',
    mode: '年度未通过 · 透明研究观察',
  },
  'rank-v34': {
    name: 'Five-Minute Confirmation',
    version: 'v34',
    source: 'Gate V34 Five-Minute Confirm',
    market: '40 个主流加密代理回测；Gate 实时行情仅作观察',
    summary:
      '15m 登记首次回踩候选，再用随后 3 根已收盘 5m K 线确认。频率达到目标，但胜率与盈利因子均未通过。',
    mode: '年度未通过 · 禁止作为开单依据',
  },
  'rank-v33': {
    name: 'First Pullback Reclaim',
    version: 'v33',
    source: 'Gate V33 First Pullback',
    market: '流动性合格美股永续 + 主流加密 · Gate Public API',
    summary:
      '顺势首次回踩：先突破 12 根整理区，再等第一次回踩与收盘重夺；趋势方向和现在能否开单完全分开。',
    mode: '目标未通过 · 独立研究观察',
  },
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
  'rank-v37': {
    trades: 196,
    compound: '+5.46%',
    profitFactor: '1.123',
    winRate: '51.53%',
    drawdown: '-7.26%',
    exits: [
      { name: '跟踪 / 保本', value: 88 },
      { name: '结构止损', value: 77 },
      { name: '8根无进展', value: 19 },
      { name: '跳空止损', value: 10 },
      { name: '最长持仓退出', value: 2 },
    ],
  },
  'rank-v36': {
    trades: 1143,
    compound: '+9.05%',
    profitFactor: '1.030',
    winRate: '49.87%',
    drawdown: '-20.87%',
    exits: [
      { name: '盈利交易', value: 570 },
      { name: '亏损交易', value: 572 },
      { name: '保本交易', value: 1 },
    ],
  },
  'rank-v34': {
    trades: 1094,
    compound: '-99.11%',
    profitFactor: '0.823',
    winRate: '43.24%',
    drawdown: '-99.29%',
    exits: [
      { name: '目标 1.2R', value: 377 },
      { name: '结构止损', value: 523 },
      { name: '2h 时间退出', value: 194 },
    ],
  },
  'rank-v33': {
    trades: 258,
    compound: '+149.98%*',
    profitFactor: '1.157',
    winRate: '51.16%',
    drawdown: '-43.02%',
    exits: [
      { name: '目标 1.2R', value: 117 },
      { name: '结构止损', value: 118 },
      { name: '4h 时间退出', value: 23 },
    ],
  },
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

const v33AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15m / 已收盘 1H、4H',
  source: '40 个 Bybit USDT 永续公开 K 线代理；不是 Gate 成交或美股现货验证',
  decision: 'FAIL · 未达到 65% / 1.6 / 每天 2 笔，独立研究观察',
  full: {
    trades: 258,
    tradesPerDay: '0.78',
    profitFactor: '1.157',
    winRate: '51.16%',
    compound: '+149.98%*',
    drawdown: '-43.02%',
  },
  secondHalf: {
    trades: 129,
    tradesPerDay: '0.78',
    profitFactor: '1.190',
    winRate: '50.39%',
  },
  target: '胜率 ≥ 65% · PF ≥ 1.6 · 账户成交 ≥ 2 笔/天',
};

const v34AnnualValidation = {
  period: '2025-09-01 至 2026-09-01 · 365 天 · 15m 候选 / 5m 确认',
  source: '40 个 Binance USD-M 永续代理；不是 Gate 成交或美股验证',
  decision: 'FAIL · 频率通过，胜率与 PF 未通过，禁止作为开单依据',
  full: {
    trades: 1094,
    tradesPerDay: '3.00',
    profitFactor: '0.823',
    winRate: '43.24%',
    compound: '-99.11%',
    drawdown: '-99.29%',
    stopOver2Pct: '7.31%',
  },
  target: '胜率 ≥ 65% · PF ≥ 1.6 · 账户成交 ≥ 2 笔/天',
};

const v36AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15m / 已收盘 4H',
  source: '40 个 Bybit USDT 永续公开 K 线代理；不是 Gate 成交或美股验证',
  decision: 'FAIL · 频率通过，胜率与 PF 未通过，只读研究观察',
  full: {
    trades: 1143,
    tradesPerDay: '3.46',
    profitFactor: '1.030',
    winRate: '49.87%',
    compound: '+9.05%',
    drawdown: '-20.87%',
  },
  frozen: {
    trades: 477,
    tradesPerDay: '3.61',
    profitFactor: '1.130',
    winRate: '52.62%',
    compound: '+17.06%',
    drawdown: '-17.54%',
  },
  stress5: {
    trades: 850,
    profitFactor: '0.992',
    winRate: '50.47%',
    compound: '-19.19%',
    drawdown: '-90.25%',
  },
  target: '胜率 ≥ 65% · PF ≥ 1.6 · 账户成交 ≥ 2 笔/天',
};

const v37AnnualValidation = {
  period: '2025-09-02 至 2026-09-02 · 365 天 · 15m / 已收盘 4H',
  source: '40 个 Bybit USDT 永续公开 K 线代理；不是 Gate 成交或美股验证',
  decision: 'FAIL · 频率、胜率、PF 与冻结后段均未通过，不生成开单许可',
  full: {
    trades: 196,
    tradesPerDay: '0.59',
    profitFactor: '1.123',
    winRate: '51.53%',
    compound: '+5.46%',
    drawdown: '-7.26%',
  },
  frozen: {
    trades: 71,
    tradesPerDay: '0.54',
    profitFactor: '0.888',
    winRate: '49.30%',
    compound: '-1.95%',
    drawdown: '-7.26%',
  },
  stress5: {
    trades: 151,
    profitFactor: '1.107',
    winRate: '52.32%',
    compound: '+62.54%',
    drawdown: '-41.07%',
  },
  eventLayer: 'TradingAgents 式事件否决层仅保留为前向接口；没有时间点一致的历史新闻库，因此未计入回测成绩。',
  target: '胜率 ≥ 65% · PF ≥ 1.6 · 账户成交 ≥ 2 笔/天',
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
  const now = Date.now();
  const cached = gateResponseCache.get(path);
  if (cached?.value !== undefined && cached.expiresAt > now) {
    return cached.value as T;
  }
  if (cached?.promise) return cached.promise as Promise<T>;

  const ttl = gateCacheTtl(path, now);
  const separator = path.includes('?') ? '&' : '?';
  const promise = fetch(`${GATE_API}${path}${separator}_=${now}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    .then((response) => {
      if (!response.ok) throw new Error(`Gate API ${response.status}`);
      return response.json() as Promise<T>;
    })
    .then((value) => {
      gateResponseCache.set(path, {
        value,
        expiresAt: Date.now() + ttl,
      });
      return value;
    })
    .catch((error) => {
      gateResponseCache.delete(path);
      throw error;
    });
  gateResponseCache.set(path, { promise, expiresAt: now + ttl });
  return promise;
}

type GateCacheEntry = {
  value?: unknown;
  promise?: Promise<unknown>;
  expiresAt: number;
};

const gateResponseCache = new Map<string, GateCacheEntry>();

function millisecondsToNextBoundary(now: number, seconds: number) {
  const boundary = seconds * 1000;
  return boundary - (now % boundary) + 5_000;
}

function gateCacheTtl(path: string, now: number) {
  if (path === '/contracts') return 10 * 60_000;
  if (path === '/tickers') return 30_000;
  if (path.includes('interval=4h')) {
    return millisecondsToNextBoundary(now, 4 * 60 * 60);
  }
  if (path.includes('interval=1h')) {
    return millisecondsToNextBoundary(now, 60 * 60);
  }
  if (path.includes('interval=15m')) {
    return millisecondsToNextBoundary(now, 15 * 60);
  }
  return 30_000;
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

function candleAtr(candles: GateCandle[], index: number) {
  const start = Math.max(1, index - 14);
  const ranges: number[] = [];
  for (let cursor = start; cursor <= index; cursor += 1) {
    const candle = candles[cursor];
    const previousClose = Number(candles[cursor - 1].c);
    ranges.push(
      Math.max(
        Number(candle.h) - Number(candle.l),
        Math.abs(Number(candle.h) - previousClose),
        Math.abs(Number(candle.l) - previousClose),
      ),
    );
  }
  return ranges.length
    ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length
    : Number.NaN;
}

function calculateV36Regime(candles: LiveCandle[]) {
  if (candles.length < 60) {
    return {
      regime: 'TRANSITION' as const,
      direction: 'WAIT' as Signal,
      efficiency: 0,
    };
  }
  const closes = candles.map((candle) => candle.close);
  const latest = closes.at(-1)!;
  const ema20Value = ema(closes, 20);
  const ema50Value = ema(closes, 50);
  const recent = closes.slice(-21);
  const path = recent
    .slice(1)
    .reduce((sum, value, index) => sum + Math.abs(value - recent[index]), 0);
  const efficiency = path > 0 ? Math.abs(latest - recent[0]) / path : 0;
  const trueRanges = candles.slice(-120).map((candle, index, values) => {
    const previousClose = index === 0 ? candle.open : values[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });
  const currentAtr =
    trueRanges.slice(-14).reduce((sum, value) => sum + value, 0) /
    Math.max(1, Math.min(14, trueRanges.length));
  const sortedRanges = [...trueRanges].sort((left, right) => left - right);
  const medianRange = sortedRanges[Math.floor(sortedRanges.length / 2)] || currentAtr;
  const atrRatio = medianRange > 0 ? currentAtr / medianRange : 1;
  const direction: Signal =
    latest > ema20Value && ema20Value > ema50Value
      ? 'LONG'
      : latest < ema20Value && ema20Value < ema50Value
        ? 'SHORT'
        : 'WAIT';
  const regime =
    direction !== 'WAIT' && efficiency > 0.35
      ? ('TREND' as const)
      : efficiency < 0.2 && atrRatio <= 2.5
        ? ('RANGE' as const)
        : ('TRANSITION' as const);
  return { regime, direction, efficiency };
}

function evaluateV33Entry(
  candles: GateCandle[],
  direction: Signal,
  rank: number,
  universeSize: number,
  h1Trend: Signal,
  h4Trend: Signal,
  volumeRatio: number,
  vwap: number,
) {
  const latestIndex = candles.length - 1;
  if (direction === 'WAIT') {
    return {
      signal: 'WAIT' as Signal,
      state: 'NO_BIAS' as EntryState,
      reason: '未进入前/后 10 名候选区',
      extensionAtr: 0,
    };
  }
  const sign = direction === 'LONG' ? 1 : -1;
  const finalRank = sign === 1 ? rank <= 5 : rank > universeSize - 5;
  let latestTerminal: EntryState | undefined;

  for (
    let breakout = latestIndex - 1;
    breakout >= Math.max(15, latestIndex - 12);
    breakout -= 1
  ) {
    const prior = candles.slice(breakout - 12, breakout);
    const level =
      sign === 1
        ? Math.max(...prior.map((candle) => Number(candle.h)))
        : Math.min(...prior.map((candle) => Number(candle.l)));
    const breakoutClose = Number(candles[breakout].c);
    if (
      (sign === 1 && breakoutClose <= level) ||
      (sign === -1 && breakoutClose >= level)
    ) {
      continue;
    }

    let pullback = -1;
    let pullbackExtreme = sign === 1 ? Infinity : -Infinity;
    let terminal = false;
    for (let cursor = breakout + 1; cursor <= latestIndex; cursor += 1) {
      const candle = candles[cursor];
      const atr = candleAtr(candles, cursor);
      const close = Number(candle.c);
      const invalid =
        sign === 1 ? close < level - 0.25 * atr : close > level + 0.25 * atr;
      if (invalid) {
        if (cursor === latestIndex) latestTerminal = 'INVALIDATED';
        terminal = true;
        break;
      }
      if (cursor - breakout > 12) {
        if (cursor === latestIndex) latestTerminal = 'EXPIRED';
        terminal = true;
        break;
      }
      if (pullback < 0) {
        const touched =
          sign === 1
            ? Number(candle.l) <= level + 0.35 * atr
            : Number(candle.h) >= level - 0.35 * atr;
        if (!touched) {
          if (cursor === latestIndex) {
            return {
              signal: 'WAIT' as Signal,
              state: 'WAIT_PULLBACK' as EntryState,
              reason: `突破已成立，等待第一次回踩 ${formatMarketNumber(level)}`,
              extensionAtr: Math.max(0, (sign * (close - level)) / atr),
            };
          }
          continue;
        }
        pullback = cursor;
        pullbackExtreme = sign === 1 ? Number(candle.l) : Number(candle.h);
        if (cursor === latestIndex) {
          return {
            signal: 'WAIT' as Signal,
            state: 'WAIT_CONFIRM' as EntryState,
            reason: '第一次回踩已出现，至少等待下一根 15m 收盘确认',
            extensionAtr: Math.max(0, (sign * (close - level)) / atr),
          };
        }
        continue;
      }

      pullbackExtreme =
        sign === 1
          ? Math.min(pullbackExtreme, Number(candle.l))
          : Math.max(pullbackExtreme, Number(candle.h));
      if (cursor - pullback > 3) {
        if (cursor === latestIndex) latestTerminal = 'EXPIRED';
        terminal = true;
        break;
      }
      if (cursor !== latestIndex) continue;

      const previous = candles[cursor - 1];
      const trigger =
        sign === 1
          ? close > Number(previous.h) && close > Number(candle.o)
          : close < Number(previous.l) && close < Number(candle.o);
      const extensionAtr = Math.max(0, (sign * (close - level)) / atr);
      const recentThree = candles.slice(cursor - 2, cursor + 1);
      const sameColor = recentThree.every((item) =>
        sign === 1
          ? Number(item.c) > Number(item.o)
          : Number(item.c) < Number(item.o),
      );
      const impulse =
        sameColor &&
        (sign === 1
          ? (close - Number(recentThree[0].o)) / atr
          : (Number(recentThree[0].o) - close) / atr) > 1.8;
      const aligned =
        h1Trend === direction && h4Trend !== (sign === 1 ? 'SHORT' : 'LONG');
      const quality =
        finalRank &&
        aligned &&
        volumeRatio >= 0.8 &&
        extensionAtr <= 0.8 &&
        !impulse &&
        (sign === 1 ? close >= vwap : close <= vwap);
      if (trigger && quality) {
        const stop =
          sign === 1
            ? pullbackExtreme - 0.1 * atr
            : pullbackExtreme + 0.1 * atr;
        const risk = Math.max(1.25 * atr, sign * (close - stop));
        return {
          signal: direction,
          state: 'READY' as EntryState,
          reason: `首次回踩确认完成，距突破位 ${extensionAtr.toFixed(2)} ATR`,
          extensionAtr,
          stop: close - sign * risk,
          tp1: close + sign * risk * 1.2,
        };
      }
      return {
        signal: 'WAIT' as Signal,
        state:
          extensionAtr > 0.8 || impulse
            ? ('OVEREXTENDED' as EntryState)
            : ('WAIT_CONFIRM' as EntryState),
        reason:
          extensionAtr > 0.8 || impulse
            ? `距突破位 ${extensionAtr.toFixed(2)} ATR 或连续脉冲过强，禁止追单`
            : '首次回踩存在，等待重新突破、前/后 5 名、1H 与量能共同确认',
        extensionAtr,
      };
    }
    if (!terminal) break;
  }

  return {
    signal: 'WAIT' as Signal,
    state: latestTerminal ?? ('WAIT_BREAKOUT' as EntryState),
    reason:
      latestTerminal === 'INVALIDATED'
        ? '候选已跌回整理区，等待新的完整突破'
        : latestTerminal === 'EXPIRED'
          ? '首次回踩窗口已过期，等待新的完整突破'
          : '方向候选成立，等待新的 12 根整理区突破',
    extensionAtr: 0,
  };
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

async function loadLiveInstrumentsV31(
  strategy: 'rank-v31' | 'rank-v33' = 'rank-v31',
) {
  const isV33 = strategy === 'rank-v33';
  const { tickerMap, universe, excluded } = await loadEligibleUniverse();
  const currentCandleStart = Math.floor(Date.now() / 900_000) * 900;

  const calculated = await mapWithConcurrency(
    universe,
    async (instrument) => {
      const { symbol, name, assetClass } = instrument;
      const [candles, raw1h, raw4h] = await Promise.all([
        fetchGateJson<GateCandle[]>(
          `/candlesticks?contract=${encodeURIComponent(symbol)}&interval=15m&limit=220`,
        ),
        fetchGateJson<GateCandle[]>(
          `/candlesticks?contract=${encodeURIComponent(symbol)}&interval=1h&limit=220`,
        ).catch(() => [] as GateCandle[]),
        fetchGateJson<GateCandle[]>(
          `/candlesticks?contract=${encodeURIComponent(symbol)}&interval=4h&limit=220`,
        ).catch(() => [] as GateCandle[]),
      ]);
      const closed = candles
        .filter((candle) => Number(candle.t) < currentCandleStart)
        .sort((a, b) => Number(a.t) - Number(b.t));
      if (closed.length < 60) throw new Error(`${symbol} K 线不足`);

      const latest = closed.at(-1)!;
      const previous = closed.at(-2)!;
      const twoBarsAgo = closed.at(-3)!;
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
      const pullbackWindow = closed.slice(-4, -1);
      const recentThree = closed.slice(-3);
      const recentPullbackLong = pullbackWindow.some(
        (candle) =>
          Number(candle.l) <= Math.max(ema20, vwap) + atr * 0.25 &&
          Number(candle.c) > ema50,
      );
      const recentPullbackShort = pullbackWindow.some(
        (candle) =>
          Number(candle.h) >= Math.min(ema20, vwap) - atr * 0.25 &&
          Number(candle.c) < ema50,
      );
      const freshBreakLong =
        latestClose > Number(previous.h) &&
        Number(previous.c) <= Number(twoBarsAgo.h);
      const freshBreakShort =
        latestClose < Number(previous.l) &&
        Number(previous.c) >= Number(twoBarsAgo.l);
      const extensionLong = atr > 0 ? (latestClose - ema20) / atr : 99;
      const extensionShort = atr > 0 ? (ema20 - latestClose) / atr : 99;
      const impulseLong =
        recentThree.every((candle) => Number(candle.c) > Number(candle.o)) &&
        atr > 0 &&
        (latestClose - Number(recentThree[0].o)) / atr > 1.8;
      const impulseShort =
        recentThree.every((candle) => Number(candle.c) < Number(candle.o)) &&
        atr > 0 &&
        (Number(recentThree[0].o) - latestClose) / atr > 1.8;
      let h1Trend: Signal = 'WAIT';
      let h4Trend: Signal = 'WAIT';
      let h4Adx = 0;
      let regimeClosedAt: number | undefined;
      let v36Regime: 'TREND' | 'RANGE' | 'TRANSITION' = 'TRANSITION';
      let v36RegimeDirection: Signal = 'WAIT';
      let v36RegimeEfficiency = 0;
      try {
        const tf1h = calculateTimeframeSnapshot(
          closedLiveCandles(raw1h, 60 * 60),
          4,
          6,
          false,
        );
        const tf4h = calculateTimeframeSnapshot(
          closedLiveCandles(raw4h, 4 * 60 * 60),
          3,
          6,
          false,
        );
        h1Trend =
          tf1h.latest.close > tf1h.ema20 &&
          tf1h.ema20 > tf1h.ema50 &&
          tf1h.ema50Slope > 0 &&
          tf1h.plusDi > tf1h.minusDi
            ? 'LONG'
            : tf1h.latest.close < tf1h.ema20 &&
                tf1h.ema20 < tf1h.ema50 &&
                tf1h.ema50Slope < 0 &&
                tf1h.minusDi > tf1h.plusDi
              ? 'SHORT'
              : 'WAIT';
        h4Trend =
          tf4h.latest.close > tf4h.ema50 &&
          tf4h.ema50 > tf4h.ema200 &&
          tf4h.ema50Slope > 0 &&
          tf4h.plusDi > tf4h.minusDi
            ? 'LONG'
            : tf4h.latest.close < tf4h.ema50 &&
                tf4h.ema50 < tf4h.ema200 &&
                tf4h.ema50Slope < 0 &&
                tf4h.minusDi > tf4h.plusDi
              ? 'SHORT'
              : 'WAIT';
        h4Adx = tf4h.adx;
        regimeClosedAt = tf4h.latest.time + 4 * 60 * 60;
        const v36State = calculateV36Regime(tf4h.candles);
        v36Regime = v36State.regime;
        v36RegimeDirection = v36State.direction;
        v36RegimeEfficiency = v36State.efficiency;
      } catch {
        // Higher-timeframe context is optional: V31's original 15m signal
        // remains available even when Gate cannot provide enough 1H/4H bars.
      }

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
        h1Trend,
        h4Trend,
        h4Adx,
        regimeClosedAt,
        v36Regime,
        v36RegimeDirection,
        v36RegimeEfficiency,
        recentPullbackLong,
        recentPullbackShort,
        freshBreakLong,
        freshBreakShort,
        extensionLong,
        extensionShort,
        impulseLong,
        impulseShort,
        closedCandles: closed,
      };
    },
    6,
  );

  if (!calculated.length) throw new Error('所有行情标的读取失败');
  const signalBand = Math.min(
    5,
    Math.max(3, Math.floor(calculated.length / 4)),
  );
  const setupBand = isV33
    ? Math.min(10, Math.max(5, Math.floor(calculated.length / 2)))
    : signalBand;
  const ranked = calculated
    .sort((a, b) => b.change - a.change)
    .map((item, index, all) => {
      const rank = index + 1;
      const bias: Signal =
        rank <= setupBand
          ? 'LONG'
          : rank > all.length - setupBand
            ? 'SHORT'
            : 'WAIT';
      const edge =
        all.length > 1
          ? Math.abs((all.length + 1 - 2 * rank) / (all.length - 1))
          : 1;
      const trendAligned = bias !== 'WAIT' && item.trend === bias;
      const vwapAligned =
        bias === 'LONG'
          ? Number(item.price.replace(/,/g, '')) >= item.vwapValue
          : bias === 'SHORT'
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
        bias === 'WAIT'
          ? 'WATCH'
          : score >= 88
            ? 'S+'
            : score >= 75
              ? 'S'
              : 'A';
      const extensionAtr =
        bias === 'LONG'
          ? item.extensionLong
          : bias === 'SHORT'
            ? item.extensionShort
            : 0;
      const isImpulse =
        bias === 'LONG'
          ? item.impulseLong
          : bias === 'SHORT'
            ? item.impulseShort
            : false;
      const hasPullback =
        bias === 'LONG'
          ? item.recentPullbackLong
          : bias === 'SHORT'
            ? item.recentPullbackShort
            : false;
      const hasFreshBreak =
        bias === 'LONG'
          ? item.freshBreakLong
          : bias === 'SHORT'
            ? item.freshBreakShort
            : false;
      const overextended = bias !== 'WAIT' && (extensionAtr > 0.8 || isImpulse);
      const confirmed = trendAligned && vwapAligned && item.volumeRatio >= 0.8;
      const v33Entry = isV33
        ? evaluateV33Entry(
            item.closedCandles,
            bias,
            rank,
            all.length,
            item.h1Trend,
            item.h4Trend,
            item.volumeRatio,
            item.vwapValue,
          )
        : undefined;
      const signal: Signal = v33Entry
        ? v33Entry.signal
        : bias !== 'WAIT' &&
            !overextended &&
            hasPullback &&
            hasFreshBreak &&
            confirmed
          ? bias
          : 'WAIT';
      const entryState: EntryState = v33Entry
        ? v33Entry.state
        : bias === 'WAIT'
          ? 'NO_BIAS'
          : overextended
            ? 'OVEREXTENDED'
            : !hasPullback
              ? 'WAIT_PULLBACK'
              : !hasFreshBreak || !confirmed
                ? 'WAIT_CONFIRM'
                : 'READY';
      const entryReason = v33Entry
        ? v33Entry.reason
        : entryState === 'READY'
          ? `回踩后重新突破，距 EMA20 ${extensionAtr.toFixed(2)} ATR`
          : entryState === 'OVEREXTENDED'
            ? `距 EMA20 ${extensionAtr.toFixed(2)} ATR 或连续脉冲过强，禁止追单`
            : entryState === 'WAIT_PULLBACK'
              ? `${bias === 'LONG' ? '多头' : '空头'}趋势成立，等待回踩 EMA20 / VWAP`
              : entryState === 'WAIT_CONFIRM'
                ? '已出现回踩，等待新突破、趋势与量能共同确认'
                : '未进入强弱排名交易区';
      const intradayQualified =
        bias !== 'WAIT' &&
        score >= 75 &&
        trendAligned &&
        item.volumeRatio >= 1 &&
        item.h1Trend === bias;
      const swingQualified =
        intradayQualified &&
        score >= 88 &&
        item.volumeRatio >= 1.1 &&
        item.h4Trend === bias &&
        item.h4Adx >= 18;
      const holdingStage: HoldingStage =
        bias === 'WAIT'
          ? 'WAIT'
          : swingQualified
            ? 'SWING'
            : intradayQualified
              ? 'INTRADAY'
              : 'QUICK';
      const holdingWindow =
        holdingStage === 'SWING'
          ? '8–48h'
          : holdingStage === 'INTRADAY'
            ? '2–8h'
            : holdingStage === 'QUICK'
              ? '30m–2h'
              : '等待新信号';
      const holdingReason =
        holdingStage === 'SWING'
          ? 'S+ 高分、量能达标，且已收盘 1H / 4H 与 V31 同向'
          : holdingStage === 'INTRADAY'
            ? 'V31 高分、量能达标，已收盘 1H 同向'
            : holdingStage === 'QUICK'
              ? 'V31 排名方向成立，但持仓尚未通过高周期升级'
              : '当前没有方向性开单信号';
      const holdingUpgrade =
        holdingStage === 'SWING'
          ? '每根 4H 收盘复核；方向反转或触发止损即退出'
          : holdingStage === 'INTRADAY'
            ? '4H 收盘同向、ADX ≥ 18、评分 ≥ 88 后升级'
            : holdingStage === 'QUICK'
              ? '1H 收盘同向且量比 ≥ 1.0x 后升级'
              : '等待下一根 15m 收盘重新评分';
      return {
        ...item,
        rank,
        universeSize: all.length,
        signal,
        bias,
        entryState,
        entryReason,
        extensionAtr: v33Entry?.extensionAtr ?? extensionAtr,
        strength,
        score,
        holdingStage,
        holdingWindow,
        holdingReason,
        holdingUpgrade,
        timeframe: isV33 ? ('V33' as const) : ('V31' as const),
        stop: v33Entry?.stop ? formatMarketNumber(v33Entry.stop) : undefined,
        tp1: v33Entry?.tp1 ? formatMarketNumber(v33Entry.tp1) : undefined,
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
    bias: item.bias,
    entryState: item.entryState,
    entryReason: item.entryReason,
    extensionAtr: item.extensionAtr,
    strength: item.strength,
    score: item.score,
    trend: item.trend,
    closedAt: item.closedAt,
    price: item.price,
    atr: item.atr,
    vwap: item.vwap,
    volume: item.volume,
    volumeRatio: item.volumeRatio,
    regimeClosedAt: item.regimeClosedAt,
    h1Trend: item.h1Trend,
    h4Trend: item.h4Trend,
    holdingStage: item.holdingStage,
    holdingWindow: item.holdingWindow,
    holdingReason: item.holdingReason,
    holdingUpgrade: item.holdingUpgrade,
    regime: item.v36Regime,
    regimeDirection: item.v36RegimeDirection,
    regimeEfficiency: item.v36RegimeEfficiency,
  }));

  return {
    rows,
    stats: {
      total: rows.length,
      stocks: rows.filter((item) => item.assetClass === 'US_STOCK').length,
      crypto: rows.filter((item) => item.assetClass === 'CRYPTO').length,
      elite: rows.filter(
        (item) => item.strength === 'S+' && item.signal !== 'WAIT',
      ).length,
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
      const previous4h = candles4h.at(-2)!;
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
      const h4EntryLong =
        h4Long &&
        tf4h.adx >= 22 &&
        tf4h.volumeRatio >= 1 &&
        tf4h.latest.close > previous4h.high &&
        (tf4h.latest.close - tf4h.ema20) / tf4h.atr <= 1.25;
      const h4EntryShort =
        h4Short &&
        tf4h.adx >= 22 &&
        tf4h.volumeRatio >= 1 &&
        tf4h.latest.close < previous4h.low &&
        (tf4h.ema20 - tf4h.latest.close) / tf4h.atr <= 1.25;
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
        h4EntryLong,
        h4EntryShort,
        h1Long,
        h1Short,
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
      // P0 is an independent 4H entry alert, not a prerequisite for the
      // existing 15m model. It is deliberately kept outside V32.1's frozen
      // backtest rule so the reported V32.1 metrics stay intact.
      const h4Priority: H4Priority =
        rank === 1 && item.h4EntryLong
          ? 'P0-LONG'
          : rank === all.length && item.h4EntryShort
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

type LiveScanResult = {
  rows: Instrument[];
  stats: ScanStats;
  closedAt: number;
};

const activeScans = new Map<StrategyKey, Promise<LiveScanResult>>();
const STORED_SCAN_PREFIX = 'gate-quant-lab:scan:v2:';

function readStoredScan(strategy: StrategyKey) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${STORED_SCAN_PREFIX}${strategy}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveScanResult & { updatedAt: number };
    if (!Array.isArray(parsed.rows) || !parsed.stats || !parsed.closedAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeScan(
  strategy: StrategyKey,
  result: LiveScanResult,
  updatedAt: number,
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${STORED_SCAN_PREFIX}${strategy}`,
      JSON.stringify({ ...result, updatedAt }),
    );
  } catch {
    // Storage is an acceleration layer only; live scanning remains available.
  }
}

async function performLiveScan(strategy: StrategyKey) {
  if (strategy === 'rank-v37') {
    const context = await loadLiveInstrumentsV31('rank-v33');
    return {
      ...context,
      rows: context.rows.map((item) => {
        const regimeLabel =
          item.regime === 'TREND'
            ? `4H 趋势${item.regimeDirection === 'LONG' ? '偏多' : item.regimeDirection === 'SHORT' ? '偏空' : ''}`
            : item.regime === 'RANGE'
              ? '4H 震荡'
              : '4H 过渡状态';
        const extension = item.extensionAtr ?? 0;
        const condition =
          item.regime !== 'TREND'
            ? '状态不明确，等待'
            : extension > 0.6
              ? `距参考线 ${extension.toFixed(2)} ATR，超过 0.60 ATR，禁止追价`
              : '位置尚可，但必须等待正常回踩重夺，或异常波动冷静期后的完整收复';
        return {
          ...item,
          timeframe: 'V37' as const,
          signal: 'WAIT' as const,
          bias:
            item.regime === 'TREND'
              ? (item.regimeDirection ?? ('WAIT' as const))
              : ('WAIT' as const),
          strength: 'WATCH' as const,
          entryState: 'RESEARCH_REJECTED' as const,
          entryReason: `${regimeLabel}；${condition}。事件否决层：前向接口待验证。V37年度与冻结后段均未通过，不生成开单许可`,
          holdingStage: 'WAIT' as const,
          holdingWindow: '失败研究',
          holdingReason: condition,
          holdingUpgrade: '只有独立前向样本达到65%胜率、1.6盈利因子与日均2笔后才考虑解锁',
        };
      }),
      stats: { ...context.stats, elite: 0 },
    };
  }
  if (strategy === 'rank-v36') {
    const context = await loadLiveInstrumentsV31('rank-v33');
    return {
      ...context,
      rows: context.rows.map((item) => {
        const regimeLabel =
          item.regime === 'TREND'
            ? `4H 趋势${item.regimeDirection === 'LONG' ? '偏多' : item.regimeDirection === 'SHORT' ? '偏空' : ''}`
            : item.regime === 'RANGE'
              ? '4H 震荡'
              : '4H 过渡状态';
        const condition =
          item.regime === 'TREND'
            ? '只观察15m回踩EMA20/VWAP后重新突破，且乖离≤0.8 ATR、剩余空间≥1.2R'
            : item.regime === 'RANGE'
              ? '当前震荡分支历史PF接近1，暂不允许执行'
              : '等待4H状态明确，不提前猜方向';
        return {
          ...item,
          timeframe: 'V36' as const,
          signal: 'WAIT' as const,
          bias:
            item.regime === 'TREND'
              ? (item.regimeDirection ?? ('WAIT' as const))
              : ('WAIT' as const),
          strength: 'WATCH' as const,
          entryState: 'RESEARCH_REJECTED' as const,
          entryReason: `${regimeLabel}（效率 ${(100 * (item.regimeEfficiency ?? 0)).toFixed(1)}%）；${condition}。V36年度目标未通过，只读观察`,
          holdingStage: 'WAIT' as const,
          holdingWindow: '只读研究',
          holdingReason: condition,
          holdingUpgrade: '只有新样本达到65%胜率和1.6盈利因子后才考虑解锁',
        };
      }),
      stats: { ...context.stats, elite: 0 },
    };
  }
  if (strategy === 'rank-v34') {
    const context = await loadLiveInstrumentsV31('rank-v33');
    return {
      ...context,
      rows: context.rows.map((item) => ({
        ...item,
        timeframe: 'V34' as const,
        signal: 'WAIT' as const,
        strength: 'WATCH' as const,
        entryState: 'RESEARCH_REJECTED' as const,
        entryReason:
          'V34 一年期回测未通过；这里只显示行情背景，不生成开单提示',
      })),
      stats: { ...context.stats, elite: 0 },
    };
  }
  return strategy === 'rank-v32' || strategy === 'rank-v321'
    ? loadLiveInstrumentsV32(strategy)
    : loadLiveInstrumentsV31(strategy === 'rank-v33' ? 'rank-v33' : 'rank-v31');
}

async function loadLiveInstruments(strategy: StrategyKey) {
  const existing = activeScans.get(strategy);
  if (existing) return existing;
  const request = performLiveScan(strategy).finally(() => {
    activeScans.delete(strategy);
  });
  activeScans.set(strategy, request);
  return request;
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

const equityV33 = [
  { time: '2025/10', value: 100.0 },
  { time: '2025/12', value: 110.62 },
  { time: '2026/03', value: 145.08 },
  { time: '2026/06', value: 166.84 },
  { time: '2026/09', value: 249.98 },
];

const equityV34 = [
  { time: '2025/09', value: 100.0 },
  { time: '2025/12', value: 15.27 },
  { time: '2026/03', value: 5.12 },
  { time: '2026/06', value: 5.1 },
  { time: '2026/09', value: 0.9 },
];

const equityV36 = [
  { time: '2025/09', value: 100.0 },
  { time: '2025/12', value: 96.8 },
  { time: '2026/03', value: 92.7 },
  { time: '2026/06', value: 111.4 },
  { time: '2026/09', value: 109.05 },
];

const equityV37 = [
  { time: '2025/09', value: 100.0 },
  { time: '2025/12', value: 103.52 },
  { time: '2026/03', value: 106.96 },
  { time: '2026/06', value: 110.45 },
  { time: '2026/09', value: 105.46 },
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
  { label: '策略版本', icon: SlidersHorizontal },
  { label: '市场扫描', icon: Search },
  { label: '回测实验室', icon: FlaskConical },
  { label: '杠杆压力测试', icon: ShieldCheck },
  { label: '告警中心', icon: Bell },
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

const strategyRulesV33 = [
  {
    title: '12 根整理区首次突破',
    body: '15m 收盘突破此前 12 根 K 线高点或低点时只建立候选，不立即追单；候选方向需进入横截面前/后 10 名。',
    icon: Gauge,
  },
  {
    title: '只等第一次回踩',
    body: '候选最多保留 12 根 15m；首次触及突破位附近 0.35 ATR 后进入确认，收盘跌回结构 0.25 ATR 即失效。',
    icon: Target,
  },
  {
    title: '收盘重夺才可开单',
    body: '回踩后 3 根内必须收盘突破前一根高/低、重新进入前/后 5 名、1H 同向且 4H 不反向，量比至少 0.8x。',
    icon: Zap,
  },
  {
    title: '防追价与冻结结论',
    body: '确认价距突破位不得超过 0.8 ATR；结构止损至少 1.25 ATR、目标 1.2R、最多持有 16 根。年度目标未通过，仅研究观察。',
    icon: ShieldCheck,
  },
];

const strategyRulesV34 = [
  {
    title: '15m 只登记候选',
    body: '沿用 V33 的整理区突破和首次回踩，15m 收盘只建立候选，不把高分或强趋势直接当成开单许可。',
    icon: Gauge,
  },
  {
    title: '3 根已收盘 5m 确认',
    body: '回踩后只观察随后 3 根完整 5m K 线，要求方向重夺、量能与排名条件闭合；理论执行价为下一根 5m 开盘。',
    icon: Target,
  },
  {
    title: '状态优先于评分',
    body: '界面先显示等回踩、等确认、条件满足或失效；99 分只表示趋势背景，不代表胜率，也不允许越过入场状态。',
    icon: Zap,
  },
  {
    title: '冻结失败结论',
    body: '一年期账户口径 1094 笔、3.00 笔/天、胜率 43.24%、PF 0.823。频率通过但质量失败，因此不提供开单信号。',
    icon: ShieldCheck,
  },
];

const strategyRulesV36 = [
  {
    title: '4H 市场状态先行',
    body: '只使用已收盘4H：EMA20/50与20根效率值识别趋势；低效率且无异常波动归为震荡，其余归为过渡状态。',
    icon: TrendingDown,
  },
  {
    title: '趋势分支只做回撤重启',
    body: '横截面前/后10名中，15m先回踩EMA20或VWAP，再收盘突破前一根高/低；距均线不得超过0.8 ATR。',
    icon: Target,
  },
  {
    title: '空间与分批退出',
    body: '入场前要求距离前96根结构高/低至少还有1.2R空间；50%在1R退出、50%在2R退出。',
    icon: Gauge,
  },
  {
    title: '失败结论透明展示',
    body: '全年1143笔、3.46笔/天、胜率49.87%、PF 1.030；冻结后段52.62%/1.130。未达65%/1.6，只读且不发开单许可。',
    icon: ShieldCheck,
  },
];

const strategyRulesV37 = [
  {
    title: '4H 状态与流动性先否决',
    body: '仅使用已收盘4H识别趋势；24小时代理成交额低于500万USDT、震荡或过渡状态直接跳过，再取横截面前/后10名。',
    icon: TrendingDown,
  },
  {
    title: '正常回踩 / 异常收复双入口',
    body: '正常分支等待15m触及EMA20或VWAP后收盘重夺；异常分支要求3根内逆向冲击至少1.5ATR、冷静2根后再同时收复参考线与前高/前低。',
    icon: Target,
  },
  {
    title: '防追价、空间与退出',
    body: '入场乖离不超过0.6ATR，结构空间至少1.5R；40%在1R、30%在2R退出，余下30%按1.5ATR跟踪，8根无0.5R进展即退出。',
    icon: Gauge,
  },
  {
    title: '失败结论与事件边界',
    body: '全年196笔、0.59笔/天、胜率51.53%、PF 1.123；冻结后段胜率49.30%、PF 0.888。事件AI因缺少时间点一致历史新闻，只能前向否决，不能写入历史成绩。',
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
  const elite = strength === 'S+' && signal !== 'WAIT';
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

function BiasBadge({ bias }: { bias?: Signal }) {
  const value = bias ?? 'WAIT';
  return (
    <span
      className={`bias-badge ${
        value === 'LONG' ? 'long' : value === 'SHORT' ? 'short' : 'wait'
      }`}
    >
      {value === 'LONG' ? '偏多趋势' : value === 'SHORT' ? '偏空趋势' : '中性'}
    </span>
  );
}

function getEntryStateLabel(state?: EntryState) {
  return state === 'READY'
    ? '可以开单'
    : state === 'RESEARCH_REJECTED'
      ? '研究未通过 · 禁止开单'
    : state === 'OVEREXTENDED'
      ? '涨跌过远 · 禁止追单'
      : state === 'WAIT_BREAKOUT'
        ? '等待整理区突破'
        : state === 'WAIT_PULLBACK'
          ? '等待回踩'
          : state === 'WAIT_CONFIRM'
            ? '等待重新突破'
            : state === 'INVALIDATED'
              ? '结构失效'
              : state === 'EXPIRED'
                ? '窗口过期'
                : '无方向优势';
}

function H4PriorityBadge({ priority }: { priority?: H4Priority }) {
  if (!priority || priority === 'WATCH') {
    return <span className="priority-watch">H4 等待</span>;
  }
  const isLong = priority === 'P0-LONG';
  return (
    <Badge className={`priority-badge ${isLong ? 'long' : 'short'}`}>
      <Zap size={12} />
      P0 4H {isLong ? '多头开单' : '空头开单'}
    </Badge>
  );
}

function getHoldingProfile(item: Instrument, strategy: StrategyKey) {
  if (item.holdingStage && item.holdingWindow) {
    return {
      stage: item.holdingStage,
      label:
        item.holdingStage === 'SWING'
          ? '波段候选'
          : item.holdingStage === 'INTRADAY'
            ? '日内延长'
            : item.holdingStage === 'QUICK'
              ? '快速单'
              : '等待',
      window: item.holdingWindow,
      reason: item.holdingReason ?? '等待条件确认',
      upgrade: item.holdingUpgrade ?? '等待下一次收盘复核',
    };
  }
  if (strategy === 'rank-v32' || strategy === 'rank-v321') {
    const isP0 =
      item.h4Priority === 'P0-LONG' || item.h4Priority === 'P0-SHORT';
    return isP0
      ? {
          stage: 'SWING' as const,
          label: '波段候选',
          window: '8–48h',
          reason: '4H P0 已收盘确认',
          upgrade: '每根 4H 收盘复核并执行跟踪退出',
        }
      : item.signal !== 'WAIT'
        ? {
            stage: 'INTRADAY' as const,
            label: '日内延长',
            window: '2–8h',
            reason: '多周期 P1 已确认',
            upgrade: '等待独立 P0 4H 信号，不自动延长',
          }
        : {
            stage: 'WAIT' as const,
            label: '等待',
            window: '等待新信号',
            reason: '多周期条件尚未闭合',
            upgrade: '等待下一根已收盘 K 线',
          };
  }
  return {
    stage: item.signal === 'WAIT' ? ('WAIT' as const) : ('QUICK' as const),
    label: item.signal === 'WAIT' ? '等待' : '快速单',
    window: item.signal === 'WAIT' ? '等待新信号' : '30m–2h',
    reason: '高周期数据暂不可用，按 V31 原始 15m 信号处理',
    upgrade: '等待 1H / 4H 收盘数据后再判断升级',
  };
}

function HoldingBadge({
  item,
  strategy,
}: {
  item: Instrument;
  strategy: StrategyKey;
}) {
  const profile = getHoldingProfile(item, strategy);
  return (
    <span className={`holding-badge ${profile.stage.toLowerCase()}`}>
      <Clock3 size={12} />
      {profile.label}
    </span>
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
  const isV33 = strategy === 'rank-v33';
  const isV34 = strategy === 'rank-v34';
  const isV36 = strategy === 'rank-v36';
  const isV37 = strategy === 'rank-v37';
  const entryFirst = isV37 || isV36 || isV33 || isV34;
  const h4PriorityCount = rows.filter(
    (item) => item.h4Priority && item.h4Priority !== 'WATCH',
  ).length;
  const extendedHoldingCount = isV37 || isV36 || isV34
    ? 0
    : rows.filter(
        (item) =>
          item.holdingStage === 'INTRADAY' || item.holdingStage === 'SWING',
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
              {!isV32 && <th>趋势方向</th>}
              <th>{isV32 ? '信号' : '可开单'}</th>
              <th>{entryFirst ? '趋势背景' : '信号分'}</th>
              <th>持仓阶段</th>
              <th>观察时长</th>
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
                className={
                  item.strength === 'S+' && item.signal !== 'WAIT'
                    ? 'signal-row-elite'
                    : ''
                }
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
                {!isV32 && (
                  <td>
                    <BiasBadge bias={item.bias ?? item.signal} />
                  </td>
                )}
                <td className="entry-decision-cell">
                  <SignalBadge signal={item.signal} strength={item.strength} />
                  {!isV32 && (
                    <small
                      className={`entry-state ${item.entryState?.toLowerCase() ?? ''}`}
                    >
                      {getEntryStateLabel(item.entryState)}
                    </small>
                  )}
                </td>
                <td>
                  <span
                    className={
                      entryFirst
                        ? 'score-context'
                        : item.strength === 'S+'
                          ? 'score-elite'
                          : 'score-cell'
                    }
                    title={
                      entryFirst ? '趋势背景分，不是胜率，也不代表可以开单' : undefined
                    }
                  >
                    {entryFirst ? `趋势 ${item.score}` : item.score}
                  </span>
                </td>
                <td>
                  <HoldingBadge item={item} strategy={strategy} />
                </td>
                <td className="holding-window-cell">
                  {getHoldingProfile(item, strategy).window}
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
              : isV37
                ? `V37 · ${formatChinaTime(closedAt)} · 防追价与异常收复失败研究，不生成开单许可`
              : isV36
                ? `V36 · ${formatChinaTime(closedAt)} · 显示已收盘4H状态与15m条件，不生成开单许可`
              : isV34
                ? `V34 · ${formatChinaTime(closedAt)} · 年度验证失败，只显示行情背景，不生成开单提示`
                : isV33
                ? `V33 · 首次回踩状态机 · ${formatChinaTime(closedAt)} · 仅 READY 可在下一根 15m 理论开单`
                : `最近收盘 K 线 · ${formatChinaTime(closedAt)} · 理论开单为下一根 15m 开盘`}
        </span>
        <span>
          {scanStats.total > 0
            ? `合格 ${scanStats.total} 个 · 已剔除 ${scanStats.excluded} 个 · 美股 ${scanStats.stocks} · 加密 ${scanStats.crypto} · S+ ${scanStats.elite}`
            : dataState === 'live'
              ? '正在整理扫描范围'
              : '点击标的查看详情'}
        </span>
        {isV32 ? (
          <span>P0 = 4H 开单 {h4PriorityCount} 个 · P1 = 15m 开单</span>
        ) : (
          <span>
            {isV37
              ? 'V37失败研究 · 实时状态只作观察，事件层尚未完成前向验证'
              : isV36
              ? 'V36只读研究 · 状态和评分都不是胜率或开单许可'
              : isV34
              ? 'V34 已冻结 · 评分不是胜率或开单许可'
              : `持仓升级 ${extendedHoldingCount} 个 · 仅作动态管理参考`}
          </span>
        )}
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
  const isV34 = strategy === 'rank-v34';
  const isV36 = strategy === 'rank-v36';
  const isV37 = strategy === 'rank-v37';
  const strongest = rows
    .filter((item) => item.strength === 'S+' && item.signal !== 'WAIT')
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  return (
    <div className="elite-strip">
      <div className="elite-strip-heading">
        <span className="elite-mark">
          <Zap size={14} />
        </span>
        <div>
          <strong>{isV32 ? 'P1 15m 次级开单 · S+' : '当前可开单 · S+'}</strong>
          <small>
            {isV37
              ? 'V37 Guarded Reclaim 失败研究 · 不生成开单许可'
              : isV36
              ? 'V36 综合状态研究 · 不生成开单许可'
              : isV34
              ? 'V34 失败研究档案 · 行情背景只读'
              : isV32
              ? `${isV321 ? 'V32.1' : 'V32'}：已收盘 4H / 1H 通过后，下一根 15m 开盘`
              : '只有回踩后重新突破、乖离与量能合格才显示'}{' '}
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
                {item.h4Priority === 'P0-LONG' || item.h4Priority === 'P0-SHORT'
                  ? 'P0 + P1'
                  : item.signal === 'LONG'
                    ? '15m 次级多头'
                    : '15m 次级空头'}
              </span>
              <em>{item.score}</em>
              <small>
                开单 {formatChinaTimeShort(item.closedAt)} ·{' '}
                {getEntryTiming(item.closedAt, item.signal).label}
              </small>
              <small className="elite-holding">
                {getHoldingProfile(item, strategy).label} ·{' '}
                {getHoldingProfile(item, strategy).window}
              </small>
            </span>
          ))}
        </div>
      ) : (
        <span className="elite-empty">
          当前没有可立即开单的 S+；趋势方向不等于入场指令
        </span>
      )}
    </div>
  );
}

function SignalCommandCenter({
  rows,
  strategy,
  closedAt,
}: {
  rows: Instrument[];
  strategy: StrategyKey;
  closedAt: number | null;
}) {
  const isV32 = strategy === 'rank-v32' || strategy === 'rank-v321';
  const isV33 = strategy === 'rank-v33';
  const isV34 = strategy === 'rank-v34';
  const isV36 = strategy === 'rank-v36';
  const isV37 = strategy === 'rank-v37';
  const ranked = [...rows].sort((a, b) => b.score - a.score);
  const strongest =
    ranked.find((item) => item.strength === 'S+' && item.signal !== 'WAIT') ??
    ranked.find((item) => item.signal !== 'WAIT') ??
    ranked[0];
  const p0 = ranked.find(
    (item) => item.h4Priority === 'P0-LONG' || item.h4Priority === 'P0-SHORT',
  );
  const p1 = isV37 || isV36 || isV34 ? undefined : ranked.find((item) => item.signal !== 'WAIT');
  const holdCandidate = isV37 || isV36 || isV34
    ? undefined
    : ranked.find((item) => item.holdingStage === 'SWING') ??
      ranked.find((item) => item.holdingStage === 'INTRADAY');
  const strongestHolding = strongest
    ? getHoldingProfile(strongest, strategy)
    : null;
  const candidateHolding = holdCandidate
    ? getHoldingProfile(holdCandidate, strategy)
    : null;
  const strongestIsReady = strongest?.signal !== 'WAIT';

  const directionLabel = (item?: Instrument) => {
    if (!item) return '等待';
    if (item.signal === 'LONG' || item.h4Priority === 'P0-LONG') return '看多';
    if (item.signal === 'SHORT' || item.h4Priority === 'P0-SHORT')
      return '看空';
    return '等待';
  };

  return (
    <section className="signal-command-grid" aria-label="最强信号与开单优先级">
      <Card className="signal-focus-card">
        <CardHeader>
          <div className="focus-card-kicker">
            <Zap size={15} />{' '}
            {isV32
              ? '最强信号'
              : isV37
                ? 'V37 防追价 / 收复判断'
              : isV36
                ? 'V36 4H状态判断'
              : isV34
                ? 'V34 研究结论'
                : isV33
                  ? 'V33 首次回踩判断'
                  : 'V31 入场判断'}
          </div>
          <CardDescription>
            {strongest
              ? `${strongest.name} · ${strongest.symbol}`
              : '等待实时扫描结果'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="focus-grade">
            {isV37 || isV34
              ? 'FAIL'
              : strongest
                ? strongestIsReady
                  ? strongest.strength
                  : 'WAIT'
                : '—'}
          </div>
          <div className="focus-score-row">
            <span>{isV37 || isV33 || isV34 ? '趋势背景（非胜率）' : '综合评分'}</span>
            <strong>
              {strongest
                ? isV37 || isV33 || isV34
                  ? `${strongest.score} / 99 · 不能单独开单`
                  : `${strongest.score} / 99`
                : '—'}
            </strong>
          </div>
          <div className="focus-checks">
            <span>
              <Check size={13} /> 方向一致性
              <b>
                {isV32
                  ? directionLabel(strongest)
                  : strongest?.bias === 'LONG'
                    ? '偏多'
                    : strongest?.bias === 'SHORT'
                      ? '偏空'
                      : '中性'}
              </b>
            </span>
            {!isV32 && (
              <span>
                <Target size={13} /> 入场状态
                <b>{getEntryStateLabel(strongest?.entryState)}</b>
              </span>
            )}
            <span>
              <Check size={13} /> 流动性
              <b>合格</b>
            </span>
            <span>
              <Check size={13} /> 最近收盘
              <b>{closedAt ? formatChinaTimeShort(closedAt) : '等待'}</b>
            </span>
            <span>
              <Clock3 size={13} /> 持仓阶段
              <b>{strongestHolding?.label ?? '等待'}</b>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="priority-stack">
        <Card className="priority-panel priority-p0">
          <CardContent>
            <div className="priority-title-row">
              <div>
                <span className="priority-label">
                  {isV32
                    ? 'P0 · 4H'
                    : isV34
                      ? 'FAIL · V34'
                      : isV33
                        ? 'SETUP · V33'
                        : 'HOLD · V31'}
                </span>
                <strong>
                  {isV32
                    ? '最高优先级'
                    : isV34
                      ? '年度验证未通过'
                      : isV33
                        ? '首次回踩候选'
                        : '持仓升级'}
                </strong>
              </div>
              <SignalBadge
                signal={
                  isV32
                    ? p0?.h4Priority === 'P0-LONG'
                      ? 'LONG'
                      : p0?.h4Priority === 'P0-SHORT'
                        ? 'SHORT'
                        : 'WAIT'
                    : isV34
                      ? 'WAIT'
                      : (holdCandidate?.signal ?? 'WAIT')
                }
                strength={isV32 ? p0?.strength : holdCandidate?.strength}
              />
            </div>
            <div className="priority-data-grid">
              <span>
                标的
                <b>
                  {isV32
                    ? (p0?.symbol ?? '等待 4H 收盘')
                    : (holdCandidate?.symbol ?? '暂无升级候选')}
                </b>
              </span>
              <span>
                {isV32 ? '方向' : '阶段'}
                <b>
                  {isV32
                    ? directionLabel(p0)
                    : (candidateHolding?.label ?? '等待')}
                </b>
              </span>
              <span>
                {isV32 ? '置信度' : '观察时长'}
                <b>
                  {isV32
                    ? p0
                      ? `${p0.score}%`
                      : '—'
                    : (candidateHolding?.window ?? '—')}
                </b>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="priority-panel priority-p1">
          <CardContent>
            <div className="priority-title-row">
              <div>
                <span className="priority-label">P1 · 15m</span>
                <strong>
                  {isV32
                    ? '次级开单信号'
                    : isV34
                      ? '5m 确认未形成正期望'
                      : isV33
                      ? 'V33 收盘确认'
                      : 'V31 快速开单'}
                </strong>
              </div>
              <SignalBadge
                signal={p1?.signal ?? 'WAIT'}
                strength={p1?.strength}
              />
            </div>
            <div className="priority-data-grid">
              <span>
                标的<b>{p1?.symbol ?? '等待 15m 收盘'}</b>
              </span>
              <span>
                方向<b>{directionLabel(p1)}</b>
              </span>
              <span>
                状态
                <b>
                  {isV32
                    ? '多周期确认'
                    : isV34
                      ? '禁止开单'
                      : isV33
                        ? '只认 READY'
                        : '30m–2h 起步'}
                </b>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
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
  const isV37 = strategy === 'rank-v37';
  const isV36 = strategy === 'rank-v36';
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const isV33 = strategy === 'rank-v33';
  const isV34 = strategy === 'rank-v34';
  const [market, setMarket] = useState<'全部' | 'LONG' | 'SHORT' | 'WAIT'>(
    '全部',
  );
  const strategyInstruments = useMemo(() => instruments, [instruments]);
  const filtered = useMemo(
    () =>
      strategyInstruments.filter(
        (item) => market === '全部' || item.signal === market,
      ),
    [market, strategyInstruments],
  );
  const testedKey: TestedStrategyKey =
    strategy === 'rank-v1' ? 'rank-v31' : strategy;
  const metrics = strategyMetrics[testedKey];
  const chartData =
    testedKey === 'rank-v37'
      ? equityV37
      : testedKey === 'rank-v36'
      ? equityV36
      : testedKey === 'rank-v34'
      ? equityV34
      : testedKey === 'rank-v33'
      ? equityV33
      : testedKey === 'rank-v321'
        ? equityV321
        : testedKey === 'rank-v32'
          ? equityV32
          : equityV31;
  const isV31 = strategy === 'rank-v31';
  const validationWindow = isV321
    ? `${v321AnnualValidation.period} · ${v321AnnualValidation.primary.trades} 核心 / ${v321AnnualValidation.broad.trades} 全篮子`
    : isV37
      ? `${v37AnnualValidation.period} · ${v37AnnualValidation.full.trades} 笔账户成交`
    : isV36
      ? `${v36AnnualValidation.period} · ${v36AnnualValidation.full.trades} 笔账户成交`
    : isV34
      ? `${v34AnnualValidation.period} · ${v34AnnualValidation.full.trades} 笔账户成交`
      : isV33
      ? `${v33AnnualValidation.period} · ${v33AnnualValidation.full.trades} 笔账户成交`
      : isV32
        ? `${v32AnnualValidation.period} · ${v32AnnualValidation.primary.trades} 核心 / ${v32AnnualValidation.broad.trades} 全篮子`
        : `${v31AnnualValidation.period} · ${v31AnnualValidation.primary.trades} 核心 / ${v31AnnualValidation.broad.trades} 全篮子`;
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
      <SignalCommandCenter
        rows={strategyInstruments}
        strategy={strategy}
        closedAt={closedAt}
      />
      <div className="risk-banner">
        <AlertTriangle size={17} />
        <div>
          <strong>研究提示</strong>
          <span>
            {isV37
              ? 'V37 将4H状态、防追价、正常回踩与异常收复结合。全年仅0.59笔/天、胜率51.53%、PF 1.123；冻结后段49.30%/0.888。它降低了回撤，却没有达到65%/1.6/每天2笔，实时页只读且不生成开单许可。'
              : isV36
              ? 'V36 将已收盘4H状态与15m趋势回撤结合。全年3.46笔/天，但胜率49.87%、PF 1.030；冻结后段为52.62%/1.130，仍明显低于65%/1.6。页面只显示状态与规则，不生成开单许可。'
              : isV34
              ? 'V34 的 5m 确认把频率提高到 3.00 笔/天，但胜率仅 43.24%、PF 0.823，账户回撤 -99.29%。V34 已冻结为失败研究版，实时页不生成任何开单提示。'
              : isV321
              ? 'V32.1 保留 V32 的已收盘多周期结构，只增加均量参与确认和 40% / 30% / 30% 退出。当前样本胜率与 PF 改善，但参数已接触该年度数据，因此只进入冻结前向观察。'
              : isV33
                ? 'V33 只在突破后的第一次回踩重新确认时开单，避免趋势已走远仍追入。年度检查为 0.78 笔/天、胜率 51.16%、PF 1.157，未达到目标，仅用于研究观察。'
                : isV32
                  ? 'V32 已接入为独立多周期观察版：4H / 1H 条件只读取已收盘 K 线，15m 才负责触发。年度核心 PF 0.849、前半年不稳定，因此当前不具备前向模拟资格。'
                  : 'V31 实时扫描已增加防追涨入场层：趋势排名与开单信号分开，只有回踩后重新突破、EMA20 乖离不超过 0.8 ATR 且量能合格才显示可开单。页面历史指标仍是原 V31 基线，不代表新规则表现。'}
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
          tone={isV37 || isV36 || isV34 || isV33 || (isV32 && !isV321) ? 'negative' : 'positive'}
          icon={TrendingDown}
        />
        <MetricCard
          label="利润因子"
          value={metrics.profitFactor}
          detail={
            isV37
              ? '40 个加密代理账户 · 冻结后段 PF 0.888'
              : isV36
              ? '40 个加密代理账户 · 目标 1.6 未通过'
              : isV34
              ? '40 个加密代理账户 · 目标 1.6 未通过'
              : isV321
              ? '等风险 PF / 原始 PF · 核心八币种'
              : isV33
                ? '40 标的代理账户 · 目标 1.6 未通过'
                : isV32
                  ? '核心八币种 · 前后半年稳定性未通过'
                  : '当前所选策略'
          }
          tone={isV37 || isV36 || isV34 || isV33 || (isV32 && !isV321) ? 'negative' : 'positive'}
          icon={Gauge}
        />
        <MetricCard
          label="胜率"
          value={metrics.winRate}
          detail={
            isV37
              ? '0.59 笔/天 · 目标 65% 未通过'
              : isV36
              ? '3.46 笔/天 · 目标 65% 未通过'
              : isV34
              ? '3.00 笔/天 · 目标 65% 未通过'
              : isV321
              ? '核心八币种 · V32 为 55.91%'
              : isV33
                ? '40 标的代理账户 · 目标 65% 未通过'
                : isV32
                  ? '核心八币种 · 已收盘多周期条件'
                  : `${metrics.trades} 笔交易`
          }
          tone={isV37 || isV36 || isV32 || isV33 || isV34 ? 'warning' : 'neutral'}
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
                {isV37 || isV36 || isV32 || isV31 || isV33 || isV34
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
                  domain={
                    isV34
                      ? [0, 105]
                      : isV33
                        ? [90, 260]
                      : isV321
                        ? [95, 130]
                        : isV32
                          ? [85, 125]
                          : [95, 125]
                  }
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
                  {isV32 || isV33
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
              : isV33
                ? '12 根整理区突破、首次回踩与收盘重夺'
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
                {isV32
                  ? option
                  : option === 'LONG'
                    ? '可开多'
                    : option === 'SHORT'
                      ? '可开空'
                      : option === 'WAIT'
                        ? '等待'
                        : option}
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
  const isV33 = strategy === 'rank-v33';
  const [market, setMarket] = useState<'全部' | 'LONG' | 'SHORT' | 'WAIT'>(
    '全部',
  );
  const strategyInstruments = useMemo(() => instruments, [instruments]);
  const [selectedSymbol, setSelectedSymbol] = useState(
    strategyInstruments[0]?.symbol,
  );
  const selected =
    strategyInstruments.find((item) => item.symbol === selectedSymbol) ??
    strategyInstruments[0];
  const selectedTiming = selected
    ? getEntryTiming(selected.closedAt, selected.signal)
    : null;
  const selectedHolding = selected
    ? getHoldingProfile(selected, strategy)
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
                {isV32
                  ? option
                  : option === 'LONG'
                    ? '可开多'
                    : option === 'SHORT'
                      ? '可开空'
                      : option === 'WAIT'
                        ? '等待'
                        : option}
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
                  <span>ATR(15)</span>
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
                {!isV32 && selectedHolding && (
                  <>
                    <div>
                      <span>排名趋势方向</span>
                      <strong>
                        {selected.bias === 'LONG'
                          ? '偏多趋势'
                          : selected.bias === 'SHORT'
                            ? '偏空趋势'
                            : '中性'}
                      </strong>
                      <em>方向不等于立即开单</em>
                    </div>
                    <div>
                      <span>当前入场判断</span>
                      <strong>{getEntryStateLabel(selected.entryState)}</strong>
                      <em>{selected.entryReason ?? '等待下一根收盘确认'}</em>
                    </div>
                    <div>
                      <span>{isV33 ? 'V33 观察阶段' : 'V31 持仓阶段'}</span>
                      <strong>{selectedHolding.label}</strong>
                      <em>参考观察 {selectedHolding.window}</em>
                    </div>
                    <div>
                      <span>高周期确认</span>
                      <strong>
                        1H {selected.h1Trend ?? 'WAIT'} · 4H{' '}
                        {selected.h4Trend ?? 'WAIT'}
                      </strong>
                      <em>
                        4H 收盘{' '}
                        {selected.regimeClosedAt
                          ? `${formatChinaTimeShort(selected.regimeClosedAt)} 北京`
                          : '数据暂不可用'}
                      </em>
                    </div>
                    <div>
                      <span>阶段依据</span>
                      <strong>{selectedHolding.reason}</strong>
                    </div>
                    <div>
                      <span>下一步条件</span>
                      <strong>{selectedHolding.upgrade}</strong>
                    </div>
                  </>
                )}
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
                          ? 'P0 多头开单信号'
                          : selected.h4Priority === 'P0-SHORT'
                            ? 'P0 空头开单信号'
                            : 'P0 等待'}
                      </strong>
                      <em>已收盘 4H 突破后，理论开单为下一根 4H 开盘</em>
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
                className={`detail-note ${selected.strength === 'S+' && selected.signal !== 'WAIT' ? 'elite' : ''}`}
              >
                {selected.strength === 'S+' && selected.signal !== 'WAIT' ? (
                  <Zap size={15} />
                ) : (
                  <Check size={15} />
                )}
                {isV32
                  ? selected.signal === 'WAIT'
                    ? selected.h4Priority === 'P0-LONG' ||
                      selected.h4Priority === 'P0-SHORT'
                      ? `P0 4H 最高优先级开单已闭合：理论开单为下一根 4H 开盘。15m 次级开单尚未形成，可独立等待，不影响 P0 信号。`
                      : `${isV321 ? 'V32.1' : 'V32'} 当前没有完整的 4H → 1H → 15m 闭合条件；${isV321 ? '量比还必须达到 1.0x。' : ''}不把高分或强弱排名当作开单理由。`
                    : `${selected.h4Priority === 'P0-LONG' || selected.h4Priority === 'P0-SHORT' ? 'P0 与 P1 同时出现：' : 'P1 15m 次级开单：'}4H 与 1H 均已收盘确认，P1 理论开单 ${formatChinaTimeShort(selected.closedAt)} 北京，${selectedTiming?.label}。P0 与 P1 独立计时；止损和分批止盈仅是研究参考，不代表自动开仓。`
                  : selected.signal === 'WAIT'
                    ? `${selected.entryReason ?? '当前不生成开单信号'}。趋势排名仅代表方向，必须等页面显示“可以开单”。`
                    : selected.strength === 'S+'
                      ? `S+ 可开单：已完成回踩与重新突破，距 EMA20 ${selected.extensionAtr?.toFixed(2) ?? '—'} ATR；理论开单 ${formatChinaTimeShort(selected.closedAt)} 北京，${selectedTiming?.label}。当前为“${selectedHolding?.label}”，参考观察 ${selectedHolding?.window}。`
                      : `入场条件已闭合；理论开单 ${formatChinaTimeShort(selected.closedAt)} 北京，${selectedTiming?.label}。不代表自动开仓。`}
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
    strategy === 'rank-v37'
      ? equityV37
      : strategy === 'rank-v36'
      ? equityV36
      : strategy === 'rank-v34'
      ? equityV34
      : strategy === 'rank-v33'
      ? equityV33
      : strategy === 'rank-v321'
        ? equityV321
        : strategy === 'rank-v32'
          ? equityV32
          : equityV31;
  const isV321 = strategy === 'rank-v321';
  const isV32 = strategy === 'rank-v32' || isV321;
  const isV31 = strategy === 'rank-v31';
  const isV33 = strategy === 'rank-v33';
  const isV34 = strategy === 'rank-v34';
  const isV36 = strategy === 'rank-v36';
  const isV37 = strategy === 'rank-v37';
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
              {isV37
                ? '防追价＋收复年度验证失败 · 不生成开单许可'
                : isV36
                ? '综合状态年度目标未通过 · 只读研究观察'
                : isV34
                ? '5m 确认年度验证失败 · 禁止作为开单依据'
                : isV321
                ? '当前约束通过 · 参数冻结后进入前向观察'
                : isV33
                  ? '首次回踩年度目标未通过 · 独立研究观察'
                  : isV32
                    ? '年度前后半年稳定性未通过 · 仅保留为多周期研究观察'
                    : isV31
                      ? '年度规则筛选通过 · 仅进入前向模拟'
                      : selected.mode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="form-grid">
              <div>
                <label htmlFor="backtest-interval">时间周期</label>
                <select
                  id="backtest-interval"
                  defaultValue={
                    isV34 ? '15m 候选 / 5m 确认' : isV36 || isV32 || isV33 ? '15m / 1h / 4h' : '15m'
                  }
                >
                  <option>15m</option>
                  <option>1h</option>
                  <option>15m / 1h / 4h</option>
                  <option>15m 候选 / 5m 确认</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-lookback">排名回看</label>
                <select
                  id="backtest-lookback"
                  defaultValue={
                    isV32
                      ? '6 根 4H（24H）'
                      : isV33 || isV34
                        ? '12 根整理区'
                        : '16'
                  }
                >
                  <option>16 根（4H）</option>
                  <option>12 根整理区</option>
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
                      : isV33 || isV34
                        ? '结构 / 最少 1.25'
                        : isV31
                          ? '2.0'
                          : '1.5'
                  }
                >
                  <option>2.0 ATR</option>
                  <option>1.5 ATR</option>
                  <option>结构 / 最少 1.25 ATR</option>
                  <option>max(2.0 ATR15m, 1.25 ATR1h)</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-target">目标 R</label>
                <select
                  id="backtest-target"
                  defaultValue={
                    isV36 || isV32 ? 'TP1 1R / TP2 2R' : isV33 || isV34 ? '1.2' : '2.0'
                  }
                >
                  <option>2.0 R</option>
                  <option>1.5 R</option>
                  <option>1.2 R</option>
                  <option>TP1 1R / TP2 2R</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-holding">最大持仓</label>
                <select
                  id="backtest-holding"
                  defaultValue={
                    isV32 ? '32 根无进展 / 最多672根' : isV33 ? '16' : '8'
                  }
                >
                  <option>8 根 K 线</option>
                  <option>12 根 K 线</option>
                  <option>16 根 K 线</option>
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
                {isV37 || isV36 || isV32 || isV31 || isV33
                  ? `${metrics.trades} 笔交易 · ${isV37 || isV36 || isV33 ? '一年期 40 标的代理账户' : '一年期核心八币种'} · 零成本`
                  : `${metrics.trades} 笔交易 · 约 41 天零成本回放`}
              </CardDescription>
            </div>
            <Badge className="status-badge warning">
              {isV37
                ? '年度未通过'
                : isV36
                ? '年度未通过'
                : isV321
                ? '冻结观察'
                : isV33
                  ? '年度未通过'
                  : isV32
                    ? '年度 HOLD'
                    : isV31
                      ? '前向模拟'
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
                    isV37
                      ? [95, 112]
                      : isV36
                      ? [85, 120]
                      : isV33
                      ? [90, 260]
                      : isV321
                        ? [95, 130]
                        : isV32
                          ? [85, 125]
                          : [95, 115]
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
      {(isV37 || isV36 || isV32 || isV31 || isV33) && (
        <Card className="exit-card">
          <CardHeader>
            <CardTitle>
              {isV321 ? '年度候选筛选 · 结论' : '年度独立验证 · 结论'}
            </CardTitle>
            <CardDescription>
              {isV37
                ? v37AnnualValidation.period
                : isV36
                ? v36AnnualValidation.period
                : isV321
                ? v321AnnualValidation.period
                : isV33
                  ? v33AnnualValidation.period
                  : isV32
                    ? v32AnnualValidation.period
                    : v31AnnualValidation.period}
              ；
              {isV37
                ? v37AnnualValidation.source
                : isV36
                ? v36AnnualValidation.source
                : isV321
                ? v321AnnualValidation.source
                : isV33
                  ? v33AnnualValidation.source
                  : isV32
                    ? v32AnnualValidation.source
                    : v31AnnualValidation.source}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="result-metrics">
              <div>
                <span>主测试</span>
                <strong>
                  {isV37
                    ? v37AnnualValidation.full.trades
                    : isV36
                    ? v36AnnualValidation.full.trades
                    : isV321
                    ? v321AnnualValidation.primary.trades
                    : isV33
                      ? v33AnnualValidation.full.trades
                      : isV32
                        ? v32AnnualValidation.primary.trades
                        : v31AnnualValidation.primary.trades}{' '}
                  笔
                </strong>
              </div>
              <div>
                <span>全篮子复核</span>
                <strong>
                  {isV37
                    ? v37AnnualValidation.frozen.trades
                    : isV36
                    ? v36AnnualValidation.frozen.trades
                    : isV321
                    ? v321AnnualValidation.broad.trades
                    : isV33
                      ? v33AnnualValidation.secondHalf.trades
                      : isV32
                        ? v32AnnualValidation.broad.trades
                        : v31AnnualValidation.broad.trades}{' '}
                  笔
                </strong>
              </div>
              <div>
                <span>{isV37 || isV36 ? '全年 / 冻结后段 PF' : isV33 ? '全年 / 后半年 PF' : '全篮子 PF'}</span>
                <strong>
                  {isV37
                    ? `${v37AnnualValidation.full.profitFactor} / ${v37AnnualValidation.frozen.profitFactor}`
                    : isV36
                    ? `${v36AnnualValidation.full.profitFactor} / ${v36AnnualValidation.frozen.profitFactor}`
                    : isV321
                    ? `${v321AnnualValidation.broad.riskProfitFactor} 等风险 / ${v321AnnualValidation.broad.rawProfitFactor} 原始`
                    : isV33
                      ? `${v33AnnualValidation.full.profitFactor} / ${v33AnnualValidation.secondHalf.profitFactor}`
                      : isV32
                        ? v32AnnualValidation.broad.profitFactor
                        : v31AnnualValidation.broad.profitFactor}
                </strong>
              </div>
              {isV37 ? (
                <div>
                  <span>账户成交频率</span>
                  <strong className="negative-text">
                    {v37AnnualValidation.full.tradesPerDay} 笔/天
                  </strong>
                </div>
              ) : isV36 ? (
                <div>
                  <span>账户成交频率</span>
                  <strong className="negative-text">
                    {v36AnnualValidation.full.tradesPerDay} 笔/天
                  </strong>
                </div>
              ) : isV33 ? (
                <div>
                  <span>账户成交频率</span>
                  <strong className="negative-text">
                    {v33AnnualValidation.full.tradesPerDay} 笔/天
                  </strong>
                </div>
              ) : isV321 ? (
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
                    {v31AnnualValidation.stress100x.liquidations} /{' '}
                    {v31AnnualValidation.stress100x.rate}
                  </strong>
                </div>
              )}
            </div>
            <div className="cost-warning">
              <AlertTriangle size={15} /> 四个时间段 PF：
              {isV37
                ? 'V37 使用前60%选择、后40%冻结检查；事件否决层仅前向待验证'
                : isV36
                ? 'V36 使用前60%选择、后40%冻结检查'
                : isV321
                ? v321AnnualValidation.quarterlyRiskProfitFactors
                : isV33
                  ? 'V33 使用前后半年冻结检查'
                  : isV32
                    ? v32AnnualValidation.quarterlyProfitFactors
                    : v31AnnualValidation.quarterlyProfitFactors}
              。
              {isV37
                ? `V37 全年胜率 ${v37AnnualValidation.full.winRate}、PF ${v37AnnualValidation.full.profitFactor}、${v37AnnualValidation.full.tradesPerDay} 笔/天；冻结后段胜率 ${v37AnnualValidation.frozen.winRate}、PF ${v37AnnualValidation.frozen.profitFactor}。5%风险压力测试最大回撤 ${v37AnnualValidation.stress5.drawdown}。${v37AnnualValidation.eventLayer} 目标是 ${v37AnnualValidation.target}，因此只读观察。`
                : isV36
                ? `V36 全年胜率 ${v36AnnualValidation.full.winRate}、PF ${v36AnnualValidation.full.profitFactor}、${v36AnnualValidation.full.tradesPerDay} 笔/天；冻结后段胜率 ${v36AnnualValidation.frozen.winRate}、PF ${v36AnnualValidation.frozen.profitFactor}。5%风险压力测试最大回撤 ${v36AnnualValidation.stress5.drawdown}。目标是 ${v36AnnualValidation.target}，因此只读观察。`
                : isV321
                ? `V32.1 保留 359 笔（原 V32 的 75.58%），胜率 55.99%；全篮子等风险 PF 1.357、原始 PF 1.232。${v321AnnualValidation.halfYear.broad}；核心为 ${v321AnnualValidation.halfYear.core}。第四段等风险 PF 仅 1.066，且规则从同一年度样本中选出，所以只能冻结前向观察。`
                : isV33
                  ? `V33 全年胜率 ${v33AnnualValidation.full.winRate}、PF ${v33AnnualValidation.full.profitFactor}、${v33AnnualValidation.full.tradesPerDay} 笔/天；后半年胜率 ${v33AnnualValidation.secondHalf.winRate}、PF ${v33AnnualValidation.secondHalf.profitFactor}。目标是 ${v33AnnualValidation.target}，三项均未同时达到。带星号复合收益来自 500 USDT、每笔风险 5% 且忽略所有成本的高风险复利演示，不可视为预期收益。`
                  : isV32
                    ? `V32 的预先声明门槛为全篮子 PF ≥ 1.15、两半各 PF ≥ 1.05，且每半至少 75 笔；实际全篮子为 ${v32AnnualValidation.halfYear.broad}，核心为 ${v32AnnualValidation.halfYear.core}。因此页面只允许研究观察，不把它标成可执行策略。`
                    : 'V31 的规则门槛通过，但参数与本次复核使用同一年度样本；核心第三季度 PF 仅 0.613，必须先做新的前向模拟。'}
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
      )
        .filter(([key]) => key !== 'rank-v34')
        .map(([key, item]) => (
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
  const isV33 = strategy === 'rank-v33';
  const isV34 = strategy === 'rank-v34';
  const isV36 = strategy === 'rank-v36';
  const isV37 = strategy === 'rank-v37';
  const rules = isV37
    ? strategyRulesV37
    : isV36
    ? strategyRulesV36
    : isV34
    ? strategyRulesV34
    : isV33
    ? strategyRulesV33
    : isV321
      ? strategyRulesV321
      : isV32
        ? strategyRulesV32
        : strategyRulesV31;
  const selected = strategyCatalog[strategy];
  return (
    <>
      {picker}
      <SectionHeading
        kicker="Strategy registry"
        title="策略版本"
        description={
          isV37
            ? 'v37 是防守型收复研究版：以4H状态过滤，15m分正常回踩与异常波动冷静收复，并预留事件否决接口。全年与冻结后段均未通过，只读展示且不产生开单许可。'
            : isV36
            ? 'v36 是综合市场状态研究版：先区分4H趋势、震荡与过渡，再测试15m回撤。全年频率达标，但胜率与盈利因子未通过，只读展示且不产生开单许可。'
            : isV34
            ? 'v34 将 V33 的 15m 候选交给随后 3 根已收盘 5m K 线确认。它完成了全年测试，但胜率和盈利因子明显失败，因此只保留透明研究结果，实时扫描不会生成开单提示。'
            : isV33
            ? 'v33 是独立的“顺势首次回踩”研究版，V31 完整保留。它专门解决趋势已涨很高仍提示追多的问题；一年期联合目标未通过，所以不会标成可实盘。'
            : isV321
              ? 'v32.1 是独立的 PF 平衡候选，V31 与 V32 都保留。它只增加均量参与确认和新的分批比例；当前约束通过后参数冻结，仅允许前向观察。'
              : isV32
                ? 'v32 是独立的多周期波段候选，保留 v31 作为短线版本。它使用真实已收盘 4H / 1H 上下文，但一年期前后半年稳定性未通过，因此仅允许研究观察。'
                : 'v31 已替换为当前主策略：不合格流动性合约直接剔除，只对合格美股永续与主流加密进行排名；年度规则筛选通过，仍需前向模拟。'
        }
      />
      <div className="strategy-hero">
        <div>
          <div className="version-row">
            <Badge className="version-badge">
              {isV37
                ? 'v37 · GUARDED RECLAIM · FAILED'
                : isV36
                ? 'v36 · COMPOSITE REGIME · FAILED'
                : isV34
                ? 'v34 · 5M CONFIRM · FAILED'
                : isV33
                ? 'v33 · FIRST PULLBACK'
                : isV321
                  ? 'v32.1 · PF BALANCED MTF'
                  : isV32
                    ? 'v32 · CLOSED-CANDLE MTF'
                    : 'v31 · BALANCED EXTENSION'}
            </Badge>
            <span className="muted-label">Gate stocks + mainstream crypto</span>
          </div>
          <h2>{selected.name}</h2>
          <p>
            {isV37
              ? 'V37 全年196笔、0.59笔/天、胜率51.53%、PF 1.123、最大回撤-7.26%；冻结后段71笔、胜率49.30%、PF 0.888。回撤比V36低，但频率和质量都失败；事件AI层没有时间点一致的历史新闻，只保留为前向否决接口。'
              : isV36
              ? 'V36 最佳分支为4H趋势状态＋15m价格回撤＋50%@1R/50%@2R。全年1143笔、3.46笔/天、胜率49.87%、PF 1.030；冻结后段477笔、52.62%、PF 1.130。频率合格，质量未达到65%/1.6。'
              : isV34
              ? 'V34 使用 15m 首次回踩候选与最多 3 根 5m 收盘确认。500 USDT、单笔计划风险 5%、总杠杆上限 10x、最多 4 个持仓的账户口径为 1094 笔、3.00 笔/天、胜率 43.24%、PF 0.823、最大回撤 -99.29%。只有频率达标，策略质量失败。'
              : isV33
              ? 'V33 先识别 12 根整理区突破，只把它登记为候选；随后只接受第一次回踩，并要求 3 根内收盘重夺、排名回到前/后 5、1H 同向且 4H 不反向。全年账户口径 258 笔、胜率 51.16%、PF 1.157、0.78 笔/天，未达到 65% / 1.6 / 2 笔目标。'
              : isV321
                ? 'V32.1 不替换 V31 或 V32。它把触发量门槛从 0.8x 提高到 1.0x，并采用 40%@1R、30%@2R、30% 趋势尾仓。当前年度筛选中，全篮子胜率 55.99%，等风险 PF 1.357、原始 PF 1.232；由于规则已接触本样本，只能冻结前向观察。'
                : isV32
                  ? 'V32 不替换 V31：它先以已收盘 4H 的趋势结构决定方向，再要求 1H 回踩和 15m 收盘触发。年度核心 PF 为 0.849、前半年 PF 0.735，未达到预设稳定性标准，所以部署为透明的研究观察而非前向模拟。'
                  : '在流动性硬过滤基础上增加强弱排名、趋势、VWAP 和成交量综合评分，并将合格信号分为 S+ / S / A / WATCH。'}
          </p>
        </div>
        <Button
          onClick={() =>
            setToast(`${selected.version} 已选为研究版本，自动下单仍关闭`)
          }
        >
          <Check size={15} />{' '}
          {isV37
            ? '失败归档'
            : isV36
            ? '研究观察'
            : isV34
            ? '失败归档'
            : isV321
            ? '冻结观察'
            : isV33
              ? '研究观察'
              : isV32
                ? '研究观察'
                : '前向模拟'}
        </Button>
      </div>
      <div className="strategy-layout">
        <Card className="rules-card">
          <CardHeader>
            <CardTitle>信号规则</CardTitle>
            <CardDescription>
              来自{' '}
              {isV37
                ? 'Gate_V37_Guarded_Reclaim'
                : isV36
                ? 'Gate_V36_Composite_Regime'
                : isV34
                ? 'Gate_V34_FiveMinute_Confirm'
                : isV321
                ? 'Gate_V32_1_PF_Balanced'
                : isV33
                  ? 'Gate_V33_First_Pullback'
                  : isV32
                    ? 'Gate_V32_MTF_Runner'
                    : 'Gate_V31_Balanced_Extension'}
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
              {isV37
                ? 'V37Config · guarded-reclaim'
                : isV36
                ? 'V36Config · composite-regime'
                : isV34
                ? 'V34Config · 15m-candidate-5m-confirm'
                : isV321
                ? 'V321Config · participation-confirmed'
                : isV33
                  ? 'V33Config · first-pullback-reclaim'
                  : isV32
                    ? 'V32Config · closed-candle-mtf'
                    : 'V31Config · balanced-extension'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="params-list">
              <div>
                <dt>周期</dt>
                <dd>
                  {isV37
                    ? '15m 触发 / 已收盘 4H 状态'
                    : isV36
                    ? '15m 触发 / 已收盘 4H 状态'
                    : isV34
                    ? '15m 候选 / 5m 确认'
                    : isV32 || isV33
                      ? '15m 触发 / 1H / 4H'
                      : '15 分钟'}
                </dd>
              </div>
              <div>
                <dt>EMA</dt>
                <dd>
                  {isV37 || isV36 || isV34 || isV33
                    ? '1H 20 / 50 · 4H 20 / 50'
                    : isV32
                      ? '4H 50 / 200 · 1H 20 / 50'
                      : '20 / 50 / 200'}
                </dd>
              </div>
              <div>
                <dt>ATR</dt>
                <dd>
                  {isV37
                    ? '结构±0.15ATR · 1.0–1.8ATR'
                    : isV36
                    ? '结构止损 · Wilder ATR(14)'
                    : isV32
                    ? 'max(2.0×15m, 1.25×1H)'
                    : isV34 || isV33
                      ? '结构止损 · 最少 1.25x'
                      : isV31
                        ? '14 · 止损 2.0x'
                        : '14 · 止损 1.5x'}
                </dd>
              </div>
              <div>
                <dt>目标</dt>
                <dd>
                  {isV37
                    ? '40%@1R · 30%@2R · 30%跟踪'
                    : isV36
                    ? '50%@1R · 50%@2R'
                    : isV321
                    ? '40%@1R · 30%@2R · 30% 跟踪'
                    : isV34 || isV33
                      ? '固定 1.2R'
                      : isV32
                        ? '25%@1R · 25%@2R · 余仓跟踪'
                        : '2.0R'}
                </dd>
              </div>
              <div>
                <dt>排名窗口</dt>
                <dd>{isV37 || isV36 ? '20 根4H效率 / 16根15m排名' : isV32 ? '6 根已收盘 4H（24H）' : '16 根 K 线'}</dd>
              </div>
              <div>
                <dt>排名数量</dt>
                <dd>
                  {isV37
                    ? '趋势 Top / Bottom 10'
                    : isV36
                    ? '趋势 Top / Bottom 10'
                    : isV32
                    ? 'Top / Bottom 2'
                    : isV34 || isV33
                      ? '候选 10 · 开单 5'
                      : 'Top / Bottom 5（S+ 优先）'}
                </dd>
              </div>
              {(isV37 || isV36 || isV32 || isV31 || isV33 || isV34) && (
                <>
                  <div>
                    <dt>成交量比例</dt>
                    <dd>
                      {isV37
                        ? '正常≥0.9x · 异常收复≥1.0x'
                        : isV36
                        ? '不设量能确认（测试后反而变差）'
                        : isV321
                        ? '≥ 1.0x'
                        : isV34
                          ? '5m ≥ 0.8x'
                          : isV33
                          ? '≥ 0.8x'
                          : isV32
                            ? '≥ 0.8x'
                            : '1.0–1.4x'}
                    </dd>
                  </div>
                  <div>
                    <dt>质量上限</dt>
                    <dd>
                      {isV37
                        ? '乖离≤0.6ATR · 空间≥1.5R'
                        : isV36
                        ? '效率 > 0.35 · 乖离 ≤ 0.8 ATR'
                        : isV32
                        ? '4H ADX ≥ 18 · 15m ATR ≤ 4%'
                        : isV34
                          ? '确认窗口 3 根 5m'
                          : isV33
                          ? '突破位乖离 ≤ 0.8 ATR'
                          : 'ADX 15–25 · ATR ≤ 2%'}
                    </dd>
                  </div>
                </>
              )}
              {(isV37 || isV32) && (
                <>
                  <div>
                    <dt>无进展退出</dt>
                    <dd>{isV37 ? '8 根15m未到0.5R' : '32 根 15m（8 小时）未到 1R'}</dd>
                  </div>
                  <div>
                    <dt>余仓跟踪</dt>
                    <dd>{isV37 ? 'TP1后按1.5ATR跟踪' : '已收盘 4H high/low ± 3 ATR'}</dd>
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
              {(isV33 || isV34) && (
                <>
                  <div>
                    <dt>状态窗口</dt>
                    <dd>
                      {isV34 ? '15m 突破 / 回踩 · 3 根 5m 确认' : '突破 12 根 · 回踩确认 3 根'}
                    </dd>
                  </div>
                  <div>
                    <dt>首次回踩</dt>
                    <dd>突破位 ±0.35 ATR</dd>
                  </div>
                </>
              )}
              <div>
                <dt>最多持仓</dt>
                <dd>
                  {isV37
                    ? '32 根15m（8小时）'
                    : isV32
                    ? '672 根 15m（7 天）'
                    : isV34
                      ? '24 根 5m（2 小时）'
                      : isV33
                        ? '16 根 15m（4 小时）'
                      : '8 根 K 线'}
                </dd>
              </div>
              {(isV37 || isV36 || isV31 || isV32 || isV33 || isV34) && (
                <div>
                  <dt>单笔风险</dt>
                  <dd>
                    {isV37
                      ? '0.5%基准 · 1/2/5%压力复核'
                      : isV36
                      ? '0.5%基准 · 5%压力测试失败'
                      : isV32
                      ? '0.5% · 研究上限 5x'
                      : isV33 || isV34
                        ? '回测 5% · 总杠杆上限 10x'
                        : '0.5% · 杠杆上限 10x'}
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
          <div className={`history-row ${isV37 ? 'active' : ''}`}>
            <span className={`history-dot ${isV37 ? '' : 'muted'}`} />
            <div>
              <strong>v37 · Guarded Reclaim</strong>
              <small>
                全年196笔 · 0.59笔/天 · PF 1.123 · 胜率51.53%；冻结后段PF 0.888、胜率49.30% · 频率与质量目标均未通过
              </small>
            </div>
            <Badge className="status-badge danger">验证失败</Badge>
          </div>
          <div className={`history-row ${isV36 ? 'active' : ''}`}>
            <span className={`history-dot ${isV36 ? '' : 'muted'}`} />
            <div>
              <strong>v36 · Composite Regime Research</strong>
              <small>
                全年1143笔 · 3.46笔/天 · PF 1.030 · 胜率49.87%；冻结后段PF 1.130、胜率52.62% · 质量目标未通过
              </small>
            </div>
            <Badge className="status-badge danger">验证失败</Badge>
          </div>
          <div className={`history-row ${isV33 ? 'active' : ''}`}>
            <span className={`history-dot ${isV33 ? '' : 'muted'}`} />
            <div>
              <strong>v33 · First Pullback Reclaim</strong>
              <small>
                独立研究版 · 全年 258 笔账户成交 · PF 1.157 · 胜率 51.16% · 0.78
                笔/天 · 未通过 65% / 1.6 / 每天 2 笔目标
              </small>
            </div>
            <Badge className="status-badge warning">目标未通过</Badge>
          </div>
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
        </CardContent>
      </Card>
    </>
  );
}

function AlertsPage({ setToast }: { setToast: (message: string) => void }) {
  const secretsUrl = 'https://github.com/yutuda/yu/settings/secrets/actions';
  const workflowUrl =
    'https://github.com/yutuda/yu/actions/workflows/telegram-alerts.yml';
  const openExternal = (url: string, message: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setToast(message);
  };
  return (
    <>
      <SectionHeading
        kicker="Alert center"
        title="告警中心"
        description="P0 是独立的 4H 最高优先级开单；P1 是独立的 15m 次级开单。两者都只在 K 线收盘后通知，不会自动下单。"
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
                <CardDescription>
                  P0 4H 高优先级开单 + P1 15m 次级开单
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="alert-state">
              <span className="state-dot off" />
              <div>
                <strong>服务器接入待配置</strong>
                <small>
                  通知程序已经部署；添加两个 GitHub 加密密钥后，每 15
                  分钟自动检查，没信号时保持静默。
                </small>
              </div>
              <Badge className="status-badge warning">待密钥</Badge>
            </div>
            <div className="secret-placeholder">
              <span>TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID</span>
              <strong>GitHub Secrets</strong>
              <small>
                只由 GitHub Actions 在服务器端读取，网页与仓库都看不到明文。
              </small>
            </div>
            <div className="alert-actions">
              <Button
                onClick={() =>
                  openExternal(secretsUrl, '已打开 GitHub 加密密钥配置页')
                }
              >
                <Settings2 size={15} /> 配置加密密钥
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  openExternal(workflowUrl, '已打开 Telegram 连接测试页')
                }
              >
                <Send size={15} /> 运行连接测试
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
                <small>
                  强弱排名第一/末位、4H 趋势、ADX ≥ 22、量比 ≥
                  1.0x，且已收盘突破前一根 4H 高/低点；下一根 4H
                  开盘为理论开单。它不计入现有 V32.1 年度回测指标。
                </small>
              </div>
              <span className="event-tag">最高</span>
            </div>
            <div className="event-row">
              <span className="event-icon amber">
                <Target size={14} />
              </span>
              <div>
                <strong>P1 · 15m 次级开单</strong>
                <small>
                  4H / 1H / 15m
                  均已收盘，触发量比合格后才提示；内容包含理论下一根 15m
                  开盘、止损、TP1 与 TP2。
                </small>
              </div>
              <span className="event-tag warn">次级</span>
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
    useState<StrategyKey>('rank-v37');
  const [instruments, setInstruments] =
    useState<Instrument[]>(initialInstruments);
  const [scanStats, setScanStats] = useState<ScanStats>(initialScanStats);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [dataState, setDataState] = useState<DataState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const refreshRequestId = useRef(0);
  const refreshingStrategy = useRef<StrategyKey | null>(null);

  const runRefresh = useCallback(
    async (notify = true) => {
      const strategyAtStart = selectedStrategy;
      if (refreshingStrategy.current === strategyAtStart) {
        if (notify) setToast('当前扫描仍在进行，不会重复请求');
        return;
      }
      const requestId = ++refreshRequestId.current;
      refreshingStrategy.current = strategyAtStart;
      setRefreshing(true);
      if (notify) setToast('正在读取 Gate 最新公开行情…');
      try {
        const result = await loadLiveInstruments(strategyAtStart);
        if (requestId !== refreshRequestId.current) return;
        const updatedAt = Date.now();
        setInstruments(result.rows);
        setScanStats(result.stats);
        setClosedAt(result.closedAt);
        setLastUpdatedAt(new Date(updatedAt));
        setDataState('live');
        storeScan(strategyAtStart, result, updatedAt);
        if (notify) setToast('扫描完成：实时行情已更新');
      } catch (error) {
        console.error(error);
        if (requestId !== refreshRequestId.current) return;
        setDataState('error');
        if (notify) setToast('Gate 行情连接失败，已保留上次数据');
      } finally {
        if (refreshingStrategy.current === strategyAtStart) {
          refreshingStrategy.current = null;
        }
        if (requestId === refreshRequestId.current) {
          setRefreshing(false);
          if (notify) window.setTimeout(() => setToast(''), 2600);
        }
      }
    },
    [selectedStrategy],
  );

  useEffect(() => {
    const cached = readStoredScan(selectedStrategy);
    if (cached) {
      setInstruments(cached.rows);
      setScanStats(cached.stats);
      setClosedAt(cached.closedAt);
      setLastUpdatedAt(new Date(cached.updatedAt));
      setDataState('live');
    }
    void runRefresh(false);
    const timer = window.setInterval(() => void runRefresh(false), 60_000);
    return () => window.clearInterval(timer);
  }, [runRefresh, selectedStrategy]);
  const goTo = (page: Page) => {
    setActiveNav(page);
    setToast(`已打开${page}`);
  };
  const chooseStrategy = (strategy: StrategyKey) => {
    refreshRequestId.current += 1;
    setSelectedStrategy(strategy);
    const cached = readStoredScan(strategy);
    if (cached) {
      setInstruments(cached.rows);
      setScanStats(cached.stats);
      setClosedAt(cached.closedAt);
      setLastUpdatedAt(new Date(cached.updatedAt));
      setDataState('live');
    } else {
      setDataState('loading');
      setInstruments([]);
      setClosedAt(null);
    }
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
            className={`asset-item ${selectedStrategy === 'rank-v37' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v37')}
          >
            <span className="asset-dot violet" />
            Guarded Reclaim <span className="asset-version">v37 · FAIL</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v36' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v36')}
          >
            <span className="asset-dot violet" />
            Composite Regime Research{' '}
            <span className="asset-version">v36 · FAIL</span>
          </button>
          <button
            className={`asset-item ${selectedStrategy === 'rank-v33' ? 'selected' : ''}`}
            onClick={() => chooseStrategy('rank-v33')}
          >
            <span className="asset-dot amber" />
            First Pullback Reclaim <span className="asset-version">v33</span>
          </button>
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
              Gate Quant Lab · V31 preserved + V37 failed research
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
