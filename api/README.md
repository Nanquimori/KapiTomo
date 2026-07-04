# KapiTomo API

The public API lives in `api/works/` and uses JSON for works and chapters.

Main index:

```text
api/works/index.json
```

Work details:

```text
api/works/{work}/index.json
```

Chapter details:

```text
api/works/{work}/chapters/{chapter}.json
```

Novel chapter example:

```json
{
  "id": "chapter-001",
  "title": "Chapter 01",
  "contentType": "novel",
  "text": "Full chapter text.",
  "paragraphs": ["First paragraph.", "Second paragraph."]
}
```

Comic chapter example:

```json
{
  "id": "chapter-001",
  "title": "Chapter 001",
  "contentType": "images",
  "pages": [
    "https://example.com/page-001.png"
  ]
}
```

`catalog.json` exists only as a published catalog file. The primary work API is `works/index.json`.
