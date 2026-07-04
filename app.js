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

const DISPLAY_VALUES = {};

const WORK_COPY = {
  "world-without-humans-comics": {
    title: "The World Without Humans: Comics",
    description: "Comic version of The World Without Humans, told only through illustrated pages."
  }
};

const NOVEL_CHAPTER_TITLES = [
  "Chapter 01 - The Fall",
  "Chapter 02 - The Hunting Forest",
  "Chapter 03 - The Stone Exit"
];

let activeFilter = "All";
let query = new URLSearchParams(window.location.search).get("q") || "";
let chapterUiState = {
  workId: "",
  query: "",
  sort: "asc"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayValue(value) {
  return DISPLAY_VALUES[value] || value || "";
}

function displayTitle(work) {
  return WORK_COPY[work.id]?.title || displayValue(work.title);
}

function displayDescription(work) {
  return WORK_COPY[work.id]?.description || work.description || "";
}

function displayTestNote(work) {
  return work.testNote ? "Test work only." : "";
}

function getChapterId(chapter, index) {
  return String(chapter.id || chapter.slug || `chapter-${index + 1}`);
}

function getChapterNumberLabel(index) {
  return `Chapter ${String(index + 1).padStart(2, "0")}`;
}

function displayChapterTitle(chapter, index) {
  if (!chapter?.title) {
    return getChapterNumberLabel(index);
  }
  if (chapter.contentType === "novel" && NOVEL_CHAPTER_TITLES[index]) {
    return NOVEL_CHAPTER_TITLES[index];
  }
  if (chapter.contentType === "images") {
    return `Chapter ${String(index + 1).padStart(3, "0")}`;
  }
  return getChapterNumberLabel(index);
}

function getChapterTypeLabel(chapter) {
  return chapter.contentType === "novel" ? "Novel" : "Comic";
}

function getChapterPreview(work, chapter) {
  const image = getChapterImages(chapter)[0];
  return image?.src || work.cover;
}

function getChapterReadingInfo(chapter) {
  const imageCount = getChapterImages(chapter).length;
  return `${imageCount || 1} page${imageCount === 1 ? "" : "s"}`;
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

function renderWorks() {
  const visibleWorks = works.filter(matchesWork);
  worksGrid.innerHTML = "";

  if (!visibleWorks.length) {
    worksGrid.innerHTML = '<p class="empty-state">No works found.</p>';
    return;
  }

  visibleWorks.forEach((work) => {
    const title = displayTitle(work);
    const card = document.createElement("article");
    card.className = "work-card";
    card.innerHTML = `
      <a class="work-cover-link" href="${workUrl(work)}" aria-label="Open ${escapeHtml(title)}">
        <img src="${work.cover}" alt="Cover of ${escapeHtml(title)}">
        <span class="work-cover-badge">${escapeHtml(displayValue(work.format) || "Work")}</span>
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
  const page = fragment.querySelector(".manga-page");
  chapterUiState = {
    workId: work.id,
    query: "",
    sort: "asc"
  };

  fragment.querySelector(".manga-cover").src = work.cover;
  fragment.querySelector(".manga-cover").alt = `Cover of ${title}`;
  fragment.querySelector(".manga-genre").textContent = "";
  fragment.querySelector("h1").textContent = title;
  fragment.querySelector(".manga-test-note").textContent = displayTestNote(work);
  fragment.querySelector(".manga-test-note").hidden = !work.testNote;
  fragment.querySelector(".manga-description").textContent = displayDescription(work);
  fragment.querySelector(".chapter-count").textContent = `${work.chapters.length} chapter${work.chapters.length === 1 ? "" : "s"}`;

  fragment.querySelector(".manga-badges").innerHTML = `
    <span>${escapeHtml(displayValue(work.status))}</span>
    <span>${escapeHtml(displayValue(work.rating))}</span>
    <span>${work.chapters.length} chapter${work.chapters.length === 1 ? "" : "s"}</span>
  `;

  fragment.querySelector(".manga-actions").innerHTML = `
    <a class="button primary" href="${chapterUrl(work, 0)}">Read first chapter</a>
    <a class="button secondary" href="${chapterUrl(work, work.chapters.length - 1)}">Latest chapter</a>
  `;

  fragment.querySelector(".manga-facts").innerHTML = `
    <h2>Information</h2>
    <dl>
      <div class="fact-author"><dt>Author</dt><dd>KapiTomo</dd></div>
      <div class="fact-genre"><dt>Genre</dt><dd>${escapeHtml(displayValue(work.genre))}</dd></div>
      <div class="fact-status"><dt>Status</dt><dd>${escapeHtml(displayValue(work.status))}</dd></div>
      <div class="fact-rating"><dt>Rating</dt><dd>${escapeHtml(displayValue(work.rating))}</dd></div>
      <div class="fact-publish"><dt>Publication</dt><dd>Official KapiTomo works</dd></div>
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
    count.textContent = `${chapterItems.length} of ${work.chapters.length}`;
  }

  const sortToggle = workView.querySelector("[data-chapter-sort-toggle]");
  if (sortToggle) {
    sortToggle.textContent = chapterUiState.sort === "desc" ? "Latest" : "Start";
    sortToggle.setAttribute("aria-label", chapterUiState.sort === "desc" ? "Sorted by latest chapters" : "Sorted from the start");
  }

  if (!chapterItems.length) {
    list.innerHTML = '<p class="chapter-search-empty">No chapters found.</p>';
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
  const paragraphs = getChapterParagraphs(chapter);
  const isNovel = chapter.contentType === "novel";
  const isImageChapter = chapter.contentType === "images";
  const workTitle = displayTitle(work);

  fragment.querySelector(".back-link").href = workUrl(work);
  fragment.querySelector(".eyebrow").textContent = workTitle;
  fragment.querySelector("h1").textContent = isNovel ? getChapterNumberLabel(safeIndex) : displayChapterTitle(chapter, safeIndex);
  fragment.querySelector(".chapter-tools").innerHTML = `
    ${previousIndex === null ? '<span class="button ghost disabled">Previous</span>' : `<a class="button secondary" href="${chapterUrl(work, previousIndex)}">Previous</a>`}
    <a class="button secondary" href="${workUrl(work)}">Chapter list</a>
    ${nextIndex === null ? '<span class="button ghost disabled">Next</span>' : `<a class="button primary" href="${chapterUrl(work, nextIndex)}">Next</a>`}
  `;

  if (isNovel) {
    page.classList.add("novel-page");
    fragment.querySelector(".webtoon-strip").className = "novel-reader";
    fragment.querySelector(".novel-reader").innerHTML = paragraphs
      .map((paragraph) => `<p>${paragraph}</p>`)
      .join("");
  } else if (isImageChapter) {
    const imagePages = getChapterImages(chapter);
    page.classList.add("image-chapter-page");
    fragment.querySelector(".webtoon-strip").className = "image-reader";
    fragment.querySelector(".image-reader").innerHTML = imagePages
      .map((image, index) => `<img src="${image.src}" alt="${image.alt || `${displayChapterTitle(chapter, safeIndex)} page ${index + 1}`}" loading="lazy">`)
      .join("");
  } else {
    fragment.querySelector(".webtoon-strip").innerHTML = [
      `<section class="webtoon-cover-panel"><img src="${work.cover}" alt="Cover of ${escapeHtml(workTitle)}"><div><span>${escapeHtml(workTitle)}</span><strong>${escapeHtml(displayChapterTitle(chapter, safeIndex))}</strong></div></section>`,
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
    <a class="button secondary" href="${workUrl(work)}">Back to ${escapeHtml(workTitle)}</a>
    ${nextIndex === null ? "" : `<a class="button primary" href="${chapterUrl(work, nextIndex)}">Read next chapter</a>`}
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

if (query) {
  searchInput.value = query;
}

window.addEventListener("hashchange", handleRoute);

renderWorks();
handleRoute();
