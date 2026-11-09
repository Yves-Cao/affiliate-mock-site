(() => {
  const column = (key, label, options = {}) => ({key, label, ...options});
  const tab = (id, title, entity, description, columns, options = {}) => ({
    id, title, entity, description, columns,
    statuses: options.statuses || ["active", "pending", "draft", "returned"],
    type: options.type || "配置",
    ...options
  });

  const configTabs = [
    tab("overview", "配置总览", "配置域", "跟踪全部配置域的版本、审批和生效状态。", [
      column("name", "配置域"), column("status", "状态"), column("version", "当前版本"),
      column("owner", "责任角色"), column("updated", "更新时间"), column("impact", "影响范围")
    ], {statuses: ["active", "inactive", "voided", "activation_failed"], profile:"config-overview", panel:"config-overview"}),
    tab("price", "价格表", "价格规则", "维护国家、渠道和资格档价格版本。", [
      column("name", "价格规则"), column("country", "国家"), column("status", "状态"),
      column("version", "版本"), column("amount", "基础CPA"), column("owner", "责任角色"), column("updated", "更新时间")
    ], {profile:"price", panel:"price"}),
    tab("qualification", "资格档与里程碑", "资格规则", "配置L1-L4、FTD、有效FTD和质量服务里程碑。", [
      column("name", "资格规则"), column("stage", "里程碑"), column("status", "状态"),
      column("progress", "达标阈值", {unit:"%"}), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"qualification", panel:"qualification"}),
    tab("quality-service", "质量服务规则", "质量服务", "配置有效FTD后的活跃度、观察期、留存和质量服务达标条件。", [
      column("name", "质量规则"), column("stage", "阶段"), column("status", "状态"),
      column("progress", "达标阈值"), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"quality-service"}),
    tab("credit-benefit", "信用等级与权益", "信用权益", "维护C0-C4权益、附加比例和个人加成。", [
      column("name", "信用权益"), column("stage", "等级"), column("status", "状态"),
      column("amount", "权益值"), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"credit", panel:"credit"}),
    tab("partner-tier", "合作者等级与个人附加", "合作者等级", "配置合作时间、客户数量和等级权益；P1扩展功能。", [
      column("name", "等级规则"), column("stage", "等级"), column("status", "状态"),
      column("progress", "达标条件"), column("amount", "个人附加"), column("owner", "责任角色")
    ], {profile:"partner-tier"}),
    tab("hold", "动态结算", "结算期规则", "配置基础结算期、国家附加、支付方式附加和D+N冻结。", [
      column("name", "结算期规则"), column("country", "国家"), column("status", "状态"),
      column("progress", "天数", {unit:"天"}), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"hold", panel:"hold"}),
    tab("d-plus-n", "D+N与熔断护栏", "冻结护栏", "配置结算超时冻结、统一隔离、自动放行和数量金额熔断。", [
      column("name", "护栏规则"), column("type", "触发类型"), column("status", "状态"),
      column("progress", "阈值"), column("impact", "处置"), column("owner", "责任角色")
    ], {profile:"d-plus-n"}),
    tab("guarantee-tax", "保证金/税费", "资金规则", "维护保证金比例、释放周期、税率和手续费口径。", [
      column("name", "资金规则"), column("type", "类型"), column("status", "状态"),
      column("amount", "金额/比例"), column("version", "版本"), column("owner", "责任角色")
    ], {type:"资金", profile:"guarantee-tax", panel:"guarantee-tax"}),
    tab("settlement-withdrawal", "结算与提现规则", "结算提现", "配置结算资格、提现校验、扣除顺序和异常处理。", [
      column("name", "资金规则"), column("type", "规则类型"), column("status", "状态"),
      column("progress", "阈值"), column("impact", "处理方式"), column("owner", "责任角色")
    ], {type:"资金", profile:"settlement-withdrawal"}),
    tab("country-entity", "国家与主体", "国家主体", "维护开放国家、法律主体和合规限制。", [
      column("name", "国家主体"), column("country", "国家"), column("status", "状态"),
      column("owner", "责任角色"), column("impact", "许可范围"), column("updated", "更新时间")
    ], {profile:"country-entity"}),
    tab("approval", "审批流", "审批流", "配置审批节点、角色、自审和SLA。", [
      column("name", "审批流"), column("stage", "节点"), column("status", "状态"),
      column("owner", "审批角色"), column("due", "SLA"), column("version", "版本")
    ], {profile:"approval", panel:"approval"}),
    tab("simulation", "试算结果", "试算任务", "查看新旧规则差异、命中量和资金影响。", [
      column("name", "试算任务"), column("status", "状态"), column("progress", "完成度"),
      column("amount", "资金影响"), column("owner", "创建人"), column("updated", "执行时间")
    ], {statuses:["success","processing","blocked","failed"], profile:"simulation", panel:"simulation"}),
    tab("cluster-rule", "集群规则", "集群规则", "配置强特征、普通特征、窗口和人工上限。", [
      column("name", "集群规则"), column("type", "特征"), column("status", "状态"),
      column("progress", "阈值", {unit:"个"}), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"cluster-rule"}),
    tab("hard-rule", "硬规则", "硬规则", "维护官方路径、点击风险、黑名单和实时拦截。", [
      column("name", "硬规则"), column("type", "规则类型"), column("status", "状态"),
      column("impact", "处置"), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"hard-rule", panel:"hard-rule"}),
    tab("risk-score", "风险评分规则", "评分规则", "维护风险事件、权重、R档和处置映射。", [
      column("name", "评分规则"), column("stage", "R档"), column("status", "状态"),
      column("progress", "权重", {unit:"%"}), column("amount", "分值", {format:"score"}), column("owner", "责任角色")
    ], {profile:"risk-score"}),
    tab("violation-rule", "违规规则", "违规规则", "配置违规类型、认定条件、证据和处理动作。", [
      column("name", "违规规则"), column("type", "违规类型"), column("status", "状态"),
      column("impact", "处理动作"), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"violation-rule"}),
    tab("risk-propagation", "合作者风险传导", "风险传导", "配置客户风险向合作者信用与结算权益传导的条件和动作。", [
      column("name", "传导规则"), column("source", "风险来源"), column("status", "状态"),
      column("progress", "触发条件"), column("impact", "传导动作"), column("owner", "责任角色")
    ], {profile:"risk-propagation"}),
    tab("data-governance", "数据治理规则", "数据治理", "配置数据分级、保留删除、事件质量和Breach响应规则。", [
      column("name", "治理规则"), column("type", "规则类型"), column("status", "状态"),
      column("progress", "期限/阈值"), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"data-governance"}),
    tab("official-content", "官方路径治理", "内容治理", "配置系统生成的官方路径、落地页适用范围和上下线规则；素材由素材管理菜单维护。", [
      column("name", "内容规则"), column("country", "国家"), column("status", "状态"),
      column("type", "内容类型"), column("version", "版本"), column("owner", "责任角色")
    ], {profile:"official-content"}),
  ];

  const systemConfigTabs = [
    tab("system", "系统配置", "系统配置", "管理平台运行、连接、通知、展示和运维参数；系统配置不进入业务规则配置。", [
      column("name", "系统参数"), column("domain", "配置域"), column("value", "当前值"),
      column("status", "状态"), column("owner", "责任角色"), column("updated", "更新时间")
    ], {statuses:["active","disabled"], type:"系统", profile:"system-config"})
  ];

  const riskTabs = [
    tab("hard-hit", "硬规则命中", "命中事实", "查看官方路径违规、点击风险和实时拦截事实。", [
      column("name", "命中事实"), column("type", "规则"), column("status", "处理状态"),
      column("source", "对象"), column("risk", "风险"), column("updated", "命中时间"), column("linked", "影响链路")
    ], {statuses: ["blocked", "pending_review", "false_positive", "confirmed"], type: "识别"}),
    tab("risk-event", "风险事件与评分", "风险事件", "跟踪风险事件、分值变化和R档结果。", [
      column("name", "风险事件"), column("type", "事件类型"), column("stage", "R档"),
      column("amount", "事件分"), column("risk", "风险"), column("status", "状态"), column("updated", "发生时间")
    ], {statuses: ["confirmed", "pending_review", "auto_expired", "rejected"]}),
    tab("credit-insight", "信用积分与等级", "信用对象", "查看合作方或客户信用积分、等级和证据。", [
      column("name", "信用对象"), column("stage", "等级"), column("amount", "积分"),
      column("progress", "等级距离"), column("status", "状态"), column("linked", "证据")
    ], {statuses: ["active", "pending_review", "downgraded", "locked"]}),
    tab("cluster", "集群识别", "集群", "查看设备、IP、支付工具和行为集群。", [
      column("name", "集群"), column("type", "特征组合"), column("progress", "客户数"),
      column("amount", "影响金额"), column("status", "状态"), column("linked", "关系图")
    ], {statuses: ["suspected", "confirmed", "cleared", "manual_required"]}),
    tab("violation", "违规事件", "违规事件", "查看违规事实、证据完整度和处理建议。", [
      column("name", "违规事件"), column("type", "违规类型"), column("status", "状态"),
      column("risk", "风险"), column("owner", "处理人"), column("updated", "确认时间")
    ], {statuses: ["pending_review", "confirmed", "appealing", "closed"]}),
    tab("fraud", "CRM欺诈库", "欺诈引用", "查看CRM欺诈库结论和本地引用状态。", [
      column("name", "欺诈引用"), column("source", "CRM引用"), column("stage", "CRM等级"),
      column("status", "状态"), column("updated", "同步时间"), column("linked", "影响对象")
    ], {statuses: ["high", "medium", "low", "no_hit"]})
  ];

  const reviewTabs = [
    tab("risk-review", "风险复核", "复核任务", "处理风险、案件组、调查和隔离复核任务。", [
      column("name", "复核任务"), column("type", "任务类型"), column("priority", "优先级"),
      column("status", "状态"), column("owner", "处理人"), column("due", "SLA"), column("amount", "影响金额")
    ], {statuses: ["pending", "processing", "waiting_external", "pending_approval", "closed"], type: "处理"}),
    tab("credit-level", "信用调级", "调级申请", "处理临时调级、续期、提前终止和恢复异常。", [
      column("name", "调级申请"), column("stage", "目标等级"), column("status", "状态"),
      column("due", "到期时间"), column("owner", "申请人"), column("amount", "权益影响")
    ], {statuses: ["pending_approval", "active", "expired", "restore_failed"]}),
    tab("cluster-hold", "集群结算延长", "延长任务", "处理集群结算延长和强制人工任务。", [
      column("name", "延长任务"), column("source", "集群"), column("progress", "延长次数"),
      column("due", "到期时间"), column("status", "状态"), column("amount", "影响金额")
    ], {statuses: ["pending", "approved", "manual_required", "released"]}),
    tab("d-plus-n", "D+N冻结", "冻结案件", "处理D+N阈值触发、复核和重检任务。", [
      column("name", "冻结案件"), column("source", "来源"), column("progress", "等待天数"),
      column("status", "状态"), column("amount", "阻塞金额"), column("owner", "处理人")
    ], {statuses: ["frozen", "pending_review", "released", "chargeback"]}),
    tab("appeal", "申诉处理", "申诉", "处理合作方申诉、补材料和改判补发。", [
      column("name", "申诉"), column("source", "申诉对象"), column("status", "状态"),
      column("due", "截止时间"), column("owner", "处理人"), column("impact", "诉求")
    ], {statuses: ["pending", "supplementing", "pending_approval", "overturned", "rejected"]}),
    tab("guarantee-offset", "保证金抵扣", "抵扣任务", "处理保证金抵扣、追索和账务重算。", [
      column("name", "抵扣任务"), column("type", "损失类型"), column("amount", "抵扣金额"),
      column("status", "状态"), column("owner", "处理人"), column("linked", "关联损失")
    ], {statuses: ["pending", "pending_approval", "executed", "reconcile_failed"]}),
    tab("cap-breaker", "上限与熔断", "上限任务", "处理数量上限、突变熔断和人工复核。", [
      column("name", "上限任务"), column("country", "国家"), column("progress", "用量"),
      column("status", "状态"), column("due", "复核窗口"), column("amount", "影响金额")
    ], {statuses: ["warning", "exceeded", "manual_hold", "released"]}),
    tab("integration", "集成任务", "集成任务", "处理事件缺数、归因自检、回调和技术失败。", [
      column("name", "集成任务"), column("type", "任务类型"), column("status", "状态"),
      column("source", "来源系统"), column("due", "SLA"), column("linked", "关联事件")
    ], {statuses: ["failed", "retrying", "processing", "success", "cancelled"]})
  ];

  const performanceTabs = [
    tab("roi", "合作方ROI", "ROI维度", "分析合作方、国家和Sub ID的转化与净成本。", [
      column("name", "维度"), column("country", "国家"), column("progress", "有效FTD"),
      column("amount", "已付佣金"), column("impact", "净ROI"), column("risk", "风险"), column("status", "建议")
    ], {statuses: ["scale_up", "observe", "limit", "review"], type: "报表"}),
    tab("quality", "质量看板", "质量维度", "监控转化质量、留存、拒付、冲正和集群风险。", [
      column("name", "维度"), column("progress", "有效FTD"), column("amount", "质量服务"),
      column("impact", "留存率"), column("risk", "风险"), column("status", "等级")
    ], {statuses: ["a", "b", "c", "watch"], type: "报表"}),
    tab("guarantee-coverage", "保证金覆盖", "覆盖维度", "监控保证金覆盖率、释放延迟和潜在损失。", [
      column("name", "维度"), column("amount", "保证金"), column("impact", "覆盖率"),
      column("progress", "潜在损失"), column("status", "状态"), column("risk", "风险")
    ], {statuses: ["safe", "warning", "shortfall", "delayed"], type: "报表"})
  ];

  const workbenchTabs = [
    tab("tasks", "仪表盘", "业务总览", "查看业务快照、待处理任务、资金与异常。", [
      column("name", "任务"), column("type", "任务类型"), column("status", "状态"),
      column("priority", "优先级"), column("owner", "当前处理角色"), column("due", "SLA"),
      column("amount", "影响金额"), column("linked", "关联对象")
    ], {statuses:["pending","processing","pending_approval","waiting_external","failed"], type:"任务", profile:"workbench"})
  ];

  window.AFF_ADMIN_PROTOTYPE = {
    version: "admin-prototype-v0.36",
    dataSource: {
      name: "Affiliate Admin API",
      updatedAt: "2026-11-05 17:30",
      status: "synced"
    },
    roles: {
      operations: "运营", risk: "风控", risk_supervisor: "风控主管", finance: "财务",
      compliance: "合规", system_admin: "系统管理员", audit: "审计只读"
    },
    scenarios: {
      normal: "正常", loading: "Loading", empty: "空数据", error: "错误", forbidden: "无权限"
    },
    workbenchQueues: [
      {id:"mine", title:"我的任务"},
      {id:"approvals", title:"待审批"},
      {id:"overdue", title:"超时任务"},
      {id:"integrations", title:"集成失败"},
      {id:"all", title:"全部任务"}
    ],
    auditRecords: [
      {id:"audit-9001", time:"2026-11-05 09:28", action:"配置审批", object:"官方路径库 v6", operator:"合规/Compliance", result:"approved", trace_id:"trace-workbench-001", self_review:false},
      {id:"audit-9002", time:"2026-11-05 09:12", action:"案件组拆分", object:"case-group-001", operator:"风控主管", result:"approved", trace_id:"trace-workbench-002", self_review:false},
      {id:"audit-9003", time:"2026-11-05 08:56", action:"隔离解除", object:"quar-001", operator:"风控/Risk", result:"released", trace_id:"trace-workbench-003", self_review:false},
      {id:"audit-9004", time:"2026-11-05 08:41", action:"异步导出", object:"客户数据", operator:"运营/Ops", result:"processing", trace_id:"trace-workbench-004", self_review:false},
      {id:"audit-9005", time:"2026-11-05 08:20", action:"保证金抵扣审批", object:"guar-2201", operator:"财务/Finance", result:"approved", trace_id:"trace-workbench-005", self_review:true},
      {id:"audit-9006", time:"2026-11-05 07:58", action:"集成重试", object:"event-gap-406", operator:"系统/Tech", result:"retrying", trace_id:"trace-workbench-006", self_review:false},
      {id:"audit-9007", time:"2026-11-04 18:36", action:"staging签核", object:"staging-run-002", operator:"合规/Compliance", result:"approved", trace_id:"trace-workbench-007", self_review:false},
      {id:"audit-9008", time:"2026-11-04 17:45", action:"价格草稿提交", object:"TH price v7", operator:"运营/Ops", result:"pending_approval", trace_id:"trace-workbench-008", self_review:false}
    ],
    notifications: [
      {id:"notice-1001",type:"approval",severity:"danger",title:"3个配置审批即将超时",detail:"官方路径库和价格表草稿将在2小时后超时。",time:"2026-11-05 10:45",route:"admin-workbench",tab:"tasks",unread:true},
      {id:"notice-1002",type:"integration",severity:"danger",title:"CRM注册事件回调失败",detail:"连续失败5次，已生成集成任务并暂停相关佣金自动结算。",time:"2026-11-05 10:31",route:"admin-workbench",tab:"tasks",unread:true},
      {id:"notice-1003",type:"risk",severity:"warning",title:"新合作方基线置信度低",detail:"partner-9001样本不足，使用国家/渠道基线并提高复核优先级。",time:"2026-11-05 09:58",route:"admin-risk",tab:"risk-event",unread:true},
      {id:"notice-1004",type:"staging",severity:"warning",title:"staging缺少合规签核",detail:"自动化链路已通过，资金对账差异为0，但合规角色尚未签核。",time:"2026-11-05 09:36",route:"admin-config",tab:"simulation",unread:true},
      {id:"notice-1005",type:"export",severity:"info",title:"异步导出已生成",detail:"客户数据导出已脱敏，文件24小时后过期。",time:"2026-11-05 09:20",route:"admin-review",tab:"integration",unread:false},
      {id:"notice-1006",type:"guarantee",severity:"warning",title:"保证金覆盖率下降",detail:"TH维度覆盖率为108%，低于120%安全线。",time:"2026-11-05 08:55",route:"admin-performance",tab:"guarantee-coverage",unread:false}
    ],
    notificationOutbox: [
      {id:"OUTBOX-1001",notificationId:"notice-1001",eventKey:"approval.sla.warning:cfg-v70",channel:"in_app",status:"sent",attempts:1,lastAttemptAt:"2026-11-05 10:45",error:null},
      {id:"OUTBOX-1001-MAIL",notificationId:"notice-1001",eventKey:"approval.sla.warning:cfg-v70",channel:"email",status:"sent",attempts:1,lastAttemptAt:"2026-11-05 10:45",error:null},
      {id:"OUTBOX-1002",notificationId:"notice-1002",eventKey:"crm.callback.failed:CRM-REG",channel:"in_app",status:"sent",attempts:1,lastAttemptAt:"2026-11-05 10:31",error:null},
      {id:"OUTBOX-1002-MAIL",notificationId:"notice-1002",eventKey:"crm.callback.failed:CRM-REG",channel:"email",status:"failed",attempts:3,lastAttemptAt:"2026-11-05 10:32",error:"SMTP_TIMEOUT"},
      {id:"OUTBOX-1003",notificationId:"notice-1003",eventKey:"risk.baseline.low:partner-9001",channel:"in_app",status:"sent",attempts:1,lastAttemptAt:"2026-11-05 09:58",error:null}
    ],
    releasePackages: [
      {
        id:"release-3001",name:"D1-D3跨切面配置包",status:"pending_approval",version:"v7.0",owner:"产品/风控",
        effectiveTime:"2026-11-06 10:00",previousVersion:"v6.4",impactAmount:48600,
        domains:["流量画像门禁","官方路径库","点击风险规则"],
        signoffs:[],blockedReason:"",
        simulation:{hitCount:186,falsePositive:7,blocked:false,fundImpact:48600,summary:"命中186个对象，误伤提示7个，未触发护栏阻断。"},
        diffs:[
          {domain:"流量画像门禁",current:"开启；5个必填字段",next:"开启；5个必填字段 + 关闭需审计",impact:"首个链接门禁更明确"},
          {domain:"官方路径库",current:"42条启用路径",next:"47条启用路径；5条下线",impact:"未入库目标不可生成"},
          {domain:"点击风险规则",current:"4类确定性规则",next:"6类确定性规则 + 参数版本",impact:"新增代理与重复点击过滤"}
        ],
        timeline:[
          {time:"2026-11-05 09:20",action:"创建发布包",actor:"产品",result:"draft"},
          {time:"2026-11-05 09:36",action:"组合校验",actor:"系统",result:"success"},
          {time:"2026-11-05 09:45",action:"组合试算",actor:"系统",result:"success"},
          {time:"2026-11-05 09:52",action:"提交审批",actor:"风控",result:"pending_approval"}
        ]
      },
      {
        id:"release-3002",name:"价格与资格档调整包",status:"approved",version:"v8.0",owner:"业务/财务",
        effectiveTime:"2026-11-07 22:00",previousVersion:"v7.8",impactAmount:91200,
        domains:["价格表","资格档与里程碑"],signoffs:["risk_supervisor","finance"],blockedReason:"",
        simulation:{hitCount:326,falsePositive:12,blocked:false,fundImpact:91200,summary:"L2-L4阈值上调后，预计成本上升9.6%。"},
        diffs:[
          {domain:"价格表",current:"TH/ID基准价",next:"TH/ID/PH新基准价",impact:"新客户按新价格锁定"},
          {domain:"资格档与里程碑",current:"L1-L4旧阈值",next:"L2-L4阈值上调",impact:"低质量转化减少"}
        ],
        timeline:[
          {time:"2026-11-05 08:20",action:"创建发布包",actor:"业务",result:"draft"},
          {time:"2026-11-05 08:45",action:"组合试算",actor:"系统",result:"success"},
          {time:"2026-11-05 09:10",action:"提交审批",actor:"财务",result:"pending_approval"}
        ]
      },
      {
        id:"release-3003",name:"动态结算与D+N调整包",status:"scheduled",version:"v5.2",owner:"风控/财务",
        effectiveTime:"2026-11-06 02:00",previousVersion:"v5.0",impactAmount:27400,
        domains:["动态结算","D+N阈值"],signoffs:["risk_supervisor","finance","compliance"],blockedReason:"",
        simulation:{hitCount:142,falsePositive:3,blocked:false,fundImpact:27400,summary:"R2/R3理论结算延长，D+N保持后台配置。"},
        diffs:[
          {domain:"动态结算",current:"R2=7天；R3=15天",next:"R2=9天；R3=18天",impact:"理论到期日后移"},
          {domain:"D+N阈值",current:"N=30天",next:"N=35天",impact:"冻结触发时间后移"}
        ],
        timeline:[
          {time:"2026-11-04 16:10",action:"三方签核完成",actor:"风控/财务/合规",result:"approved"},
          {time:"2026-11-04 16:30",action:"定时生效",actor:"系统管理员",result:"scheduled"}
        ]
      },
      {
        id:"release-3004",name:"官方路径库紧急修复包",status:"active",version:"v6.4",owner:"合规/系统",
        effectiveTime:"2026-11-04 20:00",previousVersion:"v6.3",impactAmount:15800,
        domains:["官方路径库","硬规则"],signoffs:["risk_supervisor","compliance"],blockedReason:"",
        simulation:{hitCount:98,falsePositive:1,blocked:false,fundImpact:15800,summary:"修复5条失效路径并补齐来源校验。"},
        diffs:[
          {domain:"官方路径库",current:"47条启用路径",next:"42条启用路径",impact:"5条失效路径下线"},
          {domain:"硬规则",current:"来源校验警告",next:"来源校验拦截",impact:"无效来源不计有效点击"}
        ],
        timeline:[
          {time:"2026-11-04 19:40",action:"审批通过",actor:"风控主管/合规",result:"approved"},
          {time:"2026-11-04 20:00",action:"生效",actor:"系统",result:"active"}
        ]
      },
      {
        id:"release-3005",name:"信用权益组合包",status:"activation_failed",version:"v4.1",owner:"系统",
        effectiveTime:"2026-11-04 21:00",previousVersion:"v4.0",impactAmount:36900,
        domains:["信用等级与权益","保证金/税费"],signoffs:["risk_supervisor","finance"],blockedReason:"依赖的税率外部快照超时，发布包整体回滚。",
        simulation:{hitCount:214,falsePositive:9,blocked:true,fundImpact:36900,summary:"试算通过但生效时外部税率快照超时。"},
        diffs:[
          {domain:"信用等级与权益",current:"C0-C4旧附加",next:"C1-C4附加上调",impact:"权益成本上升"},
          {domain:"保证金/税费",current:"税费快照v3",next:"税费快照v4",impact:"税费计算依赖外部系统"}
        ],
        timeline:[
          {time:"2026-11-04 20:40",action:"审批通过",actor:"风控主管/财务",result:"approved"},
          {time:"2026-11-04 21:00",action:"生效失败",actor:"系统",result:"activation_failed"}
        ]
      }
    ],
    riskCases: [
      {
        id:"risk-case-5001",name:"同设备/IP集群案件组",status:"investigating",riskLevel:"high",
        partner:"partner-1001",features:["同设备指纹","同IP段","支付工具关联"],confidence:0.92,
        groupConclusion:"pending",splitCandidate:"client-2102",
        investigation:{status:"materials_requested",responseSlaHours:72,reminderHours:[24,48,60],maxDurationDays:14,linkRestriction:"new_links",materials:["流量来源截图","广告账号权限"]},
        quarantine:{status:"active",sourceType:"case_group",sourceRef:"risk-case-5001",blockedSince:"2026-11-01 10:00",waitingDays:4,amount:45000,recheck:"not_run"},
        members:[
          {clientId:"client-2003",device:"DEV-A17",ip:"203.0.113.24/29",payment:"PAY-8842",commissionId:"comm-3002",amount:21000,memberStatus:"in_group",commissionStatus:"holding"},
          {clientId:"client-2101",device:"DEV-A17",ip:"203.0.113.31/29",payment:"PAY-8842",commissionId:"comm-3003",amount:12000,memberStatus:"in_group",commissionStatus:"manual_review"},
          {clientId:"client-2102",device:"DEV-C44",ip:"198.51.100.77",payment:"PAY-9013",commissionId:"comm-3006",amount:12000,memberStatus:"mis_merged",commissionStatus:"holding"}
        ],
        graphNodes:[
          {x:90,y:55,label:"partner-1001",type:"合作方"},{x:80,y:205,label:"DEV-A17",type:"设备"},
          {x:300,y:35,label:"IP段 203.0.113",type:"网络"},{x:520,y:60,label:"PAY-8842",type:"支付"},
          {x:510,y:205,label:"3笔佣金",type:"资金"}
        ],
        timeline:[
          {time:"2026-11-01 09:50",action:"识别中心生成集群",actor:"规则 v3",result:"suspected"},
          {time:"2026-11-01 10:00",action:"自动进入统一隔离",actor:"系统",result:"frozen"},
          {time:"2026-11-02 15:20",action:"发起调查并要求材料",actor:"风控/Risk",result:"investigating"}
        ]
      },
      {
        id:"risk-case-5002",name:"异常流量来源案件组",status:"group_confirmed",riskLevel:"medium",
        partner:"partner-1004",features:["来源不匹配","注册集中","素材关联"],confidence:0.84,
        groupConclusion:"confirmed",splitCandidate:null,
        investigation:{status:"under_review",responseSlaHours:48,reminderHours:[24],maxDurationDays:10,linkRestriction:"none",materials:["投放说明"]},
        quarantine:{status:"released",sourceType:"investigation",sourceRef:"risk-case-5002",blockedSince:"2026-10-25 08:00",waitingDays:0,amount:16800,recheck:"passed"},
        members:[
          {clientId:"client-2201",device:"DEV-B22",ip:"203.0.113.80/29",payment:"PAY-7712",commissionId:"comm-3201",amount:8600,memberStatus:"in_group",commissionStatus:"settled"},
          {clientId:"client-2202",device:"DEV-B23",ip:"203.0.113.81/29",payment:"PAY-7713",commissionId:"comm-3202",amount:8200,memberStatus:"in_group",commissionStatus:"holding"}
        ],
        graphNodes:[
          {x:85,y:70,label:"partner-1004",type:"合作方"},{x:90,y:200,label:"素材 LP-22",type:"素材"},
          {x:305,y:40,label:"点击来源异常",type:"流量"},{x:515,y:75,label:"2笔佣金",type:"资金"},
          {x:500,y:205,label:"活动 C-88",type:"活动"}
        ],
        timeline:[
          {time:"2026-10-25 08:00",action:"生成案件组",actor:"识别中心",result:"confirmed"},
          {time:"2026-10-28 11:00",action:"人工确认组结论",actor:"风控主管",result:"group_confirmed"},
          {time:"2026-10-30 09:00",action:"隔离解除并重检通过",actor:"风控/Risk",result:"released"}
        ]
      },
      {
        id:"risk-case-5003",name:"支付工具关联案件组",status:"manual_required",riskLevel:"high",
        partner:"partner-9001",features:["同支付工具","低置信基线","行为相似"],confidence:0.68,
        groupConclusion:"pending",splitCandidate:"client-2303",
        investigation:{status:"escalated",responseSlaHours:24,reminderHours:[12,20],maxDurationDays:7,linkRestriction:"all_links",materials:["支付工具说明","客户授权材料"]},
        quarantine:{status:"active",sourceType:"investigation",sourceRef:"risk-case-5003",blockedSince:"2026-10-20 12:00",waitingDays:16,amount:32600,recheck:"not_run"},
        members:[
          {clientId:"client-2301",device:"DEV-D11",ip:"203.0.113.120/29",payment:"PAY-6602",commissionId:"comm-3301",amount:12000,memberStatus:"in_group",commissionStatus:"manual_review"},
          {clientId:"client-2302",device:"DEV-D12",ip:"203.0.113.121/29",payment:"PAY-6602",commissionId:"comm-3302",amount:10600,memberStatus:"in_group",commissionStatus:"holding"},
          {clientId:"client-2303",device:"DEV-E90",ip:"198.51.100.10",payment:"PAY-1188",commissionId:"comm-3303",amount:10000,memberStatus:"mis_merged",commissionStatus:"holding"}
        ],
        graphNodes:[
          {x:90,y:60,label:"partner-9001",type:"合作方"},{x:80,y:200,label:"行为相似",type:"行为"},
          {x:305,y:35,label:"低置信基线",type:"基线"},{x:520,y:65,label:"PAY-6602",type:"支付"},
          {x:505,y:205,label:"3笔佣金",type:"资金"}
        ],
        timeline:[
          {time:"2026-10-20 12:00",action:"进入人工处理",actor:"识别中心",result:"manual_required"},
          {time:"2026-10-21 09:00",action:"调查超时升级",actor:"风控主管",result:"escalated"}
        ]
      }
    ],
    partner360: {
      stages: [
        {id:"applying",label:"申请中",hint:"提交资料等待初审"},
        {id:"reviewing",label:"审核中",hint:"资质与风险审核"},
        {id:"onboarded",label:"已入驻",hint:"正常合作与计佣"},
        {id:"watching",label:"观察/暂停",hint:"风险观察或暂停计佣"},
        {id:"offboarding",label:"清退中",hint:"终止合作的结算与归档"},
        {id:"archived",label:"已归档",hint:"合作终止完成归档"}
      ],
      views: [
        {id:"all",label:"全部",hint:"全生命周期视图"},
        {id:"onboarding",label:"入驻",hint:"申请/审核中阶段"},
        {id:"kyc",label:"认证",hint:"KYC/KYB同步状态"},
        {id:"offboarding",label:"清退",hint:"清退中与已归档"},
        {id:"notes",label:"备注",hint:"跟进记录时间线"}
      ],
      kycStatusLabels: {verified:"已认证",pending:"同步中",failed:"认证失败",expired:"已过期",sync_failed:"同步异常",not_required:"不适用"},
      materialsCatalog: ["营业执照","法人证件","地址证明","银行账户证明","流量来源说明","W-8BEN税务表","渠道代理协议"],
      partners: [
        {id:"partner-1001",name:"Golden Link Media",type:"机构合作方",country:"TH",stage:"onboarded",status:"active",risk:"low",owner:"运营/Ops",ownerRole:"operations",amount:184600,updated:"2026-11-05 09:40",kyc:{status:"verified",syncAt:"2026-10-12 10:20",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-12 10:20",source:"CRM"},credit:{grade:"C2",score:720,adjustable:false},performance:{clicks:41200,validFtd:186,commission:184600,qualityGrade:"A",roi:1.32},crmId:"crm-pt-88210"},
        {id:"partner-1002",name:"APAC Traffic Lab",type:"渠道代理",country:"ID",stage:"onboarded",status:"active",risk:"medium",owner:"运营/Ops",ownerRole:"operations",amount:96300,updated:"2026-11-05 08:55",kyc:{status:"verified",syncAt:"2026-10-03 14:10",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-03 14:10",source:"CRM"},credit:{grade:"C1",score:640,adjustable:false},performance:{clicks:32800,validFtd:102,commission:96300,qualityGrade:"B",roi:1.08},crmId:"crm-pt-88211"},
        {id:"partner-1003",name:"Northline Affiliates",type:"机构合作方",country:"MY",stage:"offboarding",status:"processing",risk:"low",owner:"合规/Compliance",ownerRole:"compliance",amount:143200,updated:"2026-11-04 16:20",kyc:{status:"verified",syncAt:"2026-09-28 09:30",source:"CRM"},kyb:{status:"verified",syncAt:"2026-09-28 09:30",source:"CRM"},credit:{grade:"C2",score:690,adjustable:false},performance:{clicks:28600,validFtd:141,commission:143200,qualityGrade:"A",roi:1.21},crmId:"crm-pt-88212",offboard:{reason:"协商终止",initiatedBy:"合规/Compliance",initiatedAt:"2026-11-02 11:00",currentStep:3,guaranteeHeld:9800,timeline:[{step:1,label:"发起清退",time:"2026-11-02 11:00",state:"done",actor:"合规/Compliance",note:"协商终止协议已签署"},{step:2,label:"推广链接下线",time:"2026-11-02 11:35",state:"done",actor:"系统/Tech",note:"18条链接停止投放；点击保留404兜底"},{step:3,label:"最终结算生成",time:"2026-11-03 10:10",state:"doing",actor:"财务/Finance",note:"10月结算批次锁定；结算中余额转入清退单"},{step:4,label:"保证金审批",time:"",state:"pending",actor:"财务/Finance",note:"保留保证金 9,800 USD 待审批（跳转资金组处理）"},{step:5,label:"资料归档",time:"",state:"pending",actor:"系统/Tech",note:"CRM资料转归档区；保留期365天"},{step:6,label:"清退完成",time:"",state:"pending",actor:"系统/Tech",note:"状态置为已归档"}]}},
        {id:"partner-1004",name:"Meridian KOL",type:"个人合作方",country:"TH",stage:"watching",status:"processing",risk:"medium",owner:"风控/Risk",ownerRole:"risk",amount:47800,updated:"2026-11-05 07:30",kyc:{status:"verified",syncAt:"2026-10-18 16:45",source:"CRM"},kyb:{status:"not_required",syncAt:"-",source:"CRM"},credit:{grade:"C1",score:610,adjustable:true},performance:{clicks:15400,validFtd:47,commission:47800,qualityGrade:"C",roi:0.88},crmId:"crm-pt-88213",watchReason:"流量来源与申报渠道不符，观察期内暂停质量服务附加"},
        {id:"partner-1005",name:"Bright Bridge Digital",type:"机构合作方",country:"VN",stage:"onboarded",status:"active",risk:"low",owner:"运营/Ops",ownerRole:"operations",amount:78900,updated:"2026-11-04 18:10",kyc:{status:"verified",syncAt:"2026-10-06 11:15",source:"CRM"},kyb:{status:"pending",syncAt:"2026-11-04 08:00",source:"CRM"},credit:{grade:"C1",score:655,adjustable:false},performance:{clicks:22100,validFtd:83,commission:78900,qualityGrade:"B",roi:1.12},crmId:"crm-pt-88214"},
        {id:"partner-1006",name:"Sultan Media Group",type:"机构合作方",country:"ID",stage:"reviewing",status:"pending_review",risk:"medium",owner:"运营/Ops",ownerRole:"operations",amount:0,updated:"2026-11-05 09:05",kyc:{status:"pending",syncAt:"2026-11-05 06:30",source:"CRM"},kyb:{status:"failed",syncAt:"2026-11-04 22:10",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88215",onboard:{submittedAt:"2026-11-04 15:40",materials:[{name:"营业执照",state:"submitted"},{name:"法人证件",state:"submitted"},{name:"地址证明",state:"missing"},{name:"银行账户证明",state:"submitted"},{name:"流量来源说明",state:"returned"}],autoReviewEligible:false,note:"KYB认证失败：企业注册号与CRM档案不一致，需人工核对"}},
        {id:"partner-1007",name:"Riverstone Partners",type:"渠道代理",country:"PH",stage:"applying",status:"pending",risk:"normal",owner:"运营/Ops",ownerRole:"operations",amount:0,updated:"2026-11-05 08:20",kyc:{status:"pending",syncAt:"2026-11-05 08:20",source:"CRM"},kyb:{status:"pending",syncAt:"2026-11-05 08:20",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88216",onboard:{submittedAt:"2026-11-05 08:20",materials:[{name:"营业执照",state:"submitted"},{name:"法人证件",state:"submitted"},{name:"银行账户证明",state:"submitted"}],autoReviewEligible:true,note:"申请材料齐全，可自动预审"}},
        {id:"partner-1008",name:"Zenith Affiliates",type:"机构合作方",country:"TH",stage:"onboarded",status:"active",risk:"low",owner:"运营/Ops",ownerRole:"operations",amount:112400,updated:"2026-11-03 14:00",kyc:{status:"verified",syncAt:"2026-09-20 13:20",source:"CRM"},kyb:{status:"verified",syncAt:"2026-09-20 13:20",source:"CRM"},credit:{grade:"C3",score:780,adjustable:false},performance:{clicks:35700,validFtd:129,commission:112400,qualityGrade:"A",roi:1.26},crmId:"crm-pt-88217"},
        {id:"partner-1009",name:"Orchid Lane Media",type:"个人合作方",country:"MY",stage:"applying",status:"pending",risk:"normal",owner:"运营/Ops",ownerRole:"operations",amount:0,updated:"2026-11-05 06:45",kyc:{status:"pending",syncAt:"2026-11-05 06:45",source:"CRM"},kyb:{status:"not_required",syncAt:"-",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88218",onboard:{submittedAt:"2026-11-05 06:45",materials:[{name:"法人证件",state:"submitted"},{name:"地址证明",state:"submitted"},{name:"流量来源说明",state:"submitted"}],autoReviewEligible:false,note:"个人合作方；无KYB要求"}},
        {id:"partner-1010",name:"Delta Wave Digital",type:"机构合作方",country:"ZA",stage:"reviewing",status:"pending_review",risk:"low",owner:"合规/Compliance",ownerRole:"compliance",amount:0,updated:"2026-11-05 05:10",kyc:{status:"verified",syncAt:"2026-11-02 09:00",source:"CRM"},kyb:{status:"pending",syncAt:"2026-11-03 07:40",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88219",onboard:{submittedAt:"2026-11-03 07:40",materials:[{name:"营业执照",state:"submitted"},{name:"法人证件",state:"submitted"},{name:"地址证明",state:"submitted"},{name:"银行账户证明",state:"submitted"},{name:"W-8BEN税务表",state:"missing"}],autoReviewEligible:true,note:"KYC已通过；待W-8BEN税务表后可自动审核"}},
        {id:"partner-1011",name:"Coral Sands Trading",type:"渠道代理",country:"NG",stage:"archived",status:"closed",risk:"high",owner:"合规/Compliance",ownerRole:"compliance",amount:0,updated:"2026-10-20 12:00",kyc:{status:"expired",syncAt:"2026-09-15 08:30",source:"CRM"},kyb:{status:"verified",syncAt:"2026-09-15 08:30",source:"CRM"},credit:{grade:"C0",score:420,adjustable:false},performance:null,crmId:"crm-pt-88220",offboard:{reason:"违规终止",initiatedBy:"风控主管",initiatedAt:"2026-09-28 10:00",currentStep:6,guaranteeHeld:0,timeline:[{step:1,label:"发起清退",time:"2026-09-28 10:00",state:"done",actor:"风控主管",note:"虚假流量违规，案件组结论已确认"},{step:2,label:"推广链接下线",time:"2026-09-28 10:05",state:"done",actor:"系统/Tech",note:"全部链接立即下线"},{step:3,label:"最终结算生成",time:"2026-09-30 09:00",state:"done",actor:"财务/Finance",note:"违规佣金清零；合法部分结算"},{step:4,label:"保证金审批",time:"2026-10-08 14:30",state:"done",actor:"财务/Finance",note:"保证金全额抵扣违规损失"},{step:5,label:"资料归档",time:"2026-10-18 16:40",state:"done",actor:"系统/Tech",note:"保留期365天；取证材料转入合规档案"},{step:6,label:"清退完成",time:"2026-10-20 12:00",state:"done",actor:"系统/Tech",note:"状态置为已归档"}]}},
        {id:"partner-1012",name:"Emerald Reach",type:"机构合作方",country:"TH",stage:"onboarded",status:"active",risk:"normal",owner:"运营/Ops",ownerRole:"operations",amount:56200,updated:"2026-11-04 11:25",kyc:{status:"verified",syncAt:"2026-10-08 10:00",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-08 10:00",source:"CRM"},credit:{grade:"C1",score:660,adjustable:false},performance:{clicks:18900,validFtd:61,commission:56200,qualityGrade:"B",roi:1.05},crmId:"crm-pt-88221"},
        {id:"partner-1013",name:"Harbor Line Media",type:"渠道代理",country:"VN",stage:"watching",status:"processing",risk:"high",owner:"风控/Risk",ownerRole:"risk",amount:38900,updated:"2026-11-05 06:00",kyc:{status:"sync_failed",syncAt:"2026-11-04 20:15",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-15 12:00",source:"CRM"},credit:{grade:"C0",score:480,adjustable:true},performance:{clicks:16700,validFtd:39,commission:38900,qualityGrade:"D",roi:0.64},crmId:"crm-pt-88222",watchReason:"集群风险案件组关联（risk-case-5003）；KYC同步异常跳集成任务处理"},
        {id:"partner-1014",name:"Silver Fox Affiliates",type:"个人合作方",country:"ID",stage:"onboarded",status:"active",risk:"low",owner:"运营/Ops",ownerRole:"operations",amount:43100,updated:"2026-11-02 17:45",kyc:{status:"verified",syncAt:"2026-10-22 08:50",source:"CRM"},kyb:{status:"not_required",syncAt:"-",source:"CRM"},credit:{grade:"C2",score:700,adjustable:false},performance:{clicks:12300,validFtd:58,commission:43100,qualityGrade:"A",roi:1.35},crmId:"crm-pt-88223"},
        {id:"partner-1015",name:"Terra Nova Ads",type:"机构合作方",country:"MY",stage:"reviewing",status:"returned",risk:"medium",owner:"运营/Ops",ownerRole:"operations",amount:0,updated:"2026-11-04 19:30",kyc:{status:"pending",syncAt:"2026-11-04 09:10",source:"CRM"},kyb:{status:"pending",syncAt:"2026-11-04 09:10",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88224",onboard:{submittedAt:"2026-11-03 16:00",materials:[{name:"营业执照",state:"returned"},{name:"法人证件",state:"submitted"},{name:"地址证明",state:"submitted"},{name:"银行账户证明",state:"missing"},{name:"流量来源说明",state:"submitted"}],autoReviewEligible:false,note:"营业执照区域与申报国家不一致，已退回修正；等待重新提交"}},
        {id:"partner-1016",name:"Aurora Click Co.",type:"渠道代理",country:"PH",stage:"onboarded",status:"active",risk:"normal",owner:"运营/Ops",ownerRole:"operations",amount:61500,updated:"2026-11-05 04:20",kyc:{status:"verified",syncAt:"2026-10-30 11:05",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-30 11:05",source:"CRM"},credit:{grade:"C1",score:645,adjustable:false},performance:{clicks:20100,validFtd:66,commission:61500,qualityGrade:"B",roi:1.10},crmId:"crm-pt-88225"},
        {id:"partner-1017",name:"Mistral Growth",type:"机构合作方",country:"TH",stage:"offboarding",status:"processing",risk:"medium",owner:"财务/Finance",ownerRole:"finance",amount:87400,updated:"2026-11-05 03:15",kyc:{status:"verified",syncAt:"2026-09-10 14:25",source:"CRM"},kyb:{status:"verified",syncAt:"2026-09-10 14:25",source:"CRM"},credit:{grade:"C1",score:600,adjustable:false},performance:{clicks:19800,validFtd:74,commission:87400,qualityGrade:"C",roi:0.92},crmId:"crm-pt-88226",offboard:{reason:"主体迁移",initiatedBy:"运营/Ops",initiatedAt:"2026-11-04 09:30",currentStep:2,guaranteeHeld:12400,timeline:[{step:1,label:"发起清退",time:"2026-11-04 09:30",state:"done",actor:"运营/Ops",note:"主体迁移至新法律实体；历史数据不迁移"},{step:2,label:"推广链接下线",time:"2026-11-04 10:00",state:"doing",actor:"系统/Tech",note:"22条链接切换至新主体白名单"},{step:3,label:"最终结算生成",time:"",state:"pending",actor:"财务/Finance",note:"11月结算批次锁定后生成清退单"},{step:4,label:"保证金审批",time:"",state:"pending",actor:"财务/Finance",note:"保留保证金 12,400 USD 待审批（跳转资金组处理）"},{step:5,label:"资料归档",time:"",state:"pending",actor:"系统/Tech",note:"旧主体资料归档；新主体重新入驻"},{step:6,label:"清退完成",time:"",state:"pending",actor:"系统/Tech",note:"状态置为已归档"}]}},
        {id:"partner-1018",name:"Lotus Peak Media",type:"机构合作方",country:"VN",stage:"onboarded",status:"active",risk:"low",owner:"运营/Ops",ownerRole:"operations",amount:93800,updated:"2026-11-03 09:55",kyc:{status:"verified",syncAt:"2026-10-01 15:35",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-01 15:35",source:"CRM"},credit:{grade:"C2",score:710,adjustable:false},performance:{clicks:27400,validFtd:97,commission:93800,qualityGrade:"A",roi:1.18},crmId:"crm-pt-88227"},
        {id:"partner-1019",name:"Falcon Crest Ads",type:"个人合作方",country:"ID",stage:"archived",status:"closed",risk:"normal",owner:"运营/Ops",ownerRole:"operations",amount:0,updated:"2026-10-05 10:00",kyc:{status:"expired",syncAt:"2026-09-28 08:00",source:"CRM"},kyb:{status:"not_required",syncAt:"-",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88228",offboard:{reason:"协商终止",initiatedBy:"运营/Ops",initiatedAt:"2026-09-20 11:00",currentStep:6,guaranteeHeld:0,timeline:[{step:1,label:"发起清退",time:"2026-09-20 11:00",state:"done",actor:"运营/Ops",note:"合作方主动退出计划"},{step:2,label:"推广链接下线",time:"2026-09-20 11:10",state:"done",actor:"系统/Tech",note:"9条链接下线"},{step:3,label:"最终结算生成",time:"2026-09-22 09:30",state:"done",actor:"财务/Finance",note:"9月结算已结清"},{step:4,label:"保证金审批",time:"2026-09-25 14:00",state:"done",actor:"财务/Finance",note:"保证金全额释放"},{step:5,label:"资料归档",time:"2026-10-02 16:00",state:"done",actor:"系统/Tech",note:"资料转入归档区"},{step:6,label:"清退完成",time:"2026-10-05 10:00",state:"done",actor:"系统/Tech",note:"状态置为已归档"}]}},
        {id:"partner-1020",name:"Ironwood Digital",type:"机构合作方",country:"TH",stage:"watching",status:"processing",risk:"medium",owner:"风控/Risk",ownerRole:"risk",amount:71600,updated:"2026-11-05 02:40",kyc:{status:"verified",syncAt:"2026-10-25 09:15",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-25 09:15",source:"CRM"},credit:{grade:"C1",score:620,adjustable:true},performance:{clicks:24300,validFtd:88,commission:71600,qualityGrade:"C",roi:0.95},crmId:"crm-pt-88229",watchReason:"转化质量连续两周下滑，观察质量服务指标"},
        {id:"partner-1021",name:"Pacific Rim KOL",type:"个人合作方",country:"PH",stage:"onboarded",status:"active",risk:"normal",owner:"运营/Ops",ownerRole:"operations",amount:34700,updated:"2026-11-04 15:05",kyc:{status:"verified",syncAt:"2026-10-28 13:45",source:"CRM"},kyb:{status:"not_required",syncAt:"-",source:"CRM"},credit:{grade:"C1",score:635,adjustable:false},performance:{clicks:9800,validFtd:45,commission:34700,qualityGrade:"B",roi:1.15},crmId:"crm-pt-88230"},
        {id:"partner-1022",name:"Vantage Point Media",type:"机构合作方",country:"MY",stage:"applying",status:"pending",risk:"low",owner:"运营/Ops",ownerRole:"operations",amount:0,updated:"2026-11-04 21:10",kyc:{status:"pending",syncAt:"2026-11-04 21:10",source:"CRM"},kyb:{status:"pending",syncAt:"2026-11-04 21:10",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88231",onboard:{submittedAt:"2026-11-04 21:10",materials:[{name:"营业执照",state:"submitted"},{name:"法人证件",state:"submitted"},{name:"地址证明",state:"submitted"},{name:"银行账户证明",state:"submitted"},{name:"W-8BEN税务表",state:"submitted"},{name:"渠道代理协议",state:"submitted"}],autoReviewEligible:true,note:"材料齐全且KYC同步通过，命中自动审核条件"}},
        {id:"partner-1023",name:"Stone Harbor Ads",type:"渠道代理",country:"VN",stage:"onboarded",status:"active",risk:"low",owner:"运营/Ops",ownerRole:"operations",amount:49300,updated:"2026-11-03 16:30",kyc:{status:"verified",syncAt:"2026-10-14 10:40",source:"CRM"},kyb:{status:"verified",syncAt:"2026-10-14 10:40",source:"CRM"},credit:{grade:"C2",score:680,adjustable:false},performance:{clicks:17600,validFtd:52,commission:49300,qualityGrade:"A",roi:1.22},crmId:"crm-pt-88232"},
        {id:"partner-1024",name:"Willow Creek KOL",type:"个人合作方",country:"TH",stage:"watching",status:"processing",risk:"medium",owner:"风控/Risk",ownerRole:"risk",amount:22800,updated:"2026-11-04 13:20",kyc:{status:"failed",syncAt:"2026-11-01 09:50",source:"CRM"},kyb:{status:"not_required",syncAt:"-",source:"CRM"},credit:{grade:"C0",score:505,adjustable:false},performance:{clicks:8200,validFtd:24,commission:22800,qualityGrade:"C",roi:0.98},crmId:"crm-pt-88233",watchReason:"KYC认证失败（证件过期）；暂停计佣等待补件"},
        {id:"partner-1025",name:"Granite Peak Partners",type:"机构合作方",country:"ID",stage:"offboarding",status:"processing",risk:"high",owner:"合规/Compliance",ownerRole:"compliance",amount:110500,updated:"2026-11-04 08:45",kyc:{status:"verified",syncAt:"2026-09-05 10:30",source:"CRM"},kyb:{status:"verified",syncAt:"2026-09-05 10:30",source:"CRM"},credit:{grade:"C0",score:430,adjustable:false},performance:{clicks:26800,validFtd:96,commission:110500,qualityGrade:"D",roi:0.58},crmId:"crm-pt-88234",offboard:{reason:"违规终止",initiatedBy:"风控主管",initiatedAt:"2026-11-01 14:00",currentStep:4,guaranteeHeld:26000,timeline:[{step:1,label:"发起清退",time:"2026-11-01 14:00",state:"done",actor:"风控主管",note:"多层违规叠加；关联案件组risk-case-5001"},{step:2,label:"推广链接下线",time:"2026-11-01 14:02",state:"done",actor:"系统/Tech",note:"全部链接立即下线"},{step:3,label:"最终结算生成",time:"2026-11-02 09:15",state:"done",actor:"财务/Finance",note:"违规佣金冻结；合法部分进入结算"},{step:4,label:"保证金审批",time:"2026-11-04 08:45",state:"doing",actor:"财务/Finance",note:"保留保证金 26,000 USD 抵扣审批中（跳转资金组处理）"},{step:5,label:"资料归档",time:"",state:"pending",actor:"系统/Tech",note:"取证材料保留1095天"},{step:6,label:"清退完成",time:"",state:"pending",actor:"系统/Tech",note:"状态置为已归档"}]}},
        {id:"partner-1026",name:"Bluejay Media House",type:"机构合作方",country:"MY",stage:"archived",status:"closed",risk:"normal",owner:"运营/Ops",ownerRole:"operations",amount:0,updated:"2026-10-12 09:00",kyc:{status:"expired",syncAt:"2026-09-30 10:15",source:"CRM"},kyb:{status:"verified",syncAt:"2026-09-30 10:15",source:"CRM"},credit:{grade:"C0",score:500,adjustable:false},performance:null,crmId:"crm-pt-88235",offboard:{reason:"协商终止",initiatedBy:"运营/Ops",initiatedAt:"2026-09-25 15:00",currentStep:6,guaranteeHeld:0,timeline:[{step:1,label:"发起清退",time:"2026-09-25 15:00",state:"done",actor:"运营/Ops",note:"业务方向调整退出"},{step:2,label:"推广链接下线",time:"2026-09-25 15:30",state:"done",actor:"系统/Tech",note:"14条链接下线"},{step:3,label:"最终结算生成",time:"2026-09-28 10:00",state:"done",actor:"财务/Finance",note:"结清全部佣金"},{step:4,label:"保证金审批",time:"2026-10-01 11:20",state:"done",actor:"财务/Finance",note:"保证金全额释放"},{step:5,label:"资料归档",time:"2026-10-10 14:00",state:"done",actor:"系统/Tech",note:"资料转入归档区"},{step:6,label:"清退完成",time:"2026-10-12 09:00",state:"done",actor:"系统/Tech",note:"状态置为已归档"}]}}
      ],
      noteTemplates: [
        {id:"note-5001",partnerId:"partner-1001",time:"2026-11-04 16:20",author:"运营/Ops",type:"沟通",content:"季度复盘会议：Q4配额上调至240单已确认；素材交付排期同步。",nextFollowUp:"2026-12-01"},
        {id:"note-5002",partnerId:"partner-1004",time:"2026-11-03 10:15",author:"风控/Risk",type:"风险",content:"观察期第9天：流量来源说明已补交，待下周质量服务指标复核。",nextFollowUp:"2026-11-10"},
        {id:"note-5003",partnerId:"partner-1006",time:"2026-11-05 09:05",author:"运营/Ops",type:"沟通",content:"KYB企业注册号不一致已通知补件；审核截止48小时。",nextFollowUp:"2026-11-07"},
        {id:"note-5004",partnerId:"partner-1013",time:"2026-11-04 20:30",author:"系统/Tech",type:"风险",content:"KYC同步连续失败3次，已生成集成任务int-801；归因等待CRM侧恢复。",nextFollowUp:"-"},
        {id:"note-5005",partnerId:"partner-1015",time:"2026-11-04 19:30",author:"合规/Compliance",type:"素材",content:"营业执照区域不符已退回；合作方确认重新提交预计11-06。",nextFollowUp:"2026-11-06"},
        {id:"note-5006",partnerId:"partner-1003",time:"2026-11-04 16:20",author:"财务/Finance",type:"结算",content:"清退最终结算批次已锁定；保证金9,800 USD转资金组审批流程。",nextFollowUp:"-"}
      ]
    },
    client360: {
      lifecycleStages: [
        {id:"registered",label:"已注册",hint:"注册完成未入金"},
        {id:"ftd",label:"FTD",hint:"首次入金完成"},
        {id:"valid_ftd",label:"有效FTD",hint:"达到有效FTD标准"},
        {id:"churned",label:"流失",hint:"90日无交易"}
      ],
      views: [
        {id:"all",label:"全部",hint:"全量客户视图"},
        {id:"risk",label:"风险",hint:"高风险客户筛选"},
        {id:"valid",label:"有效FTD",hint:"有效转化客户"}
      ],
      riskGradeLabels: {R0:"R0 无风险",R1:"R1 低风险",R2:"R2 中风险",R3:"R3 高风险",R4:"R4 严重"},
      clients: [
        {id:"client-2001",name:"Somchai W.",partnerId:"partner-1001",country:"TH",stage:"valid_ftd",ftdAmount:1200,risk:"R1",rGrade:"R1",source:"TikTok-TH",attribution:{channel:"官方落地页",linkId:"lnk-4001",subId:"TikTok-TH",attributedAt:"2026-10-12 09:15",rule:"首点击归因"},commissionTotal:860,updated:"2026-11-04 14:20",crmId:"crm-cl-31001",riskProfile:{rGrade:"R1",riskEvents:["rev-evt-2114（同IP多账户注册，已排除）"],devices:["DEV-A31F·2客户共用（同宿舍WiFi，已核实）"],ips:["27.145.x.x（TH住宅IP）"],payments:["VISA*4291（本人卡）"],fraudRefs:["无欺诈库命中"],conclusion:"低风险；首入金正常"}},
        {id:"client-2002",name:"Nguyen T.A.",partnerId:"partner-1002",country:"VN",stage:"ftd",ftdAmount:500,risk:"R2",rGrade:"R2",source:"YouTube-ID",attribution:{channel:"注册直链",linkId:"lnk-4002",subId:"YouTube-ID",attributedAt:"2026-10-18 16:40",rule:"首点击归因"},commissionTotal:210,updated:"2026-11-03 11:05",crmId:"crm-cl-31002",riskProfile:{rGrade:"R2",riskEvents:["rev-evt-2207（入金后快速出金，观察中）"],devices:["DEV-B7C2·唯一设备"],ips:["113.161.x.x（VN住宅IP）"],payments:["Neteller（第三方钱包）"],fraudRefs:["crm-fraud-1120（相似行为模式，弱引用）"],conclusion:"中风险；入金出金间隔48小时，持续观察"}},
        {id:"client-2003",name:"Ahmad F.",partnerId:"partner-1001",country:"ID",stage:"valid_ftd",ftdAmount:2000,risk:"R1",rGrade:"R1",source:"Telegram-MY",attribution:{channel:"官方落地页",linkId:"lnk-4001",subId:"Telegram-MY",attributedAt:"2026-10-05 10:30",rule:"首点击归因"},commissionTotal:1450,updated:"2026-11-05 08:50",crmId:"crm-cl-31003",riskProfile:{rGrade:"R1",riskEvents:["无"],devices:["DEV-C9D1·唯一设备"],ips:["118.137.x.x（ID住宅IP）"],payments:["银行转账BCA（本人账户）"],fraudRefs:["无欺诈库命中"],conclusion:"低风险；交易活跃质量A"}},
        {id:"client-2004",name:"Maria S.",partnerId:"partner-1005",country:"BR",stage:"registered",ftdAmount:0,risk:"R1",rGrade:"R1",source:"Search-BR",attribution:{channel:"Google官方路径",linkId:"official-path-br",subId:"-",attributedAt:"2026-11-02 08:20",rule:"官方直连（不计佣）"},commissionTotal:0,updated:"2026-11-04 19:10",crmId:"crm-cl-31004",riskProfile:null},
        {id:"client-2005",name:"Pornvipa K.",partnerId:"partner-1008",country:"TH",stage:"valid_ftd",ftdAmount:3500,risk:"R0",rGrade:"R0",source:"YouTube-TH",attribution:{channel:"注册直链",linkId:"lnk-4003",subId:"YouTube-TH",attributedAt:"2026-09-28 13:45",rule:"首点击归因"},commissionTotal:2600,updated:"2026-11-05 06:30",crmId:"crm-cl-31005",riskProfile:{rGrade:"R0",riskEvents:["无"],devices:["DEV-E22A·唯一设备"],ips:["171.101.x.x（TH住宅IP）"],payments:["银行转账Kbank（本人账户）"],fraudRefs:["无欺诈库命中"],conclusion:"无风险；长线优质客户"}},
        {id:"client-2006",name:"Rahul M.",partnerId:"partner-1012",country:"IN",stage:"churned",ftdAmount:800,risk:"R3",rGrade:"R3",source:"Telegram-IN",attribution:{channel:"官方落地页",linkId:"lnk-4001",subId:"Telegram-IN",attributedAt:"2026-08-14 09:00",rule:"首点击归因"},commissionTotal:0,updated:"2026-10-28 15:40",crmId:"crm-cl-31006",riskProfile:{rGrade:"R3",riskEvents:["rev-evt-2311（多平台套利对冲，R3定档）","rev-evt-2350（90日零交易流失确认）"],devices:["DEV-F8B3·关联4客户"],ips:["49.36.x.x（IN数据中心IP）"],payments:["Skrill×3（关联集群cluster-8802）"],fraudRefs:["crm-fraud-1307（对冲套利模式命中）"],conclusion:"高风险；集群案件cluster-8802成员，佣金隔离中"}},
        {id:"client-2007",name:"Siti N.",partnerId:"partner-1014",country:"ID",stage:"ftd",ftdAmount:600,risk:"R1",rGrade:"R1",source:"TikTok-ID",attribution:{channel:"素材参数链",linkId:"lnk-4004",subId:"TikTok-ID",attributedAt:"2026-10-22 17:10",rule:"首点击归因"},commissionTotal:260,updated:"2026-11-02 10:15",crmId:"crm-cl-31007",riskProfile:{rGrade:"R1",riskEvents:["无"],devices:["DEV-G44C·唯一设备"],ips:["120.188.x.x（ID住宅IP）"],payments:["OVO钱包（本人）"],fraudRefs:["无欺诈库命中"],conclusion:"低风险"}},
        {id:"client-2008",name:"Carlos E.",partnerId:"partner-1021",country:"PH",stage:"valid_ftd",ftdAmount:1500,risk:"R2",rGrade:"R2",source:"Facebook-PH",attribution:{channel:"KOL专属链",linkId:"lnk-4005",subId:"Facebook-PH",attributedAt:"2026-10-08 11:50",rule:"首点击归因"},commissionTotal:980,updated:"2026-11-04 09:25",crmId:"crm-cl-31008",riskProfile:{rGrade:"R2",riskEvents:["rev-evt-2402（设备重启变更指纹1次）"],devices:["DEV-H55D·唯一设备（指纹变更1次）"],ips:["112.198.x.x（PH住宅IP）"],payments:["GCash（本人）"],fraudRefs:["无欺诈库命中"],conclusion:"中风险；指纹变更已核实为系统升级"}},
        {id:"client-2009",name:"Linh V.",partnerId:"partner-1018",country:"VN",stage:"registered",ftdAmount:0,risk:"R1",rGrade:"R1",source:"Zalo-VN",attribution:{channel:"注册直链",linkId:"lnk-4003",subId:"Zalo-VN",attributedAt:"2026-11-04 20:05",rule:"首点击归因"},commissionTotal:0,updated:"2026-11-05 03:40",crmId:"crm-cl-31009",riskProfile:null},
        {id:"client-2010",name:"Thabo N.",partnerId:"partner-1016",country:"ZA",stage:"ftd",ftdAmount:1000,risk:"R2",rGrade:"R2",source:"WhatsApp-ZA",attribution:{channel:"官方落地页",linkId:"lnk-4001",subId:"WhatsApp-ZA",attributedAt:"2026-10-15 08:30",rule:"首点击归因"},commissionTotal:420,updated:"2026-11-01 14:55",crmId:"crm-cl-31010",riskProfile:{rGrade:"R2",riskEvents:["rev-evt-2488（入金渠道敏感国家名单）"],devices:["DEV-I66E·唯一设备"],ips:["105.186.x.x（ZA住宅IP）"],payments:["银行转账FNB（本人账户）"],fraudRefs:["无欺诈库命中"],conclusion:"中风险；仅入金渠道敏感，行为正常"}},
        {id:"client-2011",name:"Hiro T.",partnerId:"partner-1023",country:"TH",stage:"valid_ftd",ftdAmount:2800,risk:"R0",rGrade:"R0",source:"Line-TH",attribution:{channel:"二级渠道链",linkId:"lnk-4006",subId:"Line-TH",attributedAt:"2026-09-20 10:05",rule:"首点击归因"},commissionTotal:1980,updated:"2026-11-05 01:20",crmId:"crm-cl-31011",riskProfile:{rGrade:"R0",riskEvents:["无"],devices:["DEV-J77F·唯一设备"],ips:["1.46.x.x（TH住宅IP）"],payments:["银行转账SCB（本人账户）"],fraudRefs:["无欺诈库命中"],conclusion:"无风险；月均交易量稳定"}},
        {id:"client-2012",name:"Fatima A.",partnerId:"partner-1002",country:"MY",stage:"churned",ftdAmount:400,risk:"R2",rGrade:"R2",source:"Instagram-MY",attribution:{channel:"注册直链",linkId:"lnk-4002",subId:"Instagram-MY",attributedAt:"2026-08-20 14:25",rule:"首点击归因"},commissionTotal:120,updated:"2026-10-15 09:30",crmId:"crm-cl-31012",riskProfile:{rGrade:"R2",riskEvents:["rev-evt-2501（30日零登录流失）"],devices:["DEV-K88G·唯一设备"],ips:["175.136.x.x（MY住宅IP）"],payments:["信用卡Maybank（本人）"],fraudRefs:["无欺诈库命中"],conclusion:"中风险；自然流失"}},
        {id:"client-2013",name:"Dmitri K.",partnerId:"partner-1025",country:"VN",stage:"churned",ftdAmount:2200,risk:"R4",rGrade:"R4",source:"TikTok-VN",attribution:{channel:"官方落地页",linkId:"lnk-4001",subId:"TikTok-VN",attributedAt:"2026-08-30 19:40",rule:"首点击归因"},commissionTotal:0,updated:"2026-11-01 14:05",crmId:"crm-cl-31013",riskProfile:{rGrade:"R4",riskEvents:["rev-evt-2602（盗卡入金，R4定档）","rev-evt-2610（拒付冲正发起）","rev-evt-2615（保证金抵扣执行）"],devices:["DEV-L99H·关联7客户（欺诈集群）"],ips:["27.68.x.x（VN代理IP）×3"],payments:["盗刷VISA*7781·VISA*8842·Momo×2"],fraudRefs:["crm-fraud-1420（盗卡模式库命中）","crm-fraud-1421（集群cluster-8803）"],conclusion:"严重；欺诈集群成员，佣金清零+追回中"}},
        {id:"client-2014",name:"Grace L.",partnerId:"partner-1016",country:"PH",stage:"valid_ftd",ftdAmount:1800,risk:"R1",rGrade:"R1",source:"Facebook-PH",attribution:{channel:"官方落地页",linkId:"lnk-4001",subId:"Facebook-PH",attributedAt:"2026-09-25 11:15",rule:"首点击归因"},commissionTotal:1240,updated:"2026-11-04 18:35",crmId:"crm-cl-31014",riskProfile:{rGrade:"R1",riskEvents:["无"],devices:["DEV-M11I·唯一设备"],ips:["49.145.x.x（PH住宅IP）"],payments:["GCash+银行转账（本人）"],fraudRefs:["无欺诈库命中"],conclusion:"低风险；双渠道入金正常"}},
        {id:"client-2015",name:"Arif H.",partnerId:"partner-1018",country:"ID",stage:"ftd",ftdAmount:900,risk:"R2",rGrade:"R2",source:"YouTube-ID",attribution:{channel:"素材参数链",linkId:"lnk-4004",subId:"YouTube-ID",attributedAt:"2026-10-28 09:55",rule:"首点击归因"},commissionTotal:380,updated:"2026-11-05 05:10",crmId:"crm-cl-31015",riskProfile:{rGrade:"R2",riskEvents:["rev-evt-2688（注册与入金间隔仅90秒）"],devices:["DEV-N22J·唯一设备"],ips:["139.193.x.x（ID住宅IP）"],payments:["Dana钱包（本人）"],fraudRefs:["无欺诈库命中"],conclusion:"中风险；自动化痕迹待复核"}},
        {id:"client-2016",name:"Mei L.",partnerId:"partner-1008",country:"MY",stage:"registered",ftdAmount:0,risk:"R1",rGrade:"R1",source:"TikTok-MY",attribution:{channel:"注册直链",linkId:"lnk-4003",subId:"TikTok-MY",attributedAt:"2026-11-05 07:45",rule:"首点击归因"},commissionTotal:0,updated:"2026-11-05 07:45",crmId:"crm-cl-31016",riskProfile:null},
        {id:"client-2017",name:"Omar D.",partnerId:"partner-1021",country:"ZA",stage:"ftd",ftdAmount:700,risk:"R3",rGrade:"R3",source:"Telegram-ZA",attribution:{channel:"KOL专属链",linkId:"lnk-4005",subId:"Telegram-ZA",attributedAt:"2026-10-10 15:20",rule:"首点击归因"},commissionTotal:0,updated:"2026-11-02 16:40",crmId:"crm-cl-31017",riskProfile:{rGrade:"R3",riskEvents:["rev-evt-2701（IP与已封禁账户重叠）","rev-evt-2709（入金被支付侧拦截2次）"],devices:["DEV-O33K·关联2客户（兄弟共用）"],ips:["154.66.x.x（ZA代理IP）"],payments:["尝试U卡×2（均拦截）"],fraudRefs:["crm-fraud-1501（IP段黑名单引用）"],conclusion:"高风险；佣金隔离待人工复核"}},
        {id:"client-2018",name:"Sofia R.",partnerId:"partner-1014",country:"BR",stage:"valid_ftd",ftdAmount:2600,risk:"R1",rGrade:"R1",source:"Google-BR",attribution:{channel:"官方落地页（BR路径库）",linkId:"lnk-4001",subId:"Google-BR",attributedAt:"2026-09-15 08:05",rule:"首点击归因"},commissionTotal:1780,updated:"2026-11-03 13:25",crmId:"crm-cl-31018",riskProfile:{rGrade:"R1",riskEvents:["无"],devices:["DEV-P44L·唯一设备"],ips:["191.32.x.x（BR住宅IP）"],payments:["Pix（本人CPF绑定）"],fraudRefs:["无欺诈库命中"],conclusion:"低风险；Pix入金链路标准"}},
        {id:"client-2019",name:"Wan R.",partnerId:"partner-1001",country:"MY",stage:"ftd",ftdAmount:1100,risk:"R1",rGrade:"R1",source:"Line-MY",attribution:{channel:"官方落地页",linkId:"lnk-4001",subId:"Line-MY",attributedAt:"2026-10-25 12:35",rule:"首点击归因"},commissionTotal:470,updated:"2026-11-04 20:50",crmId:"crm-cl-31019",riskProfile:{rGrade:"R1",riskEvents:["无"],devices:["DEV-Q55M·唯一设备"],ips:["60.48.x.x（MY住宅IP）"],payments:["Touch n Go（本人）"],fraudRefs:["无欺诈库命中"],conclusion:"低风险"}},
        {id:"client-2020",name:"Yuki M.",partnerId:"partner-1023",country:"VN",stage:"registered",ftdAmount:0,risk:"R2",rGrade:"R2",source:"Facebook-VN",attribution:{channel:"二级渠道链",linkId:"lnk-4006",subId:"Facebook-VN",attributedAt:"2026-11-03 22:10",rule:"首点击归因"},commissionTotal:0,updated:"2026-11-04 11:30",crmId:"crm-cl-31020",riskProfile:null},
        {id:"client-2021",name:"Pedro V.",partnerId:"partner-1012",country:"BR",stage:"churned",ftdAmount:300,risk:"R2",rGrade:"R2",source:"WhatsApp-BR",attribution:{channel:"注册直链",linkId:"lnk-4002",subId:"WhatsApp-BR",attributedAt:"2026-08-25 16:00",rule:"首点击归因"},commissionTotal:90,updated:"2026-10-20 11:45",crmId:"crm-cl-31021",riskProfile:{rGrade:"R2",riskEvents:["rev-evt-2801（60日零交易）"],devices:["DEV-R66N·唯一设备"],ips:["179.185.x.x（BR住宅IP）"],payments:["Pix（本人）"],fraudRefs:["无欺诈库命中"],conclusion:"中风险；自然流失"}},
        {id:"client-2022",name:"Nurul H.",partnerId:"partner-1005",country:"ID",stage:"valid_ftd",ftdAmount:1900,risk:"R0",rGrade:"R0",source:"Instagram-ID",attribution:{channel:"素材参数链",linkId:"lnk-4004",subId:"Instagram-ID",attributedAt:"2026-09-10 14:50",rule:"首点击归因"},commissionTotal:1320,updated:"2026-11-05 02:15",crmId:"crm-cl-31022",riskProfile:{rGrade:"R0",riskEvents:["无"],devices:["DEV-S77O·唯一设备"],ips:["118.96.x.x（ID住宅IP）"],payments:["银行转账Mandiri（本人账户）"],fraudRefs:["无欺诈库命中"],conclusion:"无风险；交易量稳定"}}
      ]
    },
    attribution360: {
      isolationPanel: {
        passRate: 99.2,
        blockedThisWeek: 6,
        lastCheckedAt: "2026-11-05 10:00",
        domains: [
          {key:"ib",label:"IB域",clientCount:6420,commissionRule:"IB客户返佣（CRM归属）",hint:"IB名下客户，CRM事实源归属"},
          {key:"affiliate",label:"Affiliate域",clientCount:2210,commissionRule:"Affiliate CPA计佣",hint:"通过推广链接归因的客户"}
        ],
        rules: [
          {id:"iso-1",title:"身份互斥",content:"同一自然人在IB与Affiliate体系中身份互斥；IB客户主动申请Affiliate需先释放IB关系并经合规审批。",hitCount:2},
          {id:"iso-2",title:"归属双向隔离",content:"IB名下客户不会因任何点击事件被改判为Affiliate归因；Affiliate客户也不会被计入IB业绩。",hitCount:0},
          {id:"iso-3",title:"已有IB客户不进统计",content:"Affiliate报表与结算的统计口径排除IB客户；误归属越界事件将被拦截并计入越界记录。",hitCount:4}
        ]
      },
      exceptions: [
        {id:"exc-6001",type:"重复归属",client:"client-2013",partner:"partner-1025",source:"TikTok-VN",traceId:"trace-7a3f",status:"pending",risk:"high",amount:2200,description:"同一TraceId出现两条归属判定（官方路径+推广链接）；待人工重算。",occurredAt:"2026-11-01 14:20",owner:"风控/Risk"},
        {id:"exc-6002",type:"事件缺数",client:"client-2011",partner:"partner-1023",source:"Line-TH",traceId:"trace-9c2e",status:"processing",risk:"medium",amount:1980,description:"CRM注册回调缺失；Outbox缺口任务gap-801已建，补数中。",occurredAt:"2026-10-30 09:40",owner:"系统/Tech"},
        {id:"exc-6003",type:"来源无效",client:"client-2017",partner:"partner-1021",source:"Telegram-ZA",traceId:"trace-4b8d",status:"pending",risk:"high",amount:700,description:"点击来源IP命中黑名单段；归属判定挂起，佣金隔离。",occurredAt:"2026-11-02 16:40",owner:"风控/Risk"},
        {id:"exc-6004",type:"路径未入库",client:"client-2010",partner:"partner-1016",source:"WhatsApp-ZA",traceId:"trace-2e5a",status:"waiting_external",risk:"low",amount:420,description:"官方路径库未收录该落地页版本；路径入库后自动重算。",occurredAt:"2026-10-28 11:15",owner:"系统/Tech"},
        {id:"exc-6005",type:"重复归属",client:"client-2006",partner:"partner-1012",source:"Telegram-IN",traceId:"trace-8d1c",status:"confirmed",risk:"medium",amount:800,description:"跨设备重复点击触发的双归属；已按首点击规则重算，误报标记。",occurredAt:"2026-10-22 08:30",owner:"风控/Risk"},
        {id:"exc-6006",type:"事件缺数",client:"client-2019",partner:"partner-1001",source:"Line-MY",traceId:"trace-6f0b",status:"success",risk:"low",amount:470,description:"支付回调延迟2小时；补数完成，归属恢复。",occurredAt:"2026-10-18 15:00",owner:"系统/Tech"}
      ],
      links: [
        {id:"attr-9001",client:"client-2001",partner:"partner-1001",linkId:"lnk-4001",subId:"TikTok-TH",channel:"官方落地页",rule:"首点击归因",attributedAt:"2026-10-12 09:15",status:"success",risk:"low",updated:"2026-11-04 14:20",traceId:"trace-7a01"},
        {id:"attr-9002",client:"client-2002",partner:"partner-1002",linkId:"lnk-4002",subId:"YouTube-ID",channel:"注册直链",rule:"首点击归因",attributedAt:"2026-10-18 16:40",status:"success",risk:"medium",updated:"2026-11-03 11:05",traceId:"trace-7a02"},
        {id:"attr-9003",client:"client-2013",partner:"partner-1025",linkId:"lnk-4001",subId:"TikTok-VN",channel:"官方落地页",rule:"待重算",attributedAt:"2026-08-30 19:40",status:"pending",risk:"high",updated:"2026-11-01 14:05",traceId:"trace-7a3f"},
        {id:"attr-9004",client:"client-2005",partner:"partner-1008",linkId:"lnk-4003",subId:"YouTube-TH",channel:"注册直链",rule:"首点击归因",attributedAt:"2026-09-28 13:45",status:"success",risk:"low",updated:"2026-11-05 06:30",traceId:"trace-7a04"},
        {id:"attr-9005",client:"client-2006",partner:"partner-1012",linkId:"lnk-4001",subId:"Telegram-IN",channel:"官方落地页",rule:"首点击归因",attributedAt:"2026-08-14 09:00",status:"success",risk:"high",updated:"2026-10-28 15:40",traceId:"trace-8d1c"},
        {id:"attr-9006",client:"client-2008",partner:"partner-1021",linkId:"lnk-4005",subId:"Facebook-PH",channel:"KOL专属链",rule:"首点击归因",attributedAt:"2026-10-08 11:50",status:"success",risk:"medium",updated:"2026-11-04 09:25",traceId:"trace-7a06"},
        {id:"attr-9007",client:"client-2011",partner:"partner-1023",linkId:"lnk-4006",subId:"Line-TH",channel:"二级渠道链",rule:"首点击归因",attributedAt:"2026-09-20 10:05",status:"processing",risk:"low",updated:"2026-11-05 01:20",traceId:"trace-9c2e"},
        {id:"attr-9008",client:"client-2017",partner:"partner-1021",linkId:"lnk-4005",subId:"Telegram-ZA",channel:"KOL专属链",rule:"挂起（来源无效）",attributedAt:"2026-10-10 15:20",status:"failed",risk:"high",updated:"2026-11-02 16:40",traceId:"trace-4b8d"},
        {id:"attr-9009",client:"client-2018",partner:"partner-1014",linkId:"lnk-4001",subId:"Google-BR",channel:"官方落地页（BR）",rule:"首点击归因",attributedAt:"2026-09-15 08:05",status:"success",risk:"low",updated:"2026-11-03 13:25",traceId:"trace-7a09"},
        {id:"attr-90010",client:"client-2010",partner:"partner-1016",linkId:"lnk-4001",subId:"WhatsApp-ZA",channel:"官方落地页",rule:"待路径入库",attributedAt:"2026-10-15 08:30",status:"waiting_external",risk:"medium",updated:"2026-10-28 11:15",traceId:"trace-2e5a"}
      ]
    },
    eventChainCatalog: {
      searchPlaceholder: "输入 TraceId（如 trace-7a3f）或客户/合作方ID，回车检索全链路",
      nodeTypeLabels: {click:"点击",registration:"注册",ftd:"FTD",commission:"计佣",hold:"结算中",release:"释放",settlement:"结算",withdrawal:"提现",exception:"异常",gap:"缺数"},
      chains: [
        {traceId:"trace-7a01",client:"client-2001",partner:"partner-1001",summary:"TH优质客户标准全链路（有效FTD→计佣→结算中→释放→结算）",totalCommission:860,chain:[
          {seq:1,type:"click",time:"2026-10-12 09:14",label:"TikTok-TH点击lnk-4001",detail:"设备DEV-A31F·IP 27.145.x.x·官方落地页",status:"success",target:"link-list"},
          {seq:2,type:"registration",time:"2026-10-12 09:16",label:"注册完成client-2001",detail:"CRM回调成功·归属判定：首点击归因partner-1001",status:"success",target:"client-list"},
          {seq:3,type:"ftd",time:"2026-10-14 22:05",label:"FTD 1,200 USD",detail:"VISA*4291入金·支付回调成功",status:"success",target:"client-list"},
          {seq:4,type:"commission",time:"2026-10-14 22:06",label:"计佣860 USD",detail:"资格档CPA-TH-A·里程碑注册+有效FTD达成",status:"success",target:"commission-list"},
          {seq:5,type:"hold",time:"2026-10-14 22:06",label:"结算中 860 USD（D+14）",detail:"理论结算期7日+质量附加7日",status:"success",target:"hold-workbench"},
          {seq:6,type:"release",time:"2026-10-28 22:10",label:"结算释放",detail:"D+14到期·无风险事件·自动释放",status:"success",target:"commission-list"},
          {seq:7,type:"settlement",time:"2026-11-01 10:00",label:"进入11月结算批次",detail:"结算单STMT-1101·净额含税费代扣",status:"success",target:"statement-list"},
          {seq:8,type:"withdrawal",time:"",label:"等待合作方提现",detail:"partner-1001可提现余额已更新",status:"pending",target:"withdrawal-list"}
        ]},
        {traceId:"trace-7a3f",client:"client-2013",partner:"partner-1025",summary:"VN欺诈链（盗卡→拒付→佣金清零→保证金抵扣）",totalCommission:0,chain:[
          {seq:1,type:"click",time:"2026-08-30 19:38",label:"TikTok-VN点击lnk-4001",detail:"代理IP 27.68.x.x·设备指纹L99H",status:"success",target:"link-list"},
          {seq:2,type:"registration",time:"2026-08-30 19:40",label:"注册完成client-2013",detail:"归属判定：首点击归因partner-1025",status:"success",target:"client-list"},
          {seq:3,type:"ftd",time:"2026-08-31 09:15",label:"FTD 2,200 USD",detail:"盗刷VISA*7781入金（当时未识别）",status:"success",target:"client-list"},
          {seq:4,type:"commission",time:"2026-08-31 09:16",label:"计佣1,540 USD",detail:"资格档CPA-VN-A",status:"success",target:"commission-list"},
          {seq:5,type:"hold",time:"2026-08-31 09:16",label:"结算中 1,540 USD（D+21风险附加）",detail:"VN国家风险系数上浮",status:"success",target:"hold-workbench"},
          {seq:6,type:"exception",time:"2026-09-02 11:00",label:"风险事件：盗卡识别R4",detail:"rev-evt-2602·欺诈库crm-fraud-1420命中·集群cluster-8803",status:"failed",target:"client-list"},
          {seq:7,type:"commission",time:"2026-09-02 11:05",label:"佣金冲正-1,540 USD",detail:"佣金清零·R4定档·案件组risk-case-5003",status:"failed",target:"commission-list"},
          {seq:8,type:"hold",time:"2026-09-02 11:05",label:"保证金抵扣执行",detail:"partner-1025保证金26,000 USD部分抵扣",status:"success",target:"guarantee-workbench"},
          {seq:9,type:"exception",time:"2026-11-01 14:20",label:"归属异常exc-6001",detail:"重复归属待重算·同TraceId双判定",status:"pending",target:"attribution-links"}
        ]},
        {traceId:"trace-9c2e",client:"client-2011",partner:"partner-1023",summary:"TH客户事件缺数链（注册回调缺失→Outbox补数中）",totalCommission:1980,chain:[
          {seq:1,type:"click",time:"2026-09-20 10:03",label:"Line-TH点击lnk-4006",detail:"二级渠道链·Sub ID Line-TH",status:"success",target:"link-list"},
          {seq:2,type:"registration",time:"2026-09-20 10:05",label:"注册完成client-2011",detail:"归属判定：首点击归因partner-1023",status:"success",target:"client-list"},
          {seq:3,type:"ftd",time:"2026-09-22 15:40",label:"FTD 2,800 USD",detail:"银行转账SCB·支付回调成功",status:"success",target:"client-list"},
          {seq:4,type:"gap",time:"2026-10-30 09:40",label:"事件缺数exc-6002",detail:"CRM注册回调缺失·Outbox缺口任务gap-801补数中",status:"pending",target:"attribution-links"},
          {seq:5,type:"commission",time:"2026-10-30 09:45",label:"计佣1,980 USD（账务暂挂）",detail:"缺口补齐前账务挂起·幂等键backfill-crm-reg-801",status:"processing",target:"commission-list"},
          {seq:6,type:"hold",time:"",label:"结算中（待补数后启动）",detail:"账务挂起中，不进入结算放行",status:"pending",target:"hold-workbench"}
        ]},
        {traceId:"trace-4b8d",client:"client-2017",partner:"partner-1021",summary:"ZA黑名单IP链（来源无效→佣金隔离）",totalCommission:0,chain:[
          {seq:1,type:"click",time:"2026-10-10 15:18",label:"Telegram-ZA点击lnk-4005",detail:"代理IP 154.66.x.x·命中IP段黑名单",status:"failed",target:"link-list"},
          {seq:2,type:"registration",time:"2026-10-10 15:20",label:"注册完成client-2017",detail:"归属判定挂起：来源无效",status:"processing",target:"client-list"},
          {seq:3,type:"ftd",time:"2026-10-12 08:30",label:"FTD 700 USD",detail:"U卡入金被支付侧拦截2次后成功",status:"warning",target:"client-list"},
          {seq:4,type:"commission",time:"2026-10-12 08:31",label:"计佣420 USD（隔离）",detail:"佣金隔离·待人工复核exc-6003",status:"pending",target:"commission-list"},
          {seq:5,type:"exception",time:"2026-11-02 16:40",label:"归属异常exc-6003",detail:"来源无效·IP黑名单引用crm-fraud-1501",status:"pending",target:"attribution-links"}
        ]},
        {traceId:"trace-2e5a",client:"client-2010",partner:"partner-1016",summary:"ZA路径未入库链（落地页版本缺失→等待外部）",totalCommission:420,chain:[
          {seq:1,type:"click",time:"2026-10-15 08:28",label:"WhatsApp-ZA点击lnk-4001",detail:"落地页v2.3未收录官方路径库",status:"success",target:"link-list"},
          {seq:2,type:"registration",time:"2026-10-15 08:30",label:"注册完成client-2010",detail:"归属判定：首点击归因partner-1016（临时）",status:"success",target:"client-list"},
          {seq:3,type:"ftd",time:"2026-10-16 14:20",label:"FTD 1,000 USD",detail:"银行转账FNB·支付回调成功",status:"success",target:"client-list"},
          {seq:4,type:"commission",time:"2026-10-16 14:21",label:"计佣420 USD（账务暂挂）",detail:"路径入库后自动重算·exc-6004",status:"waiting_external",target:"commission-list"},
          {seq:5,type:"gap",time:"2026-10-28 11:15",label:"路径入库任务",detail:"官方路径库v2.3入库审批中（配置中心）",status:"processing",target:"attribution-links"}
        ]},
        {traceId:"trace-8d1c",client:"client-2006",partner:"partner-1012",summary:"IN跨设备重复点击链（双归属→首点击重算→误报关闭）",totalCommission:120,chain:[
          {seq:1,type:"click",time:"2026-08-14 08:55",label:"Telegram-IN首次点击lnk-4001",detail:"设备F8B3·首点击",status:"success",target:"link-list"},
          {seq:2,type:"click",time:"2026-08-14 09:00",label:"Instagram-IN二次点击lnk-4002",detail:"跨设备重复点击·触发双归属",status:"warning",target:"link-list"},
          {seq:3,type:"registration",time:"2026-08-14 09:02",label:"注册完成client-2006",detail:"双归属判定挂起",status:"processing",target:"client-list"},
          {seq:4,type:"exception",time:"2026-10-22 08:30",label:"重复归属exc-6005",detail:"人工重算：按首点击规则判给partner-1012",status:"confirmed",target:"attribution-links"},
          {seq:5,type:"commission",time:"2026-10-22 08:35",label:"计佣120 USD（冲正后）",detail:"原佣金800 USD按重算结果调整",status:"success",target:"commission-list"}
        ]},
        {traceId:"trace-6f0b",client:"client-2019",partner:"partner-1001",summary:"MY回调延迟链（支付延迟2小时→补数恢复）",totalCommission:470,chain:[
          {seq:1,type:"click",time:"2026-10-25 12:33",label:"Line-MY点击lnk-4001",detail:"住宅IP 60.48.x.x",status:"success",target:"link-list"},
          {seq:2,type:"registration",time:"2026-10-25 12:35",label:"注册完成client-2019",detail:"归属判定：首点击归因partner-1001",status:"success",target:"client-list"},
          {seq:3,type:"ftd",time:"2026-10-26 10:00",label:"FTD 1,100 USD",detail:"Touch n Go入金·回调延迟2小时",status:"warning",target:"client-list"},
          {seq:4,type:"gap",time:"2026-10-18 15:00",label:"事件缺数exc-6006（历史）",detail:"支付回调延迟·已补数恢复",status:"success",target:"attribution-links"},
          {seq:5,type:"commission",time:"2026-10-26 12:10",label:"计佣470 USD",detail:"补数完成·账务恢复正常",status:"success",target:"commission-list"},
          {seq:6,type:"hold",time:"2026-10-26 12:10",label:"结算中 470 USD（D+14）",detail:"理论结算期7日+质量附加7日",status:"success",target:"hold-workbench"},
          {seq:7,type:"release",time:"2026-11-09 12:10",label:"结算释放（预计）",detail:"D+14到期自动释放",status:"pending",target:"commission-list"}
        ]}
      ]
    },
    link360: {
      views: [
        {id:"all",label:"官方链接",hint:"官方生成的推广链接与归属规则"},
        {id:"channel",label:"渠道",hint:"Sub ID二级渠道：生成/启停/父链接归属"}
      ],
      linkTypes: {landing:"官方落地页",direct:"注册直链",deep:"深链",material:"素材参数链",kol:"KOL专属链",channel:"二级渠道链"},
      links: [
        {id:"lnk-4001",name:"TH官方落地页",type:"landing",campaign:"cmp-1101",countries:["TH","ID","VN","ZA","BR"],status:"active",rule:"首点击归因",clicks30d:18600,conversions30d:412,subIds:["TikTok-TH","Telegram-MY","Line-MY","TikTok-VN","WhatsApp-ZA","Google-BR"],createdAt:"2026-09-01 10:00",updated:"2026-11-05 09:00"},
        {id:"lnk-4002",name:"ID注册直链",type:"direct",campaign:"cmp-1102",countries:["ID","MY","BR"],status:"active",rule:"首点击归因",clicks30d:12400,conversions30d:268,subIds:["YouTube-ID","Instagram-MY","WhatsApp-BR"],createdAt:"2026-09-05 14:20",updated:"2026-11-04 16:40"},
        {id:"lnk-4003",name:"TH注册直链",type:"direct",campaign:"cmp-1101",countries:["TH","VN"],status:"active",rule:"首点击归因",clicks30d:9800,conversions30d:197,subIds:["YouTube-TH","Zalo-VN","TikTok-MY"],createdAt:"2026-09-12 09:30",updated:"2026-11-05 06:30"},
        {id:"lnk-4004",name:"素材参数链",type:"material",campaign:"cmp-1103",countries:["ID","MY"],status:"active",rule:"首点击归因",clicks30d:7600,conversions30d:142,subIds:["TikTok-ID","Instagram-ID","YouTube-ID"],createdAt:"2026-09-20 11:15",updated:"2026-11-05 05:10"},
        {id:"lnk-4005",name:"KOL专属链",type:"kol",campaign:"cmp-1104",countries:["PH","ZA"],status:"active",rule:"首点击归因",clicks30d:5400,conversions30d:121,subIds:["Facebook-PH","Telegram-ZA"],createdAt:"2026-10-01 15:00",updated:"2026-11-04 09:25"},
        {id:"lnk-4006",name:"二级渠道链",type:"channel",campaign:"cmp-1103",countries:["TH","VN"],status:"active",rule:"首点击归因",clicks30d:4300,conversions30d:96,subIds:["Line-TH","Facebook-VN"],createdAt:"2026-10-08 10:05",updated:"2026-11-05 01:20"},
        {id:"lnk-4007",name:"BR落地页v2",type:"landing",campaign:"cmp-1105",countries:["BR"],status:"processing",rule:"待路径入库",clicks30d:2100,conversions30d:31,subIds:["Google-BR","WhatsApp-BR"],createdAt:"2026-10-15 08:28",updated:"2026-10-28 11:15",note:"落地页v2.3未收录官方路径库，路径入库后自动重算归属（exc-6004）"},
        {id:"lnk-4008",name:"ZA试投链",type:"direct",campaign:"cmp-1106",countries:["ZA"],status:"blocked",rule:"来源黑名单拦截",clicks30d:860,conversions30d:4,subIds:["Telegram-ZA"],createdAt:"2026-10-10 15:18",updated:"2026-11-02 16:40",note:"点击来源IP命中黑名单段；归属判定挂起（exc-6003）"}
      ],
      subChannels: [
        {id:"sub-tt-th",subId:"TikTok-TH",parentLink:"lnk-4001",parentName:"TH官方落地页",status:"active",partner:"partner-1001",clicks30d:8200,conversions30d:186,createdAt:"2026-09-01 10:30",updated:"2026-11-04 14:20"},
        {id:"sub-tg-my",subId:"Telegram-MY",parentLink:"lnk-4001",parentName:"TH官方落地页",status:"active",partner:"partner-1001",clicks30d:3400,conversions30d:74,createdAt:"2026-09-03 12:00",updated:"2026-11-05 08:50"},
        {id:"sub-yt-id",subId:"YouTube-ID",parentLink:"lnk-4002",parentName:"ID注册直链",status:"active",partner:"partner-1002",clicks30d:5100,conversions30d:102,createdAt:"2026-09-05 15:00",updated:"2026-11-03 11:05"},
        {id:"sub-ig-my",subId:"Instagram-MY",parentLink:"lnk-4002",parentName:"ID注册直链",status:"paused",partner:"partner-1002",clicks30d:1900,conversions30d:18,createdAt:"2026-09-08 09:40",updated:"2026-10-15 09:30",note:"转化质量连续两周下滑，暂停观察"},
        {id:"sub-tt-vn",subId:"TikTok-VN",parentLink:"lnk-4001",parentName:"TH官方落地页",status:"blocked",partner:"partner-1025",clicks30d:4100,conversions30d:61,createdAt:"2026-08-30 19:38",updated:"2026-11-01 14:05",note:"合作方清退中，渠道已阻断"},
        {id:"sub-fb-ph",subId:"Facebook-PH",parentLink:"lnk-4005",parentName:"KOL专属链",status:"active",partner:"partner-1021",clicks30d:2900,conversions30d:66,createdAt:"2026-10-08 12:00",updated:"2026-11-04 09:25"},
        {id:"sub-line-th",subId:"Line-TH",parentLink:"lnk-4006",parentName:"二级渠道链",status:"active",partner:"partner-1023",clicks30d:2200,conversions30d:52,createdAt:"2026-09-20 10:30",updated:"2026-11-05 01:20"},
        {id:"sub-wa-za",subId:"WhatsApp-ZA",parentLink:"lnk-4001",parentName:"TH官方落地页",status:"active",partner:"partner-1016",clicks30d:1500,conversions30d:31,createdAt:"2026-10-15 09:00",updated:"2026-11-01 14:55"},
        {id:"sub-tt-id",subId:"TikTok-ID",parentLink:"lnk-4004",parentName:"素材参数链",status:"active",partner:"partner-1014",clicks30d:2600,conversions30d:58,createdAt:"2026-10-22 17:40",updated:"2026-11-02 10:15"},
        {id:"sub-gg-br",subId:"Google-BR",parentLink:"lnk-4001",parentName:"TH官方落地页",status:"active",partner:"partner-1014",clicks30d:1800,conversions30d:44,createdAt:"2026-09-15 08:30",updated:"2026-11-03 13:25"},
        {id:"sub-tg-za",subId:"Telegram-ZA",parentLink:"lnk-4005",parentName:"KOL专属链",status:"blocked",partner:"partner-1021",clicks30d:760,conversions30d:0,createdAt:"2026-10-10 15:40",updated:"2026-11-02 16:40",note:"来源IP命中黑名单（exc-6003）"},
        {id:"sub-fb-vn",subId:"Facebook-VN",parentLink:"lnk-4006",parentName:"二级渠道链",status:"active",partner:"partner-1018",clicks30d:1100,conversions30d:19,createdAt:"2026-11-03 22:30",updated:"2026-11-04 11:30"}
      ]
    },
    materialCatalog: {
      types: {banner:"横幅",landing:"落地页",video:"视频",gif:"GIF"},
      states: {pending_review:"待审核",active:"已上架",rejected:"已驳回",offline:"已下架"},
      items: [
        {id:"mat-501",name:"TH横幅800x600",type:"banner",platform:"Web",size:"800x600",format:"PNG",sizeKb:142,state:"active",campaign:"cmp-1101",uploader:"运营/Ops",uploadedAt:"2026-10-20 14:00",specCheck:"passed",thumbColor:"#C9A227"},
        {id:"mat-502",name:"TH横幅1080x1920",type:"banner",platform:"Android/iOS",size:"1080x1920",format:"PNG",sizeKb:388,state:"active",campaign:"cmp-1101",uploader:"运营/Ops",uploadedAt:"2026-10-20 14:05",specCheck:"passed",thumbColor:"#C9A227"},
        {id:"mat-503",name:"ID短视频9:16",type:"video",platform:"TikTok",size:"1080x1920",format:"MP4",sizeKb:8400,state:"active",campaign:"cmp-1102",uploader:"运营/Ops",uploadedAt:"2026-10-22 11:30",specCheck:"passed",thumbColor:"#3E7B8C"},
        {id:"mat-504",name:"MY落地页v3",type:"landing",platform:"Web",size:"-",format:"HTML",sizeKb:64,state:"active",campaign:"cmp-1103",uploader:"运营/Ops",uploadedAt:"2026-10-25 09:15",specCheck:"passed",thumbColor:"#8C6A4F"},
        {id:"mat-505",name:"Telegram GIF",type:"gif",platform:"Telegram",size:"480x360",format:"GIF",sizeKb:1260,state:"active",campaign:"cmp-1104",uploader:"运营/Ops",uploadedAt:"2026-10-28 16:40",specCheck:"warning",specNote:"帧率超Telegram推荐值（参考），已放行",thumbColor:"#7C5C9E"},
        {id:"mat-506",name:"BR落地页v2.3",type:"landing",platform:"Web",size:"-",format:"HTML",sizeKb:58,state:"pending_review",campaign:"cmp-1105",uploader:"运营/Ops",uploadedAt:"2026-10-30 10:00",specCheck:"failed",specNote:"路径库未收录版本；审核挂起等路径入库",thumbColor:"#B3542F"},
        {id:"mat-507",name:"KOL头像框套装",type:"banner",platform:"Multi",size:"800x800",format:"PNG",sizeKb:210,state:"active",campaign:"cmp-1104",uploader:"运营/Ops",uploadedAt:"2026-11-01 13:20",specCheck:"passed",thumbColor:"#C9A227"},
        {id:"mat-508",name:"ZA横幅过审版",type:"banner",platform:"Web",size:"970x250",format:"PNG",sizeKb:96,state:"rejected",campaign:"cmp-1106",uploader:"运营/Ops",uploadedAt:"2026-11-02 09:00",specCheck:"passed",rejectNote:"风险披露文案与合规口径不符，已驳回修改",thumbColor:"#8C6A4F"},
        {id:"mat-509",name:"PH视频横版",type:"video",platform:"Facebook",size:"1280x720",format:"MP4",sizeKb:6200,state:"active",campaign:"cmp-1104",uploader:"运营/Ops",uploadedAt:"2026-11-02 15:45",specCheck:"passed",thumbColor:"#3E7B8C"},
        {id:"mat-510",name:"旧版通用横幅",type:"banner",platform:"Web",size:"728x90",format:"PNG",sizeKb:48,state:"offline",campaign:"cmp-1101",uploader:"运营/Ops",uploadedAt:"2026-09-10 10:00",specCheck:"passed",offlineNote:"替换为800x600新版后下架",thumbColor:"#9AA0A6"},
        {id:"mat-511",name:"VN注册引导图",type:"banner",platform:"Web",size:"800x600",format:"PNG",sizeKb:138,state:"active",campaign:"cmp-1103",uploader:"运营/Ops",uploadedAt:"2026-11-03 14:30",specCheck:"passed",thumbColor:"#C9A227"},
        {id:"mat-512",name:"阿拉伯语横幅（试验）",type:"banner",platform:"Web",size:"800x600",format:"PNG",sizeKb:150,state:"pending_review",campaign:"-",uploader:"运营/Ops",uploadedAt:"2026-11-05 08:20",specCheck:"warning",specNote:"非首期国家语言素材；待运营确认投放市场",thumbColor:"#7C5C9E"}
      ]
    },
    postbackCatalog: {
      platforms: {af:"AppsFlyer",adj:"Adjust",br:"Branch",ca:"Custom"},
      configs: [
        {id:"pb-701",name:"AppsFlyer TH",platform:"af",status:"active",url:"https://api.appsflyer.com/…/install",events:["install","ftd","valid_ftd"],paramMap:[["click_id","{click_id}"],["affiliate_id","{partner_id}"],["event","{event_name}"],["payout","{commission_usd}"]],lastTest:{time:"2026-11-04 15:30",result:"success",latencyMs:410},delivery30d:{sent:4200,success:4180,failed:20},updatedAt:"2026-11-04 15:30"},
        {id:"pb-702",name:"Adjust ID",platform:"adj",status:"active",url:"https://s2s.adjust.com/event",events:["install","ftd"],paramMap:[["s2s","1"],["tracker","{sub_id}"],["revenue","{ftd_usd}"],["currency","USD"]],lastTest:{time:"2026-11-04 15:32",result:"success",latencyMs:380},delivery30d:{sent:3100,success:3095,failed:5},updatedAt:"2026-11-04 15:32"},
        {id:"pb-703",name:"Branch MY",platform:"br",status:"active",url:"https://api2.branch.io/v2/standard",events:["install"],paramMap:[["branch_key","***"],["identity","{client_ref}"],["event","install"]],lastTest:{time:"2026-11-03 10:00",result:"success",latencyMs:520},delivery30d:{sent:1800,success:1794,failed:6},updatedAt:"2026-11-03 10:00"},
        {id:"pb-704",name:"Custom VN",platform:"ca",status:"processing",url:"https://partner-vn.example.com/pb",events:["install","ftd","valid_ftd"],paramMap:[["tid","{trace_id}"],["uid","{client_ref}"],["type","{event_name}"],["amt","{amount_usd}"]],lastTest:{time:"2026-11-05 09:40",result:"failed",failNote:"HTTP 502；目标端网关异常，重试队列已建"},delivery30d:{sent:940,success:892,failed:48},updatedAt:"2026-11-05 09:40"},
        {id:"pb-705",name:"AppsFlyer ZA",platform:"af",status:"paused",url:"https://api.appsflyer.com/…/za",events:["install"],paramMap:[["click_id","{click_id}"],["event","install"]],lastTest:{time:"2026-10-28 11:00",result:"success",latencyMs:450},delivery30d:{sent:320,success:319,failed:1},updatedAt:"2026-11-01 16:00",note:"ZA试投活动暂停，回传同步暂停"}
      ],
      testEvents: [
        {event:"install",hint:"模拟注册事件回传"},
        {event:"ftd",hint:"模拟首次入金回传"},
        {event:"valid_ftd",hint:"模拟有效FTD回传"}
      ]
    },
    trackerCatalog: {
      searchPlaceholder: "输入点击ID（如 clk-8f3a）或TraceId/链接ID检索转化路径",
      sessions: [
        {id:"clk-8f3a",linkId:"lnk-4001",subId:"TikTok-TH",partner:"partner-1001",country:"TH",device:"Android·DEV-A31F",source:"TikTok自然流",traceId:"trace-7a01",clickedAt:"2026-10-12 09:14",path:[
          {seq:1,time:"2026-10-12 09:14",label:"点击官方落地页",detail:"IP 27.145.x.x · 落地页停留42秒",status:"success"},
          {seq:2,time:"2026-10-12 09:15",label:"跳转注册页",detail:"utm参数完整 · Sub ID TikTok-TH",status:"success"},
          {seq:3,time:"2026-10-12 09:16",label:"注册完成",detail:"client-2001 · CRM回调成功",status:"success"},
          {seq:4,time:"2026-10-14 22:05",label:"FTD 1,200 USD",detail:"VISA*4291 · 归因判定成功",status:"success"},
          {seq:5,time:"2026-10-14 22:06",label:"计佣860 USD",detail:"资格档CPA-TH-A · 进入结算",status:"success"}
        ]},
        {id:"clk-2b7c",linkId:"lnk-4007",subId:"Google-BR",partner:"partner-1014",country:"BR",device:"iOS·DEV-P44L",source:"Google搜索广告",traceId:"trace-7a09",clickedAt:"2026-09-15 08:03",path:[
          {seq:1,time:"2026-09-15 08:03",label:"点击BR落地页v2",detail:"IP 191.32.x.x · 落地页v2.3",status:"success"},
          {seq:2,time:"2026-09-15 08:05",label:"注册完成",detail:"client-2018 · 官方路径直连",status:"success"},
          {seq:3,time:"2026-09-15 08:07",label:"FTD 2,600 USD",detail:"Pix入金 · 归因待路径入库",status:"processing"},
          {seq:4,time:"2026-09-15 08:08",label:"计佣1,780 USD（暂挂）",detail:"exc-6004：路径入库后重算",status:"pending"}
        ]},
        {id:"clk-9e1d",linkId:"lnk-4008",subId:"Telegram-ZA",partner:"partner-1021",country:"ZA",device:"Android·DEV-O33K",source:"Telegram频道",traceId:"trace-4b8d",clickedAt:"2026-10-10 15:18",path:[
          {seq:1,time:"2026-10-10 15:18",label:"点击KOL专属链",detail:"IP 154.66.x.x · 命中IP段黑名单",status:"failed"},
          {seq:2,time:"2026-10-10 15:20",label:"注册完成",detail:"client-2017 · 归属判定挂起",status:"processing"},
          {seq:3,time:"2026-10-12 08:31",label:"FTD 700 USD",detail:"佣金隔离 · exc-6003",status:"failed"}
        ]},
        {id:"clk-4c8a",linkId:"lnk-4003",subId:"YouTube-TH",partner:"partner-1008",country:"TH",device:"Desktop·DEV-E22A",source:"YouTube频道简介",traceId:"trace-7a04",clickedAt:"2026-09-28 13:44",path:[
          {seq:1,time:"2026-09-28 13:44",label:"点击注册直链",detail:"IP 171.101.x.x · Web端",status:"success"},
          {seq:2,time:"2026-09-28 13:45",label:"注册完成",detail:"client-2005 · 归因成功",status:"success"},
          {seq:3,time:"2026-09-30 20:10",label:"FTD 3,500 USD",detail:"银行转账 · 归因确认",status:"success"},
          {seq:4,time:"2026-09-30 20:11",label:"计佣2,600 USD",detail:"质量A级 · 进入结算",status:"success"}
        ]},
        {id:"clk-6d2f",linkId:"lnk-4002",subId:"YouTube-ID",partner:"partner-1002",country:"ID",device:"Android·DEV-B7C2",source:"YouTube广告",traceId:"trace-7a02",clickedAt:"2026-10-18 16:39",path:[
          {seq:1,time:"2026-10-18 16:39",label:"点击注册直链",detail:"IP 113.161.x.x · 广告位 banner",status:"success"},
          {seq:2,time:"2026-10-18 16:40",label:"注册完成",detail:"client-2002 · 归因成功",status:"success"},
          {seq:3,time:"2026-10-19 09:20",label:"FTD 500 USD",detail:"Neteller入金",status:"success"},
          {seq:4,time:"2026-10-19 09:21",label:"计佣210 USD",detail:"入金出金间隔48h · 风险观察标记",status:"processing"}
        ]},
        {id:"clk-1a5e",linkId:"lnk-4005",subId:"Facebook-PH",partner:"partner-1021",country:"PH",device:"iOS·DEV-H55D",source:"Facebook帖文",traceId:"trace-7a06",clickedAt:"2026-10-08 11:49",path:[
          {seq:1,time:"2026-10-08 11:49",label:"点击KOL专属链",detail:"IP 112.198.x.x · 指纹H55D",status:"success"},
          {seq:2,time:"2026-10-08 11:50",label:"注册完成",detail:"client-2008 · 归因成功",status:"success"},
          {seq:3,time:"2026-10-10 15:30",label:"FTD 1,500 USD",detail:"GCash · 归因确认",status:"success"},
          {seq:4,time:"2026-10-10 15:31",label:"计佣980 USD",detail:"指纹变更1次已核实（系统升级）",status:"success"}
        ]},
        {id:"clk-7f3b",linkId:"lnk-4004",subId:"TikTok-ID",partner:"partner-1014",country:"ID",device:"Android·DEV-G44C",source:"TikTok短视频",traceId:"-",clickedAt:"2026-11-02 10:13",path:[
          {seq:1,time:"2026-11-02 10:13",label:"点击素材参数链",detail:"IP 120.188.x.x · 素材mat-511",status:"success"},
          {seq:2,time:"2026-11-02 10:14",label:"注册完成",detail:"client-2007 · 归因成功",status:"success"},
          {seq:3,time:"",label:"等待FTD",detail:"注册后48小时内未入金",status:"pending"}
        ]},
        {id:"clk-8c9d",linkId:"lnk-4006",subId:"Line-TH",partner:"partner-1023",country:"TH",device:"iOS·DEV-J77F",source:"Line群组分享",traceId:"trace-9c2e",clickedAt:"2026-09-20 10:03",path:[
          {seq:1,time:"2026-09-20 10:03",label:"点击二级渠道链",detail:"IP 1.46.x.x · Sub ID Line-TH",status:"success"},
          {seq:2,time:"2026-09-20 10:05",label:"注册完成",detail:"client-2011 · 回调缺数（gap-801）",status:"processing"},
          {seq:3,time:"2026-09-22 15:40",label:"FTD 2,800 USD",detail:"计佣1,980暂挂 · 补数中",status:"processing"}
        ]},
        {id:"clk-3e6g",linkId:"lnk-4001",subId:"WhatsApp-ZA",partner:"partner-1016",country:"ZA",device:"Android·DEV-I66E",source:"WhatsApp状态",traceId:"trace-2e5a",clickedAt:"2026-10-15 08:28",path:[
          {seq:1,time:"2026-10-15 08:28",label:"点击官方落地页",detail:"IP 105.186.x.x · 落地页v2.3未入库",status:"success"},
          {seq:2,time:"2026-10-15 08:30",label:"注册完成",detail:"client-2010 · 临时归因",status:"success"},
          {seq:3,time:"2026-10-16 14:21",label:"FTD 1,000 USD",detail:"计佣420暂挂 · 等路径入库",status:"processing"}
        ]},
        {id:"clk-5h1i",linkId:"lnk-4002",subId:"Instagram-MY",partner:"partner-1002",country:"MY",device:"iOS·DEV-K88G",source:"Instagram快拍",traceId:"trace-8d1c-0",clickedAt:"2026-08-20 14:24",path:[
          {seq:1,time:"2026-08-20 14:24",label:"点击注册直链",detail:"IP 175.136.x.x",status:"success"},
          {seq:2,time:"2026-08-20 14:25",label:"注册完成",detail:"client-2012 · 归因成功",status:"success"},
          {seq:3,time:"2026-08-22 09:00",label:"FTD 400 USD",detail:"30日后零登录流失",status:"failed"},
          {seq:4,time:"2026-10-15 09:30",label:"客户流失确认",detail:"佣金120已结算不追回",status:"confirmed"}
        ]}
      ]
    },
    funds360: {
      commissions: [
        {id:"comm-3001",name:"注册+有效FTD佣金",partner:"partner-1001",type:"基础",amount:860,status:"released",settlementBlock:"正常",updated:"2026-10-14 22:06",traceId:"trace-7a01"},
        {id:"comm-3002",name:"质量服务佣金",partner:"partner-1001",type:"质量",amount:240,status:"released",settlementBlock:"正常",updated:"2026-10-20 10:00",traceId:"trace-7a01"},
        {id:"comm-3201",name:"注册+有效FTD佣金",partner:"partner-1004",type:"基础",amount:470,status:"pending",settlementBlock:"正常",updated:"2026-10-26 12:10",traceId:"trace-6f0b"},
        {id:"comm-3301",name:"注册+有效FTD佣金",partner:"partner-1025",type:"基础",amount:1540,status:"blocked",settlementBlock:"案件组阻断",updated:"2026-09-02 11:05",traceId:"trace-7a3f",note:"risk-case-5003集群案件；计佣正常、结算阻断"},
        {id:"comm-3003",name:"附加佣金",partner:"partner-1008",type:"附加",amount:620,status:"released",settlementBlock:"正常",updated:"2026-10-05 09:30",traceId:"trace-7a04"},
        {id:"comm-3302",name:"质量服务佣金",partner:"partner-1025",type:"质量",amount:0,status:"failed",settlementBlock:"违规清零",updated:"2026-09-02 11:05",traceId:"trace-7a3f"},
        {id:"comm-3401",name:"注册+有效FTD佣金",partner:"partner-1023",type:"基础",amount:1980,status:"pending",settlementBlock:"缺数挂起",updated:"2026-10-30 09:45",traceId:"trace-9c2e",note:"gap-801补数中，账务暂挂"},
        {id:"comm-3501",name:"保证金前净额",partner:"partner-1016",type:"冲正前",amount:420,status:"pending",settlementBlock:"路径入库",updated:"2026-10-16 14:21",traceId:"trace-2e5a"}
      ],
      statements: [
        {id:"STMT-1101",name:"11月结算批次W1",partner:"partner-1001",gross:1100,tax:110,guarantee:220,net:770,status:"confirmed",period:"2026-11-01~07"},
        {id:"STMT-1102",name:"10月结算批次M",partner:"partner-1008",gross:3220,tax:322,guarantee:644,net:2254,status:"paid",period:"2026-10"},
        {id:"STMT-1103",name:"11月结算批次W1",partner:"partner-1014",gross:260,tax:26,guarantee:52,net:182,status:"draft",period:"2026-11-01~07"},
        {id:"STMT-1104",name:"清退最终结算",partner:"partner-1003",gross:14300,tax:1430,guarantee:980,net:11890,status:"confirmed",period:"清退",note:"清退单：结算中余额转入"},
        {id:"STMT-1105",name:"补发结算9月",partner:"partner-1021",gross:700,tax:70,guarantee:140,net:490,status:"pending_approval",period:"2026-09"},
        {id:"STMT-1106",name:"11月结算批次W1",partner:"partner-1018",gross:1780,tax:178,guarantee:356,net:1246,status:"confirmed",period:"2026-11-01~07"}
      ],
      taxRecords: [
        {id:"tax-201",name:"W-8BEN登记",partner:"partner-1001",rate:10,withheld:110,status:"confirmed",period:"2026-10"},
        {id:"tax-202",name:"代扣重算",partner:"partner-1008",rate:10,withheld:322,status:"confirmed",period:"2026-10"},
        {id:"tax-203",name:"税务信息更新待确认",partner:"partner-1016",rate:15,withheld:63,status:"pending",period:"2026-11",note:"税率档变更待财务确认"}
      ],
      withdrawals: [
        {id:"wd-401",name:"银行提现",partner:"partner-1001",amount:5000,fee:25,status:"success",updated:"2026-11-01 10:00",steps:[{t:"2026-11-01 10:00",s:"申请提交",d:"运营审核通过"},{t:"2026-11-01 10:05",s:"账户校验",d:"收款账户与CRM一致"},{t:"2026-11-01 10:10",s:"支付下发",d:"银行渠道"},{t:"2026-11-01 14:30",s:"到账确认",d:"成功"}]},
        {id:"wd-402",name:"电子钱包提现",partner:"partner-1014",amount:1200,fee:12,status:"processing",updated:"2026-11-04 15:00",steps:[{t:"2026-11-04 15:00",s:"申请提交",d:"自动审核通过"},{t:"2026-11-04 15:02",s:"账户校验",d:"钱包校验通过"},{t:"2026-11-04 15:05",s:"支付下发",d:"钱包渠道处理中"}]},
        {id:"wd-403",name:"高风险复核提现",partner:"partner-1013",amount:800,fee:8,status:"manual_required",updated:"2026-11-02 09:00",steps:[{t:"2026-11-02 09:00",s:"申请提交",d:"命中风控：客户R4关联"},{t:"2026-11-02 09:01",s:"人工复核",d:"等待风控确认"}]},
        {id:"wd-404",name:"失败重试",partner:"partner-1021",amount:600,fee:6,status:"failed",updated:"2026-11-03 16:00",steps:[{t:"2026-11-03 11:00",s:"申请提交",d:"审核通过"},{t:"2026-11-03 11:05",s:"支付下发",d:"渠道超时失败"},{t:"2026-11-03 16:00",s:"自动重试",d:"二次失败，转人工"},{t:"",s:"人工重试",d:"待处理"}]}
      ],
      reversals: [
        {id:"rev-501",name:"盗卡拒付冲正",partner:"partner-1025",type:"拒付",amount:1540,liable:"合作方全责",status:"executed",updated:"2026-09-02 11:05",path:["拒付识别R4","佣金冲正-1540","保证金抵扣26,000","追索剩余损失"]},
        {id:"rev-502",name:"欺诈追回",partner:"partner-1013",type:"欺诈",amount:2200,liable:"合作方全责",status:"processing",updated:"2026-11-01 14:00",path:["集群定案","追回发起","支付渠道协查"]},
        {id:"rev-503",name:"账务重算",partner:"partner-1012",type:"重算",amount:680,liable:"系统误差",status:"confirmed",updated:"2026-10-22 08:35",path:["归属重算exc-6005","佣金调整","差额补发"]},
        {id:"rev-504",name:"保证金抵扣",partner:"partner-1025",type:"追回",amount:26000,liable:"合作方全责",status:"executed",updated:"2026-11-04 08:45",path:["清退步骤4","抵扣审批","账务入账"]}
      ],
      reconciliations: [
        {id:"rec-601",name:"日结对账1105",type:"日结",affiliate:186200,external:186200,diff:0,status:"success",updated:"2026-11-05"},
        {id:"rec-602",name:"支付对账1104",type:"支付",affiliate:45200,external:45130,diff:70,status:"reconcile_failed",updated:"2026-11-04",note:"3笔手续费口径差异，人工处理中"},
        {id:"rec-603",name:"财务报表对账10月",type:"财务",affiliate:328900,external:328900,diff:0,status:"success",updated:"2026-11-02"},
        {id:"rec-604",name:"佣金差异处理",type:"差异",affiliate:0,external:0,diff:420,status:"manual_required",updated:"2026-10-16",note:"trace-2e5a路径未入库暂挂"}
      ]
    },
    riskGovernance: {
      blacklist: [
        {id:"bl-101",name:"设备DEV-L99H",type:"设备",value:"指纹L99H",reason:"欺诈集群cluster-8803",status:"active",updated:"2026-09-02"},
        {id:"bl-102",name:"IP段154.66.x.x",type:"IP",value:"ZA代理段",reason:"exc-6003来源无效",status:"active",updated:"2026-10-10"},
        {id:"bl-103",name:"VISA*7781",type:"支付",value:"盗刷卡",reason:"盗卡入金R4",status:"active",updated:"2026-09-02"},
        {id:"bl-104",name:"客户client-2013",type:"客户",value:"Dmitri K.",reason:"欺诈集群成员",status:"active",updated:"2026-11-01"},
        {id:"bl-105",name:"合作方partner-1025",type:"合作方",value:"Granite Peak",reason:"多层违规清退",status:"pending_review",updated:"2026-11-01",note:"清退中，移出需风控主管复核"},
        {id:"bl-106",name:"设备DEV-A31F",type:"设备",value:"指纹A31F",reason:"误报（同宿舍WiFi）",status:"removed",updated:"2026-10-20",note:"已移出：复核确认正常共用"}
      ],
      tickets: [
        {id:"tk-701",name:"结算咨询：11月批次净额",partner:"partner-1001",type:"咨询",priority:"normal",status:"closed",updated:"2026-11-04"},
        {id:"tk-702",name:"链接失效：lnk-4008",partner:"partner-1021",type:"异常",priority:"high",status:"processing",updated:"2026-11-02",note:"涉风险→已转风险复核"},
        {id:"tk-703",name:"佣金争议：comm-3302清零",partner:"partner-1025",type:"争议",priority:"urgent",status:"waiting_external",updated:"2026-11-01",note:"涉争议→已转申诉流程"},
        {id:"tk-704",name:"素材申诉：ZA横幅驳回",partner:"partner-1016",type:"申诉",priority:"medium",status:"pending",updated:"2026-11-02"}
      ]
    },
    analyticsSeeds: {
      channels: [
        {id:"chn-01",name:"TikTok",country:"TH/ID/VN",clicks30d:16900,convRate:"2.2%",roiLabel:"1.32",risk:"low",recommendation:"scale_up"},
        {id:"chn-02",name:"YouTube",country:"TH/ID",clicks30d:14900,convRate:"1.8%",roiLabel:"1.08",risk:"low",recommendation:"scale_up"},
        {id:"chn-03",name:"Facebook",country:"PH/BR",clicks30d:4700,convRate:"2.6%",roiLabel:"1.15",risk:"low",recommendation:"observe"},
        {id:"chn-04",name:"Telegram",country:"MY/IN/ZA",clicks30d:7100,convRate:"0.9%",roiLabel:"0.64",risk:"high",recommendation:"limit"},
        {id:"chn-05",name:"KOL专属",country:"PH/ZA",clicks30d:5400,convRate:"2.2%",roiLabel:"1.10",risk:"medium",recommendation:"review"},
        {id:"chn-06",name:"Line",country:"TH",clicks30d:2200,convRate:"2.4%",roiLabel:"1.22",risk:"low",recommendation:"scale_up"}
      ],
      financeReports: [
        {id:"fin-01",name:"佣金支出",period:"2026-10",amount:328900,trend:"+12%",status:"observe",drill:"报表中心/ROI"},
        {id:"fin-02",name:"税费代扣汇总",period:"2026-10",amount:32890,trend:"+12%",status:"observe",drill:"结算与税费"},
        {id:"fin-03",name:"保证金覆盖",period:"2026-11",amount:70400,trend:"-6%",status:"review",drill:"保证金覆盖页签",note:"覆盖率108%（安全线120%示例）"},
        {id:"fin-04",name:"冲正损失",period:"2026-10",amount:1470,trend:"-38%",status:"observe",drill:"冲正与追回"}
      ],
      riskReports: [
        {id:"rsk-01",name:"硬规则D1-1流量画像",hitRate:"3.2%",falseRate:"0.8%",amount:18600,quadrant:"高效精准",risk:"observe"},
        {id:"rsk-02",name:"硬规则D2-2路径校验",hitRate:"5.1%",falseRate:"4.2%",amount:26400,quadrant:"高误报待调",risk:"review"},
        {id:"rsk-03",name:"评分规则R3档",hitRate:"1.8%",falseRate:"0.3%",amount:9800,quadrant:"高效精准",risk:"observe"},
        {id:"rsk-04",name:"集群规则C2",hitRate:"0.9%",falseRate:"0.1%",amount:42000,quadrant:"低频高危",risk:"limit"},
        {id:"rsk-05",name:"违规规则V3多层",hitRate:"2.2%",falseRate:"2.8%",amount:22000,quadrant:"高误报待调",risk:"review"}
      ]
    },
    configSeeds: {
      configItems: [
        {id:"item-pricing",name:"价格与佣金档",category:"奖励与资格",currentSummary:"公用四档基础价格；国家仅配置系数；FTD与有效FTD基础比例合计100%",status:"active",owner:"业务/财务",updated:"2026-11-08 09:10",parameters:["四档基础金额","FTD基础比例","有效FTD基础比例","质量服务附加比例","国家系数","币种USD"]},
        {id:"item-qualification",name:"资格档与里程碑",category:"奖励与资格",currentSummary:"L1-L4档位及FTD、有效FTD、质量服务达标条件",status:"active",owner:"运营/Ops",updated:"2026-11-08 09:12",parameters:["L1-L4阈值","FTD净入金额度/失效周期","有效FTD净入金额度/活跃天数/手数/失效周期","质量服务净入金额度/活跃天数/手数/收益率/失效周期"]},
        {id:"item-quality",name:"质量服务规则",category:"奖励与资格",currentSummary:"质量服务独立计算，不占FTD与有效FTD基础比例",status:"active",owner:"风控/Risk",updated:"2026-11-08 09:15",parameters:["质量服务开关","净入金额度","交易活跃天数","标准交易手数","收益率","失效周期"]},
        {id:"item-credit",name:"信用等级与权益",category:"奖励与资格",currentSummary:"C0-C4积分信用体系；90天滚动周期；信用等级影响基础结算中天数、保证金和额度",status:"active",owner:"风控/财务",updated:"2026-11-08 09:20",parameters:["等级积分上下限","90天周期","积分加分规则","积分扣分规则","基础结算中天数","保证金调整","结算额度","恢复条件"]},
        {id:"item-partner-tier",name:"合作者等级与个人附加",category:"奖励与资格",currentSummary:"P1扩展：合作时间和客户数量提升合作者等级，逐步减少基础结算中天数",status:"active",owner:"运营/Ops",updated:"2026-11-08 09:22",parameters:["等级条件","合作时间","有效客户数量","基础结算中减免","个人附加比例","启用开关"]},
        {id:"item-country",name:"国家与主体",category:"奖励与资格",currentSummary:"开放国家、法律主体、国家默认系数和合规限制",status:"active",owner:"合规/Compliance",updated:"2026-11-08 09:25",parameters:["国家代码","法律主体","国家系数","支付方式","开放状态","限制说明"]},
        {id:"item-hold",name:"动态结算中规则",category:"结算规则",currentSummary:"基础结算中天数与国家、主体、支付方式、D1-D10、R0-R3、集群附加天数相加，不重置且暂不设累计上限",status:"active",owner:"风控/财务",updated:"2026-11-08 09:30",parameters:["R0-R3基础天数","国家附加","主体附加","支付方式附加","D1-D10附加","R0-R3附加","集群/案件附加","重复事件上限次数"]},
        {id:"item-dn",name:"D+N与熔断护栏",category:"结算规则",currentSummary:"D+N冻结阈值、自动放行和金额/数量护栏均为后台可配置参考值",status:"active",owner:"风控主管",updated:"2026-11-08 09:35",parameters:["冻结阈值自然日","自动放行开关","金额护栏","数量护栏","超阈值处理","审批开关"]},
        {id:"item-funds",name:"保证金与税费",category:"结算与资金",currentSummary:"保证金和税费均按佣金总额计算；顺序为佣金总额→保证金→税费→结算净额",status:"active",owner:"财务/Finance",updated:"2026-11-08 09:40",parameters:["保证金比例","税费比例","释放自然日","无未决风险条件","抵扣规则","税费说明"]},
        {id:"item-settlement-withdrawal",name:"结算与提现规则",category:"结算与资金",currentSummary:"结算资格、提现审批、账户校验、手续费展示和异常处理",status:"active",owner:"财务/Finance",updated:"2026-11-08 09:42",parameters:["可提现条件","首次提现校验","提现审批","手续费展示","收款账户要求","失败重试"]},
        {id:"item-cluster",name:"集群识别与集群结算中",category:"风控规则",currentSummary:"CRM/风控提供集群事实；Affiliate配置命中后的结算中延长、隔离和审批动作",status:"active",owner:"风控/Risk",updated:"2026-11-08 09:45",parameters:["特征类型","识别窗口","最少关联数","集群处置","结算中延长","人工上限"]},
        {id:"item-hard-rule",name:"D1-D10硬规则",category:"风控规则",currentSummary:"每条D规则独立配置事件、阈值、附加结算中天数、审批和超时处理",status:"active",owner:"风控/Risk",updated:"2026-11-08 09:50",parameters:["D1-D10事件目录","触发条件","附加结算中天数","是否审批","审批人","复核人","审核周期","超时处理"]},
        {id:"item-risk-score",name:"R0-R3风险评分",category:"风控规则",currentSummary:"R0-R3即时风险档独立于C0-C4信用等级，影响结算中、复核和自动结算门禁",status:"active",owner:"风控/Risk",updated:"2026-11-08 09:52",parameters:["事件分值","R档上下限","处置映射","结算中附加","自动结算门禁","审批开关"]},
        {id:"item-violation",name:"违规规则",category:"风控规则",currentSummary:"违规认定、证据要求、处理动作和申诉入口",status:"active",owner:"风控主管",updated:"2026-11-08 09:55",parameters:["违规类型","认定条件","证据要求","处理动作","复核周期","申诉处理"]},
        {id:"item-risk-propagation",name:"合作者风险传导",category:"风控规则",currentSummary:"客户风险仅按明确传导规则影响合作者信用、结算中和保证金，不直接把R档写入信用等级",status:"active",owner:"风控主管",updated:"2026-11-08 09:58",parameters:["风险来源","传导条件","传导范围","积分影响","结算中影响","保证金影响","审批开关"]},
        {id:"item-approval",name:"审批流与自动审核",category:"流程与治理",currentSummary:"提现默认必须审批；其他风控规则默认自动处理，但每条规则保留审批开关",status:"active",owner:"系统/Tech",updated:"2026-11-08 10:00",parameters:["审批节点","审批人","复核人","审核周期","超时处理","自动审核","self_review双审计"]},
        {id:"item-simulation",name:"规则试算",category:"流程与治理",currentSummary:"基于脱敏真实样本和手工参考参数查看新旧版本差异、命中量与资金影响",status:"active",owner:"业务/风控",updated:"2026-11-08 10:02",parameters:["样本范围","对比版本","命中对象","佣金影响","结算中影响","护栏结果"]},
        {id:"item-data",name:"数据治理规则",category:"流程与治理",currentSummary:"数据分级、邮箱/手机号脱敏、保留删除、事件质量和Breach响应",status:"active",owner:"合规/Compliance",updated:"2026-11-08 10:05",parameters:["敏感等级","脱敏规则","保留周期","删除审批","补数窗口","Breach SLA"]},
        {id:"item-content",name:"官方路径治理",category:"流程与治理",currentSummary:"官方路径和落地页由系统生成；合作者不可自建路径，素材由素材管理菜单维护",status:"active",owner:"合规/Compliance",updated:"2026-11-08 10:08",parameters:["官方域名","国家适用范围","注册平台","上下线时间","审核方式"]}
      ],
      versions: [
        {id:"cfg-v8.0",version:"20261107113001",name:"价格与资格档调整",domains:["价格表","资格档与里程碑"],status:"active",locked:true,owner:"业务/财务",createdBy:"业务/财务",created:"2026-11-05 08:20",publishedAt:"2026-11-05 09:10",updated:"2026-11-05 09:10",effectiveTime:"2026-11-07 22:00",previousVersion:"20261030184500",basedOn:"20261030184500",notificationType:"重要",publishMode:"双人确认",lockTime:"2026-11-07 22:00",lockReason:"生效完成",changeSummary:"新增PH国家基准价并上调L2-L4阈值。",impact:"预计佣金成本 +9.6%",traceId:"trace-config-v80",parameters:"价格档、资格档和质量服务附加已完成试算。"},
        {id:"cfg-v7.0",version:"20261105095200",name:"流量门禁与官方路径",domains:["D1-D10硬规则","官方路径库","点击风险规则"],status:"pending_approval",locked:false,owner:"产品/风控",createdBy:"产品/风控",created:"2026-11-05 09:20",publishedAt:"2026-11-05 09:52",updated:"2026-11-05 09:52",effectiveTime:"待审批",previousVersion:"20261104200000",basedOn:"20261104200000",notificationType:"一般",publishMode:"双人确认",changeSummary:"补齐5条官方路径并增加代理、重复点击过滤。",impact:"命中186个对象",traceId:"trace-config-v70",parameters:"D1-1、D2-1、D3-1规则草稿。"},
        {id:"cfg-v6.4",version:"20261104200000",name:"官方路径库紧急修复",domains:["官方路径库","硬规则"],status:"active",locked:true,owner:"合规/系统",createdBy:"合规/系统",created:"2026-11-04 19:20",publishedAt:"2026-11-04 19:40",updated:"2026-11-04 20:00",effectiveTime:"2026-11-04 20:00",previousVersion:"20261103180000",basedOn:"20261103180000",notificationType:"重要",publishMode:"多人会签",lockTime:"2026-11-04 20:00",lockReason:"生效完成",changeSummary:"修复失效路径并补齐来源校验。",impact:"5条路径下线",traceId:"trace-config-v64",parameters:"42条官方路径生效。"},
        {id:"cfg-v5.2",version:"20261104023000",name:"动态结算与D+N调整",domains:["动态Hold","D+N冻结与熔断"],status:"scheduled",locked:false,owner:"风控/财务",createdBy:"风控/财务",created:"2026-11-04 15:40",publishedAt:"2026-11-04 16:30",updated:"2026-11-04 16:30",effectiveTime:"2026-11-06 02:00",previousVersion:"20261101110000",basedOn:"20261101110000",notificationType:"重要",publishMode:"多人会签",changeSummary:"上调R2/R3基础结算期，D+N阈值调整为后台参数。",impact:"理论结算期后移",traceId:"trace-config-v52",parameters:"R2 +9天、R3 +18天；D+N参考30自然日。"},
        {id:"cfg-v4.1",version:"20261104210000",name:"信用权益组合",domains:["信用等级与权益","保证金/税费"],status:"activation_failed",locked:true,owner:"系统/Tech",createdBy:"系统/Tech",created:"2026-11-04 20:20",publishedAt:"2026-11-04 20:40",updated:"2026-11-04 21:00",effectiveTime:"2026-11-04 21:00",previousVersion:"20261028141000",basedOn:"20261028141000",notificationType:"重要",publishMode:"双人确认",lockTime:"2026-11-04 21:00",lockReason:"生效失败保留原版本",changeSummary:"税率外部快照超时，发布包回滚。",impact:"影响金额 USD 36,900",traceId:"trace-config-v41",parameters:"税率快照v4加载失败。"},
        {id:"cfg-v3.8",version:"20261030182000",name:"审批流与自审规则",domains:["审批流","业务通知模板"],status:"active",locked:true,owner:"系统/Tech",createdBy:"系统/Tech",created:"2026-10-30 17:30",publishedAt:"2026-10-30 18:20",updated:"2026-10-30 18:20",effectiveTime:"2026-10-30 18:20",previousVersion:"20261028120000",basedOn:"20261028120000",notificationType:"一般",publishMode:"多人会签",lockTime:"2026-10-30 18:20",lockReason:"生效完成",changeSummary:"统一申请人具备审批权限时的自动审核提示和双审计。",impact:"覆盖7个角色",traceId:"trace-config-v38",parameters:"自审双审计、审批SLA和业务通知模板。"},
        {id:"cfg-v2.6",version:"20261028141000",name:"国家与主体限制",domains:["国家与主体","归属与归因规则"],status:"withdrawn",locked:false,owner:"合规/Compliance",createdBy:"合规/Compliance",created:"2026-10-28 13:40",publishedAt:"2026-10-28 14:10",updated:"2026-10-28 15:00",effectiveTime:"已撤回",previousVersion:"20261025120000",basedOn:"20261025120000",notificationType:"一般",publishMode:"双人确认",changeSummary:"更新开放国家、法律主体和禁投地区，因主体资料变更撤回。",impact:"覆盖7个国家",traceId:"trace-config-v26",parameters:"国家主体映射草稿。"},
        {id:"cfg-v1.9",version:"20261020113000",name:"风险评分与违规规则",domains:["R0-R3风险评分","违规规则","集群规则"],status:"voided",locked:false,owner:"风控主管",createdBy:"风控主管",created:"2026-10-20 10:50",publishedAt:"2026-10-20 11:30",updated:"2026-10-20 11:30",effectiveTime:"已作废",previousVersion:"20261018100000",basedOn:"20261018100000",notificationType:"一般",publishMode:"多人会签",changeSummary:"试算误报率超过护栏，版本作废并保留审计。",impact:"阻断发布",traceId:"trace-config-v19",parameters:"R0-R3评分与违规动作草稿。"}
        ,
        {id:"cfg-v62",version:"20261102120000",name:"质量服务观察期规则",domains:["质量服务"],status:"active",locked:true,owner:"风控/Risk",createdBy:"风控/Risk",created:"2026-11-02 11:30",publishedAt:"2026-11-02 12:00",updated:"2026-11-02 12:00",effectiveTime:"2026-11-02 12:00",previousVersion:"20261015150000",basedOn:"20261015150000",notificationType:"一般",publishMode:"双人确认",lockTime:"2026-11-02 12:00",lockReason:"生效完成",changeSummary:"明确有效FTD后的活跃度、留存和质量服务观察期。",impact:"影响质量服务结算",traceId:"trace-config-v62",parameters:"活跃交易日、净入金保留率、观察期和达标条件。"},
        {id:"cfg-v43",version:"20261103142000",name:"归属与归因窗口",domains:["归属与归因规则"],status:"active",locked:true,owner:"运营/Ops",createdBy:"运营/Ops",created:"2026-11-03 13:50",publishedAt:"2026-11-03 14:20",updated:"2026-11-03 14:20",effectiveTime:"2026-11-03 14:20",previousVersion:"20261020110000",basedOn:"20261020110000",notificationType:"一般",publishMode:"单人发布",lockTime:"2026-11-03 14:20",lockReason:"生效完成",changeSummary:"统一30天归因窗口和首点击优先规则。",impact:"影响新注册归属",traceId:"trace-config-v43",parameters:"30天窗口、首点击优先、重复归属和跨设备处理。"},
        {id:"cfg-v40",version:"20261104204000",name:"信用等级与权益规则",domains:["信用等级与权益"],status:"active",locked:true,owner:"风控/财务",createdBy:"风控/财务",created:"2026-11-04 20:10",publishedAt:"2026-11-04 20:40",updated:"2026-11-04 20:40",effectiveTime:"2026-11-04 20:40",previousVersion:"20261028141000",basedOn:"20261028141000",notificationType:"重要",publishMode:"双人确认",lockTime:"2026-11-04 20:40",lockReason:"生效完成",changeSummary:"维护C0-C4权益及信用等级对结算和保证金的调整。",impact:"影响结算资格",traceId:"trace-config-v40",parameters:"C0-C4阈值、附加比例、信用结算期和保证金比例。"},
        {id:"cfg-v50",version:"20261101110000",name:"动态结算基础规则",domains:["动态结算"],status:"active",locked:true,owner:"风控/财务",createdBy:"风控/财务",created:"2026-11-01 10:30",publishedAt:"2026-11-01 11:00",updated:"2026-11-01 11:00",effectiveTime:"2026-11-01 11:00",previousVersion:"20261025120000",basedOn:"20261025120000",notificationType:"重要",publishMode:"多人会签",lockTime:"2026-11-01 11:00",lockReason:"生效完成",changeSummary:"保留R0-R3基础结算期并允许国家、支付方式和信用叠加。",impact:"影响结算到期日",traceId:"trace-config-v50",parameters:"R0-R3基础天数、国家附加、支付方式附加和叠加优先级。"},
        {id:"cfg-v31",version:"20261103102000",name:"D+N冻结护栏",domains:["D+N冻结与熔断"],status:"active",locked:true,owner:"风控主管",createdBy:"风控主管",created:"2026-11-03 09:50",publishedAt:"2026-11-03 10:20",updated:"2026-11-03 10:20",effectiveTime:"2026-11-03 10:20",previousVersion:"20261020100000",basedOn:"20261020100000",notificationType:"重要",publishMode:"多人会签",lockTime:"2026-11-03 10:20",lockReason:"生效完成",changeSummary:"配置结算超时冻结阈值、自动放行和金额数量熔断。",impact:"影响超时案件",traceId:"trace-config-v31",parameters:"冻结阈值、自动放行开关、金额护栏和数量护栏。"},
        {id:"cfg-v110",version:"20261105090000",name:"D1-D10与R0-R3风险基线",domains:["D1-D10硬规则","R0-R3风险评分","违规规则","集群规则"],status:"active",locked:true,owner:"风控/Risk",createdBy:"风控/Risk",created:"2026-11-05 08:30",publishedAt:"2026-11-05 09:00",updated:"2026-11-05 09:00",effectiveTime:"2026-11-05 09:00",previousVersion:"20261020113000",basedOn:"20261020113000",notificationType:"重要",publishMode:"多人会签",lockTime:"2026-11-05 09:00",lockReason:"生效完成",changeSummary:"启用D1-D10硬规则、R0-R3评分和违规处置基线。",impact:"影响风险识别与处置",traceId:"trace-config-v110",parameters:"D1-D10事件目录、风险权重、R档阈值和处置映射。"},
        {id:"cfg-v40-funds",version:"20261028141001",name:"保证金与税费基础规则",domains:["保证金/税费"],status:"active",locked:true,owner:"财务/Finance",createdBy:"财务/Finance",created:"2026-10-28 13:40",publishedAt:"2026-10-28 14:10",updated:"2026-10-28 14:10",effectiveTime:"2026-10-28 14:10",previousVersion:"20261025120000",basedOn:"20261025120000",notificationType:"重要",publishMode:"双人确认",lockTime:"2026-10-28 14:10",lockReason:"生效完成",changeSummary:"保证金释放、税费扣除和提现抵扣顺序基础规则。",impact:"影响结算净额",traceId:"trace-config-funds40",parameters:"保证金比例、释放周期、税率、手续费和抵扣顺序。"},
        {id:"cfg-v22",version:"20261102173000",name:"数据治理基础规则",domains:["数据治理"],status:"active",locked:true,owner:"合规/Compliance",createdBy:"合规/Compliance",created:"2026-11-02 17:00",publishedAt:"2026-11-02 17:30",updated:"2026-11-02 17:30",effectiveTime:"2026-11-02 17:30",previousVersion:"20261020120000",basedOn:"20261020120000",notificationType:"一般",publishMode:"多人会签",lockTime:"2026-11-02 17:30",lockReason:"生效完成",changeSummary:"统一数据分级、脱敏、保留删除和事件质量规则。",impact:"影响数据访问与留存",traceId:"trace-config-v22",parameters:"敏感等级、脱敏、保留期、补数窗口和Breach SLA。"}
      ],
      system: [
        {id:"sys-001",key:"export.file_expiry_hours",name:"导出文件过期时间",domain:"文件与导出",value:"24小时",pendingValue:"",defaultValue:"24小时",range:"1-168小时",typeLabel:"整数",sensitive:false,controlType:"system",status:"active",owner:"系统/Tech",updated:"2026-10-20",description:"异步导出文件自动过期时间，不进入业务规则版本。",inputType:"number",unit:"小时",impact:"控制导出文件自动清理。"},
        {id:"sys-009",key:"access.attribution_rate_limit",name:"归属查询次数",domain:"归属查询",value:"5次/小时",pendingValue:"",defaultValue:"5次/小时",range:"1-100次/小时",typeLabel:"整数",sensitive:true,controlType:"system",status:"active",owner:"风控主管",updated:"2026-10-04",description:"每小时允许的归属精准查询次数，超限后暂停查询。",inputType:"number",unit:"次/小时",impact:"调整归属查询访问次数，需要二次确认。"},
        {id:"sys-010",key:"access.attribution_cooldown",name:"归属查询过期时间",domain:"归属查询",value:"6小时",pendingValue:"",defaultValue:"6小时",range:"1-72小时",typeLabel:"整数",sensitive:true,controlType:"system",status:"active",owner:"风控主管",updated:"2026-10-04",description:"归属查询超限后的等待时长，到期后恢复查询。",inputType:"number",unit:"小时",impact:"调整查询限制的过期时间，需要二次确认。"}
      ],
      dictionary: [
        {id:"prm-01",name:"基础结算期天数",domain:"资金",current:"D+7",range:"5-14",state:"confirmed",updated:"2026-10-01"},
        {id:"prm-02",name:"质量服务附加结算期",domain:"资金",current:"D+7",range:"5-14",state:"confirmed",updated:"2026-10-01"},
        {id:"prm-03",name:"集群延长N",domain:"风控",current:"待确认",range:"14-30",state:"pending_confirm",updated:"-",note:"集群案件结算延长时间，风控方案v1.2待评审"},
        {id:"prm-04",name:"保证金安全线",domain:"资金",current:"待确认",range:"100-150%",state:"pending_confirm",updated:"-",note:"报表中心保证金覆盖趋势安全线；120%为示例口径"},
        {id:"prm-05",name:"国家风险系数VN",domain:"风控",current:"1.4",range:"1.2-1.6",state:"confirmed",updated:"2026-09-15"},
        {id:"prm-06",name:"质量服务阈值",domain:"质量",current:"D+30",range:"30-60",state:"confirmed",updated:"2026-10-10"},
        {id:"prm-07",name:"导出文件过期",domain:"治理",current:"24h",range:"12-48",state:"confirmed",updated:"2026-10-20"}
      ],
      permissions: [
        {id:"perm-01",name:"运营/Ops",pages:"18页签",sensitive:"脱敏可见",approval:"入驻/素材/链接",updated:"2026-11-01"},
        {id:"perm-02",name:"风控/Risk",pages:"识别中心+复核",sensitive:"全量",approval:"风险复核/黑名单",updated:"2026-11-01"},
        {id:"perm-03",name:"风控主管",pages:"全量",sensitive:"全量",approval:"调级/熔断/黑名单复核",updated:"2026-11-01"},
        {id:"perm-04",name:"财务/Finance",pages:"资金组",sensitive:"账户全量",approval:"结算/提现/保证金",updated:"2026-11-01"},
        {id:"perm-05",name:"合规/Compliance",pages:"治理+审核",sensitive:"全量",approval:"字段授权/删除",updated:"2026-11-01"},
        {id:"perm-06",name:"系统/Tech",pages:"全量",sensitive:"全量",approval:"发布/回滚",updated:"2026-11-01"},
        {id:"perm-07",name:"审计/Audit",pages:"只读全量",sensitive:"只读",approval:"无",updated:"2026-11-01"}
      ]
    },
    reportPackets: [
      {
        id:"report-roi",tab:"roi",title:"合作方ROI经营分析",summary:"点击、注册、FTD、有效FTD、质量服务与净成本同源分析。",
        charts:[
          {title:"转化漏斗",type:"bar",points:[["点击",18600],["注册",4120],["FTD",980],["有效FTD",620],["质量服务",360]]},
          {title:"已付佣金趋势",type:"line",points:[["W1",8200],["W2",9600],["W3",11400],["W4",12800]]},
          {title:"冲正损失趋势",type:"bar",points:[["W1",320],["W2",510],["W3",380],["W4",260]]}
        ],
        dimensions:[
          {id:"roi-dim-701",label:"partner-1001 / TH",clicks:4200,registrations:960,ftd:240,validFtd:168,quality:96,paid:18400,roi:1.32,risk:"low",recommendation:"scale_up",clients:["client-2001","client-2002","client-2003"],commissions:["comm-3001","comm-3002","comm-3003"],riskCase:"risk-case-5001"},
          {id:"roi-dim-702",label:"partner-1004 / ID",clicks:3800,registrations:720,ftd:160,validFtd:82,quality:41,paid:12600,roi:0.78,risk:"medium",recommendation:"review",clients:["client-2201","client-2202"],commissions:["comm-3201","comm-3202"],riskCase:"risk-case-5002"},
          {id:"roi-dim-703",label:"sub-3301 / MY",clicks:2600,registrations:410,ftd:74,validFtd:31,quality:12,paid:8600,roi:0.52,risk:"high",recommendation:"limit",clients:["client-3301","client-3302"],commissions:["comm-3301","comm-3302"],riskCase:"risk-case-5003"}
        ]
      },
      {
        id:"report-quality",tab:"quality",title:"客户质量与健康分析",summary:"FTD转化、质量服务、留存、拒付、冲正、欺诈与集群风险同源监控。",
        charts:[
          {title:"质量等级分布",type:"bar",points:[["A级",320],["B级",180],["C级",90],["关注",60]]},
          {title:"30/60/90日留存",type:"line",points:[["30日",68],["60日",54],["90日",46]]},
          {title:"损失构成",type:"bar",points:[["冲正",820],["拒付",610],["欺诈",380],["追回",220]]}
        ],
        dimensions:[
          {id:"quality-dim-701",label:"partner-1001 / TH",ftd:240,validFtd:168,quality:96,retention:72,chargebackRate:0.8,fraudRate:0.4,clusterRate:3.1,grade:"a",recommendation:"scale_up",clients:["client-2001","client-2002"],commissions:["comm-3001","comm-3002"],riskCase:"risk-case-5001"},
          {id:"quality-dim-702",label:"partner-1004 / ID",ftd:160,validFtd:82,quality:41,retention:49,chargebackRate:1.8,fraudRate:1.2,clusterRate:6.4,grade:"b",recommendation:"review",clients:["client-2201"],commissions:["comm-3201"],riskCase:"risk-case-5002"},
          {id:"quality-dim-703",label:"partner-9001 / Multi",ftd:74,validFtd:31,quality:12,retention:31,chargebackRate:3.2,fraudRate:2.6,clusterRate:11.8,grade:"watch",recommendation:"limit",clients:["client-3301","client-2302"],commissions:["comm-3301","comm-3302"],riskCase:"risk-case-5003"}
        ]
      },
      {
        id:"report-guarantee",tab:"guarantee-coverage",title:"保证金覆盖与潜在损失",summary:"可用保证金、潜在损失、隔离影响、释放延迟和覆盖率同源分析。",
        charts:[
          {title:"覆盖率趋势",type:"line",points:[["W1",132],["W2",126],["W3",114],["W4",108]]},
          {title:"潜在损失构成",type:"bar",points:[["隔离佣金",18600],["调查中",12400],["案件组",9800],["拒付追索",6200]]},
          {title:"释放延迟分布",type:"bar",points:[["0-30天",42],["31-60天",18],["61-90天",7],["90天+",3]]}
        ],
        dimensions:[
          {id:"guarantee-dim-701",label:"TH",guarantee:42000,potentialLoss:24800,coverage:169,releaseDelay:12,status:"safe",recommendation:"observe",clients:["client-2001","client-2003"],commissions:["comm-3001","comm-3002"],riskCase:"risk-case-5001"},
          {id:"guarantee-dim-702",label:"ID",guarantee:18600,potentialLoss:17200,coverage:108,releaseDelay:34,status:"warning",recommendation:"review",clients:["client-2201"],commissions:["comm-3201"],riskCase:"risk-case-5002"},
          {id:"guarantee-dim-703",label:"Multi",guarantee:9800,potentialLoss:14600,coverage:67,releaseDelay:68,status:"shortfall",recommendation:"limit",clients:["client-3301"],commissions:["comm-3301"],riskCase:"risk-case-5003"}
        ]
      }
    ],
    integrationHealth: {
      charts:[
        {title:"接口成功率",type:"line",points:[["09:00",98.6],["10:00",96.2],["11:00",92.4],["12:00",94.8]]},
        {title:"事件积压",type:"bar",points:[["CRM",86],["支付",42],["IMC",18],["Outbox",64]]},
        {title:"回调失败率",type:"bar",points:[["CRM",5.2],["支付",3.8],["IMC",0.6],["Outbox",4.4]]}
      ],
      systems:[
        {id:"crm",name:"CRM API",status:"degraded",latencyMs:480,successRate:92.4,backlog:86,retryRate:7.8,callbackFailureRate:5.2,blockedAmount:45000,owner:"系统/Tech",dependencies:["注册事件","KYC事件","欺诈库引用"],timeline:[{time:"2026-11-05 10:20",action:"成功率低于95%",actor:"监控",result:"warning"},{time:"2026-11-05 10:31",action:"注册回调连续失败5次",actor:"监控",result:"failed"}]},
        {id:"payment",name:"支付系统",status:"warning",latencyMs:620,successRate:95.1,backlog:42,retryRate:5.4,callbackFailureRate:3.8,blockedAmount:18600,owner:"系统/Tech",dependencies:["入金回调","支付 reversal","手续费快照"],timeline:[{time:"2026-11-05 09:40",action:"延迟超过600ms",actor:"监控",result:"warning"}]},
        {id:"imc",name:"IMC分析平台",status:"healthy",latencyMs:210,successRate:99.4,backlog:18,retryRate:0.8,callbackFailureRate:0.6,blockedAmount:0,owner:"系统/Tech",dependencies:["归因事件","点击清洗","报表指标"],timeline:[{time:"2026-11-05 08:00",action:"健康检查通过",actor:"监控",result:"success"}]},
        {id:"outbox",name:"事件Outbox",status:"degraded",latencyMs:380,successRate:93.8,backlog:64,retryRate:6.2,callbackFailureRate:4.4,blockedAmount:26400,owner:"系统/Tech",dependencies:["事件重试","投递日志","幂等键"],timeline:[{time:"2026-11-05 10:50",action:"积压超过50条",actor:"监控",result:"warning"}]}
      ],
      eventGaps:[
        {id:"gap-801",source:"CRM",stage:"registration",criticality:"critical",expected:100,actual:95,gap:5,blockedCommissions:["comm-3002","comm-3003"],blockedAmount:33000,status:"pending",idempotencyKey:"backfill-crm-reg-801",retryCount:1},
        {id:"gap-802",source:"Payment",stage:"deposit_callback",criticality:"critical",expected:80,actual:76,gap:4,blockedCommissions:["comm-3301"],blockedAmount:12000,status:"pending",idempotencyKey:"backfill-payment-802",retryCount:2},
        {id:"gap-803",source:"IMC",stage:"attribution",criticality:"secondary",expected:120,actual:118,gap:2,blockedCommissions:[],blockedAmount:0,status:"alerting",idempotencyKey:"backfill-imc-803",retryCount:0}
      ],
      tasks:[
        {id:"int-801",name:"CRM注册事件补数",type:"event_backfill",status:"retrying",source:"CRM",retryCount:1,idempotencyKey:"backfill-crm-reg-801",linked:["gap-801"],sla:"30分钟"},
        {id:"int-802",name:"支付回调重试",type:"callback_retry",status:"failed",source:"Payment",retryCount:2,idempotencyKey:"backfill-payment-802",linked:["gap-802"],sla:"15分钟"},
        {id:"int-803",name:"IMC归因自检",type:"attribution_check",status:"processing",source:"IMC",retryCount:0,idempotencyKey:"imc-check-803",linked:["gap-803"],sla:"2小时"}
      ]
    },
    dataGovernance: {
      classifications:[
        {id:"public",name:"公开数据",fields:["活动名称","价格说明"],policy:"可按需展示"},
        {id:"internal",name:"内部数据",fields:["合作方ID","佣金金额","结算状态"],policy:"登录后可见"},
        {id:"sensitive",name:"敏感数据",fields:["邮箱","手机号","证件号","银行卡"],policy:"默认脱敏；导出需审批"},
        {id:"restricted",name:"受限数据",fields:["设备指纹","CRM原始报文","证据附件原文"],policy:"按字段授权；不进入普通导出"}
      ],
      retentionPolicies:[
        {dataType:"点击原始证据",retentionDays:180,status:"active",owner:"合规"},
        {dataType:"客户身份资料",retentionDays:365,status:"active",owner:"合规"},
        {dataType:"导出文件",retentionDays:1,status:"active",owner:"系统"},
        {dataType:"审计日志",retentionDays:1095,status:"active",owner:"审计"}
      ],
      fieldAccessRequests:[
        {id:"field-auth-601",field:"邮箱明文",applicant:"运营/Ops",purpose:"客户申诉核对",status:"pending_approval",expiresAt:"2026-11-06 12:00",auditId:"audit-field-601"},
        {id:"field-auth-602",field:"手机号明文",applicant:"风控/Risk",purpose:"集群风险复核",status:"approved",expiresAt:"2026-11-06 18:00",auditId:"audit-field-602"},
        {id:"field-auth-603",field:"银行卡明文",applicant:"财务/Finance",purpose:"付款失败核对",status:"rejected",expiresAt:"-",auditId:"audit-field-603"}
      ],
      deletionTasks:[
        {id:"delete-601",dataType:"过期点击证据",objectCount:1286,status:"pending_approval",retentionUntil:"2026-10-05",reason:"保留期已满",requestedBy:"系统",sla:"5自然日"},
        {id:"delete-602",dataType:"失效导出文件",objectCount:18,status:"processing",retentionUntil:"2026-11-05",reason:"24小时过期",requestedBy:"系统",sla:"1小时"},
        {id:"delete-603",dataType:"匿名化客户资料",objectCount:12,status:"completed",retentionUntil:"2026-09-30",reason:"用户删除请求",requestedBy:"合规",sla:"10自然日"}
      ],
      breachIncidents:[
        {id:"breach-601",name:"导出文件下载链接异常访问",severity:"high",status:"containing",detectedAt:"2026-11-05 10:10",notificationSla:"1小时",owner:"合规",affectedData:["邮箱掩码","客户ID"],timeline:[{time:"2026-11-05 10:10",action:"异常下载告警",actor:"监控",result:"warning"},{time:"2026-11-05 10:20",action:"暂停下载链接",actor:"系统/Tech",result:"blocked"}]},
        {id:"breach-602",name:"内部报表截图外发提醒",severity:"medium",status:"monitoring",detectedAt:"2026-11-04 16:40",notificationSla:"24小时",owner:"合规",affectedData:["佣金汇总数据"],timeline:[{time:"2026-11-04 16:40",action:"安全提醒",actor:"合规",result:"processing"}]}
      ]
    },
    reportSuggestions: [],
    exportTasks: [
      {id:"export-701",name:"合作方ROI明细",scope:"当前筛选；包含3个维度",rows:3,status:"ready",approvalStatus:"approved",masked:true,dataLevel:"internal",expiresAt:"2026-11-06 11:00",createdBy:"运营/Ops",traceId:"trace-export-701"},
      {id:"export-702",name:"质量看板客户明细",scope:"当前筛选；脱敏导出",rows:6,status:"processing",approvalStatus:"pending_approval",masked:true,dataLevel:"sensitive",expiresAt:"2026-11-06 12:00",createdBy:"风控/Risk",traceId:"trace-export-702"},
      {id:"export-703",name:"保证金覆盖批次",scope:"当前筛选；包含批次与释放计划",rows:18,status:"expired",approvalStatus:"approved",masked:true,dataLevel:"internal",expiresAt:"2026-11-05 08:00",createdBy:"财务/Finance",traceId:"trace-export-703"}
    ],
    permissionPolicy: {
      dataScopes: {
        operations:"本人、本组及授权合作方；敏感字段脱敏",
        risk:"全量风险对象；证据全文按授权查看",
        risk_supervisor:"全量风险对象；可审批风险结论和隔离解除",
        finance:"资金、佣金、保证金、提现和报表；不可见证据全文",
        compliance:"全量合规对象；可审批数据治理和国家主体配置",
        system_admin:"技术配置与集成任务；不代替业务审批",
        audit:"只读全量对象与审计；无写操作"
      },
      searchTypes: {
        operations:["业务对象","配置发布包","报表维度","集成系统","事件缺口","集成任务","导出任务","审计"],
        risk:["业务对象","风险案件","报表维度","集成系统","事件缺口","集成任务","导出任务","审计"],
        risk_supervisor:["业务对象","配置发布包","风险案件","报表维度","集成系统","事件缺口","集成任务","导出任务","审计"],
        finance:["业务对象","配置发布包","风险案件","报表维度","集成系统","事件缺口","集成任务","导出任务","审计"],
        compliance:["业务对象","配置发布包","风险案件","报表维度","集成系统","事件缺口","集成任务","导出任务","审计"],
        system_admin:["业务对象","配置发布包","风险案件","报表维度","集成系统","事件缺口","集成任务","导出任务","审计"],
        audit:["业务对象","配置发布包","风险案件","报表维度","集成系统","事件缺口","集成任务","导出任务","审计"]
      },
      maskedFields:["邮箱","手机号","证件号","银行卡","设备指纹","CRM原始报文"],
      alwaysHiddenFields:["合作方端内部阈值","规则权重完整表达式","证据附件原文"]
    },
    moduleBlueprint: [
      {
        id:"dashboard",title:"仪表盘",items:[
          {id:"dash-operation",label:"经营总览",stage:"P1",routeId:"admin-workbench",tabId:"tasks",view:"operation",summary:"进入统一驾驶舱经营视角：转化、佣金、质量与净ROI指标。",objects:["合作方","客户","佣金","风险案件"],actions:["指标下钻","导出报告"],dependency:["报表API","资金账务"]},
          {id:"dash-tasks",label:"任务总览",stage:"MVP",routeId:"admin-workbench",tabId:"tasks",summary:"按待处理、待审批、超时、集成失败和当前角色聚合任务。",objects:["任务","审批","集成任务"],actions:["认领","转办","审批","导出"],dependency:["任务中心API"]},
          {id:"dash-risk",label:"风险总览",stage:"P1",routeId:"admin-workbench",tabId:"tasks",view:"risk",summary:"进入统一驾驶舱风险视角：高风险对象、案件组、隔离金额与调查SLA。",objects:["风险事件","集群案件","隔离队列"],actions:["下钻案件","生成复核"],dependency:["风控指标API"]},
          {id:"dash-funds",label:"资金总览",stage:"P1",routeId:"admin-workbench",tabId:"tasks",view:"funds",summary:"进入统一驾驶舱资金视角：结算到期、保证金覆盖、提现异常和冲正风险。",objects:["佣金","保证金","提现","冲正"],actions:["下钻资金对象","生成资金复核"],dependency:["账务API","支付API"]}
        ]
      },
      {
        id:"partners",title:"合作方管理",items:[
          {id:"partner-list",label:"合作方列表",stage:"P1",summary:"合作方主数据列表；点击合作方进入全屏合作方360对象页。",objects:["Partner","CRM账户","信用档案","入驻申请","清退案件"],actions:["查看360","筛选阶段","发起处理任务"],dependency:["CRM Partner API","Affiliate聚合接口"]},
          {id:"partner-onboarding",label:"入驻审核",stage:"P1",routeId:"admin-modules",tabId:"partner-list",view:"onboarding",summary:"Partner 360入驻视角：申请/审核中阶段视图与三键审核操作条（通过/驳回/补件，强制原因+自动审核提示）。",objects:["入驻申请","资质材料"],actions:["通过","驳回","要求补充"],dependency:["CRM资料接口","文件服务"]},
          {id:"partner-kyc",label:"KYC / KYB状态",stage:"P1",routeId:"admin-modules",tabId:"partner-list",view:"kyc",summary:"Partner 360认证视角：KYC/KYB双徽标列与抽屉只读Tab（CRM事实源，不执行认证；同步异常跳集成任务）。",objects:["Partner","KYC/KYB记录"],actions:["查看同步记录","要求补件"],dependency:["CRM KYC/KYB事实源"]},
          {id:"partner-credit",label:"信用档案",stage:"MVP",routeId:"admin-risk",tabId:"credit-insight",summary:"查看合作方信用分、C0-C4等级、积分流水、权益和调级记录。",objects:["信用分","信用等级","权益","调级申请"],actions:["查看证据","发起调级复核"],dependency:["信用体系服务"]},
          {id:"partner-offboarding",label:"合作方清退",stage:"P1",routeId:"admin-modules",tabId:"partner-list",view:"offboarding",summary:"Partner 360清退视角：清退中阶段Tab与竖向步骤时间线抽屉（保证金审批跳资金组）。",objects:["清退案件","推广链接","最终结算"],actions:["发起清退","审批","归档"],dependency:["资金结算","链接服务"]},
          {id:"partner-notes",label:"合作方备注",stage:"P2",routeId:"admin-modules",tabId:"partner-list",view:"notes",summary:"Partner 360跟进视角：抽屉「跟进与备注」时间线Tab直达。",objects:["跟进记录","内部备注"],actions:["新增备注","查看时间线"],dependency:["消息或工单服务"]}
        ]
      },
      {
        id:"attribution",title:"客户与归因",items:[
          {id:"client-list",label:"客户360",stage:"P1",summary:"客户全生命周期宿主页：业务列+生命周期筛选；风险档案降为抽屉「风险」页签（R档/风险事件/关联特征/欺诈库引用），唯一出口「生成风险复核」。",objects:["客户","转化阶段","风险档案"],actions:["查看客户360","生成风险复核"],dependency:["CRM客户API","事件服务"]},
          {id:"attribution-links",label:"归属关系",stage:"P1",summary:"归属判定主页：常驻IB/Affiliate隔离边界面板（双栏+互斥规则+通过率+越界拦截），归因异常吸收为「异常」视角。",objects:["点击","注册","客户","归属记录"],actions:["查看归属链路","复核归属"],dependency:["归因引擎","CRM"]},
          {id:"event-stream",label:"事件流水",stage:"P1",summary:"全链路事实底账：TraceId优先检索+事件链抽屉（点击→注册→FTD→计佣→结算中→释放→结算→提现）。",objects:["事件","TraceId","回传记录"],actions:["查询","补数","导出"],dependency:["事件Outbox","IMC"]},
          {id:"client-risk",label:"客户风险档案",stage:"P1",routeId:"admin-modules",tabId:"client-list",view:"risk",summary:"客户360风险视角：直达高风险客户筛选与抽屉「风险」页签（R档+设备/IP/支付关联+欺诈库引用）。",objects:["客户风险","风险事件","关联特征"],actions:["查看证据","生成风险复核"],dependency:["风控服务","CRM欺诈库"]},
          {id:"attribution-exception",label:"归因异常",stage:"P1",routeId:"admin-modules",tabId:"attribution-links",view:"exception",summary:"归属关系异常视角：重复归属、事件缺数、来源异常和官方路径异常，隔离面板越界拦截直达。",objects:["异常事件","缺口任务"],actions:["重算归属","补数","标记误报"],dependency:["归因引擎","Outbox"]}
        ]
      },
      {
        id:"promotion",title:"推广管理",items:[
          {id:"campaign-list",label:"活动管理",stage:"P1",summary:"活动创建、审核、上下线、国家适用范围矩阵和引用清单。",objects:["活动","国家","渠道"],actions:["创建","审核","启停","复制"],dependency:["活动服务"]},
          {id:"link-list",label:"推广链接",stage:"P1",summary:"官方链接生成、参数、启停、归属规则；Sub ID吸收为「渠道」视角（父子对象同上下文）。",objects:["推广链接","活动","Sub ID"],actions:["生成链接","启停","查看追踪"],dependency:["官方路径库"]},
          {id:"material-list",label:"素材库",stage:"P1",summary:"横幅、落地页、视频、GIF素材；列表/网格双视图+规格校验；审核与上下线。",objects:["素材","落地页","平台规格"],actions:["上传","审核","上下线"],dependency:["文件服务","合规审核"]},
          {id:"sub-channel",label:"二级渠道 / Sub ID",stage:"P1",routeId:"admin-modules",tabId:"link-list",view:"channel",summary:"推广链接「渠道」视角：Sub ID生成、启停、父链接归属与渠道效果摘要。",objects:["Sub ID","渠道","链接"],actions:["创建","禁用","查看报表"],dependency:["链接服务","报表API"]},
          {id:"postback",label:"回传配置",stage:"P1",summary:"Postback地址、参数映射编辑器、试投控制台与投递监控；配置+验证+监控三段式。",objects:["回传配置","平台","投递记录"],actions:["新增配置","测试","禁用"],dependency:["Postback服务"]},
          {id:"tracker",label:"链接追踪器",stage:"P1",summary:"点击会话检索与转化路径时间线（单点排查）；明细与渠道分析聚合用下钻打通。",objects:["点击","链接","转化"],actions:["查询","下钻","导出"],dependency:["IMC","事件服务"]}
        ]
      },
      {
        id:"funds",title:"佣金与资金",items:[
          {id:"commission-list",label:"佣金记录",stage:"P1",summary:"查看每笔佣金的资格档、里程碑、金额、结算状态、结算和TraceId。",objects:["佣金","客户","资格档"],actions:["查看计算过程","冲正","追回"],dependency:["账务服务"]},
          {id:"hold-workbench",label:"结算管理",stage:"MVP",routeId:"admin-review",tabId:"d-plus-n",summary:"处理理论基础结算期、风险附加、集群延长和D+N冻结复核。",objects:["结算中","佣金","冻结案件"],actions:["复核","解除","继续冻结"],dependency:["动态结算引擎"]},
          {id:"statement-list",label:"结算单",stage:"P1",summary:"管理结算批次、明细、税费、保证金、净额和下载。",objects:["结算单","佣金批次","合作方"],actions:["生成","确认","下载","重算"],dependency:["账务服务","文件服务"]},
          {id:"withdrawal-list",label:"提现管理",stage:"P1",summary:"处理提现申请、账户校验、手续费、支付状态和失败重试。",objects:["提现","收款账户","支付订单"],actions:["审核","重试","驳回"],dependency:["支付系统"]},
          {id:"guarantee-workbench",label:"保证金管理",stage:"MVP",routeId:"admin-review",tabId:"guarantee-offset",summary:"查看保证金余额、覆盖率、抵扣、释放和追索任务。",objects:["保证金","抵扣任务","潜在损失"],actions:["抵扣审批","释放","追索"],dependency:["账务服务"]},
          {id:"tax-list",label:"税费管理",stage:"P1",routeId:"admin-modules",tabId:"statement-list",view:"tax",summary:"结算与税费「税费」视角：税率、代扣状态、税单留痕与结算明细同源展示。",objects:["税务信息","税率","税单"],actions:["查看","核对","导出"],dependency:["财务服务"]},
          {id:"reversal-list",label:"冲正与追回",stage:"P1",summary:"处理拒付、冲正、追回、责任认定和账务重算。",objects:["冲正","追回","佣金"],actions:["发起","审批","重算"],dependency:["支付系统","账务服务"]},
          {id:"reconciliation",label:"资金对账",stage:"P1",summary:"对账Affiliate账务、支付结果和财务报表差异。",objects:["对账批次","差异记录"],actions:["自动对账","人工处理","导出"],dependency:["三方系统对账文件"]}
        ]
      },
      {
        id:"risk-compliance",title:"风控与合规",items:[
          {id:"hard-hit",label:"硬规则命中",stage:"MVP",routeId:"admin-risk",tabId:"hard-hit",summary:"查看官方路径、点击风险和实时拦截命中事实。",objects:["命中事实","规则","证据"],actions:["查看证据","生成复核"],dependency:["硬规则引擎"]},
          {id:"risk-event",label:"风险事件与评分",stage:"MVP",routeId:"admin-risk",tabId:"risk-event",summary:"查看风险事件、分值变化、R档结果和影响对象。",objects:["风险事件","评分","R档"],actions:["查看评分过程","生成复核"],dependency:["评分引擎"]},
          {id:"cluster-case",label:"集群识别",stage:"MVP",routeId:"admin-risk",tabId:"cluster",summary:"查看设备、IP、支付工具和行为集群关系图与成员。",objects:["集群案件","成员","关联特征"],actions:["查看关系图","生成处理任务"],dependency:["集群识别服务"]},
          {id:"violation-event",label:"违规事件",stage:"MVP",routeId:"admin-risk",tabId:"violation",summary:"查看虚假流量、违规素材、恶意注册和多层违规事实。",objects:["违规事件","证据","对象"],actions:["查看证据","生成处理任务"],dependency:["违规识别服务"]},
          {id:"crm-fraud",label:"CRM欺诈库",stage:"MVP",routeId:"admin-risk",tabId:"fraud",summary:"查看CRM欺诈库结论、本地引用状态和同步记录。",objects:["欺诈记录","引用对象"],actions:["查询","引用","同步记录"],dependency:["CRM欺诈库API"]},
          {id:"blacklist",label:"黑名单管理",stage:"P1",summary:"管理设备、IP、支付工具、客户和合作方黑名单。",objects:["黑名单","风险对象"],actions:["加入","移出","审批"],dependency:["风控服务","审计"]},
          {id:"country-compliance",label:"国家与合规限制",stage:"MVP",routeId:"admin-config",tabId:"country-entity",summary:"维护开放国家、法律主体、禁投地区和合规条件。",objects:["国家","主体","合规限制"],actions:["配置","审批","生效"],dependency:["配置中心"]},
          {id:"quality-internal",label:"质量服务内部规则",stage:"MVP",routeId:"admin-config",tabId:"qualification",summary:"维护有效FTD后的质量判断、规则版本和证据口径。",objects:["质量规则","里程碑","证据"],actions:["配置","试算","审批"],dependency:["质量服务引擎"]}
        ]
      },
      {
        id:"processing",title:"处理中心",items:[
          {id:"task-all",label:"全部任务",stage:"MVP",routeId:"admin-workbench",tabId:"tasks",summary:"集中处理待办、审批、超时、等待外部和失败任务。",objects:["任务","审批","集成任务"],actions:["认领","转办","审批","取消"],dependency:["任务中心"]},
          {id:"risk-review",label:"风险复核",stage:"MVP",routeId:"admin-review",tabId:"risk-review",summary:"处理风险结论、调查、隔离、解除和升级。",objects:["风险复核","案件组","隔离"],actions:["复核","结论","解除","升级"],dependency:["风控工作流"]},
          {id:"credit-adjust",label:"信用调级",stage:"MVP",routeId:"admin-review",tabId:"credit-level",summary:"处理临时调级、续期、提前终止和恢复异常。",objects:["调级申请","信用等级"],actions:["批准","拒绝","续期"],dependency:["信用服务"]},
          {id:"cluster-hold",label:"集群结算延长",stage:"MVP",routeId:"admin-review",tabId:"cluster-hold",summary:"处理集群自动延长、上限触发和强制人工任务。",objects:["集群结算","延长记录"],actions:["继续冻结","解除","强制人工"],dependency:["动态结算"]},
          {id:"d-plus-n",label:"D+N冻结",stage:"MVP",routeId:"admin-review",tabId:"d-plus-n",summary:"处理D+N阈值触发、复核、重检和资金冻结。",objects:["冻结案件","佣金"],actions:["复核","解除","继续冻结"],dependency:["动态结算"]},
          {id:"appeal",label:"申诉处理",stage:"MVP",routeId:"admin-review",tabId:"appeal",summary:"处理合作方申诉、补材料、改判和补发。",objects:["申诉","证据","佣金"],actions:["要求补件","改判","补发"],dependency:["工单/消息服务"]},
          {id:"guarantee-offset",label:"保证金抵扣",stage:"MVP",routeId:"admin-review",tabId:"guarantee-offset",summary:"处理保证金抵扣、追索和账务重算。",objects:["抵扣任务","保证金"],actions:["审批","执行","重算"],dependency:["账务服务"]},
          {id:"cap-breaker",label:"上限与熔断",stage:"MVP",routeId:"admin-review",tabId:"cap-breaker",summary:"处理数量上限、突变熔断和人工复核。",objects:["上限任务","熔断事件"],actions:["通过","继续冻结","配置建议"],dependency:["护栏引擎"]},
          {id:"integration-task",label:"集成任务",stage:"MVP",routeId:"admin-review",tabId:"integration",summary:"处理事件缺数、回调失败、归因自检和技术重试。",objects:["集成任务","事件缺口"],actions:["重试","取消","补数"],dependency:["Outbox","外部API"]},
          {id:"support-ticket",label:"工单处理",stage:"P1",summary:"处理合作方一般支持工单、转办、SLA和答复。",objects:["工单","消息"],actions:["受理","转办","答复","关闭"],dependency:["工单系统"]}
        ]
      },
      {
        id:"analytics",title:"报表分析",items:[
          {id:"report-roi",label:"合作方ROI",stage:"MVP",routeId:"admin-performance",tabId:"roi",summary:"分析合作方、国家、渠道和Sub ID的转化与净成本。",objects:["合作方","国家","Sub ID","佣金"],actions:["下钻","生成建议","导出"],dependency:["报表API"]},
          {id:"report-quality",label:"质量看板",stage:"MVP",routeId:"admin-performance",tabId:"quality",summary:"监控转化质量、留存、拒付、冲正、欺诈和集群风险。",objects:["客户质量","损失","风险"],actions:["下钻","生成建议","导出"],dependency:["IMC","账务"]},
          {id:"report-guarantee",label:"保证金覆盖",stage:"MVP",routeId:"admin-performance",tabId:"guarantee-coverage",summary:"监控保证金、潜在损失、覆盖率和释放延迟。",objects:["保证金","潜在损失"],actions:["下钻","生成建议","导出"],dependency:["账务API"]},
          {id:"report-funnel",label:"转化漏斗",stage:"P1",routeId:"admin-performance",tabId:"roi",summary:"转化漏斗并入合作方ROI：可点击交互漏斗（点击任意级展开分层转化率与瓶颈定位）。",objects:["事件","客户","里程碑"],actions:["分层分析","下钻","导出"],dependency:["事件服务"]},
          {id:"report-channel",label:"渠道分析",stage:"P1",summary:"分析活动、链接、Sub ID、国家、设备和平台效果。",objects:["活动","链接","渠道"],actions:["对比","下钻","导出"],dependency:["推广数据"]},
          {id:"report-finance",label:"财务报表",stage:"P1",summary:"分析佣金、税费、保证金、提现、冲正和净支出。",objects:["账务","提现","冲正"],actions:["对账查询","导出"],dependency:["财务API"]},
          {id:"report-risk",label:"风控报表",stage:"P1",summary:"分析命中率、误报率、阻断金额、案件处理时效和损失回收。",objects:["风险事件","案件","损失"],actions:["趋势分析","下钻","导出"],dependency:["风控API"]}
        ]
      },
      {
        id:"config-release",title:"配置与发布",items:[
          {id:"config-overview",label:"配置总览",stage:"MVP",routeId:"admin-config",tabId:"overview",summary:"按业务配置域快速进入价格、资格、结算、资金和风控规则页面。",objects:["业务配置","规则域","审批"],actions:["查看配置域","进入配置","发起变更"],dependency:["配置中心","审批流"]},
          {id:"config-price",label:"价格表",stage:"MVP",routeId:"admin-config",tabId:"price",summary:"维护国家、渠道、资格档和基础CPA价格版本。",objects:["价格规则","国家","资格档"],actions:["草稿","校验","试算","提交审批"],dependency:["配置审批"]},
          {id:"config-qualification",label:"资格档与里程碑",stage:"MVP",routeId:"admin-config",tabId:"qualification",summary:"配置L1-L4、FTD、有效FTD和质量服务里程碑。",objects:["资格规则","里程碑"],actions:["配置","试算","审批"],dependency:["质量服务"]},
          {id:"config-credit",label:"信用等级与权益",stage:"MVP",routeId:"admin-config",tabId:"credit-benefit",summary:"配置C0-C4权益、附加比例、结算期、保证金和额度。",objects:["信用权益","等级"],actions:["配置","试算","审批"],dependency:["信用服务"]},
          {id:"config-hold",label:"动态结算规则",stage:"MVP",routeId:"admin-config",tabId:"hold",summary:"配置基础R档、国家附加、支付附加、信用调整和D+N。",objects:["结算期规则","风险档"],actions:["配置","组合试算","审批"],dependency:["动态结算"]},
          {id:"config-guarantee-tax",label:"保证金与税费规则",stage:"MVP",routeId:"admin-config",tabId:"guarantee-tax",summary:"配置保证金比例、释放周期、税率和手续费口径。",objects:["保证金","税费","手续费"],actions:["配置","审批","生效"],dependency:["财务规则"]},
          {id:"config-approval",label:"审批流配置",stage:"MVP",routeId:"admin-config",tabId:"approval",summary:"配置审批节点、角色、自审、SLA和流转规则。",objects:["审批流","节点","角色"],actions:["配置","试运行","审批"],dependency:["工作流引擎"]},
          {id:"config-simulation",label:"规则试算",stage:"MVP",routeId:"admin-config",tabId:"simulation",summary:"查看新旧规则差异、命中对象、资金影响和护栏结果。",objects:["试算任务","规则差异"],actions:["试算","查看结果","导出"],dependency:["配置中心","试算服务"]},
          {id:"config-cluster",label:"集群规则",stage:"MVP",routeId:"admin-config",tabId:"cluster-rule",summary:"配置强弱特征、窗口、阈值和人工上限。",objects:["集群规则","特征"],actions:["配置","试算","审批"],dependency:["集群引擎"]},
          {id:"config-hard-rule",label:"硬规则",stage:"MVP",routeId:"admin-config",tabId:"hard-rule",summary:"维护官方路径、点击风险、黑名单和实时拦截。",objects:["硬规则","官方路径"],actions:["配置","影子运行","审批"],dependency:["硬规则引擎"]},
          {id:"config-risk-score",label:"风险评分规则",stage:"MVP",routeId:"admin-config",tabId:"risk-score",summary:"维护风险事件权重、分值、R档和处置映射。",objects:["评分规则","事件权重"],actions:["配置","试算","审批"],dependency:["评分引擎"]},
          {id:"config-violation",label:"违规规则",stage:"MVP",routeId:"admin-config",tabId:"violation-rule",summary:"配置违规类型、认定条件、证据和处理动作。",objects:["违规规则","证据"],actions:["配置","试算","审批"],dependency:["违规引擎"]},
          {id:"config-dictionary",label:"参数字典",stage:"P1",summary:"统一管理全局参数、参考范围、生产值、责任角色和变更记录。",objects:["参数","参考范围"],actions:["查询","变更","审批"],dependency:["配置中心"]},
          {id:"config-permission",label:"权限与菜单",stage:"P1",summary:"管理角色、页面、按钮、API和数据范围权限。",objects:["角色","菜单","权限"],actions:["配置","复制","审计"],dependency:["权限服务"]}
        ]
      },
      {
        id:"audit-governance",title:"审计与治理",items:[
          {id:"audit-operation",label:"操作审计",stage:"MVP",action:"audit",summary:"查询配置、审批、资金、导出、集成和签核操作记录。",objects:["审计记录","TraceId"],actions:["查询","导出","追溯"],dependency:["审计日志"]},
          {id:"audit-self-review",label:"自审记录",stage:"MVP",action:"audit",summary:"查询self_review=true的提交与审批双记录。",objects:["自审审计","审批事务"],actions:["查询","事务对比","导出"],dependency:["审计日志"]},
          {id:"export-center",label:"导出中心",stage:"MVP",routeId:"admin-review",tabId:"integration",summary:"管理异步导出、脱敏、审批、下载和24小时过期。",objects:["导出任务","文件"],actions:["审批","下载","取消"],dependency:["文件服务","审计"]},
          {id:"field-auth",label:"敏感字段授权",stage:"MVP",routeId:"admin-review",tabId:"integration",summary:"管理邮箱、手机号、证件、银行卡和设备指纹字段授权。",objects:["字段授权","申请人"],actions:["批准","拒绝","撤销"],dependency:["数据治理"]},
          {id:"deletion",label:"删除与匿名化",stage:"MVP",routeId:"admin-review",tabId:"integration",summary:"管理保留期到期、用户删除请求和匿名化任务。",objects:["删除任务","保留策略"],actions:["审批","执行","取消"],dependency:["数据治理"]},
          {id:"breach",label:"Breach事件",stage:"MVP",routeId:"admin-review",tabId:"integration",summary:"记录安全事件、影响数据、通知SLA和处置过程。",objects:["Breach","受影响数据"],actions:["记录通知","处置","关闭"],dependency:["安全流程"]},
          {id:"retention",label:"数据保留策略",stage:"MVP",routeId:"admin-review",tabId:"integration",summary:"管理点击证据、身份资料、导出文件和审计日志保留期。",objects:["数据类型","保留策略"],actions:["配置","审批","到期处理"],dependency:["数据治理"]}
        ]
      }
    ],
    // 左侧导航只暴露高频业务入口；细分视角继续承载在页面内页签、阶段看板和详情抽屉。
    // 完整页面清单保留在 moduleBlueprint，旧 URL 仍由统一路由承载。
    menuBlueprint: [
      {
        id:"dashboard", title:"仪表盘", match:{routeId:"admin-workbench",tabIds:["tasks"]}, items:[
          {id:"nav-dashboard",label:"仪表盘",stage:"MVP",routeId:"admin-workbench",tabId:"tasks",summary:"查看业务快照、待处理任务、资金与异常。",objects:["业务指标","任务","资金","异常信号"],actions:["切换统计范围","筛选待办","下钻详情"],dependency:["任务中心","指标服务","资金账务"]}
        ]
      },
      {
        id:"partners", title:"合作方", match:{routeId:"admin-modules",tabIds:["partner-list"]}, items:[
          {id:"nav-partners",label:"合作方列表",stage:"MVP",routeId:"admin-modules",tabId:"partner-list",summary:"合作方主数据列表；点击对象进入合作方360全屏详情。",objects:["合作方","CRM账户","KYC/KYB","信用","清退"],actions:["查看360","审核入驻","发起任务"],dependency:["CRM Partner API","信用服务","资金结算"]}
        ]
      },
      {
        id:"customers", title:"客户与归因", match:{routeId:"admin-modules",tabIds:["client-list","attribution-links","event-stream"]}, items:[
          {id:"nav-clients",label:"客户360",stage:"MVP",routeId:"admin-modules",tabId:"client-list",summary:"客户生命周期、转化阶段、佣金和风险档案统一查看。",objects:["客户","转化阶段","风险档案"],actions:["查看客户","生成风险复核","导出"],dependency:["CRM客户API","事件服务"]},
          {id:"nav-attribution",label:"归属与事件",stage:"MVP",routeId:"admin-modules",tabId:"attribution-links",summary:"归属关系、异常边界和TraceId事件流水统一排查入口。",objects:["归属记录","事件流水","TraceId"],actions:["检索链路","重算归属","补数"],dependency:["归因引擎","Outbox","IMC"]}
        ]
      },
      {
        id:"promotion", title:"推广", match:{routeId:"admin-modules",tabIds:["campaign-list","material-list","postback","tracker"]}, items:[
          {id:"nav-campaigns",label:"活动与链接",stage:"MVP",routeId:"admin-modules",tabId:"campaign-list",summary:"查看活动适用国家、官方链接引用和渠道效果，不在管理端手工生成链接。",objects:["活动","官方链接","国家"],actions:["查看活动","查看引用","下钻统计"],dependency:["活动服务","官方路径库"]},
          {id:"nav-materials",label:"素材库",stage:"MVP",routeId:"admin-modules",tabId:"material-list",summary:"官方素材列表/网格、平台规格和上下线状态。",objects:["素材","落地页","平台规格"],actions:["查看","下架","导出"],dependency:["文件服务","合规审核"]},
          {id:"nav-postback",label:"回传与追踪",stage:"MVP",routeId:"admin-modules",tabId:"postback",summary:"回传投递监控与点击转化链路排查统一入口。",objects:["回传配置","投递记录","点击会话"],actions:["查看投递","重试","打开事件链"],dependency:["Postback服务","IMC","事件服务"]}
        ]
      },
      {
        id:"funds", title:"资金", match:{routeId:"admin-modules",tabIds:["commission-list","statement-list","withdrawal-list","reversal-list","reconciliation"], routeTabs:{"admin-review":["d-plus-n","guarantee-offset"]}}, items:[
          {id:"nav-commissions",label:"佣金与结算",stage:"MVP",routeId:"admin-modules",tabId:"commission-list",summary:"佣金构成、计佣状态、结算阻断和结算单明细统一查看。",objects:["佣金","结算单","税费","保证金"],actions:["查看计算过程","查看结算单","导出"],dependency:["账务服务","动态结算","财务规则"]},
          {id:"nav-withdrawals",label:"提现与对账",stage:"MVP",routeId:"admin-modules",tabId:"withdrawal-list",summary:"提现申请、支付状态、冲正追回和内部对账统一查看。",objects:["提现","支付订单","冲正","对账"],actions:["审核提现","重试支付","处理差异"],dependency:["支付系统","账务服务"]},
          {id:"nav-funds-review",label:"资金异常任务",stage:"MVP",routeId:"admin-review",tabId:"d-plus-n",summary:"处理D+N冻结、保证金抵扣、Hold异常和账务追索任务。",objects:["冻结案件","保证金","Hold","追索"],actions:["复核","解除","抵扣","重算"],dependency:["动态结算","账务服务","任务中心"]}
        ]
      },
      {
        id:"risk", title:"风控与合规", match:{routeId:"admin-risk",tabIds:["hard-hit","risk-event","credit-insight","cluster","violation","fraud"], routeTabs:{"admin-review":["risk-review"],"admin-config":["country-entity","qualification","hard-rule","risk-score","violation-rule","cluster-rule"]}}, items:[
          {id:"nav-risk",label:"风险工作台",stage:"MVP",routeId:"admin-risk",tabId:"risk-event",summary:"风险对象、事件评分、集群关系和CRM欺诈结论统一识别。",objects:["风险事件","R档","集群","欺诈库"],actions:["查看证据","生成处理任务","导出"],dependency:["风控服务","CRM欺诈库"]},
          {id:"nav-risk-review",label:"案件与合规任务",stage:"MVP",routeId:"admin-review",tabId:"risk-review",summary:"调查、隔离、黑名单复核和申诉等人工结论统一处理。",objects:["风险案件","黑名单","申诉","国家限制"],actions:["认领","复核","升级","审批"],dependency:["风控工作流","任务中心","合规服务"]}
        ]
      },
      {
        id:"processing", title:"任务处理", match:{routeId:"admin-review",tabIds:["appeal","credit-level","cluster-hold","cap-breaker","integration"], routeTabs:{"admin-modules":["support-ticket"]}}, items:[
          {id:"nav-tasks",label:"任务队列",stage:"MVP",routeId:"admin-workbench",tabId:"tasks",summary:"按角色集中查看待办、待审批、超时和集成失败任务。",objects:["任务","审批","SLA"],actions:["认领","转办","跳转专项页"],dependency:["任务中心"]},
          {id:"nav-appeals",label:"申诉与工单",stage:"MVP",routeId:"admin-review",tabId:"appeal",summary:"申诉材料、一般工单和跨团队转办统一处理。",objects:["申诉","工单","补充材料"],actions:["要求补件","改判","转风险复核"],dependency:["工单系统","消息服务"]},
          {id:"nav-integrations",label:"集成与数据治理",stage:"MVP",routeId:"admin-review",tabId:"integration",summary:"处理回调失败、事件缺数、导出、字段授权和数据治理任务。",objects:["集成任务","事件缺口","导出","数据治理"],actions:["重试","补数","审批导出","授权字段"],dependency:["Outbox","外部API","数据治理"]}
        ]
      },
      {
        id:"reports", title:"报表", match:{routeId:"admin-performance",tabIds:["roi","quality","guarantee-coverage"], routeTabs:{"admin-modules":["report-channel","report-finance","report-risk"]}}, items:[
          {id:"nav-performance",label:"经营与转化",stage:"MVP",routeId:"admin-performance",tabId:"roi",summary:"经营ROI、转化漏斗、国家和渠道表现统一分析。",objects:["合作方","国家","渠道","有效FTD"],actions:["下钻","生成建议","导出"],dependency:["报表API","事件服务"]},
          {id:"nav-quality",label:"质量与资金分析",stage:"MVP",routeId:"admin-performance",tabId:"quality",summary:"质量服务、保证金覆盖、资金趋势和风险损失统一分析。",objects:["质量服务","保证金","损失","风险"],actions:["下钻","导出","生成建议"],dependency:["IMC","账务API","风控API"]}
        ]
      },
      {
        id:"config-reward", title:"业务配置 · 奖励与资格", match:{routeId:"admin-config",tabIds:["price","qualification","quality-service","credit-benefit","partner-tier","country-entity"]}, items:[
          {id:"nav-config-overview",label:"配置总览",stage:"MVP",routeId:"admin-config",tabId:"overview",summary:"按业务配置域快速进入价格、资格、信用和国家主体规则。",objects:["业务配置","奖励规则"],actions:["查看配置域","进入配置","发起变更"],dependency:["配置中心","审批流"]},
          {id:"nav-config-price",label:"价格表",stage:"MVP",routeId:"admin-config",tabId:"price",summary:"维护国家、渠道、资格档和基础CPA价格。",objects:["价格规则","国家","资格档"],actions:["配置","试算","提交审批"],dependency:["配置中心"]},
          {id:"nav-config-qualification",label:"资格档与里程碑",stage:"MVP",routeId:"admin-config",tabId:"qualification",summary:"配置L1-L4、FTD、有效FTD和质量服务里程碑。",objects:["资格规则","里程碑"],actions:["配置","试算","审批"],dependency:["质量服务"]},
          {id:"nav-config-quality",label:"质量服务规则",stage:"MVP",routeId:"admin-config",tabId:"quality-service",summary:"配置有效FTD后的活跃度、留存、观察期和质量服务条件。",objects:["质量服务","观察期"],actions:["配置","试算","审批"],dependency:["质量服务"]},
          {id:"nav-config-credit",label:"信用等级与权益",stage:"MVP",routeId:"admin-config",tabId:"credit-benefit",summary:"维护C0-C4信用权益及其对结算、保证金的调整。",objects:["信用权益","等级"],actions:["配置","试算","审批"],dependency:["信用服务"]},
          {id:"nav-config-partner-tier",label:"合作者等级与个人附加",stage:"P1",routeId:"admin-config",tabId:"partner-tier",summary:"P1扩展：根据合作时间和有效客户数量提升等级并减少基础结算中天数。",objects:["合作者等级","合作时间","客户数量"],actions:["配置","试算","审批"],dependency:["合作者档案"]},
          {id:"nav-config-country",label:"国家与主体",stage:"MVP",routeId:"admin-config",tabId:"country-entity",summary:"维护开放国家、法律主体、国家系数和合规限制。",objects:["国家","法律主体","国家系数"],actions:["配置","审核","审批"],dependency:["合规服务"]}
        ]
      },
      {
        id:"config-settlement", title:"业务配置 · 结算规则", match:{routeId:"admin-config",tabIds:["hold","d-plus-n"]}, items:[
          {id:"nav-config-hold",label:"动态结算",stage:"MVP",routeId:"admin-config",tabId:"hold",summary:"配置基础结算期、国家附加、支付方式附加、信用调整和案件叠加。",objects:["结算期","风险档","支付方式"],actions:["配置","组合试算","审批"],dependency:["动态结算"]},
          {id:"nav-config-dn",label:"D+N与熔断护栏",stage:"MVP",routeId:"admin-config",tabId:"d-plus-n",summary:"配置结算超时冻结、自动放行和金额数量护栏。",objects:["冻结护栏","自动放行","熔断"],actions:["配置","试算","审批"],dependency:["结算服务","风控服务"]}
        ]
      },
      {
        id:"config-funds", title:"业务配置 · 结算与资金", match:{routeId:"admin-config",tabIds:["guarantee-tax","settlement-withdrawal"]}, items:[
          {id:"nav-config-funds",label:"保证金与税费",stage:"MVP",routeId:"admin-config",tabId:"guarantee-tax",summary:"维护保证金比例、释放周期、税率、手续费和抵扣口径。",objects:["保证金","税费","手续费"],actions:["配置","试算","审批"],dependency:["财务规则"]},
          {id:"nav-config-settlement-withdrawal",label:"结算与提现规则",stage:"MVP",routeId:"admin-config",tabId:"settlement-withdrawal",summary:"配置结算资格、提现审批、账户校验、手续费展示和失败处理。",objects:["结算资格","提现","收款账户"],actions:["配置","试算","审批"],dependency:["账务系统","支付系统"]}
        ]
      },
      {
        id:"config-risk", title:"业务配置 · 风控规则", match:{routeId:"admin-config",tabIds:["cluster-rule","hard-rule","risk-score","violation-rule","risk-propagation"]}, items:[
          {id:"nav-config-cluster",label:"集群识别与集群结算中",stage:"MVP",routeId:"admin-config",tabId:"cluster-rule",summary:"配置设备、IP、支付工具和行为集群特征、窗口与阈值。",objects:["集群规则","特征","窗口"],actions:["配置","试算","审批"],dependency:["集群引擎"]},
          {id:"nav-config-hard",label:"D1-D10硬规则",stage:"MVP",routeId:"admin-config",tabId:"hard-rule",summary:"维护D1-D10事件、附加结算中天数、审批与超时处理。",objects:["D1-D10","风险事件","审批策略"],actions:["配置","影子运行","审批"],dependency:["硬规则引擎"]},
          {id:"nav-config-score",label:"风险评分规则",stage:"MVP",routeId:"admin-config",tabId:"risk-score",summary:"维护风险事件权重、分值、R档和处置映射。",objects:["评分规则","R0-R3","事件权重"],actions:["配置","试算","审批"],dependency:["评分引擎"]},
          {id:"nav-config-violation",label:"违规规则",stage:"MVP",routeId:"admin-config",tabId:"violation-rule",summary:"配置违规类型、认定条件、证据和处理动作。",objects:["违规规则","证据","处置"],actions:["配置","试算","审批"],dependency:["违规引擎"]},
          {id:"nav-config-propagation",label:"合作者风险传导",stage:"MVP",routeId:"admin-config",tabId:"risk-propagation",summary:"配置客户风险向合作者信用、结算中和保证金传导的条件与动作。",objects:["风险传导","信用等级","保证金"],actions:["配置","试算","审批"],dependency:["信用服务","风控服务"]}
        ]
      },
      {
        id:"config-governance", title:"业务配置 · 流程与治理", match:{routeId:"admin-config",tabIds:["approval","simulation","data-governance","official-content"]}, items:[
          {id:"nav-config-approval",label:"审批流与自动审核",stage:"MVP",routeId:"admin-config",tabId:"approval",summary:"配置审批节点、角色、自审、SLA和流转规则。",objects:["审批流","节点","角色"],actions:["配置","试运行","审批"],dependency:["工作流引擎"]},
          {id:"nav-config-simulation",label:"规则试算",stage:"MVP",routeId:"admin-config",tabId:"simulation",summary:"查看新旧规则差异、命中对象、资金影响和护栏结果。",objects:["试算任务","规则差异"],actions:["试算","查看结果","导出"],dependency:["配置中心","试算服务"]},
          {id:"nav-config-data",label:"数据治理规则",stage:"MVP",routeId:"admin-config",tabId:"data-governance",summary:"配置数据分级、保留删除、事件质量和Breach响应规则。",objects:["数据治理","保留策略","Breach"],actions:["配置","审批","到期处理"],dependency:["数据治理"]},
          {id:"nav-config-content",label:"官方路径治理",stage:"MVP",routeId:"admin-config",tabId:"official-content",summary:"配置系统生成的官方路径和落地页；素材由素材管理菜单维护。",objects:["官方路径","落地页","上下线"],actions:["配置","审核","上下线"],dependency:["内容治理"]}
        ]
      },
      {
        id:"system-settings", title:"系统管理", match:{routeId:"admin-system-config",tabIds:["system"]}, items:[
          {id:"nav-system-settings",label:"系统配置",stage:"MVP",routeId:"admin-system-config",tabId:"system",summary:"管理平台运行、连接、通知、展示和运维参数，不进入业务规则配置。",objects:["系统参数","运行开关","集成设置"],actions:["编辑","启停","保存"],dependency:["系统设置","审计日志"]}
        ]
      },
      {
        id:"access", title:"权限与审计", match:{routeId:"admin-modules",tabIds:["config-permission"]}, items:[
          {id:"nav-access",label:"权限与菜单",stage:"MVP",routeId:"admin-modules",tabId:"config-permission",summary:"管理角色、页面、按钮、API、数据范围权限和操作审计。",objects:["角色","权限","审计","TraceId"],actions:["配置权限","查询审计","导出"],dependency:["权限服务","审计日志"]}
        ]
      }
    ],
    routes: [
      {id:"admin-workbench", title:"仪表盘", group:"总览", description:"查看业务快照、待处理任务、资金与异常。", kind:"global", tabs:workbenchTabs},
      {id: "admin-config", title: "配置中心", group: "运营管理", description: "按业务域管理价格、资格、结算、资金、风控和治理规则。", tabs: configTabs},
      {id: "admin-system-config", title: "系统管理", group: "平台管理", description: "管理不进入业务规则配置的运行、连接、通知、展示和运维参数。", tabs: systemConfigTabs},
      {id: "admin-risk", title: "识别中心", group: "风险识别", description: "只读呈现系统识别事实与影响链路", tabs: riskTabs},
      {id: "admin-review", title: "处理中心", group: "人工处理", description: "人工结论、资金动作和集成执行", tabs: reviewTabs},
      {id: "admin-performance", title: "报表中心", group: "数据分析", description: "ROI、质量和保证金覆盖分析", tabs: performanceTabs}
    ]
  };

  const adminPrototype = window.AFF_ADMIN_PROTOTYPE;
  const businessConfigGroupIds = new Set(["config-reward","config-settlement","config-funds","config-risk","config-governance"]);
  const businessConfigGroups = adminPrototype.menuBlueprint.filter(group => businessConfigGroupIds.has(group.id));
  adminPrototype.businessConfigMenuSections = businessConfigGroups.map(group => ({
    id: group.id,
    title: group.title.replace(/^业务配置\s*·\s*/, ""),
    // 配置总览是业务配置下的独立入口，不属于奖励与资格分组的子菜单。
    items: group.items.filter(item => item.id !== "nav-config-overview")
  }));
  adminPrototype.businessConfigMenuItems = adminPrototype.businessConfigMenuSections.flatMap(section => section.items);
  adminPrototype.menuBlueprint = adminPrototype.menuBlueprint
    .filter(group => !businessConfigGroupIds.has(group.id) && group.id !== "system-settings")
    .concat([{
      id:"system-settings",
      title:"系统设置",
      match:{
        routeId:"admin-config",
        tabIds:configTabs.map(item => item.id),
        routeTabs:{"admin-system-config":["system"]}
      },
      items:[
        {
          id:"nav-business-config",
          label:"业务配置",
          stage:"MVP",
          routeId:"admin-config",
          tabId:"overview",
          summary:"业务配置包含版本控制，统一管理价格、资格、结算、资金、风控和治理规则。",
          objects:["业务配置","版本控制","审批"],
          actions:["查看配置","发起变更","提交审批"],
          dependency:["配置中心","审批流"]
        },
        {
          id:"nav-system-config",
          label:"系统配置",
          stage:"MVP",
          routeId:"admin-system-config",
          tabId:"system",
          summary:"系统配置不包含版本控制，独立管理运行、连接、通知、展示和运维参数。",
          objects:["系统参数","运行开关","集成设置"],
          actions:["编辑","启停","保存"],
          dependency:["系统设置","审计日志"]
        }
      ]
    }]);
  const moduleSchemaDefaults = {
    dashboard:{
      columns:[
        {key:"name",label:"指标"},{key:"type",label:"指标类型"},{key:"status",label:"状态"},
        {key:"progress",label:"当前值",unit:"%"},{key:"amount",label:"影响金额",numeric:true},
        {key:"owner",label:"责任角色"},{key:"updated",label:"更新时间"}
      ],
      statuses:["active","processing","pending_approval","waiting_external"]
    },
    partners:{
      columns:[
        {key:"name",label:"合作方"},{key:"type",label:"类型"},{key:"country",label:"国家"},
        {key:"stage",label:"生命周期"},{key:"certs",label:"KYC/KYB"},{key:"credit",label:"信用"},
        {key:"amount",label:"累计佣金",numeric:true},{key:"owner",label:"责任角色"}
      ],
      statuses:["active","pending","pending_review","processing","returned","closed"]
    },
    attribution:{
      columns:[
        {key:"name",label:"对象"},{key:"source",label:"来源"},{key:"country",label:"国家"},
        {key:"status",label:"状态"},{key:"risk",label:"风险"},{key:"owner",label:"责任角色"},{key:"updated",label:"更新时间"}
      ],
      statuses:["success","pending","processing","waiting_external","failed"]
    },
    promotion:{
      columns:[
        {key:"name",label:"推广对象"},{key:"type",label:"类型"},{key:"country",label:"国家"},
        {key:"status",label:"状态"},{key:"owner",label:"责任角色"},{key:"progress",label:"使用率",unit:"%"},{key:"updated",label:"更新时间"}
      ],
      statuses:["active","pending","draft","returned","blocked"]
    },
    funds:{
      columns:[
        {key:"name",label:"资金对象"},{key:"type",label:"类型"},{key:"status",label:"状态"},
        {key:"amount",label:"金额",numeric:true},{key:"owner",label:"责任角色"},{key:"risk",label:"风险"},{key:"updated",label:"更新时间"}
      ],
      statuses:["pending","pending_approval","processing","success","failed","reconcile_failed"]
    },
    "risk-compliance":{
      columns:[
        {key:"name",label:"风险对象"},{key:"type",label:"类型"},{key:"status",label:"状态"},
        {key:"risk",label:"风险"},{key:"owner",label:"责任角色"},{key:"amount",label:"影响金额",numeric:true},{key:"updated",label:"更新时间"}
      ],
      statuses:["active","pending_review","confirmed","false_positive","blocked"]
    },
    processing:{
      columns:[
        {key:"name",label:"任务"},{key:"type",label:"任务类型"},{key:"priority",label:"优先级"},
        {key:"status",label:"状态"},{key:"owner",label:"处理人"},{key:"due",label:"SLA"},{key:"amount",label:"影响金额",numeric:true}
      ],
      statuses:["pending","processing","supplementing","pending_approval","closed"]
    },
    analytics:{
      columns:[
        {key:"name",label:"分析维度"},{key:"country",label:"国家"},{key:"progress",label:"指标值",unit:"%"},
        {key:"amount",label:"金额",numeric:true},{key:"status",label:"结论"},{key:"risk",label:"风险"},{key:"owner",label:"分析角色"}
      ],
      statuses:["scale_up","observe","review","limit"]
    },
    "config-release":{
      columns:[
        {key:"name",label:"配置对象"},{key:"version",label:"版本"},{key:"status",label:"状态"},
        {key:"owner",label:"责任角色"},{key:"impact",label:"影响范围"},{key:"updated",label:"更新时间"}
      ],
      statuses:["active","draft","pending_approval","scheduled","activation_failed"]
    }
  };
  const moduleOverrides = {
    "partner-list":{entity:"合作方",prefix:"Partner",profile:"partner360"},
    "client-list":{entity:"客户",prefix:"Client",profile:"client360",columns:[
      {key:"name",label:"客户"},{key:"partner",label:"合作方"},{key:"source",label:"归属来源"},{key:"country",label:"国家"},
      {key:"stage",label:"生命周期"},{key:"ftdAmount",label:"FTD金额",numeric:true},{key:"riskGrade",label:"风险等级"},{key:"attributedAt",label:"归属时间"}
    ],statuses:["registered","ftd","valid_ftd","churned"]},
    "attribution-links":{entity:"归属记录",prefix:"ATTR",profile:"attribution360",columns:[
      {key:"client",label:"客户"},{key:"partner",label:"合作方"},{key:"channel",label:"渠道"},{key:"subId",label:"Sub ID"},
      {key:"rule",label:"归属规则"},{key:"traceId",label:"TraceId"},{key:"status",label:"状态"},{key:"risk",label:"风险"}
    ],statuses:["success","pending","processing","failed","waiting_external","confirmed"]},
    "event-stream":{entity:"事件流水",prefix:"EVT",profile:"eventChain",names:["注册事件","入金回调","交易事件","Postback投递"],types:["点击","注册","入金","交易","回传"],sources:["Outbox","CRM","支付"]},
    "campaign-list":{entity:"活动",prefix:"CMP",profile:"campaign",names:["TH Q4 Crypto Search","ID Finance Social","MY KOL Referral","VN Deposit Bonus"],types:["搜索","社交","KOL","买量"],sources:["活动中心"],columns:[
      {key:"name",label:"活动"},{key:"type",label:"类型"},{key:"country",label:"国家"},{key:"status",label:"状态"},
      {key:"progress",label:"进度",unit:"%"},{key:"amount",label:"30日转化",numeric:true},{key:"updated",label:"更新时间"}
    ],statuses:["active","pending","draft","returned","blocked"]},
    "link-list":{entity:"推广链接",prefix:"LNK",profile:"link360",columns:[
      {key:"name",label:"链接"},{key:"type",label:"类型"},{key:"campaign",label:"所属活动"},{key:"country",label:"国家"},
      {key:"rule",label:"归属规则"},{key:"clicks30d",label:"30日点击",numeric:true},{key:"status",label:"状态"}
    ],statuses:["active","processing","blocked","paused"]},
    "material-list":{entity:"素材",prefix:"MAT",profile:"material",columns:[
      {key:"name",label:"素材"},{key:"type",label:"类型"},{key:"platform",label:"平台"},{key:"size",label:"尺寸"},
      {key:"specCheck",label:"规格校验"},{key:"state",label:"状态"},{key:"uploadedAt",label:"上传时间"}
    ],statuses:["active","pending_review","rejected","offline"]},
    "postback":{entity:"回传配置",prefix:"PB",profile:"postback",columns:[
      {key:"name",label:"配置"},{key:"platformLabel",label:"平台"},{key:"events",label:"回传事件"},{key:"status",label:"状态"},
      {key:"deliveryRate",label:"30日成功率"},{key:"lastTestResult",label:"最近试投"},{key:"updatedAt",label:"更新时间"}
    ],statuses:["active","processing","paused"]},
    "tracker":{entity:"点击会话",prefix:"CLK",profile:"tracker",columns:[
      {key:"id",label:"点击ID"},{key:"linkName",label:"链接"},{key:"subId",label:"Sub ID"},{key:"country",label:"国家"},
      {key:"device",label:"设备"},{key:"pathSummary",label:"转化进度"},{key:"clickedAt",label:"点击时间"}
    ],statuses:[]},
    "commission-list":{entity:"佣金",prefix:"COMM",names:["注册+有效FTD佣金","质量服务佣金","附加佣金","保证金前净额","违规清零佣金"],types:["基础","附加","质量","冲正前"],sources:["账务服务"],columns:[
      {key:"name",label:"佣金对象"},{key:"partner",label:"合作方"},{key:"type",label:"构成"},{key:"amount",label:"金额",numeric:true},
      {key:"status",label:"计佣状态"},{key:"settlementBlock",label:"结算"},{key:"updated",label:"时间"}
    ],statuses:["pending","processing","failed","blocked","released"]},
    "statement-list":{entity:"结算单",prefix:"STMT",names:["周结算批次","月结算批次","补发结算","重算结算"],types:["周结","月结","补发","重算"],sources:["账务服务"],columns:[
      {key:"name",label:"结算批次"},{key:"partner",label:"合作方"},{key:"grossLabel",label:"佣金合计"},{key:"taxLabel",label:"税费代扣"},
      {key:"guaranteeLabel",label:"保证金"},{key:"netLabel",label:"净额"},{key:"status",label:"状态"}
    ],statuses:["draft","pending_approval","confirmed","paid"]},
    "withdrawal-list":{entity:"提现",prefix:"WD",names:["银行提现","电子钱包提现","失败重试","高风险复核"],types:["银行","钱包","重试","复核"],sources:["支付系统"],columns:[
      {key:"name",label:"提现申请"},{key:"partner",label:"合作方"},{key:"amount",label:"金额",numeric:true},
      {key:"fee",label:"手续费",numeric:true},{key:"status",label:"支付状态"},{key:"updated",label:"申请时间"}
    ],statuses:["pending","processing","success","failed","manual_required"]},
    "reversal-list":{entity:"冲正追回",prefix:"REV",names:["拒付冲正","欺诈追回","保证金抵扣","账务重算"],types:["拒付","欺诈","追回","重算"],sources:["支付系统"],columns:[
      {key:"name",label:"冲正案件"},{key:"partner",label:"合作方"},{key:"type",label:"类型"},{key:"amount",label:"金额",numeric:true},
      {key:"liable",label:"责任认定"},{key:"status",label:"状态"},{key:"updated",label:"时间"}
    ],statuses:["pending","processing","confirmed","executed","overturned"]},
    "reconciliation":{entity:"对账批次",prefix:"REC",names:["日结对账","支付对账","财务报表对账","佣金差异处理"],types:["日结","支付","财务","差异"],sources:["三方对账"],columns:[
      {key:"name",label:"对账批次"},{key:"type",label:"类型"},{key:"affiliate",label:"Affiliate账务"},{key:"external",label:"外部账务"},
      {key:"diffLabel",label:"差异"},{key:"status",label:"关账状态"},{key:"updated",label:"时间"}
    ],statuses:["processing","success","reconcile_failed","manual_required"]},
    blacklist:{entity:"黑名单",prefix:"BL",names:["设备黑名单","IP段黑名单","支付工具黑名单","客户黑名单","合作方黑名单"],types:["设备","IP","支付","客户","合作方"],sources:["风控服务"],columns:[
      {key:"name",label:"黑名单对象"},{key:"type",label:"类型"},{key:"value",label:"特征值"},{key:"reason",label:"加入原因"},
      {key:"status",label:"状态"},{key:"updated",label:"时间"}
    ],statuses:["pending_review","active","removed"]},
    "support-ticket":{entity:"工单",prefix:"TK",names:["结算咨询","链接失效","素材申诉","佣金争议"],types:["咨询","异常","申诉","争议"],sources:["工单系统"],columns:[
      {key:"name",label:"工单"},{key:"partner",label:"合作方"},{key:"type",label:"类型"},{key:"priority",label:"优先级"},
      {key:"status",label:"状态"},{key:"updated",label:"时间"}
    ],statuses:["pending","processing","waiting_external","closed"]},
    "report-channel":{entity:"渠道分析",prefix:"CHN",names:["TikTok渠道","YouTube渠道","Telegram渠道","KOL渠道","Facebook渠道"],types:["活动","链接","Sub ID","国家"],sources:["报表服务"],columns:[
      {key:"name",label:"渠道"},{key:"country",label:"主国家"},{key:"clicks30d",label:"点击",numeric:true},
      {key:"convRate",label:"转化率"},{key:"roiLabel",label:"ROI"},{key:"risk",label:"风险"}
    ],statuses:["scale_up","observe","review","limit"]},
    "report-finance":{entity:"财务报表",prefix:"FIN",names:["佣金支出","税费汇总","保证金覆盖","冲正损失"],types:["佣金","税费","保证金","冲正"],sources:["财务API"],columns:[
      {key:"name",label:"科目"},{key:"period",label:"周期"},{key:"amount",label:"金额",numeric:true},
      {key:"trend",label:"环比"},{key:"status",label:"结论"},{key:"drill",label:"下钻"}
    ],statuses:["observe","review","limit"]},
    "report-risk":{entity:"风控报表",prefix:"RSK",names:["规则命中率","误报率","阻断金额","处理时效"],types:["规则","评分","集群","处理"],sources:["风控API"],columns:[
      {key:"name",label:"规则"},{key:"hitRate",label:"命中率"},{key:"falseRate",label:"误报率"},
      {key:"amount",label:"阻断金额",numeric:true},{key:"quadrant",label:"象限"},{key:"risk",label:"建议"}
    ],statuses:["observe","review","limit"]},
    "config-dictionary":{entity:"参数",prefix:"PRM",names:["基础结算期天数","国家风险系数","保证金比例","质量服务阈值","集群延长N"],types:["风控","价格","资金","质量"],sources:["配置中心"],columns:[
      {key:"name",label:"参数"},{key:"domain",label:"域"},{key:"current",label:"当前值"},{key:"range",label:"参考范围"},
      {key:"state",label:"状态"},{key:"updated",label:"确认时间"}
    ],statuses:["confirmed","pending_confirm","pending_approval"]},
    "config-permission":{entity:"权限",prefix:"PERM",names:["运营角色","风控主管角色","财务角色","审计角色","系统角色"],types:["页面","按钮","API","数据范围"],sources:["权限服务"],columns:[
      {key:"name",label:"角色"},{key:"pages",label:"页面范围"},{key:"sensitive",label:"敏感数据"},
      {key:"approval",label:"审批权限"},{key:"updated",label:"更新时间"}
    ],statuses:["active","draft"]}
  };
  const moduleItems = (adminPrototype.moduleBlueprint || adminPrototype.menuBlueprint)
    .flatMap(group => group.items.filter(item => !item.routeId && item.action !== "audit").map(item => ({group,item})));
  adminPrototype.moduleSchemas = Object.fromEntries(moduleItems.map(({group,item}) => {
    const defaults = moduleSchemaDefaults[group.id] || moduleSchemaDefaults.partners;
    const override = moduleOverrides[item.id] || {entity:item.label,prefix:item.id.toUpperCase(),names:[item.label],types:[item.label],sources:[item.group]};
    return [item.id,{
      ...override,
      id:item.id,
      groupId:group.id,
      groupTitle:group.title,
      columns:override.columns || defaults.columns,
      statuses:override.statuses || defaults.statuses,
      impact:`${item.objects.join(" / ")}`
    }];
  }));  adminPrototype.routes.push({
    id:"admin-modules",title:"业务模块",group:"完整原型",kind:"module",
    description:"承载完整产品蓝图中的P1/P2业务模块，每条菜单都有独立页面和数据对象。",
    tabs:moduleItems.map(({item}) => ({
      id:item.id,title:item.label,entity:adminPrototype.moduleSchemas[item.id].entity,
      description:item.summary,columns:adminPrototype.moduleSchemas[item.id].columns,
      statuses:adminPrototype.moduleSchemas[item.id].statuses,type:"模块",profile:"module"
    }))
  });
  moduleItems.forEach(({item}) => {
    item.routeId = "admin-modules";
    item.tabId = item.id;
  });

  adminPrototype.riskWorkbench = {
    seed:"risk-workbench-v1",
    serverNow:"2026-11-08T04:00:00.000Z",
    summary:{highRiskObjects:6,openTasks:3,pendingApprovals:1,frozenCases:2,frozenAmount:"300.00"},
    objects:[
      {id:"DEMO-P01",type:"partner",label:"合作方 DEMO-P01",maskedEmail:"op***@example.invalid",riskBand:"R2",basis:"related_max",credit:"C2",reason:"合作方聚合风险占比超阈值",reasonCount:2,affectedCases:1,affectedAmount:"100.00",taskSummary:"处理中 2 / 未认领 1",owner:"风控专员甲",sla:"2026-11-09 12:00:00",isOpen:true,updated:"2026-11-08 11:45:00",country:"TH",eventIds:["DEMO-E01","DEMO-E04","DEMO-E05","DEMO-E06"]},
      {id:"DEMO-P02",type:"partner",label:"合作方 DEMO-P02",maskedEmail:"pa***@example.invalid",riskBand:"R3",basis:"related_max",credit:"C1",reason:"关联客户超时结算信号待复核",reasonCount:1,affectedCases:1,affectedAmount:"200.00",taskSummary:"处理中 1 / 待审批 1",owner:"风控专员乙",sla:"2026-11-08 18:00:00",isOpen:true,updated:"2026-11-08 10:30:00",country:"ID",eventIds:["DEMO-E03"]},
      {id:"DEMO-G01",type:"cluster",label:"集群 DEMO-G01",maskedEmail:"-",riskBand:"R2",basis:"related_max",credit:"-",reason:"设备与支付工具共享特征",reasonCount:1,affectedCases:1,affectedAmount:"100.00",taskSummary:"处理中 1",owner:"风控专员甲",sla:"2026-11-10 12:00:00",isOpen:true,updated:"2026-11-08 09:20:00",country:"TH",eventIds:["DEMO-E05"]},
      {id:"DEMO-C01",type:"customer",label:"客户 DEMO-C01",maskedEmail:"cu***@example.invalid",riskBand:"R2",basis:"direct",credit:"-",reason:"规则命中与结算超时",reasonCount:2,affectedCases:2,affectedAmount:"100.00",taskSummary:"处理中 2",owner:"风控专员甲",sla:"2026-11-09 12:00:00",isOpen:true,updated:"2026-11-08 11:50:00",country:"TH",eventIds:["DEMO-E01","DEMO-E04","DEMO-E06"]},
      {id:"DEMO-C02",type:"customer",label:"客户 DEMO-C02",maskedEmail:"cu***@example.invalid",riskBand:"R2",basis:"direct",credit:"-",reason:"合作方聚合风险构成客户",reasonCount:1,affectedCases:0,affectedAmount:"0.00",taskSummary:"未认领 1",owner:"未分配",sla:"2026-11-10 12:00:00",isOpen:true,updated:"2026-11-08 08:40:00",country:"TH",eventIds:["DEMO-E04","DEMO-E05"]},
      {id:"DEMO-C03",type:"customer",label:"客户 DEMO-C03",maskedEmail:"tr***@example.invalid",riskBand:"R3",basis:"direct",credit:"-",reason:"结算超时信号待审批",reasonCount:1,affectedCases:1,affectedAmount:"200.00",taskSummary:"待审批 1",owner:"风控专员乙",sla:"2026-11-08 18:00:00",isOpen:true,updated:"2026-11-08 10:10:00",country:"ID",eventIds:["DEMO-E03"]},
    ],
    events:[
      {id:"DEMO-E01",type:"settlement_overdue",typeLabel:"结算超时",source:"规则引擎",primary:"DEMO-C01",related:["DEMO-P01"],riskBand:"R2",reason:"D+N超时，当前案件仍处于冻结",rule:"D30-SETTLEMENT",ruleVersion:"D30-2026.11",determination:"pending",signal:"open",funds:"冻结 1 笔 / USD 100.00",caseRefs:[{customer:"DEMO-C01",commission:"DEMO-CM01",settlement:"DEMO-ST01",partner:"DEMO-P01",settlement_batch_id:"DEMO-B01"}],taskIds:["DEMO-T01"],occurred:"2026-11-06 12:00:00",updated:"2026-11-08 11:45:00"},
      {id:"DEMO-E03",type:"settlement_overdue",typeLabel:"结算超时",source:"规则引擎",primary:"DEMO-C03",related:["DEMO-P02"],riskBand:"R3",reason:"D+N超时，需主管确认后重检",rule:"D30-SETTLEMENT",ruleVersion:"D30-2026.11",determination:"pending",signal:"pending_review",funds:"冻结 1 笔 / USD 200.00",caseRefs:[{customer:"DEMO-C03",commission:"DEMO-CM03",settlement:"DEMO-ST03",partner:"DEMO-P02",settlement_batch_id:"DEMO-B02"}],taskIds:["DEMO-T03"],approvalIds:["DEMO-A03"],occurred:"2026-11-05 12:00:00",updated:"2026-11-08 10:30:00"},
      {id:"DEMO-E04",type:"partner_risk_aggregation",typeLabel:"合作方聚合风险",source:"评分引擎",primary:"DEMO-P01",related:["DEMO-C01","DEMO-C02"],riskBand:"R2",reason:"高风险客户占比 2 / 10，超过配置阈值",rule:"PARTNER-RATIO-02",ruleVersion:"PARTNER-RATIO-02",determination:"pending",signal:"-",funds:"冻结 1 笔 / USD 100.00",caseRefs:[{customer:"DEMO-C01",commission:"DEMO-CM01",settlement:"DEMO-ST01",partner:"DEMO-P01"}],aggregationDetail:{event_id:"DEMO-E04",partner_id:"DEMO-P01",metric:"risk_customer_ratio",trigger_snapshot:{numerator:2,denominator:10,ratio:0.2,denominator_definition:"近30日完成KYC/KYB且归属于该合作方的客户",window_start:"2026-10-09",window_end:"2026-11-08",timezone:"Asia/Shanghai",threshold:0.15,config_version:"PARTNER-RATIO-02",customer_ids:["DEMO-C01","DEMO-C02"],case_refs:[{customer:"DEMO-C01",commission:"DEMO-CM01",settlement:"DEMO-ST01",partner:"DEMO-P01"}]},current_snapshot:{numerator:2,denominator:10,ratio:0.2,denominator_definition:"当前观察窗口内可评估客户",window_start:"2026-10-09",window_end:"2026-11-08",timezone:"Asia/Shanghai",threshold:0.15,config_version:"PARTNER-RATIO-02",customer_ids:["DEMO-C01","DEMO-C02"],case_refs:[{customer:"DEMO-C01",commission:"DEMO-CM01",settlement:"DEMO-ST01",partner:"DEMO-P01"}]},sourceScope:{global:false,partner_ids:["DEMO-P01"],country_codes:["TH"],case_refs:[{customer:"DEMO-C01",commission:"DEMO-CM01",settlement:"DEMO-ST01",partner:"DEMO-P01"}]},proposedScope:null,globalEscalationReason:null},taskIds:["DEMO-T04"],occurred:"2026-11-07 09:00:00",updated:"2026-11-08 09:20:00"},
      {id:"DEMO-E05",type:"cluster_detected",typeLabel:"集群识别",source:"集群服务",primary:"DEMO-G01",related:["DEMO-C01","DEMO-C02","DEMO-P01"],riskBand:"R2",reason:"同设备 + 同支付工具两条独立特征",rule:"CLUSTER-OPEN-23",ruleVersion:"CLUSTER-OPEN-23",determination:"pending",signal:"-",funds:"冻结 1 笔 / USD 100.00",caseRefs:[{customer:"DEMO-C01",commission:"DEMO-CM01",settlement:"DEMO-ST01",partner:"DEMO-P01"}],taskIds:["DEMO-T04"],occurred:"2026-11-07 08:30:00",updated:"2026-11-08 09:20:00"},
      {id:"DEMO-E06",type:"rule_hit",typeLabel:"规则命中",source:"CRM欺诈库",primary:"DEMO-C01",related:["DEMO-P01"],riskBand:"R2",reason:"CRM欺诈库只读引用命中",rule:"CRM-FRAUD-READONLY",ruleVersion:"CRM-FRAUD-READONLY",determination:"pending",signal:"-",funds:"冻结 1 笔 / USD 100.00",caseRefs:[{customer:"DEMO-C01",commission:"DEMO-CM01",settlement:"DEMO-ST01",partner:"DEMO-P01"}],taskIds:["DEMO-T01"],occurred:"2026-11-07 07:40:00",updated:"2026-11-08 11:50:00"}
    ],
    clusters:[{id:"DEMO-G01",members:2,partners:1,features:["设备","支付工具"],independent:2,exception:"-",status:"suspected",control:"hold_extended",riskBand:"R2",affectedCases:1,affectedAmount:"100.00",updated:"2026-11-08 09:20:00",memberRows:[
      ["DEMO-C01","DEMO-P01","DEMO-EDGE-01","设备","dev_***_81","设备服务","high","confirmed"],
      ["DEMO-C02","DEMO-P01","DEMO-EDGE-02","支付工具","pay_***_17","支付服务","medium","suspected"]
    ]}],
    blacklist:[
      {id:"DEMO-BL01",type:"设备",masked:"dev_***_81",scope:"主体：DEMO-C01",source:"affiliate",reason:"风险处置已生效",status:"active",effective:"2026-11-07 12:00:00",expires:"-",task:"-"},
      {id:"DEMO-BL02",type:"支付工具",masked:"pay_***_17",scope:"国家：TH",source:"crm",reason:"CRM欺诈库只读引用",status:"active",effective:"2026-11-01 12:00:00",expires:"2027-01-30 12:00:00",task:"-"}
    ],
    tasks:[
      {id:"DEMO-T01",purpose:"signal_review",purposeLabel:"信号复核",source:"DEMO-E01",status:"open",owner:"未认领",sla:"2026-11-09 12:00:00",approval:"-",execution:"-",cases:["DEMO-C01 / DEMO-CM01 / DEMO-ST01"],reason:"D+N超时案件逐案复核"},
      {id:"DEMO-T03",purpose:"signal_review",purposeLabel:"信号复核",source:"DEMO-E03",status:"processing",owner:"风控专员乙",sla:"2026-11-08 18:00:00",approval:"DEMO-A03 · 待审批",execution:"未创建",cases:["DEMO-C03 / DEMO-CM03 / DEMO-ST03"],reason:"主管审批前不得执行"},
      {id:"DEMO-T04",purpose:"risk_investigation",purposeLabel:"风险调查",source:"DEMO-E04",status:"processing",owner:"风控专员甲",sla:"2026-11-10 12:00:00",approval:"-",execution:"-",cases:["DEMO-C01 / DEMO-CM01 / DEMO-ST01"],reason:"合作方聚合调查与集群事实补证"}
    ],
    approvals:[{id:"DEMO-A03",task:"DEMO-T03",applicant:"风控专员乙",applicantId:"DEMO-U02",node:"风控主管",status:"pending_approval",execution:"未创建",reason:"申请信号确认；当前冻结仍保持",chain:["风控主管：待审批","合规：未进入"]}],
    executions:[],
    caseLinks:[
      {customer:"DEMO-C01",partner:"DEMO-P01",commission:"DEMO-CM01",settlement:"DEMO-ST01",amount:"100.00",frozen:"100.00",status:"frozen",restriction:"DEMO-RST-01",reason:"D+N超时冻结"},
      {customer:"DEMO-C01",partner:"DEMO-P01",commission:"DEMO-CM02",settlement:"DEMO-ST02",amount:"50.00",frozen:"0.00",status:"holding",restriction:"-",reason:"普通结算中，不受超时冻结影响"},
      {customer:"DEMO-C03",partner:"DEMO-P02",commission:"DEMO-CM03",settlement:"DEMO-ST03",amount:"200.00",frozen:"200.00",status:"frozen",restriction:"DEMO-RST-03",reason:"D+N超时冻结"}
    ]
  };
  (() => {
    const risk = adminPrototype.riskWorkbench;
    const roles = new Set(["risk","risk_supervisor","finance","compliance"]);
    const fields = new Set(["email","phone","device"]);
    const purposes = new Set(["risk_detail","risk_review","case_investigation"]);
    const values = {
      "DEMO-C01":{email:"customer-01@example.invalid",phone:"+66 81 234 4821",device:"dev_hash_81a7"},
      "DEMO-C02":{email:"customer-02@example.invalid",phone:"+66 81 234 4817",device:"dev_hash_17b2"},
      "DEMO-C03":{email:"customer-03@example.invalid",phone:"+62 812 334 4803",device:"dev_hash_03c1"},
      "DEMO-P01":{email:"partner-01@example.invalid",phone:"+66 81 234 4801",device:"partner_hash_01"},
      "DEMO-P02":{email:"partner-02@example.invalid",phone:"+62 812 334 4802",device:"partner_hash_02"}
    };
    const sessions = new Map();
    const roleScopes = new Map();
    const scopeIds = () => new Set((risk.objects || []).map(item => item.id));
    const resetScopes = () => {
      roleScopes.clear();
      roles.forEach(role => roleScopes.set(role,scopeIds()));
    };
    resetScopes();
    const fail = (code,message) => {const error = new Error(message);error.code=code;throw error;};
    const objectId = objectRef => typeof objectRef === "string" ? objectRef : objectRef?.id || objectRef?.object_id;
    const scopedObjectId = (role,objectRef) => {
      const id = objectId(objectRef);
      if (!roles.has(role) || !roleScopes.get(role)?.has(id)) fail("AFF-40301","当前角色无权查看该风险对象受限字段");
      return id;
    };
    const objectFor = objectRef => {
      const id = objectId(objectRef);
      const object = (risk.objects || []).find(item => item.id === id);
      if (!object) fail("AFF-40401","风险对象不存在");
      return {id,object};
    };
    const maskedValue = (id,field,object) => {
      const raw = values[id]?.[field];
      if (!raw) fail("AFF-40401","当前对象没有该受限字段");
      if (field === "email") {
        const [local,domain] = raw.split("@");
        return `${local.slice(0,2)}***@${domain}`;
      }
      if (field === "phone") return `${raw.slice(0,3)} •••• ${raw.slice(-4)}`;
      if (field === "device") return `${raw.startsWith("partner_") ? "partner" : "dev"}_***_${raw.slice(-2)}`;
      fail("AFF-42201","受限字段不在授权目录");
    };
    const audit = (action,role,objectId,field,purpose,result="success") => {
      if (!Array.isArray(adminPrototype.auditRecords)) return;
      const auditRecord = {
        id:`audit-risk-sensitive-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,
        time:risk.serverNow,
        action,
        object:`${objectId} / ${field}`,
        operator:adminPrototype.roles?.[role] || role,
        result,
        trace_id:`trace-risk-sensitive-${objectId}-${field}-${Date.now().toString(36)}`,
        self_review:false,
        metadata:{purpose}
      };
      adminPrototype.auditRecords.unshift(auditRecord);
      return auditRecord.id;
    };
    const validate = ({role,objectRef,field,purpose,reason}) => {
      if (!roles.has(role)) fail("AFF-40301","当前角色无权查看风险对象受限字段");
      if (!fields.has(field)) fail("AFF-42201","受限字段不在授权目录");
      if (!purposes.has(purpose)) fail("AFF-42201","访问用途不在授权目录");
      if ([...(reason || "").trim()].length < 4) fail("AFF-42201","查看受限字段必须填写访问原因");
      const scopedId = scopedObjectId(role,objectRef);
      const {id,object} = objectFor(objectRef);
      if (id !== scopedId) fail("AFF-40301","当前角色无权查看该风险对象受限字段");
      if (object.type === "cluster") fail("AFF-40301","集群对象没有可揭示的联系字段");
      return {id,object};
    };
    risk.sensitiveAccess = {
      roles:[...roles],
      fields:[...fields],
      purposes:[...purposes],
      reveal({role,objectRef,field,purpose="risk_detail",reason=""} = {}) {
        const {id,object} = validate({role,objectRef,field,purpose,reason});
        const value = values[id]?.[field];
        if (!value) fail("AFF-40401","当前对象没有该受限字段");
        const masked = maskedValue(id,field,object);
        const sessionId = `SRA-${id}-${field}-${Date.now().toString(36)}`;
        const clientDeadline = Date.now()+60000;
        const serverExpiresAt = new Date(Date.parse(risk.serverNow)+60000).toISOString();
        const accessAuditId = audit("查看风险对象受限字段",role,id,field,purpose);
        const session = {sessionId,role,objectId:id,field,purpose,reason,masked,value,expiresAt:clientDeadline,serverExpiresAt,accessAuditId};
        sessions.set(sessionId,session);
        return {session_id:sessionId,object_id:id,field,masked,value,expires_at:serverExpiresAt,client_deadline:clientDeadline,access_audit_id:accessAuditId};
      },
      masked({role,objectRef,field} = {}) {
        const id = scopedObjectId(role,objectRef);
        const {object} = objectFor(objectRef);
        return maskedValue(id,field,object);
      },
      copy({role,sessionId,objectRef,field,purpose="risk_detail",reason=""} = {}) {
        const session = sessions.get(sessionId);
        if (!session || session.expiresAt <= Date.now()) fail("AFF-40301","受限字段会话已过期，请重新揭示");
        if (session.role !== role || session.objectId !== (typeof objectRef === "string" ? objectRef : objectRef?.id || objectRef?.object_id) || session.field !== field) fail("AFF-40301","受限字段会话与当前对象不匹配");
        validate({role,objectRef,field,purpose,reason:reason || session.reason});
        return {value:session.value,session_id:session.sessionId,expires_at:session.serverExpiresAt,client_deadline:session.expiresAt,access_audit_id:session.accessAuditId};
      },
      recordCopy({role,sessionId,objectRef,field,purpose="risk_detail",reason=""} = {}) {
        const result = this.copy({role,sessionId,objectRef,field,purpose,reason});
        const copyAuditId = audit("复制风险对象受限字段",role,objectId(objectRef),field,purpose);
        return {...result,copy_audit_id:copyAuditId};
      },
      clear({sessionId,role,objectRef,field} = {}) {
        const session = sessions.get(sessionId);
        if (!session) return {ok:true};
        if (role && session.role !== role) fail("AFF-40301","受限字段会话不属于当前角色");
        if (objectRef && session.objectId !== (typeof objectRef === "string" ? objectRef : objectRef?.id || objectRef?.object_id)) fail("AFF-40301","受限字段会话与当前对象不匹配");
        if (field && session.field !== field) fail("AFF-40301","受限字段会话与当前字段不匹配");
        sessions.delete(sessionId);
        return {ok:true};
      },
      clearObject(objectRef) {
        const id = typeof objectRef === "string" ? objectRef : objectRef?.id || objectRef?.object_id;
        for (const [sessionId,session] of sessions) if (session.objectId === id) sessions.delete(sessionId);
        return {ok:true};
      },
      reset() {
        sessions.clear();
        resetScopes();
        return {ok:true};
      },
      setRoleScope(role,objectRefs) {
        if (!roles.has(role)) fail("AFF-42201","敏感字段角色不在授权目录");
        if (!Array.isArray(objectRefs) || objectRefs.some(ref => !objectFor(ref).id)) fail("AFF-42201","敏感字段对象范围必须是对象编号数组");
        const ids = new Set(objectRefs.map(ref => objectFor(ref).id));
        roleScopes.set(role,ids);
        for (const [sessionId,session] of sessions) if (session.role === role && !ids.has(session.objectId)) sessions.delete(sessionId);
        return {role,object_ids:[...ids]};
      },
      getRoleScope(role) {
        if (!roles.has(role)) fail("AFF-42201","敏感字段角色不在授权目录");
        return {role,object_ids:[...(roleScopes.get(role) || [])]};
      },
      inspect() { return [...sessions.values()].map(({value,...safe}) => safe); }
    };
  })();
  adminPrototype.routes.push({
    id:"risk-workbench",title:"风险工作台",group:"风控与合规",kind:"risk-workbench",
    description:"统一查看风险对象、风险事件、集群和黑名单，并在同一详情上下文完成任务与审批。",
    tabs:[
      tab("objects","风险对象","风险对象","按合作方、客户和集群查看当前仍有风险、任务或资金影响的对象。",[],{type:"风控"}),
      tab("events","风险事件","风险事件","查看风险触发事实、信号、影响案件及关联任务。",[],{type:"风控"}),
      tab("clusters","集群","集群","查看独立特征、成员关系和集群控制状态。",[],{type:"风控"}),
      tab("blacklist","黑名单","黑名单","查看Affiliate本地名单与CRM只读引用，申请与执行保持分离。",[],{type:"风控"})
    ]
  });
  const riskNav = adminPrototype.menuBlueprint.find(group => group.id === "risk");
  const riskNavItem = riskNav?.items?.find(item => item.id === "nav-risk");
  if (riskNavItem) { riskNavItem.routeId = "risk-workbench"; riskNavItem.tabId = "objects"; riskNavItem.summary = "风险对象、风险事件、集群和黑名单统一工作台。"; }
})();

// Customer service shares the unified prototype's in-memory data boundary.
(() => {
  "use strict";
  const root = typeof window === "undefined" ? globalThis : window;
  const constants = {
    categories:{account:"账户资料",kyc:"认证",promotion:"链接与活动",postback:"回传",reporting:"报表数据",statement:"结算单与佣金",withdrawal:"提现",guarantee:"保证金",notification:"通知",material:"素材",other:"其他"},
    statuses:{submitted:"待受理",processing:"处理中",waiting_partner:"等待补充",waiting_external:"待专业处理",resolved:"已解决",closed:"已关闭"},
    priorities:{normal:"普通",high:"高",urgent:"紧急"},
    collaborationKinds:{finance_query:"财务核对",risk_review:"风险复核",technical:"技术排障",compliance:"合规核对",appeal:"结算申诉"}
  };
  const SEED_NOW = "2026-11-08T12:00:00.000Z";
  const QUEUE = {queue_id:"Q-SUPPORT01",name:"合作方服务"};
  const users = [
    {user_id:"U-SUPPORT01",display_name:"演示客服一",active:true},
    {user_id:"U-SUPPORT02",display_name:"演示客服二",active:true},
    {user_id:"U-SUPERVISOR01",display_name:"客服主管",active:true},
    {user_id:"U-INACTIVE01",display_name:"历史客服",active:false}
  ];
  const policy = {
    revision:"FIX-CS-P01",status:"active",clock_type:"calendar",calendar_id:null,
    first_response_seconds_by_priority:{normal:28800,high:28800,urgent:28800},
    resolution_seconds_by_priority:{normal:259200,high:259200,urgent:259200},
    pause_on_waiting_partner:true,reopen_window_seconds:604800,auto_close_enabled:false,
    escalation_target_role:"support_supervisor",reminder_interval_seconds:3600,warning_ratio:0.5,
    upload_allowed_mimes:["application/pdf","image/png","image/jpeg","text/plain"],
    max_attachment_count:5,max_file_bytes:10 * 1024 * 1024,max_request_bytes:25 * 1024 * 1024
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  const count = value => [...String(value || "").trim()].length;
  const activeStates = ["submitted","processing","waiting_partner","waiting_external"];
  const processingStates = ["processing","waiting_partner","waiting_external"];
  const terminalTasks = ["done","cancelled"];
  const sameSettlement = (a,b) => Boolean(a && b && ["customer_id","commission_case_id","settlement_case_id"].every(key => a[key] === b[key]));
  let store, sequence, clock, revision, reads, idempotency, trustedEvents;
  const iso = offset => new Date(Date.parse(clock) + offset * 1000).toISOString();
  const now = () => clock;
  const id = prefix => `${prefix}-CS-${String(++sequence).padStart(5,"0")}`;
  const user = userId => copy(users.find(item => item.user_id === userId) || {user_id:userId,display_name:"授权协作者",active:true});
  const trace = () => id("TRACE");
  function fail(code,message,details = {},status = 422) {
    const error = new Error(message);
    Object.assign(error,{code,details,status,trace_id:trace()});
    throw error;
  }
  const invalid = (message,reason_code = "INVALID_INPUT") => fail("AFF-42201",message,{reason_code});
  const forbidden = () => fail("AFF-40301","无权访问此页面或对象",{},403);
  const notFound = () => fail("AFF-40401","未找到可访问的对象",{},404);
  const ctx = context => {
    const value = {...(root.AFF_SUPPORT_CONTEXT || {}),...(context || {})};
    const role = value.role || "operations";
    const defaults = {operations:"U-SUPPORT01",support_supervisor:"U-SUPERVISOR01",supervisor:"U-SUPERVISOR01",risk_supervisor:"U-SUPERVISOR01",finance:"U-FINANCE01",technical:"U-TECH01",risk:"U-RISK01",compliance:"U-COMPLIANCE01",audit:"U-AUDIT01",system_admin:"U-ADMIN01"};
    return {...value,role,user_id:value.user_id || defaults[role] || "U-UNKNOWN01"};
  };
  const supervisor = context => ["supervisor","support_supervisor","risk_supervisor"].includes(context.role);
  const reader = context => ["operations","audit"].includes(context.role) || supervisor(context);
  const writer = context => context.role === "operations" || supervisor(context);
  const owner = (ticket,context) => ticket.assignee?.active && ticket.assignee.user_id === context.user_id;
  const scopedTasks = (ticket,context) => ticket.collaborations.filter(item => item.assigned_user_id === context.user_id && (!context.collaboration_id || context.collaboration_id === item.collaboration_id));
  function canRead(ticket,context) {
    if (context.queue_ids && !context.queue_ids.includes(ticket.service_queue.queue_id)) return false;
    if (context.entity_ids && !context.entity_ids.includes(ticket.entity_id)) return false;
    if (context.role === "partner") return ticket.partner.partner_id === context.partner_id;
    return reader(context) || scopedTasks(ticket,context).length > 0;
  }
  function ticketFor(params,context) {
    const ticket = store.tickets.find(item => item.ticket_id === params.ticket_id);
    if (!ticket || !canRead(ticket,context)) notFound();
    return ticket;
  }
  const blockers = ticket => ticket.collaborations.filter(item => item.blocking && !terminalTasks.includes(item.status));
  const validOwner = ticket => Boolean(ticket.assignee?.active);
  function uploadPolicy(ticket) {
    if (ticket?.ticket_id === "T-CS010") return null;
    const result = copy(policy);
    if (ticket?.ticket_id === "T-CS019" || revision === 2) {
      result.revision = "FIX-CS-P02";
      result.max_file_bytes = 5 * 1024 * 1024;
    }
    return result;
  }
  function canSeeAudience(ticket,message,context) {
    if (message.visibility === "partner") return true;
    if (context.role === "partner") return false;
    if (reader(context)) return true;
    return message.internal_audience === "collaboration" && scopedTasks(ticket,context).some(item => item.collaboration_id === message.collaboration_id);
  }
  function messageList(ticket,context) {
    return store.messages.filter(item => item.ticket_id === ticket.ticket_id && canSeeAudience(ticket,item,context)).map(message => {
      const result = copy(message);
      result.attachments = result.attachments.map(attachmentId => typeof attachmentId === "string" ? store.files.find(file => file.attachment_id === attachmentId) : attachmentId).filter(Boolean).map(copy);
      if (context.role === "partner" && result.sender_type === "support") result.sender_display = "客户服务";
      return result;
    });
  }
  function eligibility(ticket,ref) {
    const related = ticket.related_objects.find(item => item.readable && item.settlement_ref && (!ref || sameSettlement(item.settlement_ref,ref)));
    if (!related) return {eligible:false,reason:"请先关联有效结算案件",reason_code:"NO_SETTLEMENT_REFERENCE",remaining:0,settlement_ref:null};
    const record = store.eligibility[related.settlement_ref.settlement_case_id];
    if (!record) return {eligible:false,reason:"当前案件未开放申诉",reason_code:"NOT_ENABLED",remaining:0,settlement_ref:copy(related.settlement_ref)};
    let reason = null;
    if (record.signal_status !== "rejected") reason = "风险信号尚未驳回";
    else if (!record.enabled) reason = "当前案件未开放申诉";
    else if (Date.parse(record.allowed_until) < Date.parse(now())) reason = "申诉窗口已结束";
    else if (record.remaining < 1) reason = "申诉次数已用完";
    return {...copy(record),eligible:!reason,reason:reason || "当前可由合作方提交申诉",reason_code:reason ? "APPEAL_INELIGIBLE" : null,settlement_ref:copy(related.settlement_ref)};
  }
  function actions(ticket,context) {
    if (!canRead(ticket,context) || context.role === "partner") return [];
    const list = [];
    const add = (action,enabled,disabled_reason) => list.push({action,enabled:Boolean(enabled),disabled_reason:enabled ? null : disabled_reason});
    const readOnly = ticket.legacy_read_only;
    const disabled = "历史状态待核验，仅可查看";
    const active = activeStates.includes(ticket.status);
    const processing = processingStates.includes(ticket.status);
    const assigned = owner(ticket,context);
    const ownedReason = "请先将工单分派给自己";
    const unfinished = blockers(ticket).length;
    const blockReason = `仍有${unfinished}项专业任务未完成`;
    if (writer(context)) {
      if (ticket.status === "submitted" || (!validOwner(ticket) && processing)) add("claim",!readOnly && !validOwner(ticket),readOnly ? disabled : "工单已分配");
      if (supervisor(context)) {
        add(ticket.status === "submitted" && !validOwner(ticket) ? "assign" : "reassign",!readOnly,disabled);
        if (active) add("close_exception",!readOnly && !unfinished,readOnly ? disabled : blockReason);
      }
      if (assigned && active) add("transfer",!readOnly,disabled);
      if (processing) {
        add("reply",!readOnly && assigned,readOnly ? disabled : ownedReason);
        add("request_material",!readOnly && assigned && !unfinished,readOnly ? disabled : !assigned ? ownedReason : blockReason);
        add("collaborate",!readOnly && assigned && ticket.collaborations.filter(item => !terminalTasks.includes(item.status)).length < 10,readOnly ? disabled : !assigned ? ownedReason : "活动协作已达10项");
        const eligible = eligibility(ticket);
        add("guide_appeal",!readOnly && assigned && eligible.eligible,readOnly ? disabled : !assigned ? ownedReason : eligible.reason);
        add("attach_object",!readOnly && assigned && ticket.related_objects.length < 10,readOnly ? disabled : !assigned ? ownedReason : "关联对象已达10项");
        add("detach_object",!readOnly && assigned,readOnly ? disabled : ownedReason);
      }
      if (active && (assigned || supervisor(context))) add("classify",!readOnly,disabled);
      if (ticket.status !== "closed" && (assigned || supervisor(context))) add("note",!readOnly,disabled);
      if (ticket.status === "waiting_partner" || ticket.status === "waiting_external") add("resume",!readOnly && assigned && !unfinished,readOnly ? disabled : !assigned ? ownedReason : blockReason);
      if (["processing","waiting_external"].includes(ticket.status)) add("resolve",!readOnly && assigned && !unfinished,readOnly ? disabled : !assigned ? ownedReason : blockReason);
      if (ticket.status === "resolved") add("close",!readOnly && assigned,readOnly ? disabled : ownedReason);
      if (["resolved","closed"].includes(ticket.status)) {
        const windowValid = ticket.status === "resolved" || (ticket.sla.reopen_allowed_until && Date.parse(now()) <= Date.parse(ticket.sla.reopen_allowed_until));
        add("reopen",!readOnly && assigned && windowValid && ticket.close_reason !== "spam",readOnly ? disabled : !assigned ? ownedReason : ticket.close_reason === "spam" ? "无效骚扰关闭不可重开" : !ticket.sla.reopen_allowed_until ? "未配置重开窗口，请由合作方新建关联工单" : "重开窗口已结束，请由合作方新建关联工单");
      }
    } else if (scopedTasks(ticket,context).length && ticket.status !== "closed") add("note",!readOnly,disabled);
    return list;
  }
  function project(ticket,context) {
    const result = copy(ticket);
    result.allowed_actions = actions(ticket,context);
    result.normalized_status = result.status;
    result.unread_partner_message_count = store.messages.filter(message => message.ticket_id === ticket.ticket_id && message.sender_type === "partner" && message.sequence > (reads[`${context.user_id}:${ticket.ticket_id}`] || 0)).length;
    if (!reader(context) && context.role !== "partner") {
      const permitted = scopedTasks(ticket,context);
      result.collaborations = permitted.map(copy);
      result.related_objects = ticket.related_objects.filter(object => permitted.some(task => task.object_ref?.object_type === object.object_type && task.object_ref?.object_id === object.object_id)).map(copy);
    }
    result.collaborations.forEach(item => { delete item.assigned_user_id; });
    if (context.role === "partner") {
      result.assignee = null;
      result.collaborations = [];
      result.allowed_actions = [];
    }
    return result;
  }
  function requireAction(ticket,context,action) {
    const capability = actions(ticket,context).find(item => item.action === action);
    if (!capability) forbidden();
    if (!capability.enabled) fail(action === "reopen" ? "AFF-48002" : "AFF-42201",capability.disabled_reason,{reason_code:blockers(ticket).length ? "ACTIVE_BLOCKING_TASK" : "ACTION_NOT_AVAILABLE"});
  }
  function text(value,min,max,label) {
    if (count(value) < min || count(value) > max) invalid(`${label}需${min}至${max}字`,"TEXT_LENGTH");
    return String(value).trim();
  }
  function record(ticket,context,action,from,reason,options = {}) {
    const audit_id = id("AUDIT");
    const trace_id = options.trace_id || trace();
    const entry = {
      history_id:id("H"),ticket_id:ticket.ticket_id,action,actor_display:context.role === "partner" ? "合作方" : user(context.user_id).display_name,
      occurred_at:now(),from_status:from,to_status:ticket.status,reason:reason || null,
      visibility:options.visibility || "internal",internal_audience:options.visibility === "partner" ? null : options.internal_audience || "support",collaboration_id:options.collaboration_id || null,
      audit_id,trace_id
    };
    store.history.push(entry);
    return entry;
  }
  function updateClock(ticket,from) {
    const sla = ticket.sla;
    if (["resolved","closed"].includes(from) && !["resolved","closed"].includes(ticket.status)) {
      store.cycles.push({ticket_id:ticket.ticket_id,cycle:sla.cycle,resolved_at:ticket.resolved_at,closed_at:ticket.closed_at,resolution:ticket.resolution,close_reason:ticket.close_reason,duplicate_ticket_id:ticket.duplicate_ticket_id});
      sla.cycle += 1;
      ticket.resolved_at = null;
      ticket.closed_at = null;
      ticket.resolution = null;
      ticket.close_reason = null;
      ticket.duplicate_ticket_id = null;
      sla.reopen_allowed_until = null;
    }
    if (sla.policy_status === "missing") return;
    if (ticket.status === "waiting_partner") {
      sla.resolution_status = "paused";
      sla.paused_at = now();
      sla.paused_reason = "等待合作方补充";
      sla.resolution_due_at = null;
    } else if (["resolved","closed"].includes(ticket.status)) {
      sla.resolution_status = "completed";
      sla.paused_at = null;
      sla.paused_reason = null;
    } else {
      sla.resolution_status = sla.resolution_remaining_seconds < 0 ? "breached" : "running";
      sla.resolution_due_at = iso(sla.resolution_remaining_seconds);
      sla.paused_at = null;
      sla.paused_reason = null;
    }
    sla.last_calculated_at = now();
  }
  function audience(ticket,context,params) {
    if (params.visibility !== "internal") return {visibility:"partner",internal_audience:null,collaboration_id:null};
    const type = params.internal_audience || (reader(context) ? "support" : "collaboration");
    const collaboration_id = params.collaboration_id || null;
    if (type === "support") {
      if (!reader(context) || collaboration_id) forbidden();
    } else if (type === "collaboration") {
      if (!ticket.collaborations.some(item => item.collaboration_id === collaboration_id && (reader(context) || item.assigned_user_id === context.user_id))) forbidden();
    } else invalid("内部备注受众无效","AUDIENCE_MISMATCH");
    return {visibility:"internal",internal_audience:type,collaboration_id};
  }
  function bindFiles(ticket,context,params,messageId,audienceValue) {
    const attachmentIds = params.attachment_ids || [];
    if (!Array.isArray(attachmentIds) || new Set(attachmentIds).size !== attachmentIds.length) invalid("附件列表重复或无效","DUPLICATE_ATTACHMENT");
    if (!attachmentIds.length) return [];
    const current = uploadPolicy(ticket);
    if (!current) invalid("上传策略未配置","UPLOAD_POLICY_MISSING");
    const files = attachmentIds.map(attachmentId => {
      const file = store.files.find(item => item.attachment_id === attachmentId);
      if (!file || file.ticket_id !== ticket.ticket_id || file.uploaded_by !== context.user_id || file.message_id) forbidden();
      if (file.visibility !== audienceValue.visibility || file.internal_audience !== audienceValue.internal_audience || file.collaboration_id !== audienceValue.collaboration_id) invalid("附件受众与当前消息不一致","AUDIENCE_MISMATCH");
      if (file.scan_status !== "clean") invalid("仅安全扫描通过的文件可以发送","FILE_NOT_CLEAN");
      return file;
    });
    const totalBytes = files.reduce((total,file) => total + file.size_bytes,0);
    if (files.length > current.max_attachment_count || totalBytes > current.max_request_bytes || files.some(file => file.size_bytes > current.max_file_bytes || !current.upload_allowed_mimes.includes(file.mime_type))) {
      const changed = files.some(file => file.upload_policy_revision !== current.revision);
      fail("AFF-42201",changed ? "上传策略已更新，请移除此文件" : "附件超过当前上传限额",{reason_code:changed ? "UPLOAD_POLICY_CHANGED" : "UPLOAD_LIMIT",active_upload_policy:current,attachment_ids:files.filter(file => file.size_bytes > current.max_file_bytes).map(file => file.attachment_id)});
    }
    files.forEach(file => { file.message_id = messageId; file.bound_policy_revision = current.revision; });
    return attachmentIds.slice();
  }
  function appendMessage(ticket,context,params,kind,visibility = "partner",cta = null) {
    const scope = audience(ticket,context,{...params,visibility});
    const message_id = id("M");
    const attachments = bindFiles(ticket,context,params,message_id,scope);
    const message = {
      message_id,ticket_id:ticket.ticket_id,sender_type:context.role === "partner" ? "partner" : "support",
      sender_display:context.role === "partner" ? "合作方" : user(context.user_id).display_name,
      ...scope,kind,body:params.body,attachments,business_cta:cta,created_at:now(),
      sequence:Math.max(0,...store.messages.filter(item => item.ticket_id === ticket.ticket_id).map(item => item.sequence)) + 1
    };
    store.messages.push(message);
    if (visibility === "partner") {
      ticket.last_public_message_at = now();
      ticket.last_public_message_preview = [...params.body].slice(0,80).join("");
      if (message.sender_type === "support" && !ticket.first_response_at) {
        ticket.first_response_at = now();
        if (ticket.sla.policy_status !== "missing") ticket.sla.first_response_status = Date.parse(now()) > Date.parse(ticket.sla.first_response_due_at) ? "breached" : "met";
      }
    }
    return message;
  }
  function finish(ticket,context,params,action,from,reason,extra = {},historyOptions = {}) {
    updateClock(ticket,from);
    ticket.updated_at = now();
    ticket.version += 1;
    const entry = record(ticket,context,action,from,reason,historyOptions);
    const operation_id = id("OP");
    return {ticket:project(ticket,context),operation_id,audit_id:entry.audit_id,notification_state:extra.message?.visibility === "partner" ? (ticket.ticket_id === "T-CS009" ? "partial_failed" : "sent") : "not_required",...extra};
  }
  function makeObject(type,number,summary = "来源业务状态：结算中") {
    const object_id = `${{customer:"C",commission_case:"CC",settlement_case:"SC",withdrawal:"WD",link:"LINK",postback:"PB"}[type]}-DEMO${number}`;
    return {object_type:type,object_id,display_label:object_id,readable:true,public_summary:summary,settlement_ref:type === "settlement_case" ? {customer_id:`C-DEMO${number}`,commission_case_id:`CC-DEMO${number}`,settlement_case_id:object_id} : null,data_updated_at:now()};
  }
  function makeTask(number,suffix,kind,status,object_ref = null) {
    return {collaboration_id:`CO-${number}${suffix}`,kind,task_id:`TASK-${number}${suffix}`,object_ref,settlement_ref:object_ref?.settlement_ref || null,blocking:true,status,public_summary:status === "done" ? "专业核对已完成" : "专业团队正在核对",updated_at:now(),readable:true,assigned_user_id:kind === "finance_query" ? "U-FINANCE01" : kind === "technical" ? "U-TECH01" : "U-RISK01"};
  }
  function reset() {
    sequence = 100;
    clock = SEED_NOW;
    revision = 1;
    reads = {};
    idempotency = new Map();
    trustedEvents = new Set();
    store = {tickets:[],messages:[],history:[],files:[],cycles:[],exports:[],eligibility:{},objects:[]};
    const subjects = [
      "查询本期结算单与佣金明细","佣金记录与结算单如何对应","补充结算核对所需的原始资料","提现失败后查询进度","报表差异说明已确认","链接归因问题已关闭","结算中案件风险信号咨询","风险信号驳回后如何提交申诉","活动链接与内部核对记录","服务策略尚未同步的账户咨询","未分配的报表数据核对","回传排障需要专业协作","已关闭工单的评价与业务状态","附件扫描及超长文件名核对","历史未受理记录","已解决工单的原负责人已停用","财务与技术两个独立协作任务","关联当前结算案件后继续处理","上传后服务策略变更","已解决工单收到新的正式申诉"
    ];
    const states = ["submitted","processing","waiting_partner","waiting_external","resolved","closed","processing","processing","processing","processing","submitted","processing","closed","processing","closed","resolved","waiting_external","processing","processing","resolved"];
    const categories = ["statement","statement","statement","withdrawal","reporting","promotion","statement","statement","promotion","account","reporting","postback","statement","material","other","account","postback","statement","material","statement"];
    for (let index = 1; index <= 20; index += 1) {
      const number = String(index).padStart(2,"0");
      const status = states[index - 1];
      const created = iso(-(index === 4 ? 262800 : 18000 + index * 900));
      const first = [1,2,10,11,12,14,18,19].includes(index) ? null : iso(index === 13 ? -100 : -14400);
      const elapsed = index === 4 ? 262800 : index === 20 ? 100000 : 18000 + index * 900;
      const remaining = index === 3 ? 7200 : 259200 - elapsed;
      const ticket = {
        ticket_id:`T-CS${String(index).padStart(3,"0")}`,partner:{partner_id:"P-DEMO01",masked_email:"p***@example.test",display_name:"演示合作方"},
        service_queue:copy(QUEUE),entity_id:"E-DEMO01",subject:subjects[index - 1],
        description:index === 14 ? `请核对附件是否可以发送。\n${"LongFileReference".repeat(12)}` : `请协助核对：${subjects[index - 1]}。\n本次咨询仅针对当前关联业务对象。`,
        category:categories[index - 1],priority:index === 4 ? "high" : index === 7 ? "urgent" : "normal",status,
        close_reason:status === "closed" ? index === 15 ? "legacy_unaccepted" : "resolved" : null,
        legacy_status:index === 15 ? "rejected" : null,legacy_category:index === 15 ? "争议" : null,normalized_status:status,
        legacy_read_only:index === 15,legacy_display_note:index === 15 ? "历史未受理；历史状态待核验，仅可查看" : null,duplicate_ticket_id:null,
        assignee:[1,11].includes(index) ? null : user([15,16].includes(index) ? "U-INACTIVE01" : "U-SUPPORT01"),
        created_at:created,updated_at:iso(-index * 300),first_response_at:first,last_public_message_at:first,
        last_public_message_preview:first ? "已收到咨询，正在核对相关资料。" : null,
        resolved_at:status === "resolved" ? iso(-3600) : null,closed_at:status === "closed" ? iso(-7200) : null,
        resolution:["resolved","closed"].includes(status) && index !== 15 ? "已完成当前咨询的核对与说明。" : null,
        related_objects:[],collaborations:[],unread_partner_message_count:1,
        satisfaction:index === 13 ? {rating:4,comment:"说明清楚",submitted_at:iso(-1800)} : null,
        sla:{policy_status:index === 10 ? "missing" : "configured",policy_version:index === 10 ? null : "FIX-CS-P01",clock_type:"calendar",calendar_id:null,
          first_response_due_at:index === 10 ? null : new Date(Date.parse(created) + 28800000).toISOString(),
          resolution_due_at:[3,10].includes(index) ? null : iso(remaining),
          first_response_status:index === 10 ? "missing" : first ? Date.parse(first) > Date.parse(created) + 28800000 ? "breached" : "met" : Date.parse(created) + 28800000 < Date.parse(now()) ? "breached" : "pending",
          resolution_status:index === 10 ? "missing" : status === "waiting_partner" ? "paused" : ["resolved","closed"].includes(status) ? "completed" : remaining < 0 ? "breached" : "running",
          paused_reason:index === 3 ? "等待合作方补充" : null,resolution_elapsed_seconds:elapsed,resolution_remaining_seconds:index === 10 ? null : remaining,
          paused_at:index === 3 ? iso(-3600) : null,reopen_allowed_until:status === "closed" && index !== 15 ? iso(597600) : null,
          warning_ratio:0.5,cycle:1,last_calculated_at:now()},
        allowed_actions:[],version:index === 11 || index === 4 ? 4 : 1
      };
      if (index === 2) ticket.related_objects = [makeObject("commission_case",number)];
      if (index === 4) {
        ticket.related_objects = [makeObject("withdrawal",number,"原提现单核对中")];
        ticket.collaborations = [makeTask("04","A","finance_query","done",ticket.related_objects[0]),makeTask("04","B","technical","open")];
      }
      if ([7,8,13,20].includes(index)) {
        const object = makeObject("settlement_case",number,index === 13 ? "当前案件仍处于冻结；服务关闭不改变业务状态" : "当前结算案件：结算中");
        ticket.related_objects = [object];
        store.eligibility[object.object_id] = {signal_status:index === 7 ? "open" : "rejected",enabled:true,allowed_until:iso(604800),remaining:1};
      }
      if (index === 17) ticket.collaborations = [makeTask("17","A","finance_query","processing"),makeTask("17","B","technical","open")];
      store.tickets.push(ticket);
      store.messages.push({message_id:index === 9 ? "M09P" : `M${number}P`,ticket_id:ticket.ticket_id,sender_type:"partner",sender_display:"合作方",visibility:"partner",internal_audience:null,collaboration_id:null,kind:"reply",body:ticket.description,attachments:[],business_cta:null,created_at:created,sequence:1});
      if (first) store.messages.push({message_id:`M${number}R`,ticket_id:ticket.ticket_id,sender_type:"support",sender_display:"演示客服一",visibility:"partner",internal_audience:null,collaboration_id:null,kind:"reply",body:"已收到咨询，正在核对相关资料。",attachments:[],business_cta:null,created_at:first,sequence:2});
      record(ticket,{role:"partner",user_id:"P-DEMO01"},"created",null,null,{visibility:"partner",internal_audience:null});
    }
    store.objects.push({...makeObject("settlement_case","18"),partner_id:"P-DEMO01"});
    store.objects.push({...makeObject("customer","18"),partner_id:"P-DEMO01"});
    store.objects.push({...makeObject("settlement_case","OTHER"),partner_id:"P-OTHER"});
    function seedFile(ticketId,fileId,name,status,audienceValue = {visibility:"partner",internal_audience:null,collaboration_id:null},messageId = null,size = 1024) {
      const file = {attachment_id:fileId,ticket_id:ticketId,file_name:name,size_bytes:size,mime_type:"text/plain",scan_status:status,...audienceValue,uploaded_by:"U-SUPPORT01",upload_policy_revision:"FIX-CS-P01",bound_policy_revision:messageId ? "FIX-CS-P01" : null,message_id:messageId,created_at:now()};
      store.files.push(file);
      return file;
    }
    seedFile("T-CS009","A09I","内部核对摘要.txt","clean",{visibility:"internal",internal_audience:"support",collaboration_id:null},"M09I");
    store.messages.push({message_id:"M09I",ticket_id:"T-CS009",sender_type:"support",sender_display:"演示客服一",visibility:"internal",internal_audience:"support",collaboration_id:null,kind:"note",body:"当前记录为客服内部核对摘要，仅授权员工可见。",attachments:["A09I"],business_cta:null,created_at:now(),sequence:3});
    seedFile("T-CS014","A14P","待扫描资料.txt","pending");
    seedFile("T-CS014","A14R","安全扫描未通过.txt","rejected");
    seedFile("T-CS014","A14C",`${"很长的附件名称".repeat(17)}.txt`,"clean");
    seedFile("T-CS019","A19C","上传时10MiB的资料.txt","clean",undefined,null,10 * 1024 * 1024);
    for (const suffix of ["A","B"]) {
      const collaboration_id = `CO-17${suffix}`;
      const fileId = `A17${suffix}`;
      const messageId = `M17${suffix}`;
      const scope = {visibility:"internal",internal_audience:"collaboration",collaboration_id};
      const file = seedFile("T-CS017",fileId,`任务${suffix}受控摘要.txt`,"clean",scope,messageId);
      file.uploaded_by = suffix === "A" ? "U-FINANCE01" : "U-TECH01";
      store.messages.push({message_id:messageId,ticket_id:"T-CS017",sender_type:"support",sender_display:suffix === "A" ? "财务协作者" : "技术协作者",...scope,kind:"note",body:`这是任务${suffix}可向客服披露的协作摘要，仅此任务获分配人员及客服可见。`,attachments:[fileId],business_cta:null,created_at:now(),sequence:suffix === "A" ? 3 : 4});
    }
    return {seed:"customer-service-v0.1",server_now:now()};
  }
  function list(params,context) {
    if (!reader(context)) forbidden();
    const view = params.view || (supervisor(context) || context.role === "audit" ? "all" : "mine");
    if (!["mine","unassigned","all","overdue"].includes(view)) invalid("查询视图无效");
    if (Boolean(params.created_from) !== Boolean(params.created_to)) invalid("请同时选择创建日期起止");
    if (params.created_from) {
      const start = Date.parse(params.created_from);
      const end = Date.parse(params.created_to);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 366 * 86400000) invalid("日期范围不能超过366天");
    }
    let rows = store.tickets.filter(ticket => canRead(ticket,context));
    rows = rows.filter(ticket => {
      if (view === "mine" && (!owner(ticket,context) || ticket.status === "closed")) return false;
      if (view === "unassigned" && (validOwner(ticket) || ticket.status === "closed")) return false;
      if (view === "overdue" && !(ticket.sla.policy_status === "configured" && ((!ticket.first_response_at && ticket.sla.first_response_status === "breached") || !["resolved","closed"].includes(ticket.status) && ticket.sla.resolution_status === "breached"))) return false;
      if (params.ticket_id && params.ticket_id !== ticket.ticket_id || params.partner_id && params.partner_id !== ticket.partner.partner_id) return false;
      if (params.subject && !ticket.subject.toLowerCase().includes(String(params.subject).toLowerCase())) return false;
      for (const key of ["category","status","priority"]) {
        const values = params[key] || params[`${key}s`];
        if (values?.length && !(Array.isArray(values) ? values : [values]).includes(ticket[key])) return false;
      }
      if (params.assignee_id && params.assignee_id !== ticket.assignee?.user_id || params.queue_id && params.queue_id !== ticket.service_queue.queue_id) return false;
      if (params.created_from && (Date.parse(ticket.created_at) < Date.parse(params.created_from) || Date.parse(ticket.created_at) >= Date.parse(params.created_to))) return false;
      return true;
    });
    const sortBy = ["created_at","updated_at","priority","first_response_due_at","resolution_due_at"].includes(params.sort_by) ? params.sort_by : "updated_at";
    const order = params.sort_order === "asc" ? 1 : -1;
    const value = ticket => sortBy === "priority" ? {normal:0,high:1,urgent:2}[ticket.priority] : sortBy.endsWith("due_at") ? ticket.sla[sortBy] : ticket[sortBy];
    rows.sort((a,b) => {
      const av = value(a), bv = value(b);
      if (av == null && bv != null) return 1;
      if (bv == null && av != null) return -1;
      const result = av == null && bv == null ? 0 : typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return result ? result * order : b.ticket_id.localeCompare(a.ticket_id);
    });
    const page_size = [10,20,50].includes(Number(params.page_size)) ? Number(params.page_size) : 20;
    const total = rows.length;
    const page = Math.max(1,Math.min(Math.ceil(total / page_size) || 1,Number(params.page) || 1));
    const query_snapshot_at = now();
    store.snapshots ||= new Map();
    const snapshotId = `${context.user_id}:${query_snapshot_at}:${JSON.stringify(params)}`;
    store.snapshots.set(snapshotId,rows.map(ticket => ticket.ticket_id));
    return {items:rows.slice((page - 1) * page_size,page * page_size).map(ticket => {
      const result = project(ticket,context);
      delete result.description;
      return result;
    }),total,page,page_size,query_snapshot_at};
  }
  const writeOperations = ["assign","reply","note","action","collaborate","upload","deleteAttachment","readPosition","export"];
  const versionOperations = ["assign","reply","note","action","collaborate"];
  function execute(operation,params = {},contextValue) {
    const context = ctx(contextValue);
    const responseTrace = trace();
    const write = writeOperations.includes(operation);
    const key = params.idempotency_key || params["X-Idempotency-Key"];
    const keyScope = `${context.user_id}:${key}`;
    const fingerprint = JSON.stringify({operation,params});
    if (write) {
      if (!key) invalid("缺少幂等请求标识","IDEMPOTENCY_REQUIRED");
      const prior = idempotency.get(keyScope);
      if (prior) {
        if (prior.fingerprint !== fingerprint) fail("AFF-40902","同一幂等键的请求内容已改变",{},409);
        const sourceId = params.ticket_id || store.files.find(file => file.attachment_id === params.attachment_id)?.ticket_id;
        if (sourceId) {
          const source = ticketFor({ticket_id:sourceId},context);
          if (versionOperations.includes(operation) && !writer(context) && !(operation === "note" && scopedTasks(source,context).length)) forbidden();
        }
        if (operation === "export" && !(reader(context) && (supervisor(context) || context.export_allowed))) forbidden();
        return copy(prior.response);
      }
    }
    let ticket = params.ticket_id && !["list","export","operation","assigneeFilters"].includes(operation) ? ticketFor(params,context) : null;
    if (versionOperations.includes(operation)) {
      if (!ticket) notFound();
      const expected = Number(params.version ?? params.if_match ?? params["If-Match"]);
      if (!Number.isInteger(expected) || expected !== ticket.version) fail("AFF-40901","工单已更新，请核对后重试",{current_version:ticket.version},409);
    }
    let data;
    if (operation === "capabilities") {
      if (!reader(context) && (!ticket || !scopedTasks(ticket,context).length)) forbidden();
      data = {
        roles:[context.role],capabilities:reader(context) ? ["support.read",...(writer(context) ? ["support.claim","support.reply","support.note","support.transfer","support.classify","support.collaborate","support.link","support.resolve","support.attachment_read","support.attachment_upload"] : []),...(supervisor(context) ? ["support.assign","support.close_exception","support.export"] : []),...(context.export_allowed ? ["support.export"] : [])] : ["support.note","support.attachment_read","support.attachment_upload"],
        authorized_queues:reader(context) ? [copy(QUEUE)] : [],default_view:reader(context) ? supervisor(context) || context.role === "audit" ? "all" : "mine" : null,
        display_timezone:"Asia/Shanghai",active_upload_policy:uploadPolicy(ticket),policy_status:uploadPolicy(ticket) ? "configured" : "missing",context_only:!reader(context),user_id:context.user_id
      };
    } else if (operation === "list") data = list(params,context);
    else if (operation === "detail") {
      if (!ticket) notFound();
      const messages = messageList(ticket,context);
      data = {ticket:project(ticket,context),messages:messages.slice(-50),message_cursor:messages.length > 50 ? String(messages.length - 50) : null,read_position_token:`RP:${context.user_id}:${ticket.ticket_id}`};
    } else if (operation === "messages") {
      if (!ticket) notFound();
      const messages = messageList(ticket,context);
      const end = Number(params.cursor) || messages.length;
      const start = Math.max(0,end - 50);
      data = {messages:messages.slice(start,end),next_cursor:start > 0 ? String(start) : null};
    } else if (operation === "history") {
      if (!ticket) notFound();
      const entries = store.history.filter(item => item.ticket_id === ticket.ticket_id && canSeeAudience(ticket,item,context)).sort((a,b) => b.occurred_at.localeCompare(a.occurred_at) || b.history_id.localeCompare(a.history_id));
      const start = Number(params.cursor) || 0;
      data = {entries:copy(entries.slice(start,start + 20)),next_cursor:start + 20 < entries.length ? String(start + 20) : null};
    } else if (operation === "assignees" || operation === "assigneeFilters") {
      if (!reader(context) || operation === "assignees" && !ticket || params.queue_id && params.queue_id !== QUEUE.queue_id) forbidden();
      data = {items:users.filter(item => (operation !== "assignees" || item.active) && (!params.query || item.display_name.includes(params.query) || item.user_id.includes(params.query))).map(copy),next_cursor:null};
    } else if (operation === "eligibility") {
      if (!ticket || !reader(context)) forbidden();
      data = eligibility(ticket,params.settlement_ref);
    } else if (operation === "objectCandidates") {
      if (!ticket || !reader(context)) forbidden();
      if (!params.object_id || !["customer","commission_case","settlement_case","withdrawal","link","postback"].includes(params.object_type)) invalid("请选择对象类型并输入完整编号");
      data = {items:store.objects.filter(item => item.object_type === params.object_type && item.object_id === params.object_id && item.partner_id === ticket.partner.partner_id).map(item => {
        const result = copy(item); delete result.partner_id; return result;
      })};
    } else if (operation === "operation") {
      const result = idempotency.get(`${context.user_id}:${params.key || params.idempotency_key}`);
      if (!result) data = {status:"not_found",operation_id:null,result:null};
      else data = {status:"succeeded",operation_id:result.response.data.operation_id || null,result:copy(result.response)};
    } else if (operation === "assign") {
      const mode = params.mode || "claim";
      requireAction(ticket,context,mode);
      const targetId = mode === "claim" ? context.user_id : params.assignee_id;
      if (mode === "claim" && params.assignee_id && params.assignee_id !== context.user_id) forbidden();
      const candidate = users.find(item => item.user_id === targetId && item.active);
      if (!candidate) invalid("目标处理人不可用","ASSIGNEE_NOT_AVAILABLE");
      if (mode === "transfer" && targetId === context.user_id) invalid("工单已由本人负责");
      const reason = mode === "claim" ? params.reason || null : text(params.reason,10,1000,"原因");
      const from = ticket.status;
      ticket.assignee = copy(candidate);
      if (ticket.status === "submitted") ticket.status = "processing";
      data = finish(ticket,context,params,mode,from,reason);
    } else if (operation === "reply") {
      const kind = params.kind || "reply";
      if (!["reply","request_material"].includes(kind) || params.visibility && params.visibility !== "partner") invalid("公开回复类型无效");
      requireAction(ticket,context,kind);
      const body = text(params.body,kind === "reply" ? 1 : 10,5000,"公开回复");
      const from = ticket.status;
      const message = appendMessage(ticket,context,{...params,body},kind);
      if (kind === "request_material") ticket.status = "waiting_partner";
      data = finish(ticket,context,params,kind,from,null,{message:copy(message)});
    } else if (operation === "note") {
      requireAction(ticket,context,"note");
      const body = text(params.body,10,5000,"内部备注");
      const scope = audience(ticket,context,{...params,visibility:"internal"});
      const message = appendMessage(ticket,context,{...params,...scope,body},"note","internal");
      data = finish(ticket,context,params,"note",ticket.status,null,{message:copy(message)},scope);
    } else if (operation === "action") {
      const action = params.action;
      requireAction(ticket,context,action);
      const from = ticket.status;
      const reasonActions = ["resume","reopen","close","close_exception","classify","attach_object","detach_object"];
      const reason = reasonActions.includes(action) ? text(params.reason,10,1000,"原因") : null;
      let message = null;
      if (action === "resume") ticket.status = "processing";
      else if (action === "resolve") {
        const body = text(params.body,10,5000,"公开解决说明");
        message = appendMessage(ticket,context,{...params,body},"resolution");
        ticket.status = "resolved";
        ticket.resolved_at = now();
        ticket.resolution = body;
      } else if (action === "close" || action === "close_exception") {
        const body = text(params.body || params.public_body,10,5000,"公开关闭说明");
        const close_reason = params.close_reason || (action === "close" ? "resolved" : null);
        if (action === "close" && close_reason !== "resolved" || action === "close_exception" && !["withdrawn","duplicate","spam"].includes(close_reason)) invalid("关闭原因无效");
        if (close_reason === "duplicate") {
          const target = store.tickets.find(item => item.ticket_id === params.duplicate_ticket_id && item.partner.partner_id === ticket.partner.partner_id && canRead(item,context));
          if (!target || target.ticket_id === ticket.ticket_id) invalid("重复问题承接单无效");
          const visited = new Set([ticket.ticket_id]);
          let current = target;
          while (current) {
            if (visited.has(current.ticket_id)) invalid("重复问题承接单不可形成循环");
            visited.add(current.ticket_id);
            current = store.tickets.find(item => item.ticket_id === current.duplicate_ticket_id);
          }
          ticket.duplicate_ticket_id = target.ticket_id;
        }
        message = appendMessage(ticket,context,{...params,body},"closure");
        ticket.status = "closed";
        ticket.close_reason = close_reason;
        ticket.closed_at = now();
        if (ticket.sla.policy_status !== "missing") ticket.sla.reopen_allowed_until = iso(policy.reopen_window_seconds);
      } else if (action === "reopen") ticket.status = validOwner(ticket) ? "processing" : "submitted";
      else if (action === "classify") {
        if (!params.category && !params.priority) invalid("请至少调整一个字段");
        if (params.category) {
          if (!owner(ticket,context)) forbidden();
          if (!constants.categories[params.category]) invalid("问题类别无效");
        }
        if (params.priority) {
          if (!supervisor(context)) forbidden();
          if (!constants.priorities[params.priority]) invalid("优先级无效");
        }
        if ((!params.category || params.category === ticket.category) && (!params.priority || params.priority === ticket.priority)) invalid("请至少调整一个字段");
        if (params.category) ticket.category = params.category;
        if (params.priority) ticket.priority = params.priority;
      } else if (action === "attach_object") {
        const requested = params.object_ref || params;
        const candidate = store.objects.find(item => item.object_type === requested.object_type && item.object_id === requested.object_id && item.partner_id === ticket.partner.partner_id);
        if (!candidate) notFound();
        if (ticket.related_objects.some(item => item.object_type === candidate.object_type && item.object_id === candidate.object_id)) invalid("此对象已关联");
        const reference = copy(candidate);
        delete reference.partner_id;
        ticket.related_objects.push(reference);
      } else if (action === "detach_object") {
        const related = ticket.related_objects.find(item => item.object_type === params.object_type && item.object_id === params.object_id);
        if (!related) notFound();
        if (ticket.collaborations.some(item => item.object_ref?.object_type === params.object_type && item.object_ref?.object_id === params.object_id) || store.messages.some(item => item.ticket_id === ticket.ticket_id && item.business_cta?.settlement_ref?.settlement_case_id === params.object_id)) invalid("该对象已被专业任务或申诉指引引用","OBJECT_REFERENCED");
        ticket.related_objects = ticket.related_objects.filter(item => item !== related);
      } else if (action === "guide_appeal") {
        const eligible = eligibility(ticket,params.settlement_ref);
        if (!eligible.eligible) invalid(eligible.reason,"APPEAL_INELIGIBLE");
        const body = text(params.body,10,5000,"公开申诉说明");
        const business_cta = {type:"submit_settlement_appeal",label:"查看申诉资格并提交",settlement_ref:eligible.settlement_ref,source_ticket_id:ticket.ticket_id};
        message = appendMessage(ticket,context,{...params,body},"guide_appeal","partner",business_cta);
        if (["processing","waiting_partner"].includes(ticket.status)) ticket.status = "waiting_partner";
      } else invalid("不支持此工单动作");
      data = finish(ticket,context,params,action,from,reason,message ? {message:copy(message)} : {});
    } else if (operation === "collaborate") {
      requireAction(ticket,context,"collaborate");
      if (!["finance_query","risk_review","technical","compliance"].includes(params.kind)) invalid("专业协作类型无效");
      const reason = text(params.reason,10,1000,"内部原因");
      const body = text(params.public_body || params.body,10,5000,"公开受理说明");
      let object_ref = null;
      if (params.object_ref || params.object_id) {
        const object = params.object_ref || params;
        object_ref = ticket.related_objects.find(item => item.object_type === object.object_type && item.object_id === object.object_id && item.readable);
        if (!object_ref) forbidden();
      }
      if (!object_ref && params.kind !== "technical") invalid("请先选择本工单关联的业务对象","OBJECT_REQUIRED");
      if (params.settlement_ref && !sameSettlement(object_ref?.settlement_ref,params.settlement_ref)) invalid("结算案件三元组不一致","SETTLEMENT_MISMATCH");
      const existing = ticket.collaborations.find(item => item.kind === params.kind && item.object_ref?.object_id === object_ref?.object_id && !terminalTasks.includes(item.status));
      if (existing) data = {ticket:project(ticket,context),collaboration:copy(existing),operation_id:id("OP"),audit_id:null,notification_state:"not_required",deduplicated:true};
      else {
        const from = ticket.status;
        const task = {collaboration_id:id("CO"),kind:params.kind,task_id:id("TASK"),object_ref:copy(object_ref),settlement_ref:copy(object_ref?.settlement_ref || null),blocking:true,status:"open",public_summary:"专业团队已受理核对",updated_at:now(),readable:true,assigned_user_id:params.kind === "finance_query" ? "U-FINANCE01" : params.kind === "technical" ? "U-TECH01" : params.kind === "compliance" ? "U-COMPLIANCE01" : "U-RISK01"};
        // No state mutation occurs until all message/file validations succeed.
        const message = appendMessage(ticket,context,{...params,body},"service_notice");
        ticket.collaborations.push(task);
        ticket.status = "waiting_external";
        const publicTask = copy(task); delete publicTask.assigned_user_id;
        data = finish(ticket,context,params,"collaborate",from,reason,{collaboration:publicTask,message:copy(message)});
      }
    } else if (operation === "upload") {
      if (!ticket) notFound();
      const current = uploadPolicy(ticket);
      if (!current) invalid("上传策略未配置","UPLOAD_POLICY_MISSING");
      const scope = audience(ticket,context,params);
      requireAction(ticket,context,scope.visibility === "internal" ? "note" : "reply");
      const file = params.file || {};
      const mime = file.type || file.mime_type;
      const size = Number(file.size ?? file.size_bytes);
      if (!file.name && !file.file_name || !Number.isInteger(size) || size < 1 || size > current.max_file_bytes || !current.upload_allowed_mimes.includes(mime)) invalid("文件类型或体积不符合当前上传策略","UPLOAD_LIMIT");
      const attachment = {attachment_id:id("A"),ticket_id:ticket.ticket_id,file_name:String(file.name || file.file_name),size_bytes:size,mime_type:mime,scan_status:"pending",...scope,uploaded_by:context.user_id,upload_policy_revision:current.revision,bound_policy_revision:null,message_id:null,created_at:now()};
      store.files.push(attachment);
      data = {attachment:copy(attachment),active_upload_policy:current};
    } else if (["attachment","download","deleteAttachment"].includes(operation)) {
      const file = store.files.find(item => item.attachment_id === params.attachment_id);
      if (!file) notFound();
      const source = ticketFor({ticket_id:file.ticket_id},context);
      if (!canSeeAudience(source,file,context) || !file.message_id && file.uploaded_by !== context.user_id) notFound();
      if (operation === "download") {
        if (file.scan_status !== "clean") invalid("附件尚未通过安全扫描，暂不可下载","FILE_NOT_CLEAN");
        record(source,context,"attachment_download",source.status,null,{visibility:file.visibility,internal_audience:file.internal_audience,collaboration_id:file.collaboration_id});
        data = {attachment:copy(file),file_name:file.file_name,mime_type:file.mime_type,content:"Customer service development fixture attachment.\n"};
      } else if (operation === "deleteAttachment") {
        if (file.uploaded_by !== context.user_id || file.message_id) forbidden();
        store.files = store.files.filter(item => item !== file);
        data = {deleted:true,attachment_id:file.attachment_id};
      } else {
        // The scanner is a deterministic simulator, not a production security scan.
        if (file.scan_status === "pending" && !["A14P"].includes(file.attachment_id)) file.scan_status = /reject|virus|拒绝/i.test(file.file_name) ? "rejected" : /error|失败/i.test(file.file_name) ? "error" : "clean";
        data = {attachment:copy(file)};
      }
    } else if (operation === "readPosition") {
      if (!ticket || params.read_position_token !== `RP:${context.user_id}:${ticket.ticket_id}`) forbidden();
      const visible = messageList(ticket,context).filter(item => item.sender_type === "partner");
      const requested = Number(params.last_visible_partner_sequence);
      if (!visible.some(item => item.sequence === requested)) invalid("阅读位置无效");
      const readKey = `${context.user_id}:${ticket.ticket_id}`;
      reads[readKey] = Math.max(reads[readKey] || 0,requested);
      data = {last_visible_partner_sequence:reads[readKey],version:ticket.version};
    } else if (operation === "export") {
      if (!reader(context) || !(supervisor(context) || context.export_allowed)) forbidden();
      const columns = ["ticket_id","partner_id","masked_email","subject","category","priority","status","assignee","created_at","updated_at","sla"];
      if (params.columns?.some(item => !columns.includes(item))) forbidden();
      if (params.query_snapshot_at !== now()) invalid("查询快照已变化，请刷新后重试","QUERY_SNAPSHOT_EXPIRED");
      const result = list({...params.scope,page_size:50,page:1},context);
      const task = {export_id:id("EXP"),object_type:"support_ticket",status:"queued",row_count:result.total,columns,scope:copy(params.scope || {}),query_snapshot_at:params.query_snapshot_at,created_at:now()};
      store.exports.push(task);
      data = {export:copy(task),export_id:task.export_id,status:"queued"};
    } else invalid("不支持此服务操作","UNKNOWN_OPERATION");
    const response = {success:true,data:copy(data),trace_id:responseTrace,server_now:now()};
    if (write) idempotency.set(keyScope,{fingerprint,response:copy(response)});
    return response;
  }
  async function request(operation,params = {},contextValue) {
    const transactional = writeOperations.includes(operation);
    const before = transactional ? copy({...store,snapshots:undefined}) : null;
    const snapshots = transactional ? store.snapshots : null;
    try {
      return execute(operation,params,contextValue);
    } catch (error) {
      if (before) store = {...before,snapshots};
      throw error;
    }
  }
  const testing = {
    snapshot:() => copy({...store,snapshots:undefined}),
    advance(seconds) {
      const previous = Date.parse(clock);
      clock = new Date(previous + Number(seconds) * 1000).toISOString();
      store.tickets.forEach(ticket => {
        const sla = ticket.sla;
        if (sla.policy_status === "missing") return;
        if (["submitted","processing","waiting_external"].includes(ticket.status)) {
          sla.resolution_elapsed_seconds += Number(seconds);
          sla.resolution_remaining_seconds -= Number(seconds);
          sla.resolution_status = sla.resolution_remaining_seconds < 0 ? "breached" : "running";
        }
        if (!ticket.first_response_at && Date.parse(clock) > Date.parse(sla.first_response_due_at)) sla.first_response_status = "breached";
        sla.last_calculated_at = clock;
      });
      return clock;
    },
    setUploadRevision(value) { revision = value; },
    setEligibility(settlementId,patch) { if (store.eligibility[settlementId]) Object.assign(store.eligibility[settlementId],patch); },
    setTaskStatus(ticketId,collaborationId,status) {
      if (!terminalTasks.includes(status)) invalid("测试回写状态无效");
      const ticket = store.tickets.find(item => item.ticket_id === ticketId);
      const task = ticket?.collaborations.find(item => item.collaboration_id === collaborationId);
      if (!task) notFound();
      task.status = status;
      task.updated_at = now();
      ticket.version += 1;
      record(ticket,{role:"technical",user_id:task.assigned_user_id},"collaboration_updated",ticket.status,"专业处理已结束，请核对并答复合作方",{visibility:"internal",internal_audience:"collaboration",collaboration_id:task.collaboration_id});
    },
    partnerReply(ticketId,body,event_id = id("EV")) {
      if (trustedEvents.has(event_id)) return;
      const ticket = store.tickets.find(item => item.ticket_id === ticketId);
      if (!ticket || ticket.status === "closed") invalid("已关闭工单不能直接回复");
      const from = ticket.status;
      const context = {role:"partner",user_id:ticket.partner.partner_id,partner_id:ticket.partner.partner_id};
      const message = appendMessage(ticket,context,{body:text(body,1,5000,"补充内容")},"reply");
      if (["waiting_partner","resolved"].includes(from)) ticket.status = validOwner(ticket) ? "processing" : "submitted";
      finish(ticket,context,{},"partner_reply",from,null,{message});
      trustedEvents.add(event_id);
    },
    appealCreated(ticketId,event_id = "EV-CS20",source_version = 1) {
      const eventKey = `${ticketId}:${event_id}`;
      if (trustedEvents.has(eventKey)) return;
      const ticket = store.tickets.find(item => item.ticket_id === ticketId);
      if (!ticket) notFound();
      const previousVersion = ticket.appeal_source_version || 0;
      if (source_version <= previousVersion) return;
      const eligible = eligibility(ticket);
      if (!eligible.eligible) invalid(eligible.reason,"APPEAL_INELIGIBLE");
      const from = ticket.status;
      const object_ref = ticket.related_objects.find(item => item.settlement_ref?.settlement_case_id === eligible.settlement_ref.settlement_case_id);
      const task = makeTask(String(sequence++),"A","appeal","open",object_ref);
      ticket.collaborations.push(task);
      store.eligibility[eligible.settlement_ref.settlement_case_id].remaining -= 1;
      if (ticket.status !== "closed") ticket.status = "waiting_external";
      ticket.appeal_source_version = source_version;
      finish(ticket,{role:"partner",user_id:ticket.partner.partner_id},{},"appeal_linked",from,"合作方已正式提交申诉");
      trustedEvents.add(eventKey);
    }
  };
  reset();
  root.AFF_SUPPORT_SERVICE = {request,constants,reset,testing,version:"customer-service-v0.1",context:{role:"operations",user_id:"U-SUPPORT01"}};
})();

/* The queue is an explicit local fixture adapter, shared by all prototype entries. */
(() => {
  const prototype = window.AFF_ADMIN_PROTOTYPE;
  if (!prototype) return;
  const clock = "2026-11-08T04:00:00.000Z";
  const at = offsetMs => new Date(Date.parse(clock) + offsetMs).toISOString();
  const copy = value => JSON.parse(JSON.stringify(value));
  const actors = {
    risk: ["DEMO-RISK-01","林知远","DEMO-RISK"], risk_supervisor: ["DEMO-RISK-LEAD","陈若宁","DEMO-RISK"],risk_reviewer:["DEMO-RISK-REVIEWER","唐明澈","DEMO-RISK"],
    finance: ["DEMO-FIN-01","许安然","DEMO-FIN"], finance_reviewer: ["DEMO-FIN-02","宋嘉禾","DEMO-FIN"], operations: ["DEMO-OPS-01","周亦辰","DEMO-OPS"],
    compliance: ["DEMO-COMP-01","顾清和","DEMO-COMP"], system_admin: ["DEMO-ADMIN-01","陆星河","DEMO-ADMIN"],
    audit: ["DEMO-AUDIT-01","沈予安","DEMO-AUDIT"]
  };
  const actorDefaults = copy(actors);
  const teams = Object.entries({"DEMO-RISK":"风险复核组","DEMO-FIN":"财务处理组","DEMO-OPS":"渠道运营组","DEMO-ADMIN":"系统集成组","DEMO-COMP":"合规复核组"}).map(([id,name])=>({id,name}));
  const actor = role => { const a=actors[role]||actors.risk; return {user_id:a[0],display_name:a[1],role_code:actors[role]?role:"risk"}; };
  const labels = {risk_review:"风险复核",settlement_overdue:"结算超时复核",appeal:"申诉复核",hold_extend:"结算延长复核",guarantee_offset:"保证金抵扣",chargeback:"冲正追回",circuit_breaker:"熔断复核",credit_review:"信用调级复核",commission_exception:"佣金异常",attribution_review:"归属争议复核",integration:"集成失败",data_backfill:"事件补数",offboarding_step:"清退步骤"};
  const englishLabels={risk_review:"Risk Review",settlement_overdue:"Overdue Settlement Review",appeal:"Appeal Review",hold_extend:"Settlement Extension Review",guarantee_offset:"Reserve Offset",chargeback:"Reversal and Recovery",circuit_breaker:"Circuit Breaker Review",credit_review:"Credit Review",commission_exception:"Commission Exception",attribution_review:"Attribution Review",integration:"Integration Failure",data_backfill:"Event Backfill",offboarding_step:"Offboarding Step"};
  const stateLabels={open:"待认领",processing:"处理中",waiting_material:"待补件",pending_approval:"待审批",pending_execution:"待执行",executing:"执行中",execution_failed:"执行失败",returned:"已退回",done:"已完成",closed:"已关闭"};
  const terminal = t => ["done","closed"].includes(t.workflow_state);
  const quality = () => ({status:"fresh",source_systems:[{system:"unified_prototype_fixture",status:"fresh",as_of:clock,fresh_until:at(5 * 60 * 1000),error_code:null}],missing_fields:[]});
  const money = amount => ({currency:"USD",amount});
  const caseRef = {customer_id:"DEMO-C1",commission_case_id:"DEMO-COM1",settlement_case_id:"DEMO-SET1",partner_id:"DEMO-P1",settlement_batch_id:"DEMO-BATCH1"};
  const holdCaseRef = {customer_id:"DEMO-C4",commission_case_id:"DEMO-COM4",settlement_case_id:"DEMO-SET4",partner_id:"DEMO-P1",settlement_batch_id:"DEMO-BATCH1"};
  const settlementSources = [
    {case_ref:caseRef,release_targets:[{restriction_id:"DEMO-RESTRICTION1",expected_restriction_version:"r1"}],version:"sc1",signal_status:"rejected",appeal_window_ends_at:"2026-11-07T12:00:00.000Z",appeal_in_progress:false,status:"frozen"},
    {case_ref:holdCaseRef,release_targets:[{restriction_id:"DEMO-RESTRICTION4",expected_restriction_version:"r4"}],version:"sc4",signal_status:"rejected",appeal_window_ends_at:"2026-11-07T12:00:00.000Z",appeal_in_progress:false,status:"frozen"},
    {case_ref:{customer_id:"DEMO-C03",commission_case_id:"DEMO-CM03",settlement_case_id:"DEMO-ST03",partner_id:"DEMO-P02",settlement_batch_id:"DEMO-B02"},release_targets:[{restriction_id:"DEMO-RST-03",expected_restriction_version:"r3"}],version:"sc3",signal_status:"pending_review",signal_event_id:"DEMO-E03",appeal_window_ends_at:"2026-11-07T12:00:00.000Z",appeal_in_progress:false,status:"frozen"}
  ];
  // Keep runtime sensitive-field methods outside the JSON baseline snapshot.
  const riskSensitiveAccess = prototype.riskWorkbench?.sensitiveAccess;
  const riskWorkbenchBaseline = copy(prototype.riskWorkbench);
  function authoritativeSettlementSource(settlementId) {
    const source = settlementSources.find(item => item.case_ref.settlement_case_id === settlementId);
    const riskStore = prototype.riskWorkbench || {};
    const link = (riskStore.caseLinks || []).find(item => item.settlement === settlementId);
    if (!source && !link) return null;
    const current = copy(source || {
      case_ref:{
        customer_id:link.customer,
        commission_case_id:link.commission,
        settlement_case_id:link.settlement,
        partner_id:link.partner,
        settlement_batch_id:link.settlement_batch_id || null
      },
      release_targets:link.restriction && link.restriction !== "-"
        ? [{restriction_id:link.restriction,expected_restriction_version:link.restriction_version || "r1"}]
        : [],
      version:link.source_version || `sc-${link.settlement}`,
      signal_status:link.signal_status || "none",
      appeal_window_ends_at:null,
      appeal_in_progress:false,
      status:link.status
    });
    const event = (riskStore.events || []).find(item => (item.caseRefs || []).some(ref => ref.settlement === settlementId));
    if (event) {
      const fact = signalFacts[event.id];
      current.signal_status = fact?.signal_status || (event.signal && event.signal !== "-" ? event.signal : "pending");
      current.signal_event_id = event.id;
      current.signal_updated_at = event.updated || null;
      if (fact) {
        current.rejected_effective_at = fact.rejected_effective_at || null;
        current.appeal_window_ends_at = fact.appeal_window_ends_at || current.appeal_window_ends_at;
        current.appeal_in_progress = Boolean(fact.appeal_in_progress);
      }
    }
    if (link) {
      current.status = link.status;
      current.current_frozen_amount = link.frozen;
      if (link.restriction && link.restriction !== "-") {
        current.release_targets = current.release_targets.map(target => ({...target,restriction_id:link.restriction}));
      }
    }
    current.blockers = copy(settlementBlockers[settlementId] || []);
    return current;
  }
  let sequence=0, tasks=[], audit=[], approvals=[], executions=[], exportsList=[], previews={}, receipts={}, keys={}, snapshots={}, approvalChainOverride=null, settlementBlockers={}, signalFacts={};
  const queueSessionStorageKey = "affiliate:admin:task-queue-state";
  function persistQueueState() {
    try {
      sessionStorage.setItem(queueSessionStorageKey, JSON.stringify({
        sequence,
        tasks,
        audit,
        approvals,
        executions,
        exportsList,
        previews,
        receipts,
        keys,
        snapshots,
        settlementBlockers,
        signalFacts
      }));
    } catch {}
  }
  function restoreQueueState() {
    try {
      const raw = sessionStorage.getItem(queueSessionStorageKey);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved.tasks) || !Array.isArray(saved.approvals) || !Array.isArray(saved.executions)) return false;
      sequence = Number.isFinite(saved.sequence) ? saved.sequence : sequence;
      tasks = saved.tasks;
      audit = Array.isArray(saved.audit) ? saved.audit : [];
      approvals = saved.approvals;
      executions = saved.executions;
      exportsList = Array.isArray(saved.exportsList) ? saved.exportsList : [];
      previews = saved.previews || {};
      receipts = saved.receipts || {};
      keys = saved.keys || {};
      snapshots = saved.snapshots || {};
      settlementBlockers = saved.settlementBlockers || {};
      signalFacts = saved.signalFacts || {};
      return true;
    } catch {
      return false;
    }
  }
  function fail(code,message,details={}) { const e=new Error(message); Object.assign(e,{code,message,display_message:message,trace_id:`DEMO-TRACE-${++sequence}`,retryable:false,details}); throw e; }
  function cents(value) { if(typeof value!=="string"||!/^[0-9]{1,18}\.[0-9]{2}$/.test(value)) fail("AFF-42201","金额必须是最多18位整数和两位小数的USD字符串"); return BigInt(value.replace(".","")); }
  const roleFor=t => ["guarantee_offset","chargeback","commission_exception"].includes(t.source_type)?"finance":["integration","data_backfill"].includes(t.source_type)?"system_admin":["attribution_review","offboarding_step"].includes(t.source_type)?"operations":"risk";
  const domain=(t,role)=>roleFor(t)===role||(["risk_supervisor","risk_reviewer"].includes(role)&&roleFor(t)==="risk")||(role==="finance_reviewer"&&roleFor(t)==="finance");
  const visible=(t,role)=>["system_admin","audit","compliance"].includes(role)||domain(t,role);
  const own=(t,role)=>t.owner?.user_id===actor(role).user_id;
  const editable=(t,role)=>own(t,role)&&domain(t,role)&&["processing","returned"].includes(t.workflow_state)&&!["integration","offboarding_step"].includes(t.source_type);
  function availability(t,role) {
    if(!Object.hasOwn(labels,t.source_type)||!Object.hasOwn(stateLabels,t.workflow_state))return [];
    const entries = [["claim",t.workflow_state==="open"&&!t.owner&&domain(t,role)],["assign",domain(t,role)&&["open","processing","waiting_material","returned"].includes(t.workflow_state)],["return_pool",own(t,role)&&["processing","waiting_material","returned"].includes(t.workflow_state)],["save_draft",editable(t,role)],["preview",editable(t,role)],["submit_review",editable(t,role)],["request_material",editable(t,role)],["close",["risk_supervisor","system_admin"].includes(role)&&["open","processing","waiting_material","returned"].includes(t.workflow_state)],["status_check",own(t,role)&&t.source_type==="integration"],["retry_integration",own(t,role)&&t.source_type==="integration"&&!!t.fields.retryable&&["failed","not_found"].includes(t.fields.last_status)&&t.fields.attempt<t.fields.max_attempts],["retry_execution",own(t,role)&&t.workflow_state==="execution_failed"&&executions.some(e=>e.task_id===t.task_id&&e.items.some(i=>i.status==="failed"&&i.retryable))]];
    const permitted=action=>{
      if(role==="audit")return false;
      if(action==="close")return ["risk_supervisor","system_admin"].includes(role);
      if(["claim","assign"].includes(action))return domain(t,role);
      if(action==="return_pool")return domain(t,role)&&own(t,role);
      if(["status_check","retry_integration"].includes(action))return own(t,role)&&t.source_type==="integration"&&domain(t,role);
      return domain(t,role)&&own(t,role);
    };
    return entries.filter(([action])=>permitted(action)).map(([action,value])=>{const enabled=action==="return_pool"?value&&["open","processing"].includes(t.workflow_state):value;return {action,enabled,disabled_reason:enabled?null:"当前任务状态不允许此操作"};});
  }
  function row(t,role) { return {...copy(t),allowed_actions:availability(t,role)}; }
  function bump(t,state) { if(state)t.workflow_state=state; t.status=t.workflow_state==="open"?"open":terminal(t)?"done":"processing"; t.version=`v${Number(t.version.slice(1))+1}`; t.updated_at=clock; }
  function record(t,action,role,extra={}) {
    const a={id:`DEMO-TQ-AUDIT-${++sequence}`,time:clock,action,object:t?.task_id||extra.export_id||"task_queue",operator:actor(role).display_name,actor:actor(role),result:"succeeded",trace_id:`DEMO-TRACE-${sequence}`,self_review:false,...extra};
    audit.push(a); if(Array.isArray(prototype.auditRecords))prototype.auditRecords.push(copy(a));
    if(t)t.history.items.push(copy(a));
  }
  function emitRiskNotification(t,eventType,{token,eventKey,recipients=[],title,detail,severity="warning"}={}) {
    if (!t?.task_id || !Array.isArray(prototype.notifications) || !Array.isArray(prototype.notificationOutbox)) return;
    const stableEventKey = eventKey || `${eventType}:${t.task_id}:${token || t.version}`;
    const recipientRoles = [...new Set(recipients.filter(Boolean))];
    recipientRoles.forEach(recipientRole => {
      const recipient = actors[recipientRole] ? actor(recipientRole) : {user_id:recipientRole,display_name:recipientRole,role_code:recipientRole};
      const notificationId = `risk-notice-${stableEventKey.replace(/[^a-zA-Z0-9_-]+/g,"-")}-${recipient.user_id}`;
      const channels = [
        {channel:"in_app",status:"sent",error:null},
        {channel:"email",status:"failed",error:"SMTP_TIMEOUT"}
      ];
      const created = [];
      channels.forEach(({channel,status,error}) => {
        const dedupeKey = `${stableEventKey}:${recipient.user_id}:${channel}`;
        if (prototype.notificationOutbox.some(item => item.dedupeKey === dedupeKey)) return;
        const delivery = {
          id:`risk-outbox-${Date.now().toString(36)}-${sequence++}`,
          notificationId,
          eventKey:stableEventKey,
          riskTaskId:t.task_id,
          recipient:recipient.user_id,
          recipientRole:recipient.role_code,
          channel,
          status,
          attempts:1,
          lastAttemptAt:clock,
          error,
          dedupeKey,
          businessVersion:t.version
        };
        prototype.notificationOutbox.unshift(delivery);
        created.push(delivery);
      });
      if (created.length && !prototype.notifications.some(item => item.id === notificationId)) {
        prototype.notifications.unshift({
          id:notificationId,
          type:"risk",
          severity:created.some(item => item.status === "failed") ? "danger" : severity,
          title:title || `风险任务 ${t.task_id} 有新状态`,
          detail:detail || `风险任务 ${t.task_id} 已更新，请查看统一任务详情。`,
          time:clock,
          route:"risk-workbench",
          tab:"events",
          unread:true,
          riskTaskId:t.task_id,
          eventKey:stableEventKey,
          recipient:recipient.user_id
        });
      }
    });
  }
  const scopeFor=t=>({
    partner_ids:t.partner_id?[t.partner_id]:[],
    customer_ids:t.customer_id?[t.customer_id]:[],
    case_refs:copy(t.case_refs || []),
    object_refs:t.object_id?[{type:t.object_type,id:t.object_id}]:[]
  });
  function conclusions(t) {
    const p=t.task_purpose;
    if(p==="signal_review")return ["signal_confirm","signal_reject"];
    if(p==="settlement_recheck")return ["change_request"];
    if(p==="cluster_determination")return ["confirm","clear","observe"];
    if(["cluster_member_correction","blacklist_add","blacklist_remove","risk_credit_propagation","manual_credit_override"].includes(p))return ["change_request"];
    return ({appeal:["uphold","amend"],hold_extend:["extend_settlement","observe"],circuit_breaker:["maintain","adjust","release"],integration:["change_request"],offboarding_step:[]})[t.source_type]||(["guarantee_offset","chargeback","commission_exception","attribution_review","data_backfill","credit_review"].includes(t.source_type)?["change_request"]:["observe","confirm","clear"]);
  }
  function fieldsFor(type,purpose) {
    const refs=copy([caseRef]);
    const f={
      risk_review:{primary_object:{type:"customer",id:"DEMO-C1"},event_ids:["DEMO-EVENT1"],risk_band:"R2",rules:[{rule_id:"DEMO-RULE1",version:"1"}],aggregation:null,current_determination:"investigating",members:["DEMO-C1","DEMO-C2","DEMO-C3"],independent_features:["device","payment"],authorized_target_refs:["DEMO-TOKEN-DEVICE1"],allowed_entry_types:["device","customer"],blacklist_source:"affiliate",blacklist_status:"active",allowed_scopes:["local"]},
      settlement_overdue:{signal_id:"DEMO-SIGNAL1",case_ref:copy(caseRef),signal_status:purpose==="signal_review"?"investigating":"rejected",settlement_status:"frozen",hold_started_at:"2026-10-01T12:00:00.000Z",elapsed_days_at_trigger:30,current_elapsed_days:38,threshold_days:30,config_version:"DEMO-CONFIG1",appeal_eligibility:{visible:true,reason_code:"window_ended",used:0,max:1,window_ends_at:"2026-11-07T12:00:00.000Z",in_progress:false},release_targets:[{restriction_id:"DEMO-RESTRICTION1",expected_restriction_version:"r1"}]},
      appeal:{appeal_id:"DEMO-APPEAL1",case_ref:copy(caseRef),original_decision_ref:"DEMO-DECISION1",original_evidence_ids:["DEMO-EVIDENCE1"],appeal_material_ids:[],eligibility:{eligible:true},original_domain:"risk"},
      hold_extend:{case_refs:refs,current_due_at:"2026-11-09T12:00:00.000Z",extension_count:0,max_extensions:null,allowed_until:null,block_reasons:[],rule_ref:"DEMO-EXTEND-RULE1",business_jump_url:"#/risk-workbench?tab=events"},
      guarantee_offset:{loss_case_id:"DEMO-LOSS1",case_refs:refs,loss_amount:money("100.00"),available_reserve:money("80.00"),already_offset:money("0.00"),remaining_loss:money("100.00")},
      chargeback:{original_ledger_ids:["DEMO-LEDGER1"],case_refs:refs,reversible_balance:money("420.00"),already_reversed:money("0.00"),recovery_routes:["original_route"]},
      circuit_breaker:{circuit_breaker_id:"DEMO-CIRCUIT1",rule_id:"DEMO-CIRCUIT-RULE1",rule_version:"1",trigger_scope:{partner_ids:["DEMO-P1"]},current_protection:{status:"active",version:"p1"},trigger_values:{count:12},allowed_adjustment_config_refs:["DEMO-POLICY1"]},
      credit_review:{partner_id:"DEMO-P1",current_level:purpose==="manual_credit_override"?"C1":"C2",current_credit_snapshot:"DEMO-CREDIT1",target_level_options:["C0","C1","C2","C3"],risk_propagation:purpose!=="manual_credit_override",effective_policy_ref:"DEMO-CREDIT-POLICY1"},
      commission_exception:{case_refs:refs,source_events:["DEMO-EVENT1"],original_snapshot:"DEMO-COMMISSION-SNAPSHOT1",differences:[{field:"eligible",before:false,after:true}],recalculation_scope:{case_refs:refs}},
      attribution_review:{customer_id:"DEMO-C1",crm_attribution:{channel:"IB",owner_ref:"DEMO-IB1"},claimant_refs:["DEMO-IB1","DEMO-IB2"],click_events:["DEMO-CLICK1"],ib_isolation_result:"isolated",current_owner_ref:"DEMO-IB1",authorized_owner_refs:["DEMO-IB2"]},
      integration:{integration_task_id:"DEMO-INTEGRATION1",integration_version:"i1",operation:"payment",external_system:"CRM",external_ref:"DEMO-EXTERNAL1",last_error:"RESULT_UNKNOWN",last_status:"unknown",retryable:false,attempt:1,max_attempts:3,next_run_at:null,status_check:null,can_retry_without_new_approval:false},
      data_backfill:{missing_event_ids:["DEMO-MISSING1"],source_system:"CRM",case_refs:refs,precheck_diff:[{event_id:"DEMO-MISSING1",status:"missing"}],backfill_policy_ref:"DEMO-BACKFILL-POLICY1"},
      offboarding_step:{offboarding_id:"DEMO-OFFBOARD1",step_key:"settlement_check",predecessor_receipts:[],checklist:[{key:"source_receipt",checked:false}],business_jump_url:"#/admin-modules/partner-list/partner-1003?drawer_tab=offboarding&offboarding_id=DEMO-OFFBOARD1"}
    }; return copy(f[type]);
  }
  function make(index,type,purpose,state="processing",ownerRole) {
    const role=ownerRole||(["guarantee_offset","chargeback","commission_exception"].includes(type)?"finance":["integration","data_backfill"].includes(type)?"system_admin":["attribution_review","offboarding_step"].includes(type)?"operations":"risk");
    const id=`DEMO-TASK-${String(index).padStart(3,"0")}`, due=index%3===0?"2026-11-08T11:00:00.000Z":"2026-11-08T13:00:00.000Z";
    const t={task_id:id,title:`${labels[type]} · 合成案件 ${String(index).padStart(3,"0")}`,source_type:type,source_ref:{kind:type==="settlement_overdue"?"settlement_case":"event",id:type==="settlement_overdue"?"DEMO-SET1":`DEMO-SOURCE-${index}`},task_purpose:purpose,purpose,status:state==="open"?"open":["done","closed"].includes(state)?"done":"processing",workflow_state:state,result:state==="done"?"rejected":state==="closed"?"duplicate":null,owner:state==="open"?null:actor(role),team:copy(teams.find(x=>x.id===actors[role][2])),priority:index%4===0?"high":"medium",object_type:"customer",object_id:"DEMO-C1",object_summary:"合成客户 · 已脱敏",partner_id:"DEMO-P1",customer_id:"DEMO-C1",case_refs:copy([caseRef]),risk_level:"R2",credit_level:"C2",impact:money("250.00"),sla:{started_at:"2026-11-07T12:00:00.000Z",warning_at:"2026-11-08T11:00:00.000Z",due_at:due,rule_id:"DEMO-SLA1",rule_version:"1",escalation_refs:[]},sla_state:due<clock?"overdue":"warning",external_system:type==="integration"?"CRM":null,reason_codes:["manual_review"],created_at:"2026-11-07T12:00:00.000Z",updated_at:clock,version:"v1",business_jump_url:type==="offboarding_step"?"#/partner-management":"#/risk-workbench?tab=events",data_quality:quality(),draft_version:"d0",draft:null,source_scope:null,related_event_ids:["DEMO-EVENT1"],request_id_history:[],history:{items:[],page:1,page_size:20,total:0},approval_refs:[],execution_refs:[],related_task_refs:[],config_versions:{policy:"DEMO-POLICY1"},source_versions:{source:"s1"},fields:fieldsFor(type,purpose),funds_status:"frozen"};
    if(type==="settlement_overdue")t.source_ref.case_ref=copy(caseRef);
    t.source_scope=scopeFor(t);
    if (["risk_investigation","signal_review","cluster_determination","cluster_member_correction","blacklist_add","blacklist_remove"].includes(purpose)) {
      const derived = riskTaskFieldsFor(purpose, t.source_ref, t.fields, t.case_refs, t.object_id || t.customer_id);
      t.fields = {...t.fields, ...derived};
    }
    return t;
  }
  function approvalRoles(role,exportId) {
    if (!exportId && Array.isArray(approvalChainOverride) && approvalChainOverride.length) return copy(approvalChainOverride);
    return exportId?[role==="compliance"?"risk_supervisor":"compliance"]:[role==="risk_supervisor"?"risk_reviewer":"risk_supervisor",role==="finance"?"finance_reviewer":"finance"];
  }
  function approvalFor(t,role,draft,exportId) {
    const roles=approvalRoles(role,exportId);
    const a={approval_id:`DEMO-TQ-APPROVAL-${++sequence}`,task_id:t?.task_id||null,export_id:exportId||null,applicant:actor(role),status:"pending_approval",version:"a1",current_node_index:0,nodes:roles.map((r,i)=>({node_id:`node-${i+1}`,role_code:r,status:i?"not_started":"pending",version:"n1",reviewer:null})),draft:copy(draft||{}),created_at:clock,execution_id:null};
    if(t){
      const plannedRefs = draft?.action_plan?.[0]?.params?.case_refs || t.case_refs || [];
      const authority = settlementAuthoritySnapshot(t, plannedRefs);
      a.task_snapshot=row(t,role);a.source_ref=copy(t.source_ref);a.source_scope=copy(t.source_scope);
      a.proposed_scope={...copy(t.source_scope),case_refs:copy(plannedRefs)};
      a.approved_scope=copy(a.proposed_scope);
      a.case_refs=copy(plannedRefs);a.source_versions=copy(t.source_versions);a.config_versions=copy(t.config_versions);
      a.authority_snapshot=copy(authority);
      a.impact=copy(authority?.impact || t.impact);
      a.preview=copy(Object.values(previews).filter(p=>p.task_id===t.task_id&&p.draft_version===t.draft_version).at(-1)||null);
      a.evidence=copy(detail(t.task_id,{role}).evidence_refs);a.funds_status=t.funds_status;
    }
    approvals.push(a); if(t)t.approval_refs.push(a.approval_id); return a;
  }
  function seed() {
    sequence=0; audit=[]; approvals=[]; executions=[]; exportsList=[]; previews={}; receipts={}; keys={}; snapshots={}; approvalChainOverride=null; settlementBlockers={}; signalFacts={};
    Object.entries(actorDefaults).forEach(([role,values]) => { actors[role]=copy(values); });
    const riskStore=prototype.riskWorkbench;
    Object.keys(riskStore || {}).forEach(key => { delete riskStore[key]; });
    Object.assign(riskStore,copy(riskWorkbenchBaseline));
    riskSensitiveAccess?.reset?.();
    if (riskSensitiveAccess) riskStore.sensitiveAccess = riskSensitiveAccess;
    tasks=[
      make(1,"risk_review","risk_investigation","open"),make(2,"settlement_overdue","settlement_recheck"),make(3,"appeal","appeal_review","waiting_material"),make(4,"hold_extend","hold_extend","pending_approval"),make(5,"guarantee_offset","reserve_offset"),make(6,"integration","integration_recovery","executing"),make(7,"data_backfill","event_backfill","execution_failed"),make(8,"risk_review","risk_investigation","done"),make(9,"risk_review","risk_investigation","closed"),make(10,"credit_review","risk_credit_propagation","returned"),make(11,"commission_exception","commission_recalculate","pending_execution"),make(12,"attribution_review","attribution_correct"),make(13,"chargeback","reverse_recover"),make(14,"circuit_breaker","circuit_breaker"),make(15,"risk_review","cluster_determination"),make(16,"risk_review","cluster_member_correction"),make(17,"risk_review","blacklist_add"),make(18,"risk_review","blacklist_remove"),make(19,"settlement_overdue","signal_review"),make(20,"offboarding_step","offboarding_step"),make(21,"credit_review","manual_credit_override"),make(22,"integration","integration_recovery"),make(23,"credit_review","risk_credit_propagation")
    ];
    for(let n=24;n<=84;n++)tasks.push(make(n,"risk_review","risk_investigation",n%3===0?"open":"processing"));
    tasks.filter((t,index)=>index>23&&index%5===0&&t.sla_state!=="overdue").forEach(t=>{t.sla.warning_at="2026-11-08T12:30:00.000Z";t.sla_state="normal";});
    tasks[9].sla=null; tasks[9].sla_state="unconfigured";
    tasks[1].sla.due_at="2026-11-08T11:00:00.000Z";tasks[1].sla_state="overdue";
    tasks[2].fields.original_signal_status="rejected";
    tasks[8].replaced_by_task_id="DEMO-TASK-001";
    tasks[9].fields.proposed_level="C1";
    tasks[9].draft_version="d1";
    tasks[9].draft={draft_version:"d1",conclusion:"change_request",reason_code:"manual_review",reason:"C2传导至C1的建议已退回，需补充来源证据",evidence_ids:[],action_plan:plan(tasks[9],{conclusion:"change_request",target_level:"C1"},{}).action_plan,next_review_at:null,checklist:[],internal_note:null,form_values:{conclusion:"change_request",target_level:"C1"},updated_at:clock,updated_by:actor("risk")};
    tasks[3].case_refs=copy([holdCaseRef]);tasks[3].fields.case_refs=copy([holdCaseRef]);tasks[3].source_scope=scopeFor(tasks[3]);
    tasks[3].fields.release_recheck_source={source_ref:{kind:"settlement_case",id:holdCaseRef.settlement_case_id,case_ref:copy(holdCaseRef)},case_ref:copy(holdCaseRef),release_targets:copy(settlementSources[1].release_targets),expected_source_version:"sc4",source_path:"#/tasks?task_id=DEMO-TASK-004"};
    Object.assign(tasks[19],{business_jump_url:tasks[19].fields.business_jump_url,partner_id:"partner-1003",customer_id:null,object_id:"partner-1003",object_type:"partner",case_refs:[],impact:null});
    tasks[19].source_scope=scopeFor(tasks[19]);
    tasks[21].fields={...tasks[21].fields,operation:"postback",last_status:"failed",last_error:"TIMEOUT_CONFIRMED",retryable:true,can_retry_without_new_approval:true};
    tasks[23].title="长".repeat(200); tasks[24].title="LongUnbrokenTaskTitle".repeat(12); tasks[25].title="<img src=x onerror=alert(1)> 合成安全标题"; tasks[26].title="=1+1"; tasks[27].impact=money("0.00"); tasks[28].impact=null; tasks[29].impact=money("999999999999999999.99");
    const seedDraft=(t,form,reason)=>{const d={...plan(t,form,{}),draft_version:"d1",reason_code:"manual_review",reason,evidence_ids:[`${t.task_id}-EVIDENCE1`],next_review_at:null,checklist:[{key:"source_verified",checked:true}],internal_note:null,form_values:form,updated_at:clock,updated_by:t.owner};t.draft_version="d1";t.draft=copy(d);return d;};
    approvalFor(tasks[3],"risk",seedDraft(tasks[3],{conclusion:"extend_settlement"},"合成延长申请，等待完整串行审批"));
    const a=approvalFor(tasks[10],"finance",seedDraft(tasks[10],{conclusion:"change_request"},"合成佣金重算申请，源案件与差异已核验"));
    a.status="approved";a.nodes.forEach(n=>{n.status="approved";n.reviewer=actor(n.role_code);n.reason="合成已批准记录：已核验案件范围和快照";n.decided_at=clock;});
    createExecution(tasks[10],a,"pending");
    const e=createExecution(tasks[6],null,"failed");e.items[0].retryable=false;e.items[0].attempt=3;e.items[0].max_attempts=3;e.items[0].error_code="RETRY_LIMIT";tasks[6].fields.retry_policy={attempt:3,max_attempts:3};
    [
      ["DEMO-T01","signal_review","DEMO-E01","DEMO-C01","DEMO-CM01","DEMO-ST01","100.00","open"],
      ["DEMO-T03","signal_review","DEMO-E03","DEMO-C03","DEMO-CM03","DEMO-ST03","200.00","pending_approval"],
      ["DEMO-T04","risk_investigation","DEMO-E04","DEMO-C01","DEMO-CM01","DEMO-ST01","100.00","processing"]
    ].forEach(([id,purpose,event,customer,commission,settlement,amount,state],index)=>{
      const type=purpose==="signal_review"?"settlement_overdue":"risk_review";
      const eventSeed=(prototype.riskWorkbench?.events || []).find(item=>item.id===event);
      const partner=eventSeed?.caseRefs?.[0]?.partner || (event==="DEMO-E03" ? "DEMO-P02" : "DEMO-P01");
      const ref={customer_id:customer,commission_case_id:commission,settlement_case_id:settlement,partner_id:partner,settlement_batch_id:null};
      const t=make(90+index,type,purpose,state);
      Object.assign(t,{task_id:id,title:`${purpose==="signal_review"?"信号复核":"风险调查"} · ${event}`,source_ref:{kind:"event",id:event},customer_id:customer,partner_id:partner,object_id:eventSeed?.primary || customer,object_type:eventSeed?.primary?.startsWith("DEMO-P")?"partner":"customer",case_refs:[ref],impact:money(amount),related_event_ids:[event]});
      t.fields = fieldsFor(type,purpose);
      t.fields.primary_object = {type:t.object_type,id:t.object_id};
      t.fields.event_ids = [event];
      t.fields.case_refs = [copy(ref)];
      t.fields.signal_id = purpose==="signal_review" ? event : t.fields.signal_id;
      if (purpose === "signal_review" && eventSeed) {
        t.fields.signal_status = eventSeed.signal;
        t.fields.appeal_eligibility = {
          visible:false,
          reason_code:eventSeed.signal === "pending_review" ? "signal_pending_review" : "not_applicable",
          used:0,max:1,window_ends_at:null,in_progress:false
        };
      }
      if (event === "DEMO-E04") {
        const aggregationCase = {
          customer_id:"DEMO-C01",
          commission_case_id:"DEMO-CM01",
          settlement_case_id:"DEMO-ST01",
          partner_id:partner,
          settlement_batch_id:"DEMO-B01"
        };
        t.fields.aggregation = {
          event_id:event,
          partner_id:partner,
          metric:"risk_customer_ratio",
          trigger_snapshot:{
            numerator:2,
            denominator:10,
            ratio:0.2,
            denominator_definition:"窗口内已归属且完成风险评估的客户",
            window_start:"2026-10-08T12:00:00+08:00",
            window_end:"2026-11-07T12:00:00+08:00",
            timezone:"Asia/Shanghai",
            threshold:0.15,
            config_version:"DEMO-RISK-POLICY-1",
            customer_ids:["DEMO-C01","DEMO-C02"],
            case_refs:[aggregationCase]
          },
          current_snapshot:{
            numerator:2,
            denominator:10,
            ratio:0.2,
            denominator_definition:"窗口内已归属且完成风险评估的客户",
            window_start:"2026-10-08T12:00:00+08:00",
            window_end:"2026-11-08T12:00:00+08:00",
            timezone:"Asia/Shanghai",
            threshold:0.15,
            config_version:"DEMO-RISK-POLICY-1",
            customer_ids:["DEMO-C01","DEMO-C02"],
            case_refs:[aggregationCase]
          },
          source_scope:{partner_ids:[partner],customer_ids:["DEMO-C01","DEMO-C02"],case_refs:[]},
          proposed_scope:null,
          global_escalation_reason:null
        };
      }
      t.source_versions = {source:`risk-${event}-v1`};
      t.config_versions = {policy:`risk-policy-${event}`};
      const riskTaskSeed=(prototype.riskWorkbench?.tasks || []).find(item=>item.id===id);
      if (riskTaskSeed?.sla) {
        t.sla = {...t.sla,due_at:new Date(riskTaskSeed.sla.replace(" ","T")+"+08:00").toISOString()};
        t.sla_state = new Date(t.sla.due_at) < new Date(clock) ? "overdue" : "warning";
      }
      if(type==="settlement_overdue"){t.fields.case_ref=copy(ref);t.fields.signal_id=event;t.fields.release_targets=[];}
      const derivedFields = riskTaskFieldsFor(purpose, t.source_ref, t.fields, t.case_refs, t.object_id || t.customer_id);
      t.fields = {...t.fields, ...derivedFields};
      t.fields.primary_object = {type:t.object_type,id:t.object_id};
      t.fields.event_ids = [event];
      t.fields.case_refs = [copy(ref)];
      if (purpose === "signal_review") {
        t.fields.signal_id = event;
        t.fields.signal_status = eventSeed?.signal || t.fields.signal_status || null;
        t.fields.case_ref = copy(ref);
        t.fields.release_targets = [];
      }
      t.source_scope=scopeFor(t);tasks.push(t);
      if(state==="pending_approval")approvalFor(t,"risk",seedDraft(t,{conclusion:"signal_confirm"},"沿统一任务资源迁入的合成信号审批"));
    });
  }
  function get(id,role) { const t=tasks.find(x=>x.task_id===id); if(!t)fail("AFF-40401","任务不存在"); if(!visible(t,role))fail("AFF-40301","没有当前任务查看权限"); return t; }
  function context(ctx) { return typeof ctx==="string"?{role:ctx}:ctx||{}; }
  function options(role="risk") {
    role=context(role).role||role;const u=actor(role);
    return {current_user:u,current_team_id:actors[u.role_code][2],authorized_scopes:["mine","claimable","team","authorized"],default_scope:"mine",permissions:role==="audit"?["tasks.view","tasks.export"]:["tasks.view","tasks.claim","tasks.assign","tasks.draft","tasks.submit","tasks.request_material","tasks.export"],timezone:"Asia/Shanghai",teams:copy(teams),users:[...Object.keys(actors).map(r=>({...actor(r),team_id:actors[r][2]})),{user_id:"DEMO-RISK-02",display_name:"唐明澈",role_code:"risk",team_id:"DEMO-RISK"}],source_types:Object.entries(labels).map(([key,label_zh])=>({key,label_zh,label_en:key,template_key:key,draft_endpoint:key==="risk_review"?"/risk-draft":"/draft",required_domain:key,approval_required:true,completion_mode:"executor",allowed_conclusions:[],allowed_actions:[]})),workflow_states:Object.entries(stateLabels).map(([key,label_zh])=>({key,label_zh,label_en:key,terminal:["done","closed"].includes(key)})),reason_options:[{key:"manual_review",label_zh:"人工复核",label_en:"Manual review",purpose:"all"},{key:"duplicate",label_zh:"重复任务",purpose:"close"},{key:"source_withdrawn",label_zh:"来源撤销",purpose:"close"},{key:"object_invalidated",label_zh:"对象失效",purpose:"close"}],task_purposes:["risk_investigation","signal_review","settlement_recheck","cluster_determination","cluster_member_correction","blacklist_add","blacklist_remove","risk_credit_propagation","manual_credit_override"],export_policy:{enabled:true,requires_approval:true,max_rows:null,policy_version:"DEMO-EXPORT1"},freshness_policy:{list_ttl_seconds:60,detail_ttl_seconds:30},external_systems:["CRM"],server_time:clock,server_now:clock};
  }
  const arr=v=>v==null?[]:Array.isArray(v)?v:String(v).split(",");
  function list(query={},ctx={}) {
    const role=ctx.role||"risk", scenario=ctx.scenario, q={...query}; const scope=q.scope||(["system_admin","audit"].includes(role)?"authorized":"mine");
    if(["error","read_error","offline"].includes(scenario))fail("AFF-50301","任务服务暂时不可用");
    if(["forbidden","revoked"].includes(scenario))fail("AFF-40301","任务查看权限已撤销");
    if(!["mine","claimable","team","authorized"].includes(scope)||role==="audit"&&scope==="claimable")fail("AFF-40301","未经授权的任务范围");
    if(q.workflow_states&&(q.status_group||q.status))fail("AFF-40001","状态查询参数互斥");
    if(q.source_types&&q.source_type)fail("AFF-40001","任务类型查询参数互斥");
    if((q.owner_id||q.team_id)&&!["team","authorized"].includes(scope))fail("AFF-40001","责任人筛选仅支持团队及授权范围");
    if(q.q&&[...String(q.q).trim()].length>100)fail("AFF-40001","搜索最多100字符");
    const historic=["terminal","all"].includes(q.status_group)||arr(q.workflow_states).some(s=>["done","closed"].includes(s))||q.status==="done";
    if(!!q.updated_from!==!!q.updated_to||historic&&(!q.updated_from||!q.updated_to))fail("AFF-40001","历史查询必须提供完整时间区间");
    if(q.updated_from&&(!Number.isFinite(Date.parse(q.updated_from))||!Number.isFinite(Date.parse(q.updated_to))||Date.parse(q.updated_to)<=Date.parse(q.updated_from)||Date.parse(q.updated_to)-Date.parse(q.updated_from)>366*86400000))fail("AFF-40001","查询时间区间无效或超过366天");
    const page=Math.max(1,Number(q.page)||1),pageSize=Number(q.page_size)||20;if(![10,20,50].includes(pageSize))fail("AFF-40001","分页大小只允许10、20或50");
    const signature=JSON.stringify(Object.fromEntries(Object.entries({...q,scope}).filter(([k])=>!["page","page_size","snapshot_id"].includes(k)).sort()));
    let snapshot=q.snapshot_id?snapshots[q.snapshot_id]:null;
    if(q.snapshot_id&&(!snapshot||snapshot.role!==role||snapshot.signature!==signature||snapshot.expires<Date.now()))fail("AFF-40901","快照已失效，请重新查询",{reason:"SNAPSHOT_INVALID"});
    if(!snapshot) {
      const all=tasks.filter(t=>visible(t,role));
      const scoped=all.filter(t=>scope==="mine"?own(t,role):scope==="claimable"?t.workflow_state==="open"&&!t.owner&&domain(t,role):scope==="team"?t.team.id===actors[actor(role).role_code][2]:true);
      let selected=scoped.filter(t=>{
        const group=q.status_group||(!q.workflow_states&&!q.status?"active":null);
        return (!group||group==="all"||(group==="active"?!terminal(t):terminal(t)))&&(!q.status||t.status===q.status)&&(!arr(q.workflow_states).length||arr(q.workflow_states).includes(t.workflow_state))&&(!arr(q.source_types||q.source_type).length||arr(q.source_types||q.source_type).includes(t.source_type))&&(!arr(q.priority).length||arr(q.priority).includes(t.priority))&&(!q.sla_state||q.sla_state==="all"||t.sla_state===q.sla_state)&&(!q.overdue||t.sla_state==="overdue")&&(!q.owner_id||(q.owner_id==="unassigned"?!t.owner:t.owner?.user_id===q.owner_id))&&(!q.team_id||t.team.id===q.team_id)&&(!q.partner_id||t.partner_id===q.partner_id)&&(!q.customer_id||t.customer_id===q.customer_id)&&(!q.external_system||t.external_system===q.external_system)&&(!q.updated_from||t.updated_at>=q.updated_from&&t.updated_at<q.updated_to)&&(!q.q||[t.title,t.task_id,t.source_ref.id,t.partner_id,t.customer_id].some(x=>x?.toLowerCase().includes(String(q.q).trim().toLowerCase())));
      });
      if(scenario==="empty")selected=[];
      const rank={overdue:0,warning:1,normal:2,unconfigured:3,high:0,medium:1,low:2};
      selected.sort((a,b)=>{
        if(q.sort_by){ let av=q.sort_by==="priority"?rank[a.priority]:q.sort_by==="sla_due_at"?a.sla?.due_at:q.sort_by==="impact_amount"?(a.impact?cents(a.impact.amount):null):a.updated_at;let bv=q.sort_by==="priority"?rank[b.priority]:q.sort_by==="sla_due_at"?b.sla?.due_at:q.sort_by==="impact_amount"?(b.impact?cents(b.impact.amount):null):b.updated_at;if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;if(av!==bv)return (av<bv?-1:1)*(q.direction==="desc"?-1:1);}
        else {const v=Number(terminal(a))-Number(terminal(b))||rank[a.sla_state]-rank[b.sla_state]||rank[a.priority]-rank[b.priority];if(v)return v;}
        return a.task_id.localeCompare(b.task_id);
      });
      const id=`DEMO-SNAPSHOT-${++sequence}`,statsFailed=["stats_error","summary_error"].includes(scenario);
      const count=fn=>statsFailed?null:fn();
      snapshot={role,signature,expires:Date.now()+300000,rows:selected.map(t=>row(t,role)),summary:{mine_active_count:count(()=>all.filter(t=>own(t,role)&&!terminal(t)).length),claimable_count:count(()=>all.filter(t=>t.workflow_state==="open"&&!t.owner&&domain(t,role)).length),scope_warning_count:count(()=>scoped.filter(t=>t.sla_state==="warning"&&!terminal(t)).length),scope_overdue_count:count(()=>scoped.filter(t=>t.sla_state==="overdue"&&!terminal(t)).length),scope_execution_failed_count:count(()=>scoped.filter(t=>t.workflow_state==="execution_failed").length),scope,snapshot_id:id,snapshot_at:clock,status:statsFailed?"unavailable":"ok"},id};
      snapshots[id]=snapshot;
    }
    const total=snapshot.rows.length,pages=Math.ceil(total/pageSize),dq=quality();if(["partial","missing","stale"].includes(scenario))dq.status=scenario;
    return copy({items:snapshot.rows.slice((page-1)*pageSize,page*pageSize),meta:{page:total?page:1,page_size:pageSize,total,pages,sort:q.sort_by||"default",snapshot_id:snapshot.id,snapshot_at:clock,as_of:clock,snapshot_expires_at:at(5 * 60 * 1000),expires_at:at(5 * 60 * 1000),server_now:clock,server_time:clock,timezone:"Asia/Shanghai",fresh_until:at(60 * 1000)},summary:snapshot.summary,data_quality:dq});
  }
  function detail(id,ctx={}) {
    const role=ctx.role||"risk";if(["forbidden","revoked"].includes(ctx.scenario))fail("AFF-40301","查看权限已撤销");
    const t=get(id,role), evidence=[{evidence_id:`${id}-EVIDENCE1`,id:`${id}-EVIDENCE1`,name:"合成来源核验记录.txt",type:"text/plain",status:"clean",scan_status:"clean",invalidated:false,source:"unified_prototype_fixture",source_version:"s1",collected_at:clock,created_at:clock}];
    const pack=items=>({items:copy(items),page:1,page_size:20,total:items.length});
    return {...row(t,role),approval_refs:copy(approvals.filter(a=>a.task_id===id)),execution_refs:copy(executions.filter(e=>e.task_id===id)),evidence_refs:evidence,server_now:clock,server_time:clock,sla_due_at:t.sla?.due_at||null,sla_rule_version:t.sla?.rule_version||null,escalation_refs:[],history:pack(t.history.items),sections:{summary:{business_status:t.fields.settlement_status||"unchanged",risk_status:t.fields.current_determination||"investigating",settlement_status:t.funds_status,source_scope:copy(t.source_scope)},processing:{template_key:t.source_type,template_version:"DEMO-TEMPLATE1",task_purpose:t.task_purpose,fields:copy(t.fields),allowed_conclusions:conclusions(t),allowed_actions:availability(t,role),checklist:[{key:"source_verified",label:"已核验来源与逐案范围",required:true}],blocking_reasons:t.source_type==="hold_extend"?["生产延长规则未配置，演示环境不执行延长"]:[],config_versions:copy(t.config_versions)},evidence:pack(evidence),approvals:pack(approvals.filter(a=>a.task_id===id)),executions:pack(executions.filter(e=>e.task_id===id)),history:pack(t.history.items),related:pack(t.related_task_refs)}};
  }
  function assignees(id,ctx={}) { const role=ctx.role||"risk",t=get(id,role);if(!availability(t,role).find(a=>a.action==="assign")?.enabled)fail("AFF-40301","无任务转办权限");const opts=options(role);return {teams:opts.teams.filter(x=>x.id===t.team.id),users:opts.users.filter(x=>x.team_id===t.team.id&&(!ctx.team_id||x.team_id===ctx.team_id)),meta:{page:1,total:2},can_return_pool:own(t,role)}; }
  function plan(t,values,body) {
    const v=values||{},conclusion=v.conclusion||body.conclusion||null;
    const map={risk_investigation:{confirm:"confirm_event",clear:"clear_event",observe:"observe"},cluster_determination:{confirm:"set_cluster_determination",clear:"set_cluster_determination",observe:"observe"},signal_review:{signal_confirm:"signal_confirm",signal_reject:"signal_reject"}};
    const requestedRiskAction = v.risk_action || body.risk_action || null;
    const purposeAction = ({settlement_recheck:"release_and_recheck",cluster_member_correction:"cluster_member_correction",blacklist_add:"blacklist_add",blacklist_remove:"blacklist_remove",risk_credit_propagation:"credit_propagation",manual_credit_override:"credit_override"})[t.task_purpose];
    const action = (t.task_purpose === "risk_investigation" ? requestedRiskAction : null)
      || map[t.task_purpose]?.[conclusion]
      || purposeAction
      || ({guarantee_offset:"reserve_offset",chargeback:"reverse_recover",commission_exception:"commission_recalculate",attribution_review:"attribution_correct",data_backfill:"event_backfill",appeal:conclusion==="uphold"?"uphold_appeal":"amend_appeal",hold_extend:conclusion,circuit_breaker:({maintain:"maintain_protection",adjust:"adjust_protection",release:"release_circuit_breaker"})[conclusion]})[t.source_type];
    const refsKey = ref => `${ref.customer_id}|${ref.commission_case_id}|${ref.settlement_case_id}`;
    const sourceRefs = copy(t.case_refs || []);
    const allowedRefs = copy(t.fields.allowed_case_refs || sourceRefs);
    const scopeMode = v.scope_mode || "source_cases";
    let selectedRefs;
    if (scopeMode === "source_cases") {
      selectedRefs = sourceRefs;
    } else if (scopeMode === "selected_cases") {
      if (!Object.prototype.hasOwnProperty.call(v,"selected_case_refs") || !Array.isArray(v.selected_case_refs) || !v.selected_case_refs.length) {
        fail("AFF-42201","选择指定案件时必须至少选择一笔完整案件");
      }
      const selectedKeys = new Set(v.selected_case_refs);
      if (selectedKeys.size !== v.selected_case_refs.length) fail("AFF-42201","处置案件不能重复选择");
      selectedRefs = v.selected_case_refs.map(key => allowedRefs.find(ref => refsKey(ref) === key));
      if (selectedRefs.some(ref => !ref)) fail("AFF-42201","处置案件超出当前风险任务授权范围");
    } else if (scopeMode === "partner_all") {
      selectedRefs = allowedRefs;
      if (!selectedRefs.length) fail("AFF-42201","当前风险任务没有可用的合作方案件");
    } else {
      fail("AFF-42201","处置案件范围方式无效");
    }
    const sourceKeys = new Set(sourceRefs.map(refsKey));
    const expanded = selectedRefs.some(ref => !sourceKeys.has(refsKey(ref)));
    const escalationReason = String(v.global_escalation_reason || "").trim();
    if (expanded && !escalationReason) fail("AFF-42201","扩大案件范围必须填写升级理由");
    if (expanded && !(Array.isArray(body.evidence_ids) && body.evidence_ids.length)) fail("AFF-42201","扩大案件范围必须引用至少一条证据");
    const params={...copy(v),case_refs:copy(selectedRefs)};
    delete params.conclusion;
    delete params.risk_action;
    params.scope_mode = scopeMode;
    params.source_case_refs = sourceRefs;
    params.global_escalation_reason = escalationReason || null;
    delete params.selected_case_refs;
    if(t.task_purpose==="settlement_recheck")Object.assign(params,{ref:copy(t.fields.case_ref),release_targets:copy(t.fields.release_targets)});
    if(t.task_purpose==="cluster_determination")params.determination=conclusion==="confirm"?"confirmed":"cleared";
    if(["confirm_event","clear_event"].includes(action))Object.assign(params,{event_id:t.fields.event_ids?.[0]||t.source_ref?.id,expected_event_version:t.source_versions?.source||null});
    if(action==="continue_freeze")Object.assign(params,{duration_policy_ref:v.duration_policy_ref||t.fields.duration_policy_ref||"DEMO-HOLD-POLICY1"});
    if(action==="extend_settlement")Object.assign(params,{extension_rule_ref:v.extension_rule_ref||t.fields.extension_rule_ref||"DEMO-EXTEND-RULE1"});
    if(action==="refer_finance")Object.assign(params,{finance_action:v.finance_action||"reject_commission",financial_reason_ref:v.financial_reason_ref||"DEMO-FINANCE-REVIEW1"});
    if(action==="credit_propagation")Object.assign(params,{partner_id:v.partner_id||t.fields.partner_id||t.partner_id,mode:v.credit_mode||"credit_deduct",target_level:v.target_level||null,credit_rule_ref:v.credit_rule_ref||"DEMO-CREDIT-POLICY1"});
    if(t.source_type==="guarantee_offset")params.loss_case_id=t.fields.loss_case_id;
    if(t.source_type==="chargeback")params.original_ledger_ids=copy(t.fields.original_ledger_ids);
    if(v.proposed_amount)params.proposed_amount=typeof v.proposed_amount==="object"?v.proposed_amount:money(v.proposed_amount);
    if(t.source_type==="commission_exception")Object.assign(params,{recalculation_scope:copy(t.fields.recalculation_scope),source_snapshot_refs:[t.fields.original_snapshot]});
    if(t.source_type==="data_backfill")Object.assign(params,{missing_event_ids:v.missing_event_ids||t.fields.missing_event_ids,backfill_policy_ref:t.fields.backfill_policy_ref,source_snapshot_refs:["DEMO-SOURCE-SNAPSHOT1"]});
    const actionScope = {...copy(t.source_scope),case_refs:copy(selectedRefs)};
    return {conclusion,action_plan:action?[{item_id:"item-1",action,scope:actionScope,params,evidence_ids:copy(body.evidence_ids||[]),config_version:"DEMO-POLICY1",requires_domains:action==="refer_finance"?["finance"]:[roleFor(t)]}]:[]};
  }
  function riskTaskFieldsFor(purpose,source,original,caseRefs,primary) {
    const base = {
      primary_object: primary ? {type:source.kind === "event" ? (original.primary?.startsWith("DEMO-P") ? "partner" : original.primary?.startsWith("DEMO-G") ? "cluster" : "customer") : source.kind,id:primary} : null,
      event_ids:source.kind === "event" ? [source.id] : [],
      case_refs:copy(caseRefs || []),
      current_determination:source.kind === "event" ? (original.determination || "pending") : null,
      settlement_status:caseRefs?.length ? "frozen" : "not_applicable"
    };
    if (purpose === "signal_review") {
      return {
        ...base,
        signal_id:source.id,
        case_ref:copy(caseRefs?.[0] || null),
        signal_status:original.signal || null,
        release_targets:[],
        appeal_eligibility:{visible:false,reason_code:original.signal === "pending_review" ? "signal_pending_review" : "not_applicable",used:0,max:1,window_ends_at:null,in_progress:false},
        risk_actions:["signal_confirm","signal_reject","continue_freeze","extend_settlement","refer_finance"],
        duration_policy_ref:"DEMO-HOLD-POLICY1",
        extension_rule_ref:"DEMO-EXTEND-RULE1",
        finance_action_options:["reject_commission","reverse","recover","deposit_offset"],
        financial_reason_ref:"DEMO-FINANCE-REVIEW1"
      };
    }
    if (purpose === "settlement_recheck") {
      return {
        ...base,
        signal_id:source.id,
        case_ref:copy(caseRefs?.[0] || null),
        signal_status:original.signal || null,
        release_targets:[],
        appeal_eligibility:{visible:true,reason_code:"window_ended",used:0,max:1,window_ends_at:null,in_progress:false}
      };
    }
    if (purpose === "cluster_determination" || purpose === "cluster_member_correction") {
      return {
        ...base,
        members:[...new Set((original.memberRows || []).map(member => member[0]))],
        independent_features:copy(original.features || []),
        authorized_target_refs:[],
        member_correction_mode:purpose === "cluster_member_correction" ? "remove_to_unassigned" : null
      };
    }
    if (purpose === "blacklist_remove") {
      return {
        ...base,
        primary_object:{type:"blacklist",id:source.id},
        event_ids:[],
        case_refs:[],
        current_determination:null,
        settlement_status:"not_applicable",
        entry_id:original.id,
        blacklist_source:original.source,
        blacklist_status:original.status
      };
    }
    if (purpose === "blacklist_add") {
      return {
        ...base,
        primary_object:{type:source.kind,id:primary},
        event_ids:source.kind === "event" ? [source.id] : [],
        case_refs:copy(caseRefs || []),
        allowed_entry_types:["device","customer"],
        allowed_scopes:["local"],
        authorized_target_refs:primary ? [primary] : []
      };
    }
    if (purpose === "risk_investigation") {
      const partnerId = caseRefs?.[0]?.partner_id || original.caseRefs?.[0]?.partner || null;
      const partnerObject = (prototype.riskWorkbench?.objects || []).find(item => item.id === partnerId);
      const allowedCaseRefs = (prototype.riskWorkbench?.caseLinks || [])
        .filter(item => !partnerId || item.partner === partnerId)
        .map(item => ({customer_id:item.customer,commission_case_id:item.commission,settlement_case_id:item.settlement,partner_id:item.partner,settlement_batch_id:item.settlement_batch_id || null}));
      return {
        ...base,
        members:[],
        independent_features:[],
        authorized_target_refs:[],
        allowed_entry_types:[],
        allowed_scopes:[],
        allowed_case_refs:allowedCaseRefs.length ? allowedCaseRefs : copy(caseRefs || []),
        risk_actions:["confirm_event","clear_event","continue_freeze","extend_settlement","refer_finance","credit_propagation"],
        duration_policy_ref:"DEMO-HOLD-POLICY1",
        extension_rule_ref:"DEMO-EXTEND-RULE1",
        partner_id:partnerId,
        credit_rule_ref:"DEMO-CREDIT-POLICY1",
        current_level:partnerObject?.credit || "C2",
        risk_propagation:true,
        target_level_options:["C0","C1","C2","C3","C4"]
      };
    }
    return base;
  }
  function validate(t,d,strict) {
    if(d.conclusion&&!conclusions(t).includes(d.conclusion))fail("AFF-42201","结论不适用于此任务目的");
    if(d.reason!=null&&typeof d.reason!=="string")fail("AFF-42201","处理说明必须是文本");
    if(d.internal_note!=null&&(typeof d.internal_note!=="string"||[...d.internal_note].length>2000))fail("AFF-42201","内部备注长度无效");
    if(d.evidence_ids.some(id=>id!==`${t.task_id}-EVIDENCE1`))fail("AFF-42201","证据不属于当前任务或不可用");
    const p=d.action_plan[0]?.params||{},v=d.form_values||{};
    const action=d.action_plan[0]?.action;
    if (v.risk_action && t.task_purpose !== "risk_investigation") fail("AFF-42201","risk_action 仅适用于风险调查任务");
    if (["risk_investigation","signal_review","settlement_recheck","cluster_determination","cluster_member_correction","blacklist_add","blacklist_remove","risk_credit_propagation","manual_credit_override"].includes(t.task_purpose) && action) {
      const expectedAction = t.task_purpose === "risk_investigation"
        ? (v.risk_action || ({confirm:"confirm_event",clear:"clear_event",observe:"observe"})[d.conclusion] || null)
        : ({
            signal_review: ({signal_confirm:"signal_confirm",signal_reject:"signal_reject"})[d.conclusion],
            settlement_recheck: d.conclusion === "change_request" ? "release_and_recheck" : null,
            cluster_determination: ({confirm:"set_cluster_determination",clear:"set_cluster_determination",observe:"observe"})[d.conclusion],
            cluster_member_correction: d.conclusion === "change_request" ? "cluster_member_correction" : null,
            blacklist_add: d.conclusion === "change_request" ? "blacklist_add" : null,
            blacklist_remove: d.conclusion === "change_request" ? "blacklist_remove" : null,
            risk_credit_propagation: d.conclusion === "change_request" ? "credit_propagation" : null,
            manual_credit_override: d.conclusion === "change_request" ? "credit_override" : null
          })[t.task_purpose];
      if (!expectedAction || action !== expectedAction || (t.fields.risk_actions && !t.fields.risk_actions.includes(action))) fail("AFF-42201","处置动作不在当前风险任务授权目录");
    }
    if (t.fields.allowed_case_refs?.length && p.case_refs?.some(ref => !t.fields.allowed_case_refs.some(item => `${item.customer_id}|${item.commission_case_id}|${item.settlement_case_id}`===`${ref.customer_id}|${ref.commission_case_id}|${ref.settlement_case_id}`))) fail("AFF-42201","处置案件超出当前风险任务授权范围");
    if (d.action_plan[0]?.scope?.case_refs && p.case_refs && JSON.stringify(d.action_plan[0].scope.case_refs.map(ref=>`${ref.customer_id}|${ref.commission_case_id}|${ref.settlement_case_id}`).sort()) !== JSON.stringify(p.case_refs.map(ref=>`${ref.customer_id}|${ref.commission_case_id}|${ref.settlement_case_id}`).sort())) fail("AFF-42201","处置范围与批准参数不一致");
    if (["continue_freeze","extend_settlement","refer_finance","credit_propagation"].includes(action) && !p.case_refs?.length) fail("AFF-42201","风险处置必须明确案件范围");
    if (action==="credit_propagation" && (!p.partner_id || !["credit_deduct","target_level","credit_deduct_and_target_level"].includes(p.mode))) fail("AFF-42201","信用传导必须明确合作方与传导模式");
    if (action==="refer_finance" && !p.finance_action) fail("AFF-42201","转财务必须选择财务处理动作");
    if (action==="extend_settlement" && !p.extension_rule_ref) fail("AFF-42201","延长暂扣必须引用有效规则");
    if (action==="continue_freeze" && !p.duration_policy_ref) fail("AFF-42201","继续暂扣必须引用暂扣策略");
    if(p.proposed_amount){if(p.proposed_amount.currency!=="USD")fail("AFF-42201","仅支持USD");const n=cents(p.proposed_amount.amount);if(n<=0n)fail("AFF-42201","金额必须大于零");const limit=t.source_type==="guarantee_offset"?[t.fields.available_reserve.amount,t.fields.remaining_loss.amount]:t.source_type==="chargeback"?[t.fields.reversible_balance.amount]:[];if(limit.some(x=>n>cents(x)))fail("AFF-42201","金额超过当前可用余额");}
    if(v.target_level&&(!t.fields.target_level_options?.includes(v.target_level)||t.fields.risk_propagation&&Number(v.target_level.slice(1))>=Number(t.fields.current_level.slice(1))))fail("AFF-42201","信用目标等级超出当前目的授权范围");
    if(v.proposed_owner_ref&&!t.fields.authorized_owner_refs?.includes(v.proposed_owner_ref))fail("AFF-42201","归属目标超出CRM及IB隔离范围");
    if(v.target_ref&&!t.fields.authorized_target_refs?.includes(v.target_ref))fail("AFF-42201","名单目标不是服务器授权对象");
    if(v.permanent===true||v.scope==="global")fail("AFF-42201","当前授权不允许永久或全局名单");
    if(t.task_purpose==="blacklist_add"&&v.scope&&!t.fields.allowed_scopes.includes(v.scope))fail("AFF-42201","名单适用范围不在授权目录");
    if(v.expires_at&&(!Number.isFinite(Date.parse(v.expires_at))||v.expires_at<=clock))fail("AFF-42201","名单失效时间必须是未来有效时间");
    if(v.member_ids&&(v.member_ids.some(x=>!t.fields.members?.includes(x))||new Set(v.member_ids).size!==v.member_ids.length))fail("AFF-42201","成员不在当前集群范围或重复");
    if(!strict)return;
    if(!d.conclusion||[...(d.reason||"").trim()].length<10||[...d.reason].length>1000||!d.reason_code)fail("AFF-42201","请填写结论、原因码及10至1000字符说明");
    if(!d.checklist.some(x=>x.key==="source_verified"&&x.checked))fail("AFF-42201","请完成来源与逐案范围核验");
    if(!d.action_plan.length)fail("AFF-42201","当前模板不支持提交方案");
    if(d.conclusion==="observe"&&(!d.next_review_at||!Number.isFinite(Date.parse(d.next_review_at))||d.next_review_at<=clock))fail("AFF-42201","继续观察必须选择未来复查时间");
    if(t.task_purpose==="settlement_recheck"&&(t.source_ref.kind!=="settlement_case"||JSON.stringify(t.source_ref.case_ref)!==JSON.stringify(t.fields.case_ref)||!t.fields.release_targets?.length||!["confirmed","rejected"].includes(t.fields.signal_status)||t.fields.appeal_eligibility.in_progress||t.fields.appeal_eligibility.window_ends_at>clock))fail("AFF-42201","结算重检信号、申诉门禁或逐案范围不满足");
    if(t.source_type==="hold_extend")fail("AFF-42201","生产延长规则尚未配置，禁止执行");
    if(["guarantee_offset","chargeback"].includes(t.source_type)&&!p.proposed_amount)fail("AFF-42201","请输入拟处理金额");
    if(t.source_type==="chargeback"&&!t.fields.recovery_routes.includes(v.recovery_route))fail("AFF-42201","请选择合法追回路径");
    if(t.source_type==="credit_review"&&!v.target_level)fail("AFF-42201","请选择目标信用等级");
    if(t.source_type==="attribution_review"&&!v.proposed_owner_ref)fail("AFF-42201","请选择授权归属目标");
    if(t.task_purpose==="cluster_member_correction"&&(!v.member_ids?.length||v.member_ids.length>=t.fields.members.length||!["remove_to_unassigned","split_new_cluster"].includes(v.correction)))fail("AFF-42201","集群纠错必须选择部分成员及明确纠错方式");
    if(t.task_purpose==="blacklist_add"&&(!v.target_ref||!t.fields.allowed_entry_types.includes(v.entry_type)||!v.effective_at||!Number.isFinite(Date.parse(v.effective_at))||v.effective_at<=clock||(!v.permanent&&(!v.expires_at||v.expires_at<=v.effective_at))))fail("AFF-42201","名单新增需要未来生效时间，并填写晚于生效时间的失效时间");
    if(t.task_purpose==="blacklist_remove"&&(t.fields.blacklist_source!=="affiliate"||t.fields.blacklist_status!=="active"))fail("AFF-42201","仅可移除本地有效名单");
    if(t.source_type==="circuit_breaker"&&d.conclusion==="adjust"&&!t.fields.allowed_adjustment_config_refs.includes(v.target_policy_ref))fail("AFF-42201","请选择已授权策略配置");
    if(t.source_type==="data_backfill"&&v.missing_event_ids?.some(id=>!t.fields.missing_event_ids.includes(id)))fail("AFF-42201","补数事件超出源范围");
  }
  function createExecution(t,a,status="pending") {const e={execution_id:`DEMO-TQ-EXEC-${++sequence}`,task_id:t.task_id,approval_id:a?.approval_id||null,status,version:"e1",items:[{item_id:"item-1",status:status==="failed"?"failed":"pending",result_ref:null,error_code:status==="failed"?"SOURCE_UNAVAILABLE":null,retryable:status==="failed",attempt:status==="failed"?1:0,last_attempt_at:clock}],settlement_checks:[],server_time:clock,data_quality:quality()};executions.push(e);t.execution_refs.push(e.execution_id);if(a)a.execution_id=e.execution_id;return e; }
  function settlementAuthoritySnapshot(t, refsOverride = null) {
    const sourceType = t.source_ref?.kind === "settlement_case" ||
      ["risk_investigation","signal_review","settlement_recheck"].includes(t.task_purpose) ||
      t.source_type === "settlement_overdue";
    if (!sourceType) return null;
    const refs = (refsOverride || t.case_refs || []).map(ref => ({
      customer_id:ref.customer_id,commission_case_id:ref.commission_case_id,
      settlement_case_id:ref.settlement_case_id,partner_id:ref.partner_id
    }));
    if (!refs.length) return {case_refs:[],sources:[],restriction_targets:[],blockers:[],impact:null,task_impact:copy(t.impact)};
    const sources = refs.map(ref => authoritativeSettlementSource(ref.settlement_case_id));
    if (sources.some(source => !source)) return {case_refs:refs,sources:sources.map(source => source ? {version:source.version} : null),restriction_targets:[],blockers:["CASE_SOURCE_MISSING"],impact:null,task_impact:copy(t.impact)};
    const links = refs.map(ref => (prototype.riskWorkbench?.caseLinks || []).find(link =>
      link.customer === ref.customer_id && link.commission === ref.commission_case_id && link.settlement === ref.settlement_case_id
    ));
    const restrictionTargets = sources.flatMap(source => source.release_targets || []).map(target => ({
      restriction_id:target.restriction_id,expected_restriction_version:target.expected_restriction_version
    }));
    const blockers = [...new Set(sources.flatMap(source => source.blockers || []))];
    const useFrozenAmount = !["risk_investigation"].includes(t.task_purpose);
    const impactAmount = links.some(link => !link) ? null : links.reduce((sum,link) => {
      const value = useFrozenAmount ? (link.frozen || 0) : (link.amount ?? link.frozen ?? 0);
      return sum + Number(value || 0);
    },0).toFixed(2);
    return {
      case_refs:refs,
      sources:sources.map(source => ({
        version:source.version || null,
        signal_status:source.signal_status || null,
        status:source.status || null,
        current_frozen_amount:source.current_frozen_amount ?? null,
        appeal_window_ends_at:source.appeal_window_ends_at || null
      })),
      restriction_targets:restrictionTargets,
      blockers,
      impact:impactAmount == null ? null : {currency:"USD",amount:impactAmount},
      task_impact:copy(t.impact)
    };
  }
  const sameAuthoritySnapshot = (left,right) => JSON.stringify(left || null) === JSON.stringify(right || null);
  function applyRiskDisposition(t,e,planItem) {
    if (!planItem) return;
    const action = planItem.action;
    const params = planItem.params || {};
    const refs = params.case_refs || [];
    const store = prototype.riskWorkbench || {};
    const links = refs.map(ref => (store.caseLinks || []).find(link =>
      link.customer === ref.customer_id && link.commission === ref.commission_case_id && link.settlement === ref.settlement_case_id
    )).filter(Boolean);
    const markCase = (link, patch) => Object.assign(link, patch, {last_risk_action:action,last_risk_action_at:clock,last_risk_task_id:t.task_id});
    if (["continue_freeze","extend_settlement"].includes(action)) {
      links.forEach(link => {
        if (action === "continue_freeze") {
          markCase(link,{status:"frozen",frozen:link.frozen === "0.00" ? link.amount : link.frozen,hold_policy_ref:params.duration_policy_ref || "DEMO-HOLD-POLICY1"});
        } else {
          const previousCount = Number(link.hold_extension?.count || 0);
          const dueBase = link.hold_extension?.due_at || t.fields?.current_due_at || clock;
          const due = new Date(Date.parse(dueBase) + 7 * 86400000).toISOString();
          markCase(link,{status:"frozen",frozen:link.frozen === "0.00" ? link.amount : link.frozen,hold_extension:{count:previousCount + 1,rule_ref:params.extension_rule_ref || "DEMO-EXTEND-RULE1",due_at:due,updated_at:clock}});
        }
      });
      t.funds_status="frozen";
      t.fields.settlement_status="frozen";
      e.domain_receipt={kind:"settlement_hold",status:"succeeded",case_refs:copy(refs),action,applied_at:clock};
    }
    if (action === "refer_finance") {
      const financeTask = make(2000 + ++sequence,"commission_exception","commission_recalculate","open","finance");
      financeTask.task_id=`DEMO-FINANCE-TASK-${sequence}`;
      financeTask.title=`财务关联处理 · ${t.task_id}`;
      financeTask.source_ref={kind:"risk_task",id:t.task_id};
      financeTask.case_refs=copy(refs);
      financeTask.customer_id=t.customer_id;
      financeTask.partner_id=t.partner_id;
      financeTask.object_id=t.object_id;
      financeTask.object_type=t.object_type;
      financeTask.impact=copy(t.impact);
      financeTask.source_scope=scopeFor(financeTask);
      financeTask.related_task_refs=[{task_id:t.task_id,relation:"risk_refer_finance"}];
      financeTask.reason=`风险任务 ${t.task_id} 转财务处理：${params.finance_action || "待财务确认"}`;
      tasks.push(financeTask);
      store.tasks ||= [];
      store.tasks.push({
        id:financeTask.task_id,
        source_ref:{kind:"risk_task",id:t.task_id},
        purpose:"commission_recalculate",
        purposeLabel:"佣金异常复核",
        source:t.task_id,
        status:"open",
        owner:"未认领",
        sla:financeTask.sla?.due_at || "未配置",
        approval:"-",
        execution:"-",
        cases:refs.map(ref=>`${ref.customer_id} / ${ref.commission_case_id} / ${ref.settlement_case_id}`),
        reason:financeTask.reason
      });
      t.related_task_refs.push({task_id:financeTask.task_id,relation:"finance_follow_up"});
      e.related_task_refs=[{task_id:financeTask.task_id,relation:"finance_follow_up"}];
      e.domain_receipt={kind:"finance_task",status:"succeeded",finance_task_id:financeTask.task_id,finance_action:params.finance_action || null,case_refs:copy(refs),funds_changed:false,created_at:clock};
    }
    if (action === "credit_propagation") {
      const partner = (store.objects || []).find(item => item.id === (params.partner_id || t.partner_id));
      if (partner) {
        const before = partner.credit || t.fields.current_level || "C2";
        const mode = params.mode || "credit_deduct";
        const scoreBefore = Number(partner.credit_score ?? 700);
        const scoreAfter = mode === "target_level" || mode === "credit_deduct_and_target_level"
          ? ({C0:500,C1:600,C2:700,C3:800,C4:900}[params.target_level] ?? scoreBefore)
          : Math.max(0,scoreBefore - 50);
        partner.credit = (mode === "target_level" || mode === "credit_deduct_and_target_level") && params.target_level ? params.target_level : before;
        partner.credit_score = scoreAfter;
        partner.credit_snapshot={level:partner.credit,score:scoreAfter,policy_ref:params.credit_rule_ref || "DEMO-CREDIT-POLICY1",effective_at:clock,source_task_id:t.task_id};
        (partner.credit_history ||= []).push({before_level:before,after_level:partner.credit,before_score:scoreBefore,after_score:scoreAfter,mode,policy_ref:params.credit_rule_ref || "DEMO-CREDIT-POLICY1",effective_at:clock,task_id:t.task_id});
        e.domain_receipt={kind:"credit_propagation",status:"succeeded",partner_id:partner.id,before_level:before,after_level:partner.credit,before_score:scoreBefore,after_score:scoreAfter,policy_ref:params.credit_rule_ref || "DEMO-CREDIT-POLICY1",effective_at:clock};
      }
    }
    if (action === "cluster_member_correction") {
      const clusterId = t.object_id || t.source_ref?.id;
      const cluster = (store.clusters || []).find(item => item.id === clusterId);
      const memberIds = params.member_ids || [];
      if (cluster && memberIds.length) {
        const beforeVersion = cluster.version || "v1";
        const removedRows = (cluster.memberRows || []).filter(row => memberIds.includes(row[0]));
        cluster.memberRows = (cluster.memberRows || []).filter(row => !memberIds.includes(row[0]));
        cluster.members = cluster.memberRows.length;
        cluster.version = `v${Number(String(beforeVersion).replace(/^v/,"")) + 1}`;
        const correction = params.correction || "remove_to_unassigned";
        let newCluster = null;
        if (correction === "split_new_cluster") {
          const newId = `DEMO-G${String((store.clusters || []).length + 1).padStart(2,"0")}`;
          newCluster = {
            id:newId,members:removedRows.length,partners:[...new Set(removedRows.map(row=>row[1]))].length,
            features:[...new Set(removedRows.map(row=>row[3]))],independent:removedRows.length,exception:"-",
            status:"suspected",control:"none",riskBand:null,affectedCases:0,affectedAmount:"0.00",
            updated:clock,version:"v1",memberRows:copy(removedRows),relationship_history:[],
            source_task_id:t.task_id,evidenceRefs:[],reason:"从原集群拆分形成，等待独立风险评估"
          };
          store.clusters.push(newCluster);
        }
        (cluster.relationship_history ||= []).push({action:"member_correction",removed_members:copy(memberIds),correction,before_version:beforeVersion,after_version:cluster.version,new_cluster_id:newCluster?.id || null,source_task_id:t.task_id,at:clock});
        e.domain_receipt={kind:"cluster_member_correction",status:"succeeded",cluster_id:clusterId,removed_members:copy(memberIds),correction,before_version:beforeVersion,after_version:cluster.version,new_cluster_id:newCluster?.id || null,relationship_history_ref:`${clusterId}:${cluster.relationship_history.length}`};
      }
    }
    if (action === "blacklist_add") {
      const entryId=`DEMO-BL-${String((store.blacklist || []).length + 1).padStart(2,"0")}`;
      const entry={id:entryId,type:params.entry_type === "device" ? "设备" : params.entry_type === "customer" ? "客户" : params.entry_type || "对象",masked:params.target_ref || "待脱敏对象",scope:params.scope === "local" ? `主体：${t.object_id || t.customer_id || "授权对象"}` : String(params.scope || "主体范围"),source:"affiliate",reason:`风险任务 ${t.task_id} 执行新增名单`,status:"active",effective:params.effective_at || clock,expires:params.permanent ? "-" : (params.expires_at || "-"),task:t.task_id};
      store.blacklist ||= [];
      store.blacklist.push(entry);
      e.domain_receipt={kind:"blacklist",status:"succeeded",operation:"add",entry_id:entry.id,source:"affiliate",effective_at:entry.effective,expires_at:entry.expires};
    }
    if (action === "blacklist_remove") {
      const entryId=t.fields.entry_id || t.source_ref?.id;
      const entry=(store.blacklist || []).find(item => item.id === entryId);
      if (entry) {
        entry.status="removed";
        entry.removed_at=clock;
        entry.removed_by_task=t.task_id;
        e.domain_receipt={kind:"blacklist",status:"succeeded",operation:"remove",entry_id:entry.id,source:entry.source,status:entry.status,removed_at:clock};
      }
    }
    if (["confirm_event","clear_event","signal_confirm","signal_reject","release_and_recheck"].includes(action)) {
      e.domain_receipt ||= {kind:"risk_disposition",status:"succeeded",action,case_refs:copy(refs),applied_at:clock};
    }
    record(t,"domain_apply",roleFor(t),{execution_id:e.execution_id,domain_action:action,domain_receipt:e.domain_receipt || null});
  }
  function write(action,id,body={},ctx={}) {
    const role=ctx.role||"risk", request=body.request_id, key=body.idempotency_key;
    if(!request||!key)fail("AFF-40001","写入需要request_id与idempotency_key");
    if(body.actor_id||body.approver_id)fail("AFF-40301","浏览器不得指定操作身份");
    if(ctx.scenario==="batch_partial"&&id==="DEMO-TASK-024"&&["claim","assign"].includes(action))fail("AFF-40901","演示并发冲突：此项刚被其他处理人更新",{reason:"FIXTURE_CONCURRENT_CHANGE"});
    const digest=JSON.stringify({action,id,body,role});
    if(keys[key]){if(keys[key].digest!==digest)fail("AFF-40902","同一幂等键不能用于不同请求");return copy(keys[key].result);}
    let t=null,result={};
    const isApproval=["approve","reject","return"].includes(action),globalAction=["export","download_export"].includes(action);
    if(!isApproval&&!globalAction){t=get(id,role);if(body.expected_version!==t.version)fail("AFF-40901","任务版本已变化，请重新加载");}
    if(isApproval) {
      const a=approvals.find(x=>x.approval_id===id);if(!a)fail("AFF-40401","审批不存在");
      if(!["approval_queue","risk-workbench"].includes(ctx.source_entry))fail("AFF-40301","审批只能从统一审批队列或受保护风险工作台上下文执行");
      if(a.status!=="pending_approval"||a.version!==body.expected_version)fail("AFF-40901","审批版本或状态已变化");
      const n=a.nodes[a.current_node_index];if(a.applicant.user_id===actor(role).user_id||n.role_code!==role)fail("AFF-40301","敏感审批禁止自审或越级审批");
      if(body.node_id!==n.node_id||body.expected_node_version!==n.version)fail("AFF-40901","审批节点已变化");
      if([...(body.reason||"").trim()].length<10)fail("AFF-42201","审批说明至少10字符");
      t=a.task_id?tasks.find(item=>item.task_id===a.task_id):null;
      if(action==="approve"&&t)validate(t,a.draft,true);
      n.status=action==="approve"?"approved":action==="reject"?"rejected":"returned";n.reviewer=actor(role);n.reason=body.reason.trim();n.decided_at=clock;n.version="n2";a.version=`a${Number(a.version.slice(1))+1}`;
      if(action!=="approve"){a.status=n.status;a.nodes.slice(a.current_node_index+1).forEach(node=>{node.status="cancelled";node.cancelled_at=clock;});if(t){t.result=action==="reject"?"rejected":null;bump(t,action==="reject"?"done":"returned");}if(a.export_id){const ex=exportsList.find(item=>item.export_id===a.export_id);ex.status=n.status;}}
      else if(a.current_node_index<a.nodes.length-1){a.current_node_index++;a.nodes[a.current_node_index].status="pending";}
      else {a.status="approved";if(a.export_id){const ex=exportsList.find(e=>e.export_id===a.export_id);ex.status="ready";}else if(a.draft.conclusion==="observe"){t.next_review_at=a.draft.next_review_at;t.result=null;bump(t,"processing");}else{createExecution(t,a);const item=a.draft.action_plan?.[0];const futureBlacklist=item?.action==="blacklist_add"&&item.params?.effective_at&&Date.parse(item.params.effective_at)>Date.parse(clock);bump(t,futureBlacklist?"processing":"pending_execution");}}
      const approvalRecipients = a.status === "pending_approval"
        ? [a.nodes[a.current_node_index]?.role_code]
        : [a.applicant?.role_code || roleFor(t)];
      emitRiskNotification(t,"risk.approval.updated",{
        eventKey:`risk.approval.updated:${id}:${n.node_id}:${n.status}`,
        recipients:approvalRecipients,
        title:`风险任务 ${t?.task_id || id} 审批状态已更新`,
        detail:a.status === "approved" ? "审批链已完成，任务进入待执行状态。" : a.status === "rejected" ? "审批申请已驳回，任务已记录处理结果。" : a.status === "returned" ? "审批申请已退回补充材料。" : "当前审批节点已通过，已进入下一节点。"
      });
      if (t && a.status === "approved" && a.execution_id) {
        emitRiskNotification(t,"risk.execution.pending",{
          eventKey:`risk.execution.pending:${a.execution_id}`,
          recipients:[roleFor(t)],
          title:`风险任务 ${t.task_id} 等待领域执行`,
          detail:"审批已完成，领域执行协调器需要回传执行结果。"
        });
      }
      record(t,`approval_${action}`,role,{approval_id:id,node_id:n.node_id,reason:n.reason,decided_at:clock});result.approval=copy(a);
    } else if(action==="export") {
      if(!options(role).permissions.includes("tasks.export"))fail("AFF-40301","当前角色无导出申请权限");
      const purpose=(body.purpose||body.reason||"").trim();
      if([...purpose].length<10||[...purpose].length>1000)fail("AFF-42201","导出用途必须为10至1000字符");
      const legacyTaskExport = body.source_page !== "risk-workbench";
      const query=legacyTaskExport ? (body.applied_filter||body.query||body.filters||{}) : {};
      const exid=`DEMO-TQ-EXPORT-${++sequence}`;
      const listing=list({...query,...(body.scope?{scope:body.scope}:{}),...(body.snapshot_id?{snapshot_id:body.snapshot_id}:{}),page:1,page_size:50},{role}), snap=snapshots[listing.meta.snapshot_id];
      const allowedColumns=["task_id","title","source_type","workflow_state","owner","impact_amount","task","type","source","priority","status","sla","team","risk","amount","updated","created","system","reason","approval","credit","trace"];
      const columns=legacyTaskExport ? (body.columns||["task_id","title","source_type","workflow_state","owner","impact_amount"]) : ["task_id","status","risk"];
      if(!Array.isArray(columns)||!columns.length||new Set(columns).size!==columns.length||columns.some(c=>!allowedColumns.includes(c)))fail("AFF-42201","导出列超出任务队列安全列白名单");
      const sort=body.sort||{field:query.sort_by||"default",direction:query.direction||"asc"};
      if(sort.field!==(query.sort_by||"default")||sort.direction!==(query.direction||"asc"))fail("AFF-40901","导出排序与已应用快照不一致");
      const ex={export_id:exid,status:"pending_approval",applicant:actor(role),created_at:clock,row_count:snap.rows.length,purpose,scope:listing.summary.scope,applied_filter:copy(query),sort:copy(sort),snapshot_id:snap.id,query:copy(query),rows:copy(snap.rows),columns:copy(columns),filename:`tasks_20261108_200000_${exid}.csv`};
      const a=approvalFor(null,role,{},exid);ex.approval_id=a.approval_id;
      a.export_scope={export_id:exid,purpose,scope:ex.scope,applied_filter:copy(query),sort:copy(sort),snapshot_id:snap.id,columns:copy(columns),row_count:ex.row_count};
      Object.assign(a,copy(a.export_scope));
      exportsList.push(ex);record(null,"export_request",role,{export_id:exid,purpose,scope:ex.scope,snapshot_id:snap.id});result.export={...copy(ex),rows:undefined};result.approval=copy(a);
    } else if(action==="download_export") {
      const ex=exportsList.find(x=>x.export_id===id);if(!ex||ex.applicant.user_id!==actor(role).user_id)fail("AFF-40301","无当前导出下载权限");if(ex.status!=="ready")fail("AFF-42201","导出尚未批准");
      const cell=v=>`"${String(v??"").replace(/^[=+@\t\r-]/,"'$&").replace(/"/g,'""')}"`;
      const names={task_id:"任务编号",title:"标题",source_type:"类型",workflow_state:"工作流状态",owner:"责任人",impact_amount:"USD影响金额",task:"任务",type:"类型",source:"来源对象",priority:"优先级",status:"状态",sla:"处理时限",team:"责任团队",risk:"风险档",amount:"影响金额",updated:"更新时间",created:"创建时间",system:"来源系统",reason:"来源原因",approval:"审批状态",credit:"信用等级",trace:"TraceId"};
      const value=(t,c)=>({task_id:t.task_id,title:t.title,source_type:labels[t.source_type],workflow_state:stateLabels[t.workflow_state],owner:t.owner?.display_name||"",impact_amount:t.impact?.amount||"",task:`${t.task_id} ${t.title}`,type:labels[t.source_type],source:t.source_ref.id,priority:t.priority,status:stateLabels[t.workflow_state],sla:t.sla?.due_at||"",team:t.team.name,risk:t.risk_level||"",amount:t.impact?.amount||"",updated:t.updated_at,created:t.created_at,system:t.external_system||"",reason:t.reason_codes.join(" / "),approval:approvals.find(a=>a.task_id===t.task_id)?.status||"",credit:t.credit_level||"",trace:`DEMO-TRACE-${t.task_id}`})[c];
      result.csv="\uFEFF"+[ex.columns.map(c=>names[c]),...ex.rows.map(t=>ex.columns.map(c=>value(t,c)))].map(line=>line.map(cell).join(",")).join("\r\n");result.filename=ex.filename;record(null,"export_download",role,{export_id:id});
    } else if(action==="access_evidence") {
      if(body.evidence_id!==`${id}-EVIDENCE1`)fail("AFF-40301","证据不属于当前任务");
      result.evidence={evidence_id:body.evidence_id,name:"合成来源核验记录.txt",content_type:"text/plain",content:"仅用于管理端交互验收的合成证据；不包含生产资料。",expires_at:at(5 * 60 * 1000)};record(t,"evidence_access",role,{purpose:body.purpose});
    } else if(action==="coordinator_complete") {
      if(ctx.actor_type!=="domain_coordinator"||!body.domain_receipt_ref)fail("AFF-42201","仅领域执行协调器可凭有效回执完成任务");
      const e=executions.find(x=>x.task_id===id&&x.execution_id===body.execution_id);
      const pendingPlan=t.draft?.action_plan?.[0];
      const futureBlacklist=pendingPlan?.action==="blacklist_add" && pendingPlan.params?.effective_at && Date.parse(pendingPlan.params.effective_at)>Date.parse(clock);
      if(!e||(!["pending_execution","executing"].includes(t.workflow_state) && !(futureBlacklist && t.workflow_state==="processing"))||body.approval_id!==e.approval_id)fail("AFF-42201","领域回执与批准执行计划不匹配");
      if(pendingPlan?.action==="blacklist_add" && pendingPlan.params?.effective_at && Date.parse(pendingPlan.params.effective_at)>Date.parse(clock)) fail("AFF-42201","名单尚未到生效时间，暂不能接收完成回执");
      if(body.failed_item_ids?.length){e.status="partial";bump(t,"execution_failed");}
      else {
        e.status="succeeded";e.items.forEach(x=>{x.status="succeeded";x.retryable=false;});
        t.result="resolved";
        const signalPlan=t.draft?.action_plan?.find(item=>["signal_reject","signal_confirm"].includes(item.action));
        if (signalPlan) {
          const nextSignal=signalPlan.action==="signal_reject" ? "rejected" : "confirmed";
          const riskStore=prototype.riskWorkbench;
          const event=(riskStore?.events || []).find(item => item.id===t.source_ref?.id || item.id===t.fields?.signal_id || (t.case_refs || []).some(ref => (item.caseRefs || []).some(caseRef => caseRef.settlement===ref.settlement_case_id)));
          if (event) {
            event.signal=nextSignal;
            event.updated=clock;
            const rejectedEffectiveAt = nextSignal === "rejected" ? clock : null;
            const appealWindowEndsAt = nextSignal === "rejected" ? new Date(Date.parse(clock) + 7 * 86400000).toISOString() : null;
            signalFacts[event.id] = {
              signal_status:nextSignal,
              rejected_effective_at:rejectedEffectiveAt,
              appeal_window_ends_at:appealWindowEndsAt,
              appeal_in_progress:false
            };
            event.rejected_effective_at=rejectedEffectiveAt;
            event.appeal_window_ends_at=appealWindowEndsAt;
          }
          t.fields.signal_status=nextSignal;
          if (nextSignal === "rejected") {
            const fact = event ? signalFacts[event.id] : null;
            t.fields.rejected_effective_at=fact?.rejected_effective_at || clock;
            t.fields.appeal_eligibility={visible:true,reason_code:"window_open",used:0,max:1,window_ends_at:fact?.appeal_window_ends_at || null,in_progress:false};
          }
          t.funds_status="frozen";
        }
        const releasePlan=t.draft?.action_plan?.find(item=>item.action==="release_and_recheck");
        if (releasePlan) {
          const refs=t.case_refs || [];
          const riskStore=prototype.riskWorkbench;
          e.settlement_checks = [];
          let hasBlockingChecks = false;
          refs.forEach(ref => {
            const link=(riskStore?.caseLinks || []).find(item => item.customer===ref.customer_id && item.commission===ref.commission_case_id && item.settlement===ref.settlement_case_id);
            const trusted = authoritativeSettlementSource(ref.settlement_case_id);
            if (!link) {
              e.settlement_checks.push({
                case_ref:copy(ref),
                result:"failed",
                error_code:"CASE_NOT_FOUND",
                checked_at:clock
              });
              return;
            }
            const blocked = Boolean(trusted?.blockers?.length);
            hasBlockingChecks = hasBlockingChecks || blocked;
            const result = blocked ? "blocked" : "passed";
            const targetStatus = blocked ? "holding" : "payable";
            e.settlement_checks.push({
              case_ref:copy(ref),
              signal_status:trusted?.signal_status || t.fields.signal_status || null,
              before:{status:link.status,frozen:link.frozen,restriction:link.restriction},
              after:{status:targetStatus,frozen:"0.00",restriction:"-"},
              result,
              blocking_reasons:copy(trusted?.blockers || []),
              checked_at:clock,
              restriction_targets:copy(releasePlan.params?.release_targets || [])
            });
            link.status=targetStatus;link.frozen="0.00";link.restriction="-";link.recheckReceipt={execution_id:e.execution_id,checked_at:clock,result,blocking_reasons:copy(trusted?.blockers || []),restriction_targets:copy(releasePlan.params?.release_targets || [])};
          });
          t.funds_status=hasBlockingChecks ? "holding" : "payable";
          t.fields.settlement_status=t.funds_status;
          const event=(riskStore?.events || []).find(item => item.id===t.source_ref?.id || (refs || []).some(ref => (item.caseRefs || []).some(caseRef => caseRef.settlement===ref.settlement_case_id)));
          if (event && event.signal && event.signal!=="-") {event.signal="closed";event.updated=clock;}
        }
        applyRiskDisposition(t,e,t.draft?.action_plan?.[0]);
        bump(t,"done");
      }
      emitRiskNotification(t,"risk.execution.result",{
        eventKey:`risk.execution.result:${e.execution_id}:${e.status}`,
        recipients:[t.owner?.role_code || roleFor(t),roleFor(t)],
        title:`风险任务 ${t.task_id} 执行结果已回传`,
        detail:e.status === "succeeded" ? "领域执行已完成，风险任务状态已更新。" : "领域执行存在失败项，请进入任务详情查看投递与执行结果。",
        severity:e.status === "succeeded" ? "info" : "danger"
      });
      record(t,action,role,{domain_receipt_ref:body.domain_receipt_ref,settlement_recheck:!!t.draft?.action_plan?.some(item=>item.action==="release_and_recheck")});
    } else if(action==="receive_material") {
      if(ctx.actor_type!=="source_service"||t.workflow_state!=="waiting_material"||!body.source_receipt_ref)fail("AFF-40301","补件收讫仅由来源服务凭回执写入");bump(t,"processing");record(t,action,role);
    } else {
      const ability=availability(t,role).find(x=>x.action===action);if(!ability?.enabled)fail("AFF-40301",ability?.disabled_reason||"当前入口不允许此操作");
      if(action==="claim"){t.owner=actor(role);bump(t,"processing");}
      if(action==="assign"||action==="return_pool"){
        if([...(body.reason||"").trim()].length<10)fail("AFF-42201","转办说明至少10字符");
        if(action==="return_pool"||body.mode==="return_pool"){if(!["open","processing"].includes(t.workflow_state)||!own(t,role))fail("AFF-40301","仅当前责任人在允许状态可退回责任池");t.owner=null;bump(t,"open");}
        else {if(t.workflow_state!=="open"&&!body.target_user_id)fail("AFF-42201","处理中任务转办必须选择具体处理人");const choices=assignees(id,{role,team_id:body.target_team_id});const user=choices.users.find(x=>x.user_id===body.target_user_id);if(!user&&body.target_user_id)fail("AFF-40301","目标人员不在授权责任池");if(body.target_team_id&&body.target_team_id!==t.team.id)fail("AFF-40301","目标团队不在授权责任池");t.owner=user?{user_id:user.user_id,display_name:user.display_name,role_code:user.role_code}:null;bump(t,t.owner?"processing":"open");}
      }
      if(action==="save_draft"){
        if(body.expected_draft_version!==t.draft_version)fail("AFF-40901","草稿版本已变化");
        const generated=plan(t,body.form_values,body), old=t.draft||{};
        if(body.action_plan&&!body.form_values&&JSON.stringify(body.action_plan)!==JSON.stringify(generated.action_plan))fail("AFF-42201","处理方案必须由当前类型表单生成");
        const d={...old,...generated,reason_code:body.reason_code??old.reason_code??null,reason:body.reason??old.reason??"",evidence_ids:body.evidence_ids??old.evidence_ids??[],next_review_at:body.next_review_at??body.form_values?.next_review_at??old.next_review_at??null,checklist:body.checklist??old.checklist??[],internal_note:body.internal_note??old.internal_note??null,form_values:copy(body.form_values||old.form_values||{}),updated_at:clock,updated_by:actor(role)};
        validate(t,d,false);t.draft_version=`d${Number(t.draft_version.slice(1))+1}`;d.draft_version=t.draft_version;t.draft=d;bump(t);result.draft=copy(d);
      }
      if(action==="preview"){
        if(!t.draft||body.draft_version!==t.draft_version)fail("AFF-40901","请先保存当前草稿");validate(t,t.draft,true);
        const previewNow = prototype.riskWorkbench?.serverNow || clock;
        const previewExpires = new Date(Date.parse(previewNow) + 300000).toISOString();
        const plannedRefs = t.draft.action_plan?.[0]?.params?.case_refs || t.case_refs;
        const authority=settlementAuthoritySnapshot(t, plannedRefs);
        const plannedScope = {...copy(t.source_scope),case_refs:copy(plannedRefs)};
        const plannedAmount = authority?.impact || copy(t.impact);
        const p={preview_id:`DEMO-PREVIEW-${++sequence}`,preview_hash:`DEMO-HASH-${sequence}-${t.version}`,task_id:id,draft_version:t.draft_version,source_versions:copy(t.source_versions),config_versions:copy(t.config_versions),case_refs:copy(plannedRefs),authority_snapshot:copy(authority),before_after_items:t.draft.action_plan.map(i=>({item_id:i.item_id,object_ref:copy(t.source_ref),before:{workflow_state:t.workflow_state,funds_status:t.funds_status},after:{requested_action:i.action,requires_approval:true},blocking_reasons:authority?.blockers || []})),deduplicated_amount:copy(plannedAmount),amount:copy(plannedAmount),scope:plannedScope,required_approver_roles:approvalRoles(role),blocking_errors:authority?.blockers || [],generated_at:previewNow,expires_at:previewExpires,task_version:t.version,real_expires:Date.now()+300000};previews[p.preview_id]=p;result.preview=copy(p);
      }
      if(action==="submit_review"){
        const p=previews[body.preview_id];if(!p||p.task_id!==id||p.preview_hash!==body.preview_hash||p.draft_version!==t.draft_version||body.draft_version!==t.draft_version||p.task_version!==t.version||p.real_expires<Date.now())fail("AFF-40901","影响预览已失效");
        const currentAuthority=settlementAuthoritySnapshot(t, t.draft?.action_plan?.[0]?.params?.case_refs || t.case_refs);
        if(!sameAuthoritySnapshot(p.authority_snapshot,currentAuthority))fail("AFF-40901","影响预览已失效：结算案件、限制版本、阻断原因或影响金额已变化");
        if(body.self_review!==false||body.impact_confirmation!==true)fail("AFF-42201","敏感申请必须确认影响且禁止自审");validate(t,t.draft,true);const a=approvalFor(t,role,t.draft);bump(t,"pending_approval");emitRiskNotification(t,"risk.task.submitted",{eventKey:`risk.task.submitted:${a.approval_id}`,recipients:a.nodes.map(node=>node.role_code),title:`风险任务 ${t.task_id} 已提交审批`,detail:"案件范围、金额和影响预览已冻结，等待审批节点处理。"});result.approval=copy(a);Object.assign(result,{task_id:id,status:"pending_approval",task_status:"processing",approval_status:"pending_approval",workflow_state:"pending_approval",approval_id:a.approval_id});
      }
      if(action==="request_material"){
        if(!body.material_keys?.length||!body.recipient?.ref||!body.due_at||!Number.isFinite(Date.parse(body.due_at))||body.due_at<=clock||[...(body.public_message||"").trim()].length<10||[...body.public_message].length>2000)fail("AFF-42201","补件需材料项、接收人、未来期限和10至2000字符说明");t.material_request={material_request_id:`DEMO-MATERIAL-${++sequence}`,...copy(body)};bump(t,"waiting_material");result.material_request_id=t.material_request.material_request_id;
      }
      if(action==="close"){
        if(!["duplicate","source_withdrawn","object_invalidated"].includes(body.reason_code)||[...(body.reason||"").trim()].length<10)fail("AFF-42201","关闭原因或说明无效");
        if(body.reason_code==="duplicate"){const other=tasks.find(x=>x.task_id===body.replaced_by_task_id);if(!other||other.task_id===id||other.source_type!==t.source_type||terminal(other))fail("AFF-42201","重复关闭必须指定同类型活动替代任务");}else if(!body.source_receipt_ref)fail("AFF-42201","来源撤销或失效必须提供来源回执");
        t.result=({duplicate:"duplicate",source_withdrawn:"withdrawn",object_invalidated:"invalidated"})[body.reason_code];t.replaced_by_task_id=body.replaced_by_task_id||null;bump(t,"closed");
      }
      if(action==="status_check"){
        const f=t.fields;if(body.integration_version!==f.integration_version)fail("AFF-40901","集成作业版本已变化");
        f.status_check={status_check_id:`DEMO-CHECK-${++sequence}`,integration_task_id:f.integration_task_id,integration_version:f.integration_version,status:f.last_status,retryable:f.retryable,checked_at:clock,expires_at:at(5 * 60 * 1000),real_expires:Date.now()+300000};result.status_check=copy(f.status_check);result.integration_check=copy(f.status_check);bump(t);
      }
      if(action==="retry_integration"){
        const f=t.fields,c=f.status_check;if(!c||c.status_check_id!==body.status_check_id||body.integration_version!==f.integration_version||c.integration_version!==f.integration_version||c.real_expires<Date.now()||!["failed","not_found"].includes(c.status)||!c.retryable||f.attempt>=f.max_attempts||!f.can_retry_without_new_approval)fail("AFF-42201","当前查询未确认可安全重试，或需要新的批准");
        f.attempt++;f.integration_version=`i${Number(f.integration_version.slice(1))+1}`;f.last_status="unknown";f.retryable=false;f.status_check=null;bump(t,"executing");
      }
      if(action==="retry_execution"){
        const e=executions.find(x=>x.task_id===id&&x.execution_id===body.execution_id);if(!e||e.version!==body.execution_version||!body.failed_item_ids?.length||body.failed_item_ids.some(i=>!e.items.some(x=>x.item_id===i&&x.status==="failed"&&x.retryable)))fail("AFF-42201","只允许重试原计划中可重试的失败项");e.items.filter(i=>body.failed_item_ids.includes(i.item_id)).forEach(i=>{i.status="pending";i.attempt++;});e.status="pending";e.version=`e${Number(e.version.slice(1))+1}`;bump(t,"pending_execution");
      }
      record(t,action,role);
    }
    if(t){t.request_id_history.push(request);t.history.total=t.history.items.length;result.task=row(t,role);}
    const receipt={request_id:request,status:"succeeded",result_ref:{kind:isApproval?"approval":globalAction?"export":"task",id:result.approval?.approval_id||result.export?.export_id||id},error:null,trace_id:`DEMO-TRACE-${++sequence}`};
    result.receipt=receipt;result.request_receipt=copy(receipt);receipts[request]={role,receipt:copy(receipt),result:copy(result)};keys[key]={digest,result:copy(result)};
    if(["write_timeout","timeout"].includes(ctx.scenario))fail("AFF-50401","响应超时，结果未知；请查询原request_id",{result_unknown:true,request_id:request});
    persistQueueState();
    return copy(result);
  }
  function receipt(request,ctx={}) {const r=receipts[request];if(!r)fail("AFF-40401","尚未找到请求回执");if(r.role!==(ctx.role||"risk"))fail("AFF-40301","不能查看其他操作者请求");return {...copy(r.receipt),result:copy(r.result)};}
  function approvalsFor(ctx={}) {const role=context(ctx).role||"risk";return copy(approvals.filter(a=>a.applicant.user_id===actor(role).user_id||a.nodes.some(n=>n.role_code===role)||["audit","system_admin"].includes(role)));}
  function exportsFor(ctx={}) {const role=context(ctx).role||"risk";return copy(exportsList.filter(e=>e.applicant.user_id===actor(role).user_id).map(({rows,...metadata})=>metadata));}
  function toLegacyRows(role="risk") {return tasks.filter(t=>visible(t,role)).map(t=>({...row(t,role),id:t.task_id,name:t.title,type:labels[t.source_type],status:t.workflow_state,ownerRole:t.owner?.role_code||null,owner:t.owner?.display_name||"未认领",amount:t.impact?Number(t.impact.amount):0,updated:t.updated_at.slice(0,19).replace("T"," "),overdue:t.sla_state==="overdue",sla:t.sla?.due_at||"未配置",partnerId:t.partner_id,partner:"合成合作方",customerId:t.customer_id,clientCount:1,commissionCount:t.case_refs.length,risk:t.risk_level==="R3"?"high":t.risk_level==="R2"?"medium":"low",source:t.source_ref.id,traceId:`DEMO-TRACE-${t.task_id}`,timeline:copy(t.history.items)}));}
  function reset() {
    if (Array.isArray(prototype.auditRecords)) for (let i=prototype.auditRecords.length-1;i>=0;i--) if (String(prototype.auditRecords[i].id).startsWith("DEMO-TQ-AUDIT-")) prototype.auditRecords.splice(i,1);
    if (Array.isArray(prototype.notifications)) for (let i=prototype.notifications.length-1;i>=0;i--) if (String(prototype.notifications[i].id).startsWith("risk-notice-")) prototype.notifications.splice(i,1);
    if (Array.isArray(prototype.notificationOutbox)) for (let i=prototype.notificationOutbox.length-1;i>=0;i--) if (String(prototype.notificationOutbox[i].id).startsWith("risk-outbox-")) prototype.notificationOutbox.splice(i,1);
    try { sessionStorage.removeItem(queueSessionStorageKey); } catch {}
    seed();
    return {ok:true};
  }
  function toRiskRows(role="risk") {
    const purposeLabels={signal_review:"信号复核",settlement_recheck:"结算重检",risk_investigation:"风险调查",cluster_determination:"集群认定",cluster_member_correction:"集群成员纠错",blacklist_add:"新增名单",blacklist_remove:"移除名单"};
    return tasks.filter(t=>visible(t,role)&&roleFor(t)==="risk").map(t=>{
      const a=approvals.filter(item=>item.task_id===t.task_id).at(-1),e=executions.filter(item=>item.task_id===t.task_id).at(-1);
      return {id:t.task_id,task_id:t.task_id,purpose:t.task_purpose,purposeLabel:purposeLabels[t.task_purpose]||t.task_purpose,source:t.source_ref.id,status:t.status,task_status:t.status,workflow_state:t.workflow_state,owner:t.owner?.display_name||"未认领",sla:t.sla?.due_at||"未配置",approval:a?`${a.approval_id} · ${a.status}`:"-",execution:e?`${e.execution_id} · ${e.status}`:"未创建",cases:t.case_refs.map(ref=>`${ref.customer_id} / ${ref.commission_case_id} / ${ref.settlement_case_id}`),reason:"统一任务队列事实源",version:t.version};
    });
  }
  function ensureRiskTask(body={},ctx={}) {
    const role=ctx.role||"risk";
    if(!["risk","risk_supervisor"].includes(role))fail("AFF-40301","仅风控角色可从可信来源发起任务");
    if(!body.request_id||!body.idempotency_key||body.task_id||body.source_type)fail("AFF-40001","需要请求标识，不接收自定义任务编号或类型");
    const digest=JSON.stringify({body,role,action:"ensure_risk_task"});
    const prior=keys[body.idempotency_key];if(prior){if(prior.digest!==digest)fail("AFF-40902","幂等键已用于不同请求");return copy(prior.result);}
    const source=body.source_ref||{},store=prototype.riskWorkbench||{},purpose=body.task_purpose;
    if(source.kind==="settlement_case") {
      if(purpose!=="settlement_recheck")fail("AFF-42201","结算案件来源仅可发起独立解除重检");
      const trusted=authoritativeSettlementSource(source.id);
      if(!trusted)fail("AFF-42201","结算来源不在可信案件目录");
      const refEqual=ref=>ref&&["customer_id","commission_case_id","settlement_case_id","partner_id"].every(key=>ref[key]===trusted.case_ref[key]);
      if(!refEqual(source.case_ref)||!refEqual(body.case_ref))fail("AFF-42201","来源案件三元组及完整范围不一致");
      if(body.expected_source_version!==trusted.version)fail("AFF-40901","结算案件来源版本已变化");
      const targets=value=>Array.isArray(value)?value.map(item=>`${item.restriction_id}:${item.expected_restriction_version}`).sort().join("|"):"";
      if(!body.release_targets?.length||targets(body.release_targets)!==targets(trusted.release_targets))fail("AFF-42201","解除目标或限制版本与可信来源不一致");
      if(trusted.status!=="frozen"||!["confirmed","rejected"].includes(trusted.signal_status)||trusted.appeal_in_progress||Date.parse(trusted.appeal_window_ends_at)>Date.parse(clock))fail("AFF-42201","信号、冻结或申诉门禁不允许解除重检");
      const origin=get(body.source_task_id,role);
      if(!["hold_extend","settlement_overdue"].includes(origin.source_type)||!origin.case_refs.some(refEqual))fail("AFF-42201","发起任务不是此案件的风险复核来源");
      if([...(body.reason||"").trim()].length<10)fail("AFF-42201","发起说明至少10字符");
      let t=tasks.find(item=>item.source_ref.kind==="settlement_case"&&item.source_ref.id===source.id&&item.task_purpose===purpose&&!terminal(item));
      const reused=!!t;
      if(!t){
        t=make(1000+ ++sequence,"settlement_overdue",purpose,"open");t.task_id=`DEMO-RECHECK-TASK-${sequence}`;
        Object.assign(t,{source_ref:{kind:"settlement_case",id:source.id,case_ref:copy(trusted.case_ref)},case_refs:copy([trusted.case_ref]),customer_id:trusted.case_ref.customer_id,partner_id:trusted.case_ref.partner_id,object_id:source.id,object_type:"settlement_case",source_versions:{source:trusted.version},related_task_refs:[{task_id:origin.task_id}],reason:body.reason});
        t.fields=riskTaskFieldsFor("settlement_recheck",{kind:"settlement_case",id:source.id},{signal:trusted.signal_status},[trusted.case_ref],trusted.case_ref.customer_id);
        Object.assign(t.fields,{case_ref:copy(trusted.case_ref),signal_status:trusted.signal_status,release_targets:copy(trusted.release_targets),appeal_eligibility:{visible:true,reason_code:"window_ended",used:0,max:1,window_ends_at:trusted.appeal_window_ends_at,in_progress:trusted.appeal_in_progress},blocking_reasons:copy(trusted.blockers || [])});
        t.source_scope=scopeFor(t);t.impact=null;t.funds_status="frozen";t.risk_level=null;t.credit_level=null;
        tasks.push(t);record(t,"source_create_recheck",role,{origin_task_id:origin.task_id});
      }
      const receipt={request_id:body.request_id,status:"succeeded",result_ref:{kind:"task",id:t.task_id},error:null,trace_id:`DEMO-TRACE-${++sequence}`};
      const result={task:row(t,role),reused,source_path:`#/tasks?task_id=${origin.task_id}`,task_path:`#/tasks?task_id=${t.task_id}`,receipt,request_receipt:copy(receipt)};
      receipts[body.request_id]={role,receipt:copy(receipt),result:copy(result)};keys[body.idempotency_key]={digest,result:copy(result)};return copy(result);
    }
    const catalogs={event:store.events,cluster:store.clusters,blacklist:store.blacklist,object:store.objects,settlement_case:store.caseLinks};
    const original=catalogs[source.kind]?.find(item=>source.kind==="settlement_case" ? item.settlement===source.id : item.id===source.id);if(!original)fail("AFF-42201","来源不在当前可信风险对象目录");
    const allowed=source.kind==="settlement_case"?["settlement_recheck"]:source.kind==="event"?(original.type==="settlement_overdue"?["signal_review"]:original.type==="cluster_detected"?["cluster_determination","risk_investigation"]:["risk_investigation"]):source.kind==="cluster"?["cluster_determination","cluster_member_correction"]:source.kind==="blacklist"?["blacklist_remove"]:["risk_investigation","blacklist_add"];
    if(!allowed.includes(purpose)||source.kind==="blacklist"&&original.source!=="affiliate")fail("AFF-42201","任务目的与来源不匹配或来源仅为只读引用");
    if([...(body.reason||"").trim()].length<10)fail("AFF-42201","发起说明至少10字符");
    let t=tasks.find(item=>item.source_ref.kind===source.kind&&item.source_ref.id===source.id&&item.task_purpose===purpose&&!terminal(item));
    const reused=!!t;
    if(!t) {
      t=make(1000+ ++sequence,purpose==="signal_review"||purpose==="settlement_recheck"?"settlement_overdue":"risk_review",purpose,"open");
      t.task_id=`DEMO-RISK-TASK-${sequence}`;t.source_ref={kind:source.kind,id:source.id};t.title=`${source.id} · ${purpose}`;
      const primary=original.primary||original.id;
      const riskTaskSeed=(store.tasks||[]).find(item=>item.source===source.id&&item.purpose===purpose);
      const sourceCase = source.kind==="settlement_case" ? (store.caseLinks||[]).find(ref=>ref.settlement===source.id) : null;
      const explicitCaseRefs = Array.isArray(original.caseRefs) ? original.caseRefs : [];
      const explicitCases = explicitCaseRefs.map(item => (store.caseLinks || []).find(ref => ref.customer===item.customer && ref.commission===item.commission && ref.settlement===item.settlement)).filter(Boolean);
      const related=(explicitCases.length ? explicitCases : sourceCase ? [sourceCase] : (store.caseLinks||[]).filter(ref=>{
        if(source.kind==="event" && original.type==="settlement_overdue") return ref.customer===primary && ref.status==="frozen";
        if(source.kind==="event") return ref.customer===primary || ref.partner===primary;
        if(source.kind==="cluster") return original.memberRows?.some(member=>member[0]===ref.customer) && ref.status==="frozen";
        if(source.kind==="partner" || source.kind==="object") return ref.partner===primary && ref.status==="frozen";
        return false;
      }));
      t.case_refs=(riskTaskSeed?.cases||[]).map(value=>{const [customer_id,commission_case_id,settlement_case_id]=String(value).split(" / ");const match=(store.caseLinks||[]).find(ref=>ref.customer===customer_id&&ref.commission===commission_case_id&&ref.settlement===settlement_case_id);return {customer_id,commission_case_id,settlement_case_id,partner_id:match?.partner||sourceCase?.partner||null,settlement_batch_id:null};});
      if(!t.case_refs.length)t.case_refs=related.map(ref=>({customer_id:ref.customer,commission_case_id:ref.commission,settlement_case_id:ref.settlement,partner_id:ref.partner||null,settlement_batch_id:null}));
      const primaryRef=t.case_refs[0];
      t.customer_id=primaryRef?.customer_id || (primary.startsWith("DEMO-C")?primary:null);t.object_id=primary;t.partner_id=primaryRef?.partner_id || null;
      const primaryType = original.primary?.startsWith("DEMO-P") ? "partner" : original.primary?.startsWith("DEMO-G") ? "cluster" : "customer";
      t.object_type = source.kind === "event" ? primaryType : source.kind === "object" ? (original.type || "customer") : source.kind;
      t.related_event_ids = source.kind === "event" ? [source.id] : [];
      t.fields = riskTaskFieldsFor(purpose,source,original,t.case_refs,primary);
      t.source_scope=scopeFor(t);
      const total=t.case_refs.reduce((sum,ref)=>sum+Number((store.caseLinks||[]).find(item=>item.customer===ref.customer_id&&item.commission===ref.commission_case_id&&item.settlement===ref.settlement_case_id)?.frozen || 0),0);
      if(["signal_review","settlement_recheck"].includes(purpose)){
        if(t.case_refs.length!==1)fail("AFF-42201","信号来源必须绑定唯一结算案件");
        t.fields.case_ref=copy(t.case_refs[0]);
        t.fields.release_targets=purpose==="settlement_recheck" ? [{restriction_id:sourceCase?.restriction||null,expected_restriction_version:"v1"}] : [];
      }
      t.impact=t.case_refs.length ? money(total.toFixed(2)) : null;
      t.funds_status=t.case_refs.length ? (total > 0 ? "frozen" : "holding") : "not_applicable";
      t.risk_level=original.riskBand || original.risk?.risk_band || null;
      t.credit_level=null;
      t.sla={...(t.sla||{}),due_at:riskTaskSeed?.sla || "2026-11-10 12:00:00+08:00"};t.updated_at=store.serverNow || clock;
      t.reason=body.reason;tasks.push(t);record(t,"source_create_task",role);
    }
    const r={request_id:body.request_id,status:"succeeded",result_ref:{kind:"task",id:t.task_id},error:null,trace_id:`DEMO-TRACE-${++sequence}`};
    const result={task:row(t,role),reused,receipt:r,request_receipt:copy(r)};receipts[body.request_id]={role,receipt:copy(r),result:copy(result)};keys[body.idempotency_key]={digest,result:copy(result)};return copy(result);
  }
  const fixtures = {
    setApprovalChain(roles) {
      if (!Array.isArray(roles) || roles.length < 1 || roles.some(role => !actors[role])) fail("AFF-42201","审批链角色不在Mock角色目录");
      approvalChainOverride = [...roles];
      return {roles:copy(approvalChainOverride)};
    },
    setActorUserId(role,userId) {
      if (!actors[role] || typeof userId !== "string" || !userId.trim()) fail("AFF-42201","Mock角色或用户编号无效");
      actors[role][0] = userId.trim();
      return copy(actor(role));
    },
    setRiskSignal(eventId,signal,options={}) {
      if (!["open","investigating","pending_review","rejected","confirmed","closed"].includes(signal)) fail("AFF-42201","风险信号状态无效");
      const event=(prototype.riskWorkbench?.events || []).find(item=>item.id===eventId);
      if (!event) fail("AFF-40401","风险事件不存在");
      const updated=options.updated || clock;
      event.signal=signal;event.updated=updated;
      signalFacts[eventId]={
        signal_status:signal,
        rejected_effective_at:options.rejected_effective_at || (signal==="rejected" ? updated : null),
        appeal_window_ends_at:options.appeal_window_ends_at || (signal==="rejected" ? new Date(Date.parse(updated) + 7 * 86400000).toISOString() : null),
        appeal_in_progress:Boolean(options.appeal_in_progress)
      };
      event.rejected_effective_at=signalFacts[eventId].rejected_effective_at;
      event.appeal_window_ends_at=signalFacts[eventId].appeal_window_ends_at;
      return copy(event);
    },
    setSettlementBlockers(settlementId,blockers=[]) {
      if (!settlementSources.some(item=>item.case_ref.settlement_case_id===settlementId)) fail("AFF-40401","结算案件不存在");
      if (!Array.isArray(blockers) || blockers.some(item=>typeof item!=="string")) fail("AFF-42201","阻断原因必须是文本数组");
      settlementBlockers[settlementId]=[...new Set(blockers)];
      return {settlement_id:settlementId,blockers:copy(settlementBlockers[settlementId])};
    },
    getSettlementSource(settlementId) {
      const source=authoritativeSettlementSource(settlementId);
      if (!source) fail("AFF-40401","结算案件不存在");
      return copy(source);
    },
    seedPartialExecution(taskId,items=[
      {item_id:"item-success",status:"succeeded",result_ref:{id:"DEMO-RESULT-SUCCESS"},error_code:null,retryable:false,attempt:1,last_attempt_at:clock},
      {item_id:"item-failed",status:"failed",result_ref:null,error_code:"SOURCE_UNAVAILABLE",retryable:true,attempt:1,last_attempt_at:clock}
    ]) {
      const t=tasks.find(item=>item.task_id===taskId);
      if (!t) fail("AFF-40401","任务不存在");
      if (!Array.isArray(items) || items.length < 2 || items.some(item=>!item.item_id || !["succeeded","failed","pending"].includes(item.status))) fail("AFF-42201","部分执行夹具至少需要两个合法执行项");
      const execution={execution_id:`DEMO-TQ-FIXTURE-EXEC-${++sequence}`,task_id:taskId,approval_id:null,status:"partial",version:"e1",items:copy(items),settlement_checks:[],server_time:clock,data_quality:quality()};
      executions.push(execution);t.execution_refs.push(execution.execution_id);bump(t,"execution_failed");
      return copy(execution);
    }
  };
  seed();
  restoreQueueState();
  prototype.taskQueue={version:"1.0",clock,adapter:"unified_prototype_fixture",options:role=>{
    const result=options(role),current=result.current_user.role_code;
    result.default_scope=["system_admin","audit"].includes(current)?"authorized":"mine";
    if(current==="audit")result.authorized_scopes=result.authorized_scopes.filter(s=>s!=="claimable");
    result.source_types=result.source_types.filter(type=>["system_admin","audit","compliance"].includes(current)||domain({source_type:type.key},current)).map(type=>({...type,label_en:englishLabels[type.key]}));
    return result;
  },list,detail:(id,ctx)=>{const result=detail(id,ctx);result.settlement_status=result.funds_status;return result;},assignees,write,receipt,approvals:approvalsFor,exports:exportsFor,reset,peek:()=>copy({tasks,approvals,executions,exports:exportsList.map(({rows,...x})=>x)}),toLegacyRows,toRiskRows,ensureRiskTask,fixtures,get audit(){return copy(audit);}};
})();
