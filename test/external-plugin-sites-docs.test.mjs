import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("published Plugin API follows the individual developer journey", () => {
  const html = read("nyxovira/plugin-api/index.html");
  const portuguese = read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md");
  const english = read("nyxovira/plugin-api/PLUGIN_API.md");

  for (const document of [html, portuguese]) {
    assert.match(document, /Caminho do [Dd]esenvolvedor/);
    assert.match(document, /Testar (?:por|no Nyxovira)[\s\S]*Importar plugins/);
    assert.match(document, /somente para você/);
    assert.match(document, /Plugins online/);
    assert.match(document, /loja externa/i);
    assert.match(document, /avançad/i);
    assert.doesNotMatch(document, /Três [Ff]ormas de [Ii]nstalar|Como [Dd]isponibilizar [Ss]eu [Pp]lugin/);
  }

  for (const document of [html, english]) {
    assert.match(document, /Developer [Pp]ath/);
    assert.match(document, /Test (?:through|in Nyxovira)[\s\S]*Import plugins/);
    assert.match(document, /Keep it for yourself/);
    assert.match(document, /Online plugins/);
    assert.match(document, /external store/i);
    assert.match(document, /advanced/i);
    assert.doesNotMatch(document, /Three [Ii]nstallation [Mm]odes|How to [Mm]ake [Yy]our [Pp]lugin [Aa]vailable/);
  }

  for (const [document, headings] of [
    [html, ["Plugin files", "Test in Nyxovira", "Publish in the official Plugin Hub", "External plugin store"]],
    [html, ["Arquivos do plugin", "Testar no Nyxovira", "Publicar no Plugin Hub oficial", "Loja externa de plugins"]],
    [english, ["## Plugin Files", "## Test in Nyxovira", "## Publish in the Official Plugin Hub", "## External Plugin Store"]],
    [portuguese, ["## Arquivos do Plugin", "## Testar no Nyxovira", "## Publicar no Plugin Hub Oficial", "## Loja Externa de Plugins"]]
  ]) {
    const positions = headings.map(heading => document.indexOf(heading));
    assert.ok(positions.every(position => position >= 0));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  }

  for (const [document, checklistHeading, officialLabel, externalLabel] of [
    [html, "<h2>Final checklist</h2>", "<h3>Official Plugin Hub</h3>", "<h3>External site</h3>"],
    [html, "<h2>Checklist final</h2>", "<h3>Plugin Hub oficial</h3>", "<h3>Loja externa</h3>"],
    [english, "## Final Checklist", "For the official Plugin Hub:", "For an external store:"],
    [portuguese, "## Checklist Final", "Para o Plugin Hub oficial:", "Para uma loja externa:"]
  ]) {
    const checklist = document.slice(document.lastIndexOf(checklistHeading));
    assert.ok(checklist.indexOf(officialLabel) >= 0);
    assert.ok(checklist.indexOf(externalLabel) > checklist.indexOf(officialLabel));
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
    assert.match(document, /Developer [Pp]ath|Caminho do [Dd]esenvolvedor/);
    assert.match(document, /external plugin store|loja externa (?:de|para distribuir) plugins/i);
    assert.match(document, /other creators|outros criadores/i);
    assert.match(document, /Test before sharing|Teste antes de divulgar/);
    assert.match(document, /`?other`?/);
    assert.match(document, /`?adult`?/);
    assert.doesNotMatch(document, /Nyxovira Pro/);
    assert.doesNotMatch(document, /0w0-UwU-Hub|0w0 UwU|NexusToons|Pluma Comics|yxz0w0zxy/i);
  }
});

test("quick path keeps private use and community publishing before the advanced external store", () => {
  const html = read("nyxovira/plugin-api/index.html");

  for (const labels of [
    ["Create the plugin", "Test through Import plugins", "Keep it for yourself", "Share with the community", "Advanced: create an external store"],
    ["Criar o plugin", "Testar por Importar plugins", "Usar somente para você", "Compartilhar com a comunidade", "Avançado: criar uma loja externa"]
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

test("documentation headings stay compact across desktop and mobile", () => {
  const html = read("nyxovira/plugin-api/index.html");

  assert.match(html, /h1\s*\{[\s\S]*?font-size:\s*clamp\(30px,\s*3\.6vw,\s*44px\)/);
  assert.match(html, /h2\s*\{[\s\S]*?font-size:\s*clamp\(21px,\s*2\.2vw,\s*28px\)/);
  assert.match(html, /@media \(max-width: 860px\)[\s\S]*?h1\s*\{[\s\S]*?font-size:\s*22px/);
  assert.match(html, /@media \(max-width: 860px\)[\s\S]*?h2\s*\{[\s\S]*?font-size:\s*19px/);
});
