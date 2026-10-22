import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsvText } from "@/lib/csv";
import { parseReviewImport } from "@/lib/reviewImportCsv";
import {
  REVIEW_IMPORT_COLUMNS,
  REVIEW_IMPORT_SCHEMA_VERSION,
  assertReviewImportHeaders,
  buildReviewImportCsv,
  reviewQualityIssues,
} from "@/lib/reviewImportContract.js";

const validReview = {
  affiliate_url: "https://example.com/aff?ref=ds",
  resolved_url: "https://example.com/product",
  store_name: "Example",
  store_slug: "example",
  store_category: "AI Tools",
  store_description: "Example description",
  store_logo_url: "",
  title: "Example Review 2026",
  h1: "Example Review 2026",
  slug: "example-review-2026",
  meta_title: "Example Review 2026",
  meta_description: "A detailed Example review covering value, limitations, alternatives, customer fit, and the evidence readers need before deciding.",
  dek: "A concise review description for the generated article and its intended audience.",
  summary: "This direct summary contains enough detail to explain the product fit, the main limitation, and the decision a reader should make before buying.",
  verdict: "This evidence-led verdict contains enough detail to explain who should consider the product, who should skip it, and why the tradeoff matters.",
  best_for: ["Teams comparing AI tools"],
  pros: ["Clear workflow for users", "Documented product features", "Useful official guidance"],
  cons: ["Requires editorial review", "Pricing can change", "Not suitable for every workflow"],
  content_sections: Array.from({ length: 4 }, (_, index) => ({ heading: `Section ${index + 1}`, body: "Evidence-backed section body." })),
  faqs: Array.from({ length: 3 }, (_, index) => ({ question: `Question ${index + 1}?`, answer: "Evidence-backed answer." })),
  hero_image_url: "",
  hero_image_alt: "Example product interface",
  sources: Array.from({ length: 3 }, (_, index) => ({ label: `Source ${index + 1}`, url: `https://example.com/source-${index + 1}`, note: "Supports a specific review claim." })),
  research_queries: ["Example pricing", "Example policy"],
  title_candidates: ["Example Review 2026", "Example Review for Teams"],
  checked_at: "2026-10-22T00:00:00Z",
  model: "codex-chatgpt-plan",
  quality_issues: [],
};

describe("review import contract", () => {
  it("keeps the downloadable Admin template aligned with the shared contract", () => {
    const template = fs.readFileSync(path.resolve(process.cwd(), "public", "review_import_template.csv"), "utf8");
    expect(parseCsvText(template)[0]).toEqual([...REVIEW_IMPORT_COLUMNS]);
    expect(() => assertReviewImportHeaders(parseCsvText(template)[0])).not.toThrow();
  });

  it("generates a versioned CSV that the Admin parser can address by the same headers", () => {
    const csv = buildReviewImportCsv([validReview]);
    const rows = parseCsvText(csv);
    expect(rows[0]).toEqual([...REVIEW_IMPORT_COLUMNS]);
    expect(rows[1][0]).toBe(REVIEW_IMPORT_SCHEMA_VERSION);
    expect(rows[1][REVIEW_IMPORT_COLUMNS.indexOf("affiliate_url")]).toBe(validReview.affiliate_url);
    expect(JSON.parse(rows[1][REVIEW_IMPORT_COLUMNS.indexOf("sources_json")])).toHaveLength(3);
    expect(reviewQualityIssues(validReview)).toEqual([]);
    const imported = parseReviewImport(csv);
    expect(imported).toHaveLength(1);
    expect(imported[0].affiliateUrl).toBe(validReview.affiliate_url);
    expect(imported[0].sources).toHaveLength(3);
    expect(imported[0].issues).toEqual([]);
  });

  it("rejects drifted columns instead of silently importing the wrong data", () => {
    expect(() => assertReviewImportHeaders(REVIEW_IMPORT_COLUMNS.filter((column) => column !== "affiliate_url"))).toThrow(/schema mismatch/i);
  });
});
