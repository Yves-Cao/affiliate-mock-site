# 风险工作台 Mock 交接记录 v1.0

状态：本地页面已生成；完整页面验收未通过；专业评审尚未开展  
复验日期：2026-11-09（Asia/Shanghai）  
适用范围：Affiliate 管理端风险工作台、风险任务、审批、敏感字段和通知投递演示  
数据性质：全部为本地合成评审数据，不代表生产数据或生产策略

## 1. 启动入口

在仓库根目录 `/Users/evechaqq.com/Documents/affiliate-mock-site` 启动并持续运行本地服务：

```bash
npm run serve
```

当前验证环境为macOS及本机Chrome。浏览器回归脚本需要Playwright（本机安装，或从`/Users/evechaqq.com/Documents/Affiliate/.tmp-mock-site/node_modules/playwright`备用路径读取），并使用`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`；仓库没有声明完整浏览器测试依赖，新开发机须先配置对应运行环境。运行浏览器回归前保持本地服务启动。

如果端口不是 `4179`，同步设置：

```bash
RWB_BASE_URL=http://127.0.0.1:<port>/admin-dev.html npm run test:risk-workbench
```

风险工作台入口：

`http://127.0.0.1:4179/admin-dev.html#/risk-workbench?tab=objects`

相关页面：

- 风险对象：`#/risk-workbench?tab=objects`
- 风险事件：`#/risk-workbench?tab=events`
- 集群：`#/risk-workbench?tab=clusters`
- 黑名单：`#/risk-workbench?tab=blacklist`
- 审批队列：`#/workbench?tab=approvals`

Mock 使用统一管理端入口、统一菜单、统一任务队列和统一原型数据层，没有新增独立 HTML 页面或第二套风险数据源。

唯一产品依据与验收来源：

- [风险工作台页面契约 v1.0](../../../Affiliate/原型/页面规范/风险工作台-页面契约-v1.0.md)
- [风险工作台页面数据契约 v1.0](../../../Affiliate/接口文档/Affiliate风险工作台页面数据契约-v1.0.md)
- [风险工作台组件补充 v1.0](../../../Affiliate/Affiliate管理端风险工作台组件补充-v1.0.md)
- [管理端组件规范 v1.1](../../../Affiliate/Affiliate管理端组件规范-v1.1.md)
- [正式 RWB-AC01～32 验收记录](../../../Affiliate/研发跟踪/风险工作台Mock重生成验收记录-v1.0.md)

评审 seed 为 `risk-workbench-v1`，风险工作台固定服务端时钟为 `2026-11-08T04:00:00.000Z`（北京时间 2026-11-08 12:00:00）。

数据契约为目标接口设计；当前风险页使用本地原型适配层，不代表23项目标HTTP接口、OpenAPI、真实IAM或CRM已经完成实现和联调。

## 2. 本次源文件哈希

哈希由 2026-11-09 最终复验时重新采集：

| 文件 | SHA-256 |
|---|---|
| `admin-dev.js` | `8820693e08890a25827c80d1fb2258aaa7e628009d002a9379569b10c68f1692` |
| `admin-prototype-data.js` | `6cad4903018748080d8be16d1ae14399e0038ef8954e820bea0f4f47bae3e970` |
| `admin-dev.css` | `2f8b730a6689aeb747081d4006dbc51626e5217483a0fd49df67c1c150a96d79` |

开发接续时如果上述文件再次变化，不能继续沿用本文件的截图和测试结论，必须重新执行对应复验。

## 3. 真实测试输出

### 3.1 语法检查

命令：

```bash
npm run check
```

结果：通过。统一检查覆盖用户端页面脚本、管理端脚本、风险工作台脚本、Mock Server 和关键检查脚本。

### 3.2 风险工作台动态链路

命令：

```bash
npm run test:risk-workbench-dynamic
```

真实输出：

```text
PASS dynamic risk signal and settlement recheck chain
```

### 3.3 风险动作链路

命令：

```bash
npm run test:risk-workbench-actions
```

真实输出：

