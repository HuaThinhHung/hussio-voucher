import { describe, expect, it } from "vitest";
import { buildVoucherUrl, normalizePublicDomain } from "./voucher-url";

describe("voucher URL", () => {
  it("normalizes protocol and trailing slashes", () => {
    expect(normalizePublicDomain(" https://hussio.com/// ")).toBe("hussio.com");
  });

  it("encodes voucher codes safely", () => {
    expect(buildVoucherUrl("hussio.com", "MÃ / 10K")).toBe(
      "https://hussio.com/discount/M%C3%83%20%2F%2010K"
    );
  });
});
