# 17. API与页面映射图文字说明

版本：v0.1。状态：文字映射已整理，待绘制、正式OpenAPI回填及完整证据核验；不代表所有目标HTTP已实现。

对应图示：[Mermaid预览](17-API与页面映射图-Mermaid预览.md)，选取当前主契约路径并区分目标接口、局部Mock及真实验收；审批按最新DEC-032和OPEN-REQ-017核对。

## 1. 图的目标与节点类型

把页面、用户动作、接口、Schema、Mock场景、验收用例和实际证据连在一起，供前后端、测试共同核对。
主图按“页面、操作、接口、数据对象、场景/用例、证据”排列；不要按旧30页签固定页面数量。
管理端OpenAPI映射v0.6保留业务契约，但旧tag到当前页面重映射尚待更新。
下列路径来自现有设计，统一前缀和operationId以正式OpenAPI评审为准。

## 2. 核心页面与接口

| 页面/功能 | 操作或接口 | 主要对象/Schema方向 | 场景和验证锚点 |
| --- | --- | --- | --- |
| 合作者账户与合规 | GET /accounts/{partner_id}/overview、GET/PATCH .../profile | 账户状态、资料版本及限制摘要 | CRM同步正常/冲突、越权、失效；IF-K及测试矩阵 |
| CRM认证入口 | POST /partners/{id}/kyc/launch、GET .../kyc/status | CRM认证引用及状态 | 发起重复、处理中、失败；不本地认证 |
| 收款/税务资料 | GET/POST /accounts/{partner_id}/payout-accounts、.../tax-profiles | 变更申请、approval_required | 开关、敏感字段、批准前后状态 |
| 合作者提现 | POST /withdrawals、GET /withdrawals/{withdrawal_id} | WithdrawalOrder、Statement、WithdrawalAllocation | 双提交、锁定冲突、审核驳回、付款未知、部分成功/退回 |
| 合作者结算单 | GET /statements、GET /statements/{statement_id}、POST .../download | Statement、StatementLine、ExportTask | 自然月生成、本人范围、下载鉴权和审计 |
| 每日自动结算管理 | POST /settlements/daily/run、GET /settlements/daily/runs/{run_id} | 运行记录、逐案处理结果 | 同日任务幂等、重试不重复入余额、不生成结算单 |
| 管理端提现核验 | GET /admin/withdrawals、GET .../{id}、POST .../{id}/verify | WithdrawalOrder、核验清单、付款时间线 | 权限、账户状态、分摊、失败查证 |
| 统一审批队列 | GET /admin/approval-queue、GET .../{id}、POST .../{id}/approve或/reject | ApprovalRecord、批准范围、对象版本 | 不同人审批、版本变化、审批后执行失败 |
| 统一任务队列 | GET /admin/tasks/options、GET /admin/tasks、GET /admin/tasks/{id} | 统一Task及按类型处理包 | TQ-S01~12、TQ-AC01~35，按原文逐项取证 |
| 任务处理 | PATCH /admin/tasks/{id}/draft或/risk-draft、POST .../impact-previews、.../submit-review | 草稿、预览、审批引用 | owner、对象版本、重算预览、禁止浏览器直接complete |
| 风险工作台 | GET /admin/risk-workbench/objects、/events、/clusters、/blacklist | 对象、事件、集群与名单只读引用 | 专项API01~23、页面AC01~32 |
| 风险复核入口 | POST /admin/risk-workbench/review-requests、.../impact-previews | 统一任务及影响快照 | 创建任务不直接处置；敏感自审拒绝 |
| 客户360 | GET /admin/customers/{customer_id}/360及/overview、/attribution、/cases、/risk、/events | 客户摘要、案件三元组、CRM归因参数 | 五个按需页签、范围权限、无编辑客户事实 |
| 管理端客户服务 | GET /admin/support/tickets、GET .../{id}、POST .../reply或/notes或/actions | SupportTicket、Message、Attachment、Collaboration | CS-API01~21及页面33条验收；公开/内部受众 |
| 合作者支持 | GET/POST /support/tickets、GET/PATCH .../{id} | 本人工单、公开消息及状态 | 跨端消息、补件、关闭、评价；内部备注不泄露 |
| 结算冻结申诉 | GET /settlement-cases/{id}/appeal-eligibility、POST .../appeals | 资格、Appeal、政策快照及案件三元组 | 驳回信号前隐藏、窗口/次数、成功创建才计次数 |

