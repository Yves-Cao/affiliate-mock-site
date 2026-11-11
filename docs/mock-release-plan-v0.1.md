# Affiliate Mock发布包方案

版本：v0.1  
日期：2026-10-23  
状态：整理稿，待评审后执行；本文只规划本地发布包与GitHub协作方式，尚未创建远端仓库、未推送任何内容。

## 1. 目标与已确认工作方式

2026-10-23用户确认：评审原型不再继续完善，后续转为 **Mock方式发布到GitHub**，供研发人员按契约直接开发。

本方案将该决定落实为四条工作规则：

1. **原型冻结**：`原型/Affiliate评审原型-v0.21.html` 作为最后交互基线，只读保留；后续不再通过继续升版原型来消化需求。
2. **契约优先**：页面结构以`原型/页面规范/`为准，业务与接口口径以MRD、风控方案、接口设计稿和待决事项为准。
3. **Mock可运行**：研发克隆仓库后能启动Mock服务、查看接口文档、加载演示场景，并直接开发前端或联调边界。
4. **资料与代码分层**：业务资料仍在Affiliate项目维护；GitHub发布包只带入研发必需、可内部共享、脱敏后的版本化材料。

本决定不等于业务参数已定稿，也不代表远端仓库权限、名称、可见性、分支策略已获批准。

## 2. 交付分层

| 层 | 内容 | 目标 | 当前状态 |
| --- | --- | --- | --- |
| A. 冻结交互基线 | v0.21原型、页面规范30份 | 告诉研发页面长什么样、怎么交互 | 已具备 |
| B. 业务与接口契约 | MRD v1.1、风控v0.3、Affiliate接口v0.2、事件流转v0.3、口径摘要 | 告诉研发业务规则和数据边界 | 已具备，需做研发摘要 |
| C. OpenAPI与Mock | UI API、系统API、Mock数据、场景开关 | 让研发不用等后端即可开发 | 待制作 |
| D. GitHub协作 | README、CONTRIBUTING、Issue/PR模板、CI | 统一研发协作和变更流程 | 待制作 |
| E. 前端工程骨架 | API client、Mock adapter、路由、权限、状态 | 研发直接开页面 | 待技术栈确认 |

建议按三阶段发布，不一次性铺开：

1. **v0.1发布包**：文档、冻结原型、页面规范、P0接口清单、Mock数据字典；适合研发阅读和拆任务。
2. **v0.2发布包**：OpenAPI、Mock server、场景数据、CI校验；研发可直接启动和开发。
3. **v0.3发布包**：前端工程骨架、权限路由、API适配层、示例页面；进入实际开发。

## 3. 事实来源与优先级

研发包内冲突按以下优先级解释：

1. `待决事项.md`生成的**已确认口径摘要**：业务决定以CFD-D/Q编号为准。
2. `Affiliate市场需求文档-MRD-v1.1.md`：场景、目标、验收边界。
3. `Affiliate CPA风控方案-v0.3.md`：风控规则、风险分、Hold、黑名单、申诉。
4. `接口文档/Affiliate接口文档-v0.2-设计稿.md`：系统间接口IF-A～F。
5. `接口文档/事件流转综合文档-v0.3.md`：跨系统事件链和状态机。
6. `原型/页面规范/`：页面字段、交互、显示格式和状态。
7. `原型/Affiliate评审原型-v0.21.html`：仅作视觉与交互参考；与页面规范冲突时，页面规范优先。

注意：v0.21原型未回填Q-007日结、无最低提现、动态Hold文案；研发不得从原型HTML反推结算口径，应读取页面规范05/16与Mock参数。

## 4. 发布包文件清单

### 4.1 纳入GitHub发布包

| 类型 | 本地来源 | 发布位置 | 处理方式 |
| --- | --- | --- | --- |
| 项目说明 | 新建 | `README.md` | 面向研发，写启动方式、目录、P0范围 |
| 协作规则 | 新建 | `CONTRIBUTING.md` | 分支、PR、Issue、契约变更流程 |
| 业务主文档 | `Affiliate市场需求文档-MRD-v1.1.md` | `docs/mrd-v1.1.md` | 只改版本号时同步新文件 |
| 风控主文档 | `Affiliate CPA风控方案-v0.3.md` | `docs/risk-v0.3.md` | 保留待评审标记 |
| 系统接口 | `接口文档/Affiliate接口文档-v0.2-设计稿.md` | `docs/interface-v0.2.md` | 不代替OpenAPI |
| 事件流转 | `接口文档/事件流转综合文档-v0.3.md` | `docs/event-flow-v0.3.md` | 用于系统边界说明 |
| 口径摘要 | 从`待决事项.md`整理 | `docs/confirmed-decisions.md` | 只摘已确认口径，不复制过程争论 |
| 页面规范 | `原型/页面规范/*.md` | `docs/page-specs/` | 30份全量纳入，作为页面契约 |
| 冻结原型 | `原型/Affiliate评审原型-v0.21.html` | `prototype/v0.21.html` | 只读基线 |
| 接口契约 | 待制作 | `contracts/openapi-ui.yaml`、`contracts/openapi-system.yaml` | Mock与研发共用同一来源 |
| 枚举与错误码 | 待制作 | `contracts/enums.md`、`contracts/error-codes.md` | 统一状态与错误语义 |
| Mock数据 | 待制作 | `mock/data/` | 全部虚构，标记`MOCK_ONLY` |
| Mock场景 | 待制作 | `mock/scenarios/` | 按业务场景组合数据 |
| 校验 | 待制作 | `tests/`、`.github/workflows/ci.yml` | OpenAPI、schema、场景冒烟 |

