import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { listVoucherDiscounts, isShopifyConfigured } from "@/lib/shopify";
import { readAssignments } from "@/lib/store";
import { snapshotData } from "@/lib/snapshot";
import type { Assignment, VoucherCode } from "@/lib/types";
import { buildVoucherUrl, normalizePublicDomain } from "@/lib/voucher-url";

export const dynamic = "force-dynamic";

// Chặn "công thức" đầu ô để tránh CSV/Excel injection khi mở file.
function safeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

// ==== Các cột có thể xuất (key khớp với checkbox ở giao diện) ====
// Thứ tự trong file = thứ tự khai báo dưới đây.
type ColKey = "stt" | "code" | "program" | "link" | "status" | "used" | "phone" | "name" | "note";
interface ColCtx {
  c: VoucherCode;
  a: Assignment | undefined;
  i: number;
  domain: string;
}
interface ColDef {
  key: ColKey;
  header: string;
  width: number;
  value: (ctx: ColCtx) => string | number;
}
const COLUMNS: ColDef[] = [
  { key: "stt", header: "STT", width: 6, value: ({ i }) => i + 1 },
  { key: "code", header: "Mã voucher", width: 22, value: ({ c }) => safeCell(c.code) },
  { key: "program", header: "Chương trình", width: 28, value: ({ c }) => safeCell(c.discountTitle) },
  { key: "link", header: "Link áp mã", width: 46, value: ({ c, domain }) => buildVoucherUrl(domain, c.code) },
  { key: "status", header: "Trạng thái", width: 13, value: ({ c }) => (c.used ? "Đã dùng" : "Chưa dùng") },
  { key: "used", header: "Lượt đã dùng", width: 13, value: ({ c }) => c.usageCount },
  { key: "phone", header: "Khách nhận (SĐT)", width: 20, value: ({ a }) => safeCell(a?.phone || "") },
  { key: "name", header: "Tên khách", width: 18, value: ({ a }) => safeCell(a?.name || "") },
  { key: "note", header: "Ghi chú", width: 20, value: ({ a }) => safeCell(a?.note || "") },
];

// GET /api/export?discountId=&format=xlsx|xls|csv&status=&search=&columns=code,phone
// Xuất danh sách mã (đã ghép thông tin gán khách) ra file cho Zalo/CNV.
// - format: chọn kiểu file (mặc định xlsx).
// - columns: danh sách cột muốn xuất, phẩy ngăn cách. Bỏ trống = xuất tất cả.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discountId = searchParams.get("discountId") || "";
    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const status = (searchParams.get("status") || "").toLowerCase();
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    if (format !== "xlsx" && format !== "xls" && format !== "csv") {
      return new Response(JSON.stringify({ error: "format phải là xlsx, xls hoặc csv" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Chọn cột: giữ đúng thứ tự chuẩn; bỏ trống / không hợp lệ -> xuất tất cả.
    const requested = (searchParams.get("columns") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const picked = requested.length
      ? COLUMNS.filter((col) => requested.includes(col.key))
      : COLUMNS;
    const activeCols = picked.length ? picked : COLUMNS;

    // Có token -> lấy realtime; chưa có / token lỗi -> xuất từ snapshot demo.
    let codes = snapshotData.codes;
    let dataSource: "live" | "snapshot" = "snapshot";
    if (isShopifyConfigured()) {
      try {
        codes = (await listVoucherDiscounts()).codes;
        dataSource = "live";
      } catch {
        codes = snapshotData.codes;
      }
    }
    const assignments = await readAssignments().catch(
      () => ({}) as Record<string, Assignment>
    );

    const publicDomain = normalizePublicDomain(
      process.env.SHOPIFY_PUBLIC_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN
    );

    let filtered = discountId ? codes.filter((c) => c.discountId === discountId) : codes;
    if (status === "unused") filtered = filtered.filter((c) => !c.used);
    else if (status === "used") filtered = filtered.filter((c) => c.used);
    if (search) filtered = filtered.filter((c) => c.code.toLowerCase().includes(search));

    const headers = activeCols.map((col) => col.header);
    const rows = filtered.map((c, i) => {
      const a = assignments[c.code];
      const row: Record<string, string | number> = {};
      for (const col of activeCols) row[col.header] = col.value({ c, a, i, domain: publicDomain });
      return row;
    });

    // Giữ header ngay cả khi không có dòng nào (file rỗng vẫn có tiêu đề cột).
    const ws = rows.length
      ? XLSX.utils.json_to_sheet(rows, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);
    ws["!cols"] = activeCols.map((col) => ({ wch: col.width }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voucher");

    const bookType = format === "csv" ? "csv" : format === "xls" ? "xls" : "xlsx";
    const buf = XLSX.write(wb, { type: "buffer", bookType }) as Buffer;
    // Thêm BOM UTF-8 (EF BB BF) để Excel trên Windows đọc đúng tiếng Việt khi mở CSV.
    const output =
      bookType === "csv" ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), buf]) : buf;

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `HUSSIO_voucher_${stamp}.${format}`;
    const mime =
      format === "csv"
        ? "text/csv; charset=utf-8"
        : format === "xls"
          ? "application/vnd.ms-excel"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new Response(output, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Voucher-Data-Source": dataSource,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
