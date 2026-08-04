const encoder = new TextEncoder();

function authSecret(): string | null {
  return process.env.APP_SESSION_SECRET || process.env.APP_PASSWORD || null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey() {
  const secret = authSecret();
  if (!secret) throw new Error("Thiếu APP_SESSION_SECRET hoặc APP_PASSWORD");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(maxAgeSeconds: number): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = String(expiresAt);
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token?: string): Promise<boolean> {
  if (!token) return false;
  const [expiresRaw, signatureRaw, extra] = token.split(".");
  if (!expiresRaw || !signatureRaw || extra) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  try {
    return crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64Url(signatureRaw),
      encoder.encode(expiresRaw)
    );
  } catch {
    return false;
  }
}

export async function passwordsMatch(input: string, expected: string): Promise<boolean> {
  const [inputHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(input)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(inputHash);
  const b = new Uint8Array(expectedHash);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
