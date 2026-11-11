// ==UserScript==
// @name         Figma Design Reader (Local Read-only)
// @namespace    local.affiliate.figma
// @version      0.3.0
// @description  Locally inspect Figma page DOM, payloads, styles, text, canvas colors, and accessible design hints. No network upload and no permission bypass.
// @author       Affiliate Mock
// @match        https://www.figma.com/design/*
// @match        https://www.figma.com/file/*
// @run-at       document-start
// @grant        GM_setClipboard
// @grant        GM_download
// @noframes
// ==/UserScript==

(() => {
  "use strict";

  const MAX_JSON_CHARS = 5 * 1024 * 1024;
  const MAX_TEXT_CHARS = 20000;
  const MAX_RESPONSES = 80;
  const MAX_NODES = 5000;
  const MAX_HINTS = 2000;

  const state = {
    schema: "figma-reader/0.3",
    startedAt: new Date().toISOString(),
    capturedAt: null,
    url: location.href,
    fileKey: getFileKey(location.href),
    nodeId: getNodeId(location.href),
    permissions: null,
    dom: null,
    typography: null,
    colors: null,
    canvas: null,
    figmaStylePanel: null,
    cssVariables: null,
    network: [],
    realtime: [],
    indexedDB: null,
    storage: null,
    payload: null,
    report: null,
    tasks: [],
    warnings: [],
    networkBytes: 0
  };

  let uiTimer = 0;
  let lastUrl = location.href;

  function safeCall(name, task, skipReason) {
    try {
      const value = task();
      if (value === undefined || value === null) {
        state.tasks.push({ name, status: "skipped", reason: skipReason || "No data returned" });
        return null;
      }
      state.tasks.push({ name, status: "ok", summary: summarize(value) });
      return value;
    } catch (error) {
      state.tasks.push({
        name,
        status: "skipped",
        reason: error && error.message ? error.message : String(error)
      });
      return null;
    }
  }

  function summarize(value) {
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === "object") return `${Object.keys(value).length} keys`;
    return String(value).slice(0, 120);
  }

  function getFileKey(url) {
    const match = String(url).match(/figma\.com\/(?:design|file)\/([0-9a-zA-Z]+)/);
    return match ? match[1] : null;
  }

  function getNodeId(url) {
    const match = String(url).match(/[?&]node-id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function isFigmaApiUrl(url) {
    return /^https?:\/\/(?:[^/]*\.)?figma\.com\/(?:api|plugin|design|file)\//.test(String(url));
  }

  function isDesignPayloadUrl(url) {
    return /(?:\/api\/|\/plugin\/).*(?:file|document|node|component|style|variable|library|publish|team|project|me)/i.test(String(url));
  }

  function textBytes(value) {
    return new TextEncoder().encode(value).length;
  }

  function sanitizeJson(value, depth = 0, budget = { count: 0 }) {
    if (budget.count > 120000) return "[omitted:limit]";
    if (value === null || value === undefined) return value;
    if (typeof value === "string") {
      budget.count += value.length;
      if (value.length > 12000) return value.slice(0, 12000) + `…[+${value.length - 12000} chars]`;
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      budget.count += 8;
      return value;
    }
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (depth > 24) return "[omitted:depth]";
    if (Array.isArray(value)) {
      return value.slice(0, 500).map(item => sanitizeJson(item, depth + 1, budget));
    }
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^(?:password|token|secret|csrf|authenticity)/i.test(key)) continue;
      output[key] = sanitizeJson(item, depth + 1, budget);
    }
    return output;
  }

  function pushNetwork(entry) {
    if (state.network.length >= MAX_RESPONSES) {
      state.warnings.push("Network capture reached the response limit; older entries are retained.");
      return;
    }
    if (state.network.some(item => item.url === entry.url && item.status === entry.status)) return;
    if (state.networkBytes + entry.bytes > MAX_JSON_CHARS) {
      state.warnings.push(`Skipped ${entry.url}: JSON capture limit reached.`);
      return;
    }
    state.network.push(entry);
    state.networkBytes += entry.bytes;
  }

  async function captureFetchResponse(response, requestUrl) {
    if (!isFigmaApiUrl(requestUrl)) return;
    const entry = {
      capturedAt: new Date().toISOString(),
      transport: "fetch",
      url: requestUrl,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type") || "",
      bytes: 0,
      kind: isDesignPayloadUrl(requestUrl) ? "design" : "figma",
      json: null
    };
    try {
      const text = await response.clone().text();
      entry.bytes = textBytes(text);
      if ((response.headers.get("content-type") || "").includes("json") || /^[[{]/.test(text)) {
        entry.json = sanitizeJson(JSON.parse(text));
      }
      pushNetwork(entry);
    } catch (error) {
      entry.error = error.message;
      pushNetwork(entry);
    }
  }

  function installNetworkHooks() {
    const originalFetch = window.fetch;
    if (typeof originalFetch !== "function") return;
    window.fetch = async function(...args) {
      const requestUrl = typeof args[0] === "string" ? new URL(args[0], location.origin).href :
        args[0] && args[0].url ? new URL(args[0].url, location.origin).href : location.href;
      const response = await originalFetch.apply(this, args);
      captureFetchResponse(response, requestUrl);
      return response;
    };

    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__figmaReaderUrl = new URL(String(url), location.origin).href;
      return open.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener("load", () => {
        if (!isFigmaApiUrl(this.__figmaReaderUrl || "")) return;
        const text = String(this.responseType === "json" ? JSON.stringify(this.response) : this.responseText || "");
        const entry = {
          capturedAt: new Date().toISOString(),
          transport: "xhr",
          url: this.__figmaReaderUrl,
          status: this.status,
          ok: this.status >= 200 && this.status < 300,
          contentType: this.getResponseHeader("content-type") || "",
          bytes: textBytes(text),
          kind: isDesignPayloadUrl(this.__figmaReaderUrl) ? "design" : "figma",
          json: null
        };
        try {
          if (text.startsWith("{") || text.startsWith("[")) entry.json = sanitizeJson(JSON.parse(text));
        } catch (error) {
          entry.error = error.message;
        }
        pushNetwork(entry);
      });
      return send.call(this, ...args);
    };
  }

  function captureRealtime(kind, direction, data) {
    if (state.realtime.length >= 160) return;
    const item = {
      capturedAt: new Date().toISOString(),
      kind,
      direction,
      bytes: 0,
      text: null,
      encoding: typeof data
    };
    try {
      if (typeof data === "string") {
        item.bytes = textBytes(data);
        item.text = data.slice(0, 16000);
      } else if (data instanceof ArrayBuffer) {
        item.bytes = data.byteLength;
        const bytes = new Uint8Array(data.slice(0, 4096));
        let printable = 0;
        for (const byte of bytes) if (byte >= 32 && byte <= 126) printable += 1;
        if (printable / Math.max(1, bytes.length) > 0.75) {
          item.encoding = "arraybuffer-text";
          item.text = new TextDecoder().decode(bytes);
        } else item.encoding = "binary";
      } else if (data instanceof Blob) {
        item.bytes = data.size;
        item.encoding = "blob";
      } else {
        item.bytes = JSON.stringify(data || {}).length;
        item.text = JSON.stringify(sanitizeJson(data), null, 0).slice(0, 16000);
      }
      state.realtime.push(item);
    } catch (error) {
      item.error = error.message;
      state.realtime.push(item);
    }
  }

  function installRealtimeHooks() {
    const OriginalWebSocket = window.WebSocket;
    if (OriginalWebSocket) {
      function WrappedWebSocket(url, protocols) {
        const socket = protocols === undefined ? new OriginalWebSocket(url) : new OriginalWebSocket(url, protocols);
        const targetUrl = String(url);
        socket.addEventListener("message", event => captureRealtime("websocket", "in", event.data));
        socket.addEventListener("send", () => {});
        const originalSend = socket.send.bind(socket);
        socket.send = data => {
          captureRealtime("websocket", "out", data);
          return originalSend(data);
        };
        Object.defineProperty(socket, "__figmaReaderUrl", { value: targetUrl });
        return socket;
      }
      Object.setPrototypeOf(WrappedWebSocket, OriginalWebSocket);
      Object.setPrototypeOf(WrappedWebSocket.prototype, OriginalWebSocket.prototype);
      for (const key of Object.getOwnPropertyNames(OriginalWebSocket)) {
        if (!["prototype", "length", "name"].includes(key)) {
          try { WrappedWebSocket[key] = OriginalWebSocket[key]; } catch {}
        }
      }
      window.WebSocket = WrappedWebSocket;
    }

    const OriginalWorker = window.Worker;
    if (OriginalWorker) {
      function WrappedWorker(url, options) {
        const worker = new OriginalWorker(url, options);
        worker.addEventListener("message", event => captureRealtime("worker", "in", event.data));
        const originalPostMessage = worker.postMessage.bind(worker);
        worker.postMessage = (...args) => {
          captureRealtime("worker", "out", args[0]);
          return originalPostMessage(...args);
        };
        Object.defineProperty(worker, "__figmaReaderScriptURL", { value: String(url) });
        return worker;
      }
      Object.setPrototypeOf(WrappedWorker, OriginalWorker);
      Object.setPrototypeOf(WrappedWorker.prototype, OriginalWorker.prototype);
      for (const key of Object.getOwnPropertyNames(OriginalWorker)) {
        if (!["prototype", "length", "name"].includes(key)) {
          try { WrappedWorker[key] = OriginalWorker[key]; } catch {}
        }
      }
      window.Worker = WrappedWorker;
    }

    const OriginalBroadcastChannel = window.BroadcastChannel;
    if (OriginalBroadcastChannel) {
      function WrappedBroadcastChannel(name) {
        const channel = new OriginalBroadcastChannel(name);
        channel.addEventListener("message", event => captureRealtime("broadcast", "in", event.data));
        const originalPostMessage = channel.postMessage.bind(channel);
        channel.postMessage = data => {
          captureRealtime("broadcast", "out", data);
          return originalPostMessage(data);
        };
        Object.defineProperty(channel, "__figmaReaderName", { value: name });
        return channel;
      }
      Object.setPrototypeOf(WrappedBroadcastChannel, OriginalBroadcastChannel);
      Object.setPrototypeOf(WrappedBroadcastChannel.prototype, OriginalBroadcastChannel.prototype);
      window.BroadcastChannel = WrappedBroadcastChannel;
    }
  }

  function collectStorage() {
    const output = {
      localStorage: {},
      sessionStorage: {},
      persisted: null,
      estimate: null
    };
    for (const storage of [localStorage, sessionStorage]) {
      const target = storage === localStorage ? output.localStorage : output.sessionStorage;
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (/token|password|secret|csrf/i.test(key)) continue;
        const value = storage.getItem(key) || "";
        target[key] = value.length > 12000 ? value.slice(0, 12000) + "…[truncated]" : value;
      }
    }
    if (navigator.storage && navigator.storage.persisted) output.persisted = navigator.storage.persisted();
    if (navigator.storage && navigator.storage.estimate) output.estimate = navigator.storage.estimate();
    return output;
  }

  function openDatabase(name) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      const timer = setTimeout(() => reject(new Error(`Timeout opening ${name}`)), 2500);
      request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
      request.onerror = () => { clearTimeout(timer); reject(request.error); };
      request.onblocked = () => { clearTimeout(timer); reject(new Error(`Blocked opening ${name}`)); };
    });
  }

  function readStore(db, storeName) {
    return new Promise((resolve, reject) => {
      const output = { name: storeName, keyPath: null, indexNames: [], records: [], count: null, skipped: null };
      let tx;
      try { tx = db.transaction(storeName, "readonly"); } catch (error) { output.skipped = error.message; return resolve(output); }
      const store = tx.objectStore(storeName);
      output.keyPath = store.keyPath;
      output.indexNames = [...store.indexNames];
      const countRequest = store.count();
      countRequest.onsuccess = () => { output.count = countRequest.result; };
      const cursor = store.openCursor();
      let records = 0;
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current || records >= 160) return;
        records += 1;
        const value = sanitizeJson(current.value);
        output.records.push({ key: current.key, value });
        current.continue();
      };
      tx.oncomplete = () => resolve(output);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  async function collectIndexedDB() {
    if (!indexedDB || !indexedDB.databases) throw new Error("IndexedDB enumeration unavailable");
    const databases = await indexedDB.databases();
    const output = {
      databases: [],
      stores: [],
      warnings: []
    };
    const prioritized = databases.sort((left, right) => {
      const score = item => /figma|file|document|node|cache|sync|realtime|paint|worker/i.test(item.name || "") ? 0 : 1;
      return score(left) - score(right);
    }).slice(0, 24);
    for (const info of prioritized) {
      if (!info.name) continue;
      let db = null;
      try {
        db = await openDatabase(info.name);
        output.databases.push({ name: info.name, version: db.version, storeNames: [...db.objectStoreNames] });
        for (const storeName of [...db.objectStoreNames].slice(0, 24)) {
          const store = await readStore(db, storeName);
          output.stores.push(store);
        }
      } catch (error) {
        output.warnings.push(`${info.name}: ${error.message}`);
      } finally {
        try { db?.close(); } catch {}
      }
    }
    return output;
  }

  function visibleText() {
    const source = document.body ? document.body.innerText || "" : "";
    return source.length > MAX_TEXT_CHARS ? source.slice(0, MAX_TEXT_CHARS) + "…[truncated]" : source;
  }

  function readPermission() {
    const text = document.body ? document.body.innerText : "";
    return {
      canEdit: !/you can only view and comment|view only/i.test(text),
      indicators: [
        /you can only view and comment/i.test(text) ? "read-only-banner" : null,
        /\bask to edit\b/i.test(text) ? "ask-to-edit" : null,
        /\bview only\b/i.test(text) ? "view-only-tool" : null
      ].filter(Boolean),
      note: "This is a UI hint only; it does not inspect or bypass account permissions."
    };
  }

  function collectPanelRows() {
    const rows = [];
    const nodes = document.querySelectorAll('[role="row"], [role="option"], [aria-label], button');
    for (const node of nodes) {
      const label = node.getAttribute("aria-label") || "";
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (!label && !text) continue;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      rows.push({
        tag: node.tagName.toLowerCase(),
        role: node.getAttribute("role") || "",
        label: label.slice(0, 300),
        text: text.slice(0, 500),
        expanded: node.getAttribute("aria-expanded"),
        selected: node.getAttribute("aria-selected"),
        rect: roundRect(rect)
      });
      if (rows.length >= 800) break;
    }
    return rows;
  }

  function collectHeadings() {
    return [...document.querySelectorAll("h1,h2,h3,h4,[role='heading']")].map(node => ({
      level: node.getAttribute("aria-level") || node.tagName.toLowerCase(),
      text: (node.innerText || "").trim().slice(0, 300),
      rect: roundRect(node.getBoundingClientRect())
    })).filter(item => item.text);
  }

  function collectDom() {
    if (!document.body) throw new Error("DOM not ready");
    return {
      title: document.title,
      language: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      selection: String(getSelection() || "").slice(0, 2000),
      headings: collectHeadings(),
      panelRows: collectPanelRows(),
      visibleText: visibleText()
    };
  }

  function roundRect(rect) {
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  function rgbToHex(value) {
    const match = String(value).match(/rgba?\(([^)]+)\)/);
    if (!match) return "";
    const parts = match[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length < 3) return "";
    return "#" + parts.slice(0, 3).map(item => Math.max(0, Math.min(255, item)).toString(16).padStart(2, "0")).join("");
  }

  function collectTypography() {
    const output = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode() && output.length < 400) {
      const node = walker.currentNode;
      if (node.children.length || node.shadowRoot) continue;
      const text = (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 500) continue;
      const style = getComputedStyle(node);
      output.push({
        text,
        tag: node.tagName.toLowerCase(),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        color: style.color,
        colorHex: rgbToHex(style.color),
        rect: roundRect(node.getBoundingClientRect())
      });
    }
    return output;
  }

  function collectCssVariables() {
    const variables = {};
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const rule of rules) {
        if (!rule.style) continue;
        for (let index = 0; index < rule.style.length; index += 1) {
          const name = rule.style.item(index);
          if (name.startsWith("--")) variables[name] = rule.style.getPropertyValue(name).trim();
        }
      }
    }
    for (const node of [document.documentElement, document.body]) {
      for (const name of node.style) {
        if (name.startsWith("--")) variables[name] = node.style.getPropertyValue(name).trim();
      }
    }
    return variables;
  }

  function paletteFromImageData(data) {
    const buckets = new Map();
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 24) continue;
      const quantized = [data[index], data[index + 1], data[index + 2]]
        .map(value => Math.round(value / 16) * 16);
      const key = `#${quantized.map(value => value.toString(16).padStart(2, "0")).join("")}`;
      const bucket = buckets.get(key) || { key, count: 0, rgb: quantized };
      bucket.count += 1;
      buckets.set(key, bucket);
    }
    return [...buckets.values()].sort((left, right) => right.count - left.count).slice(0, 32)
      .map(item => ({
        hex: item.key,
        share: Number((item.count / Math.max(1, buckets.size)).toFixed(4)),
        approximate: true
      }));
  }

  function captureCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const item = {
      width: canvas.width,
      height: canvas.height,
      cssRect: roundRect(rect),
      contextType: canvas.getContext("2d") ? "2d" : canvas.getContext("webgl") || canvas.getContext("webgl2") ? "webgl" : "unknown",
      thumbnail: null,
      palette: []
    };
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(canvas.width || 1, canvas.height || 1));
    const target = document.createElement("canvas");
    target.width = Math.max(1, Math.round((canvas.width || rect.width) * scale));
    target.height = Math.max(1, Math.round((canvas.height || rect.height) * scale));
    const context = target.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0, target.width, target.height);
    const imageData = context.getImageData(0, 0, target.width, target.height);
    const palette = paletteFromImageData(imageData.data);
    let opaquePixels = 0;
    for (let index = 3; index < imageData.data.length; index += 4) if (imageData.data[index] >= 24) opaquePixels += 1;
    item.opaquePixels = opaquePixels;
    item.readable = opaquePixels > 0 && palette.length > 0;
    if (item.readable) {
      item.palette = palette;
      item.thumbnail = target.toDataURL("image/png");
    } else {
      item.palette = [];
      item.thumbnail = null;
      item.note = "Canvas pixels were unreadable or fully transparent; omitted blank thumbnail.";
    }
    return item;
  }

  function collectCanvas() {
    const canvases = [...document.querySelectorAll("canvas")];
    if (!canvases.length) throw new Error("No canvas element found");
    return {
      count: canvases.length,
      items: canvases.slice(0, 8).map(canvas => safeCall(`canvas:${canvas.width}x${canvas.height}`, () => captureCanvas(canvas), "Canvas could not be sampled") || {
        width: canvas.width,
        height: canvas.height,
        skipped: true
      })
    };
  }

  function collectColorsFromDom() {
    const counters = new Map();
    const nodes = [...document.querySelectorAll("body *")];
    for (const node of nodes.slice(0, 5000)) {
      const style = getComputedStyle(node);
      for (const value of [style.color, style.backgroundColor, style.borderTopColor]) {
        const hex = rgbToHex(value);
        if (!hex || hex === "#000000" && value.includes("0, 0, 0, 0")) continue;
        counters.set(hex, (counters.get(hex) || 0) + 1);
      }
    }
    return [...counters.entries()].sort((left, right) => right[1] - left[1]).slice(0, 80)
      .map(([hex, count]) => ({ hex, count, scope: "dom" }));
  }

  function collectPayloadHints() {
    const designResponses = state.network.filter(item => item.kind === "design" && item.json);
    if (!designResponses.length) throw new Error("No design JSON captured yet");
    const output = {
      responses: designResponses.map(item => ({ url: item.url, status: item.status, bytes: item.bytes })),
      pages: [],
      nodes: [],
      styles: [],
      variables: [],
      components: [],
      textNodes: [],
      paintNodes: []
    };
    const visitor = createNodeVisitor(output);
    for (const response of designResponses) {
      visitor(response.json);
    }
    output.nodes = output.nodes.slice(0, MAX_NODES);
    return output;
  }

  function rgbaTextToHex(value) {
    const match = String(value || "").match(/rgba?\(([^)]+)\)/);
    if (!match) return /^#[0-9a-f]{3,8}$/i.test(String(value)) ? String(value).toUpperCase() : null;
    const [r, g, b, a = 1] = match[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (![r, g, b].every(Number.isFinite)) return null;
    const hex = `#${[r, g, b].map(item => Math.max(0, Math.min(255, item)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    return Number.isFinite(a) && a < 1 ? `${hex} / ${a}` : hex;
  }

  function collectFigmaStylePanel() {
    const panel = [...document.querySelectorAll('[role="region"][aria-label]')]
      .find(node => /right sidebar/i.test(node.getAttribute("aria-label") || ""));
    if (!panel) throw new Error("Figma right sidebar not found");
    const text = panel.innerText || "";
    if (!/Styles|Text styles|Color styles/i.test(text)) {
      throw new Error("Properties/Styles panel is not active; switch from Comments to Properties");
    }

    const rows = [...panel.querySelectorAll('[role="treeitem"]')].map(row => {
      const rowText = (row.innerText || "").replace(/\s+/g, " ").trim();
      const swatches = [...row.querySelectorAll('[role="img"][aria-label], svg[circle], img')].map(node => {
        const html = node.outerHTML || "";
        const colors = [...html.matchAll(/(?:fill|stroke|stop-color)="([^"]+)"/g)]
          .map(match => rgbaTextToHex(match[1]) || match[1])
          .filter(Boolean);
        return {
          label: node.getAttribute("aria-label") || "",
          kind: node.tagName.toLowerCase(),
          colors,
          isBlobImage: node.tagName.toLowerCase() === "img" && String(node.getAttribute("src") || "").startsWith("blob:"),
          html: html.slice(0, 2000)
        };
      });
      const textStyle = rowText.match(/^(\d+(?:\.\d+)?)px\s*([MRB])(?:\s*·\s*(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?))?/);
      return {
        name: rowText,
        type: textStyle ? "text" : swatches.length ? "paint" : "unknown",
        textStyle: textStyle ? {
          fontSize: Number(textStyle[1]),
          weightToken: textStyle[2],
          weight: { M: 500, R: 400, B: 700 }[textStyle[2]] || null,
          lineHeight: textStyle[3] ? Number(textStyle[3]) : null,
          raw: rowText
        } : null,
        swatches,
        rect: roundRect(row.getBoundingClientRect())
      };
    });

    const sections = [...panel.querySelectorAll("h2,h3,h4,[role='heading']")].map(node => ({
      text: (node.innerText || "").trim(),
      rect: roundRect(node.getBoundingClientRect())
    })).filter(item => item.text);

    return {
      activeTab: /Properties/i.test(text) ? "Properties" : "unknown",
      sections,
      rows,
      panelText: text.slice(0, 20000)
    };
  }

  function createNodeVisitor(output) {
    const seen = new Set();
    let visited = 0;
    let hints = 0;
    return function visit(value, path = "$", depth = 0) {
      if (!value || typeof value !== "object" || visited > MAX_NODES + 2000 || depth > 40) return;
      if (Array.isArray(value)) {
        for (const item of value.slice(0, 1000)) visit(item, `${path}[]`, depth + 1);
        return;
      }
      visited += 1;
      const type = String(value.type || "");
      const id = String(value.id || value.key || "");
      if (id && !seen.has(id) && isDesignNode(type)) {
        seen.add(id);
        output.nodes.push(extractDesignNode(value, path));
      }
      if (type === "TEXT" && output.textNodes.length < 500 && value.characters) {
        output.textNodes.push({
          id,
          name: value.name,
          text: String(value.characters).slice(0, 500),
          style: value.style || null,
          path
        });
      }
      if ((value.fills || value.strokes || value.backgroundColor) && output.paintNodes.length < 800) {
        output.paintNodes.push({
          id,
          name: value.name,
          type,
          fills: value.fills,
          strokes: value.strokes,
          backgroundColor: value.backgroundColor,
          path
        });
      }
      if (isStyleObject(value) && output.styles.length < 500) {
        output.styles.push({ id, key: value.key, name: value.name, type: value.styleType || value.type, raw: value, path });
      }
      if (isVariableObject(value) && output.variables.length < 500) {
        output.variables.push({ id, name: value.name, key: value.key, valuesByMode: value.valuesByMode, path });
      }
      if (isComponentObject(value) && output.components.length < 800) {
        output.components.push({ id, key: value.key, name: value.name, type, description: value.description, path });
      }
      if (type === "CANVAS" && output.pages.length < 300) {
        output.pages.push({ id, name: value.name, children: value.children ? value.children.length : 0, path });
      }
      if (hints < MAX_HINTS) {
        for (const [key, item] of Object.entries(value)) {
          if (!isInterestingKey(key)) continue;
          hints += 1;
          if (item && typeof item === "object") visit(item, `${path}.${key}`, depth + 1);
        }
      }
      if (value.document) visit(value.document, `${path}.document`, depth + 1);
      if (value.nodes) visit(value.nodes, `${path}.nodes`, depth + 1);
      if (value.children) visit(value.children, `${path}.children`, depth + 1);
    };
  }

  function isDesignNode(type) {
    return ["DOCUMENT", "CANVAS", "FRAME", "GROUP", "SECTION", "COMPONENT", "COMPONENT_SET", "INSTANCE", "TEXT", "RECTANGLE", "ELLIPSE", "VECTOR", "LINE", "POLYGON", "STAR"].includes(type);
  }

  function extractDesignNode(value, path) {
    const box = value.absoluteBoundingBox || value.absoluteRenderBounds || null;
    return {
      id: value.id || value.key || null,
      name: value.name || null,
      type: value.type || null,
      path,
      box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height,
      fills: value.fills || [],
      strokes: value.strokes || [],
      effects: value.effects || [],
      cornerRadius: value.cornerRadius,
      rectangleCornerRadii: value.rectangleCornerRadii,
      opacity: value.opacity,
      layoutMode: value.layoutMode,
      itemSpacing: value.itemSpacing,
      paddingLeft: value.paddingLeft,
      paddingRight: value.paddingRight,
      paddingTop: value.paddingTop,
      paddingBottom: value.paddingBottom,
      componentId: value.componentId,
      characters: value.characters ? String(value.characters).slice(0, 500) : undefined,
      style: value.style || null
    };
  }

  function isStyleObject(value) {
    return Boolean(value && (value.styleType || value.style_type) &&
      (value.key || value.style_id) && (value.name || value.description));
  }

  function isVariableObject(value) {
    return Boolean(value && value.valuesByMode && (value.variableId || value.key || value.name));
  }

  function isComponentObject(value) {
    return Boolean(value && (value.componentKey || value.component_key) && value.name);
  }

  function isInterestingKey(key) {
    return /^(?:document|pages|nodes|children|components|componentSets|instances|styles|style|variables|collections|modes|paint|fills|strokes|effects|text|characters|absoluteBoundingBox|absoluteRenderBounds)$/.test(key);
  }

  function buildReport() {
    state.tasks = [];
    state.capturedAt = new Date().toISOString();
    state.url = location.href;
    state.fileKey = getFileKey(location.href);
    state.nodeId = getNodeId(location.href);
    state.permissions = safeCall("permissions", readPermission, "Permission indicators unavailable");
    state.dom = safeCall("dom", collectDom, "DOM unavailable");
    state.typography = safeCall("typography", collectTypography, "No visible text nodes");
    state.cssVariables = safeCall("cssVariables", collectCssVariables, "No readable CSS variables");
    state.canvas = safeCall("canvas", collectCanvas, "Canvas unavailable or tainted");
    state.realtime = state.realtime.slice(0, 160);
    state.figmaStylePanel = safeCall("figmaStylePanel", collectFigmaStylePanel, "Figma style panel unavailable");
    state.storage = safeCall("storage", () => collectStorage(), "Storage unavailable");
    state.indexedDB = safeCall("indexedDB", () => collectIndexedDB(), "IndexedDB unavailable");
    state.payload = safeCall("payload", collectPayloadHints, "No design payload captured");
    const domColors = safeCall("domColors", collectColorsFromDom, "No DOM colors");
    state.colors = {
      dom: domColors || [],
      canvas: (state.canvas?.items || []).flatMap(item => item.palette || [])
    };
    state.report = {
      schema: state.schema,
      meta: {
        capturedAt: state.capturedAt,
        url: state.url,
        fileKey: state.fileKey,
        nodeId: state.nodeId,
        title: document.title,
        userAgent: navigator.userAgent,
        localOnly: true
      },
      permissions: state.permissions,
      dom: state.dom,
      typography: state.typography,
      colors: state.colors,
      cssVariables: state.cssVariables,
      canvas: state.canvas,
      figmaStylePanel: state.figmaStylePanel,
      realtime: state.realtime,
      storage: state.storage,
      indexedDB: state.indexedDB,
      payload: state.payload,
      network: state.network.map(item => ({
        url: item.url,
        status: item.status,
        transport: item.transport,
        kind: item.kind,
        bytes: item.bytes,
        contentType: item.contentType,
        error: item.error || null
      })),
      capturedJson: state.network,
      tasks: state.tasks,
      warnings: state.warnings
    };
    return state.report;
  }

  function styleNode(styles) {
    const node = document.createElement("style");
    node.textContent = styles;
    return node;
  }

  function createUi() {
    if (document.getElementById("figma-design-reader")) return;
    const style = styleNode(`
      #figma-design-reader { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; width: 286px; padding: 12px; border: 1px solid #d7e0ec; border-radius: 8px; background: #fff; color: #17212b; box-shadow: 0 12px 30px rgba(15,23,42,.18); font: 12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif; }
      #figma-design-reader strong { display:block; margin-bottom:2px; font-size:13px; }
      #figma-design-reader small { display:block; margin-bottom:8px; color:#667085; }
      #figma-design-reader .fdr-row { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
      #figma-design-reader button { min-height:28px; border:1px solid #d7e0ec; border-radius:4px; background:#fff; color:#344054; font:inherit; cursor:pointer; }
      #figma-design-reader button.primary { border-color:#005bff; background:#005bff; color:#fff; }
      #figma-design-reader button:hover { filter:brightness(.98); }
      #figma-design-reader .fdr-log { max-height:180px; margin-top:8px; overflow:auto; white-space:pre-wrap; background:#f8fbff; border:1px solid #e4eaf3; border-radius:4px; padding:6px; color:#475467; }
      #figma-design-reader .fdr-close { position:absolute; top:6px; right:7px; width:22px; height:22px; border:0; background:transparent; color:#667085; }
    `);
    const panel = document.createElement("div");
    panel.id = "figma-design-reader";
    panel.innerHTML = `
      <button class="fdr-close" title="关闭">×</button>
      <strong>Figma Reader</strong>
      <small>本地只读采集；无权限项自动跳过</small>
      <div class="fdr-row">
        <button class="primary" data-action="collect">采集</button>
        <button data-action="copy">复制 JSON</button>
        <button data-action="download">下载 JSON</button>
        <button data-action="log">显示状态</button>
      </div>
      <div class="fdr-log" hidden></div>
    `;
    panel.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.classList.contains("fdr-close")) return panel.remove();
      const action = button.dataset.action;
      const log = panel.querySelector(".fdr-log");
      try {
        if (action === "collect") {
          buildReport();
          window.__FIGMA_DESIGN_READER__ = state.report;
          log.hidden = false;
          log.textContent = state.tasks.map(item => `${item.status === "ok" ? "✓" : "-"} ${item.name}: ${item.status === "ok" ? item.summary : item.reason}`).join("\n");
        } else if (action === "copy") {
          const report = state.report || buildReport();
          const text = JSON.stringify(report, null, 2);
          if (typeof GM_setClipboard === "function") GM_setClipboard(text, "text");
          else void navigator.clipboard.writeText(text);
          log.hidden = false;
          log.textContent = `已复制 ${text.length} 字符`;
        } else if (action === "download") {
          const report = state.report || buildReport();
          const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `figma-reader-${state.fileKey || "unknown"}-${Date.now()}.json`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } else if (action === "log") {
          log.hidden = !log.hidden;
          log.textContent = `${state.network.length} responses captured\n${state.tasks.map(item => `${item.name}: ${item.status}`).join("\n")}`;
        }
      } catch (error) {
        log.hidden = false;
        log.textContent = `操作失败：${error.message}`;
      }
    });
    document.documentElement.appendChild(style);
    document.body.appendChild(panel);
  }

  function watchUi() {
    clearInterval(uiTimer);
    uiTimer = setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        state.tasks.push({ name: "url", status: "ok", summary: location.href });
      }
      if (!document.getElementById("figma-design-reader")) createUi();
    }, 1000);
  }

  installNetworkHooks();
  installRealtimeHooks();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createUi, { once: true });
  else createUi();
  watchUi();

  window.__FIGMA_DESIGN_READER_STATE__ = state;
})();
