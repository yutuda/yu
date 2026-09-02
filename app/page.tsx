'use client';

import { useMemo, useState } from 'react';
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

type Signal = 'LONG' | 'SHORT';
type Page =
  | '总览'
  | '市场扫描'
  | '回测实验室'
  | '杠杆压力测试'
  | '策略版本'
  | '告警中心';
type StrategyKey = 'rank-v26' | 'rank-v25' | 'rank-v1';

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

const instruments = [
  {
    symbol: 'SKHYNIX_USDT',
    name: 'SK hynix',
    change: 8.42,
    rank: 1,
    signal: 'LONG' as Signal,
    price: '248.70',
    atr: '7.42',
    vwap: '+1.8%',
    volume: '¥ 12.4M',
  },
  {
    symbol: 'SPCX_USDT',
    name: 'CoreWeave',
    change: 6.91,
    rank: 2,
    signal: 'LONG' as Signal,
    price: '38.16',
    atr: '1.31',
    vwap: '+1.2%',
    volume: '¥ 8.7M',
  },
  {
    symbol: 'SOXL_USDT',
    name: 'Direxion 3x',
    change: 5.44,
    rank: 3,
    signal: 'LONG' as Signal,
    price: '35.92',
    atr: '1.22',
    vwap: '+0.9%',
    volume: '¥ 7.1M',
  },
  {
    symbol: 'CRCLX_USDT',
    name: 'Circle',
    change: -4.12,
    rank: 6,
    signal: 'SHORT' as Signal,
    price: '104.50',
    atr: '4.48',
    vwap: '-1.1%',
    volume: '¥ 5.2M',
  },
  {
    symbol: 'MUU_USDT',
    name: 'Micron',
    change: -3.84,
    rank: 7,
    signal: 'SHORT' as Signal,
    price: '152.28',
    atr: '5.76',
    vwap: '-0.8%',
    volume: '¥ 4.4M',
  },
  {
    symbol: 'NVDAX_USDT',
    name: 'NVIDIA x',
    change: -2.96,
    rank: 8,
    signal: 'SHORT' as Signal,
    price: '176.90',
    atr: '6.15',
    vwap: '-0.6%',
    volume: '¥ 3.9M',
  },
];

const leverageTests = [
  {
    key: 'leverage-20x',
    label: '美股永续 · 20x',
    universe: 'v25 修正持仓区间',
    trades: 434,
    average: '+0.9957%',
    profitFactor: '1.1118',
    liquidation: '0.23%',
    foldRange: '0.93–1.19',
    tone: 'warning',
  },
  {
    key: 'leverage-40x',
    label: '美股永续 · 40x',
    universe: 'v25 修正持仓区间',
    trades: 434,
    average: '-0.6410%',
    profitFactor: '0.9662',
    liquidation: '7.14%',
    foldRange: '0.87–1.13',
    tone: 'negative',
  },
  {
    key: 'leverage-60x',
    label: '美股永续 · 60x',
    universe: 'v25 修正持仓区间',
    trades: 434,
    average: '-5.6127%',
    profitFactor: '0.8115',
    liquidation: '19.82%',
    foldRange: '0.71–0.97',
    tone: 'negative',
  },
  {
    key: 'crypto-100x',
    label: '主流虚拟货币 · 100x',
    universe: 'BTC / ETH / BNB / SOL / XRP',
    trades: 451,
    average: '-13.9016%',
    profitFactor: '0.5680',
    liquidation: '23.06%',
    foldRange: '0.38–0.97',
    tone: 'negative',
  },
];

const equity = [
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

function SignalBadge({ signal }: { signal: Signal }) {
  return (
    <Badge
      className={signal === 'LONG' ? 'signal-badge long' : 'signal-badge short'}
    >
      {signal === 'LONG' ? (
        <ArrowUpRight size={13} />
      ) : (
        <ArrowDownRight size={13} />
      )}
      {signal}
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
}: {
  rows: typeof instruments;
  onSelect: (symbol: string) => void;
}) {
  return (
    <Card className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>标的</th>
              <th>4H 强弱</th>
              <th>信号</th>
              <th>最新价</th>
              <th>VWAP 偏离</th>
              <th>ATR(14)</th>
              <th>活跃度</th>
              <th aria-label="详情" />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.symbol}>
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
                      <small>{item.symbol}</small>
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
                <td>
                  <SignalBadge signal={item.signal} />
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
          <span className="pulse-dot" /> 最后一根已收盘 K 线 · 08/27 16:00 UTC
        </span>
        <span>点击标的查看详情</span>
      </div>
    </Card>
  );
}

