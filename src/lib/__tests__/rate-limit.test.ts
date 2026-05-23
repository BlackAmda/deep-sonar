import { describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "../rate-limit";

// Each test uses a unique key prefix to avoid Map state bleed between tests.
describe("checkRateLimit", () => {
  it("allows requests up to the max", () => {
    process.env.RATE_LIMIT_MAX = "3";
    expect(checkRateLimit("t1_k")).toBe(true);
    expect(checkRateLimit("t1_k")).toBe(true);
    expect(checkRateLimit("t1_k")).toBe(true);
    expect(checkRateLimit("t1_k")).toBe(false);
    delete process.env.RATE_LIMIT_MAX;
  });

  it("isolates separate keys", () => {
    process.env.RATE_LIMIT_MAX = "1";
    expect(checkRateLimit("t2_a")).toBe(true);
    expect(checkRateLimit("t2_b")).toBe(true);
    expect(checkRateLimit("t2_a")).toBe(false);
    delete process.env.RATE_LIMIT_MAX;
  });

  it("resets after the bucket window expires", () => {
    process.env.RATE_LIMIT_MAX = "1";
    vi.useFakeTimers();
    expect(checkRateLimit("t3_k")).toBe(true);
    expect(checkRateLimit("t3_k")).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("t3_k")).toBe(true);
    vi.useRealTimers();
    delete process.env.RATE_LIMIT_MAX;
  });
});
