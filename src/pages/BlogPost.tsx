import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import BlogCouponCard, { type BlogCouponOffer } from "@/components/BlogCouponCard";
import InsightVisual from "@/components/InsightVisual";
import { extractCouponShortcodes, shortcodeKey, splitBlogContent } from "@/lib/blogCouponShortcodes";
import { cleanBlogText, ensureBlogContentDepth, extractBlogFaqItems } from "@/lib/blogSeo";

const hasUsableCode = (coupon: any) =>
  Boolean(coupon?.code && String(coupon.code).trim() && String(coupon.code).toUpperCase() !== "NOCODE");

const cleanOfferText = (value: unknown, maxLength = 180) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).replace(/\s+\S*$/, "")}...`;
};

const couponOfferLabel = (coupon: any) =>
  cleanOfferText(coupon?.discount_value || (hasUsableCode(coupon) ? "Promo code" : "Deal"), 80)
    .replace(/^deal\s+/i, "")
    .replace(/^code\s+/i, "")
    .trim();

const percentValue = (value: unknown) => {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeBlogOfferDescription = (coupon: any, storeName: string) => {
  const label = couponOfferLabel(coupon);
  const details = cleanOfferText(coupon?.description || coupon?.title, 170);
  let safeDetails = details;

  if (hasUsableCode(coupon) && /\b(no promo code needed|no code needed|automatically applied|automatic discount|discount applied)\b/i.test(details)) {
    safeDetails = "";
  }
  if (hasUsableCode(coupon) && /\b(enter|use|apply|copy)\s+(promo\s+)?code\b/i.test(details)) {
    safeDetails = "";
  }

  const labelPercent = percentValue(label);
  const detailsPercent = percentValue(details);
  if (labelPercent !== null && detailsPercent !== null && Math.abs(labelPercent - detailsPercent) >= 1) {
    safeDetails = "";
  }

  if (hasUsableCode(coupon)) {
    const codeText = coupon?.code ? ` Enter code ${cleanOfferText(coupon.code, 40)} at checkout.` : "";
    const detailText = safeDetails ? ` ${safeDetails}` : "";
    return cleanOfferText(
      `Use this ${storeName} promo code to get ${label}.${codeText}${detailText} Confirm the final discount before ordering.`,
      260
    );
  }

  const detailText = safeDetails ? ` ${safeDetails}` : "";
  return cleanOfferText(
    `Open this ${storeName} deal for ${label}.${detailText} No promo code may be needed, but confirm checkout terms before ordering.`,
    260
  );
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const couponShortcodes = useMemo(() => extractCouponShortcodes(post?.content || ""), [post?.content]);
  const couponShortcodeSignature = useMemo(
    () => couponShortcodes.map((shortcode) => `${shortcode.storeSlug}:${shortcode.code || ""}`).join("|"),
    [couponShortcodes]
  );

  const { data: blogCouponOffers = {} } = useQuery({
    queryKey: ["blog-coupon-shortcodes", slug, couponShortcodeSignature],
    queryFn: async () => {
      const storeSlugs = Array.from(new Set(couponShortcodes.map((shortcode) => shortcode.storeSlug))).filter(Boolean);
      if (storeSlugs.length === 0) return {};

      const { data: stores, error: storeError } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, website_url")
        .in("slug", storeSlugs)
        .eq("is_active", true);

      if (storeError) throw storeError;
      if (!stores?.length) return {};

      const storeIds = stores.map((store) => store.id);
      const { data: coupons, error: couponError } = await (supabase as any)
        .from("coupons")
        .select("id, store_id, title, description, code, discount_value, url, is_active, is_verified, sort_order")
        .in("store_id", storeIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (couponError) throw couponError;

      const couponsByStore = new Map<string, any[]>();
      (coupons || []).forEach((coupon: any) => {
        if (!couponsByStore.has(coupon.store_id)) couponsByStore.set(coupon.store_id, []);
        couponsByStore.get(coupon.store_id)!.push(coupon);
      });

      const offers: Record<string, BlogCouponOffer> = {};
      couponShortcodes.forEach((shortcode) => {
        const store = stores.find((item) => item.slug === shortcode.storeSlug);
        if (!store) return;

        const storeCoupons = couponsByStore.get(store.id) || [];
        const requestedCode = String(shortcode.code || "").trim().toUpperCase();
        const selectedCoupon = requestedCode
          ? storeCoupons.find((coupon) => String(coupon.code || "").trim().toUpperCase() === requestedCode)
          : storeCoupons.find(hasUsableCode) || storeCoupons[0];

        offers[shortcodeKey(shortcode)] = {
          id: selectedCoupon?.id,
          title: shortcode.label || selectedCoupon?.title || `${store.name} coupon codes`,
          description: selectedCoupon
            ? safeBlogOfferDescription(selectedCoupon, store.name)
            : `Browse current ${store.name} offers before checkout.`,
          code: selectedCoupon?.code || shortcode.code || null,
          discountValue: selectedCoupon?.discount_value || (selectedCoupon?.code || shortcode.code ? "Promo code" : "Deal"),
          url: selectedCoupon?.url || store.website_url,
          isVerified: selectedCoupon?.is_verified,
          storeName: store.name,
          storeSlug: store.slug,
          storeLogo: store.logo_url,
          storeUrl: store.website_url,
        };
      });

      return offers;
    },
    enabled: couponShortcodes.length > 0,
  });

  const blogDepthContext = useMemo(() => {
    const offers = Object.values(blogCouponOffers) as BlogCouponOffer[];
    const firstOffer = offers[0];
    return {
      storeName: firstOffer?.storeName,
      storeSlug: firstOffer?.storeSlug,
      codeCount: offers.filter((offer) => hasUsableCode(offer)).length,
      dealCount: offers.filter((offer) => !hasUsableCode(offer)).length,
      bestOffer: firstOffer?.discountValue,
      currentYear: new Date().getFullYear(),
    };
  }, [blogCouponOffers]);

  const isInsight = post?.content_type === "insight" || post?.tags?.includes("DS Insight");
  const displayContent = useMemo(
    () => isInsight ? (post?.content || "") : ensureBlogContentDepth(post?.content || "", blogDepthContext),
    [post?.content, blogDepthContext, isInsight]
  );

  const canonical = slug ? `https://www.dsreviewhub.com/insights/${slug}` : "https://www.dsreviewhub.com/insights";
  const faqItems = useMemo(() => extractBlogFaqItems(displayContent, post?.faqs, 8), [displayContent, post?.faqs]);
  const authorName = post?.author_name || "DS Review Hub Editorial Team";
  const modifiedAt = post?.reviewed_at || post?.updated_at || post?.published_at || post?.created_at;
  const sourceTrail = useMemo(() => {
    if (post?.source_url) {
      return { url: post.source_url, label: post.source_author || post.source_platform || "the linked source" };
    }
    if (!Array.isArray(post?.sources)) return null;
    const source = post.sources.find((item) => item && typeof item === "object" && !Array.isArray(item) && typeof item.url === "string");
    if (!source || typeof source !== "object" || Array.isArray(source) || typeof source.url !== "string") return null;
    return { url: source.url, label: typeof source.label === "string" ? source.label : "the linked source" };
  }, [post?.source_author, post?.source_platform, post?.source_url, post?.sources]);

  usePageMeta({
    title: post ? (post.meta_title || `${post.title} - DS Review Hub Insights`) : "Insights - DS Review Hub",
    description: post?.meta_description || post?.excerpt || "Read original analysis and practical ideas from DS Review Hub.",
    canonical,
    image: post?.image_url || undefined,
    imageAlt: post?.hero_image_alt || post?.title,
    type: "article",
    publishedTime: post?.published_at || post?.created_at,
    modifiedTime: modifiedAt || undefined,
    jsonLd: post ? {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          "@id": canonical,
          mainEntityOfPage: canonical,
          headline: post.title,
          description: post.meta_description || post.excerpt || "",
          image: post.image_url || undefined,
          datePublished: post.published_at || post.created_at,
          dateModified: modifiedAt,
          author: {
            "@type": "Organization",
            name: authorName,
            url: "https://www.dsreviewhub.com",
          },
          publisher: {
            "@type": "Organization",
            name: "DS Review Hub",
            url: "https://www.dsreviewhub.com",
          },
          articleSection: post.category || undefined,
          keywords: Array.isArray(post.tags) ? post.tags.join(", ") : undefined,
          articleBody: cleanBlogText(displayContent, 5000),
          inLanguage: "en-US",
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.dsreviewhub.com" },
            { "@type": "ListItem", position: 2, name: "Insights", item: "https://www.dsreviewhub.com/insights" },
            { "@type": "ListItem", position: 3, name: post.title, item: canonical },
          ],
        },
        ...(faqItems.length
          ? [{
              "@type": "FAQPage",
              mainEntity: faqItems.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            }]
          : []),
      ],
    } : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Post not found</h1>
          <a href="/insights" className="text-primary hover:underline">← Back to insights</a>
        </div>
      </div>
    );
  }

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  const renderInlineMarkdown = (value: string) => {
    const nodes: React.ReactNode[] = [];
    const tokenRe = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRe.exec(value)) !== null) {
      if (match.index > lastIndex) nodes.push(value.slice(lastIndex, match.index));
      if (match[1] && match[2]) {
        const url = match[2];
        const isExternal = url.startsWith("http");
        nodes.push(
          <a key={`${url}-${match.index}`} href={url} target={isExternal ? "_blank" : undefined} rel={isExternal ? "nofollow sponsored noopener" : undefined} className="font-semibold text-primary hover:underline">
            {match[1]}
          </a>
        );
      } else if (match[3]) {
        nodes.push(<strong key={`strong-${match.index}`} className="font-bold text-foreground">{match[3]}</strong>);
      } else if (match[4]) {
        nodes.push(<code key={`code-${match.index}`} className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.92em] text-foreground">{match[4]}</code>);
      } else if (match[5]) {
        nodes.push(<em key={`em-${match.index}`}>{match[5]}</em>);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) nodes.push(value.slice(lastIndex));
    return nodes.length ? nodes : value;
  };

  // Markdown-like rendering for crawler parity with the prerendered HTML.
  const renderMarkdownBlocks = (content: string, keyPrefix: string) => {
    const output: React.ReactNode[] = [];
    let paragraph: string[] = [];
    let listItems: string[] = [];
    let listType: "ul" | "ol" | null = null;
    let index = 0;

    const nextKey = () => `${keyPrefix}-${index++}`;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      output.push(
        <p key={nextKey()} className="text-sm leading-relaxed text-muted-foreground mb-4">
          {renderInlineMarkdown(paragraph.join(" "))}
        </p>
      );
      paragraph = [];
    };

    const flushList = () => {
      if (!listType || !listItems.length) return;
      const ListTag = listType;
      output.push(
        <ListTag
          key={nextKey()}
          className={`mb-4 space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground ${listType === "ol" ? "list-decimal" : "list-disc"}`}
        >
          {listItems.map((line) => <li key={line}>{renderInlineMarkdown(line)}</li>)}
        </ListTag>
      );
      listType = null;
      listItems = [];
    };

    const flushAll = () => {
      flushParagraph();
      flushList();
    };

    content.replace(/\r\n/g, "\n").split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        flushAll();
        return;
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushAll();
        const level = headingMatch[1].length;
        if (level >= 3) {
          output.push(<h3 key={nextKey()} className="text-lg font-bold text-foreground mt-6 mb-2">{renderInlineMarkdown(headingMatch[2])}</h3>);
        } else {
          output.push(<h2 key={nextKey()} className="text-xl font-bold text-foreground mt-8 mb-3">{renderInlineMarkdown(headingMatch[2])}</h2>);
        }
        return;
      }

      const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        flushParagraph();
        const nextType = unorderedMatch ? "ul" : "ol";
        if (listType && listType !== nextType) flushList();
        listType = nextType;
        listItems.push((unorderedMatch || orderedMatch)![1]);
        return;
      }

      flushList();
      paragraph.push(line.replace(/^>\s?/, ""));
    });

    flushAll();
    return output;
  };

  const renderContent = (content: string) => {
    return splitBlogContent(content).map((part, i) => {
      if (part.type === "markdown") return renderMarkdownBlocks(part.value, `md-${i}`);
      const offer = blogCouponOffers[shortcodeKey(part.shortcode)];
      if (!offer) {
        return (
          <p key={`coupon-missing-${i}`} className="my-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Coupon offer is being prepared.
          </p>
        );
      }
      return <BlogCouponCard key={`coupon-${i}`} offer={offer} blogSlug={slug} />;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="container max-w-3xl py-12 space-y-6">
        <a href="/insights" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to insights
        </a>

        <InsightVisual src={post.image_url} alt={post.hero_image_alt || post.title} category={post.category} eager className="aspect-video rounded-2xl" />

        <div className="space-y-3">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
          <h1 className="text-2xl md:text-4xl font-extrabold text-foreground">{post.title}</h1>
          <p className="text-sm text-muted-foreground">
            By {authorName}{formattedDate ? ` • ${formattedDate}` : ""}
          </p>
        </div>

        {sourceTrail && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Source trail:</span>{" "}
            This original DS Review Hub analysis was informed by{" "}
            <a href={sourceTrail.url} target="_blank" rel="nofollow noopener" className="font-semibold text-primary hover:underline">
              {sourceTrail.label}
            </a>.
          </div>
        )}

        <div className="border-t border-border pt-8">
          {renderContent(displayContent)}
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
