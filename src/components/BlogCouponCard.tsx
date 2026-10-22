import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Copy, ExternalLink, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import CouponCodeDialog from "@/components/CouponCodeDialog";
import { toast } from "@/hooks/use-toast";
import { recordBlogCouponIntent } from "@/lib/blogCouponIntent";
import { trackCopyCode, trackCouponClick, trackOutboundClick } from "@/lib/tracking";
import { openBackgroundTab } from "@/lib/openBackgroundTab";
import { setPendingCouponHandoff } from "@/lib/couponHandoff";

export type BlogCouponOffer = {
  id?: string;
  title: string;
  description?: string | null;
  code?: string | null;
  discountValue?: string | null;
  url?: string | null;
  isVerified?: boolean | null;
  storeName: string;
  storeSlug: string;
  storeLogo?: string | null;
  storeUrl?: string | null;
};

type BlogCouponCardProps = {
  offer: BlogCouponOffer;
  blogSlug?: string;
};

const BlogCouponCard = ({ offer, blogSlug }: BlogCouponCardProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoShown, setAutoShown] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasCode = Boolean(offer.code && offer.code.trim() && offer.code.toUpperCase() !== "NOCODE");
  const destinationUrl = offer.url || offer.storeUrl || "";
  const discount = offer.discountValue || (hasCode ? "Promo code" : "Deal");
  const description = offer.description || offer.title;
  const revealParam = offer.id || `${offer.storeSlug}:${String(offer.code || "").trim().toUpperCase()}`;

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  useEffect(() => {
    if (autoShown || !hasCode || !revealParam) return;
    const couponParam = searchParams.get("coupon");
    if (couponParam !== revealParam) return;

    recordBlogCouponIntent({
      blogSlug,
      storeName: offer.storeName,
      storeSlug: offer.storeSlug,
      couponId: offer.id,
      couponCode: offer.code || undefined,
      destinationUrl,
      action: "show_code",
    });
    setRevealed(true);
    setDialogOpen(true);
    setAutoShown(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("coupon");
    setSearchParams(nextParams, { replace: true });
  }, [autoShown, hasCode, offer, searchParams, setSearchParams, blogSlug, destinationUrl, revealParam]);

  const handleCodeClick = () => {
    if (destinationUrl) {
      setPendingCouponHandoff({
        revealKey: revealParam,
        couponId: offer.id,
        code: offer.code || "",
        title: offer.title,
        description,
        discountValue: offer.discountValue,
        storeName: offer.storeName,
        storeSlug: offer.storeSlug,
        storeLogo: offer.storeLogo,
        storeUrl: offer.storeUrl,
        destinationUrl,
        pageType: "blog",
      });
      const opened = openBackgroundTab(destinationUrl, revealParam);
      if (!opened) {
        setRevealed(true);
        setDialogOpen(true);
      }
    } else {
      setRevealed(true);
      setDialogOpen(true);
    }

    recordBlogCouponIntent({
      blogSlug,
      storeName: offer.storeName,
      storeSlug: offer.storeSlug,
      couponId: offer.id,
      couponCode: offer.code || undefined,
      destinationUrl,
      action: "show_code",
    });

    if (offer.code) {
      navigator.clipboard.writeText(offer.code).then(() => {
        markCopied();
        toast({ title: "Copied!", description: `Code "${offer.code}" copied to clipboard.` });
      }).catch(() => {
        toast({ title: "Code ready", description: `Use code ${offer.code} at checkout.` });
      });
    }

    trackCopyCode({
      store_name: offer.storeName,
      store_slug: offer.storeSlug,
      coupon_id: offer.id,
      coupon_code: offer.code || undefined,
      page_type: "blog",
      destination_url: destinationUrl,
      discount_value: offer.discountValue || undefined,
    });
  };

  const handleInlineCopy = async () => {
    if (!offer.code) return;

    recordBlogCouponIntent({
      blogSlug,
      storeName: offer.storeName,
      storeSlug: offer.storeSlug,
      couponId: offer.id,
      couponCode: offer.code,
      destinationUrl,
      action: "copy_code",
    });

    try {
      await navigator.clipboard.writeText(offer.code);
      markCopied();
      toast({ title: "Copied!", description: `Code "${offer.code}" copied to clipboard.` });
    } catch {
      toast({ title: "Code ready", description: `Use code ${offer.code} at checkout.` });
    }

    trackCopyCode({
      store_name: offer.storeName,
      store_slug: offer.storeSlug,
      coupon_id: offer.id,
      coupon_code: offer.code,
      page_type: "blog",
      destination_url: destinationUrl,
      discount_value: offer.discountValue || undefined,
    });
  };

  const handleDealClick = () => {
    recordBlogCouponIntent({
      blogSlug,
      storeName: offer.storeName,
      storeSlug: offer.storeSlug,
      couponId: offer.id,
      destinationUrl,
      action: "open_deal",
    });

    trackCouponClick({
      store_name: offer.storeName,
      store_slug: offer.storeSlug,
      coupon_id: offer.id,
      coupon_type: "deal",
      page_type: "blog",
      destination_url: destinationUrl,
      discount_value: offer.discountValue || undefined,
    });
    trackOutboundClick({
      store_name: offer.storeName,
      store_slug: offer.storeSlug,
      coupon_id: offer.id,
      page_type: "blog",
      destination_url: destinationUrl,
    });
    if (destinationUrl) {
      openBackgroundTab(destinationUrl, revealParam);
    }
  };

  return (
    <>
      <div className="my-8 overflow-hidden rounded-2xl border border-primary/35 bg-[#202327] shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-white">
              {offer.storeLogo ? (
                <img src={offer.storeLogo} alt={offer.storeName} className="h-full w-full object-contain" loading="lazy" />
              ) : (
                <span className="text-lg font-black text-muted-foreground">{offer.storeName.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-black leading-none text-foreground">{discount}</p>
                {hasCode && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Code
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-bold leading-snug text-foreground">{offer.title}</p>
              {description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-primary">
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5">
                  <CheckCircle className="h-3 w-3" />
                  {offer.isVerified ? "Verified" : "Listed"}
                </span>
                <a href={`/store/${offer.storeSlug}`} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                  See all {offer.storeName} offers
                </a>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="h-12 shrink-0 rounded-xl px-6 font-black"
            onClick={hasCode ? handleCodeClick : handleDealClick}
          >
            {hasCode ? (
              <>
                <Copy className="mr-2 h-4 w-4" />
                {revealed ? "Code Shown" : "Show Code"}
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Get Deal
              </>
            )}
          </Button>
        </div>

        {hasCode && offer.code && revealed ? (
          <div className="border-t border-border/60 bg-black/25 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Coupon code</p>
                <div className="inline-flex max-w-full items-center rounded-xl border border-primary/45 bg-background px-4 py-2 font-mono text-lg font-black tracking-widest text-primary">
                  <span className="truncate">{offer.code}</span>
                </div>
              </div>
              <Button type="button" variant="secondary" className="shrink-0 rounded-xl font-black" onClick={handleInlineCopy}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
          </div>
        ) : hasCode && offer.code ? (
          <div className="flex items-center gap-2 border-t border-border/60 bg-black/20 px-4 py-3 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Click Show Code to reveal and copy the code before opening {offer.storeName}.
          </div>
        ) : null}
      </div>

      {hasCode && (
        <CouponCodeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          code={offer.code || ""}
          discountValue={discount}
          description={description}
          storeName={offer.storeName}
          storeSlug={offer.storeSlug}
          storeLogo={offer.storeLogo}
          storeUrl={destinationUrl}
          couponId={offer.id}
          pageType="blog"
        />
      )}
    </>
  );
};

export default BlogCouponCard;
