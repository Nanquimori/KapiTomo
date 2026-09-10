const pluginList = document.getElementById("pluginList");
const pluginSearchInput = document.getElementById("pluginSearchInput");
const tagFilter = document.getElementById("tagFilter");
const catalogCount = document.getElementById("catalogCount");
const catalogPagination = document.getElementById("catalogPagination");
const languageButtons = Array.from(document.querySelectorAll("[data-language-option]"));
const LANGUAGE_STORAGE_KEY = "kapitomo.pluginCatalogLanguage.v1";
const FAVORITES_STORAGE_KEY = "kapitomo.favoritePlugins.v1";
const LEGACY_STORAGE_KEYS = [
  "kapitomo.pluginDrafts.v3",
  "kapitomo.reportHistory.v1",
  "kapitomo.restrictedAccess.v1",
  "kapitomo.pluginHubLanguage.v1"
];
const CATALOG_VERSION = "20260910-official-only";
const ALLOWED_LANGUAGES = ["portuguese", "english"];
const ALLOWED_TYPES = ["manga", "manhua", "manhwa", "novel", "webtoon", "comic", "other"];

const I18N = {
  en: {
    title: "KapiTomo | Plugins",
    nav: { label: "Main navigation", catalog: "Plugins", api: "Plugin API" },
    hero: {
      kicker: "Official catalog",
      title: "Plugins published by Nanquimori",
      description: "This catalog contains only KapiTomo plugins maintained and published by Nanquimori for Nyxovira.",
      otherTitle: "Need another source?",
      otherText: "Create a personal plugin or connect an external catalog manually in Nyxovira. External catalogs remain independent from KapiTomo.",
      readApi: "Read the Plugin API"
    },
    catalog: {
      kicker: "Catalog",
      title: "Available plugins",
      search: "Search plugins",
      filters: "Plugin filters",
      pages: "Catalog pages",
      loading: "Loading catalog...",
      all: "All",
      count: "{count} plugin{plural} available.",
      shown: "{count} plugin{plural} found.",
      empty: "No plugin matches this search.",
      error: "The catalog could not be loaded. Try again later.",
      install: "Install",
      open: "Open site",
      favorite: "Favorite",
      online: "Available",
      previous: "Previous",
      next: "Next",
      page: "Page {page}"
    },
    tag: {
      portuguese: "Portuguese",
      english: "English",
      manga: "Manga",
      manhua: "Manhua",
      manhwa: "Manhwa",
      novel: "Novel",
      webtoon: "Webtoon",
      comic: "Comic",
      other: "Other"
    },
    install: {
      openInsideApp: "Open this catalog inside Nyxovira to install the plugin.",
      failed: "The plugin could not be installed.",
      unknown: "Unknown error"
    },
    footer: { terms: "Terms", privacy: "KapiTomo Privacy" }
  },
  pt: {
    title: "KapiTomo | Plugins",
    nav: { label: "Navegação principal", catalog: "Plugins", api: "API de Plugins" },
    hero: {
      kicker: "Catálogo oficial",
      title: "Plugins publicados por Nanquimori",
      description: "Este catálogo contém somente plugins do KapiTomo mantidos e publicados por Nanquimori para o Nyxovira.",
      otherTitle: "Precisa de outra fonte?",
      otherText: "Crie um plugin pessoal ou conecte manualmente um catálogo externo no Nyxovira. Catálogos externos continuam independentes do KapiTomo.",
      readApi: "Ler a API de Plugins"
    },
    catalog: {
      kicker: "Catálogo",
      title: "Plugins disponíveis",
      search: "Pesquisar plugins",
      filters: "Filtros de plugins",
      pages: "Páginas do catálogo",
      loading: "Carregando catálogo...",
      all: "Todos",
      count: "{count} plugin{plural} disponível{plural}.",
      shown: "{count} plugin{plural} encontrado{plural}.",
      empty: "Nenhum plugin corresponde a esta pesquisa.",
      error: "Não foi possível carregar o catálogo. Tente novamente mais tarde.",
      install: "Instalar",
      open: "Abrir site",
      favorite: "Favorito",
      online: "Disponível",
      previous: "Anterior",
      next: "Próxima",
      page: "Página {page}"
    },
    tag: {
      portuguese: "Português",
      english: "Inglês",
      manga: "Mangá",
      manhua: "Manhua",
      manhwa: "Manhwa",
      novel: "Novel",
      webtoon: "Webtoon",
      comic: "Quadrinho",
      other: "Outro"
    },
    install: {
      openInsideApp: "Abra este catálogo dentro do Nyxovira para instalar o plugin.",
      failed: "Não foi possível instalar o plugin.",
      unknown: "Erro desconhecido"
    },
    footer: { terms: "Termos", privacy: "Privacidade KapiTomo" }
  }
};

