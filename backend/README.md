# KapiTomo Plugin Hub Auth

Backend real para o Plugin Hub.

Ele faz login GitHub por OAuth, guarda sessao em cookie seguro e cria pedidos de publicacao/remocao no repositorio do KapiTomo usando a conta GitHub autorizada.

## Variaveis

Copie `.env.example` para `.env` no servidor:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=troque-por-uma-chave-grande
PUBLIC_SITE_ORIGIN=https://nanquimori.github.io
PUBLIC_SITE_PATH=/KapiTomo/plugins/store.html
AUTH_PUBLIC_ORIGIN=https://seu-backend.example.com
TARGET_REPO=Nanquimori/KapiTomo
PORT=8787
```

No GitHub OAuth App, configure:

```text
Homepage URL: https://nanquimori.github.io/KapiTomo/plugins/store.html
Authorization callback URL: https://seu-backend.example.com/auth/github/callback
```

## Rotas

```text
GET  /auth/github/login
GET  /auth/github/callback
GET  /auth/me
POST /auth/logout
POST /plugins/publish
POST /plugins/remove
GET  /health
```

## Local

```bash
npm install
npm run dev
```

Depois abra o site com:

```js
localStorage.setItem("kapitomo.authApi", "http://localhost:8787")
```
