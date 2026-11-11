# 15 核心业务对象关系图

版本：v0.1预览稿  
状态：概念与逻辑关系预览，待数据库及领域评审；不是DDL、完整Schema或生产建表依据。  
配套：[文字说明](15-ER图.md)。

## 1. 合作者、归因与计佣的已有逻辑关系

实体名沿现有逻辑数据模型；中文关系是业务含义。`crm_subject_id`和`customer_id`引用CRM，不代表Affiliate拥有另一套客户账户事实。

```mermaid
erDiagram
    partner ||--o{ click : "关联点击"
    partner ||--o{ attribution : "获得有效归属"
    qualification_case ||--o{ commission_case : "按阶段和版本生成"

    partner {
        string partner_id PK
        string crm_subject_id UK
        string status "合作者业务状态"
    }
    click {
        string click_id PK
        string partner_id FK
        string link_id
        string sub_id
        datetime click_time
    }
    attribution {
        string attribution_id PK
        string customer_id "CRM客户引用；单一有效归属"
        string partner_id FK
        datetime locked_at
        string source
    }
    qualification_case {
        string qualification_case_id PK
        string customer_id "CRM客户引用"
        string case_type
        string status
    }
    commission_case {
        string commission_case_id PK
        string qualification_case_id FK
        string stage
        string version
        decimal base_amount
        decimal credit_bonus
        decimal personal_bonus
        decimal fixed_amount
        string currency "MVP仅USD"
    }
```

图只表达有依据的关联和部分关键字段，未将点击与归因强制画成一对一。一个客户最多一个当前有效Affiliate归属，历史更正与锁定证据仍须保留；该约束不能解释为删除历史记录。

FTD仅里程碑；有效FTD承接基础CPA及FTD/有效FTD附加，质量服务另建奖励案件。资格输入和CRM提供结果的具体分工按SBV-12核验，不据实体名确定计算责任。

## 2. 提现与结算单的一对一逻辑关系

以下采用接口v0.14的新资金规则，覆盖旧数据模型“合作者+周期+版本生成结算单”的定义。资金精度、实际字段类型及完整物理键仍待技术评审。

```mermaid
erDiagram
    partner ||--o{ withdrawal_order : "发起手动提现"
    withdrawal_order ||--|| statement : "一次提现绑定唯一逻辑单据"
    statement ||--o{ statement_line : "包含明细"
    withdrawal_order ||--o{ withdrawal_allocation : "锁定资金分摊"

    partner {
        string partner_id PK
    }
    withdrawal_order {
        string withdrawal_id PK
        string request_ref UK
        string partner_id FK
        decimal amount
        string withdrawal_status
    }
    statement {
        string statement_id PK
        string withdrawal_id FK
        string statement_status
        string version "同一逻辑单据的更正版本"
    }
    statement_line {
        string line_id PK
        string statement_id FK
        string source_type
        string source_id
        decimal amount
    }
    withdrawal_allocation {
        string allocation_id PK
        string withdrawal_id FK
        string commission_case_id "既有来源引用；其他来源待字段补齐"
        decimal amount
    }
```

这里的一对一是逻辑提现与逻辑结算单，版本链不新增另一张无关联单据。`withdrawal_id`唯一性及版本表的物理组织由后端回填，图中不代造复合主键。

## 3. 新资金对象与风控治理关联

对尚未冻结的基数使用关系图，不用确定的乌鸦脚表示。框中名称是当前业务逻辑对象，不是新增生产表名。

```mermaid
flowchart TB
    C["CRM客户引用<br/>customer_id"]
    COMM["佣金案件<br/>commission_case_id"]
    SET["结算案件<br/>settlement_case_id<br/>与佣金的物理基数待确认"]
    RUN["每日结算运行<br/>run_id及逐案处理结果<br/>不等于用户结算单"]
    GUAR["逐案保证金明细<br/>来源佣金及保留/释放/抵扣流水<br/>拆行和字段待补齐"]
    LED["合作者资金流水<br/>ledger_id、来源引用、方向及金额"]
    WD["提现订单与分摊<br/>withdrawal_id、allocation_id"]
    PAY["CRM付款尝试记录<br/>请求、CRM付款及外部交易引用<br/>物理主键和尝试映射待确认"]
    RISK["风险信号、风险案件及申诉<br/>各自ID、状态与证据"]
    TRI["当前案件三元组<br/>客户ID + 佣金案件ID + 结算案件ID"]
    TASK["统一任务、审批与执行<br/>task_id、approval_id、execution_id"]
    AUD["审计、规则快照与事件<br/>audit_id、规则版本、event_id"]

    C -->|"CRM事实引用"| COMM
    COMM -->|"必须可追溯；基数待评审"| SET
    RUN -->|"逐案处理记录"| SET
    COMM -->|"逐案来源，不假定拆行数量"| GUAR
    SET -->|"合格金额入余额"| LED
    GUAR -->|"获准保留、释放或抵扣"| LED
    LED -->|"可用明细分摊"| WD
    WD -->|"尝试留痕；未知先查询"| PAY
    RISK -->|"超时冻结及申诉绑定"| TRI
    TRI --> C
    TRI --> COMM
    TRI --> SET
    RISK -->|"稳定业务引用"| TASK
    WD -->|"稳定业务引用"| TASK
    TASK --> AUD
    LED --> AUD
    PAY --> AUD
```

