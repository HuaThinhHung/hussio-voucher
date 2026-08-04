import type { DashboardData, DiscountSummary, VoucherCode } from "./types";
import voucherCodes from "./voucher-codes.json";

// Ảnh chụp dữ liệu Shopify (dùng làm "chế độ demo" khi token chưa cấu hình / lỗi).
// Nguồn: kéo trực tiếp từ Shopify Admin API qua Shopify MCP (không cần token trong app).
// Cập nhật 2026-08-03: đồng bộ TOÀN BỘ 15 chương trình thật trên store (gồm cả 2 mã đã
// hết hạn), lượt dùng realtime tại thời điểm chụp. 3 bộ "Voucher đổi điểm" (10k/30k/50k),
// mỗi bộ 1000 mã ngẫu nhiên dùng 1 lần — cả 3 bộ đều chưa có mã nào được dùng (asyncUsageCount=0).

export const SNAPSHOT_DATE = "2026-08-03";

// ID discount thật trên store (tạo qua Shopify MCP ngày 2026-08-01)
const DD10K_ID = "gid://shopify/DiscountCodeNode/2245104173129";
const DD30K_ID = "gid://shopify/DiscountCodeNode/2245104238665";
const DD50K_ID = "gid://shopify/DiscountCodeNode/2245104271433";

