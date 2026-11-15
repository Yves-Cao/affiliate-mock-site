# 页面波次与验收门禁

版本：v0.1  
日期：2026-11-14  
状态：`draft_for_mock_redesign`

> **English Summary**
>
> This file groups the existing Affiliate Mock routes into implementation waves and defines the evidence required before any wave can be considered complete.
>
> **中文摘要**
>
> 本文将既有 Affiliate Mock 路由分组为实施波次，并定义每波完成前必须具备的证据。

## 1. 波次原则

1. 先全局，后页面。
2. 先主链路，后长尾。
3. 每波冻结一次视觉口径，避免页面间来回摆动。
4. 功能测试通过但截图或交互检查未通过时，页面不得标记完成。

## 2. Wave 0：标准冻结与差异审计

范围：

1. 确认本标准和参考档案。
2. 跑当前设计 token、表格、UI 和 v1 检查，记录基线。
3. 截图当前核心页面，建立 before 档案。
4. 确认品牌色、Header、SideNav、内容宽度和卡片规格。

出口条件：

1. 统一口径无业务语义混入。
2. 当前失败项和视觉差异已记录。
3. 第一波页面清单冻结。

## 3. Wave 1：全局视觉层

范围：

1. `design-tokens.css`
2. AppShell：Header、SideNav、内容容器。
3. PageHeader。
4. Button、Input、Select、Checkbox、Badge、Tooltip。
5. MetricCard、DataTable、卡片、抽屉、弹窗和结果态。

不做：

1. 不改路由。
2. 不改业务状态。
3. 不逐页重排所有内容。

出口条件：

1. 全局组件在同一状态下的颜色、高度、圆角、边框和 focus 一致。
2. 现有全局设计检查通过。
3. 核心路由无整页横向溢出。

## 4. Wave 2：核心评审链路

优先页面：

| 路由 | 页面类型 | 验收重点 |
| --- | --- | --- |
| `dash` | Overview | 首屏主次、指标稳定、任务和近期对象层级。 |
| `summary` | Finance | 资金摘要、状态解释、表格和详情入口。 |
| `wd` | Finance + Flow | 表单、校验、提交中、结果和失败恢复。 |
| `clients` | Report | 筛选、表格、状态、移动端关键列。 |
| `assets` 或 `promo` | Resource | 卡片网格、筛选、详情抽屉和空态。 |

出口条件：

1. 每页有 1440、1024、390 截图。
2. 页面主操作和下一步明确。
3. Loading、Empty、Error 或 Mock 场景未被破坏。
4. 对应专项测试通过。

## 5. Wave 3：次级页面

范围：

| 分组 | 路由 |
| --- | --- |
| 数据与推广 | `perf`、`promo`、`subchannels`、`deep`、`tracker`、`lookup` |
| 资金与服务 | `pay`、`statements`、`guarantee`、`appeals`、`messages`、`support`、`export` |
| 账户 | `account` |

处理方式：

1. 优先吃全局组件收益。
2. 修明显层级、间距、状态和响应式问题。
3. 不重造页面结构。

## 6. Wave 4：流程与演示状态

范围：

1. `apply`
2. `onboarding`
3. `closure-flow`
4. `loading-flow`
5. `api-error`
6. simulation console 兼容

处理方式：

1. 保持既有流程语义和状态机。
2. 只做 Shell、组件、状态和可访问性对齐。
3. 若需要重排流程，单独立页面契约，不和主站波次混改。

## 7. 页面完成定义

每页必须记录：

1. 修改文件。
2. 使用的页面模板。
3. 自动化测试结果。
4. 1440、1024、390 截图。
5. 交互检查结果。
6. 已知残留问题和冻结原因。

## 8. 自动化验证

全局最小集：

```bash
npm --prefix affiliate-mock run check
npm --prefix affiliate-mock run test:design-tokens
npm --prefix affiliate-mock run test:tables
npm --prefix affiliate-mock run test:ui
npm --prefix affiliate-mock run test:v1
```

页面专项按范围追加，例如：

```bash
npm --prefix affiliate-mock run test:earnings
npm --prefix affiliate-mock run test:withdrawals
npm --prefix affiliate-mock run test:clients-layout
npm --prefix affiliate-mock run test:campaigns
npm --prefix affiliate-mock run test:service-pages
```

## 9. 截图验收

视口：

| 名称 | 尺寸 |
| --- | --- |
| Desktop | `1440x900` |
| Tablet | `1024x900` |
| Mobile | `390x844` |

检查：

1. 无整页横向溢出。
2. 文本不裁切、不重叠、不被压缩到不可读。
3. 固定控件尺寸稳定。
4. 首屏能看出页面用途和下一步。
5. 弹窗、抽屉和底部操作不遮挡关键内容。

## 10. 交互验收

1. 入口、返回、关闭、取消都有明确结果。
2. 刷新后状态保持一致。
3. Loading、Empty、Error、Disabled、Forbidden、Success 可解释。
4. Escape、遮罩、焦点回收符合全局规范。
5. 移动端关键操作不依赖 hover。
6. 所有可点击控件有可访问名称和可观察结果。
