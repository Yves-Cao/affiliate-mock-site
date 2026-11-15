# Wave0基线与页面契约

版本：v0.1  
日期：2026-11-14  
状态：`baseline_captured_with_local_browser_gap`

> **English Summary**
>
> This file records the pre-implementation baseline, the browser-verification blocker, the five core-page change contracts, and the route-by-route verification matrix for the 1.0 redesign.
>
> **中文摘要**
>
> 本文记录实施前基线、本地浏览器验证阻塞、五个核心页面变更契约，以及 1.0 重设计的逐路由验证矩阵。

## 1. 基线结论

执行日期：2026-11-14。

| 检查 | 命令 | 结果 | 解释 |
| --- | --- | --- | --- |
| 语法检查 | `npm --prefix affiliate-mock run check` | 通过 | 当前用户端、Mock Server 和脚本语法可解析。 |
| 旧设计 Token | `npm --prefix affiliate-mock run test:design-tokens` | 通过 | 旧 Figma 基线仍被测试锁定。 |
| 表格布局 | `npm --prefix affiliate-mock run test:tables` | 未执行到断言 | 本地缺少 `playwright` 模块。 |
| UI 回归 | `npm --prefix affiliate-mock run test:ui` | 未执行到断言 | 本地缺少 `playwright` 模块。 |
| v1 检查 | `npm --prefix affiliate-mock run test:v1` | 未执行到断言 | 本地缺少 `playwright-core` 模块。 |
| 导出中心专项 | `npm --prefix affiliate-mock run test:export-center` | 通过 | 首次失败因测试对脱敏提示做大小写完全匹配；已对齐现有文案并复跑通过。 |

当前阻塞：

1. 未安装本地 Playwright 依赖，无法生成 Wave 0 截图或执行浏览器断言。
2. 工作区已有大量未提交变更；实施 Wave 1 前必须先确认变更边界，避免把本次视觉更新与既有修改混在一个不可审查差异里。

已修复：`visual-check.cjs` 已补入正式路由 `export` 及其导航分组；浏览器依赖恢复后该路由会进入 UI 回归。

不新增依赖的前提下，恢复浏览器验证的可行路径：

1. 使用机器上已可用的 Playwright 运行时并显式配置 `NODE_PATH`。
2. 或由用户确认安装仓库依赖。
3. 或使用等效浏览器截图工具，但自动化断言仍以仓库脚本为准。

## 2. 截图基线

目标目录：

```text
affiliate-mock/docs/user/screenshots/design-1.0-wave0/
```

| 路由 | Desktop 1440x900 | Tablet 1024x900 | Mobile 390x844 |
| --- | --- | --- | --- |
| `dash` | 必选 | 必选 | 必选 |
| `summary` | 必选 | 必选 | 必选 |
| `wd` | 必选 | 必选 | 必选 |
| `clients` | 必选 | 必选 | 必选 |
| `assets` | 必选 | 必选 | 必选 |
| `promo` | 可选对照 | 可选对照 | 可选对照 |

命名：

```text
{route}-before-{width}x{height}.png
{route}-after-{width}x{height}.png
```

截图要求：

1. 正常流首屏。
2. 滚动后页面底部。
3. 该页面核心弹窗或抽屉。
4. 手机端表格或卡片容器。
5. 如页面有 Loading、Empty 或 Error 场景，另存状态截图。

### 2.1 顶栏试算记录

2026-11-14 已完成 TopNavigation 试点：

| 项 | 结果 |
| --- | --- |
| Header | `62px`，白底，底边框 `#EEF2F6`。 |
| 品牌区 | 1440 左边界 `24px`，图标 `33x33px`；390 左边界 `8px`。 |
| 工具控件 | 36px 圆形按钮，图标 20px，颜色 `#414651`。 |
| 账户摘要 | 钱包从胶囊样式改为模板式文字摘要，保留金额和弹出层。 |
| 分隔线 | 钱包摘要与图标操作之间增加 1px、16px 高分隔线。 |
| 移动端 | 390 下隐藏演示标签和服务器/本地时间，保留品牌、钱包、帮助、消息、语言和账户。 |
| 交互 | 钱包弹出层位于 Header 底部下方，不出视口。 |

验证截图：

1. [topbar-after-1440x220.png](../screenshots/design-1.0-wave0/topbar-after-1440x220.png)
2. [topbar-after-390x180.png](../screenshots/design-1.0-wave0/topbar-after-390x180.png)

浏览器度量：1440 与 390 均无整页横向溢出；顶栏高度为 62px；移动端品牌左边界为 8px。

