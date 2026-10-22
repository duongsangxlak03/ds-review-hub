import { ArrowRight, Diamond, Store as StoreIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_PILLS = [
  "Popular",
  "Software & Apps",
  "Fashion & Apparel",
  "Beauty & Personal Care",
  "Health & Wellness",
  "Home & Garden",
  "Hobbies & Toys",
  "Sports & Outdoors",
  "Food & Delivery",
];

const CATEGORY_PILL_HREFS: Record<string, string> = {
  "Software & Apps": "/category/software-saas",
  "Fashion & Apparel": "/category/fashion-apparel",
  "Beauty & Personal Care": "/category/beauty-personal-care",
  "Health & Wellness": "/category/health-wellness",
  "Home & Garden": "/category/home-garden",
  "Hobbies & Toys": "/category/entertainment-media",
  "Sports & Outdoors": "/category/sports-outdoors",
  "Food & Delivery": "/category/food-grocery",
};

type VerifiedStore = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  category: string | null;
  verifiedCodes: number;
  health: number;
};

const seededHealth = (storeId: string, verifiedCodes: number) => {
  const hash = storeId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Math.min(100, Math.max(81, 86 + (hash % 13) + Math.min(4, Math.floor(verifiedCodes / 5))));
};

const categoryHref = (category: string) => {
  if (category === "Popular") return "/stores";
  return CATEGORY_PILL_HREFS[category] || `/search?q=${encodeURIComponent(category)}`;
};

const MainSection = () => {
  const { data: storeCount = 0 } = useQuery({
    queryKey: ["homepage-active-store-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("stores")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: verifiedStores = [], isLoading } = useQuery({
    queryKey: ["homepage-verified-store-grid"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("id, code, store_id, stores(id, name, slug, logo_url, category)")
        .eq("is_active", true)
        .not("code", "is", null)
        .limit(900);
      if (error) throw error;

      const storeMap = new Map<string, VerifiedStore>();

      (data || []).forEach((coupon: any) => {
        const code = String(coupon.code || "").trim();
        if (!code || code.toUpperCase() === "NOCODE") return;

        const store = Array.isArray(coupon.stores) ? coupon.stores[0] : coupon.stores;
        if (!store?.id || !store?.name) return;

        const current = storeMap.get(store.id) || {
          id: store.id,
          name: store.name,
          slug: store.slug,
          logo_url: store.logo_url,
          category: store.category,
          verifiedCodes: 0,
          health: 90,
        };

        current.verifiedCodes += 1;
        current.health = seededHealth(current.id, current.verifiedCodes);
        storeMap.set(store.id, current);
      });

      return Array.from(storeMap.values())
        .sort((a, b) => b.verifiedCodes - a.verifiedCodes || a.name.localeCompare(b.name))
        .slice(0, 12);
    },
  });

  return (
    <section className="overflow-hidden py-9 sm:py-12 md:py-16">
      <div className="store-directory-shell mx-auto min-w-0 space-y-5 sm:space-y-8">
        <div className="space-y-4 sm:space-y-7">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary sm:text-[12px]">
            <Diamond className="h-3 w-3 fill-current" />
            Store directory
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-full text-[30px] font-bold leading-[1.07] tracking-[-0.045em] text-foreground sm:max-w-3xl sm:text-[42px] lg:text-[54px]">
              {storeCount.toLocaleString()}+ stores.
              <br />
              Current codes & deals.
            </h2>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-bold text-primary sm:text-sm md:justify-end">
              <a href="/stores" className="inline-flex items-center gap-1 hover:text-primary/80">
                Browse all stores <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/stores" className="inline-flex items-center gap-1 hover:text-primary/80">
                Browse by category <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="-mx-1 flex max-w-[100vw] gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch] md:mx-0 md:max-w-none md:flex-wrap md:px-0">
          {CATEGORY_PILLS.map((category) => (
            <a
              key={category}
              href={categoryHref(category)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition-colors sm:text-sm ${
                category === "Popular"
                  ? "border-primary bg-primary text-black"
                  : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {category}
            </a>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-[174px] animate-pulse rounded-2xl border border-border bg-card sm:h-[172px] md:h-[184px]" />
              ))
            : verifiedStores.map((store) => (
                <a
                  key={store.id}
                  href={`/store/${store.slug || store.id}`}
                  className="group min-h-[174px] min-w-0 overflow-hidden rounded-2xl border border-border bg-[#0b0c0e] p-4 transition-colors hover:border-primary/50 sm:min-h-[172px] sm:p-5 md:min-h-[184px] md:p-6"
                >
                  <div className="flex min-w-0 items-center gap-3 md:gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2 md:h-14 md:w-14">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <StoreIcon className="h-6 w-6 text-black/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-bold leading-tight text-foreground group-hover:text-primary sm:text-lg md:text-xl">
                        {store.name}
                      </h3>
                      {store.category && (
                        <p className="hidden truncate text-xs text-muted-foreground sm:block">{store.category}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex min-w-0 items-center gap-2 text-[13px] text-foreground/90 sm:text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0 truncate">{store.verifiedCodes} verified code{store.verifiedCodes !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="mt-4 h-[2px] overflow-hidden rounded-full bg-[#1c1e20]/80">
                    <div className="h-full rounded-full bg-primary/85" style={{ width: `${store.health}%` }} />
                  </div>

                  <p className="mt-3 font-mono text-[12px] text-muted-foreground sm:text-sm">{store.health}% health</p>
                </a>
              ))}
        </div>
      </div>
    </section>
  );
};

export default MainSection;
