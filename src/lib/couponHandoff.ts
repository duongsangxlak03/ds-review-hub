const HANDOFF_PREFIX = "ds_pending_coupon_";
const HANDOFF_TTL_MS = 15_000;

export type CouponHandoffPageType = "home" | "store" | "blog";

export interface PendingCouponHandoff {
  revealKey: string;
  couponId?: string;
  code: string;
  title: string;
  description?: string | null;
  discountValue?: string | null;
  storeId?: string | null;
  storeName: string;
  storeSlug?: string | null;
  storeLogo?: string | null;
  storeUrl?: string | null;
  destinationUrl?: string | null;
  pageType?: CouponHandoffPageType;
  storeSnapshot?: Record<string, unknown> | null;
  couponsSnapshot?: Record<string, unknown>[];
  createdAt: number;
  expiresAt: number;
}

type PendingCouponHandoffInput = Omit<PendingCouponHandoff, "createdAt" | "expiresAt">;

const handoffKey = (revealKey: string) => `${HANDOFF_PREFIX}${revealKey}`;

export const setPendingCouponHandoff = (coupon: PendingCouponHandoffInput) => {
  if (!coupon.revealKey || !coupon.code || typeof window === "undefined") return false;

  try {
    const now = Date.now();
    const payload: PendingCouponHandoff = {
      ...coupon,
      createdAt: now,
      expiresAt: now + HANDOFF_TTL_MS,
    };
    window.localStorage.setItem(handoffKey(coupon.revealKey), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
};

export const readPendingCouponHandoff = (revealKey?: string | null) => {
  if (!revealKey || typeof window === "undefined") return null;

  try {
    const key = handoffKey(revealKey);
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;

    const payload = JSON.parse(stored) as PendingCouponHandoff;
    if (payload.revealKey !== revealKey || Date.now() > payload.expiresAt) {
      window.localStorage.removeItem(key);
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const clearPendingCouponHandoff = (revealKey?: string | null) => {
  if (!revealKey || typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(handoffKey(revealKey));
  } catch {
    // Non-critical: storage cleanup should never block coupon reveal.
  }
};

export const handoffToCouponRecord = (payload: PendingCouponHandoff) => ({
  id: payload.couponId || payload.revealKey,
  code: payload.code,
  created_at: new Date(payload.createdAt).toISOString(),
  title: payload.title,
  description: payload.description || payload.title,
  discount_type: null,
  discount_value: payload.discountValue,
  expiry_date: null,
  is_active: true,
  is_verified: false,
  sort_order: 0,
  store_id: payload.storeId || "",
  updated_at: new Date(payload.createdAt).toISOString(),
  url: payload.destinationUrl || payload.storeUrl,
  stores: {
    id: payload.storeId,
    name: payload.storeName,
    slug: payload.storeSlug,
    logo_url: payload.storeLogo,
    website_url: payload.storeUrl,
  },
});

export const handoffToCouponRecords = (payload: PendingCouponHandoff) => {
  const snapshot = Array.isArray(payload.couponsSnapshot) ? payload.couponsSnapshot : [];
  if (snapshot.length > 0) {
    return snapshot.map((coupon) => ({ ...coupon }));
  }

  return [handoffToCouponRecord(payload)];
};

export const handoffToStoreRecord = (payload: PendingCouponHandoff) => {
  if (payload.storeSnapshot && typeof payload.storeSnapshot === "object") {
    return { ...payload.storeSnapshot };
  }

  if (!payload.storeId) return null;

  const timestamp = new Date(payload.createdAt).toISOString();
  return {
    id: payload.storeId,
    name: payload.storeName,
    slug: payload.storeSlug,
    logo_url: payload.storeLogo,
    website_url: payload.storeUrl,
    description: null,
    category: null,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
};
