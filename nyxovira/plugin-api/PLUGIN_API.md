# Nyxovira Plugin API

Este guia mostra como criar um addon de fonte para o Nyxovira.

Um addon adapta uma fonte online ao app. Ele informa qual pagina abrir, como reconhecer uma obra, como traduzir rotas e campos da fonte, como listar capitulos e como baixar novels ou quadrinhos para leitura offline.

O KapiTomo e usado nesta documentacao como exemplo completo. A mesma estrutura serve para outras fontes quando o addon descreve manualmente o formato usado por cada uma.

Ao final, o addon deve permitir este fluxo:

1. O usuario abre a fonte dentro do navegador do Nyxovira.
2. O usuario entra em uma obra.
3. O usuario toca em baixar.
4. O addon identifica a obra aberta.
5. O app mostra a lista de capitulos.
6. O app baixa texto ou imagens e salva a obra offline.

## Arquivos do addon

Um addon tem esta estrutura:

| Arquivo | Funcao |
| --- | --- |
| `plugin.json` | Define nome, versao, dominio, pagina inicial e parser da fonte. |
| `browser/download_target.js` | Roda dentro da pagina aberta e informa ao app qual obra deve ser baixada. |

Exemplo de pasta:

| Caminho | Tipo |
| --- | --- |
| `minha-fonte/plugin.json` | Manifesto do addon |
| `minha-fonte/browser/download_target.js` | Script executado no navegador |

## plugin.json

Este arquivo e o manifesto do addon.

Exemplo completo:

```json
{
  "schema_version": 1,
  "id": "minha-fonte",
  "name": "Minha Fonte",
  "version": "1.0.0",
  "match": {
    "hosts": ["example.com"]
  },
  "browser": {
    "home_url": "https://example.com/",
    "icon_url": "https://example.com/icon.png",
    "icon_mode": "pinned",
    "short_label": "Fonte",
    "download_target_script_file": "browser/download_target.js"
  },
  "parser": {
    "adapter": "html_series",
    "base_url": "https://example.com",
    "static_works_script": "https://example.com/data/works.js",
    "base_path_prefix": "",
    "series_path_prefix": "manga",
    "hash_series_path_prefixes": ["obra", "ler"],
    "chapter_path_prefix": "chapter",
    "chapter_slug_pattern": ".+"
  }
}
```

Campos principais:

| Campo | O que colocar |
| --- | --- |
| `id` | Identificador fixo do addon. Use letras minusculas, numeros e hifen. |
| `name` | Nome exibido no app. |
| `version` | Versao do addon. Aumente quando publicar uma correcao. |
| `match.hosts` | Dominios que este addon reconhece. |
| `browser.home_url` | Pagina inicial aberta no navegador do app. |
| `browser.download_target_script_file` | Caminho do script que identifica a obra aberta. |
| `parser.adapter` | Tipo de fonte. Para sites simples ou indice em JS, use `html_series`. |
| `parser.base_url` | URL base usada para resolver links relativos. |
| `parser.static_works_script` | Arquivo JavaScript publico que contem as obras, quando a fonte usa esse modelo. |

## Rotas e campos da fonte

Cada site pode usar nomes diferentes para a mesma coisa. Um site pode chamar obra de `obra`, outro de `title`, outro de `series`. O addon deve traduzir esses nomes para o formato do Nyxovira.

Use um objeto de configuracao dentro de `download_target.js`:

```js
var addon = {
  siteBaseUrl: "https://example.com",
  sourceVariable: "SOURCE_WORKS",
  sourceRoutes: {
    work: "obra",
    read: "ler"
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
  }
};
```

Neste exemplo:

| No site | No Nyxovira |
| --- | --- |
| `#obra/minha-obra` | `https://example.com/manga/minha-obra/` |
| `#ler/minha-obra/0` | `https://example.com/manga/minha-obra/chapter/0/` |
| `description` | `summary` da obra |
| `paragraphs` | texto de novel |
| `pages` ou `images[].src` | paginas de quadrinho |

## download_target.js

Este script e executado quando o usuario toca em baixar no navegador do Nyxovira.

Ele deve retornar a URL da obra. Se a pagina ja tem os capitulos disponiveis, ele tambem deve preencher `window.__nyxoviraChapterPlan`.

Exemplo generico:

