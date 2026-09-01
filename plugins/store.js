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
const reportEmailInput = document.getElementById("reportEmailInput");
const reportDetailsInput = document.getElementById("reportDetailsInput");
const reportDetailsCount = document.getElementById("reportDetailsCount");
const reportConfirmationInput = document.getElementById("reportConfirmationInput");
const reportWebsiteInput = document.getElementById("reportWebsiteInput");
const reportChallenge = document.getElementById("reportChallenge");
const requestReportPluginButton = document.getElementById("requestReportPluginButton");
const reportStatus = document.getElementById("reportStatus");
const reportCreatorHelp = document.getElementById("reportCreatorHelp");
const reportCreatorLink = document.getElementById("reportCreatorLink");
const tagFilter = document.getElementById("tagFilter");
const tagFilterStatus = document.getElementById("tagFilterStatus");
const pluginSearchInput = document.getElementById("pluginSearchInput");
const favoritesOnlyButton = document.getElementById("favoritesOnlyButton");
const catalogPagination = document.getElementById("catalogPagination");
const officialCatalogSection = document.getElementById("officialCatalogSection");
const officialPluginList = document.getElementById("officialPluginList");
const restrictedAccessButton = document.getElementById("restrictedAccessButton");
const restrictedAccessForm = document.getElementById("restrictedAccessForm");
const restrictedAccessStatus = document.getElementById("restrictedAccessStatus");
const birthDayInput = document.getElementById("birthDayInput");
const birthMonthInput = document.getElementById("birthMonthInput");
const birthYearInput = document.getElementById("birthYearInput");
const cancelRestrictedAccessButton = document.getElementById("cancelRestrictedAccessButton");
const viewButtons = Array.from(document.querySelectorAll("[data-view-target]"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const languageButtons = Array.from(document.querySelectorAll("[data-language-option]"));
const LOCAL_PLUGIN_KEY = "kapitomo.pluginDrafts.v3";
const LANGUAGE_STORAGE_KEY = "kapitomo.pluginHubLanguage.v1";
const FAVORITE_PLUGIN_KEY = "kapitomo.favoritePlugins.v1";
const REPORT_HISTORY_KEY = "kapitomo.reportHistory.v1";
const RESTRICTED_ACCESS_KEY = "kapitomo.restrictedAccess.v1";
const CATALOG_VERSION = "20260901-age-gated-taxonomy";
const REPORT_CONFIG = globalThis.KAPITOMO_REPORT_CONFIG || {};
const REPORT_ENDPOINT = String(REPORT_CONFIG.endpoint || "").trim();
const REPORT_TURNSTILE_SITE_KEY = String(REPORT_CONFIG.turnstileSiteKey || "").trim();
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const REPORT_DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REPORT_HISTORY = 100;
const MIN_REPORT_DETAILS = 200;
const MIN_REPORT_WORDS = 20;
let reportTurnstileWidgetId = null;
let reportTurnstileToken = "";
let reportTurnstileScriptPromise = null;
const MAX_PUBLIC_TAGS = 9;
const MAX_TYPE_TAGS = 3;
const MAX_GENRE_TAGS = 4;
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
  "comic",
  "other"
];
const OFFICIAL_GENRE_TAGS = [
  "action",
  "adventure",
  "comedy",
  "drama",
  "fantasy",
  "horror",
  "mystery",
  "romance",
  "sci-fi",
  "slice-of-life",
  "sports",
  "supernatural",
  "thriller"
];
const OFFICIAL_CLASSIFICATION_TAGS = ["adult"];
const LANGUAGE_TAGS = new Set(OFFICIAL_LANGUAGE_TAGS);
const TYPE_TAGS = new Set(OFFICIAL_TYPE_TAGS);
const GENRE_TAGS = new Set(OFFICIAL_GENRE_TAGS);
const CLASSIFICATION_TAGS = new Set(OFFICIAL_CLASSIFICATION_TAGS);
const PUBLIC_TAGS = new Set([
  ...OFFICIAL_LANGUAGE_TAGS,
  ...OFFICIAL_TYPE_TAGS,
  ...OFFICIAL_GENRE_TAGS,
  ...OFFICIAL_CLASSIFICATION_TAGS
]);
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
      officialPlugin: "Official plugin",
      officialBadge: "Official",
      communityPlugins: "Community plugins",
      paginationLabel: "Catalog pages",
      previousPage: "Previous",
      nextPage: "Next",
      page: "Page",
      ofPages: "of {total}",
      choosePage: "Choose a catalog page",
      goToPage: "Go to page {page}",
      currentPage: "Page {page}, current page",
      showing: "Showing community plugins {start}-{end} of {total}.",
      noTags: "No tags available yet.",
      noPlugins: "No plugins published yet.",
      noCommunityPlugins: "No community plugins published yet.",
      noMatches: "No plugins match the selected tags.",
      matching: "{count} plugin{plural} matching {filters}.",
      loadError: "Could not load the catalog: {message}",
      language: "Language",
      type: "Type",
      genre: "Genre",
      classification: "Classification",
      tagLabels: {
        other: "other",
        adult: "+18"
      },
      restricted: {
        title: "Restricted content",
        locked: "Restricted plugins are hidden.",
        unlocked: "Restricted plugins are visible on this browser.",
        enable: "Review access",
        disable: "Disable access",
        prompt: "Enter your date of birth. Access is available only to people aged 18 or older.",
        privacy: "Your date of birth is checked only in this browser and is not saved or sent.",
        day: "Day",
        month: "Month",
        year: "Year",
        confirm: "Verify age and enable",
        cancel: "Cancel",
        invalidDate: "Enter a valid day, month, and year.",
        underage: "Access cannot be enabled because the entered date does not indicate an age of 18 or older."
      },
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
      title: "Report a plugin",
      description: "Use this form to report a serious problem with a plugin available in the catalog. Every report is reviewed before any decision is made.",
      notFor: "Do not use this form to complain about works, missing chapters, translations, advertisements, website availability, or account rules. For common plugin errors, contact its developer.",
      technicalHelp: "Need help using the plugin? Visit the developer's repository:",
      creatorRepository: "Open developer repository",
      notice: "The report is sent privately. Your email will be used only if we need to contact you about the review.",
      privacyLink: "Privacy Policy",
      pluginId: "Plugin ID",
      email: "Contact email",
      reason: "Reason",
      languageRequirement: "The reason must be written in Portuguese or English. Reports in other languages cannot be reviewed.",
      duplicatePolicy: "Repeated reports are combined into the same review. A high number of reports does not prove wrongdoing and never removes a plugin automatically.",
      detailsPlaceholder: "Clearly explain why you are reporting this plugin. Include only the information you consider important for the review.",
      detailsCount: "{count}/{minimum} minimum characters · {words}/{minimumWords} minimum words",
      confirmation: "I confirm that I have read the guidance above and that the information I provided is true to the best of my knowledge.",
      request: "Send report",
      enterId: "Enter the plugin ID.",
      invalidId: "Use a valid plugin ID.",
      enterEmail: "Enter a contact email.",
      invalidEmail: "Enter a valid contact email.",
      explain: "Write a complete reason with at least {minimum} characters and {minimumWords} words. Current: {count} characters and {words} words.",
      confirm: "Confirm that you have read the guidance and provided truthful information before sending the report.",
      sending: "Sending report...",
      sent: "Report sent successfully. It will be reviewed by the Plugin Hub team. Thank you for helping us maintain a safe environment for the entire community.",
      duplicate: "This report has already been sent from this browser and is included in the review. Sending it again will not change the decision.",
      sendError: "The report could not be sent right now. Check your connection and try again in a few minutes.",
      securityVerification: "Security verification",
      serviceUnavailable: "Secure reporting is not configured right now. Please try again later.",
      captchaRequired: "Complete the security verification before sending the report.",
      captchaFailed: "The security verification failed or expired. Complete it again and retry.",
      rateLimited: "Too many reports were sent from this connection. Wait a minute and try again.",
      confirmationLine: "Reporter confirmed that the guidance was read and the information is true to the best of their knowledge",
      rulesLine: "Catalog rules: https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules"
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
      nextTags: "After language, use one to three types from: {types}. You may then add up to four genres from: {genres}. The optional adult classification must be last.",
      typeLimit: "Use no more than three content types.",
      genreLimit: "Use no more than four genres.",
      genreAfterType: "Genre tags must appear after content types.",
      classificationLast: "The adult classification must appear last.",
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
      officialPlugin: "Plugin oficial",
      officialBadge: "Oficial",
      communityPlugins: "Plugins da comunidade",
      paginationLabel: "Páginas do catálogo",
      previousPage: "Anterior",
      nextPage: "Próxima",
      page: "Página",
      ofPages: "de {total}",
      choosePage: "Escolha uma página do catálogo",
      goToPage: "Ir para a página {page}",
      currentPage: "Página {page}, página atual",
      showing: "Exibindo plugins da comunidade {start}-{end} de {total}.",
      noTags: "Nenhuma tag disponível ainda.",
      noPlugins: "Nenhum plugin publicado ainda.",
      noCommunityPlugins: "Nenhum plugin da comunidade foi publicado ainda.",
      noMatches: "Nenhum plugin combina com as tags selecionadas.",
      matching: "{count} plugin{plural} encontrado{plural} para {filters}.",
      loadError: "Não foi possível carregar o catálogo: {message}",
      language: "Idioma",
      type: "Tipo",
      genre: "Gênero",
      classification: "Classificação",
      tagLabels: {
        other: "outros",
        adult: "+18",
        action: "ação",
        adventure: "aventura",
        comedy: "comédia",
        fantasy: "fantasia",
        horror: "terror",
        mystery: "mistério",
        "sci-fi": "ficção científica",
        "slice-of-life": "cotidiano",
        sports: "esportes",
        supernatural: "sobrenatural",
        thriller: "suspense"
      },
      restricted: {
        title: "Conteúdo restrito",
        locked: "Plugins restritos estão ocultos.",
        unlocked: "Plugins restritos estão visíveis neste navegador.",
        enable: "Revisar acesso",
        disable: "Desativar acesso",
        prompt: "Informe sua data de nascimento. O acesso está disponível somente para pessoas com 18 anos ou mais.",
        privacy: "Sua data de nascimento é verificada somente neste navegador e não é salva nem enviada.",
        day: "Dia",
        month: "Mês",
        year: "Ano",
        confirm: "Verificar idade e ativar",
        cancel: "Cancelar",
        invalidDate: "Informe um dia, mês e ano válidos.",
        underage: "O acesso não pode ser ativado porque a data informada não indica idade igual ou superior a 18 anos."
      },
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
      title: "Denunciar um plugin",
      description: "Use este formulário para informar um problema sério com um plugin disponível no catálogo. Toda denúncia é analisada antes de qualquer decisão.",
      notFor: "Não use este formulário para reclamar de obras, capítulos ausentes, traduções, anúncios, indisponibilidade do site ou regras de conta. Para erros comuns do plugin, procure o desenvolvedor.",
      technicalHelp: "Precisa de ajuda para usar o plugin? Acesse o repositório do desenvolvedor:",
      creatorRepository: "Abrir repositório do desenvolvedor",
      notice: "A denúncia é enviada de forma privada. Seu e-mail será usado apenas se precisarmos falar com você sobre a análise.",
      privacyLink: "Política de Privacidade",
      pluginId: "ID do plugin",
      email: "E-mail para contato",
      reason: "Motivo",
      languageRequirement: "O motivo deve ser escrito em português ou inglês. Denúncias em outros idiomas não poderão ser analisadas.",
      duplicatePolicy: "Denúncias repetidas são reunidas na mesma análise. Ter muitas denúncias não prova que o plugin fez algo errado e nunca causa remoção automática.",
      detailsPlaceholder: "Explique claramente por que você está denunciando este plugin. Inclua apenas as informações que considera importantes para a análise.",
      detailsCount: "{count}/{minimum} caracteres mínimos · {words}/{minimumWords} palavras mínimas",
      confirmation: "Confirmo que li as orientações acima e que as informações que forneci são verdadeiras conforme meu conhecimento.",
      request: "Enviar denúncia",
      enterId: "Informe o ID do plugin.",
      invalidId: "Use um ID de plugin válido.",
      enterEmail: "Informe um e-mail para contato.",
      invalidEmail: "Informe um e-mail válido para contato.",
      explain: "Escreva um motivo completo com pelo menos {minimum} caracteres e {minimumWords} palavras. Atual: {count} caracteres e {words} palavras.",
      confirm: "Confirme que leu as orientações e forneceu informações verdadeiras antes de enviar a denúncia.",
      sending: "Enviando denúncia...",
      sent: "Denúncia enviada com sucesso. Ela será analisada pela equipe do Plugin Hub. Agradecemos por nos ajudar a manter um ambiente seguro para toda a comunidade.",
      duplicate: "Esta denúncia já foi enviada neste navegador e está incluída na análise. Enviá-la novamente não muda a decisão.",
      sendError: "Não foi possível enviar a denúncia agora. Verifique sua conexão e tente novamente em alguns minutos.",
      securityVerification: "Verificação de segurança",
      serviceUnavailable: "O canal seguro de denúncias não está configurado no momento. Tente novamente mais tarde.",
      captchaRequired: "Conclua a verificação de segurança antes de enviar a denúncia.",
      captchaFailed: "A verificação de segurança falhou ou expirou. Faça-a novamente e tente outra vez.",
      rateLimited: "Muitas denúncias foram enviadas por esta conexão. Aguarde um minuto e tente novamente.",
      confirmationLine: "O denunciante confirmou que leu as orientações e que as informações são verdadeiras conforme seu conhecimento",
      rulesLine: "Regras do catálogo: https://nanquimori.github.io/KapiTomo/terms/#regras-do-catalogo"
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
      nextTags: "Depois do idioma, use de um a três tipos entre: {types}. Em seguida, você pode adicionar até quatro gêneros entre: {genres}. A classificação opcional adult deve ficar por último.",
      typeLimit: "Use no máximo três tipos de conteúdo.",
      genreLimit: "Use no máximo quatro gêneros.",
      genreAfterType: "As tags de gênero devem aparecer depois dos tipos de conteúdo.",
      classificationLast: "A classificação adult deve aparecer por último.",
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
let pinnedOfficialPlugins = [];
let allPlugins = [];
let availableTags = [];
let selectedTags = [];
let excludedTags = [];
let favoritePluginKeys = loadFavoritePluginKeys();
let favoritesOnly = false;
let searchQuery = "";
let filteredCatalogPlugins = [];
let currentCatalogPage = 1;
let currentLanguage = initialLanguage();
let restrictedAccessEnabled = loadRestrictedAccess();
let restrictedAccessFormOpen = false;
let restrictedAccessMessageKey = "";

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

function loadRestrictedAccess() {
  try {
    return localStorage.getItem(RESTRICTED_ACCESS_KEY) === "enabled";
  } catch {
    return false;
  }
}

function saveRestrictedAccess(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(RESTRICTED_ACCESS_KEY, "enabled");
    } else {
      localStorage.removeItem(RESTRICTED_ACCESS_KEY);
    }
  } catch {}
}

