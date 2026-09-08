import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const rejectedCatalogTerm = new RegExp(`\\b${["ad", "ult"].join("")}\\b`, "i");

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
    assert.doesNotMatch(document, rejectedCatalogTerm);
    assert.doesNotMatch(document, /Nyxovira Pro/);
    assert.doesNotMatch(document, /0w0-UwU-Hub|0w0 UwU|NexusToons|Pluma Comics|yxz0w0zxy/i);
  }
});

test("personal plugins document the real Nyxovira minimum separately from catalog publication", () => {
  const documents = [
    read("nyxovira/plugin-api/index.html"),
    read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md"),
    read("nyxovira/plugin-api/PLUGIN_API.md")
  ];

  for (const document of documents) {
    assert.match(document, /Minimum for personal use|Mínimo para uso pessoal/);
    assert.match(document, /match\.hosts/);
    assert.match(document, /browser\.home_url/);
    assert.match(document, /generic page (?:detection|detector)|detector genérico da página/);
    assert.match(document, /tags[\s\S]{0,180}(?:not required|não (?:são |é )?necessári|desnecessári)/i);
    assert.doesNotMatch(document, rejectedCatalogTerm);
  }

  for (const file of [
    "README.md",
    "privacy/index.html",
    "terms/index.html",
    "plugins/catalog.json",
    "plugins/catalog-store.json",
    "plugins/store.js",
    "tools/plugin-hub-action.js"
  ]) {
    assert.doesNotMatch(read(file), rejectedCatalogTerm, file);
  }
});

test("interactive prompt builder is prominent, mode-aware, and copyable", () => {
  const html = read("nyxovira/plugin-api/index.html");
  const englishBuilder = html.indexOf('id="prompt-builder"');
  const englishPath = html.indexOf("<h2>Developer path</h2>");
  const portugueseBuilder = html.indexOf('id="gerador-de-prompt"');
  const portuguesePath = html.indexOf("<h2>Caminho do desenvolvedor</h2>");

  assert.ok(englishBuilder >= 0 && englishBuilder < englishPath);
  assert.ok(portugueseBuilder >= 0 && portugueseBuilder < portuguesePath);
  assert.equal((html.match(/<section[^>]+data-prompt-builder/g) || []).length, 2);
  assert.equal((html.match(/<input[^>]+data-prompt-url/g) || []).length, 2);
  assert.equal((html.match(/<textarea[^>]+data-prompt-output/g) || []).length, 2);
  assert.equal((html.match(/<button[^>]+data-copy-prompt/g) || []).length, 2);
  assert.equal((html.match(/data-prompt-mode-option="personal"/g) || []).length, 2);
  assert.equal((html.match(/data-prompt-mode-option="catalog"/g) || []).length, 2);
  assert.match(html, /AI prompt · copy in one click/);
  assert.match(html, /Prompt para IA · copie em um clique/);
  assert.match(html, /Gere um prompt para uma IA criar seu plugin/);
  assert.match(html, /Não adicione tags de catálogo/);
  assert.match(html, /favicon ou logo público fornecido pelo próprio site/);
  assert.match(html, /Crie um repositório público no GitHub/);
  assert.match(html, /git push -u origin main/);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /document\.execCommand\("copy"\)/);
  assert.match(html, /autocomplete="off"/);

  const pageScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(pageScripts.length, 1);
  assert.doesNotThrow(() => new Function(pageScripts[0]));

  const helperStart = pageScripts[0].indexOf("var promptDocumentationUrl");
  const helperEnd = pageScripts[0].indexOf("function updatePromptBuilder");
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  const helpers = new Function(`${pageScripts[0].slice(helperStart, helperEnd)}; return { buildPluginPrompt, normalizePromptSite };`)();
  const personalPt = helpers.buildPluginPrompt("pt", "personal", "example.org");
  const catalogPt = helpers.buildPluginPrompt("pt", "catalog", "example.org");
  const personalEn = helpers.buildPluginPrompt("en", "personal", "example.org");
  const catalogEn = helpers.buildPluginPrompt("en", "catalog", "example.org");

  for (const prompt of [personalPt, catalogPt, personalEn, catalogEn]) {
    assert.match(prompt, /https:\/\/example\.org\//);
    assert.match(prompt, /https:\/\/nanquimori\.github\.io\/KapiTomo\/nyxovira\/plugin-api\//);
  }
  assert.match(personalPt, /Não adicione tags de catálogo/);
  assert.doesNotMatch(personalPt, /Não adicione[^\n]*ícone público/);
  assert.match(personalPt, /favicon ou logo público/);
  assert.match(personalPt, /browser\.icon_url/);
  assert.match(personalPt, /Crie e entregue todos os arquivos completos do plugin/);
  assert.match(catalogPt, /favicon ou logo público fornecido pelo próprio site/);
  assert.match(catalogPt, /Crie um repositório público no GitHub/);
  assert.match(catalogPt, /inicialize o Git/);
  assert.match(catalogPt, /faça commit/);
  assert.match(catalogPt, /push/);
  assert.match(catalogPt, /Depois do push, envie o repositório pelo Plugin Hub/);
  assert.match(personalEn, /Do not add catalog tags/);
  assert.doesNotMatch(personalEn, /Do not add[^\n]*public icon/);
  assert.match(personalEn, /public favicon or logo/);
  assert.match(personalEn, /Create and deliver all complete plugin files/);
  assert.match(catalogEn, /Create a public GitHub repository/);
  assert.match(catalogEn, /commit every file/);
  assert.match(catalogEn, /push the main branch/);
  assert.notEqual(personalPt, catalogPt);

  for (const document of [
    html,
    read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md"),
    read("nyxovira/plugin-api/PLUGIN_API.md")
  ]) {
    assert.doesNotMatch(document, /Se você tiver acesso à pasta de trabalho|If you have workspace access/i);
    assert.doesNotMatch(document, /não contorne login|Do not bypass login|paywalls?|DRM/i);
    assert.doesNotMatch(document, /Não publique o plugin nem altere o catálogo oficial|Do not publish the plugin or change the official catalog/i);
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
