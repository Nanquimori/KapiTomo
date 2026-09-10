import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const storeSource = fs.readFileSync(new URL("../plugins/store.js", import.meta.url), "utf8");
const paginationSource = fs.readFileSync(new URL("../plugins/catalog-pagination.js", import.meta.url), "utf8");

test("loads, searches, and renders only entries supplied by the official catalog", async () => {
  const nodes = new Map();
  const storage = new Map([
    ["kapitomo.pluginDrafts.v3", "[{\"id\":\"old-draft\"}]"],
    ["kapitomo.reportHistory.v1", "[{\"id\":\"old-data\"}]"]
  ]);
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: "", textContent: "", value: "", hidden: false, dataset: {},
      classList: { toggle() {} },
      setAttribute() {}, addEventListener() {}, querySelectorAll: () => []
    });
    return nodes.get(id);
  }
  const catalog = {
    plugins: [
      { id: "kapitomo", name: "KapiTomo", author: "Nanquimori", description: "Official", version: "1", status: "active", icon_url: "https://example.com/a.png", repository_url: "https://github.com/Nanquimori/KapiTomo", homepage: "https://example.com", tags: ["official", "portuguese", "novel"] },
      { id: "hidden", name: "Hidden", status: "hidden", icon_url: "https://example.com/b.png", repository_url: "https://github.com/example/hidden" }
    ]
  };
  const context = vm.createContext({
    URL, URLSearchParams, console,
    navigator: { language: "en" },
    location: { search: "" },
    document: {
      documentElement: {},
      getElementById: node,
      querySelectorAll: () => []
    },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    fetch: async () => ({ ok: true, json: async () => catalog }),
    alert() {}
  });
  context.window = context;
  vm.runInContext(paginationSource, context);
  vm.runInContext(storeSource, context);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(storage.has("kapitomo.pluginDrafts.v3"), false);
  assert.equal(storage.has("kapitomo.reportHistory.v1"), false);
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(allPlugins.map(plugin => plugin.id))", context)), ["kapitomo"]);
  assert.match(nodes.get("pluginList").innerHTML, /KapiTomo/);
  assert.doesNotMatch(nodes.get("pluginList").innerHTML, /Hidden/);

  nodes.get("pluginSearchInput").value = "nothing";
  vm.runInContext("applyFilters()", context);
  assert.equal(JSON.parse(vm.runInContext("JSON.stringify(filteredPlugins)", context)).length, 0);
  assert.match(nodes.get("pluginList").innerHTML, /No plugin matches/);
});
