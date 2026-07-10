const works = window.KAPI_TOMO_WORKS || [];

const worksGrid = document.querySelector("#worksGrid");
const searchInput = document.querySelector("#searchInput");
const filters = [...document.querySelectorAll(".filter")];
const homeSections = [...document.querySelectorAll("main > section:not(.route-view)")];
const routeViews = [...document.querySelectorAll(".route-view")];
const workView = document.querySelector("#workView");
const chapterView = document.querySelector("#chapterView");
const workTemplate = document.querySelector("#workTemplate");
const chapterTemplate = document.querySelector("#chapterTemplate");
const languageButtons = [...document.querySelectorAll("[data-language-option]")];

const LANGUAGE_STORAGE_KEY = "kapitomo.siteLanguage.v1";

const I18N = {
  en: {
    metaTitle: "KapiTomo",
    search: {
      label: "Search",
      worksPlaceholder: "Search works...",
      chapterPlaceholder: "Search chapter..."
    },
    library: {
      eyebrow: "Works",
      title: "Works"
    },
    plugin: {
      title: "KapiTomo Plugin",
      note: "Online plugins are source connectors. Community or third-party plugins are maintained by their creators and by the source sites they target. Nyxovira Pro unlocks app features; it is not a sale of third-party works, chapters, translations, or plugins.",
      openPlugins: "Open online plugins",
      openDocs: "Open API documentation",
      terms: "Terms and content policy"
    },
    about: {
      eyebrow: "About KapiTomo",
      title: "A library for readers",
      step1: {
        title: "Official works",
        text: "This site gathers official KapiTomo works for free reading in a simple, accessible space."
      },
      step2: {
        title: "Free reading",
        text: "You can read online whenever you want and come back later to continue."
      },
      step3: {
        title: "Keep following",
        text: "Chapters stay organized for online reading, with quick access to published works."
      }
    },
    work: {
      back: "Back to works",
      chapters: "Chapters",
      readingList: "Reading list",
      open: "Open {title}",
      cover: "Cover of {title}",
      formatFallback: "Work",
      testOnly: "Test work only.",
      noWorks: "No works found.",
      readFirst: "Read first chapter",
      latest: "Latest chapter",
      information: "Information",
      author: "Author",
      genre: "Genre",
      status: "Status",
      rating: "Rating",
      publication: "Publication",
      publicationValue: "Official KapiTomo works"
    },
    chapter: {
      back: "Back to work",
      backToWork: "Back to {title}",
      list: "Chapter list",
      readNext: "Read next chapter",
      previous: "Previous",
      next: "Next",
      start: "Start",
      latest: "Latest",
      sortedLatest: "Sorted by latest chapters",
      sortedStart: "Sorted from the start",
      noChapters: "No chapters found.",
      count: "{count} of {total}",
      number: "Chapter {number}",
      number3: "Chapter {number}",
      typeNovel: "Novel",
      typeComic: "Comic",
      page: "{count} page",
      pages: "{count} pages",
      imageAlt: "{title} page {page}"
    },
    unit: {
      chapter: "{count} chapter",
      chapters: "{count} chapters"
    },
    footer: {
      text: "KapiTomo is an official space for publishing and reading free original works.",
      policies: "Policies",
      terms: "Terms",
      kapitomoPrivacy: "KapiTomo Privacy",
      nyxoviraPrivacy: "Nyxovira Privacy",
      nyxaliraPrivacy: "Nyxalira Privacy"
    }
  },
  pt: {
    metaTitle: "KapiTomo",
    search: {
      label: "Pesquisar",
      worksPlaceholder: "Pesquisar obras...",
      chapterPlaceholder: "Pesquisar capítulo..."
    },
    library: {
      eyebrow: "Obras",
      title: "Obras"
    },
    plugin: {
      title: "Plugin KapiTomo",
      note: "Plugins online são conectores de fonte. Plugins da comunidade ou de terceiros são mantidos por seus criadores e pelos sites de origem. O Nyxovira Pro libera recursos do app; não é venda de obras, capítulos, traduções ou plugins de terceiros.",
      openPlugins: "Abrir plugins online",
      openDocs: "Abrir documentação da API",
      terms: "Termos e política de conteúdo"
    },
    about: {
      eyebrow: "Sobre o KapiTomo",
      title: "Uma biblioteca para leitores",
      step1: {
        title: "Obras oficiais",
        text: "Este site reúne obras oficiais do KapiTomo para leitura gratuita em um espaço simples e acessível."
      },
      step2: {
        title: "Leitura gratuita",
        text: "Você pode ler online quando quiser e voltar depois para continuar."
      },
      step3: {
        title: "Continue acompanhando",
        text: "Os capítulos ficam organizados para leitura online, com acesso rápido às obras publicadas."
      }
    },
    work: {
      back: "Voltar para obras",
      chapters: "Capítulos",
      readingList: "Lista de leitura",
      open: "Abrir {title}",
      cover: "Capa de {title}",
      formatFallback: "Obra",
      testOnly: "Obra apenas para teste.",
      noWorks: "Nenhuma obra encontrada.",
      readFirst: "Ler primeiro capítulo",
      latest: "Último capítulo",
      information: "Informações",
      author: "Autor",
      genre: "Gênero",
      status: "Status",
      rating: "Classificação",
      publication: "Publicação",
      publicationValue: "Obras oficiais do KapiTomo"
    },
    chapter: {
      back: "Voltar para obra",
      backToWork: "Voltar para {title}",
      list: "Lista de capítulos",
      readNext: "Ler próximo capítulo",
      previous: "Anterior",
      next: "Próximo",
      start: "Início",
      latest: "Recentes",
      sortedLatest: "Ordenado pelos capítulos mais recentes",
      sortedStart: "Ordenado desde o início",
      noChapters: "Nenhum capítulo encontrado.",
      count: "{count} de {total}",
      number: "Capítulo {number}",
      number3: "Capítulo {number}",
      typeNovel: "Novel",
      typeComic: "Quadrinho",
      page: "{count} página",
      pages: "{count} páginas",
      imageAlt: "{title} página {page}"
    },
    unit: {
      chapter: "{count} capítulo",
      chapters: "{count} capítulos"
    },
    footer: {
      text: "KapiTomo é um espaço oficial para publicar e ler obras originais gratuitas.",
      policies: "Políticas",
      terms: "Termos",
      kapitomoPrivacy: "Privacidade KapiTomo",
      nyxoviraPrivacy: "Privacidade Nyxovira",
      nyxaliraPrivacy: "Privacidade Nyxalira"
    }
  }
};

