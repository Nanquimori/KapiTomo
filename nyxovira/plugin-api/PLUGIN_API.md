# Nyxovira Plugin API

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

The app passes `{ selectedChapterIds, chapterPlan }` to the function. The function may return the final plan object or a JSON string. If it returns nothing, Nyxovira keeps the original chapter plan.

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

For image chapters, `pages` is the preferred field. Nyxovira also reads `images` for compatibility.

## Plugin Hub

The Plugin Hub installs plugins directly from public GitHub repositories.

The public catalog is reviewed. A publication request is validated automatically, but it only appears online after a maintainer approves it. This prevents duplicate plugins for the same site and avoids filling the catalog with sources that do not work.

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
| `status` | Catalog state. `active` appears as `Online`, `broken` appears as `Offline`, and `hidden` or `removed` do not appear in the public storefront. |
| `tags` | Required. Tags are not free-form. Use one official language tag first, then one to three official type tags. The Hub publishes the first 4 valid public tags and ignores unsupported or extra tags. |

Official public tags:

| Group | Allowed tags |
| --- | --- |
| Language | `english`, `portuguese`, `spanish`, `japanese`, `korean`, `chinese`, `indonesian`, `thai`, `vietnamese`, `french`, `german`, `italian`, `russian`, `arabic` |
| Type | `manga`, `manhua`, `manhwa`, `novel`, `webtoon`, `comic`, `doujinshi`, `yaoi`, `yuri`, `porn` |

Use `porn` only for sources centered on explicit sexual content. The Hub does not use `adult` because it is too broad and makes filtering less precise.

There is no package URL in the public publishing format. The repository is the source of the plugin.

Publishing flow:

1. Paste the plugin's GitHub repository in the Plugin Hub.
2. Confirm the generated GitHub request.
3. Automation validates `plugin.json`, the public icon, official tags, repository, and covered hosts.
4. If another visible plugin already covers the same host, the request is rejected.
5. A maintainer adds the approval label.
6. Automation publishes the catalog entry.

The Hub also runs a light health check every 30 minutes. If the source site fails twice in a row, the plugin is marked as `broken` and appears as `Offline`. If the GitHub repository or `plugin.json` disappears, the entry is removed from the public catalog.

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
11. The creator accepts responsibility for the plugin and does not present unauthorized third-party content as KapiTomo or Nyxovira content.
