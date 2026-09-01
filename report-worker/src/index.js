const REPORT_PATH = "/api/plugin-reports";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_BODY_BYTES = 16 * 1024;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;
const MIN_REASON_CHARACTERS = 200;
const MAX_REASON_CHARACTERS = 2000;
const MIN_REASON_WORDS = 20;
const REPORT_RETENTION_DAYS = 90;

function configuredValues(value) {
  return new Set(String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean));
}

function responseHeaders(request, env) {
  const origin = String(request.headers.get("Origin") || "");
  const allowedOrigins = configuredValues(env.ALLOWED_ORIGINS);
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  });
  if (allowedOrigins.has(origin.toLowerCase())) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function jsonResponse(request, env, status, body, extraHeaders = {}) {
  const headers = responseHeaders(request, env);
  Object.entries(extraHeaders).forEach(([name, value]) => headers.set(name, value));
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function isAllowedOrigin(request, env) {
  const origin = String(request.headers.get("Origin") || "").trim().toLowerCase();
  return Boolean(origin) && configuredValues(env.ALLOWED_ORIGINS).has(origin);
}

async function readJsonWithLimit(request) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    throw new Error("payload_too_large");
  }
  if (!request.body) {
    throw new Error("invalid_json");
  }

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("payload_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("invalid_json");
  }
}

function normalizeReason(pluginId, reason) {
  const normalizedReason = String(reason || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return `${String(pluginId || "").trim().toLowerCase()}|${normalizedReason}`;
}

async function reportFingerprint(pluginId, reason) {
  const bytes = new TextEncoder().encode(normalizeReason(pluginId, reason));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function reportWords(reason) {
  return String(reason || "").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}

async function validatePayload(input) {
  const pluginId = String(input?.plugin_id || "").trim().toLowerCase();
  const email = String(input?.email || "").trim();
  const reason = String(input?.reason || "").trim();
  const fingerprint = String(input?.duplicate_fingerprint || "").trim().toLowerCase();
  const turnstileToken = String(input?.turnstile_token || "").trim();
  const reasonLength = Array.from(reason).length;

  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(pluginId)
      || email.length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
      || reasonLength < MIN_REASON_CHARACTERS
      || reasonLength > MAX_REASON_CHARACTERS
      || reportWords(reason).length < MIN_REASON_WORDS
      || input?.truthfulness_confirmation !== true) {
    throw new Error("invalid_report");
  }
  if (!turnstileToken || turnstileToken.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    throw new Error("captcha_required");
  }

  const expectedFingerprint = await reportFingerprint(pluginId, reason);
  if (!/^[a-f0-9]{64}$/.test(fingerprint) || fingerprint !== expectedFingerprint) {
    throw new Error("invalid_report");
  }
  return { pluginId, email, reason, fingerprint, turnstileToken };
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) {
    throw new Error("configuration_error");
  }
  const remoteIp = String(request.headers.get("CF-Connecting-IP") || "").trim();
  const body = {
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    idempotency_key: crypto.randomUUID()
  };
  if (remoteIp) {
    body.remoteip = remoteIp;
  }

  const verificationResponse = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!verificationResponse.ok) {
    throw new Error("captcha_unavailable");
  }
  const result = await verificationResponse.json();
  const allowedHostnames = configuredValues(env.TURNSTILE_ALLOWED_HOSTNAMES);
  const hostname = String(result.hostname || "").toLowerCase();
  if (result.success !== true
      || result.action !== "plugin-report"
      || !allowedHostnames.has(hostname)) {
    throw new Error("captcha_failed");
  }
}

