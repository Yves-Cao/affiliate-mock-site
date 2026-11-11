(() => {
  const prototype = window.AFF_ADMIN_PROTOTYPE;
  if (!prototype) throw new Error("AFF_ADMIN_PROTOTYPE is required");
  // 本地演示跳过审核节点，业务校验和执行结果仍由各领域处理。
  const CONFIG_VERSION_APPROVAL_ENABLED = false;
  function demoSkipsApproval() { return prototype.demoPolicy?.approvalRequired === false; }
  window.AFF_ADMIN_CLOCK = window.AFF_ADMIN_CLOCK || {now:()=>Date.now()};

  prototype.routes.push({id:"tickets",title:"客户服务",group:"风控",kind:"customer-service",tabs:[{id:"customer-service",title:"客户服务",description:"",columns:[],statuses:["submitted","processing","waiting_partner","waiting_external","resolved","closed"]}]});
  const supportMenuGroup = prototype.menuBlueprint.find(group => group.id === "risk");
  if (supportMenuGroup) {
    supportMenuGroup.title = "风控";
    supportMenuGroup.match.routeTabs = {...supportMenuGroup.match.routeTabs,tickets:["customer-service"]};
    supportMenuGroup.items.push({id:"nav-customer-service",label:"客户服务",stage:"MVP",routeId:"tickets",tabId:"customer-service",summary:"合作方服务工单、沟通、专业协作与处理记录。",objects:["工单","消息","协作任务"],actions:["认领","回复","协作","解决","关闭"],dependency:["客户服务"]});
  }
  const legacySupportMenu = prototype.menuBlueprint.find(group => group.id === "processing")?.items.find(item => item.id === "nav-appeals");
  if (legacySupportMenu) {legacySupportMenu.label = "申诉处理";legacySupportMenu.summary = "进入专业申诉任务；一般服务工单在客户服务处理。";}
  const taskQueueStates = ["open","processing","waiting_material","pending_approval","returned","pending_execution","executing","execution_failed","done","closed"];
  Object.assign(prototype.scenarios,{batch_partial:"批量部分失败",write_timeout:"写入响应超时",summary_error:"统计暂不可用",boundary:"边界数据检查"});
  prototype.routes.push(
    {id:"tasks",title:"任务队列",group:"工作台",kind:"workspace",tabs:[{id:"task-queue",title:"任务队列",profile:"task-queue",description:"",columns:[],statuses:taskQueueStates}]},
    {id:"workbench",title:demoSkipsApproval() ? "历史审批记录" : "审批队列",group:"工作台",kind:"workspace",tabs:[{id:"approvals",title:demoSkipsApproval() ? "历史审批记录" : "审批队列",profile:"task-approvals",description:"",columns:[],statuses:["pending_approval","approved","rejected","returned"]}]}
  );
  const taskMenuGroup = prototype.menuBlueprint.find(group => group.id === "processing");
  if (taskMenuGroup) {
    taskMenuGroup.title = "工作台";
    taskMenuGroup.match.routeTabs = {...taskMenuGroup.match.routeTabs,tasks:["task-queue"],workbench:["approvals"]};
    const taskMenuItem = taskMenuGroup.items.find(item => item.id === "nav-tasks");
    if (taskMenuItem) Object.assign(taskMenuItem,{routeId:"tasks",tabId:"task-queue",summary:"查看、认领和处理授权范围内的任务。"});
    taskMenuGroup.items.splice(1,0,{id:"nav-task-approvals",label:demoSkipsApproval() ? "历史审批记录" : "审批队列",stage:"MVP",routeId:"workbench",tabId:"approvals",summary:demoSkipsApproval() ? "查看既有审批记录；当前操作不进入审核流程。" : "查看待审申请、串行审批节点及执行记录。",objects:["审批申请"],actions:demoSkipsApproval() ? ["查看"] : ["查看","审批","退回"],dependency:["统一任务服务"]});
  }
  prototype.routes.push({
    id:"partner-360",
    title:"合作方360",
    group:"合作方",
    kind:"partner-360",
    description:"合作方身份、业务、合规、财务、风险与跟进的统一对象视图。",
    tabs:[
      {id:"overview",title:"概览",description:"合作方身份、状态、阻断、指标和待办摘要。"},
      {id:"promotion",title:"推广与归因",description:"活动、链接、Sub ID、回传和归因摘要，只读。"},
      {id:"compliance",title:"合规与资料",description:"CRM、KYC/KYB、协议、收款资料与同步异常，只读。"},
      {id:"finance",title:"财务与结算",description:"佣金、结算、提现、保证金和案件上下文，只读。"},
      {id:"risk",title:"风险与信用",description:"R档、C档、风险事件、集群和风险任务摘要。"},
      {id:"follow-up",title:"跟进与审计",description:"内部备注、任务审批时间线和审计摘要。"}
    ]
  });
  const partnerMenuGroup = prototype.menuBlueprint.find(group => group.id === "partners");
  if (partnerMenuGroup) {
    partnerMenuGroup.match = {
      ...(partnerMenuGroup.match || {}),
      routeTabs:{
        ...(partnerMenuGroup.match?.routeTabs || {}),
        "partner-360":["overview","promotion","compliance","finance","risk","follow-up"]
      }
    };
  }
  prototype.routes.find(item => item.id === "admin-workbench").tabs[0].statuses = taskQueueStates;
  prototype.routes.push({id:"customer-360",title:"客户360",group:"客户与归因",kind:"customer-360",tabs:[
    {id:"overview",title:"概览"},{id:"attribution",title:"归属与转化"},{id:"finance",title:"佣金与结算"},{id:"risk",title:"风险与关联"},{id:"events",title:"事件时间线"}
  ]});
  const customerMenuGroup=prototype.menuBlueprint.find(group=>group.id==="customers");
  if(customerMenuGroup)customerMenuGroup.match.routeTabs={...customerMenuGroup.match.routeTabs,"customer-360":["overview","attribution","finance","risk","events"]};
  const routes = new Map(prototype.routes.map(route => [route.id, route]));
  const tabs = new Map(prototype.routes.flatMap(route => route.tabs.map(item => [item.id, item])));
  const statusLabels = {
    active:"生效中", pending:"待处理", open:"待认领", done:"已完成", waiting_material:"待补件", pending_execution:"待执行", executing:"执行中", execution_failed:"执行失败", pending_review:"待审核", pending_approval:demoSkipsApproval() ? "待接续" : "待审批", draft:"草稿",
    returned:"已退回", rejected:"已拒绝", approved:"已通过", scheduled:"待生效", inactive:"已失效", activation_failed:"生效失败",
    pending_validation:"待校验", pending_simulation:"待试算", voided:"已作废", withdrawn:"已撤回",
    processing:"处理中", success:"成功", failed:"失败", blocked:"已阻断", false_positive:"误报",
    confirmed:"已确认", suspected:"疑似", cleared:"已排除", manual_required:"强制人工", closed:"已关闭",
    waiting_external:"等待外部", expired:"已到期", restore_failed:"恢复异常", frozen:"已冻结",
    released:"已解除", chargeback:"拒付追索", supplementing:"待补材料", overturned:"已改判",
    executed:"已执行", reconcile_failed:"对账失败", warning:"预警", exceeded:"已超限", manual_hold:"人工结算中",
    retrying:"重试中", cancelled:"已取消", high:"高风险", medium:"中风险", low:"低风险", no_hit:"未命中",
    scale_up:"建议放量", observe:"观察", limit:"建议限流", review:"建议复核", a:"A级", b:"B级",
    c:"C级", watch:"关注", safe:"安全", shortfall:"缺口", delayed:"释放延迟", downgraded:"已降级",
    locked:"已锁定", normal:"正常", urgent:"紧急", rolled_back:"已回滚", disabled:"已关闭",
    investigating:"调查中", group_confirmed:"组结论已确认", materials_requested:"待补材料",
    under_review:"复核中", escalated:"已升级", no_risk:"无风险", mis_merged:"误合并",
    ready:"可下载", cancelled:"已取消", expired:"已过期", healthy:"健康", degraded:"降级",
    recovering:"恢复中", alerting:"仅告警", public:"公开", internal:"内部",
    sensitive:"敏感", restricted:"受限", containing:"处置中", monitoring:"观察中", notified:"已通知",
    applying:"申请中", reviewing:"审核中", onboarded:"已入驻", watching:"观察/暂停", offboarding:"清退中", archived:"已归档",
    registered:"已注册", ftd:"FTD", valid_ftd:"有效FTD", churned:"流失", paid:"已支付", reversed:"已冲正",
    R0:"R0 正常", R1:"R1 关注", R2:"R2 较高", R3:"R3 高",
    manual_review:"人工复核", not_started:"未开始", not_required:"无需审核", passed:"已通过", verified:"已认证",
    click:"点击", registration:"注册", commission:"计佣", hold:"结算中", holding:"结算中", release:"释放",
    settlement:"结算", withdrawal:"提现", exception:"异常", gap:"缺数", confirmed_exc:"已确认",
    duplicate_attr:"重复归属", missing_events:"事件缺数", invalid_source:"来源无效", path_missing:"路径未入库",
    pending_review:"待审核", offline:"已下架", rejected:"已驳回", paused:"已暂停",
    spec_passed:"规格通过", spec_warning:"规格警告", spec_failed:"规格失败",
    landing:"落地页", direct:"直链", deep:"深链", kol:"KOL链", banner:"横幅", video:"视频", gif:"GIF",
    normal_blocks:"结算阻断", released_ok:"正常结算", blocked_settle:"案件组阻断", missing_block:"缺数挂起",
    path_block:"路径入库", violation_zero:"违规清零", efficient:"高效精准", noisy:"高误报待调", rare_risk:"低频高危",
    scale_up_label:"建议放量", observe_label:"观察", review_label:"建议复核", limit_label:"建议限控",
    confirmed_param:"已确认", pending_confirm:"待确认", pending_approval_param:"待审批"
  };
  const positiveStatuses = new Set(["active","approved","success","cleared","released","closed","executed","overturned","safe","a","scale_up","no_hit","healthy"]);
  const warningStatuses = new Set(["pending","pending_review","pending_approval","draft","returned","scheduled","processing","suspected","warning","observe","supplementing","waiting_external","retrying","expired","b","medium","low","normal","degraded","recovering","alerting"]);
  const dangerStatuses = new Set(["rejected","failed","blocked","confirmed","manual_required","frozen","chargeback","reconcile_failed","exceeded","manual_hold","shortfall","delayed","activation_failed","restore_failed","downgraded","locked","high","false_positive","limit","urgent"]);
  const owners = ["运营/Ops", "风控/Risk", "财务/Finance", "合规/Compliance", "系统/Tech"];
  const countries = ["TH","ID","MY","VN","PH","ZA","NG"];
  const typesByRoute = {
    "admin-config":["参数版本","价格规则","资格规则","资金规则","审批流"],
    "admin-risk":["点击风险","目标路径","事件缺数","集群特征","欺诈引用"],
    "admin-review":["人工复核","资金处理","申诉","集成任务","配置审批"],
    "admin-performance":["合作方","国家","Sub ID","活动","支付方式"]
  };
  const configDomains = [
    "流量画像门禁", "官方路径库", "价格表", "资格档与里程碑", "信用等级与权益", "动态结算",
    "保证金与税费", "国家与主体", "审批流", "集群规则", "硬规则", "风险评分规则", "违规规则"
  ];
  const roleOwnerNames = {
    operations:"运营/Ops", risk:"风控/Risk", risk_supervisor:"风控主管", risk_reviewer:"风控复核员", finance:"财务/Finance", finance_reviewer:"财务复核员",
    compliance:"合规/Compliance", system_admin:"系统/Tech", audit:"审计/Audit"
  };
  const dashboardRoleNames = {
    operations:"运营",
    finance:"财务",
    risk_supervisor:"主管",
    system_admin:"管理员"
  };
  const taskSourceMap = {
    "风险复核":{route:"admin-review",tab:"risk-review",label:"处理中心 / 风险复核"},
    "配置审批":{route:"admin-config",tab:"approval",label:"配置中心 / 审批流"},
    "D+N冻结":{route:"admin-review",tab:"d-plus-n",label:"处理中心 / D+N冻结"},
    "集成失败":{route:"admin-review",tab:"integration",label:"处理中心 / 集成任务"},
    "申诉补充":{route:"admin-review",tab:"appeal",label:"处理中心 / 申诉处理"},
    "保证金抵扣":{route:"admin-review",tab:"guarantee-offset",label:"处理中心 / 保证金抵扣"},
    "上限熔断":{route:"admin-review",tab:"cap-breaker",label:"处理中心 / 上限与熔断"}
  };
  const actionCatalog = {
    new_draft:{label:"新建草稿", roles:["operations","risk","finance","compliance","system_admin"], reason:true},
    validate:{label:"校验", roles:["operations","risk","finance","compliance","system_admin"], reason:false},
    simulate:{label:"试算", roles:["operations","risk","finance","compliance","system_admin"], reason:false},
    submit:{label:"提交审批", roles:["operations","risk","finance","compliance","system_admin"], reason:true},
    approve:{label:"审批通过", roles:["risk_supervisor","finance","compliance","system_admin"], reason:true, selfReview:true},
    schedule:{label:"定时生效", roles:["risk_supervisor","finance","compliance","system_admin"], reason:false},
    create_review:{label:"生成复核", roles:["risk","risk_supervisor","system_admin"], reason:true},
    assign:{label:"转办", roles:["operations","risk","risk_supervisor","finance","compliance","system_admin"], reason:true},
    false_positive:{label:"标记误报", roles:["risk","risk_supervisor","system_admin"], reason:true},
    claim:{label:"认领", roles:["operations","risk","risk_supervisor","finance","compliance","system_admin"], reason:false},
    supplement:{label:"要求补材料", roles:["operations","risk","risk_supervisor","finance","compliance","system_admin"], reason:true},
    cancel:{label:"取消", roles:["risk_supervisor","finance","compliance","system_admin"], reason:true},
    suggestion:{label:"生成建议", roles:["operations","risk","risk_supervisor","finance","compliance","system_admin"], reason:true},
    export:{label:"异步导出", roles:["operations","risk","risk_supervisor","finance","compliance","system_admin","audit"], reason:false}
  };
  const routeActions = {
    tasks:["claim","assign","submit","export"],
    workbench:["approve","export"],
    "admin-workbench":["claim","assign","approve","export"],
    "admin-config":["new_draft","validate","simulate","submit","approve","schedule","export"],
    "admin-risk":["create_review","assign","false_positive","export"],
    "admin-review":["claim","assign","supplement","submit","approve","cancel","export"],
    "admin-performance":["suggestion","export"],
    "admin-system-config":["new_draft","export"],
    "admin-modules":["new_draft","create_review","claim","assign","supplement","submit","approve","suggestion","export"],
    "risk-workbench":["create_review","claim","approve","export"]
  };
  const primaryActions = {
    "admin-workbench":"claim",
    "risk-workbench":"create_review",
    "admin-config":"new_draft", "admin-system-config":"new_draft", "admin-risk":"create_review", "admin-review":"claim", "admin-performance":"suggestion", "admin-modules":"claim"
  };
  const modulePrimaryActions = {
    "dash-operation":"suggestion","dash-risk":"suggestion","dash-funds":"suggestion",
    "partner-list":"export","partner-onboarding":"claim","partner-kyc":"claim","partner-offboarding":"claim","partner-notes":"claim",
    "client-list":"export","attribution-links":"claim","event-stream":"claim","client-risk":"create_review","attribution-exception":"claim",
    "campaign-list":"new_draft","link-list":"new_draft","material-list":"new_draft","sub-channel":"new_draft","postback":"new_draft","tracker":"export",
    "commission-list":"export","statement-list":"export","withdrawal-list":"claim","tax-list":"export","reversal-list":"claim","reconciliation":"claim",
    "blacklist":"create_review","support-ticket":"claim",
    "report-funnel":"suggestion","report-channel":"suggestion","report-finance":"suggestion","report-risk":"suggestion",
    "config-dictionary":"new_draft","config-permission":"new_draft"
  };
  const moduleActionLabels = {
    "dash-operation":{suggestion:"生成经营建议"},
    "dash-risk":{suggestion:"生成风险建议"},
    "dash-funds":{suggestion:"生成资金建议"},
    "partner-list":{export:"导出合作方"},
    "partner-onboarding":{claim:"认领审核"},
    "partner-kyc":{claim:"认领同步异常"},
    "partner-offboarding":{claim:"认领清退"},
    "partner-notes":{claim:"认领跟进"},
    "client-list":{export:"导出客户"},
    "attribution-links":{claim:"复核归属"},
    "event-stream":{claim:"处理事件"},
    "client-risk":{create_review:"生成风险复核"},
    "attribution-exception":{claim:"处理归因异常"},
    "campaign-list":{new_draft:"新建活动"},
    "link-list":{new_draft:"新建链接"},
    "material-list":{new_draft:"新建素材"},
    "sub-channel":{new_draft:"新建二级渠道"},
    "postback":{new_draft:"新建回传"},
    "tracker":{export:"导出追踪"},
    "commission-list":{export:"导出佣金"},
    "statement-list":{export:"导出结算单"},
    "withdrawal-list":{claim:"查看资金核对任务"},
    "tax-list":{export:"导出税务"},
    "reversal-list":{claim:"认领冲正"},
    "reconciliation":{claim:"处理对账"},
    "blacklist":{create_review:"生成黑名单复核"},
    "support-ticket":{claim:"受理工单"},
    "report-funnel":{suggestion:"生成漏斗建议"},
    "report-channel":{suggestion:"生成渠道建议"},
    "report-finance":{suggestion:"生成财务建议"},
    "report-risk":{suggestion:"生成风控建议"},
    "config-dictionary":{new_draft:"新建参数草稿"},
    "config-permission":{new_draft:"新建权限草稿"}
  };
  // 行内动作映射（操作优先标准：高频动作行尾直接执行，2-3个；低频危险动作走抽屉）
  // type: detail=详情 / toggle=启停切换 / review=审核/复核 / edit=编辑 / claim=认领 / link=跳转
  const rowActionMap = {
    "partner-list":row => [
      {id:"detail",label:"详情"},
      row.partnerRef && ["applying","reviewing"].includes(row.partnerRef.stage) ? {id:"partner_review",label:"审核"} : null,
      row.partnerRef && row.partnerRef.stage === "watching" ? {id:"partner_resume",label:"恢复",target:row.id} : null
    ].filter(Boolean),
    "client-list":row => [
      {id:"detail",label:"详情"},
      row.riskGrade && ["R3"].includes(row.riskGrade) ? {id:"client_review",label:"风险复核",target:row.id} : null
    ].filter(Boolean),
    "attribution-links":row => [
      {id:"detail",label:"详情"},
      row.excRef ? {id:"attr_exc_process",label:"处理异常"} : null,
      row.traceId ? {id:"open_chain",label:"事件链",target:row.traceId} : null
    ].filter(Boolean),
    "event-stream":row => [
      row.traceId ? {id:"open_chain",label:"事件链",target:row.traceId} : {id:"detail",label:"详情"}
    ],
    "link-list":row => [
      {id:"detail",label:"详情"},
      row.rowKind === "link" && row.status === "active" ? {id:"link_toggle",label:"停用",target:row.id} : null,
      row.rowKind === "link" && row.status === "blocked" ? null : null,
      row.rowKind === "sub" && row.status === "active" ? {id:"sub_toggle",label:"暂停",target:row.id} : null,
      row.rowKind === "sub" && row.status === "paused" ? {id:"sub_toggle",label:"恢复",target:row.id} : null
    ].filter(Boolean),
    "material-list":row => [
      {id:"detail",label:"详情"},
      row.state === "pending_review" ? {id:"mat_review",label:"审核",target:row.id} : null,
      row.state === "active" ? {id:"mat_offline",label:"下架",target:row.id} : null
    ].filter(Boolean),
    "postback":row => [
      {id:"detail",label:"详情"},
      {id:"pb_test",label:"试投",target:row.id},
      row.status === "active" ? {id:"pb_toggle",label:"暂停",target:row.id} : row.status === "paused" ? {id:"pb_toggle",label:"恢复",target:row.id} : null
    ].filter(Boolean),
    "tracker":row => [
      {id:"tracker_path",label:"查路径",target:row.id}
    ],
    "commission-list":row => [
      {id:"detail",label:"详情"},
      row.status === "pending" && row.settlementBlock === "正常" ? {id:"fund_approve",label:"确认",target:row.id} : null,
      row.settlementBlock !== "正常" ? {id:"goto_case",label:"查阻断",target:row.traceId} : null
    ].filter(Boolean),
    "statement-list":row => [
      {id:"detail",label:"详情"},
      row.status === "draft" ? {id:"fund_approve",label:"送审",target:row.id} : null,
      row.status === "pending_approval" ? {id:"fund_approve",label:"审批",target:row.id} : null,
      row.status === "confirmed" ? {id:"fund_export",label:"下载",target:row.id} : null
    ].filter(Boolean),
    "withdrawal-list":row => [
      {id:"detail",label:"详情"},
      row.status === "pending" ? {id:"fund_approve",label:"审核",target:row.id} : null,
      row.status === "manual_required" ? {id:"goto_review",label:"转复核",target:row.id} : null,
      row.status === "failed" ? {id:"fund_retry",label:"核对支付",target:row.id} : null
    ].filter(Boolean),
    "reversal-list":row => [
      {id:"detail",label:"详情"},
      row.status === "pending" ? {id:"fund_approve",label:"审批",target:row.id} : null
    ].filter(Boolean),
    "reconciliation":row => [
      {id:"detail",label:"详情"},
      row.status === "reconcile_failed" || row.status === "manual_required" ? {id:"fund_approve",label:"人工处理",target:row.id} : null
    ].filter(Boolean),
    "blacklist":row => [
      {id:"detail",label:"详情"},
      row.status === "pending_review" ? {id:"bl_review",label:"复核",target:row.id} : null,
      row.status === "active" ? {id:"bl_review",label:"移出复核",target:row.id} : null
    ].filter(Boolean),
    "support-ticket":row => [
      {id:"detail",label:"详情"},
      row.status === "pending" ? {id:"tk_claim",label:"受理",target:row.id} : null,
      row.type === "争议" ? {id:"goto_appeal",label:"转申诉",target:row.id} : null,
      row.note.includes("风险") ? {id:"goto_review",label:"转风险复核",target:row.id} : null
    ].filter(Boolean),
    "report-channel":row => [
      {id:"report_drill",label:"下钻ROI",target:"报表中心/ROI"}
    ],
    "report-finance":row => [
      {id:"report_drill",label:"科目下钻",target:row.drill}
    ],
    "report-risk":row => [
      {id:"detail",label:"规则详情"}
    ],
    "config-dictionary":row => [
      {id:"detail",label:"详情"},
      row.state === "pending_confirm" ? {id:"prm_edit",label:"登记参考值",target:row.id} : null
    ].filter(Boolean),
    "config-permission":row => [
      {id:"detail",label:"详情"}
    ]
  };
  const defaultRowActions = row => {
    const primary = modulePrimaryActions[state.tabId];
    const actions = [{id:"detail",label:"详情"}];
    if (primary && ["claim","create_review"].includes(primary)) {
      actions.push({id:"primary_claim",label:moduleActionLabel(primary),actionId:primary});
    }
    return actions;
  };
  function rowActionsFor(row) {
    if (state.routeId !== "admin-modules") return defaultRowActions(row);
    const builder = rowActionMap[state.tabId];
    return builder ? builder(row) : defaultRowActions(row);
  }
  const cockpitViews = [
    {id:"tasks",title:"任务",hint:"本人任务、审批与超时"},
    {id:"operation",title:"经营",hint:"转化、佣金与净ROI"},
    {id:"risk",title:"风险",hint:"案件组、隔离与SLA"},
    {id:"funds",title:"资金",hint:"结算中、保证金与提现"}
  ];
  const cockpitViewTitles = Object.fromEntries(cockpitViews.map(view => [view.id,view.title]));
  const roleDefaultCockpitView = {operations:"tasks",risk:"risk",risk_supervisor:"risk",finance:"funds",compliance:"tasks",system_admin:"tasks",audit:"tasks"};
  const topbarRoleIds = new Set(["operations","finance","risk_supervisor","system_admin"]);
  function normalizeEmployeeRole(role) {
    return topbarRoleIds.has(role) ? role : ({
      risk:"risk_supervisor",risk_reviewer:"risk_supervisor",finance_reviewer:"finance",
      compliance:"system_admin",audit:"system_admin",supervisor:"risk_supervisor"
    }[role] || "system_admin");
  }
  const sessionRole = (() => {
    try { return sessionStorage.getItem("affiliate:admin:role") || ""; } catch { return ""; }
  })();
  const state = {
    routeId:"admin-workbench", tabId:"tasks", detailId:null, role:(() => {
      const requested = /tickets|support-ticket/.test(location.hash)
        ? (window.AFF_SUPPORT_CONTEXT?.role === "supervisor" ? "risk_supervisor" : window.AFF_SUPPORT_CONTEXT?.role || "operations")
        : sessionRole || "system_admin";
      return normalizeEmployeeRole(requested);
    })(), scenario:"normal", legacyRiskRoute:false,
    cockpitView:null,
    partner360View:null,
    filters:{}, draftFilters:{}, filterPanelOpen:false, filterError:"", sort:{key:"updated", dir:"desc"}, page:1, pageSize:20,
    selected:new Set(), hiddenColumns:new Set(), columnPanel:false, modal:null, toast:null, toastAction:null, toastTimer:null,
    workbenchQueue:"all", dashboardRange:"last7", dashboardStatus:"", auditOpen:false, auditKeyword:"",
    searchOpen:false, searchKeyword:"", searchType:"all",
    searchRecent:[], searchActiveIndex:-1,
    demoOpen:false,
    menuOpenGroups:new Set(["dashboard"]), menuActiveGroupId:null, menuBlueprintId:null,
    releaseId:null, releaseModal:null, configVersionId:null, configSubgroupVersionId:null, configVersionModal:null, configActionModal:null,
    configVersionMenuId:null, configVersionMenuPosition:null, configOverviewItem:null, configOverviewVersionId:null, configOverviewVersionItemId:null, configScopedItem:null, systemConfigDrafts:{}, systemConfigConfirm:null, systemConfigPublishConfirm:false, systemConfigHistory:[],
    configVersionScope:"all", configVersionSearch:"", configVersionStatus:"", configVersionDraftSearch:"", configVersionDraftStatus:"",
    configOverviewSearch:"", configOverviewGroup:"", configOverviewStatus:"", configOverviewFilterOpen:false, configOverviewDraft:{search:"",group:"",status:""},
    riskCaseId:null, riskCaseModal:null,
    riskWorkbenchDrawer:null, riskWorkbenchModal:null, riskWorkbenchAction:null, riskWorkbenchReturnFocus:null, riskWorkbenchSensitiveFields:new Set(), riskWorkbenchSensitiveExpiry:{}, riskWorkbenchSensitiveSessions:{}, riskWorkbenchPreviews:{}, riskWorkbenchFilter:{}, riskWorkbenchDraftFilter:{}, riskWorkbenchFiltersByTab:{}, riskWorkbenchDraftFiltersByTab:{}, riskWorkbenchSortsByTab:{}, riskWorkbenchPagesByTab:{}, riskWorkbenchMetricRestore:null, riskWorkbenchMetricPending:null, riskWorkbenchSkipCacheSaveTab:null, riskWorkbenchMore:false, riskWorkbenchPage:1, riskWorkbenchPageSize:20, riskWorkbenchSort:{key:"updated",dir:"desc"}, riskWorkbenchColumnPanel:false, riskWorkbenchHiddenColumns:new Set(), riskWorkbenchHiddenColumnsByTab:{}, riskWorkbenchColumnInitialized:new Set(), riskWorkbenchSummaryRecovered:false, riskWorkbenchListSnapshots:{}, riskWorkbenchSnapshotSequence:0, riskWorkbenchSnapshotId:null, riskWorkbenchSnapshotStale:false,
    reportDimensionId:null, reportSuggestion:null, reportExportOpen:false, reportExportEntry:null, integrationSystemId:null,
    governanceModal:null,
    openTabs:[], notificationOpen:false, notificationMonitorOpen:false, permissionOpen:false,
    partner360Tab:"overview", partnerReview:null, partnerOffboard:null, partnerNoteTarget:null,
    partner360ActionModal:null, partner360SensitiveFields:new Set(), partner360SensitiveExpiry:{}, partner360Period:"last_30d",
    client360Tab:"overview", clientRiskReview:null, eventChainId:null, eventTraceSearch:"",
    link360View:null, materialGrid:false, postbackTab:"mapping", postbackTest:null, trackerSessionId:null, paramDraft:null,
    savedViews:[], viewName:"", activeViewId:null
  };
  const riskDefaultHiddenColumns = {
    objects:new Set(["credit","settlementEligibility","source","country","eventCount","firstDetected","dataQuality"]),
    events:new Set(["triples","batch","ruleVersion","appeal","eventOwner","eventSla","updatedAt"]),
    clusters:new Set([]),
    blacklist:new Set(["addedBy","approvedBy","createdAt","lastUpdated"])
  };
  function riskHiddenColumnsFor(tabId = state.tabId) {
    if (!state.riskWorkbenchHiddenColumnsByTab[tabId]) {
      state.riskWorkbenchHiddenColumnsByTab[tabId] = new Set(riskDefaultHiddenColumns[tabId] || []);
    }
    return state.riskWorkbenchHiddenColumnsByTab[tabId];
  }
  const dataStore = {};
  const savedViewStorageKey = "affiliate-admin-prototype-saved-views-v1";
  const recentSearchStoragePrefix = "affiliate-admin-prototype-recent-searches-v1";

  function loadSavedViews() {
    try {
      const stored = JSON.parse(localStorage.getItem(savedViewStorageKey) || "[]");
      return Array.isArray(stored) ? stored.filter(view => view && view.id && view.routeId && view.tabId) : [];
    } catch {
      return [];
    }
  }

  function persistSavedViews() {
    try {localStorage.setItem(savedViewStorageKey,JSON.stringify(state.savedViews));} catch {}
  }

  function loadRecentSearches(role = state.role) {
    try {
      const stored = JSON.parse(localStorage.getItem(`${recentSearchStoragePrefix}:${role}`) || "[]");
      return Array.isArray(stored) ? stored.filter(item => typeof item === "string" && item.trim()).slice(0,8) : [];
    } catch {
      return [];
    }
  }

  function persistRecentSearches() {
    try {localStorage.setItem(`${recentSearchStoragePrefix}:${state.role}`,JSON.stringify(state.searchRecent));} catch {}
  }

  const h = value => String(value ?? "-").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const pad = value => String(value).padStart(2,"0");
  const statusLabel = value => statusLabels[value] || value || "-";
  const statusTone = value => positiveStatuses.has(value) ? "tm-success" : warningStatuses.has(value) ? "tm-warning" : dangerStatuses.has(value) ? "tm-danger" : "tm-info";
  const statusTag = value => `<span class="dev-status ${statusTone(value)}">${h(statusLabel(value))}</span>`;
  const recommendationLabel = value => ({scale_up:"建议放量",observe:"观察",review:"建议复核",limit:"建议限控"}[value] || value || "-");
  const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value || 0));
  const compact = value => new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(Number(value || 0));
  const percent = value => `${Number(value || 0).toFixed(1)}%`;
  const route = () => routes.get(state.routeId);
  const tab = () => tabs.get(state.tabId);

  function createDate(dayOffset) {
    const date = new Date(window.AFF_ADMIN_CLOCK?.now() || Date.now());
    date.setDate(date.getDate() - dayOffset);
    return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
  }

  function moduleRows(routeId,tabId,currentTab) {
    const schema = prototype.moduleSchemas[tabId];
    if (!schema) return [];
    return Array.from({length:26},(_,index) => {
      const number = index + 1;
      const risk = number % 7 === 0 ? "high" : number % 4 === 0 ? "medium" : number % 3 === 0 ? "low" : "normal";
      const baseName = schema.names[(number-1) % schema.names.length];
      const repeat = Math.ceil(number / schema.names.length);
      const ownerRole = ["operations","risk","risk_supervisor","finance","compliance","system_admin"][number % 6];
      return {
        id:`${schema.prefix.toLowerCase()}-${String(number).padStart(3,"0")}`,
        name:repeat === 1 ? baseName : `${baseName} #${repeat}`,
        type:schema.types[number % schema.types.length],
        status:currentTab.statuses[number % currentTab.statuses.length],
        owner:roleOwnerNames[ownerRole],ownerRole,
        country:countries[number % countries.length],
        version:`v${3 + (number % 5)}.${number % 10}`,
        updated:createDate(index * 2 + (number % 3)),
        due:createDate(number % 3 === 0 ? -(number % 7 + 1) : (number % 5 + 1)),
        overdue:number % 3 === 0,
        amount:schema.groupId === "analytics" || schema.groupId === "dashboard" ? 4200 + number * 275 : 850 + number * 460,
        progress:number % 11 === 0 ? 96 : 24 + (number * 7) % 70,
        risk,priority:number % 9 === 0 ? "urgent" : number % 5 === 0 ? "high" : number % 3 === 0 ? "medium" : "normal",
        impact:schema.impact,
        source:schema.sources[number % schema.sources.length],
        linked:number % 6 === 0 ? "3个对象" : number % 3 === 0 ? "2个对象" : "1个对象",
        stage:schema.groupTitle,
        traceId:`trace-${schema.id}-${number}`,
        timeline:[
          {time:createDate(number+2),action:"系统同步",actor:schema.sources[number % schema.sources.length],result:"success"},
          {time:createDate(number+1),action:"规则处理",actor:"Affiliate Admin API",result:currentTab.statuses[number % currentTab.statuses.length]},
          {time:createDate(number),action:"最近更新",actor:roleOwnerNames[ownerRole],result:"processing"}
        ]
      };
    });
  }

  function partner360Rows() {
    return prototype.partner360.partners.map((partner,index) => ({
      id:partner.id,
      name:partner.name,
      type:partner.type,
      country:partner.country,
      stage:partner.stage,
      stageLabel:prototype.partner360.stages.find(item => item.id === partner.stage)?.label || partner.stage,
      status:partner.status,
      risk:partner.risk === "normal" ? "low" : partner.risk,
      rawRisk:partner.risk,
      owner:partner.owner,
      ownerRole:partner.ownerRole,
      amount:partner.amount,
      updated:partner.updated,
      version:`C${partner.credit.score >= 760 ? "3+" : Math.floor((partner.credit.score - 400) / 80)}`,
      progress:partner.performance ? Math.min(100,Math.round(partner.performance.validFtd / 2)) : 0,
      priority:partner.risk === "high" ? "urgent" : partner.risk === "medium" ? "medium" : "normal",
      due:createDate(index % 3),
      overdue:partner.risk === "high",
      impact:`${partner.type} · ${partner.country} · ${partner.crmId}`,
      source:"CRM",
      linked:partner.performance ? `有效FTD ${partner.performance.validFtd} · 质量${partner.performance.qualityGrade}` : partner.onboard ? `材料${partner.onboard.materials.length}项 · ${partner.onboard.materials.filter(m => m.state !== "submitted").length}项待处理` : "无业绩数据",
      traceId:`trace-${partner.id}`,
      partnerRef:partner,
      certs:`${partner.kyc.status}|${partner.kyb.status}`,
      creditLabel:`${partner.credit.grade} · ${partner.credit.score}`,
      credit:partner.credit.grade,
      timeline:[
        {time:partner.updated,action:"CRM资料同步",actor:"CRM",result:"success"},
        {time:createDate(index+1),action:"生命周期状态确认",actor:partner.owner,result:partner.status},
        {time:createDate(index+2),action:"信用档案刷新",actor:"信用体系服务",result:"success"}
      ]
    }));
  }

  function client360Rows() {
    return prototype.client360.clients.map((client,index) => ({
      id:client.id,
      name:client.name,
      partner:client.partnerId,
      source:client.source,
      country:client.country,
      stage:client.stage,
      ftdAmount:client.ftdAmount,
      riskGrade:client.rGrade,
      risk:client.risk === "R0" || client.risk === "R1" ? "low" : client.risk === "R2" ? "medium" : "high",
      attributedAt:client.attribution.attributedAt,
      updated:client.updated,
      status:client.stage,
      owner:prototype.partner360.partners.find(p => p.id === client.partnerId)?.owner || "运营/Ops",
      amount:client.commissionTotal,
      commissionTotal:client.commissionTotal,
      traceId:prototype.attribution360.links.find(link => link.client === client.id)?.traceId || `trace-cli-${index+1}`,
      crmId:client.crmId,
      clientRef:client,
      timeline:[
        {time:client.attribution.attributedAt,action:"归属判定",actor:"归因引擎",result:"success"},
        {time:client.updated,action:"CRM客户事实同步",actor:"CRM",result:"success"},
        {time:createDate(index % 3),action:client.riskProfile ? "风险档案刷新" : "风险档案待生成",actor:"风控服务",result:client.riskProfile ? client.rGrade : "pending"}
      ]
    }));
  }

  function attributionRows() {
    const exceptions = prototype.attribution360.exceptions;
    const links = prototype.attribution360.links;
    const linkRows = links.map((link,index) => ({
      id:link.id,
      client:link.client,
      partner:link.partner,
      channel:link.channel,
      subId:link.subId,
      rule:link.rule,
      traceId:link.traceId,
      status:link.status,
      risk:link.risk,
      updated:link.updated,
      name:`${link.client} 归属记录`,
      amount:0,
      country:prototype.client360.clients.find(c => c.id === link.client)?.country || "-",
      owner:exceptions.find(e => e.traceId === link.traceId)?.owner || "运营/Ops",
      excRef:null,
      timeline:[
        {time:link.attributedAt,action:"归属判定",actor:"归因引擎",result:link.status},
        {time:link.updated,action:"归属状态更新",actor:"归因引擎",result:link.status}
      ]
    }));
    const excRows = exceptions.map((exc,index) => ({
      id:exc.id,
      client:exc.client,
      partner:exc.partner,
      channel:exc.source,
      subId:"-",
      rule:{duplicate_attr:"待重算",missing_events:"补数中",invalid_source:"挂起",path_missing:"待入库"}[exc.type] || "异常",
      traceId:exc.traceId,
      status:exc.status,
      risk:exc.risk,
      updated:exc.occurredAt,
      name:`${exc.type} · ${exc.client}`,
      amount:exc.amount,
      country:prototype.client360.clients.find(c => c.id === exc.client)?.country || "-",
      owner:exc.owner,
      excRef:exc,
      timeline:[
        {time:exc.occurredAt,action:`${exc.type}识别`,actor:"归因引擎",result:exc.status},
        {time:createDate(index),action:"异常处理跟进",actor:exc.owner,result:exc.status}
      ]
    }));
    return [...linkRows,...excRows];
  }

  function eventStreamRows() {
    return prototype.eventChainCatalog.chains.flatMap(chain => chain.chain.map(node => ({
      id:`${chain.traceId}-${node.seq}`,
      name:`${prototype.eventChainCatalog.nodeTypeLabels[node.type]} · ${node.label}`,
      type:prototype.eventChainCatalog.nodeTypeLabels[node.type],
      nodeType:node.type,
      traceId:chain.traceId,
      client:chain.client,
      partner:chain.partner,
      status:node.status,
      time:node.time,
      updated:node.time || "待定",
      detail:node.detail,
      target:node.target,
      chainRef:chain,
      nodeRef:node,
      country:prototype.client360.clients.find(c => c.id === chain.client)?.country || "-",
      owner:"系统/Tech",
      risk:node.status === "failed" ? "high" : node.status === "warning" || node.status === "pending" ? "medium" : "low",
      amount:chain.totalCommission,
      name_full:`${node.label}`
    })));
  }

  function link360Rows() {
    const links = prototype.link360.links.map(link => ({
      id:link.id,
      name:link.name,
      type:prototype.link360.linkTypes[link.type] || link.type,
      typeKey:link.type,
      campaign:link.campaign,
      country:link.countries.join("/"),
      rule:link.rule,
      clicks30d:link.clicks30d,
      status:link.status,
      risk:link.status === "blocked" ? "high" : link.status === "processing" ? "medium" : "low",
      updated:link.updated,
      owner:"运营/Ops",
      amount:link.conversions30d,
      name_full:link.name,
      linkRef:link,
      rowKind:"link"
    }));
    const subs = prototype.link360.subChannels.map(sub => ({
      id:sub.id,
      name:sub.subId,
      type:"二级渠道",
      campaign:sub.parentName,
      country:prototype.link360.links.find(l => l.id === sub.parentLink)?.countries.join("/") || "-",
      rule:`父链接 ${sub.parentLink}`,
      clicks30d:sub.clicks30d,
      status:sub.status,
      risk:sub.status === "blocked" ? "high" : sub.status === "paused" ? "medium" : "low",
      updated:sub.updated,
      owner:"运营/Ops",
      amount:sub.conversions30d,
      name_full:sub.subId,
      subRef:sub,
      rowKind:"sub"
    }));
    return [...links,...subs];
  }

  function materialRows() {
    return prototype.materialCatalog.items.map(mat => ({
      id:mat.id,
      name:mat.name,
      type:prototype.materialCatalog.types[mat.type] || mat.type,
      typeKey:mat.type,
      platform:mat.platform,
      size:mat.size,
      specCheck:mat.specCheck,
      state:mat.state,
      status:mat.state,
      uploadedAt:mat.uploadedAt,
      updated:mat.uploadedAt,
      owner:mat.uploader,
      risk:mat.specCheck === "failed" ? "high" : mat.specCheck === "warning" || mat.state === "rejected" ? "medium" : "low",
      amount:mat.sizeKb,
      campaign:mat.campaign,
      matRef:mat,
      name_full:mat.name
    }));
  }

  function postbackRows() {
    return prototype.postbackCatalog.configs.map(pb => ({
      id:pb.id,
      name:pb.name,
      platformLabel:prototype.postbackCatalog.platforms[pb.platform] || pb.platform,
      platformKey:pb.platform,
      events:pb.events.join(" / "),
      status:pb.status,
      deliveryRate:pb.delivery30d.sent ? `${(pb.delivery30d.success / pb.delivery30d.sent * 100).toFixed(1)}%` : "-",
      lastTestResult:pb.lastTest.result === "success" ? `成功 ${pb.lastTest.latencyMs}ms` : `失败 ${pb.lastTest.time}`,
      updatedAt:pb.updatedAt,
      updated:pb.updatedAt,
      owner:"系统/Tech",
      risk:pb.lastTest.result === "failed" ? "high" : pb.status === "paused" ? "medium" : "low",
      amount:pb.delivery30d.sent,
      pbRef:pb,
      name_full:pb.name
    }));
  }

  function trackerRows() {
    return prototype.trackerCatalog.sessions.map(session => {
      const lastNode = session.path[session.path.length - 1];
      return {
        id:session.id,
        name:session.id,
        linkName:prototype.link360.links.find(l => l.id === session.linkId)?.name || session.linkId,
        subId:session.subId,
        country:session.country,
        device:session.device,
        pathSummary:`${session.path.filter(n => n.status === "success" || n.status === "confirmed").length}/${session.path.length} 步`,
        clickedAt:session.clickedAt,
        updated:session.clickedAt,
        status:lastNode.status,
        risk:lastNode.status === "failed" ? "high" : lastNode.status === "pending" || lastNode.status === "processing" ? "medium" : "low",
        owner:"系统/Tech",
        amount:0,
        traceId:session.traceId,
        sessionRef:session,
        name_full:`${session.id} · ${session.subId}`
      };
    });
  }

  function fundsRows(tabId) {
    const f = prototype.funds360;
    const pn = id => prototype.partner360.partners.find(p => p.id === id)?.name || id;
    if (tabId === "commission-list") return f.commissions.map(c => ({
      id:c.id,name:c.name,partner:pn(c.partner),type:c.type,amount:c.amount,status:c.status,
      settlementBlock:c.settlementBlock,updated:c.updated,traceId:c.traceId,risk:c.status==="blocked"?"high":c.status==="failed"?"high":"low",
      owner:"财务/Finance",rowKind:"commission",name_full:c.name,note:c.note || "",fundRef:c
    }));
    if (tabId === "statement-list") return f.statements.map(s => ({
      id:s.id,name:s.name,partner:pn(s.partner),grossLabel:money(s.gross),taxLabel:money(s.tax),
      guaranteeLabel:money(s.guarantee),netLabel:money(s.net),status:s.status,
      gross:s.gross,tax:s.tax,guarantee:s.guarantee,net:s.net,period:s.period,note:s.note || "",
      updated:s.updated || s.period.split("~").at(-1),risk:"low",owner:"财务/Finance",rowKind:"statement",name_full:s.name,fundRef:s
    }));
    if (tabId === "withdrawal-list") return f.withdrawals.map(w => ({
      id:w.id,name:w.name,partner:pn(w.partner),amount:w.amount,fee:w.fee,status:w.status,updated:w.updated,
      steps:w.steps,risk:w.status==="manual_required"||w.status==="failed"?"high":"low",
      owner:"财务/Finance",rowKind:"withdrawal",name_full:w.name,fundRef:w,traceId:w.traceId || `trace-${w.id}`
    }));
    if (tabId === "reversal-list") return f.reversals.map(r => ({
      id:r.id,name:r.name,partner:pn(r.partner),type:r.type,amount:r.amount,liable:r.liable,status:r.status,updated:r.updated,
      path:r.path,risk:"high",owner:"财务/Finance",rowKind:"reversal",name_full:r.name,fundRef:r
    }));
    if (tabId === "reconciliation") return f.reconciliations.map(r => ({
      id:r.id,name:r.name,type:r.type,affiliate:money(r.affiliate),external:money(r.external),
      diffLabel:r.diff === 0 ? "无差异" : money(r.diff),diff:r.diff,status:r.status,updated:r.updated,note:r.note || "",
      risk:r.diff === 0 ? "low" : "medium",owner:"财务/Finance",rowKind:"recon",name_full:r.name,fundRef:r
    }));
    return [];
  }

  function governanceRows(tabId) {
    const g = prototype.riskGovernance;
    if (tabId === "blacklist") return g.blacklist.map(b => ({
      id:b.id,name:b.name,type:b.type,value:b.value,reason:b.reason,status:b.status,updated:b.updated,
      note:b.note || "",risk:b.status === "removed" ? "low" : "high",owner:"风控/Risk",rowKind:"blacklist",name_full:b.name
    }));
    if (tabId === "support-ticket") return g.tickets.map(t => ({
      id:t.id,name:t.name,partner:prototype.partner360.partners.find(p => p.id === t.partner)?.name || t.partner,
      type:t.type,priority:t.priority,status:t.status,updated:t.updated,note:t.note || "",
      risk:t.type === "争议" ? "medium" : "low",owner:"运营/Ops",rowKind:"ticket",name_full:t.name
    }));
    return [];
  }

  function analyticsRows(tabId) {
    const a = prototype.analyticsSeeds;
    if (tabId === "report-channel") return a.channels.map(c => ({
      id:c.id,name:c.name,country:c.country,clicks30d:c.clicks30d,convRate:c.convRate,
      roiLabel:c.roiLabel,risk:c.risk,recommendation:c.recommendation,status:c.recommendation,
      amount:c.clicks30d * 0.1,updated:"2026-11-05",owner:"运营/Ops",rowKind:"channel",name_full:c.name
    }));
    if (tabId === "report-finance") return a.financeReports.map(f => ({
      id:f.id,name:f.name,period:f.period,amount:f.amount,trend:f.trend,status:f.status,drill:f.drill,
      note:f.note || "",updated:"2026-11-05 09:30",risk:f.status === "review" ? "medium" : "low",owner:"财务/Finance",rowKind:"finReport",name_full:f.name
    }));
    if (tabId === "report-risk") return a.riskReports.map(r => ({
      id:r.id,name:r.name,hitRate:r.hitRate,falseRate:r.falseRate,amount:r.amount,quadrant:r.quadrant,
      risk:r.risk,status:r.risk,updated:"2026-11-05",owner:"风控/Risk",rowKind:"riskReport",name_full:r.name
    }));
    return [];
  }

  function configRows(tabId) {
    const c = prototype.configSeeds;
    if (tabId === "system") return c.system.map(item => ({
      id:item.id,key:item.key,name:item.name,domain:item.domain,value:item.value,pendingValue:item.pendingValue || "",defaultValue:item.defaultValue || "-",range:item.range || "-",typeLabel:item.typeLabel || "文本",sensitive:Boolean(item.sensitive),status:item.status,owner:item.owner,updated:item.updated,
      description:item.description,inputType:item.inputType,unit:item.unit || "",options:item.options || [],impact:item.impact || "",risk:item.sensitive ? "medium" : "low",rowKind:"system-config",name_full:item.name
    }));
    if (tabId === "config-dictionary") return c.dictionary.map(d => ({
      id:d.id,name:d.name,domain:d.domain,current:d.current,range:d.range,state:d.state,status:d.state,
      updated:d.updated,note:d.note || "",risk:d.state === "pending_confirm" ? "medium" : "low",
      owner:"系统/Tech",rowKind:"param",name_full:d.name
    }));
    if (tabId === "config-permission") return c.permissions.map(p => ({
      id:p.id,name:p.name,pages:p.pages,sensitive:p.sensitive,approval:p.approval,updated:p.updated,
      status:"active",risk:"low",owner:"系统/Tech",rowKind:"permission",name_full:p.name
    }));
    return [];
  }

  function seedRows(routeId = state.routeId, tabId = state.tabId) {
    if (["admin-workbench","tasks"].includes(routeId) && prototype.taskQueue) return prototype.taskQueue.toLegacyRows(state.role);
    if (routeId === "workbench") return [];
    const key = `${routeId}:${tabId}`;
    if (dataStore[key]) return dataStore[key];
    const currentTab = tabs.get(tabId);
    const routeTypes = typesByRoute[routeId] || [];
    if (routeId === "admin-modules" && tabId === "partner-list") {
      const rows = partner360Rows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && tabId === "client-list") {
      const rows = client360Rows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && tabId === "attribution-links") {
      const rows = attributionRows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && tabId === "event-stream") {
      const rows = eventStreamRows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && tabId === "link-list") {
      const rows = link360Rows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && tabId === "material-list") {
      const rows = materialRows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && tabId === "postback") {
      const rows = postbackRows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && tabId === "tracker") {
      const rows = trackerRows();
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && ["commission-list","statement-list","withdrawal-list","reversal-list","reconciliation"].includes(tabId)) {
      const rows = fundsRows(tabId);
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && ["blacklist","support-ticket"].includes(tabId)) {
      const rows = governanceRows(tabId);
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && ["report-channel","report-finance","report-risk"].includes(tabId)) {
      const rows = analyticsRows(tabId);
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-modules" && ["config-dictionary","config-permission"].includes(tabId)) {
      const rows = configRows(tabId);
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-system-config" && tabId === "system") {
      const rows = configRows(tabId);
      dataStore[key] = rows;
      return rows;
    }
    if (routeId === "admin-config" && tabId === "overview") {
      const rows = [{id:"overview-001",name:"配置总览",type:"配置中心",status:"active",owner:"系统/Tech",version:"v1.0",updated:createDate(0),amount:0,progress:100,risk:"low",traceId:"trace-admin-config-1",source:"配置中心",linked:"业务配置",impact:"业务配置版本总览"},...configOverviewRows().map(item => ({
        id:item.id,
        name:item.displayName,
        type:item.category || item.sectionTitle || "业务配置",
        status:item.status || "active",
        owner:item.owner || "系统/Tech",
        version:item.current?.version || "-",
        updated:item.lastModified || item.current?.updated || createDate(0),
        amount:0,
        progress:item.current ? 100 : 0,
        risk:item.status === "activation_failed" ? "high" : "low",
        traceId:item.current?.traceId || `trace-${item.id}`,
        source:"配置中心",
        linked:item.sectionTitle || "业务配置",
        impact:item.parameterSummary || "配置参数"
      }))];
      dataStore[key] = rows;
      return rows;
    }
    if (currentTab.profile === "module") {
      const rows = moduleRows(routeId,tabId,currentTab);
      dataStore[key] = rows;
      return rows;
    }
    const fallbackStatuses = currentTab.statuses?.length ? currentTab.statuses : ["active"];
    const fallbackRouteTypes = routeTypes.length ? routeTypes : [currentTab.title || "对象"];
    const rows = Array.from({length:26}, (_, index) => {
      const number = index + 1;
      const risk = number % 7 === 0 ? "high" : number % 4 === 0 ? "medium" : number % 3 === 0 ? "low" : "normal";
      const row = {
        id:`${currentTab.id}-${String(number).padStart(3,"0")}`,
        name:`${currentTab.entity}-${String(number).padStart(3,"0")}`,
        type:fallbackRouteTypes[index % fallbackRouteTypes.length],
        status:fallbackStatuses[index % fallbackStatuses.length],
        owner:owners[index % owners.length],
        country:countries[index % countries.length],
        version:`v${3 + (index % 5)}.${index % 10}`,
        updated:createDate(index * 3 + (number % 3)),
        due:createDate(-((number % 9) + 1)),
        amount:1200 + number * 385 + (number % 5) * 120,
        progress:number % 11 === 0 ? 95 : 20 + (number * 7) % 78,
        risk,
        priority:number % 9 === 0 ? "urgent" : number % 5 === 0 ? "high" : number % 3 === 0 ? "medium" : "normal",
        impact:`${countries[index % countries.length]} · ${routeTypes[index % routeTypes.length]}`,
        source:`${currentTab.entity}-${String((number % 8)+1).padStart(3,"0")}`,
        linked:number % 6 === 0 ? "3个对象" : number % 3 === 0 ? "2个对象" : "1个对象",
        stage:`${currentTab.type}-${1 + (index % 4)}`,
        traceId:`trace-${routeId}-${number}`
      };
      applyRowProfile(row,number,currentTab,routeId);
      return row;
    });
    dataStore[key] = rows;
    return rows;
  }

  function applyRowProfile(row,number,currentTab = tab(),routeId = state.routeId) {
    const profile = currentTab.profile;
    if (!profile) return;
    if (profile === "workbench") {
      const taskTypes = ["风险复核","配置审批","D+N冻结","集成失败","申诉补充","保证金抵扣","上限熔断"];
      const ownerRoles = ["operations","risk","risk_supervisor","finance","compliance","system_admin"];
      const ownerRole = ownerRoles[number % ownerRoles.length];
      row.name = `${taskTypes[number % taskTypes.length]}-${String(number).padStart(3,"0")}`;
      row.type = taskTypes[number % taskTypes.length];
      row.status = ["pending","processing","pending_approval","waiting_external","failed"][number % 5];
      row.priority = number % 7 === 0 ? "urgent" : number % 4 === 0 ? "high" : number % 3 === 0 ? "medium" : "normal";
      row.ownerRole = ownerRole;
      row.owner = roleOwnerNames[ownerRole];
      row.due = createDate(number % 3 === 0 ? -(number % 7 + 1) : (number % 5 + 1));
      row.overdue = number % 3 === 0;
      row.amount = 800 + number * 420;
      row.progress = 20 + (number * 9) % 75;
      row.source = ["风险系统","配置中心","结算系统","集成平台","申诉中心","财务系统"][number % 6];
      row.linked = number % 4 === 0 ? "合作方 + 3笔佣金" : number % 3 === 0 ? "案件组 + 2笔佣金" : "客户 + 1笔佣金";
      row.impact = row.linked;
      const source = taskSourceMap[row.type] || taskSourceMap["风险复核"];
      row.sourceRoute = source.route;
      row.sourceTab = source.tab;
      row.sourceLabel = source.label;
      row.sourceId = `${source.tab}-${String(number).padStart(3,"0")}`;
      row.partnerId = `partner-${1001 + number % 6}`;
      row.clientCount = 2 + number % 4;
      row.commissionCount = 1 + number % 3;
      row.riskCaseId = `case-group-${String(1 + number % 5).padStart(3,"0")}`;
      row.timeline = [
        {time:createDate(number + 2),action:"任务生成",actor:row.source,result:"pending"},
        {time:createDate(number + 1),action:"规则识别",actor:"识别中心",result:"risk_signal"},
        {time:createDate(number),action:"进入队列",actor:"仪表盘",result:row.status}
      ];
      return;
    }
    if (profile === "config-overview") {
      const domainIndex = (number-1) % configDomains.length;
      row.name = configDomains[domainIndex];
      row.impact = `${1 + domainIndex % 4}个页签 · ${row.country}`;
      row.owner = owners[domainIndex % owners.length];
      return;
    }
    if (profile === "price") {
      row.name = `${row.country}-${["搜索","社交","KOL","买量"][number % 4]}价格`;
      row.stage = `L${1 + number % 4}`;
      row.amount = 180 + (number % 7) * 45;
      row.impact = `国家系数 ${(0.8 + (number % 6)*0.1).toFixed(1)}`;
      return;
    }
    if (profile === "qualification") {
      const level = 1 + number % 4;
      row.name = `L${level}资格规则`;
      row.stage = ["FTD","有效FTD","质量服务","多账户合并"][number % 4];
      row.progress = [35,55,72,88][level-1];
      row.impact = `${[150,250,400,500][level-1]} USD / ${[0.5,1,2,3][level-1]}手`;
      return;
    }
    if (profile === "credit") {
      const level = number % 5;
      row.name = `C${level}信用权益`;
      row.stage = `C${level}`;
      row.amount = level * 25;
      row.progress = 60 + level * 8;
      row.impact = `附加${level*2}% · 保证金-${level}%`;
      return;
    }
    if (profile === "hold") {
      row.name = `${["R0基础","R1附加","R2附加","R3附加","国家附加","支付方式附加","D+N冻结"][number % 7]}`;
      row.progress = [1,3,7,15,2,4,30][number % 7];
      row.impact = `理论结算期=${1 + (number%3)*2}天 · D+N=30天`;
      return;
    }
    if (profile === "guarantee-tax") {
      row.name = `${["滚动保证金","税费","支付手续费","释放周期","终止保留"][number % 5]}规则`;
      row.type = ["保证金","税务","支付","释放","终止"][number % 5];
      row.amount = [1000,1500,35,900,3000][number % 5];
      row.progress = [10,15,20,90,30][number % 5];
      return;
    }
    if (profile === "country-entity") {
      row.name = `${row.country}主体映射`;
      row.impact = ["全开放","仅本地主体","需合规复核","禁止推广"][number % 4];
      return;
    }
    if (profile === "approval") {
      row.name = `${["配置审批","资金审批","风控审批","自审审批"][number % 4]}流`;
      row.stage = ["提交","审批","生效","审计"][number % 4];
      row.due = `${4 + number % 4}小时`;
      row.impact = "支持self_review=true双审计";
      return;
    }
    if (profile === "simulation") {
      row.name = `${["价格","结算","保证金","集群","点击风险"][number % 5]}试算`;
      row.progress = number % 11 === 0 ? 95 : 20 + (number*7)%78;
      row.amount = (number%9+1)*1250;
      row.impact = `命中${10+number*3} · 误伤${number%5}`;
      return;
    }
    if (profile === "cluster-rule") {
      row.name = `${["同设备","同IP段","同支付工具","行为相似","注册集中"][number % 5]}规则`;
      row.progress = [2,3,5,8,12][number % 5];
      row.impact = `窗口${[72,168,30,90,365][number % 5]}小时`;
      return;
    }
    if (profile === "hard-rule") {
      row.name = `${["官方路径库","点击风险","黑名单","实时硬风控","来源校验"][number % 5]}规则`;
      row.type = ["D2","D3","E1","E2","D3"][number % 5];
      row.impact = ["未入库路径禁止生成","高风险点击不计有效","命中即阻断","CRM同步阻断","签名无效过滤"][number % 5];
      return;
    }
    if (profile === "risk-score") {
      row.name = `${["设备关联","支付关联","行为异常","资料异常","事件缺失"][number % 5]}评分`;
      row.stage = `R${number % 4}`;
      row.progress = [5,10,15,20,25][number % 5];
      row.amount = 5 + (number % 6)*5;
      return;
    }
    if (profile === "violation-rule") {
      row.name = `${["虚假流量","违规素材","恶意注册","洗钱线索","多层违规"][number % 5]}规则`;
      row.type = ["流量","素材","账户","资金","结构"][number % 5];
      row.impact = ["暂停链接","下架素材","冻结佣金","合规复核","终止合作"][number % 5];
    }
  }

  function parseHash() {
    const [hashPath,hashQuery = ""] = (location.hash || "#/admin-workbench").replace(/^#\//,"").split("?");
    const params = new URLSearchParams(hashQuery);
    const parts = hashPath.split("/").filter(Boolean);
    if(parts[0]==="admin-review" && legacyTaskTypes[parts[1]]) {
      const type=legacyTaskTypes[parts[1]];
      params.set("scope","authorized");params.set("source_type",type);
      history.replaceState(null,"",`#/tasks?${params}`);
      return {routeId:"tasks",tabId:"task-queue",detailId:null,view:null};
    }
    if (parts[0] === "exports") {
      return {routeId:"admin-review",tabId:"integration",detailId:null,view:null,openExportCenter:true};
    }
    if (parts[0] === "analytics-performance") {
      const target = "./admin-rebuild.html#/analytics-performance";
      if (!location.href.endsWith(target)) location.replace(target);
      return {routeId:"admin-workbench",tabId:"tasks",detailId:null,view:null};
    }
    if (parts[0] === "customer-360") {
      const tabId=["overview","attribution","finance","risk","events"].includes(params.get("tab"))?params.get("tab"):"overview";
      return {routeId:"customer-360",tabId,detailId:decodeURIComponent(parts[1] || ""),view:null};
    }
    if (parts[0] === "partner-360") {
      const pageTabs = new Set(["overview","promotion","compliance","finance","risk","follow-up"]);
      const requestedPageTab = params.get("tab") || "overview";
      const pageTab = pageTabs.has(requestedPageTab) ? requestedPageTab : "overview";
      if (!parts[1]) {
        history.replaceState(null,"", "#/admin-modules/partner-list");
        return {routeId:"admin-modules",tabId:"partner-list",detailId:null,view:null};
      }
      if (!params.has("tab")) {
        params.set("tab","overview");
        history.replaceState(null,"",`#/partner-360/${encodeURIComponent(parts[1])}?${params}`);
      }
      return {
        routeId:"partner-360",
        tabId:pageTab,
        detailId:decodeURIComponent(parts[1]),
        view:null,
        period:params.get("period") || "last_30d",
        partner360View:null,
        client360View:null,
        attributionView:null,
        link360View:null
      };
    }
    if ((parts[0] === "admin-modules" && parts[1] === "support-ticket") || parts[0] === "tickets") {
      if (parts[2] && !params.has("ticket_id")) params.set("ticket_id",parts[2]);
      history.replaceState(null,"",`#/tickets${params.size ? `?${params}` : ""}`);
      return {routeId:"tickets",tabId:"customer-service",detailId:null,view:null};
    }
    if ((parts[0] === "workbench" && params.get("tab") === "tasks") || (parts[0] === "admin-workbench" && parts[1] === "tasks")) {
      params.delete("tab");
      history.replaceState(null,"",`#/tasks${params.size ? `?${params}` : ""}`);
      return {routeId:"tasks",tabId:"task-queue",detailId:null,view:null};
    }
    const legacySystemRoute = parts[0] === "admin-config" && parts[1] === "system";
    const legacyRiskRoute = parts[0] === "admin-risk";
    const routeAlias = parts[0] === "config" ? "admin-config" : parts[0] === "system-config" || legacySystemRoute ? "admin-system-config" : legacyRiskRoute ? "risk-workbench" : parts[0];
    const nextRoute = routes.get(routeAlias) ? routeAlias : "admin-workbench";
    const currentRoute = routes.get(nextRoute);
    const legacyRiskTab = {"risk-event":"events","hard-hit":"events","cluster":"clusters","fraud":"blacklist","credit-insight":"objects","violation":"events"}[parts[1]] || "objects";
    const requestedTab = parts[0] === "config" ? (parts[1] || "overview") : parts[0] === "system-config" || legacySystemRoute ? "system" : legacyRiskRoute ? legacyRiskTab : nextRoute === "risk-workbench" ? (params.get("tab") || parts[1] || "objects") : parts[1];
    if (legacyRiskRoute) {
      const canonical = `#/risk-workbench?tab=${encodeURIComponent(requestedTab)}`;
      if (location.hash !== canonical) history.replaceState(null,"",canonical);
    }
    const nextTab = currentRoute.tabs.some(item => item.id === requestedTab) ? requestedTab : currentRoute.tabs[0].id;
    const lastPart = parts[2] || null;
    const viewMatch = typeof lastPart === "string" ? lastPart.match(/^view=(\w+)$/) : null;
    if (nextRoute === "admin-modules" && nextTab === "partner-list" && lastPart && !viewMatch && params.get("review")!=="1") {
      const legacyTab = params.get("drawer_tab") || "overview";
      const pageTab = ["overview","promotion","compliance","finance","risk","follow-up"].includes(legacyTab) ? legacyTab : legacyTab === "certs" ? "compliance" : legacyTab === "performance" || legacyTab === "credit" ? "overview" : "overview";
      const canonical = `#/partner-360/${encodeURIComponent(lastPart)}?tab=${encodeURIComponent(pageTab)}`;
      history.replaceState(null,"",canonical);
      return {routeId:"partner-360",tabId:pageTab,detailId:decodeURIComponent(lastPart),view:null,partner360View:null,client360View:null,attributionView:null,link360View:null};
    }
    const viewValue = viewMatch ? viewMatch[1] : null;
    const nextCockpitView = viewValue && cockpitViewTitles[viewValue] ? viewValue : null;
    // Removed list views must not leave invisible filters on legacy URLs.
    const nextPartner360View = nextRoute==="admin-modules"&&nextTab==="partner-list"&&params.get("review")==="1" ? "onboarding" : null;
    const client360Views = ["risk","valid"];
    const nextClient360View = viewValue && nextRoute === "admin-modules" && nextTab === "client-list" && client360Views.includes(viewValue) ? viewValue : null;
    const attributionViews = ["exception"];
    const nextAttributionView = viewValue && nextRoute === "admin-modules" && nextTab === "attribution-links" && attributionViews.includes(viewValue) ? viewValue : null;
    const linkViews = ["channel"];
    const nextLink360View = viewValue && nextRoute === "admin-modules" && nextTab === "link-list" && linkViews.includes(viewValue) ? viewValue : null;
    return {routeId:nextRoute, tabId:nextTab, detailId:viewMatch ? null : lastPart, riskEventId:nextRoute === "risk-workbench" ? params.get("event_id") : null, legacyRiskRoute, view:nextCockpitView, partner360View:nextPartner360View, client360View:nextClient360View, attributionView:nextAttributionView, link360View:nextLink360View};
  }

  function flattenMenuItems(items = []) {
    return items.flatMap(item => [item, ...(item.children ? flattenMenuItems(item.children) : [])]);
  }

  function menuGroupItems(group) {
    return flattenMenuItems(group?.items || []);
  }

  function activeCockpitView() {
    return state.cockpitView || roleDefaultCockpitView[state.role] || "tasks";
  }

  function syncFromHash() {
    const parsed = parseHash();
    const routeChanged = parsed.routeId !== state.routeId;
    const tabChanged = parsed.tabId !== state.tabId;
    const leavingMetricTarget = state.routeId === "risk-workbench" &&
      (routeChanged || tabChanged) &&
      state.riskWorkbenchMetricRestore?.targetTab === state.tabId &&
      (parsed.routeId !== "risk-workbench" || parsed.tabId !== state.riskWorkbenchMetricRestore.targetTab);
    if (leavingMetricTarget) {
      const restore = state.riskWorkbenchMetricRestore;
      if (restore?.sourceTab) {
        state.riskWorkbenchFiltersByTab[restore.sourceTab] = {...restore.filter};
        state.riskWorkbenchDraftFiltersByTab[restore.sourceTab] = {...restore.draftFilter};
        state.riskWorkbenchSortsByTab[restore.sourceTab] = {...restore.sort};
        state.riskWorkbenchPagesByTab[restore.sourceTab] = restore.page;
      }
      if (restore?.targetTab && restore.targetCache) {
        state.riskWorkbenchFiltersByTab[restore.targetTab] = {...restore.targetCache.filter};
        state.riskWorkbenchDraftFiltersByTab[restore.targetTab] = {...restore.targetCache.draftFilter};
        state.riskWorkbenchSortsByTab[restore.targetTab] = {...restore.targetCache.sort};
        state.riskWorkbenchPagesByTab[restore.targetTab] = restore.targetCache.page;
      }
      state.riskWorkbenchMetricRestore = null;
      state.riskWorkbenchMetricPending = null;
      state.riskWorkbenchSkipCacheSaveTab = state.tabId;
    }
    const pendingMetric = state.riskWorkbenchMetricPending &&
      parsed.routeId === "risk-workbench" &&
      parsed.tabId === state.riskWorkbenchMetricPending.targetTab
      ? state.riskWorkbenchMetricPending
      : null;
    if (state.routeId === "risk-workbench" && (routeChanged || tabChanged)) {
      if (state.riskWorkbenchSkipCacheSaveTab !== state.tabId) {
        state.riskWorkbenchFiltersByTab[state.tabId] = {...state.riskWorkbenchFilter};
        state.riskWorkbenchDraftFiltersByTab[state.tabId] = {...state.riskWorkbenchDraftFilter};
        state.riskWorkbenchSortsByTab[state.tabId] = {...state.riskWorkbenchSort};
        state.riskWorkbenchPagesByTab[state.tabId] = state.riskWorkbenchPage;
      }
      if (state.riskWorkbenchSkipCacheSaveTab === state.tabId) state.riskWorkbenchSkipCacheSaveTab = null;
    }
    state.routeId = parsed.routeId;
    state.tabId = parsed.tabId;
    state.legacyRiskRoute = Boolean(parsed.legacyRiskRoute);
    state.detailId = parsed.detailId;
    state.cockpitView = parsed.view;
    state.partner360View = parsed.partner360View;
    state.reportExportOpen = Boolean(parsed.openExportCenter);
    state.reportExportEntry = parsed.openExportCenter ? "exports" : null;
    if (state.routeId === "partner-360" && ["last_7d","last_30d","this_month"].includes(parsed.period)) state.partner360Period = parsed.period;
    state.client360View = parsed.client360View;
    state.attributionView = parsed.attributionView;
    state.link360View = parsed.link360View;
    if (state.routeId === "risk-workbench") {
      if (pendingMetric) {
        state.riskWorkbenchFilter = {...pendingMetric.filter};
        state.riskWorkbenchDraftFilter = {...pendingMetric.draftFilter};
        state.riskWorkbenchSort = {...pendingMetric.sort};
        state.riskWorkbenchPage = pendingMetric.page;
        state.riskWorkbenchFiltersByTab[state.tabId] = {...state.riskWorkbenchFilter};
        state.riskWorkbenchDraftFiltersByTab[state.tabId] = {...state.riskWorkbenchDraftFilter};
        state.riskWorkbenchSortsByTab[state.tabId] = {...state.riskWorkbenchSort};
        state.riskWorkbenchPagesByTab[state.tabId] = state.riskWorkbenchPage;
        state.riskWorkbenchMetricPending = null;
      } else {
        state.riskWorkbenchFilter = state.riskWorkbenchFiltersByTab[state.tabId] || (state.tabId === "objects" ? {scope:"open"} : {});
        state.riskWorkbenchDraftFilter = {...(state.riskWorkbenchDraftFiltersByTab[state.tabId] || state.riskWorkbenchFilter)};
        state.riskWorkbenchSort = state.riskWorkbenchSortsByTab[state.tabId] || (
          state.tabId === "events" ? {key:"occurred",dir:"desc"} :
          state.tabId === "blacklist" ? {key:"createdAt",dir:"desc"} :
          {key:"updated",dir:"desc"}
        );
        state.riskWorkbenchPage = state.riskWorkbenchPagesByTab[state.tabId] || 1;
      }
      const event = parsed.riskEventId ? riskWorkbenchStore().events.find(item => item.id === parsed.riskEventId) : null;
      state.riskWorkbenchDrawer = event ? {kind:"event",id:event.id} : null;
    } else if (routeChanged || tabChanged) {
      state.riskWorkbenchDrawer = null;
    }
    if (state.routeId === "tickets") supportUI.syncURL();
    if (routeChanged || tabChanged) {
      state.page = 1; state.selected = new Set(); state.filters = {}; state.draftFilters = {};
      state.filterPanelOpen = false; state.filterError = "";
      state.sort = {key:"updated",dir:"desc"}; state.hiddenColumns = new Set(); state.columnPanel = false;
      state.eventChainId = null; state.eventTraceSearch = ""; state.client360Tab = "overview"; state.partner360Tab = "overview";
      state.partner360SensitiveFields = new Set(); state.partner360SensitiveExpiry = {}; state.riskWorkbenchSensitiveFields = new Set(); state.riskWorkbenchSensitiveExpiry = {}; state.riskWorkbenchSensitiveSessions = {}; state.partner360ActionModal = null; state.partner360Period = "last_30d";
      state.configScopedItem = null; state.configVersionMenuId = null; state.configSubgroupVersionId = null; state.configOverviewVersionId = null; state.configOverviewVersionItemId = null;
      if (["tasks","workbench"].includes(state.routeId)) closeAllDrawers();
    }
    if (parsed.partner360View) state.partner360Tab=parsed.partner360View;
    rememberOpenTab();
    const groupMatchesRoute = group => {
      const direct = menuGroupItems(group).some(item => item.routeId === state.routeId && item.tabId === state.tabId);
      const routeMatch = group.match?.routeId === state.routeId &&
        (!group.match.tabIds || group.match.tabIds.includes(state.tabId));
      const nestedMatch = group.match?.routeTabs?.[state.routeId]?.includes(state.tabId);
      return direct || routeMatch || nestedMatch;
    };
    const selectedGroup = prototype.menuBlueprint.find(group => group.id === state.menuActiveGroupId && groupMatchesRoute(group));
    const activeGroup = selectedGroup || prototype.menuBlueprint.find(groupMatchesRoute) ||
      prototype.menuBlueprint[0];
    state.menuActiveGroupId = activeGroup.id;
    state.menuOpenGroups = new Set([activeGroup.id]);
  }

  function rememberOpenTab() {
    const currentRoute = route(); const currentTab = tab();
    const entry = {id:`${state.routeId}:${state.tabId}`,routeId:state.routeId,tabId:state.tabId,routeTitle:currentRoute.title,tabTitle:currentTab.title};
    if(taskObjectPageActive() || ["tasks","workbench"].includes(state.routeId))entry.hash=location.hash;
    state.openTabs = state.openTabs.filter(item => item.id !== entry.id);
    state.openTabs.push(entry);
    if (state.openTabs.length > 12) state.openTabs.shift();
  }

  function navigate(path) {
    const normalized = `#/${String(path).replace(/^#\/?/,"")}`;
    if (state.routeId === "tickets" && !supportUI.beforeLeave(normalized)) return;
    if (typeof taskQueueBeforeLeave === "function" && !taskQueueBeforeLeave(normalized)) return;
    if (normalized.startsWith("#/risk-workbench") && normalized !== location.hash && state.riskCaseId) {
      state.riskCaseId=null;
      state.riskCaseModal=null;
    }
    if (normalized === location.hash) render(); else location.hash = normalized;
  }
  function basePath() { return `${state.routeId}/${state.tabId}`; }

  function activePartner360View() {
    return state.partner360View || "all";
  }

  function filteredRows() {
    if (state.scenario === "empty") return [];
    const currentTab = tab();
    const keyword = String(state.filters.keyword || "").trim().toLowerCase();
    const isPartner360 = state.routeId === "admin-modules" && state.tabId === "partner-list";
    const p360View = isPartner360 ? activePartner360View() : null;
    return seedRows().filter(row => {
      let queueMatched = true;
      if (state.routeId === "admin-workbench") {
        if (state.workbenchQueue === "mine") queueMatched = row.ownerRole === state.role;
        if (state.workbenchQueue === "approvals") queueMatched = row.status === "pending_approval";
        if (state.workbenchQueue === "overdue") queueMatched = Boolean(row.overdue);
        if (state.workbenchQueue === "integrations") queueMatched = row.type === "集成失败" || row.status === "execution_failed";
      }
      if (p360View === "onboarding" && !["applying","reviewing"].includes(row.stage)) queueMatched = false;
      if (p360View === "offboarding" && !["offboarding","archived"].includes(row.stage)) queueMatched = false;
      if (p360View === "kyc" && !(row.partnerRef.kyc.status !== "verified" || row.partnerRef.kyb.status !== "verified")) queueMatched = false;
      if (p360View === "notes" && !prototype.partner360.noteTemplates.some(note => note.partnerId === row.id)) queueMatched = false;
      if (state.routeId === "admin-modules" && state.tabId === "client-list") {
        const c360View = state.client360View || null;
        if (c360View === "risk" && !["R3"].includes(row.riskGrade)) queueMatched = false;
        if (c360View === "valid" && row.stage !== "valid_ftd") queueMatched = false;
      }
      if (state.routeId === "admin-modules" && state.tabId === "attribution-links" && state.attributionView === "exception" && !row.excRef) queueMatched = false;
      if (state.routeId === "admin-modules" && state.tabId === "link-list") {
        if (state.link360View === "channel" && row.rowKind !== "sub") queueMatched = false;
        if (!state.link360View && row.rowKind !== "link") queueMatched = false;
      }
      if (state.routeId === "admin-modules" && state.tabId === "event-stream" && state.eventTraceSearch) {
        const search = state.eventTraceSearch.toLowerCase();
        queueMatched = queueMatched && (row.traceId.toLowerCase().includes(search) || row.client.toLowerCase().includes(search) || row.partner.toLowerCase().includes(search));
      }
      const values = (currentTab.columns || []).map(column => row[column.key]).join(" ").toLowerCase();
      const keywordMatched = !keyword || values.includes(keyword) || row.id.toLowerCase().includes(keyword) || row.traceId.includes(keyword);
      const statusMatched = !state.filters.status || row.status === state.filters.status;
      const riskMatched = !state.filters.risk || row.risk === state.filters.risk;
      const ownerMatched = !state.filters.owner || row.owner === state.filters.owner;
      const countryMatched = !state.filters.country || row.country === state.filters.country;
      const typeMatched = !state.filters.type || row.type === state.filters.type;
      const stageMatched = state.filters.deepStage === undefined || state.filters.deepStage === "" || String(deepStage(row)) === String(state.filters.deepStage) || row.stage === state.filters.deepStage;
      const rowDate = String(row.updated || "").slice(0,10);
      const fromMatched = !state.filters.from || rowDate >= state.filters.from;
      const toMatched = !state.filters.to || rowDate <= state.filters.to;
      return dashboardDrillMatches(row) && queueMatched && keywordMatched && statusMatched && riskMatched && ownerMatched && countryMatched && typeMatched && stageMatched && fromMatched && toMatched;
    }).sort((a,b) => {
      const direction = state.sort.dir === "asc" ? 1 : -1;
      const left = a[state.sort.key]; const right = b[state.sort.key];
      if (typeof left === "number" && typeof right === "number") return (left-right)*direction;
      return String(left ?? "").localeCompare(String(right ?? ""), "zh-CN")*direction;
    });
  }

  function pageRows(rows) { return rows.slice((state.page-1)*state.pageSize, state.page*state.pageSize); }

  function formatCell(row,column) {
    const value = row[column.key];
    if (["status","risk","priority","stage","state"].includes(column.key)) return statusTag(value);
    if (column.key === "certs") return `<span class="dev-cert-badge ${row.partnerRef.kyc.status}" title="KYC：${h(statusLabel(row.partnerRef.kyc.status))} · 同步 ${h(row.partnerRef.kyc.syncAt)}">KYC</span><span class="dev-cert-badge ${row.partnerRef.kyb.status}" title="KYB：${h(statusLabel(row.partnerRef.kyb.status))} · 同步 ${h(row.partnerRef.kyb.syncAt)}">KYB</span>`;
    if (column.key === "creditLabel") return h(value);
    if (column.key === "riskGrade") return `<span class="dev-status ${["R0","R1"].includes(value) ? "tm-success" : value === "R2" ? "tm-warning" : "tm-danger"}">${h(statusLabel(value))}</span>`;
    if (column.key === "specCheck") return `<span class="dev-status ${value === "passed" ? "tm-success" : value === "warning" ? "tm-warning" : "tm-danger"}">${h(value === "passed" ? "规格通过" : value === "warning" ? "规格警告" : "规格失败")}</span>`;
    if (column.key === "deliveryRate") return h(value);
    if (column.key === "lastTestResult") return `<span class="${value.startsWith("成功") ? "dev-status tm-success" : "dev-status tm-danger"}">${h(value)}</span>`;
    if (column.key === "pathSummary") return h(value);
    if (column.key === "settlementBlock") return `<span class="${value === "正常" ? "dev-status tm-success" : "dev-status tm-warning"}">${h(value)}</span>`;
    if (["grossLabel","taxLabel","guaranteeLabel","netLabel","affiliate","external","diffLabel"].includes(column.key)) return h(value);
    if (column.key === "fee") return money(value);
    if (column.key === "hitRate" || column.key === "falseRate" || column.key === "convRate" || column.key === "roiLabel" || column.key === "trend") return h(value);
    if (column.key === "quadrant") return `<span class="dev-status ${value === "高效精准" ? "tm-success" : value === "低频高危" ? "tm-danger" : "tm-warning"}">${h(value)}</span>`;
    if (column.key === "liable") return h(value);
    if (column.key === "current") return value === "待确认" ? `<span class="dev-status tm-warning">待确认</span>` : h(value);
    if (column.key === "range") return h(value);
    if (column.key === "reason") return h(value);
    if (column.key === "value") return h(value);
    if (column.key === "drill") return `<button class="tm-button secondary dev-row-action" data-row-action="report_drill" data-row-action-target="${h(value)}">${h(value)} →</button>`;
    if (column.key === "pages" || column.key === "sensitive" || column.key === "approval") return h(value);
    if (column.key === "clicks30d" && state.tabId === "report-channel") return compact(value);
    if (column.key === "period") return h(value);
    if (column.key === "traceId") return `<span class="dev-trace-chip" title="点击行查看该TraceId完整事件链">${h(value)}</span>`;
    if (column.key === "ftdAmount") return money(value);
    if (column.format === "score") return String(value);
    if (column.key === "amount") return money(value);
    if (column.unit) return `${value}${column.unit}`;
    if (column.key === "progress") return `${value}%`;
    return h(value);
  }

  function allowedActions(actionIds) {
    return actionIds.map(id => [id,actionCatalog[id]]).filter(([,action]) => action.roles.includes(state.role));
  }

  function legacyActionAllowed(actionId,row) {
    if (!row) return false;
    const states = {
      claim:["pending","open"],assign:["pending","open","processing","waiting_material","returned"],
      supplement:["processing","returned"],submit:["processing","returned","draft"],
      approve:["pending_approval"],cancel:["pending","open","processing","returned","draft"],
      create_review:["pending","open","active","blocked","failed","manual_required"]
    };
    return !states[actionId] || states[actionId].includes(row.status);
  }

  const legacyTaskTypes = {
    "guarantee-offset":"guarantee_offset","risk-review":"risk_review","hold-review":"hold_extend",
    appeal:"appeal","credit-review":"credit_review",chargeback:"chargeback","circuit-breaker":"circuit_breaker"
  };
  function openUnifiedTasks(type,partnerId) {
    const params = new URLSearchParams({scope:"authorized",status_group:"active"});
    if (type) params.set("source_type",type);
    if (partnerId) params.set("partner_id",partnerId);
    state.riskCaseId=null;state.riskCaseModal=null;state.modal=null;
    return navigate(`tasks?${params}`);
  }

  const maxValue = (rows,key) => rows.length ? Math.max(...rows.map(row => Number(row[key] || 0))) : 0;
  const minValue = (rows,key) => rows.length ? Math.min(...rows.map(row => Number(row[key] || 0))) : 0;

  function stats(rows) {
    if (state.routeId === "admin-workbench") {
      const allRows = seedRows();
      const approvals = allRows.filter(row => row.status === "pending_approval").length;
      const overdue = allRows.filter(row => row.overdue).length;
      const integrations = allRows.filter(row => row.type === "集成失败" || row.status === "failed").length;
      return [
        ["全部任务",compact(allRows.length)],["我的任务",compact(allRows.filter(row => row.ownerRole === state.role).length)],
        ["待审批",compact(approvals)],["超时任务",compact(overdue)],
        ["集成失败",compact(integrations)],["影响金额",money(allRows.reduce((sum,row)=>sum+row.amount,0))],
        ["平均SLA",percent(allRows.reduce((sum,row)=>sum+row.progress,0)/(allRows.length||1))],["当前队列",compact(rows.length)]
      ];
    }
    if (state.routeId === "admin-modules") {
      const schema = prototype.moduleSchemas[state.tabId];
      if (state.tabId === "partner-list") {
        const partners360 = prototype.partner360.partners;
        return [
          ["合作方总数",compact(partners360.length)],
          ["已入驻",compact(partners360.filter(item=>item.stage==="onboarded").length)],
          ["入驻审核中",compact(partners360.filter(item=>["applying","reviewing"].includes(item.stage)).length)],
          ["观察/暂停",compact(partners360.filter(item=>item.stage==="watching").length)],
          ["清退中",compact(partners360.filter(item=>item.stage==="offboarding").length)],
          ["累计佣金",money(partners360.reduce((sum,item)=>sum+item.amount,0))],
          ["认证异常",compact(partners360.filter(item=>["failed","sync_failed","expired"].includes(item.kyc.status)||["failed","sync_failed","expired"].includes(item.kyb.status)).length)],
          ["覆盖国家",compact(new Set(partners360.map(item=>item.country)).size)]
        ];
      }
      if (state.tabId === "client-list") {
        const clients360 = prototype.client360.clients;
        return [
          ["客户总数",compact(clients360.length)],
          ["已注册",compact(clients360.filter(c=>c.stage==="registered").length)],
          ["FTD",compact(clients360.filter(c=>c.stage==="ftd").length)],
          ["有效FTD",compact(clients360.filter(c=>c.stage==="valid_ftd").length)],
          ["流失",compact(clients360.filter(c=>c.stage==="churned").length)],
          ["高风险(R3)",compact(clients360.filter(c=>["R3"].includes(c.rGrade)).length)],
          ["累计FTD金额",money(clients360.reduce((sum,c)=>sum+c.ftdAmount,0))],
          ["累计佣金",money(clients360.reduce((sum,c)=>sum+c.commissionTotal,0))]
        ];
      }
      if (state.tabId === "attribution-links") {
        const attr = prototype.attribution360;
        return [
          ["归属记录",compact(attr.links.length)],
          ["归因异常",compact(attr.exceptions.length)],
          ["待处理异常",compact(attr.exceptions.filter(e=>["pending","processing"].includes(e.status)).length)],
          ["隔离通过率",`${attr.isolationPanel.passRate}%`],
          ["本周越界拦截",compact(attr.isolationPanel.blockedThisWeek)],
          ["异常影响金额",money(attr.exceptions.reduce((sum,e)=>sum+e.amount,0))],
          ["高风险异常",compact(attr.exceptions.filter(e=>e.risk==="high").length)],
          ["覆盖客户",compact(new Set([...attr.links,...attr.exceptions].map(x=>x.client)).size)]
        ];
      }
      if (state.tabId === "event-stream") {
        const catalog = prototype.eventChainCatalog;
        const nodes = catalog.chains.flatMap(c=>c.chain);
        return [
          ["事件链",compact(catalog.chains.length)],
          ["事件节点",compact(nodes.length)],
          ["成功节点",compact(nodes.filter(n=>n.status==="success").length)],
          ["失败/异常",compact(nodes.filter(n=>n.status==="failed"||n.type==="exception").length)],
          ["缺数节点",compact(nodes.filter(n=>n.type==="gap").length)],
          ["待处理",compact(nodes.filter(n=>["pending","processing","waiting_external"].includes(n.status)).length)],
          ["链上总佣金",money(catalog.chains.reduce((sum,c)=>sum+c.totalCommission,0))],
          ["覆盖客户",compact(new Set(catalog.chains.map(c=>c.client)).size)]
        ];
      }
      if (state.tabId === "link-list") {
        const l360 = prototype.link360;
        const activeLinks = l360.links.filter(l=>l.status==="active");
        return [
          ["官方链接",compact(l360.links.length)],
          ["生效中",compact(activeLinks.length)],
          ["Sub渠道",compact(l360.subChannels.length)],
          ["渠道生效",compact(l360.subChannels.filter(s=>s.status==="active").length)],
          ["30日点击",compact(l360.links.reduce((s,l)=>s+l.clicks30d,0))],
          ["30日转化",compact(l360.links.reduce((s,l)=>s+l.conversions30d,0))],
          ["阻断链接",compact(l360.links.filter(l=>l.status==="blocked").length)]
        ];
      }
      if (state.tabId === "material-list") {
        const mats = prototype.materialCatalog.items;
        return [
          ["素材总数",compact(mats.length)],
          ["已上架",compact(mats.filter(m=>m.state==="active").length)],
          ["待审核",compact(mats.filter(m=>m.state==="pending_review").length)],
          ["已驳回",compact(mats.filter(m=>m.state==="rejected").length)],
          ["规格警告",compact(mats.filter(m=>m.specCheck==="warning").length)],
          ["规格失败",compact(mats.filter(m=>m.specCheck==="failed").length)]
        ];
      }
      if (state.tabId === "postback") {
        const pbs = prototype.postbackCatalog.configs;
        const totalSent = pbs.reduce((s,p)=>s+p.delivery30d.sent,0);
        const totalOk = pbs.reduce((s,p)=>s+p.delivery30d.success,0);
        return [
          ["回传配置",compact(pbs.length)],
          ["生效中",compact(pbs.filter(p=>p.status==="active").length)],
          ["已暂停",compact(pbs.filter(p=>p.status==="paused").length)],
          ["30日发送",compact(totalSent)],
          ["30日成功率",`${(totalOk/totalSent*100).toFixed(1)}%`],
          ["试投失败",compact(pbs.filter(p=>p.lastTest.result==="failed").length)]
        ];
      }
      if (state.tabId === "tracker") {
        const sessions = prototype.trackerCatalog.sessions;
        return [
          ["点击会话",compact(sessions.length)],
          ["完整转化",compact(sessions.filter(s=>s.path.every(n=>n.status==="success"||n.status==="confirmed")).length)],
          ["进行中",compact(sessions.filter(s=>s.path.some(n=>n.status==="processing"||n.status==="pending")).length)],
          ["路径异常",compact(sessions.filter(s=>s.path.some(n=>n.status==="failed")).length)],
          ["覆盖链接",compact(new Set(sessions.map(s=>s.linkId)).size)]
        ];
      }
      if (state.tabId === "commission-list") {
        const cs = prototype.funds360.commissions;
        return [
          ["佣金记录",compact(cs.length)],
          ["已释放",compact(cs.filter(c=>c.status==="released").length)],
          ["待处理",compact(cs.filter(c=>["pending","processing"].includes(c.status)).length)],
          ["结算阻断",compact(cs.filter(c=>c.settlementBlock!=="正常").length)],
          ["佣金总额",money(cs.reduce((s,c)=>s+c.amount,0))],
          ["阻断金额",money(cs.filter(c=>c.settlementBlock!=="正常").reduce((s,c)=>s+c.amount,0))]
        ];
      }
      if (state.tabId === "statement-list") {
        const ss = prototype.funds360.statements;
        return [
          ["结算批次",compact(ss.length)],
          ["已支付",compact(ss.filter(s=>s.status==="paid").length)],
          ["待审批",compact(ss.filter(s=>s.status==="pending_approval").length)],
          ["草稿",compact(ss.filter(s=>s.status==="draft").length)],
          ["佣金合计",money(ss.reduce((s,x)=>s+x.gross,0))],
          ["净额合计",money(ss.reduce((s,x)=>s+x.net,0))]
        ];
      }
      if (state.tabId === "withdrawal-list") {
        const ws = prototype.funds360.withdrawals;
        return [
          ["提现申请",compact(ws.length)],
          ["成功",compact(ws.filter(w=>w.status==="success").length)],
          ["处理中",compact(ws.filter(w=>w.status==="processing").length)],
          ["失败待处理",compact(ws.filter(w=>["failed","manual_required"].includes(w.status)).length)],
          ["申请总额",money(ws.reduce((s,w)=>s+w.amount,0))]
        ];
      }
      if (state.tabId === "reversal-list") {
        const rs = prototype.funds360.reversals;
        return [
          ["冲正案件",compact(rs.length)],
          ["已执行",compact(rs.filter(r=>r.status==="executed").length)],
          ["处理中",compact(rs.filter(r=>["pending","processing"].includes(r.status)).length)],
          ["冲正总额",money(rs.reduce((s,r)=>s+r.amount,0))]
        ];
      }
      if (state.tabId === "reconciliation") {
        const rs = prototype.funds360.reconciliations;
        return [
          ["对账批次",compact(rs.length)],
          ["平账",compact(rs.filter(r=>r.diff===0).length)],
          ["差异待处理",compact(rs.filter(r=>r.diff!==0).length)],
          ["差异金额",money(rs.reduce((s,r)=>s+Math.abs(r.diff),0))]
        ];
      }
      if (state.tabId === "blacklist") {
        const bs = prototype.riskGovernance.blacklist;
        return [
          ["黑名单对象",compact(bs.length)],
          ["生效中",compact(bs.filter(b=>b.status==="active").length)],
          ["待复核",compact(bs.filter(b=>b.status==="pending_review").length)],
          ["已移出",compact(bs.filter(b=>b.status==="removed").length)]
        ];
      }
      if (state.tabId === "support-ticket") {
        const ts = prototype.riskGovernance.tickets;
        return [
          ["工单",compact(ts.length)],
          ["待受理",compact(ts.filter(t=>t.status==="pending").length)],
          ["处理中",compact(ts.filter(t=>t.status==="processing").length)],
          ["已关闭",compact(ts.filter(t=>t.status==="closed").length)]
        ];
      }
      if (state.tabId === "report-channel") {
        const cs = prototype.analyticsSeeds.channels;
        return [
          ["渠道数",compact(cs.length)],
          ["30日点击",compact(cs.reduce((s,c)=>s+c.clicks30d,0))],
          ["建议放量",compact(cs.filter(c=>c.recommendation==="scale_up").length)],
          ["建议限控",compact(cs.filter(c=>c.recommendation==="limit").length)]
        ];
      }
      if (state.tabId === "report-finance") {
        return [
          ["报表科目",compact(prototype.analyticsSeeds.financeReports.length)],
          ["需关注",compact(prototype.analyticsSeeds.financeReports.filter(f=>f.status==="review").length)]
        ];
      }
      if (state.tabId === "report-risk") {
        const rs = prototype.analyticsSeeds.riskReports;
        return [
          ["规则数",compact(rs.length)],
          ["高效精准",compact(rs.filter(r=>r.quadrant==="高效精准").length)],
          ["高误报待调",compact(rs.filter(r=>r.quadrant==="高误报待调").length)],
          ["阻断金额",money(rs.reduce((s,r)=>s+r.amount,0))]
        ];
      }
      if (state.tabId === "config-dictionary") {
        const ds = prototype.configSeeds.dictionary;
        return [
          ["参数总数",compact(ds.length)],
          ["已确认",compact(ds.filter(d=>d.state==="confirmed").length)],
          ["待确认",compact(ds.filter(d=>d.state==="pending_confirm").length)],
          ["待审批",compact(ds.filter(d=>d.state==="pending_approval").length)]
        ];
      }
      if (state.tabId === "config-permission") {
        return [
          ["角色数",compact(prototype.configSeeds.permissions.length)],
          ["含审批权角色",compact(prototype.configSeeds.permissions.filter(p=>p.approval!=="无").length)]
        ];
      }
      const pending = rows.filter(row => ["pending","pending_review","pending_approval","processing","supplementing","waiting_external","draft"].includes(row.status)).length;
      return [
        [`${schema.entity}总数`,compact(rows.length)],
        ["待处理",compact(pending)],
        ["高风险",compact(rows.filter(row => row.risk === "high").length)],
        ["影响金额",money(rows.reduce((sum,row) => sum+row.amount,0))],
        ["覆盖国家",compact(new Set(rows.map(row => row.country)).size)],
        ["责任角色",compact(new Set(rows.map(row => row.owner)).size)],
        ["今日更新",compact(rows.filter(row => row.updated.startsWith("2026-11-05")).length)],
        ["平均完成度",percent(rows.reduce((sum,row) => sum+row.progress,0)/(rows.length||1))]
      ];
    }
    const pending = rows.filter(row => ["pending","pending_review","pending_approval","processing","draft","returned","manual_required","waiting_external"].includes(row.status)).length;
    const risky = rows.filter(row => ["high","medium"].includes(row.risk) || ["blocked","frozen","confirmed","failed"].includes(row.status)).length;
    const amount = rows.reduce((sum,row) => sum + Number(row.amount || 0),0);
    const progress = rows.length ? rows.reduce((sum,row) => sum+Number(row.progress||0),0)/rows.length : 0;
    const profile = tab().profile;
    if (profile === "config-overview") return [
      ["配置域",compact(rows.length)],["生效中",compact(rows.filter(row=>row.status==="active").length)],
      ["待审批",compact(rows.filter(row=>row.status==="pending_approval").length)],["待生效",compact(rows.filter(row=>row.status==="scheduled").length)],
      ["生效失败",compact(rows.filter(row=>row.status==="activation_failed").length)],["今日更新",compact(rows.filter(row=>row.updated.startsWith("2026-11-05")).length)],
      ["平均版本",compact(rows.reduce((sum,row)=>sum+Number(row.version.match(/\d+/)?.[0]||0),0)/(rows.length||1))],["覆盖页签",compact(rows.reduce((sum,row)=>sum+Number(row.impact.split("个页签")[0]||0),0))]
    ];
    if (profile === "price") return [
      ["价格规则",compact(rows.length)],["覆盖国家",compact(new Set(rows.map(row=>row.country)).size)],
      ["生效版本",compact(rows.filter(row=>row.status==="active").length)],["待审批",compact(pending)],
      ["平均基础CPA",money(amount/(rows.length||1))],["最高CPA",money(maxValue(rows,"amount"))],
      ["渠道数",compact(new Set(rows.map(row=>row.name.split("-")[1])).size)],["今日更新",compact(rows.filter(row=>row.updated.startsWith("2026-11-05")).length)]
    ];
    if (profile === "qualification") return [
      ["资格规则",compact(rows.length)],["L1-L4覆盖",compact(new Set(rows.map(row=>row.name.match(/L\d/)?.[0])).size)],
      ["生效规则",compact(rows.filter(row=>row.status==="active").length)],["待审批",compact(pending)],
      ["平均阈值",percent(progress)],["最高阈值",percent(maxValue(rows,"progress"))],
      ["里程碑类型",compact(new Set(rows.map(row=>row.stage)).size)],["今日更新",compact(rows.filter(row=>row.updated.startsWith("2026-11-05")).length)]
    ];
    if (profile === "credit") return [
      ["权益规则",compact(rows.length)],["C0-C4覆盖",compact(new Set(rows.map(row=>row.stage)).size)],
      ["生效权益",compact(rows.filter(row=>row.status==="active").length)],["平均附加",percent(amount/(rows.length||1))],
      ["最高附加",percent(maxValue(rows,"amount"))],["权益差值",percent(maxValue(rows,"amount")-minValue(rows,"amount"))],
      ["待审批",compact(pending)],["今日更新",compact(rows.filter(row=>row.updated.startsWith("2026-11-05")).length)]
    ];
    if (profile === "hold") return [
      ["结算规则",compact(rows.length)],["基础规则",compact(rows.filter(row=>row.name.startsWith("R")).length)],
      ["国家附加",compact(rows.filter(row=>row.name.includes("国家")).length)],["支付附加",compact(rows.filter(row=>row.name.includes("支付")).length)],
      ["D+N阈值","30天"],["平均天数",`${(rows.reduce((sum,row)=>sum+row.progress,0)/(rows.length||1)).toFixed(1)}天`],
      ["最高天数",`${maxValue(rows,"progress")}天`],["待审批",compact(pending)]
    ];
    if (profile === "guarantee-tax") return [
      ["资金规则",compact(rows.length)],["保证金规则",compact(rows.filter(row=>row.type==="保证金").length)],
      ["税务规则",compact(rows.filter(row=>row.type==="税务").length)],["支付规则",compact(rows.filter(row=>row.type==="支付").length)],
      ["平均金额",money(amount/(rows.length||1))],["最大金额",money(maxValue(rows,"amount"))],
      ["待审批",compact(pending)],["生效规则",compact(rows.filter(row=>row.status==="active").length)]
    ];
    if (profile === "approval") return [
      ["审批流",compact(rows.length)],["节点数",compact(new Set(rows.map(row=>row.stage)).size)],
      ["自审支持",compact(rows.filter(row=>row.impact.includes("self_review")).length)],["待审批",compact(pending)],
      ["平均SLA",`${(rows.reduce((sum,row)=>sum+Number(row.due.match(/\d+/)?.[0]||0),0)/(rows.length||1)).toFixed(1)}小时`],["角色数",compact(new Set(rows.map(row=>row.owner)).size)],
      ["生效流程",compact(rows.filter(row=>row.status==="active").length)],["今日更新",compact(rows.filter(row=>row.updated.startsWith("2026-11-05")).length)]
    ];
    if (profile === "simulation") return [
      ["试算任务",compact(rows.length)],["完成",compact(rows.filter(row=>row.status==="success").length)],
      ["进行中",compact(rows.filter(row=>row.status==="processing").length)],["阻断",compact(rows.filter(row=>row.status==="blocked").length)],
      ["资金影响",money(amount)],["平均完成度",percent(progress)],
      ["命中对象",compact(rows.reduce((sum,row)=>sum+Number(row.impact.match(/命中(\d+)/)?.[1]||0),0))],["误伤提示",compact(rows.reduce((sum,row)=>sum+Number(row.impact.match(/误伤(\d+)/)?.[1]||0),0))]
    ];
    if (profile === "hard-rule") return [
      ["硬规则",compact(rows.length)],["官方路径规则",compact(rows.filter(row=>row.type==="D2").length)],
      ["点击风险规则",compact(rows.filter(row=>row.type==="D3").length)],["黑名单",compact(rows.filter(row=>row.name.includes("黑名单")).length)],
      ["实时拦截",compact(rows.filter(row=>row.name.includes("实时")).length)],["生效规则",compact(rows.filter(row=>row.status==="active").length)],
      ["待审批",compact(pending)],["规则版本",compact(new Set(rows.map(row=>row.version)).size)]
    ];
    return [
      ["当前口径",compact(rows.length)],["生效/正常",compact(rows.length-pending)],
      ["待处理",compact(pending)],["风险项",compact(risky)],
      ["影响金额",money(amount)],["今日新增",compact(rows.filter(row => row.updated.startsWith("2026-11-05")).length)],
      ["平均完成度",percent(progress)],["关联对象",compact(rows.filter(row => row.linked !== "1个对象").length)]
    ];
  }

  function workbenchQueueCount(queue) {
    return dashboardQueueRows(queue).length;
  }

  function workbenchSwitcher() {
    if (state.routeId !== "admin-workbench") return "";
    return `<section class="dev-queue-bar" aria-label="任务队列">${prototype.workbenchQueues.map(queue =>
      `<button class="${state.workbenchQueue===queue.id?"active":""}" data-queue="${h(queue.id)}">${h(demoSkipsApproval() && queue.id==="approvals" ? "待接续" : queue.title)}<span>${workbenchQueueCount(queue.id)}</span></button>`).join("")}</section>`;
  }

  function workbenchQuickFilter() {
    if (state.routeId !== "admin-workbench") return "";
    const options = [["","全部状态"], ...tab().statuses.map(value => [value,statusLabel(value)])];
    return `<section class="dev-workbench-quick-filter" aria-label="任务状态快速筛选">
      <span>任务状态</span>
      ${options.map(([value,label]) => `<button type="button" class="${(state.filters.status || "") === value ? "active" : ""}" data-workbench-status="${h(value)}">${h(label)}</button>`).join("")}
    </section>`;
  }

  const dashboardRangeLabels = {
    today:"今日",
    yesterday:"昨日",
    last7:"最近7天",
    last30:"最近30天",
    month:"本月",
    lastMonth:"上月"
  };

  function dashboardNow() {
    return window.AFF_ADMIN_CLOCK?.now?.() ?? Date.now();
  }

  function dashboardPeriod() {
    const now = new Date(dashboardNow() + 8 * 3600000);
    const day = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
    let start = new Date(day), end = new Date(day);
    if (state.dashboardRange === "yesterday") start.setUTCDate(start.getUTCDate()-1), end.setUTCDate(end.getUTCDate()-1);
    else if (state.dashboardRange === "last7") start.setUTCDate(start.getUTCDate()-6);
    else if (state.dashboardRange === "last30") start.setUTCDate(start.getUTCDate()-29);
    else if (state.dashboardRange === "month") start.setUTCDate(1);
    else if (state.dashboardRange === "lastMonth") {
      start = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1));
      end = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),0));
    }
    return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
  }

  function dashboardInPeriod(value, period = dashboardPeriod()) {
    const date = String(value || "").slice(0,10);
    return Boolean(date && date >= period.from && date <= period.to);
  }

  function dashboardClients() {
    return prototype.client360.clients.filter(client => dashboardInPeriod(client.attribution?.attributedAt));
  }

  function dashboardCommissions() {
    return prototype.funds360.commissions.filter(item => dashboardInPeriod(item.updated));
  }

  function dashboardTaskRows() {
    return (prototype.taskQueue?.toLegacyRows(state.role) || []).filter(row =>
      !["done","closed"].includes(row.status) && !row.boundary_sample
    );
  }

  function dashboardQueueRows(queue = state.workbenchQueue) {
    return dashboardTaskRows().filter(row => {
      if (queue === "mine") return row.ownerRole === state.role;
      if (queue === "approvals") return row.status === "pending_approval";
      if (queue === "overdue") return row.overdue;
      if (queue === "integrations") return row.source_type === "integration";
      return true;
    });
  }

  function dashboardApprovals() {
    const currentUser = prototype.taskQueue?.options(state.role)?.current_user;
    return (prototype.taskQueue?.approvals({role:state.role}) || []).filter(approval => {
      const node = approval.nodes?.[approval.current_node_index || 0];
      return approval.status === "pending_approval" && node?.status === "pending" &&
        (node.role_code || node.required_role) === state.role &&
        approval.applicant?.user_id !== currentUser?.user_id;
    });
  }

  function dashboardSnapshot() {
    const period = dashboardPeriod();
    const drill = (path,metric,includePeriod=true) => `${path}?${new URLSearchParams({
      dashboard_metric:metric,...(includePeriod ? {dashboard_from:period.from,dashboard_to:period.to} : {})
    })}`;
    const clients = dashboardClients();
    const tasks = dashboardTaskRows();
    const ftd = clients.filter(client => Number(client.ftdAmount) > 0);
    const valid = clients.filter(client => client.stage === "valid_ftd");
    const commissions = dashboardCommissions();
    const sum = rows => rows.reduce((total,row)=>total + Number(row.amount || 0),0);
    const range = dashboardRangeLabels[state.dashboardRange] || "今日";
    const cohort = `${range}归属客户 · 当前阶段`;
    const onboarding = prototype.partner360.partners.filter(partner => ["applying","reviewing"].includes(partner.stage));
    const withdrawals = prototype.funds360.withdrawals;
    const pendingWithdrawals = withdrawals.filter(item => ["pending","pending_approval","manual_required"].includes(item.status));
    const settlement = prototype.funds360.commissions.filter(item => item.status === "pending");
    const values = {
      operations:[
        ["新增归属客户",compact(clients.length),range,drill("admin-modules/client-list","attributed")],
        ["已入金客户",compact(ftd.length),cohort,drill("admin-modules/client-list","ftd")],
        ["有效FTD客户",compact(valid.length),cohort,drill("admin-modules/client-list","valid")],
        ["佣金变更金额",money(sum(commissions)),`${range}更新的佣金`,drill("admin-modules/commission-list","commission")],
        ["待审核入驻",compact(onboarding.length),"当前未完成",drill("admin-modules/partner-list","onboarding",false)]
      ],
      finance:[
        ["佣金变更金额",money(sum(commissions)),`${range}更新的佣金`,drill("admin-modules/commission-list","commission")],
        ["结算中金额",money(sum(settlement)),"当前未完成",drill("admin-modules/commission-list","settlement",false)],
        ["待处理提现",compact(pendingWithdrawals.length),demoSkipsApproval() ? "待核对或执行" : "待审批或人工复核",drill("admin-modules/withdrawal-list","withdrawal_pending",false)],
        ["提现失败",compact(withdrawals.filter(item=>item.status==="failed").length),"当前待核对",drill("admin-modules/withdrawal-list","withdrawal_failed",false)],
        ["我的待办",compact(dashboardQueueRows("mine").length),"当前未完成","tasks?scope=mine"]
      ],
      risk_supervisor:[
        [demoSkipsApproval() ? "待接续任务" : "待我审批",compact(demoSkipsApproval() ? dashboardQueueRows("approvals").length : dashboardApprovals().length),demoSkipsApproval() ? "核对后直接提交执行" : "当前审批节点",demoSkipsApproval() ? "tasks?scope=authorized&workflow_states=pending_approval" : "workbench?tab=approvals"],
        ["可见待办",compact(tasks.length),"当前授权范围","tasks?scope=authorized"],
        ["高优先级待办",compact(tasks.filter(item=>item.priority==="high").length),"当前未完成","tasks?scope=authorized&priority=high"],
        ["阻断佣金金额",money(sum(prototype.funds360.commissions.filter(item=>item.status==="blocked"))),"当前结算受阻",drill("admin-modules/commission-list","blocked",false)],
        ["超时待办",compact(dashboardQueueRows("overdue").length),"当前未完成","tasks?scope=authorized&sla_state=overdue"]
      ],
      system_admin:[
        ["全部待办",compact(tasks.length),"当前授权范围","tasks?scope=authorized"],
        [demoSkipsApproval() ? "待接续任务" : "待审批任务",compact(dashboardQueueRows("approvals").length),"当前未完成","tasks?scope=authorized&workflow_states=pending_approval"],
        ["超时待办",compact(dashboardQueueRows("overdue").length),"当前未完成","tasks?scope=authorized&sla_state=overdue"],
        ["执行失败",compact(tasks.filter(item=>item.status==="execution_failed").length),"当前未完成","tasks?scope=authorized&workflow_states=execution_failed"],
        ["集成待办",compact(dashboardQueueRows("integrations").length),"当前未完成","tasks?scope=authorized&source_types=integration"]
      ]
    };
    const viewRole = {finance_reviewer:"finance",risk:"risk_supervisor",risk_reviewer:"risk_supervisor",audit:"system_admin"}[state.role] || state.role;
    return values[viewRole] || values.operations;
  }

  function dashboardRows() {
    let rows = dashboardQueueRows();
    if (state.dashboardStatus) rows = rows.filter(row => row.status === state.dashboardStatus);
    return rows.sort((a,b) =>
      Number(b.overdue) - Number(a.overdue) ||
      Number(b.risk === "high") - Number(a.risk === "high") ||
      Number(b.amount || 0) - Number(a.amount || 0)
    );
  }

  function dashboardDrillMatches(row) {
    const params = new URLSearchParams((location.hash.split("?")[1] || ""));
    const metric = params.get("dashboard_metric");
    if (!metric) return true;
    const period = {from:params.get("dashboard_from") || "",to:params.get("dashboard_to") || "9999-12-31"};
    if (["attributed","ftd","valid"].includes(metric)) {
      const client = row.clientRef;
      return Boolean(client && dashboardInPeriod(client.attribution?.attributedAt,period) &&
        (metric !== "ftd" || Number(client.ftdAmount)>0) &&
        (metric !== "valid" || client.stage === "valid_ftd"));
    }
    if (metric === "commission") return dashboardInPeriod(row.updated,period);
    if (metric === "onboarding") return ["applying","reviewing"].includes(row.stage);
    if (metric === "reserve") return ["confirmed","paid"].includes(row.status);
    if (metric === "settlement") return row.status === "pending";
    if (metric === "blocked") return row.status === "blocked";
    if (metric === "withdrawal_pending") return ["pending","pending_approval","manual_required"].includes(row.status);
    if (metric === "withdrawal_failed") return row.status === "failed";
    if (metric === "reconciliation") return ["reconcile_failed","manual_required"].includes(row.status);
    return true;
  }

  function dashboardDrillNotice() {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const metric = params.get("dashboard_metric");
    const labels = {attributed:"新增归属客户",ftd:"归属客户中的已入金客户",valid:"归属客户中的有效FTD客户",commission:"佣金变更",onboarding:"待审核入驻",reserve:"已确认及已支付结算单的保证金计提",settlement:"结算中佣金",blocked:"结算受阻佣金",withdrawal_pending:"待处理提现",withdrawal_failed:"失败提现",reconciliation:"待处理对账差异"};
    if (!labels[metric]) return "";
    const from = params.get("dashboard_from"), to = params.get("dashboard_to");
    return `<div class="dash-v2-drill-notice"><span>仪表盘下钻：${h(labels[metric])}${from && to ? ` · ${h(from)} 至 ${h(to)}` : ""}</span><button type="button" class="tm-button secondary compact" data-dashboard-clear-drill>清除下钻筛选</button></div>`;
  }

  function dashboardQueueBar() {
    return `<div class="dash-v2-queue-tabs" role="tablist" aria-label="待处理队列">
      ${prototype.workbenchQueues.map(queue => `<button type="button" role="tab" aria-selected="${state.workbenchQueue===queue.id}" class="${state.workbenchQueue===queue.id?"active":""}" data-dashboard-queue="${h(queue.id)}">
        <span>${h(demoSkipsApproval() && queue.id==="approvals" ? "待接续" : queue.title)}</span><strong>${workbenchQueueCount(queue.id)}</strong>
      </button>`).join("")}
    </div>`;
  }

  function dashboardQueueTable() {
    const rows = dashboardRows().slice(0,10);
    const statusOptions = [["","全部状态"], ...tab().statuses.filter(value=>!["done","closed"].includes(value)).map(value => [value,statusLabel(value)])];
    return `<section class="dash-v2-panel dash-v2-queue" aria-label="待处理队列">
      <header class="dash-v2-panel-head">
        <div><h2>待处理队列</h2><p>展示当前队列优先处理的10项任务；待办为当前状态，不受上方统计周期影响。</p></div>
        <button class="tm-button secondary" data-dashboard-expand="1">查看完整列表</button>
      </header>
      ${dashboardQueueBar()}
      <div class="dash-v2-quick-filter" aria-label="任务状态快速筛选">
        <span>状态</span>
        ${statusOptions.map(([value,label]) => `<button type="button" class="${state.dashboardStatus===value?"active":""}" data-dashboard-status="${h(value)}">${h(label)}</button>`).join("")}
      </div>
      <div class="tm-table-wrap dash-v2-table-wrap">
        <table class="dash-v2-table">
          <thead><tr><th>优先级</th><th>任务</th><th>对象</th><th>状态</th><th>责任人</th><th>SLA状态</th><th class="numeric">影响金额</th><th>更新时间</th><th class="dash-v2-action">操作</th></tr></thead>
          <tbody>${rows.length ? rows.map(row => `<tr>
            <td><span class="dev-status">${h(({high:"高",medium:"中",low:"低",normal:"普通",urgent:"紧急"})[row.priority] || "普通")}</span></td>
            <td title="${h(row.name)}"><strong>${h(row.name)}</strong><small>${h(row.type)} · ${h(row.id)}</small></td>
            <td>${h(row.customerId || row.customer_id || row.partnerId || row.partner_id || row.source || "待关联对象")}</td>
            <td>${statusTag(row.status)}</td>
            <td>${h(row.owner)}</td>
            <td>${row.overdue ? `<span class="dash-v2-sla danger">已超时</span>` : `<span class="dash-v2-sla">${h(row.sla?.includes("T") ? tqDate(row.sla) : row.due || row.sla || "未配置")}</span>`}</td>
            <td class="numeric">${money(row.amount)}</td>
            <td>${h(row.updated)}</td>
            <td class="dash-v2-action"><button class="tm-button secondary" data-dashboard-task="${h(row.id)}">查看</button></td>
          </tr>`).join("") : `<tr><td colspan="9" class="tm-empty">当前条件暂无待处理任务<br><small>可以切换队列或清除状态筛选</small></td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
  }

  function dashboardTaskListPage() {
    const rows = dashboardRows();
    const statusOptions = [["","全部状态"], ...tab().statuses.filter(value=>!["done","closed"].includes(value)).map(value => [value,statusLabel(value)])];
    return `<section class="dash-v2-panel dash-v2-queue dash-v2-task-list" aria-label="完整任务列表">
      <header class="dash-v2-panel-head">
        <div><h2>任务筛选与结果</h2><p>按当前角色、队列和状态展示全部可见任务。</p></div>
      </header>
      ${dashboardQueueBar()}
      <div class="dash-v2-quick-filter" aria-label="完整任务列表状态筛选">
        <span>状态</span>
        ${statusOptions.map(([value,label]) => `<button type="button" class="${state.dashboardStatus===value?"active":""}" data-dashboard-status="${h(value)}">${h(label)}</button>`).join("")}
      </div>
      <div class="tm-table-wrap dash-v2-table-wrap">
        <table class="dash-v2-table">
          <thead><tr><th>优先级</th><th>任务</th><th>对象</th><th>状态</th><th>责任人</th><th>SLA状态</th><th class="numeric">影响金额</th><th>更新时间</th><th class="dash-v2-action">操作</th></tr></thead>
          <tbody>${rows.length ? rows.map(row => `<tr>
            <td>${statusTag(row.priority || row.risk || "normal")}</td>
            <td title="${h(row.name)}"><strong>${h(row.name)}</strong><small>${h(row.type)} · ${h(row.id)}</small></td>
            <td>${h(row.customerId || row.customer_id || row.partnerId || row.partner_id || row.source || "待关联对象")}</td>
            <td>${statusTag(row.status)}</td>
            <td>${h(row.owner)}</td>
            <td>${row.overdue ? `<span class="dash-v2-sla danger">已超时</span>` : `<span class="dash-v2-sla">${h(row.due || row.sla || "未配置")}</span>`}</td>
            <td class="numeric">${money(row.amount)}</td>
            <td>${h(row.updated)}</td>
            <td class="dash-v2-action"><button class="tm-button secondary" data-dashboard-task="${h(row.id)}">查看</button></td>
          </tr>`).join("") : `<tr><td colspan="9" class="tm-empty">当前条件暂无任务<br><small>可以切换队列或清除状态筛选</small></td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
  }

  function dashboardTrendData() {
    const period = dashboardPeriod();
    const buckets = new Map();
    for (let time=Date.parse(`${period.from}T00:00:00Z`);time<=Date.parse(`${period.to}T00:00:00Z`);time+=86400000) {
      const date = new Date(time).toISOString().slice(0,10);
      buckets.set(date,{date,clients:0,ftd:0,valid:0});
    }
    dashboardClients().forEach(client => {
      const bucket = buckets.get(String(client.attribution?.attributedAt || "").slice(0,10));
      if (!bucket) return;
      bucket.clients++;
      if (Number(client.ftdAmount)>0) bucket.ftd++;
      if (client.stage === "valid_ftd") bucket.valid++;
    });
    return [...buckets.values()];
  }

  function dashboardTrendPanel() {
    const series = dashboardTrendData();
    const totals = series.reduce((sum,item)=>({clients:sum.clients+item.clients,ftd:sum.ftd+item.ftd,valid:sum.valid+item.valid}),{clients:0,ftd:0,valid:0});
    const max = Math.max(1,...series.map(item => item.clients));
    const rate = (value,total) => total ? `${(value/total*100).toFixed(1)}%` : "—";
    return `<section class="dash-v2-panel dash-v2-trend">
      <header class="dash-v2-panel-head"><div><h2>客户归属与转化</h2><p>按归属日期统计同一批客户；入金与有效FTD取客户当前事实。</p></div></header>
      <div class="dash-v2-legend"><span><i class="click"></i>归属客户</span><span><i class="register"></i>已入金客户</span><span><i class="valid"></i>有效FTD客户</span></div>
      <div class="dash-v2-chart" aria-label="客户归属与转化趋势">${series.map(item => `<div class="dash-v2-chart-col"><div class="dash-v2-bars">${[["click","归属客户",item.clients],["register","已入金客户",item.ftd],["valid","有效FTD客户",item.valid]].map(([tone,label,value])=>`<i class="${tone}${value ? "" : " is-zero"}" style="height:${value/max*100}%" title="${item.date} ${label} ${value}"></i>`).join("")}</div><small>${h(item.date.slice(5))}</small></div>`).join("")}</div>
      <div class="dash-v2-mini-table"><div><span>归属客户</span><strong>${compact(totals.clients)}</strong></div><div><span>归属客户→已入金</span><strong>${rate(totals.ftd,totals.clients)}</strong></div><div><span>已入金→有效FTD</span><strong>${rate(totals.valid,totals.ftd)}</strong></div></div>
    </section>`;
  }

  function dashboardFundsData() {
    const funds = prototype.funds360;
    const sum = (rows,key) => rows.reduce((total,row)=>total+Number(row[key] || 0),0);
    const drill = (path,metric) => `${path}?dashboard_metric=${metric}`;
    return [
      ["结算中佣金",money(sum(funds.commissions.filter(item=>item.status==="pending"),"amount")),"当前未完成",drill("admin-modules/commission-list","settlement")],
      ["已计提保证金",money(sum(funds.statements.filter(item=>["confirmed","paid"].includes(item.status)),"guarantee")),"已确认/已支付结算单计提",drill("admin-modules/statement-list","reserve")],
      ["待处理提现",`${funds.withdrawals.filter(item=>["pending","pending_approval","manual_required"].includes(item.status)).length}笔`,demoSkipsApproval() ? "待核对或执行" : "待审批或人工复核",drill("admin-modules/withdrawal-list","withdrawal_pending")],
      ["提现失败",`${funds.withdrawals.filter(item=>item.status==="failed").length}笔`,"等待核对支付回执",drill("admin-modules/withdrawal-list","withdrawal_failed")],
      ["对账差异",`${funds.reconciliations.filter(item=>["reconcile_failed","manual_required"].includes(item.status)).length}项`,"等待人工核对",drill("admin-modules/reconciliation","reconciliation")]
    ];
  }

  function dashboardFundsPanel() {
    const funds = dashboardFundsData();
    return `<section class="dash-v2-panel dash-v2-funds">
      <header class="dash-v2-panel-head"><div><h2>资金与结算</h2><p>按当前账务记录汇总，不受经营统计周期影响。</p></div></header>
      <div class="dash-v2-fund-list">${funds.map(([label,value,hint,target]) => `<button type="button" data-dashboard-drill="${h(target)}"><span>${h(label)}</span><strong>${h(value)}</strong><small>${h(hint)}</small><b>›</b></button>`).join("")}</div>
    </section>`;
  }

  function dashboardSignals() {
    const tasks = dashboardTaskRows();
    const signals = [
      {tone:"danger",title:"超时待办",detail:`${dashboardQueueRows("overdue").length}项 · 优先查看当前责任人与处理要求`,target:"tasks?scope=authorized&sla_state=overdue"},
      {tone:"warning",title:demoSkipsApproval() ? "待接续任务" : "待我审批",detail:demoSkipsApproval() ? `${dashboardQueueRows("approvals").length}项 · 核对后直接提交执行` : `${dashboardApprovals().length}项 · 按当前审批节点办理`,target:demoSkipsApproval() ? "tasks?scope=authorized&workflow_states=pending_approval" : "workbench?tab=approvals"},
      {tone:"warning",title:"待补充材料",detail:`${tasks.filter(item=>item.status==="waiting_material").length}项 · 跟进材料提交`,target:"tasks?scope=authorized&workflow_states=waiting_material"}
    ];
    return `<section class="dash-v2-panel dash-v2-signals">
      <header class="dash-v2-panel-head"><div><h2>办理提醒</h2><p>从当前授权待办中汇总需要跟进的事项。</p></div></header>
      <div class="dash-v2-signal-list">${signals.map(signal => `<button type="button" data-dashboard-drill="${h(signal.target)}"><i class="${h(signal.tone)}"></i><span><strong>${h(signal.title)}</strong><small>${h(signal.detail)}</small></span><b>›</b></button>`).join("")}</div>
    </section>`;
  }

  function dashboardQuickLinks() {
    const links = {
      operations:[["入驻审核","admin-modules/partner-list?dashboard_metric=onboarding"],["客户数据","admin-modules/client-list"],["活动与链接","admin-modules/campaign-list"],["素材库","admin-modules/material-list"],["任务处理","tasks?scope=mine"]],
      finance:[["佣金数据","admin-modules/commission-list"],["提现记录","admin-modules/withdrawal-list"],["保证金计提","admin-modules/statement-list?dashboard_metric=reserve"],["对账","admin-modules/reconciliation"],["财务统计","admin-modules/report-finance"]],
      risk_supervisor:[["风险复核","risk-workbench?tab=objects"],["结算阻断","risk-workbench?tab=objects"],["信用档案","admin-risk/credit-insight"],["案件组","risk-workbench?tab=clusters"],["经营报表","admin-performance/roi"]],
      system_admin:[["集成任务","tasks?scope=authorized&source_types=integration"],["业务配置","admin-config/overview"],["权限管理","admin-modules/permission"],["操作审计","admin-modules/audit"],["事件流水","admin-modules/event-stream"]]
    };
    const current = links[state.role] || links.operations;
    return `<section class="dash-v2-panel dash-v2-quick">
      <header class="dash-v2-panel-head"><div><h2>快捷入口</h2><p>按角色固定排序，最多显示6项。</p></div></header>
      <div class="dash-v2-quick-grid">${current.map(([label,target],index) => `<button type="button" data-dashboard-drill="${h(target)}"><span>${index+1}</span><strong>${h(label)}</strong><b>›</b></button>`).join("")}</div>
    </section>`;
  }

  function dashboardPage() {
    if (state.detailId === "full") return dashboardTaskListPage();
    const roleLabel = dashboardRoleNames[state.role] || prototype.roles[state.role] || "当前岗位";
    return `<section class="dash-v2-page" aria-label="管理端仪表盘">
      <div class="dash-v2-meta"><span>${h(roleLabel)}视角 · 经营统计：${h(dashboardPeriod().from)} 至 ${h(dashboardPeriod().to)}</span><span class="dash-v2-fresh"><i></i>待办与资金展示当前状态</span></div>
      <section class="dash-v2-snapshot" aria-label="业务快照">
        ${dashboardSnapshot().map(([label,value,hint,target]) => `<button type="button" data-dashboard-drill="${h(target)}"><span>${h(label)}</span><strong>${h(value)}</strong><small>${h(hint)}</small><b>›</b></button>`).join("")}
      </section>
      ${dashboardQueueTable()}
      <div class="dash-v2-two-col">${dashboardTrendPanel()}${dashboardFundsPanel()}</div>
      <div class="dash-v2-two-col dash-v2-bottom">${dashboardSignals()}${dashboardQuickLinks()}</div>
    </section>`;
  }

  function topbarIcon(name) {
    const icons = {
      search:'<circle cx="7.5" cy="7.5" r="4.5"></circle><path d="M11 11L15 15"></path>',
      bell:'<path d="M4 8a4 4 0 0 1 8 0c0 3 .8 4.2 1.5 5H2.5C3.2 12.2 4 11 4 8Z"></path><path d="M6.5 15.5a1.5 1.5 0 0 0 3 0"></path>',
      shield:'<path d="M8 2l5 1.7v3.8c0 3-2 5.2-5 6.5-3-1.3-5-3.5-5-6.5V3.7L8 2Z"></path><path d="M5.8 8.2l1.6 1.6 2.8-3"></path>',
      audit:'<path d="M5 3h6l3 3v9H5V3Z"></path><path d="M7 8h6M7 11h4"></path>',
      sun:'<circle cx="8" cy="8" r="3"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4"></path>',
      globe:'<circle cx="8" cy="8" r="6"></circle><path d="M2.5 8h11M8 2c2 2 2 10 0 12-2-2-2-10 0-12Z"></path>'
    };
    return `<svg viewBox="0 0 16 16" aria-hidden="true">${icons[name] || ""}</svg>`;
  }

  function roleSwitcher() {
    const roles = [...topbarRoleIds].map(role => {
      const user = prototype.taskQueue?.options(role)?.current_user;
      return [role,`${user?.display_name || ""} · ${dashboardRoleNames[role]}`];
    });
    return `<label class="tm-role-switch"><span>当前员工</span><select data-role aria-label="切换角色" title="切换员工及其岗位">${roles.map(([value,name]) =>
      `<option value="${h(value)}" ${state.role===value?"selected":""}>${h(name)}</option>`).join("")}</select></label>`;
  }

  function roleWorkbenchProfile(tasks) {
    const mine = tasks.filter(row => row.ownerRole === state.role);
    const approvals = tasks.filter(row => row.status === "pending_approval");

    const overdue = tasks.filter(row => row.overdue);
    const processing = tasks.filter(row => ["pending","processing","waiting_external"].includes(row.status));
    const riskTasks = tasks.filter(row => row.type === "风险复核" || row.type === "D+N冻结" || row.type === "上限熔断");
    const fundTasks = tasks.filter(row => row.type === "D+N冻结" || row.type === "保证金抵扣");
    const integrationTasks = tasks.filter(row => row.type === "集成失败" || row.status === "failed");
    const abnormalSystems = prototype.integrationHealth.systems.filter(item => item.status !== "healthy");
    const activeQuarantine = prototype.riskCases.filter(item => item.quarantine.status === "active");
    const profiles = {
      operations:{
        summary:[["我的任务",mine.length,`${roleOwnerNames[state.role]}队列`],["待处理",processing.filter(row=>mine.includes(row)).length,"等待运营动作"],["今日超时",overdue.filter(row=>mine.includes(row)).length,"SLA优先"],["客户申诉",tasks.filter(row=>row.type==="申诉补充").length,"待补充或改判"]],
        priority:[...mine,...tasks.filter(row=>row.type==="申诉补充")],
        signals:prototype.notifications.filter(item=>item.unread).map(item=>({id:item.id,kind:"notification",title:item.title,detail:item.detail})),
        links:[["admin-review","处理中心"],["admin-performance","报表中心"],["admin-config","配置中心"]],
        focus:"处理本人任务、客户申诉和跨团队协同事项"
      },
      risk:{
        summary:[["风险复核",riskTasks.filter(row=>row.status!=="closed").length,"待风险结论"],["高风险",riskTasks.filter(row=>row.risk==="high").length,"优先核实"],["今日超时",riskTasks.filter(row=>row.overdue).length,"调查SLA"],["阻塞金额",money(riskTasks.reduce((sum,row)=>sum+row.amount,0)),"待结论资金"]],
        priority:riskTasks,
        signals:prototype.riskCases.map(item=>({id:item.id,kind:"risk",title:item.name,detail:item.features.slice(0,2).join(" / ")})),
        links:[["admin-risk","识别中心"],["admin-review","处理中心"],["admin-performance","报表中心"]],
        focus:"核实风险事实、案件组和逐案资金影响"
      },
      risk_supervisor:{
        summary:[["待审批",approvals.length,"等待主管签核"],["高风险",tasks.filter(row=>row.risk==="high").length,"需复核结论"],["案件组",prototype.riskCases.length,"组结论待确认"],["隔离金额",money(activeQuarantine.reduce((sum,item)=>sum+item.quarantine.amount,0)),"统一隔离队列"]],
        priority:[...approvals,...riskTasks.filter(row=>row.risk==="high")],
        signals:prototype.riskCases.map(item=>({id:item.id,kind:"risk",title:item.name,detail:`${item.partner} · ${item.features.slice(0,2).join(" / ")}`})),
        links:[["admin-review","处理中心"],["admin-risk","识别中心"],["admin-performance","报表中心"]],
        focus:"审批风险结论、隔离解除和资金处置"
      },
      finance:{
        summary:[["待审批",approvals.length,"资金与配置签核"],["资金阻塞",fundTasks.length,"结算中/保证金案件"],["待复核",processing.length,"资金处理队列"],["影响金额",money(fundTasks.reduce((sum,row)=>sum+row.amount,0)),"待处理资金"]],
        priority:[...fundTasks,...approvals],
        signals:prototype.reportPackets.find(item=>item.tab==="guarantee-coverage")?.dimensions.filter(item=>item.status!=="safe").map(item=>({id:item.id,kind:"report",title:`保证金覆盖 ${item.label}`,detail:`覆盖率${item.coverage}% · 潜在损失${money(item.potentialLoss)}`})) || [],
        links:[["admin-review","处理中心"],["admin-performance","报表中心"],["admin-config","配置中心"]],
        focus:"处理资金阻塞、保证金覆盖和审批影响"
      },
      compliance:{
        summary:[["配置审批",prototype.releasePackages.filter(item=>item.status==="pending_approval").length,"跨切面发布包"],["敏感授权",prototype.dataGovernance.fieldAccessRequests.filter(item=>item.status==="pending_approval").length,"字段级授权"],["安全事件",prototype.dataGovernance.breachIncidents.filter(item=>item.status!=="notified").length,"Breach跟踪"],["今日超时",overdue.length,"合规SLA"]],
        priority:[...tasks.filter(row=>row.type==="配置审批"),...overdue],
        signals:[
          ...prototype.dataGovernance.fieldAccessRequests.filter(item=>item.status==="pending_approval").map(item=>({id:item.id,kind:"governance",title:`字段授权 ${item.field}`,detail:`${item.applicant} · ${item.purpose}`})),
          ...prototype.dataGovernance.breachIncidents.map(item=>({id:item.id,kind:"governance",title:item.name,detail:`${item.severity === "high" ? "高" : "中"}风险 · ${item.status}`}))
        ],
        links:[["admin-config","配置中心"],["admin-review","处理中心"],["admin-performance","报表中心"]],
        focus:"审批配置发布、字段授权和数据安全事件"
      },
      system_admin:{
        summary:[["集成失败",integrationTasks.length,"任务重试队列"],["异常系统",abnormalSystems.length,"CRM/支付/Outbox"],["事件缺口",prototype.integrationHealth.eventGaps.length,"关键与次级缺数"],["积压事件",abnormalSystems.reduce((sum,item)=>sum+item.backlog,0),"待补偿事件"]],
        priority:integrationTasks,
        signals:[
          ...abnormalSystems.map(item=>({id:item.id,kind:"integration",title:item.name,detail:`${item.backlog}积压 · 成功率${item.successRate}%`})),
          ...prototype.integrationHealth.eventGaps.map(item=>({id:item.id,kind:"governance",title:`${item.source} ${item.stage}`,detail:`缺口${item.gap}条 · ${item.idempotencyKey}`}))
        ],
        links:[["admin-review","处理中心"],["admin-config","配置中心"],["admin-performance","报表中心"]],
        focus:"恢复集成链路、补偿事件缺口和发布失败"
      },
      audit:{
        summary:[["今日审计",prototype.auditRecords.filter(item=>item.time.startsWith("2026-11-05")).length,"操作留痕"],["自审记录",prototype.auditRecords.filter(item=>item.self_review).length,"self_review"],["敏感导出",prototype.exportTasks.filter(item=>item.dataLevel==="sensitive").length,"授权导出"],["异常结果",prototype.auditRecords.filter(item=>["failed","blocked","rejected","reconcile_failed"].includes(item.result)).length,"需追溯"]],
        priority:[...tasks].sort((a,b)=>b.updated.localeCompare(a.updated)),
        signals:prototype.auditRecords.slice(0,4).map(item=>({id:item.trace_id,kind:"audit",title:`${item.action} · ${item.object}`,detail:`${item.operator} · ${item.time}`})),
        links:[["admin-performance","报表中心"],["admin-config","配置中心"],["admin-review","处理中心"]],
        focus:"追踪审批、导出、自审和异常操作记录"
      }
    };
    return profiles[state.role] || profiles.operations;
  }

  function cockpitViewProfile() {
    const view = activeCockpitView();
    const tasks = seedRows();
    const riskTasks = tasks.filter(row => row.type === "风险复核" || row.type === "D+N冻结" || row.type === "上限熔断");
    const fundTasks = tasks.filter(row => row.type === "D+N冻结" || row.type === "保证金抵扣");
    const activeQuarantine = prototype.riskCases.filter(item => item.quarantine.status === "active");
    const riskyObjects = tasks.filter(row => row.risk === "high");
    const views = {
      tasks:null,
      operation:{
        summary:[
          ["今日点击",compact(18421),"全渠道 · 环比 +6.4%"],
          ["有效FTD转化",compact(312),"环比 +3.1% · 质量服务达标"],
          ["今日计佣",money(48250),"USD · 环比 +2.8%"],
          ["净ROI趋势","118%","近7日 · 毛陷环比改善"]
        ],
        signals:prototype.reportPackets.find(item=>item.tab==="roi")?.dimensions.slice(0,4).map(item=>({id:item.id,kind:"report",title:`ROI ${item.label}`,detail:item.recommendation})) || [],
        focus:"经营视角：转化效率、佣金成本与净ROI健康度",
        hint:"点击、转化、计佣与净ROI趋势"
      },
      risk:{
        summary:[
          ["高风险对象",compact(riskyObjects.length),"R3档待结论"],
          ["活跃案件组",compact(prototype.riskCases.length),"统一隔离队列"],
          ["隔离佣金总额",money(activeQuarantine.reduce((sum,item)=>sum+item.quarantine.amount,0)),"只阻断结算不阻断计佣"],
          ["SLA超时数",compact(riskTasks.filter(row=>row.overdue).length),"调查SLA剩余优先"]
        ],
        signals:prototype.riskCases.map(item=>({id:item.id,kind:"risk",title:item.name,detail:item.features.slice(0,2).join(" / ")})),
        focus:"风险视角：案件组、隔离金额与调查SLA",
        hint:"识别事实与案件组处置入口"
      },
      funds:{
        summary:[
          ["今日Hold到期",money(32600),"D+N到期自动复核"],
          ["保证金覆盖率","142%","潜在损失口径 · 环比 +5pt"],
          ["提现失败笔数",compact(3),"支付通道重试队列"],
          ["冲正在途金额",money(8900),"账务重算跟踪"]
        ],
        signals:[
          ...prototype.reportPackets.find(item=>item.tab==="guarantee-coverage")?.dimensions.filter(item=>item.status!=="safe").map(item=>({id:item.id,kind:"report",title:`保证金覆盖 ${item.label}`,detail:`覆盖率${item.coverage}% · 潜在损失${money(item.potentialLoss)}`})) || [],
          ...fundTasks.filter(row=>row.status!=="closed").map(row=>({id:row.id,kind:"task",title:row.name,detail:`${row.type} · ${money(row.amount)}`}))
        ],
        focus:"资金视角：结算到期、保证金覆盖、提现异常与冲正风险",
        hint:"资金对象下钻与复核生成"
      }
    };
    return {view,profile:views[view]};
  }

  function cockpitPendingRows() {
    const tasks = seedRows();
    const view = activeCockpitView();
    const riskWeight = {high:3,medium:2,low:1};
    if (view === "operation") {
      const seen = new Set();
      return tasks.filter(row => {
        if (seen.has(row.id)) return false;
        seen.add(row.id); return true;
      }).sort((a,b) => (b.amount*(b.risk==="high"?1.5:1)*Number(b.overdue)) - (a.amount*(a.risk==="high"?1.5:1)*Number(a.overdue))).slice(0,8);
    }
    if (view === "risk") {
      return [...tasks.filter(row => row.type === "风险复核" || row.type === "D+N冻结" || row.type === "上限熔断")]
        .sort((a,b) => Number(b.overdue)-Number(a.overdue) || (riskWeight[b.risk]-riskWeight[a.risk]) || b.amount-a.amount).slice(0,8);
    }
    if (view === "funds") {
      return [...tasks.filter(row => row.type === "D+N冻结" || row.type === "保证金抵扣" || row.type === "集成失败" || row.status === "failed" || row.amount >= 5000)]
        .sort((a,b) => b.amount-a.amount || Number(b.overdue)-Number(a.overdue)).slice(0,8);
    }
    const mine = tasks.filter(row => row.ownerRole === state.role);
    const profile = roleWorkbenchProfile(tasks);
    const seen = new Set();
    return [...mine,...profile.priority].filter(row => {
      if (seen.has(row.id)) return false;
      seen.add(row.id); return true;
    }).sort((a,b) => Number(b.overdue)-Number(a.overdue) || b.amount-a.amount).slice(0,8);
  }

  function cockpitStatistics(rows) {
    const view = activeCockpitView();
    if (view === "operation") return [
      ["今日点击",compact(18421)],["注册转化","12.4%"],["FTD转化","4.2%"],["有效FTD","1.7%"],
      ["今日计佣",money(48250)],["毛陷支出",money(5100)],["净支出",money(43150)],["净ROI","118%"]
    ];
    if (view === "risk") return [
      ["风险对象",compact(rows.length)],["高风险",compact(rows.filter(row=>row.risk==="high").length)],
      ["案件组",compact(prototype.riskCases.length)],["隔离金额",money(prototype.riskCases.filter(item=>item.quarantine.status==="active").reduce((sum,item)=>sum+item.quarantine.amount,0))],
      ["SLA超时",compact(rows.filter(row=>row.overdue).length)],["误报改判",compact(6)],["平均处置","2.3天"],["损失回收",money(26800)]
    ];
    if (view === "funds") return [
      ["Hold在途",money(182400)],["今日到期",money(32600)],["保证金余额",money(960000)],
      ["覆盖率","142%"],["提现失败",compact(3)],["冲正在途",money(8900)],["对账差异",compact(2)],["待审批资金",money(76500)]
    ];
    return stats(rows);
  }

  function workbenchCockpit(rows) {
    if (state.routeId !== "admin-workbench") return "";
    const view = activeCockpitView();
    const viewProfile = cockpitViewProfile();
    const isTaskView = view === "tasks";
    const profile = roleWorkbenchProfile(seedRows());
    const summary = isTaskView ? profile.summary : viewProfile.profile.summary;
    const signals = isTaskView ? profile.signals.slice(0,4) : viewProfile.profile.signals.slice(0,4);
    const focus = isTaskView ? profile.focus : viewProfile.profile.focus;
    const viewSwitcher = `<div class="dev-cockpit-views" role="tablist" aria-label="驾驶舱视角">${cockpitViews.map(item =>
      `<button class="${view===item.id?"active":""}" data-cockpit-view="${h(item.id)}" role="tab" aria-selected="${view===item.id}" title="${h(item.hint)}">${h(item.title)}</button>`).join("")}</div>`;
    return `<section class="dev-cockpit" aria-label="角色仪表盘">
      <header class="dev-cockpit-head"><div><h2>${h(prototype.roles[state.role])}仪表盘 · ${h(cockpitViewTitles[view])}视角</h2><p>${h(focus)}</p></div>${viewSwitcher}<span>${h(prototype.dataSource.name)} · 更新于 ${h(prototype.dataSource.updatedAt)}</span></header>
      <div class="dev-cockpit-body">
        <div class="dev-cockpit-summary">${summary.map(([label,value,hint]) => `<article><span>${h(label)}</span><strong>${h(value)}</strong><small>${h(hint)}</small></article>`).join("")}</div>
        <aside class="dev-signal-panel">
          <header><h2>异常信号</h2><p>${isTaskView ? "按当前角色关注范围生成" : h(viewProfile.profile.hint)}</p></header>
          <div class="dev-signal-list">${signals.map(signal => `
            <button data-cockpit-kind="${h(signal.kind)}" data-cockpit-id="${h(signal.id)}"><span>${h(signal.title)}</span><strong>${h(signal.detail)}</strong><small>${h(signal.id)}</small></button>`).join("")}</div>
          <div class="dev-quick-links">${profile.links.map(([routeId,label]) => `<button data-route="${h(routeId)}">${h(label)}</button>`).join("")}</div>
        </aside>
      </div>
    </section>`;
  }

  function dashboardPendingTable() {
    if (state.routeId !== "admin-workbench") return "";
    const view = activeCockpitView();
    const sortHints = {tasks:"按超时优先和影响金额排序",operation:"按综合影响力排序",risk:"按SLA剩余、风险等级和隔离金额排序",funds:"按金额和紧急度排序"};
    const pending = cockpitPendingRows();
    return `<section class="dev-dashboard-pending" aria-label="待处理数据">
      <header><div><h2>待处理数据</h2><p>${h(sortHints[view] || sortHints.tasks)}</p></div><button class="tm-button secondary" data-queue="all">查看全部</button></header>
      <div class="tm-table-wrap dev-table-wrap dev-pending-table">
        <table>
          <thead><tr><th>任务</th><th>对象</th><th>状态</th><th>风险</th><th>SLA</th><th class="numeric">影响金额</th><th class="dev-action-col">操作</th></tr></thead>
          <tbody>${pending.map(row => `<tr>
            <td><strong>${h(row.name)}</strong><small>${h(row.type)} · ${h(row.id)}</small></td>
            <td>${h(row.linked)}</td>
            <td>${statusTag(row.status)}</td>
            <td>${statusTag(row.risk)}</td>
            <td>${h(row.due)}</td>
            <td class="numeric">${money(row.amount)}</td>
            <td class="dev-action-col"><button class="tm-button secondary" data-source-link="${h(row.id)}">处理</button></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </section>`;
  }

  function batchBar() {
    if (!state.selected.size) return "";
    const actions = allowedActions(routeActions[state.routeId]).filter(([id]) => ["claim","assign","approve","export"].includes(id));
    return `<section class="dev-batch-bar"><strong>已选择 ${state.selected.size} 项</strong>${actions.map(([id,action]) =>
      `<button class="tm-button ${id==="approve"?"primary":"secondary"}" data-action-name="${h(id)}">${h(state.routeId === "admin-modules" ? moduleActionLabel(id) : action.label)}</button>`).join("")}<button class="tm-button secondary" data-action="clear-selection">取消选择</button></section>`;
  }

  function releasePanel() {
    if (state.routeId !== "admin-config" || state.tabId !== "overview") return "";
    const packages = prototype.releasePackages;
    return `<section class="dev-release-panel">
      <header><div><h2>配置发布包</h2><p>组合差异、试算影响、审批、定时生效、失败恢复和回滚闭环。</p></div><span>${packages.length}个包</span></header>
      <div class="dev-release-list">${packages.map(item => `
        <article>
          <div><span>${h(item.id)} · ${h(item.version)}</span><strong>${h(item.name)}</strong><small>${item.domains.map(domain=>h(domain)).join(" / ")}</small></div>
          <div class="dev-release-metrics"><span>${statusTag(item.status)}</span><span>影响 ${money(item.impactAmount)}</span><span>生效 ${h(item.effectiveTime)}</span></div>
          <button class="tm-button secondary" data-release-open="${h(item.id)}">发布包详情</button>
        </article>`).join("")}</div>
    </section>`;
  }

  function configVersionItems() {
    return businessConfigMenuItems().flatMap(item => configSubgroupVersions(item));
  }

  function configOverviewItems() {
    return prototype.configSeeds.configItems || [];
  }

  function configItemVersions(item) {
    if (!item) return [];
    const menuItem = configMenuItemForOverview(item) || businessConfigMenuItem(item.id);
    return menuItem ? configSubgroupVersions(menuItem) : [];
  }

  function configItemCurrentVersion(item) {
    return configItemVersions(item).find(version => version.status === "active") || null;
  }

  const subgroupVersionCodes = {
    price:"pricing",
    qualification:"qualification",
    "quality-service":"quality-service",
    "credit-benefit":"credit-benefits",
    "partner-tier":"partner-tier",
    "country-entity":"country-entity",
    hold:"hold-base",
    "d-plus-n":"settlement-freeze",
    "guarantee-tax":"guarantee-tax",
    "settlement-withdrawal":"settlement-withdrawal",
    "cluster-rule":"cluster-rules",
    "hard-rule":"hard-rules",
    "risk-score":"risk-scoring",
    "violation-rule":"violation-rules",
    "risk-propagation":"risk-propagation",
    approval:"approval-workflow",
    simulation:"rule-simulation",
    "data-governance":"data-governance",
    "official-content":"official-content"
  };
  const subgroupVersionCache = new Map();

  function configVersionNow() {
    return new Date(window.AFF_ADMIN_CLOCK?.now?.() ?? Date.now()).getTime();
  }

  function configVersionTime(value = configVersionNow()) {
    const date = new Date(value + 8 * 60 * 60 * 1000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }

  function configScheduledTime(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return NaN;
    const [year,month,day,hour,minute,second] = match.slice(1).map(value => Number(value || 0));
    const local = new Date(Date.UTC(year,month-1,day,hour,minute,second));
    if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month-1 || local.getUTCDate() !== day ||
      local.getUTCHours() !== hour || local.getUTCMinutes() !== minute || local.getUTCSeconds() !== second) return NaN;
    return local.getTime() - 8 * 60 * 60 * 1000;
  }

  function activateConfigVersion(item, versions, effectiveAt, operator) {
    const time = configVersionTime(effectiveAt);
    versions.filter(version => version.id !== item.id && version.status === "active").forEach(version => {
      version.status = "inactive";
      version.effectiveTime = "-";
      version.updated = time;
      version.locked = true;
    });
    Object.assign(item,{
      status:"active",locked:true,lockTime:time,publishedAt:time,effectiveTime:time,
      scheduledEffectiveTime:"-",updated:time,lockReason:operator === "系统" ? "定时生效完成" : "立即生效完成"
    });
  }

  function reconcileConfigVersions(versions, now = configVersionNow()) {
    let changed = false;
    versions.filter(version => version.status === "scheduled").forEach(version => {
      const due = configScheduledTime(version.scheduledEffectiveTime);
      if (!Number.isFinite(due) || due > now) return;
      activateConfigVersion(version,versions,due,"系统");
      version.lastAction = {action:"scheduled_activate",reason:"到达计划生效时间",operator:"系统",time:version.updated};
      prototype.auditRecords.unshift({
        id:`audit-config-scheduled-${version.id}`,time:version.updated,action:"配置版本定时生效",
        object:version.version,operator:"系统",result:"active",trace_id:version.traceId,self_review:false
      });
      changed = true;
    });
    return changed;
  }

  function configRefreshScheduledVersions() {
    let changed = false;
    subgroupVersionCache.forEach(versions => {if (reconcileConfigVersions(versions)) changed = true;});
    return changed;
  }

  function configSnapshotSummary(snapshot) {
    if (!snapshot) return "暂无配置快照";
    if (snapshot.basePricing) {
      const price = snapshot.basePricing;
      return `L1–L4：${[price.l1,price.l2,price.l3,price.l4].join(" / ")} USD；FTD ${price.ftdRatio}，有效FTD ${price.validFtdRatio}；${snapshot.countries?.length || 0}个国家`;
    }
    const rows = snapshot.milestones || snapshot.settings || snapshot.rules || snapshot.finance || snapshot.levels || snapshot.steps || snapshot.rows || [];
    return rows.slice(0,3).map(row => [row.name || row.label || row.event || row.level || row.step || row.key || row.country || row.title, row.value ?? row.netDeposit ?? row.baseDays ?? row.condition ?? row.rule ?? row.action ?? row.entity ?? row.path].filter(value=>value!==undefined&&value!==null&&value!=="").join("：")).filter(Boolean).join("；") || "已保存配置快照";
  }

  function configSnapshotError(snapshot) {
    if (!snapshot) return "缺少配置快照，请先保存配置内容";
    if (snapshot.kind !== "price") return "";
    const price = snapshot.basePricing || {};
    if (["l1","l2","l3","l4"].some(key => price[key] === "" || !Number.isFinite(Number(price[key])) || Number(price[key]) < 0)) return "四档基础金额必须填写非负数";
    const ratio = value => /^\d+(?:\.\d+)?%?$/.test(String(value)) ? Number(String(value).replace("%","")) : NaN;
    const ftd = ratio(price.ftdRatio), validFtd = ratio(price.validFtdRatio);
    if (!Number.isFinite(ftd) || !Number.isFinite(validFtd) || ftd > 100 || validFtd > 100 || Math.abs(ftd + validFtd - 100) > 0.000001) return "FTD与有效FTD基础比例合计必须为100%";
    if ((snapshot.countries || []).some(country => country.coefficient === "" || !Number.isFinite(Number(country.coefficient)) || Number(country.coefficient) < 0)) return "国家系数必须填写非负数";
    return "";
  }

  function configMenuItemForOverview(item) {
    if (!item) return null;
    return businessConfigMenuItems().find(menuItem => menuItem.routeId === "admin-config" && menuItem.tabId === ({
      "item-pricing":"price", "item-qualification":"qualification", "item-quality":"quality-service",
      "item-credit":"credit-benefit", "item-partner-tier":"partner-tier", "item-country":"country-entity",
      "item-hold":"hold", "item-dn":"d-plus-n", "item-funds":"guarantee-tax",
      "item-settlement-withdrawal":"settlement-withdrawal", "item-cluster":"cluster-rule",
      "item-hard-rule":"hard-rule", "item-risk-score":"risk-score", "item-violation":"violation-rule",
      "item-risk-propagation":"risk-propagation", "item-data":"data-governance",
      "item-approval":"approval", "item-simulation":"simulation", "item-content":"official-content"
    }[item.id])) || null;
  }

  function businessConfigMenuItems() {
    return businessConfigMenuSections().flatMap(section => section.items);
  }

  function configMenuItemForVersion(version) {
    if (!version?.configItemId) return null;
    return businessConfigMenuItem(version.configItemId);
  }

  function configSubgroupCode(item) {
    return subgroupVersionCodes[item?.tabId] || String(item?.tabId || "config").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  }

  function subgroupVersionNumber(item, stamp, sequence = "01") {
    return `${configSubgroupCode(item)}-${stamp}-${sequence}`;
  }

  function configSubgroupSnapshot(item, variant = "active") {
    const tabId = item?.tabId;
    const common = {
      approval: CONFIG_VERSION_APPROVAL_ENABLED
        ? {required:true, approver:"对应业务负责人", reviewer:"风险/财务复核人", reviewCycle:"1个工作日", timeoutAction:"转人工任务并保留当前生效版本"}
        : {required:false, approver:"-", reviewer:"-", reviewCycle:"-", timeoutAction:"演示环境直接处理"},
      note: variant === "scheduled" ? "计划生效时间仅作为参考；版本完成生效后自动锁定。" : "生效后自动锁定，只能复制或创建回退草稿。",
      reference:"未确认生产数值统一标记为参考值，页面只用于开发联调和规则核对。"
    };
    if (tabId === "price") return {
      kind:"price", basePricing:{l1:300, l2:500, l3:800, l4:1200, ftdRatio:"50%", validFtdRatio:"50%", qualityServiceRatio:"20%", currency:"USD"},
      countries:[
        {country:"泰国",code:"TH",coefficient:1,formula:[300,500,800,1200],qualityEnabled:true,qualityRatio:"20%"},
        {country:"印度尼西亚",code:"ID",coefficient:0.9,formula:[270,450,720,1080],qualityEnabled:true,qualityRatio:"20%"},
        {country:"菲律宾",code:"PH",coefficient:0.85,formula:[255,425,680,1020],qualityEnabled:false,qualityRatio:"-"},
        {country:"马来西亚",code:"MY",coefficient:1.05,formula:[315,525,840,1260],qualityEnabled:true,qualityRatio:"15%"}
      ], ...common
    };
    if (tabId === "qualification") return {
      kind:"qualification", milestones:[
        {code:"FTD",name:"FTD",netDeposit:"≥ 100 USD（参考值）",activeDays:"不适用",lots:"不适用",expiry:"30自然日（参考值）"},
        {code:"有效FTD",name:"有效FTD",netDeposit:"≥ 300 USD（参考值）",activeDays:"≥ 5天（参考值）",lots:"≥ 1手（参考值）",expiry:"60自然日（参考值）"},
        {code:"质量服务",name:"质量服务",netDeposit:"≥ 500 USD（参考值）",activeDays:"≥ 10天（参考值）",lots:"≥ 3手（参考值）",expiry:"90自然日（参考值）",yieldRate:"≥ 0（参考值）"}
      ], ...common
    };
    if (tabId === "quality-service") return {
      kind:"quality", settings:[
        {id:"QS-01",label:"质量服务开关",value:"按国家单独开启",rule:"不占用FTD与有效FTD基础比例"},
        {id:"QS-02",label:"净入金额度",value:"≥ 500 USD（参考值）",rule:"达到后进入质量服务判断"},
        {id:"QS-03",label:"交易活跃天数",value:"≥ 10自然日（参考值）",rule:"周期内累计"},
        {id:"QS-04",label:"标准交易手数",value:"≥ 3手（参考值）",rule:"按CRM交易事实判断"},
        {id:"QS-05",label:"收益率",value:"≥ 0（参考值）",rule:"不低于配置收益率"},
        {id:"QS-06",label:"失效周期",value:"90自然日（参考值）",rule:"失效后只影响后续佣金"}
      ], ...common
    };
    if (tabId === "hold") return {
      kind:"rules", rules:[
        {id:"H-BASE",event:"基础结算中",value:"C0-C4基础天数（参考值）",action:"按信用等级读取基础天数"},
        {id:"H-COUNTRY",event:"国家附加",value:"按国家风险档配置（参考值）",action:"与其他附加天数相加"},
        {id:"H-ENTITY",event:"收款主体附加",value:"按国家+主体配置（参考值）",action:"匹配优先级高于国家默认"},
        {id:"H-PAYMENT",event:"支付方式附加",value:"按银行卡/电子钱包/加密支付配置（参考值）",action:"仅影响当前支付方式对应佣金"},
        {id:"H-D",event:"D1-D10风险事件",value:"每条规则独立配置（参考值）",action:"同类事件按次数限制累计"},
        {id:"H-R",event:"R0-R3风险档",value:"R0-R3附加天数（参考值）",action:"风险档变化不重置计时"},
        {id:"H-CLUSTER",event:"集群或案件关联",value:"命中后延长（参考值）",action:"不重置，累计计时且暂不设上限"}
      ], ...common
    };
    if (tabId === "d-plus-n") return {
      kind:"rules", rules:[
        {id:"D+N-01",event:"结算超时冻结阈值",value:"后台可配置（参考30自然日）",action:"冻结当前客户当前佣金/结算案件"},
        {id:"D+N-02",event:"自动放行",value:"开关可配置",action:"满足复核条件后自动放行"},
        {id:"D+N-03",event:"金额护栏",value:"按合作方/国家配置",action:"超过阈值转人工"},
        {id:"D+N-04",event:"数量护栏",value:"按自然日配置",action:"超过阈值生成风险事件"}
      ], ...common
    };
    if (tabId === "guarantee-tax") return {
      kind:"finance", finance:[
        {label:"保证金计提比例",value:"10%（参考值）",rule:"保证金 = 佣金总额 × 保证金比例"},
        {label:"保证金释放",value:"结算完成后90自然日（参考值）",rule:"每笔佣金独立释放，且无未解决风险事件"},
        {label:"税费计提比例",value:"10%（参考值）",rule:"税费 = 佣金总额 × 税费比例"},
        {label:"扣除顺序",value:"佣金总额 → 保证金 → 税费 → 结算净额",rule:"保证金和税费均按整体金额计算"},
        {label:"提现手续费",value:"按收款方式配置",rule:"提现前展示并校验"}
      ], ...common
    };
    if (tabId === "settlement-withdrawal") return {
      kind:"rules", rules:[
        {id:"SW-01",event:"结算资格",value:"注册用户佣金、有效FTD佣金、质量服务佣金分别判断",action:"按对应里程碑和失效周期进入结算"},
        {id:"SW-02",event:"首次提现校验",value:"KYC/KYB、受益所有人、收款账户和税务信息",action:"首次提现前必须完成"},
        {id:"SW-03",event:"提现审批",value:"默认必须审批",action:"审批通过后进入支付"},
        {id:"SW-04",event:"手续费",value:"按收款方式配置",action:"选择方式后展示并校验账户"},
        {id:"SW-05",event:"支付失败",value:"按失败原因重试或转人工",action:"保留账务和审计记录"}
      ], ...common
    };
    if (tabId === "risk-score") return {
      kind:"risk", rules:[
        {id:"R-01",event:"风险事件评分",value:"按事件权重累计",action:"计算风险分"},
        {id:"R-02",event:"R0-R3风险档",value:"R0无风险 / R1低 / R2中 / R3高",action:"映射处置动作"},
        {id:"R-03",event:"硬规则升级",value:"D1-D10命中",action:"直接升级或转人工"},
        {id:"R-04",event:"审批要求",value:"审批人 + 复核人",action:"记录双人审计"}
      ], ...common
    };
    if (["hard-rule","violation-rule","cluster-rule","risk-propagation"].includes(tabId)) return {
      kind:"risk", rules:[
        {id:`${tabId.toUpperCase()}-01`,event:"规则触发条件",value:"按事实事件和阈值判断",action:"记录证据"},
        {id:`${tabId.toUpperCase()}-02`,event:"命中后处置",value:"观察 / 暂扣 / 转人工",action:"写入案件或任务"},
        {id:`${tabId.toUpperCase()}-03`,event:"审批与复核",value:"审批人、复核人、审核周期",action:"超时转人工"}
      ], ...common
    };
    if (tabId === "partner-tier") return {
      kind:"matrix", rows:[
        {level:"C0",condition:"合作时间 < 90天或有效客户 < 5",benefit:"无个人附加",hold:"不减少基础结算中",status:"P1参考"},
        {level:"C1",condition:"合作时间 ≥ 90天且有效客户 ≥ 5",benefit:"个人附加 2%（参考值）",hold:"减少1天（参考值）",status:"P1参考"},
        {level:"C2",condition:"合作时间 ≥ 180天且有效客户 ≥ 20",benefit:"个人附加 5%（参考值）",hold:"减少3天（参考值）",status:"P1参考"},
        {level:"C3",condition:"合作时间 ≥ 365天且有效客户 ≥ 50",benefit:"个人附加 8%（参考值）",hold:"减少5天（参考值）",status:"P1参考"}
      ], ...common
    };
    if (tabId === "risk-propagation") return {
      kind:"rules", rules:[
        {id:"RP-01",event:"客户R2/R3风险确认",value:"同一合作者达到配置数量（参考值）",action:"生成合作者信用复核任务"},
        {id:"RP-02",event:"客户欺诈库命中",value:"CRM确认事实",action:"按传导规则增加结算中或保证金"},
        {id:"RP-03",event:"客户案件组确认",value:"集群或案件关联",action:"按规则影响合作者相关佣金"},
        {id:"RP-04",event:"传导边界",value:"不直接把R档写入C0-C4",action:"仅通过积分/权益规则传导"}
      ], ...common
    };
    if (tabId === "approval") return {
      kind:"approval", steps:[
        {step:"提交",owner:"申请人",rule:"校验必填和影响范围"},
        {step:"审批",owner:"配置审批人",rule:"可配置自动审核"},
        {step:"复核",owner:"复核人",rule:"高风险规则必须复核"},
        {step:"生效",owner:"系统",rule:"成功后自动锁定"}
      ], ...common
    };
    if (tabId === "credit-benefit") return {
      kind:"credit", levels:[
        {level:"C0",min:"0",max:"99",baseDays:"15天（参考值）",settlement:"限制自动结算",guarantee:"标准比例",quota:"参考值",recovery:"连续90天无新增负面事件"},
        {level:"C1",min:"100",max:"299",baseDays:"12天（参考值）",settlement:"可自动结算",guarantee:"标准比例",quota:"参考值",recovery:"积分回到区间"},
        {level:"C2",min:"300",max:"599",baseDays:"9天（参考值）",settlement:"可自动结算",guarantee:"按配置调整",quota:"参考值",recovery:"积分回到区间"},
        {level:"C3",min:"600",max:"899",baseDays:"6天（参考值）",settlement:"优先自动结算",guarantee:"按配置降低",quota:"参考值",recovery:"积分回到区间"},
        {level:"C4",min:"900",max:"∞",baseDays:"3天（参考值）",settlement:"优先自动结算",guarantee:"按配置降低",quota:"参考值",recovery:"积分回到区间"}
      ],
      points:[
        {event:"完成KYC/KYB",type:"加分",points:"+20（参考值）",window:"立即"},
        {event:"客户达到有效FTD",type:"加分",points:"+10（参考值）",window:"确认后"},
        {event:"客户达到质量服务",type:"加分",points:"+20（参考值）",window:"确认后"},
        {event:"客户拒付或欺诈确认",type:"扣分",points:"-80（参考值）",window:"确认后"},
        {event:"严重违规确认",type:"扣分",points:"-120（参考值）",window:"确认后"}
      ],
      cycle:"90自然日（可配置）",
      ...common
    };
    if (tabId === "country-entity") return {
      kind:"matrix", rows:[
        {country:"泰国",entity:"GTCFX TH",risk:"R1",currency:"USD",status:"开放"},
        {country:"印度尼西亚",entity:"GTCFX ID",risk:"R1",currency:"USD",status:"开放"},
        {country:"菲律宾",entity:"GTCFX PH",risk:"R2",currency:"USD",status:"开放"},
        {country:"受限国家",entity:"—",risk:"R3",currency:"—",status:"限制"}
      ], ...common
    };
    if (tabId === "official-content") return {
      kind:"content", rows:[
        {type:"官方路径",scope:"系统生成",status:"启用",review:"合规审核"},
        {type:"官方落地页",scope:"按国家/平台",status:"启用",review:"内容审核"},
        {type:"素材引用",scope:"跳转素材管理",status:"只读",review:"素材管理菜单审核"}
      ], ...common
    };
    if (tabId === "data-governance") return {
      kind:"mapping", rows:[
        {key:"邮箱/手机号",value:"默认脱敏",note:"明文需字段授权"},
        {key:"敏感数据保留",value:"按数据类型配置",note:"到期进入删除任务"},
        {key:"导出文件",value:"24小时过期",note:"下载写入审计"},
        {key:"Breach响应",value:"按SLA升级",note:"保留处置时间线"}
      ], ...common
    };
    if (tabId === "simulation") return {
      kind:"simulation", rows:[
        {key:"命中对象",value:"1,286个",note:"基于当前样本"},
        {key:"佣金影响",value:"+$36,900",note:"参考试算"},
        {key:"护栏结果",value:"通过",note:"未超过金额/数量阈值"}
      ], ...common
    };
    return {kind:"mapping", rows:[{key:"配置参数",value:"按字段字典维护",note:"生效后自动锁定"}], ...common};
  }

  function configSubgroupVersions(item) {
    if (!item) return [];
    if (subgroupVersionCache.has(item.id)) {
      const versions = subgroupVersionCache.get(item.id);
      reconcileConfigVersions(versions);
      return versions;
    }
    const code = configSubgroupCode(item);
    const snapshot = configSubgroupSnapshot(item, "active");
    const versions = [
      {
        id:`subcfg-${item.id}-active`, configItemId:item.id, version:subgroupVersionNumber(item,"20261105091000","01"),
        name:`${item.label}基线`, status:"active", locked:true, owner:item.owner || "业务负责人", createdBy:item.owner || "业务负责人",
        created:"2026-11-05 08:30", publishedAt:"2026-11-05 09:10", effectiveTime:"2026-11-05 09:10",
        scheduledEffectiveTime:"-", updated:"2026-11-05 09:10", previousVersion:subgroupVersionNumber(item,"20261020113000","01"),
        basedOn:subgroupVersionNumber(item,"20261020113000","01"), changeSummary:item.summary, impact:"参考试算已通过",
        traceId:`trace-subcfg-${code}-01`, parameters:"结构化配置快照", snapshot
      },
      {
        id:`subcfg-${item.id}-failed`, configItemId:item.id, version:subgroupVersionNumber(item,"20261108153000","02"),
        name:`${item.label}生效失败版本`, status:"activation_failed", locked:true, owner:"配置管理员", createdBy:"配置管理员",
        created:"2026-11-08 15:30", publishedAt:"2026-11-08 15:32", effectiveTime:"-",
        scheduledEffectiveTime:"-", updated:"2026-11-08 15:32", previousVersion:subgroupVersionNumber(item,"20261105091000","01"),
        basedOn:subgroupVersionNumber(item,"20261105091000","01"), changeSummary:"试算或外部依赖校验未通过，当前生效版本继续使用。",
        impact:"生效失败", traceId:`trace-subcfg-${code}-02`, parameters:"结构化配置快照", failureReason:"外部依赖校验未通过", snapshot:configSubgroupSnapshot(item, "failed")
      },
      {
        id:`subcfg-${item.id}-history`, configItemId:item.id, version:subgroupVersionNumber(item,"20261020113000","01"),
        name:`${item.label}历史版本`, status:"inactive", locked:true, owner:"历史配置", createdBy:"历史配置",
        created:"2026-10-20 11:30", publishedAt:"2026-10-20 12:00", effectiveTime:"-",
        scheduledEffectiveTime:"-", updated:"2026-11-05 09:10", previousVersion:"-", basedOn:"-",
        changeSummary:"已被新版本替代，保留用于审计和回退参考。", impact:"历史版本",
        traceId:`trace-subcfg-${code}-history`, parameters:"结构化配置快照", snapshot
      },
      {
        id:`subcfg-${item.id}-voided`, configItemId:item.id, version:subgroupVersionNumber(item,"20261018100000","01"),
        name:`${item.label}作废草稿`, status:"voided", locked:false, owner:"风控主管", createdBy:"风控主管",
        created:"2026-10-18 09:40", publishedAt:"-", effectiveTime:"-", scheduledEffectiveTime:"-", updated:"2026-10-18 10:00",
        previousVersion:"-", basedOn:"-", changeSummary:"校验未通过，版本已作废并保留审计记录。", impact:"未生效",
        traceId:`trace-subcfg-${code}-voided`, parameters:"结构化配置快照", snapshot
      }
    ];
    if(item.tabId!=="price"&&state.scenario!=="boundary"){
      const failedIndex=versions.findIndex(version=>version.status==="activation_failed");
      if(failedIndex>=0)versions.splice(failedIndex,1);
    }
    versions.forEach(version => {
      version.domains = [item.label];
      version.snapshot = JSON.parse(JSON.stringify(version.snapshot));
    });
    subgroupVersionCache.set(item.id, versions);
    return versions;
  }

  function configSubgroupVersionById(id) {
    for (const item of businessConfigMenuItems()) {
      const found = configSubgroupVersions(item).find(version => version.id === id);
      if (found) return found;
    }
    return null;
  }

  function configVersionById(id) {
    return configSubgroupVersionById(id);
  }

  function configVersionCollection(item) {
    const menuItem = configMenuItemForVersion(item);
    return menuItem ? configSubgroupVersions(menuItem) : configVersionItems();
  }

  function configSubgroupCurrentVersion(item) {
    const versions = configSubgroupVersions(item);
    return versions.find(version => version.status === "active") || versions[0] || null;
  }

  function nextSubgroupVersion(item) {
    const stamp = configVersionTime().replace(/\D/g,"");
    const used = new Set(configSubgroupVersions(item).map(version => version.version));
    let sequence = 1;
    let candidate = subgroupVersionNumber(item, stamp, String(sequence).padStart(2,"0"));
    while (used.has(candidate)) {
      sequence += 1;
      candidate = subgroupVersionNumber(item, stamp, String(sequence).padStart(2,"0"));
    }
    return candidate;
  }

  function filteredConfigVersions() {
    const keyword = state.configVersionSearch.trim().toLowerCase();
    return configVersionItems().filter(item => {
      if (state.configVersionStatus && item.status !== state.configVersionStatus) return false;
      if (!keyword) return true;
      return [item.id,item.version,item.name,item.owner,item.domains.join(" "),item.changeSummary].join(" ").toLowerCase().includes(keyword);
    });
  }

  function nextConfigVersion(source) {
    const sourceVersion = String(source?.version || "");
    if (/^\d{14}$/.test(sourceVersion) || !sourceVersion) {
      const now = new Date();
      const pad = value => String(value).padStart(2,"0");
      const generated = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const used = new Set(configVersionItems().map(item => item.version));
      if (!used.has(generated)) return generated;
      let cursor = new Date(now.getTime() + 1000);
      let candidate = generated;
      do {
        candidate = `${cursor.getFullYear()}${pad(cursor.getMonth()+1)}${pad(cursor.getDate())}${pad(cursor.getHours())}${pad(cursor.getMinutes())}${pad(cursor.getSeconds())}`;
        cursor = new Date(cursor.getTime() + 1000);
      } while (used.has(candidate));
      return candidate;
    }
    const match = sourceVersion.match(/^v(\d+)\.(\d+)$/);
    if (!match) return "20261108120000";
    return `v${match[1]}.${Number(match[2]) + 1}`;
  }

  function businessConfigMenuSections() {
    return Array.isArray(prototype.businessConfigMenuSections) ? prototype.businessConfigMenuSections : [];
  }

  function businessConfigMenuItem(id) {
    return (prototype.businessConfigMenuItems || []).find(item => item.id === id) || null;
  }

  function activeBusinessConfigSection() {
    if (state.tabId === "overview") return null;
    const sections = businessConfigMenuSections();
    return sections.find(section => section.items.some(item => item.routeId === state.routeId && item.tabId === state.tabId))
      || sections[0]
      || null;
  }

  function businessConfigItemForTab(tabId = state.tabId) {
    return businessConfigMenuSections()
      .flatMap(section => section.items)
      .find(item => item.routeId === "admin-config" && item.tabId === tabId)
      || null;
  }

  function businessConfigLocalMenu() {
    if (state.routeId !== "admin-config") return "";
    const sections = businessConfigMenuSections();
    return `<aside class="dev-config-local-menu" aria-label="业务配置菜单">
      <header>
        <div><span>配置中心</span><strong>业务配置</strong></div>
        <small>版本控制</small>
      </header>
      <p>按业务域进入具体配置页面，生效版本统一在配置总览和版本列表中管理。</p>
      <nav>
        <button type="button" class="dev-config-overview-link ${state.tabId === "overview" ? "active" : ""}" data-config-overview="1" title="查看所有业务配置当前生效版本">${menuIcon("config-overview")}<span>配置总览</span><i>首页</i></button>
        ${sections.map(section => {
          const active = section.id === activeBusinessConfigSection()?.id;
          return `<section>
            <button type="button" class="${active ? "active" : ""}" data-config-section="${h(section.id)}" title="打开${h(section.title)}配置">${menuIcon(section.items[0]?.id || section.id)}<span>${h(section.title)}</span><i>${section.items.length}项</i></button>
          </section>`;
        }).join("")}
      </nav>
    </aside>`;
  }

  function businessConfigSubnav() {
    if (state.routeId !== "admin-config" || state.tabId === "overview") return "";
    const section = activeBusinessConfigSection();
    if (!section) return "";
    return `<nav class="dev-config-subnav" aria-label="${h(section.title)}配置项">
      <span class="dev-config-subnav-label">${h(section.title)}</span>
      <div>${section.items.filter(item => item.tabId !== "overview").map(item => `<button type="button" class="${item.tabId === state.tabId ? "active" : ""}" data-config-subitem="${h(item.id)}" title="${h(item.summary)}">${h(item.label)}</button>`).join("")}</div>
    </nav>`;
  }

  function businessConfigDetailHead() {
    if (state.routeId !== "admin-config" || state.tabId === "overview") return "";
    const section = activeBusinessConfigSection();
    const item = businessConfigItemForTab();
    if (!item) return "";
    return `<header class="dev-config-detail-head">
      <div>
        <span class="dev-config-detail-eyebrow">${h(section?.title || "业务配置")} / 配置内容</span>
        <h2>${h(item.label)}</h2>
        <p>${h(item.summary)}</p>
      </div>
      <div class="dev-config-detail-actions">
        <button class="tm-button primary" data-config-version-new-for="${h(item.id)}">新建草稿</button>
      </div>
    </header>`;
  }

  function configSubgroupVersionStatus(version) {
    return statusTag(version?.status || "draft");
  }

  function configPriceContent(snapshot) {
    const pricing = snapshot.basePricing;
    return `<section class="dev-config-snapshot-section">
      <header><div><h3>四档公用基础价格</h3><p>国家金额 = 公用档位金额 × 国家系数；暂不支持国家自定义金额覆盖，质量服务比例独立于基础100%。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="dev-config-value-grid"><article><span>L1基础金额</span><strong>${money(pricing.l1)}</strong><small>${h(pricing.currency)} · 参考值</small></article><article><span>L2基础金额</span><strong>${money(pricing.l2)}</strong><small>${h(pricing.currency)} · 参考值</small></article><article><span>L3基础金额</span><strong>${money(pricing.l3)}</strong><small>${h(pricing.currency)} · 参考值</small></article><article><span>L4基础金额</span><strong>${money(pricing.l4)}</strong><small>${h(pricing.currency)} · 参考值</small></article></div>
      <div class="dev-config-rule-strip"><span>FTD基础比例：${h(pricing.ftdRatio)}</span><span>有效FTD基础比例：${h(pricing.validFtdRatio)}</span><span>质量服务附加比例：${h(pricing.qualityServiceRatio)}（不占基础100%）</span></div>
      <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>国家</th><th>国家系数</th><th>L1公式值</th><th>L2公式值</th><th>L3公式值</th><th>L4公式值</th><th>质量服务</th><th>计算方式</th></tr></thead><tbody>${snapshot.countries.map(row => `<tr><td><strong>${h(row.country)}</strong><small>${h(row.code)}</small></td><td>${h(row.coefficient)}</td>${["l1","l2","l3","l4"].map(level => `<td>${money(Number(pricing[level]) * Number(row.coefficient))}</td>`).join("")}<td>${row.qualityEnabled ? `已开启 · ${h(row.qualityRatio)}` : "未开启"}</td><td>公用金额 × 国家系数</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  function configQualificationContent(snapshot) {
    return `<section class="dev-config-snapshot-section"><header><div><h3>资格阶段字段</h3><p>阶段条件均来自CRM事实；失效后只影响后续佣金，不回写历史记录。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>阶段</th><th>名称</th><th>净入金额度</th><th>活跃天数</th><th>标准交易手数</th><th>失效周期</th><th>收益率</th></tr></thead><tbody>${snapshot.milestones.map(row => `<tr><td><strong>${h(row.code)}</strong></td><td>${h(row.name)}</td><td>${h(row.netDeposit)}</td><td>${h(row.activeDays)}</td><td>${h(row.lots)}</td><td>${h(row.expiry)}</td><td>${h(row.yieldRate || "不适用")}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  function configQualityContent(snapshot) {
    return `<section class="dev-config-snapshot-section"><header><div><h3>质量服务规则字段</h3><p>每个国家可独立开启质量服务，并单独设置比例；比例不占用FTD与有效FTD的基础100%。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>设置项</th><th>当前值</th><th>规则说明</th></tr></thead><tbody>${snapshot.settings.map(row => `<tr><td><strong>${h(row.label)}</strong><small>${h(row.id)}</small></td><td>${h(row.value)}</td><td>${h(row.rule)}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  function configCreditContent(snapshot) {
    return `<section class="dev-config-snapshot-section"><header><div><h3>C0-C4信用等级与积分规则</h3><p>90天为可配置周期；周期内累计积分自动升档，周期结束重新计算最近90天积分并生成快照。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="dev-config-rule-strip"><span>信用周期：${h(snapshot.cycle)}</span><span>R0-R3为独立即时风险档，不写入信用等级</span></div>
      <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>等级</th><th>积分下限</th><th>积分上限</th><th>基础结算中</th><th>结算资格</th><th>保证金调整</th><th>额度</th><th>恢复条件</th></tr></thead><tbody>${snapshot.levels.map(row => `<tr><td><strong>${h(row.level)}</strong></td><td>${h(row.min)}</td><td>${h(row.max)}</td><td>${h(row.baseDays)}</td><td>${h(row.settlement)}</td><td>${h(row.guarantee)}</td><td>${h(row.quota)}</td><td>${h(row.recovery)}</td></tr>`).join("")}</tbody></table></div>
      <h4 class="dev-config-subheading">积分行为</h4><div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>行为</th><th>加分/扣分</th><th>分值</th><th>生效时间</th></tr></thead><tbody>${snapshot.points.map(row => `<tr><td>${h(row.event)}</td><td>${h(row.type)}</td><td>${h(row.points)}</td><td>${h(row.window)}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  function configRulesContent(snapshot) {
    return `<section class="dev-config-snapshot-section"><header><div><h3>规则与处置</h3><p>每条规则展示触发事实、配置值和命中后的系统动作。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>规则编号</th><th>触发事件</th><th>配置值</th><th>处理方式</th></tr></thead><tbody>${(snapshot.rules || []).map(row => `<tr><td><strong>${h(row.id)}</strong></td><td>${h(row.event)}</td><td>${h(row.value)}</td><td>${h(row.action)}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  function configEditInput(path, label, value, type = "text", options = {}) {
    const inputType = type === "number" ? "number" : type === "checkbox" ? "checkbox" : "text";
    const checked = type === "checkbox" && value ? " checked" : "";
    const displayValue = type === "checkbox" ? "" : h(value ?? "");
    const suffix = options.suffix ? `<small class="dev-config-edit-suffix">${h(options.suffix)}</small>` : "";
    return `<label class="dev-config-edit-field${options.full ? " full" : ""}"><span>${h(label)}</span><input data-config-edit="${h(path)}" data-config-edit-type="${inputType}" type="${inputType}" value="${displayValue}"${checked}${options.min !== undefined ? ` min="${options.min}"` : ""}${options.step ? ` step="${options.step}"` : ""}>${suffix}</label>`;
  }

  function configEditableContent(item, version, snapshot) {
    const field = (path, label, value, type = "text", options = {}) => configEditInput(path, label, value, type, options);
    let content = "";
    if (snapshot.kind === "price") {
      const pricing = snapshot.basePricing || {};
      content = `<section class="dev-config-snapshot-section"><header><div><h3>四档公用基础价格</h3><p>直接编辑公用档位和国家系数；国家金额按公用金额乘国家系数计算。</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="dev-config-edit-grid">${[
          ["basePricing.l1","L1基础金额",pricing.l1],["basePricing.l2","L2基础金额",pricing.l2],["basePricing.l3","L3基础金额",pricing.l3],["basePricing.l4","L4基础金额",pricing.l4],
          ["basePricing.ftdRatio","FTD基础比例",pricing.ftdRatio],["basePricing.validFtdRatio","有效FTD基础比例",pricing.validFtdRatio],["basePricing.qualityServiceRatio","质量服务附加比例",pricing.qualityServiceRatio]
        ].map(([path,label,value]) => field(path,label,value,/\.l[1-4]$/.test(path) ? "number" : "text",/\.l[1-4]$/.test(path) ? {min:0,step:"0.01"} : {})).join("")}</div>
        <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>国家</th><th>国家系数</th><th>质量服务开关</th><th>质量服务比例</th></tr></thead><tbody>${(snapshot.countries || []).map((row,index) => `<tr><td><strong>${h(row.country)}</strong><small>${h(row.code)}</small></td><td>${field(`countries.${index}.coefficient`,"国家系数",row.coefficient,"number",{step:"0.01"})}</td><td>${field(`countries.${index}.qualityEnabled`,"质量服务",row.qualityEnabled,"checkbox")}</td><td>${field(`countries.${index}.qualityRatio`,"质量服务比例",row.qualityRatio)}</td></tr>`).join("")}</tbody></table></div>
      </section>`;
    } else if (snapshot.kind === "qualification") {
      content = `<section class="dev-config-snapshot-section"><header><div><h3>资格阶段字段</h3><p>直接修改FTD、有效FTD和质量服务的达标条件与失效周期。</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>阶段</th><th>名称</th><th>净入金额度</th><th>活跃天数</th><th>标准交易手数</th><th>失效周期</th><th>收益率</th></tr></thead><tbody>${(snapshot.milestones || []).map((row,index) => `<tr><td><strong>${h(row.code)}</strong></td><td>${field(`milestones.${index}.name`,"名称",row.name)}</td><td>${field(`milestones.${index}.netDeposit`,"净入金额度",row.netDeposit)}</td><td>${field(`milestones.${index}.activeDays`,"活跃天数",row.activeDays)}</td><td>${field(`milestones.${index}.lots`,"标准交易手数",row.lots)}</td><td>${field(`milestones.${index}.expiry`,"失效周期",row.expiry)}</td><td>${field(`milestones.${index}.yieldRate`,"收益率",row.yieldRate || "不适用")}</td></tr>`).join("")}</tbody></table></div>
      </section>`;
    } else if (snapshot.kind === "quality") {
      content = `<section class="dev-config-snapshot-section"><header><div><h3>质量服务规则字段</h3><p>直接编辑质量服务开关、门槛和失效周期。</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="dev-config-edit-list">${(snapshot.settings || []).map((row,index) => `<div class="dev-config-edit-row"><div><strong>${h(row.label)}</strong><small>${h(row.id)} · ${h(row.rule)}</small></div>${field(`settings.${index}.value`,"当前值",row.value)}</div>`).join("")}</div>
      </section>`;
    } else if (snapshot.kind === "credit") {
      content = `<section class="dev-config-snapshot-section"><header><div><h3>C0-C4信用等级与积分规则</h3><p>积分规则支持加分和扣分；修改后保存为当前草稿快照。</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="dev-config-edit-grid">${field("cycle","积分周期",snapshot.cycle)}</div>
        <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>等级</th><th>积分下限</th><th>积分上限</th><th>基础结算中</th><th>结算资格</th><th>保证金调整</th><th>额度</th><th>恢复条件</th></tr></thead><tbody>${(snapshot.levels || []).map((row,index) => `<tr><td><strong>${h(row.level)}</strong></td><td>${field(`levels.${index}.min`,"积分下限",row.min)}</td><td>${field(`levels.${index}.max`,"积分上限",row.max)}</td><td>${field(`levels.${index}.baseDays`,"基础结算中",row.baseDays)}</td><td>${field(`levels.${index}.settlement`,"结算资格",row.settlement)}</td><td>${field(`levels.${index}.guarantee`,"保证金调整",row.guarantee)}</td><td>${field(`levels.${index}.quota`,"额度",row.quota)}</td><td>${field(`levels.${index}.recovery`,"恢复条件",row.recovery)}</td></tr>`).join("")}</tbody></table></div>
        <h4 class="dev-config-subheading">积分行为</h4><div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>行为</th><th>加分/扣分</th><th>分值</th><th>生效时间</th></tr></thead><tbody>${(snapshot.points || []).map((row,index) => `<tr><td>${field(`points.${index}.event`,"行为",row.event)}</td><td>${field(`points.${index}.type`,"加分/扣分",row.type)}</td><td>${field(`points.${index}.points`,"分值",row.points)}</td><td>${field(`points.${index}.window`,"生效时间",row.window)}</td></tr>`).join("")}</tbody></table></div>
      </section>`;
    } else if (snapshot.kind === "finance") {
      content = `<section class="dev-config-snapshot-section"><header><div><h3>资金与扣除顺序</h3><p>保证金、税费、释放和抵扣顺序直接在草稿中调整。</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="dev-config-edit-list">${(snapshot.finance || []).map((row,index) => `<div class="dev-config-edit-row"><div><strong>${h(row.label)}</strong><small>${h(row.rule)}</small></div>${field(`finance.${index}.value`,"当前值",row.value)}</div>`).join("")}</div>
      </section>`;
    } else if (snapshot.kind === "rules" || snapshot.kind === "risk") {
      content = `<section class="dev-config-snapshot-section"><header><div><h3>规则与处置</h3><p>修改规则配置值和命中后的处理方式，保存到当前草稿。</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>规则编号</th><th>触发事件</th><th>配置值</th><th>处理方式</th></tr></thead><tbody>${(snapshot.rules || []).map((row,index) => `<tr><td><strong>${h(row.id)}</strong></td><td>${h(row.event)}</td><td>${field(`rules.${index}.value`,"配置值",row.value)}</td><td>${field(`rules.${index}.action`,"处理方式",row.action)}</td></tr>`).join("")}</tbody></table></div>
      </section>`;
    } else if (snapshot.kind === "approval") {
      content = `<section class="dev-config-snapshot-section"><header><div><h3>审批节点配置</h3><p>${demoSkipsApproval() ? "演示操作暂不经过审核；节点配置保留，当前流程不启用。" : "业务配置版本审核已关闭；这里仅维护其他业务流程的节点说明。"}</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>步骤</th><th>负责人</th><th>规则说明</th></tr></thead><tbody>${(snapshot.steps || []).map((row,index) => `<tr><td><strong>${h(row.step)}</strong></td><td>${field(`steps.${index}.owner`,"负责人",row.owner)}</td><td>${field(`steps.${index}.rule`,"规则说明",row.rule)}</td></tr>`).join("")}</tbody></table></div>
      </section>`;
    } else {
      const rows = snapshot.rows || snapshot.settings || snapshot.finance || [];
      const keys = rows.length ? Object.keys(rows[0]).filter(key => !["id","code"].includes(key)) : [];
      content = `<section class="dev-config-snapshot-section"><header><div><h3>配置映射表</h3><p>在草稿版本中直接修改映射字段，保存后保留原版本。</p></div><span class="dev-snapshot-lock">草稿可编辑</span></header>
        <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr>${keys.map(key => `<th>${h(key)}</th>`).join("")}</tr></thead><tbody>${rows.map((row,index) => `<tr>${keys.map(key => `<td>${field(`rows.${index}.${key}`,key,row[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      </section>`;
    }
    return content;
  }

  function configMatrixContent(snapshot) {
    const rows = snapshot.rows || [];
    const keys = rows.length ? Object.keys(rows[0]) : [];
    const labels = {level:"等级",code:"编号",name:"里程碑",threshold:"达标条件",condition:"升级条件",min:"积分下限",max:"积分上限",baseDays:"基础结算中",settlement:"结算资格",quota:"额度",recovery:"恢复条件",country:"国家",entity:"法律主体",risk:"风险档",currency:"币种",status:"状态",benefit:"权益",hold:"结算中",guarantee:"保证金",type:"内容类型",scope:"适用范围",review:"审核方式",key:"设置项",value:"当前值",note:"规则说明"};
    return `<section class="dev-config-snapshot-section"><header><div><h3>配置映射表</h3><p>结构化展示当前小分组的字段、取值和业务说明。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr>${keys.map(key => `<th>${h(labels[key] || key)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${keys.map(key => `<td>${h(row[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  function configFinanceContent(snapshot) {
    return `<section class="dev-config-snapshot-section"><header><div><h3>资金与扣除顺序</h3><p>保证金、税费和手续费分开展示，扣除顺序与释放条件清晰可查。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="tm-table-wrap dev-snapshot-table"><table><thead><tr><th>设置项</th><th>当前值</th><th>规则说明</th></tr></thead><tbody>${snapshot.finance.map(row => `<tr><td><strong>${h(row.label)}</strong></td><td>${h(row.value)}</td><td>${h(row.rule)}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  function configApprovalContent(snapshot) {
    return `<section class="dev-config-snapshot-section"><header><div><h3>审批与复核</h3><p>风控相关配置支持审批人、复核人、审核周期和超时处理方式。</p></div><span class="dev-snapshot-lock">只读快照</span></header>
      <div class="dev-flow-list">${snapshot.steps.map((row,index) => `<article><span class="dev-flow-index">${index + 1}</span><div><strong>${h(row.step)}</strong><small>负责人：${h(row.owner)}</small><p>${h(row.rule)}</p></div></article>`).join("")}</div>
    </section>`;
  }

  function configSubgroupContent(item, version) {
    const snapshot = version?.snapshot || configSubgroupSnapshot(item, "active");
    const editable = Boolean(version && !version.locked && version.status === "draft");
    let content = "";
    if (editable) content = configEditableContent(item, version, snapshot);
    else if (snapshot.kind === "price") content = configPriceContent(snapshot);
    else if (snapshot.kind === "qualification") content = configQualificationContent(snapshot);
    else if (snapshot.kind === "quality") content = configQualityContent(snapshot);
    else if (snapshot.kind === "credit") content = configCreditContent(snapshot);
    else if (snapshot.kind === "rules" || snapshot.kind === "risk") content = configRulesContent(snapshot);
    else if (snapshot.kind === "finance") content = configFinanceContent(snapshot);
    else if (snapshot.kind === "approval") content = configApprovalContent(snapshot);
    else if (snapshot.kind === "milestones" || snapshot.kind === "matrix" || snapshot.kind === "mapping" || snapshot.kind === "content" || snapshot.kind === "simulation") content = configMatrixContent(snapshot);
    return `<section class="dev-config-snapshot-panel" aria-label="${h(item.label)}配置内容">
      <header class="dev-config-snapshot-head"><div><span>当前查看版本</span><strong>${h(version?.version || "-")}</strong><small>${h(version?.name || "")} · ${configSubgroupVersionStatus(version)}</small>${version?.failureReason ? `<em class="dev-config-failure-note">失败原因：${h(version.failureReason)}</em>` : ""}</div><div><span>配置状态</span><strong>${version?.locked ? "已锁定" : "可继续办理"}</strong><small>${h(snapshot.note || "生效成功后自动锁定")}</small></div></header>
      ${content}
      ${editable ? `<footer class="dev-config-edit-footer"><span>当前为未锁定草稿，修改后统一保存到此版本。</span><button class="tm-button primary" data-config-save="${h(version.id)}">保存配置</button></footer>` : ""}
      <section class="dev-config-approval-card"><div><strong>版本操作</strong><p>${CONFIG_VERSION_APPROVAL_ENABLED ? "配置内容不单独设置生效开关，是否生效完全由顶部版本列表控制；版本提交后进入审批和生效治理。" : demoSkipsApproval() ? "保存后可直接立即生效或设置定时生效。当前演示操作均不经过审核。" : "当前演示环境已关闭业务配置版本审核；保存后可直接执行立即生效或设置定时生效。风险、提现等其他业务审批流程不受影响。"}</p></div><div class="dev-config-approval-meta"><span>版本审核：${CONFIG_VERSION_APPROVAL_ENABLED ? "已开启" : "已关闭（演示）"}</span><span>审批人：${CONFIG_VERSION_APPROVAL_ENABLED ? h(snapshot.approval?.approver || "-") : "-"}</span><span>复核人：${CONFIG_VERSION_APPROVAL_ENABLED ? h(snapshot.approval?.reviewer || "-") : "-"}</span><span>SLA：${CONFIG_VERSION_APPROVAL_ENABLED ? h(snapshot.approval?.reviewCycle || "-") : "-"}</span></div></section>
    </section>`;
  }

  function configSubgroupVersionPanel(item) {
    const versions = configSubgroupVersions(item);
    const selectedId = state.configSubgroupVersionId && versions.some(row => row.id === state.configSubgroupVersionId)
      ? state.configSubgroupVersionId
      : configSubgroupCurrentVersion(item)?.id;
    const selected = versions.find(row => row.id === selectedId) || versions[0];
    if (selected && state.configSubgroupVersionId !== selected.id) state.configSubgroupVersionId = selected.id;
    return `<section class="dev-config-subgroup-panel" aria-label="${h(item.label)}独立版本">
      <header class="dev-config-subgroup-head"><div><span class="dev-config-detail-eyebrow">独立版本控制</span><h2>${h(item.label)} · 版本列表</h2><p>当前小分组单独维护版本；点击“查看”切换下方配置快照。</p></div><div class="dev-config-version-actions"><span class="dev-config-version-count">${versions.length}个版本</span><button class="tm-button secondary" data-config-version-copy-current="${h(item.id)}">复制当前</button></div></header>
      <div class="tm-table-wrap dev-config-subgroup-table"><table><thead><tr><th>版本号</th><th>状态</th><th>生效时间</th><th>定时生效时间</th><th>创建人/时间</th><th>最后修改</th><th>操作</th></tr></thead><tbody>${versions.map(version => `<tr class="${version.id === selected?.id ? "is-selected" : ""}"><td><button class="dev-link-button" data-config-subgroup-view="${h(version.id)}">${h(version.version)}</button><small>${h(version.name)}</small></td><td>${configSubgroupVersionStatus(version)}</td><td>${h(version.effectiveTime || "-")}</td><td>${h(version.scheduledEffectiveTime || "-")}</td><td>${h(version.createdBy || version.owner)}<small>${h(version.created || "-")}</small></td><td>${h(version.updated || "-")}</td><td class="dev-action-col">${configVersionActionButtons(version)}</td></tr>`).join("")}</tbody></table></div>
      ${configSubgroupContent(item, selected)}
    </section>`;
  }

  function businessConfigWorkspace() {
    if (state.routeId !== "admin-config") return pageMainContent();
    return `<div class="dev-config-workspace">${businessConfigLocalMenu()}<div class="dev-config-workspace-content">${businessConfigSubnav()}${businessConfigDetailHead()}<div class="dev-config-content-center">${pageMainContent()}</div></div></div>`;
  }

  function configOverviewRows() {
    return configOverviewItems().map(item => {
      const versions = configItemVersions(item);
      const menuItem = configMenuItemForOverview(item);
      const section = businessConfigMenuSections().find(group => group.items.some(child => child.id === menuItem?.id));
      const current = versions.find(version => version.status === "active") || null;
      const scheduled = versions.find(version => version.status === "scheduled") || null;
      const failedVersions = versions.filter(version => version.status === "activation_failed");
      const latest = [...versions].sort((a,b) => String(b.updated).localeCompare(String(a.updated)))[0];
      const status = scheduled ? "scheduled"
        : current ? "active"
        : failedVersions.length ? "activation_failed"
        : "draft";
      return {
        ...item,
        configItem: item,
        displayName: String(item.name || "").replace(/Hold/g, "结算中"),
        sectionTitle: section?.title || item.category || "-",
        current,
        scheduled,
        failedVersions,
        pendingVersions:versions.filter(version => ["draft","scheduled"].includes(version.status)),
        status,
        parameterSummary: configSnapshotSummary(current?.snapshot).replace(/Hold/g, "结算中"),
        effectiveTime: current?.effectiveTime || "-",
        scheduledEffectiveTime: scheduled?.scheduledEffectiveTime || "-",
        owner:latest?.lastAction?.operator || latest?.owner || item.owner,
        lastModified: latest?.updated || "-"
      };
    });
  }

  function configOverviewPanel() {
    if (state.routeId !== "admin-config" || state.tabId !== "overview") return "";
    const allRows = configOverviewRows();
    const keyword = state.configOverviewSearch.trim().toLowerCase();
    const rows = allRows.filter(row => {
      const text = `${row.displayName} ${row.category} ${row.current?.version || ""} ${row.owner || ""}`.toLowerCase();
      const keywordMatched = !keyword || text.includes(keyword);
      const groupMatched = !state.configOverviewGroup || row.category === state.configOverviewGroup;
      const statusMatched = !state.configOverviewStatus || row.status === state.configOverviewStatus ||
        (state.configOverviewStatus === "activation_failed" && row.failedVersions.length > 0);
      return keywordMatched && groupMatched && statusMatched;
    });
    const activeCount = allRows.filter(row => row.current).length;
    const pendingCount = allRows.reduce((sum,row) => sum + row.pendingVersions.length,0);
    const failedCount = allRows.reduce((sum,row) => sum + row.failedVersions.length,0);
    const changedThisMonth = allRows.filter(row => String(row.lastModified).startsWith(configVersionTime().slice(0,7))).length;
    const groups = [...new Set(allRows.map(row => row.category).filter(Boolean))];
    const statusOptions = [...new Set([...allRows.map(row => row.status),...(failedCount ? ["activation_failed"] : [])])];
    const filterSelect = (key,value,options,label,empty,quick=false) => `<label>${h(label)}<select ${quick ? `data-config-overview-${key}` : `data-config-overview-draft="${key}"`}><option value="">${h(empty)}</option>${options.map(option => `<option value="${h(option)}" ${value===option?"selected":""}>${h(key==="status" ? statusLabel(option) : option)}</option>`).join("")}</select></label>`;
    const filterTags = [["search","关键词",state.configOverviewSearch],["group","业务分类",state.configOverviewGroup],["status","状态",state.configOverviewStatus]].filter(([, ,value]) => value);
    const draft = state.configOverviewDraft;
    return `<section class="dev-config-overview-panel" aria-label="业务配置总览">
      <header class="dev-config-overview-head">
        <div><span class="dev-config-detail-eyebrow">系统设置 / 业务配置</span><h2>配置总览</h2><p>先确认每个业务配置当前使用哪个版本，再进入对应配置小组处理草稿和生效。系统配置独立维护，不出现在这里。</p></div>
        <div class="dev-config-version-actions"><button class="tm-button secondary" data-config-system-open="1">查看系统配置</button></div>
      </header>
      <div class="dev-config-overview-stats" aria-label="配置统计">
        <article><span>当前生效配置</span><strong>${activeCount}</strong><small>每个业务配置项保留一个当前版本</small></article>
        <article><span>待处理版本</span><strong>${pendingCount}</strong><small>草稿或待生效</small></article>
        <article><span>生效失败</span><strong>${failedCount}</strong><small>原生效版本继续保持有效</small></article>
        <article><span>本月有变更</span><strong>${changedThisMonth}</strong><small>按最后修改时间统计</small></article>
      </div>
      <section class="admin-filter-shell" aria-label="配置筛选">
        <div class="admin-filter-quick">
          ${filterSelect("group",state.configOverviewGroup,groups,"业务分类","全部分类",true)}
          ${filterSelect("status",state.configOverviewStatus,statusOptions,"状态","全部状态",true)}
          <button type="button" class="tm-button secondary" data-config-overview-filter-toggle aria-expanded="${state.configOverviewFilterOpen}" aria-controls="config-overview-full-filter">${tqIcon("filter")} 筛选器</button>
        </div>
        ${filterTags.length ? `<div class="admin-filter-tags" aria-label="已应用筛选">${filterTags.map(([key,label,value]) => `<button type="button" class="dev-chip active" data-config-overview-filter-remove="${key}" aria-label="移除${label}筛选">${label}：${h(key==="status" ? statusLabel(value) : value)} ×</button>`).join("")}<button type="button" class="tm-button secondary compact" data-config-overview-filter-clear>清空筛选</button></div>` : ""}
        ${state.configOverviewFilterOpen ? `<div class="admin-filter-panel" id="config-overview-full-filter" aria-label="全部配置筛选条件"><div class="dev-config-overview-filter">
          <label>搜索配置<input type="search" placeholder="配置名称、版本号、责任角色" value="${h(draft.search)}" data-config-overview-search></label>
          ${filterSelect("group",draft.group,groups,"业务分类","全部分类")}
          ${filterSelect("status",draft.status,statusOptions,"状态","全部状态")}
        </div><div class="admin-filter-actions"><button type="button" class="tm-button secondary" data-config-overview-filter-close>关闭</button><button type="button" class="tm-button secondary" data-config-overview-reset>重置条件</button><button type="button" class="tm-button primary" data-config-overview-filter-apply>应用筛选</button></div></div>` : ""}
      </section>
      <div class="dev-config-scope-note"><strong>版本事实源</strong><span>当前版本、定时版本、参数摘要和最后修改信息来自同一配置项版本记录；生效版本自动锁定，只能复制或创建回退草稿。</span></div>
      <div class="tm-table-wrap dev-config-overview-table"><table><thead><tr><th>配置项</th><th>业务分类</th><th>当前使用版本</th><th>当前配置参数</th><th>定时生效版本</th><th>计划生效时间</th><th>状态</th><th>最后修改人/时间</th><th class="dev-action-col">操作</th></tr></thead><tbody>${rows.length ? rows.map(row => `<tr>
        <td><strong>${h(row.displayName)}</strong><small>${h(row.id)}</small></td>
        <td>${h(row.sectionTitle)}</td>
        <td>${row.current ? `<button class="dev-link-button" data-config-overview-version="${h(row.current.id)}" data-config-overview-version-item="${h(row.id)}">${h(row.current.version)}</button><small>${h(row.current.name)}</small>` : `<span class="dev-empty-value">未配置</span>`}</td>
        <td><span class="dev-config-param-summary">${h(row.parameterSummary)}</span></td>
        <td>${row.scheduled ? `<button class="dev-link-button" data-config-overview-version="${h(row.scheduled.id)}" data-config-overview-version-item="${h(row.id)}">${h(row.scheduled.version)}</button>` : "—"}</td>
        <td>${h(row.scheduledEffectiveTime)}</td>
        <td>${statusTag(row.status)}${row.failedVersions.length ? `<small>${row.failedVersions.length}个历史版本生效失败</small>` : ""}</td>
        <td>${h(row.owner || "-")}<small>${h(row.lastModified)}</small></td>
        <td class="dev-action-col"><div class="dev-config-overview-actions"><button class="tm-button secondary" data-config-overview-item="${h(row.id)}">查看</button><button class="tm-button secondary" data-config-overview-versions="${h(row.id)}">版本列表</button></div></td>
      </tr>`).join("") : `<tr><td colspan="9" class="tm-empty">没有符合条件的业务配置<br><small>请调整筛选条件或重置查询</small></td></tr>`}</tbody></table></div>
    </section>`;
  }

  function configOverviewVersionDrawer() {
    const version = configVersionById(state.configOverviewVersionId);
    const overviewItem = configOverviewItems().find(item => item.id === state.configOverviewVersionItemId);
    const item = overviewItem ? configMenuItemForOverview(overviewItem) : configMenuItemForVersion(version);
    if (!version || !item) return "";
    const readOnlyLabel = version.status === "scheduled" ? "待生效版本只读查看" : "已生效版本只读查看";
    return `<div class="tm-overlay" data-close-config-overview-version="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="业务配置版本只读详情">
      <header><div><strong>${h(item.label)}</strong><span>${h(version.version)} · ${readOnlyLabel}</span></div><button data-close-config-overview-version="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>版本信息</h3><div class="dev-impact-grid"><article><span>版本号</span><strong>${h(version.version)}</strong></article><article><span>状态</span><strong>${statusTag(version.status)}</strong></article><article><span>生效时间</span><strong>${h(version.effectiveTime)}</strong></article><article><span>最后修改</span><strong>${h(version.updated)}</strong></article></div></section>
        <section class="dev-drawer-section"><h3>配置快照</h3>${configSubgroupContent(item, version)}</section>
      </div>
      <footer><button class="tm-button secondary" data-close-config-overview-version="1">关闭</button></footer>
    </aside>`;
  }

  function configItemDrawer() {
    const item = configOverviewItems().find(row => row.id === state.configOverviewItem);
    if (!item) return "";
    const current = configItemCurrentVersion(item);
    const related = configItemVersions(item).slice(0,5);
    const menuItem = configMenuItemForOverview(item);
    return `<div class="tm-overlay" data-close-config-item="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="业务配置项详情">
      <header><div><strong>${h(String(item.name || "").replace(/Hold/g, "结算中"))}</strong><span>${h(item.category)} · ${h(item.id)}</span></div><button data-close-config-item="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>当前配置</h3><div class="dev-impact-grid"><article><span>当前使用版本</span><strong>${h(current?.version || "未配置")}</strong></article><article><span>状态</span><strong>${statusTag(current?.status || "draft")}</strong></article><article><span>定时生效版本</span><strong>${h(configItemVersions(item).find(version => version.status === "scheduled")?.version || "—")}</strong></article><article><span>最后修改</span><strong>${h(current?.updated || "-")}</strong></article></div><p class="dev-permission-scope">${h(configSnapshotSummary(current?.snapshot))}</p></section>
        <section class="dev-drawer-section"><h3>配置参数</h3>${current && menuItem ? configSubgroupContent(menuItem,current) : `<p class="dev-help">暂无生效配置</p>`}</section>
        <section class="dev-drawer-section"><h3>关联版本</h3><div class="dev-audit-list">${related.map(version => `<div><span>${h(version.version)} · ${h(version.updated)}</span><strong>${h(version.name)}</strong><small>${statusLabel(version.status)} · ${h(version.changeSummary)}</small></div>`).join("")}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-config-item="1">关闭</button><button class="tm-button secondary" data-config-item-versions="${h(item.id)}">进入配置小组</button></footer>
    </aside>`;
  }

  function configVersionActions(item) {
    const status = !CONFIG_VERSION_APPROVAL_ENABLED && item.status === "pending_approval" ? "draft" : item.status;
    const buttons = [["view","查看"]];
    if (status === "draft" && !item.locked) buttons.push(["edit","编辑"],["activate","立即生效"],["schedule","设置定时生效"],["void","作废"]);
    else if (["pending_validation","pending_simulation","pending_approval","scheduled"].includes(status)) buttons.push(["withdraw","撤回"]);
    else if (status === "activation_failed") buttons.push(["copy","复制重试"]);
    if (status === "active") buttons.push(["copy","复制"],["rollback","创建回退草稿"]);
    else if (["inactive","withdrawn","voided"].includes(status)) buttons.push(["copy","复制"]);
    else if (status === "draft") buttons.push(["copy","复制"]);
    return buttons;
  }

  function configVersionActionButtons(item, options = {}) {
    const isMenuOpen = state.configVersionMenuId === item.id;
    return `<div class="dev-config-row-actions ${options.footer ? "is-footer" : ""}">
      <button type="button" class="tm-button secondary dev-config-action-trigger" data-config-version-menu-toggle="${h(item.id)}" aria-expanded="${isMenuOpen}" aria-haspopup="menu">操作</button>
    </div>`;
  }

  function configVersionMenuPortal() {
    if (!state.configVersionMenuId || !state.configVersionMenuPosition) return "";
    const item = configVersionById(state.configVersionMenuId);
    if (!item) return "";
    const buttons = configVersionActions(item);
    const menu = buttons.map(([action,label]) => `<button type="button" class="${action === "void" ? "danger" : ""}" data-config-version-menu-action="${action}" data-config-version-id="${h(item.id)}">${label}</button>`).join("");
    const position = ` style="top:${state.configVersionMenuPosition.top}px;left:${state.configVersionMenuPosition.left}px"`;
    return `<div class="dev-config-action-menu" role="menu" aria-label="版本操作"${position}>${menu}</div>`;
  }

  function configVersionPanel() {
    if (state.routeId !== "admin-config" || state.tabId !== "overview") return "";
    const versions = filteredConfigVersions();
    const activeCount = configVersionItems().filter(item => item.status === "active").length;
    const pendingCount = configVersionItems().filter(item => ["draft","scheduled"].includes(item.status)).length;
    const failedCount = configVersionItems().filter(item => item.status === "activation_failed").length;
    const statusOptions = [...new Set(configVersionItems().map(item => item.status))];
    return `<section class="dev-config-version-panel" aria-label="配置版本列表">
      <header>
        <div><h2>配置版本</h2><p>先查看需要版本控制的全部配置版本，再进入内容编辑、复制和生效治理。</p></div>
        <div class="dev-config-version-actions">
          <button class="tm-button secondary" data-config-system-open="1">系统配置</button>
          <button class="tm-button primary" data-config-version-new="1">新建版本</button>
        </div>
      </header>
      <div class="dev-config-scope-note"><strong>版本控制范围</strong><span>价格、资格、信用、动态结算、保证金/税费、国家主体、审批流和风控规则必须通过版本变更。</span><button class="tm-button secondary" data-config-system-open="1">查看不纳入版本控制的配置</button></div>
      <div class="dev-config-version-metrics">
        <article><span>版本总数</span><strong>${configVersionItems().length}</strong><small>保留历史版本</small></article>
        <article><span>当前生效</span><strong>${activeCount}</strong><small>生产规则引用中</small></article>
        <article><span>待处理/待生效</span><strong>${pendingCount}</strong><small>可直接继续处理</small></article>
        <article><span>生效失败</span><strong>${failedCount}</strong><small>需恢复或回滚</small></article>
      </div>
      <div class="dev-config-version-toolbar">
        <input data-config-version-search value="${h(state.configVersionDraftSearch)}" placeholder="搜索版本号、配置名称、责任角色或域" aria-label="搜索配置版本">
        <select data-config-version-status aria-label="按版本状态筛选"><option value="">全部状态</option>${statusOptions.map(value => `<option value="${h(value)}" ${state.configVersionDraftStatus===value?"selected":""}>${h(statusLabel(value))}</option>`).join("")}</select>
        <button class="tm-button primary" data-config-version-query="1">查询</button>
        <button class="tm-button secondary" data-config-version-reset="1">重置</button>
        <span class="dev-config-version-count">显示 ${versions.length} / ${configVersionItems().length} 个版本</span>
      </div>
      <div class="tm-table-wrap dev-config-version-table">
        <table><thead><tr><th>版本号</th><th>版本名称</th><th>涉及配置域</th><th>状态</th><th>锁定</th><th>创建人/时间</th><th>发布时间</th><th>生效时间</th><th>通知类型</th><th>发布方式</th><th>基于版本</th><th class="dev-action-col">操作</th></tr></thead>
        <tbody>${versions.length ? versions.map(item => `<tr>
          <td><strong>${h(item.version)}</strong><small>${h(item.id)}</small></td>
          <td><strong>${h(item.name)}</strong><small>${h(item.changeSummary)}</small></td>
          <td><div class="dev-chip-row static">${item.domains.map(domain => `<span class="dev-chip">${h(domain)}</span>`).join("")}</div></td>
          <td>${statusTag(item.status)}</td>
          <td>${item.locked ? `<span class="dev-badge is-locked">已锁定</span><small>${h(item.lockTime || "")}</small>` : "未锁定"}</td>
          <td>${h(item.createdBy || item.owner)}<small>${h(item.created || item.updated)}</small></td>
          <td>${h(item.publishedAt || "-")}</td>
          <td>${h(item.effectiveTime)}</td>
          <td>${h(item.notificationType || "-")}</td>
          <td>${h(item.publishMode || "-")}</td>
          <td>${h(item.basedOn || item.previousVersion || "-")}</td>
          <td class="dev-action-col">${configVersionActionButtons(item)}</td>
        </tr>`).join("") : `<tr><td colspan="12" class="tm-empty">暂无匹配版本<br><small>请调整筛选条件或重置查询</small></td></tr>`}</tbody></table>
      </div>
    </section>`;
  }

  function configVersionDrawer() {
    const item = configVersionItems().find(row => row.id === state.configVersionId);
    if (!item) return "";
    const lockText = item.locked ? `已锁定 · ${item.lockTime || "生效后自动锁定"}` : "未锁定";
    return `<div class="tm-overlay" data-close-config-version="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="配置版本详情">
      <header><div><strong>${h(item.version)} · ${h(item.name)}</strong><span>${h(item.id)} · 上一版本 ${h(item.previousVersion)}</span></div><button data-close-config-version="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>版本状态</h3><div class="dev-impact-grid"><article><span>状态</span><strong>${statusTag(item.status)}</strong></article><article><span>锁定</span><strong>${h(lockText)}</strong></article><article><span>创建人/时间</span><strong>${h(item.createdBy || item.owner)}<small>${h(item.created || item.updated)}</small></strong></article><article><span>发布时间</span><strong>${h(item.publishedAt || "-")}</strong></article><article><span>生效时间</span><strong>${h(item.effectiveTime)}</strong></article><article><span>TraceId</span><strong>${h(item.traceId)}</strong></article></div></section>
        <section class="dev-drawer-section"><h3>涉及配置域</h3><div class="dev-chip-row static">${item.domains.map(domain => `<span class="dev-chip active">${h(domain)}</span>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>参数快照与差异</h3><div class="dev-object-grid"><article><span>当前值</span><strong>${h(item.parameters || "待加载")}</strong><small>来源版本：${h(item.basedOn || item.previousVersion || "-")}</small></article><article><span>草稿值</span><strong>${item.status === "draft" ? "可编辑" : "—"}</strong><small>锁定版本只能复制或创建回退草稿</small></article><article><span>差异</span><strong>${h(item.changeSummary)}</strong><small>影响：${h(item.impact)}</small></article><article><span>通知/发布</span><strong>${h(item.notificationType || "-")}</strong><small>${h(item.publishMode || "-")}</small></article></div></section>
        <section class="dev-drawer-section"><h3>版本操作规则</h3><div class="dev-check-list"><span>编辑只作用于未锁定草稿，不覆盖历史版本。</span><span>演示环境关闭业务配置版本审核；复制和回退会生成新的未锁定草稿，可直接生效或定时生效。</span><span>生效成功后自动锁定；生效失败保留原版本继续有效。</span></div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-config-version="1">关闭</button>${configVersionActionButtons(item,{footer:true})}</footer>
    </aside>`;
  }

  function setConfigEditPath(target, path, value) {
    const parts = String(path || "").split(".").filter(Boolean);
    if (!parts.length) return;
    let cursor = target;
    parts.forEach((part,index) => {
      const last = index === parts.length - 1;
      const key = /^\d+$/.test(part) ? Number(part) : part;
      if (last) {
        cursor[key] = value;
        return;
      }
      const nextPart = parts[index + 1];
      if (cursor[key] == null) cursor[key] = /^\d+$/.test(nextPart) ? [] : {};
      cursor = cursor[key];
    });
  }

  function saveConfigSubgroup(event) {
    const versionId = event?.target?.closest?.("[data-config-save]")?.dataset?.configSave || state.configSubgroupVersionId;
    const version = configSubgroupVersionById(versionId);
    if (!version) return showToast("配置版本不存在");
    if (version.locked || version.status !== "draft") return showToast("当前版本已锁定，只能复制为新草稿后修改");
    const inputs = [...document.querySelectorAll("[data-config-edit]")];
    if (inputs.some(input => typeof input.checkValidity === "function" && !input.checkValidity())) return showToast("请检查数值格式及允许范围");
    const snapshot = JSON.parse(JSON.stringify(version.snapshot || configSubgroupSnapshot(configMenuItemForVersion(version), "active")));
    inputs.forEach(input => {
      const type = input.dataset.configEditType;
      const value = type === "checkbox" ? input.checked : type === "number" ? Number(input.value) : input.value.trim();
      setConfigEditPath(snapshot, input.dataset.configEdit, value);
    });
    const error = configSnapshotError(snapshot);
    if (error) return showToast(error);
    version.snapshot = snapshot;
    version.parameters = configSnapshotSummary(snapshot);
    version.changeSummary = version.changeSummary || "演示环境草稿配置已更新";
    version.updated = configVersionTime();
    version.lastAction = {action:"save",operator:roleOwnerNames[state.role],time:version.updated};
    prototype.auditRecords.unshift({id:`audit-config-save-${version.id}-${configVersionNow()}`,time:version.updated,action:"保存配置草稿",object:version.version,operator:roleOwnerNames[state.role],result:"draft",trace_id:version.traceId,self_review:false});
    showToast(`${version.version}配置已保存（演示环境未进入审核）`);
    render();
  }

  function configScopedVersionDrawer() {
    const configItem = businessConfigMenuItem(state.configScopedItem);
    if (!configItem) return "";
    const versions = configSubgroupVersions(configItem);
    const section = activeBusinessConfigSection();
    return `<div class="tm-overlay" data-close-config-scoped="1"></div><aside class="tm-drawer dev-drawer-wide dev-config-scoped-drawer" aria-label="${h(configItem.label)}版本列表">
      <header>
        <div><strong>${h(configItem.label)} · 版本列表</strong><span>${h(section?.title || "业务配置")} · 仅显示当前小分组关联版本</span></div>
        <button data-close-config-scoped="1" aria-label="关闭">×</button>
      </header>
      <div>
        <section class="dev-drawer-section">
          <div class="dev-scoped-version-summary">
            <div><span>版本范围</span><strong>${versions.length}个版本</strong></div>
            <div><span>当前生效</span><strong>${h(versions.find(item => item.status === "active" && item.locked)?.version || "未配置")}</strong></div>
            <div><span>待生效</span><strong>${h(versions.find(item => item.status === "scheduled")?.version || "无")}</strong></div>
          </div>
        </section>
        <section class="dev-drawer-section">
          <div class="dev-scoped-version-toolbar">
            <strong>历史版本</strong>
            <button class="tm-button secondary" data-config-version-copy-current="${h(configItem.id)}">复制当前版本</button>
            <button class="tm-button primary" data-config-version-new-for="${h(configItem.id)}">新建草稿</button>
          </div>
          <div class="tm-table-wrap dev-config-scoped-table">
            <table><thead><tr><th>版本号</th><th>状态</th><th>锁定</th><th>创建人/时间</th><th>生效时间</th><th>变更摘要</th><th class="dev-action-col">操作</th></tr></thead>
            <tbody>${versions.length ? versions.map(item => `<tr>
              <td><strong>${h(item.version)}</strong><small>${h(item.name)}</small></td>
              <td>${statusTag(item.status)}</td>
              <td>${item.locked ? `<span class="dev-badge is-locked">已锁定</span>` : "未锁定"}</td>
              <td>${h(item.createdBy || item.owner)}<small>${h(item.created || item.updated)}</small></td>
              <td>${h(item.effectiveTime || "-")}</td>
              <td class="dev-config-summary">${h(item.changeSummary || "-")}</td>
              <td class="dev-action-col">${configVersionActionButtons(item)}</td>
            </tr>`).join("") : `<tr><td colspan="7" class="tm-empty">当前小分组暂无版本</td></tr>`}</tbody></table>
          </div>
        </section>
      </div>
      <footer><button class="tm-button secondary" data-close-config-scoped="1">关闭</button></footer>
    </aside>`;
  }

  function configVersionModal() {
    const info = state.configVersionModal;
    if (!info) return "";
    const source = configVersionById(info.id);
    const configItem = info.configItemId ? businessConfigMenuItem(info.configItemId) : configMenuItemForVersion(source);
    const modeLabel = info.mode === "copy" ? "复制配置版本" : info.mode === "rollback" ? "创建回退草稿" : info.mode === "edit" ? "编辑配置版本" : "新建配置版本";
    const values = {
      version: info.mode === "edit" ? source?.version : (configItem ? nextSubgroupVersion(configItem) : nextConfigVersion(source)),
      name: source?.name || configItem?.label || "",
      owner: source?.owner || roleOwnerNames[state.role],
      domains: source?.domains?.join("、") || configItem?.label || "",
      effectiveTime: source?.effectiveTime && source.effectiveTime !== "待审批" ? source.effectiveTime : "",
      status: "draft",
      changeSummary: source?.changeSummary || "",
      impact: source?.impact || "",
      parameters: source?.parameters || "",
      notificationType: info.mode === "edit" ? source?.notificationType : "一般",
      publishMode: info.mode === "edit" ? source?.publishMode : "待设置"
    };
    return `<div class="tm-overlay" data-close-config-version-modal="1"></div><section class="dev-modal dev-config-version-modal" role="dialog" aria-modal="true">
      <header><div><strong>${modeLabel}</strong><span>${source ? `${h(source.version)} · ${h(source.name)}` : "版本控制配置"}</span></div><button data-close-config-version-modal="1" aria-label="关闭">×</button></header>
      <div><section><h3>版本内容</h3><div class="dev-action-fields">
        <label><span>版本号（服务器生成）</span><input data-config-version-field="version" value="${h(values.version || nextConfigVersion(source))}" readonly></label>
        <label><span>版本名称</span><input data-config-version-field="name" value="${h(values.name)}"></label>
        <label><span>责任角色</span><input data-config-version-field="owner" value="${h(values.owner)}"></label>
        <label><span>配置域</span><input data-config-version-field="domains" value="${h(values.domains)}" placeholder="用顿号分隔"></label>
        <label><span>通知类型</span><select data-config-version-field="notificationType">${["重要","一般","不发送通知"].map(value => `<option value="${h(value)}" ${value===values.notificationType?"selected":""}>${h(value)}</option>`).join("")}</select></label>
        <label><span>发布方式</span><select data-config-version-field="publishMode">${["即时生效","定时生效","待设置"].map(value => `<option value="${h(value)}" ${value===values.publishMode?"selected":""}>${h(value)}</option>`).join("")}</select></label>
        <label><span>影响范围</span><input data-config-version-field="impact" value="${h(values.impact)}"></label>
        <label class="full"><span>配置参数摘要</span><textarea data-config-version-field="parameters" placeholder="填写本版本的参数摘要">${h(values.parameters)}</textarea></label>
        <label class="full"><span>变更摘要</span><textarea data-config-version-field="changeSummary">${h(values.changeSummary)}</textarea></label>
      </div></section><p class="dev-help">${CONFIG_VERSION_APPROVAL_ENABLED ? "编辑和复制都保留原版本；提交后进入版本列表，后续通过审批和发布治理生效。" : "编辑和复制都保留原版本；保存后进入版本列表，可直接立即生效或设置定时生效，当前演示环境不进入审核流程。"}</p></div>
      <footer><button class="tm-button secondary" data-close-config-version-modal="1">取消</button><button class="tm-button primary" data-submit-config-version="${h(info.mode)}">保存版本</button></footer>
    </section>`;
  }

  function systemConfigRawValue(item, value = item.pendingValue || item.value) {
    return item.inputType === "number" ? String(value).match(/\d+(?:\.\d+)?/)?.[0] || "" : value;
  }

  function systemConfigLimits(item) {
    const bounds = item.range?.match(/^(\d+)-(\d+)/);
    return bounds ? {min:Number(bounds[1]),max:Number(bounds[2])} : {};
  }

  function systemConfigSection(item) {
    const value = state.systemConfigDrafts[item.id] ?? systemConfigRawValue(item);
    const changed = value !== systemConfigRawValue(item);
    const fieldId = `system-config-${item.id}`;
    const attributes = `id="${h(fieldId)}" data-system-config-value="${h(item.id)}" aria-describedby="${h(fieldId)}-help"`;
    const limits = systemConfigLimits(item);
    const control = item.inputType === "switch"
      ? `<label class="dev-system-switch"><input ${attributes} type="checkbox" role="switch" ${value === "开启" ? "checked" : ""}><span class="dev-system-switch-track" aria-hidden="true"></span><span data-system-switch-label>${value === "开启" ? "开启" : "关闭"}</span></label>`
      : item.inputType === "select"
        ? `<select ${attributes}>${item.options.map(option => `<option value="${h(option)}" ${value === option ? "selected" : ""}>${h(option)}</option>`).join("")}</select>`
        : `<div class="dev-system-number"><input ${attributes} type="number" required step="1" ${limits.min === undefined ? "" : `min="${limits.min}" max="${limits.max}"`} value="${h(value)}"><span>${h(item.unit || "")}</span></div>`;
    return `<section class="dev-system-setting" aria-labelledby="${h(fieldId)}-title" data-system-config-section="${h(item.id)}">
      <span class="dev-system-setting-domain">${h(item.domain)}</span>
      <header><h3 id="${h(fieldId)}-title"><label for="${h(fieldId)}">${h(item.name)}</label></h3>${item.sensitive ? `<span class="dev-badge is-sensitive">需二次确认</span>` : ""}</header>
      <p class="dev-system-description">${h(item.description)}</p>
      <form data-system-config-form="${h(item.id)}">
        <div class="dev-system-control">${control}</div>
        <p id="${h(fieldId)}-help" class="dev-system-range">取值范围：${h(item.range)}</p>
        <div class="dev-system-values"><span>当前生效：<strong>${h(item.value)}</strong></span>${item.pendingValue ? `<span class="dev-pending-value">待发布：<strong>${h(item.pendingValue)}</strong></span>` : ""}</div>
        <div class="dev-system-setting-actions"><button type="submit" class="tm-button secondary" data-submit-system-config="${h(item.id)}" ${changed ? "" : "disabled"}>保存到变更集</button><button type="button" class="dev-link-button" data-system-config-reset="${h(item.id)}" ${changed ? "" : "disabled"}>重置修改</button></div>
      </form>
      <details class="dev-system-setting-details"><summary>配置说明</summary><dl><div><dt>参数键</dt><dd>${h(item.key)}</dd></div><div><dt>默认值</dt><dd>${h(item.defaultValue)}</dd></div><div><dt>影响说明</dt><dd>${h(item.impact)}</dd></div><div><dt>责任角色</dt><dd>${h(item.owner)}</dd></div><div><dt>最后更新</dt><dd>${h(item.updated)}</dd></div></dl></details>
    </section>`;
  }

  function systemConfigPanel() {
    if (state.routeId !== "admin-system-config" || state.tabId !== "system") return "";
    const rows = configRows("system");
    const pendingCount = rows.filter(row => row.pendingValue).length;
    const domains = [...new Set(rows.map(row => row.domain))];
    return `<section class="dev-system-config-panel" aria-label="系统配置">
      <header><div><h1>系统配置</h1><p>修改配置后保存到变更集，确认发布后生效。</p></div><div class="dev-config-version-actions"><button class="tm-button secondary" data-config-version-open-page="1">返回业务配置</button><button class="tm-button secondary" data-system-config-history="1">变更记录</button><button class="tm-button primary" data-system-config-publish="1" ${pendingCount ? "" : "disabled"}>发布变更${pendingCount ? `（${pendingCount}）` : ""}</button></div></header>
      <div class="dev-config-scope-note"><strong>系统管理范围</strong><span>导出文件过期时间、归属查询次数及归属查询过期时间。</span></div>
      <div class="dev-system-settings-grid">${domains.flatMap(domain => rows.filter(row => row.domain === domain)).map(systemConfigSection).join("")}</div>
      ${pendingCount ? `<div class="dev-config-pending-note"><strong>待发布变更集 ${pendingCount} 项</strong><span>发布前会校验范围、敏感项和组合参数；发布失败时保留原值。</span></div>` : ""}
    </section>`;
  }

  function systemConfigConfirmModal() {
    const info = state.systemConfigConfirm;
    if (!info) return "";
    const item = prototype.configSeeds.system.find(row => row.id === info.id);
    if (!item) return "";
    return `<div class="tm-overlay" data-close-system-config-confirm="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>确认敏感系统配置</strong><span>${h(item.name)} · ${h(item.key)}</span></div><button data-close-system-config-confirm="1" aria-label="关闭">×</button></header>
      <div><div class="dev-alert"><strong>这项配置会影响系统运行或敏感信息展示。</strong><br>请确认修改原因；发布时仍会保留原值、待发布值和审计记录。</div><div class="dev-action-fields"><label class="full"><span>变更原因（至少10个字）</span><textarea id="system-config-confirm-reason" placeholder="请填写本次敏感配置变更的业务原因"></textarea></label></div></div>
      <footer><button class="tm-button secondary" data-close-system-config-confirm="1">取消</button><button class="tm-button primary" data-submit-system-config-confirm="1">确认保存</button></footer>
    </section>`;
  }

  function systemConfigPublishConfirmModal() {
    if (!state.systemConfigPublishConfirm) return "";
    const pending = prototype.configSeeds.system.filter(item => item.pendingValue);
    return `<div class="tm-overlay" data-close-system-config-publish-confirm="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>发布系统配置变更</strong><span>${pending.length}项待发布 · 即时生效</span></div><button data-close-system-config-publish-confirm="1" aria-label="关闭">×</button></header>
      <div><div class="dev-alert">发布后当前值会替换为待发布值；业务规则、佣金、结算、风控和权限参数不在此页面发布。</div><ul class="dev-system-publish-diff">${pending.map(item => `<li><strong>${h(item.name)}</strong><span>${h(item.value)} → ${h(item.pendingValue)}</span></li>`).join("")}</ul><div class="dev-action-fields"><label class="full"><span>发布原因（至少10个字）</span><textarea id="system-config-publish-reason" placeholder="请填写本次系统配置发布原因"></textarea></label></div></div>
      <footer><button class="tm-button secondary" data-close-system-config-publish-confirm="1">取消</button><button class="tm-button primary" data-submit-system-config-publish-confirm="1">确认发布</button></footer>
    </section>`;
  }

  function configActionModal() {
    const info = state.configActionModal;
    if (!info) return "";
    const item = configVersionById(info.id);
    if (!item) return "";
    const labels = {withdraw:"撤回版本",void:"作废版本",activate:"立即生效",schedule:"设置定时生效"};
    const action = info.action;
    return `<div class="tm-overlay" data-close-config-action="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>${labels[action] || "配置版本操作"}</strong><span>${h(item.version)} · ${h(item.name)}</span></div><button data-close-config-action="1" aria-label="关闭">×</button></header>
      <div><section><h3>操作确认</h3><p class="dev-help">${action === "activate" ? "立即生效后替换当前版本并自动锁定；当前业务配置版本不进入审核流程。" : action === "schedule" ? "到达计划时间后自动替换当前版本，执行前保留当前生效版本。" : "该操作不会删除历史记录，必须填写原因并写入配置审计。"}</p><div class="dev-action-fields">${action === "schedule" ? `<label class="full"><span>计划生效时间（UTC+08:00）</span><input type="datetime-local" step="1" id="config-action-effective-time" min="${configVersionTime().replace(" ","T")}" value="${configVersionTime(configVersionNow()+60*60*1000).replace(" ","T")}"></label>` : ""}<label class="full"><span>操作原因</span><textarea id="config-action-reason" placeholder="请输入原因（至少10个字）"></textarea></label></div></section></div>
      <footer><button class="tm-button secondary" data-close-config-action="1">取消</button><button class="tm-button primary" data-submit-config-action="${h(action)}">确认${labels[action] || "操作"}</button></footer>
    </section>`;
  }

  function submitConfigVersion() {
    const info = state.configVersionModal;
    if (!info) return;
    const values = Object.fromEntries([...document.querySelectorAll("[data-config-version-field]")].map(input => [input.dataset.configVersionField,input.value.trim()]));
    if (!values.version || !values.name || !values.domains || !values.changeSummary || !values.notificationType || !values.publishMode) return showToast("版本号、名称、配置域、通知类型、发布方式和变更摘要必填");
    const domains = values.domains.split(/[、,，]/).map(value => value.trim()).filter(Boolean);
    const sourceItem = info.id ? configVersionById(info.id) : null;
    if (info.id && !sourceItem) return showToast("版本不存在");
    const sourceConfigItem = configMenuItemForVersion(sourceItem);
    const targetConfigItem = info.configItemId ? businessConfigMenuItem(info.configItemId) : sourceConfigItem;
    if (!targetConfigItem) return showToast("请先进入具体配置小组创建版本");
    const targetVersions = configSubgroupVersions(targetConfigItem);
    if (info.mode === "edit" && sourceItem) {
      if (sourceItem.locked || sourceItem.status !== "draft") return showToast("版本已锁定或不是草稿，请复制为新版本后修改");
      Object.assign(sourceItem,{
        name:values.name,owner:values.owner,domains,effectiveTime:"-",
        notificationType:values.notificationType,publishMode:values.publishMode,
        changeSummary:values.changeSummary,impact:values.impact || "待试算",
        parameters:values.parameters || "待填写",updated:configVersionTime()
      });
      showToast(`${sourceItem.version}已更新草稿`);
      state.configVersionModal = null;
      state.configVersionId = null;
      render();
      return;
    }
    const id = `${targetConfigItem ? "subcfg" : "cfg"}-${values.version.replace(/[^a-zA-Z0-9.-]/g,"").toLowerCase()}-${Date.now().toString().slice(-4)}`;
    targetVersions.unshift({
      id,configItemId:targetConfigItem?.id,version:values.version,name:values.name,owner:values.owner,createdBy:values.owner,domains,status:"draft",locked:false,
      created:configVersionTime(),publishedAt:"-",effectiveTime:"-",previousVersion:sourceItem?.version || "-",
      basedOn:sourceItem?.version || "-",notificationType:values.notificationType,publishMode:values.publishMode,
      changeSummary:values.changeSummary,impact:values.impact || "待试算",parameters:values.parameters || "待填写",
      scheduledEffectiveTime:"-",snapshot:JSON.parse(JSON.stringify(sourceItem?.snapshot || (targetConfigItem ? configSubgroupSnapshot(targetConfigItem, "active") : null))),
      traceId:`trace-config-${Date.now().toString().slice(-6)}`,updated:configVersionTime()
    });
    if (targetConfigItem) state.configSubgroupVersionId = id;
    showToast(`${values.version}已创建，可直接设置生效或定时生效（演示环境已关闭审核）`);
    state.configVersionModal = null;
    state.configVersionId = null;
    render();
  }

  function submitSystemConfig(id) {
    const item = prototype.configSeeds.system.find(row => row.id === id);
    if (!item) return showToast("系统配置不存在");
    const input = document.querySelector(`[data-system-config-value="${id}"]`);
    if (!input) return;
    const raw = input.type === "checkbox" ? (input.checked ? "开启" : "关闭") : input.value.trim();
    if (!raw) return showToast("配置值不能为空");
    if (!input.reportValidity()) return;
    if (item.inputType === "select" && !item.options.includes(raw)) return showToast("请选择有效的配置值");
    if (raw === systemConfigRawValue(item)) return showToast("配置值未修改");
    if (item.sensitive) {
      state.systemConfigConfirm = {id,value:raw};
      return render();
    }
    commitSystemConfig(id,raw,"");
  }

  function commitSystemConfig(id, raw, reason) {
    const item = prototype.configSeeds.system.find(row => row.id === id);
    if (!item) return showToast("系统配置不存在");
    const next = item.inputType === "number" ? `${raw}${item.unit || ""}` : raw;
    item.pendingValue = next === item.value ? "" : next;
    delete state.systemConfigDrafts[id];
    state.systemConfigConfirm = null;
    if (reason) {
      state.systemConfigHistory.unshift({time:createDate(0),key:item.key,name:item.name,previous:item.value,next:item.pendingValue,operator:roleOwnerNames[state.role],reason,traceId:`trace-system-${Date.now().toString().slice(-6)}`});
    }
    showToast(`${item.name}已保存到待发布变更集 · 不生成业务版本`);
  }

  function submitSystemConfigConfirm() {
    const info = state.systemConfigConfirm;
    if (!info) return;
    const reason = document.querySelector("#system-config-confirm-reason")?.value.trim() || "";
    if (reason.length < 10) return showToast("敏感配置变更原因至少填写10个字");
    commitSystemConfig(info.id,info.value,reason);
    render();
  }

  function publishSystemConfig() {
    const pending = prototype.configSeeds.system.filter(item => item.pendingValue);
    if (!pending.length) return showToast("没有待发布的系统配置变更");
    state.systemConfigPublishConfirm = true;
    return render();
  }

  function commitSystemConfigPublish(reason) {
    const pending = prototype.configSeeds.system.filter(item => item.pendingValue);
    if (!pending.length) return showToast("没有待发布的系统配置变更");
    const now = createDate(0);
    pending.forEach(item => {
      const previous = item.value;
      item.value = item.pendingValue;
      item.pendingValue = "";
      item.updated = now;
      state.systemConfigHistory.unshift({time:now,key:item.key,name:item.name,previous,next:item.value,operator:roleOwnerNames[state.role],reason,traceId:`trace-system-${Date.now().toString().slice(-6)}`});
    });
    state.systemConfigPublishConfirm = false;
    showToast(`系统配置变更已发布 · ${pending.length}项即时生效 · 已写入审计`);
    render();
  }

  function submitSystemConfigPublishConfirm() {
    const reason = document.querySelector("#system-config-publish-reason")?.value.trim() || "";
    if (reason.length < 10) return showToast("系统配置发布原因至少填写10个字");
    commitSystemConfigPublish(reason);
  }

  function submitConfigAction() {
    const info = state.configActionModal;
    if (!info) return;
    const item = configVersionById(info.id);
    const reason = document.querySelector("#config-action-reason")?.value.trim() || "";
    if (!item) return showToast("版本不存在");
    if (reason.length < 10) return showToast("操作原因至少填写10个字");
    if (!configVersionActions(item).some(([action]) => action === info.action)) return showToast("当前版本状态不允许此操作");
    if (info.action === "withdraw" || info.action === "void") {
      item.status = "voided";
      item.locked = true;
      item.effectiveTime = "-";
      item.scheduledEffectiveTime = "-";
    }
    if (info.action === "activate") {
      if (item.status !== "draft" || item.locked) return showToast("只有未锁定草稿可以设置生效");
      const error = configSnapshotError(item.snapshot);
      if (error) return showToast(error);
      activateConfigVersion(item,configVersionCollection(item),configVersionNow(),roleOwnerNames[state.role]);
    }
    if (info.action === "schedule") {
      if (item.status !== "draft") return showToast("只有草稿版本可以设置定时生效");
      if (configVersionCollection(item).some(row => row.status === "scheduled" && row.id !== item.id)) return showToast("当前小分组已有待生效版本，请先处理现有版本");
      const effectiveTime = document.querySelector("#config-action-effective-time")?.value.trim() || "";
      if (!effectiveTime) return showToast("请填写计划生效时间");
      const scheduledAt = configScheduledTime(effectiveTime);
      if (!Number.isFinite(scheduledAt)) return showToast("计划生效时间格式不正确");
      if (scheduledAt <= configVersionNow()) return showToast("计划生效时间必须晚于当前服务器时间");
      const error = configSnapshotError(item.snapshot);
      if (error) return showToast(error);
      item.status = "scheduled";
      item.locked = true;
      item.effectiveTime = "-";
      item.scheduledEffectiveTime = configVersionTime(scheduledAt);
      item.publishMode = "定时生效";
    }
    item.updated = configVersionTime();
    item.lastAction = {action:info.action,reason,operator:roleOwnerNames[state.role],time:item.updated};
    const actionLabel = info.action === "withdraw" ? "撤回" : info.action === "void" ? "作废" : info.action === "schedule" ? "设置定时生效" : "立即生效";
    prototype.auditRecords.unshift({id:`audit-config-${Date.now().toString().slice(-6)}`,time:item.updated,action:`配置版本${actionLabel}`,object:item.version,operator:roleOwnerNames[state.role],result:item.status,trace_id:item.traceId,self_review:false});
    state.configActionModal = null;
    state.configVersionId = null;
    state.configScopedItem = null;
    showToast(`${item.version}${info.action === "withdraw" ? "已撤回" : info.action === "void" ? "已作废" : info.action === "schedule" ? "已设置定时生效" : "已立即生效并锁定"} · 已写入审计`);
    render();
  }

  function riskCasePanel() {
    const enabled = (state.routeId === "admin-review" && state.tabId === "risk-review") ||
      (state.routeId === "admin-risk" && state.tabId === "cluster");
    if (!enabled) return "";
    const cases = prototype.riskCases;
    return `<section class="dev-risk-panel">
      <header><div><h2>风险案件闭环</h2><p>关系图、组结论、逐案资金、调查SLA、统一隔离与解除重检。</p></div><span>${cases.length}个案件组</span></header>
      <div class="dev-risk-list">${cases.map(item=>`
        <article>
          <div><span>${h(item.id)} · 置信度 ${(item.confidence*100).toFixed(0)}%</span><strong>${h(item.name)}</strong><small>${item.features.map(feature=>h(feature)).join(" / ")}</small></div>
          <div class="dev-release-metrics"><span>${statusTag(item.status)}</span><span>${statusTag(item.riskLevel)}</span><span>隔离 ${item.quarantine.status === "active" ? money(item.quarantine.amount) : "已解除"}</span><span>${item.members.length}名成员</span></div>
          <button class="tm-button secondary" data-risk-case-open="${h(item.id)}">案件闭环详情</button>
        </article>`).join("")}</div>
    </section>`;
  }

  function reportPacket() {return prototype.reportPackets.find(item => item.tab === state.tabId) || null;}

  function globalSearchIndex() {
    const result = [];
    result.push({
      type:"业务对象",
      title:"配置总览",
      subtitle:"配置中心 / 配置总览",
      keywords:"trace-admin-config-1 配置总览 配置中心",
      action:()=>navigate("admin-config/overview/overview-001")
    });
    prototype.routes.filter(route => route.kind !== "global").forEach(route=>{
      route.tabs.forEach(tabItem=>{
        seedRows(route.id,tabItem.id).slice(0,8).forEach(row=>{
          result.push({
            type:"业务对象",title:row.name,subtitle:`${route.title} / ${tabItem.title}`,
            keywords:[row.id,row.name,row.traceId,row.owner,row.country,row.status,row.type,row.partnerId,row.sourceId,row.riskCaseId,row.impact,row.linked].join(" ").toLowerCase(),
            action:()=>navigate(route.id === "tasks" ? `tasks?task_id=${encodeURIComponent(row.id)}` : `${route.id}/${tabItem.id}/${row.id}`)
          });
        });
      });
    });
    prototype.riskCases.forEach(item=>result.push({type:"风险案件",title:item.name,subtitle:`${item.id} · ${statusLabel(item.status)}`,keywords:[item.id,item.name,item.partner,item.features.join(" "),item.riskLevel].join(" ").toLowerCase(),action:()=>{state.riskCaseId=item.id;render();}}));
    prototype.reportPackets.forEach(packet=>packet.dimensions.forEach(item=>result.push({type:"报表维度",title:item.label,subtitle:`${packet.title} · ${item.id}`,keywords:[item.id,item.label,item.recommendation,...item.clients,...item.commissions,item.riskCase].join(" ").toLowerCase(),action:()=>{state.reportDimensionId=item.id;navigate(`admin-performance/${packet.tab}`);}})));
    prototype.integrationHealth.systems.forEach(item=>result.push({type:"集成系统",title:item.name,subtitle:`${statusLabel(item.status)} · ${item.backlog}积压`,keywords:[item.id,item.name,item.status,item.dependencies.join(" ")].join(" ").toLowerCase(),action:()=>{state.integrationSystemId=item.id;navigate("admin-review/integration");}}));
    prototype.integrationHealth.eventGaps.forEach(item=>result.push({type:"事件缺口",title:`${item.source} ${item.stage}`,subtitle:`${item.id} · ${item.gap}条缺口`,keywords:[item.id,item.source,item.stage,item.idempotencyKey,...item.blockedCommissions].join(" ").toLowerCase(),action:()=>navigate("admin-review/integration")}));
    prototype.integrationHealth.tasks.forEach(item=>result.push({type:"集成任务",title:item.name,subtitle:`${item.id} · ${statusLabel(item.status)}`,keywords:[item.id,item.name,item.type,item.source,item.idempotencyKey].join(" ").toLowerCase(),action:()=>navigate("admin-review/integration")}));
    prototype.exportTasks.forEach(item=>result.push({type:"导出任务",title:item.name,subtitle:`${item.id} · ${statusLabel(item.status)}`,keywords:[item.id,item.name,item.traceId,item.createdBy].join(" ").toLowerCase(),action:()=>{state.reportExportOpen=true;navigate("admin-performance/roi");}}));
    prototype.auditRecords.slice(0,30).forEach(item=>result.push({type:"审计",title:`${item.action} · ${item.object}`,subtitle:`${item.id} · ${item.operator}`,keywords:[item.id,item.action,item.object,item.operator,item.trace_id].join(" ").toLowerCase(),action:()=>{state.auditOpen=true;state.auditKeyword=item.trace_id;render();}}));
    return result;
  }

  function closeAllDrawers() {
    state.releaseId=null;state.riskCaseId=null;state.reportDimensionId=null;state.integrationSystemId=null;
    state.auditOpen=false;state.notificationOpen=false;state.permissionOpen=false;state.reportExportOpen=false;
    state.searchOpen=false;state.releaseModal=null;state.configVersionId=null;state.configVersionModal=null;state.configActionModal=null;state.configVersionMenuId=null;state.configOverviewItem=null;state.configOverviewVersionId=null;state.configOverviewVersionItemId=null;state.configScopedItem=null;state.systemConfigConfirm=null;state.systemConfigPublishConfirm=false;
    state.riskCaseModal=null;state.reportSuggestion=null;state.governanceModal=null;state.menuBlueprintId=null;
  }

  function allowedSearchTypes() {
    return prototype.permissionPolicy.searchTypes[state.role] || [];
  }

  function filterSearchResults(items,keyword,searchType) {
    const normalized = String(keyword || "").trim().toLowerCase();
    const terms = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
    if (!terms.length) return [];
    return items.filter(item =>
      (searchType === "all" || item.type === searchType) && terms.every(term => item.keywords.includes(term))).slice(0,80);
  }

  function currentSearchResults(keyword = state.searchKeyword,searchType = state.searchType) {
    const allowed = new Set(allowedSearchTypes());
    return filterSearchResults(globalSearchIndex().filter(item => allowed.has(item.type)),keyword,searchType);
  }

  function rememberRecentSearch(keyword) {
    const value = String(keyword || "").trim();
    if (!value || !currentSearchResults(value,"all").length) return;
    state.searchRecent = [value,...state.searchRecent.filter(item => item.toLowerCase() !== value.toLowerCase())].slice(0,8);
    persistRecentSearches();
  }

  function openGlobalSearch() {
    closeAllDrawers();
    state.searchKeyword = "";
    state.searchType = "all";
    state.searchActiveIndex = -1;
    state.searchRecent = loadRecentSearches();
    state.searchOpen = true;
    render();
    const focusSearch = () => {
      if (!state.searchOpen) return;
      document.querySelector("[data-search-keyword]")?.focus();
    };
    focusSearch();
    requestAnimationFrame(focusSearch);
    setTimeout(focusSearch,0);
  }

  function searchDrawer() {
    if (!state.searchOpen) return "";
    const allowed = new Set(allowedSearchTypes());
    const allResults = globalSearchIndex().filter(item => allowed.has(item.type));
    const types = ["all",...new Set(allResults.map(item=>item.type))];
    const results = filterSearchResults(allResults,state.searchKeyword,state.searchType);
    return `<div class="tm-overlay" data-close-search="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="全局搜索">
      <header><div><strong>全局搜索</strong><span>合作方、客户、配置、风险、报表、集成、导出和审计</span></div><button data-close-search="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>搜索</h3><input class="dev-audit-search dev-global-search" data-search-keyword value="${h(state.searchKeyword)}" placeholder="输入ID、名称、TraceId、系统或状态；Ctrl/Cmd+K打开"><div class="dev-search-types">${types.map(type=>`<button type="button" class="dev-search-type ${state.searchType===type?"active":""}" data-search-type="${h(type)}">${h(type === "all" ? "全部" : type)}</button>`).join("")}</div><p class="dev-help">当前角色：${h(prototype.roles[state.role])} · 已按搜索可见范围过滤</p></section>
        <section class="dev-drawer-section"><h3>最近搜索</h3>${state.searchRecent.length ? `<div class="dev-recent-searches">${state.searchRecent.map(item=>`<button type="button" data-search-recent="${h(item)}">${h(item)}</button>`).join("")}<button type="button" class="clear" data-clear-search-recent="1">清空</button></div>` : "<p class='dev-help'>暂无最近搜索；按角色分别保存。</p>"}</section>
        <section class="dev-drawer-section"><h3>搜索结果</h3>${state.searchKeyword.trim() ? `<p class="dev-help">命中 ${results.length} 条${results.length >= 80 ? "，仅展示前80条" : ""}</p>${results.length ? `<div class="dev-global-search-list">${results.map((item,index)=>`<article class="${state.searchActiveIndex===index?"active":""}"><div><span>${h(item.type)} · ${h(item.subtitle)}</span><strong>${h(item.title)}</strong></div><button class="tm-button secondary" data-search-result="${index}">打开</button></article>`).join("")}</div>` : "<p class='dev-help'>当前角色范围内无匹配结果。</p>"}` : "<p class='dev-help'>请输入关键词；支持业务ID、名称、TraceId、系统名和状态。Enter执行搜索，再次Enter打开第一条。</p>"}</section>
      </div>
      <footer><button class="tm-button secondary" data-close-search="1">关闭</button></footer>
    </aside>`;
  }

  function reportChart(chart) {
    const values = chart.points.map(([,value]) => Number(value || 0));
    const max = Math.max(1,...values);
    if (chart.type === "line") {
      const points = chart.points.map(([label,value],index) => {
        const x = 32 + index * ((280 - 32) / Math.max(1,chart.points.length - 1));
        const y = 158 - (Number(value) / max) * 128;
        return `${x},${y}`;
      }).join(" ");
      return `<svg viewBox="0 0 320 180" role="img" aria-label="${h(chart.title)}"><polyline points="${points}"></polyline>${chart.points.map(([label,value],index)=>{
        const x = 32 + index * ((280 - 32) / Math.max(1,chart.points.length - 1));
        const y = 158 - (Number(value) / max) * 128;
        return `<circle cx="${x}" cy="${y}" r="4"></circle><text x="${x}" y="${y-10}">${h(value)}</text><text x="${x}" y="174">${h(label)}</text>`;
      }).join("")}</svg>`;
    }
    const width = 240 / chart.points.length;
    return `<svg viewBox="0 0 320 180" role="img" aria-label="${h(chart.title)}">${chart.points.map(([label,value],index)=>{
      const height = (Number(value) / max) * 124;
      const x = 34 + index * width;
      return `<rect x="${x}" y="${152-height}" width="${Math.max(12,width-18)}" height="${height}"></rect><text x="${x + Math.max(6,(width-18)/2)}" y="${146-height}">${h(value)}</text><text x="${x + Math.max(6,(width-18)/2)}" y="174">${h(label)}</text>`;
    }).join("")}</svg>`;
  }

  function reportPanel() {
    if (state.routeId !== "admin-performance") return "";
    const packet = reportPacket();
    if (!packet) return "";
    return `<section class="dev-report-panel">
      <header><div><h2>${h(packet.title)}</h2><p>${h(packet.summary)}</p></div></header>
      <div class="dev-report-charts">${packet.charts.map(chart=>`<article><h3>${h(chart.title)}</h3>${reportChart(chart)}</article>`).join("")}</div>
      <div class="dev-report-dimensions"><header><h3>维度下钻</h3><span>维度 → 客户 / 佣金 / 风险案件</span></header>${packet.dimensions.map(item=>`
        <article><span>${h(item.label)}</span><strong>${h(recommendationLabel(item.recommendation))}</strong><button class="tm-button secondary" data-report-drilldown="${h(item.id)}">下钻</button></article>`).join("")}</div>
    </section>`;
  }

  function integrationPanel() {
    if (state.routeId !== "admin-review" || state.tabId !== "integration") return "";
    const health = prototype.integrationHealth;
    return `<section class="dev-report-panel dev-integration-panel">
      <header><div><h2>集成健康闭环</h2><p>外部系统状态、事件积压、数据缺口、幂等补数、回调失败和技术任务联动。</p></div><button class="tm-button secondary" data-integration-recheck="1">执行健康检查</button></header>
      <div class="dev-report-charts">${health.charts.map(chart=>`<article><h3>${h(chart.title)}</h3>${reportChart(chart)}</article>`).join("")}</div>
      <div class="dev-report-dimensions"><header><h3>外部系统状态</h3><span>成功率 / 延迟 / 积压 / 回调失败</span></header>
        <div class="dev-member-table dev-integration-systems"><div><span>系统</span><span>状态</span><span>延迟</span><span>成功率</span><span>积压</span><span>重试率</span><span>操作</span></div>
        ${health.systems.map(system=>`<div><span>${h(system.name)}<small>${system.dependencies.join(" / ")}</small></span><span>${statusTag(system.status)}</span><span>${system.latencyMs}ms</span><span>${system.successRate}%</span><span>${system.backlog}</span><span>${system.retryRate}%</span><span><button class="tm-button secondary" data-integration-system="${h(system.id)}">详情</button></span></div>`).join("")}
      </div></div>
      <div class="dev-report-dimensions"><header><h3>事件缺口</h3><span>关键缺口阻断自动结算；次要缺口仅告警</span></header>
        <div class="dev-member-table dev-integration-gaps"><div><span>缺口</span><span>来源/阶段</span><span>关键度</span><span>缺口数</span><span>影响佣金</span><span>状态</span><span>操作</span></div>
        ${health.eventGaps.map(gap=>`<div><span>${h(gap.id)}<small>${h(gap.idempotencyKey)}</small></span><span>${h(gap.source)} / ${h(gap.stage)}</span><span>${statusTag(gap.criticality)}</span><span>${gap.gap}</span><span>${gap.blockedCommissions.length ? `${gap.blockedCommissions.join("、")}<small>${money(gap.blockedAmount)}</small>` : "无"}</span><span>${statusTag(gap.status)}</span><span><button class="tm-button secondary" data-integration-backfill="${h(gap.id)}">幂等补数</button></span></div>`).join("")}
      </div></div>
      <div class="dev-report-dimensions"><header><h3>技术任务</h3><span>重试、取消和健康检查均写入审计</span></header>
        <div class="dev-member-table dev-integration-tasks"><div><span>任务</span><span>类型</span><span>状态</span><span>重试</span><span>SLA</span><span>操作</span></div>
        ${health.tasks.map(task=>`<div><span>${h(task.name)}<small>${h(task.id)} · ${h(task.idempotencyKey)}</small></span><span>${h(task.type)}</span><span>${statusTag(task.status)}</span><span>${task.retryCount}</span><span>${h(task.sla)}</span><span><button class="tm-button secondary" data-integration-retry="${h(task.id)}">重试</button><button class="tm-button secondary" data-integration-cancel="${h(task.id)}">取消</button></span></div>`).join("")}
      </div></div>
    </section>`;
  }

  function dataGovernancePanel() {
    if (state.routeId !== "admin-review" || state.tabId !== "integration") return "";
    const governance = prototype.dataGovernance;
    return `<section class="dev-report-panel dev-governance-panel">
      <header><div><h2>数据治理闭环</h2><p>数据分级、保留策略、敏感字段授权、导出审批、删除任务和breach流程。</p></div></header>
      <div class="dev-chip-row static">${governance.classifications.map(item=>`<span class="dev-chip">${h(item.name)}：${h(item.fields.join("、"))}<small>${h(item.policy)}</small></span>`).join("")}</div>
      <div class="dev-report-dimensions"><header><h3>保留策略</h3><span>到期后生成删除或匿名化任务</span></header>
        <div class="dev-member-table dev-governance-retention"><div><span>数据类型</span><span>保留期</span><span>状态</span><span>责任角色</span></div>
        ${governance.retentionPolicies.map(policy=>`<div><span>${h(policy.dataType)}</span><span>${policy.retentionDays === 1 ? "24小时" : `${policy.retentionDays}天`}</span><span>${statusTag(policy.status)}</span><span>${h(policy.owner)}</span></div>`).join("")}
      </div></div>
      <div class="dev-report-dimensions"><header><h3>敏感字段授权</h3><span>按字段、按用途、按期限授权</span></header>
        <div class="dev-member-table dev-governance-fields"><div><span>申请</span><span>字段/用途</span><span>状态</span><span>到期时间</span><span>操作</span></div>
        ${governance.fieldAccessRequests.map(request=>`<div><span>${h(request.id)}<small>${h(request.applicant)}</small></span><span>${h(request.field)}<small>${h(request.purpose)}</small></span><span>${statusTag(request.status)}</span><span>${h(request.expiresAt)}</span><span><button class="tm-button secondary" data-governance-action="authorize_field" data-governance-target="${h(request.id)}">批准</button><button class="tm-button secondary" data-governance-action="revoke_field" data-governance-target="${h(request.id)}">拒绝/撤销</button></span></div>`).join("")}
      </div></div>
      <div class="dev-report-dimensions"><header><h3>删除与匿名化任务</h3><span>保留期到期或用户请求后触发；需审批</span></header>
        <div class="dev-member-table dev-governance-deletions"><div><span>任务</span><span>对象数</span><span>状态</span><span>保留到期</span><span>SLA</span><span>操作</span></div>
        ${governance.deletionTasks.map(task=>`<div><span>${h(task.id)}<small>${h(task.dataType)} · ${h(task.reason)}</small></span><span>${task.objectCount}</span><span>${statusTag(task.status)}</span><span>${h(task.retentionUntil)}</span><span>${h(task.sla)}</span><span><button class="tm-button secondary" data-governance-action="approve_deletion" data-governance-target="${h(task.id)}">批准</button><button class="tm-button secondary" data-governance-action="cancel_deletion" data-governance-target="${h(task.id)}">取消</button></span></div>`).join("")}
      </div></div>
      <div class="dev-report-dimensions"><header><h3>Breach流程</h3><span>处置、通知SLA、受影响数据和合规留痕</span></header>
        <div class="dev-member-table dev-governance-breaches"><div><span>事件</span><span>等级</span><span>状态</span><span>通知SLA</span><span>受影响数据</span><span>操作</span></div>
        ${governance.breachIncidents.map(incident=>`<div><span>${h(incident.id)}<small>${h(incident.name)}</small></span><span>${statusTag(incident.severity)}</span><span>${statusTag(incident.status)}</span><span>${h(incident.notificationSla)}</span><span>${incident.affectedData.join("、")}</span><span><button class="tm-button secondary" data-governance-action="notify_breach" data-governance-target="${h(incident.id)}">记录通知</button></span></div>`).join("")}
      </div></div>
    </section>`;
  }

  function savedViewsForCurrent() {
    return state.savedViews.filter(view => view.routeId === state.routeId && view.tabId === state.tabId && view.role === state.role);
  }

  function saveCurrentView() {
    const name = state.viewName.trim() || `视图 ${savedViewsForCurrent().length + 1}`;
    const view = {
      id:`view-${Date.now().toString(36)}`,name,role:state.role,
      routeId:state.routeId,tabId:state.tabId,
      filters:{...state.filters},sort:{...state.sort},pageSize:state.pageSize,
      hiddenColumns:[...state.hiddenColumns],workbenchQueue:state.workbenchQueue
    };
    state.savedViews.push(view);
    state.activeViewId = view.id;
    state.viewName = "";
    persistSavedViews();
    showToast(`视图“${name}”已保存`);
  }

  function applySavedView(id) {
    const view = state.savedViews.find(item => item.id === id);
    if (!view) return showToast("保存视图不存在");
    state.filters = {...view.filters};
    state.draftFilters = {...view.filters};
    state.sort = {...view.sort};
    state.pageSize = view.pageSize || 20;
    state.hiddenColumns = new Set(view.hiddenColumns || []);
    state.workbenchQueue = view.workbenchQueue || "all";
    state.activeViewId = view.id;
    state.page = 1;
    showToast(`已应用视图“${view.name}”`);
  }

  function deleteSavedView(id) {
    state.savedViews = state.savedViews.filter(view => view.id !== id);
    if (state.activeViewId === id) state.activeViewId = null;
    persistSavedViews();
    showToast("保存视图已删除");
  }

  function listFilterFields() {
    const rows = seedRows();
    const options = key => [...new Set(rows.map(row => row[key]).filter(value => value != null && value !== ""))].map(value => [String(value),["status","risk"].includes(key) ? statusLabel(value) : String(value)]);
    const stages = state.tabId === "partner-list" ? prototype.partner360.stages : state.tabId === "client-list" ? prototype.client360.lifecycleStages : [];
    return [
      {key:"status",label:"状态",options:options("status")},
      {key:"risk",label:"风险",options:options("risk")},
      {key:"owner",label:"责任角色",options:options("owner")},
      {key:"country",label:"国家",options:options("country")},
      {key:"type",label:"类型",options:options("type")},
      {key:"deepStage",label:"阶段",options:stages.map(stage => [String(stage.id),stage.label])}
    ];
  }

  function filterBar() {
    const fields = listFilterFields();
    const quickKeys = {
      "partner-list":["deepStage","country","risk"],"client-list":["deepStage","country","risk"],
      "event-stream":["type","status","risk"],"link-list":["status","country","type"],
      "material-list":["status","type","country"],"postback":["status","type","country"],
      "tracker":["status","country"]
    }[state.tabId] || ["status","risk","owner"];
    const quickFields = quickKeys.map(key => fields.find(field => field.key === key)).filter(field => field?.options.length);
    const active = Object.entries(state.filters).filter(([,value]) => value !== undefined && value !== "");
    const labels = {keyword:"关键词",from:"开始日期",to:"结束日期"};
    const select = (field,quick=false) => `<label><span>${h(field.label)}</span><select ${quick ? "data-admin-quick-filter" : "data-draft-filter"}="${field.key}" aria-label="${h(field.label)}"><option value="">全部${h(field.label)}</option>${field.options.map(([value,label]) => `<option value="${h(value)}" ${String((quick ? state.filters : state.draftFilters)[field.key] || "") === value ? "selected" : ""}>${h(label)}</option>`).join("")}</select></label>`;
    const chips = active.map(([key,value]) => {
      const field = fields.find(item => item.key === key);
      const label = field?.label || labels[key] || key;
      const text = field?.options.find(option => option[0] === String(value))?.[1] || value;
      return `<span class="admin-filter-tag"><span>${h(label)}：${h(text)}</span><button type="button" data-remove-filter="${h(key)}" aria-label="移除${h(label)}筛选">×</button></span>`;
    }).join("");
    return `<section class="admin-filter-shell" aria-label="筛选器">
      <div class="admin-filter-quick">${quickFields.map(field => select(field,true)).join("")}<button type="button" class="tm-button secondary admin-filter-trigger" data-action="filters-toggle" aria-expanded="${state.filterPanelOpen}" aria-controls="admin-list-filter-panel">${tqIcon("filter")}筛选器${active.length ? `<span class="admin-filter-count">${active.length}</span>` : ""}</button></div>
      ${active.length ? `<div class="admin-filter-tags">${chips}<button type="button" class="admin-filter-clear" data-action="filters-clear">清空</button></div>` : ""}
      ${state.filterPanelOpen ? `<div class="admin-filter-panel" id="admin-list-filter-panel" role="region" aria-label="全部筛选条件"><div class="admin-filter-fields"><label><span>关键词</span><input type="search" data-draft-filter="keyword" value="${h(state.draftFilters.keyword || "")}" placeholder="搜索ID、名称、对象或TraceId"></label>${fields.filter(field => field.options.length).map(field => select(field)).join("")}<label><span>开始日期</span><input type="date" data-draft-filter="from" value="${h(state.draftFilters.from || "")}"></label><label><span>结束日期</span><input type="date" data-draft-filter="to" value="${h(state.draftFilters.to || "")}"></label></div>${state.filterError ? `<p class="admin-filter-error" role="alert">${h(state.filterError)}</p>` : ""}<div class="admin-filter-actions"><button type="button" class="tm-button secondary" data-action="filters-reset-draft">重置条件</button><button type="button" class="tm-button secondary" data-action="filters-cancel">取消</button><button type="button" class="tm-button primary" data-action="query">应用筛选</button></div></div>` : ""}
    </section>`;
  }

  function columnPanel(currentTab) {
    return `<div class="dev-column-panel"><strong>列设置</strong>${currentTab.columns.map(column =>
      `<label><input type="checkbox" data-column="${h(column.key)}" ${state.hiddenColumns.has(column.key)?"":"checked"}>${h(column.label)}</label>`).join("")}</div>`;
  }

  function configInsightPanel(rows) {
    const panel = tab().panel;
    const definitions = {
      "config-overview": [
        ["配置域状态", rows.slice(0,6).map(row => `<div class="dev-timeline-row"><span>${h(row.version)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"],
        ["跨切面门禁", `<div class="dev-check-list"><span>画像门禁：开启</span><span>官方路径库：系统生成</span><span>点击规则：确定性过滤</span><span>D+N：30天参考值</span></div>`],
        ["生效风险", `<div class="dev-check-list danger"><span>生效失败需技术处理</span><span>待审批不可定时生效</span><span>自审生成双审计</span><span>回滚必须记录原因</span></div>`]
      ],
      "price": [
        ["国家系数Top", rows.slice(0,5).map(row => `<div class="dev-bar-row"><span>${h(row.country)}</span><div><i style="width:${Number(row.impact.match(/([\d.]+)$/)?.[1]||1)*60}%"></i></div><strong>${h(row.impact)}</strong></div>`).join("") || "<p>暂无数据</p>"],
        ["资格档覆盖", `<div class="dev-check-list"><span>L1：低门槛获客</span><span>L2：标准交易</span><span>L3：活跃交易</span><span>L4：高质量交易</span></div>`],
        ["版本提醒", `<div class="dev-check-list"><span>价格变更必须试算</span><span>单国覆盖价需原因</span><span>生效后锁定新客户</span><span>历史客户不追溯</span></div>`]
      ],
      "qualification": [
        ["阈值结构", `<div class="dev-check-list"><span>净入金</span><span>标准手</span><span>活跃交易日</span><span>多账户合并</span></div>`],
        ["观察窗口", `<div class="dev-check-list"><span>60自然日参考</span><span>入金与交易同时覆盖</span><span>里程碑结果可追溯</span><span>未达标生成原因码</span></div>`],
        ["最近变更", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.updated)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"]
      ],
      "credit": [
        ["C0-C4权益", `<div class="dev-check-list"><span>C0：默认权益</span><span>C1：低附加</span><span>C2：中附加</span><span>C3：高附加</span><span>C4：人工高权</span></div>`],
        ["权益锁定", `<div class="dev-check-list"><span>佣金生成时锁定版本</span><span>后续等级变化不追溯</span><span>保证金抵扣可差异化</span></div>`],
        ["最近变更", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.updated)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"]
      ],
      "hold": [
        ["结算期公式", `<div class="dev-check-list"><span>基础R档天数</span><span>+ 国家风险附加</span><span>+ 支付方式附加</span><span>D+N触发冻结不自动放行</span></div>`],
        ["风险边界", `<div class="dev-check-list danger"><span>理论结算期继续累计</span><span>人工排除可提前解除</span><span>解除后必须重检</span></div>`],
        ["版本分布", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.version)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"]
      ],
      "guarantee-tax": [
        ["资金口径", `<div class="dev-check-list"><span>保证金按佣金总额计提</span><span>税费独立计算</span><span>提现手续费按支付方式</span><span>失败提现不收费</span></div>`],
        ["释放边界", `<div class="dev-check-list"><span>结算后90自然日参考</span><span>终止合作另保留30自然日</span><span>抵扣需财务审批</span></div>`],
        ["规则状态", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.type)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"]
      ],
      "approval": [
        ["自动审核规则", `<div class="dev-check-list"><span>申请人有审批权限时提示自审</span><span>同事务生成提交+审批审计</span><span>self_review=true</span><span>不自审则转其他审批人</span></div>`],
        ["审批节点", `<div class="dev-check-list"><span>提交</span><span>影响预览</span><span>审批</span><span>定时生效</span><span>审计</span></div>`],
        ["流程状态", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.stage)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"]
      ],
      "simulation": [
        ["试算差异", rows.slice(0,5).map(row => `<div class="dev-bar-row"><span>${h(row.name)}</span><div><i style="width:${Math.min(100,row.progress)}%"></i></div><strong>${h(money(row.amount))}</strong></div>`).join("") || "<p>暂无数据</p>"],
        ["阻断规则", `<div class="dev-check-list danger"><span>护栏校验失败不可提交</span><span>资金影响必须预览</span><span>影子运行不改生产</span></div>`],
        ["任务状态", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.updated)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"]
      ],
      "hard-rule": [
        ["D1-D3配置", `<div class="dev-check-list"><span>D1画像门禁可开关</span><span>D2官方路径库系统生成</span><span>D3点击规则确定性过滤</span><span>证据保留规则版本</span></div>`],
        ["受保护规则", `<div class="dev-check-list danger"><span>官方路径不可停用</span><span>点击规则变更需影子运行</span><span>黑名单不可静默删除</span></div>`],
        ["规则版本", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.version)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"]
      ]
    };
    const articles = definitions[panel] || [["状态分布", rows.slice(0,5).map(row => `<div class="dev-timeline-row"><span>${h(row.updated)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("")],["配置边界", `<div class="dev-check-list"><span>配置层只定义规则</span><span>不处理具体案件</span><span>变更必须留版本</span></div>`],["最近更新", rows.slice(5,10).map(row => `<div class="dev-timeline-row"><span>${h(row.updated)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("")]];
    return `<section class="dev-insight-grid">${articles.map(([title,body]) => `<article><h3>${h(title)}</h3>${body}</article>`).join("")}</section>`;
  }

  function insightPanels(rows) {
    if (state.routeId === "admin-modules") return moduleInsightPanels(rows);
    if (state.routeId === "admin-workbench") {
      const groups = Object.entries(rows.reduce((account,row) => ({...account,[row.type]:(account[row.type]||0)+1}),{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const maxGroup = Math.max(1,...groups.map(([,count])=>count));
      const overdue = rows.filter(row=>row.overdue).slice(0,5);
      const audits = prototype.auditRecords.slice(0,5);
      return `<section class="dev-insight-grid">
        <article><h3>任务类型分布</h3>${groups.map(([type,count])=>`<div class="dev-bar-row"><span>${h(type)}</span><div><i style="width:${count/maxGroup*100}%"></i></div><strong>${count}</strong></div>`).join("") || "<p>暂无数据</p>"}</article>
        <article><h3>超时风险</h3>${overdue.map(row=>`<div class="dev-timeline-row"><span>${h(row.due)}</span><strong>${h(row.name)}</strong>${statusTag(row.priority)}</div>`).join("") || "<p>暂无超时任务</p>"}</article>
        <article><h3>最近审计</h3>${audits.map(record=>`<div class="dev-timeline-row"><span>${h(record.time)}</span><strong>${h(record.action)} · ${h(record.object)}</strong>${statusTag(record.result)}</div>`).join("")}</article>
      </section>`;
    }
    if (tab().panel) return configInsightPanel(rows);
    const statusGroups = Object.entries(rows.reduce((account,row) => ({...account,[row.status]:(account[row.status]||0)+1}),{})).sort((a,b) => b[1]-a[1]).slice(0,5);
    const maxStatus = Math.max(1,...statusGroups.map(([,count]) => count));
    const topAmount = [...rows].sort((a,b) => b.amount-a.amount).slice(0,5);
    const maxAmount = Math.max(1,...topAmount.map(row => row.amount));
    const timeline = [...rows].sort((a,b) => b.updated.localeCompare(a.updated)).slice(0,5);
    return `<section class="dev-insight-grid">
      <article><h3>状态分布</h3>${statusGroups.map(([value,count]) => `<div class="dev-bar-row"><span>${h(statusLabel(value))}</span><div><i style="width:${count/maxStatus*100}%"></i></div><strong>${count}</strong></div>`).join("") || "<p>暂无数据</p>"}</article>
      <article><h3>影响金额Top 5</h3>${topAmount.map(row => `<div class="dev-bar-row"><span>${h(row.name)}</span><div><i style="width:${row.amount/maxAmount*100}%"></i></div><strong>${money(row.amount)}</strong></div>`).join("") || "<p>暂无数据</p>"}</article>
      <article><h3>最近更新</h3>${timeline.map(row => `<div class="dev-timeline-row"><span>${h(row.updated)}</span><strong>${h(row.name)}</strong>${statusTag(row.status)}</div>`).join("") || "<p>暂无数据</p>"}</article>
    </section>`;
  }

  function eventTraceSearchBar() {
    if (state.routeId !== "admin-modules" || state.tabId !== "event-stream") return "";
    const keyword = String(state.filters.keyword || "").trim().toLowerCase();
    const matched = keyword ? prototype.eventChainCatalog.chains.filter(chain =>
      [chain.traceId,chain.client,chain.partner].some(value => String(value).toLowerCase().includes(keyword))) : [];
    if (!matched.length) return "";
    return `<section class="dev-event-search" aria-label="TraceId检索">
      <div class="dev-event-search-main">
        <h2>关联事件链</h2>
        <div class="dev-event-search-hits">${matched.map(chain =>
            `<button type="button" class="dev-event-chain-hit" data-event-chain="${h(chain.traceId)}">
              <strong>${h(chain.traceId)}</strong>
              <span>${h(chain.client)} · ${h(chain.partner)}</span>
              <small>${h(chain.summary.slice(0,38))}…</small>
            </button>`).join("")}</div>
      </div>
    </section>`;
  }

  function eventChainDrawerBody() {
    const chain = prototype.eventChainCatalog.chains.find(item => item.traceId === state.eventChainId);
    if (!chain) return "";
    const labels = prototype.eventChainCatalog.nodeTypeLabels;
    const client = prototype.client360.clients.find(c => c.id === chain.client);
    const partner = prototype.partner360.partners.find(p => p.id === chain.partner);
    const exc = prototype.attribution360.exceptions.find(e => e.traceId === chain.traceId);
    return `<div class="tm-overlay" data-close-event-chain="1"></div><aside class="tm-drawer dev-drawer-wide dev-event-chain-drawer" aria-label="事件链抽屉">
      <header><div><strong>${h(chain.traceId)} 事件链</strong><span>${h(client?.name || chain.client)} · ${h(partner?.name || chain.partner)} · ${h(chain.summary)}</span></div><button data-close-event-chain="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>链路概览</h3><div class="dev-impact-grid">
          <article><span>客户</span><strong>${h(client?.name || chain.client)}</strong></article>
          <article><span>合作方</span><strong>${h(partner?.name || chain.partner)}</strong></article>
          <article><span>链上佣金</span><strong>${money(chain.totalCommission)}</strong></article>
          <article><span>关联异常</span><strong>${exc ? h(exc.type) : "无"}</strong></article>
        </div></section>
        <section class="dev-drawer-section"><h3>完整事件链（${chain.chain.length}节点）</h3>
          <div class="dev-offboard-timeline dev-event-chain-timeline">${chain.chain.map(node => `
            <div class="${node.status === "success" || node.status === "confirmed" ? "done" : node.status === "failed" ? "failed" : node.status === "pending" || node.status === "waiting_external" ? "pending" : "doing"}">
              <span class="dev-offboard-dot"></span>
              <div>
                <span class="dev-offboard-step">${h(labels[node.type] || node.type)} · ${h(node.label)}</span>
                <strong>${node.time || "待定"}</strong>
                <small>${h(node.detail)}</small>
                ${node.target ? `<button class="tm-button secondary dev-chain-node-link" data-chain-node-target="${h(String(node.target).replace("target:",""))}">跳转 →</button>` : ""}
              </div>
            </div>`).join("")}
          </div>
        </section>
        <section class="dev-drawer-section"><h3>底账说明</h3><p class="dev-permission-scope">事件流水是全链路事实底账：弱KPI、强检索。本页与追踪器（IMC侧分析）、集成任务（缺口补数）分工——本页只呈现事实，不做分析、不执行补数。</p></section>
      </div>
      <footer><button class="tm-button secondary" data-close-event-chain="1">关闭</button></footer>
    </aside>`;
  }

  function link360ViewSwitcher() {
    if (state.routeId !== "admin-modules" || state.tabId !== "link-list") return "";
    const active = state.link360View || "all";
    return `<div class="dev-partner360-views" role="tablist" aria-label="推广链接视角">${prototype.link360.views.map(item =>
      `<button class="${active===item.id?"active":""}" data-link-view="${h(item.id)}" role="tab" aria-selected="${active===item.id}" title="${h(item.hint)}">${h(item.label)}</button>`).join("")}</div>`;
  }

  function materialViewToggle() {
    if (state.routeId !== "admin-modules" || state.tabId !== "material-list") return "";
    return `<div class="dev-partner360-views" role="tablist" aria-label="素材视图">
      <button class="${!state.materialGrid?"active":""}" data-material-view="list" role="tab" aria-selected="${!state.materialGrid}">列表</button>
      <button class="${state.materialGrid?"active":""}" data-material-view="grid" role="tab" aria-selected="${state.materialGrid}">网格</button>
    </div>`;
  }

  function materialGrid() {
    if (!state.materialGrid) return "";
    const items = pageRows(filteredRows());
    return `<div class="dev-material-grid">${items.map(row => {
      const mat = row.matRef;
      const stateLabel = prototype.materialCatalog.states[mat.state] || mat.state;
      const tone = mat.state === "active" ? "tm-success" : mat.state === "rejected" ? "tm-danger" : mat.state === "offline" ? "tm-info" : "tm-warning";
      return `<button type="button" class="dev-material-card ${mat.state}" data-mat-open="${h(mat.id)}" title="${h(mat.name)}">
        <span class="dev-material-thumb" style="background:${mat.thumbColor}"><i>${h(prototype.materialCatalog.types[mat.type])}</i></span>
        <span class="dev-material-name">${h(mat.name)}</span>
        <span class="dev-material-meta">${h(mat.platform)} · ${h(mat.size)} · ${h(mat.format)}</span>
        <span class="dev-status ${tone}">${h(stateLabel)}</span>
        ${mat.specCheck !== "passed" ? `<span class="dev-spec-flag ${mat.specCheck}">${mat.specCheck === "failed" ? "规格失败" : "规格警告"}</span>` : ""}
      </button>`;}).join("")}</div>`;
  }

  function postbackDrawerBody(row) {
    const pb = row.pbRef;
    return `<section class="dev-drawer-section dev-partner360-tabs-bar">
      <div class="dev-partner360-tabs" role="tablist">
        <button class="${(state.postbackTab||"mapping")==="mapping"?"active":""}" data-postback-tab="mapping" role="tab">参数映射</button>
        <button class="${state.postbackTab==="delivery"?"active":""}" data-postback-tab="delivery" role="tab">投递监控</button>
      </div>
    </section>
    <section class="dev-drawer-section dev-partner360-body">${(state.postbackTab||"mapping") === "mapping" ? `
      <div class="dev-detail-grid">
        <div><span>平台</span><strong>${h(prototype.postbackCatalog.platforms[pb.platform])}</strong></div>
        <div><span>状态</span><strong>${statusTag(pb.status)}</strong></div>
        <div><span>回传地址</span><strong>${h(pb.url)}</strong></div>
        <div><span>回传事件</span><strong>${h(pb.events.join(" / "))}</strong></div>
      </div>
      ${pb.note ? `<p class="dev-block-reason">${h(pb.note)}</p>` : ""}
      <h4 class="dev-materials-title">参数映射（只读演示）</h4>
      <table class="dev-map-table"><thead><tr><th>目标参数</th><th>变量</th></tr></thead><tbody>
        ${pb.paramMap.map(([k,v]) => `<tr><td>${h(k)}</td><td><code>${h(v)}</code></td></tr>`).join("")}
      </tbody></table>
      <p class="dev-help">参数映射变更需保存新版本并试投通过后生效；编辑走配置审批流。</p>` : `
      <div class="dev-impact-grid">
        <article><span>30日发送</span><strong>${compact(pb.delivery30d.sent)}</strong></article>
        <article><span>成功</span><strong>${compact(pb.delivery30d.success)}</strong></article>
        <article><span>失败</span><strong class="dev-danger-text">${compact(pb.delivery30d.failed)}</strong></article>
        <article><span>最近试投</span><strong>${pb.lastTest.result === "success" ? `成功 ${pb.lastTest.latencyMs}ms` : "失败"}</strong></article>
      </div>
      ${pb.lastTest.failNote ? `<p class="dev-block-reason">${h(pb.lastTest.failNote)}</p>` : ""}
      <p class="dev-help">投递失败事件自动重试（幂等键防重）；连续失败生成集成任务。完整投递日志在事件流水按TraceId检索。</p>`}
    </section>`;
  }

  function postbackTestModal() {
    if (!state.postbackTest) return "";
    const pb = prototype.postbackCatalog.configs.find(item => item.id === state.postbackTest);
    if (!pb) return "";
    return `<div class="tm-overlay" data-close-pb-test="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>试投：${h(pb.name)}</strong><span>${h(prototype.postbackCatalog.platforms[pb.platform])} · ${h(pb.url)}</span></div><button data-close-pb-test="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>模拟事件</h3><div class="dev-materials-list">${prototype.postbackCatalog.testEvents.map(evt =>
          `<span class="dev-chip pb-test-event" data-pb-test-event="${h(evt.event)}" title="${h(evt.hint)}">${h(evt.event)}</span>`).join("")}</div></section>
        <section><h3>上次结果</h3><div class="dev-check-list"><span>${pb.lastTest.time} · ${pb.lastTest.result === "success" ? "成功" : "失败"} ${pb.lastTest.latencyMs ? pb.lastTest.latencyMs + "ms" : ""}</span>${pb.lastTest.failNote ? `<span>${h(pb.lastTest.failNote)}</span>` : ""}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-pb-test="1">取消</button><button class="tm-button primary" data-submit-pb-test="1">发送试投</button></footer>
    </section>`;
  }

  function trackerPathDrawer() {
    if (state.routeId !== "admin-modules" || state.tabId !== "tracker" || !state.trackerSessionId) return "";
    const session = prototype.trackerCatalog.sessions.find(item => item.id === state.trackerSessionId);
    if (!session) return "";
    const partner = prototype.partner360.partners.find(p => p.id === session.partner);
    return `<div class="tm-overlay" data-close-tracker="1"></div><aside class="tm-drawer dev-drawer-wide dev-event-chain-drawer" aria-label="转化路径抽屉">
      <header><div><strong>${h(session.id)} 转化路径</strong><span>${h(session.linkId)} · ${h(session.subId)} · ${h(partner?.name || session.partner)} · ${h(session.country)}</span></div><button data-close-tracker="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>会话信息</h3><div class="dev-impact-grid">
          <article><span>设备</span><strong>${h(session.device)}</strong></article>
          <article><span>来源</span><strong>${h(session.source)}</strong></article>
          <article><span>点击时间</span><strong>${h(session.clickedAt)}</strong></article>
          <article><span>TraceId</span><strong>${h(session.traceId)}</strong></article>
        </div></section>
        <section class="dev-drawer-section"><h3>转化路径（${session.path.length}步）</h3>
          <div class="dev-offboard-timeline dev-event-chain-timeline">${session.path.map(node => `
            <div class="${node.status === "success" || node.status === "confirmed" ? "done" : node.status === "failed" ? "failed" : node.status === "pending" ? "pending" : "doing"}">
              <span class="dev-offboard-dot"></span>
              <div><span class="dev-offboard-step">${h(node.label)}</span><strong>${node.time || "待定"}</strong><small>${h(node.detail)}</small></div>
            </div>`).join("")}
          </div>
        </section>
        <section class="dev-drawer-section"><h3>分工说明</h3><p class="dev-permission-scope">追踪器=单点排查（点击→转化明细）；聚合分析走报表中心/渠道分析（下钻链接互查）；全量事件底账在事件流水。</p></section>
      </div>
      <footer><button class="tm-button secondary" data-close-tracker="1">关闭</button></footer>
    </aside>`;
  }

  function modulePrimaryAction() {
    if(state.tabId==="config-permission")return "refresh";
    return modulePrimaryActions[state.tabId] || "claim";
  }

  function moduleActionLabel(actionId) {
    return moduleActionLabels[state.tabId]?.[actionId] || actionCatalog[actionId].label;
  }

  function actionDisplayLabel(actionId) {
    if (demoSkipsApproval() && actionId === "submit") return "提交处理";
    if (demoSkipsApproval() && actionId === "approve") return "确认处理";
    return state.routeId === "admin-modules" ? moduleActionLabel(actionId) : actionCatalog[actionId].label;
  }

  function deepActionFields(actionId) {
    const definitions = {
      new_draft:[
        {key:"name",label:"对象名称",type:"text",value:target => `${tab().entity}-${Date.now().toString().slice(-4)}`},
        {key:"type",label:"类型",type:"text",value:target => target?.type || "标准对象"},
        {key:"country",label:"国家",type:"text",value:target => target?.country || "TH"},
        {key:"version",label:"版本",type:"text",value:() => `v${3 + Number(Date.now().toString().slice(-1))}.0`}
      ],
      claim:[
        {key:"owner",label:"处理人",type:"text",value:() => roleOwnerNames[state.role]},
        {key:"due",label:"预计完成",type:"text",value:() => "24小时内"}
      ],
      assign:[
        {key:"owner",label:"转办给",type:"text",value:target => target?.owner || "运营/Ops"},
        {key:"priority",label:"优先级",type:"select",options:["normal","medium","high","urgent"],value:target => target?.priority || "normal"}
      ],
      supplement:[
        {key:"material",label:"补充材料",type:"text",value:() => "身份证明 / 收款证明 / 交易说明"},
        {key:"due",label:"补件截止",type:"text",value:() => "48小时内"}
      ],
      submit:[
        {key:"approver",label:"目标审批角色",type:"select",options:["risk_supervisor","finance","compliance","system_admin"],value:() => "risk_supervisor"},
        {key:"impact",label:"影响说明",type:"text",value:target => `${target?.name || tab().title} · 影响金额待复核`}
      ],
      approve:[
        {key:"result",label:"审批结论",type:"select",options:["approved","rejected","returned"],value:() => "approved"}
      ],
      create_review:[
        {key:"riskLevel",label:"建议风险",type:"select",options:["normal","low","medium","high"],value:target => target?.risk || "medium"},
        {key:"evidence",label:"关键证据",type:"text",value:target => target?.source || "系统识别事实"}
      ],
      suggestion:[
        {key:"recommendation",label:"建议",type:"select",options:["scale_up","observe","review","limit"],value:target => target?.status || "review"},
        {key:"scope",label:"建议范围",type:"text",value:() => `${tab().title}当前筛选`}
      ],
      export:[
        {key:"scope",label:"导出范围",type:"text",value:() => `${tab().title}当前筛选 · 脱敏`},
        {key:"rows",label:"行数",type:"number",value:() => Math.max(1,filteredRows().length)}
      ]
    };
    return (definitions[actionId] || []).filter(field => !demoSkipsApproval() || field.key !== "approver");
  }

  function moduleWorkflowSteps(schema) {
    const workflows = {
      dashboard:["采集指标","口径校验","异常识别","生成建议","人工复核"],
      partners:["CRM同步","资料校验","风险检查","业务确认","状态同步"],
      attribution:["事件采集","幂等校验","归属判定","异常识别","人工复核"],
      promotion:["创建对象","合规检查","生成官方链接","投放跟踪","效果复盘"],
      funds:["账务生成","结算检查","税费与保证金","结算检查","支付或重算"],
      "risk-compliance":["识别事实","证据补齐","风险判断","处置建议","人工结论"],
      processing:["任务生成","认领分工","材料补充","处理审批","结果回写"],
      analytics:["数据抽取","指标计算","维度下钻","生成建议","业务评审"],
      "config-release":["新建草稿","差异试算","多方签核","定时生效","审计回溯"]
    };
    return workflows[schema.groupId] || workflows.partners;
  }

  function moduleDrawerContext(row) {
    const data = menuBlueprintItem(state.tabId);
    if (!data) return "";
    const {item} = data;
    const schema = prototype.moduleSchemas[state.tabId];
    return `<section class="dev-drawer-section"><h3>业务路径</h3><div class="dev-module-flow">${moduleWorkflowSteps(schema).map(step => `<span>${h(step)}</span>`).join("")}</div></section>
      <section class="dev-drawer-section"><h3>对象360</h3><div class="dev-object-grid">
        <article><span>TraceId</span><strong>${h(row.traceId)}</strong><small>页面、事件、任务、审计共享</small></article>
        <article><span>来源系统</span><strong>${h(row.source)}</strong><small>可回查生成链路</small></article>
        <article><span>影响范围</span><strong>${h(row.impact)}</strong><small>${h(item.objects.join(" / "))}</small></article>
        <article><span>依赖能力</span><strong>${h(item.dependency.join(" / "))}</strong><small>缺失时页面保留但动作降级</small></article>
      </div></section>`;
  }

  function moduleGroupBars(rows,key,title) {
    const groups = Object.entries(rows.reduce((account,row) => ({...account,[row[key]]:(account[row[key]] || 0)+1}),{}))
      .sort((a,b) => b[1]-a[1]).slice(0,5);
    const max = Math.max(1,...groups.map(([,count]) => count));
    return `<article><h3>${h(title)}</h3>${groups.map(([value,count]) =>
      `<div class="dev-bar-row"><span>${h(["status","risk","priority","stage"].includes(key) ? statusLabel(value) : value)}</span><div><i style="width:${count/max*100}%"></i></div><strong>${count}</strong></div>`).join("") || "<p>暂无数据</p>"}</article>`;
  }

  function moduleAmountTop(rows,title) {
    const top = [...rows].sort((a,b) => b.amount-a.amount).slice(0,5);
    const max = Math.max(1,...top.map(row => row.amount));
    return `<article><h3>${h(title)}</h3>${top.map(row =>
      `<div class="dev-bar-row"><span>${h(row.name)}</span><div><i style="width:${row.amount/max*100}%"></i></div><strong>${money(row.amount)}</strong></div>`).join("") || "<p>暂无数据</p>"}</article>`;
  }

  function moduleInsightPanels(rows) {
    const schema = prototype.moduleSchemas[state.tabId];
    if (!schema) return "";
    if (state.tabId === "event-stream") {
      return `<section class="dev-insight-grid">${[moduleGroupBars(rows,"nodeType","事件类型构成"),moduleGroupBars(rows,"status","节点状态"),moduleGroupBars(rows,"traceId","事件链分布")].join("")}</section>`;
    }
    if (state.tabId === "client-list") {
      return `<section class="dev-insight-grid">${[moduleGroupBars(rows,"stage","生命周期分布"),moduleGroupBars(rows,"country","国家分布"),moduleGroupBars(rows,"riskGrade","R档分布")].join("")}</section>`;
    }
    const definitions = {
      dashboard:() => [moduleGroupBars(rows,"type","指标构成"),moduleGroupBars(rows,"status","指标状态"),moduleAmountTop(rows,"影响金额Top 5")],
      partners:() => [moduleGroupBars(rows,"stage","生命周期阶段"),moduleGroupBars(rows,"country","国家分布"),moduleAmountTop(rows,"累计佣金Top 5")],
      attribution:() => [moduleGroupBars(rows,"status","归属/异常状态"),moduleGroupBars(rows,"risk","风险分布"),moduleGroupBars(rows,"channel","渠道构成")],
      promotion:() => [moduleGroupBars(rows,"type","推广类型"),moduleGroupBars(rows,"country","适用国家"),moduleAmountTop(rows,"使用效果Top 5")],
      funds:() => [moduleGroupBars(rows,"status","资金状态"),moduleGroupBars(rows,"type","资金类型"),moduleAmountTop(rows,"金额Top 5")],
      "risk-compliance":() => [moduleGroupBars(rows,"risk","风险分布"),moduleGroupBars(rows,"source","证据来源"),moduleAmountTop(rows,"影响金额Top 5")],
      processing:() => [moduleGroupBars(rows,"priority","优先级"),moduleGroupBars(rows,"status","处理状态"),moduleAmountTop(rows,"SLA影响Top 5")],
      analytics:() => [moduleGroupBars(rows,"status","建议结论"),moduleGroupBars(rows,"country","国家表现"),moduleAmountTop(rows,"指标金额Top 5")],
      "config-release":() => [moduleGroupBars(rows,"status","配置状态"),moduleGroupBars(rows,"version","版本分布"),moduleGroupBars(rows,"owner","责任角色")]
    };
    const articles = (definitions[schema.groupId] || definitions.partners)();
    return `<section class="dev-insight-grid">${articles.join("")}</section>`;
  }

  function deepStage(row) {
    return Math.max(0,Math.min(4,Math.floor(Number(row.progress || 0) / 20)));
  }

  function table(rows) {
    const currentTab = tab();
    const visibleColumns = currentTab.columns.filter(column => !state.hiddenColumns.has(column.key));
    const list = pageRows(rows);
    const from = rows.length ? (state.page-1)*state.pageSize+1 : 0;
    const to = Math.min(rows.length,state.page*state.pageSize);
    const pages = Math.max(1,Math.ceil(rows.length/state.pageSize));
    const allChecked = list.length > 0 && list.every(row => state.selected.has(row.id));
    if (state.scenario === "loading") return `<div class="dev-skeleton-table"><div></div><div></div><div></div><div></div><div></div></div>`;
    return `<section class="tm-table-wrap dev-table-wrap">
      <div class="dev-table-meta"><label class="dev-select-all"><input type="checkbox" data-select-all="${allChecked?"1":"0"}" ${allChecked?"checked":""}>全选</label><span>已选 ${state.selected.size} 项 · 显示 ${from}-${to} / ${rows.length} 条</span><span>第 ${state.page} / ${pages} 页</span></div>
      <table><thead><tr>
        <th class="dev-select-col"><span>选择</span></th>
        ${visibleColumns.map(column => `<th ${column.numeric?"class='numeric'":""} data-sort="${h(column.key)}">${h(column.label)}${state.sort.key===column.key?(state.sort.dir==="asc"?" ↑":" ↓"):""}</th>`).join("")}
        <th class="dev-action-col">操作</th></tr></thead>
      <tbody>${list.length ? list.map(row => `<tr data-row="${h(row.id)}" ${state.tabId === "event-stream" && row.traceId ? `data-trace-id="${h(row.traceId)}"` : ""} class="${state.detailId===row.id?"selected":""}">
        <td class="dev-select-col"><input type="checkbox" data-select-row="${h(row.id)}" ${state.selected.has(row.id)?"checked":""} aria-label="选择 ${h(row.name)}"></td>
        ${visibleColumns.map(column => `<td ${column.numeric?"class='numeric'":""}>${formatCell(row,column)}</td>`).join("")}
        <td class="dev-action-col">${rowActionsFor(row).map(action =>
          `<button class="tm-button secondary dev-row-action" data-row-action="${h(action.id)}" data-row-action-target="${h(action.target || row.id)}" ${action.actionId ? `data-row-action-cmd="${h(action.actionId)}"` : ""}>${h(action.label)}</button>`).join("")}</td></tr>`).join("") : `<tr><td colspan="${visibleColumns.length+2}" class="tm-empty">暂无数据<br><small>请调整筛选条件或重置查询</small></td></tr>`}</tbody></table>
      <div class="dev-table-meta dev-table-footer"><label>每页<select data-page-size>${[20,50,100].map(value => `<option ${state.pageSize===value?"selected":""}>${value}</option>`).join("")}</select>条</label>
      <div><button class="tm-button secondary" data-page="${state.page-1}" ${state.page<=1?"disabled":""}>上一页</button><button class="tm-button secondary" data-page="${state.page+1}" ${state.page>=pages?"disabled":""}>下一页</button></div></div>
    </section>`;
  }

  // Task queue UI uses the shared prototype task resource; it owns no task records.
  const tq = {
    role:null, scenario:null, query:null, filters:{}, result:null, error:null, detail:null, taskId:null,
    detailTab:"overview", form:null, dirty:false, preview:null, selected:new Set(), expanded:false,
    columnsOpen:false, dialog:null, notice:null, locale:"zh", hashSeen:null, lastRead:0, lastDetailRead:0,
    widths:{}, hidden:new Set(), order:[], focusTarget:null, pollTimer:null, detailError:null, requestKeys:{}
  };
  const tqTypes = {
    partner_followup:["合作方跟进","Partner Follow-up"],
    risk_review:["风险复核","Risk Review"], settlement_overdue:["结算超时复核","Overdue Settlement"],
    appeal:["申诉复核","Appeal Review"], hold_extend:["结算延长复核","Settlement Extension"],
    guarantee_offset:["保证金抵扣","Reserve Offset"], chargeback:["冲正追回","Reversal & Recovery"],
    circuit_breaker:["熔断复核","Circuit Breaker"], credit_review:["信用调级复核","Credit Review"],
    commission_exception:["佣金异常","Commission Exception"], attribution_review:["归属争议复核","Attribution Review"],
    integration:["集成失败","Integration Failure"], data_backfill:["事件补数","Event Backfill"],
    offboarding_step:["清退步骤","Offboarding Step"]
  };
  const tqStates = {
    open:["待认领","Unclaimed"], processing:["处理中","Processing"], waiting_material:["待补件","Awaiting Materials"],
    pending_approval:demoSkipsApproval() ? ["待接续","Pending Continuation"] : ["待审批","Pending Approval"], returned:["退回补充","Returned"],
    pending_execution:["待执行","Pending Execution"], executing:["执行中","Executing"],
    execution_failed:["执行失败","Execution Failed"], done:["已完成","Completed"], closed:["已关闭","Closed"]
  };
  const tqPurposes = {
    general:"资料核对","crm-sync":"CRM同步核对",finance:"资金核对",risk:"风险跟进",
    risk_investigation:"风险调查", signal_review:"超时信号复核", settlement_recheck:"结算解除重检",
    cluster_determination:"集群认定", cluster_member_correction:"集群成员纠错",
    blacklist_add:"加入本地名单", blacklist_remove:"移出本地名单",
    manual_credit_override:"普通信用调级", risk_credit_propagation:"风险信用传导"
  };
  const tqConclusions = {
    recorded:"已核对并记录",referred:"已转交专业处理",complete_followup:"完成跟进",
    clear:"风险排除",confirm:"风险成立",observe:"继续观察",change_request:"变更申请",
    signal_confirm:"确认信号",signal_reject:"驳回信号",uphold:"维持原决定",amend:"改判",
    extend:"延长结算",extend_settlement:"延长结算",maintain:"维持保护",adjust:"调整保护",release:"解除熔断",
    reserve_offset:"保证金抵扣",reverse_recover:"冲正追回",credit_override:"信用调级",
    credit_propagation:"风险传导",commission_recalculate:"受控重算",attribution_correct:"归属纠错",
    event_backfill:"事件补数",integration_retry:"受控重试",resolved:"本次目标完成",rejected:"已驳回",
    duplicate:"重复任务",withdrawn:"来源撤回",invalidated:"对象失效",approved:"已批准",
    pending:"等待处理",waiting:"等待前序",cancelled:"已取消",succeeded:"执行成功",failed:"执行失败",
    partial:"部分成功",running:"执行中",awaiting_external:"等待外部回执",frozen:"冻结",holding:"结算中",
    payable:"可结算",paid:"已付款",confirmed:"已确认",suspected:"疑似",cleared:"已排除",
    unknown:"结果未知",not_found:"未找到",fresh:"正常",stale:"数据陈旧",missing:"缺失",clean:"核验通过",
    none:"无",not_applicable:"不适用",investigating:"调查中",not_started:"等待前序",unchanged:"未变更",ready:"可下载",
    save_draft:"保存草稿",preview:"影响预览",submit_review:"提交处置",claim:"认领任务",assign:"转办任务",
    return_pool:"退回责任池",request_material:"要求补件",close:"关闭任务",status_check:"查询外部状态",
    retry_integration:"受控重试",retry_execution:"重试执行",approval_approve:"审批通过",approval_reject:"审批驳回",
    approval_return:"退回补充",evidence_access:"查看证据",coordinator_complete:"领域执行回执"
  };
  const tqFieldLabels = {
    responsible_role:"责任岗位",request_kind:"跟进类别",request_reason:"任务说明",
    primary_object:"主对象",event_ids:"关联事件",risk_band:"风险档",rules:"命中规则",aggregation:"合作方风险聚合",
    numerator:"风险客户数",denominator:"统计客户数",ratio:"风险客户占比",window_start:"窗口起始",window_end:"窗口结束",
    threshold:"阈值",current_determination:"当前认定",signal_id:"信号编号",case_ref:"当前案件",case_refs:"关联案件",
    signal_status:"信号状态",settlement_status:"资金状态",hold_started_at:"冻结起始",threshold_days:"触发阈值（天）",
    config_version:"配置版本",appeal_eligibility:"申诉门禁",visible:"可申诉",reason_code:"原因码",used:"已用次数",
    max:"次数上限",window_ends_at:"窗口截止",release_targets:"拟解除限制",restriction_id:"限制编号",
    expected_restriction_version:"限制版本",appeal_id:"申诉编号",original_decision_ref:"原决定",original_evidence_ids:"原证据",
    appeal_material_ids:"申诉材料",eligibility:"受理资格",original_domain:"原业务域",current_due_at:"当前截止",
    extension_count:"已延长次数",max_extensions:"延长上限",allowed_until:"最晚允许截止",block_reasons:"当前阻断",
    loss_case_id:"损失案件",loss_amount:"损失金额",available_reserve:"可用保证金",already_offset:"已抵扣",
    remaining_loss:"未抵扣损失",original_ledger_ids:"原流水",reversible_balance:"剩余可冲正金额",
    already_reversed:"已冲正",recovery_routes:"可用追回路径",circuit_breaker_id:"熔断编号",rule_id:"规则",
    rule_version:"规则版本",trigger_scope:"触发范围",current_protection:"当前保护",trigger_values:"触发值",
    allowed_adjustment_config_refs:"可选调整政策",expected_protection_version:"保护版本",
    partner_id:"合作方",customer_id:"客户",commission_case_id:"佣金案件",settlement_case_id:"结算案件",
    settlement_batch_id:"结算批次",current_level:"当前信用等级",current_credit_snapshot:"信用快照",
    target_level_options:"允许目标等级",risk_propagation:"风险传导",effective_policy_ref:"生效政策",
    expected_credit_snapshot_version:"信用快照版本",source_events:"源事件",original_snapshot:"原计算快照",
    differences:"异常差异",recalculation_scope:"重算范围",crm_attribution:"CRM归属",claimant_refs:"争议双方",
    click_events:"点击事件",ib_isolation_result:"IB隔离校验",current_owner_ref:"当前归属",
    integration_task_id:"集成作业",integration_version:"作业版本",operation:"外部操作",external_system:"来源系统",
    external_ref:"外部单号",last_error:"最近错误",last_status:"最近结果",retryable:"允许重试",attempt:"已尝试次数",
    max_attempts:"次数上限",next_run_at:"下次执行",status_check:"外部状态查证",status_check_id:"查证编号",
    result:"查证结果",checked_at:"查证时间",expires_at:"有效期",can_retry_without_new_approval:"允许原计划重试",
    missing_event_ids:"缺失事件",source_system:"事实源",precheck_diff:"预检差异",backfill_policy_ref:"补数政策",
    offboarding_id:"清退流程",step_key:"当前步骤",predecessor_receipts:"前序回执",checklist:"检查项",
    cluster_id:"集群",expected_cluster_version:"集群版本",source_cluster_id:"来源集群",members:"集群成员",
    member_ids:"成员编号",independent_features:"独立特征",authoritative_exception:"权威例外",entry_id:"名单项",
    entry_type:"名单类型",target_ref:"授权目标",source:"来源",scope:"适用范围",expected_entry_version:"名单版本",
    effective_at:"生效时间",permanent:"永久有效",entry_status:"名单状态",name:"名称",status:"状态",
    country_codes:"国家",sub_ids:"Sub ID",entity_ids:"对象",partner_ids:"合作方",activity_ids:"活动",
    channel_ids:"渠道",global:"全局",protection_refs:"保护项",evidence_ref:"查证证据",policy_ref:"政策",
    points:"信用分",version:"版本",id:"编号",kind:"来源类型",object_type:"对象类型",object_id:"对象编号",
    workflow_state:"任务状态",funds_status:"资金状态",requested_action:"拟执行动作",requires_approval:"需要审批",
    required_domains:"执行责任域",authorized_target_refs:"授权名单对象",allowed_entry_types:"允许名单类型",
    blacklist_source:"名单来源",blacklist_status:"名单状态",allowed_scopes:"授权适用范围",authorized_owner_refs:"授权归属对象",
    customer_ids:"客户范围",case_refs:"案件范围",object_refs:"对象范围",expected_version:"预期版本",
    policy:"适用政策",in_progress:"申诉处理中",task_result:"任务结果",eligible:"符合受理资格",
    currency:"币种",amount:"金额",type:"对象类型",label:"名称",expected_entry_status:"预期名单状态",
    config_refs:"配置引用",source_versions:"来源版本",config_versions:"配置版本",source_snapshot_refs:"来源快照",
    error_code:"错误码",message:"说明",window_ended:"申诉窗口已结束",
    task_id:"任务编号",source_type:"任务类型",task_purpose:"任务目的",source_ref:"业务来源",
    item_id:"计划项",action:"动作",params:"参数",evidence_ids:"证据引用",requires_domains:"必要责任域",
    preview_id:"预览编号",preview_hash:"预览摘要",draft_version:"草稿版本",before_after_items:"变更前后",
    before:"变更前",after:"变更后",blocking_reasons:"阻断原因",blocking_errors:"预检阻断",
    deduplicated_amount:"去重影响金额",required_approver_roles:"必要审批角色",generated_at:"生成时间",
    evidence_id:"证据编号",scan_status:"核验状态",collected_at:"采集时间",hash:"摘要校验",invalidated:"是否失效",
    access:"访问权限",preview:"可预览",download:"可下载",source_version:"来源版本",
    release_recheck_source:"独立解除重检来源",expected_source_version:"案件版本",source_path:"来源位置",
    status_group:"状态分组",source_types:"任务类型",workflow_states:"任务状态",q:"关键词",
    sort_by:"排序字段",field:"字段",direction:"排序方向",page:"页码",page_size:"每页条数",
    user_id:"员工编号",display_name:"显示名",role_code:"职责编码",business_ref:"关联业务单据",
    elapsed_days_at_trigger:"触发时累计天数",current_elapsed_days:"当前累计天数"
  };
  const tqColumns = [
    {key:"select",zh:"选择",en:"Select",width:44,min:44,fixed:true},
    {key:"task",zh:"任务",en:"Task",width:240,min:200,fixed:true},
    {key:"type",zh:"类型",en:"Type",width:128,min:112},
    {key:"source",zh:"来源对象",en:"Source",width:160,min:140},
    {key:"priority",zh:"优先级",en:"Priority",width:80,min:72,sort:"priority"},
    {key:"status",zh:"状态",en:"Status",width:112,min:104,fixed:true},
    {key:"sla",zh:"处理时限",en:"SLA",width:144,min:128,fixed:true,sort:"sla_due_at"},
    {key:"team",zh:"责任团队",en:"Team",width:112,min:96},
    {key:"owner",zh:"处理人",en:"Owner",width:100,min:88},
    {key:"risk",zh:"风险档",en:"Risk",width:72,min:64},
    {key:"amount",zh:"影响金额",en:"Impact",width:112,min:100,sort:"impact_amount"},
    {key:"updated",zh:"更新时间",en:"Updated",width:160,min:144,sort:"updated_at"},
    {key:"actions",zh:"操作",en:"Actions",width:164,min:148,fixed:true},
    {key:"created",zh:"创建时间",en:"Created",width:160,min:144,optional:true},
    {key:"system",zh:"来源系统",en:"System",width:120,min:100,optional:true},
    {key:"reason",zh:"来源原因",en:"Reason",width:160,min:120,optional:true},
    {key:"approval",zh:"审批状态",en:"Approval",width:120,min:104,optional:true},
    {key:"credit",zh:"信用等级",en:"Credit",width:80,min:72,optional:true},
    {key:"trace",zh:"TraceId",en:"TraceId",width:200,min:160,optional:true}
  ];
  function tqT(zh,en) { return tq.locale === "en" ? en || zh : zh; }
  function tqLabel(map,key) { const value=map[key]; return Array.isArray(value) ? value[tq.locale==="en"?1:0] : value || key || "—"; }
  function tqService() { return prototype.taskQueue; }
  function tqContext(extra={}) { return {role:state.role,scenario:state.scenario,exclude_boundary:state.scenario!=="boundary",...extra}; }
  function tqId(prefix="tq") { return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }
  function tqClone(value) { return JSON.parse(JSON.stringify(value)); }
  function tqDate(value,short=false) {
    if (!value) return "—";
    const date=new Date(value); if (Number.isNaN(date.valueOf())) return tqT("时间不可用","Invalid time");
    const parts=new Intl.DateTimeFormat("sv-SE",{timeZone:tq.options?.timezone || "Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",...(short?{}:{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}).format(date);
    return parts.replace(",","");
  }
  function tqMoney(value) {
    const amount=value?.amount ?? value;
    if (amount === null || amount === undefined || amount==="") return "—";
    const [whole,fraction="00"]=String(amount).split(".");
    return `USD ${whole.replace(/\B(?=(\d{3})+(?!\d))/g,",")}.${fraction.padEnd(2,"0")}`;
  }
  function tqIcon(name) {
    const names={refresh:"repeat",export:"download",columns:"settings",filter:"filter",close:"close",more:"more",left:"chevron-left",right:"chevron-right",up:"chevron-up",down:"chevron-down",search:"search"};
    if (typeof menuIcons !== "undefined" && menuIcons[names[name] || name]) return `<span class="dev-menu-icon"><svg viewBox="0 0 16 16" aria-hidden="true">${menuIcons[names[name] || name]}</svg></span>`;
    const symbols={refresh:"↻",export:"↓",columns:"☷",filter:"≡",close:"×",more:"⋯",left:"‹",right:"›",up:"↑",down:"↓",search:"⌕"};
    return `<span aria-hidden="true">${symbols[name] || "•"}</span>`;
  }
  function tqButton(action,label,extra="",kind="secondary") {
    return `<button type="button" class="tq-button ${kind}" data-tq-action="${h(action)}" ${extra}>${label}</button>`;
  }
  function tqIconButton(action,icon,label,extra="") {
    return `<button type="button" class="tq-icon-button" data-tq-action="${h(action)}" aria-label="${h(label)}" title="${h(label)}" ${extra}>${tqIcon(icon)}</button>`;
  }
  function tqBadge(value) {
    const key=String(value || "");
    const tone=["done","approved","succeeded","clean","fresh"].includes(key)?"success":["execution_failed","failed","rejected"].includes(key)?"error":["waiting_material","returned","warning","partial","unknown"].includes(key)?"warning":key==="closed"?"muted":"info";
    return `<span class="tq-badge ${tone}">${h(tqStates[key]?tqLabel(tqStates,key):tqLabel(tqConclusions,key))}</span>`;
  }
  function tqAvailability(task,action) {
    const aliases={save_draft:["save_draft","draft"],submit_review:["submit_review","submit"],request_material:["request_material","material"],retry_integration:["retry_integration","retry"],retry_execution:["retry_execution","retry"],status_check:["status_check","check_status"],preview:["preview","impact_preview"]};
    return (task?.allowed_actions || []).find(item=>(aliases[action] || [action]).includes(item.action));
  }
  function tqCan(task,action) { return tqAvailability(task,action)?.enabled === true && navigator.onLine !== false && !["error","forbidden","offline"].includes(state.scenario); }
  function tqWriteButton(task,action,label,extra="") {
    const availability=tqAvailability(task,action); if (!availability) return "";
    return tqButton(action,h(label),`${extra} ${tqCan(task,action)?"":`disabled title="${h(availability.disabled_reason || tqT("当前不可操作","Unavailable"))}"`}`);
  }
  function tqDefaultQuery() {
    return {scope:tq.options?.default_scope || (["system_admin","audit"].includes(state.role)?"authorized":"mine"),status_group:"active",page:1,page_size:20};
  }
  function tqPreferenceKey() { return `affiliate:tasks:columns:${tq.options?.current_user?.user_id || state.role}`; }
  function tqLoadPreferences() {
    tq.widths={}; tq.hidden=new Set(tqColumns.filter(col=>col.optional).map(col=>col.key)); tq.order=tqColumns.map(col=>col.key);
    try {
      const saved=JSON.parse(localStorage.getItem(tqPreferenceKey()) || "null");
      if (saved) {
        tq.widths=saved.widths || {};
        tq.hidden=new Set((saved.hidden || []).filter(key=>!tqColumns.find(col=>col.key===key)?.fixed));
        tq.order=[...(saved.order || []).filter(key=>tqColumns.some(col=>col.key===key)),...tqColumns.filter(col=>!(saved.order || []).includes(col.key)).map(col=>col.key)];
      }
    } catch {}
  }
  function tqSavePreferences() {
    try { localStorage.setItem(tqPreferenceKey(),JSON.stringify({widths:tq.widths,hidden:[...tq.hidden],order:tq.order})); } catch {}
  }
  function taskQueueResetForRole() {
    tq.role=null; tq.query=null; tq.result=null; tq.detail=null; tq.taskId=null; tq.form=null; tq.dirty=false;
    tq.preview=null; tq.selected.clear(); tq.dialog=null; tq.requestKeys={}; tq.hashSeen=null; tq.error=null;
    tq.notice=null;tq.detailError=null;tq.metric=null;tq.lastRead=0;tq.lastDetailRead=0;tq.inspection=null;
  }
  function tqEnsure() {
    if (!tqService()) return false;
    if (tq.role !== state.role) {
      taskQueueResetForRole(); tq.role=state.role; tq.options=tqService().options(state.role);
      tq.query=tqDefaultQuery();
      try { const size=Number(localStorage.getItem("affiliate:tasks:page-size")); if ([10,20,50].includes(size)) tq.query.page_size=size; } catch {}
      tq.filters=tqClone(tq.query); tqLoadPreferences();
    }
    if (tq.scenario !== state.scenario) { tq.scenario=state.scenario; tq.lastRead=0; }
    if (location.hash.startsWith("#/tasks") && tq.hashSeen !== location.hash) {
      const params=new URLSearchParams(location.hash.split("?")[1] || "");
      const allowed=["scope","source_types","workflow_states","status_group","sla_state","priority","team_id","owner_id","partner_id","customer_id","external_system","updated_from","updated_to","q","sort_by","direction","page","page_size"];
      const query={...tqDefaultQuery(),page_size:tq.query.page_size};
      allowed.forEach(key=>{
        const values=params.getAll(key).flatMap(value=>value.split(",")).filter(Boolean);
        if (values.length) query[key]=["source_types","workflow_states","priority"].includes(key)?values:["page","page_size"].includes(key)?Number(values[0]):values[0];
      });
      if (params.has("source_type") && !params.has("source_types")) query.source_types=[params.get("source_type")];
      if (query.workflow_states?.length) delete query.status_group;
      if (!tq.options.authorized_scopes?.includes(query.scope)) query.scope=tq.options.default_scope;
      if (!["team","authorized"].includes(query.scope)) {delete query.owner_id;delete query.team_id;}
      if (!Number.isInteger(query.page) || query.page<1) query.page=1;
      if (![10,20,50].includes(query.page_size)) query.page_size=20;
      tq.query=query; tq.filters=tqClone(query); tq.taskId=params.get("task_id"); tq.hashSeen=location.hash; tq.lastRead=0;
      if (tq.detail?.task_id !== tq.taskId) {tq.detail=null;tq.form=null;tq.preview=null;tq.dirty=false;tq.detailTab="overview";}
    }
    if (!tq.lastRead) tqRead();
    if (tq.taskId && (!tq.detail || tq.detail.task_id!==tq.taskId)) tqReadDetail();
    return true;
  }
  function tqRead() {
    try {
      const result=tqService().list(tq.query,tqContext());
      if (!Array.isArray(result.items) || !result.meta || !result.summary) throw {code:"CONTRACT_ERROR",message:tqT("任务响应缺少必填字段","Required task fields are missing")};
      tq.result=result;tq.error=null;tq.lastRead=Date.now();
      const valid=new Set(result.items.filter(row=>tqCan(row,"claim") || tqCan(row,"assign")).map(row=>row.task_id));
      tq.selected=new Set([...tq.selected].filter(id=>valid.has(id)));
    } catch(error) {tq.error=error;tq.lastRead=Date.now();}
  }
  function tqReadDetail() {
    try {
      const next=tqService().detail(tq.taskId,tqContext());
      if (tq.dirty && tq.detail && next.version!==tq.detail.version) tq.notice=tqT("任务已有更新，保存前请刷新核对","Task changed. Review the latest version before saving.");
      if (!tq.dirty) {tq.detail=next;tq.form=tqFormFromTask(next);tq.detailError=null;}
      tq.lastDetailRead=Date.now();
    } catch(error) {tq.detailError=error;tq.detail=null;tq.form=null;tq.dirty=false;}
  }
  function tqSyncURL(push=false) {
    const params=new URLSearchParams();
    Object.entries(tq.query || {}).forEach(([key,value])=>{
      if (key==="snapshot_id" || value===null || value===undefined || value==="" || (Array.isArray(value)&&!value.length)) return;
      (Array.isArray(value)?value:[value]).forEach(item=>params.append(key,item));
    });
    if (tq.taskId) params.set("task_id",tq.taskId);
    const hash=`#/tasks${params.size?`?${params}`:""}`;
    history[push?"pushState":"replaceState"](null,"",hash); tq.hashSeen=hash;acceptedHash=hash;
  }
  function tqDayUTC(date,add=0) {
    if (!date) return null;
    const [year,month,day]=date.split("-").map(Number); const utc=Date.UTC(year,month-1,day+add);
    const zone=tq.options?.timezone || "Asia/Shanghai";
    const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(utc)).map(part=>[part.type,part.value]));
    const represented=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));
    return new Date(utc-(represented-utc)).toISOString();
  }
  function tqApply(query,resetPage=true) {
    const next=tqClone(query); delete next.snapshot_id;
    if (resetPage) next.page=1;
    next.q=String(next.q || "").trim(); if (!next.q) delete next.q;
    if (next.q?.length>100) {tq.notice=tqT("关键词最多100字符","Keyword must be at most 100 characters");return render();}
    ["source_types","workflow_states","priority"].forEach(key=>{if (!next[key]?.length) delete next[key];});
    if (next.workflow_states?.length) delete next.status_group;
    else next.status_group=next.status_group || "active";
    if (!["team","authorized"].includes(next.scope)) {delete next.owner_id;delete next.team_id;}
    if (next.source_types?.length && !next.source_types.some(type=>["integration","data_backfill"].includes(type))) delete next.external_system;
    if (next.updated_from?.length===10) next.updated_from=tqDayUTC(next.updated_from);
    if (next.updated_to?.length===10) next.updated_to=tqDayUTC(next.updated_to,1);
    const historical=next.status_group==="terminal" || next.status_group==="all" || next.workflow_states?.some(status=>["done","closed"].includes(status));
    if (historical && !next.updated_from && !next.updated_to) {
      const now=new Date(tq.options.server_time || "2026-11-08T12:00:00Z");
      next.updated_to=tqDayUTC(tqDate(now.toISOString(),true),1);
      next.updated_from=new Date(new Date(next.updated_to).valueOf()-30*86400000).toISOString();
    }
    if (Boolean(next.updated_from)!==Boolean(next.updated_to)) {tq.notice=tqT("请同时填写开始与结束日期","Provide both start and end dates");return render();}
    if (next.updated_from && (new Date(next.updated_to)<=new Date(next.updated_from) || new Date(next.updated_to)-new Date(next.updated_from)>366*86400000)) {tq.notice=tqT("日期范围须为1至366天","Date range must be between 1 and 366 days");return render();}
    const previous=tq.query;tq.query=next;tqRead();
    if (tq.error) {tq.query=previous;} else {tq.filters=tqClone(next);tq.selected.clear();tqSyncURL();}
    render();
  }
  function tqSLA(task) {
    if (!task.sla || task.sla_state==="unconfigured") return `<span class="tq-sla unconfigured">${h(tqT("未配置","Not configured"))}</span>`;
    const due=task.sla.due_at;const now=tq.result?.meta?.server_time || tq.options.server_time;
    const minutes=Math.abs(Math.round((new Date(due)-new Date(now))/60000));
    const duration=minutes>=1440?`${Math.floor(minutes/1440)}${tqT("天","d")} ${Math.floor(minutes%1440/60)}${tqT("小时","h")}`:minutes>=60?`${Math.floor(minutes/60)}${tqT("小时","h")} ${minutes%60}${tqT("分","m")}`:`${minutes}${tqT("分钟","m")}`;
    const terminal=["done","closed"].includes(task.workflow_state);
    return `<span class="tq-sla ${h(task.sla_state)}" title="${h(`${tqDate(due)} ${tq.options.timezone} · ${task.sla.rule_version}`)}">${h(terminal?tqT("已结束","Ended"):task.sla_state==="overdue"?`${tqT("已超时","Overdue")} ${duration}`:`${tqT("剩余","Remaining")} ${duration}`)}</span><small>${h(tqDate(due))}</small>`;
  }
  function tqActiveColumns() {
    return tq.order.map(key=>tqColumns.find(col=>col.key===key)).filter(col=>col&&!tq.hidden.has(col.key));
  }
  function tqColumnCell(col,row) {
    switch(col.key) {
      case "select":return tqCan(row,"claim")||tqCan(row,"assign")?`<input type="checkbox" data-tq-select="${h(row.task_id)}" aria-label="${h(`${tqT("选择","Select")} ${row.task_id}`)}" ${tq.selected.has(row.task_id)?"checked":""}>`:"";
      case "task":return `<button class="tq-task-link" data-tq-open="${h(row.task_id)}">${h(row.task_id)}</button><span class="tq-task-title" title="${h(row.title)}">${h(row.title)}</span>`;
      case "type":return h(tqLabel(tqTypes,row.source_type));
      case "source":return `<span class="tq-ellipsis" title="${h(row.object_summary || row.object_id || "")}">${h(row.object_summary || row.object_id || tqT("未关联","Not linked"))}</span><small>${h(row.source_ref?.id || row.source_ref || "—")}</small>`;
      case "priority":return `<span class="tq-priority ${h(row.priority)}"><i></i>${h(tqT(({urgent:"紧急",high:"高",medium:"中",normal:"普通",low:"低"})[row.priority],({urgent:"Urgent",high:"High",medium:"Medium",normal:"Normal",low:"Low"})[row.priority]))}</span>`;
      case "status":return tqBadge(row.workflow_state);
      case "sla":return tqSLA(row);
      case "team":return h(row.team?.name || tqT("待分配","Unassigned"));
      case "owner":return h(row.owner?.display_name || tqT("未认领","Unclaimed"));
      case "risk":return row.risk_level?`<span class="tq-risk ${h(row.risk_level)}">${h(row.risk_level)}</span>`:"—";
      case "amount":return h(tqMoney(row.impact));
      case "updated":return `<time title="${h(`${row.updated_at} · ${tq.options.timezone}`)}">${h(tqDate(row.updated_at))}</time>`;
      case "actions":return `<div class="tq-row-actions"><button data-tq-open="${h(row.task_id)}">${h(tqT("查看","View"))}</button>${tqCan(row,"claim")?`<button data-tq-row-action="claim" data-tq-id="${h(row.task_id)}">${h(tqT("认领","Claim"))}</button>`:tqCan(row,"save_draft")?`<button data-tq-open="${h(row.task_id)}" data-tq-process="1">${h(tqT("处理","Process"))}</button>`:""}${tqAvailability(row,"assign")?`<button data-tq-row-action="assign" data-tq-id="${h(row.task_id)}" ${tqCan(row,"assign")?"":`disabled title="${h(tqAvailability(row,"assign")?.disabled_reason || "")}"`}>${h(tqT("转办","Assign"))}</button>`:""}</div>`;
      case "created":return h(tqDate(row.created_at));
      case "system":return h(row.external_system || "—");
      case "reason":return h(row.reason_text || row.reason_codes?.join(" / ") || "—");
      case "approval":return tqBadge(row.approval_status || row.approval_refs?.at(-1)?.status || "none");
      case "credit":return h(row.credit_level || "—");
      case "trace":return h(row.trace_id || "—");
      default:return "—";
    }
  }
  function tqTable() {
    const rows=tq.result?.items || [];const cols=tqActiveColumns();
    const width=cols.reduce((sum,col)=>sum+(tq.widths[col.key] || col.width),0);
    const selectable=rows.filter(row=>tqCan(row,"claim") || tqCan(row,"assign"));
    const loading=state.scenario==="loading";
    return `<div class="tq-table-scroll"><table class="tq-table" style="width:${width}px;--tq-task-left:${tq.hidden.has("select")?0:44}px"><colgroup>${cols.map(col=>`<col style="width:${tq.widths[col.key] || col.width}px">`).join("")}</colgroup><thead><tr>${cols.map(col=>`<th class="tq-col-${col.key}" ${col.sort?`aria-sort="${tq.query.sort_by===col.sort?(tq.query.direction==="asc"?"ascending":"descending"):"none"}"`:""}>${col.key==="select"?`<input type="checkbox" data-tq-select-all aria-label="${h(tqT("全选当前页可操作任务","Select eligible tasks on this page"))}" ${selectable.length&&selectable.every(row=>tq.selected.has(row.task_id))?"checked":""} ${selectable.length?"":"disabled"}>`:col.sort?`<button data-tq-sort="${col.sort}">${h(tqT(col.zh,col.en))}<span aria-hidden="true">${tq.query.sort_by===col.sort?(tq.query.direction==="asc"?"↑":"↓"):"↕"}</span></button>`:h(tqT(col.zh,col.en))}${!["select","actions"].includes(col.key)?`<span class="tq-resize" data-tq-resize="${col.key}" role="separator" aria-label="${h(`${tqT("调整列宽","Resize")} ${tqT(col.zh,col.en)}`)}" aria-orientation="vertical" tabindex="0"></span>`:""}</th>`).join("")}</tr></thead><tbody>${loading?Array.from({length:5},()=>`<tr class="tq-loading-row">${cols.map(col=>`<td class="tq-col-${col.key}"><span></span></td>`).join("")}</tr>`).join(""):rows.map(row=>`<tr class="${tq.selected.has(row.task_id)?"tq-selected":""}" data-tq-row="${h(row.task_id)}">${cols.map(col=>`<td class="tq-col-${col.key}">${tqColumnCell(col,row)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      ${!loading&&!rows.length?`<div class="tq-empty"><span>${h(tqT(tqHasFilters()?"当前筛选条件下暂无任务":"暂无任务",tqHasFilters()?"No tasks match the current filters":"No tasks"))}</span>${tqButton("reset",h(tqT("清空筛选","Clear Filters")))}</div>`:""}
      <div class="tq-mobile-list">${loading?`<div class="tq-skeleton"></div>`:rows.map(row=>`<article class="tq-mobile-row"><div><button class="tq-task-link" data-tq-open="${h(row.task_id)}">${h(row.task_id)}</button>${tqBadge(row.workflow_state)}</div><strong>${h(row.title)}</strong><p>${h(tqLabel(tqTypes,row.source_type))}</p><footer><span>${tqSLA(row)}</span><button class="tq-button secondary" data-tq-open="${h(row.task_id)}">${h(tqT("查看详情","View Details"))}</button></footer></article>`).join("")}</div>`;
  }
  function tqHasFilters() {
    return Object.entries(tq.query || {}).some(([key,value])=>!["scope","status_group","page","page_size"].includes(key)&&value&&(!Array.isArray(value)||value.length));
  }
  function tqFilterValue(key) { const value=tq.filters[key];return Array.isArray(value)?value:typeof value==="string"&&value?[value]:[]; }
  function tqMulti(key,label,options) {
    const selected=tqFilterValue(key);
    return `<details class="tq-multi"><summary>${h(label)}<span>${selected.length?`${selected.length}${tqT("项"," selected")}`:tqT("全部","All")}</span></summary><div class="tq-multi-menu"><input type="search" placeholder="${h(tqT("搜索选项","Find option"))}" data-tq-option-search="${key}" aria-label="${h(`${tqT("搜索","Find")} ${label}`)}">${options.map(([value,name])=>`<label data-tq-option-label="${h(name.toLowerCase())}"><input type="checkbox" data-tq-filter-multi="${key}" value="${h(value)}" ${selected.includes(value)?"checked":""}>${h(name)}</label>`).join("")}</div></details>`;
  }
  function tqFilterBar() {
    const teamScope=["team","authorized"].includes(tq.filters.scope);
    const input=(key,label,type="text")=>`<label class="tq-field"><span>${h(label)}</span><input type="${type}" data-tq-filter="${key}" value="${h(type==="date"&&tq.filters[key]?.length>10?tqDate(key==="updated_to"?new Date(new Date(tq.filters[key]).getTime()-86400000).toISOString():tq.filters[key],true):tq.filters[key] || "")}" ${key==="q"?'maxlength="100"':""}></label>`;
    const select=(key,label,options,disabled=false)=>`<label class="tq-field"><span>${h(label)}</span><select data-tq-filter="${key}" ${disabled?"disabled":""}><option value="">${h(tqT("全部","All"))}</option>${options.map(([value,name])=>`<option value="${h(value)}" ${tq.filters[key]===value?"selected":""}>${h(name)}</option>`).join("")}</select></label>`;
    const priorities=[["high",tqT("高","High")],["medium",tqT("中","Medium")],["low",tqT("低","Low")]];
    const types=Object.keys(tqTypes).map(key=>[key,tqLabel(tqTypes,key)]);
    const states=Object.keys(tqStates).map(key=>[key,tqLabel(tqStates,key)]);
    const quick=(key,label,options)=>{
      const selected=tq.query[key] || [];
      return `<label class="tq-field"><span>${h(label)}</span><select data-tq-quick-filter="${key}" aria-label="${h(label)}"><option value="">${h(tqT("全部","All"))}</option>${selected.length>1?`<option value="__multiple__" selected>${h(tqT(`已选${selected.length}项`,`${selected.length} selected`))}</option>`:""}${options.map(([value,name])=>`<option value="${h(value)}" ${selected.length===1&&selected[0]===value?"selected":""}>${h(name)}</option>`).join("")}</select></label>`;
    };
    const names={source_types:tqT("类型","Type"),workflow_states:tqT("状态","Status"),status_group:tqT("状态分组","Status Group"),sla_state:tqT("时限","SLA"),priority:tqT("优先级","Priority"),q:tqT("关键词","Keyword"),updated_from:tqT("更新自","Updated From"),updated_to:tqT("更新至","Updated To"),owner_id:tqT("处理人","Owner"),team_id:tqT("团队","Team"),partner_id:tqT("合作方","Partner"),customer_id:tqT("客户","Customer"),external_system:tqT("系统","System")};
    const values={source_types:types,workflow_states:states,priority:priorities,status_group:[["active",tqT("未完成","Active")],["terminal",tqT("已完成/关闭","Completed / Closed")],["all",tqT("全部状态","All Statuses")]],sla_state:[["normal",tqT("正常","Normal")],["warning",tqT("即将超时","Warning")],["overdue",tqT("已超时","Overdue")],["unconfigured",tqT("未配置","Not Configured")]],team_id:(tq.options.teams || []).map(team=>[team.id,team.name]),owner_id:[["unassigned",tqT("未分配","Unassigned")],...(tq.options.users || []).map(user=>[user.user_id,user.display_name])]};
    const active=Object.entries(tq.query).filter(([key,value])=>!["scope","page","page_size","snapshot_id","sort_by","direction"].includes(key)&&value&&(!Array.isArray(value)||value.length)&&!(key==="status_group"&&value==="active"));
    const chips=active.flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(item=>`<button type="button" class="dev-chip" data-tq-remove-filter="${h(key)}" ${Array.isArray(value)?`data-tq-remove-value="${h(item)}"`:""} aria-label="${h(`${tqT("移除","Remove")} ${names[key] || key}`)}">${h(names[key] || key)}：${h(values[key]?.find(([value])=>value===item)?.[1] || (/^updated_/.test(key)?tqDate(key==="updated_to"?new Date(new Date(item).getTime()-86400000).toISOString():item,true):String(item)))}<span aria-hidden="true">×</span></button>`)).join("");
    return `<section class="tq-filters admin-filter-shell" aria-label="${h(tqT("任务筛选","Task Filters"))}"><div class="admin-filter-quick">${quick("workflow_states",tqT("任务状态","Task Status"),states)}${quick("source_types",tqT("任务类型","Task Type"),types)}${quick("priority",tqT("优先级","Priority"),priorities)}${tqButton("filters",`${tqIcon("filter")}${h(tqT("筛选器","Filters"))}`,`aria-expanded="${tq.expanded}" aria-controls="tq-filter-panel"`)}</div>
      ${tq.expanded?`<div class="admin-filter-panel" id="tq-filter-panel"><div class="tq-expanded-filter">${input("q",tqT("关键词","Keyword"))}${tqMulti("source_types",tqT("任务类型","Task Type"),types)}${tqMulti("workflow_states",tqT("任务状态","Task Status"),states)}${tqMulti("priority",tqT("优先级","Priority"),priorities)}${select("status_group",tqT("状态分组","Status Group"),values.status_group)}${select("sla_state",tqT("处理时限","SLA"),values.sla_state)}${select("team_id",tqT("责任团队","Team"),values.team_id,!teamScope)}${select("owner_id",tqT("处理人","Owner"),values.owner_id,!teamScope)}${input("partner_id",tqT("合作方ID","Partner ID"))}${input("customer_id",tqT("客户ID","Customer ID"))}${input("updated_from",tqT("更新开始日期","Updated From"),"date")}${input("updated_to",tqT("更新结束日期","Updated To"),"date")}${(!tq.filters.source_types?.length || tq.filters.source_types.some(type=>["integration","data_backfill"].includes(type)))?select("external_system",tqT("来源系统","Source System"),["CRM","IMC","Payment","Postback","Events"].map(value=>[value,value])):""}</div><div class="admin-filter-actions">${tqButton("filters_reset",h(tqT("重置条件","Reset Conditions")))}${tqButton("filters_cancel",h(tqT("取消","Cancel")))}${tqButton("query",h(tqT("应用筛选","Apply Filters")),"","primary")}</div></div>`:""}
      ${chips?`<div class="tq-chips admin-filter-tags" aria-label="${h(tqT("已生效筛选","Applied Filters"))}">${chips}${tqButton("reset",h(tqT("清空筛选","Clear Filters")))}</div>`:""}</section>`;
  }
  function tqMetrics() {
    const summary=tq.result?.summary || {};
    const definitions=[
      ["mine",tqT("我的待办","My Active Tasks"),summary.mine_active_count,tqT("本人负责的全部未完成任务，包含等待补件、审批和执行","All active tasks owned by you, including materials, approvals and execution")],
      ["claimable",tqT("待认领","Unclaimed"),summary.claimable_count,tqT("当前授权责任池中可以认领的任务","Unclaimed tasks in your authorized pools")],
      ["warning",tqT("即将超时","Due Soon"),summary.scope_warning_count,tqT("当前范围中的预警任务，不受其他筛选影响","Warning tasks within the selected scope, independent of other filters")],
      ["overdue",tqT("已超时","Overdue"),summary.scope_overdue_count,tqT("当前范围中的超时任务，不自动关闭或放行","Overdue tasks in this scope; no automatic closure or release")],
      ["failed",tqT("执行失败","Execution Failed"),summary.scope_execution_failed_count,tqT("当前范围中执行失败的任务数，不是重试次数","Tasks with failed execution in this scope, not attempt counts")]
    ];
    return `<section class="tq-metrics" aria-label="${h(tqT("任务统计","Task Metrics"))}">${definitions.filter(([key])=>key!=="claimable" || tq.options.authorized_scopes?.includes("claimable")).map(([key,label,value,title])=>`<button data-tq-metric="${key}" title="${h(title)}"><span>${h(label)}${!["mine","claimable"].includes(key)?`<small>${h(tqT("当前范围","Current Scope"))}</small>`:""}</span><strong>${summary.status==="unavailable" || value===null || value===undefined?"—":h(value)}</strong></button>`).join("")}</section>${summary.status==="unavailable"?`<div class="tq-inline-warning">${h(tqT("统计暂不可用","Metrics are unavailable"))} ${tqButton("refresh",h(tqT("重试","Retry")))}</div>`:""}`;
  }
  function tqToolbar() {
    const selected=[...tq.selected];const rows=tq.result?.items || [];
    return `<div class="tq-table-toolbar">${selected.length?`<div class="tq-batch-actions"><strong>${h(tqT(`已选${selected.length}项`,`${selected.length} selected`))}</strong>${tqButton("batch_claim",h(tqT("批量认领","Claim Selected")),selected.every(id=>tqCan(rows.find(row=>row.task_id===id),"claim"))?"":`disabled title="${h(tqT("所选任务中包含不可认领项","Some selected tasks cannot be claimed"))}"`)}${tqButton("batch_assign",h(tqT("批量转办","Assign Selected")),selected.every(id=>tqCan(rows.find(row=>row.task_id===id),"assign"))?"":`disabled title="${h(tqT("所选任务中包含不可转办项","Some selected tasks cannot be assigned"))}"`)}${tqButton("clear_selection",h(tqT("取消选择","Clear Selection")))}</div>`:`<span>${h(tqT(`共${tq.result?.meta?.total ?? 0}条任务`,`${tq.result?.meta?.total ?? 0} tasks`))}</span>`}</div>`;
  }
  function tqPagination() {
    const meta=tq.result?.meta || {page:1,page_size:tq.query.page_size,total:0,pages:0};
    return `<footer class="tq-pagination"><div><label>${h(tqT("每页","Per Page"))}<select data-tq-page-size aria-label="${h(tqT("每页条数","Rows per page"))}">${[10,20,50].map(size=>`<option ${meta.page_size===size?"selected":""}>${size}</option>`).join("")}</select></label><span>${h(tqT(`共${meta.total}条`,`${meta.total} total`))}</span><small>${h(tqT("来源快照","Source Snapshot"))} ${h(tqDate(meta.snapshot_at || meta.as_of))}</small></div><div class="tq-page-controls">${tqIconButton("previous","left",tqT("上一页","Previous Page"),meta.page<=1?"disabled":"")}<span>${h(tqT(`第${meta.page}页`, `Page ${meta.page}`))}${meta.pages?` / ${meta.pages}`:""}</span>${tqIconButton("next","right",tqT("下一页","Next Page"),meta.page>=meta.pages?"disabled":"")}<label>${h(tqT("跳至","Go To"))}<input type="number" min="1" max="${Math.max(meta.pages,1)}" value="${meta.page}" data-tq-page-jump aria-label="${h(tqT("跳转页码","Page number"))}"></label>${tqButton("jump",h(tqT("确定","Go")))}</div></footer>`;
  }
  function taskQueuePage() {
    if (!tqEnsure()) return `<section class="tq-page"><h1>${h(tqT("任务队列","Task Queue"))}</h1><div class="tq-error">AFF-50301 · ${h(tqT("任务服务尚未就绪","Task service is unavailable"))}</div></section>`;
    const scopes={mine:tqT("我的待办","My Tasks"),claimable:tqT("待认领","Unclaimed"),team:tqT("团队任务","Team Tasks"),authorized:tqT("全部可见","All Visible")};
    return `<section class="tq-page" aria-label="${h(tqT("任务队列","Task Queue"))}"><header class="tq-page-head"><h1>${h(tqT("任务队列","Task Queue"))}</h1><small>存量任务时限按业务快照 ${h(tqDate(tq.result?.meta?.snapshot_at || tq.result?.meta?.as_of || prototype.taskQueue.clock))}（UTC+8）计算</small></header>
      ${tq.notice?`<div class="tq-notice" role="status"><span>${h(tq.notice)}</span>${tqIconButton("dismiss_notice","close",tqT("关闭提示","Dismiss"))}</div>`:""}
      ${!navigator.onLine?`<div class="tq-error" role="alert">${h(tqT("连接异常，所有写操作已暂停","Connection unavailable. Write operations are paused."))}</div>`:""}
      ${["partial","missing","stale"].includes(tq.result?.data_quality?.status)?`<div class="tq-inline-warning" role="status">${h(tqT(({partial:"部分来源数据暂不可用",missing:"存在待补充的关键数据",stale:"来源数据已超过更新时限"})[tq.result.data_quality.status],({partial:"Some source data is unavailable",missing:"Required source data is missing",stale:"Source data is out of date"})[tq.result.data_quality.status]))}${tq.result.data_quality.missing_fields?.length?` · ${h(tq.result.data_quality.missing_fields.map(key=>tqFieldLabels[key] || key).join(" / "))}`:""}</div>`:""}
      ${tq.error?`<div class="tq-error" role="alert"><strong>${h(tq.error.code || "AFF-50002")}</strong> ${h(tq.error.message || tq.error.display_message || tqT("加载失败","Loading failed"))}<small>${h(tq.error.trace_id || "trace-task-read")}</small>${tq.result?`<p>${h(tqT("查询失败，以下为上次结果","Query failed. Previous results are shown below."))}</p>`:""}${tqButton("refresh",h(tqT("重试","Retry")))}</div>`:""}
      ${state.scenario==="forbidden"?"":`${tqMetrics()}<div class="tq-scope" role="group" aria-label="${h(tqT("任务范围","Task Scope"))}">${(tq.options.authorized_scopes || []).map(scope=>`<button data-tq-scope="${scope}" aria-pressed="${tq.query.scope===scope}" class="${tq.query.scope===scope?"active":""}">${h(scopes[scope] || scope)}</button>`).join("")}</div>${tqFilterBar()}<section class="tq-table-section" aria-label="${h(tqT("任务列表","Task List"))}">${tqToolbar()}${tqTable()}${tqPagination()}</section>`}</section>`;
  }
  function tqFormFromTask(task) {
    const fields=task.sections?.processing?.fields || {};
    const draft=task.draft || {};
    const saved=draft.form_values || {};
    return {
      conclusion:draft.conclusion || task.sections?.processing?.allowed_conclusions?.[0] || "",
      reason:draft.reason || "",internal_note:draft.internal_note || "",evidence_ids:[...(draft.evidence_ids || [])],checklist:tqClone(draft.checklist || []),
      next_review_at:draft.next_review_at || "",proposed_amount:saved.proposed_amount?.amount || saved.proposed_amount || "",
      target_level:saved.target_level || fields.target_level_options?.[0] || "",proposal:saved.proposal || "maintain",
      effective_at:saved.effective_at || fields.effective_at || "",expires_at:saved.expires_at || fields.expires_at || "",
      correction:saved.correction || "remove_to_unassigned",member_ids:saved.member_ids || [],
      entry_type:saved.entry_type || fields.entry_type || fields.allowed_entry_types?.[0] || "partner",permanent:Boolean(saved.permanent),
      target_ref:saved.target_ref || fields.authorized_target_refs?.[0] || "",scope:saved.scope || fields.allowed_scopes?.[0] || fields.scope || "case",
      target_policy_ref:saved.target_policy_ref || fields.allowed_adjustment_config_refs?.[0] || "",
      appeal_outcome:saved.appeal_outcome || "uphold",recovery_route:saved.recovery_route || fields.recovery_routes?.[0] || "",
      proposed_owner_ref:saved.proposed_owner_ref || "",missing_event_ids:saved.missing_event_ids || fields.missing_event_ids || [],
      risk_action:saved.risk_action || fields.risk_actions?.[0] || "",
      scope_mode:saved.scope_mode || "source_cases",
      selected_case_refs:saved.selected_case_refs || (fields.case_refs || []).map(ref=>`${ref.customer_id}|${ref.commission_case_id}|${ref.settlement_case_id}`),
      global_escalation_reason:saved.global_escalation_reason || "",
      duration_policy_ref:saved.duration_policy_ref || fields.duration_policy_ref || "",
      extension_rule_ref:saved.extension_rule_ref || fields.extension_rule_ref || "",
      finance_action:saved.finance_action || fields.finance_action_options?.[0] || "reject_commission",
      partner_id:saved.partner_id || fields.partner_id || task.partner_id || "",
      credit_mode:saved.credit_mode || "credit_deduct",
      credit_rule_ref:saved.credit_rule_ref || fields.credit_rule_ref || "",
      ...saved
    };
  }
  function tqValue(value,key="") {
    if (value===null || value===undefined || value==="") return "—";
    if (typeof value==="boolean") return h(value?tqT("是","Yes"):tqT("否","No"));
    if (typeof value!=="object") {
      if(key==="responsible_role")return h(roleOwnerNames[value] || value);
      if(key==="request_kind")return h(tqPurposes[value] || value);
      if (key==="signal_status" && value==="rejected") return h(tqT("信号已驳回","Signal Rejected"));
      if (key==="task_result" && value==="rejected") return h(tqT("处置被否决","Disposition Rejected"));
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(value)) || /(?:_at|_until|_start|_end)$/.test(key) && /^\d{4}-/.test(String(value))) return `<time datetime="${h(value)}" title="${h(`${value} · ${tq.options?.timezone || "Asia/Shanghai"}`)}">${h(tqDate(value))}</time>`;
      return h(tqLabel(tqConclusions,String(value)));
    }
    if (value.currency && "amount" in value) return h(tqMoney(value));
    if (Array.isArray(value)) return value.length?`<div class="tq-value-list">${value.map(item=>`<div>${tqValue(item,key)}</div>`).join("")}</div>`:"—";
    if (value.display_name) return h(value.display_name);
    return `<dl class="tq-nested-facts">${Object.entries(value).filter(([name])=>!["business_jump_url","allowed_actions","trace_id"].includes(name)).map(([name,item])=>`<div><dt>${h(tqFieldLabels[name] || name)}</dt><dd>${tqValue(item,name)}</dd></div>`).join("")}</dl>`;
  }
  function tqFacts(values) {
    return `<dl class="tq-facts">${Object.entries(values).map(([key,value])=>`<div><dt>${h(tqFieldLabels[key] || key)}</dt><dd>${tqValue(value,key)}</dd></div>`).join("")}</dl>`;
  }
  function tqObjectButton(type,id,label,taskId,tab="overview") {
    return `<button class="tq-task-link" data-tq-object="${h(type)}" data-object-id="${h(id)}" data-object-task="${h(taskId)}" data-object-tab="${h(tab)}">${h(label || id)}</button>`;
  }
  function tqAffectedObjects(taskId) {
    try {
      const result=tqService().affectedObjects(taskId,tqContext());
      return `<section class="tq-detail-section tq-affected"><h3>受影响对象 <small>${result.items.filter(i=>i.type==="customer").length} 位客户 · ${result.items.filter(i=>i.type==="partner").length} 位合作者</small></h3>${result.items.map(item=>`<article><div><span class="tq-muted">${item.type==="customer"?"客户":"合作者"}</span><strong>${h(item.name)}</strong><small>${h(item.id)} · ${h(item.relations.join(" / "))}</small></div>${item.available?tqObjectButton(item.type,item.id,"查看详情",taskId):`<span class="tq-muted">${h(item.disabled_reason)}</span>`}</article>`).join("") || `<p class="tq-muted">当前任务未关联客户或合作者</p>`}</section>`;
    } catch(error) { return `<section class="tq-detail-section"><h3>受影响对象</h3><p class="tq-muted">${h(error.message || "关联对象暂不可用")}</p></section>`; }
  }
  function tqInspectionRoute(hash) {
    const path=String(hash || "").split("?")[0],params=new URLSearchParams(String(hash || "").split("?")[1] || "");
    return /^#\/(?:customer|partner)-360\/[^/]+$/.test(path)&&params.get("task_id")===tq.inspection?.taskId&&tq.inspection?.role===state.role;
  }
  function tqOpenObject(type,id,taskId,tab="overview") {
    try {
      tqService().reviewObject(taskId,type,id,tqContext());
      if(!tq.inspection || tq.inspection.taskId!==taskId || tq.inspection.role!==state.role){
        const source=taskObjectPageActive()?new URLSearchParams(location.hash.split("?")[1] || "").get("return_to"):location.hash;
        const returnHash=typeof source==="string"&&/^#\/(?:tasks|workbench)(?:\?|$)/.test(source)?source:`#/tasks?task_id=${encodeURIComponent(taskId)}`;
        tq.inspection={taskId,role:state.role,returnHash,drawerScroll:document.querySelector(".tq-drawer-body")?.scrollTop || 0,pageScroll:window.scrollY || 0};
      }
      tq.dialog=null;
      const params=new URLSearchParams({task_id:taskId,tab,return_to:tq.inspection.returnHash});
      location.hash=`#/${type==="customer"?"customer":"partner"}-360/${encodeURIComponent(id)}?${params}`;
    } catch(error) {tq.notice=error.message || "关联资料无法查看";render();}
  }
  function tqReturnFromObject() {
    const params=new URLSearchParams(location.hash.split("?")[1] || ""),memo=tq.inspection;
    const fallback=`#/tasks?task_id=${encodeURIComponent(params.get("task_id") || "")}`;
    const back=memo?.role===state.role?memo.returnHash:params.get("return_to");
    const safe=typeof back==="string"&&/^#\/(?:tasks|workbench)(?:\?|$)/.test(back)?back:fallback;
    tq.dialog=null;
    if(tq.taskId)tqReadDetail();
    location.hash=safe;
  }
  function tqRestoreInspection() {
    const memo=tq.inspection;
    if(!memo || memo.role!==state.role || location.hash!==memo.returnHash)return;
    tq.inspection=null;
    requestAnimationFrame(()=>{window.scrollTo(0,memo.pageScroll);const body=document.querySelector(".tq-drawer-body");if(body)body.scrollTop=memo.drawerScroll;});
  }
  function taskObjectPageActive() {
    return state.routeId==="customer-360" || state.routeId==="partner-360"&&new URLSearchParams(location.hash.split("?")[1] || "").has("task_id");
  }
  function taskObjectPage() {
    const params=new URLSearchParams(location.hash.split("?")[1] || ""),taskId=params.get("task_id");
    const type=state.routeId==="customer-360"?"customer":"partner",partner=type==="partner";
    const back=`<button class="tm-button secondary" data-tq-object-back>← 返回原任务</button>`;
    let d;
    try {
      if(tq.role && tq.role!==state.role)taskQueueResetForRole();
      d=tqService().reviewObject(taskId,type,state.detailId,tqContext());
    } catch(error) {
      return `<section class="tq-object-page"><header class="tq-object-head"><h1>关联资料无法查看</h1>${back}</header><div class="tq-error" role="alert">${h(error.code || "AFF-50301")} · ${h(error.message || "请稍后重试")}</div></section>`;
    }
    const p=d.profile,missing="来源未提供";
    const objectLabels={active:"正常",verified:"已认证",pending:"待处理",valid_ftd:"有效FTD",ftd:"FTD",registered:"已注册",churned:"已流失",not_required:"无需认证",sync_failed:"同步失败"};
    const objectValue=value=>typeof value==="string"&&objectLabels[value]?objectLabels[value]:value;
    const facts=values=>tqFacts(Object.fromEntries(Object.entries(values).map(([key,value])=>[key,objectValue(value)??missing])));
    const table=(columns,rows,empty="暂无关联记录")=>rows.length?`<div class="tq-evidence-table"><table><thead><tr>${columns.map(c=>`<th scope="col">${h(c[1])}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>`<td>${c[2]?c[2](row):tqValue(row[c[0]],c[0])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="tq-muted">${h(empty)}</p>`;
    const section=(title,body)=>`<section class="tq-object-section"><h2>${h(title)}</h2>${body}</section>`;
    const objectLink=(kind,id,label,tab="overview")=>id?tqObjectButton(kind,id,label,taskId,tab):missing;
    const caseFacts=r=>facts({"客户编号":r.customer_id,"合作者编号":r.partner_id,"佣金案件":r.commission_case_id,"结算案件":r.settlement_case_id,"结算批次（仅聚合）":r.settlement_batch_id,"佣金金额":r.amount===null?null:{amount:r.amount,currency:"USD"},"冻结金额":r.frozen_amount===null?null:{amount:r.frozen_amount,currency:"USD"},"结算状态":r.status,"原因":r.reason,"来源版本":r.source_version,"限制引用":r.release_targets});
    const selectedCase=d.cases.find(r=>r.settlement_case_id===params.get("settlement_case_id"));
    const cases=table([
      ["customer_id","客户",r=>objectLink("customer",r.customer_id,r.customer_id)],
      ["commission_case_id","佣金案件"],["settlement_case_id","结算案件"],
      ["amount","佣金金额",r=>r.amount===null?missing:tqMoney({amount:r.amount,currency:"USD"})],
      ["status","结算状态",r=>tqBadge(r.status)],
      ["in_task_scope","任务范围",r=>r.in_task_scope?"本任务涉及":"其他关联案件"],
      ["detail","详情",r=>`<button class="tq-task-link" data-tq-object-case="${h(r.settlement_case_id)}" aria-expanded="${selectedCase?.settlement_case_id===r.settlement_case_id}">查看案件</button>`]
    ],d.cases,"暂无佣金或结算案件")+(selectedCase?`<div class="tq-object-case-panel" tabindex="-1"><h3>案件详情 · ${h(selectedCase.settlement_case_id)}</h3>${caseFacts(selectedCase)}</div>`:"");
    const tasks=table([["task_id","任务",r=>`<button class="tq-task-link" data-tq-linked-task="${h(r.task_id)}">${h(r.task_id)}</button>`],["title","内容"],["status","状态",r=>tqBadge(r.status)],["owner","处理人"],["updated_at","更新时间"]],d.tasks);
    const basic=facts({"编号":p.id,"名称":p.name,"国家":p.country,"CRM编号":p.crm_id,"CRM账户状态":p.crm_status,"邮箱":p.email_masked,"手机号":p.phone_masked,"注册时间":p.registered_at,"KYC状态":p.kyc_status,...(partner?{"主体类型":p.type==="institution"?"机构":p.type==="individual"?"个人":null,"KYB状态":p.kyb_status,"信用等级":p.credit_level}:{"转化阶段":p.lifecycle}),"风险档":p.risk_band,"数据截至":d.as_of});
    const clients=table([["id","客户",r=>objectLink("customer",r.id,r.name)],["id","客户编号"],["country","国家"],["lifecycle","转化阶段",r=>h(objectValue(r.lifecycle) || missing)],["risk_band","风险档"]],d.customers);
    const account=p.account_facts;
    const accountFacts=account?facts({"统计范围":account.period,"累计入金":{amount:account.deposit,currency:account.currency},"累计出金":{amount:account.withdrawal,currency:account.currency},"净入金":{amount:account.net_deposit,currency:account.currency},"交易活跃天数":account.active_days,"标准交易手数":account.standard_lots}):`<p class="tq-muted">来源未提供入出金、交易汇总，不能用任务影响金额替代。</p>`;
    const events=table([["id","风险事件"],["type","事件类型"],["reason","原因"],["determination","认定状态",r=>tqBadge(r.determination)],["rule","规则"],["rule_version","规则版本"],["occurred","发生时间"]],d.events,"暂无关联风险事件");
    const tabsForObject=partner?[["overview","概览"],["promotion","客户与推广"],["compliance","合规与资料"],["finance","财务与结算"],["risk","风险与信用"],["follow-up","跟进与审计"]]:[["overview","概览"],["attribution","归属与转化"],["finance","佣金与结算"],["risk","风险与关联"],["events","事件时间线"]];
    let body="";
    if(state.tabId==="overview"){
      body=section(partner?"合作者资料":"客户资料",basic)+section(partner?"关联客户":"归属合作者",partner?clients:objectLink("partner",p.partner_id,d.partner?.name || p.partner_id))+section("关联案件",cases);
    } else if(state.tabId==="compliance"){
      body=section("CRM资料与认证",basic)+section("收款与税务资料",facts({"收款主体":null,"受益所有人":null,"收款账户核验":null,"税务资料核验":null}));
    } else if(state.tabId==="promotion"){
      body=section("关联客户",clients)+section("推广资料",facts({"活动配置":null,"回传配置":null}));
    } else if(state.tabId==="attribution"){
      const attr=p.attribution || {};
      body=section("归属资料",objectLink("partner",p.partner_id,d.partner?.name || p.partner_id)+facts({"渠道":attr.channel,"推广链接":attr.link_id || attr.linkId,"Sub ID":attr.sub_id || attr.subId,"归属规则":attr.rule,"锁定时间":attr.locked_at || attr.attributedAt}))+section("转化阶段",table([["stage","阶段"],["at","达成时间"]],p.milestones || [],"来源未提供阶段达成时间"))+section("入出金与交易汇总",accountFacts);
    } else if(state.tabId==="finance"){
      body=(!partner?section("入出金与交易汇总",accountFacts):"")+section("佣金与结算案件",cases);
      if(partner)for(const [key,title] of [["commissions","其他佣金记录"],["statements","结算单"],["withdrawals","提现记录"],["taxRecords","税务记录"],["reversals","冲正与追回"]]){
        body+=section(title,table([["id","编号"],["name","内容"],["amount","金额 / 净额",r=>r.amount??r.net??r.withheld??missing],["status","状态",r=>tqBadge(r.status)]],d.funds[key] || [],"当前来源未提供该合作者的关联记录"));
      }
    } else if(state.tabId==="risk"){
      body=section("风险快照",facts({"风险档":p.risk_band,...(partner?{"信用等级":p.credit_level}:{}),"当前任务":taskId}))+section("风险事件",events)+section("关联处理任务",tasks);
    } else {
      body=section(partner?"跟进任务":"转化时间线",partner?tasks:table([["stage","阶段"],["at","达成时间"]],p.milestones || []))+section("风险事件",events)+section("处理历史",d.history.length?d.history.map(entry=>`<article class="tq-object-history">${facts({"任务":entry.task_id,"时间":entry.created_at || entry.at || entry.time,"动作":entry.action || entry.type,"说明":entry.summary || entry.reason || entry.message})}</article>`).join(""):`<p class="tq-muted">暂无处理记录</p>`);
    }
    return `<div class="tq-object-page"><header class="tq-object-head"><div><small>${partner?"合作者360":"客户360"} · ${h(p.id)}</small><h1>${h(p.name)}</h1><span>${h(p.country || missing)} · ${h(p.risk_band || missing)}${partner?` · ${h(p.credit_level || missing)}`:""}</span></div>${back}</header><div class="tq-object-context"><span>来源任务 ${h(taskId)}</span><span>数据截至 ${h(tqDate(d.as_of))}</span></div><nav class="p360-tabs" aria-label="关联资料页签">${tabsForObject.map(([key,label])=>`<button class="${state.tabId===key?"active":""}" data-tq-object-tab="${key}" aria-current="${state.tabId===key?"page":"false"}">${h(label)}</button>`).join("")}</nav>${body}<footer class="tq-object-footer">${back}</footer></div>`;
  }
  function tqEvidenceItems(task) {
    return task?.evidence_refs?.length?task.evidence_refs:task?.sections?.evidence?.items || [];
  }
  function tqEvidenceBody(item) {
    const detail=item?.detail;
    const metadata=tqFacts({
      "证据编号":item?.evidence_id,"所属任务":item?.task_id || tq.taskId,
      "名称":item?.name,"类型":item?.kind==="source_record"?tqT("来源核验记录","Source Record"):item?.kind,"来源系统":item?.source_system || item?.source,
      "来源对象":item?.source_ref?.id,"来源版本":item?.source_version,
      "任务快照版本":item?.snapshot_version,"采集时间":item?.collected_at,
      "摘要校验":item?.hash || tqT("来源未提供","Not provided by source"),
      "核验状态":item?.scan_status || item?.status
    });
    if(!detail)return `${metadata}<pre class="tq-evidence-text">${h(item?.content || item?.summary || tqT("暂无可预览内容","Preview content is unavailable"))}</pre>`;
    return `${metadata}${tqAffectedObjects(item.task_id || tq.taskId)}<section class="tq-evidence-section"><h3>${h(tqT("核验摘要","Evidence Summary"))}</h3><p>${h(detail.summary)}</p><dl class="tq-facts">${(detail.facts || []).map(fact=>`<div><dt>${h(fact.label)}</dt><dd>${tqValue(fact.value,fact.key)}</dd></div>`).join("")}</dl></section>
      ${(detail.records || []).map(group=>`<section class="tq-evidence-section"><h3>${h(group.title)}</h3>${group.rows?.length?`<div class="tq-evidence-table"><table><thead><tr>${group.columns.map(col=>`<th scope="col">${h(col.label)}</th>`).join("")}</tr></thead><tbody>${group.rows.map(row=>`<tr>${group.columns.map(col=>`<td>${tqValue(row[col.key],col.key)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="tq-muted">${h(tqT("暂无关联明细","No related records"))}</p>`}</section>`).join("")}
      ${detail.business_facts?`<section class="tq-evidence-section"><h3>${h(tqT("业务依据","Business Facts"))}</h3>${tqFacts(detail.business_facts)}</section>`:""}`;
  }
  function tqSummary(task) {
    const fields={...(task.sections?.processing?.fields || {})};
    fields.settlement_status ||= task.funds_status;
    return `${tqAffectedObjects(task.task_id)}<section class="tq-detail-section"><h3>${h(tqT("任务概况","Task Overview"))}</h3>${tqFacts({
      [tqT("任务类型","Task Type")]:tqLabel(tqTypes,task.source_type),[tqT("任务目的","Purpose")]:tqPurposes[task.task_purpose] || task.task_purpose,
      [tqT("责任团队","Team")]:task.team?.name,[tqT("处理人","Owner")]:task.owner?.display_name || tqT("未认领","Unclaimed"),
      [tqT("优先级","Priority")]:({high:"高",medium:"中",low:"低"})[task.priority],[tqT("影响金额","Impact")]:task.impact,
      risk_band:task.risk_level,[tqT("信用等级","Credit Level")]:task.credit_level,[tqT("来源编号","Source ID")]:task.source_ref?.id,
      [tqT("来源版本","Source Version")]:task.source_versions,[tqT("配置快照","Configuration Snapshot")]:task.config_versions,
      task_result:task.result
    })}</section><section class="tq-detail-section"><h3>${h(tqT("领域状态","Domain States"))}</h3><div class="tq-domain-states"><div><span>${h(tqT("任务","Task"))}</span>${tqBadge(task.workflow_state)}</div><div><span>${h(tqT("风险","Risk"))}</span>${tqBadge(task.risk_status || task.determination_status || fields.current_determination || fields.signal_status || "none")}</div><div><span>${h(tqT("资金","Funds"))}</span>${tqBadge(task.settlement_status || task.fund_status || fields.settlement_status || "not_applicable")}</div></div></section><section class="tq-detail-section"><h3>${h(tqT("处理时限","Service Level"))}</h3><div class="tq-detail-sla">${tqSLA(task)}</div>${tqFacts({[tqT("起算时间","Started")]:task.sla?.started_at,[tqT("截止时间","Due")]:task.sla?.due_at,[tqT("SLA版本","SLA Version")]:task.sla?.rule_version,[tqT("升级记录","Escalations")]:task.escalation_refs})}</section>
      <section class="tq-detail-section"><h3>${h(tqT("业务事实","Business Facts"))}</h3>${tqFacts(fields)}</section>${task.related_task_refs?.length?`<section class="tq-detail-section"><h3>${h(tqT("关联任务","Related Tasks"))}</h3>${task.related_task_refs.map(ref=>`<button class="tq-task-link" data-tq-open="${h(ref.task_id || ref)}">${h(ref.task_id || ref)}</button>`).join("")}</section>`:""}`;
  }
  function tqFormField(key,label,type="text",options=[],disabled=false) {
    const value=tq.form?.[key] ?? "";
    const attributes=`data-tq-form="${key}" ${disabled?"disabled":""}`;
    const dateValue=type==="datetime-local" && value?(/[zZ]|[+-]\d\d:\d\d$/.test(String(value))?tqDate(value).replace(" ","T").slice(0,16):String(value).slice(0,16)):value;
    const input=type==="select"?`<select ${attributes}>${options.map(option=>{const [id,name]=Array.isArray(option)?option:[option,tqConclusions[option] || option];return `<option value="${h(id)}" ${String(value)===String(id)?"selected":""}>${h(name)}</option>`;}).join("")}</select>`:type==="textarea"?`<textarea ${attributes} rows="${key==="reason"?4:3}" maxlength="${key==="reason"?1000:2000}">${h(value)}</textarea>`:type==="checkbox"?`<input type="checkbox" ${attributes} ${value?"checked":""}>`:`<input type="${type}" ${attributes} value="${h(dateValue)}" ${type==="number"?'step="0.01" min="0"':""}>`;
    return `<label class="tq-field ${type==="textarea"?"tq-field-wide":""} ${type==="checkbox"?"tq-check-field":""}"><span>${h(label)}</span>${input}</label>`;
  }
  function tqProcessingForm(task) {
    const packet=task.sections?.processing || {};const fields=packet.fields || {};
    const canEdit=tqCan(task,"save_draft");const disabled=!canEdit;let special="";
    const select=(key,label,options)=>tqFormField(key,label,"select",options,disabled);
    const input=(key,label,type="text")=>tqFormField(key,label,type,[],disabled);
    const conclusionOptions=(packet.allowed_conclusions || []).map(key=>[key,tqConclusions[key] || key]);
    if (task.task_purpose==="cluster_member_correction") special+=`${select("correction",tqT("纠错方式","Correction"),[["remove_to_unassigned","移出为未分组"],["split_new_cluster","拆分为新集群"]])}<fieldset class="tq-member-picker"><legend>${h(tqT("拟调整成员","Members to Correct"))}</legend>${(fields.member_ids || fields.members || []).map(member=>{const id=typeof member==="string"?member:member.customer_id || member.id;return `<label><input type="checkbox" data-tq-member="${h(id)}" ${tq.form.member_ids.includes(id)?"checked":""} ${disabled?"disabled":""}>${h(id)}</label>`;}).join("")}</fieldset>`;
    if (task.task_purpose==="blacklist_add") special+=`${select("entry_type",tqT("名单类型","Entry Type"),fields.allowed_entry_types || [fields.entry_type || "partner"])}${select("target_ref",tqT("名单对象","Entry Target"),fields.authorized_target_refs || [])}${select("scope",tqT("适用范围","Scope"),fields.allowed_scopes || [fields.scope || "case"])}${input("effective_at",tqT("生效时间","Effective At"),"datetime-local")}${input("expires_at",tqT("失效时间","Expires At"),"datetime-local")}`;
    if (["risk_investigation","cluster_determination"].includes(task.task_purpose) || task.source_type==="hold_extend") {
      if (tq.form.conclusion==="observe") special+=input("next_review_at",tqT("复查时间（必填）","Review At (Required)"),"datetime-local");
    }
    if (["guarantee_offset","chargeback"].includes(task.source_type)) special+=input("proposed_amount",tqT("拟处理金额（USD）","Proposed Amount (USD)"),"number");
    if (task.source_type==="chargeback") special+=select("recovery_route",tqT("追回路径","Recovery Route"),fields.recovery_routes || []);
    if (task.source_type==="credit_review") special+=`${select("target_level",tqT("目标信用等级","Target Credit Level"),fields.target_level_options || ["C0","C1","C2","C3","C4"])}${input("effective_at",tqT("生效时间","Effective At"),"datetime-local")}`;
    if (task.source_type==="circuit_breaker") {
      if (tq.form.conclusion==="adjust") special+=`${select("target_policy_ref",tqT("目标生效政策","Target Active Policy"),fields.allowed_adjustment_config_refs || [])}${input("effective_at",tqT("生效时间","Effective At"),"datetime-local")}`;
    }
    if (task.source_type==="appeal") special+=select("appeal_outcome",tqT("申诉决定","Appeal Outcome"),[["uphold","维持原决定"],["amend","改判"]]);
    if (task.source_type==="attribution_review") {
      const candidates=(fields.authorized_owner_refs || fields.claimant_refs || []).map(ref=>[typeof ref==="string"?ref:ref.id || ref.partner_id,typeof ref==="string"?ref:ref.label || ref.id || ref.partner_id]);
      special+=select("proposed_owner_ref",tqT("建议归属","Proposed Attribution"),[["","请选择"],...candidates]);
    }
    if (task.source_type==="data_backfill") special+=`<fieldset><legend>${h(tqT("本次补数事件","Events to Backfill"))}</legend>${(fields.missing_event_ids || []).map(id=>`<label class="tq-checkbox-line"><input type="checkbox" data-tq-backfill="${h(id)}" ${tq.form.missing_event_ids.includes(id)?"checked":""} ${disabled?"disabled":""}>${h(id)}</label>`).join("")}</fieldset>`;
    const evidence=tqEvidenceItems(task).map(item=>({...item,scan_status:item.scan_status || item.status,collected_at:item.collected_at || item.created_at}));
    return `${tqAffectedObjects(task.task_id)}<section class="tq-detail-section"><h3>${h(tqT("证据与材料","Evidence & Materials"))}</h3><div class="tq-evidence-list">${evidence.length?evidence.map(item=>`<article><label><input type="checkbox" data-tq-evidence="${h(item.evidence_id)}" ${tq.form.evidence_ids.includes(item.evidence_id)?"checked":""} ${disabled||item.invalidated||item.scan_status!=="clean"?"disabled":""}><span><strong>${h(item.name || item.summary || item.evidence_id)}</strong><small>${h(item.source_system || item.source || "")} · ${h(item.source_version || item.version || "—")} · ${h(tqDate(item.collected_at))}</small></span></label><div>${tqBadge(item.invalidated?"failed":item.scan_status)}<button class="tq-task-link" data-tq-evidence-view="${h(item.evidence_id)}">${h(tqT("预览","Preview"))}</button></div></article>`).join(""):`<p class="tq-muted">${h(tqT("暂无可引用证据","No evidence is available"))}</p>`}</div></section>
      <section class="tq-detail-section"><h3>${h(tqPurposes[task.task_purpose] || tqLabel(tqTypes,task.source_type))}</h3><details class="tq-source-facts"><summary>${h(tqT("业务依据与源版本","Business Facts & Source Versions"))}</summary>${tqFacts(fields)}</details>
      ${packet.blocking_reasons?.length?`<div class="tq-inline-warning">${packet.blocking_reasons.map(reason=>`<p>${h(typeof reason==="string"?reason:reason.message || reason.reason)}</p>`).join("")}</div>`:""}
      ${task.source_type==="offboarding_step"?`<div>${tqFacts({offboarding_id:fields.offboarding_id,step_key:fields.step_key,predecessor_receipts:fields.predecessor_receipts})}${task.business_jump_url?tqButton("source",h(tqT("进入清退步骤","Open Offboarding Step"))):""}</div>`:task.source_type==="integration"?`<div class="tq-integration-actions">${tqFacts({integration_version:fields.integration_version,external_ref:fields.external_ref,last_status:fields.last_status,status_check:fields.status_check,attempt:fields.attempt,max_attempts:fields.max_attempts})}${tqWriteButton(task,"status_check",tqT("查询外部状态","Check External Status"))}${tqWriteButton(task,"retry_integration",tqT("受控重试","Controlled Retry"))}</div>`:`<div class="tq-form-grid">${conclusionOptions.length?select("conclusion",tqT("处理结论","Conclusion"),conclusionOptions):""}${special}${input("reason",tqT("结论说明 / 原因（10-1000字）","Reason (10–1000 characters)"),"textarea")}${input("internal_note",tqT("内部备注","Internal Note"),"textarea")}</div>`}
      ${(packet.checklist || []).length?`<fieldset class="tq-checklist"><legend>${h(tqT("处理检查单","Review Checklist"))}</legend>${packet.checklist.map((item,index)=>`<label><input type="checkbox" data-tq-checklist="${h(item.key || String(index))}" ${tq.form.checklist?.find(entry=>entry.key===(item.key || String(index)))?.checked?"checked":""} ${disabled?"disabled":""}>${h(item.label || item.name || item.key || item)}</label>`).join("")}</fieldset>`:""}
      ${task.source_type==="hold_extend" && task.business_jump_url?tqButton("source",h(tqT("进入来源案件申请解除","Open Case to Request Release"))):""}</section>
      ${tq.preview?`<section class="tq-detail-section tq-preview"><h3>${h(tqT("影响预览","Impact Preview"))}</h3>${tqFacts({[tqT("预览编号","Preview")]:tq.preview.preview_id,[tqT("影响金额","Impact")]:tq.preview.deduplicated_amount || tq.preview.amount,[tqT("审批角色","Required Roles")]:tq.preview.required_approver_roles,[tqT("有效至","Valid Until")]:tq.preview.expires_at})}${(tq.preview.before_after_items || []).map(item=>`<article><strong>${h(item.object_ref?.object_id || item.item_id)}</strong><div>${h(tqT("处理前","Before"))} ${tqValue(item.before)}</div><div>${h(tqT("处理后","After"))} ${tqValue(item.after)}</div></article>`).join("")}${tq.preview.blocking_errors?.length?`<div class="tq-error">${tq.preview.blocking_errors.map(h).join(" / ")}</div>`:""}</section>`:""}`;
  }
  function tqApprovalHistory(task) {
    const approvals=task.approval_refs || [];const executions=task.execution_refs || [];
    return `<section class="tq-detail-section"><h3>${h(tqT("审批记录","Approval History"))}</h3>${approvals.length?approvals.map(approval=>`<article class="tq-approval-card"><header><strong>${h(approval.approval_id || approval.id)}</strong>${tqBadge(approval.status || approval.approval_status)}</header>${tqFacts({[tqT("申请人","Applicant")]:approval.applicant,[tqT("提交时间","Submitted")]:approval.submitted_at || approval.created_at})}${tqApprovalChain(approval)}${tqButton("approval_link",h(tqT("查看审批","View Approval")),`data-tq-approval-id="${h(approval.approval_id || approval.id)}"`)}</article>`).join(""):`<p class="tq-muted">${h(tqT("暂无审批申请","No approval requests"))}</p>`}</section><section class="tq-detail-section"><h3>${h(tqT("执行结果","Execution Results"))}</h3>${executions.length?executions.map(execution=>`<article class="tq-approval-card"><header><strong>${h(execution.execution_id || execution.id)}</strong>${tqBadge(execution.status)}</header>${(execution.items || []).map(item=>`<div class="tq-execution-item"><span>${h(item.item_id)}</span>${tqBadge(item.status)}<small>${h(item.error_code || item.result_ref?.id || "—")}</small></div>`).join("")}${tqFacts({[tqT("结算检查","Settlement Checks")]:execution.settlement_checks})}${execution.status==="failed" || execution.status==="partial"?tqWriteButton(task,"retry_execution",tqT("重试失败项","Retry Failed Items"),`data-tq-execution-id="${h(execution.execution_id || execution.id)}"`):""}</article>`).join(""):`<p class="tq-muted">${h(tqT("暂无执行记录","No execution records"))}</p>`}</section>`;
  }
  function tqApprovalChain(approval) {
    if (demoSkipsApproval()) return `<p class="tq-muted">${h(tqT("历史审批记录","Historical Approval Record"))}</p>`;
    const chain=tqApprovalChainData(approval);
    return chain?.nodes?.length?`<ol class="tq-approval-chain">${chain.nodes.map(node=>`<li class="${node.node_id===chain.current_node_id?"current":""}"><div><strong>${h(prototype.roles[node.required_role] || node.required_role)}</strong>${tqBadge(node.status)}</div><small>${h(node.approver?.display_name || tqT("待分配","Unassigned"))}${node.decided_at?` · ${h(tqDate(node.decided_at))}`:""}</small>${node.reason?`<p>${h(node.reason)}</p>`:""}</li>`).join("")}</ol>`:`<p class="tq-muted">${h(tqT("审批链待分配","Approval routing pending"))}</p>`;
  }
  function tqApprovalChainData(approval) {
    if (approval.approval_chain || approval.chain) return approval.approval_chain || approval.chain;
    return {current_node_id:approval.nodes?.[approval.current_node_index]?.node_id,nodes:(approval.nodes || []).map(node=>({...node,required_role:node.required_role || node.role_code,approver:node.approver || node.reviewer}))};
  }
  function tqActivity(task) {
    const items=task.history?.items || task.sections?.history?.items || [];
    return `<section class="tq-detail-section"><h3>${h(tqT("操作记录","Activity"))}</h3>${items.length?`<ol class="tq-timeline">${items.map(item=>`<li><time>${h(tqDate(item.server_time || item.created_at || item.time))}</time><div><strong>${h(item.action_label || tqLabel(tqConclusions,item.action))}</strong><span>${h(item.actor?.display_name || item.actor || "—")}</span>${item.reason?`<p>${h(item.reason)}</p>`:""}<small>${h(item.trace_id || item.traceId || "")}</small></div></li>`).join("")}</ol>`:`<p class="tq-muted">${h(tqT("暂无操作记录","No activity"))}</p>`}</section>`;
  }
  function tqDetailFooter(task) {
    if (demoSkipsApproval() && task.workflow_state==="pending_approval") {
      return `<footer class="tq-drawer-footer"><span class="tq-muted">${h(tqT("历史待审任务","Historical Pending Task"))}</span><div>${tqWriteButton(task,"resume_without_review",tqT("继续执行","Continue Execution"))}</div></footer>`;
    }
    return `<footer class="tq-drawer-footer"><div>${tq.dirty?`<span class="tq-unsaved">${h(tqT("有未保存修改","Unsaved Changes"))}</span>`:`<span class="tq-muted">${h(tqT("版本","Version"))} ${h(task.version)}</span>`}</div><div>${tqWriteButton(task,"claim",tqT("认领任务","Claim Task"))}${tqWriteButton(task,"assign",tqT("转办","Assign"))}${tqWriteButton(task,"request_material",tqT("要求补件","Request Materials"))}${tq.detailTab==="processing" && !["integration","offboarding_step"].includes(task.source_type)?`${tqWriteButton(task,"save_draft",tqT("保存草稿","Save Draft"))}${task.source_type==="partner_followup"?tqWriteButton(task,"complete_followup","完成跟进"):tqWriteButton(task,"preview",tqT("影响预览","Preview Impact"))+tqWriteButton(task,"submit_review",tqT("提交处置","Submit for Approval"),tq.preview&&!tq.dirty?"":`disabled title="${h(tqT("请先保存并生成有效影响预览","Save the draft and generate a valid preview first"))}"`)}`:""}${tqWriteButton(task,"close",tqT("关闭任务","Close Task"))}</div></footer>`;
  }
  function taskQueueOverlay() {
    if (!location.hash.startsWith("#/tasks") && !location.hash.startsWith("#/workbench")) return "";
    let drawer="";
    if (tq.taskId && location.hash.startsWith("#/tasks")) {
      const task=tq.detail;
      drawer=`<div class="tq-drawer-backdrop"></div><aside class="tq-drawer" role="dialog" aria-modal="true" aria-labelledby="tq-detail-title" tabindex="-1"><header class="tq-drawer-head"><div><small>${h(tq.taskId)}</small><h2 id="tq-detail-title">${h(task?.title || tqT("任务详情","Task Details"))}</h2><div>${task?tqBadge(task.workflow_state):""}<span>${h(task?tqPurposes[task.task_purpose] || task.task_purpose:"")}</span></div></div>${tqIconButton("close_detail","close",tqT("关闭任务详情","Close Task Details"))}</header>${task?`<nav class="tq-detail-tabs" role="tablist">${[["overview","概览","Overview"],["processing","证据与处理","Evidence & Review"],["approvals","审批与执行","Approvals & Execution"],["activity","操作记录","Activity"]].map(([key,zh,en])=>`<button role="tab" data-tq-detail-tab="${key}" aria-selected="${tq.detailTab===key}" aria-controls="tq-detail-panel" id="tq-tab-${key}">${h(tqT(zh,en))}</button>`).join("")}</nav><div class="tq-drawer-body" id="tq-detail-panel" role="tabpanel" aria-labelledby="tq-tab-${tq.detailTab}">${tq.detailTab==="overview"?tqSummary(task):tq.detailTab==="processing"?tqProcessingForm(task):tq.detailTab==="approvals"?tqApprovalHistory(task):tqActivity(task)}</div>${tqDetailFooter(task)}`:`<div class="tq-drawer-body"><div class="tq-error">${h(tq.detailError?.code || "AFF-40401")} · ${h(tqT("任务不存在或无权查看","Task does not exist or you do not have access"))}</div></div>`}</aside>`;
    }
    return `${drawer}${tqDialog()}`;
  }
  function tqModalInput(key,label,type="text",value="",extra="") {
    return `<label class="tq-field"><span>${h(label)}</span>${type==="textarea"?`<textarea rows="4" data-tq-dialog-field="${key}" ${extra}>${h(value)}</textarea>`:`<input type="${type}" data-tq-dialog-field="${key}" value="${h(value)}" ${extra}>`}</label>`;
  }
  function tqDialog() {
    const dialog=tq.dialog;if (!dialog) return "";const task=tq.detail;let title="",body="",footer="";
    const form=dialog.form || {};
    const confirm=(label=tqT("确认","Confirm"),kind="primary")=>tqButton("dialog_confirm",h(label),"",kind);
    const cancel=tqButton("dialog_cancel",h(tqT("取消","Cancel")));
    if (dialog.kind==="unsaved") {
      title=tqT("未保存的修改","Unsaved Changes");body=`<p>${h(tqT("当前任务有未保存修改。请选择保存后继续、放弃修改或继续编辑。","This task has unsaved changes. Save, discard, or keep editing."))}</p>`;
      footer=`${tqButton("unsaved_keep",h(tqT("继续编辑","Keep Editing")))}${tqButton("unsaved_discard",h(tqT("放弃修改","Discard Changes")))}${tqButton("unsaved_save",h(tqT("保存并继续","Save & Continue")),"","primary")}`;
    } else if (dialog.kind==="claim" || dialog.kind==="batch_claim") {
      title=tqT(dialog.kind==="claim"?"认领任务":"批量认领",dialog.kind==="claim"?"Claim Task":"Claim Tasks");
      body=`<p>${h(tqT("确认认领以下任务？原处理时限保持不变。","Claim these tasks? Their original SLA remains unchanged."))}</p><ul class="tq-id-list">${dialog.ids.map(id=>`<li>${h(id)}</li>`).join("")}</ul>`;footer=cancel+confirm();
    } else if (["assign","batch_assign"].includes(dialog.kind)) {
      title=tqT(dialog.kind==="assign"?"指派 / 转办":"批量转办",dialog.kind==="assign"?"Assign Task":"Assign Tasks");
      const candidate=dialog.candidates || {teams:tq.options.teams,users:tq.options.users};const canPool=dialog.ids.length===1&&tqCan(task,"return_pool");
      body=`<div class="tq-form-grid"><label class="tq-field"><span>${h(tqT("目标团队","Target Team"))}</span><select data-tq-dialog-field="team_id"><option value="">${h(tqT("请选择","Choose"))}</option>${(candidate.teams || []).map(team=>`<option value="${h(team.id)}" ${form.team_id===team.id?"selected":""}>${h(team.name)}</option>`).join("")}</select></label><label class="tq-field"><span>${h(tqT("目标人员","Target Owner"))}</span><select data-tq-dialog-field="user_id"><option value="">${h(tqT("仅分配责任池","Assign to Pool"))}</option>${(candidate.users || []).filter(user=>!form.team_id||!user.team_id||user.team_id===form.team_id).map(user=>`<option value="${h(user.user_id)}" ${form.user_id===user.user_id?"selected":""}>${h(user.display_name)}</option>`).join("")}</select></label>${canPool?`<label class="tq-checkbox-line"><input type="checkbox" data-tq-dialog-field="return_pool" ${form.return_pool?"checked":""}>${h(tqT("退回当前责任池","Return to Current Pool"))}</label>`:""}</div>${tqModalInput("reason",tqT("转办原因（10-1000字）","Reason (10–1000 characters)"),"textarea",form.reason || "",'maxlength="1000"')}`;footer=cancel+confirm();
    } else if (dialog.kind==="request_material") {
      title=tqT("要求补件","Request Materials");body=`${tqModalInput("material_keys",tqT("材料清单（每行一项）","Material List (One Per Line)"),"textarea",form.material_keys || "")}<label class="tq-field"><span>${h(tqT("接收方","Recipient"))}</span><select data-tq-dialog-field="recipient"><option value="partner">${h(tqT("来源合作方","Source Partner"))}</option><option value="internal">${h(tqT("内部责任方","Internal Owner"))}</option><option value="crm">CRM</option></select></label>${tqModalInput("due_at",tqT("材料截止时间","Due At"),"datetime-local",form.due_at || "")}${tqModalInput("public_message",tqT("对外说明（接收方可见）","Message Visible to Recipient"),"textarea",form.public_message || "")}${tqModalInput("reason",tqT("内部原因","Internal Reason"),"textarea",form.reason || "")}`;footer=cancel+confirm(tqT("发送补件要求","Request Materials"));
    } else if (dialog.kind==="resume_without_review" || (demoSkipsApproval() && dialog.kind==="submit_review")) {
      title=tqT("确认提交处置","Confirm Disposition");
      body=`${tqFacts({[tqT("任务","Task")]:task?.task_id,[tqT("处理结论","Conclusion")]:tqConclusions[tq.form?.conclusion] || tq.form?.conclusion,[tqT("影响金额","Impact")]:tq.preview?.amount || tq.preview?.deduplicated_amount || task?.impact})}${dialog.kind==="resume_without_review"?tqModalInput("reason",tqT("继续处理原因（10-1000字）","Reason (10–1000 characters)"),"textarea",form.reason || ""):""}<label class="tq-checkbox-line"><input type="checkbox" data-tq-dialog-field="confirmed" ${form.confirmed?"checked":""}>${h(tqT("我已核对处理范围、金额和证据","I have checked the scope, amount and evidence"))}</label>`;
      footer=cancel+confirm(tqT("提交执行","Submit for Execution"));
    } else if (dialog.kind==="submit_review") {
      title=tqT("提交处置申请","Submit Disposition");body=`<p>${h(tqT("本申请将按冻结的证据与影响预览进入审批，批准前不会执行业务动作。","The evidence and impact preview are frozen for approval. No business action runs before approval."))}</p>${tqFacts({[tqT("任务","Task")]:task?.task_id,[tqT("处理结论","Conclusion")]:tqConclusions[tq.form?.conclusion] || tq.form?.conclusion,[tqT("影响金额","Impact")]:tq.preview?.amount || tq.preview?.deduplicated_amount,[tqT("审批角色","Required Roles")]:tq.preview?.required_approver_roles})}<label class="tq-checkbox-line"><input type="checkbox" data-tq-dialog-field="confirmed" ${form.confirmed?"checked":""}>${h(tqT("我已核对处理范围、金额、证据及审批路径","I have reviewed the scope, amount, evidence, and approval routing"))}</label>`;footer=cancel+confirm(tqT("提交审批","Submit for Approval"));
    } else if (dialog.kind==="close") {
      title=tqT("关闭任务","Close Task");body=`<p>${h(tqT("关闭只结束工作项，不解除关联风险或资金限制。","Closing this task does not remove risk or fund restrictions."))}</p><label class="tq-field"><span>${h(tqT("关闭原因","Closure Reason"))}</span><select data-tq-dialog-field="reason_code">${[["duplicate","重复任务"],["source_withdrawn","来源撤回"],["object_invalidated","对象合法失效"]].map(([value,label])=>`<option value="${value}" ${form.reason_code===value?"selected":""}>${h(label)}</option>`).join("")}</select></label>${tqModalInput(form.reason_code==="duplicate"||!form.reason_code?"replaced_by_task_id":"source_receipt_ref",tqT(form.reason_code==="duplicate"||!form.reason_code?"替代任务号":"领域证明 / 来源回执","Replacement Task / Domain Receipt"),"text",form.replaced_by_task_id || form.source_receipt_ref || "")}${tqModalInput("reason",tqT("关闭说明","Closure Reason"),"textarea",form.reason || "")}`;footer=cancel+confirm(tqT("确认关闭","Close Task"),"danger");
    } else if (["status_check","retry_integration","retry_execution"].includes(dialog.kind)) {
      title=tqT(({status_check:"查询外部状态",retry_integration:"受控重试",retry_execution:"重试失败执行项"})[dialog.kind],({status_check:"Check External Status",retry_integration:"Controlled Retry",retry_execution:"Retry Failed Items"})[dialog.kind]);
      body=`<p>${h(tqT(dialog.kind==="status_check"?"只查询原外部单号，不重新发送业务请求。":"仅重试明确失败且获原批准允许的项目，不改变业务对象、金额或外部幂等键。",dialog.kind==="status_check"?"Query the original external reference without resending the business request.":"Retry only confirmed failures within the original approved scope."))}</p>${tqModalInput("reason",tqT("操作原因","Reason"),"textarea",form.reason || "")}`;footer=cancel+confirm();
    } else if (dialog.kind==="release_source") {
      const source=task?.sections?.processing?.fields?.release_recheck_source;
      title=tqT("来源结算案件","Source Settlement Case");
      body=`${tqFacts({[tqT("原延长任务","Extension Task")]:task?.task_id,[tqT("结算案件","Settlement Case")]:source?.case_ref,[tqT("来源版本","Source Version")]:source?.expected_source_version,[tqT("拟解除限制及版本","Release Targets & Versions")]:source?.release_targets})}<p>${h(tqT("此处发起独立解除重检任务。原延长任务与冻结状态保持，解除须另行预览、审批并执行。","This creates an independent settlement recheck. The extension task and restrictions remain until separate review, approval and execution."))}</p>${tqModalInput("reason",tqT("重检申请原因（10-1000字）","Recheck Reason (10–1000 characters)"),"textarea",form.reason || "")}`;
      footer=cancel+confirm(tqT("发起 / 打开独立解除重检","Create / Open Independent Recheck"));
    } else if (dialog.kind==="export") {
      title=tqT("导出任务数据","Export Tasks");body=`${tqFacts({[tqT("导出范围","Export Scope")]:tqT(`当前查询全部${tq.result?.meta?.total || 0}条`,`All ${tq.result?.meta?.total || 0} matching tasks`),[tqT("导出字段","Columns")]:tqActiveColumns().filter(col=>!["select","actions"].includes(col.key)).map(col=>tqT(col.zh,col.en))})}${tqModalInput("reason",tqT("导出用途（10-1000字）","Export Purpose (10–1000 characters)"),"textarea",form.reason || "")}`;footer=cancel+confirm(demoSkipsApproval()?tqT("生成导出文件","Generate Export"):tqT("提交导出审批","Submit Export Request"));
    } else if (dialog.kind==="batch_result") {
      title=tqT("批量处理结果","Batch Results");const results=dialog.results || [];
      body=`<p>${h(tqT(`成功${results.filter(item=>item.success).length}项，失败${results.filter(item=>!item.success).length}项`,`${results.filter(item=>item.success).length} succeeded, ${results.filter(item=>!item.success).length} failed`))}</p><ul class="tq-batch-results">${results.map(item=>`<li><strong>${h(item.id)}</strong><span class="${item.success?"tq-text-success":"tq-text-error"}">${h(item.success?tqT("成功","Succeeded"):item.error?.message || item.error?.display_message || item.error?.code)}</span></li>`).join("")}</ul>`;footer=tqButton("dialog_cancel",h(tqT("关闭","Close")))+(results.some(item=>!item.success&&item.payload&&["AFF-50301","NETWORK_ERROR","TIMEOUT"].includes(item.error?.code))?tqButton("batch_retry",h(tqT("重试失败项","Retry Failed Items"))):"");
    } else if (dialog.kind==="evidence") {
      title=tqT("证据预览","Evidence Preview");const item=dialog.evidence;
      body=tqEvidenceBody(item);footer=tqButton("dialog_cancel",h(tqT("关闭","Close")))+(item?.content&&item?.access?.download?tqButton("download_evidence",h(tqT("下载证据","Download Evidence"))):"");
    } else if (dialog.kind==="approval_decision") {
      title=tqT(({approve:"审批通过",reject:"驳回申请",return:"退回补充"})[dialog.decision],({approve:"Approve",reject:"Reject",return:"Return for Revision"})[dialog.decision]);
      body=`${tqFacts({[tqT("申请号","Approval")]:dialog.approval?.approval_id,[tqT("申请人","Applicant")]:dialog.approval?.applicant,[tqT("当前节点","Current Node")]:dialog.node?.required_role})}${tqModalInput("reason",tqT("审批意见（10-1000字）","Decision Reason (10–1000 characters)"),"textarea",form.reason || "")}<label class="tq-checkbox-line"><input type="checkbox" data-tq-dialog-field="confirmed" ${form.confirmed?"checked":""}>${h(tqT("已核对证据、金额及处置范围","I reviewed the evidence, amount and disposition scope"))}</label>`;footer=cancel+confirm();
    } else if (dialog.kind==="export_result") {
      title=demoSkipsApproval()?tqT("导出文件已生成","Export Ready"):tqT("导出申请已提交","Export Request Submitted");body=`<p>${h(dialog.exportId || "")}</p><p>${h(demoSkipsApproval()?tqT("可在导出中心下载文件。","Download the file in the export center."):tqT("审批完成后可在导出中心下载文件。","The file becomes available in the export center after approval."))}</p>`;footer=tqButton("dialog_cancel",h(tqT("关闭","Close")))+tqButton("exports_link",h(tqT("查看导出记录","View Exports")),"","primary");
    }
    return `<div class="tq-modal-backdrop"></div><section class="tq-modal ${dialog.kind==="evidence"?"tq-modal-wide":""}" role="dialog" aria-modal="true" aria-labelledby="tq-modal-title" tabindex="-1"><header><h2 id="tq-modal-title">${h(title)}</h2>${tqIconButton(dialog.kind==="unsaved"?"unsaved_keep":"dialog_cancel","close",tqT("关闭","Close"))}</header><div class="tq-modal-body" ${dialog.kind==="evidence"?`tabindex="0" aria-label="${h(tqT("证据详情内容","Evidence details"))}"`:""}>${body}${dialog.error?`<div class="tq-error" role="alert">${h(dialog.error.code || "AFF-42201")} · ${h(dialog.error.message || dialog.error.display_message || dialog.error)}</div>`:""}</div><footer>${footer}</footer></section>`;
  }
  function tqOpenTask(id,processing=false) {
    const open=()=>{tq.taskId=id;tq.detail=null;tq.form=null;tq.dirty=false;tq.preview=null;tq.detailTab=processing?"processing":"overview";tq.focusTarget=document.activeElement?.getAttribute("data-tq-open");tqReadDetail();tqSyncURL(true);render();};
    if (tq.dirty && tq.taskId!==id) {tq.dialog={kind:"unsaved",after:open};render();} else open();
  }
  function tqCloseTask() {
    const close=()=>{const id=tq.taskId;tq.taskId=null;tq.detail=null;tq.form=null;tq.dirty=false;tq.preview=null;tqSyncURL();render();requestAnimationFrame(()=>document.querySelector(`[data-tq-open="${CSS.escape(id)}"]`)?.focus());};
    if (tq.dirty) {tq.dialog={kind:"unsaved",after:close};render();} else close();
  }
  function taskQueueBeforeLeave(nextHash) {
    if (!tq.dirty || !tq.taskId) return true;
    const normalized=String(nextHash || "");const sameTask=normalized.startsWith("#/tasks")&&new URLSearchParams(normalized.split("?")[1] || "").get("task_id")===tq.taskId;
    if (sameTask || tqInspectionRoute(normalized) || tq.inspection?.role===state.role&&normalized===tq.inspection.returnHash) return true;
    tq.dialog={kind:"unsaved",after:()=>{location.hash=normalized.startsWith("#")?normalized:`#/${normalized.replace(/^\//,"")}`;}};render();return false;
  }
  function tqPayload(task,extra={}) {
    if(navigator.onLine===false || ["error","forbidden","offline"].includes(state.scenario)) throw {code:"AFF-50301",message:tqT("连接或权限异常，当前不可写入","Writes are unavailable while the connection or permissions are invalid")};
    return {request_id:tqId("request"),idempotency_key:tqId("idem"),expected_version:task?.version,...extra};
  }
  function tqWrite(action,id,payload,context={}) {
    if(navigator.onLine===false || ["error","forbidden","offline"].includes(state.scenario)) throw {code:"AFF-50301",message:tqT("当前连接不可写入","Writes are unavailable")};
    let result;
    try {result=tqService().write(action,id,payload,tqContext(context));}
    catch(error) {
      let receipt=null;try {receipt=tqService().receipt?.(payload.request_id,tqContext());}catch {}
      if(receipt?.response)result=receipt.response;
      else if(receipt?.result)result=receipt.result;
      else throw error;
    }
    if (result.task && tq.taskId===result.task.task_id) {tq.detail=tqService().detail(result.task.task_id,tqContext());tq.form=tqFormFromTask(tq.detail);}
    tq.lastRead=0;
    return result;
  }
  function tqSaveDraft(showNotice=true) {
    const task=tq.detail;if (!task || !tqCan(task,"save_draft")) throw {code:"AFF-40301",message:tqT("当前无权保存草稿","You cannot save this draft")};
    const form=tqClone(tq.form);const normalizeDate=value=>value&&!/[zZ]|[+-]\d\d:\d\d$/.test(value)?tqDayTimeUTC(value):value || null;
    form.next_review_at=normalizeDate(form.next_review_at);form.effective_at=normalizeDate(form.effective_at);form.expires_at=normalizeDate(form.expires_at);
    if(form.proposed_amount && /^\d+(?:\.\d{0,2})?$/.test(String(form.proposed_amount))) {const [whole,fraction=""]=String(form.proposed_amount).split(".");form.proposed_amount=`${whole}.${fraction.padEnd(2,"0")}`;}
    const formValues=task.source_type==="partner_followup"?{conclusion:form.conclusion}:form;
    const payload=tqPayload(task,{expected_draft_version:task.draft_version,conclusion:form.conclusion,reason_code:task.draft?.reason_code || "manual_review",reason:form.reason,internal_note:form.internal_note || null,evidence_ids:form.evidence_ids,next_review_at:form.next_review_at,checklist:form.checklist || [],form_values:formValues});
    const result=tqWrite("save_draft",task.task_id,payload);
    tq.dirty=false;tq.preview=null;if (showNotice)tq.notice=tqT("草稿已保存","Draft saved");
    if (!result.task) tqReadDetail();
    return result;
  }
  function tqDayTimeUTC(value) {
    if (!value) return null;
    const [date,time="00:00"]=value.split("T");return new Date(new Date(tqDayUTC(date)).valueOf()+(Number(time.slice(0,2))*60+Number(time.slice(3,5)))*60000).toISOString();
  }
  function tqStartDialog(kind,ids,extra={}) {
    let candidates=null;
    if (["assign","batch_assign"].includes(kind)) {
      try {candidates=tqService().assignees?.(ids[0],tqContext()) || {teams:tq.options.teams,users:tq.options.users};} catch(error) {tq.notice=error.message;return render();}
    }
    tq.dialog={kind,ids,form:{},candidates,...extra};render();
  }
  function tqConfirmDialog() {
    const dialog=tq.dialog;if (!dialog) return;const form=dialog.form || {};const task=tq.detail;
    try {
      if (dialog.kind==="release_source") {
        const source=task?.sections?.processing?.fields?.release_recheck_source;
        if (!source) throw {code:"AFF-42201",message:tqT("来源案件信息缺失","Source case details are unavailable")};
        const response=tqService().ensureRiskTask({...tqClone(source),task_purpose:"settlement_recheck",source_task_id:task.task_id,reason:form.reason || "",...tqPayload(null)},tqContext());
        const id=response.task_id || response.task?.task_id;
        if (!id) throw {code:"CONTRACT_ERROR",message:tqT("未返回独立任务号","Independent task ID is missing")};
        tq.dialog=null;tqOpenTask(id,true);return;
      }
      if (["claim","batch_claim","assign","batch_assign"].includes(dialog.kind)) {
        const results=dialog.ids.map(id=>{
          let row;let payload;
          try {
            row=tqService().detail(id,tqContext());
            const action=dialog.kind.includes("assign")?(form.return_pool?"return_pool":"assign"):"claim";
            payload=dialog.payloads?.[id] || tqPayload(row,action==="claim"?{}:{mode:form.return_pool?"return_pool":"assign",target_team_id:form.team_id || row.team?.id,target_user_id:form.user_id || null,reason:form.reason || ""});
            const response=tqWrite(action,id,payload);
            return {id,success:true,response,payload};
          } catch(error) {return {id,success:false,error,payload};}
        });
        const isBatch=dialog.kind.startsWith("batch_");
        if (!isBatch && !results[0].success) throw results[0].error;
        tq.dialog=isBatch?{kind:"batch_result",results:[...(dialog.priorResults || []),...results],originalKind:dialog.kind,originalForm:tqClone(form)}:null;
        if (!isBatch)tq.notice=tqT(`${dialog.ids[0]}${dialog.kind==="claim"?"已认领":"已更新责任人"}`,`${dialog.ids[0]} updated`);
        tq.selected.clear();tqRead();if(tq.taskId)tqReadDetail();render();return;
      }
      let action=dialog.kind;let id=task?.task_id;let payload=tqPayload(task);
      if (action==="request_material") Object.assign(payload,{material_keys:String(form.material_keys || "").split("\n").map(item=>item.trim()).filter(Boolean),recipient:{type:form.recipient || "partner",ref:form.recipient==="internal"?task.owner?.user_id:form.recipient==="crm"?"CRM":task.partner_id},due_at:tqDayTimeUTC(form.due_at),public_message:form.public_message || "",reason:form.reason || ""});
      if (action==="submit_review") {
        if (!form.confirmed) throw {code:"AFF-42201",message:demoSkipsApproval()?tqT("请确认处理范围、金额和证据","Confirm scope, amount and evidence"):tqT("请确认影响范围和审批路径","Confirm the impact and approval routing")};
        Object.assign(payload,{draft_version:task.draft_version,preview_id:tq.preview?.preview_id,preview_hash:tq.preview?.preview_hash,self_review:false,impact_confirmation:true});
      }
      if (action==="resume_without_review") {
        if (!demoSkipsApproval() || !form.confirmed) throw {code:"AFF-42201",message:tqT("请确认处理范围、金额和证据","Confirm scope, amount and evidence")};
        Object.assign(payload,{reason:form.reason || "",impact_confirmation:true});
      }
      if (action==="close") Object.assign(payload,{reason_code:form.reason_code || "duplicate",reason:form.reason || "",replaced_by_task_id:form.replaced_by_task_id || null,source_receipt_ref:form.source_receipt_ref || null});
      if (["status_check","retry_integration"].includes(action)) {
        const fields=task.sections?.processing?.fields || {};
        Object.assign(payload,{task_id:task.task_id,integration_version:fields.integration_version,status_check_id:fields.status_check?.status_check_id,approved_plan_ref:task.approval_refs?.at(-1)?.approval_id || null,reason:form.reason || ""});
      }
      if (action==="retry_execution") {
        const execution=task.execution_refs?.find(item=>(item.execution_id || item.id)===dialog.executionId) || task.execution_refs?.at(-1);
        Object.assign(payload,{execution_id:execution?.execution_id,execution_version:execution?.version,failed_item_ids:(execution?.items || []).filter(item=>item.status==="failed"&&item.retryable).map(item=>item.item_id),reason:form.reason || ""});
      }
      if (action==="export") {
        id=null;Object.assign(payload,{source_page:"tasks",snapshot_id:tq.result?.meta?.snapshot_id,applied_filter:tq.query,scope:tq.query.scope,sort:{field:tq.query.sort_by || "default",direction:tq.query.direction || "asc"},columns:tqActiveColumns().filter(col=>!["select","actions"].includes(col.key)).map(col=>col.key),format:"csv",masked:true,purpose:form.reason || "",reason:form.reason || ""});
      }
      let context={};
      if (action==="approval_decision") {
        const approval=dialog.approval;const node=dialog.node;action=dialog.decision;id=approval.approval_id || approval.id;context={source_entry:"approval_queue"};
        if (!form.confirmed) throw {code:"AFF-42201",message:tqT("请确认已核对申请","Confirm you have reviewed this request")};
        payload=tqPayload(approval,{node_id:node.node_id,expected_node_version:node.version,reason:form.reason || "",preview_id:approval.preview?.preview_id,preview_hash:approval.preview?.preview_hash,impact_confirmation:true,self_review:false});
      }
      const response=tqWrite(action,id,payload,context);
      tq.dialog=action==="export"?{kind:"export_result",exportId:response.export_id || response.result?.export_id || response.receipt?.result_ref?.id || response.export?.export_id}:null;
      tq.notice=["submit_review","resume_without_review"].includes(action)?(demoSkipsApproval()?tqT("处置已提交，请查看任务状态及执行记录","Disposition submitted. Check task status and execution records."):tqT("处置申请已提交，等待审批","Disposition submitted for approval")):action==="status_check"?tqT("已查询原外部单号，请核对查证结果","External reference checked. Review the result."):tqT("操作已记录","Operation recorded");
      tq.dirty=false;tq.preview=null;tqRead();if(tq.taskId)tqReadDetail();render();
    } catch(error) {dialog.error=error;tq.dialog=dialog;render();}
  }
  function tqApprovalScope(approval) {
    const common=tqFacts({[tqT("申请人","Applicant")]:approval.applicant,[tqT("提交时间","Submitted")]:approval.submitted_at || approval.created_at});
    if (approval.export_id) {
      const scope=approval.export_snapshot || approval.export_scope || approval.draft;
      return `${common}<section class="tq-detail-section" data-tq-approval-scope="export"><h3>${h(tqT("冻结导出范围","Frozen Export Scope"))}</h3>${tqFacts({[tqT("导出编号","Export ID")]:approval.export_id,[tqT("用途","Purpose")]:scope.purpose || approval.purpose,[tqT("数据范围","Data Scope")]:scope.scope,[tqT("查询条件","Applied Filters")]:scope.applied_filter,[tqT("排序","Sort")]:scope.sort,[tqT("快照","Snapshot")]:scope.snapshot_id,[tqT("导出字段","Columns")]:scope.columns,[tqT("记录数","Row Count")]:scope.row_count})}</section>`;
    }
    const snapshot=approval.task_snapshot;
    const planItems=(approval.draft?.action_plan || []).map(item=>({
      item_id:item.item_id,
      action:item.action,
      case_refs:item.scope?.case_refs || [],
      partner_ids:item.scope?.partner_ids || [],
      customer_ids:item.scope?.customer_ids || [],
      requires_domains:item.requires_domains || []
    }));
    const evidence=(approval.evidence_snapshot || approval.evidence || []).map(item=>({
      evidence_id:item.evidence_id,
      name:item.name || item.summary,
      source_system:item.source_system || item.source,
      collected_at:item.collected_at,
      scan_status:item.scan_status || item.status
    }));
    const preview=approval.preview ? {
      preview_id:approval.preview.preview_id,
      generated_at:approval.preview.generated_at,
      expires_at:approval.preview.expires_at,
      deduplicated_amount:approval.preview.deduplicated_amount || approval.preview.amount,
      case_refs:approval.preview.case_refs || [],
      required_approver_roles:approval.preview.required_approver_roles || [],
      blocking_errors:approval.preview.blocking_errors || [],
      before_after_items:(approval.preview.before_after_items || []).map(item=>({item_id:item.item_id,after:item.after?.requested_action || "待执行",blocking_reasons:item.blocking_reasons || []}))
    } : null;
    const sourceScope=approval.source_scope ? {
      partner_ids:approval.source_scope.partner_ids || [],
      customer_ids:approval.source_scope.customer_ids || [],
      case_refs:approval.source_scope.case_refs || []
    } : null;
    return `${common}${approval.task_id?tqAffectedObjects(approval.task_id):""}<section class="tq-detail-section" data-tq-approval-scope="task"><h3>${h(tqT("冻结处置方案","Frozen Disposition"))}</h3>${tqFacts({[tqT("任务与来源","Task & Source")]:snapshot?{task_id:snapshot.task_id,task_purpose:snapshot.task_purpose,source_kind:(approval.source_ref || snapshot.source_ref)?.kind,source_id:(approval.source_ref || snapshot.source_ref)?.id,source_versions:approval.source_versions,config_versions:approval.config_versions,funds_status:approval.funds_status}:null,[tqT("处理结论","Conclusion")]:tqConclusions[approval.draft?.conclusion] || approval.draft?.conclusion,[tqT("申请原因","Reason")]:approval.draft?.reason || approval.reason,[tqT("动作计划","Action Plan")]:planItems,[tqT("证据","Evidence")]:evidence,[tqT("来源范围","Source Scope")]:sourceScope,[tqT("影响预览","Impact Preview")]:preview})}</section>`;
  }
  function taskQueueApprovalPage() {
    if (!tqEnsure()) return `<div class="tq-error">AFF-50301</div>`;
    const params=new URLSearchParams(location.hash.split("?")[1] || "");const target=params.get("approval_id");
    let approvals=[];let error=null;
    try {approvals=tqService().approvals(tqContext());if(!Array.isArray(approvals))approvals=approvals.items || [];} catch(caught){error=caught;}
    if (target) approvals=approvals.filter(item=>(item.approval_id || item.id)===target);
    if (demoSkipsApproval()) return `<section class="tq-page tq-approval-page"><header class="tq-page-head"><h1>${h(tqT("历史审批记录","Approval History"))}</h1><div>${tqButton("tasks_link",h(tqT("任务队列","Task Queue")))}</div></header>${error?`<div class="tq-error">${h(error.message || error.code)}</div>`:""}<div class="tq-approval-list">${approvals.length?approvals.map(approval=>`<article class="tq-approval-card"><header><strong>${h(approval.approval_id || approval.id)}</strong>${tqBadge(approval.status || approval.approval_status)}</header>${tqApprovalScope(approval)}<footer>${approval.task_id?`<button class="tq-button secondary" data-tq-linked-task="${h(approval.task_id)}">${h(tqT("查看任务与执行","View Task & Execution"))}</button>`:`<span class="tq-muted">${h(tqT("历史记录","Historical Record"))}</span>`}</footer></article>`).join(""):`<div class="tq-empty">${h(tqT("暂无历史审批记录","No approval history"))}</div>`}</div></section>`;
    return `<section class="tq-page tq-approval-page"><header class="tq-page-head"><h1>${h(tqT("审批队列","Approval Queue"))}</h1><div>${target?tqButton("all_approvals",h(tqT("全部审批","All Approvals"))):""}${tqButton("tasks_link",h(tqT("任务队列","Task Queue")))}</div></header>${tq.notice?`<div class="tq-notice" role="status">${h(tq.notice)}${tqIconButton("dismiss_notice","close",tqT("关闭","Dismiss"))}</div>`:""}${error?`<div class="tq-error">${h(error.message || error.code)}</div>`:""}<div class="tq-approval-list">${approvals.length?approvals.map(approval=>{
      const chain=tqApprovalChainData(approval);const node=chain?.nodes?.find(item=>item.node_id===chain.current_node_id);const self=approval.applicant?.user_id===tq.options.current_user?.user_id;
      const canApprove=navigator.onLine!==false&&!["error","forbidden","offline"].includes(state.scenario)&&!self&&node?.status==="pending"&&(node.required_role===state.role || (node.required_role==="risk_manager"&&state.role==="risk_supervisor"));
      return `<article class="tq-approval-card"><header><div><strong>${h(approval.approval_id || approval.id)}</strong><small>${h(approval.task_id || tqT("敏感导出","Sensitive Export"))}</small></div>${tqBadge(approval.status || approval.approval_status || chain?.overall_status)}</header>${tqApprovalScope(approval)}${tqApprovalChain(approval)}<footer>${approval.task_id?`<button class="tq-button secondary" data-tq-linked-task="${h(approval.task_id)}">${h(tqT("查看任务","View Task"))}</button>`:""}${canApprove?`${tqButton("approve",h(tqT("通过当前节点","Approve Current Node")),`data-tq-approval-id="${h(approval.approval_id || approval.id)}"`,"primary")}${tqButton("reject",h(tqT("驳回","Reject")),`data-tq-approval-id="${h(approval.approval_id || approval.id)}"`)}${tqButton("return",h(tqT("退回补充","Return")),`data-tq-approval-id="${h(approval.approval_id || approval.id)}"`)}`:`<span class="tq-muted">${h(self?tqT("申请人不可审批本人事项","Applicants cannot approve their own requests"):tqT("等待当前节点授权审批人","Awaiting an authorized approver"))}</span>`}</footer></article>`;
    }).join(""):`<div class="tq-empty">${h(tqT("暂无审批事项或无权查看","No accessible approval requests"))}</div>`}</div></section>`;
  }
  function tqNavigate(hash) {
    if (!taskQueueBeforeLeave(hash)) return;
    tq.dialog=null;location.hash=hash;
  }
  function taskQueueMount() {
    const active=document.querySelector(".tq-page");
    document.body.classList.toggle("tq-has-overlay",Boolean(document.querySelector(".tq-drawer,.tq-modal")));
    if (!active) return;
    const dialog=document.querySelector(".tq-modal") || document.querySelector(".tq-drawer");
    if (dialog && !dialog.contains(document.activeElement)) requestAnimationFrame(()=>dialog.querySelector("button,input,select,textarea")?.focus({preventScroll:true}));
    if (!tq.pollTimer) tq.pollTimer=setInterval(()=>{
      if (document.hidden || !document.querySelector(".tq-page") || tq.dialog?.kind==="evidence") return;
      const now=Date.now();
      if (tq.dirty) {
        if (tq.taskId && now-tq.lastDetailRead>=30000) {
          tqReadDetail();
          const note=document.querySelector(".tq-unsaved");if(note&&tq.notice)note.textContent=tq.notice;
        }
        return;
      }
      let changed=false;
      if (now-tq.lastRead>=60000) {delete tq.query.snapshot_id;tqRead();changed=true;}
      if (tq.taskId&&now-tq.lastDetailRead>=30000) {tqReadDetail();changed=true;}
      if (changed)render();
    },5000);
  }
  document.addEventListener("visibilitychange",()=>{
    if (!document.hidden&&document.querySelector(".tq-page")&&!tq.dirty) {tqRead();if(tq.taskId)tqReadDetail();render();}
  });
  window.addEventListener("offline",()=>{if(document.querySelector(".tq-page"))render();});
  window.addEventListener("online",()=>{if(document.querySelector(".tq-page")){tqRead();render();}});
  document.addEventListener("click",event=>{
    if (document.querySelector(".tq-page")&&event.target.closest('[aria-label="语言"]')) {event.preventDefault();event.stopImmediatePropagation();tq.locale=tq.locale==="zh"?"en":"zh";return render();}
    const target=event.target.closest("[data-tq-action],[data-tq-open],[data-tq-row-action],[data-tq-scope],[data-tq-metric],[data-tq-sort],[data-tq-remove-filter],[data-tq-detail-tab],[data-tq-evidence-view],[data-tq-linked-task],[data-tq-object],[data-tq-object-back],[data-tq-object-tab],[data-tq-object-case]");
    if (!target) return;event.stopImmediatePropagation();
    if (target.disabled) return;
    if(target.hasAttribute("data-tq-object"))return tqOpenObject(target.dataset.tqObject,target.dataset.objectId,target.dataset.objectTask,target.dataset.objectTab);
    if(target.hasAttribute("data-tq-object-back"))return tqReturnFromObject();
    if(target.hasAttribute("data-tq-object-case")){
      const params=new URLSearchParams(location.hash.split("?")[1] || "");params.set("settlement_case_id",target.dataset.tqObjectCase);
      location.hash=`${location.hash.split("?")[0]}?${params}`;
      requestAnimationFrame(()=>document.querySelector(".tq-object-case-panel")?.focus());return;
    }
    if(target.hasAttribute("data-tq-object-tab")){
      const params=new URLSearchParams(location.hash.split("?")[1] || "");params.set("tab",target.dataset.tqObjectTab);
      location.hash=`${location.hash.split("?")[0]}?${params}`;return;
    }
    if (target.hasAttribute("data-tq-open"))return tqOpenTask(target.dataset.tqOpen,Boolean(target.dataset.tqProcess));
    if (target.hasAttribute("data-tq-linked-task"))return tqNavigate(`#/tasks?task_id=${encodeURIComponent(target.dataset.tqLinkedTask)}`);
    if (target.hasAttribute("data-tq-row-action"))return tqStartDialog(target.dataset.tqRowAction,[target.dataset.tqId]);
    if (target.hasAttribute("data-tq-detail-tab")) {tq.detailTab=target.dataset.tqDetailTab;return render();}
    if (target.hasAttribute("data-tq-remove-filter")) {
      const query=tqClone(tq.query),key=target.dataset.tqRemoveFilter;
      if (target.hasAttribute("data-tq-remove-value")) {
        query[key]=(query[key] || []).filter(value=>value!==target.dataset.tqRemoveValue);
        if(!query[key].length)delete query[key];
      } else delete query[key];
      if(["updated_from","updated_to"].includes(key)){delete query.updated_from;delete query.updated_to;}
      tq.expanded=false;return tqApply(query);
    }
    if (target.hasAttribute("data-tq-scope")) {tq.filters={...tq.query,scope:target.dataset.tqScope};return tqApply(tq.filters);}
    if (target.hasAttribute("data-tq-sort")) {
      const key=target.dataset.tqSort;const query={...tq.query};
      if (query.sort_by!==key) {query.sort_by=key;query.direction="asc";}
      else if(query.direction==="asc")query.direction="desc";else {delete query.sort_by;delete query.direction;}
      return tqApply(query);
    }
    if (target.hasAttribute("data-tq-metric")) {
      const metric=target.dataset.tqMetric;let query={...tqDefaultQuery(),scope:tq.query.scope};
      if(tq.metric===metric){tq.metric=null;return tqApply(tqDefaultQuery());}
      tq.metric=metric;
      if(["mine","claimable"].includes(metric))query.scope=metric;
      if(["warning","overdue"].includes(metric))query.sla_state=metric;
      if(metric==="failed"){delete query.status_group;query.workflow_states=["execution_failed"];}
      return tqApply(query);
    }
    if (target.hasAttribute("data-tq-evidence-view")) {
      const evidence=tqEvidenceItems(tq.detail).find(item=>item.evidence_id===target.dataset.tqEvidenceView);
      try {
        if(!evidence)throw {message:tqT("证据已变化，请重新打开任务","Evidence changed. Reopen the task.")};
        const response=tqService().write("access_evidence",tq.taskId,tqPayload(tq.detail,{evidence_id:evidence.evidence_id,purpose:"preview"}),tqContext());
        tq.dialog={kind:"evidence",evidence:{...evidence,...response.evidence}};
      } catch(error){tq.dialog={kind:"evidence",evidence:{...evidence,task_id:tq.taskId},error};}
      return render();
    }
    const action=target.dataset.tqAction;
    if (action==="dismiss_notice"){tq.notice=null;return render();}
    if (action==="query")return tqApply(tq.filters);
    if (action==="reset"){tq.metric=null;tq.expanded=false;return tqApply({...tqDefaultQuery(),scope:tq.query.scope,page_size:tq.query.page_size});}
    if (action==="filters"){tq.filters=tqClone(tq.query);tq.expanded=!tq.expanded;return render();}
    if (action==="filters_cancel"){tq.filters=tqClone(tq.query);tq.expanded=false;return render();}
    if (action==="filters_reset"){tq.filters={...tqDefaultQuery(),scope:tq.query.scope,page_size:tq.query.page_size};return render();}
    if (action==="columns"){tq.columnsOpen=!tq.columnsOpen;return render();}
    if (action==="columns_reset"){tq.widths={};tq.hidden=new Set(tqColumns.filter(col=>col.optional).map(col=>col.key));tq.order=tqColumns.map(col=>col.key);tqSavePreferences();return render();}
    if (action==="column_up"||action==="column_down") {
      const key=target.dataset.tqColumnKey;const index=tq.order.indexOf(key);let destination=index+(action==="column_up"?-1:1);
      while(destination>1&&destination<tq.order.length-1&&tqColumns.find(col=>col.key===tq.order[destination])?.fixed)destination+=action==="column_up"?-1:1;
      if(destination>1&&destination<tq.order.length-1){[tq.order[index],tq.order[destination]]=[tq.order[destination],tq.order[index]];tqSavePreferences();}
      return render();
    }
    if (action==="refresh"){if(tq.dirty){tq.notice=tqT("正在编辑，已保留输入；请保存或放弃后刷新","Editing in progress. Save or discard before refreshing.");return render();}delete tq.query.snapshot_id;tqRead();if(tq.taskId)tqReadDetail();return render();}
    if (action==="clear_selection"){tq.selected.clear();return render();}
    if (["previous","next","jump"].includes(action)) {
      const page=action==="jump"?Number(document.querySelector("[data-tq-page-jump]")?.value):tq.query.page+(action==="previous"?-1:1);
      if(!Number.isInteger(page)||page<1||page>Math.max(tq.result?.meta?.pages || 0,1)){tq.notice=tqT("请输入有效页码","Enter a valid page number");return render();}
      tq.query={...tq.query,page,snapshot_id:tq.result?.meta?.snapshot_id};tq.selected.clear();tqRead();if(!tq.error)tqSyncURL();return render();
    }
    if(action==="close_detail")return tqCloseTask();
    if(action==="dialog_cancel"){tq.dialog=null;return render();}
    if(action==="dialog_confirm")return tqConfirmDialog();
    if(action==="download_evidence"){
      try {
        const evidence=tq.dialog?.evidence;
        const response=tqService().write("access_evidence",tq.taskId,tqPayload(tq.detail,{evidence_id:evidence?.evidence_id,purpose:"download"}),tqContext());
        const file=response.evidence;if(typeof file?.content!=="string")throw {message:tqT("文件暂不可用","File is unavailable")};
        const url=URL.createObjectURL(new Blob([file.content],{type:file.content_type || "text/plain;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download=`${evidence.evidence_id}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(error){tq.dialog.error=error;render();}return;
    }
    if(action==="batch_retry"){
      const previous=tq.dialog;
      const failed=previous.results.filter(item=>!item.success&&item.payload&&["AFF-50301","NETWORK_ERROR","TIMEOUT"].includes(item.error?.code));
      const retried=new Set(failed.map(item=>item.id));
      tq.dialog={kind:previous.originalKind,ids:failed.map(item=>item.id),form:previous.originalForm,payloads:Object.fromEntries(failed.map(item=>[item.id,item.payload])),priorResults:previous.results.filter(item=>!retried.has(item.id))};
      return tqConfirmDialog();
    }
    if(action==="unsaved_keep"){tq.dialog=null;return render();}
    if(action==="unsaved_discard"){const next=tq.dialog.after;tq.dialog=null;tq.dirty=false;tq.form=tq.detail?tqFormFromTask(tq.detail):null;next();return;}
    if(action==="unsaved_save"){try{tqSaveDraft();const next=tq.dialog.after;tq.dialog=null;next();}catch(error){tq.dialog.error=error;render();}return;}
    if(action==="save_draft"){try{tqSaveDraft();}catch(error){tq.notice=`${error.code || ""} · ${error.message || error.display_message}`;}return render();}
    if(action==="complete_followup"){
      try{
        if(tq.dirty)tqSaveDraft(false);
        tqWrite("complete_followup",tq.taskId,tqPayload(tq.detail));
        tq.dirty=false;tq.notice="跟进已完成；未修改资金或风险结论";tqRead();tqReadDetail();
      }catch(error){tq.notice=error.message || "跟进未完成，请检查结论";}
      return render();
    }
    if(action==="preview"){
      try{if(tq.dirty)tqSaveDraft(false);const response=tqWrite("preview",tq.taskId,tqPayload(tq.detail,{draft_version:tq.detail.draft_version}));tq.preview=response.preview;tq.notice=tqT("影响预览已更新","Impact preview updated");}
      catch(error){tq.notice=`${error.code || ""} · ${error.message || error.display_message}`;}return render();
    }
    if(["claim","assign","request_material","submit_review","resume_without_review","close","status_check","retry_integration","retry_execution"].includes(action))return tqStartDialog(action,[tq.taskId],{executionId:target.dataset.tqExecutionId});
    if(action==="batch_claim"||action==="batch_assign")return tqStartDialog(action,[...tq.selected]);
    if(action==="export")return tqStartDialog(action,[]);
    if(action==="approval_link")return tqNavigate(`#/workbench?tab=approvals&approval_id=${encodeURIComponent(target.dataset.tqApprovalId)}&return_to=tasks`);
    if(action==="all_approvals")return tqNavigate("#/workbench?tab=approvals");
    if(action==="tasks_link")return tqNavigate("#/tasks");
    if(action==="exports_link"){tq.dialog=null;state.reportExportOpen=true;return render();}
    if(action==="source"){
      if(tq.detail?.source_type==="hold_extend") return tqStartDialog("release_source",[]);
      const path=tq.detail?.business_jump_url || tq.detail?.sections?.processing?.fields?.business_jump_url;
      if(path?.startsWith("#/"))tqNavigate(path);return;
    }
    if(["approve","reject","return"].includes(action)){
      const approvals=tqService().approvals(tqContext());const approval=(Array.isArray(approvals)?approvals:approvals.items).find(item=>(item.approval_id || item.id)===target.dataset.tqApprovalId);
      const chain=tqApprovalChainData(approval);const node=chain.nodes.find(item=>item.node_id===chain.current_node_id);
      return tqStartDialog("approval_decision",[],{approval,node,decision:action});
    }
    if(action==="download_export"){
      try {
        const response=tqWrite("download_export",target.dataset.tqExportId,tqPayload(null));
        const csv=response.csv || response.result?.csv; if(typeof csv!=="string")throw {message:tqT("文件尚未就绪","File is not ready")};
        const url=URL.createObjectURL(new Blob([csv.startsWith("\uFEFF")?csv:`\uFEFF${csv}`],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download=response.filename || `${target.dataset.tqExportId}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(error){tq.notice=error.message || error.code;render();}
    }
  },true);
  function tqMarkDirty() {
    tq.dirty=true;tq.preview=null;
    const note=document.querySelector(".tq-drawer-footer > div");
    if(note)note.innerHTML=`<span class="tq-unsaved">${h(tqT("有未保存修改","Unsaved Changes"))}</span>`;
    document.querySelector('[data-tq-action="submit_review"]')?.setAttribute("disabled","");
  }
  document.addEventListener("input",event=>{
    const target=event.target;
    if(target.matches("[data-tq-filter]")){tq.filters[target.dataset.tqFilter]=target.value;const note=document.querySelector(".tq-unapplied");if(note)note.hidden=false;return;}
    if(target.matches("[data-tq-form]")){if(!tq.form)return;tq.form[target.dataset.tqForm]=target.type==="checkbox"?target.checked:target.value;tqMarkDirty();return;}
    if(target.matches("[data-tq-dialog-field]")){if(tq.dialog)tq.dialog.form[target.dataset.tqDialogField]=target.type==="checkbox"?target.checked:target.value;return;}
    if(target.matches("[data-tq-option-search]")){
      const keyword=target.value.toLowerCase();target.parentElement.querySelectorAll("[data-tq-option-label]").forEach(label=>label.hidden=!label.dataset.tqOptionLabel.includes(keyword));
    }
  },true);
  document.addEventListener("change",event=>{
    const target=event.target;
    if(target.matches("[data-tq-quick-filter]")){
      if(target.value==="__multiple__")return;
      const query=tqClone(tq.query),key=target.dataset.tqQuickFilter;
      if(target.value)query[key]=[target.value];else delete query[key];
      tq.expanded=false;return tqApply(query);
    }
    if(target.matches("[data-tq-filter]")){tq.filters[target.dataset.tqFilter]=target.value;if(target.dataset.tqFilter==="status_group")delete tq.filters.workflow_states;if(target.tagName==="SELECT")render();return;}
    if(target.matches("[data-tq-filter-multi]")){
      const key=target.dataset.tqFilterMulti;const values=new Set(tq.filters[key] || []);target.checked?values.add(target.value):values.delete(target.value);tq.filters[key]=[...values];if(key==="workflow_states"&&values.size)delete tq.filters.status_group;
      const summary=target.closest("details")?.querySelector("summary span");if(summary)summary.textContent=values.size?`${values.size}${tqT("项"," selected")}`:tqT("全部","All");
      const note=document.querySelector(".tq-unapplied");if(note)note.hidden=false;
      return;
    }
    if(target.matches("[data-tq-select]")){target.checked?tq.selected.add(target.dataset.tqSelect):tq.selected.delete(target.dataset.tqSelect);return render();}
    if(target.matches("[data-tq-select-all]")){(tq.result?.items || []).filter(row=>tqCan(row,"claim")||tqCan(row,"assign")).forEach(row=>target.checked?tq.selected.add(row.task_id):tq.selected.delete(row.task_id));return render();}
    if(target.matches("[data-tq-column]")){target.checked?tq.hidden.delete(target.dataset.tqColumn):tq.hidden.add(target.dataset.tqColumn);tqSavePreferences();return render();}
    if(target.matches("[data-tq-page-size]")){const size=Number(target.value);try{localStorage.setItem("affiliate:tasks:page-size",String(size));}catch{}return tqApply({...tq.query,page_size:size});}
    if(target.matches("[data-tq-form]")){if(!tq.form)return;tq.form[target.dataset.tqForm]=target.type==="checkbox"?target.checked:target.value;tqMarkDirty();if(["conclusion","proposal","permanent"].includes(target.dataset.tqForm))render();return;}
    for(const [attribute,key] of [["data-tq-evidence","evidence_ids"],["data-tq-member","member_ids"],["data-tq-backfill","missing_event_ids"]]){
      if(target.hasAttribute(attribute)){if(!tq.form)return;const values=new Set(tq.form[key] || []);target.checked?values.add(target.getAttribute(attribute)):values.delete(target.getAttribute(attribute));tq.form[key]=[...values];tqMarkDirty();return;}
    }
    if(target.matches("[data-tq-checklist]")){if(!tq.form)return;tq.form.checklist=tq.form.checklist || [];const key=target.dataset.tqChecklist;const item=tq.form.checklist.find(entry=>entry.key===key);if(item)item.checked=target.checked;else tq.form.checklist.push({key,checked:target.checked});tqMarkDirty();return;}
    if(target.matches("[data-tq-dialog-field]")){if(tq.dialog){tq.dialog.form[target.dataset.tqDialogField]=target.type==="checkbox"?target.checked:target.value;if(["team_id","return_pool","reason_code"].includes(target.dataset.tqDialogField))render();}return;}
  },true);
  document.addEventListener("keydown",event=>{
    const target=event.target;const dialog=document.querySelector(".tq-modal") || document.querySelector(".tq-drawer");
    if(dialog&&event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();if(tq.dialog){if(tq.dialog.kind==="unsaved"){tq.dialog=null;render();}else{tq.dialog=null;render();}}else tqCloseTask();return;}
    if(dialog&&event.key==="Tab"){
      const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(item=>item.offsetParent!==null);
      if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
    }
    if(event.key==="Enter"&&target.matches("[data-tq-filter]")){event.preventDefault();event.stopImmediatePropagation();tqApply(tq.filters);}
    if(event.key==="Enter"&&target.matches("[data-tq-page-jump]")){event.preventDefault();document.querySelector('[data-tq-action="jump"]')?.click();}
    if(target.matches("[data-tq-resize]")&&["ArrowLeft","ArrowRight"].includes(event.key)){event.preventDefault();const col=tqColumns.find(item=>item.key===target.dataset.tqResize);tq.widths[col.key]=Math.max(col.min,(tq.widths[col.key] || col.width)+(event.key==="ArrowRight"?8:-8));tqSavePreferences();render();}
  },true);
  document.addEventListener("pointerdown",event=>{
    const target=event.target.closest("[data-tq-resize]");if(!target)return;event.preventDefault();event.stopImmediatePropagation();
    const col=tqColumns.find(item=>item.key===target.dataset.tqResize);const start=event.clientX;const width=tq.widths[col.key] || col.width;
    const move=next=>{tq.widths[col.key]=Math.max(col.min,width+next.clientX-start);const index=tqActiveColumns().findIndex(item=>item.key===col.key);const element=document.querySelector(`.tq-table col:nth-child(${index+1})`);if(element)element.style.width=`${tq.widths[col.key]}px`;const table=document.querySelector(".tq-table");if(table)table.style.width=`${tqActiveColumns().reduce((sum,item)=>sum+(tq.widths[item.key] || item.width),0)}px`;};
    const up=()=>{document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);tqSavePreferences();};
    document.addEventListener("pointermove",move);document.addEventListener("pointerup",up,{once:true});
  },true);

  function stateBlock() {
    if (state.routeId === "tickets") return "";
    if (state.scenario === "error") return `<div class="dev-alert"><strong>CONTRACT_ERROR</strong><div>接口错误：Admin API数据结构校验失败。</div><div>traceId: <code>trace-admin-api-error</code></div></div>`;
    if (state.scenario === "forbidden") return `<div class="dev-alert"><strong>FORBIDDEN</strong><div>当前角色无权访问该页签。请切换角色或返回有权限的页签。</div></div>`;
    return "";
  }

  const partner360PageTabs = [
    {id:"overview",label:"概览"},
    {id:"promotion",label:"推广与归因"},
    {id:"compliance",label:"合规与资料"},
    {id:"finance",label:"财务与结算"},
    {id:"risk",label:"风险与信用"},
    {id:"follow-up",label:"跟进与审计"}
  ];

  function partner360PagePartner() {
    return prototype.partner360.partners.find(item => item.id === state.detailId) || null;
  }

  function partner360PageFixture() {
    const partner = partner360PagePartner();
    if (!partner) return null;
    const performance = partner.performance || {};
    const special = {
      "partner-1013": {riskBand:"R3", creditLevel:"C0", crmStatus:"restricted"},
      "partner-1006": {riskBand:"R2", creditLevel:"C0", crmStatus:"restricted"},
      "partner-1017": {riskBand:"R2", creditLevel:"C1"},
      "partner-1003": {riskBand:"R1", creditLevel:"C2"},
      "partner-1011": {riskBand:"R3", creditLevel:"C0", crmStatus:"terminated"}
    }[partner.id] || {};
    const riskBand = special.riskBand || (partner.risk === "high" ? "R3" : partner.risk === "medium" ? "R2" : "R0");
    const creditLevel = special.creditLevel || partner.credit?.grade || "C0";
    const crmStatus = special.crmStatus || (partner.kyc?.status === "sync_failed" ? "restricted" : partner.stage === "archived" ? "terminated" : "active");
    const blockers = [];
    if (partner.stage === "archived") blockers.push({code:"ARCHIVED",label:"合作方已归档，推广与结算动作均受限",severity:"blocking",source:"Affiliate",tab:"overview"});
    else if (partner.stage === "offboarding") blockers.push({code:"OFFBOARDING",label:"清退流程进行中，待完成最终结算与归档",severity:"blocking",source:"Affiliate",tab:"finance"});
    if (creditLevel === "C0" && !["applying","reviewing"].includes(partner.stage)) blockers.push({code:"CREDIT_C0",label:"信用等级 C0，当前不具备常规结算权益",severity:"blocking",source:"Risk",tab:"risk"});
    if (partner.kyc?.status === "sync_failed") blockers.push({code:"CRM_SYNC",label:"CRM KYC 同步异常，已生成集成任务",severity:"blocking",source:"CRM",tab:"compliance"});
    if (riskBand === "R3") blockers.push({code:"RISK_R3",label:"R3 高风险，结算案件进入人工复核",severity:"blocking",source:"Risk",tab:"risk"});
    if (partner.stage === "watching") blockers.push({code:"WATCHING",label:partner.watchReason || "观察期内限制质量服务附加",severity:"warning",source:"Affiliate",tab:"overview"});
    if (partner.stage === "reviewing" || partner.stage === "applying") blockers.push({code:"ONBOARDING",label:"入驻资料或认证尚未完成",severity:"warning",source:"CRM",tab:"compliance"});
    if (partner.id === "partner-1017") blockers.push({code:"SETTLEMENT_HOLD",label:"2笔结算案件等待D+N复核",severity:"blocking",source:"Finance",tab:"finance"});
    const clicks = performance.clicks || 0;
    const validFtd = performance.validFtd || 0;
    const registrations = performance.registrations || Math.round(validFtd * 2.8);
    const ftd = performance.ftd || Math.round(validFtd * 1.22);
    const commission = performance.commission || 0;
    const pendingSettlement = partner.stage === "archived" ? 0 : Math.round(commission * (riskBand === "R3" ? .42 : partner.stage === "offboarding" ? .28 : .17));
    const cases = [
      {customerId:`customer-${partner.id.slice(-4)}-01`,commissionCaseId:`comm-${partner.id.slice(-4)}-01`,settlementCaseId:`settle-${partner.id.slice(-4)}-01`,amount:Math.max(0,Math.round(commission*.38)),commissionStatus:"qualified",settlementStatus:riskBand === "R3" ? "frozen" : "processing",block:riskBand === "R3" ? "R3风险人工复核" : "—",traceId:`trace-${partner.id}-case-01`},
      {customerId:`customer-${partner.id.slice(-4)}-02`,commissionCaseId:`comm-${partner.id.slice(-4)}-02`,settlementCaseId:`settle-${partner.id.slice(-4)}-02`,amount:Math.max(0,Math.round(commission*.24)),commissionStatus:"pending",settlementStatus:partner.stage === "archived" ? "closed" : "processing",block:partner.stage === "offboarding" ? "清退结算单" : "—",traceId:`trace-${partner.id}-case-02`},
      {customerId:`customer-${partner.id.slice(-4)}-03`,commissionCaseId:`comm-${partner.id.slice(-4)}-03`,settlementCaseId:`settle-${partner.id.slice(-4)}-03`,amount:Math.max(0,Math.round(commission*.17)),commissionStatus:"qualified",settlementStatus:creditLevel === "C0" ? "frozen" : "ready",block:creditLevel === "C0" ? "信用等级 C0" : "—",traceId:`trace-${partner.id}-case-03`}
    ];
    const noteTemplates = partner360Notes(partner.id);
    const notes = noteTemplates.length ? noteTemplates : [
      {id:`note-${partner.id}-001`,time:partner.updated,author:partner.owner,type:"同步",content:"已完成合作方主档与CRM账户状态核对。",nextFollowUp:"—"}
    ];
    const queueTasks = (prototype.taskQueue?.toLegacyRows(state.role) || []).filter(item=>item.partnerId===partner.id);
    const tasks = queueTasks.map(item=>({id:item.id,type:item.type,status:item.status,assignee:item.owner,due:item.sla,sla:statusLabel(item.status)}));
    const kycStatus = partner.kyc?.status || "pending";
    const kybStatus = partner.kyb?.status || "not_required";
    return {
      partner, riskBand, creditLevel, crmStatus, blockers, notes, tasks, cases,
      owner:partner.owner || "未分配",
      stats:{clicks,registrations,ftd,validFtd,commission,pendingSettlement},
      freshness:{dataAsOf:"2026-11-09 10:30 UTC+8",snapshot:`snapshot-${partner.id}-20261109`,sources:["CRM 10:29","Affiliate 10:30","Risk 10:28"]},
      compliance:{
        crmSubjectId:partner.crmId, authProvider:"CRM Identity", lastSync:partner.kyc?.syncAt || "—", syncStatus:kycStatus === "sync_failed" ? "failed" : "healthy",
        kyc:{type:partner.type === "个人合作方" ? "KYC" : "KYB + KYC",status:kycStatus,launchAt:partner.onboard?.submittedAt || "2026-10-12 10:20",completedAt:kycStatus === "verified" ? (partner.kyc?.syncAt || "2026-10-12 10:20") : "—",result:kycStatus === "verified" ? "通过" : kybStatus === "failed" ? "失败" : "待同步",ref:`CRM-KYC-${partner.id.slice(-4)}`},
        kyb:{type:partner.type === "个人合作方" ? "不适用" : "KYB",status:kybStatus,launchAt:partner.onboard?.submittedAt || "2026-10-12 10:20",completedAt:kybStatus === "verified" ? (partner.kyb?.syncAt || "2026-10-12 10:20") : "—",result:kybStatus === "verified" ? "通过" : kybStatus === "failed" ? "失败" : "待同步",ref:`CRM-KYB-${partner.id.slice(-4)}`},
        agreement:{status:partner.stage === "archived" ? "已终止" : "已接受",version:"v3.2",acceptedAt:"2026-10-12 10:30",expiresAt:partner.stage === "archived" ? "—" : "2027-10-12"},
        payout:{accountType:"银行账户",provider:"受控收款服务",last4:"•••• 4821",status:partner.stage === "archived" ? "已停用" : "已验证",changedAt:"2026-10-28 11:20"},
        tax:{type:"企业税务资料",country:partner.country,entity:`${partner.country} Legal Entity`,status:partner.stage === "archived" ? "已归档" : "已备案",changedAt:"2026-10-15 09:00"},
        issues:kycStatus === "sync_failed" ? [{id:`sync-${partner.id.slice(-4)}`,type:"CRM KYC同步超时",source:"CRM",code:"CRM-KYC-504",firstSeen:"2026-11-04 20:15",lastRetry:"2026-11-09 10:18",taskId:`task-${partner.id.slice(-4)}-01`}] : []
      },
      promotion:{
        activities:[
          {id:`act-${partner.id.slice(-4)}-01`,name:"Always On Acquisition",type:"常规拉新",period:"2026-10-10 → 2026-12-31",status:partner.stage === "archived" ? "offline" : "active",links:partner.stage === "archived" ? 0 : 3},
          {id:`act-${partner.id.slice(-4)}-02`,name:"Q4 Quality Boost",type:"质量服务",period:"2026-10-01 → 2026-11-30",status:partner.stage === "watching" ? "paused" : "active",links:2}
        ],
        links:[
          {id:`link-${partner.id.slice(-4)}-01`,campaign:"Always On Acquisition",path:"/official/th/acq-01",status:partner.stage === "archived" ? "expired" : partner.stage === "watching" ? "suspended" : "active",generated:"2026-10-12 10:50",clicks:Math.round(clicks*.46)},
          {id:`link-${partner.id.slice(-4)}-02`,campaign:"Q4 Quality Boost",path:"/official/global/q4-quality",status:partner.stage === "archived" ? "expired" : "active",generated:"2026-10-20 14:00",clicks:Math.round(clicks*.31)}
        ],
        subIds:[
          {id:`sub-${partner.id.slice(-4)}-01`,created:"2026-10-13 12:00",clicks:Math.round(clicks*.28),registrations:Math.round(registrations*.28),ftd:Math.round(ftd*.28),validFtd:Math.round(validFtd*.28)},
          {id:`sub-${partner.id.slice(-4)}-02`,created:"2026-10-21 09:40",clicks:Math.round(clicks*.19),registrations:Math.round(registrations*.19),ftd:Math.round(ftd*.19),validFtd:Math.round(validFtd*.19)}
        ],
        postback:{success:Math.max(0,registrations-2),failed:kycStatus === "sync_failed" ? 5 : 1,retrying:kycStatus === "sync_failed" ? 3 : 0,lastFailed:kycStatus === "sync_failed" ? "2026-11-09 10:18" : "2026-11-06 13:40",error:kycStatus === "sync_failed" ? "CRM-KYC-504" : "—"},
        attribution:{registrations,locked:Math.max(0,registrations-3),conflicts:partner.id === "partner-1013" ? 4 : 1,ibExcluded:partner.id === "partner-1013" ? 2 : 0,missing:kycStatus === "sync_failed" ? 5 : 0}
      },
      risk:{
        snapshot:{score:riskBand === "R3" ? 86 : riskBand === "R2" ? 61 : riskBand === "R1" ? 34 : 12,status:riskBand === "R3" ? "investigating" : riskBand === "R2" ? "observing" : "clear",calculated:"2026-11-09 10:28",events:riskBand === "R3" ? 3 : riskBand === "R2" ? 1 : 0},
        credit:{score:partner.credit?.score || 500,level:creditLevel,dimensions:"转化质量 · 资料完整性 · 结算稳定性 · 事件质量 · 合作时长",benefit:creditLevel === "C0" ? "无附加权益" : "基础结算权益 + 质量服务资格"},
        events:riskBand === "R3" ? [{id:`risk-${partner.id.slice(-4)}-01`,type:"集群关联",source:"Risk Engine",status:"investigating",hitAt:"2026-11-08 18:20",affected:"2笔佣金案件"},{id:`risk-${partner.id.slice(-4)}-02`,type:"CRM欺诈引用",source:"CRM",status:"confirmed",hitAt:"2026-11-08 18:24",affected:"合作方信用档案"}] : riskBand === "R2" ? [{id:`risk-${partner.id.slice(-4)}-01`,type:"质量波动",source:"Affiliate",status:"observing",hitAt:"2026-11-07 09:20",affected:"质量服务附加"}] : [],
        cluster:{id:riskBand === "R3" ? `cluster-${partner.id.slice(-4)}` : "—",relation:riskBand === "R3" ? "同设备/IP聚类" : "无直接集群",feature:"设备指纹••A17 · IP段•••.24/29",members:riskBand === "R3" ? 3 : 0,status:riskBand === "R3" ? "investigating" : "clear"},
        fraud:{id:riskBand === "R3" ? `CRM-FRAUD-${partner.id.slice(-4)}` : "—",conclusion:riskBand === "R3" ? "命中CRM高风险引用" : "未命中",status:riskBand === "R3" ? "confirmed" : "no_hit",synced:"2026-11-08 18:24"},
        propagation:riskBand === "R3" ? [{source:"CRM欺诈引用",delta:-80,target:"C0",result:"已传导",window:"30天复核窗口"}] : []
      },
      audit:[
        {time:"2026-11-09 10:30",action:"打开合作方360",actor:roleOwnerNames[state.role] || "系统",result:"success"},
        {time:partner.updated,action:"CRM资料同步",actor:"CRM",result:"success"},
        {time:createDate(2),action:"状态快照刷新",actor:"Affiliate Admin API",result:"success"}
      ]
    };
  }

  function partner360PageTag(value, tone) {
    const toneClass = tone || (["R3","C0","blocked","frozen","failed","terminated","archived","offboarding"].includes(value) ? "danger" : ["R2","warning","observing","processing","pending","restricted","watching"].includes(value) ? "warning" : ["R0","C2","C3","active","healthy","clear","verified"].includes(value) ? "success" : "info");
    return `<span class="p360-tag ${toneClass}">${h(value==="ready" ? "待核验" : statusLabel(value))}</span>`;
  }

  function partner360PageMetric(label, value, note, action) {
    return `<button class="p360-metric" data-p360-metric="${h(action || "")}" ${action ? "" : "disabled"}><span>${h(label)}</span><strong>${h(value)}</strong><small>${h(note)}</small></button>`;
  }

  function partner360PageHeader(data) {
    const p = data.partner;
    return `<section class="p360-header">
      <div class="p360-header-main">
        <button class="p360-back" data-p360-back aria-label="返回合作方列表">← 合作方列表</button>
        <div class="p360-kicker">合作方 / 合作方列表 / 合作方360</div>
        <div class="p360-title-row"><div><h1>${h(p.name || "未命名合作方")}</h1><p><code>${h(p.id)}</code> · ${h(p.type)} · ${h(p.country)} · CRM ${h(p.crmId)}</p></div><div class="p360-title-actions"><button class="tm-button secondary" data-p360-copy-id>复制编号</button><button class="tm-button primary" data-p360-export>导出摘要</button></div></div>
        <div class="p360-status-row">${partner360PageTag(p.stage)}${partner360PageTag(p.status)}<span class="p360-label">CRM账户</span>${partner360PageTag(data.crmStatus)}<span class="p360-label">信用</span>${partner360PageTag(data.creditLevel)}<span class="p360-label">风险</span>${partner360PageTag(data.riskBand)}</div>
      </div>
      <div class="p360-owner-box"><span>责任运营</span><strong>${h(data.owner)}</strong><button class="tm-button secondary compact" data-p360-owner>分配责任人</button><small>最近更新 ${h(p.updated)}</small></div>
    </section>
    <div class="p360-freshness"><span>数据截至 ${h(data.freshness.dataAsOf)}</span><span>快照 ${h(data.freshness.snapshot)}</span><span>来源：${h(data.freshness.sources.join(" · "))}</span><span>TraceId：<code>trace-${h(p.id)}-360</code></span></div>`;
  }

  function partner360PageBlockers(data) {
    if (!data.blockers.length) return `<section class="p360-clear-banner"><strong>当前没有业务阻断</strong><span>合作方可按当前业务、风险和结算规则继续运行。</span></section>`;
    const primary = data.blockers[0];
    return `<section class="p360-blocker-banner"><div><strong>主阻断：${h(primary.label)}</strong><span>来源 ${h(primary.source)} · 处理入口 ${h(partner360PageTabs.find(tabItem => tabItem.id === primary.tab)?.label || "概览")}</span></div><div class="p360-blocker-list">${data.blockers.map(item => `<button class="p360-blocker-chip ${item.severity}" data-p360-blocker-tab="${h(item.tab)}">${h(item.label)}</button>`).join("")}</div></section>`;
  }

  function partner360PageAside(data) {
    const openTasks=data.tasks.filter(task=>!["done","closed","cancelled","completed"].includes(task.status));
    return `<aside class="p360-aside">
      <section class="p360-panel"><header><div><h2>待办与审批</h2><p>只显示当前合作方未完成事项</p></div><button class="p360-link" data-p360-tab-link="follow-up">查看全部</button></header>${openTasks.length ? `<div class="p360-task-list">${openTasks.slice(0,4).map(task => `<button class="p360-task" data-p360-task="${h(task.id)}"><span>${h(task.type)}</span><strong>${h(task.id)}</strong><small>${h(task.assignee)} · ${h(task.due)} · ${partner360PageTag(task.status)}</small></button>`).join("")}</div>` : `<div class="p360-empty-inline">暂无开放任务</div>`}</section>
      <section class="p360-panel"><header><div><h2>风险摘要</h2><p>R档与当前阻断单独展示</p></div><button class="p360-link" data-p360-tab-link="risk">打开风险</button></header><div class="p360-side-stat"><span>风险分</span><strong>${h(data.risk.snapshot.score)}</strong>${partner360PageTag(data.riskBand)}</div><div class="p360-side-stat"><span>信用积分</span><strong>${h(data.risk.credit.score)}</strong>${partner360PageTag(data.creditLevel)}</div><p class="p360-muted">${h(data.risk.snapshot.status === "clear" ? "当前没有直接风险事件。" : `当前有 ${data.risk.snapshot.events} 个风险事件，详情见风险与信用。`)}</p></section>
      <section class="p360-panel"><header><div><h2>最近跟进</h2><p>内部备注只读历史</p></div><button class="p360-link" data-p360-tab-link="follow-up">新增备注</button></header>${data.notes.slice(0,3).map(note => `<article class="p360-note-mini"><span>${h(note.time)} · ${h(note.author)}</span><p>${h(note.content)}</p></article>`).join("")}</section>
    </aside>`;
  }

  function partner360PageOverview(data) {
    const p = data.partner;
    const openTaskCount=data.tasks.filter(task=>!["done","closed","cancelled","completed"].includes(task.status)).length;
    return `<div class="p360-tab-content">
      <section class="p360-panel"><header><div><h2>身份与联系摘要</h2><p>CRM为账户、资料和认证事实源，本页只读引用。</p></div></header><div class="p360-grid p360-grid-4">${[
        ["合作方编号",p.id],["合作方类型",p.type],["国家 / 主体",`${p.country} · ${p.country} Legal Entity`],["CRM主体ID",p.crmId],["联系邮箱","m••••••@example.com"],["联系电话","+66 •••• 4821"],["业务状态",partner360PageTag(p.stage)],["CRM账户状态",partner360PageTag(data.crmStatus)]
      ].map(([label,value])=>`<div class="p360-field"><span>${h(label)}</span><strong>${typeof value === "string" && value.startsWith("<") ? value : h(value)}</strong></div>`).join("")}</div></section>
      <section class="p360-panel"><header><div><h2>状态与阻断</h2><p>资金、风险、合规状态分别计算并保留来源。</p></div><button class="p360-link" data-p360-tab-link="finance">查看财务</button></header><div class="p360-summary-grid"><div><span>结算资格</span><strong>${partner360PageTag(data.riskBand === "R3" || data.creditLevel === "C0" ? "blocked" : "ready")}</strong></div><div><span>提现资格</span><strong>${partner360PageTag(data.partner.stage === "archived" ? "disabled" : "ready")}</strong></div><div><span>开放任务</span><strong>${openTaskCount} 项</strong></div><div><span>阻断数量</span><strong>${data.blockers.length} 项</strong></div></div></section>
      <section class="p360-panel"><header><div><h2>业务健康摘要</h2><p>近30日摘要，不替代报表和佣金底账。</p></div><button class="p360-link" data-p360-tab-link="promotion">查看推广</button></header><div class="p360-health"><div><span>客户数</span><strong>${h(data.stats.registrations)}</strong></div><div><span>有效FTD率</span><strong>${data.stats.ftd ? percent(data.stats.validFtd/data.stats.ftd*100) : "待同步"}</strong></div><div><span>当前佣金</span><strong>${money(data.stats.commission)}</strong></div><div><span>待结算</span><strong>${money(data.stats.pendingSettlement)}</strong></div></div></section>
    </div>`;
  }

  function partner360PagePromotion(data) {
    return `<div class="p360-tab-content"><section class="p360-panel"><header><div><h2>活动与链接</h2><p>活动、链接和Sub ID全部只读；状态跟随合作方业务状态。</p></div></header><div class="p360-section-title">活动</div><div class="p360-table-wrap"><table><thead><tr><th>活动</th><th>类型</th><th>周期</th><th>状态</th><th>链接数</th></tr></thead><tbody>${data.promotion.activities.map(row=>`<tr><td><strong>${h(row.name)}</strong><small>${h(row.id)}</small></td><td>${h(row.type)}</td><td>${h(row.period)}</td><td>${partner360PageTag(row.status)}</td><td>${row.links}</td></tr>`).join("")}</tbody></table></div><div class="p360-section-title">推广链接</div><div class="p360-table-wrap"><table><thead><tr><th>链接</th><th>活动</th><th>官方路径</th><th>状态</th><th>近30日点击</th><th>生成时间</th></tr></thead><tbody>${data.promotion.links.map(row=>`<tr><td><strong>${h(row.id)}</strong><button class="p360-inline-link" data-p360-copy-value="${h(row.id)}">复制</button></td><td>${h(row.campaign)}</td><td><code>${h(row.path)}</code></td><td>${partner360PageTag(row.status)}</td><td>${h(row.clicks)}</td><td>${h(row.generated)}</td></tr>`).join("")}</tbody></table></div></section><section class="p360-panel"><header><div><h2>Sub ID 与回传</h2><p>只读效果摘要；异常跳转统一监控。</p></div></header><div class="p360-table-wrap"><table><thead><tr><th>Sub ID</th><th>创建时间</th><th>点击</th><th>注册</th><th>FTD</th><th>有效FTD</th></tr></thead><tbody>${data.promotion.subIds.map(row=>`<tr>${[row.id,row.created,row.clicks,row.registrations,row.ftd,row.validFtd].map((value,index)=>`<td>${index===0?`<strong>${h(value)}</strong>`:h(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="p360-summary-grid p360-summary-grid-5">${[["成功",data.promotion.postback.success],["失败",data.promotion.postback.failed],["重试",data.promotion.postback.retrying],["归属锁定",data.promotion.attribution.locked],["归因冲突",data.promotion.attribution.conflicts]].map(([label,value])=>`<div><span>${h(label)}</span><strong>${h(value)}</strong></div>`).join("")}</div><p class="p360-muted">最近失败：${h(data.promotion.postback.lastFailed)} · 错误码：${h(data.promotion.postback.error)} · IB隔离 ${h(data.promotion.attribution.ibExcluded)} · 缺失 ${h(data.promotion.attribution.missing)}</p></section></div>`;
  }

  function partner360PageCompliance(data) {
    const c = data.compliance;
    const sensitive = state.partner360SensitiveFields;
    const payoutVisible = sensitive.has("payout") && (!state.partner360SensitiveExpiry.payout || state.partner360SensitiveExpiry.payout > Date.now());
    const payout = payoutVisible ? "ACCT-0098-4821-7712" : c.payout.last4;
    return `<div class="p360-tab-content"><section class="p360-panel"><header><div><h2>CRM账户与认证</h2><p>CRM是账户、KYC/KYB和欺诈事实源，Affiliate不重新认证。</p></div><button class="p360-link" data-p360-tab-link="follow-up">查看同步记录</button></header><div class="p360-grid p360-grid-4">${[["CRM主体ID",c.crmSubjectId],["认证提供方",c.authProvider],["最后同步",c.lastSync],["同步状态",partner360PageTag(c.syncStatus)]].map(([label,value])=>`<div class="p360-field"><span>${h(label)}</span><strong>${typeof value === "string" && value.startsWith("<") ? value : h(value)}</strong></div>`).join("")}</div><div class="p360-cert-grid">${[["KYC / KYC状态",c.kyc],["KYB状态",c.kyb]].map(([label,item])=>`<article class="p360-cert-card"><span>${h(label)}</span><strong>${partner360PageTag(item.status)}</strong><small>${h(item.result)} · ${h(item.completedAt)}</small><code>${h(item.ref)}</code></article>`).join("")}</div></section><section class="p360-panel"><header><div><h2>协议、收款与税务资料</h2><p>敏感字段默认脱敏，按字段授权后临时查看并写入审计；60秒后自动恢复脱敏。</p></div></header><div class="p360-grid p360-grid-3"><div class="p360-field"><span>协议</span><strong>${partner360PageTag(c.agreement.status)}</strong><small>${h(c.agreement.version)} · 到期 ${h(c.agreement.expiresAt)}</small></div><div class="p360-field"><span>收款账户</span><strong>${h(payout)}</strong><small>${h(c.payout.provider)} · ${h(c.payout.status)}</small>${payoutVisible ? `<button class="p360-inline-link" data-p360-copy-sensitive="payout">复制已揭示账户</button><button class="p360-inline-link" data-p360-hide-sensitive="payout">立即隐藏</button>` : `<button class="p360-inline-link" data-p360-reveal="payout">申请临时查看</button>`}</div><div class="p360-field"><span>税务资料</span><strong>${h(c.tax.type)}</strong><small>${h(c.tax.country)} · ${h(c.tax.status)}</small><button class="p360-inline-link" data-p360-reveal="tax">查看变更记录</button></div></div></section><section class="p360-panel"><header><div><h2>同步异常</h2><p>冲突、超时和回调乱序只生成任务，不覆盖CRM事实。</p></div></header>${c.issues.length ? `<div class="p360-issue-list">${c.issues.map(issue=>`<article><div><strong>${h(issue.type)}</strong>${partner360PageTag("failed")}</div><p>${h(issue.source)} · ${h(issue.code)} · 首次 ${h(issue.firstSeen)} · 最近重试 ${h(issue.lastRetry)}</p><button class="tm-button secondary compact" data-p360-task-new="crm-sync">发起同步异常任务</button></article>`).join("")}</div>` : `<div class="p360-empty-inline">当前没有CRM同步异常。</div>`}</section></div>`;
  }

  function partner360PageFinance(data) {
    const s = data.stats;
    return `<div class="p360-tab-content"><section class="p360-panel"><header><div><h2>业绩与资金摘要</h2><p>当前时间范围：${state.partner360Period === "last_7d" ? "近7日" : state.partner360Period === "this_month" ? "本月" : "近30个自然日"} · USD</p></div><select class="p360-period" data-p360-period><option value="last_7d" ${state.partner360Period === "last_7d" ? "selected" : ""}>近7日</option><option value="last_30d" ${state.partner360Period === "last_30d" ? "selected" : ""}>近30日</option><option value="this_month" ${state.partner360Period === "this_month" ? "selected" : ""}>本月</option></select></header><div class="p360-summary-grid p360-summary-grid-5">${[["点击",s.clicks],["注册",s.registrations],["FTD",s.ftd],["有效FTD",s.validFtd],["佣金",money(s.commission)],["待结算",money(s.pendingSettlement)]].map(([label,value])=>`<div><span>${h(label)}</span><strong>${h(value)}</strong></div>`).join("")}</div></section><section class="p360-panel"><header><div><h2>佣金 / 结算案件</h2><p>冻结绑定 customer_id + commission_case_id + settlement_case_id。</p></div></header><div class="p360-table-wrap"><table><thead><tr><th>客户</th><th>佣金案件</th><th>结算案件</th><th>金额</th><th>佣金状态</th><th>结算状态</th><th>阻断原因</th><th>TraceId</th></tr></thead><tbody>${data.cases.map(row=>`<tr><td><strong>${h(row.customerId)}</strong></td><td>${h(row.commissionCaseId)}</td><td>${h(row.settlementCaseId)}</td><td>${money(row.amount)}</td><td>${partner360PageTag(row.commissionStatus)}</td><td>${partner360PageTag(row.settlementStatus)}</td><td>${h(row.block)}</td><td><code>${h(row.traceId)}</code></td></tr>`).join("")}</tbody></table></div></section><section class="p360-panel"><header><div><h2>提现与保证金</h2><p>资金敏感动作进入任务或审批队列。</p></div><button class="tm-button secondary compact" data-p360-task-new="finance">发起资金核对任务</button></header><div class="p360-grid p360-grid-4"><div class="p360-field"><span>提现摘要</span><strong>${partner360PageTag(data.partner.stage === "archived" ? "disabled" : "ready")}</strong><small>待审核 0 · 处理中 ${money(Math.round(s.pendingSettlement*.2))} · 失败 0</small></div><div class="p360-field"><span>保证金余额</span><strong>${money(Math.round(s.pendingSettlement*.32))}</strong><small>占用 ${money(Math.round(s.pendingSettlement*.18))}</small></div><div class="p360-field"><span>覆盖率</span><strong>${s.pendingSettlement ? percent(132) : "待同步"}</strong><small>安全线 120%</small></div><div class="p360-field"><span>最近提现</span><strong>2026-11-06</strong><small>状态 ${partner360PageTag("success")}</small></div></div></section></div>`;
  }

  function partner360PageRisk(data) {
    return `<div class="p360-tab-content"><section class="p360-panel"><header><div><h2>风险与信用快照</h2><p>R档与C档分别计算、分别审计、分别保存。</p></div><button class="tm-button secondary compact" data-p360-task-new="risk">发起风险复核任务</button></header><div class="p360-risk-snapshot"><div class="p360-risk-score"><span>风险分</span><strong>${h(data.risk.snapshot.score)}</strong>${partner360PageTag(data.riskBand)}</div><div class="p360-risk-score"><span>信用积分</span><strong>${h(data.risk.credit.score)}</strong>${partner360PageTag(data.creditLevel)}</div><div class="p360-risk-copy"><span>风险状态</span><strong>${partner360PageTag(data.risk.snapshot.status)}</strong><p>计算于 ${h(data.risk.snapshot.calculated)} · 来源事件 ${h(data.risk.snapshot.events)}</p></div><div class="p360-risk-copy"><span>信用权益</span><strong>${h(data.risk.credit.benefit)}</strong><p>${h(data.risk.credit.dimensions)}</p></div></div></section><section class="p360-panel"><header><div><h2>风险事件与集群关联</h2><p>本页只读摘要，完整证据进入风险工作台。</p></div></header>${data.risk.events.length ? `<div class="p360-table-wrap"><table><thead><tr><th>事件编号</th><th>类型</th><th>来源</th><th>状态</th><th>命中时间</th><th>影响案件</th></tr></thead><tbody>${data.risk.events.map(row=>`<tr><td><strong>${h(row.id)}</strong></td><td>${h(row.type)}</td><td>${h(row.source)}</td><td>${partner360PageTag(row.status)}</td><td>${h(row.hitAt)}</td><td>${h(row.affected)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="p360-empty-inline">当前没有直接风险事件。</div>`}<div class="p360-cluster"><div><span>集群</span><strong>${h(data.risk.cluster.id)}</strong></div><div><span>关系</span><strong>${h(data.risk.cluster.relation)}</strong></div><div><span>共享特征</span><strong>${h(data.risk.cluster.feature)}</strong></div><div><span>成员数</span><strong>${h(data.risk.cluster.members)}</strong></div><div><span>状态</span><strong>${partner360PageTag(data.risk.cluster.status)}</strong></div></div></section><section class="p360-panel"><header><div><h2>CRM欺诈引用与风险传导</h2><p>CRM结论只读，Affiliate不覆盖原始事实。</p></div></header><div class="p360-grid p360-grid-3"><div class="p360-field"><span>CRM欺诈引用</span><strong>${h(data.risk.fraud.id)}</strong><small>${h(data.risk.fraud.conclusion)} · ${partner360PageTag(data.risk.fraud.status)}</small></div><div class="p360-field"><span>同步时间</span><strong>${h(data.risk.fraud.synced)}</strong><small>引用状态只读</small></div><div class="p360-field"><span>风险传导</span><strong>${data.risk.propagation.length ? h(data.risk.propagation[0].target) : "无"}</strong><small>${data.risk.propagation.length ? h(data.risk.propagation[0].result) : "暂无传导记录"}</small></div></div></section></div>`;
  }

  function partner360PageFollowUp(data) {
    const timeline=data.tasks.length?data.tasks.map(item=>`<article><span class="p360-timeline-dot"></span><div><header><strong>${h(item.id)} · ${h(item.type)}</strong>${partner360PageTag(item.status)}</header><p>负责人 ${h(item.assignee)} · ${h(item.sla)}</p><button class="p360-inline-link" data-p360-task="${h(item.id)}">打开任务上下文</button></div></article>`).join(""):`<p>暂无关联任务或审批记录。</p>`;
    return `<div class="p360-tab-content"><section class="p360-panel"><header><div><h2>跟进备注</h2><p>历史正文不可编辑；软删除保留审计。</p></div><div class="p360-title-actions"><button class="tm-button secondary compact" data-p360-task-new="risk">发起风险复核</button><button class="tm-button primary compact" data-p360-note-new>新增备注</button></div></header><div class="p360-note-list">${data.notes.map(note=>`<article><header><strong>${h(note.author)}</strong><span>${h(note.type)} · ${h(note.time)}</span></header><p>${h(note.content)}</p><small>下次跟进：${h(note.nextFollowUp || "—")} · 记录编号 ${h(note.id)}</small></article>`).join("")}</div></section><section class="p360-panel"><header><div><h2>任务与审批时间线</h2><p>查看关联任务及其处理结果。</p></div></header><div class="p360-timeline">${timeline}</div></section><section class="p360-panel"><header><div><h2>审计摘要</h2><p>完整记录进入统一审计页。</p></div><button class="p360-link" data-open-audit>打开全局审计</button></header><div class="p360-audit-list">${data.audit.map(item=>`<div><span>${h(item.time)} · ${h(item.actor)}</span><strong>${h(item.action)}</strong><small>${h(statusLabel(item.result))} · partner_id ${h(data.partner.id)}</small></div>`).join("")}</div></section></div>`;
  }

  function partner360PageBody(data) {
    const body = {
      overview:partner360PageOverview,
      promotion:partner360PagePromotion,
      compliance:partner360PageCompliance,
      finance:partner360PageFinance,
      risk:partner360PageRisk,
      "follow-up":partner360PageFollowUp
    }[state.tabId] || partner360PageOverview;
    return body(data);
  }

  function partner360Page() {
    if (state.scenario === "loading") return `<div class="p360-loading"><div class="p360-spinner"></div><h2>正在加载合作方360</h2><p>正在读取CRM、Affiliate、Risk和Finance快照。</p></div>`;
    if (state.scenario === "empty") return `<div class="p360-empty-page"><h2>暂无合作方360数据</h2><p>该合作方没有可展示的聚合事实，请从合作方列表重新选择对象。</p><button class="tm-button secondary" data-p360-back>返回合作方列表</button></div>`;
    const data = partner360PageFixture();
    if (!data) return `<div class="p360-empty-page"><h2>合作方不存在</h2><p>partner_id 无效或对象已被移除。</p><button class="tm-button secondary" data-p360-back>返回合作方列表</button></div>`;
    return `<div class="p360-page">${partner360PageHeader(data)}${partner360PageBlockers(data)}<section class="p360-metrics">${partner360PageMetric("点击",compact(data.stats.clicks),"近30日 · 有效点击","promotion")}${partner360PageMetric("注册",compact(data.stats.registrations),"近30日 · 保留归因","promotion")}${partner360PageMetric("FTD",compact(data.stats.ftd),"CRM确认首入金","finance")}${partner360PageMetric("有效FTD",compact(data.stats.validFtd),"通过资格与合规校验","finance")}${partner360PageMetric("佣金",money(data.stats.commission),"近30日 · USD","finance")}${partner360PageMetric("待结算",money(data.stats.pendingSettlement),"当前未完成案件","finance")}</section><nav class="p360-tabs" role="tablist" aria-label="合作方360页签">${partner360PageTabs.map(tabItem=>`<button class="${state.tabId===tabItem.id?"active":""}" data-partner360-page-tab="${h(tabItem.id)}" role="tab" aria-selected="${state.tabId===tabItem.id}">${h(tabItem.label)}</button>`).join("")}</nav><div class="p360-workspace"><main class="p360-main">${partner360PageBody(data)}</main>${partner360PageAside(data)}</div></div>${partner360PageActionModal()}`;
  }

  function partner360PageActionModal() {
    const modal = state.partner360ActionModal;
    if (!modal) return "";
    const data = partner360PageFixture();
    if (modal.kind === "note") return `<div class="p360-modal-backdrop"><section class="p360-modal" role="dialog" aria-modal="true"><header><div><h2>新增跟进备注</h2><p>${h(data?.partner.name || "")} · 备注会写入跟进与审计。</p></div><button class="tm-icon-button" data-p360-modal-close aria-label="关闭">×</button></header><label>备注内容<textarea data-p360-note-field="content" placeholder="记录沟通结论、风险说明或下一步动作"></textarea></label><label>下次跟进时间<input data-p360-note-field="followUp" type="date"></label><footer><button class="tm-button secondary" data-p360-modal-close>取消</button><button class="tm-button primary" data-p360-modal-submit>保存备注</button></footer></section></div>`;
    if (modal.kind === "owner") return `<div class="p360-modal-backdrop"><section class="p360-modal" role="dialog" aria-modal="true"><header><div><h2>分配责任人</h2><p>变更会刷新头部和跟进时间线，并写入审计。</p></div><button class="tm-icon-button" data-p360-modal-close aria-label="关闭">×</button></header><label>目标责任人<select data-p360-owner-field><option>运营/Ops</option><option>风控/Risk</option><option>财务/Finance</option><option>合规/Compliance</option><option>系统/Tech</option></select></label><label>变更原因<textarea data-p360-owner-reason placeholder="请填写责任边界或交接原因"></textarea></label><footer><button class="tm-button secondary" data-p360-modal-close>取消</button><button class="tm-button primary" data-p360-modal-submit>确认分配</button></footer></section></div>`;
    const taskOptions=Object.entries({general:"合作方资料核对","crm-sync":"CRM同步异常",finance:"资金核对",risk:"风险复核"}).map(([value,label])=>`<option value="${value}" ${modal.taskType===value?"selected":""}>${label}</option>`).join("");
    return `<div class="p360-modal-backdrop"><section class="p360-modal" role="dialog" aria-modal="true"><header><div><h2>发起处理任务</h2><p>任务进入统一任务队列，页面不直接执行资金或风险动作。</p></div><button class="tm-icon-button" data-p360-modal-close aria-label="关闭">×</button></header><label>任务类型<select data-p360-task-type>${taskOptions}</select></label><label>优先级<select data-p360-task-priority><option>普通</option><option>高</option><option>紧急</option></select></label><label>任务说明<textarea data-p360-task-reason placeholder="请填写处理范围、影响摘要和下一步"></textarea></label><footer><button class="tm-button secondary" data-p360-modal-close>取消</button><button class="tm-button primary" data-p360-modal-submit>创建任务</button></footer></section></div>`;
  }

  function pageMain() {
    if(taskObjectPageActive())return `${taskObjectPage()}${tqDialog()}`;
    if (state.routeId === "tickets") return supportUI.page();
    if (state.routeId === "admin-config") return businessConfigWorkspace();
    return pageMainContent();
  }

  function riskWorkbenchStore() {
    const store = prototype.riskWorkbench || {summary:{},objects:[],events:[],clusters:[],blacklist:[],tasks:[],approvals:[],executions:[],caseLinks:[],serverNow:""};
    if (!prototype.taskQueue?.toRiskRows) return store;
    const riskSources = new Set([
      ...(store.events || []).map(item => item.id),
      ...(store.clusters || []).map(item => item.id),
      ...(store.blacklist || []).map(item => item.id),
      ...(store.objects || []).map(item => item.id)
    ]);
    const riskCaseIds = new Set((store.caseLinks || []).flatMap(item => [item.customer,item.commission,item.settlement]));
    const seedTaskIds = new Set((store.tasks || []).map(item => item.id));
    const sharedTasks = prototype.taskQueue.toRiskRows(state.role).filter(item =>
      seedTaskIds.has(item.id) || riskSources.has(item.source) || riskCaseIds.has(item.source) ||
      (Array.isArray(item.cases) && item.cases.some(value => [...riskCaseIds].some(id => String(value).includes(id))))
    );
    const sharedById = new Map(sharedTasks.map(item => [item.id,item]));
    const tasks = (store.tasks || []).map(seed => {
      const shared = sharedById.get(seed.id);
      return shared ? {...seed,...shared, id:seed.id, status:shared.task_status || seed.status || shared.status, task_status:shared.task_status || seed.status || shared.status, workflow_state:shared.workflow_state || shared.status || seed.workflow_state, source:seed.source || shared.source, purpose:seed.purpose || shared.purpose, purposeLabel:seed.purposeLabel || shared.purposeLabel, cases:seed.cases || shared.cases, reason:seed.reason || shared.reason} : seed;
    });
    sharedTasks.forEach(shared => {
      if (tasks.some(task => task.id === shared.id)) return;
      const detail = (()=>{try{return prototype.taskQueue.detail(shared.id,{role:state.role});}catch{return null;}})();
      const sourceId = shared.source;
      const sourceEvent = (store.events || []).find(item => item.id === sourceId);
      const sourceCluster = (store.clusters || []).find(item => item.id === sourceId);
      const sourceBlacklist = (store.blacklist || []).find(item => item.id === sourceId);
      const source = sourceEvent || sourceCluster || sourceBlacklist;
      tasks.push({
        id:shared.id,
        task_id:shared.id,
        purpose:shared.purpose,
        purposeLabel:shared.purposeLabel,
        source:sourceId,
        status:shared.status,
        owner:shared.owner,
        sla:shared.sla,
        approval:shared.approval,
        execution:shared.execution,
        cases:shared.cases || [],
        reason:detail?.reason || shared.reason || "统一任务队列事实源",
        sourceType:detail?.source_type || (sourceEvent ? "risk_review" : sourceCluster ? "risk_review" : sourceBlacklist ? "risk_review" : null),
        sourceKind:detail?.source_ref?.kind || (sourceEvent ? "event" : sourceCluster ? "cluster" : sourceBlacklist ? "blacklist" : null),
        sourceObject:source || null,
        fields:detail?.fields || {},
        riskLevel:detail?.risk_level || null,
        creditLevel:detail?.credit_level || null,
        fundsStatus:detail?.funds_status || "not_applicable",
        impact:detail?.impact || null
      });
    });
    const approvals = prototype.taskQueue.approvals({role:state.role}).filter(item => tasks.some(task => task.id === item.task_id)).map(item => ({
      id:item.approval_id,task:item.task_id,applicant:item.applicant.display_name,applicantId:item.applicant.user_id,
      status:item.status,execution:item.execution_id || "未创建",reason:item.draft?.reason || "",
      chain:item.nodes.map(node => `${roleOwnerNames[node.role_code] || node.role_code}：${statusLabel(node.status)}`)
    }));
    const taskMap = new Map(tasks.map(item => [item.id,item]));
    const aggregateObject = object => {
      const taskIds = [...new Set((object.eventIds || []).flatMap(eventId => (store.events || []).find(event => event.id === eventId)?.taskIds || []))];
      const related = taskIds.map(id => taskMap.get(id)).filter(Boolean);
      const refs = riskTaskRefsFor(taskIds,{...store,tasks});
      const primary = refs[0];
      const counts = refs.reduce((map,item) => {map[item.status]=(map[item.status] || 0)+1;return map;},{});
      const approvalCounts = refs.flatMap(item => item.approval_statuses).reduce((map,status) => {map[status]=(map[status] || 0)+1;return map;},{});
      const executionCounts = refs.flatMap(item => item.execution_statuses).reduce((map,status) => {map[status]=(map[status] || 0)+1;return map;},{});
      const summary = Object.entries(counts).map(([key,value]) => `${statusLabel(key)} ${value}`).join(" / ") || "无未完成任务";
      return {
        ...object,
        taskIds,
        taskSummary:summary,
        owner:primary?.owner || "未分配",
        sla:primary?.sla || "未配置",
        workSummary:{
          ...(object.workSummary || {}),
          task_counts:counts,
          approval_counts:approvalCounts,
          execution_counts:executionCounts,
          active_task_count:refs.length,
          primary_task:primary ? {...primary,detail:undefined} : null,
          other_active_task_count:Math.max(0,refs.length - 1),
          task_refs:refs.map(({detail,...ref}) => ref)
        }
      };
    };
    const projectedStore = {...store,tasks,approvals};
    const events = (store.events || []).map(row => riskEventProjection(row,projectedStore));
    projectedStore.events = events;
    projectedStore.objects = (store.objects || []).map(row => riskObjectProjection(aggregateObject(row),{...projectedStore,events}));
    projectedStore.clusters = (store.clusters || []).map(row => riskClusterProjection(row,projectedStore));
    projectedStore.blacklist = (store.blacklist || []).map(riskBlacklistProjection);
    const frozenCases = new Map((store.caseLinks || []).filter(item => item.status === "frozen").map(item => [
      `${item.customer}:${item.commission}:${item.settlement}`, item
    ]));
    projectedStore.summary = {
      ...store.summary,
      highRiskObjects:projectedStore.objects.filter(item => item.isOpen !== false && ["R2","R3"].includes(item.riskBand)).length,
      openTasks:tasks.filter(item => !riskTaskTerminal(item)).length,
      pendingApprovals:approvals.filter(item => item.status === "pending_approval").length,
      frozenCases:frozenCases.size,
      frozenAmount:[...frozenCases.values()].reduce((sum,item) => sum + Number(item.frozen || 0),0).toFixed(2)
    };
    if (state.scenario === "summary_error" && !state.riskWorkbenchSummaryRecovered) {
      projectedStore.summary_facts = tqClone(projectedStore.summary);
      projectedStore.summary_data_quality = {status:"unavailable",error_code:"SUMMARY_SOURCE_ERROR",message:"统计来源暂不可用，列表仍保留当前评审快照"};
      projectedStore.summary = {highRiskObjects:null,openTasks:null,pendingApprovals:null,frozenCases:null,frozenAmount:null};
    } else {
      projectedStore.summary_facts = tqClone(projectedStore.summary_facts || projectedStore.summary);
      projectedStore.summary_data_quality = {status:"fresh",error_code:null};
    }
    return projectedStore;
  }

  function riskTypeLabel(type) {
    return ({partner:"合作方",customer:"客户",cluster:"集群",settlement_overdue:"结算超时",partner_risk_aggregation:"合作方聚合风险",cluster_detected:"集群识别",rule_hit:"规则命中"}[type] || type || "-");
  }
  const riskBandLabel = value => ({R0:"R0 正常",R1:"R1 关注",R2:"R2 较高",R3:"R3 高"}[value] || value || "-");
  const riskDeterminationLabel = value => ({pending:"待认定",confirmed:"已确认",rejected:"已驳回"}[value] || value || "—");
  const riskSignalLabel = value => ({open:"待处理",investigating:"调查中",pending_review:"待审核",rejected:"已驳回",confirmed:"已确认",closed:"已关闭"}[value] || value || "—");
  const riskStateTag = (label,value) => `<span class="dev-status ${statusTone(value)}">${h(`${label}：${value === "-" ? "不适用" : label === "认定" ? riskDeterminationLabel(value) : riskSignalLabel(value)}`)}</span>`;
  const riskDateLabel = value => {
    if (!value) return "未配置";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value);
    return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(date).replace(","," ");
  };
  const riskMoney = value => value == null ? "金额待核验" : `USD ${Number(value).toFixed(2)}`;
  const riskSensitiveAllowedRoles = new Set(["risk","risk_supervisor","finance","compliance"]);
  const riskSensitiveMasked = {email:"c••••••@example.com",phone:"+66 •••• 4821",device:"dev_***_81"};
  const riskSensitiveSessionKey = (objectId,field) => `${objectId}:${field}`;
  const riskSensitiveVisible = (objectId,field) => {
    const session = state.riskWorkbenchSensitiveSessions[riskSensitiveSessionKey(objectId,field)];
    return Boolean(session && session.client_deadline > Date.now());
  };
  function riskSensitiveMarkup(objectId,maskedEmail) {
    return `<section class="rwb-sensitive-fields"><h3>受限联系字段</h3><p class="rwb-muted">默认脱敏；仅授权角色可临时揭示或复制。系统只记录访问审计，不写入原值。</p><div class="rwb-sensitive-grid">${Object.entries(riskSensitiveMasked).map(([field,masked]) => {
      const session = state.riskWorkbenchSensitiveSessions[riskSensitiveSessionKey(objectId,field)];
      const visible = riskSensitiveVisible(objectId,field);
      const displayMasked = riskSensitiveAllowedRoles.has(state.role)
        ? prototype.riskWorkbench?.sensitiveAccess?.masked?.({role:state.role,objectRef:objectId,field})
          || (field === "email" ? (maskedEmail || masked) : masked)
        : masked;
      const value = visible ? session.value : displayMasked;
      const action = visible
        ? `<button class="p360-inline-link" data-risk-sensitive-copy="${h(field)}">复制</button><button class="p360-inline-link" data-risk-sensitive-hide="${h(field)}">立即隐藏</button>`
        : riskSensitiveAllowedRoles.has(state.role)
          ? `<button class="p360-inline-link" data-risk-sensitive-reveal="${h(field)}">临时揭示</button>`
          : `<span class="rwb-sensitive-denied">当前角色无权揭示</span>`;
      return `<div><span>${h({email:"邮箱",phone:"手机号",device:"设备标识"}[field])}</span><strong>${h(value)}</strong>${action}</div>`;
    }).join("")}</div></section>`;
  }
  function riskTaskNotificationMarkup(taskId) {
    const deliveries = (prototype.notificationOutbox || []).filter(item => item.riskTaskId === taskId);
    if (!deliveries.length) return "";
    const failed = deliveries.filter(item => item.status === "failed");
    return `<h3>通知投递</h3><div class="rwb-notification-status ${failed.length ? "has-failure" : ""}">
      <p>${failed.length ? `存在 ${failed.length} 条投递异常；业务动作不会因通知失败重复执行。` : "风险任务通知已完成投递。"}</p>
      <div>${deliveries.map(item => `<span>${h(item.channel === "in_app" ? "站内通知" : "邮件")} · ${h(item.recipientRole || item.recipient)} · ${h(item.status === "sent" ? "成功" : item.status === "failed" ? "失败" : "处理中")}${item.error ? ` · ${h(item.error)}` : ""}</span>`).join("")}</div>
      ${failed.length ? `<button class="tm-button secondary compact" data-open-notification-monitor="1">打开投递监控</button>` : ""}
    </div>`;
  }
  const riskTaskReadErrors = new Map();
  const riskTaskDetail = taskId => {
    if (!taskId || !prototype.taskQueue?.detail) return null;
    try {
      const detail = prototype.taskQueue.detail(taskId,{role:state.role});
      riskTaskReadErrors.delete(taskId);
      return detail;
    } catch (error) {
      riskTaskReadErrors.set(taskId,{task_id:taskId,data_quality:{status:"missing",source_systems:[{system:"统一任务队列",status:"missing",as_of:null,fresh_until:null,error_code:error.code || "RISK_TASK_SOURCE_ERROR"}],missing_fields:["task_detail"],error_code:error.code || "RISK_TASK_SOURCE_ERROR"},source_error:{message:"来源读取失败",code:error.code || "RISK_TASK_SOURCE_ERROR",trace_id:error.trace_id || null},history:{items:[]},evidence_refs:[],sections:{}});
      return null;
    }
  };
  const riskTaskDetails = taskIds => [...new Set(taskIds || [])].map(id => riskTaskDetail(id) || riskTaskReadErrors.get(id)).filter(Boolean);
  const riskTaskHistory = details => details.flatMap(detail => detail.history?.items || detail.sections?.history?.items || []);
  const riskTaskEvidence = details => details.flatMap(detail => detail.evidence_refs?.items || detail.evidence_refs || detail.sections?.evidence?.items || [])
    .filter(item => !(item.source === "unified_prototype_fixture" && /-EVIDENCE1$/.test(String(item.evidence_id || item.id || ""))));
  const riskTaskRank = status => ({execution_failed:0,pending_approval:2,pending_execution:3,processing:4,waiting_material:4,executing:4,returned:4,open:5,done:9,closed:9}[status] ?? 8);
  // Task lifecycle and approval workflow are separate state dimensions.
  // Approval pending must not make the task itself look terminal or pending.
  const riskTaskStatus = task => task?.task_status || task?.status || "unknown";
  const riskTaskTerminal = task => ["done","closed"].includes(riskTaskStatus(task));
  const riskTaskRefKey = ref => `${ref?.customer_id || ""}:${ref?.commission_case_id || ""}:${ref?.settlement_case_id || ""}`;
  const riskCaseRefKey = item => riskTaskRefKey({
    customer_id:item?.customer_id || item?.customer,
    commission_case_id:item?.commission_case_id || item?.commission,
    settlement_case_id:item?.settlement_case_id || item?.settlement,
  });
  const riskTaskDetailsFor = taskIds => riskTaskDetails([...new Set(taskIds || [])]);
  const riskTaskPriority = (task, store) => {
    const detail = task?.detail || riskTaskDetail(task?.id || task?.task_id);
    const status = riskTaskStatus(task);
    const executions = detail?.execution_refs || [];
    if (executions.some(item => item.status === "failed" || item.items?.some(entry => entry.status === "failed"))) return 0;
    const due = detail?.sla_due_at || task?.sla;
    const dueTime = due ? Date.parse(due) : NaN;
    if (!riskTaskTerminal(task) && Number.isFinite(dueTime) && dueTime < Date.parse(store?.serverNow || prototype.riskWorkbench?.serverNow || "")) return 1;
    const approvals = detail?.approval_refs || [];
    if (status === "pending_approval" || approvals.some(item => ["pending_approval","pending"].includes(item.status))) return 2;
    if (["pending_execution","processing","waiting_material","executing","returned"].includes(status)) return 3;
    if (status === "open") return 4;
    return riskTaskRank(status);
  };
  const riskTaskRefsFor = (taskIds, store, options = {}) => [...new Set(taskIds || [])]
    .map(id => store.tasks.find(task => task.id === id))
    .filter(Boolean)
    .map(task => {
      const detail = riskTaskDetail(task.id);
      const approvals = detail?.approval_refs || [];
      const executions = detail?.execution_refs || [];
      return {
        task_id:task.id,
        task_purpose:task.purpose,
        status:riskTaskStatus(detail || task),
        approval_ids:approvals.map(item => item.approval_id).filter(Boolean),
        approval_statuses:approvals.map(item => item.status).filter(Boolean),
        execution_ids:executions.map(item => item.execution_id).filter(Boolean),
        execution_statuses:executions.map(item => item.status).filter(Boolean),
        owner:detail?.owner?.display_name || task.owner || null,
        owner_id:detail?.owner?.user_id || null,
        sla:detail?.sla_due_at || task.sla || null,
        version:detail?.version || task.version || null,
        detail
      };
    })
    .filter(item => options.activeOnly === false || !riskTaskTerminal(item))
    .sort((a,b) => riskTaskPriority(a,store) - riskTaskPriority(b,store)
      || (Date.parse(a.sla || "") || Number.MAX_SAFE_INTEGER) - (Date.parse(b.sla || "") || Number.MAX_SAFE_INTEGER)
      || String(a.task_id).localeCompare(String(b.task_id)));
  const riskCountLabel = (counts = {}, empty = "—") => {
    const entries = Object.entries(counts || {}).filter(([,value]) => Number(value) > 0);
    return entries.length
      ? entries.map(([key,value]) => `${statusLabel(key)} ${value}`).join(" / ")
      : empty;
  };
  const riskWorkSummaryMarkup = summary => {
    const task = riskCountLabel(summary?.task_counts);
    const approval = riskCountLabel(summary?.approval_counts);
    const execution = riskCountLabel(summary?.execution_counts);
    const primary = summary?.primary_task?.task_id || summary?.primary_task?.id || "—";
    const otherCount = Number(summary?.other_active_task_count || 0);
    const other = otherCount > 0 ? `另 ${otherCount} 项任务` : "无其他活动任务";
    return `任务：${h(task)}<small>主任务：${h(primary)} · ${h(other)}</small><small>审批：${h(approval)} · 执行：${h(execution)}</small>`;
  };
  const riskQuality = (status = "fresh", missing = [], details = []) => {
    const quality = details.find(detail => detail.data_quality)?.data_quality;
    if (quality) return {...quality,missing_fields:[...new Set([...(quality.missing_fields || []),...missing])]};
    const asOf = details.find(detail => detail.server_now)?.server_now || prototype.riskWorkbench?.serverNow || null;
    return {
      status:missing.length ? "partial" : status,
      source_systems:asOf ? [{system:"统一原型数据源",status:missing.length ? "partial" : status,as_of:asOf,fresh_until:null,error_code:missing.length ? "RISK_SOURCE_PARTIAL" : null}] : [],
      missing_fields:[...new Set(missing)]
    };
  };
  const riskDataQualityMarkup = quality => {
    if (!quality || quality.status === "fresh") return "";
    const title = quality.status === "missing" ? "来源读取失败 / 关键事实待核验" : "数据质量异常 / 关键事实待核验";
    const fields = (quality.missing_fields || []).join("、");
    return `<div class="rwb-alert danger" role="alert"><strong>${h(title)}</strong><span>${fields ? `缺少：${h(fields)}。` : ""}依赖该来源的敏感操作已禁用。</span></div>`;
  };
  const riskEvidence = (id, kind, source, summary, access = "summary") => ({
    evidence_id:id || null,kind:kind || "unknown",source_system:source || "待核验",
    source_ref:null,collected_at:null,summary:summary || "证据摘要待核验",hash:null,
    source_version:null,scan_status:"unknown",access,invalidated:false
  });
  const riskHistory = (records = []) => {
    const seen = new Set();
    return records.filter(Boolean).filter(item => {
      const key = item.audit_id || item.trace_id || `${item.action || ""}:${item.server_time || item.time || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const riskEvidenceMarkup = (items = []) => (items.length
    ? items.map(item => `<article><strong>${h(item.evidence_id || item.id || "待核验")} · ${h(item.kind || "unknown")}</strong><span>${h(item.source_system || item.source || "待核验")} · 引用 ${h(item.source_ref || "待核验")} · 采集 ${h(item.collected_at || "待核验")}</span><small>访问：${h(item.access || "summary")} · 版本：${h(item.source_version || "待核验")} · hash：${h(item.hash || "待核验")} · 扫描：${h(item.scan_status || "unknown")} · ${item.invalidated ? "已失效" : "有效"} · ${h(item.summary || "证据摘要待核验")}</small></article>`).join("")
    : "<p class='rwb-muted'>暂无证据引用</p>");
  const riskHistoryMarkup = (records = []) => {
    const history = riskHistory(records);
    return history.length
      ? history.map(item => `<article><strong>${h(item.action || "记录")}</strong><span>${h(item.actor?.display_name || item.actor || "系统")} · ${h(item.server_time || item.time || "待核验")}</span><small>${h(item.reason || item.result || "—")} · ${h(item.audit_id || item.trace_id || "待核验")}</small></article>`).join("")
      : "<p class='rwb-muted'>暂无历史记录</p>";
  };
  const riskSettlementSummary = caseLinks => {
    const unique = new Map();
    (caseLinks || []).forEach(item => {
      const key = `${item.customer}:${item.commission}:${item.settlement}`;
      if (!unique.has(key)) unique.set(key,item);
    });
    const counts = {};
    let amount = 0;
    unique.forEach(item => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      if (item.status === "frozen") amount += Number(item.frozen || 0);
    });
    return {counts,amount:amount.toFixed(2),total:unique.size};
  };
  const riskObjectProjection = (row, store) => {
    const events = (row.eventIds || []).map(id => store.events.find(item => item.id === id)).filter(Boolean);
    const cases = row.type === "cluster"
      ? [...new Map(events.flatMap(event => event.caseRefs || []).map(ref => {
        const key = riskCaseRefKey(ref);
        return [key, store.caseLinks.find(item => riskCaseRefKey(item) === key)];
      }).filter(([,item]) => item)).values()]
      : store.caseLinks.filter(item => row.type === "customer"
        ? item.customer === row.id
        : item.partner === row.id);
      const taskIds = [...new Set([
        ...events.flatMap(event => [...(event.taskIds || []), ...store.tasks.filter(task => task.source === event.id).map(task => task.id)]),
        ...store.tasks
          .filter(task => task.source === row.id || task.object_id === row.id || task.source_ref?.id === row.id)
          .map(task => task.id)
      ])];
    const allTaskRefs = riskTaskRefsFor(taskIds,store,{activeOnly:false});
    const taskRefs = allTaskRefs.filter(item => !riskTaskTerminal(item));
    const taskCounts = allTaskRefs.reduce((acc,item) => {acc[item.status] = (acc[item.status] || 0) + 1;return acc;},{});
    const approvalCounts = allTaskRefs.flatMap(item => item.approval_statuses).reduce((acc,status) => {acc[status]=(acc[status] || 0)+1;return acc;},{});
    const executionCounts = allTaskRefs.flatMap(item => item.execution_statuses).reduce((acc,status) => {acc[status]=(acc[status] || 0)+1;return acc;},{});
    const settlementCounts = cases.reduce((acc,item) => {acc[item.status] = (acc[item.status] || 0) + 1;return acc;},{});
    return {
      ...row,
      taskIds,
      caseRefs:cases.map(item => ({customer:item.customer,commission:item.commission,settlement:item.settlement,partner:item.partner})),
      affectedCases:cases.length,
      affectedAmount:cases.reduce((sum,item) => sum + Number(item.amount || 0),0).toFixed(2),
      objectRef:{object_type:row.type,object_id:row.id,label:row.label,masked_email:row.maskedEmail === "-" ? null : row.maskedEmail},
      eventCount:events.length,
      countryCodes:[row.country],
      settlementEligible:typeof row.settlementEligible === "boolean" ? row.settlementEligible : null,
      settlementEligibilityReason:row.settlementEligibilityReason || "结算资格待核验",
      firstDetected:events.map(item => item.occurred).sort()[0] || null,
      reasonCodes:[...new Set(events.filter(item => item.primary === row.id || events.length === 1).flatMap(item => [item.reasonCode,item.reason]).filter(Boolean))],
      riskScore:row.riskScore ?? null,
      riskRuleVersion:row.riskRuleVersion || null,
      scoreItems:Array.isArray(row.scoreItems) ? row.scoreItems : [],
      workSummary:{task_counts:taskCounts,approval_counts:approvalCounts,execution_counts:executionCounts,settlement_counts:settlementCounts,active_task_count:taskRefs.length,primary_task:taskRefs[0] ? {...taskRefs[0]} : null,other_active_task_count:Math.max(0,taskRefs.length - 1),task_refs:allTaskRefs,active_task_refs:taskRefs},
      evidenceRefs:[...events.flatMap(event => event.evidenceRefs || []),...riskTaskEvidence(riskTaskDetails(taskIds))],
      history:riskHistory([...events.flatMap(event => event.history || []),...riskTaskHistory(riskTaskDetails(taskIds))]),
      dataQuality:riskQuality("fresh",row.riskScore == null ? ["risk_score"] : [],riskTaskDetails(taskIds)),
      version:row.version || null
    };
  };
  const riskEventProjection = (row, store) => {
    const taskIds = [...new Set([...(row.taskIds || []), ...store.tasks.filter(task => task.source === row.id).map(task => task.id)])];
    const allTaskRefs = riskTaskRefsFor(taskIds,store,{activeOnly:false});
    const taskRefs = allTaskRefs.filter(item => !riskTaskTerminal(item));
    const settlementCounts = row.caseRefs.reduce((acc,ref) => {
      const item = store.caseLinks.find(caseLink => caseLink.settlement === ref.settlement);
      const status = item?.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },{});
    const caseSummary = riskSettlementSummary(row.caseRefs.map(ref => store.caseLinks.find(item => item.settlement === ref.settlement)).filter(Boolean));
    const base = {
      ...row,taskIds,
      eventRef:{event_id:row.id,event_type:row.type,source:row.source},
      eventType:row.type,
      approvalIds:[...new Set(allTaskRefs.flatMap(item => item.approval_ids))],
      executionIds:[...new Set(allTaskRefs.flatMap(item => item.execution_ids))],
      approvalStatuses:[...new Set(allTaskRefs.flatMap(item => item.approval_statuses))],
      executionStatuses:[...new Set(allTaskRefs.flatMap(item => item.execution_statuses))],
      category:row.type === "partner_risk_aggregation" ? "合作方行为" : row.type === "cluster_detected" ? "客户交易质量" : row.type === "rule_hit" ? "身份合规" : row.type === "settlement_overdue" ? "支付资金" : "系统数据",
      reasonCode:row.type === "settlement_overdue" ? "SETTLEMENT_OVERDUE" : row.type === "partner_risk_aggregation" ? "PARTNER_RISK_RATIO" : row.type === "cluster_detected" ? "CLUSTER_FEATURE_MATCH" : "CRM_FRAUD_REFERENCE",
      ruleVersion:row.ruleVersion || null,
      relatedObjectCount:row.related.length,
      appealStatus:row.appealStatus || null,
      approvalIds:[...new Set(allTaskRefs.flatMap(item => item.approval_ids))],
      funds:Object.entries(caseSummary.counts).map(([status,count]) => `${statusLabel(status)} ${count} 笔`).join(" / ") + (caseSummary.total ? ` / USD ${caseSummary.amount}` : ""),
      workSummary:{task_counts:allTaskRefs.reduce((acc,item) => {acc[item.status]=(acc[item.status] || 0)+1;return acc;},{}),approval_counts:allTaskRefs.flatMap(item => item.approval_statuses).reduce((acc,status) => {acc[status]=(acc[status] || 0)+1;return acc;},{}),execution_counts:allTaskRefs.flatMap(item => item.execution_statuses).reduce((acc,status) => {acc[status]=(acc[status] || 0)+1;return acc;},{}),settlement_counts:settlementCounts,active_task_count:taskRefs.length,primary_task:taskRefs[0] ? {...taskRefs[0]} : null,other_active_task_count:Math.max(0,taskRefs.length - 1),task_refs:allTaskRefs,active_task_refs:taskRefs},
      evidenceRefs:[...(row.evidenceRefs || []),...riskTaskEvidence(riskTaskDetails(taskIds))],
      history:riskHistory(riskTaskHistory(riskTaskDetails(taskIds))),
      dataQuality:riskQuality("fresh",row.evidenceRefs?.length ? [] : ["evidence"],riskTaskDetails(taskIds))
    };
    if (row.type === "settlement_overdue") {
      const ref = row.caseRefs[0];
      let source = null;
      let sourceError = null;
      if (prototype.taskQueue?.fixtures?.getSettlementSource) {
        try { source = prototype.taskQueue.fixtures.getSettlementSource(ref.settlement); }
        catch (error) { sourceError = error; }
      }
      const detail = riskTaskDetails(taskIds).find(item => item.sections?.processing?.fields?.case_ref?.settlement_case_id === ref.settlement || item.sections?.processing?.fields?.settlement_id === ref.settlement);
      const fields = detail?.sections?.processing?.fields || {};
      const holdStarted = fields.hold_started_at || source?.hold_started_at || null;
      const serverNow = store.serverNow || null;
      const elapsed = holdStarted && serverNow ? Math.max(0,Math.floor((Date.parse(serverNow)-Date.parse(holdStarted))/86400000)) : null;
      const appealEligibility = source?.appeal_eligibility || fields.appeal_eligibility || null;
      base.signalDetail = {signal_id:fields.signal_id || source?.signal_event_id || null,signal_type:"settlement_overdue",ref:{customer_id:ref.customer,commission_case_id:ref.commission,settlement_case_id:ref.settlement,partner_id:ref.partner,settlement_batch_id:source?.case_ref?.settlement_batch_id || ref.settlement_batch_id || null},signal_status:source?.signal_status || row.signal || null,settlement_status:source?.status || null,hold_started_at:holdStarted,elapsed_days_at_trigger:fields.elapsed_days_at_trigger ?? null,current_elapsed_days:elapsed,threshold_days:fields.threshold_days ?? null,config_version:detail?.sections?.processing?.config_versions?.hold || detail?.sections?.processing?.config_versions?.policy || null,rejected_effective_at:source?.rejected_effective_at || null,appeal_eligibility:appealEligibility,appeal_reason:appealEligibility?.reason_code || null,appeal_used:appealEligibility?.used ?? null,appeal_max:appealEligibility?.max ?? null,no_auto_unfreeze:true,related_appeal_ids:source?.related_appeal_ids || fields.related_appeal_ids || [],version:detail?.version || null};
      if (sourceError) {
        base.dataQuality = riskQuality("missing",["settlement_source"],[...riskTaskDetails(taskIds),{data_quality:{status:"missing",source_systems:[{system:"结算权威来源",status:"missing",as_of:null,fresh_until:null,error_code:sourceError.code || "RISK_SETTLEMENT_SOURCE_ERROR"}],missing_fields:["settlement_source"]}}]);
        base.sourceError = {message:"来源读取失败",code:sourceError.code || "RISK_SETTLEMENT_SOURCE_ERROR",trace_id:sourceError.trace_id || null};
      }
    }
    if (row.type === "partner_risk_aggregation") {
      const detail = riskTaskDetails(taskIds).find(item => item.sections?.processing?.fields?.metric === "risk_customer_ratio" || item.sections?.processing?.fields?.aggregation);
      const taskAggregation = detail?.sections?.processing?.fields?.aggregation;
      const candidate = taskAggregation && typeof taskAggregation === "object" ? taskAggregation : row.aggregationDetail;
      if (candidate?.event_id || candidate?.trigger_snapshot || candidate?.current_snapshot) {
        const triggerSnapshot = candidate.trigger_snapshot
          ? {
            ...candidate.trigger_snapshot,
            customer_ids: Array.isArray(candidate.trigger_snapshot.customer_ids)
              ? candidate.trigger_snapshot.customer_ids
              : [...new Set((candidate.trigger_snapshot.case_refs || candidate.case_refs || []).map(ref => ref.customer_id || ref.customer).filter(Boolean))]
          }
          : null;
        base.aggregationDetail = {
          ...candidate,
          trigger_snapshot:triggerSnapshot,
          current_snapshot:candidate.current_snapshot || null,
          source_scope:candidate.source_scope || candidate.sourceScope || null,
          proposed_scope:candidate.proposed_scope || candidate.proposedScope || null,
          global_escalation_reason:candidate.global_escalation_reason || candidate.globalEscalationReason || null
        };
      } else {
        base.aggregationDetail = null;
      }
    }
    return base;
  };
  const riskClusterProjection = (row, sourceStore = prototype.riskWorkbench || {}) => {
    const linkedEvents = (sourceStore.events || [])
      .filter(event => event.primary === row.id || (event.related || []).includes(row.id));
    const eventTaskIds = [...new Set(linkedEvents.flatMap(event => event.taskIds || []))];
    const activeTaskIds = row.activeTaskIds || eventTaskIds;
    const linkedCaseRefs = linkedEvents.flatMap(event => event.caseRefs || []);
    const caseKeys = new Set(linkedCaseRefs.map(riskCaseRefKey));
    const caseLinks = sourceStore.caseLinks || [];
    const linkedCases = caseLinks.filter(item => caseKeys.has(riskCaseRefKey(item)));
    return ({
    ...row,
    authoritativeException:null,
    riskScore:row.riskScore ?? null,
    riskRuleVersion:row.riskRuleVersion || null,
    createdAt:row.createdAt || row.created || null,
    activeTaskIds,
    dataQuality:riskQuality("fresh",row.riskScore == null ? ["risk_score"] : [],riskTaskDetails(activeTaskIds)),
    version:row.version || null,
    memberDetails:row.memberRows.map(member => {
      const cases = linkedCases.filter(item => item.customer === member[0]);
      return {customerRef:{object_type:"customer",object_id:member[0],label:member[0],masked_email:null},partnerRef:{object_type:"partner",object_id:member[1],label:member[1],masked_email:null},edgeId:member[2] || null,featureType:member[3] || null,maskedFeature:member[4] || null,featureRef:null,sourceSystem:member[5] || null,sourceRef:null,evidenceRefs:[],relationStrength:member[6] || null,relationStatus:member[7] || null,caseRefs:cases.map(item => ({customer_id:item.customer,commission_case_id:item.commission,settlement_case_id:item.settlement,partner_id:item.partner,settlement_batch_id:null})),affectedAmount:{currency:"USD",amount:cases.reduce((sum,item)=>sum+Number(item.amount || 0),0).toFixed(2)}};
    }),
    affectedCases:linkedCases.length,
    affectedAmount:linkedCases.reduce((sum,item) => sum + Number(item.amount || 0),0).toFixed(2),
    evidenceRefs:Array.isArray(row.evidenceRefs) ? row.evidenceRefs : [],
    history:riskHistory(row.history || [])
  });
  };
  const riskBlacklistProjection = row => {
    const shared = prototype.taskQueue?.toRiskRows
      ? prototype.taskQueue.toRiskRows(state.role).filter(task => {
        const detail = riskTaskDetail(task.id);
        const sourceId = detail?.source_ref?.id || detail?.source_ref?.blacklist_id;
        const targetRef = detail?.sections?.processing?.fields?.target_ref || detail?.fields?.target_ref;
        const explicitTaskRef = row.task || row.task_id || row.taskRef?.id || null;
        const targetId = row.targetRef?.id || row.targetRef?.object_id || null;
        const normalizedTarget = typeof targetRef === "object"
          ? targetRef?.id || targetRef?.object_id || targetRef?.target_id || null
          : targetRef;
        return task.source === row.id
          || Boolean(sourceId && sourceId === row.id)
          || Boolean(explicitTaskRef && (task.id === explicitTaskRef || task.task_id === explicitTaskRef))
          || Boolean(normalizedTarget && (normalizedTarget === row.id || (targetId && normalizedTarget === targetId)));
      })
      : [];
    const seedTasks = (prototype.riskWorkbench?.tasks || []).filter(task => task.source === row.id);
    const byId = new Map(seedTasks.map(task => [task.id,{...task}]));
    shared.forEach(task => byId.set(task.id,{...(byId.get(task.id) || {}),...task}));
    const tasks = [...byId.values()];
    const details = riskTaskDetails(tasks.map(task => task.id));
    const activeRemoveTasks = tasks.filter(task => !riskTaskTerminal(task) && task.purpose === "blacklist_remove");
    const pending = activeRemoveTasks.length > 0;
    const completedRemove = tasks.some(task => {
      if (!riskTaskTerminal(task) || task.purpose !== "blacklist_remove") return false;
      const detail = riskTaskDetail(task.id);
      return (detail?.execution_refs || []).some(execution =>
        ["succeeded","success"].includes(execution.status) &&
        (!execution.items?.length || execution.items.every(item => ["succeeded","success"].includes(item.status)))
      );
    });
    const latestDetail = details.sort((a,b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))[0];
    const latestApprovalRef = latestDetail?.approval_refs?.at(-1);
    const latestApproval = latestApprovalRef
      ? (prototype.taskQueue?.approvals({role:state.role}) || []).find(item => item.approval_id === latestApprovalRef.approval_id) || latestApprovalRef
      : null;
    const approvedNode = latestApproval?.nodes?.slice?.().reverse?.().find(node => node.status === "approved" && (node.reviewer || node.approver));
    const partnerId = row.partnerId || row.partner_id || row.targetRef?.partner_id || null;
    const removeAllowed = row.source === "affiliate" && row.status === "active" && !pending;
    return ({
    ...row,
    partnerId,
    expiresAt:row.expiresAt || row.expires || null,
    status:completedRemove ? "removed" : row.status,
    targetRef:row.targetRef || null,
    tokenHash:row.tokenHash || null,
    sourceRef:row.sourceRef || null,
    pendingChange:pending ? "remove" : "none",
    createdBy:row.createdBy || latestDetail?.created_by || null,
    approvedBy:row.approvedBy || approvedNode?.reviewer || approvedNode?.approver || latestApproval?.approver || latestApproval?.reviewer || null,
    createdAt:row.createdAt || row.effective || null,
    updatedAt:row.updatedAt || null,
    activeTaskIds:tasks.filter(task => !riskTaskTerminal(task)).map(task => task.id),
    allowedActions:removeAllowed ? [{action:"blacklist_remove",enabled:true,disabled_reason:null}] : [],
    taskRefs:tasks.map(task => ({id:task.id,purpose:task.purpose,status:riskTaskStatus(task),owner:task.owner || "未分配",sla:task.sla || null})),
    dataQuality:riskQuality("fresh",row.source === "crm" && !row.sourceRef ? ["source_ref"] : [],details),
    version:row.version || null,
    evidenceRefs:Array.isArray(row.evidenceRefs) ? row.evidenceRefs : riskTaskEvidence(details),
    history:riskHistory([...riskTaskHistory(details),...(row.history || [])])
  });
  };

  function riskWorkbenchRows() {
    const store = riskWorkbenchStore();
    const rows = state.tabId === "objects" ? store.objects : state.tabId === "events" ? store.events : state.tabId === "clusters" ? store.clusters : store.blacklist;
    const filter = state.riskWorkbenchFilter || {};
    const q = String(filter.search || "").trim().toLowerCase();
    const serverNow = Date.parse(String(store.serverNow || "").replace(" ","T"));
    const parseRiskDate = value => {
      if (!value) return NaN;
      const normalized = String(value).trim().replace(" ","T");
      const withOffset = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}+08:00`;
      return Date.parse(withOffset);
    };
    const idSearchFields = new Set(["object_id","event_id","case_id","task_id","cluster_id","entry_id"]);
    const taskIdsFor = row => [...new Set(row.taskIds || row.activeTaskIds || row.workSummary?.task_refs?.map(item => item.task_id) || [])];
    const caseIdsFor = row => [
      ...(row.caseRefs || []).flatMap(ref => [ref.customer,ref.commission,ref.settlement,ref.partner,ref.customer_id,ref.commission_case_id,ref.settlement_case_id,ref.partner_id]),
      ...(row.caseLinks || []).flatMap(ref => [ref.customer,ref.commission,ref.settlement,ref.partner])
    ].filter(Boolean);
    const partnerIdsFor = row => [...new Set([
      row.partnerId,row.partner_id,row.primary,
      ...(row.related || []).filter(id => String(id).startsWith("DEMO-P")),
      ...(row.caseRefs || []).flatMap(ref => [ref.partner,ref.partner_id]),
      ...(row.memberDetails || []).map(item => item.partnerRef?.object_id)
    ].filter(Boolean))];
    const ownerValuesFor = row => [
      row.owner,row.owner_id,row.workSummary?.primary_task?.owner,row.workSummary?.primary_task?.owner_id,
      ...(row.workSummary?.task_refs || []).flatMap(task => [task.owner,task.owner_id])
    ].filter(Boolean);
    const relatedEventsFor = row => (row.eventIds || []).map(id => store.events.find(event => event.id === id)).filter(Boolean);
    const reasonValuesFor = row => [
      ...(row.reasonCodes || []),row.reasonCode,row.reason
    ].filter(Boolean);
    const ruleValuesFor = row => [
      row.rule,row.ruleVersion
    ].filter(Boolean);
    const categoryValuesFor = row => [
      row.category,
      ...relatedEventsFor(row).map(event => event.category)
    ].filter(Boolean);
    const filtered = rows.filter(row => {
      const searchMap = {
        object_id:[row.id,row.label],
        event_id:[row.id],
        case_id:caseIdsFor(row),
        task_id:taskIdsFor(row),
        cluster_id:[row.id],
        entry_id:[row.id],
        name:[row.label,row.typeLabel,row.reason]
      };
      const searchValues = filter.searchField ? (searchMap[filter.searchField] || []) : [
        row.id,row.label,row.type,row.typeLabel,row.reason,row.reasonCode,row.rule,row.ruleVersion,
        ...taskIdsFor(row),...caseIdsFor(row),...partnerIdsFor(row),...ownerValuesFor(row)
      ];
      const searchable = searchValues.filter(Boolean).join(" ").toLowerCase();
      const exactMatch = searchValues.some(value => String(value || "").toLowerCase() === q);
      if (q && (filter.searchField && idSearchFields.has(filter.searchField) ? !exactMatch : !searchable.includes(q))) return false;
      if (filter.partner && !partnerIdsFor(row).some(value => String(value).toLowerCase().includes(String(filter.partner).toLowerCase()))) return false;
      if (filter.category && !categoryValuesFor(row).includes(filter.category)) return false;
      if (filter.risk && (filter.risk === "unknown" ? row.riskBand != null : row.riskBand !== filter.risk)) return false;
      if (Array.isArray(filter.riskBands) && filter.riskBands.length && !filter.riskBands.includes(row.riskBand)) return false;
      if (filter.risk === "unknown" && row.riskBand) return false;
      if (filter.status && ![row.status,row.determination,row.signal,row.control].includes(filter.status)) return false;
      const countries = Array.isArray(filter.countries) ? filter.countries : filter.country ? [filter.country] : [];
      if (countries.length && !countries.includes(row.country) && !(row.countryCodes || []).some(country => countries.includes(country))) return false;
      if (filter.objectType && row.type !== filter.objectType) return false;
      const scope = Object.hasOwn(filter,"scope") ? filter.scope : (state.tabId === "objects" ? "open" : "");
      if (scope === "open" && row.isOpen === false) return false;
      if (scope === "historical" && row.isOpen !== false) return false;
      if (filter.eventType && row.type !== filter.eventType) return false;
      if (filter.eventSource && row.source !== filter.eventSource) return false;
      if (filter.fundsStatus) {
        const fundsStatuses = Object.keys(row.workSummary?.settlement_counts || {});
        const comparable = fundsStatuses.length ? fundsStatuses : ["not_applicable"];
        if (!comparable.includes(filter.fundsStatus)) return false;
      }
      if (filter.approvalStatus) {
        const approvalStatuses = (row.taskIds || []).flatMap(taskId => store.approvals.filter(item => item.task === taskId).map(item => item.status));
        if (filter.approvalStatus === "none" ? approvalStatuses.length > 0 : !approvalStatuses.includes(filter.approvalStatus)) return false;
      }
      if (filter.entryType) {
        const normalizedEntryType = ({设备:"device",IP:"ip","支付工具":"payment_tool",客户:"customer",合作方:"partner"}[row.type] || row.type);
        if (normalizedEntryType !== filter.entryType) return false;
      }
      if (filter.source && row.source !== filter.source) return false;
      if (filter.blacklistStatus && row.status !== filter.blacklistStatus) return false;
      if (filter.blacklistPartner && !JSON.stringify(row).toLowerCase().includes(String(filter.blacklistPartner).toLowerCase())) return false;
      if (filter.determination && row.determination !== filter.determination) return false;
      if (filter.signal && row.signal !== filter.signal) return false;
      if (filter.clusterStatus && row.status !== filter.clusterStatus) return false;
      if (state.tabId === "clusters" && !filter.clusterStatus && row.status === "cleared") return false;
      if (filter.controlStatus && row.control !== filter.controlStatus) return false;
      if (filter.task && !taskIdsFor(row).some(taskId => {
        const task = store.tasks.find(item => item.id === taskId);
        return riskTaskStatus(task) === filter.task;
      })) return false;
      if (filter.reason && !reasonValuesFor(row).some(value => String(value).toLowerCase().includes(String(filter.reason).toLowerCase()))) return false;
      if (filter.rule && !ruleValuesFor(row).some(value => String(value).toLowerCase().includes(String(filter.rule).toLowerCase()))) return false;
      if (filter.owner && !ownerValuesFor(row).some(value => String(value).toLowerCase().includes(String(filter.owner).toLowerCase()))) return false;
      if (filter.overdue === "yes") {
        const due = row.workSummary?.primary_task?.sla || row.workSummary?.primary_task?.sla_due_at || row.sla;
        if (!due || !Number.isFinite(serverNow) || parseRiskDate(due) >= serverNow) return false;
      }
      const taskRows = taskIdsFor(row).map(id => store.tasks.find(task => task.id === id)).filter(Boolean);
      const taskState = task => riskTaskStatus(task);
      if (filter.workFilter === "unassigned" && !taskRows.some(task => taskState(task) === "open" && (task.owner === "未认领" || !task.owner))) return false;
      if (filter.workFilter === "mine_processing" && !taskRows.some(task => taskState(task) === "processing" && (task.owner?.display_name || task.owner) === (roleOwnerNames[state.role] || ""))) return false;
      if (filter.workFilter === "pending_approval" && !(Number(row.workSummary?.approval_counts?.pending_approval || 0) > 0 || Number(row.workSummary?.approval_counts?.pending || 0) > 0)) return false;
      if (filter.workFilter === "failed_execution" && !(Number(row.workSummary?.execution_counts?.failed || 0) > 0 || Number(row.workSummary?.execution_counts?.execution_failed || 0) > 0)) return false;
      if (filter.workFilter === "overdue") {
        const due = row.workSummary?.primary_task?.sla || row.workSummary?.primary_task?.sla_due_at || row.sla;
        if (!due || !Number.isFinite(serverNow) || parseRiskDate(due) >= serverNow) return false;
      }
      if (filter.workFilter === "needs_action" && !taskRows.some(task => ["open","processing","pending_approval","execution_failed"].includes(taskState(task)))) return false;
      const dateValue = filter.dateField === "occurred" ? row.occurred : row.updated;
      if (filter.dateFrom && String(dateValue || "").slice(0,10) < filter.dateFrom) return false;
      if (filter.dateTo && String(dateValue || "").slice(0,10) > filter.dateTo) return false;
      return true;
    });
    const sort = state.riskWorkbenchSort || {key:"updated",dir:"desc"};
    const direction = sort.dir === "asc" ? 1 : -1;
    const value = row => {
      if (sort.key === "risk") return ({R0:0,R1:1,R2:2,R3:3}[row.riskBand] ?? -1);
      if (sort.key === "amount" || sort.key === "impact") return Number(row.affectedAmount || 0);
      if (sort.key === "sla") return parseRiskDate(row.workSummary?.primary_task?.sla || row.workSummary?.primary_task?.sla_due_at || row.sla);
      if (sort.key === "members") return Number(row.members || row.memberDetails?.length || 0);
      if (sort.key === "expires") return parseRiskDate(row.expiresAt || row.expires);
      if (sort.key === "createdAt") return parseRiskDate(row.createdAt || row.created || row.effective);
      if (sort.key === "occurred") return String(row.occurred || row.updated || "");
      return String(row.updated || row.effective || row.createdAt || "");
    };
    const sorted = filtered.sort((a,b) => {
      const av=value(a), bv=value(b);
      if (av < bv) return -1 * direction;
      if (av > bv) return 1 * direction;
      return String(a.id).localeCompare(String(b.id));
    });
    const snapshotKey = JSON.stringify({role:state.role,tab:state.tabId,filter:state.riskWorkbenchFilter || {},sort:state.riskWorkbenchSort || {}});
    const currentServerTime = Date.parse(String(store.serverNow || "").replace(" ","T"));
    let snapshot = state.riskWorkbenchListSnapshots[snapshotKey];
    const snapshotExpired = snapshot && (!Number.isFinite(Date.parse(snapshot.expires_at)) || Date.parse(snapshot.expires_at) <= currentServerTime);
    if (snapshotExpired) {
      state.riskWorkbenchSnapshotStale = true;
      state.riskWorkbenchSnapshotId = snapshot.snapshot_id;
      return tqClone(snapshot.rows);
    }
    if (!snapshot) {
      const createdAt = store.serverNow;
      snapshot = {
        snapshot_id:`RWB-SNAPSHOT-${++state.riskWorkbenchSnapshotSequence}-${Date.now().toString(36)}`,
        role:state.role,
        scope:state.riskWorkbenchFilter?.scope || (state.tabId === "objects" ? "open" : "global"),
        tab:state.tabId,
        signature:snapshotKey,
        created_at:createdAt,
        expires_at:new Date(currentServerTime + 300000).toISOString(),
        rows:tqClone(sorted),
        summary:tqClone(store.summary_facts || store.summary),
        summary_data_quality:tqClone(store.summary_data_quality || {status:"fresh"})
      };
      state.riskWorkbenchListSnapshots[snapshotKey] = snapshot;
      state.riskWorkbenchSnapshotStale = false;
    }
    state.riskWorkbenchSnapshotId = snapshot.snapshot_id;
    return tqClone(snapshot.rows);
  }

  function validateRiskDateFilter(filter) {
    const from = String(filter?.dateFrom || "");
    const to = String(filter?.dateTo || "");
    if (!from && !to) return null;
    const serverDate = String(riskWorkbenchStore().serverNow || "").slice(0,10);
    if (from && to && from > to) return "开始日期不能晚于结束日期";
    if (from && from > serverDate) return "开始日期不能晚于当前服务端日期";
    if (to && to > serverDate) return "结束日期不能晚于当前服务端日期";
    if (from && to) {
      const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
      if (days > 366) return "查询时间跨度不能超过366个自然日";
    }
    return null;
  }

  const riskGlobalFilterKeys = new Set(["partner","countries","category"]);
  const riskSearchIdFields = new Set(["object_id","event_id","case_id","task_id","cluster_id","entry_id"]);
  const riskFilterLabels = {
    partner:"合作方", countries:"国家/地区", category:"风险分类", risk:"风险档", riskBands:"风险档",
    scope:"关注范围", searchField:"搜索字段", search:"快速搜索", dateField:"时间字段", dateFrom:"开始日期",
    dateTo:"结束日期", reason:"原因码", rule:"规则编号", owner:"处理人", overdue:"超时", workFilter:"处置关注",
    objectType:"对象类型", eventType:"事件类型", eventSource:"事件来源", determination:"风险认定", signal:"信号状态",
    fundsStatus:"资金状态", approvalStatus:"审批状态", task:"任务状态", clusterStatus:"集群认定", controlStatus:"控制状态",
    entryType:"名单类型", blacklistStatus:"名单状态", blacklistPartner:"名单合作方", source:"名单来源", sort:"排序"
  };
  const riskFilterChoices = {
    searchField:[["object_id","对象ID"],["event_id","事件ID"],["case_id","案件ID"],["task_id","任务ID"],["cluster_id","集群ID"],["entry_id","名单ID"],["name","名称/原因"]],
    partner:[["DEMO-P01","DEMO-P01"],["DEMO-P02","DEMO-P02"]],
    risk:[["R0","R0 正常"],["R1","R1 关注"],["R2","R2 较高"],["R3","R3 高"],["unknown","待评估"]],
    category:["身份合规","归因流量","客户交易质量","支付资金","合作方行为","系统数据"].map(value => [value,value]),
    countries:[["TH","泰国"],["ID","印尼"],["MY","马来西亚"],["VN","越南"],["PH","菲律宾"],["ZA","南非"]],
    dateField:[["updated","更新时间"],["occurred","发生时间"]],
    overdue:[["yes","仅已超时"]],
    workFilter:[["unassigned","未分配"],["mine_processing","本人处理中"],["pending_approval","待审批"],["failed_execution","执行失败"],["overdue","已超时"],["needs_action","需要处理"]],
    objectType:[["partner","合作方"],["customer","客户"],["cluster","集群"]],
    scope:[["open","未关闭"],["historical","历史对象"]],
    eventType:[["settlement_overdue","结算超时"],["partner_risk_aggregation","合作方聚合风险"],["cluster_detected","集群识别"],["rule_hit","规则命中"],["crm_fraud","CRM欺诈"],["manual","人工录入"]],
    eventSource:["规则引擎","评分引擎","集群服务","CRM欺诈库","人工","申诉"].map(value => [value,value]),
    determination:[["pending","待认定"],["confirmed","已确认"],["rejected","已驳回"]],
    signal:[["open","待处理"],["investigating","调查中"],["pending_review","待审核"],["rejected","已驳回"],["confirmed","已确认"],["closed","已关闭"]],
    fundsStatus:[["frozen","冻结"],["holding","结算中"],["payable","可结算"],["paid","已支付"],["reversed","已冲正"],["not_applicable","不适用"]],
    approvalStatus:[["none","无审批"],["pending_approval","待审批"],["approved","已通过"],["rejected","已驳回"],["returned","已退回"],["cancelled","已取消"]],
    task:[["open","待认领"],["processing","处理中"],["done","已完成"]],
    clusterStatus:[["suspected","疑似"],["confirmed","已确认"],["cleared","已排除"]],
    controlStatus:[["hold_extended","延长结算"],["manual_required","强制人工"],["none","无"]],
    entryType:[["device","设备"],["ip","IP"],["payment_tool","支付工具"],["customer","客户"],["partner","合作方"]],
    blacklistStatus:[["active","生效中"],["expired","已失效"],["removed","已移除"]],
    blacklistPartner:[["DEMO-P01","DEMO-P01"],["DEMO-P02","DEMO-P02"]],
    source:[["affiliate","Affiliate本地"],["crm","CRM只读"]],
    sort:[["updated_desc","最近更新"],["risk_desc","风险档"],["amount_desc","影响金额"],["sla_desc","SLA"],["members_desc","成员数"],["expires_desc","失效时间"],["created_desc","创建时间"]]
  };
  const riskFilterValueLabel = (key,value) => {
    const choices = riskFilterChoices[key] || [];
    if (Array.isArray(value)) return value.map(item => choices.find(([id]) => id === item)?.[1] || item).join("、");
    const choice = choices.find(([id]) => id === value);
    if (choice) return choice[1];
    if (key === "riskBands" && Array.isArray(value)) return value.join("、");
    const labels = {
      object_id:"对象ID", event_id:"事件ID", case_id:"案件ID", task_id:"任务ID", cluster_id:"集群ID", entry_id:"名单ID", name:"名称/原因",
      open:"未关闭", historical:"历史对象", yes:"仅已超时", needs_action:"需要处理", unassigned:"未分配",
      mine_processing:"本人处理中", pending_approval:"待审批", failed_execution:"执行失败", device:"设备",
      ip:"IP", payment_tool:"支付工具", customer:"客户", partner:"合作方"
    };
    return labels[value] || value;
  };
  function riskFilterValidation(filter) {
    const field = String(filter?.searchField || "");
    const value = String(filter?.search || "").trim();
    if (!value) return null;
    if (riskSearchIdFields.has(field) && value.length > 128) return "ID搜索最多输入128个字符";
    if (field === "name" && (value.length < 2 || value.length > 100)) return "名称/原因搜索需输入2–100个字符";
    if (!field && value.length > 128) return "快速搜索最多输入128个字符";
    return null;
  }
  function applyRiskWorkbenchFilter() {
    const dateError = validateRiskDateFilter(state.riskWorkbenchDraftFilter);
    if (dateError) return showToast(dateError);
    const searchError = riskFilterValidation(state.riskWorkbenchDraftFilter);
    if (searchError) return showToast(searchError);
    state.riskWorkbenchFilter = {...state.riskWorkbenchDraftFilter};
    state.riskWorkbenchFilter.metric = "";
    state.riskWorkbenchMetricRestore = null;
    state.riskWorkbenchMetricPending = null;
    state.riskWorkbenchFiltersByTab[state.tabId] = {...state.riskWorkbenchFilter};
    state.riskWorkbenchDraftFiltersByTab[state.tabId] = {...state.riskWorkbenchDraftFilter};
    const sort = state.riskWorkbenchFilter.sort;
    state.riskWorkbenchSort = sort === "risk_desc" ? {key:"risk",dir:"desc"} : sort === "amount_desc" ? {key:"amount",dir:"desc"} : sort === "sla_desc" ? {key:"sla",dir:"desc"} : sort === "members_desc" ? {key:"members",dir:"desc"} : sort === "expires_desc" ? {key:"expires",dir:"desc"} : sort === "created_desc" ? {key:"createdAt",dir:"desc"} : state.tabId === "events" ? {key:"occurred",dir:"desc"} : state.tabId === "blacklist" ? {key:"createdAt",dir:"desc"} : {key:"updated",dir:"desc"};
    state.riskWorkbenchSortsByTab[state.tabId] = {...state.riskWorkbenchSort};
    state.riskWorkbenchPage = 1;
    state.riskWorkbenchMore = false;
    return render();
  }
  function riskAppliedFilterChips() {
    const filter = state.riskWorkbenchFilter || {};
    const entries = Object.entries(filter).filter(([key,value]) => {
      if (key === "metric" || key === "sort" || value === "" || value == null || (key === "scope" && value === "open")) return false;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    });
    if (!entries.length) return "";
    return `<div class="rwb-applied-chips admin-filter-tags" aria-label="已应用筛选">${entries.map(([key,value]) => `<button type="button" class="dev-chip active" data-risk-remove-filter="${h(key)}" aria-label="移除${h(riskFilterLabels[key] || key)}筛选">${h(riskFilterLabels[key] || key)}：${h(riskFilterValueLabel(key,value))} ×</button>`).join("")}<button type="button" class="tm-button secondary compact" data-risk-clear-filters>清空筛选</button></div>`;
  }

  const riskExportLabels = {
    object:"风险对象",type:"类型",risk:"风险档",reason:"命中原因",impact:"当前影响",
    work:"处置进度",owner:"负责人 / SLA",updated:"最近更新",credit:"信用等级",
    settlementEligibility:"结算资格",source:"来源",country:"国家",eventCount:"关联事件数",
    firstDetected:"首次命中时间",dataQuality:"数据新鲜度",event:"事件ID",primary:"主处置对象",
    state:"风险认定 / 信号",funds:"资金影响",occurred:"发生时间",triples:"三元组",batch:"批次ID",
    ruleVersion:"规则版本",appeal:"关联申诉状态",eventOwner:"处理人",eventSla:"SLA",
    updatedAt:"更新时间",cluster:"集群ID",members:"成员 / 合作方",features:"关联类型",
    evidence:"证据门槛",impact:"影响案件 / 金额",entry:"名单ID",scope:"作用范围",
    effective:"生效 / 失效时间",addedBy:"加入人",approvedBy:"审批人",createdAt:"创建时间",
    lastUpdated:"最后更新时间",status:"状态",as_of:"数据截至"
  };
  function riskExportCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g,'""')}"`;
  }
  function riskExportValue(row,key,record) {
    if (key === "object") return row.label || row.id || "";
    if (key === "event") return row.id || "";
    if (key === "cluster" || key === "entry") return row.id || "";
    if (key === "type") return row.typeLabel || riskTypeLabel(row.type) || row.type || "";
    if (key === "risk") return riskBandLabel(row.riskBand || row.risk || "");
    if (key === "reason") return row.reason || row.reasonCode || "";
    if (key === "impact") return row.affectedAmount ? `USD ${row.affectedAmount}` : row.affectedAmount || row.impact || "";
    if (key === "work") return riskWorkSummaryMarkup(row.workSummary).replace(/<[^>]+>/g,"");
    if (key === "owner") return row.owner || row.workSummary?.primary_task?.owner || "";
    if (key === "updated") return row.updated || "";
    if (key === "credit") return row.credit || "";
    if (key === "settlementEligibility") return row.settlementEligible == null ? "待核验" : row.settlementEligible ? "可评估" : "受阻断";
    if (key === "source") return row.source || "";
    if (key === "country") return (row.countryCodes || [row.country]).filter(Boolean).join("、");
    if (key === "eventCount") return row.eventCount ?? "";
    if (key === "firstDetected") return row.firstDetected || "";
    if (key === "dataQuality") return row.dataQuality?.status || "";
    if (key === "primary") return row.primary || "";
    if (key === "state") return [riskDeterminationLabel(row.determination),row.signal && row.signal !== "-" ? riskSignalLabel(row.signal) : ""].filter(Boolean).join(" / ");
    if (key === "funds") return row.funds || "";
    if (key === "occurred") return row.occurred || "";
    if (key === "triples") return (row.caseRefs || []).map(item => `${item.customer || item.customer_id}/${item.commission || item.commission_case_id}/${item.settlement || item.settlement_case_id}`).join("；");
    if (key === "batch") return row.signalDetail?.ref?.settlement_batch_id || "";
    if (key === "ruleVersion") return row.ruleVersion || "";
    if (key === "appeal") return row.appealStatus || "";
    if (key === "eventOwner") return row.workSummary?.primary_task?.owner || "";
    if (key === "eventSla") return row.workSummary?.primary_task?.sla || row.sla || "";
    if (key === "updatedAt") return row.updated || "";
    if (key === "members") return `${row.members || row.memberDetails?.length || 0} / ${row.partners || ""}`;
    if (key === "features") return Array.isArray(row.features) ? row.features.join("、") : row.features || "";
    if (key === "evidence") return row.independent == null ? "" : `${row.independent} 条独立特征`;
    if (key === "entry") return row.id || "";
    if (key === "scope") return row.scope || "";
    if (key === "effective") return `${row.effective || ""} / ${row.expires || ""}`;
    if (key === "addedBy") return row.createdBy?.display_name || "";
    if (key === "approvedBy") return row.approvedBy?.display_name || "";
    if (key === "createdAt") return row.createdAt || "";
    if (key === "lastUpdated") return row.updatedAt || "";
    if (key === "status") return row.status || row.determination || "";
    if (key === "as_of") return record.as_of || "";
    return row[key] ?? "";
  }
  function riskExportCsv(record) {
    const columns = Array.isArray(record?.columns) ? record.columns : [];
    const rows = Array.isArray(record?.rows) ? record.rows : [];
    return `\uFEFF${[columns.map(key => riskExportLabels[key] || key),...rows.map(row => columns.map(key => riskExportValue(row,key,record)))].map(line => line.map(riskExportCell).join(",")).join("\r\n")}`;
  }

  function riskWorkbenchExportRequest(reason) {
    const store = riskWorkbenchStore();
    const skipApproval = demoSkipsApproval();
    const requestedSnapshotId = state.riskWorkbenchSnapshotId;
    const requestedSnapshot = Object.values(state.riskWorkbenchListSnapshots).find(item => item.snapshot_id === requestedSnapshotId);
    const serverTime = Date.parse(String(store.serverNow || "").replace(" ","T"));
    if (!requestedSnapshot || requestedSnapshot.role !== state.role || requestedSnapshot.tab !== state.tabId) {
      throw {code:"AFF-40901",message:"风险列表快照不存在，请重新查询"};
    }
    if (!Number.isFinite(Date.parse(requestedSnapshot.expires_at)) || Date.parse(requestedSnapshot.expires_at) <= serverTime) {
      throw {code:"AFF-40901",message:"风险列表快照已过期，请重新查询"};
    }
    const rows = riskWorkbenchRows();
    const snapshot = Object.values(state.riskWorkbenchListSnapshots).find(item => item.snapshot_id === requestedSnapshotId);
    if (!snapshot || snapshot.role !== state.role || snapshot.tab !== state.tabId || snapshot.signature !== JSON.stringify({role:state.role,tab:state.tabId,filter:state.riskWorkbenchFilter || {},sort:state.riskWorkbenchSort || {}})) {
      throw {code:"AFF-40901",message:"风险列表快照已变化，请重新查询"};
    }
    if (!Number.isFinite(Date.parse(snapshot.expires_at)) || Date.parse(snapshot.expires_at) <= serverTime) {
      throw {code:"AFF-40901",message:"风险列表快照已过期，请重新查询"};
    }
    const columnKeys = {
      objects:["object","type","risk","reason","impact","work","owner","updated","actions","credit","settlementEligibility","source","country","eventCount","firstDetected","dataQuality"],
      events:["event","type","primary","risk","reason","state","funds","work","occurred","actions","triples","batch","ruleVersion","appeal","eventOwner","eventSla","updatedAt"],
      clusters:["cluster","members","features","evidence","state","risk","impact","updated","actions"],
      blacklist:["entry","type","scope","source","reason","state","effective","actions","addedBy","approvedBy","createdAt","lastUpdated"]
    }[state.tabId] || [];
    const hidden = riskHiddenColumnsFor(state.tabId);
    const columns = [...columnKeys.filter(key => !hidden.has(key) && key !== "actions"),"status","as_of"].filter((key,index,array) => array.indexOf(key) === index);
    const snapshotId = snapshot.snapshot_id;
    const record = {
      export_id:`RWB-EXPORT-${Date.now()}`,
      source_page:"risk-workbench",
      tab:state.tabId,
      status:skipApproval ? "ready" : "pending_approval",
      reason,
      scope:"risk_global",
      global_scope:"risk_global",
      applied_filter:tqClone(state.riskWorkbenchFilter || {}),
      snapshot_id:snapshotId,
      snapshot_status:"frozen",
      as_of:snapshot.created_at,
      data_quality:tqClone(snapshot.summary_data_quality || {status:"fresh"}),
      columns,
      row_count:rows.length,
      rows:tqClone(rows),
      snapshot_created_at:snapshot.created_at,
      snapshot_expires_at:snapshot.expires_at,
      expires_at:skipApproval ? new Date(window.AFF_ADMIN_CLOCK.now()+24*60*60*1000).toISOString() : null,
      applicant:{...((prototype.taskQueue?.options?.(state.role) || {}).current_user || {user_id:state.role,display_name:roleOwnerNames[state.role] || state.role})},
      download_roles:["risk","risk_supervisor","compliance","system_admin","audit"],
      created_at:store.serverNow,
      server_now:store.serverNow,
      data_source:"risk_workbench_projection"
    };
    record.approval_id=skipApproval ? null : `RWB-APPROVAL-${record.export_id}`;
    record.approval_status=skipApproval ? "not_required" : "pending_approval";
    prototype.riskWorkbenchExports ||= [];
    prototype.riskWorkbenchExports.push(record);
    const centerTask = {
      id:record.export_id,
      name:`风险工作台 · ${state.tabId} · 当前筛选`,
      scope:`${record.scope} · ${record.row_count}行`,
      rows:record.row_count,
      status:skipApproval ? "ready" : "processing",
      approvalStatus:record.approval_status,
      approvalId:record.approval_id,
      masked:true,
      dataLevel:"sensitive",
      expiresAt:record.expires_at || record.snapshot_expires_at,
      createdBy:roleOwnerNames[state.role],
      applicant:record.applicant,
      applicantId:record.applicant?.user_id || null,
      traceId:record.export_id,
      riskExportId:record.export_id
    };
    prototype.exportTasks.unshift(centerTask);
    if (skipApproval) integrationAudit("生成风险工作台导出",`${record.export_id} / ${record.row_count}行`,"ready",`trace-${record.export_id}`,{approval_required:false,self_review:false});
    return record;
  }

  function riskFilterBar() {
    const f = state.riskWorkbenchDraftFilter || {};
    const applied = state.riskWorkbenchFilter || {};
    const quickKeys = ({
      objects:["risk","objectType","workFilter"],
      events:["risk","determination","fundsStatus"],
      clusters:["risk","clusterStatus","controlStatus"],
      blacklist:["entryType","blacklistStatus","source"]
    })[state.tabId] || ["risk"];
    const selectField = (key,quick=false,empty="全部") => {
      const value = (quick ? applied : f)[key] || "";
      return `<label>${h(riskFilterLabels[key] || key)}<select ${quick ? "data-risk-quick-filter" : "data-risk-filter"}="${h(key)}" aria-label="${h(riskFilterLabels[key] || key)}"><option value="">${h(empty)}</option>${(riskFilterChoices[key] || []).map(([id,label]) => `<option value="${h(id)}" ${id===value?"selected":""}>${h(label)}</option>`).join("")}</select></label>`;
    };
    const selectedCountries = Array.isArray(f.countries) ? f.countries : (f.country ? [f.country] : []);
    const categoryOptions = [
      ["身份合规","身份合规"],["归因流量","归因流量"],["客户交易质量","客户交易质量"],
      ["支付资金","支付资金"],["合作方行为","合作方行为"],["系统数据","系统数据"]
    ];
    return `<section class="rwb-filters admin-filter-shell" aria-label="风险筛选">
      <div class="admin-filter-quick">${quickKeys.map(key => selectField(key,true)).join("")}<button type="button" class="tm-button secondary" data-risk-more aria-expanded="${Boolean(state.riskWorkbenchMore)}" aria-controls="risk-full-filter-panel">${tqIcon("filter")} 筛选器</button></div>
      ${riskAppliedFilterChips()}
      ${state.riskWorkbenchMore ? `<div class="admin-filter-panel" id="risk-full-filter-panel" aria-label="全部风险筛选条件"><div class="rwb-filter-row">
        <label>搜索字段<select data-risk-filter="searchField"><option value="">全部字段</option><option value="object_id" ${f.searchField==="object_id"?"selected":""}>对象ID</option><option value="event_id" ${f.searchField==="event_id"?"selected":""}>事件ID</option><option value="case_id" ${f.searchField==="case_id"?"selected":""}>案件ID</option><option value="task_id" ${f.searchField==="task_id"?"selected":""}>任务ID</option><option value="cluster_id" ${f.searchField==="cluster_id"?"selected":""}>集群ID</option><option value="entry_id" ${f.searchField==="entry_id"?"selected":""}>名单ID</option><option value="name" ${f.searchField==="name"?"selected":""}>名称/原因</option></select></label>
        <label>快速搜索<input data-risk-filter="search" maxlength="${f.searchField === "name" ? 100 : 128}" minlength="${f.searchField === "name" ? 2 : 0}" value="${h(f.search || "")}" placeholder="按已选字段精确或包含搜索"></label>
        <label>合作方<select data-risk-filter="partner"><option value="">全部合作方</option><option value="DEMO-P01" ${f.partner==="DEMO-P01"?"selected":""}>DEMO-P01</option><option value="DEMO-P02" ${f.partner==="DEMO-P02"?"selected":""}>DEMO-P02</option></select></label>
        <label>风险档<select data-risk-filter="risk"><option value="">全部</option><option value="R0" ${f.risk==="R0"?"selected":""}>R0 正常</option><option value="R1" ${f.risk==="R1"?"selected":""}>R1 关注</option><option value="R2" ${f.risk==="R2"?"selected":""}>R2 较高</option><option value="R3" ${f.risk==="R3"?"selected":""}>R3 高</option><option value="unknown" ${f.risk==="unknown"?"selected":""}>待评估</option></select></label>
        <label>风险分类<select data-risk-filter="category"><option value="">全部分类</option>${categoryOptions.map(([value,label]) => `<option value="${value}" ${f.category===value?"selected":""}>${label}</option>`).join("")}</select></label>
      </div>
      <div class="rwb-filter-row rwb-more-filters">
        <label>国家/地区<select multiple size="3" data-risk-filter="countries" aria-label="国家/地区（可多选）">${[["TH","泰国"],["ID","印尼"],["MY","马来西亚"],["VN","越南"],["PH","菲律宾"],["ZA","南非"]].map(([value,label]) => `<option value="${value}" ${selectedCountries.includes(value)?"selected":""}>${value} · ${label}</option>`).join("")}</select></label>
        <label>时间字段<select data-risk-filter="dateField"><option value="updated" ${f.dateField!=="occurred"?"selected":""}>更新时间</option><option value="occurred" ${f.dateField==="occurred"?"selected":""}>发生时间</option></select></label>
        <label>开始日期<input type="date" data-risk-filter="dateFrom" value="${h(f.dateFrom || "")}"></label>
        <label>结束日期<input type="date" data-risk-filter="dateTo" value="${h(f.dateTo || "")}"></label>
        <label>原因码<input data-risk-filter="reason" maxlength="128" value="${h(f.reason || "")}" placeholder="例如 SETTLEMENT"></label>
        <label>规则编号<input data-risk-filter="rule" maxlength="128" value="${h(f.rule || "")}" placeholder="例如 D30"></label>
        <label>处理人<input data-risk-filter="owner" maxlength="128" value="${h(f.owner || "")}" placeholder="用户ID或姓名"></label>
        <label>超时<select data-risk-filter="overdue"><option value="">全部</option><option value="yes" ${f.overdue==="yes"?"selected":""}>仅已超时</option></select></label>
        <label>处置关注<select data-risk-filter="workFilter"><option value="">全部</option><option value="unassigned" ${f.workFilter==="unassigned"?"selected":""}>未分配</option><option value="mine_processing" ${f.workFilter==="mine_processing"?"selected":""}>本人处理中</option><option value="pending_approval" ${f.workFilter==="pending_approval"?"selected":""}>待审批</option><option value="failed_execution" ${f.workFilter==="failed_execution"?"selected":""}>执行失败</option><option value="overdue" ${f.workFilter==="overdue"?"selected":""}>已超时</option><option value="needs_action" ${f.workFilter==="needs_action"?"selected":""}>需要处理</option></select></label>
        ${state.tabId==="objects" ? `${selectField("objectType")}${selectField("scope",false,"全部历史")}` : ""}
        ${state.tabId==="events" ? ["eventType","eventSource","determination","signal","fundsStatus","approvalStatus","task"].map(key => selectField(key)).join("") : ""}
        ${state.tabId==="clusters" ? ["clusterStatus","controlStatus"].map(key => selectField(key)).join("") : ""}
        ${state.tabId==="blacklist" ? `<label>名单类型<select data-risk-filter="entryType"><option value="">全部</option><option value="device" ${f.entryType==="device"?"selected":""}>设备</option><option value="ip" ${f.entryType==="ip"?"selected":""}>IP</option><option value="payment_tool" ${f.entryType==="payment_tool"?"selected":""}>支付工具</option><option value="customer" ${f.entryType==="customer"?"selected":""}>客户</option><option value="partner" ${f.entryType==="partner"?"selected":""}>合作方</option></select></label><label>名单状态<select data-risk-filter="blacklistStatus"><option value="">全部</option><option value="active" ${f.blacklistStatus==="active"?"selected":""}>生效中</option><option value="expired" ${f.blacklistStatus==="expired"?"selected":""}>已失效</option><option value="removed" ${f.blacklistStatus==="removed"?"selected":""}>已移除</option></select></label><label>名单合作方<select data-risk-filter="blacklistPartner"><option value="">全部</option><option value="DEMO-P01" ${f.blacklistPartner==="DEMO-P01"?"selected":""}>DEMO-P01</option><option value="DEMO-P02" ${f.blacklistPartner==="DEMO-P02"?"selected":""}>DEMO-P02</option></select></label><label>名单来源<select data-risk-filter="source"><option value="">全部</option><option value="affiliate" ${f.source==="affiliate"?"selected":""}>Affiliate本地</option><option value="crm" ${f.source==="crm"?"selected":""}>CRM只读</option></select></label>` : ""}
        <label>排序<select data-risk-filter="sort"><option value="updated_desc" ${!["risk_desc","amount_desc","sla_desc","members_desc","expires_desc","created_desc"].includes(f.sort)?"selected":""}>最近更新</option><option value="risk_desc" ${f.sort==="risk_desc"?"selected":""}>风险档</option><option value="amount_desc" ${f.sort==="amount_desc"?"selected":""}>影响金额</option><option value="sla_desc" ${f.sort==="sla_desc"?"selected":""}>SLA</option><option value="members_desc" ${f.sort==="members_desc"?"selected":""}>成员数</option><option value="expires_desc" ${f.sort==="expires_desc"?"selected":""}>失效时间</option><option value="created_desc" ${f.sort==="created_desc"?"selected":""}>创建时间</option></select></label>
      </div><div class="admin-filter-actions"><button type="button" class="tm-button secondary" data-risk-close-filters>关闭</button><button type="button" class="tm-button secondary" data-risk-reset>重置条件</button><button type="button" class="tm-button primary" data-risk-query>应用筛选</button></div></div>` : ""}
    </section>`;
  }

  function riskTable() {
    const rows = riskWorkbenchRows();
    const pageCount = Math.max(1,Math.ceil(rows.length / state.riskWorkbenchPageSize));
    state.riskWorkbenchPage = Math.min(pageCount,Math.max(1,state.riskWorkbenchPage));
    const pageStart = (Math.max(1,state.riskWorkbenchPage)-1) * state.riskWorkbenchPageSize;
    const tabId = state.tabId;
    let head = [];
    let body = [];
    if (tabId === "objects") {
      head = ["风险对象","类型","风险档","命中原因","当前影响","处置进度","负责人 / SLA","最近更新","操作"];
      body = rows.map(row => [row.label+`<small>${h(row.maskedEmail)} · ${h(row.countryCodes?.join("、") || row.country)}</small>`, riskTypeLabel(row.type), `<span class="rwb-risk">${h(riskBandLabel(row.riskBand))} <small>${row.basis === "related_max" ? "关联最高" : "直接"} · ${h(row.riskScore)}</small></span>`, `${h(row.reason)}<small>${h(row.reasonCode)} · 事件 ${row.eventCount}</small>`, `${row.affectedCases} 笔 / ${riskMoney(row.affectedAmount)}<small>${Object.entries(row.workSummary?.settlement_counts || {}).map(([key,value]) => `${statusLabel(key)} ${value}笔`).join(" / ") || "资金状态待核验"}</small>`, riskWorkSummaryMarkup(row.workSummary), `${h(row.owner)}<small>SLA ${h(riskDateLabel(row.sla))}</small>`, row.updated, `<button class="tm-button secondary compact" data-risk-open="object" data-risk-id="${h(row.id)}">查看档案</button><button class="tm-button secondary compact" data-risk-task-list="${h(row.id)}">查看任务</button>`]);
    } else if (tabId === "events") {
      head = ["事件ID","类型 / 来源","主处置对象","风险档","原因与规则","风险认定 / 信号","资金影响","任务 / 审批","发生时间","操作"];
      body = rows.map(row => [row.id+`<small>${h(row.eventRef?.event_type || row.type)}</small>`, `${h(row.typeLabel)}<small>${h(row.source)} · ${h(row.category)}</small>`, `${h(row.primary)}<small>关联 ${row.relatedObjectCount} 个对象</small>`, `<span class="rwb-risk">${h(riskBandLabel(row.riskBand))}</span><small>规则分 ${h(row.riskScore || "—")}</small>`, `${h(row.reason)}<small>${h(row.reasonCode)} · ${h(row.rule)} / ${h(row.ruleVersion)}</small>`, `${riskStateTag("认定",row.determination)}<br>${row.signal !== "-" ? riskStateTag("信号",row.signal) : "<small>无超时信号</small>"}<small>${h(row.appealStatus || "无申诉门禁")}</small>`, `${h(row.funds)}<small>${Object.entries(row.workSummary?.settlement_counts || {}).map(([key,value]) => `${statusLabel(key)} ${value}笔`).join(" / ")}</small>`, riskWorkSummaryMarkup(row.workSummary), row.occurred, `<button class="tm-button secondary compact" data-risk-open="event" data-risk-id="${h(row.id)}">查看详情</button>`]);
    } else if (tabId === "clusters") {
      head = ["集群ID","成员 / 合作方","关联类型","证据门槛","认定 / 控制","关联最高风险档","影响案件 / 金额","最近更新","操作"];
      body = rows.map(row => [row.id+`<small>${h(row.version)} · ${h(row.createdAt)}</small>`, `${row.members} / ${row.partners}`, `${row.features.map(h).join("、")}<small>${row.memberDetails?.length || 0} 条关系</small>`, `${row.independent} 条独立特征<small>${h(row.exception)} · ${h(row.riskRuleVersion)}</small>`, `${statusTag(row.status)}<br>${statusTag(row.control)}`, `<span class="rwb-risk">${h(riskBandLabel(row.riskBand))}</span><small>关联最高 · 风险分 ${h(row.riskScore)}</small>`, `${row.affectedCases} 笔 / ${riskMoney(row.affectedAmount)}<small>三元组去重</small>`, row.updated, `<button class="tm-button secondary compact" data-risk-open="cluster" data-risk-id="${h(row.id)}">查看成员</button>`]);
    } else {
      head = ["名单ID","类型 / 特征","作用范围","来源","加入原因","状态 / 变更申请","生效 / 失效时间","操作"];
      body = rows.map(row => [row.id+`<small>${h(row.version)} · ${h(row.sourceRef)}</small>`, `${h(row.type)}<small>${h(row.masked)} · token ${h(row.tokenHash)}</small>`, `${h(row.scope)}<small>${h(row.targetRef?.label || "")}</small>`, `${row.source === "crm" ? "CRM · 只读" : "Affiliate本地"}<small>${h(row.sourceRef)}</small>`, `${h(row.reason)}<small>${h(row.reasonCode)}</small>`, `${statusTag(row.status)}<small>变更：${h(row.pendingChange === "none" ? "无" : "待移出")}</small>`, `${row.effective}<small>${row.expires === "-" ? "永久" : `至 ${row.expires}`}</small>`, `<button class="tm-button secondary compact" data-risk-open="blacklist" data-risk-id="${h(row.id)}">查看详情</button>`]);
    }
    const optionalColumns = tabId === "objects"
      ? [
        ["credit","信用等级",row => h(row.credit || "—")],
        ["settlementEligibility","结算资格",row => h(row.settlementEligible == null ? "待核验" : row.settlementEligible ? "可评估" : "受阻断")],
        ["source","来源",row => h(row.source || "—")],
        ["country","国家",row => h(row.countryCodes?.join("、") || row.country || "—")],
        ["eventCount","关联事件数",row => h(row.eventCount ?? 0)],
        ["firstDetected","首次命中时间",row => h(row.firstDetected || "—")],
        ["dataQuality","数据新鲜度",row => h(row.dataQuality?.status || "待核验")]
      ]
      : tabId === "events"
        ? [
          ["triples","三元组",row => h((row.caseRefs || []).map(item => `${item.customer}/${item.commission}/${item.settlement}`).join("；") || "—")],
          ["batch","批次ID",row => h(row.signalDetail?.ref?.settlement_batch_id || "—")],
          ["ruleVersion","规则版本",row => h(row.ruleVersion || "—")],
          ["appeal","关联申诉状态",row => h(row.appealStatus || "无申诉门禁")],
          ["eventOwner","处理人",row => h(row.workSummary?.primary_task?.owner || "—")],
          ["eventSla","SLA",row => h(riskDateLabel(row.workSummary?.primary_task?.sla || row.sla))],
          ["updatedAt","更新时间",row => h(row.updated || "—")]
        ]
        : tabId === "blacklist"
          ? [
            ["addedBy","加入人",row => h(row.createdBy?.display_name || "—")],
            ["approvedBy","审批人",row => h(row.approvedBy?.display_name || "—")],
            ["createdAt","创建时间",row => h(row.createdAt || "—")],
            ["lastUpdated","最后更新时间",row => h(row.updatedAt || "—")]
          ]
          : [];
    if (optionalColumns.length) {
      head.push(...optionalColumns.map(item => item[1]));
      body = body.map((cells,index) => [...cells,...optionalColumns.map(item => item[2](rows[index]))]);
    }
    const hiddenColumns = riskHiddenColumnsFor(tabId);
    if (!state.riskWorkbenchColumnInitialized.has(tabId)) {
      optionalColumns.forEach(([key]) => hiddenColumns.add(key));
      state.riskWorkbenchColumnInitialized.add(tabId);
    }
    const columnKeys = {
      objects:["object","type","risk","reason","impact","work","owner","updated","actions","credit","settlementEligibility","source","country","eventCount","firstDetected","dataQuality"],
      events:["event","type","primary","risk","reason","state","funds","work","occurred","actions","triples","batch","ruleVersion","appeal","eventOwner","eventSla","updatedAt"],
      clusters:["cluster","members","features","evidence","state","risk","impact","updated","actions"],
      blacklist:["entry","type","scope","source","reason","state","effective","actions","addedBy","approvedBy","createdAt","lastUpdated"]
    }[tabId] || [];
    const visible = head.map((label,index)=>({label,index,key:columnKeys[index]})).filter(item=>!hiddenColumns.has(item.key) || item.key === "actions");
    const widthMaps = {
      objects:{object:220,type:90,risk:120,reason:200,impact:160,work:180,owner:160,updated:170,actions:160,credit:120,settlementEligibility:120,source:120,country:100,eventCount:110,firstDetected:170,dataQuality:140},
      events:{event:180,type:160,primary:220,risk:100,reason:220,state:160,funds:170,work:180,occurred:170,actions:160,triples:180,batch:180,ruleVersion:120,appeal:120,eventOwner:120,eventSla:140,updatedAt:170},
      clusters:{cluster:180,members:140,features:180,evidence:160,state:160,risk:130,impact:170,updated:170,actions:160},
      blacklist:{entry:180,type:220,scope:180,source:140,reason:220,state:170,effective:190,actions:150,addedBy:140,approvedBy:140,createdAt:170,lastUpdated:170}
    };
    const widthMap = widthMaps[tabId] || {};
    const colgroup = `<colgroup>${visible.map(item => `<col style="width:${widthMap[item.key] || 120}px">`).join("")}</colgroup>`;
    const tableWidth = visible.reduce((sum,item) => sum + (widthMap[item.key] || 120),0);
    const sortable = tabId === "objects" ? new Set(["risk","impact","owner","updated"]) : tabId === "events" ? new Set(["risk","funds","occurred"]) : tabId === "clusters" ? new Set(["members","risk","impact","updated"]) : new Set(["effective","updated"]);
    const sortKeyFor = key => ({funds:"amount",impact:"amount",owner:"sla",members:"members",effective:"expires"}[key] || key);
    const headMarkup = visible.map(item => {
      if (!sortable.has(item.key)) return `<th>${h(item.label)}</th>`;
      const active = state.riskWorkbenchSort?.key === sortKeyFor(item.key);
      const arrow = active ? (state.riskWorkbenchSort.dir === "asc" ? "↑" : "↓") : "↕";
      return `<th><button class="rwb-sort-button" data-risk-sort="${h(sortKeyFor(item.key))}" aria-label="按${h(item.label)}排序">${h(item.label)} <span aria-hidden="true">${arrow}</span></button></th>`;
    }).join("");
    const pageRows = body.slice(pageStart,pageStart + state.riskWorkbenchPageSize);
    return `<section class="rwb-table-panel"><div class="rwb-table-toolbar"><span>当前结果 <strong>${rows.length}</strong> 条</span><span>数据截至 ${h(riskWorkbenchStore().serverNow)} · ${h(riskWorkbenchStore().seed)}</span></div>
      <div class="rwb-table-scroll tm-table-wrap"><table class="rwb-table" style="width:${tableWidth}px">${colgroup}<thead><tr>${headMarkup}</tr></thead><tbody>${pageRows.length ? pageRows.map(row => `<tr data-risk-row="${h(row[0]?.split?.("<")?.[0] || "")}" data-risk-row-kind="${h(tabId === "objects" ? "object" : tabId === "events" ? "event" : tabId === "clusters" ? "cluster" : "blacklist")}">${visible.map(item => `<td class="${item.key==="actions"?"rwb-actions":""}">${row[item.index]}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${visible.length}" class="tm-empty">无符合条件的数据</td></tr>`}</tbody></table></div>
      <footer class="rwb-pagination"><span>共 ${rows.length} 条 · 第 ${state.riskWorkbenchPage}/${pageCount} 页 · 每页 <select data-risk-page-size><option ${state.riskWorkbenchPageSize===10?"selected":""}>10</option><option ${state.riskWorkbenchPageSize===20?"selected":""}>20</option><option ${state.riskWorkbenchPageSize===50?"selected":""}>50</option></select> 条</span><div><label>跳至 <input data-risk-page-jump value="${state.riskWorkbenchPage}" inputmode="numeric" aria-label="跳转页码"></label><button class="tm-button secondary" data-risk-page="${Math.max(1,state.riskWorkbenchPage-1)}" ${state.riskWorkbenchPage<=1?"disabled":""}>上一页</button><button class="tm-button secondary" data-risk-page="${state.riskWorkbenchPage+1}" ${state.riskWorkbenchPage>=pageCount?"disabled":""}>下一页</button></div></footer>
    </section>`;
  }

  function riskTaskActionPanel(task, shared) {
    const action = state.riskWorkbenchAction;
    if (!action || action.taskId !== task.id || !shared) return "";
    const form = action.form || tqFormFromTask(shared);
    const editable = ["draft","evidence","preview"].includes(action.kind);
    const field = (key,label,type="text",value=form[key] || "") => type === "textarea"
      ? `<label class="rwb-action-field wide"><span>${h(label)}</span><textarea data-risk-action-field="${h(key)}" rows="4" maxlength="${key==="reason"?1000:2000}">${h(value)}</textarea></label>`
      : `<label class="rwb-action-field"><span>${h(label)}</span><input type="${h(type)}" data-risk-action-field="${h(key)}" value="${h(value)}" ${type==="datetime-local"?"":""}></label>`;
    const purpose = shared.task_purpose || shared.purpose || task.task_purpose || task.purpose || "";
    const evidence = shared.evidence_refs || [];
    const checks = shared.sections?.processing?.checklist || [{key:"source_verified",label:"已核验来源与逐案范围"}];
    const fields = shared.sections?.processing?.fields || {};
    const actionLabels = {confirm_event:"确认风险事件",clear_event:"排除风险事件",continue_freeze:"继续暂扣",extend_settlement:"延长暂扣",refer_finance:"转财务处理",credit_propagation:"风险信用传导",signal_confirm:"确认超时信号",signal_reject:"驳回超时信号"};
    const riskActionSelect = fields.risk_actions?.length
      ? `<label class="rwb-action-field"><span>处置动作</span><select data-risk-action-field="risk_action">${fields.risk_actions.map(value => `<option value="${h(value)}" ${form.risk_action===value?"selected":""}>${h(actionLabels[value] || value)}</option>`).join("")}</select></label>`
      : "";
    const caseRefs = fields.allowed_case_refs || fields.case_refs || [];
    const caseKey = ref => `${ref.customer_id}|${ref.commission_case_id}|${ref.settlement_case_id}`;
    const caseScopeMarkup = caseRefs.length
      ? `<fieldset class="rwb-action-fieldset wide"><legend>处置案件范围</legend><label class="rwb-action-field"><span>范围方式</span><select data-risk-action-field="scope_mode"><option value="source_cases" ${form.scope_mode==="source_cases"?"selected":""}>仅来源案件</option><option value="selected_cases" ${form.scope_mode==="selected_cases"?"selected":""}>选择指定案件</option><option value="partner_all" ${form.scope_mode==="partner_all"?"selected":""}>合作方范围内全部案件</option></select></label><div class="rwb-case-picker">${caseRefs.map(ref => `<label><input type="checkbox" data-risk-action-case="${h(caseKey(ref))}" ${form.selected_case_refs?.includes(caseKey(ref))?"checked":""}><span>${h(ref.customer_id)} / ${h(ref.commission_case_id)} / ${h(ref.settlement_case_id)}<small>${h(ref.partner_id || "合作方待核验")} · USD案件范围</small></span></label>`).join("")}</div>${form.scope_mode !== "source_cases" ? `<label class="rwb-action-field wide"><span>扩大范围升级理由</span><textarea data-risk-action-field="global_escalation_reason" rows="3" maxlength="1000" placeholder="说明为什么需要处理来源案件之外的案件">${h(form.global_escalation_reason || "")}</textarea></label><small>扩大范围必须引用已核验证据，并在新的影响预览中重新核对本次案件和金额。</small>` : "<small>仅来源案件会沿用任务创建时的完整三元组范围。</small>"}</fieldset>`
      : "";
    const memberMarkup = purpose === "cluster_member_correction"
      ? `<fieldset class="rwb-action-fieldset wide"><legend>拟调整成员</legend><div class="rwb-case-picker">${(fields.members || []).map(member => `<label><input type="checkbox" data-risk-action-member="${h(member)}" ${form.member_ids?.includes(member)?"checked":""}><span>${h(member)}</span></label>`).join("")}</div><label class="rwb-action-field"><span>纠错方式</span><select data-risk-action-field="correction"><option value="remove_to_unassigned" ${form.correction==="remove_to_unassigned"?"selected":""}>移出为未分组</option><option value="split_new_cluster" ${form.correction==="split_new_cluster"?"selected":""}>拆分为新集群</option></select></label></fieldset>`
      : "";
    const blacklistMarkup = purpose === "blacklist_add"
      ? `<div class="rwb-action-grid"><label class="rwb-action-field"><span>名单类型</span><select data-risk-action-field="entry_type">${(fields.allowed_entry_types || []).map(value => `<option value="${h(value)}" ${form.entry_type===value?"selected":""}>${h(value)}</option>`).join("")}</select></label><label class="rwb-action-field"><span>名单对象</span><select data-risk-action-field="target_ref">${(fields.authorized_target_refs || []).map(value => `<option value="${h(value)}" ${form.target_ref===value?"selected":""}>${h(value)}</option>`).join("")}</select></label><label class="rwb-action-field"><span>适用范围</span><select data-risk-action-field="scope">${(fields.allowed_scopes || []).map(value => `<option value="${h(value)}" ${form.scope===value?"selected":""}>${h(value)}</option>`).join("")}</select></label>${field("effective_at","生效时间","datetime-local",form.effective_at)}${field("expires_at","失效时间","datetime-local",form.expires_at)}<label class="rwb-action-field"><span>永久生效</span><input type="checkbox" data-risk-action-field="permanent" ${form.permanent?"checked":""}></label></div>`
      : "";
    const actionSpecificMarkup = form.risk_action === "refer_finance"
      ? `<label class="rwb-action-field"><span>财务处理动作</span><select data-risk-action-field="finance_action">${(fields.finance_action_options || ["reject_commission","reverse","recover","deposit_offset"]).map(value => `<option value="${h(value)}" ${form.finance_action===value?"selected":""}>${h(value)}</option>`).join("")}</select></label>`
      : form.risk_action === "credit_propagation"
        ? `<div class="rwb-action-grid"><label class="rwb-action-field"><span>信用传导模式</span><select data-risk-action-field="credit_mode"><option value="credit_deduct" ${form.credit_mode==="credit_deduct"?"selected":""}>仅扣减积分</option><option value="target_level" ${form.credit_mode==="target_level"?"selected":""}>调整目标等级</option><option value="credit_deduct_and_target_level" ${form.credit_mode==="credit_deduct_and_target_level"?"selected":""}>扣分并调整等级</option></select></label><label class="rwb-action-field"><span>目标信用等级</span><select data-risk-action-field="target_level">${(fields.target_level_options || ["C0","C1","C2","C3","C4"]).map(value => `<option value="${h(value)}" ${form.target_level===value?"selected":""}>${h(value)}</option>`).join("")}</select></label><label class="rwb-action-field"><span>合作方</span><input data-risk-action-field="partner_id" value="${h(form.partner_id || "")}" readonly></label></div>`
        : form.risk_action === "extend_settlement"
          ? `<label class="rwb-action-field"><span>延长暂扣规则</span><input data-risk-action-field="extension_rule_ref" value="${h(form.extension_rule_ref || fields.extension_rule_ref || "")}" readonly></label>`
          : form.risk_action === "continue_freeze"
            ? `<label class="rwb-action-field"><span>继续暂扣策略</span><input data-risk-action-field="duration_policy_ref" value="${h(form.duration_policy_ref || fields.duration_policy_ref || "")}" readonly></label>`
            : "";
    const conclusion = (shared.sections?.processing?.allowed_conclusions || []).map(value => `<option value="${h(value)}" ${form.conclusion===value?"selected":""}>${h(tqConclusions[value] || value)}</option>`).join("");
    const preview = action.preview;
    const error = action.error ? `<div class="rwb-action-error" role="alert">${h(action.error.code || "AFF-42201")} · ${h(action.error.message || action.error.display_message || action.error)}</div>` : "";
    const notice = action.notice ? `<div class="rwb-action-notice" role="status">${h(action.notice)}</div>` : "";
    const evidenceMarkup = `<fieldset class="rwb-action-fieldset"><legend>可引用证据</legend>${evidence.length ? evidence.map(item => `<label><input type="checkbox" data-risk-action-evidence="${h(item.evidence_id)}" ${form.evidence_ids?.includes(item.evidence_id)?"checked":""} ${item.invalidated || item.scan_status!=="clean"?"disabled":""}><span>${h(item.name || item.evidence_id)}<small>${h(item.scan_status || "待核验")} · ${h(item.source_system || item.source || "来源未标注")}</small></span></label>`).join("") : "<p class='rwb-muted'>暂无可引用证据</p>"}</fieldset>`;
    const checklistMarkup = `<fieldset class="rwb-action-fieldset"><legend>处理检查单</legend>${checks.map(item => `<label><input type="checkbox" data-risk-action-checklist="${h(item.key)}" ${form.checklist?.some(entry => entry.key===item.key && entry.checked)?"checked":""}><span>${h(item.label || item.key)}${item.required?"<small>必填</small>":""}</span></label>`).join("")}</fieldset>`;
    if (demoSkipsApproval() && !editable && action.kind==="submit") {
      return `<section class="rwb-action-panel"><header><div><h3>提交处置前核对</h3><p>确认后进入执行队列；实际结果以执行回执为准。</p></div><button class="tm-icon-button" data-risk-action-cancel aria-label="关闭处理表单">×</button></header>${error}${notice}<dl class="rwb-action-facts"><div><dt>处理结论</dt><dd>${h(tqConclusions[form.conclusion] || form.conclusion || "未填写")}</dd></div><div><dt>原因说明</dt><dd>${h(form.reason || "未填写")}</dd></div><div><dt>影响预览</dt><dd>${h(preview?.preview_id || "尚未生成")}</dd></div></dl><label class="rwb-action-confirm"><input type="checkbox" data-risk-action-field="confirmed" ${form.confirmed?"checked":""}>我已核对案件范围、金额和证据</label><footer><button class="tm-button secondary compact" data-risk-action-cancel>取消</button><button class="tm-button primary compact" data-risk-action-submit ${preview && form.confirmed?"":"disabled"}>提交执行</button></footer></section>`;
    }
    if (!editable && action.kind === "submit") {
      return `<section class="rwb-action-panel"><header><div><h3>提交审批前核对</h3><p>提交会冻结当前草稿与影响预览，审批通过前不执行资金或风险状态变更。</p></div><button class="tm-icon-button" data-risk-action-cancel aria-label="关闭处理表单">×</button></header>${error}${notice}<dl class="rwb-action-facts"><div><dt>处理结论</dt><dd>${h(tqConclusions[form.conclusion] || form.conclusion || "未填写")}</dd></div><div><dt>原因说明</dt><dd>${h(form.reason || "未填写")}</dd></div><div><dt>影响预览</dt><dd>${preview ? `${h(preview.preview_id)} · USD ${h(preview.deduplicated_amount?.amount || preview.amount?.amount || "0.00")}` : "尚未生成"}</dd></div></dl>${preview ? `<div class="rwb-preview-card"><strong>预览有效至 ${h(preview.expires_at || "—")}</strong>${(preview.before_after_items || []).map(item => `<p>${h(item.item_id)} · ${h(item.after?.requested_action || "待执行")} · 需审批</p>`).join("")}</div>` : `<div class="rwb-action-warning">提交前必须先保存草稿并生成未过期的影响预览。</div>`}<label class="rwb-action-confirm"><input type="checkbox" data-risk-action-field="confirmed" ${form.confirmed?"checked":""}>我已核对案件范围、金额、证据和审批路径</label><footer><button class="tm-button secondary compact" data-risk-action-cancel>取消</button><button class="tm-button primary compact" data-risk-action-submit ${preview && form.confirmed?"":"disabled"}>提交审批</button></footer></section>`;
    }
    const actionTitle = action.kind === "evidence" ? "补充证据" : action.kind === "preview" ? "生成影响预览" : "保存调查结论";
    const actionButton = action.kind === "preview" ? "保存草稿并生成预览" : action.kind === "evidence" ? "保存证据草稿" : "保存调查结论";
    return `<section class="rwb-action-panel"><header><div><h3>${actionTitle}</h3><p>字段会写入统一任务草稿，校验失败时保留当前输入，不会静默生成结论。</p></div><button class="tm-icon-button" data-risk-action-cancel aria-label="关闭处理表单">×</button></header>${error}${notice}<div class="rwb-action-grid"><label class="rwb-action-field"><span>处理结论</span><select data-risk-action-field="conclusion">${conclusion}</select></label>${riskActionSelect}${form.conclusion==="observe" ? field("next_review_at","复查时间","datetime-local",form.next_review_at) : ""}${actionSpecificMarkup}</div>${caseScopeMarkup}${memberMarkup}${blacklistMarkup}<div class="rwb-action-grid">${field("reason","结论说明 / 原因","textarea",form.reason)}${field("internal_note","内部备注","textarea",form.internal_note)}</div>${evidenceMarkup}${checklistMarkup}<footer><button class="tm-button secondary compact" data-risk-action-cancel>取消</button><button class="tm-button primary compact" data-risk-action-submit>${actionButton}</button></footer></section>`;
  }

  function riskTaskActionDetail(taskId,kind) {
    try {
      const detail = prototype.taskQueue.detail(taskId,{role:state.role});
      return {kind,taskId,detail,form:tqFormFromTask(detail),preview:state.riskWorkbenchPreviews?.[taskId] || null,error:null,notice:null};
    } catch (error) {
      return {kind,taskId,detail:null,form:{},preview:null,error,notice:null};
    }
  }

  function riskTaskActionSubmit() {
    const action = state.riskWorkbenchAction;
    if (!action || !action.detail) return;
    const task = action.detail;
    const form = action.form || tqFormFromTask(task);
    const fail = message => {action.error={code:"AFF-42201",message};return render();};
    try {
      if (action.kind === "submit") {
        if (!form.confirmed) return fail(demoSkipsApproval() ? "请确认已核对案件范围、金额和证据" : "请确认已核对案件范围、金额、证据和审批路径");
        if (!action.preview) return fail("请先生成有效影响预览");
        const response = prototype.taskQueue.write("submit_review",task.task_id,tqPayload(task,{draft_version:task.draft_version,preview_id:action.preview.preview_id,preview_hash:action.preview.preview_hash,self_review:false,impact_confirmation:true}),{role:state.role});
        const next = prototype.taskQueue.detail(task.task_id,{role:state.role});
        invalidateRiskWorkbenchSnapshots();
        action.detail=next;action.form=tqFormFromTask(next);action.notice=demoSkipsApproval() ? "处置已提交，结果以任务执行回执为准" : `处置申请已提交，审批号 ${response.approval?.approval_id || "待生成"}`;action.error=null;state.riskWorkbenchAction=action;return render();
      }
      if (action.kind === "evidence" && !(form.evidence_ids || []).length) return fail("至少选择一条已核验证据");
      const draftResponse = prototype.taskQueue.write("save_draft",task.task_id,tqPayload(task,{
        expected_draft_version:task.draft_version,
        conclusion:form.conclusion,
        reason_code:"manual_review",
        reason:String(form.reason || "").trim(),
        internal_note:form.internal_note || null,
        evidence_ids:form.evidence_ids || [],
        next_review_at:form.next_review_at || null,
        checklist:form.checklist || [],
        form_values:form
      }),{role:state.role});
      invalidateRiskWorkbenchSnapshots();
      const next = prototype.taskQueue.detail(task.task_id,{role:state.role});
      action.detail=next;action.form=tqFormFromTask(next);action.error=null;
      if (action.kind === "preview") {
        const previewResponse = prototype.taskQueue.write("preview",task.task_id,tqPayload(next,{draft_version:next.draft_version}),{role:state.role});
        action.preview=previewResponse.preview;state.riskWorkbenchPreviews[task.task_id]=previewResponse.preview;action.notice=`草稿已保存，影响预览 ${previewResponse.preview.preview_id} 已生成`;
      } else {
        action.preview=null;action.notice=`草稿已保存（${draftResponse.draft?.draft_version || next.draft_version}）`;
      }
      state.riskWorkbenchAction=action;return render();
    } catch (error) {
      action.error=error;state.riskWorkbenchAction=action;return render();
    }
  }

  function invalidateRiskWorkbenchSnapshots() {
    state.riskWorkbenchListSnapshots = {};
    state.riskWorkbenchSnapshotId = null;
  }

  function riskApprovalRecord(id) {
    try {
      return (prototype.taskQueue?.approvals({role:state.role}) || []).find(item => (item.approval_id || item.id) === id) || null;
    } catch {
      return null;
    }
  }

  function riskApprovalChainData(approval) {
    if (!approval) return {nodes:[],current_node_id:null,current_node_index:-1};
    const rawNodes = approval.nodes || approval.approval_chain?.nodes || [];
    const nodes = rawNodes.map(node => ({
      ...node,
      required_role: node.required_role || node.role_code || node.reviewer?.role_code || node.reviewer?.role || null,
      reviewer: node.reviewer || node.approver || null
    }));
    const rawIndex = Number.isInteger(approval.current_node_index) ? approval.current_node_index : -1;
    const currentNode = nodes[rawIndex]?.status === "pending"
      ? nodes[rawIndex]
      : nodes.find(node => node.status === "pending") || null;
    return {
      nodes,
      current_node_id: approval.current_node_id || currentNode?.node_id || null,
      current_node_index: currentNode ? nodes.indexOf(currentNode) : -1
    };
  }

  function riskApprovalNode(approval) {
    const chain = riskApprovalChainData(approval);
    return chain.nodes.find(node => node.node_id === chain.current_node_id)
      || chain.nodes[chain.current_node_index]
      || chain.nodes.find(node => node.status === "pending")
      || null;
  }

  function riskApprovalPanel(approval) {
    if (demoSkipsApproval()) return `<div class="rwb-drawer-grid"><div><span>历史记录</span><strong>${h(approval?.approval_id || approval?.id || "—")}</strong></div><div><span>记录状态</span><strong>${statusLabel(approval?.status || "unknown")}</strong></div></div><h3>处置摘要</h3><p>${h(approval?.draft?.reason || approval?.reason || "暂无说明")}</p>${approval?.task_id?`<button class="tm-button primary compact" data-tq-linked-task="${h(approval.task_id)}">查看任务与执行</button>`:"<p class='rwb-muted'>保留历史记录，不执行审批节点。</p>"}`;
    const action = state.riskWorkbenchAction?.kind === "approval" && state.riskWorkbenchAction.approvalId === (approval?.approval_id || approval?.id)
      ? state.riskWorkbenchAction
      : null;
    const chain = riskApprovalChainData(approval);
    const node = riskApprovalNode(approval);
    const current = prototype.taskQueue?.options?.(state.role)?.current_user;
    const self = current?.user_id && current.user_id === approval?.applicant?.user_id;
    const canDecide = !self && approval?.status === "pending_approval" && node?.status === "pending" &&
      (node.required_role === state.role || (node.required_role === "risk_manager" && state.role === "risk_supervisor"));
    const summary = approval?.draft || {};
    const reason = action?.form?.reason || "";
    const confirmed = Boolean(action?.form?.confirmed);
    const decisionForm = action ? `<div class="rwb-action-panel"><header><div><h3>${action.decision === "approve" ? "通过当前审批节点" : action.decision === "reject" ? "驳回处置申请" : "退回补充材料"}</h3><p>意见会写入统一审批审计，审批通过只允许进入执行，不直接改变资金状态。</p></div><button class="tm-icon-button" data-risk-action-cancel aria-label="关闭审批表单">×</button></header>${action.error ? `<div class="rwb-action-error">${h(action.error.code || "AFF-42201")} · ${h(action.error.message || action.error.display_message || action.error)}</div>` : ""}<label class="rwb-action-field wide"><span>审批意见</span><textarea data-risk-approval-field="reason" rows="4" maxlength="1000">${h(reason)}</textarea></label><label class="rwb-action-confirm"><input type="checkbox" data-risk-approval-field="confirmed" ${confirmed ? "checked" : ""}>我已核对证据、金额和处置范围</label><footer><button class="tm-button secondary compact" data-risk-action-cancel>取消</button><button class="tm-button ${action.decision === "approve" ? "primary" : "danger"} compact" data-risk-approval-submit>${action.decision === "approve" ? "确认通过" : action.decision === "reject" ? "确认驳回" : "确认退回"}</button></footer></div>` : "";
    return `<div class="rwb-drawer-grid"><div><span>审批状态</span><strong>${statusLabel(approval?.status || "—")}</strong></div><div><span>申请人</span><strong>${h(approval?.applicant?.display_name || "—")}</strong></div><div><span>当前节点</span><strong>${h(node?.required_role || "—")}</strong></div><div><span>提交时间</span><strong>${h(riskDateLabel(approval?.created_at || approval?.submitted_at))}</strong></div></div>
      <h3>冻结处置摘要</h3><div class="rwb-case-list"><article><strong>${h(summary.conclusion ? tqConclusions[summary.conclusion] || summary.conclusion : "未填写结论")}</strong><small>${h(summary.reason || approval?.reason || "未填写原因")}</small></article></div>
      <h3>审批链</h3><div class="rwb-approval"><ol>${chain.nodes.map(item => `<li class="${item.node_id === chain.current_node_id ? "current" : ""}">${h(item.required_role || "审批人")}：${h(statusLabel(item.status))}${item.reviewer?.display_name ? ` · ${h(item.reviewer.display_name)}` : ""}${item.decided_at ? ` · ${h(riskDateLabel(item.decided_at))}` : ""}</li>`).join("") || "<li>暂无审批节点</li>"}</ol></div>
      ${canDecide ? `<div class="rwb-inline-actions"><button class="tm-button primary compact" data-risk-approval-action="approve" data-risk-approval-id="${h(approval.approval_id || approval.id)}">通过当前节点</button><button class="tm-button danger compact" data-risk-approval-action="reject" data-risk-approval-id="${h(approval.approval_id || approval.id)}">驳回</button><button class="tm-button secondary compact" data-risk-approval-action="return" data-risk-approval-id="${h(approval.approval_id || approval.id)}">退回补充</button></div>` : `<p class="rwb-muted">${self ? "申请人不能审批自己的申请。" : "当前角色不是当前节点授权审批人，审批按钮不可用。"}</p>`}
      ${decisionForm}`;
  }

  function riskDetailDrawer() {
    const drawer = state.riskWorkbenchDrawer;
    if (!drawer) return "";
    const store = riskWorkbenchStore();
    let title = "风险详情", subtitle = "", sections = "", drawerQuality = null;
    if (drawer.kind === "approval") {
      const approval = riskApprovalRecord(drawer.id);
      if (!approval) return "";
      title = `${approval.approval_id || approval.id} · ${demoSkipsApproval() ? "历史记录" : "审批节点"}`;
      subtitle = demoSkipsApproval() ? "处置申请与执行记录" : "风险工作台内审批上下文 · 只显示必要业务信息";
      sections = riskApprovalPanel(approval);
    } else if (drawer.kind === "task-list") {
      const row = store.objects.find(item => item.id === drawer.id);
      if (!row) return "";
      drawerQuality = row.dataQuality;
      const taskIds = new Set(row.taskIds || []);
      const tasks = store.tasks.filter(task => taskIds.has(task.id)
        || (row.eventIds || []).some(eventId => task.source === eventId || store.events.find(event => event.id === eventId)?.taskIds?.includes(task.id))
        || task.source === row.id
        || task.object_id === row.id
        || task.source_ref?.id === row.id);
      title = `${row.label} · 关联任务`;
      subtitle = "按任务目的分别处理，不合并不同处置申请";
      sections = `<div class="rwb-drawer-grid"><div><span>关联对象</span><strong>${h(row.id)}</strong></div><div><span>任务数量</span><strong>${tasks.length}</strong></div><div><span>当前风险档</span><strong>${h(riskBandLabel(row.riskBand))}</strong></div><div><span>数据截至</span><strong>${h(store.serverNow)}</strong></div></div><h3>任务清单</h3><div class="rwb-task-list">${tasks.length ? tasks.map(task => `<article><header><strong>${h(task.id)} · ${h(task.purposeLabel)}</strong>${statusTag(task.status)}</header><p>${h(task.reason)}</p><small>负责人：${h(task.owner || "未分配")} · SLA：${h(riskDateLabel(task.sla))}</small><button class="tm-button secondary compact" data-risk-task="${h(task.id)}">打开任务详情</button></article>`).join("") : "<p class='rwb-muted'>暂无关联任务</p>"}</div>`;
    } else if (drawer.kind === "task") {
      const task = store.tasks.find(item => item.id === drawer.id); if (!task) return "";
      const shared = riskTaskDetail(task.id);
      const taskReadError = riskTaskReadErrors.get(task.id);
      const approval = store.approvals.find(item => item.task === task.id);
      const approvalFull = approval ? riskApprovalRecord(approval.id) : null;
      const execution = approvalFull?.execution_id
        ? (prototype.taskQueue?.peek?.().executions || []).find(item => item.execution_id === approvalFull.execution_id)
        : null;
      const workflowState = shared?.workflow_state || (approvalFull?.status === "approved" ? "pending_execution" : approvalFull?.status === "pending_approval" ? "pending_approval" : task.workflow_state || null);
      const riskSla = riskDateLabel(shared?.sla?.due_at || shared?.sla_due_at || task.sla);
      const restricted = !shared;
      const editableActions = new Set(["save_draft","request_material","preview","submit_review"]);
      const workflowAllowsEdit = !["pending_approval","pending_execution","done","closed"].includes(workflowState);
      const allowedActions = shared?.allowed_actions || [];
      const hasEditableAction = !allowedActions.length || allowedActions.some(item => editableActions.has(item.action) && item.enabled !== false);
      const sourceAllowsEdit = !shared?.data_quality || shared.data_quality.status === "fresh";
      const canEditTask = !restricted && workflowAllowsEdit && hasEditableAction && sourceAllowsEdit;
      title = `${task.id} · ${task.purposeLabel}`; subtitle = `统一任务详情 · 风险 seed ${store.seed}`;
      sections = `${restricted ? `<div class="rwb-alert danger"><strong>当前角色无权读取任务详情</strong><span>${h(taskReadError?.source_error?.message || "统一任务服务拒绝当前角色读取完整事实")}。页面已锁定编辑入口，不使用旧演示责任人或旧版本覆盖当前状态。</span></div>` : ""}<div class="rwb-drawer-grid"><div><span>任务状态</span><strong>${statusLabel(workflowState || "unknown")}</strong></div><div><span>负责人</span><strong>${restricted ? "按权限不可见" : h(shared?.owner?.display_name || "未分配")}</strong></div><div><span>任务版本</span><strong>${restricted ? "按权限不可见" : h(shared?.version || "待核验")}</strong></div><div><span>SLA截止</span><strong>${h(riskSla)}</strong></div><div><span>服务端时间</span><strong>${h(store.serverNow)}</strong></div></div>
        <h3>任务事实</h3><p class="rwb-muted">${h(task.reason)}。来源 ${h(task.source)}；任务目的 ${h(task.purpose)}。当前时间口径：北京时间 UTC+8。</p>
        <h3>案件范围</h3><div class="rwb-case-list">${task.cases.length ? task.cases.map(item => `<article><strong>${h(item)}</strong><small>仅处理本次申请列出的三元组，其他案件不连带。</small></article>`).join("") : "<p class='rwb-muted'>当前任务尚未绑定具体案件</p>"}</div>
        ${approval ? `<h3>${demoSkipsApproval() ? "处置与执行状态" : "审批与执行状态"}</h3><div class="rwb-approval"><p>${h(approval.applicant)} · ${statusTag(approvalFull?.status || approval.status)} · 执行：${h(execution ? `${execution.execution_id} · ${statusLabel(execution.status)}` : approval.execution)}</p><div class="rwb-inline-actions">${!demoSkipsApproval() && (approvalFull?.status || approval.status)==="pending_approval" && !restricted ? `<button class="tm-button primary compact" data-risk-approve="${h(approval.id)}">打开审批节点</button>` : ""}${approvalFull ? `<button class="tm-button secondary compact" data-risk-open-approval="${h(approval.id)}">${demoSkipsApproval() ? "查看历史记录" : "查看审批记录"}</button>` : ""}</div></div>`:""}
        ${riskTaskNotificationMarkup(task.id)}
        ${restricted ? `<p class="rwb-muted">当前角色仅可查看处置与执行摘要，不能认领、修改草稿或提交新的处置方案。</p>` : riskTaskStatus(shared || task) === "open" ? `<div class="rwb-inline-actions"><button class="tm-button primary compact" data-risk-claim="${h(task.id)}">认领任务</button></div>` : !canEditTask ? `<p class="rwb-muted">${workflowState === "pending_approval" ? (demoSkipsApproval() ? "历史待审任务，可核对后继续执行。" : "处置申请已提交，当前等待审批节点处理，表单已锁定。") : workflowState === "pending_execution" ? "当前等待领域执行回执，表单已锁定。" : "当前任务已结束或当前角色无可用编辑动作。"}</p>${demoSkipsApproval() && workflowState==="pending_approval" ? `<button class="tm-button primary compact" data-tq-linked-task="${h(task.id)}">继续处理</button>` : ""}` : `<h3>处理动作</h3><div class="rwb-inline-actions"><button class="tm-button secondary compact" data-risk-task-action="evidence" data-risk-task-id="${h(task.id)}">补充证据</button><button class="tm-button secondary compact" data-risk-task-action="draft" data-risk-task-id="${h(task.id)}">保存调查结论</button><button class="tm-button secondary compact" data-risk-task-action="preview" data-risk-task-id="${h(task.id)}">生成影响预览</button><button class="tm-button primary compact" data-risk-task-action="submit" data-risk-task-id="${h(task.id)}">${demoSkipsApproval() ? "提交处置" : "提交审批"}</button></div>`}
        ${riskTaskActionPanel(task,restricted ? null : shared)}`;
    } else if (drawer.kind === "object") {
      const row = store.objects.find(item => item.id === drawer.id); if (!row) return "";
      drawerQuality = row.dataQuality;
      const events = store.events.filter(item => row.eventIds.includes(item.id));
      const cases = row.type === "customer"
        ? store.caseLinks.filter(item => item.customer === row.id)
        : row.type === "partner"
          ? store.caseLinks.filter(item => item.partner === row.id)
          : store.caseLinks.filter(item => (row.caseRefs || []).some(ref => riskCaseRefKey(ref) === riskCaseRefKey(item)));
      title = row.label; subtitle = `${riskTypeLabel(row.type)} · ${row.maskedEmail}`;
      sections = `<div class="rwb-drawer-grid"><div><span>风险档</span><strong>${h(riskBandLabel(row.riskBand))}</strong><small>${row.basis === "related_max" ? "关联最高" : "直接风险"} · 风险分 ${h(row.riskScore)}</small></div><div><span>信用等级</span><strong>${h(row.credit || "待评估")}</strong><small>与R档独立计算</small></div><div><span>国家 / 来源</span><strong>${h(row.countryCodes?.join("、") || row.country || "待同步")}</strong><small>规则版本 ${h(row.riskRuleVersion)}</small></div><div><span>当前影响</span><strong>${row.affectedCases} 笔 / ${riskMoney(row.affectedAmount)}</strong><small>${row.settlementEligible === true ? "结算资格：可评估" : row.settlementEligible === false ? "结算资格：受阻断" : "结算资格：待核验"}</small></div></div>
        <h3>风险对象档案</h3><p class="rwb-muted">${h(row.reason)}；关联事件 ${events.length} 条，首次命中 ${h(row.firstDetected || "未记录")}，所有邮箱与联系方式均已脱敏。</p>${riskSensitiveMarkup(row.id,row.maskedEmail)}
        <div class="rwb-detail-meta"><span>对象版本 ${h(row.version)}</span><span>更新时间 ${h(row.updated)}</span><span>数据质量 ${h(row.dataQuality?.status || "fresh")}</span></div>
        <h3>风险评分构成</h3><div class="rwb-score-list">${(row.scoreItems || []).map(item => `<article><strong>${h(item.event_id)}</strong><span>基础分 ${h(item.base_point)} · 权重 ${h(item.weight)} · 贡献 ${h(item.contribution)}</span><small>${h(item.window_start)} 至 ${h(item.window_end)} · ${item.effective ? "已生效" : "待认定"} · ${h(item.rule_version)}</small></article>`).join("") || "<p class='rwb-muted'>暂无已生效评分项</p>"}</div>
        <h3>结算资格</h3><p class="rwb-muted">${h(row.settlementEligibilityReason || "待核验")}</p>
        <h3>关联事件</h3><div class="rwb-mini-list">${events.map(event => `<button data-risk-open="event" data-risk-id="${h(event.id)}"><span>${h(event.id)} · ${h(event.typeLabel)}</span>${statusTag(event.determination)}</button>`).join("")}</div>
        <h3>统一任务</h3><div class="rwb-task-list">${store.tasks.filter(task => (row.taskIds || []).includes(task.id) || row.eventIds.some(eventId => task.source === eventId) || task.source === row.id || task.object_id === row.id || task.source_ref?.id === row.id).map(task => `<article><header><strong>${h(task.id)} · ${h(task.purposeLabel)}</strong>${statusTag(task.status)}</header><p>${h(task.reason)}</p><small>审批：${h(task.approval || "无")} · 执行：${h(task.execution || "未创建")}</small><button class="tm-button secondary compact" data-risk-task="${h(task.id)}">打开任务详情</button></article>`).join("") || "<p class='rwb-muted'>暂无关联任务</p>"}</div><div class="rwb-inline-actions"><button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="risk_investigation">发起风险调查</button><button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="blacklist_add">加入本地名单</button></div>
        <h3>资金案件（三元组）</h3><div class="rwb-case-list">${cases.length ? cases.map(item => `<article><strong>${h(item.customer)} / ${h(item.commission)} / ${h(item.settlement)}</strong><span>${statusTag(item.status)} · 冻结 ${riskMoney(item.frozen)}</span><small>${h(item.reason)} · 限制 ${h(item.restriction)} · 结算检查待核验</small></article>`).join("") : "<p class='rwb-muted'>暂无直接资金案件</p>"}</div>
        <h3>证据与历史</h3><div class="rwb-evidence-list">${riskEvidenceMarkup(row.evidenceRefs || [])}</div><div class="rwb-history-list dev-audit-list">${riskHistoryMarkup(row.history || [])}</div>`;
    } else if (drawer.kind === "event") {
      const row = store.events.find(item => item.id === drawer.id); if (!row) return "";
      drawerQuality = row.dataQuality;
      const tasks = store.tasks.filter(item => row.taskIds.includes(item.id) || item.source === row.id);
      title = `${row.id} · ${row.typeLabel}`; subtitle = `${row.source} · 主对象 ${row.primary}`;
      sections = `<div class="rwb-drawer-grid"><div><span>风险档 / 评分</span><strong>${h(riskBandLabel(row.riskBand))}</strong><small>${h(row.riskScore || "—")} · ${h(row.ruleVersion)}</small></div><div><span>认定状态</span><strong>${h(riskDeterminationLabel(row.determination))}</strong><small>${h(row.reasonCode)}</small></div><div><span>信号状态</span><strong>${row.signal === "-" ? "不适用" : h(riskSignalLabel(row.signal))}</strong><small>${h(row.appealStatus || "无申诉门禁")}</small></div><div><span>资金影响</span><strong>${h(row.funds)}</strong><small>${Object.entries(row.workSummary?.settlement_counts || {}).map(([key,value]) => `${statusLabel(key)} ${value}笔`).join(" / ")}</small></div></div>
        <h3>触发事实与规则快照</h3><p class="rwb-muted">${h(row.reason)}。规则 ${h(row.rule)} / ${h(row.ruleVersion)}，原因码 ${h(row.reasonCode)}，分类 ${h(row.category)}，发生时间 ${h(row.occurred)}。CRM身份、KYC/KYB与欺诈确权在本页只读。</p>
        ${row.aggregationDetail ? `<h3>聚合分子 / 分母</h3>${row.aggregationDetail.trigger_snapshot ? `<div class="rwb-snapshot-grid"><div><span>触发快照</span><strong>${h(row.aggregationDetail.trigger_snapshot.numerator)} / ${h(row.aggregationDetail.trigger_snapshot.denominator)} = ${(Number(row.aggregationDetail.trigger_snapshot.ratio || 0) * 100).toFixed(2)}%</strong><small>阈值 ${(Number(row.aggregationDetail.trigger_snapshot.threshold || 0) * 100).toFixed(2)}% · ${h(row.aggregationDetail.trigger_snapshot.denominator_definition || "待核验")} · 客户清单 ${h((row.aggregationDetail.trigger_snapshot.customer_ids || []).join("、") || "待核验")}</small></div><div><span>观察窗口</span><strong>${h(row.aggregationDetail.trigger_snapshot.window_start || "待核验")} 至 ${h(row.aggregationDetail.trigger_snapshot.window_end || "待核验")}</strong><small>配置版本 ${h(row.aggregationDetail.trigger_snapshot.config_version || "待核验")} · ${h(row.aggregationDetail.trigger_snapshot.timezone || "待核验")}</small></div><div><span>当前快照</span><strong>${row.aggregationDetail.current_snapshot ? `${h(row.aggregationDetail.current_snapshot.numerator)} / ${h(row.aggregationDetail.current_snapshot.denominator)} = ${(Number(row.aggregationDetail.current_snapshot.ratio || 0) * 100).toFixed(2)}%` : "待核验"}</strong><small>${h(row.aggregationDetail.current_snapshot?.window_start || "待核验")} 至 ${h(row.aggregationDetail.current_snapshot?.window_end || "待核验")}</small></div></div><div class="rwb-case-list"><article><strong>来源范围</strong><small>${h(JSON.stringify(row.aggregationDetail.source_scope || "待核验"))}</small></article><article><strong>拟定范围</strong><small>${h(JSON.stringify(row.aggregationDetail.proposed_scope || "未提出"))}</small></article><article><strong>全局升级原因</strong><small>${h(row.aggregationDetail.global_escalation_reason || "未触发全局升级")}</small></article></div>` : "<p class='rwb-muted'>聚合快照缺失，暂不可提交依赖该快照的处置。</p>"}` : ""}
        ${row.signalDetail ? `<h3>结算超时信号</h3><div class="rwb-signal-box"><p>三元组：${h(row.signalDetail.ref?.customer_id)} / ${h(row.signalDetail.ref?.commission_case_id)} / ${h(row.signalDetail.ref?.settlement_case_id)}</p><p>批次：${h(row.signalDetail.ref?.settlement_batch_id || "待核验")} · 触发阈值 ${h(row.signalDetail.threshold_days ?? "待核验")} 天 · 当前已等待 ${h(row.signalDetail.current_elapsed_days ?? "待核验")} 天</p><p>资金状态：${h(row.signalDetail.settlement_status ? statusLabel(row.signalDetail.settlement_status) : "待核验")} · 配置版本 ${h(row.signalDetail.config_version || "待核验")}</p><p>申诉门禁：${row.signalDetail.appeal_eligibility?.visible == null ? "待核验" : row.signalDetail.appeal_eligibility.visible ? "可见" : "暂不可申诉"} · 窗口至 ${h(row.signalDetail.appeal_eligibility?.window_ends_at || "—")} · 原因 ${h(row.signalDetail.appeal_reason || "待核验")} · 已用 ${h(row.signalDetail.appeal_used ?? "待核验")} / ${h(row.signalDetail.appeal_max ?? "待核验")}</p><p class="rwb-muted">信号驳回和申诉均不自动解冻；只有独立重检、审批和领域执行完成后，系统才会更新限制。</p></div>` : ""}
        <h3>统一任务 / 审批 / 执行</h3><div class="rwb-task-list">${tasks.map(task => `<article><header><strong>${h(task.id)} · ${h(task.purposeLabel)}</strong>${statusTag(task.status)}</header><p>${h(task.reason)}</p><small>负责人：${h(task.owner)} · SLA：${h(riskDateLabel(task.sla))}</small><div class="rwb-inline-actions">${task.status==="open"?`<button class="tm-button secondary compact" data-risk-claim="${h(task.id)}">认领</button>`:""}<button class="tm-button secondary compact" data-risk-task="${h(task.id)}">查看任务</button></div></article>`).join("") || "<p class='rwb-muted'>暂无任务</p>"}</div>`;
      const approval = store.approvals.find(item => row.approvalIds?.includes(item.id) || tasks.some(task => task.id === item.task));
      const sharedEventApproval = approval ? riskApprovalRecord(approval.id) : null;
      const currentEventNode = riskApprovalNode(sharedEventApproval);
      const eventCanDecide = Boolean(sharedEventApproval && currentEventNode && sharedEventApproval.status === "pending_approval" && currentEventNode.status === "pending" && currentEventNode.required_role === state.role && sharedEventApproval.applicant?.user_id !== prototype.taskQueue?.options?.(state.role)?.current_user?.user_id);
      if (approval) sections += demoSkipsApproval()
        ? `<h3>处置记录</h3><div class="rwb-approval"><p>${h(approval.applicant)} 提交 · ${statusTag(sharedEventApproval?.status || approval.status)} · 执行：${h(approval.execution)}</p>${sharedEventApproval?.task_id?`<button class="tm-button secondary compact" data-tq-linked-task="${h(sharedEventApproval.task_id)}">查看任务与执行</button>`:""}</div>`
        : `<h3>审批链</h3><div class="rwb-approval"><p>${h(approval.applicant)} 提交 · ${statusTag(approval.status)} · 执行：${h(approval.execution)}</p><ol>${approval.chain.map(node => `<li>${h(node)}</li>`).join("")}</ol>${eventCanDecide ? `<div class="rwb-inline-actions"><button class="tm-button primary compact" data-risk-approve="${h(approval.id)}">打开审批节点</button><button class="tm-button danger compact" data-risk-reject="${h(approval.id)}">驳回</button></div>` : `<small>${sharedEventApproval ? `当前节点：${h(currentEventNode?.required_role || "待分配")} · 当前角色不可审批` : "统一审批记录尚未同步"}</small>`}</div>`;
      const eventPurposes = row.type === "settlement_overdue"
        ? `<button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="signal_review">发起信号复核</button>`
        : row.type === "cluster_detected"
          ? `<button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="risk_investigation">发起风险调查</button><button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="cluster_determination">发起集群认定</button>`
          : `<button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="risk_investigation">发起风险调查</button>`;
      sections += `<div class="rwb-inline-actions">${eventPurposes}<button class="tm-button secondary compact" data-action-name="create_review">生成复核</button></div><h3>证据与历史</h3><div class="rwb-evidence-list">${riskEvidenceMarkup(row.evidenceRefs || [])}</div><div class="rwb-history-list dev-audit-list">${riskHistoryMarkup(row.history || [])}</div>`;
    } else if (drawer.kind === "cluster") {
      const row = store.clusters.find(item => item.id === drawer.id); if (!row) return "";
      drawerQuality = row.dataQuality;
      title = row.id; subtitle = "集群成员与证据关系";
      sections = `<div class="rwb-drawer-grid"><div><span>认定状态</span><strong>${statusLabel(row.status)}</strong><small>版本 ${h(row.version)}</small></div><div><span>控制状态</span><strong>${statusLabel(row.control)}</strong><small>规则 ${h(row.riskRuleVersion)}</small></div><div><span>独立特征</span><strong>${row.independent} 条</strong><small>${h(row.exception || "无权威例外")}</small></div><div><span>影响案件</span><strong>${row.affectedCases} 笔 / ${riskMoney(row.affectedAmount)}</strong><small>最近更新 ${h(row.updated)}</small></div></div><h3>成员关系与证据</h3><div class="rwb-member-table"><table><thead><tr><th>客户</th><th>合作方</th><th>关系 edge_id</th><th>特征 / 脱敏特征</th><th>来源 / 证据</th><th>强度 / 关系</th><th>影响</th></tr></thead><tbody>${(row.memberDetails || []).map(member => `<tr><td>${h(member.customerRef.label)}<small>${h(member.customerRef.masked_email || "")}</small></td><td>${h(member.partnerRef.label)}</td><td>${h(member.edgeId)}</td><td>${h(member.featureType)}<small>${h(member.maskedFeature)} · ${h(member.featureRef)}</small></td><td>${h(member.sourceSystem)}<small>${h(member.sourceRef)} · ${h(member.evidenceRefs?.[0]?.evidence_id || "无证据")}</small></td><td>${h(member.relationStrength)}<small>${statusLabel(member.relationStatus)}</small></td><td>${riskMoney(member.affectedAmount?.amount)}</td></tr>`).join("")}</tbody></table></div><h3>集群证据</h3><div class="rwb-evidence-list">${riskEvidenceMarkup(row.evidenceRefs || [])}</div><div class="rwb-history-list dev-audit-list">${riskHistoryMarkup(row.history || [])}</div><p class="rwb-muted">集群认定与成员纠错是不同任务目的；本页不直接修改CRM事实或资金状态。</p><div class="rwb-inline-actions"><button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="cluster_member_correction">发起成员纠错</button><button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="cluster_determination">发起集群认定</button></div>`;
    } else {
      const row = store.blacklist.find(item => item.id === drawer.id); if (!row) return "";
      drawerQuality = row.dataQuality;
      title = `${row.id} · ${row.type}`; subtitle = row.source === "crm" ? "CRM 只读引用" : "Affiliate 本地名单";
      const blacklistTasks = row.taskRefs || [];
      const canRemoveBlacklist = row.allowedActions?.some(item => item.action === "blacklist_remove" && item.enabled);
      sections = `<div class="rwb-drawer-grid"><div><span>特征</span><strong>${h(row.masked)}</strong><small>token ${h(row.tokenHash)}</small></div><div><span>作用范围</span><strong>${h(row.scope)}</strong><small>目标 ${h(row.targetRef?.label || "—")}</small></div><div><span>状态 / 变更</span><strong>${statusLabel(row.status)}</strong><small>${row.pendingChange === "none" ? "无待处理变更" : "待移出，执行前仍生效"}</small></div><div><span>生效 / 失效</span><strong>${h(row.effective)}</strong><small>${row.expires === "-" ? "永久" : `至 ${row.expires}`}</small></div></div><h3>来源与生命周期</h3><p class="rwb-muted">${h(row.reason)}。来源引用 ${h(row.sourceRef)}；创建人 ${h(row.createdBy?.display_name || "—")}，审批人 ${h(row.approvedBy?.display_name || "—")}，更新时间 ${h(row.updatedAt)}。</p><h3>关联任务、审批与执行</h3><div class="rwb-task-list">${blacklistTasks.length ? blacklistTasks.map(task => `<article><header><strong>${h(task.id)} · ${h(task.purpose)}</strong>${statusTag(task.status)}</header><small>负责人：${h(task.owner)} · SLA：${h(riskDateLabel(task.sla))}</small><button class="tm-button secondary compact" data-risk-task="${h(task.id)}">查看任务</button></article>`).join("") : "<p class='rwb-muted'>暂无关联任务、审批或执行记录</p>"}</div><h3>证据与历史</h3><div class="rwb-evidence-list">${riskEvidenceMarkup(row.evidenceRefs || [])}</div><div class="rwb-history-list dev-audit-list">${riskHistoryMarkup(row.history || [])}</div>${row.source === "crm" ? "<p class='rwb-muted'>该条目来自CRM，页面只读，不显示移出入口。</p>" : canRemoveBlacklist ? `<div class="rwb-inline-actions"><button class="tm-button secondary compact" data-risk-new-task="${h(row.id)}" data-risk-purpose="blacklist_remove">申请移出</button></div>` : `<p class='rwb-muted'>当前条目已移除、已到期或已有待处理移出申请，不提供移出入口。</p>`}`;
    }
    return `<aside class="rwb-drawer tm-drawer" tabindex="-1" role="dialog" aria-label="风险详情"><header><div><h2>${h(title)}</h2><p>${h(subtitle)}</p></div><button class="tm-icon-button" data-risk-close aria-label="关闭详情">×</button></header><div class="rwb-drawer-body">${riskDataQualityMarkup(drawerQuality)}${sections}</div><footer><span>数据截至 ${h(store.serverNow)}</span><button class="tm-button secondary" data-risk-close>关闭</button></footer></aside>`;
  }

  function riskWorkbenchModal() {
    const modal = state.riskWorkbenchModal;
    if (!modal) return "";
    if (modal.export) return `<div class="rwb-modal-backdrop"><section class="rwb-modal" role="dialog" aria-modal="true"><header><div><h2>创建脱敏导出申请</h2><p>导出进入统一审批队列，当前页面不会直接下载敏感数据。</p></div><button class="tm-icon-button" data-risk-modal-close aria-label="关闭">×</button></header><div class="rwb-confirm-box"><strong>当前页签：${h(state.tabId)}</strong><p>范围：已应用筛选 · 列：当前可见列 · 快照：${h(riskWorkbenchStore().seed)}</p></div><label>导出原因<textarea data-risk-modal-reason placeholder="至少填写10个字"></textarea></label><footer><button class="tm-button secondary" data-risk-modal-close>取消</button><button class="tm-button primary" data-risk-modal-submit>提交导出审批</button></footer></section></div>`;
    return `<div class="rwb-modal-backdrop"><section class="rwb-modal" role="dialog" aria-modal="true"><header><div><h2>${modal.approval ? "确认审批处置" : "发起风险任务"}</h2><p>${modal.approval ? "串行审批：当前节点通过后才进入后续执行。" : "任务目的、范围和原因会写入统一任务记录。"}</p></div><button class="tm-icon-button" data-risk-modal-close aria-label="关闭">×</button></header>${modal.approval ? `<div class="rwb-confirm-box"><strong>${h(modal.approval.id)}</strong><p>${h(modal.approval.reason)}</p><small>申请人：${h(modal.approval.applicant)} · 申请人不得审批自己的申请。</small></div>` : `<label>任务目的<select data-risk-modal-purpose><option value="risk_investigation" ${modal.purpose==="risk_investigation"?"selected":""}>风险调查</option><option value="signal_review" ${modal.purpose==="signal_review"?"selected":""}>信号复核</option><option value="settlement_recheck" ${modal.purpose==="settlement_recheck"?"selected":""}>解除并重检</option><option value="cluster_determination" ${modal.purpose==="cluster_determination"?"selected":""}>集群认定</option><option value="cluster_member_correction" ${modal.purpose==="cluster_member_correction"?"selected":""}>成员纠错</option><option value="blacklist_add" ${modal.purpose==="blacklist_add"?"selected":""}>加入黑名单</option><option value="blacklist_remove" ${modal.purpose==="blacklist_remove"?"selected":""}>移出黑名单</option></select></label><label>原因<textarea data-risk-modal-reason placeholder="至少填写10个字"></textarea></label>`}<footer><button class="tm-button secondary" data-risk-modal-close>取消</button><button class="tm-button primary" data-risk-modal-submit>${modal.approval ? "确认审批" : "提交任务"}</button></footer></section></div>`;
  }

  function riskWorkbenchPage() {
    const store = riskWorkbenchStore();
    riskWorkbenchRows();
    const dataQuality = store.summary_data_quality?.status === "unavailable"
      ? `<div class="rwb-alert danger">关键汇总数据暂不可用，列表仍保留当前评审快照。<button class="tm-button secondary compact" data-risk-refresh>重试统计</button></div>`
      : "";
    const staleNotice = state.riskWorkbenchSnapshotStale
      ? `<div class="rwb-alert warning">当前筛选结果来自已过期评审快照，数据暂保持不变。点击“刷新当前评审快照”后重新读取。</div>`
      : "";
    return `<div class="rwb-page"><div class="rwb-banner"><span>风险工作台使用评审夹具 ${h(store.seed)} · 服务端时间 ${h(store.serverNow)}</span><span>CRM身份、KYC/KYB与欺诈确权只读 · 资金按三元组去重</span></div>${dataQuality}${staleNotice}${riskFilterBar()}${riskTable()}${riskDetailDrawer()}${riskWorkbenchModal()}</div>`;
  }

  function pageMainContent() {
    if (state.routeId === "tasks") return taskQueuePage();
    if (state.routeId === "workbench") return taskQueueApprovalPage();
    if (state.scenario === "forbidden") return `<div class="dev-placeholder">当前角色无权访问<br><small>切换角色后可继续查看</small></div>`;
    if (state.routeId === "partner-360") return partner360Page();
    const rows = filteredRows();
    if (state.routeId === "admin-workbench") return dashboardPage();
    if (state.routeId === "admin-config") {
      if (state.tabId === "overview") return configOverviewPanel();
      const configItem = businessConfigItemForTab();
      return configItem ? configSubgroupVersionPanel(configItem) : `<div class="dev-placeholder">业务配置小分组不存在</div>`;
    }
    if (state.routeId === "admin-system-config" && state.tabId === "system") return systemConfigPanel();
    if (state.routeId === "risk-workbench") return riskWorkbenchPage();
    const gridMode = state.routeId === "admin-modules" && state.tabId === "material-list" && state.materialGrid;
    const viewControls = link360ViewSwitcher() || materialViewToggle();
    const permissionNotice=state.routeId==="admin-modules"&&state.tabId==="config-permission"
      ? `<p class="dev-permission-scope">当前权限矩阵只读。角色、操作与数据范围的授权方案确认后开放编辑。</p>` : "";
    return `${permissionNotice}${eventTraceSearchBar()}${riskCasePanel()}${reportPanel()}${integrationPanel()}${dataGovernancePanel()}${batchBar()}${filterBar()}${dashboardDrillNotice()}${viewControls ? `<div class="dev-list-view-controls">${viewControls}</div>` : ""}${gridMode ? materialGrid() : table(rows)}`;
  }

  function detailData() { return seedRows().find(row => row.id === state.detailId) || null; }
  function formatPlain(row,key) {
    if (key === "certs") return `KYC ${statusLabel(row.partnerRef?.kyc.status)} / KYB ${statusLabel(row.partnerRef?.kyb.status)}`;
    if (key === "specCheck") return row.specCheck === "passed" ? "规格通过" : row.specCheck === "warning" ? "规格警告" : "规格失败";
    if (key === "platformLabel") return String(row[key] ?? "-");
    if (key === "events") return String(row[key] ?? "-");
    if (key === "deliveryRate") return String(row[key] ?? "-");
    if (key === "lastTestResult") return String(row[key] ?? "-");
    if (key === "pathSummary") return String(row[key] ?? "-");
    if (key === "subId" || key === "linkName" || key === "device" || key === "id") return String(row[key] ?? "-");
    if (key === "clicks30d") return String(row[key] ?? "-");
    if (key === "type") return String(row[key] ?? "-");
    if (key === "campaign") return String(row[key] ?? "-");
    if (key === "rule") return String(row[key] ?? "-");
    if (key === "platform") return String(row[key] ?? "-");
    if (key === "size") return String(row[key] ?? "-");
    if (key === "state") return statusLabel(row[key]);
    if (key === "uploadedAt" || key === "clickedAt") return String(row[key] ?? "-");
    if (["grossLabel","taxLabel","guaranteeLabel","netLabel","affiliate","external","diffLabel","fee","liable","settlementBlock","current","range","reason","value","hitRate","falseRate","convRate","roiLabel","trend","period","quadrant","drill","pages","sensitive","approval","domain"].includes(key)) return String(row[key] ?? "-");
    if (key === "creditLabel") return String(row[key] ?? "-");
    if (["status","risk","priority","stage"].includes(key)) return statusLabel(row[key]);
    const column = tab().columns.find(item => item.key === key);
    if (column?.format === "score") return String(row[key]);
    if (key === "amount") return money(row[key]);
    if (column?.unit) return `${row[key]}${column.unit}`;
    if (key === "progress") return `${row[key]}%`;
    return row[key] ?? "-";
  }

  const partner360Tabs = [
    {id:"overview",label:"概览"},
    {id:"onboarding",label:"入驻"},
    {id:"certs",label:"KYC/KYB"},
    {id:"performance",label:"业绩"},
    {id:"credit",label:"信用摘要"},
    {id:"offboarding",label:"清退"},
    {id:"notes",label:"跟进与备注"}
  ];

  function partner360Notes(partnerId) {
    return prototype.partner360.noteTemplates.filter(note => note.partnerId === partnerId);
  }

  function certStatusTag(kind,cert) {
    const label = prototype.partner360.kycStatusLabels[cert.status] || cert.status;
    const tone = cert.status === "verified" ? "tm-success" : ["failed","sync_failed","expired"].includes(cert.status) ? "tm-danger" : "tm-warning";
    return `<div class="dev-cert-card ${cert.status}"><header><strong>${kind}</strong><span class="dev-status ${tone}">${h(label)}</span></header><dl><dt>同步时间</dt><dd>${h(cert.syncAt)}</dd><dt>事实源</dt><dd>${h(cert.source)} · 只读</dd></dl></div>`;
  }

  function offboardTimeline(offboard) {
    return `<div class="dev-offboard-timeline">${offboard.timeline.map(node => `
      <div class="${node.state}">
        <span class="dev-offboard-dot"></span>
        <div><span class="dev-offboard-step">步骤${node.step} · ${h(node.label)}</span><strong>${node.time || (node.state === "doing" ? "进行中" : "待开始")}</strong><small>${h(node.actor)} · ${h(node.note)}</small></div>
      </div>`).join("")}</div>`;
  }

  function partner360DrawerBody(row) {
    const partner = row.partnerRef;
    const activeTab = state.partner360Tab || "overview";
    const reviewStates = ["applying","reviewing"];
    const offboardStates = ["offboarding","archived"];
    const stageMeta = prototype.partner360.stages.find(item => item.id === partner.stage);
    const tabs = partner360Tabs.filter(tabItem => {
      if (tabItem.id === "onboarding") return reviewStates.includes(partner.stage) || partner.stage === "onboarded";
      if (tabItem.id === "offboarding") return offboardStates.includes(partner.stage);
      return true;
    });
    const materialStateLabel = {submitted:"已提交",missing:"缺失",returned:"已退回"};
    const tabBody = {
      overview:`<div class="dev-detail-grid">
          <div><span>生命周期</span><strong>${statusTag(partner.stage)}</strong></div>
          <div><span>状态</span><strong>${statusTag(partner.status)}</strong></div>
          <div><span>类型</span><strong>${h(partner.type)}</strong></div>
          <div><span>国家</span><strong>${h(partner.country)}</strong></div>
          <div><span>责任角色</span><strong>${h(partner.owner)}</strong></div>
          <div><span>CRM账户</span><strong>${h(partner.crmId)}</strong></div>
          <div><span>累计佣金</span><strong>${money(partner.amount)}</strong></div>
          <div><span>更新时间</span><strong>${h(partner.updated)}</strong></div>
        </div>
        ${partner.watchReason ? `<p class="dev-block-reason">观察原因：${h(partner.watchReason)}</p>` : ""}
        ${stageMeta ? `<p class="dev-permission-scope">阶段说明：${h(stageMeta.hint)}。入驻审核、认证、清退均在此抽屉完成，不再有独立页面。</p>` : ""}`,
      onboarding:(partner.onboard ? `
        <div class="dev-check-list"><span>提交时间：${h(partner.onboard.submittedAt)}</span>${demoSkipsApproval() ? "" : `<span>自动审核条件：${partner.onboard.autoReviewEligible ? "命中（申请人具备审批权限时可自审）" : "未命中"}</span>`}</div>
        <p class="dev-help">${h(partner.onboard.note || "")}</p>
        <h4 class="dev-materials-title">申请材料清单</h4>
        <div class="dev-materials-list">${partner.onboard.materials.map(material =>
          `<span class="dev-chip ${material.state === "submitted" ? "active" : material.state === "returned" ? "forbidden" : ""}">${h(material.name)} · ${h(materialStateLabel[material.state])}</span>`).join("")}</div>
        ${reviewStates.includes(partner.stage) ? `
        <div class="dev-review-actions">
          <button class="tm-button primary" data-partner-review="approve" data-partner-target="${h(partner.id)}">${demoSkipsApproval() ? "确认入驻" : "审核通过"}</button>
          <button class="tm-button secondary" data-partner-review="reject" data-partner-target="${h(partner.id)}">驳回</button>
          <button class="tm-button secondary" data-partner-review="supplement" data-partner-target="${h(partner.id)}">要求补件</button>
        </div>
        <p class="dev-help">${demoSkipsApproval() ? "填写原因后直接更新入驻处理结果，并保留操作记录。" : "三键均强制填写原因并写入全局审计；申请人具备审批权限时提示自动审核（self_review=true 双审计）。"}</p>` : `<p class="dev-help">该合作方已度过入驻阶段；历史审核记录见审计。</p>`}
      ` : "<p class='dev-help'>无入驻申请记录。</p>"),
      certs:`
        <div class="dev-cert-grid">
          ${certStatusTag("KYC 个人认证",partner.kyc)}
          ${certStatusTag("KYB 企业认证",partner.kyb)}
        </div>
        <p class="dev-permission-scope">认证状态由CRM同步，Affiliate只读呈现，不提供认证执行按钮。同步异常时生成集成任务，跳转处理中心/集成任务处理。</p>
        ${["failed","sync_failed"].includes(partner.kyc.status) || ["failed","sync_failed"].includes(partner.kyb.status) ? `<button class="tm-button secondary" data-partner-sync-task="${h(partner.id)}">查看同步异常任务</button>` : ""}`,
      performance:(partner.performance ? `
        <div class="dev-impact-grid">
          <article><span>累计点击</span><strong>${compact(partner.performance.clicks)}</strong></article>
          <article><span>有效FTD</span><strong>${compact(partner.performance.validFtd)}</strong></article>
          <article><span>累计佣金</span><strong>${money(partner.performance.commission)}</strong></article>
          <article><span>质量等级</span><strong>${h(partner.performance.qualityGrade)}</strong></article>
        </div>
        <p class="dev-permission-scope">净ROI ${partner.performance.roi}。业绩明细与建议归报表中心/合作方ROI；此处只做摘要。</p>` : `<p class="dev-help">暂无业绩数据（未入驻或已归档）。</p>`),
      credit:`
        <div class="dev-impact-grid">
          <article><span>信用等级</span><strong>${h(partner.credit.grade)}</strong></article>
          <article><span>信用积分</span><strong>${partner.credit.score}</strong></article>
          <article><span>可调级</span><strong>${partner.credit.adjustable ? "是（临时调级需审批）" : "否"}</strong></article>
          <article><span>完整档案</span><strong>识别中心/信用积分与等级</strong></article>
        </div>
        <p class="dev-permission-scope">信用三页分工铁律：档案事实（识别中心）｜调级审批（处理中心/信用调级）｜权益配置（配置中心）。此处仅为摘要与跳转入口。</p>
        <button class="tm-button secondary" data-partner-credit-link="${h(partner.id)}">打开信用档案</button>`,
      offboarding:(partner.offboard ? `
        <div class="dev-impact-grid">
          <article><span>清退原因</span><strong>${h(partner.offboard.reason)}</strong></article>
          <article><span>发起人</span><strong>${h(partner.offboard.initiatedBy)}</strong></article>
          <article><span>发起时间</span><strong>${h(partner.offboard.initiatedAt)}</strong></article>
          <article><span>保留保证金</span><strong>${money(partner.offboard.guaranteeHeld)}</strong></article>
        </div>
        <h4 class="dev-materials-title">清退步骤时间线（当前步骤 ${partner.offboard.currentStep}/6）</h4>
        ${offboardTimeline(partner.offboard)}
        ${partner.offboard.currentStep === 4 ? `<button class="tm-button secondary" data-partner-guarantee-link="${h(partner.id)}">跳转保证金审批（资金组）</button>` : ""}` : `<p class="dev-help">该合作方不在清退阶段。</p>`),
      notes: (() => {
        const notes = partner360Notes(partner.id);
        return `${notes.length ? `<div class="dev-audit-list">${notes.map(note => `<div><span>${h(note.time)} · ${h(note.author)} · ${h(note.type)}</span><strong>${h(note.content)}</strong><small>下次跟进：${h(note.nextFollowUp)}</small></div>`).join("")}</div>` : "<p class='dev-help'>暂无跟进记录。</p>"}
        <div class="dev-review-actions"><button class="tm-button secondary" data-partner-note="${h(partner.id)}">新增备注</button></div>
        <p class="dev-help">备注为内部跟进记录（P2低频），不回传CRM；新增需填写内容与下次跟进时间。</p>`;
      })()
    }[activeTab] || "";
    return `<section class="dev-drawer-section dev-partner360-tabs-bar">
      <div class="dev-partner360-tabs" role="tablist">${tabs.map(tabItem =>
        `<button class="${activeTab===tabItem.id?"active":""}" data-partner360-tab="${h(tabItem.id)}" role="tab" aria-selected="${activeTab===tabItem.id}">${h(tabItem.label)}</button>`).join("")}</div>
    </section>
    <section class="dev-drawer-section dev-partner360-body">${tabBody}</section>`;
  }

  function partner360Footer(row) {
    const partner = row.partnerRef;
    const actions = [];
    if (["onboarded","watching"].includes(partner.stage) && ["operations","compliance"].includes(state.role)) {
      actions.push(`<button class="tm-button secondary" data-partner-offboard-init="${h(partner.id)}">发起清退</button>`);
    }
    if (partner.stage === "watching" && state.role === "risk") {
      actions.push(`<button class="tm-button secondary" data-partner-resume="${h(partner.id)}">恢复正常</button>`);
    }
    return actions.join("");
  }

  const client360Tabs = [
    {id:"overview",label:"概览"},
    {id:"risk",label:"风险"},
    {id:"attribution",label:"归属链路"},
    {id:"events",label:"关联事件"}
  ];

  function client360DrawerBody(row) {
    const client = row.clientRef;
    const activeTab = state.client360Tab || "overview";
    const attr = client.attribution;
    const link = prototype.attribution360.links.find(item => item.client === client.id);
    const chain = prototype.eventChainCatalog.chains.find(item => item.client === client.id);
    const partner = prototype.partner360.partners.find(p => p.id === client.partnerId);
    const tabBody = {
      overview:`<div class="dev-detail-grid">
          <div><span>生命周期</span><strong>${statusTag(client.stage)}</strong></div>
          <div><span>国家</span><strong>${h(client.country)}</strong></div>
          <div><span>归属合作方</span><strong>${h(partner?.name || client.partnerId)}</strong></div>
          <div><span>CRM客户ID</span><strong>${h(client.crmId)}</strong></div>
          <div><span>FTD金额</span><strong>${money(client.ftdAmount)}</strong></div>
          <div><span>累计佣金</span><strong>${money(client.commissionTotal)}</strong></div>
          <div><span>风险等级</span><strong><span class="dev-status ${["R0","R1"].includes(client.rGrade)?"tm-success":client.rGrade==="R2"?"tm-warning":"tm-danger"}">${h(statusLabel(client.rGrade))}</span></strong></div>
          <div><span>更新时间</span><strong>${h(client.updated)}</strong></div>
        </div>
        <p class="dev-permission-scope">客户基本资料与KYC由CRM事实源同步，此处只读。风险档案在「风险」页签；完整事件链在「关联事件」页签。</p>`,
      risk:(client.riskProfile ? `
        <div class="dev-detail-grid">
          <div><span>R档结论</span><strong><span class="dev-status ${["R0","R1"].includes(client.riskProfile.rGrade)?"tm-success":client.riskProfile.rGrade==="R2"?"tm-warning":"tm-danger"}">${h(statusLabel(client.riskProfile.rGrade))}</span></strong></div>
          <div><span>结论摘要</span><strong>${h(client.riskProfile.conclusion)}</strong></div>
        </div>
        <h4 class="dev-materials-title">风险事件引用</h4>
        <div class="dev-materials-list">${client.riskProfile.riskEvents.map(evt => `<span class="dev-chip ${["R3"].includes(client.rGrade)?"forbidden":""}">${h(evt)}</span>`).join("") || "<span class='dev-chip'>无</span>"}</div>
        <h4 class="dev-materials-title">关联特征</h4>
        <div class="dev-risk-feature-list">
          <div><span>设备关联</span><strong>${client.riskProfile.devices.map(h).join("；")}</strong></div>
          <div><span>IP关联</span><strong>${client.riskProfile.ips.map(h).join("；")}</strong></div>
          <div><span>支付关联</span><strong>${client.riskProfile.payments.map(h).join("；")}</strong></div>
        </div>
        <h4 class="dev-materials-title">欺诈库引用（CRM）</h4>
        <div class="dev-materials-list">${client.riskProfile.fraudRefs.map(ref => `<span class="dev-chip ${ref.includes("命中")?"forbidden":""}">${h(ref)}</span>`).join("")}</div>
        <div class="dev-review-actions">
          <button class="tm-button primary" data-client-risk-review="${h(client.id)}">生成风险复核</button>
        </div>
        <p class="dev-help">唯一出口：生成风险复核任务（处理中心/风险复核）。此处不直接改档、不加黑名单——识别与处置分离。</p>` : `
        <p class="dev-help">该客户尚无风险档案（注册初期或无风险信号）。R档由风控服务自动生成后在此呈现。</p>
        <div class="dev-review-actions"><button class="tm-button secondary" data-client-risk-review="${h(client.id)}">生成风险复核</button></div>`),
      attribution:`
        <div class="dev-detail-grid">
          <div><span>归因渠道</span><strong>${h(attr.channel)}</strong></div>
          <div><span>推广链接</span><strong>${h(attr.linkId)}</strong></div>
          <div><span>Sub ID</span><strong>${h(attr.subId)}</strong></div>
          <div><span>归属规则</span><strong>${h(attr.rule)}</strong></div>
          <div><span>归属时间</span><strong>${h(attr.attributedAt)}</strong></div>
          <div><span>TraceId</span><strong>${h(link?.traceId || "-")}</strong></div>
        </div>
        ${link ? `<p class="dev-permission-scope">归属记录：${h(link.id)} · 状态${h(statusLabel(link.status))}${prototype.attribution360.exceptions.some(e=>e.traceId===link.traceId) ? ` · <strong>关联归因异常</strong>` : ""}</p>` : ""}
        <div class="dev-review-actions">
          ${chain ? `<button class="tm-button secondary" data-client-open-chain="${h(chain.traceId)}">查看完整事件链 →</button>` : ""}
          <button class="tm-button secondary" data-client-open-attr="${h(client.id)}">打开归属关系页 →</button>
        </div>`,
      events:(chain ? `
        <div class="dev-check-list"><span>事件链：${h(chain.traceId)} · ${chain.chain.length}节点</span><span>链上佣金：${money(chain.totalCommission)}</span></div>
        <div class="dev-offboard-timeline dev-event-chain-timeline dev-chain-compact">${chain.chain.map(node => `
          <div class="${node.status === "success" || node.status === "confirmed" ? "done" : node.status === "failed" ? "failed" : node.status === "pending" || node.status === "waiting_external" ? "pending" : "doing"}">
            <span class="dev-offboard-dot"></span>
            <div><span class="dev-offboard-step">${h(prototype.eventChainCatalog.nodeTypeLabels[node.type] || node.type)} · ${h(node.label)}</span><strong>${node.time || "待定"}</strong></div>
          </div>`).join("")}
        </div>
        <div class="dev-review-actions"><button class="tm-button secondary" data-client-open-chain="${h(chain.traceId)}">在事件流水中打开全链 →</button></div>` : `
        <p class="dev-help">该客户暂无收录事件链。事件流水按TraceId组织，可在事件流水页检索客户ID。</p>`)
    }[activeTab] || "";
    return `<section class="dev-drawer-section dev-partner360-tabs-bar">
      <div class="dev-partner360-tabs" role="tablist">${client360Tabs.map(tabItem =>
        `<button class="${activeTab===tabItem.id?"active":""}" data-client360-tab="${h(tabItem.id)}" role="tab" aria-selected="${activeTab===tabItem.id}">${h(tabItem.label)}</button>`).join("")}</div>
    </section>
    <section class="dev-drawer-section dev-partner360-body">${tabBody}</section>`;
  }

  function configOverviewSearchDrawer() {
    if (state.routeId !== "admin-config" || state.tabId !== "overview" || !state.detailId) return "";
    if (state.detailId === "overview-001") {
      return `<div class="tm-overlay" data-close-detail="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="配置总览详情">
        <header><div><strong>配置总览</strong><span>配置中心 · overview-001 · trace-admin-config-1</span></div><button data-close-detail="1" aria-label="关闭">×</button></header>
        <div>
          <section class="dev-drawer-section"><h3>对象信息</h3><div class="dev-impact-grid"><article><span>对象类型</span><strong>配置中心</strong></article><article><span>状态</span><strong>${statusTag("active")}</strong></article><article><span>责任角色</span><strong>系统/Tech</strong></article><article><span>更新时间</span><strong>${h(createDate(0))}</strong></article></div></section>
          <section class="dev-drawer-section"><h3>业务范围</h3><p class="dev-permission-scope">统一查看价格、资格、结算、资金、风控和治理配置的当前版本、定时生效版本与生效失败状态。配置总览只读，具体修改必须进入对应业务配置小组。</p></section>
          <section class="dev-drawer-section"><h3>关联入口</h3><div class="dev-check-list"><span>业务配置：按小组查看版本和参数快照</span><span>系统配置：维护不纳入版本控制的系统参数</span><span>全局审计：追踪版本创建、审批、生效和回滚</span></div></section>
        </div>
        <footer><button class="tm-button secondary" data-close-detail="1">关闭</button><button class="tm-button primary" data-config-version-open-page="1">打开配置总览</button></footer>
      </aside>`;
    }
    const item = configOverviewItems().find(row => row.id === state.detailId);
    if (!item) return "";
    const current = configItemCurrentVersion(item);
    const menuItem = configMenuItemForOverview(item);
    return `<div class="tm-overlay" data-close-detail="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="业务配置搜索详情">
      <header><div><strong>${h(String(item.name || "").replace(/Hold/g, "结算中"))}</strong><span>${h(item.category || "业务配置")} · ${h(item.id)}</span></div><button data-close-detail="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>当前版本</h3><div class="dev-impact-grid"><article><span>版本号</span><strong>${h(current?.version || "未配置")}</strong></article><article><span>状态</span><strong>${statusTag(current?.status || item.status || "draft")}</strong></article><article><span>责任角色</span><strong>${h(item.owner || current?.owner || "待配置")}</strong></article><article><span>最后修改</span><strong>${h(item.updated || current?.updated || "-")}</strong></article></div><p class="dev-permission-scope">${h(String(item.currentSummary || current?.parameters || "暂无参数摘要").replace(/Hold/g, "结算中"))}</p></section>
        <section class="dev-drawer-section"><h3>参数摘要</h3><div class="dev-check-list">${(item.parameters || []).map(parameter => `<span>${h(parameter)}</span>`).join("") || "<span>暂无参数摘要</span>"}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-detail="1">关闭</button>${menuItem ? `<button class="tm-button primary" data-config-item-navigate="${h(menuItem.tabId)}">进入配置小组</button>` : ""}</footer>
    </aside>`;
  }

  function withdrawalDrawer(row) {
    const w=prototype.funds360.withdrawals.find(item=>item.id===row.id);
    if(!w)return "";
    const partner=prototype.partner360.partners.find(item=>item.id===w.partner);
    const facts=[
      ["申请金额",money(w.amount)],["手续费",money(w.fee)],["预计到账",money(w.amount-w.fee)],
      ["合作方",partner?.name || w.partner],["支付订单",w.paymentOrderId || "尚未同步订单编号"],
      ["支付方式",w.channel || (w.name.includes("银行")?"银行转账":w.name.includes("钱包")?"电子钱包":"待核对")],
      ["收款账户",w.maskedAccount || "账户信息由CRM提供，当前仅展示状态"],
      ["CRM认证",`KYC：${statusLabel(partner?.kyc?.status)} / KYB：${statusLabel(partner?.kyb?.status)}`],
      ["余额处理",w.balanceState || "未同步余额处理依据，请核查流水"],
      ["支付回执",w.receiptId || "尚无最终到账回执"],
      ["对账结果",w.reconciliationState || "尚未同步对账结论"],
      ["尝试次数",w.attempts==null?"见支付时间线":`${w.attempts} / ${w.maxAttempts}`]
    ];
    return `<div class="tm-overlay" data-close-detail="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="提现详情">
      <header><div><strong>${h(w.name)}</strong><span>${h(w.id)} · ${h(row.traceId)}</span></div><button data-close-detail="1" aria-label="关闭">×</button></header><div>
      <section class="dev-drawer-section"><h3>当前处理结果</h3>${statusTag(w.status)}${w.failureReason?`<p class="dev-block-reason">${h(w.failureReason)}（${h(w.failureCode)}）</p>`:""}${w.externalResult==="unknown"?`<p class="dev-permission-scope">先查证原支付单结果，避免重复出款；核对任务不会自动重新支付。</p>`:""}</section>
      <section class="dev-drawer-section"><h3>金额与支付依据</h3><div class="dev-detail-grid">${facts.map(([label,value])=>`<div><span>${h(label)}</span><strong>${h(value)}</strong></div>`).join("")}</div></section>
      <section class="dev-drawer-section"><h3>申请与支付时间线</h3><div class="dev-audit-list">${w.steps.map(item=>`<div><span>${h(item.t || "尚未发生")}</span><strong>${h(item.s)}</strong><small>${h(item.d)}</small></div>`).join("")}</div></section>
      <section class="dev-drawer-section"><h3>关联处理任务</h3>${(prototype.taskQueue?.toLegacyRows(state.role)||[]).filter(item=>item.partnerId===w.partner&&item.source_type==="partner_followup"&&item.fields.business_ref===w.id).map(item=>`<button class="dev-link-button" data-route="tasks?task_id=${h(item.id)}">${h(item.id)} · ${statusLabel(item.status)}</button>`).join("")||"<p>暂无核对任务</p>"}</section>
      </div><footer><button class="tm-button secondary" data-close-detail="1">关闭</button><button class="tm-button secondary" data-route="partner-360/${h(w.partner)}?tab=finance">查看合作方财务</button>${w.status!=="success"&&["finance","finance_reviewer","operations","risk_supervisor"].includes(state.role)?`<button class="tm-button primary" data-fund-followup="${h(w.id)}">创建／查看财务核对任务</button>`:""}</footer></aside>`;
  }

  function drawer() {
    if(taskObjectPageActive())return "";
    if (state.routeId === "tickets") return supportUI.drawer();
    if (["tasks","workbench"].includes(state.routeId)) return taskQueueOverlay();
    if (state.routeId === "admin-config" && state.tabId === "overview" && state.detailId) return configOverviewSearchDrawer();
    const row = detailData();
    if (!row) return state.detailId ? `<div class="tm-overlay" data-close-detail="1"></div><aside class="tm-drawer" aria-label="记录不存在"><header><strong>未找到此记录</strong><button data-close-detail="1" aria-label="关闭">×</button></header><p>编号 ${h(state.detailId)} 不存在或当前员工无权查看，请返回列表重新选择。</p><footer><button class="tm-button secondary" data-close-detail="1">返回列表</button></footer></aside>` : "";
    if(state.routeId==="admin-modules"&&state.tabId==="withdrawal-list")return withdrawalDrawer(row);
    const currentTab = tab();
    const actions = allowedActions(routeActions[state.routeId]).filter(([id])=>legacyActionAllowed(id,row));
    const fields = currentTab.columns.map(column => [column.label,formatPlain(row,column.key)]);
    const isPartner360 = currentTab.profile === "module" && state.tabId === "partner-list" && row.partnerRef;
    const isClient360 = currentTab.profile === "module" && state.tabId === "client-list" && row.clientRef;
    const isPostback = currentTab.profile === "module" && state.tabId === "postback" && row.pbRef;
    return `<div class="tm-overlay" data-close-detail="1"></div><aside class="tm-drawer dev-drawer-wide ${isPartner360 ? "dev-partner360-drawer" : ""}" aria-label="详情抽屉">
      <header><div><strong>${h(row.name)}</strong><span>${h(currentTab.title)} · ${h(row.id)} · ${h(row.traceId)}</span></div><button data-close-detail="1" aria-label="关闭">×</button></header>
      <div>
        ${isPartner360 ? partner360DrawerBody(row) : isClient360 ? client360DrawerBody(row) : isPostback ? postbackDrawerBody(row) : `<section class="dev-drawer-section"><h3>基础信息</h3><div class="dev-detail-grid">${fields.map(([label,value]) => `<div><span>${h(label)}</span><strong>${h(value)}</strong></div>`).join("")}<div><span>状态</span><strong>${statusTag(row.status)}</strong></div><div><span>风险</span><strong>${statusTag(row.risk)}</strong></div></div></section>
        <section class="dev-drawer-section"><h3>影响与关联</h3><div class="dev-impact-grid"><article><span>影响金额</span><strong>${money(row.amount)}</strong></article><article><span>完成度</span><strong>${percent(row.progress)}</strong></article><article><span>关联对象</span><strong>${h(row.linked)}</strong></article><article><span>责任角色</span><strong>${h(row.owner)}</strong></article></div></section>`}
        ${!isPartner360 && currentTab.profile === "module" ? moduleDrawerContext(row) : currentTab.profile === "workbench" ? `<section class="dev-drawer-section"><h3>对象360</h3><div class="dev-object-grid"><article><span>合作方</span><strong>${h(row.partnerId)}</strong><button class="tm-button secondary" data-source-link="${h(row.id)}">查看来源</button></article><article><span>客户数</span><strong>${row.clientCount}</strong><small>关联客户与归属链路</small></article><article><span>佣金案件</span><strong>${row.commissionCount}笔</strong><small>${money(row.amount)}</small></article><article><span>风险案件组</span><strong>${h(row.riskCaseId)}</strong><small>组结论与逐案资金分离</small></article></div></section>
        <section class="dev-drawer-section"><h3>任务闭环</h3><div class="dev-check-list"><span>来源系统：${h(row.source)}</span><span>来源页签：${h(row.sourceLabel)}</span><span>来源对象：${h(row.sourceId)}</span><span>SLA：${h(row.due)}</span><span>超时状态：${row.overdue ? "已超时" : "未超时"}</span></div></section>
        <section class="dev-drawer-section"><h3>任务时间线</h3><div class="dev-audit-list">${(row.timeline || []).map(item => `<div><span>${h(item.time)} · ${h(item.actor)}</span><strong>${h(item.action)}</strong><small>${h(statusLabel(item.result))}</small></div>`).join("")}</div></section>` : !isPartner360 ? `<section class="dev-drawer-section"><h3>对象360</h3><div class="dev-object-grid"><article><span>TraceId</span><strong>${h(row.traceId)}</strong><small>页面、事件、任务、审计共享</small></article><article><span>来源对象</span><strong>${h(row.source)}</strong><small>可回查生成链路</small></article><article><span>影响范围</span><strong>${h(row.impact)}</strong><small>当前口径</small></article><article><span>关联对象</span><strong>${h(row.linked)}</strong><small>可下钻对象</small></article></div></section>` : ""}
        ${isPartner360 || isClient360 || isPostback ? "" : `<section class="dev-drawer-section"><h3>审计记录</h3><div class="dev-audit-list">${[0,1,2].map(index => `<div><span>${h(createDate(index*2+1))}</span><strong>${h(["系统识别","人工复核","版本锁定"][index])}</strong><small>${h(["自动生成识别事实","操作人确认结论","生成配置版本快照"][index])}</small></div>`).join("")}</div></section>`}
      </div>
      <footer><button class="tm-button secondary" data-close-detail="1">关闭</button>${isPartner360 ? partner360Footer(row) : isClient360 ? "" : actions.filter(([id]) => id !== "export").map(([id]) => `<button class="tm-button ${id==="approve"?"primary":"secondary"}" data-action-name="${h(id)}" data-target="${h(row.id)}">${h(state.routeId === "admin-modules" ? moduleActionLabel(id) : actionCatalog[id].label)}</button>`).join("")}</footer>
    </aside>`;
  }

  const releaseActions = {
    approve:{label:"签核",roles:["risk_supervisor","finance","compliance"],reason:true},
    schedule:{label:"定时生效",roles:["risk_supervisor","finance","compliance","system_admin"],reason:false},
    activate:{label:"立即生效",roles:["system_admin"],reason:true},
    rollback:{label:"回滚",roles:["risk_supervisor","finance","compliance","system_admin"],reason:true},
    recover:{label:"恢复重试",roles:["system_admin"],reason:true}
  };
  const releaseSignoffRoles = {risk_supervisor:"风控",finance:"财务",compliance:"合规"};

  function releasePackage() {return prototype.releasePackages.find(item => item.id === state.releaseId) || null;}

  function releaseDrawer() {
    const item = releasePackage();
    if (!item) return "";
    const action = releaseNextAction(item);
    const signoffs = Object.entries(releaseSignoffRoles).map(([role,label]) =>
      `<span class="dev-chip ${item.signoffs.includes(role) ? "active" : "forbidden"}">${label}${item.signoffs.includes(role) ? "已签核" : "未签核"}</span>`).join("");
    return `<div class="tm-overlay" data-close-release="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="配置发布包详情">
      <header><div><strong>${h(item.name)}</strong><span>${h(item.id)} · ${h(item.version)} · 上一版本 ${h(item.previousVersion)}</span></div><button data-close-release="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>发布状态</h3><div class="dev-impact-grid"><article><span>状态</span><strong>${statusTag(item.status)}</strong></article><article><span>责任团队</span><strong>${h(item.owner)}</strong></article><article><span>生效时间</span><strong>${h(item.effectiveTime)}</strong></article><article><span>资金影响</span><strong>${money(item.impactAmount)}</strong></article></div>${item.blockedReason ? `<p class="dev-block-reason">${h(item.blockedReason)}</p>` : ""}</section>
        <section class="dev-drawer-section"><h3>组合差异</h3><div class="dev-diff-list">${item.diffs.map(diff=>`<article><span>${h(diff.domain)}</span><div><small>${h(diff.current)}</small><strong>${h(diff.next)}</strong><p>${h(diff.impact)}</p></div></article>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>组合试算</h3><div class="dev-impact-grid"><article><span>命中对象</span><strong>${item.simulation.hitCount}</strong></article><article><span>误伤提示</span><strong>${item.simulation.falsePositive}</strong></article><article><span>护栏</span><strong>${item.simulation.blocked ? "阻断" : "通过"}</strong></article><article><span>资金影响</span><strong>${money(item.simulation.fundImpact)}</strong></article></div><p class="dev-permission-scope">${h(item.simulation.summary)}</p></section>
        <section class="dev-drawer-section"><h3>签核状态</h3><div class="dev-chip-row static">${signoffs}</div></section>
        <section class="dev-drawer-section"><h3>发布时间线</h3><div class="dev-audit-list">${item.timeline.map(record=>`<div><span>${h(record.time)} · ${h(record.actor)}</span><strong>${h(record.action)}</strong><small>${h(statusLabel(record.result))}</small></div>`).join("")}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-release="1">关闭</button>${action ? `<button class="tm-button primary" data-release-action="${h(action)}">${h(releaseActions[action].label)}</button>` : ""}</footer>
    </aside>`;
  }

  function releaseNextAction(item) {
    if (item.status === "pending_approval" && ["risk_supervisor","finance","compliance"].includes(state.role) && !item.signoffs.includes(state.role)) return "approve";
    if (item.status === "approved" && releaseActions.schedule.roles.includes(state.role)) return "schedule";
    if (item.status === "scheduled" && releaseActions.activate.roles.includes(state.role)) return "activate";
    if (item.status === "activation_failed" && releaseActions.recover.roles.includes(state.role)) return "recover";
    if (item.status === "active" && releaseActions.rollback.roles.includes(state.role)) return "rollback";
    return "";
  }

  const riskCaseActions = {
    split:{label:"拆分误合并成员",roles:["risk_supervisor","system_admin"],reason:true},
    conclude:{label:"确认组结论",roles:["risk_supervisor"],reason:true},
    escalate:{label:"升级调查",roles:["risk","risk_supervisor"],reason:true},
    release:{label:"解除隔离并重检",roles:["risk_supervisor","system_admin"],reason:true}
  };

  function riskCase() {return prototype.riskCases.find(item => item.id === state.riskCaseId) || null;}

  function availableRiskActions(item) {
    return Object.entries(riskCaseActions).filter(([id]) => {
      if (id === "split") return Boolean(item.splitCandidate);
      if (id === "conclude") return item.groupConclusion === "pending";
      if (id === "escalate") return item.investigation.status !== "escalated";
      if (id === "release") return item.quarantine.status === "active";
      return false;
    }).filter(([,action]) => action.roles.includes(state.role));
  }

  function riskGraph(item) {
    const centerX = 300, centerY = 145;
    return `<svg class="dev-risk-graph" viewBox="0 0 600 290" role="img" aria-label="风险关系图">
      ${item.graphNodes.map(node=>`<line x1="${centerX}" y1="${centerY}" x2="${node.x}" y2="${node.y}"></line>`).join("")}
      <circle cx="${centerX}" cy="${centerY}" r="48"></circle>
      <text x="${centerX}" y="${centerY-4}">案件组</text><text x="${centerX}" y="${centerY+14}">${h(item.id)}</text>
      ${item.graphNodes.map(node=>`<circle cx="${node.x}" cy="${node.y}" r="32"></circle><text x="${node.x}" y="${node.y-2}">${h(node.type)}</text><text x="${node.x}" y="${node.y+14}">${h(node.label)}</text>`).join("")}
    </svg>`;
  }

  function riskCaseDrawer() {
    const item = riskCase();
    if (!item) return "";
    return `<div class="tm-overlay" data-close-risk-case="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="风险案件闭环详情">
      <header><div><strong>${h(item.name)}</strong><span>${h(item.id)} · ${h(item.partner)} · 置信度 ${(item.confidence*100).toFixed(0)}%</span></div><button data-close-risk-case="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>案件状态</h3><div class="dev-impact-grid"><article><span>案件状态</span><strong>${statusTag(item.status)}</strong></article><article><span>风险等级</span><strong>${statusTag(item.riskLevel)}</strong></article><article><span>组结论</span><strong>${statusTag(item.groupConclusion)}</strong></article><article><span>误合并候选</span><strong>${h(item.splitCandidate || "无")}</strong></article></div></section>
        <section class="dev-drawer-section"><h3>风险关系图</h3>${riskGraph(item)}<div class="dev-chip-row static">${item.features.map(feature=>`<span class="dev-chip">${h(feature)}</span>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>成员与逐案资金</h3><p class="dev-help">组结论不自动继承到成员资金；每笔佣金必须独立处理。</p><div class="dev-member-table"><div><span>客户</span><span>设备/IP/支付</span><span>佣金</span><span>资金状态</span><span>操作</span></div>${item.members.map(member=>`
          <div><span>${h(member.clientId)}${member.memberStatus === "mis_merged" ? " · 误合并" : ""}</span><span>${h(member.device)}<small>${h(member.ip)} · ${h(member.payment)}</small></span><span>${h(member.commissionId)}<small>${money(member.amount)}</small></span><span>${statusTag(member.commissionStatus)}</span><span>历史记录，只读</span></div>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>调查SLA</h3><div class="dev-check-list"><span>状态：${h(statusLabel(item.investigation.status))}</span><span>响应SLA：${item.investigation.responseSlaHours}小时</span><span>提醒节点：${item.investigation.reminderHours.join(" / ")}小时</span><span>最长时长：${item.investigation.maxDurationDays}自然日</span><span>链接限制：${item.investigation.linkRestriction === "all_links" ? "新增+已有链接" : item.investigation.linkRestriction === "new_links" ? "新增链接" : "无限制"}</span><span>待材料：${item.investigation.materials.join("、")}</span></div></section>
        <section class="dev-drawer-section"><h3>统一隔离队列</h3><div class="dev-impact-grid"><article><span>状态</span><strong>${statusTag(item.quarantine.status)}</strong></article><article><span>来源</span><strong>${h(item.quarantine.sourceType)} / ${h(item.quarantine.sourceRef)}</strong></article><article><span>等待天数</span><strong>${item.quarantine.waitingDays}天</strong></article><article><span>阻塞金额</span><strong>${money(item.quarantine.amount)}</strong></article></div><p class="dev-permission-scope">解除隔离后必须重跑结算前检查；不会直接付款，也不会自动修改逐案佣金状态。</p></section>
        <section class="dev-drawer-section"><h3>处理时间线</h3><div class="dev-audit-list">${item.timeline.map(record=>`<div><span>${h(record.time)} · ${h(record.actor)}</span><strong>${h(record.action)}</strong><small>${h(statusLabel(record.result))}</small></div>`).join("")}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-risk-case="1">关闭</button><button class="tm-button primary" data-route="risk-workbench?tab=events">进入风险工作台</button></footer>
    </aside>`;
  }

  function reportDimension() {
    for (const packet of prototype.reportPackets) {
      const item = packet.dimensions.find(row => row.id === state.reportDimensionId);
      if (item) return {packet,item};
    }
    return null;
  }

  function reportDimensionDrawer() {
    const data = reportDimension();
    if (!data) return "";
    const {packet,item} = data;
    const metrics = Object.entries(item).filter(([key,value]) => typeof value === "number" && !["clicks","registrations"].includes(key)).slice(0,8);
    return `<div class="tm-overlay" data-close-report-drilldown="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="报表维度下钻">
      <header><div><strong>${h(item.label)}</strong><span>${h(packet.title)} · ${h(item.id)}</span></div><button data-close-report-drilldown="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>维度指标</h3><div class="dev-impact-grid">${metrics.map(([key,value])=>`<article><span>${h(key)}</span><strong>${h(value)}${key.includes("Rate") || key === "coverage" ? "%" : ""}</strong></article>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>下钻对象</h3><div class="dev-object-grid"><article><span>客户</span><strong>${item.clients.join("、")}</strong><small>点击客户数据进入明细</small></article><article><span>佣金</span><strong>${item.commissions.join("、")}</strong><small>点击佣金进入资金详情</small></article><article><span>风险案件</span><strong>${h(item.riskCase)}</strong><button class="tm-button secondary" data-report-risk-case="${h(item.riskCase)}">打开案件</button></article><article><span>建议</span><strong>${h(recommendationLabel(item.recommendation))}</strong><small>只生成建议，不直接改权益</small></article></div></section>
        <section class="dev-drawer-section"><h3>建议口径</h3><p class="dev-permission-scope">报表建议必须进入人工复核或运营评审；建议本身不修改合作方状态、佣金、配置或资金。</p></section>
      </div>
      <footer><button class="tm-button secondary" data-close-report-drilldown="1">关闭</button><button class="tm-button primary" data-report-suggestion="${h(item.id)}">生成建议</button></footer>
    </aside>`;
  }

  function reportExportDrawer() {
    if (!state.reportExportOpen) return "";
    const taskExports = prototype.taskQueue?.exports({role:state.role}) || [];
    const taskExportRows = taskExports.map(item => `<div><span>任务队列导出<small>${h(item.export_id)}</small></span><span>已应用任务筛选<small>${h(item.row_count)}行 · 敏感 · 已脱敏</small></span><span>${statusTag(item.status)}</span><span>${statusTag(item.approval_status || (item.status === "ready" ? (demoSkipsApproval() ? "not_required" : "approved") : item.status))}</span><span>${h(item.expires_at || "按导出策略")}</span><span>${item.approval_id ? `<button class="tm-button secondary" data-task-export-approval="${h(item.approval_id)}">查看记录</button>` : ""}<button class="tm-button secondary" data-tq-action="download_export" data-tq-export-id="${h(item.export_id)}" ${item.status !== "ready" ? "disabled" : ""}>下载</button></span></div>`).join("");
    const riskExports = (prototype.riskWorkbenchExports || []).map(record => {
      const centerTask = prototype.exportTasks.find(item => item.riskExportId === record.export_id);
      const targetId = centerTask?.id || record.export_id;
      const status = record.status || "pending_approval";
      const approvalStatus = record.approval_status || status;
      const expiresAt = record.expires_at || centerTask?.expiresAt || "审批后24小时";
      return `<div><span>风险工作台导出<small>${h(record.export_id)}</small></span><span>${h(record.tab)} · ${h(record.row_count)}行 · 脱敏</span><span>${statusTag(status)}</span><span>${statusTag(approvalStatus)}</span><span>${h(expiresAt)}</span><span>${status === "pending_approval" ? `<button class="tm-button secondary" data-governance-action="approve_export" data-governance-target="${h(targetId)}">${demoSkipsApproval() ? "生成文件" : "审批"}</button>` : ""}<button class="tm-button secondary" data-risk-export-download="${h(record.export_id)}" ${status !== "ready" ? "disabled" : ""}>下载</button></span></div>`;
    }).join("");
    return `<div class="tm-overlay" data-close-report-export="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="异步导出中心">
      <header><div><strong>导出中心</strong><span>${demoSkipsApproval() ? "脱敏、下载与操作记录" : "审批、脱敏、下载与操作记录"}</span></div><button data-close-report-export="1" aria-label="关闭">×</button></header>
      <div><section class="dev-drawer-section"><h3>导出任务</h3><div class="dev-member-table dev-export-table"><div><span>任务</span><span>范围</span><span>状态</span><span>审批</span><span>过期时间</span><span>操作</span></div>${taskExportRows}${riskExports}${prototype.exportTasks.filter(task => !task.riskExportId).map(task=>`
        <div><span>${h(task.name)}<small>${h(task.traceId)}</small></span><span>${h(task.scope)}<small>${task.rows}行 · ${h(statusLabel(task.dataLevel))} · ${task.masked ? "已脱敏" : "未脱敏"}</small></span><span>${statusTag(task.status)}</span><span>${statusTag(task.approvalStatus)}</span><span>${h(task.expiresAt)}</span><span>${task.approvalStatus === "pending_approval" ? `<button class="tm-button secondary" data-governance-action="approve_export" data-governance-target="${h(task.id)}">${demoSkipsApproval() ? "生成文件" : "审批"}</button>` : ""}<button class="tm-button secondary" data-report-export-download="${h(task.id)}" ${task.status !== "ready" ? "disabled" : ""}>下载</button><button class="tm-button secondary" data-report-export-cancel="${h(task.id)}" ${["expired","cancelled"].includes(task.status) ? "disabled" : ""}>取消</button></span></div>`).join("")}</div></section></div>
      <footer><button class="tm-button secondary" data-close-report-export="1">关闭</button><button class="tm-button primary" data-create-report-export="1">创建当前筛选导出</button></footer>
    </aside>`;
  }

  function integrationSystem() {return prototype.integrationHealth.systems.find(item=>item.id===state.integrationSystemId) || null;}

  function integrationSystemDrawer() {
    const system = integrationSystem();
    if (!system) return "";
    return `<div class="tm-overlay" data-close-integration-system="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="集成系统详情">
      <header><div><strong>${h(system.name)}</strong><span>${h(system.id)} · ${h(system.owner)}</span></div><button data-close-integration-system="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>健康状态</h3><div class="dev-impact-grid"><article><span>状态</span><strong>${statusTag(system.status)}</strong></article><article><span>延迟</span><strong>${system.latencyMs}ms</strong></article><article><span>成功率</span><strong>${system.successRate}%</strong></article><article><span>积压</span><strong>${system.backlog}</strong></article><article><span>重试率</span><strong>${system.retryRate}%</strong></article><article><span>回调失败率</span><strong>${system.callbackFailureRate}%</strong></article></div></section>
        <section class="dev-drawer-section"><h3>依赖能力</h3><div class="dev-chip-row static">${system.dependencies.map(dep=>`<span class="dev-chip">${h(dep)}</span>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>资金影响</h3><p class="dev-permission-scope">当前集成异常关联的自动结算阻断金额为 ${money(system.blockedAmount)}。集成恢复不自动放行资金，必须重跑结算前检查。</p></section>
        <section class="dev-drawer-section"><h3>健康时间线</h3><div class="dev-audit-list">${system.timeline.map(record=>`<div><span>${h(record.time)} · ${h(record.actor)}</span><strong>${h(record.action)}</strong><small>${h(statusLabel(record.result))}</small></div>`).join("")}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-integration-system="1">关闭</button><button class="tm-button primary" data-integration-recheck="${h(system.id)}">重新检查</button></footer>
    </aside>`;
  }

  function modal() {
    if (state.routeId === "tickets") return supportUI.dialog();
    if (!state.modal) return "";
    const action = actionCatalog[state.modal.action];
    if (!action) return "";
    const target = state.modal.target ? seedRows().find(row => row.id === state.modal.target) : null;
    const actionLabel = actionDisplayLabel(state.modal.action);
    const fields = deepActionFields(state.modal.action);
    return `<div class="tm-overlay" data-close-modal="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>${h(actionLabel)}</strong><span>${h(target ? target.name : tab().title)}</span></div><button data-close-modal="1" aria-label="关闭">×</button></header>
      <div><section><h3>影响预览</h3><div class="dev-impact-grid"><article><span>对象数</span><strong>${state.modal.target ? 1 : state.selected.size || 1}</strong></article><article><span>影响金额</span><strong>${money((state.modal.target ? seedRows().filter(row => row.id === state.modal.target) : seedRows().filter(row => state.selected.has(row.id))).reduce((sum,row)=>sum+Number(row.amount||0),0))}</strong></article><article><span>审计</span><strong>提交后记录操作日志</strong></article></div></section>
      ${fields.length ? `<section><h3>执行参数</h3><div class="dev-action-fields">${fields.map(field => {
        const value = field.value(target);
        const control = field.type === "select"
          ? `<select data-action-field="${h(field.key)}">${field.options.map(option => `<option value="${h(option)}" ${option === value ? "selected" : ""}>${h(statusLabel(option))}</option>`).join("")}</select>`
          : `<input type="${h(field.type || "text")}" data-action-field="${h(field.key)}" value="${h(value)}">`;
        return `<label><span>${h(field.label)}</span>${control}</label>`;
      }).join("")}</div></section>` : ""}
      ${action.reason ? `<section><h3>原因</h3><textarea id="action-reason" placeholder="请输入操作原因"></textarea></section>` : ""}
      ${action.selfReview && !demoSkipsApproval() ? `<section><h3>自动审核</h3><label class="dev-check"><input type="checkbox" id="action-self-review">申请人具备审批权限时使用自动审核</label><p class="dev-help">自审将在同一事务生成提交与审批两条审计，并标记 self_review=true。</p></section>` : ""}
      </div><footer><button class="tm-button secondary" data-close-modal="1">取消</button><button class="tm-button primary" data-submit-action="1">确认${h(actionLabel)}</button></footer></section>`;
  }

  function riskCaseModal() {
    if (!state.riskCaseModal) return "";
    const item = riskCase();
    const action = item ? riskCaseActions[state.riskCaseModal.action] : null;
    if (!item || !action) return "";
    const target = state.riskCaseModal.action === "split" ? item.splitCandidate : item.name;
    return `<div class="tm-overlay" data-close-risk-modal="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>${h(action.label)}</strong><span>${h(target)}</span></div><button data-close-risk-modal="1" aria-label="关闭">×</button></header>
      <div><section><h3>影响预览</h3><div class="dev-impact-grid"><article><span>成员数</span><strong>${item.members.length}</strong></article><article><span>阻塞金额</span><strong>${money(item.quarantine.amount)}</strong></article><article><span>组结论继承</span><strong>否</strong></article><article><span>资金动作</span><strong>逐案独立</strong></article></div></section>
      ${action.reason ? `<section><h3>原因</h3><textarea id="risk-case-reason" placeholder="请输入风险处理原因"></textarea></section>` : ""}
      </div><footer><button class="tm-button secondary" data-close-risk-modal="1">取消</button><button class="tm-button primary" data-submit-risk-case="1">确认${h(action.label)}</button></footer>
    </section>`;
  }

  function reportSuggestionModal() {
    if (!state.reportSuggestion) return "";
    const data = reportDimension();
    if (!data) return "";
    const {item} = data;
    return `<div class="tm-overlay" data-close-report-suggestion="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>生成报表建议</strong><span>${h(item.label)} · ${h(recommendationLabel(item.recommendation))}</span></div><button data-close-report-suggestion="1" aria-label="关闭">×</button></header>
      <div><section><h3>建议边界</h3><div class="dev-check-list"><span>只生成建议任务，不直接修改合作方状态。</span><span>不修改佣金、配置或资金。</span><span>放量、限控或复核需人工确认。</span><span>生成后进入全局审计。</span></div></section>
      <section><h3>建议说明</h3><textarea id="report-suggestion-reason" placeholder="请输入建议依据"></textarea></section></div>
      <footer><button class="tm-button secondary" data-close-report-suggestion="1">取消</button><button class="tm-button primary" data-submit-report-suggestion="1">确认生成</button></footer>
    </section>`;
  }

  function releaseModal() {
    if (!state.releaseModal) return "";
    const item = releasePackage();
    const action = item ? releaseActions[state.releaseModal.action] : null;
    if (!item || !action) return "";
    return `<div class="tm-overlay" data-close-release-modal="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>${h(action.label)}</strong><span>${h(item.name)} · ${h(item.version)}</span></div><button data-close-release-modal="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>影响预览</h3><div class="dev-impact-grid"><article><span>配置域</span><strong>${item.domains.length}</strong></article><article><span>资金影响</span><strong>${money(item.impactAmount)}</strong></article><article><span>上一版本</span><strong>${h(item.previousVersion)}</strong></article><article><span>目标状态</span><strong>${h(releaseTargetResult(state.releaseModal.action))}</strong></article></div></section>
        ${action.reason ? `<section><h3>原因</h3><textarea id="release-reason" placeholder="请输入配置治理原因"></textarea></section>` : ""}
      </div>
      <footer><button class="tm-button secondary" data-close-release-modal="1">取消</button><button class="tm-button primary" data-submit-release="1">确认${h(action.label)}</button></footer>
    </section>`;
  }

  function releaseTargetResult(action) {
    if (action === "approve") return "签核记录";
    if (action === "schedule") return "待生效";
    if (action === "activate") return "已生效";
    if (action === "rollback") return "已回滚";
    if (action === "recover") return "重新定时生效";
    return "-";
  }

  function submitReleaseAction() {
    const item = releasePackage();
    const modalInfo = state.releaseModal;
    const action = item ? releaseActions[modalInfo.action] : null;
    if (!item || !action || !action.roles.includes(state.role)) return showToast("当前角色无权执行配置治理动作");
    const reason = document.querySelector("#release-reason")?.value.trim();
    if (action.reason && !reason) return showToast("配置治理原因必填");
    const actionId = modalInfo.action;
    let result = item.status;
    if (actionId === "approve") {
      if (!item.signoffs.includes(state.role)) item.signoffs.push(state.role);
      result = Object.keys(releaseSignoffRoles).every(role => item.signoffs.includes(role)) ? "approved" : "pending_approval";
    }
    if (actionId === "schedule") result = "scheduled";
    if (actionId === "activate") result = "active";
    if (actionId === "rollback") result = "rolled_back";
    if (actionId === "recover") {item.blockedReason = "";result = "scheduled";}
    item.status = result;
    item.timeline.push({time:createDate(0),action:action.label,actor:roleOwnerNames[state.role],result});
    prototype.auditRecords.unshift({
      id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:`配置发布包${action.label}`,
      object:`${item.name} ${item.version}`,operator:roleOwnerNames[state.role],result,
      trace_id:`trace-${item.id}`,self_review:false
    });
    state.releaseModal = null;
    showToast(`${action.label}已提交 · 配置发布包状态已更新`);
  }

  function submitRiskCaseAction() {
    return openUnifiedTasks("risk_review");
  }

  function targetLabel(item,action) {
    if (action === "split") return item.splitCandidate || item.id;
    return item.id;
  }

  function submitReportSuggestion() {
    const data = reportDimension();
    if (!state.reportSuggestion || !data) return showToast("报表维度不存在");
    const reason = document.querySelector("#report-suggestion-reason")?.value.trim();
    if (!reason) return showToast("建议依据必填");
    const {item} = data;
    const suggestion = {
      id:`suggest-${Date.now().toString(36)}`,dimensionId:item.id,dimension:item.label,
      recommendation:item.recommendation,reason,creator:roleOwnerNames[state.role],createdAt:createDate(0)
    };
    prototype.reportSuggestions.push(suggestion);
    prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"生成报表建议",object:`${item.label} / ${recommendationLabel(item.recommendation)}`,operator:roleOwnerNames[state.role],result:"pending_review",trace_id:`trace-${item.id}`,self_review:false});
    state.reportSuggestion = null;
    showToast("报表建议已生成 · 等待人工复核");
  }

  function createReportExport() {
    const packet = reportPacket();
    if (!packet) return showToast("当前页签没有报表包");
    const task=createMaskedListExport(filteredRows(),"当前筛选列表摘要");
    return showToast(`导出已创建 · ${task.id} · ${demoSkipsApproval() ? "可直接下载" : "审批通过后可下载"}`);
  }

  const partnerReviewActions = {
    approve:{label:"审核通过",roles:["operations","compliance","risk_supervisor"],nextStage:"onboarded",result:"active"},
    reject:{label:"驳回",roles:["operations","compliance","risk_supervisor"],nextStage:"archived",result:"rejected"},
    supplement:{label:"要求补件",roles:["operations","compliance","risk_supervisor"],nextStage:"reviewing",result:"supplementing"}
  };

  function partnerReviewLabel(actionId) {
    return demoSkipsApproval() && actionId === "approve" ? "确认入驻" : partnerReviewActions[actionId]?.label || actionId;
  }

  function partnerReviewModal() {
    if (!state.partnerReview) return "";
    const partner = prototype.partner360.partners.find(item => item.id === state.partnerReview.target);
    const action = partnerReviewActions[state.partnerReview.action];
    if (!partner || !action) return "";
    const selfReview = !demoSkipsApproval() && partner.onboard?.autoReviewEligible && action.roles.includes(state.role);
    return `<div class="tm-overlay" data-close-partner-review="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>${h(partnerReviewLabel(state.partnerReview.action))}</strong><span>${h(partner.name)} · ${h(partner.id)} · 当前阶段 ${h(prototype.partner360.stages.find(stage => stage.id === partner.stage)?.label)}</span></div><button data-close-partner-review="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>影响预览</h3><div class="dev-impact-grid"><article><span>目标阶段</span><strong>${h(prototype.partner360.stages.find(stage => stage.id === action.nextStage)?.label)}</strong></article><article><span>申请材料</span><strong>${partner.onboard?.materials.length || 0}项</strong></article><article><span>KYC/KYB</span><strong>KYC ${h(prototype.partner360.kycStatusLabels[partner.kyc.status])} · KYB ${h(prototype.partner360.kycStatusLabels[partner.kyb.status])}</strong></article><article><span>审计</span><strong>提交后写入全局审计</strong></article></div></section>
        <section><h3>原因（必填）</h3><textarea id="partner-review-reason" placeholder="${state.partnerReview.action === "approve" ? "例如：材料齐全且CRM资料一致" : state.partnerReview.action === "reject" ? "例如：KYB企业注册号无法核实" : "例如：地址证明缺失，限48小时补件"}"></textarea></section>
        ${selfReview ? `<section><h3>自动审核</h3><label class="dev-check"><input type="checkbox" id="partner-self-review">申请人具备审批权限时使用自动审核</label><p class="dev-help">自审将在同一事务生成提交与审批两条审计，并标记 self_review=true。</p></section>` : ""}
      </div>
      <footer><button class="tm-button secondary" data-close-partner-review="1">取消</button><button class="tm-button primary" data-submit-partner-review="1">${state.partnerReview.action === "approve" && demoSkipsApproval() ? "确认入驻" : `确认${h(action.label)}`}</button></footer>
    </section>`;
  }

  function submitPartnerReview() {
    const info = state.partnerReview;
    const partner = prototype.partner360.partners.find(item => item.id === info.target);
    const action = partnerReviewActions[info.action];
    if (!partner || !action) return showToast("审核对象不存在");
    if (!action.roles.includes(state.role)) return showToast("当前角色无权执行入驻审核");
    const reason = document.querySelector("#partner-review-reason")?.value.trim();
    if (!reason) return showToast("审核原因必填");
    const selfReview = !demoSkipsApproval() && Boolean(document.querySelector("#partner-self-review")?.checked);
    partner.stage = action.nextStage;
    partner.status = action.result;
    partner.updated = createDate(0);
    if (info.action === "approve") partner.performance = {clicks:0,validFtd:0,commission:0,qualityGrade:"-",roi:"-"};
    const actionLabel = partnerReviewLabel(info.action);
    prototype.partner360.noteTemplates.unshift({id:`note-${Date.now().toString(36)}`,partnerId:partner.id,time:createDate(0),author:roleOwnerNames[state.role],type:"沟通",content:`${demoSkipsApproval() ? "入驻处理" : "入驻审核"}${actionLabel}：${reason}`,nextFollowUp:"-"});
    prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:`${demoSkipsApproval() ? "入驻处理" : "入驻审核"}${actionLabel}`,object:`${partner.name} / ${partner.id}`,operator:roleOwnerNames[state.role],result:action.result,trace_id:`trace-${partner.id}`,self_review:selfReview,approval_required:!demoSkipsApproval()});
    state.partnerReview = null;
    dataStore["admin-modules:partner-list"] = null;
    showToast(`${actionLabel}已${demoSkipsApproval() ? "执行" : "提交"} · 生命周期已更新 · 审计已记录${selfReview ? " · self_review=true" : ""}`);
  }

  function partnerOffboardModal() {
    if (!state.partnerOffboard) return "";
    const partner = prototype.partner360.partners.find(item => item.id === state.partnerOffboard.target);
    if (!partner) return "";
    const reasons = ["协商终止","违规终止","主体迁移"];
    return `<div class="tm-overlay" data-close-partner-offboard="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>发起清退</strong><span>${h(partner.name)} · ${h(partner.id)} · 当前阶段 ${h(prototype.partner360.stages.find(stage => stage.id === partner.stage)?.label)}</span></div><button data-close-partner-offboard="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>影响预览</h3><div class="dev-impact-grid"><article><span>累计佣金</span><strong>${money(partner.amount)}</strong></article><article><span>目标阶段</span><strong>清退中（六步时间线）</strong></article><article><span>保证金</span><strong>保留期30自然日</strong></article><article><span>链接</span><strong>全部下线（404兜底）</strong></article></div></section>
        <section><h3>清退参数</h3><div class="dev-action-fields">
          <label><span>清退原因</span><select data-offboard-field="reason">${reasons.map(value => `<option value="${h(value)}">${h(value)}</option>`).join("")}</select></label>
          <label><span>预计保留保证金</span><input type="text" data-offboard-field="guarantee" value="${Math.round(partner.amount * 0.12 / 100) * 100}"></label>
        </div></section>
        <section><h3>原因（必填）</h3><textarea id="partner-offboard-reason" placeholder="例如：合作绩效持续不达标，业务决定终止"></textarea></section>
      </div>
      <footer><button class="tm-button secondary" data-close-partner-offboard="1">取消</button><button class="tm-button primary" data-submit-partner-offboard="1">确认发起清退</button></footer>
    </section>`;
  }

  function submitPartnerOffboard() {
    const info = state.partnerOffboard;
    const partner = prototype.partner360.partners.find(item => item.id === info.target);
    if (!partner) return showToast("清退对象不存在");
    if (!["operations","compliance","risk_supervisor"].includes(state.role)) return showToast("当前角色无权发起清退");
    const reason = document.querySelector("#partner-offboard-reason")?.value.trim();
    if (!reason) return showToast("清退原因必填");
    const fields = Object.fromEntries([...document.querySelectorAll("[data-offboard-field]")].map(input => [input.dataset.offboardField,input.value]));
    partner.stage = "offboarding";
    partner.status = "processing";
    partner.updated = createDate(0);
    partner.offboard = {
      reason:fields.reason || "协商终止",initiatedBy:roleOwnerNames[state.role],initiatedAt:createDate(0),currentStep:1,
      guaranteeHeld:Number(fields.guarantee) || 0,
      timeline:[
        {step:1,label:"发起清退",time:createDate(0),state:"done",actor:roleOwnerNames[state.role],note:reason},
        {step:2,label:"推广链接下线",time:"",state:"pending",actor:"系统/Tech",note:"链接停止投放；点击保留404兜底"},
        {step:3,label:"最终结算生成",time:"",state:"pending",actor:"财务/Finance",note:"锁定结算批次；结算中余额转入清退单"},
        {step:4,label:"保证金审批",time:"",state:"pending",actor:"财务/Finance",note:"保留保证金待审批（跳转资金组处理）"},
        {step:5,label:"资料归档",time:"",state:"pending",actor:"系统/Tech",note:"CRM资料转归档区；保留期365天"},
        {step:6,label:"清退完成",time:"",state:"pending",actor:"系统/Tech",note:"状态置为已归档"}
      ]
    };
    prototype.partner360.noteTemplates.unshift({id:`note-${Date.now().toString(36)}`,partnerId:partner.id,time:createDate(0),author:roleOwnerNames[state.role],type:"沟通",content:`发起清退（${partner.offboard.reason}）：${reason}`,nextFollowUp:"-"});
    prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"发起合作方清退",object:`${partner.name} / ${partner.id}`,operator:roleOwnerNames[state.role],result:"offboarding",trace_id:`trace-${partner.id}`,self_review:false});
    state.partnerOffboard = null;
    dataStore["admin-modules:partner-list"] = null;
    showToast("清退已发起 · 六步时间线已生成 · 保证金审批待资金组处理");
  }

  function addPartnerNote() {
    const target = state.partnerNoteTarget;
    const partner = prototype.partner360.partners.find(item => item.id === target);
    if (!partner) return showToast("合作方不存在");
    const content = document.querySelector("#partner-note-content")?.value.trim();
    const followUp = document.querySelector("#partner-note-follow")?.value.trim() || "-";
    if (!content) return showToast("备注内容必填");
    prototype.partner360.noteTemplates.unshift({id:`note-${Date.now().toString(36)}`,partnerId:partner.id,time:createDate(0),author:roleOwnerNames[state.role],type:"沟通",content,nextFollowUp:followUp});
    prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"新增合作方备注",object:`${partner.name} / ${partner.id}`,operator:roleOwnerNames[state.role],result:"success",trace_id:`trace-${partner.id}`,self_review:false});
    state.partnerNoteTarget = null;
    showToast("备注已记录 · 时间线已更新");
  }

  function partnerNoteModal() {
    if (!state.partnerNoteTarget) return "";
    const partner = prototype.partner360.partners.find(item => item.id === state.partnerNoteTarget);
    if (!partner) return "";
    return `<div class="tm-overlay" data-close-partner-note="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>新增跟进备注</strong><span>${h(partner.name)} · ${h(partner.id)}</span></div><button data-close-partner-note="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>备注内容（必填）</h3><textarea id="partner-note-content" placeholder="记录沟通结论、风险提示或下一步安排"></textarea></section>
        <section><h3>下次跟进</h3><input type="text" id="partner-note-follow" placeholder="例如 2026-11-20" style="width:100%;height:34px;border:1px solid var(--border);border-radius:9px;background:#FFFDF9;padding:0 10px;font-size:12px;"></section>
      </div>
      <footer><button class="tm-button secondary" data-close-partner-note="1">取消</button><button class="tm-button primary" data-submit-partner-note="1">确认记录</button></footer>
    </section>`;
  }

  function paramDraftModal() {
    if (!state.paramDraft) return "";
    const param = prototype.configSeeds.dictionary.find(d => d.id === state.paramDraft);
    if (!param) return "";
    return `<div class="tm-overlay" data-close-param-draft="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>登记参考值：${h(param.name)}</strong><span>当前状态：待确认 · 参考范围 ${h(param.range)}</span></div><button data-close-param-draft="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>参考值来源</h3><div class="dev-check-list"><span>参考范围来自参数清单v0.3</span><span>登记后状态转「待审批」，经风控/财务评审确认</span><span>未经确认不进入生效配置</span></div></section>
        <section><h3>建议值与依据</h3><textarea id="param-draft-note" placeholder="例如：建议取D+21（集群案件平均调查周期18天+缓冲3天），依据风控方案v1.2"></textarea></section>
      </div>
      <footer><button class="tm-button secondary" data-close-param-draft="1">取消</button><button class="tm-button primary" data-submit-param-draft="1">提交待审批</button></footer>
    </section>`;
  }

  function materialReviewModal() {
    if (!state.materialReviewTarget) return "";
    const mat = prototype.materialCatalog.items.find(item => item.id === state.materialReviewTarget);
    if (!mat) return "";
    return `<div class="tm-overlay" data-close-mat-review="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>素材审核：${h(mat.name)}</strong><span>${h(prototype.materialCatalog.types[mat.type])} · ${h(mat.platform)} · ${h(mat.size)} · ${h(mat.format)}</span></div><button data-close-mat-review="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>规格校验</h3><div class="dev-check-list"><span>${mat.specCheck === "passed" ? "规格通过" : mat.specCheck === "warning" ? "规格警告" : "规格失败"}</span>${mat.specNote ? `<span>${h(mat.specNote)}</span>` : ""}<span>大小 ${mat.sizeKb} KB</span></div></section>
        ${mat.specCheck === "failed" ? `<p class="dev-block-reason">规格失败的素材建议驳回，先修正规格再重新上传。</p>` : ""}
        <section><h3>审核说明（选填）</h3><textarea id="mat-review-note" placeholder="例如：风险披露文案符合合规口径"></textarea></section>
      </div>
      <footer><button class="tm-button secondary" data-close-mat-review="1">取消</button><button class="tm-button secondary" data-submit-mat-review="reject">驳回</button><button class="tm-button primary" data-submit-mat-review="approve">通过并上架</button></footer>
    </section>`;
  }

  function clientRiskReviewModal() {
    if (!state.clientRiskReview) return "";
    const client = prototype.client360.clients.find(item => item.id === state.clientRiskReview);
    if (!client) return "";
    return `<div class="tm-overlay" data-close-client-review="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>生成风险复核任务</strong><span>${h(client.name)} · ${h(client.id)} · 当前R档 ${h(statusLabel(client.rGrade))}</span></div><button data-close-client-review="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>任务去向</h3><div class="dev-check-list"><span>处理中心 / 风险复核队列</span><span>携带对象：客户360风险页签全部证据（风险事件、关联特征、欺诈库引用）</span><span>处理人按角色分派：风控/Risk</span></div></section>
        <section><h3>复核要点（选填）</h3><textarea id="client-review-note" placeholder="例如：设备关联4客户需排查集群；或：入金出金间隔异常需人工确认"></textarea></section>
        <p class="dev-help">风险页签唯一出口。生成后任务进入处理中心，此处不改档、不加黑名单。</p>
      </div>
      <footer><button class="tm-button secondary" data-close-client-review="1">取消</button><button class="tm-button primary" data-submit-client-review="1">生成复核任务</button></footer>
    </section>`;
  }

  function submitClientRiskReview() {
    const client = prototype.client360.clients.find(item => item.id === state.clientRiskReview);
    if (!client) return showToast("客户不存在");
    if (!["risk","risk_supervisor","operations","compliance"].includes(state.role)) {
      state.clientRiskReview = null;
      return showToast("当前角色无权生成风险复核");
    }
    const note = document.querySelector("#client-review-note")?.value.trim();
    const taskId = `task-rr-${Date.now().toString().slice(-5)}`;
    prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"生成客户风险复核",object:`${client.name} / ${client.id}`,operator:roleOwnerNames[state.role],result:"pending",trace_id:prototype.attribution360.links.find(l=>l.client===client.id)?.traceId || `trace-${client.id}`,self_review:false});
    state.clientRiskReview = null;
    return showToast(`风险复核任务已生成（${taskId}${note?" · 附复核要点":""}）→ 处理中心/风险复核`);
  }

  const governanceActions = {
    authorize_field:{label:"批准字段授权",roles:["compliance","system_admin"],reason:true},
    revoke_field:{label:"拒绝或撤销字段授权",roles:["compliance","system_admin"],reason:true},
    approve_export:{label:"审批导出",roles:["compliance","system_admin"],reason:true},
    expire_export:{label:"提前过期导出文件",roles:["system_admin"],reason:true},
    approve_deletion:{label:"批准删除或匿名化",roles:["compliance","system_admin"],reason:true},
    cancel_deletion:{label:"取消删除任务",roles:["compliance","system_admin"],reason:true},
    notify_breach:{label:"记录Breach通知",roles:["compliance","system_admin"],reason:true}
  };

  function governanceActionLabel(actionId) {
    const demoLabels = {authorize_field:"设置字段授权",approve_export:"生成导出文件",approve_deletion:"执行删除或匿名化"};
    return (demoSkipsApproval() && demoLabels[actionId]) || governanceActions[actionId]?.label || actionId;
  }

  function governanceTarget(action,targetId) {
    if (action === "approve_export" || action === "expire_export") {
      const task = prototype.exportTasks.find(item=>item.id===targetId);
      return task ? {type:"export",item:task} : null;
    }
    if (action === "authorize_field" || action === "revoke_field") {
      const request = prototype.dataGovernance.fieldAccessRequests.find(item=>item.id===targetId);
      return request ? {type:"field",item:request} : null;
    }
    if (action === "approve_deletion" || action === "cancel_deletion") {
      const task = prototype.dataGovernance.deletionTasks.find(item=>item.id===targetId);
      return task ? {type:"deletion",item:task} : null;
    }
    if (action === "notify_breach") {
      const incident = prototype.dataGovernance.breachIncidents.find(item=>item.id===targetId);
      return incident ? {type:"breach",item:incident} : null;
    }
    return null;
  }

  function governanceModal() {
    if (!state.governanceModal) return "";
    const action = governanceActions[state.governanceModal.action];
    const target = governanceTarget(state.governanceModal.action,state.governanceModal.target);
    if (!action || !target) return "";
    const currentUser = prototype.taskQueue?.options?.(state.role)?.current_user || {user_id:state.role,display_name:roleOwnerNames[state.role] || state.role};
    const applicant = target.item.applicant || (target.type === "export" ? {user_id:target.item.applicantId || null,display_name:target.item.createdBy || "系统"} : null);
    const selfReviewEligible = !demoSkipsApproval() && Boolean(applicant?.user_id && applicant.user_id === currentUser.user_id);
    return `<div class="tm-overlay" data-close-governance-modal="1"></div><section class="dev-modal" role="dialog" aria-modal="true">
      <header><div><strong>${h(governanceActionLabel(state.governanceModal.action))}</strong><span>${h(target.item.name || target.item.field || target.item.dataType || target.item.id)}</span></div><button data-close-governance-modal="1" aria-label="关闭">×</button></header>
      <div>
        <section><h3>治理边界</h3><div class="dev-check-list"><span>只更新当前工作区状态，不删除业务数据。</span><span>敏感字段默认脱敏。</span><span>受限字段不进入普通导出。</span><span>动作、原因、对象和TraceId写入全局审计。</span></div></section>
        ${applicant ? `<section><h3>申请身份</h3><div class="dev-impact-grid"><article><span>申请人</span><strong>${h(applicant.display_name || "系统")}</strong></article><article><span>申请人编号</span><strong>${h(applicant.user_id || "待核验")}</strong></article><article><span>当前操作人</span><strong>${h(currentUser.display_name || state.role)}</strong></article>${demoSkipsApproval() ? "" : `<article><span>自审</span><strong>${selfReviewEligible ? "当前操作人即申请人" : "非申请人"}</strong></article>`}</div></section>` : ""}
        <section><h3>原因</h3><textarea id="governance-reason" placeholder="请输入数据治理原因"></textarea></section>
        ${selfReviewEligible ? `<section><h3>自动审核</h3><label class="dev-check"><input type="checkbox" id="governance-self-review">申请人具备审批权限，使用自动审核</label><p class="dev-help">勾选后会在同一事务内写入提交与审批两条审计，并标记 self_review=true。</p></section>` : ""}
      </div>
      <footer><button class="tm-button secondary" data-close-governance-modal="1">取消</button><button class="tm-button primary" data-submit-governance="1">确认${h(governanceActionLabel(state.governanceModal.action))}</button></footer>
    </section>`;
  }

  function submitGovernanceAction() {
    const info = state.governanceModal;
    const action = governanceActions[info.action];
    const target = governanceTarget(info.action,info.target);
    if (!action || !target) return showToast("治理对象不存在");
    const demoOwnExport = demoSkipsApproval() && info.action === "approve_export" && target.item.applicant?.user_id === prototype.taskQueue?.options?.(state.role)?.current_user?.user_id;
    if (!action.roles.includes(state.role) && !demoOwnExport) return showToast("当前角色无权执行数据治理动作");
    const reason = document.querySelector("#governance-reason")?.value.trim();
    if (!reason) return showToast("数据治理原因必填");
    const currentUser = prototype.taskQueue?.options?.(state.role)?.current_user || {user_id:state.role,display_name:roleOwnerNames[state.role] || state.role};
    const applicant = target.item.applicant || (target.type === "export" ? {user_id:target.item.applicantId || null,display_name:target.item.createdBy || "系统"} : null);
    const skipApproval = demoSkipsApproval();
    const selfReview = !skipApproval && Boolean(document.querySelector("#governance-self-review")?.checked);
    if (!skipApproval && applicant?.user_id && applicant.user_id === currentUser.user_id && !selfReview) return showToast("申请人审批本人事项必须明确勾选自动审核");
    if (selfReview && (!applicant?.user_id || applicant.user_id !== currentUser.user_id)) return showToast("自动审核仅适用于申请人本人且当前角色具备审批权限");
    let result = "approved";
    if (info.action === "revoke_field") {target.item.status = "rejected";target.item.expiresAt = "-";result = "rejected";}
    else if (info.action === "authorize_field") {target.item.status = "approved";target.item.expiresAt = createDate(-1);result = "approved";}
    else if (info.action === "approve_export") {
      target.item.approvalStatus = skipApproval ? "not_required" : "approved";
      target.item.status = "ready";
      let riskExport = null;
      if (target.item.riskExportId) {
        riskExport = (prototype.riskWorkbenchExports || []).find(item => item.export_id === target.item.riskExportId);
        if (riskExport) {
          riskExport.approval_status=skipApproval ? "not_required" : "approved";
          riskExport.status="ready";
          const preparedAt = skipApproval ? new Date(window.AFF_ADMIN_CLOCK.now()).toISOString() : prototype.riskWorkbench?.serverNow || createDate(0);
          if (skipApproval) riskExport.generated_at=preparedAt;
          else riskExport.approved_at=preparedAt;
          riskExport.expires_at = new Date(Date.parse(preparedAt) + 24 * 60 * 60 * 1000).toISOString();
          if (!skipApproval) riskExport.approver={...currentUser};
          riskExport.self_review=selfReview;
        }
      }
      if (!skipApproval) target.item.approver = {...currentUser};
      target.item.selfReview = selfReview;
      const approvedAt = (skipApproval ? riskExport?.generated_at : riskExport?.approved_at) || new Date(window.AFF_ADMIN_CLOCK.now()).toISOString();
      const approvedExpiry = new Date(Date.parse(approvedAt) + 24 * 60 * 60 * 1000).toISOString();
      target.item.expiresAt = approvedExpiry;
      const centerTask = target.item.riskExportId ? prototype.exportTasks.find(item => item.riskExportId === target.item.riskExportId) : null;
      if (centerTask) {
        centerTask.status = "ready";
        centerTask.approvalStatus = skipApproval ? "not_required" : "approved";
        if (!skipApproval) centerTask.approver = {...currentUser};
        centerTask.selfReview = selfReview;
        centerTask.expiresAt = approvedExpiry;
      }
      result = "ready";
    }
    else if (info.action === "expire_export") {target.item.status = "expired";target.item.approvalStatus = "approved";result = "expired";}
    else if (info.action === "approve_deletion") {target.item.status = "processing";result = "processing";}
    else if (info.action === "cancel_deletion") {target.item.status = "cancelled";result = "cancelled";}
    else if (info.action === "notify_breach") {
      target.item.status = "notified";
      target.item.timeline.push({time:createDate(0),action:"记录通知",actor:roleOwnerNames[state.role],result:"notified"});
      result = "notified";
    }
    const governanceObject = `${target.item.id || target.item.name} / ${reason}`;
    const governanceAudit = {
      self_review:selfReview,
      applicant:applicant?.user_id || null,
      approver:skipApproval ? null : currentUser.user_id,
      approval_required:!skipApproval,
      time:createDate(0)
    };
    if (selfReview) {
      integrationAudit("提交治理审批",governanceObject,"submitted",`trace-governance-${info.target}-submit`,governanceAudit);
      integrationAudit(action.label,governanceObject,result,`trace-governance-${info.target}-approve`,governanceAudit);
    } else {
      integrationAudit(governanceActionLabel(info.action),governanceObject,result,`trace-governance-${info.target}`,governanceAudit);
    }
    state.governanceModal = null;
    showToast(`${governanceActionLabel(info.action)}已${skipApproval ? "执行" : "提交"} · 审计已记录`);
  }

  function integrationAudit(action,object,result,traceId,extra={}) {
    prototype.auditRecords.unshift({
      id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action,
      object,operator:roleOwnerNames[state.role],result,trace_id:traceId,self_review:false
      ,...extra
    });
  }

  function runIntegrationRecheck(systemId) {
    if (state.role !== "system_admin") return showToast("仅系统管理员可执行集成健康检查");
    const systems = systemId ? prototype.integrationHealth.systems.filter(item=>item.id===systemId) : prototype.integrationHealth.systems;
    systems.forEach(system=>{
      if (system.status !== "healthy") {
        system.status = "recovering";
        system.successRate = Math.min(99.9,system.successRate + 1.2);
        system.backlog = Math.max(0,system.backlog - 6);
      }
      system.timeline.push({time:createDate(0),action:"重新执行健康检查",actor:roleOwnerNames[state.role],result:system.status});
    });
    integrationAudit("集成健康检查",systems.map(system=>system.name).join(" / "),"recovering",`trace-integration-${systemId || "all"}`);
    return showToast("集成健康检查已执行 · 异常系统进入恢复中");
  }

  function backfillIntegrationGap(gapId) {
    if (state.role !== "system_admin") return showToast("仅系统管理员可执行幂等补数");
    const gap = prototype.integrationHealth.eventGaps.find(item=>item.id===gapId);
    if (!gap) return showToast("事件缺口不存在");
    if (gap.status === "processing") return showToast("同一幂等键正在补数，不重复投递");
    gap.status = "processing";
    gap.retryCount += 1;
    const task = prototype.integrationHealth.tasks.find(item=>item.idempotencyKey===gap.idempotencyKey);
    if (task) {task.status = "retrying";task.retryCount += 1;}
    integrationAudit("事件幂等补数",`${gap.id} / ${gap.source} / ${gap.stage}`,"processing",`trace-${gap.idempotencyKey}`);
    return showToast("幂等补数已提交 · 重复请求不会重复计钱");
  }

  function retryIntegrationTask(taskId) {
    if (state.role !== "system_admin") return showToast("仅系统管理员可重试集成任务");
    const task = prototype.integrationHealth.tasks.find(item=>item.id===taskId);
    if (!task) return showToast("集成任务不存在");
    if (task.status === "cancelled") return showToast("已取消任务不可重试，请创建新任务");
    task.status = "retrying";
    task.retryCount += 1;
    integrationAudit("集成任务重试",`${task.id} / ${task.name}`,"retrying",`trace-${task.idempotencyKey}`);
    return showToast("集成任务已重试 · 审计已记录");
  }

  function cancelIntegrationTask(taskId) {
    if (state.role !== "system_admin") return showToast("仅系统管理员可取消集成任务");
    const task = prototype.integrationHealth.tasks.find(item=>item.id===taskId);
    if (!task || task.status === "cancelled") return showToast("任务不可取消");
    task.status = "cancelled";
    integrationAudit("集成任务取消",`${task.id} / ${task.name}`,"cancelled",`trace-${task.idempotencyKey}`);
    return showToast("集成任务已取消 · 审计已记录");
  }

  function toast() {
    if (!state.toast) return "";
    return `<div class="tm-toast show"><span>${h(state.toast)}</span>${state.toastAction?.kind === "exports" ? `<button class="tm-button secondary compact" data-open-report-export>查看导出记录</button>` : state.toastAction?.path ? `<button class="tm-button secondary compact" data-route="${h(state.toastAction.path)}">${h(state.toastAction.label || "查看")}</button>` : ""}</div>`;
  }

  function auditDrawer() {
    if (!state.auditOpen) return "";
    const keyword = state.auditKeyword.trim().toLowerCase();
    const records = prototype.auditRecords.filter(record =>
      !keyword || Object.values(record).join(" ").toLowerCase().includes(keyword));
    return `<div class="tm-overlay" data-close-audit="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="全局审计">
      <header><div><strong>全局审计</strong><span>配置、审批、资金、导出、集成和签核记录</span></div><button data-close-audit="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>检索</h3><input class="dev-audit-search" data-audit-keyword value="${h(state.auditKeyword)}" placeholder="搜索对象、操作人、动作、TraceId"></section>
        <section class="dev-drawer-section"><h3>审计记录</h3><div class="dev-audit-list">${records.length ? records.map(record =>
          `<div><span>${h(record.time)} · ${h(record.id)}</span><strong>${h(record.action)} · ${h(record.object)}</strong><small>${h(record.operator)} · ${h(record.trace_id)}${record.self_review ? " · self_review=true" : ""}</small></div>`).join("") : "<p>暂无匹配审计记录</p>"}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-audit="1">关闭</button><button class="tm-button secondary" data-action-name="export">导出审计</button></footer>
    </aside>`;
  }

  function unreadNotificationCount() {
    return prototype.notifications.filter(item => item.unread).length;
  }

  function notificationDrawer() {
    if (!state.notificationOpen) return "";
    const outbox = prototype.notificationOutbox || [];
    const failedOutbox = outbox.filter(item => item.status === "failed");
    return `<div class="tm-overlay" data-close-notifications="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="全局通知">
      <header><div><strong>全局通知</strong><span>审批超时、集成失败、风险告警、导出和签核提醒</span></div><button data-close-notifications="1" aria-label="关闭">×</button></header>
      <div><section class="dev-drawer-section"><h3>通知列表</h3><div class="dev-notification-list">${prototype.notifications.map(item => {
        const deliveries = outbox.filter(entry => entry.notificationId === item.id);
        const deliverySummary = deliveries.length ? deliveries.map(entry => `${entry.channel === "in_app" ? "站内" : "邮件"} ${entry.status === "sent" ? "成功" : entry.status === "failed" ? "失败" : "处理中"}`).join(" · ") : "无需投递";
        const retryable = deliveries.some(entry => entry.status === "failed");
        return `<article class="${item.unread ? "unread" : ""} ${item.severity}"><div><span>${h(item.time)} · ${h(item.type)}</span><strong>${h(item.title)}</strong><small>${h(item.detail)}</small><small>投递：${h(deliverySummary)}</small></div><div><button class="tm-button secondary" data-notification-link="${h(item.id)}">查看</button><button class="tm-button secondary" data-mark-notification="${h(item.id)}">${item.unread ? "标为已读" : "已读"}</button>${retryable ? `<button class="tm-button secondary" data-notification-retry="${h(item.id)}">重试投递</button>` : ""}</div></article>`;
      }).join("")}</div></section>${state.notificationMonitorOpen ? `<section class="dev-drawer-section"><h3>投递监控</h3><div class="dev-notification-list">${outbox.map(entry => `<article class="${entry.status === "failed" ? "danger" : ""}"><div><span>${h(entry.id)} · ${h(entry.channel === "in_app" ? "站内通知" : "邮件")}</span><strong>${h(entry.eventKey)}</strong><small>状态：${h(entry.status === "sent" ? "成功" : entry.status === "failed" ? "失败" : "处理中")} · 尝试 ${h(entry.attempts)} 次 · ${h(entry.lastAttemptAt || "—")}</small>${entry.error ? `<small>错误：${h(entry.error)}</small>` : ""}</div></article>`).join("")}</div></section>` : ""}</div>
      <footer><button class="tm-button secondary" data-close-notifications="1">关闭</button><button class="tm-button secondary" data-notification-monitor>${state.notificationMonitorOpen ? "收起投递监控" : `投递监控${failedOutbox.length ? `（${failedOutbox.length}）` : ""}`}</button><button class="tm-button primary" data-action="mark-all-notifications">全部标为已读</button></footer>
    </aside>`;
  }

  function permissionDrawer() {
    if (!state.permissionOpen) return "";
    const actions = routeActions[state.routeId].map(id => actionCatalog[id]);
    const allowed = actions.filter(action => action.roles.includes(state.role));
    const forbidden = actions.filter(action => !action.roles.includes(state.role));
    return `<div class="tm-overlay" data-close-permissions="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="权限可见性">
      <header><div><strong>权限可见性</strong><span>${h(prototype.roles[state.role])} · ${h(route().title)} · ${h(tab().title)}</span></div><button data-close-permissions="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>搜索可见范围</h3><div class="dev-chip-row static">${allowedSearchTypes().map(type=>`<span class="dev-chip active">${h(type)}</span>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>数据范围</h3><p class="dev-permission-scope">${h(prototype.permissionPolicy.dataScopes[state.role])}</p></section>
        <section class="dev-drawer-section"><h3>可执行动作</h3><div class="dev-chip-row static">${allowed.length ? allowed.map(action => `<span class="dev-chip active">${h(action.label)}</span>`).join("") : "<span class='dev-chip'>无写操作</span>"}</div></section>
        <section class="dev-drawer-section"><h3>不可执行动作</h3><div class="dev-chip-row static">${forbidden.length ? forbidden.map(action => `<span class="dev-chip forbidden">${h(action.label)}</span>`).join("") : "<span class='dev-chip'>无限制</span>"}</div></section>
        <section class="dev-drawer-section"><h3>字段边界</h3><div class="dev-check-list"><span>脱敏字段：${h(prototype.permissionPolicy.maskedFields.join("、"))}</span><span>始终隐藏：${h(prototype.permissionPolicy.alwaysHiddenFields.join("、"))}</span><span>导出：异步、脱敏、审计、24小时过期</span></div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-permissions="1">关闭</button></footer>
    </aside>`;
  }

  function openTabsBar() {
    return `<nav class="dev-open-tabs" aria-label="已打开页面">${state.openTabs.map(item =>
      `<span class="${item.id === `${state.routeId}:${state.tabId}` ? "active" : ""}"><button data-open-tab="${h(item.routeId)}" data-open-tab-id="${h(item.tabId)}">${h(item.routeTitle === item.tabTitle ? item.routeTitle : `${item.routeTitle} / ${item.tabTitle}`)}</button><button data-close-tab="${h(item.id)}" aria-label="关闭已打开页面">×</button></span>`).join("")}</nav>`;
  }

  const menuIconNames = {
    "nav-customer-service":"ticket",
    "nav-dashboard":"gauge","nav-partners":"users","nav-clients":"users","nav-attribution":"link",
    "nav-campaigns":"megaphone","nav-materials":"image","nav-postback":"send",
    "nav-commissions":"dollar","nav-withdrawals":"card","nav-funds-review":"wallet",
    "nav-risk":"alert","nav-risk-review":"shield","nav-tasks":"inbox","nav-task-approvals":"checklist","nav-appeals":"message",
    "nav-integrations":"plug","nav-performance":"chart","nav-quality":"pie",
    "nav-config":"settings","nav-access":"key",
    "dash-operation":"gauge","dash-tasks":"checklist","dash-risk":"alert","dash-funds":"wallet",
    "partner-list":"users","partner-onboarding":"user-check","partner-kyc":"shield-check","partner-credit":"award","partner-offboarding":"exit","partner-notes":"message",
    "client-list":"users","attribution-links":"link","event-stream":"list","client-risk":"alert","attribution-exception":"target",
    "campaign-list":"megaphone","link-list":"link","material-list":"image","sub-channel":"nodes","postback":"send","tracker":"crosshair",
    "commission-list":"dollar","hold-workbench":"clock","statement-list":"file","withdrawal-list":"card","guarantee-workbench":"shield","tax-list":"percent","reversal-list":"repeat","reconciliation":"scale",
    "hard-hit":"zap","risk-event":"alert","cluster-case":"network","violation-event":"ban","crm-fraud":"database","blacklist":"ban","country-compliance":"globe","quality-internal":"check-circle",
    "task-all":"inbox","risk-review":"shield","credit-adjust":"trending","cluster-hold":"timer","d-plus-n":"snowflake","appeal":"message","guarantee-offset":"wallet","cap-breaker":"gauge","integration-task":"plug","support-ticket":"ticket",
    "report-roi":"chart","report-quality":"pie","report-guarantee":"shield","report-funnel":"filter","report-channel":"chart","report-finance":"ledger","report-risk":"alert",
    "config-overview":"settings","config-price":"tag","config-qualification":"milestone","config-credit":"award","config-hold":"clock","config-guarantee-tax":"percent","config-approval":"check","config-simulation":"package","config-cluster":"network","config-hard-rule":"zap","config-risk-score":"sliders","config-violation":"ban","config-dictionary":"book","config-permission":"lock",
    "audit-operation":"search","audit-self-review":"repeat","export-center":"download","field-auth":"key","deletion":"trash","breach":"alert","retention":"archive"
  };
  const hiddenSidebarItemIds = new Set(["nav-campaigns","nav-risk-review","nav-integrations","nav-quality"]);
  const menuIcons = {
    gauge:'<path d="M8 13.5A5.5 5.5 0 1 0 8 2.5a5.5 5.5 0 0 0 0 11Z"></path><path d="M8 8l2.8-2.2"></path>',
    checklist:'<path d="M5 2.5h6v11H5z"></path><path d="M6.4 6h3.2M6.4 8.5h3.2M6.4 11h2"></path>',
    alert:'<path d="M8 2.5 14 13H2Z"></path><path d="M8 6.5v3M8 11.2v.3"></path>',
    wallet:'<path d="M3 5.5h10v8H3z"></path><path d="M3 8h10M11 10.5h1"></path>',
    users:'<circle cx="6" cy="5.8" r="2"></circle><path d="M2.8 13c.5-2 1.7-3 3.2-3s2.7 1 3.2 3"></path><path d="M10.2 4.2a2 2 0 0 1 0 3.6M11 10.2c1.1.4 1.8 1.3 2.2 2.8"></path>',
    "user-check":'<circle cx="6.5" cy="5.8" r="2"></circle><path d="M3 13c.4-2 1.6-3 3.5-3 1.2 0 2.2.4 2.8 1.2"></path><path d="M10 10.8l1.2 1.2 2-2.4"></path>',
    "shield-check":'<path d="M8 2l5 1.6v3.7c0 3-2 5-5 6.2-3-1.2-5-3.2-5-6.2V3.6L8 2Z"></path><path d="M5.8 8l1.6 1.6 2.8-3"></path>',
    exit:'<path d="M6 3H3v10h3"></path><path d="M7 8h6M11 5.8 13.2 8 11 10.2"></path>',
    message:'<path d="M3 4h10v7H6l-3 3V4Z"></path><path d="M6 6.5h4M6 8.5h3"></path>',
    link:'<path d="M6.5 9.5 9.5 6.5"></path><path d="M5 11a2.5 2.5 0 0 1 0-5l1-1M11 5a2.5 2.5 0 0 1 0 5l-1 1"></path>',
    list:'<path d="M4 4h8M4 7h8M4 10h5"></path><path d="M4 12.5h2"></path>',
    target:'<circle cx="8" cy="8" r="5"></circle><circle cx="8" cy="8" r="2"></circle>',
    megaphone:'<path d="M3 7h2l6-3v8L5 9H3z"></path><path d="M5 9v3"></path><path d="M11.5 6.5c1 .7 1 2.3 0 3"></path>',
    image:'<rect x="3" y="4" width="10" height="8" rx="1"></rect><path d="M3.5 10.5 6.5 8l2 2 1.5-1.3 2.5 2.3"></path><circle cx="6" cy="6.3" r=".7"></circle>',
    nodes:'<circle cx="4" cy="4" r="1.6"></circle><circle cx="12" cy="4" r="1.6"></circle><circle cx="8" cy="12" r="1.6"></circle><path d="M5.3 4.8 6.9 11M10.7 4.8 9.1 11"></path>',
    send:'<path d="M3 8 13 4l-4 9-1.6-3.6L3 8Z"></path>',
    crosshair:'<circle cx="8" cy="8" r="4.5"></circle><path d="M8 2v2M8 12v2M2 8h2M12 8h2"></path>',
    dollar:'<path d="M8 2.5v11"></path><path d="M10.5 5.5c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.4.7-2.4 1.7 0 1.2 1.2 1.6 2.6 2 1.6.4 2.6.9 2.6 2.1 0 1.1-1.1 1.9-2.8 1.9-1.3 0-2.3-.5-2.8-1.3"></path>',
    clock:'<circle cx="8" cy="8" r="5.5"></circle><path d="M8 5v3.2l2.2 1.4"></path>',
    file:'<path d="M5 3h4l3 3v7H5z"></path><path d="M7 8h3M7 10.5h2"></path>',
    card:'<rect x="2.8" y="4" width="10.4" height="8" rx="1"></rect><path d="M2.8 7h10.4M5 10h2"></path>',
    percent:'<path d="M12 4 4 12"></path><circle cx="5" cy="5" r="1.5"></circle><circle cx="11" cy="11" r="1.5"></circle>',
    repeat:'<path d="M5 5h6a2 2 0 0 1 2 2v1"></path><path d="M11 11H5a2 2 0 0 1-2-2V8"></path><path d="M7 3 5 5l2 2M9 9l2 2-2 2"></path>',
    scale:'<path d="M8 3v10M4 6h8"></path><path d="M4 6 2 10h4ZM12 6l-2 4h4Z"></path><path d="M5.5 13h5"></path>',
    zap:'<path d="M9 2 4 9h3l-1 5 5-7H8l1-5Z"></path>',
    network:'<circle cx="8" cy="3.5" r="1.5"></circle><circle cx="3.5" cy="11.5" r="1.5"></circle><circle cx="12.5" cy="11.5" r="1.5"></circle><path d="M8 5v2.5M4.8 10.4 6.8 7.4M11.2 10.4 9.2 7.4"></path>',
    ban:'<circle cx="8" cy="8" r="5.5"></circle><path d="M4.2 4.2l7.6 7.6"></path>',
    database:'<ellipse cx="8" cy="4.2" rx="4.5" ry="1.7"></ellipse><path d="M3.5 4.2v7.6c0 1 2 1.7 4.5 1.7s4.5-.7 4.5-1.7V4.2"></path><path d="M3.5 8c0 1 2 1.7 4.5 1.7S12.5 9 12.5 8"></path>',
    globe:'<circle cx="8" cy="8" r="5.5"></circle><path d="M2.8 8h10.4M8 2.5c1.8 2 1.8 9 0 11-1.8-2-1.8-9 0-11Z"></path>',
    "check-circle":'<circle cx="8" cy="8" r="5.5"></circle><path d="M5.7 8.2 7.3 9.8l3-3.4"></path>',
    inbox:'<path d="M3 9V5h10v4"></path><path d="M3 9h3l1 2h2l1-2h3v4H3z"></path>',
    shield:'<path d="M8 2l5 1.6v3.7c0 3-2 5-5 6.2-3-1.2-5-3.2-5-6.2V3.6L8 2Z"></path>',
    trending:'<path d="M3 11l4-4 2.2 2.2L13 5.5"></path><path d="M10 5.5h3v3"></path>',
    timer:'<circle cx="8" cy="9" r="4.5"></circle><path d="M8 6.8V9l1.6 1"></path><path d="M6.2 2.8h3.6"></path>',
    snowflake:'<path d="M8 2v12M3 5l10 6M13 5 3 11"></path><path d="M6.4 3.2 8 4.8l1.6-1.6M6.4 12.8 8 11.2l1.6 1.6"></path>',
    plug:'<path d="M6 2.8v3M10 2.8v3"></path><path d="M4.2 5.8h7.6v2.4a3.8 3.8 0 0 1-7.6 0V5.8ZM8 12v1.5"></path>',
    ticket:'<path d="M3 6.5h10v3H3z"></path><path d="M6 6.5v3M10 6.5v3M4.5 9.5v2.5h7V9.5"></path>',
    chart:'<path d="M3.5 12.5h9"></path><path d="M5 10V7M8 10V4M11 10V8"></path>',
    pie:'<path d="M8 3a5 5 0 1 0 5 5H8V3Z"></path><path d="M8 3v5h5"></path>',
    filter:'<path d="M3 4h10l-4 4.5V13l-2-1V8.5Z"></path>',
    ledger:'<path d="M4 3h8v10H4z"></path><path d="M6 5.5h4M6 8h4M6 10.5h2.5"></path>',
    settings:'<circle cx="8" cy="8" r="2.2"></circle><path d="M8 2.5v1.8M8 11.7v1.8M2.5 8h1.8M11.7 8h1.8M4.2 4.2l1.3 1.3M10.5 10.5l1.3 1.3M11.8 4.2l-1.3 1.3M5.5 10.5l-1.3 1.3"></path>',
    tag:'<path d="M8.5 3H13v4.5L8 12.5 3.5 8 8.5 3Z"></path><circle cx="10.5" cy="5.5" r=".8"></circle>',
    milestone:'<path d="M4 13V3"></path><path d="M4 4h8v3H4"></path><path d="M4 10h6v3H4"></path>',
    award:'<circle cx="8" cy="6" r="3.2"></circle><path d="M6 8.8 5 13l3-1.6L11 13l-1-4.2"></path>',
    check:'<path d="M3.5 8.5 6.5 11.5 12.5 5"></path>',
    package:'<path d="M8 2.5 13 5v6L8 13.5 3 11V5l5-2.5Z"></path><path d="M3 5l5 2.5L13 5M8 7.5v6"></path>',
    sliders:'<path d="M4 5h8M4 11h8"></path><circle cx="6.5" cy="5" r="1.5"></circle><circle cx="10" cy="11" r="1.5"></circle>',
    book:'<path d="M4 3h8v10H4z"></path><path d="M6.5 5.5h3M6.5 8h3"></path>',
    search:'<circle cx="7.3" cy="7.3" r="4"></circle><path d="M10.3 10.3 13 13"></path>',
    download:'<path d="M8 3v7"></path><path d="M5.5 7.5 8 10l2.5-2.5"></path><path d="M3.5 12.5h9"></path>',
    key:'<circle cx="6" cy="6" r="2.5"></circle><path d="M8 8l4 4M10 10l1.5-1.5"></path>',
    trash:'<path d="M4 5h8"></path><path d="M5.5 5V3.5h5V5"></path><path d="M5 5l.6 8h4.8L11 5"></path>',
    archive:'<path d="M3 4h10v2.5H3z"></path><path d="M4 6.5h8V13H4z"></path><path d="M6.5 9h3"></path>'
  };
  function menuIcon(id) {
    const icon = menuIcons[menuIconNames[id] || "check"];
    return `<span class="dev-menu-icon"><svg viewBox="0 0 16 16" aria-hidden="true">${icon}</svg></span>`;
  }

  function sidebarNavigation() {
    return prototype.menuBlueprint.map(group => {
      const visibleItems = (group.items || []).filter(item => !hiddenSidebarItemIds.has(item.id));
      const open = state.menuOpenGroups.has(group.id);
      const active = group.id === state.menuActiveGroupId;
      const ready = visibleItems.filter(item => item.stage === "MVP").length;
      if (group.id === "dashboard") {
        return `<section class="dev-menu-group dev-menu-group-direct ${active ? "active" : ""}">
          <button type="button" data-menu-group="${h(group.id)}" aria-expanded="false" title="打开仪表盘">
            <span>${h(group.title)}</span>
          </button>
        </section>`;
      }
      const renderItem = (item, level = 0) => {
        const itemActive = group.id === state.menuActiveGroupId &&
          ((item.routeId === state.routeId && item.tabId === state.tabId) ||
           (item.id === "nav-partners" && state.routeId === "partner-360") ||
           (item.id === "nav-clients" && state.routeId === "customer-360"));
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        return `<div class="dev-menu-node level-${level} ${itemActive ? "active" : ""} ${hasChildren ? "has-children" : ""}">
          <button type="button" class="${itemActive?"active":""} stage-${item.stage.toLowerCase()}" data-menu-item="${h(item.id)}" title="${h(item.summary)}">
            ${menuIcon(item.id)}<span>${h(item.label)}</span><i>${h(item.stage)}</i>
          </button>
          ${hasChildren ? `<div class="dev-menu-children">${item.children.map(child => renderItem(child,level+1)).join("")}</div>` : ""}
        </div>`;
      };
      return `<section class="dev-menu-group ${open?"open":""} ${active?"active":""}">
        <button type="button" data-menu-group="${h(group.id)}" aria-expanded="${open}">
          <span>${h(group.title)}</span><small>MVP ${ready}</small>
        </button>
        <div class="dev-menu-items">${visibleItems.map(item => renderItem(item)).join("")}</div>
      </section>`;
    }).join("");
  }

  function menuBlueprintItem(id) {
    for (const blueprint of [prototype.menuBlueprint, prototype.moduleBlueprint || []]) {
      for (const group of blueprint) {
        const item = menuGroupItems(group).find(entry => entry.id === id);
        if (item) return {group,item};
      }
    }
    return null;
  }

  function menuBlueprintDrawer() {
    const data = menuBlueprintItem(state.menuBlueprintId);
    if (!data) return "";
    const {group,item} = data;
    const stageTone = item.stage === "MVP" ? "success" : item.stage === "P1" ? "warning" : "info";
    return `<div class="tm-overlay" data-close-menu-blueprint="1"></div><aside class="tm-drawer dev-drawer-wide" aria-label="菜单蓝图说明">
      <header><div><strong>${h(item.label)}</strong><span>${h(group.title)} · ${h(item.stage)}</span></div><button data-close-menu-blueprint="1" aria-label="关闭">×</button></header>
      <div>
        <section class="dev-drawer-section"><h3>菜单定位</h3><p class="dev-permission-scope">${h(item.summary)}</p><div class="dev-menu-stage ${stageTone}">阶段：${h(item.stage)}${item.routeId ? " · 当前原型已接入页面" : item.action === "audit" ? " · 当前原型已接入全局审计" : " · 评审蓝图，待后续版本落地"}</div></section>
        <section class="dev-drawer-section"><h3>核心对象</h3><div class="dev-chip-row static">${item.objects.map(value => `<span class="dev-chip active">${h(value)}</span>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>核心动作</h3><div class="dev-chip-row static">${item.actions.map(value => `<span class="dev-chip">${h(value)}</span>`).join("")}</div></section>
        <section class="dev-drawer-section"><h3>依赖能力</h3><div class="dev-check-list">${item.dependency.map(value => `<span>${h(value)}</span>`).join("")}</div></section>
      </div>
      <footer><button class="tm-button secondary" data-close-menu-blueprint="1">关闭</button>${item.routeId ? `<button class="tm-button primary" data-menu-open="${h(item.id)}">打开当前页面</button>` : item.action === "audit" ? `<button class="tm-button primary" data-menu-open="${h(item.id)}">打开全局审计</button>` : ""}</footer>
    </aside>`;
  }

  function demoPanel() {
    if (state.routeId === "tickets") return "";
    const overlayActive = state.searchOpen || state.releaseId || state.configVersionId || state.configVersionModal || state.configActionModal || state.configOverviewItem || state.configOverviewVersionId || state.configScopedItem || state.systemConfigConfirm || state.systemConfigPublishConfirm || state.riskCaseId || state.reportDimensionId ||
      state.integrationSystemId || (state.detailId && state.routeId !== "partner-360") || state.auditOpen || state.notificationOpen || state.permissionOpen ||
      state.reportExportOpen || state.releaseModal || state.riskCaseModal || state.reportSuggestion || state.governanceModal || state.menuBlueprintId || state.modal ||
      state.partnerReview || state.partnerOffboard || state.partnerNoteTarget ||
      state.partner360ActionModal ||
      state.clientRiskReview || state.eventChainId || state.trackerSessionId || state.postbackTest || state.materialReviewTarget || state.paramDraft ||
      state.riskWorkbenchDrawer || state.riskWorkbenchModal || state.riskWorkbenchAction;
    if (overlayActive) return "";
    return `<div class="dev-demo-panel" aria-label="环境控制面板">
      <button type="button" data-toggle-demo>${state.demoOpen ? "收起环境" : "环境"}</button>
      ${state.demoOpen ? `<section>
        <strong>环境控制</strong>
        <label>数据状态<select data-scenario>${Object.entries(prototype.scenarios).map(([value,name]) => `<option value="${h(value)}" ${state.scenario===value?"selected":""}>${h(name)}</option>`).join("")}</select></label>
        <button class="tm-button secondary" type="button" data-action="refresh">刷新数据</button>
        <small>${h(prototype.dataSource.name)} · 更新于 ${h(prototype.dataSource.updatedAt)}</small>
      </section>` : ""}
    </div>`;
  }

  function topTabsForRoute(currentRoute) {
    if(taskObjectPageActive())return [];
    if (["admin-config","admin-system-config","tasks","workbench","tickets","partner-360"].includes(currentRoute.id)) return [];
    if (currentRoute.id === "risk-workbench" && state.legacyRiskRoute) return prototype.routes.find(route => route.id === "admin-risk")?.tabs || currentRoute.tabs;
    return currentRoute.tabs;
  }

  const riskLegacyTabMap = { "hard-hit":"events", "risk-event":"events", "credit-insight":"objects", cluster:"clusters", violation:"events", fraud:"blacklist" };

  function render() {
    if (state.routeId === "tickets") supportUI.ensureContext();
    document.body.classList.toggle("cs-active",state.routeId === "tickets");
    document.body.classList.toggle("risk-active",state.routeId === "risk-workbench");
    document.body.classList.toggle("system-config-active",state.routeId === "admin-system-config");
    if (!["tasks","workbench"].includes(state.routeId)) document.body.classList.remove("tq-has-overlay");
    const clockText = adminClockMarkup();
    const currentRoute = route(); const currentTab = tab(); const primaryId = state.routeId === "admin-modules" ? modulePrimaryAction() : primaryActions[state.routeId];
    const primaryAction = {roles:[],...actionCatalog[primaryId]};
    if (state.routeId === "admin-modules") primaryAction.label = moduleActionLabel(primaryId);
    const topTabs = topTabsForRoute(currentRoute);
    document.title = state.routeId === "admin-workbench" ? "仪表盘 · Affiliate Ops" : `${currentTab.title} · ${currentRoute.title}`;
    const modalMarkup = `${modal()}${releaseModal()}${configVersionModal()}${configActionModal()}${systemConfigConfirmModal()}${systemConfigPublishConfirmModal()}${riskCaseModal()}${reportSuggestionModal()}${governanceModal()}${partnerReviewModal()}${partnerOffboardModal()}${partnerNoteModal()}${clientRiskReviewModal()}${materialReviewModal()}${postbackTestModal()}${paramDraftModal()}`;
    const pageHead = ["admin-config","tasks","workbench","partner-360","customer-360"].includes(state.routeId) ? ""
      : state.routeId === "admin-workbench" ? `<div class="tm-page-head dash-v2-page-head"><div><h1>${state.detailId === "full" ? "完整任务列表" : "仪表盘"}</h1><p>${h(dashboardRoleNames[state.role] || "运营")}视角 · ${state.detailId === "full" ? "集中查看全部可见任务" : "先看业务状态，再处理待办和异常"}</p></div><div class="tm-head-actions">${state.detailId === "full"
        ? `<button class="tm-button secondary" data-dashboard-back="1">返回仪表盘</button>`
        : `<label class="dash-v2-range"><span>统计范围</span><select data-dashboard-range aria-label="统计范围">${Object.entries(dashboardRangeLabels).map(([value,label]) => `<option value="${h(value)}" ${state.dashboardRange===value?"selected":""}>${h(label)}</option>`).join("")}</select></label>`}</div></div>`
      : state.routeId === "risk-workbench" ? `<div class="tm-page-head"><div><h1>风险工作台</h1><p>风险专员视角 · 识别对象、补齐证据、提交处置并跟踪审批执行。</p></div><div class="tm-head-actions"><button class="tm-button secondary" data-risk-unified-tasks>统一任务</button><button class="tm-button secondary" data-risk-config>配置中心</button></div></div>`
      : `<div class="tm-page-head"><div><h1>${h(currentTab.title)}</h1><p>${h(currentTab.description)}</p></div><div class="tm-head-actions">${primaryAction.roles.includes(state.role) && !["export","refresh","save-view","columns"].includes(primaryId) ? `<button class="tm-button primary" data-action-name="${h(primaryId)}">${h(primaryAction.label)}</button>` : ""}</div></div>`;
    document.querySelector("#admin-app").innerHTML = `<aside class="tm-sidebar"><div class="tm-sidebar-brand"><strong>Affiliate Ops</strong><span>TradeMaster风格</span></div><section class="tm-workspace"><span>工作空间</span><strong>Affiliate 运营</strong><small>${h(prototype.dataSource.name)}</small></section><nav aria-label="主导航">${sidebarNavigation()}</nav><footer><small>${h(prototype.version)}</small></footer></aside>
    <main class="tm-main"><header class="tm-topbar"><div class="tm-topbar-title"><button class="tm-nav-button" data-nav aria-label="打开导航">≡</button><nav class="tm-breadcrumb" aria-label="面包屑"><span>Affiliate Ops</span><i>/</i><span>${h(currentRoute.group)}</span><i>/</i><strong>${h(currentRoute.title === currentTab.title ? currentRoute.title : `${currentRoute.title} · ${currentTab.title}`)}</strong></nav></div>
      <div class="tm-topbar-tools"><button class="tm-icon-button" data-open-search="1" title="全局搜索 Ctrl/Cmd+K" aria-label="全局搜索">${topbarIcon("search")}</button><span class="tm-clock" title="本地原型时钟；业务快照日期在页面内单独显示">${clockText}</span>${roleSwitcher()}</div></header>
    ${openTabsBar()}
    ${currentRoute.kind === "module" || !topTabs.length ? "" : `<nav class="tm-tabs" aria-label="页签">${topTabs.map(item => { const mapped = currentRoute.id === "risk-workbench" ? (riskLegacyTabMap[item.id] || item.id) : item.id; const active = mapped === state.tabId; return `<button class="${active?"active":""}" data-tab="${h(item.id)}" aria-selected="${active}">${h(item.title)}</button>`; }).join("")}</nav>`}
    <section class="tm-content">${pageHead}${stateBlock()}${pageMain()}</section><footer class="dev-footer">Affiliate Ops · ${h(prototype.dataSource.name)} · 更新于 ${h(prototype.dataSource.updatedAt)}</footer></main>${configVersionMenuPortal()}${demoPanel()}${menuBlueprintDrawer()}${searchDrawer()}${state.eventChainId ? eventChainDrawerBody() : state.trackerSessionId ? trackerPathDrawer() : state.configOverviewVersionId ? configOverviewVersionDrawer() : state.configOverviewItem ? configItemDrawer() : state.configScopedItem ? configScopedVersionDrawer() : state.configVersionId ? configVersionDrawer() : state.releaseId ? releaseDrawer() : state.riskCaseId ? riskCaseDrawer() : state.reportDimensionId ? reportDimensionDrawer() : state.integrationSystemId ? integrationSystemDrawer() : state.routeId === "partner-360" ? "" : drawer()}${auditDrawer()}${notificationDrawer()}${permissionDrawer()}${reportExportDrawer()}${toast()}`;
    const modalRoot = document.querySelector("#admin-modal-root");
    if (modalRoot) {
      modalRoot.innerHTML = modalMarkup;
      const dialog = modalRoot.querySelector(".dev-modal");
      document.body.classList.toggle("admin-modal-open", Boolean(dialog));
      if (dialog) {
        dialog.tabIndex = -1;
        requestAnimationFrame(() => dialog.focus({preventScroll:true}));
      }
    }
    if (["tasks","workbench"].includes(state.routeId)) taskQueueMount();
    if(taskObjectPageActive()&&tq.dialog){
      document.body.classList.add("tq-has-overlay");
      requestAnimationFrame(()=>document.querySelector(".tq-modal")?.focus({preventScroll:true}));
    }
    if (state.routeId === "tickets") supportUI.mount();
    if (state.riskWorkbenchDrawer) {
      requestAnimationFrame(() => {
        const drawer = document.querySelector(".rwb-drawer");
        const first = drawer?.querySelector("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])");
        (first || drawer)?.focus({preventScroll:true});
      });
    } else if (state.riskWorkbenchReturnFocus) {
      const target = state.riskWorkbenchReturnFocus;
      requestAnimationFrame(() => {
        const button = [...document.querySelectorAll("[data-risk-open]")].find(node => node.dataset.riskOpen === target.kind && node.dataset.riskId === target.id);
        button?.focus({preventScroll:true});
      });
      state.riskWorkbenchReturnFocus = null;
    }
  }

  function showToast(message, action = null) {
    state.toast = message;
    state.toastAction = action;
    render();
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {state.toast=null;state.toastAction=null;render();},4200);
  }
  function adminClockMarkup() {
    const now=new Date(window.AFF_ADMIN_CLOCK.now());
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
    const format=timeZone=>new Intl.DateTimeFormat("sv-SE",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(now);
    const localOffset=new Intl.DateTimeFormat("en-US",{timeZone:zone,timeZoneName:"shortOffset"}).formatToParts(now).find(item=>item.type==="timeZoneName")?.value.replace("GMT","UTC");
    return `<span>服务器时间 ${h(format("Asia/Shanghai"))} UTC+8</span><span>本地时间 ${h(format(zone))} ${h(localOffset)}</span>`;
  }

  function openAction(actionId,target) {
    const action = actionCatalog[actionId];
    if (!action || !action.roles.includes(state.role)) return showToast("当前角色无权执行该操作");
    if(state.routeId==="admin-modules"&&state.tabId==="config-permission")return showToast("权限矩阵目前只读；授权范围及发布权限确认后再开放编辑");
    if(state.routeId==="admin-review" && legacyTaskTypes[state.tabId])return openUnifiedTasks(legacyTaskTypes[state.tabId]);
    if(state.routeId==="admin-modules" && ["commission-list","statement-list","withdrawal-list","reversal-list","reconciliation"].includes(state.tabId)) {
      const row=target?seedRows().find(item=>item.id===target):null;
      if(row?.fundRef?.partner)return openPartnerFollowup(row.fundRef.partner,"finance",`${row.id}：请核对当前资金记录与支付回执。`,state.tabId==="withdrawal-list"?row.id:null);
      return openUnifiedTasks("partner_followup");
    }
    if(target&&!legacyActionAllowed(actionId,seedRows().find(item=>item.id===target)))return showToast("当前状态不允许此操作，请刷新记录后重试");
    if (actionId === "suggestion" && state.routeId === "admin-performance") {
      const data = reportDimension() || {item:reportPacket()?.dimensions[0]};
      if (!data?.item) return showToast("报表维度不存在");
      state.reportDimensionId = data.item.id;
      state.reportSuggestion = {dimensionId:data.item.id};
      return render();
    }
    state.modal = {action:actionId,target:target || null,batch:!target && state.selected.size > 0}; render();
  }

  async function copyAdminValue(value) {
    if(!value)return showToast("没有可复制的内容");
    try {
      if(!navigator.clipboard?.writeText)throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(String(value));
      return showToast("已复制");
    }catch{return showToast("复制未成功，请选中文本后复制");}
  }
  function downloadAdminFile(name,content,type="text/plain;charset=utf-8") {
    const url=URL.createObjectURL(new Blob([content],{type}));
    const link=document.createElement("a");link.href=url;link.download=name;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportPartnerSummary(partner) {
    if(!partner)return showToast("合作方不存在");
    const id=`export-partner-${Date.now().toString(36)}`;
    const skipApproval=demoSkipsApproval();
    prototype.exportTasks.unshift({id,name:`${partner.name}摘要`,scope:partner.id,rows:1,status:skipApproval ? "ready" : "pending_approval",approvalStatus:skipApproval ? "not_required" : "pending_approval",masked:true,dataLevel:"internal",expiresAt:skipApproval ? new Date(window.AFF_ADMIN_CLOCK.now()+24*60*60*1000).toISOString() : "审批后24小时",applicant:prototype.taskQueue.options(state.role).current_user,createdBy:roleOwnerNames[state.role],traceId:`trace-${id}`});
    const summary={id:partner.id,name:partner.name,country:partner.country,stage:statusLabel(partner.stage),updated:partner.updated};
    prototype.exportTasks[0].content=JSON.stringify(summary,null,2);
    prototype.auditRecords.unshift({id:`audit-${id}`,time:createDate(0),action:skipApproval ? "生成合作方脱敏摘要" : "申请导出合作方脱敏摘要",object:partner.id,operator:roleOwnerNames[state.role],result:skipApproval ? "ready" : "pending_approval",trace_id:`trace-${id}`,self_review:false,approval_required:!skipApproval});
    state.reportExportOpen=true;
    return showToast(`摘要导出已创建 · ${id} · ${skipApproval ? "可直接下载" : "等待导出审批"}`);
  }
  function createMaskedListExport(rows,scope) {
    const id=`export-${Date.now().toString(36)}-${crypto.randomUUID().slice(0,8)}`;
    const skipApproval=demoSkipsApproval();
    const records=rows.map(row=>({
      id:row.id,name:row.name,type:row.type,country:row.country,
      status:statusLabel(row.status),partner_id:row.partnerId,amount:row.amount,updated_at:row.updated
    }));
    const task={
      id,name:`${tab().title}列表摘要`,scope,rows:records.length,
      status:skipApproval ? "ready" : "pending_approval",approvalStatus:skipApproval ? "not_required" : "pending_approval",masked:true,dataLevel:"internal",
      expiresAt:skipApproval ? new Date(window.AFF_ADMIN_CLOCK.now()+24*60*60*1000).toISOString() : "审批后24小时",applicant:prototype.taskQueue.options(state.role).current_user,
      createdBy:roleOwnerNames[state.role],traceId:`trace-${id}`,
      content:JSON.stringify({generated_at:createDate(0),scope,filters:{...state.filters},records},null,2)
    };
    prototype.exportTasks.unshift(task);
    prototype.auditRecords.unshift({id:`audit-${id}`,time:createDate(0),action:skipApproval ? "生成列表脱敏摘要" : "申请导出列表脱敏摘要",object:task.name,operator:task.createdBy,result:skipApproval ? "ready" : "pending_approval",trace_id:task.traceId,self_review:false,approval_required:!skipApproval});
    return task;
  }
  function downloadStatement(id) {
    const statement=prototype.funds360.statements.find(item=>item.id===id);
    if(!statement)return showToast("结算单不存在");
    downloadAdminFile(`${id}.json`,JSON.stringify(statement,null,2),"application/json");
    return showToast(`${id} 已下载`);
  }
  function openPartnerFollowup(partnerId,type,reason,businessRef=null) {
    try {
      const result=prototype.taskQueue.ensurePartnerTask({partner_id:partnerId,type,reason,business_ref:businessRef,request_id:tqId("request"),idempotency_key:tqId("idem")},{role:state.role});
      return navigate(`tasks?task_id=${encodeURIComponent(result.task.task_id)}`);
    }catch(error){return showToast(error.message || "无法打开处理任务");}
  }

  function selectedActionRows() {
    if (state.modal.target) return seedRows().filter(row => row.id === state.modal.target);
    const selected = seedRows().filter(row => state.selected.has(row.id));
    return selected.length ? selected : filteredRows().slice(0,1);
  }

  function resultForAction(actionId,fields = {}) {
    if (actionId === "claim") return "processing";
    if (actionId === "approve") return ["approved","rejected","returned"].includes(fields.result) ? fields.result : "approved";
    if (actionId === "assign") return "processing";
    if (actionId === "submit") return demoSkipsApproval() ? "processing" : "pending_approval";
    if (actionId === "supplement") return "supplementing";
    if (actionId === "create_review") return "pending_review";
    if (actionId === "new_draft") return "draft";
    if (actionId === "suggestion") return "pending_review";
    if (actionId === "export") return "processing";
    if (actionId === "cancel") return "cancelled";
    return "";
  }

  function createActionDraft(fields) {
    const currentRows = seedRows();
    const template = {...currentRows[0]};
    const id = `${tab().id}-${Date.now().toString().slice(-6)}`;
    const draft = {
      ...template,...fields,id,
      status:"draft",owner:roleOwnerNames[state.role],ownerRole:state.role,
      updated:createDate(0),traceId:`trace-${tab().id}-${Date.now().toString().slice(-6)}`,
      timeline:[{time:createDate(0),action:"新建草稿",actor:roleOwnerNames[state.role],result:"draft"}]
    };
    currentRows.unshift(draft);
    return draft;
  }

  function collectActionFields() {
    return Object.fromEntries([...document.querySelectorAll("[data-action-field]")].map(input => [input.dataset.actionField,input.value]));
  }

  function writeBackTargets(targets,actionId,selfReview,fields = {}) {
    const result = resultForAction(actionId,fields);
    targets.forEach(task => {
      task.actionValues = task.actionValues || {};
      Object.entries(fields).forEach(([key,value]) => {
        task.actionValues[key] = value;
        if (key === "owner") task.owner = value;
        if (key === "priority") task.priority = value;
        if (key === "riskLevel") task.risk = value;
        if (key === "recommendation") task.status = value;
      });
      if (result) task.status = result;
      if (actionId === "claim") {
        task.ownerRole = state.role;
        task.owner = roleOwnerNames[state.role];
      }
      if (actionId === "assign" && fields.ownerRole) task.ownerRole = fields.ownerRole;
      task.updated = createDate(0);
      task.timeline = task.timeline || [];
      task.timeline.push({time:createDate(0),action:actionDisplayLabel(actionId),actor:roleOwnerNames[state.role],result});
      if (!task.sourceRoute || !task.sourceTab) return;
      const source = seedRows(task.sourceRoute,task.sourceTab).find(row => row.id === task.sourceId);
      if (!source) return;
      source.status = result;
      source.owner = task.owner;
      source.ownerRole = task.ownerRole;
      source.updated = createDate(0);
      source.traceId = source.traceId || task.traceId;
    });
    if (targets.length) {
      prototype.auditRecords.unshift({
        id:`audit-${Date.now().toString().slice(-6)}`,
        time:createDate(0),action:actionDisplayLabel(actionId),
        object:targets.map(row => row.name).slice(0,3).join(" / "),
        operator:roleOwnerNames[state.role],result:result || "processing",
        trace_id:targets[0].traceId,self_review:Boolean(selfReview)
      });
    }
  }

  function submitAction() {
    const actionId = state.modal.action;
    const action = actionCatalog[actionId];
    const fields = collectActionFields();
    const reason = document.querySelector("#action-reason")?.value.trim();
    if (action.reason && !reason) {showToast("原因必填");return;}
    const selfReview = !demoSkipsApproval() && Boolean(document.querySelector("#action-self-review")?.checked);
    let targets = selectedActionRows();
    if (actionId === "export") {
      const rows=state.selected.size ? filteredRows().filter(row=>state.selected.has(row.id)) : filteredRows();
      const task=createMaskedListExport(rows,state.selected.size ? "已选列表摘要" : "当前筛选列表摘要");
      state.selected=new Set();state.modal=null;state.reportExportOpen=true;
      return showToast(`导出已创建 · ${task.rows}条 · ${demoSkipsApproval() ? "可直接下载" : "等待审批"}`);
    }
    if (!["new_draft","suggestion","export"].includes(actionId) && (!targets.length || targets.some(row=>!legacyActionAllowed(actionId,row)))) return showToast("记录状态已变化，请关闭弹窗后重新查看");
    if (actionId === "new_draft") targets = [createActionDraft(fields)];
    writeBackTargets(targets,actionId,selfReview,fields);
    if (actionId === "suggestion") {
      prototype.reportSuggestions.unshift({
        id:`suggest-${Date.now().toString(36)}`,dimensionId:state.tabId,dimension:tab().title,
        recommendation:fields.recommendation || "review",reason:reason || fields.scope || "系统生成",
        creator:roleOwnerNames[state.role],createdAt:createDate(0)
      });
    }
    state.selected = new Set();
    state.modal = null;
    showToast(`${actionDisplayLabel(actionId)}已提交 · ${targets.length}个对象 · 审计已记录${selfReview?" · self_review=true":""}`);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-nav]")) return document.body.classList.toggle("tm-nav-open");
    if (!event.target.closest(".tm-sidebar")) document.body.classList.remove("tm-nav-open");
    const fundFollowup=event.target.closest("[data-fund-followup]");
    if(fundFollowup){
      const w=prototype.funds360.withdrawals.find(item=>item.id===fundFollowup.dataset.fundFollowup);
      if(!w)return showToast("提现记录不存在");
      return openPartnerFollowup(w.partner,"finance",`${w.id}：请核对原支付订单、余额占用及到账回执，确认结果后再决定后续处理。`,w.id);
    }
    if (state.routeId === "partner-360") {
      const p360 = partner360PagePartner();
      const tabButton = event.target.closest("[data-partner360-page-tab]");
      if (tabButton && p360) return navigate(`partner-360/${encodeURIComponent(p360.id)}?tab=${encodeURIComponent(tabButton.dataset.partner360PageTab)}`);
      const blockerTab = event.target.closest("[data-p360-blocker-tab]");
      if (blockerTab && p360) return navigate(`partner-360/${encodeURIComponent(p360.id)}?tab=${encodeURIComponent(blockerTab.dataset.p360BlockerTab)}`);
      const tabLink = event.target.closest("[data-p360-tab-link]");
      if (tabLink && p360) return navigate(`partner-360/${encodeURIComponent(p360.id)}?tab=${encodeURIComponent(tabLink.dataset.p360TabLink)}`);
      const metric = event.target.closest("[data-p360-metric]");
      if (metric && p360) {
        const targetTab = metric.dataset.p360Metric || "overview";
        return navigate(`partner-360/${encodeURIComponent(p360.id)}?tab=${encodeURIComponent(targetTab)}&period=${encodeURIComponent(state.partner360Period)}`);
      }
      if (event.target.closest("[data-p360-back]")) return navigate("admin-modules/partner-list");
      if (event.target.closest("[data-p360-copy-id]")) return copyAdminValue(p360?.id);
      const copyValue = event.target.closest("[data-p360-copy-value]");
      if (copyValue) return copyAdminValue(copyValue.dataset.p360CopyValue);
      if (event.target.closest("[data-p360-export]")) return exportPartnerSummary(p360);
      if (event.target.closest("[data-p360-owner]")) {state.partner360ActionModal={kind:"owner"};return render();}
      if (event.target.closest("[data-p360-note-new]")) {state.partner360ActionModal={kind:"note"};return render();}
      const newTask = event.target.closest("[data-p360-task-new]");
      if (newTask) {state.partner360ActionModal={kind:"task",taskType:newTask.dataset.p360TaskNew};return render();}
      if (event.target.closest("[data-p360-modal-close]")) {state.partner360ActionModal=null;return render();}
      if (event.target.closest("[data-p360-modal-submit]")) {
        const modal = state.partner360ActionModal;
        if (!modal || !p360) return;
        if (modal.kind === "note") {
          const content = String(document.querySelector("[data-p360-note-field='content']")?.value || "").trim();
          const followUp = String(document.querySelector("[data-p360-note-field='followUp']")?.value || "—");
          if (!content) return showToast("备注内容不能为空");
          prototype.partner360.noteTemplates.unshift({id:`note-${Date.now().toString(36)}`,partnerId:p360.id,time:createDate(0),author:roleOwnerNames[state.role] || "系统",type:"跟进",content,nextFollowUp:followUp});
          prototype.auditRecords.unshift({id:`audit-${Date.now().toString(36)}`,time:createDate(0),action:"新增合作方备注",object:`${p360.name} / ${p360.id}`,operator:roleOwnerNames[state.role] || "系统",result:"success",trace_id:`trace-${p360.id}-note`,self_review:false});
          state.partner360ActionModal=null;showToast("跟进备注已保存 · 审计已记录");return;
        }
        if (modal.kind === "owner") {
          const owner = String(document.querySelector("[data-p360-owner-field]")?.value || "").trim();
          const reason = String(document.querySelector("[data-p360-owner-reason]")?.value || "").trim();
          if (!reason) return showToast("请填写责任人变更原因");
          p360.owner = owner;
          prototype.auditRecords.unshift({id:`audit-${Date.now().toString(36)}`,time:createDate(0),action:"分配合作方责任人",object:`${p360.name} / ${p360.id}`,operator:roleOwnerNames[state.role] || "系统",result:"success",trace_id:`trace-${p360.id}-owner`,self_review:false});
          prototype.partner360.noteTemplates.unshift({id:`note-${Date.now().toString(36)}`,partnerId:p360.id,time:createDate(0),author:roleOwnerNames[state.role] || "系统",type:"责任变更",content:`责任人调整为 ${owner}：${reason}`,nextFollowUp:"—"});
          state.partner360ActionModal=null;showToast("责任人已更新 · 审计已记录");return;
        }
        const reason = String(document.querySelector("[data-p360-task-reason]")?.value || "").trim();
        const type = String(document.querySelector("[data-p360-task-type]")?.value || modal.taskType || "general");
        const priority = String(document.querySelector("[data-p360-task-priority]")?.value || "普通");
        if (!reason) return showToast("请填写任务说明");
        try {
          const result=prototype.taskQueue.ensurePartnerTask({partner_id:p360.id,type,reason,priority:({"普通":"normal","高":"high","紧急":"urgent"})[priority]||"normal",request_id:tqId("request"),idempotency_key:tqId("idem")},{role:state.role});
          state.partner360ActionModal=null;
          return showToast(`${result.reused?"已有未完成任务":"任务已创建"} · ${result.task.task_id}`,{label:"查看任务",path:`tasks?task_id=${encodeURIComponent(result.task.task_id)}`});
        }catch(error){return showToast(error.message || "任务创建失败，请重试");}
      }
      const reveal = event.target.closest("[data-p360-reveal]");
      if (reveal) {
        if (!["finance","risk","risk_supervisor","compliance","system_admin"].includes(state.role)) return showToast("当前角色无权查看敏感字段");
        const field = reveal.dataset.p360Reveal;
        state.partner360SensitiveFields.add(field);
        state.partner360SensitiveExpiry[field] = Date.now() + 60000;
        prototype.auditRecords.unshift({id:`audit-${Date.now().toString(36)}`,time:createDate(0),action:"查看合作方敏感字段",object:`${p360?.id} / ${reveal.dataset.p360Reveal}`,operator:roleOwnerNames[state.role] || "系统",result:"success",trace_id:`trace-${p360?.id}-sensitive`,self_review:false});
        setTimeout(() => {
          if (state.partner360SensitiveExpiry[field] && state.partner360SensitiveExpiry[field] <= Date.now()) {
            state.partner360SensitiveFields.delete(field);
            delete state.partner360SensitiveExpiry[field];
            if (state.routeId === "partner-360") render();
          }
        },60000);
        return render();
      }
      const hideSensitive = event.target.closest("[data-p360-hide-sensitive]");
      if (hideSensitive) {
        const field = hideSensitive.dataset.p360HideSensitive;
        state.partner360SensitiveFields.delete(field);
        delete state.partner360SensitiveExpiry[field];
        return render();
      }
      const copySensitive = event.target.closest("[data-p360-copy-sensitive]");
      if (copySensitive) {
        const field = copySensitive.dataset.p360CopySensitive;
        if (!state.partner360SensitiveFields.has(field) || (state.partner360SensitiveExpiry[field] && state.partner360SensitiveExpiry[field] <= Date.now())) return showToast("敏感字段已重新脱敏");
        const value = field === "payout" ? "ACCT-0098-4821-7712" : "";
        if(!navigator.clipboard?.writeText)return showToast("复制不可用，请选中文本后复制");
        navigator.clipboard.writeText(value).then(()=>{
          prototype.auditRecords.unshift({id:`audit-${Date.now().toString(36)}`,time:createDate(0),action:"复制合作方敏感字段",object:`${p360?.id} / ${field}`,operator:roleOwnerNames[state.role] || "系统",result:"success",trace_id:`trace-${p360?.id}-sensitive-copy`,self_review:false});
          showToast("敏感字段已复制 · 审计已记录");
        }).catch(()=>showToast("复制未成功，请选中文本后复制"));
        return;
      }
      const p360Task = event.target.closest("[data-p360-task]");
      if (p360Task) return navigate(`tasks?task_id=${encodeURIComponent(p360Task.dataset.p360Task)}`);
    }
    if (state.routeId === "risk-workbench") {
      if (event.target.closest("[data-risk-unified-tasks]")) return navigate("tasks?task_id=DEMO-T01");
      if (event.target.closest("[data-risk-config]")) return navigate("admin-config/overview");
      const riskTab = event.target.closest("[data-risk-tab]");
      if (riskTab) return navigate(`risk-workbench?tab=${encodeURIComponent(riskTab.dataset.riskTab)}`);
      const metric = event.target.closest("[data-risk-metric]");
      if (metric) {
        const key = metric.dataset.riskMetric;
        const metricTargets = {highRiskObjects:"objects",openTasks:"objects",pendingApprovals:"events",frozenAmount:"events"};
        if (state.riskWorkbenchFilter.metric === key && state.riskWorkbenchMetricRestore) {
          const restore = state.riskWorkbenchMetricRestore;
          state.riskWorkbenchMetricRestore = null;
          state.riskWorkbenchMetricPending = null;
          state.riskWorkbenchSkipCacheSaveTab = state.tabId;
          state.riskWorkbenchFiltersByTab[restore.tabId] = {...restore.filter};
          state.riskWorkbenchDraftFiltersByTab[restore.tabId] = {...restore.draftFilter};
          state.riskWorkbenchSortsByTab[restore.tabId] = {...restore.sort};
          state.riskWorkbenchPagesByTab[restore.tabId] = restore.page;
          if (restore.targetTab && restore.targetCache) {
            state.riskWorkbenchFiltersByTab[restore.targetTab] = {...restore.targetCache.filter};
            state.riskWorkbenchDraftFiltersByTab[restore.targetTab] = {...restore.targetCache.draftFilter};
            state.riskWorkbenchSortsByTab[restore.targetTab] = {...restore.targetCache.sort};
            state.riskWorkbenchPagesByTab[restore.targetTab] = restore.targetCache.page;
          }
          state.riskWorkbenchFilter = {...restore.filter};
          state.riskWorkbenchDraftFilter = {...restore.draftFilter};
          state.riskWorkbenchSort = {...restore.sort};
          state.riskWorkbenchPage = restore.page;
          if (restore.tabId !== state.tabId) return navigate(`risk-workbench?tab=${encodeURIComponent(restore.tabId)}`);
          return render();
        }
        state.riskWorkbenchMetricRestore = {
          sourceTab:state.tabId,
          targetTab:null,
          tabId:state.tabId,
          filter:{...(state.riskWorkbenchFilter || {})},
          draftFilter:{...(state.riskWorkbenchDraftFilter || {})},
          sort:{...(state.riskWorkbenchSort || {})},
          page:state.riskWorkbenchPage
        };
        const current = {...(state.riskWorkbenchFilter || {})};
        ["metric","riskBands","fundsStatus","workFilter","approvalStatus"].forEach(name => delete current[name]);
        state.riskWorkbenchFilter = state.riskWorkbenchFilter.metric === key
          ? {...current}
          : {...current,metric:key, ...(key==="highRiskObjects" ? {riskBands:["R2","R3"],scope:"open"} : key==="pendingApprovals" ? {approvalStatus:"pending_approval"} : key==="openTasks" ? {workFilter:"needs_action"} : key==="frozenAmount" ? {fundsStatus:"frozen"} : {})};
        state.riskWorkbenchDraftFilter = {...state.riskWorkbenchFilter};
        const targetTab = metricTargets[key] || state.tabId;
        const targetFilter = state.riskWorkbenchFiltersByTab[targetTab] || (targetTab === "objects" ? {scope:"open"} : {});
        const targetDraftFilter = state.riskWorkbenchDraftFiltersByTab[targetTab] || {...targetFilter};
        const targetSort = state.riskWorkbenchSortsByTab[targetTab] || (
          targetTab === "events" ? {key:"occurred",dir:"desc"} :
          targetTab === "blacklist" ? {key:"createdAt",dir:"desc"} :
          {key:"updated",dir:"desc"}
        );
        const targetPage = state.riskWorkbenchPagesByTab[targetTab] || 1;
        state.riskWorkbenchMetricRestore.targetTab = targetTab;
        state.riskWorkbenchMetricRestore.targetCache = {
          filter:{...targetFilter},
          draftFilter:{...targetDraftFilter},
          sort:{...targetSort},
          page:targetPage
        };
        state.riskWorkbenchMetricPending = {
          key,
          targetTab,
          filter:{...state.riskWorkbenchFilter},
          draftFilter:{...state.riskWorkbenchDraftFilter},
          sort:{...(state.riskWorkbenchSort || {})},
          page:state.riskWorkbenchPage
        };
        if (targetTab !== state.tabId) return navigate(`risk-workbench?tab=${encodeURIComponent(targetTab)}`);
        state.riskWorkbenchMetricPending = null;
        return render();
      }
      const query = event.target.closest("[data-risk-query]");
      if (query) return applyRiskWorkbenchFilter();
      const reset = event.target.closest("[data-risk-reset]");
      const clearFilters = event.target.closest("[data-risk-clear-filters]");
      if (reset || clearFilters) {
        const baseFilter = state.tabId === "objects" ? {scope:"open"} : {};
        if (reset) {
          state.riskWorkbenchDraftFilter = {...baseFilter};
          return render();
        }
        state.riskWorkbenchFilter = baseFilter;
        state.riskWorkbenchDraftFilter = {...baseFilter};
        state.riskWorkbenchMetricRestore = null;
        state.riskWorkbenchMetricPending = null;
        state.riskWorkbenchSort = state.tabId === "events" ? {key:"occurred",dir:"desc"} : state.tabId === "blacklist" ? {key:"createdAt",dir:"desc"} : {key:"updated",dir:"desc"};
        state.riskWorkbenchFiltersByTab[state.tabId] = {...state.riskWorkbenchFilter};
        state.riskWorkbenchDraftFiltersByTab[state.tabId] = {...state.riskWorkbenchDraftFilter};
        state.riskWorkbenchSortsByTab[state.tabId] = {...state.riskWorkbenchSort};
        state.riskWorkbenchPage = 1;
        return render();
      }
      if (event.target.closest("[data-risk-more], [data-risk-close-filters]")) {
        state.riskWorkbenchDraftFilter = tqClone(state.riskWorkbenchFilter || {});
        state.riskWorkbenchMore = event.target.closest("[data-risk-close-filters]") ? false : !state.riskWorkbenchMore;
        return render();
      }
      if (event.target.closest("[data-risk-columns]")) {state.riskWorkbenchColumnPanel=!state.riskWorkbenchColumnPanel;return render();}
      if (event.target.closest("[data-risk-export]")) {state.riskWorkbenchModal={export:true};return render();}
      if (event.target.closest("[data-risk-refresh]")) {
        state.riskWorkbenchSummaryRecovered = true;
        invalidateRiskWorkbenchSnapshots();
        state.riskWorkbenchSnapshotStale = false;
        state.riskWorkbenchPage = 1;
        state.riskWorkbenchDraftFilter={...state.riskWorkbenchFilter};
        return showToast("风险工作台已重新读取当前评审快照");
      }
      const riskPage = event.target.closest("[data-risk-page]");
      if (riskPage) {state.riskWorkbenchPage=Math.max(1,Number(riskPage.dataset.riskPage)||1);return render();}
      const riskSort = event.target.closest("[data-risk-sort]");
      if (riskSort) {
        const key = riskSort.dataset.riskSort;
        if (state.riskWorkbenchSort?.key !== key) state.riskWorkbenchSort={key,dir:"desc"};
        else if (state.riskWorkbenchSort.dir === "desc") state.riskWorkbenchSort.dir = "asc";
        else state.riskWorkbenchSort = state.tabId === "events" ? {key:"occurred",dir:"desc"} : state.tabId === "blacklist" ? {key:"createdAt",dir:"desc"} : {key:"updated",dir:"desc"};
        state.riskWorkbenchSortsByTab[state.tabId] = {...state.riskWorkbenchSort};
        state.riskWorkbenchPage = 1;
        return render();
      }
      const removeFilter = event.target.closest("[data-risk-remove-filter]");
      if (removeFilter) {
        const key = removeFilter.dataset.riskRemoveFilter;
        delete state.riskWorkbenchFilter[key];
        delete state.riskWorkbenchDraftFilter[key];
        state.riskWorkbenchFilter.metric = "";
        state.riskWorkbenchMetricRestore = null;
        state.riskWorkbenchMetricPending = null;
        state.riskWorkbenchFiltersByTab[state.tabId] = {...state.riskWorkbenchFilter};
        state.riskWorkbenchDraftFiltersByTab[state.tabId] = {...state.riskWorkbenchDraftFilter};
        state.riskWorkbenchPage = 1;
        return render();
      }
      const open = event.target.closest("[data-risk-open]");
      if (open) {
        if (state.riskWorkbenchDrawer?.id && state.riskWorkbenchDrawer.id !== open.dataset.riskId) {
          prototype.riskWorkbench?.sensitiveAccess?.clearObject?.(state.riskWorkbenchDrawer.id);
          state.riskWorkbenchSensitiveSessions = {};
        }
        state.riskWorkbenchAction=null;
        state.riskWorkbenchDrawer = {kind:open.dataset.riskOpen,id:open.dataset.riskId};
        state.riskWorkbenchReturnFocus = {kind:open.dataset.riskOpen,id:open.dataset.riskId};
        return render();
      }
      const riskRow = event.target.closest("[data-risk-row]");
      if (riskRow && !event.target.closest("button,a,input,select")) {
        if (state.riskWorkbenchDrawer?.id && state.riskWorkbenchDrawer.id !== riskRow.dataset.riskRow) {
          prototype.riskWorkbench?.sensitiveAccess?.clearObject?.(state.riskWorkbenchDrawer.id);
          state.riskWorkbenchSensitiveSessions = {};
        }
        state.riskWorkbenchAction = null;
        state.riskWorkbenchDrawer = {kind:riskRow.dataset.riskRowKind,id:riskRow.dataset.riskRow};
        return render();
      }
      const revealSensitive = event.target.closest("[data-risk-sensitive-reveal]");
      if (revealSensitive) {
        const field = revealSensitive.dataset.riskSensitiveReveal;
        const objectId = state.riskWorkbenchDrawer?.id;
        try {
          const result = prototype.riskWorkbench?.sensitiveAccess?.reveal?.({
            role:state.role,
            objectRef:objectId,
            field,
            purpose:"risk_detail",
            reason:"风险对象详情核验受限字段"
          });
          if (!result) return showToast("受限字段服务不可用");
          state.riskWorkbenchSensitiveSessions[riskSensitiveSessionKey(objectId,field)] = result;
        } catch(error) {
          return showToast(error.message || error.code || "受限字段揭示失败");
        }
        setTimeout(() => {
          const key = riskSensitiveSessionKey(objectId,field);
          const session = state.riskWorkbenchSensitiveSessions[key];
          if (session && session.client_deadline <= Date.now()) {
            prototype.riskWorkbench?.sensitiveAccess?.clear?.({sessionId:session.session_id,role:state.role,objectRef:objectId,field});
            delete state.riskWorkbenchSensitiveSessions[key];
            if (state.routeId === "risk-workbench" && state.riskWorkbenchDrawer) render();
          }
        },60000);
        return render();
      }
      const hideSensitive = event.target.closest("[data-risk-sensitive-hide]");
      if (hideSensitive) {
        const field = hideSensitive.dataset.riskSensitiveHide;
        const objectId = state.riskWorkbenchDrawer?.id;
        const key = riskSensitiveSessionKey(objectId,field);
        const session = state.riskWorkbenchSensitiveSessions[key];
        if (session) prototype.riskWorkbench?.sensitiveAccess?.clear?.({sessionId:session.session_id,role:state.role,objectRef:objectId,field});
        delete state.riskWorkbenchSensitiveSessions[key];
        return render();
      }
      const copySensitive = event.target.closest("[data-risk-sensitive-copy]");
      if (copySensitive) {
        const field = copySensitive.dataset.riskSensitiveCopy;
        const objectId = state.riskWorkbenchDrawer?.id;
        const key = riskSensitiveSessionKey(objectId,field);
        const session = state.riskWorkbenchSensitiveSessions[key];
        if (!session || !riskSensitiveVisible(objectId,field)) return showToast("受限字段已重新脱敏");
        if (!navigator.clipboard?.writeText) return showToast("当前浏览器不支持复制");
        let authorizedValue;
        try {
          authorizedValue = prototype.riskWorkbench?.sensitiveAccess?.copy?.({
            role:state.role,
            sessionId:session.session_id,
            objectRef:objectId,
            field,
            purpose:"risk_detail",
            reason:session.reason || "风险对象详情核验受限字段"
          });
        } catch(error) {
          return showToast(error.message || error.code || "复制受限字段失败");
        }
        Promise.resolve(navigator.clipboard.writeText(authorizedValue.value)).then(() => {
          try {
            prototype.riskWorkbench?.sensitiveAccess?.recordCopy?.({
              role:state.role,
              sessionId:session.session_id,
              objectRef:objectId,
              field,
              purpose:"risk_detail",
              reason:session.reason || "风险对象详情核验受限字段"
            });
            showToast("受限字段已复制 · 审计已记录");
          } catch(error) {
            showToast(error.message || error.code || "复制受限字段失败");
          }
        }).catch(() => showToast("复制受限字段失败"));
        return;
      }
      if (event.target.closest("[data-risk-close]")) {
        if (state.riskWorkbenchDrawer?.id) prototype.riskWorkbench?.sensitiveAccess?.clearObject?.(state.riskWorkbenchDrawer.id);
        state.riskWorkbenchSensitiveSessions = {};
        state.riskWorkbenchAction = null; state.riskWorkbenchDrawer = null; return render();
      }
      const claim = event.target.closest("[data-risk-claim]");
      if (claim) {
        const task = riskWorkbenchStore().tasks.find(item => item.id === claim.dataset.riskClaim);
        if (!task) return showToast("任务不存在");
        if (!["risk","risk_supervisor"].includes(state.role)) return showToast("当前角色无调查权限");
        try {
          const detail = prototype.taskQueue?.detail(task.id,{role:state.role});
          prototype.taskQueue?.write("claim",task.id,{request_id:tqId("request"),idempotency_key:tqId("idem"),expected_version:detail?.version},{role:state.role});
        } catch(error) { return showToast(error.message || error.code || "任务认领失败"); }
        invalidateRiskWorkbenchSnapshots();
        task.status="processing";task.owner=roleOwnerNames[state.role] || "风控专员甲";state.riskWorkbenchAction=null;state.riskWorkbenchDrawer={kind:"task",id:task.id};return showToast(`${task.id} 已认领`);
      }
      const taskOpen = event.target.closest("[data-risk-task]");
      if (taskOpen) {state.riskWorkbenchAction=null;state.riskWorkbenchDrawer={kind:"task",id:taskOpen.dataset.riskTask};return render();}
      const taskAction = event.target.closest("[data-risk-task-action]");
      if (taskAction) {
        const task = riskWorkbenchStore().tasks.find(item => item.id === taskAction.dataset.riskTaskId);
        if (!task) return showToast("任务不存在");
        const action = taskAction.dataset.riskTaskAction;
        state.riskWorkbenchDrawer={kind:"task",id:task.id};
        const priorAction = state.riskWorkbenchAction?.taskId === task.id ? state.riskWorkbenchAction : null;
        state.riskWorkbenchAction = riskTaskActionDetail(task.id,action);
        if (priorAction) {
          state.riskWorkbenchAction.form = priorAction.form || state.riskWorkbenchAction.form;
          state.riskWorkbenchAction.preview = priorAction.preview || null;
          state.riskWorkbenchAction.notice = priorAction.notice || null;
        }
        return render();
      }
      if (event.target.closest("[data-risk-action-cancel]")) {state.riskWorkbenchAction=null;return render();}
      if (event.target.closest("[data-risk-action-submit]")) return riskTaskActionSubmit();
      const taskList = event.target.closest("[data-risk-task-list]");
      if (taskList) {
        const row = riskWorkbenchStore().objects.find(item => item.id === taskList.dataset.riskTaskList);
        if (!row) return showToast("风险对象不存在");
        state.riskWorkbenchDrawer={kind:"task-list",id:row.id};return render();
      }
      const newTask = event.target.closest("[data-risk-new-task]");
      if (newTask) { state.riskWorkbenchModal = {source:newTask.dataset.riskNewTask,purpose:newTask.dataset.riskPurpose || "risk_investigation"}; return render(); }
      const approve = event.target.closest("[data-risk-approve]");
      if (approve) {
        const current = prototype.taskQueue?.options(state.role)?.current_user;
        const localApproval = riskWorkbenchStore().approvals.find(item => item.id === approve.dataset.riskApprove);
        if (!localApproval || localApproval.status !== "pending_approval") return showToast("当前审批已处理或不存在");
        if (current?.user_id === localApproval.applicantId) return showToast("申请人不得审批自己的申请");
        const sharedApproval = (prototype.taskQueue?.approvals({role:state.role}) || []).find(item => item.task_id === localApproval.task);
        if (!sharedApproval) return showToast("统一审批记录尚未同步");
        state.riskWorkbenchAction=null;
        state.riskWorkbenchDrawer={kind:"approval",id:sharedApproval.approval_id || sharedApproval.id};
        return render();
      }
      const openApproval = event.target.closest("[data-risk-open-approval]");
      if (openApproval) {
        const approval = riskApprovalRecord(openApproval.dataset.riskOpenApproval);
        if (!approval) return showToast("统一审批记录尚未同步");
        state.riskWorkbenchAction=null;
        state.riskWorkbenchDrawer={kind:"approval",id:approval.approval_id || approval.id};
        return render();
      }
      const reject = event.target.closest("[data-risk-reject]");
      if (reject) {
        const localApproval = riskWorkbenchStore().approvals.find(item => item.id === reject.dataset.riskReject);
        const sharedApproval = localApproval && (prototype.taskQueue?.approvals({role:state.role}) || []).find(item => item.task_id === localApproval.task);
        if (!sharedApproval) return showToast("统一审批记录尚未同步");
        state.riskWorkbenchAction={kind:"approval",approvalId:sharedApproval.approval_id || sharedApproval.id,decision:"reject",form:{reason:"",confirmed:false}};
        state.riskWorkbenchDrawer={kind:"approval",id:sharedApproval.approval_id || sharedApproval.id};
        return render();
      }
      const approvalAction = event.target.closest("[data-risk-approval-action]");
      if (approvalAction) {
        state.riskWorkbenchAction={kind:"approval",approvalId:approvalAction.dataset.riskApprovalId,decision:approvalAction.dataset.riskApprovalAction,form:{reason:"",confirmed:false}};
        return render();
      }
      if (event.target.closest("[data-risk-approval-submit]")) {
        const action=state.riskWorkbenchAction;
        const approval=action?.kind==="approval" ? riskApprovalRecord(action.approvalId) : null;
        const node=riskApprovalNode(approval);
        const form=action?.form || {};
        if (!approval || !node) return showToast("当前审批节点不存在");
        if (String(form.reason || "").trim().length < 10) return showToast("审批意见至少填写10个字");
        if (!form.confirmed) return showToast("请确认已核对证据、金额和处置范围");
        try {
          prototype.taskQueue.write(action.decision,approval.approval_id || approval.id,{
            request_id:tqId("request"),
            idempotency_key:tqId("idem"),
            expected_version:approval.version,
            node_id:node.node_id,
            expected_node_version:node.version,
            reason:String(form.reason).trim(),
            preview_id:approval.preview?.preview_id,
            preview_hash:approval.preview?.preview_hash,
            impact_confirmation:true,
            self_review:false
          },{role:state.role,source_entry:"risk-workbench"});
          invalidateRiskWorkbenchSnapshots();
          state.riskWorkbenchAction=null;
          return render();
        } catch(error) {
          action.error=error;state.riskWorkbenchAction=action;return render();
        }
      }
      if (event.target.closest("[data-risk-modal-close]")) { state.riskWorkbenchModal = null; return render(); }
      if (event.target.closest("[data-risk-modal-submit]")) {
        const modal = state.riskWorkbenchModal;
        if (modal?.export) {
          const reason = document.querySelector("[data-risk-modal-reason]")?.value.trim() || "";
          if (reason.length < 10) return showToast("导出原因至少填写10个字");
          try {
            const response = riskWorkbenchExportRequest(reason);
            state.riskWorkbenchModal=null;
            return showToast(`${demoSkipsApproval() ? "导出已生成，可直接下载" : "导出申请已提交"} · ${response.export_id} · ${response.row_count} 条风险记录`,{kind:"exports"});
          } catch(error) {return showToast(error.message || error.code || "导出申请失败");}
        }
        if (modal.approval) {
          const id = modal.approval.id;
          state.riskWorkbenchModal = null;
          return navigate(`workbench?tab=approvals&approval_id=${encodeURIComponent(id)}`);
        }
        const reason = document.querySelector("[data-risk-modal-reason]")?.value.trim() || "";
        if (reason.length < 10) return showToast("原因至少填写10个字");
        const sourceKind = ["event","cluster","blacklist","object"].find(kind => {
          const collection = {event:"events",cluster:"clusters",blacklist:"blacklist",object:"objects"}[kind];
          return prototype.riskWorkbench[collection].some(item => item.id === modal.source);
        });
        try {
          const response = prototype.taskQueue.ensureRiskTask({
            source_ref:{kind:sourceKind,id:modal.source},
            task_purpose:document.querySelector("[data-risk-modal-purpose]")?.value || modal.purpose,
            reason,request_id:tqId("request"),idempotency_key:tqId("idem")
          },{role:state.role});
          state.riskWorkbenchModal=null;
          state.riskWorkbenchAction=null;
          invalidateRiskWorkbenchSnapshots();
          state.riskWorkbenchDrawer={kind:"task",id:response.task.task_id};
          return render();
        } catch(error) {return showToast(error.message || error.code);}
      }
    }
    const configOverviewLink = event.target.closest("[data-config-overview]");
    if (configOverviewLink) {
      state.configOverviewVersionId = null;
      state.configOverviewVersionItemId = null;
      state.configOverviewItem = null;
      state.configScopedItem = null;
      state.configSubgroupVersionId = null;
      return navigate("admin-config/overview");
    }
    const configSubgroupView = event.target.closest("[data-config-subgroup-view]");
    if (configSubgroupView) {
      const version = configSubgroupVersionById(configSubgroupView.dataset.configSubgroupView);
      if (!version) return showToast("配置版本不存在");
      state.configSubgroupVersionId = version.id;
      state.configVersionMenuId = null;
      return render();
    }
    const configOverviewVersion = event.target.closest("[data-config-overview-version]");
    if (configOverviewVersion) {
      const version = configVersionById(configOverviewVersion.dataset.configOverviewVersion);
      if (!version || !["active","scheduled"].includes(version.status)) return showToast("当前版本只支持查看已生效或待生效版本");
      state.configOverviewVersionId = version.id;
      state.configOverviewVersionItemId = configOverviewVersion.dataset.configOverviewVersionItem || null;
      return render();
    }
    const configOverviewItem = event.target.closest("[data-config-overview-item]");
    if (configOverviewItem) {
      state.configOverviewItem = configOverviewItem.dataset.configOverviewItem;
      return render();
    }
    const configOverviewVersions = event.target.closest("[data-config-overview-versions]");
    if (configOverviewVersions) {
      const item = configOverviewItems().find(row => row.id === configOverviewVersions.dataset.configOverviewVersions);
      const menuItem = configMenuItemForOverview(item);
      if (!menuItem) return showToast("配置小组不存在");
      state.configOverviewItem = null;
      state.configSubgroupVersionId = null;
      return navigate(`${menuItem.routeId}/${menuItem.tabId}`);
    }
    if (event.target.closest("[data-config-overview-filter-toggle], [data-config-overview-filter-close]")) {
      state.configOverviewDraft = {search:state.configOverviewSearch,group:state.configOverviewGroup,status:state.configOverviewStatus};
      state.configOverviewFilterOpen = event.target.closest("[data-config-overview-filter-close]") ? false : !state.configOverviewFilterOpen;
      return render();
    }
    if (event.target.closest("[data-config-overview-reset]")) {
      state.configOverviewDraft = {search:"",group:"",status:""};
      return render();
    }
    if (event.target.closest("[data-config-overview-filter-apply]")) {
      state.configOverviewSearch = state.configOverviewDraft.search.trim();
      state.configOverviewGroup = state.configOverviewDraft.group;
      state.configOverviewStatus = state.configOverviewDraft.status;
      state.configOverviewFilterOpen = false;
      return render();
    }
    const configFilterRemove = event.target.closest("[data-config-overview-filter-remove]");
    if (configFilterRemove || event.target.closest("[data-config-overview-filter-clear]")) {
      const key = configFilterRemove?.dataset.configOverviewFilterRemove;
      if (!key || key === "search") state.configOverviewSearch = "";
      if (!key || key === "group") state.configOverviewGroup = "";
      if (!key || key === "status") state.configOverviewStatus = "";
      state.configOverviewDraft = {search:state.configOverviewSearch,group:state.configOverviewGroup,status:state.configOverviewStatus};
      return render();
    }
    const configVersionMenuToggle = event.target.closest("[data-config-version-menu-toggle]");
    if (configVersionMenuToggle) {
      const id = configVersionMenuToggle.dataset.configVersionMenuToggle;
      if (state.configVersionMenuId === id) {
        state.configVersionMenuId = null;
        state.configVersionMenuPosition = null;
      } else {
        const rect = configVersionMenuToggle.getBoundingClientRect();
        const menuWidth = 170;
        const menuHeight = Math.min(260, Math.max(120, configVersionActions(configVersionById(id)).length * 36 + 12));
        const top = rect.bottom + 5 + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 5) : rect.bottom + 5;
        const left = Math.min(Math.max(8, rect.right - menuWidth), Math.max(8, window.innerWidth - menuWidth - 8));
        state.configVersionMenuId = id;
        state.configVersionMenuPosition = {top:Math.round(top),left:Math.round(left)};
      }
      return render();
    }
    const configVersionMenuAction = event.target.closest("[data-config-version-menu-action]");
    if (configVersionMenuAction) {
      const action = configVersionMenuAction.dataset.configVersionMenuAction;
      const id = configVersionMenuAction.dataset.configVersionId;
      const item = configVersionById(id);
      state.configVersionMenuId = null;
      state.configVersionMenuPosition = null;
      if (action === "view") {
        if (item?.configItemId) state.configSubgroupVersionId = id;
        else state.configVersionId = id;
        state.configScopedItem = null;
        return render();
      }
      if (action === "copy") {state.configVersionModal = {mode:"copy",id};state.configVersionId=null;return render();}
      if (action === "edit") {
        if (item?.locked || item?.status !== "draft") return showToast("版本已锁定或不是草稿，请复制为新版本后修改");
        state.configVersionModal = {mode:"edit",id};state.configVersionId=null;return render();
      }
      if (action === "rollback") {state.configVersionModal = {mode:"rollback",id};state.configVersionId=null;return render();}
      if (["withdraw","void","activate","schedule"].includes(action)) {state.configActionModal = {action,id};state.configVersionId=null;return render();}
    }
    if (state.configVersionMenuId && !event.target.closest(".dev-config-row-actions")) {
      state.configVersionMenuId = null;
      state.configVersionMenuPosition = null;
      return render();
    }
    if (event.target.closest("[data-close-menu-blueprint]")) {state.menuBlueprintId=null;return render();}
    const moduleBrief = event.target.closest("[data-menu-blueprint]");
    if (moduleBrief) {state.menuBlueprintId=moduleBrief.dataset.menuBlueprint;return render();}
    const menuOpen = event.target.closest("[data-menu-open]");
    if (menuOpen) {
      const data = menuBlueprintItem(menuOpen.dataset.menuOpen);
      state.menuBlueprintId = null;
      if (data?.group) {
        state.menuActiveGroupId = data.group.id;
        state.menuOpenGroups = new Set([data.group.id]);
      }
      if (data?.item.routeId) {
        state.menuActiveGroupId = data.group.id;
        return navigate(data.item.view ? `${data.item.routeId}/${data.item.tabId}/view=${data.item.view}` : `${data.item.routeId}/${data.item.tabId}`);
      }
      if (data?.item.action === "audit") {state.auditOpen=true;return render();}
      return render();
    }
    const configSection = event.target.closest("[data-config-section]");
    if (configSection) {
      const section = businessConfigMenuSections().find(item => item.id === configSection.dataset.configSection);
      const first = section?.items?.[0];
      if (!first) return showToast("业务配置分组不存在");
      state.configScopedItem = null;
      state.configSubgroupVersionId = null;
      return navigate(`${first.routeId}/${first.tabId}`);
    }
    const configSubitem = event.target.closest("[data-config-subitem]");
    if (configSubitem) {
      const item = businessConfigMenuItem(configSubitem.dataset.configSubitem);
      if (!item) return showToast("业务配置小分组不存在");
      state.configScopedItem = null;
      state.configSubgroupVersionId = null;
      return navigate(`${item.routeId}/${item.tabId}`);
    }
    const configScopedVersions = event.target.closest("[data-config-scoped-versions]");
    if (configScopedVersions) {
      state.configScopedItem = configScopedVersions.dataset.configScopedVersions;
      state.configVersionMenuId = null;
      return render();
    }
    const configVersionCopyCurrent = event.target.closest("[data-config-version-copy-current]");
    if (configVersionCopyCurrent) {
      const configItem = businessConfigMenuItem(configVersionCopyCurrent.dataset.configVersionCopyCurrent);
      const source = configSubgroupCurrentVersion(configItem);
      if (!source) return showToast("当前小分组没有可复制的版本");
      state.configVersionModal = {mode:"copy",id:source.id};
      state.configScopedItem = null;
      return render();
    }
    const configVersionNewFor = event.target.closest("[data-config-version-new-for]");
    if (configVersionNewFor) {
      const configItem = businessConfigMenuItem(configVersionNewFor.dataset.configVersionNewFor);
      if (!configItem) return showToast("业务配置小分组不存在");
      state.configVersionModal = {mode:"new",configItemId:configItem.id};
      state.configSubgroupVersionId = null;
      state.configScopedItem = null;
      return render();
    }
    const configLocalItem = event.target.closest("[data-config-local-item]");
    if (configLocalItem) {
      const item = businessConfigMenuItem(configLocalItem.dataset.configLocalItem);
      if (!item) return showToast("业务配置菜单项不存在");
      state.configOverviewItem = null;
      return navigate(`${item.routeId}/${item.tabId}`);
    }
    const menuButton = event.target.closest("[data-menu-item]");
    if (menuButton) {
      const data = menuBlueprintItem(menuButton.dataset.menuItem);
      if (!data) return showToast("菜单项不存在");
      const {group,item} = data;
      state.menuActiveGroupId = group.id;
      state.menuOpenGroups = new Set([group.id]);
      if (item.routeId) {state.menuBlueprintId=null;return navigate(item.view ? `${item.routeId}/${item.tabId}/view=${item.view}` : `${item.routeId}/${item.tabId}`);}
      if (item.action === "audit") {state.auditOpen=true;return render();}
      state.menuBlueprintId = item.id;
      return render();
    }
    const menuGroup = event.target.closest("[data-menu-group]");
    if (menuGroup) {
      const id = menuGroup.dataset.menuGroup;
      if (id === "dashboard") {
        state.menuActiveGroupId = id;
        state.menuOpenGroups = new Set();
        return navigate("admin-workbench");
      }
      const isOpen = state.menuOpenGroups.has(id);
      state.menuOpenGroups = new Set(isOpen ? [] : [id]);
      state.menuActiveGroupId = isOpen ? null : id;
      return render();
    }
    if (event.target.closest("[data-toggle-demo]")) {state.demoOpen=!state.demoOpen;return render();}
    const cockpitSignal = event.target.closest("[data-cockpit-kind]");
    if (cockpitSignal) {
      const id = cockpitSignal.dataset.cockpitId;
      const kind = cockpitSignal.dataset.cockpitKind;
      if (kind === "risk") {
        state.riskCaseId = id;
        return render();
      }
      if (kind === "integration") {
        state.integrationSystemId = id;
        return navigate("admin-review/integration");
      }
      if (kind === "report") {
        state.reportDimensionId = id;
        return navigate("admin-performance/guarantee-coverage");
      }
      if (kind === "task") {
        const task = seedRows().find(row => row.id === id);
        if (task?.sourceRoute) return navigate(`${task.sourceRoute}/${task.sourceTab}`);
        return navigate("admin-workbench/tasks");
      }
      if (kind === "governance") return navigate("admin-review/integration");
      if (kind === "notification") {
        const record = prototype.notifications.find(item => item.id === id);
        if (record) return navigate(`${record.route}/${record.tab}`);
      }
      if (kind === "audit") {
        state.auditOpen = true;
        state.auditKeyword = id;
        return render();
      }
      return showToast("信号对象不存在");
    }
    const configVersionSearch = event.target.closest("[data-config-version-search]");
    if (configVersionSearch) {state.configVersionDraftSearch = configVersionSearch.value;return;}
    const configVersionStatus = event.target.closest("[data-config-version-status]");
    if (configVersionStatus) {state.configVersionDraftStatus = configVersionStatus.value;return;}
    if (event.target.closest("[data-config-version-query]")) {
      state.configVersionSearch = state.configVersionDraftSearch;
      state.configVersionStatus = state.configVersionDraftStatus;
      return render();
    }
    if (event.target.closest("[data-config-version-reset]")) {
      state.configVersionSearch = ""; state.configVersionDraftSearch = "";
      state.configVersionStatus = ""; state.configVersionDraftStatus = "";
      return render();
    }
    if (event.target.closest("[data-config-system-open]")) return navigate("admin-system-config/system");
    if (event.target.closest("[data-config-version-open-page]")) return navigate("admin-config/overview");
    const configItemNavigate = event.target.closest("[data-config-item-navigate]");
    if (configItemNavigate) return navigate(`admin-config/${configItemNavigate.dataset.configItemNavigate}`);
    const configItemOpen = event.target.closest("[data-config-item-open]");
    if (configItemOpen) {state.configOverviewItem = configItemOpen.dataset.configItemOpen;return render();}
    const configItemVersions = event.target.closest("[data-config-item-versions]");
    if (configItemVersions) {
      const item = configOverviewItems().find(row => row.id === configItemVersions.dataset.configItemVersions);
      const menuItem = configMenuItemForOverview(item);
      if (!menuItem) return showToast("配置小组不存在");
      state.configOverviewItem = null;
      state.configSubgroupVersionId = null;
      return navigate(`${menuItem.routeId}/${menuItem.tabId}`);
    }
    const configItemRollback = event.target.closest("[data-config-item-rollback]");
    if (configItemRollback) {
      if (state.tabId === "overview") return showToast("配置总览仅支持查看，请进入配置小组操作版本");
      const item = configOverviewItems().find(row => row.id === configItemRollback.dataset.configItemRollback);
      const source = configItemCurrentVersion(item);
      if (!source) return showToast("当前版本不存在");
      state.configVersionModal = {mode:"rollback",id:source.id};
      state.configOverviewItem = null;
      return render();
    }
    const configVersionOpen = event.target.closest("[data-config-version-open]");
    if (configVersionOpen) {
      const item = configVersionById(configVersionOpen.dataset.configVersionOpen);
      if (item?.configItemId) state.configSubgroupVersionId = item.id;
      else state.configVersionId = item?.id;
      return render();
    }
    const configVersionEdit = event.target.closest("[data-config-version-edit]");
    if (configVersionEdit) {state.configVersionModal = {mode:"edit",id:configVersionEdit.dataset.configVersionEdit};state.configVersionId=null;return render();}
    const configVersionCopy = event.target.closest("[data-config-version-copy]");
    if (configVersionCopy) {state.configVersionModal = {mode:"copy",id:configVersionCopy.dataset.configVersionCopy};state.configVersionId=null;return render();}
    const configVersionAction = event.target.closest("[data-config-version-action]");
    if (configVersionAction) {
      const action = configVersionAction.dataset.configVersionAction;
      const id = configVersionAction.dataset.configVersionId;
      if (action === "view") {
        const item = configVersionById(id);
        if (item?.configItemId) state.configSubgroupVersionId = id;
        else state.configVersionId = id;
        state.configScopedItem = null;
        return render();
      }
      if (action === "copy") {state.configVersionModal = {mode:"copy",id};state.configVersionId=null;return render();}
      if (action === "edit") {
        const item = configVersionById(id);
        if (item?.locked || item?.status !== "draft") return showToast("版本已锁定或不是草稿，请复制为新版本后修改");
        state.configVersionModal = {mode:"edit",id};state.configVersionId=null;return render();
      }
      if (action === "rollback") {
        state.configVersionModal = {mode:"rollback",id};state.configVersionId=null;return render();
      }
      if (["withdraw","void","activate","schedule"].includes(action)) {state.configActionModal = {action,id};state.configVersionId=null;return render();}
    }
    if (event.target.closest("[data-config-version-new]")) {
      const item = businessConfigItemForTab();
      if (!item) return showToast("请先进入具体配置小组创建版本");
      state.configVersionModal = {mode:"new",configItemId:item.id};state.configVersionId=null;return render();
    }
    if (event.target.closest("[data-close-config-overview-version]")) {state.configOverviewVersionId=null;state.configOverviewVersionItemId=null;return render();}
    if (event.target.closest("[data-close-config-item]")) {state.configOverviewItem=null;return render();}
    if (event.target.closest("[data-close-config-scoped]")) {state.configScopedItem=null;state.configVersionMenuId=null;return render();}
    if (event.target.closest("[data-close-config-version]")) {state.configVersionId=null;return render();}
    if (event.target.closest("[data-close-config-version-modal]")) {state.configVersionModal=null;return render();}
    if (event.target.closest("[data-config-save]")) return saveConfigSubgroup(event);
    if (event.target.closest("[data-submit-config-version]")) return submitConfigVersion();
    if (event.target.closest("[data-close-config-action]")) {state.configActionModal=null;return render();}
    if (event.target.closest("[data-submit-config-action]")) return submitConfigAction();
    const systemConfigReset = event.target.closest("[data-system-config-reset]");
    if (systemConfigReset) {delete state.systemConfigDrafts[systemConfigReset.dataset.systemConfigReset];return render();}
    if (event.target.closest("[data-system-config-publish]")) return publishSystemConfig();
    if (event.target.closest("[data-close-system-config-confirm]")) {state.systemConfigConfirm=null;return render();}
    if (event.target.closest("[data-submit-system-config-confirm]")) return submitSystemConfigConfirm();
    if (event.target.closest("[data-close-system-config-publish-confirm]")) {state.systemConfigPublishConfirm=false;return render();}
    if (event.target.closest("[data-submit-system-config-publish-confirm]")) return submitSystemConfigPublishConfirm();
    if (event.target.closest("[data-system-config-history]")) {
      const history = state.systemConfigHistory.length ? state.systemConfigHistory.map(item => `${item.time} · ${item.name} · ${item.previous} → ${item.next}`).join("；") : "暂无本次会话变更记录";
      return showToast(history);
    }
    if (event.target.closest("[data-close-search]")) {state.searchOpen=false;return render();}
    const searchButton = event.target.closest("[data-open-search]");
    if (searchButton) return openGlobalSearch();
    const searchType = event.target.closest("[data-search-type]");
    if (searchType) {state.searchType=searchType.dataset.searchType;state.searchActiveIndex=-1;return render();}
    const recentSearch = event.target.closest("[data-search-recent]");
    if (recentSearch) {state.searchKeyword=recentSearch.dataset.searchRecent;state.searchType="all";state.searchActiveIndex=-1;return render();}
    if (event.target.closest("[data-clear-search-recent]")) {state.searchRecent=[];persistRecentSearches();return render();}
    const searchResult = event.target.closest("[data-search-result]");
    if (searchResult) {
      const item = currentSearchResults()[Number(searchResult.dataset.searchResult)];
      if (!item) return showToast("搜索结果不存在");
      state.searchOpen=false;
      item.action();
      return render();
    }
    if (event.target.closest("[data-close-audit]")) {state.auditOpen=false;return render();}
    const auditButton = event.target.closest("[data-open-audit]");
    if (auditButton) {state.auditOpen=true;return render();}
    if (event.target.closest("[data-close-release]")) {state.releaseId=null;state.releaseModal=null;return render();}
    const releaseOpen = event.target.closest("[data-release-open]");
    if (releaseOpen) {
      state.releaseId = releaseOpen.dataset.releaseOpen;
      state.releaseModal = null;
      return render();
    }
    const releaseAction = event.target.closest("[data-release-action]");
    if (releaseAction) {
      const item = releasePackage();
      const action = item ? releaseActions[releaseAction.dataset.releaseAction] : null;
      if (!item || !action || !action.roles.includes(state.role)) return showToast("当前角色无权执行配置治理动作");
      state.releaseModal = {action:releaseAction.dataset.releaseAction};
      return render();
    }
    if (event.target.closest("[data-close-release-modal]")) {state.releaseModal=null;return render();}
    if (event.target.closest("[data-submit-release]")) return submitReleaseAction();
    if (event.target.closest("[data-close-risk-case]")) {state.riskCaseId=null;state.riskCaseModal=null;return render();}
    const riskCaseOpen = event.target.closest("[data-risk-case-open]");
    if (riskCaseOpen) {state.riskCaseId=riskCaseOpen.dataset.riskCaseOpen;state.riskCaseModal=null;return render();}
    const riskCaseAction = event.target.closest("[data-risk-case-action]");
    if (riskCaseAction) {
      const item = riskCase();
      const action = item ? riskCaseActions[riskCaseAction.dataset.riskCaseAction] : null;
      if (!item || !action || !action.roles.includes(state.role)) return showToast("当前角色无权执行风险案件动作");
      state.riskCaseModal = {action:riskCaseAction.dataset.riskCaseAction};
      return render();
    }
    if (event.target.closest("[data-close-risk-modal]")) {state.riskCaseModal=null;return render();}
    if (event.target.closest("[data-submit-risk-case]")) return submitRiskCaseAction();
    const commissionAction = event.target.closest("[data-commission-action]");
    if (commissionAction) {
      return openUnifiedTasks("risk_review");
    }
    const reportDrilldown = event.target.closest("[data-report-drilldown]");
    if (reportDrilldown) {state.reportDimensionId=reportDrilldown.dataset.reportDrilldown;return render();}
    if (event.target.closest("[data-close-report-drilldown]")) {state.reportDimensionId=null;return render();}
    const reportRiskCase = event.target.closest("[data-report-risk-case]");
    if (reportRiskCase) {state.reportDimensionId=null;state.riskCaseId=reportRiskCase.dataset.reportRiskCase;return render();}
    const reportSuggestion = event.target.closest("[data-report-suggestion]");
    if (reportSuggestion) {state.reportDimensionId=reportSuggestion.dataset.reportSuggestion;state.reportSuggestion={dimensionId:state.reportDimensionId};return render();}
    if (event.target.closest("[data-close-report-suggestion]")) {state.reportSuggestion=null;return render();}
    if (event.target.closest("[data-submit-report-suggestion]")) return submitReportSuggestion();
    const taskExportApproval = event.target.closest("[data-task-export-approval]");
    if (taskExportApproval) {
      state.reportExportOpen=false;
      return navigate(`workbench?tab=approvals&approval_id=${encodeURIComponent(taskExportApproval.dataset.taskExportApproval)}`);
    }
    if (event.target.closest("[data-open-report-export]")) {state.reportExportOpen=true;return render();}
    if (event.target.closest("[data-close-report-export]")) {
      if (state.reportExportEntry === "exports") {
        state.reportExportOpen = false;
        state.reportExportEntry = null;
        return navigate("admin-review/integration");
      }
      state.reportExportOpen = false;
      return render();
    }
    if (event.target.closest("[data-create-report-export]")) return createReportExport();
    const reportDownload = event.target.closest("[data-report-export-download]");
    if (reportDownload) {
      const task = prototype.exportTasks.find(item=>item.id===reportDownload.dataset.reportExportDownload);
      if (!task || task.status !== "ready" || !(task.approvalStatus==="approved" || (demoSkipsApproval() && task.approvalStatus==="not_required"))) return showToast(demoSkipsApproval() ? "导出文件尚未生成" : "导出文件尚未完成审批");
      const currentUser=prototype.taskQueue?.options?.(state.role)?.current_user;
      if (!task.applicant?.user_id || task.applicant.user_id!==currentUser?.user_id) return showToast("请使用申请此导出的员工身份下载");
      if(Date.parse(task.expiresAt)<=Date.now())return showToast("导出文件已过期，请重新申请");
      if(!task.content)return showToast("此历史导出未保留文件内容，请重新生成");
      downloadAdminFile(`${task.id}.json`,task.content,"application/json");
      return showToast("下载已开始");
    }
    const riskExportDownload = event.target.closest("[data-risk-export-download]");
    if (riskExportDownload) {
      const record = (prototype.riskWorkbenchExports || []).find(item => item.export_id === riskExportDownload.dataset.riskExportDownload);
      const currentUser = prototype.taskQueue?.options?.(state.role)?.current_user || {user_id:state.role};
      if (!record || record.status !== "ready" || !(record.approval_status === "approved" || (demoSkipsApproval() && record.approval_status === "not_required"))) return showToast(demoSkipsApproval() ? "导出文件尚未生成" : "导出文件尚未完成审批");
      if (record.expires_at && Date.parse(record.expires_at) <= Date.parse(prototype.riskWorkbench?.serverNow || createDate(0))) {
        record.status = "expired";
        return showToast("导出文件已过期，请重新申请");
      }
      if (!(record.download_roles || []).includes(state.role) && record.applicant?.user_id !== currentUser.user_id) return showToast("当前角色无权下载此导出");
      const csv = riskExportCsv(record);
      const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${record.export_id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url),1000);
      record.download_count = (record.download_count || 0) + 1;
      integrationAudit("下载风险工作台导出",`${record.export_id} / ${record.row_count}行`,"succeeded",`trace-${record.export_id}-download`,{export_id:record.export_id,download_count:record.download_count,time:prototype.riskWorkbench?.serverNow || createDate(0)});
      return showToast("导出文件已下载 · 审计已记录");
    }
    const reportCancel = event.target.closest("[data-report-export-cancel]");
    if (reportCancel) {
      const task = prototype.exportTasks.find(item=>item.id===reportCancel.dataset.reportExportCancel);
      if (!task || ["expired","cancelled"].includes(task.status)) return showToast("任务不可取消");
      task.status = "cancelled";
      return showToast("导出任务已取消 · 审计已记录");
    }
    const integrationSystemButton = event.target.closest("[data-integration-system]");
    if (integrationSystemButton) {state.integrationSystemId=integrationSystemButton.dataset.integrationSystem;return render();}
    if (event.target.closest("[data-close-integration-system]")) {state.integrationSystemId=null;return render();}
    const integrationRecheck = event.target.closest("[data-integration-recheck]");
    if (integrationRecheck) {
      const value = integrationRecheck.dataset.integrationRecheck;
      return runIntegrationRecheck(value === "1" ? null : value);
    }
    const integrationBackfill = event.target.closest("[data-integration-backfill]");
    if (integrationBackfill) return backfillIntegrationGap(integrationBackfill.dataset.integrationBackfill);
    const integrationRetry = event.target.closest("[data-integration-retry]");
    if (integrationRetry) return retryIntegrationTask(integrationRetry.dataset.integrationRetry);
    const integrationCancel = event.target.closest("[data-integration-cancel]");
    if (integrationCancel) return cancelIntegrationTask(integrationCancel.dataset.integrationCancel);
    const governanceButton = event.target.closest("[data-governance-action]");
    if (governanceButton) {
      const actionId = governanceButton.dataset.governanceAction;
      const action = governanceActions[actionId];
      const target = governanceTarget(actionId,governanceButton.dataset.governanceTarget);
      const demoOwnExport = demoSkipsApproval() && actionId === "approve_export" && target?.item.applicant?.user_id === prototype.taskQueue?.options?.(state.role)?.current_user?.user_id;
      if (!action || (!action.roles.includes(state.role) && !demoOwnExport)) return showToast("当前角色无权执行数据治理动作");
      state.governanceModal = {action:governanceButton.dataset.governanceAction,target:governanceButton.dataset.governanceTarget};
      return render();
    }
    if (event.target.closest("[data-close-governance-modal]")) {state.governanceModal=null;return render();}
    if (event.target.closest("[data-submit-governance]")) return submitGovernanceAction();
    if (event.target.closest("[data-close-notifications]")) {state.notificationOpen=false;state.notificationMonitorOpen=false;return render();}
    if (event.target.closest("[data-open-notifications]")) {state.notificationOpen=true;return render();}
    if (event.target.closest("[data-notification-monitor]")) {state.notificationMonitorOpen=!state.notificationMonitorOpen;return render();}
    if (event.target.closest("[data-open-notification-monitor]")) {state.notificationOpen=true;state.notificationMonitorOpen=true;return render();}
    const notificationRetry = event.target.closest("[data-notification-retry]");
    if (notificationRetry) {
      const notificationId = notificationRetry.dataset.notificationRetry;
      const entries = (prototype.notificationOutbox || []).filter(item => item.notificationId === notificationId && item.status === "failed");
      if (!entries.length) return showToast("没有可重试的投递记录");
      entries.forEach(entry => {
        entry.attempts = Number(entry.attempts || 0) + 1;
        entry.lastAttemptAt = prototype.riskWorkbench?.serverNow || createDate(0);
        entry.status = "sent";
        entry.error = null;
      });
      const record = prototype.notifications.find(item => item.id === notificationId);
      prototype.auditRecords.unshift({id:`audit-${Date.now().toString(36)}`,time:createDate(0),action:"重试通知投递",object:notificationId,operator:roleOwnerNames[state.role] || "系统",result:"success",trace_id:`trace-${notificationId}-retry`,self_review:false});
      return showToast(`通知已重新投递 · ${record?.title || notificationId} · 未重复执行业务`);
    }
    if (event.target.closest("[data-close-permissions]")) {state.permissionOpen=false;return render();}
    if (event.target.closest("[data-open-permissions]")) {state.permissionOpen=true;return render();}
    const markNotification = event.target.closest("[data-mark-notification]");
    if (markNotification) {
      const record = prototype.notifications.find(item => item.id === markNotification.dataset.markNotification);
      if (record) record.unread = false;
      return render();
    }
    const notificationLink = event.target.closest("[data-notification-link]");
    if (notificationLink) {
      const record = prototype.notifications.find(item => item.id === notificationLink.dataset.notificationLink);
      if (!record) return showToast("通知不存在");
      record.unread = false; state.notificationOpen = false;
      return navigate(`${record.route}/${record.tab}`);
    }
    const openTab = event.target.closest("[data-open-tab]");
    if (openTab) {
      const saved=state.openTabs.find(item=>item.routeId===openTab.dataset.openTab&&item.tabId===openTab.dataset.openTabId);
      return navigate(saved?.hash || `${openTab.dataset.openTab}/${openTab.dataset.openTabId}`);
    }
    const closeTab = event.target.closest("[data-close-tab]");
    if (closeTab) {
      const closedId = closeTab.dataset.closeTab;
      state.openTabs = state.openTabs.filter(item => item.id !== closedId);
      if (closedId === `${state.routeId}:${state.tabId}`) {
        const next = state.openTabs[state.openTabs.length - 1] || {routeId:"admin-workbench",tabId:"tasks"};
        return navigate(next.hash || `${next.routeId}/${next.tabId}`);
      }
      return render();
    }
    const cockpitViewButton = event.target.closest("[data-cockpit-view]");
    if (cockpitViewButton) {
      state.cockpitView = cockpitViewButton.dataset.cockpitView;
      if (state.routeId === "admin-workbench") {
        return navigate(state.cockpitView === "tasks" ? `${state.routeId}/${state.tabId}` : `${state.routeId}/${state.tabId}/view=${state.cockpitView}`);
      }
      return render();
    }
    const partnerStageButton = event.target.closest("[data-partner-stage]");
    if (partnerStageButton) {
      const stageId = partnerStageButton.dataset.partnerStage;
      if (state.filters.deepStage === stageId) delete state.filters.deepStage; else state.filters.deepStage = stageId;
      state.draftFilters = {...state.filters};state.page = 1;
      return render();
    }
    const partnerViewButton = event.target.closest("[data-partner-view]");
    if (partnerViewButton) {
      const viewId = partnerViewButton.dataset.partnerView;
      return navigate(viewId === "all" ? "admin-modules/partner-list" : `admin-modules/partner-list/view=${viewId}`);
    }
    const partner360Tab = event.target.closest("[data-partner360-tab]");
    if (partner360Tab) {state.partner360Tab = partner360Tab.dataset.partner360Tab;return render();}
    const partnerReview = event.target.closest("[data-partner-review]");
    if (partnerReview) {
      const action = partnerReviewActions[partnerReview.dataset.partnerReview];
      if (!action || !action.roles.includes(state.role)) return showToast("当前角色无权执行入驻审核");
      state.partnerReview = {action:partnerReview.dataset.partnerReview,target:partnerReview.dataset.partnerTarget};
      return render();
    }
    if (event.target.closest("[data-close-partner-review]")) {state.partnerReview=null;return render();}
    if (event.target.closest("[data-submit-partner-review]")) return submitPartnerReview();
    const partnerOffboardInit = event.target.closest("[data-partner-offboard-init]");
    if (partnerOffboardInit) {state.partnerOffboard = {target:partnerOffboardInit.dataset.partnerOffboardInit};return render();}
    if (event.target.closest("[data-close-partner-offboard]")) {state.partnerOffboard=null;return render();}
    if (event.target.closest("[data-submit-partner-offboard]")) return submitPartnerOffboard();
    if (event.target.closest("[data-partner-resume]")) {
      const partner = prototype.partner360.partners.find(item => item.id === event.target.closest("[data-partner-resume]").dataset.partnerResume);
      if (!partner) return showToast("合作方不存在");
      if (state.role !== "risk" && state.role !== "risk_supervisor") return showToast("仅风控可结束观察期");
      partner.stage = "onboarded";partner.status = "active";partner.updated = createDate(0);partner.watchReason = "";
      prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"结束观察期",object:`${partner.name} / ${partner.id}`,operator:roleOwnerNames[state.role],result:"active",trace_id:`trace-${partner.id}`,self_review:false});
      dataStore["admin-modules:partner-list"] = null;
      return showToast("观察期已结束 · 状态恢复正常");
    }
    const partnerCreditLink = event.target.closest("[data-partner-credit-link]");
    if (partnerCreditLink) return navigate("admin-risk/credit-insight");
    const partnerGuaranteeLink = event.target.closest("[data-partner-guarantee-link]");
    if (partnerGuaranteeLink) return navigate("admin-review/guarantee-offset");
    const partnerSyncTask = event.target.closest("[data-partner-sync-task]");
    if (partnerSyncTask) return navigate("admin-review/integration");
    const partnerNote = event.target.closest("[data-partner-note]");
    if (partnerNote) {state.partnerNoteTarget = partnerNote.dataset.partnerNote;return render();}
    if (event.target.closest("[data-close-partner-note]")) {state.partnerNoteTarget=null;return render();}
    if (event.target.closest("[data-submit-partner-note]")) return addPartnerNote();
    // 行内动作列（操作优先标准）
    const rowActionBtn = event.target.closest("[data-row-action]");
    if (rowActionBtn) {
      event.stopPropagation();
      const actionId = rowActionBtn.dataset.rowAction;
      const target = rowActionBtn.dataset.rowActionTarget;
      const cmd = rowActionBtn.dataset.rowActionCmd;
      if (actionId === "detail") {
        state.partner360Tab = "overview";state.client360Tab = "overview";
        if (state.routeId === "admin-modules" && state.tabId === "partner-list") {
          return navigate(`partner-360/${encodeURIComponent(target)}?tab=overview`);
        }
        if (state.routeId === "admin-modules" && state.tabId === "client-list") {
          return navigate(`admin-modules/client-list/${encodeURIComponent(target)}`);
        }
        if (state.routeId === "admin-modules" && state.tabId === "event-stream") {
          state.eventChainId = target || null;
          if (state.eventChainId) return render();
        }
        return navigate(`${basePath()}/${target}`);
      }
      if (actionId === "open_chain") {state.eventChainId = target;return render();}
      if (actionId === "partner_review") {
        const partner = prototype.partner360.partners.find(item => item.id === target);
        if (!partner) return showToast("合作方不存在");
        state.partner360Tab="onboarding";
        return navigate(`admin-modules/partner-list/${encodeURIComponent(target)}?drawer_tab=onboarding&review=1`);
      }
      if (actionId === "partner_resume") {
        const partner = prototype.partner360.partners.find(item => item.id === target);
        if (!partner) return showToast("合作方不存在");
        if (state.role !== "risk" && state.role !== "risk_supervisor") return showToast("仅风控可结束观察期");
        partner.stage = "onboarded";partner.status = "active";partner.updated = createDate(0);partner.watchReason = "";
        prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"结束观察期",object:`${partner.name} / ${partner.id}`,operator:roleOwnerNames[state.role],result:"active",trace_id:`trace-${partner.id}`,self_review:false});
        dataStore["admin-modules:partner-list"] = null;
        return showToast("观察期已结束 · 状态恢复正常");
      }
      if (actionId === "client_review") {
        if (!["risk","risk_supervisor","operations","compliance"].includes(state.role)) return showToast("当前角色无权生成风险复核");
        state.clientRiskReview = target;
        return render();
      }
      if (actionId === "attr_exc_process") return navigate("admin-modules/attribution-links/view=exception");
      if (actionId === "primary_claim" && cmd) return openAction(cmd,target);
      // 组4：推广管理行内动作
      if (actionId === "link_toggle" || actionId === "sub_toggle") {
        if (!["operations","compliance"].includes(state.role)) return showToast("仅运营/合规可启停链接与渠道");
        if (actionId === "link_toggle") {
          const link = prototype.link360.links.find(item => item.id === target);
          if (!link) return showToast("链接不存在");
          link.status = link.status === "active" ? "paused" : "active";
          link.updated = createDate(0);
          prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:link.status === "active" ? "启用链接" : "停用链接",object:`${link.name} / ${link.id}`,operator:roleOwnerNames[state.role],result:link.status,trace_id:`trace-${link.id}`,self_review:false});
        } else {
          const sub = prototype.link360.subChannels.find(item => item.id === target);
          if (!sub) return showToast("渠道不存在");
          sub.status = sub.status === "active" ? "paused" : "active";
          sub.updated = createDate(0);
          prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:sub.status === "active" ? "恢复渠道" : "暂停渠道",object:`${sub.subId} / ${sub.id}`,operator:roleOwnerNames[state.role],result:sub.status,trace_id:`trace-${sub.id}`,self_review:false});
        }
        dataStore["admin-modules:link-list"] = null;
        return showToast(actionId === "link_toggle" ? "链接状态已更新" : "渠道状态已更新");
      }
      if (actionId === "mat_review" || actionId === "mat_offline") {
        if (!["operations","compliance"].includes(state.role)) return showToast("仅运营/合规可处理素材");
        const mat = prototype.materialCatalog.items.find(item => item.id === target);
        if (!mat) return showToast("素材不存在");
        if (actionId === "mat_review") {state.materialReviewTarget = target;return render();}
        mat.state = "offline";mat.uploadedAt = createDate(0);
        prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"素材下架",object:`${mat.name} / ${mat.id}`,operator:roleOwnerNames[state.role],result:"offline",trace_id:`trace-${mat.id}`,self_review:false});
        dataStore["admin-modules:material-list"] = null;
        return showToast("素材已下架");
      }
      if (actionId === "pb_test") {
        if (!["operations","system_admin"].includes(state.role)) return showToast("仅运营/系统可试投");
        state.postbackTest = target;
        return render();
      }
      if (actionId === "pb_toggle") {
        if (!["operations","system_admin"].includes(state.role)) return showToast("仅运营/系统可启停回传");
        const pb = prototype.postbackCatalog.configs.find(item => item.id === target);
        if (!pb) return showToast("配置不存在");
        pb.status = pb.status === "active" ? "paused" : "active";
        pb.updatedAt = createDate(0);
        prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:pb.status === "active" ? "恢复回传" : "暂停回传",object:`${pb.name} / ${pb.id}`,operator:roleOwnerNames[state.role],result:pb.status,trace_id:`trace-${pb.id}`,self_review:false});
        dataStore["admin-modules:postback"] = null;
        return showToast("回传配置状态已更新");
      }
      if (actionId === "tracker_path") {state.trackerSessionId = target;return render();}
      // 组5-9：资金/治理/配置行内动作
      if (actionId === "fund_approve" || actionId === "fund_retry" || actionId === "fund_export") {
        if(actionId==="fund_export")return downloadStatement(target);
        const row=seedRows().find(item=>item.id===target);
        if(!row?.fundRef)return showToast("资金记录不存在，请刷新列表");
        return openPartnerFollowup(row.fundRef.partner,"finance",`${target}：${actionId==="fund_retry"?"请核验支付结果及重复支付风险，再申请重试":"请核对原始账务与处理条件"}。`,state.tabId==="withdrawal-list"?target:null);
      }
      if (actionId === "bl_review") {
        if (!["risk","risk_supervisor"].includes(state.role)) return showToast("仅风控可发起黑名单复核");
        const item = prototype.riskGovernance.blacklist.find(b => b.id === target);
        if (!item) return showToast("对象不存在");
        prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:item.status === "pending_review" ? "黑名单加入复核" : "黑名单移出复核",object:`${item.name} / ${item.id}`,operator:roleOwnerNames[state.role],result:"pending",trace_id:`trace-${item.id}`,self_review:false});
        return showToast(`黑名单复核任务已生成（${item.name}）→ 处理中心`);
      }
      if (actionId === "tk_claim") {
        if (!["operations","compliance"].includes(state.role)) return showToast("仅运营/合规可受理工单");
        const ticket = prototype.riskGovernance.tickets.find(t => t.id === target);
        if (!ticket) return showToast("工单不存在");
        ticket.status = "processing";ticket.updated = createDate(0);
        dataStore["admin-modules:support-ticket"] = null;
        return showToast(`工单已受理（${ticket.id}）`);
      }
      if (actionId === "goto_appeal") return navigate("admin-review/appeal");
      if (actionId === "goto_review") return navigate("admin-review/risk-review");
      if (actionId === "goto_case") {
        state.eventTraceSearch = target;
        return navigate("admin-modules/event-stream");
      }
      if (actionId === "report_drill") {
        if (target.includes("ROI")) return navigate("admin-performance/roi");
        if (target.includes("保证金")) return navigate("admin-performance/guarantee-coverage");
        if (target.includes("税费")) return navigate("admin-modules/statement-list");
        if (target.includes("冲正")) return navigate("admin-modules/reversal-list");
        return navigate("admin-performance/roi");
      }
      if (actionId === "prm_edit") {
        const param = prototype.configSeeds.dictionary.find(d => d.id === target);
        if (!param) return showToast("参数不存在");
        if (!["system_admin","risk_supervisor"].includes(state.role)) return showToast("仅系统/风控主管可登记参数");
        state.paramDraft = target;
        return render();
      }
    }
    const clientStageButton = event.target.closest("[data-client-stage]");
    if (clientStageButton) {
      const stageId = clientStageButton.dataset.clientStage;
      if (state.filters.deepStage === stageId) delete state.filters.deepStage; else state.filters.deepStage = stageId;
      state.draftFilters = {...state.filters};state.page = 1;
      return render();
    }
    const clientViewButton = event.target.closest("[data-client-view]");
    if (clientViewButton) {
      const viewId = clientViewButton.dataset.clientView;
      return navigate(viewId === "all" ? "admin-modules/client-list" : `admin-modules/client-list/view=${viewId}`);
    }
    const client360TabBtn = event.target.closest("[data-client360-tab]");
    if (client360TabBtn) {state.client360Tab = client360TabBtn.dataset.client360Tab;return render();}
    if (event.target.closest("[data-client-risk-review]")) {state.clientRiskReview = event.target.closest("[data-client-risk-review]").dataset.clientRiskReview;return render();}
    if (event.target.closest("[data-close-client-review]")) {state.clientRiskReview=null;return render();}
    if (event.target.closest("[data-submit-client-review]")) return submitClientRiskReview();
    const clientOpenChain = event.target.closest("[data-client-open-chain]");
    if (clientOpenChain) {
      state.detailId = null;state.client360Tab = "overview";
      state.eventChainId = clientOpenChain.dataset.clientOpenChain;
      return navigate("admin-modules/event-stream");
    }
    const clientOpenAttr = event.target.closest("[data-client-open-attr]");
    if (clientOpenAttr) {
      state.detailId = null;
      return navigate("admin-modules/attribution-links");
    }
    const attrViewButton = event.target.closest("[data-attr-view]");
    if (attrViewButton) {
      const viewId = attrViewButton.dataset.attrView;
      return navigate(viewId === "all" ? "admin-modules/attribution-links" : `admin-modules/attribution-links/view=${viewId}`);
    }
    if (event.target.closest("[data-event-trace-clear]")) {state.eventTraceSearch="";return render();}
    const eventChainHit = event.target.closest("[data-event-chain]");
    if (eventChainHit) {state.eventChainId = eventChainHit.dataset.eventChain;return render();}
    if (event.target.closest("[data-close-event-chain]")) {state.eventChainId=null;return render();}
    const chainNodeTarget = event.target.closest("[data-chain-node-target]");
    if (chainNodeTarget) {
      const target = chainNodeTarget.dataset.chainNodeTarget;
      state.eventChainId = null;
      const moduleMap = {client:"client-list",link:"link-list","commission":"commission-list",hold:"hold-workbench","guarantee":"guarantee-workbench",statement:"statement-list",withdrawal:"withdrawal-list"};
      const routeKey = moduleMap[target] || target;
      return navigate(routeKey === "hold-workbench" || routeKey === "guarantee-workbench" ? `admin-review/${routeKey === "hold-workbench" ? "d-plus-n" : "guarantee-offset"}` : `admin-modules/${routeKey}`);
    }
    // 组4：推广管理组件事件
    const linkViewBtn = event.target.closest("[data-link-view]");
    if (linkViewBtn) {
      const viewId = linkViewBtn.dataset.linkView;
      return navigate(viewId === "all" ? "admin-modules/link-list" : `admin-modules/link-list/view=${viewId}`);
    }
    const matViewBtn = event.target.closest("[data-material-view]");
    if (matViewBtn) {state.materialGrid = matViewBtn.dataset.materialView === "grid";return render();}
    const matOpen = event.target.closest("[data-mat-open]");
    if (matOpen) {state.partner360Tab = "overview";state.client360Tab = "overview";return navigate(`admin-modules/material-list/${matOpen.dataset.matOpen}`);}
    if (event.target.closest("[data-close-pb-test]")) {state.postbackTest=null;return render();}
    const pbTestEvent = event.target.closest("[data-pb-test-event]");
    if (pbTestEvent) {state.pbTestEvent = pbTestEvent.dataset.pbTestEvent;return render();}
    if (event.target.closest("[data-submit-pb-test]")) {
      const pb = prototype.postbackCatalog.configs.find(item => item.id === state.postbackTest);
      if (!pb) return showToast("配置不存在");
      const eventName = state.pbTestEvent || "install";
      pb.lastTest = {time:createDate(0),result:Math.random() > 0.3 ? "success" : "failed",latencyMs:350 + Math.floor(Math.random()*400)};
      pb.updatedAt = createDate(0);
      prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:`回传试投 ${eventName}`,object:`${pb.name} / ${pb.id}`,operator:roleOwnerNames[state.role],result:pb.lastTest.result,trace_id:`trace-${pb.id}`,self_review:false});
      dataStore["admin-modules:postback"] = null;
      state.postbackTest = null;state.pbTestEvent = null;
      return showToast(`试投已发送（${eventName}）· 结果见最近试投列`);
    }
    if (event.target.closest("[data-close-tracker]")) {state.trackerSessionId=null;return render();}
    const pbTabBtn = event.target.closest("[data-postback-tab]");
    if (pbTabBtn) {state.postbackTab = pbTabBtn.dataset.postbackTab;return render();}
    if (event.target.closest("[data-close-mat-review]")) {state.materialReviewTarget=null;return render();}
    if (event.target.closest("[data-close-param-draft]")) {state.paramDraft=null;return render();}
    if (event.target.closest("[data-submit-param-draft]")) {
      const param = prototype.configSeeds.dictionary.find(d => d.id === state.paramDraft);
      if (!param) return showToast("参数不存在");
      param.state = "pending_approval";param.status = "pending_approval";param.updated = createDate(0);
      prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:"参数参考值登记",object:`${param.name} / ${param.id}`,operator:roleOwnerNames[state.role],result:"pending_approval",trace_id:`trace-${param.id}`,self_review:false});
      dataStore["admin-modules:config-dictionary"] = null;
      state.paramDraft = null;
      return showToast("参考值已提交待审批（参数字典）");
    }    if (event.target.closest("[data-submit-mat-review]")) {
      const mat = prototype.materialCatalog.items.find(item => item.id === state.materialReviewTarget);
      if (!mat) return showToast("素材不存在");
      const approve = event.target.closest("[data-submit-mat-review]").dataset.submitMatReview === "approve";
      mat.state = approve ? "active" : "rejected";
      mat.uploadedAt = createDate(0);
      prototype.auditRecords.unshift({id:`audit-${Date.now().toString().slice(-6)}`,time:createDate(0),action:approve ? "素材审核通过" : "素材驳回",object:`${mat.name} / ${mat.id}`,operator:roleOwnerNames[state.role],result:mat.state,trace_id:`trace-${mat.id}`,self_review:false});
      dataStore["admin-modules:material-list"] = null;
      state.materialReviewTarget = null;
      return showToast(approve ? "素材已上架" : "素材已驳回");
    }
    const dashboardQueue = event.target.closest("[data-dashboard-queue]");
    if (dashboardQueue) {
      state.workbenchQueue = dashboardQueue.dataset.dashboardQueue;
      state.selected = new Set();
      return render();
    }
    const dashboardStatus = event.target.closest("[data-dashboard-status]");
    if (dashboardStatus) {
      state.dashboardStatus = dashboardStatus.dataset.dashboardStatus || "";
      return render();
    }
    const dashboardTask = event.target.closest("[data-dashboard-task]");
    if (dashboardTask) return navigate(`tasks?task_id=${encodeURIComponent(dashboardTask.dataset.dashboardTask)}`);
    const dashboardExpand = event.target.closest("[data-dashboard-expand]");
    if (dashboardExpand) {
      if (state.workbenchQueue === "approvals") return navigate("workbench?tab=approvals");
      const scopes = prototype.taskQueue?.options(state.role)?.authorized_scopes || [];
      const scopeIds = scopes.map(scope => typeof scope === "string" ? scope : scope.id || scope.value);
      const preferredScope = state.workbenchQueue === "mine" ? "mine" : "authorized";
      const params = new URLSearchParams({scope:scopeIds.includes(preferredScope) ? preferredScope : scopeIds[0] || "mine"});
      if (state.workbenchQueue === "overdue") params.set("sla_state","overdue");
      if (state.workbenchQueue === "integrations") params.append("source_types","integration");
      if (state.dashboardStatus) params.set("workflow_states",state.dashboardStatus);
      return navigate(`tasks?${params}`);
    }
    if (event.target.closest("[data-dashboard-back]")) return navigate("admin-workbench");
    if (event.target.closest("[data-dashboard-clear-drill]")) {
      const [path,query=""] = location.hash.replace(/^#\/?/,"").split("?");
      const params = new URLSearchParams(query);
      ["dashboard_metric","dashboard_from","dashboard_to"].forEach(key=>params.delete(key));
      return navigate(`${path}${params.size ? `?${params}` : ""}`);
    }
    const dashboardDrill = event.target.closest("[data-dashboard-drill]");
    if (dashboardDrill) return navigate(dashboardDrill.dataset.dashboardDrill);
    const queueButton = event.target.closest("[data-queue]");
    if (queueButton) {state.workbenchQueue=queueButton.dataset.queue;state.page=1;state.selected=new Set();return render();}
    const workbenchStatus = event.target.closest("[data-workbench-status]");
    if (workbenchStatus) {
      const value = workbenchStatus.dataset.workbenchStatus;
      if (value) {
        state.filters.status = value;
        state.draftFilters.status = value;
      } else {
        delete state.filters.status;
        delete state.draftFilters.status;
      }
      state.page = 1;
      state.selected = new Set();
      return render();
    }
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) return navigate(routeButton.dataset.route);
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      const requestedTab = state.routeId === "risk-workbench" ? (riskLegacyTabMap[tabButton.dataset.tab] || tabButton.dataset.tab) : tabButton.dataset.tab;
      return navigate(`${state.routeId}/${requestedTab}`);
    }
    const actionButton = event.target.closest("[data-action-name]");
    if (actionButton) return openAction(actionButton.dataset.actionName,actionButton.dataset.target);
    const submit = event.target.closest("[data-submit-action]");
    if (submit) return submitAction();
    if (event.target.closest("[data-close-modal]")) {state.modal=null;return render();}
    if (event.target.closest("[data-close-detail]")) return navigate(basePath());
    const sort = event.target.closest("th[data-sort]");
    if (sort) {const key=sort.dataset.sort;state.sort={key,dir:state.sort.key===key&&state.sort.dir==="desc"?"asc":"desc"};return render();}
    const sourceLink = event.target.closest("[data-source-link]");
    if (sourceLink) {
      const task = seedRows().find(row => row.id === sourceLink.dataset.sourceLink);
      if (!task) return showToast("来源任务不存在");
      state.selected = new Set();
      return navigate(`${task.sourceRoute}/${task.sourceTab}/${task.sourceId}`);
    }
    const row = event.target.closest("tr[data-row]");
    const rowSelect = event.target.closest("[data-select-row]");
    if (rowSelect) {
      const id = rowSelect.dataset.selectRow;
      if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
      return render();
    }
    if (row) {
      state.partner360Tab = "overview";state.client360Tab = "overview";
      if (state.routeId === "admin-modules" && state.tabId === "partner-list") {
        return navigate(`partner-360/${encodeURIComponent(row.dataset.row)}?tab=overview`);
      }
      if (state.routeId === "admin-modules" && state.tabId === "event-stream") {
        state.eventChainId = row.dataset.traceId || null;
        if (state.eventChainId) return render();
      }
      return navigate(`${basePath()}/${row.dataset.row}`);
    }
    const pageButton = event.target.closest("[data-page]");
    if (pageButton && !pageButton.disabled) {state.page=Number(pageButton.dataset.page);return render();}
    const chip = event.target.closest("[data-remove-filter]");
    if (chip) {const key=chip.dataset.removeFilter;delete state.filters[key];delete state.draftFilters[key];state.page=1;state.selected=new Set();return render();}
    const selectAll = event.target.closest("[data-select-all]");
    if (selectAll) {const checked=selectAll.dataset.selectAll!=="1";pageRows(filteredRows()).forEach(row => checked?state.selected.add(row.id):state.selected.delete(row.id));return render();}
    const generic = event.target.closest("[data-action]");
    if (generic) {
      const type=generic.dataset.action;
      if (type==="filters-toggle") {
        state.filterPanelOpen=!state.filterPanelOpen;state.draftFilters={...state.filters};state.filterError="";
        return render();
      }
      if (type==="filters-cancel") {state.filterPanelOpen=false;state.draftFilters={...state.filters};state.filterError="";return render();}
      if (type==="filters-reset-draft") {state.draftFilters={};state.filterError="";return render();}
      if (type==="filters-clear") {state.filters={};state.draftFilters={};state.page=1;state.selected=new Set();state.filterError="";return render();}
      if (type==="query") {
        document.querySelectorAll("#admin-list-filter-panel [data-draft-filter]").forEach(input => {state.draftFilters[input.dataset.draftFilter]=input.value;});
        if (state.draftFilters.from && state.draftFilters.to && state.draftFilters.from > state.draftFilters.to) {state.filterError="开始日期不能晚于结束日期";return render();}
        state.filters=Object.fromEntries(Object.entries(state.draftFilters).filter(([,value]) => value !== ""));
        state.filterPanelOpen=false;state.filterError="";state.page=1;state.selected=new Set();return render();
      }
      if (type==="reset") {state.filters={};state.draftFilters={};state.page=1;state.activeViewId=null;return render();}
      if (type==="columns") {state.columnPanel=!state.columnPanel;return render();}
      if (type==="refresh") return showToast("数据已刷新");
      if (type==="clear-selection") {state.selected=new Set();return render();}
      if (type==="save-view") return saveCurrentView();
      if (type==="mark-all-notifications") {prototype.notifications.forEach(item=>item.unread=false);return render();}
    }
    const applyView = event.target.closest("[data-apply-view]");
    if (applyView) return applySavedView(applyView.dataset.applyView);
    const deleteView = event.target.closest("[data-delete-view]");
    if (deleteView) {deleteSavedView(deleteView.dataset.deleteView);return render();}
  });

  document.addEventListener("submit", event => {
    if (!event.target.matches("[data-system-config-form]")) return;
    event.preventDefault();
    submitSystemConfig(event.target.dataset.systemConfigForm);
    render();
  });

  document.addEventListener("input", event => {
    if (event.target.matches("[data-system-config-value]")) {
      const input = event.target;
      const item = prototype.configSeeds.system.find(row => row.id === input.dataset.systemConfigValue);
      if (!item) return;
      const value = input.type === "checkbox" ? (input.checked ? "开启" : "关闭") : input.value;
      state.systemConfigDrafts[item.id] = value;
      const section = input.closest("[data-system-config-section]");
      const changed = value !== systemConfigRawValue(item);
      section.querySelector("[data-submit-system-config]").disabled = !changed;
      section.querySelector("[data-system-config-reset]").disabled = !changed;
      const switchLabel = section.querySelector("[data-system-switch-label]");
      if (switchLabel) switchLabel.textContent = value;
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-approval-field]")) {
      if (state.riskWorkbenchAction?.kind === "approval") {
        state.riskWorkbenchAction.form[event.target.dataset.riskApprovalField] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-action-field]")) {
      if (state.riskWorkbenchAction) state.riskWorkbenchAction.form[event.target.dataset.riskActionField] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-page-jump]")) {
      const page = Number(event.target.value);
      if (Number.isFinite(page) && page > 0) state.riskWorkbenchPage = Math.floor(page);
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-filter]")) {
      state.riskWorkbenchDraftFilter[event.target.dataset.riskFilter] = event.target.multiple
        ? [...event.target.selectedOptions].map(option => option.value)
        : event.target.value;
      return;
    }
    if (event.target.matches("[data-config-version-search]")) {
      state.configVersionDraftSearch = event.target.value;
      return;
    }
    if (event.target.matches("[data-config-overview-search]")) {
      state.configOverviewDraft.search = event.target.value;
      return;
    }
    if (event.target.matches("#event-trace-input")) {
      state.eventTraceSearch = event.target.value;
      const input = event.target;
      const pos = input.selectionStart;
      render();
      const restored = document.querySelector("#event-trace-input");
      if (restored) {restored.focus();restored.setSelectionRange(pos,pos);}
      return;
    }
  });

  document.addEventListener("change", event => {
    if (event.target.matches("[data-admin-quick-filter]")) {
      const key=event.target.dataset.adminQuickFilter;
      if (event.target.value) state.filters[key]=event.target.value; else delete state.filters[key];
      state.draftFilters={...state.filters};state.filterPanelOpen=false;state.filterError="";state.page=1;state.selected=new Set();
      return render();
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-quick-filter]")) {
      const key = event.target.dataset.riskQuickFilter;
      const filter = {...state.riskWorkbenchFilter};
      if (event.target.value) filter[key] = event.target.value; else delete filter[key];
      if (key === "risk") delete filter.riskBands;
      state.riskWorkbenchDraftFilter = filter;
      return applyRiskWorkbenchFilter();
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-approval-field]")) {
      if (state.riskWorkbenchAction?.kind === "approval") {
        state.riskWorkbenchAction.form[event.target.dataset.riskApprovalField] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-action-field]")) {
      if (state.riskWorkbenchAction) {
        state.riskWorkbenchAction.form[event.target.dataset.riskActionField] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
        if (["conclusion","confirmed","risk_action","scope_mode","credit_mode"].includes(event.target.dataset.riskActionField)) return render();
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-action-case]")) {
      const action = state.riskWorkbenchAction;
      if (action) {
        const values = new Set(action.form.selected_case_refs || []);
        event.target.checked ? values.add(event.target.dataset.riskActionCase) : values.delete(event.target.dataset.riskActionCase);
        action.form.selected_case_refs = [...values];
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-action-member]")) {
      const action = state.riskWorkbenchAction;
      if (action) {
        const values = new Set(action.form.member_ids || []);
        event.target.checked ? values.add(event.target.dataset.riskActionMember) : values.delete(event.target.dataset.riskActionMember);
        action.form.member_ids = [...values];
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-action-evidence]")) {
      const action = state.riskWorkbenchAction;
      if (action) {
        const values = new Set(action.form.evidence_ids || []);
        event.target.checked ? values.add(event.target.dataset.riskActionEvidence) : values.delete(event.target.dataset.riskActionEvidence);
        action.form.evidence_ids = [...values];
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-action-checklist]")) {
      const action = state.riskWorkbenchAction;
      if (action) {
        const key = event.target.dataset.riskActionChecklist;
        const current = (action.form.checklist || []).filter(item => item.key !== key);
        current.push({key,checked:event.target.checked});
        action.form.checklist = current;
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-col]")) {
      const key = event.target.dataset.riskCol;
      const requiredByTab = {
        objects:new Set(["object","type","risk","reason","impact","work","owner","updated","actions"]),
        events:new Set(["event","type","primary","risk","reason","state","funds","work","occurred","actions"]),
        clusters:new Set(["cluster","members","features","evidence","state","risk","impact","updated","actions"]),
        blacklist:new Set(["entry","type","scope","source","reason","state","effective","actions"])
      };
      const required = requiredByTab[state.tabId] || new Set();
      if (required.has(key)) { event.target.checked = true; return; }
      const hiddenColumns = riskHiddenColumnsFor(state.tabId);
      if (event.target.checked) hiddenColumns.delete(key); else hiddenColumns.add(key);
      return render();
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-page-size]")) {
      state.riskWorkbenchPageSize = Number(event.target.value) || 20; state.riskWorkbenchPage = 1; return render();
    }
    if (state.routeId === "risk-workbench" && event.target.matches("[data-risk-filter]")) {
      state.riskWorkbenchDraftFilter[event.target.dataset.riskFilter] = event.target.multiple
        ? [...event.target.selectedOptions].map(option => option.value)
        : event.target.value;
      return;
    }
    if (event.target.matches("[data-role]")) {
      if(state.routeId==="tickets"&& !supportUI.beforeLeave("#/admin-workbench")){event.target.value=state.role;return;}
      state.role=normalizeEmployeeRole(event.target.value);
      delete window.AFF_SUPPORT_CONTEXT;
      try { sessionStorage.setItem("affiliate:admin:role",state.role); } catch {}
      state.modal=null;state.selected=new Set();state.searchRecent=loadRecentSearches();state.cockpitView=null;
      if (typeof taskQueueResetForRole === "function") taskQueueResetForRole();
      return render();
    }
    if (event.target.matches("[data-dashboard-range]")) {state.dashboardRange=event.target.value;return render();}
    if (event.target.matches("[data-p360-period]")) {state.partner360Period=event.target.value;return render();}
    if (event.target.matches("[data-scenario]")) {state.scenario=event.target.value;state.riskWorkbenchSummaryRecovered=false;return render();}
    if (event.target.matches("[data-config-version-status]")) {state.configVersionDraftStatus=event.target.value;return;}
    if (event.target.matches("[data-config-overview-draft]")) {state.configOverviewDraft[event.target.dataset.configOverviewDraft]=event.target.value;return;}
    if (event.target.matches("[data-config-overview-group], [data-config-overview-status]")) {
      if (event.target.matches("[data-config-overview-group]")) state.configOverviewGroup=event.target.value;
      else state.configOverviewStatus=event.target.value;
      state.configOverviewDraft = {search:state.configOverviewSearch,group:state.configOverviewGroup,status:state.configOverviewStatus};
      state.configOverviewFilterOpen = false;
      return render();
    }
    if (event.target.matches("[data-draft-filter]")) {state.draftFilters[event.target.dataset.draftFilter]=event.target.value;return;}
    if (event.target.matches("[data-column]")) {const key=event.target.dataset.column;event.target.checked?state.hiddenColumns.delete(key):state.hiddenColumns.add(key);return render();}
    if (event.target.matches("[data-page-size]")) {state.pageSize=Number(event.target.value);state.page=1;return render();}
    if (event.target.matches("[data-audit-keyword]")) {state.auditKeyword=event.target.value;return render();}
    if (event.target.matches("[data-search-keyword]")) {state.searchKeyword=event.target.value;return render();}
    if (event.target.matches("[data-view-name]")) {state.viewName=event.target.value;return;}
  });

  document.addEventListener("keydown", event => {
    if (state.filterPanelOpen && event.key === "Escape") {
      event.preventDefault();state.filterPanelOpen=false;state.draftFilters={...state.filters};state.filterError="";render();
      document.querySelector('[data-action="filters-toggle"]')?.focus();return;
    }
    if (event.key === "Enter" && event.target.closest("#admin-list-filter-panel")) {
      event.preventDefault();document.querySelector('#admin-list-filter-panel [data-action="query"]')?.click();return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (state.searchOpen) {state.searchOpen=false;render();}
      else openGlobalSearch();
      return;
    }
    if (state.searchOpen && event.key==="Enter" && event.target.matches("[data-search-keyword]")) {
      const keyword = event.target.value || "";
      if (keyword.trim().toLowerCase() === state.searchKeyword.trim().toLowerCase() && currentSearchResults(keyword).length) {
        const item = currentSearchResults(keyword)[0];
        state.searchOpen = false;
        item.action();
        return render();
      }
      state.searchKeyword = keyword;
      state.searchActiveIndex = -1;
      rememberRecentSearch(keyword);
      event.preventDefault();
      return render();
    }
    if (state.searchOpen && ["ArrowDown","ArrowUp"].includes(event.key)) {
      const count = currentSearchResults().length;
      if (count) {
        event.preventDefault();
        state.searchActiveIndex = event.key === "ArrowDown"
          ? Math.min(count - 1,state.searchActiveIndex + 1)
          : Math.max(0,state.searchActiveIndex - 1);
        render();
        document.querySelector(`[data-search-result="${state.searchActiveIndex}"]`)?.focus();
      }
      return;
    }
    if (state.routeId === "risk-workbench" && event.key === "Enter" && event.target.matches("[data-risk-filter]")) {
      event.preventDefault();
      applyRiskWorkbenchFilter();
      return;
    }
    if (state.riskWorkbenchDrawer && event.key === "Tab") {
      const drawer = document.querySelector(".rwb-drawer");
      const focusable = drawer ? [...drawer.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])")] : [];
      if (focusable.length) {
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
      } else {
        event.preventDefault();
      }
      return;
    }
    if (event.key==="Escape") {
      if (state.searchOpen) {state.searchOpen=false;render();}
      else if (state.modal) {state.modal=null;render();}
      else if (state.configVersionModal) {state.configVersionModal=null;render();}
      else if (state.systemConfigPublishConfirm) {state.systemConfigPublishConfirm=false;render();}
      else if (state.systemConfigConfirm) {state.systemConfigConfirm=null;render();}
      else if (state.configVersionMenuId) {state.configVersionMenuId=null;render();}
      else if (state.governanceModal) {state.governanceModal=null;render();}
      else if (state.menuBlueprintId) {state.menuBlueprintId=null;render();}
      else if (state.auditOpen) {state.auditOpen=false;render();}
      else if (state.notificationOpen) {state.notificationOpen=false;render();}
      else if (state.permissionOpen) {state.permissionOpen=false;render();}
      else if (state.releaseModal) {state.releaseModal=null;render();}
      else if (state.configVersionId) {state.configVersionId=null;render();}
      else if (state.releaseId) {state.releaseId=null;render();}
      else if (state.riskCaseModal) {state.riskCaseModal=null;render();}
      else if (state.riskCaseId) {state.riskCaseId=null;render();}
      else if (state.reportSuggestion) {state.reportSuggestion=null;render();}
      else if (state.reportExportOpen) {state.reportExportOpen=false;render();}
      else if (state.reportDimensionId) {state.reportDimensionId=null;render();}
      else if (state.integrationSystemId) {state.integrationSystemId=null;render();}
      else if (state.partnerReview) {state.partnerReview=null;render();}
      else if (state.partnerOffboard) {state.partnerOffboard=null;render();}
      else if (state.partnerNoteTarget) {state.partnerNoteTarget=null;render();}
      else if (state.clientRiskReview) {state.clientRiskReview=null;render();}
      else if (state.riskWorkbenchDrawer) {
        if (state.riskWorkbenchDrawer.id) prototype.riskWorkbench?.sensitiveAccess?.clearObject?.(state.riskWorkbenchDrawer.id);
        state.riskWorkbenchSensitiveSessions = {};
        state.riskWorkbenchAction=null;state.riskWorkbenchDrawer=null;render();
      }
      else if (state.eventChainId) {state.eventChainId=null;render();}
      else if (state.trackerSessionId) {state.trackerSessionId=null;render();}
      else if (state.postbackTest) {state.postbackTest=null;render();}
      else if (state.materialReviewTarget) {state.materialReviewTarget=null;render();}
      else if (state.paramDraft) {state.paramDraft=null;render();}
      else if (state.detailId) navigate(basePath());
    }
  });
  // Customer Service is part of the unified shell; the shared service owns authorization and writes.
  const supportUI = (() => {
    const columns = [
      ["ticket_id","工单编号",150,130],["partner","合作方",180,160],["subject","主题",240,180],
      ["category","类别",110,100],["priority","优先级",80,80],["status","状态",130,120],
      ["assignee","处理人",110,100],["first_response_due_at","首响时限",135,125],
      ["resolution_due_at","解决时限",150,135],["updated_at","更新时间",165,150],["actions","操作",160,140],
      ["created_at","创建时间",165,150],["last_public_message_preview","最近公开回复",220,180],["queue","服务队列",130,110]
    ];
    const actionNames = {claim:"认领",assign:"分派",transfer:"转办",reassign:"主管重派 / 接管",request_material:"要求补充",collaborate:"发起专业协作",guide_appeal:"引导申诉",resume:"继续处理",resolve:"标记已解决",close:"关闭工单",close_exception:"异常关闭",reopen:"重开",classify:"调整类别 / 优先级",attach_object:"关联对象",detach_object:"移除关联"};
    const objectNames = {customer:"客户",commission_case:"佣金案件",settlement_case:"结算案件",withdrawal:"提现",link:"链接",postback:"回传"};
    const taskStates = {open:"待处理",processing:"处理中",awaiting_approval:"待审批",done:"已完成",cancelled:"已取消"};
    const s = {caps:null,loading:false,rows:null,total:null,error:null,detail:null,detailError:null,detailLoading:false,
      view:null,filters:{},draft:{field:"ticket_id",keyword:""},page:1,size:20,sort:"updated_at",order:"desc",
      tab:"communication",mode:"public",audience:"support",drafts:{},advanced:false,columnPanel:false,
      visible:columns.slice(0,11).map(c=>c[0]),orderColumns:columns.map(c=>c[0]),widths:{},
      messages:[],history:[],historyCursor:null,messageCursor:null,dialog:null,form:{},formError:null,
      assignees:[],candidate:null,eligibility:null,busy:false,notice:null,newVersion:false,seq:0,detailSeq:0,
      ticketId:null,initialized:false,refreshAt:null,pendingLeave:null,expanded:false,uploading:false};
    const service = () => window.AFF_SUPPORT_SERVICE;
    const ctx = () => window.AFF_SUPPORT_CONTEXT || {role:state.role === "risk_supervisor" ? "supervisor" : state.role,user_id:state.role === "risk_supervisor" ? "U-SUPERVISOR01" : state.role === "operations" ? "U-SUPPORT01" : state.role === "finance" ? "U-FINANCE01" : `U-${state.role.toUpperCase()}01`};
    const labels = name => service()?.constants[name] || {};
    const active = () => state.routeId === "tickets";
    const count = text => Array.from(String(text || "")).length;
    const time = value => value ? new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(value)) : "—";
    const btn = (name,label,extra="") => {
      const classes=extra.match(/class="([^"]*)"/)?.[1] || "";
      return `<button type="button" class="cs-button ${classes}" data-cs="${name}" ${extra.replace(/class="[^"]*"/g,"")}>${label}</button>`;
    };
    const svg = name => `<svg viewBox="0 0 16 16" aria-hidden="true">${menuIcons[name] || menuIcons.check}</svg>`;
    const icon = (name,title,glyph,extra="") => `<button type="button" class="cs-icon" data-cs="${name}" title="${h(title)}" aria-label="${h(title)}" ${extra}>${svg(glyph)}</button>`;
    const options = (values,selected,empty="") => `${empty ? `<option value="">${h(empty)}</option>` : ""}${Object.entries(values).map(([id,label])=>`<option value="${h(id)}" ${id===selected?"selected":""}>${h(label)}</option>`).join("")}`;
    const status = value => `<span class="cs-status cs-status-${h(value)}">${h(labels("statuses")[value] || value)}</span>`;
    const capability = name => s.detail?.allowed_actions?.find(a=>a.action===name);
    const actionButton = (name,extra="") => {
      if(s.detail?.legacy_read_only)return "";
      const a = capability(name);
      return a ? btn(`action:${name}`,h(actionNames[name] || name),`${extra} ${a.enabled ? "" : `disabled title="${h(a.disabled_reason)}"`}`) : "";
    };
    const draftKey = () => `${s.ticketId}:${s.mode}:${s.mode==="internal" ? s.audience : "partner"}`;
    const currentDraft = () => s.drafts[draftKey()] ||= {body:"",files:[]};
    const hasDraft = () => Object.values(s.drafts).some(d=>d.body.trim() || d.files.length) || Object.values(s.actionDrafts||{}).some(d=>d.body?.trim()||d.files?.length) || (s.dialog && Object.entries(s.form).some(([k,v])=>["body","public_body","reason","object_id","assignee_id"].includes(k)&&v));
    const layoutKey = () => `affiliate:cs:v0.1:${ctx().user_id}:layout`;
    const errorMarkup = (error,retry="retry") => error ? `<div class="cs-error" role="alert"><strong>${h(error.message || "加载失败")}</strong><span>${h(error.code || "LOCAL_ERROR")} · trace ${h(error.trace_id || "CS-LOCAL")}</span>${btn(retry,"重试")}</div>` : "";
    async function api(op,params={}) {
      const response=await service().request(op,params,ctx());
      s.serverNow=response.server_now;
      s.lastTrace=response.trace_id;
      return response.data;
    }
    function paint() {
      if (!active()) return;
      const el = document.activeElement;
      const key = el?.getAttribute("data-cs-field");
      const selection = key && typeof el.selectionStart === "number" ? el.selectionStart : null;
      const scroll = document.querySelector(".cs-drawer-scroll")?.scrollTop;
      const tableScroll = document.querySelector(".cs-table-scroll")?.scrollLeft;
      render();
      if (scroll != null && document.querySelector(".cs-drawer-scroll")) document.querySelector(".cs-drawer-scroll").scrollTop=scroll;
      if (tableScroll != null && document.querySelector(".cs-table-scroll")) document.querySelector(".cs-table-scroll").scrollLeft=tableScroll;
      if (key) {
        const restored = [...document.querySelectorAll("[data-cs-field]")].find(n=>n.dataset.csField===key);
        restored?.focus({preventScroll:true});
        if (selection!=null && restored?.setSelectionRange && ["text","search","textarea"].includes(restored.type)) restored.setSelectionRange(selection,selection);
      }
    }
    function url() {
      const p = new URLSearchParams();
      p.set("view",s.view || "mine");
      for (const [key,value] of Object.entries(s.filters)) if (Array.isArray(value)) value.forEach(v=>p.append(key,v)); else if(value) p.set(key,value);
      if(s.page>1)p.set("page",s.page);
      if(s.size!==20)p.set("page_size",s.size);
      if(s.sort!=="updated_at" || s.order!=="desc"){p.set("sort_by",s.sort);p.set("sort_order",s.order);}
      if(s.ticketId)p.set("ticket_id",s.ticketId);
      history.replaceState(null,"",`#/tickets?${p}`);
      acceptedHash=location.hash;
    }
    async function query(writeUrl=true) {
      const seq=++s.seq;s.loading=true;s.error=null;paint();
      try {
        const data=await api("list",{...s.filters,view:s.view,page:s.page,page_size:s.size,sort_by:s.sort,sort_order:s.order});
        if(seq!==s.seq)return;
        s.rows=data.items || data.tickets || [];s.total=data.total;s.page=data.page || s.page;s.querySnapshot=data.query_snapshot_at;
        const max=Math.max(1,Math.ceil(s.total/s.size));
        if(s.page>max){s.page=max;return query(writeUrl);}
        s.refreshAt=new Date().toISOString();if(writeUrl)url();
      } catch(e) {if(seq===s.seq)s.error=e;}
      finally {if(seq===s.seq){s.loading=false;paint();}}
    }
    async function init() {
      s.initialized=true;s.loading=true;
      try {
        if(!service())throw Object.assign(new Error("客户服务数据层未加载"),{code:"SERVICE_UNAVAILABLE"});
        const p=new URLSearchParams(location.hash.split("?")[1] || "");
        s.caps=await api("capabilities",{ticket_id:p.get("ticket_id")||undefined,collaboration_id:ctx().collaboration_id});
        s.view=p.get("partner_id") ? "all" : p.get("view") || s.caps.default_view || "mine";
        for(const k of ["partner_id","subject","assignee_id","queue_id","created_from","created_to"])if(p.has(k))s.filters[k]=p.get(k);
        for(const k of ["category","status","priority"])if(p.has(k))s.filters[k]=p.getAll(k);
        s.page=Math.max(1,Number(p.get("page"))||1);s.size=[10,20,50].includes(Number(p.get("page_size"))) ? Number(p.get("page_size")) : 20;
        s.sort=p.get("sort_by")||"updated_at";s.order=p.get("sort_order")||"desc";s.draft={field:"ticket_id",keyword:"",...s.filters};
        try{const saved=JSON.parse(localStorage.getItem(layoutKey())||"null");if(saved){s.visible=saved.visible.filter(k=>columns.some(c=>c[0]===k));s.orderColumns=saved.order;s.widths=saved.widths || {};if(!p.has("page_size"))s.size=saved.size || s.size;}}catch{}
        if(!s.caps.context_only)await query(false);
        if(p.get("ticket_id"))await open(p.get("ticket_id"),false);
        else if(s.caps.context_only)throw Object.assign(new Error("请从已分配的专业任务进入指定工单"),{code:"FORBIDDEN"});
      }catch(e){s.error=e;}finally{s.loading=false;paint();}
    }
    function saveLayout(){try{localStorage.setItem(layoutKey(),JSON.stringify({visible:s.visible,order:s.orderColumns,widths:s.widths,size:s.size}));}catch{}}
    async function open(id,updateUrl=true) {
      if(s.ticketId!==id && hasDraft()){s.pendingClearAll=true;s.pendingLeave=()=>open(id,updateUrl);s.dialog="discard";paint();return;}
      s.ticketId=id;s.detail=null;s.detailError=null;s.detailLoading=true;s.tab="communication";s.expanded=false;s.newVersion=false;
      const seq=++s.detailSeq;paint();
      try{
        const data=await api("detail",{ticket_id:id,collaboration_id:ctx().collaboration_id});
        if(seq!==s.detailSeq)return;
        s.detail=data.ticket;s.messages=data.messages||[];s.messageCursor=data.message_cursor;
        s.ticketCaps=await api("capabilities",{ticket_id:id,collaboration_id:ctx().collaboration_id});
        s.caps.active_upload_policy=s.ticketCaps.active_upload_policy;
        s.mode=s.caps.context_only || !s.detail.allowed_actions.some(a=>a.action==="reply"&&a.enabled) && s.detail.allowed_actions.some(a=>a.action==="note"&&a.enabled) ? "internal":"public";s.audience=s.caps.context_only ? ctx().collaboration_id : "support";
        const historyData=await api("history",{ticket_id:id,limit:20});
        s.history=historyData.entries||historyData.items||[];s.historyCursor=historyData.next_cursor;
        s.readToken=data.read_position_token;
        if(updateUrl)url();
      }catch(e){if(seq===s.detailSeq)s.detailError=e;}
      finally{if(seq===s.detailSeq){s.detailLoading=false;paint();requestAnimationFrame(()=>document.querySelector(".cs-drawer [data-cs='close']")?.focus({preventScroll:true}));}}
    }
    async function reloadDetail(){
      if(!s.ticketId)return;
      const data=await api("detail",{ticket_id:s.ticketId,collaboration_id:ctx().collaboration_id});
      s.detail=data.ticket;s.messages=data.messages||[];s.messageCursor=data.message_cursor;s.newVersion=false;
      s.readToken=data.read_position_token;
      s.ticketCaps=await api("capabilities",{ticket_id:s.ticketId,collaboration_id:ctx().collaboration_id});
      s.caps.active_upload_policy=s.ticketCaps.active_upload_policy;
      const hd=await api("history",{ticket_id:s.ticketId,limit:20});s.history=hd.entries||hd.items||[];s.historyCursor=hd.next_cursor;
    }
    function leave(callback) {
      if(s.busy||s.uploading){s.notice=s.uploading?"正在上传附件，请稍候":"正在提交，请稍候";paint();return false;}
      if(hasDraft()){s.pendingClearAll=true;s.pendingLeave=callback;s.dialog="discard";paint();return false;}
      callback();return true;
    }
    function close(){leave(()=>{const id=s.ticketId;s.ticketId=null;s.detail=null;s.detailSeq++;s.dialog=null;url();paint();requestAnimationFrame(()=>{const trigger=document.querySelector(`[data-cs-id="${CSS.escape(id || "")}"]`);(trigger || document.querySelector(".cs-page h1"))?.focus();});});}
    function beforeLeave(hash){
      if(hash===acceptedHash)return true;
      const nextId=hash.startsWith("#/tickets")?new URLSearchParams(hash.split("?")[1]||"").get("ticket_id"):null;
      if(hash.startsWith("#/tickets")&&nextId===s.ticketId)return true;
      if(s.busy||s.uploading){s.notice="正在提交或上传，请稍候";paint();return false;}
      if(hasDraft()){
        s.pendingClearAll=true;
        s.pendingLeave=()=>{s.ticketId=null;s.detail=null;s.drafts={};s.actionDrafts={};s.dialog=null;location.hash=hash;};
        s.dialog="discard";paint();return false;
      }
      return true;
    }
    function syncURL(){
      if(!s.initialized||!s.caps)return;
      const p=new URLSearchParams(location.hash.split("?")[1]||"");
      const id=p.get("ticket_id");
      const filters={};
      for(const k of ["partner_id","subject","assignee_id","queue_id","created_from","created_to"])if(p.get(k))filters[k]=p.get(k);
      for(const k of ["category","status","priority"])if(p.has(k))filters[k]=p.getAll(k);
      const view=p.get("partner_id")?"all":p.get("view")||s.caps.default_view||"mine";
      const page=Math.max(1,Number(p.get("page"))||1),size=[10,20,50].includes(Number(p.get("page_size")))?Number(p.get("page_size")):20;
      const sort=p.get("sort_by")||"updated_at",order=p.get("sort_order")||"desc";
      if(!s.caps.context_only && (view!==s.view||JSON.stringify(filters)!==JSON.stringify(s.filters)||page!==s.page||size!==s.size||sort!==s.sort||order!==s.order)){
        Object.assign(s,{filters,view,page,size,sort,order,draft:{field:"ticket_id",keyword:"",...filters}});
        queueMicrotask(()=>query(false));
      }
      if(id!==s.ticketId){
        if(id)queueMicrotask(()=>open(id,false));
        else{s.ticketId=null;s.detail=null;s.detailSeq++;}
      }
    }
    function ensureContext(){
      const identity=JSON.stringify(ctx());
      if(s.identity===identity)return;
      s.identity=identity;s.seq++;s.detailSeq++;s.initialized=false;s.caps=null;s.ticketCaps=null;s.rows=null;s.total=null;
      s.detail=null;s.ticketId=null;s.messages=[];s.history=[];s.drafts={};s.actionDrafts={};s.form={};s.dialog=null;s.error=null;
      s.filters={};s.draft={field:"ticket_id",keyword:""};s.loading=false;s.detailLoading=false;s.busy=false;s.uploading=false;
    }
    function sla(ticket,kind){
      const a=ticket.sla || {};
      const first=kind==="first",stateValue=a[first?"first_response_status":"resolution_status"];
      if(stateValue==="missing" || a.policy_status==="missing")return `<span class="cs-muted">SLA未配置</span>`;
      if(first && ticket.first_response_at)return `<span class="${stateValue==="breached"?"cs-late":"cs-good"}">已首响${stateValue==="breached"?"（曾超时）":""}</span>`;
      if(!first && stateValue==="paused")return `<span class="cs-muted">已暂停 · 等待合作方补充</span>`;
      if(!first && stateValue==="completed")return `<span class="cs-good">本轮已结束</span>`;
      if(["resolved","closed"].includes(ticket.status) && first && !ticket.first_response_at)return `<span class="cs-muted">历史无有效首响记录</span>`;
      const due=a[first?"first_response_due_at":"resolution_due_at"];
      if(!due)return `<span class="cs-muted">数据未同步</span>`;
      const remaining=(new Date(due)-new Date(s.serverNow || a.last_calculated_at || "2026-11-08T12:00:00Z"))/1000;
      const n=Math.abs(remaining),duration=n>=86400?`${Math.floor(n/86400)}天 ${Math.floor(n%86400/3600)}小时`:`${Math.floor(n/3600)}小时 ${Math.floor(n%3600/60)}分`;
      return `<span class="${remaining<0?"cs-late":""}" title="到期 ${h(time(due))} Asia/Shanghai · ${h(a.policy_version)}">${remaining<0?"已超时":"剩余"} ${duration}</span>`;
    }
    function cell(t,key){
      if(key==="ticket_id")return `<button class="cs-link" data-cs="open" data-cs-id="${h(t.ticket_id)}">${h(t.ticket_id)}</button>${icon("copy","复制工单编号","file",`data-value="${h(t.ticket_id)}"`)}`;
      if(key==="partner")return `<button class="cs-link" data-cs="object" data-cs-id="${h(t.ticket_id)}" data-type="partner" data-value="${h(t.partner.partner_id)}">${h(t.partner.partner_id)}</button><small>${h(t.partner.masked_email || "资料未同步")}</small>`;
      if(key==="subject")return `<button class="cs-subject" data-cs="open" data-cs-id="${h(t.ticket_id)}" title="${h(t.subject)}">${t.unread_partner_message_count?`<span class="cs-unread" aria-label="有${Number(t.unread_partner_message_count)}条未读">●</span>`:""}${h(t.subject)}</button>`;
      if(key==="category")return h(labels("categories")[t.category]);
      if(key==="priority")return `<span class="cs-priority cs-priority-${h(t.priority)}">${h(labels("priorities")[t.priority])}</span>`;
      if(key==="status")return `${status(t.status)}${t.legacy_display_note?`<small>${h(t.legacy_display_note)}</small>`:""}`;
      if(key==="assignee")return `${h(t.assignee?.display_name || "未分配")}${t.assignee && !t.assignee.active?"<small>已停用</small>":""}`;
      if(key==="first_response_due_at" || key==="resolution_due_at")return sla(t,key==="first_response_due_at"?"first":"resolution");
      if(key==="actions")return `<div class="cs-row-actions">${btn("open","查看",`data-cs-id="${h(t.ticket_id)}"`)}${t.allowed_actions?.some(a=>a.action==="claim"&&a.enabled)?btn("claim","认领",`data-cs-id="${h(t.ticket_id)}" data-version="${t.version}"`):""}</div>`;
      if(key==="queue")return h(t.service_queue?.name);
      if(key.endsWith("_at"))return `<time title="Asia/Shanghai">${h(time(t[key]))}</time>`;
      return h(t[key] || "暂无公开回复");
    }
    function table(){
      const narrow=innerWidth<768;
      const cols=s.orderColumns.filter(k=>s.visible.includes(k)&&(!narrow || ["ticket_id","subject","status","actions"].includes(k) || s.mobileColumns)).map(k=>columns.find(c=>c[0]===k)).filter(Boolean);
      const width=cols.reduce((n,c)=>n+(s.widths[c[0]]||c[2]),0);
      return `<div class="cs-table-scroll" tabindex="0" aria-label="工单列表，可横向滚动"><table class="cs-table" style="width:${width}px;min-width:100%"><colgroup>${cols.map(c=>`<col style="width:${s.widths[c[0]]||c[2]}px">`).join("")}</colgroup><thead><tr>${cols.map(([key,label])=>`<th class="cs-col-${key}" scope="col" ${["updated_at","created_at","priority","first_response_due_at","resolution_due_at"].includes(key)?`aria-sort="${s.sort===key?(s.order==="desc"?"descending":"ascending"):"none"}"`:""}>${["updated_at","created_at","priority","first_response_due_at","resolution_due_at"].includes(key)?`<button class="cs-sort" data-cs="sort" data-key="${key}">${h(label)} <span>${s.sort===key?(s.order==="desc"?"↓":"↑"):"↕"}</span></button>`:h(label)}<span class="cs-resize" data-cs-resize="${key}" role="separator" aria-label="调整${label}列宽" aria-orientation="vertical" tabindex="0"></span></th>`).join("")}</tr></thead><tbody>${s.rows?.length?s.rows.map(t=>`<tr>${cols.map(c=>`<td class="cs-col-${c[0]}">${cell(t,c[0])}</td>`).join("")}</tr>`).join(""):s.loading?Array.from({length:5},()=>`<tr>${cols.map(()=>`<td><span class="cs-skeleton"></span></td>`).join("")}</tr>`).join(""):`<tr><td colspan="${cols.length}" class="cs-empty">${s.error&&!s.rows?"加载失败":Object.keys(s.filters).length?"没有符合当前条件的工单":"暂无工单"}${Object.keys(s.filters).length?btn("reset","重置筛选"):""}</td></tr>`}</tbody></table></div>`;
    }
    function multi(name,label,values){
      const selected=s.draft[name] || [];
      return `<fieldset class="cs-multiselect"><legend>${label}</legend><input type="search" aria-label="搜索${label}选项" data-cs-option-search="${name}" placeholder="搜索选项"><div>${Object.entries(values).map(([k,v])=>`<label><input type="checkbox" data-cs-multi="${name}" value="${h(k)}" ${selected.includes(k)?"checked":""}>${h(v)}</label>`).join("")}</div></fieldset>`;
    }
    function filterDraft(){
      const field=["ticket_id","partner_id","subject"].find(key=>s.filters[key]) || "ticket_id";
      return {...s.filters,field,keyword:s.filters[field] || "",dateFrom:s.filters.created_from?time(s.filters.created_from).slice(0,10):"",dateTo:s.filters.created_to?time(new Date(new Date(s.filters.created_to).getTime()-86400000).toISOString()).slice(0,10):""};
    }
    function listFilters(){
      const names={ticket_id:"工单",partner_id:"合作方",subject:"主题",category:"类别",status:"状态",priority:"优先级",assignee_id:"处理人",queue_id:"队列",created_from:"创建自",created_to:"创建至"};
      const dictionaries={category:labels("categories"),status:labels("statuses"),priority:labels("priorities"),assignee_id:Object.fromEntries(s.assignees.map(user=>[user.user_id,user.display_name])),queue_id:Object.fromEntries((s.caps?.authorized_queues || []).map(queue=>[queue.queue_id,queue.name]))};
      const quick=(key,label)=>{
        const selected=s.filters[key] || [];
        return `<label><span>${label}</span><select data-cs-quick-filter="${key}" aria-label="${label}"><option value="">全部${label}</option>${selected.length>1?`<option value="__multiple__" selected>已选${selected.length}项</option>`:""}${Object.entries(dictionaries[key]).map(([value,name])=>`<option value="${h(value)}" ${selected.length===1&&selected[0]===value?"selected":""}>${h(name)}</option>`).join("")}</select></label>`;
      };
      const chips=Object.entries(s.filters).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(item=>{
        const text=dictionaries[key]?.[item] || (/^created_/.test(key)?time(item).slice(0,10):item);
        return btn("remove-filter",`${h(names[key] || key)}：${h(text)} <span aria-hidden="true">×</span>`,`data-key="${h(key)}" ${Array.isArray(value)?`data-filter-value="${h(item)}"`:""} aria-label="移除${h(names[key] || key)}筛选"`);
      })).join("");
      return `<section class="admin-filter-shell" aria-label="客户服务筛选"><div class="admin-filter-quick">${quick("status","状态")}${quick("category","类别")}${quick("priority","优先级")}${btn("advanced",`${svg("filter")} 筛选器`,`aria-expanded="${s.advanced}" aria-controls="cs-filter-panel"`)}</div>
      ${s.advanced?`<form class="admin-filter-panel" id="cs-query"><div class="cs-query" id="cs-filter-panel"><label><span>查询字段</span><select data-cs-field="quick-field">${options({ticket_id:"工单编号",partner_id:"合作方编号",subject:"主题"},s.draft.field)}</select></label><label class="cs-keyword"><span>关键词</span><input data-cs-field="keyword" type="search" maxlength="100" value="${h(s.draft.keyword||"")}" placeholder="${s.draft.field==="subject"?"输入主题关键词":"输入完整编号"}"></label></div>
      <div class="cs-advanced">${multi("category","问题类别",labels("categories"))}${multi("status","状态",labels("statuses"))}${multi("priority","优先级",labels("priorities"))}<label>处理人搜索<input data-cs-field="assignee-search" placeholder="姓名或编号，包含历史停用人员" ${["mine","unassigned"].includes(s.view)?"disabled":""}>${btn("assignee-search","搜索")}<select data-cs-field="assignee_id" ${["mine","unassigned"].includes(s.view)?"disabled":""}><option value="">全部授权处理人</option>${s.assignees.map(u=>`<option value="${h(u.user_id)}" ${s.draft.assignee_id===u.user_id?"selected":""}>${h(u.display_name)}${u.active?"":"（已停用）"}</option>`).join("")}</select></label><label>服务队列<select data-cs-field="queue_id">${options(dictionaries.queue_id,s.draft.queue_id,"全部授权队列")}</select></label><label>创建日期（Asia/Shanghai）<div class="cs-date-range"><input type="date" aria-label="创建开始日期" data-cs-field="date-from" value="${h(s.draft.dateFrom||"")}"><span>至</span><input type="date" aria-label="创建结束日期" data-cs-field="date-to" value="${h(s.draft.dateTo||"")}"></div></label></div>
      <div class="admin-filter-actions">${btn("filters-reset","重置条件")}${btn("filters-cancel","取消")}<button class="cs-button cs-primary" type="submit">应用筛选</button></div></form>`:""}
      ${chips?`<div class="cs-filter-chips admin-filter-tags" aria-label="已生效筛选">${chips}${btn("reset","清空筛选")}</div>`:""}</section>`;
    }
    function page(){
      ensureContext();
      const unavailable=s.error && ["FORBIDDEN","AFF-40301"].includes(s.error.code);
      return `<div class="cs-page"><header class="cs-page-head"><h1 tabindex="-1">客户服务</h1></header>
      ${!navigator.onLine?`<div class="cs-error" role="alert">网络连接异常，请恢复后重试。未发送内容保留在本次会话。</div>`:""}
      ${s.notice?`<div class="cs-notice" role="status">${h(s.notice)}${icon("dismiss","关闭提示","check")}</div>`:""}
      ${errorMarkup(s.error)}
      ${unavailable?"":s.caps?.context_only?`<p class="cs-muted">专业任务上下文 · 仅显示已分配的工单。</p>`:`<nav class="cs-views" aria-label="工作视图">${Object.entries({mine:"我的待办",unassigned:"未分配",all:"全部",overdue:"已超时"}).map(([k,v])=>`<button data-cs="view" data-value="${k}" class="${s.view===k?"active":""}" aria-pressed="${s.view===k}">${v}</button>`).join("")}</nav>
      ${listFilters()}
      ${s.loading&&s.rows?`<div class="cs-read-progress" role="status">正在刷新…</div>`:""}${s.error&&s.rows?`<p class="cs-late">查询失败，当前显示上次结果 · ${h(time(s.refreshAt))}</p>`:""}${table()}
      <footer class="cs-pagination"><span>${s.total==null?"正在读取工单":`共 ${s.total} 条`}</span><label>每页 <select data-cs-field="page-size">${[10,20,50].map(n=>`<option ${n===s.size?"selected":""}>${n}</option>`).join("")}</select></label>${btn("prev","上一页",s.page<=1?"disabled":"")}<span>${s.page} / ${Math.max(1,Math.ceil((s.total||0)/s.size))}</span>${btn("next","下一页",s.page>=Math.max(1,Math.ceil((s.total||0)/s.size))?"disabled":"")}<label>跳至 <input type="number" data-cs-field="page" min="1" max="${Math.max(1,Math.ceil((s.total||0)/s.size))}" value="${s.page}" aria-label="跳页"></label>${btn("jump","前往")}</footer>`}</div>`;
    }
    function plain(text){
      return String(text||"").split(/(https?:\/\/[^\s<>"]+)/g).map(part=>/^https?:\/\//i.test(part)?`<a href="${h(part)}" target="_blank" rel="noopener noreferrer">${h(part)}</a>`:h(part)).join("");
    }
    function filesMarkup(files,editable=false){
      return files?.length?`<ul class="cs-files">${files.map(f=>`<li><span>${svg("file")}<strong>${h(f.file_name || f.name)}</strong><small>${((f.size_bytes||f.size||0)/1048576).toFixed(2)} MiB · ${h({pending:"扫描中",clean:"扫描通过",rejected:"扫描未通过",error:"扫描失败"}[f.scan_status]||"上传中")}</small>${f.policy_error?`<em>${h(f.policy_error)}</em>`:""}</span>${editable?icon("remove-file","移除附件","trash",`data-value="${h(f.attachment_id)}"`):f.scan_status==="clean"?icon("download","下载附件","download",`data-value="${h(f.attachment_id)}"`):""}</li>`).join("")}</ul>`:"";
    }
    function communication(){
      const t=s.detail,d=currentDraft(),allowed=s.mode==="internal"?capability("note"):capability("reply");
      const writable=capability("reply")?.enabled || capability("note")?.enabled;
      const pending=d.files.some(f=>f.scan_status!=="clean" || f.policy_error);
      return `<section class="cs-original"><h3>原始问题</h3><p>${plain(t.description)}</p></section>
      <section class="cs-messages" aria-label="沟通记录">${s.messageCursor?btn("older-messages","加载更早消息"):""}${s.messages.length?s.messages.map(m=>`<article class="cs-message ${m.visibility==="internal"?"cs-internal":""}"><header><strong>${h(m.sender_display)}</strong><span>${m.visibility==="internal"?`仅内部可见${m.collaboration_id?` · ${h(m.collaboration_id)}`:""}`:"合作方可见"}</span><time>${h(time(m.created_at))}</time></header><p>${plain(m.body)}</p>${filesMarkup(m.attachments)}${m.business_cta?`<div class="cs-business-cta">合作方可见：${h(m.business_cta.label)}<small>${h(m.business_cta.settlement_ref?.settlement_case_id)}</small></div>`:""}</article>`).join(""):`<p class="cs-muted">暂无沟通记录</p>`}</section>
      ${writable?`<section class="cs-composer"><div class="cs-modes" role="group" aria-label="消息模式">${!s.caps.context_only && capability("reply")?btn("mode-public","对外回复",`class="cs-button ${s.mode==="public"?"active":""}" aria-pressed="${s.mode==="public"}"`):""}${capability("note")?btn("mode-internal","内部备注",`aria-pressed="${s.mode==="internal"}"`):""}</div><p class="cs-audience">${s.mode==="internal"?"仅内部可见，不发送给合作方":"合作方可见"}</p>${s.mode==="internal"?`<label class="cs-audience-select">备注受众 ${s.caps.context_only?`<strong>当前任务 ${h(ctx().collaboration_id)}</strong>`:`<select data-cs-field="audience">${options({support:"客服内部",...Object.fromEntries((t.collaborations||[]).filter(c=>c.readable).map(c=>[c.collaboration_id,`${c.task_id} · ${labels("collaborationKinds")[c.kind] || c.kind}`]))},s.audience)}</select>`}</label>`:""}<label for="cs-body" class="cs-sr-only">${s.mode==="internal"?"内部备注内容":"公开回复内容"}</label><textarea id="cs-body" data-cs-field="body" rows="5" maxlength="10000" placeholder="${s.mode==="internal"?"填写协作摘要，至少10字":"输入向合作方发送的回复"}" ${!allowed?.enabled?"disabled":""}>${h(d.body)}</textarea><div class="cs-composer-tools"><label class="cs-upload cs-button ${s.caps.active_upload_policy?"":"disabled"}">${svg("file")} 添加附件<input type="file" data-cs-upload accept=".pdf,.png,.jpg,.jpeg,.txt" multiple ${!s.caps.active_upload_policy||s.uploading?"disabled":""}></label><span data-cs-counter>${count(d.body)} / 5000</span></div>${!s.caps.active_upload_policy?`<p class="cs-muted">上传策略未配置，可发送纯文本。</p>`:""}${filesMarkup(d.files,true)}${pending?`<p class="cs-late">附件未通过校验，请等待扫描或移除异常文件。</p>`:""}${!allowed?.enabled?`<p class="cs-muted">${h(allowed?.disabled_reason || "当前状态不可发送此类消息")}</p>`:""}</section>`:`<div class="cs-readonly">${h(t.legacy_read_only?t.legacy_display_note || "历史状态待核验，仅可查看":t.status==="closed"?"工单已关闭，仅可查看历史记录":t.status==="resolved"?"工单已解决，请等待合作方确认或选择后续处理":"当前用户无沟通写入权限")}</div>`}`;
    }
    function relations(){
      const t=s.detail,blocking=(t.collaborations||[]).filter(c=>c.blocking&&!["done","cancelled"].includes(c.status)).length;
      return `<section class="cs-section"><header><h3>关联对象</h3>${actionButton("attach_object")}</header>${t.related_objects?.length?`<div class="cs-mini-table">${t.related_objects.map(o=>`<article><div><strong>${h(objectNames[o.object_type])}</strong><span>${o.readable?h(o.object_id):"无权限查看关联对象"}</span></div><p>${o.readable?h(o.public_summary||"数据未同步"):"无权限查看关联对象"}</p>${o.readable?`<small>数据时间 ${h(time(o.data_updated_at))}</small>${o.settlement_ref?`<dl class="cs-triplet">${Object.entries(o.settlement_ref).map(([k,v])=>`<div><dt>${h(({customer_id:"客户",commission_case_id:"佣金案件",settlement_case_id:"结算案件"})[k])}</dt><dd>${h(v)}</dd></div>`).join("")}</dl>`:""}<div class="cs-inline-actions">${btn("object","查看",`data-type="${h(o.object_type)}" data-value="${h(o.object_id)}"`)}${capability("detach_object")?btn("detach-object","移除关联",`data-type="${h(o.object_type)}" data-value="${h(o.object_id)}" ${capability("detach_object").enabled?"":`disabled title="${h(capability("detach_object").disabled_reason)}"`}`):""}</div>`:""}</article>`).join("")}</div>`:`<p class="cs-muted">暂无关联对象</p>`}</section>
      <section class="cs-section"><header><h3>专业协作</h3>${actionButton("collaborate")}</header>${t.collaborations?.length?`<p class="cs-notice">${blocking?`仍有${blocking}项专业任务未完成`:"专业处理已结束，请核对并答复合作方"}</p><div class="cs-mini-table">${t.collaborations.map(c=>`<article><div><strong>${h(labels("collaborationKinds")[c.kind]||"专业任务")}</strong><span>${h(taskStates[c.status]||c.status)} · ${c.blocking?"阻断解决":"不阻断解决"}</span></div><p>${h(c.readable?c.public_summary:"无权限查看关联对象")}</p>${c.readable?`<small>${h(c.task_id)} · ${h(time(c.updated_at))}</small>${btn("task","查看任务",`data-value="${h(c.task_id)}"`)}`:""}</article>`).join("")}</div>`:`<p class="cs-muted">暂无专业任务</p>`}</section><section class="cs-section"><header><h3>结算申诉指引</h3>${actionButton("guide_appeal")}</header><p class="cs-muted">根据当前关联结算案件核验资格，由合作方提交申诉。</p></section>`;
    }
    function historyMarkup(){
      const t=s.detail;
      return `<ol class="cs-history">${s.history.map(e=>`<li><time>${h(time(e.occurred_at))}</time><strong>${h(actionNames[e.action]||e.action)} · ${h(e.actor_display)}</strong><p>${h(e.reason||"—")}</p><span>${h(labels("statuses")[e.from_status]||"—")} → ${h(labels("statuses")[e.to_status]||"—")}</span><small>审计 ${h(e.audit_id)} · trace ${h(e.trace_id)} ${icon("copy","复制 trace","file",`data-value="${h(e.trace_id)}"`)}</small></li>`).join("")}</ol>${!s.history.length?`<p class="cs-muted">暂无处理记录</p>`:""}${s.historyCursor?btn("older-history","加载更早记录"):""}<section class="cs-section"><h3>合作方评价</h3>${t.satisfaction?`<strong class="cs-rating">${"★".repeat(t.satisfaction.rating)}${"☆".repeat(5-t.satisfaction.rating)} ${t.satisfaction.rating}/5</strong><p>${h(t.satisfaction.comment||"未填写意见")}</p><small>${h(time(t.satisfaction.submitted_at))}</small>`:`<p class="cs-muted">${t.close_reason && t.close_reason!=="resolved"?"不适用":"未评价"}</p>`}</section>`;
    }
    function drawer(){
      if(!s.ticketId)return "";
      const t=s.detail,d=currentDraft(),a=s.mode==="internal"?capability("note"):capability("reply"),sendable=a?.enabled && count(d.body.trim())>=(s.mode==="internal"?10:1)&&count(d.body)<=5000&&!d.files.some(f=>f.scan_status!=="clean"||f.policy_error)&&!s.uploading&&!s.busy&&navigator.onLine;
      return `<div class="tm-overlay cs-overlay"></div><aside class="cs-drawer" role="dialog" aria-modal="true" aria-label="客户服务工单详情"><header class="cs-drawer-head"><div><strong>${h(s.ticketId)}</strong>${icon("copy","复制工单编号","file",`data-value="${h(s.ticketId)}"`)}${t?status(t.status):""}</div>${icon("close","关闭工单详情","exit",s.busy||s.uploading?"disabled":"")}</header>${errorMarkup(s.error,"load-new")}${s.notice?`<div class="cs-notice" role="status">${h(s.notice)}${s.notification?btn("notification","查看通知"):""}${icon("dismiss","关闭提示","check")}</div>`:""}
      ${s.detailLoading?`<div class="cs-loading" role="status">正在加载工单…</div>`:s.detailError?errorMarkup(s.detailError,"detail-retry"):!t?"":`<div class="cs-drawer-scroll"><div class="cs-ticket-summary"><h2 class="${s.expanded?"expanded":""}" title="${h(t.subject)}">${h(t.subject)}</h2>${t.subject.length>40?btn("expand",s.expanded?"收起主题":"展开主题"):""}<dl class="cs-summary-grid"><div><dt>合作方</dt><dd>${h(t.partner.partner_id)}<small>${h(t.partner.masked_email||"资料未同步")}</small></dd></div><div><dt>类别 ${capability("classify")?icon("action:classify","调整类别或优先级","sliders"):""}</dt><dd>${h(labels("categories")[t.category])}</dd></div><div><dt>优先级</dt><dd>${h(labels("priorities")[t.priority])}</dd></div><div><dt>服务队列</dt><dd>${h(t.service_queue.name)}</dd></div><div><dt>处理人</dt><dd>${h(t.assignee?.display_name||"未分配")}${t.assignee&&!t.assignee.active?" · 已停用":""}</dd></div><div><dt>时区</dt><dd>Asia/Shanghai</dd></div><div><dt>创建时间</dt><dd>${h(time(t.created_at))}</dd></div><div><dt>更新时间</dt><dd>${h(time(t.updated_at))}</dd></div></dl>
      ${t.legacy_display_note?`<div class="cs-notice">${h(t.legacy_display_note)}</div>`:""}${t.related_objects.some(o=>!o.data_updated_at)?`<div class="cs-notice">部分业务资料未同步，当前仅可依据已核实信息回复。</div>`:""}<div class="cs-sla-bar"><div><small>首响时限</small>${sla(t,"first")}</div><div><small>解决时限</small>${sla(t,"resolution")}</div><small title="创建时策略快照；优先级调整不会重置时限">${h(t.sla.policy_version||"SLA未配置")} · 第 ${t.sla.cycle || 1} 轮</small></div></div>
      ${s.newVersion?`<div class="cs-notice">有新消息 / 工单已更新 ${btn("load-new","加载最新")}</div>`:""}<nav class="cs-detail-tabs" role="tablist" aria-label="工单详情页签">${Object.entries({communication:"沟通",relations:"关联与协作",history:"处理记录"}).map(([k,v])=>`<button role="tab" aria-selected="${s.tab===k}" data-cs="tab" data-value="${k}" class="${s.tab===k?"active":""}">${v}</button>`).join("")}</nav><div class="cs-tab-content" role="tabpanel">${s.tab==="communication"?communication():s.tab==="relations"?relations():historyMarkup()}</div></div>
      <footer class="cs-drawer-footer">${s.busy?`<span role="status">正在提交…</span>`:""}<details class="cs-more"><summary>更多处理</summary><div>${Object.keys(actionNames).filter(n=>!["attach_object","detach_object","classify"].includes(n)).map(n=>actionButton(n,`class="cs-button ${n==="close_exception"?"cs-danger":""}"`)).join("") || "<span>无可用处理动作</span>"}</div></details>${s.tab==="communication" && a ? btn("send",s.mode==="internal"?"保存内部备注":"发送回复",`class="cs-button cs-primary" ${sendable?"":"disabled"} title="${sendable?"":s.busy?"正在提交":!a.enabled?a.disabled_reason:"请填写正文并完成附件校验"}"`):s.tab==="relations"?actionButton("attach_object"):actionButton("claim")}</footer>`}</aside>`;
    }
    const inputField=(name,label,type="text",extra="")=>`<label>${label}<input type="${type}" data-cs-field="form-${name}" value="${h(s.form[name]||"")}" ${extra}></label>`;
    const textField=(name,label,min=10,max=1000)=>`<label>${label}<textarea data-cs-field="form-${name}" minlength="${min}" maxlength="${max}" required rows="4">${h(s.form[name]||"")}</textarea><small>${min}–${max}字</small></label>`;
    function dialog(){
      if(!active()||!s.dialog)return "";
      const action=s.dialog,title={discard:"存在未发送内容，离开将丢弃",export:"导出客户服务工单",export_ready:"导出任务已生成",object_notice:"关联对象",task_notice:"专业任务",notification_notice:"通知投递状态",...actionNames}[action] || "处理工单";
      let content="",submit="确认";
      if(action==="discard")content="<p>当前公开回复、内部备注、受众草稿或未发送附件将被丢弃。</p>";
      else if(action==="export")content=`<p>导出当前全部生效条件对应的脱敏工单列表，不含消息正文、附件或内部备注。</p><pre>${h(JSON.stringify({view:s.view,...s.filters},null,2))}</pre><p>提交后生成异步导出任务。</p>`;
      else if(action==="export_ready")content=`<p>导出任务 ${h(s.form.job_id)} 已登记。</p><p>当前统一原型尚未接入该任务的导出中心定位。</p>`;
      else if(action==="task_notice" && s.form.collaboration){
        const d=s.form.collaboration,t=d.task;
        content=`<p class="cs-notice">${h(d.source)} · ${h(d.ticket_id)}</p><dl class="cs-summary-grid"><div><dt>任务编号</dt><dd>${h(t.task_id)}</dd></div><div><dt>专业类型</dt><dd>${h(labels("collaborationKinds")[t.kind]||t.kind)}</dd></div><div><dt>当前状态</dt><dd>${h(taskStates[t.status]||t.status)}</dd></div><div><dt>负责人</dt><dd>${h(d.assignee.display_name)}</dd></div><div><dt>解决限制</dt><dd>${t.blocking?"完成前阻断工单解决":"不阻断工单解决"}</dd></div><div><dt>更新时间</dt><dd>${h(time(t.updated_at))}</dd></div></dl><h3>处理摘要</h3><p>${h(t.public_summary)}</p>${t.object_ref?`<h3>关联业务</h3><p>${h(objectNames[t.object_ref.object_type])} · ${h(t.object_ref.object_id)}</p>${btn("object","查看关联详情",`data-type="${h(t.object_ref.object_type)}" data-value="${h(t.object_ref.object_id)}"`)}`:"<p>本任务未指定业务对象，按当前工单问题进行排查。</p>"}<h3>协作记录</h3>${d.messages.length?d.messages.map(m=>`<article><strong>${h(m.sender_display)}</strong><small> · ${h(time(m.created_at))}</small><p>${h(m.body)}</p></article>`).join(""):"<p>暂无已提交的协作备注。</p>"}`;
      }
      else if(["object_notice","task_notice"].includes(action))content=`<p>${h(s.form.notice)}</p><p><strong>${h(s.form.object_id)}</strong> ${icon("copy","复制授权编号","file",`data-value="${h(s.form.object_id)}"`)}</p>`;
      else if(action==="notification_notice")content=`<p class="cs-notice">回复已保存，通知投递异常。无需重新发送回复。</p><dl class="cs-triplet">${Object.entries(s.notification||{}).map(([k,v])=>`<div><dt>${h(({ticket_id:"工单",operation_id:"操作",audit_id:"审计",trace_id:"Trace",status:"投递状态"})[k]||k)}</dt><dd>${h(v)}</dd></div>`).join("")}</dl>`;
      else{
        content=`<p class="cs-form-context">${h(s.ticketId)} · ${h(labels("statuses")[s.detail?.status])} · ${h(s.detail?.assignee?.display_name||"未分配")}</p>`;
        if(["assign","transfer","reassign"].includes(action))content+=`<label>目标处理人（仅可用人员）<input data-cs-field="form-assignee_query" placeholder="搜索姓名或编号">${btn("search-assignees","搜索")}<select data-cs-field="form-assignee_id" required><option value="">请选择</option>${s.assignees.map(u=>`<option value="${h(u.user_id)}" ${s.form.assignee_id===u.user_id?"selected":""}>${h(u.display_name)}</option>`).join("")}</select></label><p>只变更服务负责人，不重置时限；已解决或已关闭状态保留。</p>`;
        if(action==="classify")content+=`<p>调整不重算当前工单时限。</p>${s.detail.assignee?.user_id===ctx().user_id?`<label>问题类别<select data-cs-field="form-category">${options(labels("categories"),s.form.category)}</select></label>`:""}${ctx().role==="supervisor"?`<label>优先级<select data-cs-field="form-priority">${options(labels("priorities"),s.form.priority)}</select></label>`:""}`;
        if(action==="attach_object")content+=`<label>对象类型<select data-cs-field="form-object_type">${options(objectNames,s.form.object_type)}</select></label>${inputField("object_id","完整对象编号","text",'required maxlength="64"')}${btn("lookup-object","精确查找")}${s.candidate?`<div class="cs-notice"><strong>${h(s.candidate.object_id)}</strong><p>${h(s.candidate.public_summary)}</p>${s.candidate.settlement_ref?`<pre>${h(JSON.stringify(s.candidate.settlement_ref,null,2))}</pre>`:""}</div>`:""}`;
        if(action==="detach_object")content+=`<p>仅移除工单引用，不修改原业务对象：${h(s.form.object_id)}</p>`;
        if(action==="collaborate")content+=`<label>专业类型<select data-cs-field="form-kind">${options(Object.fromEntries(Object.entries(labels("collaborationKinds")).filter(([k])=>k!=="appeal")),s.form.kind)}</select></label><label>关联对象<select data-cs-field="form-object_id"><option value="">无指定对象（仅技术核对）</option>${(s.detail.related_objects||[]).filter(o=>o.readable).map(o=>`<option value="${h(o.object_id)}" ${s.form.object_id===o.object_id?"selected":""}>${h(objectNames[o.object_type])} · ${h(o.object_id)}</option>`).join("")}</select></label>${textField("public_body","公开受理说明",10,5000)}`;
        if(action==="guide_appeal")content+=s.eligibility?`<div class="cs-notice"><strong>${h(s.eligibility.reason || s.eligibility.disabled_reason || (s.eligibility.eligible?"符合申诉指引条件":"当前不符合资格"))}</strong><pre>${h(JSON.stringify(s.eligibility.settlement_ref||s.form.settlement_ref||{},null,2))}</pre></div><p>仅发送指引，不创建申诉、不消耗次数、不改变资金状态。</p>`:"<p>正在读取申诉资格…</p>";
        if(["resolve","close","close_exception"].includes(action))content+=`<p class="cs-notice">仅更新服务工单，不改变资金或风险状态。</p>`;
        if(action==="reopen")content+=`<p>当前解决说明：${h(s.detail.resolution||"—")}</p>${s.detail.status==="closed"?`<p>关闭时间 ${h(time(s.detail.closed_at))} · 可重开至 ${h(time(s.detail.sla.reopen_allowed_until))}</p>`:"<p>重开本轮处理，保留首次响应和累计处理时间。</p>"}`;
        if(action==="close_exception")content+=`<label>异常关闭原因<select data-cs-field="form-close_reason">${options({withdrawn:"合作方撤回",duplicate:"重复问题",spam:"无效骚扰"},s.form.close_reason)}</select></label>${s.form.close_reason==="duplicate"?inputField("duplicate_ticket_id","同一合作方承接工单编号","text","required"):""}${textField("public_body","公开关闭说明",10,5000)}`;
        if(["request_material","resolve","guide_appeal","close"].includes(action))content+=textField("body",({request_material:"公开补充说明",resolve:"公开解决说明",guide_appeal:"公开申诉指引",close:"公开关闭说明"})[action],10,5000);
        if(action==="request_material"){
          const d=actionDraft();
          content+=`<label class="cs-upload cs-button">${svg("file")} 添加公开附件<input type="file" data-cs-action-upload accept=".pdf,.png,.jpg,.jpeg,.txt" multiple ${!s.caps.active_upload_policy||s.uploading?"disabled":""}></label>${filesMarkup(d.files,true)}`;
        }
        if(!["request_material","resolve","guide_appeal"].includes(action))content+=textField("reason",action==="collaborate"?"内部协作原因":"处理原因",10,1000);
        submit=({request_material:"发送补充要求",resolve:"确认已解决",close:"确认关闭",close_exception:"确认异常关闭",guide_appeal:"发送申诉指引",collaborate:"创建专业任务"})[action]||"确认";
      }
      return `<div class="cs-modal-overlay"><section class="cs-modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><header><h2>${h(title)}</h2>${icon("cancel-dialog","关闭弹窗","exit",s.busy?"disabled":"")}</header><form id="cs-action-form"><div class="cs-modal-scroll">${content}${errorMarkup(s.formError,"retry-form")}</div><footer>${action==="discard"?`${btn("cancel-discard","继续编辑")}${btn("discard","丢弃并离开",'class="cs-button cs-danger"')}`:["export_ready","object_notice","task_notice","notification_notice"].includes(action)?btn("cancel-dialog","关闭"):`${btn("cancel-dialog","取消")}<button class="cs-button ${action==="close_exception"?"cs-danger":"cs-primary"}" type="submit" ${s.busy || (action==="guide_appeal"&&!s.eligibility?.eligible)?"disabled":""}>${s.busy?"正在提交…":submit}</button>`}</footer></form></section></div>`;
    }
    async function openAction(name){
      const a=capability(name);if(a&&!a.enabled){s.notice=a.disabled_reason;paint();return;}
      if(name==="claim")return write("assign",{mode:"claim",assignee_id:ctx().user_id});
      s.dialog=name;s.form={};s.formError=null;s.candidate=null;s.eligibility=null;s.assignees=[];
      if(name==="classify")s.form={category:s.detail.category,priority:s.detail.priority};
      if(name==="collaborate")s.form={kind:"finance_query"};
      if(name==="attach_object")s.form={object_type:"settlement_case"};
      if(name==="close_exception")s.form={close_reason:"withdrawn"};
      if(name==="request_material")s.form={body:actionDraft().body};
      paint();
      try{
        if(["assign","transfer","reassign"].includes(name)){const d=await api("assignees",{ticket_id:s.ticketId});s.assignees=d.items||d.assignees||[];}
        if(name==="guide_appeal"){
          const ref=s.detail.related_objects.find(o=>o.readable&&o.settlement_ref)?.settlement_ref;
          if(!ref){s.formError={message:"请先关联有效结算案件",code:"AFF-42201"};}
          else{s.form.settlement_ref=ref;s.eligibility=await api("eligibility",{ticket_id:s.ticketId,settlement_ref:ref,...ref});}
        }
      }catch(e){s.formError=e;}paint();focusDialog();
    }
    function focusDialog(){requestAnimationFrame(()=>document.querySelector(".cs-modal input:not([disabled]), .cs-modal textarea, .cs-modal select, .cs-modal button")?.focus());}
    async function write(op,body,clearDraft=false){
      if(s.busy || !navigator.onLine)return;
      s.busy=true;s.formError=null;s.error=null;const originalId=s.ticketId;
      const key=s.form._key || crypto.randomUUID();s.form._key=key;paint();
      try{
        const data=await api(op,{...body,ticket_id:originalId,version:s.detail?.version,idempotency_key:key});
        s.notification=data.notification_state==="partial_failed"?{ticket_id:originalId,operation_id:data.operation_id,audit_id:data.audit_id,trace_id:s.lastTrace,status:"投递异常"}:null;
        if(clearDraft)s.drafts[draftKey()]={body:"",files:[]};
        s.dialog=null;s.form={};s.formError=null;
        s.notice=data.notification_state==="partial_failed" || data.notification_status==="failed" || data.notification?.status==="failed"?"回复已保存，通知投递异常":op==="collaborate"?`专业任务已创建 ${data.collaboration?.task_id||data.task_id||""}`:body.action==="guide_appeal"?"已发送申诉指引，请合作方提交":`${originalId} · 处理成功`;
        await reloadDetail();if(!s.caps.context_only)await query();
      }catch(e){
        if(e.code==="AFF-40901"){s.newVersion=true;e.message="工单已更新，请核对后重试";delete s.form._key;}
        if(e.details?.attachment_ids)(clearDraft?currentDraft():actionDraft()).files.forEach(f=>{if(e.details.attachment_ids.includes(f.attachment_id))f.policy_error="上传策略已更新，请移除此文件";});
        if(s.dialog)s.formError=e;else s.error=e;
      }finally{s.busy=false;paint();}
    }
    async function submitAction(){
      const name=s.dialog,f={...s.form};
      if(name==="export"){
        s.busy=true;paint();
        try{const d=await api("export",{scope:{view:s.view,...s.filters,sort_by:s.sort,sort_order:s.order},query_snapshot_at:s.querySnapshot,idempotency_key:crypto.randomUUID()});s.form={...d,job_id:d.export_id};s.dialog="export_ready";s.formError=null;}
        catch(e){s.formError=e;}finally{s.busy=false;paint();}return;
      }
      if(["assign","transfer","reassign"].includes(name))return write("assign",{mode:name,assignee_id:f.assignee_id,reason:f.reason});
      if(name==="classify"){
        const changes={action:name,reason:f.reason};
        if(f.category!==s.detail.category&&s.detail.assignee?.user_id===ctx().user_id)changes.category=f.category;
        if(f.priority!==s.detail.priority&&ctx().role==="supervisor")changes.priority=f.priority;
        return write("action",changes);
      }
      if(name==="collaborate"){
        const object=s.detail.related_objects.find(o=>o.object_id===f.object_id);
        return write("collaborate",{kind:f.kind,object_ref:object||null,settlement_ref:object?.settlement_ref||null,reason:f.reason,public_body:f.public_body,blocking:true});
      }
      if(name==="request_material"){
        const d=actionDraft();if(s.uploading||d.files.some(f=>f.scan_status!=="clean"||f.policy_error)){s.formError={message:"请等待附件扫描完成或移除异常文件",code:"AFF-42201"};return paint();}
        const result=await write("reply",{kind:"request_material",body:f.body,attachment_ids:d.files.map(a=>a.attachment_id)});
        if(!s.dialog){delete s.actionDrafts[`${s.ticketId}:request_material`];}return result;
      }
      if(name==="attach_object" && !s.candidate){s.formError={message:"请先精确查找并确认可关联对象",code:"AFF-42201"};paint();return;}
      return write("action",{...f,_key:undefined,action:name,close_reason:name==="close"?"resolved":f.close_reason,object_type:s.candidate?.object_type||f.object_type,object_id:s.candidate?.object_id||f.object_id,object_ref:s.candidate||undefined});
    }
    function applyQuery(){
      const f={};const d=s.draft;
      if(d.keyword?.trim())f[d.field]=d.keyword.trim();
      for(const k of ["category","status","priority"])if(d[k]?.length)f[k]=[...d[k]];
      for(const k of ["assignee_id","queue_id"])if(d[k]&&!["mine","unassigned"].includes(k==="assignee_id"?s.view:""))f[k]=d[k];
      if(d.dateFrom || d.dateTo){
        if(!d.dateFrom || !d.dateTo || d.dateFrom>d.dateTo || (new Date(d.dateTo)-new Date(d.dateFrom))/86400000>=366){s.notice="请完整选择创建日期，起止顺序正确且不超过366天";paint();document.querySelector("[data-cs-field='date-from']")?.focus();return;}
        f.created_from=new Date(`${d.dateFrom}T00:00:00+08:00`).toISOString();f.created_to=new Date(new Date(`${d.dateTo}T00:00:00+08:00`).getTime()+86400000).toISOString();
      }
      s.filters=f;s.page=1;s.notice=null;s.advanced=false;query();
    }
    function actionDraft(){return (s.actionDrafts ||= {})[`${s.ticketId}:request_material`] ||= {body:"",files:[]};}
    async function upload(list,forAction=false){
      const d=forAction?actionDraft():currentDraft(),ticket=s.ticketId,context={...ctx()},scope=forAction?{visibility:"partner",internal_audience:null,collaboration_id:null}:{visibility:s.mode==="internal"?"internal":"partner",internal_audience:s.mode==="internal"?(s.audience==="support"?"support":"collaboration"):null,collaboration_id:s.mode==="internal"&&s.audience!=="support"?s.audience:null};
      const policy=s.caps.active_upload_policy;
      if(!policy || list.length+d.files.length>policy.max_attachment_count || list.reduce((sum,f)=>sum+f.size,0)+d.files.reduce((sum,f)=>sum+f.size_bytes,0)>policy.max_request_bytes){s.error={message:"附件数量或合计大小超过当前上传策略",code:"AFF-42201"};paint();return;}
      s.uploading=true;paint();
      try{
        for(const file of list){
          const response=await service().request("upload",{ticket_id:ticket,...scope,file:{name:file.name,size:file.size,type:file.type},idempotency_key:crypto.randomUUID()},context);
          d.files.push(response.data.attachment);
        }
      }catch(e){s.error=e;}finally{s.uploading=false;paint();}
    }
    async function click(event){
      const el=event.target.closest("[data-cs]");if(!el||el.disabled)return;
      event.preventDefault();event.stopImmediatePropagation();
      const name=el.dataset.cs;
      if(name.startsWith("action:"))return openAction(name.slice(7));
      if(name==="open")return open(el.dataset.csId);
      if(name==="close")return close();
      if(name==="copy"){try{await navigator.clipboard.writeText(el.dataset.value);s.notice="已复制授权编号";}catch{s.notice="复制失败，请选择编号后复制";}return paint();}
      if(name==="dismiss"){s.notice=null;s.error=null;return paint();}
      if(name==="notification"){s.dialog="notification_notice";s.form={};return paint();}
      if(name==="columns"){s.columnPanel=!s.columnPanel;return paint();}
      if(name==="advanced"){s.draft=filterDraft();s.advanced=!s.advanced;paint();if(s.advanced&&!s.assignees.length){try{const d=await api("assigneeFilters",{});s.assignees=d.items||[];paint();}catch(e){s.error=e;paint();}}return;}
      if(name==="filters-cancel"){s.draft=filterDraft();s.advanced=false;return paint();}
      if(name==="filters-reset"){s.draft={field:"ticket_id",keyword:""};return paint();}
      if(name==="columns-reset"){s.visible=columns.slice(0,11).map(c=>c[0]);s.orderColumns=columns.map(c=>c[0]);s.widths={};s.mobileColumns=false;saveLayout();return paint();}
      if(["column-up","column-down"].includes(name)){
        const movable=s.orderColumns.filter(k=>!["ticket_id","actions"].includes(k)),i=movable.indexOf(el.dataset.key),j=i+(name==="column-up"?-1:1);
        if(j>=0&&j<movable.length){[movable[i],movable[j]]=[movable[j],movable[i]];s.orderColumns=["ticket_id",...movable,"actions"];saveLayout();}return paint();
      }
      if(name==="view"){s.view=el.dataset.value;s.page=1;delete s.filters.assignee_id;delete s.draft.assignee_id;return query();}
      if(name==="reset"){s.filters={};s.draft={field:"ticket_id",keyword:""};s.advanced=false;s.page=1;s.notice=null;return query();}
      if(name==="remove-filter"){
        const key=el.dataset.key;
        if(el.hasAttribute("data-filter-value")){s.filters[key]=(s.filters[key] || []).filter(value=>value!==el.dataset.filterValue);if(!s.filters[key].length)delete s.filters[key];}
        else delete s.filters[key];
        if(["created_from","created_to"].includes(key)){delete s.filters.created_from;delete s.filters.created_to;}
        s.draft=filterDraft();s.advanced=false;s.page=1;return query();
      }
      if(name==="sort"){const k=el.dataset.key;if(s.sort!==k){s.sort=k;s.order="desc";}else if(s.order==="desc")s.order="asc";else{s.sort="updated_at";s.order="desc";}s.page=1;return query();}
      if(["prev","next","jump"].includes(name)){s.page=name==="jump"?Math.max(1,Math.min(Math.ceil((s.total||1)/s.size),Number(s.jump)||1)):s.page+(name==="prev"?-1:1);return query();}
      if(name==="claim"){
        s.ticketId=el.dataset.csId;
        try{await reloadDetail();return write("assign",{mode:"claim",assignee_id:ctx().user_id});}catch(e){s.error=e;return paint();}
      }
      if(["refresh","retry"].includes(name)){
        if(!s.caps){s.initialized=false;return init();}
        if(s.ticketId)try{await reloadDetail();}catch(e){s.error=e;}
        return s.caps.context_only?paint():query();
      }
      if(name==="detail-retry")return open(s.ticketId);
      if(name==="load-new"){try{await reloadDetail();s.notice="已加载最新工单，请核对后再提交";}catch(e){s.error=e;}return paint();}
      if(name==="tab"){s.tab=el.dataset.value;return paint();}
      if(name==="expand"){s.expanded=!s.expanded;return paint();}
      if(name==="mode-public"){if(!s.uploading)s.mode="public";return paint();}
      if(name==="mode-internal"){if(!s.uploading)s.mode="internal";return paint();}
      if(name==="send"){const d=currentDraft();return write(s.mode==="internal"?"note":"reply",{kind:s.mode==="internal"?"note":"reply",body:d.body,attachment_ids:d.files.map(f=>f.attachment_id),visibility:s.mode==="internal"?"internal":"partner",internal_audience:s.mode==="internal"?(s.audience==="support"?"support":"collaboration"):null,collaboration_id:s.mode==="internal"&&s.audience!=="support"?s.audience:null},true);}
      if(name==="remove-file"){const d=s.dialog==="request_material"?actionDraft():currentDraft(),id=el.dataset.value;try{await api("deleteAttachment",{ticket_id:s.ticketId,attachment_id:id,idempotency_key:crypto.randomUUID()});d.files=d.files.filter(f=>f.attachment_id!==id);delete s.form._key;}catch(e){s.error=e;}return paint();}
      if(name==="download"){
        try{const d=await api("download",{ticket_id:s.ticketId,attachment_id:el.dataset.value});const blob=new Blob([d.content||""],{type:d.mime_type||"text/plain"}),link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=d.file_name||d.attachment?.file_name||"attachment.txt";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}catch(e){s.error=e;paint();}return;
      }
      if(name==="cancel-discard"){s.dialog=s.cancelForm?.original||null;if(s.cancelForm){s.form=s.cancelForm.form;s.cancelForm=null;}s.pendingLeave=null;return paint();}
      if(name==="discard"){if(s.pendingClearAll){s.drafts={};s.actionDrafts={};}const next=s.pendingLeave;s.pendingLeave=null;s.dialog=null;s.form={};s.cancelForm=null;s.pendingClearAll=false;next?.();return paint();}
      if(name==="cancel-dialog"){
        if(s.busy||s.uploading)return;
        if(Object.entries(s.form).some(([k,v])=>["body","public_body","reason","object_id","assignee_id"].includes(k)&&v) && !["object_notice","task_notice","export_ready"].includes(s.dialog)){
          const original=s.dialog,form=s.form;s.pendingClearAll=false;s.pendingLeave=()=>{delete (s.actionDrafts||{})[`${s.ticketId}:${original}`];s.dialog=null;s.form={};};s.dialog="discard";s.cancelForm={original,form};return paint();
        }
        s.dialog=null;s.form={};s.formError=null;return paint();
      }
      if(name==="export"){s.dialog="export";s.form={};return paint();}
      if(name==="lookup-object"){
        try{const d=await api("objectCandidates",{ticket_id:s.ticketId,object_type:s.form.object_type,object_id:s.form.object_id});s.candidate=(d.items||d.candidates||[])[0]||d.object_ref||null;s.formError=s.candidate?null:{message:"未找到可关联对象",code:"NOT_FOUND"};}catch(e){s.formError=e;}return paint();
      }
      if(name==="detach-object"){await openAction("detach_object");s.form={object_type:el.dataset.type,object_id:el.dataset.value};return paint();}
      if(["search-assignees","assignee-search"].includes(name)){
        try{const d=await api(name==="search-assignees"?"assignees":"assigneeFilters",{ticket_id:s.ticketId,query:name==="search-assignees"?s.form.assignee_query:s.assigneeQuery});s.assignees=d.items||[];}catch(e){s.formError=e;}return paint();
      }
      if(["object","task"].includes(name)){
        const ticketId=el.dataset.csId || s.ticketId;
        try{
          if(name==="task"){
            const detail=await api("collaborationDetail",{ticket_id:ticketId,task_id:el.dataset.value});
            s.dialog="task_notice";s.form={collaboration:detail};s.formError=null;paint();focusDialog();return;
          }
          const target=await api("relatedObject",{ticket_id:ticketId,object_type:el.dataset.type,object_id:el.dataset.value});
          if(target.available)return leave(()=>{s.dialog=null;navigate(target.route);});
          s.dialog="object_notice";s.form={object_id:el.dataset.value,notice:target.reason};s.formError=null;
        }catch(e){s.dialog=name==="object"?"object_notice":"task_notice";s.form={object_id:el.dataset.value,notice:e.message || "未找到可访问的关联对象"};s.formError=e;}
        paint();focusDialog();return;
      }
      if(name==="older-history"){try{const d=await api("history",{ticket_id:s.ticketId,cursor:s.historyCursor,limit:20});s.history.push(...(d.entries||d.items||[]));s.historyCursor=d.next_cursor;}catch(e){s.error=e;}return paint();}
      if(name==="older-messages"){try{const d=await api("messages",{ticket_id:s.ticketId,before:s.messageCursor,cursor:s.messageCursor,limit:50});s.messages=[...(d.items||d.messages||[]),...s.messages];s.messageCursor=d.next_cursor||d.message_cursor;}catch(e){s.error=e;}return paint();}
      if(name==="retry-form"){s.formError=null;paint();return;}
    }
    document.addEventListener("click",e=>{if(active()&&e.target.closest("[data-cs]"))click(e);},true);
    document.addEventListener("submit",e=>{
      if(!active())return;
      if(e.target.id==="cs-query"){e.preventDefault();e.stopImmediatePropagation();applyQuery();}
      if(e.target.id==="cs-action-form"){e.preventDefault();e.stopImmediatePropagation();submitAction();}
    },true);
    document.addEventListener("input",e=>{
      if(!active())return;
      const n=e.target,key=n.dataset.csField;
      if(n.dataset.csOptionSearch){const field=n.closest("fieldset");field.querySelectorAll("div label").forEach(label=>label.hidden=!label.textContent.includes(n.value));return;}
      if(!key)return;e.stopImmediatePropagation();
      if(key==="body"){
        currentDraft().body=n.value;
        delete s.form._key;
        document.querySelector("[data-cs-counter]").textContent=`${count(n.value)} / 5000`;
        const send=document.querySelector("[data-cs='send']");
        if(send)send.disabled=!capability(s.mode==="internal"?"note":"reply")?.enabled || count(n.value.trim())<(s.mode==="internal"?10:1)||count(n.value)>5000||currentDraft().files.some(f=>f.scan_status!=="clean"||f.policy_error)||s.busy||!navigator.onLine;
      }else if(key.startsWith("form-")){s.form[key.slice(5)]=n.value;if(s.dialog==="request_material"&&key==="form-body")actionDraft().body=n.value;delete s.form._key;}
      else if(key==="keyword")s.draft.keyword=n.value;
      else if(key==="date-from")s.draft.dateFrom=n.value;
      else if(key==="date-to")s.draft.dateTo=n.value;
      else if(key==="page")s.jump=n.value;
      else if(key==="assignee-search")s.assigneeQuery=n.value;
    },true);
    document.addEventListener("change",e=>{
      if(!active())return;const n=e.target,key=n.dataset.csField;
      if(n.hasAttribute("data-cs-quick-filter")){
        e.stopImmediatePropagation();if(n.value==="__multiple__")return;
        const filter=n.dataset.csQuickFilter;
        if(n.value)s.filters[filter]=[n.value];else delete s.filters[filter];
        s.draft=filterDraft();s.advanced=false;s.page=1;query();return;
      }
      if(n.matches("[data-cs-upload]")){e.stopImmediatePropagation();upload([...n.files]);return;}
      if(n.matches("[data-cs-action-upload]")){e.stopImmediatePropagation();upload([...n.files],true);return;}
      if(n.dataset.csMulti){const k=n.dataset.csMulti;s.draft[k]=[...document.querySelectorAll(`[data-cs-multi="${k}"]:checked`)].map(x=>x.value);e.stopImmediatePropagation();return;}
      if(n.dataset.csColumn){const k=n.dataset.csColumn;s.visible=n.checked?[...new Set([...s.visible,k])]:s.visible.filter(v=>v!==k);s.mobileColumns=true;saveLayout();paint();e.stopImmediatePropagation();return;}
      if(!key)return;e.stopImmediatePropagation();
      if(key==="quick-field"){s.draft.field=n.value;s.draft.keyword="";paint();}
      else if(key==="audience"){if(!s.uploading)s.audience=n.value;paint();}
      else if(key==="page-size"){s.size=Number(n.value);s.page=1;saveLayout();query();}
      else if(key.startsWith("form-")){s.form[key.slice(5)]=n.value;delete s.form._key;if(["form-close_reason","form-object_type"].includes(key)){s.candidate=null;paint();}}
      else if(["queue_id","assignee_id"].includes(key))s.draft[key]=n.value;
    },true);
    document.addEventListener("keydown",e=>{
      if(!active())return;
      if(e.key==="Escape" && (s.dialog || s.ticketId)){
        e.preventDefault();e.stopImmediatePropagation();
        if(s.dialog==="discard"){s.dialog=s.cancelForm?.original||null;if(s.cancelForm){s.form=s.cancelForm.form;s.cancelForm=null;}s.pendingLeave=null;paint();}
        else if(s.dialog){document.querySelector("[data-cs='cancel-dialog']")?.click();}
        else close();return;
      }
      if(e.key==="Tab" && (s.dialog || s.ticketId)){
        const scope=document.querySelector(s.dialog?".cs-modal":".cs-drawer"),focusable=[...(scope?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex="0"]')||[])].filter(n=>n.getClientRects().length);
        if(focusable.length && (!scope.contains(document.activeElement) || e.shiftKey&&document.activeElement===focusable[0] || !e.shiftKey&&document.activeElement===focusable.at(-1))){e.preventDefault();(e.shiftKey?focusable.at(-1):focusable[0]).focus();}
      }
      if(e.target.dataset.csResize && ["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();const c=columns.find(c=>c[0]===e.target.dataset.csResize);s.widths[c[0]]=Math.min(600,Math.max(c[3],(s.widths[c[0]]||c[2])+(e.key==="ArrowRight"?10:-10)));saveLayout();paint();}
    },true);
    document.addEventListener("pointerdown",e=>{
      if(!active()||!e.target.dataset.csResize)return;e.preventDefault();
      const key=e.target.dataset.csResize,c=columns.find(c=>c[0]===key),start=e.clientX,width=s.widths[key]||c[2];
      const move=ev=>{s.widths[key]=Math.min(600,Math.max(c[3],width+ev.clientX-start));const col=[...document.querySelectorAll(".cs-table th")].findIndex(th=>th.classList.contains(`cs-col-${key}`));const item=document.querySelectorAll(".cs-table col")[col];if(item)item.style.width=`${s.widths[key]}px`;document.querySelector(".cs-table").style.width=`${[...document.querySelectorAll(".cs-table col")].reduce((n,c)=>n+parseInt(c.style.width),0)}px`;};
      const up=()=>{document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);saveLayout();paint();};
      document.addEventListener("pointermove",move);document.addEventListener("pointerup",up);
    });
    let readObserver;
    function mount(){
      if(!s.initialized)queueMicrotask(init);
      if(s.dialog){document.body.classList.add("admin-modal-open");if(!document.querySelector(".cs-modal")?.contains(document.activeElement))focusDialog();}
      readObserver?.disconnect();
      if(s.ticketId && s.readToken && s.tab==="communication"){
        readObserver=new IntersectionObserver(entries=>{
          const sequences=entries.filter(e=>e.isIntersecting).map(e=>s.messages[[...document.querySelectorAll(".cs-message")].indexOf(e.target)]).filter(m=>m?.sender_type==="partner").map(m=>m.sequence);
          if(!sequences.length)return;
          api("readPosition",{ticket_id:s.ticketId,read_position_token:s.readToken,last_visible_partner_sequence:Math.max(...sequences),idempotency_key:crypto.randomUUID()}).catch(e=>{s.error=e;});
        },{root:document.querySelector(".cs-drawer-scroll"),threshold:.2});
        document.querySelectorAll(".cs-message").forEach(n=>readObserver.observe(n));
      }
    }
    setInterval(async()=>{
      if(!active()||document.hidden||!navigator.onLine||s.busy||!s.caps)return;
      try{
        if(s.ticketId&&s.detail){const d=await api("detail",{ticket_id:s.ticketId});if(d.ticket.version!==s.detail.version){if(hasDraft())s.newVersion=true;else await reloadDetail();paint();}}
        for(const d of [...Object.values(s.drafts),...Object.values(s.actionDrafts||{})])for(let i=0;i<d.files.length;i++)if(d.files[i].scan_status==="pending"){const a=await api("attachment",{attachment_id:d.files[i].attachment_id,ticket_id:s.ticketId});d.files[i]=a.attachment||a;paint();}
      }catch(e){if(["AFF-40301","AFF-40401"].includes(e.code)){s.rows=null;s.total=null;s.detail=null;s.messages=[];s.history=[];s.drafts={};s.actionDrafts={};s.caps=null;}s.error=e;paint();}
    },15000);
    setInterval(async()=>{
      if(!active()||document.hidden||!navigator.onLine||s.busy||!s.caps||s.caps.context_only)return;
      try{const d=await api("list",{...s.filters,view:s.view,page:s.page,page_size:s.size,sort_by:s.sort,sort_order:s.order});if(d.total!==s.total || JSON.stringify(d.items.map(t=>[t.ticket_id,t.version]))!==JSON.stringify((s.rows||[]).map(t=>[t.ticket_id,t.version]))){s.notice="工单列表有更新，请刷新查看";paint();}}catch(e){s.error=e;if(e.code==="AFF-40301"){s.rows=null;s.total=null;s.detail=null;s.drafts={};}paint();}
    },30000);
    window.addEventListener("offline",paint);window.addEventListener("online",paint);
    window.addEventListener("beforeunload",e=>{if(active()&&hasDraft()){e.preventDefault();e.returnValue="";}});
    window.AFF_SUPPORT_UI={state:s,refresh:async()=>{await reloadDetail();await query();},setContext(context){state.role=normalizeEmployeeRole(context.role);window.AFF_SUPPORT_CONTEXT={...context,role:state.role==="risk_supervisor"?"supervisor":state.role};s.caps=null;s.rows=null;s.detail=null;s.ticketId=null;s.drafts={};s.initialized=false;s.error=null;paint();}};
    return {page,drawer,dialog,mount,beforeLeave,syncURL,ensureContext};
  })();
  let acceptedHash = location.hash;
  window.addEventListener("hashchange",()=>{
    if (state.routeId === "tickets" && !supportUI.beforeLeave(location.hash)) {
      history.replaceState(null,"",acceptedHash);
      return;
    }
    if (typeof taskQueueBeforeLeave === "function" && !taskQueueBeforeLeave(location.hash)) {
      history.replaceState(null,"",acceptedHash);
      return;
    }
    syncFromHash();render();tqRestoreInspection();acceptedHash=location.hash;
  });
  state.savedViews = loadSavedViews();
  syncFromHash();render();
  setInterval(()=>{
    const clock=document.querySelector(".tm-clock");
    if(clock)clock.innerHTML=adminClockMarkup();
    if(configRefreshScheduledVersions()&&state.routeId==="admin-config"&&!document.querySelector(".dev-modal")&&!document.querySelector("[data-config-save]"))render();
  },1000);
})();
