# 08 风险处置流程图 Mermaid预览

版本：v0.2；更新日期：2026-11-12。

状态：目标设计图稿，待跨岗评审；不代表生产处置授权或功能已实现。

[文字说明](08-风险处置流程图.md) · [Drawio XML](08-风险处置流程图-Drawio.xml) · [HTML预览](静态页面/08.html)。五张子图与XML五页一一对应，审批、执行和解除以同一案件、申请和限制ID衔接。旧稿见[版本留档](../../归档/风控流程图-2026-11-12/README.md)。

## 1. 识别、调查与风险结论

```mermaid
flowchart TB
    FACT["CRM事实与Affiliate行为事实"] --> DATA{"数据及证据可用？"}
    DATA -->|关键缺数或冲突| GAP["保留已有计佣结果与事实<br/>仅阻断受影响自动结算并建补数任务"]
    DATA -->|可用| RULE["识别硬规则、疑似信号和R0-R3<br/>保留来源与规则版本"]
    RULE --> HIT{"命中适用规则？"}
    HIT -->|否| OBS["持续观察<br/>后续新增事实重新评估"]
    HIT -->|是| SCOPE["定位客户、佣金及结算案件<br/>按已批准保护规则控制受影响范围"]
    SCOPE --> TASK["生成或复用调查任务<br/>计佣继续，疑似不等于风险确认"]
    GAP --> TASK
    TASK --> INVEST["风控认领、核验反证与影响范围"]
    INVEST --> ENOUGH{"证据和影响预览完整？"}
    ENOUGH -->|否| WAIT["补数、补证或等待外部事实<br/>保存责任人及下次复核时间"]
    WAIT -->|事实补齐或到复核时间| INVEST
    WAIT -.-> SLA["SLA超时仅告警升级<br/>不自动批准、解冻或关闭"]
    ENOUGH -->|是| PROPOSE{"拟提交的风险结论"}
    PROPOSE -->|确认风险| CONFIRM["拟确认风险及逐项处置计划"]
    PROPOSE -->|排除风险| EXCLUDE["拟排除风险及限制影响评估"]
    CONFIRM --> APPROVAL["转图2：提交结论及动作申请<br/>保存证据、范围和预览版本"]
    EXCLUDE --> APPROVAL
    APPROVAL -.-> SEPARATE["申请被驳回不等于风险被排除<br/>生效结论以批准及执行记录为准"]
```

CRM原始事实不可被Affiliate风险结论覆盖；R0-R3风险档与C0-C4信用等级独立。无足够计算事实时保留已有计佣结果、等待补数，不虚构佣金。

## 2. 审批与自审门禁

```mermaid
flowchart TB
    REQUEST["来自图1、图4或图5的明确申请<br/>结论、动作、对象清单及影响预览"] --> VALID{"权限、状态、版本和策略有效？"}
    VALID -->|否| REVISE["拒绝提交或重新预览<br/>修订后重新校验"]
    REVISE --> REQUEST
    VALID -->|是| SELF{"提交时配置允许且有当前动作审批权限<br/>并显式选择自动审核？"}
    SELF -->|是| TX["同事务记录SUBMIT和APPROVE<br/>applicant_id=approver_id，self_review=true"]
    TX --> AUDIT{"事务与两条审计均成功？"}
    AUDIT -->|否| ROLLBACK["整个事务失败<br/>不产生批准或执行，修复后重提"]
    ROLLBACK --> REQUEST
    AUDIT -->|是| NEXT["进入尚未完成的必要审批节点"]
    SELF -->|否| MANUAL["按策略进入有权人员审批<br/>申请人不得事后审批同一对象"]
    MANUAL --> REVIEWER{"有其他有权审批人？"}
    REVIEWER -->|否| PENDING["保持待审并告警<br/>补齐有权角色后继续"]
    PENDING --> REVIEWER
    REVIEWER -->|是| NEXT
    NEXT --> RESULT{"当前必要节点审批结果"}
    RESULT -->|退回补充| REVISE
    RESULT -->|驳回申请| REJECT["记录申请驳回原因<br/>不执行新增动作，不改判原风险结论"]
    RESULT -->|通过或已无剩余节点| ALL{"全部必要专业节点完成？"}
    ALL -->|否| NEXT
    ALL -->|是| EXEC["转图3：受保护执行获批计划<br/>仅限批准对象、动作及版本"]
```

自审按[权限审批契约§5.2](../契约/14-角色权限与审批契约-v1.0.md)执行。自审不替代其他风控、合规、财务等必要专业节点；具体动作权限与配置仍须按正式策略核验。驳回的是本次申请，已有独立限制继续按原依据生效。

