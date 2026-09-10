(function () {
  const absolute = (value) => new URL(value, location.href).href;
  const title = document.querySelector("[data-work-title], h1")?.textContent?.trim();
  const chapters = [...document.querySelectorAll("a[data-chapter-id]")].map((link, index) => ({
    id: String(link.dataset.chapterId),
    number: String(link.dataset.chapterNumber || index + 1),
    title: link.textContent.trim(),
    label: link.textContent.trim(),
    url: absolute(link.href),
    contentType: "images",
    pages: JSON.parse(link.dataset.pages || "[]").map(absolute)
  }));
  if (!title || !chapters.length || chapters.some((chapter) => !chapter.id || !chapter.pages.length)) {
    throw new Error("The mapped manga did not resolve a title, stable IDs, and image pages.");
  }
  window.__nyxoviraChapterPlan = JSON.stringify({ title, canonicalUrl: location.href, chapters });
  return location.href;
})();
