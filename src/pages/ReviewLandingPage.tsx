import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import usePageMeta from "@/hooks/usePageMeta";
import { getReviewLandingPage, type ReviewLandingPageData } from "@/lib/reviewLandingPages";
import { trackOutboundClick } from "@/lib/tracking";
import { cn } from "@/lib/utils";

const pageShell = "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10";

const defaultLabels = {
  verdictEyebrow: "Quick verdict",
  verdictHeading: "Why this angle works for paid traffic",
  highlightsHeading: "What to know before buying",
  productsHeading: "Product paths to test",
  prosHeading: "Pros for this campaign",
  consHeading: "Launch checks",
  faqHeading: "Campaign questions",
  couponTitle: "Current coupon",
};

const getTheme = (page?: ReviewLandingPageData) => {
  const fashion = page?.theme === "fashion";

  return {
    fashion,
    main: fashion ? "bg-[#fff8f3] text-[#251711]" : "bg-[#0b0d0f] text-white",
    header: fashion
      ? "border-[#2b1b14]/10 bg-[#fff8f3]/88 text-[#251711]"
      : "border-white/10 bg-black/55 text-white",
    mark: fashion ? "bg-[#251711] text-[#fff8f3]" : "bg-emerald-400 text-black",
    headerButton: fashion
      ? "border-[#251711]/15 text-[#251711] hover:border-[#d7573f] hover:text-[#a73827]"
      : "border-white/15 text-white hover:border-emerald-300 hover:text-emerald-200",
    heroOverlay: fashion
      ? "bg-[linear-gradient(90deg,rgba(37,23,17,0.94)_0%,rgba(37,23,17,0.78)_42%,rgba(37,23,17,0.34)_74%,rgba(37,23,17,0.08)_100%)]"
      : "bg-[linear-gradient(90deg,rgba(5,7,10,0.95)_0%,rgba(5,7,10,0.82)_37%,rgba(5,7,10,0.36)_70%,rgba(5,7,10,0.18)_100%)]",
    heroFade: fashion ? "from-[#fff8f3]" : "from-[#0b0d0f]",
    accentPill: fashion
      ? "border-[#f06a4f]/35 bg-[#f06a4f]/18 text-[#fff2ee]"
      : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    accentText: fashion ? "text-[#f79a53]" : "text-emerald-300",
    primaryButton: fashion
      ? "bg-[#f06a4f] text-white hover:bg-[#d95742]"
      : "bg-emerald-400 text-black hover:bg-emerald-300",
    outlineButton: fashion
      ? "border-white/28 bg-white/10 text-white hover:bg-white hover:text-[#251711]"
      : "border-white/25 bg-white/10 text-white hover:bg-white hover:text-black",
    metricBand: fashion ? "border-[#251711]/10 bg-[#f0f7f2]" : "border-white/10 bg-[#101316]",
    metricCard: fashion
      ? "border-[#251711]/10 bg-white text-[#251711]"
      : "border-white/10 bg-white/[0.03] text-white",
    bodyCard: fashion
      ? "border-[#251711]/10 bg-white text-[#251711]"
      : "border-white/10 bg-white/[0.035] text-white",
    bodyText: fashion ? "text-[#251711]/70" : "text-white/70",
    mutedText: fashion ? "text-[#251711]/58" : "text-white/58",
    darkText: fashion ? "text-[#251711]" : "text-white",
    lightBand: fashion ? "bg-[#eef7f1] text-[#251711]" : "bg-[#f4f7f4] text-[#101316]",
    couponCard: fashion
      ? "border-[#f06a4f]/35 bg-white text-[#251711] shadow-[0_24px_80px_rgba(70,40,25,0.14)]"
      : "border-emerald-300/30 bg-[#151a17] text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)]",
    couponIcon: fashion ? "bg-[#f06a4f]/12 text-[#d7573f]" : "bg-emerald-300/12 text-emerald-200",
    codeBox: fashion ? "border-[#f06a4f]/45 bg-[#fff3ee]" : "border-emerald-300/50 bg-black/28",
    codeValue: fashion ? "bg-[#251711] text-white" : "bg-white text-black",
    footer: fashion ? "border-[#251711]/10 bg-[#251711] text-white/62" : "border-white/10 bg-black text-white/50",
  };
};

const RatingStars = ({ rating, fashion }: { rating: number; fashion: boolean }) => (
  <div
    className={cn("flex items-center gap-1", fashion ? "text-[#f06a4f]" : "text-emerald-300")}
    aria-label={`${rating} out of 5`}
  >
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={cn(
          "h-4 w-4",
          index < Math.round(rating) ? "fill-current" : fashion ? "text-[#251711]/18" : "text-white/25",
        )}
      />
    ))}
  </div>
);

