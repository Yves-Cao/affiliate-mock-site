# 09 风险传播图 Mermaid预览

版本：v0.2。日期：2026-11-12。

状态：目标设计预览，待跨岗及专业评审；不表示生产阈值、执行权限或外部能力已配置。与[文字说明](09-风险传播图.md)、[Drawio XML](09-风险传播图-Drawio.xml)及[HTML预览](静态页面/09.html)配套使用。

## 1. 事实、聚合与处置范围

```mermaid
flowchart TB
    FACT["CRM权威事实及Affiliate行为事实"] --> EVENT["客户或佣金案件风险事件<br/>保存直接R0-R3及来源版本"]
    EVENT --> LOCAL["按适用已批准规则拦截受影响自动结算<br/>继续计佣，保留原始事实"]
    EVENT --> AGG["按合作者、Sub ID、国家、活动或渠道聚合<br/>保存去重分子分母、窗口、金额及版本"]
    CLUSTER["集群识别与认定结果<br/>来自图3"] --> AGG
    AGG --> DATA{"窗口和分子分母可评估？"}
    DATA -->|否| GAP["登记缺数及补数责任<br/>不制造风险比例"]
    GAP --> AGG
    DATA -->|是| THRESHOLD{"达到适用已批准阈值？"}
    THRESHOLD -->|否| OBS["保留快照并持续观察"]
    OBS --> AGG
    THRESHOLD -->|是| TYPE{"实际命中的聚合类型"}
    TYPE -->|合作者风险客户占比超阈值| TASK["标记风险合作者<br/>生成后台事件及人工任务"]
    TYPE -->|其他聚合条件| OTHER["建立对应范围事件及任务<br/>控制仅按适用已批准规则"]
    TASK --> INVESTIGATE["风控核验来源构成、证据及逐案影响"]
    OTHER --> INVESTIGATE
    INVESTIGATE --> SCOPE{"局部可隔离？"}
    SCOPE -->|是| PLAN["提交局部处置计划"]
    SCOPE -->|否| WIDE{"跨范围证据及完整对象清单充分？"}
    WIDE -->|否| WAIT["继续调查补证<br/>不扩大限制，保留现有合法控制"]
    WAIT --> INVESTIGATE
    WIDE -->|是| WIDEPLAN["提交扩大合作者范围计划<br/>记录原因、证据及影响预览"]
    PLAN --> APPROVAL["进入08图2审批<br/>风险结论与申请审批结果分别记录"]
    WIDEPLAN --> APPROVAL
    APPROVAL -->|全部必要节点通过| EXEC["进入图2分域执行与恢复"]
    APPROVAL -->|退回| INVESTIGATE
    APPROVAL -->|驳回申请| KEEP["不执行新增处置<br/>不等于风险排除，原限制按原依据保持"]
```

聚合超阈值先形成对应对象的标记、事件和任务，不自动冻结全合作者资金。单案`settlement_overdue`始终只绑定当前客户、佣金和结算案件三元组，不因聚合扩大冻结。

## 2. 分域执行、维持限制与恢复

