# KapiTomo

KapiTomo is Nanquimori's official site for publishing original works and providing clean data and official plugins to Nyxalira and Nyxovira.

- Website: https://nanquimori.github.io/KapiTomo/
- Official plugins: https://nanquimori.github.io/KapiTomo/plugins/
- Plugin catalog: https://nanquimori.github.io/KapiTomo/plugins/catalog-store.json
- Plugin API: https://nanquimori.github.io/KapiTomo/nyxovira/plugin-api/
- Terms: https://nanquimori.github.io/KapiTomo/terms/
- Privacy: https://nanquimori.github.io/KapiTomo/privacy/

## Public Map

```text
/
|-- Site reader and work pages
|-- api/
|   |-- works/index.json
|   |-- works/{work}/index.json
|   `-- works/{work}/chapters/{chapter}.json
|-- plugins/
|   |-- index.html
|   |-- catalog-store.json
|   `-- catalog.json
|-- terms/
|-- privacy/
|-- nyxovira/
|   |-- plugin-api/
|   `-- privacy/
`-- nyxalira/
    `-- privacy/
```

`plugins/catalog-store.json` is the official catalog consumed by Nyxovira. `plugins/catalog.json` is a compatible public alias. Both contain only plugins maintained and published by Nanquimori.

The Plugin API documents two independent uses:

1. a personal plugin imported locally into Nyxovira;
2. an independently hosted external catalog that a user connects manually.

External catalogs and their plugins are not submitted to, copied into, reviewed by, or published through KapiTomo.

## Work Structure

Novel:

```text
works/my-novel/
|-- work.json
|-- cover.png
`-- chapters/
    |-- chapter-001.json
    `-- chapter-002.json
```

Novel chapter:

```json
{
  "title": "Chapter 01 - The Fall",
  "paragraphs": ["First paragraph.", "Second paragraph."]
}
```

Comic:

```text
works/my-comic/
|-- work.json
|-- cover.png
`-- chapters/
    `-- chapter-001/
        |-- page-001.png
        `-- page-002.png
```

`work.json` can define title, summary, type, and cover. If it does not exist, the generator uses the folder name and the first cover it finds.

## Generated Output

The generator publishes:

```text
data/works.js
api/works/index.json
api/works/{work}/index.json
api/works/{work}/chapters/{chapter}.json
assets/works/
manga/
```

Do not edit generated work output by hand. Edit `works/` and run the generator again.

## Published Formats

Novel content is published with `text` and `paragraphs`. Comic content is published with `pages` and image metadata. New integrations should use `api/works/index.json`.

## Official Plugin Catalog

The catalog page installs only KapiTomo plugins published by Nanquimori. A plugin entry uses:

- `repository_url`, `repository_ref`, and `plugin_path` for installation;
- `hosts` for its supported site;
- `icon_url` for the public site icon;
- Portuguese or English language metadata and content-type metadata.

New official entries are maintained directly in this repository.

## Independent Catalogs

Nyxovira users may manually connect an external catalog URL. Anyone who wants to distribute plugins can host their own page and catalog by following the Plugin API documentation. That catalog remains independent and must not present itself as part of KapiTomo.

## Content Policy

KapiTomo publishes its own original works. Readers may read them for free, but copyright remains with the author unless a work states another license. Downloading or technical access does not grant permission to redistribute, sell, republish, or claim authorship.
