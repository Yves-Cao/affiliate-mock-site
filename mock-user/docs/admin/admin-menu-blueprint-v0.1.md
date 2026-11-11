# Affiliate Admin Menu Blueprint

版本：v0.1  
日期：2026-11-05  
状态：完整产品蓝图，用于评审；不是最终排期承诺。  
实现位置：`admin-dev.html?v=admin-v26#/admin-workbench` 左侧导航。  
架构边界：完整原型采用 `1个仪表盘路由 + 4个既有业务路由 + 1个统一业务模块路由`；既有30个业务页签保持不变，33个P1/P2菜单由统一模块路由承载。

## 1. 蓝图结论

当前左侧菜单按完整产品分为10组、75个功能入口：

| 阶段 | 数量 | 含义 |
|---|---:|---|
| MVP | 42 | 可跳转现有30个业务页签、仪表盘或全局审计的入口，含同一页面在不同业务菜单下的别名 |
| P1 | 32 | 完整产品需要补齐的业务对象、资金、推广、报表和治理入口 |
| P2 | 1 | 低频跟进能力，暂不进入MVP |

菜单入口共计75个。当前原型中：

1. 73个入口映射到实际页面。
2. 2个入口映射到全局审计。
3. 33个P1/P2入口由统一业务模块路由承载，每个入口都有独立URL、数据表、统计、筛选、详情和动作。
4. 33个模块按业务域使用不同的主操作、洞察面板和详情业务路径，不使用单一“认领”模板。

## 2. 菜单分层原则

1. **业务对象优先**：合作方、客户、推广、资金放在配置之前。
2. **配置后置**：规则和参数是管理员能力，不应压过日常业务。
3. **识别与处理分离**：识别中心看事实和证据；处理中心做人工结论和动作。
4. **报表只读**：允许下钻和生成建议，不直接执行资金或风险动作。
5. **治理独立**：审计、导出、敏感字段、删除、匿名化和Breach必须可追溯。
6. **同一页面允许多业务别名**：例如D+N冻结既属于资金视角，也属于处理中心；菜单别名不等于复制路由。
7. **模块必须有说明**：每个P1/P2模块页面顶部展示定位、阶段、对象和依赖，并可打开蓝图说明抽屉。

## 3. 完整菜单

### 3.1 仪表盘

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 经营总览 | P1 | 汇总转化、佣金、风险、资金和质量指标 | `#/admin-modules/dash-operation` |
| 任务总览 | MVP | 待处理、待审批、超时、集成失败和角色任务 | `#/admin-workbench/tasks` |
| 风险总览 | P1 | 高风险对象、案件组、隔离金额、调查SLA | `#/admin-modules/dash-risk` |
| 资金总览 | P1 | Hold到期、保证金、提现异常、冲正风险 | `#/admin-modules/dash-funds` |

### 3.2 合作方管理

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 合作方列表 | P1 | 全量Partner对象、状态、国家、信用、业绩、风险 | `#/admin-modules/partner-list` |
| 入驻审核 | P1 | 申请资料、资质审核、补充材料、驳回 | `#/admin-modules/partner-onboarding` |
| KYC / KYB状态 | P1 | 展示CRM认证事实源和同步状态 | `#/admin-modules/partner-kyc` |
| 信用档案 | MVP | 信用分、C0-C4等级、积分流水、权益、调级 | `#/admin-risk/credit-insight` |
| 合作方清退 | P1 | 终止合作、链接下线、最终结算、保证金、归档 | `#/admin-modules/partner-offboarding` |
| 合作方备注 | P2 | 内部跟进、沟通结论、风险备注 | `#/admin-modules/partner-notes` |

### 3.3 客户与归因

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 客户列表 | P1 | Affiliate客户、国家、转化阶段、风险、佣金 | `#/admin-modules/client-list` |
| 归属关系 | P1 | 点击、注册、开户、归属判定、IB/Affiliate边界 | `#/admin-modules/attribution-links` |
| 事件流水 | P1 | 点击、注册、入金、交易、回传、状态事件 | `#/admin-modules/event-stream` |
| 客户风险档案 | P1 | 客户R档、风险事件、设备/IP/支付关联、欺诈引用 | `#/admin-modules/client-risk` |
| 归因异常 | P1 | 重复归属、事件缺数、来源异常、官方路径异常 | `#/admin-modules/attribution-exception` |

