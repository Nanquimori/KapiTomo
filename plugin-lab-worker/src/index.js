import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";

const SITE_ORIGIN = "https://nanquimori.github.io";
const MAX_ZIP_BYTES = 2 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 8 * 1024 * 1024;
const MAX_ENTRY_BYTES = 1024 * 1024;
const MAX_ENTRIES = 40;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_PROXY_BYTES = 24 * 1024 * 1024;
const TOKEN_TTL_SECONDS = 15 * 60;
const WEBVIEW_USER_AGENT = "Mozilla/5.0 (Linux; Android 14; Nyxovira) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const FRAME_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Nyxovira Plugin Lab</title></head><body><script>
(() => {
  const channel = decodeURIComponent(location.hash.slice(1));
  addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== parent || message?.channel !== channel || message.type !== "bootstrap") return;
    try {
      new Function("config", message.source)(message.config);
    } catch (error) {
      parent.postMessage({ channel, type: "sandbox-error", error: error?.message || String(error) }, "*");
    }
  });
  parent.postMessage({ channel, type: "frame-host-ready" }, "*");
})();
</script></body></html>`;

const corsHeaders = (request) => {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin === SITE_ORIGIN ? origin : SITE_ORIGIN,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-lab-token",
    "access-control-expose-headers": "content-type, content-length, x-lab-final-url",
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
      report: { schemaVersion: 3, verdict: "PLUGIN_INVALID", success: false, error: message, steps },
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

function parserForLab(parser) {
  if (!parser || typeof parser !== "object" || Array.isArray(parser)) return null;
  const allowed = [
    "adapter",
    "base_url",
    "api_base",
    "chapter_api_path_template",
    "read_path_template",
    "public_chapter_path_template"
  ];
  const result = {};
  for (const name of allowed) {
    if (typeof parser[name] === "string") result[name] = parser[name];
  }
  if (parser.request_headers && typeof parser.request_headers === "object" && !Array.isArray(parser.request_headers)) {
    result.request_headers = Object.fromEntries(
      Object.entries(parser.request_headers).filter(([, value]) => typeof value === "string")
    );
  }
  return result;
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
    return { manifest, hosts, script, entryCount: entries.length };
  } finally {
    await reader.close().catch(() => {});
  }
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function tokenKey(secret) {
  if (!secret) throw new Error("O serviço web ainda não foi configurado.");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function createToken(secret, hosts) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ hosts: [...new Set(hosts)], exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })));
  const signature = await crypto.subtle.sign("HMAC", await tokenKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verifyToken(secret, token) {
  const [payload, signature, extra] = String(token || "").split(".");
  if (!payload || !signature || extra) throw new Error("Sessão de teste inválida.");
  const valid = await crypto.subtle.verify("HMAC", await tokenKey(secret), fromBase64Url(signature), encoder.encode(payload));
  if (!valid) throw new Error("Sessão de teste inválida.");
  const data = JSON.parse(decoder.decode(fromBase64Url(payload)));
  if (!Array.isArray(data.hosts) || Number(data.exp) < Math.floor(Date.now() / 1000)) throw new Error("A sessão de teste expirou. Envie o ZIP novamente.");
  return data;
}

function prepareHtmlForLab(html) {
  return String(html)
    .replace(/<meta\b[^>]+http-equiv=["']?(?:content-security-policy|refresh)["']?[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (scriptTag) => (
      /(?:serviceWorker|location\.reload|registerSW\.js|googletagmanager\.com|\bgtag\s*\()/i.test(scriptTag) ? "" : scriptTag
    ));
}

function upstreamHeaders(rawHeaders = {}) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(rawHeaders)) {
    if (/^(?:accept|accept-language|content-type|referer|authorization|x-requested-with)$/i.test(name) && typeof value === "string") headers.set(name, value);
  }
  headers.set("User-Agent", WEBVIEW_USER_AGENT);
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.8");
  return headers;
}

async function fetchLimited(url, init, maxBytes) {
  const response = await fetch(url, { ...init, redirect: "follow", signal: AbortSignal.timeout(30000) });
  const finalUrl = assertPublicHttpUrl(response.url || url, "Redirecionamento");
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("A resposta excedeu o limite do laboratório.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new Error("A resposta excedeu o limite do laboratório.");
  return { response, finalUrl, bytes };
}

async function handlePrepare(request, env, requestUrl) {
  const steps = [];
  try {
    if (request.headers.get("origin") && request.headers.get("origin") !== SITE_ORIGIN) return json(request, fail("Origem não autorizada.", 403, steps).payload, 403);
    const workUrl = assertPublicHttpUrl(requestUrl.searchParams.get("workUrl") || "", "URL da obra");
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_ZIP_BYTES) throw new Error("O ZIP excede o limite de 2 MiB.");
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_ZIP_BYTES) throw new Error("Envie um ZIP de até 2 MiB.");
    const plugin = await readPluginZip(bytes);
    if (!hostMatches(workUrl.hostname, plugin.hosts)) throw new Error("O domínio da obra não aparece em plugin.json > match.hosts.");
    step(steps, "segurança", "PASS", `${plugin.entryCount} arquivo(s) inspecionados; sem executáveis, caminhos inseguros ou APIs de exfiltração bloqueadas.`);
    step(steps, "manifesto", "PASS", "plugin.json, domínio e download_target.js são válidos para o laboratório web.");

    const loaded = await fetchLimited(workUrl.href, {
      headers: upstreamHeaders({ Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" })
    }, MAX_HTML_BYTES);
    if (!loaded.response.ok) throw new Error(`A página da obra respondeu HTTP ${loaded.response.status}.`);
    if (!String(loaded.response.headers.get("content-type") || "").toLowerCase().includes("text/html")) throw new Error("A URL da obra não retornou HTML.");
    if (!hostMatches(loaded.finalUrl.hostname, plugin.hosts)) throw new Error("A página redirecionou para um domínio não declarado no plugin.");
    const html = prepareHtmlForLab(decoder.decode(loaded.bytes));
    const pageUrl = new URL(loaded.finalUrl.href);
    if (workUrl.hash && pageUrl.origin === workUrl.origin && pageUrl.pathname === workUrl.pathname && pageUrl.search === workUrl.search) pageUrl.hash = workUrl.hash;
    const token = await createToken(env.LAB_TOKEN_SECRET, plugin.hosts);
    step(steps, "fonte", "PASS", `Página real carregada com HTTP ${loaded.response.status}; a execução continuará no navegador deste aparelho.`);
    return json(request, {
      prepared: true,
      plugin: { id: plugin.manifest.id || plugin.manifest.name || "plugin-sem-id", script: plugin.script },
      nativeParser: parserForLab(plugin.manifest.parser),
      page: { url: pageUrl.href, html },
      token,
      report: { schemaVersion: 3, steps },
      temporaryDataReleased: true,
      stored: false
    });
  } catch (error) {
    step(steps, "diagnóstico", "FAIL", error?.message || String(error));
    const result = fail(error?.message || String(error), 422, steps);
    return json(request, result.payload, result.status);
  }
}

async function handleProxy(request, env) {
  try {
    if (request.headers.get("origin") && request.headers.get("origin") !== SITE_ORIGIN) return json(request, { error: "Origem não autorizada." }, 403);
    const token = await verifyToken(env.LAB_TOKEN_SECRET, request.headers.get("x-lab-token"));
    const input = await request.json();
    const target = assertPublicHttpUrl(input.url, "Requisição do plugin");
    if (!hostMatches(target.hostname, token.hosts)) throw new Error("O plugin tentou acessar um domínio não declarado em match.hosts.");
    const method = String(input.method || "GET").toUpperCase();
    if (!new Set(["GET", "POST", "HEAD"]).has(method)) throw new Error("Método HTTP não permitido no laboratório.");
    const body = method === "POST" && typeof input.body === "string" ? input.body : undefined;
    const loaded = await fetchLimited(target.href, { method, headers: upstreamHeaders(input.headers), body }, MAX_PROXY_BYTES);
    if (!hostMatches(loaded.finalUrl.hostname, token.hosts)) throw new Error("A requisição redirecionou para um domínio não declarado no plugin.");
    const headers = new Headers(corsHeaders(request));
    headers.set("cache-control", "no-store");
    headers.set("content-type", loaded.response.headers.get("content-type") || "application/octet-stream");
    headers.set("x-lab-final-url", loaded.finalUrl.href);
    return new Response(method === "HEAD" ? null : loaded.bytes, { status: loaded.response.status, headers });
  } catch (error) {
    return json(request, { error: error?.message || String(error) }, 422);
  }
}

async function handleMedia(request, env) {
  try {
    if (request.headers.get("origin") && request.headers.get("origin") !== SITE_ORIGIN) {
      return json(request, { error: "Origem não autorizada." }, 403);
    }
    await verifyToken(env.LAB_TOKEN_SECRET, request.headers.get("x-lab-token"));
    const input = await request.json();
    const target = assertPublicHttpUrl(input.url, "Imagem do capítulo");
    const headers = upstreamHeaders(input.headers);
    const loaded = await fetchLimited(target.href, { method: "GET", headers }, MAX_PROXY_BYTES);
    const contentType = String(loaded.response.headers.get("content-type") || "").toLowerCase();
    if (!loaded.response.ok) throw new Error("A imagem respondeu HTTP " + loaded.response.status + ".");
    if (!contentType.startsWith("image/")) throw new Error("O endereço do capítulo não retornou uma imagem.");
    const responseHeaders = new Headers(corsHeaders(request));
    responseHeaders.set("cache-control", "no-store");
    responseHeaders.set("content-type", contentType);
    responseHeaders.set("x-lab-final-url", loaded.finalUrl.href);
    return new Response(loaded.bytes, { status: loaded.response.status, headers: responseHeaders });
  } catch (error) {
    return json(request, { error: error?.message || String(error) }, 422);
  }
}

async function handleSourceModule(request, env, requestUrl) {
  try {
    const match = requestUrl.pathname.match(/^\/source\/([^/]+)\/([^/]+)(\/.*)$/);
    if (!match) throw new Error("Rota de módulo inválida.");
    const token = await verifyToken(env.LAB_TOKEN_SECRET, decodeURIComponent(match[1]));
    const sourceOrigin = decoder.decode(fromBase64Url(match[2]));
    const origin = assertPublicHttpUrl(`${sourceOrigin}/`, "Origem do módulo");
    const target = assertPublicHttpUrl(new URL(`${match[3]}${requestUrl.search}`, origin).href, "Módulo da fonte");
    if (!hostMatches(target.hostname, token.hosts)) throw new Error("O módulo tentou acessar um domínio não declarado em match.hosts.");
    const loaded = await fetchLimited(target.href, {
      method: "GET",
      headers: upstreamHeaders({
        Accept: request.headers.get("accept") || "text/javascript, application/javascript, text/css, */*;q=0.1",
        Referer: origin.href
      })
    }, MAX_PROXY_BYTES);
    if (!hostMatches(loaded.finalUrl.hostname, token.hosts)) throw new Error("O módulo redirecionou para um domínio não declarado no plugin.");
    const contentType = loaded.response.headers.get("content-type") || "application/javascript; charset=utf-8";
    let responseBytes = loaded.bytes;
    if (/\b(?:javascript|ecmascript)\b/i.test(contentType)) {
      const routePrefix = `/source/${encodeURIComponent(match[1])}/${match[2]}/`;
      const code = decoder.decode(loaded.bytes)
        .replace(/(["'`])\/assets\//g, `$1${routePrefix}assets/`)
        .replace(/return(["'])\/\1\+([A-Za-z_$][\w$]*)/g, (_whole, quote, variable) => (
          `return ${variable}.startsWith("assets/")?${JSON.stringify(routePrefix)}+${variable}:${quote}/${quote}+${variable}`
        ));
      responseBytes = encoder.encode(code);
    }
    const headers = new Headers({
      "cache-control": "no-store",
      "content-type": contentType,
      "cross-origin-resource-policy": "same-origin",
      "x-content-type-options": "nosniff"
    });
    return new Response(responseBytes, { status: loaded.response.status, headers });
  } catch (error) {
    return new Response(`throw new Error(${JSON.stringify(error?.message || String(error))});\n`, {
      status: 422,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/javascript; charset=utf-8",
        "x-content-type-options": "nosniff"
      }
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(request, { ready: Boolean(env.LAB_TOKEN_SECRET), service: "Nyxovira Plugin Lab", execution: "visitor-browser", storage: "none" });
    }
    if (request.method === "GET" && url.pathname === "/frame") {
      return new Response(FRAME_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
          "content-security-policy": "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src 'none'; media-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors *",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff"
        }
      });
    }
    if (request.method === "GET" && url.pathname.startsWith("/source/")) return handleSourceModule(request, env, url);
    if (request.method === "POST" && url.pathname === "/prepare") return handlePrepare(request, env, url);
    if (request.method === "POST" && url.pathname === "/proxy") return handleProxy(request, env);
    if (request.method === "POST" && url.pathname === "/media") return handleMedia(request, env);
    return json(request, { error: "Rota não encontrada." }, 404);
  }
};
