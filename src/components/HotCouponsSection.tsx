import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ArrowRight } from "lucide-react";
import { trackCopyCode } from "@/lib/tracking";
import { setPendingCouponHandoff } from "@/lib/couponHandoff";
import { prefetchCouponReveal } from "@/lib/prefetchCouponReveal";

const DISPLAY_COUNT = 6;

type HotCoupon = {
  id: string;
  title?: string | null;
  code?: string | null;
  discount_value?: string | null;
  description?: string | null;
  url?: string | null;
  stores?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    logo_url?: string | null;
    website_url?: string | null;
  } | null;
};

const HotCouponsSection = () => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["hot-coupons-section"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coupons")
        .select("id, title, code, discount_value, description, url, stores(id, name, slug, logo_url, website_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);

      const seen = new Set<string>();
      const result: HotCoupon[] = [];
      for (const coupon of data || []) {
        const key = coupon.stores?.slug || coupon.stores?.name;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push(coupon);
        if (result.length >= DISPLAY_COUNT) break;
      }
      return result;
    },
  });

  if (items.length === 0 && !isLoading) return null;

  return (
    <section className="py-12 container">
      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-6">
        Latest Listed Coupons
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-5">
        {items.map((coupon: HotCoupon) => {
          const storeName = coupon.stores?.name || "Store";
          const storeSlug = coupon.stores?.slug;
          const storeLogo = coupon.stores?.logo_url;

          return (
            <a key={coupon.id} href={`/store/${storeSlug || ""}`} className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/30 transition-colors block">
              <div className="h-24 md:h-40 bg-white flex items-center justify-center p-3 md:p-6 gap-2 md:gap-3">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} loading="lazy" className="h-7 w-7 md:h-10 md:w-10 object-cover shrink-0 rounded" />
                ) : (
                  <span className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-primary/80 flex items-center justify-center text-primary-foreground text-sm md:text-lg font-bold shrink-0">
                    {storeName.charAt(0)}
                  </span>
                )}
                <span className="text-sm md:text-xl font-extrabold text-black truncate">{storeName}</span>
              </div>
              <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                <div className="flex flex-col gap-0.5 md:gap-1">
                  <span className="text-sm md:text-lg font-extrabold text-foreground">
                    {coupon.discount_value || "Deal"}
                  </span>
                  {coupon.code && coupon.code.toUpperCase() !== "NOCODE" && (
                    <span className="flex items-center gap-1 text-xs md:text-sm font-bold text-primary truncate">
                      <Copy className="h-3 w-3 shrink-0" />
                      <span className="truncate">{coupon.code}</span>
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-foreground">{storeName}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {coupon.description || coupon.title}
                </p>

                {coupon.code && coupon.code.toUpperCase() !== "NOCODE" ? (
                  <button
                    onPointerEnter={() => prefetchCouponReveal()}
                    onPointerDown={() => prefetchCouponReveal()}
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(coupon.code!);
                      trackCopyCode({ store_name: storeName, store_slug: storeSlug || undefined, coupon_id: coupon.id, coupon_code: coupon.code!, page_type: "home" });
                      const affiliateUrl = coupon.url || coupon.stores?.website_url;
                      if (affiliateUrl && storeSlug) {
                        setPendingCouponHandoff({
                          revealKey: coupon.id,
                          couponId: coupon.id,
                          code: coupon.code!,
                          title: coupon.title || coupon.description || "Coupon code",
                          description: coupon.description || coupon.title,
                          discountValue: coupon.discount_value,
                          storeId: coupon.stores?.id,
                          storeName,
                          storeSlug,
                          storeLogo,
                          storeUrl: coupon.stores?.website_url,
                          destinationUrl: affiliateUrl,
                          pageType: "home",
                        });
                        window.open(`/store/${storeSlug}?coupon=${coupon.id}`, "_blank", "noopener");
                        window.location.href = affiliateUrl;
                      } else {
                        window.location.href = storeSlug ? `/store/${storeSlug}?coupon=${encodeURIComponent(coupon.id)}` : "/stores";
                      }
                    }}
                    className="w-full mt-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Get Code
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const affiliateUrl = coupon.url || coupon.stores?.website_url;
                      if (affiliateUrl) {
                        window.open(`/store/${storeSlug}?coupon=${coupon.id}`, "_blank", "noopener");
                        window.location.href = affiliateUrl;
                      }
                    }}
                    className="w-full mt-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Get Deal
                  </button>
                )}
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary transition-colors mt-1">
                  See all {storeName} codes <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};

export default HotCouponsSection;
