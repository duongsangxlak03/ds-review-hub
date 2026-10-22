import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

type IntakeRequest = {
  affiliate_url: string;
  brand_name?: string;
  category?: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const compact = (value: unknown, max = 220) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).replace(/\s+\S*$/, "")}...`;
};

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const stripHtml = (html: string) =>
  decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

const metaContent = (html: string, key: string) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return compact(decodeHtml(match[1]), 500);
  }
  return "";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

const isPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
};

const safePublicUrl = (input: string) => {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid affiliate URL including https://");
  }

  if (!/^https?:$/.test(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported");

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("Private or local network URLs are not supported");
  }

  return url;
};

async function resolveMerchantPage(input: string) {
  let current = safePublicUrl(input);

  for (let redirect = 0; redirect <= 5; redirect += 1) {
    const response = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": "DSReviewHubBot/1.0 (+https://www.dsreviewhub.com)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Affiliate redirect did not provide a destination");
      current = safePublicUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) throw new Error(`Merchant page returned HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!/text|html/i.test(contentType)) throw new Error("Affiliate destination is not an HTML page");

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 4 * 1024 * 1024) throw new Error("Merchant page is too large to inspect safely");

    const html = (await response.text()).slice(0, 1_500_000);
    return { url: current, html };
  }

  throw new Error("Affiliate URL has too many redirects");
}

const inferBrandName = (url: URL, html: string) => {
  const siteName = metaContent(html, "og:site_name") || metaContent(html, "application-name");
  if (siteName && siteName.length <= 80) return siteName;

  const title = compact(stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""), 140);
  const titleLead = title.split(/\s+[|–—]\s+|\s+-\s+/)[0]?.trim();
  if (titleLead && titleLead.length >= 2 && titleLead.length <= 80) return titleLead;

  const domain = url.hostname.replace(/^www\./, "").split(".")[0] || "Online Brand";
  return titleCase(domain);
};

const inferCategory = (html: string, title: string, description: string) => {
  const sample = `${title} ${description} ${stripHtml(html).slice(0, 6000)}`.toLowerCase();
  if (/\b(ai|artificial intelligence|large language model|llm|generative|ai agent|machine learning)\b/.test(sample)) return "AI Tools";
  if (/\b(ecommerce|e-commerce|online store builder|shopping cart|point of sale|merchant platform)\b/.test(sample)) return "Ecommerce";
  if (/\b(saas|software|workflow|automation|crm|project management|productivity platform)\b/.test(sample)) return "Software";
  if (/\b(skincare|cosmetic|beauty|makeup|hair care)\b/.test(sample)) return "Beauty & Personal Care";
  if (/\b(clothing|apparel|fashion|footwear|jewelry)\b/.test(sample)) return "Fashion & Apparel";
  if (/\b(supplement|wellness|fitness|health)\b/.test(sample)) return "Health & Wellness";
  if (/\b(home|furniture|kitchen|garden|appliance)\b/.test(sample)) return "Home & Garden";
  return "Online Brand";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Missing authorization header" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseClient.rpc("is_admin");
    if (!isAdmin) return jsonResponse({ error: "Admin access required" }, 403);

    const body = (await req.json()) as IntakeRequest;
    const affiliateUrl = safePublicUrl(body.affiliate_url || "").toString();
    const merchantPage = await resolveMerchantPage(affiliateUrl);
    const pageTitle = compact(stripHtml(merchantPage.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""), 160);
    const pageDescription = compact(
      metaContent(merchantPage.html, "description") || metaContent(merchantPage.html, "og:description"),
      420,
    );
    const brandName = compact(body.brand_name || inferBrandName(merchantPage.url, merchantPage.html), 100);
    const slug = slugify(brandName);
    const inferredCategory = inferCategory(merchantPage.html, pageTitle, pageDescription);
    const ogImage = metaContent(merchantPage.html, "og:image");
    let heroImage = "";
    if (ogImage) {
      try {
        heroImage = safePublicUrl(new URL(ogImage, merchantPage.url).toString()).toString();
      } catch {
        // A malformed or private OG image should not block an otherwise valid intake.
      }
    }

    if (!brandName || !slug) return jsonResponse({ error: "Could not infer a usable brand name. Enter one manually." }, 400);

    const { data: existing, error: existingError } = await supabaseClient
      .from("stores")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (existingError) throw existingError;

    const category = compact(body.category || existing?.category || inferredCategory, 80);

    const storePayload = {
      name: brandName,
      slug,
      category,
      description: pageDescription || existing?.description || null,
      website_url: affiliateUrl,
      is_active: true,
    };

    const storeResult = existing
      ? await supabaseClient.from("stores").update(storePayload).eq("id", existing.id).select("*").single()
      : await supabaseClient.from("stores").insert(storePayload).select("*").single();

    if (storeResult.error) throw storeResult.error;

    return jsonResponse({
      store: storeResult.data,
      intake: {
        affiliate_url: affiliateUrl,
        resolved_url: merchantPage.url.toString(),
        brand_name: brandName,
        category,
        page_title: pageTitle,
        page_description: pageDescription,
      },
      reference_urls: [merchantPage.url.toString()],
      image_urls: heroImage ? [heroImage] : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Affiliate intake failed";
    console.error("ingest-affiliate-review error:", message);
    return jsonResponse({ error: message }, 400);
  }
});
