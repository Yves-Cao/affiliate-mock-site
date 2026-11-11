# Affiliate用户端Figma设计基线与Mock同步记录

版本：v0.1  
日期：2026-11-05  
适用范围：`affiliate-mock-site` 用户端静态Mock。  
证据来源：

1. Figma文件`web-gtcgo (Copy) (Copy)`，file key `J4AHANi5NviHO1a4wyPQoV`。
2. `figma-design-reader.user.js` v0.3在Properties面板读取到的Text styles与Color styles。
3. 项目既有[DESIGN.md](../../../../Affiliate/DESIGN.md)中已登记的Figma Color Styles、导出图SHA-256和CRM运行时规范。
4. 用户端20路由现有浏览器回归结果。

限制：本次没有取得Figma完整节点树、组件API或变量集合；页面结构、布局与组件行为按既有`DESIGN.md`、CRM参考图和用户确认交互执行。本文明确区分Figma语义证据与CRM运行时推导，不把推断写成Figma绑定。

## 1. Design Tokens

权威实现文件：[design-tokens.css](../../design-tokens.css)。

### 1.1 Figma Color Styles

| Token | Figma样式名 | 值 | Mock用途 |
|---|---|---|---|
| `--brand-deep` | 蓝色1 | `#00187E` | 深层品牌蓝、渐变端点 |
| `--brand` | 蓝色2 | `#005BFF` | 主操作、链接、选中态 |
| `--nav-text` | 导航栏文字颜色 | `#6B7897` | 顶栏辅助文字、服务器/本地时间标签、演示说明 |
| `--side-icon` | 左导航图标色 | `#828A9A` | 未选中侧栏图标、图形线 |
| `--side-text` | 左侧导航文字颜色 | `#2C3751` | 未选中侧栏文字 |
| `--brand-gradient` | 导航按钮蓝色渐变色 | `linear-gradient(135deg,#0C2176 0%,#005BFF 100%)` | 品牌区、主按钮、当前导航 |
| `--brand-gradient-reverse` | 渐变蓝 | `linear-gradient(135deg,#015BFE 0%,#0C2176 100%)` | 反向强调、图表强调预留 |
| `--blue-black` | 蓝黑 | `#0F1B3D` | 强标题、深色文字、图表深色 |
| `--gold` | 金色 | `#B48755` | 信用/权益弱强调 |
| `--gold-gradient` | 金色渐变 | `linear-gradient(135deg,#F7E4CF 0%,#B48755 100%)` | 高等级/权益标识预留 |

v0.3中纯色SVG已直接读到`蓝色1`、`蓝色2`、`导航栏文字颜色`、`左导航图标色`、`左侧导航文字颜色`、`蓝黑`、`金色`。三个渐变色在Web UI中渲染为blob图片，无法从DOM安全解码；其值以`DESIGN.md`已登记的Figma Color Styles为准。

### 1.2 CRM界面与语义色

以下颜色来自CRM导出图和本地CRM代码，用于补充Figma样式未覆盖的系统状态：

| Token | 值 | 用途 |
|---|---|---|
| `--canvas` | `#F8F9FA` | 内容画布 |
| `--surface` | `#FFFFFF` | 卡片、表格、弹窗 |
| `--surface-soft` | `#ECF0F4` / `#F8FBFF` | 表头、浅色区域 |
| `--border` | `#E8EEF7` / `#EDF2F8` | 卡片和表格边界 |
| `--control-border` | `#C8D1DA` / `#D7E0EC` | 输入框、chip |
| `--text` | `#171717` | 主数值 |
| `--body-text` | `#344054` | 常规正文 |
| `--muted` | `#667085` | 辅助说明 |
| `--row-hover` | `#EEF7FF` | 行hover |
| `--ok` / `--ok-bg` | `#07865D` / `#E6F6EE` | 成功 |
| `--warning` / `--warning-bg` | `#C76A08` / `#FDF3E4` | 待处理 |
| `--danger` / `--danger-bg` | `#D75851` / `#FDEEEE` | 拒绝、错误 |
| `--info` / `--info-bg` | `#2563EB` / `#EAF1FF` | 信息 |

## 2. Typography

Figma Properties面板读取到7个Text styles：

| Token | Figma名称 | 字号/行高 | 字重 | 使用 |
|---|---|---:|---:|---|
| `--font-text-14-r` | 14px R | 14/20 | 400 | 默认正文 |
| `--font-text-14-m` | 14px M | 14/20 | 500 | 卡片标题、紧凑强调 |
| `--font-text-16-r` | 16px R | 16/24 | 400 | 次级说明、普通标题 |
| `--font-text-16-m` | 16px M | 16/24 | 500 | 区块标题 |
| `--font-text-18-b` | 18px B | 18/26 | 700 | 强区块标题、抽屉标题 |
| `--font-text-20-b` | 20px B | 20/28 | 700 | 大标题、权益主数值 |
| `--font-text-24-b` | 24px B | 24/32 | 700 | 页面主标题、KPI主数值 |

运行时字体栈：

```css
Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif
```

数据密集表格允许使用12-13px紧凑字号，但必须保持行高、长文本受控换行和移动端可读性。`letter-spacing`为0，禁止负字距；管理端字体和暖色token不得进入用户端。