```text
PASS 继续暂扣 domain chain
PASS 延长暂扣 domain chain
PASS 转财务 domain chain
PASS 信用传导 domain chain
PASS 集群拆分生成独立新组
PASS 移除名单 domain chain
PASS 未来生效名单保持待执行并拒绝提前完成
PASS seven risk actions and lifecycle boundaries
```

### 3.4 浏览器风险工作台回归

命令：

```bash
npm run test:risk-workbench
```

结果：实现自检脚本通过；本次交付截图另用独立浏览器 context 设置真实 viewport，并在截图前读取 `innerWidth`、`documentElement.scrollWidth`、`body.scrollWidth`，再用 `sips` 核对文件像素尺寸。该结果属于实现会话自检，不代替产品会话对 RWB-AC01～32 的回传验收。

产品独立验证与实现自检分开记录，详细版本与原始结论见正式验收记录：

- 实际IAB：C01临时揭示/复制、Escape关闭和对象切换后脱敏、真实超过60秒自动脱敏；T03两节点实际审批后从风险任务打开投递监控，失败邮件重试为成功，页面中原任务及执行仍保持待执行。
- 隔离VM：角色/对象/字段/scope校验及统一403、复制`auth → clipboard → audit`顺序、审计无原值；API19的ISO `expires_at`精确相对`risk.serverNow`60秒及真实`access_audit_id`引用；投递重试前后业务集合精确不变。API19最终复验绑定本文件UI和数据hash，其他局部证据保留各自历史hash，不合并为最终版全部场景通过。
- 实现自检脚本与另行采集截图：本节npm回归的原生产物位于`.artifacts/risk-workbench/`；第4～5节`.artifacts/risk-workbench-final/`是独立采集并由产品目检的交付证据，不冒充该npm脚本原生产物。

以上为本地Mock证据，不替代生产浏览器、IAM、邮件或服务端验收。

产品会话回传边界：正式 AC 结果以《风险工作台Mock重生成验收记录-v1.0.md》为唯一来源；本文件不把局部实现自检改写成 AC 通过。完整旧版广域检查 `scripts/admin-prototype-check.cjs` 仍停在既有非风险模块合作方空态断言 `:943`，未作为本次风险工作台通过依据。

## 4. 五种宽度基准截图

每个视口均使用独立浏览器上下文：`browser.newContext({viewport:{width,height:960}})`，重新加载风险对象页；截图前读取 `innerWidth`、`scrollWidth` 和指标卡的 `display/gridTemplateColumns`。五张交付基准图的指标为高风险对象 `6`、待处理任务 `3`、待审批 `1`、冻结金额 `USD 300.00`，且 `sips` 核对像素尺寸为 `宽度 × 960`。另做了 1024px 局部断点检查，不作为五张基准图之一。

| 宽度 | 截图 |
|---:|---|
| 390px | [风险对象基准](../../.artifacts/risk-workbench-final/risk-workbench-baseline-390.png) |
| 767px | [风险对象基准](../../.artifacts/risk-workbench-final/risk-workbench-baseline-767.png) |
| 1280px | [风险对象基准](../../.artifacts/risk-workbench-final/risk-workbench-baseline-1280.png) |
| 1440px | [风险对象基准](../../.artifacts/risk-workbench-final/risk-workbench-baseline-1440.png) |
| 1920px | [风险对象基准](../../.artifacts/risk-workbench-final/risk-workbench-baseline-1920.png) |

断点结果：390px 为 1 列；767px、1024px 为 2 列；1280px、1440px、1920px 为 4 列。六张本地证据图中，1024px 图仅用于断点局部检查：[1024px 局部截图](../../.artifacts/risk-workbench-final/risk-workbench-baseline-1024.png)。

## 5. 真实填写表单截图

以下截图来自统一 Mock 页面中的真实交互表单，不是静态设计稿。截图均为 1440×960，并且在独立浏览器上下文中填写后、未提交：

