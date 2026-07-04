const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const CATALOG_PATHS = ["plugins/catalog-store.json", "plugins/catalog.json"];
const MAINTAINERS = new Set(["nanquimori"]);
const APPROVAL_LABELS = new Set(["approved", "plugin-approved"]);
const BROKEN_AFTER_FAILURES = 2;
const MAX_PUBLIC_TAGS = 4;
const MIN_PUBLIC_TAGS = 2;
const LANGUAGE_TAGS = new Set([
  "portugues",
  "portuguese",
  "pt",
  "pt-br",
  "english",
  "ingles",
  "en",
  "spanish",
  "espanol",
  "es",
  "japanese",
  "japones",
  "ja",
  "korean",
  "coreano",
  "ko",
  "chinese",
  "chines",
  "zh"
]);
const TYPE_TAGS = new Set([
  "manga",
  "manhua",
  "manhwa",
  "novel",
  "comic",
  "webtoon",
  "webcomic",
  "oneshot",
  "one-shot",
  "doujinshi"
]);

const env = process.env;
const dryRun = env.PLUGIN_HUB_DRY_RUN === "1";

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
  return ["active", "broken", "hidden", "removed"].includes(status) ? status : "active";
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
    throw new Error("the first public tag must be the language, for example english or portuguese.");
  }
  const invalidType = publicTags.slice(1).find((tag) => !TYPE_TAGS.has(tag));
  if (invalidType) {
    throw new Error(`invalid type tag after language: ${invalidType}.`);
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
  const response = await fetch(rawPluginJsonUrl(plugin.repository_url, plugin.repository_ref, plugin.plugin_path), {
    headers: { "User-Agent": "kapitomo-plugin-hub" }
  });
  if (!response.ok) {
    const error = new Error(`Could not read plugin.json from the repository: HTTP ${response.status}.`);
    error.status = response.status;
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
    if (["broken", "hidden", "removed"].includes(normalizeStatus(existing.status))) {
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
  return plugins.slice().sort((a, b) => {
    const ao = Array.isArray(a.tags) && a.tags.includes("official") ? 0 : 1;
    const bo = Array.isArray(b.tags) && b.tags.includes("official") ? 0 : 1;
    if (ao !== bo) {
      return ao - bo;
    }
    return String(a.name || a.id).localeCompare(String(b.name || b.id), "pt-BR");
  });
}

function isMaintainer(actor) {
  return MAINTAINERS.has(String(actor || "").toLowerCase());
}

function issueHasApproval(issue) {
  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  return labels.some((label) => APPROVAL_LABELS.has(String(label.name || label).toLowerCase()));
}

function approvalMessage(action) {
  return [
    `${action} request validated.`,
    "",
    "Status: waiting for maintainer approval.",
    "",
    "Add the `approved` label to finish this request."
  ].join("\n");
}

async function publishPlugin(issue) {
  const plugin = normalizePlugin(extractJson(issue.body));
  await validateRepositoryPlugin(plugin);

  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === plugin.id);
  if (existing && Array.isArray(existing.tags) && existing.tags.includes("official") && !isMaintainer(issue.user && issue.user.login)) {
    throw new Error("Official plugins can only be changed by a maintainer.");
  }
  const duplicate = await findDuplicateHost(catalog, plugin);
  if (duplicate) {
    throw new Error(`Host ${duplicate.host} is already covered by plugin ${duplicate.plugin.id || duplicate.plugin.name}.`);
  }

  if (!issueHasApproval(issue)) {
    return {
      pending: true,
      title: `Validate plugin ${plugin.id}`,
      message: approvalMessage(`Plugin **${plugin.name}**`)
    };
  }

  if (existing && Array.isArray(existing.tags) && existing.tags.includes("official") && !plugin.tags.includes("official")) {
    plugin.tags = ["official", ...plugin.tags.filter((tag) => tag !== "official")];
  }
  plugin.status = "active";
  plugin.consecutive_failures = 0;
  plugin.last_error = "";
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
    message: `Plugin **${plugin.name}** was published to the catalog.\n\nVersion: \`${plugin.version}\`\nRepository: ${plugin.repository_url}`
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
  const id = removalIdFromIssue(issue);
  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === id);
  if (!existing) {
    throw new Error(`Plugin ${id} does not exist in the catalog.`);
  }
  if (Array.isArray(existing.tags) && existing.tags.includes("official") && !isMaintainer(issue.user && issue.user.login)) {
    throw new Error("Official plugins can only be removed by a maintainer.");
  }

  if (!issueHasApproval(issue)) {
    return {
      pending: true,
      title: `Validate removal ${id}`,
      message: approvalMessage(`Removal for **${existing.name || id}**`)
    };
  }

  catalog.plugins = catalog.plugins.map((item) => {
    if (String(item.id || "").toLowerCase() !== id) {
      return item;
    }
    return {
      ...item,
      status: "removed",
      removed_at: nowIso()
    };
  });
  if (!dryRun) {
    writeCatalogs(catalog);
  }
  return {
    title: `Remove plugin ${id}`,
    message: `Plugin **${existing.name || id}** was marked as removed from the catalog.`
  };
}

async function checkUrl(url, field) {
  const target = validateHttpUrl(url, field);
  const response = await fetch(target, {
    method: "GET",
    headers: { "User-Agent": "kapitomo-plugin-hub" },
    redirect: "follow"
  });
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
  await checkUrl(homeUrl, "browser.home_url");
  await checkUrl(manifest.browser.icon_url, "browser.icon_url");
  return {
    manifest,
    hosts: pluginHostsFromManifest(plugin, manifest)
  };
}

async function checkPluginHealth() {
  const catalog = loadCatalog();
  let changed = false;
  for (const plugin of catalog.plugins) {
    if (["hidden", "removed"].includes(normalizeStatus(plugin.status))) {
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
    } catch (error) {
      plugin.consecutive_failures = Number(plugin.consecutive_failures || 0) + 1;
      plugin.last_error = error.message;
      plugin.last_checked_at = nowIso();
      if (plugin.consecutive_failures >= BROKEN_AFTER_FAILURES) {
        plugin.status = "broken";
      }
      changed = true;
    }
  }
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

  try {
    const result = title.startsWith("[plugin-remove]")
      ? await removePlugin(issue)
      : await publishPlugin(issue);
    if (result.pending) {
      await comment(issue.number, result.message);
      return;
    }
    const changed = dryRun ? true : commitAndPush(result.title, issue.number);
    await comment(issue.number, `${result.message}\n\nStatus: ${changed ? "catalog updated" : "catalog was already up to date"}.`);
    await closeIssue(issue.number);
  } catch (error) {
    await comment(issue.number, `The request could not be completed.\n\nError: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
