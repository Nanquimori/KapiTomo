# KapiTomo

KapiTomo is the official site for publishing original works and serving clean data to Nyxalira, Nyxovira, and site plugins.

Website: https://nanquimori.github.io/KapiTomo/
Plugin Hub: https://nanquimori.github.io/KapiTomo/plugins/
Plugin catalog: https://nanquimori.github.io/KapiTomo/plugins/catalog-store.json
Plugin API: https://nanquimori.github.io/KapiTomo/nyxovira/plugin-api/
Terms and Content Policy: https://nanquimori.github.io/KapiTomo/terms/
Privacy Policy: https://nanquimori.github.io/KapiTomo/privacy/

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
|-- nyxovira/
|   |-- plugin-api/
|   |   |-- PLUGIN_API.md
|   |   `-- PLUGIN_API.pt-BR.md
|   `-- privacy/
|-- nyxalira/
|   `-- privacy/
`-- privacy/
```

`plugins/catalog-store.json` is the storefront catalog used by the Plugin Hub. `plugins/catalog.json` is kept as the public catalog alias.

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
  "paragraphs": [
    "First paragraph.",
    "Second paragraph."
  ]
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
plugins/catalog.json
```

Do not edit generated output by hand. Edit `works/` and run the generator again.

## Published Format

Novel content is published inside chapter JSON with `text` and `paragraphs`.

Comic content is published with `pages` and image metadata.

New integrations should use `api/works/index.json`.

## Plugin Hub

The Plugin Hub installs site plugins from GitHub repositories. A plugin repository must contain `plugin.json` and `browser/download_target.js`.

The online catalog displays at most 20 plugins per page. When more entries are available, users can move with Previous and Next, select a numbered page, or choose any page directly from the page selector. Search, tag, and favorites filters reset to the first page and paginate only the matching results.

KapiTomo publishes catalog entries, not third-party works. Plugin creators are responsible for their code, manifest, requested permissions, repository, accurate catalog metadata, and maintenance. Source sites are responsible for their works, translations, advertisements, accounts, pages, availability, and access rules. KapiTomo operates the catalog entry and review process; it does not operate or continuously audit community repositories or source sites. Nyxovira Pro pays for app features and maintenance; it is not a sale of third-party chapters, pages, translations, plugins, manga, comics, or novels.

Public plugin entries include:

- `repository_url`, `repository_ref`, and `plugin_path` for installation.
- `hosts` to prevent duplicate visible plugins for the same site.
- `status`, shown as `Online` or `Offline` in the Hub.
- official tags only: one language first, then one to three content types.

Publishing is automatic after validation:

1. Paste the plugin GitHub repository in the Hub.
2. Confirm the generated GitHub publication request.
3. Automation validates the repository, manifest, icon, tags, and hosts.
4. The request author must own the plugin repository.
5. The request must include acceptance of the current Plugin Hub catalog rules.
6. Technically valid requests are added to the catalog and published to GitHub Pages.
7. Automatic publication is not an endorsement of the source or third-party content.
8. Plugin owners can remove their own plugins automatically, and maintainers can moderate any plugin.

If a source site fails health checks, the plugin appears as `Offline`. If the repository or `plugin.json` remains missing for two consecutive checks, the plugin is marked as removed. Reports open a manual review and never change the catalog automatically. A maintainer may apply a documented preventive restriction only after independently verifying preliminary evidence of an urgent security or catalog-integrity risk, restore a corrected entry, or remove it after a confirmed violation or authorized request.

Maintainer moderation uses the existing GitHub removal channel with an issue titled `[plugin-remove] plugin-id` and an explicit action:

```text
Plugin ID: plugin-id
Action: hide | restore | remove
Reason: objective moderation reason
```

Only accounts listed as maintainers can execute this action. The catalog stores the action, reason, maintainer, and timestamp for auditability.
Creators may submit corrections and new versions at any time. When an entry is under a preventive restriction or was removed by moderation, the publication request becomes a correction request: a maintainer reviews the change and restores the listing after the identified issue is resolved. A creator who voluntarily removed their own plugin may publish it again normally.

The Hub includes a `Report` action on every published plugin and a dedicated panel for serious plugin problems. The form requires the plugin ID, a valid contact email, a reason written in Portuguese or English with 200 to 2,000 characters and at least 20 words, confirmation that the reporter read the guidance, and a Cloudflare Turnstile verification. The browser sends the report only to the server-side Worker in [`report-worker`](report-worker/README.md), which validates every field, verifies the single-use Turnstile token, recomputes the duplicate fingerprint, rate limits the connection, and stores accepted reports privately in Cloudflare D1. There is no public third-party delivery endpoint to bypass, and the Turnstile secret is never exposed to the browser. Accepted reports receive a stable plugin grouping key and a normalized duplicate fingerprint; the same accepted report cannot be resent from the same browser for 30 days. Duplicate reports are grouped into one review, their count is never stored or treated as evidence, and report quantity never causes a plugin to be hidden or removed.

Source-site content, missing chapters, translation quality, advertisements, outages, account rules, and ordinary download or compatibility bugs are not catalog reports. Source matters belong to the source site, technical plugin support belongs in the creator's repository, and formal rights/source-owner notices or confidential evidence go through the private contact address in the terms.

## Content Policy

KapiTomo publishes original works and public catalogs. Nyxovira manages compatible plugins, downloads, updates, and local-library files for readers such as Nyxalira; Nyxovira is not the reading app. Plugins must not contain malware, use misleading metadata, impersonate another party, or bypass authentication, paywalls, DRM, or access restrictions. A community plugin is not removed merely because it connects to a third-party source or receives an unsupported report. See the Terms and Plugin Catalog Rules for the full publication, moderation, review, and removal criteria.
