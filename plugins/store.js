const list = document.getElementById("pluginList");
const emailInput = document.getElementById("emailInput");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const signInButton = document.getElementById("signInButton");
const signUpButton = document.getElementById("signUpButton");
const signOutButton = document.getElementById("signOutButton");
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
const requestRemovePluginButton = document.getElementById("requestRemovePluginButton");
const removeStatus = document.getElementById("removeStatus");
const authPanels = Array.from(document.querySelectorAll("[data-auth-panel]"));
const LOCAL_PLUGIN_KEY = "kapitomo.pluginDrafts.v1";
const FIREBASE_CONFIG = window.KAPITOMO_FIREBASE_CONFIG || null;

let renderedPlugins = [];
let currentUser = null;
let currentProfile = null;
let firebaseApi = null;

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

function avatarFor(name) {
  const label = String(name || "?").trim().slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#ffb51f"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#160a08" font-family="Arial" font-size="34" font-weight="800">${escapeHtml(label)}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function renderProfile(user, profile, message) {
  currentUser = user || null;
  currentProfile = profile || null;
  const enabled = Boolean(currentUser);
  authPanels.forEach((panel) => {
    panel.hidden = !enabled;
  });
  if (profileCard) {
    profileCard.hidden = !enabled;
  }
  if (profileAvatar) {
    profileAvatar.src = enabled ? avatarFor(profile?.username || user.email || "U") : "";
  }
  if (profileName) {
    profileName.textContent = enabled ? (profile?.username || user.displayName || "Usuario") : "";
  }
  if (profileLogin) {
    profileLogin.textContent = enabled ? (user.email || "") : "";
  }
  if (signInButton) {
    signInButton.hidden = enabled;
  }
  if (signUpButton) {
    signUpButton.hidden = enabled;
  }
  if (signOutButton) {
    signOutButton.hidden = !enabled;
  }
  setPublisherStatus(message || (enabled
    ? `Logado como ${profile?.username || user.email}.`
    : "Crie conta ou entre para publicar e remover plugins."));
}

function ensureFirebaseConfig() {
  if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "SUA_API_KEY") {
    renderProfile(null, null, "Firebase ainda nao configurado. Configure plugins/firebase-config.js para ativar contas online.");
    return false;
  }
  return true;
}

async function initFirebase() {
  if (!ensureFirebaseConfig()) {
    loadAllPlugins();
    return;
  }
  const [
    appModule,
    authModule,
    firestoreModule
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
  ]);
  const app = appModule.initializeApp(FIREBASE_CONFIG);
  const auth = authModule.getAuth(app);
  const db = firestoreModule.getFirestore(app);
  firebaseApi = {
    auth,
    db,
    ...authModule,
    ...firestoreModule
  };
  authModule.onAuthStateChanged(auth, async (user) => {
    if (!user) {
      renderProfile(null, null);
      loadAllPlugins();
      return;
    }
    const profile = await loadUserProfile(user);
    renderProfile(user, profile);
    loadAllPlugins();
  });
}

async function loadUserProfile(user) {
  const ref = firebaseApi.doc(firebaseApi.db, "users", user.uid);
  const snap = await firebaseApi.getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  }
  const profile = {
    uid: user.uid,
    username: user.displayName || (user.email || "usuario").split("@")[0],
    email: user.email || "",
    created_at: firebaseApi.serverTimestamp()
  };
  await firebaseApi.setDoc(ref, profile, { merge: true });
  return profile;
}

function cleanUsername() {
  return String(usernameInput?.value || "").trim().replace(/^@+/, "");
}

function cleanEmail() {
  return String(emailInput?.value || "").trim();
}

function cleanPassword() {
  return String(passwordInput?.value || "");
}

async function signUp() {
  if (!firebaseApi) {
    setPublisherStatus("Firebase nao configurado.");
    return;
  }
  const username = cleanUsername();
  const email = cleanEmail();
  const password = cleanPassword();
  if (!username || !email || password.length < 6) {
    setPublisherStatus("Informe nome de usuario, email e senha com pelo menos 6 caracteres.");
    return;
  }
  try {
    const credential = await firebaseApi.createUserWithEmailAndPassword(firebaseApi.auth, email, password);
    await firebaseApi.updateProfile(credential.user, { displayName: username });
    await firebaseApi.setDoc(firebaseApi.doc(firebaseApi.db, "users", credential.user.uid), {
      uid: credential.user.uid,
      username,
      email,
      created_at: firebaseApi.serverTimestamp(),
      updated_at: firebaseApi.serverTimestamp()
    }, { merge: true });
    setPublisherStatus("Conta criada.");
  } catch (error) {
    setPublisherStatus(error?.message || "Nao foi possivel criar conta.");
  }
}

async function signIn() {
  if (!firebaseApi) {
    setPublisherStatus("Firebase nao configurado.");
    return;
  }
  try {
    await firebaseApi.signInWithEmailAndPassword(firebaseApi.auth, cleanEmail(), cleanPassword());
    setPublisherStatus("Login concluido.");
  } catch (error) {
    setPublisherStatus(error?.message || "Nao foi possivel entrar.");
  }
}

async function signOut() {
  if (!firebaseApi) {
    return;
  }
  await firebaseApi.signOut(firebaseApi.auth);
  renderProfile(null, null, "Voce saiu.");
}

