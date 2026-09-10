# API de Plugins Nyxovira

English: [PLUGIN_API.md](PLUGIN_API.md)

Este é o contrato oficial para criar, testar e usar plugins de fonte no Nyxovira. Todos os exemplos usam o domínio reservado `source.invalid`; nenhum site de leitura de terceiros faz parte desta API.

## O que significa “plugin válido”

Um plugin só está validado quando, em uma URL real autorizada, ele reconhece a obra, lista capítulos, preserva o ID selecionado, resolve páginas ou parágrafos, baixa o conteúdo, grava o arquivo e consegue reabri-lo. Importar o ZIP, abrir o site ou colocar uma tarefa na fila **não valida** o plugin.

## Três níveis de implementação

1. **HTML simples:** `browser/download_target.js` lê a página renderizada e produz o plano final.
2. **API JSON simples:** `browser/download_target.js` faz a descoberta; declare também `parser` quando a API for estruturada ou o downloader nativo precisar repetir as requisições fora da WebView.
3. **API dinâmica, protegida ou criptografada:** `parser` é obrigatório para endpoints, cabeçalhos e decodificação; o script continua responsável pela descoberta e pela sessão do navegador.

“Parser opcional” significa apenas que o manifesto pode ser importado sem ele. Declare `parser` sempre que houver API estruturada, cabeçalhos especiais, criptografia ou download nativo fora da WebView.

## Estrutura mínima do plugin

```text
meu-plugin/
|-- plugin.json
`-- browser/
    `-- download_target.js
```

```json
{
  "$schema": "https://nanquimori.github.io/KapiTomo/nyxovira/plugin-api/plugin.schema.json",
  "id": "meu-plugin",
  "match": { "hosts": ["source.invalid"] },
  "browser": {
    "home_url": "https://source.invalid/",
    "icon_url": "https://source.invalid/favicon.ico",
    "download_target_script_file": "browser/download_target.js"
  }
}
```

O mínimo exigido em execução é JSON válido, nome de pasta ou `id`, um `match.hosts` e `browser.home_url`. `name`, `version`, `language` e `tags` não são necessários para importar; repositório e catálogo pertencem somente a uma distribuição posterior opcional. Use `browser.icon_url` quando a própria fonte tiver favicon ou logo público estável.

Sem `browser/download_target.js`, o detector genérico tenta reconhecer a página. Isso ajuda no HTML básico, mas não substitui o mapeamento de uma fonte específica.

Valide `plugin.json` com [plugin.schema.json](plugin.schema.json). O schema é o contrato legível por editores e ferramentas; o app continua sendo a autoridade de execução.

## Mapeamento obrigatório antes de programar

Registre estas respostas antes de criar o ZIP:

- URL real de uma obra e URL real do leitor;
- endpoint da obra, dos capítulos e das páginas, se existirem;
- seletores HTML usados e como detectar que a página terminou de carregar;
- cabeçalhos exigidos, `Referer`, cookies, login ou tokens;
- formato de criptografia, envelope e origem legítima da chave;
- capítulos pagos, restritos, removidos ou que exigem conta;
- ordem original e ordem apresentada dos capítulos;
- URLs relativas ou absolutas e a base correta para resolvê-las;
- formato real dos IDs de obra, capítulo e página;
- prova de que ao menos um capítulo real virou páginas ou parágrafos.

Procure primeiro documentação oficial, OpenAPI/Swagger, GraphQL, feeds JSON e endpoints públicos da própria fonte. Se não estiverem visíveis, inspecione o HTML, os scripts carregados e as requisições de rede usadas pela página. Não invente endpoints, seletores, cabeçalhos ou chaves.

## Contrato do script do navegador

O script define imediatamente `window.__nyxoviraChapterPlan`:

