const list = document.getElementById("pluginList");
const repoUrlInput = document.getElementById("repoUrlInput");
const loadRepoPluginButton = document.getElementById("loadRepoPluginButton");
const discardDraftPluginsButton = document.getElementById("discardDraftPluginsButton");
const publishStatus = document.getElementById("publishStatus");
const removePluginIdInput = document.getElementById("removePluginIdInput");
const removeRepoUrlInput = document.getElementById("removeRepoUrlInput");
const requestRemovePluginButton = document.getElementById("requestRemovePluginButton");
const removeStatus = document.getElementById("removeStatus");
const tagFilter = document.getElementById("tagFilter");
const tagFilterStatus = document.getElementById("tagFilterStatus");
const viewButtons = Array.from(document.querySelectorAll("[data-view-target]"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const LOCAL_PLUGIN_KEY = "kapitomo.pluginDrafts.v3";
const CATALOG_VERSION = "20260704-compact-hub";
const MAX_SELECTED_TAGS = 4;
let renderedPlugins = [];
let allPlugins = [];
let availableTags = [];
let selectedTags = [];

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function hasRequiredPluginIcon(plugin) {
  return Boolean(plugin && String(plugin.icon_url || "").trim());
}

function hasRepository(plugin) {
  return Boolean(plugin && String(plugin.repository_url || "").trim());
}

function setPublishStatus(message) {
  if (publishStatus) {
    publishStatus.textContent = message || "";
  }
}

function setRemoveStatus(message) {
  if (removeStatus) {
    removeStatus.textContent = message || "";
  }
}

function fetchCatalog() {
  const urls = [
    `catalog-store.json?v=${CATALOG_VERSION}`,
    `https://raw.githubusercontent.com/Nanquimori/KapiTomo/gh-pages/plugins/catalog-store.json?v=${CATALOG_VERSION}`
  ];
  return urls.reduce((chain, url) => chain.catch(() => fetch(url, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("HTTP " + response.status)))), Promise.reject());
}

function publicPlugin(plugin) {
  const clean = { ...plugin };
  Object.keys(clean).forEach((key) => {
    if (key.startsWith("__") || clean[key] === "" || clean[key] == null) {
      delete clean[key];
    }
  });
  return clean;
}

function pluginKey(plugin) {
  return [
    String(plugin?.id || ""),
    String(plugin?.repository_url || ""),
    String(plugin?.repository_ref || ""),
    String(plugin?.plugin_path || "")
  ].join("|");
}

function displayTags(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter((tag) => tag && tag !== "official" && tag !== "community")
    .slice(0, 4);
}

function filterTags(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter((tag) => tag && tag !== "official" && tag !== "community");
}

function uniqueTags(groups) {
  const seen = new Set();
  const output = [];
  groups.flat().forEach((tag) => {
    const clean = String(tag || "").trim().toLowerCase();
    if (!clean || clean === "official" || clean === "community" || seen.has(clean)) {
      return;
    }
    seen.add(clean);
    output.push(clean);
  });
  return output;
}

function setActiveView(view) {
  const activeView = viewPanels.some((panel) => panel.dataset.viewPanel === view) ? view : "catalog";
  viewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== activeView;
  });
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === activeView);
  });
}

function pluginMatchesSelectedTags(plugin) {
  if (!selectedTags.length) {
    return true;
  }
  const tags = new Set(filterTags(plugin.tags));
  return selectedTags.every((tag) => tags.has(tag));
}

function renderTagFilters(tags) {
  availableTags = tags;
  selectedTags = selectedTags.filter((tag) => availableTags.includes(tag));
  if (!tagFilter) {
    return;
  }
  tagFilter.innerHTML = availableTags.length ? availableTags.map((tag) => {
    const active = selectedTags.includes(tag);
    const disabled = !active && selectedTags.length >= MAX_SELECTED_TAGS;
    return `<button class="filter-chip${active ? " is-active" : ""}" type="button" data-filter-tag="${escapeHtml(tag)}"${disabled ? " disabled" : ""}>${escapeHtml(tag)}</button>`;
  }).join("") : "<p class=\"filter-status\">No tags available yet.</p>";
  tagFilter.querySelectorAll("[data-filter-tag]").forEach((button) => {
    button.addEventListener("click", () => toggleTagFilter(button.dataset.filterTag));
  });
}

