(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;

  function updateSummary(root) {
    const select = root.querySelector("select");
    const labels = [...select.selectedOptions].map(option => option.textContent);
    const summary = root.querySelector("[data-profile-selection-summary]");
    summary.textContent = labels.length
      ? `${labels.slice(0, 2).join(t("、", ", "))}${labels.length > 2 ? ` +${labels.length - 2}` : ""}`
      : root.dataset.placeholder;
    summary.title = labels.join(t("、", ", "));
  }

  function render({ key, label, options, value, multiple = false, disabled = false, attributes = "" }) {
    const selected = multiple
      ? (Array.isArray(value) ? value : String(value || "").split(/[,，、\n]/).map(item => item.trim()).filter(Boolean))
      : [String(value || "")];
    const choices = [...options];
    selected.filter(item => item && !choices.some(option => option.value === item))
      .forEach(item => choices.push({ value: item, label: item, search: item }));
    const labels = choices.filter(item => selected.includes(item.value)).map(item => item.label);
    const id = `profile-selection-${AFF.state.route}-${key}`;
    const placeholder = t("请选择", "Select");
    return `<div class="profile-select" data-profile-selection data-placeholder="${h(placeholder)}">
      <span class="profile-select-label" id="${id}-label">${h(label)}</span>
      <select class="profile-select-native" data-aff-dd="off" tabindex="-1" aria-hidden="true" ${attributes} ${multiple ? "multiple" : ""} ${disabled ? "disabled" : ""}>
        ${multiple ? "" : `<option value="" ${!value ? "selected" : ""}>${h(placeholder)}</option>`}
        ${choices.map(item => `<option value="${h(item.value)}" ${selected.includes(item.value) ? "selected" : ""}>${h(item.label)}</option>`).join("")}
      </select>
      <details ${disabled ? 'data-disabled="true"' : ""}>
        <summary aria-labelledby="${id}-label ${id}-value" aria-disabled="${disabled}" ${disabled ? 'tabindex="-1"' : ""}>
          <span id="${id}-value" data-profile-selection-summary title="${h(labels.join("、"))}">${h(labels.length ? `${labels.slice(0, 2).join(t("、", ", "))}${labels.length > 2 ? ` +${labels.length - 2}` : ""}` : placeholder)}</span>
        </summary>
        <div class="profile-select-panel">
          <input type="search" data-profile-selection-search aria-label="${h(t("搜索", "Search"))} ${h(label)}" placeholder="${h(t("搜索", "Search"))}" ${disabled ? "disabled" : ""}>
          ${multiple ? `<button type="button" class="report-text-button profile-select-clear" data-profile-selection-clear ${disabled ? "disabled" : ""}>${t("清空已选", "Clear selection")}</button>` : ""}
          <div class="profile-select-options" role="group" aria-label="${h(label)}">
            ${choices.map(item => `<label class="profile-select-option" data-profile-selection-option data-search="${h((item.search || item.label).toLowerCase())}">
              <input type="${multiple ? "checkbox" : "radio"}" name="${id}" value="${h(item.value)}" data-profile-selection-choice ${selected.includes(item.value) ? "checked" : ""} ${disabled ? "disabled" : ""}>
              <span>${h(item.label)}</span></label>`).join("")}
          </div>
          <div class="profile-select-empty" hidden>${t("暂无匹配结果", "No matches")}</div>
        </div>
      </details>
    </div>`;
  }

  function sync(root) {
    const select = root.querySelector("select");
    const selected = new Set([...root.querySelectorAll("[data-profile-selection-choice]:checked")].map(input => input.value));
    [...select.options].forEach(option => { option.selected = selected.has(option.value); });
    updateSummary(root);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  document.addEventListener("change", event => {
    if (!event.target.matches("[data-profile-selection-choice]")) return;
    const root = event.target.closest("[data-profile-selection]");
    if (root.querySelector("select").disabled) return;
    sync(root);
    if (!root.querySelector("select").multiple) {
      root.querySelector("details").open = false;
      root.querySelector("summary").focus();
    }
  });
  document.addEventListener("input", event => {
    if (!event.target.matches("[data-profile-selection-search]")) return;
    const root = event.target.closest("[data-profile-selection]");
    const query = event.target.value.trim().toLowerCase();
    const options = [...root.querySelectorAll("[data-profile-selection-option]")];
    options.forEach(option => { option.hidden = !option.dataset.search.includes(query); });
    root.querySelector(".profile-select-empty").hidden = options.some(option => !option.hidden);
  });
  document.addEventListener("click", event => {
    const summary = event.target.closest("[data-profile-selection] summary");
    if (summary?.closest("details").dataset.disabled) event.preventDefault();
    const clear = event.target.closest("[data-profile-selection-clear]");
    if (clear) {
      const root = clear.closest("[data-profile-selection]");
      if (root.querySelector("select").disabled) return;
      root.querySelectorAll("[data-profile-selection-choice]").forEach(input => { input.checked = false; });
      sync(root);
    }
    document.querySelectorAll("[data-profile-selection] details[open]").forEach(details => {
      if (!details.contains(event.target)) details.open = false;
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const details = event.target.closest("[data-profile-selection] details[open]");
    if (!details) return;
    event.preventDefault();
    details.open = false;
    details.querySelector("summary").focus();
  });

  AFF.profileSelect = { render };
})();
