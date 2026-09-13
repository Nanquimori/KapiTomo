# Security Policy

Security fixes target the current versions of the KapiTomo website, public APIs, official plugin catalog, and official KapiTomo plugin published from `main` and `gh-pages`.

KapiTomo publishes public content, so API payloads are not presented as confidential. Browser-facing protection focuses on HTTPS, restrictive content loading, output encoding, same-origin media, reproducible generation, and integrity checks. Encoding or encrypting public JSON with a key shipped in public JavaScript would be obfuscation rather than access control.

## Report a vulnerability privately

Do not open a public issue when a message contains an undisclosed vulnerability, personal data, credentials, or instructions that could be used to harm users.

Send the report to `nanquimori@gmail.com` with:

- the affected page, API route, or official plugin file;
- steps to reproduce the problem;
- the observed and expected behavior;
- a minimal proof of concept when needed.

Do not include passwords, authentication tokens, or personal data that are not necessary to understand the problem.

## Scope

This policy covers KapiTomo's own website, APIs, catalogs, and official plugins. Independently hosted catalogs and plugins imported manually by a Nyxovira user are controlled by their respective maintainers and are outside KapiTomo's security review.
