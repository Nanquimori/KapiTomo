import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const html = read("nyxovira/plugin-api/index.html");
const portuguese = read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md");
const english = read("nyxovira/plugin-api/PLUGIN_API.md");
const documents = [html, portuguese, english];

test("documents one plugin creation flow and optional independent distribution", () => {
  for (const document of documents) {
    assert.match(document, /Minimum (?:plugin structure|required by Nyxovira)|Estrutura mínima do plugin|Mínimo exigido pelo Nyxovira/i);
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

test("AI prompt builder has one creation flow in both languages", () => {
  assert.equal((html.match(/<section[^>]+data-prompt-builder/g) || []).length, 2);
  assert.doesNotMatch(html, /data-prompt-mode(?:-option)?=/);
  assert.doesNotMatch(html, /How will you use this plugin\?|Como você usará este plugin\?/);
  assert.doesNotMatch(html, /Only the minimum needed to import|Somente o mínimo necessário para importar/);
  assert.match(html, /AI prompt · copy in one click/);
  assert.match(html, /Prompt para IA · copie em um clique/);
  assert.match(html, /official developer documentation/);
  assert.match(html, /documentação oficial para desenvolvedores/);
  assert.match(html, /OpenAPI or Swagger/);
  assert.match(html, /OpenAPI ou Swagger/);
  assert.match(html, /browser network requests/);
  assert.match(html, /requisições de rede do navegador/);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /document\.execCommand\("copy"\)/);
  const scripts = html.split("<script>").slice(1).map(value => value.split("</script>")[0]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0]));
  const helperStart = scripts[0].indexOf("const documentationUrl");
  const helperEnd = scripts[0].indexOf("function updateBuilder");
  const helpers = new Function(`${scripts[0].slice(helperStart, helperEnd)}; return { buildPluginPrompt };`)();
  const promptPt = helpers.buildPluginPrompt("pt", "example.org");
  const promptEn = helpers.buildPluginPrompt("en", "example.org");
  for (const prompt of [promptPt, promptEn]) {
    assert.match(prompt, /https:\/\/example\.org\//);
    assert.match(prompt, /https:\/\/nanquimori\.github\.io\/KapiTomo\/nyxovira\/plugin-api\//);
    assert.match(prompt, /https:\/\/nanquimori\.github\.io\/KapiTomo\/nyxovira\/plugin-api\/tester\//);
    assert.match(prompt, /validationScope: complete-boundary-chapters-of-one-work/);
    assert.match(prompt, /verifiedPageCount/);
    assert.match(prompt, /\{ url, headers, contentType \}/);
    assert.doesNotMatch(prompt, /only public chapters|somente (?:os )?capítulos públicos/i);
    assert.doesNotMatch(prompt, /personal use|uso pessoal|independent external catalog|catálogo externo independente/i);
  }
  assert.match(promptPt, /Crie e valide um plugin Nyxovira para o site/);
  assert.match(promptPt, /não reduza automaticamente o plugin a capítulos públicos/);
  assert.match(promptPt, /sessão já autenticada e com o acesso efetivamente concedido/);
  assert.match(promptPt, /Nunca solicite, registre, exporte ou inclua credenciais/);
  assert.match(promptPt, /corrija a causa, gere um novo ZIP e repita o teste/);
  assert.match(promptEn, /Create and validate a Nyxovira plugin for the site/);
  assert.match(promptEn, /do not automatically reduce the plugin to public chapters/);
  assert.match(promptEn, /session already authenticated by the user and the access actually granted/);
  assert.match(promptEn, /Never request, record, export, or include personal credentials/);
  assert.match(promptEn, /fix the cause, build a new ZIP, and run the test again/);
  assert.doesNotMatch(html, />Crie um plugin Nyxovira para o site|>Create a Nyxovira plugin for the site/);
});

test("published SDK resources are directly linked from both language views", () => {
  for (const href of ["PLUGIN_API.md", "PLUGIN_API.pt-BR.md", "plugin.schema.json", "examples/", "tester/"]) {
    assert.match(html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
});

test("documentation keeps runtime metadata optional and official languages limited", () => {
  for (const document of documents) {
    assert.match(document, /tags[\s\S]{0,180}(?:not required|not needed|não são (?:obrigatóri|necessári)|desnecessárias)/i);
    assert.match(document, /favicon or logo|favicon ou logo/i);
    assert.doesNotMatch(document, /spanish|japanese|korean|chinese|indonesian|thai|vietnamese|french|german|italian|russian|arabic/i);
  }
  const catalog = JSON.parse(read("plugins/catalog.json"));
  assert.deepEqual(catalog.official_tags.languages, ["portuguese", "english"]);
});
