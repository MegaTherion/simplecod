import { describe, expect, it } from "vitest";

describe("esqueleto del core", () => {
  it("se importa sin errores", async () => {
    const modulo = await import("./index.js");
    expect(modulo).toBeDefined();
  });
});
