const list = document.getElementById("pluginList");
const repoUrlInput = document.getElementById("repoUrlInput");
const loadRepoPluginButton = document.getElementById("loadRepoPluginButton");
const discardDraftPluginsButton = document.getElementById("discardDraftPluginsButton");
const publishStatus = document.getElementById("publishStatus");
const removePluginIdInput = document.getElementById("removePluginIdInput");
const removeRepoUrlInput = document.getElementById("removeRepoUrlInput");
const requestRemovePluginButton = document.getElementById("requestRemovePluginButton");
const removeStatus = document.getElementById("removeStatus");
const reportPluginIdInput = document.getElementById("reportPluginIdInput");
const reportReasonInput = document.getElementById("reportReasonInput");
const reportEvidenceInput = document.getElementById("reportEvidenceInput");
const reportDetailsInput = document.getElementById("reportDetailsInput");
const requestReportPluginButton = document.getElementById("requestReportPluginButton");
const reportStatus = document.getElementById("reportStatus");
const reportCreatorHelp = document.getElementById("reportCreatorHelp");
const reportCreatorLink = document.getElementById("reportCreatorLink");
const tagFilter = document.getElementById("tagFilter");
const tagFilterStatus = document.getElementById("tagFilterStatus");
const pluginSearchInput = document.getElementById("pluginSearchInput");
const favoritesOnlyButton = document.getElementById("favoritesOnlyButton");
const viewButtons = Array.from(document.querySelectorAll("[data-view-target]"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const languageButtons = Array.from(document.querySelectorAll("[data-language-option]"));
const LOCAL_PLUGIN_KEY = "kapitomo.pluginDrafts.v3";
const LANGUAGE_STORAGE_KEY = "kapitomo.pluginHubLanguage.v1";
const FAVORITE_PLUGIN_KEY = "kapitomo.favoritePlugins.v1";
const CATALOG_VERSION = "20260826-report-scope";
const MAX_SELECTED_TAGS = 4;
const MIN_PUBLIC_TAGS = 2;
const OFFICIAL_LANGUAGE_TAGS = [
  "english",
  "portuguese",
  "spanish",
  "japanese",
  "korean",
  "chinese",
  "indonesian",
  "thai",
  "vietnamese",
  "french",
  "german",
  "italian",
  "russian",
  "arabic"
];
const OFFICIAL_TYPE_TAGS = [
  "manga",
  "manhua",
  "manhwa",
  "novel",
  "webtoon",
  "comic"
];
const LANGUAGE_TAGS = new Set(OFFICIAL_LANGUAGE_TAGS);
const TYPE_TAGS = new Set(OFFICIAL_TYPE_TAGS);
const PUBLIC_TAGS = new Set([...OFFICIAL_LANGUAGE_TAGS, ...OFFICIAL_TYPE_TAGS]);
const I18N = {
  en: {
    title: "KapiTomo | Plugin Hub",
    nav: {
      catalog: "Catalog",
      publish: "Publish",
      report: "Report",
      remove: "Remove",
      api: "Plugin API",
      terms: "Rules & terms"
    },
    catalog: {
      kicker: "Catalog",
      title: "Published plugins",
      search: "Search plugins",
      notice: "Community plugins are source connectors published from their creators' public GitHub repositories. KapiTomo lists the catalog entry and moderates it under the catalog rules.",
      rulesLink: "Read the catalog rules",
      categories: "Categories",
      tagFilters: "Catalog tag filters",
      tagLegend: "Tag color meanings",
      tagNeutral: "No filter",
      tagIncluded: "Include tag",
      tagExcluded: "Exclude tag",
      loading: "Loading catalog...",
      noTags: "No tags available yet.",
      noPlugins: "No plugins published yet.",
      noMatches: "No plugins match the selected tags.",
      matching: "{count} plugin{plural} matching {filters}.",
      loadError: "Could not load the catalog: {message}",
      language: "Language",
      type: "Type",
      favorite: "Favorite",
      favorites: "Favorites",
      favoriteOnly: "Favorites only",
      showAll: "Show all",
      without: "without {tags}",
      online: "Online",
      offline: "Offline",
      install: "Install",
      publish: "Publish",
      report: "Report",
      remove: "Delete",
      open: "Open",
      pluginFallback: "Plugin"
    },
    report: {
      kicker: "Report",
      title: "Report a catalog violation",
      description: "Use this channel only for behavior of the plugin code, its public repository, or its catalog entry. Submitting a report does not automatically hide or remove the plugin.",
      notFor: "Not for source-site content, missing chapters, translation quality, advertisements, outages, account rules, or ordinary download/support problems. Those belong to the source site or plugin creator.",
      technicalHelp: "For a technical problem, contact the plugin creator in its repository:",
      creatorRepository: "Open creator repository",
      notice: "The GitHub request is public. Do not include personal data or confidential evidence; send sensitive material by email using the address in the catalog rules.",
      pluginId: "Plugin ID",
      reason: "Reason",
      chooseReason: "Select a reason",
      evidence: "Evidence URL (optional)",
      details: "What happened?",
      detailsPlaceholder: "Describe the behavior, affected page, date, and how the problem can be verified.",
      request: "Open review request",
      enterId: "Enter the plugin ID.",
      invalidId: "Use a valid plugin ID.",
      choose: "Select the reason for the report.",
      explain: "Describe the problem with enough detail to review it.",
      invalidEvidence: "Evidence must be a valid http or https URL.",
      opening: "Opening the public review request on GitHub...",
      requestTitle: "Plugin catalog violation report.",
      requestDescription: "This report concerns the plugin code, repository, or catalog entry. It does not concern third-party source content and does not automatically change the plugin's availability.",
      pluginIdLine: "Plugin ID: {id}",
      categoryLine: "Category: {category}",
      evidenceLine: "Evidence URL: {url}",
      noEvidence: "not provided",
      detailsLine: "Details:",
      rulesLine: "Catalog rules: https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules",
      categories: {
        malware: "Malware, malicious code, or dangerous redirects",
        credentials: "Credential theft or deceptive login",
        privacy: "Undeclared collection or sharing of user data",
        identity: "False author, impersonation, or deceptive catalog metadata",
        protection: "Plugin code bypasses login, paywall, DRM, or access control"
      }
    },
    publish: {
      kicker: "Publish",
      title: "Publish a ready plugin",
      description: "Paste the GitHub repository that already contains plugin.json. The Hub opens a GitHub request and publishes entries that pass the technical checks and accept the catalog rules.",
      notice: "Publishing confirms that the creator controls the repository and accepts responsibility for the plugin code, metadata, permissions, maintenance, and source mapping. Automatic validation is not an endorsement of third-party content.",
      rulesLink: "Review the rules before publishing",
      repository: "GitHub repository",
      load: "Load plugin",
      discard: "Discard drafts",
      how: "How publishing works",
      step1: {
        title: "Prepare the plugin",
        text: "Keep the manifest and browser script organized in the repository."
      },
      step2: {
        title: "Publish on GitHub",
        text: "The plugin stays in your repository, and KapiTomo publishes only the catalog entry."
      },
      step3: {
        title: "Add it to the catalog",
        text: "Use the publication button and confirm on GitHub. Automation updates the catalog when it finishes."
      },
      reading: "Reading plugin.json from the repository...",
      preparing: "Preparing the publication request...",
      loaded: "Plugin loaded. Confirm the GitHub request and the catalog automation will validate the repository before publishing.",
      failed: "Could not load the plugin.",
      outdated: "This draft is outdated. Load the GitHub repository again before requesting publication.",
      draftsRemoved: "Drafts removed from this browser.",
      requestTitle: "Plugin publication request for the Nyxovira catalog.",
      requestDescription: "After submission, the catalog automation validates the repository, ownership, manifest, icon, tags, hosts, and acceptance of the current catalog rules.",
      responsibility: "By submitting this plugin, I confirm that I control its repository, accept the current Plugin Hub catalog rules, and am responsible for the plugin code, metadata, icon, permissions requested by the plugin, maintenance, and source mapping. I understand that automatic publication is not approval of third-party content.",
      acceptanceLine: "Catalog rules accepted: yes",
      rulesLine: "Catalog rules: https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules",
      repositoryLine: "Repository: {url}",
      tagMinimum: "plugin.json must declare at least 2 tags: language first, then type.",
      firstTag: "The first public tag must be one of: {tags}.",
      nextTags: "After the language tag, every public tag must be one of: {tags}.",
      validUrl: "Paste a valid GitHub URL.",
      githubOnly: "Use a github.com repository.",
      ownerRepo: "The URL must include an owner and repository.",
      manifestMissing: "plugin.json was not found in the repository. {message}",
      iconMissing: "The plugin must declare browser.icon_url."
    },
    remove: {
      kicker: "Remove",
      title: "Remove a publication",
      description: "Enter the published plugin and confirm the GitHub request. Plugin owners can remove their own entries; maintainer actions require a recorded reason under the catalog rules.",
      pluginId: "Plugin ID",
      repository: "GitHub repository",
      request: "Request removal",
      enterId: "Enter the published plugin ID.",
      enterRepo: "Enter the plugin GitHub repository.",
      opening: "Opening the removal request on GitHub...",
      requestTitle: "Plugin removal request for the Nyxovira catalog.",
      requestDescription: "After you submit this request, the catalog automation validates ownership and applies authorized removals automatically.",
      pluginIdLine: "Plugin ID: {id}",
      repositoryLine: "Repository: {url}",
      confirm: "I confirm that I want to remove this plugin from the online catalog."
    },
    ownership: {
      kicker: "Ownership",
      title: "Who can manage a plugin?",
      explainer: "The Hub compares the GitHub account that opens the request with the repository owner saved in the catalog.",
      joao: "can publish and remove",
      maria: "can publish and remove",
      blocked: "cannot remove Maria's plugin",
      moderator: "can review both under the catalog rules",
      rule: "The typed link and ID identify the plugin; authorization comes from the GitHub account that creates the issue."
    },
    install: {
      iconMissing: "This plugin does not have icon_url and cannot be installed from the online catalog.",
      repositoryMissing: "This plugin does not have repository_url and cannot be installed from the online catalog.",
      openInsideApp: "Open this page from the Online plugins button inside Nyxovira to install directly in the app.",
      success: "Plugin installed.",
      failed: "Could not install the plugin.",
      failedWithMessage: "Could not install the plugin: {message}",
      unknown: "unknown error"
    }
  },
  pt: {
    title: "KapiTomo | Hub de Plugins",
    nav: {
      catalog: "Catálogo",
      publish: "Publicar",
      report: "Denunciar",
      remove: "Remover",
      api: "API de Plugins",
      terms: "Regras e termos"
    },
    catalog: {
      kicker: "Catálogo",
      title: "Plugins publicados",
      search: "Pesquisar plugins",
      notice: "Plugins da comunidade são conectores de fontes publicados nos repositórios GitHub públicos de seus criadores. O KapiTomo lista a entrada e aplica as regras de moderação do catálogo.",
      rulesLink: "Leia as regras do catálogo",
      categories: "Categorias",
      tagFilters: "Filtros de tags do catálogo",
      tagLegend: "Significado das cores das tags",
      tagNeutral: "Sem filtro",
      tagIncluded: "Incluir tag",
      tagExcluded: "Excluir tag",
      loading: "Carregando catálogo...",
      noTags: "Nenhuma tag disponível ainda.",
      noPlugins: "Nenhum plugin publicado ainda.",
      noMatches: "Nenhum plugin combina com as tags selecionadas.",
      matching: "{count} plugin{plural} encontrado{plural} para {filters}.",
      loadError: "Não foi possível carregar o catálogo: {message}",
      language: "Idioma",
      type: "Tipo",
      favorite: "Favoritar",
      favorites: "Favoritos",
      favoriteOnly: "So favoritos",
      showAll: "Mostrar todos",
      without: "sem {tags}",
      online: "Online",
      offline: "Offline",
      install: "Instalar",
      publish: "Publicar",
      report: "Denunciar",
      remove: "Excluir",
      open: "Abrir",
      pluginFallback: "Plugin"
    },
    report: {
      kicker: "Denúncia",
      title: "Denuncie uma violação do catálogo",
      description: "Use este canal somente para comportamentos do código do plugin, de seu repositório público ou de sua entrada no catálogo. Enviar uma denúncia não oculta nem remove o plugin automaticamente.",
      notFor: "Não use para conteúdo do site de origem, capítulos ausentes, qualidade da tradução, anúncios, indisponibilidade, regras de conta ou problemas comuns de download e suporte. Esses assuntos pertencem ao site de origem ou ao criador do plugin.",
      technicalHelp: "Para um problema técnico, procure o criador no repositório do plugin:",
      creatorRepository: "Abrir repositório do criador",
      notice: "A solicitação no GitHub é pública. Não inclua dados pessoais nem provas confidenciais; envie material sensível pelo e-mail informado nas regras do catálogo.",
      pluginId: "ID do plugin",
      reason: "Motivo",
      chooseReason: "Selecione um motivo",
      evidence: "URL da evidência (opcional)",
      details: "O que aconteceu?",
      detailsPlaceholder: "Descreva o comportamento, a página afetada, a data e como o problema pode ser verificado.",
      request: "Abrir solicitação de análise",
      enterId: "Informe o ID do plugin.",
      invalidId: "Use um ID de plugin válido.",
      choose: "Selecione o motivo da denúncia.",
      explain: "Descreva o problema com detalhes suficientes para análise.",
      invalidEvidence: "A evidência precisa ser uma URL http ou https válida.",
      opening: "Abrindo a solicitação pública de análise no GitHub...",
      requestTitle: "Denúncia de violação do catálogo de plugins.",
      requestDescription: "Esta denúncia diz respeito ao código, repositório ou entrada do plugin no catálogo. Ela não trata de conteúdos da fonte de terceiros e não altera automaticamente a disponibilidade do plugin.",
      pluginIdLine: "ID do plugin: {id}",
      categoryLine: "Categoria: {category}",
      evidenceLine: "URL da evidência: {url}",
      noEvidence: "não informada",
      detailsLine: "Detalhes:",
      rulesLine: "Regras do catálogo: https://nanquimori.github.io/KapiTomo/terms/#regras-do-catalogo",
      categories: {
        malware: "Malware, código malicioso ou redirecionamentos perigosos",
        credentials: "Roubo de credenciais ou tela de login enganosa",
        privacy: "Coleta ou envio de dados do usuário não declarados",
        identity: "Autor falso, imitação ou metadados enganosos no catálogo",
        protection: "O código do plugin contorna login, paywall, DRM ou controle de acesso"
      }
    },
    publish: {
      kicker: "Publicar",
      title: "Publique um plugin pronto",
      description: "Cole o repositório GitHub que já contém plugin.json. O Hub abre uma solicitação no GitHub e publica entradas que passam nas verificações técnicas e aceitam as regras do catálogo.",
      notice: "A publicação confirma que o criador controla o repositório e aceita responsabilidade pelo código, metadados, permissões, manutenção e mapeamento da fonte. A validação automática não representa aprovação de conteúdos de terceiros.",
      rulesLink: "Revise as regras antes de publicar",
      repository: "Repositório GitHub",
      load: "Carregar plugin",
      discard: "Descartar rascunhos",
      how: "Como a publicação funciona",
      step1: {
        title: "Prepare o plugin",
        text: "Mantenha o manifesto e o script do navegador organizados no repositório."
      },
      step2: {
        title: "Publique no GitHub",
        text: "O plugin fica no seu repositório, e o KapiTomo publica apenas a entrada do catálogo."
      },
      step3: {
        title: "Adicione ao catálogo",
        text: "Use o botão de publicação e confirme no GitHub. A automação atualiza o catálogo quando terminar."
      },
      reading: "Lendo plugin.json do repositório...",
      preparing: "Preparando a solicitação de publicação...",
      loaded: "Plugin carregado. Confirme a solicitação no GitHub e a automação do catálogo validará o repositório antes de publicar.",
      failed: "Não foi possível carregar o plugin.",
      outdated: "Este rascunho está desatualizado. Carregue o repositório GitHub novamente antes de solicitar publicação.",
      draftsRemoved: "Rascunhos removidos deste navegador.",
      requestTitle: "Solicitação de publicação de plugin para o catálogo do Nyxovira.",
      requestDescription: "Depois do envio, a automação valida repositório, propriedade, manifesto, ícone, tags, domínios e aceitação das regras atuais do catálogo.",
      responsibility: "Ao enviar este plugin, confirmo que controlo seu repositório, aceito as regras atuais do catálogo do Plugin Hub e sou responsável pelo código, metadados, ícone, permissões solicitadas pelo plugin, manutenção e mapeamento da fonte. Entendo que a publicação automática não representa aprovação de conteúdos de terceiros.",
      acceptanceLine: "Regras do catálogo aceitas: sim",
      rulesLine: "Regras do catálogo: https://nanquimori.github.io/KapiTomo/terms/#regras-do-catalogo",
      repositoryLine: "Repositório: {url}",
      tagMinimum: "plugin.json precisa declarar pelo menos 2 tags: idioma primeiro, depois tipo.",
      firstTag: "A primeira tag pública precisa ser uma destas: {tags}.",
      nextTags: "Depois da tag de idioma, toda tag pública precisa ser uma destas: {tags}.",
      validUrl: "Cole uma URL válida do GitHub.",
      githubOnly: "Use um repositório github.com.",
      ownerRepo: "A URL precisa incluir usuário e repositório.",
      manifestMissing: "plugin.json não foi encontrado no repositório. {message}",
      iconMissing: "O plugin precisa declarar browser.icon_url."
    },
    remove: {
      kicker: "Remover",
      title: "Remova uma publicação",
      description: "Informe o plugin publicado e confirme a solicitação no GitHub. Donos podem remover as próprias entradas; ações de mantenedores exigem motivo registrado conforme as regras do catálogo.",
      pluginId: "ID do plugin",
      repository: "Repositório GitHub",
      request: "Solicitar remoção",
      enterId: "Informe o ID do plugin publicado.",
      enterRepo: "Informe o repositório GitHub do plugin.",
      opening: "Abrindo a solicitação de remoção no GitHub...",
      requestTitle: "Solicitação de remoção de plugin do catálogo do Nyxovira.",
      requestDescription: "Depois de enviar esta solicitação, a automação valida a propriedade e aplica automaticamente as remoções autorizadas.",
      pluginIdLine: "ID do plugin: {id}",
      repositoryLine: "Repositório: {url}",
      confirm: "Confirmo que quero remover este plugin do catálogo online."
    },
    ownership: {
      kicker: "Propriedade",
      title: "Quem pode gerenciar um plugin?",
      explainer: "O Hub compara a conta GitHub que abre a solicitação com o dono do repositório salvo no catálogo.",
      joao: "pode publicar e remover",
      maria: "pode publicar e remover",
      blocked: "não pode remover o plugin de Maria",
      moderator: "pode analisar ambos conforme as regras do catálogo",
      rule: "O link e o ID informados identificam o plugin; a autorização vem da conta GitHub que cria a issue."
    },
    install: {
      iconMissing: "Este plugin não tem icon_url e não pode ser instalado pelo catálogo online.",
      repositoryMissing: "Este plugin não tem repository_url e não pode ser instalado pelo catálogo online.",
      openInsideApp: "Abra esta página pelo botão Plugins online dentro do Nyxovira para instalar direto no app.",
      success: "Plugin instalado.",
      failed: "Não foi possível instalar o plugin.",
      failedWithMessage: "Não foi possível instalar o plugin: {message}",
      unknown: "erro desconhecido"
    }
  }
};
let renderedPlugins = [];
let allPlugins = [];
let availableTags = [];
let selectedTags = [];
let excludedTags = [];
let favoritePluginKeys = loadFavoritePluginKeys();
let favoritesOnly = false;
let searchQuery = "";
let currentLanguage = initialLanguage();

function normalizeLanguage(value) {
  const language = String(value ? value : "").toLowerCase();
  return language.startsWith("pt") ? "pt" : "en";
}

function detectLanguage() {
  const candidates = [];
  if (navigator.languages && navigator.languages.length) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale) {
      candidates.push(locale);
    }
  } catch (error) {}
  if (candidates.some((candidate) => normalizeLanguage(candidate) === "pt")) {
    return "pt";
  }
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (/Sao_Paulo|Lisbon|Madeira|Azores|Luanda|Maputo|Bissau|Cape_Verde/i.test(String(timeZone))) {
      return "pt";
    }
  } catch (error) {}
  return "en";
}

