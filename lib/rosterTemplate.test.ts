import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { createRosterWordTemplateBlob } from "./rosterTemplate";

describe("createRosterWordTemplateBlob", () => {
  it("genera un Word valido con campos separados y todos los cupos", async () => {
    const blob = await createRosterWordTemplateBlob("Champions Loxa 2026", 5);
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const text = (await mammoth.extractRawText({ buffer })).value;
    expect(text).toContain("EQUIPO:");
    expect(text).toContain("CEDULA / IDENTIFICACION");
    expect(text).toContain("NOMBRES COMPLETOS");
    expect(text).toContain("DORSAL");
    expect(text).toContain("5");
  }, 15000);
});
