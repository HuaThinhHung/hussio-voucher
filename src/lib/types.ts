// Kiểu dữ liệu dùng chung toàn app

export interface Assignment {
  code: string;
  phone: string;
  name: string;
  note: string;
  updatedAt: string;
}

export interface VoucherCode {
  code: string;
  usageCount: number;
  used: boolean;
  discountId: string;
  discountTitle: string;
  // Thông tin gán khách (nếu có)
  phone?: string;
  name?: string;
  note?: string;
}

export interface DiscountSummary {
  id: string;
  title: string;
  status: string;
  usageLimit: number | null;
  totalUsed: number;
  totalCodes: number;
  // "code" = mã nhập tay; "automatic" = tự động (free ship, quà tặng app)
  kind?: "code" | "automatic";
  method?: string; // mô tả ngắn: "Giảm 10.000đ / đơn hàng"
  category?: "loyalty";
}

export interface DashboardData {
  discounts: DiscountSummary[];
  codes: VoucherCode[];
  // "live" = đọc realtime từ Shopify; "snapshot" = ảnh chụp demo (chưa cấu hình token)
  source?: "live" | "snapshot";
  updatedAt?: string;
  publicDomain?: string;
  warning?: string;
}

export interface GenerateInput {
  title: string;
  amount: number; // số tiền giảm (VND)
  prefix: string; // vd hussio_10k_
  count: number; // số lượng mã
  startAt: number; // số bắt đầu (mặc định 1)
  pad: number; // độ rộng số, vd 3 => 001
}

export interface GenerateResult {
  discountId: string;
  title: string;
  created: number;
  firstCode: string;
  lastCode: string;
}
