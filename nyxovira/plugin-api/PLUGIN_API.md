# Nyxovira Plugin API

Português: [PLUGIN_API.pt-BR.md](PLUGIN_API.pt-BR.md)

This is the official contract for creating, testing, and using Nyxovira source plugins. Every example uses the reserved `source.invalid` domain; no third-party reading site is part of this API.

## Definition of a valid plugin

A plugin is validated only when an authorized real URL resolves a work, lists chapters, preserves the selected ID, resolves pages or paragraphs, downloads the content, writes a file, and reopens it. Importing a ZIP, opening a site, or enqueueing a task does **not** validate a plugin.

## Three implementation levels

1. **Simple HTML:** `browser/download_target.js` reads rendered HTML and produces the final plan.
2. **Simple JSON API:** the browser script performs discovery; also declare `parser` when the API is structured or the native downloader must repeat requests outside the WebView.
3. **Dynamic, protected, or encrypted API:** `parser` is mandatory for endpoints, headers, and decoding; the browser script still performs discovery and uses the browser session.

“Parser optional” only means a manifest may import without one. Declare `parser` for structured APIs, special headers, encryption, or native downloading outside the WebView.

## Minimum plugin structure

```text
my-plugin/
|-- plugin.json
`-- browser/
    `-- download_target.js
```

```json
{
  "$schema": "https://nanquimori.github.io/KapiTomo/nyxovira/plugin-api/plugin.schema.json",
  "id": "my-plugin",
  "match": { "hosts": ["source.invalid"] },
  "browser": {
    "home_url": "https://source.invalid/",
    "icon_url": "https://source.invalid/favicon.ico",
    "download_target_script_file": "browser/download_target.js"
  }
}
```

The runtime minimum is valid JSON, a folder name or `id`, one `match.hosts` value, and `browser.home_url`. `name`, `version`, `language`, and `tags` are not required for import; a repository or catalog belongs only to optional later distribution. Use `browser.icon_url` when the source itself provides a stable public favicon or logo.

Without `browser/download_target.js`, the generic page detector attempts basic recognition. It is useful for simple HTML but is not a substitute for source-specific mapping.

Validate the manifest with [plugin.schema.json](plugin.schema.json).

## Mandatory mapping before coding

Record a real work URL and reader URL; work/chapter/page endpoints; HTML selectors and load completion; required headers, referer, cookies, login, and tokens; encryption envelope and legitimate key origin; paid/restricted/removed chapters; source and display order; relative URL bases; real work/chapter/page ID formats; and proof that at least one actual chapter resolves to pages or paragraphs.

Look for first-party developer documentation, OpenAPI/Swagger, GraphQL, JSON feeds, and public endpoints. If they are not visible, inspect rendered HTML, loaded scripts, and the network requests made by the page. Never invent endpoints, selectors, headers, or keys.

## Browser script contract

Set `window.__nyxoviraChapterPlan` immediately. It contains a title, canonical URL, and chapters with stable `id`, number, title/label, URL, and content type. Keep the initial plan light. After selection, `window.__nyxoviraPrepareDownloadPlan({ selectedChapterIds, chapterPlan })` may asynchronously fill `pages` or `paragraphs` and return the final plan.

### ID invariant

Every `chapterPlan.chapters[].id` must be **exactly** the value later received in `selectedChapterIds`. Do not add/remove an `id:` prefix, convert a number to a slug, or substitute a visual index. Empty, duplicate, or transformed IDs invalidate selection.

Content formats:

- Novel: `contentType: "novel"` plus nonempty `paragraphs`.
- Comic/manga: `contentType: "images"` plus nonempty `pages`; `images` is compatibility-only.
- If a browser-plan page needs headers or a token, return an object such as `{ "url": "https://...", "headers": { "Authorization": "..." } }`; Nyxovira carries those headers into the native image request. A string URL cannot carry special authentication. Parser-generated pages can use the corresponding parser fields.

## Operational parser fields

Supported adapters are `next_payload`, `html_series`, and `aes_json_api`.

| Field/group | Runtime effect |
| --- | --- |
| `adapter` | Selects the native algorithm; an unknown value fails. |
| `base_url`, `api_base`, `cdn_base` | Resolve web routes, API endpoints, and CDN images. |
| `request_headers` | Adds static headers to native API requests. |
| `work_api_path_template`, `work_api_id_path_template`, `chapter_api_path_template` | Build work and chapter requests. |
| `page_api_path_template`, `page_cdn_path_template`, `page_token_header` | Build page requests/URLs and carry per-page tokens. |
| `work_search_api_path_template`, `cover_search_api_path_template` | Search for work metadata or covers. |
| `series_path_template`, `read_path_template`, `public_work_path_template`, `public_chapter_path_template` | Reconstruct canonical public URLs. |
| `viewer_bootstrap_path_template`, `static_works_script` | Fetch reader bootstrap data or a static work index. |
| `encrypted_response_format` | Enables envelope decoding; `rotating_sbox_json` is supported. |
| `api_secret`, `rotating_sbox_keys`, `rotating_sbox_key_prefix` | Supply mapped decoding key material; never fabricate it. |
| `default_workers`, `default_retries` | Tune source concurrency and retry limits. |
| `map` | Maps real JSON paths to work, chapter, page, paragraph, title, summary, cover, ID, and CDN fields. |
| `*_keys` | Lists alternative JSON names for those values. |
| route/hint groups | `*_path_prefixes`, `*_slug_strip_prefixes`, `chapter_slug_pattern`, `ignored_root_paths`, `hash_series_path_prefixes`, `chapter_label_patterns`, `chapter_image_*_hints`, and `cdn_direct_path_prefixes` control route cleanup and content recognition. |

