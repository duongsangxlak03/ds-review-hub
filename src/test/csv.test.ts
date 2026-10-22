import { describe, expect, it } from "vitest";
import { csvRecordObjects, parseCsvText } from "@/lib/csv";

describe("CSV parser", () => {
  it("handles commas, escaped quotes, and multiline JSON cells", () => {
    const csv = 'name,summary,sources_json\r\n"Acme, Inc.","A ""quoted"" summary","[{""note"":""line one\\nline two""}]"';
    expect(parseCsvText(csv)).toEqual([
      ["name", "summary", "sources_json"],
      ["Acme, Inc.", 'A "quoted" summary', '[{"note":"line one\\nline two"}]'],
    ]);
    expect(csvRecordObjects(csv)[0].name).toBe("Acme, Inc.");
  });
});
