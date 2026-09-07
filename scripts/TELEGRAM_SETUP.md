# Telegram 研究信号接入

通知由 GitHub Actions 在服务器端运行。Bot Token 不进入网页、不进入 Git
提交，也不会发送或读取任何交易所私钥。

1. 在 Telegram 打开官方 `@BotFather`，使用 `/newbot` 创建机器人并保存 Token。
2. 在仓库 `Settings → Secrets and variables → Actions` 新增加密密钥
   `TELEGRAM_BOT_TOKEN`。不要把 Token 写入代码、Issues 或聊天记录。
3. 打开新机器人并发送 `/start`。
4. 在仓库 Actions 的 `Telegram research alerts` 中运行工作流，模式选择
   `discover-chat`；从日志复制数字会话 ID。
5. 回到 Actions Secrets，新增 `TELEGRAM_CHAT_ID`，值为上一步的数字。
6. 再运行一次工作流并选择 `test`。收到测试消息后，定时扫描即已生效。

定时任务在每个 15 分钟边界后的第 7 分钟检查已收盘 K 线。P0 是独立的
4H 最高优先级提醒，P1 是 V33 15 分钟首次回踩提醒。相同标的、方向和收盘
时间只发送一次；没有合格信号时不发消息。

这是研究与前向模拟通知，不会自动下单，也不代表策略已经达到目标胜率或
盈利因子。
