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
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function upsertJson(input: {
  code: string;
  phone?: string;
  name?: string;
  note?: string;
}): Promise<Assignment> {
  const store = await readJson();
  const prev = store[input.code];
  const next: Assignment = {
    code: input.code,
    phone: input.phone ?? prev?.phone ?? "",
    name: input.name ?? prev?.name ?? "",
    note: input.note ?? prev?.note ?? "",
    updatedAt: new Date().toISOString(),
  };
  store[input.code] = next;
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
  return next;
}

// ---- Interface công khai (chọn backend theo env) ----
export async function readAssignments(): Promise<Store> {
  return db.isConfigured() ? db.readAssignments() : readJson();
}

export async function upsertAssignment(input: {
  code: string;
  phone?: string;
  name?: string;
  note?: string;
}): Promise<Assignment> {
  return db.isConfigured() ? db.upsertAssignment(input) : upsertJson(input);
}
