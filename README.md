# KapiTomo

KapiTomo é o site oficial para publicar obras autorais e entregar dados limpos para Nyxalira, Nyxovira e plugins.

## Links

```text
Site: https://nanquimori.github.io/KapiTomo/
Plugin: https://nanquimori.github.io/KapiTomo/downloads/plugins/kapitomo.zip
Catálogo de plugins: https://nanquimori.github.io/KapiTomo/plugins/catalog.json
API: https://nanquimori.github.io/KapiTomo/api/works/index.json
```

## Onde colocar obras

Use somente a pasta `obras/` como entrada.

Novel:

```text
obras/minha-novel/
|-- capa.png
|-- obra.json
\-- capitulos/
    |-- capitulo-001.json
    \-- capitulo-002.json
```

Capítulo novel:

```json
{
  "title": "Capítulo 01 - A Queda",
  "paragraphs": [
    "Primeiro parágrafo.",
    "Segundo parágrafo."
  ]
}
```

Quadrinho por imagens:

```text
obras/meu-quadrinho/
|-- capa.png
|-- obra.json
\-- capitulos/
    |-- capitulo-001/
    |   |-- page-001.png
    |   \-- page-002.png
    \-- capitulo-002/
        |-- page-001.png
        \-- page-002.png
```

`obra.json` pode definir título, resumo, tipo e capa. Se ele não existir, o gerador usa o nome da pasta e a primeira capa encontrada.

## Gerar site e API

Depois de colar ou alterar uma obra, rode:

```powershell
.\gerar-kapitomo.cmd
```

Saidas geradas:

```text
data/works.js
api/catalog.json
api/works/
assets/works/
manga/
downloads/plugins/kapitomo.zip
plugins/catalog.json
```

Não edite essas saídas na mão. Edite `obras/` e gere de novo.

## Formato publicado

Novel publica texto dentro do JSON do capítulo, com `text` e `paragraphs`.

Quadrinho publica imagens em `pages`.

Novas integrações devem usar `api/works/index.json`.
