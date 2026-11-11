# 17 API与页面映射图

版本：v0.1预览稿  
状态：现有设计契约与证据追溯预览，待正式OpenAPI及同版实现核验；路径存在于文档不代表HTTP服务已经实现。  
配套：[文字说明](17-API与页面映射图.md)。

## 1. 页面到接口与逻辑对象

以下选取现有主契约中的关键路径，不声称覆盖全部页面/API。路径未额外补统一前缀；准确前缀及operationId待正式OpenAPI确认。

```mermaid
flowchart TB
    subgraph PAGE["页面与业务入口"]
        ACC["合作者账户与合规"]
        WD["合作者手动提现"]
        ST["合作者结算单"]
        RUN["管理端结算运行查询/调度入口"]
        AW["管理端提现核验"]
        AP["统一审批队列"]
        C360["管理端客户360"]
    end
    subgraph API["文档已有的目标接口"]
        A1["GET /accounts/{partner_id}/overview<br/>GET/PATCH /accounts/{partner_id}/profile"]
        A2["POST /withdrawals<br/>GET /withdrawals/{withdrawal_id}"]
        A3["GET /statements/{statement_id}<br/>POST /statements/{statement_id}/download"]
        A4["POST /settlements/daily/run<br/>GET /settlements/daily/runs/{run_id}"]
        A5["GET /admin/withdrawals/{id}<br/>POST /admin/withdrawals/{id}/verify"]
        A6["GET /admin/approval-queue/{id}<br/>POST /admin/approval-queue/{id}/approve"]
        A7["GET /admin/customers/{customer_id}/360"]
    end
    subgraph OBJ["主要逻辑对象与数据契约"]
        O1["CRM账户引用、资料版本及限制摘要"]
        O2["提现、唯一结算单及分摊"]
        O3["结算单版本、明细与下载任务"]
        O4["每日运行及逐案处理结果"]
        O5["核验清单、付款时间线及资金引用"]
        O6["审批记录、批准范围、对象版本及审计"]
        O7["客户、归因、案件及CRM事实引用"]
    end
    ACC --> A1 --> O1
    WD --> A2 --> O2
    ST --> A3 --> O3
    RUN --> A4 --> O4
    AW --> A5 --> O5
    AP --> A6 --> O6
    C360 --> A7 --> O7
    O2 -->|"同一withdrawal_id及statement_id"| O3
```

每日结算接口是调度/获授权管理能力，不表示合作者可以主动调用。月度结算单由自然月任务生成；提现只创建订单和分摊快照。审批动作授权与自动审核条件按最新DEC-032及OPEN-REQ-017处理，不沿用旧映射中的敏感自审拒绝作为本轮已定政策。

## 2. 专项页面与场景、测试和证据

```mermaid
flowchart TB
    TASK["统一任务队列<br/>列表、详情、草稿及提交复核"]
    RISK["风险工作台<br/>对象、事件、集群及复核请求"]
    CS["管理端客户服务<br/>工单、公开回复与内部备注"]
    TC["任务接口契约v0.1<br/>已有路径与处理包"]
    RC["风险页面数据契约v1.0<br/>已有目标路径与字段裁剪"]
    CC["客服开发契约v0.1<br/>公开/内部受众及附件规则"]
    SC["正式Schema与状态枚举<br/>未补齐部分仍待回填"]
    MOCK["同版Mock场景<br/>对象ID、版本、状态、金额及权限"]
    TEST["对应原验收编号及实际用例<br/>成功、拒绝、重复、未知、并发与恢复"]
    LOCAL["已有专项本地交付与局部测试记录"]
    GAP["待补：完整HTTP、持久化、跨端<br/>真实IAM/CRM/外部服务与完整验收"]
    FULL["相应阶段真实证据与专业签核<br/>未取得前不标全部通过"]
    TASK --> TC
    RISK --> RC
    CS --> CC
    TC --> SC
    RC --> SC
    CC --> SC
    SC --> MOCK
    MOCK --> TEST
    TEST --> LOCAL
    TEST --> GAP
    GAP --> FULL
```

第二图的连线表示应建立的追溯关系，不表示每条映射已逐项闭合。风险工作台、任务队列、客服已有局部Mock交付证据；完整AC、目标HTTP、持久化和真实外部验收仍按原专项记录追踪，不根据图中连线推定完成。

## 3. 每个写动作的验证关系

```mermaid
flowchart TB
    INTENT["页面提交业务意图"]
    AUTH{"服务端身份、对象范围与动作允许？"}
    VER{"幂等摘要、对象版本及必要前置有效？"}
    POLICY["按适用审批策略与执行条件处理"]
    RESULT["返回实际业务对象、状态与trace<br/>关联原场景、用例及证据"]
    DENY["拒绝并保留原因/审计<br/>不依赖菜单隐藏"]
    UNKNOWN["请求结果未知<br/>查询原请求，不盲目重复写"]
    INTENT --> AUTH
    AUTH -->|"否"| DENY
    AUTH -->|"是"| VER
    VER -->|"冲突或缺失"| DENY
    VER -->|"通过"| POLICY
    POLICY --> RESULT
    POLICY -->|"超时未知"| UNKNOWN
    UNKNOWN -->|"复用原业务引用核对结果"| RESULT
```

## 4. 来源及回填要求

| 图中接口/关系 | 来源 |
| --- | --- |
| A1账户资料 | [接口§6A.2](../../接口文档/Affiliate接口文档-v0.14-设计稿.md) |
| A2/A3/A4资金主链 | [接口§6A.3及§8A.2至8A.4](../../接口文档/Affiliate接口文档-v0.14-设计稿.md)，§8A优先 |
| A5/A6/A7管理端 | [接口§6B.1、§6B.2、§6B.5A](../../接口文档/Affiliate接口文档-v0.14-设计稿.md) |
| TC/RC/CC专项契约 | [任务接口](../../接口文档/Affiliate任务队列页面接口契约-v0.1.md)、[风险接口](../../接口文档/Affiliate风险工作台页面数据契约-v1.0.md)、[客服契约](../../接口文档/Affiliate管理端客户服务开发契约-v0.1.md) |
| SC/MOCK/TEST/LOCAL/GAP | [现有映射的状态声明](../研发准备/Mock与接口/Affiliate管理端OpenAPI与Mock映射-v0.6.md)、[全量测试矩阵](../测试验收/Affiliate全量测试用例矩阵-v0.1.md)、[证据总表§4至5](../核验/Affiliate原型与Mock评审证据总表-v0.1.md) |
| 写操作的权限、幂等与版本 | [生命周期规范§2至4A、§8](../../接口文档/Affiliate-API幂等重试超时与生命周期规范-v0.2.md)；[DEC-032](../../需求文档/09-决策与待确认事项-v0.1.md) |

最终逐项映射仍需关联当前路由、原需求/AC编号、准确operationId、Schema版本、Mock场景、实际用例和执行结果。旧tag到当前页面重映射、幂等Header命名差异及资金新增场景由前后端和测试确认；本图不新增虚构编号或统一Header结论。

