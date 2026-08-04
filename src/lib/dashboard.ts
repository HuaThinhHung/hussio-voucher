import type { DiscountSummary } from "./types";

export function summarizeLoyalty(discounts: DiscountSummary[]) {
  const loyaltyDiscounts = discounts.filter(
    (discount) => discount.category === "loyalty"
  );

  return {
    totalCodes: loyaltyDiscounts.reduce((sum, discount) => sum + discount.totalCodes, 0),
    totalUsed: loyaltyDiscounts.reduce((sum, discount) => sum + discount.totalUsed, 0),
  };
}

export function discountStatusLabel(status: string): string {
  if (status === "ACTIVE") return "Đang chạy";
  if (status === "SCHEDULED") return "Sắp diễn ra";
  if (status === "EXPIRED") return "Hết hạn";
  if (status === "DISABLED") return "Đã vô hiệu hóa";
  return "Không xác định";
}
