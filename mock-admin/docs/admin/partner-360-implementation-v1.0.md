# 管理端合作方360 Mock 实现记录

- 状态：Active Mock
- 页面契约：`/Users/evechaqq.com/Documents/Affiliate/原型/页面规范/46-管理端-合作方360.md`
- 数据契约：`/Users/evechaqq.com/Documents/Affiliate/接口文档/Affiliate管理端合作方360页面数据契约-v1.0.md`
- 实现路由：`#/partner-360/:partner_id?tab=overview`
- 实现文件：`admin-dev.html`、`admin-dev.js`、`admin-dev.css`、`admin-prototype-data.js`

## 实现范围

合作方列表仍是管理端菜单入口。点击合作方行、详情或审核动作后，统一进入全屏合作方360对象页；旧的 `admin-modules/partner-list/:partner_id` 详情地址会重定向到新路由。

页面包含：

- 固定合作方头部、业务状态、CRM状态、C0-C4、R0-R3、责任运营和数据新鲜度。
- 主阻断和全部阻断标签。
- 点击、注册、FTD、有效FTD、佣金、待结算六项近30日指标。
- 概览、推广与归因、合规与资料、财务与结算、风险与信用、跟进与审计六个页签。
- 活动、链接、Sub ID、CRM、KYC/KYB、协议、收款、税务、佣金/结算案件、风险事件、集群和审计摘要。
- 只读边界：推广对象、CRM事实、认证、佣金、结算、提现、风险分和信用分不在页面直接编辑。
- 任务、备注、责任人分配、敏感字段临时查看和摘要导出均写入本地审计夹具。

## 演示场景

页面使用本地合成数据，至少覆盖：

- `partner-1001`：正常合作方。
- `partner-1006`：C0与入驻/认证阻断。
- `partner-1013`：R3风险与CRM KYC同步异常。
- `partner-1003`、`partner-1017`：清退、结算和多阻断摘要。
- 环境控制：Loading、Empty、Error、Forbidden。

## 验证记录

- `npm run check`：通过。
- Playwright桌面宽度 `1440×960`：通过，无横向溢出。
- Playwright移动宽度 `390×844`：通过，无横向溢出。
- 已验证：列表进入全屏对象页、URL保留 `partner_id/tab/period`、六个页签、CRM同步阻断、Loading、备注保存、责任人分配、风险任务创建。

## 生产联调边界

当前仍是 Mock 合成数据。生产接口、真实CRM字段、服务端权限裁剪、分页和完整审计写入需按页面数据契约进入技术评审与联调，不得将本记录作为生产接口已完成证明。
