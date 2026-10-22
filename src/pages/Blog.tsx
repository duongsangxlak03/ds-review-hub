import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import InsightVisual from "@/components/InsightVisual";
import Navbar from "@/components/Navbar";
import usePageMeta from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";

const editorialTopics = ["All", "AI & Automation", "Technology", "Ecommerce", "SEO & Discovery", "Marketing Systems", "Buying Intelligence"];

const formatDate = (value?: string | null) => {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
};

const Blog = () => {
  const [activeTopic, setActiveTopic] = useState("All");
  const [query, setQuery] = useState("");

  usePageMeta({
    title: "Insights on AI, Technology & Ecommerce - DS Review Hub",
    description: "Original analysis, practical frameworks, and evidence-led ideas about AI, technology, ecommerce, discovery, and smarter buying decisions.",
    canonical: "https://www.dsreviewhub.com/insights",
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-public", "editorial-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const insightPosts = useMemo(
    () => posts.filter((post) => post.content_type === "insight" || post.tags?.includes("DS Insight")),
    [posts],
  );

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return insightPosts.filter((post) => {
      const topicMatch = activeTopic === "All" || post.category === activeTopic || post.tags?.includes(activeTopic);
      const haystack = `${post.title} ${post.excerpt || ""} ${post.category || ""} ${(post.tags || []).join(" ")}`.toLowerCase();
      return topicMatch && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeTopic, insightPosts, query]);

  const featured = visiblePosts[0];
  const remaining = visiblePosts.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="relative isolate overflow-hidden border-b border-border bg-[#090b0d]">
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="container relative py-16 md:py-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> DS Review Hub Insights
          </div>
          <h1 className="max-w-4xl text-4xl font-black tracking-[-0.04em] text-white md:text-6xl lg:text-7xl">
            Ideas worth using,<br /><span className="text-primary">not just scrolling past.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
            Original analysis and practical frameworks for AI, technology, ecommerce, modern discovery, and better buying decisions.
          </p>
        </div>
      </section>

      <div className="sticky top-[65px] z-30 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="container flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {editorialTopics.map((topic) => (
              <button key={topic} type="button" onClick={() => setActiveTopic(topic)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-colors ${activeTopic === topic ? "border-primary bg-primary text-black" : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}>
                {topic}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search insights..." className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" />
          </label>
        </div>
      </div>

      <main className="container py-12 md:py-16">
        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-border bg-card" />)}</div>
        ) : !featured ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-10 text-center md:p-14">
            <BookOpen className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-5 text-2xl font-black">The publishing desk is ready.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{insightPosts.length ? "No insight matches this filter yet. Try another topic or search." : "The first DS Review Hub insight is being prepared. Coupon posts and store listings are intentionally kept out of this publication."}</p>
            {(activeTopic !== "All" || query) && <button type="button" onClick={() => { setActiveTopic("All"); setQuery(""); }} className="mt-6 text-sm font-bold text-primary hover:underline">Clear filters</button>}
          </div>
        ) : (
          <>
            <Link to={`/insights/${featured.slug}`} className="group grid overflow-hidden rounded-3xl border border-border bg-card transition-all hover:border-primary/45 lg:grid-cols-[1.15fr_.85fr]">
              <InsightVisual src={featured.image_url} alt={featured.title} category={featured.category} eager className="aspect-[16/10] lg:aspect-auto lg:min-h-[430px]" />
              <div className="flex flex-col justify-center p-7 md:p-10">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground"><span className="text-primary">Featured</span><span>•</span><span>{featured.category || "Insight"}</span><span>•</span><span>{formatDate(featured.published_at || featured.created_at)}</span></div>
                <h2 className="mt-5 text-3xl font-black leading-[1.1] tracking-tight transition-colors group-hover:text-primary md:text-4xl">{featured.title}</h2>
                {featured.excerpt && <p className="mt-5 line-clamp-4 text-base leading-relaxed text-muted-foreground">{featured.excerpt}</p>}
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-primary">Read the full analysis <ArrowUpRight className="h-4 w-4" /></span>
              </div>
            </Link>

            {remaining.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4"><h2 className="text-2xl font-black">Latest thinking</h2><span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{visiblePosts.length} articles</span></div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {remaining.map((post) => (
                    <Link key={post.id} to={`/insights/${post.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/50">
                      <InsightVisual src={post.image_url} alt={post.title} category={post.category} className="aspect-[16/9]" />
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"><span className="text-primary">{post.category || "Insight"}</span><span>•</span><span>{formatDate(post.published_at || post.created_at)}</span></div>
                        <h3 className="mt-3 text-xl font-black leading-tight transition-colors group-hover:text-primary">{post.title}</h3>
                        {post.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-primary">Read insight <ArrowUpRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
