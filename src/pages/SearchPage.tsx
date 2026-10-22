import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Tag, Store, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackSearchUsed } from "@/lib/tracking";
import usePageMeta from "@/hooks/usePageMeta";

type StoreResult = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  description: string | null;
  coupon_count: number;
  deal_count: number;
};

type CouponResult = {
  id: string;
  title: string;
  code: string | null;
  discount_value: string | null;
  discount_type: string | null;
  store_name: string;
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [stores, setStores] = useState<StoreResult[]>([]);
  const [coupons, setCoupons] = useState<CouponResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  usePageMeta({
    title: query ? `Search: ${query} - DS Review Hub` : "Search - DS Review Hub",
    description: "Search for coupons, promo codes, and deals from thousands of stores.",
    noindex: true,
  });

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);

    const fetchResults = async () => {
      const q = `%${query}%`;

      const [storesRes, couponsRes] = await Promise.all([
        supabase
          .from("stores")
          .select("id, name, slug, logo_url, description")
          .ilike("name", q)
          .eq("is_active", true)
          .limit(20),
        supabase
          .from("coupons")
          .select("id, title, code, discount_value, discount_type, store_id")
          .or(`title.ilike.${q},code.ilike.${q}`)
          .eq("is_active", true)
          .limit(20),
      ]);

      // Get store names for coupons
      const storeIds = [...new Set((couponsRes.data || []).map((c) => c.store_id))];
      let storeMap: Record<string, string> = {};
      if (storeIds.length > 0) {
        const { data: storeNames } = await supabase
          .from("stores")
          .select("id, name")
          .in("id", storeIds);
        storeMap = Object.fromEntries((storeNames || []).map((s) => [s.id, s.name]));
      }

      // Count coupons/deals per store
      const storeResults: StoreResult[] = (storesRes.data || []).map((s) => ({
        ...s,
        coupon_count: 0,
        deal_count: 0,
      }));

      const couponResults: CouponResult[] = (couponsRes.data || []).map((c) => ({
        id: c.id,
        title: c.title,
        code: c.code,
        discount_value: c.discount_value,
        discount_type: c.discount_type,
        store_name: storeMap[c.store_id] || "Unknown Store",
      }));

      setStores(storeResults);
      setCoupons(couponResults);
      setLoading(false);
    };

    fetchResults();
  }, [query]);

  const handleSearch = () => {
    if (searchInput.trim()) {
      trackSearchUsed({ search_query: searchInput.trim(), page_type: "search" });
      window.location.href = `/search?q=${encodeURIComponent(searchInput.trim())}`;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="container py-10 space-y-8">
        {/* Search bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search stores, coupons, deals..."
              className="w-full rounded-xl border border-border bg-card px-12 py-4 text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-primary bg-transparent px-5 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Find
            </button>
          </div>
        </div>

        {query && (
          <h1 className="text-2xl font-extrabold">
            Results for "<span className="text-primary">{query}</span>"
          </h1>
        )}

        {loading && (
          <div className="text-center py-12 text-muted-foreground">Searching...</div>
        )}

        {!loading && query && stores.length === 0 && coupons.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <p className="text-lg font-bold text-foreground">No results found</p>
            <p className="text-muted-foreground">Try a different search term or browse our stores.</p>
          </div>
        )}

        {/* Stores */}
        {stores.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" /> Stores
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Store className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground group-hover:text-primary transition-colors">{store.name}</p>
                      {store.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{store.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coupons */}
        {coupons.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Coupons
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors cursor-pointer group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground group-hover:text-primary transition-colors">{coupon.title}</p>
                    {coupon.discount_value && (
                      <span className="text-sm font-bold text-primary">{coupon.discount_value}{coupon.discount_type === "percentage" ? "%" : "$"} off</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>at {coupon.store_name}</span>
                    {coupon.code && (
                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{coupon.code}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default SearchPage;
