# Nyxovira Plugin API

Este guia mostra como criar um addon de fonte para o Nyxovira.

Um addon adapta uma fonte online ao app. Ele informa qual página abrir, como reconhecer uma obra, como traduzir rotas e campos da fonte, como listar capítulos e como baixar novels ou quadrinhos para leitura offline.

O KapiTomo é usado nesta documentação como exemplo completo. A mesma estrutura serve para outras fontes quando o addon descreve manualmente o formato usado por cada uma.

Ao final, o addon deve permitir este fluxo:

1. O usuário abre a fonte dentro do navegador do Nyxovira.
2. O usuário entra em uma obra.
3. O usuário toca em baixar.
4. O addon identifica a obra aberta.
5. O app mostra a lista de capítulos.
6. O app baixa texto ou imagens e salva a obra offline.

## Arquivos do addon

Comece criando uma pasta com o id da fonte. Dentro dela ficam o manifesto e o script do navegador.

```text
minha-fonte/
|-- plugin.json
`-- browser/
    `-- download_target.js
```

Use o mesmo id no nome da pasta e no campo `id` do manifesto. O app procura o `plugin.json` nessa raiz e carrega o script em `browser/download_target.js`.

| Arquivo | Função |
| --- | --- |
| `plugin.json` | Define nome, versão, domínio, página inicial e parser da fonte. |
| `browser/download_target.js` | Roda dentro da página aberta e informa ao app qual obra deve ser baixada. |

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
| `id` | Identificador fixo do addon. Use letras minúsculas, números e hífen. |
| `name` | Nome exibido no app. |
| `version` | Versão do addon. Aumente quando publicar uma correção. |
| `match.hosts` | Domínios que este addon reconhece. |
| `browser.home_url` | Página inicial aberta no navegador do app. |
| `browser.download_target_script_file` | Caminho do script que identifica a obra aberta. |
| `parser.adapter` | Tipo de fonte. Para sites simples ou índice em JS, use `html_series`. |
| `parser.base_url` | URL base usada para montar links relativos. |
| `parser.static_works_script` | Arquivo JavaScript público que contem as obras, quando a fonte usa esse modelo. |

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
| `pages` ou `images[].src` | páginas de quadrinho |

## download_target.js

Este script é executado quando o usuário toca em baixar no navegador do Nyxovira.

Ele deve retornar a URL da obra. Se a página já tem os capítulos disponíveis, ele também deve preencher `window.__nyxoviraChapterPlan`.

Exemplo genérico:

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
          var title = text(field(chapter, addon.fields.chapterTitle)) || ("Capítulo " + (index + 1));
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

## Fluxo do download no app

Quando o usuário toca em baixar, o Nyxovira executa o `download_target.js` da fonte dentro da página aberta no WebView.

O script deve fazer duas coisas:

1. Retornar a URL canônica da obra.
2. Preencher `window.__nyxoviraChapterPlan` com um JSON valido contendo `chapters`.

Se `window.__nyxoviraChapterPlan` já existe e tem capítulos, o app abre a seleção de download imediatamente, sem esperar uma busca no HTML ou uma chamada extra da engine.

Se o plano não existe, está vazio ou não tem `chapters`, o app tenta preparar a lista por outros meios e pode mostrar a mensagem: `A fonte ainda está preparando os dados dos capítulos. Tente baixar novamente em instantes.`

Para o download também ser direto depois da seleção, coloque o conteúdo no próprio plano ou prepare o plano no addon depois da confirmação:

| Tipo | Campo no capítulo | Resultado |
| --- | --- | --- |
| Novel | `paragraphs` | O app salva o JSON offline com parágrafos separados. |
| Quadrinho | `pages` ou `images` | O app baixa as imagens diretamente. |
| Preparo no addon | `window.__nyxoviraPrepareDownloadPlan` | O app mostra a lista agora; depois que o usuário confirma, o addon preenche os capítulos selecionados. |

Antes de preencher `window.__nyxoviraChapterPlan`, valide cada capítulo no addon:

| Caso | O addon deve fazer |
| --- | --- |
| Novel sem `paragraphs` | Não inclua o capítulo no plano e registre `console.error(...)`. |
| Quadrinho sem `pages`/`images` no plano final | Não inicie o download desse capítulo e registre `console.error(...)`. |
| Plano sem capítulos válidos | Não preencha `window.__nyxoviraChapterPlan`; retorne vazio ou a URL canônica para o app tentar outro parser. |

