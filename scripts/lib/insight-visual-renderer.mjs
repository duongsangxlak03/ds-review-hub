import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WIDTH = 1600;
const HEIGHT = 900;
const VALID_PRESETS = new Set(["workflow", "layers", "stack", "comparison"]);
const palette = {
  paper: "#fbfaf4",
  ink: "#10110f",
  lime: "#b7ff39",
  mint: "#dff7df",
  blue: "#dcefff",
  purple: "#e9ddff",
  peach: "#ffe2d4",
  yellow: "#fff0b8",
  white: "#fffef9",
};

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const xml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const clean = (value, max = 90) => String(value ?? "")
  .replace(/[#*_`>[\]()]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, max);

function lines(value, maxChars = 28, maxLines = 2) {
  const words = clean(value, maxChars * maxLines * 2).split(" ").filter(Boolean);
  const result = [];
  let current = "";
  for (const word of words) {
    if (!current || `${current} ${word}`.length <= maxChars) current = current ? `${current} ${word}` : word;
    else {
      result.push(current);
      current = word;
      if (result.length === maxLines - 1) break;
    }
  }
  if (current && result.length < maxLines) result.push(current);
  if (words.join(" ").length > result.join(" ").length && result.length) {
    result[result.length - 1] = `${result[result.length - 1].replace(/[.,;:!?-]+$/, "")}…`;
  }
  return result;
}

function textLines(value, x, y, { maxChars = 28, maxLines = 2, size = 60, lineHeight = 1.05, anchor = "start", className = "display" } = {}) {
  return lines(value, maxChars, maxLines).map((line, index) =>
    `<text x="${x}" y="${y + index * size * lineHeight}" text-anchor="${anchor}" class="${className}" font-size="${size}">${xml(line)}</text>`,
  ).join("");
}

function normalizeItems(spec, fallback) {
  const incoming = Array.isArray(spec?.items) ? spec.items : [];
  const items = incoming.map((item) => typeof item === "string"
    ? { label: clean(item, 24), detail: "" }
    : { label: clean(item?.label, 24), detail: clean(item?.detail, 52) })
    .filter((item) => item.label)
    .slice(0, 6);
  for (const item of fallback) {
    if (items.length >= 6) break;
    if (!items.some((candidate) => candidate.label.toLowerCase() === item.label.toLowerCase())) items.push(item);
  }
  return items;
}

function choosePreset({ requestedPreset, spec, title, excerpt, category }) {
  if (VALID_PRESETS.has(requestedPreset)) return requestedPreset;
  if (VALID_PRESETS.has(spec?.preset)) return spec.preset;
  const haystack = `${title} ${excerpt} ${category}`.toLowerCase();
  if (/search|seo|discover|visibility|ranking|answer engine/.test(haystack)) return "layers";
  if (/stack|tool|software|platform|system|app/.test(haystack)) return "stack";
  if (/\bvs\b|versus|compare|comparison|trade.?off|mistake|problem|judgment|quality/.test(haystack)) return "comparison";
  return "workflow";
}

const sharedDefs = `
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="11" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray" result="faint"><feFuncA type="table" tableValues="0 0.025"/></feComponentTransfer>
      <feBlend in="SourceGraphic" in2="faint" mode="multiply"/>
    </filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0 12 6 0 12Z" fill="${palette.ink}"/></marker>
    <style><![CDATA[
      .display { font-family: "Arial Black", "Inter", Arial, sans-serif; font-weight: 900; fill: ${palette.ink}; letter-spacing: -2.5px; }
      .label { font-family: "Arial Black", "Inter", Arial, sans-serif; font-weight: 900; fill: ${palette.ink}; letter-spacing: -.6px; }
      .body { font-family: "Inter", Arial, sans-serif; font-weight: 500; fill: ${palette.ink}; }
      .micro { font-family: "Inter", Arial, sans-serif; font-weight: 800; fill: ${palette.ink}; letter-spacing: 2.5px; }
      .line { fill: none; stroke: ${palette.ink}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .card { stroke: ${palette.ink}; stroke-width: 3; }
    ]]></style>
  </defs>`;

function shell(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    ${sharedDefs}<rect width="1600" height="900" fill="${palette.paper}"/><g filter="url(#grain)">${content}</g>
  </svg>`;
}

function brand(category) {
  return `<text x="72" y="62" class="micro" font-size="15">DS REVIEW HUB  /  ${xml(clean(category || "INSIGHTS", 28).toUpperCase())}</text>
    <path class="line" d="M72 80h1456" stroke-width="2"/>`;
}

function workflowVisual({ title, excerpt, category, spec }) {
  const items = normalizeItems(spec, [
    { label: "SIGNAL", detail: "Find the real need" },
    { label: "CONTEXT", detail: "Add useful constraints" },
    { label: "BUILD", detail: "Create the first pass" },
    { label: "REVIEW", detail: "Check the exceptions" },
    { label: "IMPROVE", detail: "Learn and repeat" },
  ]).slice(0, 5);
  const fills = [palette.mint, palette.blue, palette.peach, palette.purple, palette.yellow];
  const width = 268;
  const gap = 28;
  const start = (WIDTH - (items.length * width + (items.length - 1) * gap)) / 2;
  const cards = items.map((item, index) => {
    const x = start + index * (width + gap);
    return `<g transform="translate(${x} 426)">
      <rect class="card" width="${width}" height="290" rx="20" fill="${fills[index]}"/>
      <circle cx="42" cy="43" r="25" fill="${palette.lime}" stroke="${palette.ink}" stroke-width="2"/>
      <text x="42" y="52" text-anchor="middle" class="label" font-size="27">${index + 1}</text>
      <path class="line" d="M56 124h156M56 157h112M56 190h138"/>
      <text x="${width / 2}" y="236" text-anchor="middle" class="label" font-size="27">${xml(item.label.toUpperCase())}</text>
      ${textLines(item.detail || "Practical step", width / 2, 270, { maxChars: 25, maxLines: 1, size: 14, anchor: "middle", className: "body" })}
    </g>${index < items.length - 1 ? `<path class="line" d="M${x + width + 4} 570h${gap - 8}" marker-end="url(#arrow)"/>` : ""}`;
  }).join("");
  return shell(`${brand(category)}
    ${textLines(spec?.headline || title, 72, 178, { maxChars: 38, maxLines: 2, size: 68 })}
    ${textLines(spec?.subtitle || excerpt, 76, 330, { maxChars: 90, maxLines: 2, size: 24, lineHeight: 1.35, className: "body" })}
    ${cards}
    <rect x="72" y="792" width="1456" height="46" rx="23" fill="${palette.lime}"/>
    <text x="800" y="823" text-anchor="middle" class="micro" font-size="14">A PRACTICAL SYSTEM, NOT A MAGIC BUTTON</text>`);
}

function layersVisual({ title, excerpt, category, spec }) {
  const items = normalizeItems(spec, [
    { label: "FOUNDATION", detail: "Technical clarity" },
    { label: "INTENT", detail: "Real questions" },
    { label: "CONTENT", detail: "Useful answers" },
    { label: "AUTHORITY", detail: "Trusted proof" },
    { label: "DISCOVERY", detail: "Every surface" },
  ]).slice(0, 5);
  const fills = [palette.purple, palette.blue, palette.peach, palette.mint, palette.lime];
  const widths = [470, 650, 830, 1010, 1190];
  const layerSvg = items.map((item, index) => {
    const w = widths[index];
    const x = 800 - w / 2;
    const y = 695 - index * 105;
    return `<rect x="${x}" y="${y}" width="${w}" height="78" rx="39" fill="${fills[index]}" stroke="${palette.ink}" stroke-width="3"/>
      <text x="800" y="${y + 50}" text-anchor="middle" class="label" font-size="28">${xml(item.label.toUpperCase())}</text>
      <text x="${x + w + 18}" y="${y + 46}" class="body" font-size="16">${xml(item.detail)}</text>`;
  }).join("");
  return shell(`${brand(category)}
    ${textLines(spec?.headline || title, 800, 170, { maxChars: 44, maxLines: 2, size: 64, anchor: "middle" })}
    ${textLines(spec?.subtitle || excerpt, 800, 300, { maxChars: 96, maxLines: 2, size: 22, lineHeight: 1.35, anchor: "middle", className: "body" })}
    ${layerSvg}
    <path class="line" d="M250 785C455 740 585 654 675 548" marker-end="url(#arrow)"/>
    <text x="112" y="817" class="micro" font-size="14">BUILD FROM THE BOTTOM UP</text>`);
}

function stackVisual({ title, excerpt, category, spec }) {
  const items = normalizeItems(spec, [
    { label: "RESEARCH", detail: "Find the signal" },
    { label: "CREATE", detail: "Shape the answer" },
    { label: "DISTRIBUTE", detail: "Reach the audience" },
    { label: "MEASURE", detail: "Track what matters" },
    { label: "AUTOMATE", detail: "Remove repetition" },
    { label: "IMPROVE", detail: "Keep human judgment" },
  ]).slice(0, 6);
  const cards = items.map((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 70 + col * 520;
    const y = 344 + row * 238;
    const fill = index % 2 ? palette.lime : [palette.purple, palette.blue, palette.peach][col];
    return `<g transform="translate(${x} ${y})">
      <rect class="card" width="460" height="188" rx="18" fill="${palette.white}"/>
      <path d="M18 0h424a18 18 0 0 1 18 18v58H0V18A18 18 0 0 1 18 0Z" fill="${fill}" stroke="${palette.ink}" stroke-width="3"/>
      <text x="230" y="50" text-anchor="middle" class="label" font-size="29">${xml(item.label.toUpperCase())}</text>
      <circle cx="64" cy="127" r="29" fill="none" stroke="${palette.ink}" stroke-width="4"/>
      <path class="line" d="M48 127h32M64 111v32"/>
      ${textLines(item.detail || "One focused job", 112, 123, { maxChars: 32, maxLines: 2, size: 20, lineHeight: 1.25, className: "body" })}
    </g>`;
  }).join("");
  return shell(`${brand(category)}
    ${textLines(spec?.headline || title, 72, 162, { maxChars: 42, maxLines: 2, size: 64 })}
    ${textLines(spec?.subtitle || excerpt, 76, 291, { maxChars: 98, maxLines: 1, size: 22, className: "body" })}
    ${cards}
    <rect x="620" y="808" width="360" height="58" rx="29" fill="${palette.lime}" stroke="${palette.ink}" stroke-width="3"/>
    <text x="800" y="846" text-anchor="middle" class="label" font-size="25">WORKFLOW FIRST</text>`);
}

function comparisonVisual({ title, excerpt, category, spec }) {
  const items = normalizeItems(spec, [
    { label: "SPEED", detail: "Fast first pass" },
    { label: "CONTEXT", detail: "Real constraints" },
    { label: "QUALITY", detail: "Human review" },
    { label: "TRUST", detail: "Clear evidence" },
  ]).slice(0, 4);
  const leftHeading = clean(spec?.left_heading || "AUTOMATION", 24).toUpperCase();
  const rightHeading = clean(spec?.right_heading || "JUDGMENT", 24).toUpperCase();
  const rows = items.map((item, index) => {
    const y = 474 + index * 82;
    return `<rect x="195" y="${y - 42}" width="1210" height="64" rx="14" fill="${index % 2 ? palette.white : palette.blue}" stroke="${palette.ink}" stroke-width="2"/>
      <text x="800" y="${y}" text-anchor="middle" class="label" font-size="23">${xml(item.label.toUpperCase())}</text>
      <text x="270" y="${y}" class="body" font-size="19">${xml(item.detail || "Useful input")}</text>
      <path class="line" d="M530 ${y - 9}h82" marker-end="url(#arrow)"/>
      <path class="line" d="M1070 ${y - 9}h-82" marker-end="url(#arrow)"/>`;
  }).join("");
  return shell(`${brand(category)}
    ${textLines(spec?.headline || title, 800, 168, { maxChars: 44, maxLines: 2, size: 62, anchor: "middle" })}
    ${textLines(spec?.subtitle || excerpt, 800, 294, { maxChars: 96, maxLines: 1, size: 22, anchor: "middle", className: "body" })}
    <rect x="150" y="348" width="500" height="74" rx="37" fill="${palette.purple}" stroke="${palette.ink}" stroke-width="3"/>
    <rect x="950" y="348" width="500" height="74" rx="37" fill="${palette.lime}" stroke="${palette.ink}" stroke-width="3"/>
    <text x="400" y="397" text-anchor="middle" class="label" font-size="31">${xml(leftHeading)}</text>
    <text x="1200" y="397" text-anchor="middle" class="label" font-size="31">${xml(rightHeading)}</text>
    ${rows}
    <text x="800" y="836" text-anchor="middle" class="micro" font-size="15">THE BEST SYSTEM USES BOTH</text>`);
}

export async function renderInsightVisual({
  slug,
  title,
  excerpt = "",
  category = "Insights",
  visualSpec = {},
  requestedPreset = "auto",
  outputDir = path.join(process.cwd(), ".generated", "insight-visuals"),
}) {
  const chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!chromePath) throw new Error("Chrome or Edge is required to render local Insight visuals.");

  const preset = choosePreset({ requestedPreset, spec: visualSpec, title, excerpt, category });
  const input = { title: clean(title, 180), excerpt: clean(excerpt, 260), category, spec: visualSpec || {} };
  const svg = ({ workflow: workflowVisual, layers: layersVisual, stack: stackVisual, comparison: comparisonVisual })[preset](input);
  const safeSlug = clean(slug || `insight-${Date.now()}`, 110).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `insight-${Date.now()}`;

  fs.mkdirSync(outputDir, { recursive: true });
  const svgPath = path.join(outputDir, `${safeSlug}.svg`);
  const pngPath = path.join(outputDir, `${safeSlug}.png`);
  fs.writeFileSync(svgPath, svg, "utf8");

  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dsreviewhub-render-"));
  try {
    const result = spawnSync(chromePath, [
      "--headless=new",
      "--hide-scrollbars",
      "--disable-gpu",
      "--force-device-scale-factor=1",
      `--window-size=${WIDTH},${HEIGHT}`,
      `--user-data-dir=${profileDir}`,
      `--screenshot=${pngPath}`,
      pathToFileURL(svgPath).href,
    ], { encoding: "utf8", windowsHide: true });
    if (result.status !== 0 || !fs.existsSync(pngPath)) {
      throw new Error(`Could not render local visual: ${result.stderr || result.stdout || "Chrome returned no image."}`);
    }
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }

  return { pngPath, svgPath, preset, width: WIDTH, height: HEIGHT };
}

