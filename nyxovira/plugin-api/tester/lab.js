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

  function sandboxBootstrap(config) {
    window.addEventListener("error", (event) => parent.postMessage({ channel: config.channel, type: "sandbox-error", error: event.message || "Erro ao iniciar o sandbox." }, "*"));
    window.addEventListener("unhandledrejection", (event) => parent.postMessage({ channel: config.channel, type: "sandbox-error", error: event.reason?.message || String(event.reason) }, "*"));
    const pending = new Map();
    let sequence = 0;
    let currentUrl = config.sourceUrl;

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
      let body = init.body;
      if (body instanceof URLSearchParams) body = body.toString();
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
        this.responseType = "";
        this.onreadystatechange = null;
        this.onload = null;
        this.onerror = null;
        this.headers = {};
      }
      open(method, url) {
        this.method = method;
        this.url = url;
        this.readyState = 1;
        this.onreadystatechange?.();
      }
      setRequestHeader(name, value) { this.headers[name] = value; }
      async send(body) {
        try {
          const response = await labFetch(this.url, { method: this.method, headers: this.headers, body });
          this.status = response.status;
          this.responseText = await response.text();
          this.response = this.responseType === "json" ? JSON.parse(this.responseText) : this.responseText;
          this.readyState = 4;
          this.onreadystatechange?.();
          this.onload?.();
          this.dispatchEvent(new Event("load"));
        } catch (error) {
          this.readyState = 4;
          this.onreadystatechange?.();
          this.onerror?.(error);
          this.dispatchEvent(new Event("error"));
        }
      }
      abort() {}
      getAllResponseHeaders() { return ""; }
      getResponseHeader() { return null; }
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

      for (const source of scripts) {
        if (source.type && !new Set(["text/javascript", "application/javascript", "module"]).has(source.type)) {
          const dataScript = document.createElement("script");
          for (const [name, value] of source.attributes) if (name !== "src") dataScript.setAttribute(name, value);
          dataScript.textContent = source.text;
          document.body.append(dataScript);
          continue;
        }
        if (source.type === "module") continue;
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
    }

    async function waitForPlan() {
      const started = Date.now();
      while (Date.now() - started < 15000) {
        try {
          const raw = window.__nyxoviraChapterPlan;
          const value = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (value && Array.isArray(value.chapters) && value.chapters.length) return value;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error("O plugin não produziu o plano de capítulos em 15 segundos.");
    }

    async function runPlugin(script) {
      try {
        const execute = new Function("window", "document", "location", "history", "fetch", "XMLHttpRequest", `"use strict";\n${script}\n`);
        execute(window, document, sourceLocation, labHistory, labFetch, LabXMLHttpRequest);
        let plan = await waitForPlan();
        const selectedChapterId = String(plan.chapters[0]?.id ?? "");
        const prepare = window.__nyxoviraPrepareDownloadPlan || window.Nyxovira?.prepareDownloadPlan;
        if (typeof prepare === "function") {
          const prepared = await prepare({ selectedChapterIds: [selectedChapterId], chapterPlan: plan });
          if (prepared) plan = typeof prepared === "string" ? JSON.parse(prepared) : prepared;
        }
        const fallback = window.__nyxoviraChapterPlan;
        if (!plan && fallback) plan = typeof fallback === "string" ? JSON.parse(fallback) : fallback;
        parent.postMessage({ channel: config.channel, type: "plugin-result", ok: true, plan: JSON.parse(JSON.stringify(plan)) }, "*");
      } catch (error) {
        parent.postMessage({ channel: config.channel, type: "plugin-result", ok: false, error: error?.message || String(error) }, "*");
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
      const timeout = setTimeout(() => finish(new Error(`O teste no navegador excedeu 30 segundos (estado: ${sandboxState}).`)), 30000);
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
        if (message.type === "frame-host-ready") {
          sandboxState = "host pronto";
          frame.contentWindow?.postMessage({
            channel,
            type: "bootstrap",
            source: `return (${sandboxBootstrap.toString()})(config);`,
            config: { channel, sourceUrl: prepared.page.url, html: prepared.page.html }
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
              headers: { "content-type": response.headers.get("content-type") || "application/octet-stream" },
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
      if (pages.length > maxPages) throw new Error(`O capítulo tem ${pages.length} páginas; o limite web é ${maxPages}.`);
      let totalBytes = 0;
      for (let index = 0; index < pages.length; index += 1) {
        const descriptor = typeof pages[index] === "string" ? { url: pages[index] } : pages[index];
        const target = new URL(descriptor?.url || descriptor?.src || descriptor?.image || descriptor?.imageUrl, prepared.page.url).href;
        const response = await proxyFetch(prepared.token, {
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
      contentSummary = `${pages.length} imagem(ns), ${totalBytes} bytes, baixadas e verificadas em memória.`;
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
