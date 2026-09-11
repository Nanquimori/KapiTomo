import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const lab = read("nyxovira/plugin-api/tester/lab.js");
const labPage = read("nyxovira/plugin-api/tester/index.html");
const worker = read("plugin-lab-worker/src/index.js");
const docsPt = read("nyxovira/plugin-api/PLUGIN_API.pt-BR.md");
const jsonApiExample = read("nyxovira/plugin-api/examples/json-api/plugin.json");

test("published lab page cache-busts the runtime after fixes", () => {
  assert.match(labPage, /lab\.js\?v=20260911-native-parser-parity/);
  assert.doesNotMatch(labPage, /src="\.\/lab\.js"/);
});

test("web lab validates both boundaries of the supplied work", () => {
  assert.match(lab, /plan\.chapters\[plan\.chapters\.length - 1\]/);
  assert.match(lab, /selectedChapterIds: \[selectedChapterId\]/);
  assert.match(lab, /validateBoundaryPlan/);
  assert.match(lab, /exact-work-complete-boundary-chapters/);
  assert.match(lab, /testedChapterCount/);
  assert.match(lab, /Capítulo \$\{selectedChapterId\}/);
  assert.match(lab, /"Página " \+ \(index \+ 1\)/);
});
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

test("source-page JavaScript errors do not invalidate an otherwise working plugin", () => {
  assert.match(lab, /type: "source-warning"/);
  assert.match(lab, /message\.type === "source-warning"/);
  assert.match(lab, /página carregada com aviso/);
  assert.match(lab, /text !== "\[object Event\]"/);
  assert.doesNotMatch(lab, /addEventListener\("error",[\s\S]{0,160}type: "sandbox-error"/);
});

test("module relay remains restricted to the signed plugin hosts", () => {
  assert.match(worker, /verifyToken\(env\.LAB_TOKEN_SECRET/);
  assert.match(worker, /hostMatches\(target\.hostname, token\.hosts\)/);
  assert.match(worker, /hostMatches\(loaded\.finalUrl\.hostname, token\.hosts\)/);
  assert.match(worker, /"cache-control": "no-store"/);
});

test("chapter media validation uses the Nyxovira request profile and never approves a partial chapter", () => {
  assert.match(worker, /async function handleMedia/);
  assert.match(worker, /assertPublicHttpUrl\(input\.url, "Imagem do capítulo"\)/);
  assert.match(worker, /contentType\.startsWith\("image\/"\)/);
  assert.match(worker, /url\.pathname === "\/media"/);
  assert.match(lab, /const maxPages = 120/);
  assert.match(lab, /const maxChapterBytes = 96 \* 1024 \* 1024/);
  assert.match(lab, /pages\.length > maxPages/);
  assert.match(lab, /nativeDownloadWorkers = 4/);
  assert.match(lab, /nativeDownloadRetries = 3/);
  assert.match(lab, /nativeDownloadBatchSize = nativeDownloadWorkers \* 2/);
  assert.match(lab, /downloadBatchLikeNyxovira/);
  assert.match(lab, /Promise\.all/);
  assert.match(lab, /headers: \{ Accept: "\*\/\*", Referer:/);
  assert.doesNotMatch(lab, /pages\.slice\(0, maxPages\)/);
  assert.doesNotMatch(lab, /verifiedPages > 0\) break/);
  assert.match(lab, /verifiedPages \+= batchResults\.length/);
  assert.match(lab, /nenhuma página foi ignorada/);
  assert.match(lab, /validationScope\s*=\s*"exact-work-complete-boundary-chapters"/);
  assert.match(lab, /verifiedByteCount/);
  assert.match(lab, /await mediaFetch\(prepared\.token/);
  assert.match(lab, /packageSha256/);
  assert.match(lab, /PLUGIN_VALID_FOR_TESTED_WORK/);
  assert.doesNotMatch(lab, /O capítulo tem .*limite web/);
  assert.doesNotMatch(lab, /O capítulo excedeu o limite web/);
});

test("worker uses the same network identity as the Android downloader", () => {
  assert.match(worker, /Linux; Android 14; Nyxovira/);
  assert.doesNotMatch(worker, /Pixel 7|Version\/4\.0/);
});

test("web lab exercises and reports the native aes_json_api fallback route", () => {
  assert.match(worker, /nativeParser: parserForLab\(plugin\.manifest\.parser\)/);
  assert.match(lab, /validateNativeParserPath/);
  assert.match(lab, /chapter_api_path_template contém/);
  assert.match(lab, /substitui somente \{chapter\} e \{workId\}/);
  assert.match(lab, /Accept: "application\/json"/);
  assert.match(lab, /"Content-Type": "application\/json"/);
  assert.match(lab, /key: "parser_nativo"/);
  assert.match(lab, /respondeu HTTP \$\{response\.status\}/);
  assert.match(lab, /error\?\.diagnosticKey \|\| "diagnóstico"/);
  assert.match(lab, /reportableEndpoint/);
  assert.match(docsPt, /substitui exatamente `\{chapter\}` e `\{workId\}`/);
  assert.doesNotMatch(JSON.parse(jsonApiExample).parser.chapter_api_path_template, /chapter_id|chapterId/);
});
