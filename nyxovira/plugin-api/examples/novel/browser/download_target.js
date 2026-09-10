(function () {
  const title = document.querySelector("[data-work-title], h1")?.textContent?.trim();
  const chapters = [...document.querySelectorAll("[data-chapter-id]")].map((node, index) => ({
    id: String(node.dataset.chapterId),
    number: String(node.dataset.chapterNumber || index + 1),
    title: node.dataset.chapterTitle || node.textContent.trim(),
    label: node.dataset.chapterTitle || node.textContent.trim(),
    url: new URL(node.dataset.chapterUrl || location.href, location.href).href,
    contentType: "novel",
    paragraphs: [...node.querySelectorAll("[data-paragraph]")].map((paragraph) => paragraph.textContent.trim()).filter(Boolean)
  }));
  if (!title || !chapters.length || chapters.some((chapter) => !chapter.id || !chapter.paragraphs.length)) {
    throw new Error("The mapped novel did not resolve a title, stable IDs, and paragraphs.");
  }
  window.__nyxoviraChapterPlan = JSON.stringify({ title, canonicalUrl: location.href, chapters });
  return location.href;
})();
