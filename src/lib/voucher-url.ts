export function normalizePublicDomain(value?: string): string {
  return (value || "hussio.com")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "");
}

export function buildVoucherUrl(domain: string | undefined, code: string): string {
  return `https://${normalizePublicDomain(domain)}/discount/${encodeURIComponent(code)}`;
}
