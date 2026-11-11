# 用户端 Mock 工作上下文索引

版本：v0.1  
日期：2026-11-08  
状态：Active

本文是用户端 Mock 实现会话的工作入口，用于快速判断当前范围、资料来源、已有实现和验证方式。它不替代产品规则、页面契约或设计规范。

## 会话边界

本仓库只维护 Affiliate 用户端 Mock：页面 UI、UX、演示数据、状态反馈、交互、浏览器运行和本地验证。

- 用户端视觉以项目仓库外的 `DESIGN.md` 与 `原型/页面规范/00A-用户端页面设计与交互规范.md` 为准。
- 页面结构以 `原型/页面规范/01~21` 对应页面文件和用户最新明确指示为准。
- 不修改管理端页面、管理端视觉、生产业务规则、真实 CRM/支付/税务/银行/欺诈库集成或 PRD/API/事件契约正文。
- 发现业务规则缺口时，保留为 Mock 演示状态或回传待确认问题，不把演示数据写成生产口径。

## 当前用户端范围

当前入口包含数据总览、推广管理、收益中心、服务中心、合作者计划和入驻申请等用户端页面。主要路由如下：

`dash / perf / clients / summary / promo / subchannels / deep / tracker / assets / lookup / pay / statements / wd / guarantee / appeals / messages / support / account / export / apply / onboarding`

`account` 仅通过右上角头像菜单进入，`statements` 是隐藏兼容入口，`export` 是服务中心正式路由；`apply` 和 `onboarding` 是前置流程页，不在常规左侧菜单中直接展示。管理端入口文件仍在仓库中，但不属于本会话维护范围。

## 模拟控制台

右下角“模拟”入口在线保留，打开右侧抽屉，服务于跨部门测试和评审：

| 页签 | 当前能力 |
|---|---|
| 时间 | Mock 日期、+1/+7/+30 天、自定义 1-180 天、推进后的佣金/Hold/保证金/可提现/拒绝/冲正变化 |
| 录入 | 单条录入虚构仿真客户；批量录入暂不做 |
| 违规 | 主动注入违规事件，可指定已有仿真客户或自动生成 SIM 客户 |
| 场景 | 正常流、合作清退、Loading、空态、API 异常 |
| 数据 | 复制/下载/导入快照，查看数量，二次确认重置 Mock 环境 |
| 日志 | 时间推进、录入、违规注入、场景、导入和重置记录 |

违规事件通过模拟状态机自动联动客户、佣金、资金、消息和申诉页面。重置只恢复初始 Mock 日期 `2026-10-27` 与正常流场景，保留仿真客户、违规事件和日志。所有对象使用 `SIM-` 前缀或 `source: "mock-console"`，不使用真实个人隐私。

详细交互和数据边界见 [simulation-console-v0.1.md](simulation-console-v0.1.md)。

资金状态同步记录见 [finance-flow-sync-v0.1.md](finance-flow-sync-v0.1.md)。

竞争红队评审结论见 [competitive-red-team-review-v0.1.md](competitive-red-team-review-v0.1.md)；完成合作者计划后的首登教育方案见 [post-program-onboarding-guide-v0.1.md](post-program-onboarding-guide-v0.1.md)。

## 验证入口

```bash
npm run check
npm run test:simulation-console
npm run test:design-tokens
npm run test:tables
npm run test:ui
npm run test:v1
```

涉及报表、资金、服务中心或用户端新增页面时，再追加对应的专项检查脚本。浏览器服务默认运行在 `http://127.0.0.1:4179`。

## 当前工作方式

1. 先读本索引、`docs/user/SESSION-SCOPE.md`、仓库 README，再按页面任务读取外部 `DESIGN.md`、00A 和单页规范。
2. 先确认是否已有路由、组件和数据源可复用，再做局部修改。
3. 全站下拉复用 `AFF.dropdown v1.1.0`；未有明确需求不修改其视觉样式。
4. 改动后运行最小专项检查，再运行与页面范围相匹配的回归检查。
5. 结论区分“已实现并验证”“Mock 演示”“待产品确认”，不夸大为生产能力。
