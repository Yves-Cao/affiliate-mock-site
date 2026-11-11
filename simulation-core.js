(() => {
  const storageKey = "affiliate-simulation-console";
  const baseDate = "2026-10-27";
  const dayMs = 86400000;
  const creditLevels = ["C0", "C1", "C2", "C3", "C4"];
  const creditPointsPerLevel = 100; // Mock progress scale, not a production upgrade threshold.
  const defaultState = () => ({
    version: 1,
    date: baseDate,
    records: [],
    violations: [],
    logs: [],
    previousSummary: null,
    scenarioId: "normal-flow",
    credit: null
  });

  function normalizeCredit(value) {
    if (!value || !creditLevels.includes(value.level) ||
        !Number.isSafeInteger(value.points) || value.points < 0 || value.points > creditPointsPerLevel ||
        typeof value.effectiveAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.effectiveAt)) return null;
    return { level: value.level, points: value.points, effectiveAt: value.effectiveAt };
  }

  function normalize(input) {
    const value = { ...defaultState(), ...(input || {}) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) value.date = baseDate;
    value.records = Array.isArray(value.records) ? value.records : [];
    value.violations = Array.isArray(value.violations) ? value.violations : [];
    value.logs = Array.isArray(value.logs) ? value.logs : [];
    value.scenarioId = String(value.scenarioId || "normal-flow");
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
      id: `SIM-LOG-${String(state.logs.length + 1).padStart(4, "0")}`,
      action,
      detail,
      changedObjects,
      operatedAt: new Date().toISOString(),
      scenarioId: state.scenarioId,
      source: "Mock Console"
    });
    state.logs = state.logs.slice(0, 200);
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
      id: record.id || `SIM-REC-${String(state.records.length + 1).padStart(4, "0")}`,
      source: "mock-console"
    };
    state.records.push(item);
    log("add-record", `录入仿真客户 ${item.clientId}`, [item.clientId]);
    save();
    return item;
  }

  function addViolation(violation) {
    const item = {
      ...violation,
      id: violation.id || `SIM-RISK-${String(state.violations.length + 1).padStart(4, "0")}`,
      source: "mock-console"
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

  function reset() {
    state.date = baseDate;
    state.scenarioId = "normal-flow";
    state.previousSummary = null;
    state.credit = null;
    log("reset-environment", `重置模拟环境：Mock日期恢复为${baseDate}，场景恢复为正常流，清除信用等级与积分调整；仿真客户${state.records.length}条、违规事件${state.violations.length}条与操作日志全部保留`);
    save();
  }

  function exportSnapshot() {
    return JSON.stringify(state, null, 2);
  }

  function importSnapshot(text) {
    const parsed = normalize(JSON.parse(text));
    if (parsed.version !== 1) throw new Error("Unsupported simulation snapshot version");
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
    addViolation,
    setScenario,
    creditPointsPerLevel,
    changeCreditLevel,
    changeCreditPoints,
    log,
    reset,
    exportSnapshot,
    importSnapshot,
    clearTransitionSummary
  };
})();