```mermaid
flowchart TB
    APPROVED["图1已批准的明确处置计划"] --> DOMAIN{"获批动作所属领域"}
    DOMAIN -->|信用| CREDIT["普通风险扣积分或目标等级二选一<br/>硬风险按配置组合且受上限、最低等级及去重保护"]
    CREDIT --> CREDITCHECK["沿08图3核验信用执行<br/>成功后按配置影响未来权益"]
    CREDITCHECK -->|核验执行成功| FUTURE["窗口衰减或获准人工恢复<br/>不改写历史佣金及付款"]
    DOMAIN -->|结算控制或财务任务| MONEY["仅执行获批对象及动作<br/>保留资金事实及限制ID"]
    MONEY --> VERIFY["沿08图3核验执行<br/>失败补偿，未知先查询，不重复成功子项"]
    VERIFY -->|执行成功| MAINTAIN["维持已生效限制<br/>记录恢复条件、责任及复核时间"]
    VERIFY -->|未完成| VERIFY
    MAINTAIN --> CONDITION{"恢复条件满足且具备解除申请资格？"}
    CONDITION -->|否| MAINTAIN
    CONDITION -->|是| SOURCE{"是否超时信号派生限制？"}
    SOURCE -->|是| PENDING["VIS-RISK-Q01待确认<br/>解除与申诉并发时点未定，停止自动推进"]
    SOURCE -->|否| RELEASE["提交解除指定限制申请<br/>沿08图2审批、图3执行及图4恢复"]
    RELEASE -->|退回或驳回| MAINTAIN
    RELEASE -->|执行完成| RECHECK["逐案重跑全部结算前检查<br/>实名、CRM确权、Hold、风险及缺数等"]
    RECHECK --> PASS{"全部独立门禁通过？"}
    PASS -->|否| BLOCK["保留剩余阻断及处理责任"]
    BLOCK -->|相关问题处理后| RECHECK
    PASS -->|是| ELIGIBLE["进入后续结算资格<br/>不直接入钱包或打款"]
```

风险关闭、信用恢复、限制解除和结算资格分别记录。R0-R3与C0-C4独立，C0本身不阻断结算；申诉改判、风险排除或窗口到期不直接改账。`settled`为入钱包，`paid`属于提现支付。

## 3. 集群调查与Hold到期闭环

```mermaid
flowchart TB
    INPUT["设备、IP、注册、资金及身份关联线索"] --> FEATURES{"满足两条独立有效特征<br/>或可追溯权威确权例外？"}
    FEATURES -->|否或只有弱特征| OBSERVE["仅观察及保留证据<br/>不据此标记集群或硬处置"]
    OBSERVE -->|新证据| INPUT
    FEATURES -->|是| SUSPECT["疑似集群suspected<br/>不扣分，继续计佣，阻断受影响自动结算"]
    SUSPECT --> INVESTIGATE["风控调查成员、证据独立性及影响范围"]
    INVESTIGATE --> ENOUGH{"证据足以形成认定建议？"}
    ENOUGH -->|否| SUPPLEMENT["补证或等待外部事实<br/>保留负责人及复核时间"]
    SUPPLEMENT --> INVESTIGATE
    ENOUGH -->|是| PROPOSAL["提交确认或排除建议<br/>沿08图2审批及图3执行核验"]
    PROPOSAL -->|退回或驳回申请| SUPPLEMENT
    PROPOSAL -->|确认建议获批且执行生效| CONFIRMED["认定confirmed<br/>保存成员及证据版本"]
    PROPOSAL -->|排除建议获批且执行生效| CLEARED["认定cleared<br/>保留原始事实及关系历史"]
    CONFIRMED --> PLAN["仅对获批范围执行配置处置<br/>转图1及图2，不自动处罚全部成员"]
    CLEARED --> RECOVER["按图2申请解除并全量重检<br/>不直接放行"]
    SUSPECT --> DUE["当前案件理论Hold到期或到复核时间"]
    DUE --> OVERDUE{"等待时长大于锁定冻结阈值？"}
    OVERDUE -->|是| FREEZE["交08图5逐案超时冻结<br/>不重置起算，不靠延期规避冻结"]
    OVERDUE -->|否| ACTIVE{"集群风险仍存在？"}
    ACTIVE -->|否| RECOVER
    ACTIVE -->|是| LIMIT{"适用配置允许且未达到<br/>延期次数及总天数边界？"}
    LIMIT -->|是| EXTEND["控制hold_extended<br/>按锁定配置延期并记录累计值"]
    EXTEND --> DUE
    LIMIT -->|否或配置不完整| MANUAL["控制manual_required<br/>停止自动延期，强制人工复核"]
    MANUAL --> INVESTIGATE
```

