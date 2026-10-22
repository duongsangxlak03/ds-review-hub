export const REVIEW_IMPORT_SCHEMA_VERSION = "ds-review-import/v1";

export const REVIEW_IMPORT_COLUMNS = Object.freeze([
  "schema_version",
  "affiliate_url",
  "resolved_url",
  "store_name",
  "store_slug",
  "store_category",
  "store_description",
  "store_logo_url",
  "title",
  "h1",
  "slug",
  "meta_title",
  "meta_description",
  "dek",
  "summary",
  "verdict",
  "best_for_json",
  "pros_json",
  "cons_json",
  "content_sections_json",
  "faqs_json",
  "hero_image_url",
  "hero_image_alt",
  "sources_json",
  "research_queries_json",
  "title_candidates_json",
  "checked_at",
  "model",
  "quality_status",
  "quality_issues",
]);

export const REVIEW_IMPORT_JSON_COLUMN_MAP = Object.freeze({
  best_for_json: "best_for",
  pros_json: "pros",
  cons_json: "cons",
  content_sections_json: "content_sections",
  faqs_json: "faqs",
  sources_json: "sources",
  research_queries_json: "research_queries",
  title_candidates_json: "title_candidates",
});

export const assertReviewImportHeaders = (headers) => {
  const actual = headers.map((header) => String(header || "").replace(/^\uFEFF/, "").trim());
  const expected = [...REVIEW_IMPORT_COLUMNS];
  const exactMatch = actual.length === expected.length && actual.every((header, index) => header === expected[index]);
  if (exactMatch) return;

  const missing = expected.filter((header) => !actual.includes(header));
  const unexpected = actual.filter((header) => !expected.includes(header));
  const details = [
    missing.length ? `missing: ${missing.join(", ")}` : "",
    unexpected.length ? `unexpected: ${unexpected.join(", ")}` : "",
    !missing.length && !unexpected.length ? "column order does not match" : "",
  ].filter(Boolean).join("; ");
  throw new Error(`Review CSV schema mismatch (${details}). Download a fresh CSV schema from Admin Reviews.`);
};

export const reviewImportCellValue = (review, column) => {
  if (column === "schema_version") return REVIEW_IMPORT_SCHEMA_VERSION;
  const sourceKey = REVIEW_IMPORT_JSON_COLUMN_MAP[column];
  if (sourceKey) return JSON.stringify(review[sourceKey] || []);
  if (column === "model") return review.model || "codex-chatgpt-plan";
  if (column === "quality_status") return review.quality_issues?.length ? "needs_review" : "ready_for_editor";
  if (column === "quality_issues") return (review.quality_issues || []).join(" | ");
  return review[column] ?? "";
};

export const csvEscape = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildReviewImportCsv = (reviews) => [
  REVIEW_IMPORT_COLUMNS.join(","),
  ...reviews.map((review) => REVIEW_IMPORT_COLUMNS
    .map((column) => csvEscape(reviewImportCellValue(review, column)))
    .join(",")),
].join("\r\n");

export const reviewQualityIssues = (review) => {
  const issues = [];
  const listSize = (value) => (Array.isArray(value) ? value.filter(Boolean).length : 0);
  const objectList = (value) => (Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item))
    : []);

  if (!review.title?.trim()) issues.push("missing title");
  if (!review.h1?.trim()) issues.push("missing H1");
  if (!review.summary?.trim() || review.summary.trim().length < 100) issues.push("summary needs a direct 100+ character answer");
  if (!review.verdict?.trim() || review.verdict.trim().length < 100) issues.push("verdict needs 100+ characters");
  if (listSize(review.best_for) < 1) issues.push("add a best-fit use case");
  if (listSize(review.pros) < 3) issues.push("add at least 3 specific pros");
  if (listSize(review.cons) < 3) issues.push("add at least 3 specific limitations");
  if (listSize(review.content_sections) < 4) issues.push("add at least 4 research sections");
  if (listSize(review.faqs) < 3) issues.push("add at least 3 decision FAQs");
  if (listSize(review.sources) < 3) issues.push("list at least 3 sources");
  if (objectList(review.sources).some((source) => !/^https?:\/\//i.test(String(source.url || "")) || !String(source.note || "").trim())) {
    issues.push("every source needs a URL and claim note");
  }
  if (!review.meta_title?.trim()) issues.push("missing meta title");
  if (!review.meta_description?.trim()) issues.push("missing meta description");
  if (review.meta_title && review.meta_title.length > 62) issues.push("meta title is over 62 characters");
  if (review.meta_description && review.meta_description.length > 155) issues.push("meta description is over 155 characters");
  if (review.hero_image_url && !review.hero_image_alt?.trim()) issues.push("add alt text for the hero image");

  return issues;
};
