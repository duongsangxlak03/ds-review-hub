import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Globe2,
  HelpCircle,
  Info,
  ListChecks,
  Quote,
  ShieldCheck,
  Store as StoreIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { trackOutboundClick } from "@/lib/tracking";
import type { Database } from "@/integrations/supabase/types";

type ReviewRow = Database["public"]["Tables"]["store_reviews"]["Row"];
type ReviewStore = Pick<
  Database["public"]["Tables"]["stores"]["Row"],
  "id" | "name" | "slug" | "logo_url" | "website_url" | "category" | "description"
>;
type PublishedReview = ReviewRow & { stores: ReviewStore | ReviewStore[] | null };

type ReviewSection = { heading: string; body: string };
type ReviewFaq = { question: string; answer: string };
type ReviewSource = { label: string; url: string; note: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const textValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const objectItems = (value: unknown) => (Array.isArray(value) ? value.filter(isObject) : []);

const reviewSections = (value: unknown): ReviewSection[] =>
  objectItems(value)
    .map((item) => ({ heading: textValue(item.heading), body: textValue(item.body) }))
    .filter((item) => item.heading || item.body);

const reviewFaqs = (value: unknown): ReviewFaq[] =>
  objectItems(value)
    .map((item) => ({ question: textValue(item.question), answer: textValue(item.answer) }))
    .filter((item) => item.question && item.answer);

const reviewSources = (value: unknown): ReviewSource[] =>
  objectItems(value)
    .map((item) => ({
      label: textValue(item.label) || textValue(item.title) || textValue(item.publisher),
      url: textValue(item.url),
      note: textValue(item.note),
    }))
    .filter((item) => item.label || item.url);

const safeExternalUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const readableDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const StoreReviewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: review, isLoading } = useQuery({
    queryKey: ["public-store-review", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_reviews")
        .select("*, stores(id, name, slug, logo_url, website_url, category, description)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data as PublishedReview | null;
    },
    enabled: Boolean(slug),
  });

  const store = review
    ? (Array.isArray(review.stores) ? review.stores[0] : review.stores)
    : null;
  const sections = useMemo(() => reviewSections(review?.content_sections), [review?.content_sections]);
  const faqs = useMemo(() => reviewFaqs(review?.faqs), [review?.faqs]);
  const sources = useMemo(() => reviewSources(review?.sources), [review?.sources]);
  const pageTitle = review?.meta_title || review?.title || (isLoading ? "Loading Review | DS Review Hub" : "Review Not Found | DS Review Hub");
  const pageDescription = review?.meta_description || review?.dek || review?.summary || "Independent brand reviews from DS Review Hub.";
  const canonical = review?.slug ? `https://www.dsreviewhub.com/reviews/${review.slug}` : undefined;
  const publishedDate = review?.published_at || review?.created_at || null;
  const updatedDate = review?.updated_at || publishedDate;
  const jsonLd = useMemo<Record<string, unknown> | undefined>(() => {
    if (!review || !store || !canonical) return undefined;
    const organizationId = "https://www.dsreviewhub.com/#organization";
    const citedUrls = sources.map((source) => safeExternalUrl(source.url)).filter(Boolean);
    const reviewId = `${canonical}#review`;
    const articleId = `${canonical}#article`;
    const graph: Record<string, unknown>[] = [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "DS Review Hub",
        url: "https://www.dsreviewhub.com",
      },
      {
        "@type": "Review",
        "@id": reviewId,
        url: canonical,
        name: review.title,
        headline: review.h1 || review.title,
        description: review.meta_description || review.summary,
        reviewBody: review.verdict || review.summary,
        datePublished: publishedDate,
        dateModified: updatedDate,
        image: review.hero_image_url || store.logo_url || undefined,
        author: { "@id": organizationId },
        publisher: { "@id": organizationId },
        itemReviewed: { "@type": "Organization", name: store.name },
        mainEntityOfPage: { "@id": articleId },
        citation: citedUrls.length ? citedUrls : undefined,
      },
      {
        "@type": "Article",
        "@id": articleId,
        url: canonical,
        headline: review.h1 || review.title,
        description: review.meta_description || review.summary,
        datePublished: publishedDate,
        dateModified: updatedDate,
        image: review.hero_image_url || store.logo_url || undefined,
        author: { "@id": organizationId },
        publisher: { "@id": organizationId },
        about: { "@type": "Organization", name: store.name },
        mainEntity: { "@id": reviewId },
        citation: citedUrls.length ? citedUrls : undefined,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.dsreviewhub.com/" },
          { "@type": "ListItem", position: 2, name: "Reviews", item: "https://www.dsreviewhub.com/#review-library" },
          { "@type": "ListItem", position: 3, name: store.name, item: canonical },
        ],
      },
    ];

    if (faqs.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      });
    }

    return {
      "@context": "https://schema.org",
      "@graph": graph,
    };
  }, [canonical, faqs, publishedDate, review, sources, store, updatedDate]);

  usePageMeta({
    title: pageTitle,
    description: pageDescription,
    canonical,
    jsonLd,
    noindex: !isLoading && !review,
    image: review?.hero_image_url || store?.logo_url || undefined,
    imageAlt: review?.hero_image_alt || (store ? `${store.name} review` : undefined),
    type: "article",
    publishedTime: publishedDate || undefined,
    modifiedTime: updatedDate || undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-5xl py-12 sm:py-20">
          <div className="h-5 w-40 animate-pulse rounded bg-card" />
          <div className="mt-8 h-16 max-w-3xl animate-pulse rounded-2xl bg-card" />
          <div className="mt-5 h-24 max-w-2xl animate-pulse rounded-2xl bg-card" />
          <div className="mt-10 aspect-[16/7] animate-pulse rounded-3xl bg-card" />
        </main>
      </div>
    );
  }

  if (!review || !store) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container flex min-h-[68vh] max-w-4xl flex-col items-start justify-center py-16">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">DS Review Hub</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-foreground sm:text-6xl">This review is not published.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            We could not find a published editorial review at this address. Drafts and store listings are not shown as finished reviews.
          </p>
          <Link to="/#review-library" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-black">
            <ArrowLeft className="h-4 w-4" /> Back to the review library
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const headline = review.h1 || review.title;
  const heroImage = safeExternalUrl(review.hero_image_url || "");
  const updatedLabel = readableDate(updatedDate);
  const officialSite = safeExternalUrl(store.website_url || "");
  const sourceCount = sources.length;
  const trackOfficialVisit = () => {
    if (!officialSite) return;
    trackOutboundClick({
      store_name: store.name,
      store_slug: store.slug || slug,
      destination_url: officialSite,
      page_type: "review",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-border bg-[#08090a]">
          {heroImage && (
            <div className="absolute inset-y-0 right-0 hidden w-[48%] lg:block">
              <img src={heroImage} alt={review.hero_image_alt || `${store.name} review`} className="h-full w-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#08090a] via-[#08090a]/50 to-transparent" />
            </div>
          )}
          <div className="absolute left-[-10%] top-[-20%] h-80 w-80 rounded-full bg-primary/10 blur-[110px]" />
          <div className="container relative max-w-7xl py-12 sm:py-16 lg:py-24">
            <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link to="/#review-library" className="hover:text-foreground">Reviews</Link>
              <span>/</span>
              <span className="text-foreground">{store.name}</span>
            </nav>

            <div className="mt-9 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-primary">
                  <ShieldCheck className="h-4 w-4" /> Editorial review
                </span>
                {updatedLabel && (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="h-4 w-4" /> Updated {updatedLabel}
                  </span>
                )}
              </div>

              <div className="mt-7 flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={`${store.name} logo`} className="h-full w-full object-contain" />
                  ) : (
                    <StoreIcon className="h-6 w-6 text-black/45" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{store.name}</p>
                  <p className="text-xs text-muted-foreground">{store.category || "Brand review"}</p>
                </div>
              </div>

              <h1 className="mt-7 text-balance text-4xl font-black leading-[1.04] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
                {headline}
              </h1>
              {review.dek && <p className="mt-6 max-w-2xl text-lg leading-8 text-foreground/80 sm:text-xl">{review.dek}</p>}
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{review.summary}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                {officialSite && (
                  <a
                    href={officialSite}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    onClick={trackOfficialVisit}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-black transition-colors hover:bg-primary/90"
                  >
                    Visit {store.name} <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {store.slug && (
                  <Link
                    to={`/store/${store.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    Check current offers <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {heroImage && (
          <div className="container -mt-px max-w-7xl lg:hidden">
            <img src={heroImage} alt={review.hero_image_alt || `${store.name} review`} className="aspect-[16/9] w-full rounded-b-3xl object-cover" />
          </div>
        )}

        <div className="container grid max-w-7xl gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16 lg:py-20">
          <article className="min-w-0 space-y-12">
            <section className="rounded-3xl border border-primary/20 bg-primary/[0.06] p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                  <Quote className="h-4 w-4" /> Review snapshot
                </div>
                <Link to="/learn" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
                  How we review <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="mt-5 text-lg font-semibold leading-8 text-foreground sm:text-xl">{review.summary}</p>
              {review.best_for.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {review.best_for.map((item) => (
                    <span key={item} className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                      Best for: {item}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-background/80 p-4">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Last checked</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{updatedLabel || "Recently"}</p>
                </div>
                <div className="bg-background/80 p-4">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Sources listed</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{sourceCount || "Not listed"}</p>
                </div>
                <div className="bg-background/80 p-4">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Review scope</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{sections.length || "Core"} research areas</p>
                </div>
                <div className="bg-background/80 p-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Verdict type</p>
                  <p className="mt-1 text-sm font-bold text-foreground">Evidence-led</p>
                </div>
              </div>
            </section>

            {(review.pros.length > 0 || review.cons.length > 0) && (
              <section>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">The tradeoffs</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-foreground">What works—and what to check</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {review.pros.length > 0 && (
                    <div className="rounded-3xl border border-border bg-card p-6">
                      <h3 className="text-lg font-black text-foreground">What works well</h3>
                      <ul className="mt-5 space-y-3">
                        {review.pros.map((item) => (
                          <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.cons.length > 0 && (
                    <div className="rounded-3xl border border-border bg-card p-6">
                      <h3 className="text-lg font-black text-foreground">What to double-check</h3>
                      <ul className="mt-5 space-y-3">
                        {review.cons.map((item) => (
                          <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {sections.map((section, index) => (
              <section key={`${section.heading}-${index}`} className="border-t border-border pt-10">
                {section.heading && <h2 className="text-3xl font-black tracking-[-0.035em] text-foreground">{section.heading}</h2>}
                {section.body && <p className="mt-5 whitespace-pre-line text-base leading-8 text-muted-foreground">{section.body}</p>}
              </section>
            ))}

            {review.verdict && (
              <section className="rounded-3xl border border-primary/30 bg-[linear-gradient(135deg,rgba(3,255,136,0.12),rgba(3,255,136,0.03))] p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Final verdict</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-foreground">Our take on {store.name}</h2>
                <p className="mt-5 whitespace-pre-line text-base leading-8 text-foreground/80">{review.verdict}</p>
              </section>
            )}

            {faqs.length > 0 && (
              <section className="border-t border-border pt-10">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Questions answered</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-foreground">{store.name} review FAQ</h2>
                <div className="mt-6 space-y-3">
                  {faqs.map((faq) => (
                    <details key={faq.question} className="group overflow-hidden rounded-2xl border border-border bg-card">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold text-foreground [&::-webkit-details-marker]:hidden">
                        {faq.question}<HelpCircle className="h-5 w-5 shrink-0 text-muted-foreground group-open:text-primary" />
                      </summary>
                      <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {sources.length > 0 && (
              <section className="border-t border-border pt-8">
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">Sources and references</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {sources.map((source, index) => {
                    const sourceUrl = safeExternalUrl(source.url);
                    return (
                      <li key={`${source.url || source.label}-${index}`}>
                        {sourceUrl ? (
                          <a href={sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                            {source.label || sourceUrl}<ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="font-semibold text-foreground">{source.label}</span>
                        )}
                        {source.note ? ` — ${source.note}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-6">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-xl font-black tracking-[-0.025em] text-foreground">Make the next move</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Read the verdict first, then verify the final product details, price, and terms directly with the retailer.
              </p>
              {officialSite && (
                <a
                  href={officialSite}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  onClick={trackOfficialVisit}
                  className="mt-6 inline-flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-black text-black transition-colors hover:bg-primary/90"
                >
                  Visit official site <Globe2 className="h-4 w-4" />
                </a>
              )}
              {store.slug && (
                <Link to={`/store/${store.slug}`} className="mt-3 inline-flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  See current offers <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <p className="mt-5 border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">
                Affiliate disclosure: we may earn a commission from qualifying outbound visits or purchases. This does not change the review verdict.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StoreReviewPage;