```js
(function () {
  try {
    var addon = {
      siteBaseUrl: "https://example.com",
      sourceVariable: "SOURCE_WORKS",
      sourceRoutes: { work: "obra", read: "ler" },
      nyxoviraRoutes: { series: "manga", chapter: "chapter" },
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
      }
    };

    function text(value) {
      return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    }

    function field(object, name) {
      return object && name ? object[name] : "";
    }

    function workUrl(workId) {
      return addon.siteBaseUrl + "/" + addon.nyxoviraRoutes.series + "/" + encodeURIComponent(workId) + "/";
    }

    function chapterUrl(workId, chapterIndex) {
      return workUrl(workId) + addon.nyxoviraRoutes.chapter + "/" + encodeURIComponent(String(chapterIndex)) + "/";
    }

    function currentWorkId() {
      var hash = String(location.hash || "").replace(/^#\/?/, "");
      var workMatch = hash.match(new RegExp("^" + addon.sourceRoutes.work + "\\/([^\\/?#]+)$", "i"));
      var readMatch = hash.match(new RegExp("^" + addon.sourceRoutes.read + "\\/([^\\/?#]+)(?:\\/[^\\/?#]+)?$", "i"));
      if (workMatch) return decodeURIComponent(workMatch[1]);
      if (readMatch) return decodeURIComponent(readMatch[1]);

      var pathMatch = String(location.pathname || "").match(new RegExp("\\/" + addon.nyxoviraRoutes.series + "\\/([^\\/?#]+)", "i"));
      return pathMatch ? decodeURIComponent(pathMatch[1]) : "";
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

    function imagePages(chapter) {
      var output = [];
      var seen = {};
      var pages = field(chapter, addon.fields.chapterPages);
      var images = field(chapter, addon.fields.chapterImages);

      function add(value) {
        var source = text(value);
        if (source && !seen[source]) {
          seen[source] = true;
          output.push(source);
        }
      }

      if (Array.isArray(pages)) {
        pages.forEach(function (page) {
          if (typeof page === "string") add(page);
          else if (page) add(page.url || page[addon.fields.imageSource]);
        });
      }

      if (Array.isArray(images)) {
        images.forEach(function (image) {
          if (typeof image === "string") add(image);
          else if (image) add(image[addon.fields.imageSource] || image.url);
        });
      }

      return output;
    }

    function installChapterPlan(work) {
      var workId = text(field(work, addon.fields.workId));
      var chapters = field(work, addon.fields.workChapters);
      if (!workId || !Array.isArray(chapters) || !chapters.length) return "";

      var plan = {
        title: text(field(work, addon.fields.workTitle)) || workId,
        summary: text(field(work, addon.fields.workSummary)),
        canonicalUrl: workUrl(workId),
        coverUrl: text(field(work, addon.fields.workCover)),
        chapters: chapters.map(function (chapter, index) {
          var title = text(field(chapter, addon.fields.chapterTitle)) || ("Capitulo " + (index + 1));
          var paragraphs = field(chapter, addon.fields.chapterParagraphs);
          return {
            id: "id:" + index,
            number: String(index + 1),
            title: title,
            contentType: text(field(chapter, addon.fields.chapterContentType)),
            paragraphs: Array.isArray(paragraphs) ? paragraphs : [],
            pages: imagePages(chapter),
            url: chapterUrl(workId, index),
            index: index
          };
        })
      };

      window.__nyxoviraChapterPlan = JSON.stringify(plan);
      return plan.canonicalUrl;
    }

    var workId = currentWorkId();
    if (!workId) return "";

    var work = workById(workId);
    return work ? installChapterPlan(work) : workUrl(workId);
  } catch (error) {
    return "";
  }
})()
```

## chapterPlan

`chapterPlan` e a lista pronta que o app usa para abrir a selecao de capitulos.

Formato:

```json
{
  "title": "Minha Obra",
  "summary": "Resumo curto da obra.",
  "canonicalUrl": "https://example.com/manga/minha-obra/",
  "coverUrl": "https://example.com/capas/minha-obra.png",
  "chapters": [
    {
      "id": "id:0",
      "number": "1",
      "title": "Capitulo 01",
      "contentType": "novel",
      "paragraphs": ["Primeiro paragrafo.", "Segundo paragrafo."],
      "pages": [],
      "url": "https://example.com/manga/minha-obra/chapter/0/",
      "index": 0
    }
  ]
}
```

## Novel

Para novel, envie `contentType: "novel"` e `paragraphs`.

```json
{
  "id": "id:0",
  "number": "1",
  "title": "Capitulo 01 - A Queda",
  "contentType": "novel",
  "paragraphs": [
    "Primeiro paragrafo.",
    "Segundo paragrafo.",
    "Terceiro paragrafo."
  ],
  "url": "https://example.com/manga/minha-obra/chapter/0/"
}
```

O app salva offline assim:

```json
{
  "title": "Capitulo 01 - A Queda",
  "paragraphs": [
    "Primeiro paragrafo.",
    "Segundo paragrafo.",
    "Terceiro paragrafo."
  ]
}
```

## Quadrinho

Para quadrinho, envie `contentType: "images"` e `pages` com URLs diretas das imagens.

```json
{
  "id": "id:0",
  "number": "1",
  "title": "Capitulo 001",
  "contentType": "images",
  "pages": [
    "https://example.com/obra/capitulo-001/page-001.png",
    "https://example.com/obra/capitulo-001/page-002.png"
  ],
  "url": "https://example.com/manga/minha-obra/chapter/0/"
}
```

Quando `pages` esta no `chapterPlan`, o Nyxovira baixa essas imagens diretamente.

## Adaptadores

| Adapter | Quando usar |
| --- | --- |
| `html_series` | Fonte com paginas HTML, indice publico ou arquivo JS com obras. |
| `aes_json_api` | Fonte com API JSON e rotas configuraveis. |
| `next_payload` | Fonte que expoe dados em payload Next.js. |

## Publicacao

Antes de publicar:

1. Aumente `plugin.json.version`.
2. Confirme `match.hosts`.
3. Confirme `browser.home_url`.
4. Teste `download_target.js` em uma pagina de obra.
5. Confirme `chapterPlan.title`, `summary`, `canonicalUrl`, `coverUrl` e `chapters`.
6. Em novel, confirme que `paragraphs` tem varios itens separados.
7. Em quadrinho, confirme que `pages` tem URLs diretas de imagem.
8. Gere o zip do addon.
9. Atualize o `sha256` no catalogo de plugins.
10. Teste download do primeiro, do meio e do ultimo capitulo.
