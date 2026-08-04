# CLAUDE.md — Hướng dẫn cho Claude Code

> File này giúp Claude Code hiểu nhanh dự án. Đọc kỹ trước khi sửa code.
> Kế hoạch chi tiết & việc còn lại: xem `PLAN.md`.

## 1. Dự án là gì

Internal tool (web app) của thương hiệu **HUSSIO** để **theo dõi, tra cứu, tạo QR và export
voucher**. App có thể đọc Shopify Admin GraphQL API hoặc dùng snapshot do MCP đồng bộ.

Bối cảnh nghiệp vụ: HUSSIO có Zalo Mini App + nền tảng loyalty **CNV Loyalty** phát voucher cho
khách. Mỗi khách cần **1 mã riêng, dùng 1 lần, theo dõi được đã dùng hay chưa**. Shopify là nơi
lưu mã gốc; app này là lớp quản lý + xuất Excel để đưa sang CNV/Zalo.

## 2. Tech stack

- **Next.js 16.2.12** (App Router) + **React 19** + **TypeScript** (strict) + **Tailwind CSS 3**
- Không dùng thư viện chart (Donut vẽ bằng SVG thuần)
- Export Excel/CSV bằng **xlsx** (SheetJS)
- Lưu "gán khách" bằng **file JSON cục bộ** hoặc MySQL
- Xác thực: **proxy + session HMAC**; cookie không chứa `APP_PASSWORD`

## 3. Lệnh thường dùng

```bash
npm install        # cài dependencies
npm run dev        # chạy dev http://localhost:3000
npm run build      # build production
npm run typecheck  # tsc --noEmit (đã pass sạch)
npm run lint       # ESLint
npm run test       # Vitest
npm start          # chạy bản build
```

Trước khi chạy: `cp .env.local.example .env.local` rồi điền biến (xem mục 6).

## 4. Cấu trúc thư mục

```
src/
├─ app/
│  ├─ layout.tsx            # root layout
│  ├─ globals.css           # tailwind + style nhỏ
│  ├─ page.tsx              # dashboard + filter + phân trang + QR + export
│  ├─ login/page.tsx        # form đăng nhập
│  └─ api/
│     ├─ discounts/route.ts # GET: list mã + trạng thái (ghép assignment)
│     ├─ export/route.ts    # GET: xuất xlsx/csv (?discountId&format)
│     ├─ assign/route.ts    # POST: lưu gán khách
│     ├─ discount/route.ts  # POST: mutation; khóa mặc định bằng env
│     └─ login/route.ts     # POST đăng nhập / DELETE đăng xuất
├─ components/QrCode.tsx    # tạo/tải QR phía client
├─ lib/
│  ├─ auth.ts               # ký/xác minh session
│  ├─ shopify.ts            # client Admin API
│  ├─ snapshot.ts           # snapshot voucher
│  ├─ voucher-url.ts        # chuẩn hóa URL áp mã
│  ├─ store.ts              # JSON/MySQL assignment backend
│  └─ types.ts              # kiểu dùng chung
└─ proxy.ts                 # chặn mọi route trừ /login, /api/login, static
data/assignments.json        # tự sinh khi lưu; đã .gitignore
```

## 5. Luồng dữ liệu

- **Xem/track**: `page.tsx` → `GET /api/discounts` → `listVoucherDiscounts()` (Shopify) +
  `readAssignments()` (JSON) → ghép → render. Bấm "Tải lại" để cập nhật.
- **Export**: link `GET /api/export?format=xlsx|csv&discountId=…` → dựng workbook (xlsx) → tải file.
- **Snapshot**: khi token chưa cấu hình hoặc lỗi, API trả snapshot kèm `source`, `updatedAt`, `warning`.

## 6. Biến môi trường (.env.local)

| Biến | Ý nghĩa |
|------|---------|
| `SHOPIFY_STORE_DOMAIN` | `hussio.myshopify.com` (KHÔNG có https) |
| `SHOPIFY_ADMIN_TOKEN` | Admin API token Custom App (`shpat_…`) |
| `SHOPIFY_API_VERSION` | mặc định `2026-07` |
| `SHOPIFY_PUBLIC_DOMAIN` | `hussio.com` — dựng link áp mã khi export |
| `APP_PASSWORD` | mật khẩu đăng nhập tool |
| `APP_SESSION_SECRET` | khóa ký session, tối thiểu 32 ký tự |
| `ENABLE_SHOPIFY_MUTATIONS` | mặc định `false`; chỉ bật khi chủ động cho phép mutation |

Cách lấy token: Shopify Admin → Settings → Apps and sales channels → Develop apps → Create app →
Admin API scopes `write_discounts` + `read_discounts` → Install → Reveal token.

## 7. Kiến thức Shopify quan trọng (đừng đoán, làm đúng cái này)

- **Mỗi mã dùng 1 lần**: discount đặt `usageLimit: 1` + `appliesOncePerCustomer: true`.
  Với discount có nhiều redeem code, `usageLimit` áp **cho từng mã** → mỗi mã single-use.
- **Tạo discount cha**: mutation `discountCodeBasicCreate` (loại *Amount off order*, cố định
  `discountAmount.amount` theo VND, string).
- **Thêm mã hàng loạt**: `discountRedeemCodeBulkAdd(discountId, codes)` — **tối đa 100 mã/request**,
  chạy chunk. Là async, mã xuất hiện sau vài giây.
- **Đọc trạng thái**: query `codeDiscountNode.codeDiscount.codes(first:250)` field `asyncUsageCount`
  ( >0 = đã dùng). Danh sách discount: `codeDiscountNodes(first:50)`. **Nhớ phân trang** bằng
  `pageInfo{hasNextPage endCursor}` (đã làm trong `shopify.ts`).
- **Xóa discount**: `discountCodeDelete(id)`.
- Giới hạn store: tối đa 20 triệu mã/store; ~5000 mã/lần tạo để tránh timeout (đã chặn ở API).

### Dữ liệu thật đang có trên store (tham chiếu)
- Snapshot 2026-08-03 có 3 bộ voucher đổi điểm 10K/30K/50K, mỗi bộ 1.000 mã,
  tất cả đặt `usageLimit=1`.

## 8. Quy ước code (giữ nguyên phong cách)

- Mỗi component/section 1 file riêng trong `src/components`.
- Server-only code (`shopify.ts`, `store.ts`) import `"server-only"`; token KHÔNG lộ ra client.
- TypeScript strict, tránh `any`; response Shopify khai báo interface tường minh (xem `shopify.ts`).
- Comment tiếng Việt ngắn gọn cho phần nghiệp vụ.
- Tailwind, tông thương hiệu: `brand` (#1F4E78) trong `tailwind.config.ts`.

## 9. Điều KHÔNG được làm

- Không tăng `usageLimit` > 1 (sẽ khiến 1 mã dùng nhiều lần — sai nghiệp vụ).
- Không commit `.env.local` hay `data/assignments.json`.
- Không đưa token Shopify xuống client component.
- Không đổi tên chuỗi mã đã phát cho khách (Shopify không sửa được string mã — phải xóa/tạo lại).
