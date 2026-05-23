import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "../cosine";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("returns 0 for zero vector", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("is direction-invariant to magnitude", () => {
    expect(cosineSimilarity([2, 0], [5, 0])).toBeCloseTo(1);
  });
});
