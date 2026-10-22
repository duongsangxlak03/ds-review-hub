import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import InsightVisual from "@/components/InsightVisual";

const formatDate = (value?: string | null) => {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
};

const LatestInsightsSection = () => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["homepage-latest-insights", "editorial-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(16);
      if (error) throw error;
      return (data || [])
        .filter((post) => post.content_type === "insight" || post.tags?.includes("DS Insight"))
        .slice(0, 4);
    },
  });

  const featured = posts[0];
  const secondary = posts.slice(1);

  return (
    <section className="border-y border-border bg-[#0c0e10] py-16 md:py-20">
      <div className="container">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
              <Newspaper className="h-4 w-4" /> DS Review Hub Insights
            </div>
            <h2 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">What we’re researching now</h2>
            <p className="mt-3 text-muted-foreground">Original analysis on AI, technology, ecommerce, discovery, and the systems changing how people buy.</p>
          </div>
          <Link to="/insights" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            Browse all insights <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
            <div className="aspect-[16/12] animate-pulse rounded-2xl border border-border bg-card" />
            <div className="grid gap-4">
              {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />)}
            </div>
          </div>
        ) : posts.length > 0 ? (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
            <Link
              to={`/insights/${featured.slug}`}
              className="group self-start overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50"
            >
              <InsightVisual
                src={featured.image_url}
                alt={featured.title}
                category={featured.category}
                eager
                className="aspect-[16/9]"
              />
              <div className="p-5 md:p-7">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="text-primary">Featured</span>
                  <span>•</span>
                  <span>{featured.category || "Insight"}</span>
                  <span>•</span>
                  <span>{formatDate(featured.published_at || featured.created_at)}</span>
                </div>
                <h3 className="text-2xl font-black leading-tight text-foreground transition-colors group-hover:text-primary md:text-3xl">
                  {featured.title}
                </h3>
                {featured.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{featured.excerpt}</p>}
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-primary">
                  Read insight <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>

            <div className="grid gap-4">
              {secondary.map((post) => (
              <Link
                key={post.id}
                to={`/insights/${post.slug}`}
                className="group grid overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50 sm:grid-cols-[minmax(170px,.8fr)_minmax(0,1.2fr)]"
              >
                <InsightVisual
                  src={post.image_url}
                  alt={post.title}
                  category={post.category}
                  className="aspect-[16/9] sm:aspect-auto sm:min-h-[154px]"
                />
                <div className="flex min-w-0 flex-col justify-center p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="text-primary">{post.category || "Insight"}</span>
                    <span>•</span>
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-black leading-tight text-foreground transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  {post.excerpt && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                </div>
              </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary/30 bg-card/60 px-6 py-10 text-center">
            <p className="text-lg font-black text-foreground">The first original Insight is in the editorial queue.</p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">New research will appear here after editorial review. Coupon posts and store listings are intentionally kept out of this feed.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestInsightsSection;
