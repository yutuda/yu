"""Send Gate Quant Lab research alerts to Telegram.

The scanner reads public Gate futures data only. Telegram credentials are read
from GitHub Actions secrets; no exchange credentials are accepted and no orders
are submitted. Signals use completed candles and are de-duplicated by candle.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
import pandas as pd


GATE_API = "https://api.gateio.ws/api/v4/futures/usdt"
TELEGRAM_API = "https://api.telegram.org"
SITE_URL = "https://yutuda.github.io/yu/?v=33"
STATE_FILE = Path(os.environ.get("ALERT_STATE_FILE", ".cache/telegram-alerts.json"))
MIN_LIQUIDITY = 1_000_000.0
MAX_SPREAD_PERCENT = 0.30
MAINSTREAM_CRYPTO = {
    "BTC_USDT", "ETH_USDT", "BNB_USDT", "SOL_USDT", "XRP_USDT",
    "DOGE_USDT", "ADA_USDT", "AVAX_USDT", "LINK_USDT", "TRX_USDT",
    "LTC_USDT", "BCH_USDT", "DOT_USDT", "AAVE_USDT", "UNI_USDT",
    "SUI_USDT", "TON_USDT", "NEAR_USDT",
}


def request_json(url: str, payload: dict[str, Any] | None = None) -> Any:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json", "User-Agent": "GateQuantLabAlerts/1.0"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(Request(url, data=body, headers=headers), timeout=25) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(1.2 * (attempt + 1))
    raise RuntimeError("远程 API 请求失败") from last_error


def gate_get(path: str, **params: Any) -> Any:
    query = urlencode({key: value for key, value in params.items() if value is not None})
    return request_json(f"{GATE_API}{path}?{query}" if query else f"{GATE_API}{path}")


def number(record: dict[str, Any], *fields: str) -> float:
    for field in fields:
        try:
            value = float(record.get(field) or 0)
        except (TypeError, ValueError):
            continue
        if value > 0:
            return value
    return 0.0


def discover_universe() -> list[str]:
    contracts = gate_get("/contracts")
    tickers = gate_get("/tickers")
    ticker_map = {row.get("contract"): row for row in tickers}
    candidates: list[tuple[str, float]] = []
    for contract in contracts:
        symbol = contract.get("name")
        if not symbol or contract.get("status") != "trading" or contract.get("in_delisting"):
            continue
        is_stock = str(contract.get("contract_type", "")).lower() == "stocks"
        if not is_stock and symbol not in MAINSTREAM_CRYPTO:
            continue
        ticker = ticker_map.get(symbol, {})
        volume = number(ticker, "volume_24h_quote", "volume_24h_settle", "volume_24h_usd")
        bid = number(ticker, "highest_bid")
        ask = number(ticker, "lowest_ask")
        midpoint = (bid + ask) / 2
        spread_percent = ((ask - bid) / midpoint * 100) if midpoint > 0 and ask >= bid else np.inf
        if volume >= MIN_LIQUIDITY and spread_percent <= MAX_SPREAD_PERCENT:
            candidates.append((symbol, volume))
    candidates.sort(key=lambda item: item[1], reverse=True)
    return [symbol for symbol, _ in candidates]


def fetch_candles(symbol: str, interval: str, seconds: int) -> pd.DataFrame:
    rows = gate_get(
        "/candlesticks", contract=symbol, interval=interval, limit=260, timezone="utc0"
    )
    if not isinstance(rows, list):
        raise ValueError(f"{symbol} {interval} K 线格式异常")
    frame = pd.DataFrame(rows).rename(
        columns={"t": "time", "o": "open", "h": "high", "l": "low", "c": "close", "v": "volume"}
    )
    required = ["time", "open", "high", "low", "close", "volume"]
    if not set(required).issubset(frame.columns):
        raise ValueError(f"{symbol} {interval} K 线字段不足")
    for column in required:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame = frame.dropna(subset=required).sort_values("time").drop_duplicates("time")
    now = int(time.time())
    frame = frame[frame.time.astype("int64") + seconds <= now].copy()
    frame["time"] = pd.to_datetime(frame.time, unit="s", utc=True)
    frame["contract"] = symbol
    if len(frame) < 60:
        raise ValueError(f"{symbol} {interval} 已收盘 K 线不足")
    return frame.reset_index(drop=True)


def fetch_market(symbol: str) -> tuple[str, dict[str, pd.DataFrame]]:
    return symbol, {
        "15m": fetch_candles(symbol, "15m", 900),
        "1h": fetch_candles(symbol, "1h", 3600),
        "4h": fetch_candles(symbol, "4h", 14400),
    }


def fetch_all(symbols: list[str]) -> dict[str, dict[str, pd.DataFrame]]:
    result: dict[str, dict[str, pd.DataFrame]] = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(fetch_market, symbol): symbol for symbol in symbols}
        for future in as_completed(futures):
            symbol = futures[future]
            try:
                key, frames = future.result()
                result[key] = frames
            except Exception as exc:  # keep scanning when one contract is unavailable
                print(f"跳过 {symbol}: {exc}")
    return result


def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()


def trend_series(frame: pd.DataFrame, slope_bars: int) -> pd.DataFrame:
    featured = frame.copy()
    featured["ema20"] = ema(featured.close, 20)
    featured["ema50"] = ema(featured.close, 50)
    slope = featured.ema50 / featured.ema50.shift(slope_bars) - 1
    featured["trend"] = np.where(
        (featured.close > featured.ema20) & (featured.ema20 > featured.ema50) & (slope > 0),
        1,
        np.where(
            (featured.close < featured.ema20) & (featured.ema20 < featured.ema50) & (slope < 0),
            -1,
            0,
        ),
    )
    return featured[["time", "trend"]].assign(time=lambda value: value.time)


def add_v33_indicators(base: pd.DataFrame, hourly: pd.DataFrame, four_hour: pd.DataFrame) -> pd.DataFrame:
    frame = base.copy()
    previous = frame.close.shift(1)
    true_range = pd.concat(
        [frame.high - frame.low, (frame.high - previous).abs(), (frame.low - previous).abs()], axis=1
    ).max(axis=1)
    frame["atr"] = true_range.rolling(15).mean()
    typical = (frame.high + frame.low + frame.close) / 3
    frame["vwap16"] = (typical * frame.volume).rolling(16).sum() / frame.volume.rolling(16).sum()
    frame["volume_ratio"] = frame.volume / frame.volume.shift(1).rolling(30).mean()
    frame["rank_return"] = frame.close / frame.close.shift(16) - 1
    frame["close_time"] = frame.time + pd.Timedelta(minutes=15)
    h1 = trend_series(hourly, 6).rename(columns={"time": "higher_close", "trend": "h1_trend"})
    h1["higher_close"] += pd.Timedelta(hours=1)
    h4 = trend_series(four_hour, 3).rename(columns={"time": "higher_close", "trend": "h4_trend"})
    h4["higher_close"] += pd.Timedelta(hours=4)
    frame = pd.merge_asof(
        frame.sort_values("close_time"), h1.sort_values("higher_close"),
        left_on="close_time", right_on="higher_close", direction="backward",
    ).drop(columns="higher_close")
    frame = pd.merge_asof(
        frame.sort_values("close_time"), h4.sort_values("higher_close"),
        left_on="close_time", right_on="higher_close", direction="backward",
    ).drop(columns="higher_close")
    frame[["h1_trend", "h4_trend"]] = frame[["h1_trend", "h4_trend"]].fillna(0).astype("int8")
    return frame.reset_index(drop=True)


def run_v33_machine(frame: pd.DataFrame, universe_size: int) -> pd.DataFrame:
    size = len(frame)
    signal = np.zeros(size, dtype=np.int8)
    state = np.full(size, "NO_SETUP", dtype=object)
    stop_out = np.full(size, np.nan)
    level_out = np.full(size, np.nan)
    previous_high = frame.high.shift(1).rolling(12).max().to_numpy(float)
    previous_low = frame.low.shift(1).rolling(12).min().to_numpy(float)
    close = frame.close.to_numpy(float)
    opening = frame.open.to_numpy(float)
    high = frame.high.to_numpy(float)
    low = frame.low.to_numpy(float)
    atr = frame.atr.to_numpy(float)
    vwap = frame.vwap16.to_numpy(float)
    volume_ratio = frame.volume_ratio.to_numpy(float)
    ranks = frame["rank"].to_numpy(float)
    h1 = frame.h1_trend.to_numpy(np.int8)
    h4 = frame.h4_trend.to_numpy(np.int8)
    direction = 0
    breakout_bar = -1
    breakout_level = np.nan
    pullback_bar = -1
    pullback_extreme = np.nan

    def reset() -> None:
        nonlocal direction, breakout_bar, breakout_level, pullback_bar, pullback_extreme
        direction, breakout_bar, pullback_bar = 0, -1, -1
        breakout_level, pullback_extreme = np.nan, np.nan

    for index in range(60, size):
        if not np.isfinite(atr[index]) or atr[index] <= 0 or not np.isfinite(ranks[index]):
            continue
        if direction:
            level_out[index] = breakout_level
            invalid = (
                close[index] < breakout_level - 0.25 * atr[index]
                if direction == 1 else close[index] > breakout_level + 0.25 * atr[index]
            )
            if invalid:
                state[index] = "INVALIDATED"
                reset()
                continue
            if index - breakout_bar > 12:
                state[index] = "EXPIRED"
                reset()
                continue
            if pullback_bar < 0:
                touched = (
                    low[index] <= breakout_level + 0.35 * atr[index]
                    if direction == 1 else high[index] >= breakout_level - 0.35 * atr[index]
                )
                if touched:
                    pullback_bar = index
                    pullback_extreme = low[index] if direction == 1 else high[index]
                    state[index] = "WAIT_CONFIRM"
                else:
                    state[index] = "WAIT_PULLBACK"
                continue
            pullback_extreme = min(pullback_extreme, low[index]) if direction == 1 else max(pullback_extreme, high[index])
            if index - pullback_bar > 3:
                state[index] = "EXPIRED"
                reset()
                continue
            extension = ((close[index] - breakout_level) / atr[index]) if direction == 1 else ((breakout_level - close[index]) / atr[index])
            three_same = np.all(close[index - 2:index + 1] > opening[index - 2:index + 1]) if direction == 1 else np.all(close[index - 2:index + 1] < opening[index - 2:index + 1])
            impulse = ((close[index] - opening[index - 2]) / atr[index]) if direction == 1 else ((opening[index - 2] - close[index]) / atr[index])
            rank_ok = ranks[index] <= 5 if direction == 1 else ranks[index] > universe_size - 5
            trigger = (close[index] > high[index - 1] and close[index] > opening[index]) if direction == 1 else (close[index] < low[index - 1] and close[index] < opening[index])
            aligned = h1[index] == direction and h4[index] != -direction
            quality = volume_ratio[index] >= 0.8 and extension <= 0.8 and not (three_same and impulse > 1.8) and (close[index] >= vwap[index] if direction == 1 else close[index] <= vwap[index])
            if index - pullback_bar >= 1 and trigger and aligned and rank_ok and quality:
                signal[index] = direction
                state[index] = "READY"
                stop_out[index] = pullback_extreme - 0.1 * atr[index] if direction == 1 else pullback_extreme + 0.1 * atr[index]
                reset()
            else:
                state[index] = "WAIT_CONFIRM"
            continue
        long_rank = ranks[index] <= 10
        short_rank = ranks[index] > universe_size - 10
        long_break = close[index] > previous_high[index] and h1[index] == 1 and h4[index] != -1 and long_rank
        short_break = close[index] < previous_low[index] and h1[index] == -1 and h4[index] != 1 and short_rank
        if long_break or short_break:
            direction = 1 if long_break else -1
            breakout_bar = index
            breakout_level = previous_high[index] if direction == 1 else previous_low[index]
            state[index] = "WAIT_PULLBACK"
            level_out[index] = breakout_level
    output = frame.copy()
    output["signal"] = signal
    output["entry_state"] = state
    output["structure_stop"] = stop_out
    output["breakout_level"] = level_out
    return output


def add_v33_ranks(markets: dict[str, dict[str, pd.DataFrame]]) -> dict[str, pd.DataFrame]:
    featured = {
        symbol: add_v33_indicators(frames["15m"], frames["1h"], frames["4h"])
        for symbol, frames in markets.items()
    }
    panel = pd.concat(
        [frame[["time", "rank_return"]].assign(contract=symbol) for symbol, frame in featured.items()],
        ignore_index=True,
    )
    panel["rank"] = panel.groupby("time").rank_return.rank(ascending=False, method="first")
    result: dict[str, pd.DataFrame] = {}
    for symbol, frame in featured.items():
        ranked = frame.merge(panel[["time", "contract", "rank"]], on=["time", "contract"], how="left")
        result[symbol] = run_v33_machine(ranked, len(featured))
    return result


def wilder(series: pd.Series, period: int = 14) -> pd.Series:
    return series.ewm(alpha=1 / period, adjust=False).mean()


def h4_snapshot(frame: pd.DataFrame) -> dict[str, Any]:
    featured = frame.copy()
    featured["ema20"] = ema(featured.close, 20)
    featured["ema50"] = ema(featured.close, 50)
    featured["ema200"] = ema(featured.close, 200)
    previous = featured.close.shift(1)
    true_range = pd.concat(
        [featured.high - featured.low, (featured.high - previous).abs(), (featured.low - previous).abs()], axis=1
    ).max(axis=1)
    plus_move = featured.high.diff()
    minus_move = -featured.low.diff()
    plus_dm = plus_move.where((plus_move > minus_move) & (plus_move > 0), 0.0)
    minus_dm = minus_move.where((minus_move > plus_move) & (minus_move > 0), 0.0)
    smoothed_tr = wilder(true_range)
    plus_di = 100 * wilder(plus_dm) / smoothed_tr.replace(0, np.nan)
    minus_di = 100 * wilder(minus_dm) / smoothed_tr.replace(0, np.nan)
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    featured["atr"] = wilder(true_range)
    featured["adx"] = wilder(dx).fillna(0)
    featured["plus_di"] = plus_di.fillna(0)
    featured["minus_di"] = minus_di.fillna(0)
    featured["volume_ratio"] = featured.volume / featured.volume.shift(1).rolling(30).mean()
    featured["rank_return"] = featured.close / featured.close.shift(6) - 1
    end = featured.iloc[-1]
    previous_bar = featured.iloc[-2]
    slope = end.ema50 / featured.iloc[-4].ema50 - 1
    long_trend = end.close > end.ema50 > end.ema200 and slope > 0 and end.plus_di > end.minus_di
    short_trend = end.close < end.ema50 < end.ema200 and slope < 0 and end.minus_di > end.plus_di
    long_entry = long_trend and end.adx >= 22 and end.volume_ratio >= 1 and end.close > previous_bar.high and (end.close - end.ema20) / end.atr <= 1.25
    short_entry = short_trend and end.adx >= 22 and end.volume_ratio >= 1 and end.close < previous_bar.low and (end.ema20 - end.close) / end.atr <= 1.25
    return {
        "time": end.time,
        "close": float(end.close),
        "atr": float(end.atr),
        "adx": float(end.adx),
        "volume_ratio": float(end.volume_ratio),
        "rank_return": float(end.rank_return),
        "direction": 1 if long_entry else -1 if short_entry else 0,
    }


def make_alerts(markets: dict[str, dict[str, pd.DataFrame]]) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    h4 = {symbol: h4_snapshot(frames["4h"]) for symbol, frames in markets.items() if len(frames["4h"]) >= 205}
    ordered_h4 = sorted(h4, key=lambda symbol: h4[symbol]["rank_return"], reverse=True)
    for rank, symbol in enumerate(ordered_h4, start=1):
        snap = h4[symbol]
        extreme = rank == 1 if snap["direction"] == 1 else rank == len(ordered_h4) if snap["direction"] == -1 else False
        closed_at = snap["time"] + pd.Timedelta(hours=4)
        if snap["direction"] and extreme and (now - closed_at.to_pydatetime()).total_seconds() <= 5 * 3600:
            risk = snap["atr"] * 1.5
            alerts.append({
                "priority": "P0", "timeframe": "4H", "symbol": symbol,
                "direction": snap["direction"], "closed_at": closed_at,
                "price": snap["close"], "stop": snap["close"] - snap["direction"] * risk,
                "tp1": snap["close"] + snap["direction"] * risk,
                "tp2": snap["close"] + snap["direction"] * risk * 2,
                "detail": f"4H 排名 {rank}/{len(ordered_h4)} · ADX {snap['adx']:.1f} · 量比 {snap['volume_ratio']:.2f}x",
            })
    ranked_v33 = add_v33_ranks(markets)
    for symbol, frame in ranked_v33.items():
        latest = frame.iloc[-1]
        closed_at = latest.close_time
        if latest.entry_state != "READY" or int(latest.signal) == 0:
            continue
        if (now - closed_at.to_pydatetime()).total_seconds() > 35 * 60:
            continue
        direction = int(latest.signal)
        risk = abs(float(latest.close) - float(latest.structure_stop))
        alerts.append({
            "priority": "P1", "timeframe": "15m V33", "symbol": symbol,
            "direction": direction, "closed_at": closed_at, "price": float(latest.close),
            "stop": float(latest.structure_stop),
            "tp1": float(latest.close) + direction * risk,
            "tp2": float(latest.close) + direction * risk * 1.2,
            "detail": f"首次回踩确认 · 强弱排名 {int(latest['rank'])}/{len(ranked_v33)} · 量比 {latest.volume_ratio:.2f}x",
        })
    return sorted(alerts, key=lambda item: (item["priority"], item["symbol"]))


def load_state() -> dict[str, int]:
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        return {str(key): int(value) for key, value in data.items()}
    except (OSError, ValueError, TypeError):
        return {}


def save_state(state: dict[str, int]) -> None:
    cutoff = int(time.time()) - 7 * 86400
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        json.dumps({key: value for key, value in state.items() if value >= cutoff}, indent=2),
        encoding="utf-8",
    )


def format_price(value: float) -> str:
    if value >= 1000:
        return f"{value:,.2f}"
    if value >= 1:
        return f"{value:.4f}".rstrip("0").rstrip(".")
    return f"{value:.8f}".rstrip("0").rstrip(".")


def beijing_time(value: pd.Timestamp) -> str:
    return value.tz_convert("Asia/Shanghai").strftime("%Y-%m-%d %H:%M")


def alert_message(alert: dict[str, Any]) -> str:
    direction = "LONG 做多" if alert["direction"] == 1 else "SHORT 做空"
    heading = "🚨 P0 · 4H 最高优先级" if alert["priority"] == "P0" else "⚡ P1 · 15m V33 次级开单"
    return (
        f"<b>{heading}</b>\n"
        f"标的：<code>{html.escape(alert['symbol'])}</code>\n"
        f"方向：<b>{direction}</b>\n"
        f"信号收盘（北京时间）：{beijing_time(alert['closed_at'])}\n"
        f"理论入场：下一根开盘附近（参考 {format_price(alert['price'])}）\n"
        f"研究止损：{format_price(alert['stop'])}\n"
        f"TP1：{format_price(alert['tp1'])} · TP2：{format_price(alert['tp2'])}\n"
        f"条件：{html.escape(alert['detail'])}\n\n"
        f"<a href=\"{SITE_URL}\">打开 Gate Quant Lab</a>\n"
        "仅用于研究与前向模拟，不构成投资建议，不会自动下单。"
    )


def telegram_send(token: str, chat_id: str, text: str) -> None:
    response = request_json(
        f"{TELEGRAM_API}/bot{token}/sendMessage",
        {"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True},
    )
    if not response.get("ok"):
        raise RuntimeError(f"Telegram 拒绝发送：{response.get('description', '未知错误')}")


def discover_chats(token: str) -> None:
    response = request_json(f"{TELEGRAM_API}/bot{token}/getUpdates?limit=50")
    if not response.get("ok"):
        raise RuntimeError(f"Telegram 无法读取会话：{response.get('description', '未知错误')}")
    chats: dict[str, dict[str, Any]] = {}
    for update in response.get("result", []):
        message = update.get("message") or update.get("channel_post") or {}
        chat = message.get("chat") or (update.get("my_chat_member") or {}).get("chat") or {}
        if "id" in chat:
            chats[str(chat["id"])] = chat
    if not chats:
        print("没有发现会话。请先在 Telegram 打开你的机器人并发送 /start，然后重试。")
        return
    print("发现以下 TELEGRAM_CHAT_ID（可复制到同名 GitHub Secret）：")
    for chat_id, chat in chats.items():
        label = chat.get("title") or chat.get("username") or chat.get("first_name") or "未命名会话"
        print(f"- {chat_id} | {chat.get('type', 'unknown')} | {label}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gate Quant Lab Telegram alerts")
    parser.add_argument("--test", action="store_true", help="send one connection test")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="scan live public data and print signal summaries without Telegram",
    )
    parser.add_argument(
        "--discover-chat",
        action="store_true",
        help="list chats that have messaged the bot without exposing the token",
    )
    args = parser.parse_args()
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if args.discover_chat:
        if not token:
            print("请先添加 TELEGRAM_BOT_TOKEN GitHub Secret。")
            return
        discover_chats(token)
        return
    if not args.dry_run and (not token or not chat_id):
        print("Telegram 尚未配置：请添加 TELEGRAM_BOT_TOKEN 与 TELEGRAM_CHAT_ID GitHub Secrets。")
        return
    if args.test:
        now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
        telegram_send(token, chat_id, f"✅ <b>Gate Quant Lab 已连接</b>\n测试时间：{html.escape(now)}\nP0=4H；P1=15m V33；仅研究提醒，不自动下单。")
        print("Telegram 测试消息发送成功。")
        return
    symbols = discover_universe()
    print(f"流动性合格扫描池：{len(symbols)} 个")
    markets = fetch_all(symbols)
    if len(markets) < 10:
        raise RuntimeError(f"有效行情只有 {len(markets)} 个，安全停止本轮提醒")
    state = load_state()
    sent = 0
    for alert in make_alerts(markets):
        closed_epoch = int(alert["closed_at"].timestamp())
        key = f"{alert['priority']}:{alert['symbol']}:{alert['direction']}:{closed_epoch}"
        if key in state:
            continue
        if args.dry_run:
            print(
                f"DRY RUN {alert['priority']} {alert['symbol']} "
                f"{'LONG' if alert['direction'] == 1 else 'SHORT'} "
                f"closed={alert['closed_at'].isoformat()}"
            )
            sent += 1
            continue
        telegram_send(token, chat_id, alert_message(alert))
        state[key] = int(time.time())
        sent += 1
    if not args.dry_run:
        save_state(state)
    action = "发现" if args.dry_run else "发现并发送"
    print(f"本轮完成：{action} {sent} 条新信号；无信号时保持静默。")


if __name__ == "__main__":
    main()
