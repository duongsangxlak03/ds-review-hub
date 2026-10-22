import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Store as StoreIcon, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import usePageMeta from "@/hooks/usePageMeta";

const STORES_PER_PAGE = 20;

const AllStores = () => {
  usePageMeta({
    title: "All Stores - DS Review Hub",
    description: "Browse online stores with coupon codes, promo codes, and deals listed at DS Review Hub.",
    canonical: "https://www.dsreviewhub.com/stores",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["all-stores"],
    queryFn: async () => {
      const { data: storeList } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, description")
        .eq("is_active", true)
        .order("name");
      if (!storeList || storeList.length === 0) return [];

      const storeIds = storeList.map((s) => s.id);
      const { data: coupons } = await supabase
        .from("coupons")
        .select("store_id")
        .in("store_id", storeIds)
        .eq("is_active", true);

      const countMap: Record<string, number> = {};
      (coupons || []).forEach((c) => {
        countMap[c.store_id] = (countMap[c.store_id] || 0) + 1;
      });

      return storeList.map((s) => ({ ...s, coupon_count: countMap[s.id] || 0 }));
    },
  });

  const filtered = useMemo(
    () => stores.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [stores, searchQuery]
  );

  // Reset page when search changes
  const totalPages = Math.ceil(filtered.length / STORES_PER_PAGE);
  const safePage = Math.min(currentPage, totalPages || 1);
  const paginatedStores = filtered.slice((safePage - 1) * STORES_PER_PAGE, safePage * STORES_PER_PAGE);

  // Group paginated stores by first letter
  const grouped = paginatedStores.reduce<Record<string, typeof paginatedStores>>((acc, store) => {
    const letter = store.name[0]?.toUpperCase() || "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(store);
    return acc;
  }, {});
  const sortedLetters = Object.keys(grouped).sort();

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const renderPageButtons = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">All Stores</h1>
          <p className="text-muted-foreground">
            Browse coupon codes and deals from {stores.length.toLocaleString()} listed stores.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search stores..."
            className="w-full rounded-xl border border-border bg-card px-11 py-3 text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all sm:text-sm"
          />
        </div>

        {/* Pagination info */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {(safePage - 1) * STORES_PER_PAGE + 1}–{Math.min(safePage * STORES_PER_PAGE, filtered.length)} of {filtered.length} stores
          </p>
        )}

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Loading stores...</div>
        )}

        {!isLoading && (
          <div className="space-y-8">
            {sortedLetters.map((letter) => (
              <div key={letter} id={`letter-${letter}`}>
                <h2 className="text-xl font-extrabold text-foreground mb-4 border-b border-border pb-2">{letter}</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {grouped[letter].map((store) => (
                    <a
                      key={store.id}
                      href={`/store/${store.slug || store.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <StoreIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{store.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {store.coupon_count} {store.coupon_count === 1 ? "code" : "codes"}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}

            {filtered.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                No stores found matching "{searchQuery}"
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                {renderPageButtons().map((page, idx) =>
                  page === "..." ? (
                    <span key={`e-${idx}`} className="px-2 text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        safePage === page
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AllStores;