## 3. Layout

| 层级 | 规格 |
|---|---|
| 顶栏 | 高56px，白色全宽；左品牌、右工具 |
| 侧栏 | 展开216px、收起68px；首位仪表盘直达；收起态悬浮临时展开 |
| 内容画布 | `#F8F9FA` |
| 内容主体 | 最大宽度1600px，桌面padding约15px |
| 卡片 | 白底、`#E8EEF7`边界、4-6px圆角、低阴影 |
| 表格 | 表头浅蓝、行hover浅蓝、正文12-14px、内部横滑 |
| 抽屉 | 右侧680px，移动端全宽 |
| 断点 | 1440 / 1200 / 992 / 768 / 480 |

## 4. Components

### Button

| 类型 | 规格 |
|---|---|
| Primary | 高30-32px，4px圆角，`--brand-gradient`，白字 |
| Secondary | 白底，`#D7E0EC`边框，`--body-text` |
| Danger | 系统危险红，白字 |
| Link | `--brand`，hover加深 |
| Disabled | 保留布局，降低透明度并说明原因 |

### Input / Select / Date

高度32px，4px圆角；边框`#C8D1DA`或`#D7E0EC`；focus使用品牌蓝和外发光。标签不得被长占位符替代。

### Table

高密度行式表格；表头浅蓝；正文12-14px；操作列右侧固定；长文本受控换行；移动端除客户卡片化外均内部横滑。

### Tag / Status

高度约22px，4px或999px圆角，必须同时有文字和语义色。禁止只用颜色表示状态。

### Drawer / Modal

详情优先右侧抽屉；轻量确认用居中弹窗；底部操作固定；危险和拒绝类操作必须填写原因。

### Credit / Benefit

信用等级与权益使用`--gold`或`--gold-gradient`作弱强调；不得暴露内部信用分、积分流水、权重、阈值或集群规则。

## 5. UX Rules

1. 每页先回答当前状态，再提供操作。
2. 资金类页面必须同源：佣金、税费、保证金、提现、余额可对账。
3. 不可提现原因分层为：待释放、待复核、待补齐、待处理。
4. 客户与收益下钻必须替换旧筛选并回到第一页。
5. 空态不虚构数据；错误必须给错误码、原因、traceId和重试。
6. 邮箱、手机号、银行卡、税号默认脱敏；明文不得进入页面或复制。
7. 中英文全量覆盖，业务数据值可保留中文源值并用显示映射翻译。
8. 页面不得出现竞品名称或开发性注释。

## 6. Mock同步结果

本轮已完成：

1. 新增`design-tokens.css`，集中维护Figma颜色和Text styles。
2. `styles.css`移除重复`:root`token，改为引用token文件。
3. 顶栏辅助文字从`#667085`修正为Figma`#6B7897`。
4. 核心KPI从22px修正为Figma 24px B / 32。
5. 卡片标题使用14px M / 20。
6. 建议标题使用16px M / 24，教程标题使用18px B / 26。
7. 合作者计划主标题使用24px B / 32。
8. 信用等级增加金色弱强调，符合Figma金色语义。
9. 第一批全局统一完成：用户端非标准字重收敛为500/700，表格正文统一13px、表头600并使用共享token，主要详情抽屉标题统一18px B / 26。
10. 第二批全局统一完成：报表、收益、二级渠道、账户、提现、资金可用性和活动数据的KPI/金额统一映射到Figma 20B或24B样式；关闭按钮等符号字号不属于文本样式，不强制映射。
11. 资金可用性组件标明账户全量口径，避免与收益页跟随筛选的统计卡混淆；顶栏钱包“总收益”使用与提现成功分摊同源的已支付合计。
12. 消息级别`normal`显示为“普通”，避免与“未读/已读”状态混淆；资金组件只列出当前确实未触发的风控原因。
13. 合作清退场景复用用户端卡片、标签、按钮和20B/24B数字样式；阶段说明只给当前阶段与下一步，不承诺生产SLA。
14. 右侧抽屉和全高右弹窗的底部操作区统一常驻底部：主体内容滚动时按钮保持可见，操作按钮从左侧排列；素材详情这类整体滚动抽屉使用绝对贴底操作栏。
15. 入驻申请使用独立排版层级：流程主标题20B/28，步骤标题18B/26，表单标签14M/20，输入与说明14R/20，小按钮13/20；状态标签继续使用全局11px规范。
16. 素材卡片的尺寸/语言紧凑标签不低于11px；Loading状态使用稳定骨架卡和表格骨架，不虚构数据。
17. 模拟控制台使用用户端按钮、标签、表单、抽屉和sticky footer规范；在线显示右下角入口，所有内容标注Mock演示且不暴露内部风控参数。

## 7. Verification

自动检查：

```bash
npm run test:design-tokens
```

浏览器检查重点：

1. 顶栏时间标签为`#6B7897`。
2. 仪表盘KPI为24px/32、700。
3. 面板标题为14px/20、500。
4. 信用等级块包含金色弱强调。
5. 20路由1440px与390px无整页横向溢出。
