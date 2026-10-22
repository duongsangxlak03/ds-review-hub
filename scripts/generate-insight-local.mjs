import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { renderInsightVisual } from "./lib/insight-visual-renderer.mjs";

const ROOT = process.cwd();

function loadEnvFile(file) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.trim();
    if (!process.env[key]) process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const readStdin = () => new Promise((resolve, reject) => {
  let raw = "";
  process.stdin.on("data", (chunk) => { raw += chunk.toString(); });
  process.stdin.on("end", () => {
    try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid generator input.")); }
  });
  process.stdin.on("error", reject);
});

const compact = (value, max = 180) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).replace(/\s+\S*$/, "")}...`;
};

const slugify = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 110);

const safeArray = (value, limit = 8) => Array.isArray(value)
  ? value.map((item) => compact(item, 100)).filter(Boolean).slice(0, limit)
  : [];

const safeObjectArray = (value, limit = 8) => Array.isArray(value)
  ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)).slice(0, limit)
  : [];

function defaultGeminiInvocation() {
  if (process.env.GEMINI_CLI_COMMAND) {
    const [command, ...baseArgs] = process.env.GEMINI_CLI_COMMAND.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) || [];
    return { command, baseArgs };
  }
  if (process.platform === "win32" && process.env.APPDATA) {
    const cliPath = path.join(process.env.APPDATA, "npm", "node_modules", "@google", "gemini-cli", "bundle", "gemini.js");
    if (fs.existsSync(cliPath)) return { command: process.execPath, baseArgs: [cliPath] };
  }
  return { command: "gemini", baseArgs: [] };
}

function runGemini(prompt, context) {
  return new Promise((resolve, reject) => {
    const { command, baseArgs } = defaultGeminiInvocation();
    if (!command) return reject(new Error("GEMINI_CLI_COMMAND is empty."));
    const cliArgs = [...baseArgs, "-p", prompt, "--output-format", "json"];
    if (process.env.GEMINI_CLI_MODEL) cliArgs.push("-m", process.env.GEMINI_CLI_MODEL);
    const child = spawn(command, cliArgs, { cwd: ROOT, env: process.env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("Insight generation timed out.")); }, 8 * 60 * 1000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error((stderr || stdout || `Gemini exited with ${code}`).slice(0, 3000)));
      try {
        const envelope = JSON.parse(stdout.trim());
        resolve(String(envelope.response || envelope.text || "{}"));
      } catch {
        resolve(stdout);
      }
    });
    child.stdin.end(context);
  });
}

function extractJson(value) {
  const raw = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(raw); } catch {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
    throw new Error("AI response did not contain valid JSON.");
  }
}

async function fetchSourceText(url) {
  if (!url) return "";
  try {
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 DSReviewHubEditorial/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) return "";
    return compact((await response.text()).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "), 12000);
  } catch { return ""; }
}

const input = await readStdin();
const sourceUrl = String(input.source_url || "").trim();
const sourceAuthor = compact(input.source_author, 120);
const category = compact(input.category || "AI & Automation", 80);
const rightsStatus = ["inspiration", "excerpt_with_attribution", "licensed_reprint", "owned"].includes(input.rights_status) ? input.rights_status : "inspiration";
const imageRightsStatus = ["generated", "licensed", "owned", "source_embed", "unknown"].includes(input.image_rights_status) ? input.image_rights_status : "generated";
const sourceImageUrl = String(input.source_image_url || "").trim();
const heroImageUrl = String(input.hero_image_url || "").trim();
const visualPreset = ["auto", "workflow", "layers", "stack", "comparison"].includes(input.visual_preset) ? input.visual_preset : "auto";
const workingTitle = compact(input.working_title, 180);
const preferredSlug = slugify(input.preferred_slug);
const sourceText = String(input.source_text || "").trim() || await fetchSourceText(sourceUrl);

if (sourceText.length < 80) throw new Error("Paste the LinkedIn post text (at least 80 characters). LinkedIn often blocks automatic reading.");

let platform = "Provided source";
if (sourceUrl.includes("linkedin.com")) platform = "LinkedIn";
else if (sourceUrl) {
  try { platform = new URL(sourceUrl).hostname.replace(/^www\./, ""); } catch { platform = "Provided source"; }
}
const reuseAllowed = rightsStatus === "owned" || rightsStatus === "licensed_reprint";
const imageAllowed = imageRightsStatus === "owned" || imageRightsStatus === "licensed";
const currentYear = new Date().getFullYear();

const prompt = `You are the founding editor of DS Review Hub Insights. Turn the supplied source into a genuinely original, useful English-language article for US readers.

NON-NEGOTIABLE EDITORIAL RULES:
- This is an insight article, not a coupon page and not a summary of a social post.
- Build a new thesis, structure, examples, practical framework, and conclusion. Use original language throughout.
- Source rights mode is "${rightsStatus}". ${reuseAllowed ? "The operator states that reuse rights exist, but still improve structure and clarity." : "Do not copy sentences, distinctive phrasing, headings, anecdotes, or the source structure. Paraphrase facts and ideas from scratch."}
- ${rightsStatus === "excerpt_with_attribution" ? "At most one direct quotation of 20 words, clearly attributed." : "Use no direct quotations from the source."}
- Do not invent research, metrics, quotes, brands, people, or events. Label interpretations as analysis.
- Do not mention AI generation, prompts, scraping, or internal tooling.
- Aim for 900-1400 words with 6-9 useful Markdown sections. No H1 in content.
- Include a short opening, a clear point of view, practical takeaways, and a final section titled "What to do next".
- ${workingTitle ? `Use this editorial direction: "${workingTitle}". You may improve the wording without changing the core angle.` : "Choose a concrete, non-clickbait editorial angle."}
- ${preferredSlug ? `Return this exact slug: "${preferredSlug}".` : "Return a concise descriptive slug."}
- Return only JSON, no markdown fence.

