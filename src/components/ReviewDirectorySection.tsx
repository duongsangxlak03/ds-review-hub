import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, FileSearch, Layers3, Store as StoreIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const REVIEW_TOPICS = [
  "All Reviews",
  "AI Tools",
  "Technology",
  "Ecommerce",
  "Software",
  "Home",
  "Beauty",
  "Health",
  "Fashion",
] as const;

const topicMatchesCategory = (topic: string, category: string | null) => {
  if (topic === "All Reviews") return true;

  const value = String(category || "").toLowerCase();
  const aliases: Record<string, string[]> = {
    "AI Tools": ["ai", "artificial intelligence"],
    Technology: ["technology", "electronics", "computers"],
    Ecommerce: ["ecommerce", "e-commerce", "shopping"],
    Software: ["software", "saas", "apps"],
    Home: ["home", "garden", "furniture", "kitchen"],
    Beauty: ["beauty", "personal care", "skincare"],
    Health: ["health", "wellness", "fitness"],
    Fashion: ["fashion", "apparel", "clothing", "accessories"],
  };

  return (aliases[topic] || [topic.toLowerCase()]).some((alias) => value.includes(alias));
};

type ReviewCard = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  category: string | null;
  title: string;
  summary: string;
  bestFor: string[];
  sourceCount: number;
  updatedAt: string | null;
};

const compactDate = (value: string | null) => {
  if (!value) return "Recently checked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently checked";
  return `Checked ${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
};

const ReviewDirectorySection = () => {
  const [activeTopic, setActiveTopic] = useState<string>(() => {
    if (typeof window === "undefined") return "All Reviews";
    const requestedTopic = new URLSearchParams(window.location.search).get("review");
    return REVIEW_TOPICS.find((topic) => topic.toLowerCase() === requestedTopic?.toLowerCase()) || "All Reviews";
  });
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["homepage-latest-brand-reviews"],
    queryFn: async (): Promise<ReviewCard[]> => {
      const { data, error } = await supabase
        .from("store_reviews")
        .select("id, title, slug, summary, best_for, hero_image_url, sources, updated_at, stores(id, name, slug, logo_url, category)")
        .eq("status", "published")
        .not("slug", "is", null)
        .order("updated_at", { ascending: false })
        .limit(18);

      if (error) throw error;

      return (data || []).flatMap((review) => {
        const store = Array.isArray(review.stores) ? review.stores[0] : review.stores;
        if (!review.slug || !store?.id || !store?.name) return [];

        return [{
          id: review.id,
          name: store.name,
          slug: review.slug,
          logoUrl: store.logo_url,
          heroImageUrl: review.hero_image_url,
          category: store.category,
          title: review.title || `${store.name} Review`,
          summary: review.summary || `Read our editorial review of ${store.name}.`,
          bestFor: Array.isArray(review.best_for) ? review.best_for : [],
          sourceCount: Array.isArray(review.sources) ? review.sources.length : 0,
          updatedAt: review.updated_at || null,
        }];
      });
    },
  });

  const filteredReviews = useMemo(
    () => reviews.filter((review) => topicMatchesCategory(activeTopic, review.category)),
    [activeTopic, reviews],
  );

  return (
    <section id="review-library" className="overflow-hidden border-y border-border bg-[#08090a] py-14 sm:py-20">
      <div className="container min-w-0">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <BookOpen className="h-4 w-4" />
              Review library
            </div>
            <h2 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">
              Start with the brand.
              <br />
              Finish with a better decision.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Every card below opens a published editorial review—not a coupon listing. We examine value, product range, policies, customer experience, and the details that matter before checkout.
            </p>
          </div>

          <a href="#how-it-works" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80">
            See how we review <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-8 flex max-w-[100vw] gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden lg:flex-wrap" aria-label="Filter reviews by topic">
          {REVIEW_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setActiveTopic(topic)}
              aria-pressed={activeTopic === topic}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                activeTopic === topic
                  ? "border-primary bg-primary text-black"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-8 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[270px] animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="mt-8 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReviews.map((review, index) => (
              <a
                key={review.id}
                href={`/reviews/${review.slug}`}
                className={`group relative flex min-h-[290px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/50 ${
                  index === 0 ? "md:col-span-2 xl:col-span-1" : ""
                }`}
              >
                {review.heroImageUrl && (
                  <div className="absolute inset-x-0 top-0 h-28 overflow-hidden opacity-20 transition-opacity group-hover:opacity-30">
                    <img src={review.heroImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
                  </div>
                )}
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition-colors group-hover:bg-primary/20" />

                <div className="relative flex min-w-0 items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
                      {review.logoUrl ? (
                        <img src={review.logoUrl} alt={`${review.name} logo`} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <StoreIcon className="h-5 w-5 text-black/50" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{review.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{review.category || "Brand review"}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                    Review
                  </span>
                </div>

                <h3 className="relative mt-6 text-xl font-black leading-tight tracking-[-0.025em] text-foreground transition-colors group-hover:text-primary">
                  {review.title}
                </h3>
                <p className="relative mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{review.summary}</p>

                <div className="relative mt-auto flex items-end justify-between gap-3 pt-6">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">
                      {review.bestFor.length > 0 ? `Best for: ${review.bestFor.slice(0, 2).join(", ")}` : "Research, tradeoffs, and verdict"}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
                      {compactDate(review.updatedAt)}{review.sourceCount > 0 ? ` · ${review.sourceCount} source${review.sourceCount === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-8 flex min-h-[260px] flex-col items-start justify-center rounded-3xl border border-dashed border-primary/25 bg-[radial-gradient(circle_at_top_right,rgba(3,255,136,0.08),transparent_38%),#151719] p-7 sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <FileSearch className="h-6 w-6" />
            </span>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-primary">
              {reviews.length === 0 ? "Editorial queue" : activeTopic}
            </p>
            <h3 className="mt-2 max-w-2xl text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
              {reviews.length === 0 ? "The first independent reviews are being prepared." : `No ${activeTopic.toLowerCase()} reviews are published yet.`}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              We only list a brand here after its review is published. Store listings and coupon pages are never used as stand-ins for editorial coverage.
            </p>
            {reviews.length > 0 && (
              <button type="button" onClick={() => setActiveTopic("All Reviews")} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
                View all published reviews <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">
          <Layers3 className="h-5 w-5 shrink-0 text-primary" />
          <p>Coming next: deeper coverage of AI tools, consumer tech, ecommerce platforms, software, and online-first brands.</p>
        </div>
      </div>
    </section>
  );
};

export default ReviewDirectorySection;
