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
const FAVORITES_STORAGE_KEY = "kapitomo.favoriteChapters.v1";

let activeFilter = "All";
let query = new URLSearchParams(window.location.search).get("q") || "";
let chapterUiState = {
  workId: "",
  query: "",
  sort: "asc",
  filter: "all"
};
let favoriteMap = loadFavoriteMap();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadFavoriteMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveFavoriteMap() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteMap));
  } catch {
    favoriteMap = {};
  }
}

function getFavoriteIds(workId) {
  return new Set(Array.isArray(favoriteMap[workId]) ? favoriteMap[workId] : []);
}

function getChapterId(chapter, index) {
  return String(chapter.id || chapter.slug || `chapter-${index + 1}`);
}

function isChapterFavorite(workId, chapterId) {
  return getFavoriteIds(workId).has(chapterId);
}

function toggleChapterFavorite(workId, chapterId) {
  const favoriteIds = getFavoriteIds(workId);
  if (favoriteIds.has(chapterId)) {
    favoriteIds.delete(chapterId);
  } else {
    favoriteIds.add(chapterId);
  }

  if (favoriteIds.size) {
    favoriteMap[workId] = [...favoriteIds];
  } else {
    delete favoriteMap[workId];
  }

  saveFavoriteMap();
}

function getChapterNumberLabel(index) {
  return `Capitulo ${String(index + 1).padStart(2, "0")}`;
}

function getChapterTypeLabel(chapter) {
  return chapter.contentType === "novel" ? "Novel" : "Quadrinho";
}

function getChapterPreview(work, chapter) {
  const image = getChapterImages(chapter)[0];
  return image?.src || work.cover;
}

function getChapterReadingInfo(chapter) {
  if (chapter.contentType === "novel") {
    const wordCount = getWordCount(getChapterParagraphs(chapter));
    return `${wordCount} palavras - ~${getReadingMinutes(wordCount)} min`;
  }

  const imageCount = getChapterImages(chapter).length;
  return `${imageCount || 1} pagina${imageCount === 1 ? "" : "s"}`;
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
  const searchable = `${work.title} ${work.genre} ${work.status} ${work.description}`.toLowerCase();
  const genreMatch = activeFilter === "All" || work.genre === activeFilter;
  return genreMatch && searchable.includes(query.toLowerCase());
}

function chapterUrl(work, chapterIndex = 0) {
  return `#ler/${work.id}/${chapterIndex}`;
}

function workUrl(work) {
  return `#obra/${work.id}`;
}

