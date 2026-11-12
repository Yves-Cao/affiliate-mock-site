/* Affiliate管理端重建版 · admin-rebuild.js v2
 * 依据：重建功能底账v1.2 / 页面布局规格v1.0 / 组件规范v1.1（42组件，ac-前缀）
 * 全26页：工作台(方案A)+入驻审核+合作方+客户+归属+事件+素材+回传+追踪+佣金+结算+提现+对账+风险+工单+通知+公告+统计×3+配置+权限+审计+导出+治理+集成
 */
"use strict";

/* ===== 状态 ===== */
const AC_STATE = {route:"workbench",tab:"",role:"operations",pageSize:20,matView:"list",matSelected:[],configDomain:"价格表",configView:"list",configVersion:"20261108094530",wbRange:"today",riskGroup:"风控风险"};
let AC_ACTION_PORTAL = null;
const AC_ROLES = [["operations","运营"],["finance","财务"],["risk_supervisor","主管"],["admin","管理员"]];
const AC_MENU = [
  {group:"工作台",items:[{id:"workbench",label:"工作台",badge:()=>9}]},
  {group:"合作方",items:[{id:"onboarding-review",label:"入驻审核",badge:()=>3},{id:"partners",label:"合作方列表"}]},
  {group:"客户与归因",items:[{id:"clients",label:"客户列表"},{id:"attribution",label:"归属管理"},{id:"events",label:"事件流水"}]},
  {group:"推广",items:[{id:"materials",label:"素材管理"},{id:"postback",label:"回传监控"},{id:"tracking",label:"链接追踪"}]},
  {group:"财务",items:[{id:"commission-settlement",label:"佣金结算"},{id:"withdrawals",label:"提现"},{id:"recon",label:"对账与关账"}]},
  {group:"风控",items:[{id:"risk",label:"风险工作台"},{id:"tickets",label:"客户服务"}]},
  {group:"消息",items:[{id:"notifications",label:"通知中心"},{id:"announcements",label:"公告管理"}]},
  {group:"统计",items:[{id:"analytics-performance",label:"经营分析"},{id:"analytics-quality",label:"质量与风险"},{id:"analytics-funds",label:"资金分析"}]},
  {group:"系统",items:[{id:"config",label:"配置中心"},{id:"permissions",label:"权限管理"},{id:"audit",label:"操作审计"},{id:"exports",label:"导出中心"},{id:"governance",label:"数据治理"},{id:"integrations",label:"系统集成"}]},
];
const AC_PAGE_META = {
  "workbench":{group:"工作台",title:"工作台",desc:"业务快照、任务与异常的统一操作入口"},
  "onboarding-review":{group:"合作方",title:"入驻审核",desc:"通过 / 驳回 / 要求补件"},
  "partners":{group:"合作方",title:"合作方列表",desc:"信息枢纽：资料 · 推广（只读）· 合规 · 财务 · 业绩 · 备注"},
  "clients":{group:"客户与归因",title:"客户列表",desc:"只读 · 服务归属争议与风控排查"},
  "attribution":{group:"客户与归因",title:"归属管理",desc:"IB / Affiliate 双向隔离 · 异常队列"},
  "events":{group:"客户与归因",title:"事件流水",desc:"点击→提现全链路事件底账"},
  "materials":{group:"推广",title:"素材管理",desc:"官方素材维护 · 版本与适用范围可追溯"},
  "postback":{group:"推广",title:"回传监控",desc:"合作者自助配置 · 管理端只读监控"},
  "tracking":{group:"推广",title:"链接追踪",desc:"点击明细 · 转化路径"},
  "commission-settlement":{group:"财务",title:"佣金结算",desc:"结算批次、佣金底账与结算前阻断的一体工作台"},
  "withdrawals":{group:"财务",title:"提现",desc:"MVP全人工审核"},
  "recon":{group:"财务",title:"对账与关账",desc:"内部一致性对账（MVP）"},
  "risk":{group:"风控",title:"风险工作台",desc:"风控唯一入口 · 处理全走任务队列"},
  "tickets":{group:"风控",title:"客户服务",desc:"合作方服务工单、沟通与专业协作"},
  "notifications":{group:"消息",title:"通知中心",desc:"站内+邮件 · 投递监控"},
  "announcements":{group:"消息",title:"公告管理",desc:"发布 · 置顶 · 有效期 · 撤回"},
  "analytics-performance":{group:"统计",title:"经营分析",desc:"规模 · 转化 · 佣金成本"},
  "analytics-quality":{group:"统计",title:"质量与风险分析",desc:"流量质量与风险损失"},
  "analytics-funds":{group:"统计",title:"资金分析",desc:"资金流与保证金覆盖"},
  "config":{group:"系统",title:"配置中心",desc:"规则配置 · 版本化发布链"},
  "permissions":{group:"系统",title:"权限管理",desc:"角色 × 页面 × 动作矩阵"},
  "audit":{group:"系统",title:"操作审计",desc:"全局操作底账"},
  "exports":{group:"系统",title:"导出中心",desc:"异步导出 · 审批 · 过期"},
  "governance":{group:"系统",title:"数据治理",desc:"分级 · 授权 · 保留 · Breach"},
  "integrations":{group:"系统",title:"系统集成",desc:"外部系统健康与失败任务"},
};

/* ===== 种子数据 ===== */
const AC_DB = (() => {
  const P = [["AF-1023","Meridian Leads","印尼","公司","合作中","C2",48210,12650,341],["AF-0777","Apex Media","越南","公司","合作中","C1",31840,9120,218],["AF-1042","Siam Clicks","泰国","个人","观察中","C2",12480,4830,96],["AF-1105","Nova Traffic","墨西哥","公司","申请中","—",0,0,0],["AF-0921","Lagos Partners","尼日利亚","公司","合作中","C0",20350,0,187],["AF-0866","Golden Bridge","马来","公司","清退中","C1",26730,0,203],["AF-0998","Andes Promo","巴西","个人","合作中","C3",15920,6110,141]];
  return {
    partners:P.map(r => ({id:r[0],name:r[1],country:r[2],type:r[3],status:r[4],grade:r[5],total:r[6],pending:r[7],clients:r[8]})),
    clients:[["C-88231","印尼","11-02","有效FTD",250,"AF-1023","L-2001","siteresia","低"],["C-88245","越南","11-02","FTD",100,"AF-0777","L-2002","tg_vn","低"],["C-88301","泰国","11-03","注册",0,"AF-1042","L-2005","fb_th","无"],["C-88354","尼日利亚","11-03","有效FTD",500,"AF-0921","L-2009","ng_bulk","高"],["C-88402","巴西","11-04","FTD",200,"AF-0998","L-2012","br_pp","低"],["C-88455","印尼","11-04","注册",0,"AF-1023","L-2001","siteresia","无"],["C-88479","墨西哥","11-05","有效FTD",350,"AF-1023","L-2014","mx_tik","中"],["C-88512","越南","11-05","流失",150,"AF-0777","L-2002","tg_vn","低"]].map(r => ({id:r[0],country:r[1],reg:r[2],life:r[3],ftd:r[4],partner:r[5],link:r[6],sub:r[7],risk:r[8]})),
    onboarding:[["OB-3301","Nova Traffic","公司","墨西哥","10-31 14:22",1.2,"已通过","100%"],["OB-3302","Delta Reach","个人","印尼","11-01 09:40",1.0,"待审核","85%"],["OB-3303","Kano Digital","公司","尼日利亚","11-03 16:05",3.5,"补件中","60%"],["OB-3304","Pacific Loop","公司","泰国","11-05 11:30",0.6,"待审核","95%"],["OB-3299","Urba Clicks","个人","巴西","10-28 10:12",4.2,"已驳回","40%"]].map(r => ({id:r[0],name:r[1],type:r[2],country:r[3],time:r[4],wait:r[5],status:r[6],docs:r[7]})),
    attribution:[["AE-401","归属冲突","C-88231","AF-1023 / AF-0777","双链接7日内先后点击","11-04","待处理"],["AE-402","越界拦截","C-88004","IB-3307","客户已有IB归属，拦截Affiliate计入","11-03","已修正"],["AE-403","规则缺失","C-88388","—","来源链接已停用，无规则可用","11-05","待处理"],["AE-404","重复归属","C-87955","AF-0921","重复注册账号合并判定","11-02","误报"],["AE-405","归属冲突","C-88479","AF-1023 / AF-1042","跨设备重复点击窗口重叠","11-06","待处理"]].map(r => ({id:r[0],type:r[1],client:r[2],partners:r[3],desc:r[4],time:r[5],status:r[6]})),
    events:[["tr-7a3f","点击","Tracking","C-88479","正常","11-05 14:02:11"],["tr-7a3f","注册","CRM","C-88479","正常","11-05 14:09:38"],["tr-7a3f","FTD","CRM","C-88479","正常","11-06 09:12:04"],["tr-7a3f","计佣","计佣引擎","C-88479","正常","11-06 09:12:07"],["tr-9b21","点击","Tracking","C-88354","正常","11-03 21:44:02"],["tr-9b21","注册","CRM","C-88354","正常","11-03 21:50:19"],["tr-9b21","FTD","CRM","C-88354","缺数","—"],["tr-5c88","点击","Tracking","C-88245","正常","11-02 08:31:55"],["tr-5c88","注册","CRM","C-88245","正常","11-02 08:40:12"],["tr-5c88","FTD","CRM","C-88245","正常","11-02 19:02:33"],["tr-5c88","计佣","计佣引擎","C-88245","正常","11-02 19:02:35"]].map(r => ({tid:r[0],type:r[1],src:r[2],obj:r[3],status:r[4],time:r[5]})),
    materials:[
      {id:"AST-1001",name:"IDR 标准横幅",type:"横幅",version:3,status:"启用",countries:["印尼"],languages:["印尼语"],devices:["网站"],platforms:["Google Display"],scope:"印尼 · 印尼语 · 网站 · Google Display",path:"LP-ID-001 · 印尼开户注册",size:"1200×628",format:"PNG",file:"idr-standard-v3.png",updated:"2026-11-08 09:42",created:"2026-10-21 15:20",uses:38,description:"面向印尼市场的标准开户注册横幅。",validFrom:"2026-11-08",validTo:"—",operator:"ops_chen",color:"gold"},
      {id:"AST-1002",name:"VN Gold 落地页",type:"落地页",version:2,status:"启用",countries:["越南"],languages:["越南语","英语"],devices:["网站","Android"],platforms:["官方站点"],scope:"越南 · 越南语/英语 · 网站/Android",path:"LP-VN-002 · Gold开户页",size:"官方路径",format:"路径引用",file:"—",updated:"2026-11-07 18:06",created:"2026-10-18 11:06",uses:52,description:"越南 Gold 方案官方落地页引用。",validFrom:"2026-10-18",validTo:"—",operator:"ops_chen",color:"plum"},
      {id:"AST-1003",name:"NG 介绍视频",type:"视频",version:1,status:"待生效",countries:["尼日利亚"],languages:["英语"],devices:["网站","iOS","Android"],platforms:["YouTube","Meta"],scope:"尼日利亚 · 英语 · 网站/iOS/Android",path:"LP-NG-001 · 官方开户注册",size:"1920×1080",format:"MP4",file:"ng-intro-v1.mp4",updated:"2026-11-08 08:15",created:"2026-11-08 08:15",uses:11,description:"尼日利亚市场官方产品介绍视频。",validFrom:"2026-11-10",validTo:"—",operator:"content_wu",color:"blue"},
      {id:"AST-1004",name:"BR 节日 GIF",type:"GIF",version:4,status:"停用",countries:["巴西"],languages:["葡萄牙语"],devices:["网站"],platforms:["Meta"],scope:"巴西 · 葡萄牙语 · 网站 · Meta",path:"LP-BR-003 · 节日活动页",size:"728×90",format:"GIF",file:"br-festival-v4.gif",updated:"2026-11-06 16:20",created:"2026-09-14 10:20",uses:26,description:"巴西节日活动页配套动态素材。",validFrom:"2026-09-14",validTo:"—",operator:"content_wu",color:"coral"},
      {id:"AST-1005",name:"MX 标准落地页",type:"落地页",version:1,status:"启用",countries:["墨西哥"],languages:["西班牙语"],devices:["网站"],platforms:["官方站点"],scope:"墨西哥 · 西班牙语 · 网站",path:"LP-MX-001 · 标准开户注册",size:"官方路径",format:"路径引用",file:"—",updated:"2026-11-05 13:48",created:"2026-11-05 13:48",uses:31,description:"墨西哥市场标准官方落地页引用。",validFrom:"2026-11-05",validTo:"—",operator:"ops_chen",color:"green"},
      {id:"AST-1006",name:"TH 横幅旧版本",type:"横幅",version:1,status:"归档",countries:["泰国"],languages:["泰语"],devices:["网站"],platforms:["Google Display"],scope:"泰国 · 泰语 · 网站 · Google Display",path:"LP-TH-001 · 注册入口",size:"970×250",format:"PNG",file:"th-old-v1.png",updated:"2026-09-28 09:31",created:"2026-08-12 09:31",uses:0,description:"已被新版替换的历史横幅，仅供追溯。",validFrom:"2026-08-12",validTo:"2026-09-28",operator:"ops_chen",color:"gray"},
      {id:"AST-1007",name:"全市场通用横幅",type:"横幅",version:2,status:"过期",countries:["印尼","越南","泰国"],languages:["英语"],devices:["网站"],platforms:["Meta"],scope:"印尼/越南/泰国 · 英语 · 网站 · Meta",path:"LP-GLOBAL-001 · 官方注册入口",size:"800×600",format:"PNG",file:"global-standard-v2.png",updated:"2026-10-31 20:12",created:"2026-09-02 11:12",uses:0,description:"已过有效期的通用横幅，保留历史引用。",validFrom:"2026-09-02",validTo:"2026-10-31",operator:"content_wu",color:"slate"},
      {id:"AST-1008",name:"ID App 竖版视频",type:"视频",version:2,status:"启用",countries:["印尼"],languages:["印尼语"],devices:["iOS","Android"],platforms:["TikTok"],scope:"印尼 · 印尼语 · iOS/Android · TikTok",path:"LP-ID-004 · App开户注册",size:"1080×1920",format:"MP4",file:"id-app-v2.mp4",updated:"2026-11-04 10:02",created:"2026-10-03 10:02",uses:19,description:"印尼 App 投放竖版视频。",validFrom:"2026-10-03",validTo:"—",operator:"content_wu",color:"violet"},
      {id:"AST-1009",name:"VN 移动 GIF",type:"GIF",version:2,status:"启用",countries:["越南"],languages:["越南语"],devices:["Android"],platforms:["Zalo"],scope:"越南 · 越南语 · Android · Zalo",path:"LP-VN-003 · 移动注册页",size:"640×360",format:"GIF",file:"vn-mobile-v2.gif",updated:"2026-11-03 14:22",created:"2026-10-19 14:22",uses:7,description:"越南 Android 渠道移动 GIF。",validFrom:"2026-10-19",validTo:"—",operator:"ops_chen",color:"teal"},
    ].map(m => ({...m,history:[{version:m.version,created:m.created,operator:m.operator,status:m.status,file:m.file,note:m.version > 1 ? "替换上一版本，保留历史引用。" : "首次创建素材。"}],audit:[{time:m.updated,operator:m.operator,action:m.version > 1 ? "替换并启用新版本" : "创建素材",reason:m.version > 1 ? "内容更新" : "官方素材入库",result:"成功"}]})),
    postback:[["AF-1023","cb.meridian-leads.com","注册+FTD","99.2%","成功 11-06 09:12","0","正常"],["AF-0777","hook.apexmedia.io","FTD","62.5%","失败 11-06 08:55","6","失败告警"],["AF-0998","post.andes.click","注册","98.1%","成功 11-05 22:31","0","正常"],["AF-1042","—","未配置","—","—","—","暂停"]].map(r => ({id:r[0],url:r[1],ev:r[2],rate:r[3],last:r[4],fails:r[5],status:r[6]})),
    tracking:[["11-06 09:41","AF-1023","L-2001","siteresia","iOS","印尼","已计佣"],["11-06 09:38","AF-0777","L-2002","tg_vn","Android","越南","已FTD"],["11-06 09:30","AF-0998","L-2012","br_pp","Desktop","巴西","已注册"],["11-06 09:12","AF-0921","L-2009","ng_bulk","Android","尼日利亚","已FTD"],["11-06 08:59","AF-1023","L-2014","mx_tik","iOS","墨西哥","未转化"],["11-06 08:47","AF-1042","L-2005","fb_th","Desktop","泰国","未转化"]].map(r => ({time:r[0],partner:r[1],link:r[2],sub:r[3],dev:r[4],geo:r[5],stage:r[6]})),
    commissions:[["CM-55101","AF-1023","C-88231","L2·有效FTD","基础$80+加成$16","96.00","已计佣","无","11-20"],["CM-55102","AF-0777","C-88245","L1·FTD","基础$60","60.00","已计佣","结算中","11-16"],["CM-55103","AF-0921","C-88354","L2·有效FTD","基础$80+加成$16","96.00","已计佣","C0等级","—"],["CM-55104","AF-1042","C-88301","—","—","0.00","待事件","数据缺数","—"],["CM-55105","AF-0998","C-88402","L1·FTD","基础$60","60.00","已计佣","风险隔离","11-17"],["CM-55106","AF-1023","C-88479","L2·有效FTD","基础$80+加成$16","96.00","已计佣","无","11-21"],["CM-55107","AF-0866","C-88102","L1·有效FTD","基础$60","60.00","已冲正","已冲正","—"]].map(r => ({id:r[0],partner:r[1],client:r[2],tier:r[3],comp:r[4],amount:r[5],status:r[6],block:r[7],hold:r[8]})),
    statements:[["STM-2026-11-A","11-01~11-30",23,482100,52130,429970,"待审批","—"],["STM-2026-10-B","10-01~10-31",21,448650,48920,399730,"已付款","finance_li"],["STM-2026-10-C","10-补发",2,12600,1180,11420,"已确认","finance_wu"]].map(r => ({id:r[0],cycle:r[1],partners:r[2],total:r[3],deduct:r[4],net:r[5],status:r[6],approver:r[7]})),
    stmtDetail:[["AF-1023","Meridian Leads",48210,4820,43390,""],["AF-0777","Apex Media",31840,3180,28660,""],["AF-0921","Lagos Partners",20350,2035,18315,"C0"],["AF-1042","Siam Clicks",12480,1250,11230,""],["AF-0998","Andes Promo",15920,1590,14330,""]].map(r => ({id:r[0],name:r[1],comm:r[2],deduct:r[3],net:r[4],c0:r[5]})),
    withdrawals:[["WD-5567","AF-1023",12400,124,12276,"MER•••4821","11-06 09:58","待审核"],["WD-5566","AF-0777",8000,80,7920,"APX•••1130","11-05 16:22","已通过"],["WD-5565","AF-0998",5000,50,4950,"AND•••7702","11-04 11:40","支付中"],["WD-5564","AF-1042",3000,30,2970,"SIA•••5518","11-03 14:05","失败"],["WD-5563","AF-1023",15000,150,14850,"MER•••4821","11-01 10:12","已支付"]].map(r => ({id:r[0],partner:r[1],amt:r[2],fee:r[3],real:r[4],acct:r[5],time:r[6],status:r[7]})),
    recon:[["RC-118","2026-10","金额不平","佣金合计与结算分摊差 $320",320,"STM-2026-10-B","待处理"],["RC-117","2026-10","重复流水","WD-5561 重复记账",150,"WD-5561","已处理"],["RC-116","2026-09","缺流水","税费代扣缺 3 条",89,"STM-2026-09-A","已容忍"],["RC-115","2026-09","状态不一致","提现支付结果未回写",12000,"WD-5539","已处理"]].map(r => ({id:r[0],cycle:r[1],type:r[2],desc:r[3],amt:r[4],obj:r[5],status:r[6]})),
    riskObjects:[["AF-0921","合作方","R4","集群CL-118","同IP注册11账号",4260],["C-88354","客户","R3","拒付+多账号","拒付$500·3账号",500],["CL-118","集群","R4","设备/IP/支付三重关联","11成员·共享支付工具2个",4260],["AF-1042","合作方","R2","评分上升","转化异常波动",1240],["C-88512","客户","R2","CRM欺诈引用","CRM标记关联欺诈库",820]].map(r => ({obj:r[0],type:r[1],grade:r[2],src:r[3],evid:r[4],amt:r[5]})),
    clusters:[["CL-118","设备+IP+支付",11,4260,"调查中"],["CL-104","设备",6,1820,"隔离中"],["CL-097","支付工具",4,960,"已解除"]].map(r => ({id:r[0],rel:r[1],members:r[2],amt:r[3],status:r[4]})),
    blacklist:[["设备","d9f3••22","同IP批量注册","自动","10-28","生效"],["IP","41.203.••","撞库尝试","自动","11-02","生效"],["支付工具","VISA••4491","拒付关联","人工复核","11-04","生效"],["客户","C-87321","欺诈库匹配","自动","10-15","生效"],["合作方","AF-0712","流量造假清退","人工复核","09-30","生效"]].map(r => ({type:r[0],val:r[1],reason:r[2],src:r[3],time:r[4],status:r[5]})),
    tickets:[["TK-7701","异常","AF-1023","佣金未计入我的客户C-88479","中",6,"处理中"],["TK-7702","咨询","AF-0998","提现到账时间咨询","低",22,"待受理"],["TK-7703","争议","AF-0866","清退最终结算金额争议","高",-2,"处理中"],["TK-7704","咨询","AF-1042","素材尺寸要求","低",30,"已关闭"]].map(r => ({id:r[0],type:r[1],partner:r[2],subject:r[3],priority:r[4],sla:r[5],status:r[6]})),
    notifications:[["11-06 09:15","结算送审","财务角色","站内+邮件","T-v9","成功"],["11-06 08:55","回传失败告警","AF-0777","站内","T-v4","失败"],["11-05 18:30","审批通过通知","operations_wang","邮件","T-v9","退信"],["11-05 14:00","风险处置通知","risk_supervisor","站内","T-v6","成功"],["11-05 09:00","公告发布","全体合作方","站内","T-v2","成功"]].map(r => ({time:r[0],ev:r[1],to:r[2],ch:r[3],tpl:r[4],status:r[5]})),
    announcements:[["11月交易大赛公告","已发布","置顶","11-05 10:00","11-30",214],["KYC资料更新提醒","已发布","","11-02 09:00","长期",1902],["新价格表生效预告 v14","已发布","","10-28 16:40","11-15",933],["国庆假期结算延迟通知","已过期","","09-28 11:00","10-08",1544],["风控政策问答（草稿）","草稿","","—","—",0]].map(r => ({title:r[0],status:r[1],top:r[2],pub:r[3],exp:r[4],reads:r[5]})),
    configDomains:["价格表","资格档与里程碑","信用等级权益","结算参数","保证金与税费","国家与主体","审批流","风控规则","参数字典"],
    configEntries:{"价格表":[["印尼·标准·L1","$60","v13","生效中"],["印尼·标准·L2","$80","v13","生效中"],["越南·标准·L1","$55","v13","生效中"],["尼日利亚·标准·L1","$70","v13","生效中"],["墨西哥·标准·L2","$75","v14草稿","草稿"]],"资格档与里程碑":[["L1","FTD $100","v8","生效中"],["L2","有效FTD $250","v8","生效中"],["L3","有效FTD $500 + 留存30天","v8","生效中"]],"信用等级权益":[["C0","不进结算（硬规则）","v5","生效中"],["C1","结算期+7天","v5","生效中"],["C2","标准权益","v5","生效中"],["C4","结算期-3天·提现T+1","v5","生效中"]],"结算参数":[["基础结算期","D+14","v6","生效中"],["C0附加","+30天","v6","生效中"],["集群延长上限","3次","v6","生效中"]],"保证金与税费":[["保证金比例","10%","v4","生效中"],["释放周期","T+30","v4","生效中"],["代扣税率","按国家字典","v4","生效中"]],"国家与主体":[["印尼","开放·Max Intl","v3","生效中"],["越南","开放·Max Intl","v3","生效中"],["美国","禁投","v3","生效中"]],"审批流":[["结算审批","财务→财务主管","v2","生效中"],["提现审批","财务","v2","生效中"],["调级审批","风控主管","v2","生效中"]],"风控规则":[["D1流量画像","启用","v11","生效中"],["D2官方路径库","启用","v11","生效中"],["集群阈值·同IP","≥5","v11","生效中"]],"参数字典":[["FTD归因窗口","7天","v1","生效中"],["导出保留","24小时","v1","生效中"],["审计保留","1095天","v1","生效中"]]},
    audit:[["11-06 09:12","system","系统","STM-2026-11-A","自动送审","成功","结算模块","tr-stm11a"],["11-06 08:55","finance_li","财务","WD-5566","审批通过","成功","提现页","ap-902x"],["11-05 17:41","risk_zhao","风控主管","AF-0921","生成风险复核","成功","风险工作台","rk-5512"],["11-05 14:22","ops_chen","运营","价格表","新建草稿v14","成功","配置中心","cf-2231"],["11-05 10:00","operations_wang","运营","公告#42","发布","成功","公告管理","an-0042"],["11-04 16:30","risk_reviewer1","风控复核员","CL-118","延长结算","成功","任务队列","t-2403x"]].map(r => ({time:r[0],user:r[1],role:r[2],obj:r[3],act:r[4],result:r[5],from:r[6],tid:r[7]})),
    exports:[["EX-881","佣金记录","2026-10 全量","4,821","敏感","可下载"],["EX-880","经营分析","2026-10 汇总","312","内部","处理中"],["EX-879","操作审计","2026-09","22,014","受限","审批中"],["EX-878","客户列表","2026-10 全量","1,205","敏感","可下载"],["EX-877","提现流水","2026-10","88","内部","已过期"]].map(r => ({id:r[0],src:r[1],range:r[2],rows:r[3],level:r[4],status:r[5]})),
    govLevels:[["客户身份资料","敏感","脱敏展示·导出需审批","v2"],["收款账户","敏感","脱敏展示·变更留痕","v2"],["行为事件","内部","自由导出","v1"],["审计日志","受限","仅合规与管理员","v1"]].map(r => ({dom:r[0],level:r[1],policy:r[2],ver:r[3]})),
    govAuth:[["finance_li","收款账户全量","提现核验","至2026-12-31","已批准"],["risk_reviewer1","客户证件号","欺诈调查","至2026-11-30","已批准"],["ops_chen","客户手机号","归属排查","至2026-11-21","待审批"]].map(r => ({user:r[0],field:r[1],purpose:r[2],exp:r[3],status:r[4]})),
    govRetain:[["点击证据","180天","到期匿名化","自动"],["身份资料","合作终止后5年","到期删除","需审批"],["导出文件","24小时","到期删除","自动"],["审计日志","1095天","到期归档","自动"]].map(r => ({dom:r[0],period:r[1],action:r[2],mode:r[3]})),
    govBreach:[["BR-003","中","联系方式字段导出越权","已通知","4h","处置中"],["BR-002","高","客户资料库异常访问","已关闭","—","已关闭"],["BR-001","低","内部名单误发","已关闭","—","已关闭"]].map(r => ({id:r[0],level:r[1],desc:r[2],notify:r[3],sla:r[4],status:r[5]})),
    integrations:[["CRM","正常","11-06 09:40","99.8%",0],["IMC","正常","11-06 09:38","99.2%",0],["支付","正常","11-06 09:12","98.6%",2],["邮件","异常","11-06 08:50","91.3%",23]].map(r => ({sys:r[0],status:r[1],last:r[2],rate:r[3],backlog:r[4]})),
    integTasks:[["IT-9921","CRM客户事实同步","CRM","字段映射失败×23",3,"11-05 20:12",0.8],["IT-9920","邮件退信重发","邮件","SMTP超时",2,"11-06 08:50",2.1],["IT-9918","支付结果回写","支付","回调签名失败",1,"11-05 15:40",6.0]].map(r => ({id:r[0],name:r[1],sys:r[2],reason:r[3],retries:r[4],since:r[5],sla:r[6]})),
    tasks:[["T-2401","风险复核","集群CL-118关联佣金隔离复核","风险工作台","高",2.5,"待认领"],["T-2402","申诉","AF-1023佣金争议申诉复审","工单","中",19,"处理中"],["T-2403","结算延长","集群CL-104 结算延长第2次确认","佣金记录","高",-1.2,"待审批"],["T-2404","保证金抵扣","拒付CH-77损失抵扣执行","冲正案件","中",8,"待认领"],["T-2405","集成失败","CRM客户事实同步失败×23（重试3次）","系统集成","高",0.8,"处理中"],["T-2406","冲正追回","欺诈客户拒付追回案件立案","CRM欺诈库","低",40,"待认领"]].map(r => ({id:r[0],type:r[1],title:r[2],source:r[3],priority:r[4],sla:r[5],status:r[6]})),
    approvals:[["AP-901","结算","批次 STM-2026-11-A（23家合作方）","system","今日 09:12",1.6],["AP-902","提现","WD-5567 · Meridian Leads · $12,400","finance_li","今日 10:05",0.7],["AP-903","入驻","申请 OB-3301 · Nova Traffic（墨西哥）","operations_wang","昨日 17:41",18.2],["AP-904","调级","AF-0777 信用 C1→C2（权益变更）","risk_zhao","昨日 15:02",21.0],["AP-905","配置变更","价格表 v14（3国CPA上调）","ops_chen","昨日 11:20",24.7]].map(r => ({id:r[0],type:r[1],target:r[2],applicant:r[3],time:r[4],wait:r[5]})),
    analyticsPerf:[["AF-1023","Meridian Leads",12480,3120,421,208,9620,"3.4"],["AF-0777","Apex Media",9840,2405,366,183,7110,"2.9"],["AF-0998","Andes Promo",6120,1510,188,94,3890,"2.6"],["AF-1042","Siam Clicks",4830,1204,142,71,2240,"2.2"],["AF-0921","Lagos Partners",3960,1105,131,66,1870,"1.9"]].map(r => ({id:r[0],name:r[1],clicks:r[2],regs:r[3],ftd:r[4],vftd:r[5],comm:r[6],roi:r[7]})),
  };
})();

const AC_ANALYTICS_DEFAULTS = {
  period: "month",
  partner: "全部合作方",
  country: "全部国家",
  subId: "全部 Sub ID",
  activity: "全部活动",
  link: "全部链接",
  status: ["合作中", "观察中", "清退中", "已归档"],
};
AC_STATE.analytics = {
  draft: {...AC_ANALYTICS_DEFAULTS, status: [...AC_ANALYTICS_DEFAULTS.status]},
  applied: {...AC_ANALYTICS_DEFAULTS, status: [...AC_ANALYTICS_DEFAULTS.status]},
  trendMetric: "effective_ftd",
  compare: true,
  drawer: null,
  drawerTab: "sub_id",
  exportOpen: false,
  exportStatus: null,
  loading: false,
};

/* ===== 数据加厚（确定性生成：种子固定，每次刷新一致） ===== */
(function thicken(){
  let s = 20261107 >>> 0;
  const rnd = () => {s = (s + 0x6D2B79F5) | 0;let t = Math.imul(s ^ s >>> 15, 1 | s);t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;return ((t ^ t >>> 14) >>> 0) / 4294967296;};
  const pick = a => a[Math.floor(rnd()*a.length)];
  const ri = (a,b) => a + Math.floor(rnd()*(b-a+1));
  const pad = (n,w) => String(n).padStart(w,"0");
  const tm = () => "11-0"+ri(1,6)+" "+pad(ri(0,23),2)+":"+pad(ri(0,59),2)+":"+pad(ri(0,59),2);
  const countries = ["印尼","越南","泰国","尼日利亚","巴西","墨西哥","马来","印度","南非","菲律宾"];
  const adj = ["Zenith","Orbit","Crown","Harbor","Vertex","Lumen","Atlas","Bison","Coral","Falcon","Nimbus","Quartz","Ridge","Solar","Tundra","Vantage","Willow","Xenon","Yonder","Zephyr"];
  const noun = ["Leads","Media","Clicks","Traffic","Partners","Promo","Digital","Reach","Bridge","Loop","Ventures","Network","Studio","Labs","Marketing"];
  const used = new Set();
  const pname = () => {for (let k = 0;k < 40;k++) {const n = pick(adj)+" "+pick(noun);if (!used.has(n)) {used.add(n);return n;}}return pick(adj)+pick(noun)+" "+ri(2,99);};
  const statuses = ["合作中","合作中","合作中","合作中","观察中","观察中","清退中","已归档"];
  const grades = ["C0","C1","C2","C2","C3","C3","C4"];
  /* 合作方 +30 */
  for (let i = 0;i < 30;i++) {
    const grade = pick(grades),st = pick(statuses),total = ri(2,60)*1000+ri(0,9)*100;
    AC_DB.partners.push({id:"AF-"+(2001+i),name:pname(),country:pick(countries),type:pick(["公司","个人"]),status:st,grade,total:st==="申请中"?0:total,pending:(grade==="C0"||st!=="合作中")?0:ri(1,Math.max(1,Math.floor(total/4))),clients:ri(20,400)});
  }
  /* 客户 +120 */
  const subs = ["siteresia","tg_vn","fb_th","ng_bulk","br_pp","mx_tik","seo_01","blog_02","yt_03","app_04",""];
  for (let i = 0;i < 120;i++) {
    const p = pick(AC_DB.partners),life = pick(["注册","注册","FTD","有效FTD","有效FTD","流失"]);
    AC_DB.clients.push({id:"C-"+(90000+i),country:p.country,reg:"11-0"+ri(1,6),life,ftd:life==="注册"?0:ri(5,40)*25,partner:p.id,link:"L-"+ri(2001,2060),sub:pick(subs),risk:pick(["无","无","无","低","低","中","高"])});
  }
  /* 佣金 +200 */
  const blocks = ["无","无","无","无","结算中","数据缺数","风险隔离","集群风险"];
  for (let i = 0;i < 200;i++) {
    const p = pick(AC_DB.partners),c = pick(AC_DB.clients);
    let block = p.grade === "C0" ? (rnd() < 0.6 ? "C0等级" : "无") : pick(blocks);
    const tier = pick(["L1·FTD","L2·有效FTD","L3·有效FTD"]);
    const base = tier === "L1" ? 60 : 80;
    AC_DB.commissions.push({id:"CM-"+(56000+i),partner:p.id,client:c.id,tier,comp:block === "数据缺数" ? "—" : "基础$"+base+(rnd()<0.5?"+加成$"+Math.round(base*0.2):""),amount:block === "数据缺数" ? "0.00" : String(base+(rnd()<0.5?Math.round(base*0.2):0)+".00").replace(/\.00$/,".00"),status:block === "数据缺数" ? "待事件" : rnd()<0.05 ? "已冲正" : "已计佣",block:block === "数据缺数" && rnd()<0.4 ? "风险隔离" : block,hold:block === "无" ? "11-"+pad(ri(15,28),2) : "—"});
  }
  /* 事件链 +25条trace */
  for (let t = 0;t < 25;t++) {
    const tid = "tr-"+(1000+t).toString(16)+"f",c = pick(AC_DB.clients);
    const nodes = ["点击","注册","FTD","计佣"].slice(0,ri(3,4));
    nodes.forEach((n,ix) => AC_DB.events.push({tid,type:n,src:n === "点击" ? "Tracking" : n === "计佣" ? "计佣引擎" : "CRM",obj:c.id,status:rnd()<0.06 ? "缺数" : "正常",time:tm()+(ix?"":"+0"+ri(1,9)+"s")}));
  }
  /* 链接追踪 +140 */
  const devs = ["iOS","Android","Desktop"];
  for (let i = 0;i < 140;i++) {
    const p = pick(AC_DB.partners);
    AC_DB.tracking.push({time:"11-0"+ri(1,6)+" "+pad(ri(0,23),2)+":"+pad(ri(0,59),2),partner:p.id,link:"L-"+ri(2001,2060),sub:pick(subs)||"—",dev:pick(devs),geo:p.country,stage:pick(["未转化","未转化","已注册","已注册","已FTD","已计佣"])});
  }
  /* 入驻 +10 */
  for (let i = 0;i < 10;i++) AC_DB.onboarding.push({id:"OB-3"+(31+i),name:pname(),type:pick(["公司","个人"]),country:pick(countries),time:"11-0"+ri(1,6)+" "+pad(ri(9,18),2)+":"+pad(ri(0,59),2),wait:(ri(5,90)/10),status:pick(["待审核","待审核","补件中","已通过","已驳回"]),docs:pick(["40%","60%","85%","95%","100%"])});
  /* 工单 +8 */
  const tsubj = ["佣金确认时间咨询","客户归属疑问","素材下载失败","提现状态查询","结算单下载问题","链接跳转异常","KYC状态同步延迟","发票问题咨询"];
  for (let i = 0;i < 8;i++) AC_DB.tickets.push({id:"TK-77"+(10+i),type:pick(["咨询","异常","争议"]),partner:pick(AC_DB.partners).id,subject:pick(tsubj),priority:pick(["高","中","中","低"]),sla:ri(-3,40),status:pick(["待受理","处理中","处理中","已关闭"])});
  /* 通知 +16 */
  const tev = ["审批通过","结算送审","提现通知","风险处置","集成告警","公告发布","补件提醒"];
  for (let i = 0;i < 16;i++) AC_DB.notifications.push({time:tm(),ev:pick(tev),to:pick(["全体合作方","财务角色","operations_wang","risk_supervisor","AF-1023","AF-0777"]),ch:pick(["站内","邮件","站内+邮件"]),tpl:"T-v"+ri(2,9),status:pick(["成功","成功","成功","失败","退信"])});
  /* 公告 +4 */
  [["合规材料更新说明（KYC）","已发布","","11-06 09:00","长期"],["11月第二周系统维护预告","已发布","","11-04 20:00","11-14"],["反诈提示：假冒站点提醒","已发布","置顶","10-20 10:00","长期"],["新人指南草稿","草稿","","—","—"]].forEach(r => AC_DB.announcements.push({title:r[0],status:r[1],top:r[2],pub:r[3],exp:r[4],reads:ri(80,2200)}));
  /* 导出 +7 */
  for (let i = 0;i < 7;i++) AC_DB.exports.push({id:"EX-9"+String(1+i).padStart(2,"0"),src:pick(["佣金记录","客户列表","事件流水","风险对象","经营分析"]),range:"2026-"+pad(ri(8,11),2)+" 全量",rows:(ri(2,220)*10).toLocaleString(),level:pick(["内部","敏感","受限"]),status:pick(["可下载","处理中","审批中","已过期"])});
  /* 审计 +32 */
  const users = [["system","系统"],["finance_li","财务"],["ops_chen","运营"],["wang_ops","运营"],["risk_zhao","风控主管"],["risk_reviewer1","风控复核员"],["compliance_wu","合规"]];
  const acts = ["审批通过","生成结算批次","新建草稿","发布生效","延长结算","移出申请","导出下载","重试任务"];
  for (let i = 0;i < 32;i++) {const u = pick(users);AC_DB.audit.push({time:tm(),user:u[0],role:u[1],obj:pick(["STM-2026-10-B","WD-5563","价格表","AF-2"+pad(ri(1,30),2),"CL-1"+ri(10,99),"EX-881"]),act:pick(acts),result:rnd()<0.05 ? "失败" : "成功",from:pick(["结算模块","提现页","配置中心","风险工作台","导出中心","任务队列"]),tid:"tr-"+ri(1000,9999)});}
  /* 风险对象 +12 */
  for (let i = 0;i < 12;i++) {const ty = pick(["合作方","客户","集群"]);AC_DB.riskObjects.push({obj:ty === "集群" ? "CL-1"+ri(10,99) : pick(AC_DB.partners).id,type:ty,grade:pick(["R2","R3","R3","R4"]),src:pick(["规则命中","评分","CRM欺诈库","集群关联"]),evid:pick(["同IP批量注册","拒付关联","设备指纹重合","转化异常波动","多账号关联"]),amt:ri(3,80)*100});}
  /* 集群 +3 / 黑名单 +7 */
  for (let i = 0;i < 3;i++) AC_DB.clusters.push({id:"CL-1"+ri(20,90),rel:pick(["设备","IP","支付工具","行为特征"]),members:ri(4,18),amt:ri(8,60)*100,status:pick(["调查中","隔离中"])});
  for (let i = 0;i < 7;i++) AC_DB.blacklist.push({type:pick(["设备","IP","支付工具","客户"]),val:pick(["d9f3","a17b","41.203","VISA","MC","C-87"])+"••"+ri(10,99),reason:pick(["同IP批量注册","拒付关联","撞库尝试","欺诈库匹配"]),src:pick(["自动","人工复核"]),time:"1"+ri(0,1)+"-"+pick(["09","10","11"])+"-"+pad(ri(1,28),2),status:pick(["生效","生效","生效","已移出"])});
  /* 归属异常 +10 */
  for (let i = 0;i < 10;i++) {const a = pick(AC_DB.partners).id,b = pick(AC_DB.partners).id;AC_DB.attribution.push({id:"AE-4"+(10+i),type:pick(["归属冲突","越界拦截","规则缺失","重复归属"]),client:pick(AC_DB.clients).id,partners:a === b ? a : a+" / "+b,desc:pick(["双链接7日内先后点击","跨设备重复点击窗口重叠","客户已有IB归属","来源链接已停用","重复注册账号合并判定"]),time:"11-0"+ri(1,6),status:pick(["待处理","待处理","已修正","误报"])});}
  /* 提现 +14 */
  for (let i = 0;i < 14;i++) {const p = pick(AC_DB.partners),amt = ri(10,300)*50;AC_DB.withdrawals.push({id:"WD-55"+(70+i),partner:p.id,amt,fee:Math.round(amt*0.01),real:amt-Math.round(amt*0.01),acct:pick(["MER","APX","SIA","AND","GOL","NOV","ZEN"])+"•••"+ri(1000,9999),time:"11-0"+ri(1,6)+" "+pad(ri(8,20),2)+":"+pad(ri(0,59),2),status:pick(["待审核","待审核","已通过","支付中","已支付","已支付","失败","已驳回"])});}
  /* 对账 +6 / 结算批次 +3 / 批次明细 +12 */
  for (let i = 0;i < 6;i++) AC_DB.recon.push({id:"RC-1"+(19+i),cycle:"2026-"+pad(ri(7,10),2),type:pick(["金额不平","缺流水","重复流水","状态不一致"]),desc:pick(["佣金合计与结算分摊差","税费代扣缺流","提现重复记账","支付结果未回写"])+" $"+ri(1,9)+"xx",amt:ri(1,40)*10,obj:pick(["STM-2026-10-B","WD-5561","WD-5539","STM-2026-09-A"]),status:pick(["待处理","已处理","已容忍"])});
  [["STM-2026-10-A","10-01~10-31",24,512300,56100,456200,"已付款","finance_li"],["STM-2026-09-B","09-01~09-30",19,398400,44100,354300,"已付款","finance_li"],["STM-2026-09-C","09-补发",3,16800,1520,15280,"已确认","finance_wu"]].forEach(r => AC_DB.statements.push({id:r[0],cycle:r[1],partners:r[2],total:r[3],deduct:r[4],net:r[5],status:r[6],approver:r[7]}));
  AC_DB.partners.slice(2,14).forEach((p,i) => {const comm = ri(8,50)*100;AC_DB.stmtDetail.push({id:p.id,name:p.name,comm,deduct:Math.round(comm*0.1),net:comm-Math.round(comm*0.1),c0:p.grade === "C0" ? "C0" : ""});});
  /* 回传 +6 */
  for (let i = 0;i < 6;i++) {const p = pick(AC_DB.partners);const bad = rnd()<0.3;AC_DB.postback.push({id:p.id,url:pick(["cb.","hook.","post.","track."])+p.name.split(" ")[0].toLowerCase()+pick([".com",".io",".click"]),ev:pick(["注册","FTD","注册+FTD"]),rate:bad ? ri(40,80)+"%" : ri(93,99)+"%."+ri(0,9),last:(bad?"失败 ":"成功 ")+tm().slice(0,10),fails:bad?ri(2,8):0,status:bad?"失败告警":"正常"});}
  /* 任务 +6 / 审批 +3 */
  for (let i = 0;i < 6;i++) AC_DB.tasks.push({id:"T-24"+(10+i),type:pick(["风险复核","申诉","结算延长","保证金抵扣","冲正追回","集成失败","补数"]),title:pick(["集群CL-1"+ri(10,99),"合作方AF-2"+pad(ri(1,30),2),"提现WD-55"+ri(60,80)])+" 相关"+pick(["复核任务","处理确认","重检","立案"]),source:pick(["风险工作台","工单","佣金记录","系统集成"]),priority:pick(["高","中","低"]),sla:ri(-2,36),status:pick(["待认领","处理中","待审批"])});
  for (let i = 0;i < 3;i++) AC_DB.approvals.push({id:"AP-9"+(10+i),type:pick(["提现","调级","配置变更","财务资料变更"]),target:pick(["AF-2"+pad(ri(1,30),2),"WD-55"+ri(60,80),"价格表 v1"+ri(3,4),"AF-2003 收款账户变更"])+" · 待审批",applicant:pick(["finance_li","ops_chen","risk_zhao"]),time:"今日 "+pad(ri(8,15),2)+":"+pad(ri(0,59),2),wait:ri(1,20)});
  /* 分析页：取真实合作方Top10 */
  AC_DB.analyticsPerf = AC_DB.partners.filter(p => p.total > 0).slice().sort((a,b) => b.total-a.total).slice(0,10).map(p => {const clicks = ri(30,140)*100;const regs = Math.round(clicks*(0.2+rnd()*0.1));const ftd = Math.round(regs*(0.12+rnd()*0.06));return {id:p.id,name:p.name,clicks,regs,ftd,vftd:Math.round(ftd*0.55),comm:p.total,roi:(2+rnd()*1.6).toFixed(1)};});
})();

/* ===== 佣金结算新页面夹具（独立于旧佣金/结算单页面） ===== */
const AC_SETTLEMENT_STATE = {
  draft: {
    batches: {keywordField:"settlement_batch_id",keyword:"",period:"current",batchStatus:"all",approvalStatus:"all",entity:"all",block:"all"},
    commissions: {keywordField:"commission_case_id",keyword:"",period:"current",commissionStatus:"all",settlementStatus:"all",blockReason:"all",riskBand:"all"},
  },
  applied: {
    batches: {keywordField:"settlement_batch_id",keyword:"",period:"current",batchStatus:"all",approvalStatus:"all",entity:"all",block:"all"},
    commissions: {keywordField:"commission_case_id",keyword:"",period:"current",commissionStatus:"all",settlementStatus:"all",blockReason:"all",riskBand:"all"},
  },
  generator: {step:1,form:null,preview:null,sourceBatchId:null},
  dataAsOf:"2026-11-09 09:42:00",
};
const AC_SETTLEMENT_BATCHES = [
  {id:"SB-20261109-001",statementId:"ST-20261109-001",period:"2026-11-01 ~ 2026-11-08",periodKey:"current",entity:"Affiliate US LLC",currency:"USD",partners:18,cases:146,gross:18240,deduct:1824,net:16416,blocked:8,blockedAmount:960,batchStatus:"pending_review",approvalStatus:"pending_review",created:"2026-11-09 09:12",config:"CPA-v14 · SET-v6",operator:"system"},
  {id:"SB-20261108-002",statementId:"ST-20261108-002",period:"2026-10-24 ~ 2026-10-31",periodKey:"previous",entity:"Affiliate US LLC",currency:"USD",partners:21,cases:174,gross:23120,deduct:2312,net:20808,blocked:14,blockedAmount:1680,batchStatus:"rejected",approvalStatus:"rejected",created:"2026-11-08 14:26",config:"CPA-v14 · SET-v6",operator:"finance_li",rejectReason:"C0案件未完成隔离复核"},
  {id:"SB-20261101-001",statementId:"ST-20261101-001",period:"2026-10-17 ~ 2026-10-23",periodKey:"previous",entity:"Affiliate Singapore Pte.",currency:"USD",partners:12,cases:98,gross:12680,deduct:1268,net:11412,blocked:0,blockedAmount:0,batchStatus:"approved",approvalStatus:"approved",created:"2026-11-01 09:05",config:"CPA-v13 · SET-v5",operator:"finance_wu"},
  {id:"SB-20261025-003",statementId:"ST-20261025-003",period:"2026-10-10 ~ 2026-10-16",periodKey:"previous",entity:"Affiliate US LLC",currency:"USD",partners:24,cases:212,gross:28460,deduct:2846,net:25614,blocked:22,blockedAmount:2740,batchStatus:"settled",approvalStatus:"approved",created:"2026-10-25 10:11",config:"CPA-v13 · SET-v5",operator:"finance_li"},
  {id:"SB-20261018-001",statementId:"—",period:"2026-10-03 ~ 2026-10-09",periodKey:"previous",entity:"Affiliate US LLC",currency:"USD",partners:9,cases:67,gross:8420,deduct:842,net:7578,blocked:67,blockedAmount:8420,batchStatus:"failed",approvalStatus:"not_submitted",created:"2026-10-18 08:41",config:"CPA-v13 · SET-v5",operator:"finance_li",error:"CRM关键事件同步超时"},
];
const AC_SETTLEMENT_CASES = [
  {id:"CC-20261109-001",settlementId:"SC-20261109-001",batchId:"SB-20261109-001",customer:"CUS-10428",email:"a••••@mail.test",partner:"AF-1023",partnerName:"Meridian Leads",tier:"L2 · 有效FTD",components:"基础 CPA 80 + C2 加成 16",amount:96,commissionStatus:"calculated",settlementStatus:"settling",reasons:[],due:"2026-11-20 09:12",risk:"R1",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10428"},
  {id:"CC-20261109-002",settlementId:"SC-20261109-002",batchId:"SB-20261109-001",customer:"CUS-10431",email:"m••••@mail.test",partner:"AF-0777",partnerName:"Apex Media",tier:"L1 · FTD",components:"基础 CPA 60",amount:60,commissionStatus:"calculated",settlementStatus:"frozen",reasons:["investigation"],due:"—",risk:"R3",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10431"},
  {id:"CC-20261109-003",settlementId:"SC-20261109-003",batchId:"SB-20261109-001",customer:"CUS-10437",email:"s••••@mail.test",partner:"AF-1042",partnerName:"Siam Clicks",tier:"L2 · 有效FTD",components:"基础 CPA 80 + C2 加成 16",amount:96,commissionStatus:"calculated",settlementStatus:"pending",reasons:["credit_c0"],due:"—",risk:"R2",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10437"},
  {id:"CC-20261109-004",settlementId:"SC-20261109-004",batchId:"SB-20261109-001",customer:"CUS-10444",email:"r••••@mail.test",partner:"AF-0921",partnerName:"Lagos Partners",tier:"—",components:"—",amount:0,commissionStatus:"recalculating",settlementStatus:"pending",reasons:["missing_data"],due:"—",risk:"R2",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10444"},
  {id:"CC-20261109-005",settlementId:"SC-20261109-005",batchId:"SB-20261109-001",customer:"CUS-10452",email:"d••••@mail.test",partner:"AF-0998",partnerName:"Andes Promo",tier:"L1 · FTD",components:"基础 CPA 60",amount:60,commissionStatus:"calculated",settlementStatus:"settling",reasons:["hold_active"],due:"2026-11-23 09:12",risk:"R2",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10452"},
  {id:"CC-20261109-006",settlementId:"SC-20261109-006",batchId:"SB-20261109-001",customer:"CUS-10458",email:"j••••@mail.test",partner:"AF-1023",partnerName:"Meridian Leads",tier:"L2 · 有效FTD",components:"基础 CPA 80 + 质量服务 20",amount:100,commissionStatus:"calculated",settlementStatus:"settling",reasons:[],due:"2026-11-21 09:12",risk:"R1",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10458"},
  {id:"CC-20261109-007",settlementId:"SC-20261109-007",batchId:"SB-20261109-001",customer:"CUS-10463",email:"p••••@mail.test",partner:"AF-0866",partnerName:"Golden Bridge",tier:"L2 · 有效FTD",components:"基础 CPA 80 + C2 加成 16",amount:96,commissionStatus:"calculated",settlementStatus:"frozen",reasons:["cluster_unresolved","settlement_overdue_frozen"],due:"2026-11-16 09:12",risk:"R4",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10463"},
  {id:"CC-20261109-008",settlementId:"SC-20261109-008",batchId:"SB-20261109-001",customer:"CUS-10471",email:"k••••@mail.test",partner:"AF-0777",partnerName:"Apex Media",tier:"L1 · FTD",components:"基础 CPA 60",amount:60,commissionStatus:"calculated",settlementStatus:"released_after_recheck",reasons:[],due:"—",risk:"R2",periodKey:"current",version:"CPA-v14 / SET-v6",trace:"tr-cc-10471"},
  {id:"CC-20261108-009",settlementId:"SC-20261108-009",batchId:"SB-20261108-002",customer:"CUS-10477",email:"t••••@mail.test",partner:"AF-1042",partnerName:"Siam Clicks",tier:"L2 · 有效FTD",components:"基础 CPA 80 + C2 加成 16",amount:96,commissionStatus:"calculated",settlementStatus:"rejected",reasons:["quarantine"],due:"—",risk:"R3",periodKey:"previous",version:"CPA-v14 / SET-v6",trace:"tr-cc-10477"},
  {id:"CC-20261108-010",settlementId:"SC-20261108-010",batchId:"SB-20261108-002",customer:"CUS-10480",email:"v••••@mail.test",partner:"AF-0921",partnerName:"Lagos Partners",tier:"L1 · FTD",components:"基础 CPA 60",amount:60,commissionStatus:"reversed",settlementStatus:"rejected",reasons:["missing_data"],due:"—",risk:"R3",periodKey:"previous",version:"CPA-v14 / SET-v6",trace:"tr-cc-10480"},
  {id:"CC-20261101-011",settlementId:"SC-20261101-011",batchId:"SB-20261101-001",customer:"CUS-10486",email:"n••••@mail.test",partner:"AF-1105",partnerName:"Nova Traffic",tier:"L2 · 有效FTD",components:"基础 CPA 80 + C2 加成 16",amount:96,commissionStatus:"calculated",settlementStatus:"settled",reasons:[],due:"—",risk:"R1",periodKey:"previous",version:"CPA-v13 / SET-v5",trace:"tr-cc-10486"},
  {id:"CC-20261101-012",settlementId:"SC-20261101-012",batchId:"SB-20261101-001",customer:"CUS-10492",email:"w••••@mail.test",partner:"AF-0998",partnerName:"Andes Promo",tier:"L2 · 有效FTD",components:"基础 CPA 80 + 质量服务 20",amount:100,commissionStatus:"calculated",settlementStatus:"settled",reasons:[],due:"—",risk:"R1",periodKey:"previous",version:"CPA-v13 / SET-v5",trace:"tr-cc-10492"},
];
const CS_STATUS_LABEL = {
  calculated:"已计佣",recalculating:"重算中",reversed:"已冲正",rejected:"已拒绝",
  pending:"待结算",settling:"结算中",frozen:"已冻结",released_after_recheck:"复核释放",settled:"已结算",
  generating:"生成中",pending_review:"待审批",approved:"已批准",failed:"生成失败",not_submitted:"未送审",
};
const CS_BADGE_KIND = {calculated:"is-green",recalculating:"is-blue",reversed:"is-red",rejected:"is-red",pending:"is-gray",settling:"is-blue",frozen:"is-red",released_after_recheck:"is-green",settled:"is-green",generating:"is-blue",pending_review:"is-orange",approved:"is-green",failed:"is-red",not_submitted:"is-gray"};
const CS_REASON_LABEL = {
  missing_data:"关键事件缺数",investigation:"调查中",quarantine:"逻辑隔离",cluster_unresolved:"集群风险未结论",
  hold_active:"结算中",settlement_overdue_frozen:"结算超时冻结",credit_c0:"C0结算阻断",
};

/* ===== 归属管理独立Mock数据（不复用旧归属页结构） ===== */
const AC_ATTR_STATE = {
  view:"pending",
  filterOpen:false,
  filters:{},
  appliedFilters:{},
  selected:[],
  exportJobs:[
    {id:"EXP-ATTR-002",status:"处理中",created:"2026-11-09 09:18",rows:"—",expires:"—"},
    {id:"EXP-ATTR-001",status:"可下载",created:"2026-11-08 17:40",rows:"128",expires:"2026-11-09 17:40"}
  ],
  dataState:"ready"
};
const AC_ATTR_DATA = [
  {
    scenario:"attribution_conflict_ib",rowType:"case",id:"ATTR-CASE-20261109-001",caseId:"ATTR-CASE-20261109-001",customerId:"CUS-10428",email:"a••••@mail.test",registeredAt:"2026-11-08 14:26",currentAffiliate:{id:"AF-1023",name:"Meridian Leads"},candidates:[{id:"AF-1023",name:"Meridian Leads",score:"首点击"},{id:"AF-0777",name:"Apex Media",score:"7日内后续点击"}],type:"ib_isolation",typeLabel:"IB隔离异常",ibStatus:"conflict",ibLabel:"冲突待核验",attributionStatus:"conflict",status:"pending",age:"18小时",sla:"剩余 5小时",slaTone:"warn",ruleVersion:"ATTR-v43",lastEvent:"2026-11-09 07:42",traceId:"tr-ib-10428",dataState:"normal",lockedAt:"2026-11-08 14:28",description:"CRM返回已有IB关系，Affiliate候选仍被写入，需确认隔离结果。",requester:"—",impact:"仅影响本客户的归属确认；不扩散冻结其他客户或结算批次。",timeline:[["2026-11-08 14:26","注册归因写入","CRM保存原始参数，Affiliate生成候选归属。","is-done"],["2026-11-08 14:28","IB隔离校验命中","发现CRM存在IB关系，案件进入待处理。","is-block"],["2026-11-09 07:42","同步重试成功","最新CRM关系已同步，等待人工复核。","is-done"]]
  },
  {
    scenario:"attribution_pending_no_source",rowType:"case",id:"ATTR-CASE-20261109-002",caseId:"ATTR-CASE-20261109-002",customerId:"CUS-10431",email:"m••••@mail.test",registeredAt:"2026-11-09 08:12",currentAffiliate:null,candidates:[],type:"rule_gap",typeLabel:"无来源",ibStatus:"none",ibLabel:"无IB关系",attributionStatus:"unattributed",status:"pending",age:"1小时",sla:"剩余 23小时",slaTone:"normal",ruleVersion:"待配置",lastEvent:"2026-11-09 08:13",traceId:"tr-none-10431",dataState:"normal",lockedAt:"—",description:"CRM注册成功但没有可用点击、UTM或官方路径记录，不按国家/IP猜测归属。",requester:"—",impact:"当前未产生Affiliate计佣；保持无归属需形成申请。",timeline:[["2026-11-09 08:12","注册完成","CRM客户主档创建成功。","is-done"],["2026-11-09 08:13","归属来源缺失","未找到可用原始归因参数。","is-block"]]
  },
  {
    scenario:"attribution_duplicate_candidate",rowType:"case",id:"ATTR-CASE-20261109-003",caseId:"ATTR-CASE-20261109-003",customerId:"CUS-10437",email:"s••••@mail.test",registeredAt:"2026-11-07 19:04",currentAffiliate:{id:"AF-1042",name:"Siam Clicks"},candidates:[{id:"AF-1042",name:"Siam Clicks",score:"首点击"},{id:"AF-1105",name:"Nova Traffic",score:"同窗口候选"}],type:"duplicate_attribution",typeLabel:"重复候选",ibStatus:"none",ibLabel:"未核验",attributionStatus:"conflict",status:"pending",age:"38小时",sla:"已超时 14小时",slaTone:"over",ruleVersion:"ATTR-v42",lastEvent:"2026-11-08 22:16",traceId:"tr-dup-10437",dataState:"normal",lockedAt:"2026-11-07 19:06",description:"同一注册窗口内存在两个Affiliate候选，当前归属已锁定但需要复核。",requester:"—",impact:"可能触发本客户佣金资格重跑；不自动改写历史结算。",timeline:[["2026-11-07 19:04","注册完成","两个候选归属同时满足窗口条件。","is-done"],["2026-11-07 19:06","归属锁定","按首点击规则暂锁定 AF-1042。","is-done"],["2026-11-08 22:16","重复候选检查","完整性检查创建人工案件。","is-block"]]
  },
  {
    scenario:"attribution_missing_data",rowType:"case",id:"ATTR-CASE-20261109-004",caseId:"ATTR-CASE-20261109-004",customerId:"CUS-10444",email:"r••••@mail.test",registeredAt:"2026-11-06 11:32",currentAffiliate:{id:"AF-0921",name:"Lagos Partners"},candidates:[{id:"AF-0921",name:"Lagos Partners",score:"事件链"}],type:"missing_data",typeLabel:"数据缺数",ibStatus:"none",ibLabel:"无IB关系",attributionStatus:"pending",status:"blocked_sync",age:"2天",sla:"暂停计时",slaTone:"warn",ruleVersion:"ATTR-v41",lastEvent:"2026-11-08 16:02",traceId:"tr-gap-10444",dataState:"pending",lockedAt:"2026-11-06 11:35",description:"CRM FTD回调缺失，归属可见但下游影响暂不判断，等待集成补数。",requester:"—",impact:"仅阻断本案件的下游重跑；不阻断佣金计算。",timeline:[["2026-11-06 11:32","注册归因写入","Affiliate保存候选及当前归属。","is-done"],["2026-11-08 16:02","事件缺数","FTD回调未在新鲜度阈值内到达。","is-block"],["2026-11-09 08:50","补数任务执行中","任务 INT-803 正在重试。","is-miss"]]
  },
  {
    scenario:"attribution_locked_correction_pending",rowType:"case",id:"ATTR-CASE-20261109-005",caseId:"ATTR-CASE-20261109-005",customerId:"CUS-10452",email:"d••••@mail.test",registeredAt:"2026-11-05 10:18",currentAffiliate:{id:"AF-1023",name:"Meridian Leads"},candidates:[{id:"AF-0777",name:"Apex Media",score:"人工补证"},{id:"AF-1023",name:"Meridian Leads",score:"当前锁定"}],type:"correction",typeLabel:"归属更正",ibStatus:"none",ibLabel:"已排除",attributionStatus:"locked",status:"pending_approval",age:"3天",sla:"待审批",slaTone:"warn",ruleVersion:"ATTR-v40",lastEvent:"2026-11-09 08:18",traceId:"tr-corr-10452",dataState:"normal",lockedAt:"2026-11-05 10:20",description:"已锁定归属申请更正，申请人 ops_chen 已提交拟应用 Affiliate。",requester:"ops_chen",reviewRequestId:"RR-20261109-005",proposedAffiliate:{id:"AF-0777",name:"Apex Media"},impact:"预计触发资格重跑、佣金重算和风险复核任务。",timeline:[["2026-11-05 10:20","归属锁定","当前最终归属为 AF-1023。","is-done"],["2026-11-09 08:18","更正申请提交","RR-20261109-005，等待职责分离审批。","is-current"]]
  },
  {
    scenario:"attribution_correction_rejected",rowType:"case",id:"ATTR-CASE-20261109-006",caseId:"ATTR-CASE-20261109-006",customerId:"CUS-10458",email:"j••••@mail.test",registeredAt:"2026-11-04 16:40",currentAffiliate:{id:"AF-1042",name:"Siam Clicks"},candidates:[{id:"AF-1042",name:"Siam Clicks",score:"当前锁定"},{id:"AF-1023",name:"Meridian Leads",score:"证据不足"}],type:"correction",typeLabel:"更正已驳回",ibStatus:"none",ibLabel:"无IB关系",attributionStatus:"locked",status:"rejected",age:"4天",sla:"已驳回",slaTone:"normal",ruleVersion:"ATTR-v39",lastEvent:"2026-11-08 17:08",traceId:"tr-rej-10458",dataState:"normal",lockedAt:"2026-11-04 16:42",reviewRequestId:"RR-20261108-006",requester:"ops_chen",rejectReason:"人工补证不足以推翻当前锁定规则，保持原归属。",impact:"原归属和历史记录保持不变。",timeline:[["2026-11-04 16:42","归属锁定","当前最终归属为 AF-1042。","is-done"],["2026-11-08 16:50","更正申请提交","提交拟应用 AF-1023。","is-done"],["2026-11-08 17:08","审批驳回","风控主管驳回并记录原因。","is-block"]]
  },
  {
    scenario:"attribution_apply_failed",rowType:"case",id:"ATTR-CASE-20261109-007",caseId:"ATTR-CASE-20261109-007",customerId:"CUS-10463",email:"p••••@mail.test",registeredAt:"2026-11-03 09:08",currentAffiliate:{id:"AF-0998",name:"Andes Promo"},candidates:[{id:"AF-0866",name:"Golden Bridge",score:"审批通过"}],type:"correction",typeLabel:"应用失败",ibStatus:"none",ibLabel:"无IB关系",attributionStatus:"locked",status:"apply_failed",age:"5天",sla:"应用失败",slaTone:"over",ruleVersion:"ATTR-v38",lastEvent:"2026-11-09 08:42",traceId:"tr-fail-10463",dataState:"normal",lockedAt:"2026-11-03 09:10",reviewRequestId:"RR-20261109-007",requester:"risk_supervisor",proposedAffiliate:{id:"AF-0866",name:"Golden Bridge"},errorCode:"AFF-50017",impact:"原归属保留；下游重跑任务未创建，需重试或转人工。",timeline:[["2026-11-03 09:10","归属锁定","当前最终归属为 AF-0998。","is-done"],["2026-11-09 08:30","审批通过","RR-20261109-007 已通过。","is-done"],["2026-11-09 08:42","应用失败","Affiliate写入超时，返回 AFF-50017。","is-block"]]
  },
  {
    scenario:"attribution_forbidden_sensitive",rowType:"case",id:"ATTR-CASE-20261109-008",caseId:"ATTR-CASE-20261109-008",customerId:"CUS-10471",email:"k••••@mail.test",registeredAt:"2026-11-02 12:10",currentAffiliate:{id:"AF-0777",name:"Apex Media"},candidates:[{id:"AF-0777",name:"Apex Media",score:"首点击"}],type:"attribution_conflict",typeLabel:"归属冲突",ibStatus:"none",ibLabel:"无IB关系",attributionStatus:"locked",status:"in_review",age:"6天",sla:"剩余 4小时",slaTone:"warn",ruleVersion:"ATTR-v38",lastEvent:"2026-11-09 07:05",traceId:"tr-sec-10471",dataState:"normal",lockedAt:"2026-11-02 12:12",description:"风控引用了敏感关联证据，当前角色仅可查看脱敏摘要。",requester:"risk_reviewer",sensitive:true,impact:"查看敏感证据需单独授权并写审计。",timeline:[["2026-11-02 12:12","归属锁定","当前最终归属为 AF-0777。","is-done"],["2026-11-09 07:05","案件认领","risk_reviewer 已认领。","is-current"]]
  },
  {
    scenario:"attribution_export_async",rowType:"case",id:"ATTR-CASE-20261109-009",caseId:"ATTR-CASE-20261109-009",customerId:"CUS-10477",email:"t••••@mail.test",registeredAt:"2026-11-01 18:22",currentAffiliate:null,candidates:[],type:"missing_data",typeLabel:"数据待同步",ibStatus:"none",ibLabel:"未核验",attributionStatus:"pending",status:"pending",age:"7天",sla:"剩余 1天",slaTone:"normal",ruleVersion:"ATTR-v37",lastEvent:"2026-11-09 06:11",traceId:"tr-export-10477",dataState:"pending",lockedAt:"—",description:"注册归因数据等待CRM同步，普通导出可见脱敏字段。",impact:"导出不包含原始参数、IP、设备和支付关联。",timeline:[["2026-11-01 18:22","注册完成","CRM客户主档创建成功。","is-done"],["2026-11-09 06:11","同步延迟","CRM数据版本落后于页面新鲜度阈值。","is-block"]]
  },
  {
    scenario:"attribution_normal_locked",rowType:"attribution_record",id:"ATTR-REC-20261109-010",attributionId:"ATTR-REC-20261109-010",caseId:"—",customerId:"CUS-10480",email:"v••••@mail.test",registeredAt:"2026-10-30 09:14",currentAffiliate:{id:"AF-1023",name:"Meridian Leads"},candidates:[{id:"AF-1023",name:"Meridian Leads",score:"首点击"}],type:"—",typeLabel:"—",ibStatus:"none",ibLabel:"无IB关系",attributionStatus:"locked",status:"closed",age:"—",sla:"—",slaTone:"normal",ruleVersion:"ATTR-v37",lastEvent:"2026-10-30 09:16",traceId:"tr-normal-10480",dataState:"normal",lockedAt:"2026-10-30 09:16",description:"正常锁定归属记录，只读。",impact:"无异常案件。",timeline:[["2026-10-30 09:16","归属锁定","按首点击规则完成锁定。","is-done"]]
  },
  {
    scenario:"attribution_normal_locked",rowType:"attribution_record",id:"ATTR-REC-20261109-011",attributionId:"ATTR-REC-20261109-011",caseId:"—",customerId:"CUS-10486",email:"n••••@mail.test",registeredAt:"2026-10-28 15:05",currentAffiliate:{id:"AF-1042",name:"Siam Clicks"},candidates:[{id:"AF-1042",name:"Siam Clicks",score:"官方路径"}],type:"—",typeLabel:"—",ibStatus:"excluded",ibLabel:"已排除",attributionStatus:"excluded_ib",status:"closed",age:"—",sla:"—",slaTone:"normal",ruleVersion:"ATTR-v36",lastEvent:"2026-10-28 15:08",traceId:"tr-normal-10486",dataState:"normal",lockedAt:"—",description:"存在IB关系，已排除Affiliate统计，归属记录只读。",impact:"不进入Affiliate有效归属和计佣。",timeline:[["2026-10-28 15:08","IB隔离完成","记录已标记为排除IB。","is-done"]]
  }
];

/* ===== 工具 ===== */
const acEsc = s => String(s == null ? "" : s).replace(/[&<>"']/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const acFmtSLA = h => {if (h == null) return "—";if (h <= 0) return `已超过处理时限 ${Math.abs(h).toFixed(1)}小时`;if (h >= 24) return `剩余${Math.floor(h/24)}天${Math.round(h%24)}小时`;return h >= 1 ? `剩余 ${Math.floor(h)}小时${String(Math.round((h%1)*60)).padStart(2,"0")}分` : `剩余 ${Math.max(1,Math.round(h*60))}分钟`;};
const acPrio = p => p === "高" ? `<span class="ac-badge is-red">${p}</span>` : p === "中" ? `<span class="ac-badge is-orange">${p}</span>` : `<span class="ac-badge is-gray">${p}</span>`;
const acStat = s => ({待审核:"is-blue",待认领:"is-blue",处理中:"is-blue",生成中:"is-blue",待受理:"is-blue",支付中:"is-blue",草稿:"is-blue",调查中:"is-blue",待生效:"is-blue",审批中:"is-orange",待审批:"is-orange",补件中:"is-orange",待处理:"is-orange",隔离中:"is-orange",处置中:"is-orange",已通过:"is-green",成功:"is-green",已计佣:"is-green",已确认:"is-green",已支付:"is-green",可下载:"is-green",生效中:"is-green",启用:"is-green",已批准:"is-green",正常:"is-green",已修正:"is-green",已处理:"is-green",已上架:"is-green",已发布:"is-green",已驳回:"is-red",失败:"is-red",退信:"is-red",已冲正:"is-red",失败告警:"is-red",已关闭:"is-gray",已过期:"is-gray",误报:"is-gray",已下架:"is-gray",停用:"is-gray",已解除:"is-gray",已容忍:"is-gray",已付款:"is-green",暂停:"is-gray",归档:"is-gray",待事件:"is-orange",申请中:"is-blue",观察中:"is-orange",合作中:"is-green",清退中:"is-orange",已归档:"is-gray",生效:"is-green",长期:"is-gray"}[s] || "is-gray");
const acGrade = g => !g || g === "—" ? `<span style="color:var(--subtle)">—</span>` : g.startsWith("R") ? `<span class="ac-grade" data-g="r${g.slice(1).toLowerCase()==="" ? "" : String(5-Number(g.slice(1)))}">${g}</span>` : `<span class="ac-grade" data-g="${g.toLowerCase()}">${g}</span>`;
const acSteps = stage => {const steps = ["点击","注册","FTD","计佣"];const n = ({未转化:0,已注册:1,已FTD:2,已计佣:3})[stage] || 0;return '<span class="ac-psteps">' + steps.map((s,i) => '<i class="' + (i <= n ? "on" : "") + '">' + s + '</i>').join('<em>›</em>') + '</span>';};
const acMoney = n => "$" + Number(n).toLocaleString("en-US");

/* ===== 下拉系统 ===== */
const AC_DROPDOWN = {openKey:null,items:{}};
function acDDReg(key,list,current,onSelect){AC_DROPDOWN.items[key] = {list,current:() => current,onSelect};}
function acDD(key,label,opts = {}){return `<span class="ac-dropdown" data-dd="${key}"><button type="button" class="ac-dropdown-trigger ${opts.sm?"sm":""}" data-dd-trigger="${key}"><span class="ac-dd-label">${acEsc(label)}</span><span class="ac-dd-caret">▾</span></button></span>`;}
function acDDClose(){document.querySelectorAll(".ac-dropdown-panel.open").forEach(p => p.remove());document.querySelectorAll(".ac-dropdown.open").forEach(d => d.classList.remove("open"));AC_DROPDOWN.openKey = null;}
function acDDToggle(key){
  acDDClose();
  const host = document.querySelector(`[data-dd="${key}"]`),trigger = document.querySelector(`[data-dd-trigger="${key}"]`);
  if (!host || !trigger) return;
  const def = AC_DROPDOWN.items[key];if (!def) return;
  const panel = document.createElement("div");
  panel.className = "ac-dropdown-panel open";panel.dataset.ddPanel = key;
  panel.innerHTML = def.list.map(it => `<button type="button" class="ac-dropdown-item ${String(it.v)===String(def.current())?"active":""}" data-dd-item="${acEsc(it.v)}" data-dd-key="${key}"><span>${acEsc(it.label)}</span><span class="ac-dd-check">✓</span></button>`).join("");
  document.body.appendChild(panel);
  const r = trigger.getBoundingClientRect(),pw = Math.max(panel.offsetWidth,120);
  panel.style.left = Math.max(8,Math.min(r.right - pw,innerWidth - pw - 8)) + "px";
  let top = r.bottom + 6;const ph = panel.offsetHeight;
  if (top + ph > innerHeight - 8) top = Math.max(8,r.top - ph - 6);
  panel.style.top = top + "px";
  host.classList.add("open");AC_DROPDOWN.openKey = key;
}
acDDReg("role",AC_ROLES.map(r => ({v:r[0],label:r[1]})),() => AC_STATE.role,v => {AC_STATE.role = v;acRender();acToast(`已切换角色：${(AC_ROLES.find(r => r[0]===v)||[])[1]}`);});
acDDReg("pagesize",[{v:20,label:"20条/页"},{v:10,label:"10条/页"},{v:50,label:"50条/页"}],() => AC_STATE.pageSize,v => {AC_STATE.pageSize = Number(v);acToast(`每页 ${v} 条`);});

/* ===== 筛选/排序/分页引擎（真实交互） ===== */
const AC_LIST = {page:1,sort:{},filters:{}};
const AC_FILTER_UI = {open:null,drafts:{}};
const acFilterClone = value => JSON.parse(JSON.stringify(value));
function acUnifiedFilterConfig(){
  const route = AC_STATE.route, tab = AC_STATE.tab;
  const choices = values => [["","全部"],...values.map(value => Array.isArray(value) ? value : [value,value])];
  const select = (key,label,values,quick = true) => ({key,label,options:choices(values),quick});
  const text = (key,label,type = "text") => ({key,label,type});
  const unique = (rows,key) => [...new Set(rows.flatMap(row => row[key] || []).filter(value => value !== "—"))];
  const context = ["risk","governance","workbench"].includes(route) ? `${route}:${tab}` : route;
  let fields = [], rows = [], defaults = {}, get = () => AC_LIST.filters[context] || {}, set = value => {AC_LIST.filters[context] = value;};
  if (route === "attribution") {
    fields = [
      select("type","异常类型",AC_ATTR_TYPE_OPTIONS.filter(item => item[0])),
      select("status","归属状态",AC_ATTR_STATUS_OPTIONS.filter(item => item[0])),
      select("ib","IB状态",[["none","无IB关系"],["conflict","冲突待核验"],["excluded","已排除"],["unknown","未核验"]]),
      select("sla","SLA",[["normal","未到期"],["warn","接近到期"],["over","已超时"]]),
      text("q","客户 / 案件 / TraceId"),text("partner","当前Affiliate"),
      text("ruleVersion","规则版本"),text("traceId","TraceId"),
      select("dataState","数据状态",[["pending","待同步"]],false),
      select("new","新增范围",[["yes","近24小时新增"]],false),
    ];
    get = () => AC_ATTR_STATE.appliedFilters;
    set = value => {AC_ATTR_STATE.appliedFilters = value;AC_ATTR_STATE.filters = {...value};};
  } else if (route === "commission-settlement") {
    const kind = tab === "commissions" ? "commissions" : "batches";
    const batch = kind === "batches";
    defaults = {keywordField:batch ? "settlement_batch_id" : "commission_case_id",keyword:"",period:"all",...(batch ? {batchStatus:"all",approvalStatus:"all",entity:"all",block:"all"} : {commissionStatus:"all",settlementStatus:"all",blockReason:"all",riskBand:"all"})};
    const cs = (key,label,options,quick = true) => ({key,label,options,quick,empty:"all"});
    fields = [
      cs("period","结算周期",[["all","全部周期"],["current","当前周期"],["previous","历史周期"]]),
      ...(batch ? [
        cs("batchStatus","批次状态",csStatusOptions("batch")),
        cs("approvalStatus","审批状态",[["all","全部审批状态"],["not_submitted","未送审"],["pending_review","待审批"],["approved","审批通过"],["rejected","审批驳回"]]),
        cs("entity","经营主体",[["all","全部主体"],["Affiliate US LLC","Affiliate US LLC"],["Affiliate Singapore Pte.","Affiliate Singapore Pte."]]),
        cs("block","阻断情况",[["all","全部情况"],["has","有阻断"],["none","无阻断"]],false),
      ] : [
        cs("commissionStatus","计佣状态",csStatusOptions("commission")),
        cs("settlementStatus","结算状态",[["all","全部结算状态"],...["pending","settling","frozen","released_after_recheck","settled","rejected"].map(value => [value,CS_STATUS_LABEL[value]])]),
        cs("blockReason","阻断原因",[["all","全部原因"],...Object.entries(CS_REASON_LABEL)]),
        cs("riskBand","风险档",[["all","全部风险档"],...["R1","R2","R3","R4"].map(value => [value,value])],false),
      ]),
      {key:"keywordField",label:"查询字段",options:batch ? [["settlement_batch_id","批次号"],["statement_id","结算单号"],["entity","经营主体"]] : [["commission_case_id","佣金案件号"],["settlement_case_id","结算案件号"],["customer_id","客户编号"],["partner_id","合作方编号"]],tag:false},
      text("keyword","精确查询"),
    ];
    get = () => AC_SETTLEMENT_STATE.applied[kind];
    set = value => {AC_SETTLEMENT_STATE.applied[kind] = value;AC_SETTLEMENT_STATE.draft[kind] = {...value};};
    return {id:`${route}:${kind}`,fields,defaults,get,set,special:true};
  } else if (route === "analytics-performance") {
    defaults = {...AC_ANALYTICS_DEFAULTS,status:["合作中","观察中","清退中","已归档"]};
    fields = [
      {key:"period",label:"时间范围",quick:true,options:[["month","本月"],["today","今天"],["d7","近7天"],["d30","近30天"],["lastmonth","上月"],["custom","自定义"]]},
      {key:"partner",label:"合作方",quick:true,options:[["全部合作方","全部合作方"],...AC_DB.analyticsPerf.map(row => [row.id,`${row.id} · ${row.name}`])]},
      {key:"country",label:"国家",quick:true,options:[["全部国家","全部国家"],...unique(AC_DB.partners,"country").map(value => [value,value])]},
      {key:"status",label:"合作方状态",type:"multi",options:unique(AC_DB.partners,"status").map(value => [value,value])},
      {key:"subId",label:"Sub ID",options:[["全部 Sub ID","全部 Sub ID"],...unique(AC_DB.tracking,"sub").map(value => [value,value])]},
      {key:"activity",label:"活动",options:[["全部活动","全部活动"],["活动-标准开户链接","活动-标准开户链接"],["活动-移动端促活","活动-移动端促活"]]},
      {key:"link",label:"链接",options:[["全部链接","全部链接"],...unique(AC_DB.tracking,"link").map(value => [value,value])]},
    ];
    get = () => AC_STATE.analytics.applied;
    set = value => {AC_STATE.analytics.applied = value;AC_STATE.analytics.draft = acFilterClone(value);};
  } else {
    const sources = {
      "onboarding-review":[AC_DB.onboarding,[["status","状态"],["type","类型"],["country","国家"]]],
      partners:[AC_DB.partners,[["status","状态"],["grade","信用"],["country","国家"],["type","类型"]]],
      clients:[AC_DB.clients,[["life","生命周期"],["risk","风险"],["country","国家"]]],
      events:[AC_DB.events,[["status","状态"],["type","事件类型"],["src","来源系统"]]],
      materials:[AC_DB.materials,[["type","类型"],["status","状态"],["country","国家"],["language","语言"]]],
      postback:[AC_DB.postback,[["status","状态"],["ev","事件"]]],
      tracking:[AC_DB.tracking,[["stage","转化进度"],["dev","设备"],["geo","国家"]]],
      withdrawals:[AC_DB.withdrawals,[["status","状态"]]],
      recon:[AC_DB.recon,[["status","状态"],["type","类型"],["cycle","周期"]]],
      notifications:[AC_DB.notifications,[["ch","渠道"],["ev","事件"],["status","状态"]]],
      announcements:[AC_DB.announcements,[["status","状态"]]],
      audit:[AC_DB.audit,[["act","动作"],["result","结果"],["role","角色"]]],
      exports:[AC_DB.exports,[["status","状态"],["src","数据源"],["level","数据级别"]]],
      integrations:[AC_DB.integTasks,[["sys","系统"],["reason","失败原因"]]],
      permissions:[AC_DB.govAuth,[["status","授权状态"],["field","字段"]]],
      "analytics-quality":[AC_DB.analyticsPerf,[["name","合作方"]]],
      "analytics-funds":[AC_DB.analyticsPerf,[["name","合作方"]]],
    };
    if (route === "risk") {
      const source = tab === "clusters" ? [AC_DB.clusters,[["status","状态"],["rel","关联特征"]]] : tab === "blacklist" ? [AC_DB.blacklist,[["status","状态"],["type","类型"],["src","来源"]]] : [AC_DB.riskObjects,[["type","类型"],["src","来源"],["grade","风险等级"]]];
      [rows,fields] = source;
    } else if (route === "governance") {
      const source = ({level:[AC_DB.govLevels,[["level","数据级别"]]],auth:[AC_DB.govAuth,[["status","状态"],["field","字段"]]],retain:[AC_DB.govRetain,[["mode","执行方式"]]],breach:[AC_DB.govBreach,[["status","状态"],["level","等级"]]]})[tab];
      if (!source && tab === "rules") {
        rows = AC_TASK_TYPES;
        fields = [["type","任务类型"],["severity","风险等级"],["approval","是否审批"],["gate","硬风控门禁"]];
      } else if (!source) return null;
      else [rows,fields] = source;
    } else if (route === "workbench") {
      rows = tab === "approvals" ? acWbApprovals(AC_STATE.role) : acWbTasks(AC_STATE.role);
      fields = tab === "approvals" ? [["type","类型"],["applicant","申请人"]] : [["status","状态"],["priority","优先级"],["type","任务类型"]];
    } else if (route === "config" && AC_STATE.configView !== "detail") {
      fields = [select("status","状态",["草稿","生效中","已锁定","已撤回"]),select("locked","锁定",["已锁定","未锁定"]),text("createdFrom","创建时间起","date"),text("createdTo","创建时间止","date"),text("effectiveFrom","生效时间起","date"),text("effectiveTo","生效时间止","date")];
    } else if (sources[route]) [rows,fields] = sources[route];
    else return null;
    if (route !== "config") fields = fields.map(([key,label]) => {
      const sourceKey = route === "materials" ? ({country:"countries",language:"languages"})[key] || key : key;
      return {...select(key,label,unique(rows,sourceKey)),sourceKey};
    });
    fields.push(text("q","关键词"));
    if (route === "materials") {
      fields.push(select("device","设备",AC_MATERIAL_DEVICES.slice(1),false),select("platform","平台",AC_MATERIAL_PLATFORMS.slice(1),false),select("path","官方落地页",AC_MATERIAL_PATHS.slice(1),false),text("updatedFrom","更新时间起","date"),text("updatedTo","更新时间止","date"));
      if (!AC_LIST.filters.materials) AC_LIST.filters.materials = {status:"启用"};
    }
    if (["audit","events","onboarding-review","tracking","withdrawals","announcements"].includes(route)) {
      fields.push(text("dateFrom","时间起","date"),text("dateTo","时间止","date"));
    }
  }
  return {id:context,fields,defaults,get,set,special:["attribution","analytics-performance"].includes(route)};
}
function acUnifiedMatch(row,config = acUnifiedFilterConfig()){
  if (!config || config.special) return true;
  const applied = config.get();
  return config.fields.every(field => {
    const value = applied[field.key];
    if (!value || value === "all" || String(value).startsWith("全部")) return true;
    if (field.key === "q") return Object.values(row).flat().join(" ").toLowerCase().includes(String(value).toLowerCase());
    if (field.type === "date") {
      const source = field.key.startsWith("updated") ? row.updated : field.key.startsWith("created") ? row.created : field.key.startsWith("effective") ? row.effective : row.time || row.reg || row.pub;
      if (!source || !/^\d{4}-\d{2}-\d{2}/.test(source)) return false;
      return field.key.endsWith("From") ? source.slice(0,10) >= value : source.slice(0,10) <= value;
    }
    const actual = row[field.sourceKey || field.key];
    return Array.isArray(actual) ? actual.includes(value) : String(actual ?? "") === String(value);
  });
}
function acUnifiedFilterMarkup(config){
  const applied = config.get(), draft = AC_FILTER_UI.drafts[config.id] || applied;
  const control = (field,value,quick = false) => {
    const attr = quick ? "data-ac-quick" : "data-ac-draft";
    if (field.type === "multi") return `<label><span>${acEsc(field.label)}</span><select multiple size="${Math.min(5,field.options.length)}" style="height:auto" ${attr}="${field.key}" aria-label="${acEsc(field.label)}">${field.options.map(([key,label]) => `<option value="${acEsc(key)}" ${(value || []).includes(key)?"selected":""}>${acEsc(label)}</option>`).join("")}</select></label>`;
    return `<label><span>${acEsc(field.label)}</span>${field.options ? `<select ${attr}="${field.key}" aria-label="${acEsc(field.label)}">${field.options.map(([key,label]) => `<option value="${acEsc(key)}" ${String(value ?? field.empty ?? "")===String(key)?"selected":""}>${acEsc(label)}</option>`).join("")}</select>` : `<input type="${field.type || "text"}" ${attr}="${field.key}" value="${acEsc(value || "")}" aria-label="${acEsc(field.label)}">`}</label>`;
  };
  const tags = config.fields.filter(field => field.tag !== false).flatMap(field => {
    const value = applied[field.key];
    if (!value || value === "all" || String(value).startsWith("全部") || JSON.stringify(value) === JSON.stringify(config.defaults[field.key])) return [];
    const label = Array.isArray(value) ? value.join("、") || "未选择" : field.options?.find(option => String(option[0])===String(value))?.[1] || value;
    return [`<span class="admin-filter-tag"><span>${acEsc(field.label)}：${acEsc(label)}</span><button type="button" data-ac-remove="${field.key}" aria-label="移除${acEsc(field.label)}">×</button></span>`];
  });
  const open = AC_FILTER_UI.open === config.id;
  return `<section class="admin-filter-shell" data-ac-filter-shell="${acEsc(config.id)}"><div class="admin-filter-quick">${config.fields.filter(field => field.quick).slice(0,4).map(field => control(field,applied[field.key],true)).join("")}<button type="button" class="ac-btn secondary sm" data-ac-filter-toggle aria-expanded="${open}">筛选器${tags.length ? ` <span class="admin-filter-count">${tags.length}</span>` : ""}</button></div>${tags.length ? `<div class="admin-filter-tags">${tags.join("")}<button type="button" class="admin-filter-clear" data-ac-clear>清空</button></div>` : ""}${open ? `<div class="admin-filter-panel"><div class="admin-filter-fields">${config.fields.map(field => control(field,draft[field.key])).join("")}</div><div class="admin-filter-actions"><button type="button" class="ac-btn ghost sm" data-ac-draft-reset>重置</button><button type="button" class="ac-btn secondary sm" data-ac-cancel>取消</button><button type="button" class="ac-btn primary sm" data-ac-apply>应用</button></div></div>` : ""}</section>`;
}
function acInstallUnifiedFilters(app){
  const body = app.querySelector(".ac-pagebody"), config = acUnifiedFilterConfig();
  if (!body) return;
  body.querySelectorAll(".ac-pagehead button,.ac-material-toolbar-actions > button,.cs-table-head > button,.ac-banner button").forEach(button => {
    if (/导出|刷新|保存视图|列设置/.test(button.textContent) && !button.matches("[data-mclose],[data-dclose]")) button.remove();
  });
  body.querySelector(".ac-material-toolbar-actions .ac-viewtoggle")?.remove();
  if (!config) return;
  body.querySelectorAll(".ac-filter,.ac-bigsearch,.ac-material-filter,.cs-filter-panel,.ac-analytics-filters,.ac-attr-quick,.ac-attr-filter-head,.ac-attr-selected,.ac-version-filters").forEach(element => element.remove());
  if (AC_STATE.route === "onboarding-review") body.querySelector(".ac-seg")?.remove();
  const anchor = AC_STATE.route === "permissions" ? body.querySelector(".ac-card .ac-table-wrap") : body.querySelector(".ac-table-wrap,.ac-material-batchbar,.ac-material-toolbar,.ac-mat-grid,.ac-attr-toolbar,.ac-analytics-summary,.ac-empty");
  if (anchor) anchor.insertAdjacentHTML("beforebegin",acUnifiedFilterMarkup(config));
  else body.insertAdjacentHTML("beforeend",acUnifiedFilterMarkup(config));
}
function acCommitUnifiedFilters(config,value){
  config.set(value);AC_LIST.page = 1;AC_STATE.matSelected = [];
  AC_FILTER_UI.open = null;delete AC_FILTER_UI.drafts[config.id];acRender();
}
function acFilterReset(route){AC_LIST.page = 1;AC_LIST.filters[route] = {};AC_LIST.sort[route] = {};}
function acApplyList(route,rows,filterFn){
  const f = AC_LIST.filters[route] || {};
  let out = (filterFn ? rows.filter(r => filterFn(r,f)) : rows).filter(row => acUnifiedMatch(row));
  const sort = AC_LIST.sort[route];
  if (sort && sort.key) {
    const dir = sort.dir === "asc" ? 1 : -1;
    out = out.slice().sort((a,b) => {const x = a[sort.key],y = b[sort.key];return (typeof x === "number" ? x : String(x)).localeCompare === undefined ? (x > y ? 1 : x < y ? -1 : 0)*dir : String(x).localeCompare(String(y),"zh-CN",{numeric:true})*dir;});
  }
  const size = AC_STATE.pageSize || 20;
  const total = out.length;
  const pages = Math.max(1,Math.ceil(total/size));
  if (AC_LIST.page > pages) AC_LIST.page = pages;
  return {rows:out.slice((AC_LIST.page-1)*size,AC_LIST.page*size),total,pages};
}
function acPagination(total,pages){
  const cur = AC_LIST.page;
  const btns = [];
  const win = [];
  for (let i = Math.max(1,cur-2);i <= Math.min(pages,cur+2);i++) win.push(i);
  if (win[0] > 1) {btns.push(1);if (win[0] > 2) btns.push("…");}
  btns.push(...win);
  if (win[win.length-1] < pages) {if (win[win.length-1] < pages-1) btns.push("…");btns.push(pages);}
  return `<div class="ac-pagination"><span>共 ${total} 条</span>${acDD("pagesize",(AC_STATE.pageSize||20)+"条/页",{sm:true})}
  <div class="ac-page-btns">
    <button data-pg="${Math.max(1,cur-1)}" ${cur<=1?"disabled":""}>‹</button>
    ${btns.map(b => b === "…" ? `<button disabled>…</button>` : `<button class="${b===cur?"active":""}" data-pg="${b}">${b}</button>`).join("")}
    <button data-pg="${Math.min(pages,cur+1)}" ${cur>=pages?"disabled":""}>›</button>
  </div><span class="ac-page-jump">第 ${cur} / ${pages} 页</span></div>`;
}
/* 表头排序渲染：cols里带sortable的列自动可点 */
function acTh(c,route){
  const sort = AC_LIST.sort[route] || {};
  const arrow = sort.key === c.key ? (sort.dir === "asc" ? "↑" : "↓") : "⇅";
  const label = c.head || acEsc(c.label);
  const cls = [c.actions && "ac-col-actions",c.materialActions && "ac-material-actions-col",c.fixedLeft && "ac-col-select"].filter(Boolean).join(" ");
  return c.sortable ? `<th ${c.w?`style="width:${c.w}"`:""} class="ac-sortable ${cls}" data-sort="${c.key}" data-route="${route}">${label}<span class="ac-sort">${arrow}</span></th>` : `<th ${c.w?`style="width:${c.w}"`:""} class="${cls}">${label}</th>`;
}
function acTableX(route,cols,rows,opts = {}){
  if (!rows.length) {
    const filtered = Object.values(AC_LIST.filters[route]||{}).some(v => v) || (AC_LIST.sort[route]||{}).key;
    return acEmpty(filtered ? "无匹配结果，试试调整筛选或搜索词" : (opts.empty || "暂无数据"));
  }
  const body = rows.map(r => `<tr>${cols.map(c => {const cls = [c.actions && "ac-col-actions",c.materialActions && "ac-material-actions-col",c.fixedLeft && "ac-col-select"].filter(Boolean).join(" ");return c.actions || c.fixedLeft ? `<td class="${cls}" title="${acEsc(String(r[c.key]??""))}">${c.render ? c.render(r) : acEsc(r[c.key]??"")}</td>` : `<td title="${acEsc(String(r[c.key]??""))}">${c.render ? c.render(r) : acEsc(r[c.key]??"")}</td>`;}).join("")}</tr>`).join("");
  return `<div class="ac-table-wrap${route === "cs-commissions" ? " cs-table-wrap cs-cases-wrap" : route === "cs-batches" ? " cs-table-wrap cs-batches-wrap" : ""}"><table class="ac-table"><thead><tr>${cols.map(c => acTh(c,route)).join("")}</tr></thead><tbody>${body}</tbody></table></div>${opts.page === false ? "" : acPagination(opts.total ?? rows.length,opts.pages ?? 1)}`;
}
/* 搜索框（真实过滤）：data-lsearch挂route，输入回车应用 */
function acSearch(route,ph){
  const cur = (AC_LIST.filters[route]||{}).q || "";
  return `<div class="ac-field"><input type="text" data-lsearch="${route}" value="${acEsc(cur)}" placeholder="${acEsc(ph||"搜索，回车确认")}"></div>`;
}
function acMetricBar(items){return `<div class="ac-metric-bar">${items.map(m => `<button class="ac-metric" ${m.go?`data-go="${m.go}"`:""}><span class="num ${m.tone?`is-${m.tone}`:""}">${m.num}${m.delta?`<small class="ac-delta ${m.delta.startsWith("-")?"down":"up"}">${m.delta.startsWith("-")?"▾":"▴"}${m.delta.replace("-","")}</small>`:""}</span><span class="label">${acEsc(m.label)}</span></button>`).join("")}</div>`;}
function acPaginationPlaceholder(){/* 已并入真分页acPagination(total,pages) */}
function acEmpty(text){return `<div class="ac-empty"><div class="ac-empty-icon">◍</div><p>${acEsc(text)}</p></div>`;}
function acTable(cols,rows,opts = {}){
  rows = rows.filter(row => acUnifiedMatch(row));
  if (!rows.length) return acEmpty(opts.empty || "暂无数据");
  return `<div class="ac-table-wrap"><table class="ac-table"><thead><tr>${cols.map(c => `<th ${c.w?`style="width:${c.w}"`:""} class="${c.actions?"ac-col-actions":""}">${acEsc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => c.actions ? `<td class="ac-col-actions">${c.render(r)}</td>` : `<td title="${acEsc(String(r[c.key]??""))}">${c.render ? c.render(r) : acEsc(r[c.key]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${opts.page===false?"":acPagination(opts.total ?? rows.length,opts.pages ?? Math.max(1,Math.ceil(rows.length/(AC_STATE.pageSize||20))))}`;
}
function acBanner(tone,text,linkLabel,go){return `<div class="ac-banner is-${tone}"><span class="ac-banner-icon">${tone==="danger"?"⛔":"⚠"}</span><span class="ac-banner-text">${text}${linkLabel?` <button class="ac-link" data-go="${go}">${acEsc(linkLabel)}</button>`:""}</span><button class="ac-banner-close" data-close-banner>×</button></div>`;}
function acTabs(items,current,route){return `<div class="ac-tabs">${items.map(t => `<button class="${t.id===current?"active":""}" data-ptab="${t.id}" data-route="${route||""}">${acEsc(t.label)}${t.count!=null?` <span class="ac-tab-count">${t.count}</span>`:""}</button>`).join("")}</div>`;}
function acSeg(items,current,key){return `<div class="ac-seg">${items.map(t => `<button class="${t.v===current?"active":""}" data-seg="${key}" data-val="${t.v}">${acEsc(t.label)}${t.n!=null?`<span class="ac-seg-count">${t.n}</span>`:""}</button>`).join("")}</div>`;}
function acFilterBar(page,fields){
  return `<div class="ac-filter">${fields.map(f => {
    if (f.type === "search") return `<div class="ac-field"><input type="text" placeholder="${acEsc(f.ph||"搜索")}"></div>`;
    if (f.type === "date") return `<div class="ac-field"><input type="text" placeholder="${acEsc(f.label||"日期范围")}"></div>`;
    const key = `f.${page}.${f.key}`;
    acDDReg(key,f.options.map(o => ({v:o,label:o})),() => f.options[0],v => acToast(`已筛选 ${f.label}：${v}`));
    return `<div class="ac-field"><label>${acEsc(f.label)}</label>${acDD(key,f.options[0],{sm:true})}</div>`;
  }).join("")}<div class="ac-filter-actions"><button class="ac-btn primary sm">查询</button><button class="ac-btn ghost sm">重置</button></div></div>`;
}
function acPagehead(title,desc,actions){return `<div class="ac-pagehead"><div class="ac-title"><h1>${acEsc(title)}</h1><p>${acEsc(desc)}</p></div><div class="ac-actions">${actions||""}</div></div>`;}
function acToast(message,type = "success"){
  const wrap = document.querySelector(".ac-toast-wrap") || (() => {const el = document.createElement("div");el.className = "ac-toast-wrap";document.body.appendChild(el);return el;})();
  wrap.querySelectorAll(".ac-toast").forEach(t => t.remove());
  const el = document.createElement("div");
  el.className = `ac-toast is-${type}`;
  el.innerHTML = `<span class="ac-toast-icon">${type==="success"?"✓":"✕"}</span><span class="ac-toast-msg">${acEsc(message)}</span><button class="ac-toast-close">×</button>`;
  el.querySelector(".ac-toast-close").onclick = () => el.remove();
  wrap.appendChild(el);setTimeout(() => el.remove(),type === "success" ? 3000 : 5000);
}
function acModal({title,body,foot,size}){
  acModalClose();acDrawerClose();
  const mask = document.createElement("div");mask.className = "ac-modal-mask";
  mask.innerHTML = `<div class="ac-modal ${size||""}"><div class="ac-modal-head"><h3>${title}</h3><button class="ac-modal-close" data-mclose>×</button></div><div class="ac-modal-body">${body}</div>${foot?`<div class="ac-modal-foot">${foot}</div>`:""}</div>`;
  mask.querySelectorAll("[data-mclose]").forEach(button => { button.onclick = acModalClose; });
  document.body.appendChild(mask);return mask;
}
function acModalClose(){document.querySelectorAll(".ac-modal-mask").forEach(m => m.remove());}
function acDrawer({title,sub,badge,tabs,foot,wide}){
  acModalClose();acDrawerClose();
  const mask = document.createElement("div");mask.className = "ac-drawer-mask";
  const dr = document.createElement("div");dr.className = `ac-drawer${wide?" wide":""}`;
  dr.innerHTML = `<div class="ac-drawer-head"><div class="ac-drawer-title"><h3>${title}</h3><p>${sub||""}</p></div>${badge||""}<button class="ac-drawer-close" data-dclose>×</button></div>
    <div class="ac-drawer-body">${tabs && tabs.length > 1 ? `<div class="ac-tabs">${tabs.map((t,i) => `<button class="${i===0?"active":""}" data-dtab="${t.id}">${acEsc(t.label)}</button>`).join("")}</div>` : ""}
    ${tabs ? tabs.map((t,i) => `<div class="ac-dtab" data-dtab-body="${t.id}" ${i?"hidden":""}>${t.html}</div>`).join("") : ""}</div>
    ${foot?`<div class="ac-drawer-foot">${foot}</div>`:""}`;
  dr.querySelector("[data-dclose]").onclick = acDrawerClose;
  document.body.append(mask,dr);
  dr.addEventListener("click",e => {const t = e.target.closest("[data-dtab]");if (!t) return;dr.querySelectorAll("[data-dtab]").forEach(b => b.classList.toggle("active",b === t));dr.querySelectorAll("[data-dtab-body]").forEach(p => p.hidden = p.dataset.dtabBody !== t.dataset.dtab);});
  return dr;
}
function acDrawerClose(){document.querySelectorAll(".ac-drawer").forEach(d => d.remove());document.querySelectorAll(".ac-drawer-mask").forEach(m => m.remove());}
function acKV(pairs){return `<div class="ac-kv">${pairs.map(p => `<div><dt>${acEsc(p[0])}</dt><dd>${p[1]}</dd></div>`).join("")}</div>`;}
function acTimeline(items){return `<div class="ac-timeline">${items.map(it => `<div class="ac-tl-item ${it.state||""}"><span class="ac-tl-dot"></span><div class="ac-tl-body"><span class="ac-tl-time">${acEsc(it.time)}</span><span class="ac-tl-title">${acEsc(it.title)}</span>${it.desc?`<span class="ac-tl-desc">${acEsc(it.desc)}</span>`:""}</div></div>`).join("")}</div>`;}
function acMiniTable(headers,rows){return `<div class="ac-table-wrap"><table class="ac-table"><thead><tr>${headers.map(h => `<th>${acEsc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}

/* ===== 页面：工作台（方案A） ===== */
/* ===== 工作台角色配置（方案v1.1：六角色） ===== */
const AC_WB_RANGE = [["today","今日"],["yesterday","昨日"],["d7","最近7天"],["d30","最近30天"],["month","本月"],["lastmonth","上月"],["custom","自定义区间"]];
const AC_WB_RANGE_LABEL = {today:"今日",yesterday:"昨日",d7:"最近7天",d30:"最近30天",month:"本月",lastmonth:"上月",custom:"自定义区间"};
function acWbScale(base,range){
  const f = {today:1,yesterday:0.94,d7:6.8,d30:27,month:21.5,lastmonth:20.2,custom:12}[range] || 1;
  return Math.round(base*f);
}
function acWbMetrics(role){
  const R = AC_STATE.wbRange,mk = (base,fmt) => {const v = acWbScale(base,R);return fmt === "money" ? acMoney(v) : v.toLocaleString("en-US");};
  const map = {
    operations:[
      {num:mk(12480),label:"点击",delta:"+12%",go:"analytics-performance"},
      {num:mk(1204),label:"注册",delta:"+8%",go:"analytics-performance"},
      {num:mk(186),label:"FTD / 有效FTD",delta:"+5%",go:"analytics-performance"},
      {num:mk(94),label:"有效FTD",delta:"+3%",go:"analytics-quality"},
      {num:mk(9270,"money"),label:"新增佣金",delta:"-2%",go:"commissions"},
    ],
    finance:[
      {num:mk(9270,"money"),label:"新增佣金",delta:"-2%",go:"commissions"},
      {num:acMoney(12650),label:"待结算总额",go:"statements"},
      {num:acMoney(8420),label:"结算中金额",tone:"warn",go:"commissions"},
      {num:AC_DB.withdrawals.filter(w=>w.status==="待审核").length,label:"待审批提现（笔）",tone:"warn",go:"withdrawals"},
      {num:mk(39110,"money"),label:"净支出",go:"analytics-funds"},
    ],
    risk_reviewer:[
      {num:AC_DB.tasks.filter(t=>t.type==="风险复核"&&t.status!=="已完成").length,label:"我的待复核",go:"workbench"},
      {num:11,label:"今日新增命中",go:"risk"},
      {num:acMoney(4260),label:"结算中（隔离）金额",tone:"warn",go:"commissions"},
      {num:AC_DB.clusters.filter(c=>c.status==="调查中").length,label:"调查中集群",go:"risk"},
      {num:AC_DB.tasks.filter(t=>t.sla<=0).length,label:"处理时限已超时",tone:"danger",go:"workbench"},
    ],
    risk_supervisor:[
      {num:AC_DB.approvals.filter(a=>a.type==="调级").length,label:"待我审批（风险类）",go:"workbench"},
      {num:AC_DB.approvals.filter(a=>a.wait>12).length,label:"审批超时",tone:"danger",go:"workbench"},
      {num:AC_DB.tasks.filter(t=>t.type==="风险复核"&&t.priority==="高").length,label:"高风险任务",tone:"danger",go:"risk"},
      {num:acMoney(4260),label:"结算中金额",go:"commissions"},
      {num:AC_DB.blacklist.filter(b=>b.status==="生效").length,label:"黑名单生效中",go:"risk"},
    ],
    compliance:[
      {num:1,label:"KYC同步异常",tone:"warn",go:"integrations"},
      {num:AC_DB.govBreach.filter(b=>b.status==="处置中").length,label:"Breach处置中",tone:"danger",go:"governance"},
      {num:AC_DB.govAuth.filter(a=>a.status==="待审批").length,label:"敏感授权待审",tone:"warn",go:"governance"},
      {num:2,label:"保留/删除到期",go:"governance"},
      {num:1,label:"高敏入驻待审",go:"onboarding-review"},
    ],
    admin:[
      {num:mk(94),label:"有效FTD",delta:"+3%",go:"analytics-performance"},
      {num:AC_DB.tasks.filter(t=>t.status!=="已完成").length,label:"全部待办",go:"workbench"},
      {num:AC_DB.approvals.length,label:"全部待审批",tone:"warn",go:"workbench"},
      {num:9,label:"异常信号",tone:"danger",go:"workbench"},
      {num:"4系统正常",label:"系统健康",go:"integrations"},
    ],
  };
  return (map[role] || map.operations).slice(0,5);
}
function acWbSignals(role){
  const all = {
    danger1:{tone:"danger",icon:"⇄",title:"集成异常",desc:"CRM客户事实同步失败×23，23个客户待补数",go:"integrations"},
    warn1:{tone:"warn",icon:"◆",title:"风险告警 2",desc:"集群CL-118调查中 · C-88354拒付关联",go:"risk"},
    warn2:{tone:"warn",icon:"◷",title:"结算中到期 14",desc:"今日到期14笔，2笔需人工重检",go:"commissions"},
    danger2:{tone:"danger",icon:"⊘",title:"C0阻断 1",desc:"AF-0921 信用C0，结算批次已自动阻断",go:"statements"},
    warn3:{tone:"warn",icon:"◷",title:"审批超时 1",desc:"配置变更价格表v14 等待24.7小时",go:"workbench"},
    warn4:{tone:"warn",icon:"▲",title:"Breach处置中",desc:"BR-003 通知剩余处理时间4小时",go:"governance"},
    warn5:{tone:"warn",icon:"!",title:"越权访问告警",desc:"检测到2次未授权敏感字段访问尝试",go:"audit"},
    warn6:{tone:"warn",icon:"◆",title:"集群成员变化",desc:"CL-118 新增关联成员2名",go:"risk"},
  };
  const byRole = {
    operations:["danger1","warn1","warn2","danger2"],
    finance:["warn2","danger2","danger1","warn3"],
    risk_reviewer:["warn1","warn6"],
    risk_supervisor:["warn1","warn3"],
    compliance:["danger1","warn4","warn5"],
    admin:["danger1","warn1","warn2","danger2"],
  };
  return (byRole[role] || byRole.operations).map(k => all[k]);
}
function acWbQuick(role){
  const all = [
    {label:"▣ 入驻审核",go:"onboarding-review",roles:["operations","compliance","admin"]},
    {label:"₪ 生成结算批次",go:"statements",roles:["finance","admin"]},
    {label:"✎ 新建公告",go:"announcements",roles:["operations","admin"]},
    {label:"↥ 上传素材",go:"materials",roles:["operations","admin"]},
    {label:"⇄ 发起对账",go:"recon",roles:["finance","operations","admin"]},
    {label:"◆ 风险工作台",go:"risk",roles:["risk_reviewer","risk_supervisor","admin"]},
    {label:"◍ 黑名单",go:"risk",roles:["risk_reviewer"]},
    {label:"◈ 数据治理",go:"governance",roles:["compliance","admin"]},
    {label:"☰ 操作审计",go:"audit",roles:["compliance","admin"]},
  ];
  return all.filter(q => q.roles.includes(role));
}
function acWbTasks(role){
  const f = {
    operations:t => t.type !== "风险复核",
    finance:t => ["保证金抵扣","冲正追回","集成失败","补数"].includes(t.type),
    risk_reviewer:t => ["风险复核","申诉","集成失败","补数"].includes(t.type),
    risk_supervisor:() => false,
    compliance:t => ["集成失败","补数"].includes(t.type),
    admin:() => true,
  };
  return AC_DB.tasks.filter((f[role] || (() => true)));
}
function acWbApprovals(role){
  const f = {
    operations:a => ["入驻","财务资料变更"].includes(a.type),
    finance:a => ["结算","提现"].includes(a.type),
    risk_reviewer:() => false,
    risk_supervisor:a => ["调级","结算延长","风险结论","黑名单","熔断确认"].includes(a.type),
    compliance:a => ["高敏入驻","数据分级","敏感授权"].includes(a.type),
    admin:() => true,
  };
  return AC_DB.approvals.filter((f[role] || (() => true)));
}

/* 工作台富指标条：标签→数字→环比胶囊+趋势线；无环比的指标显示“查看明细”引导 */
function acSpark(seed,dir){
  let s = seed % 233280 || 1;const rnd = () => {s = (s*9301+49297) % 233280;return s/233280;};
  const n = 7,pts = [];
  for (let i = 0;i < n;i++) {
    const t = i/(n-1),trend = dir === "up" ? (t-.5)*.7 : dir === "down" ? (.5-t)*.7 : 0;
    const v = Math.min(.95,Math.max(.05,.5+trend+(rnd()-.5)*.26));
    pts.push([+(i*62/(n-1)).toFixed(1),+(3+(1-v)*16).toFixed(1)]);
  }
  const line = pts.map((p,i) => `${i?"L":"M"}${p[0]} ${p[1]}`).join(" ");
  const last = pts[pts.length-1];
  return `<svg class="ac-spark ${dir}" viewBox="0 0 62 22" aria-hidden="true"><path class="ar" d="${line} L62 22 L0 22 Z"/><path class="ln" d="${line}"/><circle cx="${last[0]}" cy="${last[1]}" r="2"/></svg>`;
}
function acWbMetricBar(items){
  return `<div class="ac-metric-bar is-rich">${items.map(m => {
    const seed = [...String(m.label)].reduce((a,c) => a*31+c.charCodeAt(0),7);
    let foot = "";
    if (m.delta) {
      const down = m.delta.startsWith("-"),dir = down ? "down" : "up";
      foot = `<span class="ac-delta-chip ${dir}">${down?"▾":"▴"} ${m.delta.replace("-","")}</span>${acSpark(seed,dir)}`;
    } else if (m.go) {
      foot = `<small>查看明细 ›</small>`;
    }
    return `<button class="ac-metric" ${m.go?`data-go="${m.go}"`:""}><span class="label">${acEsc(m.label)}</span><span class="num ${m.tone?`is-${m.tone}`:""}">${m.num}</span><span class="ac-metric-foot">${foot}</span></button>`;
  }).join("")}</div>`;
}

function taskProfile(t){
  const common = {owner:t.status === "处理中" ? "当前处理人" : "待认领",reviewer:"—",approver:"—",window:"以任务创建时间为起点，按处理时限倒计时",decision:"待处理"};
  const profiles = {
    "风险复核": {review:"核验风险命中是否成立，并决定是否维持佣金隔离",participants:[["发起方","风控规则引擎"],["执行人",common.owner],["复核人","风控复核员"],["裁决人","风控主管"],["协同方","CRM / 支付 / 运营"]],params:[["风险对象","CL-118（关联集群）"],["命中规则","设备/IP/支付三重关联"],["风险等级","R4 · 高风险"],["隔离金额","$4,260"],["当前状态","结算中隔离"],["参照规则","风控规则 v11 · 集群阈值≥5"]],checks:["确认关联成员、设备/IP、支付工具证据均可追溯","核对客户与合作方归属，排除已知误报","确认隔离金额与佣金记录一致","提交复核结论并由风控主管审批"]},
    "申诉": {review:"核验合作方对佣金/归属的申诉事实，并形成处理意见",participants:[["发起方","合作方 AF-1023"],["受理人",common.owner],["调查人","运营"],["协同方","CRM / 归属管理"],["最终确认","运营主管"]],params:[["申诉对象","AF-1023 · 客户 C-88479"],["申诉主题","佣金归属争议"],["原始来源","工单 TK-7701"],["涉及金额","$96"],["数据窗口","点击→注册→FTD 7日归因窗口"],["参照规则","Affiliate归属规则 v0.9"]],checks:["核对事件链与原始TraceId","核对IB/Affiliate双向隔离规则","核对Sub ID与链接归属","记录结论、补计/驳回原因并通知申请方"]},
    "结算延长": {review:"核验结算中风险是否仍存在，决定是否延长结算期",participants:[["发起方","风控规则引擎"],["执行人",common.owner],["复核人","风控复核员"],["审批人","风控主管"],["知会方","财务"]],params:[["关联对象","CL-104 · 第2次延长"],["当前结算状态","结算中"],["原到期日","2026-11-16"],["拟延长至","2026-11-23"],["延长次数","2 / 最多3次"],["参照规则","结算参数 v6 · 集群延长上限3次"]],checks:["确认风险证据在最近一次复核后仍有效","核对延长次数未超过配置上限","计算对合作方和结算批次的影响","形成建议后提交风控主管审批"]},
    "保证金抵扣": {review:"核验损失成立及抵扣金额，避免重复扣除",participants:[["发起方","财务对账"],["执行人",common.owner],["复核人","财务复核员"],["审批人","财务主管"],["协同方","风险 / 结算"]],params:[["案件号","CH-77"],["抵扣原因","拒付损失"],["拟抵扣金额","$320"],["来源流水","结算批次 STM-2026-11-A"],["保证金余额","$1,200"],["参照规则","保证金与税费 v4"]],checks:["核对支付拒付原始凭证与金额","确认未在冲正/追回任务中重复处理","核对保证金余额足够且不低于最低留存","提交抵扣明细并由财务审批"]},
    "冲正追回": {review:"核验冲正原因、追回路径和金额，建立可追溯案件",participants:[["发起方","风险处置"],["执行人",common.owner],["调查人","风控复核员"],["审批人","财务主管"],["协同方","CRM / 支付"]],params:[["案件对象","C-88354 · AF-0921"],["原计佣金额","$96"],["冲正原因","拒付关联"],["追回状态","待立案"],["关联集群","CL-118"],["参照规则","冲正追回规则 v0.6"]],checks:["核对拒付事件、客户身份仅使用客户ID展示","核对原佣金、结算与提现是否已发生","确认追偿对象及金额计算","提交案件并同步财务与CRM"]},
    "集成失败": {review:"定位外部系统失败原因，补齐数据并确认重试结果",participants:[["发起方","系统集成监控"],["执行人",common.owner],["系统负责人","CRM接口负责人"],["复核人","运营"],["知会方","数据治理"]],params:[["失败系统","CRM"],["任务对象","客户事实同步"],["失败原因","字段映射失败 ×23"],["重试次数","3次"],["影响范围","23个客户待补数"],["参照参数","CRM接口映射 v0.10"]],checks:["查看TraceId和失败响应，确认不是重复任务","对照字段映射与CRM事实源定义","补数前确认幂等键及影响范围","重试后核对客户与佣金数据一致性"]},
    "补数": {review:"核对缺失数据来源，安全补数并验证下游一致性",participants:[["发起方","数据质量监控"],["执行人",common.owner],["数据负责人","运营/CRM"],["复核人","合规或财务"],["知会方","计佣引擎"]],params:[["缺失对象","客户/事件事实"],["数据来源","CRM或事件流水"],["影响范围","待计佣与归因记录"],["补数方式","幂等重放"],["参照规则","事件与OpenAPI映射 v0.10"]],checks:["确认缺数时间窗和原始记录存在","确认补数不会覆盖人工修正","执行幂等重放并记录批次号","验证归因、计佣和通知结果"]}
  };
  return {...common,...(profiles[t.type] || {review:"核对任务事实、参数与影响后完成处理",participants:[["发起方",t.source],["执行人",common.owner],["复核人","对应业务负责人"],["审批人","按审批流配置"]],params:[["来源页面",t.source],["优先级",t.priority],["当前状态",t.status],["参照规则","当前生效配置版本"]],checks:["核对事实与原始证据","核对当前生效参数","确认影响范围","提交处理结论并留痕"]})};
}
function drawerTask(id){
  const t = AC_DB.tasks.find(x => x.id === id); if (!t) return;
  const p = taskProfile(t), tone = t.sla <= 0 ? "is-red" : t.sla < 2 ? "is-orange" : "is-blue";
  const action = t.status === "待认领" ? `<button class="ac-btn secondary" data-task-action="claim" data-task-id="${t.id}">认领任务</button><button class="ac-btn primary" data-task-action="start" data-task-id="${t.id}">开始处理</button>` : `<button class="ac-btn secondary" data-task-action="transfer" data-task-id="${t.id}">转办</button><button class="ac-btn primary" data-task-action="complete" data-task-id="${t.id}">提交处理结果</button>`;
  const checklist = `<div class="ac-task-checklist">${p.checks.map((x,i) => `<label><input type="checkbox" data-task-check="${i}"><span>${acEsc(x)}</span></label>`).join("")}</div>`;
  acDrawer({title:`${t.id} · ${t.type}`,sub:t.title,badge:`<span class="ac-badge ${acStat(t.status)}">${acEsc(t.status)}</span>`,wide:true,tabs:[
    {id:"overview",label:"任务概览",html:`<div class="ac-task-hero"><div><small>剩余处理时间</small><strong class="${tone}">${acFmtSLA(t.sla)}</strong></div><div><small>来源</small><strong>${acEsc(t.source)}</strong></div><div><small>优先级</small><strong>${acPrio(t.priority)}</strong></div></div><h4 class="ac-drawer-section-title">本次需要审核什么</h4><p class="ac-drawer-copy">${acEsc(p.review)}</p><h4 class="ac-drawer-section-title">参与角色与责任</h4>${acKV(p.participants)}<h4 class="ac-drawer-section-title">业务影响</h4>${acKV([["影响对象",p.params[0]?.[1] || "关联业务对象"],["影响范围",p.params.find(x=>x[0]==="影响范围")?.[1] || "待确认"],["当前决策",p.decision],["审计要求","所有查看、补数、提交动作写入操作审计"]])}`},
    {id:"reference",label:"参照参数",html:`<h4 class="ac-drawer-section-title">事实与生效参数</h4>${acKV(p.params)}<h4 class="ac-drawer-section-title">处理前检查清单</h4>${checklist}<div class="ac-task-note">参数以当前生效版本为准；如发现规则与事实不一致，应先转办配置/数据治理任务，不直接覆盖底账。</div>`},
    {id:"timeline",label:"流程记录",html:acTimeline([{time:"今日 09:12",title:"任务创建",desc:`由${acEsc(t.source)}生成`,state:"is-done"},{time:"今日 09:13",title:t.status === "待认领" ? "等待认领" : "已进入处理中",desc:`参与人：${acEsc(p.participants[1]?.[1] || "待分派")} · 处理时限倒计时已开始`,state:t.status === "待认领" ? "is-miss" : "is-done"},{time:"—",title:"等待处理结论",desc:"完成检查并提交后进入审批/关闭",state:"is-miss"}])}
  ],foot:action});
}
function taskAction(action,id){
  const t = AC_DB.tasks.find(x => x.id === id); if (!t) return;
  if (action === "claim") { t.status = "处理中"; acDrawerClose(); acRender(); acToast(`已认领 ${id}，任务已锁定给当前处理人`); return; }
  if (action === "start") { t.status = "处理中"; acDrawerClose(); acRender(); acToast(`已开始处理 ${id}，剩余处理时间继续倒计时`); return; }
  if (action === "transfer") { acModal({title:`转办任务 ${id}`,body:`<div class="ac-form"><div class="ac-form-item"><label>转办给<span class="ac-req">*</span></label><select><option>风控复核员</option><option>运营</option><option>财务</option><option>合规</option></select></div><div class="ac-form-item"><label>转办原因<span class="ac-req">*</span></label><textarea placeholder="请说明转办原因、上下文和接收人需要关注的事项"></textarea></div></div>`,foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-task-transfer-confirm="${id}">确认转办</button>`});return; }
  if (action === "complete") {
    const checked = [...document.querySelectorAll("[data-task-check]")].filter(x => x.checked).length;
    if (checked < 2) { acToast("请至少完成2项处理前检查后再提交", "error"); return; }
    acModal({title:`提交处理结果 · ${id}`,body:`<div class="ac-form"><div class="ac-form-item"><label>处理结论<span class="ac-req">*</span></label><select><option>核验通过，按建议处理</option><option>部分通过，转办复核</option><option>未通过，关闭任务</option></select></div><div class="ac-form-item"><label>处理说明<span class="ac-req">*</span></label><textarea minlength="10" placeholder="请填写事实依据、参照参数、处理动作和遗留风险（至少10字）"></textarea><span class="ac-field-hint">提交后写入审计，并按任务类型进入审批或关闭。</span></div><div class="ac-form-item"><label><input type="checkbox" checked> 我已核对参照参数与影响范围</label></div></div>`,foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-task-complete-confirm="${id}">提交结果</button>`});
  }
}
function drawerApproval(id){
  const a = AC_DB.approvals.find(x => x.id === id); if (!a) return;
  const self = a.applicant === AC_STATE.role || AC_STATE.role === "admin";
  const buttons = self ? `<button class="ac-btn secondary" data-drawer-close>关闭</button>` : `<button class="ac-btn danger" data-toast="已驳回 ${a.id}，需填写驳回原因">驳回</button><button class="ac-btn primary" data-toast="已通过 ${a.id}">通过</button>`;
  acDrawer({title:`${a.id} · ${a.type}`,sub:a.target,badge:`<span class="ac-badge is-orange">待审批</span>`,tabs:[
    {id:"detail",label:"审批内容",html:`${self?`<div class="ac-selfreview-note">ⓘ ${AC_STATE.role === "admin" ? "管理员不参与审批，仅可观察" : "这是您提交的申请，不能审批自己的申请"}</div>`:""}<div class="ac-approve-card"><div><small>申请人</small><strong>${acEsc(a.applicant)}</strong></div><div><small>提交时间</small><strong>${acEsc(a.time)}</strong></div><div><small>等待时长</small><strong class="${a.wait > 12 ? "ac-warn-text" : ""}">${a.wait}小时</strong></div><div><small>审批类型</small><strong>${acEsc(a.type)}</strong></div></div>${acKV([["审批对象",a.target],["职责校验",self ? "申请人/观察者不可审批" : "通过"],["审批规则","需保留审批意见与操作审计"]])}`},
    {id:"history",label:"审批记录",html:acTimeline([{time:acEsc(a.time),title:"提交审批",desc:`申请人：${acEsc(a.applicant)}`,state:"is-done"},{time:"—",title:"等待当前角色处理",desc:a.wait > 12 ? "已超过12小时，请优先处理" : "尚未超时",state:a.wait > 12 ? "is-block" : "is-miss"}])}
  ],foot:buttons});
}

function pgWorkbench(){
  const role = AC_STATE.role;
  const roleLabel = (AC_ROLES.find(r => r[0]===role)||["","运营"])[1];
  acDDReg("wbRange",AC_WB_RANGE.map(r => ({v:r[0],label:r[1]})),() => AC_STATE.wbRange,v => {
    if (v === "custom") {acToast("自定义区间：日期范围组件接入后启用");return;}
    AC_STATE.wbRange = v;acRender();
  });
  const rangePicker = `<div class="ac-wb-range"><label>统计范围</label>${acDD("wbRange",AC_WB_RANGE_LABEL[AC_STATE.wbRange]||"今日",{sm:true})}</div>`;
  const snapshot = acWbMetricBar(acWbMetrics(role));
  const signals = acWbSignals(role);
  const quick = acWbQuick(role);
  const myTasks = acWbTasks(role);
  const myApprovals = acWbApprovals(role);
  const showTaskTab = myTasks.length > 0;
  const showApTab = myApprovals.length > 0 && role !== "risk_reviewer";
  const taskCols = [
    {key:"id",label:"任务号",w:"84px"},{key:"type",label:"类型",w:"88px",render:r => `<span class="ac-badge is-blue">${acEsc(r.type)}</span>`},
    {key:"title",label:"标题"},{key:"priority",label:"优先级",w:"72px",render:r => acPrio(r.priority)},
    {label:"剩余处理时间",w:"138px",render:r => `<span class="ac-sla ${r.sla<=0?"is-over":r.sla<2?"is-warn":""}">${acFmtSLA(r.sla)}</span>`},
    {key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${acEsc(r.status)}</span>`},
    {label:"操作",w:"104px",actions:true,render:r => r.status==="待认领"?`<button class="ac-link" data-toast="已认领 ${r.id}">认领</button><button class="ac-link" data-task="${r.id}">详情</button>`:`<button class="ac-link" data-task="${r.id}">处理</button><button class="ac-link" data-toast="转办开发中">转办</button>`},
  ];
  const apCols = [
    {key:"id",label:"审批号",w:"84px"},{key:"type",label:"类型",w:"80px",render:r => `<span class="ac-badge is-orange">${acEsc(r.type)}</span>`},{key:"target",label:"对象"},
    {key:"applicant",label:"申请人",w:"116px"},{label:"等待",w:"80px",render:r => `<span class="ac-sla ${r.wait>12?"is-warn":""}">${r.wait}时</span>`},
    {label:"操作",w:"96px",actions:true,render:r => (r.applicant===role || role === "admin") ? `<span class="ac-badge is-gray" title="${role==="admin"?"管理员不参与审批（方案v1.1）":"您提交的申请，需他人审批"}">待他人审</span>` : `<button class="ac-link" data-approve="${r.id}">审批</button><button class="ac-link" data-approval="${r.id}">详情</button>`},
  ];
  const isTasks = AC_STATE.tab !== "approvals" || !showApTab;
  const tabsHtml = [
    showTaskTab ? {id:"tasks",label:role==="admin"?"全部任务":"任务队列",count:myTasks.length} : null,
    showApTab ? {id:"approvals",label:role==="risk_supervisor"?"待审批流":"审批队列",count:myApprovals.length} : null,
  ].filter(Boolean);
  const bodyHtml = !tabsHtml.length
    ? acEmpty("当前角色无处理队列")
    : (isTasks && showTaskTab ? acTable(taskCols,myTasks,{page:false}) : acTable(apCols,myApprovals,{page:false}));
  /* 队列头部右侧：超时/即将超时胶囊（任务按SLA，审批按等待>12h） */
  const chips = !tabsHtml.length ? "" : (isTasks && showTaskTab
    ? [[myTasks.filter(t => t.sla <= 0).length,"red","已超时"],[myTasks.filter(t => t.sla > 0 && t.sla < 2).length,"orange","2小时内到期"]]
    : [[myApprovals.filter(a => a.wait > 12).length,"orange","等待超12小时"]])
    .filter(c => c[0] > 0).map(c => `<span class="ac-chip is-${c[1]}">${c[2]} ${c[0]}</span>`).join("");
  const queueHead = tabsHtml.length
    ? acTabs(tabsHtml,(isTasks && showTaskTab ? "tasks" : (showApTab ? "approvals" : tabsHtml[0].id)),"workbench")
    : `<h3>处理队列</h3>`;
  const sigRows = signals.length
    ? signals.map(s => `<button class="ac-sig-row is-${s.tone}" data-go="${s.go}"><i class="ac-sig-ico">${s.icon}</i><span class="ac-sig-body"><strong>${acEsc(s.title)}</strong><small>${acEsc(s.desc)}</small></span><span class="ac-sig-go">›</span></button>`).join("")
    : `<div class="ac-sig-ok">✓ 当前没有需要关注的异常</div>`;
  const quickTiles = quick.map(q => {
    const i = q.label.indexOf(" ");
    return `<button class="ac-quick-tile" data-go="${q.go}"><i>${q.label.slice(0,i)}</i><span>${acEsc(q.label.slice(i+1))}</span></button>`;
  }).join("");
  return `
  ${acPagehead("工作台",`${roleLabel}视角 · 统计范围：${AC_WB_RANGE_LABEL[AC_STATE.wbRange]} · 先看业务，再处理待办，最后排查异常`,rangePicker)}
  ${snapshot}
  <div class="ac-wb-grid">
    <section class="ac-wb-panel">
      <div class="ac-wb-panel-head">${queueHead}<div class="ac-wb-chips">${chips}</div></div>
      ${bodyHtml}
    </section>
    <aside class="ac-wb-side">
      <section class="ac-wb-panel">
        <div class="ac-wb-panel-head"><h3>异常信号<small>${signals.length}</small></h3></div>
        ${sigRows}
      </section>
      <section class="ac-wb-panel">
        <div class="ac-wb-panel-head"><h3>快捷入口</h3></div>
        ${quickTiles ? `<div class="ac-quick-grid">${quickTiles}</div>` : `<div class="ac-quick-none">当前角色无快捷入口</div>`}
      </section>
    </aside>
  </div>`;
}

/* ===== 页面：入驻审核 ===== */
function pgOnboarding(){
  const seg = AC_STATE.tab || "待审核";
  const rows = AC_DB.onboarding;
  const cols = [
    {key:"id",label:"申请编号",w:"92px"},{key:"name",label:"合作方名称"},{key:"type",label:"类型",w:"64px"},{key:"country",label:"国家",w:"84px"},
    {key:"time",label:"申请时间",w:"110px"},{label:"等待",w:"76px",render:r => `<span class="ac-sla ${r.wait>3?"is-warn":""}">${r.wait}时</span>`},
    {key:"docs",label:"材料完整度",w:"90px",render:r => `<span class="${r.docs!=="100%"?"ac-warn-text":"ac-ok-text"}">${r.docs}</span>`},
    {key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${acEsc(r.status)}</span>`},
    {label:"操作",w:"64px",actions:true,render:r => `<button class="ac-link" data-review="${r.id}">审核</button>`},
  ];
  const counts = ["待审核","补件中","已通过","已驳回"].map(s => ({label:s,v:s,n:AC_DB.onboarding.filter(r => r.status===s).length}));
  return `
  ${acPagehead("入驻审核","通过 / 驳回 / 要求补件 · 材料与CRM核验在审核抽屉完成")}
  ${acMetricBar([{num:AC_DB.onboarding.filter(r=>r.status==="待审核").length,label:"待审核"},{num:2,label:"今日新增"},{num:1,label:"补件中",tone:"warn"},{num:"67%",label:"近7日通过率"}])}
  ${acSeg([{label:"全部",v:"全部",n:AC_DB.onboarding.length},...counts],seg,"onb")}
  ${acTable(cols,rows,{empty:"该状态下暂无申请"})}`;
}

/* ===== 页面：合作方列表 ===== */
function pgPartners(){
  const cols = [
    {key:"id",label:"ID",w:"86px",sortable:true},{key:"name",label:"合作方",sortable:true},{key:"country",label:"国家",w:"80px",sortable:true},{key:"type",label:"类型",w:"60px"},
    {key:"status",label:"状态",w:"78px",sortable:true,render:r => `<span class="ac-badge ${acStat(r.status)}">${acEsc(r.status)}</span>`},
    {label:"信用",w:"64px",render:r => acGrade(r.grade)},
    {key:"total",label:"累计佣金",w:"100px",sortable:true,render:r => acMoney(r.total)},
    {key:"pending",label:"待结算",w:"88px",sortable:true,render:r => r.pending?acMoney(r.pending):`<span style="color:var(--subtle)">—</span>`},
    {key:"clients",label:"客户数",w:"68px",sortable:true},
    {label:"操作",w:"108px",actions:true,render:r => `<button class="ac-link" data-partner="${r.id}">详情</button>${(r.status==="合作中"||r.status==="观察中")?`<button class="ac-link danger" data-toast="清退流程（六步）在详情抽屉发起">清退</button>`:""}`},
  ];
  const f = AC_LIST.filters.partners || {};
  const {rows,total,pages} = acApplyList("partners",AC_DB.partners,(r,ff) => (!ff.q || [r.id,r.name].join(" ").toLowerCase().includes(ff.q)) && (!ff.status || ff.status === "全部状态" || r.status === ff.status) && (!ff.grade || ff.grade === "全部等级" || r.grade === ff.grade));
  return `
  ${acPagehead("合作方列表","信息枢纽：资料 · 推广（只读）· 合规 · 财务 · 业绩 · 备注")}
  ${acMetricBar([{num:AC_DB.partners.filter(p=>p.status==="合作中").length,label:"合作中"},{num:AC_DB.partners.filter(p=>p.status==="观察中").length,label:"观察中",tone:"warn"},{num:AC_DB.partners.filter(p=>p.grade==="C0").length,label:"C0阻断",tone:"danger",go:"statements"},{num:AC_DB.partners.filter(p=>p.status==="清退中").length,label:"清退中",tone:"warn"},{num:2,label:"本月新增"}])}
  <div class="ac-filter">${acSearch("partners","搜索 ID / 名称，回车")}
  ${(()=>{const k = "f.partners.status";acDDReg(k,["全部状态","合作中","观察中","清退中","已归档"].map(o => ({v:o,label:o})),() => (AC_LIST.filters.partners||{}).status || "全部状态",v => {AC_LIST.filters.partners = {...(AC_LIST.filters.partners||{}),status:v};AC_LIST.page = 1;acRender();});return `<div class="ac-field"><label>状态</label>${acDD(k,(AC_LIST.filters.partners||{}).status||"全部状态",{sm:true})}</div>`;})()}
  ${(()=>{const k = "f.partners.grade";acDDReg(k,["全部等级","C0","C1","C2","C3","C4"].map(o => ({v:o,label:o})),() => (AC_LIST.filters.partners||{}).grade || "全部等级",v => {AC_LIST.filters.partners = {...(AC_LIST.filters.partners||{}),grade:v};AC_LIST.page = 1;acRender();});return `<div class="ac-field"><label>信用</label>${acDD(k,(AC_LIST.filters.partners||{}).grade||"全部等级",{sm:true})}</div>`;})()}
  <div class="ac-filter-actions"><button class="ac-btn ghost sm" data-filter-reset="partners">重置</button></div></div>
  ${acTableX("partners",cols,rows,{total,pages})}`;
}

/* ===== 抽屉 ===== */
function drawerPartner(id){
  const p = AC_DB.partners.find(x => x.id===id);if (!p) return;
  const t = [
    {id:"ov",label:"概览",html:acKV([["合作方ID",p.id],["状态",`<span class="ac-badge ${acStat(p.status)}">${p.status}</span>`],["国家",p.country],["类型",p.type],["信用等级",acGrade(p.grade)],["责任运营","wang_ops"],["累计佣金",acMoney(p.total)],["待结算",p.pending?acMoney(p.pending):"—"]]) + acTimeline([{time:"10-12 14:02",title:"审核通过，正式入驻",state:"is-done"},{time:"10-20 09:30",title:"进入观察期（流量质量复核）",state:"is-done"},{time:"11-02 16:44",title:"信用调级 C3 → C2",desc:"触发条件：拒付率超阈值",state:"is-done"}])},
    {id:"promo",label:"推广（只读）",html:`<p class="ac-tab-note">活动 · 链接 · Sub ID 均为合作者自助，管理端只读</p>` + acMiniTable(["活动","类型","时间","状态"],[["11月IDAQ","注册+FTD","11-01~11-30","进行中"],["10月新客","FTD","10-01~10-31","已结束"]]) + acMiniTable(["链接","生成时间","状态","累计点击"],[["L-2001 · max-trade.com/c/af1023","10-12","生效","12,480"],["L-2014 · max-trade.com/c/af1023mx","10-15","生效","3,210"]]) + acMiniTable(["Sub ID","创建时间","点击"],[["siteresia","10-13","8,412"],["mx_tik","10-16","3,210"]])},
    {id:"comp",label:"合规",html:acKV([["KYC/KYB","<span class='ac-badge is-green'>已通过（CRM）</span>"],["最后同步","11-06 08:40"],["协议","已签署 v3（10-12）"]]) + acBanner("warn","检测到1条资料同步异常：收款账户名称与CRM不一致。","查看集成任务","integrations")},
    {id:"fin",label:"财务",html:acKV([["收款账户","MER •••• 4821（Skrill）"],["税务资料","W-8BEN · 已存档"],["信用权益",acGrade(p.grade)+(p.grade==="C0"?" <span class='ac-badge is-red'>结算阻断</span>":"")]]) + acMiniTable(["变更时间","字段","旧值 → 新值","状态"],[["11-04","收款账户","••2201 → ••4821","<span class='ac-badge is-green'>已生效</span>"],["10-28","税务资料","新增W-8BEN","<span class='ac-badge is-green'>已生效</span>"]]) + (p.grade==="C0"?acBanner("danger","信用等级C0：结算批次自动阻断，等级回升或人工调级后恢复。","查看佣金","commissions"):"")},
    {id:"perf",label:"业绩",html:acMiniTable(["月份","点击","FTD","有效FTD","佣金"],[["2026-11","12,480","186","94",acMoney(9620)],["2026-10","38,210","520","301",acMoney(28400)],["2026-09","31,040","412","238",acMoney(21900)]])},
    {id:"notes",label:"跟进备注",html:acTimeline([{time:"11-05 10:20",title:"运营 wang_ops",desc:"沟通流量来源变化，对方说明新增TG渠道",state:"is-done"},{time:"10-28 15:02",title:"运营 wang_ops",desc:"月度例行回访完成",state:"is-done"}]) + `<div style="height:10px"></div><button class="ac-btn secondary sm" data-toast="添加备注（表单）">+ 添加备注</button>`},
  ];
  acDrawer({title:acEsc(p.name),sub:`${p.id} · ${p.country} · ${p.type}`,badge:`<span class="ac-badge ${acStat(p.status)}">${p.status}</span>`,tabs:t,wide:true,
    foot:`${(p.status==="合作中"||p.status==="观察中")?`<button class="ac-btn danger" data-toast="清退流程：发起→链接失效→待办检查→最终结算→保证金→归档">发起清退</button>`:""}<button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function drawerReview(id){
  const o = AC_DB.onboarding.find(x => x.id===id);if (!o) return;
  acDrawer({title:acEsc(o.name),sub:`${o.id} · ${o.type} · ${o.country}`,badge:`<span class="ac-badge ${acStat(o.status)}">${o.status}</span>`,
    tabs:[
      {id:"app",label:"申请资料",html:acKV([["申请编号",o.id],["类型",o.type],["国家",o.country],["申请时间",o.time],["预估月流量","8,000~12,000 点击"],["推广渠道","网站 + 社群"],["合作计划","CPA（L1起步）"]])},
      {id:"docs",label:"材料",html:acMiniTable(["材料","状态","操作"],[["公司注册证书","<span class='ac-badge is-green'>已提交</span>","<button class='ac-link' data-toast='查看大图'>查看</button>"],["法人证件","<span class='ac-badge is-green'>已提交</span>","<button class='ac-link' data-toast='查看大图'>查看</button>"],["流量证明","<span class='ac-badge is-orange'>缺失</span>","<button class='ac-link' data-toast='已发送补件要求'>要求补件</button>"]])},
      {id:"crm",label:"CRM核验",html:acKV([["CRM账户","未匹配（新申请）"],["KYC/KYB","待入驻后由CRM执行"],["集团判重","<span class='ac-badge is-green'>无关联账户</span>"],["同步状态","待入驻同步"]])},
    ],
    foot:`<button class="ac-btn secondary" data-toast="已驳回并通知申请人">驳回</button><button class="ac-btn secondary" data-toast="已发送补件要求（截止7天）">要求补件</button><button class="ac-btn primary" data-toast="已通过：生成合作方+自动发链接+欢迎通知">通过</button>`});
}
function drawerComm(id){
  const c = AC_DB.commissions.find(x => x.id===id);if (!c) return;
  acDrawer({title:`${c.id} · ${acMoney(c.amount)}`,sub:`${c.partner} · 客户 ${c.client}`,badge:`<span class="ac-badge ${acStat(c.status)}">${c.status}</span>`,
    tabs:[
      {id:"calc",label:"计算过程",html:acTimeline([
        {time:"11-06 09:12:04",title:"FTD事件确认（CRM）",desc:`客户 ${c.client} 首入金`,state:"is-done"},
        {time:"11-06 09:12:05",title:"资格档判定 L2 · 有效FTD",desc:"净入金 ≥ $250 · 留存达标",state:"is-done"},
        {time:"11-06 09:12:07",title:"适用价格 v13 · 基础$80",desc:"锁定版本快照（生成时生效版本，不随后续变更回写）",state:"is-done"},
        {time:"11-06 09:12:07",title:"加成构成 +$16",desc:"C2信用加成 20%",state:"is-done"},
        {time:"11-06 09:12:07",title:`计佣完成 ${acMoney(c.amount)}`,desc:"进入结算期",state:"is-done"},
      ])},
      {id:"hold",label:"结算构成",html:acKV([["基础结算期","D+14（到期 11-20）"],["风险附加","0"],["集群延长","0"],["当前状态",c.block==="无"?"<span class='ac-badge is-green'>正常流转</span>":`<span class='ac-badge is-orange'>${c.block}</span>`]])},
    ],foot:`<button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function drawerStatement(id){
  const s = AC_DB.statements.find(x => x.id===id);if (!s) return;
  const rows = AC_DB.stmtDetail.map(d => [d.c0?`<span style="opacity:.55">${d.id}</span>`:d.id,d.c0?`<span style="opacity:.55">${d.name}</span>`:d.name,acMoney(d.comm),acMoney(d.deduct),d.c0?`<span class="ac-badge is-red">C0阻断</span>`:acMoney(d.net)]);
  acDrawer({title:s.id,sub:`${s.cycle} · ${s.partners}家合作方`,badge:`<span class="ac-badge ${acStat(s.status)}">${s.status}</span>`,wide:true,
    tabs:[
      {id:"detail",label:"明细",html:acMiniTable(["合作方","名称","佣金","扣减","净额"],rows)},
      {id:"ap",label:"审批记录",html:acTimeline([{time:"11-06 09:12",title:"系统自动送审",state:"is-done"},{time:"—",title:"财务审批（统一审批队列）",desc:"职责分离：申请人≠审批人"}])},
      {id:"dl",label:"下载",html:acMiniTable(["文件","生成时间","操作"],[["STM-2026-11-A.pdf","11-06 09:12","<button class='ac-link' data-toast='下载（写审计）'>下载</button>"]])},
    ],foot:`<button class="ac-btn secondary" data-toast="下载结算单（写审计）">下载</button><button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function drawerSettlementBatch(id){
  const b = AC_SETTLEMENT_BATCHES.find(x => x.id === id); if (!b) return;
  const cases = AC_SETTLEMENT_CASES.filter(x => x.batchId === id);
  const blockRows = cases.filter(x => x.reasons.length).map(x => [x.id, x.customer, csReasonBadges(x.reasons), csMoney(x.amount), `<button class="ac-link" data-cs-case="${x.id}">查看案件</button>`]);
  const timeline = [
    {time:b.created,title:"创建批次",desc:`${b.operator} · ${b.period}`,state:"is-done"},
    {time:"生成检查",title:b.blocked ? `发现 ${b.blocked} 笔阻断案件` : "结算前检查通过",desc:b.blocked ? "阻断案件保留在批次上下文中，其他案件可继续结算。" : "当前批次没有阻断案件。",state:b.blocked ? "is-block" : "is-done"},
    {time:b.approvalStatus === "pending_review" ? "等待处理" : "已记录",title:b.approvalStatus === "pending_review" ? "自动送统一审批队列" : CS_STATUS_LABEL[b.approvalStatus],desc:"申请人不能审批自己发起的结算批次。",state:b.approvalStatus === "rejected" ? "is-block" : b.approvalStatus === "pending_review" ? "is-miss" : "is-done"},
  ];
  acDrawer({title:b.id,sub:`${b.period} · ${b.entity} · ${b.currency}`,badge:`<div class="cs-drawer-status">${csBadge(b.batchStatus)}${csBadge(b.approvalStatus)}</div>`,wide:true,tabs:[
    {id:"summary",label:"批次摘要",html:`${acKV([["结算单号",b.statementId],["经营主体",b.entity],["结算周期",b.period],["合作方数",b.partners],["佣金案件数",b.cases],["佣金总额",csMoney(b.gross)],["扣减项",csMoney(b.deduct)],["可结算净额",csMoney(b.net)],["阻断案件",b.blocked?`${b.blocked} 笔 · ${csMoney(b.blockedAmount)}`:"无阻断"],["配置版本",b.config],["数据截至",AC_SETTLEMENT_STATE.dataAsOf]])}<div class="cs-drawer-callout ${b.blocked?"is-warn":""}">${b.blocked ? "当前批次包含逐案件阻断。阻断案件不计入可结算净额，其他通过检查的案件仍可进入结算流程。" : "当前批次没有结算阻断，可按审批结果进入后续资金流程。"}</div>`},
    {id:"blocks",label:`阻断明细${b.blocked ? ` (${b.blocked})` : ""}`,html:b.blocked ? acMiniTable(["佣金案件号","客户","阻断原因","影响金额","操作"],blockRows) : acEmpty("当前批次无阻断案件")},
    {id:"timeline",label:"生成与审批记录",html:acTimeline(timeline)},
    {id:"cases",label:"案件引用",html:acMiniTable(["佣金案件号","合作方","计佣状态","结算状态","金额"],cases.slice(0,10).map(x => [x.id,`${x.partner} · ${x.partnerName}`,csBadge(x.commissionStatus),csBadge(x.settlementStatus),csMoney(x.amount)]))},
  ],foot:`${b.batchStatus==="rejected"?`<button class="ac-btn primary" data-cs-regenerate="${b.id}">重生成</button>`:""}${b.approvalStatus==="pending_review"?`<button class="ac-btn secondary" data-cs-approval="${b.id}">进入审批队列</button>`:""}${b.statementId!=="—"?`<button class="ac-btn secondary" data-cs-download="${b.statementId}">下载结算单</button>`:""}${b.blocked?`<button class="ac-btn secondary" data-cs-processing="${b.id}">查看处理中心</button>`:""}<button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function drawerSettlementCase(id){
  const c = AC_SETTLEMENT_CASES.find(x => x.id === id); if (!c) return;
  const blockRows = c.reasons.length ? c.reasons.map(reason => [CS_REASON_LABEL[reason] || reason, c.settlementStatus === "frozen" ? "当前生效" : "记录中", c.due, c.version, `<button class="ac-link" data-cs-processing="${c.id}">去处理中心</button>`]) : [["无阻断","—","—",c.version,"—"]];
  acDrawer({title:`${c.id} · ${csMoney(c.amount)}`,sub:`${c.partner} · ${c.customer} · ${c.email}`,badge:`<div class="cs-drawer-status">${csBadge(c.commissionStatus)}${csBadge(c.settlementStatus)}</div>`,wide:true,tabs:[
    {id:"case",label:"案件摘要",html:`${acKV([["佣金案件号",c.id],["结算案件号",c.settlementId],["客户编号",c.customer],["客户邮箱",c.email],["合作方",`${c.partner} · ${c.partnerName}`],["资格/里程碑",c.tier],["佣金构成",c.components],["佣金金额",csMoney(c.amount)],["风险档",c.risk],["所属批次",c.batchId],["版本快照",c.version],["TraceId",c.trace]])}<div class="cs-drawer-callout ${c.reasons.length?"is-warn":""}">${c.reasons.length ? "当前案件存在结算阻断；不代表同客户其他案件、同合作方其他客户或整批次冻结。" : "当前案件没有结算阻断，可按批次审批结果继续流转。"}</div>`},
    {id:"blocks",label:`阻断链${c.reasons.length?` (${c.reasons.length})`:""}`,html:acMiniTable(["阻断类型","状态","结算到期","配置版本","处理入口"],blockRows)},
    {id:"timeline",label:"状态时间线",html:acTimeline([{time:"2026-11-08 09:12",title:"CRM事件确认",desc:"客户事实已从CRM同步。",state:"is-done"},{time:"2026-11-08 09:13",title:`佣金计算 ${CS_STATUS_LABEL[c.commissionStatus] || c.commissionStatus}`,desc:c.components,state:c.commissionStatus === "recalculating" ? "is-miss" : "is-done"},{time:"2026-11-09 09:12",title:`结算状态 ${CS_STATUS_LABEL[c.settlementStatus] || c.settlementStatus}`,desc:c.reasons.length ? c.reasons.map(r => CS_REASON_LABEL[r]).join("、") : "结算前检查通过",state:c.reasons.length ? "is-block" : "is-done"}])},
  ],foot:`<button class="ac-btn secondary" data-cs-customer="${c.customer}">客户360</button><button class="ac-btn secondary" data-cs-partner="${c.partner}">合作方详情</button>${c.reasons.length?`<button class="ac-btn primary" data-cs-processing="${c.id}">处理中心</button>`:""}<button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function csPreviewData(form){
  const cases = AC_SETTLEMENT_CASES.filter(x => form.period === "current" ? x.periodKey === "current" : x.period === "previous" ? x.periodKey === "previous" : true);
  const scoped = form.entity === "Affiliate Singapore Pte." ? cases.filter(x => x.partner === "AF-1105") : cases;
  const blocked = scoped.filter(x => x.reasons.length || x.settlementStatus === "frozen");
  return {cases:scoped.length,partners:new Set(scoped.map(x => x.partner)).size,gross:scoped.reduce((s,x) => s+x.amount,0),deduct:Math.round(scoped.reduce((s,x) => s+x.amount,0)*0.1),blocked:blocked.length,blockedAmount:blocked.reduce((s,x) => s+x.amount,0),net:scoped.filter(x => !x.reasons.length && x.settlementStatus !== "frozen").reduce((s,x) => s+x.amount,0)*0.9};
}
function csGeneratorModal(){
  const g = AC_SETTLEMENT_STATE.generator;
  if (g.step === 1) {
    const source = g.sourceBatchId ? AC_SETTLEMENT_BATCHES.find(x => x.id === g.sourceBatchId) : null;
    const regenerate = source ? `<div class="cs-regenerate-context"><strong>驳回批次：${source.id}</strong><span>驳回原因：${acEsc(source.rejectReason || "审批节点退回，需修正后重新生成")}</span></div>` : "";
    const correction = source ? `<label class="ac-form-item cs-correction-field"><span>修正说明 <em>*</em></span><textarea data-cs-gen="correctionNote" minlength="10" placeholder="请说明本次修正、影响范围和重新检查结果"></textarea></label>` : "";
    acModal({title:source?"驳回后重生成结算批次":"生成结算批次",size:"wide",body:`<div class="cs-wizard"><div class="cs-wizard-steps"><span class="is-active">1 选择范围</span><span>2 预览检查</span><span>3 生成送审</span></div>${regenerate}<div class="cs-wizard-grid"><label class="ac-form-item"><span>结算周期</span><select data-cs-gen="period"><option value="current">当前可处理周期 · 2026-11-01 ~ 2026-11-08</option><option value="previous">历史周期 · 2026-10-24 ~ 2026-10-31</option></select></label><label class="ac-form-item"><span>经营主体</span><select data-cs-gen="entity"><option>Affiliate US LLC</option><option>Affiliate Singapore Pte.</option></select></label><label class="ac-form-item"><span>币种</span><select disabled><option>USD</option></select></label><label class="ac-form-item"><span>结算配置版本</span><select disabled><option>当前生效 · SET-v6</option></select></label>${correction}</div><div class="cs-wizard-note">生成前会执行结算前检查。阻断案件会保留在批次中并按案件隔离，不会冻结其他可结算案件。</div></div>`,foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-cs-gen-action="preview">预览并检查</button>`});
    return;
  }
  if (g.step === 2) {
    const p = g.preview;
    acModal({title:"生成结算批次 · 预览检查",size:"wide",body:`<div class="cs-wizard"><div class="cs-wizard-steps"><span class="is-done">1 选择范围</span><span class="is-active">2 预览检查</span><span>3 生成送审</span></div><div class="cs-preview-grid">${[["合作方数",p.partners],["佣金案件数",p.cases],["佣金总额",csMoney(p.gross)],["扣减项",csMoney(p.deduct)],["阻断案件",`${p.blocked} 笔`],["阻断金额",csMoney(p.blockedAmount)],["可结算净额",csMoney(p.net)],["结算配置","SET-v6"]].map(x => `<div><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("")}</div><div class="cs-wizard-note ${p.blocked?"is-warn":""}">${p.blocked ? `检测到 ${p.blocked} 笔案件阻断。确认后将生成批次，并自动送统一审批队列。` : "结算前检查通过。确认后将生成批次，并自动送统一审批队列。"}</div></div>`,foot:`<button class="ac-btn secondary" data-cs-gen-action="back">返回修改</button><button class="ac-btn primary" data-cs-gen-action="submit">确认生成并送审</button>`});
    return;
  }
  const b = g.created;
  acModal({title:"结算批次已生成",body:`<div class="cs-success"><div class="cs-success-icon">✓</div><h3>${b.id}</h3><p>批次已创建并自动送统一审批队列。申请人不能在本页审批自己发起的批次。</p>${acKV([["结算单号",b.statementId],["批次状态",csBadge("pending_review")],["审批状态",csBadge("pending_review")],["TraceId",b.trace]])}</div>`,foot:`<button class="ac-btn secondary" data-mclose>关闭</button><button class="ac-btn primary" data-cs-batch="${b.id}">查看批次</button>`});
}
function csOpenGenerator(sourceBatchId = null){
  AC_SETTLEMENT_STATE.generator = {step:1,form:null,preview:null,created:null,sourceBatchId};
  csGeneratorModal();
}
function csSubmitGeneration(){
  const p = AC_SETTLEMENT_STATE.generator.preview, form = AC_SETTLEMENT_STATE.generator.form;
  if (AC_SETTLEMENT_STATE.generator.sourceBatchId && String(form.correctionNote || "").trim().length < 10) { acToast("请填写至少10字的修正说明", "error"); return; }
  const seq = String(AC_SETTLEMENT_BATCHES.length + 1).padStart(3,"0");
  const b = {id:`SB-20261109-${seq}`,statementId:`ST-20261109-${seq}`,period:form.period === "current" ? "2026-11-01 ~ 2026-11-08" : "2026-10-24 ~ 2026-10-31",periodKey:form.period,entity:form.entity,currency:"USD",partners:p.partners,cases:p.cases,gross:p.gross,deduct:p.deduct,net:p.net,blocked:p.blocked,blockedAmount:p.blockedAmount,batchStatus:"pending_review",approvalStatus:"pending_review",created:"2026-11-09 09:42",config:"CPA-v14 · SET-v6",operator:"finance_li",trace:"tr-gen-20261109-"+seq,regeneratedFrom:AC_SETTLEMENT_STATE.generator.sourceBatchId || null,correctionNote:form.correctionNote || ""};
  AC_SETTLEMENT_BATCHES.unshift(b);
  AC_SETTLEMENT_STATE.generator = {...AC_SETTLEMENT_STATE.generator,step:3,created:b};
  csGeneratorModal();
  acRender();
  acToast(`已生成 ${b.id}，并自动送统一审批队列`);
}
function drawerTrace(tid){
  const evs = AC_DB.events.filter(e => e.tid===tid);
  acDrawer({title:`事件链 ${tid}`,sub:`${evs.length} 个节点 · 点击→计佣全链路`,
    tabs:[{id:"chain",label:"链路",html:acTimeline(evs.map(e => ({time:e.time,title:`${e.type} · ${e.src}`,desc:e.obj,state:e.status==="正常"?"is-done":"is-miss"})))}],
    foot:`<button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function drawerPath(row){
  acDrawer({title:"转化路径",sub:`${row.partner} · ${row.link} · ${row.sub||"无SubID"}`,
    tabs:[{id:"path",label:"路径",html:acTimeline([
      {time:row.time,title:"点击",desc:`${row.dev} · ${row.geo}`,state:"is-done"},
      ...(row.stage!=="未转化"?[{time:"+7分",title:"注册",state:"is-done"}]:[{time:"已等待 2小时",title:"注册",desc:"未到达",state:"is-miss"}]),
      ...((row.stage==="已FTD"||row.stage==="已计佣")?[{time:"+19时",title:"FTD",desc:"$200",state:"is-done"}]:[]),
      ...(row.stage==="已计佣"?[{time:"+0秒",title:"计佣",desc:"进入结算",state:"is-done"}]:[]),
    ])}],foot:`<button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function drawerTicket(id){
  const t = AC_DB.tickets.find(x => x.id===id);if (!t) return;
  acDrawer({title:`${t.id} · ${t.subject}`,sub:`${t.partner} · ${t.type}`,badge:`<span class="ac-badge ${acStat(t.status)}">${t.status}</span>`,
    tabs:[{id:"chat",label:"对话",html:`<div class="ac-chat">
      <div class="ac-bubble in"><small>${acEsc(t.partner)} · 11-05 10:02</small><p>我的客户C-88479已经FTD了，但佣金里没有看到记录，请核查。</p></div>
      <div class="ac-bubble out"><small>运营 · 11-05 10:31</small><p>收到，正在通过事件流水核查归属链路，预计2小时内答复。</p></div>
    </div><div class="ac-chat-input"><input type="text" placeholder="答复内容…"><button class="ac-btn primary sm" data-toast="已答复（写审计）">发送</button></div>`}],
    foot:`<button class="ac-btn secondary" data-toast="转风险复核（生成任务）">转风险复核</button><button class="ac-btn secondary" data-toast="转申诉流程">转申诉</button><button class="ac-btn primary" data-toast="已关闭（必填原因）">关闭工单</button>`});
}
function drawerRisk(r){
  acDrawer({title:`风险档案 · ${r.obj}`,sub:`${r.type} · 命中来源：${r.src}`,badge:`<span class="ac-grade" data-g="r${String(5-Number(r.grade.slice(1)))}">${r.grade}</span>`,
    tabs:[
      {id:"rules",label:"规则命中",html:acMiniTable(["时间","规则","证据"],[["11-05 21:40","D2官方路径库","短链跳转异常"],["11-05 21:42","D3点击风险","同IP高频点击"]])},
      {id:"score",label:"评分卡",html:acKV([["当前分","72 / 100"],["风险档",`<span class="ac-grade" data-g="r${String(5-Number(r.grade.slice(1)))}">${r.grade}</span>`],["事件构成","拒付+30 · 多账号+25 · 设备关联+17"]])},
      {id:"cluster",label:"集群归属",html:r.obj==="CL-118"?acMiniTable(["成员","类型","共享特征"],[["C-88354","客户","支付工具••4491"],["AF-0921","合作方","注册IP段41.203"],["C-88004","客户","设备d9f3"]]):acKV([["所属集群","CL-118"],["关系","共享支付工具"],["影响佣金",acMoney(r.amt)]])},
      {id:"crm",label:"CRM欺诈引用",html:acKV([["CRM结论","欺诈关联（中）"],["同步时间","11-05 08:00"]]) + `<p class="ac-tab-note">只读引用CRM事实，本系统不做二次判定</p>`},
    ],
    foot:`<button class="ac-btn secondary" data-toast="加入黑名单→生成复核任务（不直接拉黑）">加入黑名单</button><button class="ac-btn primary" data-toast="已生成风险复核任务">生成复核任务</button>`});
}
function drawerPB(id){
  const p = AC_DB.postback.find(x => x.id===id);if (!p) return;
  acDrawer({title:`回传投递 · ${p.id}`,sub:p.url,
    tabs:[
      {id:"dl",label:"投递记录",html:acMiniTable(["时间","事件","HTTP状态","耗时","结果"],[["11-06 09:12","FTD","200","340ms","<span class='ac-badge is-green'>成功</span>"],["11-06 08:55","FTD","500","—","<span class='ac-badge is-red'>失败</span>"],["11-06 08:40","注册","200","290ms","<span class='ac-badge is-green'>成功</span>"]])},
      {id:"rt",label:"重试记录",html:acMiniTable(["时间","次数","结果","下次重试"],[["11-06 09:00","3/5","失败","+15分"]])},
    ],foot:`<button class="ac-btn secondary" data-drawer-close>关闭</button>`});
}
function drawerWD(id){
  const w = AC_DB.withdrawals.find(x => x.id===id);if (!w) return;
  acDrawer({title:`${w.id} · ${acMoney(w.amt)}`,sub:`${w.partner} · ${w.acct}`,badge:`<span class="ac-badge ${acStat(w.status)}">${w.status}</span>`,
    tabs:[{id:"chk",label:"收款核验",html:acKV([["收款账户",w.acct],["最近变更","11-04（••2201 → ••4821）"],["风险状态","<span class='ac-badge is-green'>无隔离</span>"],["信用等级",w.partner==="AF-0921"?"<span class='ac-badge is-red'>C0 · 提现已阻断</span>":"<span class='ac-badge is-green'>正常</span>"],["余额校验","<span class='ac-badge is-green'>充足</span>"]])}],
    foot:`<button class="ac-btn secondary" data-toast="已驳回（必填原因，通知合作方）">驳回</button><button class="ac-btn primary" data-toast="已通过→支付状态跟踪">通过</button>`});
}

/* ===== 客户/归属/事件/推广 ===== */
function pgClients(){
  const cols = [
    {key:"id",label:"客户ID",w:"96px",sortable:true},{key:"country",label:"国家",w:"76px",sortable:true},{key:"reg",label:"注册时间",w:"100px",sortable:true},
    {key:"life",label:"生命周期",w:"86px",sortable:true,render:r => `<span class="ac-badge ${r.life==="有效FTD"?"is-green":r.life==="FTD"?"is-blue":"is-gray"}">${r.life}</span>`},
    {key:"ftd",label:"FTD金额",w:"88px",sortable:true,render:r => r.ftd?acMoney(r.ftd):"—"},
    {key:"partner",label:"所属合作方",w:"100px",sortable:true,render:r => `<button class="ac-link" data-partner="${r.partner}">${r.partner}</button>`},
    {key:"sub",label:"Sub ID",w:"88px"},
    {label:"风险",w:"60px",render:r => r.risk==="高"?`<span class="ac-grade" data-g="r4">高</span>`:r.risk==="中"?`<span class="ac-grade" data-g="r2">中</span>`:`<span style="color:var(--subtle)">${r.risk}</span>`},
    {label:"操作",w:"76px",actions:true,render:r => `<button class="ac-link" data-customer360="${r.id}">客户360</button>`},
  ];
  const {rows,total,pages} = acApplyList("clients",AC_DB.clients,(r,f) => (!f.q || [r.id,r.partner,r.sub].join(" ").toLowerCase().includes(f.q)) && (!f.life || f.life === "全部" || r.life === f.life) && (!f.risk || f.risk === "全部" || r.risk === f.risk));
  return `${acPagehead("客户列表","只读 · 服务归属争议与风控排查 · 资料事实源在CRM")}
  <div class="ac-filter">${acSearch("clients","搜索 客户ID / 合作方 / SubID")}
  ${(()=>{const k = "f.cli.life";const opts = ["全部","注册","FTD","有效FTD","流失"];acDDReg(k,opts.map(o => ({v:o,label:o})),() => (AC_LIST.filters.clients||{}).life || "全部",v => {AC_LIST.filters.clients = {...(AC_LIST.filters.clients||{}),life:v};AC_LIST.page = 1;acRender();});return `<div class="ac-field"><label>生命周期</label>${acDD(k,(AC_LIST.filters.clients||{}).life||"全部",{sm:true})}</div>`;})()}
  ${(()=>{const k = "f.cli.risk";const opts = ["全部","无","低","中","高"];acDDReg(k,opts.map(o => ({v:o,label:o})),() => (AC_LIST.filters.clients||{}).risk || "全部",v => {AC_LIST.filters.clients = {...(AC_LIST.filters.clients||{}),risk:v};AC_LIST.page = 1;acRender();});return `<div class="ac-field"><label>风险</label>${acDD(k,(AC_LIST.filters.clients||{}).risk||"全部",{sm:true})}</div>`;})()}
  <div class="ac-filter-actions"><button class="ac-btn ghost sm" data-filter-reset="clients">重置</button></div></div>
  ${acTableX("clients",cols,rows,{total,pages})}`;
}

const AC_ATTR_VIEW_META = {
  pending:{label:"待处理异常",empty:"暂无待处理归属案件"},
  all:{label:"全部归属",empty:"暂无归属记录"},
  processing:{label:"处理中",empty:"暂无处理中案件"},
  resolved:{label:"已解决",empty:"暂无已解决案件"},
  noattr:{label:"无需归属",empty:"暂无无需归属记录"}
};
const AC_ATTR_TYPE_OPTIONS = [["","全部异常类型"],["attribution_conflict","归属冲突"],["duplicate_attribution","重复候选"],["ib_isolation","IB隔离异常"],["missing_data","数据缺数"],["rule_gap","无来源/规则缺失"],["correction","归属更正"]];
const AC_ATTR_STATUS_OPTIONS = [["","全部归属状态"],["pending","待处理"],["locked","已锁定"],["conflict","冲突"],["unattributed","无归属"],["excluded_ib","已排除IB"]];
const AC_ATTR_ROLE = () => AC_STATE.role;
const AC_ATTR_CAN_WRITE = () => ["operations","risk_reviewer","risk_supervisor","compliance","admin"].includes(AC_ATTR_ROLE());
const AC_ATTR_CAN_APPROVE = () => ["risk_supervisor","compliance","admin"].includes(AC_ATTR_ROLE());
const AC_ATTR_CAN_EXPORT = () => AC_ATTR_ROLE() !== "readonly";
const AC_ATTR_CAN_SENSITIVE = () => ["risk_reviewer","risk_supervisor","compliance","admin"].includes(AC_ATTR_ROLE());
const acAttrStatusClass = status => ({pending:"is-blue",in_review:"is-blue",pending_approval:"is-orange",approved:"is-green",applying:"is-blue",applied:"is-green",rejected:"is-red",apply_failed:"is-red",blocked_sync:"is-orange",closed:"is-gray"}[status] || acStat(status));
const acAttrStatusLabel = status => ({pending:"待处理",in_review:"处理中",pending_approval:"待审批",approved:"已批准",applying:"应用中",applied:"已应用",rejected:"已驳回",apply_failed:"应用失败",blocked_sync:"数据待同步",closed:"已关闭"}[status] || status);
const acAttrTypeClass = type => ({attribution_conflict:"is-red",duplicate_attribution:"is-orange",ib_isolation:"is-red",missing_data:"is-orange",rule_gap:"is-blue",correction:"is-orange"}[type] || "is-gray");
const acAttrViewRows = view => {
  if (view === "all") return AC_ATTR_DATA;
  if (view === "processing") return AC_ATTR_DATA.filter(r => ["in_review","pending_approval","approved","applying","apply_failed","blocked_sync"].includes(r.status));
  if (view === "resolved") return AC_ATTR_DATA.filter(r => ["applied","rejected","closed"].includes(r.status));
  if (view === "noattr") return AC_ATTR_DATA.filter(r => r.attributionStatus === "unattributed" || r.attributionStatus === "excluded_ib");
  return AC_ATTR_DATA.filter(r => ["pending","blocked_sync"].includes(r.status) && r.rowType === "case");
};
function acAttrFilterRows(rows,filters){
  const q = String(filters.q || "").trim().toLowerCase();
  return rows.filter(r => {
    const hay = [r.id,r.caseId,r.attributionId,r.customerId,r.email,r.traceId,r.currentAffiliate?.id,r.currentAffiliate?.name].filter(Boolean).join(" ").toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (filters.type && r.type !== filters.type) return false;
    if (filters.status && r.attributionStatus !== filters.status) return false;
    if (filters.partner && ![r.currentAffiliate?.id,r.currentAffiliate?.name].filter(Boolean).join(" ").toLowerCase().includes(filters.partner.toLowerCase())) return false;
    if (filters.ib && r.ibStatus !== filters.ib) return false;
    if (filters.sla === "over" && r.slaTone !== "over") return false;
    if (filters.sla === "warn" && !["warn","over"].includes(r.slaTone)) return false;
    if (filters.sla === "normal" && r.slaTone !== "normal") return false;
    if (filters.dataState === "pending" && r.dataState !== "pending") return false;
    if (filters.new === "yes" && !["ATTR-CASE-20261109-001","ATTR-CASE-20261109-002"].includes(r.id)) return false;
    if (filters.ruleVersion && r.ruleVersion !== filters.ruleVersion.trim()) return false;
    if (filters.traceId && r.traceId !== filters.traceId.trim()) return false;
    return true;
  });
}
function acAttrMetrics(){
  const unresolved = AC_ATTR_DATA.filter(r => r.rowType === "case" && !["applied","rejected","closed"].includes(r.status));
  return [
    {key:"pending",label:"待处理异常",value:unresolved.filter(r => ["pending","blocked_sync"].includes(r.status)).length,view:"pending"},
    {key:"overdue",label:"超SLA",value:unresolved.filter(r => r.slaTone === "over").length,filter:"overdue"},
    {key:"conflict",label:"归属冲突",value:unresolved.filter(r => ["attribution_conflict","duplicate_attribution"].includes(r.type)).length,filter:"conflict"},
    {key:"ib",label:"IB隔离异常",value:unresolved.filter(r => r.type === "ib_isolation").length,filter:"ib"},
    {key:"sync",label:"数据待同步",value:unresolved.filter(r => r.dataState === "pending" || r.status === "blocked_sync").length,filter:"sync"},
    {key:"new",label:"近24小时新增",value:AC_ATTR_DATA.filter(r => ["ATTR-CASE-20261109-001","ATTR-CASE-20261109-002"].includes(r.id)).length,filter:"new"}
  ];
}
function acAttrFilterValue(key){return AC_ATTR_STATE.filters[key] || "";}
function acAttrSelect(key,options){
  return `<select class="ac-attr-select" data-attr-filter="${key}">${options.map(([value,label]) => `<option value="${acEsc(value)}" ${acAttrFilterValue(key)===value?"selected":""}>${acEsc(label)}</option>`).join("")}</select>`;
}
function acAttrCustomer(r){
  return `<div class="ac-attr-cell-main"><button class="ac-link ac-attr-id" data-attr-open="${acEsc(r.id)}">${acEsc(r.customerId)}</button><span>${acEsc(r.email || "客户资料缺失")}</span></div>`;
}
function acAttrAffiliate(a){
  return a ? `<div class="ac-attr-cell-main"><strong>${acEsc(a.id)}</strong><span>${acEsc(a.name)}</span></div>` : `<span class="ac-muted-value">无归属</span>`;
}
function acAttrCandidates(r){
  if (!r.candidates?.length) return `<span class="ac-muted-value">无候选</span>`;
  const first = r.candidates[0];
  return `<div class="ac-attr-cell-main"><strong>${r.candidates.length}个候选</strong><span title="${acEsc(r.candidates.map(c => `${c.id} ${c.name}`).join("、"))}">${acEsc(first.id)} ${acEsc(first.name)}${r.candidates.length > 1 ? " 等" : ""}</span></div>`;
}
function acAttrSla(r){
  const tone = r.slaTone === "over" ? "is-over" : r.slaTone === "warn" ? "is-warn" : "";
  return `<span class="ac-sla ${tone}"><span class="ac-sla-num">${acEsc(r.sla)}</span></span>`;
}
function acAttrTable(rows,total,pages,view){
  if (!rows.length) return acEmpty(AC_ATTR_VIEW_META[view]?.empty || "没有符合当前条件的归属案件") + `<div class="ac-attr-empty-action"><button class="ac-btn secondary sm" data-attr-clear>清空筛选</button></div>`;
  const head = [["记录/案件号","190px"],["客户","150px"],["注册时间","132px"],["当前归属","150px"],["候选/冲突摘要","190px"],["异常类型","110px"],["IB隔离","100px"],["归属状态","100px"],["案件年龄","86px"],["SLA","110px"],["规则版本","100px"],["最近事件","140px"],["操作","145px"]];
  const body = rows.map(r => `<tr class="ac-attr-row" data-attr-row="${acEsc(r.id)}">
    <td class="ac-attr-sticky-left"><button class="ac-link ac-attr-record" data-attr-open="${acEsc(r.id)}">${acEsc(r.id)}</button><small>${r.rowType === "case" ? "案件" : "归属记录"}</small></td>
    <td>${acAttrCustomer(r)}</td><td>${acEsc(r.registeredAt)}</td><td>${acAttrAffiliate(r.currentAffiliate)}</td><td>${acAttrCandidates(r)}</td>
    <td>${r.type === "—" ? `<span class="ac-muted-value">—</span>` : `<span class="ac-badge ${acAttrTypeClass(r.type)}">${acEsc(r.typeLabel)}</span>`}</td>
    <td><span class="ac-badge ${r.ibStatus === "conflict" ? "is-red" : r.ibStatus === "excluded" ? "is-gray" : r.ibStatus === "none" ? "is-green" : "is-orange"}">${acEsc(r.ibLabel)}</span></td>
    <td><span class="ac-badge ${acAttrStatusClass(r.attributionStatus)}">${acEsc({pending:"待处理",locked:"已锁定",conflict:"冲突",unattributed:"无归属",excluded_ib:"已排除IB"}[r.attributionStatus] || r.attributionStatus)}</span></td>
    <td>${acEsc(r.age)}</td><td>${acAttrSla(r)}</td><td>${acEsc(r.ruleVersion)}</td><td>${acEsc(r.lastEvent)}</td>
    <td class="ac-col-actions"><div class="ac-row-actions"><button class="ac-link" data-attr-open="${acEsc(r.id)}">详情</button>${r.rowType === "case" && !["closed","rejected","applied"].includes(r.status) && AC_ATTR_CAN_WRITE() ? `<button class="ac-link" data-attr-process="${acEsc(r.id)}">处理</button>` : ""}${r.rowType === "case" && r.status === "apply_failed" && AC_ATTR_CAN_WRITE() ? `<button class="ac-link danger" data-attr-retry="${acEsc(r.id)}">重试</button>` : ""}</div></td>
  </tr>`).join("");
  return `<div class="ac-table-wrap ac-attr-table-wrap"><table class="ac-table ac-attr-table"><thead><tr>${head.map(([label,w],i) => `<th style="width:${w}" class="${i===0 ? "ac-attr-sticky-left" : i===head.length-1 ? "ac-col-actions" : ""}">${label}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>${acPagination(total,pages)}`;
}
function acAttrSelectedChips(filters){
  const labels = {q:"关键词",type:"异常类型",status:"归属状态",partner:"当前Affiliate",ib:"IB状态",sla:"SLA",dataState:"数据状态",new:"时间范围",ruleVersion:"规则版本",traceId:"TraceId"};
  const chips = Object.entries(filters).filter(([,v]) => v).map(([key,value]) => `<button class="ac-filter-chip" data-attr-remove="${acEsc(key)}">${acEsc(labels[key] || key)}：${acEsc(value)} ×</button>`);
  return chips.length ? `<div class="ac-attr-selected">${chips.join("")}</div>` : "";
}
function pgAttribution(){
  const view = AC_ATTR_STATE.view || "pending";
  const allRows = acAttrFilterRows(acAttrViewRows(view),AC_ATTR_STATE.appliedFilters);
  const {rows,total,pages} = (() => {
    const size = AC_STATE.pageSize || 20;
    const page = Math.max(1,Math.min(AC_LIST.page,Math.max(1,Math.ceil(allRows.length/size))));
    AC_LIST.page = page;
    return {rows:allRows.slice((page-1)*size,page*size),total:allRows.length,pages:Math.max(1,Math.ceil(allRows.length/size))};
  })();
  const metrics = acAttrMetrics();
  const meta = AC_ATTR_VIEW_META[view] || AC_ATTR_VIEW_META.pending;
  const canExport = AC_ATTR_CAN_EXPORT();
  const dataWarning = AC_ATTR_STATE.dataState === "error" ? `<div class="ac-banner is-danger"><span class="ac-banner-icon">!</span><span class="ac-banner-text">归属数据暂不可用 · 错误码 AFF-50301 · trace_id attr-demo-error-01</span><button class="ac-btn secondary sm" data-attr-retry-load>重试</button></div>` : `<div class="ac-banner ${allRows.some(r => r.dataState === "pending") ? "is-warn" : "is-info"}"><span class="ac-banner-icon">${allRows.some(r => r.dataState === "pending") ? "!" : "●"}</span><span class="ac-banner-text">数据来源：CRM + Affiliate归属域 · 数据截至 2026-11-09 09:20 · 最近同步 2026-11-09 09:18${allRows.some(r => r.dataState === "pending") ? " · 部分案件等待CRM/事件补数" : ""}</span><button class="ac-link" data-attr-refresh>刷新</button></div>`;
  return `${acPagehead("归属管理","异常优先 · 案件级复核 · CRM原始归因只读引用",`<button class="ac-btn secondary" data-attr-refresh>↻ 刷新</button><button class="ac-btn ${canExport ? "primary" : "secondary"}" ${canExport ? "data-attr-export" : "disabled"}>⇩ 异步导出</button>`)}
  ${dataWarning}
  <div class="ac-metric-bar ac-attr-metrics">${metrics.map(m => `<button class="ac-metric ${((m.key==="pending" && view==="pending") || (m.key==="overdue" && AC_ATTR_STATE.appliedFilters.sla==="over") || (m.key==="conflict" && AC_ATTR_STATE.appliedFilters.type==="attribution_conflict") || (m.key==="ib" && AC_ATTR_STATE.appliedFilters.type==="ib_isolation") || (m.key==="sync" && AC_ATTR_STATE.appliedFilters.dataState==="pending")) ? "is-active" : ""}" data-attr-metric="${m.key}"><span class="num ${m.key==="pending"||m.key==="overdue"||m.key==="ib" ? "is-danger" : ""}">${m.value}</span><span class="label">${m.label}</span></button>`).join("")}</div>
  <div class="ac-tabs ac-attr-tabs">${Object.entries(AC_ATTR_VIEW_META).map(([key,v]) => `<button class="${view===key?"active":""}" data-attr-view="${key}">${v.label}<span class="ac-tab-count">${acAttrViewRows(key).length}</span></button>`).join("")}</div>
  <div class="ac-attr-quick"><span>快捷筛选</span><button class="${AC_ATTR_STATE.appliedFilters.type==="attribution_conflict"?"active":""}" data-attr-quick="conflict">归属冲突</button><button class="${AC_ATTR_STATE.appliedFilters.type==="ib_isolation"?"active":""}" data-attr-quick="ib">IB隔离异常</button><button class="${AC_ATTR_STATE.appliedFilters.sla==="over"?"active":""}" data-attr-quick="overdue">超SLA</button><button class="${AC_ATTR_STATE.appliedFilters.dataState==="pending"?"active":""}" data-attr-quick="sync">数据待同步</button><button class="${AC_ATTR_STATE.appliedFilters.new==="yes"?"active":""}" data-attr-quick="new">近24小时新增</button></div>
  <div class="ac-attr-filter-head"><strong>筛选条件</strong><span>${allRows.length} 条结果 · 当前视图：${meta.label}</span><button class="ac-btn ghost sm" data-attr-filter-toggle>${AC_ATTR_STATE.filterOpen ? "收起筛选" : "展开筛选"}⌄</button></div>
  ${AC_ATTR_STATE.filterOpen ? `<div class="ac-filter ac-attr-filter">
    <div class="ac-field ac-attr-search"><label>关键词</label><input type="text" data-attr-filter="q" value="${acEsc(acAttrFilterValue("q"))}" placeholder="客户ID / 案件号 / 归属记录 / TraceId"></div>
    <div class="ac-field"><label>异常类型</label>${acAttrSelect("type",AC_ATTR_TYPE_OPTIONS)}</div>
    <div class="ac-field"><label>归属状态</label>${acAttrSelect("status",AC_ATTR_STATUS_OPTIONS)}</div>
    <div class="ac-field"><label>当前Affiliate</label><input type="text" data-attr-filter="partner" value="${acEsc(acAttrFilterValue("partner"))}" placeholder="编号或名称"></div>
    <div class="ac-field"><label>IB状态</label>${acAttrSelect("ib",[["","全部IB状态"],["none","无IB关系"],["conflict","冲突待核验"],["excluded","已排除"],["unknown","未核验"]])}</div>
    <div class="ac-field"><label>SLA</label>${acAttrSelect("sla",[["","全部SLA"],["normal","未到期"],["warn","接近到期"],["over","已超时"]])}</div>
    <div class="ac-field"><label>规则版本</label><input type="text" data-attr-filter="ruleVersion" value="${acEsc(acAttrFilterValue("ruleVersion"))}" placeholder="如 ATTR-v43"></div>
    <div class="ac-field"><label>TraceId</label><input type="text" data-attr-filter="traceId" value="${acEsc(acAttrFilterValue("traceId"))}" placeholder="完整TraceId"></div>
    <div class="ac-filter-actions"><button class="ac-btn primary sm" data-attr-query>查询</button><button class="ac-btn ghost sm" data-attr-reset>重置</button></div>
  </div>${acAttrSelectedChips(AC_ATTR_STATE.appliedFilters)}` : ""}
  <div class="ac-attr-toolbar"><span>默认排序：异常优先 · SLA剩余时间 · 案件创建时间</span><span>当前角色：${acEsc((AC_ROLES.find(r => r[0] === AC_STATE.role)||["","—"])[1])} · ${AC_ATTR_CAN_WRITE() ? "可发起处理" : "只读"}</span></div>
  ${AC_ATTR_STATE.loading ? `<div class="ac-attr-loading"><div></div><div></div><div></div></div>` : acAttrTable(rows,total,pages,view)}`;
}
function acAttrSteps(r){
  const states = ["待处理","处理中","待审批","应用中","已应用"];
  const current = r.status === "rejected" ? 2 : r.status === "apply_failed" ? 3 : Math.max(0,states.indexOf(acAttrStatusLabel(r.status)));
  return `<div class="ac-steps">${states.map((s,i) => `<div class="ac-step ${i < current ? "is-done" : ""} ${i === current ? "is-current" : ""} ${r.status === "apply_failed" && i === 3 ? "is-block" : ""}"><span class="ac-step-dot">${i < current ? "✓" : i === current ? "•" : ""}</span><span class="ac-step-label">${s}</span></div>`).join("")}</div>`;
}
function acAttrEvidence(r){
  const sensitive = AC_ATTR_CAN_SENSITIVE() && r.sensitive;
  return `<div class="ac-attr-evidence-grid">
    <div><small>CRM原始归因</small><strong>${r.candidates?.length ? "已返回候选参数" : "未找到可用来源"}</strong><span>${r.candidates?.length ? "注册参数、点击关系已标准化" : "页面不根据国家、IP或设备猜测归属"}</span></div>
    <div><small>候选排序</small><strong>${r.candidates?.length ? r.candidates.map(c => acEsc(c.id)).join(" → ") : "无候选"}</strong><span>${r.candidates?.length ? r.candidates.map(c => acEsc(c.score)).join(" · ") : "无可用规则结果"}</span></div>
    <div><small>IB隔离校验</small><strong>${acEsc(r.ibLabel)}</strong><span>${r.ibStatus === "conflict" ? "存在CRM IB关系，需人工确认隔离边界" : "未发现可用IB冲突证据"}</span></div>
    <div><small>敏感证据</small><strong>${sensitive ? "按权限展示" : "已脱敏/无权限"}</strong><span>${sensitive ? "设备、IP和支付关联仅供授权角色查看" : "完整敏感字段由服务端按权限裁剪"}</span></div>
  </div>
  <div class="ac-attr-raw"><button class="ac-link" data-attr-sensitive="${acEsc(r.id)}">${sensitive ? "收起敏感证据" : "查看敏感证据摘要"}</button><span>${sensitive ? "查看动作写入操作审计" : "当前角色仅查看脱敏摘要"}</span></div>`;
}
function acAttrImpact(r){
  return `<div class="ac-attr-impact-grid">
    <div><small>当前客户影响</small><strong>${acEsc(r.impact || "仅作用于当前案件")}</strong></div>
    <div><small>关联佣金/结算</small><strong>${r.status === "blocked_sync" ? "暂不判断" : "按关联案件检查，不扩大冻结范围"}</strong></div>
    <div><small>下游任务</small><strong>${r.reviewRequestId ? "QUAL / COMM / RISK 待处理" : "尚未生成"}</strong></div>
  </div>`;
}
function drawerAttribution(id){
  const r = AC_ATTR_DATA.find(x => x.id === id);
  if (!r) return;
  const canWrite = AC_ATTR_CAN_WRITE() && r.rowType === "case" && !["closed","applied","rejected"].includes(r.status) && r.dataState !== "pending";
  const canApprove = AC_ATTR_CAN_APPROVE() && r.status === "pending_approval" && !(r.requester === "risk_supervisor" && AC_ATTR_ROLE() === "risk_supervisor");
  const foot = r.status === "apply_failed" && canWrite
    ? `<button class="ac-btn ghost" data-attr-jump-customer="${acEsc(r.customerId)}">客户360</button><button class="ac-btn ghost" data-attr-jump-event="${acEsc(r.traceId)}">事件流水</button><button class="ac-btn danger" data-attr-retry="${acEsc(r.id)}">重试应用</button><button class="ac-btn secondary" data-attr-transfer="${acEsc(r.id)}">转人工</button><button class="ac-btn secondary" data-drawer-close>关闭</button>`
    : canApprove
      ? `<button class="ac-btn danger" data-attr-approval="${acEsc(r.id)}" data-approval-action="reject">驳回</button><button class="ac-btn primary" data-attr-approval="${acEsc(r.id)}" data-approval-action="approve">审批通过</button>`
      : canWrite
        ? `<button class="ac-btn ghost" data-attr-jump-customer="${acEsc(r.customerId)}">客户360</button><button class="ac-btn ghost" data-attr-jump-event="${acEsc(r.traceId)}">事件流水</button><button class="ac-btn secondary" data-attr-claim="${acEsc(r.id)}">认领</button><button class="ac-btn secondary" data-attr-transfer="${acEsc(r.id)}">转办</button><button class="ac-btn primary" data-attr-process="${acEsc(r.id)}">发起处理</button><button class="ac-btn secondary" data-drawer-close>关闭</button>`
        : `<span class="ac-drawer-readonly">${r.dataState === "pending" ? "CRM数据待同步，修正与审批暂不可用" : "当前角色或案件状态仅支持查看"}</span><button class="ac-btn ghost" data-attr-jump-customer="${acEsc(r.customerId)}">客户360</button><button class="ac-btn ghost" data-attr-jump-event="${acEsc(r.traceId)}">事件流水</button><button class="ac-btn secondary" data-drawer-close>关闭</button>`;
  acDrawer({
    title:`${r.rowType === "case" ? "案件" : "归属记录"} · ${r.id}`,
    sub:`${r.customerId} · ${r.typeLabel === "—" ? "正常锁定归属" : r.typeLabel} · ${r.traceId}`,
    badge:`<span class="ac-badge ${acAttrStatusClass(r.status)}">${acEsc(acAttrStatusLabel(r.status))}</span>`,
    tabs:[
      {id:"summary",label:"判断摘要",html:`${acAttrSteps(r)}<h4 class="ac-drawer-section-title">归属摘要</h4>${acKV([["客户",`${acEsc(r.customerId)} · ${acEsc(r.email)}`],["当前Affiliate",r.currentAffiliate ? `${acEsc(r.currentAffiliate.id)} · ${acEsc(r.currentAffiliate.name)}` : "无归属"],["候选归属",r.candidates?.length ? `${r.candidates.length} 个候选` : "无候选"],["IB状态",`<span class="ac-badge ${r.ibStatus === "conflict" ? "is-red" : "is-gray"}">${acEsc(r.ibLabel)}</span>`],["归属状态",`<span class="ac-badge ${acAttrStatusClass(r.attributionStatus)}">${acEsc({pending:"待处理",locked:"已锁定",conflict:"冲突",unattributed:"无归属",excluded_ib:"已排除IB"}[r.attributionStatus] || r.attributionStatus)}</span>`],["锁定时间",acEsc(r.lockedAt)],["规则版本",acEsc(r.ruleVersion)],["数据截至","2026-11-09 09:20"]])}<p class="ac-attr-description">${acEsc(r.description || "当前没有额外说明。")}</p>`},
      {id:"evidence",label:"归因证据",html:`<h4 class="ac-drawer-section-title">候选与原始事实</h4>${acAttrEvidence(r)}<h4 class="ac-drawer-section-title">事件链</h4>${acTimeline((r.timeline || []).map(x => ({time:x[0],title:x[1],desc:x[2],state:x[3]})))}<button class="ac-btn ghost sm" data-attr-jump-event="${acEsc(r.traceId)}">跳事件流水</button>`},
      {id:"impact",label:"影响与关联",html:`<h4 class="ac-drawer-section-title">影响范围</h4>${acAttrImpact(r)}<h4 class="ac-drawer-section-title">关联对象</h4>${acKV([["TraceId",`<button class="ac-link" data-attr-copy="${acEsc(r.traceId)}">${acEsc(r.traceId)} · 复制</button>`],["复核申请",acEsc(r.reviewRequestId || "—")],["任务",r.status === "blocked_sync" ? "INT-803 · 事件补数" : r.reviewRequestId ? "待生成下游任务" : "—"],["审计引用",`AUD-ATTR-${acEsc(r.id.slice(-3))}`]])}`},
      {id:"history",label:"处理记录",html:`<h4 class="ac-drawer-section-title">追加式处理记录</h4>${acTimeline((r.timeline || []).map(x => ({time:x[0],title:x[1],desc:x[2],state:x[3]})))}${r.rejectReason ? `<div class="ac-task-note">驳回原因：${acEsc(r.rejectReason)}</div>` : ""}${r.errorCode ? `<div class="ac-banner is-danger" style="margin-top:14px"><span class="ac-banner-icon">!</span><span class="ac-banner-text">应用失败 · ${acEsc(r.errorCode)} · trace_id ${acEsc(r.traceId)}</span></div>` : ""}`}
    ],
    foot
  });
}
function acAttrProcessModal(id){
  const r = AC_ATTR_DATA.find(x => x.id === id);
  if (!r) return;
  if (!AC_ATTR_CAN_WRITE()) {acToast("当前角色无权发起处理", "error");return;}
  const locked = r.attributionStatus === "locked";
  const choices = [["confirm","确认当前Affiliate归属"],["unattributed","保持无归属"],["correct","修正Affiliate归属"],["false_positive","标记误报"]];
  acModal({
    title:`发起处理 · ${r.id}`,
    size:"wide",
    body:`<div class="ac-form ac-attr-process-form">
      <div class="ac-form-item"><label>处理结论<span class="ac-req">*</span></label><div class="ac-radio-grid">${choices.map(([v,l],i) => `<label><input type="radio" name="attr-conclusion" value="${v}" ${i===0?"checked":""}> ${l}</label>`).join("")}</div><span class="ac-field-hint">${locked ? "当前归属已锁定，选择修正将创建新的更正案件，不覆盖旧归属。" : "提交后生成 review_request_id，案件进入待审批。"}</span></div>
      <div class="ac-form-item"><label>拟应用Affiliate</label><select id="attr-proposed-affiliate" ${locked ? "" : "disabled"}><option value="">请选择授权归属</option><option value="AF-0777">AF-0777 · Apex Media</option><option value="AF-1023">AF-1023 · Meridian Leads</option><option value="AF-1042">AF-1042 · Siam Clicks</option></select><span class="ac-field-hint">候选名称按当前角色权限返回；不能直接覆盖CRM原始归因。</span></div>
      <div class="ac-form-item"><label>依据类型<span class="ac-req">*</span></label><div class="ac-check-grid">${["CRM事实","原始归因参数","事件链","IB隔离结果","人工补证","其他"].map(v => `<label><input type="checkbox" name="attr-evidence" value="${v}"> ${v}</label>`).join("")}</div></div>
      <div class="ac-form-item"><label>处理原因<span class="ac-req">*</span></label><textarea id="attr-reason" placeholder="至少10个字符，不填写客户敏感信息明文"></textarea><span class="ac-field-hint">当前记录会写入申请、审批和操作审计。</span></div>
      <div class="ac-form-item"><label class="ac-check-line"><input type="checkbox" id="attr-impact-confirm"> 我确认该结论可能触发资格重跑、佣金重算、风险复核或补偿任务<span class="ac-req">*</span></label></div>
      <div class="ac-form-item"><label>附件/受控引用</label><input type="text" id="attr-reference" placeholder="引用ID（可选），不上传未经批准的敏感文件"></div>
    </div>`,
    foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-attr-submit="${acEsc(id)}">提交申请</button>`
  });
}
function acAttrApprovalModal(id,action){
  const r = AC_ATTR_DATA.find(x => x.id === id);
  if (!r) return;
  if (!AC_ATTR_CAN_APPROVE() || (r.requester === "risk_supervisor" && AC_ATTR_ROLE() === "risk_supervisor")) {acToast("该申请需要其他角色审批", "error");return;}
  const approve = action === "approve";
  acModal({
    title:`${approve ? "审批通过" : "审批驳回"} · ${r.reviewRequestId || r.id}`,
    size:"wide",
    body:`<div class="ac-approval-summary">${acKV([["案件",r.id],["申请人",r.requester],["当前归属",r.currentAffiliate ? `${r.currentAffiliate.id} · ${r.currentAffiliate.name}` : "无归属"],["拟应用值",r.proposedAffiliate ? `${r.proposedAffiliate.id} · ${r.proposedAffiliate.name}` : "—"],["影响摘要",r.impact],["数据截至","2026-11-09 09:20"]])}</div><div class="ac-attr-compare"><div><small>当前归属</small><strong>${r.currentAffiliate ? acEsc(r.currentAffiliate.name) : "无归属"}</strong><span>锁定规则 ${acEsc(r.ruleVersion)}</span></div><b>→</b><div><small>拟应用归属</small><strong>${r.proposedAffiliate ? acEsc(r.proposedAffiliate.name) : "待确认"}</strong><span>申请 ${acEsc(r.reviewRequestId || "—")}</span></div></div><div class="ac-form-item"><label>${approve ? "审批意见（可选）" : "驳回原因（必填，至少10个字符）"}</label><textarea id="attr-approval-reason" placeholder="${approve ? "记录审批意见" : "填写清晰的驳回原因"}"></textarea></div>`,
    foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn ${approve ? "primary" : "danger"}" data-attr-approval-submit="${acEsc(id)}" data-approval-submit-action="${approve ? "approve" : "reject"}">${approve ? "确认通过" : "确认驳回"}</button>`
  });
}
function acAttrSubmit(id){
  const r = AC_ATTR_DATA.find(x => x.id === id), conclusion = document.querySelector("input[name='attr-conclusion']:checked")?.value, reason = document.querySelector("#attr-reason")?.value.trim() || "", evidence = [...document.querySelectorAll("input[name='attr-evidence']:checked")].map(x => x.value), confirmed = document.querySelector("#attr-impact-confirm")?.checked, proposed = document.querySelector("#attr-proposed-affiliate")?.value;
  if (!r) return;
  if (!conclusion || evidence.length === 0 || reason.length < 10 || !confirmed || (conclusion === "correct" && !proposed)) {acToast("请补齐必填项：依据、原因、影响确认及拟应用Affiliate", "error");return;}
  r.status = "pending_approval";r.reviewRequestId = r.reviewRequestId || `RR-${Date.now().toString().slice(-8)}`;r.requester = "ops_chen";r.proposedAffiliate = proposed ? {id:proposed,name:({ "AF-0777":"Apex Media","AF-1023":"Meridian Leads","AF-1042":"Siam Clicks"})[proposed] || "受控候选"} : r.currentAffiliate;r.lastEvent = "2026-11-09 09:22";r.timeline.push(["2026-11-09 09:22","处理申请提交",`${r.reviewRequestId} · ${conclusion === "correct" ? "拟修正归属" : "等待审批"}`,"is-current"]);acModalClose();acDrawerClose();acRender();acToast(`已提交 ${r.reviewRequestId} · 案件进入待审批`);
}
function acAttrApprovalSubmit(id,action){
  const r = AC_ATTR_DATA.find(x => x.id === id), reason = document.querySelector("#attr-approval-reason")?.value.trim() || "";
  if (!r) return;
  if (action === "reject" && reason.length < 10) {acToast("驳回原因至少需要10个字符", "error");return;}
  if (action === "reject") {r.status = "rejected";r.rejectReason = reason;r.timeline.push(["2026-11-09 09:24","审批驳回",reason,"is-block"]);acModalClose();acDrawerClose();acRender();acToast(`已驳回 ${r.reviewRequestId || r.id}，原归属保持不变`);return;}
  r.status = "applying";r.timeline.push(["2026-11-09 09:24","审批通过","已通过职责分离校验，等待应用。","is-current"]);acModalClose();acDrawerClose();acRender();acToast(`已通过 ${r.reviewRequestId || r.id}，正在应用`);
  setTimeout(() => {r.status = r.scenario === "attribution_apply_failed" ? "apply_failed" : "applied";r.lastEvent = "2026-11-09 09:25";r.errorCode = r.status === "apply_failed" ? "AFF-50017" : "";r.timeline.push(["2026-11-09 09:25",r.status === "apply_failed" ? "应用失败" : "应用完成",r.status === "apply_failed" ? "写入超时，原归属保留。" : "最终归属已应用，下游任务已生成。",r.status === "apply_failed" ? "is-block" : "is-done"]);acRender();acToast(r.status === "apply_failed" ? "应用失败：AFF-50017，可重试或转人工" : "归属更正已应用，下游任务已生成");},650);
}
function acAttrRetry(id){
  const r = AC_ATTR_DATA.find(x => x.id === id);
  if (!r) return;
  r.status = "applying";r.timeline.push(["2026-11-09 09:26","开始重试","使用同一幂等键重试应用。","is-current"]);acDrawerClose();acRender();acToast(`已重试 ${r.id}，正在应用`);
  setTimeout(() => {r.status = "applied";r.errorCode = "";r.lastEvent = "2026-11-09 09:27";r.timeline.push(["2026-11-09 09:27","重试成功","应用完成，原申请记录保留。","is-done"]);acRender();acToast("重试成功，归属已应用");},650);
}
function acAttrExportModal(){
  if (!AC_ATTR_CAN_EXPORT()) {acToast("当前角色无权导出归属数据","error");return;}
  acModal({
    title:"创建归属异步导出",
    body:`<div class="ac-form"><div class="ac-form-item"><label>数据范围</label><div class="ac-approval-summary">${acKV([["当前视图",AC_ATTR_VIEW_META[AC_ATTR_STATE.view]?.label || "待处理异常"],["当前筛选",Object.keys(AC_ATTR_STATE.appliedFilters || {}).length ? "按当前筛选" : "全部结果"],["数据级别","默认脱敏"]])}</div></div><div class="ac-form-item"><label>字段策略</label><label class="ac-check-line"><input type="checkbox" checked disabled> 客户ID、脱敏邮箱、案件号、归属状态、规则版本、TraceId</label><label class="ac-check-line"><input type="checkbox" disabled> 原始参数、IP、设备、支付关联（需单独授权）</label></div><div class="ac-form-item"><label>说明</label><p class="ac-field-hint">导出创建、下载、失败和过期都会写入操作审计；任务完成后24小时过期。</p></div></div>`,
    foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-attr-export-submit>创建导出任务</button>`
  });
}
function pgEvents(){
  const cols = [
    {key:"tid",label:"TraceId",w:"96px",render:r => `<button class="ac-link" data-trace="${r.tid}">${r.tid}</button>`},
    {key:"type",label:"事件类型",w:"86px",sortable:true},{key:"src",label:"来源系统",w:"96px",sortable:true},
    {key:"obj",label:"对象",w:"96px",render:r => `<button class="ac-link" data-toast="跳转客户">${r.obj}</button>`},
    {key:"status",label:"状态",w:"76px",sortable:true,render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {key:"time",label:"发生时间",w:"150px",sortable:true},
  ];
  const {rows,total,pages} = acApplyList("events",AC_DB.events,(r,f) => (!f.q || [r.tid,r.type,r.obj].join(" ").toLowerCase().includes(f.q)) && (!f.status || f.status === "全部状态" || r.status === f.status));
  return `${acPagehead("事件流水","全链路事实底账 · 共"+AC_DB.events.length+"条 · 补数走集成任务")}
  <div class="ac-bigsearch"><input type="text" data-lsearch="events" placeholder="输入 TraceId 检索全链路，如 tr-7a3f，回车确认"><button class="ac-btn primary" data-click-search="events">检索</button></div>
  <div class="ac-filter">
  ${(()=>{const k = "f.ev.status";const opts = ["全部状态","正常","缺数","重试"];acDDReg(k,opts.map(o => ({v:o,label:o})),() => (AC_LIST.filters.events||{}).status || "全部状态",v => {AC_LIST.filters.events = {...(AC_LIST.filters.events||{}),status:v};AC_LIST.page = 1;acRender();});return `<div class="ac-field"><label>状态</label>${acDD(k,(AC_LIST.filters.events||{}).status||"全部状态",{sm:true})}</div>`;})()}
  <div class="ac-filter-actions"><button class="ac-btn ghost sm" data-filter-reset="events">重置</button></div></div>
  ${acTableX("events",cols,rows,{total,pages})}`;
}
const AC_MATERIAL_TYPES = ["全部类型","横幅","视频","GIF","落地页"];
const AC_MATERIAL_STATUSES = ["全部状态","启用","待生效","停用","过期","归档"];
const AC_MATERIAL_COUNTRIES = ["全部国家","印尼","越南","泰国","尼日利亚","巴西","墨西哥"];
const AC_MATERIAL_LANGUAGES = ["全部语言","印尼语","越南语","英语","泰语","葡萄牙语","西班牙语"];
const AC_MATERIAL_DEVICES = ["全部设备","网站","iOS","Android"];
const AC_MATERIAL_PLATFORMS = ["全部平台","Google Display","官方站点","YouTube","Meta","TikTok","Zalo"];
const AC_MATERIAL_PATHS = ["全部路径","LP-ID-001 · 印尼开户注册","LP-VN-002 · Gold开户页","LP-NG-001 · 官方开户注册","LP-BR-003 · 节日活动页","LP-MX-001 · 标准开户注册","LP-GLOBAL-001 · 官方注册入口","LP-ID-004 · App开户注册","LP-VN-003 · 移动注册页"];

function materialTypeClass(type){return ({横幅:"banner",视频:"video",GIF:"gif",落地页:"landing"})[type] || "banner";}
function materialTypeIcon(type){return ({横幅:"▤",视频:"▶",GIF:"◉",落地页:"↗"})[type] || "•";}
function materialPreview(m,large = false){
  return `<div class="ac-mat-visual is-${materialTypeClass(m.type)} ${large?"is-large":""}" style="--mat-tone:${m.color || "gold"}"><span>${materialTypeIcon(m.type)}</span><small>${acEsc(m.type)}</small></div>`;
}
function materialScope(m){
  return m.scope || [m.countries?.join("/"),m.languages?.join("/"),m.devices?.join("/")].filter(Boolean).join(" · ");
}
function materialHistory(m){
  const history = (m.history || []).slice();
  if (m.version > 1 && history.length < 2) history.push({version:m.version-1,created:"2026-10-28 09:10",operator:"ops_chen",status:"归档",file:m.type === "落地页" ? "官方路径旧引用" : `${m.id.toLowerCase()}-v${m.version-1}.${m.format === "MP4" ? "mp4" : m.format === "GIF" ? "gif" : "png"}`,note:"被当前版本替换，历史引用保留。"});
  return history.sort((a,b) => b.version-a.version);
}
function materialFilterOptions(values,current,allLabel){
  return values.map(v => `<option value="${acEsc(v === allLabel ? "" : v)}" ${String(current || "") === String(v === allLabel ? "" : v) ? "selected" : ""}>${acEsc(v)}</option>`).join("");
}
function materialFilterSelect(key,label,values,current){
  return `<div class="ac-field"><label>${acEsc(label)}</label><select data-mat-filter="${key}">${materialFilterOptions(values,current,values[0])}</select></div>`;
}
function materialRows(){
  const f = AC_LIST.filters.materials || {};
  return acApplyList("materials",AC_DB.materials,(r,ff) => {
    const hay = [r.id,r.name,r.type,r.scope,r.path,r.file].join(" ").toLowerCase();
    return (!ff.q || hay.includes(ff.q)) &&
      (!ff.type || r.type === ff.type) &&
      (!ff.status || r.status === ff.status) &&
      (!ff.country || (r.countries || []).includes(ff.country)) &&
      (!ff.language || (r.languages || []).includes(ff.language)) &&
      (!ff.device || (r.devices || []).includes(ff.device)) &&
      (!ff.platform || (r.platforms || []).includes(ff.platform)) &&
      (!ff.path || r.path === ff.path) &&
      (!ff.updatedFrom || String(r.updated || "") >= ff.updatedFrom) &&
      (!ff.updatedTo || String(r.updated || "") <= `${ff.updatedTo} 23:59`);
  });
}
function materialSelected(id){return AC_STATE.matSelected.includes(id);}
function materialSelectionBar(rows){
  const selected = AC_STATE.matSelected.filter(id => AC_DB.materials.some(m => m.id === id));
  AC_STATE.matSelected = selected;
  if (!selected.length) return "";
  const sameState = new Set(selected.map(id => AC_DB.materials.find(m => m.id === id)?.status)).size === 1;
  const canWrite = AC_STATE.role === "operations" || AC_STATE.role === "admin";
  return `<div class="ac-material-batchbar"><strong>已选 ${selected.length} 项</strong><span>${sameState ? "可对同一状态素材执行批量操作" : "混合状态仅支持逐项处理"}</span><div class="ac-material-batch-actions">${canWrite && sameState ? `<button class="ac-btn ghost sm" data-material-batch="enable">批量恢复启用</button><button class="ac-btn ghost sm" data-material-batch="disable">批量停用</button><button class="ac-btn danger sm" data-material-batch="archive">批量归档</button>` : ""}<button class="ac-link" data-material-clear>清空选择</button></div></div>`;
}
function materialActionButtons(m){
  const canWrite = AC_STATE.role === "operations" || AC_STATE.role === "admin";
  const statusAction = m.status === "启用" || m.status === "待生效" ? "停用" : "启用";
  return `${canWrite ? `<button class="ac-link ac-material-action-direct" data-material-action="edit" data-material-id="${m.id}">编辑</button><button class="ac-link danger ac-material-action-direct" data-material-action="${statusAction === "停用" ? "disable" : "enable"}" data-material-id="${m.id}">${statusAction}</button>` : ""}<button class="ac-link" data-material-action="more" data-material-id="${m.id}">更多</button>`;
}
function pgMaterials(){
  const view = AC_STATE.matView;
  const f = AC_LIST.filters.materials || (AC_LIST.filters.materials = {status:"启用"});
  const result = materialRows();
  const rows = result.rows;
  const canWrite = AC_STATE.role === "operations" || AC_STATE.role === "admin";
  const toggle = `<div class="ac-viewtoggle" aria-label="视图切换"><button class="${view==="list"?"active":""}" data-matview="list">☰ 表格</button><button class="${view==="grid"?"active":""}" data-matview="grid">▦ 网格</button></div>`;
  const queryControls = `<div class="ac-material-filter">
    <div class="ac-field ac-material-search"><label>名称/编号</label><input type="text" data-mat-filter="q" value="${acEsc(f.q || "")}" placeholder="搜索素材名称或编号"></div>
    ${materialFilterSelect("type","类型",AC_MATERIAL_TYPES,f.type)}
    ${materialFilterSelect("status","状态",AC_MATERIAL_STATUSES,f.status)}
    ${materialFilterSelect("country","国家",AC_MATERIAL_COUNTRIES,f.country)}
    ${materialFilterSelect("language","语言",AC_MATERIAL_LANGUAGES,f.language)}
    ${materialFilterSelect("device","设备",AC_MATERIAL_DEVICES,f.device)}
    ${materialFilterSelect("platform","平台",AC_MATERIAL_PLATFORMS,f.platform)}
    ${materialFilterSelect("path","官方落地页",AC_MATERIAL_PATHS,f.path)}
    <div class="ac-field ac-material-date-range"><label>更新时间</label><div><input type="date" data-mat-filter="updatedFrom" value="${acEsc(f.updatedFrom || "")}" aria-label="更新时间起始"><span>至</span><input type="date" data-mat-filter="updatedTo" value="${acEsc(f.updatedTo || "")}" aria-label="更新时间结束"></div></div>
    <div class="ac-filter-actions"><button class="ac-btn primary sm" data-mat-query>查询</button><button class="ac-btn ghost sm" data-mat-reset>重置</button></div>
  </div>`;
  const summary = [
    {num:AC_DB.materials.filter(m => m.status === "启用").length,label:"启用素材"},
    {num:AC_DB.materials.filter(m => m.status === "待生效").length,label:"待生效版本",tone:"warn"},
    {num:AC_DB.materials.filter(m => String(m.created || "") >= "2026-10-10").length,label:"近30天新增版本"},
    {num:AC_DB.materials.filter(m => m.status === "停用" || m.status === "归档").length,label:"停用/归档",tone:"muted"},
  ];
  const allVisibleSelected = rows.length > 0 && rows.every(m => materialSelected(m.id));
  const cols = [
    {label:"选择",head:`<input type="checkbox" class="ac-material-selectbox" data-material-select-all aria-label="选择当前结果" ${allVisibleSelected?"checked":""}>`,w:"44px",fixedLeft:true,render:r => `<input type="checkbox" class="ac-material-selectbox" data-material-select="${r.id}" aria-label="选择 ${acEsc(r.name)}" ${materialSelected(r.id)?"checked":""}>`},
    {label:"预览",w:"92px",render:r => materialPreview(r)},
    {key:"name",label:"素材名称",w:"176px",sortable:true,render:r => `<button class="ac-link ac-material-name" data-material-action="preview" data-material-id="${r.id}">${acEsc(r.name)}</button>`},
    {key:"id",label:"素材编号",w:"94px",sortable:true,render:r => `<button class="ac-link ac-material-id ac-material-id-link" data-material-action="preview" data-material-id="${r.id}">${acEsc(r.id)}</button>`},
    {key:"type",label:"类型",w:"72px",sortable:true,render:r => `<span class="ac-badge is-info">${acEsc(r.type)}</span>`},
    {key:"version",label:"当前版本",w:"78px",sortable:true,render:r => `<button class="ac-link ac-mono" data-material-action="preview" data-material-id="${r.id}">v${r.version}</button>`},
    {key:"scope",label:"适用范围",w:"218px",render:r => `<span class="ac-truncate" title="${acEsc(materialScope(r))}">${acEsc(materialScope(r))}</span>`},
    {key:"path",label:"官方落地页",w:"172px",render:r => `<span class="ac-truncate" title="${acEsc(r.path)}">${acEsc(r.path)}</span>`},
    {key:"status",label:"状态",w:"82px",sortable:true,render:r => `<span class="ac-badge ${acStat(r.status)}">${acEsc(r.status)}</span>`},
    {key:"uses",label:"使用中",w:"78px",sortable:true,render:r => `<button class="ac-link" data-material-action="usage" data-material-id="${r.id}">${r.uses}</button>`},
    {key:"updated",label:"更新时间",w:"148px",sortable:true,render:r => `<span class="ac-mono">${acEsc(r.updated)}</span>`},
    {label:"操作",w:"178px",actions:true,materialActions:true,render:r => materialActionButtons(r)},
  ];
  const table = acTableX("materials",cols,rows,{total:result.total,pages:result.pages});
  const grid = rows.length ? `<div class="ac-mat-grid">${rows.map(m => `<article class="ac-mat-card-v2"><button class="ac-mat-card-preview" data-material-action="preview" data-material-id="${m.id}">${materialPreview(m,true)}</button><div class="ac-mat-card-head"><div><strong>${acEsc(m.name)}</strong><small>${acEsc(m.id)} · v${m.version}</small></div><span class="ac-badge ${acStat(m.status)}">${acEsc(m.status)}</span></div><p>${acEsc(materialScope(m))}</p><div class="ac-mat-card-foot"><span>${m.uses} 个使用中</span><button class="ac-link" data-material-action="preview" data-material-id="${m.id}">查看详情</button></div></article>`).join("")}</div>` : acEmpty("没有符合条件的素材");
  return `${acPagehead("素材管理","官方素材维护 · 版本、适用范围和使用引用可追溯",canWrite ? `<button class='ac-btn primary' data-material-action='upload'>↥ 上传素材</button>` : "")}
  ${acMetricBar(summary)}
  ${queryControls}
  ${materialSelectionBar(rows)}
  <div class="ac-material-toolbar"><div><strong>${result.total}</strong><span> 条素材 · 默认只显示启用</span></div><div class="ac-material-toolbar-actions">${toggle}<button class="ac-btn ghost sm" data-toast="列设置：可隐藏适用范围、路径、使用中数量">☷ 列设置</button><button class="ac-btn ghost sm" data-toast="已创建素材元数据导出任务，结果进入导出中心">⤓ 导出</button><button class="ac-btn ghost sm" data-toast="素材列表已刷新">↻ 刷新</button></div></div>
  ${view==="grid" ? grid : table}`;
}

function materialDetailRows(m){
  return acKV([
    ["素材编号",`<span class="ac-mono">${acEsc(m.id)}</span>`],
    ["素材类型",acEsc(m.type)],
    ["当前版本",`<span class="ac-mono">v${m.version}</span>`],
    ["素材文件",acEsc(m.file)],
    ["尺寸 / 格式",`${acEsc(m.size)} · ${acEsc(m.format)}`],
    ["适用范围",acEsc(materialScope(m))],
    ["官方落地页",`<span class="ac-link-static">${acEsc(m.path)}</span>`],
    ["有效期",`${acEsc(m.validFrom)} → ${acEsc(m.validTo)}`],
    ["使用中数量",`${m.uses} 个引用`],
    ["最近更新",acEsc(m.updated)],
  ]);
}
function drawerMaterial(id){
  const m = AC_DB.materials.find(x => x.id === id); if (!m) return;
  const canWrite = AC_STATE.role === "operations" || AC_STATE.role === "admin";
  const history = materialHistory(m);
  const versions = `<div class="ac-version-list">${history.map(v => `<div class="ac-version-row ${v.version===m.version?"is-current":""}"><div><strong>v${v.version}</strong>${v.version===m.version?` <span class="ac-badge is-green">当前</span>`:""}<small>${acEsc(v.file)}</small></div><div><span>${acEsc(v.operator)}</span><small>${acEsc(v.created)}</small></div><span class="ac-badge ${acStat(v.status)}">${acEsc(v.status)}</span><button class="ac-link" data-material-action="version-preview" data-material-id="${m.id}" data-material-version="${v.version}">预览</button></div>`).join("")}</div>`;
  const auditItems = (m.audit || []).concat([{time:"2026-10-21 15:20",operator:"system",action:"写入官方路径库关联",reason:"路径可用性校验通过",result:"成功"}]).map(a => ({time:a.time,title:`${a.action} · ${a.operator}`,desc:`${a.reason} · ${a.result}`,state:"is-done"}));
  const statusAction = m.status === "启用" || m.status === "待生效" ? "disable" : "enable";
  const foot = canWrite ? `<button class="ac-btn secondary" data-material-action="edit" data-material-id="${m.id}">编辑</button><button class="ac-btn secondary" data-material-action="replace" data-material-id="${m.id}">替换版本</button><button class="ac-btn ${statusAction==="disable"?"danger":"primary"}" data-material-action="${statusAction}" data-material-id="${m.id}">${statusAction==="disable"?"停用":"恢复启用"}</button>${m.uses===0?`<button class="ac-btn danger" data-material-action="archive" data-material-id="${m.id}">归档</button>`:""}` : `<span class="ac-drawer-readonly">当前角色仅可查看和追溯</span>`;
  acDrawer({title:m.name,sub:`${m.id} · 官方素材 · 当前 v${m.version}`,badge:`<span class="ac-badge ${acStat(m.status)}">${acEsc(m.status)}</span>`,wide:true,tabs:[
    {id:"overview",label:"概览",html:`<div class="ac-material-detail-hero">${materialPreview(m,true)}<div><p>当前版本</p><strong>v${m.version}</strong><span>${acEsc(m.description)}</span><small>最后更新 ${acEsc(m.updated)}</small></div></div><h4 class="ac-drawer-section-title">素材信息</h4>${materialDetailRows(m)}<h4 class="ac-drawer-section-title">使用情况</h4><div class="ac-usage-summary"><strong>${m.uses}</strong><span>个当前引用</span><button class="ac-btn ghost sm" data-material-action="usage" data-material-id="${m.id}">查看引用</button></div>`},
    {id:"versions",label:"版本历史",html:`<p class="ac-drawer-copy">文件替换生成新版本，历史引用继续保留旧版本指向。</p>${versions}`},
    {id:"audit",label:"操作审计",html:acTimeline(auditItems)}
  ],foot});
}
function materialFormBody(m,mode){
  const isUpload = mode === "upload";
  const item = m || {type:"横幅",name:"",description:"",countries:["印尼"],languages:["印尼语"],devices:["网站"],platforms:["Google Display"],path:"LP-ID-001 · 印尼开户注册",size:"1200×628",format:"PNG",file:""};
  const selected = (key,value) => (item[key] || []).includes(value) ? "selected" : "";
  return `<div class="ac-form ac-material-form" data-material-form="${mode}" data-material-id="${m?.id || ""}">
    <div class="ac-form-row"><div class="ac-form-item"><label>素材类型<span class="ac-req">*</span></label><select data-material-field="type" ${isUpload?"":"disabled"}>${["横幅","视频","GIF","落地页"].map(v => `<option ${item.type===v?"selected":""}>${v}</option>`).join("")}</select></div><div class="ac-form-item"><label>素材名称<span class="ac-req">*</span></label><input type="text" data-material-field="name" value="${acEsc(item.name)}" placeholder="例如：IDR 标准横幅"></div></div>
    <div class="ac-form-item"><label>描述</label><textarea data-material-field="description" placeholder="说明素材用途和适用场景">${acEsc(item.description || "")}</textarea><span class="ac-field-hint">用于后台识别和审计，不展示给合作方。</span></div>
    ${isUpload ? `<div class="ac-form-item"><label>文件或官方路径<span class="ac-req">*</span></label><div class="ac-upload-zone"><input type="file" data-material-file ${item.type==="落地页"?"disabled":""}><strong>${item.type==="落地页"?"选择官方路径，不上传正文文件":"拖拽文件到这里，或点击选择文件"}</strong><span data-material-file-label>${item.type==="落地页"?"将引用官方路径库":"支持的格式和大小由服务端规则返回"}</span></div></div>` : `<div class="ac-form-item"><label>当前文件</label><div class="ac-current-file">${acEsc(item.file)} · v${item.version}<span>替换文件会生成新版本，不覆盖历史引用</span></div></div>`}
    <div class="ac-form-row"><div class="ac-form-item"><label>国家<span class="ac-req">*</span></label><select data-material-field="country"><option value="">请选择国家</option>${AC_MATERIAL_COUNTRIES.slice(1).map(v => `<option value="${acEsc(v)}" ${selected("countries",v)}>${acEsc(v)}</option>`).join("")}</select></div><div class="ac-form-item"><label>语言<span class="ac-req">*</span></label><select data-material-field="language"><option value="">请选择语言</option>${AC_MATERIAL_LANGUAGES.slice(1).map(v => `<option value="${acEsc(v)}" ${selected("languages",v)}>${acEsc(v)}</option>`).join("")}</select></div></div>
    <div class="ac-form-row"><div class="ac-form-item"><label>设备<span class="ac-req">*</span></label><select data-material-field="device">${AC_MATERIAL_DEVICES.slice(1).map(v => `<option value="${acEsc(v)}" ${selected("devices",v)}>${acEsc(v)}</option>`).join("")}</select></div><div class="ac-form-item"><label>平台<span class="ac-req">*</span></label><select data-material-field="platform">${AC_MATERIAL_PLATFORMS.slice(1).map(v => `<option value="${acEsc(v)}" ${selected("platforms",v)}>${acEsc(v)}</option>`).join("")}</select></div></div>
    <div class="ac-form-row"><div class="ac-form-item"><label>官方落地页<span class="ac-req">*</span></label><select data-material-field="path">${["LP-ID-001 · 印尼开户注册","LP-VN-002 · Gold开户页","LP-NG-001 · 官方开户注册","LP-BR-003 · 节日活动页","LP-MX-001 · 标准开户注册","LP-GLOBAL-001 · 官方注册入口","LP-ID-004 · App开户注册","LP-VN-003 · 移动注册页"].map(v => `<option ${item.path===v?"selected":""}>${acEsc(v)}</option>`).join("")}</select></div><div class="ac-form-item"><label>生效日期</label><input type="text" data-material-field="validFrom" value="${acEsc(item.validFrom || "2026-11-08")}" placeholder="YYYY-MM-DD"></div></div>
    <div class="ac-material-form-note">保存即进入启用或待生效状态，不产生审核任务。适用组合冲突、路径不可用或文件校验失败时，保存会被阻止。</div>
  </div>`;
}
function materialUploadModal(){
  acModal({title:"上传素材",body:materialFormBody(null,"upload"),size:"wide",foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-material-save="upload">保存并启用</button>`});
}
function materialEditModal(id,replace = false){
  const m = AC_DB.materials.find(x => x.id === id); if (!m) return;
  acModal({title:replace?`替换版本 · ${m.name}`:`编辑素材 · ${m.name}`,body:materialFormBody(m,replace?"replace":"edit"),size:"wide",foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-material-save="${replace?"replace":"edit"}" data-material-id="${m.id}">${replace?"生成新版本":"保存变更"}</button>`});
}
function materialConfirm(id,action){
  const m = AC_DB.materials.find(x => x.id === id); if (!m) return;
  const labels = {disable:"停用",enable:"恢复启用",archive:"归档"};
  const consequences = {disable:`停用后不再参与新引用匹配，当前 ${m.uses} 个历史引用保留。`,enable:"恢复后会重新参与新引用匹配，并重新校验适用范围。",archive:m.uses ? "仍有使用中引用，当前素材不可归档。" : "归档后保留版本和审计，页面默认不再展示。"};
  if (action === "archive" && m.uses) {acToast(`无法归档：${m.id} 仍有 ${m.uses} 个使用中引用`,"error");return;}
  acModal({title:`${labels[action]}素材`,body:`<div class="ac-danger-copy"><strong>${acEsc(m.name)}</strong><p>${consequences[action]}</p><label>原因<span class="ac-req">*</span></label><textarea data-material-reason placeholder="请填写本次${labels[action]}原因"></textarea></div>`,foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn ${action==="disable"||action==="archive"?"danger":"primary"}" data-material-confirm="${action}" data-material-id="${m.id}">确认${labels[action]}</button>`});
}
function materialSubmit(mode,id){
  const form = document.querySelector("[data-material-form]"); if (!form) return;
  const value = key => form.querySelector(`[data-material-field="${key}"]`)?.value.trim() || "";
  const name = value("name"), country = value("country"), language = value("language");
  if (!name || !country || !language) {acToast("请填写素材名称、国家和语言","error");return;}
  if (mode === "upload") {
    const type = value("type"), path = value("path");
    const newId = `AST-${1000 + AC_DB.materials.length + 1}`;
    const file = type === "落地页" ? "—" : (form.querySelector("[data-material-file]")?.files?.[0]?.name || `${newId.toLowerCase()}-v1.${type==="视频"?"mp4":type==="GIF"?"gif":"png"}`);
    const item = {id:newId,name,type,version:1,status:value("validFrom") > "2026-11-08" ? "待生效" : "启用",countries:[country],languages:[language],devices:[value("device")],platforms:[value("platform")],scope:`${country} · ${language} · ${value("device")} · ${value("platform")}`,path,size:type==="落地页"?"官方路径":"待校验",format:type==="视频"?"MP4":type==="GIF"?"GIF":"PNG",file,updated:"2026-11-08 10:12",created:"2026-11-08 10:12",uses:0,description:value("description"),validFrom:value("validFrom") || "2026-11-08",validTo:"—",operator:AC_STATE.role, color:type==="视频"?"blue":type==="落地页"?"plum":"gold",history:[{version:1,created:"2026-11-08 10:12",operator:AC_STATE.role,status:"启用",file,note:"首次创建素材。"}],audit:[{time:"2026-11-08 10:12",operator:AC_STATE.role,action:"创建素材",reason:"官方素材入库",result:"成功"}]};
    AC_DB.materials.unshift(item);
    acModalClose();AC_LIST.page=1;AC_LIST.filters.materials={status:"启用"};acRender();acToast(`已创建 ${newId}，素材已${item.status === "启用" ? "启用" : "排入待生效"}`);
    return;
  }
  const m = AC_DB.materials.find(x => x.id === id); if (!m) return;
  if (mode === "replace") {m.version += 1;m.updated="2026-11-08 10:12";m.file=`${m.id.toLowerCase()}-v${m.version}.${m.format === "MP4" ? "mp4" : m.format === "GIF" ? "gif" : "png"}`;m.history = materialHistory(m);m.audit = (m.audit||[]).concat([{time:m.updated,operator:AC_STATE.role,action:"替换并启用新版本",reason:"内容更新",result:"成功"}]);}
  m.name=name;m.description=value("description");m.countries=[country];m.languages=[language];m.devices=[value("device")];m.platforms=[value("platform")];m.path=value("path");m.scope=`${country} · ${language} · ${value("device")} · ${value("platform")}`;
  acModalClose();acDrawerClose();acRender();acToast(mode==="replace" ? `${m.id} 已生成 v${m.version}，历史版本保留` : `${m.id} 素材信息已更新`);
}
function materialConfirmSubmit(action,id){
  const m = AC_DB.materials.find(x => x.id === id); if (!m) return;
  const reason = document.querySelector("[data-material-reason]")?.value.trim();
  if (!reason) {acToast("请填写操作原因","error");return;}
  const labels = {disable:"停用",enable:"恢复启用",archive:"归档"};
  const prev = m.status;
  m.status = action === "disable" ? "停用" : action === "enable" ? "启用" : "归档";
  m.updated="2026-11-08 10:12";
  m.audit = (m.audit||[]).concat([{time:m.updated,operator:AC_STATE.role,action:labels[action],reason,result:"成功"}]);
  acModalClose();acDrawerClose();acRender();acToast(`${m.id} 已${labels[action]}（${prev} → ${m.status}）`);
}
function materialBatchConfirm(action){
  const ids = AC_STATE.matSelected.filter(id => AC_DB.materials.some(m => m.id === id));
  if (!ids.length) return;
  const labels = {disable:"停用",enable:"恢复启用",archive:"归档"};
  const items = ids.map(id => AC_DB.materials.find(m => m.id === id)).filter(Boolean);
  const blocked = action === "archive" ? items.filter(m => m.uses > 0) : [];
  acModal({
    title:`批量${labels[action]}素材`,
    body:`<div class="ac-danger-copy"><strong>已选择 ${items.length} 项</strong><p>${blocked.length ? `其中 ${blocked.length} 项仍有使用中引用，将跳过归档；其余符合条件的素材会继续处理。` : `将对当前选中的 ${items.length} 项执行${labels[action]}，每项结果都会写入操作审计。`}</p><label>原因<span class="ac-req">*</span></label><textarea data-material-reason placeholder="请填写本次批量${labels[action]}原因"></textarea></div>`,
    foot:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn ${action==="disable"||action==="archive"?"danger":"primary"}" data-material-batch-confirm="${action}">确认批量${labels[action]}</button>`
  });
}
function materialBatchSubmit(action){
  const reason = document.querySelector("[data-material-reason]")?.value.trim();
  if (!reason) {acToast("请填写操作原因","error");return;}
  const labels = {disable:"停用",enable:"恢复启用",archive:"归档"};
  const ids = AC_STATE.matSelected.slice();
  let success = 0, skipped = 0;
  ids.forEach(id => {
    const m = AC_DB.materials.find(x => x.id === id);
    if (!m || (action === "archive" && m.uses > 0)) {skipped++;return;}
    const prev = m.status;
    m.status = action === "disable" ? "停用" : action === "enable" ? "启用" : "归档";
    m.updated = "2026-11-08 10:12";
    m.audit = (m.audit || []).concat([{time:m.updated,operator:AC_STATE.role,action:labels[action],reason,result:"成功",from:prev,to:m.status,affected_uses:m.uses}]);
    success++;
  });
  AC_STATE.matSelected = [];
  acModalClose();acRender();acToast(`批量${labels[action]}完成：成功 ${success} 项${skipped ? `，跳过 ${skipped} 项` : ""}`);
}
function pgPostback(){
  return `${acPagehead("回传监控","配置在合作者端自助 · 管理端只读监控投递")}
  ${acFilterBar("pb",[{type:"search",ph:"搜索合作方"},{key:"status",label:"状态",options:["全部状态","正常","失败","暂停"]}])}
  ${acTable([
    {key:"id",label:"合作方",w:"86px",render:r => `<button class="ac-link" data-partner="${r.id}">${r.id}</button>`},
    {key:"url",label:"回调地址",render:r => r.url==="—"?`<span style="color:var(--subtle)">未配置</span>`:r.url},
    {key:"ev",label:"回传事件",w:"110px"},{key:"rate",label:"近7日成功率",w:"104px",render:r => r.rate==="—"?`<span style="color:var(--subtle)">—</span>`:r.rate},
    {key:"last",label:"最近投递",w:"150px"},{key:"fails",label:"连续失败",w:"80px",render:r => Number(r.fails)>0?`<span class="ac-warn-text">${r.fails}次</span>`:"0"},
    {key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {label:"操作",w:"60px",actions:true,render:r => `<button class="ac-link" data-pb="${r.id}">详情</button>`},
  ],AC_DB.postback)}`;
}
function pgTracking(){
  const cols = [
    {key:"time",label:"点击时间",w:"112px",sortable:true},{key:"partner",label:"合作方",w:"88px",sortable:true,render:r => `<button class="ac-link" data-partner="${r.partner}">${r.partner}</button>`},
    {key:"link",label:"链接",w:"80px"},{key:"sub",label:"Sub ID",w:"90px"},{key:"dev",label:"设备",w:"80px",sortable:true},{key:"geo",label:"国家",w:"80px",sortable:true},
    {label:"转化进度",w:"230px",render:r => acSteps(r.stage)},
    {label:"操作",w:"70px",actions:true,render:r => `<button class="ac-link" data-path='${acEsc(JSON.stringify(r))}'>查路径</button>`},
  ];
  const {rows,total,pages} = acApplyList("tracking",AC_DB.tracking,(r,f) => (!f.q || [r.partner,r.link,r.sub].join(" ").toLowerCase().includes(f.q)) && (!f.stage || f.stage === "全部" || r.stage === f.stage));
  return `${acPagehead("链接追踪","点击明细 · 转化路径 · 共"+AC_DB.tracking.length+"条")}
  <div class="ac-filter">${acSearch("tracking","搜索 合作方 / 链接 / SubID")}
  ${(()=>{const k = "f.trk.stage";const opts = ["全部","未转化","已注册","已FTD","已计佣"];acDDReg(k,opts.map(o => ({v:o,label:o})),() => (AC_LIST.filters.tracking||{}).stage || "全部",v => {AC_LIST.filters.tracking = {...(AC_LIST.filters.tracking||{}),stage:v};AC_LIST.page = 1;acRender();});return `<div class="ac-field"><label>转化进度</label>${acDD(k,(AC_LIST.filters.tracking||{}).stage||"全部",{sm:true})}</div>`;})()}
  <div class="ac-filter-actions"><button class="ac-btn ghost sm" data-filter-reset="tracking">重置</button></div></div>
  ${acTableX("tracking",cols,rows,{total,pages})}`;
}

/* ===== 财务 ===== */
const csMoney = n => `USD ${Number(n || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const csBadge = (value,kind) => `<span class="ac-badge ${kind || CS_BADGE_KIND[value] || acStat(CS_STATUS_LABEL[value] || value)}">${acEsc(CS_STATUS_LABEL[value] || value)}</span>`;
const csReasonBadges = reasons => reasons?.length ? reasons.map(r => `<span class="cs-reason">${acEsc(CS_REASON_LABEL[r] || r)}</span>`).join("") : `<span class="cs-no-block">无阻断</span>`;
const csLabels = {batches:"结算批次",commissions:"佣金明细"};
function csPeriodLabel(value){return value === "current" ? "当前周期 · 2026-11-01 ~ 2026-11-08" : value === "previous" ? "历史周期" : "全部周期";}
function csStatusOptions(kind){
  return kind === "batch" ? [["all","全部批次状态"],["generating","生成中"],["pending_review","待审批"],["approved","已批准"],["rejected","已驳回"],["settled","已结算"],["failed","生成失败"]]
    : [["all","全部计佣状态"],["calculated","已计佣"],["recalculating","重算中"],["reversed","已冲正"],["rejected","已拒绝"]];
}
function csSelect(key,current,options,label){
  return `<label class="cs-filter-field"><span>${acEsc(label)}</span><select data-cs-draft="${key}">${options.map(([v,text]) => `<option value="${acEsc(v)}" ${String(v)===String(current)?"selected":""}>${acEsc(text)}</option>`).join("")}</select></label>`;
}
function csFilterPanel(tab){
  const f = AC_SETTLEMENT_STATE.draft[tab], prefix = tab === "batches" ? "b." : "c.";
  const searchFields = tab === "batches" ? [["settlement_batch_id","批次号"],["statement_id","结算单号"],["entity","经营主体"]] : [["commission_case_id","佣金案件号"],["settlement_case_id","结算案件号"],["customer_id","客户编号"],["partner_id","合作方编号"]];
  const status = tab === "batches"
    ? `${csSelect(prefix+"period",f.period,[["current","当前周期"],["previous","历史周期"],["all","全部周期"]],"结算周期")}${csSelect(prefix+"batchStatus",f.batchStatus,csStatusOptions("batch"),"批次状态")}${csSelect(prefix+"approvalStatus",f.approvalStatus,[["all","全部审批状态"],["not_submitted","未送审"],["pending_review","待审批"],["approved","审批通过"],["rejected","审批驳回"]],"审批状态")}${csSelect(prefix+"entity",f.entity,[["all","全部经营主体"],["Affiliate US LLC","Affiliate US LLC"],["Affiliate Singapore Pte.","Affiliate Singapore Pte."]],"经营主体")}${csSelect(prefix+"block",f.block,[["all","全部阻断情况"],["has","有阻断"],["none","无阻断"]],"阻断情况")}`
    : `${csSelect(prefix+"period",f.period,[["current","当前周期"],["previous","历史周期"],["all","全部周期"]],"结算周期")}${csSelect(prefix+"commissionStatus",f.commissionStatus,csStatusOptions("commission"),"计佣状态")}${csSelect(prefix+"settlementStatus",f.settlementStatus,[["all","全部结算状态"],["pending","待结算"],["settling","结算中"],["frozen","已冻结"],["released_after_recheck","复核释放"],["settled","已结算"],["rejected","结算已驳回"]],"结算状态")}${csSelect(prefix+"blockReason",f.blockReason,[["all","全部阻断原因"],...Object.entries(CS_REASON_LABEL)],"阻断原因")}${csSelect(prefix+"riskBand",f.riskBand,[["all","全部风险档"],["R1","R1"],["R2","R2"],["R3","R3"],["R4","R4"]],"风险档")}`;
  return `<section class="cs-filter-panel"><div class="cs-filter-row"><label class="cs-filter-field cs-filter-search"><span>精确查询</span><div class="cs-search-control"><select data-cs-draft="${prefix}keywordField">${searchFields.map(([v,text]) => `<option value="${v}" ${f.keywordField===v?"selected":""}>${text}</option>`).join("")}</select><input type="text" data-cs-draft="${prefix}keyword" value="${acEsc(f.keyword)}" placeholder="输入编号后查询"></div></label>${status}<div class="cs-filter-actions"><button class="ac-btn primary sm" data-cs-query="${tab}">查询</button><button class="ac-btn ghost sm" data-cs-reset="${tab}">重置</button></div></div><div class="cs-applied"><span>已生效：</span><strong>${csPeriodLabel(f.period)}</strong><span>·</span><strong>${f.keyword ? `${f.keywordField}=${f.keyword}` : "无关键词"}</strong></div></section>`;
}
function csSyncListFilters(tab){
  const f = AC_SETTLEMENT_STATE.applied[tab], route = `cs-${tab}`;
  const list = {};
  if (f.keyword) list.q = f.keyword.toLowerCase();
  if (f.period !== "current" && f.period !== "all") list.period = f.period;
  Object.entries(f).forEach(([key,value]) => {if (value && value !== "all" && key !== "keyword" && key !== "keywordField" && key !== "period") list[key] = value;});
  AC_LIST.filters[route] = list;
  return route;
}
function csBatchRows(){
  const f = AC_SETTLEMENT_STATE.applied.batches, route = csSyncListFilters("batches");
  return acApplyList(route,AC_SETTLEMENT_BATCHES,(r,lf) => {
    const keyword = (f.keyword || "").toLowerCase();
    const keywordValue = f.keywordField === "statement_id" ? r.statementId : f.keywordField === "entity" ? r.entity : r.id;
    return (!keyword || keywordValue.toLowerCase().includes(keyword))
      && (f.period === "all" || r.periodKey === f.period)
      && (f.batchStatus === "all" || r.batchStatus === f.batchStatus)
      && (f.approvalStatus === "all" || r.approvalStatus === f.approvalStatus)
      && (f.entity === "all" || r.entity === f.entity)
      && (f.block === "all" || (f.block === "has" ? r.blocked > 0 : r.blocked === 0));
  });
}
function csCommissionRows(){
  const f = AC_SETTLEMENT_STATE.applied.commissions, route = csSyncListFilters("commissions");
  return acApplyList(route,AC_SETTLEMENT_CASES,(r,lf) => {
    const keyword = (f.keyword || "").toLowerCase();
    const keywordValue = f.keywordField === "settlement_case_id" ? r.settlementId : f.keywordField === "customer_id" ? r.customer : f.keywordField === "partner_id" ? r.partner : r.id;
    return (!keyword || keywordValue.toLowerCase().includes(keyword))
      && (f.period === "all" || r.periodKey === f.period)
      && (f.commissionStatus === "all" || r.commissionStatus === f.commissionStatus)
      && (f.settlementStatus === "all" || r.settlementStatus === f.settlementStatus)
      && (f.blockReason === "all" || r.reasons.includes(f.blockReason))
      && (f.riskBand === "all" || r.risk === f.riskBand);
  });
}
function csMetricBar(){
  const current = AC_SETTLEMENT_CASES.filter(r => r.periodKey === "current");
  const blocked = current.filter(r => r.reasons.length || r.settlementStatus === "frozen");
  const batches = AC_SETTLEMENT_BATCHES.filter(r => r.periodKey === "current");
  return `<div class="cs-metric-grid">
    <button class="cs-metric" data-cs-metric="pending"><span class="cs-metric-value">${csMoney(current.filter(r => !["settled","rejected"].includes(r.settlementStatus)).reduce((s,r) => s+r.amount,0))}</span><span>待结算金额</span></button>
    <button class="cs-metric" data-cs-metric="settling"><span class="cs-metric-value">${csMoney(current.filter(r => r.settlementStatus === "settling").reduce((s,r) => s+r.amount,0))}</span><span>结算中金额</span></button>
    <button class="cs-metric is-danger" data-cs-metric="blocked"><span class="cs-metric-value">${csMoney(blocked.reduce((s,r) => s+r.amount,0))}</span><span>阻断金额</span></button>
    <button class="cs-metric is-warn" data-cs-metric="approval"><span class="cs-metric-value">${batches.filter(r => r.approvalStatus === "pending_review").length}</span><span>待审批批次</span></button>
    <button class="cs-metric" data-cs-metric="batches"><span class="cs-metric-value">${batches.length}</span><span>本周期批次</span></button>
  </div>`;
}
function pgCommissionBatches(){
  const {rows,total,pages} = csBatchRows();
  const cols = [
    {key:"id",label:"批次号",w:"178px",sortable:true,render:r => `<button class="ac-link" data-cs-batch="${r.id}">${r.id}</button>`},
    {key:"statementId",label:"结算单号",w:"178px",render:r => r.statementId === "—" ? `<span class="cs-muted">尚未生成</span>` : `<button class="ac-link" data-cs-batch="${r.id}">${r.statementId}</button>`},
    {key:"period",label:"结算周期",w:"182px",sortable:true},
    {key:"entity",label:"经营主体",w:"160px"},
    {key:"partners",label:"合作方数",w:"92px",sortable:true},
    {key:"cases",label:"佣金案件数",w:"110px",sortable:true},
    {key:"gross",label:"佣金总额",w:"132px",sortable:true,render:r => `<span class="cs-amount">${csMoney(r.gross)}</span>`},
    {key:"deduct",label:"扣减项",w:"124px",render:r => `<span class="cs-muted">${csMoney(r.deduct)}</span>`},
    {key:"net",label:"可结算净额",w:"144px",sortable:true,render:r => `<strong class="cs-amount">${csMoney(r.net)}</strong>`},
    {key:"blocked",label:"阻断",w:"128px",render:r => r.blocked ? `<button class="cs-inline-alert" data-cs-batch="${r.id}">${r.blocked} 笔 · ${csMoney(r.blockedAmount)}</button>` : `<span class="cs-no-block">无阻断</span>`},
    {key:"batchStatus",label:"批次/审批状态",w:"170px",render:r => `<div class="cs-status-stack">${csBadge(r.batchStatus)}${csBadge(r.approvalStatus)}</div>`},
    {label:"操作",w:"172px",actions:true,render:r => `<button class="ac-link" data-cs-batch="${r.id}">查看</button>${r.batchStatus==="rejected"?`<button class="ac-link" data-cs-regenerate="${r.id}">重生成</button>`:""}${r.statementId!=="—"?`<button class="ac-link" data-cs-download="${r.statementId}">下载</button>`:""}`},
  ];
  return `<div class="cs-table-head"><div><strong>结算批次</strong><span>共 ${total} 批 · 服务端快照 ${AC_SETTLEMENT_STATE.dataAsOf}</span></div><button class="ac-btn secondary sm" data-cs-export="batches">导出当前结果</button></div>${acTableX("cs-batches",cols,rows,{total,pages})}`;
}
function pgCommissionCases(){
  const {rows,total,pages} = csCommissionRows();
  const cols = [
    {key:"id",label:"佣金案件号",w:"186px",sortable:true,render:r => `<button class="ac-link" data-cs-case="${r.id}">${r.id}</button>`},
    {key:"settlementId",label:"结算案件号",w:"186px"},
    {key:"customer",label:"客户",w:"196px",render:r => `<button class="cs-customer" data-cs-case="${r.id}"><strong>${r.customer}</strong><span>${r.email}</span></button>`},
    {key:"partner",label:"合作方",w:"178px",render:r => `<span class="cs-two-line"><strong>${r.partner}</strong><span>${acEsc(r.partnerName)}</span></span>`},
    {key:"tier",label:"资格/里程碑",w:"142px"},
    {key:"components",label:"构成",w:"220px",render:r => `<span class="cs-truncate" title="${acEsc(r.components)}">${acEsc(r.components)}</span>`},
    {key:"amount",label:"佣金金额",w:"130px",sortable:true,render:r => `<span class="cs-amount">${csMoney(r.amount)}</span>`},
    {key:"commissionStatus",label:"计佣状态",w:"112px",render:r => csBadge(r.commissionStatus)},
    {key:"settlementStatus",label:"结算状态",w:"124px",render:r => csBadge(r.settlementStatus)},
    {key:"reasons",label:"阻断原因",w:"220px",render:r => csReasonBadges(r.reasons)},
    {key:"due",label:"结算到期",w:"168px"},
    {key:"batchId",label:"所属批次",w:"176px",render:r => r.batchId === "—" ? `<span class="cs-muted">未入批次</span>` : `<button class="ac-link" data-cs-batch="${r.batchId}">${r.batchId}</button>`},
    {key:"version",label:"版本快照",w:"150px",render:r => `<span class="cs-muted">${acEsc(r.version)}</span>`},
    {label:"操作",w:"180px",actions:true,render:r => `<button class="ac-link" data-cs-case="${r.id}">查看</button>${r.reasons.length?`<button class="ac-link" data-cs-processing="${r.id}">查阻断</button>`:""}${r.settlementStatus==="frozen"?`<button class="ac-link" data-cs-processing="${r.id}">处理中心</button>`:""}`},
  ];
  return `<div class="cs-table-head"><div><strong>佣金明细</strong><span>共 ${total} 案件 · 当前案件阻断不扩散至其他案件</span></div><button class="ac-btn secondary sm" data-cs-export="commissions">导出当前结果</button></div>${acTableX("cs-commissions",cols,rows,{total,pages})}`;
}
function pgCommissionSettlement(){
  const tab = AC_STATE.tab === "commissions" ? "commissions" : "batches";
  return `${acPagehead("佣金结算","佣金底账、结算批次与结算前阻断的一体工作台",`<button class="ac-btn primary" data-cs-open-generator>＋ 生成结算批次</button><button class="ac-btn secondary" data-cs-refresh>刷新</button><button class="ac-btn secondary" data-cs-export="${tab}">导出</button>`)}
  <div class="cs-freshness"><span class="cs-live-dot"></span> 数据截至 ${AC_SETTLEMENT_STATE.dataAsOf} · 币种 USD · 结算时区 UTC+08:00 <span>阻断案件只影响当前案件，不冻结整批次。</span></div>
  ${csMetricBar()}
  ${acTabs([{id:"batches",label:"结算批次",count:AC_SETTLEMENT_BATCHES.length},{id:"commissions",label:"佣金明细",count:AC_SETTLEMENT_CASES.length}],tab,"commission-settlement")}
  ${csFilterPanel(tab)}
  ${tab === "batches" ? pgCommissionBatches() : pgCommissionCases()}`;
}
function pgWithdrawals(){
  const cols = [
    {key:"id",label:"提现单号",w:"100px",sortable:true},{key:"partner",label:"合作方",w:"90px",sortable:true,render:r => `<button class="ac-link" data-partner="${r.partner}">${r.partner}</button>`},
    {key:"amt",label:"申请金额",w:"96px",sortable:true,render:r => acMoney(r.amt)},
    {key:"fee",label:"手续费",w:"80px",render:r => acMoney(r.fee)},
    {key:"real",label:"实际到账",w:"96px",sortable:true,render:r => `<strong>${acMoney(r.real)}</strong>`},
    {key:"acct",label:"收款账户",w:"120px",render:r => `<span style="color:var(--muted)">${r.acct}</span>`},
    {key:"time",label:"申请时间",w:"112px",sortable:true},
    {key:"status",label:"状态",w:"80px",sortable:true,render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {label:"操作",w:"96px",actions:true,render:r => r.status==="待审核"?`<button class="ac-link" data-wd="${r.id}">审核</button>`:r.status==="失败"?`<button class="ac-link" data-toast="重试支付（幂等防重复出款）">重试</button>`:`<button class="ac-link" data-toast="提现详情">详情</button>`},
  ];
  const {rows,total,pages} = acApplyList("withdrawals",AC_DB.withdrawals,(r,f) => (!f.q || [r.id,r.partner].join(" ").toLowerCase().includes(f.q)) && (!f.status || f.status === "全部" || r.status === f.status));
  return `${acPagehead("提现","MVP全人工审核 · 收款信息核验 · 共"+AC_DB.withdrawals.length+"单")}
  ${acMetricBar([{num:AC_DB.withdrawals.filter(w=>w.status==="待审核").length,label:"待审核",tone:"warn"},{num:acMoney(14850),label:"今日已付"},{num:AC_DB.withdrawals.filter(w=>w.status==="失败").length,label:"失败待处理",tone:"danger"},{num:acMoney(AC_DB.withdrawals.filter(w=>["已支付"].includes(w.status)).reduce((a,w)=>a+w.amt,0)),label:"累计已付"}])}
  <div class="ac-filter">${acSearch("withdrawals","搜索 单号 / 合作方")}
  ${(()=>{const k = "f.wd.status";const opts = ["全部","待审核","已通过","支付中","已支付","失败","已驳回"];acDDReg(k,opts.map(o => ({v:o,label:o})),() => (AC_LIST.filters.withdrawals||{}).status || "全部",v => {AC_LIST.filters.withdrawals = {...(AC_LIST.filters.withdrawals||{}),status:v};AC_LIST.page = 1;acRender();});return `<div class="ac-field"><label>状态</label>${acDD(k,(AC_LIST.filters.withdrawals||{}).status||"全部",{sm:true})}</div>`;})()}
  <div class="ac-filter-actions"><button class="ac-btn ghost sm" data-filter-reset="withdrawals">重置</button></div></div>
  ${acTableX("withdrawals",cols,rows,{total,pages})}`;
}
function pgRecon(){
  const months = [{m:"2026-10",s:"可关账",ok:true},{m:"2026-09",s:"已关账"},{m:"2026-08",s:"已关账"}];
  return `${acPagehead("对账与关账","内部一致性：佣金总账 vs 结算+提现流水（MVP）","<button class='ac-btn primary' data-toast='发起对账：选周期→自动核对→差异报告'>⇄ 发起对账</button>")}
  <div class="ac-cov-row">${months.map(c => `<div class="ac-cov ${c.ok?"":"done"}"><strong>${c.m}</strong><span class="ac-badge ${c.ok?"is-green":"is-gray"}">${c.s}</span>${c.ok?`<button class="ac-btn secondary sm" data-toast="关账：差异清零确认（需审批）">关账</button>`:""}</div>`).join("")}</div>
  ${acTable([
    {key:"id",label:"差异编号",w:"92px"},{key:"cycle",label:"周期",w:"80px"},{key:"type",label:"类型",w:"96px",render:r => `<span class="ac-badge is-red">${r.type}</span>`},
    {key:"desc",label:"差异描述"},{key:"amt",label:"金额",w:"88px",render:r => acMoney(r.amt)},
    {key:"obj",label:"涉及对象",w:"110px",render:r => `<button class="ac-link" data-toast="跳转对象">${r.obj}</button>`},
    {key:"status",label:"状态",w:"76px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {label:"操作",w:"60px",actions:true,render:r => r.status==="待处理"?`<button class="ac-link" data-toast="处理：修正/容忍（需审批）/生成调查任务">处理</button>`:`<button class="ac-link" data-toast="差异详情">详情</button>`},
  ],AC_DB.recon,{page:false})}`;
}

/* ===== 风控 ===== */
function pgRisk(){
  const tab = AC_STATE.tab || "objects";
  let body = "";
  if (tab === "objects") {
    body = acFilterBar("risk",[{key:"type",label:"类型",options:["全部类型","合作方","客户","集群"]},{key:"src",label:"来源",options:["全部来源","规则命中","评分","CRM欺诈库"]},{key:"grade",label:"风险等级",options:["全部","R1","R2","R3","R4"]}]) +
    acTable([
      {key:"obj",label:"对象",w:"96px",render:r => `<button class="ac-link" data-riskobj='${acEsc(JSON.stringify(r))}'>${r.obj}</button>`},
      {key:"type",label:"类型",w:"70px"},{label:"风险等级",w:"76px",render:r => `<span class="ac-grade" data-g="r${String(5-Number(r.grade.slice(1)))}">${r.grade}</span>`},
      {key:"src",label:"命中来源",w:"110px"},{key:"evid",label:"关键证据"},{key:"amt",label:"影响金额",w:"92px",render:r => acMoney(r.amt)},
      {label:"操作",w:"120px",actions:true,render:r => `<button class="ac-link" data-riskobj='${acEsc(JSON.stringify(r))}'>查档案</button><button class="ac-link" data-toast="已生成风险复核任务（复核员→主管审批）">生成复核</button>`},
    ],AC_DB.riskObjects);
  } else if (tab === "clusters") {
    body = acTable([
      {key:"id",label:"集群",w:"90px",render:r => `<button class="ac-link" data-toast="集群详情：成员关系表（MVP降级方案）">${r.id}</button>`},
      {key:"rel",label:"关联特征",w:"150px"},{key:"members",label:"成员数",w:"76px"},{key:"amt",label:"影响佣金",w:"96px",render:r => acMoney(r.amt)},
      {key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
      {label:"操作",w:"130px",actions:true,render:r => `<button class="ac-link" data-toast="成员关系表：节点+共享特征+关联强度">成员表</button><button class="ac-link" data-toast="选中成员→移出集群→复核确认">误合并拆分</button>`},
    ],AC_DB.clusters);
  } else {
    body = acTable([
      {key:"type",label:"类型",w:"90px"},{key:"val",label:"特征值",w:"120px"},{key:"reason",label:"加入原因"},{key:"src",label:"来源",w:"90px"},{key:"time",label:"加入时间",w:"90px"},
      {key:"status",label:"状态",w:"72px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
      {label:"操作",w:"76px",actions:true,render:r => `<button class="ac-link" data-toast="移出申请→生成复核任务（不直接移出）">移出申请</button>`},
    ],AC_DB.blacklist);
  }
  return `${acPagehead("风险工作台","风控唯一入口 · 处理全走任务队列")}
  ${acMetricBar([{num:3,label:"待复核任务",tone:"warn"},{num:2,label:"高风险对象",tone:"danger"},{num:acMoney(4260),label:"隔离中佣金"},{num:11,label:"今日新增命中"}])}
  ${acTabs([{id:"objects",label:"风险对象",count:5},{id:"clusters",label:"集群",count:3},{id:"blacklist",label:"黑名单",count:5}],tab,"risk")}
  ${body}`;
}
function pgTickets(){
  return `${acPagehead("一般工单","受理 · 答复 · 转办 · 转风险复核/申诉")}
  ${acTable([
    {key:"id",label:"工单号",w:"90px",render:r => `<button class="ac-link" data-ticket="${r.id}">${r.id}</button>`},
    {key:"type",label:"类型",w:"66px"},{key:"partner",label:"合作方",w:"84px",render:r => `<button class="ac-link" data-partner="${r.partner}">${r.partner}</button>`},
    {key:"subject",label:"主题"},{key:"priority",label:"优先级",w:"72px",render:r => acPrio(r.priority)},
    {label:"剩余处理时间",w:"138px",render:r => `<span class="ac-sla ${r.sla<=0?"is-over":r.sla<8?"is-warn":""}">${acFmtSLA(r.sla)}</span>`},
    {key:"status",label:"状态",w:"76px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {label:"操作",w:"60px",actions:true,render:r => `<button class="ac-link" data-ticket="${r.id}">处理</button>`},
  ],AC_DB.tickets)}`;
}

/* ===== 消息 ===== */
function pgNotifications(){
  return `${acPagehead("通知中心","站内+邮件 · 模板版本只读（MVP硬编码）")}
  ${acFilterBar("ntf",[{key:"ch",label:"渠道",options:["全部渠道","站内","邮件"]},{key:"ev",label:"事件",options:["全部事件","审批","结算","提现","风险","系统","公告"]},{key:"status",label:"状态",options:["全部状态","成功","失败","退信"]}])}
  ${acTable([
    {key:"time",label:"时间",w:"140px"},{key:"ev",label:"事件",w:"120px"},{key:"to",label:"接收方",w:"130px"},{key:"ch",label:"渠道",w:"90px"},
    {key:"tpl",label:"模板版本",w:"80px",render:r => `<span style="color:var(--muted)">${r.tpl}</span>`},
    {key:"status",label:"状态",w:"72px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {label:"操作",w:"76px",actions:true,render:r => r.status==="成功"?`<button class="ac-link" data-toast="投递明细：首次+重试记录">查看</button>`:`<button class="ac-link" data-toast="重发（幂等防重复通知）">重发</button>`},
  ],AC_DB.notifications)}`;
}
function pgAnnouncements(){
  return `${acPagehead("公告管理","发布 · 置顶 · 有效期 · 撤回（⑩B独立管理）","<button class='ac-btn primary' data-toast='新建公告：标题+富文本+生效时间+有效期+置顶'>✎ 新建公告</button>")}
  ${acTable([
    {key:"title",label:"标题",render:r => `<strong>${acEsc(r.title)}</strong>${r.top?` <span class="ac-badge is-orange">置顶</span>`:""}`},
    {key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {key:"pub",label:"发布时间",w:"120px"},{key:"exp",label:"有效期至",w:"90px"},{key:"reads",label:"阅读数",w:"76px"},
    {label:"操作",w:"150px",actions:true,render:r => r.status==="草稿"?`<button class="ac-link" data-toast="编辑草稿">编辑</button><button class="ac-link" data-toast="发布公告">发布</button>`:`<button class="ac-link" data-toast="${r.top?"取消置顶":"置顶"}">${r.top?"取消置顶":"置顶"}</button><button class="ac-link danger" data-toast="撤回（合作方端显示已撤回，保留记录）">撤回</button>`},
  ],AC_DB.announcements)}`;
}

/* ===== 统计 ===== */
function acSummary(cards){return `<div class="ac-summary">${cards.map(c => `<div class="ac-summary-card"><small>${acEsc(c[0])}</small><strong>${c[1]}${c[2]?`<em class="${c[2].startsWith("-")?"down":"up"}">${c[2].startsWith("-")?"▾":"▴"}${c[2].replace("-","")}</em>`:""}</strong></div>`).join("")}</div>`;}
function acBars(rows){const max = Math.max(...rows.map(r => r[1]));return `<div class="ac-bars">${rows.map(r => `<div class="ac-bar-row"><span>${acEsc(r[0])}</span><div class="ac-bar-track"><div class="ac-bar" style="width:${Math.max(4,r[1]/max*100).toFixed(0)}%"></div></div><strong>${acEsc(r[2])}</strong></div>`).join("")}</div>`;}
function analyticsMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}
function analyticsPercent(value) {
  return value == null || Number.isNaN(Number(value)) ? "—" : `${Number(value).toFixed(2)}%`;
}
function analyticsPeriodLabel(value) {
  return ({today:"今天",d7:"近7天",d30:"近30天",month:"本月",lastmonth:"上月",custom:"自定义"}[value] || "本月");
}
function analyticsFactor(period) {
  return ({today:.18,d7:.42,d30:.78,month:1,lastmonth:.91,custom:.64}[period] || 1);
}
function analyticsPartnerRows() {
  const applied = AC_STATE.analytics.applied;
  const all = AC_DB.analyticsPerf.map((row, index) => {
    const partner = AC_DB.partners.find(item => item.id === row.id) || {};
    const factor = analyticsFactor(applied.period);
    const clicks = Math.round(row.clicks * factor);
    const regs = Math.round(row.regs * factor);
    const ftd = Math.round(row.ftd * factor);
    const vftd = Math.round(row.vftd * factor);
    const comm = Math.round(row.comm * factor);
    return {
      ...row,
      order: index,
      status: partner.status || "合作中",
      country: partner.country || ["印尼","越南","泰国","墨西哥"][index % 4],
      clicks,
      regs,
      ftd,
      vftd,
      comm,
      regRate: regs ? vftd / regs * 100 : null,
      ftdRate: ftd ? vftd / ftd * 100 : null,
      avgCost: vftd ? comm / vftd : null,
      delta: [12.4, 8.1, -3.2, 5.6, 1.8, -1.4, 6.8, 2.1, -4.7, 3.9][index] || 0,
    };
  });
  return all.filter(row => {
    const f = applied;
    const linked = AC_DB.tracking.filter(item => item.partner === row.id);
    const trackingMatches = linked.filter(item =>
      (f.subId === "全部 Sub ID" || item.sub === f.subId) &&
      (f.link === "全部链接" || item.link === f.link) &&
      (f.activity === "全部活动" || item.activity === f.activity));
    return (f.partner === "全部合作方" || f.partner === row.id)
      && (f.country === "全部国家" || f.country === row.country)
      && (f.status.includes(row.status) || (f.status.includes("启用") && row.status === "合作中"))
      && ((f.subId === "全部 Sub ID" && f.link === "全部链接" && f.activity === "全部活动") || trackingMatches.length > 0);
  });
}
function analyticsSummary(rows) {
  const factor = analyticsFactor(AC_STATE.analytics.applied.period);
  const totals = rows.reduce((acc, row) => {
    acc.validClicks += row.clicks;
    acc.registrations += row.regs;
    acc.ftd += row.ftd;
    acc.effectiveFtd += row.vftd;
    acc.commission += row.comm;
    return acc;
  }, {validClicks:0, registrations:0, ftd:0, effectiveFtd:0, commission:0});
  const rawClicks = Math.round(totals.validClicks / .84);
  const commissionCases = Math.round(totals.effectiveFtd * 1.06);
  return {
    ...totals,
    rawClicks,
    commissionCases,
    registrationRate: totals.registrations ? totals.effectiveFtd / totals.registrations * 100 : null,
    ftdRate: totals.ftd ? totals.effectiveFtd / totals.ftd * 100 : null,
    avgCost: totals.effectiveFtd ? totals.commission / totals.effectiveFtd : null,
    previous: {
      validClicks: Math.round(totals.validClicks / (1 + .12 * factor)),
      registrations: Math.round(totals.registrations / (1 + .08 * factor)),
      ftd: Math.round(totals.ftd / (1 + .05 * factor)),
      effectiveFtd: Math.round(totals.effectiveFtd / (1 + .03 * factor)),
      commission: Math.round(totals.commission / (1 - .02 * factor)),
      avgCost: totals.effectiveFtd ? totals.commission / totals.effectiveFtd / (1 - .02 * factor) : null,
    }
  };
}
function analyticsDelta(current, previous, suffix = "%") {
  if (previous == null || previous === 0 || current == null) return "—";
  const value = suffix === "pp" ? current - previous : (current - previous) / Math.abs(previous) * 100;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${suffix}`;
}
function analyticsMetricCard(key, label, value, delta, hint, kind = "number") {
  const display = kind === "money" ? analyticsMoney(value) : kind === "percent" ? analyticsPercent(value) : Number(value || 0).toLocaleString("en-US");
  const tone = delta.startsWith("-") ? "down" : delta === "—" ? "flat" : "up";
  return `<button class="ac-analytics-metric ${AC_STATE.analytics.metric === key ? "is-selected" : ""}" type="button" data-analytics-metric="${key}" title="${acEsc(hint)}">
    <span class="ac-analytics-metric-label">${acEsc(label)}</span>
    <strong>${display}</strong>
    <span class="ac-analytics-metric-meta"><em class="${tone}">${tone === "up" ? "↑" : tone === "down" ? "↓" : "·"} ${acEsc(delta)}</em><small>${acEsc(hint)}</small></span>
  </button>`;
}
function analyticsTrendData(summary) {
  const metric = AC_STATE.analytics.trendMetric;
  const defs = {
    valid_clicks: {label:"有效点击", values:[.70,.77,.73,.82,.86,.91,1], previous:[.64,.68,.70,.74,.77,.80,.84], format:v => Number(v).toLocaleString("en-US")},
    registrations: {label:"注册", values:[.61,.65,.59,.73,.76,.84,1], previous:[.57,.61,.63,.64,.69,.74,.78], format:v => Number(v).toLocaleString("en-US")},
    ftd_customers: {label:"FTD 客户", values:[.52,.58,.55,.66,.69,.78,1], previous:[.47,.51,.53,.56,.62,.68,.74], format:v => Number(v).toLocaleString("en-US")},
    effective_ftd: {label:"有效 FTD", values:[.48,.54,.51,.63,.68,.82,1], previous:[.44,.48,.51,.56,.61,.69,.76], format:v => Number(v).toLocaleString("en-US")},
    accrued_commission: {label:"应计佣金", values:[.42,.49,.46,.58,.67,.77,1], previous:[.41,.44,.49,.53,.58,.64,.70], format:v => analyticsMoney(v)},
    avg_cost: {label:"有效 FTD 平均佣金成本", values:[.94,.90,.92,.87,.88,.84,1], previous:[.97,.95,.94,.93,.91,.90,.89], format:v => analyticsMoney(v)},
  };
  const def = defs[metric] || defs.effective_ftd;
  const base = metric === "valid_clicks" ? summary.validClicks : metric === "registrations" ? summary.registrations : metric === "ftd_customers" ? summary.ftd : metric === "accrued_commission" ? summary.commission : metric === "avg_cost" ? summary.avgCost : summary.effectiveFtd;
  const labels = AC_STATE.analytics.applied.period === "today" ? ["00:00","04:00","08:00","12:00","16:00","20:00","现在"] : ["11/03","11/04","11/05","11/06","11/07","11/08","今天"];
  return {def, labels, current:def.values.map(v => base * v), previous:def.previous.map(v => base * v * .92)};
}
function analyticsTrendPanel(summary) {
  const trend = analyticsTrendData(summary);
  const max = Math.max(...trend.current, ...(AC_STATE.analytics.compare ? trend.previous : []), 1);
  return `<section class="ac-analytics-panel ac-analytics-trend">
    <header class="ac-analytics-panel-head"><div><h2>趋势</h2><p>${acEsc(trend.def.label)} · ${acEsc(analyticsPeriodLabel(AC_STATE.analytics.applied.period))}</p></div>
      <div class="ac-analytics-chart-controls"><select data-analytics-trend aria-label="趋势指标">${[
        ["effective_ftd","有效 FTD"],["valid_clicks","有效点击"],["registrations","注册"],["ftd_customers","FTD 客户"],["accrued_commission","应计佣金"],["avg_cost","有效 FTD 平均佣金成本"]
      ].map(([v,l]) => `<option value="${v}" ${v===AC_STATE.analytics.trendMetric?"selected":""}>${l}</option>`).join("")}</select>
      <label class="ac-analytics-toggle"><input type="checkbox" data-analytics-compare ${AC_STATE.analytics.compare?"checked":""}> 对比上一周期</label></div>
    </header>
    <div class="ac-analytics-chart" role="img" aria-label="${acEsc(trend.def.label)}趋势图">
      <div class="ac-analytics-axis"><span>${acEsc(trend.def.format(max))}</span><span>${acEsc(trend.def.format(max * .5))}</span><span>0</span></div>
      <div class="ac-analytics-bars">${trend.current.map((value, index) => `<div class="ac-analytics-point"><div class="ac-analytics-bar" style="height:${Math.max(8,value/max*100)}%" title="${acEsc(trend.labels[index])}：${acEsc(trend.def.format(value))}"></div>${AC_STATE.analytics.compare ? `<i class="ac-analytics-compare-point" style="height:${Math.max(6,trend.previous[index]/max*100)}%" title="上一周期：${acEsc(trend.def.format(trend.previous[index]))}"></i>` : ""}<small>${acEsc(trend.labels[index])}</small></div>`).join("")}</div>
    </div>
    <footer class="ac-analytics-chart-foot"><span><i class="current"></i>本周期</span>${AC_STATE.analytics.compare ? `<span><i class="previous"></i>上一等长周期</span>` : ""}<span class="ac-analytics-chart-note">数据状态：部分数据，待补数</span></footer>
  </section>`;
}
function analyticsFunnelPanel(summary) {
  const steps = [
    ["原始点击", summary.rawClicks, null],
    ["有效点击", summary.validClicks, summary.rawClicks ? summary.validClicks / summary.rawClicks * 100 : null],
    ["注册", summary.registrations, summary.validClicks ? summary.registrations / summary.validClicks * 100 : null],
    ["FTD", summary.ftd, summary.registrations ? summary.ftd / summary.registrations * 100 : null],
    ["有效 FTD", summary.effectiveFtd, summary.ftd ? summary.effectiveFtd / summary.ftd * 100 : null],
    ["计佣案件", summary.commissionCases, summary.effectiveFtd ? summary.commissionCases / summary.effectiveFtd * 100 : null],
  ];
  const max = Math.max(...steps.map(step => step[1]), 1);
  return `<section class="ac-analytics-panel ac-analytics-funnel"><header class="ac-analytics-panel-head"><div><h2>经营漏斗</h2><p>点击 → 转化 → 计佣案件 · 同一报表快照</p></div><span class="ac-badge is-orange">部分数据，待补数</span></header>
    <div class="ac-analytics-funnel-list">${steps.map((step, index) => `<div class="ac-analytics-funnel-row"><div class="ac-analytics-funnel-label"><strong>${acEsc(step[0])}</strong><small>${index === 0 ? "去重点击" : step[2] == null ? "—" : `较上一步 ${step[2].toFixed(2)}%`}</small></div><div class="ac-analytics-funnel-track"><div style="width:${Math.max(12, step[1]/max*100)}%"></div></div><strong class="ac-analytics-funnel-value">${Number(step[1]).toLocaleString("en-US")}</strong></div>`).join("")}</div>
    <p class="ac-analytics-panel-note">原始点击保留未归属、硬风险排除等来源状态；明细请从合作方构成继续下钻。</p>
  </section>`;
}
function analyticsFilterPanel() {
  const draft = AC_STATE.analytics.draft;
  const options = {
    period: [["month","本月"],["today","今天"],["d7","近7天"],["d30","近30天"],["lastmonth","上月"],["custom","自定义"]],
    partner: [["全部合作方","全部合作方"], ...AC_DB.analyticsPerf.slice(0,6).map(r => [r.id, `${r.id} · ${r.name}`])],
    country: [["全部国家","全部国家"], ...[...new Set(AC_DB.analyticsPerf.map((r,i) => AC_DB.partners.find(p => p.id === r.id)?.country || ["印尼","越南","泰国"][i % 3]))].map(v => [v,v])],
    subId: [["全部 Sub ID","全部 Sub ID"],["siteresia","siteresia"],["tg_vn","tg_vn"],["fb_th","fb_th"],["ng_bulk","ng_bulk"]],
    activity: [["全部活动","全部活动"],["活动-标准开户链接","活动-标准开户链接"],["活动-移动端促活","活动-移动端促活"]],
    link: [["全部链接","全部链接"],["L-2001","L-2001"],["L-2002","L-2002"],["L-2014","L-2014"]],
  };
  const select = (key, label) => `<label class="ac-analytics-filter-field"><span>${label}</span><select data-analytics-draft="${key}">${options[key].map(([v,l]) => `<option value="${acEsc(v)}" ${String(draft[key])===String(v)?"selected":""}>${acEsc(l)}</option>`).join("")}</select></label>`;
  const status = ["启用","暂停","冻结","清退中","已清退"];
  const selectedTags = [
    draft.period !== "month" ? ["period", analyticsPeriodLabel(draft.period)] : null,
    draft.partner !== "全部合作方" ? ["partner", draft.partner] : null,
    draft.country !== "全部国家" ? ["country", draft.country] : null,
    draft.subId !== "全部 Sub ID" ? ["subId", draft.subId] : null,
    draft.activity !== "全部活动" ? ["activity", draft.activity] : null,
    draft.link !== "全部链接" ? ["link", draft.link] : null,
  ].filter(Boolean);
  return `<section class="ac-analytics-filters"><div class="ac-analytics-filter-head"><div><h2>查询条件</h2><p>改动暂存，点击查询后统一生效 · 统计时区：Asia/Shanghai（UTC+08:00）</p></div><span class="ac-analytics-snapshot">快照 ${AC_STATE.analytics.loading ? "生成中…" : "PERF-20261109-001"} · 更新于 2026-11-09 10:24</span></div>
    <div class="ac-analytics-filter-grid">${select("period","时间范围")}${select("partner","合作方")}${select("country","国家")}<div class="ac-analytics-status-field"><span>合作方状态</span><div class="ac-analytics-statuses">${status.map(v => `<label><input type="checkbox" data-analytics-status="${v}" ${draft.status.includes(v)?"checked":""}>${v}</label>`).join("")}</div></div>
      <details class="ac-analytics-more"><summary>更多筛选</summary><div class="ac-analytics-more-grid">${select("subId","Sub ID")}${select("activity","活动")}${select("link","链接")}</div></details>
    </div>
    <div class="ac-analytics-filter-foot"><div class="ac-analytics-selected">${selectedTags.length ? selectedTags.map(([key,label]) => `<span class="ac-analytics-tag">${acEsc(label)}<button type="button" data-analytics-clear="${key}" aria-label="移除${acEsc(label)}">×</button></span>`).join("") : `<span class="ac-analytics-no-tags">当前为默认范围</span>`}</div><div class="ac-actions"><button class="ac-btn ghost sm" data-analytics-reset>重置</button><button class="ac-btn primary sm" data-analytics-query>查询</button></div></div>
  </section>`;
}
function analyticsBreakdownRows(row, tab) {
  const seed = {sub_id:["siteresia","tg_vn","fb_th","ng_bulk"],country:[row.country,"越南","泰国","墨西哥"],activity:["活动-标准开户链接","活动-移动端促活","活动-社群再营销"],link:["L-2001","L-2002","L-2014","L-2020"]}[tab] || ["siteresia"];
  return seed.map((name,index) => {
    const factor = [1,.62,.38,.24][index] || .18;
    const vftd = Math.max(1, Math.round(row.vftd * factor));
    const ftd = Math.max(vftd, Math.round(row.ftd * factor));
    const regs = Math.max(ftd, Math.round(row.regs * factor));
    const clicks = Math.max(regs, Math.round(row.clicks * factor));
    return {name, status:tab === "link" ? (index === 3 ? "暂停" : "启用") : null, subId:tab === "link" ? seed[index % 4] : name, clicks, regs, ftd, vftd, rate:regs ? vftd/regs*100 : null, comm:Math.round(row.comm*factor), avg:vftd ? row.comm*factor/vftd : null};
  });
}
function analyticsBreakdownDrawer(partnerId) {
  const row = analyticsPartnerRows().find(item => item.id === partnerId) || analyticsPartnerRows()[0];
  if (!row) return;
  const tabs = [["sub_id","Sub ID"],["country","国家"],["activity","活动"],["link","链接"]];
  const makeTab = tab => {
    const rows = analyticsBreakdownRows(row, tab);
    const headers = tab === "link" ? ["链接 ID","链接状态","Sub ID","有效点击","注册","FTD","有效 FTD","转化率","应计佣金"] : [tab === "sub_id" ? "Sub ID" : tab === "country" ? "国家" : "活动","有效点击","注册","FTD","有效 FTD","转化率","应计佣金","平均成本"];
    return `<div class="ac-analytics-breakdown-table"><table class="ac-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(item => tab === "link" ? `<tr><td><button class="ac-link" data-go="tracking">${acEsc(item.name)}</button></td><td><span class="ac-badge ${acStat(item.status)}">${item.status}</span></td><td>${acEsc(item.subId)}</td><td>${item.clicks.toLocaleString("en-US")}</td><td>${item.regs.toLocaleString("en-US")}</td><td>${item.ftd.toLocaleString("en-US")}</td><td>${item.vftd.toLocaleString("en-US")}</td><td>${analyticsPercent(item.rate)}</td><td>${analyticsMoney(item.comm)}</td></tr>` : `<tr><td><button class="ac-link" data-go="${tab === "sub_id" ? "tracking" : "partners"}">${acEsc(item.name)}</button></td><td>${item.clicks.toLocaleString("en-US")}</td><td>${item.regs.toLocaleString("en-US")}</td><td>${item.ftd.toLocaleString("en-US")}</td><td>${item.vftd.toLocaleString("en-US")}</td><td>${analyticsPercent(item.rate)}</td><td>${analyticsMoney(item.comm)}</td><td>${analyticsMoney(item.avg)}</td></tr>`).join("")}</tbody></table></div>`;
  };
  acDrawer({title:`${row.name} · 经营构成`,sub:`${row.id} · ${row.status} · ${analyticsPeriodLabel(AC_STATE.analytics.applied.period)} · Asia/Shanghai（UTC+08:00）`,badge:`<span class="ac-badge is-orange">部分数据，待补数</span>`,wide:true,tabs:tabs.map(([id,label]) => ({id,label,html:`${id === "sub_id" ? `<div class="ac-analytics-drawer-summary">${acKV([["有效 FTD",row.vftd.toLocaleString("en-US")],["应计佣金",analyticsMoney(row.comm)],["平均成本",analyticsMoney(row.avgCost)],["快照","PERF-20261109-001"]])}</div>` : ""}${makeTab(id)}`})),foot:`<button class="ac-btn secondary" data-dclose>关闭</button>`});
}
function analyticsExportModal() {
  const applied = AC_STATE.analytics.applied;
  const status = AC_STATE.analytics.exportStatus;
  acModal({title:"创建经营分析导出任务",size:"wide",body:`<div class="ac-analytics-export"><div class="ac-analytics-export-summary"><strong>当前查询范围</strong><span>${analyticsPeriodLabel(applied.period)} · ${applied.partner} · ${applied.country}</span><span>快照 PERF-20261109-001 · 预计 10 家合作方</span></div><label class="ac-form-item"><span>导出内容</span><select data-analytics-export-scope><option>汇总 + 合作方明细</option><option>仅汇总</option><option>合作方构成明细</option></select></label><label class="ac-form-item"><span>文件格式</span><select><option>CSV</option><option>XLSX</option></select></label><label class="ac-form-item"><span>字段范围</span><select><option>脱敏字段（推荐）</option><option>仅内部字段</option></select></label>${status ? `<div class="ac-analytics-export-result"><span class="ac-badge is-green">已创建</span><strong>${status}</strong><small>导出中心将显示处理进度，文件 24 小时后过期。</small></div>` : ""}</div>`,foot:status?`<button class="ac-btn primary" data-mclose>完成</button>`:`<button class="ac-btn secondary" data-mclose>取消</button><button class="ac-btn primary" data-analytics-export-submit>创建导出任务</button>`});
}
function pgAnalyticsPerf(){
  const rows = analyticsPartnerRows();
  const summary = analyticsSummary(rows);
  const d = summary.previous;
  const metrics = [
    analyticsMetricCard("valid_clicks","有效点击",summary.validClicks,analyticsDelta(summary.validClicks,d.validClicks),"有效且未排除的去重 click_id"),
    analyticsMetricCard("registrations","注册",summary.registrations,analyticsDelta(summary.registrations,d.registrations),"已归属并完成注册的去重 customer_id"),
    analyticsMetricCard("ftd_customers","FTD 客户",summary.ftd,analyticsDelta(summary.ftd,d.ftd),"至少一笔 CRM 到账首入金"),
    analyticsMetricCard("effective_ftd","有效 FTD 客户",summary.effectiveFtd,analyticsDelta(summary.effectiveFtd,d.effectiveFtd),"通过资格、KYC、净入金、交易和合规校验"),
    analyticsMetricCard("registration_to_effective_ftd_rate","注册→有效 FTD 率",summary.registrationRate,analyticsDelta(summary.registrationRate, d.registrations ? d.effectiveFtd/d.registrations*100 : null,"pp"),"有效 FTD ÷ 注册", "percent"),
    analyticsMetricCard("ftd_to_effective_ftd_rate","FTD→有效 FTD 率",summary.ftdRate,analyticsDelta(summary.ftdRate, d.ftd ? d.effectiveFtd/d.ftd*100 : null,"pp"),"有效 FTD ÷ FTD", "percent"),
    analyticsMetricCard("accrued_commission","应计佣金",summary.commission,analyticsDelta(summary.commission,d.commission),"基础 CPA、附加和调整合计","money"),
    analyticsMetricCard("avg_commission_cost_per_effective_ftd","有效 FTD 平均佣金成本",summary.avgCost,analyticsDelta(summary.avgCost,d.avgCost),"应计佣金 ÷ 有效 FTD","money"),
  ];
  const sortedRows = rows.slice().sort((a,b) => b.vftd - a.vftd);
  const table = sortedRows.length ? `<div class="ac-table-wrap ac-analytics-table-wrap"><table class="ac-table ac-analytics-table"><thead><tr>
    <th class="ac-col-select">合作方</th><th>状态</th><th>有效点击</th><th>注册</th><th>FTD</th><th>有效 FTD</th><th>注册→有效 FTD 率</th><th>FTD→有效 FTD 率</th><th>应计佣金</th><th>有效 FTD 平均佣金成本</th><th class="ac-col-actions">较上一周期</th>
  </tr></thead><tbody>${sortedRows.map(row => `<tr data-analytics-row="${row.id}">
    <td class="ac-col-select"><button class="ac-link ac-analytics-partner-link" data-partner="${row.id}">${acEsc(row.id)}</button><small>${acEsc(row.name)} · 已脱敏</small></td>
    <td><span class="ac-badge ${acStat(row.status)}">${acEsc(row.status)}</span></td><td class="num">${row.clicks.toLocaleString("en-US")}</td><td class="num">${row.regs.toLocaleString("en-US")}</td><td class="num">${row.ftd.toLocaleString("en-US")}</td><td class="num">${row.vftd.toLocaleString("en-US")}</td><td class="num">${analyticsPercent(row.regRate)}</td><td class="num">${analyticsPercent(row.ftdRate)}</td><td class="num">${analyticsMoney(row.comm)}</td><td class="num">${analyticsMoney(row.avgCost)}</td>
    <td class="ac-col-actions"><span class="ac-analytics-delta ${row.delta < 0 ? "down" : "up"}">${row.delta > 0 ? "↑" : "↓"} ${Math.abs(row.delta).toFixed(1)}%</span><button class="ac-link" data-analytics-breakdown="${row.id}">看构成</button></td>
  </tr>`).join("")}</tbody></table></div>` : acEmpty("无匹配结果，试试调整筛选条件");
  return `${acPagehead("经营分析","规模 · 转化 · 佣金成本 · 只读分析","<button class='ac-btn secondary' data-analytics-refresh>↻ 刷新</button><button class='ac-btn primary' data-analytics-export>⤓ 创建导出任务</button>")}
    ${AC_STATE.analytics.applied.dataStatus !== "complete" ? `<div class="ac-banner is-warn"><span class="ac-banner-icon">⚠</span><span class="ac-banner-text"><strong>数据状态：部分数据，待补数</strong> · CRM 与事件事实源仍在允许延迟内，页面保留当前快照值。</span><button class="ac-link" data-analytics-refresh>刷新</button></div>` : ""}
    ${analyticsFilterPanel()}
    <section class="ac-analytics-metrics">${metrics.join("")}</section>
    <div class="ac-analytics-analysis-grid">${analyticsTrendPanel(summary)}${analyticsFunnelPanel(summary)}</div>
    <section class="ac-analytics-panel ac-analytics-partners"><header class="ac-analytics-panel-head"><div><h2>合作方汇总</h2><p>${rows.length} 家合作方 · 默认按有效 FTD 降序 · 快照 PERF-20261109-001</p></div><span class="ac-analytics-table-note">数值按业务主体时区统计</span></header>${table}<footer class="ac-analytics-table-foot"><span>共 ${rows.length} 条 · 当前页 1 / 1</span><span>操作列固定在右侧 · 表格可横向滚动</span></footer></section>`;
}
function pgAnalyticsQuality(){
  return `${acPagehead("质量与风险分析","流量质量 · 风险损失 · 规则效能","<button class='ac-btn secondary' data-toast='异步导出→导出中心'>⤓ 导出</button>")}
  ${acSummary([["有效FTD率","55.1%","+1.2pp"],["30日留存","62%","+3%"],["拒付率","1.8%","+0.3pp"],["冲正率","2.4%","-0.2pp"],["欺诈关联率","0.9%","+0.1pp"],["集群风险敞口",acMoney(4260),"-8%"],["损失回收率","41%","+5%"]])}
  <div class="ac-two-col">
    <div class="ac-card"><h3>损失构成 · 11月</h3>${acBars([["拒付",3120,acMoney(3120)],["冲正",2480,acMoney(2480)],["欺诈关联",1660,acMoney(1660)]])}</div>
    <div class="ac-card"><h3>合作方质量分布</h3>${acBars([["优质（A）",3,"3家"],["正常（B）",2,"2家"],["观察（C）",1,"1家"],["高风险（D）",1,"1家"]])}</div>
  </div>
  ${acTable([
    {key:"name",label:"合作方"},{key:"vftd",label:"有效FTD",w:"84px"},
    {label:"留存30日",w:"84px",render:(r,i) => ["68%","61%","55%","49%","42%"][i]},
    {label:"拒付率",w:"80px",render:(r,i) => `<span class="${[3.8].includes(i)?"ac-warn-text":""}">${[0.9,1.2,2.1,1.6,3.8][i]}%</span>`},
    {label:"冲正率",w:"80px",render:(r,i) => `${[1.1,2.0,1.4,2.8,3.1][i]}%`},
    {label:"质量档",w:"76px",render:(r,i) => `<span class="ac-badge ${["is-green","is-green","is-blue","is-orange","is-red"][i]}">${["A","A","B","C","D"][i]}</span>`},
    {label:"操作",w:"76px",actions:true,render:r => `<button class="ac-link" data-toast="质量明细下钻">下钻</button>`},
  ],AC_DB.analyticsPerf,{page:false})}`;
}
function pgAnalyticsFunds(){
  return `${acPagehead("资金分析","资金流 · 保证金覆盖","<button class='ac-btn secondary' data-toast='异步导出→导出中心'>⤓ 导出</button>")}
  ${acSummary([["本月佣金",acMoney(48210),"+6%"],["税费",acMoney(4820),"+5%"],["保证金占用",acMoney(32600),"+2%"],["提现",acMoney(43400),"+9%"],["冲正损失",acMoney(2480),"-12%"],["净支出",acMoney(39110),"+4%"],["保证金覆盖率","1.32x","+0.05"]])}
  <div class="ac-two-col">
    <div class="ac-card"><h3>月度资金流</h3>${acBars([["计佣",48210,acMoney(48210)],["结算",42997,acMoney(42997)],["提现",43400,acMoney(43400)]])}</div>
    <div class="ac-card"><h3>保证金覆盖趋势</h3>${acBars([["9月",1.24,"1.24x"],["10月",1.28,"1.28x"],["11月",1.32,"1.32x"]])}</div>
  </div>
  ${acTable([
    {key:"name",label:"合作方"},{key:"comm",label:"佣金",w:"90px",render:r => acMoney(r.comm)},
    {label:"税费",w:"84px",render:(r,i) => acMoney([4820,3180,1250,1590,2035][i])},
    {label:"保证金",w:"90px",render:(r,i) => acMoney([4820,3180,1250,1590,2035][i])},
    {label:"提现",w:"90px",render:(r,i) => acMoney([27450,18600,5400,8000,9200][i])},
    {label:"净支出",w:"90px",render:(r,i) => `<strong>${acMoney([9620,7110,2240,3890,1870][i])}</strong>`},
    {label:"操作",w:"76px",actions:true,render:r => `<button class="ac-link" data-toast="资金构成下钻">下钻</button>`},
  ],AC_DB.analyticsPerf,{page:false})}`;
}

/* ===== 系统 ===== */
/* 任务队列类型与风险处置规则：配置中心的唯一可配置事实源（Mock） */
const AC_RISK_GROUPS = ["风控风险","资金风险","数据风险","功能风险","客户服务"];
const AC_TASK_TYPES = [
  {type:"风险复核",group:"风控风险",trigger:"规则命中/人工上报",domain:"风险",approval:"是",approver:"风控主管",gate:"是",appeal:"是",review:"是",reviewer:"风控复核员",hours:2,timeout:"维持隔离",push:"是",severity:"高"},
  {type:"集群处理",group:"风控风险",trigger:"关联集群成员变化",domain:"风险",approval:"是",approver:"风控主管",gate:"是",appeal:"是",review:"是",reviewer:"风控复核员",hours:2,timeout:"升级主管",push:"是",severity:"高"},
  {type:"结算延长",group:"资金风险",trigger:"结算中风险到期重检",domain:"结算",approval:"是",approver:"风控主管",gate:"是",appeal:"是",review:"是",reviewer:"风控复核员",hours:2,timeout:"自动延长1次",push:"是",severity:"高"},
  {type:"保证金抵扣",group:"资金风险",trigger:"拒付/损失确认",domain:"资金",approval:"是",approver:"财务",gate:"是",appeal:"是",review:"是",reviewer:"财务复核员",hours:2,timeout:"维持待处理",push:"否",severity:"中"},
  {type:"冲正追回",group:"资金风险",trigger:"拒付/CRM欺诈库关联",domain:"资金",approval:"是",approver:"财务",gate:"是",appeal:"是",review:"是",reviewer:"风控复核员",hours:2,timeout:"升级主管",push:"是",severity:"高"},
  {type:"黑名单处置",group:"风控风险",trigger:"规则/人工加入或移出申请",domain:"风险",approval:"是",approver:"风控主管",gate:"是",appeal:"是",review:"是",reviewer:"风控复核员",hours:2,timeout:"维持门禁",push:"是",severity:"高"},
  {type:"集成失败",group:"功能风险",trigger:"外部接口失败/积压",domain:"系统",approval:"否",approver:"—",gate:"否",appeal:"否",review:"是",reviewer:"运营",hours:4,timeout:"自动重试后升级",push:"是",severity:"中"},
  {type:"补数",group:"数据风险",trigger:"数据缺失/事件断链",domain:"数据",approval:"否",approver:"—",gate:"否",appeal:"否",review:"是",reviewer:"运营",hours:8,timeout:"停止重试并告警",push:"是",severity:"中"},
  {type:"申诉",group:"客户服务",trigger:"合作方发起争议",domain:"服务",approval:"否",approver:"—",gate:"否",appeal:"—",review:"是",reviewer:"运营",hours:24,timeout:"自动升级主管",push:"是",severity:"中"}
];
function riskSelect(name,value,options,extra="") { return `<select class="ac-risk-input" data-risk-field="${name}" ${extra}>${options.map(x => `<option value="${acEsc(x)}" ${x===value?"selected":""}>${acEsc(x)}</option>`).join("")}</select>`; }
function riskConfigEditor(type){
  const r = AC_TASK_TYPES.find(x => x.type === type); if (!r) return;
  const yesNo = ["是","否"], roles = ["运营","财务","风控复核员","风控主管","合规","管理员"], timeouts = ["维持隔离","维持门禁","升级主管","自动延长1次","自动重试后升级","停止重试并告警","自动升级主管","维持待处理"];
  const toggle = (label,name,value,desc="") => `<label class="ac-risk-toggle"><input type="checkbox" data-risk-field="${name}" ${value === "是" ? "checked" : ""}><span>${label}</span>${desc ? `<small>${desc}</small>` : ""}</label>`;
  const body = `<div class="ac-risk-form" data-risk-form="${acEsc(type)}">
    <div class="ac-risk-form-note">当前编辑的是 <strong>${acEsc(type)}</strong> 的草稿配置。每项修改会根据上下文变量即时联动，保存后写入草稿 v12，不会直接改动正式账务。</div>
    <div class="ac-risk-form-section"><h4>触发与分级</h4><div class="ac-form-row"><div class="ac-form-item"><label>触发场景</label><input class="ac-risk-input" data-risk-field="trigger" value="${acEsc(r.trigger)}"></div><div class="ac-form-item"><label>风险等级</label>${riskSelect("severity",r.severity,["高","中","低"])}</div></div></div>
    <div class="ac-risk-form-section"><h4>审批、门禁与申诉</h4>${toggle("是否审批","approval",r.approval,"关闭审批后，命中规则可直接进入硬风控门禁")}<div class="ac-form-row"><div class="ac-form-item"><label>审批人（单选角色）</label>${riskSelect("approver",r.approver,roles,r.approval !== "是" ? "disabled" : "")}</div><div class="ac-form-item"><label>硬风控门禁</label>${riskSelect("gate",r.gate,yesNo)}</div></div>${toggle("是否允许申诉","appeal",r.appeal,"门禁任务可在关闭前发起申诉")}</div>
    <div class="ac-risk-form-section"><h4>复核与责任人</h4>${toggle("是否复核","review",r.review,"复核是解除高风险门禁的前置条件")}<div class="ac-form-row"><div class="ac-form-item"><label>复核人（单选角色）</label>${riskSelect("reviewer",r.reviewer,roles,r.review !== "是" ? "disabled" : "")}</div><div class="ac-form-item"><label>通知渠道</label>${riskSelect("notify",r.notify || "站内+邮件",["站内+邮件","仅站内","仅邮件","站内+邮件+IM"])}</div></div></div>
    <div class="ac-risk-form-section"><h4>风险周期与超时</h4><div class="ac-form-row"><div class="ac-form-item"><label>审核时间（小时）</label><input class="ac-risk-input" data-risk-field="hours" type="number" min="1" max="720" value="${r.hours}"></div><div class="ac-form-item"><label>超时风控状态</label>${riskSelect("timeout",r.timeout,timeouts)}</div></div>${toggle("超时后直接推送复核人","push",r.push,"推送站内通知并记录超时告警")}</div>
    <div class="ac-risk-form-section"><h4>处理边界</h4><div class="ac-form-item"><label>影响范围</label><input class="ac-risk-input" data-risk-field="impact" value="${acEsc(r.impact || "对应客户佣金、结算中状态")}"></div><div class="ac-form-item"><label>审计要求</label><textarea class="ac-risk-input" data-risk-field="audit" rows="2">${acEsc(r.audit || "命中、门禁、审批、复核、超时均留痕")}</textarea></div></div>
    <div class="ac-risk-live"><strong>联动预览</strong><span data-risk-preview></span></div>
  </div>`;
  acDrawer({title:`编辑配置 · ${acEsc(type)}`,sub:"所有字段可修改 · 上下文变量即时联动",badge:`<span class="ac-badge is-orange">草稿 v12</span>`,wide:true,tabs:[{id:"edit",label:"编辑规则",html:body}],foot:`<button class="ac-btn secondary" data-drawer-close>取消</button><button class="ac-btn primary" data-risk-save="${acEsc(type)}">保存草稿</button>`});
  updateRiskEditor();
}
function updateRiskEditor(){
  const form = document.querySelector("[data-risk-form]"); if (!form) return;
  const get = n => form.querySelector(`[data-risk-field="${n}"]`), val = n => get(n)?.type === "checkbox" ? (get(n).checked ? "是" : "否") : get(n)?.value;
  const approval = val("approval"),review = val("review"),gate = val("gate"), push = val("push"), appeal = val("appeal");
  const approver = get("approver"),reviewer = get("reviewer"); if (approver) approver.disabled = approval !== "是"; if (reviewer) reviewer.disabled = review !== "是";
  const gateInput = get("gate"); if (gateInput && approval === "否") { gateInput.value = "是"; gateInput.disabled = true; }
  const appealInput = get("appeal"); if (appealInput) appealInput.disabled = gate !== "是" && approval !== "否";
  const preview = form.querySelector("[data-risk-preview]"); if (preview) preview.innerHTML = `${approval === "是" ? `命中 → ${acEsc(approver?.value || "选择审批人")}审批` : "命中 → 直接进入硬风控门禁"} → ${review === "是" ? `由${acEsc(reviewer?.value || "选择复核人")}复核` : "无需复核"} → ${gate === "是" || approval === "否" ? "停止对应客户佣金结算" : "不阻断佣金结算"} → ${push === "是" ? "超时推送复核人" : "超时仅告警"}；申诉：${appeal}`;
}
function saveRiskEditor(type){
  const r = AC_TASK_TYPES.find(x => x.type === type), form = document.querySelector("[data-risk-form]"); if (!r || !form) return;
  form.querySelectorAll("[data-risk-field]").forEach(el => { r[el.dataset.riskField] = el.type === "checkbox" ? (el.checked ? "是" : "否") : el.value; });
  if (r.approval === "否") { r.gate = "是"; r.approver = "—"; }
  if (r.review !== "是") r.reviewer = "—";
  r.hours = Number(r.hours) || 1; r.draft = "v12"; acDrawerClose(); acRender(); acToast(`${type}配置已保存为草稿 v12`);
}
function riskConfigDrawer(type){
  const r = AC_TASK_TYPES.find(x => x.type === type); if (!r) return;
  const bool = v => v === "是" ? `<span class="ac-badge is-green">是</span>` : v === "否" ? `<span class="ac-badge is-gray">否</span>` : `<span class="ac-badge is-gray">${v}</span>`;
  acDrawer({title:`${r.type} · 风险处置配置`,sub:`${r.domain}域 · v11草稿 · 当前生效`,badge:`<span class="ac-badge ${r.severity === "高" ? "is-red" : "is-orange"}">${r.severity}风险</span>`,wide:true,tabs:[
    {id:"flow",label:"处置流程",html:`<div class="ac-config-hero"><div><small>触发方式</small><strong>${acEsc(r.trigger)}</strong></div><div><small>审核时限</small><strong>${r.hours}小时</strong></div><div><small>超时处理</small><strong>${acEsc(r.timeout)}</strong></div></div>${acKV([["是否审批",bool(r.approval)],["审批人（单选角色）",acEsc(r.approver)],["是否复核",bool(r.review)],["复核人（单选角色）",acEsc(r.reviewer)],["是否允许申诉",bool(r.appeal)],["是否推送复核人",bool(r.push)],["硬风控门禁",bool(r.gate)]])}<h4 class="ac-drawer-section-title">流程顺序</h4>${acTimeline([{time:"T+0",title:"规则命中并生成任务",desc:`${r.gate === "是" ? "立即进入硬风控门禁，停止对应客户佣金结算" : "生成处理任务，不阻断正常结算"}`,state:"is-done"},{time:"审核阶段",title:r.approval === "是" ? `提交${r.approver}审批` : "无需审批，进入处理结论",desc:r.review === "是" ? `由${r.reviewer}完成复核` : "直接执行配置动作",state:"is-done"},{time:`${r.hours}小时后`,title:`超时：${r.timeout}`,desc:r.push === "是" ? "同时推送给复核人并记录告警" : "仅保留任务告警",state:"is-miss"}])}`},
    {id:"params",label:"参照参数",html:`${acKV([["触发规则版本","风控规则 v11"],["风险等级",r.severity],["风险周期",`${r.hours}小时`],["超时风控状态",r.timeout],["佣金处理",r.gate === "是" ? "停止对应客户佣金结算" : "不阻断"],["申诉窗口",r.appeal === "是" ? "任务关闭前可发起" : "不允许"],["通知渠道","站内 + 邮件（按角色）"],["审计要求","命中、门禁、审批、复核、超时均留痕"]])}<div class="ac-task-note">硬风控门禁只改变待结算/待生成佣金的流转状态，不回写已结算、已提现历史；解除门禁必须产生独立复核结论和审计记录。</div>`}
  ],foot:`<button class="ac-btn secondary" data-drawer-close>关闭</button><button class="ac-btn primary" data-risk-edit="${acEsc(r.type)}">编辑此规则</button>`});
}
function pgRiskConfig(){
  const bool = v => v === "是" ? `<span class="ac-badge is-green">是</span>` : v === "否" ? `<span class="ac-badge is-gray">否</span>` : `<span class="ac-badge is-gray">${v}</span>`;
  const group = AC_STATE.riskGroup || AC_RISK_GROUPS[0], rows = AC_TASK_TYPES.filter(r => r.group === group && acUnifiedMatch(r));
  return `<div class="ac-config-rule-head"><div><h2>风险处置规则</h2><p>任务类型 → 门禁 → 审批/复核 → 超时处理 · 当前生效 v11</p></div><div class="ac-config-rule-actions"><span class="ac-badge is-orange">草稿 v12</span><button class="ac-btn secondary sm" data-toast="已打开版本差异：v11 → v12">差异对比</button><button class="ac-btn primary sm" data-toast="风险规则v12已提交审批">提交发布</button></div></div>
  <div class="ac-risk-tabs">${AC_RISK_GROUPS.map(g => `<button class="${g===group?"active":""}" data-risk-group="${g}">${g}<small>${AC_TASK_TYPES.filter(r=>r.group===g).length}</small></button>`).join("")}</div>
  <div class="ac-rule-summary"><div><small>当前母类子类型</small><strong>${rows.length}</strong></div><div><small>硬风控门禁</small><strong>${rows.filter(x=>x.gate==="是").length}</strong></div><div><small>需审批</small><strong>${rows.filter(x=>x.approval==="是").length}</strong></div><div><small>需复核</small><strong>${rows.filter(x=>x.review==="是").length}</strong></div><div><small>允许申诉</small><strong>${rows.filter(x=>x.appeal==="是").length}</strong></div></div>
  <div class="ac-rule-note">门禁规则：选择“是”后，规则命中立即停止对应客户的佣金结算；审批和复核是解锁前置条件。所有规则变更走版本、试算、审批、发布链路。</div>
  <div class="ac-table-wrap"><table class="ac-table"><thead><tr><th style="width:116px">任务类型</th><th>触发场景</th><th style="width:68px">审批</th><th style="width:92px">审批人</th><th style="width:68px">硬门禁</th><th style="width:68px">申诉</th><th style="width:68px">复核</th><th style="width:92px">复核人</th><th style="width:72px">周期</th><th style="width:118px">超时处理</th><th style="width:110px">操作</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r.type}</strong><br><span class="ac-badge ${r.severity === "高" ? "is-red" : "is-orange"}">${r.severity}风险</span></td><td>${r.trigger}</td><td>${bool(r.approval)}</td><td>${r.approver}</td><td>${bool(r.gate)}</td><td>${bool(r.appeal)}</td><td>${bool(r.review)}</td><td>${r.reviewer}</td><td>${r.hours}小时</td><td>${r.timeout}${r.push === "是" ? " · 推送复核" : ""}</td><td><button class="ac-link" data-risk-config="${r.type}">查看/编辑</button></td></tr>`).join("")}</tbody></table></div>`;
}
const AC_CONFIG_CATALOG = {
  "价格表":["国家/主体","资格档","事件类型","基础单价","加成比例","币种","有效期","优先级"],
  "资格档与里程碑":["档位名称","FTD门槛","有效FTD门槛","质量服务条件","观察期","升级条件","降级条件","启用状态"],
  "信用等级权益":["信用等级","适用条件","信用附加比例","固定金额","Hold调整","保证金比例","额度","复核优先级"],
  "结算参数":["结算周期","结算日","最低结算门槛","结算币种","结算前检查","C0结算资格","失败重试","冻结处理"],
  "保证金与税费":["保证金计提比例","正常释放期","终止合作保留期","冻结批次","保证金释放条件","税费类型","税率","计税基数","冲正/追回处理"],
  "国家与主体":["国家/地区","开放状态","风险等级","经营主体","KYC/KYB要求","币种","时区","生效/失效时间"],
  "审批流":["业务类型","节点顺序","审批角色","会签/或签","是否允许自审","驳回处理","超时处理","替代审批","必填意见"],
  "参数字典":["参数键","中文名称","数据类型","单位","默认值","最小/最大值","精度","敏感等级","修改权限"],
  "通知模板":["模板编号","事件类型","渠道","语言","标题","正文变量","模板版本","启用状态","接收范围"],
};
function configItemDrawer(domain,item){
  const current = ((AC_DB.configEntries[domain]||[]).find(x => String(x[0]).includes(item))||[item,"未配置","草稿","草稿"]);
  acDrawer({title:`${domain} · ${item}`,sub:"配置项详情 · 当前生效版本 v13 · 草稿 v14",badge:`<span class=\"ac-badge is-orange\">待配置</span>`,wide:true,tabs:[{id:"detail",label:"字段与值",html:`<div class=\"ac-config-item-hero\"><div><small>配置项</small><strong>${acEsc(item)}</strong></div><div><small>当前值</small><strong>${acEsc(current[1])}</strong></div><div><small>来源版本</small><strong>${acEsc(current[2])}</strong></div></div>${acKV([["唯一键",`${domain.toLowerCase().replaceAll(" ","_")}.${item}`],["业务定义","影响业务规则计算、发布和历史追溯的版本化参数"],["数据类型","数字 / 文本 / 条件 / 开关"],["允许值","按配置项字典和业务范围校验"],["草稿值",acEsc(current[1])],["依赖与影响","保存后进入差异对比和试算，不能直接修改历史记录"]])}<div class=\"ac-rule-note\">修改后先保存草稿，再执行校验、试算、审批和生效；当前版本和历史账务不会被直接覆盖。</div>`}],foot:`<button class=\"ac-btn secondary\" data-drawer-close>关闭</button><button class=\"ac-btn primary\" data-toast=\"已打开${acEsc(item)}编辑表单\">编辑配置项</button>`});
}
function configVersionActions(v){
  const actionMap = {
    "草稿":[["view","查看/编辑"],["copy","复制"],["activate","设置生效"],["void","作废"]],
    "待校验":[["view","查看"],["copy","复制"],["withdraw","撤回"]],
    "待试算":[["view","查看"],["copy","复制"],["withdraw","撤回"]],
    "待审批":[["view","查看"],["copy","复制"],["withdraw","撤回"]],
    "待生效":[["view","查看"],["copy","复制"],["withdraw","撤回"],["reschedule","改期"]],
    "生效中":[["view","查看"],["copy","复制"]],
    "已锁定":[["view","查看"],["copy","复制"]],
    "作废":[["view","查看"],["copy","复制"]],
    "已撤回":[["view","查看"],["copy","复制"]],
    "生效失败":[["view","查看"],["copy","复制"]]
  };
  return `<span class="ac-action-menu"><button type="button" class="ac-action-trigger" data-config-menu="${v.version}">操作 <span>▾</span></button><span class="ac-action-panel">${(actionMap[v.status]||actionMap["已锁定"]).map(([action,label])=>`<button type="button" data-config-action="${action}" data-config-action-version="${v.version}">${label}</button>`).join("")}</span></span>`;
}
function pgConfig(){
  if (AC_STATE.configView === "detail") return pgConfigDetail();
  const versions = [
    {version:"20261108094530",status:"草稿",locked:"未锁定",creator:"ops_chen",created:"2026-11-08 09:45",published:"—",effective:"待设置",notice:"一般通知",mode:"双人发布",summary:"补齐财务、风控和数据治理配置项"},
    {version:"20261107113001",status:"生效中",locked:"已锁定",creator:"finance_li",created:"2026-11-07 11:30",published:"2026-11-07 12:10",effective:"2026-11-07 12:30",notice:"重要通知",mode:"双人发布",summary:"价格表与结算参数调整"},
    {version:"20261028090000",status:"已锁定",locked:"已锁定",creator:"risk_zhao",created:"2026-10-28 09:00",published:"2026-10-28 10:20",effective:"2026-10-28 12:00",notice:"一般通知",mode:"多人发布",summary:"风控规则与集群处置参数"},
    {version:"20261015083000",status:"已撤回",locked:"未锁定",creator:"ops_wang",created:"2026-10-15 08:30",published:"—",effective:"—",notice:"不发送通知",mode:"单人发布",summary:"国家主体配置草稿（已撤回）"}
  ].filter(version => acUnifiedMatch(version));
  return `${acPagehead("配置中心","配置版本管理 · 全部业务配置随版本快照保存 · 生效后自动锁定","<button class='ac-btn primary' data-toast='已创建新草稿：版本号按服务器时间生成'>＋创建配置版本</button>")}
  <div class="ac-config-version-strip"><div><small>当前生效版本</small><strong>20261107113001</strong></div><div><small>待生效版本</small><strong>无</strong></div><div><small>草稿数</small><strong>1</strong></div><div><small>唯一性校验</small><span class="ac-badge is-green">正常</span></div><div><small>最近发布</small><strong>成功</strong></div></div>
  <div class="ac-card ac-version-list-card"><div class="ac-config-panel-head"><div><h2>配置版本列表</h2><p>列表仅展示版本元数据；编辑或查看版本后，才进入全部配置参数页面。</p></div><div class="ac-version-filters"><span class="ac-badge is-gray">全部状态</span><span class="ac-badge is-gray">创建时间：全部</span><span class="ac-badge is-gray">生效时间：全部</span></div></div>
  <div class="ac-table-wrap"><table class="ac-table ac-version-table"><thead><tr><th>版本号</th><th>状态</th><th>锁定</th><th>创建人/时间</th><th>发布时间</th><th>生效时间</th><th>通知类型</th><th>发布方式</th><th>变更摘要</th><th>操作</th></tr></thead><tbody>${versions.map(v=>`<tr><td><button class="ac-link" data-config-version="${v.version}">${v.version}</button></td><td><span class="ac-badge ${v.status==="生效中"?"is-green":v.status==="草稿"?"is-orange":v.status==="已撤回"?"is-gray":"is-blue"}">${v.status}</span></td><td>${v.locked}</td><td>${v.creator}<br><small>${v.created}</small></td><td>${v.published}</td><td>${v.effective}</td><td>${v.notice}</td><td>${v.mode}</td><td class="ac-version-summary">${v.summary}</td><td>${configVersionActions(v)}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="ac-card ac-release-card"><h3>版本发布流程</h3><div class="ac-release-flow"><span class="done">创建/复制草稿</span><b>→</b><span class="done">编辑全部配置</span><b>→</b><span>校验</span><b>→</b><span>试算</span><b>→</b><span>审批</span><b>→</b><span>待生效</span><b>→</b><span>生效并锁定</span></div><p class="ac-field-hint">任何状态都可以复制为新草稿；回滚不覆盖历史版本，必须通过复制生成新版本。</p></div>`;
}
function pgConfigDetail(){
  const d=AC_STATE.configDomain, domains=["基础信息","业务规则","财务规则","风控规则","数据治理","系统参数"], sub={基础信息:["版本说明","通知设置","发布设置"],业务规则:["资格档与里程碑","国家与主体","归属规则"],财务规则:["价格表","信用等级权益","结算参数","保证金与税费"],风控规则:AC_RISK_GROUPS,数据治理:["数据分级","敏感授权","保留与删除","Breach响应"],系统参数:["审批流","参数字典","通知模板"]};
  const domain=domains.includes(d)?d:"财务规则", subItems=sub[domain], selected=subItems.includes(d)?d:subItems[0], catalog=AC_CONFIG_CATALOG[selected]||["启用状态","业务定义","当前值","草稿值","取值范围","依赖项","影响范围","最后修改人"];
  if (AC_RISK_GROUPS.includes(selected)) return `${acPagehead("配置中心",`版本 ${AC_STATE.configVersion} · 风控规则 · 处理时限与联动`,`<button class='ac-btn secondary' data-config-back>返回版本列表</button><button class='ac-btn primary' data-toast='已打开发布向导'>发布向导</button>`)}<div class="ac-config-grid"><div class="ac-tree"><button class="ac-back-tree" data-config-back>← 版本列表</button>${domains.map(x=>`<button class="${x===domain?"active":""}" data-domain="${x}">${x}</button>`).join("")}</div><div>${pgRiskConfig()}</div></div>`;
  const rows=catalog.map((item,i)=>({item,key:`${selected.toLowerCase().replaceAll(" ","_")}.${i+1}`,value:(AC_DB.configEntries[selected]||[])[i%Math.max(1,(AC_DB.configEntries[selected]||[]).length)]?.[1]||"未配置",type:i%3===0?"数字/金额":i%3===1?"枚举/条件":"开关/文本",range:i%2?"按业务字典":"必填"}));
  return `${acPagehead("配置中心",`版本 ${AC_STATE.configVersion} · 草稿配置详情 · 当前生效 v13`,`<button class='ac-btn secondary' data-config-back>返回版本列表</button><button class='ac-btn secondary' data-toast='已打开版本差异'>差异对比</button><button class='ac-btn primary' data-toast='发布前检查完成'>发布向导</button>`)}<div class="ac-config-version-strip"><div><small>版本状态</small><span class="ac-badge is-orange">草稿</span></div><div><small>配置项</small><strong>全部业务配置</strong></div><div><small>配置字段</small><strong>${rows.length}</strong></div><div><small>锁定状态</small><strong>未锁定</strong></div><div><small>计划生效</small><strong>待设置</strong></div></div><div class="ac-config-grid"><div class="ac-tree"><button class="ac-back-tree" data-config-back>← 版本列表</button>${domains.map(x=>`<button class="${x===domain?"active":""}" data-domain="${x}">${x}</button>`).join("")}</div><div><div class="ac-config-subtabs">${subItems.map(x=>`<button class="${x===selected?"active":""}" data-domain="${x}">${x}</button>`).join("")}</div><div class="ac-config-panel-head"><div><h2>${selected}</h2><p>共 ${rows.length} 个配置字段 · 当前值与草稿值可对比 · 修改后进入试算</p></div><span class="ac-badge is-blue">版本化配置</span></div><div class="ac-config-field-grid">${rows.map(r=>`<button class="ac-config-field" data-config-item="${acEsc(selected)}|${acEsc(r.item)}"><span class="ac-config-field-name">${acEsc(r.item)}</span><code>${acEsc(r.key)}</code><strong>${acEsc(r.value)}</strong><small>${acEsc(r.type)} · ${acEsc(r.range)}</small><i>查看字段与值 ›</i></button>`).join("")}</div></div></div>`;
}

function pgPermissions(){
  const roles = ["运营","财务","复核员","风控主管","合规","只读"];
  const rows = [["合作方管理","✓","看","看","看","看","看"],["入驻审核","审","—","—","—","审","看"],["财务（佣金/结算/提现/对账）","看","审","看","看","看","看"],["风险工作台","看","—","查+复核","审+黑名单","看","看"],["工单","处理","—","处理","—","处理","看"],["配置中心","提案","财务域","风控域","审","审合规域","看"],["权限/审计/导出/治理/集成","管理","—","—","—","审","看"]];
  return `${acPagehead("权限管理","角色 × 页面 × 动作 · 敏感字段授权 · 数据范围","<button class='ac-btn secondary' data-toast='新增自定义角色'>+ 新增角色</button>")}
  <div class="ac-table-wrap"><table class="ac-table"><thead><tr><th style="width:240px">页面 / 动作</th>${roles.map(r => `<th>${r}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr><td>${acEsc(r[0])}</td>${r.slice(1).map(c => `<td>${c==="—"?'<span style="color:var(--subtle)">—</span>':`<span class="ac-badge ${c.includes("审")||c.includes("管理")?"is-green":"is-blue"}">${c}</span>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  <div class="ac-card" style="margin-top:12px"><h3>敏感字段授权</h3>${acMiniTable(["申请人","字段","用途","期限","状态","操作"],AC_DB.govAuth.filter(row => acUnifiedMatch(row)).map(a => [a.user,a.field,a.purpose,a.exp,`<span class="ac-badge ${acStat(a.status)}">${a.status}</span>`,`<button class="ac-link" data-toast="通过/拒绝/撤销">审批</button>`]))}</div>`;
}
function pgAudit(){
  return `${acPagehead("操作审计","全局底账 · 只读 · 导出需审批")}
  ${acFilterBar("aud",[{type:"search",ph:"操作人 / 对象 / TraceId"},{key:"act",label:"动作",options:["全部动作","审批","生成","新建草稿","发布","延长"]},{type:"date",label:"时间范围"}])}
  ${acTable([
    {key:"time",label:"时间",w:"130px"},{key:"user",label:"操作人",w:"120px"},{key:"role",label:"角色",w:"100px"},
    {key:"obj",label:"对象",w:"130px",render:r => `<button class="ac-link" data-toast="对象详情">${r.obj}</button>`},
    {key:"act",label:"动作",w:"100px"},{key:"result",label:"结果",w:"70px",render:r => `<span class="ac-badge ${acStat(r.result)}">${r.result}</span>`},
    {key:"from",label:"来源入口",w:"100px"},{key:"tid",label:"TraceId",w:"90px",render:r => `<button class="ac-link" data-trace="${r.tid}">${r.tid}</button>`},
  ],AC_DB.audit,{page:false})}`;
}
function pgExports(){
  return `${acPagehead("导出中心","异步导出 · 敏感数据自动进审批 · 24小时过期（演示参数）","<button class='ac-btn primary' data-toast='新建导出：数据源+范围+字段+脱敏选项'>⤓ 新建导出</button>")}
  ${acTable([
    {key:"id",label:"任务号",w:"88px"},{key:"src",label:"数据源",w:"100px"},{key:"range",label:"范围",w:"130px"},{key:"rows",label:"行数",w:"80px"},
    {key:"level",label:"数据级别",w:"80px",render:r => `<span class="ac-badge ${r.level==="敏感"?"is-orange":r.level==="受限"?"is-red":"is-gray"}">${r.level}</span>`},
    {key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},
    {label:"操作",w:"110px",actions:true,render:r => r.status==="可下载"?`<button class="ac-link" data-toast="下载（写审计）">下载</button>`:(r.status==="处理中"||r.status==="审批中")?`<button class="ac-link danger" data-toast="已取消">取消</button>`:`<button class="ac-link" data-toast="已过期（24小时策略）">详情</button>`},
  ],AC_DB.exports,{page:false})}`;
}
function pgGovernance(){
  const tab = AC_STATE.tab || "level";
  let body = "";
  if (tab === "level") body = acTable([{key:"dom",label:"数据域"},{key:"level",label:"级别",w:"76px",render:r => `<span class="ac-badge ${r.level==="敏感"?"is-orange":r.level==="受限"?"is-red":"is-gray"}">${r.level}</span>`},{key:"policy",label:"展示与导出政策"},{key:"ver",label:"规则版本",w:"90px",render:r => `<span style="color:var(--muted)">${r.ver}</span>`},{label:"操作",w:"76px",actions:true,render:r => `<button class="ac-link" data-toast="级别变更（走审批）">变更</button>`}],AC_DB.govLevels,{page:false});
  else if (tab === "auth") body = acTable([{key:"user",label:"申请人",w:"130px"},{key:"field",label:"字段"},{key:"purpose",label:"用途",w:"110px"},{key:"exp",label:"期限",w:"120px"},{key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},{label:"操作",w:"96px",actions:true,render:r => `<button class="ac-link" data-toast="已批准">通过</button><button class="ac-link danger" data-toast="已拒绝">拒绝</button>`}],AC_DB.govAuth,{page:false});
  else if (tab === "retain") body = acTable([{key:"dom",label:"数据类型"},{key:"period",label:"保留期",w:"140px"},{key:"action",label:"到期动作",w:"120px"},{key:"mode",label:"执行方式",w:"90px",render:r => `<span class="ac-badge ${r.mode==="自动"?"is-blue":"is-orange"}">${r.mode}</span>`},{label:"操作",w:"96px",actions:true,render:r => `<button class="ac-link" data-toast="到期任务队列：执行/取消">任务队列</button>`}],AC_DB.govRetain,{page:false});
  else if (tab === "rules") body = pgRiskConfig();
  else body = acTable([{key:"id",label:"事件",w:"80px"},{key:"level",label:"等级",w:"64px",render:r => `<span class="ac-badge ${r.level==="高"?"is-red":r.level==="中"?"is-orange":"is-gray"}">${r.level}</span>`},{key:"desc",label:"受影响数据"},{key:"notify",label:"通知状态",w:"90px"},{label:"通知SLA",w:"80px",render:r => `<span class="ac-sla ${r.sla!=="—"?"is-warn":""}">${r.sla}</span>`},{key:"status",label:"状态",w:"80px",render:r => `<span class="ac-badge ${acStat(r.status)}">${r.status}</span>`},{label:"操作",w:"90px",actions:true,render:r => r.status==="处置中"?`<button class="ac-link" data-toast="处置时间线：发现→评估→通知→关闭">处置</button>`:`<button class="ac-link" data-toast="已关闭事件详情">详情</button>`}],AC_DB.govBreach,{page:false});
  return `${acPagehead("数据治理","分级 · 授权 · 保留 · 风险规则（MVP，生产放行门禁）")}
  ${acTabs([{id:"level",label:"数据分级"},{id:"auth",label:"敏感访问授权"},{id:"retain",label:"保留与删除"},{id:"breach",label:"Breach响应"},{id:"rules",label:"风险处置规则"}],tab,"governance")}
  ${body}`;
}
function pgIntegrations(){
  return `${acPagehead("系统集成","外部系统健康 · 失败任务（重试/补数）")}
  <div class="ac-syscards">${AC_DB.integrations.map(s => `<div class="ac-syscard ${s.status==="异常"?"bad":""}"><div class="ac-sys-head"><strong>${s.sys}</strong><span class="ac-badge ${acStat(s.status)}">${s.status}</span></div>${acKV([["最近同步",s.last],["24h成功率",s.rate],["积压",s.backlog?`<span class="ac-warn-text">${s.backlog}</span>`:"0"]])}</div>`).join("")}</div>
  <div style="height:14px"></div>
  ${acTable([
    {key:"id",label:"任务",w:"90px"},{key:"name",label:"名称"},{key:"sys",label:"系统",w:"70px"},{key:"reason",label:"失败原因",w:"170px",render:r => `<span class="ac-warn-text">${r.reason}</span>`},
    {key:"retries",label:"重试",w:"60px"},{key:"since",label:"首次失败",w:"110px"},
    {label:"剩余处理时间",w:"138px",render:r => `<span class="ac-sla ${r.sla<=1?"is-over":r.sla<4?"is-warn":""}">${acFmtSLA(r.sla)}</span>`},
    {label:"操作",w:"96px",actions:true,render:r => `<button class="ac-link" data-toast="重试（幂等键控制）">重试</button><button class="ac-link" data-toast="补数：缺失范围预览→确认→生成补数任务→受影响佣金重算检查">补数</button>`},
  ],AC_DB.integTasks,{page:false})}`;
}

/* ===== 渲染与事件 ===== */
const BUILT_PAGES = {"workbench":pgWorkbench,"onboarding-review":pgOnboarding,"partners":pgPartners,"clients":pgClients,"attribution":pgAttribution,"events":pgEvents,"materials":pgMaterials,"postback":pgPostback,"tracking":pgTracking,"commission-settlement":pgCommissionSettlement,"withdrawals":pgWithdrawals,"recon":pgRecon,"risk":pgRisk,"tickets":pgTickets,"notifications":pgNotifications,"announcements":pgAnnouncements,"analytics-performance":pgAnalyticsPerf,"analytics-quality":pgAnalyticsQuality,"analytics-funds":pgAnalyticsFunds,"config":pgConfig,"permissions":pgPermissions,"audit":pgAudit,"exports":pgExports,"governance":pgGovernance,"integrations":pgIntegrations};
function acParseHash(){const h = (location.hash||"").replace(/^#\/?/,"");const [raw,q] = h.split("?");const p = new URLSearchParams(q||"");const rawRoute = String(raw||"workbench").split("/")[0];const route = rawRoute === "admin-performance" ? "analytics-performance" : ["commissions","statements"].includes(rawRoute) ? "commission-settlement" : (rawRoute||"workbench");return {route,tab:p.get("tab") || (rawRoute === "commissions" ? "commissions" : ({risk:"objects",governance:"level",workbench:"tasks","onboarding-review":"全部","commission-settlement":"batches"})[route] || ""),view:p.get("view")||""};}
function acShell(meta,route,bodyHtml){
  const shellClock = AC_SETTLEMENT_STATE.dataAsOf || "2026-11-09 09:42:00";
  return `<div class="ac-frame">
  <header class="ac-topbar">
    <div class="ac-brand">Affiliate <em>管理端 · 重建版 v2</em></div><div class="ac-topbar-spacer"></div>
    <div class="ac-gsearch"><input type="text" placeholder="搜索 合作方 / 客户 / TraceId / 单号"></div>
    <div class="ac-clock" title="服务器与本地时间"><span>服务器时间 ${acEsc(shellClock)} UTC+8</span><span>本地时间 ${acEsc(shellClock)} UTC+8</span></div>
    <span class="ac-delay">延迟 42ms</span>
    <button class="ac-bell" title="通知">🔔<span class="ac-bell-badge">3</span></button>
    <div class="ac-role" data-dd="role"><button type="button" class="ac-dropdown-trigger" data-dd-trigger="role"><span class="ac-dd-label">${acEsc((AC_ROLES.find(r=>r[0]===AC_STATE.role)||["","运营"])[1])}</span><span class="ac-dd-caret">▾</span></button></div>
  </header>
  <div class="ac-layout">
    <aside class="ac-aside"><nav class="ac-menu">${AC_MENU.map(g => `<div class="ac-menu-group ${g.items.some(i=>i.id===route)?"open":""}"><button data-group><span>${acEsc(g.group)}</span></button><div class="ac-menu-items">${g.items.map(i => {const b = i.badge?i.badge():0;return `<button data-go="${i.id}" class="${i.id===route?"active":""}">${acEsc(i.label)}${b?`<span class="ac-menu-badge">${b}</span>`:""}</button>`;}).join("")}</div></div>`).join("")}</nav></aside>
    <main class="ac-main"><div class="ac-pagebody">
      ${route!=="workbench"?`<div class="ac-breadcrumb">${acEsc(meta.group)} <i>/</i> <strong>${acEsc(meta.title)}</strong></div>`:""}
      ${bodyHtml}
    </div></main>
  </div></div>`;
}
function acRender(){
  const {route,tab,view} = acParseHash();
  if (route === "tickets") {
    location.replace(`../../../admin-dev.html${location.hash}`);
    return;
  }
  AC_STATE.route = route;AC_STATE.tab = tab;
  if (route === "attribution") AC_ATTR_STATE.view = view || "pending";
  const meta = AC_PAGE_META[route];
  const app = document.getElementById("ac-app");
  const fn = BUILT_PAGES[route];
  app.innerHTML = acShell(meta||{group:"—",title:route},route,fn ? fn() : acEmpty(`「${route}」建设中`));
  acInstallUnifiedFilters(app);
}
document.addEventListener("click",e => {
  const filterAction = e.target.closest("[data-ac-filter-toggle],[data-ac-apply],[data-ac-cancel],[data-ac-draft-reset],[data-ac-remove],[data-ac-clear]");
  if (filterAction) {
    const config = acUnifiedFilterConfig();if (!config) return;
    if (filterAction.hasAttribute("data-ac-filter-toggle")) {
      if (AC_FILTER_UI.open === config.id) {AC_FILTER_UI.open = null;delete AC_FILTER_UI.drafts[config.id];}
      else {AC_FILTER_UI.open = config.id;AC_FILTER_UI.drafts[config.id] = acFilterClone(config.get());}
      acRender();return;
    }
    if (filterAction.hasAttribute("data-ac-cancel")) {AC_FILTER_UI.open = null;delete AC_FILTER_UI.drafts[config.id];acRender();return;}
    if (filterAction.hasAttribute("data-ac-draft-reset")) {AC_FILTER_UI.drafts[config.id] = acFilterClone(config.defaults);acRender();return;}
    if (filterAction.hasAttribute("data-ac-clear")) {acCommitUnifiedFilters(config,acFilterClone(config.defaults));return;}
    if (filterAction.hasAttribute("data-ac-remove")) {
      const next = acFilterClone(config.get()), key = filterAction.dataset.acRemove;
      const field = config.fields.find(item => item.key === key);
      next[key] = config.defaults[key] ?? field?.empty ?? (field?.type === "multi" ? [] : "");
      acCommitUnifiedFilters(config,next);return;
    }
    const next = acFilterClone(AC_FILTER_UI.drafts[config.id] || config.get());
    for (const field of config.fields.filter(item => item.type === "date" && item.key.endsWith("From"))) {
      const end = field.key.replace(/From$/,"To");
      if (next[field.key] && next[end] && next[field.key] > next[end]) {acToast("开始日期不能晚于结束日期","error");return;}
    }
    acCommitUnifiedFilters(config,next);return;
  }
  const csOpen = e.target.closest("[data-cs-open-generator]");
  if (csOpen) { csOpenGenerator(); return; }
  const csRefresh = e.target.closest("[data-cs-refresh]");
  if (csRefresh) { acToast(`已刷新佣金结算 · 快照 ${AC_SETTLEMENT_STATE.dataAsOf}`); return; }
  const csExport = e.target.closest("[data-cs-export]");
  if (csExport) { acToast(`导出任务已创建 · ${csLabels[csExport.dataset.csExport] || "当前结果"} · 默认脱敏`); return; }
  const csQuery = e.target.closest("[data-cs-query]");
  if (csQuery) {
    const tab = csQuery.dataset.csQuery;
    const target = AC_SETTLEMENT_STATE.draft[tab];
    document.querySelectorAll("[data-cs-draft]").forEach(node => {
      const key = node.dataset.csDraft;
      const prefix = tab === "batches" ? "b." : "c.";
      if (key.startsWith(prefix)) target[key.slice(2)] = node.value;
    });
    AC_SETTLEMENT_STATE.applied[tab] = {...target};
    AC_LIST.page = 1;
    acRender();
    acToast("筛选条件已生效");
    return;
  }
  const csReset = e.target.closest("[data-cs-reset]");
  if (csReset) {
    const tab = csReset.dataset.csReset;
    const defaults = tab === "batches"
      ? {keywordField:"settlement_batch_id",keyword:"",period:"current",batchStatus:"all",approvalStatus:"all",entity:"all",block:"all"}
      : {keywordField:"commission_case_id",keyword:"",period:"current",commissionStatus:"all",settlementStatus:"all",blockReason:"all",riskBand:"all"};
    AC_SETTLEMENT_STATE.draft[tab] = {...defaults};
    AC_SETTLEMENT_STATE.applied[tab] = {...defaults};
    AC_LIST.page = 1;
    acRender();
    acToast("筛选已重置");
    return;
  }
  const csMetric = e.target.closest("[data-cs-metric]");
  if (csMetric) {
    const metric = csMetric.dataset.csMetric;
    if (metric === "approval") { location.hash = "#/commission-settlement?tab=batches"; AC_SETTLEMENT_STATE.applied.batches = {...AC_SETTLEMENT_STATE.applied.batches,approvalStatus:"pending_review"}; AC_SETTLEMENT_STATE.draft.batches = {...AC_SETTLEMENT_STATE.applied.batches}; }
    else if (metric === "batches") { location.hash = "#/commission-settlement?tab=batches"; }
    else { location.hash = "#/commission-settlement?tab=commissions"; AC_SETTLEMENT_STATE.applied.commissions = {...AC_SETTLEMENT_STATE.applied.commissions,settlementStatus:metric === "blocked" ? "all" : metric,blockReason:metric === "blocked" ? "all" : "all"}; AC_SETTLEMENT_STATE.draft.commissions = {...AC_SETTLEMENT_STATE.applied.commissions}; }
    AC_LIST.page = 1;
    setTimeout(acRender,0);
    return;
  }
  const csBatch = e.target.closest("[data-cs-batch]");
  if (csBatch) { drawerSettlementBatch(csBatch.dataset.csBatch); return; }
  const csCase = e.target.closest("[data-cs-case]");
  if (csCase) { drawerSettlementCase(csCase.dataset.csCase); return; }
  const csProcessing = e.target.closest("[data-cs-processing]");
  if (csProcessing) { acDrawerClose(); location.hash = "#/risk?tab=objects"; acToast("已带案件上下文进入处理中心"); return; }
  const csApproval = e.target.closest("[data-cs-approval]");
  if (csApproval) { acDrawerClose(); location.hash = "#/workbench?tab=approvals"; acToast("已进入统一审批队列"); return; }
  const csDownload = e.target.closest("[data-cs-download]");
  if (csDownload) { acToast(`下载任务已创建 · ${csDownload.dataset.csDownload} · 文件完成后进入导出中心`); return; }
  const csRegenerate = e.target.closest("[data-cs-regenerate]");
  if (csRegenerate) { acDrawerClose(); AC_SETTLEMENT_STATE.generator.sourceBatchId = csRegenerate.dataset.csRegenerate; csOpenGenerator(csRegenerate.dataset.csRegenerate); acToast(`已载入 ${csRegenerate.dataset.csRegenerate} 的驳回上下文`); return; }
  const csGen = e.target.closest("[data-cs-gen-action]");
  if (csGen) {
    const action = csGen.dataset.csGenAction;
    if (action === "back") { AC_SETTLEMENT_STATE.generator.step = 1; csGeneratorModal(); return; }
    if (action === "preview") {
      const form = {};
      document.querySelectorAll("[data-cs-gen]").forEach(node => { form[node.dataset.csGen] = node.value; });
      if (AC_SETTLEMENT_STATE.generator.sourceBatchId && String(form.correctionNote || "").trim().length < 10) { acToast("请填写至少10字的修正说明", "error"); return; }
      AC_SETTLEMENT_STATE.generator.form = form;
      AC_SETTLEMENT_STATE.generator.preview = csPreviewData(form);
      AC_SETTLEMENT_STATE.generator.step = 2;
      csGeneratorModal();
      return;
    }
    if (action === "submit") { csSubmitGeneration(); return; }
  }
  const analyticsQuery = e.target.closest("[data-analytics-query]");
  if (analyticsQuery) {
    const draft = AC_STATE.analytics.draft;
    document.querySelectorAll("[data-analytics-draft]").forEach(node => { draft[node.dataset.analyticsDraft] = node.value; });
    draft.status = [...document.querySelectorAll("[data-analytics-status]:checked")].map(node => node.dataset.analyticsStatus);
    AC_STATE.analytics.applied = {...draft,status:[...draft.status]};
    AC_LIST.page = 1;
    acRender();
    acToast("经营分析已更新 · 快照已统一");
    return;
  }
  const analyticsReset = e.target.closest("[data-analytics-reset]");
  if (analyticsReset) {
    AC_STATE.analytics.draft = {...AC_ANALYTICS_DEFAULTS,status:[...AC_ANALYTICS_DEFAULTS.status]};
    AC_STATE.analytics.applied = {...AC_ANALYTICS_DEFAULTS,status:[...AC_ANALYTICS_DEFAULTS.status]};
    AC_LIST.page = 1;
    acRender();
    acToast("已恢复本月默认范围");
    return;
  }
  const analyticsClear = e.target.closest("[data-analytics-clear]");
  if (analyticsClear) {
    const key = analyticsClear.dataset.analyticsClear;
    const defaults = {...AC_ANALYTICS_DEFAULTS,status:[...AC_ANALYTICS_DEFAULTS.status]};
    AC_STATE.analytics.draft[key] = defaults[key];
    acRender();
    return;
  }
  const analyticsMetric = e.target.closest("[data-analytics-metric]");
  if (analyticsMetric) {
    const key = analyticsMetric.dataset.analyticsMetric;
    const map = {valid_clicks:"valid_clicks",registrations:"registration_completed",ftd_customers:"ftd",effective_ftd:"qualified",registration_to_effective_ftd_rate:"qualified",ftd_to_effective_ftd_rate:"ftd",accrued_commission:"commission",avg_commission_cost_per_effective_ftd:"qualified"};
    AC_STATE.analytics.metric = key;
    AC_STATE.analytics.applied.metric = map[key];
    AC_STATE.analytics.draft.metric = map[key];
    acRender();
    acToast(`已按“${analyticsMetric.querySelector(".ac-analytics-metric-label")?.textContent || "指标"}”刷新合作方汇总`);
    return;
  }
  const analyticsTrend = e.target.closest("[data-analytics-trend]");
  if (analyticsTrend) { AC_STATE.analytics.trendMetric = analyticsTrend.value; return; }
  const analyticsCompare = e.target.closest("[data-analytics-compare]");
  if (analyticsCompare) { AC_STATE.analytics.compare = analyticsCompare.checked; acRender(); return; }
  const analyticsBreakdown = e.target.closest("[data-analytics-breakdown]");
  if (analyticsBreakdown) { analyticsBreakdownDrawer(analyticsBreakdown.dataset.analyticsBreakdown); return; }
  const analyticsRow = e.target.closest("[data-analytics-row]");
  if (analyticsRow && !e.target.closest("button")) { analyticsBreakdownDrawer(analyticsRow.dataset.analyticsRow); return; }
  const analyticsExport = e.target.closest("[data-analytics-export]");
  if (analyticsExport) { analyticsExportModal(); return; }
  const analyticsExportSubmit = e.target.closest("[data-analytics-export-submit]");
  if (analyticsExportSubmit) {
    AC_STATE.analytics.exportStatus = `EX-${Date.now().toString().slice(-6)}`;
    analyticsExportModal();
    acToast(`导出任务 ${AC_STATE.analytics.exportStatus} 已创建`);
    return;
  }
  const analyticsRefresh = e.target.closest("[data-analytics-refresh]");
  if (analyticsRefresh) {
    if (AC_STATE.analytics.loading) return;
    AC_STATE.analytics.loading = true;
    acRender();
    setTimeout(() => {
      AC_STATE.analytics.loading = false;
      acRender();
      acToast("经营分析已刷新 · 快照 PERF-20261109-001");
    }, 650);
    return;
  }
  const attrView = e.target.closest("[data-attr-view]");
  if (attrView) {
    AC_ATTR_STATE.view = attrView.dataset.attrView;
    AC_LIST.page = 1;
    location.hash = `#/attribution?view=${encodeURIComponent(AC_ATTR_STATE.view)}`;
    return;
  }
  const attrMetric = e.target.closest("[data-attr-metric]");
  if (attrMetric) {
    const key = attrMetric.dataset.attrMetric;
    AC_LIST.page = 1;
    if (key === "pending") {
      AC_ATTR_STATE.view = "pending";
      AC_ATTR_STATE.appliedFilters = {};
      AC_ATTR_STATE.filters = {};
      location.hash = "#/attribution?view=pending";
    } else {
      const map = {overdue:{sla:"over"},conflict:{type:"attribution_conflict"},ib:{type:"ib_isolation"},sync:{dataState:"pending"},new:{new:"yes"}};
      AC_ATTR_STATE.appliedFilters = {...(AC_ATTR_STATE.appliedFilters || {}),...(map[key] || {})};
      acRender();
    }
    return;
  }
  const attrQuick = e.target.closest("[data-attr-quick]");
  if (attrQuick) {
    const key = attrQuick.dataset.attrQuick;
    const map = {conflict:{type:"attribution_conflict"},ib:{type:"ib_isolation"},overdue:{sla:"over"},sync:{dataState:"pending"},new:{new:"yes"}};
    const next = map[key] || {};
    const same = Object.entries(next).every(([k,v]) => AC_ATTR_STATE.appliedFilters[k] === v);
    AC_ATTR_STATE.appliedFilters = same ? {} : {...(AC_ATTR_STATE.appliedFilters || {}),...next};
    AC_ATTR_STATE.filters = {...AC_ATTR_STATE.appliedFilters};
    AC_LIST.page = 1;
    acRender();
    return;
  }
  const attrFilterToggle = e.target.closest("[data-attr-filter-toggle]");
  if (attrFilterToggle) { AC_ATTR_STATE.filterOpen = !AC_ATTR_STATE.filterOpen; acRender(); return; }
  const attrQuery = e.target.closest("[data-attr-query]");
  if (attrQuery) {
    const next = {};
    document.querySelectorAll("[data-attr-filter]").forEach(node => { if (node.value) next[node.dataset.attrFilter] = node.value.trim(); });
    AC_ATTR_STATE.appliedFilters = next;
    AC_ATTR_STATE.filters = {...next};
    AC_LIST.page = 1;
    acRender();
    return;
  }
  const attrReset = e.target.closest("[data-attr-reset]");
  if (attrReset) { AC_ATTR_STATE.filters = {}; AC_ATTR_STATE.appliedFilters = {}; AC_LIST.page = 1; acRender(); acToast("归属筛选已重置"); return; }
  const attrRemove = e.target.closest("[data-attr-remove]");
  if (attrRemove) { delete AC_ATTR_STATE.appliedFilters[attrRemove.dataset.attrRemove]; delete AC_ATTR_STATE.filters[attrRemove.dataset.attrRemove]; AC_LIST.page = 1; acRender(); return; }
  const attrClear = e.target.closest("[data-attr-clear]");
  if (attrClear) { AC_ATTR_STATE.filters = {}; AC_ATTR_STATE.appliedFilters = {}; AC_LIST.page = 1; acRender(); return; }
  const attrOpen = e.target.closest("[data-attr-open]");
  if (attrOpen) { drawerAttribution(attrOpen.dataset.attrOpen); return; }
  const attrProcess = e.target.closest("[data-attr-process]");
  if (attrProcess) { acAttrProcessModal(attrProcess.dataset.attrProcess); return; }
  const attrSubmit = e.target.closest("[data-attr-submit]");
  if (attrSubmit) { acAttrSubmit(attrSubmit.dataset.attrSubmit); return; }
  const attrApproval = e.target.closest("[data-attr-approval]");
  if (attrApproval) { acAttrApprovalModal(attrApproval.dataset.attrApproval,attrApproval.dataset.approvalAction); return; }
  const attrApprovalSubmit = e.target.closest("[data-attr-approval-submit]");
  if (attrApprovalSubmit) { acAttrApprovalSubmit(attrApprovalSubmit.dataset.attrApprovalSubmit,attrApprovalSubmit.dataset.approvalSubmitAction); return; }
  const attrClaim = e.target.closest("[data-attr-claim]");
  if (attrClaim) { const r = AC_ATTR_DATA.find(x => x.id === attrClaim.dataset.attrClaim); if (r) { r.status = "in_review"; r.requester = "ops_chen"; r.timeline.push(["2026-11-09 09:21","案件已认领","当前处理人：ops_chen","is-current"]); acDrawerClose(); acRender(); acToast(`已认领 ${r.id}`); } return; }
  const attrTransfer = e.target.closest("[data-attr-transfer]");
  if (attrTransfer) { acToast(`已打开 ${attrTransfer.dataset.attrTransfer} 转办表单`); return; }
  const attrRetry = e.target.closest("[data-attr-retry]");
  if (attrRetry) { acAttrRetry(attrRetry.dataset.attrRetry); return; }
  const attrRefresh = e.target.closest("[data-attr-refresh]");
  if (attrRefresh) {
    if (AC_ATTR_STATE.loading) return;
    AC_ATTR_STATE.loading = true; acRender();
    setTimeout(() => { AC_ATTR_STATE.loading = false; AC_ATTR_STATE.dataState = "ready"; acRender(); acToast("归属数据已刷新 · data_as_of 2026-11-09 09:25"); },650);
    return;
  }
  const attrRetryLoad = e.target.closest("[data-attr-retry-load]");
  if (attrRetryLoad) { AC_ATTR_STATE.dataState = "ready"; AC_ATTR_STATE.loading = false; acRender(); acToast("归属数据连接已恢复"); return; }
  const attrExport = e.target.closest("[data-attr-export]");
  if (attrExport) { acAttrExportModal(); return; }
  const attrExportSubmit = e.target.closest("[data-attr-export-submit]");
  if (attrExportSubmit) {
    const id = `EXP-ATTR-${Date.now().toString().slice(-6)}`;
    AC_ATTR_STATE.exportJobs.unshift({id,status:"处理中",created:"2026-11-09 09:26",rows:"—",expires:"—"});
    acModalClose();acToast(`导出任务 ${id} 已创建 · 可在导出中心查看`);
    setTimeout(() => { const job = AC_ATTR_STATE.exportJobs.find(x => x.id === id); if (job) { job.status = "可下载"; job.rows = String(acAttrViewRows(AC_ATTR_STATE.view).length); job.expires = "2026-11-10 09:26"; } acToast(`导出任务 ${id} 已完成`); },700);
    return;
  }
  const attrSensitive = e.target.closest("[data-attr-sensitive]");
  if (attrSensitive) { acToast(AC_ATTR_CAN_SENSITIVE() ? "敏感证据查看动作已写入审计" : "当前角色无权查看敏感证据",AC_ATTR_CAN_SENSITIVE() ? "success" : "error"); return; }
  const attrCopy = e.target.closest("[data-attr-copy]");
  if (attrCopy) { if (navigator.clipboard) navigator.clipboard.writeText(attrCopy.dataset.attrCopy).catch(() => {}); acToast("TraceId已复制 · 已写入审计"); return; }
  const attrJumpEvent = e.target.closest("[data-attr-jump-event]");
  if (attrJumpEvent) { location.hash = `#/events?trace_id=${encodeURIComponent(attrJumpEvent.dataset.attrJumpEvent)}`; return; }
  const attrJumpCustomer = e.target.closest("[data-attr-jump-customer]");
  if (attrJumpCustomer) { window.location.href = `../customer-360/customer-360.html#/customer-360/${encodeURIComponent(attrJumpCustomer.dataset.attrJumpCustomer)}?tab=attribution&from=attribution`; return; }
  const it = e.target.closest("[data-dd-item]");
  if (it) {const def = AC_DROPDOWN.items[it.dataset.ddKey];acDDClose();if (def) def.onSelect(it.dataset.ddItem);return;}
  const tr = e.target.closest("[data-dd-trigger]");
  if (tr) {e.stopPropagation();acDDToggle(tr.dataset.ddTrigger);return;}
  if (AC_ACTION_PORTAL && !e.target.closest("[data-config-menu]") && !e.target.closest("[data-config-action]")) {AC_ACTION_PORTAL.remove();AC_ACTION_PORTAL=null;}
  if (AC_DROPDOWN.openKey && !e.target.closest(".ac-dropdown-panel")) acDDClose();
  const go = e.target.closest("[data-go]");
  if (go) {location.hash = `#/${go.dataset.go}`;return;}
  const pt = e.target.closest("[data-ptab]");
  if (pt) {location.hash = `#/${pt.dataset.route}?tab=${pt.dataset.ptab}`;return;}
  const sg = e.target.closest("[data-seg]");
  if (sg) {const {route} = acParseHash();location.hash = `#/${route}?tab=${encodeURIComponent(sg.dataset.val)}`;return;}
  const grp = e.target.closest("[data-group]");
  if (grp) {grp.parentElement.classList.toggle("open");return;}
  /* 列表引擎：排序/翻页/重置/搜索 */
  const th = e.target.closest("[data-sort]");
  if (th) {const rt = th.dataset.route,key = th.dataset.sort;const cur = AC_LIST.sort[rt] || {};AC_LIST.sort[rt] = cur.key === key && cur.dir === "asc" ? {key,dir:"desc"} : {key,dir:"asc"};acRender();return;}
  const pg = e.target.closest("[data-pg]");
  if (pg && !pg.disabled) {AC_LIST.page = Number(pg.dataset.pg);acRender();return;}
  const fr = e.target.closest("[data-filter-reset]");
  if (fr) {acFilterReset(fr.dataset.filterReset);acRender();acToast("筛选已重置");return;}
  const cs = e.target.closest("[data-click-search]");
  if (cs) {const inp = document.querySelector(`[data-lsearch="${cs.dataset.clickSearch}"]`);if (inp) {const rt = inp.dataset.lsearch;AC_LIST.filters[rt] = {...(AC_LIST.filters[rt]||{}),q:inp.value.trim().toLowerCase()};AC_LIST.page = 1;acRender();}return;}
  const mv = e.target.closest("[data-matview]");
  if (mv) {AC_STATE.matView = mv.dataset.matview;acRender();return;}
  const mq = e.target.closest("[data-mat-query]");
  if (mq) {
    const controls = [...document.querySelectorAll("[data-mat-filter]")];
    AC_LIST.filters.materials = controls.reduce((acc,node) => {acc[node.dataset.matFilter] = node.dataset.matFilter === "q" ? node.value.trim().toLowerCase() : node.value.trim();return acc;},{});
    AC_LIST.page = 1;acRender();return;
  }
  const mr = e.target.closest("[data-mat-reset]");
  if (mr) {AC_LIST.page = 1;AC_LIST.filters.materials = {status:"启用"};AC_LIST.sort.materials = {};AC_STATE.matSelected = [];acRender();acToast("素材筛选已重置");return;}
  const mclear = e.target.closest("[data-material-clear]");
  if (mclear) {AC_STATE.matSelected = [];acRender();return;}
  const mb = e.target.closest("[data-material-batch]");
  if (mb) {materialBatchConfirm(mb.dataset.materialBatch);return;}
  const mbc = e.target.closest("[data-material-batch-confirm]");
  if (mbc) {materialBatchSubmit(mbc.dataset.materialBatchConfirm);return;}
  const ma = e.target.closest("[data-material-action]");
  if (ma) {
    const action = ma.dataset.materialAction, id = ma.dataset.materialId;
    if (action === "upload") {materialUploadModal();return;}
    if (action === "preview" || action === "version-preview") {drawerMaterial(id);return;}
    if (action === "usage") {drawerMaterial(id);return;}
    if (action === "edit") {materialEditModal(id);return;}
    if (action === "replace") {materialEditModal(id,true);return;}
    if (action === "disable" || action === "enable" || action === "archive") {materialConfirm(id,action);return;}
    if (action === "more") {drawerMaterial(id);return;}
  }
  const ms = e.target.closest("[data-material-save]");
  if (ms) {materialSubmit(ms.dataset.materialSave,ms.dataset.materialId);return;}
  const mc = e.target.closest("[data-material-confirm]");
  if (mc) {materialConfirmSubmit(mc.dataset.materialConfirm,mc.dataset.materialId);return;}
  const dom = e.target.closest("[data-domain]");
  if (dom) {AC_STATE.configDomain = dom.dataset.domain;acRender();return;}
  const rg = e.target.closest("[data-risk-group]");
  if (rg) {AC_STATE.riskGroup = rg.dataset.riskGroup;acRender();return;}
  const cm = e.target.closest("[data-config-menu]");
  if (cm) {
    if (AC_ACTION_PORTAL) {AC_ACTION_PORTAL.remove();AC_ACTION_PORTAL=null;}
    const menu = cm.closest(".ac-action-menu"), panel = menu.querySelector(".ac-action-panel");
    const portal = panel.cloneNode(true); portal.classList.add("ac-action-portal"); portal.style.display="grid";
    document.body.appendChild(portal);
    const rect = cm.getBoundingClientRect(), pw = Math.max(150, portal.offsetWidth), ph = portal.offsetHeight;
    portal.style.left = `${Math.max(8, Math.min(window.innerWidth-pw-8, rect.right-pw))}px`;
    portal.style.top = `${rect.bottom+6+ph > window.innerHeight ? Math.max(8, rect.top-ph-6) : rect.bottom+6}px`;
    AC_ACTION_PORTAL=portal; return;
  }
  const ca = e.target.closest("[data-config-action]");
  if (ca) {
    if (AC_ACTION_PORTAL) {AC_ACTION_PORTAL.remove();AC_ACTION_PORTAL=null;}
    const action = ca.dataset.configAction, version = ca.dataset.configActionVersion;
    if (action === "view") {AC_STATE.configVersion = version;AC_STATE.configView = "detail";AC_STATE.configDomain = "财务规则";acRender();return;}
    const labels = {copy:"已复制为新草稿，重新生成版本号",activate:"已打开生效设置：先校验唯一生效/待生效版本",void:"已打开作废确认，需要填写原因",withdraw:"已打开撤回确认，需要填写原因",reschedule:"已打开生效时间调整"};
    acToast(labels[action] || "已打开操作");return;
  }
  const cb = e.target.closest("[data-config-back]");
  if (cb) {AC_STATE.configView = "list";acRender();return;}
  const cv = e.target.closest("[data-config-version]");
  if (cv) {AC_STATE.configVersion = cv.dataset.configVersion;AC_STATE.configView = "detail";AC_STATE.configDomain = "财务规则";acRender();return;}
  const ci = e.target.closest("[data-config-item]");
  if (ci) {const [domain,item] = ci.dataset.configItem.split("|");configItemDrawer(domain,item);return;}
  const rc = e.target.closest("[data-risk-config]");
  if (rc) {riskConfigDrawer(rc.dataset.riskConfig);return;}
  const re = e.target.closest("[data-risk-edit]");
  if (re) {riskConfigEditor(re.dataset.riskEdit);return;}
  const rs = e.target.closest("[data-risk-save]");
  if (rs) {saveRiskEditor(rs.dataset.riskSave);return;}
  const bannerClose = e.target.closest("[data-close-banner]");
  if (bannerClose) {bannerClose.closest(".ac-banner").remove();return;}
  const dc = e.target.closest("[data-drawer-close]");
  if (dc) {acDrawerClose();return;}
  const ap = e.target.closest("[data-approve]");
  if (ap) {drawerApproval(ap.dataset.approve);return;}
  const at = e.target.closest("[data-approval]");
  if (at) {drawerApproval(at.dataset.approval);return;}
  const tkd = e.target.closest("[data-task]");
  if (tkd) {drawerTask(tkd.dataset.task);return;}
  const ta = e.target.closest("[data-task-action]");
  if (ta) {taskAction(ta.dataset.taskAction,ta.dataset.taskId);return;}
  const tcx = e.target.closest("[data-task-complete-confirm]");
  if (tcx) {acModalClose();acDrawerClose();acToast(`已提交 ${tcx.dataset.taskCompleteConfirm}，结果已进入后续审批`);return;}
  const ttx = e.target.closest("[data-task-transfer-confirm]");
  if (ttx) {acModalClose();acDrawerClose();acToast(`已转办 ${ttx.dataset.taskTransferConfirm}，接收人将收到通知`);return;}
  const ts = e.target.closest("[data-toast]");
  if (ts) {acToast(ts.dataset.toast);return;}
  const rv = e.target.closest("[data-review]");
  if (rv) {drawerReview(rv.dataset.review);return;}
  const pr = e.target.closest("[data-partner]");
  if (pr) {drawerPartner(pr.dataset.partner);return;}
  const commBtn = e.target.closest("[data-comm]");
  if (commBtn) {drawerComm(commBtn.dataset.comm);return;}
  const st = e.target.closest("[data-stm]");
  if (st) {drawerStatement(st.dataset.stm);return;}
  const tc = e.target.closest("[data-trace]");
  if (tc) {drawerTrace(tc.dataset.trace);return;}
  const pth = e.target.closest("[data-path]");
  if (pth) {drawerPath(JSON.parse(pth.dataset.path));return;}
  const tk = e.target.closest("[data-ticket]");
  if (tk) {drawerTicket(tk.dataset.ticket);return;}
  const ro = e.target.closest("[data-riskobj]");
  if (ro) {drawerRisk(JSON.parse(ro.dataset.riskobj));return;}
  const c360 = e.target.closest("[data-customer360]");
  if (c360) {window.location.href = `../customer-360/customer-360.html#/customer-360/${encodeURIComponent(c360.dataset.customer360)}`;return;}
  const pb = e.target.closest("[data-pb]");
  if (pb) {drawerPB(pb.dataset.pb);return;}
  const wd = e.target.closest("[data-wd]");
  if (wd) {drawerWD(wd.dataset.wd);return;}
});
document.addEventListener("input",e => {
  if (e.target.matches("input[data-ac-draft]")) {
    const config = acUnifiedFilterConfig();if (!config) return;
    const draft = AC_FILTER_UI.drafts[config.id] || (AC_FILTER_UI.drafts[config.id] = acFilterClone(config.get()));
    draft[e.target.dataset.acDraft] = e.target.dataset.acDraft === "q" ? e.target.value.trim().toLowerCase() : e.target.value;
  }
  if (e.target.closest("[data-risk-form]")) updateRiskEditor();
});
document.addEventListener("change",e => {
  if (e.target.matches("[data-ac-quick],[data-ac-draft]")) {
    const config = acUnifiedFilterConfig();if (!config) return;
    const quick = e.target.hasAttribute("data-ac-quick"), key = quick ? e.target.dataset.acQuick : e.target.dataset.acDraft;
    const value = e.target.multiple ? [...e.target.selectedOptions].map(option => option.value) : e.target.value;
    if (quick) acCommitUnifiedFilters(config,{...acFilterClone(config.get()),[key]:value});
    else {const draft = AC_FILTER_UI.drafts[config.id] || (AC_FILTER_UI.drafts[config.id] = acFilterClone(config.get()));draft[key] = key === "q" ? value.trim().toLowerCase() : value;}
    return;
  }
  if (e.target.matches("input[name='attr-conclusion']")) {
    const proposed = document.querySelector("#attr-proposed-affiliate");
    if (proposed) proposed.disabled = e.target.value !== "correct";
  }
  if (e.target.matches("[data-analytics-trend]")) {
    AC_STATE.analytics.trendMetric = e.target.value;
    acRender();
    return;
  }
  if (e.target.matches("[data-analytics-compare]")) {
    AC_STATE.analytics.compare = e.target.checked;
    acRender();
    return;
  }
  if (e.target.closest("[data-risk-form]")) updateRiskEditor();
  if (e.target.matches("[data-material-select]")) {
    const id = e.target.dataset.materialSelect;
    AC_STATE.matSelected = e.target.checked ? [...new Set([...AC_STATE.matSelected,id])] : AC_STATE.matSelected.filter(x => x !== id);
    acRender();
    return;
  }
  if (e.target.matches("[data-material-select-all]")) {
    const rows = materialRows().rows;
    const ids = rows.map(m => m.id);
    AC_STATE.matSelected = e.target.checked ? [...new Set([...AC_STATE.matSelected,...ids])] : AC_STATE.matSelected.filter(id => !ids.includes(id));
    acRender();
    return;
  }
  if (e.target.matches("[data-material-file]")) {
    const label = e.target.closest(".ac-upload-zone")?.querySelector("[data-material-file-label]");
    if (label) label.textContent = e.target.files?.[0]?.name || "支持的格式和大小由服务端规则返回";
  }
});
document.addEventListener("keydown",e => {
  if (e.key === "Enter" && e.target.matches("input[data-ac-draft]")) {
    e.preventDefault();document.querySelector("[data-ac-apply]")?.click();return;
  }
  if (e.key === "Enter" && e.target.matches("[data-attr-filter]")) {
    const next = {};
    document.querySelectorAll("[data-attr-filter]").forEach(node => { if (node.value) next[node.dataset.attrFilter] = node.value.trim(); });
    AC_ATTR_STATE.appliedFilters = next; AC_ATTR_STATE.filters = {...next}; AC_LIST.page = 1; acRender();
    return;
  }
  if (e.key === "Enter" && e.target.matches("[data-lsearch]")) {
    const rt = e.target.dataset.lsearch;
    AC_LIST.filters[rt] = {...(AC_LIST.filters[rt]||{}),q:e.target.value.trim().toLowerCase()};
    AC_LIST.page = 1;acRender();
  }
  if (e.key === "Enter" && e.target.matches("[data-cs-draft$='keyword']")) {
    const tab = e.target.dataset.csDraft.startsWith("b.") ? "batches" : "commissions";
    document.querySelector(`[data-cs-query="${tab}"]`)?.click();
  }
  if (e.key === "Enter" && e.target.matches("[data-mat-filter='q']")) {
    const f = AC_LIST.filters.materials || {};
    AC_LIST.filters.materials = {...f,q:e.target.value.trim().toLowerCase()};
    AC_LIST.page = 1;acRender();
  }
  if (e.key === "Escape") {
    acModalClose();
    acDrawerClose();
  }
});
window.addEventListener("scroll",() => {if (AC_DROPDOWN.openKey) acDDClose();},true);
window.addEventListener("resize",() => {if (AC_DROPDOWN.openKey) acDDClose();});
window.addEventListener("hashchange",acRender);
acRender();
