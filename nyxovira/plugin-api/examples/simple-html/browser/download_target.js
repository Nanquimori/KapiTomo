(function () {
  const absolute = (value) => new URL(value, location.href).href;
  const title = document.querySelector("[data-work-title], h1")?.textContent?.trim();
  const chapterLinks = [...document.querySelectorAll("[data-chapter-id][href]")];
  if (!title || !chapterLinks.length) throw new Error("Work title or chapters were not found in the mapped HTML.");
  const chapters = chapterLinks.map((link, index) => ({
    id: String(link.dataset.chapterId),
    number: String(link.dataset.chapterNumber || index + 1),
    title: link.textContent.trim(),
    label: link.textContent.trim(),
    url: absolute(link.getAttribute("href")),
    contentType: "images"
  }));
  window.__nyxoviraChapterPlan = JSON.stringify({ title, canonicalUrl: location.href, chapters });
  window.__nyxoviraPrepareDownloadPlan = function ({ selectedChapterIds, chapterPlan }) {
    chapterPlan.chapters.forEach((chapter) => {
      if (!selectedChapterIds.includes(chapter.id)) return;
      const payload = document.querySelector(`script[data-pages-for="${CSS.escape(chapter.id)}"]`);
      chapter.pages = JSON.parse(payload?.textContent || "[]").map(absolute);
      if (!chapter.pages.length) throw new Error(`No pages resolved for ${chapter.id}.`);
    });
    return chapterPlan;
  };
  return location.href;
})();
