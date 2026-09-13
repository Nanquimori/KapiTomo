import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = relativePath => readFileSync(new URL(relativePath, root), "utf8");
const bytes = relativePath => readFileSync(new URL(relativePath, root));

function integrity(algorithm, relativePath) {
  return `${algorithm}-${createHash(algorithm).update(bytes(relativePath)).digest("base64")}`;
}

test("root page restricts resource loading and pins executable assets", () => {
  const html = read("index.html");
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1] || "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self' 'sha256-[^']+'/);
  assert.match(csp, /style-src 'self'/);
  assert.match(csp, /img-src 'self' data:/);
  assert.match(csp, /base-uri 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);

  for (const relativePath of ["styles.css", "data/works.js", "app.js"]) {
    const escaped = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tag = html.match(new RegExp(`<[^>]+(?:href|src)="${escaped}\\?[^\"]+"[^>]*>`))?.[0] || "";
    assert.match(tag, new RegExp(`integrity="${integrity("sha384", relativePath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.match(tag, /crossorigin="anonymous"/);
  }

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || "";
  const jsonLdHash = `sha256-${createHash("sha256").update(jsonLd, "utf8").digest("base64")}`;
  assert.ok(csp.includes(`'${jsonLdHash}'`));
});

test("site rendering accepts only official same-origin HTTPS media and escapes fallback text", () => {
  const app = read("app.js");
  assert.match(app, /function safeAssetUrl/);
  assert.match(app, /url\.protocol !== "https:"/);
  assert.match(app, /url\.origin !== canonical\.origin/);
  assert.match(app, /!url\.pathname\.startsWith\("\/KapiTomo\/"\)/);
  assert.match(app, /<p>\$\{escapeHtml\(pageText\)\}<\/p>/);

  const plugin = read("nyxovira/plugin-api/kapitomo/browser/download_target.js");
  assert.match(plugin, /resolved\.protocol !== "https:"/);
  assert.match(plugin, /resolved\.origin !== official\.origin/);
  assert.match(plugin, /resolved\.pathname\.indexOf\(official\.pathname\) !== 0/);
});

test("generated reader pages inherit restrictive metadata", () => {
  const queue = [new URL("manga/", root)];
  let htmlCount = 0;
  while (queue.length) {
    const directory = queue.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) queue.push(target);
      if (!entry.isFile() || entry.name !== "index.html") continue;
      const html = readFileSync(target, "utf8");
      assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
      assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none';/);
      assert.match(html, /base-uri 'none'; form-action 'none'; upgrade-insecure-requests/);
      htmlCount += 1;
    }
  }
  assert.ok(htmlCount >= 14);
});

test("catalog, documentation, laboratory, and policy pages declare loading policies", () => {
  const pages = [
    "plugins/index.html",
    "plugins/hub.html",
    "plugins/market.html",
    "plugins/store.html",
    "nyxovira/plugin-api/index.html",
    "nyxovira/plugin-api/tester/index.html",
    "nyxovira/plugin-api/examples/index.html",
    "nyxovira/plugin-api/examples/encrypted-api/index.html",
    "privacy/index.html",
    "terms/index.html",
    "nyxovira/privacy/index.html",
    "nyxalira/privacy/index.html"
  ];
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
    assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none';/);
    assert.match(html, /base-uri 'none'/);
    assert.match(html, /object-src 'none'/);
  }
  assert.match(read("nyxovira/plugin-api/tester/index.html"), /connect-src https:\/\/nyxovira-plugin-lab\.nanquimori-kapitomo\.workers\.dev/);
});

test("security contact and catalog version are current", () => {
  assert.ok(existsSync(new URL(".well-known/security.txt", root)));
  const security = read(".well-known/security.txt");
  assert.match(security, /^Contact: mailto:/m);
  assert.match(security, /^Canonical: https:\/\/nanquimori\.github\.io\/KapiTomo\/\.well-known\/security\.txt$/m);

  const manifest = JSON.parse(read("nyxovira/plugin-api/kapitomo/plugin.json"));
  const store = JSON.parse(read("plugins/catalog-store.json"));
  const alias = JSON.parse(read("plugins/catalog.json"));
  assert.equal(manifest.version, "1.0.18");
  assert.equal(store.plugins[0].version, manifest.version);
  assert.deepEqual(alias, store);
});
