import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { listVoucherDiscounts, isShopifyConfigured } from "@/lib/shopify";
import { readAssignments } from "@/lib/store";
import { snapshotData } from "@/lib/snapshot";
import type { Assignment } from "@/lib/types";
import { buildVoucherUrl, normalizePublicDomain } from "@/lib/voucher-url";

export const dynamic = "force-dynamic";

function safeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

// GET /api/export?discountId=...&format=xlsx|csv
// Xuất danh sách mã (đã ghép thông tin gán khách) ra file cho Zalo/CNV
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discountId = searchParams.get("discountId") || "";
    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const status = (searchParams.get("status") || "").toLowerCase();
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    if (format !== "xlsx" && format !== "csv") {
      return new Response(JSON.stringify({ error: "format phải là xlsx hoặc csv" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    const rows = filtered.map((c, i) => {
      const a = assignments[c.code];
      return {
        STT: i + 1,
        "Mã voucher": safeCell(c.code),
        "Chương trình": safeCell(c.discountTitle),
        "Link áp mã": buildVoucherUrl(publicDomain, c.code),
        "Trạng thái": c.used ? "Đã dùng" : "Chưa dùng",
        "Lượt đã dùng": c.usageCount,
        "Khách nhận (SĐT)": safeCell(a?.phone || ""),
        "Tên khách": safeCell(a?.name || ""),
        "Ghi chú": safeCell(a?.note || ""),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 28 },
      { wch: 46 },
      { wch: 13 },
      { wch: 13 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voucher");

    const bookType = format === "csv" ? "csv" : "xlsx";
    const buf = XLSX.write(wb, { type: "buffer", bookType }) as Buffer;
    // BOM giúp Excel trên Windows nhận đúng UTF-8 khi mở CSV tiếng Việt.
    const output = bookType === "csv"
      ? Buffer.concat([Buffer.from("\uFEFF", "utf8"), buf])
      : buf;

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `HUSSIO_voucher_${stamp}.${bookType}`;
    const mime =
      bookType === "csv"
        ? "text/csv; charset=utf-8"
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
