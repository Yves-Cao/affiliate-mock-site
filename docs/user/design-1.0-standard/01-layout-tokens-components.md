# Affiliate Mock布局、Token与组件标准

版本：v0.1  
日期：2026-11-14  
状态：`draft_for_mock_redesign`

> **English Summary**
>
> This file converts the external reference patterns into Affiliate Mock execution rules for responsive shell, semantic tokens, typography, layout rhythm, and shared components.
>
> **中文摘要**
>
> 本文将外部参考模式转换为 Affiliate Mock 的响应式 Shell、语义 Token、字体、布局节奏和共享组件执行规则。

## 1. 响应式 Shell

### 1.1 1440 桌面

| 区域 | 执行规格 |
| --- | --- |
| Header | 高 `62px`，白色，固定底边框。 |
| SideNav | 宽 `240px`，从 Header 下方开始。 |
| 内容区 | 流式宽度，无 `max-width`；左右由 `24px` padding 控制。 |
| 页面左右 padding | `24px`。 |

说明：外部 Figma 的 `89px / 298px / 1524px` 是 1920 源尺寸，不直接用于 1440 实现。

### 1.2 1024 平板

1. Header 保留 `62px`。
2. SideNav 默认隐藏，通过页面级导航或抽屉进入。
3. 内容有效区目标 `720px` 以上，页面 padding `24px`。
4. 指标卡可从三列降为两列，但文本不得被压缩到不可读。

### 1.3 390 手机

1. Header 保留 `62px`。
2. SideNav 隐藏。
3. 内容水平 padding `8px`。
4. 页面标题和关键操作保留在首屏。
5. 表格允许内部横向滚动，但必须保留关键标识列。
6. 弹窗使用全宽或高占比面板，底部操作不遮挡提交区。

## 2. PageHeader

结构：

```text
页面标题
页面说明
主操作
```

规则：

1. 标题使用 24px SemiBold / 32。
2. 说明使用 14px Regular 或 16px Regular。
3. 主操作放在标题区右侧；流程内主操作放在流程卡片内。
4. 同一主操作在首屏不得重复出现两次。
5. 标题、说明、筛选区和内容卡片使用同一左边界。

## 3. Token

### 3.1 背景、边框与文字

| Affiliate 语义 | 候选值 | 用途 |
| --- | --- | --- |
| `--canvas` | `#F4F6FA` | 页面画布。 |
| `--surface` | `#FFFFFF` | 卡片、表格、弹窗。 |
| `--surface-soft` | `#F9FAFB` | 次级背景。 |
| `--surface-muted` | `#F3F4F6` | 分区、表头、浅灰背景。 |
| `--border-subtle` | `#E3E8EF` | 常规分隔。 |
| `--border-strong` | `#CDD5DF` | 输入和较强边框。 |
| `--text-strong` | `#0A0D12` | 主正文、强标题。 |
| `--text-body` | `#414651` | 常规正文。 |
| `--text-muted` | `#717680` | 辅助说明。 |
| `--text-disabled` | `#A4A7AE` | 禁用和占位。 |

### 3.2 品牌与状态

| Affiliate 语义 | 候选值 | 用途 |
| --- | --- | --- |
| `--brand` | `#1A5BFF` | 主操作、链接、选中态。 |
| `--brand-soft` | `#1A5BFF1A` | 品牌信息底色。 |
| `--ok` | `#17B26A` | 成功、通过。 |
| `--warning` | `#F79009` | 待处理、提醒。 |
| `--danger` | `#F04438` | 失败、拒绝、风险。 |
| `--gold` | `#B68756` | 信用、权益弱强调。 |

迁移规则：旧 `#005BFF` 不与新 `#1A5BFF` 混用于同一组件状态。全局切换前需截图对比核心页面。

### 3.3 字体

| 语义 | 字号/行高 | 字重 | 用途 |
| --- | ---: | --- | --- |
| caption | 12/18 | 400 | 辅助说明、紧凑标签。 |
| body | 14/20 | 400 | 正文、表格。 |
| body-medium | 14/20 | 500 | 按钮、次级强调。 |
| body-large | 16/24 | 400 | 说明、普通正文。 |
| title-small | 16/24 | 500 | 表单或轻量卡片标题。 |
| title-medium | 18/26 | 600 | 区块标题、抽屉标题。 |
| title-large | 20/28 | 600 | 卡片主标题、主数值。 |
| page-title | 24/32 | 600 | 页面主标题、核心 KPI。 |

