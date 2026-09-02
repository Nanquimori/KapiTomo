import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("published Plugin API documents the three installation modes", () => {
  const html = read("nyxovira/plugin-api/index.html");
  const portuguese = read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md");
  const english = read("nyxovira/plugin-api/PLUGIN_API.md");

  for (const document of [html, portuguese]) {
    assert.match(document, /Três [Ff]ormas de [Ii]nstalar/);
    assert.match(document, /Importar plugins/);
    assert.match(document, /Plugins online/);
    assert.match(document, /Sites externos/);
  }

  for (const document of [html, english]) {
    assert.match(document, /Three [Ii]nstallation [Mm]odes/);
    assert.match(document, /Import plugins/);
    assert.match(document, /Online plugins/);
    assert.match(document, /External sites/);
  }
});

test("external-site contract is present in HTML and both Markdown versions", () => {
  const documents = [
    read("nyxovira/plugin-api/index.html"),
    read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md"),
    read("nyxovira/plugin-api/PLUGIN_API.md")
  ];

  for (const document of documents) {
    assert.match(document, /nyxovira-plugin-catalog/);
    assert.match(document, /hub_url/);
    assert.match(document, /manifest_url/);
    assert.match(document, /installCommunityPlugin/);
    assert.match(document, /getCommunityPluginCatalog/);
    assert.match(document, /installOnlinePlugin/);
    assert.match(document, /2 MiB/);
    assert.match(document, /1[.,]000|1\.000/);
    assert.match(document, /4 MiB/);
  }
});