### 4.2 明确不纳入首轮发布包

| 本地内容 | 不纳入原因 |
| --- | --- |
| `竞品分析/`全目录、Exness截图、后台导出价目表 | 竞品证据和授权后台资料不进入研发包；需要引用时只写结论或编号摘要 |
| `output/`汇报PPT、Word、PDF、导出过程文件 | 派生汇报材料，与开发契约无关 |
| `MaxCRM-接口存档/` | 体量大且包含内部接口全量存档；只按需摘取IF-A～F相关设计 |
| `.workbuddy/`、会话记录、长期记忆 | 包含协作过程和本地路径，不适合作为研发事实来源 |
| 原型v0.1～v0.20 | 历史版本保留在Affiliate本地，研发只需要v0.21冻结基线 |
| 待决事项原文全量 | 包含大量过程、用户原话和业务争议；发布包只放已确认口径摘要 |
| IMC历史资料、本地只读CRM代码路径 | 外部项目材料，不经确认不进入本仓库 |

若后续某项竞品或内部系统资料成为研发必需，先判断是否可摘要、脱敏、缩小范围，再单独确认纳入。

## 5. 建议仓库结构

```text
affiliate-mock/
  README.md
  CONTRIBUTING.md
  docs/
    mrd-v1.1.md
    risk-v0.3.md
    interface-v0.2.md
    event-flow-v0.3.md
    confirmed-decisions.md
    page-specs/
      00-使用说明.md
      01-推广端-仪表盘.md
      ...
  prototype/
    v0.21.html
  contracts/
    openapi-ui.yaml
    openapi-system.yaml
    enums.md
    error-codes.md
    data-dictionary.md
  mock/
    server.mjs
    config/
      parameters.json
      risk-bands.json
      settlement-rules.json
    data/
      users.json
      partners.json
      clients.json
      links.json
      commissions.json
      withdrawals.json
      risk-events.json
      blacklists.json
      audit-logs.json
    scenarios/
      normal-flow.json
      no-source.json
      ib-excluded.json
      high-risk.json
      dynamic-hold.json
      chargeback.json
      kyc-pending.json
      empty-state.json
  app/
    src/
      api/
        client.ts
        mockAdapter.ts
      router/
      stores/
      views/
  tests/
    contract.spec.ts
    scenarios.spec.ts
  .github/
    ISSUE_TEMPLATE/
      spec-change.md
      api-question.md
      bug.md
    workflows/
      ci.yml
```

`app/`是否纳入由技术栈决定；若研发团队已有工程仓库，可以只发布`docs/contracts/mock`，让工程仓库依赖本契约仓库。

## 6. P0范围与接口分层

### 6.1 P0页面范围

优先支撑MRD中S-001～S-007主链路：

| 端 | 页面 | 页面id | 契约来源 |
| --- | --- | --- | --- |
| 客户端 | 仪表盘 | `dash` | 01 |
| 客户端 | 业绩数据 | `perf` | 02 |
| 客户端 | 客户列表 | `clients` | 03 |
| 客户端 | 推广链接与活动 | `promo` | 04 |
| 客户端 | 收益与提现 | `pay` | 05 |
| 客户端 | 客户归属查询 | `lookup` | 06 |
| 客户端 | 入驻申请 | `apply` | 20 |
| 运营管理端 | 合作者列表 | `plist` | 07 |
| 运营管理端 | 合作者审核 | `paudit` | 08 |
| 运营管理端 | 结算审批 | `settle` | 09 |
| 运营管理端 | 风控事件处置 | `risk` | 11 |

素材库、深度链接、提现独立页、黑名单、配置页、报表页可进入P1/P2；Mock可以预留数据结构，但不阻塞P0。

### 6.2 UI API草案

OpenAPI定稿前，先按以下模块拆任务：