const DISPLAY_VALUES = {
  en: {},
  pt: {
    Complete: "Completa",
    Fantasy: "Fantasia",
    Novel: "Novel",
    Comic: "Quadrinho",
    "All ages": "Livre"
  }
};

const WORK_COPY = {
  en: {
    "world-without-humans-comics": {
      title: "The World Without Humans: Comics",
      description: "Comic version of The World Without Humans, told only through illustrated pages."
    }
  },
  pt: {
    "world-without-humans": {
      title: "O Mundo Sem Humanos",
      description: "Aos 14 anos, Caio acorda em um mundo sem humanos, onde dragões, goblins e elfos atacam qualquer estranho. Para voltar vivo, ele precisa aprender a sobreviver sem virar herói."
    },
    "world-without-humans-comics": {
      title: "O Mundo Sem Humanos: Quadrinhos",
      description: "Versão em quadrinhos de O Mundo Sem Humanos, contada por páginas ilustradas."
    }
  }
};

const NOVEL_CHAPTER_TITLES = {
  en: [
    "Chapter 01 - The Fall",
    "Chapter 02 - The Hunting Forest",
    "Chapter 03 - The Stone Exit"
  ],
  pt: [
    "Capítulo 01 - A Queda",
    "Capítulo 02 - A Floresta que Caça",
    "Capítulo 03 - A Saída de Pedra"
  ]
};

