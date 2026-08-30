'use client';

import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Bot,
  ChartNoAxesCombined, ChevronRight, CircleHelp, Clock3, Database,
  Download, FlaskConical, Gauge, LayoutDashboard, RefreshCw, Search,
  Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, TrendingDown,
  Wifi,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Signal = 'LONG' | 'SHORT';

const instruments = [
  { symbol: 'SKHYNIX_USDT', name: 'SK hynix', change: 8.42, rank: 1, signal: 'LONG' as Signal, price: '248.70', atr: '7.42', vwap: '+1.8%', volume: '¥ 12.4M' },
  { symbol: 'SPCX_USDT', name: 'CoreWeave', change: 6.91, rank: 2, signal: 'LONG' as Signal, price: '38.16', atr: '1.31', vwap: '+1.2%', volume: '¥ 8.7M' },
  { symbol: 'SOXL_USDT', name: 'Direxion 3x', change: 5.44, rank: 3, signal: 'LONG' as Signal, price: '35.92', atr: '1.22', vwap: '+0.9%', volume: '¥ 7.1M' },
  { symbol: 'CRCLX_USDT', name: 'Circle', change: -4.12, rank: 6, signal: 'SHORT' as Signal, price: '104.50', atr: '4.48', vwap: '-1.1%', volume: '¥ 5.2M' },
  { symbol: 'MUU_USDT', name: 'Micron', change: -3.84, rank: 7, signal: 'SHORT' as Signal, price: '152.28', atr: '5.76', vwap: '-0.8%', volume: '¥ 4.4M' },
  { symbol: 'NVDAX_USDT', name: 'NVIDIA x', change: -2.96, rank: 8, signal: 'SHORT' as Signal, price: '176.90', atr: '6.15', vwap: '-0.6%', volume: '¥ 3.9M' },
];

const equity = [
  { time: '08/18', value: 100 }, { time: '08/19', value: 101.4 },
  { time: '08/20', value: 99.8 }, { time: '08/21', value: 102.7 },
  { time: '08/22', value: 101.1 }, { time: '08/23', value: 98.6 },
  { time: '08/24', value: 99.7 }, { time: '08/25', value: 100.9 },
  { time: '08/26', value: 99.4 }, { time: '08/27', value: 99.68 },
];

const performance = [
  { time: '08/18', value: 0.0 }, { time: '08/19', value: 1.4 },
  { time: '08/20', value: -0.2 }, { time: '08/21', value: 2.7 },
  { time: '08/22', value: 1.1 }, { time: '08/23', value: -1.4 },
  { time: '08/24', value: -0.3 }, { time: '08/25', value: 0.9 },
  { time: '08/26', value: -0.6 }, { time: '08/27', value: -0.32 },
];

const navItems = [
  { label: '总览', icon: LayoutDashboard },
  { label: '市场扫描', icon: Search },
  { label: '回测实验室', icon: FlaskConical },
  { label: '策略版本', icon: SlidersHorizontal },
  { label: '告警中心', icon: Bell },
];

function MetricCard({ label, value, detail, tone = 'neutral', icon: Icon }: { label: string; value: string; detail: string; tone?: 'neutral' | 'positive' | 'negative' | 'warning'; icon: typeof Activity }) {
  return <Card className="metric-card"><CardContent className="p-5"><div className="flex items-start justify-between"><p className="eyebrow">{label}</p><span className={`metric-icon ${tone}`}><Icon size={16} /></span></div><p className="metric-value">{value}</p><p className={`metric-detail ${tone}`}>{detail}</p></CardContent></Card>;
}

