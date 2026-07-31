import type { DashboardData, DiscountSummary, VoucherCode } from "./types";

// Ảnh chụp dữ liệu Shopify ngày 2026-07-31 (toàn bộ chương trình giảm giá).
// Dùng làm "chế độ demo" khi CHƯA cấu hình token — để deploy xem được ngay.
// Có token thật thì app đọc realtime và bỏ qua file này (xem isShopifyConfigured()).

export const SNAPSHOT_DATE = "2026-07-31";

const LOYALTY_ID = "gid://shopify/DiscountCodeNode/2244895146057";
const LOYALTY_TITLE = "HUSSIO Đổi điểm - Giảm 10.000đ";

const discounts: DiscountSummary[] = [
  { id: LOYALTY_ID, title: LOYALTY_TITLE, status: "ACTIVE", usageLimit: 1, totalUsed: 0, totalCodes: 200, kind: "code", method: "Giảm 10.000đ / đơn hàng" },
  { id: "gid://shopify/DiscountAutomaticNode/2234541146185", title: "FREE SHIPPING CHO ĐƠN TỪ 250.000Đ", status: "ACTIVE", usageLimit: null, totalUsed: 99, totalCodes: 0, kind: "automatic", method: "Miễn phí vận chuyển" },
  { id: "gid://shopify/DiscountAutomaticNode/2237870604361", title: "Tặng Thắt lưng Hussio đơn từ 500K", status: "ACTIVE", usageLimit: null, totalUsed: 21, totalCodes: 0, kind: "automatic", method: "Quà tặng · EG App" },
  { id: "gid://shopify/DiscountAutomaticNode/2237868900425", title: "Tặng Áo thun Metroline đơn từ 1 triệu", status: "ACTIVE", usageLimit: null, totalUsed: 8, totalCodes: 0, kind: "automatic", method: "Quà tặng · EG App" },
  { id: "gid://shopify/DiscountAutomaticNode/2237867950153", title: "Tặng Nón & Hộp quà đơn từ 750K", status: "ACTIVE", usageLimit: null, totalUsed: 8, totalCodes: 0, kind: "automatic", method: "Quà tặng · EG App" },
  { id: "gid://shopify/DiscountCodeNode/2244524048457", title: "HUSSIO_WELCOME10", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 10% · tối thiểu 250K" },
  { id: "gid://shopify/DiscountCodeNode/2244525686857", title: "HUSSIO_WELCOME50K", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 50.000đ · tối thiểu 250K" },
  { id: "gid://shopify/DiscountCodeNode/2244756996169", title: "HUSSIO_HBPT_DONG5", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 5% / đơn hàng" },
  { id: "gid://shopify/DiscountCodeNode/2244757028937", title: "HUSSIO_HBPT_BAC10", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 10% / đơn hàng" },
  { id: "gid://shopify/DiscountCodeNode/2244757061705", title: "HUSSIO_HBPT_VANG15", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 15% / đơn hàng" },
  { id: "gid://shopify/DiscountCodeNode/2244757946441", title: "HUSSIO_HBPT_KC20", status: "ACTIVE", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 20% / đơn hàng" },
  { id: "gid://shopify/DiscountCodeNode/2237642539081", title: "HUSSIOBACON", status: "EXPIRED", usageLimit: null, totalUsed: 0, totalCodes: 1, kind: "code", method: "Giảm 15% cho 2 SP · tối thiểu 500K" },
  { id: "gid://shopify/DiscountCodeNode/2235736031305", title: "HUSSIO19CSKH-865H3ZVTWHZ7", status: "EXPIRED", usageLimit: 200, totalUsed: 4, totalCodes: 1, kind: "code", method: "Giảm 19% · tối thiểu 250K" },
];

// 200 mã hussio_10k_001..200 — tất cả chưa dùng tại thời điểm chụp.
const codes: VoucherCode[] = [];
for (let i = 1; i <= 200; i++) {
  const code = `hussio_10k_${String(i).padStart(3, "0")}`;
  codes.push({ code, usageCount: 0, used: false, discountId: LOYALTY_ID, discountTitle: LOYALTY_TITLE });
}

export const snapshotData: DashboardData = { discounts, codes, source: "snapshot" };
