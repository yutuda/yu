# 美股永续 · 40x

这是 Rank Pullback 指标的独立压力测试项目。只做历史数据研究，不读取私钥、不发送订单。

- 数据窗口：Gate Futures 公共 15m K 线，当前仍可交易的合约
- 杠杆：40x
- 交易成本：双边手续费、滑点与资金费率均按 config.json 的压力假设计入
- 爆仓模型：按最大不利波动与近似维持保证金阈值判断

运行总测试：`python research/run_leverage_stability.py`
