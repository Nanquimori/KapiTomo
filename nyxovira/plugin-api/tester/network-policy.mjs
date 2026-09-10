import dns from "node:dns/promises";
import net from "node:net";

const resolvedHosts = new Map();

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || a >= 224;
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (net.isIP(mapped) === 4) return isPrivateIpv4(mapped);
  }
  return normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe8")
    || normalized.startsWith("fe9")
    || normalized.startsWith("fea")
    || normalized.startsWith("feb");
}

function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

async function resolveHost(hostname) {
  const key = hostname.toLowerCase();
  if (!resolvedHosts.has(key)) resolvedHosts.set(key, dns.lookup(key, { all: true, verbatim: true }));
  return resolvedHosts.get(key);
}

export async function assertSafeRemoteUrl(rawUrl, { allowLocal = false } = {}) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error(`Blocked URL protocol: ${parsed.protocol}`);
  if (parsed.username || parsed.password) throw new Error("URLs with embedded credentials are blocked.");
  if (allowLocal) return parsed;
  const addresses = net.isIP(parsed.hostname) ? [{ address: parsed.hostname }] : await resolveHost(parsed.hostname);
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error(`Private or local network destination blocked: ${parsed.hostname}`);
  }
  return parsed;
}

export function isBrowserLocalUrl(rawUrl) {
  return /^(?:about:blank|data:|blob:)/i.test(String(rawUrl || ""));
}