Exact extraction groups recognized by the engine:

- Work: `work_object_keys` locates the object; `work_title_keys`, `work_summary_keys`, and `work_cover_keys` locate title, summary, and cover.
- Chapters: `chapter_object_keys` locates the envelope; `chapter_array_keys` locates the list; `chapter_id_keys`, `chapter_number_keys`, `chapter_title_keys`, and `chapter_text_keys` extract values; `paragraph_array_keys` locates paragraphs.
- Pages: `page_array_keys` locates the list; `page_number_keys`, `page_image_keys`, and `page_cdn_id_keys` extract order, URL, and CDN ID.
- Search: `search_array_keys` and `cover_search_array_keys` locate work and cover result arrays.
- Routes: `base_path_prefix`, `series_path_prefix`, `series_path_prefixes`, `hash_series_path_prefixes`, `chapter_path_prefix`, `chapter_path_prefixes`, `chapter_slug_pattern`, `chapter_slug_strip_prefixes`, and `ignored_root_paths` decide which URLs are works/chapters and derive the slug.
- Visual recognition: `chapter_label_patterns`, `chapter_image_path_hints`, `chapter_image_class_hints`, and `cdn_direct_path_prefixes` filter labels, classes, and image paths.

Template placeholders are adapter-provided values such as `{slug}`, `{workId}`, `{chapter}`, `{chapterId}`, `{page}`, and `{page3}`.

## Authentication and headers

Map referer, session cookies, per-chapter/page tokens, user agent, and static headers separately. `request_headers` carries only static native-parser values; never assume WebView cookies are available to the native downloader without a real test. Do not embed personal credentials. If login is required, test with an authorized account and document the session dependency.

## Dynamic APIs

For data loaded after HTML, create a light initial plan and resolve only selected chapters in `__nyxoviraPrepareDownloadPlan`. If the hook is asynchronous, verify that the target app version waits for it; the current app hook must complete synchronously. Exercise pagination, infinite loading, and rotating tokens through the last chapter page.

## Encrypted APIs

Declare `encrypted_response_format` and key material only when legitimately observed in the source's own client. `aes_json_api` accepts plain JSON, an AES/CBC `IV:ciphertext` payload derived from `api_secret`, and the supported `rotating_sbox_json` envelope. Declaring a format is not proof: diagnostics must reach content and save the complete chapter.

## Troubleshooting

- `HTTP 401/403`: verify session, cookies, referer, tokens, and headers; retries do not fix access requirements.
- Work without chapters: verify endpoint, selector, pagination, order, and `chapter_array_keys`/`map`.
- Empty selection: compare plan IDs and `selectedChapterIds` byte for byte.
- Empty pages or HTML returned as an image: verify base URL, CDN, content type, token, and decoding.
- Page one works but a later page fails: the chapter is invalid; the tester must download every page.
- Works in WebView but fails natively: declare the parser and reproduce transport requirements outside WebView.

## Web Plugin Laboratory

[Open the Web Plugin Laboratory](tester/), upload the ZIP, and enter a real work URL. The hosted service automatically selects the first chapter, downloads every page in that chapter, runs the collection in a temporary browser, and returns the report on the same page. It never returns `PLUGIN_VALID` after checking only the beginning of a chapter. No program, command line, APK, ADB, or emulator is required.

The limited laboratory has no library, settings, catalogs, favorites, or permanent downloads. The ZIP and content exist only for the request and are released before the response. Require `temporaryDataReleased: true` and `stored: false`. Without network access, report **“not validated against the real site.”**

## Release checklist

- Manifest passes `plugin.schema.json`.
- No endpoint, selector, header, token, or key was invented.
- Chapter IDs are unique and selection preserves the exact ID.
- One real chapter resolves pages or paragraphs.
- Headers, cookies, session, restrictions, encryption, order, and relative URLs were tested.
- The web laboratory returned `PLUGIN_VALID`, `temporaryDataReleased: true`, `stored: false`, and no `FAIL` step.
- Known limitations and restricted content are documented.

## Complete sanitized examples

See [examples/](examples/): `simple-html`, `json-api`, `novel`, `manga`, and `encrypted-api`. Templates are not validation.

## Strict AI prompt

> Create a Nyxovira plugin for the supplied source URL using this documentation. Inspect the real page, scripts, network traffic, and first-party API documentation before coding. Do not invent endpoints, selectors, headers, cookies, tokens, keys, or test results. Record work/reader URLs, endpoints, IDs, order, relative URL bases, authentication, restrictions, and encryption. Use `download_target.js` for discovery and declare `parser` for structured APIs, special headers, encryption, or native downloading. Keep each chapter ID exactly equal to the value in `selectedChapterIds`. Package the plugin as a ZIP and test it in the [Web Laboratory](tester/) against a real work; the first chapter is selected automatically. Claim success only after the laboratory returns `PLUGIN_VALID`, no `FAIL` step, `temporaryDataReleased: true`, and `stored: false`. If network access is unavailable, state “not validated against the real site.”

## Independent distribution

Plugin creation ends after local import and complete validation. Sharing the same finished plugin through an independent external catalog is a separate optional process, not another plugin type. Users connect that catalog manually. KapiTomo does not accept third-party plugin submissions. Distribution does not replace authorization, source compliance, or technical validation.

An external plugin store publishes an HTTPS page and `catalog.json`. The page declares `<link rel="nyxovira-plugin-catalog" href="catalog.json">`; the catalog uses `hub_url` and an entry `manifest_url`. `repository_url`, `repository_ref`, and `plugin_path` are also supported. Its install button calls `installCommunityPlugin(catalogUrl, JSON.stringify({ id }))` inside Nyxovira. The publisher remains responsible for the repository, catalog, and review.