let currentLanguage = detectLanguage();
let allPlugins = [];
let filteredPlugins = [];
let selectedTag = "";
let currentPage = 1;

function detectLanguage() {
  const params = new URLSearchParams(globalThis.location && globalThis.location.search || "");
  const requested = String(params.get("lang") || "").toLowerCase();
  if (requested === "pt" || requested === "en") return requested;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "pt" || stored === "en") return stored;
  } catch {}
  return String(navigator.language || "").toLowerCase().startsWith("pt") ? "pt" : "en";
}

function removeLegacyData() {
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

function t(path, values = {}) {
  let output = path.split(".").reduce((value, part) => value && value[part], I18N[currentLanguage]);
  if (typeof output !== "string") output = path;
  Object.entries(values).forEach(([name, value]) => {
    output = output.replaceAll(`{${name}}`, String(value));
  });
  return output;
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage === "pt" ? "pt-BR" : "en";
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.languageOption === currentLanguage));
  });
}

function setLanguage(language) {
  currentLanguage = language === "pt" ? "pt" : "en";
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage); } catch {}
  applyTranslations();
  renderFilters();
  applyFilters(false);
}

function cleanTags(plugin) {
  return (Array.isArray(plugin && plugin.tags) ? plugin.tags : [])
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter((tag) => ALLOWED_LANGUAGES.includes(tag) || ALLOWED_TYPES.includes(tag));
}

function favoriteKeys() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

function isFavorite(plugin) {
  return favoriteKeys().includes(String(plugin.id || ""));
}

function toggleFavorite(plugin) {
  const id = String(plugin.id || "");
  const keys = favoriteKeys();
  const next = keys.includes(id) ? keys.filter((key) => key !== id) : [...keys, id];
  try { localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next)); } catch {}
  renderPage();
}

function renderFilters() {
  const tags = [...new Set(allPlugins.flatMap(cleanTags))];
  if (!tags.length) {
    tagFilter.innerHTML = "";
    return;
  }
  const options = ["", ...ALLOWED_LANGUAGES.filter((tag) => tags.includes(tag)), ...ALLOWED_TYPES.filter((tag) => tags.includes(tag))];
  tagFilter.innerHTML = options.map((tag) => `
    <button class="filter" type="button" data-filter-tag="${escapeHtml(tag)}" aria-pressed="${String(tag === selectedTag)}">
      ${escapeHtml(tag ? t("tag." + tag) : t("catalog.all"))}
    </button>
  `).join("");
  tagFilter.querySelectorAll("[data-filter-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTag = button.dataset.filterTag || "";
      renderFilters();
      applyFilters();
    });
  });
}

function applyFilters(resetPage = true) {
  const query = String(pluginSearchInput && pluginSearchInput.value || "").trim().toLocaleLowerCase(currentLanguage === "pt" ? "pt-BR" : "en");
  filteredPlugins = allPlugins.filter((plugin) => {
    const searchable = [plugin.name, plugin.id, plugin.description, plugin.author, ...cleanTags(plugin)]
      .join(" ").toLocaleLowerCase(currentLanguage === "pt" ? "pt-BR" : "en");
    return (!query || searchable.includes(query)) && (!selectedTag || cleanTags(plugin).includes(selectedTag));
  });
  if (resetPage) currentPage = 1;
  renderPage();
}