风险案件组、集群及合作者聚合维度不构成向其他佣金的级联冻结关系。付款尝试不能因原状态未知而新增实际支付。

## 4. CRM事实、价格与信用快照关系

下图补充已有模型中的计算依据和对账引用。箭头表达数据使用关系，不代替物理外键，也不把所有风险命中直接画成扣分。

```mermaid
flowchart TB
    CRM["CRM事实源"]
    CUSTOMER["客户状态快照 customer_snapshot<br/>customer_id + snapshot_version"]
    FUND["资金事实 fund_fact<br/>fund_fact_id；external_ref + event_type<br/>客户、金额、币种、状态及到账时间"]
    TRADE["交易事实 trade_fact<br/>trade_fact_id；external_ref<br/>客户、账户、手数及交易时间"]
    QUAL["资格案件 qualification_case<br/>引用适用事实与观察结果<br/>CRM与Affiliate具体分工见SBV-12"]
    PRICE["价格快照 price_snapshot<br/>price_version + country + tier<br/>基础CPA及两段基础比例"]
    CREDIT["信用快照 credit_snapshot<br/>partner_id + credit_version<br/>积分、等级、维度分及生效期间"]
    RULE["规则版本 rule_version<br/>rule_id + version<br/>参数版本及生效期间"]
    RISK["风险事件 risk_event<br/>risk_event_id、对象、事件类型及处置"]
    POINT["信用积分流水 credit_point_ledger<br/>point_ledger_id；risk_event_id + dimension<br/>变更前、增减值、变更后及规则版本"]
    COMM["佣金案件 commission_case<br/>锁定计算所用事实、价格、信用及规则版本"]

    CRM -->|"受控同步；保留来源与版本"| CUSTOMER
    CRM -->|"到账、出金等事实"| FUND
    CRM -->|"交易事实"| TRADE
    CUSTOMER --> QUAL
    FUND --> QUAL
    TRADE --> QUAL
    QUAL -->|"按阶段及版本生成"| COMM
    PRICE -->|"计价依据"| COMM
    CREDIT -->|"信用权益依据"| COMM
    RULE -->|"适用规则引用"| QUAL
    RULE -->|"计算快照依据"| COMM
    RISK -->|"按获准传导规则记录增减"| POINT
    RULE -->|"传导规则及参数依据"| POINT
    POINT -->|"积分与等级结果可对账"| CREDIT
```

CRM客户快照不成为另一套客户事实源；各实体的实际字段类型、增量版本及物理关联由技术评审确定。质量服务结果对合作者只展示获准结果，内部理由不因模型存在而自动开放。

## 5. 关系依据与未定边界

| 关系或约束 | 来源 |
| --- | --- |
| 合作者、点击、归因、资格与佣金 | [逻辑数据模型§3.1至3.3及§5](../../技术设计/Affiliate数据模型与数据库设计说明-v0.1.md) |
| CRM事实、价格与信用快照及积分流水 | [逻辑数据模型§3.2、3.3、3.5及§5](../../技术设计/Affiliate数据模型与数据库设计说明-v0.1.md)；字段只表达已有设计，执行与权限仍待评审 |
| 提现、结算单、分摊及更正 | [接口§8A.3至8A.5](../../接口文档/Affiliate接口文档-v0.14-设计稿.md)；[文字说明§2至5](15-ER图.md) |
| 分离资金对象及状态 | [状态字典v0.4§14](../../评审资料包/基础资料/05-状态与原因码字典-v0.4.md) |
| 风险、任务、积分及审计关系 | [逻辑数据模型§3.5至3.6](../../技术设计/Affiliate数据模型与数据库设计说明-v0.1.md)；[冻结粒度决策§1A.14](../待决事项.md) |

后端/数据库评审需补SettlementCase基数、逐案保证金外键、保证金来源分摊、付款尝试与终态重试、更正版本和资金并发约束；对应SBV-18至20。上下级分润制度仍为讨论稿，本图不新增生产分润实体或金额分配关系。

