import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CouponCodeDialog from "@/components/CouponCodeDialog";
import {
  clearPendingCouponHandoff,
  handoffToCouponRecord,
  readPendingCouponHandoff,
} from "@/lib/couponHandoff";

declare global {
  interface Window {
    __DS_COUPON_REVEAL?: {
      coupon?: string;
      path?: string;
      url?: string;
    };
  }
}

type CouponRevealStoreMeta = {
  storeName?: string | null;
  storeLogo?: string | null;
  storeUrl?: string | null;
  storeSlug?: string | null;
};

type CouponRevealPayload = {
  coupon: any;
  meta?: CouponRevealStoreMeta;
};

type CouponRevealContextValue = {
  openCouponReveal: (coupon: any, meta?: CouponRevealStoreMeta) => void;
};

const CouponRevealContext = createContext<CouponRevealContextValue | null>(null);

const hasUsableCouponCode = (coupon: any) =>
  Boolean(coupon?.code && String(coupon.code).trim() && String(coupon.code).toUpperCase() !== "NOCODE");

const modalOfferLabel = (coupon: any) =>
  coupon?.discount_value || coupon?.discountValue || (hasUsableCouponCode(coupon) ? "Promo code" : "Deal");

const getInitialRevealPayload = (): CouponRevealPayload | null => {
  if (typeof window === "undefined") return null;

  const couponId = window.__DS_COUPON_REVEAL?.coupon;
  if (!couponId) return null;

  const handoff = readPendingCouponHandoff(couponId);
  if (!handoff) return null;

  return {
    coupon: handoffToCouponRecord(handoff),
    meta: {
      storeName: handoff.storeName,
      storeLogo: handoff.storeLogo,
      storeUrl: handoff.destinationUrl || handoff.storeUrl,
      storeSlug: handoff.storeSlug,
    },
  };
};

export const CouponRevealProvider = ({ children }: { children: ReactNode }) => {
  const [payload, setPayload] = useState<CouponRevealPayload | null>(() => getInitialRevealPayload());
  const [dialogOpen, setDialogOpen] = useState(() => Boolean(payload));
  const [recentlyClosed, setRecentlyClosed] = useState(false);
  const clearPayloadTimer = useRef<number | null>(null);
  const recentlyClosedTimer = useRef<number | null>(null);

  const openCouponReveal = useCallback((coupon: any, meta?: CouponRevealStoreMeta) => {
    if (clearPayloadTimer.current) {
      window.clearTimeout(clearPayloadTimer.current);
      clearPayloadTimer.current = null;
    }
    if (recentlyClosedTimer.current) {
      window.clearTimeout(recentlyClosedTimer.current);
      recentlyClosedTimer.current = null;
    }

    setRecentlyClosed(false);
    setPayload({ coupon, meta });
    setDialogOpen(true);
  }, []);

  const closeCouponReveal = () => {
    setDialogOpen(false);
    setRecentlyClosed(true);

    if (recentlyClosedTimer.current) {
      window.clearTimeout(recentlyClosedTimer.current);
    }
    recentlyClosedTimer.current = window.setTimeout(() => {
      setRecentlyClosed(false);
      recentlyClosedTimer.current = null;
    }, 450);

    if (clearPayloadTimer.current) {
      window.clearTimeout(clearPayloadTimer.current);
    }
    clearPayloadTimer.current = window.setTimeout(() => {
      const couponId = payload?.coupon?.id;
      startTransition(() => {
        setPayload(null);
      });
      if (couponId) clearPendingCouponHandoff(couponId);
      if (window.__DS_COUPON_REVEAL?.coupon === couponId) delete window.__DS_COUPON_REVEAL;
      clearPayloadTimer.current = null;
    }, 240);
  };

  useEffect(() => {
    return () => {
      if (clearPayloadTimer.current) window.clearTimeout(clearPayloadTimer.current);
      if (recentlyClosedTimer.current) window.clearTimeout(recentlyClosedTimer.current);
    };
  }, []);

  const value = useMemo<CouponRevealContextValue>(
    () => ({
      openCouponReveal,
    }),
    [openCouponReveal]
  );

  const coupon = payload?.coupon;
  const meta = payload?.meta;
  const storeName = meta?.storeName || coupon?.stores?.name || "Store";
  const storeLogo = meta?.storeLogo || coupon?.stores?.logo_url;
  const storeUrl = meta?.storeUrl || coupon?.url || coupon?.stores?.website_url;
  const storeSlug = meta?.storeSlug || coupon?.stores?.slug;

  return (
    <CouponRevealContext.Provider value={value}>
      {children}
      {coupon && (
        <CouponCodeDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (open) {
              setDialogOpen(true);
              return;
            }
            closeCouponReveal();
          }}
          code={coupon.code || ""}
          discountValue={modalOfferLabel(coupon)}
          description={coupon.description || coupon.title}
          storeName={storeName}
          storeLogo={storeLogo}
          storeUrl={storeUrl}
          couponId={coupon.id}
          storeSlug={storeSlug}
        />
      )}
    </CouponRevealContext.Provider>
  );
};

export const useCouponReveal = () => {
  const context = useContext(CouponRevealContext);
  if (!context) throw new Error("useCouponReveal must be used inside CouponRevealProvider");
  return context;
};
