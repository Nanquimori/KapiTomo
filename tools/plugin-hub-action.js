const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");
const { sortCatalogPlugins } = require("../plugins/catalog-pagination.js");

const CATALOG_PATHS = ["plugins/catalog-store.json", "plugins/catalog.json"];
const MAINTAINERS = new Set(["nanquimori"]);
const BROKEN_AFTER_FAILURES = 2;
const MISSING_AFTER_FAILURES = 2;
const MAX_PUBLIC_TAGS = 5;
const MAX_TYPE_TAGS = 3;
const MIN_PUBLIC_TAGS = 2;
const POLICY_ACCEPTANCE_MARKER = "plugin-hub-policy: accepted-v1";
const POLICY_ACCEPTANCE_ERROR = "The publication request must accept the current Plugin Hub catalog rules. Read https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules and add `Catalog rules accepted: yes` to the request.";
const SECURITY_SCAN_MAX_FILES = 50;
const SECURITY_SCAN_MAX_FILE_BYTES = 2 * 1024 * 1024;
const SECURITY_SCAN_MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const SECURITY_SCAN_MAX_FINDINGS = 20;
const SECURITY_TEXT_EXTENSIONS = new Set([".cjs", ".css", ".js", ".json", ".lock", ".md", ".mjs", ".toml", ".ts", ".txt", ".yaml", ".yml"]);
const SECURITY_IMAGE_EXTENSIONS = new Set([".gif", ".ico", ".jpeg", ".jpg", ".png", ".webp"]);
const SECURITY_ALLOWED_EXTENSIONLESS = new Set(["license", "readme"]);
const SECURITY_ALLOWED_FILENAMES = new Set([".gitattributes", ".gitignore"]);
const SECURITY_BLOCKED_EXTENSIONS = new Set([
  ".7z", ".aab", ".apk", ".app", ".appx", ".bat", ".bin", ".cab", ".cmd", ".com", ".deb", ".dex",
  ".dll", ".dmg", ".elf", ".exe", ".hta", ".html", ".htm", ".img", ".iso", ".jar", ".jsb", ".lnk",
  ".msi", ".msix", ".p12", ".pem", ".pfx", ".php", ".ps1", ".py", ".rar", ".rb", ".reg", ".rpm",
  ".sh", ".so", ".svg", ".tar", ".vbs", ".wasm", ".xpi", ".zip"
]);
const SECURITY_BLOCKED_FILENAMES = new Set([".env", "id_dsa", "id_ecdsa", "id_ed25519", "id_rsa"]);
const SECURITY_CODE_RULES = [
  { code: "dynamic-code", reason: "dynamic code execution is not allowed", pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bFunction\s*\(\s*["'`]|\b(?:setTimeout|setInterval)\s*\(\s*["'`]|\.constructor\s*\.\s*constructor\s*\(|\bWebAssembly\./ },
  { code: "system-command", reason: "system-command or native runtime access is not allowed", pattern: /(?:require\s*\(\s*["'](?:node:)?child_process["']|from\s+["'](?:node:)?child_process["']|process\.(?:binding|mainModule|getBuiltinModule)\b|\bDeno\.(?:run|Command)\b|\bBun\.(?:spawn|spawnSync)\b|ActiveXObject\s*\(|WScript\.Shell)/ },
  { code: "credential-access", reason: "reading browser credentials or cookies is not allowed", pattern: /document\.cookie\b|\b(?:password|passwd|authorization)\s*(?:Input|Field)?\b.*(?:value|addEventListener)|querySelector\s*\(\s*["'][^"']*(?:password|current-password)/i },
  { code: "sensitive-browser-api", reason: "this sensitive browser capability is not allowed", pattern: /navigator\.(?:sendBeacon|geolocation)|mediaDevices\.getUserMedia|serviceWorker\.register|Notification\.requestPermission|navigator\.clipboard\.(?:read|readText)/ },
  { code: "forced-navigation", reason: "forced navigation or popup behavior is not allowed", pattern: /(?:window\.)?location\.(?:assign|replace)\s*\(|(?:window\.)?location(?:\.href)?\s*=|window\.open\s*\(/ },
  { code: "obfuscated-code", reason: "encoded or obfuscated executable code requires manual review", pattern: /\b(?:atob|String\.fromCharCode)\s*\(|\b_0x[a-f0-9]{3,}\b|["'`][A-Za-z0-9+/]{400,}={0,2}["'`]/i },
  { code: "script-injection", reason: "injecting executable browser content is not allowed", pattern: /createElement\s*\(\s*["'](?:script|iframe)["']|\.srcdoc\s*=|import\s*\(\s*["']data:/i },
  { code: "script-url", reason: "javascript URLs are not allowed", pattern: /javascript\s*:/i }
];
const OFFICIAL_LANGUAGE_TAGS = [
  "english",
  "portuguese",
  "spanish",
  "japanese",
  "korean",
  "chinese",
  "indonesian",
  "thai",
  "vietnamese",
  "french",
  "german",
  "italian",
  "russian",
  "arabic"
];
const OFFICIAL_TYPE_TAGS = [
  "manga",
  "manhua",
  "manhwa",
  "novel",
  "webtoon",
  "comic",
  "other"
];
const LANGUAGE_TAGS = new Set(OFFICIAL_LANGUAGE_TAGS);
const TYPE_TAGS = new Set(OFFICIAL_TYPE_TAGS);
const PUBLIC_TAGS = new Set([
  ...OFFICIAL_LANGUAGE_TAGS,
  ...OFFICIAL_TYPE_TAGS
]);

const env = process.env;
const dryRun = env.PLUGIN_HUB_DRY_RUN === "1";

const PORTUGUESE_ERRORS = new Map([
  ["The request author must own the plugin repository.", "O autor da solicitação deve ser o proprietário do repositório do plugin."],
  ["Official plugins can only be changed by a maintainer.", "Plugins oficiais só podem ser alterados por um mantenedor."],
  ["Only the current plugin repository owner or a maintainer can update this plugin.", "Somente o proprietário atual do repositório do plugin ou um mantenedor pode atualizar este plugin."],
  ["Official plugins can only be removed by a maintainer.", "Plugins oficiais só podem ser removidos por um mantenedor."],
  ["Only the plugin repository owner or a maintainer can remove this plugin.", "Somente o proprietário do repositório do plugin ou um mantenedor pode remover este plugin."],
  ["Enter the plugin ID to remove.", "Informe o ID do plugin que deseja remover."],
  ["Could not find a JSON block in the request.", "Não foi possível encontrar um bloco JSON na solicitação."],
  ["The plugin.json id does not match the request id.", "O ID do plugin.json não corresponde ao ID da solicitação."],
  ["The request version does not match plugin.json.", "A versão da solicitação não corresponde ao plugin.json."],
  ["plugin.json must declare browser.icon_url.", "O plugin.json precisa declarar browser.icon_url."],
  ["plugin.json must declare match.hosts or browser.home_url.", "O plugin.json precisa declarar match.hosts ou browser.home_url."],
  ["Plugin catalog was not found.", "O catálogo de plugins não foi encontrado."],
  ["repository_url must point to github.com.", "repository_url precisa apontar para github.com."],
  ["repository_url must include an owner and repository.", "repository_url precisa incluir o proprietário e o repositório."],
  ["Invalid repository_ref.", "repository_ref é inválido."],
  ["Invalid plugin_path.", "plugin_path é inválido."],
  ["id must use only lowercase letters, numbers, dots, dashes, or underscores.", "O ID deve usar apenas letras minúsculas, números, pontos, hífens ou sublinhados."],
  ["tags must use lowercase letters, numbers, dots, dashes, or underscores.", "As tags devem usar apenas letras minúsculas, números, pontos, hífens ou sublinhados."],
  ["tags must include at least 2 public tags: language first, then type.", "As tags devem incluir pelo menos 2 tags públicas: primeiro o idioma e depois o tipo."]
]);
PORTUGUESE_ERRORS.set(POLICY_ACCEPTANCE_ERROR, "A solicitação de publicação precisa aceitar as regras atuais do catálogo do Plugin Hub. Leia https://nanquimori.github.io/KapiTomo/terms/#regras-do-catalogo e adicione `Regras do catálogo aceitas: sim` à solicitação.");
PORTUGUESE_ERRORS.set("Only a maintainer can moderate catalog plugins.", "Somente um mantenedor pode moderar plugins do catálogo.");
PORTUGUESE_ERRORS.set("Moderation action must be hide, restore, or remove.", "A ação de moderação precisa ser hide, restore ou remove.");
PORTUGUESE_ERRORS.set("Moderation reason is required.", "O motivo da moderação é obrigatório.");
PORTUGUESE_ERRORS.set("This catalog entry is under moderation review. The creator may submit corrections, and a maintainer must review them before the listing returns to the catalog.", "Esta entrada está em análise de moderação. O criador pode enviar correções, e um mantenedor precisa analisá-las antes que a entrada volte ao catálogo.");
PORTUGUESE_ERRORS.set("tags may include at most 3 content types.", "As tags podem incluir no máximo 3 tipos de conteúdo.");

function issueLanguage(issue) {
  const body = String(issue && issue.body || "");
  const marker = body.match(/plugin-hub-language:\s*(pt|en)\b/i);
  if (marker) {
    return marker[1].toLowerCase();
  }
  return /Solicitação|Repositório|catálogo|Confirmo que|Depois de enviar/i.test(body) ? "pt" : "en";
}

function translateSecurityError(text) {
  if (text.startsWith("Plugin security review blocked publication:")) {
    return text
      .replace("Plugin security review blocked publication:", "A an\u00e1lise de seguran\u00e7a bloqueou a publica\u00e7\u00e3o:")
      .replaceAll("dynamic code execution is not allowed", "execu\u00e7\u00e3o din\u00e2mica de c\u00f3digo n\u00e3o \u00e9 permitida")
      .replaceAll("system-command or native runtime access is not allowed", "comandos do sistema ou acesso ao ambiente nativo n\u00e3o s\u00e3o permitidos")
      .replaceAll("reading browser credentials or cookies is not allowed", "leitura de credenciais ou cookies do navegador n\u00e3o \u00e9 permitida")
      .replaceAll("this sensitive browser capability is not allowed", "esta capacidade sens\u00edvel do navegador n\u00e3o \u00e9 permitida")
      .replaceAll("forced navigation or popup behavior is not allowed", "navega\u00e7\u00e3o for\u00e7ada ou abertura de pop-up n\u00e3o \u00e9 permitida")
      .replaceAll("encoded or obfuscated executable code requires manual review", "c\u00f3digo execut\u00e1vel codificado ou ofuscado exige an\u00e1lise manual")
      .replaceAll("injecting executable browser content is not allowed", "inje\u00e7\u00e3o de conte\u00fado execut\u00e1vel no navegador n\u00e3o \u00e9 permitida")
      .replaceAll("javascript URLs are not allowed", "URLs javascript n\u00e3o s\u00e3o permitidas")
      .replaceAll("a network request targets an undeclared host", "uma requisi\u00e7\u00e3o de rede aponta para um dom\u00ednio n\u00e3o declarado")
      .replaceAll("minified or excessively long code requires manual review", "c\u00f3digo minificado ou excessivamente longo exige an\u00e1lise manual")
      .replaceAll("Git LFS pointers are not accepted because their payload was not scanned", "ponteiros do Git LFS n\u00e3o s\u00e3o aceitos porque seu conte\u00fado n\u00e3o foi analisado")
      .replaceAll("the file type is not accepted in a published plugin", "este tipo de arquivo n\u00e3o \u00e9 aceito em um plugin publicado")
      .replaceAll("files marked as operating-system executables are not accepted", "arquivos marcados como execut\u00e1veis do sistema operacional n\u00e3o s\u00e3o aceitos")
      .replaceAll("symbolic links and submodules are not accepted", "links simb\u00f3licos e subm\u00f3dulos n\u00e3o s\u00e3o aceitos")
      .replaceAll("binary content does not match the declared image type", "o conte\u00fado bin\u00e1rio n\u00e3o corresponde ao tipo de imagem declarado")
      .replaceAll("binary content is not accepted for this file type", "conte\u00fado bin\u00e1rio n\u00e3o \u00e9 aceito para este tipo de arquivo")
      .replaceAll("the repository contains an unsafe file path", "o reposit\u00f3rio cont\u00e9m um caminho de arquivo inseguro")
      .replaceAll("the repository tree is too large to review completely", "a estrutura do reposit\u00f3rio \u00e9 grande demais para ser analisada por completo")
      .replaceAll("file paths must also be unique when letter case is ignored", "os caminhos tamb\u00e9m precisam ser \u00fanicos sem diferenciar mai\u00fasculas de min\u00fasculas")
      .replaceAll("no plugin files were found at plugin_path", "nenhum arquivo de plugin foi encontrado em plugin_path")
      .replaceAll("a published plugin may contain at most", "um plugin publicado pode conter no m\u00e1ximo")
      .replaceAll("each file must be no larger than", "cada arquivo pode ter no m\u00e1ximo")
      .replaceAll("more finding(s)", "outro(s) alerta(s)");
  }
  let match = text.match(/^Antivirus scan found malware: (.+)$/s);
  if (match) {
    return `A verifica\u00e7\u00e3o antiv\u00edrus encontrou malware: ${match[1]}`;
  }
  match = text.match(/^Antivirus scan could not be completed; publication was blocked: (.+)$/s);
  if (match) {
    return `A verifica\u00e7\u00e3o antiv\u00edrus n\u00e3o p\u00f4de ser conclu\u00edda; a publica\u00e7\u00e3o foi bloqueada: ${match[1]}`;
  }
  return "";
}

function translateRequestError(message, language) {
  const text = String(message || "");
  if (language !== "pt") {
    return text;
  }
  const securityTranslation = translateSecurityError(text);
  if (securityTranslation) {
    return securityTranslation;
  }
  if (PORTUGUESE_ERRORS.has(text)) {
    return PORTUGUESE_ERRORS.get(text);
  }
  let match = text.match(/^(.+) is required\.$/);
  if (match) {
    return `O campo ${match[1]} é obrigatório.`;
  }
  match = text.match(/^(.+) must be a valid URL\.$/);
  if (match) {
    return `${match[1]} precisa ser uma URL válida.`;
  }
  match = text.match(/^(.+) must start with http or https\.$/);
  if (match) {
    return `${match[1]} precisa começar com http ou https.`;
  }
  match = text.match(/^Could not read plugin\.json from the repository: (.+)$/);
  if (match) {
    return `Não foi possível ler o plugin.json do repositório: ${match[1]}`;
  }
  match = text.match(/^The repository plugin\.json is invalid: (.+)$/);
  if (match) {
    return `O plugin.json do repositório é inválido: ${match[1]}`;
  }
  match = text.match(/^Could not inspect the repository snapshot: (.+)$/);
  if (match) {
    return `Não foi possível analisar a versão exata do repositório: ${match[1]}`;
  }
  if (text === "browser.download_target_script_file must point to a JavaScript file inside the plugin folder.") {
    return "browser.download_target_script_file precisa apontar para um arquivo JavaScript dentro da pasta do plugin.";
  }
  if (text === "browser.download_target_script_file was not found in the reviewed plugin files.") {
    return "O arquivo indicado por browser.download_target_script_file não foi encontrado entre os arquivos analisados do plugin.";
  }
  match = text.match(/^The request JSON is invalid: (.+)$/);
  if (match) {
    return `O JSON da solicitação é inválido: ${match[1]}`;
  }
  match = text.match(/^Plugin (.+) does not exist in the catalog\.$/);
  if (match) {
    return `O plugin ${match[1]} não existe no catálogo.`;
  }
  match = text.match(/^Host (.+) is already covered by plugin (.+)\.$/);
  if (match) {
    return `O host ${match[1]} já é atendido pelo plugin ${match[2]}.`;
  }
  match = text.match(/^the first public tag must be one of: (.+)$/);
  if (match) {
    return `A primeira tag pública deve ser uma destas: ${match[1]}`;
  }
  match = text.match(/^invalid catalog tag after language: (.+)\. Allowed types: (.+)$/);
  if (match) {
    return `Tag de catálogo inválida depois do idioma: ${match[1]}. Tipos permitidos: ${match[2]}`;
  }
  return `Erro de validação: ${text}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readEvent() {
  if (env.PLUGIN_HUB_EVENT_JSON) {
    return JSON.parse(env.PLUGIN_HUB_EVENT_JSON);
  }
  if (!env.GITHUB_EVENT_PATH) {
    throw new Error("GITHUB_EVENT_PATH was not provided.");
  }
  return JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
}

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function cleanText(value, field, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  return text.slice(0, maxLength);
}

function optionalText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeId(value) {
  const id = cleanText(value, "id", 64).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(id)) {
    throw new Error("id must use only lowercase letters, numbers, dots, dashes, or underscores.");
  }
  return id;
}

function validateHttpUrl(value, field) {
  const raw = cleanText(value, field, 500);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${field} must be a valid URL.`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${field} must start with http or https.`);
  }
  return url.toString();
}

function validateGitHubRepository(value) {
  const raw = validateHttpUrl(value, "repository_url");
  const url = new URL(raw);
  if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
    throw new Error("repository_url must point to github.com.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("repository_url must include an owner and repository.");
  }
  return `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
}

function repositoryOwner(value) {
  const url = new URL(value);
  return url.pathname.split("/").filter(Boolean)[0] || "";
}

function normalizeHost(value) {
  const host = String(value || "").trim().toLowerCase().replace(/^www\./, "");
  return host.replace(/:\d+$/, "");
}

function hostFromUrl(value) {
  try {
    return normalizeHost(new URL(String(value || "")).hostname);
  } catch {
    return "";
  }
}

function normalizeRef(value) {
  const ref = optionalText(value || "main", 120) || "main";
  if (!/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes("..")) {
    throw new Error("Invalid repository_ref.");
  }
  return ref;
}

function normalizePluginPath(value) {
  const clean = optionalText(value, 240)
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/plugin\.json$/i, "");
  const normalized = clean === "." ? "" : clean;
  if (normalized.includes("..")) {
    throw new Error("Invalid plugin_path.");
  }
  return normalized;
}

function normalizeStatus(value) {
  const status = optionalText(value || "active", 20).toLowerCase();
  return ["active", "broken", "hidden", "removed", "missing"].includes(status) ? status : "active";
}

function acceptsCurrentCatalogRules(issue) {
  const body = String(issue && issue.body || "");
  return body.toLowerCase().includes(POLICY_ACCEPTANCE_MARKER)
    || /^Catalog rules accepted:\s*yes\s*$/im.test(body)
    || /^Regras do catálogo aceitas:\s*sim\s*$/im.test(body);
}

function requireCurrentCatalogRules(issue) {
  if (!acceptsCurrentCatalogRules(issue)) {
    throw new Error(POLICY_ACCEPTANCE_ERROR);
  }
}

function sameList(a, b) {
  return JSON.stringify((Array.isArray(a) ? a : []).slice().sort()) === JSON.stringify((Array.isArray(b) ? b : []).slice().sort());
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : ["community"];
  const output = [];
  const seen = new Set();
  for (const rawTag of rawTags) {
    const tag = optionalText(rawTag, 30).toLowerCase();
    if (!tag || seen.has(tag)) {
      continue;
    }
    if (!/^[a-z0-9._-]+$/.test(tag)) {
      throw new Error("tags must use lowercase letters, numbers, dots, dashes, or underscores.");
    }
    if (tag !== "official" && tag !== "community") {
      if (!PUBLIC_TAGS.has(tag)) {
        continue;
      }
      const publicCount = output.filter((item) => item !== "official" && item !== "community").length;
      if (publicCount >= MAX_PUBLIC_TAGS) {
        continue;
      }
    }
    seen.add(tag);
    output.push(tag);
  }
  const publicTags = output.filter((tag) => tag !== "official" && tag !== "community");
  if (publicTags.length < MIN_PUBLIC_TAGS) {
    throw new Error("tags must include at least 2 public tags: language first, then type.");
  }
  if (!LANGUAGE_TAGS.has(publicTags[0])) {
    throw new Error(`the first public tag must be one of: ${OFFICIAL_LANGUAGE_TAGS.join(", ")}.`);
  }
  const contentTags = publicTags.slice(1);
  const invalidTag = contentTags.find((tag) => !TYPE_TAGS.has(tag));
  if (invalidTag) {
    throw new Error(`invalid catalog tag after language: ${invalidTag}. Allowed types: ${OFFICIAL_TYPE_TAGS.join(", ")}.`);
  }
  if (!contentTags.length) {
    throw new Error("tags must include at least 2 public tags: language first, then type.");
  }
  if (contentTags.length > MAX_TYPE_TAGS) {
    throw new Error("tags may include at most 3 content types.");
  }
  return output;
}

function extractJson(body) {
  const text = String(body || "");
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!raw || !raw.trim()) {
    throw new Error("Could not find a JSON block in the request.");
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("The request JSON is invalid: " + error.message);
  }
}

function rawPluginJsonUrl(repositoryUrl, ref, pluginPath) {
  const url = new URL(repositoryUrl);
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  const manifestPath = [pluginPath, "plugin.json"].filter(Boolean).join("/");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${manifestPath}`;
}

function repositoryCoordinates(repositoryUrl) {
  const url = new URL(repositoryUrl);
  const [owner, repository] = url.pathname.split("/").filter(Boolean);
  return { owner, repository: String(repository || "").replace(/\.git$/i, "") };
}

async function fetchPublicGitHubJson(repositoryUrl, requestPath) {
  const coordinates = repositoryCoordinates(repositoryUrl);
  const ownRepository = String(env.GITHUB_REPOSITORY || "").toLowerCase();
  const targetRepository = `${coordinates.owner}/${coordinates.repository}`.toLowerCase();
  const url = `https://api.github.com/repos/${coordinates.owner}/${coordinates.repository}${requestPath}`;
  const request = async (withAuthorization) => {
    const headers = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "kapitomo-plugin-hub",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (withAuthorization && env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    }
    return fetch(url, { headers });
  };

  let response = await request(Boolean(env.GITHUB_TOKEN));
  if (env.GITHUB_TOKEN && targetRepository !== ownRepository && [403, 404].includes(response.status)) {
    response = await request(false);
  }
  if (!response.ok) {
    const error = new Error(`Could not inspect the repository snapshot: GitHub API HTTP ${response.status}.`);
    error.status = response.status;
    error.transientRepositoryFailure = response.status === 403 || response.status === 429 || response.status >= 500;
    throw error;
  }
  return response.json();
}

function safeRepositoryFilePath(relativePath) {
  const value = String(relativePath || "");
  if (!value || value.includes("\\") || value.includes("\0") || value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Plugin security review blocked publication:\n- ${value || "(empty path)"} [unsafe-path] the repository contains an unsafe file path`);
  }
  return value;
}

function securityFinding(filePath, line, code, reason, detail = "") {
  const location = line ? `${filePath}:${line}` : filePath;
  return `- ${location} [${code}] ${reason}${detail ? `: ${detail}` : ""}`;
}

function throwSecurityFindings(findings) {
  if (findings.length) {
    const visible = findings.slice(0, SECURITY_SCAN_MAX_FINDINGS);
    if (findings.length > visible.length) {
      visible.push(`- ... and ${findings.length - visible.length} more finding(s)`);
    }
    throw new Error(`Plugin security review blocked publication:\n${visible.join("\n")}`);
  }
}

function isAllowedPublishedFile(filePath) {
  const basename = path.posix.basename(filePath).toLowerCase();
  const extension = path.posix.extname(basename);
  if (SECURITY_BLOCKED_FILENAMES.has(basename) || SECURITY_BLOCKED_EXTENSIONS.has(extension)) return false;
  if (SECURITY_ALLOWED_FILENAMES.has(basename)) return true;
  if (!extension) return SECURITY_ALLOWED_EXTENSIONLESS.has(basename);
  return SECURITY_TEXT_EXTENSIONS.has(extension) || SECURITY_IMAGE_EXTENSIONS.has(extension);
}

function imageSignatureMatches(extension, buffer) {
  const hex = buffer.subarray(0, 16).toString("hex");
  if (extension === ".png") return hex.startsWith("89504e470d0a1a0a");
  if ([".jpg", ".jpeg"].includes(extension)) return hex.startsWith("ffd8ff");
  if (extension === ".gif") return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
  if (extension === ".webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (extension === ".ico") return hex.startsWith("00000100");
  return false;
}

function declaredSecurityHosts(plugin, manifest) {
  const hosts = new Set(pluginHostsFromManifest(plugin, manifest));
  const iconHost = hostFromUrl(manifest && manifest.browser && manifest.browser.icon_url);
  if (iconHost) hosts.add(iconHost);
  return Array.from(hosts);
}

function hostIsDeclared(host, declaredHosts) {
  const clean = normalizeHost(host);
  return declaredHosts.some((declared) => clean === declared || clean.endsWith(`.${declared}`));
}

function analyzePublishedPluginFiles(files, plugin, manifest) {
  const findings = [];
  const declaredHosts = declaredSecurityHosts(plugin, manifest);
  const scriptExtensions = new Set([".cjs", ".js", ".mjs", ".ts"]);
  for (const file of files) {
    const filePath = safeRepositoryFilePath(file.path);
    const basename = path.posix.basename(filePath).toLowerCase();
    const extension = path.posix.extname(basename);
    if (!isAllowedPublishedFile(filePath)) {
      findings.push(securityFinding(filePath, 0, "forbidden-file", "the file type is not accepted in a published plugin"));
      continue;
    }
    if (SECURITY_IMAGE_EXTENSIONS.has(extension)) {
      if (!imageSignatureMatches(extension, file.content)) findings.push(securityFinding(filePath, 0, "invalid-image", "binary content does not match the declared image type"));
      continue;
    }
    if (file.content.includes(0)) {
      findings.push(securityFinding(filePath, 0, "unexpected-binary", "binary content is not accepted for this file type"));
      continue;
    }
    const source = file.content.toString("utf8");
    if (source.startsWith("#!")) {
      findings.push(securityFinding(filePath, 1, "executable-script", "files marked as operating-system executables are not accepted"));
      continue;
    }
    if (source.startsWith("version https://git-lfs.github.com/spec/v1")) {
      findings.push(securityFinding(filePath, 1, "git-lfs", "Git LFS pointers are not accepted because their payload was not scanned"));
      continue;
    }
    if (!scriptExtensions.has(extension)) continue;
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) continue;
      if (line.length > 12000) findings.push(securityFinding(filePath, index + 1, "minified-code", "minified or excessively long code requires manual review"));
      for (const rule of SECURITY_CODE_RULES) {
        if (rule.pattern.test(line)) findings.push(securityFinding(filePath, index + 1, rule.code, rule.reason));
      }
      if (/\bfetch\s*\(|\.open\s*\(\s*["'](?:GET|POST|PUT|PATCH|DELETE)["']/i.test(line)) {
        const urls = line.match(/https?:\/\/[^\s"'`)\\]+/gi) || [];
        for (const rawUrl of urls) {
          try {
            const targetHost = normalizeHost(new URL(rawUrl).hostname);
            if (targetHost && !hostIsDeclared(targetHost, declaredHosts)) findings.push(securityFinding(filePath, index + 1, "undeclared-network-host", "a network request targets an undeclared host", targetHost));
          } catch {}
        }
      }
    }
  }
  throwSecurityFindings(findings);
  return { fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.content.length, 0) };
}

function runAntivirusScan(scanRoot, runner = spawnSync) {
  const result = runner("clamscan", ["--recursive", "--infected", "--no-summary", "--official-db-only=yes", "--fail-if-cvd-older-than=3", "--follow-dir-symlinks=0", "--follow-file-symlinks=0", "--max-files=60", "--max-filesize=3M", "--max-scansize=12M", scanRoot], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  const output = String(result && (result.stdout || result.stderr) || "").trim().slice(0, 2000);
  if (result && result.status === 0) return;
  if (result && result.status === 1) throw new Error(`Antivirus scan found malware: ${output || "ClamAV reported an infected file."}`);
  const reason = result && result.error ? result.error.message : output || `ClamAV exited with status ${result && result.status}.`;
  throw new Error(`Antivirus scan could not be completed; publication was blocked: ${reason}`);
}

async function downloadRepositorySnapshot(plugin) {
  const commit = await fetchPublicGitHubJson(plugin.repository_url, `/commits/${encodeURIComponent(plugin.repository_ref)}`);
  const commitSha = String(commit && commit.sha || "");
  const treeSha = String(commit && commit.commit && commit.commit.tree && commit.commit.tree.sha || "");
  if (!/^[a-f0-9]{40}$/i.test(commitSha) || !/^[a-f0-9]{40}$/i.test(treeSha)) throw new Error("Could not inspect the repository snapshot: GitHub returned an invalid commit or tree.");
  const tree = await fetchPublicGitHubJson(plugin.repository_url, `/git/trees/${treeSha}?recursive=1`);
  if (tree && tree.truncated) throw new Error("Plugin security review blocked publication:\n- repository [repository-too-large] the repository tree is too large to review completely");
  const prefix = plugin.plugin_path ? `${plugin.plugin_path}/` : "";
  const entries = Array.isArray(tree && tree.tree) ? tree.tree.filter((entry) => prefix ? String(entry && entry.path || "").startsWith(prefix) : true) : [];
  const findings = [];
  const blobs = [];
  let declaredBytes = 0;
  const seenPaths = new Set();
  for (const entry of entries) {
    const relativePath = prefix ? String(entry.path).slice(prefix.length) : String(entry.path);
    if (!relativePath) continue;
    safeRepositoryFilePath(relativePath);
    const comparisonPath = relativePath.toLowerCase();
    if (seenPaths.has(comparisonPath)) {
      findings.push(securityFinding(relativePath, 0, "path-collision", "file paths must also be unique when letter case is ignored"));
      continue;
    }
    seenPaths.add(comparisonPath);
    if (entry.type === "tree") continue;
    if (entry.type !== "blob" || entry.mode === "120000" || entry.mode === "160000") {
      findings.push(securityFinding(relativePath, 0, "linked-content", "symbolic links and submodules are not accepted"));
      continue;
    }
    if (entry.mode === "100755") {
      findings.push(securityFinding(relativePath, 0, "executable-mode", "files marked as operating-system executables are not accepted"));
      continue;
    }
    const size = Number(entry.size || 0);
    if (!Number.isSafeInteger(size) || size < 0 || size > SECURITY_SCAN_MAX_FILE_BYTES) {
      findings.push(securityFinding(relativePath, 0, "file-too-large", `each file must be no larger than ${SECURITY_SCAN_MAX_FILE_BYTES} bytes`));
      continue;
    }
    declaredBytes += size;
    blobs.push({ path: relativePath, sha: String(entry.sha || ""), size });
  }
  if (!blobs.length) findings.push(securityFinding(plugin.plugin_path || "repository", 0, "empty-plugin", "no plugin files were found at plugin_path"));
  if (blobs.length > SECURITY_SCAN_MAX_FILES) findings.push(securityFinding(plugin.plugin_path || "repository", 0, "too-many-files", `a published plugin may contain at most ${SECURITY_SCAN_MAX_FILES} files`));
  if (declaredBytes > SECURITY_SCAN_MAX_TOTAL_BYTES) findings.push(securityFinding(plugin.plugin_path || "repository", 0, "plugin-too-large", `a published plugin may contain at most ${SECURITY_SCAN_MAX_TOTAL_BYTES} bytes`));
  throwSecurityFindings(findings);
  const files = [];
  for (const blob of blobs) {
    const payload = await fetchPublicGitHubJson(plugin.repository_url, `/git/blobs/${blob.sha}`);
    if (!payload || payload.encoding !== "base64" || typeof payload.content !== "string") throw new Error(`Could not inspect the repository snapshot: GitHub did not return file content for ${blob.path}.`);
    const content = Buffer.from(payload.content.replace(/\s/g, ""), "base64");
    const objectHash = crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
    if (content.length !== blob.size || objectHash !== blob.sha) throw new Error(`Could not inspect the repository snapshot: content verification failed for ${blob.path}.`);
    files.push({ path: blob.path, content });
  }
  return { commitSha: commitSha.toLowerCase(), files };
}

async function reviewRepositorySecurity(plugin, options = {}) {
  const snapshot = options.snapshot || await downloadRepositorySnapshot(plugin);
  const manifestFile = snapshot.files.find((file) => file.path.toLowerCase() === "plugin.json");
  if (!manifestFile) throw new Error("Could not read plugin.json from the repository: HTTP 404.");
  let manifest;
  try {
    manifest = JSON.parse(manifestFile.content.toString("utf8"));
  } catch (error) {
    throw new Error("The repository plugin.json is invalid: " + error.message);
  }
  const analysis = analyzePublishedPluginFiles(snapshot.files, plugin, manifest);
  const scanRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kapitomo-plugin-scan-"));
  try {
    for (const file of snapshot.files) {
      const target = path.resolve(scanRoot, ...file.path.split("/"));
      const relative = path.relative(scanRoot, target);
      if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Plugin security review blocked publication:\n- repository [unsafe-path] the repository contains an unsafe file path");
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content, { flag: "wx" });
    }
    (options.antivirusScan || runAntivirusScan)(scanRoot);
  } finally {
    fs.rmSync(scanRoot, { recursive: true, force: true });
  }
  return { ...analysis, manifest, commitSha: snapshot.commitSha, filePaths: snapshot.files.map((file) => file.path) };
}

function pluginHostsFromManifest(plugin, manifest) {
  const hosts = new Set();
  const matchHosts = manifest && manifest.match && Array.isArray(manifest.match.hosts) ? manifest.match.hosts : [];
  for (const host of matchHosts) {
    const clean = normalizeHost(host);
    if (clean) {
      hosts.add(clean);
    }
  }
  [
    manifest && manifest.browser && manifest.browser.home_url,
    plugin.homepage,
    plugin.site_url
  ].forEach((url) => {
    const host = hostFromUrl(url);
    if (host) {
      hosts.add(host);
    }
  });
  return Array.from(hosts).sort();
}

async function fetchRepositoryManifest(plugin) {
  const headers = {
    "Accept": "application/json",
    "User-Agent": "kapitomo-plugin-hub"
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  const response = await fetch(rawPluginJsonUrl(plugin.repository_url, plugin.repository_ref, plugin.plugin_path), {
    headers
  });
  if (!response.ok) {
    const error = new Error(`Could not read plugin.json from the repository: HTTP ${response.status}.`);
    error.status = response.status;
    error.transientRepositoryFailure = response.status === 403
      || response.status === 429
      || response.status >= 500;
    throw error;
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error("The repository plugin.json is invalid: " + error.message);
  }
}

function normalizePlugin(input) {
  const siteUrl = input.site_url || input.homepage;
  const homepage = input.homepage || siteUrl;
  return {
    id: normalizeId(input.id),
    name: cleanText(input.name || input.id, "name", 80),
    description: cleanText(input.description, "description", 220),
    author: cleanText(input.author, "author", 80),
    version: cleanText(input.version, "version", 40),
    site_url: validateHttpUrl(siteUrl, "site_url"),
    homepage: validateHttpUrl(homepage, "homepage"),
    icon_url: validateHttpUrl(input.icon_url, "icon_url"),
    repository_url: validateGitHubRepository(input.repository_url),
    repository_ref: normalizeRef(input.repository_ref),
    plugin_path: normalizePluginPath(input.plugin_path),
    tags: normalizeTags(input.tags),
    hosts: Array.isArray(input.hosts) ? input.hosts.map(normalizeHost).filter(Boolean).sort() : [],
    status: normalizeStatus(input.status)
  };
}

async function validateRepositoryPlugin(plugin, reviewedManifest, reviewedFilePaths = []) {
  const manifest = reviewedManifest || await fetchRepositoryManifest(plugin);
  if (normalizeId(manifest.id || plugin.id) !== plugin.id) {
    throw new Error("The plugin.json id does not match the request id.");
  }
  if (manifest.version && String(manifest.version).trim() !== plugin.version) {
    throw new Error("The request version does not match plugin.json.");
  }
  if (!manifest.browser || !manifest.browser.icon_url) {
    throw new Error("plugin.json must declare browser.icon_url.");
  }
  if (manifest.browser.download_target_script_file) {
    const scriptPath = String(manifest.browser.download_target_script_file).replace(/\\/g, "/").replace(/^\/+/, "");
    if (!/^[A-Za-z0-9._/-]+\.js$/i.test(scriptPath) || scriptPath.includes("..")) {
      throw new Error("browser.download_target_script_file must point to a JavaScript file inside the plugin folder.");
    }
    if (reviewedFilePaths.length && !reviewedFilePaths.includes(scriptPath)) {
      throw new Error("browser.download_target_script_file was not found in the reviewed plugin files.");
    }
  }
  const manifestTags = normalizeTags(manifest.tags);
  const requestTags = plugin.tags.filter((tag) => tag !== "official" && tag !== "community");
  const repositoryTags = manifestTags.filter((tag) => tag !== "official" && tag !== "community");
  if (requestTags.join("|") !== repositoryTags.join("|")) {
    plugin.tags = manifestTags;
  }
  plugin.hosts = pluginHostsFromManifest(plugin, manifest);
  if (!plugin.hosts.length) {
    throw new Error("plugin.json must declare match.hosts or browser.home_url.");
  }
  return manifest;
}

function loadCatalog() {
  const source = CATALOG_PATHS.find((catalogPath) => fs.existsSync(catalogPath));
  if (!source) {
    throw new Error("Plugin catalog was not found.");
  }
  const catalog = JSON.parse(fs.readFileSync(source, "utf8"));
  if (!Array.isArray(catalog.plugins)) {
    catalog.plugins = [];
  }
  return catalog;
}

function writeCatalogs(catalog) {
  catalog.schema_version = 3;
  catalog.publish_model = "github-repository";
  catalog.catalog_revision = "20260908-security-review";
  catalog.rules_url = "https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules";
  const text = JSON.stringify(catalog, null, 2) + "\n";
  for (const catalogPath of CATALOG_PATHS) {
    fs.writeFileSync(catalogPath, text, "utf8");
  }
}

async function hostsForCatalogPlugin(plugin) {
  const stored = Array.isArray(plugin.hosts) ? plugin.hosts.map(normalizeHost).filter(Boolean) : [];
  if (stored.length) {
    return stored;
  }
  try {
    return pluginHostsFromManifest(plugin, await fetchRepositoryManifest(plugin));
  } catch {
    return [hostFromUrl(plugin.homepage), hostFromUrl(plugin.site_url)].filter(Boolean);
  }
}

async function findDuplicateHost(catalog, plugin) {
  const newHosts = new Set(plugin.hosts || []);
  for (const existing of catalog.plugins) {
    if (String(existing.id || "").toLowerCase() === plugin.id) {
      continue;
    }
    if (["hidden", "removed", "missing"].includes(normalizeStatus(existing.status))) {
      continue;
    }
    const existingHosts = await hostsForCatalogPlugin(existing);
    const shared = existingHosts.find((host) => newHosts.has(host));
    if (shared) {
      return { plugin: existing, host: shared };
    }
  }
  return null;
}

function sortPlugins(plugins) {
  return sortCatalogPlugins(plugins);
}

function publicationDate(existing, timestamp = nowIso()) {
  return existing && existing.published_at ? existing.published_at : timestamp;
}

function requireOfficialAuthorization(plugin, existing, maintainer) {
  const requestsOfficialTag = Array.isArray(plugin && plugin.tags) && plugin.tags.includes("official");
  const changesOfficialPlugin = Array.isArray(existing && existing.tags) && existing.tags.includes("official");
  if (!maintainer && (requestsOfficialTag || changesOfficialPlugin)) {
    throw new Error("Official plugins can only be changed by a maintainer.");
  }
}

function isMaintainer(actor) {
  return MAINTAINERS.has(String(actor || "").toLowerCase());
}

async function publishPlugin(issue) {
  const language = issueLanguage(issue);
  const plugin = normalizePlugin(extractJson(issue.body));
  const actor = String(issue.user && issue.user.login || "").trim();
  const maintainer = isMaintainer(actor);
  if (!maintainer && repositoryOwner(plugin.repository_url).toLowerCase() !== actor.toLowerCase()) {
    throw new Error("The request author must own the plugin repository.");
  }
  requireCurrentCatalogRules(issue);

  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === plugin.id);
  requireOfficialAuthorization(plugin, existing, maintainer);
  if (existing && !maintainer && repositoryOwner(existing.repository_url).toLowerCase() !== actor.toLowerCase()) {
    throw new Error("Only the current plugin repository owner or a maintainer can update this plugin.");
  }
  const existingStatus = existing ? normalizeStatus(existing.status) : "active";
  const removedByRequester = existingStatus === "removed"
    && String(existing.moderated_by || "").toLowerCase() === actor.toLowerCase();
  if (existing && !maintainer && (existingStatus === "hidden" || (existingStatus === "removed" && !removedByRequester))) {
    throw new Error("This catalog entry is under moderation review. The creator may submit corrections, and a maintainer must review them before the listing returns to the catalog.");
  }
  const securityReview = await reviewRepositorySecurity(plugin);
  plugin.repository_ref = securityReview.commitSha;
  await validateRepositoryPlugin(plugin, securityReview.manifest, securityReview.filePaths);
  if (!maintainer) {
    plugin.author = actor;
  }
  const duplicate = await findDuplicateHost(catalog, plugin);
  if (duplicate) {
    throw new Error(`Host ${duplicate.host} is already covered by plugin ${duplicate.plugin.id || duplicate.plugin.name}.`);
  }

  if (existing && Array.isArray(existing.tags) && existing.tags.includes("official") && !plugin.tags.includes("official")) {
    plugin.tags = ["official", ...plugin.tags.filter((tag) => tag !== "official")];
  }
  plugin.status = "active";
  plugin.consecutive_failures = 0;
  plugin.last_error = "";
  plugin.published_at = publicationDate(existing);
  plugin.last_checked_at = nowIso();

  catalog.plugins = sortPlugins([
    ...catalog.plugins.filter((item) => String(item.id || "").toLowerCase() !== plugin.id),
    plugin
  ]);
  if (!dryRun) {
    writeCatalogs(catalog);
  }
  return {
    title: `Publish plugin ${plugin.id}`,
    message: language === "pt"
      ? `O plugin **${plugin.name}** foi publicado no catálogo.\n\nVersão: \`${plugin.version}\`\nRepositório: ${plugin.repository_url}`
      : `Plugin **${plugin.name}** was published to the catalog.\n\nVersion: \`${plugin.version}\`\nRepository: ${plugin.repository_url}`
  };
}

function removalIdFromIssue(issue) {
  const body = String(issue.body || "");
  const match = body.match(/Plugin ID:\s*([a-z0-9._-]+)/i) || String(issue.title || "").match(/\[plugin-remove\]\s*([a-z0-9._-]+)/i);
  if (!match) {
    throw new Error("Enter the plugin ID to remove.");
  }
  return normalizeId(match[1]);
}

async function removePlugin(issue) {
  const language = issueLanguage(issue);
  const id = removalIdFromIssue(issue);
  const actor = String(issue.user && issue.user.login || "").trim();
  const maintainer = isMaintainer(actor);
  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === id);
  if (!existing) {
    throw new Error(`Plugin ${id} does not exist in the catalog.`);
  }
  if (Array.isArray(existing.tags) && existing.tags.includes("official") && !maintainer) {
    throw new Error("Official plugins can only be removed by a maintainer.");
  }
  if (!maintainer && repositoryOwner(existing.repository_url).toLowerCase() !== actor.toLowerCase()) {
    throw new Error("Only the plugin repository owner or a maintainer can remove this plugin.");
  }

  catalog.plugins = catalog.plugins.map((item) => {
    if (String(item.id || "").toLowerCase() !== id) {
      return item;
    }
    return {
      ...item,
      status: "removed",
      removed_at: nowIso(),
      moderation_action: "remove",
      moderation_reason: "creator-or-maintainer-request",
      moderated_by: actor,
      moderated_at: nowIso()
    };
  });
  if (!dryRun) {
    writeCatalogs(catalog);
  }
  return {
    title: `Remove plugin ${id}`,
    message: language === "pt"
      ? `O plugin **${existing.name || id}** foi marcado como removido do catálogo.`
      : `Plugin **${existing.name || id}** was marked as removed from the catalog.`
  };
}

function issueField(issue, name) {
  const body = String(issue && issue.body || "");
  const match = body.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
  return match ? String(match[1] || "").trim() : "";
}

async function moderatePlugin(issue) {
  const language = issueLanguage(issue);
  const actor = String(issue.user && issue.user.login || "").trim();
  if (!isMaintainer(actor)) {
    throw new Error("Only a maintainer can moderate catalog plugins.");
  }

  const id = normalizeId(issueField(issue, "Plugin ID"));
  const action = optionalText(issueField(issue, "Action"), 20).toLowerCase();
  const reason = optionalText(issueField(issue, "Reason"), 500);
  if (!["hide", "restore", "remove"].includes(action)) {
    throw new Error("Moderation action must be hide, restore, or remove.");
  }
  if (!reason) {
    throw new Error("Moderation reason is required.");
  }

  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === id);
  if (!existing) {
    throw new Error(`Plugin ${id} does not exist in the catalog.`);
  }

  let restoredHealth = null;
  if (action === "restore") {
    restoredHealth = await validatePluginHealth(existing);
  }
  const timestamp = nowIso();
  catalog.plugins = catalog.plugins.map((item) => {
    if (String(item.id || "").toLowerCase() !== id) {
      return item;
    }
    const updated = {
      ...item,
      status: action === "hide" ? "hidden" : action === "remove" ? "removed" : "active",
      moderation_action: action,
      moderation_reason: reason,
      moderated_by: actor,
      moderated_at: timestamp
    };
    if (action === "hide") {
      updated.hidden_at = timestamp;
      delete updated.removed_at;
    } else if (action === "remove") {
      updated.removed_at = timestamp;
      delete updated.hidden_at;
    } else {
      updated.consecutive_failures = 0;
      updated.last_error = "";
      updated.last_checked_at = timestamp;
      updated.hosts = restoredHealth.hosts;
      delete updated.hidden_at;
      delete updated.removed_at;
    }
    return updated;
  });
  catalog.plugins = sortPlugins(catalog.plugins);
  if (!dryRun) {
    writeCatalogs(catalog);
  }

  const actionLabel = language === "pt"
    ? { hide: "ocultado", restore: "restaurado", remove: "removido" }[action]
    : { hide: "hidden", restore: "restored", remove: "removed" }[action];
  return {
    title: `Moderate plugin ${id}: ${action}`,
    message: language === "pt"
      ? `O plugin **${existing.name || id}** foi ${actionLabel}.\n\nMotivo: ${reason}`
      : `Plugin **${existing.name || id}** was ${actionLabel}.\n\nReason: ${reason}`
  };
}

async function checkUrl(url, field, options = {}) {
  const target = validateHttpUrl(url, field);
  const response = await fetch(target, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    },
    redirect: "follow"
  });
  if (options.allowForbidden && response.status === 403) {
    return;
  }
  if (!response.ok) {
    throw new Error(`${field} HTTP ${response.status}`);
  }
}

async function validatePluginHealth(plugin) {
  const manifest = await fetchRepositoryManifest(plugin);
  if (!manifest.browser || !manifest.browser.icon_url) {
    throw new Error("plugin.json is missing browser.icon_url.");
  }
  const homeUrl = manifest.browser.home_url || plugin.homepage || plugin.site_url;
  await checkUrl(homeUrl, "browser.home_url", { allowForbidden: true });
  await checkUrl(manifest.browser.icon_url, "browser.icon_url", { allowForbidden: true });
  return {
    manifest,
    hosts: pluginHostsFromManifest(plugin, manifest)
  };
}

async function checkPluginHealth() {
  const catalog = loadCatalog();
  let changed = false;
  const checkedPlugins = [];
  for (const plugin of catalog.plugins) {
    if (["hidden", "removed"].includes(normalizeStatus(plugin.status))) {
      checkedPlugins.push(plugin);
      continue;
    }
    try {
      const health = await validatePluginHealth(plugin);
      const needsUpdate = normalizeStatus(plugin.status) !== "active"
        || Number(plugin.consecutive_failures || 0) !== 0
        || Boolean(plugin.last_error)
        || !sameList(plugin.hosts, health.hosts);
      if (needsUpdate) {
        plugin.status = "active";
        plugin.consecutive_failures = 0;
        plugin.last_error = "";
        plugin.last_checked_at = nowIso();
        plugin.hosts = health.hosts;
        changed = true;
      }
      checkedPlugins.push(plugin);
    } catch (error) {
      if (error.status === 404 || error.status === 410) {
        plugin.consecutive_failures = Number(plugin.consecutive_failures || 0) + 1;
        plugin.last_error = error.message;
        plugin.last_checked_at = nowIso();
        if (plugin.consecutive_failures >= MISSING_AFTER_FAILURES) {
          const timestamp = nowIso();
          plugin.status = "removed";
          plugin.removed_at = timestamp;
          plugin.moderation_action = "remove";
          plugin.moderation_reason = "repository-or-plugin-manifest-missing";
          plugin.moderated_by = "plugin-hub-health-check";
          plugin.moderated_at = timestamp;
        } else {
          plugin.status = "broken";
        }
        checkedPlugins.push(plugin);
        changed = true;
        continue;
      }
      if (error.transientRepositoryFailure) {
        checkedPlugins.push(plugin);
        continue;
      }
      plugin.consecutive_failures = Number(plugin.consecutive_failures || 0) + 1;
      plugin.last_error = error.message;
      plugin.last_checked_at = nowIso();
      if (plugin.consecutive_failures >= BROKEN_AFTER_FAILURES) {
        plugin.status = "broken";
      }
      checkedPlugins.push(plugin);
      changed = true;
    }
  }
  catalog.plugins = checkedPlugins;
  catalog.plugins = sortPlugins(catalog.plugins);
  if (changed && !dryRun) {
    writeCatalogs(catalog);
  }
  const broken = catalog.plugins.filter((plugin) => normalizeStatus(plugin.status) === "broken");
  return {
    title: "Check plugin health",
    message: broken.length
      ? `Plugin health check finished. Broken plugins: ${broken.map((plugin) => plugin.name || plugin.id).join(", ")}.`
      : "Plugin health check finished. No broken plugins."
  };
}

function hasStagedChanges(cwd = process.cwd()) {
  try {
    execFileSync("git", ["diff", "--cached", "--quiet"], { cwd });
    return false;
  } catch {
    return true;
  }
}

function copyCatalogsTo(targetRoot) {
  for (const catalogPath of CATALOG_PATHS) {
    const target = path.join(targetRoot, catalogPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(catalogPath, target);
  }
}

function syncPagesBranch(title, issueNumber) {
  const pagesBranch = env.PLUGIN_HUB_PAGES_BRANCH || "gh-pages";
  const tempRoot = path.join(os.tmpdir(), `kapitomo-plugin-pages-${process.pid}`);
  const workBranch = `plugin-hub-pages-sync-${process.pid}`;
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    run("git", ["fetch", "origin", pagesBranch]);
    run("git", ["worktree", "add", "-B", workBranch, tempRoot, `origin/${pagesBranch}`]);
    copyCatalogsTo(tempRoot);
    run("git", ["config", "user.name", "KapiTomo Plugin Hub"], { cwd: tempRoot });
    run("git", ["config", "user.email", "actions@github.com"], { cwd: tempRoot });
    run("git", ["add", ...CATALOG_PATHS], { cwd: tempRoot });
    if (!hasStagedChanges(tempRoot)) {
      return false;
    }
    run("git", ["commit", "-m", issueNumber ? `${title} on site (#${issueNumber})` : `${title} on site`], { cwd: tempRoot });
    run("git", ["push", "origin", `HEAD:${pagesBranch}`], { cwd: tempRoot });
    return true;
  } finally {
    try {
      run("git", ["worktree", "remove", "--force", tempRoot]);
    } catch {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
    try {
      run("git", ["branch", "-D", workBranch]);
    } catch {
    }
  }
}

function commitAndPush(title, issueNumber) {
  run("git", ["config", "user.name", "KapiTomo Plugin Hub"]);
  run("git", ["config", "user.email", "actions@github.com"]);
  run("git", ["add", ...CATALOG_PATHS]);
  if (!hasStagedChanges()) {
    return false;
  }
  run("git", ["commit", "-m", issueNumber ? `${title} (#${issueNumber})` : title]);
  const mainBranch = env.PLUGIN_HUB_MAIN_BRANCH || "main";
  run("git", ["push", "origin", `HEAD:${mainBranch}`]);
  syncPagesBranch(title, issueNumber);
  return true;
}

async function githubRequest(requestPath, method, body) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) {
    return;
  }
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${requestPath}`, {
    method,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "kapitomo-plugin-hub"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error(`GitHub API HTTP ${response.status}: ${await response.text()}`);
  }
}

async function comment(issueNumber, body) {
  if (dryRun) {
    console.log(body);
    return;
  }
  await githubRequest(`/issues/${issueNumber}/comments`, "POST", { body });
}

async function closeIssue(issueNumber) {
  if (!dryRun) {
    await githubRequest(`/issues/${issueNumber}`, "PATCH", { state: "closed" });
  }
}

async function main() {
  const event = readEvent();
  const issue = event.issue;
  if (!issue) {
    const result = await checkPluginHealth();
    const changed = dryRun ? true : commitAndPush(result.title);
    console.log(`${result.message}\nStatus: ${changed ? "catalog updated" : "catalog was already up to date"}.`);
    return;
  }
  const title = String(issue.title || "");
  if (!title.startsWith("[plugin]") && !title.startsWith("[plugin-remove]")) {
    return;
  }
  const language = issueLanguage(issue);

  try {
    const moderationRequested = title.startsWith("[plugin-remove]") && Boolean(issueField(issue, "Action"));
    const result = moderationRequested
      ? await moderatePlugin(issue)
      : title.startsWith("[plugin-remove]")
        ? await removePlugin(issue)
        : await publishPlugin(issue);
    const changed = dryRun ? true : commitAndPush(result.title, issue.number);
    const status = language === "pt"
      ? (changed ? "catálogo atualizado" : "o catálogo já estava atualizado")
      : (changed ? "catalog updated" : "catalog was already up to date");
    await comment(issue.number, `${result.message}\n\nStatus: ${status}.`);
    await closeIssue(issue.number);
  } catch (error) {
    const errorMessage = translateRequestError(error.message, language);
    await comment(issue.number, language === "pt"
      ? `A solicitação não pôde ser concluída.\n\nErro: ${errorMessage}`
      : `The request could not be completed.\n\nError: ${errorMessage}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  OFFICIAL_LANGUAGE_TAGS,
  OFFICIAL_TYPE_TAGS,
  analyzePublishedPluginFiles,
  isAllowedPublishedFile,
  normalizeTags,
  publicationDate,
  requireOfficialAuthorization,
  reviewRepositorySecurity,
  runAntivirusScan,
  sortPlugins
};
