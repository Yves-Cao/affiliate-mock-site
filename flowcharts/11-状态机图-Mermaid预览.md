# 11 核心对象状态机 Mermaid预览

版本：v0.1预览稿。

状态：目标设计子集，待评审。七类对象分别绘制；不代表完整转换白名单、Schema已冻结或实现已完成。

字段以[状态字典v0.4第14节](../../评审资料包/基础资料/05-状态与原因码字典-v0.4.md)为现行资金依据。客户与申诉尚未定完整枚举时使用中文业务态；图中省略的边不代表允许任意跳转。

## 1. 合作者申请与合作状态

最新DEC-034要求申请、CRM确认、链接及资金资格分离，因此本图使用中文业务态，不把旧合作状态枚举冒充完整申请状态。

```mermaid
flowchart TB
    D["申请草稿"] --> S["待提交"]
    S --> REVIEW["审核中"]
    REVIEW -->|要求补件| MATERIAL["待补件"]
    MATERIAL -->|沿原主体和版本链重提| REVIEW
    REVIEW -->|审核通过| CRM["审核通过待CRM确认"]
    CRM -->|同步确认成功| APPROVED["已通过"]
    CRM -->|同步失败| SYNC["保留审核结果<br/>重试或转人工同步任务"]
    SYNC -->|收到有效CRM确认| APPROVED
    REVIEW -->|驳回| REJECTED["已驳回<br/>停用已开链接，保留历史案件"]
    APPROVED -->|获准暂停或终止处理| DISABLED["已停用<br/>保留资金与审计处理"]
    DISABLED -.-> RESTORE["恢复条件按独立权限和业务门禁检查<br/>不把终止状态直接改回生效"]
```

依据：[DEC-024、026、028、034](../../需求文档/09-决策与待确认事项-v0.1.md)。链接可用不等于身份、结算或提现资格通过；阶段开链另见注册/入驻流程。

## 2. 客户多维状态

```mermaid
flowchart TB
    FACT["CRM客户事实与版本"] --> REG["注册状态"]
    FACT --> ATTR["归因状态"]
    FACT --> QUAL["资格状态"]
    FACT --> FTD["FTD里程碑"]
    FACT --> VFTD["有效FTD里程碑"]
    FACT --> QUALITY["质量服务状态"]
    FACT --> RISK["风险处理状态"]
    FTD --> ONLY["仅更新里程碑<br/>不生成可放款资金"]
    ATTR --> LOCK["归属锁定及证据"]
    QUAL --> BASEGATE["资格与有效FTD共同满足"]
    VFTD --> BASEGATE
    LOCK --> BASEGATE
    BASEGATE --> BASE["生成基础CPA佣金案件"]
    QUALITY -->|质量服务确认| EXTRA["生成独立质量服务佣金案件"]
    RISK --> CONTROL["独立影响受限案件结算门禁<br/>不覆盖注册和里程碑事实"]
```

依据：状态字典第14.2节、[需求03第2～5节](../../需求文档/03-业务规则与状态-v0.1.md)。质量服务失败不追回已成立基础CPA。

## 3. 佣金案件 CommissionCase

```mermaid
stateDiagram-v2
    state "已创建 created" as Created
    state "结算中 holding" as Holding
    state "结算前检查 settlement_check" as Checking
    state "人工复核 manual_review" as Review
    state "已批准 approved" as Approved
    state "已拒绝 rejected" as Rejected
    [*] --> Created : 有效FTD或质量服务确认且幂等校验通过
    Created --> Holding : 保存金额与规则快照
    Holding --> Checking : 到达检查时点
    Checking --> Review : 需要人工结论
    Checking --> Approved : 规则和必要审核满足
    Review --> Approved : 复核及必要审核满足
    Review --> Rejected : 拒绝依据及审核满足
```

`reversed`、`clawed_back`也是现行枚举，但部分冲正、追索金额及允许来源状态尚需财务/技术细化，本图不虚构全部转换边。它们必须关联反向流水和原案件；`paid`不属于佣金状态。

依据：状态字典第14.3节、[接口第8A.1节](../../接口文档/Affiliate接口文档-v0.14-设计稿.md)。

## 4. 结算案件 SettlementCase

```mermaid
flowchart TB
    NOT["尚未生成 not_generated"] -->|进入结算条件满足| ELIGIBLE["可进入结算 eligible"]
    ELIGIBLE -->|每日任务取得处理权| PROCESS["结算处理中 processing"]
    PROCESS --> CHECK{"事实、实名、风险及资金门禁通过？"}
    CHECK -->|否| BLOCK["被阻断 blocked"]
    CHECK -->|是| LEDGER["计算税费及保证金相关明细<br/>幂等入钱包"]
    LEDGER -->|成功| SETTLED["已结算 settled<br/>表示入钱包，不表示已付款"]
    LEDGER -->|明确失败| FAILED["结算失败 failed<br/>保留执行与恢复记录"]
    BLOCK -->|获准解除指定限制| RECHECK["重新执行全部结算前检查"]
    RECHECK -->|全部通过| ELIGIBLE
    RECHECK -->|仍受限| BLOCK
    WAIT["待结算当前案件超过配置阈值"] --> FREEZE["结算冻结 frozen<br/>绑定当前三元组及超时信号"]
    FREEZE --> PENDING["VIS-RISK-Q01待确认<br/>不画冻结直接入钱包的边"]
```

依据：状态字典第14.3/14.6节、[资金专题第2A节](../../评审资料包/基础资料/13-Affiliate佣金结算与资金时序图-v0.2.md)、[VIS-RISK-Q01](../待决事项.md)。重检不是重付；失败恢复的准确枚举映射待技术确认。

