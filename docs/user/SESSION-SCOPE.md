# 用户端Mock会话边界

版本：v0.2
日期：2026-11-08
状态：Active

## 职责

本会话负责维护Affiliate用户端静态Mock原型、页面交互、演示数据、用户端UI/UX、本地运行和浏览器验证。

## 边界

1. 不修改管理端原型、管理端视觉标准、管理端Mock Server或管理端OpenAPI。
2. 不定义或修改生产业务规则、佣金参数、风控阈值、审批权限和生产接口承诺。
3. 发现业务口径缺口时，只登记为待确认问题；不用演示数据冒充已确认需求。
4. 用户端可见文案和代码注释不出现竞品名称。
5. 联系方式、收款账号、税号和设备信息仅展示脱敏摘要。

## 当前路由

`dash / perf / clients / summary / assets / promo / subchannels / deep / tracker / lookup / pay / statements / wd / guarantee / support / account / appeals / messages / export / apply / onboarding`

其中`account`仅通过右上角头像菜单进入；`statements`是隐藏兼容入口；`export`属于服务中心正式路由；`apply`和`onboarding`不在左侧正式导航展示，仅通过合作者计划与入驻流程进入。

隐藏Mock状态`closure-flow`用于演示合作方清退，不在正式顶栏展示。该状态会下线推广入口、暂停新提现，并保留账户、结算单、保证金、申诉与消息链路。

## 模拟控制台

线上 Mock 保留右下角「模拟」入口，供各部门共同测试。控制台支持 Mock 时间推进、单条仿真客户录入、主动违规事件注入、场景切换、快照导入/导出、操作日志和环境重置；批量录入暂不做。

违规事件由模拟状态机自动联动客户、佣金、资金、消息和申诉页面。重置只恢复初始 Mock 日期 `2026-10-27` 与正常流场景，保留仿真客户、违规事件和操作日志。详细规则见[模拟控制台规范](simulation-console-v0.1.md)和[工作上下文索引](CONTEXT-INDEX.md)。

## 必读基线

1. `/Users/evechaqq.com/Documents/Affiliate/DESIGN.md`
2. `/Users/evechaqq.com/Documents/Affiliate/原型/页面规范/00A-用户端页面设计与交互规范.md`
3. `docs/design/figma-user-side-design-baseline-v0.1.md`

## 验证

最小验证集：

```bash
npm run check
npm run test:design-tokens
npm run test:tables
npm run test:ui
npm run test:simulation-console
npm run test:v1
```

涉及资金、报表、服务中心时，应追加对应页面检查。