## 3. 绘图关系规则

| 起点 | 终点 | 必须标注 |
| --- | --- | --- |
| 页面 | 用户动作 | 查询、提交、审批、导出或跳转，不只连菜单名称 |
| 用户动作 | API | 方法、路径、角色/对象范围、预期版本和幂等要求 |
| API | Schema | 请求、响应、错误和枚举来源；缺正式Schema标待回填 |
| Schema | Mock场景 | 确定性对象关联、状态、金额、权限、数据截至时间 |
| 场景 | 测试用例 | 成功、拒绝、重复、超时、并发、缺数及恢复 |
| 测试用例 | 证据 | 实际命令/测试名、同版本结果、截图或交付记录 |
| 页面深链 | 同一业务对象 | task_id、approval_id、customer_id或案件三元组不变 |

## 4. 场景与证据状态

风险工作台、任务队列、客户服务已存在专项本地Mock交付与局部测试证据，按总证据表及专项交接逐项读取。
不能把本地对象服务或浏览器测试通过视为目标HTTP、持久化、生产权限和外部联调已通过。
资金v0.14新增口径的自动结算、月度结算单、手动提现及CRM打款，需实现会话回传同版场景和契约检查。
本文件不新增虚构operationId、测试编号或“全绿”状态，缺失项保持待回填。
旧映射中的场景名可用于追溯，是否仍适用于当前页面与审批政策必须重新核对。

## 5. 接口交互异常

1. 请求结果未知时查原请求状态，保持同一幂等键，不直接再次执行业务动作。
2. 对象版本变化时刷新并重新预览，不能静默覆盖其他员工的修改。
3. 403或范围不匹配时服务端拒绝；菜单隐藏不能替代负向测试。
4. 关键参数或生产策略缺失时禁用依赖动作并提示原因，不用Mock值兜底。
5. 资金/风险敏感动作必须经过统一审批和执行，不暴露旧端点绕过新护栏。
6. 下载及证据访问单独鉴权；列表可见不代表可看全文或可导出。

## 6. 回填要求与待决

每个页面最终需补齐当前路由、需求编号、准确operationId、正式Schema版本、场景ID、用例ID及真实结果。
已有稳定编号沿用原文，本图临时排序不新增一套需求编号。
幂等Header在旧资料存在Idempotency-Key与X-Idempotency-Key差异，统一方式待OpenAPI评审；此处只规定幂等语义。
提现资金范围按最新接口写“全部可用明细”，状态字典旧句“用户选择范围”的具体权限需专项核验。
页面数量和路由数量不构成业务或验收上限。

## 7. 绘图验收

- 每个写动作有对象、权限、版本、幂等和异常恢复线。
- 每个高风险场景能连到实际或待补测试证据，不用截图替代接口契约。
- 旧tag占位、目标HTTP和本地Mock使用不同状态标记。
- 后续更新页面/API时可据图定位Schema、场景和测试影响。

## 8. 来源

- [接口v0.14](../../接口文档/Affiliate接口文档-v0.14-设计稿.md)。
- [任务接口](../../接口文档/Affiliate任务队列页面接口契约-v0.1.md)、[风险接口](../../接口文档/Affiliate风险工作台页面数据契约-v1.0.md)、[客户服务契约](../../接口文档/Affiliate管理端客户服务开发契约-v0.1.md)。
- [OpenAPI旧tag业务映射](../研发准备/Mock与接口/Affiliate管理端OpenAPI与Mock映射-v0.6.md)。
- [全量测试矩阵](../测试验收/Affiliate全量测试用例矩阵-v0.1.md)及[原型与Mock证据总表](../核验/Affiliate原型与Mock评审证据总表-v0.1.md)。
