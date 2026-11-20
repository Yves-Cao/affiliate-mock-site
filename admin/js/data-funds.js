/* 管理端 1.0 —— 资金模块演示数据（虚构合成数据）。来源：页面 22 / 23 / 24。金额 USD，两位小数。 */
(function () {
  const ADM = window.ADM;
  const NOW = "2026-11-19 10:30";

  /* 新建审批的通用入口（资金类固定不允许自审） */
  ADM.newApproval = function (o) {
    const n = "AP-" + (3114 + ADM.approvals.length - 13);
    const a = Object.assign({ id: n, applicant: ADM.role().userId, at: NOW, waitH: 0, limitH: 8, step: 0, status: "pending", capital: true, previewValid: true, refs: [], diff: [], impact: "", reason: "", records: [{ node: "提交", who: ADM.user().name, role: ADM.role().name, decision: "提交申请", note: "", at: NOW }] }, o);
    ADM.approvals.push(a);
    return a;
  };

  ADM.batches = [
    { id: "BATCH-20261118", date: "2026-11-18", tz: "UTC+8", entity: "主体 SG-01", cases: 412, calc: "96,420.50", deduct: "3,210.00", ok: "93,210.50", blockN: 9, blockAmt: "5,830.00", run: "成功", appr: "无需" },
    { id: "BATCH-20261117", date: "2026-11-17", tz: "UTC+8", entity: "主体 SG-01", cases: 398, calc: "91,205.00", deduct: "2,880.00", ok: "88,325.00", blockN: 7, blockAmt: "4,120.00", run: "成功", appr: "无需" },
    { id: "BATCH-20261116", date: "2026-11-16", tz: "UTC+8", entity: "主体 SG-01", cases: 355, calc: "80,990.20", deduct: "2,100.00", ok: "74,310.20", blockN: 12, blockAmt: "6,580.00", run: "部分失败", appr: "无需", fail: { n: 6, reason: "价格快照缺失（待数据补齐）" } },
    { id: "BATCH-20261115", date: "2026-11-15", tz: "UTC+8", entity: "主体 SG-01", cases: 340, calc: "78,330.00", deduct: "1,950.00", ok: "76,380.00", blockN: 5, blockAmt: "2,200.00", run: "成功", appr: "无需" },
    { id: "BATCH-20261119", date: "2026-11-19", tz: "UTC+8", entity: "主体 SG-01", cases: null, calc: null, deduct: null, ok: null, blockN: null, blockAmt: null, run: "待运行", appr: "无需" },
    { id: "BATCH-20261112-R", date: "2026-11-12", tz: "UTC+8", entity: "主体 SG-01", cases: 120, calc: "27,400.00", deduct: "0.00", ok: "27,400.00", blockN: 0, blockAmt: "0.00", run: "失败", appr: "待审批", fail: { n: 120, reason: "配置版本冲突，运行已回滚" } }
  ];
  const CS = (cm, cs, cust, partner, ms, amt, calc, settle, blocks, due, batch, ver) => ({ cm, cs, cust, partner, ms, amt, calc, settle, blocks, due, batch, ver });
  ADM.cases = [
    CS("CM-4412", "CS-5531", "C-80317", "P-10024", "首次入金", "620.00", "合格", "冻结", ["结算超时信号"], "2026-11-12", "BATCH-20261118", "v2"),
    CS("CM-4413", "CS-5532", "C-80317", "P-10024", "有效转化", "620.00", "合格", "可结算", [], "2026-11-20", "BATCH-20261118", "v1"),
    CS("CM-4471", "CS-5560", "C-80702", "P-10029", "首次入金", "310.00", "合格", "冻结", ["结算超时信号"], "2026-11-14", "BATCH-20261118", "v1"),
    CS("CM-4390", "CS-5502", "C-80288", "P-10012", "有效转化", "86.40", "调整", "结算中", ["价格快照差异"], "2026-11-21", "BATCH-20261116", "v3"),
    CS("CM-4402", "CS-5510", "C-80301", "P-10014", "质量升档补差", "42.00", "合格", "结算中", [], "2026-11-22", "BATCH-20261116", "v2"),
    CS("CM-4350", "CS-5470", "C-80419", "P-10031", "首次入金", "1,980.00", "合格", "冻结", ["CRM 欺诈库命中", "风险事件未关闭"], "2026-11-10", "BATCH-20261117", "v1"),
    CS("CM-4361", "CS-5481", "C-80420", "P-10031", "首次入金", "1,300.00", "合格", "冻结", ["风险占比超阈"], "2026-11-10", "BATCH-20261117", "v1"),
    CS("CM-4333", "CS-5455", "C-80105", "P-10011", "有效转化", "540.00", "合格", "已支付", [], "2026-11-08", "BATCH-20261115", "v1"),
    CS("CM-4421", "CS-5540", "C-80512", "P-10006", "首次入金", "280.00", "待确认", "待放行", [], "2026-11-24", "BATCH-20261118", "v1"),
    CS("CM-4430", "CS-5545", "C-80530", "P-10017", "首次入金", null, "合格", "结算中", ["数据缺失"], "2026-11-23", "BATCH-20261118", "v1")
  ];
  ADM.statements = [
    { id: "ST-P10011-2026-10-v1", partner: "P-10011", month: "2026-10", type: "月结", status: "待财务确认", open: "12,100.00", close: "18,240.00", comm: "6,140.00", guar: "1,200.00", avail: "17,040.00", blocked: "0.00", wd: 1, apId: "AP-3110" },
    { id: "ST-P10014-2026-10-v1", partner: "P-10014", month: "2026-10", type: "月结", status: "已封账", open: "9,800.00", close: "12,880.00", comm: "3,080.00", guar: "900.00", avail: "11,980.00", blocked: "0.00", wd: 2 },
    { id: "ST-P10031-2026-10-v1", partner: "P-10031", month: "2026-10", type: "月结", status: "草稿", open: "22,000.00", close: "36,410.00", comm: "14,410.00", guar: "2,000.00", avail: "24,100.00", blocked: "10,310.00", wd: 0 },
    { id: "ST-P10009-2026-09-v2", partner: "P-10009", month: "2026-09", type: "更正版", status: "更正中", open: "800.00", close: "1,980.00", comm: "1,180.00", guar: "300.00", avail: "1,680.00", blocked: "0.00", wd: 1 },
    { id: "ST-P10022-2026-09-v1", partner: "P-10022", month: "2026-09", type: "月结", status: "已封账", open: "6,500.00", close: "9,760.00", comm: "3,260.00", guar: "700.00", avail: "9,060.00", blocked: "0.00", wd: 1 },
    { id: "ST-P10018-2026-10-v1", partner: "P-10018", month: "2026-10", type: "月结", status: "已更正", open: "500.00", close: "1,215.00", comm: "715.00", guar: "150.00", avail: "1,065.00", blocked: "0.00", wd: 0 }
  ];
  const W = (id, partner, entity, at, applied, fee, net, acct, method, state, snap, ref, receipt, extra) => Object.assign({ id, partner, entity, at, applied, fee, net, acct, method, state, snap, ref, receipt, verify: "none", apId: null, tries: [] }, extra || {});
  ADM.withdrawals = [
    W("WD-0921", "P-10011", "主体 SG-01", "2026-11-19 08:30", "1,200.00", "6.00", "1,194.00", "银行账户 ****4410", "银行", "待审核", "snap-v4 · 3 项 · ST-P10011-2026-10", "—", "—", { verify: "done", apId: "AP-3104" }),
    W("WD-0925", "P-10012", "主体 SG-01", "2026-11-19 09:15", "800.00", "4.00", "796.00", "电子钱包 ****2287", "电子钱包", "待审核", "snap-v2 · 2 项", "—", "—"),
    W("WD-0917", "P-10014", "主体 SG-01", "2026-11-18 16:00", "3,000.00", "15.00", "2,985.00", "银行账户 ****7731", "银行", "已批准", "snap-v3 · 5 项", "—", "—", { verify: "done" }),
    W("WD-0912", "P-10006", "主体 SG-01", "2026-11-18 10:20", "640.00", "3.20", "636.80", "电子钱包 ****9034", "电子钱包", "打款中", "snap-v1 · 1 项", "PAY-88217", "待确认", { verify: "done", tries: [{ at: "2026-11-18 11:00", r: "已提交，等待回执" }] }),
    W("WD-0908", "P-10022", "主体 SG-01", "2026-11-17 14:00", "2,200.00", "11.00", "2,189.00", "银行账户 ****5502", "银行", "超时", "snap-v2 · 4 项", "PAY-88104", "未知", { verify: "done", tries: [{ at: "2026-11-17 15:10", r: "请求超时，结果未知；未确定部分保持占用" }] }),
    W("WD-0899", "P-10009", "主体 SG-01", "2026-11-16 09:00", "1,500.00", "7.50", "1,492.50", "银行账户 ****3320", "银行", "部分成功", "snap-v2 · 3 项", "PAY-87950", "成功 900.00 · 失败 400.00 · 未知 200.00", { verify: "done", tries: [{ at: "2026-11-16 10:00", r: "部分成功" }] }),
    W("WD-0890", "P-10018", "主体 SG-01", "2026-11-15 12:00", "500.00", "2.50", "497.50", "电子钱包 ****1108", "电子钱包", "失败", "snap-v1 · 1 项", "PAY-87811", "失败：账户校验未通过", { verify: "done", tries: [{ at: "2026-11-15 12:30", r: "失败：账户校验未通过" }] }),
    W("WD-0877", "P-10027", "主体 SG-01", "2026-11-12 09:00", "960.00", "4.80", "955.20", "银行账户 ****6619", "银行", "已支付", "snap-v2 · 2 项", "PAY-87420", "成功 955.20", { verify: "done", tries: [{ at: "2026-11-12 10:00", r: "已支付" }] })
  ];
  ADM.reversals = [
    { id: "RV-3301", partner: "P-10009", src: "已付异常", total: "5,600.00", done: "0.00", rest: "5,600.00", seg: [["未放行佣金", "0.00"], ["保证金", "0.00"], ["可提现余额", "0.00"], ["其他保证金", "0.00"], ["债务", "0.00"]], state: "草稿", debt: "—", apId: "AP-3101" },
    { id: "RV-3290", partner: "P-10031", src: "风控转财务", total: "4,300.00", done: "2,100.00", rest: "2,200.00", seg: [["未放行佣金", "1,300.00"], ["保证金", "800.00"], ["可提现余额", "0.00"], ["其他保证金", "0.00"], ["债务", "0.00"]], state: "部分", debt: "抵扣中", apId: null },
    { id: "RV-3277", partner: "P-10018", src: "更正", total: "2,150.00", done: "2,150.00", rest: "0.00", seg: [["未放行佣金", "0.00"], ["保证金", "2,150.00"], ["可提现余额", "0.00"], ["其他保证金", "0.00"], ["债务", "0.00"]], state: "已执行", debt: "已清", apId: null },
    { id: "RV-3262", partner: "P-10040", src: "已付异常", total: "3,900.00", done: "1,400.00", rest: "2,500.00", seg: [["未放行佣金", "600.00"], ["保证金", "800.00"], ["可提现余额", "0.00"], ["其他保证金", "0.00"], ["债务", "2,500.00"]], state: "已记债", debt: "登记", apId: null }
  ];
  ADM.recon = [
    { id: "DF-1101", period: "2026-10", type: "金额不平", cause: "月度单与提现分摊差异", src: "月度单 ST-P10014-2026-10-v1 / 提现 WD-0917", a: "11,980.00（v1）", b: "11,970.00（snap-v3）", diff: "10.00", dir: "月度单大于分摊", status: "待处理", task: null, owner: "财务", upd: "2026-11-19 09:00", block: true },
    { id: "DF-1102", period: "2026-10", type: "缺流水", cause: "支付回写缺失", src: "提现 WD-0908 / 支付引用 PAY-88104", a: "已提交", b: "无回执", diff: "待核验", dir: "—", status: "待核验", task: "T-24106", owner: "财务", upd: "2026-11-18 17:00", block: true },
    { id: "DF-1103", period: "2026-10", type: "状态不一致", cause: "批次与案件状态不一致", src: "BATCH-20261116 / CS-5502", a: "结算中", b: "可结算", diff: "0.00", dir: "—", status: "处理中", task: "T-24118", owner: "财务", upd: "2026-11-19 08:00", block: false },
    { id: "DF-1098", period: "2026-09", type: "重复流水", cause: "回执重复写入", src: "提现 WD-0877", a: "955.20", b: "1,910.40", diff: "955.20", dir: "流水大于订单", status: "已处理", task: null, owner: "财务", upd: "2026-11-13 10:00", block: false },
    { id: "DF-1105", period: "2026-10", type: "未知原因码", cause: "UNK_TYPE_77（只读）", src: "保证金账户", a: "—", b: "—", diff: "310.00", dir: "未知", status: "待处理", task: null, owner: "财务", upd: "2026-11-19 07:30", block: true }
  ];
  ADM.dnDays = { "T-24101": [31, 30], "T-24116": [30, 30] };

  /* 审批联动：审批通过 / 驳回后回写业务对象 */
  const hook = (id, ok, no) => { const a = ADM.approvals.find((x) => x.id === id); if (a) { a.onApprove = ok; a.onReject = no; } };
  hook("AP-3104", () => { const w = ADM.withdrawals.find((x) => x.id === "WD-0921"); w.state = "已批准"; }, () => { const w = ADM.withdrawals.find((x) => x.id === "WD-0921"); w.state = "已驳回"; });
  hook("AP-3110", () => { const s = ADM.statements.find((x) => x.id === "ST-P10011-2026-10-v1"); s.status = "已封账"; }, () => { const s = ADM.statements.find((x) => x.id === "ST-P10011-2026-10-v1"); s.status = "草稿"; });
  hook("AP-3101", () => { const r = ADM.reversals.find((x) => x.id === "RV-3301"); r.state = "已批准"; }, () => { const r = ADM.reversals.find((x) => x.id === "RV-3301"); r.state = "草稿"; });
})();
