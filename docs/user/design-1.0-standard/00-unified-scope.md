# 统一口径与采纳边界

版本：v0.1  
日期：2026-11-14  
状态：`draft_for_mock_redesign`

> **English Summary**
>
> This file locks the adoption boundary for the Affiliate user-side Mock redesign: transfer external 1.0 layout, visual, component, interaction, state, and accessibility patterns only; never transfer that system's business architecture or semantics.
>
> **中文摘要**
>
> 本文锁定 Affiliate 用户端 Mock 重设计的采纳边界：只迁移外部 1.0 的布局、视觉、组件、交互、状态和无障碍模式，绝不迁移其业务架构或业务语义。

## 1. 目标

在不改变 Affiliate CPA 用户端功能的前提下，将现有 Mock 的视觉语言、组件一致性和交互状态质量升级到外部 1.0 参考水准。

成功标准：

1. 全站 Shell、Token、基础组件和状态模式一致。
2. 当前 21 个正式路由仍保留原有入口、业务对象和 Mock 行为。
3. 桌面、平板和手机均无横向溢出、文本裁切和无解释状态。
4. 页面主次、密度和对齐明显优于当前版本。
5. 不新增业务规则、生产承诺或外部系统功能。

## 2. 当前系统保留项

| 类别 | 处理 |
| --- | --- |
| 信息架构 | 保留 Affiliate 当前左侧菜单、隐藏路由和入口关系。 |
| 路由 | `dash / perf / clients / summary / promo / subchannels / deep / tracker / assets / lookup / pay / statements / wd / guarantee / appeals / messages / support / account / export / apply / onboarding` 不改名、不增删。 |
| 业务对象 | 保留合作方、客户、推广、佣金、结算、提现、保证金、申诉、消息、支持和入驻语义。 |
| Mock 状态机 | 保留 simulation console、closure-flow、loading-flow、api-error 等既有状态。 |
| 数据与事件 | 不因视觉重设计新增外部字段、事件或生产口径。 |
| 语言 | 继续执行当前 Mock 的中英文覆盖和显示映射。 |

## 3. 外部参考采纳项

| 层级 | 可采纳内容 |
| --- | --- |
| Shell | Header、SideNav、内容区的比例、边界和响应式组织方式。 |
| PageHeader | 标题、说明和主操作的层级。 |
| Token | 背景、文字、品牌、边框、状态、圆角、间距、字体和阴影语义。 |
| 基础组件 | Button、Input、Select、Checkbox、Badge、Tooltip、Modal、ResultDialog。 |
| 数据展示 | MetricCard、DataTable、卡片列表、状态标签、空态和加载态。 |
| 交互 | 筛选、展开层、表单校验、提交防重复、结果反馈、焦点和键盘行为。 |
| 无障碍 | 可访问名称、展开状态、键盘操作和焦点回收。 |

## 4. 禁止迁移项

| 类别 | 禁止内容 |
| --- | --- |
| 信息架构 | Deposit、Withdrawal、Transfer、Fund Details、Trade Report、Smart Copy 等模块和导航。 |
| 业务流程 | KYC、支付通道、入金、出金、银行账户、信号源、订阅、分润等。 |
| 数据契约 | 外部 Account、DepositDraft、WithdrawalDraft、TransferDraft、FundRecord、TradeOrder、Signal 等模型。 |
| 事件契约 | 外部事件名、payload、枚举和埋点语义。 |
| 状态枚举 | Pending、Reviewed、Refuse 等外部业务状态不得替换 Affiliate 状态。 |
| 参数 | 外部限额、费用、币种、到账时间、账号和示例数据。 |
| 文案 | 外部系统页面文案、按钮文案和业务提示不得直接复用。 |

## 5. 模式翻译规则

| 外部模式 | Affiliate Mock 中的翻译 |
| --- | --- |
| 资金流程页 | 表单分步、校验、提交中、结果和失败恢复模式，用于提现、申诉或支持等既有流程。 |
| 交易报告 | 指标区、筛选、表格、详情和空态模板，用于业绩、客户、结算和导出页面。 |
| 跟单卡片列表 | 卡片网格、标签、主数据和主操作模式，用于活动、素材、二级渠道或服务入口。 |
| 安全验证弹窗 | 仅保留确认、取消、焦点和防重复提交模式；不引入验证业务。 |
| 全局账户选择 | 仅参考选择器交互，不引入 MT 账户或交易账户语义。 |

## 6. 命名与 token 迁移

1. 新 token 使用 Affiliate 语义名，不直接复制外部业务名。
2. `#1A5BFF` 可作为 1.0 视觉主色候选；`#005BFF` 是历史值，迁移期间需通过截图对比确认替换范围。
3. 状态 token 只表达视觉语义，业务状态仍由当前 Mock 数据和页面契约决定。
4. 字体使用 `Poppins + PingFang SC/系统中文`，不引入 `Inter` 作为目标风格。
5. 新样式避免页面级魔法值，优先映射到全局 token。

## 7. 与现有质量门禁的关系

本标准不替代 [页面生成质量门禁](../page-generation-quality-gate-v0.1.md)。每页仍需满足：

1. 页面契约或变更说明。
2. 桌面、平板、手机截图。
3. 自动化专项检查。
4. 交互、状态和焦点检查。
5. 完成证据和残留问题记录。

## 8. 待确认问题

| 问题 | 默认处理 |
| --- | --- |
| 主品牌色最终使用 `#1A5BFF` 还是保留当前 `#005BFF` | 先在全局组件和小范围核心页试算，提交截图对比后冻结。 |
| 1024 视口是否保留两列布局 | 按页面内容密度决定，不允许为保持两列压缩文本。 |
| 是否支持暗色模式 | 本轮不做；外部 Dark token 仅留参考。 |
| 是否重画模拟控制台 | 本轮只保证入口和非破坏性视觉兼容，不进入第一波深改。 |
