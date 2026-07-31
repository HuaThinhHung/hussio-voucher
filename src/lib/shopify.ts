import "server-only";
import type { DiscountSummary, GenerateInput, GenerateResult, VoucherCode } from "./types";

// ==== Đã cấu hình Shopify thật chưa? ====
// Dùng để quyết định: có token thật -> đọc realtime; chưa có -> dùng snapshot demo.
export function isShopifyConfigured(): boolean {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!domain || !token) return false;
  if (token.includes("xxxx")) return false; // token mẫu trong .env.local.example
  return true;
}

// ==== Cấu hình từ biến môi trường ====
function cfg() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || "2025-01";
  if (!domain || !token) {
    throw new Error(
      "Thiếu SHOPIFY_STORE_DOMAIN hoặc SHOPIFY_ADMIN_TOKEN. Kiểm tra file .env.local"
    );
  }
  return { domain, token, version };
}

// ==== Gọi Admin GraphQL API (có retry khi bị throttle) ====
interface GraphQLError {
  message?: string;
  extensions?: { code?: string };
}

// Shopify trả lỗi GraphQL với extensions.code = "THROTTLED" khi vượt cost giới hạn.
function isThrottled(errors: GraphQLError[]): boolean {
  return errors.some((e) => e?.extensions?.code === "THROTTLED");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Exponential backoff + jitter; ưu tiên header Retry-After nếu Shopify gửi.
function backoffMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const sec = Number(retryAfter);
    if (Number.isFinite(sec) && sec > 0) return sec * 1000;
  }
  const base = Math.min(500 * 2 ** attempt, 8000);
  return base + Math.floor(Math.random() * 250);
}

const MAX_RETRIES = 5;

export async function adminFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const { domain, token, version } = cfg();
  const url = `https://${domain}/admin/api/${version}/graphql.json`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    // 429: giới hạn tần suất REST -> chờ rồi thử lại
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(backoffMs(attempt, res.headers.get("Retry-After")));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify API lỗi HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = (await res.json()) as { data?: T; errors?: GraphQLError[] };
    if (json.errors && json.errors.length) {
      // THROTTLED (vượt GraphQL cost) -> backoff rồi thử lại
      if (isThrottled(json.errors) && attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt, null));
        continue;
      }
      throw new Error(`Shopify GraphQL lỗi: ${JSON.stringify(json.errors).slice(0, 400)}`);
    }
    return json.data as T;
  }
}

