# Shell与组件迁移规格

版本：v0.1  
日期：2026-11-14  
状态：`wave1_construction_spec`

> **English Summary**
>
> This file turns the 1.0 visual language into a safe implementation sequence for the existing Affiliate Mock shell and shared components. It preserves current routes, data, and Mock state machines while migrating layout and interaction quality.
>
> **中文摘要**
>
> 本文将 1.0 视觉语言转换为现有 Affiliate Mock Shell 和共享组件的安全实施顺序。迁移布局和交互质量时，保留当前路由、数据和 Mock 状态机。

## 1. 当前基线

| 区域 | 当前实现 |
| --- | --- |
| Header | `56px`，固定顶栏。 |
| SideNav | `216px`，收起 `68px`。 |
| 内容容器 | `.main` 最大宽度 `1600px`，padding `26px 15px 20px`。 |
| 卡片 | 8px 圆角，旧边框和旧阴影。 |
| 按钮 | 默认高 `36px`，小按钮高 `30px`，4px 圆角。 |
| 输入 | 高 `32px`，4px 圆角。 |
| 表格 | 12px 表头、13px 正文，首列和操作列 sticky。 |
| 抽屉 | 约 680px，全高右侧面板。 |
| 弹窗 | 常规 620px，8px 圆角。 |

## 2. Shell目标

| 区域 | 1440 桌面目标 | 1024 平板目标 | 390 手机目标 |
| --- | --- | --- | --- |
| Header | `62px` | `62px` | `62px` |
| SideNav | `240px` | 隐藏，入口转页面级导航或抽屉 | 隐藏 |
| 内容区 | 流式宽度，无 `max-width`；跟随视口减去 SideNav | 流式宽度，SideNav 隐藏 | 流式宽度，水平 padding `8px` |
| 内容 padding | `24px` | `24px` | `8px` |

### 断点策略

Wave 1 保留现有 CSS 断点 `1199 / 991 / 767 / 479`，只用 `1440 / 1024 / 390` 作为验收视口。理由：

1. 避免同时改 Shell、所有页面网格和所有历史媒体查询。
2. 先证明视觉语言正确，再整理断点。
3. 若 1024 验收失败，只调整对应页面网格，不做全站断点重写。

## 3. Shell施工顺序

1. 新增布局 Token：
   - `--shell-header-height: 62px`
   - `--shell-sidebar-width: 240px`
   - `--shell-sidebar-collapsed-width: 72px`
   - `--main-max-width: none`
   - `--main-padding-x: 24px`
2. 同步修改 `.topbar`、`.sidebar`、`.workspace` 和 `.main`。
3. 同步修改 `.collapsed .sidebar`、`.collapsed .workspace` 和 hover open 状态。
4. 检查 `991px` 以下侧栏、移动导航和 workspace margin。
5. 检查钱包 popover、账户菜单、通知入口、模拟入口和帮助入口的 z-index 与边界。
6. 更新或新增 Shell 检查，锁定 Header、SideNav、内容宽度和 collapsed 宽度。

禁止只改 `.sidebar` 或只改 `.workspace`；Shell 尺寸必须成组迁移。

## 4. PageHeader

目标结构：

```text
页面标题
页面说明
页面级主操作
```

当前 `AFF.helpers.pageHeader(title, description, actions)` 只输出 actions，标题和说明参数没有进入返回值。Wave 1 不得直接假设该 helper 已实现目标结构；实施前先确认全局标题来源，再选择：

1. 修复 helper 并统一输出 title、description、actions。
2. 或保留现有全局标题容器，把 helper 更名或收窄为 actions-only。

无论采用哪种方式，页面标题、说明、筛选区和卡片左边界必须一致。

## 5. 组件规格

### Button

| 项 | 规格 |
| --- | --- |
| 默认高度 | `36px` |
| 小按钮高度 | `30px` |
| 移动端提交按钮 | 不低于 `40px` |
| 圆角 | `6px` |
| 字体 | 14px Medium |
| primary | 品牌实色或已冻结品牌渐变，一屏一个主操作 |
| secondary | 白底、强边框、正文色 |
| tertiary | 无边框文本按钮 |
| focus | 2px 品牌外轮廓或 3px 品牌光晕，全站统一 |
| disabled | 保留布局，降低透明度并解释原因 |
| loading | 尺寸不变，禁用重复提交 |

### ThemeSwitch

