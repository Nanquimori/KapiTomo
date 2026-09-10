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
  assert.match(lab, /missingSynchronousUrl = absoluteUrl/);
  assert.match(lab, /runWithSynchronousPriming/);
  assert.match(lab, /await primeSynchronousResponse\(requestedUrl\)/);
  assert.match(lab, /Promise\.resolve\(prepare/);
  assert.match(lab, /headers\.Referer = currentUrl/);
  assert.match(lab, /this\.responseURL = cached\.finalUrl/);
  assert.match(lab, /"x-lab-final-url": response\.headers\.get\("x-lab-final-url"\)/);
});

test("web lab follows the same target-then-plan sequence as Nyxovira", () => {
  assert.match(lab, /return eval\(\$\{JSON\.stringify\(script\)\}\)/);
  assert.match(lab, /const resolvedTarget = await runWithSynchronousPriming/);
  assert.match(lab, /buildNyxoviraPagePlan\(\)/);
  assert.match(lab, /__reactFiber\$/);
  assert.match(lab, /__reactProps\$/);
  assert.match(lab, /activateChapterList\(\)/);
  assert.match(lab, /property === "location"\) return sourceLocation/);
  assert.doesNotMatch(lab, /O plugin não produziu o plano de capítulos/);
});

test("module relay remains restricted to the signed plugin hosts", () => {
  assert.match(worker, /verifyToken\(env\.LAB_TOKEN_SECRET/);
  assert.match(worker, /hostMatches\(target\.hostname, token\.hosts\)/);
  assert.match(worker, /hostMatches\(loaded\.finalUrl\.hostname, token\.hosts\)/);
  assert.match(worker, /"cache-control": "no-store"/);
});

test("chapter media validation accepts only public image responses and samples long chapters", () => {
  assert.match(worker, /async function handleMedia/);
  assert.match(worker, /assertPublicHttpUrl\(input\.url, "Imagem do capítulo"\)/);
  assert.match(worker, /contentType\.startsWith\("image\/"\)/);
  assert.match(worker, /url\.pathname === "\/media"/);
  assert.match(lab, /const testedPages = pages\.slice\(0, maxPages\)/);
  assert.match(lab, /await mediaFetch\(prepared\.token/);
  assert.doesNotMatch(lab, /O capítulo tem .*limite web/);
});