function Overview({
  goTo,
  setToast,
  strategy,
}: {
  goTo: (page: Page) => void;
  setToast: (message: string) => void;
  strategy: StrategyKey;
}) {
  const selectedStrategy = strategyCatalog[strategy];
  const [market, setMarket] = useState<'全部' | 'LONG' | 'SHORT'>('全部');
  const filtered = useMemo(
    () =>
      instruments.filter((item) => market === '全部' || item.signal === market),
    [market],
  );
  const isV26 = strategy === 'rank-v26';
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
            {isV26
              ? 'v26 的利润因子与回撤优于 v25，但历史仅约 41 天，仍标记为研究候选。'
              : '旧版用于对照；高杠杆压力结果不等于可直接开仓。'}
          </span>
        </div>
        <button aria-label="查看风险说明" onClick={() => goTo('策略版本')}>
          <CircleHelp size={16} />
        </button>
      </div>
      <section className="metric-grid">
        <MetricCard
          label="复合收益"
          value={isV26 ? '+20.65%' : '+19.73%'}
          detail="约 41 天 · 零成本 1x 压力视图"
          tone="positive"
          icon={TrendingDown}
        />
        <MetricCard
          label="利润因子"
          value={isV26 ? '1.287' : '1.114'}
          detail={isV26 ? 'v25 对照为 1.114' : 'v26 候选为 1.287'}
          tone="positive"
          icon={Gauge}
        />
        <MetricCard
          label="胜率"
          value={isV26 ? '47.37%' : '45.03%'}
          detail={isV26 ? '190 笔交易' : '433 笔交易'}
          icon={Activity}
        />
        <MetricCard
          label="最大回撤"
          value={isV26 ? '-12.92%' : '-21.50%'}
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
                约 41 天零成本回放
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
                data={equity}
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
                  domain={[95, 125]}
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
                <small>8 个合约 · 1000 根</small>
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
          <h3>强弱排名与信号</h3>
        </div>
        <div className="section-actions">
          <fieldset className="segmented" aria-label="信号筛选">
            {(['全部', 'LONG', 'SHORT'] as const).map((option) => (
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
      <ScanTable rows={filtered} onSelect={() => goTo('市场扫描')} />
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
}: {
  setToast: (message: string) => void;
  strategy: StrategyKey;
}) {
  const selectedStrategy = strategyCatalog[strategy];
  const [market, setMarket] = useState<'全部' | 'LONG' | 'SHORT'>('全部');
  const [selected, setSelected] = useState(instruments[0]);
  const filtered = useMemo(
    () =>
      instruments.filter((item) => market === '全部' || item.signal === market),
    [market],
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
            {(['全部', 'LONG', 'SHORT'] as const).map((option) => (
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
            variant="outline"
            size="sm"
            onClick={() => setToast('扫描完成：已读取本地候选快照')}
          >
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
      <div className="scanner-layout">
        <ScanTable
          rows={filtered}
          onSelect={(symbol) => {
            const next = instruments.find((item) => item.symbol === symbol);
            if (next) setSelected(next);
          }}
        />
        <Card className="detail-card">
          <CardHeader>
            <CardTitle>{selected.name}</CardTitle>
            <CardDescription>
              {selected.symbol} · 当前排名 #{selected.rank}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="detail-signal">
              <SignalBadge signal={selected.signal} />
              <span
                className={
                  selected.change > 0 ? 'change-positive' : 'change-negative'
                }
              >
                {selected.change > 0 ? '+' : ''}
                {selected.change.toFixed(2)}% 4H
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
            </div>
            <div className="detail-note">
              <Check size={15} />
              趋势与回踩条件已满足，等待收盘确认。
            </div>
            <Button
              className="full-button"
              onClick={() => setToast(`${selected.symbol} 已加入观察列表`)}
            >
              加入观察列表
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function GateBacktestPage({
  setToast,
  strategy,
}: {
  setToast: (message: string) => void;
  strategy: Exclude<StrategyKey, 'rank-v1'>;
}) {
  const [costs, setCosts] = useState(false);
  const [running, setRunning] = useState(false);
  const isV26 = strategy === 'rank-v26';
  const currentExitBreakdown = isV26
    ? [
        { name: '目标 2R', value: 26 },
        { name: '止损 1.5 ATR', value: 67 },
        { name: '时间退出', value: 97 },
      ]
    : [
        { name: '目标 2R', value: 74 },
        { name: '止损 1.5 ATR', value: 173 },
        { name: '时间退出', value: 186 },
      ];
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
              {isV26 ? 'Rank Pullback Guarded v26' : 'Rank Pullback v25'}
            </CardTitle>
            <CardDescription>
              {isV26 ? '正式研究候选配置' : '旧版对照配置'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="form-grid">
              <div>
                <label htmlFor="backtest-interval">时间周期</label>
                <select id="backtest-interval" defaultValue="15m">
                  <option>15m</option>
                  <option>1h</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-lookback">排名回看</label>
                <select id="backtest-lookback" defaultValue="16">
                  <option>16 根（4H）</option>
                  <option>32 根（8H）</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-stop">止损 ATR</label>
                <select id="backtest-stop" defaultValue="1.5">
                  <option>1.5 ATR</option>
                  <option>2.0 ATR</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-target">目标 R</label>
                <select id="backtest-target" defaultValue="2.0">
                  <option>2.0 R</option>
                  <option>1.5 R</option>
                </select>
              </div>
              <div>
                <label htmlFor="backtest-holding">最大持仓</label>
                <select id="backtest-holding" defaultValue="8">
                  <option>8 根 K 线</option>
                  <option>12 根 K 线</option>
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
                {isV26 ? '190 笔交易' : '433 笔交易'} · 约 41 天零成本回放
              </CardDescription>
            </div>
            <Badge className="status-badge warning">需要复核</Badge>
          </CardHeader>
          <CardContent>
            <div className="result-metrics">
              <div>
                <span>复合收益</span>
                <strong>{isV26 ? '+20.65%' : '+19.73%'}</strong>
              </div>
              <div>
                <span>利润因子</span>
                <strong>{isV26 ? '1.287' : '1.114'}</strong>
              </div>
              <div>
                <span>胜率</span>
                <strong>{isV26 ? '47.37%' : '45.03%'}</strong>
              </div>
              <div>
                <span>最大回撤</span>
                <strong className="negative-text">
                  {isV26 ? '-12.92%' : '-21.50%'}
                </strong>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={205}>
              <AreaChart
                data={equity}
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
                  domain={[95, 125]}
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
        description="本轮按要求忽略交易手续费、滑点与资金费率，仅观察信号收益与杠杆爆仓敏感性。"
      />
      <div className="risk-banner">
        <AlertTriangle size={17} />
        <div>
          <strong>研究结论</strong>
          <span>
            修正持仓区间后，20x 总体利润因子为 1.1118，但最差时间折叠仍低于
            1；40x、60x 和 100x 仍未通过。
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
                <span>4 折利润因子范围</span>
                <strong>{test.foldRange}</strong>
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
              基于约 41 天、15 分钟数据的零成本压力测试
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
                  修正模型后 20x 总体利润因子为 1.1118，但最差折叠只有
                  0.9337；不能据此直接开实盘仓位。
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
                  20x、40x、60x、100x 的近似爆仓占比分别为 0.23%、7.14%、19.82%
                  和 23.06%；40x 起总体利润因子已经低于 1。
                </p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-index">03</span>
              <span className="rule-icon">
                <FlaskConical size={16} />
              </span>
              <div>
                <strong>先做更长样本外验证</strong>
                <p>
                  下一步应扩展到 6–12 个月，做 walk-forward、市场状态分层和
                  dry-run，再决定是否保留该信号。
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
                <dd>4 × 1000 根</dd>
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
  const isV26 = strategy === 'rank-v26';
  const rules = isV26 ? strategyRulesV26 : strategyRulesV25;
  return (
    <>
      {picker}
      <SectionHeading
        kicker="Strategy registry"
        title="策略版本"
        description={
          isV26
            ? 'v26 已完成与 v25 的同数据对照，当前标记为研究候选。'
            : 'v25 作为旧版基线保留，用于比较过滤规则和风险变化。'
        }
      />
      <div className="strategy-hero">
        <div>
          <div className="version-row">
            <Badge className="version-badge">
              {isV26 ? 'v26 · CANDIDATE' : 'v25 · BASELINE'}
            </Badge>
            <span className="muted-label">Gate USDT Perpetuals</span>
          </div>
          <h2>{isV26 ? 'Rank Pullback Guarded' : 'Rank Pullback'}</h2>
          <p>
            {isV26
              ? '在横截面排名基础上增加趋势方向、VWAP 同侧和最大追价距离过滤，信号收盘确认后于下一根 15 分钟 K 线开盘模拟成交。'
              : '用横截面强弱排名寻找趋势中的回踩延续，信号收盘确认，下一根 15 分钟 K 线开盘模拟成交。'}
          </p>
        </div>
        <Button
          onClick={() =>
            setToast(
              isV26
                ? 'v26 已选为研究候选，自动下单仍关闭'
                : 'v25 已选为对照版本',
            )
          }
        >
          <Check size={15} /> {isV26 ? '研究候选' : '对照版本'}
        </Button>
      </div>
      <div className="strategy-layout">
        <Card className="rules-card">
          <CardHeader>
            <CardTitle>信号规则</CardTitle>
            <CardDescription>
              来自{' '}
              {isV26
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
              {isV26 ? 'V26Config · guarded' : 'StrategyConfig · v25'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="params-list">
              <div>
                <dt>周期</dt>
                <dd>15 分钟</dd>
              </div>
              <div>
                <dt>EMA</dt>
                <dd>20 / 50 / 200</dd>
              </div>
              <div>
                <dt>ATR</dt>
                <dd>14 · 止损 1.5x</dd>
              </div>
              <div>
                <dt>目标</dt>
                <dd>2.0R</dd>
              </div>
              <div>
                <dt>排名窗口</dt>
                <dd>16 根 K 线</dd>
              </div>
              <div>
                <dt>排名数量</dt>
                <dd>Top 3</dd>
              </div>
              <div>
                <dt>最多持仓</dt>
                <dd>8 根 K 线</dd>
              </div>
              {isV26 && (
                <div>
                  <dt>单笔风险</dt>
                  <dd>0.5% · 杠杆上限 10x</dd>
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
          <div className="history-row active">
            <span className="history-dot" />
            <div>
              <strong>v26 · Rank Pullback Guarded</strong>
              <small>研究候选 · PF 1.287 · 最大回撤 -12.92%</small>
            </div>
            <Badge className="status-badge warning">研究候选</Badge>
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
        description="只发送研究信号与系统状态，不执行订单；Telegram 仍需由你配置。"
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
                <CardDescription>信号确认后发送到指定频道</CardDescription>
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
                    ? '当前仅模拟发送，不含交易指令。'
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
                <Check size={14} />
              </span>
              <div>
                <strong>扫描完成</strong>
                <small>6 个候选标的 · 08/27 16:00 UTC</small>
              </div>
              <span className="event-tag">正常</span>
            </div>
            <div className="event-row">
              <span className="event-icon amber">
                <AlertTriangle size={14} />
              </span>
              <div>
                <strong>成本模型缺失</strong>
                <small>回测尚未计手续费、滑点和资金费率</small>
              </div>
              <span className="event-tag warn">待处理</span>
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
    useState<StrategyKey>('rank-v26');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const runRefresh = () => {
    setRefreshing(true);
    setToast('正在读取最新公开行情…');
    window.setTimeout(() => {
      setRefreshing(false);
      setToast('扫描完成：数据已更新');
      window.setTimeout(() => setToast(''), 2200);
    }, 900);
  };
  const goTo = (page: Page) => {
    setActiveNav(page);
    setToast(`已打开${page}`);
  };
  const chooseStrategy = (strategy: StrategyKey) => {
    setSelectedStrategy(strategy);
    setActiveNav('策略版本');
    setToast(
      `${strategyCatalog[strategy].name} ${strategyCatalog[strategy].version} 已选中`,
    );
  };
  const pageContent =
    activeNav === '总览' ? (
      <Overview goTo={goTo} setToast={setToast} strategy={selectedStrategy} />
    ) : activeNav === '市场扫描' ? (
      <ScannerPage setToast={setToast} strategy={selectedStrategy} />
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
              <small>刚刚更新</small>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runRefresh}
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
            <span>Gate Quant Lab · v0.2 research preview</span>
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

