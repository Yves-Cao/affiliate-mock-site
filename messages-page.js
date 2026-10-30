(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const levelLabels = { required: ["强制确认", "Required", "danger"], normal: ["普通已读", "Normal", "info"], info: ["仅提示", "Info", "muted"] };

  function renderPage() {
    const rows = AFF.finance.messages;
    return `
      ${AFF.helpers.pageHeader("消息中心", "规则公告与业务通知；重要变更需确认已读。")}
      <div class="finance-page">
        ${AFF.helpers.cards([
          { label: t("未读消息", "Unread"), value: rows.filter(item => item.status === "unread").length, hint: t("顶部铃铛同源", "Same as top bell") },
          { label: t("待强制确认", "Required"), value: rows.filter(item => item.level === "required" && item.status === "unread").length, hint: t("不阻塞其他操作", "Does not block other pages") },
          { label: t("规则公告", "Policy notices"), value: rows.filter(item => item.level === "required").length, hint: t("需留痕", "Acknowledged") },
          { label: t("业务通知", "Business notices"), value: rows.filter(item => item.level === "normal").length, hint: t("Hold / 审核 / 申诉", "Hold / review / appeals") }
        ])}
        <section class="card">
          <div class="panel-header"><h2>${t("消息列表", "Messages")}</h2><span class="helper">${t("数据截至", "As of")} ${AFF.finance.asOf}</span></div>
          <div class="finance-table-wrap"><table>
            <thead><tr><th>${t("日期", "Date")}</th><th>${t("级别", "Level")}</th><th>${t("类型", "Type")}</th><th>${t("标题", "Title")}</th><th>${t("状态", "Status")}</th><th>${t("操作", "Action")}</th></tr></thead>
            <tbody>${rows.map(row => `<tr>
              <td>${h(row.date)}</td>
              <td><span class="tag tag-${levelLabels[row.level][2]}">${t(...levelLabels[row.level])}</span></td>
              <td>${h(row.type)}</td><td><strong>${h(row.title)}</strong><br><small>${h(row.body)}</small></td>
              <td>${AFF.helpers.tag(row.status === "unread" ? "待审核" : "通过")}</td>
              <td>${row.status === "unread" ? `<button class="button secondary small" type="button" data-message-read="${row.id}">${row.level === "required" ? t("确认已读", "Acknowledge") : t("标记已读", "Mark read")}</button>` : "-"}</td>
            </tr>`).join("")}</tbody>
          </table></div>
        </section>
      </div>`;
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-message-read]");
    if (!button) return;
    const message = AFF.finance.messages.find(item => item.id === button.dataset.messageRead);
    if (!message) return;
    message.status = "read";
    showToast("已读状态已保存");
    render();
    document.querySelector(`[data-message-read='${message.id}']`)?.focus();
  });

  AFF.pages.messages = renderPage;
})();
