const list = document.getElementById("pluginList");
const connectGitHubButton = document.getElementById("connectGitHubButton");
const disconnectGitHubButton = document.getElementById("disconnectGitHubButton");
const profileCard = document.getElementById("profileCard");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileLogin = document.getElementById("profileLogin");
const publisherStatus = document.getElementById("publisherStatus");
const repoUrlInput = document.getElementById("repoUrlInput");
const loadRepoPluginButton = document.getElementById("loadRepoPluginButton");
const clearDraftPluginsButton = document.getElementById("clearDraftPluginsButton");
const publishStatus = document.getElementById("publishStatus");
const removePluginIdInput = document.getElementById("removePluginIdInput");
const removeRepoUrlInput = document.getElementById("removeRepoUrlInput");
const requestRemovePluginButton = document.getElementById("requestRemovePluginButton");
const removeStatus = document.getElementById("removeStatus");
const authPanels = Array.from(document.querySelectorAll("[data-auth-panel]"));
const LOCAL_PLUGIN_KEY = "kapitomo.pluginDrafts.v1";
const AUTH_API_BASE = (window.KAPITOMO_AUTH_API || localStorage.getItem("kapitomo.authApi") || "").replace(/\/$/, "");
let renderedPlugins = [];
let currentProfile = null;

function authUrl(path) {
  return (AUTH_API_BASE || location.origin) + path;
}

function hasAuthBackend() {
  return Boolean(AUTH_API_BASE) || !/github\.io$/i.test(location.hostname);
}

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

function setPublisherStatus(message) {
  if (publisherStatus) {
    publisherStatus.textContent = message || "";
  }
}

function setRemoveStatus(message) {
  if (removeStatus) {
    removeStatus.textContent = message || "";
  }
}

async function apiFetch(path, options = {}) {
  return fetch(authUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Accept": "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
}

async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);
  let data = {};
  try {
    data = await response.json();
  } catch {
  }
  if (!response.ok) {
    throw new Error(data.error || data.message || ("HTTP " + response.status));
  }
  return data;
}

function renderProfile(profile, message) {
  currentProfile = profile || null;
  const enabled = Boolean(currentProfile);
  authPanels.forEach((panel) => {
    panel.hidden = !enabled;
  });
  if (profileCard) {
    profileCard.hidden = !enabled;
  }
  if (profileAvatar) {
    profileAvatar.src = enabled ? (currentProfile.avatar_url || "") : "";
  }
  if (profileName) {
    profileName.textContent = enabled ? (currentProfile.name || currentProfile.login) : "";
  }
  if (profileLogin) {
    profileLogin.textContent = enabled ? ("@" + currentProfile.login) : "";
  }
  if (connectGitHubButton) {
    connectGitHubButton.hidden = enabled;
  }
  if (disconnectGitHubButton) {
    disconnectGitHubButton.hidden = !enabled;
  }
  setPublisherStatus(message || (enabled
    ? `Logado como @${currentProfile.login}.`
    : "Entre com GitHub para publicar ou remover plugins."));
}

async function loadSession() {
  if (!hasAuthBackend()) {
    renderProfile(null, "Login real precisa do backend OAuth publicado e configurado.");
    return;
  }
  try {
    const session = await apiJson("/auth/me");
    renderProfile(session.user || null);
  } catch {
    renderProfile(null);
  }
}

