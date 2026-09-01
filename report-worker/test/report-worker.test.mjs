import assert from "node:assert/strict";
import test from "node:test";
import worker, { __test } from "../src/index.js";

const origin = "https://nanquimori.github.io";
const reason = "Este plugin redireciona a pagina para um endereco diferente e tenta coletar informacoes privadas sem explicar isso ao usuario. O comportamento ocorreu novamente depois de uma instalacao limpa e pode ser reproduzido ao abrir a pagina inicial e tocar no botao de download.";

function reportDatabase(executedStatements = []) {
  return {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            sql,
            values,
            async run() {
              executedStatements.push({ sql, values });
              return { success: true };
            }
          };
        }
      };
    },
    async batch(statements) {
      statements.forEach(({ sql, values }) => executedStatements.push({ sql, values }));
      return statements.map(() => ({ success: true }));
    }
  };
}

function environment(rateLimitSuccess = true, executedStatements = []) {
  return {
    ALLOWED_ORIGINS: origin,
    TURNSTILE_ALLOWED_HOSTNAMES: "nanquimori.github.io",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    REPORTS_DB: reportDatabase(executedStatements),
    REPORT_RATE_LIMITER: {
      async limit() {
        return { success: rateLimitSuccess };
      }
    }
  };
}

async function validPayload() {
  return {
    email: "reporter@example.com",
    plugin_id: "example-plugin",
    reason,
    duplicate_fingerprint: await __test.reportFingerprint("example-plugin", reason),
    truthfulness_confirmation: true,
    turnstile_token: "valid-turnstile-token",
    website: ""
  };
}

function reportRequest(payload, requestOrigin = origin) {
  return new Request("https://report.example/api/plugin-reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": requestOrigin,
      "CF-Connecting-IP": "203.0.113.10"
    },
    body: JSON.stringify(payload)
  });
}

test("accepts a valid report and stores it only after Turnstile verification", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const statements = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json({ success: true, action: "plugin-report", hostname: "nanquimori.github.io" });
  };
  try {
    const response = await worker.fetch(reportRequest(await validPayload()), environment(true, statements));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /siteverify$/);
    assert.equal(statements.length, 2);
    assert.match(statements[1].sql, /INSERT INTO plugin_reports/);
    assert.equal(statements[1].values[1], "example-plugin");
    assert.equal(statements[1].values[2], "reporter@example.com");
    assert.equal(statements[1].values[3], reason);
    assert.equal(statements.flatMap((statement) => statement.values).includes("valid-turnstile-token"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a forged fingerprint before calling external services", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ success: true });
  };
  try {
    const payload = await validPayload();
    payload.duplicate_fingerprint = "0".repeat(64);
    const response = await worker.fetch(reportRequest(payload), environment());
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_report");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects an invalid Turnstile result and never forwards the report", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ success: false, "error-codes": ["invalid-input-response"] });
  };
  try {
    const response = await worker.fetch(reportRequest(await validPayload()), environment());
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "captcha_failed");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects untrusted origins", async () => {
  const response = await worker.fetch(reportRequest(await validPayload(), "https://attacker.example"), environment());
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "origin_not_allowed");
  assert.equal(response.headers.has("Access-Control-Allow-Origin"), false);
});

test("answers an allowed CORS preflight without a response body", async () => {
  const request = new Request("https://report.example/api/plugin-reports", {
    method: "OPTIONS",
    headers: { Origin: origin }
  });
  const response = await worker.fetch(request, environment());
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
});

test("rate limits before parsing or forwarding a report", async () => {
  const response = await worker.fetch(reportRequest(await validPayload()), environment(false));
  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, "rate_limited");
  assert.equal(response.headers.get("Retry-After"), "60");
});

test("fails closed when the server rate limiter is not configured", async () => {
  const env = environment();
  delete env.REPORT_RATE_LIMITER;
  const response = await worker.fetch(reportRequest(await validPayload()), env);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "configuration_error");
});

test("fails closed when private report storage is not configured", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    action: "plugin-report",
    hostname: "nanquimori.github.io"
  });
  try {
    const env = environment();
    delete env.REPORTS_DB;
    const response = await worker.fetch(reportRequest(await validPayload()), env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "configuration_error");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts honeypot submissions without verifying or storing them", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const statements = [];
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ success: true });
  };
  try {
    const payload = await validPayload();
    payload.website = "https://bot.example";
    const response = await worker.fetch(reportRequest(payload), environment(true, statements));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(calls, 0);
    assert.equal(statements.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("scheduled cleanup deletes expired private reports", async () => {
  const statements = [];
  const env = environment(true, statements);
  let cleanup;
  await worker.scheduled({}, env, {
    waitUntil(promise) {
      cleanup = promise;
    }
  });
  await cleanup;
  assert.equal(statements.length, 1);
  assert.match(statements[0].sql, /DELETE FROM plugin_reports WHERE expires_at/);
});