| 项 | 规格 |
| --- | --- |
| 桌面尺寸 | `75x36px` |
| 手机压缩尺寸 | `48x36px` |
| 圆角 | `18px` |
| 图标 | 太阳 / 月亮，15px |
| 状态 | `aria-checked` 和可本地化 `aria-label` |
| 行为 | 切换 `body[data-theme]` 并持久化 Mock state |
| Light | 白色画布、浅边框和浅层控件 |
| Dark | `#061335` 画布、`#121F3F` / `#1F2B49` 浅层、`#38425D` / `#515A72` 边框 |

### Input / Select / Textarea

| 项 | 规格 |
| --- | --- |
| 高度 | `32px`，多行 textarea 按内容区独立设定 |
| 圆角 | `6px` |
| 边框 | `--border-strong` |
| focus | 品牌边框或品牌 halo，不改变布局 |
| error | 就地错误文案，不遮挡输入 |
| disabled | 使用 disabled token，并保留原因 |

### Checkbox / Radio

1. 可点击区域不小于 `20x20px`。
2. label 与控件关联。
3. focus 可见。
4. 作为提交条件时，未满足条件必须禁用提交或给出阻止原因。

### Chip / Tag / StatusBadge

| 组件 | 高度 | 圆角 | 规则 |
| --- | ---: | ---: | --- |
| Chip | `28px` | `999px` | 筛选或轻量选择。 |
| Tag | `22px` | `4px` | 状态或属性。 |
| StatusBadge | `22-24px` | `4px` | 文字加语义色，不用裸色块。 |

状态文案继续来自 Affiliate 当前数据和显示映射，不得引入外部系统状态词。

### MetricCard

1. padding `16px`。
2. label 使用 12px Regular。
3. 主数值使用 20px 或 24px SemiBold。
4. 数值、单位和 hint 分层。
5. 桌面三列或四列由信息优先级决定，不为填满屏幕牺牲可读性。
6. 未知值显示未知态，不显示伪 0。

### Card / Panel

1. 白底、`--border-subtle`、8px 圆角。
2. 常规 padding `16px`；面板 header 与 body 分区。
3. 阴影低强度，重点卡片和浮层才加强。
4. 禁止卡片套卡片。
5. 可点击卡片必须有 `role`、`tabindex`、Enter、Space 和 focus 态。

### DataTable

1. toolbar、header、body、footer、empty 分区清楚。
2. 表头 12px Medium，正文 13px Regular。
3. 行高保持稳定，金额右对齐并使用 tabular numbers。
4. 首列和操作列 sticky 时必须处理 hover 背景和阴影。
5. 长文本受控换行；标识列不得被截断到无法识别。
6. 空态说明原因和下一步动作。
7. 移动端保留业务标识、金额或核心指标、状态和操作路径。

### Drawer

1. 桌面宽度 `680px`；小于 768px 全宽。
2. 内容区滚动，底部操作固定。
3. 打开时锁 Body 滚动，关闭后恢复。
4. Escape、遮罩、关闭按钮和焦点回收行为一致。
5. 底部按钮从左侧排列，主按钮与页面主操作一致。

### Modal

1. 常规宽度 `620px`，移动端全宽或高占比面板。
2. 圆角 `12px`；全屏移动端可为 0。
3. 只承载一个决策任务。
4. 危险、拒绝、资金影响操作必须说明原因并给取消路径。
5. 结果态包含结果、业务编号或进度入口。

## 6. 状态与无障碍

| 状态 | 必须满足 |
| --- | --- |
| Loading | 骨架或局部 loading，页面不空白。 |
| Empty | 无数据原因和下一步动作。 |
| Partial | 明确缺失字段，不伪造值。 |
| Validation | 就地错误和恢复方式。 |
| Blocked | 原因、影响和解除路径。 |
| Submitting | 主按钮 loading、禁用、尺寸稳定。 |
| Success | 结果、业务标识和进度入口。 |
| Failure | 错误码、原因、traceId 或恢复动作。 |

键盘和无障碍验收：

1. 所有仅图标控件有可访问名称。
2. 下拉、菜单、弹窗和抽屉支持 Escape 关闭。
3. 打开浮层时焦点进入，关闭后回到触发器。
4. Tab 顺序符合视觉顺序。
5. 可点击卡片和自定义控件支持 Enter 与 Space。
6. disabled 控件不进入误导性操作路径。

## 7. 实施切片

### Slice S1：Shell

只改 Shell 尺寸、颜色、边框和响应式关系；不改业务组件。

### Slice S2：基础控件

统一 Button、Input、Select、Checkbox、Chip、Tag、focus 和 disabled。

### Slice S3：数据展示

统一 MetricCard、Card、Panel、DataTable、Pagination 和 Empty。

### Slice S4：浮层与流程

统一 Drawer、Modal、Result、提交中、成功和失败态。

每个切片完成后先跑对应专项检查，再进入下一片。