function pluginCard(plugin, index) {
  const tags = cleanTags(plugin);
  return `
    <article class="plugin-card">
      <div class="plugin-head">
        <img class="plugin-icon" src="${escapeHtml(plugin.icon_url)}" alt="" loading="lazy">
        <div class="plugin-title">
          <h3>${escapeHtml(plugin.name || plugin.id)}</h3>
          <p>${escapeHtml(plugin.author || "Nanquimori")} · v${escapeHtml(plugin.version || "1.0.0")}</p>
        </div>
        <span class="status">${escapeHtml(t("catalog.online"))}</span>
      </div>
      <p class="plugin-description">${escapeHtml(plugin.description || "")}</p>
      <div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(t("tag." + tag))}</span>`).join("")}</div>
      <div class="actions">
        <button class="button primary" type="button" data-install-index="${index}">${escapeHtml(t("catalog.install"))}</button>
        <a class="button" href="${escapeHtml(plugin.homepage || plugin.site_url || "#")}" target="_blank" rel="noopener">${escapeHtml(t("catalog.open"))}</a>
        <button class="button" type="button" data-favorite-index="${index}" aria-pressed="${String(isFavorite(plugin))}">★ ${escapeHtml(t("catalog.favorite"))}</button>
      </div>
    </article>
  `;
}

function renderPagination(model) {
  if (model.totalPages <= 1) {
    catalogPagination.hidden = true;
    catalogPagination.innerHTML = "";
    return;
  }
  const items = globalThis.KapiTomoPagination.visiblePageItems(model.totalPages, model.page);
  catalogPagination.hidden = false;
  catalogPagination.innerHTML = [
    `<button type="button" data-page="${model.page - 1}"${model.page === 1 ? " disabled" : ""}>${escapeHtml(t("catalog.previous"))}</button>`,
    ...items.map((item) => item === "ellipsis"
      ? "<span aria-hidden=\"true\">…</span>"
      : `<button type="button" data-page="${item}"${item === model.page ? ' aria-current="page"' : ""} aria-label="${escapeHtml(t("catalog.page", { page: item }))}">${item}</button>`),
    `<button type="button" data-page="${model.page + 1}"${model.page === model.totalPages ? " disabled" : ""}>${escapeHtml(t("catalog.next"))}</button>`
  ].join("");
  catalogPagination.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage = Number(button.dataset.page) || 1;
      renderPage();
    });
  });
}

function renderPage() {
  const model = globalThis.KapiTomoPagination.paginate(filteredPlugins, currentPage);
  currentPage = model.page;
  catalogCount.textContent = t(filteredPlugins.length === allPlugins.length ? "catalog.count" : "catalog.shown", {
    count: filteredPlugins.length,
    plural: filteredPlugins.length === 1 ? "" : currentLanguage === "pt" ? "s" : "s"
  });
  pluginList.innerHTML = model.items.length
    ? model.items.map((plugin, index) => pluginCard(plugin, index)).join("")
    : `<p class="empty">${escapeHtml(t("catalog.empty"))}</p>`;
  pluginList.querySelectorAll("[data-install-index]").forEach((button) => {
    button.addEventListener("click", () => installPlugin(model.items[Number(button.dataset.installIndex)]));
  });
  pluginList.querySelectorAll("[data-favorite-index]").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(model.items[Number(button.dataset.favoriteIndex)]));
  });
  renderPagination(model);
}

function installPlugin(plugin) {
  const bridge = globalThis.NyxoviraAndroidBridge || globalThis.ArchiveInkAndroidBridge;
  if (!bridge || typeof bridge.installOnlinePlugin !== "function") {
    alert(t("install.openInsideApp"));
    return;
  }
  try {
    const result = JSON.parse(bridge.installOnlinePlugin(JSON.stringify(plugin)) || "{}");
    alert(result.message || (result.success ? "" : t("install.failed")));
  } catch (error) {
    alert(t("install.failed") + " " + (error && error.message ? error.message : t("install.unknown")));
  }
}

async function loadCatalog() {
  try {
    const response = await fetch(`catalog-store.json?v=${CATALOG_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const catalog = await response.json();
    allPlugins = globalThis.KapiTomoPagination.sortCatalogPlugins(
      (Array.isArray(catalog.plugins) ? catalog.plugins : []).filter((plugin) =>
        plugin && plugin.status !== "removed" && plugin.status !== "hidden" && plugin.repository_url && plugin.icon_url
      )
    );
    renderFilters();
    applyFilters();
  } catch (error) {
    allPlugins = [];
    filteredPlugins = [];
    catalogCount.textContent = "";
    tagFilter.innerHTML = "";
    catalogPagination.hidden = true;
    pluginList.innerHTML = `<p class="error">${escapeHtml(t("catalog.error"))}</p>`;
  }
}

removeLegacyData();
applyTranslations();
languageButtons.forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.languageOption)));
pluginSearchInput.addEventListener("input", () => applyFilters());
loadCatalog();
