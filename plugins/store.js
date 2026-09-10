const pluginList = document.getElementById("pluginList");
const pluginSearchInput = document.getElementById("pluginSearchInput");
const favoritesOnlyButton = document.getElementById("favoritesOnlyButton");
const tagFilter = document.getElementById("tagFilter");
const tagFilterStatus = document.getElementById("tagFilterStatus");
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
const LANGUAGE_TAGS = ["portuguese", "english"];
const TYPE_TAGS = ["manga", "manhua", "manhwa", "novel", "webtoon", "comic", "other"];

const I18N = {
  en: {
    title: "KapiTomo | Plugins",
    nav: { label: "Catalog navigation", catalog: "Catalog", api: "Plugin API" },
    catalog: {
      kicker: "Catalog",
      title: "Published plugins",
      search: "Search plugins",
      favoritesOnly: "Favorites only",
      categories: "Categories",
      tagLegend: "Tag color meanings",
      tagNeutral: "No filter",
      tagIncluded: "Include tag",
      tagExcluded: "Exclude tag",
      tagFilters: "Catalog tag filters",
      language: "Language",
      type: "Type",
      officialPlugin: "Official plugin",
      loading: "Loading catalog...",
      paginationLabel: "Catalog pages",
      shown: "{count} plugin{plural} shown.",
      empty: "No plugin matches the selected filters.",
      error: "The catalog could not be loaded. Try again later.",
      install: "Install",
      open: "Open",
      favorite: "Favorite",
      official: "Official",
      online: "Online",
      previous: "Previous",
      next: "Next",
      page: "Page {page}"
    },
    tag: {
      portuguese: "Portuguese", english: "English", manga: "Manga", manhua: "Manhua",
      manhwa: "Manhwa", novel: "Novel", webtoon: "Webtoon", comic: "Comic", other: "Other"
    },
    install: {
      openInsideApp: "Open this catalog inside Nyxovira to install the plugin.",
      failed: "The plugin could not be installed.",
      unknown: "Unknown error"
    }
  },
  pt: {
    title: "KapiTomo | Plugins",
    nav: { label: "Navegação do catálogo", catalog: "Catálogo", api: "API de Plugins" },
    catalog: {
      kicker: "Catálogo",
      title: "Plugins publicados",
      search: "Pesquisar plugins",
      favoritesOnly: "Só favoritos",
      categories: "Categorias",
      tagLegend: "Significado das cores das tags",
      tagNeutral: "Sem filtro",
      tagIncluded: "Incluir tag",
      tagExcluded: "Excluir tag",
      tagFilters: "Filtros de tags do catálogo",
      language: "Idioma",
      type: "Tipo",
      officialPlugin: "Plugin oficial",
      loading: "Carregando catálogo...",
      paginationLabel: "Páginas do catálogo",
      shown: "{count} plugin{plural} exibido{plural}.",
      empty: "Nenhum plugin corresponde aos filtros selecionados.",
      error: "Não foi possível carregar o catálogo. Tente novamente mais tarde.",
      install: "Instalar",
      open: "Abrir",
      favorite: "Favorito",
      official: "Oficial",
      online: "Online",
      previous: "Anterior",
      next: "Próxima",
      page: "Página {page}"
    },
    tag: {
      portuguese: "Português", english: "Inglês", manga: "Mangá", manhua: "Manhua",
      manhwa: "Manhwa", novel: "Novel", webtoon: "Webtoon", comic: "Quadrinho", other: "Outros"
    },
    install: {
      openInsideApp: "Abra este catálogo dentro do Nyxovira para instalar o plugin.",
      failed: "Não foi possível instalar o plugin.",
      unknown: "Erro desconhecido"
    }
  }
};

let currentLanguage = detectLanguage();
let allPlugins = [];
let filteredPlugins = [];
let currentPage = 1;
let favoritesOnly = false;
const tagStates = new Map();

function detectLanguage() {
  const params = new URLSearchParams((globalThis.location && globalThis.location.search) || "");
  const requested = String(params.get("lang") || "").toLowerCase();
  if (requested === "pt" || requested === "en") return requested;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "pt" || stored === "en") return stored;
  } catch {}
  return String(navigator.language || "").toLowerCase().startsWith("pt") ? "pt" : "en";
}

function removeLegacyData() {
  try { LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key)); } catch {}
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
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.languageOption === currentLanguage));
  });
  updateFavoritesButton();
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
    .filter((tag) => LANGUAGE_TAGS.includes(tag) || TYPE_TAGS.includes(tag));
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
  applyFilters(false);
}