```js
window.__nyxoviraChapterPlan = JSON.stringify({
  title: "Título",
  canonicalUrl: "https://source.invalid/work/slug",
  chapters: [{
    id: "chapter-387076",
    number: "1",
    title: "Capítulo 1",
    label: "1 - Capítulo 1",
    url: "https://source.invalid/read/387076",
    contentType: "images"
  }]
});
return "https://source.invalid/work/slug";
```

O plano inicial deve ser leve. Para conteúdo obtido somente após a seleção:

```js
window.__nyxoviraPrepareDownloadPlan = function ({ selectedChapterIds, chapterPlan }) {
  for (const chapter of chapterPlan.chapters) {
    if (!selectedChapterIds.includes(chapter.id)) continue;
    const request = new XMLHttpRequest();
    request.open("GET", `/api/chapters/${encodeURIComponent(chapter.id)}`, false);
    request.withCredentials = true;
    request.send();
    if (request.status < 200 || request.status >= 300) throw new Error(`HTTP ${request.status}`);
    const payload = JSON.parse(request.responseText);
    chapter.pages = payload.pages.map((page) => page.url);
  }
  return chapterPlan;
};
```

### Invariante de ID

O `id` presente em `chapterPlan.chapters` deve ser **exatamente** o valor recebido em `selectedChapterIds`. Não acrescente nem remova prefixos como `id:`, não converta número em slug e não use o índice visual. IDs duplicados, vazios ou transformados invalidam a seleção.

### Formatos de conteúdo

- Novel: `contentType: "novel"` e `paragraphs: ["..."]` não vazio.
- Manga/quadrinho: `contentType: "images"` e `pages: ["https://..."]` não vazio; `images` existe apenas para compatibilidade.
- Se uma página exigir cabeçalho ou token próprio, use um objeto de página aceito pelo parser nativo ou declare os campos correspondentes em `parser`; uma URL sozinha não transporta autenticação especial.

## Campos de `parser` e efeito operacional

Adaptadores aceitos pelo app: `next_payload` (payload/rotas Next renderizadas), `html_series` (série/leitor em HTML) e `aes_json_api` (API JSON comum ou criptografada).

| Campo | O que muda na execução |
| --- | --- |
| `adapter` | Escolhe o algoritmo nativo; valor desconhecido falha. |
| `base_url`, `api_base`, `cdn_base` | Resolvem respectivamente rotas web, endpoints de API e imagens/CDN. |
| `request_headers` | Anexa cabeçalhos estáticos às requisições nativas da API. |
| `work_api_path_template`, `work_api_id_path_template` | Montam a consulta de obra por slug ou ID. |
| `chapter_api_path_template` | Monta a consulta do conteúdo de um capítulo. |
| `page_api_path_template`, `page_cdn_path_template` | Montam a consulta/token de página ou a URL final no CDN. |
| `work_search_api_path_template`, `cover_search_api_path_template` | Buscam obra/capa quando a URL não contém todos os dados. |
| `series_path_template`, `read_path_template` | Reconstruem URLs públicas de série e leitor. |
| `public_work_path_template`, `public_chapter_path_template` | Gravam URLs públicas canônicas nos metadados. |
| `viewer_bootstrap_path_template` | Busca o bootstrap JSON do visualizador. |
| `static_works_script` | Baixa o arquivo JavaScript estático que contém o índice de obras. |
| `page_token_header` | Nome do cabeçalho que recebe o token individual da página. |
| `encrypted_response_format` | Ativa a decodificação do envelope; `rotating_sbox_json` é suportado. |
| `api_secret`, `rotating_sbox_keys`, `rotating_sbox_key_prefix` | Fornecem o material de chave mapeado para a decodificação. Nunca invente valores. |
| `default_workers`, `default_retries` | Ajustam concorrência e tentativas da fonte. |
| `map` | Liga caminhos reais do JSON a `work.title`, `work.summary`, `work.cover`, `work.chapters`, `chapter.id`, `chapter.number`, `chapter.title`, `chapter.text`, `chapter.pages`, `page.number`, `page.image` e `page.cdnId`. |
| `*_keys` | Listas de nomes alternativos procurados no JSON: obra, capítulo, página, parágrafo, título, resumo, capa e ID. |
| `*_path_prefixes`, `*_slug_strip_prefixes`, `chapter_slug_pattern`, `ignored_root_paths`, `hash_series_path_prefixes` | Controlam reconhecimento e limpeza de rotas. |
| `chapter_label_patterns`, `chapter_image_path_hints`, `chapter_image_class_hints`, `cdn_direct_path_prefixes` | Reconhecem rótulos e distinguem imagens reais de elementos decorativos. |