### 2.2 登录页试算记录

2026-11-14 已完成登录页 1.0 视觉试算：

| 项 | 结果 |
| --- | --- |
| 桌面结构 | 左侧真实登录视觉图，右侧白色表单区；1440 下表单宽 460px并在右栏居中。 |
| 品牌区 | 右栏顶部增加 Affiliate 品牌锁定，不引入外部系统账户语义。 |
| 登录/注册切换 | 使用 1.0 分段控件形态；登录模式下保留可见切换。 |
| 标题 | 24px SemiBold / 32。 |
| 表单 | 标签 14px Medium / 20；输入高 42px、圆角 6px、强边框 `#CDD5DF`。 |
| Focus | 品牌候选色 `#1A5BFF` 边框和 3px 品牌光晕。 |
| 主按钮 | 42px 高、6px 圆角、品牌候选色实底。 |
| 校验 | 就地错误 13px / 20，危险色 `#F04438`。 |
| 注册页 | 保留原有字段、法律声明和真实视觉图，只同步表单与控件样式。 |
| 移动端 | 视觉图在上、表单在下；390 下输入和主按钮高 44px。 |

验证截图：

1. [login-before-1440x900.png](../screenshots/design-1.0-wave0/login-before-1440x900.png)
2. [login-after-1440x900.png](../screenshots/design-1.0-wave0/login-after-1440x900.png)
3. [login-after-1024x900.png](../screenshots/design-1.0-wave0/login-after-1024x900.png)
4. [login-after-390x844.png](../screenshots/design-1.0-wave0/login-after-390x844.png)

浏览器交互验证：邮箱 focus 使用新品牌光晕；空表单提交显示就地错误；登录/注册切换正常；注册模式加载 `auth-visual.jpg` 且法律声明保留；1440、1024、390 均无整页横向溢出。

自动化验证：

1. `test:design-tokens` 通过，当前检查 24 个颜色/Shell Token。
2. `npm --prefix affiliate-mock run check` 通过。
3. `test:design-audit-p1` 通过。
4. `test:i18n` 未通过，失败点是脚本仍断言旧 `data.js/app.js/pages.js` cache version，与本次登录视觉改动无关。
5. `test:design-audit-freeze` 未执行到断言，本地缺少 `playwright` 模块。

### 2.3 左侧导航试算记录

2026-11-14 已完成 SideNavigation 1.0 试算：

| 项 | 结果 |
| --- | --- |
| SideNav | 宽 `240px`，白底，无边框，从 Header 底部开始。 |
| 分组标题 | 高 `34px`，文字 11px SemiBold / 16，左边界 `24px`。 |
| 菜单项 | `216x40px`，左右边界 `12px`，圆角 `8px`，padding `12px`。 |
| 图标 | `18x18px`，左边界 `24px`。 |
| 菜单文字 | 14px / 40，左边界 `52px`，可用宽度约 `164px`。 |
| 默认状态 | Affiliate 五个业务分组默认展开，移除后台树形缩进线和竖线连接。 |
| 当前项 | `#F3F4F6` 底、品牌候选色文字和图标，不加内部卡片。 |
| 收起态 | 桌面收起宽度 `72px`，仅保留分组图标。 |
| 平板/手机 | 991px 以下隐藏 SideNav，内容左边界归零；顶栏按钮打开 240px 导航抽屉。 |
| 内容区 | 桌面流式宽度，无 `max-width`；左右 padding `24px`。 |

业务边界：分组和入口仍为 Affiliate 的仪表盘、数据总览、推广管理、收益中心、服务中心；未引入模板中的首页交易、入金、出金、转账、跟单、PAMM 等外部系统菜单。

验证截图：

1. [sidenav-after-1440x900.png](../screenshots/design-1.0-wave0/sidenav-after-1440x900.png)
2. [sidenav-after-390x844.png](../screenshots/design-1.0-wave0/sidenav-after-390x844.png)
3. [sidenav-mobile-open-390x844.png](../screenshots/design-1.0-wave0/sidenav-mobile-open-390x844.png)

浏览器度量：1440 下分组标题 `x=24/y=76`，首个菜单项 `x=12/y=98/w=216/h=40`，图标 `x=24/w=18`，文字 `x=52/w=164`，与模板 SideNav 采样坐标一致。移动端关闭时 SideNav 完全移出视口，打开时左边界为 0，选择路由后自动关闭。

### 2.4 仪表盘试算记录

2026-11-14 已完成 Dashboard 1.0 用户端构图试算：

