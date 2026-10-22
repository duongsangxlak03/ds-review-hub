import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Store as StoreIcon, ExternalLink, CheckCircle, Clock, ArrowRight, Tag, HelpCircle, Info, ChevronDown, ShieldCheck, Globe, ImageIcon, ZoomIn, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import StorePageSkeleton from "@/components/StorePageSkeleton";
import { useState, useMemo, useRef, useEffect } from "react";
import usePageMeta from "@/hooks/usePageMeta";
import { trackCopyCode, trackCouponClick, trackOutboundClick, trackStorePageView } from "@/lib/tracking";
import { openBackgroundTab } from "@/lib/openBackgroundTab";
import { handoffToCouponRecords, handoffToStoreRecord, readPendingCouponHandoff, setPendingCouponHandoff } from "@/lib/couponHandoff";
import { formatRelativeTime } from "@/lib/couponActivity";
import { prefetchCouponReveal } from "@/lib/prefetchCouponReveal";
import { useCouponReveal } from "@/contexts/CouponRevealContext";
import { moneyPageGuideForStore } from "@/lib/moneyPageGuides";

type StoreTab = "codes" | "review" | "deals" | "faq";

interface StoreReviewSection {
  heading?: string;
  body?: string;
  cta_after?: boolean;
}

interface StoreReviewFaq {
  question?: string;
  answer?: string;
}

interface StoreReviewSource {
  label?: string;
  url?: string;
  note?: string;
}

interface UseCodeTip {
  code?: string;
  affiliate_url?: string;
  image_url?: string;
  preview_image_url?: string;
  thumbnail_url?: string;
  caption?: string;
}

const asObjectArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value.filter((item) => Boolean(item) && typeof item === "object") as T[]) : [];

const ARTICLE_TITLE_PATTERN = /^(why|what|how|when|where|does|do|can|should|is|are)\b|has changed|math explains|actually costs/i;
const PERSON_NAME_TITLE_PATTERN = /^[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+){1,2}$/;
const OFFER_TITLE_PATTERN = /(off|save|deal|coupon|promo|discount|sale|free|sitewide|storewide|entire order|shipping|clearance|gift|buy|%|\$)/i;

const hasUsableCouponCode = (coupon: any) =>
  Boolean(coupon?.code && String(coupon.code).trim() && String(coupon.code).toUpperCase() !== "NOCODE");

const offerLabel = (coupon: any) => {
  const rawLabel = coupon?.discount_value || (hasUsableCouponCode(coupon) ? "Promo code" : "Deal");
  return String(rawLabel)
    .replace(/^deal\s+/i, "")
    .replace(/^code\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

const cleanOfferText = (value: unknown) =>
  String(value || "")
    .replace(/^deal\s+/i, "")
    .replace(/^code\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

const formatOfferNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));

const parseOfferValue = (value: unknown) => {
  const label = cleanOfferText(value);
  if (!label) return null;

  const percent = label.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) {
    const amount = Number(percent[1]);
    return amount > 0 ? { kind: "percent", amount, label: `${formatOfferNumber(amount)}% Off` } : null;
  }

  const dollars = label.match(/\$\s*(\d+(?:\.\d+)?)/) || label.match(/(\d+(?:\.\d+)?)\s*(?:usd|dollars?)\b/i);
  if (dollars) {
    const amount = Number(dollars[1]);
    return amount > 0 ? { kind: "dollar", amount, label: `$${formatOfferNumber(amount)} Off` } : null;
  }

  return null;
};

const formatStoreDisplayName = (value: unknown) => {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (!name) return "";

  const letters = name.replace(/[^A-Za-z]/g, "");
  const isAllCapsBrand = letters.length >= 5 && name === name.toUpperCase() && /[A-Z]/.test(name);
  if (!isAllCapsBrand) return name;

  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\b(Usa|Uk|Eu|Ai|Seo|Api|Usb|Gps|Led|Tv|Vpn|Cbd|Diy|B2b|B2c)\b/g, (match) => match.toUpperCase());
};

const bestOfferLabel = (coupons: any[]) => {
  const candidates = coupons
    .flatMap((coupon) => [coupon?.discount_value, coupon?.title, coupon?.description])
    .map(parseOfferValue)
    .filter(Boolean);

  const byAmountDesc = (a: NonNullable<ReturnType<typeof parseOfferValue>>, b: NonNullable<ReturnType<typeof parseOfferValue>>) =>
    b.amount - a.amount;

  const bestPercent = candidates.filter((item) => item.kind === "percent").sort(byAmountDesc)[0];
  if (bestPercent) return bestPercent.label;

  const bestDollar = candidates.filter((item) => item.kind === "dollar").sort(byAmountDesc)[0];
  if (bestDollar) return bestDollar.label;

  const explicitLabel = coupons
    .map((coupon) => cleanOfferText(coupon?.discount_value))
    .find((label) => label && !/^(promo code|deal)$/i.test(label));

  return explicitLabel || "current offers";
};

const seededNumber = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const seededRange = (seed: string, min: number, max: number) =>
  min + (seededNumber(seed) % (max - min + 1));

const couponActivitySignal = (coupon: any, index: number) => {
  const seed = `${coupon?.id || coupon?.code || index}-${index}`;
  return {
    lastUsed: `${seededRange(`${seed}-last-used`, 2, 23)}h ago`,
    usesToday: seededRange(`${seed}-uses-today`, 2, 8),
    health: coupon?.is_verified
      ? seededRange(`${seed}-verified-health`, 96, 99)
      : seededRange(`${seed}-listed-health`, 88, 95),
  };
};

