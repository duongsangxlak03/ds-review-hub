import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { REVIEW_IMPORT_COLUMNS, reviewImportCellValue } from "../src/lib/reviewImportContract.js";

const args = process.argv.slice(2);
const argValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
};

const inputPath = path.resolve(argValue("--input"));
const outputPath = path.resolve(argValue("--output"));
const previewPath = argValue("--preview") ? path.resolve(argValue("--preview")) : "";
if (!argValue("--input") || !argValue("--output")) {
  throw new Error("Usage: node scripts/export-review-workbook.mjs --input reviews.json --output reviews.xlsx [--preview preview.png]");
}

const runtimeNodeModules = process.env.CODEX_WORKSPACE_NODE_MODULES || path.join(
  os.homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules",
);
const runtimeRequire = createRequire(path.join(runtimeNodeModules, "package.json"));
const artifactEntry = runtimeRequire.resolve("@oai/artifact-tool");
const artifactTool = await import(pathToFileURL(artifactEntry).href);
const { SpreadsheetFile, Workbook } = artifactTool;

const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
const reviews = Array.isArray(raw) ? raw : raw.reviews;
if (!Array.isArray(reviews) || !reviews.length) throw new Error("Input JSON does not contain reviews.");

const columns = [...REVIEW_IMPORT_COLUMNS];
const reviewRows = reviews.map((review) => columns.map((column) => reviewImportCellValue(review, column)));

const excelColumnName = (columnCount) => {
  let value = columnCount;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
};

const sourceRows = reviews.flatMap((review) => (review.sources || []).map((source) => [
  review.slug || "",
  review.store_name || "",
  source.label || "",
  source.url || "",
  source.note || "",
]));

const workbook = Workbook.create();
const reviewSheet = workbook.worksheets.add("Reviews");
const sourceSheet = workbook.worksheets.add("Sources");
reviewSheet.showGridLines = false;
sourceSheet.showGridLines = false;
reviewSheet.tabColor = "#0F766E";
sourceSheet.tabColor = "#5E6C84";

reviewSheet.getRangeByIndexes(0, 0, 1, columns.length).values = [columns];
reviewSheet.getRangeByIndexes(1, 0, reviewRows.length, columns.length).values = reviewRows;
const reviewsRange = reviewSheet.getRangeByIndexes(0, 0, reviewRows.length + 1, columns.length);
reviewsRange.format.font = { name: "Arial", size: 10, color: "#172033" };
reviewSheet.getRangeByIndexes(0, 0, 1, columns.length).format = {
  fill: "#172033",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};
reviewSheet.getRangeByIndexes(0, 0, 1, columns.length).format.rowHeight = 32;
reviewSheet.freezePanes.freezeRows(1);
reviewSheet.tables.add(`A1:${excelColumnName(columns.length)}${reviewRows.length + 1}`, true, "ReviewImportTable").style = "TableStyleMedium2";

const narrowColumns = new Set([0, 4, 5, 10, 26, 27, 28]);
for (let index = 0; index < columns.length; index += 1) {
  const width = narrowColumns.has(index) ? 18 : index >= 15 && index <= 24 ? 34 : 28;
  reviewSheet.getRangeByIndexes(0, index, reviewRows.length + 1, 1).format.columnWidth = width;
}
reviewSheet.getRangeByIndexes(1, 0, reviewRows.length, columns.length).format.verticalAlignment = "top";
reviewSheet.getRangeByIndexes(1, 0, reviewRows.length, columns.length).format.wrapText = false;

const sourceHeaders = ["review_slug", "store_name", "source_label", "source_url", "claim_note"];
sourceSheet.getRange("A1:E1").values = [sourceHeaders];
if (sourceRows.length) sourceSheet.getRangeByIndexes(1, 0, sourceRows.length, sourceHeaders.length).values = sourceRows;
const sourcesRange = sourceSheet.getRangeByIndexes(0, 0, Math.max(sourceRows.length + 1, 2), sourceHeaders.length);
sourcesRange.format.font = { name: "Arial", size: 10, color: "#172033" };
sourceSheet.getRange("A1:E1").format = {
  fill: "#172033",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sourceSheet.getRange("A:A").format.columnWidth = 26;
sourceSheet.getRange("B:B").format.columnWidth = 22;
sourceSheet.getRange("C:C").format.columnWidth = 28;
sourceSheet.getRange("D:D").format.columnWidth = 46;
sourceSheet.getRange("E:E").format.columnWidth = 70;
sourceSheet.freezePanes.freezeRows(1);
if (sourceRows.length) sourceSheet.tables.add(`A1:E${sourceRows.length + 1}`, true, "ReviewSourcesTable").style = "TableStyleMedium2";

workbook.recalculate();
await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

if (previewPath) {
  const preview = await workbook.render({ sheetName: "Reviews", range: `A1:H${Math.min(reviewRows.length + 1, 8)}`, scale: 1.4, format: "png" });
  await fs.mkdir(path.dirname(previewPath), { recursive: true });
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
}

const inspection = await workbook.inspect({
  kind: "table",
  range: `Reviews!A1:H${Math.min(reviewRows.length + 1, 8)}`,
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 8,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "review workbook formula error scan",
});
console.log(inspection.ndjson);
console.log(errors.ndjson);
console.log(`Workbook exported: ${outputPath}`);
