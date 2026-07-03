# Colocar obras no KapiTomo

Cole cada obra em uma pasta dentro de `obras/` e rode:

```powershell
.\gerar-kapitomo.cmd
```

## Novel

```text
obras/minha-obra/
|-- capa.png
|-- obra.json
\-- capitulos/
    |-- capitulo-001.json
    |-- capitulo-002.json
    \-- capitulo-003.json
```

Capítulo:

```json
{
  "title": "Capítulo 01 - A Queda",
  "paragraphs": [
    "Primeiro parágrafo.",
    "Segundo parágrafo."
  ]
}
```

## Quadrinho

```text
obras/minha-obra/
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

## Metadados da obra

`obra.json` é opcional.

```json
{
  "title": "Minha Obra",
  "summary": "Resumo curto da obra.",
  "type": "novel",
  "cover": "capa.png"
}
```

Se `obra.json` não existir, o gerador usa o nome da pasta, encontra uma capa e cria o resto automaticamente.
