import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("quotes fields with commas, quotes and newlines", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null/undefined as empty and dates as yyyy-mm-dd", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
    expect(csvField(new Date("2026-09-15T12:00:00Z"))).toBe("2026-09-15");
  });

  it("neutralises spreadsheet formula injection", () => {
    expect(csvField("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvField("+1")).toBe("'+1");
    expect(csvField("@cmd")).toBe("'@cmd");
  });

  it("builds a CRLF document with a header", () => {
    expect(toCsv(["A", "B"], [[1, "x,y"]])).toBe('A,B\r\n1,"x,y"\r\n');
  });
});