function clearBirthDateInputs() {
  [birthDayInput, birthMonthInput, birthYearInput].forEach((input) => {
    if (input) {
      input.value = "";
    }
  });
}

function renderRestrictedAccess() {
  if (!restrictedAccessButton || !restrictedAccessForm || !restrictedAccessStatus) {
    return;
  }
  restrictedAccessButton.textContent = t(restrictedAccessEnabled
    ? "catalog.restricted.disable"
    : "catalog.restricted.enable");
  restrictedAccessButton.setAttribute("aria-expanded", restrictedAccessFormOpen ? "true" : "false");
  restrictedAccessForm.hidden = restrictedAccessEnabled || !restrictedAccessFormOpen;
  restrictedAccessStatus.textContent = t(restrictedAccessMessageKey || (restrictedAccessEnabled
    ? "catalog.restricted.unlocked"
    : "catalog.restricted.locked"));
  restrictedAccessStatus.classList.toggle("is-error", Boolean(restrictedAccessMessageKey));
}

function reloadCatalogForRestrictedAccess() {
  pinnedOfficialPlugins = [];
  allPlugins = [];
  filteredCatalogPlugins = [];
  currentCatalogPage = 1;
  selectedTags = selectedTags.filter((tag) => tag !== "adult");
  excludedTags = excludedTags.filter((tag) => tag !== "adult");
  if (officialCatalogSection) {
    officialCatalogSection.hidden = true;
  }
  if (catalogPagination) {
    catalogPagination.hidden = true;
    catalogPagination.innerHTML = "";
  }
  if (list) {
    list.innerHTML = `<p>${escapeHtml(t("catalog.loading"))}</p>`;
  }
  loadAllPlugins();
}