Lista exata dos grupos de extração reconhecidos:

- Obra: `work_object_keys` localiza o objeto; `work_title_keys`, `work_summary_keys` e `work_cover_keys` localizam título, resumo e capa.
- Capítulos: `chapter_object_keys` localiza o envelope; `chapter_array_keys` localiza a lista; `chapter_id_keys`, `chapter_number_keys`, `chapter_title_keys` e `chapter_text_keys` extraem cada valor; `paragraph_array_keys` localiza os parágrafos.
- Páginas: `page_array_keys` localiza a lista; `page_number_keys`, `page_image_keys` e `page_cdn_id_keys` extraem ordem, URL e identificador do CDN.
- Busca: `search_array_keys` e `cover_search_array_keys` localizam listas de resultados de obra e capa.
- Rotas: `base_path_prefix`, `series_path_prefix`, `series_path_prefixes`, `hash_series_path_prefixes`, `chapter_path_prefix`, `chapter_path_prefixes`, `chapter_slug_pattern`, `chapter_slug_strip_prefixes` e `ignored_root_paths` decidem quais URLs representam obra/capítulo e como obter o slug.
- Reconhecimento visual: `chapter_label_patterns`, `chapter_image_path_hints`, `chapter_image_class_hints` e `cdn_direct_path_prefixes` filtram rótulos, classes e caminhos de imagem.

Nos templates use somente os marcadores que o adaptador produz, como `{slug}`, `{workId}`, `{chapter}`, `{chapterId}`, `{page}` e `{page3}`. Um campo declarado sem corresponder ao tráfego real deve falhar no teste, não receber um valor fictício.

## Autenticação e headers

Mapeie `Referer`, cookies de sessão, token por capítulo/página, user agent e headers estáticos separadamente. `request_headers` só transporta valores estáticos do parser; cookies da WebView não devem ser considerados disponíveis no downloader nativo sem um teste real. Nunca grave credenciais pessoais no plugin. Se a fonte exigir login, teste com uma conta autorizada e documente que o plugin depende dessa sessão.

## APIs dinâmicas

Para conteúdo carregado depois do HTML, monte primeiro um plano leve e resolva apenas os capítulos selecionados em `__nyxoviraPrepareDownloadPlan`. Se o hook for assíncrono, confirme que a versão do app usada realmente o aguarda; a versão atual exige que o hook do app termine de forma síncrona. Paginação, rolagem infinita e tokens rotativos precisam ser exercitados até a última página do capítulo.

## APIs criptografadas

Declare `encrypted_response_format` e material de chave somente quando forem observados legitimamente no cliente da própria fonte. O adaptador `aes_json_api` aceita JSON comum, payload `IV:ciphertext` em AES/CBC derivado de `api_secret` e o envelope suportado `rotating_sbox_json`. Declarar o formato não prova que a decodificação funciona: o diagnóstico precisa chegar ao conteúdo e salvar o capítulo inteiro.

## Solução de problemas

- `HTTP 401/403`: confira sessão, cookies, `Referer`, tokens e headers; não aumente tentativas para mascarar bloqueio.
- Obra sem capítulos: confira endpoint, seletor, paginação, ordem e `chapter_array_keys`/`map`.
- Seleção vazia: compare o ID do plano e `selectedChapterIds` byte por byte.
- Páginas vazias ou HTML no lugar de imagem: confira URL base, CDN, content type, token e decodificação.
- Primeira página funciona e outra falha: o capítulo é inválido; o testador deve baixar todas as páginas.
- Funciona na WebView e falha no downloader: declare o parser e reproduza os requisitos de transporte fora da WebView.

