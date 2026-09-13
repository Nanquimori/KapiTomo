# Complete synthetic encrypted API example

Every hostname, route, key, title, and response in this directory is synthetic and uses the reserved `.invalid` namespace. The example demonstrates the Nyxovira contract without naming or contacting a third-party source.

## Files

- `plugin.json`: declares separate page, API, and CDN origins; native parser routes; five synthetic rotating keys; extraction keys; mapping; concurrency; and retry limits.
- `browser/download_target.js`: obtains the encrypted work index synchronously, validates and decodes the envelope, creates the lightweight chapter plan, preserves selected IDs, fetches only selected chapters, validates the CDN origin, and returns every page with its request metadata.
- `fixtures/work.decrypted.json`: documented plaintext shape after a work response is decoded.
- `fixtures/chapter.decrypted.json`: documented plaintext shape after a chapter response is decoded.

## Rotating S-box response

The declared `rotating_sbox_json` response is a JSON object:

```json
{
  "d": "BASE64_ENCODED_CIPHERTEXT",
  "k": 2,
  "v": 2
}
```

`d` is the encoded payload, `k` chooses an entry from `rotating_sbox_keys`, and `v: 1` explicitly chooses key zero for the legacy form. The script rejects missing fields, invalid Base64, an out-of-range key index, invalid UTF-8, or decoded content that is not JSON. The five keys in this example are deterministic documentation values, not credentials and not material copied from a real service.

## AES/CBC alternative

For a source whose own public client legitimately receives `IV_HEX:CIPHERTEXT_HEX`, keep `adapter: "aes_json_api"`, remove `rotating_sbox_keys`, and declare only the observed client material:

```json
{
  "api_secret": "REPLACE_ONLY_AFTER_REAL_AUTHORIZED_MAPPING"
}
```

Nyxovira derives the AES key as SHA-256 of `api_secret + "salt"`, uses the hexadecimal IV supplied before the colon, and expects UTF-8 JSON after PKCS#7 decoding. Do not combine this illustrative value with a real plugin, guess a secret, copy personal credentials, or treat client-visible obfuscation as permission to access restricted content.

## Validation sequence

1. Replace the reserved origins and routes only with values observed in the source's own page, public client, or official API documentation.
2. Confirm that the work response produces unique, ordered chapter IDs.
3. Confirm that `chapter_api_path_template` uses `{chapter}` and that the returned chapter ID is byte-for-byte equal to the selected ID.
4. Confirm that every media URL remains HTTPS and inside the declared CDN origin.
5. Package the final plugin and validate the exact real work URL in the Web Plugin Laboratory.
6. Accept the result only when both boundary chapters finish with every page verified and no `FAIL` or `BLOCKED` step.

This example is locally testable with synthetic encrypted responses, but it is not proof of compatibility with any real source.