Return exactly this shape:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "meta_title": "<=62 chars",
  "meta_description": "<=155 chars",
  "category": "${category}",
  "tags": ["..."],
  "content": "Markdown article",
  "hero_image_alt": "...",
  "visual_brief": "A concise original 16:9 editorial graphic brief that does not imitate the source image",
  "visual_spec": {
    "preset": "workflow|layers|stack|comparison",
    "headline": "A short editorial headline",
    "subtitle": "One concise explanatory line",
    "left_heading": "Only needed for comparison",
    "right_heading": "Only needed for comparison",
    "items": [{"label":"1-3 words","detail":"3-7 words"}]
  },
  "faqs": [{"question":"...","answer":"..."}]
}

VISUAL SPEC RULES:
- Pick the preset that best explains this article: workflow for a process, layers for discovery/foundations, stack for a toolkit/system, comparison for tensions or trade-offs.
- Use 4-6 items. Keep every label to 1-3 words and every detail to 3-7 words.
- Spell everything correctly. Use no brand names, logos, people, copyrighted characters, or source-image composition.
- The graphic must stand alone as an original DS Review Hub editorial diagram.`;

const context = JSON.stringify({
  editorial_context: { publication: "DS Review Hub Insights", year: currentYear, requested_category: category },
  source_context: { url: sourceUrl, author: sourceAuthor, platform, rights_status: rightsStatus, text: sourceText.slice(0, 18000) },
}, null, 2);

const generated = extractJson(await runGemini(prompt, context));
const now = new Date().toISOString();
const fallbackTitle = compact(sourceText, 80) || "New DS Review Hub Insight";
const title = compact(generated.title || fallbackTitle, 180);
const slug = slugify(generated.slug || title) || `insight-${Date.now()}`;
const content = String(generated.content || "").trim();
if (content.length < 800) throw new Error("Generated draft was too short. Try again with more source context.");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase URL or service-role key in .env.local.");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let finalHeroImageUrl = heroImageUrl || (imageAllowed && sourceImageUrl ? sourceImageUrl : "");
let finalImageRightsStatus = imageRightsStatus;
let renderedVisual = null;

if (!finalHeroImageUrl) {
  renderedVisual = await renderInsightVisual({
    slug,
    title,
    excerpt: compact(generated.excerpt || content, 260),
    category: compact(generated.category || category, 80),
    visualSpec: generated.visual_spec && typeof generated.visual_spec === "object" ? generated.visual_spec : {},
    requestedPreset: visualPreset,
  });
  const imageBuffer = fs.readFileSync(renderedVisual.pngPath);
  const imageHash = createHash("sha256").update(imageBuffer).digest("hex").slice(0, 12);
  const storagePath = `insights/local-generated/${slug}-${imageHash}.png`;
  const { error: uploadError } = await supabase.storage.from("blog-images").upload(storagePath, imageBuffer, {
    cacheControl: "31536000",
    contentType: "image/png",
    upsert: true,
  });
  if (uploadError) throw new Error(`Local visual was rendered but upload failed: ${uploadError.message}`);
  finalHeroImageUrl = supabase.storage.from("blog-images").getPublicUrl(storagePath).data.publicUrl;
  finalImageRightsStatus = "generated";
}

const payload = {
  title,
  slug,
  excerpt: compact(generated.excerpt || content, 260),
  content,
  image_url: finalHeroImageUrl || null,
  category: compact(generated.category || category, 80),
  tags: Array.from(new Set(["DS Insight", ...safeArray(generated.tags, 7)])),
  is_published: Boolean(input.publish),
  published_at: input.publish ? now : null,
  meta_title: compact(generated.meta_title || title, 62),
  meta_description: compact(generated.meta_description || generated.excerpt || content, 155),
  hero_image_alt: compact(generated.hero_image_alt || title, 140),
  faqs: safeObjectArray(generated.faqs, 8),
  sources: sourceUrl ? [{ label: sourceAuthor || platform, url: sourceUrl, note: `Source material that informed this original analysis. Rights mode: ${rightsStatus}.` }] : [],
  author_name: "DS Review Hub Editorial Team",
  reviewed_at: now,
  updated_at: now,
  content_type: "insight",
  source_url: sourceUrl || null,
  source_author: sourceAuthor || null,
  source_platform: platform,
  source_excerpt: compact(sourceText, 500),
  rights_status: rightsStatus,
  source_image_url: sourceImageUrl || null,
  image_rights_status: finalImageRightsStatus,
  originality_notes: compact(`${generated.visual_brief || "Original 16:9 DS Review Hub editorial visual."}${renderedVisual ? ` Local layout: ${renderedVisual.preset}.` : ""}`, 1000),
};

let { data: post, error } = await supabase.from("blog_posts").upsert(payload, { onConflict: "slug" }).select("id,title,slug,is_published").single();
if (error && /schema cache|Could not find|column/i.test(error.message || "")) {
  const { content_type, source_url, source_author, source_platform, source_excerpt, rights_status, source_image_url, image_rights_status, originality_notes, ...basePayload } = payload;
  const retry = await supabase.from("blog_posts").upsert(basePayload, { onConflict: "slug" }).select("id,title,slug,is_published").single();
  post = retry.data;
  error = retry.error;
}
if (error) throw error;

console.log(`Saved ${post.is_published ? "published" : "draft"} insight: ${post.title}`);
console.log(`Insight URL: https://www.dsreviewhub.com/insights/${post.slug}`);
console.log(`Visual URL: ${finalHeroImageUrl}`);
console.log(`Visual preset: ${renderedVisual?.preset || "source-image"}`);
