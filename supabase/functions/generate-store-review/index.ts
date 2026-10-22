import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

interface GenerateStoreReviewRequest {
  store_id: string;
  review_vertical?: "ai" | "ecommerce";
  reference_urls?: string[];
  image_urls?: string[];
  publish?: boolean;
}

interface StoreRecord {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  category: string | null;
}

interface CouponRecord {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  discount_value: string | null;
  url: string | null;
  expiry_date: string | null;
  is_verified: boolean | null;
  sort_order: number | null;
}

interface DealRecord {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  original_price: number | null;
  deal_price: number | null;
  expiry_date: string | null;
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });

const compact = (value: unknown, max = 220) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).replace(/\s+\S*$/, "")}...`;
};

const toUrl = (value: string) => {
  const raw = value.trim();
  if (!raw) return "";
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`).toString();
  } catch {
    return "";
  }
};

const stripHtml = (html: string) =>
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

async function fetchReference(url: string) {
  const safeUrl = toUrl(url);
  if (!safeUrl) return null;

  try {
    const response = await fetch(safeUrl, {
      headers: {
        "user-agent": "DSReviewHubBot/1.0 (+https://www.dsreviewhub.com)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!/text|html|json/i.test(contentType)) return null;

    const raw = await response.text();
    const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const description = raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const text = stripHtml(raw);

    return {
      url: safeUrl,
      title: compact(stripHtml(title || ""), 140),
      description: compact(description || "", 240),
      excerpt: compact(text, 1800),
    };
  } catch {
    return null;
  }
}

async function fetchSerpResearch(store: StoreRecord) {
  const apiKey = Deno.env.get("SERPAPI_API_KEY");
  if (!apiKey) return { queries: [] as string[], results: [] as unknown[], pages: [] as unknown[] };

  const category = String(store.category || "").toLowerCase();
  const isSoftware = /ai|software|saas|ecommerce|e-commerce|platform|tool/.test(category);
  const queries = isSoftware
    ? [
        `${store.name} review pricing features`,
        `${store.name} documentation limitations support`,
        `${store.name} alternatives comparison`,
      ]
    : [
        `${store.name} review product quality`,
        `${store.name} shipping returns customer service`,
        `${store.name} alternatives comparison`,
      ];
  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google");
        url.searchParams.set("q", query);
        url.searchParams.set("num", "5");
        url.searchParams.set("api_key", apiKey);

        const response = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
        if (!response.ok) return { query, organic_results: [] as Record<string, unknown>[] };
        const data = await response.json();
        const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
        return {
          query,
          organic_results: organic.slice(0, 5).map((item: Record<string, unknown>) => ({
            title: compact(item.title, 120),
            link: toUrl(String(item.link || "")),
            snippet: compact(item.snippet, 260),
            source: item.source,
          })),
        };
      } catch {
        return { query, organic_results: [] as Record<string, unknown>[] };
      }
    }),
  );

  const researchUrls: string[] = [];
  const seenHosts = new Set<string>();
  for (const result of results) {
    for (const item of result.organic_results) {
      const url = toUrl(String(item.link || ""));
      if (!url) continue;
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      if (seenHosts.has(hostname)) continue;
      seenHosts.add(hostname);
      researchUrls.push(url);
      if (researchUrls.length >= 6) break;
    }
    if (researchUrls.length >= 6) break;
  }

  const pages = (await Promise.all(researchUrls.map(fetchReference))).filter(Boolean);
  return { queries, results, pages };
}

const imageExtension = (contentType: string, url: string) => {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  const fromUrl = url.split("?")[0].match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if (fromUrl && ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(fromUrl)) return fromUrl;
  return "jpg";
};

async function copyImageToStorage(
  supabaseClient: ReturnType<typeof createClient>,
  store: StoreRecord,
  imageUrls: string[],
) {
  for (const input of imageUrls) {
    const url = toUrl(input);
    if (!url) continue;

    try {
      const response = await fetch(url, {
        headers: { "user-agent": "DSReviewHubBot/1.0 (+https://www.dsreviewhub.com)" },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;

      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > 5 * 1024 * 1024) continue;

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 5 * 1024 * 1024) continue;

      const ext = imageExtension(contentType, url);
      const folder = (store.slug || store.id).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const path = `store-reviews/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabaseClient.storage.from("blog-images").upload(path, buffer, {
        cacheControl: "31536000",
        contentType,
        upsert: false,
      });

      if (error) continue;
      const { data } = supabaseClient.storage.from("blog-images").getPublicUrl(path);
      return data.publicUrl;
    } catch {
      continue;
    }
  }

  return "";
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1] || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(candidate);
}

const safeArray = (value: unknown, max = 8) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, max)
    : [];

const safeObjectArray = (value: unknown, max = 10) =>
  Array.isArray(value)
    ? value
        .filter((item) => item && typeof item === "object")
        .slice(0, max)
    : [];

const pickPrimaryCouponId = (generated: Record<string, unknown>, coupons: CouponRecord[]) => {
  const requested = String((generated.coupon_strategy as Record<string, unknown> | undefined)?.primary_coupon_id || "");
  if (requested && coupons.some((coupon) => coupon.id === requested)) return requested;
  const firstCode = coupons.find((coupon) => coupon.code && coupon.code.toUpperCase() !== "NOCODE");
  return firstCode?.id || coupons[0]?.id || null;
};

async function generateWithDeepSeek(prompt: string) {
  const model = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-v4-flash";
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekKey}`,
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

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`DeepSeek failed ${response.status}: ${details.slice(0, 1200)}`);
  }

  const data = await response.json();
  return {
    model,
    provider: "deepseek",
    text: data.choices?.[0]?.message?.content || "{}",
  };
}