### 3.4 推广管理

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 活动管理 | P1 | 活动、审核、上下线、国家适用范围 | `#/admin-modules/campaign-list` |
| 推广链接 | P1 | 官方链接、参数、启停、归属规则 | `#/admin-modules/link-list` |
| 素材库 | P1 | 横幅、落地页、视频、GIF、平台规格 | `#/admin-modules/material-list` |
| 二级渠道 / Sub ID | P1 | 渠道创建、链接拼接、渠道效果 | `#/admin-modules/sub-channel` |
| 回传配置 | P1 | Postback平台、地址、参数映射、试投 | `#/admin-modules/postback` |
| 链接追踪器 | P1 | 点击来源、设备、国家、平台、转化路径 | `#/admin-modules/tracker` |

### 3.5 佣金与资金

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 佣金记录 | P1 | 资格档、里程碑、金额、Hold、结算、TraceId | `#/admin-modules/commission-list` |
| Hold管理 | MVP | 理论Hold、风险附加、集群延长、D+N | `#/admin-review/d-plus-n` |
| 结算单 | P1 | 结算批次、明细、税费、保证金、净额 | `#/admin-modules/statement-list` |
| 提现管理 | P1 | 提现、账户校验、手续费、支付状态、重试 | `#/admin-modules/withdrawal-list` |
| 保证金管理 | MVP | 余额、覆盖率、抵扣、释放、追索 | `#/admin-review/guarantee-offset` |
| 税费管理 | P1 | 税务信息、税率、代扣、税单 | `#/admin-modules/tax-list` |
| 冲正与追回 | P1 | 拒付、冲正、追回、责任、账务重算 | `#/admin-modules/reversal-list` |
| 资金对账 | P1 | Affiliate账务、支付、财务报表三方对账 | `#/admin-modules/reconciliation` |

### 3.6 风控与合规

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 硬规则命中 | MVP | 官方路径、点击风险、实时拦截 | `#/admin-risk/hard-hit` |
| 风险事件与评分 | MVP | 风险事件、分值、R档、影响对象 | `#/admin-risk/risk-event` |
| 集群识别 | MVP | 设备、IP、支付、行为集群关系 | `#/admin-risk/cluster` |
| 违规事件 | MVP | 虚假流量、违规素材、恶意注册、多层违规 | `#/admin-risk/violation` |
| CRM欺诈库 | MVP | CRM欺诈结论、本地引用、同步记录 | `#/admin-risk/fraud` |
| 黑名单管理 | P1 | 设备、IP、支付、客户、合作方黑名单 | `#/admin-modules/blacklist` |
| 国家与合规限制 | MVP | 开放国家、法律主体、禁投地区 | `#/admin-config/country-entity` |
| 质量服务内部规则 | MVP | 有效FTD后的质量判定、规则版本、证据 | `#/admin-config/qualification` |

### 3.7 处理中心

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 全部任务 | MVP | 待办、审批、超时、等待外部、失败任务 | `#/admin-workbench/tasks` |
| 风险复核 | MVP | 风险结论、调查、隔离、解除、升级 | `#/admin-review/risk-review` |
| 信用调级 | MVP | 临时调级、续期、提前终止、恢复异常 | `#/admin-review/credit-level` |
| 集群Hold延长 | MVP | 自动延长、上限、强制人工 | `#/admin-review/cluster-hold` |
| D+N冻结 | MVP | 阈值触发、复核、重检、冻结 | `#/admin-review/d-plus-n` |
| 申诉处理 | MVP | 申诉、补材料、改判、补发 | `#/admin-review/appeal` |
| 保证金抵扣 | MVP | 抵扣审批、追索、账务重算 | `#/admin-review/guarantee-offset` |
| 上限与熔断 | MVP | 数量上限、突变熔断、人工复核 | `#/admin-review/cap-breaker` |
| 集成任务 | MVP | 缺数、回调、归因自检、技术重试 | `#/admin-review/integration` |
| 工单处理 | P1 | 一般支持工单、转办、SLA、答复 | `#/admin-modules/support-ticket` |

### 3.8 报表分析

| 菜单 | 阶段 | 目标 | 当前映射 |
|---|---|---|---|
| 合作方ROI | MVP | 合作方、国家、渠道、Sub ID转化与净成本 | `#/admin-performance/roi` |
| 质量看板 | MVP | 质量趋势、留存、拒付、冲正、欺诈、集群 | `#/admin-performance/quality` |
| 保证金覆盖 | MVP | 保证金、潜在损失、覆盖率、释放延迟 | `#/admin-performance/guarantee-coverage` |
| 转化漏斗 | P1 | 点击、注册、FTD、有效FTD、质量服务 | `#/admin-modules/report-funnel` |
| 渠道分析 | P1 | 活动、链接、Sub ID、国家、设备、平台 | `#/admin-modules/report-channel` |
| 财务报表 | P1 | 佣金、税费、保证金、提现、冲正、净支出 | `#/admin-modules/report-finance` |
| 风控报表 | P1 | 命中率、误报率、阻断金额、处理时效、损失回收 | `#/admin-modules/report-risk` |

