const list = document.getElementById("pluginList");
const repoUrlInput = document.getElementById("repoUrlInput");
const loadRepoPluginButton = document.getElementById("loadRepoPluginButton");
const clearDraftPluginsButton = document.getElementById("clearDraftPluginsButton");
const publishStatus = document.getElementById("publishStatus");
const removePluginIdInput = document.getElementById("removePluginIdInput");
const removeRepoUrlInput = document.getElementById("removeRepoUrlInput");
const requestRemovePluginButton = document.getElementById("requestRemovePluginButton");
const removeStatus = document.getElementById("removeStatus");
const LOCAL_PLUGIN_KEY = "kapitomo.pluginDrafts.v3";
let renderedPlugins = [];

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
    "catalog-store.json?v=20260704-compact-hub",
    "https://raw.githubusercontent.com/Nanquimori/KapiTomo/gh-pages/plugins/catalog-store.json?v=20260704-compact-hub"
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

function repositoryLabel(repositoryUrl) {
  try {
    return new URL(repositoryUrl).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
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
          <p>${escapeHtml(plugin.description || "")}</p>
          <div class="meta">
            ${plugin.author ? `<span>${escapeHtml(plugin.author)}</span>` : ""}
            ${plugin.version ? `<span>v${escapeHtml(plugin.version)}</span>` : ""}
            ${plugin.id ? `<span>${escapeHtml(plugin.id)}</span>` : ""}
            ${plugin.repository_url ? `<span>${escapeHtml(repositoryLabel(plugin.repository_url))}</span>` : ""}
          </div>
        </div>
        <div class="plugin-actions">
          ${actions.join("")}
        </div>
      </article>
    `;
  }).join("") : "<p>No plugins published yet.</p>";
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
      const publishedKeys = new Set(catalogPlugins.map(pluginKey));
      const savedDrafts = loadDraftPlugins();
      const drafts = savedDrafts.filter((plugin) => !publishedKeys.has(pluginKey(plugin)));
      if (drafts.length !== savedDrafts.length) {
        saveDraftPlugins(drafts);
      }
      renderPlugins(uniquePlugins([catalogPlugins, drafts.map((plugin) => ({ ...plugin, __source: "draft" }))]));
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
  return String(rawPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/plugin\.json$/i, "");
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
repoUrlInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadRepoPlugin();
  }
});
clearDraftPluginsButton?.addEventListener("click", () => {
  localStorage.removeItem(LOCAL_PLUGIN_KEY);
  setPublishStatus("Drafts removed from this browser.");
  loadAllPlugins();
});
loadAllPlugins();