const ReviewLandingPage = () => {
  const { slug } = useParams();
  const page = getReviewLandingPage(slug);
  const [copied, setCopied] = useState(false);
  const theme = getTheme(page);
  const labels = { ...defaultLabels, ...page?.sectionLabels };
  const heroProducts = page?.products.filter((product) => product.image).slice(0, 4) ?? [];
  const hasCouponCode = Boolean(page && !["NO CODE", "NONE", "N/A"].includes(page.couponCode.toUpperCase()));

  const jsonLd = useMemo(() => {
    if (!page) return undefined;

    return {
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: {
        "@type": "Product",
        name: page.productName,
        brand: {
          "@type": "Brand",
          name: page.brandName,
        },
      },
      author: {
        "@type": "Organization",
        name: "DS Review Hub",
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: page.rating,
        bestRating: 5,
      },
      name: `${page.productName} review`,
      reviewBody: page.verdict,
    };
  }, [page]);

  usePageMeta({
    title: page ? `${page.productName} Review | DS Review Hub` : "Review Not Found | DS Review Hub",
    description: page
      ? page.subhead
      : "The requested DS Review Hub review landing page could not be found.",
    canonical: page ? `https://www.dsreviewhub.com/reviews/${page.slug}` : undefined,
    jsonLd,
    noindex: true,
  });

  if (!page) {
    return (
      <main className="min-h-screen bg-[#0b0d0f] text-white">
        <div className={`${pageShell} flex min-h-screen flex-col items-start justify-center gap-6`}>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            DS Review Hub Reviews
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-normal text-white sm:text-5xl">
            This review landing page is not published yet.
          </h1>
          <Button asChild className="bg-emerald-400 text-black hover:bg-emerald-300">
            <Link to="/">Back to DS Review Hub</Link>
          </Button>
        </div>
      </main>
    );
  }

  const handleCopy = async () => {
    if (!hasCouponCode) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(page.couponCode);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = page.couponCode;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const trackMerchantVisit = (destinationUrl: string) => {
    trackOutboundClick({
      store_name: page.brandName,
      store_slug: page.slug,
      destination_url: destinationUrl,
      page_type: "review",
    });
  };

  return (
    <main className={cn("min-h-screen", theme.main)}>
      <header className={cn("fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl", theme.header)}>
        <div className={`${pageShell} flex h-16 items-center justify-between gap-4`}>
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-black", theme.mark)}>
              DS
            </span>
            <span className="truncate text-sm font-semibold sm:text-base">DS Review Hub Reviews</span>
          </Link>
          <a
            href="#coupon"
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
              theme.headerButton,
            )}
          >
            <BadgePercent className="h-4 w-4" />
            <span className="hidden sm:inline">{labels.couponTitle}</span>
          </a>
        </div>
      </header>

      <section className="relative isolate flex min-h-[86svh] items-end overflow-hidden pt-24 text-white">
        <img
          src={page.heroImage}
          alt={page.heroImageAlt ?? `${page.productName} review hero image`}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className={cn("absolute inset-0 -z-10", theme.heroOverlay)} />
        <div className={cn("absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t to-transparent", theme.heroFade)} />

        <div className={`${pageShell} pb-10 sm:pb-14 lg:pb-16`}>
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-white/84">
              <span className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-1 font-semibold", theme.accentPill)}>
                <ShieldCheck className="h-4 w-4" />
                {page.eyebrow}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className={cn("h-4 w-4", theme.accentText)} />
                {page.updatedLabel}
              </span>
            </div>

            <h1 className="text-balance text-4xl font-black leading-[1.03] tracking-normal text-white sm:text-5xl lg:text-7xl">
              {page.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
              {page.subhead}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                asChild
                size="lg"
                className={cn("h-12 rounded-md px-6 text-base font-black", theme.primaryButton)}
              >
                <a href="#coupon">
                  {hasCouponCode ? "View Coupon" : "View Deal"}
                  <ChevronRight className="h-5 w-5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className={cn("h-12 rounded-md px-6 text-base font-semibold", theme.outlineButton)}
              >
                <a href={page.affiliateUrl} target="_blank" rel="noreferrer sponsored" onClick={() => trackMerchantVisit(page.affiliateUrl)}>
                  {page.primaryCta}
                  <ExternalLink className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>

          {heroProducts.length > 0 && (
            <div className="mt-10 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4">
              {heroProducts.map((product) => (
                <a
                  key={product.name}
                  href={product.url ?? page.affiliateUrl}
                  target="_blank"
                  rel="noreferrer sponsored"
                  onClick={() => trackMerchantVisit(product.url ?? page.affiliateUrl)}
                  className="group overflow-hidden rounded-md border border-white/16 bg-white/10 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/45"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-black/20">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-black text-white">{product.name}</p>
                    <p className="mt-1 text-xs font-semibold text-white/72">
                      {product.price}
                      {product.compareAtPrice && (
                        <span className="ml-2 text-white/45 line-through">{product.compareAtPrice}</span>
                      )}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={cn("border-y", theme.metricBand)}>
        <div className={`${pageShell} grid gap-4 py-6 md:grid-cols-3`}>
          {page.metrics.map((metric) => (
            <div key={metric.label} className={cn("rounded-md border p-5", theme.metricCard)}>
              <p className={cn("text-sm font-semibold", theme.accentText)}>{metric.label}</p>
              <p className={cn("mt-2 text-2xl font-black", theme.darkText)}>{metric.value}</p>
              <p className={cn("mt-2 text-sm leading-6", theme.mutedText)}>{metric.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${pageShell} grid gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-20`}>
        <div className="space-y-8">
          {page.trustSnapshot && (
            <section className={cn("rounded-md border p-6", theme.bodyCard)}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", theme.accentText)}>
                    Trust snapshot
                  </p>
                  <h2 className={cn("mt-3 text-3xl font-black tracking-normal", theme.darkText)}>
                    {page.trustSnapshot.score} on {page.trustSnapshot.sourceName}
                  </h2>
                  <p className={cn("mt-3 max-w-3xl leading-7", theme.bodyText)}>
                    {page.trustSnapshot.summary}
                  </p>
                </div>
                <a
                  href={page.trustSnapshot.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex shrink-0 items-center gap-2 rounded-md border px-4 py-2 text-sm font-black", theme.headerButton)}
                >
                  Source
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <div className={cn("rounded-md border p-4", theme.metricCard)}>
                  <p className={cn("text-sm font-semibold", theme.mutedText)}>{page.trustSnapshot.scoreLabel}</p>
                  <p className={cn("mt-1 text-xl font-black", theme.darkText)}>{page.trustSnapshot.score}</p>
                </div>
                <div className={cn("rounded-md border p-4", theme.metricCard)}>
                  <p className={cn("text-sm font-semibold", theme.mutedText)}>Volume</p>
                  <p className={cn("mt-1 text-xl font-black", theme.darkText)}>{page.trustSnapshot.reviewCount}</p>
                </div>
                {page.trustSnapshot.distribution.map((item) => (
                  <div key={item.label} className={cn("rounded-md border p-4", theme.metricCard)}>
                    <p className={cn("text-sm font-semibold", theme.mutedText)}>{item.label}</p>
                    <p className={cn("mt-1 text-xl font-black", theme.darkText)}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p className={cn("mt-4 text-xs leading-5", theme.mutedText)}>
                {page.trustSnapshot.checkedLabel}. Review themes are summarized from public source data.
              </p>
            </section>
          )}

          <section>
            <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", theme.accentText)}>
              {labels.verdictEyebrow}
            </p>
            <h2 className={cn("mt-3 max-w-3xl text-3xl font-black tracking-normal sm:text-4xl", theme.darkText)}>
              {labels.verdictHeading}
            </h2>
            <p className={cn("mt-5 max-w-3xl text-lg leading-8", theme.bodyText)}>{page.verdict}</p>
          </section>

          <section>
            <h2 className={cn("text-2xl font-black tracking-normal sm:text-3xl", theme.darkText)}>
              {labels.highlightsHeading}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {page.highlights.map((highlight) => (
                <div key={highlight} className={cn("rounded-md border p-5", theme.bodyCard)}>
                  <CheckCircle2 className={cn("h-5 w-5", theme.accentText)} />
                  <p className={cn("mt-4 leading-7", theme.bodyText)}>{highlight}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className={cn("text-2xl font-black tracking-normal sm:text-3xl", theme.darkText)}>
              {labels.productsHeading}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {page.products.map((product) => (
                <article key={product.name} className={cn("overflow-hidden rounded-md border", theme.bodyCard)}>
                  {product.image && (
                    <a href={product.url ?? page.affiliateUrl} target="_blank" rel="noreferrer sponsored" onClick={() => trackMerchantVisit(product.url ?? page.affiliateUrl)}>
                      <div className="aspect-[4/5] overflow-hidden bg-black/10">
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                      </div>
                    </a>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {product.badge && (
                          <p className={cn("mb-2 text-xs font-black uppercase tracking-[0.16em]", theme.accentText)}>
                            {product.badge}
                          </p>
                        )}
                        <h3 className={cn("text-lg font-black", theme.darkText)}>{product.name}</h3>
                        <p className={cn("mt-2 text-sm font-semibold", theme.accentText)}>{product.fit}</p>
                      </div>
                      {product.price && (
                        <div className="shrink-0 text-right">
                          <p className={cn("text-lg font-black", theme.darkText)}>{product.price}</p>
                          {product.compareAtPrice && (
                            <p className={cn("text-sm line-through", theme.mutedText)}>{product.compareAtPrice}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <p className={cn("mt-4 leading-7", theme.bodyText)}>{product.note}</p>
                    <Button
                      asChild
                      className={cn("mt-5 h-10 rounded-md px-4 text-sm font-black", theme.primaryButton)}
                    >
                      <a href={product.url ?? page.affiliateUrl} target="_blank" rel="noreferrer sponsored" onClick={() => trackMerchantVisit(product.url ?? page.affiliateUrl)}>
                        <ShoppingBag className="h-4 w-4" />
                        View item
                      </a>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside id="coupon" className="lg:sticky lg:top-24 lg:self-start">
          <div className={cn("rounded-md border p-5", theme.couponCard)}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={cn("text-sm font-semibold", theme.accentText)}>{labels.couponTitle}</p>
                <h2 className={cn("mt-2 text-2xl font-black", theme.darkText)}>{page.brandName}</h2>
              </div>
              <div className={cn("rounded-md p-3", theme.couponIcon)}>
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <div className={cn("mt-5 rounded-md border border-dashed p-4", theme.codeBox)}>
              <p className={cn("text-sm", theme.mutedText)}>{page.couponLabel}</p>
              <div className="mt-3 flex items-stretch gap-2">
                <div className={cn("flex min-h-12 min-w-0 flex-1 items-center rounded-md px-4 font-mono text-lg font-black tracking-[0.12em]", theme.codeValue)}>
                  <span className="truncate">{page.couponCode}</span>
                </div>
                {hasCouponCode && (
                  <Button
                    type="button"
                    aria-label="Copy coupon code"
                    onClick={handleCopy}
                    className={cn("h-12 w-12 shrink-0 rounded-md p-0", theme.primaryButton)}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                )}
              </div>
              <p className={cn("mt-3 text-sm font-semibold", theme.accentText)}>
                {hasCouponCode
                  ? copied
                    ? "Code copied"
                    : "Copy code, then continue to checkout"
                  : "No verified code in this test; compare the live sale price at checkout"}
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className={cn("mt-5 h-12 w-full rounded-md text-base font-black", theme.primaryButton)}
            >
              <a href={page.affiliateUrl} target="_blank" rel="noreferrer sponsored" onClick={() => trackMerchantVisit(page.affiliateUrl)}>
                {page.primaryCta}
                <ExternalLink className="h-5 w-5" />
              </a>
            </Button>

            <div className={cn("mt-5 rounded-md border p-4", theme.metricCard)}>
              <div className="flex items-center gap-3">
                <RatingStars rating={page.rating} fashion={theme.fashion} />
                <span className={cn("text-sm font-semibold", theme.darkText)}>{page.rating.toFixed(1)} / 5</span>
              </div>
              <p className={cn("mt-2 text-sm", theme.mutedText)}>{page.ratingLabel}</p>
            </div>

            <p className={cn("mt-5 text-xs leading-5", theme.mutedText)}>
              Disclosure: DS Review Hub may earn a commission when shoppers use links on this page.
              Coupon availability, prices, product availability, and return terms can change.
            </p>
          </div>
        </aside>
      </section>

      <section className={cn("py-14 lg:py-20", theme.lightBand)}>
        <div className={`${pageShell} grid gap-6 lg:grid-cols-2`}>
          <div className="rounded-md border border-black/10 bg-white p-6">
            <h2 className="text-2xl font-black tracking-normal">{labels.prosHeading}</h2>
            <div className="mt-5 space-y-4">
              {page.pros.map((pro) => (
                <div key={pro} className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="leading-7 text-black/72">{pro}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-black/10 bg-white p-6">
            <h2 className="text-2xl font-black tracking-normal">{labels.consHeading}</h2>
            <div className="mt-5 space-y-4">
              {page.cons.map((con) => (
                <div key={con} className="flex gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
                  <p className="leading-7 text-black/72">{con}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${pageShell} py-14 lg:py-20`}>
        <div className="max-w-3xl">
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", theme.accentText)}>
            FAQ
          </p>
          <h2 className={cn("mt-3 text-3xl font-black tracking-normal sm:text-4xl", theme.darkText)}>
            {labels.faqHeading}
          </h2>
        </div>
        <div className="mt-8 grid gap-4">
          {page.faqs.map((faq) => (
            <article key={faq.question} className={cn("rounded-md border p-6", theme.bodyCard)}>
              <h3 className={cn("text-xl font-black", theme.darkText)}>{faq.question}</h3>
              <p className={cn("mt-3 leading-7", theme.bodyText)}>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className={cn("border-t py-8", theme.footer)}>
        <div className={`${pageShell} flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between`}>
          <p>DS Review Hub Reviews</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/disclosure" className="transition hover:text-white">
              Disclosure
            </Link>
            <Link to="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link to="/terms" className="transition hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default ReviewLandingPage;
