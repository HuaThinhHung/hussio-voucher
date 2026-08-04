import { NextRequest, NextResponse } from "next/server";
import { deactivateDiscount, deleteDiscount } from "@/lib/shopify";

export const dynamic = "force-dynamic";

// POST /api/discount -> vô hiệu hoá / xoá 1 discount trên Shopify
// body: { id: string, action: "deactivate" | "delete" }
export async function POST(req: NextRequest) {
  try {
    if (process.env.ENABLE_SHOPIFY_MUTATIONS !== "true") {
      return NextResponse.json(
        { error: "Thao tác thay đổi Shopify đang bị khóa" },
        { status: 403 }
      );
    }
    const body = (await req.json()) as { id?: string; action?: string };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action = body.action;

    if (!id) return NextResponse.json({ error: "Thiếu id discount" }, { status: 400 });

    if (action === "deactivate") {
      await deactivateDiscount(id);
    } else if (action === "delete") {
      await deleteDiscount(id);
    } else {
      return NextResponse.json(
        { error: "action phải là 'deactivate' hoặc 'delete'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
