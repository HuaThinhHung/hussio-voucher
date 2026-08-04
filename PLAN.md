# PLAN.md — Kế hoạch & spec dự án Dashboard Voucher HUSSIO

> **Lưu ý:** đây là kế hoạch MVP lịch sử. Trạng thái và cách chạy hiện tại lấy theo `README.md`;
> source hiện tập trung vào dashboard theo dõi, QR và export, không còn UI tạo voucher.

> Tài liệu bàn giao cho Claude Code. Đọc `CLAUDE.md` trước để nắm context, rồi theo checklist dưới.
> Trạng thái: **MVP đã dựng xong & build sạch** (typecheck + `next build` pass). Phần dưới chia
> "Đã xong" và "Việc tiếp theo" kèm tiêu chí nghiệm thu.

---

## A. Mục tiêu sản phẩm

Một internal web tool cho HUSSIO để:
1. **Xem & track** toàn bộ voucher Shopify: mã nào đã dùng / chưa dùng, tỷ lệ, lọc, tìm.
2. **Tạo bulk mã** unique (mỗi mã 1 lần) theo mệnh giá + prefix.
3. **Export Excel/CSV** danh sách mã (kèm link áp mã + thông tin khách) để đưa CNV/Zalo.
4. **Gán mã cho khách** (SĐT/tên/ghi chú) để đối chiếu khi phát.

Người dùng cuối: team HUSSIO (nội bộ). Không public.

---

## B. Đã xong (MVP) ✅

- [x] Scaffold Next.js 14 + TS strict + Tailwind (`package.json`, `tsconfig`, `tailwind`, `postcss`).
- [x] `src/lib/shopify.ts`: `listVoucherDiscounts()`, `generateVouchers()`, có phân trang mã &
      discount, batch 100/req, xử lý `userErrors`.
- [x] `src/lib/store.ts`: đọc/ghi `data/assignments.json`.
- [x] API: `/api/discounts`, `/api/generate`, `/api/export`, `/api/assign`, `/api/login`.
- [x] UI: Dashboard (stats + Donut SVG + filter chương trình/trạng thái + search + bảng cuộn),
      trang Tạo mã (preview first…last + confirm), trang Login.
- [x] `middleware.ts` chặn toàn app bằng `APP_PASSWORD`.
- [x] Export xlsx/csv qua SheetJS, cột: STT, Mã, Chương trình, Link áp mã, Trạng thái, Lượt,
      SĐT, Tên, Ghi chú.
- [x] Bump Next 14.2.35 (vá lỗi bảo mật). `npm run typecheck` và `npm run build` pass.

**Tiêu chí nghiệm thu MVP:** sau khi điền `.env.local` và `npm run dev`, đăng nhập được, Dashboard
tải đúng discount + 200 mã thật, tạo mã mới chạy, export ra file mở được, gán khách lưu được.

---

## C. Việc tiếp theo (ưu tiên từ trên xuống)

### C1. Chạy thử & smoke test (BẮT BUỘC trước tiên)
- [ ] `cp .env.local.example .env.local`, điền token thật (scope `read_discounts`, `write_discounts`).
- [ ] `npm install && npm run dev`.
- [ ] Đăng nhập bằng `APP_PASSWORD`.
- [ ] Dashboard hiển thị discount "HUSSIO Đổi điểm - Giảm 10.000đ" + 200 mã, 0 đã dùng.
- [ ] Test 1 đơn trên hussio.com dùng `hussio_10k_200` → bấm Tải lại → mã chuyển "Đã dùng".
- [ ] Export Excel mở được, đủ cột.
- **Nghiệm thu:** tất cả bước trên chạy không lỗi console/server.

### C2. Chuyển "gán khách" sang MySQL (để deploy được, hết phụ thuộc file JSON) ✅
Hiện `store.ts` ghi file JSON — **không chạy trên Vercel** (fs read-only). Người dùng dùng MySQL.
- [x] Thêm `mysql2`. Tạo `src/lib/db.ts` (cùng interface `readAssignments()` / `upsertAssignment()`);
      `store.ts` thành lớp điều phối tự chọn backend theo env → **không phải sửa API route**.
      Bảng `voucher_assignments` tự tạo lần chạy đầu. JSON giữ làm fallback dev.