const isLikelyCouponOffer = (coupon: any) => {
  if (hasUsableCouponCode(coupon)) return true;
  const title = String(coupon?.title || "").replace(/\s+/g, " ").trim();
  if (!title) return false;
  if (ARTICLE_TITLE_PATTERN.test(title)) return false;
  if (PERSON_NAME_TITLE_PATTERN.test(title) && !OFFER_TITLE_PATTERN.test(title)) return false;
  return Boolean(coupon?.discount_value || OFFER_TITLE_PATTERN.test(title));
};

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openCouponReveal } = useCouponReveal();
  const routeCouponParam = searchParams.get("coupon");
  const routeUseCodeTipParam = searchParams.get("tip");
  const bootCouponParam = typeof window !== "undefined" && window.__DS_COUPON_REVEAL?.path === window.location.pathname
    ? window.__DS_COUPON_REVEAL.coupon || null
    : null;
  const couponParam = routeCouponParam || bootCouponParam;
  const pendingCouponHandoff = useMemo(() => readPendingCouponHandoff(couponParam), [couponParam]);
  const initialStoreFromHandoff = useMemo(() => {
    if (!pendingCouponHandoff || pendingCouponHandoff.storeSlug !== slug) return null;
    return handoffToStoreRecord(pendingCouponHandoff);
  }, [pendingCouponHandoff, slug]);
  const initialCouponsFromHandoff = useMemo(() => {
    if (!pendingCouponHandoff || pendingCouponHandoff.storeSlug !== slug) return [];
    return handoffToCouponRecords(pendingCouponHandoff) as any[];
  }, [pendingCouponHandoff, slug]);
  const [isCouponRevealLoad] = useState(() => Boolean(couponParam));
  const [shouldLoadSecondaryData, setShouldLoadSecondaryData] = useState(false);
  const [expandedCoupons, setExpandedCoupons] = useState<Record<string, boolean>>({});
  const [selectedUseCodeTip, setSelectedUseCodeTip] = useState<UseCodeTip | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCoupons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["store", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    initialData: initialStoreFromHandoff || undefined,
    initialDataUpdatedAt: initialStoreFromHandoff ? pendingCouponHandoff?.createdAt || Date.now() : undefined,
  });

  const shouldUseInitialCouponsFromHandoff = Boolean(
    store?.id &&
    initialCouponsFromHandoff.length > 0 &&
    initialCouponsFromHandoff.some((coupon) => coupon.store_id === store.id)
  );

  const { data: rawCoupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["store-coupons", store?.id],
    queryFn: async () => {
      let { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("store_id", store!.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.warn("Lỗi fetch coupons, dùng fallback:", error);
        const fallback = await supabase
          .from("coupons")
          .select("*")
          .eq("store_id", store!.id)
          .eq("is_active", true);
        data = fallback.data;
      }
      return data || [];
    },
    enabled: !!store?.id,
    initialData: shouldUseInitialCouponsFromHandoff ? initialCouponsFromHandoff : undefined,
    initialDataUpdatedAt: shouldUseInitialCouponsFromHandoff ? pendingCouponHandoff?.createdAt || Date.now() : undefined,
  });

  const coupons = useMemo(() => {
    return rawCoupons.filter(isLikelyCouponOffer).sort((a, b) => {
      const aHasCode = hasUsableCouponCode(a) ? 0 : 1;
      const bHasCode = hasUsableCouponCode(b) ? 0 : 1;
      if (aHasCode !== bHasCode) return aHasCode - bHasCode;
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    });
  }, [rawCoupons]);

  const verifiedCouponsCount = useMemo(() => coupons.filter(c => c?.is_verified && hasUsableCouponCode(c)).length, [coupons]);
  const useCodeTips = useMemo(
    () => asObjectArray<UseCodeTip>(store?.use_code_tips)
      .filter((tip) => typeof tip.image_url === "string" && tip.image_url.trim()),
    [store?.use_code_tips]
  );

  useEffect(() => {
    if (!routeUseCodeTipParam || useCodeTips.length === 0) return;

    const tipIndex = Number.parseInt(routeUseCodeTipParam, 10);
    const tip = useCodeTips[tipIndex];
    if (!tip) return;

    setSelectedUseCodeTip(tip);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tip");
    setSearchParams(nextParams, { replace: true });
  }, [routeUseCodeTipParam, searchParams, setSearchParams, useCodeTips]);

  const { data: deals = [] } = useQuery({
    queryKey: ["store-deals", store?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*")
        .eq("store_id", store!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: shouldLoadSecondaryData && !!store?.id,
  });

  const { data: storeReview } = useQuery({
    queryKey: ["store-review", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_reviews")
        .select("*")
        .eq("store_id", store!.id)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: shouldLoadSecondaryData && !!store?.id,
  });

  const { data: storeSavingsGuide } = useQuery({
    queryKey: ["store-savings-guide", store?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_savings_guides")
        .select("*")
        .eq("store_id", store!.id)
        .eq("status", "published")
        .maybeSingle();
      if (error) {
        console.warn("Store savings guide not available:", error.message || error);
        return null;
      }
      return data;
    },
    enabled: shouldLoadSecondaryData && !!store?.id,
  });

  const { data: similarStores = [] } = useQuery({
    queryKey: ["similar-stores", store?.id],
    queryFn: async () => {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url")
        .eq("is_active", true)
        .neq("id", store!.id)
        .limit(5);
      if (!stores || stores.length === 0) return [];
      const storeIds = stores.map(s => s.id);
      const { data: cpns } = await supabase
        .from("coupons")
        .select("store_id")
        .in("store_id", storeIds)
        .eq("is_active", true);
        
      const countMap: Record<string, number> = {};
      (cpns || []).forEach(c => { countMap[c.store_id] = (countMap[c.store_id] || 0) + 1; });
      return stores.map(s => ({ ...s, coupon_count: countMap[s.id] || 0 })).filter(s => s.coupon_count > 0);
    },
    enabled: shouldLoadSecondaryData && !!store?.id,
  });

  const { data: competitorStores = [] } = useQuery({
    queryKey: ["competitor-stores", store?.id],
    queryFn: async () => {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, website_url")
        .eq("is_active", true)
        .neq("id", store!.id)
        .limit(9);
      if (!stores || stores.length === 0) return [];
      const storeIds = stores.map(s => s.id);
      const { data: cpns } = await supabase
        .from("coupons")
        .select("id, store_id, title, description, code, discount_value")
        .in("store_id", storeIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
        
      const topCouponMap: Record<string, typeof cpns extends (infer T)[] | null ? T : never> = {};
      (cpns || []).forEach(c => { if (!topCouponMap[c.store_id]) topCouponMap[c.store_id] = c; });
      return stores
        .filter(s => topCouponMap[s.id])
        .map(s => ({ ...s, topCoupon: topCouponMap[s.id]! }));
    },
    enabled: shouldLoadSecondaryData && !!store?.id,
  });

  const [hasUnlockedStoreCodes, setHasUnlockedStoreCodes] = useState(() => Boolean(couponParam));
  const [activeTab, setActiveTab] = useState<StoreTab>("codes");
  const storeTabs = useMemo<StoreTab[]>(
    () => (storeReview ? ["codes", "review", "deals", "faq"] : ["codes", "deals", "faq"]),
    [storeReview]
  );

  const sectionRefs = {
    codes: useRef<HTMLDivElement>(null),
    review: useRef<HTMLDivElement>(null),
    deals: useRef<HTMLDivElement>(null),
    faq: useRef<HTMLDivElement>(null),
  };

  const scrollToSection = (tab: StoreTab) => {
    setActiveTab(tab);
    if (tab !== "codes") setShouldLoadSecondaryData(true);
    sectionRefs[tab].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [autoShown, setAutoShown] = useState(() => Boolean(couponParam && initialCouponsFromHandoff.length > 0));
  useEffect(() => {
    if (autoShown || coupons.length === 0) return;
    if (!couponParam) return;

    const target = coupons.find(c => c.id === couponParam);
    if (target) {
      openCouponReveal(target, {
        storeName: store?.name,
        storeLogo: store?.logo_url,
        storeUrl: target.url || store?.website_url,
        storeSlug: slug,
      });
      setAutoShown(true);
      if (routeCouponParam) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("coupon");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [coupons, autoShown, searchParams, setSearchParams, couponParam, routeCouponParam, openCouponReveal, store, slug]);

  useEffect(() => {
    if (shouldLoadSecondaryData) return;

    let idleId: number | null = null;
    const warmSecondaryData = () => {
      const requestIdle = (window as any).requestIdleCallback as
        | ((callback: () => void, options?: { timeout?: number }) => number)
        | undefined;

      if (requestIdle) {
        idleId = requestIdle(() => setShouldLoadSecondaryData(true), { timeout: 1200 });
        return;
      }

      setShouldLoadSecondaryData(true);
    };

    const timeoutId = window.setTimeout(warmSecondaryData, isCouponRevealLoad ? 700 : 1200);
    return () => {
      window.clearTimeout(timeoutId);
      if (idleId !== null) {
        const cancelIdle = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
        if (cancelIdle) cancelIdle(idleId);
      }
    };
  }, [isCouponRevealLoad, shouldLoadSecondaryData]);

  useEffect(() => {
    if (store) {
      trackStorePageView({ store_name: store.name, store_slug: slug, page_type: "store", category: store.category || undefined });
    }
  }, [store, slug]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const found = storeTabs.find((t) => sectionRefs[t].current === entry.target);
            if (found) setActiveTab(found);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    storeTabs.forEach((t) => {
      if (sectionRefs[t].current) observer.observe(sectionRefs[t].current!);
    });
    return () => observer.disconnect();
  }, [storeTabs]);

  const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const couponCodeCount = useMemo(() => coupons.filter(hasUsableCouponCode).length, [coupons]);
  const codeCoupons = useMemo(() => coupons.filter(hasUsableCouponCode), [coupons]);
  const couponDeals = useMemo(() => coupons.filter((coupon) => !hasUsableCouponCode(coupon)), [coupons]);
  const couponDealCount = coupons.length - couponCodeCount;
  const noCodeDealCount = couponDealCount + deals.length;
  const listedOfferCount = couponCodeCount + noCodeDealCount;
  const bestOffer = useMemo(() => bestOfferLabel(coupons), [coupons]);
  const hasRankedBestOffer = bestOffer !== "current offers";
  const moneyPageGuide = useMemo(() => {
    if (!store?.name) return undefined;
    return moneyPageGuideForStore({
      slug,
      storeName: store.name,
      category: store.category,
      bestOffer,
      couponCodeCount,
      noCodeDealCount,
      verifiedCouponCount: verifiedCouponsCount,
      customGuide: storeSavingsGuide,
    });
  }, [slug, store?.name, store?.category, bestOffer, couponCodeCount, noCodeDealCount, verifiedCouponsCount, storeSavingsGuide]);
  const reviewSections = useMemo(
    () => asObjectArray<StoreReviewSection>(storeReview?.content_sections),
    [storeReview?.content_sections]
  );
  const reviewFaqs = useMemo(
    () => asObjectArray<StoreReviewFaq>(storeReview?.faqs),
    [storeReview?.faqs]
  );
  const reviewSources = useMemo(
    () => asObjectArray<StoreReviewSource>(storeReview?.sources),
    [storeReview?.sources]
  );
  const primaryReviewCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === storeReview?.primary_coupon_id) || coupons[0],
    [coupons, storeReview?.primary_coupon_id]
  );
  const defaultMetaTitle = store ? `Today's ${store.name} Promo Codes & Deals - ${bestOffer} (${listedOfferCount} Offers) ${currentMonth} - DS Review Hub` : "Store - DS Review Hub";
  const defaultMetaDescription = store
    ? `Today's ${store.name} promo codes and deals: ${couponCodeCount} coupon code${couponCodeCount !== 1 ? "s" : ""}, ${noCodeDealCount} deal${noCodeDealCount !== 1 ? "s" : ""}, best discount ${bestOffer}. Updated ${currentMonth}.`
    : "Find promo codes, coupons, and deals at DS Review Hub.";
  const pageTitle = defaultMetaTitle;
  const pageDescription = defaultMetaDescription;

  usePageMeta({
    title: pageTitle,
    description: pageDescription,
    canonical: slug ? `https://www.dsreviewhub.com/store/${slug}` : undefined,
    jsonLd: store ? {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `https://www.dsreviewhub.com/store/${slug}`,
          url: `https://www.dsreviewhub.com/store/${slug}`,
          name: `Today's ${store.name} Promo Codes & Deals - ${bestOffer} (${listedOfferCount} Offers) ${currentMonth}`,
          description: `Today's ${store.name} promo codes, coupons, and deals for ${currentMonth}.`,
          primaryEntity: {
            "@type": "ItemList",
            name: `Today's ${store.name} promo codes and deals`,
            numberOfItems: coupons.length,
            itemListElement: coupons.slice(0, 10).map((c, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Offer",
                name: `${offerLabel(c)} ${store.name} ${hasUsableCouponCode(c) ? "Promo Code" : "Deal"}`,
                description: c.description || c.title,
                discount: offerLabel(c),
                validThrough: c.expiry_date || undefined,
              },
            })),
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `Does ${store.name} offer promo codes?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${store.name} currently has ${couponCodeCount} coupon code${couponCodeCount !== 1 ? "s" : ""} and ${noCodeDealCount} deal${noCodeDealCount !== 1 ? "s" : ""} listed on DS Review Hub.`,
              },
            },
            {
              "@type": "Question",
              name: `How do I use a ${store.name} coupon code?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Choose a listed ${store.name} offer, copy the promo code when one is available, then apply it at checkout before completing your order.`,
              },
            },
            ...(moneyPageGuide?.faqs || []).map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          ],
        },
      ],
    } : undefined,
  });

  if (storeLoading) {
    return <StorePageSkeleton />;
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-[1100px] py-20 text-center font-sans">
          <h1 className="text-2xl font-bold text-foreground mb-2">Store not found</h1>
          <p className="text-muted-foreground">We couldn't find this store.</p>
          <Button className="mt-4" asChild><a href="/">Go Home</a></Button>
        </div>
      </div>
    );
  }

  const faqs = [
    { q: `Does ${store.name} offer promo codes?`, a: `${store.name} currently has ${couponCodeCount} coupon code${couponCodeCount !== 1 ? "s" : ""} and ${noCodeDealCount} deal${noCodeDealCount !== 1 ? "s" : ""} listed on DS Review Hub.` },
    { q: `How do I use a ${store.name} promo code?`, a: `Copy the code, paste it at checkout on ${store.name}'s website, and confirm whether the discount applies to your order.` },
    { q: `Are these ${store.name} promo codes verified?`, a: `Offers marked verified were manually reviewed by DS Review Hub before being listed. Always confirm the final discount at checkout because retailer availability can change.` },
    { q: `What is the best ${store.name} coupon today?`, a: `The best listed ${store.name} offer is currently ${bestOffer}. Check the current offer list because discounts can change without notice.` },
    { q: `Why is my ${store.name} promo code not working?`, a: `A ${store.name} promo code may stop working if it expired, was entered incorrectly, requires a minimum purchase, or excludes items in your cart.` },
    { q: `How often does ${store.name} release new codes?`, a: `${store.name} may release new promo codes and deals throughout the year. Check the offer details and terms at checkout before ordering.` },
    ...(moneyPageGuide
      ? moneyPageGuide.faqs.map((faq) => ({ q: faq.question, a: faq.answer }))
      : [
          { q: `Does ${store.name} offer free shipping?`, a: `Shipping rules can change by cart value, destination, and product. Check the ${store.name} checkout page for current free shipping terms before ordering.` },
          { q: `Does ${store.name} have a student discount?`, a: `A dedicated ${store.name} student discount is not confirmed on this page. Students should compare the listed coupon codes and check whether the merchant has a separate student program.` },
          { q: `Does ${store.name} offer a military discount?`, a: `DS Review Hub does not currently confirm a separate ${store.name} military discount. If available, it is usually handled directly by the merchant.` },
          { q: `Can I use a ${store.name} coupon on sale items?`, a: `Some ${store.name} coupon codes may exclude sale, clearance, bundle, gift card, or limited-release items. Confirm the final checkout total before completing an order.` },
          { q: `Can I return an order after using a ${store.name} promo code?`, a: `Return eligibility depends on the ${store.name} return policy and the items purchased. A promo code may affect refund value, so review merchant return terms before ordering.` },
        ]),
  ];

  const revealStoreCoupon = (coupon: any) => {
    openCouponReveal(coupon, {
      storeName: coupon.stores?.name || store.name,
      storeLogo: coupon.stores?.logo_url || store.logo_url,
      storeUrl: coupon.url || coupon.stores?.website_url || store.website_url,
      storeSlug: slug,
    });
  };

  const displayStoreName = formatStoreDisplayName(store.name);
  const handleUseCodeTipClick = (tip: UseCodeTip, index: number) => {
    setSelectedUseCodeTip(tip);

    const affiliateUrl = tip.affiliate_url || codeCoupons.find((coupon) => coupon.url)?.url || store.website_url;
    if (!affiliateUrl) return;

    trackOutboundClick({
      store_name: store.name,
      store_slug: slug,
      destination_url: affiliateUrl,
      coupon_code: tip.code || undefined,
      page_type: "store",
    });
    openBackgroundTab(affiliateUrl, undefined, { tip: String(index) });
  };

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-clip"> 
      <Navbar />

      <div className="container max-w-[1180px] pt-4 pb-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">Shop</a>
          <span>/</span>
          <span className="text-foreground font-semibold">{displayStoreName}</span>
        </div>
      </div>

      <div className="lg:hidden container max-w-[1180px] pb-4">
        <div className="flex min-w-0 items-center gap-5">
          <div className="w-[116px] h-[116px] sm:w-32 sm:h-32 rounded-2xl bg-white p-2.5 flex items-center justify-center overflow-hidden shrink-0 border border-border shadow-sm">
            {store.logo_url ? (
              
              <img src={store.logo_url} alt={store.name} width={128} height={128} fetchPriority="high" className="h-auto max-h-full w-auto max-w-full rounded-[10px] object-contain" />
            ) : (
              <span className="text-4xl font-extrabold text-black">{store.name?.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="max-h-[116px] overflow-hidden text-[27px] font-bold text-foreground leading-[1.05] tracking-[-0.04em] [overflow-wrap:anywhere] sm:max-h-32 sm:text-[32px]">
              {displayStoreName} Promo Codes & Coupons {currentMonth}
            </h1>
          </div>
        </div>
        
        <div className="mt-4 flex min-w-0 items-center gap-x-2 overflow-x-auto pb-1 text-[14px] font-medium text-foreground/85 [-webkit-overflow-scrolling:touch]">
          <span className="flex shrink-0 items-center gap-1.5">
            <Tag className="h-4 w-4" />
            <span className="font-bold text-foreground">{couponCodeCount}</span>
            <span>Promo Codes</span>
          </span>
          <span className="shrink-0 text-muted-foreground/50">•</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            {hasRankedBestOffer ? (
              <>
                <span>Top Offer:</span>
                <span className="font-bold text-foreground">{bestOffer}</span>
              </>
            ) : (
              <>
                <span>Verified Codes:</span>
                <span className="font-bold text-foreground">{verifiedCouponsCount.toLocaleString()}</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="lg:hidden sticky top-0 bg-background z-10 border-b border-border mb-2">
        <div className="container max-w-[1180px] flex gap-7 overflow-x-auto scrollbar-hide px-3 sm:px-4">
          {storeTabs.map((tab) => {
            const labels: Record<StoreTab, string> = { codes: "Top codes", review: "Review", deals: "Best deals", faq: "FAQ" };
            return (
              <button
                key={tab}
                onClick={() => scrollToSection(tab)}
                className={`pb-2.5 pt-2.5 text-[15px] font-bold whitespace-nowrap transition-colors ${activeTab === tab ? "text-foreground border-b-2 border-primary" : "text-foreground/75 hover:text-foreground"}`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="container max-w-[1120px] pb-8 lg:pt-11">
        <div className="mb-4 hidden min-w-0 items-center gap-2 text-sm text-muted-foreground lg:flex">
          <a href="/" className="hover:text-foreground transition-colors">Shop</a>
          <span>/</span>
          <span className="text-foreground font-semibold truncate">{displayStoreName}</span>
        </div>

        <div className="store-desktop-shell relative">
          
          <aside className="store-desktop-rail hidden lg:block">
            <div className="rounded-[16px] bg-[#2f3133] p-4 shadow-sm">
              <div className="mb-4 rounded-[10px] bg-white p-2.5">
               <div className="aspect-[2.05/1] flex items-center justify-center overflow-hidden">
                  {store.logo_url ? (
                    
                    <img src={store.logo_url} alt={store.name} width={248} height={116} className="h-auto max-h-full w-auto max-w-full rounded-[10px] object-contain" />
                  ) : (
                    <span className="text-4xl font-black text-black">
                      {store.name?.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-[19px] font-semibold text-foreground leading-tight">{displayStoreName}</h2>
              </div>

              <div className="border-t border-[#53565b] mt-4 pt-4">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">{displayStoreName} Savings Intelligence</h3>
                <p className="text-[13px] text-foreground/90 leading-snug">
                  {displayStoreName} currently has {couponCodeCount} active promo code{couponCodeCount !== 1 ? "s" : ""} and {noCodeDealCount} no-code deal{noCodeDealCount !== 1 ? "s" : ""}.
                  {verifiedCouponsCount > 0 && <> {verifiedCouponsCount} code{verifiedCouponsCount !== 1 ? "s are" : " is"} manually verified.</>}
                  {coupons.length > 0 && <> The best listed offer is {bestOffer}.</>}
                </p>
              </div>

              <div className="border-t border-[#53565b] mt-4 pt-4">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">Top Savings Hacks</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-[13px] text-foreground/90 leading-snug [&>span:first-child]:hidden">
                    <span>📝</span>
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Check the listed offers above and confirm terms at checkout.</span>
                  </div>
                  {false && coupons.length > 0 && (
                    <div className="flex items-start gap-2 text-[11px] text-muted-foreground [&>span:first-child]:hidden">
                      <span>🔥</span>
                      <Tag className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>We're listing {coupons.length} current offer{coupons.length !== 1 ? "s" : ""} right now.</span>
                    </div>
                  )}
                </div>
              </div>

              {similarStores.length > 0 && (
                <div className="border-t border-[#53565b] mt-4 pt-4">
                  <h3 className="text-[13px] font-extrabold text-foreground mb-2.5">Similar Deals</h3>
                  <div className="space-y-2.5">
                    {similarStores.slice(0, 3).map((s) => (
                      <a key={s.id} href={`/store/${s.slug || s.id}`} className="flex items-center gap-2 text-[13px] font-bold text-foreground hover:text-primary transition-colors group">
                        <Tag className="h-3.5 w-3.5 text-foreground/80 shrink-0" />
                        <span className="flex-1 truncate">
                          {s.name}
                        </span>
                        <span className="text-primary underline underline-offset-2 shrink-0">{s.coupon_count} offers</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {false && store.description && (
                <div className="border-t border-[#3f3f46] py-4">
                  <h3 className="text-[13px] font-bold text-foreground mb-1">About</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{store.description}</p>
                </div>
              )}

              {store.website_url && (
                <a
                  href={store.website_url} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackOutboundClick({ store_name: store.name, store_slug: slug, destination_url: store.website_url!, page_type: "store" })}
                  className="mt-4 flex items-center justify-center w-full h-10 rounded-[10px] bg-[#363a3f] hover:bg-[#43484f] gap-2 text-xs font-semibold text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Shop at {displayStoreName}
                </a>
              )}
            </div>
          </aside>

          <div className="store-desktop-content min-w-0 w-full space-y-4 lg:space-y-2.5">
            
            <div className="hidden lg:block space-y-2.5 pt-0 pb-0">
              <h1 className="max-w-[980px] text-[44px] lg:text-[48px] xl:text-[52px] font-bold text-foreground tracking-normal leading-[1.08] text-balance">
                {displayStoreName} Promo Codes & Coupons {currentMonth}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[12px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{couponCodeCount.toLocaleString()}</span>
                  <span>Promo Codes</span>
                </span>
                <span className="text-[#3f3f46] text-[10px]">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {hasRankedBestOffer ? (
                    <>
                      <span>Top Offer:</span>
                      <span className="font-semibold text-foreground">{bestOffer}</span>
                    </>
                  ) : (
                    <>
                      <span>Verified Codes:</span>
                      <span className="font-semibold text-foreground">{verifiedCouponsCount.toLocaleString()}</span>
                    </>
                  )}
                </span>
                <span className="text-[#3f3f46] text-[10px]">•</span>
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{listedOfferCount.toLocaleString()}</span>
                  <span>Listed Offers</span>
                </span>
                <span className="text-[#3f3f46] text-[10px]">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Updated:</span>
                  <span className="font-semibold text-foreground">{formatRelativeTime(store.updated_at, "Recently")}</span>
                </span>
              </div>
            </div>

            <div className="store-sticky-tabs hidden lg:flex gap-7">
              {storeTabs.map((tab) => {
                const labels: Record<StoreTab, string> = { codes: "Top codes", review: "Review", deals: "Best deals", faq: "FAQ" };
                return (
                  <button
                    key={tab} onClick={() => scrollToSection(tab)}
                    className={`store-sticky-tab ${activeTab === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            <div ref={sectionRefs.codes} className="scroll-mt-20 lg:scroll-mt-32 space-y-3 lg:space-y-4">
              <div>
                <h2 className="text-[24px] sm:text-[27px] md:text-[31px] font-bold text-foreground tracking-[-0.035em] leading-[1.12] [overflow-wrap:anywhere]">
                  Today's {displayStoreName} promo codes & deals
                </h2>
                <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-[#3f3f46] bg-[#272a2e]/50 px-3 py-2.5">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-[13px] text-muted-foreground flex-1 truncate">
                    We are listing {listedOfferCount} offer{listedOfferCount !== 1 ? "s" : ""} for {displayStoreName}.{verifiedCouponsCount > 0 ? ` ${verifiedCouponsCount} code${verifiedCouponsCount !== 1 ? "s are" : " is"} marked verified.` : ""}
                  </p>
                  <button className="text-[12px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap flex items-center gap-0.5">
                    See more <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* TỐI ƯU CHỐNG GIẬT HÌNH: NẾU ĐANG TẢI THÌ HIỆN SKELETON */}
              {couponsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`rounded-[22px] border border-transparent bg-[#2d3033] p-3 flex flex-col gap-2 animate-pulse ${i === 1 ? 'mt-3' : ''}`}>
                      <div className="flex items-start gap-2.5 w-full">
                        <div className="w-10 h-10 rounded-[11px] bg-[#363a3f] shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-5 w-24 bg-[#363a3f] rounded" />
                          <div className="h-4 w-20 bg-[#363a3f] rounded" />
                        </div>
                        <div className="h-9 w-[92px] sm:w-[102px] rounded-xl bg-[#363a3f] shrink-0 ml-1" />
                      </div>
                      <div className="h-4 w-3/4 bg-[#363a3f] rounded mt-1" />
                      <div className="h-2 w-1/2 bg-[#363a3f] rounded mt-2" />
                    </div>
                  ))}
                </div>
              ) : codeCoupons.length > 0 ? (
                <div className="space-y-3">
                  {codeCoupons.map((coupon, i) => {
                    const isPromoCode = true;
                    const isExpanded = expandedCoupons[coupon.id];
                    const discountLabel = offerLabel(coupon);
                    const isStorewide = /storewide|sitewide|entire order/i.test(`${coupon.title || ""} ${coupon.description || ""}`);
                    const activitySignal = couponActivitySignal(coupon, i);

                    const handleCardClick = () => {
                      const affiliateUrl = coupon.url || store.website_url;
                      if (isPromoCode) {
                        setHasUnlockedStoreCodes(true);
                        if (affiliateUrl) {
                          setPendingCouponHandoff({
                            revealKey: coupon.id,
                            couponId: coupon.id,
                            code: coupon.code!,
                            title: coupon.title,
                            description: coupon.description,
                            discountValue: coupon.discount_value,
                            storeId: store.id,
                            storeName: store.name,
                            storeSlug: slug,
                            storeLogo: store.logo_url,
                            storeUrl: store.website_url,
                            destinationUrl: affiliateUrl,
                            pageType: "store",
                            storeSnapshot: store,
                            couponsSnapshot: coupons,
                          });
                        }
                        navigator.clipboard.writeText(coupon.code!).catch(() => undefined);
                        window.setTimeout(() => {
                          trackCopyCode({ store_name: store?.name, store_slug: slug, coupon_id: coupon.id, coupon_code: coupon.code!, position: i, page_type: "store" });
                        }, 0);
                        if (affiliateUrl) {
                          const opened = openBackgroundTab(affiliateUrl, coupon.id);
                          if (!opened) revealStoreCoupon(coupon);
                        } else {
                          revealStoreCoupon(coupon);
                        }
                      } else {
                        trackCouponClick({ store_name: store?.name, store_slug: slug, coupon_id: coupon.id, coupon_type: "deal", destination_url: affiliateUrl || "", position: i, page_type: "store" });
                        if (affiliateUrl) openBackgroundTab(affiliateUrl, coupon.id);
                      }
                    };

                    return (
                      <div key={coupon.id} className="relative group/card w-full">
                        
                        {i === 0 && isPromoCode && (
                          <div className="absolute -top-[12px] -left-[6px] z-20">
                            <div className="bg-primary text-black text-[11px] font-semibold px-3 py-[4px] rounded-r-md rounded-tl-md shadow-sm relative z-10">
                              Top pick
                            </div>
                            <div className="absolute top-full left-0 border-t-[6px] border-t-primary border-l-[6px] border-l-transparent brightness-50 z-0"></div>
                          </div>
                        )}
                        
                      <div 
                        onClick={handleCardClick}
                        className={`group rounded-[22px] border border-transparent bg-[#2d3033] p-3 sm:p-3.5 hover:border-primary/40 transition-colors shadow-sm flex min-w-0 flex-col gap-2 relative cursor-pointer w-full ${i === 0 ? 'mt-3' : ''}`}
                      >
                        
                        <div className="flex min-w-0 items-start gap-2.5 w-full">
                         <div className="w-10 h-10 shrink-0 rounded-[11px] bg-white flex items-center justify-center overflow-hidden border border-border/50 shadow-sm mt-0.5">
                            {(store?.logo_url && (String(store.logo_url).startsWith('http') || (String(store.logo_url).startsWith('data:') && String(store.logo_url).length < 500))) ? (
                              
                              <img src={store.logo_url} alt={store.name} width={40} height={40} fetchPriority={i === 0 ? "high" : "auto"} loading={i === 0 ? "eager" : "lazy"} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-secondary flex items-center justify-center">
                                <span className="text-sm font-bold text-muted-foreground">{store.name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <span className="text-[26px] sm:text-[29px] font-semibold text-foreground tracking-[-0.03em] leading-none [overflow-wrap:anywhere]">
                                {discountLabel}
                              </span>
                              
                              {isPromoCode && (
                                <span className="rounded bg-[#3f3f46] px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                  Code
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-primary font-semibold leading-none">
                                <CheckCircle className="h-3 w-3" /> {coupon.is_verified ? "Verified" : "Listed"}
                              </span>
                              {isPromoCode && (
                                <span className="rounded-full border border-[#555b60] px-2 py-0.5 text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-none">Storewide</span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 ml-1">
                            {isPromoCode ? (
                              <button
                                onPointerEnter={() => prefetchCouponReveal()}
                                onPointerDown={() => prefetchCouponReveal()}
                                onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                                className={`flex h-9 items-center justify-center rounded-xl px-3 text-[13px] font-semibold transition-transform active:scale-95 shadow-sm ${
                                  hasUnlockedStoreCodes
                                    ? "min-w-[92px] max-w-[170px] border border-[#555b60] bg-[#2d3033] text-primary hover:border-primary/50"
                                    : "w-[92px] sm:w-[102px] bg-primary text-[#1a1c1e] hover:bg-primary/90"
                                }`}
                              >
                                <span className="truncate">{hasUnlockedStoreCodes ? coupon.code : "Show Code"}</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                                className="h-9 w-[92px] sm:w-[102px] rounded-xl bg-primary text-[13px] font-semibold text-[#1a1c1e] hover:bg-primary/90 transition-transform active:scale-95 shadow-sm"
                              >
                                Get Deal
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="w-full min-w-0 -mt-0.5">
                          <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground leading-snug line-clamp-2 [overflow-wrap:anywhere]">
                            <span className="text-primary font-semibold">{discountLabel}</span>
                            {coupon.title ? <span> {coupon.title.toLowerCase().startsWith('on ') ? '' : 'on '}{coupon.title}</span> : null}
                          </h3>
                        </div>

                      <div className="flex min-w-0 items-center gap-x-3 gap-y-1.5 text-[12px] text-muted-foreground font-medium flex-wrap mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Last used: {activitySignal.lastUsed}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Uses today: {activitySignal.usesToday}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> Health: {activitySignal.health}%
                        </span>
                        {coupon.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Expires {new Date(coupon.expiry_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                        {isPromoCode ? (
                          <div className="mt-0.5 pt-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(coupon.id);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white/90 hover:text-white transition-colors bg-[#454a4f]/80 hover:bg-[#50565c] py-1.5 rounded-[10px] leading-none shadow-inner"
                            >
                              <span>{isExpanded ? "Hide code details" : "See code details"}</span>
                              <ChevronDown className={`h-3 w-3 opacity-80 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                            
                            {isExpanded && (
                              <div 
                                className="mt-2.5 min-w-0 overflow-hidden bg-[#1a1c1e] p-4 rounded-xl border border-[#2d3035] animate-fade-in-up text-left cursor-default shadow-inner space-y-4" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="border-t border-[#3f3f46]/60 pt-3 space-y-3">
                                  <div>
                                    <h4 className="text-[12px] font-extrabold text-foreground mb-1 uppercase tracking-wide">Detail</h4>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                                      {coupon.description || coupon.title}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-[12px] font-extrabold text-foreground mb-2 uppercase tracking-wide">Code facts</h4>
                                    <div className="space-y-1.5">
                                      <p className="flex items-center gap-1.5 text-[12px] text-primary font-semibold">
                                        <CheckCircle className="h-3 w-3" /> {isStorewide ? "Offer text indicates storewide or entire-order usage" : "Check eligible products and restrictions at checkout"}
                                      </p>
                                      {coupon.is_verified && (
                                        <p className="flex items-center gap-1.5 text-[12px] text-primary font-semibold">
                                          <CheckCircle className="h-3 w-3" /> Manually verified by DS Review Hub
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-[12px] font-extrabold text-foreground mb-1 uppercase tracking-wide">How this works</h4>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                                      Click Show Code to copy the promo code and open the merchant page, then confirm the final discount at checkout.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          coupon.description && (
                            <div className="mt-1 pt-1.5 border-t border-[#3f3f46]/40">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(coupon.id);
                                }}
                                className="w-full flex items-center justify-center gap-1 text-[13px] sm:text-[14px] font-extrabold text-white/95 hover:text-white transition-colors bg-[#555b60] hover:bg-[#646b71] py-2.5 rounded-lg leading-none shadow-inner"
                              >
                                {isExpanded ? "Hide details" : "See details"}
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                              
                              {isExpanded && (
                                <div className="mt-2 bg-[#1a1c1e] p-3 rounded-lg animate-fade-in-up border border-[#2d3035]" onClick={(e) => e.stopPropagation()}>
                                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                                    {coupon.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#3f3f46] bg-[#272a2e]/30 p-8 flex flex-col items-center justify-center text-center">
                  <Tag className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-base font-bold text-foreground">No promo codes available</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Check the best deals section below for no-code offers.</p>
                </div>
              )}
            </div>

            {useCodeTips.length > 0 && (
              <section className="space-y-3 pt-6" aria-labelledby="use-code-tips-heading">
                <div>
                  <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase text-primary">
                    <ImageIcon className="h-4 w-4" /> Use Code Tips
                  </p>
                  <h2 id="use-code-tips-heading" className="mt-1 text-xl font-bold text-foreground md:text-2xl">
                    Checkout tips for {displayStoreName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    See exactly where to apply a promo code before placing your order.
                  </p>
                </div>
                <div className="space-y-4">
                  {useCodeTips.map((tip, index) => (
                    <button
                      key={`${tip.image_url}-${index}`}
                      type="button"
                      onClick={() => handleUseCodeTipClick(tip, index)}
                      className="group block w-full min-w-0 overflow-hidden rounded-xl border border-[#3f3f46] bg-[#171819] text-left transition-colors hover:border-primary/45"
                    >
                      <div className="p-3.5 sm:p-4">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-primary">
                          <CheckCircle className="h-3.5 w-3.5" /> Checkout tip
                        </p>
                        <h3 className="mt-1.5 text-lg font-bold leading-snug text-foreground sm:text-xl">
                          {tip.caption || `Locate the promo code box at ${displayStoreName}`}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Open the checkout screenshot to see exactly where to enter the promo code.
                        </p>
                        {tip.code && (
                          <span className="mt-3 inline-flex rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                            Recommended code: {tip.code}
                          </span>
                        )}
                      </div>
                      <div className="relative aspect-[16/8] overflow-hidden border-t border-white/10 bg-[#1a1c1e] sm:aspect-[16/7]">
                        <img
                          src={tip.preview_image_url || tip.thumbnail_url || tip.image_url}
                          alt={tip.caption || `${displayStoreName} checkout promo code example ${index + 1}`}
                          width={900}
                          height={450}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                        <span className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white">
                          <ZoomIn className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {storeReview && (
              <div ref={sectionRefs.review} className="scroll-mt-20 lg:scroll-mt-32 space-y-4 pt-6">
                <div className="overflow-hidden rounded-3xl border border-[#3f3f46] bg-[#272a2e]">
                  {storeReview.hero_image_url && (
                    <div className="aspect-[16/7] min-h-[180px] bg-[#1a1c1e]">
                      <img
                        src={storeReview.hero_image_url}
                        alt={storeReview.hero_image_alt || `${store.name} review`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="space-y-6 p-5 sm:p-7">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>DS Review Hub editorial review</span>
                        {storeReview.updated_at && (
                          <span className="text-muted-foreground normal-case tracking-normal">
                            Updated {new Date(storeReview.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        {storeReview.h1 || storeReview.title}
                      </h2>
                      {storeReview.dek && (
                        <p className="text-[15px] leading-relaxed text-foreground/85">{storeReview.dek}</p>
                      )}
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{storeReview.summary}</p>
                    </div>

                    {primaryReviewCoupon && (
                      <div className="rounded-2xl border border-primary/30 bg-[#1a1c1e] p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold uppercase tracking-wide text-primary">Best current offer</p>
                            <h3 className="mt-1 text-lg font-black text-foreground">{offerLabel(primaryReviewCoupon)} at {store.name}</h3>
                            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                              {primaryReviewCoupon.description || primaryReviewCoupon.title}
                            </p>
                          </div>
                          <Button
                            className="shrink-0"
                            onClick={() => {
                              if (hasUsableCouponCode(primaryReviewCoupon)) revealStoreCoupon(primaryReviewCoupon);
                              else scrollToSection("codes");
                            }}
                          >
                            {hasUsableCouponCode(primaryReviewCoupon) ? "Show best code" : "View current offers"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {Array.isArray(storeReview.best_for) && storeReview.best_for.length > 0 && (
                      <div>
                        <h3 className="text-[15px] font-extrabold text-foreground mb-3">Best for</h3>
                        <div className="flex flex-wrap gap-2">
                          {storeReview.best_for.map((item: string) => (
                            <span key={item} className="rounded-full border border-[#3f3f46] bg-[#1a1c1e] px-3 py-1.5 text-[12px] font-semibold text-muted-foreground">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(storeReview.pros?.length > 0 || storeReview.cons?.length > 0) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {storeReview.pros?.length > 0 && (
                          <div className="rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] p-4">
                            <h3 className="text-[15px] font-extrabold text-foreground mb-3">What works well</h3>
                            <ul className="space-y-2">
                              {storeReview.pros.map((item: string) => (
                                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {storeReview.cons?.length > 0 && (
                          <div className="rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] p-4">
                            <h3 className="text-[15px] font-extrabold text-foreground mb-3">What to double-check</h3>
                            <ul className="space-y-2">
                              {storeReview.cons.map((item: string) => (
                                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {reviewSections.length > 0 && (
                      <div className="space-y-5">
                        {reviewSections.map((section, index) => (
                          <section key={`${section.heading || "section"}-${index}`} className="border-t border-[#3f3f46] pt-5">
                            {section.heading && <h3 className="text-xl font-black text-foreground">{section.heading}</h3>}
                            {section.body && (
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{section.body}</p>
                            )}
                            {section.cta_after && (
                              <Button variant="outline" size="sm" className="mt-3" onClick={() => scrollToSection("codes")}>
                                See current {store.name} coupons
                              </Button>
                            )}
                          </section>
                        ))}
                      </div>
                    )}

                    {storeReview.verdict && (
                      <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                        <h3 className="text-[15px] font-extrabold text-foreground mb-2">Verdict</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{storeReview.verdict}</p>
                        <Button size="sm" className="mt-3" onClick={() => scrollToSection("codes")}>
                          Compare {store.name} coupons
                        </Button>
                      </div>
                    )}

                    {reviewFaqs.length > 0 && (
                      <div className="border-t border-[#3f3f46] pt-5">
                        <h3 className="text-xl font-black text-foreground mb-3">{store.name} review FAQ</h3>
                        <div className="space-y-2.5">
                          {reviewFaqs.map((faq, index) => (
                            <details key={`${faq.question || "faq"}-${index}`} className="group rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] overflow-hidden">
                              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#363a3f] transition-colors list-none [&::-webkit-details-marker]:hidden">
                                <span className="text-[14px] font-bold text-foreground pr-4 leading-snug">{faq.question}</span>
                                <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground group-open:text-primary transition-colors" />
                              </summary>
                              <div className="px-4 pb-4 pt-0">
                                <p className="text-[13px] text-muted-foreground leading-relaxed">{faq.answer}</p>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}

                    {reviewSources.length > 0 && (
                      <div className="border-t border-[#3f3f46] pt-5">
                        <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-foreground mb-2">Review sources</h3>
                        <div className="space-y-1.5 text-[12px] text-muted-foreground">
                          {reviewSources.map((source, index) => (
                            <p key={`${source.url || source.label || "source"}-${index}`}>
                              {source.url ? (
                                <a href={source.url} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-primary hover:underline">
                                  {source.label || source.url}
                                </a>
                              ) : (
                                <span className="font-semibold text-foreground">{source.label}</span>
                              )}
                              {source.note ? ` - ${source.note}` : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={sectionRefs.deals} className="scroll-mt-20 lg:scroll-mt-32 space-y-4 pt-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-[-0.03em]">More {displayStoreName} deals</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Explore offers that do not require a promo code.
                </p>
              </div>
              {couponDeals.length + deals.length > 0 ? (
                <div className="space-y-3">
                  {couponDeals.map((coupon) => {
                    const affiliateUrl = coupon.url || store.website_url;
                    const discountLabel = offerLabel(coupon);
                    return (
                      <button
                        key={`coupon-deal-${coupon.id}`}
                        onClick={() => {
                          trackCouponClick({ store_name: store.name, store_slug: slug, coupon_id: coupon.id, coupon_type: "deal", destination_url: affiliateUrl || "", page_type: "store" });
                          if (affiliateUrl) openBackgroundTab(affiliateUrl, coupon.id);
                        }}
                        className="group flex w-full min-w-0 items-start gap-3 rounded-2xl border border-transparent bg-[#272a2e] p-3.5 text-left transition-colors hover:border-primary/40 sm:p-4"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm">
                          {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} width={44} height={44} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-secondary text-sm font-bold text-muted-foreground">
                              {displayStoreName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-foreground">{discountLabel}</p>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">Deal</span>
                          </div>
                          <p className="mt-2 text-[14px] font-semibold leading-snug text-foreground line-clamp-2">{coupon.title}</p>
                          {coupon.description && (
                            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{coupon.description}</p>
                          )}
                        </div>
                        <span className="ml-2 inline-flex h-9 shrink-0 items-center rounded-xl bg-primary px-4 text-[13px] font-semibold text-[#050505] transition-transform group-active:scale-95">
                          Get Deal
                        </span>
                      </button>
                    );
                  })}

                  {deals.map((deal) => {
                    const affiliateUrl = deal.url || store.website_url;
                    return (
                      <button
                        key={`deal-${deal.id}`}
                        onClick={() => {
                          trackCouponClick({ store_name: store.name, store_slug: slug, deal_id: deal.id, coupon_type: "deal", destination_url: affiliateUrl || "", page_type: "store" });
                          if (affiliateUrl) openBackgroundTab(affiliateUrl);
                        }}
                        className="group flex w-full min-w-0 items-start gap-3 rounded-2xl border border-transparent bg-[#272a2e] p-3.5 text-left transition-colors hover:border-primary/40 sm:p-4"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm">
                          {deal.image_url ? (
                            <img src={deal.image_url} alt={deal.title} width={44} height={44} className="h-full w-full object-cover" loading="lazy" />
                          ) : store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} width={44} height={44} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-secondary text-sm font-bold text-muted-foreground">
                              {displayStoreName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {deal.deal_price != null ? (
                              <p className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-foreground">${deal.deal_price}</p>
                            ) : (
                              <p className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-foreground">Deal</p>
                            )}
                            {deal.original_price != null && <span className="text-xs font-medium text-muted-foreground line-through">${deal.original_price}</span>}
                          </div>
                          <p className="mt-2 text-[14px] font-semibold leading-snug text-foreground line-clamp-2">{deal.title}</p>
                          {deal.description && <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{deal.description}</p>}
                        </div>
                        <span className="ml-2 inline-flex h-9 shrink-0 items-center rounded-xl bg-primary px-4 text-[13px] font-semibold text-[#050505] transition-transform group-active:scale-95">
                          Get Deal
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#3f3f46] bg-[#272a2e]/30 p-6 text-center">
                  <p className="text-[13px] text-muted-foreground">No no-code deals available for {displayStoreName} right now.</p>
                </div>
              )}
            </div>

            {moneyPageGuide && (
              <section className="scroll-mt-20 space-y-4 pt-6" aria-labelledby="money-page-guide-heading">
                <div className="rounded-3xl border border-[#3f3f46] bg-[#272a2e] p-5 sm:p-7">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-primary">{moneyPageGuide.eyebrow}</p>
                  <h2 id="money-page-guide-heading" className="mt-2 text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
                    {moneyPageGuide.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {moneyPageGuide.intro}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {moneyPageGuide.facts.map((fact) => (
                      <div key={fact.label} className="rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{fact.label}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{fact.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-5">
                    {moneyPageGuide.sections.map((section) => (
                      <section key={section.heading} className="border-t border-[#3f3f46] pt-5">
                        <h3 className="text-lg font-extrabold text-foreground">{section.heading}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                        {section.bullets && (
                          <ul className="mt-3 space-y-2">
                            {section.bullets.map((item) => (
                              <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <div ref={sectionRefs.faq} className="scroll-mt-20 lg:scroll-mt-32 space-y-4 pt-6">
              <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Frequently asked questions</h2>
              <div className="space-y-2.5">
                {faqs.map((faq, i) => (
                  <details key={i} className="group rounded-2xl border border-[#3f3f46] bg-[#272a2e] overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#363a3f] transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <span className="text-[14px] font-bold text-foreground pr-4 leading-snug">{faq.q}</span>
                      <div className="w-7 h-7 rounded-full bg-[#1a1c1e] flex items-center justify-center shrink-0 group-open:bg-primary/10 transition-colors">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground group-open:text-primary transition-colors" />
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>

            <div id="competitor-stores" className="pb-10 scroll-mt-20 lg:scroll-mt-32 pt-6">
              <div className="rounded-3xl border border-[#3f3f46] bg-[#272a2e] p-6 sm:p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">How to check {store.name} offers</h2>
                  <p className="text-[13px] sm:text-sm text-muted-foreground mt-1.5">Use these quick checks before placing an order.</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] p-4 flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[13px] font-bold text-foreground">Check code type</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">Some offers require a code, while no-code deals may apply after opening the retailer page.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[13px] font-bold text-foreground">Read restrictions</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">Look for minimum purchase rules, excluded items, new-customer limits, and expiration dates.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] p-4 flex items-start gap-3">
                    <ExternalLink className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[13px] font-bold text-foreground">Confirm final price</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">The retailer checkout page is the source of truth for final discount, shipping, and taxes.</p>
                    </div>
                  </div>
                </div>
                {similarStores.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-[15px] font-bold text-foreground mb-3">Other stores with listed offers</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {similarStores.slice(0, 3).map((s) => (
                        <a key={s.id} href={`/store/${s.slug || s.id}`} className="rounded-2xl border border-[#3f3f46] bg-[#1a1c1e] p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
                          <div className="w-9 h-9 rounded-full border border-[#3f3f46] bg-[#272a2e] flex items-center justify-center overflow-hidden shrink-0">
                            {s.logo_url ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" /> : <StoreIcon className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">{s.coupon_count} listed offer{s.coupon_count !== 1 ? "s" : ""}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {selectedUseCodeTip?.image_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Checkout screenshot"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6"
          onClick={() => setSelectedUseCodeTip(null)}
        >
          <div className="relative max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label="Close checkout screenshot"
              onClick={() => setSelectedUseCodeTip(null)}
              className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedUseCodeTip.image_url}
              alt={selectedUseCodeTip.caption || `${displayStoreName} checkout promo code example`}
              className="max-h-[90vh] max-w-full rounded-lg bg-white object-contain"
            />
            {(selectedUseCodeTip.code || selectedUseCodeTip.caption) && (
              <p className="mt-2 rounded-lg bg-black/75 px-3 py-2 text-center text-sm font-semibold text-white">
                {selectedUseCodeTip.code ? `Use code ${selectedUseCodeTip.code}` : ""}
                {selectedUseCodeTip.code && selectedUseCodeTip.caption ? " - " : ""}
                {selectedUseCodeTip.caption}
              </p>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default StorePage;