集群认定与控制状态分别保存。同源IP与IP网段不能伪作两条独立特征。延期与调查并行，不重置原Hold起算；超过冻结阈值优先进入超时流程，等于阈值时不触发超时冻结。生产特征、延期上限及各时限仍待责任方签核；SLA超时只告警升级。

## 4. 全局暂停与恢复

```mermaid
flowchart TB
    RANGE["已发现风险范围和严重度"] --> LEVEL{"可按案件或合作者范围隔离？"}
    LEVEL -->|可以| SCOPED["沿局部处置链处理<br/>保留对应案件门禁"]
    LEVEL -->|不可隔离或重大事件| PAUSE["运营发起紧急暂停流量或链接<br/>保留已有案件、资金及证据"]
    PAUSE --> RECORD["事后补齐风控、财务审核及审计"]
    RECORD --> RESTORE["运营发起恢复并提交影响评估"]
    RESTORE --> RISK{"风控确认风险解除？"}
    RISK -->|否或证据不足| WAIT["维持暂停，补证或整改<br/>记录责任与下次复核"]
    RISK -->|是| FIN{"财务确认资金及对账正常？"}
    FIN -->|否或资料不足| WAIT
    FIN -->|是| APPROVAL["按08图2及权限策略完成恢复审批<br/>其他必要专业节点仍须通过"]
    APPROVAL -->|退回或驳回| WAIT
    WAIT -->|补齐后重新提交| RESTORE
    APPROVAL -->|全部必要节点通过| EXEC["受保护执行并沿08图3核验<br/>未知先查询，仅补偿明确失败子项"]
    EXEC -->|未完成| WAITEXEC["保持未解除范围暂停<br/>保留部分成功明细并继续补偿"]
    WAITEXEC --> EXEC
    EXEC -->|成功| RESUME["受控恢复流量并持续观察<br/>不自动解除独立案件限制"]
    RESUME --> RECHECK["受影响案件沿图2逐案重检<br/>全部门禁通过才进入后续结算资格"]
```

自动审核遵循[权限审批契约第5.2节](../契约/14-角色权限与审批契约-v1.0.md)：提交时有权、配置允许、门禁通过且显式选择，才可同事务记录`SUBMIT`、`APPROVE`和`self_review=true`；未选择不得后续自审。其他必要专业节点不能由自审替代；无有权审批人则保持待审并告警。

## 5. 节点依据与待评审边界

|图块|来源|核对重点|
|---|---|---|
|图1范围及聚合|[风险统一事件契约](../01-风险风控防薅羊毛统一事件契约与数据指标-V1.0.md)、[风险工作台页面设计](../页面设计/管理端-061-risk-workbench-objects-风险对象.md)、[待决事项](../待决事项.md)|触发快照与当前值分开；扩围需要证据和明确对象清单|
|图2执行与恢复|[风险状态机第七至九节](../状态机/03-风险风控防薅羊毛状态机-V1.0.md)、[配置字典](../契约/13-配置项与参数字典-v1.0.md)、[08风险处置图](08-风险处置流程图-Mermaid预览.md)|审批不等于执行；维持限制、解除和重检分开；VIS-RISK-Q01保持待决|
|图3集群与延期|[风险状态机第六节](../状态机/03-风险风控防薅羊毛状态机-V1.0.md)、[动态Hold第4、5节](../业务规则/Affiliate动态Hold方案-v0.4.md)|疑似不扣分；认定和控制独立；达到上限转人工，超过冻结阈值不再自动延期|
|图4暂停恢复与审批|[权限审批契约第5.2、6节](../契约/14-角色权限与审批契约-v1.0.md)、[风险状态机第九节](../状态机/03-风险风控防薅羊毛状态机-V1.0.md)|运营发起，风控及财务确认，审批执行后逐案重检|

图中不填写生产阈值、特征权重、SLA或延期数值，也不以图稿核销业务待决、真实能力或专业签核。