const NOVEL_CHAPTER_PARAGRAPHS = {
  pt: {
    "world-without-humans": [
      [
        "Caio tinha quatorze anos e voltava da escola para casa quando o chão desapareceu. Um segundo antes havia asfalto, uma mochila pesada e barulho de ônibus. No seguinte, havia lama até os tornozelos, ar frio e uma floresta que respirava como um animal enorme.",
        "Ele chamou por alguém. Ninguém respondeu. Não havia postes, casas, carros nem vozes humanas. Apenas árvores altas demais, folhas escuras e marcas de garras nos troncos. Caio apertou a alça da mochila e tentou não chorar.",
        "Um rugido rasgou o céu. Entre as nuvens, uma sombra alada passou devagar. Era um dragão. Não um desenho, não um sonho. Um dragão real, grande como um prédio, procurando alguma coisa no vale.",
        "Caio correu para baixo de uma raiz gigante e prendeu a respiração. O monstro pousou longe, mas o vento das asas derrubou galhos ao redor dele. Quando tudo ficou quieto, abriu a mochila. Tinha uma garrafa d'água, dois pães, um caderno, uma lanterna pequena e um canivete simples que usava para apontar lápis.",
        "Não era muito. Mas era tudo. Caio decidiu que não gastaria energia gritando. Primeiro precisava de abrigo. Depois água. Depois um jeito de entender onde estava.",
        "Enquanto caminhava, encontrou pegadas pequenas perto de um riacho. Achou que eram de uma criança até ver uma flecha presa numa pedra. A ponta estava manchada com veneno verde.",
        "Risadas finas subiram dos arbustos. Goblins. Quatro deles, baixos, magros e armados com facas curvas, cercavam o riacho farejando o ar. Caio se jogou na lama atrás de uma pedra e cobriu a boca com a manga.",
        "Um goblin passou tão perto que Caio viu os dentes quebrados e os olhos amarelos. Se ele se mexesse, morreria ali mesmo. Então ficou parado, contando as batidas do próprio coração.",
        "Quando os goblins foram embora, Caio entendeu a primeira regra daquele mundo: tudo ali via um humano como comida, inimigo ou algo estranho demais para deixar vivo. Pegou a flecha envenenada com cuidado, enterrou o medo no fundo do peito e continuou andando antes que a noite chegasse."
      ],
      [
        "Caio passou a primeira noite dentro do tronco oco de uma árvore. Não dormiu de verdade. Cada estalo parecia um passo, cada sombra parecia uma garra. Quando o sol cinzento nasceu, ele estava com fome, frio e coberto de lama.",
        "Comeu metade de um pão e guardou o resto. No caderno, escreveu três regras: não correr sem saber para onde ir, não fazer fogo durante o dia e não confiar em ninguém armado.",
        "A terceira regra falhou antes do meio-dia. Perto de uma clareira, Caio viu dois elfos. Eram altos, bonitos e silenciosos, com arcos longos e roupas de couro claro. Por um segundo, quase pediu ajuda.",
        "Então viu o que estavam fazendo. Os elfos perseguiam uma criaturinha ferida, rindo sempre que ela tropeçava. Um deles disparou uma flecha só para cortar o caminho da vítima. Não estavam caçando por comida. Estavam brincando.",
        "Caio recuou devagar, mas seu pé quebrou um galho. Os dois elfos viraram o rosto ao mesmo tempo. Os olhos deles eram prateados e frios. Um deles sorriu como alguém que encontra um brinquedo novo.",
        "Caio correu. Lembrou da própria regra tarde demais. Flechas assobiaram perto de suas orelhas. Entrou numa parte da mata onde as árvores tinham espinhos vermelhos e se jogou debaixo delas. Os elfos hesitaram. Os espinhos se moviam sozinhos.",
        "Com o canivete, Caio cortou tiras da própria camisa e enrolou nos braços para atravessar a vegetação sem rasgar a pele. Uma flecha atingiu sua mochila, mas ficou presa no tecido. Ele não olhou para trás.",
        "No fim da trilha, encontrou uma caverna baixa. Lá dentro havia ossos antigos e cheiro de animal, mas também havia pedras secas. Caio entrou, puxou galhos sobre a abertura e esperou.",
        "Quando a noite caiu, os elfos desistiram. Caio tremia inteiro. Mesmo assim, fez algo importante: quebrou a flecha presa na mochila e guardou a ponta. Naquele mundo, qualquer ferramenta podia virar uma chance.",
        "Ele não era forte. Não sabia lutar. Mas sabia observar. E, se conseguisse sobreviver mais um dia, talvez descobrisse uma saída."
      ],
      [
        "Na manhã seguinte, Caio encontrou marcas antigas na parede da caverna. Não eram desenhos de animais. Eram setas, círculos e um símbolo repetido três vezes: uma porta dentro de uma montanha.",
        "Seguiu as marcas por um túnel estreito. A lanterna falhou duas vezes, e a escuridão parecia pressionar seu rosto. Quando saiu do outro lado, viu ruínas de pedra engolidas por raízes. No centro havia um arco quebrado, igual ao símbolo na parede.",
        "O problema era o dragão. Ele dormia enrolado ao redor das ruínas, soltando fumaça pelo nariz. Entre suas escamas havia cicatrizes de lanças e flechas. Até os elfos e goblins tinham medo dele.",
        "Caio se escondeu e pensou. Não podia lutar. Não podia correr. Então fez a única coisa que ainda sabia fazer melhor que os monstros: improvisar.",
        "Usou a garrafa vazia, pedrinhas e a ponta da flecha para fazer um chocalho. Amarrou tudo numa vinha e jogou longe contra uma coluna caída. O barulho ecoou pela ruína.",
        "O dragão abriu um olho. Depois o outro. Ergueu a cabeça e avançou na direção do som, irritado. Caio correu abaixado, quase engatinhando, até o arco de pedra.",
        "O portal não acendeu. Faltava alguma coisa. Caio viu um encaixe no centro da base, exatamente do tamanho da lanterna. Engoliu em seco, colocou o objeto ali e apertou o botão.",
        "A luz fraca virou uma linha branca. O arco inteiro tremeu. O dragão percebeu e rugiu. Caio sentiu o calor alcançar suas costas, mas não tirou a mão da lanterna.",
        "Quando o portal se abriu, viu por um instante a rua perto de casa. O mesmo poste, o mesmo muro pichado, o mesmo mundo humano barulhento que antes parecia comum demais.",
        "Caio pulou. Caiu de joelhos no asfalto, com a mochila rasgada e lama até o pescoço. O portal se fechou atrás dele como um suspiro.",
        "Ninguém acreditaria nele. Talvez até ele mesmo parasse de acreditar depois de alguns dias. Mas dentro da mochila ainda havia uma escama preta, quente como brasa.",
        "Caio colocou a escama no bolso e olhou para o céu. Estava em casa. Mas agora sabia uma coisa que nunca esqueceria: sobreviver não era derrotar todos os monstros. Era continuar pensando quando o medo queria pensar por ele."
      ]
    ]
  }
};

