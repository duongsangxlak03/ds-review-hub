import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __DS_GOOGLE_ADS_TAG_IDS?: string[];
    __DS_CONFIGURED_GOOGLE_ADS_TAG_IDS?: string[];
    __DS_COUPON_REVEAL?: {
      coupon?: string;
      path?: string;
      url?: string;
    };
  }
}

const GoogleTagsLoader = () => {
  const { data: tags = [] } = useQuery({
    queryKey: ["google-tags-active"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("google_tags")
        .select("tag_id, tag_type")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (tags.length === 0) return;

    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = (...args: unknown[]) => {
        window.dataLayer.push(args);
      };
      window.gtag("js", new Date());
    }

    const configuredGoogleAdsIds = new Set(window.__DS_CONFIGURED_GOOGLE_ADS_TAG_IDS || []);

    window.__DS_GOOGLE_ADS_TAG_IDS = Array.from(new Set([
      ...(window.__DS_GOOGLE_ADS_TAG_IDS || []),
      ...tags
        .filter((tag) => tag.tag_type === "google_ads" && /^AW-\d+$/i.test(tag.tag_id))
        .map((tag) => tag.tag_id),
    ]));

    tags.forEach((tag) => {
      const cleanId = tag.tag_id.replace(/[^a-zA-Z0-9-]/g, "");

      if (tag.tag_type === "google_ads" || tag.tag_type === "ga4") {
        const loaderId = `gtag-loader-${cleanId}`;
        const hasLoader = Boolean(document.getElementById(loaderId)) ||
          Array.from(document.scripts).some((script) => script.src.includes(`googletagmanager.com/gtag/js?id=${tag.tag_id}`));

        if (!hasLoader) {
          const loader = document.createElement("script");
          loader.id = loaderId;
          loader.async = true;
          loader.defer = true;
          loader.src = `https://www.googletagmanager.com/gtag/js?id=${tag.tag_id}`;
          document.head.appendChild(loader);
        }

        const configId = `gtag-config-${cleanId}`;
        if (!document.getElementById(configId)) {
          if (!configuredGoogleAdsIds.has(tag.tag_id)) {
            window.gtag?.("config", tag.tag_id);
            if (tag.tag_type === "google_ads") {
              configuredGoogleAdsIds.add(tag.tag_id);
              window.__DS_CONFIGURED_GOOGLE_ADS_TAG_IDS = Array.from(configuredGoogleAdsIds);
            }
          }

          const configMarker = document.createElement("meta");
          configMarker.id = configId;
          configMarker.setAttribute("data-google-tag-config", tag.tag_id);
          document.head.appendChild(configMarker);
        }
      } else if (tag.tag_type === "gtm") {
        const gtmId = `gtm-loader-${cleanId}`;
        if (!document.getElementById(gtmId)) {
          const gtmScript = document.createElement("script");
          gtmScript.id = gtmId;
          gtmScript.textContent = `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.defer=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${tag.tag_id}');
          `;
          document.head.appendChild(gtmScript);
        }
      }
    });
  }, [tags]);

  return null;
};

export default GoogleTagsLoader;