function initialLanguage() {
  const urlLanguage = new URLSearchParams(window.location.search).get("lang");
  if (urlLanguage) {
    return normalizeLanguage(urlLanguage);
  }
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      return normalizeLanguage(stored);
    }
  } catch (error) {}
  return detectLanguage();
}

function t(key, values = {}) {
  const parts = key.split(".");
  let output = I18N[currentLanguage];
  parts.forEach((part) => {
    output = output && output[part];
  });
  if (typeof output !== "string") {
    output = key;
  }
  Object.entries(values).forEach(([name, value]) => {
    output = output.split(`{${name}}`).join(value);
  });
  return output;
}

function applyStaticTranslations() {
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
    button.setAttribute("aria-pressed", button.dataset.languageOption === currentLanguage ? "true" : "false");
  });
}

function setLanguage(language, persist = true) {
  currentLanguage = normalizeLanguage(language);
  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    } catch (error) {}
  }
  applyStaticTranslations();
  renderTagFilters(availableTags);
  updateFavoritesOnlyButton();
  applyTagFilters();
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
  return Boolean(plugin && String(plugin.icon_url || "").trim());
}

function hasRepository(plugin) {
  return Boolean(plugin && String(plugin.repository_url || "").trim());
}

function pluginStatus(plugin) {
  const status = String(plugin?.status || "active").trim().toLowerCase();
  return ["active", "broken", "hidden", "removed", "missing"].includes(status) ? status : "active";
}

