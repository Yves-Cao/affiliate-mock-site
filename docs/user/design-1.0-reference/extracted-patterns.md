# 外部1.0可迁移模式提炼

版本：v0.1  
日期：2026-11-14  
状态：`reference_only`

> **English Summary**
>
> This file distills only transferable layout, token, component, state, interaction, and accessibility patterns from the external 1.0 evidence. Business modules, data contracts, events, and domain semantics remain excluded.
>
> **中文摘要**
>
> 本文只提炼外部 1.0 证据中可迁移的布局、Token、组件、状态、交互和无障碍模式，继续排除业务模块、数据契约、事件和领域语义。

## 证据级别

| 级别 | 说明 |
| --- | --- |
| `Fact` | 来源文档或线上采样已记录的尺寸、样式、结构和行为。 |
| `Inference` | 从重复证据归纳出的规则。 |
| `Proposal` | 可迁移到 Affiliate Mock 的建议，尚未实现验证。 |

## 1. Shell

### 1.1 设计源尺寸

来源：`00-用户端设计基准与证据.md`。

| 项目 | 值 | 证据级别 |
| --- | ---: | --- |
| Figma 桌面画布 | `1920px` | `Fact` |
| Figma 手机画布 | `375px` | `Fact` |
| TopNavigation | `89px` | `Fact` |
| SideNavigation | `298px` | `Fact` |
| 主内容起点 | `x=348` | `Fact` |
| 主内容宽度 | 约 `1522-1527px` | `Fact` |

### 1.2 实现参考尺寸

来源：`08-Web端实现参考与互相印证.md`。

| 视口 | Header | SideNav | 内容有效区 |
| --- | ---: | ---: | ---: |
| `1440x900` | `62px` | `240px`，显示 | `1152px` |
| `768x1024` | `62px` | 隐藏 | `720px` |
| `390x844` | `62px` | 隐藏 | `374px` |

**归纳**：设计源是 1920 画布，线上实现是另一套响应式规则。Affiliate Mock 不应把 89/298/1524 直接搬到 1440 视口，也不应等比缩放。

## 2. Tokens

来源：`02-设计Tokens与视觉规范.md`。

### 2.1 背景与边框

| 语义 | Light 值 | 用途 |
| --- | --- | --- |
| `background.0` | `#FFFFFF` | 页面或卡片基础背景。 |
| `background.50` | `#F9FAFB` | 次级背景。 |
| `background.100` | `#F3F4F6` | 分区、表头或浅灰背景。 |
| `background.page` | `#F4F6FA` | 页面背景提案值。 |
| `border.300` | `#E3E8EF` | 常规分隔线。 |
| `border.400` | `#CDD5DF` | 较强边框。 |
| `border.500` | `#9AA4B2` | 强边框。 |

### 2.2 文字

| 语义 | Light 值 | 用途 |
| --- | --- | --- |
| `text.400` | `#A4A7AE` | 占位、禁用或弱辅助。 |
| `text.500` | `#717680` | 辅助说明。 |
| `text.700` | `#414651` | 次级正文。 |
| `text.950` | `#0A0D12` | 主正文或强标题。 |
| `text.blue-black` | `#0F1B3D` | 蓝黑标题。 |
| `text.side` | `#2C3751` | 侧栏文字。 |
| `text.nav` | `#6B7897` | 顶栏辅助文字。 |
| `text.side-icon` | `#828A9A` | 侧栏图标。 |

### 2.3 品牌与状态

| 语义 | 值 | 用途 |
| --- | --- | --- |
| `blue.500` | `#1A5BFF` | 品牌主色、主按钮、选中态。 |
| `blue.bg` | `#1A5BFF1A` | 品牌信息底色。 |
| `success.500` | `#17B26A` | 成功、通过、正向状态。 |
| `warning.500` | `#F79009` | 待处理、限额或提醒。 |
| `danger.500` | `#F04438` | 失败、拒绝、风险。 |
| `sub.500` | `#B68756` | 金色或辅助等级。 |

外部来源同时出现 `#005BFF`。该值未被合并进 `blue.500`，只作为历史视觉值保留；若 Affiliate 标准采纳 Figma 变量优先原则，则新样式优先使用 `#1A5BFF`。

### 2.4 字体

| 语义 | 样式 | 字号/行高 | 用途 |
| --- | --- | ---: | --- |
| `text.12r` | Regular | 12/18 | 辅助说明。 |
| `text.14r` | Regular | 14/20 | 正文、表格。 |
| `text.14m` | Medium | 14/20 | 次级强调、按钮。 |
| `text.16r` | Regular | 16/24 | 正文。 |
| `text.16m` | Medium | 16/24 | 表单、卡片标题。 |
| `text.18b` | SemiBold | 18/26 | 区块标题。 |
| `text.20b` | SemiBold | 20/28 | 卡片主标题。 |
| `text.24b` | SemiBold | 24/32 | 页面标题。 |

拉丁字符和数字主字体：`Poppins`。中文：`PingFang SC` 或系统中文。不要引入 `Inter` 作为 1.0 风格字体。

### 2.5 圆角、间距与阴影

| 类别 | 值 |
| --- | --- |
| 圆角 | 4、6、8、12、999px。 |
| 间距 | 4px 基数，常用 4、8、12、16、20、24、32。 |
| 卡片圆角 | 8px。 |
| 弹窗或重点卡片圆角 | 12px。 |
| 提案阴影 | 低强度品牌色投影，只用于重点卡片和浮层。 |

