import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const apiRoot = "nyxovira/plugin-api";

test("documents the three implementation levels and a real-output validation gate", () => {
  const html = read(`${apiRoot}/index.html`);
  const pt = read(`${apiRoot}/PLUGIN_API.pt-BR.md`);
  const en = read(`${apiRoot}/PLUGIN_API.md`);
  for (const document of [html, pt, en]) {
    assert.match(document, /HTML simples|Simple HTML/i);
    assert.match(document, /API JSON|JSON API/i);
    assert.match(document, /criptograf|encrypted/i);
    assert.match(document, /PLUGIN_VALID/);
    assert.match(document, /selectedChapterIds/);
  }
});

test("ships a schema, hosted web tester, and five complete sanitized examples", () => {
  const schema = JSON.parse(read(`${apiRoot}/plugin.schema.json`));
  assert.deepEqual(schema.required, ["match", "browser"]);
  assert.ok(schema.properties.parser.properties.adapter.enum.includes("aes_json_api"));
  assert.ok(existsSync(new URL(`../${apiRoot}/tester/index.html`, import.meta.url)));
  assert.match(read(`${apiRoot}/tester/index.html`), /Testar na web/);
  assert.doesNotMatch(read(`${apiRoot}/tester/index.html`), /AMBIENTE WEB BLOQUEADO|executor local|iniciar-laboratorio/i);
  assert.doesNotMatch(read(`${apiRoot}/tester/index.html`), /class="brand(?:-mark)?"|#ff6d3e|#f0ae45|#f3b347|#ffd889/i);
  assert.match(read(`${apiRoot}/tester/index.html`), /--accent:#7b35f5/);
  assert.doesNotMatch(read(`${apiRoot}/tester/index.html`), /Envie o ZIP criado pela IA|Laboratório web disponível|capítulo completo|execução limitada|O ZIP precisa conter/);
  assert.ok(existsSync(new URL(`../${apiRoot}/tester/lab.js`, import.meta.url)));
  assert.match(read(`${apiRoot}/tester/lab.js`), /visitor-browser/);
  assert.doesNotMatch(read(`${apiRoot}/tester/lab.js`), /AMBIENTE WEB BLOQUEADO|TESTE INDISPONÍVEL/i);

  assert.doesNotMatch(read(`${apiRoot}/examples/index.html`), /Android diagnostic|diagnóstico.*Android/i);

  for (const name of ["simple-html", "json-api", "novel", "manga", "encrypted-api"]) {
    const manifestPath = `${apiRoot}/examples/${name}/plugin.json`;
    const scriptPath = `${apiRoot}/examples/${name}/browser/download_target.js`;
    const manifest = JSON.parse(read(manifestPath));
    const script = read(scriptPath);
    assert.deepEqual(manifest.match.hosts, ["source.invalid"]);
    assert.equal(manifest.browser.home_url, "https://source.invalid/");
    assert.match(script, /__nyxoviraChapterPlan/);
    assert.doesNotMatch(`${JSON.stringify(manifest)}\n${script}`, /example\.com|nexustoons/i);
  }
});

test("the generated AI prompt forbids fabricated mappings and false success", () => {
  const html = read(`${apiRoot}/index.html`);
  assert.match(html, /Do not invent endpoints, selectors, headers, cookies, tokens, keys, or results/);
  assert.match(html, /Não invente endpoints, seletores, headers, cookies, tokens, chaves ou resultados/);
  assert.match(html, /not validated against the real site/);
  assert.match(html, /não validado contra o site real/);
  assert.match(html, /validationScope: complete-first-chapter/);
  assert.match(html, /verifiedPageCount/);
  assert.match(html, /\{ url, headers, contentType \}/);
  assert.match(html, /FAIL or BLOCKED/);
  assert.match(html, /FAIL ou BLOCKED/);
  assert.doesNotMatch(html, /example\.com|nexustoons/i);
});