function isVisiblePlugin(plugin) {
  return !["hidden", "removed", "missing"].includes(pluginStatus(plugin));
}

function siteStatusLabel(plugin) {
  return pluginStatus(plugin) === "broken" ? t("catalog.offline") : t("catalog.online");
}

function siteStatusClass(plugin) {
  return pluginStatus(plugin) === "broken" ? "is-offline" : "is-online";
}

function setPublishStatus(message) {
  if (publishStatus) {
    publishStatus.textContent = message || "";
  }
}

function setReportStatus(message) {
  if (reportStatus) {
    reportStatus.textContent = message || "";
  }
}

function setRemoveStatus(message) {
  if (removeStatus) {
    removeStatus.textContent = message || "";
  }
}

function catalogFreshness(catalog) {
  const plugins = Array.isArray(catalog?.plugins) ? catalog.plugins : [];
  return plugins.reduce((latest, plugin) => {
    const checkedAt = Date.parse(String(plugin?.last_checked_at || ""));
    return Number.isFinite(checkedAt) ? Math.max(latest, checkedAt) : latest;
  }, 0);
}

async function fetchCatalog() {
  const cacheKey = `${CATALOG_VERSION}-${Date.now()}`;
  const urls = [
    `catalog-store.json?v=${cacheKey}`,
    `https://raw.githubusercontent.com/Nanquimori/KapiTomo/main/plugins/catalog-store.json?v=${cacheKey}`,
    `https://raw.githubusercontent.com/Nanquimori/KapiTomo/gh-pages/plugins/catalog-store.json?v=${cacheKey}`
  ];
  const results = await Promise.allSettled(urls.map((url) => fetch(url, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("HTTP " + response.status)))));
  const catalogs = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((catalog) => catalog && Array.isArray(catalog.plugins));
  if (!catalogs.length) {
    const failed = results.find((result) => result.status === "rejected");
    throw failed?.reason || new Error("No plugin catalog is available.");
  }
  return catalogs.sort((first, second) => catalogFreshness(second) - catalogFreshness(first))[0];
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

