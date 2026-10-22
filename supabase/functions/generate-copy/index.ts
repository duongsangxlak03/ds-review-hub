import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CopyRequest {
  store_name: string;
  website_url?: string;
  coupon_code?: string;
  discount_text?: string;
  deal_title?: string;
  deal_discount_text?: string;
  deal_original_price?: string;
  deal_sale_price?: string;
  deal_affiliate_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: isAdmin } = await supabaseClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items } = (await req.json()) as { items: CopyRequest[] };

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

  const CATEGORIES = [
      "Fashion & Apparel", "Electronics & Tech", "Beauty & Personal Care",
      "Health & Wellness", "Food & Grocery", "Home & Garden",
      "Sports & Outdoors", "Travel & Hotels", "Entertainment & Media",
      "Education & Courses", "Software & SaaS", "Finance & Insurance",
      "Baby & Kids", "Pets", "Automotive", "Office & Business", "Other"
    ];

    const prompt = `You are a world-class direct-response copywriter for a coupon/deal website. Your job is to write UNIQUE, compelling, click-worthy marketing copy in English that makes shoppers STOP scrolling and ACT.

CRITICAL: Every single item MUST have DIFFERENT copy. Never repeat the same phrases, structures, or patterns across items. Vary your approach for each one.

For each item below, generate the missing fields. Return a JSON array with the same order.

Each result object should have these fields (only generate what's missing, keep existing values):
- store_description: 1-2 sentence compelling store description (if missing). Vary tone: sometimes aspirational, sometimes practical, sometimes playful.
- coupon_title: Short, punchy coupon title (if there's a coupon_code). Use DIFFERENT angles each time:
  * Savings angle: "Save 20% on Premium Skincare"
  * Exclusive angle: "Members-Only: 15% Off Everything"  
  * Urgency angle: "Flash Deal: 30% Off Today"
  * Value angle: "Get $50 Worth of Products for $35"
  * Action angle: "Slash Your Cart by 25%"
- coupon_description: 1-2 sentence persuasive description (if there's a coupon_code). Rotate between: urgency, social proof, scarcity, value stacking, fear of missing out.
- deal_title: Short deal title (if there's deal info but no deal_title). Make each one feel fresh and different.
- deal_description: 1-2 sentence compelling deal description. Use varied hooks: savings math, lifestyle benefit, comparison, limited availability, seasonal relevance.
- deal_original_price: Estimated original price as a number (if deal has discount info but no original_price — estimate based on discount text and store type). Return null if unsure.
- deal_sale_price: Estimated sale price as a number (calculate from original_price and discount). Return null if unsure.
- store_category: Pick EXACTLY ONE from this list: ${JSON.stringify(CATEGORIES)}. Choose based on store name and website.

Style rules:
- NEVER start two titles the same way
- NEVER use the same power word twice in a row across items
- Mix sentence structures: questions, commands, exclamations, statements
- Vary vocabulary: don't always say "save" — use "slash", "score", "unlock", "grab", "snag", "pocket", "enjoy"
- Keep titles under 60 chars, descriptions under 150 chars
- If a field already has content or isn't applicable, return null
- store_category is REQUIRED for every item

Items:
${JSON.stringify(items, null, 2)}

Return ONLY a valid JSON array, no markdown, no explanation.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Parse JSON from response, strip markdown fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let results;
    try {
      results = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", cleaned);
      results = items.map(() => ({}));
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-copy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