| 表单 | 截图 |
|---|---|
| 集群成员纠错（成员、纠错方式、原因、证据） | [上半屏](../../.artifacts/risk-workbench-final/risk-workbench-member-form-1440-top.png) · [下半屏](../../.artifacts/risk-workbench-final/risk-workbench-member-form-1440-bottom.png) |
| 加入本地黑名单（customer / DEMO-C01 / local / 未来失效时间 / 原因） | [上半屏](../../.artifacts/risk-workbench-final/risk-workbench-blacklist-form-1440-top.png) · [下半屏](../../.artifacts/risk-workbench-final/risk-workbench-blacklist-form-1440-bottom.png) |
| 风险 E03 → T03 → `DEMO-TQ-APPROVAL-5` 审批（意见、确认勾选） | [审批表单](../../.artifacts/risk-workbench-final/risk-workbench-approval-form-1440.png) |

成员纠错图明确勾选 `DEMO-C02`、选择“拆分为新集群”、填写原因并勾选证据和必填检查单；黑名单图明确选择 `customer`、`DEMO-C01`、`local`，填写生效时间、未来失效时间、原因，并保持“永久生效”未勾选；审批图来自风险事件 `DEMO-E03` 的 `T03`，当前节点为 `DEMO-TQ-APPROVAL-5`，审批意见已填写且“我已核对证据、金额和处置范围”已勾选，未提交。

## 6. 正式 RWB-AC01～32 验收边界

RWB-AC01～32 的唯一实时状态表和证据入口是产品会话维护的《风险工作台Mock重生成验收记录-v1.0.md》§2：[打开正式验收记录](../../../Affiliate/研发跟踪/风险工作台Mock重生成验收记录-v1.0.md)。本交接文档不复制 32 行，避免产品会话补充历史局部证据时发生版本漂移。

当前状态：完整 RWB-AC01～32 尚未核销，专业评审尚未开展；本轮仅补充局部实现证据和窄屏布局证据，不新增“完整通过”结论。

### 6.1 本轮实现自检（非 AC 编号）

以下项目仅记录实现会话本轮自检，不改变正式验收记录中的 AC 结果：

- 基准数据：独立 context + `taskQueue.reset()` 后确认 `6 / 3 / 1 / USD 300.00`。
- 截图采集：五个基准宽度由 context viewport 设置，DOM `innerWidth`/`scrollWidth` 与目标宽度一致，`sips` 文件尺寸分别为 `390×960`、`767×960`、`1280×960`、`1440×960`、`1920×960`；1024px 另做局部断点检查。
- 指标卡断点：`<480px` 为 1 列，`480–1279px` 为 2 列，`>=1280px` 为 4 列，并通过风险页 scoped `display:grid` 覆盖通用 `.dev-metric-bar` 的 flex 样式。
- 表单采集：1440×960 下真实填写 member、blacklist、approval 三类风险表单；审批截图为 E03/T03 的 `DEMO-TQ-APPROVAL-5`，未提交。
- AC21 局部实现自检：敏感字段脱敏、scope、TTL、复制审计和 API19 响应格式。
- AC24 局部实现自检：通知投递监控、失败重试且不重复业务执行。

## 7. 开发接续边界

开发接入时应保留以下页面契约：

1. 风险对象、事件、集群、黑名单继续使用统一管理端路由和抽屉。
2. 任务、审批、执行、通知投递必须使用同一 `task_id`、版本和审计上下文。
3. 敏感字段服务必须在生产侧接入真实 IAM、对象范围和字段授权，不得把前端 `role` 参数当作生产鉴权。
4. `expires_at` 使用服务端时间；客户端计时只能作为 UI 过期表现，不能写回服务端时间。
5. CRM 欺诈库和 CRM 身份/KYC/KYB 在风险页保持只读引用。
6. 风险动作的预览、审批、执行和资金状态不能由前端 Toast 或静态数组替代。

本文件记录的是本轮 Mock 交接证据，不代表生产接口、数据库、CRM、支付、IAM、邮件或消息系统已经完成接入。

完整页面验收未通过；专业评审尚未开展；本轮未提交 Git、未推送、未发布。
