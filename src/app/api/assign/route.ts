import { NextRequest, NextResponse } from "next/server";
import { upsertAssignment } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/assign -> gán/ghi chú mã cho khách (lưu cục bộ)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      code?: string;
      phone?: string;
      name?: string;
      note?: string;
    };
    const code = (body.code || "").trim();
    if (!code) return NextResponse.json({ error: "Thiếu mã (code)" }, { status: 400 });

    const saved = await upsertAssignment({
      code,
      phone: body.phone,
      name: body.name,
      note: body.note,
    });
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
