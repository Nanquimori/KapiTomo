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
    assert.match(document, /public HTTPS|HTTPS públic/i);
    assert.doesNotMatch(document, /2 MiB|4 MiB|1[.,]000 plugins|IDs duplicados|Duplicate IDs|IDs iguais|matching plugin IDs|authorized path|caminho autorizado|ausência da ponte|bridge being absent/);
  }
});

test("external-site guide is copyable and understandable outside Nyxovira", () => {
  const documents = [
    read("nyxovira/plugin-api/index.html"),
    read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md"),
    read("nyxovira/plugin-api/PLUGIN_API.md")
  ];

  for (const document of documents) {
    assert.match(document, /plugin-store\//);
    assert.match(document, /install-my-plugin/);
    assert.match(document, /typeof bridge\.installCommunityPlugin/);
    assert.match(document, /install-status/);
    assert.match(document, /Choose [Ww]hat [Yy]ou [Ww]ant to [Bb]uild|Escolha o que você quer construir/);
    assert.match(document, /external plugin store|loja externa (?:de|para distribuir) plugins/i);
    assert.match(document, /other creators|outros criadores/i);
    assert.match(document, /Test before sharing|Teste antes de divulgar/);
    assert.match(document, /`?other`?/);
    assert.match(document, /`?adult`?/);
    assert.doesNotMatch(document, /Nyxovira Pro/);
    assert.doesNotMatch(document, /0w0-UwU-Hub|0w0 UwU|NexusToons|Pluma Comics|yxz0w0zxy/i);
  }
});

test("external store appears after plugin creation, downloads, and official publication", () => {
  const html = read("nyxovira/plugin-api/index.html");

  for (const labels of [
    ["Create the plugin files", "Build chapter downloads", "Publish in the official catalog", "Create an external plugin store"],
    ["Criar os arquivos do plugin", "Montar downloads de capítulos", "Publicar no catálogo oficial", "Criar uma loja externa para distribuir plugins"]
  ]) {
    const positions = labels.map(label => html.indexOf(label));
    assert.ok(positions.every(position => position >= 0));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  }
});

test("copyable install-button scripts have valid JavaScript", () => {
  const html = read("nyxovira/plugin-api/index.html");
  const scripts = [...html.matchAll(/&lt;script&gt;([\s\S]*?)&lt;\/script&gt;/g)]
    .map(match => match[1].replaceAll("=&gt;", "=>").replaceAll("&amp;", "&"));

  assert.equal(scripts.length, 2);
  for (const script of scripts) {
    assert.doesNotThrow(() => new Function(script));
  }
});
