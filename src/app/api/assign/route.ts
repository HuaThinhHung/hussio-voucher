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
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return NextResponse.json({ error: "Thiếu mã (code)" }, { status: 400 });
    if (code.length > 64) return NextResponse.json({ error: "Mã quá dài" }, { status: 400 });

    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const note = typeof body.note === "string" ? body.note.trim() : undefined;
    if ((phone?.length || 0) > 32 || (name?.length || 0) > 128 || (note?.length || 0) > 255) {
      return NextResponse.json({ error: "Thông tin khách vượt quá độ dài cho phép" }, { status: 400 });
    }

    const saved = await upsertAssignment({
      code,
      phone,
      name,
      note,
    });
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
