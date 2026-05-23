import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "../crypto";

const VALID_KEY = "a".repeat(64);

beforeAll(() => {
  process.env.ENCRYPTION_KEY = VALID_KEY;
});

describe("encrypt / decrypt", () => {
  it("round-trips plaintext correctly", () => {
    expect(decrypt(encrypt("hello world"))).toBe("hello world");
  });

  it("produces different ciphertexts for same plaintext (random IV)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("throws on tampered ciphertext", () => {
    const ct = encrypt("secret");
    const tampered = ct.slice(0, -2) + "ff";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws if ENCRYPTION_KEY is missing", () => {
    const saved = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY not set");
    process.env.ENCRYPTION_KEY = saved;
  });

  it("throws if ENCRYPTION_KEY is wrong length", () => {
    const saved = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "abc";
    expect(() => encrypt("x")).toThrow("64 hex chars");
    process.env.ENCRYPTION_KEY = saved;
  });
});