## 5. 提现 WithdrawalOrder

```mermaid
flowchart TB
    DRAFT["提现草稿 draft<br/>输入金额"] -->|提交并生成FIFO分摊快照| REVIEW["待审核 pending_review<br/>锁定明细"]
    REVIEW --> AUTH["按权限和已授权配置完成提现审核<br/>审核方式边界见OPEN-REQ-017"]
    AUTH -->|批准且账户门禁通过| APPROVED["已批准 approved"]
    AUTH -->|驳回| REJECTED["已驳回 rejected<br/>保留申请及审核记录"]
    REVIEW -->|状态允许且有权取消| CANCELLED["已取消 cancelled"]
    APPROVED -->|Affiliate幂等请求CRM打款| PROCESS["支付处理中 processing"]
    PROCESS -->|CRM确认全额成功| PAID["已支付 paid"]
    PROCESS -->|确认部分成功| PARTIAL["部分支付 partially_paid<br/>逐分摊保存成功和未成功部分"]
    PROCESS -->|确认失败| FAILED["支付失败 failed<br/>确认可退金额生成反向流水"]
    PROCESS -->|超时或结果未知| TIMEOUT["超时 timeout<br/>查询原请求，不先退款或重付"]
    PAID -->|银行确认退回| RETURNED["银行退回 returned<br/>记录退回事实及反向流水"]
    TIMEOUT --> VERIFY["查证回执并核对原单与尝试<br/>后续状态及重试关系待技术评审"]
    PARTIAL --> ALLOC["仅对确认失败或退回分摊反向入账<br/>已成功未退回部分不重复付款"]
```

依据：状态字典第14.3/14.5节、接口第8A.3～8A.5节、FUND-04及DEC-032。终态不通过普通更新接口复活；未知与失败、银行退回分别处理。新订单/新尝试/原结算单的关系未在图中代定。

## 6. 风险案件 RiskCase及并行状态

```mermaid
flowchart TB
    EVENT["风险案件及原始事件<br/>保留case_status兼容字段"] --> TASK["统一任务<br/>待认领 → 处理中"]
    TASK --> PLAN["调查建议及处置计划"]
    PLAN --> APPROVAL["按对应权限和已授权策略审核<br/>自动审核或人工审核各自留痕"]
    APPROVAL -->|退回| PLAN
    APPROVAL -->|驳回申请| KEEP["保留原风险与资金事实"]
    APPROVAL -->|批准| EXEC["受保护执行<br/>待执行 → 执行中"]
    EXEC --> RESULT{"执行结果"}
    RESULT -->|成功| DETERMINATION["分别更新确认或排除结论"]
    RESULT -->|失败或部分成功| RECOVER["保留执行状态并查证恢复"]
    DETERMINATION --> CLOSE{"申诉、后续检查及必要执行均终结？"}
    CLOSE -->|是| DONE["关闭相应任务或案件<br/>不直接表示资金已放行"]
    CLOSE -->|否| PROCESSING["保持处理中及明确责任"]
    EVENT -.-> SIGNAL["超时信号独立状态<br/>待处理、调查、审核、确认或驳回、关闭"]
    SIGNAL -.-> APPEALGATE["驳回只重算申诉资格<br/>不替代一般风险认定"]
```

依据：[风险页面第8～10节](../../历史版本/2026-11-05文档归档/2026-11-10页面规范迁移/原型/页面规范/风险工作台-页面契约-v1.0.md)、[风险数据契约第旧兼容映射](../../接口文档/Affiliate风险工作台页面数据契约-v1.0.md)、状态字典第14.7节。审批模式按最新DEC-032；旧专项不同人限定需回填，当前图不代造动作授权。

## 7. 申诉 Appeal

```mermaid
flowchart TB
    GATE{"本人权限、对象、开关、窗口和次数满足？"} -->|否| HIDDEN["不可发起<br/>保留有限原因"]
    GATE -->|是| AVAILABLE["可发起申诉"]
    AVAILABLE --> SUBMIT{"成功创建新申诉？"}
    SUBMIT -->|否或重复| NOCOUNT["不额外消耗次数"]
    SUBMIT -->|是| PROCESS["已提交并处理中<br/>成功创建才累计一次"]
    PROCESS -->|需要材料| MATERIAL["待补充材料"]
    MATERIAL -->|补齐| PROCESS
    PROCESS --> REVIEW["复核原决定、新证据及必要审核"]
    REVIEW -->|维持| MAINTAIN["维持原决定"]
    REVIEW -->|改判| CHANGE["记录改判及下游获准动作<br/>不覆盖原历史账"]
    MAINTAIN --> FINISH["必要处理完成后申诉终结"]
    CHANGE --> FINISH
    CHANGE -.-> TIME["超时冻结解除时点待VIS-RISK-Q01<br/>不画申诉通过自动放款"]
```

中文为业务阶段，不是新增`appeal_status`技术枚举。超时信号驳回前不可申诉；成功创建次数按当前结算案件累计，重复幂等请求不重置窗口。

## 8. 跨图核对

审批、执行、任务、风险、申诉、佣金、结算、提现均保存独立状态和引用。每次变化记录前后状态、原因、来源、规则版本、时间、幂等键与`trace_id`。

完整客户/申诉枚举、终态后尝试映射及IAM策略由技术和专业评审核验；真正业务待决见[VIS-RISK-Q01与第1A.19节](../待决事项.md)、[核验SBV-17/22](核验/服务蓝图核验台账.md)。

[返回文字绘图说明](11-状态机图.md)。
