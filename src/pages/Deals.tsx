import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";
import { ExternalLink, Tag, Clock, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Deal, Store } from "@/types/database";
import { useMemo, useState } from "react";

const DEALS_PER_BATCH = 48;

const Deals = () => {
  const [visibleCount, setVisibleCount] = useState(DEALS_PER_BATCH);

  usePageMeta({
    title: "Deals & Discounts | DS Review Hub",
    description: "Browse listed deals and discounts from online stores, then confirm final terms at checkout.",
    canonical: "https://www.dsreviewhub.com/deals",
  });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["public-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, stores(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(240);
      if (error) throw error;
      return data as (Deal & { stores: Store })[];
    },
  });

  const visibleDeals = useMemo(() => deals.slice(0, visibleCount), [deals, visibleCount]);
  const hasMoreDeals = visibleCount < deals.length;

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
  };

  const calcDiscount = (original: number | null, deal: number | null) => {
    if (!original || !deal || original <= 0) return null;
    return Math.round(((original - deal) / original) * 100);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container py-10 md:py-14">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Deals & Discounts
            </h1>
            <p className="mt-2 text-muted-foreground max-w-xl">
              Browse listed deals from online stores and confirm the final offer on the retailer site.
            </p>
          </div>
        </section>

        {/* Deals grid */}
        <section className="container py-8 md:py-12">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Tag className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-semibold text-foreground">No deals available right now</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon for new deals!</p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleDeals.map((deal) => {
                  const discount = calcDiscount(deal.original_price, deal.deal_price);
                  const isExpired = deal.expiry_date && new Date(deal.expiry_date) < new Date();

                  return (
                    <Card
                      key={deal.id}
                      className={`group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5 ${isExpired ? "opacity-60" : ""}`}
                    >
                      {/* Image */}
                      {deal.image_url && (
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img
                            src={deal.image_url}
                            alt={deal.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Discount badge */}
                      {discount && !isExpired && (
                        <span className="absolute top-3 right-3 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-md">
                          -{discount}%
                        </span>
                      )}

                      <CardContent className="p-4 flex flex-col gap-3">
                        {/* Store info */}
                        {deal.stores && (
                          <a
                            href={`/store/${deal.stores.slug}`}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {deal.stores.logo_url ? (
                              <img src={deal.stores.logo_url} alt={deal.stores.name} className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <StoreIcon className="h-4 w-4" />
                            )}
                            <span className="font-medium">{deal.stores.name}</span>
                          </a>
                        )}

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                          {deal.title}
                        </h3>

                        {/* Description */}
                        {deal.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
                        )}

                        {/* Price row */}
                        <div className="flex items-baseline gap-2 mt-auto">
                          {deal.deal_price != null && (
                            <span className="text-lg font-extrabold text-primary">
                              {formatPrice(deal.deal_price)}
                            </span>
                          )}
                          {deal.original_price != null && deal.deal_price != null && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(deal.original_price)}
                            </span>
                          )}
                        </div>

                        {/* Expiry */}
                        {deal.expiry_date && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {isExpired ? "Expired" : `Expires ${new Date(deal.expiry_date).toLocaleDateString()}`}
                          </div>
                        )}

                        {/* CTA */}
                        {deal.url && !isExpired && (
                          <Button asChild size="sm" className="w-full mt-1">
                            <a href={deal.url} target="_blank" rel="noopener noreferrer">
                              Get Deal <ExternalLink className="h-3.5 w-3.5 ml-1" />
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {hasMoreDeals && (
                <div className="flex justify-center pt-8">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((count) => Math.min(count + DEALS_PER_BATCH, deals.length))}
                  >
                    Load more deals
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Deals;
