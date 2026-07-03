const list = document.getElementById("pluginList");
const repoUrlInput = document.getElementById("repoUrlInput");
const loadRepoPluginButton = document.getElementById("loadRepoPluginButton");
const clearDraftPluginsButton = document.getElementById("clearDraftPluginsButton");
const publishStatus = document.getElementById("publishStatus");
const removePluginIdInput = document.getElementById("removePluginIdInput");
const removeRepoUrlInput = document.getElementById("removeRepoUrlInput");
const requestRemovePluginButton = document.getElementById("requestRemovePluginButton");
const removeStatus = document.getElementById("removeStatus");
const LOCAL_PLUGIN_KEY = "kapitomo.pluginDrafts.v1";
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
  return Boolean(plugin && String(plugin.icon_url || plugin.iconUrl || "").trim());
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
    "catalog-store.json?v=20260703-auto-hub4",
    "https://raw.githubusercontent.com/Nanquimori/KapiTomo/gh-pages/plugins/catalog-store.json?v=20260703-auto-hub4"
  ];
  return urls.reduce((chain, url) => chain.catch(() => fetch(url, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("HTTP " + response.status)))), Promise.reject());
}

function publicPlugin(plugin) {
  const clean = { ...plugin };
  Object.keys(clean).forEach((key) => {
    if (key.startsWith("__")) {
      delete clean[key];
    }
  });
  return clean;
}

function pluginKey(plugin) {
  return String(plugin?.id || "") + "|" + String(plugin?.package_url || plugin?.packageUrl || "");
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
    return JSON.parse(localStorage.getItem(LOCAL_PLUGIN_KEY) || "[]").filter(hasRequiredPluginIcon);
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
      `<button class="button primary" type="button" data-install-plugin="${index}">Instalar no Nyxovira</button>`
    ];
    if (plugin.__source === "draft") {
      actions.push(`<button class="button" type="button" data-publish-plugin="${index}">Solicitar publicacao</button>`);
    } else if (plugin.homepage || plugin.site_url) {
      actions.push(`<a class="button" href="${escapeHtml(plugin.homepage || plugin.site_url)}">Abrir site</a>`);
    }
    return `
      <article class="plugin-card">
        <div class="plugin-summary">
          <img class="plugin-icon" src="${escapeHtml(plugin.icon_url || plugin.iconUrl)}" alt="">
          <div>
            <h3>${escapeHtml(plugin.name || plugin.id || "Plugin")}</h3>
            <p>${escapeHtml(plugin.description || plugin.package_url || "")}</p>
            <div class="meta">
              ${plugin.author ? `<span>${escapeHtml(plugin.author)}</span>` : ""}
              ${plugin.version ? `<span>v${escapeHtml(plugin.version)}</span>` : ""}
              ${plugin.id ? `<span>${escapeHtml(plugin.id)}</span>` : ""}
            </div>
          </div>
        </div>
        <div class="button-row">
          ${actions.join("")}
        </div>
      </article>
    `;
  }).join("") : "<p>Nenhum plugin publicado ainda.</p>";
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
      const catalogPlugins = (Array.isArray(catalog.plugins) ? catalog.plugins : []).filter(hasRequiredPluginIcon);
      const publishedKeys = new Set(catalogPlugins.map(pluginKey));
      const savedDrafts = loadDraftPlugins();
      const drafts = savedDrafts.filter((plugin) => !publishedKeys.has(pluginKey(plugin)));
      if (drafts.length !== savedDrafts.length) {
        saveDraftPlugins(drafts);
      }
      renderPlugins(uniquePlugins([catalogPlugins, drafts.map((plugin) => ({ ...plugin, __source: "draft" }))]));
    })
    .catch((error) => {
      list.innerHTML = `<p>Nao foi possivel carregar o catalogo: ${escapeHtml(error.message)}</p>`;
    });
}

function parseGitHubRepo(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    throw new Error("Cole uma URL valida do GitHub.");
  }
  if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
    throw new Error("Use um repositorio do github.com.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("A URL precisa ter usuario e repositorio.");
  }
  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/i, "")
  };
}

function resolveUrl(baseUrl, maybeUrl) {
  try {
    return new URL(String(maybeUrl || ""), baseUrl || location.href).toString();
  } catch {
    return "";
  }
}

async function fetchRepoManifest(repo) {
  const branches = ["main", "master"];
  let lastError;
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/plugin.json`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return {
        branch,
        manifest: await response.json()
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("Nao encontrei plugin.json em main ou master. " + (lastError?.message || ""));
}

async function findRepoPackage(repo, branch, manifest) {
  const releasesUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases`;
  try {
    const response = await fetch(releasesUrl, { cache: "no-store" });
    if (response.ok) {
      const releases = await response.json();
      for (const release of releases) {
        const assets = Array.isArray(release.assets) ? release.assets : [];
        const preferred = assets.find((asset) => /\.zip$/i.test(asset.name || "") && String(asset.name || "").toLowerCase().includes(String(manifest.id || repo.repo).toLowerCase()))
          || assets.find((asset) => /\.zip$/i.test(asset.name || "") || /zip/i.test(asset.content_type || ""));
        if (preferred?.browser_download_url) {
          return {
            url: preferred.browser_download_url,
            version: manifest.version || String(release.tag_name || "").replace(/^v/i, "")
          };
        }
        if (release.zipball_url) {
          return {
            url: release.zipball_url,
            version: manifest.version || String(release.tag_name || "").replace(/^v/i, "")
          };
        }
      }
    }
  } catch {
  }
  return {
    url: `https://api.github.com/repos/${repo.owner}/${repo.repo}/zipball/${branch}`,
    version: manifest.version || branch
  };
}

