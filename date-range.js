(() => {
  const h = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const dayMs = 86400000;
  const states = new Map();

  function dateValue(value) {
    return Date.parse(`${value}T00:00:00Z`);
  }

  function iso(value) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function monthOf(value) {
    return (value || iso(Date.now())).slice(0, 7);
  }

  function monthLabel(month) {
    return new Intl.DateTimeFormat(AFF.state?.language === "en" ? "en-US" : "zh-CN", {
      year: "numeric", month: "long", timeZone: "UTC"
    }).format(new Date(`${month}-01T00:00:00Z`));
  }

  function state(id, from, to) {
    if (!states.has(id)) states.set(id, { month: monthOf(from || to), pending: "" });
    return states.get(id);
  }

  function buttonText(from, to, placeholder) {
    return from && to ? `${from} — ${to}` : from || to || placeholder;
  }

  function component({ id, from = "", to = "", max = "", placeholder = "选择日期范围" }) {
    state(id, from, to);
    return `<div class="date-range-picker" data-range-id="${h(id)}" data-range-from="${h(from)}" data-range-to="${h(to)}" data-range-max="${h(max)}">
      <button class="date-range-trigger" type="button" data-range-toggle aria-haspopup="dialog" aria-expanded="false">
        <span>${h(buttonText(from, to, placeholder))}</span><small aria-hidden="true">▾</small>
      </button>
      <div class="date-range-panel" hidden></div>
    </div>`;
  }

  function closeAll(except = null) {
    document.querySelectorAll(".date-range-picker").forEach(root => {
      if (root === except) return;
      root.querySelector(".date-range-panel")?.setAttribute("hidden", "");
      root.querySelector("[data-range-toggle]")?.setAttribute("aria-expanded", "false");
    });
  }

  function renderPanel(root) {
    const panel = root.querySelector(".date-range-panel");
    if (!panel) return;
    const id = root.dataset.rangeId;
    const current = state(id, root.dataset.rangeFrom, root.dataset.rangeTo);
    const monthDate = new Date(`${current.month}-01T00:00:00Z`);
    const firstOffset = (monthDate.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
    const max = root.dataset.rangeMax;
    const cells = [];
    for (let index = 0; index < firstOffset; index += 1) cells.push("<span></span>");
    for (let day = 1; day <= days; day += 1) {
      const value = `${current.month}-${String(day).padStart(2, "0")}`;
      const disabled = max && value > max ? "disabled" : "";
      const start = root.dataset.rangeFrom;
      const end = root.dataset.rangeTo;
      const selected = value === start || value === end || value === current.pending;
      const between = start && end && value > start && value < end;
      cells.push(`<button type="button" data-range-day="${value}" ${disabled} class="${selected ? "selected" : ""} ${between ? "between" : ""}">${day}</button>`);
    }
    panel.innerHTML = `
      <header>
        <button type="button" data-range-month="-1" aria-label="上一月">‹</button>
        <strong>${monthLabel(current.month)}</strong>
        <button type="button" data-range-month="1" aria-label="下一月">›</button>
      </header>
      <div class="date-range-week">一二三四五六日</div>
      <div class="date-range-grid">${cells.join("")}</div>
      <footer>
        <span>${current.pending ? `${current.pending} → 选择结束日期` : buttonText(root.dataset.rangeFrom, root.dataset.rangeTo, "未选择")}</span>
        <button type="button" data-range-clear>清空</button>
      </footer>
    `;
    panel.removeAttribute("hidden");
  }

  function updateTrigger(root) {
    root.querySelector("[data-range-toggle] > span").textContent = buttonText(
      root.dataset.rangeFrom, root.dataset.rangeTo, "选择日期范围"
    );
  }

  document.addEventListener("click", event => {
    const toggle = event.target.closest("[data-range-toggle]");
    if (toggle) {
      const root = toggle.closest(".date-range-picker");
      const panel = root.querySelector(".date-range-panel");
      const open = panel.hidden;
      closeAll(root);
      if (open) {
        renderPanel(root);
        toggle.setAttribute("aria-expanded", "true");
      } else {
        panel.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
      }
      return;
    }

    const monthButton = event.target.closest("[data-range-month]");
    if (monthButton) {
      const root = monthButton.closest(".date-range-picker");
      const current = state(root.dataset.rangeId, root.dataset.rangeFrom, root.dataset.rangeTo);
      const date = new Date(`${current.month}-01T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + Number(monthButton.dataset.rangeMonth));
      current.month = date.toISOString().slice(0, 7);
      return renderPanel(root);
    }

    const clear = event.target.closest("[data-range-clear]");
    if (clear) {
      const root = clear.closest(".date-range-picker");
      root.dataset.rangeFrom = "";
      root.dataset.rangeTo = "";
      state(root.dataset.rangeId).pending = "";
      updateTrigger(root);
      root.dispatchEvent(new CustomEvent("date-range-change", {
        bubbles: true,
        detail: { id: root.dataset.rangeId, from: "", to: "" }
      }));
      closeAll();
      return root.querySelector("[data-range-toggle]")?.focus();
    }

    const dayButton = event.target.closest("[data-range-day]");
    if (!dayButton || dayButton.disabled) return;
    const root = dayButton.closest(".date-range-picker");
    const current = state(root.dataset.rangeId, root.dataset.rangeFrom, root.dataset.rangeTo);
    const value = dayButton.dataset.rangeDay;
    if (!current.pending) {
      current.pending = value;
      return renderPanel(root);
    }
    let from = current.pending;
    let to = value;
    if (dateValue(to) < dateValue(from)) [from, to] = [to, from];
    root.dataset.rangeFrom = from;
    root.dataset.rangeTo = to;
    current.pending = "";
    current.month = monthOf(from);
    updateTrigger(root);
    root.dispatchEvent(new CustomEvent("date-range-change", {
      bubbles: true,
      detail: { id: root.dataset.rangeId, from, to }
    }));
    closeAll();
    root.querySelector("[data-range-toggle]")?.focus();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const root = event.target.closest?.(".date-range-picker");
    closeAll(root || null);
    if (root) root.querySelector("[data-range-toggle]")?.focus();
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".date-range-picker")) closeAll();
  }, true);

  AFF.dateRange = { component };
})();