let activeFilter = "All";
let query = new URLSearchParams(window.location.search).get("q") || "";
let currentLanguage = initialLanguage();
let chapterUiState = {
  workId: "",
  query: "",
  sort: "asc"
};

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

function applyStaticTranslations(root = document) {
  document.documentElement.lang = currentLanguage === "pt" ? "pt-BR" : "en";
  document.title = t("metaTitle");
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((node) => {
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
  renderWorks();
  handleRoute();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayValue(value) {
  return DISPLAY_VALUES[currentLanguage]?.[value] || value || "";
}

function displayTitle(work) {
  return WORK_COPY[currentLanguage]?.[work.id]?.title || displayValue(work.title);
}

function displayDescription(work) {
  return WORK_COPY[currentLanguage]?.[work.id]?.description || work.description || "";
}

function displayTestNote(work) {
  return work.testNote ? t("work.testOnly") : "";
}

function getChapterId(chapter, index) {
  return String(chapter.id || chapter.slug || `chapter-${index + 1}`);
}

function getChapterNumberLabel(index) {
  return t("chapter.number", { number: String(index + 1).padStart(2, "0") });
}

function displayChapterTitle(chapter, index) {
  if (!chapter?.title) {
    return getChapterNumberLabel(index);
  }
  if (chapter.contentType === "novel" && NOVEL_CHAPTER_TITLES[currentLanguage]?.[index]) {
    return NOVEL_CHAPTER_TITLES[currentLanguage][index];
  }
  if (chapter.contentType === "images") {
    return t("chapter.number3", { number: String(index + 1).padStart(3, "0") });
  }
  return getChapterNumberLabel(index);
}

function getChapterTypeLabel(chapter) {
  return chapter.contentType === "novel" ? t("chapter.typeNovel") : t("chapter.typeComic");
}

function getChapterPreview(work, chapter) {
  const image = getChapterImages(chapter)[0];
  return image?.src || work.cover;
}

function getChapterReadingInfo(chapter) {
  const imageCount = getChapterImages(chapter).length;
  const count = imageCount || 1;
  return t(count === 1 ? "chapter.page" : "chapter.pages", { count });
}

function getWork(workId) {
  return works.find((item) => item.id === workId);
}

function showHome() {
  homeSections.forEach((section) => section.classList.remove("hidden"));
  routeViews.forEach((section) => section.classList.add("hidden"));
  workView.innerHTML = "";
  chapterView.innerHTML = "";
}

function showRoute(view) {
  homeSections.forEach((section) => section.classList.add("hidden"));
  routeViews.forEach((section) => section.classList.add("hidden"));
  view.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function matchesWork(work) {
  const searchable = `${displayTitle(work)} ${displayValue(work.genre)} ${displayValue(work.status)} ${displayDescription(work)}`.toLowerCase();
  const genreMatch = activeFilter === "All" || displayValue(work.genre) === activeFilter || work.genre === activeFilter;
  return genreMatch && searchable.includes(query.toLowerCase());
}

function chapterUrl(work, chapterIndex = 0) {
  return `#read/${work.id}/${chapterIndex}`;
}

function workUrl(work) {
  return `#work/${work.id}`;
}

function getChapterParagraphs(work, chapter, index) {
  const localizedParagraphs = NOVEL_CHAPTER_PARAGRAPHS[currentLanguage]?.[work.id]?.[index];
  if (chapter.contentType === "novel" && Array.isArray(localizedParagraphs) && localizedParagraphs.length) {
    return localizedParagraphs;
  }

  if (Array.isArray(chapter.paragraphs) && chapter.paragraphs.length) {
    return chapter.paragraphs;
  }

  return Array.isArray(chapter.pages) ? chapter.pages : [];
}

function getChapterImages(chapter) {
  if (Array.isArray(chapter.images) && chapter.images.length) {
    return chapter.images;
  }

  return Array.isArray(chapter.pages) ? chapter.pages.filter((page) => typeof page === "object" && page.src) : [];
}

function renderWorks() {
  const visibleWorks = works.filter(matchesWork);
  worksGrid.innerHTML = "";

  if (!visibleWorks.length) {
    worksGrid.innerHTML = `<p class="empty-state">${escapeHtml(t("work.noWorks"))}</p>`;
    return;
  }

  visibleWorks.forEach((work) => {
    const title = displayTitle(work);
    const card = document.createElement("article");
    card.className = "work-card";
    card.innerHTML = `
      <a class="work-cover-link" href="${workUrl(work)}" aria-label="${escapeHtml(t("work.open", { title }))}">
        <img src="${work.cover}" alt="${escapeHtml(t("work.cover", { title }))}">
        <span class="work-cover-badge">${escapeHtml(displayValue(work.format) || t("work.formatFallback"))}</span>
      </a>
      <div class="work-card-body">
        <h3><a href="${workUrl(work)}">${escapeHtml(title)}</a></h3>
      </div>
    `;
    worksGrid.appendChild(card);
  });
}

function renderWorkPage(work) {
  const title = displayTitle(work);
  const fragment = workTemplate.content.cloneNode(true);
  applyStaticTranslations(fragment);
  const page = fragment.querySelector(".manga-page");
  chapterUiState = {
    workId: work.id,
    query: "",
    sort: "asc"
  };

  fragment.querySelector(".manga-cover").src = work.cover;
  fragment.querySelector(".manga-cover").alt = t("work.cover", { title });
  fragment.querySelector(".manga-genre").textContent = "";
  fragment.querySelector("h1").textContent = title;
  fragment.querySelector(".manga-test-note").textContent = displayTestNote(work);
  fragment.querySelector(".manga-test-note").hidden = !work.testNote;
  fragment.querySelector(".manga-description").textContent = displayDescription(work);
  fragment.querySelector(".chapter-count").textContent = t(work.chapters.length === 1 ? "unit.chapter" : "unit.chapters", { count: work.chapters.length });

  fragment.querySelector(".manga-badges").innerHTML = `
    <span>${escapeHtml(displayValue(work.status))}</span>
    <span>${escapeHtml(displayValue(work.rating))}</span>
    <span>${escapeHtml(t(work.chapters.length === 1 ? "unit.chapter" : "unit.chapters", { count: work.chapters.length }))}</span>
  `;

  fragment.querySelector(".manga-actions").innerHTML = `
    <a class="button primary" href="${chapterUrl(work, 0)}">${escapeHtml(t("work.readFirst"))}</a>
    <a class="button secondary" href="${chapterUrl(work, work.chapters.length - 1)}">${escapeHtml(t("work.latest"))}</a>
  `;

  fragment.querySelector(".manga-facts").innerHTML = `
    <h2>${escapeHtml(t("work.information"))}</h2>
    <dl>
      <div class="fact-author"><dt>${escapeHtml(t("work.author"))}</dt><dd>KapiTomo</dd></div>
      <div class="fact-genre"><dt>${escapeHtml(t("work.genre"))}</dt><dd>${escapeHtml(displayValue(work.genre))}</dd></div>
      <div class="fact-status"><dt>${escapeHtml(t("work.status"))}</dt><dd>${escapeHtml(displayValue(work.status))}</dd></div>
      <div class="fact-rating"><dt>${escapeHtml(t("work.rating"))}</dt><dd>${escapeHtml(displayValue(work.rating))}</dd></div>
      <div class="fact-publish"><dt>${escapeHtml(t("work.publication"))}</dt><dd>${escapeHtml(t("work.publicationValue"))}</dd></div>
    </dl>
  `;

  workView.innerHTML = "";
  workView.appendChild(page);
  renderChapterList(work);
  showRoute(workView);
}

function renderChapterList(work) {
  const list = workView.querySelector(".chapter-list");
  const count = workView.querySelector(".chapter-count");
  const queryValue = chapterUiState.query.trim().toLowerCase();
  const chapterItems = work.chapters
    .map((chapter, index) => ({ chapter, index, id: getChapterId(chapter, index) }))
    .filter((item) => {
      const searchable = `${displayChapterTitle(item.chapter, item.index)} ${item.chapter.date} ${getChapterNumberLabel(item.index)} ${getChapterTypeLabel(item.chapter)}`.toLowerCase();
      return !queryValue || searchable.includes(queryValue);
    })
    .sort((left, right) => chapterUiState.sort === "desc" ? right.index - left.index : left.index - right.index);

  if (count) {
    count.textContent = t("chapter.count", { count: chapterItems.length, total: work.chapters.length });
  }

  const sortToggle = workView.querySelector("[data-chapter-sort-toggle]");
  if (sortToggle) {
    sortToggle.textContent = chapterUiState.sort === "desc" ? t("chapter.latest") : t("chapter.start");
    sortToggle.setAttribute("aria-label", chapterUiState.sort === "desc" ? t("chapter.sortedLatest") : t("chapter.sortedStart"));
  }

  if (!chapterItems.length) {
    list.innerHTML = `<p class="chapter-search-empty">${escapeHtml(t("chapter.noChapters"))}</p>`;
    return;
  }

  list.innerHTML = chapterItems
    .map(({ chapter, index }) => {
      const typeLabel = getChapterTypeLabel(chapter);
      return `
        <article class="chapter-list-entry">
          <a class="chapter-row" href="${chapterUrl(work, index)}">
            <span class="chapter-thumb">
              <img src="${escapeHtml(getChapterPreview(work, chapter))}" alt="" loading="lazy">
            </span>
            <span class="chapter-main">
              <strong>${escapeHtml(getChapterNumberLabel(index))}</strong>
              <span class="chapter-editorial-title">${escapeHtml(displayChapterTitle(chapter, index))}</span>
              <small>${escapeHtml(chapter.contentType === "novel" ? chapter.date : `${chapter.date} - ${getChapterReadingInfo(chapter)}`)}</small>
            </span>
            <span class="chapter-meta">
              <span class="chapter-format-pill ${chapter.contentType === "novel" ? "is-novel" : ""}">${escapeHtml(typeLabel)}</span>
            </span>
          </a>
        </article>
      `;
    })
    .join("");
}

function renderChapterPage(work, chapterIndex = 0) {
  const requestedIndex = Number.isFinite(chapterIndex) ? chapterIndex : 0;
  const safeIndex = Math.min(Math.max(requestedIndex, 0), work.chapters.length - 1);
  const chapter = work.chapters[safeIndex];
  const previousIndex = safeIndex > 0 ? safeIndex - 1 : null;
  const nextIndex = safeIndex < work.chapters.length - 1 ? safeIndex + 1 : null;
  const fragment = chapterTemplate.content.cloneNode(true);
  const page = fragment.querySelector(".chapter-page");
  const paragraphs = getChapterParagraphs(work, chapter, safeIndex);
  const isNovel = chapter.contentType === "novel";
  const isImageChapter = chapter.contentType === "images";
  const workTitle = displayTitle(work);

  applyStaticTranslations(fragment);
  fragment.querySelector(".back-link").href = workUrl(work);
  fragment.querySelector(".eyebrow").textContent = workTitle;
  fragment.querySelector("h1").textContent = isNovel ? getChapterNumberLabel(safeIndex) : displayChapterTitle(chapter, safeIndex);
  fragment.querySelector(".chapter-tools").innerHTML = `
    ${previousIndex === null ? `<span class="button ghost disabled">${escapeHtml(t("chapter.previous"))}</span>` : `<a class="button secondary" href="${chapterUrl(work, previousIndex)}">${escapeHtml(t("chapter.previous"))}</a>`}
    <a class="button secondary" href="${workUrl(work)}">${escapeHtml(t("chapter.list"))}</a>
    ${nextIndex === null ? `<span class="button ghost disabled">${escapeHtml(t("chapter.next"))}</span>` : `<a class="button primary" href="${chapterUrl(work, nextIndex)}">${escapeHtml(t("chapter.next"))}</a>`}
  `;

  if (isNovel) {
    page.classList.add("novel-page");
    fragment.querySelector(".webtoon-strip").className = "novel-reader";
    fragment.querySelector(".novel-reader").innerHTML = paragraphs
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
  } else if (isImageChapter) {
    const imagePages = getChapterImages(chapter);
    page.classList.add("image-chapter-page");
    fragment.querySelector(".webtoon-strip").className = "image-reader";
    fragment.querySelector(".image-reader").innerHTML = imagePages
      .map((image, index) => `<img src="${image.src}" alt="${escapeHtml(image.alt || t("chapter.imageAlt", { title: displayChapterTitle(chapter, safeIndex), page: index + 1 }))}" loading="lazy">`)
      .join("");
  } else {
    fragment.querySelector(".webtoon-strip").innerHTML = [
      `<section class="webtoon-cover-panel"><img src="${work.cover}" alt="${escapeHtml(t("work.cover", { title: workTitle }))}"><div><span>${escapeHtml(workTitle)}</span><strong>${escapeHtml(displayChapterTitle(chapter, safeIndex))}</strong></div></section>`,
      ...paragraphs.map(
        (pageText, index) => `
          <section class="webtoon-panel">
            <small>${String(index + 1).padStart(2, "0")}</small>
            <p>${pageText}</p>
          </section>
        `
      )
    ].join("");
  }

  fragment.querySelector(".chapter-footer").innerHTML = `
    <a class="button secondary" href="${workUrl(work)}">${escapeHtml(t("chapter.backToWork", { title: workTitle }))}</a>
    ${nextIndex === null ? "" : `<a class="button primary" href="${chapterUrl(work, nextIndex)}">${escapeHtml(t("chapter.readNext"))}</a>`}
  `;

  chapterView.innerHTML = "";
  chapterView.appendChild(page);
  showRoute(chapterView);
}

function handleRoute() {
  const [route, workId, chapterIndex] = window.location.hash.replace(/^#/, "").split("/");
  const work = getWork(workId);

  if (route === "work" && work) {
    renderWorkPage(work);
    return;
  }

  if (route === "read" && work) {
    renderChapterPage(work, Number(chapterIndex || 0));
    return;
  }

  showHome();
}

searchInput.addEventListener("input", (event) => {
  query = event.target.value.trim();
  renderWorks();
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderWorks();
  });
});

workView.addEventListener("input", (event) => {
  if (!event.target.matches(".chapter-search-input")) {
    return;
  }

  const work = getWork(chapterUiState.workId);
  if (!work) {
    return;
  }

  chapterUiState.query = event.target.value;
  renderChapterList(work);
  const nextInput = workView.querySelector(".chapter-search-input");
  if (nextInput) {
    nextInput.focus();
    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
  }
});

workView.addEventListener("click", (event) => {
  const work = getWork(chapterUiState.workId);
  if (!work) {
    return;
  }

  const sortButton = event.target.closest("[data-chapter-sort-toggle]");
  if (sortButton) {
    chapterUiState.sort = chapterUiState.sort === "asc" ? "desc" : "asc";
    renderChapterList(work);
  }
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.languageOption);
  });
});

if (query) {
  searchInput.value = query;
}

window.addEventListener("hashchange", handleRoute);

applyStaticTranslations();
renderWorks();
handleRoute();
