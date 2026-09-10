# KapiTomo API

The public API lives in `api/works/` and uses JSON for works and chapters.

## Endpoints

```text
api/works/index.json
api/works/{work}/index.json
api/works/{work}/chapters/{chapter}.json
```

`api/catalog.json` is a legacy work catalog. New integrations should use `api/works/index.json`.

## Work Object

```json
{
  "id": "work-id",
  "slug": "work-id",
  "title": "Work title",
  "summary": "Short summary",
  "contentType": "novel",
  "cover": "https://example.com/cover.png",
  "url": "https://example.com/manga/work-id/",
  "apiUrl": "https://example.com/api/works/work-id/index.json",
  "chapters": []
}
```

`contentType` is `novel` for text chapters and `images` for image chapters.

## Chapter Objects

Novel:

```json
{
  "id": "chapter-001",
  "title": "Chapter 01",
  "contentType": "novel",
  "text": "Full chapter text.",
  "paragraphs": ["First paragraph.", "Second paragraph."]
}
```

Comic:

```json
{
  "id": "chapter-001",
  "title": "Chapter 001",
  "contentType": "images",
  "pages": ["https://example.com/page-001.png"]
}
```

Novel chapters should use `paragraphs`. Image chapters should use `pages`.

## Official Plugin Catalog

The plugin catalog is separate from the work API:

```text
plugins/catalog-store.json
plugins/catalog.json
```

It contains only official plugins maintained and published by Nanquimori. Independent catalogs are hosted elsewhere and connected manually by Nyxovira users.