## 3. 组件模式

### 3.1 PageHeader

结构：

```text
Page title
Supporting description
Optional actions
```

规则：

1. 标题描述页面对象，不重复侧栏分组名。
2. 描述只说明页面价值或关键约束。
3. 主操作只出现一次，放在标题区右侧或流程卡片内。
4. 标题、描述和操作保持同一左边界。

### 3.2 Button

变体：

| 变体 | 用途 |
| --- | --- |
| primary | 当前主流程下一步。 |
| secondary | 次级操作或取消。 |
| tertiary | 文本或轻量操作。 |
| gradient | 特殊品牌或权益操作。 |

状态：`default`、`hover`、`active`、`focus`、`disabled`、`loading`。

规则：

1. 主按钮文案使用具体动词。
2. 提交中保持尺寸稳定并禁止重复提交。
3. disabled 保留布局并解释原因。

### 3.3 Input / Select / Checkbox

规则：

1. 输入、搜索、金额、密码等语义分明。
2. 展开层不得推挤页面内容。
3. 错误就地提示，不只在提交后集中显示。
4. 复选框作为提交前置条件时，未勾选应禁用提交或明确阻止。
5. 所有图标按钮和仅图标控件必须有可访问名称。

### 3.4 MetricCard

结构：`label`、`value`、`unit`、`hint`、可选 `trend`。

规则：

1. 数值和单位保持语义完整。
2. 指标卡有稳定尺寸，数值变化不造成布局跳动。
3. 未知值显示未知态，不伪造 `0`、`-` 或默认值。

### 3.5 DataTable

规则：

1. toolbar、header、body、footer、empty 分区清晰。
2. 表头固定，行高稳定。
3. 金额右对齐，状态固定宽度或稳定展示。
4. 横向滚动时关键标识列优先保留。
5. 空态说明无数据原因和下一步动作。

### 3.6 Card

参考证据：线上卡片白底、1px 边框、8px 圆角、16px padding、hover 只改变边框或背景。

规则：

1. 卡片承载一个清晰对象或决策。
2. 不做卡片套卡片。
3. hover 不改变布局。
4. 可点击卡片必须支持键盘焦点、Enter 和 Space。

### 3.7 StatusBadge

外部状态词 `Pending`、`Reviewed`、`Refuse` 等属于其业务语义，不能迁移为 Affiliate 状态。可迁移的是规则：

1. 状态文案与业务枚举一一对应。
2. 同一状态不因页面不同而换词。
3. 状态必须同时有文字和语义色。

### 3.8 Modal / ResultDialog

规则：

1. 弹窗只承载一个决策主任务。
2. 资金或不可逆影响操作必须有取消路径。
3. 提交成功后说明业务编号、进度入口或下一步。
4. 失败后保留用户已输入的安全上下文并给出恢复动作。

## 4. 交互与状态

### 4.1 通用状态

| 状态 | 交互要求 |
| --- | --- |
| Loading | 骨架或局部加载，不允许无解释空白。 |
| Empty | 说明无数据原因和下一步动作。 |
| Partial data | 明确缺失字段，不伪造值。 |
| Validation | 就地提示字段错误。 |
| Limit / blocked | 说明原因、当前阈值和解除路径。 |
| Verification | 说明验证方式和安全提示。 |
| Submitting | 禁用主按钮并保持稳定尺寸。 |
| Success | 给出结果和进度查看入口。 |
| Failure | 保留上下文并给可执行恢复动作。 |

### 4.2 筛选与选择

1. 打开下拉、弹出层或筛选器不推挤内容。
2. 当前选中值必须保留完整语义。
3. 筛选结果同步表格、图表和空态。
4. 下拉支持键盘导航、焦点回收和关闭路径。

### 4.3 表单流

可迁移流程形态：

```text
entry list
→ object selected
→ required fields completed
→ acknowledgement checked if required
→ submit enabled
→ submitting
→ result / failure recovery
```

不得迁移入金、支付、KYC、上传凭证等具体业务流程。

## 5. 无障碍模式

来源：`10-入金页面可点击控件清单.md`。

1. 仅图标控件必须有 `aria-label` 或可见文本。
2. 菜单、通知、主题和账户类触发器需要语义、展开状态和可访问名称。
3. 可点击卡片需要 `role`、`tabindex`、Enter 和 Space 支持。
4. 下拉和弹窗需要键盘导航、Escape 关闭和焦点回收。

## 6. 证据引用

| 模式 | 来源 |
| --- | --- |
| Figma 尺寸和字体 | `00-用户端设计基准与证据.md`。 |
| 页面骨架和状态 | `01-页面设计规范.md`。 |
| Token 和视觉规格 | `02-设计Tokens与视觉规范.md`。 |
| 组件 API 和状态 | `03-组件库规范.md`。 |
| 未知值不伪造 | `04-数据规范.md` 的显示原则。 |
| 事件分层思路 | `05-事件契约.md` 的原则，不采纳具体事件。 |
| Figma node | `06-页面清单与Figma映射.md`。 |
| 截图 | `07-截图留档索引.md`。 |
| Web 响应式和组件证据 | `08-Web端实现参考与互相印证.md`。 |
| 表单和控件交互 | `09-入金页面交互规范.md`、`10-入金页面可点击控件清单.md`。 |
