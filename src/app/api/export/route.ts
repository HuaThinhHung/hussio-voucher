import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { listVoucherDiscounts, isShopifyConfigured } from "@/lib/shopify";
import { readAssignments } from "@/lib/store";
import { snapshotData } from "@/lib/snapshot";
import type { Assignment } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/export?discountId=...&format=xlsx|csv
// Xuất danh sách mã (đã ghép thông tin gán khách) ra file cho Zalo/CNV
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discountId = searchParams.get("discountId") || "";
    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const status = (searchParams.get("status") || "").toLowerCase();

    // Có token -> lấy realtime; chưa có -> xuất từ snapshot demo.
    const codes = isShopifyConfigured()
      ? (await listVoucherDiscounts()).codes
      : snapshotData.codes;
    const assignments = await readAssignments().catch(
      () => ({}) as Record<string, Assignment>
    );

    const publicDomain =
      process.env.SHOPIFY_PUBLIC_DOMAIN ||
      process.env.SHOPIFY_STORE_DOMAIN ||
      "hussio.com";

    let filtered = discountId ? codes.filter((c) => c.discountId === discountId) : codes;
    if (status === "unused") filtered = filtered.filter((c) => !c.used);
    else if (status === "used") filtered = filtered.filter((c) => c.used);

    const rows = filtered.map((c, i) => {
      const a = assignments[c.code];
      return {
        STT: i + 1,
        "Mã voucher": c.code,
        "Chương trình": c.discountTitle,
        "Link áp mã": `https://${publicDomain}/discount/${c.code}`,
        "Trạng thái": c.used ? "Đã dùng" : "Chưa dùng",
        "Lượt đã dùng": c.usageCount,
        "Khách nhận (SĐT)": a?.phone || "",
        "Tên khách": a?.name || "",
        "Ghi chú": a?.note || "",
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

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `HUSSIO_voucher_${stamp}.${bookType}`;
    const mime =
      bookType === "csv"
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new Response(buf, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
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
