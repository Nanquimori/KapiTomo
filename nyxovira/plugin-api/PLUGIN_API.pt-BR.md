# API de Plugins Nyxovira

Versão em inglês: [PLUGIN_API.md](PLUGIN_API.md)

Este documento explica como criar e publicar um plugin para o Nyxovira.

Um plugin conecta o Nyxovira a um site de leitura. Ele abre o site, reconhece a página da obra, mostra a lista de capítulos assim que o usuário toca em baixar e prepara apenas os capítulos escolhidos pelo usuário.

## Caminho do Desenvolvedor

1. [Crie o plugin](#arquivos-do-plugin): prepare o `plugin.json`, mapeie o site e monte os downloads de capítulos.
2. [Teste por **Importar plugins**](#testar-no-nyxovira): importe a pasta local no Nyxovira e repita o teste enquanto desenvolve.
3. **Use somente para você**, se quiser. Nesse caso, não precisa publicar, criar catálogo nem montar site.
4. [Compartilhe com a comunidade](#publicar-no-plugin-hub-oficial), se quiser que outros usuários encontrem o plugin no catálogo oficial.
5. [Crie uma loja externa](#loja-externa-de-plugins) somente como opção avançada para distribuir plugins prontos, seus e de outros criadores.

## Como um Plugin Funciona

1. O criador prepara `plugin.json` e `browser/download_target.js`.
2. Durante o desenvolvimento, o criador importa a pasta local do plugin no Nyxovira e testa no site compatível.
3. O plugin pode continuar particular. A publicação é opcional e acontece somente depois dos testes.
4. Quando o usuário abre um site compatível, `browser/download_target.js` lê a página atual e cria a lista de capítulos.
5. Depois que o usuário escolhe os capítulos, o mesmo script prepara textos ou páginas de imagem para salvar no dispositivo.

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

## Testar no Nyxovira

A importação manual é o caminho normal durante o desenvolvimento e também permite usar um plugin somente para você.

1. Mantenha `plugin.json` e a pasta `browser` juntos dentro da pasta do plugin.
2. No Nyxovira, abra **Sites**, toque em **Importar plugins** e selecione a pasta do plugin. Você também pode selecionar uma pasta que contenha várias pastas de plugins.
3. Abra o site compatível e confira o reconhecimento da obra, a lista de capítulos e o download.
4. Depois de alterar os arquivos, importe a pasta novamente e repita o teste.

**Se o plugin é somente para você, o processo termina aqui.** Não é necessário usar GitHub, catálogo público ou site de plugins.

Se quiser compartilhar, escolha uma destas etapas posteriores:

- [Publicar no Plugin Hub oficial](#publicar-no-plugin-hub-oficial): a comunidade encontra o plugin em **Plugins online**.
- [Manter uma loja externa](#loja-externa-de-plugins): opção avançada e mais trabalhosa para distribuir um catálogo com plugins seus e de outros criadores.

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

## Loja Externa de Plugins

Use esta opção somente depois que os plugins estiverem prontos e testados. Ela é destinada a quem mantém uma distribuição independente com plugins próprios e, se quiser, plugins de outros criadores.

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

Hospede a pasta em um endereço HTTPS público. A aparência, a busca e os cards pertencem à própria loja; o Nyxovira precisa apenas descobrir o catálogo e receber a solicitação de instalação. Adicione um objeto à lista `plugins` para cada plugin distribuído.

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

Quando a loja é aberta em um navegador comum, o exemplo orienta a pessoa a abri-la pelo Nyxovira. Dentro do aplicativo, o botão instala o plugin correspondente no catálogo conectado.

### Antes de publicar a loja

- Hospede a página, o catálogo e os arquivos dos plugins em endereços HTTPS públicos.
- Para cada plugin, informe corretamente o autor, o site de origem e o caminho do manifesto.
- Teste o botão Instalar abrindo a loja pelo cartão criado em **Sites externos** no Nyxovira.

### Teste antes de divulgar

1. Publique todos os arquivos em HTTPS.
2. No Nyxovira, abra **Sites > Sites externos** e conecte a URL de `index.html` ou da pasta da loja.
3. Abra o site pelo cartão criado no aplicativo.
4. Toque em **Instalar** e confirme a mensagem retornada.

## Checklist Final

Para qualquer plugin:

1. `plugin.json` tem `id`, `version`, `match.hosts`, `browser.home_url` e `browser.download_target_script_file` válidos.
2. `browser/download_target.js` reconhece a obra e cria a lista de capítulos.
3. Novels usam `paragraphs`; quadrinhos usam `pages`.
4. O plugin não contém malware, não coleta credenciais e não contorna autenticação, paywall, DRM ou restrições de acesso.

Para o Plugin Hub oficial:

1. O plugin está em um repositório GitHub público pertencente ao solicitante.
2. O ícone é público e `plugin.json.tags` usa somente valores aceitos.
3. Nenhum plugin visível já cobre o mesmo host.
4. A solicitação é enviada pelo Plugin Hub e aceita as regras atuais.

Para uma loja externa:

1. A página, o catálogo e os arquivos dos plugins estão publicados.
2. O autor e o site de origem de cada plugin estão corretos.
3. O botão **Instalar** foi testado abrindo a loja pelo Nyxovira.