function fetchStaticCatalog() {
  const urls = [
    "catalog-store.json?v=20260703-pluginhub-pruned",
    "https://raw.githubusercontent.com/Nanquimori/KapiTomo/gh-pages/plugins/catalog-store.json?v=20260703-pluginhub-pruned"
  ];
  return urls.reduce((chain, url) => chain.catch(() => fetch(url, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("HTTP " + response.status)))), Promise.reject());
}

async function fetchPublishedPlugins() {
  if (!firebaseApi) {
    return [];
  }
  const snap = await firebaseApi.getDocs(firebaseApi.collection(firebaseApi.db, "plugins"));
  return snap.docs.map((item) => ({ ...item.data(), __source: "published" })).filter(hasRequiredPluginIcon);
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
    const canDelete = currentUser && plugin.owner_uid === currentUser.uid;
    const actions = [
      `<button class="button primary" type="button" data-install-plugin="${index}">Instalar no Nyxovira</button>`
    ];
    if (plugin.__source === "draft") {
      actions.push(`<button class="button" type="button" data-publish-plugin="${index}">Publicar</button>`);
    } else if (canDelete) {
      actions.push(`<button class="button" type="button" data-delete-plugin="${index}">Excluir</button>`);
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
  document.querySelectorAll("[data-delete-plugin]").forEach((button) => {
    button.addEventListener("click", () => deletePlugin(renderedPlugins[Number(button.dataset.deletePlugin)]));
  });
}

async function loadAllPlugins() {
  try {
    const [catalog, published] = await Promise.all([
      fetchStaticCatalog().catch(() => ({ plugins: [] })),
      fetchPublishedPlugins().catch(() => [])
    ]);
    const catalogPlugins = (Array.isArray(catalog.plugins) ? catalog.plugins : []).filter(hasRequiredPluginIcon);
    const drafts = loadDraftPlugins().map((plugin) => ({ ...plugin, __source: "draft" }));
    renderPlugins(uniquePlugins([drafts, published, catalogPlugins]));
  } catch (error) {
    list.innerHTML = `<p>Nao foi possivel carregar o catalogo: ${escapeHtml(error.message)}</p>`;
  }
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
    if (!currentUser) {
      setPublishStatus("Entre ou crie conta antes de publicar.");
      return;
    }
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
      author: manifest.author || currentProfile?.username || repo.owner,
      version: packageInfo.version || manifest.version || "1.0.0",
      site_url: browser.home_url || `https://github.com/${repo.owner}/${repo.repo}/`,
      homepage: browser.home_url || `https://github.com/${repo.owner}/${repo.repo}/`,
      icon_url: iconUrl,
      package_url: packageInfo.url,
      sha256: await sha256FromUrl(packageInfo.url),
      tags: Array.isArray(manifest.tags) ? manifest.tags : ["comunidade"],
      owner_uid: currentUser.uid,
      owner_username: currentProfile?.username || currentUser.email,
      repo_url: `https://github.com/${repo.owner}/${repo.repo}`,
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
  if (!currentUser || !firebaseApi) {
    setPublishStatus("Entre ou crie conta antes de publicar.");
    return;
  }
  try {
    const clean = publicPlugin(plugin);
    clean.owner_uid = currentUser.uid;
    clean.owner_username = currentProfile?.username || currentUser.email;
    clean.updated_at = firebaseApi.serverTimestamp();
    clean.created_at = clean.created_at || firebaseApi.serverTimestamp();
    setPublishStatus("Publicando...");
    await firebaseApi.setDoc(firebaseApi.doc(firebaseApi.db, "plugins", clean.id), clean, { merge: true });
    localStorage.setItem(LOCAL_PLUGIN_KEY, JSON.stringify(loadDraftPlugins().filter((draft) => draft.id !== clean.id)));
    setPublishStatus("Plugin publicado.");
    loadAllPlugins();
  } catch (error) {
    setPublishStatus(error?.message || "Nao foi possivel publicar.");
  }
}

async function deletePlugin(plugin) {
  if (!currentUser || !firebaseApi) {
    setRemoveStatus("Entre antes de excluir.");
    return;
  }
  if (!plugin || plugin.owner_uid !== currentUser.uid) {
    setRemoveStatus("Voce so pode excluir plugins publicados pela sua conta.");
    return;
  }
  try {
    await firebaseApi.deleteDoc(firebaseApi.doc(firebaseApi.db, "plugins", plugin.id));
    setRemoveStatus("Plugin excluido.");
    loadAllPlugins();
  } catch (error) {
    setRemoveStatus(error?.message || "Nao foi possivel excluir.");
  }
}

async function requestRemovePlugin() {
  const pluginId = String(removePluginIdInput?.value || "").trim();
  if (!pluginId) {
    setRemoveStatus("Informe o ID do plugin publicado.");
    return;
  }
  const plugin = renderedPlugins.find((item) => item.id === pluginId);
  if (!plugin) {
    setRemoveStatus("Plugin nao encontrado na lista carregada.");
    return;
  }
  await deletePlugin(plugin);
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

signInButton?.addEventListener("click", signIn);
signUpButton?.addEventListener("click", signUp);
signOutButton?.addEventListener("click", signOut);
loadRepoPluginButton?.addEventListener("click", loadRepoPlugin);
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
initFirebase();