function SignalBadge({ signal }: { signal: Signal }) {
  return <Badge className={signal === 'LONG' ? 'signal-badge long' : 'signal-badge short'}>{signal === 'LONG' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{signal}</Badge>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState('总览');
  const [market, setMarket] = useState<'全部' | 'LONG' | 'SHORT'>('全部');
  const [selectedSymbol] = useState(instruments[0].symbol);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const filtered = useMemo(() => instruments.filter((item) => market === '全部' || item.signal === market), [market]);
  const runRefresh = () => { setRefreshing(true); setToast('正在读取最新公开行情…'); window.setTimeout(() => { setRefreshing(false); setToast('扫描完成：数据已更新'); window.setTimeout(() => setToast(''), 2200); }, 900); };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark"><ChartNoAxesCombined size={19} /></div><div><p className="brand-name">GATE QUANT LAB</p><p className="brand-subtitle">Research console</p></div></div>
      <div className="sidebar-section-label">工作台</div>
      <nav className="sidebar-nav" aria-label="主导航">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => setActiveNav(label)}><Icon size={17} strokeWidth={activeNav === label ? 2.3 : 1.8} /><span>{label}</span>{label === '告警中心' && <span className="nav-count">2</span>}</button>)}</nav>
      <div className="sidebar-divider" /><div className="sidebar-section-label">研究资产</div>
      <div className="asset-list"><button className="asset-item selected"><span className="asset-dot amber" />Rank Pullback <span className="asset-version">v25</span></button><button className="asset-item"><span className="asset-dot violet" />BTC Trend Scout</button><button className="asset-item"><span className="asset-dot blue" />US Equity Factors</button></div>
      <div className="sidebar-footer"><div className="status-pill"><span className="pulse-dot" /> Scanner online</div><p className="footer-note">仅用于研究与模拟<br />自动下单：已关闭</p></div>
    </aside>

    <section className="main-panel">
      <header className="topbar"><div><p className="breadcrumb"><span>工作台</span><ChevronRight size={13} /><strong>{activeNav}</strong></p><h1>{activeNav === '总览' ? '策略研究总览' : activeNav}</h1></div><div className="topbar-actions"><div className="data-status"><span className="pulse-dot" /><span>Gate Public API</span><small>刚刚更新</small></div><Button variant="outline" size="sm" onClick={runRefresh} disabled={refreshing} className="refresh-button"><RefreshCw size={15} className={refreshing ? 'spin' : ''} /> {refreshing ? '刷新中' : '刷新数据'}</Button><Button size="icon" variant="outline" aria-label="设置"><Settings2 size={16} /></Button></div></header>
      <div className="content-wrap">
        <section className="hero-row"><div><div className="kicker"><Sparkles size={14} /> 只读策略监控</div><h2>把每一次信号，放回数据里判断。</h2><p className="hero-copy">Rank Pullback 追踪 Gate 美股永续合约的滚动强弱，等待趋势、回踩和突破在同一根收盘 K 线确认。</p></div><div className="hero-actions"><Button className="primary-action" onClick={() => { setActiveNav('回测实验室'); setToast('已打开最近一次回测配置'); }}><FlaskConical size={16} /> 打开回测实验室</Button><Button variant="outline" onClick={() => { setActiveNav('告警中心'); setToast('Telegram 告警中心已打开'); }}><Bell size={16} /> 告警设置</Button></div></section>
        <div className="risk-banner"><AlertTriangle size={17} /><div><strong>研究提示</strong><span>当前回测利润因子 1.01，复合收益为负。结果未计完整交易成本，不代表实盘预期。</span></div><button aria-label="查看风险说明"><CircleHelp size={16} /></button></div>
        <section className="metric-grid"><MetricCard label="复合收益" value="-0.322%" detail="最近一次回测 · 负收益" tone="negative" icon={TrendingDown} /><MetricCard label="利润因子" value="1.01" detail="目标 &gt; 1.20 · 待优化" tone="warning" icon={Gauge} /><MetricCard label="胜率" value="46.15%" detail="117 笔交易 · 54 胜" icon={Activity} /><MetricCard label="最大回撤" value="-12.70%" detail="峰值到谷底 · 风险关注" tone="negative" icon={ShieldCheck} /></section>
        <section className="workspace-grid"><Card className="chart-card"><CardHeader className="card-heading-row"><div><CardTitle>策略净值曲线</CardTitle><CardDescription>Rank Pullback · 15 分钟 · 最近 10 个交易日</CardDescription></div><div className="chart-legend"><span className="legend-line" /> 净值 <span className="chart-unit">基准 100</span></div></CardHeader><CardContent className="chart-content"><ResponsiveContainer width="100%" height={246}><AreaChart data={equity} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d59b54" stopOpacity={0.27} /><stop offset="95%" stopColor="#d59b54" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#ebe7df" /><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#918d84', fontSize: 11 }} /><YAxis domain={[96, 104]} axisLine={false} tickLine={false} tick={{ fill: '#918d84', fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e6e0d5', boxShadow: '0 12px 30px rgba(65,52,30,.12)', fontSize: 12 }} formatter={(value) => [`${Number(value).toFixed(2)}`, '净值']} /><Area type="monotone" dataKey="value" stroke="#b87527" strokeWidth={2.4} fill="url(#equityFill)" /></AreaChart></ResponsiveContainer></CardContent></Card>
          <Card className="health-card"><CardHeader><CardTitle>系统健康度</CardTitle><CardDescription>当前研究环境运行状态</CardDescription></CardHeader><CardContent className="health-list"><div className="health-item"><span className="health-icon green"><Wifi size={16} /></span><div><strong>Gate 行情接口</strong><small>公开 API · 响应 320ms</small></div><span className="health-ok">正常</span></div><div className="health-item"><span className="health-icon blue"><Database size={16} /></span><div><strong>历史 K 线数据</strong><small>8 个合约 · 1000 根</small></div><span className="health-ok">完整</span></div><div className="health-item"><span className="health-icon amber"><Bell size={16} /></span><div><strong>Telegram 通知</strong><small>信号发送 · 需配置</small></div><span className="health-warn">待检查</span></div><div className="health-item"><span className="health-icon slate"><Bot size={16} /></span><div><strong>自动下单</strong><small>交易密钥 · 未接入</small></div><span className="health-muted">关闭</span></div></CardContent></Card></section>
        <section className="scanner-section"><div className="section-title-row"><div><div className="section-kicker"><span className="orange-bar" />实时扫描</div><h3>强弱排名与信号</h3></div><div className="section-actions"><fieldset className="segmented" aria-label="信号筛选">{(['全部', 'LONG', 'SHORT'] as const).map((option) => <button key={option} onClick={() => setMarket(option)} className={market === option ? 'selected' : ''}>{option}</button>)}</fieldset><Button variant="ghost" size="sm" onClick={() => setToast('CSV 导出将在 API 接入后启用')}><Download size={15} /> 导出</Button></div></div><Card className="table-card"><div className="table-scroll"><table><thead><tr><th>标的</th><th>4H 强弱</th><th>信号</th><th>最新价</th><th>VWAP 偏离</th><th>ATR(14)</th><th>活跃度</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.symbol} className={selectedSymbol === item.symbol ? 'row-selected' : ''}><td><div className="instrument-cell"><span className={`rank rank-${item.rank}`}>{item.rank}</span><div><strong>{item.name}</strong><small>{item.symbol}</small></div></div></td><td><span className={item.change > 0 ? 'change-positive' : 'change-negative'}>{item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%</span></td><td><SignalBadge signal={item.signal} /></td><td className="mono-cell">{item.price}</td><td><span className={item.vwap.startsWith('+') ? 'change-positive' : 'change-negative'}>{item.vwap}</span></td><td className="mono-cell muted-cell">{item.atr}</td><td className="muted-cell">{item.volume}</td><td><ChevronRight size={16} className="row-arrow" /></td></tr>)}</tbody></table></div><div className="table-footer"><span><span className="pulse-dot" /> 最后一根已收盘 K 线 · 08/27 16:00 UTC</span><button onClick={() => setToast(`${selectedSymbol} 已选中，可查看详细指标`)}>查看 {selectedSymbol} <ChevronRight size={14} /></button></div></Card></section>
        <section className="bottom-grid"><Card className="performance-card"><CardHeader className="card-heading-row"><div><CardTitle>收益表现</CardTitle><CardDescription>按交易日汇总 · 未扣除手续费</CardDescription></div><span className="mini-period">10D <ChevronRight size={13} /></span></CardHeader><CardContent><ResponsiveContainer width="100%" height={160}><LineChart data={performance} margin={{ top: 8, right: 8, left: -26, bottom: 0 }}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#ebe7df" /><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#918d84', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#918d84', fontSize: 10 }} tickFormatter={(v) => `${v}%`} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e6e0d5', fontSize: 12 }} formatter={(value) => [`${Number(value).toFixed(2)}%`, '收益']} /><Line type="monotone" dataKey="value" stroke="#6f8172" strokeWidth={2.2} dot={{ r: 2.5, fill: '#6f8172', strokeWidth: 0 }} /></LineChart></ResponsiveContainer></CardContent></Card><Card className="next-card"><CardHeader><div className="next-title"><span className="next-icon"><Clock3 size={16} /></span><div><CardTitle>下一步建议</CardTitle><CardDescription>让研究结果更接近真实交易</CardDescription></div></div></CardHeader><CardContent><div className="recommendation"><div className="recommendation-number">01</div><div><strong>加入交易成本再测一次</strong><p>把手续费、滑点和资金费率纳入回测，重新判断利润因子是否仍然大于 1。</p></div><ChevronRight size={17} className="recommendation-arrow" /></div><div className="recommendation"><div className="recommendation-number">02</div><div><strong>做样本外 Walk-forward</strong><p>避免参数只适配当前仍可交易的合约，提升策略评估的可靠性。</p></div><ChevronRight size={17} className="recommendation-arrow" /></div></CardContent></Card></section>
        <footer className="page-footer"><span>Gate Quant Lab · v0.1 research preview</span><span><ShieldCheck size={14} /> 不构成投资建议</span><span><Send size={14} /> Telegram alerts</span></footer>
      </div>
    </section>
    {toast && <output className="toast"><span className="toast-mark"><ShieldCheck size={14} /></span>{toast}</output>}
  </main>;
}
