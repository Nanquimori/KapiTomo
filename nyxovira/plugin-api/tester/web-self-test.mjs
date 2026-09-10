import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yazl from "yazl";

const testerDir = path.dirname(fileURLToPath(import.meta.url));
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "nyxovira-plugin-lab-self-test-"));
const pluginDir = path.join(scratch, "plugin-wrapper");
await fs.mkdir(path.join(pluginDir, "browser"), { recursive: true });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const fixture = http.createServer((request, response) => {
  if (request.url === "/page.png" || request.url === "/page-2.png") {
    response.writeHead(200, { "content-type": "image/png" });
    response.end(png);
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end("<!doctype html><h1>Web laboratory fixture</h1><a href='/read/1'>Chapter 1</a>");
});
await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const fixturePort = fixture.address().port;
const workUrl = `http://127.0.0.1:${fixturePort}/work`;

await fs.writeFile(path.join(pluginDir, "plugin.json"), JSON.stringify({
  schema_version: 1,
  id: "web-lab-self-test",
  name: "Web Lab Self Test",
  version: "1.0.0",
  match: { hosts: ["127.0.0.1"] },
  browser: { home_url: `http://127.0.0.1:${fixturePort}/`, download_target_script_file: "browser/download_target.js" }
}, null, 2));
await fs.writeFile(path.join(pluginDir, "browser", "download_target.js"), `(function(){
  window.__nyxoviraChapterPlan=JSON.stringify({title:document.querySelector('h1').textContent,canonicalUrl:location.href,chapters:[{id:'chapter-1',number:'1',title:'Chapter 1',url:new URL('/read/1',location.href).href,contentType:'images',pages:[new URL('/page.png',location.href).href,new URL('/page-2.png',location.href).href]}]});
})();`);

async function createZip() {
  const zip = new yazl.ZipFile();
  zip.addFile(path.join(pluginDir, "plugin.json"), "plugin-wrapper/plugin.json");
  zip.addFile(path.join(pluginDir, "browser", "download_target.js"), "plugin-wrapper/browser/download_target.js");
  zip.end();
  const chunks = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const tempPrefix = "nyxovira-plugin-lab-";
const listSessions = async () => new Set((await fs.readdir(os.tmpdir())).filter((name) => name.startsWith(tempPrefix) && !name.startsWith("nyxovira-plugin-lab-self-test-")));
const beforeSessions = await listSessions();
const server = spawn(process.execPath, ["server.mjs", "--port", "0", "--allow-local"], { cwd: testerDir, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let serverUrl = "";
let serverStderr = "";
server.stderr.on("data", (chunk) => serverStderr += chunk);

try {
  serverUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Laboratory did not start. ${serverStderr}`)), 10_000);
    server.stdout.on("data", (chunk) => {
      const match = String(chunk).match(/NYXOVIRA_PLUGIN_LAB_READY\s+(http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    server.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Laboratory exited with ${code}. ${serverStderr}`));
    });
  });
  const health = await fetch(new URL("api/health", serverUrl)).then((response) => response.json());
  assert.equal(health.ready, true);
  assert.equal(health.chapterLimit, 1);
  const preflight = await fetch(new URL("api/test", serverUrl), {
    method: "OPTIONS",
    headers: { origin: "https://nanquimori.github.io", "access-control-request-method": "POST", "access-control-request-private-network": "true" }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://nanquimori.github.io");
  assert.equal(preflight.headers.get("access-control-allow-private-network"), "true");
  const response = await fetch(new URL(`api/test?workUrl=${encodeURIComponent(workUrl)}`, serverUrl), {
    method: "POST",
    headers: { "content-type": "application/zip", origin: "https://nanquimori.github.io" },
    body: await createZip()
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result, null, 2));
  assert.equal(response.headers.get("access-control-allow-origin"), "https://nanquimori.github.io");
  assert.equal(result.report.verdict, "PLUGIN_VALID");
  assert.equal(result.report.selectedChapterId, "chapter-1");
  assert.equal(result.temporaryFilesDeleted, true);
  assert.equal(result.sessionStored, false);
  assert.equal(result.testedChapterLimit, 1);
  const blockedResponse = await fetch(new URL(`api/test?workUrl=${encodeURIComponent("file:///private/plugin")}`, serverUrl), {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: await createZip()
  });
  const blockedResult = await blockedResponse.json();
  assert.equal(blockedResponse.status, 422);
  assert.equal(blockedResult.report.verdict, "PLUGIN_INVALID");
  assert.match(blockedResult.report.error, /Blocked URL protocol/);
  assert.equal(blockedResult.temporaryFilesDeleted, true);
  assert.equal(blockedResult.sessionStored, false);
  const afterSessions = await listSessions();
  assert.deepEqual([...afterSessions].sort(), [...beforeSessions].sort(), "Temporary laboratory session leaked after the response.");
  process.stdout.write("nyxovira plugin web laboratory self-test passed\n");
} finally {
  server.kill("SIGTERM");
  fixture.close();
  await fs.rm(scratch, { recursive: true, force: true });
}
