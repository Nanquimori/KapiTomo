#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import yauzl from "yauzl";
import { assertSafeRemoteUrl } from "./network-policy.mjs";

const testerDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const host = "127.0.0.1";
const requestedPort = Number(option("--port", process.env.NYXOVIRA_LAB_PORT || "4173"));
const allowLocal = args.includes("--allow-local");
const openBrowser = args.includes("--open");
const MAX_ZIP_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 16 * 1024 * 1024;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 128;
const MAX_REPORT_BYTES = 128 * 1024;
const TEST_TIMEOUT_MS = 90_000;

function sendJson(response, status, value) {
  const body = Buffer.from(JSON.stringify(value, null, 2));
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(body);
}

function isLoopback(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_ZIP_BYTES) throw new Error("ZIP exceeds the 8 MiB laboratory limit.");
    chunks.push(chunk);
  }
  if (!total) throw new Error("Select a non-empty plugin ZIP.");
  return Buffer.concat(chunks);
}

function safeEntryName(rawName) {
  const normalized = String(rawName || "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.includes("\0") || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe ZIP entry: ${rawName}`);
  }
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) throw new Error(`Unsafe ZIP entry: ${rawName}`);
  return parts.join("/");
}

async function extractPluginZip(zipBytes, destination) {
  const zip = await new Promise((resolve, reject) => {
    yauzl.fromBuffer(zipBytes, { lazyEntries: true, strictFileNames: false, validateEntrySizes: true }, (error, openedZip) => {
      if (error || !openedZip) reject(new Error("The uploaded file is not a readable ZIP."));
      else resolve(openedZip);
    });
  });
  let entryCount = 0;
  let totalBytes = 0;
  await new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      zip.close();
      reject(error);
    };
    const readBytes = (entry) => new Promise((resolveEntry, rejectEntry) => {
      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) return rejectEntry(error || new Error(`Could not read ${entry.fileName}.`));
        const chunks = [];
        let byteCount = 0;
        stream.on("data", (chunk) => {
          byteCount += chunk.length;
          if (byteCount > MAX_FILE_BYTES) stream.destroy(new Error(`ZIP entry exceeds 4 MiB: ${entry.fileName}`));
          else chunks.push(chunk);
        });
        stream.on("error", rejectEntry);
        stream.on("end", () => resolveEntry(Buffer.concat(chunks)));
      });
    });
    zip.on("error", fail);
    zip.on("entry", (entry) => {
      (async () => {
        entryCount += 1;
        if (entryCount > MAX_ENTRIES) throw new Error(`ZIP contains more than ${MAX_ENTRIES} entries.`);
        const relativeName = safeEntryName(entry.fileName);
        const unixType = (Number(entry.externalFileAttributes || 0) >>> 16) & 0o170000;
        if (unixType === 0o120000) throw new Error(`Symbolic links are blocked: ${relativeName}`);
        if (/\/$/.test(entry.fileName)) return zip.readEntry();
        const declaredSize = Number(entry.uncompressedSize || 0);
        if (declaredSize > MAX_FILE_BYTES) throw new Error(`ZIP entry exceeds 4 MiB: ${relativeName}`);
        totalBytes += declaredSize;
        if (totalBytes > MAX_EXTRACTED_BYTES) throw new Error("Expanded ZIP exceeds the 16 MiB laboratory limit.");
        const bytes = await readBytes(entry);
        const outputFile = path.resolve(destination, ...relativeName.split("/"));
        if (!outputFile.startsWith(`${path.resolve(destination)}${path.sep}`)) throw new Error(`ZIP path escapes its session: ${relativeName}`);
        await fs.mkdir(path.dirname(outputFile), { recursive: true });
        await fs.writeFile(outputFile, bytes);
        zip.readEntry();
      })().catch(fail);
    });
    zip.on("end", () => {
      if (settled) return;
      settled = true;
      if (!entryCount) reject(new Error("ZIP is empty."));
      else resolve();
    });
    zip.readEntry();
  });
  const candidates = [];
  async function visit(directory, depth = 0) {
    if (depth > 2) return;
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === "plugin.json") candidates.push(directory);
      if (entry.isDirectory()) await visit(child, depth + 1);
    }
  }
  await visit(destination);
  const uniqueCandidates = [...new Set(candidates)];
  if (uniqueCandidates.length !== 1) throw new Error("ZIP must contain exactly one plugin.json at the root or inside one wrapper folder.");
  return uniqueCandidates[0];
}

