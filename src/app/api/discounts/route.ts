import { NextResponse } from "next/server";
import { listVoucherDiscounts, isShopifyConfigured } from "@/lib/shopify";
import { readAssignments } from "@/lib/store";
import { snapshotData } from "@/lib/snapshot";
import type { Assignment, DashboardData, VoucherCode } from "@/lib/types";

export const dynamic = "force-dynamic";

// Ghép thông tin gán khách vào từng mã.
function mergeAssignments(codes: VoucherCode[], assignments: Record<string, Assignment>) {
  return codes.map((c) => {
    const a = assignments[c.code];
    return { ...c, phone: a?.phone || "", name: a?.name || "", note: a?.note || "" };
  });
}

// GET /api/discounts -> danh sách discount + mã (đã ghép thông tin gán khách)
export async function GET() {
  // Chưa cấu hình token Shopify -> chế độ demo: trả ảnh chụp dữ liệu (deploy xem được ngay).
  if (!isShopifyConfigured()) {
    const assignments = await readAssignments().catch(() => ({}));
    const data: DashboardData = {
      discounts: snapshotData.discounts,
      codes: mergeAssignments(snapshotData.codes, assignments),
      source: "snapshot",
    };
    return NextResponse.json(data);
  }

  try {
    const { discounts, codes } = await listVoucherDiscounts();
    const assignments = await readAssignments();
    const data: DashboardData = {
      discounts,
      codes: mergeAssignments(codes, assignments),
      source: "live",
    };
    return NextResponse.json(data);
  } catch {
    // Token lỗi/hết hạn (vd 401) -> quay về ảnh chụp demo để web vẫn xem được.
    const assignments = await readAssignments().catch(() => ({}));
    const data: DashboardData = {
      discounts: snapshotData.discounts,
      codes: mergeAssignments(snapshotData.codes, assignments),
      source: "snapshot",
    };
    return NextResponse.json(data);
  }
}