function updateFavoritesButton() {
  if (!favoritesOnlyButton) return;
  favoritesOnlyButton.textContent = t("catalog.favoritesOnly");
  favoritesOnlyButton.classList.toggle("is-active", favoritesOnly);
  favoritesOnlyButton.setAttribute("aria-pressed", String(favoritesOnly));
}

function filterButton(tag) {
  const state = tagStates.get(tag) || 0;
  const stateClass = state === 1 ? " is-active" : state === -1 ? " is-excluded" : "";
  return `<button class="filter-chip${stateClass}" type="button" data-filter-tag="${escapeHtml(tag)}" data-filter-state="${state}" aria-pressed="${String(state === 1)}">${escapeHtml(t("tag." + tag))}</button>`;
}

function renderFilters() {
  tagFilter.innerHTML = `
    <div class="tag-group">
      <p class="tag-group-title">${escapeHtml(t("catalog.language"))}</p>
      <div class="tag-row">${LANGUAGE_TAGS.map(filterButton).join("")}</div>
    </div>
    <div class="tag-group">
      <p class="tag-group-title">${escapeHtml(t("catalog.type"))}</p>
      <div class="tag-row">${TYPE_TAGS.map(filterButton).join("")}</div>
    </div>
  `;
  tagFilter.querySelectorAll("[data-filter-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.filterTag;
      const state = tagStates.get(tag) || 0;
      const next = state === 0 ? 1 : state === 1 ? -1 : 0;
      if (next === 0) tagStates.delete(tag); else tagStates.set(tag, next);
      renderFilters();
      applyFilters();
    });
  });
}

function applyFilters(resetPage = true) {
  const locale = currentLanguage === "pt" ? "pt-BR" : "en";
  const query = String((pluginSearchInput && pluginSearchInput.value) || "").trim().toLocaleLowerCase(locale);
  const included = [...tagStates].filter(([, state]) => state === 1).map(([tag]) => tag);
  const excluded = [...tagStates].filter(([, state]) => state === -1).map(([tag]) => tag);
  filteredPlugins = allPlugins.filter((plugin) => {
    const tags = cleanTags(plugin);
    const searchable = [plugin.name, plugin.id, plugin.description, plugin.author, ...tags].join(" ").toLocaleLowerCase(locale);
    return (!query || searchable.includes(query))
      && included.every((tag) => tags.includes(tag))
      && excluded.every((tag) => !tags.includes(tag))
      && (!favoritesOnly || isFavorite(plugin));
  });
  if (resetPage) currentPage = 1;
  renderPage();
}

function pluginCard(plugin, index) {
  const tags = cleanTags(plugin);
  const favorite = isFavorite(plugin);
  return `
    <article class="plugin-card is-official">
      <img class="plugin-icon" src="${escapeHtml(plugin.icon_url)}" alt="" loading="lazy">
      <div class="plugin-copy">
        <h3>${escapeHtml(plugin.name || plugin.id)}</h3>
        <div class="meta"><span>${escapeHtml(plugin.author || "Nanquimori")}</span><span>v${escapeHtml(plugin.version || "1.0.0")}</span></div>
      </div>
      <button class="favorite-button${favorite ? " is-active" : ""}" type="button" data-favorite-index="${index}" aria-pressed="${String(favorite)}" aria-label="${escapeHtml(t("catalog.favorite"))}"></button>
      <span class="official-badge">${escapeHtml(t("catalog.official"))}</span>
      <span class="site-status">${escapeHtml(t("catalog.online"))}</span>
      <div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(t("tag." + tag))}</span>`).join("")}</div>
      <div class="plugin-actions">
        <button class="button primary" type="button" data-install-index="${index}">${escapeHtml(t("catalog.install"))}</button>
        <a class="button" href="${escapeHtml(plugin.homepage || plugin.site_url || "#")}" target="_blank" rel="noopener">${escapeHtml(t("catalog.open"))}</a>
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
  const filtersActive = Boolean(pluginSearchInput.value.trim() || favoritesOnly || tagStates.size);
  tagFilterStatus.textContent = filtersActive
    ? t("catalog.shown", { count: filteredPlugins.length, plural: filteredPlugins.length === 1 ? "" : "s" })
    : "";
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
  } catch {
    allPlugins = [];
    filteredPlugins = [];
    tagFilter.innerHTML = "";
    tagFilterStatus.textContent = "";
    catalogPagination.hidden = true;
    pluginList.innerHTML = `<p class="error">${escapeHtml(t("catalog.error"))}</p>`;
  }
}

removeLegacyData();
applyTranslations();
languageButtons.forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.languageOption)));
pluginSearchInput.addEventListener("input", () => applyFilters());
favoritesOnlyButton.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  updateFavoritesButton();
  applyFilters();
});
loadCatalog();
