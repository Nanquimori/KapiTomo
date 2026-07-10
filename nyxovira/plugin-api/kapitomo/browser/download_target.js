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
              ],
              chapterParagraphs: [
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

    function localizedChapterParagraphs(workId, index, language) {
      var copy = localizedWorkCopy(workId, language);
      var chapters = copy.chapterParagraphs;
      if (Array.isArray(chapters) && Array.isArray(chapters[index])) {
        return chapters[index].map(text).filter(Boolean);
      }
      return [];
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
          var localizedParagraphs = imageChapter ? [] : localizedChapterParagraphs(workId, index, language);
          var rawParagraphs = field(chapter, addon.fields.chapterParagraphs);
          var paragraphs = localizedParagraphs.length
            ? localizedParagraphs
            : (!imageChapter && Array.isArray(rawParagraphs) ? rawParagraphs.map(text).filter(Boolean) : []);
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