function toggleRestrictedAccess() {
  restrictedAccessMessageKey = "";
  if (restrictedAccessEnabled) {
    restrictedAccessEnabled = false;
    restrictedAccessFormOpen = false;
    saveRestrictedAccess(false);
    clearBirthDateInputs();
    renderRestrictedAccess();
    reloadCatalogForRestrictedAccess();
    return;
  }
  restrictedAccessFormOpen = !restrictedAccessFormOpen;
  renderRestrictedAccess();
  if (restrictedAccessFormOpen) {
    birthDayInput?.focus();
  }
}

function confirmRestrictedAccess() {
  const assessment = globalThis.KapiTomoAdultAccess.assessBirthDate(
    birthDayInput?.value,
    birthMonthInput?.value,
    birthYearInput?.value
  );
  if (!assessment.valid) {
    restrictedAccessMessageKey = "catalog.restricted.invalidDate";
    renderRestrictedAccess();
    return;
  }
  if (!assessment.isAdult) {
    restrictedAccessMessageKey = "catalog.restricted.underage";
    renderRestrictedAccess();
    return;
  }
  restrictedAccessEnabled = true;
  restrictedAccessFormOpen = false;
  restrictedAccessMessageKey = "";
  saveRestrictedAccess(true);
  clearBirthDateInputs();
  renderRestrictedAccess();
  reloadCatalogForRestrictedAccess();
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
  renderRestrictedAccess();
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
  updateReportDetailsCount();
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

function setReportStatus(message, state = "") {
  if (reportStatus) {
    reportStatus.textContent = message || "";
    reportStatus.classList.toggle("is-success", state === "success");
    reportStatus.classList.toggle("is-error", state === "error");
  }
}

function reportSecurityConfigured() {
  try {
    const endpoint = new URL(REPORT_ENDPOINT);
    return endpoint.protocol === "https:"
      && endpoint.hostname !== "formsubmit.co"
      && Boolean(REPORT_TURNSTILE_SITE_KEY);
  } catch {
    return false;
  }
}

function loadReportTurnstileScript() {
  if (globalThis.turnstile?.render) {
    return Promise.resolve();
  }
  if (reportTurnstileScriptPromise) {
    return reportTurnstileScriptPromise;
  }
  reportTurnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("turnstile_load_failed")), { once: true });
    document.head.appendChild(script);
  });
  return reportTurnstileScriptPromise;
}

