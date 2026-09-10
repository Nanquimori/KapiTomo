import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "nyxovira-plugin-test-"));
const pluginDir = path.join(scratch, "plugin");
const outputDir = path.join(scratch, "output");
await fs.mkdir(path.join(pluginDir, "browser"), { recursive: true });

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const server = http.createServer((request, response) => {
  if (request.url === "/page.png") {
    response.writeHead(200, { "content-type": "image/png" });
    response.end(png);
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end("<!doctype html><h1>Fixture work</h1><a data-chapter-id='chapter-1' href='/read/1'>Chapter 1</a>");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const workUrl = `http://127.0.0.1:${port}/work`;

await fs.writeFile(path.join(pluginDir, "plugin.json"), JSON.stringify({
  id: "self-test",
  match: { hosts: ["127.0.0.1"] },
  browser: { home_url: `http://127.0.0.1:${port}/`, download_target_script_file: "browser/download_target.js" }
}, null, 2));
await fs.writeFile(path.join(pluginDir, "browser", "download_target.js"), `(function(){
  window.__nyxoviraChapterPlan=JSON.stringify({title:document.querySelector('h1').textContent,canonicalUrl:location.href,chapters:[{id:'chapter-1',number:'1',title:'Chapter 1',url:new URL('/read/1',location.href).href,contentType:'images',pages:[new URL('/page.png',location.href).href]}]});
  return location.href;
})();`);

try {
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["test-plugin.js", pluginDir, workUrl, "--output", outputDir], { cwd: path.dirname(fileURLToPath(import.meta.url)), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  const report = JSON.parse(await fs.readFile(path.join(outputDir, "report.json"), "utf8"));
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}\n${JSON.stringify(report, null, 2)}`);
  assert.equal(report.verdict, "PLUGIN_VALID");
  assert.equal(report.selectedChapterId, "chapter-1");
  assert.ok((await fs.stat(path.join(outputDir, "chapter-001", "001.png"))).size > 0);
  process.stdout.write("nyxovira-plugin-test self-test passed\n");
} finally {
  server.close();
  await fs.rm(scratch, { recursive: true, force: true });
}
