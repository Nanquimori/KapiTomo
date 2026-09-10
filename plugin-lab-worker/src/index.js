import { launch } from "@cloudflare/playwright";
import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";

const SITE_ORIGIN = "https://nanquimori.github.io";
const MAX_ZIP_BYTES = 2 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 8 * 1024 * 1024;
const MAX_ENTRY_BYTES = 1024 * 1024;
const MAX_ENTRIES = 40;
const MAX_PAGES = 24;
const MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024;
const MAX_BROWSER_REQUESTS = 160;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const WEBVIEW_USER_AGENT = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36";

class WebEnvironmentBlockedError extends Error {
  constructor(status, detail) {
    super(detail);
    this.name = "WebEnvironmentBlockedError";
    this.status = status;
    this.code = "WEB_ENVIRONMENT_BLOCKED";
  }
}

const corsHeaders = (request) => {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin === SITE_ORIGIN ? origin : SITE_ORIGIN,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
};

function json(request, value, status = 200) {
  return new Response(`${JSON.stringify(value, null, 2)}\n`, {
    status,
    headers: { ...corsHeaders(request), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function fail(message, status = 422, steps = []) {
  return {
    status,
    payload: {
      report: {
        schemaVersion: 2,
        verdict: "PLUGIN_INVALID",
        success: false,
        error: message,
        steps
      },
      temporaryDataReleased: true,
      stored: false
    }
  };
}

function step(steps, key, status, detail) {
  steps.push({ key, status, detail });
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

function assertPublicHttpUrl(raw, label = "URL") {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} inválida.`);
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error(`${label}: somente HTTP e HTTPS são permitidos.`);
  if (parsed.username || parsed.password) throw new Error(`${label}: credenciais embutidas não são permitidas.`);
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error(`${label}: destinos locais ou privados são bloqueados.`);
  }
  if (isPrivateIpv4(host) || host === "::" || host === "::1" || /^(?:fc|fd|fe8|fe9|fea|feb)/i.test(host)) {
    throw new Error(`${label}: destinos locais ou privados são bloqueados.`);
  }
  return parsed;
}

function safeZipPath(raw) {
  const name = String(raw || "").replaceAll("\\", "/");
  if (!name || name.startsWith("/") || /^[a-z]:/i.test(name) || name.includes("\0")) throw new Error("O ZIP contém um caminho inválido.");
  const parts = name.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) throw new Error(`O ZIP contém um caminho inseguro: ${name}`);
  return parts.join("/");
}

function assertManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("plugin.json precisa conter um objeto JSON.");
  if (manifest.id !== undefined && !/^[a-z0-9][a-z0-9._-]*$/.test(String(manifest.id))) throw new Error("plugin.json: id inválido.");
  const hosts = manifest.match?.hosts;
  if (!Array.isArray(hosts) || !hosts.length || hosts.some((host) => !/^[A-Za-z0-9.-]+$/.test(String(host)))) {
    throw new Error("plugin.json: match.hosts precisa conter ao menos um domínio válido.");
  }
  assertPublicHttpUrl(manifest.browser?.home_url, "plugin.json browser.home_url");
  const script = manifest.browser?.download_target_script_file;
  if (!script || typeof script !== "string") throw new Error("Este teste web exige browser.download_target_script_file.");
  safeZipPath(script);
  return hosts.map((host) => String(host).toLowerCase());
}

function hostMatches(hostname, hosts) {
  const current = hostname.toLowerCase();
  return hosts.some((host) => current === host || current.endsWith(`.${host}`));
}

async function readPluginZip(bytes) {
  const reader = new ZipReader(new BlobReader(new Blob([bytes])));
  try {
    const allEntries = await reader.getEntries();
    const entries = allEntries.filter((entry) => !entry.directory);
    if (!entries.length) throw new Error("O ZIP está vazio.");
    if (entries.length > MAX_ENTRIES) throw new Error(`O ZIP excede o limite de ${MAX_ENTRIES} arquivos.`);
    let expanded = 0;
    const files = new Map();
    for (const entry of entries) {
      const name = safeZipPath(entry.filename);
      if (entry.encrypted) throw new Error(`Arquivos criptografados não são aceitos: ${name}`);
      const size = Number(entry.uncompressedSize || 0);
      if (size > MAX_ENTRY_BYTES) throw new Error(`Arquivo maior que 1 MiB: ${name}`);
      expanded += size;
      if (expanded > MAX_EXPANDED_BYTES) throw new Error("O ZIP expandido excede 8 MiB.");
      if (/\.(?:exe|dll|cmd|bat|com|msi|ps1|sh|apk|jar|class|so|dylib)$/i.test(name)) throw new Error(`Arquivo executável não permitido: ${name}`);
      files.set(name, entry);
    }
    const manifests = [...files.keys()].filter((name) => /(?:^|\/)plugin\.json$/i.test(name));
    if (manifests.length !== 1) throw new Error("O ZIP deve conter exatamente um plugin.json.");
    const manifestName = manifests[0];
    const base = manifestName.slice(0, -"plugin.json".length);
    const manifestText = await files.get(manifestName).getData(new TextWriter());
    let manifest;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      throw new Error("plugin.json não contém JSON válido.");
    }
    const hosts = assertManifest(manifest);
    const scriptName = `${base}${safeZipPath(manifest.browser.download_target_script_file)}`;
    const scriptEntry = files.get(scriptName);
    if (!scriptEntry) throw new Error(`Arquivo declarado não encontrado no ZIP: ${manifest.browser.download_target_script_file}`);
    const script = await scriptEntry.getData(new TextWriter());
    if (!script.trim()) throw new Error("download_target.js está vazio.");
    const forbidden = [
      [/\bWebSocket\s*\(/, "WebSocket"],
      [/\bEventSource\s*\(/, "EventSource"],
      [/\bnavigator\.sendBeacon\s*\(/, "sendBeacon"],
      [/\b(?:eval|Function)\s*\(/, "execução dinâmica"]
    ];
    const match = forbidden.find(([pattern]) => pattern.test(script));
    if (match) throw new Error(`Código recusado pela verificação de segurança: ${match[1]}.`);
    return { manifest, hosts, script, entryCount: entries.length, expandedBytes: expanded };
  } finally {
    await reader.close().catch(() => {});
  }
}

function imageLooksValid(bytes, contentType) {
  const head = new Uint8Array(bytes.slice(0, 12));
  if (contentType.includes("png")) return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (contentType.includes("webp")) return String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP";
  if (contentType.includes("gif")) return String.fromCharCode(...head.slice(0, 3)) === "GIF";
  return head[0] === 0xff && head[1] === 0xd8;
}

async function detectAccessBlock(page) {
  return page.evaluate(() => {
    const title = String(document.title || "");
    const body = String(document.body?.innerText || "").slice(0, 12000);
    const combined = `${title}\n${body}`;
    return /Attention Required|Just a moment|Sorry, you have been blocked|Cloudflare Ray ID|Enable JavaScript and cookies to continue|Access denied/i.test(combined)
      || Boolean(document.querySelector("#cf-error-details, .cf-error-details, [data-translate=block_headline]"));
  });
}

async function testPlugin(env, plugin, workUrl, steps) {
  let browser;
  let usedHttpFallback = false;
  let blockedHttpStatus = 0;
  try {
    browser = await launch(env.BROWSER);
    const context = await browser.newContext({
      userAgent: WEBVIEW_USER_AGENT,
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      locale: "pt-BR",
      extraHTTPHeaders: {
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });
    let requestCount = 0;
    await context.route("**/*", async (route) => {
      const target = route.request().url();
      if (/^(?:about:blank|data:|blob:)/i.test(target)) return route.continue();
      requestCount += 1;
      if (requestCount > MAX_BROWSER_REQUESTS) return route.abort("blockedbyclient");
      try {
        assertPublicHttpUrl(target, "Requisição do plugin");
        return route.continue();
      } catch {
        return route.abort("blockedbyclient");
      }
    });
    const page = await context.newPage();
    let response = await page.goto(workUrl.href, { waitUntil: "domcontentloaded", timeout: 45000 });
    let responseStatus = response?.status() || 0;
    if (!response || !response.ok()) {
      blockedHttpStatus = responseStatus;
      const direct = await fetch(workUrl.href, {
        redirect: "follow",
        headers: {
          "User-Agent": WEBVIEW_USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
        }
      });
      if (direct.ok && String(direct.headers.get("content-type") || "").toLowerCase().includes("text/html")) {
        const declaredSize = Number(direct.headers.get("content-length") || 0);
        if (declaredSize > MAX_HTML_BYTES) throw new Error("A página da obra excede o limite web de 2 MiB.");
        const html = await direct.text();
        if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) throw new Error("A página da obra excede o limite web de 2 MiB.");
        assertPublicHttpUrl(direct.url || workUrl.href, "Redirecionamento");
        await page.setContent(html, { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(750);
        responseStatus = direct.status;
        usedHttpFallback = true;
      } else if ([401, 403, 429].includes(responseStatus) || [401, 403, 429].includes(direct.status)) {
        const status = responseStatus || direct.status;
        throw new WebEnvironmentBlockedError(status, `O site recusou o ambiente web com HTTP ${status} antes da execução do plugin.`);
      } else {
        throw new Error(`A página da obra respondeu HTTP ${responseStatus || direct.status || 0}.`);
      }
    }
    assertPublicHttpUrl(page.url(), "Redirecionamento");
    if (await detectAccessBlock(page)) {
      throw new WebEnvironmentBlockedError(
        blockedHttpStatus || responseStatus,
        `A proteção do site recusou o navegador hospedado antes da execução do plugin${(blockedHttpStatus || responseStatus) ? ` (HTTP ${blockedHttpStatus || responseStatus})` : ""}.`
      );
    }
    await page.evaluate(plugin.script);
    await page.waitForFunction(() => {
      try {
        const raw = window.__nyxoviraChapterPlan;
        const value = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Boolean(value && Array.isArray(value.chapters) && value.chapters.length);
      } catch {
        return false;
      }
    }, null, { timeout: 15000 });
    step(steps, "site", "PASS", usedHttpFallback
      ? `Página real carregada pelo fallback HTTPS com HTTP ${responseStatus}; plano de capítulos detectado.`
      : `Página real carregada com HTTP ${responseStatus}; plano de capítulos detectado.`);

    let plan = await page.evaluate(() => {
      const raw = window.__nyxoviraChapterPlan;
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    });
    if (!String(plan?.title || "").trim()) throw new Error("O plano não informou o título da obra.");
    const chapterIds = plan.chapters.map((chapter) => String(chapter?.id || ""));
    if (chapterIds.some((id) => !id) || new Set(chapterIds).size !== chapterIds.length) throw new Error("Os capítulos têm IDs vazios ou duplicados.");
    const selectedChapterId = chapterIds[0];
    step(steps, "obra", "PASS", `${plan.title}: ${plan.chapters.length} capítulo(s); o primeiro foi escolhido automaticamente.`);

    plan = await page.evaluate(async ({ selectedChapterId, currentPlan }) => {
      const prepare = window.__nyxoviraPrepareDownloadPlan || window.Nyxovira?.prepareDownloadPlan;
      const prepared = typeof prepare === "function"
        ? await prepare({ selectedChapterIds: [selectedChapterId], chapterPlan: currentPlan })
        : currentPlan;
      const fallback = window.__nyxoviraChapterPlan;
      const resolved = prepared || (typeof fallback === "string" ? JSON.parse(fallback) : fallback);
      return typeof resolved === "string" ? JSON.parse(resolved) : resolved;
    }, { selectedChapterId, currentPlan: plan });
    const chapter = plan?.chapters?.find((item) => String(item?.id) === selectedChapterId);
    if (!chapter) throw new Error("O ID do capítulo mudou durante a preparação.");
    step(steps, "seleção", "PASS", `Capítulo ${selectedChapterId} preparado sem alterar o ID.`);

    const paragraphs = Array.isArray(chapter.paragraphs) ? chapter.paragraphs.map(String).filter((text) => text.trim()) : [];
    const pages = Array.isArray(chapter.pages) ? chapter.pages : (Array.isArray(chapter.images) ? chapter.images : []);
    let contentSummary;
    if (paragraphs.length) {
      const serialized = JSON.stringify({ id: selectedChapterId, title: chapter.title || chapter.label || "Capítulo", paragraphs });
      const reopened = JSON.parse(serialized);
      if (reopened.paragraphs.length !== paragraphs.length) throw new Error("O capítulo de texto não pôde ser reaberto em memória.");
      contentSummary = `${paragraphs.length} parágrafo(s) serializados e reabertos em memória.`;
    } else if (pages.length) {
      if (pages.length > MAX_PAGES) throw new Error(`O capítulo tem ${pages.length} páginas; o limite web é ${MAX_PAGES}.`);
      let totalBytes = 0;
      for (let index = 0; index < pages.length; index += 1) {
        const descriptor = typeof pages[index] === "string" ? { url: pages[index] } : pages[index];
        const target = assertPublicHttpUrl(new URL(descriptor?.url || descriptor?.src || descriptor?.image || descriptor?.imageUrl, workUrl).href, `Página ${index + 1}`);
        const download = await context.request.get(target.href, {
          headers: { Referer: chapter.url || workUrl.href, ...(descriptor.headers || {}) },
          timeout: 45000
        });
        if (!download.ok()) throw new Error(`Página ${index + 1} respondeu HTTP ${download.status()}.`);
        const contentType = String(download.headers()["content-type"] || "").toLowerCase();
        if (!contentType.startsWith("image/")) throw new Error(`Página ${index + 1} não retornou uma imagem.`);
        const body = await download.body();
        const bytes = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
        if (!body.byteLength || !imageLooksValid(bytes, contentType)) throw new Error(`Página ${index + 1} retornou uma imagem inválida.`);
        totalBytes += body.byteLength;
        if (totalBytes > MAX_DOWNLOAD_BYTES) throw new Error("O capítulo excedeu o limite web de 24 MiB.");
      }
      contentSummary = `${pages.length} imagem(ns), ${totalBytes} bytes, baixadas e verificadas em memória.`;
    } else {
      throw new Error("O primeiro capítulo não resolveu páginas nem parágrafos.");
    }
    step(steps, "conteúdo", "PASS", contentSummary);
    return { selectedChapterId, title: plan.title, chapterCount: plan.chapters.length, contentSummary, requestCount };
  } catch (error) {
    if (/\b429\b|rate limit exceeded|browser acquisition/i.test(String(error?.message || ""))) {
      throw new WebEnvironmentBlockedError(
        429,
        "O serviço de navegador atingiu o limite temporário de novas sessões. Tente novamente em alguns segundos."
      );
    }
    if (usedHttpFallback && error?.code !== "WEB_ENVIRONMENT_BLOCKED") {
      throw new WebEnvironmentBlockedError(
        blockedHttpStatus,
        `A navegação normal foi recusada com HTTP ${blockedHttpStatus}; o fallback HTTPS não conseguiu reproduzir o conteúdo dinâmico usado pelo Nyxovira.`
      );
    }
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function handleTest(request, env, requestUrl) {
  const steps = [];
  let plugin;
  try {
    if (request.headers.get("origin") && request.headers.get("origin") !== SITE_ORIGIN) {
      const result = fail("Origem não autorizada.", 403, steps);
      return json(request, result.payload, result.status);
    }
    const workUrl = assertPublicHttpUrl(requestUrl.searchParams.get("workUrl") || "", "URL da obra");
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_ZIP_BYTES) throw new Error("O ZIP excede o limite de 2 MiB.");
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_ZIP_BYTES) throw new Error("Envie um ZIP de até 2 MiB.");
    plugin = await readPluginZip(bytes);
    if (!hostMatches(workUrl.hostname, plugin.hosts)) throw new Error("O domínio da obra não aparece em plugin.json > match.hosts.");
    step(steps, "segurança", "PASS", `${plugin.entryCount} arquivo(s) inspecionados; sem executáveis, caminhos inseguros ou APIs de exfiltração bloqueadas.`);
    step(steps, "manifesto", "PASS", "plugin.json, domínio e download_target.js são válidos para o laboratório web.");
    const tested = await testPlugin(env, plugin, workUrl, steps);
    step(steps, "conclusão", "PASS", "O plugin passou nesta obra e no primeiro capítulo testado.");
    return json(request, {
      report: {
        schemaVersion: 2,
        verdict: "PLUGIN_VALID",
        success: true,
        pluginId: plugin.manifest.id || plugin.manifest.name || "plugin-sem-id",
        workUrl: workUrl.href,
        workTitle: tested.title,
        selectedChapterId: tested.selectedChapterId,
        chapterCount: tested.chapterCount,
        steps
      },
      temporaryDataReleased: true,
      stored: false
    });
  } catch (error) {
    if (error?.code === "WEB_ENVIRONMENT_BLOCKED") {
      step(steps, "ambiente", "BLOCKED", `${error.message} Isso aconteceu antes de download_target.js e não invalida o plugin.`);
      return json(request, {
        report: {
          schemaVersion: 2,
          verdict: "AMBIENTE_WEB_BLOQUEADO",
          success: false,
          conclusive: false,
          pluginInvalid: false,
          pluginId: plugin?.manifest?.id || plugin?.manifest?.name || "plugin-sem-id",
          workUrl: requestUrl.searchParams.get("workUrl") || "",
          error: "O laboratório hospedado não conseguiu concluir a navegação. O plugin não foi considerado inválido; tente novamente e, se a fonte bloquear navegadores web, valide-a no Nyxovira.",
          steps
        },
        temporaryDataReleased: true,
        stored: false
      });
    }
    step(steps, "diagnóstico", "FAIL", error?.message || String(error));
    const result = fail(error?.message || String(error), 422, steps);
    return json(request, result.payload, result.status);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(request, { ready: true, service: "Nyxovira Plugin Lab", execution: "web", storage: "none" });
    }
    if (request.method === "POST" && url.pathname === "/test") return handleTest(request, env, url);
    return json(request, { error: "Rota não encontrada." }, 404);
  }
};
