# 18 事件流转图

版本：v0.1预览稿  
状态：基于事件设计稿的处理与补偿预览，待Schema和消费者评审；不声明全部事件已实现。  
配套：[文字说明](18-事件流转图.md)。

## 1. 事件接收、业务处理与消费者投递

```mermaid
flowchart TB
    SRC["来源生产者<br/>CRM事实适配、领域操作、批准执行及调度"]
    VALID{"来源认证、Schema及事件类型有效？"}
    IDEM{"事件ID、幂等摘要与对象版本检查"}
    REUSE["同事件/同业务结果复用<br/>不重复产生资金或任务"]
    HANDLE["按合法状态与前置事实处理<br/>不按接收顺序盲目改状态"]
    STORE["保存业务结果、审计及待投递事件<br/>可靠一致性机制待技术评审"]
    OUT["事件Outbox<br/>保留事件ID、来源对象与负载摘要"]
    DEL["按消费者裁剪字段并投递<br/>分别记录尝试与确认"]
    IMC["IMC<br/>分析统计，不回流控制计佣"]
    PUB["通知与合作者回传<br/>仅获准公开字段及有限原因"]
    INNER["内部消费者<br/>任务、投影和必要重检"]
    ACK["持久处理完成的消费确认<br/>接收响应与完成语义需契约明确"]
    COMP["补偿与人工任务<br/>来源无效、摘要冲突、前置缺失、投递失败"]
    FIX["补事实、复核或重投原事件<br/>保留原事件与原因；策略待配置"]

    SRC --> VALID
    VALID -->|"否"| COMP
    VALID -->|"是"| IDEM
    IDEM -->|"重复且结果一致"| REUSE
    IDEM -->|"冲突、无法排序或前置缺失"| COMP
    IDEM -->|"新合法事件"| HANDLE
    HANDLE --> STORE
    STORE --> OUT
    OUT --> DEL
    DEL --> IMC
    DEL --> PUB
    DEL --> INNER
    IMC --> ACK
    PUB --> ACK
    INNER --> ACK
    DEL -->|"失败或确认超时"| COMP
    COMP --> FIX
    FIX -->|"事实补齐后重新校验"| VALID
    FIX -->|"允许的投递重试"| DEL
```

无效来源和业务拒绝不能因进入补偿节点就自动重试成功；需按原因处理。迟到更正、退回和拒付仍可作为合法新事实处理，不能简单因为“旧业务时间”就丢弃。

## 2. 自动结算、提现、CRM打款的事件时点

下图保留已有`event_type`，中文说明业务含义。事件名称来自设计稿，不证明对应JSON Schema或消费者已部署。

```mermaid
sequenceDiagram
    participant J as 每日结算调度
    participant A as Affiliate资金域
    participant O as 事件Outbox
    participant U as 合作者
    participant R as 审批与受保护执行
    participant C as CRM
    participant D as 对账处理

    J->>A: 按结算日、时区及配置版本执行
    A->>O: settlement_run_started
    A->>A: 逐案门禁、税费、无风险保证金释放与入余额
    opt 相应处理确已发生
        A->>O: tax_assessment_calculated / guarantee_released
    end
    alt 本次运行完成
        A->>O: settlement_run_completed及成功/阻断/失败统计
    else 本次运行失败
        A->>O: settlement_run_failed及原因
    end
    Note over A,O: 每日结算不创建提现、结算单或CRM打款
    U->>A: 手动提交提现
    A->>A: 幂等创建订单、锁定分摊与唯一结算单
    A->>O: withdrawal_submitted / statement_generated
    A->>R: 进入适用审批与执行条件检查
    opt 获批且执行前重检通过
        R->>C: 原业务引用与幂等键发起打款
        R->>O: crm_payout_requested
        C-->>A: CRM受理及后续付款结果/查询结果
        A->>O: crm_payout_status_changed
        A->>A: 分别更新提现、单据、分摊及必要流水
        A->>D: 原CRM编号、外部交易及分摊核对
        D->>O: withdrawal_reconciled
    end
    Note over A,C: 结果未知先查询原付款，不先退款或盲目重付
```

`withdrawal_submitted`与`statement_generated`是独立事件：前者为提现申请，后者为月度结算单生成或重算。CRM受理与实际付款结果是不同事实；`withdrawal_reconciled`是否有差异取决于对账结果，不能从事件发出推定金额已一致。

## 3. 风险与申诉事件的作用范围

```mermaid
flowchart TB
    OVER["当前案件超过获批冻结阈值"]
    FREEZE["settlement_overdue_frozen<br/>仅当前客户、佣金及结算案件"]
    SIGNAL["settlement_overdue_signal_created<br/>后台风险信号与人工任务"]
    REVIEW{"人工核验风险信号"}
    CONF["settlement_overdue_signal_confirmed<br/>进入相应风险处置"]
    REJ["settlement_overdue_signal_rejected<br/>不等于解除冻结或实际放款"]
    POLICY["按开关、窗口及次数重算申诉可见性<br/>settlement_appeal_visibility_changed"]
    APPEAL["符合资格且提交成功<br/>settlement_appeal_created"]
    UNDEC["VIS-RISK-Q01待决<br/>解除申请、审批、执行与申诉并发时点"]
    OVER --> FREEZE
    FREEZE --> SIGNAL
    SIGNAL --> REVIEW
    REVIEW -->|"确认"| CONF
    REVIEW -->|"驳回"| REJ
    REJ --> POLICY
    POLICY -->|"允许且用户提交"| APPEAL
    REJ -. "解除不能直接越过待决" .-> UNDEC
    APPEAL -. "并发与恢复规则待统一" .-> UNDEC
```

所有上述超时事件保留案件三元组。合作者、二级渠道、国家和批次可作上下文或聚合维度，不能据此自动冻结其他案件。

## 4. 来源、锚点及待核验

| 图中处理或事件 | 来源 |
| --- | --- |
| 事件ID、幂等、Schema、字段受众及补数 | [事件§6至7](../../接口文档/事件流转综合文档-v0.10.md)；[幂等规范§3至8](../../接口文档/Affiliate-API幂等重试超时与生命周期规范-v0.2.md) |
| Outbox、任务与消费者投递 | [逻辑数据模型§3.5](../../技术设计/Affiliate数据模型与数据库设计说明-v0.1.md)；[本主题文字说明§2至5](18-事件流转图.md) |
| 自动结算、提现、单据与CRM付款事件 | [事件§7A](../../接口文档/事件流转综合文档-v0.10.md)，覆盖旧周期结算单触发；[接口§8A](../../接口文档/Affiliate接口文档-v0.14-设计稿.md) |
| 超时冻结及申诉事件 | [事件§4A](../../接口文档/事件流转综合文档-v0.10.md)；[待决事项§1A.12、§1A.14及VIS-RISK-Q01](../待决事项.md) |

每条事件需关联事件ID、类型、Schema版本、来源对象及版本、业务时间、数据截至时间、幂等键和trace；准确字段名按正式Schema统一，不另造Envelope。审批和执行关联原task/approval/execution及审计。

正式事件枚举与Schema覆盖范围、消费者确认语义、版本兼容、乱序处理、保留与重试策略由后端、CRM、IMC和测试确认。待回收成功、重复、乱序、未知类型、重投和资金重放金额不变证据；不把旧资料固定事件数量写成当前全量实现状态。