function setTagStatus(filteredCount) {
  if (!tagFilterStatus) {
    return;
  }
  if (!allPlugins.length) {
    tagFilterStatus.textContent = "No plugins published yet.";
    return;
  }
  if (!selectedTags.length) {
    tagFilterStatus.textContent = `${allPlugins.length} plugin${allPlugins.length === 1 ? "" : "s"} in the catalog.`;
    return;
  }
  tagFilterStatus.textContent = `${filteredCount} plugin${filteredCount === 1 ? "" : "s"} matching ${selectedTags.join(", ")}.`;
}

function applyTagFilters() {
  const filtered = allPlugins.filter(pluginMatchesSelectedTags);
  renderTagFilters(availableTags);
  renderPlugins(filtered);
  setTagStatus(filtered.length);
}

function toggleTagFilter(tag) {
  const clean = String(tag || "").trim().toLowerCase();
  if (!clean) {
    return;
  }
  if (selectedTags.includes(clean)) {
    selectedTags = selectedTags.filter((selected) => selected !== clean);
  } else if (selectedTags.length < MAX_SELECTED_TAGS) {
    selectedTags = [...selectedTags, clean];
  }
  applyTagFilters();
}

function pluginManifestUrl(plugin) {
  try {
    const url = new URL(plugin.repository_url);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
      return "";
    }
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) {
      return "";
    }
    const pluginPath = normalizePluginPath(plugin.plugin_path);
    const manifestPath = [pluginPath, "plugin.json"].filter(Boolean).join("/");
    return `https://raw.githubusercontent.com/${owner}/${repo.replace(/\.git$/i, "")}/${encodeURIComponent(plugin.repository_ref || "main")}/${manifestPath}`;
  } catch {
    return "";
  }
}

async function hasAvailableRepository(plugin) {
  const url = pluginManifestUrl(plugin);
  if (!url) {
    return false;
  }
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.status !== 404;
  } catch {
    return true;
  }
}

async function filterAvailablePlugins(plugins) {
  const checked = await Promise.all(plugins.map(async (plugin) => (
    await hasAvailableRepository(plugin) ? plugin : null
  )));
  return checked.filter(Boolean);
}

function uniquePlugins(groups) {
  const seen = new Set();
  const output = [];
  groups.flat().forEach((plugin) => {
    const key = pluginKey(plugin);
    if (!key.trim() || seen.has(key)) {
      return;
    }
    seen.add(key);
    output.push(plugin);
  });
  return output;
}

function loadDraftPlugins() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PLUGIN_KEY) || "[]")
      .filter((plugin) => hasRequiredPluginIcon(plugin) && hasRepository(plugin));
  } catch {
    return [];
  }
}

function saveDraftPlugins(drafts) {
  if (drafts.length) {
    localStorage.setItem(LOCAL_PLUGIN_KEY, JSON.stringify(drafts.map(publicPlugin)));
  } else {
    localStorage.removeItem(LOCAL_PLUGIN_KEY);
  }
}

function saveDraftPlugin(plugin) {
  const drafts = uniquePlugins([[{ ...plugin, __source: "draft" }], loadDraftPlugins()]);
  saveDraftPlugins(drafts);
}