字体栈：`Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`。

### 3.4 间距、圆角与阴影

| 类别 | 标准 |
| --- | --- |
| 间距 | 4px 基数；常用 4、8、12、16、20、24、32。 |
| 小控件圆角 | 4px。 |
| 输入和按钮圆角 | 6px。 |
| 常规卡片圆角 | 8px。 |
| 弹窗和重点卡片圆角 | 12px。 |
| 胶囊标签 | 999px。 |
| 阴影 | 低强度，仅用于重点卡片和浮层。 |

## 4. 布局模板

| 模板 | 适用页面类型 | 结构 |
| --- | --- | --- |
| Overview | 仪表盘 | PageHeader、指标区、趋势/结构区、任务列表、近期对象。 |
| Report | 报表、客户、结算 | PageHeader、筛选区、指标条、DataTable、详情抽屉。 |
| Resource | 活动、素材、二级渠道 | PageHeader、筛选区、卡片网格、详情抽屉。 |
| Finance | 收益、提现、保证金 | PageHeader、资金摘要、状态解释、表格、流程弹窗。 |
| Service | 消息、支持、导出 | PageHeader、状态页签、列表或表格、详情抽屉。 |
| Flow | 申请、入驻、清退 | 步骤条、表单区、进度说明、固定底部操作。 |

## 5. 共享组件

### 5.1 Button

| Variant | 用途 |
| --- | --- |
| primary | 页面或流程唯一主操作。 |
| secondary | 取消、返回、次级操作。 |
| tertiary | 文本链接或轻量操作。 |
| gradient | 品牌重点或权益操作。 |

必须实现：`default`、`hover`、`active`、`focus`、`disabled`、`loading`。提交中不得改变尺寸或允许重复提交。

### 5.2 Input / Select / Checkbox

1. 控件高度保持当前全局一致，目标 32-36px。
2. focus 使用品牌色边框和外发光。
3. 错误就地展示，不遮挡输入。
4. 下拉展开不推挤页面内容。
5. 仅图标控件必须有可访问名称。
6. 复选框作为提交条件时，未满足条件要禁用提交或解释阻止原因。

### 5.3 MetricCard

1. 指标名、数值、单位和辅助说明分层。
2. 桌面常用三列，平板两列，手机一列。
3. 数值变化不得引起卡片尺寸跳动。
4. 未知值显示未知态，不显示伪 0。

### 5.4 DataTable

1. toolbar、header、body、footer、empty 分区明确。
2. 行高稳定，金额右对齐，状态有文字和语义色。
3. 长文本受控换行，操作列右侧固定。
4. 空态说明原因和下一步动作。
5. 移动端优先保留业务标识、金额/核心指标和状态。

### 5.5 StatusBadge

1. 使用 Affiliate 当前业务枚举和文案。
2. 同一业务状态全站同一视觉语义。
3. 状态不得只用颜色表示。
4. 不引入外部系统的 Pending、Reviewed、Refuse 等业务词。

### 5.6 Modal / Drawer / Result

1. 详情优先右侧抽屉，轻量决策用居中弹窗。
2. 弹窗只承载一个决策任务。
3. 底部操作固定，内容区滚动。
4. Escape、遮罩、关闭按钮和焦点回收行为一致。
5. 成功态给结果、编号或进度入口；失败态保留上下文并给恢复动作。

## 6. 状态设计

| 状态 | 要求 |
| --- | --- |
| Loading | 骨架屏或局部 loading。 |
| Empty | 无数据原因和下一步动作。 |
| Partial | 明确缺失字段，不伪造。 |
| Validation | 就地错误提示。 |
| Blocked | 原因、影响和解除路径。 |
| Submitting | 主按钮 loading 并禁用。 |
| Success | 结果、业务标识和进度入口。 |
| Failure | 错误码、原因、traceId 或可执行恢复动作。 |

## 7. 禁止事项

1. 禁止为视觉统一改变业务状态机或数据口径。
2. 禁止引入外部系统菜单、页面、字段、事件或文案。
3. 禁止卡片套卡片和大面积装饰性渐变。
4. 禁止用 viewport 缩放字体或负字距。
5. 禁止为了填充首屏添加无业务价值卡片。
