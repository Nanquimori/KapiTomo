(function () {
  try {
    var addon = {
      siteBaseUrl: "https://nanquimori.github.io/KapiTomo",
      sourceVariable: "KAPI_TOMO_WORKS",
      sourceRoutes: {
        work: "work",
        read: "read"
      },
      nyxoviraRoutes: {
        series: "manga",
        chapter: "chapter"
      },
      fields: {
        workId: "id",
        workTitle: "title",
        workSummary: "description",
        workCover: "cover",
        workChapters: "chapters",
        chapterTitle: "title",
        chapterContentType: "contentType",
        chapterParagraphs: "paragraphs",
        chapterPages: "pages",
        chapterImages: "images",
        imageSource: "src"
      },
      labels: {
        chapter: "Chapter"
      }
    };

    function text(value) {
      return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    }

    function warn(message) {
      try {
        if (typeof console !== "undefined" && console.error) {
          console.error("[KapiTomo addon] " + message);
        }
      } catch (ignored) {}
    }

    function field(object, name) {
      return object && name ? object[name] : "";
    }

    function numberFromTitle(title, fallback) {
      var match = text(title).match(/(\d+(?:[.,]\d+)?)/);
      return match ? match[1].replace(",", ".") : String(fallback);
    }

    function isImageContent(chapter) {
      var type = text(field(chapter, addon.fields.chapterContentType)).toLowerCase();
      return type === "images" || type === "image" || type === "comic" || type === "manga";
    }

    function imagePages(chapter) {
      var output = [];
      var seen = {};
      var directPages = field(chapter, addon.fields.chapterPages);
      var imageObjects = field(chapter, addon.fields.chapterImages);

      function add(value) {
        var source = text(value);
        if (source && /^https?:\/\//i.test(source) && !seen[source]) {
          seen[source] = true;
          output.push(source);
        }
      }

      if (Array.isArray(directPages)) {
        directPages.forEach(function (page) {
          if (typeof page === "string") {
            add(page);
          } else if (page && typeof page === "object") {
            add(page.url || page[addon.fields.imageSource]);
          }
        });
      }

      if (Array.isArray(imageObjects)) {
        imageObjects.forEach(function (image) {
          if (typeof image === "string") {
            add(image);
          } else if (image && typeof image === "object") {
            add(image[addon.fields.imageSource] || image.url);
          }
        });
      }

      return output;
    }

    function publicWorkUrl(workId) {
      return addon.siteBaseUrl + "/" + addon.nyxoviraRoutes.series + "/" + encodeURIComponent(workId) + "/";
    }

    function publicChapterUrl(workId, chapterIndex) {
      return publicWorkUrl(workId) + addon.nyxoviraRoutes.chapter + "/" + encodeURIComponent(String(chapterIndex)) + "/";
    }

    function currentWorkId() {
      var path = String(location.pathname || "").replace(/\/index\.html$/i, "").replace(/\/+$/g, "");
      var publicPattern = new RegExp("\\/" + addon.nyxoviraRoutes.series + "\\/([^\\/?#]+)", "i");
      var publicMatch = path.match(publicPattern);
      if (publicMatch) return decodeURIComponent(publicMatch[1]);

      var hash = String(location.hash || "").replace(/^#\/?/, "");
      var workPattern = new RegExp("^" + addon.sourceRoutes.work + "\\/([^\\/?#]+)$", "i");
      var readPattern = new RegExp("^" + addon.sourceRoutes.read + "\\/([^\\/?#]+)(?:\\/[^\\/?#]+)?$", "i");
      var workMatch = hash.match(workPattern);
      if (workMatch) return decodeURIComponent(workMatch[1]);
      var readMatch = hash.match(readPattern);
      if (readMatch) return decodeURIComponent(readMatch[1]);
      return "";
    }

    function works() {
      var value = window[addon.sourceVariable];
      return Array.isArray(value) ? value : [];
    }

    function workById(workId) {
      var list = works();
      for (var index = 0; index < list.length; index++) {
        if (text(field(list[index], addon.fields.workId)) === workId) {
          return list[index];
        }
      }
      return null;
    }

    function installChapterPlan(work) {
      var workId = text(field(work, addon.fields.workId));
      var chapters = field(work, addon.fields.workChapters);
      if (!workId || !Array.isArray(chapters) || !chapters.length) {
        return "";
      }

      var canonicalUrl = publicWorkUrl(workId);
      var plan = {
        title: text(field(work, addon.fields.workTitle)) || workId,
        summary: text(field(work, addon.fields.workSummary)),
        canonicalUrl: canonicalUrl,
        coverUrl: text(field(work, addon.fields.workCover)),
        chapters: chapters.map(function (chapter, index) {
          var title = text(field(chapter, addon.fields.chapterTitle)) || (addon.labels.chapter + " " + (index + 1));
          var number = numberFromTitle(title, index + 1);
          var type = text(field(chapter, addon.fields.chapterContentType));
          var imageChapter = isImageContent(chapter);
          var rawParagraphs = field(chapter, addon.fields.chapterParagraphs);
          var paragraphs = !imageChapter && Array.isArray(rawParagraphs)
            ? rawParagraphs.map(text).filter(Boolean)
            : [];
          var pages = imageChapter ? imagePages(chapter) : [];
          if (!paragraphs.length && !pages.length) {
            warn("Chapter without downloadable content: " + title);
            return null;
          }
          return {
            id: "id:" + index,
            number: number,
            title: title,
            contentType: imageChapter ? "images" : (type || "novel"),
            paragraphs: paragraphs,
            pages: pages,
            label: addon.labels.chapter + " " + number + " - " + title,
            url: publicChapterUrl(workId, index),
            index: index
          };
        }).filter(Boolean)
      };

      if (!plan.chapters.length) {
        warn("No valid chapters in chapterPlan for work: " + workId);
        return "";
      }

      window.__nyxoviraChapterPlan = JSON.stringify(plan);
      if (location.pathname !== new URL(canonicalUrl).pathname && history && history.replaceState) {
        history.replaceState(history.state, document.title, canonicalUrl);
      }
      return canonicalUrl;
    }

    var workId = currentWorkId();
    if (!workId) return "";

    var work = workById(workId);
    if (!work) return publicWorkUrl(workId);

    return installChapterPlan(work);
  } catch (error) {
    return "";
  }
})()
