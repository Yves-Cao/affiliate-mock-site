/* Affiliate universal custom dropdown component.
 *
 * Why: native <select> popups are drawn by the OS. Their width follows the
 * longest option text (not the control), vertical alignment snaps the selected
 * item to the control, and behavior differs across OS/browsers. On macOS the
 * popup overflowed the quick-filter controls by ~26px (2026-11-06 audit).
 *
 * How: every rendered <select> gets enhanced in place. The native element stays
 * in the DOM (label association, form validation, value source of truth) but is
 * visually clipped. A trigger button + fixed-position listbox render beside it.
 * Picking an option writes select.value and dispatches a bubbling "change"
 * event, so all existing data-* delegated handlers keep working untouched.
 *
 * Registry: AFF.dropdown.enhance(root) — manual pass for freshly rendered DOM;
 * a MutationObserver keeps watch automatically. Opt out per select with
 * data-aff-dd="off". */
(function () {
  "use strict";

  const state = {
    open: null,          // { select, trigger, list, options: HTMLButtonElement[] }
    activeIndex: -1,
    observer: null
  };

  const t = (zh, en) => (document.documentElement.dataset.affLang === "en" ? en : zh);

  function isEnhanceable(select) {
    if (!(select instanceof HTMLSelectElement)) return false;
    if (select.dataset.affDd === "off") return false;
    if (select.closest(".aff-dd")) return false;            // already enhanced
    if (select.multiple) return false;                       // multi-select UI differs, keep native
    return true;
  }

  function enhance(select) {
    if (!isEnhanceable(select)) return;
    const wrap = document.createElement("span");
    wrap.className = "aff-dd";
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add("aff-dd-native");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "aff-dd-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    if (select.disabled) trigger.disabled = true;
    if (select.id) trigger.setAttribute("aria-controls", select.id + "-dd-list");

    const label = document.createElement("span");
    label.className = "aff-dd-label";
    trigger.appendChild(label);
    wrap.appendChild(trigger);

    const list = document.createElement("ul");
    list.className = "aff-dd-list";
    list.id = (select.id || "aff-dd-" + Math.random().toString(36).slice(2, 8)) + "-dd-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    list.setAttribute("aria-label", select.getAttribute("aria-label") || "");
    wrap.appendChild(list);

    syncFromSelect(select, trigger, list);

    trigger.addEventListener("click", () => (state.open && state.open.select === select ? close() : open(select)));
    trigger.addEventListener("keydown", event => onTriggerKey(event, select));
    select.addEventListener("focus", () => trigger.classList.add("is-focus"));
    select.addEventListener("blur", () => trigger.classList.remove("is-focus"));
    // Keep trigger label in sync when code (not the dropdown UI) changes the value.
    select.addEventListener("change", () => syncFromSelect(select, trigger, list));
  }

  function optionGroups(select) {
    // Flatten <option> and <optgroup> into [{ value, text, disabled, group }]
    const items = [];
    select.querySelectorAll(":scope > option, :scope > optgroup > option").forEach(node => {
      items.push({
        value: node.value,
        text: node.textContent,
        disabled: node.disabled,
        group: node.parentElement.tagName === "OPTGROUP" ? node.parentElement.label : ""
      });
    });
    if (!items.length) items.push({ value: "", text: "", disabled: false, group: "" });
    return items;
  }

  function syncFromSelect(select, trigger, list) {
    const items = optionGroups(select);
    const current = items.find(item => item.value === select.value) || items[0];
    const title = select.dataset.affDdTitle || "";
    trigger.querySelector(".aff-dd-label").textContent = title
      ? (current && current.value ? `${title}：${current.text}` : `${title}：${t("全部", "All")}`)
      : (current ? current.text : "");
    list.innerHTML = "";
    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.setAttribute("role", "presentation");
      if (item.group && item.group !== (items[index - 1] && items[index - 1].group)) {
        const header = document.createElement("div");
        header.className = "aff-dd-group";
        header.textContent = item.group;
        li.appendChild(header);
      }
      const option = document.createElement("button");
      option.type = "button";
      option.className = "aff-dd-option";
      option.setAttribute("role", "option");
      option.tabIndex = -1;
      option.dataset.value = item.value;
      option.setAttribute("aria-selected", String(item.value === select.value));
      option.innerHTML = `<span class="aff-dd-option-text"></span>`;
      option.querySelector(".aff-dd-option-text").textContent = item.text;
      if (item.disabled) option.disabled = true;
      option.addEventListener("click", () => pick(select, item.value));
      option.addEventListener("mouseenter", () => setActive(findOptions(list).indexOf(option)));
      li.appendChild(option);
      list.appendChild(li);
    });
    trigger.setAttribute("aria-owns", list.id);
  }

  function findOptions(list) {
    return Array.from(list.querySelectorAll(".aff-dd-option"));
  }

  function open(select) {
    close();
    const wrap = select.closest(".aff-dd");
    const trigger = wrap.querySelector(".aff-dd-trigger");
    const list = wrap.querySelector(".aff-dd-list");
    syncFromSelect(select, trigger, list);        // options may have changed since render
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    position(list, trigger);
    state.open = { select, trigger, list };
    state.activeIndex = Math.max(0, findOptions(list).findIndex(option => option.getAttribute("aria-selected") === "true"));
    scrollToActive();
    // Focus stays on the trigger (keyboard model of combobox pattern).
    trigger.focus();
  }

  function position(list, trigger) {
    const rect = trigger.getBoundingClientRect();
    list.style.minWidth = rect.width + "px";
    // Fully synchronous: the list is un-hidden and min-width'd, so offsetHeight/
    // offsetWidth are readable without a hide-measure-show dance (no flicker while
    // repositioning on scroll).
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const lh = list.offsetHeight;
    let top = rect.bottom + 4;
    if (top + lh > vh - 8 && rect.top - lh - 4 > 8) top = rect.top - lh - 4;
    // Clamp horizontally so the list never overflows the viewport.
    let left = rect.left;
    const lw = Math.max(list.offsetWidth, rect.width);
    if (left + lw > vw - 8) left = Math.max(8, vw - lw - 8);
    list.style.left = left + "px";
    list.style.top = top + "px";
  }

  function close() {
    if (!state.open) return;
    const { trigger, list } = state.open;
    list.hidden = true;
    list.style.visibility = "";
    trigger.setAttribute("aria-expanded", "false");
    state.open = null;
    state.activeIndex = -1;
  }

  function pick(select, value) {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const wrap = select.closest(".aff-dd");
    const trigger = wrap && wrap.querySelector(".aff-dd-trigger");
    close();
    if (trigger) trigger.focus();
  }

  function onTriggerKey(event, select) {
    const wrap = select.closest(".aff-dd");
    const list = wrap.querySelector(".aff-dd-list");
    const options = findOptions(list);
    const opened = state.open && state.open.select === select;
    const keys = ["ArrowDown", "ArrowUp", "Enter", " ", "Escape", "Home", "End", "Tab"];
    if (!keys.includes(event.key)) {
      // Type-ahead: jump to first option starting with the key char
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const ch = event.key.toLowerCase();
        const match = options.findIndex(option => option.textContent.trim().toLowerCase().startsWith(ch));
        if (match >= 0 && opened) { event.preventDefault(); setActive(match); }
      }
      return;
    }
    event.preventDefault();
    switch (event.key) {
      case "ArrowDown":
        if (!opened) return open(select);
        setActive((state.activeIndex + 1 + options.length) % options.length);
        break;
      case "ArrowUp":
        if (!opened) return open(select);
        setActive((state.activeIndex - 1 + options.length) % options.length);
        break;
      case "Home":
        if (opened) setActive(0);
        break;
      case "End":
        if (options.length) setActive(options.length - 1);
        break;
      case "Enter": case " ":
        if (!opened) return open(select);
        event.stopPropagation();     // avoid submitting login/register forms on Enter
        if (state.activeIndex >= 0) pick(select, options[state.activeIndex].dataset.value);
        break;
      case "Escape":
        if (opened) {
          event.stopPropagation();   // don't cascade-close drawers (reports.js listens on document)
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  }

  function setActive(index) {
    const { list } = state.open || {};
    if (!list) return;
    const options = findOptions(list);
    if (!options.length) return;
    state.activeIndex = ((index % options.length) + options.length) % options.length;
    options.forEach((option, i) => option.classList.toggle("active", i === state.activeIndex));
    scrollToActive();
  }

  function scrollToActive() {
    const { list } = state.open || {};
    if (!list) return;
    const option = list.querySelectorAll(".aff-dd-option")[state.activeIndex];
    if (option) option.scrollIntoView({ block: "nearest" });
  }

  function isInsideDropdown(node) {
    return node && node.closest && node.closest(".aff-dd");
  }

  function bootstrap() {
    document.addEventListener("click", event => {
      if (!state.open) return;
      if (isInsideDropdown(event.target)) return;
      close();
    }, true);
    window.addEventListener("resize", close);
    // While open, the fixed-position list FOLLOWS the trigger as the page scrolls
    // (repositioned per frame). It only closes once the trigger leaves the viewport
    // entirely (native popup behavior). Scroll events inside the list itself are ignored.
    window.addEventListener("scroll", event => {
      if (!state.open) return;
      if (event.target === state.open.list) return;      // list's own overflow scroll
      const rect = state.open.trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) { close(); return; }
      if (!state.rafPending) {
        state.rafPending = true;
        requestAnimationFrame(() => {
          state.rafPending = false;
          if (state.open) position(state.open.list, state.open.trigger);
        });
      }
    }, true);

    const scan = root => (root || document).querySelectorAll("select").forEach(select => {
      if (isEnhanceable(select)) enhance(select);
    });
    scan(document);

    state.observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.tagName === "SELECT") { enhance(node); continue; }
          if (node.closest && node.closest(".aff-dd")) continue;
          const selects = node.querySelectorAll ? node.querySelectorAll("select") : [];
          selects.forEach(select => enhance(select));
        }
      }
    });
    state.observer.observe(document.body, { childList: true, subtree: true });

    // Keep disabled state in sync when code toggles select.disabled.
    new MutationObserver(records => {
      records.forEach(record => {
        const select = record.target;
        if (!(select instanceof HTMLSelectElement)) return;
        const wrap = select.closest(".aff-dd");
        if (!wrap) return;
        const trigger = wrap.querySelector(".aff-dd-trigger");
        if (trigger) trigger.disabled = select.disabled;
      });
    }).observe(document.body, { attributes: true, attributeFilter: ["disabled"], subtree: true, characterData: false });

    window.AFF = window.AFF || {};
    window.AFF.dropdown = {
      enhance,
      close,
      version: "1.1.0"
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
