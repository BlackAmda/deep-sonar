import { describe, it, expect, beforeAll, vi } from "vitest";
import { hasPermission, signSessionToken, extractSessionToken } from "../admin-auth";

vi.mock("../prisma", () => ({
  prisma: {
    adminSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-unit-tests";
});

describe("hasPermission", () => {
  it("grants SUPER_ADMIN all permissions", () => {
    expect(hasPermission("SUPER_ADMIN", "manage:users")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "manage:projects")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "view:logs")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "view:projects")).toBe(true);
  });

  it("denies VIEWER manage:projects", () => {
    expect(hasPermission("VIEWER", "manage:projects")).toBe(false);
    expect(hasPermission("VIEWER", "manage:users")).toBe(false);
  });

  it("returns false for unknown role", () => {
    expect(hasPermission("GHOST", "view:logs")).toBe(false);
  });
});

describe("signSessionToken / extractSessionToken", () => {
  it("round-trips a token through sign + extract", () => {
    const token = "abc123";
    const signed = signSessionToken(token);
    expect(extractSessionToken(signed)).toBe(token);
  });

  it("returns null for tampered signature", () => {
    const signed = signSessionToken("real-token");
    const tampered = signed.slice(0, -2) + "ff";
    expect(extractSessionToken(tampered)).toBeNull();
  });

  it("returns null for missing dot separator", () => {
    expect(extractSessionToken("nodot")).toBeNull();
  });
});

describe("hmacSecret startup guard", () => {
  it("throws when no secret env var is set", () => {
    const saved = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.ADMIN_TOKEN;
    expect(() => signSessionToken("x")).toThrow("NEXTAUTH_SECRET or ADMIN_TOKEN must be set");
    process.env.NEXTAUTH_SECRET = saved;
  });
});
