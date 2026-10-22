import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadEnvFile(file) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) return;

  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.trim();
    if (process.env[key]) continue;
    const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = process.argv.slice(2);

function argValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function argValues(name) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name && args[i + 1]) values.push(args[i + 1]);
  }
  return values;
}

function hasFlag(name) {
  return args.includes(name);
}

function numberArg(name, fallback) {
  const raw = argValue(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function usage() {
  console.log(`
Usage:
  npm run review:generate -- --store "1Clickblinds"
  npm run review:generate -- --blog --store "1Clickblinds"
  npm run review:generate -- --slug "1clickblinds" --publish
  npm run review:generate -- --all --limit 20 --delay-ms 5000
  npm run review:generate -- --blog --all --limit 20 --delay-ms 5000
  npm run review:generate -- --all --force --publish

Default provider:
  gemini-cli, using your locally logged-in Google account.

Setup:
  npm install -g @google/gemini-cli
  gemini
  # Choose "Login with Google" once, then close Gemini CLI.

Required env:
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_URL or VITE_SUPABASE_URL

Provider options:
  --provider gemini-cli    Use local Gemini CLI account quota. Default.
  --provider gemini-api    Use GEMINI_API_KEY.
  --provider deepseek      Use DEEPSEEK_API_KEY.

Store options:
  --blog           Create a real blog post in blog_posts instead of a store-page review.
  --store          Store name, exact or partial.
  --slug           Store slug.
  --id             Store UUID.
  --all            Generate multiple store reviews or blog posts.
  --limit          Max stores in this run. Default 10 for --all.
  --offset         Skip N candidate stores in --all mode.
  --force          Regenerate stores that already have reviews.
  --publish        Save as published instead of draft.
  --ref            Reference URL. Can be repeated.
  --image          Hero image URL. Can be repeated.
  --delay-ms       Delay between bulk generations. Default 3000.
  --dry-run        Generate and validate JSON, but do not save.
`);
}

if (hasFlag("--help") || args.length === 0) {
  usage();
  process.exit(0);
}

const provider = (argValue("--provider") || process.env.AI_PROVIDER_LOCAL || "gemini-cli").toLowerCase();
const isBlogMode = hasFlag("--blog");
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or VITE_SUPABASE_URL.");
if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY. Add your Supabase Secret key to .env.local. Do not use the publishable key.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const compact = (value, max = 220) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).replace(/\s+\S*$/, "")}...`;
};

const toUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`).toString();
  } catch {
    return "";
  }
};

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchReference(url) {
  const safeUrl = toUrl(url);
  if (!safeUrl) return null;

  try {
    const response = await fetch(safeUrl, {
      headers: {
        "user-agent": "DSReviewHubBot/1.0 (+https://www.dsreviewhub.com)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!/text|html|json/i.test(contentType)) return null;

    const raw = await response.text();
    const imageCandidates = [
      raw.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1],
      raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1],
      raw.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1],
      raw.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)?.[1],
    ]
      .map((candidate) => {
        if (!candidate) return "";
        try {
          return new URL(candidate, safeUrl).toString();
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    return {
      url: safeUrl,
      title: compact(stripHtml(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""), 140),
      description: compact(raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || "", 240),
      excerpt: compact(stripHtml(raw), 1800),
      image_urls: Array.from(new Set(imageCandidates)).slice(0, 4),
    };
  } catch {
    return null;
  }
}

function imageExtension(contentType, url) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  const fromUrl = url.split("?")[0].match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if (fromUrl && ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(fromUrl)) return fromUrl;
  return "jpg";
}

async function copyImageToStorage(store, imageUrls, prefix = "store-reviews") {
  for (const input of imageUrls) {
    const url = toUrl(input);
    if (!url) continue;

    try {
      const response = await fetch(url, {
        headers: { "user-agent": "DSReviewHubBot/1.0 (+https://www.dsreviewhub.com)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 5 * 1024 * 1024) continue;

      const ext = imageExtension(contentType, url);
      const folder = (store.slug || store.id).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const storagePath = `${prefix}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(storagePath, buffer, {
        cacheControl: "31536000",
        contentType,
        upsert: false,
      });
      if (error) continue;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(storagePath);
      return data.publicUrl;
    } catch {
      continue;
    }
  }

  return "";
}

function extractJson(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1] || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  return JSON.parse(candidate);
}

const safeArray = (value, max = 8) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, max)
    : [];

const safeObjectArray = (value, max = 10) =>
  Array.isArray(value) ? value.filter((item) => item && typeof item === "object").slice(0, max) : [];

const BLOG_EXTENDED_COLUMNS = [
  "meta_title",
  "meta_description",
  "hero_image_alt",
  "faqs",
  "sources",
  "author_name",
  "reviewed_at",
];

const stripExtendedBlogColumns = (payload) =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => !BLOG_EXTENDED_COLUMNS.includes(key)));

function pickPrimaryCouponId(generated, coupons) {
  const requested = String(generated?.coupon_strategy?.primary_coupon_id || "");
  if (requested && coupons.some((coupon) => coupon.id === requested)) return requested;
  const firstCode = coupons.find((coupon) => coupon.code && coupon.code.toUpperCase() !== "NOCODE");
  return firstCode?.id || coupons[0]?.id || null;
}

function splitCommand(command) {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return parts.map((part) => part.replace(/^"|"$/g, ""));
}

function runCommand(command, argsForCommand, stdinText, timeoutMs = 420000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argsForCommand, {
      cwd: ROOT,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`.slice(0, 2000)));
    });

    child.stdin.write(stdinText);
    child.stdin.end();
  });
}

