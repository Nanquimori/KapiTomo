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

Capitulo:

```json
{
  "title": "Capitulo 01 - A Queda",
  "paragraphs": [
    "Primeiro paragrafo.",
    "Segundo paragrafo."
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

`obra.json` e opcional.

```json
{
  "title": "Minha Obra",
  "summary": "Resumo curto da obra.",
  "type": "novel",
  "cover": "capa.png"
}
```

Se `obra.json` nao existir, o gerador usa o nome da pasta, encontra uma capa e cria o resto automaticamente.
