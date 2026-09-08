# Nyxovira Plugin API

Portuguese version: [PLUGIN_API.pt-BR.md](PLUGIN_API.pt-BR.md)

This document explains how to create and publish a Nyxovira plugin.

A plugin connects Nyxovira to one reading site. It opens the site, recognizes the work page, shows the chapter list as soon as the user taps download, and prepares only the chapters selected by the user.

## Ready-to-copy Prompt

The [interactive AI prompt generator](https://nanquimori.github.io/KapiTomo/nyxovira/plugin-api/#prompt-builder) is displayed at the top of the online documentation. Enter the source-site URL, choose a mode, use **Copy prompt**, and paste the result into the conversation with the AI that will create the plugin:

- **Personal use:** requests only the minimum needed for a local import. It uses the site's public favicon or logo when available, without requiring a separately hosted icon.
- **Publish in the Plugin Hub:** tells the AI to create and push a public GitHub repository, use the site icon, add accepted catalog tags, validate the plugin, and submit it through the Hub.

The generated request also tells the AI to map routes, selectors, chapter order, text or image content, dynamic loading, and limitations. It must check official documentation and public APIs first, then inspect page scripts and browser network requests for APIs or endpoints that are used by the site but are not visibly documented.

## Developer Path

1. [Create the plugin](#plugin-files): prepare `plugin.json`, map the site, and build chapter downloads.
2. [Test through **Import plugins**](#test-in-nyxovira): import the local folder into Nyxovira and repeat the test while developing.
3. **Keep it for yourself** if you want. No publication, catalog, or website is required.
4. [Share it with the community](#publish-in-the-official-plugin-hub) if you want other users to find it in the official catalog.
5. [Create an external store](#external-plugin-store) only as an advanced option for distributing ready plugins from you and other creators.

## How a Plugin Works

1. The creator starts with the small `plugin.json` that Nyxovira needs. A site-specific browser script is added when generic page recognition is not enough.
2. During development, the creator imports the local plugin folder into Nyxovira and tests it on the supported site.
3. The plugin may remain private. Publication is optional and happens only after testing.
4. When present, `browser/download_target.js` handles site-specific work and chapter recognition. Without it, Nyxovira tries its generic page detector.
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
| `plugin.json` | Identifies the supported site. Only a few fields are needed for a personal plugin. |
| `browser/download_target.js` | Optional for import, but recommended when the generic detector cannot build the correct chapter plan. |

For predictable updates, use the same stable id in the folder name and in `plugin.json`.

## plugin.json

### Minimum for personal use

This is the smallest practical manifest for a plugin imported directly into Nyxovira:

```json
{
  "id": "my-plugin",
  "match": {
    "hosts": ["example.com"]
  },
  "browser": {
    "home_url": "https://example.com/",
    "download_target_script_file": "browser/download_target.js"
  }
}
```

Nyxovira only needs valid JSON, a non-empty folder name or `id`, at least one `match.hosts` entry, and `browser.home_url` to load the source. The example also names `browser/download_target.js` because a site-specific script is the reliable way to recognize works and chapters. If that field and file are omitted, Nyxovira tries its generic page detector, which may not understand every site.

For a plugin that stays on your device, these fields are **not required**: `schema_version`, `name`, `version`, `tags`, `browser.icon_mode`, `browser.short_label`, and `parser`. GitHub, a public catalog, and a plugin website are not required either. If the site provides a stable public favicon or logo, use its URL in `browser.icon_url`; otherwise the icon may be omitted for personal use.

Fields and scope:

| Field | Meaning |
| --- | --- |
| `id` | Stable plugin id. Strongly recommended; otherwise Nyxovira uses the folder name. |
| `match.hosts` | Required. Domains recognized by this plugin. |
| `browser.home_url` | Required. Page opened by the app browser. |
| `browser.download_target_script_file` | Optional, but recommended for reliable site-specific work and chapter detection. |
| `name`, `version` | Optional for personal import; useful when sharing and updating the plugin. |
| `tags` | Not needed for personal use. Required only by the official Plugin Hub publication process. |
| `browser.icon_url` | Optional for personal use: prefer the site's public favicon or logo when available. Required for official catalog publication. |
| `parser` | Optional advanced native-parser configuration. It is not needed when the browser script provides the chapter plan and content. |

## Site Mapping

Map the site's names to the fields Nyxovira expects. This keeps each plugin responsible for the site it supports.

Discover the data source before choosing an implementation:

- Look for official developer documentation, a public API, OpenAPI or Swagger files, GraphQL, JSON feeds, and documented endpoints.
- If the API is not linked or documented, inspect the page source, loaded scripts, and browser network requests to identify the endpoints used by the site's own interface.
- Compare the API data with the rendered HTML and use the most complete and stable source for works, chapters, text, and images.

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

## Test in Nyxovira

Manual import is the normal development loop and also supports plugins intended only for personal use. Personal import does not validate catalog tags or require you to host an icon. When the site already provides a public favicon or logo, use it in `browser.icon_url`.

1. Keep `plugin.json` and the `browser` folder together inside the plugin folder.
2. In Nyxovira, open **Sites**, tap **Import plugins**, and select the plugin folder. You may also select a parent folder containing several plugin folders.
3. Open the supported site and verify work recognition, the chapter list, and the download.
4. After changing the files, import the folder again and repeat the test.

**If the plugin is only for you, you are done.** You do not need tags, `schema_version`, GitHub, a public catalog, or a plugin website. Use the site's favicon or logo when available; you do not need to host a separate icon.

If you want to share it, choose one of these later steps:

- [Publish in the official Plugin Hub](#publish-in-the-official-plugin-hub): the community finds the plugin under **Online plugins**.
- [Maintain an external store](#external-plugin-store): the advanced and more involved option for distributing a catalog of your plugins and plugins from other creators.

## Publish in the Official Plugin Hub

Use this option only when you want the plugin to appear in the official catalog. The public GitHub repository is the installation source; do not manually write a `catalog.json` entry.

The requirements below apply only to publication in the official catalog. Before submitting, `plugin.json` must have a public HTTPS icon and a `tags` list containing one language first, followed by one to three content types.

Keep `plugin_path` limited to the files Nyxovira must install. Before publication, the Hub inventories and verifies every file in that folder, examines browser scripts line by line, checks explicit network destinations, and runs ClamAV over the complete snapshot. Executables, archives, symbolic links, disguised binaries, oversized packages, suspicious or obfuscated code, malware detections, and incomplete scans are blocked.

The accepted catalog entry is pinned to the exact reviewed commit. Any later code update needs a new publication request. Automated checks reduce risk but cannot guarantee that software is harmless; rejected requests remain open for correction or manual review.

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

How to publish:

1. Create a public GitHub repository for the plugin.
2. Initialize Git in the plugin folder, commit every plugin file, connect the public repository as `origin`, and push the main branch.
3. Paste the public GitHub repository URL in the Plugin Hub.
4. Confirm the generated GitHub request and accept the current rules.
5. Automation reviews every file and code line, runs antivirus checks, validates metadata and ownership, and pins the exact approved commit.
6. A technically valid request is published in the catalog.

```bash
git init
git add .
git commit -m "Add Nyxovira plugin"
git branch -M main
git remote add origin https://github.com/USERNAME/PLUGIN.git
git push -u origin main
```

Only one visible plugin may cover a host. Responsibility, review, correction, and removal rules are in the [Terms and Plugin Catalog Rules](https://nanquimori.github.io/KapiTomo/terms/#plugin-catalog-rules).

## External Plugin Store

Use this option only after the plugins are ready and tested. It is intended for anyone maintaining an independent distribution that may contain their own plugins and plugins from other creators.

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

Host the folder at a public HTTPS address. The appearance, search, and cards belong to the store itself; Nyxovira only needs to discover the catalog and receive the installation request. Add one object to the `plugins` list for every distributed plugin.

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

When the store is open in a regular browser, the example tells the person to open it from Nyxovira. Inside the app, the button installs the matching plugin from the connected catalog.

### Before publishing the store

- Host the page, catalog, and plugin files at public HTTPS addresses.
- For every plugin, accurately identify the author, source site, and manifest path.
- Test the Install button by opening the store from its card under **External sites** in Nyxovira.

### Test before sharing

1. Publish every file over HTTPS.
2. In Nyxovira, open **Sites > External sites** and connect the URL of `index.html` or the store directory.
3. Open the site from the card created in the app.
4. Tap **Install** and confirm the returned message.

## Final Checklist

For a plugin imported for personal use:

1. `plugin.json` is valid JSON, its folder name (or `id`) is not empty, it has at least one `match.hosts` value, and `browser.home_url` is valid.
2. If generic recognition is insufficient, `browser/download_target.js` recognizes the work and creates the chapter list.
3. Novels use `paragraphs`; comics use `pages`.

For the official Plugin Hub:

1. The plugin is in a public GitHub repository owned by the requester.
2. The icon is public and `plugin.json.tags` uses only accepted values.
3. No visible plugin already covers the same host.
4. The request is sent through the Plugin Hub and accepts the current rules.

For an external store:

1. The page, catalog, and plugin files are published.
2. Every plugin shows the correct author and source site.
3. The **Install** button was tested by opening the store from Nyxovira.
