import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: Record<string, any>;
  noindex?: boolean;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

const setMeta = (selector: string, attrs: Record<string, string>, content?: string) => {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([name, value]) => el!.setAttribute(name, value));
    document.head.appendChild(el);
  }
  if (content !== undefined) el.content = content;
  return el;
};

const usePageMeta = ({ title, description, canonical, jsonLd, noindex, image, imageAlt, type = "website", publishedTime, modifiedTime }: PageMetaOptions) => {
  useEffect(() => {
    // Title
    document.title = title;

    // Robots noindex
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.name = "robots";
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = "noindex, nofollow";
    } else if (robotsMeta) {
      robotsMeta.remove();
    }

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // OG tags
    const ogTags: Record<string, string> = {
      "og:title": title,
      "og:description": description,
      "og:type": type,
      "twitter:title": title,
      "twitter:description": description,
    };
    Object.entries(ogTags).forEach(([prop, content]) => {
      const isOg = prop.startsWith("og:");
      const selector = isOg ? `meta[property="${prop}"]` : `meta[name="${prop}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (isOg) el.setAttribute("property", prop);
        else el.name = prop;
        document.head.appendChild(el);
      }
      el.content = content;
    });

    if (canonical) {
      setMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
    }

    if (image) {
      setMeta('meta[property="og:image"]', { property: "og:image" }, image);
      setMeta('meta[name="twitter:image"]', { name: "twitter:image" }, image);
      setMeta('meta[property="og:image:alt"]', { property: "og:image:alt" }, imageAlt || title);
    }

    if (type === "article") {
      if (publishedTime) {
        setMeta('meta[property="article:published_time"]', { property: "article:published_time" }, publishedTime);
      }
      if (modifiedTime) {
        setMeta('meta[property="article:modified_time"]', { property: "article:modified_time" }, modifiedTime);
      }
    }

    // Canonical
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.rel = "canonical";
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.href = canonical;
    } else if (canonicalEl) {
      canonicalEl.remove();
    }

    // JSON-LD
    const existingLd = document.querySelector('script[data-page-jsonld]');
    if (existingLd) existingLd.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-page-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup JSON-LD on unmount
      const ld = document.querySelector('script[data-page-jsonld]');
      if (ld) ld.remove();
    };
  }, [title, description, canonical, jsonLd, noindex, image, imageAlt, type, publishedTime, modifiedTime]);
};

export default usePageMeta;
