# API de Plugins Nyxovira

Versão em inglês: [PLUGIN_API.md](PLUGIN_API.md)

Este documento explica como criar e publicar um plugin para o Nyxovira.

Um plugin conecta o Nyxovira a um site de leitura. Ele abre o site, reconhece a página da obra, mostra a lista de capítulos assim que o usuário toca em baixar e prepara apenas os capítulos escolhidos pelo usuário.

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

O botão de instalação da loja pode chamar a ponte Android fornecida pelo navegador interno:

```js
const bridge = globalThis.NyxoviraAndroidBridge
  || globalThis.ArchiveInkAndroidBridge;
const catalogUrl = new URL("catalog.json", location.href).href;

function installPlugin(id) {
  return JSON.parse(
    bridge.installCommunityPlugin(catalogUrl, JSON.stringify({ id }))
  );
}
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

## Plugin Hub

O Plugin Hub instala plugins diretamente de repositórios públicos do GitHub.

As solicitações de publicação são validadas automaticamente, e entradas tecnicamente válidas que aceitam as regras atuais do catálogo são publicadas imediatamente. A validação impede plugins duplicados para a mesma fonte, verifica a propriedade do repositório e recusa repositórios que não atendem aos requisitos técnicos públicos. A publicação automática não representa aprovação da fonte ou de conteúdos de terceiros.

O Plugin Hub é um catálogo, não um host de conteúdo. O criador do plugin é responsável pelo código, mapeamento do site, ícone, metadados, permissões e manutenção. Os sites de origem são responsáveis por suas próprias páginas e conteúdos. O Nyxovira Pro libera recursos do app e não vende obras, páginas, capítulos, traduções ou plugins de terceiros.

A entrada do catálogo usa:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "author": "Author",
  "version": "1.0.0",
  "description": "Site plugin for Nyxovira.",
  "site_url": "https://example.com/",
  "homepage": "https://example.com/",
  "icon_url": "https://example.com/icon.png",
  "repository_url": "https://github.com/user/my-plugin",
  "repository_ref": "main",
  "plugin_path": ".",
  "hosts": ["example.com"],
  "status": "active",
  "tags": ["english", "manga", "novel"]
}
```

| Campo | Significado |
| --- | --- |
| `repository_url` | Repositório GitHub que contém `plugin.json`. |
| `repository_ref` | Branch ou ref usado na instalação. Normalmente `main`. |
| `plugin_path` | Pasta que contém `plugin.json`. Use `.` quando o manifesto está na raiz do repositório. |
| `hosts` | Domínios cobertos pelo plugin. O Hub deriva isso de `match.hosts`, `browser.home_url`, `site_url` e `homepage`. Um host só pode ter um plugin visível no catálogo. |
| `status` | Estado no catálogo. Veja os valores abaixo. |
| `tags` | Obrigatório. Use uma tag de idioma primeiro e depois uma a três tags de tipo de conteúdo. Tags extras ou não suportadas são ignoradas. |

Tags públicas oficiais:

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

O formato público de publicação usa o repositório como fonte do plugin.

Fluxo de publicação:

1. Cole o repositório GitHub do plugin no Plugin Hub.
2. Confirme a solicitação gerada no GitHub.
3. A automação valida `plugin.json`, ícone público, tags oficiais, repositório e hosts cobertos.
4. Se outro plugin visível já cobre o mesmo host, a solicitação é recusada.
5. O autor da solicitação deve ser dono do repositório do plugin.
6. A solicitação gerada precisa aceitar as regras atuais do catálogo do Plugin Hub.
7. A automação publica imediatamente a entrada tecnicamente válida no catálogo.

Regras de revisão:

- O Hub verifica repositório, ícone, tags oficiais e hosts cobertos.
- Um host visível só pode ter um plugin.
- Somente o dono do repositório pode publicar ou atualizar um plugin da comunidade.
- Solicitações tecnicamente válidas que aceitam as regras atuais são publicadas automaticamente.
- Donos podem remover os próprios plugins automaticamente. Mantenedores podem ocultar, restaurar ou remover qualquer plugin por uma solicitação autenticada de moderação.
- Um criador não pode republicar por cima de uma entrada ocultada ou removida pela moderação. Um mantenedor precisa analisá-la ou restaurá-la primeiro. Remoções solicitadas pelo próprio criador podem ser republicadas por ele.
- Se o repositório ou `plugin.json` permanecer ausente em duas verificações consecutivas, a entrada é marcada como removida.
- A validação técnica não decide titularidade de direitos autorais nem autorização da fonte. Denúncias confiáveis são analisadas conforme os [Termos e Regras do Catálogo de Plugins](https://nanquimori.github.io/KapiTomo/terms/#regras-do-catalogo).

Valores de status:

- `active`: aparece como Online.
- `broken`: aparece como Offline.
- `hidden`: não aparece enquanto uma denúncia confiável sobre segurança, direitos, identidade ou política é analisada.
- `removed`: não aparece após solicitação autorizada, violação confirmada ou ausência repetida do repositório/manifesto.
- O Hub verifica plugins a cada 30 minutos. Falhas temporárias da fonte continuam recuperáveis e não causam, isoladamente, remoção definitiva.

## Checklist

Antes de publicar:

1. `plugin.json` tem `id`, `version`, `match.hosts`, `browser.home_url` e `browser.icon_url` estáveis.
2. `plugin.json.tags` tem um idioma oficial primeiro e pelo menos um tipo de conteúdo oficial depois.
3. `browser/download_target.js` retorna a URL atual da obra.
4. O primeiro clique em baixar cria um plano de capítulos imediatamente.
5. Capítulos grandes preparam suas páginas por `window.__nyxoviraPrepareDownloadPlan`.
6. Capítulos de novel usam `paragraphs`.
7. Capítulos de quadrinho usam `pages`; `images` é aceito por compatibilidade.
8. O plugin funciona a partir de um repositório GitHub limpo.
9. Nenhum plugin visível no catálogo público já cobre o mesmo host de origem.
10. O repositório é enviado pelo Plugin Hub online.
11. O criador aceita as regras atuais do catálogo e a responsabilidade pelo código, metadados, permissões, manutenção e mapeamento da fonte.
12. O plugin não contém malware, não rouba dados ou credenciais, não imita outra parte e não contorna autenticação, paywall, DRM ou restrições de acesso.