function getChapterParagraphs(chapter) {
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

function getWordCount(textItems) {
  return textItems
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function getReadingMinutes(wordCount) {
  return Math.max(1, Math.ceil(wordCount / 180));
}

function renderWorks() {
  const visibleWorks = works.filter(matchesWork);
  worksGrid.innerHTML = "";

  if (!visibleWorks.length) {
    worksGrid.innerHTML = '<p class="empty-state">Nenhuma obra encontrada.</p>';
    return;
  }

  visibleWorks.forEach((work) => {
    const card = document.createElement("article");
    card.className = "work-card";
    card.innerHTML = `
      <a class="work-cover-link" href="${workUrl(work)}" aria-label="Abrir ${work.title}">
        <img src="${work.cover}" alt="Capa de ${work.title}">
        <span class="work-cover-badge">${work.format || "Obra"}</span>
      </a>
      <div class="work-card-body">
        <h3><a href="${workUrl(work)}">${work.title}</a></h3>
      </div>
    `;
    worksGrid.appendChild(card);
  });
}

function renderWorkPage(work) {
  const fragment = workTemplate.content.cloneNode(true);
  const page = fragment.querySelector(".manga-page");
  chapterUiState = {
    workId: work.id,
    query: "",
    sort: "asc",
    filter: "all"
  };

  fragment.querySelector(".manga-cover").src = work.cover;
  fragment.querySelector(".manga-cover").alt = `Capa de ${work.title}`;
  fragment.querySelector(".manga-genre").textContent = "";
  fragment.querySelector("h1").textContent = work.title;
  fragment.querySelector(".manga-test-note").textContent = work.testNote || "";
  fragment.querySelector(".manga-test-note").hidden = !work.testNote;
  fragment.querySelector(".manga-description").textContent = work.description;
  fragment.querySelector(".chapter-count").textContent = `${work.chapters.length} capitulo${work.chapters.length === 1 ? "" : "s"}`;

  fragment.querySelector(".manga-badges").innerHTML = `
    <span>${work.status}</span>
    <span>${work.rating}</span>
    <span>${work.chapters.length} capitulo${work.chapters.length === 1 ? "" : "s"}</span>
  `;

  fragment.querySelector(".manga-actions").innerHTML = `
    <a class="button primary" href="${chapterUrl(work, 0)}">Ler primeiro capitulo</a>
    <a class="button secondary" href="${chapterUrl(work, work.chapters.length - 1)}">Ultimo capitulo</a>
    <button class="button secondary chapter-favorites-shortcut" type="button"><span aria-hidden="true">&#9733;</span> Favoritos</button>
  `;

  fragment.querySelector(".manga-facts").innerHTML = `
    <h2>Informacoes</h2>
    <dl>
      <div><dt>Autor</dt><dd>KapiTomo</dd></div>
      <div><dt>Genero</dt><dd>${work.genre}</dd></div>
      <div><dt>Status</dt><dd>${work.status}</dd></div>
      <div><dt>Classificacao</dt><dd>${work.rating}</dd></div>
      <div><dt>Publicacao</dt><dd>Obras oficiais do KapiTomo</dd></div>
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
  const favoriteIds = getFavoriteIds(work.id);
  const chapterItems = work.chapters
    .map((chapter, index) => ({ chapter, index, id: getChapterId(chapter, index) }))
    .filter((item) => {
      const searchable = `${item.chapter.title} ${item.chapter.date} ${getChapterNumberLabel(item.index)} ${getChapterTypeLabel(item.chapter)}`.toLowerCase();
      const queryMatches = !queryValue || searchable.includes(queryValue);
      const filterMatches = chapterUiState.filter !== "favorite" || favoriteIds.has(item.id);
      return queryMatches && filterMatches;
    })
    .sort((left, right) => chapterUiState.sort === "desc" ? right.index - left.index : left.index - right.index);

  if (count) {
    count.textContent = `${chapterItems.length} de ${work.chapters.length}`;
  }

  workView.querySelectorAll("[data-chapter-sort]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.chapterSort === chapterUiState.sort);
  });

  workView.querySelectorAll("[data-chapter-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.chapterFilter === chapterUiState.filter);
  });

  if (!chapterItems.length) {
    list.innerHTML = '<p class="chapter-search-empty">Nenhum capitulo encontrado.</p>';
    return;
  }

  list.innerHTML = chapterItems
    .map(({ chapter, index, id }) => {
      const isFavorite = favoriteIds.has(id);
      const typeLabel = getChapterTypeLabel(chapter);
      return `
        <article class="chapter-list-entry">
          <a class="chapter-row" href="${chapterUrl(work, index)}">
            <span class="chapter-thumb">
              <img src="${escapeHtml(getChapterPreview(work, chapter))}" alt="" loading="lazy">
            </span>
            <span class="chapter-main">
              <strong>${escapeHtml(getChapterNumberLabel(index))}</strong>
              <span class="chapter-editorial-title">${escapeHtml(chapter.title)}</span>
              <small>${escapeHtml(chapter.date)} - ${escapeHtml(getChapterReadingInfo(chapter))}</small>
            </span>
            <span class="chapter-meta">
              <span class="chapter-format-pill ${chapter.contentType === "novel" ? "is-novel" : ""}">${escapeHtml(typeLabel)}</span>
              <em>Ler</em>
            </span>
          </a>
          <button class="chapter-favorite-button ${isFavorite ? "is-favorite" : ""}" type="button" data-work-id="${escapeHtml(work.id)}" data-chapter-id="${escapeHtml(id)}" aria-pressed="${isFavorite}" aria-label="${isFavorite ? "Remover dos favoritos" : "Favoritar capitulo"}" title="${isFavorite ? "Remover dos favoritos" : "Favoritar capitulo"}">
            <span aria-hidden="true">${isFavorite ? "&#9733;" : "&#9734;"}</span>
          </button>
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
  const paragraphs = getChapterParagraphs(chapter);
  const isNovel = chapter.contentType === "novel";
  const isImageChapter = chapter.contentType === "images";
  const wordCount = getWordCount(paragraphs);

  fragment.querySelector(".back-link").href = workUrl(work);
  fragment.querySelector(".eyebrow").textContent = work.title;
  fragment.querySelector("h1").textContent = isNovel ? `Capitulo ${String(safeIndex + 1)}` : chapter.title;
  fragment.querySelector(".chapter-tools").innerHTML = `
    ${previousIndex === null ? '<span class="button ghost disabled">Anterior</span>' : `<a class="button secondary" href="${chapterUrl(work, previousIndex)}">Anterior</a>`}
    <a class="button secondary" href="${workUrl(work)}">Lista de capitulos</a>
    ${nextIndex === null ? '<span class="button ghost disabled">Proximo</span>' : `<a class="button primary" href="${chapterUrl(work, nextIndex)}">Proximo</a>`}
  `;

  if (isNovel) {
    page.classList.add("novel-page");
    fragment.querySelector(".chapter-header").insertAdjacentHTML(
      "beforeend",
      `<p class="novel-meta">${wordCount} palavras <span>~${getReadingMinutes(wordCount)} min de leitura</span></p>`
    );
    fragment.querySelector(".webtoon-strip").className = "novel-reader";
    fragment.querySelector(".novel-reader").innerHTML = paragraphs
      .map((paragraph) => `<p>${paragraph}</p>`)
      .join("");
  } else if (isImageChapter) {
    const imagePages = getChapterImages(chapter);
    page.classList.add("image-chapter-page");
    fragment.querySelector(".webtoon-strip").className = "image-reader";
    fragment.querySelector(".image-reader").innerHTML = imagePages
      .map((image, index) => `<img src="${image.src}" alt="${image.alt || `${chapter.title} pagina ${index + 1}`}" loading="lazy">`)
      .join("");
  } else {
    fragment.querySelector(".webtoon-strip").innerHTML = [
      `<section class="webtoon-cover-panel"><img src="${work.cover}" alt="Capa de ${work.title}"><div><span>${work.title}</span><strong>${chapter.title}</strong></div></section>`,
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
    <a class="button secondary" href="${workUrl(work)}">Voltar para ${work.title}</a>
    ${nextIndex === null ? "" : `<a class="button primary" href="${chapterUrl(work, nextIndex)}">Ler proximo capitulo</a>`}
  `;

  chapterView.innerHTML = "";
  chapterView.appendChild(page);
  showRoute(chapterView);
}

function handleRoute() {
  const [route, workId, chapterIndex] = window.location.hash.replace(/^#/, "").split("/");
  const work = getWork(workId);

  if (route === "obra" && work) {
    renderWorkPage(work);
    return;
  }

  if (route === "ler" && work) {
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

  const sortButton = event.target.closest("[data-chapter-sort]");
  if (sortButton) {
    chapterUiState.sort = sortButton.dataset.chapterSort || "asc";
    renderChapterList(work);
    return;
  }

  const filterButton = event.target.closest("[data-chapter-filter]");
  if (filterButton) {
    chapterUiState.filter = filterButton.dataset.chapterFilter || "all";
    renderChapterList(work);
    return;
  }

  const favoriteShortcut = event.target.closest(".chapter-favorites-shortcut");
  if (favoriteShortcut) {
    chapterUiState.filter = "favorite";
    renderChapterList(work);
    workView.querySelector(".chapter-control-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const favoriteButton = event.target.closest(".chapter-favorite-button");
  if (favoriteButton) {
    toggleChapterFavorite(favoriteButton.dataset.workId, favoriteButton.dataset.chapterId);
    renderChapterList(work);
  }
});

if (query) {
  searchInput.value = query;
}

window.addEventListener("hashchange", handleRoute);

renderWorks();
handleRoute();
