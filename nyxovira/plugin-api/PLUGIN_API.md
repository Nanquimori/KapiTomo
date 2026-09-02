# Nyxovira Plugin API

Portuguese version: [PLUGIN_API.pt-BR.md](PLUGIN_API.pt-BR.md)

This document explains how to create and publish a Nyxovira plugin.

A plugin connects Nyxovira to one reading site. It opens the site, recognizes the work page, shows the chapter list as soon as the user taps download, and prepares only the chapters selected by the user.

## Start With Your Goal

| I want to... | Read first |
| --- | --- |
| Create the plugin files | [Plugin Files](#plugin-files) and [`plugin.json`](#pluginjson) |
| Create a website with its own catalog and Install button | [External Plugin Sites](#external-plugin-sites) |
| Build chapter lists and downloads | [Instant Chapter List](#instant-chapter-list) |
| Publish in the official catalog | [Publish in the Official Plugin Hub](#publish-in-the-official-plugin-hub) |

## How a Plugin Works

1. The creator prepares `plugin.json` and `browser/download_target.js`.
2. The plugin can be imported manually, published in the official Plugin Hub, or offered through an external site's catalog.
3. Nyxovira installs the same files through the entry point selected by the user.
4. When the user opens a supported site, `browser/download_target.js` reads the current page and creates the chapter list.
5. After the user chooses chapters, the same script prepares the selected text or image pages for saving on the device.

## Three Installation Modes

Nyxovira provides three different plugin entry points:

1. **Import plugins**: manually installs plugin files selected by the user without using a public catalog.
2. **Online plugins**: opens the official KapiTomo Plugin Hub, which displays and installs plugins published in the official catalog.
3. **External sites**: connects the HTTPS page of an independent plugin store. The external page displays, searches, and organizes its own plugins and can request direct installation while open inside Nyxovira.

An external site is not incorporated into the Plugin Hub, and its plugins are not mixed into the official catalog. Nyxovira stores only the association between the connected page and its catalog.

## External Plugin Sites

A minimal external store can use this structure:

```text
plugin-store/
|-- index.html
|-- catalog.json
`-- plugins/
    `-- my-plugin/
        |-- plugin.json
        `-- browser/
            `-- download_target.js
```

Host the folder at a public HTTPS address. The appearance, search, and cards belong to the site itself; Nyxovira only needs to discover the catalog and receive the installation request.

### Catalog discovery

Add this declaration to the store's main page:

```html
<link rel="nyxovira-plugin-catalog" href="catalog.json">
```

This form is also supported:

```html
<meta name="nyxovira-plugin-catalog" content="catalog.json">
```

Without a declaration, Nyxovira looks for `catalog.json`, `catalog-store.json`, and `plugins.json` in the page's directory. The user may also connect the JSON URL directly.

### External catalog format

```json
{
  "schema_version": 1,
  "name": "My plugin store",
  "hub_url": "https://plugins.example.com/",
  "plugins": [
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "author": "Author",
      "version": "1.0.0",
      "manifest_url": "plugins/my-plugin/plugin.json",
      "icon_url": "https://example.com/icon.png",
      "site_url": "https://example.com/",
      "tags": ["english", "manga"],
      "status": "active"
    }
  ]
}
```

`hub_url` tells Nyxovira which page to open when the user connects the JSON URL directly. `store_url` and `homepage` are also accepted. Relative URLs such as `manifest_url` are resolved against the catalog URL. An entry may alternatively use `repository_url`, `repository_ref`, and `plugin_path` in the same format as the Plugin Hub.

### Installation from the external page

This complete example creates the button, explains when the page is open outside the app, and shows the result returned by Nyxovira:

```html
<button id="install-my-plugin" type="button">Install My Plugin</button>
<p id="install-status" aria-live="polite"></p>

<script>
  const catalogUrl = new URL("catalog.json", location.href).href;
  const status = document.querySelector("#install-status");

  document.querySelector("#install-my-plugin").addEventListener("click", () => {
    const bridge = globalThis.NyxoviraAndroidBridge
      || globalThis.ArchiveInkAndroidBridge;

    if (!bridge || typeof bridge.installCommunityPlugin !== "function") {
      status.textContent = "Open this site from Nyxovira to install.";
      return;
    }

    try {
      const result = JSON.parse(
        bridge.installCommunityPlugin(
          catalogUrl,
          JSON.stringify({ id: "my-plugin" })
        ) || "{}"
      );
      status.textContent = result.message
        || (result.success ? "Plugin installed." : "Could not install the plugin.");
    } catch (error) {
      status.textContent = "Could not complete the installation.";
    }
  });
</script>
```

The bridge authorizes installation only while the user remains inside the connected site. Nyxovira downloads the associated catalog again and finds the plugin by `id`; the page cannot replace the connected catalog with an arbitrary URL.

`getCommunityPluginCatalog(catalogUrl)`, `getOnlinePluginCatalog()`, and `installOnlinePlugin(pluginJson)` are also available. The last two are compatibility aliases for stores that reuse an interface originally built for the official Plugin Hub.

### Limits and security

- A user can keep up to 20 external sites connected.
- The page, catalog, and every redirect must use HTTPS and public addresses; local networks and `localhost` are rejected.
- A catalog may contain up to 2 MiB and 1,000 plugins. Each manifest or script may contain up to 4 MiB.
- Duplicate IDs and manifests whose `id` does not match the catalog entry are rejected.
- Installation permission is removed when the browser leaves the connected site's authorized path.
- External sites and their plugins are independent and are neither reviewed nor published by KapiTomo.

### Test before sharing

1. Publish every file over HTTPS.
2. In Nyxovira, open **Sites > External sites** and connect the URL of `index.html` or the store directory.
3. Open the site from the card created in the app.
4. Tap **Install** and confirm the returned message.
5. Navigate outside the store directory and confirm that installation is no longer authorized.

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
  "tags": ["english", "manga"],
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

## Publish in the Official Plugin Hub

Use this option only when you want the plugin to appear in the official catalog. The public GitHub repository is the installation source; do not manually write a `catalog.json` entry.

Before submitting, `plugin.json` must have a public HTTPS icon and a `tags` list containing one language first, one to three content types, and `adult` last when needed.

Accepted tags:

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
- `other`

Optional classification:

- `adult`: place it last when the source exposes adult-restricted material.

How to publish:

1. Paste the plugin's GitHub repository in the Plugin Hub.
2. Confirm the generated GitHub request and accept the current rules.
3. Automation checks the files, icon, tags, hosts, and whether the requester owns the repository.
4. A technically valid request is published in the catalog.

Only one visible plugin may cover a host. Responsibility, review, correction, and removal rules are in the [Terms and Plugin Catalog Rules](https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules).

## Final Checklist

For every plugin:

1. `plugin.json` has valid `id`, `version`, `match.hosts`, `browser.home_url`, and `browser.download_target_script_file` values.
2. `browser/download_target.js` recognizes the work and creates the chapter list.
3. Novels use `paragraphs`; comics use `pages`.
4. The plugin contains no malware, does not collect credentials, and does not bypass authentication, paywalls, DRM, or access restrictions.

For an external site:

1. The page and every file use public HTTPS URLs.
2. `index.html` declares `nyxovira-plugin-catalog`.
3. `catalog.json` contains `schema_version`, `name`, `hub_url`, and `plugins`.
4. Every `manifest_url` exists and points to a manifest with the same `id`.
5. The button handles both the presence and absence of the Android bridge.
6. Installation was tested inside Nyxovira's internal browser.

For the official Plugin Hub:

1. The plugin is in a public GitHub repository owned by the requester.
2. The icon is public and `plugin.json.tags` uses only accepted values.
3. No visible plugin already covers the same host.
4. The request is sent through the Plugin Hub and accepts the current rules.
