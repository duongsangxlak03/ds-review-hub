import type { Plugin } from "vite";
import { loadEnv } from "vite";
import fs from "fs";
import path from "path";
import { extractCouponShortcodes, shortcodeKey, splitBlogContent, type BlogCouponShortcode } from "./src/lib/blogCouponShortcodes";
import { cleanBlogText, ensureBlogContentDepth, extractBlogFaqItems } from "./src/lib/blogSeo";
import { moneyPageGuideForStore, type MoneyPageGuide } from "./src/lib/moneyPageGuides";

const DOMAIN = "https://www.dsreviewhub.com";
const DEFAULT_SOCIAL_IMAGE = `${DOMAIN}/favicon.ico`;

interface CategoryDefinition {
  slug: string;
  label: string;
  description: string;
  aliases?: string[];
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    slug: "fashion-apparel",
    label: "Fashion & Apparel",
    description: "Find clothing, accessories, footwear, and style stores with current promo codes and deals.",
    aliases: ["Apparel", "Accessories", "Shoes"],
  },
  {
    slug: "electronics-tech",
    label: "Electronics & Tech",
    description: "Browse electronics, gadgets, audio, device accessories, and tech stores with listed offers.",
    aliases: ["Electronics", "Computers & Laptops"],
  },
  {
    slug: "beauty-personal-care",
    label: "Beauty & Personal Care",
    description: "Compare beauty, skincare, haircare, fragrance, and personal care coupon codes and deals.",
    aliases: ["Beauty & Fitness"],
  },
  {
    slug: "health-wellness",
    label: "Health & Wellness",
    description: "Review supplement, wellness, fitness, and health product stores with current discounts.",
    aliases: ["Health & Personal Care"],
  },
  {
    slug: "food-grocery",
    label: "Food & Grocery",
    description: "Browse food, beverage, grocery, snack, and specialty store deals before checkout.",
    aliases: ["Food & Dining"],
  },
  {
    slug: "home-garden",
    label: "Home & Garden",
    description: "Find home decor, furniture, garden, bedding, kitchen, and household store offers.",
  },
  {
    slug: "sports-outdoors",
    label: "Sports & Outdoors",
    description: "Compare outdoor gear, sportswear, fitness, camping, and recreation coupons and deals.",
  },
  {
    slug: "travel-hotels",
    label: "Travel & Hotels",
    description: "Browse travel, hotel, luggage, and trip-related stores with current discount listings.",
  },
  {
    slug: "entertainment-media",
    label: "Entertainment & Media",
    description: "Find entertainment, books, media, games, and hobby stores with listed promo codes.",
    aliases: ["Books & Media"],
  },
  {
    slug: "education-courses",
    label: "Education & Courses",
    description: "Review education, course, learning, and training offers from listed online stores.",
  },
  {
    slug: "software-saas",
    label: "Software & SaaS",
    description: "Compare software, SaaS, productivity, creator, and business app coupons and deals.",
  },
  {
    slug: "finance-insurance",
    label: "Finance & Insurance",
    description: "Browse finance, insurance, accounting, and money-related offers where available.",
  },
  {
    slug: "baby-kids",
    label: "Baby & Kids",
    description: "Find baby, kids, toys, family, and children's product stores with listed discounts.",
    aliases: ["Toys & Kids"],
  },
  {
    slug: "pets",
    label: "Pets",
    description: "Review pet food, pet care, accessories, and animal supply store coupons and deals.",
  },
  {
    slug: "automotive",
    label: "Automotive",
    description: "Browse automotive parts, tools, accessories, and vehicle-related store offers.",
  },
  {
    slug: "office-business",
    label: "Office & Business",
    description: "Find office, business, supplies, professional, and work-related coupons and deals.",
    aliases: ["Services"],
  },
];
const ARTICLE_TITLE_PATTERN = /^(why|what|how|when|where|does|do|can|should|is|are)\b|has changed|math explains|actually costs/i;
const PERSON_NAME_TITLE_PATTERN = /^[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+){1,2}$/;
const OFFER_TITLE_PATTERN = /(off|save|deal|coupon|promo|discount|sale|free|sitewide|storewide|entire order|shipping|clearance|gift|buy|%|\$)/i;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function cleanText(value: unknown, maxLength = 180): string {
  const text = String(value ?? "")
    .replace(/High-Fidelty/gi, "High-Fidelity")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength - 3).trim();
  return `${clipped.replace(/\s+\S*$/, "")}...`;
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toHttpsUrl(value: unknown): string {
  const url = String(value ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://")) return `https://${url.slice("http://".length)}`;
  return url;
}

function jsonLdScript(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function upsertHead(html: string, additions: string): string {
  return html.replace("</head>", `${additions}\n  </head>`);
}

function setTitleAndDescription(html: string, title: string, description: string): string {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escapeAttr(description)}">`
    )
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(title)}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(description)}">`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeAttr(title)}">`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeAttr(description)}">`);
}

function setSocialImage(html: string, imageUrl: string, alt: string): string {
  const image = toHttpsUrl(imageUrl) || DEFAULT_SOCIAL_IMAGE;
  return html
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeAttr(image)}">`)
    .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeAttr(image)}">`)
    .replace(/<meta property="og:image:alt"[^>]*>/, `<meta property="og:image:alt" content="${escapeAttr(alt)}">`);
}

function setOpenGraphType(html: string, type: "website" | "article"): string {
  return html.replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${type}" />`);
}

function footerHtml(): string {
  const year = new Date().getFullYear();
  return `
      <footer style="padding:24px 20px;text-align:center;color:#71717a;font-size:12px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;background:#0a0a0b">
        <p style="margin:0 0 10px">Copyright ${year} DS Review Hub. All rights reserved.</p>
        <nav>
          <a href="/about" style="color:#71717a;margin-right:12px;text-decoration:none">About</a>
          <a href="/contact" style="color:#71717a;margin-right:12px;text-decoration:none">Contact</a>
          <a href="/privacy" style="color:#71717a;margin-right:12px;text-decoration:none">Privacy</a>
          <a href="/terms" style="color:#71717a;margin-right:12px;text-decoration:none">Terms</a>
          <a href="/disclosure" style="color:#71717a;text-decoration:none">Affiliate Disclosure</a>
        </nav>
      </footer>`;
}

function headerHtml(): string {
  return `
      <header style="padding:16px 20px;background:#0a0a0b;color:#fff;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif">
        <a href="/" style="font-size:22px;font-weight:800;color:#03FF88;text-decoration:none">DS Review Hub</a>
        <nav style="margin-top:8px;font-size:14px">
          <a href="/stores" style="color:#a1a1aa;margin-right:16px;text-decoration:none">All Stores</a>
          <a href="/deals" style="color:#a1a1aa;margin-right:16px;text-decoration:none">Deals</a>
          <a href="/insights" style="color:#a1a1aa;margin-right:16px;text-decoration:none">Insights</a>
          <a href="/about" style="color:#a1a1aa;text-decoration:none">About</a>
        </nav>
      </header>`;
}

interface StaticPageSection {
  heading: string;
  body: string;
  bullets?: string[];
}

interface StaticPageDefinition {
  path: string;
  title: string;
  description: string;
  heading: string;
  lead: string;
  sections: StaticPageSection[];
}

const STATIC_PAGE_DEFINITIONS: StaticPageDefinition[] = [
  {
    path: "about",
    title: "About DS Review Hub - Who We Are",
    description: "Learn about DS Review Hub, a coupon and deal directory that helps shoppers compare listed promo codes and offers from online stores.",
    heading: "About DS Review Hub",
    lead: "DS Review Hub is a coupon and deal discovery platform that helps shoppers compare listed promo codes, no-code deals, and store offers before checkout.",
    sections: [
      {
        heading: "How DS Review Hub Works",
        body: "We organize store pages around current offer records, coupon descriptions, expiration details when available, and links back to the retailer checkout experience.",
        bullets: [
          "Store pages separate coupon codes from no-code deals.",
          "Offers marked verified were manually reviewed before listing.",
          "Retailer checkout pages remain the source of truth for final price, shipping, taxes, and eligibility.",
        ],
      },
      {
        heading: "Our Focus",
        body: "The goal is to make offer research faster without overstating savings. DS Review Hub keeps coupon pages focused on information shoppers can check before placing an order.",
      },
      {
        heading: "How We Make Money",
        body: "DS Review Hub is free for shoppers. We may earn a commission when users click certain affiliate links and make a purchase from a retailer website.",
      },
    ],
  },
  {
    path: "contact",
    title: "Contact Us - DS Review Hub",
    description: "Get in touch with DS Review Hub. Contact us for questions, feedback, partnership inquiries, or to report issues with coupons and deals.",
    heading: "Contact Us",
    lead: "Reach DS Review Hub for general questions, merchant partnerships, and coupon issue reports.",
    sections: [
      {
        heading: "General Inquiries",
        body: "For feedback, support, or general questions, email support@dsreviewhub.com.",
      },
      {
        heading: "Business and Partnerships",
        body: "For affiliate partnerships, advertising, or merchant collaboration questions, email partners@dsreviewhub.com.",
      },
      {
        heading: "Report a Coupon Issue",
        body: "If a listed code appears expired, restricted, or broken at checkout, send the store name, offer title, and checkout details to support@dsreviewhub.com.",
      },
    ],
  },
  {
    path: "why-different",
    title: "Why DS Review Hub Is Different",
    description: "See how DS Review Hub organizes coupon codes, deals, verification labels, and affiliate transparency for shoppers.",
    heading: "Why DS Review Hub is different",
    lead: "DS Review Hub keeps store pages focused on crawlable, shopper-friendly offer details instead of unsupported savings claims.",
    sections: [
      {
        heading: "Codes and deals are separated clearly",
        body: "A store page can include coupon codes, no-code deals, sale links, expiration dates, and descriptions so shoppers can compare offers quickly.",
      },
      {
        heading: "Verified means manually reviewed",
        body: "Offers are shown as verified when DS Review Hub has manually reviewed the coupon before listing it. Availability can still change at checkout.",
      },
      {
        heading: "Affiliate links are disclosed",
        body: "DS Review Hub may earn a commission from certain outbound retailer links, and the disclosure page explains that relationship clearly.",
      },
    ],
  },
  {
    path: "learn",
    title: "Learn How DS Review Hub Works",
    description: "Learn how to search stores, compare listed offers, use coupon codes, and confirm discounts before checkout.",
    heading: "DS Review Hub Academy: How it all works",
    lead: "Use these quick lessons to search stores, compare listed offers, and confirm discounts on the retailer checkout page.",
    sections: [
      {
        heading: "Search a store",
        body: "Start with the store directory or search bar, then open the matching store page to review current coupon codes and deals.",
      },
      {
        heading: "Use a coupon code",
        body: "Copy the listed code, open the retailer page, paste the code at checkout, and confirm the final discount before ordering.",
      },
      {
        heading: "Use a no-code deal",
        body: "Open the listed deal link and check whether the discount applies automatically on the retailer site.",
      },
    ],
  },
  {
    path: "privacy",
    title: "Privacy Policy - DS Review Hub",
    description: "DS Review Hub Privacy Policy. Learn how we collect, use, and protect your data.",
    heading: "Privacy Policy",
    lead: "This policy explains how DS Review Hub handles information related to site usage, analytics, communications, and third-party retailer links.",
    sections: [
      {
        heading: "Information We Collect",
        body: "We may collect information users provide directly, such as contact messages, and basic usage data such as pages viewed, referring URLs, browser type, and analytics events.",
      },
      {
        heading: "How We Use Information",
        body: "We use information to operate the site, improve coupon and deal pages, respond to messages, analyze traffic, and maintain platform security.",
      },
      {
        heading: "Third-Party Links",
        body: "DS Review Hub links to retailer websites and affiliate partners. Those external sites control their own privacy policies, checkout process, and data handling.",
      },
    ],
  },
  {
    path: "terms",
    title: "Terms of Service - DS Review Hub",
    description: "DS Review Hub Terms of Service. Read our terms and conditions for using the platform.",
    heading: "Terms of Service",
    lead: "These terms explain the basic rules for using DS Review Hub and reviewing listed coupon codes, deals, and retailer links.",
    sections: [
      {
        heading: "Service Description",
        body: "DS Review Hub is a coupon and deal discovery platform. We list offers from online retailers, but we do not sell products directly.",
      },
      {
        heading: "Offer Accuracy",
        body: "Coupon codes and deals can expire, change, or become restricted by the retailer. Shoppers should confirm the final discount and terms at checkout.",
      },
      {
        heading: "Third-Party Retailers",
        body: "Retailer websites control their own products, pricing, shipping, returns, taxes, checkout terms, and customer service.",
      },
    ],
  },
  {
    path: "disclosure",
    title: "Affiliate Disclosure - DS Review Hub",
    description: "DS Review Hub affiliate disclosure. Learn how we earn revenue through affiliate partnerships while providing free coupons and deals.",
    heading: "Affiliate Disclosure",
    lead: "DS Review Hub is free for shoppers and may earn commissions from certain outbound retailer links.",
    sections: [
      {
        heading: "How DS Review Hub Makes Money",
        body: "We participate in affiliate marketing programs. When shoppers click certain links and make a purchase, DS Review Hub may earn a commission from the retailer or network.",
      },
      {
        heading: "What This Means for Shoppers",
        body: "Affiliate links do not add a direct fee from DS Review Hub. The retailer checkout page controls the final price, taxes, shipping, and offer eligibility.",
      },
      {
        heading: "Our Transparency Commitment",
        body: "We aim to keep offer descriptions clear, label verified offers when manually reviewed, and avoid unsupported claims about guaranteed savings.",
      },
    ],
  },
];

