import "server-only";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import type { Assignment } from "./types";

// Backend MySQL cho "gán khách" — dùng khi deploy (Vercel fs read-only).
// Cùng interface với store.ts: readAssignments() + upsertAssignment().
// Kích hoạt khi có DATABASE_URL, hoặc đủ MYSQL_HOST + MYSQL_DATABASE.

let pool: Pool | null = null;
let ensured = false;

// Có cấu hình DB hay chưa (store.ts dựa vào đây để chọn backend).
export function isConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL || (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE)
  );
}

function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (url) {
    pool = mysql.createPool(url);
  } else {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectionLimit: 5,
    });
  }
  return pool;
}

// Tạo bảng nếu chưa có (chạy 1 lần/tiến trình) — tiện, khỏi setup thủ công.
async function ensureTable(): Promise<void> {
  if (ensured) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS voucher_assignments (
      code       VARCHAR(64)  NOT NULL PRIMARY KEY,
      phone      VARCHAR(32)  NOT NULL DEFAULT '',
      name       VARCHAR(128) NOT NULL DEFAULT '',
      note       VARCHAR(255) NOT NULL DEFAULT '',
      updated_at DATETIME     NOT NULL
    )
  `);
  ensured = true;
}

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return v ? String(v) : new Date().toISOString();
}

export async function readAssignments(): Promise<Record<string, Assignment>> {
  await ensureTable();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT code, phone, name, note, updated_at FROM voucher_assignments"
  );
  const out: Record<string, Assignment> = {};
  for (const r of rows) {
    out[r.code] = {
      code: r.code,
      phone: r.phone || "",
      name: r.name || "",
      note: r.note || "",
      updatedAt: toIso(r.updated_at),
    };
  }
  return out;
}

export async function upsertAssignment(input: {
  code: string;
  phone?: string;
  name?: string;
  note?: string;
}): Promise<Assignment> {
  await ensureTable();
  const db = getPool();

  // Giữ giá trị cũ khi field không được truyền (khớp semantics của store.ts JSON).
  const [existing] = await db.query<RowDataPacket[]>(
    "SELECT phone, name, note FROM voucher_assignments WHERE code = ?",
    [input.code]
  );
  const prev = existing[0];

  const next: Assignment = {
    code: input.code,
    phone: input.phone ?? prev?.phone ?? "",
    name: input.name ?? prev?.name ?? "",
    note: input.note ?? prev?.note ?? "",
    updatedAt: new Date().toISOString(),
  };

  await db.query(
    `INSERT INTO voucher_assignments (code, phone, name, note, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE phone = ?, name = ?, note = ?, updated_at = NOW()`,
    [next.code, next.phone, next.name, next.note, next.phone, next.name, next.note]
  );

  return next;
}
