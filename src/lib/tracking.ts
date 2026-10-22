/**
 * DataLayer event tracking for Google Ads / GTM / GA4
 * All coupon-site conversion events in one place.
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    __DS_GOOGLE_ADS_TAG_IDS?: string[];
    __DS_CONFIGURED_GOOGLE_ADS_TAG_IDS?: string[];
    __DS_COUPON_REVEAL?: {
      coupon?: string;
      path?: string;
      url?: string;
    };
  }
}

type PageType = "home" | "store" | "review" | "category" | "search" | "blog" | "deal" | "other";

interface TrackingParams {
  store_name?: string;
  store_slug?: string;
  coupon_id?: string;
  coupon_code?: string;
  coupon_type?: "code" | "deal" | "sale";
  category?: string;
  position?: number;
  page_type?: PageType;
  deal_id?: string;
  destination_url?: string;
  search_query?: string;
  discount_value?: string;
}

const firedRevealPageViews = new Set<string>();

const ensureGtagQueue = () => {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: any[]) => {
      window.dataLayer.push(args);
    };
  }
};

const push = (event: string, params: TrackingParams) => {
  ensureGtagQueue();
  window.dataLayer.push({ event, ...params });
};

/** User clicks "Copy Code" or "Show Code" button */
export const trackCopyCode = (params: TrackingParams) => {
  const payload = { ...params, coupon_type: "code" as const };
  push("copy_code", payload);
};

/** User clicks "Get Deal" (no code, direct link) */
export const trackCouponClick = (params: TrackingParams) =>
  push("coupon_click", params);

/** User clicks outbound link to merchant site */
export const trackOutboundClick = (params: TrackingParams) =>
  push("outbound_click", params);

/** Coupon code dialog opens (reveal) */
export const trackRevealCode = (params: TrackingParams) => {
  const payload = { ...params, coupon_type: "code" as const };
  const revealKey = payload.coupon_id || `${payload.store_slug || ""}:${payload.coupon_code || ""}`;
  if (revealKey) {
    if (firedRevealPageViews.has(revealKey)) return;
    firedRevealPageViews.add(revealKey);
  }

  push("reveal_code", payload);
};

/** Store page viewed */
export const trackStorePageView = (params: TrackingParams) =>
  push("store_page_view", params);

/** Search performed */
export const trackSearchUsed = (params: TrackingParams) =>
  push("search_used", params);

/** CTA button clicked */
export const trackCtaClick = (params: TrackingParams) =>
  push("cta_click", params);

/** Category page viewed */
export const trackCategoryPageView = (params: TrackingParams) =>
  push("category_page_view", params);
