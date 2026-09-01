import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import "../plugins/catalog-pagination.js";

const pagination = globalThis.KapiTomoPagination;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

test("keeps every Plugin Hub page identical and loads pagination before the store", () => {
  const pages = ["index.html", "hub.html", "market.html", "store.html"]
    .map((name) => fs.readFileSync(path.join(projectRoot, "plugins", name), "utf8"));
  pages.slice(1).forEach((page) => assert.equal(page, pages[0]));
  assert.match(pages[0], /id="catalogPagination"/);
  assert.ok(pages[0].indexOf("catalog-pagination.js") < pages[0].indexOf("store.js"));
});
