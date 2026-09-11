import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

test("keeps the original Plugin API visual structure", () => {
  const html = read("nyxovira/plugin-api/index.html");

  assert.match(html, /class="page"/);
  assert.match(html, /class="brand"/);
  assert.match(html, /class="stripe"/);
  assert.match(html, /class="prompt-grid"/);
  assert.match(html, /--accent:\s*#7b35f5/);
  assert.match(html, /--accent-2:\s*#a764ff/);
  assert.doesNotMatch(html, /#ff7b58|#f4b247|#b62038|#ffd998|rgba\(255, 123, 88|rgba\(255, 178, 71|rgba\(182, 32, 56/i);
  assert.doesNotMatch(html, /class="shell"/);
  assert.doesNotMatch(html, /border-radius:\s*22px/);
});

test("keeps every legal page in the original card layout without language pills", () => {
  const pages = [
    "terms/index.html",
    "privacy/index.html",
    "nyxovira/privacy/index.html",
    "nyxalira/privacy/index.html"
  ];

  for (const page of pages) {
    const html = read(page);
    assert.match(html, /class="site-header"/);
    assert.match(html, /class="legal-page"/);
    assert.match(html, /class="legal-document"/);
    assert.doesNotMatch(html, /class="policy-language"/);
    assert.doesNotMatch(html, /data-policy-language-option/);
    assert.doesNotMatch(html, /\.policy-language/);
  }
});

test("keeps local links on the restored documentation pages valid", () => {
  const pages = [
    "nyxovira/plugin-api/index.html",
    "terms/index.html",
    "privacy/index.html",
    "nyxovira/privacy/index.html",
    "nyxalira/privacy/index.html"
  ];

  for (const page of pages) {
    const html = read(page);
    const visibleMarkup = html.replace(/<pre[\s\S]*?<\/pre>/g, "");
    for (const match of visibleMarkup.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const reference = match[1].split("#", 1)[0].split("?", 1)[0];
      if (!reference || /^(?:https?:|mailto:|data:|javascript:|\/\/)/i.test(reference)) continue;
      const target = resolve(dirname(resolve(projectRoot, page)), reference);
      assert.ok(existsSync(target) || existsSync(resolve(target, "index.html")), `${page} -> ${match[1]}`);
    }
  }
});
