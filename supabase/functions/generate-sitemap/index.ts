import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

const DOMAIN = "https://www.dsreviewhub.com";

const categories = [
  { slug: "fashion-apparel", labels: ["Fashion & Apparel", "Apparel", "Accessories", "Shoes"] },
  { slug: "electronics-tech", labels: ["Electronics & Tech", "Electronics", "Computers & Laptops"] },
  { slug: "beauty-personal-care", labels: ["Beauty & Personal Care", "Beauty & Fitness"] },
  { slug: "health-wellness", labels: ["Health & Wellness", "Health & Personal Care"] },
  { slug: "food-grocery", labels: ["Food & Grocery", "Food & Dining"] },
  { slug: "home-garden", labels: ["Home & Garden"] },
  { slug: "sports-outdoors", labels: ["Sports & Outdoors"] },
  { slug: "travel-hotels", labels: ["Travel & Hotels"] },
  { slug: "entertainment-media", labels: ["Entertainment & Media", "Books & Media"] },
  { slug: "education-courses", labels: ["Education & Courses"] },
  { slug: "software-saas", labels: ["Software & SaaS"] },
  { slug: "finance-insurance", labels: ["Finance & Insurance"] },
  { slug: "baby-kids", labels: ["Baby & Kids", "Toys & Kids"] },
  { slug: "pets", labels: ["Pets"] },
  { slug: "automotive", labels: ["Automotive"] },
  { slug: "office-business", labels: ["Office & Business", "Services"] },
];

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  // Fetch all active stores
  const { data: stores } = await supabase
    .from("stores")
    .select("id, slug, category, updated_at")
    .eq("is_active", true)
    .order("name");

  const { data: storeReviews } = await supabase
    .from("store_reviews")
    .select("store_id, updated_at, published_at")
    .eq("status", "published");

  let { data: blogPosts, error: blogPostsError } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, published_at, created_at, tags, content_type")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (blogPostsError) {
    const fallback = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at, created_at, tags")
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    blogPosts = fallback.data as typeof blogPosts;
    blogPostsError = fallback.error;
  }

  const insightPosts = (blogPosts || []).filter((post) =>
    post.content_type === "insight" || post.tags?.includes("DS Insight")
  );

  const today = new Date().toISOString().split("T")[0];
  const reviewLastmodByStoreId = new Map(
    (storeReviews || []).map((review) => [
      review.store_id,
      (review.updated_at || review.published_at || today).split("T")[0],
    ])
  );

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${DOMAIN}/stores</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${DOMAIN}/deals</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${DOMAIN}/insights</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${DOMAIN}/about</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${DOMAIN}/contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${DOMAIN}/why-different</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${DOMAIN}/learn</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${DOMAIN}/privacy</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>${DOMAIN}/terms</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>${DOMAIN}/disclosure</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>
`;

  // Category pages
  const storeCategories = new Set((stores || []).map((store) => String(store.category || "").toLowerCase()));
  for (const category of categories) {
    const hasStores = category.labels.some((label) => storeCategories.has(label.toLowerCase()));
    if (!hasStores) continue;
    xml += `  <url><loc>${DOMAIN}/category/${category.slug}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
  }

  // Store pages
  for (const store of (stores || [])) {
    if (store.slug) {
      const storeLastmod = store.updated_at ? store.updated_at.split("T")[0] : today;
      const reviewLastmod = reviewLastmodByStoreId.get(store.id);
      const lastmod = reviewLastmod && reviewLastmod > storeLastmod ? reviewLastmod : storeLastmod;
      xml += `  <url><loc>${xmlEscape(`${DOMAIN}/store/${store.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>\n`;
    }
  }

  // Blog post pages
  for (const post of insightPosts) {
    if (post.slug) {
      const lastmod = (post.updated_at || post.published_at || post.created_at || today).split("T")[0];
      xml += `  <url><loc>${xmlEscape(`${DOMAIN}/insights/${post.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, { headers: corsHeaders });
});
