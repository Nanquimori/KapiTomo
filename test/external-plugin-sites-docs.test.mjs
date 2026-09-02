import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("published Plugin API explains distribution only after plugin creation", () => {
  const html = read("nyxovira/plugin-api/index.html");
  const portuguese = read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md");
  const english = read("nyxovira/plugin-api/PLUGIN_API.md");

  for (const document of [html, portuguese]) {
    assert.match(document, /Como [Dd]isponibilizar [Ss]eu [Pp]lugin/);
    assert.match(document, /Importação manual/);
    assert.match(document, /Plugins online/);
    assert.match(document, /Loja externa/);
  }

  for (const document of [html, english]) {
    assert.match(document, /How to [Mm]ake [Yy]our [Pp]lugin [Aa]vailable/);
    assert.match(document, /Manual import/);
    assert.match(document, /Online plugins/);
    assert.match(document, /External store/);
  }

  for (const [document, headings] of [
    [html, ["Plugin files", "How to make your plugin available", "Publish in the official Plugin Hub", "External plugin store"]],
    [html, ["Arquivos do plugin", "Como disponibilizar seu plugin", "Publicar no Plugin Hub oficial", "Loja externa de plugins"]],
    [english, ["## Plugin Files", "## How to Make Your Plugin Available", "## Publish in the Official Plugin Hub", "## External Plugin Store"]],
    [portuguese, ["## Arquivos do Plugin", "## Como Disponibilizar Seu Plugin", "## Publicar no Plugin Hub Oficial", "## Loja Externa de Plugins"]]
  ]) {
    const positions = headings.map(heading => document.indexOf(heading));
    assert.ok(positions.every(position => position >= 0));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
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