async function generateWithGemini(prompt: string) {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
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
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini failed ${response.status}: ${details.slice(0, 1200)}`);
  }

  const data = await response.json();
  return {
    model,
    provider: "gemini",
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || "{}",
  };
}

async function generateReviewJson(prompt: string) {
  const provider = (Deno.env.get("AI_PROVIDER") || "auto").toLowerCase();
  const errors: string[] = [];

  if (provider === "deepseek") return generateWithDeepSeek(prompt);
  if (provider === "gemini") return generateWithGemini(prompt);

  if (Deno.env.get("DEEPSEEK_API_KEY")) {
    try {
      return await generateWithDeepSeek(prompt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (Deno.env.get("GEMINI_API_KEY")) {
    try {
      return await generateWithGemini(prompt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(errors.join(" | ") || "No AI provider is configured");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin } = await supabaseClient.rpc("is_admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const body = (await req.json()) as GenerateStoreReviewRequest;
    if (!body.store_id) {
      return jsonResponse({ error: "store_id is required" }, 400);
    }
    const reviewVertical = body.review_vertical === "ai" ? "ai" : "ecommerce";

    const { data: store, error: storeError } = await supabaseClient
      .from("stores")
      .select("id, name, slug, description, logo_url, website_url, category")
      .eq("id", body.store_id)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) return jsonResponse({ error: "Store not found" }, 404);

    const { data: existingReview, error: existingReviewError } = await supabaseClient
      .from("store_reviews")
      .select("review_vertical")
      .eq("store_id", store.id)
      .maybeSingle();
    if (existingReviewError) throw existingReviewError;
    if (existingReview && existingReview.review_vertical !== reviewVertical) {
      return jsonResponse(
        {
          error: `This store already belongs to ${existingReview.review_vertical === "ai" ? "AI Reviews" : "Ecommerce Reviews"}. Use the matching admin section.`,
        },
        409,
      );
    }

    const { data: couponsData, error: couponsError } = await supabaseClient
      .from("coupons")
      .select("id, title, description, code, discount_value, url, expiry_date, is_verified, sort_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (couponsError) throw couponsError;

    const { data: dealsData, error: dealsError } = await supabaseClient
      .from("deals")
      .select("id, title, description, url, image_url, original_price, deal_price, expiry_date")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (dealsError) throw dealsError;

    const coupons = (couponsData || []) as CouponRecord[];
    const deals = (dealsData || []) as DealRecord[];
    const couponIds = coupons.map((coupon) => coupon.id);

    const [{ data: usageStats }, { data: verifications }] = await Promise.all([
      couponIds.length
        ? supabaseClient.from("coupon_usage_stats").select("*").in("coupon_id", couponIds)
        : Promise.resolve({ data: [] }),
      couponIds.length
        ? supabaseClient
            .from("coupon_verifications")
            .select("coupon_id, result, note, verified_at")
            .in("coupon_id", couponIds)
            .order("verified_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),
    ]);

    const referenceInputs = Array.from(
      new Set([store.website_url, ...(body.reference_urls || [])].map((url) => String(url || "").trim()).filter(Boolean)),
    ).slice(0, 6);
    const references = (await Promise.all(referenceInputs.map(fetchReference))).filter(Boolean);
    const serpResearch = await fetchSerpResearch(store as StoreRecord);
    const heroImageUrl =
      (await copyImageToStorage(supabaseClient, store as StoreRecord, (body.image_urls || []).slice(0, 4))) ||
      store.logo_url ||
      "";

    const currentYear = new Date().getFullYear();
    const verticalRequirements = reviewVertical === "ai"
      ? `This is an AI product review. Prioritize concrete use cases, output quality, reliability, workflow fit, plan limits, integrations, data handling/privacy, and credible alternatives. Do not judge it like a physical retailer or invent hands-on tests.`
      : `This is an ecommerce brand review. Prioritize catalog and product fit, value, checkout experience, delivery/fulfillment, returns, customer support, shopping trust, and credible alternatives. Do not judge it like a software tool.`;

    const prompt = `You are the senior affiliate SEO editor for DS Review Hub.

Create a complete editorial review for its own dedicated /reviews/[slug] page. The review must help a reader decide whether the brand is a good fit. Current offers may appear as a clearly secondary next step, never as the substance of the review.

Review vertical: ${reviewVertical}
${verticalRequirements}

Store:
${JSON.stringify(store, null, 2)}

Current coupons:
${JSON.stringify(coupons.slice(0, 20), null, 2)}

Current deals:
${JSON.stringify(deals.slice(0, 12), null, 2)}

Coupon activity and verification data:
${JSON.stringify({ usageStats, verifications }, null, 2)}

Reference pages that DS Review Hub has permission to use:
${JSON.stringify(references, null, 2)}

SERP research if configured:
${JSON.stringify(serpResearch.results, null, 2)}

Research pages fetched from those results if accessible:
${JSON.stringify(serpResearch.pages, null, 2)}

Editorial requirements:
- Write in English for US shoppers.
- Lead with a concise, extractable answer: what the brand is, who it is best for, the main limitation, and the verdict. Make every section answer a real pre-purchase question.
- Optimize for both search engines and answer engines through clear entity naming, descriptive headings, direct answers, scannable tradeoffs, realistic alternatives, and source-backed claims. Never keyword-stuff or promise rankings.
- Be specific and decision-focused, but do not invent shipping, return, warranty, pricing, rating, or policy details unless the references or supplied data support them.
- Keep editorial analysis primary. Mention current offers only where they materially affect value, and send offer seekers to the separate store page.
- Use cautious phrasing when a fact is not confirmed: "check the retailer checkout page", "availability can change", "when eligible".
- Do not use fake star ratings, fake user reviews, or unsupported claims.
- Do not mention AI, Gemini, prompts, or internal tooling.
- Produce an SEO title that includes the store name, "Review", and the year ${currentYear}. Do not force coupon or deal wording into the title.
- Keep meta_title <= 62 chars and meta_description <= 155 chars.
- content_sections should be useful editorial blocks, not generic filler. Cover shopping fit, product or service quality, value, policies/customer experience when supported, and alternatives/when to skip.
- Return 1-4 best_for items, 3-6 specific pros, 3-6 specific limitations, and 4-7 meaningful content_sections. One section must compare realistic alternatives or explain when to skip the product.
- Return 3-6 concise FAQs that directly answer high-intent decision questions and do not repeat marketing copy.
- Include at least two sources when the supplied context contains them. Use only URLs present in the supplied references or SERP research; never fabricate a citation. Source notes must state what claim or part of the review each source supports.
- Keep entity facts internally consistent across the title, summary, verdict, sections, FAQ, and sources. If sources conflict or a fact cannot be verified, say so plainly instead of resolving it by guesswork.
- Never claim hands-on testing unless the supplied reference context explicitly documents the tasks, plan or version, and test date. Otherwise describe the work as research or evaluation.
- Coupon fields are supporting metadata only. Any offer CTA should point to the separate DS Review Hub store page and should not interrupt every section.

Return ONLY valid JSON with this exact shape:
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

    let generatedResult: { model: string; provider: string; text: string };
    try {
      generatedResult = await generateReviewJson(prompt);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      console.error("AI review generation failed:", details);
      return jsonResponse(
        {
          error: "AI review generation failed",
          details: details.slice(0, 1200),
        },
        500,
      );
    }

    const text = generatedResult.text || "{}";
    let generated: Record<string, unknown>;
    try {
      generated = extractJson(text);
    } catch {
      console.error("Failed to parse review JSON:", text);
      return jsonResponse(
        {
          error: "AI response was not valid JSON",
          details: text.slice(0, 1200),
        },
        500,
      );
    }

    const status = body.publish ? "published" : "draft";
    const now = new Date().toISOString();
    const primaryCouponId = pickPrimaryCouponId(generated, coupons);
    const couponStrategy = {
      ...(generated.coupon_strategy && typeof generated.coupon_strategy === "object" ? generated.coupon_strategy : {}),
      primary_coupon_id: primaryCouponId,
    };

    const payload = {
      store_id: store.id,
      review_vertical: reviewVertical,
      title: compact(generated.title || `${store.name} Review ${currentYear}: What to Know Before Buying`, 180),
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
      coupon_strategy: couponStrategy,
      primary_coupon_id: primaryCouponId,
      hero_image_url: heroImageUrl || null,
      hero_image_alt: compact(generated.hero_image_alt || `${store.name} editorial review`, 140),
      sources: safeObjectArray(generated.sources, 10),
      research_queries: Array.from(new Set([...referenceInputs, ...serpResearch.queries])),
      title_candidates: safeArray(generated.title_candidates, 20),
      status,
      model: `${generatedResult.provider}:${generatedResult.model}`,
      generated_at: now,
      published_at: status === "published" ? now : null,
    };

    const { data: review, error: upsertError } = await supabaseClient
      .from("store_reviews")
      .upsert(payload, { onConflict: "store_id" })
      .select("*")
      .single();

    if (upsertError) throw upsertError;

    return jsonResponse({ review });
  } catch (error) {
    console.error("generate-store-review error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