function runTester(pluginDirectory, workUrl, outputDirectory, chapterId) {
  return new Promise((resolve, reject) => {
    const childArgs = [
      "test-plugin.js",
      pluginDirectory,
      workUrl,
      "--output", outputDirectory,
      "--max-pages", "24",
      "--max-bytes", String(24 * 1024 * 1024)
    ];
    if (chapterId) childArgs.push("--chapter-id", chapterId);
    if (allowLocal) childArgs.push("--allow-local");
    const child = spawn(process.execPath, childArgs, { cwd: testerDir, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const append = (current, chunk) => `${current}${chunk}`.slice(-MAX_REPORT_BYTES);
    child.stdout.on("data", (chunk) => stdout = append(stdout, chunk));
    child.stderr.on("data", (chunk) => stderr = append(stderr, chunk));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Plugin test exceeded the 90 second laboratory limit."));
    }, TEST_TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function executeTemporaryTest(zipBytes, workUrl, chapterId) {
  const sessionId = crypto.randomUUID();
  const sessionRoot = await fs.mkdtemp(path.join(os.tmpdir(), `nyxovira-plugin-lab-${sessionId}-`));
  const pluginRoot = path.join(sessionRoot, "plugin");
  const outputRoot = path.join(sessionRoot, "output");
  let payload;
  try {
    await fs.mkdir(pluginRoot, { recursive: true });
    await assertSafeRemoteUrl(workUrl, { allowLocal });
    const pluginDirectory = await extractPluginZip(zipBytes, pluginRoot);
    const execution = await runTester(pluginDirectory, workUrl, outputRoot, chapterId);
    let report;
    try {
      report = JSON.parse(await fs.readFile(path.join(outputRoot, "report.json"), "utf8"));
    } catch {
      report = { schemaVersion: 1, verdict: "PLUGIN_INVALID", success: false, error: execution.stderr || "Tester did not produce report.json.", steps: [] };
    }
    payload = { report, stdout: execution.stdout, stderr: execution.stderr, exitCode: execution.code };
  } catch (error) {
    payload = {
      report: { schemaVersion: 1, verdict: "PLUGIN_INVALID", success: false, error: error.message || String(error), steps: [] },
      stdout: "",
      stderr: error.message || String(error),
      exitCode: 1
    };
  }
  let temporaryFilesDeleted = false;
  try {
    await fs.rm(sessionRoot, { recursive: true, force: true });
    temporaryFilesDeleted = true;
  } catch (error) {
    payload.report.success = false;
    payload.report.verdict = "PLUGIN_INVALID";
    payload.report.error = `Temporary test files could not be deleted: ${error.message || error}`;
  }
  return { ...payload, temporaryFilesDeleted, testedChapterLimit: 1, pageLimit: 24, sessionStored: false };
}

const server = http.createServer(async (request, response) => {
  if (!isLoopback(request.socket.remoteAddress)) return sendJson(response, 403, { error: "The laboratory accepts loopback connections only." });
  const baseUrl = `http://${request.headers.host || `${host}:${requestedPort}`}`;
  const requestUrl = new URL(request.url || "/", baseUrl);
  if (request.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html")) {
    const html = await fs.readFile(path.join(testerDir, "index.html"));
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-length": html.length,
      "cache-control": "no-store",
      "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer"
    });
    return response.end(html);
  }
  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    return sendJson(response, 200, { ready: true, engine: "playwright", temporary: true, chapterLimit: 1, pageLimit: 24 });
  }
  if (request.method === "POST" && requestUrl.pathname === "/api/test") {
    const origin = String(request.headers.origin || "");
    if (origin && origin !== baseUrl) return sendJson(response, 403, { error: "Cross-origin test submission blocked." });
    if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/zip")) {
      return sendJson(response, 415, { error: "Send the plugin as application/zip." });
    }
    const workUrl = requestUrl.searchParams.get("workUrl") || "";
    const chapterId = requestUrl.searchParams.get("chapterId") || "";
    if (!workUrl) return sendJson(response, 400, { error: "A real work URL is required." });
    try {
      const zipBytes = await readBody(request);
      const result = await executeTemporaryTest(zipBytes, workUrl, chapterId);
      return sendJson(response, result.report.success ? 200 : 422, result);
    } catch (error) {
      return sendJson(response, 400, { error: error.message || String(error), temporaryFilesDeleted: true, sessionStored: false });
    }
  }
  return sendJson(response, 404, { error: "Not found." });
});

server.listen(Number.isFinite(requestedPort) ? requestedPort : 4173, host, () => {
  const address = server.address();
  const url = `http://${host}:${address.port}/`;
  process.stdout.write(`NYXOVIRA_PLUGIN_LAB_READY ${url}\n`);
  if (openBrowser) {
    const command = process.platform === "win32" ? "cmd.exe" : process.platform === "darwin" ? "open" : "xdg-open";
    const browserArgs = process.platform === "win32" ? ["/d", "/s", "/c", `start "" "${url}"`] : [url];
    const opener = spawn(command, browserArgs, { detached: true, stdio: "ignore", windowsHide: true });
    opener.unref();
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));

