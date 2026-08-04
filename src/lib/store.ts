import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Assignment } from "./types";
import * as db from "./db";

// Lớp điều phối "gán mã cho khách":
//  - Có cấu hình MySQL (DATABASE_URL / MYSQL_*) -> dùng db.ts (deploy được).
//  - Không có -> fallback file JSON cục bộ (đủ dùng dev/local).
// API route luôn import từ đây nên không phải sửa khi đổi backend.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "assignments.json");

type Store = Record<string, Assignment>;
let jsonWriteQueue: Promise<void> = Promise.resolve();

// ---- JSON fallback ----
async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, "{}", "utf8");
  }
}

async function readJson(): Promise<Store> {
  await ensureFile();
  const raw = await fs.readFile(FILE, "utf8");
  try {
    return JSON.parse(raw) as Store;
  } catch (error) {
    throw new Error(
      `Không đọc được data/assignments.json: ${error instanceof Error ? error.message : "JSON không hợp lệ"}`
    );
  }
}

async function upsertJson(input: {
  code: string;
  phone?: string;
  name?: string;
  note?: string;
}): Promise<Assignment> {
  let saved: Assignment | null = null;
  const operation = jsonWriteQueue.then(async () => {
    const store = await readJson();
    const prev = store[input.code];
    saved = {
      code: input.code,
      phone: input.phone ?? prev?.phone ?? "",
      name: input.name ?? prev?.name ?? "",
      note: input.note ?? prev?.note ?? "",
      updatedAt: new Date().toISOString(),
    };
    store[input.code] = saved;
    await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
  });

  // Giữ queue hoạt động ngay cả khi một lần ghi lỗi; caller vẫn nhận đúng lỗi của operation.
  jsonWriteQueue = operation.catch(() => undefined);
  await operation;
  if (!saved) throw new Error("Không lưu được thông tin gán voucher");
  return saved;
}

// ---- Interface công khai (chọn backend theo env) ----
export async function readAssignments(): Promise<Store> {
  if (db.isConfigured()) return db.readAssignments();
  await jsonWriteQueue;
  return readJson();
}

export async function upsertAssignment(input: {
  code: string;
  phone?: string;
  name?: string;
  note?: string;
}): Promise<Assignment> {
  return db.isConfigured() ? db.upsertAssignment(input) : upsertJson(input);
}
