#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const pluginArg = args.shift();
const workUrl = args.shift();
const option = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const headed = args.includes("--headed");
const requestedChapterId = option("--chapter-id");
const testerDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(option("--output", path.join(testerDir, "test-output")));
const report = { schemaVersion: 1, verdict: "PLUGIN_INVALID", success: false, workUrl: workUrl || "", startedAt: new Date().toISOString(), steps: [] };
const step = (key, status, detail) => report.steps.push({ key, status, detail });

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  JSON.parse(await fs.readFile(file, "utf8"));
}

async function finish(error) {
  if (error) {
    step(report.stage || "tester", "FAIL", error.message || String(error));
    report.error = error.message || String(error);
  }
  report.finishedAt = new Date().toISOString();
  await writeJson(path.join(outputDir, "report.json"), report);
  process.stdout.write(`${report.verdict}\n${path.join(outputDir, "report.json")}\n`);
  process.exitCode = report.success ? 0 : 1;
}

if (!pluginArg || !workUrl) {
  await fs.mkdir(outputDir, { recursive: true });
  await finish(new Error("Usage: node test-plugin.js <plugin-directory> <real-work-url> [--chapter-id ID] [--output DIR] [--headed]"));
} else {
  let browser;
  try {
    report.stage = "manifest";
    const pluginDir = path.resolve(pluginArg);
    const manifest = JSON.parse(await fs.readFile(path.join(pluginDir, "plugin.json"), "utf8"));
    const schema = JSON.parse(await fs.readFile(path.join(testerDir, "..", "plugin.schema.json"), "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    if (!validate(manifest)) throw new Error(`plugin.json does not match plugin.schema.json: ${ajv.errorsText(validate.errors)}`);
    const target = new URL(workUrl);
    if (!manifest.match.hosts.some((host) => target.hostname === host || target.hostname.endsWith(`.${host}`))) throw new Error("The work URL host is not declared in match.hosts.");
    const scriptName = manifest.browser.download_target_script_file;
    if (!scriptName) throw new Error("The command-line tester requires browser.download_target_script_file; use the in-app diagnostic for parser-only legacy plugins.");
    const scriptFile = path.resolve(pluginDir, scriptName);
    if (!scriptFile.startsWith(`${pluginDir}${path.sep}`)) throw new Error("The browser script path escapes the plugin directory.");
    const pluginScript = await fs.readFile(scriptFile, "utf8");
    step("manifest", "PASS", "Manifest, host, schema, and browser script are valid.");

    report.stage = "site";
    try {
      browser = await chromium.launch({ channel: "msedge", headless: !headed });
    } catch {
      browser = await chromium.launch({ headless: !headed });
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    const response = await page.goto(workUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!response || !response.ok()) throw new Error(`Work page HTTP ${response?.status() || 0}.`);
    await page.addScriptTag({ content: pluginScript });
    await page.waitForFunction(() => typeof window.__nyxoviraChapterPlan === "string", null, { timeout: 15000 });
    step("site", "PASS", `Work page loaded with HTTP ${response.status()}.`);

    report.stage = "work";
    let plan = await page.evaluate(() => JSON.parse(window.__nyxoviraChapterPlan));
    if (!plan || !String(plan.title || "").trim()) throw new Error("The chapter plan has no work title.");
    if (!Array.isArray(plan.chapters) || !plan.chapters.length) throw new Error("The chapter plan has no chapters.");
    const selected = requestedChapterId
      ? plan.chapters.find((chapter) => String(chapter.id) === requestedChapterId)
      : plan.chapters[0];
    if (!selected || !String(selected.id || "").trim()) throw new Error("The selected chapter has no exact stable id.");
    const selectedChapterId = String(selected.id);
    await writeJson(path.join(outputDir, "work.json"), { title: plan.title, summary: plan.summary || "", canonicalUrl: plan.canonicalUrl || workUrl, chapterCount: plan.chapters.length });
    step("work", "PASS", `${plan.title}: ${plan.chapters.length} chapter(s).`);

    report.stage = "selection";
    plan = await page.evaluate(async ({ selectedChapterId, plan }) => {
      const fn = window.__nyxoviraPrepareDownloadPlan || window.Nyxovira?.prepareDownloadPlan;
      const prepared = typeof fn === "function" ? await fn({ selectedChapterIds: [selectedChapterId], chapterPlan: plan }) : plan;
      const resolved = typeof prepared === "string" ? JSON.parse(prepared) : (prepared || JSON.parse(window.__nyxoviraChapterPlan));
      return resolved;
    }, { selectedChapterId, plan });
    const preparedChapter = plan.chapters.find((chapter) => String(chapter.id) === selectedChapterId);
    if (!preparedChapter) throw new Error("ID invariant failed: the chapter plan id does not exactly equal selectedChapterIds[0].");
    step("selection", "PASS", `${selectedChapterId} survived prepare without transformation.`);
    await writeJson(path.join(outputDir, "chapter-plan.json"), plan);

    report.stage = "content";
    const chapterDir = path.join(outputDir, "chapter-001");
    const paragraphs = Array.isArray(preparedChapter.paragraphs) ? preparedChapter.paragraphs.map(String).filter((value) => value.trim()) : [];
    const pages = Array.isArray(preparedChapter.pages) ? preparedChapter.pages : (Array.isArray(preparedChapter.images) ? preparedChapter.images : []);
    if (paragraphs.length) {
      const chapter = { id: selectedChapterId, title: preparedChapter.title || preparedChapter.label || "Chapter", paragraphs };
      const chapterFile = path.join(chapterDir, "chapter.json");
      await writeJson(chapterFile, chapter);
      if (!(await fs.stat(chapterFile)).size) throw new Error("The saved novel chapter is empty.");
      step("download", "PASS", `${paragraphs.length} paragraph(s) saved and reopened.`);
    } else if (pages.length) {
      const first = typeof pages[0] === "string" ? { url: pages[0] } : pages[0];
      const pageUrl = new URL(first.url || first.src || first.image || first.imageUrl, workUrl).href;
      const pageResponse = await context.request.get(pageUrl, { headers: { Referer: preparedChapter.url || workUrl, ...(first.headers || {}) }, timeout: 45000 });
      if (!pageResponse.ok()) throw new Error(`First page HTTP ${pageResponse.status()}.`);
      const contentType = String(pageResponse.headers()["content-type"] || "").toLowerCase();
      if (!contentType.startsWith("image/")) throw new Error(`First page is not an image (${contentType || "unknown content type"}).`);
      const bytes = await pageResponse.body();
      if (!bytes.length) throw new Error("The first downloaded page is empty.");
      const extension = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
      const imageFile = path.join(chapterDir, `001${extension}`);
      await fs.mkdir(chapterDir, { recursive: true });
      await fs.writeFile(imageFile, bytes);
      if (!(await fs.readFile(imageFile)).length) throw new Error("The saved page could not be reopened.");
      step("download", "PASS", `First page HTTP ${pageResponse.status()}; ${bytes.length} bytes saved and reopened.`);
    } else {
      throw new Error("The selected chapter resolved neither pages nor paragraphs.");
    }

    report.stage = "complete";
    report.success = true;
    report.verdict = "PLUGIN_VALID";
    report.pluginId = manifest.id || path.basename(pluginDir);
    report.selectedChapterId = selectedChapterId;
    step("complete", "PASS", "Real chapter output is complete and openable; the plugin passed this tested work and chapter.");
    await browser.close();
    browser = null;
    await finish();
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    await finish(error);
  }
}
