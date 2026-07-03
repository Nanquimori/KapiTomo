const fs = require("fs");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const CATALOG_PATHS = ["plugins/catalog-store.json", "plugins/catalog.json"];
const MAX_PACKAGE_BYTES = 250 * 1024 * 1024;
const MAINTAINERS = new Set(["nanquimori"]);

const env = process.env;
const dryRun = env.PLUGIN_HUB_DRY_RUN === "1";

function readEvent() {
  if (env.PLUGIN_HUB_EVENT_JSON) {
    return JSON.parse(env.PLUGIN_HUB_EVENT_JSON);
  }
  if (!env.GITHUB_EVENT_PATH) {
    throw new Error("GITHUB_EVENT_PATH nao foi informado.");
  }
  return JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
}

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

function cleanText(value, field, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    throw new Error(`${field} e obrigatorio.`);
  }
  return text.slice(0, maxLength);
}

function optionalText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeId(value) {
  const id = cleanText(value, "id", 64).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(id)) {
    throw new Error("id precisa usar apenas letras minusculas, numeros, ponto, traco ou underline.");
  }
  return id;
}

function validateHttpUrl(value, field, options = {}) {
  const raw = cleanText(value, field, 500);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${field} precisa ser uma URL valida.`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${field} precisa comecar com http ou https.`);
  }
  if (options.zip && !/\.zip$/i.test(url.pathname)) {
    throw new Error(`${field} precisa apontar para um arquivo .zip.`);
  }
  return url.toString();
}

function extractJson(body) {
  const text = String(body || "");
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!raw || !raw.trim()) {
    throw new Error("Nao encontrei um bloco JSON na solicitacao.");
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("JSON da solicitacao esta invalido: " + error.message);
  }
}

function normalizePlugin(input) {
  const siteUrl = input.site_url || input.siteUrl || input.homepage || input.home_url || input.homeUrl;
  const homepage = input.homepage || siteUrl;
  const plugin = {
    id: normalizeId(input.id),
    name: cleanText(input.name || input.id, "name", 80),
    description: cleanText(input.description, "description", 220),
    author: cleanText(input.author, "author", 80),
    version: cleanText(input.version, "version", 40),
    site_url: validateHttpUrl(siteUrl, "site_url"),
    homepage: validateHttpUrl(homepage, "homepage"),
    icon_url: validateHttpUrl(input.icon_url || input.iconUrl, "icon_url"),
    package_url: validateHttpUrl(input.package_url || input.packageUrl || input.download, "package_url", { zip: true }),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => optionalText(tag, 30)).filter(Boolean).slice(0, 8) : ["comunidade"]
  };

  const sha256 = optionalText(input.sha256, 80).toLowerCase();
  if (sha256) {
    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error("sha256 precisa ter 64 caracteres hexadecimais.");
    }
    plugin.sha256 = sha256;
  }

  return plugin;
}

function loadCatalog() {
  const source = CATALOG_PATHS.find((path) => fs.existsSync(path));
  if (!source) {
    throw new Error("Catalogo de plugins nao encontrado.");
  }
  const catalog = JSON.parse(fs.readFileSync(source, "utf8"));
  if (!Array.isArray(catalog.plugins)) {
    catalog.plugins = [];
  }
  return catalog;
}

function writeCatalogs(catalog) {
  const text = JSON.stringify(catalog, null, 2) + "\n";
  for (const path of CATALOG_PATHS) {
    fs.writeFileSync(path, text, "utf8");
  }
}

function sortPlugins(plugins) {
  return plugins.slice().sort((a, b) => {
    const ao = Array.isArray(a.tags) && a.tags.includes("oficial") ? 0 : 1;
    const bo = Array.isArray(b.tags) && b.tags.includes("oficial") ? 0 : 1;
    if (ao !== bo) {
      return ao - bo;
    }
    return String(a.name || a.id).localeCompare(String(b.name || b.id), "pt-BR");
  });
}

function isMaintainer(actor) {
  return MAINTAINERS.has(String(actor || "").toLowerCase());
}

async function assertReachable(url, field) {
  const response = await fetch(url, { method: "HEAD", redirect: "follow" }).catch(() => null);
  if (response && response.ok) {
    return;
  }
  const fallback = await fetch(url, { method: "GET", redirect: "follow" }).catch((error) => {
    throw new Error(`${field} nao respondeu: ${error.message}`);
  });
  if (!fallback.ok) {
    throw new Error(`${field} respondeu HTTP ${fallback.status}.`);
  }
}

