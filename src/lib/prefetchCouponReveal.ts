let storePagePrefetch: Promise<unknown> | null = null;

export const prefetchCouponReveal = (options: { includeStorePage?: boolean } = {}) => {
  if (typeof window === "undefined") return;

  if (options.includeStorePage !== false) {
    storePagePrefetch ||= import("@/pages/StorePage");
  }
};
