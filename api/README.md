# KapiTomo API

A API publica fica em `api/works/` e usa JSON para obras e capitulos.

## Arquivos

```text
api/
|-- catalog.json
\-- works/
    |-- index.json
    |-- garoto-outro-mundo/
    |   |-- index.json
    |   \-- chapters/
    |       |-- capitulo-001.json
    |       |-- capitulo-002.json
    |       \-- capitulo-003.json
    \-- garoto-outro-mundo-imagens/
        |-- index.json
        \-- chapters/
            |-- capitulo-001.json
            |-- capitulo-002.json
            \-- capitulo-003.json
```

## Contrato

`works/index.json` lista todas as obras.

`works/{obra}/index.json` descreve a obra, capa, resumo e capitulos.

`works/{obra}/chapters/{capitulo}.json` descreve um capitulo.

Novel:

```json
{
  "contentType": "novel",
  "text": "Texto completo do capitulo.",
  "paragraphs": ["Primeiro paragrafo.", "Segundo paragrafo."]
}
```

Quadrinho:

```json
{
  "contentType": "images",
  "pages": [
    {
      "number": 1,
      "url": "https://nanquimori.github.io/KapiTomo/assets/works/obra/capitulo/page-001.png"
    }
  ]
}
```

`catalog.json` existe para compatibilidade. O formato principal e `works/index.json`.
