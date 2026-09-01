const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { sortCatalogPlugins } = require("../plugins/catalog-pagination.js");

const CATALOG_PATHS = ["plugins/catalog-store.json", "plugins/catalog.json"];
const MAINTAINERS = new Set(["nanquimori"]);
const BROKEN_AFTER_FAILURES = 2;
const MISSING_AFTER_FAILURES = 2;
const MAX_PUBLIC_TAGS = 4;
const MIN_PUBLIC_TAGS = 2;
const POLICY_ACCEPTANCE_MARKER = "plugin-hub-policy: accepted-v1";
const POLICY_ACCEPTANCE_ERROR = "The publication request must accept the current Plugin Hub catalog rules. Read https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules and add `Catalog rules accepted: yes` to the request.";
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
  "comic"
];
const LANGUAGE_TAGS = new Set(OFFICIAL_LANGUAGE_TAGS);
const TYPE_TAGS = new Set(OFFICIAL_TYPE_TAGS);
const PUBLIC_TAGS = new Set([...OFFICIAL_LANGUAGE_TAGS, ...OFFICIAL_TYPE_TAGS]);

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

function issueLanguage(issue) {
  const body = String(issue && issue.body || "");
  const marker = body.match(/plugin-hub-language:\s*(pt|en)\b/i);
  if (marker) {
    return marker[1].toLowerCase();
  }
  return /Solicitação|Repositório|catálogo|Confirmo que|Depois de enviar/i.test(body) ? "pt" : "en";
}

function translateRequestError(message, language) {
  const text = String(message || "");
  if (language !== "pt") {
    return text;
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
  match = text.match(/^invalid type tag after language: (.+)\. Allowed types: (.+)$/);
  if (match) {
    return `Tag de tipo inválida depois do idioma: ${match[1]}. Tipos permitidos: ${match[2]}`;
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
  const invalidType = publicTags.slice(1).find((tag) => !TYPE_TAGS.has(tag));
  if (invalidType) {
    throw new Error(`invalid type tag after language: ${invalidType}. Allowed types: ${OFFICIAL_TYPE_TAGS.join(", ")}.`);
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

async function validateRepositoryPlugin(plugin) {
  const manifest = await fetchRepositoryManifest(plugin);
  if (normalizeId(manifest.id || plugin.id) !== plugin.id) {
    throw new Error("The plugin.json id does not match the request id.");
  }
  if (manifest.version && String(manifest.version).trim() !== plugin.version) {
    throw new Error("The request version does not match plugin.json.");
  }
  if (!manifest.browser || !manifest.browser.icon_url) {
    throw new Error("plugin.json must declare browser.icon_url.");
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
  catalog.catalog_revision = "20260826-catalog-rules";
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
  if (existing && Array.isArray(existing.tags) && existing.tags.includes("official") && !maintainer) {
    throw new Error("Official plugins can only be changed by a maintainer.");
  }
  if (existing && !maintainer && repositoryOwner(existing.repository_url).toLowerCase() !== actor.toLowerCase()) {
    throw new Error("Only the current plugin repository owner or a maintainer can update this plugin.");
  }
  const existingStatus = existing ? normalizeStatus(existing.status) : "active";
  const removedByRequester = existingStatus === "removed"
    && String(existing.moderated_by || "").toLowerCase() === actor.toLowerCase();
  if (existing && !maintainer && (existingStatus === "hidden" || (existingStatus === "removed" && !removedByRequester))) {
    throw new Error("This catalog entry is under moderation review. The creator may submit corrections, and a maintainer must review them before the listing returns to the catalog.");
  }
  await validateRepositoryPlugin(plugin);
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
  publicationDate,
  sortPlugins
};
