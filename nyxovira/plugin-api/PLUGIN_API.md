# Nyxovira Plugin API

Portuguese version: [PLUGIN_API.pt-BR.md](PLUGIN_API.pt-BR.md)

This document explains how to create and publish a Nyxovira plugin.

A plugin connects Nyxovira to one reading site. It opens the site, recognizes the work page, shows the chapter list as soon as the user taps download, and prepares only the chapters selected by the user.

## How a Plugin Works

1. The creator publishes a GitHub repository with the plugin files.
2. The Plugin Hub reads `plugin.json` to show the plugin name, icon, tags, site, and repository.
3. Nyxovira installs the plugin from that repository.
4. When the user opens a supported site, `browser/download_target.js` reads the current page and creates the chapter list.
5. After the user chooses chapters, the same script prepares the selected text or image pages for saving on the device.

## Plugin Files

Create one folder named after the plugin id:

```text
my-plugin/
|-- plugin.json
`-- browser/
    `-- download_target.js
```

| File | Purpose |
| --- | --- |
| `plugin.json` | Defines the plugin id, name, version, supported hosts, browser entry, icon, and parser. |
| `browser/download_target.js` | Runs inside the page opened by Nyxovira and returns the work download plan. |

Use the same stable id in the folder name and in `plugin.json`.

## plugin.json

Example:

```json
{
  "schema_version": 1,
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "match": {
    "hosts": ["example.com"]
  },
  "browser": {
    "home_url": "https://example.com/",
    "icon_url": "https://example.com/icon.png",
    "icon_mode": "pinned",
    "short_label": "Source",
    "download_target_script_file": "browser/download_target.js"
  },
  "parser": {
    "adapter": "html_series",
    "base_url": "https://example.com",
    "static_works_script": "https://example.com/data/works.js",
    "base_path_prefix": "",
    "series_path_prefix": "manga",
    "hash_series_path_prefixes": ["work", "read"],
    "chapter_path_prefix": "chapter",
    "chapter_slug_pattern": ".+"
  }
}
```

Main fields:

| Field | Meaning |
| --- | --- |
| `id` | Stable plugin id. Use lowercase letters, numbers, dashes, dots, or underscores. |
| `name` | Name displayed in the app. |
| `version` | Plugin version. Increase it whenever publishing a fix. |
| `match.hosts` | Domains recognized by this plugin. |
| `browser.home_url` | Page opened by the app browser. |
| `browser.icon_url` | Public icon image. Online plugins must have one. |
| `browser.download_target_script_file` | Browser script that detects the open work. |
| `parser.adapter` | Site parser type. Use `html_series` for simple sites or JS indexes. |
| `parser.base_url` | Base URL used to resolve relative links. |

## Site Mapping

Map the site's names to the fields Nyxovira expects. This keeps each plugin responsible for the site it supports.

Example:

```js
var plugin = {
  siteBaseUrl: "https://example.com",
  siteVariable: "EXAMPLE_WORK_INDEX",
  siteRoutes: {
    detailsHash: "series",
    readerHash: "reader"
  },
  appRoutes: {
    publicSeriesPath: "manga",
    publicChapterPath: "chapter"
  },
  fields: {
    workId: "slug",
    workTitle: "name",
    workSummary: "synopsis",
    workCover: "cover_url",
    workChapters: "episodes",
    chapterTitle: "name",
    chapterContentType: "format",
    chapterParagraphs: "text_blocks",
    chapterPages: "page_urls",
    chapterImages: "image_list",
    imageSource: "url"
  }
};
```

This lets the site keep its own route and field names while Nyxovira receives the work title, cover, chapters, text, and page images in a predictable format.

## Instant Chapter List

When the user taps download, the script should immediately set:

```js
window.__nyxoviraChapterPlan = JSON.stringify({
  title: "Work title",
  summary: "Short summary",
  canonicalUrl: "https://example.com/manga/work-slug/",
  coverUrl: "https://example.com/cover.png",
  chapters: [
    {
      id: "chapter-forest-hunt",
      number: "1",
      title: "The Forest Hunt",
      label: "1 - The Forest Hunt",
      url: "https://example.com/manga/work-slug/chapter/1/",
      contentType: "novel",
      paragraphs: ["First paragraph.", "Second paragraph."]
    }
  ]
});
```

Then the script returns the canonical work URL:

```js
return "https://example.com/manga/work-slug/";
```

Nyxovira shows the chapter list from `window.__nyxoviraChapterPlan` immediately.

## Prepare After Selection

For large comics or APIs where each chapter must be loaded separately, do not load every page before the chapter list appears.

Set a lightweight chapter plan first:

```js
{
  "id": "id:387076",
  "number": "1",
  "title": "Arrival at the Ruins",
  "contentType": "images",
  "url": "https://example.com/read/work/387076",
  "chapterDataPath": "/api/chapter/387076"
}
```

Then implement:

```js
window.__nyxoviraPrepareDownloadPlan = function (context) {
  var selectedIds = Array.isArray(context.selectedChapterIds)
    ? context.selectedChapterIds
    : [];
  var plan = context.chapterPlan;

  plan.chapters.forEach(function (chapter) {
    if (selectedIds.length > 0 && selectedIds.indexOf(chapter.id) < 0) {
      return;
    }

    var payload = getJson(chapter.chapterDataPath);
    chapter.pages = payload.pages.map(function (page) {
      return page.imageUrl;
    });
    delete chapter.chapterDataPath;
  });

  window.__nyxoviraChapterPlan = JSON.stringify(plan);
  return plan;
};
```