// ==== Kiểu phản hồi ====
interface CodeNode {
  code: string;
  asyncUsageCount: number;
}
interface CodesResponse {
  codeDiscountNode: {
    codeDiscount: {
      codes: {
        edges: Array<{ node: CodeNode }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
  } | null;
}
interface DiscountInner {
  __typename: string;
  title?: string;
  status?: string;
  usageLimit?: number | null;
  asyncUsageCount?: number;
  codesCount?: { count: number } | null;
}
interface DiscountNode {
  id: string;
  discount: DiscountInner;
}
interface DiscountsResponse {
  discountNodes: {
    edges: Array<{ node: DiscountNode }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

// Mô tả ngắn theo loại discount (cho cột "Ưu đãi").
function methodOf(typename: string): string {
  if (typename.includes("FreeShipping")) return "Miễn phí vận chuyển";
  if (typename === "DiscountAutomaticApp") return "Quà tặng (tự động)";
  if (typename.includes("Bxgy")) return "Mua X tặng Y";
  return "";
}

// ==== Lấy toàn bộ mã của 1 discount (có phân trang) ====
async function fetchAllCodes(discountId: string): Promise<CodeNode[]> {
  const out: CodeNode[] = [];
  let after: string | null = null;

  const QUERY = `
    query Codes($id: ID!, $after: String) {
      codeDiscountNode(id: $id) {
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 250, after: $after) {
              edges { node { code asyncUsageCount } }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }
    }`;

  for (let guard = 0; guard < 200; guard++) {
    const data: CodesResponse = await adminFetch<CodesResponse>(QUERY, {
      id: discountId,
      after,
    });
    const codes = data.codeDiscountNode?.codeDiscount?.codes;
    if (!codes) break;
    for (const e of codes.edges) out.push(e.node);
    if (!codes.pageInfo.hasNextPage) break;
    after = codes.pageInfo.endCursor;
  }
  return out;
}

// ==== Liệt kê tất cả discount dạng code (voucher) + mã ====
export async function listVoucherDiscounts(): Promise<{
  discounts: DiscountSummary[];
  codes: VoucherCode[];
}> {
  const QUERY = `
    query Discounts($after: String) {
      discountNodes(first: 50, after: $after) {
        edges {
          node {
            id
            discount {
              __typename
              ... on DiscountCodeBasic { title status usageLimit asyncUsageCount codesCount { count } }
              ... on DiscountCodeBxgy { title status asyncUsageCount codesCount { count } }
              ... on DiscountCodeFreeShipping { title status asyncUsageCount codesCount { count } }
              ... on DiscountAutomaticBasic { title status asyncUsageCount }
              ... on DiscountAutomaticBxgy { title status asyncUsageCount }
              ... on DiscountAutomaticFreeShipping { title status asyncUsageCount }
              ... on DiscountAutomaticApp { title status asyncUsageCount }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`;

  const nodes: DiscountNode[] = [];
  let after: string | null = null;

  for (let guard = 0; guard < 100; guard++) {
    const data: DiscountsResponse = await adminFetch<DiscountsResponse>(QUERY, { after });
    for (const e of data.discountNodes.edges) nodes.push(e.node);
    if (!data.discountNodes.pageInfo.hasNextPage) break;
    after = data.discountNodes.pageInfo.endCursor;
  }

  const discounts: DiscountSummary[] = [];
  const codes: VoucherCode[] = [];

  for (const n of nodes) {
    const d = n.discount;
    const title = d.title || "(không tên)";
    const kind: "code" | "automatic" = d.__typename.startsWith("DiscountCode") ? "code" : "automatic";
    discounts.push({
      id: n.id,
      title,
      status: d.status || "UNKNOWN",
      usageLimit: d.usageLimit ?? null,
      totalUsed: d.asyncUsageCount || 0,
      totalCodes: d.codesCount?.count ?? (kind === "code" ? 1 : 0),
      kind,
      method: methodOf(d.__typename),
    });

    // Chỉ kéo danh sách mã cho discount "Amount off order" (loại đang dùng cho voucher).
    if (d.__typename === "DiscountCodeBasic") {
      const codeList = await fetchAllCodes(n.id);
      for (const c of codeList) {
        codes.push({
          code: c.code,
          usageCount: c.asyncUsageCount || 0,
          used: (c.asyncUsageCount || 0) > 0,
          discountId: n.id,
          discountTitle: title,
        });
      }
    }
  }

  codes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  return { discounts, codes };
}

// ==== Tạo discount cha (Amount off order, cố định) ====
interface CreateResponse {
  discountCodeBasicCreate: {
    codeDiscountNode: { id: string } | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}
async function createBasicDiscount(
  title: string,
  amount: number,
  firstCode: string
): Promise<string> {
  const MUT = `
    mutation Create($d: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $d) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }`;

  const startsAt = new Date().toISOString();
  const data: CreateResponse = await adminFetch<CreateResponse>(MUT, {
    d: {
      title,
      code: firstCode,
      startsAt,
      customerSelection: { all: true },
      customerGets: {
        value: { discountAmount: { amount: String(amount), appliesOnEachItem: false } },
        items: { all: true },
      },
      appliesOncePerCustomer: true,
      usageLimit: 1,
    },
  });

  const errs = data.discountCodeBasicCreate.userErrors;
  if (errs.length) throw new Error(`Tạo discount lỗi: ${errs.map((e) => e.message).join("; ")}`);
  const id = data.discountCodeBasicCreate.codeDiscountNode?.id;
  if (!id) throw new Error("Không lấy được ID discount vừa tạo");
  return id;
}

// ==== Thêm mã hàng loạt (batch 100/req) ====
interface BulkAddResponse {
  discountRedeemCodeBulkAdd: {
    userErrors: Array<{ field: string[]; message: string }>;
  };
}
async function bulkAddCodes(discountId: string, codes: string[]): Promise<void> {
  const MUT = `
    mutation Add($id: ID!, $codes: [DiscountRedeemCodeInput!]!) {
      discountRedeemCodeBulkAdd(discountId: $id, codes: $codes) {
        bulkCreation { id }
        userErrors { field message code }
      }
    }`;

  for (let i = 0; i < codes.length; i += 100) {
    const chunk = codes.slice(i, i + 100).map((code) => ({ code }));
    const data: BulkAddResponse = await adminFetch<BulkAddResponse>(MUT, {
      id: discountId,
      codes: chunk,
    });
    const errs = data.discountRedeemCodeBulkAdd.userErrors;
    if (errs.length) throw new Error(`Thêm mã lỗi: ${errs.map((e) => e.message).join("; ")}`);
  }
}

// ==== Sinh bộ voucher: tạo discount + toàn bộ mã theo prefix ====
export async function generateVouchers(input: GenerateInput): Promise<GenerateResult> {
  const { title, amount, prefix, count, startAt, pad } = input;
  if (count < 1) throw new Error("Số lượng phải >= 1");

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const num = String(startAt + i).padStart(pad, "0");
    codes.push(`${prefix}${num}`);
  }

  const discountId = await createBasicDiscount(title, amount, codes[0]);
  if (codes.length > 1) {
    await bulkAddCodes(discountId, codes.slice(1));
  }

  return {
    discountId,
    title,
    created: codes.length,
    firstCode: codes[0],
    lastCode: codes[codes.length - 1],
  };
}

// ==== Vô hiệu hoá 1 discount (khách hết áp mã được, mã vẫn còn trên store) ====
interface DeactivateResponse {
  discountCodeDeactivate: {
    codeDiscountNode: { id: string } | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}
export async function deactivateDiscount(id: string): Promise<void> {
  const MUT = `
    mutation Deactivate($id: ID!) {
      discountCodeDeactivate(id: $id) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }`;
  const data = await adminFetch<DeactivateResponse>(MUT, { id });
  const errs = data.discountCodeDeactivate.userErrors;
  if (errs.length) throw new Error(`Vô hiệu hoá lỗi: ${errs.map((e) => e.message).join("; ")}`);
}

// ==== Xoá vĩnh viễn 1 discount (kéo theo toàn bộ mã, không hoàn tác) ====
interface DeleteResponse {
  discountCodeDelete: {
    deletedCodeDiscountId: string | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}
export async function deleteDiscount(id: string): Promise<void> {
  const MUT = `
    mutation Delete($id: ID!) {
      discountCodeDelete(id: $id) {
        deletedCodeDiscountId
        userErrors { field message }
      }
    }`;
  const data = await adminFetch<DeleteResponse>(MUT, { id });
  const errs = data.discountCodeDelete.userErrors;
  if (errs.length) throw new Error(`Xoá lỗi: ${errs.map((e) => e.message).join("; ")}`);
}