| 项 | 结果 |
| --- | --- |
| 页面画布 | `route-dash` 使用 `#F4F6FA`，减少后台白底的模块感。 |
| PageHeader | 新增仪表盘标题和 14px 说明，标题使用 24px SemiBold / 32。 |
| 月度指标 | 四个指标合为一条白色承载面；内部用 1px 分隔线，不再各自带边框和阴影。 |
| 主分析区 | 客户转化漏斗与信用等级合为同一承载面；左侧为数据和筛选，右侧为深品牌色权益区。 |
| 推广准备区 | 推广链接和素材入口合为同一承载面；中间使用 1px 边界，不再保留双卡片间距。 |
| 服务区 | 使用建议、客户状态和追踪器合为同一承载面；左右两栏用 1px 边界分隔。 |
| 汇总表 | 保留独立白色承载面，表头改透明，行分隔承担结构。 |
| 卡片阴影 | 仪表盘内 `.card` 阴影数量从 12 降为 0。 |
| 控件 | 下拉、链接块、时间筛选统一 6px 圆角、强边框和品牌 focus。 |
| 响应式 | 1440 四列指标；1024 两列；390 单列。 |

业务边界：字段仍为本月注册、首次入金、有效转化、质量升档、信用权益、推广链接、素材、客户查询、追踪器和汇总；未引入模板的总资产、资金统计、资产分布、邀请返佣或交易盈亏字段。

验证截图：

1. [dashboard-before-1440-full.png](../screenshots/design-1.0-wave0/dashboard-before-1440-full.png)
2. [dashboard-after-1440-full.png](../screenshots/design-1.0-wave0/dashboard-after-1440-full.png)
3. [dashboard-after-1024-full.png](../screenshots/design-1.0-wave0/dashboard-after-1024-full.png)
4. [dashboard-after-390-full.png](../screenshots/design-1.0-wave0/dashboard-after-390-full.png)

浏览器交互验证：指标下钻进入客户数据；漏斗时间切换生效；推广链接下拉完整显示且不被承载面裁切；1440、1024、390 无整页横向溢出，手机端无文本裁切。

### 2.5 白底流式内容试算

2026-11-15 按用户指示完成试算：

| 项 | 结果 |
| --- | --- |
| 全局画布 | `--canvas` 改为 `#FFFFFF`，去掉灰底区域感。 |
| 仪表盘区域 | 月度指标、主分析、推广准备、服务和汇总不再使用外层背景、边框和圆角。 |
| 区域区分 | 使用 PageHeader、section 标题、32px 间距和 1px 水平分隔线。 |
| 信用权益 | 从深色块改为白色内容区，品牌色只用于等级、进度和操作强调。 |
| 主内容宽度 | `--main-max-width: none`；内容跟随视口减去 SideNav，不在大分辨率两侧留空白。 |
| 移动端 | 991px 以下 SideNav 隐藏，主内容继续流式占满可用宽度。 |

浏览器度量：1920 下主内容约 `1665px`，1440 下约 `1185px`（含滚动条误差），390 下约 `375px`；三种宽度均无整页横向溢出。

验证截图：

1. [dashboard-white-fluid-1920-full.png](../screenshots/design-1.0-wave0/dashboard-white-fluid-1920-full.png)
2. [dashboard-white-fluid-1440-full.png](../screenshots/design-1.0-wave0/dashboard-white-fluid-1440-full.png)
3. [dashboard-white-fluid-390-full.png](../screenshots/design-1.0-wave0/dashboard-white-fluid-390-full.png)

### 2.6 Notifications 式顶栏试算

2026-11-15 按用户确认的三个口径完成顶栏试算：

| 口径 | 结果 |
| --- | --- |
| 钱包 | 继续作为顶栏一级入口，保留金额和现有资金 popover。 |
| 主体按钮 | 实际语义为 Light / Dark 背景主题切换，不做账户主体切换。 |
| 消息中心 | 第一版保留未读数并直达 `messages`，通知 popover 后续再补。 |

顶栏顺序：

```text
时间 → 分隔线 → 钱包 → 客服 → 语言 → 消息中心 → 主题切换 → 头像 + 昵称
```

