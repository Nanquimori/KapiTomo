# KapiTomo API

The public API lives in `api/works/` and uses JSON for works and chapters.

## Endpoints

Main work index:

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

Legacy catalog:

```text
api/catalog.json
```

Use `api/works/index.json` for new integrations.

## Work Object

Work indexes expose the reading metadata used by the site and apps:

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

Novel chapters should use `paragraphs`. The `text` field is a generated convenience field made from those paragraphs.

Image chapters should use `pages`; each page can include an image URL and page metadata.

## Plugin Catalog

The plugin catalog is separate from the work API:

```text
plugins/catalog-store.json
plugins/catalog.json
```

The Plugin Hub validates public GitHub repositories, repository ownership, policy acceptance, official tags, source hosts, and health status before a plugin appears in the storefront. Automatic publication confirms technical eligibility, not endorsement of a source or third-party content.

KapiTomo does not host or sell third-party works through the plugin catalog. Community plugins remain in their creators' public repositories. Maintainers may mark a plugin offline, hide it during a credible review, restore it, or remove it after a confirmed violation, authorized owner request, or repeated repository absence. Nyxovira Pro unlocks app features; it is not payment for third-party content.