## 3. 执行、未知结果与补偿

```mermaid
flowchart TB
    APPROVED["来自图2：全部必要节点已批准"] --> GUARD{"批准快照、状态及执行范围仍有效？"}
    GUARD -->|否| REAPPROVE["重新预览并转图2重审<br/>禁止静默扩大范围"]
    GUARD -->|是| EXEC["按原幂等键执行获批未完成子项<br/>成功项不重复，保留逐项执行记录"]
    EXEC --> RESULT{"查询到的执行结果"}
    RESULT -->|未知或无可靠回执| QUERY["查询原execution_id及原请求<br/>禁止盲目重发资金动作"]
    QUERY -->|仍未知| ALERT["保持待查并告警升级<br/>等待可靠回执或人工核实"]
    ALERT --> QUERY
    QUERY -->|结果已查明| RESULT
    RESULT -->|明确失败或部分成功| SPLIT["保留成功子项<br/>列明失败、未执行及结果未知子项"]
    SPLIT --> UNKNOWN{"仍有结果未知子项？"}
    UNKNOWN -->|有| QUERY
    UNKNOWN -->|无| RETRYABLE{"未完成子项符合原批准和重试条件？"}
    RETRYABLE -->|是| RETRY["仅重试确认可重试的失败子项<br/>未执行项经核验后执行，成功项不重复"]
    RETRY --> RESULT
    RETRYABLE -->|否| HANDLE["保持未完成并建人工补偿任务<br/>变更动作或范围须转图2重审"]
    HANDLE -->|补偿方案获批后| GUARD
    RESULT -->|全部成功或无需执行| VERIFY["核对事实结果、审计与剩余限制<br/>分别更新风险结论及执行状态"]
    VERIFY --> MATCH{"结果与批准内容一致且全部完成？"}
    MATCH -->|否| HANDLE
    MATCH -->|是| TYPE{"执行计划类型"}
    TYPE -->|施加或维持处置| KEEP["限制按原依据持续生效<br/>恢复条件具备后转图4"]
    TYPE -->|解除指定限制| RECHECK["转图4：解除成功后的全量结算重检"]
    TYPE -->|无资金限制动作| CLOSE["核对后续任务及相关申诉<br/>全部终结后关闭，保留历史"]
```

“结果未知”是核实分支，不新增生产状态枚举。部分成功不得按整单失败重放；冲正或追索通过关联财务案件处理，不修改历史流水。任务关闭须有服务端执行证据。

## 4. 解除限制与结算重检

```mermaid
flowchart TB
    ENTRY["风险排除、集群纠错、窗口恢复<br/>或处置后恢复条件出现"] --> LIMIT["逐项列出待解除限制ID<br/>核对原依据、证据和其他独立阻断"]
    LIMIT --> READY{"对应解除条件满足？"}
    READY -->|否| KEEP["维持仍有效限制<br/>记录责任人与下次复核条件"]
    KEEP -->|条件或事实更新| LIMIT
    READY -->|是| OVERDUE{"是否涉及超时信号派生冻结？"}
    OVERDUE -->|是| TIMING["VIS-RISK-Q01待联合确认<br/>解除与申诉窗口并发时点未定，停在此处"]
    OVERDUE -->|否| APPLY["提出解除指定限制的申请<br/>转图2审批、图3执行及结果核验"]
    APPLY -->|仅解除执行成功后| CHECKS["重检Hold、风险与调查、集群、关键缺数<br/>CRM确权、实名及其他全部结算门禁"]
    CHECKS --> PASS{"全部结算前检查通过？"}
    PASS -->|否| BLOCK["保留其余阻断与逐项处理责任<br/>等待事实补齐或独立限制合法解除"]
    BLOCK -->|条件变化后| CHECKS
    PASS -->|是| ELIGIBLE["进入后续自动结算资格<br/>settled仅表示入钱包，不等于提现paid"]
    ELIGIBLE --> CLOSE{"必要执行、后续任务及相关申诉均终结？"}
    CLOSE -->|否| WAIT["保留未完成事项<br/>不因资金资格恢复而直接关闭案件"]
    WAIT -->|事项完成后| CLOSE
    CLOSE -->|是| END["服务端关闭对应任务或案件<br/>保留限制、审批、执行及重检历史"]
```

解除的是指定限制，不豁免其他门禁。图3的“解除成功”返回本图全量重检节点；本图不是解除即支付的快捷链。超时派生冻结不沿普通解除分支绕过待决时点。

## 5. 超时冻结与申诉复核

