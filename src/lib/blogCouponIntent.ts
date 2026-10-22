type BlogCouponIntent = {
  source: "blog";
  blogSlug?: string;
  storeName?: string;
  storeSlug?: string;
  couponId?: string;
  couponCode?: string;
  destinationUrl?: string;
  action: "show_code" | "open_deal" | "copy_code";
  createdAt: string;
};

const INTENT_KEY = "ds_blog_coupon_intent";
const HISTORY_KEY = "ds_blog_coupon_history";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const setCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
};

export const recordBlogCouponIntent = (intent: Omit<BlogCouponIntent, "source" | "createdAt">) => {
  if (typeof window === "undefined") return;

  const payload: BlogCouponIntent = {
    source: "blog",
    createdAt: new Date().toISOString(),
    ...intent,
  };

  const compactPayload = {
    source: payload.source,
    blogSlug: payload.blogSlug,
    storeSlug: payload.storeSlug,
    couponId: payload.couponId,
    couponCode: payload.couponCode,
    action: payload.action,
    createdAt: payload.createdAt,
  };

  try {
    window.localStorage.setItem(INTENT_KEY, JSON.stringify(payload));
    const history = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as BlogCouponIntent[];
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify([payload, ...history].slice(0, 20)));
  } catch {
    // Non-critical: tracking storage should never block coupon clicks.
  }

  setCookie("ds_click_source", "blog");
  if (payload.blogSlug) setCookie("ds_blog_slug", payload.blogSlug);
  if (payload.storeSlug) setCookie("ds_last_store", payload.storeSlug);
  if (payload.couponId) setCookie("ds_last_coupon_id", payload.couponId);
  if (payload.couponCode) setCookie("ds_last_coupon_code", payload.couponCode);
  setCookie("ds_blog_coupon_intent", JSON.stringify(compactPayload));
};