function defaultGeminiInvocation() {
  if (process.env.GEMINI_CLI_COMMAND) {
    const commandParts = splitCommand(process.env.GEMINI_CLI_COMMAND);
    return { command: commandParts[0], baseArgs: commandParts.slice(1) };
  }

  if (process.platform === "win32" && process.env.APPDATA) {
    const globalCliPath = path.join(
      process.env.APPDATA,
      "npm",
      "node_modules",
      "@google",
      "gemini-cli",
      "bundle",
      "gemini.js",
    );

    if (fs.existsSync(globalCliPath)) {
      return { command: process.execPath, baseArgs: [globalCliPath] };
    }
  }

  return { command: "gemini", baseArgs: [] };
}

async function generateWithGeminiCli(instructions, context) {
  const { command, baseArgs } = defaultGeminiInvocation();
  const model = argValue("--model") || process.env.GEMINI_CLI_MODEL || "";
  const cliArgs = [...baseArgs, "-p", instructions, "--output-format", "json"];
  if (model) cliArgs.push("-m", model);

  let result;
  try {
    result = await runCommand(command, cliArgs, context);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EINVAL" || /ENOENT|EINVAL|not recognized|exited/i.test(error.message || "")) {
      throw new Error(
        "Gemini CLI is not available. Run: npm install -g @google/gemini-cli, then run: gemini, and choose Login with Google.",
      );
    }
    throw error;
  }

  const raw = result.stdout.trim();
  if (!raw) throw new Error(`Gemini CLI returned empty output. ${result.stderr}`.trim());

  try {
    const parsed = JSON.parse(raw);
    if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
    return {
      provider: "gemini-cli",
      model: model || Object.keys(parsed.stats?.models || {})[0] || "gemini-cli",
      text: String(parsed.response || ""),
    };
  } catch (error) {
    if (raw.includes("{") && raw.includes("}")) {
      return { provider: "gemini-cli", model: model || "gemini-cli", text: raw };
    }
    throw new Error(`Gemini CLI JSON output could not be parsed: ${error.message}`);
  }
}

async function generateWithGeminiApi(prompt) {
  const model = argValue("--model") || process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY.");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 6000,
        temperature: 0.55,
      },
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) throw new Error(`Gemini API failed ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return {
    provider: "gemini-api",
    model,
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || "{}",
  };
}

async function generateWithDeepSeek(prompt) {
  const model = argValue("--model") || process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("Missing DEEPSEEK_API_KEY.");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a senior affiliate SEO editor. Return only valid JSON for the requested schema.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      max_tokens: 6000,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`DeepSeek failed ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return {
    provider: "deepseek",
    model,
    text: data.choices?.[0]?.message?.content || "{}",
  };
}

async function findStore() {
  const id = argValue("--id");
  const slug = argValue("--slug");
  const storeName = argValue("--store");

  let query = supabase.from("stores").select("id, name, slug, description, logo_url, website_url, category").limit(10);
  if (id) query = query.eq("id", id);
  else if (slug) query = query.eq("slug", slug);
  else if (storeName) query = query.ilike("name", `%${storeName}%`);
  else throw new Error("Pass --store, --slug, --id, or --all.");

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) throw new Error("Store not found.");
  if (data.length > 1 && !id && !slug) {
    console.log("Multiple stores matched:");
    for (const store of data) console.log(`- ${store.name} (${store.slug || store.id})`);
    throw new Error("Use --slug or --id to choose one store.");
  }
  return data[0];
}

