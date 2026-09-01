# KapiTomo report Worker

This Cloudflare Worker is the only endpoint the public Plugin Hub uses for reports. It validates the request on the server, verifies a single-use Turnstile token, rate limits requests, recomputes the duplicate fingerprint, and stores accepted reports privately in Cloudflare D1. FormSubmit is not used, so there is no public delivery endpoint that callers can bypass.

## Production setup

1. Install the pinned tooling with `npm ci` in this directory and authenticate with `npx wrangler login`.
2. Create a managed Turnstile widget restricted to `nanquimori.github.io` and store its secret:

   ```text
   npx wrangler turnstile widget create "KapiTomo Plugin Reports" --domain nanquimori.github.io --mode managed --json
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

3. Create the D1 database, add its `REPORTS_DB` binding to `wrangler.jsonc`, and apply the migration:

   ```text
   npx wrangler d1 create kapitomo-plugin-reports
   npx wrangler d1 migrations apply kapitomo-plugin-reports --remote
   ```

4. Run `npm test` and then `npm run deploy`.
5. Put the resulting `/api/plugin-reports` URL and the public Turnstile sitekey in `plugins/report-config.js`.

To review reports without making them public:

```text
npx wrangler d1 execute kapitomo-plugin-reports --remote --command "SELECT id, plugin_id, contact_email, reason, status, created_at FROM plugin_reports ORDER BY created_at DESC"
```

Equivalent reports share one fingerprint record and their quantity is not stored or treated as evidence. Records expire after 90 days; a daily scheduled Worker cleanup removes expired rows, and accepted submissions also run cleanup. Never commit `TURNSTILE_SECRET_KEY`, `.dev.vars`, Cloudflare tokens, or exported report data.