## Laboratório Web de Plugins

```bash
cd tester
npm install
npm run web
```

Abra `http://127.0.0.1:4173/`, envie o ZIP do plugin e informe uma obra real que você está autorizado a acessar. O laboratório limitado não possui biblioteca, configurações, catálogos, favoritos nem downloads permanentes. Ele testa um capítulo completo e retorna `PLUGIN_VALID` somente depois de baixar/serializar, gravar e reabrir conteúdo real.

O ZIP, o capítulo e a área do relatório ficam em uma sessão temporária aleatória, eliminada antes da resposta da API. Exija `temporaryFilesDeleted: true` e `sessionStored: false`. O diagnóstico Android é apenas uma verificação final opcional de compatibilidade. Sem rede, informe **“não validado contra o site real”**.

## Checklist antes de entregar

- [ ] `plugin.json` passa em `plugin.schema.json`.
- [ ] Nenhum endpoint, seletor, cabeçalho ou segredo foi inventado.
- [ ] A lista contém IDs únicos e a seleção preserva o ID exato.
- [ ] O primeiro capítulo real resolve páginas ou parágrafos.
- [ ] Headers, cookies, sessão, restrições e criptografia foram testados.
- [ ] Ordem dos capítulos e URLs relativas/absolutas foram conferidas.
- [ ] O laboratório web retornou `PLUGIN_VALID`, `temporaryFilesDeleted: true` e nenhuma etapa `FAIL`.
- [ ] Limitações e conteúdo restrito estão documentados.

## Exemplos completos e sanitizados

Veja [examples/](examples/): `simple-html`, `json-api`, `novel`, `manga` e `encrypted-api`. Eles usam apenas `source.invalid`; substitua os placeholders depois do mapeamento real. Exemplo não é validação.

## Prompt rigoroso para IA

> Crie um plugin Nyxovira para a URL de fonte informada, seguindo esta documentação. Primeiro inspecione a página real, scripts e tráfego de rede e procure API/documentação oficial. Não invente endpoints, seletores, headers, cookies, tokens, chaves nem resultados. Registre URL de obra/leitor, endpoints, IDs, ordem, URLs relativas, autenticação, restrições e criptografia. Use `download_target.js` para descoberta e plano; declare `parser` para API estruturada, headers especiais, criptografia ou download nativo. Garanta que cada `chapter.id` seja exatamente o ID recebido em `selectedChapterIds`. Compacte o plugin em ZIP e teste-o em `tester/` com uma obra e um capítulo reais. Só declare sucesso se o laboratório retornar `PLUGIN_VALID`, nenhuma etapa `FAIL` e `temporaryFilesDeleted: true`. Se não houver acesso à rede, escreva “não validado contra o site real”.

## Distribuição independente

A criação do plugin termina após importação e validação completa. Compartilhar o mesmo plugin pronto por um catálogo externo independente é um processo opcional separado, não outro tipo de plugin. Os usuários conectam esse catálogo manualmente no Nyxovira. O catálogo do KapiTomo não aceita publicações de terceiros. Distribuição não substitui autorização, conformidade com a fonte nem validação técnica.

Uma loja externa publica por HTTPS uma página e um `catalog.json`. A página declara `<link rel="nyxovira-plugin-catalog" href="catalog.json">`; o catálogo usa `hub_url` e, em cada entrada, `manifest_url`. Também são aceitos `repository_url`, `repository_ref` e `plugin_path`. O botão da página chama `installCommunityPlugin(catalogUrl, JSON.stringify({ id }))` quando aberto dentro do Nyxovira. O repositório, o catálogo e a revisão continuam sob responsabilidade de quem os publicou.