function staticPageHtml(template: string, page: StaticPageDefinition): string {
  const canonical = `${DOMAIN}/${page.path}`;
  const sectionHtml = page.sections
    .map((section) => {
      const bullets = section.bullets?.length
        ? `<ul style="color:#a1a1aa;font-size:14px;line-height:1.75;margin:10px 0 0;padding-left:20px">${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : "";
      return `<section style="padding-top:22px;margin-top:22px;border-top:1px solid #27272a">
          <h2 style="font-size:22px;font-weight:900;margin:0 0 8px">${escapeHtml(section.heading)}</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0">${escapeHtml(section.body)}</p>
          ${bullets}
        </section>`;
    })
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": canonical,
        url: canonical,
        name: page.title,
        description: page.description,
        isPartOf: { "@type": "WebSite", name: "DS Review Hub", url: DOMAIN },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN },
          { "@type": "ListItem", position: 2, name: page.heading, item: canonical },
        ],
      },
    ],
  };

  const seoContent = `
      ${headerHtml()}
      <main style="max-width:860px;margin:0 auto;padding:40px 20px 48px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <nav style="font-size:13px;color:#a1a1aa;margin-bottom:22px">
          <a href="/" style="color:#a1a1aa;text-decoration:none">Home</a> / <span style="color:#fff;font-weight:600">${escapeHtml(page.heading)}</span>
        </nav>
        <h1 style="font-size:38px;line-height:1.1;font-weight:900;margin:0 0 12px">${escapeHtml(page.heading)}</h1>
        <p style="color:#d4d4d8;font-size:17px;line-height:1.65;margin:0 0 8px">${escapeHtml(page.lead)}</p>
        ${sectionHtml}
      </main>
      ${footerHtml()}
      ${jsonLdScript(jsonLd)}`;

  let pageHtml = template.replace('<div id="root"></div>', `<div id="root">${seoContent}</div>`);
  pageHtml = setOpenGraphType(setTitleAndDescription(pageHtml, page.title, page.description), "website");
  return upsertHead(
    pageHtml,
    `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta property="og:url" content="${canonical}" />
  <link rel="canonical" href="${canonical}" />`
  );
}

interface StoreCoupon {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  discount_value: string | null;
  is_active: boolean;
  is_verified?: boolean | null;
  expiry_date?: string | null;
  url?: string | null;
}

interface StoreData {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  category: string | null;
  use_code_tips?: unknown;
  updated_at?: string | null;
  coupons: StoreCoupon[];
}

interface StoreUseCodeTip {
  code?: string;
  affiliate_url?: string;
  image_url?: string;
  preview_image_url?: string;
  thumbnail_url?: string;
  caption?: string;
}

interface DealData {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  original_price: number | null;
  deal_price: number | null;
  expiry_date: string | null;
  is_active: boolean;
  stores?: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
  } | null;
}

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  hero_image_alt?: string | null;
  category: string | null;
  tags: string[] | null;
  faqs?: unknown;
  sources?: unknown;
  author_name?: string | null;
  reviewed_at?: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StoreReviewData {
  id: string;
  store_id: string;
  title: string;
  h1: string | null;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  dek: string | null;
  summary: string;
  verdict: string | null;
  best_for: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  content_sections: unknown;
  faqs: unknown;
  primary_coupon_id: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  sources: unknown;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  content_type?: string | null;
}

interface StoreSavingsGuideData {
  id: string;
  store_id: string;
  priority: string | null;
  shipping_note: string | null;
  return_note: string | null;
  stacking_note: string | null;
  sale_item_note: string | null;
  reference_urls: unknown;
  status: string;
  updated_at: string;
}

function objectArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === "object") as T[]) : [];
}

function storeUseCodeTips(store: StoreData): StoreUseCodeTip[] {
  return objectArray<StoreUseCodeTip>(store.use_code_tips)
    .filter((tip) => typeof tip.image_url === "string" && tip.image_url.trim());
}

function activeCoupons(store: StoreData): StoreCoupon[] {
  return (store.coupons || []).filter((coupon) => coupon.is_active && isLikelyCouponOffer(coupon));
}

function categoryLabels(category: CategoryDefinition): string[] {
  return [category.label, ...(category.aliases || [])].map((label) => label.toLowerCase());
}

function storesForCategory(stores: StoreData[], category: CategoryDefinition): StoreData[] {
  const labels = new Set(categoryLabels(category));
  return stores
    .filter((store) => store.slug && labels.has(String(store.category || "").toLowerCase()))
    .sort((a, b) => activeCoupons(b).length - activeCoupons(a).length || a.name.localeCompare(b.name));
}

function hasUsableCode(coupon: StoreCoupon): boolean {
  return Boolean(coupon.code && coupon.code.trim() && coupon.code.toUpperCase() !== "NOCODE");
}

function isLikelyCouponOffer(coupon: StoreCoupon): boolean {
  if (hasUsableCode(coupon)) return true;

  const title = cleanText(coupon.title, 160);
  if (!title) return false;
  if (ARTICLE_TITLE_PATTERN.test(title)) return false;
  if (PERSON_NAME_TITLE_PATTERN.test(title) && !OFFER_TITLE_PATTERN.test(title)) return false;

  return Boolean(coupon.discount_value || OFFER_TITLE_PATTERN.test(title));
}

function isLikelyDeal(deal: DealData): boolean {
  const title = cleanText(deal.title, 160);
  if (!title) return false;
  if (ARTICLE_TITLE_PATTERN.test(title)) return false;
  if (PERSON_NAME_TITLE_PATTERN.test(title) && !OFFER_TITLE_PATTERN.test(title)) return false;
  return Boolean(deal.deal_price != null || deal.original_price != null || OFFER_TITLE_PATTERN.test(title) || deal.description);
}

function couponStats(coupons: StoreCoupon[]) {
  const codes = coupons.filter(hasUsableCode).length;
  const deals = coupons.length - codes;
  const verified = coupons.filter((coupon) => coupon.is_verified).length;
  return { codes, deals, verified };
}

function offerLabel(coupon: StoreCoupon): string {
  const rawLabel = coupon.discount_value || (hasUsableCode(coupon) ? "Promo code" : "Deal");
  return cleanText(rawLabel, 80)
    .replace(/^deal\s+/i, "")
    .replace(/^code\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bestOfferLabel(coupons: StoreCoupon[]): string {
  const labels = coupons.map(offerLabel).filter(Boolean);
  if (labels.length === 0) return "current offers";

  const percentOffers = labels
    .map((label) => ({ label, value: Number(label.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || 0) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  return percentOffers[0]?.label || labels[0];
}

function isStorewideOffer(coupon: StoreCoupon): boolean {
  return /storewide|sitewide|entire order|site-wide|store-wide/i.test(`${coupon.title || ""} ${coupon.description || ""}`);
}

function percentValue(value: unknown): number | null {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeOfferDetails(coupon: StoreCoupon, label: string): string {
  const details = cleanText(coupon.description || coupon.title, 170);
  if (!details) return "";

  const hasCode = hasUsableCode(coupon);
  if (hasCode && /\b(no promo code needed|no code needed|automatically applied|automatic discount|discount applied)\b/i.test(details)) {
    return "";
  }
  if (hasCode && /\b(enter|use|apply|copy)\s+(promo\s+)?code\b/i.test(details)) {
    return "";
  }

  const labelPercent = percentValue(label);
  const detailsPercent = percentValue(details);
  if (labelPercent !== null && detailsPercent !== null && Math.abs(labelPercent - detailsPercent) >= 1) {
    return "";
  }

  return details;
}

function keywordOfferTitle(coupon: StoreCoupon, storeName: string): string {
  const label = offerLabel(coupon);
  const rawTitle = cleanText(coupon.title, 90);
  const isCode = hasUsableCode(coupon);
  const typeText = isCode ? "Promo Code" : "Deal";
  const scopeText = isStorewideOffer(coupon) ? "Storewide " : "";

  if (rawTitle && !/^(sitewide|storewide|entire order|coupon|deal)$/i.test(rawTitle)) {
    if (rawTitle.toLowerCase().includes(storeName.toLowerCase())) {
      return `${rawTitle} ${typeText}`;
    }
    return `${label} ${storeName} ${typeText} for ${rawTitle}`;
  }

  return `${label} ${storeName} ${scopeText}${typeText}`.replace(/\s+/g, " ").trim();
}

function keywordOfferDescription(coupon: StoreCoupon, storeName: string): string {
  const label = offerLabel(coupon);
  const details = safeOfferDetails(coupon, label);

  if (hasUsableCode(coupon)) {
    const codeText = coupon.code ? ` Enter code ${cleanText(coupon.code, 40)} at checkout.` : "";
    const detailText = details ? ` ${details}` : "";
    return cleanText(
      `Use this ${storeName} promo code to get ${label}.${codeText}${detailText} Copy the ${storeName} coupon code, apply it at checkout, and confirm the final discount before ordering.`,
      280
    );
  }

  const detailText = details ? ` ${details}` : "";
  return cleanText(
    `Open this ${storeName} deal for ${label}.${detailText} No promo code may be needed, but always check ${storeName} checkout terms and exclusions before ordering.`,
    280
  );
}

function publicOfferStatus(coupon: StoreCoupon): string {
  if (coupon.is_verified) return "Manually verified by DS Review Hub";
  return hasUsableCode(coupon) ? "Code available" : "Deal available";
}

function offerListJson(coupons: StoreCoupon[], canonical: string, fallbackUrl?: string, storeName = "") {
  return coupons.slice(0, 20).map((coupon, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: canonical,
    item: {
      "@type": "Offer",
      name: cleanText(storeName ? keywordOfferTitle(coupon, storeName) : coupon.title, 140),
      description: cleanText(storeName ? keywordOfferDescription(coupon, storeName) : coupon.description || coupon.title, 260),
      url: toHttpsUrl(coupon.url) || fallbackUrl || canonical,
      validThrough: coupon.expiry_date || undefined,
      category: hasUsableCode(coupon) ? "Coupon code" : "Deal",
    },
  }));
}

function buildStoreDescription(store: StoreData, stats: { codes: number; deals: number; verified: number }, month: string, bestOffer: string): string {
  const countText = `${stats.codes} coupon code${stats.codes !== 1 ? "s" : ""} and ${stats.deals} deal${stats.deals !== 1 ? "s" : ""}`;
  const verifiedText = stats.verified > 0 ? ` ${stats.verified} manually verified.` : "";
  return cleanText(`Today's ${store.name} promo codes and deals: ${countText}, best discount ${bestOffer}. Updated ${month}.${verifiedText}`, 155);
}

function storeFaqItems(store: StoreData, stats: { codes: number; deals: number; verified: number }, bestOffer: string) {
  return [
    {
      q: `Does ${store.name} offer promo codes?`,
      a: `${store.name} currently has ${stats.codes} coupon code${stats.codes !== 1 ? "s" : ""} and ${stats.deals} deal${stats.deals !== 1 ? "s" : ""} listed on DS Review Hub. These ${store.name} promo codes and deals are shown with checkout notes when available.`,
    },
    {
      q: `How do I use a ${store.name} coupon code?`,
      a: `Choose a listed offer, copy the promo code when one is available, then apply it on the ${store.name} checkout page before completing your order.`,
    },
    {
      q: `Are ${store.name} offers verified?`,
      a: stats.verified > 0
        ? `${stats.verified} ${store.name} offer${stats.verified !== 1 ? "s are" : " is"} marked as manually verified by DS Review Hub. Availability can still change at checkout.`
        : `DS Review Hub lists current ${store.name} offers and recommends confirming the final discount and restrictions at checkout.`,
    },
    {
      q: `Do ${store.name} deals need a promo code?`,
      a: `Some ${store.name} offers require a promo code, while no-code deals may apply after opening the merchant page. Check each offer label before using it.`,
    },
    {
      q: `Why is my ${store.name} promo code not working?`,
      a: `A ${store.name} promo code may stop working if it expired, was entered incorrectly, requires a minimum purchase, or excludes items in your cart. Recheck the ${store.name} coupon terms before checkout.`,
    },
    {
      q: `Can I combine multiple ${store.name} coupon codes?`,
      a: `Most stores only allow one promo code per order. If ${store.name} checkout replaces your first code, compare the available ${store.name} coupon codes and keep the one with the best discount.`,
    },
    {
      q: `What is the best ${store.name} coupon today?`,
      a: `The best listed ${store.name} offer on DS Review Hub is currently ${bestOffer}. Check the current ${store.name} promo code list because discounts can change without notice.`,
    },
    {
      q: `How often are ${store.name} promo codes updated?`,
      a: `DS Review Hub refreshes ${store.name} coupon code and deal listings when new offers are imported or manually reviewed. Always confirm the final ${store.name} discount at checkout.`,
    },
  ];
}

function storeShoppingFaqItems(store: StoreData, bestOffer: string) {
  return [
    {
      q: `Does ${store.name} offer free shipping?`,
      a: `DS Review Hub tracks ${store.name} promo codes and deals, but shipping rules can change by cart value, destination, and product. Check the ${store.name} checkout page for current free shipping terms before ordering.`,
    },
    {
      q: `Does ${store.name} have a student discount?`,
      a: `A dedicated ${store.name} student discount is not confirmed on this DS Review Hub page. Students should compare the listed ${store.name} coupon codes and check whether the merchant has a separate student verification program.`,
    },
    {
      q: `Does ${store.name} offer a military discount?`,
      a: `DS Review Hub does not currently confirm a separate ${store.name} military discount. If available, it is usually handled directly by the merchant, while the listed ${store.name} promo codes may still help shoppers save at checkout.`,
    },
    {
      q: `Does ${store.name} have a first order coupon?`,
      a: `${store.name} may offer welcome discounts, newsletter codes, or first order coupons from time to time. Review the current ${store.name} coupon list and merchant signup forms before checkout.`,
    },
    {
      q: `Can I use a ${store.name} coupon on sale items?`,
      a: `Some ${store.name} coupon codes may exclude sale, clearance, bundle, gift card, or limited-release items. Always check the coupon notes and final ${store.name} checkout total before completing an order.`,
    },
    {
      q: `What payment methods work with ${store.name} deals?`,
      a: `Payment methods are controlled by ${store.name}, not DS Review Hub. Open the merchant checkout page to confirm current card, wallet, buy now pay later, and gift card options before using a ${store.name} discount code.`,
    },
    {
      q: `Can I return an order after using a ${store.name} promo code?`,
      a: `Return eligibility depends on the ${store.name} return policy and the items purchased. A ${store.name} promo code may affect refund value, so review merchant return terms before ordering.`,
    },
    {
      q: `How do I find the latest ${store.name} coupon?`,
      a: `Start with the current ${store.name} coupon codes and deals on DS Review Hub, then confirm the final price on the merchant checkout page. The best listed ${store.name} discount right now is ${bestOffer}.`,
    },
  ];
}

function moneyPageGuideHtml(guide?: MoneyPageGuide): string {
  if (!guide) return "";

  const factItems = guide.facts
    .map(
      (fact) => `<div style="background:#1a1c1e;border:1px solid #3f3f46;border-radius:12px;padding:14px">
        <p style="color:#03FF88;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin:0 0 5px">${escapeHtml(fact.label)}</p>
        <p style="color:#d4d4d8;font-size:13px;line-height:1.55;margin:0">${escapeHtml(fact.value)}</p>
      </div>`
    )
    .join("\n");

  const sections = guide.sections
    .map((section) => {
      const bullets = section.bullets?.length
        ? `<ul style="color:#a1a1aa;font-size:13px;line-height:1.65;margin:12px 0 0;padding-left:20px">
            ${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>`
        : "";

      return `<section style="border-top:1px solid #3f3f46;padding-top:18px;margin-top:18px">
        <h3 style="font-size:18px;font-weight:900;color:#fff;margin:0 0 8px">${escapeHtml(section.heading)}</h3>
        <p style="color:#a1a1aa;font-size:14px;line-height:1.65;margin:0">${escapeHtml(section.body)}</p>
        ${bullets}
      </section>`;
    })
    .join("\n");

  return `<section style="margin-top:28px;padding:20px;background:#272a2e;border:1px solid #3f3f46;border-radius:16px">
    <p style="color:#03FF88;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px">${escapeHtml(guide.eyebrow)}</p>
    <h2 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 8px">${escapeHtml(guide.title)}</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.65;margin:0;max-width:760px">${escapeHtml(guide.intro)}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px">${factItems}</div>
    ${sections}
  </section>`;
}

function categoryPageHtml(template: string, category: CategoryDefinition, stores: StoreData[], deals: DealData[]): string {
  const canonical = `${DOMAIN}/category/${category.slug}`;
  const title = `${category.label} Coupons & Promo Codes - DS Review Hub`;
  const description = `Browse ${category.label} coupons, promo codes, and deals listed on DS Review Hub.`;
  const categoryStores = storesForCategory(stores, category);
  const categoryStoreSlugs = new Set(categoryStores.map((store) => store.slug).filter(Boolean));
  const categoryDeals = deals
    .filter((deal) => deal.is_active && deal.stores?.slug && categoryStoreSlugs.has(deal.stores.slug) && isLikelyDeal(deal))
    .slice(0, 24);
  const totalOffers = categoryStores.reduce((sum, store) => sum + activeCoupons(store).length, 0);
  const robotsContent = categoryStores.length > 0
    ? "index, follow, max-snippet:-1, max-image-preview:large"
    : "noindex, follow";

  const storeItems = categoryStores.slice(0, 80)
    .map((store) => {
      const coupons = activeCoupons(store);
      const stats = couponStats(coupons);
      const bestOffer = bestOfferLabel(coupons);
      return `<li style="padding:12px 0;border-top:1px solid #27272a">
          <a href="/store/${store.slug}" style="color:#03FF88;text-decoration:none;font-weight:800">${escapeHtml(store.name)}</a>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:4px 0 0">${stats.codes} coupon code${stats.codes !== 1 ? "s" : ""}, ${stats.deals} deal${stats.deals !== 1 ? "s" : ""}${coupons.length ? `, best listed offer ${escapeHtml(bestOffer)}` : ""}.</p>
        </li>`;
    })
    .join("\n");

  const dealItems = categoryDeals
    .map((deal) => `<article style="padding:12px 14px;background:#18181b;border:1px solid #27272a;border-radius:10px;margin-bottom:10px">
        <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 6px">${escapeHtml(cleanText(deal.title, 120))}</h3>
        ${deal.stores?.slug ? `<p style="color:#a1a1aa;font-size:13px;margin:0 0 6px"><a href="/store/${deal.stores.slug}" style="color:#a1a1aa;text-decoration:none">${escapeHtml(deal.stores.name)}</a></p>` : ""}
        ${deal.description ? `<p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:0">${escapeHtml(cleanText(deal.description, 170))}</p>` : ""}
      </article>`)
    .join("\n");

  const faqItems = [
    {
      q: `Where can I find ${category.label} coupons on DS Review Hub?`,
      a: `Start with this ${category.label} category page, then open an individual store page to compare current coupon codes, no-code deals, and checkout notes.`,
    },
    {
      q: `Are ${category.label} promo codes always valid?`,
      a: `Coupon availability can change quickly. DS Review Hub lists current offers and marks manually reviewed codes when available, but shoppers should confirm the final discount at checkout.`,
    },
    {
      q: `How do I choose the best ${category.label} deal?`,
      a: `Compare the offer label, code requirements, expiration details, and retailer checkout terms before ordering.`,
    },
  ];

  const faqHtml = faqItems
    .map((faq) => `<div style="padding:13px 0;border-top:1px solid #27272a">
        <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 6px">${escapeHtml(faq.q)}</h3>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0">${escapeHtml(faq.a)}</p>
      </div>`)
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": canonical,
        url: canonical,
        name: title,
        description,
        isPartOf: { "@type": "WebSite", name: "DS Review Hub", url: DOMAIN },
        mainEntity: {
          "@type": "ItemList",
          name: `${category.label} stores`,
          numberOfItems: categoryStores.length,
          itemListElement: categoryStores.slice(0, 60).map((store, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: store.name,
            url: `${DOMAIN}/store/${store.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN },
          { "@type": "ListItem", position: 2, name: "Stores", item: `${DOMAIN}/stores` },
          { "@type": "ListItem", position: 3, name: category.label, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };

  const seoContent = `
      ${headerHtml()}
      <main style="max-width:1100px;margin:0 auto;padding:32px 20px 48px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <nav style="font-size:13px;color:#a1a1aa;margin-bottom:20px">
          <a href="/" style="color:#a1a1aa;text-decoration:none">Home</a> / <a href="/stores" style="color:#a1a1aa;text-decoration:none">Stores</a> / <span style="color:#fff;font-weight:600">${escapeHtml(category.label)}</span>
        </nav>
        <h1 style="font-size:34px;line-height:1.12;font-weight:900;margin:0 0 12px">${escapeHtml(category.label)} Coupons &amp; Promo Codes</h1>
        <p style="color:#d4d4d8;font-size:16px;line-height:1.65;max-width:760px;margin:0 0 10px">${escapeHtml(category.description)}</p>
        <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 28px">${categoryStores.length} ${escapeHtml(category.label)} store${categoryStores.length !== 1 ? "s" : ""} and ${totalOffers} listed offer${totalOffers !== 1 ? "s" : ""} are available in this category.</p>
        <section style="margin-top:26px">
          <h2 style="font-size:22px;font-weight:900;margin:0 0 12px">Top ${escapeHtml(category.label)} stores</h2>
          <ul style="list-style:none;padding:0;margin:0">${storeItems || `<li style="color:#a1a1aa;font-size:14px">No stores are listed in this category yet.</li>`}</ul>
        </section>
        <section style="margin-top:30px;padding-top:22px;border-top:1px solid #27272a">
          <h2 style="font-size:22px;font-weight:900;margin:0 0 12px">Current ${escapeHtml(category.label)} deals</h2>
          ${dealItems || `<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0">No active no-code deals are listed in this category right now. Check individual store pages for current coupon codes.</p>`}
        </section>
        <section style="margin-top:30px;padding-top:22px;border-top:1px solid #27272a">
          <h2 style="font-size:22px;font-weight:900;margin:0 0 8px">${escapeHtml(category.label)} coupon FAQ</h2>
          ${faqHtml}
        </section>
      </main>
      ${footerHtml()}
      ${jsonLdScript(jsonLd)}`;

  let pageHtml = template.replace('<div id="root"></div>', `<div id="root">${seoContent}</div>`);
  pageHtml = setOpenGraphType(setTitleAndDescription(pageHtml, title, description), "website");
  return upsertHead(
    pageHtml,
    `  <meta name="robots" content="${robotsContent}" />
  <meta property="og:url" content="${canonical}" />
  <link rel="canonical" href="${canonical}" />`
  );
}

function postDate(post: BlogPostData): string {
  return post.published_at || post.created_at || new Date().toISOString();
}

function readableDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function blogDescription(post: BlogPostData, maxLength = 170): string {
  return cleanText(post.meta_description || post.excerpt || post.content || post.title, maxLength);
}

function dateOnly(value: unknown, fallback: string): string {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : fallback;
}

function buildSitemapXml(stores: StoreData[], blogPosts: BlogPostData[], storeReviews: StoreReviewData[], today: string): string {
  const reviewLastmodByStoreId = new Map(
    storeReviews.map((review) => [
      review.store_id,
      dateOnly(review.updated_at || review.published_at || review.created_at, today),
    ])
  );

  const urls: string[] = [
    `  <url><loc>${DOMAIN}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${DOMAIN}/stores</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${DOMAIN}/deals</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${DOMAIN}/insights</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    `  <url><loc>${DOMAIN}/about</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    `  <url><loc>${DOMAIN}/contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    `  <url><loc>${DOMAIN}/why-different</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
    `  <url><loc>${DOMAIN}/learn</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
    `  <url><loc>${DOMAIN}/privacy</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`,
    `  <url><loc>${DOMAIN}/terms</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`,
    `  <url><loc>${DOMAIN}/disclosure</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`,
  ];

  for (const category of CATEGORY_DEFINITIONS) {
    if (storesForCategory(stores, category).length === 0) continue;
    urls.push(`  <url><loc>${DOMAIN}/category/${xmlEscape(category.slug)}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
  }

  for (const store of stores) {
    if (!store.slug) continue;
    const storeLastmod = dateOnly(store.updated_at, today);
    const reviewLastmod = reviewLastmodByStoreId.get(store.id);
    const lastmod = reviewLastmod && reviewLastmod > storeLastmod ? reviewLastmod : storeLastmod;
    urls.push(`  <url><loc>${xmlEscape(`${DOMAIN}/store/${store.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`);
  }

  for (const review of storeReviews) {
    if (!review.slug) continue;
    const lastmod = dateOnly(review.updated_at || review.published_at || review.created_at, today);
    urls.push(`  <url><loc>${xmlEscape(`${DOMAIN}/reviews/${review.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
  }

  for (const post of blogPosts) {
    if (!post.slug) continue;
    const lastmod = dateOnly(post.reviewed_at || post.updated_at || post.published_at || post.created_at, today);
    urls.push(`  <url><loc>${xmlEscape(`${DOMAIN}/insights/${post.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/g,
      (_match, label, url) => {
        const externalAttrs = String(url).startsWith("http") ? ` target="_blank" rel="nofollow sponsored noopener"` : "";
        return `<a href="${url}"${externalAttrs} style="color:#03FF88;text-decoration:none;font-weight:700">${label}</a>`;
      }
    )
    .replace(/`([^`]+)`/g, `<code style="font-size:.92em;color:#e5e7eb;background:#27272a;border-radius:4px;padding:1px 4px">$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownBlocksToHtml(markdown: string): string {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p style="color:#cbd5e1;font-size:16px;line-height:1.75;margin:0 0 18px">${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    html.push(`<${listType} style="color:#cbd5e1;font-size:16px;line-height:1.75;margin:0 0 18px;padding-left:22px">${listItems
      .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
      .join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushAll();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const text = renderInlineMarkdown(headingMatch[2]);
      if (level >= 3) {
        html.push(`<h3 style="font-size:20px;font-weight:800;color:#fff;margin:28px 0 10px">${text}</h3>`);
      } else {
        html.push(`<h2 style="font-size:24px;font-weight:900;color:#fff;margin:32px 0 12px">${text}</h2>`);
      }
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const nextType: "ul" | "ol" = unorderedMatch ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unorderedMatch || orderedMatch)![1]);
      continue;
    }

    if (line.startsWith(">")) {
      flushAll();
      html.push(`<blockquote style="color:#d4d4d8;border-left:3px solid #03FF88;margin:0 0 18px;padding:2px 0 2px 14px;font-size:16px;line-height:1.75">${renderInlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushAll();
  return html.join("\n");
}

function markdownToHtml(markdown: string, couponHtmlByKey: Record<string, string> = {}): string {
  return splitBlogContent(markdown)
    .map((part) => {
      if (part.type === "coupon") return couponHtmlByKey[shortcodeKey(part.shortcode)] || "";
      return markdownBlocksToHtml(part.value);
    })
    .join("\n");
}

function blogCouponHtml(shortcode: BlogCouponShortcode, stores: StoreData[]): string {
  const store = stores.find((item) => item.slug === shortcode.storeSlug);
  if (!store?.slug) return "";

  const coupons = activeCoupons(store);
  const requestedCode = String(shortcode.code || "").trim().toUpperCase();
  const coupon = requestedCode
    ? coupons.find((item) => String(item.code || "").trim().toUpperCase() === requestedCode)
    : coupons.find(hasUsableCode) || coupons[0];

  const hasCode = coupon ? hasUsableCode(coupon) : Boolean(shortcode.code);
  const label = coupon ? offerLabel(coupon) : hasCode ? "Promo code" : "Current offers";
  const title = shortcode.label || (coupon ? keywordOfferTitle(coupon, store.name) : `${store.name} coupon codes`);
  const description = coupon
    ? keywordOfferDescription(coupon, store.name)
    : `Browse current ${store.name} coupon codes, promo codes, and deals before checkout.`;
  const offerUrl = toHttpsUrl(coupon?.url) || toHttpsUrl(store.website_url) || `${DOMAIN}/store/${store.slug}`;
  const storeLogo = toHttpsUrl(store.logo_url);
  const status = coupon?.is_verified ? "Verified" : "Listed";

  return `<aside data-blog-coupon-card="true" style="margin:30px 0;border:1px solid #03FF88;border-radius:16px;background:#202327;overflow:hidden">
    <div style="display:flex;gap:14px;align-items:center;padding:16px;flex-wrap:wrap">
      <div style="width:58px;height:58px;border-radius:14px;background:#fff;border:1px solid #3f3f46;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto">
        ${storeLogo ? `<img src="${escapeAttr(storeLogo)}" alt="${escapeAttr(store.name)} logo" width="58" height="58" style="width:100%;height:100%;object-fit:contain" loading="lazy" />` : `<span style="color:#71717a;font-size:20px;font-weight:900">${escapeHtml(store.name.charAt(0))}</span>`}
      </div>
      <div style="min-width:220px;flex:1">
        <p style="color:#fff;font-size:26px;font-weight:900;line-height:1;margin:0 0 8px">${escapeHtml(label)}</p>
        <h3 style="color:#fff;font-size:16px;font-weight:800;line-height:1.35;margin:0 0 6px">${escapeHtml(title)}</h3>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:0">${escapeHtml(description)}</p>
        <p style="color:#03FF88;font-size:12px;font-weight:800;margin:8px 0 0">${escapeHtml(status)} | <a href="/store/${escapeAttr(store.slug)}" style="color:#03FF88;text-decoration:none">See all ${escapeHtml(store.name)} offers</a></p>
      </div>
      <a href="${escapeAttr(offerUrl)}" rel="nofollow sponsored noopener" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;border-radius:12px;background:#03FF88;color:#050505;padding:0 22px;font-size:15px;font-weight:900;text-decoration:none">${hasCode ? "Show Code" : "Get Deal"}</a>
    </div>
    ${hasCode ? `<div style="border-top:1px solid #3f3f46;background:rgba(0,0,0,.2);padding:10px 16px;color:#a1a1aa;font-size:12px">Promo code is available for shoppers who open this offer.</div>` : ""}
  </aside>`;
}

function blogOfferSnapshotHtml(shortcodes: BlogCouponShortcode[], stores: StoreData[]): string {
  const relatedStores = Array.from(new Set(shortcodes.map((shortcode) => shortcode.storeSlug)))
    .map((slug) => stores.find((store) => store.slug === slug))
    .filter((store): store is StoreData => Boolean(store?.slug))
    .slice(0, 4);

  if (!relatedStores.length) return "";

  const rows = relatedStores.map((store) => {
    const coupons = activeCoupons(store);
    const stats = couponStats(coupons);
    const bestOffer = bestOfferLabel(coupons);
    const verifiedText = stats.verified > 0 ? `${stats.verified} verified` : "Availability can change";

    return `<li style="border-top:1px solid #3f3f46;padding:14px 0">
      <a href="/store/${escapeAttr(store.slug)}" style="color:#fff;text-decoration:none;font-size:17px;font-weight:900">${escapeHtml(store.name)}</a>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:6px 0 0">${stats.codes} coupon code${stats.codes !== 1 ? "s" : ""}, ${stats.deals} deal${stats.deals !== 1 ? "s" : ""}, best listed offer: ${escapeHtml(bestOffer)}. ${escapeHtml(verifiedText)}.</p>
    </li>`;
  }).join("\n");

  return `<section style="margin-top:34px;border:1px solid #3f3f46;border-radius:14px;background:#18181b;padding:20px">
    <h2 style="font-size:23px;font-weight:900;color:#fff;margin:0 0 8px">Current DS Review Hub offer snapshot</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.65;margin:0 0 10px">This article is paired with live DS Review Hub store pages so shoppers can compare active coupon codes, no-code deals, and verification notes before checkout.</p>
    <ul style="list-style:none;padding:0;margin:0">${rows}</ul>
  </section>`;
}

function relatedBlogPostsHtml(currentPost: BlogPostData, blogPosts: BlogPostData[]): string {
  const currentTags = new Set([currentPost.category, ...(currentPost.tags || [])].filter(Boolean).map((tag) => String(tag).toLowerCase()));
  const related = blogPosts
    .filter((post) => post.slug !== currentPost.slug)
    .map((post) => {
      const score = [post.category, ...(post.tags || [])].filter(Boolean).reduce((sum, tag) => sum + (currentTags.has(String(tag).toLowerCase()) ? 1 : 0), 0);
      return { post, score };
    })
    .sort((a, b) => b.score - a.score || new Date(postDate(b.post)).getTime() - new Date(postDate(a.post)).getTime())
    .slice(0, 4)
    .map(({ post }) => `<li style="border-top:1px solid #3f3f46;padding:12px 0">
      <a href="/insights/${escapeAttr(post.slug)}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:800">${escapeHtml(post.title)}</a>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:5px 0 0">${escapeHtml(blogDescription(post, 130))}</p>
    </li>`)
    .join("\n");

  if (!related) return "";

  return `<section style="margin-top:30px">
    <h2 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 8px">Related DS Review Hub guides</h2>
    <ul style="list-style:none;padding:0;margin:0">${related}</ul>
  </section>`;
}

async function fetchJson<T>(url: string, supabaseKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export function prerenderPlugin(): Plugin {
  let supabaseUrl = "";
  let supabaseKey = "";
  let outDir = "";

  return {
    name: "vite-prerender-store-pages",
    apply: "build",

    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), "VITE_");
      supabaseUrl = env.VITE_SUPABASE_URL || "";
      supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      outDir = path.resolve(config.root, config.build.outDir);
    },

    async closeBundle() {
      if (!supabaseUrl || !supabaseKey) {
        console.warn("[prerender] Missing Supabase env vars, skipping pre-rendering");
        return;
      }

      const templatePath = path.join(outDir, "index.html");
      if (!fs.existsSync(templatePath)) {
        console.warn("[prerender] dist/index.html not found, skipping");
        return;
      }

      const template = fs.readFileSync(templatePath, "utf-8");
      const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
      const today = new Date().toISOString().split("T")[0];
      const writeRouteHtml = (segments: string[], html: string) => {
        const dir = path.join(outDir, ...segments);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html);

        const htmlFile = path.join(outDir, ...segments) + ".html";
        fs.mkdirSync(path.dirname(htmlFile), { recursive: true });
        fs.writeFileSync(htmlFile, html);
      };

      console.log("[prerender] Fetching public stores and offers...");

      let stores: StoreData[] = [];
      let deals: DealData[] = [];
      let blogPosts: BlogPostData[] = [];
      let storeReviews: StoreReviewData[] = [];
      let storeSavingsGuides: StoreSavingsGuideData[] = [];
      try {
        const storeBaseSelect = "id,name,slug,logo_url,description,website_url,category,updated_at,coupons(id,title,description,code,discount_value,is_active,is_verified,expiry_date,url)";
        try {
          stores = await fetchJson<StoreData[]>(
            `${supabaseUrl}/rest/v1/stores?is_active=eq.true&select=${storeBaseSelect},use_code_tips&coupons.is_active=eq.true&order=created_at.desc&limit=2000`,
            supabaseKey
          );
        } catch (err) {
          console.warn(`[prerender] Store code tips column not available yet, falling back to base store fields: ${err}`);
          stores = await fetchJson<StoreData[]>(
            `${supabaseUrl}/rest/v1/stores?is_active=eq.true&select=${storeBaseSelect}&coupons.is_active=eq.true&order=created_at.desc&limit=2000`,
            supabaseKey
          );
        }
        deals = await fetchJson<DealData[]>(
          `${supabaseUrl}/rest/v1/deals?is_active=eq.true&select=id,title,description,url,image_url,original_price,deal_price,expiry_date,is_active,stores(id,name,slug,logo_url)&order=created_at.desc&limit=500`,
          supabaseKey
        );
      } catch (err) {
        console.warn(`[prerender] Failed to fetch Supabase content: ${err}`);
        return;
      }

      try {
        const blogBaseSelect = "id,title,slug,excerpt,content,image_url,category,tags,is_published,published_at,created_at,updated_at";
        const blogExtendedSelect = `${blogBaseSelect},meta_title,meta_description,hero_image_alt,faqs,sources,author_name,reviewed_at,content_type`;
        blogPosts = await fetchJson<BlogPostData[]>(
          `${supabaseUrl}/rest/v1/blog_posts?is_published=eq.true&select=${blogExtendedSelect}&order=published_at.desc&limit=200`,
          supabaseKey
        );
        if (!Array.isArray(blogPosts)) blogPosts = [];
      } catch (err) {
        console.warn(`[prerender] Blog SEO columns not available yet, falling back to base blog fields: ${err}`);
        try {
          blogPosts = await fetchJson<BlogPostData[]>(
            `${supabaseUrl}/rest/v1/blog_posts?is_published=eq.true&select=id,title,slug,excerpt,content,image_url,category,tags,is_published,published_at,created_at,updated_at&order=published_at.desc&limit=200`,
            supabaseKey
          );
        } catch (fallbackErr) {
          console.warn(`[prerender] Could not fetch blog posts, continuing without blog articles: ${fallbackErr}`);
          blogPosts = [];
        }
      }

      try {
        blogPosts = blogPosts
          .filter((post) => post.slug && post.title && (post.content_type === "insight" || post.tags?.includes("DS Insight")))
          .sort((a, b) => new Date(postDate(b)).getTime() - new Date(postDate(a)).getTime());
      } catch (err) {
        console.warn(`[prerender] Could not sort blog posts, continuing without blog articles: ${err}`);
        blogPosts = [];
      }

      try {
        storeReviews = await fetchJson<StoreReviewData[]>(
          `${supabaseUrl}/rest/v1/store_reviews?status=eq.published&select=id,store_id,title,h1,slug,meta_title,meta_description,dek,summary,verdict,best_for,pros,cons,content_sections,faqs,primary_coupon_id,hero_image_url,hero_image_alt,sources,status,published_at,created_at,updated_at&limit=2000`,
          supabaseKey
        );
      } catch (err) {
        console.warn(`[prerender] Could not fetch store reviews, continuing without review modules: ${err}`);
      }

      try {
        storeSavingsGuides = await fetchJson<StoreSavingsGuideData[]>(
          `${supabaseUrl}/rest/v1/store_savings_guides?status=eq.published&select=id,store_id,priority,shipping_note,return_note,stacking_note,sale_item_note,reference_urls,status,updated_at&limit=2000`,
          supabaseKey
        );
      } catch (err) {
        console.warn(`[prerender] Could not fetch store savings guides, using generated default guides: ${err}`);
      }

      const reviewByStoreId = new Map(storeReviews.map((review) => [review.store_id, review]));
      const storeById = new Map(stores.map((store) => [store.id, store]));
      const savingsGuideByStoreId = new Map(storeSavingsGuides.map((guide) => [guide.store_id, guide]));

      console.log(`[prerender] Found ${stores.length} stores, ${deals.length} deals, ${blogPosts.length} blog posts, ${storeReviews.length} store reviews, and ${storeSavingsGuides.length} store savings guides`);

      let generatedStoreCount = 0;
      let generatedReviewCount = 0;

      for (const store of stores) {
        if (!store.slug) continue;

        const coupons = activeCoupons(store);
        const stats = couponStats(coupons);
        const bestOffer = bestOfferLabel(coupons);
        const storeReview = reviewByStoreId.get(store.id);
        const storeSavingsGuide = savingsGuideByStoreId.get(store.id);
        const storeName = escapeHtml(store.name);
        const defaultTitle = `Today's ${store.name} Promo Codes & Deals - ${bestOffer} (${coupons.length} Offers) ${month} - DS Review Hub`;
        const title = defaultTitle;
        const canonical = `${DOMAIN}/store/${store.slug}`;
        const websiteUrl = toHttpsUrl(store.website_url);
        const storeImage = toHttpsUrl(store.logo_url);
        const reviewImage = toHttpsUrl(storeReview?.hero_image_url);
        const socialImage = storeImage || DEFAULT_SOCIAL_IMAGE;
        const defaultDesc = buildStoreDescription(store, stats, month, bestOffer);
        const desc = defaultDesc;
        const aboutText = cleanText(
          store.description ||
            `${store.name} is listed on DS Review Hub with current coupon codes, no-code deals, and offer details for shoppers to review before checkout.`,
          520
        );
        const moneyPageGuide = moneyPageGuideForStore({
          slug: store.slug,
          storeName: store.name,
          category: store.category,
          bestOffer,
          couponCodeCount: stats.codes,
          noCodeDealCount: stats.deals,
          verifiedCouponCount: stats.verified,
          customGuide: storeSavingsGuide,
        });
        const baseFaqItems = storeFaqItems(store, stats, bestOffer);
        const faqItems = moneyPageGuide
          ? baseFaqItems.filter((faq) => !faq.q.startsWith(`Can I combine multiple ${store.name}`))
          : baseFaqItems;
        const moneyPageGuideFaqItems = (moneyPageGuide?.faqs || []).map((faq) => ({
          q: cleanText(faq.question, 180),
          a: cleanText(faq.answer, 700),
        }));
        const shoppingFaqItems = moneyPageGuide ? moneyPageGuideFaqItems : storeShoppingFaqItems(store, bestOffer);
        const reviewFaqItems = objectArray<{ question?: string; answer?: string }>(storeReview?.faqs)
          .map((faq) => ({ q: cleanText(faq.question, 180), a: cleanText(faq.answer, 600) }))
          .filter((faq) => faq.q && faq.a);
        const allFaqItems = [...faqItems, ...shoppingFaqItems, ...reviewFaqItems];
        const countText = `${stats.codes} coupon code${stats.codes !== 1 ? "s" : ""} and ${stats.deals} deal${stats.deals !== 1 ? "s" : ""}`;
        const useCodeTips = storeUseCodeTips(store);

        const codeCoupons = coupons.filter(hasUsableCode);
        const dealCoupons = coupons.filter((coupon) => !hasUsableCode(coupon));
        const offerArticlesHtml = (offerList: StoreCoupon[]) =>
          offerList
            .map((coupon) => {
                  const label = escapeHtml(offerLabel(coupon));
                  const couponTitle = escapeHtml(keywordOfferTitle(coupon, store.name));
                  const details = keywordOfferDescription(coupon, store.name);
                  const status = publicOfferStatus(coupon);
                  const expiry = coupon.expiry_date ? ` Expires ${escapeHtml(coupon.expiry_date.split("T")[0])}.` : "";
                  const offerUrl = toHttpsUrl(coupon.url) || websiteUrl || canonical;
                  const offerType = hasUsableCode(coupon) ? "Coupon code" : "No-code deal";
                  const appliesText = isStorewideOffer(coupon)
                    ? `Applies to ${store.name} storewide or entire-order purchases when checkout terms allow.`
                    : `Applies to eligible ${store.name} items or checkout terms shown by the merchant.`;
                  const howThisWorks = hasUsableCode(coupon)
                    ? `Copy this ${store.name} promo code, open ${store.name}, paste the coupon code at checkout, and confirm the final discount.`
                    : `Open this ${store.name} deal and confirm whether the discount applies automatically at checkout.`;
                  return `<article style="padding:14px 16px;background:#272a2e;border-radius:12px;margin-bottom:8px">
                  <p style="color:#fff;font-size:20px;font-weight:900;margin:0">${label}</p>
                  <h3 style="color:#e4e4e7;font-size:15px;margin:6px 0 0;font-weight:700">${couponTitle}</h3>
                  ${details ? `<p style="color:#a1a1aa;font-size:13px;margin:6px 0 0;line-height:1.5">${escapeHtml(details)}${expiry}</p>` : ""}
                  <p style="margin:6px 0 0"><span style="color:#03FF88;font-size:12px;font-weight:700">${escapeHtml(status)}</span></p>
                  <p style="color:#a1a1aa;font-size:12px;margin:4px 0 0">Offer type: ${offerType}. ${escapeHtml(appliesText)}</p>
                  <ul style="color:#a1a1aa;font-size:12px;line-height:1.55;margin:6px 0 0;padding-left:18px">
                    <li>${escapeHtml(store.name)} discount: ${label}</li>
                    <li>Checkout note: confirm exclusions and final price at ${escapeHtml(store.name)}.</li>
                  </ul>
                  <p style="color:#a1a1aa;font-size:12px;margin:6px 0 0;line-height:1.55"><strong style="color:#e4e4e7">How this works:</strong> ${escapeHtml(howThisWorks)}</p>
                  <a href="${escapeAttr(offerUrl)}" style="color:#03FF88;font-size:12px;font-weight:700;text-decoration:none" rel="nofollow sponsored noopener">Open offer</a>
                </article>`;
              })
              .join("\n");

        const codeCouponHtml =
          codeCoupons.length > 0
            ? offerArticlesHtml(codeCoupons)
            : '<p style="color:#a1a1aa;font-size:14px">No active promo codes are listed at the moment. Check the deals below or come back soon.</p>';

        const dealCouponHtml =
          dealCoupons.length > 0
            ? offerArticlesHtml(dealCoupons)
            : `<p style="color:#a1a1aa;font-size:14px">No no-code deals are listed for ${storeName} right now.</p>`;

        const useCodeTipsHtml =
          useCodeTips.length > 0
            ? `<section style="margin-top:28px;padding-top:20px;border-top:1px solid #3f3f46">
              <p style="color:#03FF88;font-size:12px;font-weight:800;text-transform:uppercase;margin:0 0 6px">Use Code Tips</p>
              <h2 style="font-size:20px;font-weight:800;margin:0 0 8px">Checkout tips for ${storeName}</h2>
              <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 12px">See exactly where to apply a promo code before placing your order.</p>
              <div>
                ${useCodeTips.map((tip, index) => {
                  const imageUrl = toHttpsUrl(tip.image_url);
                  const previewImageUrl = toHttpsUrl(tip.preview_image_url) || toHttpsUrl(tip.thumbnail_url) || imageUrl;
                  const affiliateUrl = toHttpsUrl(tip.affiliate_url) || imageUrl;
                  const code = cleanText(tip.code, 50);
                  const caption = cleanText(tip.caption || `Locate the promo code box at ${store.name}`, 160);
                  return `<a href="${escapeAttr(affiliateUrl)}" rel="nofollow sponsored noopener" style="display:block;overflow:hidden;color:#fff;text-decoration:none;background:#171819;border:1px solid #3f3f46;border-radius:12px${index > 0 ? ";margin-top:16px" : ""}">
                    <span style="display:block;padding:14px 16px">
                      <span style="display:block;color:#03FF88;font-size:11px;font-weight:800;text-transform:uppercase">&#10003; Checkout tip</span>
                      <span style="display:block;margin-top:6px;color:#e4e4e7;font-size:19px;font-weight:800;line-height:1.35">${escapeHtml(caption)}</span>
                      <span style="display:block;margin-top:5px;color:#a1a1aa;font-size:13px;line-height:1.55">Open the checkout screenshot to see exactly where to enter the promo code.</span>
                      ${code ? `<span style="display:inline-block;margin-top:10px;padding:5px 9px;color:#03FF88;font-size:12px;font-weight:800;background:rgba(3,255,136,.1);border:1px solid rgba(3,255,136,.25);border-radius:6px">Recommended code: ${escapeHtml(code)}</span>` : ""}
                    </span>
                    <img src="${escapeAttr(previewImageUrl)}" alt="${escapeAttr(tip.caption || `${store.name} checkout promo code example ${index + 1}`)}" width="900" height="450" style="display:block;width:100%;aspect-ratio:16/8;border-top:1px solid rgba(255,255,255,.1);object-fit:cover;object-position:top;background:#18181b" loading="lazy" />
                  </a>`;
                }).join("\n")}
              </div>
            </section>`
            : "";

        const reviewPrimaryCoupon = storeReview?.primary_coupon_id
          ? coupons.find((coupon) => coupon.id === storeReview.primary_coupon_id) || coupons[0]
          : coupons[0];
        const reviewSectionsHtml = objectArray<{ heading?: string; body?: string; cta_after?: boolean }>(storeReview?.content_sections)
          .map(
            (section) => `<section style="padding:18px 0;border-top:1px solid #3f3f46">
              ${section.heading ? `<h3 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 8px">${escapeHtml(section.heading)}</h3>` : ""}
              ${section.body ? `<p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0">${escapeHtml(section.body)}</p>` : ""}
              ${section.cta_after ? `<p style="margin:12px 0 0"><a href="#coupons" style="color:#03FF88;font-size:13px;font-weight:800;text-decoration:none">See current ${storeName} coupons</a></p>` : ""}
            </section>`
          )
          .join("\n");
        const reviewFaqHtml = reviewFaqItems
          .map(
            (faq) => `<div style="padding:12px 0;border-top:1px solid #3f3f46">
              <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 6px">${escapeHtml(faq.q)}</h3>
              <p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:0">${escapeHtml(faq.a)}</p>
            </div>`
          )
          .join("\n");
        const reviewSourcesHtml = objectArray<{ label?: string; url?: string; note?: string }>(storeReview?.sources)
          .map((source) => {
            const label = escapeHtml(source.label || source.url || "Source");
            const note = source.note ? ` - ${escapeHtml(source.note)}` : "";
            return source.url
              ? `<li><a href="${escapeAttr(source.url)}" style="color:#03FF88;text-decoration:none" rel="nofollow noopener">${label}</a>${note}</li>`
              : `<li>${label}${note}</li>`;
          })
          .join("\n");
        const reviewHtml = storeReview
          ? `<section id="review" style="margin-top:28px;padding:20px;background:#18181b;border:1px solid #27272a;border-radius:12px">
          ${reviewImage ? `<img src="${escapeAttr(reviewImage)}" alt="${escapeAttr(storeReview.hero_image_alt || `${store.name} review`)}" width="960" height="420" style="display:block;width:100%;max-height:420px;object-fit:cover;border-radius:10px;background:#27272a;margin-bottom:18px" loading="lazy" />` : ""}
          <p style="color:#03FF88;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px">DS Review Hub editorial review</p>
          <h2 style="font-size:26px;font-weight:900;color:#fff;line-height:1.18;margin:0 0 10px">${escapeHtml(storeReview.h1 || storeReview.title)}</h2>
          ${storeReview.dek ? `<p style="color:#d4d4d8;font-size:16px;line-height:1.65;margin:0 0 12px">${escapeHtml(storeReview.dek)}</p>` : ""}
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 16px">${escapeHtml(storeReview.summary)}</p>
          ${
            reviewPrimaryCoupon
              ? `<div style="padding:14px 16px;background:#0f172a;border:1px solid #026E37;border-radius:12px;margin:16px 0">
                  <p style="color:#03FF88;font-size:12px;font-weight:800;margin:0 0 4px">Best current offer</p>
                  <h3 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 6px">${escapeHtml(offerLabel(reviewPrimaryCoupon))} at ${storeName}</h3>
                  <p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:0 0 10px">${escapeHtml(reviewPrimaryCoupon.description || reviewPrimaryCoupon.title)}</p>
                  <a href="#coupons" style="display:inline-block;color:#03FF88;font-size:13px;font-weight:800;text-decoration:none">Compare current ${storeName} coupons</a>
                </div>`
              : ""
          }
          ${
            storeReview.best_for?.length
              ? `<h3 style="font-size:15px;font-weight:900;color:#fff;margin:18px 0 8px">Best for</h3><ul style="color:#a1a1aa;font-size:13px;line-height:1.65;margin:0 0 14px;padding-left:20px">${storeReview.best_for.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
              : ""
          }
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:16px 0">
            ${
              storeReview.pros?.length
                ? `<div style="background:#272a2e;border-radius:10px;padding:14px"><h3 style="font-size:15px;font-weight:900;color:#fff;margin:0 0 8px">What works well</h3><ul style="color:#a1a1aa;font-size:13px;line-height:1.65;margin:0;padding-left:18px">${storeReview.pros.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
                : ""
            }
            ${
              storeReview.cons?.length
                ? `<div style="background:#272a2e;border-radius:10px;padding:14px"><h3 style="font-size:15px;font-weight:900;color:#fff;margin:0 0 8px">What to double-check</h3><ul style="color:#a1a1aa;font-size:13px;line-height:1.65;margin:0;padding-left:18px">${storeReview.cons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
                : ""
            }
          </div>
          ${reviewSectionsHtml}
          ${storeReview.verdict ? `<div style="padding:16px;background:#001407;border:1px solid #026E37;border-radius:12px;margin-top:16px"><h3 style="font-size:16px;font-weight:900;color:#fff;margin:0 0 8px">Verdict</h3><p style="color:#d4d4d8;font-size:14px;line-height:1.65;margin:0">${escapeHtml(storeReview.verdict)}</p><p style="margin:12px 0 0"><a href="#coupons" style="color:#03FF88;font-size:13px;font-weight:800;text-decoration:none">Compare ${storeName} coupons</a></p></div>` : ""}
          ${reviewFaqHtml ? `<div style="margin-top:20px"><h3 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 8px">${storeName} review FAQ</h3>${reviewFaqHtml}</div>` : ""}
          ${reviewSourcesHtml ? `<div style="margin-top:20px;border-top:1px solid #3f3f46;padding-top:14px"><h3 style="font-size:13px;font-weight:900;color:#fff;margin:0 0 8px;text-transform:uppercase">Review sources</h3><ul style="color:#a1a1aa;font-size:12px;line-height:1.65;margin:0;padding-left:18px">${reviewSourcesHtml}</ul></div>` : ""}
        </section>`
          : "";

        const faqHtml = faqItems
          .map(
            (faq) => `<div style="padding:14px 0;border-top:1px solid #3f3f46">
              <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 6px">${escapeHtml(faq.q)}</h3>
              <p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:0">${escapeHtml(faq.a)}</p>
            </div>`
          )
          .join("\n");

        const shoppingFaqHtml = shoppingFaqItems
          .map(
            (faq) => `<div style="padding:14px 0;border-top:1px solid #3f3f46">
              <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 6px">${escapeHtml(faq.q)}</h3>
              <p style="color:#a1a1aa;font-size:13px;line-height:1.55;margin:0">${escapeHtml(faq.a)}</p>
            </div>`
          )
          .join("\n");

        const jsonGraph: Record<string, unknown>[] = [
          {
            "@type": "Organization",
            "@id": `${DOMAIN}/#organization`,
            name: "DS Review Hub",
            url: DOMAIN,
            logo: DEFAULT_SOCIAL_IMAGE,
          },
          {
            "@type": "WebSite",
            "@id": `${DOMAIN}/#website`,
            name: "DS Review Hub",
            url: DOMAIN,
            publisher: { "@id": `${DOMAIN}/#organization` },
            potentialAction: {
              "@type": "SearchAction",
              target: `${DOMAIN}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "WebPage",
            "@id": canonical,
            url: canonical,
            name: title,
            description: desc,
            image: socialImage,
            dateModified: storeReview?.updated_at || store.updated_at || today,
            isPartOf: { "@id": `${DOMAIN}/#website` },
            primaryEntity: {
              "@type": "ItemList",
              name: `Today's ${store.name} promo codes and deals`,
              numberOfItems: coupons.length,
              itemListElement: offerListJson(coupons, canonical, websiteUrl || canonical, store.name),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN },
              { "@type": "ListItem", position: 2, name: "Stores", item: `${DOMAIN}/stores` },
              { "@type": "ListItem", position: 3, name: store.name, item: canonical },
            ],
          },
          {
            "@type": "FAQPage",
            mainEntity: allFaqItems.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          },
        ];

        const jsonLd = {
          "@context": "https://schema.org",
          "@graph": jsonGraph,
        };

        const seoContent = `
      ${headerHtml()}
      <main style="max-width:1100px;margin:0 auto;padding:32px 20px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <nav style="font-size:13px;color:#a1a1aa;margin-bottom:20px">
          <a href="/" style="color:#a1a1aa;text-decoration:none">Home</a> / <a href="/stores" style="color:#a1a1aa;text-decoration:none">Stores</a> / <span style="color:#fff;font-weight:600">${storeName}</span>
        </nav>
        ${storeImage ? `<img src="${escapeAttr(storeImage)}" alt="${storeName} logo" width="80" height="80" style="border-radius:50%;background:#fff;margin-bottom:12px" loading="lazy" />` : ""}
        <h1 style="font-size:28px;font-weight:900;margin:0 0 8px">${storeName} Promo Codes, Coupons &amp; Deals ${month}</h1>
        <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">${countText} listed. ${stats.verified > 0 ? `${stats.verified} manually verified by DS Review Hub.` : "Availability can change at checkout."}</p>
        ${store.category ? `<p style="color:#a1a1aa;font-size:13px;margin:0 0 8px">Category: ${escapeHtml(store.category)}</p>` : ""}
        <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;line-height:1.6">${escapeHtml(desc)}</p>
        <section style="margin:24px 0;padding:16px;background:#18181b;border:1px solid #27272a;border-radius:12px">
          <h2 style="font-size:20px;font-weight:800;margin:0 0 10px">${storeName} Savings Intelligence</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0">${storeName} has ${countText} listed for ${month}. The best listed ${storeName} promo code or deal is ${escapeHtml(bestOffer)}. DS Review Hub tracks ${storeName} coupon codes, promo codes, discount codes, and no-code deals so shoppers can compare current ${storeName} offers before checkout.</p>
        </section>
        <h2 id="coupons" style="font-size:20px;font-weight:800;margin:24px 0 12px">Today's ${storeName} promo codes</h2>
        <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 12px">Start with the listed promo codes, then confirm the final discount and restrictions at checkout.</p>
        ${codeCouponHtml}
        ${useCodeTipsHtml}
        <section id="deals" style="margin-top:28px;padding-top:20px;border-top:1px solid #3f3f46">
          <h2 style="font-size:20px;font-weight:800;margin:0 0 10px">More ${storeName} deals</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 12px">Compare no-code deals and product-level offers after checking the available promo codes.</p>
          ${dealCouponHtml}
        </section>
        ${moneyPageGuideHtml(moneyPageGuide)}
        ${reviewHtml}
        <section style="margin-top:28px;padding-top:20px;border-top:1px solid #3f3f46">
          <h2 style="font-size:20px;font-weight:800;margin:0 0 10px">About ${storeName}</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0">${escapeHtml(aboutText)}</p>
        </section>
        <section style="margin-top:24px;padding-top:20px;border-top:1px solid #3f3f46">
          <h2 style="font-size:20px;font-weight:800;margin:0 0 10px">How to use ${storeName} coupons</h2>
          <ol style="color:#a1a1aa;font-size:14px;line-height:1.8;margin:0;padding-left:20px">
            <li>Choose a current ${storeName} coupon code or no-code deal.</li>
            <li>Open the merchant page and copy the code when one is available.</li>
            <li>Apply the promo code at checkout and confirm the final discount.</li>
            <li>Review exclusions, minimum purchase rules, and expiration dates before ordering.</li>
          </ol>
        </section>
        <section style="margin-top:24px;padding-top:20px;border-top:1px solid #3f3f46">
          <h2 style="font-size:20px;font-weight:800;margin:0 0 4px">${storeName} coupon FAQ</h2>
          ${faqHtml}
        </section>
        <section style="margin-top:24px;padding-top:20px;border-top:1px solid #3f3f46">
          <h2 style="font-size:20px;font-weight:800;margin:0 0 4px">${storeName} Discount &amp; Shopping FAQs</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 10px">Use these ${storeName} shopping notes to compare coupon codes, discount codes, shipping terms, return rules, and checkout restrictions before placing an order.</p>
          ${shoppingFaqHtml}
        </section>
        ${websiteUrl ? `<p style="margin-top:24px"><a href="${escapeAttr(websiteUrl)}" style="color:#03FF88;font-weight:700;text-decoration:none" rel="nofollow sponsored noopener">Visit ${storeName}</a></p>` : ""}
      </main>
      ${footerHtml()}
      ${jsonLdScript(jsonLd)}`;

        let pageHtml = setTitleAndDescription(
          template.replace('<div id="root"></div>', `<div id="root">${seoContent}</div>`),
          title,
          desc
        );
        pageHtml = setSocialImage(pageHtml, socialImage, `${store.name} logo`);
        pageHtml = upsertHead(
          pageHtml,
          `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta property="og:image:secure_url" content="${escapeAttr(socialImage)}" />
  <meta property="og:image:alt" content="${escapeAttr(store.name)}" />
  <link rel="canonical" href="${canonical}" />`
        );

        writeRouteHtml(["store", store.slug], pageHtml);
        generatedStoreCount++;
      }

      for (const review of storeReviews) {
        if (!review.slug) continue;
        const store = storeById.get(review.store_id);
        if (!store) continue;

        const canonical = `${DOMAIN}/reviews/${review.slug}`;
        const title = cleanText(review.meta_title || review.title || `${store.name} Review - DS Review Hub`, 70);
        const desc = cleanText(review.meta_description || review.dek || review.summary, 170);
        const headline = cleanText(review.h1 || review.title, 180);
        const heroImage = toHttpsUrl(review.hero_image_url);
        const storeImage = toHttpsUrl(store.logo_url);
        const socialImage = heroImage || storeImage || DEFAULT_SOCIAL_IMAGE;
        const publishedAt = review.published_at || review.created_at;
        const modifiedAt = review.updated_at || publishedAt;
        const sections = objectArray<{ heading?: string; body?: string }>(review.content_sections);
        const faqItems = objectArray<{ question?: string; answer?: string }>(review.faqs)
          .filter((item) => item.question && item.answer);
        const sources = objectArray<{ label?: string; title?: string; publisher?: string; url?: string; note?: string }>(review.sources);
        const sectionsHtml = sections
          .map((section) => `<section style="padding-top:28px;margin-top:28px;border-top:1px solid #27272a">
            ${section.heading ? `<h2 style="font-size:28px;line-height:1.2;font-weight:900;color:#fff;margin:0 0 12px">${escapeHtml(section.heading)}</h2>` : ""}
            ${section.body ? `<p style="color:#a1a1aa;font-size:16px;line-height:1.8;white-space:pre-line;margin:0">${escapeHtml(section.body)}</p>` : ""}
          </section>`)
          .join("\n");
        const faqHtml = faqItems
          .map((faq) => `<div style="padding:16px 0;border-top:1px solid #27272a">
            <h3 style="font-size:16px;font-weight:800;color:#fff;margin:0 0 7px">${escapeHtml(faq.question)}</h3>
            <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0">${escapeHtml(faq.answer)}</p>
          </div>`)
          .join("\n");
        const sourceHtml = sources
          .map((source) => {
            const label = source.label || source.title || source.publisher || source.url || "Source";
            const url = toHttpsUrl(source.url);
            const note = source.note ? ` — ${escapeHtml(source.note)}` : "";
            return url
              ? `<li><a href="${escapeAttr(url)}" style="color:#03FF88;text-decoration:none;font-weight:700" rel="nofollow noopener noreferrer">${escapeHtml(label)}</a>${note}</li>`
              : `<li><strong style="color:#e4e4e7">${escapeHtml(label)}</strong>${note}</li>`;
          })
          .join("\n");
        const jsonLd = {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Review",
              "@id": `${canonical}#review`,
              url: canonical,
              name: review.title,
              headline,
              description: desc,
              reviewBody: review.verdict || review.summary,
              datePublished: publishedAt,
              dateModified: modifiedAt,
              image: socialImage,
              author: { "@type": "Organization", name: "DS Review Hub", url: DOMAIN },
              publisher: { "@type": "Organization", name: "DS Review Hub", url: DOMAIN },
              itemReviewed: { "@type": "Organization", name: store.name, url: toHttpsUrl(store.website_url) || undefined },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN },
                { "@type": "ListItem", position: 2, name: "Reviews", item: `${DOMAIN}/#review-library` },
                { "@type": "ListItem", position: 3, name: store.name, item: canonical },
              ],
            },
            ...(faqItems.length
              ? [{
                  "@type": "FAQPage",
                  mainEntity: faqItems.map((faq) => ({
                    "@type": "Question",
                    name: faq.question,
                    acceptedAnswer: { "@type": "Answer", text: faq.answer },
                  })),
                }]
              : []),
          ],
        };

        const reviewSeo = `
      ${headerHtml()}
      <main style="max-width:1060px;margin:0 auto;padding:40px 20px 56px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <nav style="font-size:13px;color:#a1a1aa;margin-bottom:28px"><a href="/" style="color:#a1a1aa;text-decoration:none">Home</a> / <a href="/#review-library" style="color:#a1a1aa;text-decoration:none">Reviews</a> / <span style="color:#fff;font-weight:700">${escapeHtml(store.name)}</span></nav>
        <article>
          <p style="display:inline-block;color:#03FF88;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin:0 0 18px">DS Review Hub editorial review</p>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
            ${storeImage ? `<img src="${escapeAttr(storeImage)}" alt="${escapeAttr(store.name)} logo" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;padding:7px;border-radius:14px;background:#fff" />` : ""}
            <div><strong style="display:block;color:#fff;font-size:15px">${escapeHtml(store.name)}</strong>${store.category ? `<span style="display:block;color:#71717a;font-size:12px;margin-top:3px">${escapeHtml(store.category)}</span>` : ""}</div>
          </div>
          <h1 style="max-width:880px;font-size:48px;line-height:1.05;font-weight:900;letter-spacing:-.035em;margin:0 0 18px">${escapeHtml(headline)}</h1>
          ${review.dek ? `<p style="max-width:780px;color:#d4d4d8;font-size:20px;line-height:1.65;margin:0 0 14px">${escapeHtml(review.dek)}</p>` : ""}
          <p style="max-width:780px;color:#a1a1aa;font-size:16px;line-height:1.8;margin:0 0 12px">${escapeHtml(review.summary)}</p>
          <p style="color:#71717a;font-size:12px;margin:0 0 28px">Updated ${escapeHtml(readableDate(modifiedAt))}</p>
          ${heroImage ? `<img src="${escapeAttr(heroImage)}" alt="${escapeAttr(review.hero_image_alt || `${store.name} review`)}" width="1020" height="574" style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:18px;background:#18181b;margin:0 0 30px" loading="eager" />` : ""}
          ${review.best_for?.length ? `<section style="padding:20px;background:#0d2117;border:1px solid #14532d;border-radius:14px;margin-bottom:26px"><h2 style="font-size:15px;font-weight:900;color:#03FF88;margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em">Best for</h2><ul style="color:#d4d4d8;font-size:14px;line-height:1.7;margin:0;padding-left:20px">${review.best_for.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:0 0 30px">
            ${review.pros?.length ? `<section style="padding:20px;background:#18181b;border:1px solid #27272a;border-radius:14px"><h2 style="font-size:19px;font-weight:900;color:#fff;margin:0 0 12px">What works well</h2><ul style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0;padding-left:20px">${review.pros.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
            ${review.cons?.length ? `<section style="padding:20px;background:#18181b;border:1px solid #27272a;border-radius:14px"><h2 style="font-size:19px;font-weight:900;color:#fff;margin:0 0 12px">What to double-check</h2><ul style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0;padding-left:20px">${review.cons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
          </div>
          ${sectionsHtml}
          ${review.verdict ? `<section style="padding:24px;background:#0d2117;border:1px solid #14532d;border-radius:16px;margin-top:32px"><p style="color:#03FF88;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px">Final verdict</p><h2 style="font-size:28px;font-weight:900;color:#fff;margin:0 0 12px">Our take on ${escapeHtml(store.name)}</h2><p style="color:#d4d4d8;font-size:16px;line-height:1.8;white-space:pre-line;margin:0">${escapeHtml(review.verdict)}</p></section>` : ""}
          ${faqHtml ? `<section style="padding-top:30px;margin-top:30px;border-top:1px solid #27272a"><h2 style="font-size:28px;font-weight:900;color:#fff;margin:0 0 14px">${escapeHtml(store.name)} review FAQ</h2>${faqHtml}</section>` : ""}
          ${sourceHtml ? `<section style="padding-top:24px;margin-top:30px;border-top:1px solid #27272a"><h2 style="font-size:14px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px">Sources and references</h2><ul style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0;padding-left:20px">${sourceHtml}</ul></section>` : ""}
          ${store.slug ? `<aside style="padding:20px;background:#18181b;border:1px solid #27272a;border-radius:14px;margin-top:34px"><strong style="display:block;color:#fff;font-size:18px;margin-bottom:7px">Editorial first</strong><p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 12px">Current offers live separately so commercial details do not replace the editorial verdict.</p><a href="/store/${escapeAttr(store.slug)}" style="color:#03FF88;font-size:14px;font-weight:800;text-decoration:none">See current offers →</a></aside>` : ""}
        </article>
      </main>
      ${footerHtml()}
      ${jsonLdScript(jsonLd)}`;

        let reviewPageOut = template.replace('<div id="root"></div>', `<div id="root">${reviewSeo}</div>`);
        reviewPageOut = setOpenGraphType(setSocialImage(setTitleAndDescription(reviewPageOut, title, desc), socialImage, review.hero_image_alt || `${store.name} review`), "article");
        reviewPageOut = upsertHead(
          reviewPageOut,
          `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta property="article:published_time" content="${escapeAttr(publishedAt)}" />
  <meta property="article:modified_time" content="${escapeAttr(modifiedAt)}" />
  <meta property="og:url" content="${escapeAttr(canonical)}" />
  <link rel="canonical" href="${canonical}" />`
        );
        writeRouteHtml(["reviews", review.slug], reviewPageOut);
        generatedReviewCount++;
      }

      const homepageReviews = storeReviews
        .filter((review) => review.slug && storeById.has(review.store_id))
        .slice(0, 40);
      const homeReviewLinks = homepageReviews
        .map((review) => {
          const store = storeById.get(review.store_id)!;
          return `<li style="margin-bottom:4px"><a href="/reviews/${review.slug}" style="color:#03FF88;text-decoration:none;font-weight:600">${escapeHtml(review.title || `${store.name} Review`)}</a> - ${escapeHtml(cleanText(review.summary, 150))}</li>`;
        })
        .join("\n");

      const homeTitle = "DS Review Hub - Brand Reviews for Smarter Shopping";
      const homeDesc = "Research online brands before you buy. Read practical reviews covering quality, value, shipping, returns, customer experience, and current offers.";
      const homeJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "DS Review Hub",
            url: DOMAIN,
          },
          {
            "@type": "WebSite",
            name: "DS Review Hub",
            url: DOMAIN,
            potentialAction: {
              "@type": "SearchAction",
              target: `${DOMAIN}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "ItemList",
            name: "Brand reviews",
            itemListElement: homepageReviews.map((review, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: review.title,
              url: `${DOMAIN}/reviews/${review.slug}`,
            })),
          },
        ],
      };

      const homeSeo = `
      ${headerHtml()}
      <main style="max-width:1100px;margin:0 auto;padding:40px 20px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <h1 style="font-size:32px;font-weight:900;margin-bottom:12px">Know the brand before you buy</h1>
        <p style="font-size:16px;color:#a1a1aa;max-width:680px;line-height:1.6;margin-bottom:32px">DS Review Hub publishes practical reviews of product quality, value, shipping, returns, and customer experience, with current offers available when readers are ready to shop.</p>
        <h2 style="font-size:22px;font-weight:800;margin-bottom:16px">Explore Brand Reviews</h2>
        ${homeReviewLinks ? `<ul style="list-style:none;padding:0;font-size:14px;line-height:2">${homeReviewLinks}</ul>` : '<p style="color:#a1a1aa;font-size:14px;line-height:1.7">The first independent reviews are being prepared. Store listings are not used as substitutes for published editorial reviews.</p>'}
        <h2 style="font-size:22px;font-weight:800;margin:32px 0 12px">How It Works</h2>
        <ol style="color:#a1a1aa;font-size:14px;line-height:2;padding-left:20px">
          <li>Search for a brand, product category, or service.</li>
          <li>Review the verdict, evidence, benefits, and drawbacks.</li>
          <li>Compare the brand with relevant alternatives.</li>
          <li>Check current pricing, policies, and offers before buying.</li>
        </ol>
      </main>
      ${footerHtml()}
      ${jsonLdScript(homeJsonLd)}`;

      const homeHtml = upsertHead(
        setTitleAndDescription(template.replace('<div id="root"></div>', `<div id="root">${homeSeo}</div>`), homeTitle, homeDesc),
        `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${DOMAIN}/" />`
      );
      fs.writeFileSync(templatePath, homeHtml);

      const allStoresHtml = stores
        .filter((store) => store.slug)
        .map((store) => {
          const coupons = activeCoupons(store);
          const stats = couponStats(coupons);
          return `<li style="margin-bottom:6px"><a href="/store/${store.slug}" style="color:#03FF88;text-decoration:none;font-weight:600">${escapeHtml(store.name)}</a> - ${stats.codes} code${stats.codes !== 1 ? "s" : ""}, ${stats.deals} deal${stats.deals !== 1 ? "s" : ""}</li>`;
        })
        .join("\n");

      const storesPageTitle = "All Stores - DS Review Hub";
      const storesPageDesc = `Browse ${stores.length} online stores with coupon codes and deals at DS Review Hub.`;
      const storesPageSeo = `
      ${headerHtml()}
      <main style="max-width:1100px;margin:0 auto;padding:32px 20px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <h1 style="font-size:28px;font-weight:900;margin-bottom:16px">All Stores</h1>
        <p style="color:#a1a1aa;font-size:14px;margin-bottom:24px">Browse ${stores.length} stores with listed promo codes, coupons, and deals.</p>
        <ul style="list-style:none;padding:0;font-size:14px;line-height:2.2;columns:2">${allStoresHtml}</ul>
      </main>
      ${footerHtml()}`;
      const storesPageOut = upsertHead(
        setTitleAndDescription(template.replace('<div id="root"></div>', `<div id="root">${storesPageSeo}</div>`), storesPageTitle, storesPageDesc),
        `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${DOMAIN}/stores" />`
      );
      writeRouteHtml(["stores"], storesPageOut);

      for (const page of STATIC_PAGE_DEFINITIONS) {
        writeRouteHtml([page.path], staticPageHtml(template, page));
      }

      for (const category of CATEGORY_DEFINITIONS) {
        writeRouteHtml(["category", category.slug], categoryPageHtml(template, category, stores, deals));
      }

      const activeDeals = deals.filter((deal) => deal.is_active && isLikelyDeal(deal)).slice(0, 60);
      const dealItems = activeDeals
        .map((deal) => {
          const store = deal.stores;
          const storeLink = store?.slug ? `<a href="/store/${store.slug}" style="color:#a1a1aa;text-decoration:none">${escapeHtml(store.name)}</a>` : "";
          const price = deal.deal_price != null ? `<strong style="color:#03FF88">${escapeHtml(`$${deal.deal_price}`)}</strong>` : "";
          const original = deal.original_price != null ? `<span style="color:#71717a;text-decoration:line-through;margin-left:6px">$${escapeHtml(deal.original_price)}</span>` : "";
          return `<article style="padding:14px 16px;background:#272a2e;border-radius:12px;margin-bottom:8px">
            <h3 style="color:#fff;font-size:16px;margin:0 0 6px">${escapeHtml(cleanText(deal.title, 120))}</h3>
            ${storeLink ? `<p style="color:#a1a1aa;font-size:13px;margin:0 0 6px">${storeLink}</p>` : ""}
            ${deal.description ? `<p style="color:#a1a1aa;font-size:13px;margin:0 0 6px;line-height:1.5">${escapeHtml(cleanText(deal.description, 180))}</p>` : ""}
            <p style="margin:0">${price}${original}</p>
          </article>`;
        })
        .join("\n");

      const dealsPageTitle = "Deals & Discounts - DS Review Hub";
      const dealsPageDesc = "Browse current no-code deals and product discounts from online stores at DS Review Hub.";
      const dealsPageSeo = `
      ${headerHtml()}
      <main style="max-width:1100px;margin:0 auto;padding:32px 20px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <h1 style="font-size:28px;font-weight:900;margin-bottom:12px">Deals &amp; Discounts</h1>
        <p style="color:#a1a1aa;font-size:14px;margin-bottom:24px">Browse current no-code deals and product discounts from online stores.</p>
        ${dealItems || '<p style="color:#a1a1aa;font-size:14px">No active deals are listed right now.</p>'}
      </main>
      ${footerHtml()}`;
      const dealsJsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Current deals",
        itemListElement: activeDeals.slice(0, 50).map((deal, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${DOMAIN}/deals`,
          item: {
            "@type": "Offer",
            name: deal.title,
            description: cleanText(deal.description || deal.title, 180),
            url: toHttpsUrl(deal.url) || `${DOMAIN}/deals`,
            validThrough: deal.expiry_date || undefined,
          },
        })),
      };
      const dealsPageOut = upsertHead(
        setTitleAndDescription(template.replace('<div id="root"></div>', `<div id="root">${dealsPageSeo}${jsonLdScript(dealsJsonLd)}</div>`), dealsPageTitle, dealsPageDesc),
        `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${DOMAIN}/deals" />`
      );
      writeRouteHtml(["deals"], dealsPageOut);

      const blogPageTitle = "Insights on AI, Technology & Ecommerce - DS Review Hub";
      const blogPageDesc = "Original analysis, practical frameworks, and evidence-led ideas about AI, technology, ecommerce, discovery, and smarter buying decisions.";
      const blogCards = blogPosts
        .slice(0, 60)
        .map((post) => {
          const canonical = `${DOMAIN}/insights/${post.slug}`;
          const image = toHttpsUrl(post.image_url);
          const tags = Array.from(new Set([post.category, ...(post.tags || [])].filter(Boolean))).slice(0, 4);
          const imageAlt = post.hero_image_alt || post.title;
          return `<article style="background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden">
            ${image ? `<a href="/insights/${post.slug}" style="display:block;background:#27272a"><img src="${escapeAttr(image)}" alt="${escapeAttr(imageAlt)}" width="720" height="405" style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover" loading="lazy" /></a>` : ""}
            <div style="padding:18px">
              ${tags.length ? `<p style="color:#03FF88;font-size:12px;font-weight:800;margin:0 0 8px;text-transform:uppercase;letter-spacing:.03em">${tags.map((tag) => escapeHtml(tag)).join(" | ")}</p>` : ""}
              <h2 style="font-size:20px;line-height:1.25;font-weight:900;margin:0 0 8px"><a href="/insights/${post.slug}" style="color:#fff;text-decoration:none">${escapeHtml(post.title)}</a></h2>
              <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 12px">${escapeHtml(blogDescription(post, 190))}</p>
              <p style="color:#71717a;font-size:12px;margin:0">${escapeHtml(readableDate(postDate(post)))}</p>
              <a href="${escapeAttr(canonical)}" style="display:inline-block;color:#03FF88;font-size:13px;font-weight:800;text-decoration:none;margin-top:14px">Read article</a>
            </div>
          </article>`;
        })
        .join("\n");

      const blogJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Blog",
            "@id": `${DOMAIN}/insights#blog`,
            name: "DS Review Hub Insights",
            url: `${DOMAIN}/insights`,
            description: blogPageDesc,
            publisher: { "@type": "Organization", name: "DS Review Hub", url: DOMAIN },
            blogPost: blogPosts.slice(0, 20).map((post) => ({
              "@type": "BlogPosting",
              headline: post.title,
              description: blogDescription(post),
              url: `${DOMAIN}/insights/${post.slug}`,
              datePublished: postDate(post),
              dateModified: post.updated_at,
              image: toHttpsUrl(post.image_url) || undefined,
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN },
              { "@type": "ListItem", position: 2, name: "Insights", item: `${DOMAIN}/insights` },
            ],
          },
        ],
      };

      const blogSeo = `
      ${headerHtml()}
      <main style="max-width:1100px;margin:0 auto;padding:40px 20px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <nav style="font-size:13px;color:#a1a1aa;margin-bottom:20px">
          <a href="/" style="color:#a1a1aa;text-decoration:none">Home</a> / <span style="color:#fff;font-weight:600">Insights</span>
        </nav>
        <h1 style="font-size:36px;line-height:1.1;font-weight:900;margin:0 0 12px">DS Review Hub Insights</h1>
        <p style="color:#a1a1aa;font-size:16px;line-height:1.65;max-width:760px;margin:0 0 28px">${escapeHtml(blogPageDesc)}</p>
        <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px">
          ${blogCards || '<p style="color:#a1a1aa;font-size:14px">The first original insight is being prepared.</p>'}
        </section>
      </main>
      ${footerHtml()}
      ${jsonLdScript(blogJsonLd)}`;

      let blogPageOut = template.replace('<div id="root"></div>', `<div id="root">${blogSeo}</div>`);
      const blogSocialImage = toHttpsUrl(blogPosts[0]?.image_url) || DEFAULT_SOCIAL_IMAGE;
      blogPageOut = setOpenGraphType(setSocialImage(setTitleAndDescription(blogPageOut, blogPageTitle, blogPageDesc), blogSocialImage, "DS Review Hub Insights"), "website");
      blogPageOut = upsertHead(
        blogPageOut,
        `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta property="og:url" content="${DOMAIN}/insights" />
  <link rel="canonical" href="${DOMAIN}/insights" />`
      );
      writeRouteHtml(["insights"], blogPageOut);
      writeRouteHtml(["blog"], blogPageOut);

      for (const post of blogPosts) {
        const canonical = `${DOMAIN}/insights/${post.slug}`;
        const publishedAt = postDate(post);
        const displayDate = readableDate(publishedAt);
        const modifiedAt = post.reviewed_at || post.updated_at || publishedAt;
        const postImage = toHttpsUrl(post.image_url);
        const socialImage = postImage || DEFAULT_SOCIAL_IMAGE;
        const postTitle = cleanText(post.meta_title || `${post.title} - DS Review Hub Insights`, 70);
        const postDesc = blogDescription(post);
        const postImageAlt = post.hero_image_alt || post.title;
        const authorName = cleanText(post.author_name || "DS Review Hub Editorial Team", 90);
        const tags = Array.from(new Set([post.category, ...(post.tags || [])].filter(Boolean))).slice(0, 8);
        const shortcodes = extractCouponShortcodes(post.content);
        const firstRelatedStore = shortcodes
          .map((shortcode) => stores.find((store) => store.slug === shortcode.storeSlug))
          .find((store): store is StoreData => Boolean(store?.slug));
        const firstRelatedCoupons = firstRelatedStore ? activeCoupons(firstRelatedStore) : [];
        const firstRelatedStats = couponStats(firstRelatedCoupons);
        const isInsightPost = post.content_type === "insight" || post.tags?.includes("DS Insight");
        const contentForSeo = isInsightPost ? post.content : ensureBlogContentDepth(post.content, {
          storeName: firstRelatedStore?.name,
          storeSlug: firstRelatedStore?.slug,
          codeCount: firstRelatedStats.codes,
          dealCount: firstRelatedStats.deals,
          bestOffer: firstRelatedCoupons.length ? bestOfferLabel(firstRelatedCoupons) : undefined,
          currentYear: new Date(publishedAt).getFullYear() || new Date().getFullYear(),
        });
        const faqItems = extractBlogFaqItems(contentForSeo, post.faqs, 8);
        const couponHtmlByKey = Object.fromEntries(
          shortcodes.map((shortcode) => [shortcodeKey(shortcode), blogCouponHtml(shortcode, stores)])
        );
        const offerSnapshotHtml = blogOfferSnapshotHtml(shortcodes, stores);
        const relatedPostsHtml = relatedBlogPostsHtml(post, blogPosts);
        const postJsonLd = {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              "@id": canonical,
              mainEntityOfPage: canonical,
              headline: post.title,
              description: postDesc,
              image: socialImage,
              datePublished: publishedAt,
              dateModified: modifiedAt,
              author: { "@type": "Organization", name: authorName, url: DOMAIN },
              publisher: {
                "@type": "Organization",
                name: "DS Review Hub",
                url: DOMAIN,
                logo: { "@type": "ImageObject", url: DEFAULT_SOCIAL_IMAGE },
              },
              articleSection: post.category || undefined,
              keywords: tags.join(", ") || undefined,
              articleBody: cleanBlogText(contentForSeo, 5000),
              wordCount: cleanBlogText(contentForSeo, 20000).split(/\s+/).filter(Boolean).length,
              inLanguage: "en-US",
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN },
                { "@type": "ListItem", position: 2, name: "Insights", item: `${DOMAIN}/insights` },
                { "@type": "ListItem", position: 3, name: post.title, item: canonical },
              ],
            },
            ...(faqItems.length
              ? [{
                  "@type": "FAQPage",
                  mainEntity: faqItems.map((faq) => ({
                    "@type": "Question",
                    name: faq.question,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: faq.answer,
                    },
                  })),
                }]
              : []),
          ],
        };

        const postSeo = `
      ${headerHtml()}
      <main style="max-width:860px;margin:0 auto;padding:32px 20px 48px;font-family:DM Sans,ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0a0a0b">
        <nav style="font-size:13px;color:#a1a1aa;margin-bottom:22px">
          <a href="/" style="color:#a1a1aa;text-decoration:none">Home</a> / <a href="/insights" style="color:#a1a1aa;text-decoration:none">Insights</a> / <span style="color:#fff;font-weight:600">${escapeHtml(cleanText(post.title, 70))}</span>
        </nav>
        ${postImage ? `<img src="${escapeAttr(postImage)}" alt="${escapeAttr(postImageAlt)}" width="860" height="484" style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;background:#18181b;margin-bottom:24px" loading="eager" />` : ""}
        <article>
          ${tags.length ? `<p style="color:#03FF88;font-size:12px;font-weight:800;margin:0 0 10px;text-transform:uppercase;letter-spacing:.03em">${tags.map((tag) => escapeHtml(tag)).join(" | ")}</p>` : ""}
          <h1 style="font-size:40px;line-height:1.08;font-weight:900;margin:0 0 12px">${escapeHtml(post.title)}</h1>
          ${displayDate ? `<p style="color:#71717a;font-size:13px;margin:0 0 22px">By ${escapeHtml(authorName)} | Updated ${escapeHtml(readableDate(modifiedAt) || displayDate)}</p>` : ""}
          ${post.excerpt ? `<p style="color:#d4d4d8;font-size:18px;line-height:1.65;margin:0 0 28px">${escapeHtml(post.excerpt)}</p>` : ""}
          <div style="border-top:1px solid #27272a;padding-top:26px">
            ${markdownToHtml(contentForSeo, couponHtmlByKey)}
          </div>
          ${offerSnapshotHtml}
          ${relatedPostsHtml}
        </article>
      </main>
      ${footerHtml()}
      ${jsonLdScript(postJsonLd)}`;

        let postPageOut = template.replace('<div id="root"></div>', `<div id="root">${postSeo}</div>`);
        postPageOut = setOpenGraphType(setSocialImage(setTitleAndDescription(postPageOut, postTitle, postDesc), socialImage, postImageAlt), "article");
        postPageOut = upsertHead(
          postPageOut,
          `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta property="article:published_time" content="${escapeAttr(publishedAt)}" />
  <meta property="article:modified_time" content="${escapeAttr(modifiedAt)}" />
  <meta property="og:image:secure_url" content="${escapeAttr(socialImage)}" />
  <meta property="og:image:alt" content="${escapeAttr(postImageAlt)}" />
  <meta property="og:url" content="${escapeAttr(canonical)}" />
  <link rel="canonical" href="${canonical}" />`
        );
        writeRouteHtml(["insights", post.slug], postPageOut);
        writeRouteHtml(["blog", post.slug], postPageOut);
      }

      fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemapXml(stores, blogPosts, storeReviews, today));

      console.log(`[prerender] Done. Generated ${generatedStoreCount} store pages, ${generatedReviewCount} review pages, ${CATEGORY_DEFINITIONS.length} category pages, ${STATIC_PAGE_DEFINITIONS.length} static pages, homepage, /stores, /deals, /insights, and ${blogPosts.length} insight posts`);
    },
  };
}
