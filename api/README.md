# KapiTomo API

A API pública fica em `api/works/` e usa JSON para obras e capítulos.

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

`works/{obra}/index.json` descreve a obra, capa, resumo e capítulos.

`works/{obra}/chapters/{capitulo}.json` descreve um capítulo.

Novel:

```json
{
  "contentType": "novel",
  "text": "Texto completo do capítulo.",
  "paragraphs": ["Primeiro parágrafo.", "Segundo parágrafo."]
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

`catalog.json` existe para compatibilidade. O formato principal é `works/index.json`.