- [x] Schema gợi ý:
  ```sql
  CREATE TABLE voucher_assignments (
    code       VARCHAR(64)  NOT NULL PRIMARY KEY,
    phone      VARCHAR(32)  NOT NULL DEFAULT '',
    name       VARCHAR(128) NOT NULL DEFAULT '',
    note       VARCHAR(255) NOT NULL DEFAULT '',
    updated_at DATETIME     NOT NULL
  );
  ```
- [x] Env thêm: `DATABASE_URL` (hoặc `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE`). Đã cập nhật
      `.env.local.example` + README.
- **Nghiệm thu:** gán khách lưu vào MySQL, đọc lại đúng; JSON có thể giữ làm fallback dev.

### C3. Thao tác mã trên Dashboard (xóa / vô hiệu hoá) ✅
- [x] Nút **Vô hiệu hoá** 1 discount: mutation `discountCodeDeactivate(id)`.
- [x] Nút **Xoá** discount: `discountCodeDelete(id)` (có confirm 2 lần cảnh báo).
      → `POST /api/discount { id, action: "deactivate"|"delete" }`.
- [ ] (Tuỳ chọn) Xoá 1 mã lẻ: `discountCodeRedeemCodeBulkDelete` theo `search`/ids.
- **Nghiệm thu:** thao tác phản ánh đúng trên Shopify sau khi Tải lại.

### C4. Đa mệnh giá & tiện ích
- [x] Trang Tạo mã đã hỗ trợ mọi mệnh giá; bổ sung **preset nhanh** 10k/30k/50k.
- [x] Dashboard: badge tổng theo từng chương trình (đếm used/total mỗi discount) — `ProgramBadges`.
- [x] Export chỉ mã "Chưa dùng" (`?status=unused`). (Cột "Khách nhận" lọc/sắp xếp: chưa làm.)

### C5. Bền vững khi scale
- [x] Xử lý **throttling** của Shopify: retry + exponential backoff (tôn trọng `Retry-After`)
      trong `adminFetch` khi gặp `THROTTLED` hoặc HTTP 429.
- [x] Với discount rất nhiều mã (>250), đã phân trang. (Bench 1000+ mã: kiểm khi có data thật.)

---

## D. Hợp đồng API (đang có, giữ ổn định)

| Route | Method | Input | Output |
|-------|--------|-------|--------|
| `/api/discounts` | GET | — | `{ discounts[], codes[] }` (codes đã ghép assignment) |
| `/api/generate` | POST | `{title, amount, prefix, count, startAt, pad}` | `{discountId, created, firstCode, lastCode}` |
| `/api/export` | GET | `?format=xlsx\|csv&discountId?` | file tải về |
| `/api/assign` | POST | `{code, phone?, name?, note?}` | assignment đã lưu |
| `/api/login` | POST/DELETE | `{password}` | set/clear cookie |

Kiểu dữ liệu: xem `src/lib/types.ts` (`VoucherCode`, `DiscountSummary`, `GenerateInput`…).

---

## E. Rủi ro & lưu ý (đã gặp thực tế)

- **Đừng test tạo mã trên app free của Shopify** (DiscountFix, Bulk Discount Code Generator…):
  quota tính theo mã đã tạo, xóa không hoàn — dễ bị limit. Tool này gọi API trực tiếp nên không dính.
- `usageLimit` phải = 1; xác minh per-code single-use bằng test nhỏ nếu nghi ngờ.
- Mã đã phát cho khách **không đổi tên được** — chỉ xóa/tạo lại.
- Không để lộ `SHOPIFY_ADMIN_TOKEN` ra client.

---

## F. Định nghĩa "Hoàn thành" cho bản v1 giao team

1. Deploy được (local hoặc Vercel + MySQL).
2. Team đăng nhập, xem tồn kho mã, tạo mã mới, export Excel đưa Zalo.
3. Theo dõi realtime (Tải lại) trạng thái từng mã.
4. README + CLAUDE.md + PLAN.md đầy đủ để người sau tiếp quản.
