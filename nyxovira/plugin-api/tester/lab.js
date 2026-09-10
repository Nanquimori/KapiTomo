(() => {
  "use strict";

  const apiBase = "https://nyxovira-plugin-lab.nanquimori-kapitomo.workers.dev";
  const maxPages = 24;
  const maxChapterBytes = 24 * 1024 * 1024;
  const qs = (selector) => document.querySelector(selector);
  const status = qs("[data-service-status]");
  const statusLabel = qs("[data-service-label]");
  const form = qs("[data-test-form]");
  const zipInput = qs("#pluginZip");
  const workUrl = qs("#workUrl");
  const testButton = qs("[data-test-button]");
  const serviceError = qs("[data-service-error]");
  const progress = qs("[data-progress]");
  const resultCard = qs("[data-result-card]");
  const dropZone = qs("[data-drop-zone]");
  const fileLabel = qs("[data-file-label]");
  let lastResult = null;
  let serviceReady = false;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  })[char]);

  async function health() {
    try {
      const response = await fetch(`${apiBase}/health`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ready || body.execution !== "visitor-browser") throw new Error();
      serviceReady = true;
      status.classList.add("ready");
      status.classList.remove("offline");
      statusLabel.textContent = "Laboratório web disponível";
      testButton.disabled = false;
      serviceError.classList.add("hidden");
    } catch {
      serviceReady = false;
      status.classList.add("offline");
      status.classList.remove("ready");
      statusLabel.textContent = "Serviço web indisponível";
      testButton.disabled = true;
      serviceError.classList.remove("hidden");
    }
  }

  function setFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      fileLabel.textContent = "Selecione um arquivo .zip válido.";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      fileLabel.textContent = "O ZIP excede o limite de 2 MiB.";
      zipInput.value = "";
      return;
    }
    if (typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      zipInput.files = transfer.files;
    }
    fileLabel.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KiB`;
  }

  function render(result) {
    lastResult = result;
    resultCard.classList.remove("hidden");
    const report = result.report || {};
    const valid = report.success === true;
    const verdict = qs("[data-verdict]");
    verdict.textContent = report.verdict || "PLUGIN_INVALID";
    verdict.className = `verdict ${valid ? "valid" : "invalid"}`;
    qs("[data-work-summary]").textContent = [report.pluginId, report.workTitle].filter(Boolean).join(" · ") || "Diagnóstico concluído.";
    const cleanup = qs("[data-cleanup]");
    const released = result.temporaryDataReleased === true && result.stored === false;
    cleanup.textContent = released
      ? "ZIP, navegação e conteúdo foram descartados ao terminar o teste."
      : "O descarte dos dados temporários não foi confirmado.";
    cleanup.classList.toggle("bad", !released);
    const error = qs("[data-result-error]");
    error.textContent = report.error || "";
    error.classList.toggle("hidden", !error.textContent);
    qs("[data-steps]").innerHTML = (report.steps || []).map((item) => (
      `<article class="step"><span class="badge ${escapeHtml(String(item.status || "info").toLowerCase())}">${escapeHtml(item.status || "INFO")}</span><div><strong>${escapeHtml(item.key || "etapa")}</strong><p>${escapeHtml(item.detail || "")}</p></div></article>`
    )).join("");
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function proxyFetch(token, input) {
    const response = await fetch(`${apiBase}/proxy`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-lab-token": token },
      body: JSON.stringify(input),
      cache: "no-store"
    });
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    if (!response.ok && contentType.includes("application/json")) {
      const body = await response.json();
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    return response;
  }

  async function mediaFetch(token, input) {
    const response = await fetch(`${apiBase}/media`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-lab-token": token },
      body: JSON.stringify(input),
      cache: "no-store"
    });
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    if (!response.ok && contentType.includes("application/json")) {
      const body = await response.json();
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    return response;
  }

  function sandboxBootstrap(config) {
    const describeError = (value, fallback) => {
      if (value?.message) return String(value.message);
      if (value?.reason?.message) return String(value.reason.message);
      if (value?.type) return String(value.type);
      const text = String(value || "").trim();
      return text && text !== "[object Event]" && text !== "[object PromiseRejectionEvent]" ? text : fallback;
    };
    window.addEventListener("error", (event) => parent.postMessage({
      channel: config.channel,
      type: "source-warning",
      warning: describeError(event.error || event, "A página da fonte emitiu um erro de script.")
    }, "*"));
    window.addEventListener("unhandledrejection", (event) => parent.postMessage({
      channel: config.channel,
      type: "source-warning",
      warning: describeError(event.reason || event, "A página da fonte rejeitou uma operação interna.")
    }, "*"));
    const pending = new Map();
    const synchronousResponses = new Map();
    let sequence = 0;
    let currentUrl = config.sourceUrl;
    let missingSynchronousUrl = "";
    const executionTrace = [];

    const normalizeHeaders = (headers) => {
      if (!headers) return {};
      if (headers instanceof Headers) return Object.fromEntries(headers.entries());
      if (Array.isArray(headers)) return Object.fromEntries(headers);
      return { ...headers };
    };

    const labFetch = (input, init = {}) => new Promise((resolve, reject) => {
      const id = `${Date.now()}-${++sequence}`;
      const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      const method = String(init.method || input?.method || "GET").toUpperCase();
      const headers = normalizeHeaders(init.headers || input?.headers);
      if (!Object.keys(headers).some((name) => name.toLowerCase() === "referer")) headers.Referer = currentUrl;
      let body = init.body;
      if (body instanceof URLSearchParams) body = body.toString();
      if (body == null) body = undefined;
      if (body !== undefined && typeof body !== "string") return reject(new Error("Este corpo de requisição não é compatível com o teste web."));
      pending.set(id, { resolve, reject });
      parent.postMessage({ channel: config.channel, type: "proxy-request", id, request: { url: new URL(rawUrl, currentUrl).href, method, headers, body } }, "*");
    });

    window.addEventListener("message", (event) => {
      if (event.source !== parent || event.data?.channel !== config.channel) return;
      const message = event.data;
      if (message.type === "proxy-response") {
        const task = pending.get(message.id);
        if (!task) return;
        pending.delete(message.id);
        if (!message.ok) return task.reject(new Error(message.error || "A requisição do plugin falhou."));
        task.resolve(new Response(message.buffer, { status: message.status, headers: message.headers }));
      }
      if (message.type === "run-plugin") runPlugin(message.script);
    });

    class LabXMLHttpRequest extends EventTarget {
      constructor() {
        super();
        this.readyState = 0;
        this.status = 0;
        this.responseText = "";
        this.response = "";
        this.responseURL = "";
        this.responseType = "";
        this.onreadystatechange = null;
        this.onload = null;
        this.onerror = null;
        this.headers = {};
        this.responseHeaders = {};
        this.async = true;
      }
      open(method, url, async = true) {
        this.method = method;
        this.url = url;
        this.responseURL = "";
        this.async = async !== false;
        this.readyState = 1;
        this.onreadystatechange?.();
      }
      setRequestHeader(name, value) { this.headers[name] = value; }
      complete(cached) {
        this.status = cached.status;
        this.responseText = cached.text;
        this.responseHeaders = cached.headers || {};
        this.responseURL = cached.finalUrl || new URL(this.url, currentUrl).href;
        this.response = this.responseType === "json" ? JSON.parse(this.responseText) : this.responseText;
        this.readyState = 4;
        this.onreadystatechange?.();
        this.onload?.();
        this.dispatchEvent(new Event("load"));
      }
      send(body) {
        const absoluteUrl = new URL(this.url, currentUrl).href;
        if (!this.async) {
          const cached = synchronousResponses.get(absoluteUrl);
          if (!cached) {
            missingSynchronousUrl = absoluteUrl;
            executionTrace.push("sync-request:" + absoluteUrl);
            throw new Error(`A resposta síncrona ainda não foi preparada: ${absoluteUrl}`);
          }
          this.complete(cached);
          return;
        }
        this.sendAsync(body);
      }
      async sendAsync(body) {
        try {
          const response = await labFetch(this.url, { method: this.method, headers: this.headers, body });
          const headers = Object.fromEntries(response.headers.entries());
          this.complete({ status: response.status, text: await response.text(), headers, finalUrl: response.headers.get("x-lab-final-url") || "" });
        } catch (error) {
          this.readyState = 4;
          this.onreadystatechange?.();
          this.onerror?.(error);
          this.dispatchEvent(new Event("error"));
        }
      }
      abort() {}
      getAllResponseHeaders() { return Object.entries(this.responseHeaders).map(([name, value]) => `${name}: ${value}`).join("\r\n"); }
      getResponseHeader(name) { return this.responseHeaders[String(name).toLowerCase()] || null; }
    }

    window.fetch = labFetch;
    window.XMLHttpRequest = LabXMLHttpRequest;
    window.open = () => null;

    const sourceLocation = new Proxy({}, {
      get(_target, property) {
        const parsed = new URL(currentUrl);
        if (property === "assign" || property === "replace") return (next) => { currentUrl = new URL(next, currentUrl).href; };
        if (property === "reload") return () => {};
        if (property === "toString" || property === "valueOf") return () => currentUrl;
        return parsed[property];
      },
      set(_target, property, value) {
        const parsed = new URL(currentUrl);
        parsed[property] = value;
        currentUrl = parsed.href;
        return true;
      }
    });
    const labHistory = {
      pushState(_state, _unused, next) { if (next) currentUrl = new URL(next, currentUrl).href; },
      replaceState(_state, _unused, next) { if (next) currentUrl = new URL(next, currentUrl).href; },
      back() {}, forward() {}, go() {}, length: 1, state: null
    };
    let sourceWindow;
    sourceWindow = new Proxy(window, {
      get(target, property) {
        if (property === "location") return sourceLocation;
        if (property === "history") return labHistory;
        if (property === "fetch") return labFetch;
        if (property === "XMLHttpRequest") return LabXMLHttpRequest;
        if (property === "window" || property === "self" || property === "globalThis") return sourceWindow;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, property, value) {
        return Reflect.set(target, property, value, target);
      }
    });

    const toBase64Url = (value) => btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
    const sourceModuleUrl = (rawUrl) => {
      const target = new URL(rawUrl, currentUrl);
      return `${config.apiBase}/source/${encodeURIComponent(config.token)}/${toBase64Url(target.origin)}${target.pathname}${target.search}`;
    };

    async function loadModule(source) {
      if (!source.src && !source.text.trim()) return;
      await new Promise((resolve, reject) => {
        const module = document.createElement("script");
        module.type = "module";
        if (source.src) module.src = sourceModuleUrl(source.src);
        else module.textContent = source.text;
        module.addEventListener("load", resolve, { once: true });
        module.addEventListener("error", () => reject(new Error(`Não foi possível executar o módulo da fonte: ${source.src || "inline"}`)), { once: true });
        document.body.append(module);
        if (!source.src) setTimeout(resolve, 0);
      });
    }

    async function waitForDynamicRender(initialMarkup) {
      const started = Date.now();
      let lastMutation = started;
      const observer = new MutationObserver(() => { lastMutation = Date.now(); });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
      try {
        while (Date.now() - started < 12000) {
          const changed = document.body.innerHTML !== initialMarkup;
          const minimumElapsed = Date.now() - started >= 2500;
          const settled = Date.now() - lastMutation >= 800;
          if (changed && minimumElapsed && settled) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } finally {
        observer.disconnect();
      }
    }

    async function installSourceDocument() {
      const parsed = new DOMParser().parseFromString(config.html, "text/html");
      parsed.querySelectorAll("base, meta[http-equiv='Content-Security-Policy' i], meta[http-equiv='refresh' i], iframe, frame, object, embed").forEach((node) => node.remove());
      const scripts = [...parsed.querySelectorAll("script")].map((node) => ({
        src: node.getAttribute("src") || "",
        type: String(node.getAttribute("type") || "").toLowerCase(),
        text: node.textContent || "",
        attributes: [...node.attributes].map((attribute) => [attribute.name, attribute.value])
      }));
      parsed.querySelectorAll("script").forEach((node) => node.remove());
      document.documentElement.lang = parsed.documentElement.lang || "pt-BR";
      document.title = parsed.title || "Nyxovira Plugin Lab";
      document.body.innerHTML = parsed.body.innerHTML;
      const initialMarkup = document.body.innerHTML;
      const sourcePage = new URL(currentUrl);
      history.replaceState(null, "", `${sourcePage.pathname}${sourcePage.search}`);
      let loadedModule = false;

      for (const source of scripts) {
        if (source.type && !new Set(["text/javascript", "application/javascript", "module"]).has(source.type)) {
          const dataScript = document.createElement("script");
          for (const [name, value] of source.attributes) if (name !== "src") dataScript.setAttribute(name, value);
          dataScript.textContent = source.text;
          document.body.append(dataScript);
          continue;
        }
        if (source.type === "module") {
          await loadModule(source);
          loadedModule = true;
          continue;
        }
        try {
          let code = source.text;
          if (source.src) {
            const response = await labFetch(new URL(source.src, currentUrl).href);
            if (!response.ok) continue;
            code = await response.text();
          }
          if (code.trim()) {
            const executeSource = new Function("window", "document", "location", "history", "fetch", "XMLHttpRequest", `${code}\n`);
            executeSource(window, document, sourceLocation, labHistory, labFetch, LabXMLHttpRequest);
          }
        } catch {}
      }
      if (loadedModule) await waitForDynamicRender(initialMarkup);
    }

    function normalizeSourceUrl(rawUrl) {
      if (!String(rawUrl || "").trim()) return "";
      try {
        const value = new URL(String(rawUrl || ""), currentUrl);
        const source = new URL(currentUrl);
        if (value.origin === location.origin && value.origin !== source.origin) {
          value.protocol = source.protocol;
          value.host = source.host;
        }
        return value.href;
      } catch {
        return String(rawUrl || "").trim();
      }
    }

    function buildNyxoviraPagePlan() {
      try {
        const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
        const absolute = (value) => normalizeSourceUrl(clean(value));
        const numberFrom = (value) => {
          const match = String(value || "").match(/(?:chapter|cap(?:itulo|ítulo)?)?\s*#?\s*(\d+(?:[.,]\d+)?)/i);
          return match ? match[1].replace(",", ".") : "";
        };
        const title = clean(document.querySelector("h1")?.textContent || document.title || "Obra");
        const socialCover = document.querySelector(
          "meta[property='og:image'],meta[name='og:image'],meta[property='twitter:image'],meta[name='twitter:image']"
        )?.getAttribute("content") || "";
        let coverUrl = absolute(socialCover);
        if (!coverUrl) {
          const image = [...document.querySelectorAll("img")].find((node) => {
            const description = [
              node.getAttribute("alt"),
              node.getAttribute("src"),
              node.getAttribute("data-src"),
              node.className
            ].map(clean).join(" ").toLowerCase();
            return description.includes("cover") || description.includes("capa") || description.includes(title.toLowerCase());
          });
          coverUrl = absolute(image?.getAttribute("src") || image?.getAttribute("data-src") || "");
        }

        const chapters = [];
        const add = (item) => {
          if (!item || typeof item !== "object") return;
          const rawId = item.id ?? item.chapterId ?? item.slug ?? "";
          let number = clean(item.number ?? item.chapter ?? numberFrom(item.title || ""));
          if (rawId === "" && !number) return;
          if (!number) number = String(chapters.length + 1);
          const rawUrl = item.url ?? item.href ?? item.link ?? item.path ?? item.permalink ?? item.canonicalUrl ?? "";
          const url = absolute(rawUrl);
          const key = String(rawId || number);
          const existing = chapters.find((chapter) => chapter._key === key);
          if (existing) {
            if (!existing.url && url) existing.url = url;
            return;
          }
          const itemTitle = clean(item.title || "");
          chapters.push({
            _key: key,
            id: "id:" + key,
            number,
            label: "Cap " + number + (itemTitle ? " - " + itemTitle : ""),
            url,
            index: chapters.length
          });
        };
        const looksLikeChapterArray = (value) => Array.isArray(value)
          && value.length > 0
          && value[0]
          && typeof value[0] === "object"
          && "id" in value[0]
          && ("number" in value[0] || "title" in value[0]);
        const scanObjectGraph = (root) => {
          const stack = [root];
          const visited = new Set();
          let best = null;
          let limit = 0;
          while (stack.length && limit++ < 12000) {
            const value = stack.pop();
            if (!value || typeof value !== "object" || visited.has(value)) continue;
            visited.add(value);
            if (looksLikeChapterArray(value) && (!best || value.length > best.length)) best = value;
            if (looksLikeChapterArray(value.chapters) && (!best || value.chapters.length > best.length)) best = value.chapters;
            let keys;
            try { keys = Object.keys(value); } catch { continue; }
            for (const key of keys.slice(0, 80)) {
              if (["stateNode", "child", "sibling", "return", "alternate"].includes(key)) continue;
              try {
                const child = value[key];
                if (child && typeof child === "object") stack.push(child);
              } catch {}
            }
          }
          return best;
        };
        for (const element of [document.body, ...document.querySelectorAll("*")].slice(0, 600)) {
          let keys = [];
          try { keys = Object.keys(element); } catch {}
          for (const key of keys) {
            if (!key.startsWith("__reactFiber$") && !key.startsWith("__reactProps$")) continue;
            const found = scanObjectGraph(element[key]);
            if (found?.length) {
              found.forEach(add);
              break;
            }
          }
          if (chapters.length) break;
        }

        for (const anchor of document.querySelectorAll("a[href]")) {
          const href = absolute(anchor.getAttribute("href") || anchor.href || "");
          if (!href) continue;
          let path = "";
          try { path = new URL(href).pathname; } catch { path = href; }
          const lower = path.toLowerCase();
          const label = clean(anchor.textContent || anchor.getAttribute("title") || anchor.getAttribute("aria-label") || "");
          if (!lower.includes("/chapter/")
              && !lower.includes("/read/")
              && !lower.startsWith("/r/")
              && !(lower.includes("/view/") && (lower.includes("/ch-") || numberFrom(label)))) continue;
          const parts = path.split("/").filter(Boolean);
          if (parts.length < 2) continue;
          const last = parts.at(-1);
          const previous = parts.at(-2) || "";
          const id = /^\d+$/.test(last) ? last : (/^\d+$/.test(previous) ? previous : (numberFrom(last) || last));
          const number = numberFrom(label) || numberFrom(last) || numberFrom(previous) || String(chapters.length + 1);
          add({ id, number, title: label, url: href });
        }

        const byNumber = new Map();
        for (const chapter of chapters) {
          const key = String(chapter.number || chapter._key || chapter.id);
          const previous = byNumber.get(key);
          if (!previous || (!previous.url && chapter.url) || (String(chapter.label).length > String(previous.label).length && chapter.url)) {
            byNumber.set(key, chapter);
          }
        }
        const deduplicated = [...byNumber.values()]
          .sort((left, right) => {
            const a = Number.parseFloat(left.number);
            const b = Number.parseFloat(right.number);
            return (Number.isNaN(a) ? 999999 : a) - (Number.isNaN(b) ? 999999 : b);
          })
          .map((chapter, index) => {
            const value = { ...chapter, index };
            delete value._key;
            return value;
          });
        if (!deduplicated.length) return null;
        return { title, canonicalUrl: currentUrl, coverUrl, chapters: deduplicated };
      } catch {
        return null;
      }
    }

    function readPluginPlan() {
      try {
        const raw = window.__nyxoviraChapterPlan;
        const value = typeof raw === "string" ? JSON.parse(raw) : raw;
        return value && Array.isArray(value.chapters) && value.chapters.length ? value : null;
      } catch {
        return null;
      }
    }

    function activateChapterList() {
      const candidate = [...document.querySelectorAll("button,[role='tab'],a")].find((node) => {
        const label = String(node.textContent || node.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
        return /^(cap[ií]tulos?|chapters?)\b/i.test(label);
      });
      if (!candidate) return false;
      candidate.click();
      return true;
    }

    async function waitForPlan() {
      const started = Date.now();
      let chapterListActivated = false;
      while (Date.now() - started < 15000) {
        const pluginPlan = readPluginPlan();
        if (pluginPlan) return pluginPlan;
        const nativePlan = buildNyxoviraPagePlan();
        if (nativePlan) {
          window.__nyxoviraChapterPlan = JSON.stringify(nativePlan);
          return nativePlan;
        }
        if (!chapterListActivated && Date.now() - started >= 2500) chapterListActivated = activateChapterList();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const diagnostic = Object.getOwnPropertyNames(window)
        .filter((name) => /(?:last|plugin).*error$/i.test(name))
        .map((name) => {
          try { return String(window[name] || "").trim(); } catch { return ""; }
        })
        .find(Boolean);
      const rendered = String(document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 180);
      const detail = diagnostic || (rendered ? `A fonte renderizou "${rendered}".` : "A página dinâmica permaneceu sem conteúdo.");
      throw new Error(`O Nyxovira não encontrou capítulos em 15 segundos. ${detail}`);
    }

    async function primeSynchronousResponse(rawUrl) {
      if (!rawUrl) return;
      const absoluteUrl = new URL(rawUrl, currentUrl).href;
      if (synchronousResponses.has(absoluteUrl)) return;
      const response = await labFetch(absoluteUrl, { headers: { Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" } });
      synchronousResponses.set(absoluteUrl, {
        status: response.status,
        text: await response.text(),
        headers: Object.fromEntries(response.headers.entries()),
        finalUrl: response.headers.get("x-lab-final-url") || absoluteUrl
      });
      executionTrace.push("sync-ready:" + absoluteUrl);
    }

    async function runWithSynchronousPriming(action) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        missingSynchronousUrl = "";
        let value;
        let failure;
        try {
          value = await action();
        } catch (error) {
          failure = error;
        }
        const requestedUrl = missingSynchronousUrl;
        if (requestedUrl) {
          await primeSynchronousResponse(requestedUrl);
          continue;
        }
        if (failure) throw failure;
        return value;
      }
      throw new Error("O plugin excedeu o limite de respostas síncronas preparadas pelo laboratório.");
    }

    async function runPlugin(script) {
      try {
        const execute = new Function(
          "window",
          "document",
          "location",
          "history",
          "fetch",
          "XMLHttpRequest",
          "globalThis",
          "self",
          `"use strict";\nreturn eval(${JSON.stringify(script)});`
        );
        const resolvedTarget = await runWithSynchronousPriming(
          () => Promise.resolve(execute(
            sourceWindow,
            document,
            sourceLocation,
            labHistory,
            labFetch,
            LabXMLHttpRequest,
            sourceWindow,
            sourceWindow
          ))
        );
        if (typeof resolvedTarget === "string" && /^https?:\/\//i.test(resolvedTarget)) {
          currentUrl = resolvedTarget;
        }
        executionTrace.push("target:" + (String(resolvedTarget || "") || "empty"));
        executionTrace.push("plugin-plan:" + (readPluginPlan() ? "yes" : "no"));
        let plan = await waitForPlan();
        executionTrace.push("chapter:" + String(plan.chapters[0]?.id ?? ""));
        const selectedChapterId = String(plan.chapters[0]?.id ?? "");
        const selectedChapter = plan.chapters.find((chapter) => String(chapter?.id ?? "") === selectedChapterId);
        const prepare = window.__nyxoviraPrepareDownloadPlan || window.Nyxovira?.prepareDownloadPlan;
        if (typeof prepare === "function") {
          const prepared = await runWithSynchronousPriming(
            () => Promise.resolve(prepare({ selectedChapterIds: [selectedChapterId], chapterPlan: plan }))
          );
          if (prepared) plan = typeof prepared === "string" ? JSON.parse(prepared) : prepared;
        }
        const fallback = window.__nyxoviraChapterPlan;
        if (!plan && fallback) plan = typeof fallback === "string" ? JSON.parse(fallback) : fallback;
        parent.postMessage({ channel: config.channel, type: "plugin-result", ok: true, plan: JSON.parse(JSON.stringify(plan)), trace: executionTrace }, "*");
      } catch (error) {
        parent.postMessage({ channel: config.channel, type: "plugin-result", ok: false, error: error?.message || String(error), trace: executionTrace }, "*");
      }
    }

    installSourceDocument()
      .then(() => parent.postMessage({ channel: config.channel, type: "sandbox-ready" }, "*"))
      .catch((error) => parent.postMessage({ channel: config.channel, type: "sandbox-error", error: error?.message || String(error) }, "*"));
  }

  function executeInSandbox(prepared) {
    return new Promise((resolve, reject) => {
      const channel = crypto.randomUUID();
      const frame = document.createElement("iframe");
      frame.sandbox = "allow-scripts allow-same-origin";
      frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:0;opacity:0;pointer-events:none;border:0";
      frame.setAttribute("aria-hidden", "true");
      let sandboxState = "criado";
      const timeout = setTimeout(() => finish(new Error(`O teste no navegador excedeu 60 segundos (estado: ${sandboxState}).`)), 60000);
      let started = false;

      function startPlugin() {
        if (started) return;
        started = true;
        sandboxState = "plugin enviado";
        setTimeout(() => frame.contentWindow?.postMessage({ channel, type: "run-plugin", script: prepared.plugin.script }, "*"), 900);
      }

      function finish(error, value) {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        frame.remove();
        if (error) reject(error);
        else resolve(value);
      }

      async function onMessage(event) {
        if (event.source !== frame.contentWindow || event.data?.channel !== channel) return;
        const message = event.data;
        if (message.type === "sandbox-error") return finish(new Error(message.error || "O sandbox não pôde ser iniciado."));
        if (message.type === "source-warning") {
          sandboxState = "página carregada com aviso";
          return;
        }
        if (message.type === "frame-host-ready") {
          sandboxState = "host pronto";
          frame.contentWindow?.postMessage({
            channel,
            type: "bootstrap",
            source: `return (${sandboxBootstrap.toString()})(config);`,
            config: { channel, sourceUrl: prepared.page.url, html: prepared.page.html, apiBase, token: prepared.token }
          }, new URL(apiBase).origin);
          return;
        }
        if (message.type === "sandbox-ready") {
          sandboxState = "sandbox pronto";
          return startPlugin();
        }
        if (message.type === "proxy-request") {
          sandboxState = "proxy em andamento";
          try {
            const response = await proxyFetch(prepared.token, message.request);
            const buffer = await response.arrayBuffer();
            frame.contentWindow?.postMessage({
              channel,
              type: "proxy-response",
              id: message.id,
              ok: true,
              status: response.status,
              headers: {
                "content-type": response.headers.get("content-type") || "application/octet-stream",
                "x-lab-final-url": response.headers.get("x-lab-final-url") || message.request.url
              },
              buffer
            }, "*", [buffer]);
          } catch (error) {
            frame.contentWindow?.postMessage({ channel, type: "proxy-response", id: message.id, ok: false, error: error?.message || String(error) }, "*");
          }
          return;
        }
        if (message.type === "plugin-result") {
          sandboxState = "resultado recebido";
          if (message.ok) finish(null, message.plan);
          else finish(new Error(message.error || "O plugin não produziu um resultado."));
        }
      }

      window.addEventListener("message", onMessage);
      frame.addEventListener("load", () => { if (sandboxState === "criado") sandboxState = "frame carregado sem mensagem"; });
      frame.src = `${apiBase}/frame#${encodeURIComponent(channel)}`;
      document.body.append(frame);
    });
  }

  function imageLooksValid(bytes, contentType) {
    const head = new Uint8Array(bytes.slice(0, 12));
    if (contentType.includes("png")) return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
    if (contentType.includes("webp")) return String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP";
    if (contentType.includes("gif")) return String.fromCharCode(...head.slice(0, 3)) === "GIF";
    return head[0] === 0xff && head[1] === 0xd8;
  }

  async function validatePlan(prepared, plan) {
    const steps = [...(prepared.report?.steps || [])];
    if (!String(plan?.title || "").trim()) throw new Error("O plano não informou o título da obra.");
    if (!Array.isArray(plan.chapters) || !plan.chapters.length) throw new Error("O plano não contém capítulos.");
    const chapterIds = plan.chapters.map((chapter) => String(chapter?.id ?? ""));
    if (chapterIds.some((id) => !id) || new Set(chapterIds).size !== chapterIds.length) throw new Error("Os capítulos têm IDs vazios ou duplicados.");
    const selectedChapterId = chapterIds[0];
    const chapter = plan.chapters.find((item) => String(item?.id ?? "") === selectedChapterId);
    if (!chapter) throw new Error("O ID do primeiro capítulo mudou durante a preparação.");
    steps.push({ key: "obra", status: "PASS", detail: `${plan.title}: ${plan.chapters.length} capítulo(s); o primeiro foi escolhido automaticamente.` });
    steps.push({ key: "seleção", status: "PASS", detail: `Capítulo ${selectedChapterId} preparado sem alterar o ID.` });

    const paragraphs = Array.isArray(chapter.paragraphs) ? chapter.paragraphs.map(String).filter((text) => text.trim()) : [];
    const pages = Array.isArray(chapter.pages) ? chapter.pages : (Array.isArray(chapter.images) ? chapter.images : []);
    let contentSummary;
    if (paragraphs.length) {
      const reopened = JSON.parse(JSON.stringify({ paragraphs }));
      if (reopened.paragraphs.length !== paragraphs.length) throw new Error("O capítulo de texto não pôde ser reaberto em memória.");
      contentSummary = `${paragraphs.length} parágrafo(s) serializados e reabertos em memória.`;
    } else if (pages.length) {
      const testedPages = pages.slice(0, maxPages);
      let totalBytes = 0;
      for (let index = 0; index < testedPages.length; index += 1) {
        const descriptor = typeof testedPages[index] === "string" ? { url: testedPages[index] } : testedPages[index];
        const target = new URL(descriptor?.url || descriptor?.src || descriptor?.image || descriptor?.imageUrl, prepared.page.url).href;
        const response = await mediaFetch(prepared.token, {
          url: target,
          method: "GET",
          headers: { Referer: chapter.url || prepared.page.url, ...(descriptor.headers || {}) }
        });
        if (!response.ok) throw new Error(`Página ${index + 1} respondeu HTTP ${response.status}.`);
        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.startsWith("image/")) throw new Error(`Página ${index + 1} não retornou uma imagem.`);
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength || !imageLooksValid(bytes, contentType)) throw new Error(`Página ${index + 1} retornou uma imagem inválida.`);
        totalBytes += bytes.byteLength;
        if (totalBytes > maxChapterBytes) throw new Error("O capítulo excedeu o limite web de 24 MiB.");
      }
      contentSummary = pages.length > testedPages.length
        ? `${pages.length} imagem(ns) resolvidas; as primeiras ${testedPages.length} (${totalBytes} bytes) foram baixadas e verificadas em memória.`
        : `${pages.length} imagem(ns), ${totalBytes} bytes, baixadas e verificadas em memória.`;
    } else {
      throw new Error("O primeiro capítulo não resolveu páginas nem parágrafos.");
    }
    steps.push({ key: "conteúdo", status: "PASS", detail: contentSummary });
    steps.push({ key: "conclusão", status: "PASS", detail: "O plugin passou nesta obra e no primeiro capítulo testado." });
    return {
      report: {
        schemaVersion: 3,
        verdict: "PLUGIN_VALID",
        success: true,
        pluginId: prepared.plugin.id,
        workUrl: prepared.page.url,
        workTitle: plan.title,
        selectedChapterId,
        chapterCount: plan.chapters.length,
        steps
      },
      temporaryDataReleased: true,
      stored: false
    };
  }

  zipInput.addEventListener("change", () => setFile(zipInput.files[0]));
  for (const name of ["dragenter", "dragover"]) dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("drag"); });
  for (const name of ["dragleave", "drop"]) dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("drag"); });
  dropZone.addEventListener("drop", (event) => setFile(event.dataTransfer.files[0]));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = zipInput.files[0];
    if (!file) return zipInput.focus();
    testButton.disabled = true;
    progress.classList.remove("hidden");
    resultCard.classList.add("hidden");
    let prepared;
    try {
      const query = new URLSearchParams({ workUrl: workUrl.value.trim() });
      const response = await fetch(`${apiBase}/prepare?${query}`, {
        method: "POST",
        headers: { "content-type": "application/zip" },
        body: file,
        cache: "no-store"
      });
      prepared = await response.json();
      if (!response.ok || !prepared.prepared) throw new Error(prepared.report?.error || prepared.error || `HTTP ${response.status}`);
      const plan = await executeInSandbox(prepared);
      render(await validatePlan(prepared, plan));
    } catch (error) {
      const steps = [...(prepared?.report?.steps || [])];
      steps.push({ key: "diagnóstico", status: "FAIL", detail: error?.message || String(error) });
      render({
        report: {
          schemaVersion: 3,
          verdict: "PLUGIN_INVALID",
          success: false,
          pluginId: prepared?.plugin?.id,
          workUrl: prepared?.page?.url || workUrl.value.trim(),
          error: error?.message || String(error),
          steps
        },
        temporaryDataReleased: true,
        stored: false
      });
    } finally {
      prepared = null;
      progress.classList.add("hidden");
      testButton.disabled = !serviceReady;
    }
  });

  qs("[data-clear-button]").addEventListener("click", () => {
    form.reset();
    lastResult = null;
    fileLabel.textContent = "Máximo de 2 MiB. Arraste o ZIP para esta área ou selecione o arquivo.";
    resultCard.classList.add("hidden");
  });
  qs("[data-copy-report]").addEventListener("click", async () => {
    if (!lastResult) return;
    await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
    qs("[data-copy-report]").textContent = "Relatório copiado";
    setTimeout(() => { qs("[data-copy-report]").textContent = "Copiar relatório"; }, 1600);
  });
  qs("[data-download-report]").addEventListener("click", () => {
    if (!lastResult) return;
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(lastResult, null, 2)}\n`], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nyxovira-plugin-report.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  health();
})();