### 3.9 配置与发布

| 菜单 | 阶段 | 当前映射 |
|---|---|---|
| 配置总览 | MVP | `#/admin-config/overview` |
| 价格表 | MVP | `#/admin-config/price` |
| 资格档与里程碑 | MVP | `#/admin-config/qualification` |
| 信用等级与权益 | MVP | `#/admin-config/credit-benefit` |
| 动态Hold规则 | MVP | `#/admin-config/hold` |
| 保证金与税费规则 | MVP | `#/admin-config/guarantee-tax` |
| 审批流配置 | MVP | `#/admin-config/approval` |
| 试算与发布 | MVP | `#/admin-config/simulation` |
| 集群规则 | MVP | `#/admin-config/cluster-rule` |
| 硬规则 | MVP | `#/admin-config/hard-rule` |
| 风险评分规则 | MVP | `#/admin-config/risk-score` |
| 违规规则 | MVP | `#/admin-config/violation-rule` |
| 参数字典 | P1 | `#/admin-modules/config-dictionary` |
| 权限与菜单 | P1 | `#/admin-modules/config-permission` |

### 3.10 审计与治理

| 菜单 | 阶段 | 当前映射 |
|---|---|---|
| 操作审计 | MVP | 全局审计抽屉 |
| 自审记录 | MVP | 全局审计抽屉，按`self_review`过滤 |
| 导出中心 | MVP | `#/admin-review/integration`导出治理区块 |
| 敏感字段授权 | MVP | `#/admin-review/integration`数据治理区块 |
| 删除与匿名化 | MVP | `#/admin-review/integration`数据治理区块 |
| Breach事件 | MVP | `#/admin-review/integration`数据治理区块 |
| 数据保留策略 | MVP | `#/admin-review/integration`数据治理区块 |

## 4. 评审口径

1. 左侧菜单是完整产品蓝图，不等于当前MVP全部已实现。
2. `MVP`标记表示当前原型已有可跳转承载页或全局能力。
3. `P1`标记表示完整产品必须补齐，但具体排期依赖CRM、支付、IMC、账务、文件和工单能力。
4. `P2`标记表示低频或可后置能力。
5. 菜单别名不新增路由；同一底层页面可以从不同业务视角进入。
6. 后续权限设计时，先按角色过滤菜单，再过滤按钮、API和数据范围。

## 5. 左栏交互规则

1. 母菜单只作为分组标题，不显示箭头和图标。
2. 母菜单右侧显示`MVP数量`，不显示`已实现/总数`比例，避免被误认为进度。
3. 默认只展开当前路由所在分组。
4. 点击新分组时自动收起上一个分组，同一时间最多一个分组展开。
5. 从菜单进入页面后，保持该菜单所在分组展开。
6. 子菜单全部显示语义小图标，用于区分对象、资金、风控、处理、报表、配置和治理。
7. 子菜单保留缩进和左侧连接线，与母菜单形成层级差异。
8. 侧栏滚动条隐藏；内容仍可滚动，但不显示类似进度条的视觉元素。
9. 1279px以下侧栏收起为图标态，子菜单仅显示图标，母菜单仅显示分组简称。

## 6. 维护记录

| 日期 | 变更 | 依据 |
|---|---|---|
| 2026-11-05 | 建立完整管理端菜单蓝图，并落地到v0.21左栏 | 用户确认该结构作为完整产品蓝图并用于评审 |
| 2026-11-05 | v0.22优化左栏交互：单分组展开、母菜单去箭头、子菜单加图标、隐藏滚动条 | 用户反馈原交互怪异并出现类似进度条的滚动条 |
| 2026-11-05 | v0.23补齐33个P1/P2页面，形成完整可操作Mock原型 | 用户要求补全菜单并输出完整真实Mock原型 |
| 2026-11-05 | v0.24为模块页面增加业务化主操作、领域洞察和详情业务路径 | 用户要求继续完善完整真实Mock原型 |
| 2026-11-05 | v0.25修正违规事件与CRM欺诈库路由映射，并增加全量路由完整性校验 | 页面实现清单校验发现两个菜单悬空路由 |
| 2026-11-05 | v0.26为全部64个唯一页面增加深度交互工作台 | 用户要求每个页面生成深度可交互完整功能页 |
