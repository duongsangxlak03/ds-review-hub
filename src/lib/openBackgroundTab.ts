/**
 * Affiliate redirect strategy (same as chattongcoupon):
 * 1. Open a new tab with the current page + ?coupon=ID so the browser focuses
 *    a DS Review Hub tab with the code dialog.
 * 2. Redirect the previous tab to the affiliate URL so the cookie is set behind it.
 *
 * Browsers do not reliably allow forcing a merchant tab to open in the background,
 * so the stable approach is to make the focused tab the coupon reveal page.
 */
export const openBackgroundTab = (affiliateUrl: string, couponId?: string, revealParams?: Record<string, string>) => {
  if (!affiliateUrl || typeof window === "undefined") return false;

  try {
    const currentUrl = new URL(window.location.href);
    if (couponId) {
      currentUrl.searchParams.set("coupon", couponId);
    }
    Object.entries(revealParams || {}).forEach(([key, value]) => {
      currentUrl.searchParams.set(key, value);
    });

    window.open(currentUrl.toString(), "_blank", "noopener");
    window.location.href = affiliateUrl;
    return true;
  } catch {
    window.open(affiliateUrl, "_blank", "noopener,noreferrer");
    return false;
  }
};

export const openAffiliateBehind = (affiliateUrl: string) => {
  if (!affiliateUrl || typeof window === "undefined") return false;

  try {
    const affiliateTab = window.open("about:blank", "_blank");
    if (!affiliateTab) return false;

    try {
      affiliateTab.blur();
      window.focus();
      requestAnimationFrame(() => window.focus());
    } catch {
      // Browser focus behavior is best-effort only.
    }

    window.setTimeout(() => {
      try {
        affiliateTab.location.href = affiliateUrl;
        window.focus();
      } catch {
        window.open(affiliateUrl, "_blank");
      }
    }, 80);

    return true;
  } catch {
    return false;
  }
};
