(() => {
  const storageKey = "affiliate-simulation-console";
  const baseDate = "2026-10-27";
  const dayMs = 86400000;
  const defaultState = () => ({
    version: 1,
    date: baseDate,
    records: [],
    violations: [],
    logs: [],
    previousSummary: null,
    scenarioId: "normal-flow"
  });

  function normalize(input) {
    const value = { ...defaultState(), ...(input || {}) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) value.date = baseDate;
    value.records = Array.isArray(value.records) ? value.records : [];
    value.violations = Array.isArray(value.violations) ? value.violations : [];
    value.logs = Array.isArray(value.logs) ? value.logs : [];
    value.scenarioId = String(value.scenarioId || "normal-flow");
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

  function reset() {
    state.date = baseDate;
    state.scenarioId = "normal-flow";
    state.previousSummary = null;
    log("reset-environment", `重置模拟环境：Mock日期恢复为${baseDate}，场景恢复为正常流；仿真客户${state.records.length}条、违规事件${state.violations.length}条与操作日志全部保留`);
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
    reset,
    exportSnapshot,
    importSnapshot,
    clearTransitionSummary
  };
})();
