(function () {
  const slug = location.pathname.split("/").filter(Boolean).pop();
  if (!slug) throw new Error("The mapped work slug is missing.");
  const getJson = (url) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.withCredentials = true;
    request.send();
    if (request.status < 200 || request.status >= 300) throw new Error(`API HTTP ${request.status}.`);
    return JSON.parse(request.responseText);
  };
  const work = getJson(`/api/works/${encodeURIComponent(slug)}`);
  const chapters = work.chapters.map((chapter) => ({ id: String(chapter.id), number: String(chapter.number), title: chapter.title, label: chapter.title, url: new URL(`/read/${chapter.id}`, location.origin).href, contentType: "images" }));
  const plan = { title: work.title, summary: work.summary || "", canonicalUrl: location.href, chapters };
  window.__nyxoviraChapterPlan = JSON.stringify(plan);
  window.__nyxoviraPrepareDownloadPlan = function ({ selectedChapterIds, chapterPlan }) {
    chapterPlan.chapters.forEach((chapter) => {
      if (!selectedChapterIds.includes(chapter.id)) return;
      const data = getJson(`/api/chapters/${encodeURIComponent(chapter.id)}`);
      chapter.pages = data.pages.map((page) => typeof page === "string" ? page : page.url);
      if (!chapter.pages.length) throw new Error(`No pages resolved for ${chapter.id}.`);
    });
    return chapterPlan;
  };
  return location.href;
})();