async function listStoresForBulk() {
  const limit = numberArg("--limit", 10);
  const offset = numberArg("--offset", 0);
  const force = hasFlag("--force");

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, logo_url, website_url, category")
    .order("name", { ascending: true })
    .limit(1000);
  if (error) throw error;

  let candidates = stores || [];
  if (!force) {
    if (isBlogMode) {
      const { data: existing, error: postError } = await supabase
        .from("blog_posts")
        .select("title, slug, content")
        .limit(5000);
      if (postError) throw postError;
      candidates = candidates.filter((store) => {
        const slug = String(store.slug || "").toLowerCase();
        const name = String(store.name || "").toLowerCase();
        return !(existing || []).some((post) => {
          const haystack = `${post.title || ""} ${post.slug || ""} ${post.content || ""}`.toLowerCase();
          return (slug && haystack.includes(`store="${slug}"`)) || (name && haystack.includes(`${name} review`));
        });
      });
    } else {
      const { data: existing, error: reviewError } = await supabase.from("store_reviews").select("store_id").limit(5000);
      if (reviewError) throw reviewError;
      const reviewed = new Set((existing || []).map((row) => row.store_id));
      candidates = candidates.filter((store) => !reviewed.has(store.id));
    }
  }

  return candidates.slice(offset, offset + limit);
}

