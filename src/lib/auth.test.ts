import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, passwordsMatch, verifySessionToken } from "./auth";

describe("signed session", () => {
  beforeEach(() => {
    process.env.APP_SESSION_SECRET = "test-session-secret-with-more-than-32-characters";
  });

  afterEach(() => {
    delete process.env.APP_SESSION_SECRET;
  });

  it("creates a signed token without embedding the password", async () => {
    const token = await createSessionToken(60);
    expect(token).toContain(".");
    expect(token).not.toContain(process.env.APP_SESSION_SECRET as string);
    await expect(verifySessionToken(token)).resolves.toBe(true);
  });

  it("rejects tampered and expired tokens", async () => {
    const token = await createSessionToken(60);
    await expect(verifySessionToken(`${token}x`)).resolves.toBe(false);
    await expect(verifySessionToken(await createSessionToken(-1))).resolves.toBe(false);
  });

  it("compares passwords without a plain string comparison", async () => {
    await expect(passwordsMatch("correct", "correct")).resolves.toBe(true);
    await expect(passwordsMatch("wrong", "correct")).resolves.toBe(false);
  });
});
