(() => {
  const storageKey = "affiliate-simulation-console";
  const baseDate = "2026-10-27";
  const dayMs = 86400000;
  const creditLevels = ["C0", "C1", "C2", "C3", "C4"];
  const scenarioIds = ["normal-flow", "closure-flow", "loading-flow", "empty-state", "api-error"];
  const creditPointsPerLevel = 100; // Mock progress scale, not a production upgrade threshold.
  const defaultState = () => ({
    version: 1,
    date: baseDate,
    records: [],
    violations: [],
    logs: [],
    settlementRuns: [],
    previousSummary: null,
    scenarioId: "normal-flow",
    credit: null
  });

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  }

  function nextId(prefix, items, key = "id", minimum = 0) {
    let sequence = minimum;
    for (const item of items) {
      const value = String(item[key] || "");
      if (value.startsWith(prefix) && /^\d+$/.test(value.slice(prefix.length))) {
        sequence = Math.max(sequence, Number(value.slice(prefix.length)));
      }
    }
    return `${prefix}${String(sequence + 1).padStart(4, "0")}`;
  }

  function normalizeCredit(value) {
    if (!value || !creditLevels.includes(value.level) ||
        !Number.isSafeInteger(value.points) || value.points < 0 || value.points > creditPointsPerLevel ||
        typeof value.effectiveAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.effectiveAt)) return null;
    return { level: value.level, points: value.points, effectiveAt: value.effectiveAt };
  }

  function normalize(input) {
    const value = { ...defaultState(), ...(input || {}) };
    if (!validDate(value.date)) value.date = baseDate;
    value.records = Array.isArray(value.records) ? value.records : [];
    value.violations = Array.isArray(value.violations) ? value.violations : [];
    value.logs = Array.isArray(value.logs) ? value.logs : [];
    value.settlementRuns = Array.isArray(value.settlementRuns) ? value.settlementRuns : [];
    value.scenarioId = scenarioIds.includes(value.scenarioId) ? value.scenarioId : "normal-flow";
    value.credit = normalizeCredit(value.credit);
    return value;
  }

  function load() {
    try {
      return normalize(JSON.parse(globalThis.sessionStorage?.getItem(storageKey) || "null"));
    } catch {
      return defaultState();
    }
  }

  let state = load();

  function save() {
    if (AFF.state) {
      AFF.state.scenario = state.scenarioId;
      AFF.state.settlementRuns = state.settlementRuns;
    }
    globalThis.sessionStorage?.setItem(storageKey, JSON.stringify(state));
  }

  function shiftDate(value, amount) {
    return new Date(Date.parse(`${value}T00:00:00Z`) + amount * dayMs).toISOString().slice(0, 10);
  }

  function date() {
    return state.date;
  }

  function log(action, detail, changedObjects = []) {
    state.logs.unshift({
      id: nextId("SIM-LOG-", state.logs),
      action,
      detail,
      changedObjects,
      operatedAt: new Date().toISOString(),
      mockDate: state.date,
      scenarioId: state.scenarioId,
      source: "Mock Console"
    });
    state.logs = state.logs.slice(0, 200);
    save();
  }

  function advanceDays(amount, summary) {
    const days = Math.min(180, Math.max(1, Number(amount) || 1));
    const nextDate = shiftDate(state.date, days);
    state.previousSummary = {
      date: state.date,
      summary,
      days,
      targetDate: nextDate
    };
    state.date = nextDate;
    log("advance-time", `Mock日期推进${days}天：${state.previousSummary.date} → ${nextDate}`);
    save();
    return state;
  }

  function addRecord(record) {
    const item = {
      ...record,
      id: record.id || nextId("SIM-REC-", state.records),
      source: record.source || "mock-console",
      simulationSource: "mock-console"
    };
    state.records.push(item);
    log("add-record", `录入仿真客户 ${item.clientId}`, [item.clientId]);
    save();
    return item;
  }

  function addViolation(violation) {
    const item = {
      ...violation,
      id: violation.id || nextId("SIM-RISK-", state.violations),
      source: violation.source || "mock-console",
      simulationSource: "mock-console"
    };
    state.violations.push(item);
    log("add-violation", `注入违规事件 ${item.type} → ${item.targetId}`, [item.targetId]);
    save();
    return item;
  }

  function setScenario(scenarioId) {
    state.scenarioId = scenarioId;
    log("set-scenario", `切换模拟场景：${scenarioId}`);
    save();
  }

  function creditBaseline(baseline) {
    if (state.credit) return { ...state.credit };
    if (!baseline || !creditLevels.includes(baseline.level)) throw new Error("信用等级数据尚未就绪。");
    const progress = Number.isFinite(baseline.progress) ? Math.max(0, Math.min(1, baseline.progress)) : 0;
    return {
      level: baseline.level,
      points: Math.round(progress * creditPointsPerLevel),
      effectiveAt: baseline.effectiveAt || state.date
    };
  }

  function changeCreditLevel(direction, baseline) {
    if (direction !== 1 && direction !== -1) throw new Error("等级每次只能调整一级。");
    const current = creditBaseline(baseline);
    const index = creditLevels.indexOf(current.level);
    const nextIndex = Math.max(0, Math.min(creditLevels.length - 1, index + direction));
    if (nextIndex === index) return current;
    state.credit = { level: creditLevels[nextIndex], points: 0, effectiveAt: state.date };
    log("adjust-credit-level", `模拟信用等级 VIP${index + 1} → VIP${nextIndex + 1}；本级积分归零`, ["partner-credit"]);
    save();
    return state.credit;
  }

  function changeCreditPoints(delta, baseline) {
    if (!Number.isSafeInteger(delta) || delta === 0) throw new Error("请输入有效的正整数积分。");
    const current = creditBaseline(baseline);
    const points = Math.max(0, Math.min(creditPointsPerLevel, current.points + delta));
    if (points === current.points) return current;
    state.credit = { ...current, points };
    log("adjust-credit-points", `模拟本级积分 ${current.points} → ${points}；等级保持VIP${creditLevels.indexOf(current.level) + 1}`, ["partner-credit"]);
    save();
    return state.credit;
  }

  function reset(mode = "view") {
    if (!["view", "data", "all"].includes(mode)) throw new Error("Unsupported reset mode");
    state.date = baseDate;
    state.scenarioId = "normal-flow";
    state.previousSummary = null;
    state.credit = null;
    state.settlementRuns = [];
    if (mode === "data" || mode === "all") {
      state.records = [];
      state.violations = [];
    }
    if (mode === "all") {
      state.logs = [];
    }
    const retained = `仿真客户${state.records.length}条、违规事件${state.violations.length}条`;
    log("reset-environment", mode === "view"
      ? `重置展示环境：Mock日期恢复为${baseDate}，场景恢复为正常流，清除信用覆盖和结算运行记录；${retained}与操作日志保留`
      : mode === "data"
        ? `清空本次仿真数据：Mock日期恢复为${baseDate}，场景恢复为正常流；操作日志保留`
        : `恢复完整初始演示包：Mock日期恢复为${baseDate}，场景恢复为正常流；客户、违规、信用、结算记录和旧日志已清空`);
    save();
  }

  function removeRecord(recordId) {
    const id = String(recordId || "").trim();
    const removed = state.records.find(item => item.clientId === id || item.id === id);
    if (!removed) return false;
    state.records = state.records.filter(item => item !== removed);
    const removedViolations = state.violations.filter(item => item.targetId === removed.clientId);
    state.violations = state.violations.filter(item => item.targetId !== removed.clientId);
    log("remove-record", `删除仿真客户 ${removed.clientId}${removedViolations.length ? `，同时删除关联违规${removedViolations.length}条` : ""}`, [removed.clientId, ...removedViolations.map(item => item.id)]);
    save();
    return true;
  }

  function removeViolation(violationId) {
    const id = String(violationId || "").trim();
    const before = state.violations.length;
    state.violations = state.violations.filter(item => item.id !== id);
    if (state.violations.length === before) return false;
    log("remove-violation", `删除仿真违规事件 ${id}`, [id]);
    save();
    return true;
  }

  function exportSnapshot() {
    return JSON.stringify(state, null, 2);
  }

  function inspectSnapshot(text) {
    let parsed;
    try {
      parsed = JSON.parse(String(text || ""));
    } catch {
      return { valid: false, errors: ["JSON格式无效。"], summary: null };
    }
    const errors = [];
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) errors.push("快照必须是JSON对象。");
    if (parsed?.version !== 1) errors.push("快照版本不受支持，仅支持版本1。");
    if (parsed && !validDate(parsed.date)) errors.push("Mock日期无效。");
    if (parsed && !Array.isArray(parsed.records)) errors.push("records必须是数组。");
    if (parsed && !Array.isArray(parsed.violations)) errors.push("violations必须是数组。");
    if (parsed && !Array.isArray(parsed.logs)) errors.push("logs必须是数组。");
    if (parsed?.settlementRuns !== undefined && !Array.isArray(parsed.settlementRuns)) errors.push("settlementRuns必须是数组。");
    if (parsed?.scenarioId !== undefined && !scenarioIds.includes(parsed.scenarioId)) errors.push("场景不受支持。");
    if (parsed?.previousSummary != null) {
      const previous = parsed.previousSummary;
      if (!validDate(previous.date) || !validDate(previous.targetDate) ||
          !Number.isSafeInteger(previous.days) || previous.days < 1 || previous.days > 180 ||
          !previous.summary || typeof previous.summary !== "object" || Array.isArray(previous.summary) ||
          !Object.values(previous.summary).every(value => typeof value === "number" && Number.isFinite(value))) {
        errors.push("时间推进摘要无效。");
      }
    }
    const isText = value => typeof value === "string" && value.trim().length > 0;
    function checkItems(key, validate) {
      if (!Array.isArray(parsed?.[key])) return;
      const ids = new Set();
      const clients = new Set();
      parsed[key].forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item) || !isText(item.id) ||
            ids.has(item.id) || !validate(item) ||
            (key === "records" && clients.has(item.clientId))) {
          errors.push(`${key}第${index + 1}项无效或编号重复。`);
        } else {
          ids.add(item.id);
          if (key === "records") clients.add(item.clientId);
        }
      });
    }
    checkItems("records", item => isText(item.clientId) && validDate(item.date) &&
      ["ftdAmount", "netDeposit", "volume", "tradingDays"].every(key =>
        item[key] === undefined || (typeof item[key] === "number" && Number.isFinite(item[key]) && item[key] >= 0)));
    checkItems("violations", item => isText(item.targetId) && isText(item.type) && validDate(item.occurredAt));
    checkItems("logs", item => isText(item.action) && typeof item.detail === "string" && isText(item.operatedAt) &&
      Number.isFinite(Date.parse(item.operatedAt)));
    checkItems("settlementRuns", item => validDate(item.date) && item.date <= parsed.date && isText(item.traceId) &&
      ["processedCount", "blockedCount", "failedCount"].every(key => Number.isSafeInteger(item[key]) && item[key] >= 0));
    const normalized = errors.length ? null : normalize(parsed);
    return {
      valid: errors.length === 0,
      errors,
      parsed: normalized,
      summary: normalized ? {
        date: normalized.date,
        scenarioId: normalized.scenarioId,
        records: normalized.records.length,
        violations: normalized.violations.length,
        settlementRuns: normalized.settlementRuns.length,
        logs: normalized.logs.length,
        credit: normalized.credit ? `${normalized.credit.level} · ${normalized.credit.points}/100` : "原始基线"
      } : null
    };
  }

  function importSnapshot(text) {
    const inspection = inspectSnapshot(text);
    if (!inspection.valid) throw new Error(inspection.errors.join(" "));
    const parsed = inspection.parsed;
    state = parsed;
    log("import-snapshot", "导入模拟数据快照");
    save();
    return state;
  }

  function clearTransitionSummary() {
    if (!state.previousSummary) return;
    state.previousSummary = null;
    save();
  }

  AFF.simulation = {
    baseDate,
    storageKey,
    date,
    state: () => state,
    shiftDate,
    advanceDays,
    addRecord,
    nextClientId: (prefix = "SIM-C-") => nextId(prefix, state.records, "clientId", 10000),
    addViolation,
    setScenario,
    creditPointsPerLevel,
    changeCreditLevel,
    changeCreditPoints,
    log,
    reset,
    removeRecord,
    removeViolation,
    inspectSnapshot,
    exportSnapshot,
    importSnapshot,
    clearTransitionSummary
  };
})();