async function storeReport(env, report) {
  if (!env.REPORTS_DB || typeof env.REPORTS_DB.prepare !== "function") {
    throw new Error("configuration_error");
  }
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const statements = [
    env.REPORTS_DB.prepare("DELETE FROM plugin_reports WHERE expires_at <= ?1").bind(createdAt),
    env.REPORTS_DB.prepare(`
      INSERT INTO plugin_reports (
        id, plugin_id, contact_email, reason, duplicate_fingerprint,
        status, created_at, updated_at, expires_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, 'new', ?6, ?6, ?7)
      ON CONFLICT(duplicate_fingerprint) DO UPDATE SET updated_at = excluded.updated_at
    `).bind(
      crypto.randomUUID(),
      report.pluginId,
      report.email,
      report.reason,
      report.fingerprint,
      createdAt,
      expiresAt
    )
  ];
  try {
    const results = typeof env.REPORTS_DB.batch === "function"
      ? await env.REPORTS_DB.batch(statements)
      : await Promise.all(statements.map((statement) => statement.run()));
    if (!Array.isArray(results) || results.some((result) => result?.success !== true)) {
      throw new Error("storage_failed");
    }
  } catch {
    throw new Error("storage_failed");
  }
}

async function deleteExpiredReports(env, now = new Date()) {
  if (!env.REPORTS_DB || typeof env.REPORTS_DB.prepare !== "function") {
    throw new Error("configuration_error");
  }
  const result = await env.REPORTS_DB
    .prepare("DELETE FROM plugin_reports WHERE expires_at <= ?1")
    .bind(now.toISOString())
    .run();
  if (result?.success !== true) {
    throw new Error("storage_failed");
  }
}

async function rateLimit(request, env) {
  if (!env.REPORT_RATE_LIMITER || typeof env.REPORT_RATE_LIMITER.limit !== "function") {
    throw new Error("configuration_error");
  }
  const remoteIp = String(request.headers.get("CF-Connecting-IP") || "unknown").trim();
  const result = await env.REPORT_RATE_LIMITER.limit({ key: `plugin-report:${remoteIp}` });
  return result.success === true;
}

async function handleReport(request, env) {
  if (!isAllowedOrigin(request, env)) {
    return jsonResponse(request, env, 403, { success: false, code: "origin_not_allowed" });
  }
  if (!String(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
    return jsonResponse(request, env, 415, { success: false, code: "unsupported_media_type" });
  }
  let rateLimitAccepted;
  try {
    rateLimitAccepted = await rateLimit(request, env);
  } catch {
    return jsonResponse(request, env, 503, { success: false, code: "configuration_error" });
  }
  if (!rateLimitAccepted) {
    return jsonResponse(request, env, 429, { success: false, code: "rate_limited" }, { "Retry-After": "60" });
  }

  let input;
  try {
    input = await readJsonWithLimit(request);
  } catch (error) {
    const tooLarge = error.message === "payload_too_large";
    return jsonResponse(request, env, tooLarge ? 413 : 400, {
      success: false,
      code: tooLarge ? "payload_too_large" : "invalid_json"
    });
  }

  if (String(input?.website || "").trim()) {
    return jsonResponse(request, env, 200, { success: true });
  }

  try {
    const report = await validatePayload(input);
    await verifyTurnstile(request, env, report.turnstileToken);
    await storeReport(env, report);
    return jsonResponse(request, env, 200, { success: true });
  } catch (error) {
    const code = String(error?.message || "storage_failed");
    const clientErrorCodes = new Set(["invalid_report", "captcha_required", "captcha_failed"]);
    const unavailableCodes = new Set(["captcha_unavailable", "configuration_error", "storage_failed"]);
    return jsonResponse(request, env, clientErrorCodes.has(code) ? 400 : unavailableCodes.has(code) ? 503 : 500, {
      success: false,
      code
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(request, env, 200, { success: true });
    }
    if (url.pathname !== REPORT_PATH) {
      return jsonResponse(request, env, 404, { success: false, code: "not_found" });
    }
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(request, env)) {
        return jsonResponse(request, env, 403, { success: false, code: "origin_not_allowed" });
      }
      return jsonResponse(request, env, 204, null, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400"
      });
    }
    if (request.method !== "POST") {
      return jsonResponse(request, env, 405, { success: false, code: "method_not_allowed" }, { "Allow": "POST, OPTIONS" });
    }
    return handleReport(request, env);
  },

  async scheduled(_event, env, context) {
    context.waitUntil(deleteExpiredReports(env));
  }
};

export const __test = { normalizeReason, reportFingerprint, validatePayload, storeReport, deleteExpiredReports };
