import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const storeSource = fs.readFileSync(new URL("../plugins/store.js", import.meta.url), "utf8");
const paginationSource = fs.readFileSync(new URL("../plugins/catalog-pagination.js", import.meta.url), "utf8");

function plugin(id, tags = ["community", "english", "manga"], status = "active") {
  return { id, name: id, tags, status, icon_url: "https://example.com/icon.png", repository_url: `https://github.com/example/${id}` };
}

async function openCatalog(previousAccess) {
  const nodes = new Map();
  const storage = new Map([
    ["kapitomo.pluginDrafts.v3", JSON.stringify([plugin("novel-draft", ["english", "novel"])])]
  ]);
  if (previousAccess !== null) storage.set("kapitomo.restrictedAccess.v1", previousAccess);
  const catalog = { plugins: [
    ...Array.from({ length: 20 }, (_, i) => plugin(`regular-${i}`)),
    plugin("novel-community", ["community", "english", "novel"]),
    plugin("novel-official", ["official", "english", "novel"]),
    plugin("moderated", ["community", "english", "novel"], "hidden"),
    plugin("unavailable", ["community", "english", "novel"])
  ] };
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: "", textContent: "", value: "", dataset: {}, hidden: false,
      classList: { toggle() {}, add() {}, remove() {} },
      setAttribute() {}, addEventListener() {}, scrollIntoView() {},
      querySelectorAll: () => [], querySelector: () => null
    });
    return nodes.get(id);
  }
  const requested = [];
  const context = vm.createContext({
    URL, URLSearchParams, console,
    navigator: { language: "en" },
    location: { search: "", href: "https://example.com/plugins/" },
    document: { documentElement: {}, getElementById: node, querySelectorAll: () => [] },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    fetch: async url => {
      requested.push(url);
      return { ok: true, status: url.includes("/unavailable/") ? 404 : 200, json: async () => catalog };
    }
  });
  context.window = context;
  vm.runInContext(paginationSource, context);
  vm.runInContext(storeSource, context);
  await new Promise(resolve => setImmediate(resolve));
  const read = expression => JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context));
  return { context, nodes, storage, requested, read };
}

for (const previousAccess of [null, "enabled", "disabled"]) {
  test(`loads plugins and drafts while clearing the obsolete access preference (${previousAccess})`, async () => {
    const { context, nodes, storage, requested, read } = await openCatalog(previousAccess);
    assert.equal(storage.has("kapitomo.restrictedAccess.v1"), false);
    assert.equal(read("allPlugins.length"), 22);
    assert.ok(read("allPlugins.map(plugin => plugin.id)").includes("novel-community"));
    assert.ok(read("allPlugins.map(plugin => plugin.id)").includes("novel-draft"));
    assert.deepEqual(read("pinnedOfficialPlugins.map(plugin => plugin.id)"), ["novel-official"]);
    assert.ok(requested.some(url => url.includes("/novel-community/")));
    assert.ok(!requested.some(url => url.includes("/moderated/")));
    assert.match(nodes.get("tagFilter").innerHTML, /data-filter-tag="english"/);
    assert.match(nodes.get("tagFilter").innerHTML, /data-filter-tag="novel"/);
    vm.runInContext("goToCatalogPage(2)", context);
    assert.equal(read("currentCatalogPage"), 2);
    assert.equal(read("renderedPlugins.length"), 3); // One pinned plugin and two community entries.
    vm.runInContext('searchQuery = "novel-community"; applyTagFilters(true)', context);
    assert.deepEqual(read("filteredCatalogPlugins.map(plugin => plugin.id)"), ["novel-community"]);
    vm.runInContext('searchQuery = ""; toggleTagFilter("novel")', context);
    assert.deepEqual(read("filteredCatalogPlugins.map(plugin => plugin.id).sort()"), ["novel-community", "novel-draft"]);
    vm.runInContext('toggleFavoritePlugin(allPlugins.find(plugin => plugin.id === "novel-community")); favoritesOnly = true; applyTagFilters(true)', context);
    assert.deepEqual(read("filteredCatalogPlugins.map(plugin => plugin.id)"), ["novel-community"]);
    vm.runInContext('setLanguage("pt")', context);
    assert.deepEqual(read("filteredCatalogPlugins.map(plugin => plugin.id)"), ["novel-community"]);
  });
}
