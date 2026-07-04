# Works Folder

Drop each work inside its own folder.

## Novel

```text
works/my-novel/
|-- work.json
|-- cover.png
`-- chapters/
    |-- chapter-001.json
    `-- chapter-002.json
```

Chapter:

```json
{
  "title": "Chapter 01 - The Fall",
  "paragraphs": [
    "First paragraph.",
    "Second paragraph."
  ]
}
```

## Comic

```text
works/my-comic/
|-- work.json
|-- cover.png
`-- chapters/
    `-- chapter-001/
        |-- page-001.png
        `-- page-002.png
```

## work.json

`work.json` is optional.

```json
{
  "title": "My Work",
  "summary": "Short work summary.",
  "type": "novel",
  "cover": "cover.png"
}
```

If `work.json` does not exist, the generator uses the folder name, finds a cover, and creates the remaining metadata automatically.