function renderPlugins(plugins) {
  renderedPlugins = plugins;
  list.innerHTML = plugins.length ? plugins.map((plugin, index) => {
    const tags = displayTags(plugin.tags);
    const actions = [
      `<button class="button primary" type="button" data-install-plugin="${index}">Install</button>`
    ];
    if (plugin.__source === "draft") {
      actions.push(`<button class="button" type="button" data-publish-plugin="${index}">Publish</button>`);
    } else if (plugin.homepage || plugin.site_url) {
      actions.push(`<a class="button" href="${escapeHtml(plugin.homepage || plugin.site_url)}">Open</a>`);
    }
    return `
      <article class="plugin-card">
        <img class="plugin-icon" src="${escapeHtml(plugin.icon_url)}" alt="">
        <div class="plugin-copy">
          <h3>${escapeHtml(plugin.name || plugin.id || "Plugin")}</h3>
          <div class="meta">
            ${plugin.author ? `<span>${escapeHtml(plugin.author)}</span>` : ""}
            ${plugin.version ? `<span>v${escapeHtml(plugin.version)}</span>` : ""}
          </div>
        </div>
        ${tags.length ? `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="plugin-actions">
          ${actions.join("")}
        </div>
      </article>
    `;
  }).join("") : `<p>${selectedTags.length ? "No plugins match the selected tags." : "No plugins published yet."}</p>`;
  document.querySelectorAll("[data-install-plugin]").forEach((button) => {
    button.addEventListener("click", () => installPlugin(renderedPlugins[Number(button.dataset.installPlugin)]));
  });
  document.querySelectorAll("[data-publish-plugin]").forEach((button) => {
    button.addEventListener("click", () => openPublishRequest(renderedPlugins[Number(button.dataset.publishPlugin)]));
  });
}

function loadAllPlugins() {
  fetchCatalog()
    .then((catalog) => {
      const catalogPlugins = (Array.isArray(catalog.plugins) ? catalog.plugins : [])
        .filter((plugin) => hasRequiredPluginIcon(plugin) && hasRepository(plugin));
      const savedDrafts = loadDraftPlugins();
      return Promise.all([
        filterAvailablePlugins(catalogPlugins),
        filterAvailablePlugins(savedDrafts)
      ]).then(([availableCatalogPlugins, availableDrafts]) => {
        const publishedKeys = new Set(availableCatalogPlugins.map(pluginKey));
        const drafts = availableDrafts.filter((plugin) => !publishedKeys.has(pluginKey(plugin)));
        if (drafts.length !== savedDrafts.length) {
          saveDraftPlugins(drafts);
        }
        allPlugins = uniquePlugins([availableCatalogPlugins, drafts.map((plugin) => ({ ...plugin, __source: "draft" }))]);
        const catalogTags = uniqueTags([
          allPlugins.flatMap((plugin) => filterTags(plugin.tags))
        ]);
        renderTagFilters(catalogTags);
        applyTagFilters();
      });
    })
    .catch((error) => {
      list.innerHTML = `<p>Could not load the catalog: ${escapeHtml(error.message)}</p>`;
    });
}

function parseGitHubRepo(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    throw new Error("Paste a valid GitHub URL.");
  }
  if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
    throw new Error("Use a github.com repository.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("The URL must include an owner and repository.");
  }
  const treeIndex = parts.indexOf("tree");
  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/i, ""),
    branch: treeIndex >= 0 && parts[treeIndex + 1] ? parts[treeIndex + 1] : "",
    pluginPath: treeIndex >= 0 && parts.length > treeIndex + 2 ? parts.slice(treeIndex + 2).join("/") : ""
  };
}

function normalizePluginPath(rawPath) {
  const clean = String(rawPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/plugin\.json$/i, "");
  return clean === "." ? "" : clean;
}

function resolveUrl(baseUrl, maybeUrl) {
  try {
    return new URL(String(maybeUrl || ""), baseUrl || location.href).toString();
  } catch {
    return "";
  }
}

async function fetchRepoManifest(repo) {
  const branches = repo.branch ? [repo.branch] : ["main", "master"];
  const pluginPath = normalizePluginPath(repo.pluginPath);
  let lastError;
  for (const branch of branches) {
    const path = [pluginPath, "plugin.json"].filter(Boolean).join("/");
    const url = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/${path}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return {
        branch,
        pluginPath,
        manifest: await response.json()
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("plugin.json was not found in the repository. " + (lastError?.message || ""));
}

async function loadRepoPlugin() {
  try {
    const repo = parseGitHubRepo(repoUrlInput?.value || "");
    setPublishStatus("Reading plugin.json from the repository...");
    const { branch, pluginPath, manifest } = await fetchRepoManifest(repo);
    const browser = manifest.browser || {};
    const repositoryUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    const iconUrl = resolveUrl(browser.home_url || repositoryUrl + "/", browser.icon_url || "");
    if (!iconUrl) {
      throw new Error("The plugin must declare browser.icon_url.");
    }
    setPublishStatus("Preparing the publication request...");
    const plugin = {
      id: manifest.id || repo.repo,
      name: manifest.name || manifest.id || repo.repo,
      description: manifest.description || `Source plugin for downloading works from ${manifest.name || repo.repo} in Nyxovira.`,
      author: manifest.author || repo.owner,
      version: manifest.version || "1.0.0",
      site_url: browser.home_url || repositoryUrl + "/",
      homepage: browser.home_url || repositoryUrl + "/",
      icon_url: iconUrl,
      repository_url: repositoryUrl,
      repository_ref: branch,
      plugin_path: pluginPath,
      tags: Array.isArray(manifest.tags) ? manifest.tags : ["community"],
      __source: "draft"
    };
    saveDraftPlugin(plugin);
    setPublishStatus("Addon loaded. Confirm the GitHub request and the catalog automation will validate the repository before publishing.");
    loadAllPlugins();
    setActiveView("catalog");
  } catch (error) {
    setPublishStatus(error?.message || "Could not load the addon.");
  }
}

function openPublishRequest(plugin) {
  const clean = publicPlugin(plugin);
  if (!clean.repository_url) {
    setPublishStatus("This draft is outdated. Load the GitHub repository again before requesting publication.");
    return;
  }
  const body = [
    "Plugin publication request for the Nyxovira catalog.",
    "After you submit this request, the catalog automation validates the repository and publishes it automatically when everything is correct.",
    "",
    "Repository: " + clean.repository_url,
    "",
    "```json",
    JSON.stringify(clean, null, 2),
    "```"
  ].join("\n");
  const url = "https://github.com/Nanquimori/KapiTomo/issues/new"
    + "?title=" + encodeURIComponent("[plugin] " + (clean.name || clean.id || "new-plugin"))
    + "&body=" + encodeURIComponent(body);
  window.open(url, "_blank", "noopener");
}

function openRemovalRequest() {
  const pluginId = String(removePluginIdInput?.value || "").trim();
  const repoUrl = String(removeRepoUrlInput?.value || "").trim();
  if (!pluginId) {
    setRemoveStatus("Enter the published plugin ID.");
    return;
  }
  if (!repoUrl) {
    setRemoveStatus("Enter the plugin GitHub repository.");
    return;
  }
  const body = [
    "Plugin removal request for the Nyxovira catalog.",
    "After you submit this request, the catalog automation validates it and removes the plugin automatically when everything is correct.",
    "",
    "Plugin ID: " + pluginId,
    "Repository: " + repoUrl,
    "",
    "I confirm that I want to remove this plugin from the online catalog."
  ].join("\n");
  const url = "https://github.com/Nanquimori/KapiTomo/issues/new"
    + "?title=" + encodeURIComponent("[plugin-remove] " + pluginId)
    + "&body=" + encodeURIComponent(body);
  setRemoveStatus("Opening the removal request on GitHub...");
  window.open(url, "_blank", "noopener");
}

function installPlugin(plugin) {
  const bridge = window.NyxoviraAndroidBridge || window.ArchiveInkAndroidBridge;
  if (!hasRequiredPluginIcon(plugin)) {
    alert("This plugin does not have icon_url and cannot be installed from the online catalog.");
    return;
  }
  if (!hasRepository(plugin)) {
    alert("This plugin does not have repository_url and cannot be installed from the online catalog.");
    return;
  }
  if (!plugin || !bridge || typeof bridge.installOnlinePlugin !== "function") {
    alert("Open this page from the Online plugins button inside Nyxovira to install directly in the app.");
    return;
  }
  try {
    const result = JSON.parse(bridge.installOnlinePlugin(JSON.stringify(publicPlugin(plugin))) || "{}");
    alert(result.message || (result.success ? "Plugin installed." : "Could not install the plugin."));
  } catch (error) {
    alert("Could not install the plugin: " + (error && error.message ? error.message : "unknown error"));
  }
}

loadRepoPluginButton?.addEventListener("click", loadRepoPlugin);
requestRemovePluginButton?.addEventListener("click", openRemovalRequest);
viewButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.viewTarget));
});
repoUrlInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadRepoPlugin();
  }
});
discardDraftPluginsButton?.addEventListener("click", () => {
  localStorage.removeItem(LOCAL_PLUGIN_KEY);
  setPublishStatus("Drafts removed from this browser.");
  loadAllPlugins();
});
setActiveView("catalog");
loadAllPlugins();
