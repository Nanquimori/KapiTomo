import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import "../plugins/catalog-pagination.js";

const pagination = globalThis.KapiTomoPagination;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const pluginHubAction = require("../tools/plugin-hub-action.js");

test("keeps up to 20 plugins on the first page", () => {
  const result = pagination.paginate(Array.from({ length: 20 }, (_, index) => index + 1), 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.items.length, 20);
  assert.equal(result.start, 1);
  assert.equal(result.end, 20);
});

test("moves the twenty-first plugin to page two", () => {
  const result = pagination.paginate(Array.from({ length: 21 }, (_, index) => index + 1), 2);
  assert.equal(result.totalPages, 2);
  assert.deepEqual(result.items, [21]);
  assert.equal(result.start, 21);
  assert.equal(result.end, 21);
});

test("clamps invalid and out-of-range page choices", () => {
  const plugins = Array.from({ length: 45 }, (_, index) => index + 1);
  assert.equal(pagination.paginate(plugins, 0).page, 1);
  assert.equal(pagination.paginate(plugins, 99).page, 3);
});

test("uses ellipses without hiding the first, current, or last page", () => {
  assert.deepEqual(pagination.visiblePageItems(12, 6), [1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
  assert.deepEqual(pagination.visiblePageItems(12, 1), [1, 2, 3, 4, 5, "ellipsis", 12]);
  assert.deepEqual(pagination.visiblePageItems(12, 12), [1, "ellipsis", 8, 9, 10, 11, 12]);
});

test("keeps official plugins outside the 20-item community pages", () => {
  const official = { id: "kapitomo", name: "KapiTomo", tags: ["official"] };
  const community = Array.from({ length: 41 }, (_, index) => ({
    id: `community-${index + 1}`,
    name: `Community ${index + 1}`,
    tags: ["community"],
    published_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
  }));
  const partitioned = pagination.partitionCatalogPlugins([
    community[0],
    official,
    ...community.slice(1)
  ]);

  assert.deepEqual(partitioned.official.map((plugin) => plugin.id), ["kapitomo"]);
  assert.equal(pagination.paginate(partitioned.community, 1).items.length, 20);
  assert.equal(pagination.paginate(partitioned.community, 2).items.length, 20);
  assert.equal(pagination.paginate(partitioned.community, 3).items.length, 1);
  assert.equal(pagination.paginate(partitioned.community, 1).items[0].id, "community-41");
  assert.equal(pagination.paginate(partitioned.community, 3).items[0].id, "community-1");
});

test("sorts new community publications first without moving the official plugin", () => {
  const sorted = pagination.sortCatalogPlugins([
    { id: "old", name: "Old", tags: ["community"], published_at: "2026-01-01T00:00:00.000Z" },
    { id: "official", name: "Official", tags: ["official"] },
    { id: "new", name: "New", tags: ["community"], published_at: "2026-08-01T00:00:00.000Z" }
  ]);
  assert.deepEqual(sorted.map((plugin) => plugin.id), ["official", "new", "old"]);
});

test("assigns a publication date once and preserves it on updates", () => {
  const firstPublication = "2026-09-01T12:00:00.000Z";
  const originalPublication = "2026-08-01T12:00:00.000Z";
  assert.equal(pluginHubAction.publicationDate(null, firstPublication), firstPublication);
  assert.equal(
    pluginHubAction.publicationDate({ published_at: originalPublication }, firstPublication),
    originalPublication
  );
});

test("allows only maintainers to place a plugin in the official section", () => {
  const official = { id: "fake-official", tags: ["official", "english", "manga"] };
  const community = { id: "community", tags: ["community", "english", "manga"] };
  assert.throws(
    () => pluginHubAction.requireOfficialAuthorization(official, null, false),
    /Official plugins can only be changed by a maintainer/
  );
  assert.doesNotThrow(() => pluginHubAction.requireOfficialAuthorization(official, null, true));
  assert.doesNotThrow(() => pluginHubAction.requireOfficialAuthorization(community, null, false));
});

test("supports reading formats, other, and a separate +18 classification", () => {
  assert.deepEqual(pluginHubAction.OFFICIAL_TYPE_TAGS, [
    "manga",
    "manhua",
    "manhwa",
    "novel",
    "light-novel",
    "web-novel",
    "webtoon",
    "comic",
    "graphic-novel",
    "one-shot",
    "doujinshi",
    "other"
  ]);
  assert.deepEqual(pluginHubAction.OFFICIAL_CLASSIFICATION_TAGS, ["adult"]);
  assert.deepEqual(
    pluginHubAction.normalizeTags(["community", "portuguese", "other", "adult"]),
    ["community", "portuguese", "other", "adult"]
  );
});

test("rejects subgenres and keeps the +18 classification after formats", () => {
  assert.deepEqual(
    pluginHubAction.normalizeTags(["community", "portuguese", "manga", "romance", "adult"]),
    ["community", "portuguese", "manga", "adult"]
  );
  assert.throws(
    () => pluginHubAction.normalizeTags(["community", "portuguese", "adult", "manga"]),
    /classification tags must appear after content types/
  );
  assert.throws(
    () => pluginHubAction.normalizeTags(["community", "portuguese", "manga", "manhua", "manhwa", "comic"]),
    /at most 3 content types/
  );
});

test("keeps catalog taxonomy metadata synchronized with automation", () => {
  const catalogs = ["catalog-store.json", "catalog.json"]
    .map((name) => JSON.parse(fs.readFileSync(path.join(projectRoot, "plugins", name), "utf8")));
  catalogs.forEach((catalog) => {
    assert.deepEqual(catalog.official_tags.languages, pluginHubAction.OFFICIAL_LANGUAGE_TAGS);
    assert.deepEqual(catalog.official_tags.types, pluginHubAction.OFFICIAL_TYPE_TAGS);
    assert.deepEqual(catalog.official_tags.classifications, pluginHubAction.OFFICIAL_CLASSIFICATION_TAGS);
    assert.equal(catalog.catalog_revision, "20260901-expanded-taxonomy");
  });
  assert.deepEqual(catalogs[1], catalogs[0]);
});

test("keeps every Plugin Hub page identical and loads pagination before the store", () => {
  const pages = ["index.html", "hub.html", "market.html", "store.html"]
    .map((name) => fs.readFileSync(path.join(projectRoot, "plugins", name), "utf8"));
  pages.slice(1).forEach((page) => assert.equal(page, pages[0]));
  assert.match(pages[0], /id="officialCatalogSection"/);
  assert.match(pages[0], /id="officialPluginList"/);
  assert.match(pages[0], /id="catalogPagination"/);
  assert.match(pages[0], /catalog-pagination\.js\?v=20260901-pinned-official/);
  assert.match(pages[0], /store\.js\?v=20260901-expanded-taxonomy/);
  assert.ok(pages[0].indexOf("catalog-pagination.js") < pages[0].indexOf("store.js"));
});