function connectGitHub() {
  if (!hasAuthBackend()) {
    setPublisherStatus("Backend OAuth nao configurado. Publique o backend e defina window.KAPITOMO_AUTH_API ou localStorage kapitomo.authApi.");
    return;
  }
  const returnTo = location.href.replace(/[?&]auth=(ok|error)[^#]*/g, "");
  location.href = authUrl("/auth/github/login?return_to=" + encodeURIComponent(returnTo));
}

async function disconnectGitHub() {
  try {
    await apiJson("/auth/logout", { method: "POST" });
  } catch {
  }
  renderProfile(null, "Voce saiu do Hub.");
}

function fetchCatalog() {
  const urls = [
    "catalog-store.json?v=20260703-pluginhub-pruned",
    "https://raw.githubusercontent.com/Nanquimori/KapiTomo/gh-pages/plugins/catalog-store.json?v=20260703-pluginhub-pruned"
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

function saveDraftPlugin(plugin) {
  const drafts = uniquePlugins([[{ ...plugin, __source: "draft" }], loadDraftPlugins()]);
  localStorage.setItem(LOCAL_PLUGIN_KEY, JSON.stringify(drafts.map(publicPlugin)));
}

function renderPlugins(plugins) {
  renderedPlugins = plugins;
  list.innerHTML = plugins.length ? plugins.map((plugin, index) => {
    const actions = [
      `<button class="button primary" type="button" data-install-plugin="${index}">Instalar no Nyxovira</button>`
    ];
    if (plugin.__source === "draft") {
      actions.push(`<button class="button" type="button" data-publish-plugin="${index}">Enviar publicacao</button>`);
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
    button.addEventListener("click", () => publishPlugin(renderedPlugins[Number(button.dataset.publishPlugin)]));
  });
}

function loadAllPlugins() {
  fetchCatalog()
    .then((catalog) => {
      const catalogPlugins = (Array.isArray(catalog.plugins) ? catalog.plugins : []).filter(hasRequiredPluginIcon);
      const drafts = loadDraftPlugins().map((plugin) => ({ ...plugin, __source: "draft" }));
      renderPlugins(uniquePlugins([drafts, catalogPlugins]));
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
          || assets.find((asset) => /\.zip$/i.test(asset.name || ""));
        if (preferred?.browser_download_url) {
          return {
            url: preferred.browser_download_url,
            version: manifest.version || String(release.tag_name || "").replace(/^v/i, "")
          };
        }
      }
    }
  } catch {
  }
  return {
    url: `https://github.com/${repo.owner}/${repo.repo}/archive/refs/heads/${branch}.zip`,
    version: manifest.version || branch
  };
}

async function sha256FromUrl(url) {
  if (!crypto?.subtle) {
    return "";
  }
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }
    const buffer = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

async function loadRepoPlugin() {
  try {
    if (!currentProfile) {
      setPublishStatus("Entre com GitHub antes de publicar.");
      return;
    }
    const repo = parseGitHubRepo(repoUrlInput?.value || "");
    if (repo.owner.toLowerCase() !== currentProfile.login.toLowerCase()) {
      setPublishStatus("Aviso: o repositorio pertence a outro usuario ou organizacao.");
    }
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
      sha256: await sha256FromUrl(packageInfo.url),
      tags: Array.isArray(manifest.tags) ? manifest.tags : ["comunidade"],
      __repo: `https://github.com/${repo.owner}/${repo.repo}`,
      __source: "draft"
    };
    saveDraftPlugin(plugin);
    setPublishStatus(plugin.sha256 ? "Addon carregado e hash calculado." : "Addon carregado. Hash nao calculado pelo navegador.");
    loadAllPlugins();
  } catch (error) {
    setPublishStatus(error?.message || "Nao foi possivel carregar o addon.");
  }
}

async function publishPlugin(plugin) {
  if (!currentProfile) {
    setPublishStatus("Entre com GitHub antes de enviar a publicacao.");
    return;
  }
  try {
    setPublishStatus("Enviando publicacao...");
    const result = await apiJson("/plugins/publish", {
      method: "POST",
      body: JSON.stringify({
        plugin: publicPlugin(plugin),
        repository: plugin.__repo || plugin.homepage || plugin.site_url || ""
      })
    });
    setPublishStatus("Publicacao enviada.");
    if (result.url) {
      window.open(result.url, "_blank", "noopener");
    }
  } catch (error) {
    setPublishStatus(error?.message || "Nao foi possivel enviar a publicacao.");
  }
}

async function requestRemovePlugin() {
  if (!currentProfile) {
    setRemoveStatus("Entre com GitHub antes de solicitar remocao.");
    return;
  }
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
  try {
    setRemoveStatus("Enviando pedido de remocao...");
    const result = await apiJson("/plugins/remove", {
      method: "POST",
      body: JSON.stringify({
        plugin_id: pluginId,
        repository: repoUrl
      })
    });
    setRemoveStatus("Pedido de remocao enviado.");
    if (result.url) {
      window.open(result.url, "_blank", "noopener");
    }
  } catch (error) {
    setRemoveStatus(error?.message || "Nao foi possivel solicitar remocao.");
  }
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
connectGitHubButton?.addEventListener("click", connectGitHub);
disconnectGitHubButton?.addEventListener("click", disconnectGitHub);
requestRemovePluginButton?.addEventListener("click", requestRemovePlugin);
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
loadSession();
loadAllPlugins();
