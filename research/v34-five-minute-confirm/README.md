# V34 Five-Minute Confirmation

V34 is a completed but rejected research version. It keeps the V33 15-minute first-pullback candidate, then requires confirmation from one of the next three fully closed 5-minute candles.

## One-year account result

- Period: 2025-09-01 to 2026-09-01
- Data: 40 Binance USD-M perpetual proxies; 5-minute data was also aggregated to 15 minutes so every comparison used the same source
- Execution: next 5-minute open, closed candles only, same-bar stop first
- Account: 500 USDT, 5% planned risk per trade, 10x gross cap, maximum four positions and two in the same direction
- Costs: fees, slippage and funding ignored, as requested
- Trades: 1,094
- Frequency: 3.00 trades/day
- Win rate: 43.24%
- Profit factor: 0.823
- Return: -99.11%
- Maximum closed-equity drawdown: -99.29%
- Stops wider than 2%: 7.31%

Target: at least 65% win rate, 1.6 profit factor, and two account trades per day.

Decision: FAIL. Frequency passed, but win rate and profit factor failed decisively. V34 is displayed on the website for transparency only and does not generate live entry prompts.

## Comparison

- V33 baseline: 288 account trades, 0.79/day, 44.44% win rate, PF 0.868
- Entering a waiting setup merely because its score was at least 88: 4,616 account trades, 12.65/day, 44.82% win rate, PF 0.952
- V34 15m candidate plus 5m confirmation: 1,094 account trades, 3.00/day, 43.24% win rate, PF 0.823

The score is therefore trend context, not a probability of winning or permission to enter.

Exit tuning and predeclared filters based on 4H direction, 5m/15m volume, rank extremeness and extension did not produce a configuration that met all targets. The best validation exit variant reached roughly 62.10% win rate and 1.088 PF, still below target. This indicates an entry-quality problem rather than an exit-parameter problem.
