# API de Plugins Nyxovira

Versão em inglês: [PLUGIN_API.md](PLUGIN_API.md)

Este documento explica como criar e publicar um plugin para o Nyxovira.

Um plugin conecta o Nyxovira a um site de leitura. Ele abre o site, reconhece a página da obra, mostra a lista de capítulos assim que o usuário toca em baixar e prepara apenas os capítulos escolhidos pelo usuário.

## Comece pelo seu objetivo

| Quero... | Leia primeiro |
| --- | --- |
| Criar os arquivos de um plugin | [Arquivos do Plugin](#arquivos-do-plugin) e [`plugin.json`](#pluginjson) |
| Criar um site próprio com catálogo e botão Instalar | [Sites Externos de Plugins](#sites-externos-de-plugins) |
| Montar a lista de capítulos e downloads | [Lista Instantânea de Capítulos](#lista-instantânea-de-capítulos) |
| Publicar no catálogo oficial | [Publicar no Plugin Hub Oficial](#publicar-no-plugin-hub-oficial) |

## Como um Plugin Funciona

1. O criador prepara `plugin.json` e `browser/download_target.js`.
2. O plugin pode ser importado manualmente, publicado no Plugin Hub oficial ou oferecido pelo catálogo de um site externo.
3. O Nyxovira instala os mesmos arquivos pela entrada escolhida pelo usuário.
4. Quando o usuário abre um site compatível, `browser/download_target.js` lê a página atual e cria a lista de capítulos.
5. Depois que o usuário escolhe os capítulos, o mesmo script prepara textos ou páginas de imagem para salvar no dispositivo.

## Três Formas de Instalar

O Nyxovira oferece três entradas diferentes para plugins:

1. **Importar plugins**: instala manualmente os arquivos de um plugin escolhidos pelo usuário, sem usar um catálogo público.
2. **Plugins online**: abre o Plugin Hub oficial do KapiTomo, que mostra e instala os plugins publicados no catálogo oficial.
3. **Sites externos**: conecta a página HTTPS de uma loja de plugins independente. A própria página externa mostra, pesquisa e organiza seus plugins, e pode solicitar a instalação direta enquanto estiver aberta pelo Nyxovira.

Um site externo não é incorporado ao Plugin Hub e seus plugins não aparecem misturados ao catálogo oficial. O Nyxovira guarda somente a associação entre a página conectada e seu catálogo.

## Sites Externos de Plugins

Uma loja externa mínima pode usar esta estrutura:

```text
plugin-store/
|-- index.html
|-- catalog.json
`-- plugins/
    `-- my-plugin/
        |-- plugin.json
        `-- browser/
            `-- download_target.js
```

Hospede a pasta em um endereço HTTPS público. A aparência, a busca e os cards pertencem ao próprio site; o Nyxovira precisa apenas descobrir o catálogo e receber a solicitação de instalação.

### Descoberta do catálogo

Inclua na página principal da loja:

```html
<link rel="nyxovira-plugin-catalog" href="catalog.json">
```

Também é aceito:

```html
<meta name="nyxovira-plugin-catalog" content="catalog.json">
```

Sem uma declaração, o Nyxovira procura `catalog.json`, `catalog-store.json` e `plugins.json` na mesma pasta da página. O usuário também pode conectar diretamente a URL do JSON.

### Formato do catálogo externo

```json
{
  "schema_version": 1,
  "name": "Minha loja de plugins",
  "hub_url": "https://plugins.example.com/",
  "plugins": [
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "author": "Author",
      "version": "1.0.0",
      "manifest_url": "plugins/my-plugin/plugin.json",
      "icon_url": "https://example.com/icon.png",
      "site_url": "https://example.com/",
      "tags": ["portuguese", "manga"],
      "status": "active"
    }
  ]
}
```

`hub_url` informa qual página o Nyxovira deve abrir quando o usuário conecta o JSON diretamente. Também são aceitos `store_url` e `homepage`. URLs relativas, como `manifest_url`, são resolvidas a partir do endereço do catálogo. Uma entrada também pode usar `repository_url`, `repository_ref` e `plugin_path`, no mesmo formato do Plugin Hub.

### Instalação pela página externa

Este exemplo completo cria o botão, informa quando a página foi aberta fora do aplicativo e mostra o resultado retornado pelo Nyxovira:

```html
<button id="install-my-plugin" type="button">Instalar My Plugin</button>
<p id="install-status" aria-live="polite"></p>

<script>
  const catalogUrl = new URL("catalog.json", location.href).href;
  const status = document.querySelector("#install-status");

  document.querySelector("#install-my-plugin").addEventListener("click", () => {
    const bridge = globalThis.NyxoviraAndroidBridge
      || globalThis.ArchiveInkAndroidBridge;

    if (!bridge || typeof bridge.installCommunityPlugin !== "function") {
      status.textContent = "Abra este site pelo Nyxovira para instalar.";
      return;
    }

    try {
      const result = JSON.parse(
        bridge.installCommunityPlugin(
          catalogUrl,
          JSON.stringify({ id: "my-plugin" })
        ) || "{}"
      );
      status.textContent = result.message
        || (result.success ? "Plugin instalado." : "Não foi possível instalar.");
    } catch (error) {
      status.textContent = "Não foi possível concluir a instalação.";
    }
  });
</script>
```

A ponte só autoriza a instalação enquanto o usuário navega dentro do site conectado. O Nyxovira baixa novamente o catálogo associado e procura o plugin pelo `id`; a página não pode substituir o catálogo conectado por uma URL arbitrária.

Também estão disponíveis `getCommunityPluginCatalog(catalogUrl)`, `getOnlinePluginCatalog()` e `installOnlinePlugin(pluginJson)`. Os dois últimos são aliases de compatibilidade para lojas que reaproveitam uma interface criada para o Plugin Hub oficial.

### Limites e segurança

- O usuário pode manter até 20 sites externos conectados.
- A página, o catálogo e todos os redirecionamentos precisam usar HTTPS e endereços públicos; redes locais e `localhost` são recusados.
- O catálogo pode ter até 2 MiB e 1.000 plugins. Cada manifesto ou script pode ter até 4 MiB.
- IDs duplicados e manifestos cujo `id` não corresponde à entrada do catálogo são recusados.
- A permissão de instalação é removida quando o navegador sai do caminho autorizado do site conectado.
- Sites externos e seus plugins são independentes e não são revisados nem publicados pelo KapiTomo.

### Teste antes de divulgar

1. Publique todos os arquivos em HTTPS.
2. No Nyxovira, abra **Sites > Sites externos** e conecte a URL de `index.html` ou da pasta da loja.
3. Abra o site pelo cartão criado no aplicativo.
4. Toque em **Instalar** e confirme a mensagem retornada.
5. Abra um endereço fora da pasta da loja e confirme que a instalação deixa de ser autorizada.

## Arquivos do Plugin

Crie uma pasta com o nome do id do plugin:

```text
my-plugin/
|-- plugin.json
`-- browser/
    `-- download_target.js
```

| Arquivo | Função |
| --- | --- |
| `plugin.json` | Define id, nome, versão, hosts compatíveis, entrada do navegador, ícone e parser. |
| `browser/download_target.js` | Executa dentro da página aberta pelo Nyxovira e retorna o plano de download da obra. |

Use o mesmo id estável no nome da pasta e em `plugin.json`.

## plugin.json

Exemplo:

```json
{
  "schema_version": 1,
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "tags": ["portuguese", "manga"],
  "match": {
    "hosts": ["example.com"]
  },
  "browser": {
    "home_url": "https://example.com/",
    "icon_url": "https://example.com/icon.png",
    "icon_mode": "pinned",
    "short_label": "Source",
    "download_target_script_file": "browser/download_target.js"
  },
  "parser": {
    "adapter": "html_series",
    "base_url": "https://example.com",
    "static_works_script": "https://example.com/data/works.js",
    "base_path_prefix": "",
    "series_path_prefix": "manga",
    "hash_series_path_prefixes": ["work", "read"],
    "chapter_path_prefix": "chapter",
    "chapter_slug_pattern": ".+"
  }
}
```

Campos principais:

| Campo | Significado |
| --- | --- |
| `id` | Id estável do plugin. Use letras minúsculas, números, hífens, pontos ou underscores. |
| `name` | Nome exibido no app. |
| `version` | Versão do plugin. Aumente sempre que publicar uma correção. |
| `match.hosts` | Domínios reconhecidos pelo plugin. |
| `browser.home_url` | Página aberta pelo navegador interno do app. |
| `browser.icon_url` | Imagem pública do ícone. Plugins online precisam ter uma. |
| `browser.download_target_script_file` | Script do navegador que detecta a obra aberta. |
| `parser.adapter` | Tipo de parser do site. Use `html_series` para sites simples ou índices JS. |
| `parser.base_url` | URL base usada para resolver links relativos. |

## Mapeamento do Site

Relacione os nomes usados pelo site com os campos que o Nyxovira espera. Cada plugin fica responsável pelo site que suporta.

Exemplo:

```js
var plugin = {
  siteBaseUrl: "https://example.com",
  siteVariable: "EXAMPLE_WORK_INDEX",
  siteRoutes: {
    detailsHash: "series",
    readerHash: "reader"
  },
  appRoutes: {
    publicSeriesPath: "manga",
    publicChapterPath: "chapter"
  },
  fields: {
    workId: "slug",
    workTitle: "name",
    workSummary: "synopsis",
    workCover: "cover_url",
    workChapters: "episodes",
    chapterTitle: "name",
    chapterContentType: "format",
    chapterParagraphs: "text_blocks",
    chapterPages: "page_urls",
    chapterImages: "image_list",
    imageSource: "url"
  }
};
```

Isso permite que o site mantenha seus próprios nomes de rotas e campos enquanto o Nyxovira recebe título, capa, capítulos, texto e imagens em um formato previsível.

## Lista Instantânea de Capítulos

Quando o usuário toca em baixar, o script deve definir imediatamente:

```js
window.__nyxoviraChapterPlan = JSON.stringify({
  title: "Work title",
  summary: "Short summary",
  canonicalUrl: "https://example.com/manga/work-slug/",
  coverUrl: "https://example.com/cover.png",
  chapters: [
    {
      id: "chapter-forest-hunt",
      number: "1",
      title: "The Forest Hunt",
      label: "1 - The Forest Hunt",
      url: "https://example.com/manga/work-slug/chapter/1/",
      contentType: "novel",
      paragraphs: ["First paragraph.", "Second paragraph."]
    }
  ]
});
```

Depois o script retorna a URL canônica da obra:

```js
return "https://example.com/manga/work-slug/";
```

O Nyxovira mostra a lista de capítulos a partir de `window.__nyxoviraChapterPlan` imediatamente.

## Preparar Depois da Seleção

Para quadrinhos grandes ou APIs em que cada capítulo precisa ser carregado separadamente, não carregue todas as páginas antes da lista de capítulos aparecer.

Crie primeiro um plano leve:

```js
{
  "id": "id:387076",
  "number": "1",
  "title": "Arrival at the Ruins",
  "contentType": "images",
  "url": "https://example.com/read/work/387076",
  "chapterDataPath": "/api/chapter/387076"
}
```

Depois implemente:

```js
window.__nyxoviraPrepareDownloadPlan = function (context) {
  var selectedIds = Array.isArray(context.selectedChapterIds)
    ? context.selectedChapterIds
    : [];
  var plan = context.chapterPlan;

  plan.chapters.forEach(function (chapter) {
    if (selectedIds.length > 0 && selectedIds.indexOf(chapter.id) < 0) {
      return;
    }

    var payload = getJson(chapter.chapterDataPath);
    chapter.pages = payload.pages.map(function (page) {
      return page.imageUrl;
    });
    delete chapter.chapterDataPath;
  });

  window.__nyxoviraChapterPlan = JSON.stringify(plan);
  return plan;
};
```

O Nyxovira chama essa função somente depois que o usuário escolhe os capítulos e confirma o download. Isso mantém o primeiro clique rápido e ainda baixa corretamente todas as páginas selecionadas.

O app passa `{ selectedChapterIds, chapterPlan }` para a função. A função pode retornar o plano final como objeto ou JSON. Se não retornar nada, o Nyxovira mantém o plano original.

## Formatos de Capítulo

Capítulo de novel:

```json
{
  "id": "chapter-forest-hunt",
  "title": "The Forest Hunt",
  "contentType": "novel",
  "paragraphs": [
    "First paragraph.",
    "Second paragraph."
  ]
}
```

Capítulo de quadrinho:

```json
{
  "id": "chapter-arrival",
  "title": "Arrival at the Ruins",
  "contentType": "images",
  "pages": [
    "https://example.com/page-001.png",
    "https://example.com/page-002.png"
  ]
}
```

Para capítulos com imagens, `pages` é o campo preferido. O Nyxovira também lê `images` por compatibilidade.

## Publicar no Plugin Hub Oficial

Use esta opção somente quando quiser que o plugin apareça no catálogo oficial. O repositório GitHub público é a fonte da instalação; não escreva manualmente uma entrada em `catalog.json`.

Antes de enviar, `plugin.json` precisa ter um ícone HTTPS público e uma lista `tags` com um idioma primeiro, de um a três tipos de conteúdo e, quando necessário, `adult` por último.

Tags aceitas:

Tags de idioma:

- `english`
- `portuguese`
- `spanish`
- `japanese`
- `korean`
- `chinese`
- `indonesian`
- `thai`
- `vietnamese`
- `french`
- `german`
- `italian`
- `russian`
- `arabic`

Tags de tipo de conteúdo:

- `manga`
- `manhua`
- `manhwa`
- `novel`
- `webtoon`
- `comic`
- `other`

Classificação opcional:

- `adult`: use por último quando a fonte expõe material restrito a adultos.

Como publicar:

1. Cole o repositório GitHub do plugin no Plugin Hub.
2. Confirme a solicitação gerada no GitHub e aceite as regras atuais.
3. A automação verifica os arquivos, o ícone, as tags, os hosts e se o solicitante é dono do repositório.
4. Uma solicitação tecnicamente válida é publicada no catálogo.

Um host só pode ter um plugin visível. As regras de responsabilidade, revisão, correção e remoção ficam nos [Termos e Regras do Catálogo de Plugins](https://nanquimori.github.io/KapiTomo/terms/#regras-do-catalogo).

## Checklist Final

Para qualquer plugin:

1. `plugin.json` tem `id`, `version`, `match.hosts`, `browser.home_url` e `browser.download_target_script_file` válidos.
2. `browser/download_target.js` reconhece a obra e cria a lista de capítulos.
3. Novels usam `paragraphs`; quadrinhos usam `pages`.
4. O plugin não contém malware, não coleta credenciais e não contorna autenticação, paywall, DRM ou restrições de acesso.

Para um site externo:

1. A página e todos os arquivos usam HTTPS público.
2. `index.html` declara `nyxovira-plugin-catalog`.
3. `catalog.json` possui `schema_version`, `name`, `hub_url` e `plugins`.
4. Cada `manifest_url` existe e aponta para um manifesto com o mesmo `id`.
5. O botão trata tanto a presença quanto a ausência da ponte Android.
6. A instalação foi testada pelo navegador interno do Nyxovira.

Para o Plugin Hub oficial:

1. O plugin está em um repositório GitHub público pertencente ao solicitante.
2. O ícone é público e `plugin.json.tags` usa somente valores aceitos.
3. Nenhum plugin visível já cobre o mesmo host.
4. A solicitação é enviada pelo Plugin Hub e aceita as regras atuais.