async function loadRepoPlugin() {
  try {
    const repo = parseGitHubRepo(repoUrlInput?.value || "");
    setPublishStatus("Lendo plugin.json do repositorio...");
    const { branch, manifest } = await fetchRepoManifest(repo);
    const browser = manifest.browser || {};
    const packageInfo = await findRepoPackage(repo, branch, manifest);
    const iconUrl = resolveUrl(browser.home_url || `https://github.com/${repo.owner}/${repo.repo}/`, browser.icon_url || browser.iconUrl || "");
    if (!iconUrl) {
      throw new Error("O plugin precisa ter browser.icon_url.");
    }
    setPublishStatus("Montando publicacao...");
    const plugin = {
      id: manifest.id || repo.repo,
      name: manifest.name || manifest.id || repo.repo,
      description: manifest.description || `Fonte para baixar obras de ${manifest.name || repo.repo} no Nyxovira.`,
      author: manifest.author || repo.owner,
      version: packageInfo.version || manifest.version || "1.0.0",
      site_url: browser.home_url || `https://github.com/${repo.owner}/${repo.repo}/`,
      homepage: browser.home_url || `https://github.com/${repo.owner}/${repo.repo}/`,
      icon_url: iconUrl,
      package_url: packageInfo.url,
      tags: Array.isArray(manifest.tags) ? manifest.tags : ["comunidade"],
      __repo: `https://github.com/${repo.owner}/${repo.repo}`,
      __source: "draft"
    };
    saveDraftPlugin(plugin);
    setPublishStatus("Addon carregado. Ao confirmar no GitHub, o robo calcula o SHA-256 e publica.");
    loadAllPlugins();
  } catch (error) {
    setPublishStatus(error?.message || "Nao foi possivel carregar o addon.");
  }
}

function openPublishRequest(plugin) {
  const clean = publicPlugin(plugin);
  const body = [
    "Solicitacao de publicacao de plugin para o catalogo do Nyxovira.",
    "Depois que voce criar esta issue, o robo do catalogo valida o JSON e publica automaticamente se estiver tudo correto.",
    "",
    "Repositorio: " + (plugin.__repo || clean.homepage || clean.site_url || ""),
    "",
    "```json",
    JSON.stringify(clean, null, 2),
    "```"
  ].join("\n");
  const url = "https://github.com/Nanquimori/KapiTomo/issues/new"
    + "?title=" + encodeURIComponent("[plugin] " + (clean.name || clean.id || "novo-plugin"))
    + "&body=" + encodeURIComponent(body);
  window.open(url, "_blank", "noopener");
}

function openRemovalRequest() {
  const pluginId = String(removePluginIdInput?.value || "").trim();
  const repoUrl = String(removeRepoUrlInput?.value || "").trim();
  if (!pluginId) {
    setRemoveStatus("Informe o ID do plugin publicado.");
    return;
  }
  if (!repoUrl) {
    setRemoveStatus("Informe o repositorio GitHub do plugin.");
    return;
  }
  const body = [
    "Solicitacao de remocao de plugin publicado no catalogo do Nyxovira.",
    "Depois que voce criar esta issue, o robo do catalogo valida o pedido e remove automaticamente se estiver tudo correto.",
    "",
    "Plugin ID: " + pluginId,
    "Repositorio: " + repoUrl,
    "",
    "Confirmo que quero remover esta publicacao do catalogo online."
  ].join("\n");
  const url = "https://github.com/Nanquimori/KapiTomo/issues/new"
    + "?title=" + encodeURIComponent("[plugin-remover] " + pluginId)
    + "&body=" + encodeURIComponent(body);
  setRemoveStatus("Abrindo pedido de remocao no GitHub...");
  window.open(url, "_blank", "noopener");
}

function installPlugin(plugin) {
  const bridge = window.NyxoviraAndroidBridge || window.ArchiveInkAndroidBridge;
  if (!hasRequiredPluginIcon(plugin)) {
    alert("Este plugin nao tem icon_url e nao pode ser instalado pelo catalogo online.");
    return;
  }
  if (!plugin || !bridge || typeof bridge.installOnlinePlugin !== "function") {
    alert("Abra esta pagina pelo botao Plugins online dentro do Nyxovira para instalar direto no app.");
    return;
  }
  try {
    const result = JSON.parse(bridge.installOnlinePlugin(JSON.stringify(publicPlugin(plugin))) || "{}");
    alert(result.message || (result.success ? "Plugin instalado." : "Nao foi possivel instalar o plugin."));
  } catch (error) {
    alert("Nao foi possivel instalar o plugin: " + (error && error.message ? error.message : "erro desconhecido"));
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
  setPublishStatus("Rascunhos removidos deste navegador.");
  loadAllPlugins();
});
loadAllPlugins();
