import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const html = read("nyxovira/plugin-api/index.html");
const portuguese = read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md");
const english = read("nyxovira/plugin-api/PLUGIN_API.md");
const documents = [html, portuguese, english];

test("documents personal plugins and independent catalogs without an official submission path", () => {
  for (const document of documents) {
    assert.match(document, /Minimum for personal use|Mínimo para uso pessoal|real minimum|mínimo real/i);
    assert.match(document, /match\.hosts/);
    assert.match(document, /browser\.home_url/);
    assert.match(document, /generic page detector|detector genérico/i);
    assert.match(document, /external (?:plugin )?(?:store|catalog)|loja externa|catálogo externo/i);
    assert.match(document, /independent|independente/i);
    assert.doesNotMatch(document, /Publish in the Official Plugin Hub|Publicar no Plugin Hub Oficial|Share with the community|Compartilhar com a comunidade/i);
  }
});

test("keeps the external catalog contract complete and copyable", () => {
  for (const document of documents) {
    assert.match(document, /nyxovira-plugin-catalog/);
    assert.match(document, /hub_url/);
    assert.match(document, /manifest_url/);
    assert.match(document, /installCommunityPlugin/);
    assert.match(document, /repository_url/);
    assert.match(document, /repository_ref/);
    assert.match(document, /plugin_path/);
    assert.match(document, /HTTPS/i);
  }
  const escapedScripts = [...html.matchAll(/&lt;script&gt;([\s\S]*?)&lt;\/script&gt;/g)]
    .map(match => match[1].replaceAll("=&gt;", "=>").replaceAll("&amp;", "&"));
  assert.equal(escapedScripts.length, 2);
  escapedScripts.forEach(script => assert.doesNotThrow(() => new Function(script)));
});

test("AI prompt builder has personal and external modes in both languages", () => {
  assert.equal((html.match(/<section[^>]+data-prompt-builder/g) || []).length, 2);
  assert.equal((html.match(/data-prompt-mode-option="personal"/g) || []).length, 2);
  assert.equal((html.match(/data-prompt-mode-option="external"/g) || []).length, 2);
  assert.equal((html.match(/data-prompt-mode-option="catalog"/g) || []).length, 0);
  assert.match(html, /AI prompt · copy in one click/);
  assert.match(html, /Prompt para IA · copie em um clique/);
  assert.match(html, /official developer documentation/);
  assert.match(html, /documentação oficial para desenvolvedores/);
  assert.match(html, /OpenAPI or Swagger/);
  assert.match(html, /OpenAPI ou Swagger/);
  assert.match(html, /browser network requests/);
  assert.match(html, /requisições de rede do navegador/);
  assert.match(html, /Do not add catalog tags/);
  assert.match(html, /Não adicione tags de catálogo/);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /document\.execCommand\("copy"\)/);
  const scripts = html.split("<script>").slice(1).map(value => value.split("</script>")[0]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0]));
  const helperStart = scripts[0].indexOf("const documentationUrl");
  const helperEnd = scripts[0].indexOf("function updateBuilder");
  const helpers = new Function(`${scripts[0].slice(helperStart, helperEnd)}; return { buildPluginPrompt };`)();
  const personalPt = helpers.buildPluginPrompt("pt", "personal", "example.org");
  const externalPt = helpers.buildPluginPrompt("pt", "external", "example.org");
  const personalEn = helpers.buildPluginPrompt("en", "personal", "example.org");
  const externalEn = helpers.buildPluginPrompt("en", "external", "example.org");
  for (const prompt of [personalPt, externalPt, personalEn, externalEn]) {
    assert.match(prompt, /https:\/\/example\.org\//);
    assert.match(prompt, /https:\/\/nanquimori\.github\.io\/KapiTomo\/nyxovira\/plugin-api\//);
  }
  assert.match(personalPt, /Não adicione tags de catálogo/);
  assert.match(personalEn, /Do not add catalog tags/);
  assert.match(externalPt, /catálogo externo independente/);
  assert.match(externalPt, /repositório público/);
  assert.match(externalEn, /independent external catalog/);
  assert.match(externalEn, /public repository/);
  assert.notEqual(personalPt, externalPt);
});

test("documentation keeps personal metadata optional and official languages limited", () => {
  for (const document of documents) {
    assert.match(document, /tags[\s\S]{0,180}(?:not required|not needed|não são obrigatóri|desnecessárias)/i);
    assert.match(document, /favicon or logo|favicon ou logo/i);
    assert.doesNotMatch(document, /spanish|japanese|korean|chinese|indonesian|thai|vietnamese|french|german|italian|russian|arabic/i);
  }
  const catalog = JSON.parse(read("plugins/catalog.json"));
  assert.deepEqual(catalog.official_tags.languages, ["portuguese", "english"]);
});