Nyxovira calls this only after the user chooses chapters and confirms the download. This keeps the first download click fast while still downloading every selected page correctly.

The app passes `{ selectedChapterIds, chapterPlan }` to the function. The function may return the final plan object or a JSON string. If it returns nothing, Nyxovira keeps the original chapter plan.

## Chapter Formats

Novel chapter:

```json
{
  "id": "chapter-forest-hunt",
  "title": "The Forest Hunt",
  "contentType": "novel",
  "paragraphs": [
    "First paragraph.",
    "Second paragraph."
  ]
}
```

Comic chapter:

```json
{
  "id": "chapter-arrival",
  "title": "Arrival at the Ruins",
  "contentType": "images",
  "pages": [
    "https://example.com/page-001.png",
    "https://example.com/page-002.png"
  ]
}
```

For image chapters, `pages` is the preferred field. Nyxovira also reads `images` for compatibility.

## Plugin Hub

The Plugin Hub installs plugins directly from public GitHub repositories.

Publication requests are validated automatically and technically valid entries that accept the current catalog rules are published immediately. The validation prevents duplicate plugins for the same source, verifies repository ownership, and rejects repositories that do not meet the public technical requirements. Automatic publication is not an endorsement of the source or third-party content.

The Plugin Hub is a catalog, not a content host. The plugin creator is responsible for the plugin code, site mapping, icon, metadata, permissions, and maintenance. Source sites are responsible for their own pages and content. Nyxovira Pro unlocks app features and does not sell third-party works, pages, chapters, translations, or plugins.

The catalog entry uses:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "author": "Author",
  "version": "1.0.0",
  "description": "Site plugin for Nyxovira.",
  "site_url": "https://example.com/",
  "homepage": "https://example.com/",
  "icon_url": "https://example.com/icon.png",
  "repository_url": "https://github.com/user/my-plugin",
  "repository_ref": "main",
  "plugin_path": ".",
  "hosts": ["example.com"],
  "status": "active",
  "tags": ["english", "manga", "novel"]
}
```

| Field | Meaning |
| --- | --- |
| `repository_url` | GitHub repository containing `plugin.json`. |
| `repository_ref` | Branch or ref to install from. Usually `main`. |
| `plugin_path` | Folder containing `plugin.json`. Use `.` when the manifest is at the repository root. |
| `hosts` | Domains covered by the plugin. The Hub derives this from `match.hosts`, `browser.home_url`, `site_url`, and `homepage`. A host can only have one visible plugin in the catalog. |
| `status` | Catalog state. See the status values below. |
| `tags` | Required. Use one language tag first, then one to three content type tags. Unsupported tags and extra tags are ignored. |

Official public tags:

Language tags:

- `english`
- `portuguese`
- `spanish`
- `japanese`
- `korean`
- `chinese`
- `indonesian`
- `thai`
- `vietnamese`
- `french`
- `german`
- `italian`
- `russian`
- `arabic`

Content type tags:

- `manga`
- `manhua`
- `manhwa`
- `novel`
- `webtoon`
- `comic`

There is no package URL in the public publishing format. The repository is the source of the plugin.

Publishing flow:

1. Paste the plugin's GitHub repository in the Plugin Hub.
2. Confirm the generated GitHub request.
3. Automation validates `plugin.json`, the public icon, official tags, repository, and covered hosts.
4. If another visible plugin already covers the same host, the request is rejected.
5. The request author must own the plugin repository.
6. The generated request must accept the current Plugin Hub catalog rules.
7. Automation publishes the technically valid catalog entry immediately.

Review rules:

- The Hub checks the repository, icon, official tags, and covered hosts.
- A visible host can only have one plugin.
- Only the repository owner can publish or update a community plugin.
- Technically valid requests that accept the current rules are published automatically.
- Plugin owners can remove their own plugins automatically. Maintainers can hide, restore, or remove any plugin through an authenticated moderation request.
- A creator cannot republish over a hidden or moderator-removed entry. A maintainer must review or restore it first. Creator-requested removals may be republished by that creator.
- If the repository or `plugin.json` is missing for two consecutive checks, the entry is marked as removed.
- Technical validation does not decide copyright ownership or source authorization. Credible reports are reviewed under the public [Terms and Plugin Catalog Rules](https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules).

Status values:

- `active`: appears as Online.
- `broken`: appears as Offline.
- `hidden`: does not appear while a credible security, rights, identity, or policy report is reviewed.
- `removed`: does not appear after an authorized request, confirmed violation, or repeated repository/manifest absence.
- The Hub checks plugins every 30 minutes. Temporary source failures remain recoverable and do not by themselves cause permanent removal.

## Checklist

Before publishing:

1. `plugin.json` has a stable `id`, `version`, `match.hosts`, `browser.home_url`, and `browser.icon_url`.
2. `plugin.json.tags` has an official language first and at least one official content type after it.
3. `browser/download_target.js` returns the current work URL.
4. The first download click creates a chapter plan immediately.
5. Large chapters prepare their pages through `window.__nyxoviraPrepareDownloadPlan`.
6. Novel chapters use `paragraphs`.
7. Comic chapters use `pages`; `images` is accepted for compatibility.
8. The plugin works from a clean GitHub repository.
9. No visible plugin in the public catalog already covers the same source host.
10. The repository is submitted through the online Plugin Hub.
11. The creator accepts the current catalog rules and responsibility for the plugin code, metadata, permissions, maintenance, and source mapping.
12. The plugin does not contain malware, steal data or credentials, impersonate another party, or bypass authentication, paywalls, DRM, or access restrictions.
