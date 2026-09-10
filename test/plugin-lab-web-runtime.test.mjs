import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const lab = read("nyxovira/plugin-api/tester/lab.js");
const worker = read("plugin-lab-worker/src/index.js");

test("web lab executes dynamic source modules instead of discarding them", () => {
  assert.doesNotMatch(lab, /if \(source\.type === "module"\) continue/);
  assert.match(lab, /await loadModule\(source\)/);
  assert.match(lab, /await waitForDynamicRender\(initialMarkup\)/);
  assert.match(lab, /apiBase, token: prepared\.token/);
  assert.match(lab, /excedeu 60 segundos[\s\S]{0,80}60000/);
  assert.match(worker, /handleSourceModule/);
  assert.match(worker, /url\.pathname\.startsWith\("\/source\/"\)/);
  assert.match(worker, /script-src 'self'/);
});

test("web lab relays null-body XHR and preserves synchronous WebView responses", () => {
  assert.match(lab, /if \(body == null\) body = undefined/);
  assert.match(lab, /this\.async = async !== false/);
  assert.match(lab, /synchronousResponses\.get\(absoluteUrl\)/);
  assert.match(lab, /await primeSynchronousResponse/);
  assert.match(lab, /this\.responseURL = cached\.finalUrl/);
  assert.match(lab, /"x-lab-final-url": response\.headers\.get\("x-lab-final-url"\)/);
});

test("module relay remains restricted to the signed plugin hosts", () => {
  assert.match(worker, /verifyToken\(env\.LAB_TOKEN_SECRET/);
  assert.match(worker, /hostMatches\(target\.hostname, token\.hosts\)/);
  assert.match(worker, /hostMatches\(loaded\.finalUrl\.hostname, token\.hosts\)/);
  assert.match(worker, /"cache-control": "no-store"/);
});
