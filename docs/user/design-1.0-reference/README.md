# 外部1.0参考样式档案

版本：v0.1  
日期：2026-11-14  
状态：`reference_only`  
来源：`docs/PRD_SOURCE_CN/04-页面设计/页面设计/1.0版本用户端/`

> **English Summary**
>
> This folder is a curated, read-only design reference extracted from the external 1.0 portal specification. It records only transferable layout, visual, component, state, interaction, and accessibility patterns. It is not the Affiliate CPA product standard and does not authorize importing that system's information architecture, business modules, data contracts, event contracts, or business semantics.
>
> **中文摘要**
>
> 本文件夹是从外部 1.0 用户端规范中提炼的只读设计参考，仅记录可迁移的布局、视觉、组件、状态、交互和无障碍模式。它不是 Affiliate CPA 的产品标准，也不授权引入该系统的信息架构、业务模块、数据契约、事件契约或业务语义。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| 本目录 | 外部参考样式、交互模式、证据索引和使用边界。 |
| [../design-1.0-standard/](../design-1.0-standard/README.md) | Affiliate 用户端 Mock 的执行标准、页面分批和验收规则。 |
| [原始1.0来源](../../../../docs/PRD_SOURCE_CN/04-页面设计/页面设计/1.0版本用户端/README.md) | 完整中文来源证据，保持只读，不在这里改写。 |

## 使用原则

1. 只参考组件、样式和交互，不参考业务功能。
2. 外部系统的页面名、路由、导航、模块、字段、枚举、限额、文案和流程语义不得进入 Affiliate Mock。
3. 外部参考中的 Figma 尺寸是 1920 设计源尺寸；Affiliate Mock 实现时使用自己的响应式断点，不得等比缩放 Figma 画布。
4. 所有迁移到 Affiliate 标准的模式必须先经过 [extracted-patterns.md](extracted-patterns.md) 归类，再进入 [../design-1.0-standard/](../design-1.0-standard/README.md)。
5. 本目录不直接指导编码；编码依据只来自标准目录和当前 Mock 的既有页面契约。

## 来源清单与采纳边界

| 来源文件 | 本档案用途 | 明确排除 |
| --- | --- | --- |
| `00-用户端设计基准与证据.md` | Figma 来源、画布、字体、导航尺寸和证据等级。 | 不采纳其业务模块范围。 |
| `01-页面设计规范.md` | 页面骨架、页面头部、信息组织、移动端和状态设计模式。 | 不采纳入金、交易、跟单等页面目标。 |
| `02-设计Tokens与视觉规范.md` | 颜色、字体、边框、圆角、间距、阴影和状态 token。 | 不把提案值写成已冻结业务规则。 |
| `03-组件库规范.md` | 基础组件、数据展示组件、流程组件和组件验收门禁。 | 不采纳 CurrencyPicker、SignalCard 等外部业务组件。 |
| `04-数据规范.md` | 仅参考“未知值不伪造”的显示原则。 | 账户、入金、交易、跟单字段和结构化数据模型全部排除。 |
| `05-事件契约.md` | 仅参考事件分层思路；当前 Mock 不新增埋点。 | 事件名、payload、枚举和业务提交语义全部排除。 |
| `06-页面清单与Figma映射.md` | 仅作为 Figma node 检索索引。 | 外部页面清单、路由、模块和信息架构全部排除。 |
| `07-截图留档索引.md` | 组件、弹窗、页面布局和移动端视觉证据入口。 | 截图中的业务内容不进入 Affiliate 语义。 |
| `08-Web端实现参考与互相印证.md` | 1440/768/390 实现断点、Shell、卡片、表格和状态证据。 | 不采纳参考站点导航和业务页面。 |
| `09-入金页面交互规范.md` | 表单校验、限额提醒、选择器、提交和结果交互模式。 | 入金业务、KYC、支付、上传凭证和事件语义全部排除。 |
| `10-入金页面可点击控件清单.md` | 可点击控件语义、键盘要求和可访问性缺口。 | Header/SideNav 具体菜单项和入金控件全部排除。 |

## 可迁移模式

1. Shell 与 PageHeader 的空间关系。
2. 语义 token、字体层级、4px 间距节奏、圆角和状态色。
3. Button、Input、Select、Checkbox、Badge、MetricCard、DataTable、Modal、ResultDialog 的通用形态。
4. Loading、Empty、Partial、Validation、Blocked、Submitting、Success、Failure 状态。
5. 筛选、展开层、表单校验、提交防重复、结果反馈和键盘可达性。

## 禁止迁移模式

1. 入金、出金、转账、资金详情、交易报告、跟单等信息架构。
2. Dashboard、Deposit、Withdrawal、Transfer、Fund Details、Trade Report、Smart Copy 等导航命名。
3. KYC、支付通道、银行账户、安全验证、信号源、订阅、分润等业务语义。
4. 外部数据字段、业务状态枚举、事件 payload、限额和示例值。
5. 参考站点或 Figma 中与本系统无关的文案。

## 冲突规则

当外部参考和 Affiliate 当前系统冲突时：

1. 业务语义、路由、数据、状态机和权限以 Affiliate 当前 Mock 与权威 PRD 为准。
2. 仅在视觉、组件和交互层评估是否替换外部参考。
3. 无法判断是视觉问题还是业务语义时，先按业务语义处理并登记待确认。
