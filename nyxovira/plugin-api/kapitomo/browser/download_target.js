(function () {
  try {
    var addon = {
      siteBaseUrl: "https://nanquimori.github.io/KapiTomo",
      sourceVariable: "KAPI_TOMO_WORKS",
      sourceRoutes: {
        detailsHash: "work",
        readerHash: "read"
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
      languageStorageKey: "kapitomo.siteLanguage.v1",
      labels: {
        en: {
          chapter: "Chapter"
        },
        pt: {
          chapter: "Cap\u00edtulo"
        }
      },
      localized: {
        pt: {
          works: {
            "world-without-humans": {
              title: "O Mundo Sem Humanos",
              summary: "Aos 14 anos, Caio acorda em um mundo sem humanos, onde drag\u00f5es, goblins e elfos atacam qualquer estranho. Para voltar vivo, ele precisa aprender a sobreviver sem virar her\u00f3i.",
              description: "Aos 14 anos, Caio acorda em um mundo sem humanos, onde drag\u00f5es, goblins e elfos atacam qualquer estranho. Para voltar vivo, ele precisa aprender a sobreviver sem virar her\u00f3i.",
              chapterTitles: [
                "Cap\u00edtulo 01 - A Queda",
                "Cap\u00edtulo 02 - A Floresta que Ca\u00e7a",
                "Cap\u00edtulo 03 - A Sa\u00edda de Pedra"
              ]
            },
            "world-without-humans-comics": {
              title: "O Mundo Sem Humanos: Quadrinhos",
              summary: "Vers\u00e3o em quadrinhos de O Mundo Sem Humanos, contada por p\u00e1ginas ilustradas.",
              description: "Vers\u00e3o em quadrinhos de O Mundo Sem Humanos, contada por p\u00e1ginas ilustradas.",
              chapterTitles: [
                "Cap\u00edtulo 001",
                "Cap\u00edtulo 002",
                "Cap\u00edtulo 003"
              ]
            }
          }
        }
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

    function normalizeLanguage(value) {
      var language = text(value).toLowerCase();
      return language.indexOf("pt") === 0 || language.indexOf("portugu") === 0 ? "pt" : "en";
    }

    function detectLanguage() {
      try {
        var queryLanguage = text(new URLSearchParams(location.search || "").get("lang"));
        if (queryLanguage) return normalizeLanguage(queryLanguage);
      } catch (ignored) {}
      try {
        var storedLanguage = text(localStorage.getItem(addon.languageStorageKey));
        if (storedLanguage) return normalizeLanguage(storedLanguage);
      } catch (ignored) {}
      try {
        var pageLanguage = text(document.documentElement.getAttribute("lang"));
        if (pageLanguage) return normalizeLanguage(pageLanguage);
      } catch (ignored) {}
      var candidates = [];
      try {
        if (navigator.languages && navigator.languages.length) {
          candidates = candidates.concat(Array.prototype.slice.call(navigator.languages));
        }
        candidates.push(navigator.language);
      } catch (ignored) {}

      for (var index = 0; index < candidates.length; index++) {
        if (normalizeLanguage(candidates[index]) === "pt") {
          return "pt";
        }
      }
      return "en";
    }

    function labelsFor(language) {
      return addon.labels[language] || addon.labels.en;
    }

    function localizedWorkCopy(workId, language) {
      var localizedLanguage = addon.localized[language];
      var localizedWorks = localizedLanguage && localizedLanguage.works;
      return localizedWorks && localizedWorks[workId] ? localizedWorks[workId] : {};
    }

    function numberFromTitle(title, fallback) {
      var match = text(title).match(/(\d+(?:[.,]\d+)?)/);
      return match ? match[1].replace(",", ".") : String(fallback);
    }

    function padChapterNumber(number) {
      var value = text(number);
      return /^\d+$/.test(value) && value.length < 2 ? "0" + value : value;
    }

    function chapterTitleHasNumber(title) {
      return /^(chapter|cap[i\u00ed]tulo)\s*\d+(?:[.,]\d+)?\b/i.test(text(title));
    }

    function localizedChapterTitle(workId, chapter, index, language) {
      var copy = localizedWorkCopy(workId, language);
      if (Array.isArray(copy.chapterTitles) && copy.chapterTitles[index]) {
        return text(copy.chapterTitles[index]);
      }
      return text(field(chapter, addon.fields.chapterTitle)) || (labelsFor(language).chapter + " " + padChapterNumber(index + 1));
    }

    function chapterLabel(title, number, language) {
      var cleanTitle = text(title);
      if (chapterTitleHasNumber(cleanTitle)) {
        return cleanTitle;
      }
      return labelsFor(language).chapter + " " + padChapterNumber(number) + (cleanTitle ? " - " + cleanTitle : "");
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

    function publicWorkUrl(workId, language) {
      var url = addon.siteBaseUrl + "/" + addon.nyxoviraRoutes.series + "/" + encodeURIComponent(workId) + "/";
      return language === "pt" ? url + "?lang=pt" : url;
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
      var workPattern = new RegExp("^" + addon.sourceRoutes.detailsHash + "\\/([^\\/?#]+)$", "i");
      var readPattern = new RegExp("^" + addon.sourceRoutes.readerHash + "\\/([^\\/?#]+)(?:\\/[^\\/?#]+)?$", "i");
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

    function installChapterPlan(work, language) {
      var workId = text(field(work, addon.fields.workId));
      var chapters = field(work, addon.fields.workChapters);
      if (!workId || !Array.isArray(chapters) || !chapters.length) {
        return "";
      }

      var copy = localizedWorkCopy(workId, language);
      var canonicalUrl = publicWorkUrl(workId, language);
      var plan = {
        title: text(copy.title) || text(field(work, addon.fields.workTitle)) || workId,
        summary: text(copy.summary) || text(copy.description) || text(field(work, addon.fields.workSummary)),
        canonicalUrl: canonicalUrl,
        coverUrl: text(field(work, addon.fields.workCover)),
        chapters: chapters.map(function (chapter, index) {
          var title = localizedChapterTitle(workId, chapter, index, language);
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
            label: chapterLabel(title, number, language),
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
      var canonicalLocation = new URL(canonicalUrl);
      if ((location.pathname !== canonicalLocation.pathname || location.search !== canonicalLocation.search) && history && history.replaceState) {
        history.replaceState(history.state, document.title, canonicalUrl);
      }
      return canonicalUrl;
    }

    var language = detectLanguage();
    var workId = currentWorkId();
    if (!workId) return "";

    var work = workById(workId);
    if (!work) return publicWorkUrl(workId, language);

    return installChapterPlan(work, language);
  } catch (error) {
    return "";
  }
})()
