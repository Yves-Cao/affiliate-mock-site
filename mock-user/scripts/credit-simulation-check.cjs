const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const coreSource = fs.readFileSync(path.join(root, "simulation-core.js"), "utf8");
const creditSource = fs.readFileSync(path.join(root, "credit-center.js"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

function setup(storage = new Map(), state = {}) {
  const AFF = {
    state: { language: "zh", onboarding: { submitted: false }, kybCompleted: false, ...state },
    helpers: { h: value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;") },
    finance: { asOf: "2026-10-27", configuration: { version: "mock" } }
  };
  const context = vm.createContext({
    AFF,
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    document: { addEventListener() {} },
    window: { addEventListener() {} }
  });
  vm.runInContext(coreSource, context, { filename: "simulation-core.js" });
  vm.runInContext(creditSource, context, { filename: "credit-center.js" });
  return { AFF, storage };
}

let passed = 0;
function test(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

test("baseline remains unchanged until a credit adjustment", () => {
  const { AFF } = setup();
  assert.equal(AFF.simulation.state().credit, null);
  assert.equal(AFF.creditCenter.summary().level, "C0");
  assert.equal(AFF.creditCenter.summary().progress, 0.1);
  const verified = setup(new Map(), { kybCompleted: true }).AFF;
  assert.equal(verified.creditCenter.summary().level, "C2");
  assert.equal(verified.creditCenter.summary().progress, 0.55);
});

test("level actions move one tier, reset progress, and clamp at either boundary", () => {
  const { AFF } = setup();
  const sim = AFF.simulation;
  const adjust = direction => sim.changeCreditLevel(direction, AFF.creditCenter.summary());
  adjust(-1);
  assert.equal(sim.state().credit, null);
  assert.equal(sim.state().logs.length, 0);
  for (let level = 1; level <= 4; level += 1) {
    adjust(1);
    assert.equal(sim.state().credit.level, `C${level}`);
    assert.equal(sim.state().credit.points, 0);
  }
  const before = sim.exportSnapshot();
  adjust(1);
  assert.equal(sim.exportSnapshot(), before);
  for (let level = 3; level >= 0; level -= 1) {
    adjust(-1);
    assert.equal(sim.state().credit.level, `C${level}`);
  }
  const bottom = sim.exportSnapshot();
  adjust(-1);
  assert.equal(sim.exportSnapshot(), bottom);
});

test("points update the baseline progress and clamp without promoting the level", () => {
  const { AFF } = setup();
  const sim = AFF.simulation;
  const adjust = delta => sim.changeCreditPoints(delta, AFF.creditCenter.summary());
  adjust(15);
  assert.equal(sim.state().credit.points, 25);
  assert.equal(AFF.creditCenter.summary().progress, 0.25);
  assert.match(AFF.creditCenter.dashboardStrip(), /is-current" style="--fill:25%"/);
  assert.match(AFF.creditCenter.accountPanel(), /style="width:25%"/);
  adjust(200);
  assert.equal(sim.state().credit.points, 100);
  assert.equal(AFF.creditCenter.summary().level, "C0");
  const full = sim.exportSnapshot();
  adjust(1);
  assert.equal(sim.exportSnapshot(), full);
  adjust(-35);
  assert.equal(sim.state().credit.points, 65);
  adjust(-200);
  assert.equal(sim.state().credit.points, 0);
  sim.changeCreditLevel(1, AFF.creditCenter.summary());
  assert.equal(sim.state().credit.points, 0);
});

test("invalid actions throw without changing saved state", () => {
  const { AFF } = setup();
  const sim = AFF.simulation;
  sim.changeCreditPoints(10, AFF.creditCenter.summary());
  const before = sim.exportSnapshot();
  for (const value of [0, 2, -2, "1", null, NaN]) {
    assert.throws(() => sim.changeCreditLevel(value, AFF.creditCenter.summary()));
  }
  for (const value of [0, 1.5, "10", null, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => sim.changeCreditPoints(value, AFF.creditCenter.summary()));
  }
  assert.equal(sim.exportSnapshot(), before);
});

test("session reload and snapshot import retain the credit override", () => {
  const { AFF, storage } = setup();
  AFF.simulation.advanceDays(7, {});
  AFF.simulation.changeCreditLevel(1, AFF.creditCenter.summary());
  AFF.simulation.changeCreditPoints(40, AFF.creditCenter.summary());
  const expected = { level: "C1", points: 40, effectiveAt: "2026-11-03" };
  assert.deepEqual(plain(setup(storage).AFF.simulation.state().credit), expected);
  const restored = setup().AFF;
  restored.simulation.importSnapshot(AFF.simulation.exportSnapshot());
  assert.deepEqual(plain(restored.simulation.state().credit), expected);
  assert.equal(restored.creditCenter.summary().effectiveAt, expected.effectiveAt);
});

test("legacy and malformed snapshots clear unsupported credit overrides", () => {
  const { AFF } = setup();
  const base = JSON.parse(AFF.simulation.exportSnapshot());
  delete base.credit;
  AFF.simulation.importSnapshot(JSON.stringify(base));
  assert.equal(AFF.simulation.state().credit, null);
  for (const credit of [
    {}, { level: "C5", points: 10, effectiveAt: "2026-10-27" },
    { level: "C1", points: -1, effectiveAt: "2026-10-27" },
    { level: "C1", points: 101, effectiveAt: "2026-10-27" },
    { level: "C1", points: 1.5, effectiveAt: "2026-10-27" },
    { level: "C1", points: "20", effectiveAt: "2026-10-27" },
    { level: "C1", points: 20, effectiveAt: "invalid" }
  ]) {
    AFF.simulation.importSnapshot(JSON.stringify({ ...base, credit }));
    assert.equal(AFF.simulation.state().credit, null);
  }
});

test("reset clears credit while retaining records, violations, and operation history", () => {
  const { AFF } = setup();
  const sim = AFF.simulation;
  sim.addRecord({ clientId: "CLIENT-1" });
  sim.addViolation({ type: "test", targetId: "CLIENT-1" });
  sim.changeCreditLevel(1, AFF.creditCenter.summary());
  const logs = sim.state().logs.length;
  sim.reset();
  assert.equal(sim.state().credit, null);
  assert.equal(sim.state().records.length, 1);
  assert.equal(sim.state().violations.length, 1);
  assert.equal(sim.state().logs.length, logs + 1);
  assert.equal(AFF.creditCenter.summary().level, "C0");
  assert.equal(AFF.creditCenter.summary().progress, 0.1);
});

test("summary, stages, account panel, and benefits reflect the selected tier", () => {
  const { AFF } = setup();
  const sim = AFF.simulation;
  const startMarkup = AFF.creditCenter.dashboardStrip();
  assert.doesNotMatch(startMarkup, /credit-benefit-group is-current/);
  assert.match(startMarkup, /下级权益<\/span><strong>VIP2/);
  assert.doesNotMatch(startMarkup, /免结算额度/);
  const ratios = [0, 0.02, 0.04, 0.07, 0.10];
  for (let index = 1; index <= 4; index += 1) {
    sim.changeCreditLevel(1, AFF.creditCenter.summary());
    const info = AFF.creditCenter.summary();
    assert.equal(info.levelNumber, `VIP${index + 1}`);
    assert.equal(info.ratio, ratios[index]);
    assert.ok(info.stages.every(stage => stage.ratio === ratios[index]));
    const markup = AFF.creditCenter.dashboardStrip();
    assert.match(markup, new RegExp(`当前等级权益</span><strong>VIP${index + 1}`));
    assert.match(AFF.creditCenter.accountPanel(), new RegExp(`VIP${index + 1} ·`));
    if (index < 4) {
      assert.match(markup, new RegExp(`下级权益</span><strong>VIP${index + 2}`));
    } else {
      assert.doesNotMatch(markup, /credit-benefit-group is-next/);
      sim.changeCreditPoints(20, info);
      assert.equal(sim.state().credit.points, 20);
      assert.equal(AFF.creditCenter.summary().progress, 1);
      assert.match(AFF.creditCenter.dashboardStrip(), /is-current" style="--fill:100%"/);
    }
  }
});

console.log(`Credit simulation checks passed: ${passed}`);