const discounts: DiscountSummary[] = [
  // ==== 3 bộ voucher đổi điểm (mỗi bộ 1000 mã random, dùng 1 lần) ====
  { id: DD10K_ID, title: "Voucher đổi điểm - Giảm 10.000đ", status: "ACTIVE", usageLimit: 1, totalUsed: 0, totalCodes: 1000, kind: "code", category: "loyalty", method: "Giảm 10.000đ / đơn hàng" },
  { id: DD30K_ID, title: "Voucher đổi điểm - Giảm 30.000đ", status: "ACTIVE", usageLimit: 1, totalUsed: 0, totalCodes: 1000, kind: "code", category: "loyalty", method: "Giảm 30.000đ / đơn hàng" },
  { id: DD50K_ID, title: "Voucher đổi điểm - Giảm 50.000đ", status: "ACTIVE", usageLimit: 1, totalUsed: 0, totalCodes: 1000, kind: "code", category: "loyalty", method: "Giảm 50.000đ / đơn hàng" },

  // ==== Các chương trình khác đang tồn tại trên store ====
  { id: "gid://shopify/DiscountAutomaticNode/2234541146185", title: "FREE SHIPPING CHO ĐƠN TỪ 250.000Đ", status: "ACTIVE", usageLimit: null, totalUsed: 99, totalCodes: 0, kind: "automatic", method: "Miễn phí vận chuyển" },
  { id: "gid://shopify/DiscountAutomaticNode/2237870604361", title: "Tặng Thắt lưng Hussio đơn từ 500K", status: "ACTIVE", usageLimit: null, totalUsed: 22, totalCodes: 0, kind: "automatic", method: "Quà tặng · EG App" },
  { id: "gid://shopify/DiscountAutomaticNode/2237868900425", title: "Tặng Áo thun Metroline đơn từ 1 triệu", status: "ACTIVE", usageLimit: null, totalUsed: 8, totalCodes: 0, kind: "automatic", method: "Quà tặng · EG App" },
  { id: "gid://shopify/DiscountAutomaticNode/2237867950153", title: "Tặng Nón & Hộp quà đơn từ 750K", status: "ACTIVE", usageLimit: null, totalUsed: 8, totalCodes: 0, kind: "automatic", method: "Quà tặng · EG App" },
  { id: "gid://shopify/DiscountCodeNode/2244524048457", title: "HUSSIO_WELCOME10", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 10% · tối thiểu 250K" },
  { id: "gid://shopify/DiscountCodeNode/2244525686857", title: "HUSSIO_WELCOME50K", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 50.000đ · tối thiểu 250K" },
  { id: "gid://shopify/DiscountCodeNode/2244756996169", title: "HUSSIO_HBPT_DONG5", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 5% / đơn hàng" },
  { id: "gid://shopify/DiscountCodeNode/2244757028937", title: "HUSSIO_HBPT_BAC10", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 10% / đơn hàng" },
  { id: "gid://shopify/DiscountCodeNode/2244757061705", title: "HUSSIO_HBPT_VANG15", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 15% / đơn hàng" },
  { id: "gid://shopify/DiscountCodeNode/2244757946441", title: "HUSSIO_HBPT_KC20", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 20% / đơn hàng" },

  // ==== Chương trình đã hết hạn (giữ lại để xem lịch sử) ====
  { id: "gid://shopify/DiscountCodeNode/2235736031305", title: "HUSSIO19CSKH-865H3ZVTWHZ7", status: "EXPIRED", usageLimit: 200, totalUsed: 4, totalCodes: 1, kind: "code", method: "Giảm 19% · CSKH (26/5–26/6)" },
  { id: "gid://shopify/DiscountCodeNode/2237642539081", title: "HUSSIOBACON", status: "EXPIRED", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 15% / đơn hàng" },
];

// 3000 mã (1000 mỗi bộ) — nạp từ file JSON sinh sẵn, tất cả chưa dùng tại thời điểm chụp.
const codes: VoucherCode[] = (voucherCodes as Array<{ code: string; discountId: string; discountTitle: string }>).map(
  (c) => ({ code: c.code, usageCount: 0, used: false, discountId: c.discountId, discountTitle: c.discountTitle })
);

// Mã lẻ (mỗi voucher đúng 1 mã, chuỗi mã = tên chương trình) — kéo thật từ Shopify qua MCP 2026-08-03.
// Nhờ có mảng này, các voucher lẻ (WELCOME/HBPT + 2 mã hết hạn) cũng bấm vào xem được link + QR.
const singleCodes: VoucherCode[] = [
  { code: "HUSSIO_WELCOME10", usageCount: 0, used: false, discountId: "gid://shopify/DiscountCodeNode/2244524048457", discountTitle: "HUSSIO_WELCOME10" },
  { code: "HUSSIO_WELCOME50K", usageCount: 0, used: false, discountId: "gid://shopify/DiscountCodeNode/2244525686857", discountTitle: "HUSSIO_WELCOME50K" },
  { code: "HUSSIO_HBPT_DONG5", usageCount: 0, used: false, discountId: "gid://shopify/DiscountCodeNode/2244756996169", discountTitle: "HUSSIO_HBPT_DONG5" },
  { code: "HUSSIO_HBPT_BAC10", usageCount: 0, used: false, discountId: "gid://shopify/DiscountCodeNode/2244757028937", discountTitle: "HUSSIO_HBPT_BAC10" },
  { code: "HUSSIO_HBPT_VANG15", usageCount: 0, used: false, discountId: "gid://shopify/DiscountCodeNode/2244757061705", discountTitle: "HUSSIO_HBPT_VANG15" },
  { code: "HUSSIO_HBPT_KC20", usageCount: 0, used: false, discountId: "gid://shopify/DiscountCodeNode/2244757946441", discountTitle: "HUSSIO_HBPT_KC20" },
  // 2 mã đã hết hạn — giữ để xem lại link/QR. CSKH đã dùng 4 lượt.
  { code: "HUSSIO19CSKH-865H3ZVTWHZ7", usageCount: 4, used: true, discountId: "gid://shopify/DiscountCodeNode/2235736031305", discountTitle: "HUSSIO19CSKH-865H3ZVTWHZ7" },
  { code: "HUSSIOBACON", usageCount: 0, used: false, discountId: "gid://shopify/DiscountCodeNode/2237642539081", discountTitle: "HUSSIOBACON" },
];

export const snapshotData: DashboardData = { discounts, codes: [...codes, ...singleCodes], source: "snapshot" };
