import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Tag, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackCopyCode, trackRevealCode, trackOutboundClick } from "@/lib/tracking";
import { useStableBodyLock } from "@/hooks/useStableBodyLock";


interface CouponCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  discountValue: string;
  description: string;
  storeName: string;
  storeLogo?: string | null;
  storeUrl?: string | null;
  couponId?: string;
  pageType?: "store" | "blog";
  storeSlug?: string;
}

const CouponCodeDialog = ({
  open,
  onOpenChange,
  code,
  discountValue,
  description,
  storeName,
  storeLogo,
  storeUrl,
  couponId,
  pageType = "store",
  storeSlug,
}: CouponCodeDialogProps) => {
  const [copied, setCopied] = useState(() => Boolean(open && code));
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);
  const copiedResetTimer = useRef<number | null>(null);
  useStableBodyLock(open, 260);

  const showCopiedState = () => {
    setCopied(true);
    if (copiedResetTimer.current) {
      window.clearTimeout(copiedResetTimer.current);
    }
    copiedResetTimer.current = window.setTimeout(() => {
      setCopied(false);
      copiedResetTimer.current = null;
    }, 4000);
  };

  // Auto-show copied state on open since code was already copied on click
  useEffect(() => {
    if (open && code) {
      setVoted(null);
      showCopiedState();
      trackRevealCode({ store_name: storeName, store_slug: storeSlug, coupon_id: couponId, coupon_code: code, page_type: pageType });
    }
  }, [open, code, storeName, storeSlug, couponId, pageType]);

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current) window.clearTimeout(copiedResetTimer.current);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    showCopiedState();
    trackCopyCode({ store_name: storeName, store_slug: storeSlug, coupon_id: couponId, coupon_code: code, page_type: pageType });
    toast({ title: "Copied!", description: `Code "${code}" copied to clipboard.` });
  };

  const handleVote = (vote: "yes" | "no") => {
    setVoted(vote);
    toast({ title: vote === "yes" ? "Thanks!" : "Thanks for feedback!" });
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (!v) {
        if (copiedResetTimer.current) {
          window.clearTimeout(copiedResetTimer.current);
          copiedResetTimer.current = null;
        }
      }
    }}>
      <DialogContent className="w-[calc(100vw-48px)] max-w-[360px] gap-0 rounded-[26px] border border-white/10 bg-[#1f2022] px-6 pb-6 pt-12 text-center shadow-2xl sm:max-w-[420px] sm:rounded-[28px] sm:px-7 sm:pb-7 sm:pt-14 will-change-transform transform-gpu [&>button]:right-4 [&>button]:top-4 [&>button]:flex [&>button]:h-8 [&>button]:w-8 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:text-white [&>button]:opacity-100 [&>button]:ring-offset-0 [&>button]:hover:bg-white/10 [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button>svg]:h-4 [&>button>svg]:w-4">
        <DialogTitle className="sr-only">Coupon Code</DialogTitle>

        {/* Store Logo */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white p-3 shadow-sm sm:h-24 sm:w-24">
            {storeLogo ? (
              <img src={storeLogo} alt={storeName} className="h-full w-full object-contain" />
            ) : (
              <span className="text-3xl font-extrabold text-black">{storeName.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Discount */}
        <h2 className="text-[28px] font-bold leading-none tracking-[-0.02em] text-foreground sm:text-[30px]">{discountValue || "Deal"}</h2>
        <p className="mx-auto mt-3 max-w-[280px] text-[15px] leading-snug text-muted-foreground sm:max-w-[310px] sm:text-[15.5px]">{description}</p>

        {/* Code + Copy */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex max-w-[300px] items-center overflow-hidden rounded-full border border-primary/25 bg-[#111827] sm:max-w-[320px]">
            <span className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5 text-[17px] font-bold tracking-[0.02em] text-primary sm:px-[18px] sm:text-[18px]">
              <Tag className="h-5 w-5 shrink-0" />
              <span className="truncate">{code}</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex h-[46px] w-[104px] shrink-0 items-center justify-center rounded-r-full bg-primary px-4 text-[15px] font-bold text-black transition-colors hover:bg-primary/90 sm:w-[112px] sm:px-5"
            >
              {copied ? (
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Copied!</span>
              ) : (
                <span className="flex items-center gap-1.5"><Copy className="h-4 w-4" /> Copy</span>
              )}
            </button>
          </div>
        </div>

        {/* Inline "Copied to clipboard" banner - shown right below the code */}
        <div className="mt-3 h-9">
          <div className={`inline-flex items-center gap-2 rounded-xl bg-[#2d2f33] px-4 py-2 text-[14px] font-semibold text-foreground transition-opacity duration-150 ${copied ? "opacity-100" : "opacity-0"}`}>
            <Check className="h-4 w-4 text-primary" />
            Copied to clipboard
          </div>
        </div>

        {/* Did this code work? */}
        <div className="mt-6">
          <p className="mb-3 text-[16px] text-muted-foreground">Did this code work?</p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={voted === "no" ? "default" : "outline"}
              className="h-10 rounded-full border-white/15 bg-[#111214] px-5 text-[15px] font-semibold text-foreground hover:bg-[#18191b] hover:text-foreground disabled:opacity-70"
              onClick={() => handleVote("no")}
              disabled={voted !== null}
            >
              <ThumbsDown className="h-[18px] w-[18px]" /> No
            </Button>
            <Button
              variant={voted === "yes" ? "default" : "outline"}
              className="h-10 rounded-full border-white/15 bg-[#111214] px-5 text-[15px] font-semibold text-foreground hover:bg-[#18191b] hover:text-foreground disabled:opacity-70"
              onClick={() => handleVote("yes")}
              disabled={voted !== null}
            >
              <ThumbsUp className="h-[18px] w-[18px]" /> Yes
            </Button>
          </div>
        </div>

        {/* Shop button */}
        {storeUrl && (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOutboundClick({ store_name: storeName, store_slug: storeSlug, coupon_id: couponId, destination_url: storeUrl, page_type: pageType })}
            className="mt-7 block w-full rounded-2xl bg-primary py-3.5 text-center text-[17px] font-bold text-black transition-opacity hover:opacity-90"
          >
            Shop at {storeName}
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CouponCodeDialog;