async function calculatePackageHash(url) {
  const response = await fetch(url, { method: "GET", redirect: "follow" });
  if (!response.ok) {
    throw new Error(`package_url respondeu HTTP ${response.status}.`);
  }
  const length = Number(response.headers.get("content-length") || "0");
  if (length > MAX_PACKAGE_BYTES) {
    throw new Error("package_url excede o limite de 250 MB.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_PACKAGE_BYTES) {
    throw new Error("package_url excede o limite de 250 MB.");
  }
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function publishPlugin(issue) {
  const plugin = normalizePlugin(extractJson(issue.body));
  await assertReachable(plugin.icon_url, "icon_url");
  plugin.sha256 = await calculatePackageHash(plugin.package_url);

  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === plugin.id);
  if (existing && Array.isArray(existing.tags) && existing.tags.includes("oficial") && !isMaintainer(issue.user && issue.user.login)) {
    throw new Error("Plugins oficiais so podem ser alterados por um mantenedor.");
  }

  catalog.plugins = sortPlugins([
    ...catalog.plugins.filter((item) => String(item.id || "").toLowerCase() !== plugin.id),
    plugin
  ]);
  if (!dryRun) {
    writeCatalogs(catalog);
  }
  return {
    title: `Publica plugin ${plugin.id}`,
    message: `Plugin **${plugin.name}** publicado no catalogo.\n\nVersao: \`${plugin.version}\`\nSHA-256: \`${plugin.sha256}\``
  };
}

function removalIdFromIssue(issue) {
  const body = String(issue.body || "");
  const match = body.match(/Plugin ID:\s*([a-z0-9._-]+)/i) || String(issue.title || "").match(/\[plugin-remover\]\s*([a-z0-9._-]+)/i);
  if (!match) {
    throw new Error("Informe o ID do plugin para remover.");
  }
  return normalizeId(match[1]);
}

async function removePlugin(issue) {
  const id = removalIdFromIssue(issue);
  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === id);
  if (!existing) {
    throw new Error(`Plugin ${id} nao existe no catalogo.`);
  }
  if (Array.isArray(existing.tags) && existing.tags.includes("oficial") && !isMaintainer(issue.user && issue.user.login)) {
    throw new Error("Plugins oficiais so podem ser removidos por um mantenedor.");
  }
  catalog.plugins = catalog.plugins.filter((item) => String(item.id || "").toLowerCase() !== id);
  if (!dryRun) {
    writeCatalogs(catalog);
  }
  return {
    title: `Remove plugin ${id}`,
    message: `Plugin **${existing.name || id}** removido do catalogo.`
  };
}

function hasStagedChanges() {
  try {
    execFileSync("git", ["diff", "--cached", "--quiet"]);
    return false;
  } catch {
    return true;
  }
}

function commitAndPush(title, issueNumber) {
  run("git", ["config", "user.name", "KapiTomo Plugin Hub"]);
  run("git", ["config", "user.email", "actions@github.com"]);
  run("git", ["add", ...CATALOG_PATHS]);
  if (!hasStagedChanges()) {
    return false;
  }
  run("git", ["commit", "-m", `${title} (#${issueNumber})`]);
  const mainBranch = env.PLUGIN_HUB_MAIN_BRANCH || "main";
  const pagesBranch = env.PLUGIN_HUB_PAGES_BRANCH || "gh-pages";
  run("git", ["push", "origin", `HEAD:${mainBranch}`]);
  run("git", ["push", "origin", `HEAD:${pagesBranch}`]);
  return true;
}

async function githubRequest(path, method, body) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) {
    return;
  }
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${path}`, {
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
    throw new Error("Evento sem issue.");
  }
  const title = String(issue.title || "");
  if (!title.startsWith("[plugin]") && !title.startsWith("[plugin-remover]")) {
    return;
  }

  try {
    const result = title.startsWith("[plugin-remover]")
      ? await removePlugin(issue)
      : await publishPlugin(issue);
    const changed = dryRun ? true : commitAndPush(result.title, issue.number);
    await comment(issue.number, `${result.message}\n\nStatus: ${changed ? "catalogo atualizado" : "catalogo ja estava atualizado"}.`);
    await closeIssue(issue.number);
  } catch (error) {
    await comment(issue.number, `Nao foi possivel concluir a solicitacao.\n\nErro: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