```mermaid
flowchart TB
    START["当前结算案件等待时长严格大于配置冻结阈值<br/>等于阈值不触发"] --> FREEZE["仅冻结当前三元组<br/>customer_id + commission_case_id + settlement_case_id"]
    FREEZE --> SIGNAL["生成settlement_overdue信号和任务<br/>不连带其他案件、客户或整批"]
    SIGNAL --> HIDDEN["信号待处理、调查或待审批时<br/>隐藏申诉入口，接口拒绝创建"]
    HIDDEN --> PROPOSE["转图1调查、图2审批及图3执行<br/>提出信号确认或驳回建议"]
    PROPOSE --> EFFECT{"已生效的信号结论"}
    EFFECT -->|未形成结论或申请被驳回| HIDDEN
    EFFECT -->|信号确认| HOLD["维持当前案件冻结<br/>进入逐案处置与复核"]
    EFFECT -->|信号驳回生效| GATE{"服务端校验申诉开关、窗口及剩余次数"}
    GATE -->|不满足| UNAVAILABLE["入口关闭，显示有限原因和下一步<br/>信号驳回不自动解冻"]
    GATE -->|满足| SUBMIT["提交当前结算案件申诉<br/>创建时再次校验资格与幂等"]
    SUBMIT --> CREATED{"成功创建新申诉？"}
    CREATED -->|失败或幂等重复| NOCOUNT["不新增次数<br/>重复请求返回原申诉，失败可按资格重试"]
    NOCOUNT -->|新的有效提交| GATE
    CREATED -->|是| COUNT["按settlement_case_id累计一次<br/>独立申诉进入复核"]
    COUNT --> REVIEW{"材料及复核结论"}
    REVIEW -->|待补充| SUPPLEMENT["补充材料并保留原申诉ID<br/>不另计次数、不重置窗口"]
    SUPPLEMENT --> REVIEW
    REVIEW -->|维持原决定| UPHELD["记录upheld及有限解释<br/>原有效限制继续按依据执行"]
    REVIEW -->|改判| OVERTURNED["记录overturned和原决定引用<br/>形成影响评估及必要动作申请"]
    OVERTURNED --> ACTION{"改判影响是否涉及解除限制？"}
    ACTION -->|涉及解除| RELEASEGATE["先转图4检查解除门禁<br/>满足条件才可申请、审批和执行解除"]
    RELEASEGATE --> TIMING["VIS-RISK-Q01待决边界<br/>超时解除与申诉并发时点确认前停在此处"]
    ACTION -->|其他必要动作| REQUIRED["转图2必要审批及图3执行核验<br/>仅处理获准的非解除动作"]
    UNAVAILABLE -.-> TIMING
    HOLD -.-> TIMING
    UPHELD --> CLOSE["相关复核、必要执行和通知终结后<br/>关闭申诉，风险任务另按自身条件关闭"]
    REQUIRED -->|相关复核与必要动作终结后| CLOSE
```

补证超时只告警或升级，不凭SLA自动判维持、改判、解冻或关闭。窗口到期及次数用尽不自动解除冻结。申诉改判只产生影响评估和获准动作，历史决定、资金及审计记录保留。

## 6. 依据与核对范围

| 内容 | 当前依据 | 保留边界 |
| --- | --- | --- |
| 信号、案件、任务、审批、执行、申诉各自状态 | [风险状态机§4至9](../状态机/03-风险风控防薅羊毛状态机-V1.0.md) | 申请驳回与风险排除不同；未知结果是查证分支 |
| 事件、影响范围、幂等与补偿 | [风险统一事件契约](../01-风险风控防薅羊毛统一事件契约与数据指标-V1.0.md) | 事实、结论、动作分离，生产能力待核验 |
| 提交时自审与专业节点 | [权限审批契约§5.2](../契约/14-角色权限与审批契约-v1.0.md) | 双审计同事务；未选自审不得事后自审 |
| 动态Hold与严格超时 | [动态Hold方案](../业务规则/Affiliate动态Hold方案-v0.4.md) | 取对应生效配置，不能用延期规避超时冻结 |
| 页面、预览与受保护执行 | [风险对象页面](../页面设计/管理端-061-risk-workbench-objects-风险对象.md)、[数据契约](../接口文档/Affiliate风险工作台页面数据契约-v1.0.md) | 页面不是最终执行或资金事实源 |
| 超时解除时点 | [VIS-RISK-Q01](../待决事项.md)、[服务蓝图核验台账](核验/服务蓝图核验台账.md) | 未确认前停止对应解除分支 |

阈值、SLA、真实接口和执行能力沿原专业评审核验；本次只补齐已有规则的流程表达。
