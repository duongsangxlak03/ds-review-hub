import { csvRecordObjects, parseCsvText } from "@/lib/csv";
import {
  REVIEW_IMPORT_SCHEMA_VERSION,
  assertReviewImportHeaders,
  reviewQualityIssues,
} from "@/lib/reviewImportContract.js";

export type ReviewImportRow = {
  rowNumber: number;
  affiliateUrl: string;
  resolvedUrl: string;
  storeName: string;
  storeSlug: string;
  storeCategory: string;
  storeDescription: string;
  storeLogoUrl: string;
  title: string;
  h1: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  dek: string;
  summary: string;
  verdict: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  contentSections: Record<string, unknown>[];
  faqs: Record<string, unknown>[];
  heroImageUrl: string;
  heroImageAlt: string;
  sources: Record<string, unknown>[];
  researchQueries: string[];
  titleCandidates: string[];
  checkedAt: string;
  model: string;
  issues: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const importJsonArray = (value: string, label: string, rowNumber: number) => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) throw new Error("must be a JSON array");
    return parsed;
  } catch (error) {
    throw new Error(`Row ${rowNumber}: ${label} ${error instanceof Error ? error.message : "is invalid"}.`);
  }
};

const importHttpUrl = (value: string, label: string, rowNumber: number) => {
  const original = value.trim();
  try {
    const url = new URL(original);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return original;
  } catch {
    throw new Error(`Row ${rowNumber}: ${label} must be a valid HTTP(S) URL.`);
  }
};

export const parseReviewImport = (text: string): ReviewImportRow[] => {
  const csvRows = parseCsvText(text);
  assertReviewImportHeaders(csvRows[0] || []);
  const records = csvRecordObjects(text);
  if (!records.length) throw new Error("Review CSV has no data rows.");

  return records.map((record, index) => {
    const rowNumber = index + 2;
    if (record.schema_version !== REVIEW_IMPORT_SCHEMA_VERSION) {
      throw new Error(`Row ${rowNumber}: schema_version must be ${REVIEW_IMPORT_SCHEMA_VERSION}.`);
    }
    const affiliateUrl = importHttpUrl(record.affiliate_url || "", "affiliate_url", rowNumber);
    const storeName = (record.store_name || "").trim();
    const storeSlug = (record.store_slug || "").trim();
    if (!storeName || !storeSlug) throw new Error(`Row ${rowNumber}: store_name and store_slug are required.`);
    if (!(record.title || "").trim() || !(record.summary || "").trim()) {
      throw new Error(`Row ${rowNumber}: title and summary are required.`);
    }

    const bestFor = importJsonArray(record.best_for_json, "best_for_json", rowNumber).map(String);
    const pros = importJsonArray(record.pros_json, "pros_json", rowNumber).map(String);
    const cons = importJsonArray(record.cons_json, "cons_json", rowNumber).map(String);
    const contentSections = importJsonArray(record.content_sections_json, "content_sections_json", rowNumber).filter(isRecord);
    const faqs = importJsonArray(record.faqs_json, "faqs_json", rowNumber).filter(isRecord);
    const sources = importJsonArray(record.sources_json, "sources_json", rowNumber).filter(isRecord);
    const researchQueries = importJsonArray(record.research_queries_json, "research_queries_json", rowNumber).map(String);
    const titleCandidates = importJsonArray(record.title_candidates_json, "title_candidates_json", rowNumber).map(String);
    const qualityRecord = {
      title: record.title,
      h1: record.h1,
      summary: record.summary,
      verdict: record.verdict,
      meta_title: record.meta_title,
      meta_description: record.meta_description,
      hero_image_url: record.hero_image_url,
      hero_image_alt: record.hero_image_alt,
      best_for: bestFor,
      pros,
      cons,
      content_sections: contentSections,
      faqs,
      sources,
    };

    return {
      rowNumber,
      affiliateUrl,
      resolvedUrl: (record.resolved_url || "").trim(),
      storeName,
      storeSlug,
      storeCategory: (record.store_category || "").trim(),
      storeDescription: (record.store_description || "").trim(),
      storeLogoUrl: (record.store_logo_url || "").trim(),
      title: (record.title || "").trim(),
      h1: (record.h1 || "").trim(),
      slug: (record.slug || "").trim(),
      metaTitle: (record.meta_title || "").trim(),
      metaDescription: (record.meta_description || "").trim(),
      dek: (record.dek || "").trim(),
      summary: (record.summary || "").trim(),
      verdict: (record.verdict || "").trim(),
      bestFor,
      pros,
      cons,
      contentSections,
      faqs,
      heroImageUrl: (record.hero_image_url || "").trim(),
      heroImageAlt: (record.hero_image_alt || "").trim(),
      sources,
      researchQueries,
      titleCandidates,
      checkedAt: (record.checked_at || "").trim(),
      model: (record.model || "codex-chatgpt-plan").trim(),
      issues: reviewQualityIssues(qualityRecord),
    };
  });
};
