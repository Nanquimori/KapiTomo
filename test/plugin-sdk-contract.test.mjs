import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

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
    assert.match(document, /PLUGIN_VALID_FOR_TESTED_WORK/);
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
    assert.ok(manifest.match.hosts.every(host => host === "source.invalid" || host.endsWith(".source.invalid")));
    assert.ok(new URL(manifest.browser.home_url).hostname === "source.invalid");
    assert.match(script, /__nyxoviraChapterPlan/);
    assert.doesNotMatch(`${JSON.stringify(manifest)}\n${script}`, /example\.com|nexustoons/i);
  }
});

test("complete encrypted example decodes synthetic responses and prepares exact selected pages", () => {
  const manifest = JSON.parse(read(`${apiRoot}/examples/encrypted-api/plugin.json`));
  const script = read(`${apiRoot}/examples/encrypted-api/browser/download_target.js`);
  const work = JSON.parse(read(`${apiRoot}/examples/encrypted-api/fixtures/work.decrypted.json`));
  const chapter = JSON.parse(read(`${apiRoot}/examples/encrypted-api/fixtures/chapter.decrypted.json`));
  const keys = manifest.parser.rotating_sbox_keys;

  assert.equal(manifest.parser.encrypted_response_format, "rotating_sbox_json");
  assert.equal(keys.length, 5);
  assert.ok(keys.every(key => /^[0-9a-f]{64}$/.test(key)));
  assert.equal(manifest.parser.chapter_api_path_template, "/v1/chapters/{chapter}");
  assert.ok(existsSync(new URL(`../${apiRoot}/examples/encrypted-api/index.html`, import.meta.url)));
  assert.ok(existsSync(new URL(`../${apiRoot}/examples/encrypted-api/README.md`, import.meta.url)));

  function bytesFromHex(value) {
    return Uint8Array.from(value.match(/../g), pair => Number.parseInt(pair, 16));
  }
  function rotateLeft(value, count) {
    return ((value << count) | (value >>> (8 - count))) & 255;
  }
  function encryptEnvelope(value, keyIndex = 2, version = 2) {
    const key = bytesFromHex(keys[keyIndex]);
    const box = Uint16Array.from({ length: 256 }, (_, index) => index);
    let cursor = 0;
    for (let index = 0; index < 256; index += 1) {
      cursor = (cursor + box[index] + key[index % key.length]) % 256;
      [box[index], box[cursor]] = [box[cursor], box[index]];
    }
    const plain = new TextEncoder().encode(JSON.stringify(value));
    const encrypted = new Uint8Array(plain.length);
    for (let index = 0; index < plain.length; index += 1) {
      let encoded = plain[index] ^ key[index % key.length];
      const rotation = ((key[(index + 3) % key.length] + (index & 255)) & 255) % 7 + 1;
      encoded = box[rotateLeft(encoded, rotation)];
      encrypted[index] = encoded ^ (index > 0 ? encrypted[index - 1] : key[key.length - 1]);
    }
    return { d: Buffer.from(encrypted).toString("base64"), k: keyIndex, v: version };
  }

  const responses = new Map([
    ["https://api.source.invalid/v1/works/sample-work", work],
    ["https://api.source.invalid/v1/chapters/chapter-001", chapter]
  ]);
  const requests = [];
  class MockXMLHttpRequest {
    headers = {};
    open(method, url, async) {
      assert.equal(method, "GET");
      assert.equal(async, false);
      this.url = url;
    }
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
    send(body) {
      assert.equal(body, null);
      requests.push({ url: this.url, headers: { ...this.headers } });
      const response = responses.get(this.url);
      this.status = response ? 200 : 404;
      this.responseText = JSON.stringify(response ? encryptEnvelope(response) : { error: "not found" });
    }
  }

  const sandbox = {
    URL,
    TextDecoder,
    Uint8Array,
    Uint16Array,
    Set,
    Map,
    XMLHttpRequest: MockXMLHttpRequest,
    atob: value => Buffer.from(value, "base64").toString("binary"),
    location: { pathname: "/work/sample-work", origin: "https://source.invalid" }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const target = vm.runInContext(script, sandbox);
  const initial = JSON.parse(sandbox.__nyxoviraChapterPlan);
  assert.equal(target, "https://source.invalid/work/sample-work");
  assert.deepEqual(Array.from(initial.chapters, item => item.id), ["chapter-001", "chapter-002"]);

  const prepared = sandbox.__nyxoviraPrepareDownloadPlan({
    selectedChapterIds: ["chapter-001"],
    chapterPlan: initial
  });
  assert.deepEqual(Array.from(prepared.chapters, item => item.id), ["chapter-001"]);
  assert.deepEqual(Array.from(prepared.chapters[0].pages, page => page.url), [
    "https://cdn.source.invalid/pages/chapter-001/001.webp",
    "https://cdn.source.invalid/pages/chapter-001/002.webp"
  ]);
  assert.ok(prepared.chapters[0].pages.every(page => page.headers.Referer === "https://source.invalid/work/sample-work"));
  assert.deepEqual(requests.map(request => request.url), [
    "https://api.source.invalid/v1/works/sample-work",
    "https://api.source.invalid/v1/chapters/chapter-001"
  ]);
});

test("the generated AI prompt forbids fabricated mappings and false success", () => {
  const html = read(`${apiRoot}/index.html`);
  assert.match(html, /Do not invent endpoints, selectors, headers, cookies, tokens, keys, or results/);
  assert.match(html, /Não invente endpoints, seletores, headers, cookies, tokens, chaves ou resultados/);
  assert.match(html, /not validated against the real site/);
  assert.match(html, /não validado contra o site real/);
  assert.match(html, /validationScope: exact-work-complete-boundary-chapters/);
  assert.match(html, /packageSha256/);
  assert.match(html, /verifiedPageCount/);
  assert.match(html, /\{ url, headers, contentType \}/);
  assert.match(html, /FAIL or BLOCKED/);
  assert.match(html, /FAIL ou BLOCKED/);
  assert.doesNotMatch(html, /example\.com|nexustoons/i);
  assert.match(html, /URL de uma obra real/);
  assert.match(html, /key\/IV\/version selection/);
});

test("published Plugin API documentation contains no third-party source", () => {
  const corpus = [
    read(`${apiRoot}/index.html`),
    read(`${apiRoot}/PLUGIN_API.md`),
    read(`${apiRoot}/PLUGIN_API.pt-BR.md`),
    read(`${apiRoot}/examples/index.html`),
    read(`${apiRoot}/examples/README.md`),
    read(`${apiRoot}/examples/encrypted-api/index.html`),
    read(`${apiRoot}/examples/encrypted-api/README.md`),
    read(`${apiRoot}/examples/encrypted-api/plugin.json`),
    read(`${apiRoot}/examples/encrypted-api/browser/download_target.js`)
  ].join("\n");
  assert.doesNotMatch(corpus, /nexustoons|plumacomics|imperiodabritannia|lycantoons/i);
});

test("official KapiTomo plugin builds complete novel and image plans", () => {
  const dataSource = read("data/works.js");
  const pluginSource = read(`${apiRoot}/kapitomo/browser/download_target.js`);

  for (const workId of ["world-without-humans", "world-without-humans-comics"]) {
    const sandbox = {
      URL,
      URLSearchParams,
      console,
      navigator: { language: "pt-BR", languages: ["pt-BR"] },
      location: { pathname: "/KapiTomo/", search: "?lang=pt", hash: `#work/${workId}` },
      history: { state: null, replaceState() {} },
      localStorage: { getItem() { return "pt"; } },
      document: { documentElement: { getAttribute() { return "pt-BR"; } }, title: "KapiTomo" }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(dataSource, sandbox);
    const target = vm.runInContext(pluginSource, sandbox);
    const plan = JSON.parse(sandbox.__nyxoviraChapterPlan);
    assert.match(target, new RegExp(`/manga/${workId}/`));
    assert.equal(plan.chapters.length, 3);
    assert.deepEqual(Array.from(plan.chapters, chapter => chapter.id), ["id:0", "id:1", "id:2"]);
    if (workId.endsWith("-comics")) {
      assert.ok(plan.chapters.every(chapter => chapter.pages.length === 2));
      assert.ok(plan.chapters.flatMap(chapter => chapter.pages).every(url => url.startsWith("https://nanquimori.github.io/KapiTomo/")));
    } else {
      assert.ok(plan.chapters.every(chapter => chapter.paragraphs.length > 0));
    }
  }
});
