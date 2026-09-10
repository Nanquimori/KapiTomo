(function () {
  const bootstrap = document.querySelector("script[data-work-bootstrap]");
  if (!bootstrap) throw new Error("The mapped bootstrap payload was not found.");
  const data = JSON.parse(bootstrap.textContent);
  const chapters = data.chapters.map((chapter) => ({
    id: String(chapter.id),
    number: String(chapter.number),
    title: chapter.title,
    label: chapter.title,
    url: new URL(`/read/${chapter.id}`, location.origin).href,
    contentType: "images"
  }));
  if (!data.title || !chapters.length) throw new Error("The encrypted source bootstrap did not resolve the work.");
  window.__nyxoviraChapterPlan = JSON.stringify({ title: data.title, summary: data.summary || "", canonicalUrl: location.href, chapters });
  return location.href;
})();
