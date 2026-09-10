# API de Plugins Nyxovira

Versão em inglês: [PLUGIN_API.md](PLUGIN_API.md)

Este documento explica como criar, testar e distribuir um plugin para o Nyxovira.

Um plugin conecta o Nyxovira a um site de leitura. Ele abre o site, reconhece a página da obra, mostra a lista de capítulos assim que o usuário toca em baixar e prepara apenas os capítulos escolhidos pelo usuário.

## Prompt Pronto para Copiar

O [gerador interativo de prompt para IA](https://nanquimori.github.io/KapiTomo/nyxovira/plugin-api/?lang=pt#gerador-de-prompt) aparece no início da documentação online. Informe a URL do site da fonte, escolha um modo, use **Copiar prompt** e cole o resultado na conversa com a IA que criará o plugin:

- **Uso pessoal:** pede somente o mínimo necessário para importação local. Usa o favicon ou logo público do próprio site quando estiver disponível, sem exigir que um ícone separado seja hospedado.
- **Catálogo externo:** manda a IA criar o plugin, um catálogo independente e uma página HTTPS com botão de instalação para o Nyxovira.

O pedido gerado também manda a IA mapear rotas, seletores, ordem dos capítulos, conteúdo de texto ou imagens, carregamento dinâmico e limitações. Primeiro ela deve verificar documentação oficial e APIs públicas; depois, examinar scripts da página e requisições de rede do navegador para encontrar APIs ou endpoints usados pelo site que não estejam documentados de forma visível.

## Caminho do Desenvolvedor

1. [Crie o plugin](#arquivos-do-plugin): prepare o `plugin.json`, mapeie o site e monte os downloads de capítulos.
2. [Teste por **Importar plugins**](#testar-no-nyxovira): importe a pasta local no Nyxovira e repita o teste enquanto desenvolve.
3. **Use somente para você**, se quiser. Nesse caso, não precisa publicar, criar catálogo nem montar site.
4. [Crie uma loja externa](#loja-externa-de-plugins) se quiser distribuir seus plugins em um catálogo independente que cada usuário conecta manualmente.

## Como um Plugin Funciona

1. O criador começa pelo pequeno `plugin.json` de que o Nyxovira precisa. Um script específico do site é adicionado quando o reconhecimento genérico da página não é suficiente.
2. Durante o desenvolvimento, o criador importa a pasta local do plugin no Nyxovira e testa no site compatível.
3. O plugin pode continuar particular. A publicação é opcional e acontece somente depois dos testes.
4. Quando existe, `browser/download_target.js` cuida do reconhecimento específico da obra e dos capítulos. Sem ele, o Nyxovira tenta usar o detector genérico da página.
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
| `plugin.json` | Identifica o site compatível. Poucos campos são necessários para um plugin pessoal. |
| `browser/download_target.js` | Opcional para importar, mas recomendado quando o detector genérico não consegue montar o plano correto de capítulos. |

Para que as atualizações sejam previsíveis, use o mesmo id estável no nome da pasta e em `plugin.json`.

## plugin.json

### Mínimo para uso pessoal

Este é o menor manifesto prático para importar um plugin diretamente no Nyxovira:

```json
{
  "id": "my-plugin",
  "match": {
    "hosts": ["example.com"]
  },
  "browser": {
    "home_url": "https://example.com/",
    "download_target_script_file": "browser/download_target.js"
  }
}
```

Para carregar a fonte, o Nyxovira precisa somente de JSON válido, nome de pasta ou `id` não vazio, pelo menos um item em `match.hosts` e `browser.home_url`. O exemplo também indica `browser/download_target.js` porque um script próprio é a forma confiável de reconhecer obras e capítulos. Se esse campo e o arquivo forem omitidos, o Nyxovira tenta usar o detector genérico da página, que pode não compreender todos os sites.

Em um plugin que ficará apenas no seu aparelho, estes campos **não são obrigatórios**: `schema_version`, `name`, `version`, `tags`, `browser.icon_mode`, `browser.short_label` e `parser`. GitHub, catálogo público e site de plugins também não são necessários. Se o site fornecer um favicon ou logo público e estável, use essa URL em `browser.icon_url`; se não houver, o ícone pode ser omitido no uso pessoal.

Campos e alcance:

| Campo | Significado |
| --- | --- |
| `id` | Id estável do plugin. Fortemente recomendado; se faltar, o Nyxovira usa o nome da pasta. |
| `match.hosts` | Obrigatório. Domínios reconhecidos pelo plugin. |
| `browser.home_url` | Obrigatório. Página aberta pelo navegador interno do app. |
| `browser.download_target_script_file` | Opcional, mas recomendado para reconhecer com segurança as obras e os capítulos daquele site. |
| `name`, `version` | Opcionais na importação pessoal; úteis ao compartilhar e atualizar o plugin. |
| `tags` | Desnecessárias no uso pessoal. São opcionais em um catálogo externo e servem apenas para busca ou filtros da página que você criar. |
| `browser.icon_url` | Opcional no uso pessoal: prefira o favicon ou logo público do próprio site quando estiver disponível. Recomendado ao distribuir o plugin. |
| `parser` | Configuração avançada e opcional do parser nativo. Não é necessária quando o script do navegador fornece o plano e o conteúdo dos capítulos. |

## Mapeamento do Site

Relacione os nomes usados pelo site com os campos que o Nyxovira espera. Cada plugin fica responsável pelo site que suporta.

Descubra a fonte dos dados antes de escolher a implementação:

- Procure documentação oficial para desenvolvedores, API pública, arquivos OpenAPI ou Swagger, GraphQL, feeds JSON e endpoints documentados.
- Se a API não estiver visível ou documentada, examine o código da página, os scripts carregados e as requisições de rede do navegador para identificar os endpoints usados pela própria interface do site.
- Compare os dados da API com o HTML renderizado e use a fonte mais completa e estável para obras, capítulos, textos e imagens.

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

A importação manual é o caminho normal durante o desenvolvimento e também permite usar um plugin somente para você. A importação pessoal não valida tags de catálogo nem exige que você hospede um ícone. Quando o site já fornecer favicon ou logo público, use-o em `browser.icon_url`.

1. Mantenha `plugin.json` e a pasta `browser` juntos dentro da pasta do plugin.
2. No Nyxovira, abra **Sites**, toque em **Importar plugins** e selecione a pasta do plugin. Você também pode selecionar uma pasta que contenha várias pastas de plugins.
3. Abra o site compatível e confira o reconhecimento da obra, a lista de capítulos e o download.
4. Depois de alterar os arquivos, importe a pasta novamente e repita o teste.

**Se o plugin é somente para você, o processo termina aqui.** Não é necessário ter tags, `schema_version`, GitHub, catálogo público ou site de plugins. Use o favicon ou logo do próprio site quando existir; você não precisa hospedar um ícone separado.

Se quiser compartilhar, [mantenha uma loja externa](#loja-externa-de-plugins). O KapiTomo não recebe plugins de terceiros: a página, o catálogo e os arquivos continuam sob o controle de quem os publicou.

## Loja Externa de Plugins

Use esta opção somente depois que os plugins estiverem prontos e testados. Ela é destinada a quem mantém uma distribuição independente com plugins próprios ou que tenha autorização para distribuir.

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
      "status": "active"
    }
  ]
}
```

`hub_url` informa qual página o Nyxovira deve abrir quando o usuário conecta o JSON diretamente. Também são aceitos `store_url` e `homepage`. URLs relativas, como `manifest_url`, são resolvidas a partir do endereço do catálogo. Uma entrada hospedada no GitHub também pode usar `repository_url`, `repository_ref` e `plugin_path`.

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

Para um plugin importado para uso pessoal:

1. `plugin.json` é um JSON válido, o nome da pasta (ou `id`) não está vazio, há pelo menos um valor em `match.hosts` e `browser.home_url` é válido.
2. Se o reconhecimento genérico não for suficiente, `browser/download_target.js` reconhece a obra e cria a lista de capítulos.
3. Novels usam `paragraphs`; quadrinhos usam `pages`.

Para uma loja externa:

1. A página, o catálogo e os arquivos dos plugins estão publicados.
2. O autor e o site de origem de cada plugin estão corretos.
3. O botão **Instalar** foi testado abrindo a loja pelo Nyxovira.
