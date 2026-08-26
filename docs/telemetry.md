# 聚合遥测（Telemetry）

MyCo-KB 通过 **daemon 定时**上报**严格匿名的聚合统计**，用于展示产品的运行状态。**本机制绝不采集具体的知识、文档内容、文件名、包 id/名称、tag 名称、IP。**

## 一句话结论

- **采集**：仅匿名聚合 `counts` + 版本/平台 + 运行状态布尔值，**不含任何知识内容**。
- **opt-in（默认关）**：**默认不上报**——只有用户在控制台**勾选「统计共享」**或 `myco telemetry on` 才上报；未启用时发送任何数据。
- **护栏**：即使启用，也需上报 `url`（开发者统计端点，默认在 `cordis.patch.yml` 的 `telemetry.url`）；`url` 为空则勾选也不会发送（`myco telemetry status` 显示「上报端点未配置」）。
- **一键关闭**：取消勾选 / `myco telemetry off`，或用 `MYCO_TELEMETRY=0` 整机禁用（kill switch）。
- **频率**：随 daemon 定时维护，默认每 24h 一次（`telemetry.intervalHours` 可调）；成功发送一次后按间隔门控。
- **设置页**：控制台底部有「统计共享」勾选 + 「相关链接」（源码 / 站点文档 / 个人站点，链接在 `cordis.patch.yml` 的 `links` 配置）。

## 上报什么（严格白名单）

```json
{
  "schema": 1,
  "product": "myco-kb",
  "instanceId": "<随机 UUID>",
  "version": "0.6.0",
  "platform": "darwin",        // process.platform
  "arch": "arm64",             // process.arch
  "nodeVersion": "24.18.1",
  "generatedAt": "<ISO 时间>",
  "counts": {
    "packages": 3,             // 知识包数量（仅数量）
    "documents": 40,           // 文档数量（仅数量）
    "tags": 19,                // tag 数量（仅数量，不含 tag 名称）
    "mounts": 3,               // 挂载数
    "cloudMounts": 1,          // 云端挂载数
    "subscribedSync": 1,       // 订阅同步数
    "lifecycleCandidates": 0,  // 生命周期候选数
    "events": 12,              // 变更事件数
    "stale": 2                 // stale 节点数
  },
  "indexFresh": true,
  "hasErrors": false,
  "errorCount": 0,
  "activeProfile": false
}
```

**不**采集：包 id/名称、文件名/相对路径、文档标题、tag 名称、契约 id、正文/内容、错误详情、IP、任何用户/组织身份。

> `instanceId` 是首次运行时生成的**随机 UUID**，仅用于去重计数「活跃安装」；与任何个人/组织无关，不是 PII。

## 怎么配置

```bash
myco telemetry status          # 查看配置 + 本次将上报的聚合指标
myco telemetry set https://your-status-host/ingest   # 设置上报 url（覆盖插件默认）
myco telemetry on              # 启用（opt-in；控制台「统计共享」勾选也可）
myco telemetry off             # 关闭（取消勾选亦可）
myco telemetry now             # 立即上报一次（校验）
```

配置存 `~/.myco/config.json` 的 `telemetry`（插件默认值见 `cordis.patch.yml`，可被覆盖）：

```json
{ "telemetry": { "enabled": true, "provider": "posthog", "url": "https://us.i.posthog.com/i/v0/e/", "apiKey": "", "intervalHours": 24, "lastSentAt": "..." } }
```

- **provider**：`generic`（POST 原始聚合 JSON）或 `posthog`（PostHog 单事件格式）。
- **apiKey**：PostHog 项目 token（`phc_...`）；优先 `telemetry.apiKey`，或环境变量 `POSTHOG_API_KEY`。
- `MYCO_TELEMETRY=0`：整机禁用（优先级高于 enabled）。
- daemon（`myco daemon` 或插件宿主平面）每周期调用 `telemetryTick()`，按 `intervalHours` 与 `lastSentAt` 决定是否发送；发送失败不阻塞定时循环。

## PostHog 集成（provider=posthog）

按 PostHog 云端摄入端点发送**单事件**：

```bash
myco telemetry set https://us.i.posthog.com/i/v0/e/   # 或 EU: https://eu.i.posthog.com/i/v0/e/
# myco telemetry 的 url 由插件默认（cordis.patch.yml）给出，通常无需再 set
```

事件体（`POST {url}`，`Content-Type: application/json`）：

```json
{
  "api_key": "phc_...",
  "event": "myco_kb_heartbeat",
  "distinct_id": "<随机 UUID>",
  "timestamp": "<ISO>",
  "properties": { "version": "0.6.0", "platform": "darwin", "counts_packages": 3, "...": "..." }
}
```

- `api_key` = PostHog **项目 token（`phc_`，公开的摄入 key）**——它本来就会出现在前端代码里，**不是机密**；但若担心公库可见，可用 `POSTHOG_API_KEY` 环境变量或本地 profile 覆盖，不要写进公开 `cordis.patch.yml`。
- `distinct_id` = 匿名随机 UUID（≤200 字符），PostHog 会据此建立**匿名 person 记录**（只关联随机 id，不关联任何个人/组织/内容）。
- `properties` 全为聚合计数/版本/平台/状态，**无任何知识内容、包 id/名、文件名、IP**。
- PostHog 公开 dashboard 可直接当作**公开状态页**（脱敏展示聚合 total，不点名组织）。
- 建议在 PostHog 项目里**关闭自采集/录制**（我们只 server 端 POST 这一个事件，本身不触发录制）。

## 合规要点

- **最小化**：只发匿名聚合计数，无内容/标识/IP。
- **opt-in**：默认关，用户显式勾选/`myco telemetry on` 才上报（比默认开更合规）。
- **可关闭**：取消勾选 / `telemetry off` / `MYCO_TELEMETRY=0`，即彻底停止。
- **透明**：本页 + 官网《隐私与遥测》说明数据范围；控制台底部有勾选与说明。
- **非默认外发**：默认关 + 需配置 `url` 才发送；未配置 `url` 时即使勾选也不上报。
- 若进一步要求「零外发 / 离线 / 脱敏运行」，用 `myco telemetry off` 或 `MYCO_TELEMETRY=0`，或在 `telemetry.url` 留空。

> 提醒：企业客户可能要求**默认零回传**。本实现的「需配置 url 才发送」已避免默认外发；若客户要求更严格，可直接关闭。

## 公开状态页（如何消费这份数据）

状态页/宿主是一个**接收聚合 JSON 的服务**（可用任意 HTTP 端点 / 托管分析，如 Umami、PostHog，或自建小后端）。`myco telemetry set <url>` 指向它即可。

展示建议（脱敏）：总活跃安装数、总知识包/文档数、版本分布、平台分布、最近心跳。**不要**展示任何客户标识、包名、项目名。公开状态页展示的是**聚合总量**，不点名任何组织。