async function initializeReportChallenge() {
  if (!reportChallenge || reportTurnstileWidgetId !== null) {
    return;
  }
  if (!reportSecurityConfigured()) {
    setReportStatus(t("report.serviceUnavailable"), "error");
    return;
  }
  try {
    await loadReportTurnstileScript();
    reportTurnstileWidgetId = globalThis.turnstile.render(reportChallenge, {
      sitekey: REPORT_TURNSTILE_SITE_KEY,
      action: "plugin-report",
      theme: "auto",
      callback(token) {
        reportTurnstileToken = String(token || "");
        if (reportStatus?.classList.contains("is-error")) {
          setReportStatus("");
        }
      },
      "expired-callback"() {
        reportTurnstileToken = "";
      },
      "error-callback"() {
        reportTurnstileToken = "";
        setReportStatus(t("report.captchaFailed"), "error");
      }
    });
  } catch {
    setReportStatus(t("report.serviceUnavailable"), "error");
  }
}

function resetReportChallenge() {
  reportTurnstileToken = "";
  if (reportTurnstileWidgetId !== null && globalThis.turnstile?.reset) {
    globalThis.turnstile.reset(reportTurnstileWidgetId);
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
    .slice(0, MAX_PUBLIC_TAGS);
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
      if (publicCount >= MAX_PUBLIC_TAGS) {
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
  const contentTags = publicTags.slice(1);
  const invalidTag = contentTags.find((tag) => !TYPE_TAGS.has(tag) && !GENRE_TAGS.has(tag) && !CLASSIFICATION_TAGS.has(tag));
  if (invalidTag) {
    throw new Error(t("publish.nextTags", {
      types: OFFICIAL_TYPE_TAGS.join(", "),
      genres: OFFICIAL_GENRE_TAGS.join(", ")
    }));
  }
  const typeTags = contentTags.filter((tag) => TYPE_TAGS.has(tag));
  if (!typeTags.length) {
    throw new Error(t("publish.tagMinimum"));
  }
  if (typeTags.length > MAX_TYPE_TAGS) {
    throw new Error(t("publish.typeLimit"));
  }
  const genreTags = contentTags.filter((tag) => GENRE_TAGS.has(tag));
  if (genreTags.length > MAX_GENRE_TAGS) {
    throw new Error(t("publish.genreLimit"));
  }
  const firstGenreIndex = contentTags.findIndex((tag) => GENRE_TAGS.has(tag));
  if (firstGenreIndex >= 0 && contentTags.slice(firstGenreIndex + 1).some((tag) => TYPE_TAGS.has(tag))) {
    throw new Error(t("publish.genreAfterType"));
  }
  const firstClassificationIndex = contentTags.findIndex((tag) => CLASSIFICATION_TAGS.has(tag));
  if (firstClassificationIndex >= 0 && contentTags.slice(firstClassificationIndex + 1).some((tag) => TYPE_TAGS.has(tag) || GENRE_TAGS.has(tag))) {
    throw new Error(t("publish.classificationLast"));
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
  if (activeView === "report") {
    initializeReportChallenge();
  }
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
  return `<button class="${className}" type="button" data-filter-tag="${escapeHtml(tag)}">${escapeHtml(tagLabel(tag))}</button>`;
}

function tagLabel(tag) {
  const key = `catalog.tagLabels.${tag}`;
  const localized = t(key);
  return localized === key ? tag : localized;
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
  availableTags = uniqueTags([
    OFFICIAL_LANGUAGE_TAGS,
    OFFICIAL_TYPE_TAGS,
    OFFICIAL_GENRE_TAGS,
    restrictedAccessEnabled ? OFFICIAL_CLASSIFICATION_TAGS : [],
    restrictedAccessEnabled ? tags : tags.filter((tag) => tag !== "adult")
  ]);
  selectedTags = selectedTags.filter((tag) => availableTags.includes(tag));
  excludedTags = excludedTags.filter((tag) => availableTags.includes(tag) && !selectedTags.includes(tag));
  if (!tagFilter) {
    return;
  }
  const languageTags = OFFICIAL_LANGUAGE_TAGS;
  const contentTags = OFFICIAL_TYPE_TAGS;
  const genreTags = OFFICIAL_GENRE_TAGS;
  const classificationTags = OFFICIAL_CLASSIFICATION_TAGS;
  tagFilter.innerHTML = availableTags.length
    ? [
      renderTagGroup(t("catalog.language"), languageTags),
      renderTagGroup(t("catalog.type"), contentTags),
      renderTagGroup(t("catalog.genre"), genreTags),
      restrictedAccessEnabled ? renderTagGroup(t("catalog.classification"), classificationTags) : ""
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
    tagFilterStatus.textContent = "";
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

function renderCatalogPagination(model) {
  if (!catalogPagination) {
    return;
  }
  if (model.totalPages <= 1) {
    catalogPagination.hidden = true;
    catalogPagination.innerHTML = "";
    return;
  }

  const pageButtons = globalThis.KapiTomoPagination.visiblePageItems(model.totalPages, model.page)
    .map((item) => {
      if (item === "ellipsis") {
        return `<span class="pagination-ellipsis" aria-hidden="true">…</span>`;
      }
      const current = item === model.page;
      return `<button class="pagination-number${current ? " is-current" : ""}" type="button" data-catalog-page="${item}"${current ? " aria-current=\"page\" disabled" : ""} aria-label="${escapeHtml(t(current ? "catalog.currentPage" : "catalog.goToPage", { page: item }))}">${item}</button>`;
    })
    .join("");
  const pageOptions = Array.from({ length: model.totalPages }, (_, index) => index + 1)
    .map((page) => `<option value="${page}"${page === model.page ? " selected" : ""}>${page}</option>`)
    .join("");

  catalogPagination.hidden = false;
  catalogPagination.innerHTML = `
    <p class="pagination-summary">${escapeHtml(t("catalog.showing", {
      start: model.start,
      end: model.end,
      total: model.totalItems
    }))}</p>
    <div class="pagination-controls">
      <button class="pagination-direction" type="button" data-catalog-page="${model.page - 1}"${model.page === 1 ? " disabled" : ""}>‹ ${escapeHtml(t("catalog.previousPage"))}</button>
      <div class="pagination-numbers">${pageButtons}</div>
      <label class="pagination-picker">
        <span>${escapeHtml(t("catalog.page"))}</span>
        <select data-catalog-page-select aria-label="${escapeHtml(t("catalog.choosePage"))}">${pageOptions}</select>
        <span>${escapeHtml(t("catalog.ofPages", { total: model.totalPages }))}</span>
      </label>
      <button class="pagination-direction" type="button" data-catalog-page="${model.page + 1}"${model.page === model.totalPages ? " disabled" : ""}>${escapeHtml(t("catalog.nextPage"))} ›</button>
    </div>
  `;
  catalogPagination.querySelectorAll("[data-catalog-page]").forEach((button) => {
    button.addEventListener("click", () => goToCatalogPage(Number(button.dataset.catalogPage)));
  });
  catalogPagination.querySelector("[data-catalog-page-select]")?.addEventListener("change", (event) => {
    goToCatalogPage(Number(event.currentTarget.value));
  });
}

function renderCatalogPage(scrollToCatalog = false) {
  const model = globalThis.KapiTomoPagination.paginate(filteredCatalogPlugins, currentCatalogPage);
  currentCatalogPage = model.page;
  renderPlugins(model.items);
  renderCatalogPagination(model);
  if (scrollToCatalog && list) {
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    list.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }
}

function goToCatalogPage(page) {
  const requestedPage = Number.parseInt(page, 10);
  if (!Number.isFinite(requestedPage) || requestedPage === currentCatalogPage) {
    return;
  }
  currentCatalogPage = requestedPage;
  renderCatalogPage(true);
}

function applyTagFilters(resetPage = false) {
  filteredCatalogPlugins = allPlugins.filter((plugin) => pluginMatchesSelectedTags(plugin)
    && pluginMatchesExcludedTags(plugin)
    && pluginMatchesFavoriteMode(plugin)
    && pluginMatchesSearch(plugin));
  if (resetPage) {
    currentCatalogPage = 1;
  }
  renderTagFilters(availableTags);
  updateFavoritesOnlyButton();
  renderCatalogPage();
  setTagStatus(filteredCatalogPlugins.length);
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
  applyTagFilters(true);
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

function pluginCardsHtml(plugins, indexOffset = 0) {
  return plugins.map((plugin, localIndex) => {
    const index = indexOffset + localIndex;
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
      <article class="plugin-card${globalThis.KapiTomoPagination.isOfficialPlugin(plugin) ? " is-official" : ""}">
        <button class="favorite-button${favorite ? " is-active" : ""}" type="button" data-favorite-plugin="${index}" aria-pressed="${favorite ? "true" : "false"}" aria-label="${escapeHtml(t("catalog.favorite"))}"></button>
        <img class="plugin-icon" src="${escapeHtml(plugin.icon_url)}" alt="">
        <div class="plugin-copy">
          <h3>${escapeHtml(plugin.name || plugin.id || t("catalog.pluginFallback"))}</h3>
          <div class="meta">
            ${plugin.author ? `<span>${escapeHtml(plugin.author)}</span>` : ""}
            ${plugin.version ? `<span>v${escapeHtml(plugin.version)}</span>` : ""}
          </div>
        </div>
        ${globalThis.KapiTomoPagination.isOfficialPlugin(plugin) ? `<span class="official-badge">${escapeHtml(t("catalog.officialBadge"))}</span>` : ""}
        <span class="site-status ${escapeHtml(siteStatusClass(plugin))}">${escapeHtml(siteStatusLabel(plugin))}</span>
        ${tags.length ? `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tagLabel(tag))}</span>`).join("")}</div>` : ""}
        <div class="plugin-actions">
          ${actions.join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderPlugins(plugins) {
  renderedPlugins = [...pinnedOfficialPlugins, ...plugins];
  if (officialCatalogSection && officialPluginList) {
    officialCatalogSection.hidden = !pinnedOfficialPlugins.length;
    officialPluginList.innerHTML = pluginCardsHtml(pinnedOfficialPlugins);
  }
  list.innerHTML = plugins.length
    ? pluginCardsHtml(plugins, pinnedOfficialPlugins.length)
    : `<p>${selectedTags.length || excludedTags.length || favoritesOnly || searchQuery.trim() ? escapeHtml(t("catalog.noMatches")) : escapeHtml(t("catalog.noCommunityPlugins"))}</p>`;
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
      const catalogPlugins = globalThis.KapiTomoAdultAccess.visiblePlugins(
        (Array.isArray(catalog.plugins) ? catalog.plugins : [])
          .filter((plugin) => hasRequiredPluginIcon(plugin) && hasRepository(plugin) && isVisiblePlugin(plugin)),
        restrictedAccessEnabled
      );
      const savedDrafts = loadDraftPlugins();
      const visibleDrafts = globalThis.KapiTomoAdultAccess.visiblePlugins(savedDrafts, restrictedAccessEnabled);
      return Promise.all([
        filterAvailablePlugins(catalogPlugins),
        filterAvailablePlugins(visibleDrafts)
      ]).then(([availableCatalogPlugins, availableDrafts]) => {
        const drafts = availableDrafts.filter((draft) => (
          !availableCatalogPlugins.some((published) => isSamePluginPublication(published, draft))
        ));
        const removedVisibleDrafts = visibleDrafts.filter((draft) => (
          !drafts.some((retained) => isSamePluginPublication(retained, draft))
        ));
        if (removedVisibleDrafts.length) {
          saveDraftPlugins(savedDrafts.filter((draft) => (
            !removedVisibleDrafts.some((removed) => isSamePluginPublication(removed, draft))
          )));
        }
        const partitionedCatalog = globalThis.KapiTomoPagination.partitionCatalogPlugins(availableCatalogPlugins);
        pinnedOfficialPlugins = partitionedCatalog.official;
        allPlugins = uniquePlugins([
          drafts.map((plugin) => ({ ...plugin, __source: "draft" })),
          partitionedCatalog.community
        ]);
        const catalogTags = uniqueTags([
          allPlugins.flatMap((plugin) => filterTags(plugin.tags))
        ]);
        renderTagFilters(catalogTags);
        applyTagFilters(true);
      });
    })
    .catch((error) => {
      pinnedOfficialPlugins = [];
      filteredCatalogPlugins = [];
      currentCatalogPage = 1;
      if (catalogPagination) {
        catalogPagination.hidden = true;
        catalogPagination.innerHTML = "";
      }
      if (officialCatalogSection) {
        officialCatalogSection.hidden = true;
      }
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
  if (reportEmailInput) {
    reportEmailInput.value = "";
  }
  if (reportDetailsInput) {
    reportDetailsInput.value = "";
  }
  if (reportConfirmationInput) {
    reportConfirmationInput.checked = false;
  }
  updateReportDetailsCount();
  updateReportCreatorLink(plugin);
  setReportStatus("");
  setActiveView("report");
  reportEmailInput?.focus();
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

function reportDetailsLength() {
  return Array.from(String(reportDetailsInput?.value || "").trim()).length;
}

function reportDetailsWords() {
  return String(reportDetailsInput?.value || "").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}

function updateReportDetailsCount() {
  if (!reportDetailsCount) {
    return;
  }
  const count = reportDetailsLength();
  const words = reportDetailsWords();
  reportDetailsCount.textContent = t("report.detailsCount", {
    count,
    minimum: MIN_REPORT_DETAILS,
    words: words.length,
    minimumWords: MIN_REPORT_WORDS
  });
  reportDetailsCount.classList.toggle("is-valid", count >= MIN_REPORT_DETAILS
    && words.length >= MIN_REPORT_WORDS);
}

function isValidReportEmail(value) {
  const email = String(value || "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function normalizeReportForFingerprint(pluginId, details) {
  const normalizedDetails = String(details || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return `${String(pluginId || "").trim().toLowerCase()}|${normalizedDetails}`;
}

async function reportFingerprint(pluginId, details) {
  const normalized = normalizeReportForFingerprint(pluginId, details);
  if (!globalThis.crypto?.subtle || typeof TextEncoder === "undefined") {
    throw new Error("secure_hash_unavailable");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function loadRecentReportHistory() {
  const cutoff = Date.now() - REPORT_DUPLICATE_WINDOW_MS;
  try {
    const stored = JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY) || "[]");
    if (!Array.isArray(stored)) {
      return [];
    }
    return stored.filter((entry) => entry
      && typeof entry.fingerprint === "string"
      && Number(entry.sentAt) >= cutoff);
  } catch {
    return [];
  }
}

function wasReportRecentlySent(fingerprint) {
  return loadRecentReportHistory().some((entry) => entry.fingerprint === fingerprint);
}

function rememberSubmittedReport(pluginId, fingerprint) {
  const history = loadRecentReportHistory();
  history.push({
    pluginId: String(pluginId || "").trim().toLocaleLowerCase(),
    fingerprint,
    sentAt: Date.now()
  });
  try {
    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(history.slice(-MAX_REPORT_HISTORY)));
  } catch {}
}

async function openReportRequest() {
  const pluginId = String(reportPluginIdInput?.value || "").trim().toLowerCase();
  const email = String(reportEmailInput?.value || "").trim();
  const details = String(reportDetailsInput?.value || "").trim();
  if (!pluginId) {
    setReportStatus(t("report.enterId"));
    return;
  }
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(pluginId)) {
    setReportStatus(t("report.invalidId"));
    return;
  }
  if (!email) {
    setReportStatus(t("report.enterEmail"));
    return;
  }
  if (!isValidReportEmail(email)) {
    setReportStatus(t("report.invalidEmail"));
    return;
  }
  const detailsLength = reportDetailsLength();
  const detailsWords = reportDetailsWords();
  if (detailsLength < MIN_REPORT_DETAILS
      || detailsWords.length < MIN_REPORT_WORDS) {
    setReportStatus(t("report.explain", {
      minimum: MIN_REPORT_DETAILS,
      count: detailsLength,
      minimumWords: MIN_REPORT_WORDS,
      words: detailsWords.length
    }));
    return;
  }
  if (!reportConfirmationInput?.checked) {
    setReportStatus(t("report.confirm"));
    return;
  }
  if (!reportSecurityConfigured()) {
    setReportStatus(t("report.serviceUnavailable"), "error");
    return;
  }
  if (!reportTurnstileToken) {
    setReportStatus(t("report.captchaRequired"), "error");
    initializeReportChallenge();
    return;
  }
  let fingerprint;
  try {
    fingerprint = await reportFingerprint(pluginId, details);
  } catch {
    setReportStatus(t("report.serviceUnavailable"), "error");
    return;
  }
  if (wasReportRecentlySent(fingerprint)) {
    setReportStatus(t("report.duplicate"));
    return;
  }
  setReportStatus(t("report.sending"));
  if (requestReportPluginButton) {
    requestReportPluginButton.disabled = true;
  }
  try {
    const response = await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        email,
        plugin_id: pluginId,
        duplicate_fingerprint: fingerprint,
        reason: details,
        truthfulness_confirmation: true,
        turnstile_token: reportTurnstileToken,
        website: String(reportWebsiteInput?.value || "").trim()
      })
    });
    let result = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }
    const accepted = response.ok && (result?.success === true || result?.success === "true");
    if (!accepted) {
      const errorMessage = result?.code === "rate_limited"
        ? t("report.rateLimited")
        : ["captcha_required", "captcha_failed"].includes(result?.code)
          ? t("report.captchaFailed")
          : t("report.sendError");
      setReportStatus(errorMessage, "error");
      return;
    }
    rememberSubmittedReport(pluginId, fingerprint);
    reportDetailsInput.value = "";
    reportConfirmationInput.checked = false;
    updateReportDetailsCount();
    setReportStatus(t("report.sent"), "success");
  } catch {
    setReportStatus(t("report.sendError"), "error");
  } finally {
    resetReportChallenge();
    if (requestReportPluginButton) {
      requestReportPluginButton.disabled = false;
    }
  }
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
reportDetailsInput?.addEventListener("input", updateReportDetailsCount);
pluginSearchInput?.addEventListener("input", () => {
  searchQuery = String(pluginSearchInput.value || "");
  applyTagFilters(true);
});
favoritesOnlyButton?.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  applyTagFilters(true);
});
restrictedAccessButton?.addEventListener("click", toggleRestrictedAccess);
restrictedAccessForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  confirmRestrictedAccess();
});
cancelRestrictedAccessButton?.addEventListener("click", () => {
  restrictedAccessFormOpen = false;
  restrictedAccessMessageKey = "";
  clearBirthDateInputs();
  renderRestrictedAccess();
});
discardDraftPluginsButton?.addEventListener("click", () => {
  localStorage.removeItem(LOCAL_PLUGIN_KEY);
  setPublishStatus(t("publish.draftsRemoved"));
  loadAllPlugins();
});
applyStaticTranslations();
updateFavoritesOnlyButton();
updateReportDetailsCount();
const requestedView = new URLSearchParams(window.location.search).get("view");
setActiveView(["catalog", "publish", "report", "remove"].includes(requestedView) ? requestedView : "catalog");
loadAllPlugins();
