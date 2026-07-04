const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const CATALOG_PATHS = ["plugins/catalog-store.json", "plugins/catalog.json"];
const MAINTAINERS = new Set(["nanquimori"]);

const env = process.env;
const dryRun = env.PLUGIN_HUB_DRY_RUN === "1";

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
  if (clean.includes("..")) {
    throw new Error("Invalid plugin_path.");
  }
  return clean;
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

async function fetchRepositoryManifest(plugin) {
  const response = await fetch(rawPluginJsonUrl(plugin.repository_url, plugin.repository_ref, plugin.plugin_path), {
    headers: { "User-Agent": "kapitomo-plugin-hub" }
  });
  if (!response.ok) {
    throw new Error(`Could not read plugin.json from the repository: HTTP ${response.status}.`);
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
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => optionalText(tag, 30)).filter(Boolean).slice(0, 8) : ["community"]
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

async function publishPlugin(issue) {
  const plugin = normalizePlugin(extractJson(issue.body));
  await validateRepositoryPlugin(plugin);

  const catalog = loadCatalog();
  const existing = catalog.plugins.find((item) => String(item.id || "").toLowerCase() === plugin.id);
  if (existing && Array.isArray(existing.tags) && existing.tags.includes("official") && !isMaintainer(issue.user && issue.user.login)) {
    throw new Error("Official plugins can only be changed by a maintainer.");
  }

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
  catalog.plugins = catalog.plugins.filter((item) => String(item.id || "").toLowerCase() !== id);
  if (!dryRun) {
    writeCatalogs(catalog);
  }
  return {
    title: `Remove plugin ${id}`,
    message: `Plugin **${existing.name || id}** was removed from the catalog.`
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
    run("git", ["commit", "-m", `${title} on site (#${issueNumber})`], { cwd: tempRoot });
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
  run("git", ["commit", "-m", `${title} (#${issueNumber})`]);
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
    throw new Error("GitHub event has no request.");
  }
  const title = String(issue.title || "");
  if (!title.startsWith("[plugin]") && !title.startsWith("[plugin-remove]")) {
    return;
  }

  try {
    const result = title.startsWith("[plugin-remove]")
      ? await removePlugin(issue)
      : await publishPlugin(issue);
    const changed = dryRun ? true : commitAndPush(result.title, issue.number);
    await comment(issue.number, `${result.message}\n\nStatus: ${changed ? "catalog updated" : "catalog was already up to date"}.`);
    await closeIssue(issue.number);
  } catch (error) {
    await comment(issue.number, `The request could not be completed.\n\nError: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
