import crypto from "node:crypto";
import process from "node:process";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 8787);
const targetRepo = process.env.TARGET_REPO || "Nanquimori/KapiTomo";
const siteOrigin = process.env.PUBLIC_SITE_ORIGIN || "https://nanquimori.github.io";
const sitePath = process.env.PUBLIC_SITE_PATH || "/KapiTomo/plugins/store.html";
const authOrigin = (process.env.AUTH_PUBLIC_ORIGIN || `http://localhost:${port}`).replace(/\/$/, "");
const clientId = process.env.GITHUB_CLIENT_ID || "";
const clientSecret = process.env.GITHUB_CLIENT_SECRET || "";
const sessionSecret = process.env.SESSION_SECRET || "";

if (!clientId || !clientSecret || !sessionSecret) {
  console.warn("Missing GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET or SESSION_SECRET.");
}

app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use(cors({
  origin: siteOrigin,
  credentials: true
}));

function cookieOptions(maxAgeMs) {
  const secure = authOrigin.startsWith("https://");
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    maxAge: maxAgeMs
  };
}

function key() {
  return crypto.createHash("sha256").update(sessionSecret || "dev").digest();
}

function encryptSession(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, body]).toString("base64url");
}

function decryptSession(value) {
  try {
    const raw = Buffer.from(String(value || ""), "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const body = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

function randomState() {
  return crypto.randomBytes(24).toString("base64url");
}

function cleanReturnTo(value) {
  try {
    const url = new URL(value || siteOrigin + sitePath);
    if (url.origin !== siteOrigin) {
      return siteOrigin + sitePath;
    }
    return url.toString();
  } catch {
    return siteOrigin + sitePath;
  }
}

function sessionFromRequest(req) {
  const session = decryptSession(req.cookies.kapitomo_session);
  if (!session || !session.user || !session.access_token) {
    return null;
  }
  return session;
}

function requireSession(req, res, next) {
  const session = sessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Login GitHub necessario." });
    return;
  }
  req.session = session;
  next();
}

async function githubJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "KapiTomo-Plugin-Hub",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    throw new Error(data.message || `GitHub HTTP ${response.status}`);
  }
  return data;
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/auth/github/login", (req, res) => {
  const state = randomState();
  const returnTo = cleanReturnTo(req.query.return_to);
  res.cookie("kapitomo_oauth_state", encryptSession({ state, return_to: returnTo }), cookieOptions(10 * 60 * 1000));
  const callbackUrl = `${authOrigin}/auth/github/callback`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "read:user public_repo");
  res.redirect(url.toString());
});

app.get("/auth/github/callback", async (req, res) => {
  const stateCookie = decryptSession(req.cookies.kapitomo_oauth_state);
  res.clearCookie("kapitomo_oauth_state", cookieOptions(1));
  if (!stateCookie || stateCookie.state !== req.query.state || !req.query.code) {
    res.redirect(`${siteOrigin}${sitePath}?auth=error`);
    return;
  }
  try {
    const tokenResponse = await githubJson("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: req.query.code,
        redirect_uri: `${authOrigin}/auth/github/callback`
      })
    });
    if (!tokenResponse.access_token) {
      throw new Error("GitHub nao retornou access_token.");
    }
    const user = await githubJson("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${tokenResponse.access_token}`
      }
    });
    const profile = {
      login: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url || "",
      html_url: user.html_url || `https://github.com/${user.login}`
    };
    res.cookie("kapitomo_session", encryptSession({
      access_token: tokenResponse.access_token,
      user: profile
    }), cookieOptions(14 * 24 * 60 * 60 * 1000));
    res.redirect(stateCookie.return_to || `${siteOrigin}${sitePath}?auth=ok`);
  } catch (error) {
    console.error(error);
    res.redirect(`${siteOrigin}${sitePath}?auth=error`);
  }
});

app.get("/auth/me", (req, res) => {
  const session = sessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Nao autenticado." });
    return;
  }
  res.json({ user: session.user });
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("kapitomo_session", cookieOptions(1));
  res.json({ ok: true });
});

function validatePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error("Plugin invalido.");
  }
  for (const field of ["id", "name", "version", "icon_url", "package_url"]) {
    if (!String(plugin[field] || "").trim()) {
      throw new Error(`Campo obrigatorio ausente: ${field}`);
    }
  }
  return plugin;
}

async function createIssue(accessToken, title, body) {
  return githubJson(`https://api.github.com/repos/${targetRepo}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, body })
  });
}

app.post("/plugins/publish", requireSession, async (req, res) => {
  try {
    const plugin = validatePlugin(req.body.plugin);
    const body = [
      "Pedido de publicacao de plugin para o Nyxovira.",
      "",
      `Conta GitHub: @${req.session.user.login}`,
      `Perfil: ${req.session.user.html_url}`,
      `Repositorio: ${req.body.repository || plugin.homepage || plugin.site_url || ""}`,
      "",
      "```json",
      JSON.stringify(plugin, null, 2),
      "```"
    ].join("\n");
    const issue = await createIssue(req.session.access_token, `[plugin] ${plugin.name || plugin.id}`, body);
    res.json({ ok: true, url: issue.html_url });
  } catch (error) {
    res.status(400).json({ error: error.message || "Falha ao publicar plugin." });
  }
});

app.post("/plugins/remove", requireSession, async (req, res) => {
  try {
    const pluginId = String(req.body.plugin_id || "").trim();
    const repository = String(req.body.repository || "").trim();
    if (!pluginId || !repository) {
      throw new Error("Informe plugin_id e repository.");
    }
    const body = [
      "Pedido de remocao de plugin publicado no catalogo do Nyxovira.",
      "",
      `Conta GitHub: @${req.session.user.login}`,
      `Perfil: ${req.session.user.html_url}`,
      `Plugin ID: ${pluginId}`,
      `Repositorio: ${repository}`,
      "",
      "Confirmo que quero remover esta publicacao do catalogo online."
    ].join("\n");
    const issue = await createIssue(req.session.access_token, `[plugin-remover] ${pluginId}`, body);
    res.json({ ok: true, url: issue.html_url });
  } catch (error) {
    res.status(400).json({ error: error.message || "Falha ao solicitar remocao." });
  }
});

app.listen(port, () => {
  console.log(`KapiTomo auth backend running on ${port}`);
});