| 模块 | 建议接口 | 关联页面 |
| --- | --- | --- |
| 会话与资料完善 | `GET /me`、`GET /onboarding`、`POST /onboarding/:step` | 全局、apply |
| 仪表盘 | `GET /dashboard/summary`、`GET /dashboard/trends` | dash |
| 业绩数据 | `GET /performance`、`GET /performance/dimensions` | perf |
| 客户 | `GET /clients`、`GET /clients/:id` | clients |
| 推广链接 | `GET /promo-links`、`POST /promo-links`、`POST /deep-links` | promo、deep |
| 佣金 | `GET /commissions`、`GET /commissions/summary` | pay |
| 提现 | `GET /withdrawals`、`POST /withdrawals` | pay、wd |
| 归属查询 | `GET /attributions/:clientId` | lookup |
| 合作者 | `GET /partners`、`GET /partners/:id` | plist |
| 合作者审核 | `GET /partner-audits`、`POST /partner-audits/:id/decision` | paudit |
| 结算审批 | `GET /settlements`、`POST /settlements/:id/decision` | settle |
| 风控 | `GET /risk-events`、`POST /risk-events/:id/decision` | risk |
| 参数 | `GET /parameters`、`PUT /parameters` | param |

接口路径、分页、排序、错误结构均为草案，待OpenAPI评审确定。

### 6.3 系统API范围

Mock需同时模拟现有IF-A～F，便于研发理解系统边界：

| 编号 | Mock重点 | 已确认口径 |
| --- | --- | --- |
| IF-A | 点击登记、链接参数、匿名ID | 首次点击、30天窗口、无来源不归因 |
| IF-B | 注册归因、身份互斥 | 首触优先、注册锁定、IB/Affiliate互斥 |
| IF-C | KYC、成功FTD、真实交易、冲正 | 有效FTD=CRM成功FTD×Affiliate合规通过 |
| IF-D | 日结对账、佣金状态 | 日结、无最低提现、动态Hold |
| IF-E | 风险事件、限制、申诉 | 风险分、R0-R4、原因码、留痕 |
| IF-F | IMC分析事件上送 | IMC只分析，不参与计佣 |

IF-A～F的鉴权、回传方式、事件注册仍受A-IF待决项影响；Mock先按占位契约实现，不冒充最终架构。

## 7. Mock数据规则

### 7.1 数据状态

所有Mock数据必须带元数据：

```json
{
  "meta": {
    "mockOnly": true,
    "scenario": "dynamic-hold",
    "sourceRefs": ["Q-007", "CFD-D-013"],
    "decisionStatus": "confirmed"
  }
}
```

状态建议：

| 状态 | 含义 |
| --- | --- |
| `confirmed` | 有CFD-D/Q编号支撑，可按结构实现 |
| `structural` | 结构方向已确认，数值待评审 |
| `mock-only` | 仅为演示、占位或测试，不得写成业务决定 |
| `pending` | 依赖待决项，不能固化 |

### 7.2 必备场景

| 场景 | 覆盖目标 | 关键状态 |
| --- | --- | --- |
| `normal-flow` | 正常合作方、有效FTD、可结算佣金 | happy path |
| `no-source` | 无来源点击不默认归因 | attribution=none |
| `ib-excluded` | IB客户排除但原始事件保留 | excluded、raw retained |
| `high-risk` | 风险分与R0-R4处置 | riskScore、riskBand、restriction |
| `dynamic-hold` | 初始1天、按风险递增、超30天冻结 | holding、frozen_manual_review |
| `chargeback` | 全额冲正、不足挂负 | reversed、negativeBalance |
| `kyc-pending` | 资料未完善、功能受限 | profileIncomplete |
| `empty-state` | 无数据、无佣金、无客户 | empty |
| `api-error` | 参数错误、无权限、服务异常 | error codes |

场景切换建议支持：

```http
X-Mock-Scenario: dynamic-hold
```

### 7.3 参数文件

未定稿数值集中在`mock/config/parameters.json`，页面和测试不得写死：

| 参数 | 当前结构状态 | 数值状态 |
| --- | --- | --- |
| 结算周期 | 日结 | 已确认 |
| 最低提现 | 不设 | 已确认 |
| 动态Hold初始天数 | 1天 | 已确认 |
| 动态Hold上限 | 超过30天冻结转人工 | 已确认 |
| 风险分递增映射 | 结构待评审 | 待确认 |
| 质量门槛 | 入金+真实交易组合 | 数值待确认 |
| 达标期限 | 30～90天方向 | 数值待确认 |
| 分国档定价 | 国家档结构 | 数值待确认 |

## 8. 资料更新槽位

用户后续补充资料时，先更新Affiliate主档，再同步发布包；不要直接改GitHub派生副本。

