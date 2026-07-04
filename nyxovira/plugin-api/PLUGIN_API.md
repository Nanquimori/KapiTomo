# Nyxovira Plugin API

This document explains how to build a source addon for Nyxovira.

A source addon connects one reading site to the app. It tells Nyxovira which page to open, how to recognize an open work, how to list chapters immediately, and how to prepare text or image pages for offline download.

The app stays generic. Source-specific routes, field names, and download rules live inside the addon.

## Addon Files

Create one folder named after the source id:

```text
my-source/
|-- plugin.json
`-- browser/
    `-- download_target.js
```

| File | Purpose |
| --- | --- |
| `plugin.json` | Defines the addon id, name, version, supported hosts, browser entry, icon, and parser. |
| `browser/download_target.js` | Runs inside the page opened by Nyxovira and returns the work download plan. |

Use the same stable id in the folder name and in `plugin.json`.

## plugin.json

Example:

```json
{
  "schema_version": 1,
  "id": "my-source",
  "name": "My Source",
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
| `id` | Stable addon id. Use lowercase letters, numbers, dashes, dots, or underscores. |
| `name` | Name displayed in the app. |
| `version` | Addon version. Increase it whenever publishing a fix. |
| `match.hosts` | Domains recognized by this addon. |
| `browser.home_url` | Page opened by the app browser. |
| `browser.icon_url` | Public icon image. Online plugins must have one. |
| `browser.download_target_script_file` | Browser script that detects the open work. |
| `parser.adapter` | Source parser type. Use `html_series` for simple sites or JS indexes. |
| `parser.base_url` | Base URL used to resolve relative links. |

## Routes And Fields

Do not hardcode language support in the app. Put the source mapping in the addon.

Example:

```js
var addon = {
  siteBaseUrl: "https://example.com",
  sourceVariable: "EXAMPLE_WORK_INDEX",
  sourceRoutes: {
    detailsHash: "series",
    readerHash: "reader"
  },
  nyxoviraRoutes: {
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

This lets the site keep its own route and field names while Nyxovira receives one consistent format.

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
      id: "chapter-1",
      number: "1",
      title: "Chapter 1",
      label: "Chapter 1",
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
  "title": "Chapter 1",
  "contentType": "images",
  "url": "https://example.com/read/work/387076",
  "chapterDataPath": "/api/chapter/387076"
}
```

Then implement:

```js
window.__nyxoviraPrepareDownloadPlan = function (context) {
  var selectedIds = context.selectedChapterIds || [];
  var plan = context.chapterPlan;

  plan.chapters.forEach(function (chapter) {
    if (selectedIds.length && selectedIds.indexOf(chapter.id) < 0) return;

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

## Chapter Formats

Novel chapter:

```json
{
  "id": "chapter-1",
  "title": "Chapter 1",
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
  "id": "chapter-1",
  "title": "Chapter 1",
  "contentType": "images",
  "pages": [
    "https://example.com/page-001.png",
    "https://example.com/page-002.png"
  ]
}
```

## Plugin Hub

The Plugin Hub installs addons directly from public GitHub repositories.

The catalog entry uses:

```json
{
  "id": "my-source",
  "name": "My Source",
  "author": "Author",
  "version": "1.0.0",
  "description": "Source plugin for Nyxovira.",
  "site_url": "https://example.com/",
  "homepage": "https://example.com/",
  "icon_url": "https://example.com/icon.png",
  "repository_url": "https://github.com/user/my-source",
  "repository_ref": "main",
  "plugin_path": ".",
  "tags": ["english", "manga", "novel"]
}
```

| Field | Meaning |
| --- | --- |
| `repository_url` | Public GitHub repository containing `plugin.json`. |
| `repository_ref` | Branch or ref to install from. Usually `main`. |
| `plugin_path` | Folder containing `plugin.json`. Use `.` when the manifest is at the repository root. |
| `tags` | Short lowercase labels for language and content type, such as `english`, `portuguese`, `spanish`, `manga`, `manhua`, `manhwa`, `novel`, or another source-specific category. |

There is no package URL in the public contract. The repository is the source of the addon.

## Checklist

Before publishing:

1. `plugin.json` has a stable `id`, `version`, `match.hosts`, `browser.home_url`, and `browser.icon_url`.
2. `browser/download_target.js` returns the current work URL.
3. The first download click creates a chapter plan immediately.
4. Large chapters prepare their pages through `window.__nyxoviraPrepareDownloadPlan`.
5. Novel chapters use `paragraphs`.
6. Comic chapters use `pages`.
7. The addon works from a clean public GitHub repository.
8. The repository is submitted through the online Plugin Hub.
