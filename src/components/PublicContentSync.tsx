import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PUBLIC_CONTENT_EVENT,
  PUBLIC_CONTENT_STORAGE_KEY,
  refreshPublicContent,
} from "@/lib/publicContentSync";

const LIVE_TABLES = [
  "stores",
  "coupons",
  "deals",
  "blog_posts",
  "store_reviews",
  "store_savings_guides",
  "coupon_usage_stats",
  "google_tags",
] as const;

const PublicContentSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshPublicContent(queryClient), 250);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PUBLIC_CONTENT_STORAGE_KEY) scheduleRefresh();
    };

    window.addEventListener(PUBLIC_CONTENT_EVENT, scheduleRefresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    // Realtime gives near-instant updates. Polling is a fallback when table replication is unavailable.
    let liveChannel = supabase.channel("public-content-live-v1");
    LIVE_TABLES.forEach((table) => {
      liveChannel = liveChannel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    });
    liveChannel.subscribe();

    const pollId = window.setInterval(refreshWhenVisible, 60_000);
    const initialRefreshId = window.setTimeout(scheduleRefresh, 500);

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(initialRefreshId);
      window.clearInterval(pollId);
      window.removeEventListener(PUBLIC_CONTENT_EVENT, scheduleRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(liveChannel);
    };
  }, [queryClient]);

  return null;
};

export default PublicContentSync;