| 槽位 | 待更新资料 | 影响的Mock内容 | 当前状态 |
| --- | --- | --- | --- |
| Q-007数值包 | 入金门槛、交易门槛、达标期限、国家档价、动态Hold递增映射 | `parameters.json`、佣金Mock、结算测试 | 待用户/评审补充 |
| 风险评分包 | 风险事件权重、R0-R4处置、扣分/加分规则 | `risk-bands.json`、`risk-events.json` | 待共同设计 |
| 接口架构包 | A-IF-05回传方式、A-IF-11鉴权、A-IF-12 P0/P1边界 | OpenAPI security、Mock adapter | 待技术评审 |
| 页面规范更新 | 用户直接修改的页面md | UI API字段、页面开发任务 | 随时受理 |
| 权限资料 | 客户端/运营端角色与菜单权限 | `users.json`、路由权限、Mock鉴权 | 待确认 |
| 首期国家与经营主体 | 国家名单、主体准入 | `geo.json`、国家配置页 | 已延后至MVP后 |

### 更新登记模板

| 日期 | 资料名称 | 更新人 | 摘要 | 影响文件 | 是否需同步GitHub | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

## 9. GitHub协作方式

### 9.1 权限与分支

建议：

- 仓库先设为**Private**。
- `main`受保护，只允许PR合入。
| 分支 | 用途 |
| --- | --- |
| `main` | 可用文档、契约、Mock、测试 |
| `spec/*` | 产品口径和页面规范变更 |
| `contract/*` | OpenAPI与Mock契约变更 |
| `feat/*` | 前端或Mock功能开发 |
| `fix/*` | 缺陷修复 |

### 9.2 Issue类型

| 模板 | 用途 | 必填 |
| --- | --- | --- |
| Spec change | 页面或业务口径变更 | 影响页面、关联Q/CFD-D、验收标准 |
| API question | 接口口径不清 | 接口、字段、冲突来源 |
| Bug | 实现缺陷 | 复现步骤、期望、实际 |
| Data scenario | 新增Mock场景 | 场景目的、数据状态、覆盖事件 |

### 9.3 CI校验

最低要求：

1. Markdown链接检查。
2. OpenAPI schema校验。
3. Mock数据schema校验。
4. Mock server启动与核心接口冒烟。
5. 场景覆盖检查：normal、empty、error、dynamic-hold、chargeback至少各一条。
6. 禁止真实姓名、真实邮箱、真实客户号、授权账号信息进入fixtures。

## 10. 发布检查清单

### v0.1发布包检查

- [ ] 确认仓库归属、名称、可见性、成员权限。
- [ ] 建立发布包目录，不直接复制Affiliate根目录。
- [ ] 复制MRD v1.1、风控v0.3、接口v0.2、事件流转v0.3。
- [ ] 从待决事项整理`confirmed-decisions.md`。
- [ ] 复制页面规范30份。
- [ ] 复制并冻结v0.21原型。
- [ ] 编写研发README和协作规则。
- [ ] 完成敏感信息扫描：真实账号、截图、竞品数据、本地路径、用户原话。

### v0.2发布包检查

- [ ] P0 UI OpenAPI初稿。
- [ ] IF-A～F系统OpenAPI初稿。
- [ ] 枚举、错误码、分页、时间、金额格式约定。
- [ ] Mock server启动脚本。
- [ ] P0数据与必备场景。
- [ ] CI通过。

### v0.3发布包检查

- [ ] 技术栈确认。
- [ ] API client与Mock adapter。
- [ ] 权限路由与页面骨架。
- [ ] 至少一个客户端页和一个运营端页打通Mock。
- [ ] 端到端契约测试。

## 11. 待确认事项

| 编号建议 | 事项 | 影响 | 当前处理 |
| --- | --- | --- | --- |
| A-MOCK-001 | 仓库名称、归属组织、Private/Public、成员权限 | 决定能否发布 | 未创建远端前必须确认 |
| A-MOCK-002 | 研发技术栈与是否在同一仓库放`app/` | 决定v0.3工程骨架 | 待研发负责人确认 |
| A-MOCK-003 | UI API由产品先定还是前后端共审 | 决定OpenAPI评审流程 | 建议共审 |
| A-MOCK-004 | Mock是否需要状态写入 | 影响审核、结算、风控操作演示 | P0建议内存态写入 |
| A-MOCK-005 | 契约版本策略 | 决定兼容与通知方式 | 建议SemVer |
| A-MOCK-006 | 哪些内部文档可进入Private仓库 | 影响发布范围 | 默认只发摘要 |

以上编号建议仅在本文使用；若评审通过，再登记到待决事项作为正式编号。

## 12. 维护记录

| 版本 | 日期 | 变更 | 依据 |
| --- | --- | --- | --- |
| v0.1 | 2026-10-23 | 首次整理原型冻结、Mock发布分层、文件裁剪、P0接口、场景、资料更新槽位与GitHub协作流程 | 用户确认“原型不再继续完善，要使用mock方式发布到github”并要求整理 |
