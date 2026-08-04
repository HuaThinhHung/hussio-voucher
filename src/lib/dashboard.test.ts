import { describe, expect, it } from "vitest";
import { discountStatusLabel, summarizeLoyalty } from "./dashboard";
import { snapshotData } from "./snapshot";

describe("dashboard calculations", () => {
  it("counts all three loyalty voucher sets", () => {
    expect(summarizeLoyalty(snapshotData.discounts)).toEqual({
      totalCodes: 3000,
      totalUsed: 0,
    });
  });

  it("does not count unrelated single-use bulk discounts as loyalty", () => {
    const unrelated = {
      ...snapshotData.discounts[0],
      id: "unrelated",
      title: "Mã chăm sóc khách hàng",
      category: undefined,
      totalCodes: 500,
      totalUsed: 17,
    };

    expect(summarizeLoyalty([...snapshotData.discounts, unrelated])).toEqual({
      totalCodes: 3000,
      totalUsed: 0,
    });
  });

  it("does not label scheduled discounts as expired", () => {
    expect(discountStatusLabel("SCHEDULED")).toBe("Sắp diễn ra");
    expect(discountStatusLabel("EXPIRED")).toBe("Hết hạn");
  });
});
