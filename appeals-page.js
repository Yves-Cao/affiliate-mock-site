(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const labels = {
    materials: ["待补充材料", "Materials required", "warning"],
    reviewing: ["审核中", "Reviewing", "info"],
    overturned: ["已改判", "Overturned", "ok"],
    rejected: ["已驳回", "Rejected", "danger"],
    closed: ["已关闭", "Closed", "muted"],
    blocked: ["不可申诉", "Not appealable", "danger"]
  };

  function state() {
    AFF.state.appealsPage ||= { formOpen: false, object: "佣金冲正", objectId: "", reason: "" };
    return AFF.state.appealsPage;
  }

  function tag(status) {
    return `<span class="tag tag-${labels[status]?.[2] || "muted"}">${t(labels[status]?.[0] || status, labels[status]?.[1] || status)}</span>`;
  }

  function renderPage() {
    const s = state();
    const rows = AFF.finance.appeals;
    return `
      ${AFF.helpers.pageHeader("申诉中心", "追踪佣金与风控处置申诉；硬拦截不可申诉。", `<button class="button primary" type="button" data-appeal-action="toggle">${s.formOpen ? t("关闭表单", "Close form") : t("新建申诉", "New appeal")}</button>`)}
      <div class="finance-page">
        ${AFF.helpers.cards([
          { label: t("申诉中", "Under review"), value: rows.filter(item => ["materials", "reviewing"].includes(item.status)).length, hint: t("SLA 7自然日", "SLA 7 days") },
          { label: t("已改判", "Overturned"), value: rows.filter(item => item.status === "overturned").length, hint: t("释放或补发", "Released or repaid") },
          { label: t("已驳回", "Rejected"), value: rows.filter(item => item.status === "rejected").length, hint: t("保留原处置", "Original action kept") },
          { label: t("不可申诉", "Not appealable"), value: rows.filter(item => item.status === "blocked").length, hint: t("制裁/欺诈库确权", "Sanctions or confirmed fraud") }
        ])}
        ${s.formOpen ? `
        <section class="card">
          <div class="panel-header"><h2>${t("新建申诉", "New appeal")}</h2><span class="helper">${t("提交不会自动恢复佣金", "Submitting does not restore commission")}</span></div>
          <div class="panel-body finance-filters">
            <label><span>${t("申诉对象", "Object")}</span>
              <select data-appeal-field="object">
                ${["佣金冲正", "佣金拒绝", "保证金抵扣", "Hold延长", "客户资格无效", "风险分级上调"].map(item => `<option ${s.object === item ? "selected" : ""}>${item}</option>`).join("")}
              </select>
            </label>
            <label><span>${t("关联编号", "Reference ID")}</span><input data-appeal-field="objectId" value="${h(s.objectId)}" placeholder="COM-..." maxlength="60"></label>
            <label class="wd-search"><span>${t("申诉说明", "Explanation")}</span><input data-appeal-field="reason" value="${h(s.reason)}" maxlength="120" placeholder="${t("请说明争议原因", "Describe the dispute")}"></label>
            <button class="button primary" type="button" data-appeal-action="submit">${t("提交申诉", "Submit")}</button>
          </div>
        </section>` : ""}
        <section class="card">
          <div class="panel-header"><h2>${t("申诉列表", "Appeals")}</h2><span class="helper">${t("时效倒计时按7自然日计算", "Countdown uses 7 calendar days")}</span></div>
          <div class="finance-table-wrap"><table>
            <thead><tr><th>${t("申诉编号", "ID")}</th><th>${t("对象", "Object")}</th><th>${t("关联编号", "Reference")}</th><th>${t("客户", "Client")}</th><th>${t("提交日期", "Submitted")}</th><th>${t("截止日期", "Due")}</th><th>${t("状态", "Status")}</th><th>${t("原因 / 结论", "Reason / result")}</th></tr></thead>
            <tbody>${rows.length ? rows.map(row => `<tr>
              <td>${h(row.id)}</td><td>${h(row.object)}</td><td>${h(row.objectId)}</td><td>${h(row.clientId)}</td>
              <td>${h(row.submittedAt)}</td><td>${h(row.dueAt)}</td><td>${tag(row.status)}</td><td>${h(row.status === "overturned" ? row.result : row.reason)}</td>
            </tr>`).join("") : `<tr><td colspan="8" class="finance-empty">${t("暂无申诉", "No appeals")}</td></tr>`}</tbody>
          </table></div>
        </section>
      </div>`;
  }

  document.addEventListener("click", event => {
    const target = event.target.closest("[data-appeal-action]");
    if (!target || AFF.state?.route !== "appeals") return;
    const s = state();
    const action = target.dataset.appealAction;
    if (action === "toggle") s.formOpen = !s.formOpen;
    if (action === "submit") {
      if (!s.objectId.trim() || s.reason.trim().length < 2) return showToast("请填写关联编号和申诉说明");
      AFF.finance.appeals.unshift({
        id: `APL-U${String(AFF.finance.appeals.length + 1).padStart(4, "0")}`,
        object: s.object, objectId: s.objectId.trim(), clientId: "-",
        submittedAt: AFF.finance.asOf, dueAt: AFF.finance.asOf, status: "reviewing",
        reason: s.reason.trim(), canAppeal: true
      });
      s.formOpen = false; s.objectId = ""; s.reason = "";
      showToast("申诉已提交，等待人工复核");
    }
    render();
    target.focus();
  });
  document.addEventListener("input", event => {
    if (AFF.state?.route !== "appeals" || !event.target.matches("[data-appeal-field]")) return;
    state()[event.target.dataset.appealField] = event.target.value;
  });

  AFF.pages.appeals = renderPage;
})();