| 项 | 结果 |
| --- | --- |
| Header | 高 `62px`，Light 白底，Dark 使用 `#061335`。 |
| 时间 | 模板式双行网格：label 列 + 19ch 数值列，12px / 20。 |
| 钱包 | 模板 Rich Account 式两行：业务标签行 + 名称/金额/下箭头行。 |
| 客服 | 模板原始 headset SVG、36px 白色阴影圆底和 13px 左右命中区。 |
| 语言 | 模板原始 globe SVG、36px 白色阴影圆底和 13px 左右命中区。 |
| 消息 | 模板原始 bell SVG、36px 白色阴影圆底、右上未读 badge。 |
| 主题切换 | 模板原始 `75x36px` 半侧滑块：37px 渐变 knob、moon/sun 图标。 |
| 头像昵称 | 36px 头像 + 昵称 + 下箭头，13px 左右命中区。 |
| 响应式 | 1199px 以下隐藏品牌文字区；991px 以下隐藏时间；479px 以下隐藏语言和昵称。 |

主题实现：

1. Mock state 新增 `theme: "light" | "dark"`。
2. `body[data-theme]` 驱动全局主题。
3. Dark 使用外部 1.0 采样值：画布 `#061335`、浅层 `#121F3F`、分区 `#1F2B49`、边框 `#38425D` / `#515A72`、正文 `#A0A9B5`、强文字 `#D0D4DB`。
4. 主题状态写入现有 sessionStorage Mock state，刷新后保持。
5. 退出登录重置为 Light。

验证截图：

1. [topbar-notifications-light-1440x220.png](../screenshots/design-1.0-wave0/topbar-notifications-light-1440x220.png)
2. [topbar-notifications-dark-1440x220.png](../screenshots/design-1.0-wave0/topbar-notifications-dark-1440x220.png)
3. [topbar-notifications-light-390x160.png](../screenshots/design-1.0-wave0/topbar-notifications-light-390x160.png)
4. [topbar-notifications-exact-1047x63.png](../screenshots/design-1.0-wave0/topbar-notifications-exact-1047x63.png)

按用户截图同比例校准的 1047px 坐标：

| 组件 | 左边界 | 宽度 |
| --- | ---: | ---: |
| 时间 | `57px` | `230px` |
| 分隔线 | `291px` | `1px` |
| 钱包 / 账户摘要 | `292px` | `289px` |
| 客服 | `581px` | `62px` |
| 语言 | `643px` | `62px` |
| 消息 | `705px` | `62px` |
| 主题滑块主体 | `780px` | `75px` |
| 头像昵称区 | `868px` | 按昵称收缩 |

浏览器交互验证：主题切换和刷新持久化正常；钱包、语言、账户弹出层在 Dark 下边界清晰且不遮顶栏；客服打开现有帮助助手；消息直达消息中心；1440、1024、390 无整页横向溢出或文本裁切。

## 3. 核心页面契约

### 3.1 `dash` 仪表盘

页面目标：让合作方第一屏看到当前收益状态、推广入口、客户状态和可执行建议。

保留行为：

1. 钱包、资金摘要和收益页同源。
2. 推广链接生成、页面选择、语言选择和复制行为不变。
3. 客户数字下钻仍替换客户筛选并回到第一页。
4. 素材入口、客户状态查询和推广数据汇总不变。

视觉变更：

1. PageHeader 与指标区统一 1.0 层级。
2. 指标卡、链接生成卡、素材卡和建议卡使用同一卡片边界。
3. 图表和表格使用共享 token。
4. 手机端优先保留资金状态、推广链接和客户状态。

验收：

1. 钱包弹出层不遮挡关键操作。
2. 推广链接选择器打开时不推挤布局。
3. 指标点击下钻后返回状态一致。
4. `test:ui`、`test:dashboard-clients`、`test:dashboard-postbacks` 通过。

### 3.2 `summary` 总览数据

页面目标：呈现资金链路总览和可解释的四态资金状态。

保留行为：

1. 佣金、保证金、可提现和流水同源。
2. 资金状态解释和页面间跳转不变。
3. Mock 时间推进后的状态联动不变。

视觉变更：

1. 资金摘要使用稳定 MetricCard。
2. 状态说明使用统一 info、warning、danger 视觉语义。
3. 表格和筛选区使用共享 DataTable 规格。

验收：

1. 金额右对齐且单位不与数值分离。
2. 不可提现原因仍分层可解释。
3. `test:funds-availability`、`test:earnings`、`test:ui` 通过。

### 3.3 `wd` 提现

页面目标：说明当前出金方案状态，并提供记录查询和后续路径。

保留行为：

1. 不新增真实出金、支付或审核行为。
2. 出金方案确认前开放、记录与流水同源。
3. 合作清退场景下新提现仍暂停。

视觉变更：

