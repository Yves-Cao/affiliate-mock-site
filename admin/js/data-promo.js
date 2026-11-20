/* 管理端 1.0 —— 客户与推广模块演示数据（虚构合成数据；客户只用 ID，无姓名、邮箱、手机号） */
(function () {
  const ADM = window.ADM;
  const Cu = (id, partner, campaign, sub, country, life, attr, comm, r, reg, ftd, click, extra) => Object.assign({ id, partner, campaign, sub, country, life, attr, comm, r, reg, ftd, click, win: 30 }, extra || {});
  ADM.customers = [
    Cu("C-80317", "P-10024", "CMP-2201 年终开户", "sub-a17", "TH", "有效转化", "已锁定", [["结算中", "620.00"], ["冻结", "620.00"]], "R2", "2026-10-05 10:12", "2026-10-07 09:40", "2026-10-04 21:30", { lock: "2026-10-05 10:12" }),
    Cu("C-80511", "P-10017", "CMP-2188 新客礼", "sub-b02", "PH", "已首次入金", "冲突", [["待放行", "280.00"]], "R1", "2026-11-02 14:20", "2026-11-04 11:00", "2026-11-02 12:00", { cands: ["P-10017", "P-10011"] }),
    Cu("C-80622", "P-10011", "CMP-2175 内容合作", "sub-c09", "ID", "已注册", "冲突", [], null, "2026-11-10 09:00", null, "2026-11-09 18:30", { cands: ["P-10011", "P-10014"] }),
    Cu("C-80105", "P-10011", "CMP-2175 内容合作", "sub-c01", "ID", "有效转化", "已锁定", [["已支付", "540.00"]], "R0", "2026-09-12 08:00", "2026-09-14 12:00", "2026-09-11 20:00", { lock: "2026-09-12 08:00" }),
    Cu("C-80419", "P-10031", "CMP-2230 社群拉新", "sub-d44", "ID", "有效转化", "已锁定", [["冻结", "1,980.00"]], "R3", "2026-10-20 16:00", "2026-10-22 10:00", "2026-10-20 15:00", { lock: "2026-10-20 16:00" }),
    Cu("C-80702", "P-10029", "CMP-2219 测评", "sub-e08", "VN", "有效转化", "已锁定", [["冻结", "310.00"]], "R1", "2026-10-15 13:00", "2026-10-16 10:00", "2026-10-15 11:40", { lock: "2026-10-15 13:00" }),
    Cu("C-80655", "P-10012", "CMP-2205 评测周", "sub-f13", "SG", "已首次入金", "已锁定", [["结算中", "86.40"]], null, "2026-11-06 07:00", "2026-11-07 08:30", "2026-11-05 22:00", { lock: "2026-11-06 07:00" }),
    Cu("C-80233", "P-10022", "CMP-2191 联盟", "sub-g21", "MY", "有效转化", "已锁定", [["可结算", "420.00"]], "R1", "2026-09-28 11:00", "2026-09-29 15:00", "2026-09-27 19:00", { lock: "2026-09-28 11:00" }),
    Cu("C-80741", null, "—", "—", "SG", "已注册", "无有效来源", [], "R0", "2026-11-12 10:00", null, null, {}),
    Cu("C-80760", "P-10006", "CMP-2210 直播", "sub-h05", "SG", "已注册", "待确定", [], null, "2026-11-18 09:30", null, "2026-11-18 09:00", { missing: ["首次点击时间戳"] }),
    Cu("C-80790", "P-10018", "CMP-2214 资讯", "sub-i11", "SG", "流失", "已释放", [["已关闭", "0.00"]], "R0", "2026-08-02 10:00", "2026-08-03 09:00", "2026-08-01 20:00", { lock: "2026-08-02 10:00" })
  ];
  ADM.attrExceptions = [
    { cust: "C-80511", type: "冲突", cands: ["P-10017", "P-10011"], amt: "280.00", task: "T-24107", found: "2026-11-04", days: 15 },
    { cust: "C-80622", type: "冲突", cands: ["P-10011", "P-10014"], amt: null, task: "T-24115", found: "2026-11-10", days: 9 },
    { cust: "C-80760", type: "事实不完整", cands: [], amt: null, task: null, found: "2026-11-18", days: 1 },
    { cust: "C-80533", type: "版本乱序", cands: [], amt: "120.00", task: null, found: "2026-11-17", days: 2 },
    { cust: "C-80548", type: "配置缺失", cands: [], amt: null, task: null, found: "2026-11-16", days: 3 },
    { cust: "C-80571", type: "注册早于点击", cands: ["P-10012"], amt: "—", task: null, found: "2026-11-15", days: 4 }
  ];
  const E = (id, at, type, src, result, trace, cust, rel) => ({ id, at, type, src, result, trace, cust, rel });
  ADM.events = [
    E("EV-70011", "2026-11-19 09:48", "结算状态变化", "Affiliate", "冻结（超时信号）", "tr-91a0c3d1", "C-80317", "CS-5531"),
    E("EV-70010", "2026-11-19 09:12", "风险事件", "规则引擎", "命中 R-PRA", "tr-91a0b7e2", "C-80419", "EVT-9921"),
    E("EV-70009", "2026-11-18 18:30", "有效转化", "CRM", "已确认", "tr-8f7712aa", "C-80655", "CM-4390"),
    E("EV-70008", "2026-11-18 09:30", "注册", "CRM", "成功（缺首次点击时间）", "tr-8f6a0021", "C-80760", "—"),
    E("EV-70007", "2026-11-17 16:20", "归属变化", "Affiliate", "冲突（多候选）", "tr-8e55c4be", "C-80511", "ATTR-7731"),
    E("EV-70006", "2026-11-12 10:00", "注册", "CRM", "成功（无有效来源）", "tr-8a1190ff", "C-80741", "—"),
    E("EV-70005", "2026-11-07 08:30", "首次入金", "CRM", "已确认", "tr-8744a5c0", "C-80655", "—"),
    E("EV-70004", "2026-11-05 22:00", "点击", "追踪服务", "有效点击", "tr-86c3d908", "C-80655", "LK-3004"),
    E("EV-70003", "2026-10-22 10:00", "首次入金", "CRM", "已确认", "tr-7b1e2f33", "C-80419", "—"),
    E("EV-70002", "2026-10-16 10:00", "佣金生成", "Affiliate", "CM-4471 · 310.00", "tr-7a90b1c7", "C-80702", "CM-4471"),
    E("EV-70001", "2026-10-07 09:40", "同步与补数", "集成", "补数完成", "tr-79aa0001", "C-80317", "BF-2012")
  ];
  ADM.campaigns = [
    { id: "CMP-2201", name: "年终开户", partner: "P-10024", state: "活跃", links: 3, subs: 2, clicks: 4120, reg: 288, ftd: 61, qc: 33, countries: "TH · MY +1", upd: "2026-11-18" },
    { id: "CMP-2188", name: "新客礼", partner: "P-10017", state: "活跃", links: 2, subs: 2, clicks: 2980, reg: 190, ftd: 40, qc: 21, countries: "PH · ID", upd: "2026-11-17" },
    { id: "CMP-2175", name: "内容合作", partner: "P-10011", state: "活跃", links: 4, subs: 3, clicks: 9020, reg: 650, ftd: 140, qc: 82, countries: "ID · TH +2", upd: "2026-11-19" },
    { id: "CMP-2230", name: "社群拉新", partner: "P-10031", state: "活跃", links: 2, subs: 1, clicks: 6100, reg: 410, ftd: null, qc: null, countries: "ID · PH", upd: "2026-11-19" },
    { id: "CMP-2102", name: "夏季活动", partner: "P-10003", state: "已归档", links: 1, subs: 1, clicks: 0, reg: 0, ftd: 0, qc: 0, countries: "SG", upd: "2026-08-30" }
  ];
  ADM.links = [
    { id: "LK-3001", partner: "P-10024", campaign: "CMP-2201", sub: "sub-a17", path: "开户落地页 · v5", loc: "TH / 泰语 / 全部", state: "生效", clicks: 2100, valid: 1900, at: "2026-10-01" },
    { id: "LK-3002", partner: "P-10024", campaign: "CMP-2201", sub: "sub-a18", path: "开户落地页 · v5", loc: "MY / 马来语 / 移动", state: "生效", clicks: 1500, valid: 1380, at: "2026-10-01" },
    { id: "LK-3003", partner: "P-10031", campaign: "CMP-2230", sub: "sub-d44", path: "新客礼 · v2", loc: "ID / 印尼语 / 全部", state: "已暂停", reason: "风控", clicks: 3800, valid: 2600, at: "2026-10-10" },
    { id: "LK-3004", partner: "P-10012", campaign: "CMP-2205", sub: "sub-f13", path: "产品介绍 · v3", loc: "SG / 英语 / 全部", state: "生效", clicks: 800, valid: 770, at: "2026-10-20" },
    { id: "LK-3005", partner: "P-10009", campaign: "CMP-2150", sub: "sub-j02", path: "开户落地页 · v4", loc: "MY / 英语 / 全部", state: "已暂停", reason: "合作方状态联动", clicks: 640, valid: 590, at: "2026-09-01" },
    { id: "LK-3006", partner: "P-10003", campaign: "CMP-2102", sub: "sub-k01", path: "活动页 · v1", loc: "SG / 英语 / 全部", state: "已过期", clicks: 12, valid: 10, at: "2026-06-01" },
    { id: "LK-3007", partner: "P-10040", campaign: "CMP-2120", sub: "sub-l09", path: "开户落地页 · v4", loc: "ID / 印尼语 / 全部", state: "已暂停", reason: "运营暂停", clicks: 220, valid: 180, at: "2026-09-15" },
    { id: "LK-3008", partner: "P-10006", campaign: "CMP-2210", sub: "sub-h05", path: "直播活动 · v1", loc: "SG / 英语 / 移动", state: "未知", clicks: null, valid: null, at: "2026-11-10" }
  ];
  ADM.subids = [
    { id: "sub-a17", partner: "P-10024", campaign: "CMP-2201", state: "启用", clicks: 2100, reg: 150, ftd: 30, qc: 17, at: "2026-10-01" },
    { id: "sub-a18", partner: "P-10024", campaign: "CMP-2201", state: "启用", clicks: 1500, reg: 120, ftd: 28, qc: 15, at: "2026-10-01" },
    { id: "sub-d44", partner: "P-10031", campaign: "CMP-2230", state: "平台限制", clicks: 3800, reg: 300, ftd: null, qc: null, at: "2026-10-10" },
    { id: "sub-f13", partner: "P-10012", campaign: "CMP-2205", state: "启用", clicks: 800, reg: 52, ftd: 9, qc: 6, at: "2026-10-20" },
    { id: "sub-j02", partner: "P-10009", campaign: "CMP-2150", state: "自停用", clicks: 640, reg: 40, ftd: 6, qc: 3, at: "2026-09-01" }
  ];
  const M = (id, name, type, ver, scope, path, state, used, upd, vers) => ({ id, name, type, ver, scope, path, state, used, upd, vers: vers || [] });
  ADM.materials = [
    M("MT-1001", "年终开户横幅 728×90", "横幅", 3, "TH · 泰语 · 全部设备", "开户落地页 #LP-12", "启用", 12, "2026-11-12", [["v3", "2026-11-12", "替换文件"], ["v2", "2026-10-20", "元数据更新"], ["v1", "2026-10-01", "首次上传"]]),
    M("MT-1002", "新客礼视频 30 秒", "视频", 1, "ID · 印尼语 · 移动", "新客礼 #LP-15", "启用", 5, "2026-11-10", [["v1", "2026-11-10", "首次上传"]]),
    M("MT-1003", "夏季活动 GIF", "GIF", 2, "不限", "活动页 #LP-03", "过期", 0, "2026-08-31", [["v2", "2026-07-01", "替换文件"], ["v1", "2026-06-01", "首次上传"]]),
    M("MT-1004", "产品介绍落地页", "落地页", 4, "SG · 英语", "产品介绍 #LP-07", "启用", 8, "2026-11-05", [["v4", "2026-11-05", "路径更新"]]),
    M("MT-1005", "双十一开户横幅", "横幅", 1, "MY · 全部", "开户落地页 #LP-12", "待生效", 0, "2026-11-18", [["v1", "2026-11-18", "首次上传"]]),
    M("MT-1006", "旧版直播海报", "横幅", 2, "VN · 越南语", "直播活动 #LP-20", "停用", 0, "2026-10-02", [["v2", "2026-10-02", "停用前最后版本"]]),
    M("MT-1007", "新手引导 GIF", "GIF", 1, "不限", "产品介绍 #LP-07", "启用", 3, "2026-11-01", [["v1", "2026-11-01", "首次上传"]]),
    M("MT-1008", "春季活动横幅（归档）", "横幅", 1, "SG", "活动页 #LP-03", "归档", 0, "2026-05-01", [["v1", "2026-04-01", "首次上传"]])
  ];
  const D = (id, partner, ev, target, state, tries, next, err, upd, extra) => Object.assign({ id, partner, ev, target, state, tries, next, err, upd, tl: [] }, extra || {});
  ADM.deliveries = [
    D("DLV-88217", "P-10006", "有效转化", "tracker-sample.example", "失败", 5, "需人工", "目标拒绝", "2026-11-19 10:11", { tl: [["10:11", "失败：目标拒绝", 5], ["09:41", "失败：目标拒绝", 4]], task: "T-24109" }),
    D("DLV-88220", "P-10011", "注册", "pb-demo-a.example", "成功", 1, "—", "—", "2026-11-19 09:50"),
    D("DLV-88221", "P-10011", "首次入金", "pb-demo-a.example", "成功", 1, "—", "—", "2026-11-19 09:52"),
    D("DLV-88224", "P-10022", "有效转化", "pb-demo-b.example", "超时", 2, "2026-11-19 10:45", "超时", "2026-11-19 10:15", { tl: [["10:15", "超时", 2], ["10:05", "超时", 1]] }),
    D("DLV-88226", "P-10014", "注册", "pb-demo-c.example", "未知", 1, "—", "回执含糊", "2026-11-19 09:30", { tl: [["09:30", "未知：回执含糊（先查询，不重发）", 1]] }),
    D("DLV-88230", "P-10024", "注册", "pb-demo-d.example", "重试中", 2, "2026-11-19 10:40", "超时", "2026-11-19 10:20", { tl: [["10:20", "超时，等待重试", 2]] }),
    D("DLV-88231", "P-10012", "首次入金", "pb-demo-e.example", "重复已忽略", 1, "—", "—", "2026-11-19 08:00"),
    D("DLV-88233", "P-10027", "注册", "pb-demo-f.example", "待发送", 0, "2026-11-19 10:35", "—", "2026-11-19 10:29")
  ];
  ADM.pbConfigs = [
    { id: "TRK-501", name: "主回传", partner: "P-10006", platform: "自建服务", events: "注册 · 首次入金 · 有效转化", state: "启用", rate: "62%", test: "通过（2026-11-10）", secret: "已设置", upd: "2026-11-10" },
    { id: "TRK-502", name: "投放平台 A", partner: "P-10011", platform: "投放平台", events: "注册 · 首次入金", state: "启用", rate: "99%", test: "通过（2026-11-01）", secret: "已设置", upd: "2026-11-01" },
    { id: "TRK-503", name: "投放平台 B", partner: "P-10022", platform: "投放平台", events: "有效转化", state: "测试中", rate: null, test: "模板无效（2026-11-18）", secret: "未设置", upd: "2026-11-18" },
    { id: "TRK-504", name: "旧回传", partner: "P-10009", platform: "自建服务", events: "注册", state: "暂停", rate: "—", test: "—", secret: "已设置", upd: "2026-10-12" },
    { id: "TRK-505", name: "草稿配置", partner: "P-10033", platform: "—", events: "—", state: "草稿", rate: null, test: "—", secret: "未设置", upd: "2026-11-15" }
  ];
  ADM.clicks = [
    { id: "CK-90011", sess: "S-4410", partner: "P-10024", link: "LK-3001", sub: "sub-a17", at: "2026-11-19 10:02", valid: "有效", country: "TH", device: "移动" },
    { id: "CK-90012", sess: "S-4411", partner: "P-10024", link: "LK-3002", sub: "sub-a18", at: "2026-11-19 10:05", valid: "有效", country: "MY", device: "桌面" },
    { id: "CK-90013", sess: "S-4415", partner: "P-10031", link: "LK-3003", sub: "sub-d44", at: "2026-11-19 09:40", valid: "风险拒绝", country: "ID", device: "移动" },
    { id: "CK-90014", sess: "S-4420", partner: "P-10012", link: "LK-3004", sub: "sub-f13", at: "2026-11-19 09:55", valid: "判定中", country: "SG", device: "桌面" },
    { id: "CK-90015", sess: "S-4422", partner: "P-10006", link: "LK-3008", sub: "sub-h05", at: "2026-11-18 18:30", valid: "未知", country: "SG", device: "移动" },
    { id: "CK-90016", sess: "S-4430", partner: "P-10011", link: "—", sub: "—", at: "2026-11-18 14:10", valid: "有效", country: "ID", device: "移动" }
  ];
})();
