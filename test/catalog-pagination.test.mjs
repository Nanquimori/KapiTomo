import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import "../plugins/catalog-pagination.js";

const pagination = globalThis.KapiTomoPagination;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("paginates the complete official catalog in groups of twenty", () => {
  const plugins = Array.from({ length: 21 }, (_, index) => index + 1);
  assert.deepEqual(pagination.paginate(plugins, 1).items, plugins.slice(0, 20));
  assert.deepEqual(pagination.paginate(plugins, 2).items, [21]);
});

test("clamps invalid page choices", () => {
  const plugins = Array.from({ length: 45 }, (_, index) => index + 1);
  assert.equal(pagination.paginate(plugins, 0).page, 1);
  assert.equal(pagination.paginate(plugins, 99).page, 3);
});

test("keeps first, current, and last page visible", () => {
  assert.deepEqual(pagination.visiblePageItems(12, 6), [1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
});

test("sorts official entries by name", () => {
  const sorted = pagination.sortCatalogPlugins([{ id: "zeta" }, { id: "alpha" }]);
  assert.deepEqual(sorted.map(plugin => plugin.id), ["alpha", "zeta"]);
});

test("publishes one official-only PT and EN catalog through both aliases", () => {
  const catalogs = ["catalog-store.json", "catalog.json"]
    .map(name => JSON.parse(fs.readFileSync(path.join(projectRoot, "plugins", name), "utf8")));
  assert.deepEqual(catalogs[0], catalogs[1]);
  assert.equal(catalogs[0].catalog_revision, "20260910-official-only");
  assert.deepEqual(catalogs[0].official_tags.languages, ["portuguese", "english"]);
  assert.deepEqual(catalogs[0].plugins.map(plugin => plugin.id), ["kapitomo"]);
  assert.ok(catalogs[0].plugins.every(plugin => plugin.author === "Nanquimori"));
  assert.ok(catalogs[0].plugins.every(plugin => plugin.status === "active"));
  for (const removedField of ["publish_model", "rules_url", "requirements", "moderation", "suggested_tags"]) {
    assert.equal(removedField in catalogs[0], false);
  }
});

test("keeps the four catalog URLs identical and free of removed controls", () => {
  const pages = ["index.html", "hub.html", "market.html", "store.html"]
    .map(name => fs.readFileSync(path.join(projectRoot, "plugins", name), "utf8"));
  pages.slice(1).forEach(page => assert.equal(page, pages[0]));
  for (const page of pages) {
    assert.match(page, /Published plugins/);
    assert.match(page, /--panel: rgba\(18, 10, 36, 0\.9\)/);
    assert.match(page, /grid-template-columns: repeat\(auto-fill, minmax\(min\(190px, 100%\), 230px\)\)/);
    assert.doesNotMatch(page, /class="hero"|scope-card/);
    assert.match(page, /Plugin API/);
    assert.doesNotMatch(page, /Plugin Hub|Community plugins|Plugins da comunidade|data-view-target|reportPanel|publishPanel|removePanel/i);
  }
  for (const removedPath of [
    ".github/workflows/plugin-hub.yml",
    "tools/plugin-hub-action.js",
    "plugins/report-config.js",
    "report-worker/package.json",
    "test/plugin-security-review.test.mjs"
  ]) {
    assert.equal(fs.existsSync(path.join(projectRoot, removedPath)), false, removedPath);
  }
});