async function loadStoreContext(store) {
  const [{ data: coupons, error: couponError }, { data: deals, error: dealError }] = await Promise.all([
    supabase
      .from("coupons")
      .select("id, title, description, code, discount_value, url, expiry_date, is_verified, sort_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("deals")
      .select("id, title, description, url, image_url, original_price, deal_price, expiry_date")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);
  if (couponError) throw couponError;
  if (dealError) throw dealError;

  const couponIds = (coupons || []).map((coupon) => coupon.id);
  const [{ data: usageStats }, { data: verifications }] = await Promise.all([
    couponIds.length ? supabase.from("coupon_usage_stats").select("*").in("coupon_id", couponIds) : { data: [] },
    couponIds.length
      ? supabase
          .from("coupon_verifications")
          .select("coupon_id, result, note, verified_at")
          .in("coupon_id", couponIds)
          .order("verified_at", { ascending: false })
          .limit(50)
      : { data: [] },
  ]);

  const referenceUrls = Array.from(new Set([store.website_url, ...argValues("--ref")].filter(Boolean))).slice(0, 6);
  const references = (await Promise.all(referenceUrls.map(fetchReference))).filter(Boolean);
  const referenceImageUrls = references.flatMap((reference) => reference.image_urls || []);
  const dealImageUrls = (deals || []).map((deal) => deal.image_url).filter(Boolean);
  const heroImageUrl =
    (await copyImageToStorage(
      store,
      [...argValues("--image"), ...referenceImageUrls, ...dealImageUrls, store.logo_url].filter(Boolean).slice(0, 10),
      isBlogMode ? "blog-reviews" : "store-reviews",
    )) ||
    store.logo_url ||
    "";

  return {
    store,
    coupons: coupons || [],
    deals: deals || [],
    usageStats: usageStats || [],
    verifications: verifications || [],
    referenceUrls,
    references,
    heroImageUrl,
  };
}

function buildReviewInstructions(currentYear) {
  return `You are the senior affiliate SEO editor for DS Review Hub.

Use the JSON input context from stdin to create a complete editorial review for its own dedicated /reviews/[slug] page. The review must help a reader decide whether the brand is a good fit. Current offers may appear as a clearly secondary next step, never as the substance of the review.

Editorial requirements:
- Write in English for US shoppers.
- Lead with a concise, extractable answer: what the brand is, who it is best for, the main limitation, and the verdict. Make every section answer a real pre-purchase question.
- Optimize for both search engines and answer engines through clear entity naming, descriptive headings, direct answers, scannable tradeoffs, realistic alternatives, and source-backed claims. Never keyword-stuff or promise rankings.
- Be specific and decision-focused, but do not invent shipping, return, warranty, pricing, rating, or policy details unless the references or supplied data support them.
- Keep editorial analysis primary. Mention current offers only where they materially affect value, and send offer seekers to the separate store page.
- Use cautious phrasing when a fact is not confirmed: "check the retailer checkout page", "availability can change", "when eligible".
- Do not use fake star ratings, fake user reviews, or unsupported claims.
- Do not mention AI, Gemini, CLI, prompts, or internal tooling.
- Produce an SEO title that includes the store name, "Review", and the year ${currentYear}. Do not force coupon or deal wording into the title.
- Keep meta_title <= 62 chars and meta_description <= 155 chars.
- content_sections should be useful editorial blocks, not generic filler. Cover shopping fit, product or service quality, value, policies/customer experience when supported, and alternatives/when to skip.
- Return 1-4 best_for items, 3-6 specific pros, 3-6 specific limitations, and 4-7 meaningful content_sections. One section must compare realistic alternatives or explain when to skip the product.
- Return 3-6 concise FAQs that directly answer high-intent decision questions and do not repeat marketing copy.
- Include at least two sources when the supplied context contains them. Use only URLs present in the supplied references; never fabricate a citation. Source notes must state what claim or part of the review each source supports.
- Keep entity facts internally consistent across the title, summary, verdict, sections, FAQ, and sources. If sources conflict or a fact cannot be verified, say so plainly instead of resolving it by guesswork.
- Never claim hands-on testing unless the supplied reference context explicitly documents the tasks, plan or version, and test date. Otherwise describe the work as research or evaluation.
- Coupon fields are supporting metadata only. Any offer CTA should point to the separate DS Review Hub store page and should not interrupt every section.
- Return only the JSON object. No markdown fences, no prose before or after.

Return this exact JSON shape:
{
  "title_candidates": ["..."],
  "title": "...",
  "h1": "...",
  "slug": "...",
  "meta_title": "...",
  "meta_description": "...",
  "dek": "...",
  "summary": "...",
  "verdict": "...",
  "best_for": ["..."],
  "pros": ["..."],
  "cons": ["..."],
  "content_sections": [
    { "heading": "...", "body": "...", "cta_after": false }
  ],
  "faqs": [
    { "question": "...", "answer": "..." }
  ],
  "coupon_strategy": {
    "primary_coupon_id": "coupon id from the supplied coupon list or null",
    "intro_cta": "...",
    "mid_article_cta": "...",
    "final_cta": "...",
    "placement_notes": "..."
  },
  "hero_image_alt": "...",
  "sources": [
    { "label": "...", "url": "...", "note": "..." }
  ]
}`;
}

function buildBlogInstructions(currentYear, storeSlug, couponShortcodeExample) {
  return `You are the senior affiliate SEO editor for DS Review Hub.

Use the JSON input context from stdin to write a full standalone buying-guide article reviewing the store and helping shoppers use current offers. This article will be published at /insights/[slug], not on the store page.

Editorial requirements:
- Write in English for US shoppers.
- Use a professional affiliate review style with real utility: clear verdict, who it is best for, shopping experience, product/service notes, coupon quality, checkout notes, ways to save, alternatives/when to skip, legitimacy/trust checks, and FAQ.
- Hard target: 1,700-2,400 words when the supplied context supports it. If context is thin, write the most useful complete article possible without inventing facts, but do not stop at a short coupon blurb.
- Use at least 8 meaningful sections with ## or ### headings. Each heading must be on its own line, followed by a blank line before body text.
- Include a short verdict near the top, then go deep enough to answer shopper intent better than a generic coupon blog.
- Include a pros and cons section in the article body.
- Include 5-7 FAQ questions in the article body and also return the same FAQ items in the faqs array.
- Use natural keyword coverage: "[store] review", "[store] coupon code", "[store] promo code", "[store] deals", "is [store] legit", shipping, returns, and checkout notes when supported.
- Be specific and conversion-focused, but do not invent shipping, return, warranty, rating, or policy details unless the supplied references support them.
- Use cautious phrasing when a fact is not confirmed: "check the retailer checkout page", "availability can change", "when eligible".
- Do not use fake star ratings, fake user reviews, or unsupported claims.
- Do not use emoji in headings.
- Do not mention AI, Gemini, CLI, prompts, or internal tooling.
- Include the store name, "Review", the year ${currentYear}, and coupon/deal intent in the SEO title.
- Keep meta_title <= 62 chars and meta_description <= 155 chars.
- The article body must be markdown-like text compatible with the DS Review Hub renderer: ## headings, ### subheadings, paragraphs, bullet lists, and coupon shortcodes.
- Insert coupon shortcode boxes naturally after the intro and again near the verdict. Use this exact shortcode format when relevant: ${couponShortcodeExample}
- If no coupon code is supplied, use [coupon store="${storeSlug}"].
- Do not wrap the coupon shortcode in backticks or code fences.
- Every coupon CTA should point shoppers back to current DS Review Hub store offers through coupon shortcodes, not raw merchant markdown links.
- Keep excerpt <= 155 chars.
- Return only the JSON object. No markdown fences, no prose before or after.

Return this exact JSON shape:
{
  "title": "...",
  "slug": "...",
  "meta_title": "...",
  "meta_description": "...",
  "excerpt": "...",
  "category": "Store Reviews",
  "tags": ["Store Reviews", "Coupons", "..."],
  "hero_image_alt": "...",
  "content": "markdown article content with coupon shortcodes",
  "faqs": [
    { "question": "...", "answer": "..." }
  ],
  "sources": [
    { "label": "...", "url": "...", "note": "..." }
  ]
}`;
}

async function callAi(instructions, context) {
  const prompt = `${instructions}\n\nInput context:\n${context}`;
  if (provider === "gemini-cli") return generateWithGeminiCli(instructions, context);
  if (provider === "gemini-api") return generateWithGeminiApi(prompt);
  if (provider === "deepseek") return generateWithDeepSeek(prompt);
  throw new Error(`Unknown provider: ${provider}`);
}

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

function couponShortcode(store, coupons, generatedLabel = "") {
  const storeSlug = slugify(store.slug || store.name);
  const coupon = coupons.find((item) => item.code && String(item.code).trim().toUpperCase() !== "NOCODE") || coupons[0];
  const code = coupon?.code && String(coupon.code).trim().toUpperCase() !== "NOCODE" ? ` code="${String(coupon.code).trim()}"` : "";
  const label = compact(generatedLabel || coupon?.title || `${store.name} coupon codes`, 80).replace(/"/g, "'");
  return `[coupon store="${storeSlug}"${code} label="${label}"]`;
}

function ensureCouponShortcode(content, shortcode) {
  const article = String(content || "").trim();
  if (article.includes("[coupon ")) return article;

  const blocks = article.split(/\n{2,}/).filter(Boolean);
  if (blocks.length <= 1) return `${article}\n\n${shortcode}`;
  return [blocks[0], shortcode, ...blocks.slice(1), shortcode].join("\n\n");
}

function normalizeBlogMarkdown(content) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/^(#{1,4}\s+[^\n]+)\n(?!\n)/gm, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function appendFaqSection(content, faqs) {
  const validFaqs = safeObjectArray(faqs, 8)
    .map((faq) => ({
      question: compact(faq.question || faq.q || "", 180),
      answer: compact(faq.answer || faq.a || "", 700),
    }))
    .filter((faq) => faq.question && faq.answer);

  if (!validFaqs.length || /\b(faq|frequently asked questions?)\b/i.test(content)) return content;

  const faqMarkdown = [
    "## Frequently Asked Questions",
    ...validFaqs.flatMap((faq) => [`### ${faq.question}`, faq.answer]),
  ].join("\n\n");

  return `${content}\n\n${faqMarkdown}`;
}

function blogWordCount(content) {
  return String(content || "")
    .replace(/\[coupon[^\]]+\]/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#>*_[\]()`"{}]/g, " ")
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .length;
}

function blogSectionCount(content) {
  return (String(content || "").match(/^#{2,3}\s+\S.+$/gm) || []).length;
}

function couponLabelForArticle(coupon) {
  return compact(coupon?.discount_value || coupon?.title || (coupon?.code ? "promo code" : "deal"), 80);
}

function bestArticleCouponLabel(coupons) {
  const labels = safeObjectArray(coupons, 20).map(couponLabelForArticle).filter(Boolean);
  const percentLabels = labels
    .map((label) => ({ label, value: Number(label.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || 0) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  return percentLabels[0]?.label || labels[0] || "current offers";
}

function deterministicDepthSections(storeContext, currentYear) {
  const { store, coupons, deals, referenceUrls } = storeContext;
  const storeName = store.name;
  const codeCount = coupons.filter((coupon) => coupon.code && String(coupon.code).trim().toUpperCase() !== "NOCODE").length;
  const dealCount = deals.length;
  const bestLabel = bestArticleCouponLabel(coupons);
  const sourceText = referenceUrls.length
    ? `We also check the merchant page and supplied reference URLs when they are available, then keep policy wording cautious because shipping, exclusions, and return windows can change without notice.`
    : `We keep policy wording cautious because shipping, exclusions, and return windows can change without notice.`;

  return [
    {
      heading: `## How DS Review Hub Reviews ${storeName} Offers`,
      body: `Our ${storeName} review process starts with the live offer list inside DS Review Hub, then compares coupon wording, discount labels, merchant links, and recent verification activity. For ${currentYear}, the goal is not just to list a ${storeName} coupon code, but to explain what kind of shopper should use it and where the discount may fail. At the time this article was generated, DS Review Hub had ${codeCount} code-based offer${codeCount === 1 ? "" : "s"} and ${dealCount} no-code deal${dealCount === 1 ? "" : "s"} available for this store, with the strongest listed value summarized as ${bestLabel}. ${sourceText}`,
    },
    {
      heading: "## Coupon Troubleshooting Before Checkout",
      body: `If a promo code does not apply, check the cart before assuming the offer is dead. Many retailers exclude sale items, bundles, gift cards, subscriptions, limited releases, or already-discounted products. A code can also be valid but only work for first-time customers, selected categories, or orders above a minimum threshold. The safest workflow is to copy the code from the DS Review Hub card, paste it into the merchant checkout field exactly as shown, then verify that the order total changes before entering payment details. If the store is already running an automatic discount, the checkout may reject a second promo code because stacking is not allowed.`,
    },
    {
      heading: "## Shipping, Returns, and Policy Checks",
      body: `Before buying from ${storeName}, review the merchant's current shipping and return policy on the checkout page or help center. Coupon savings are useful only if the final order still makes sense after delivery fees, return shipping, restocking rules, and final-sale restrictions. This matters most for fashion, beauty, health, electronics, and specialty stores where sizing, compatibility, shade matching, or product freshness can affect satisfaction. DS Review Hub does not rewrite merchant policy details unless the supplied source confirms them, so shoppers should treat this review as a buying guide and confirm the final terms directly with the retailer.`,
    },
    {
      heading: "## When to Wait for a Better Deal",
      body: `${storeName} may be worth skipping temporarily if your cart contains mostly excluded items, if the coupon only saves a small amount after shipping, or if you are unsure about return eligibility. In those cases, wait for a sitewide event, compare no-code deals against code-based discounts, or check whether a bundle offer gives a better effective price. Holiday periods, end-of-season sales, email signup windows, and app-only promotions can sometimes beat a standard promo code. The best deal is the one that reduces the final paid total on the exact items you planned to buy, not just the one with the largest headline percentage.`,
    },
    {
      heading: "## Final Buying Checklist",
      body: `Before placing an order, confirm four things: the product matches your needs, the coupon or deal applies to your cart, the shipping and return terms are acceptable, and the final total still looks competitive. If the code fails, return to the DS Review Hub ${storeName} store page and compare the next available offer rather than forcing a single promo code. This simple check helps avoid expired codes, excluded products, and impulse purchases that looked better in the headline than they do at checkout.`,
    },
  ];
}

function ensureMinimumBlogDepth(content, storeContext, currentYear) {
  let output = normalizeBlogMarkdown(content);
  if (blogWordCount(output) >= 1600 && blogSectionCount(output) >= 8) return output;

  for (const section of deterministicDepthSections(storeContext, currentYear)) {
    if (blogWordCount(output) >= 1600 && blogSectionCount(output) >= 8) break;
    if (output.includes(section.heading)) continue;
    output = `${output}\n\n${section.heading}\n\n${section.body}`;
  }

  return normalizeBlogMarkdown(output);
}

function buildBlogExpansionInstructions(currentYear, storeSlug, couponShortcodeExample, currentWordCount, currentSectionCount) {
  return `You are the senior affiliate SEO editor for DS Review Hub.

The current blog article draft is too thin (${currentWordCount} words, ${currentSectionCount} sections). Expand it into a stronger standalone store review for US shoppers.

Requirements:
- Return only the same JSON object shape as the original blog generator. No markdown fences.
- Preserve the same store, coupon intent, and exact coupon shortcode format: ${couponShortcodeExample}
- Keep the article factual. Do not invent shipping, returns, warranty, ratings, user reviews, or policy specifics.
- Expand to 1,700-2,300 words when context supports it.
- Use at least 8 useful sections with ## or ### headings on their own lines.
- Add practical depth around verdict, who should shop, product/service categories, coupon success notes, checkout troubleshooting, shipping/return checks, when to wait, pros/cons, and FAQ.
- Keep meta_title <= 62 chars and meta_description <= 155 chars.
- If no coupon code is supplied, use [coupon store="${storeSlug}"].

Return this exact JSON shape:
{
  "title": "...",
  "slug": "...",
  "meta_title": "...",
  "meta_description": "...",
  "excerpt": "...",
  "category": "Store Reviews",
  "tags": ["Store Reviews", "Coupons", "..."],
  "hero_image_alt": "...",
  "content": "expanded markdown article content with coupon shortcodes",
  "faqs": [
    { "question": "...", "answer": "..." }
  ],
  "sources": [
    { "label": "...", "url": "...", "note": "..." }
  ]
}`;
}

async function expandBlogIfThin(storeContext, generated, currentYear, primaryShortcode) {
  const currentContent = normalizeBlogMarkdown(String(generated?.content || ""));
  const currentWordCount = blogWordCount(currentContent);
  const currentSectionCount = blogSectionCount(currentContent);
  if (currentWordCount >= 1550 && currentSectionCount >= 8) return generated;

  console.log(`Blog draft is thin (${currentWordCount} words, ${currentSectionCount} sections). Requesting expansion pass...`);
  const { store, coupons, deals, usageStats, verifications, references } = storeContext;
  const context = JSON.stringify(
    {
      store,
      current_coupons: coupons.slice(0, 20),
      current_deals: deals.slice(0, 12),
      coupon_activity_and_verification: { usageStats, verifications },
      reference_pages: references,
      required_coupon_shortcode: primaryShortcode,
      current_article: generated,
      current_word_count: currentWordCount,
      current_section_count: currentSectionCount,
    },
    null,
    2,
  );

  try {
    const result = await callAi(
      buildBlogExpansionInstructions(currentYear, slugify(store.slug || store.name), primaryShortcode, currentWordCount, currentSectionCount),
      context,
    );
    const expanded = extractJson(result.text || "{}");
    const expandedWordCount = blogWordCount(expanded.content || "");
    if (expandedWordCount > currentWordCount) {
      console.log(`Expansion pass returned ${expandedWordCount} words.`);
      return {
        ...generated,
        ...expanded,
        title: expanded.title || generated.title,
        slug: expanded.slug || generated.slug,
        meta_title: expanded.meta_title || generated.meta_title,
        meta_description: expanded.meta_description || generated.meta_description,
        excerpt: expanded.excerpt || generated.excerpt,
        category: expanded.category || generated.category,
        tags: safeArray(expanded.tags, 8).length ? expanded.tags : generated.tags,
        faqs: safeObjectArray(expanded.faqs, 8).length ? expanded.faqs : generated.faqs,
        sources: safeObjectArray(expanded.sources, 10).length ? expanded.sources : generated.sources,
      };
    }
  } catch (error) {
    console.warn(`Expansion pass failed; using deterministic SEO depth fallback: ${error.message || error}`);
  }

  return generated;
}

function buildBlogPayload(storeContext, generated, generatedResult, currentYear) {
  const { store, coupons, heroImageUrl } = storeContext;
  const fallbackSlug = `${slugify(store.slug || store.name)}-review-${currentYear}-coupons`;
  const shortcode = couponShortcode(store, coupons, generated.title);
  const generatedFaqs = safeObjectArray(generated.faqs, 8);
  let content = normalizeBlogMarkdown(appendFaqSection(ensureCouponShortcode(
    generated.content ||
      `## ${store.name} Review ${currentYear}\n\n${store.name} can be worth checking when its current offers match your order. Availability can change, so compare the active DS Review Hub offers before checkout.\n\n${shortcode}\n\n## Verdict\n\nUse the current ${store.name} coupon list before ordering and confirm final terms at checkout.`,
    shortcode,
  ), generatedFaqs));
  content = ensureMinimumBlogDepth(content, storeContext, currentYear);
  const isPublished = hasFlag("--publish");
  const now = new Date().toISOString();

  return {
    title: compact(generated.title || `${store.name} Review ${currentYear}: What to Know Before Buying`, 180),
    slug: slugify(generated.slug || fallbackSlug) || fallbackSlug,
    meta_title: compact(generated.meta_title || generated.title || `${store.name} Review ${currentYear}: Coupons & Deals`, 62),
    meta_description: compact(generated.meta_description || generated.excerpt || `Read our ${store.name} review, current coupons, promo codes, deals, and checkout notes before you buy.`, 155),
    excerpt: compact(generated.excerpt || `Read our ${store.name} review and check current coupons, deals, and checkout notes before you buy.`, 155),
    content,
    image_url: heroImageUrl || null,
    hero_image_alt: compact(generated.hero_image_alt || `${store.name} review and coupon guide`, 140),
    category: compact(generated.category || "Store Reviews", 80) || "Store Reviews",
    tags: safeArray(generated.tags, 8).length
      ? safeArray(generated.tags, 8)
      : ["Store Reviews", "Coupons", store.name].filter(Boolean),
    faqs: generatedFaqs,
    sources: safeObjectArray(generated.sources, 10),
    author_name: "DS Review Hub Editorial Team",
    reviewed_at: now,
    is_published: isPublished,
    published_at: isPublished ? now : null,
    updated_at: now,
  };
}

function buildPayload(storeContext, generated, generatedResult, currentYear) {
  const { store, coupons, heroImageUrl, referenceUrls } = storeContext;
  const primaryCouponId = pickPrimaryCouponId(generated, coupons);
  const status = hasFlag("--publish") ? "published" : "draft";
  const now = new Date().toISOString();

  return {
    store_id: store.id,
    title: compact(generated.title || `${store.name} Review ${currentYear}: Coupons, Deals & Ways to Save`, 180),
    h1: compact(generated.h1 || "", 180) || null,
    slug: compact(generated.slug || `${store.slug || store.name}-review-${currentYear}`, 120)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    meta_title: compact(generated.meta_title || "", 62) || null,
    meta_description: compact(generated.meta_description || "", 155) || null,
    dek: compact(generated.dek || "", 260) || null,
    summary: compact(generated.summary || `An editorial look at ${store.name}, including who it may suit, the tradeoffs to consider, and what to check before buying.`, 900),
    verdict: compact(generated.verdict || "", 900) || null,
    best_for: safeArray(generated.best_for, 6),
    pros: safeArray(generated.pros, 8),
    cons: safeArray(generated.cons, 8),
    content_sections: safeObjectArray(generated.content_sections, 8),
    faqs: safeObjectArray(generated.faqs, 8),
    coupon_strategy: {
      ...(generated.coupon_strategy && typeof generated.coupon_strategy === "object" ? generated.coupon_strategy : {}),
      primary_coupon_id: primaryCouponId,
    },
    primary_coupon_id: primaryCouponId,
    hero_image_url: heroImageUrl || null,
    hero_image_alt: compact(generated.hero_image_alt || `${store.name} editorial review`, 140),
    sources: safeObjectArray(generated.sources, 10),
    research_queries: referenceUrls,
    title_candidates: safeArray(generated.title_candidates, 20),
    status,
    model: `${generatedResult.provider}:${generatedResult.model}`,
    generated_at: now,
    published_at: status === "published" ? now : null,
  };
}

async function generateForStore(store, index, total) {
  const label = total > 1 ? `[${index}/${total}] ` : "";
  console.log(`${label}Generating ${isBlogMode ? "blog review" : "store review"} for ${store.name} via ${provider}...`);

  const storeContext = await loadStoreContext(store);
  const currentYear = new Date().getFullYear();
  const primaryShortcode = couponShortcode(storeContext.store, storeContext.coupons);
  const instructions = isBlogMode
    ? buildBlogInstructions(currentYear, slugify(store.slug || store.name), primaryShortcode)
    : buildReviewInstructions(currentYear);
  const context = JSON.stringify(
    {
      store: storeContext.store,
      current_coupons: storeContext.coupons.slice(0, 20),
      current_deals: storeContext.deals.slice(0, 12),
      coupon_activity_and_verification: {
        usageStats: storeContext.usageStats,
        verifications: storeContext.verifications,
      },
      reference_pages: storeContext.references,
      required_coupon_shortcode: primaryShortcode,
      target_url_if_published: isBlogMode
        ? `https://www.dsreviewhub.com/insights/${slugify(store.slug || store.name)}-review-${currentYear}-coupons`
        : `https://www.dsreviewhub.com/reviews/${slugify(store.slug || store.name)}-review-${currentYear}`,
    },
    null,
    2,
  );

  const generatedResult = await callAi(instructions, context);
  let generated = extractJson(generatedResult.text || "{}");
  if (isBlogMode) {
    generated = await expandBlogIfThin(storeContext, generated, currentYear, primaryShortcode);
    const payload = buildBlogPayload(storeContext, generated, generatedResult, currentYear);

    if (hasFlag("--dry-run")) {
      console.log(`Dry run OK: ${payload.title}`);
      console.log(`Draft blog URL: https://www.dsreviewhub.com/insights/${payload.slug}`);
      return { id: null, title: payload.title, status: payload.is_published ? "published" : "draft" };
    }

    let { data: post, error } = await supabase
      .from("blog_posts")
      .upsert(payload, { onConflict: "slug" })
      .select("id, title, slug, is_published")
      .single();

    if (error && /schema cache|Could not find|column/i.test(error.message || "")) {
      console.warn("Blog SEO columns are not applied yet. Retrying with base blog fields only.");
      const retry = await supabase
        .from("blog_posts")
        .upsert(stripExtendedBlogColumns(payload), { onConflict: "slug" })
        .select("id, title, slug, is_published")
        .single();
      post = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    console.log(`Saved ${post.is_published ? "published" : "draft"} blog post: ${post.title}`);
    console.log(`Blog URL: https://www.dsreviewhub.com/insights/${post.slug}`);
    return post;
  }

  const payload = buildPayload(storeContext, generated, generatedResult, currentYear);

  if (hasFlag("--dry-run")) {
    console.log(`Dry run OK: ${payload.title}`);
    return { id: null, title: payload.title, status: payload.status };
  }

  const { data: review, error } = await supabase
    .from("store_reviews")
    .upsert(payload, { onConflict: "store_id" })
    .select("id, title, status")
    .single();

  if (error) throw error;
  console.log(`Saved ${review.status} review: ${review.title}`);
  return review;
}

async function main() {
  const stores = hasFlag("--all") ? await listStoresForBulk() : [await findStore()];
  if (!stores.length) {
    console.log(`No stores to generate. Use --force if existing ${isBlogMode ? "blog posts" : "reviews"} should be regenerated.`);
    return;
  }

  const delayMs = numberArg("--delay-ms", hasFlag("--all") ? 3000 : 0);
  const failures = [];

  for (let i = 0; i < stores.length; i += 1) {
    try {
      await generateForStore(stores[i], i + 1, stores.length);
    } catch (error) {
      failures.push({ store: stores[i], error });
      console.error(`Failed ${stores[i].name}: ${error.message || error}`);
    }

    if (delayMs && i < stores.length - 1) await wait(delayMs);
  }

  if (failures.length) {
    console.error(`Finished with ${failures.length} failure(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Finished ${stores.length} ${isBlogMode ? "blog post" : "store review"}(s).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