function normalizedPluginId(plugin) {
  return String(plugin?.id || "").trim().toLowerCase();
}

function normalizedRepositoryUrl(plugin) {
  const rawUrl = String(plugin?.repository_url || "").trim();
  try {
    const url = new URL(rawUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    if (/^(www\.)?github\.com$/i.test(url.hostname) && parts.length >= 2) {
      return `github.com/${parts[0]}/${parts[1].replace(/\.git$/i, "")}`.toLowerCase();
    }
  } catch (error) {}
  return rawUrl.replace(/\.git\/?$/i, "").replace(/\/+$/, "").toLowerCase();
}

function isSamePluginPublication(first, second) {
  const firstId = normalizedPluginId(first);
  const secondId = normalizedPluginId(second);
  if (firstId && secondId && firstId === secondId) {
    return true;
  }
  const firstRepository = normalizedRepositoryUrl(first);
  const secondRepository = normalizedRepositoryUrl(second);
  return Boolean(firstRepository
    && firstRepository === secondRepository
    && normalizePluginPath(first?.plugin_path).toLowerCase() === normalizePluginPath(second?.plugin_path).toLowerCase());
}

function loadFavoritePluginKeys() {
  try {
    const values = JSON.parse(localStorage.getItem(FAVORITE_PLUGIN_KEY) || "[]");
    return new Set(Array.isArray(values) ? values.map((value) => String(value || "")).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function saveFavoritePluginKeys() {
  try {
    localStorage.setItem(FAVORITE_PLUGIN_KEY, JSON.stringify([...favoritePluginKeys].filter(Boolean)));
  } catch (error) {}
}

function isFavoritePlugin(plugin) {
  return favoritePluginKeys.has(pluginKey(plugin));
}

function toggleFavoritePlugin(plugin) {
  const key = pluginKey(plugin);
  if (!key.trim()) {
    return;
  }
  if (favoritePluginKeys.has(key)) {
    favoritePluginKeys.delete(key);
  } else {
    favoritePluginKeys.add(key);
  }
  saveFavoritePluginKeys();
  applyTagFilters();
}

function displayTags(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter((tag) => PUBLIC_TAGS.has(tag))
    .slice(0, 4);
}

function filterTags(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter((tag) => PUBLIC_TAGS.has(tag));
}

function normalizePublicationTags(tags) {
  const rawTags = Array.isArray(tags) ? tags : ["community"];
  const output = [];
  const seen = new Set();
  rawTags.forEach((tag) => {
    const clean = String(tag || "").trim().toLowerCase();
    if (!clean || seen.has(clean)) {
      return;
    }
    if (clean !== "official" && clean !== "community") {
      if (!PUBLIC_TAGS.has(clean)) {
        return;
      }
      const publicCount = output.filter((item) => item !== "official" && item !== "community").length;
      if (publicCount >= MAX_SELECTED_TAGS) {
        return;
      }
    }
    seen.add(clean);
    output.push(clean);
  });
  const publicTags = output.filter((tag) => tag !== "official" && tag !== "community");
  if (publicTags.length < MIN_PUBLIC_TAGS) {
    throw new Error(t("publish.tagMinimum"));
  }
  if (!isLanguageTag(publicTags[0])) {
    throw new Error(t("publish.firstTag", { tags: OFFICIAL_LANGUAGE_TAGS.join(", ") }));
  }
  const invalidType = publicTags.slice(1).find((tag) => !TYPE_TAGS.has(tag));
  if (invalidType) {
    throw new Error(t("publish.nextTags", { tags: OFFICIAL_TYPE_TAGS.join(", ") }));
  }
  return output;
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

function pluginMatchesExcludedTags(plugin) {
  if (!excludedTags.length) {
    return true;
  }
  const tags = new Set(filterTags(plugin.tags));
  return excludedTags.every((tag) => !tags.has(tag));
}

function pluginMatchesFavoriteMode(plugin) {
  return !favoritesOnly || isFavoritePlugin(plugin);
}

function pluginMatchesSearch(plugin) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return [
    plugin.name,
    plugin.id,
    plugin.author,
    plugin.site_url,
    plugin.homepage,
    plugin.repository_url,
    ...(Array.isArray(plugin.hosts) ? plugin.hosts : []),
    ...(Array.isArray(plugin.tags) ? plugin.tags : [])
  ].some((value) => String(value || "").toLowerCase().includes(query));
}

function isLanguageTag(tag) {
  return LANGUAGE_TAGS.has(String(tag || "").trim().toLowerCase());
}

function renderTagButton(tag) {
  const active = selectedTags.includes(tag);
  const excluded = excludedTags.includes(tag);
  const className = [
    "filter-chip",
    active ? "is-active" : "",
    excluded ? "is-excluded" : ""
  ].filter(Boolean).join(" ");
  return `<button class="${className}" type="button" data-filter-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
}

function renderTagGroup(title, tags) {
  if (!tags.length) {
    return "";
  }
  return `
    <div class="tag-group">
      <p class="tag-group-title">${escapeHtml(title)}</p>
      <div class="tag-row">${tags.map(renderTagButton).join("")}</div>
    </div>
  `;
}

function renderTagFilters(tags) {
  availableTags = uniqueTags([OFFICIAL_LANGUAGE_TAGS, OFFICIAL_TYPE_TAGS, tags]);
  selectedTags = selectedTags.filter((tag) => availableTags.includes(tag));
  excludedTags = excludedTags.filter((tag) => availableTags.includes(tag) && !selectedTags.includes(tag));
  if (!tagFilter) {
    return;
  }
  const languageTags = OFFICIAL_LANGUAGE_TAGS;
  const contentTags = OFFICIAL_TYPE_TAGS;
  tagFilter.innerHTML = availableTags.length
    ? [
      renderTagGroup(t("catalog.language"), languageTags),
      renderTagGroup(t("catalog.type"), contentTags)
    ].join("")
    : `<p class="filter-status">${escapeHtml(t("catalog.noTags"))}</p>`;
  tagFilter.querySelectorAll("[data-filter-tag]").forEach((button) => {
    button.addEventListener("click", () => toggleTagFilter(button.dataset.filterTag));
  });
}

function setTagStatus(filteredCount) {
  if (!tagFilterStatus) {
    return;
  }
  if (!allPlugins.length) {
    tagFilterStatus.textContent = t("catalog.noPlugins");
    return;
  }
  if (!selectedTags.length && !excludedTags.length && !favoritesOnly && !searchQuery.trim()) {
    tagFilterStatus.textContent = "";
    return;
  }
  const pieces = [];
  if (selectedTags.length) {
    pieces.push(selectedTags.join(", "));
  }
  if (excludedTags.length) {
    pieces.push(t("catalog.without", { tags: excludedTags.join(", ") }));
  }
  if (favoritesOnly) {
    pieces.push(t("catalog.favoriteOnly"));
  }
  if (searchQuery.trim()) {
    pieces.push(`"${searchQuery.trim()}"`);
  }
  tagFilterStatus.textContent = t("catalog.matching", {
    count: filteredCount,
    plural: filteredCount === 1 ? "" : "s",
    filters: pieces.join(" + ")
  });
}

function applyTagFilters() {
  const filtered = allPlugins.filter((plugin) => pluginMatchesSelectedTags(plugin)
    && pluginMatchesExcludedTags(plugin)
    && pluginMatchesFavoriteMode(plugin)
    && pluginMatchesSearch(plugin));
  renderTagFilters(availableTags);
  updateFavoritesOnlyButton();
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
    excludedTags = [...excludedTags, clean];
  } else if (excludedTags.includes(clean)) {
    excludedTags = excludedTags.filter((selected) => selected !== clean);
  } else {
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
  const output = [];
  groups.flat().forEach((plugin) => {
    const key = pluginKey(plugin);
    if (!key.trim() || output.some((existing) => isSamePluginPublication(existing, plugin))) {
      return;
    }
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

function updateFavoritesOnlyButton() {
  if (!favoritesOnlyButton) {
    return;
  }
  favoritesOnlyButton.classList.toggle("is-active", favoritesOnly);
  favoritesOnlyButton.setAttribute("aria-pressed", favoritesOnly ? "true" : "false");
  favoritesOnlyButton.textContent = favoritesOnly ? t("catalog.showAll") : t("catalog.favoriteOnly");
}

function renderPlugins(plugins) {
  renderedPlugins = plugins;
  list.innerHTML = plugins.length ? plugins.map((plugin, index) => {
    const tags = displayTags(plugin.tags);
    const favorite = isFavoritePlugin(plugin);
    const actions = [
      `<button class="button primary" type="button" data-install-plugin="${index}">${escapeHtml(t("catalog.install"))}</button>`
    ];
    if (plugin.__source === "draft") {
      actions.push(`<button class="button" type="button" data-publish-plugin="${index}">${escapeHtml(t("catalog.publish"))}</button>`);
      actions.push(`<button class="button" type="button" data-delete-draft="${index}">${escapeHtml(t("catalog.remove"))}</button>`);
    } else {
      if (plugin.homepage || plugin.site_url) {
        actions.push(`<a class="button" href="${escapeHtml(plugin.homepage || plugin.site_url)}">${escapeHtml(t("catalog.open"))}</a>`);
      }
      actions.push(`<button class="button" type="button" data-report-plugin="${index}">${escapeHtml(t("catalog.report"))}</button>`);
    }
    return `
      <article class="plugin-card">
        <button class="favorite-button${favorite ? " is-active" : ""}" type="button" data-favorite-plugin="${index}" aria-pressed="${favorite ? "true" : "false"}" aria-label="${escapeHtml(t("catalog.favorite"))}"></button>
        <img class="plugin-icon" src="${escapeHtml(plugin.icon_url)}" alt="">
        <div class="plugin-copy">
          <h3>${escapeHtml(plugin.name || plugin.id || t("catalog.pluginFallback"))}</h3>
          <div class="meta">
            ${plugin.author ? `<span>${escapeHtml(plugin.author)}</span>` : ""}
            ${plugin.version ? `<span>v${escapeHtml(plugin.version)}</span>` : ""}
          </div>
        </div>
        <span class="site-status ${escapeHtml(siteStatusClass(plugin))}">${escapeHtml(siteStatusLabel(plugin))}</span>
        ${tags.length ? `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="plugin-actions">
          ${actions.join("")}
        </div>
      </article>
    `;
  }).join("") : `<p>${selectedTags.length || excludedTags.length || favoritesOnly || searchQuery.trim() ? escapeHtml(t("catalog.noMatches")) : escapeHtml(t("catalog.noPlugins"))}</p>`;
  document.querySelectorAll("[data-install-plugin]").forEach((button) => {
    button.addEventListener("click", () => installPlugin(renderedPlugins[Number(button.dataset.installPlugin)]));
  });
  document.querySelectorAll("[data-publish-plugin]").forEach((button) => {
    button.addEventListener("click", () => openPublishRequest(renderedPlugins[Number(button.dataset.publishPlugin)]));
  });
  document.querySelectorAll("[data-delete-draft]").forEach((button) => {
    button.addEventListener("click", () => removeDraftPlugin(renderedPlugins[Number(button.dataset.deleteDraft)]));
  });
  document.querySelectorAll("[data-favorite-plugin]").forEach((button) => {
    button.addEventListener("click", () => toggleFavoritePlugin(renderedPlugins[Number(button.dataset.favoritePlugin)]));
  });
  document.querySelectorAll("[data-report-plugin]").forEach((button) => {
    button.addEventListener("click", () => preparePluginReport(renderedPlugins[Number(button.dataset.reportPlugin)]));
  });
}

function loadAllPlugins() {
  fetchCatalog()
    .then((catalog) => {
      const catalogPlugins = (Array.isArray(catalog.plugins) ? catalog.plugins : [])
        .filter((plugin) => hasRequiredPluginIcon(plugin) && hasRepository(plugin) && isVisiblePlugin(plugin));
      const savedDrafts = loadDraftPlugins();
      return Promise.all([
        filterAvailablePlugins(catalogPlugins),
        filterAvailablePlugins(savedDrafts)
      ]).then(([availableCatalogPlugins, availableDrafts]) => {
        const drafts = availableDrafts.filter((draft) => (
          !availableCatalogPlugins.some((published) => isSamePluginPublication(published, draft))
        ));
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
      list.innerHTML = `<p>${escapeHtml(t("catalog.loadError", { message: error.message }))}</p>`;
    });
}

function parseGitHubRepo(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    throw new Error(t("publish.validUrl"));
  }
  if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
    throw new Error(t("publish.githubOnly"));
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(t("publish.ownerRepo"));
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
  throw new Error(t("publish.manifestMissing", { message: lastError?.message || "" }));
}

async function loadRepoPlugin() {
  try {
    const repo = parseGitHubRepo(repoUrlInput?.value || "");
    setPublishStatus(t("publish.reading"));
    const { branch, pluginPath, manifest } = await fetchRepoManifest(repo);
    const browser = manifest.browser || {};
    const repositoryUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    const iconUrl = resolveUrl(browser.home_url || repositoryUrl + "/", browser.icon_url || "");
    if (!iconUrl) {
      throw new Error(t("publish.iconMissing"));
    }
    setPublishStatus(t("publish.preparing"));
    const plugin = {
      id: manifest.id || repo.repo,
      name: manifest.name || manifest.id || repo.repo,
      description: manifest.description || `Site plugin for downloading works from ${manifest.name || repo.repo} in Nyxovira.`,
      author: manifest.author || repo.owner,
      version: manifest.version || "1.0.0",
      site_url: browser.home_url || repositoryUrl + "/",
      homepage: browser.home_url || repositoryUrl + "/",
      icon_url: iconUrl,
      repository_url: repositoryUrl,
      repository_ref: branch,
      plugin_path: pluginPath,
      tags: normalizePublicationTags(manifest.tags),
      __source: "draft"
    };
    saveDraftPlugin(plugin);
    setPublishStatus(t("publish.loaded"));
    loadAllPlugins();
    setActiveView("catalog");
  } catch (error) {
    setPublishStatus(error?.message || t("publish.failed"));
  }
}

function openPublishRequest(plugin) {
  const clean = publicPlugin(plugin);
  clean.tags = normalizePublicationTags(clean.tags);
  if (!clean.repository_url) {
    setPublishStatus(t("publish.outdated"));
    return;
  }
  const body = [
    `<!-- plugin-hub-language: ${currentLanguage} -->`,
    "<!-- plugin-hub-policy: accepted-v1 -->",
    t("publish.requestTitle"),
    t("publish.requestDescription"),
    "",
    t("publish.responsibility"),
    t("publish.acceptanceLine"),
    t("publish.rulesLine"),
    "",
    t("publish.repositoryLine", { url: clean.repository_url }),
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

function preparePluginReport(plugin) {
  if (reportPluginIdInput) {
    reportPluginIdInput.value = String(plugin?.id || "").trim();
  }
  if (reportReasonInput) {
    reportReasonInput.value = "";
  }
  if (reportEvidenceInput) {
    reportEvidenceInput.value = "";
  }
  if (reportDetailsInput) {
    reportDetailsInput.value = "";
  }
  updateReportCreatorLink(plugin);
  setReportStatus("");
  setActiveView("report");
  reportReasonInput?.focus();
}

function updateReportCreatorLink(preferredPlugin = null) {
  const pluginId = String(reportPluginIdInput?.value || "").trim().toLowerCase();
  const plugin = preferredPlugin && String(preferredPlugin.id || "").trim().toLowerCase() === pluginId
    ? preferredPlugin
    : allPlugins.find((item) => !item.__source && String(item.id || "").trim().toLowerCase() === pluginId);
  const repositoryUrl = String(plugin?.repository_url || "").trim();
  if (!reportCreatorHelp || !reportCreatorLink) {
    return;
  }
  reportCreatorHelp.hidden = !repositoryUrl;
  if (repositoryUrl) {
    reportCreatorLink.href = repositoryUrl;
  } else {
    reportCreatorLink.removeAttribute("href");
  }
}

function openReportRequest() {
  const pluginId = String(reportPluginIdInput?.value || "").trim().toLowerCase();
  const reason = String(reportReasonInput?.value || "").trim();
  const evidence = String(reportEvidenceInput?.value || "").trim();
  const details = String(reportDetailsInput?.value || "").trim();
  if (!pluginId) {
    setReportStatus(t("report.enterId"));
    return;
  }
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(pluginId)) {
    setReportStatus(t("report.invalidId"));
    return;
  }
  if (!reason || !t(`report.categories.${reason}`) || t(`report.categories.${reason}`) === `report.categories.${reason}`) {
    setReportStatus(t("report.choose"));
    return;
  }
  if (details.length < 20) {
    setReportStatus(t("report.explain"));
    return;
  }
  if (evidence) {
    try {
      const evidenceUrl = new URL(evidence);
      if (!["http:", "https:"].includes(evidenceUrl.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      setReportStatus(t("report.invalidEvidence"));
      return;
    }
  }
  const body = [
    `<!-- plugin-hub-language: ${currentLanguage} -->`,
    t("report.requestTitle"),
    t("report.requestDescription"),
    "",
    t("report.pluginIdLine", { id: pluginId }),
    t("report.categoryLine", { category: t(`report.categories.${reason}`) }),
    t("report.evidenceLine", { url: evidence || t("report.noEvidence") }),
    "",
    t("report.detailsLine"),
    details,
    "",
    t("report.rulesLine")
  ].join("\n");
  const url = "https://github.com/Nanquimori/KapiTomo/issues/new"
    + "?title=" + encodeURIComponent("[plugin-report] " + pluginId)
    + "&body=" + encodeURIComponent(body);
  setReportStatus(t("report.opening"));
  window.open(url, "_blank", "noopener");
}

function openRemovalRequest() {
  const pluginId = String(removePluginIdInput?.value || "").trim();
  const repoUrl = String(removeRepoUrlInput?.value || "").trim();
  if (!pluginId) {
    setRemoveStatus(t("remove.enterId"));
    return;
  }
  if (!repoUrl) {
    setRemoveStatus(t("remove.enterRepo"));
    return;
  }
  const body = [
    `<!-- plugin-hub-language: ${currentLanguage} -->`,
    t("remove.requestTitle"),
    t("remove.requestDescription"),
    "",
    t("remove.pluginIdLine", { id: pluginId }),
    t("remove.repositoryLine", { url: repoUrl }),
    "",
    t("remove.confirm")
  ].join("\n");
  const url = "https://github.com/Nanquimori/KapiTomo/issues/new"
    + "?title=" + encodeURIComponent("[plugin-remove] " + pluginId)
    + "&body=" + encodeURIComponent(body);
  setRemoveStatus(t("remove.opening"));
  window.open(url, "_blank", "noopener");
}

function removeDraftPlugin(plugin) {
  if (!plugin || plugin.__source !== "draft") {
    return;
  }
  saveDraftPlugins(loadDraftPlugins().filter((draft) => !isSamePluginPublication(draft, plugin)));
  loadAllPlugins();
}

function installPlugin(plugin) {
  const bridge = window.NyxoviraAndroidBridge || window.ArchiveInkAndroidBridge;
  if (!hasRequiredPluginIcon(plugin)) {
    alert(t("install.iconMissing"));
    return;
  }
  if (!hasRepository(plugin)) {
    alert(t("install.repositoryMissing"));
    return;
  }
  if (!plugin || !bridge || typeof bridge.installOnlinePlugin !== "function") {
    alert(t("install.openInsideApp"));
    return;
  }
  try {
    const result = JSON.parse(bridge.installOnlinePlugin(JSON.stringify(publicPlugin(plugin))) || "{}");
    alert(result.message || (result.success ? t("install.success") : t("install.failed")));
  } catch (error) {
    alert(t("install.failedWithMessage", { message: error && error.message ? error.message : t("install.unknown") }));
  }
}

loadRepoPluginButton?.addEventListener("click", loadRepoPlugin);
requestReportPluginButton?.addEventListener("click", openReportRequest);
requestRemovePluginButton?.addEventListener("click", openRemovalRequest);
viewButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.viewTarget));
});
languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.languageOption));
});
repoUrlInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadRepoPlugin();
  }
});
reportPluginIdInput?.addEventListener("input", () => updateReportCreatorLink());
pluginSearchInput?.addEventListener("input", () => {
  searchQuery = String(pluginSearchInput.value || "");
  applyTagFilters();
});
favoritesOnlyButton?.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  applyTagFilters();
});
discardDraftPluginsButton?.addEventListener("click", () => {
  localStorage.removeItem(LOCAL_PLUGIN_KEY);
  setPublishStatus(t("publish.draftsRemoved"));
  loadAllPlugins();
});
applyStaticTranslations();
updateFavoritesOnlyButton();
const requestedView = new URLSearchParams(window.location.search).get("view");
setActiveView(["catalog", "publish", "report", "remove"].includes(requestedView) ? requestedView : "catalog");
loadAllPlugins();