1. 页签、状态卡、表格和空态统一。
2. 若出现流程确认或阻断说明，使用统一 Blocked 和 Result 模式。
3. 按钮提交态和 disabled 原因统一。

验收：

1. 出金记录与资金页状态不冲突。
2. 清退和异常场景仍可解释。
3. `test:withdrawals`、`test:partner-closure`、`test:ui` 通过。

### 3.4 `clients` 客户数据

页面目标：支持扫描、筛选和下钻客户资格与收益贡献。

保留行为：

1. 快捷筛选、客户详情、指标下钻和分页不变。
2. 风险与 Hold 解释不改变业务口径。
3. 客户隐私和 Mock 边界不变。

视觉变更：

1. 筛选抽屉、表格和详情区使用共享组件。
2. 表格列宽、状态标签和金额列统一。
3. 手机端保留客户标识、资格状态、核心金额和详情入口。

验收：

1. 筛选后分页和详情状态一致。
2. 长客户标识、邮箱或编号不破坏布局。
3. `test:clients-layout`、`test:client-risk`、`test:client-hold-help`、`test:tables` 通过。

### 3.5 `assets` 素材库

页面目标：让合作方快速筛选、预览、下载和复制官方素材。

保留行为：

1. 推广行为准则接受门槛不变。
2. 素材类型、尺寸、语言、预览、下载和复制行为不变。
3. 合作清退下素材暂停状态不变。

视觉变更：

1. 筛选页签、素材卡、详情抽屉和空态统一。
2. 素材卡片保持稳定宽高比，不因 hover 或标签换行跳动。
3. 详情抽屉底部操作固定。

验收：

1. 未接受准则时预览、下载和复制仍被阻止且原因可见。
2. 图片加载失败不产生空白无解释卡片。
3. `test:campaigns` 或素材专项检查、`test:ui`、`test:tables` 通过。

## 4. 逐路由验证矩阵

| 路由 | Wave | 自动检查 | 截图 |
| --- | --- | --- | --- |
| `dash` | 2 | `test:ui`、`test:dashboard-clients`、`test:dashboard-postbacks` | 三视口 |
| `summary` | 2 | `test:ui`、`test:funds-availability`、`test:earnings` | 三视口 |
| `wd` | 2 | `test:ui`、`test:withdrawals`、`test:partner-closure` | 三视口 |
| `clients` | 2 | `test:ui`、`test:clients-layout`、`test:client-risk`、`test:client-hold-help` | 三视口 |
| `assets` | 2 | `test:ui`、素材或 campaign 专项 | 三视口 |
| `perf` | 3 | `test:ui`、`test:reports`、`test:reports-data` | 抽查 |
| `promo` | 3 | `test:ui`、`test:campaigns` | 抽查 |
| `subchannels` | 3 | `test:ui`、对应专项 | 抽查 |
| `deep` | 3 | `test:ui`、`test:deep-official` | 抽查 |
| `tracker` | 3 | `test:ui`、`test:postbacks` | 抽查 |
| `lookup` | 3 | `test:lookup`、`test:deep-official` | 抽查 |
| `pay` | 3 | `test:ui`、`test:earnings`、`test:earnings-risk` | 抽查 |
| `statements` | 3 | `test:statements` | 抽查 |
| `guarantee` | 3 | `test:funds-availability`、`test:partner-closure` | 抽查 |
| `appeals` | 3 | `test:service-pages` 或对应专项 | 抽查 |
| `messages` | 3 | `test:service-pages` | 抽查 |
| `support` | 3 | `test:support`、`test:service-pages` | 抽查 |
| `account` | 3 | `test:account-page`、`test:profile-controls` | 抽查 |
| `export` | 3 | `test:ui`、`test:export-center` | 抽查 |
| `apply` | 4 | `test:partner-program-guide`、`test:user-flow-routing` | 状态抽查 |
| `onboarding` | 4 | `test:onboarding-profile`、`test:user-flow-routing` | 状态抽查 |

隐藏状态额外检查：

| 状态 | 检查 |
| --- | --- |
| `closure-flow` | `test:partner-closure` |
| `loading-flow` | 骨架截图和 `test:ui` |
| `api-error` | 错误码、traceId、重试截图 |
| simulation console | `test:simulation-console` |

## 5. Wave0出口条件

1. 本文档的基线结果已确认。
2. 恢复浏览器依赖或记录经验收的替代截图方案。
3. 生成五个核心页面的 before 截图。
4. 冻结 Wave 1 的品牌色试算方案。
5. 确认工作区既有变更的处理边界。

满足后进入 Wave 1，全局 Token 和 Shell 迁移。
