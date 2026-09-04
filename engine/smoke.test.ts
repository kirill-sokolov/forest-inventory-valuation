import { describe, expect, it } from "vitest";
import { add } from "./smoke";

describe("engine smoke", () => {
  it("runs TypeScript tests", () => {
    expect(add(2, 3)).toBe(5);
  });
});