Isso evita a lista aparecer com capítulos que somem na preparação do download.

## Preparo após confirmar

Use `window.__nyxoviraPrepareDownloadPlan` quando a obra tem a lista em um endpoint rápido, mas o conteúdo real precisa ser carregado capítulo por capítulo. Essa função roda no WebView depois que o usuário confirma a seleção e antes do engine iniciar o pacote offline.

Exemplo comum:

| Endpoint | Conteúdo |
| --- | --- |
| `/api/manga/minha-obra` | Lista de capítulos, ids e títulos. |
| `/api/chapter/123` | Páginas reais do capítulo. |

Nesse caso, o `chapterPlan` inicial pode ter somente metadados:

```json
{
  "id": "id:123",
  "number": "12",
  "title": "Capítulo 12",
  "contentType": "images",
  "url": "https://example.com/manga/minha-obra/chapter/12/",
  "apiPath": "/api/chapter/123"
}
```

Depois, o addon prepara apenas os capítulos selecionados:

```js
window.__nyxoviraPrepareDownloadPlan = function (context) {
  var selected = context.selectedChapterIds;
  var plan = context.chapterPlan;

  plan.chapters.forEach(function (chapter) {
    if (selected.indexOf(chapter.id) < 0) return;
    var payload = carregarDadosDoCapitulo(chapter.apiPath);
    chapter.pages = payload.pages;
  });

  return plan;
};
```

O app não sabe como a fonte busca ou transforma esses dados. A API da fonte, criptografia, tokens e regras ficam no addon. O engine só recebe o `chapterPlan` final com `paragraphs`, `pages` ou `images`.

Se a função responder vazio ou não existir, o app usa o `chapterPlan` original. Por isso, para fontes que precisam preparar capítulo por capítulo, o addon deve retornar o plano final completo para os capítulos selecionados.

## chapterPlan

`chapterPlan` é a lista pronta que o app usa para abrir a seleção de capítulos.

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
      "title": "Capítulo 01",
      "contentType": "novel",
      "paragraphs": ["Primeiro parágrafo.", "Segundo parágrafo."],
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
  "title": "Capítulo 01 - A Queda",
  "contentType": "novel",
  "paragraphs": [
    "Primeiro parágrafo.",
    "Segundo parágrafo.",
    "Terceiro parágrafo."
  ],
  "url": "https://example.com/manga/minha-obra/chapter/0/"
}
```

O app salva offline assim:

```json
{
  "title": "Capítulo 01 - A Queda",
  "paragraphs": [
    "Primeiro parágrafo.",
    "Segundo parágrafo.",
    "Terceiro parágrafo."
  ]
}
```

## Quadrinho

Para quadrinho, envie `contentType: "images"` e `pages` com URLs diretas das imagens.

```json
{
  "id": "id:0",
  "number": "1",
  "title": "Capítulo 001",
  "contentType": "images",
  "pages": [
    "https://example.com/obra/capitulo-001/page-001.png",
    "https://example.com/obra/capitulo-001/page-002.png"
  ],
  "url": "https://example.com/manga/minha-obra/chapter/0/"
}
```

Quando `pages` está no `chapterPlan`, o Nyxovira baixa essas imagens diretamente.

## Adaptadores

| Adapter | Quando usar |
| --- | --- |
| `html_series` | Fonte com páginas HTML, índice público ou arquivo JS com obras. |
| `aes_json_api` | Fonte com API JSON e rotas configuráveis. |
| `next_payload` | Fonte que expõe dados em payload Next.js. |

## Publicação

Antes de publicar:

1. Aumente `plugin.json.version`.
2. Confirme `match.hosts`.
3. Confirme `browser.home_url`.
4. Teste `download_target.js` em uma página de obra.
5. Confirme `chapterPlan.title`, `summary`, `canonicalUrl`, `coverUrl` e `chapters`.
6. Em novel, confirme que `paragraphs` tem vários itens separados.
7. Em quadrinho, confirme que o plano final tem `pages` ou `images` nos capítulos selecionados.
8. Publique o pacote do addon em uma Release ou em um repositório público compatível com o Hub.
9. Atualize o `sha256` no catálogo de plugins.
10. Teste download do primeiro, do meio e do último capítulo.
