import { QueryClient, QueryClientProvider, type Query } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import GoogleTagsLoader from "@/components/GoogleTagsLoader";
import PublicContentSync from "@/components/PublicContentSync";
import StorePage from "./pages/StorePage";
import { CouponRevealProvider } from "@/contexts/CouponRevealContext";

const Toaster = lazy(() => import("@/components/ui/toaster").then((mod) => ({ default: mod.Toaster })));
const Index = lazy(() => import("./pages/Index"));
const WhyDifferent = lazy(() => import("./pages/WhyDifferent"));
const Auth = lazy(() => import("./pages/Auth"));
const AllStores = lazy(() => import("./pages/AllStores"));
const Admin = lazy(() => import("./pages/Admin"));
const Learn = lazy(() => import("./pages/Learn"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Deals = lazy(() => import("./pages/Deals"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ReviewRouterPage = lazy(() => import("./pages/ReviewRouterPage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Disclosure = lazy(() => import("./pages/Disclosure"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 1000 * 60 * 30,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const persistedPublicQueryKeys = new Set([
  "store",
  "store-coupons",
  "all-stores",
  "public-deals",
  "category-stores",
  "blog-posts-public",
  "blog-post",
  "blog-coupon-shortcodes",
  "homepage-active-store-count",
  "homepage-verified-store-grid",
  "homepage-latest-brand-reviews",
  "public-store-review",
  "store-deals",
  "store-review",
  "store-savings-guide",
  "similar-stores",
  "competitor-stores",
  "hot-coupons-section",
  "homepage-latest-insights",
  "google-tags-active",
]);

const shouldPersistQuery = (query: Query) => {
  if (query.state.status !== "success") return false;
  const queryKey = query.queryKey[0];
  if (typeof queryKey !== "string") return false;
  return persistedPublicQueryKeys.has(queryKey);
};

const isCouponRevealBoot = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    new URLSearchParams(window.location.search).has("coupon") ||
    (window as Window & { __DS_COUPON_REVEAL?: unknown }).__DS_COUPON_REVEAL
  );
};

if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("DS_COUPONS_QUERY_CACHE");
  } catch {
    // Ignore storage errors in privacy-restricted browsers.
  }
}

const queryPersister = typeof window === "undefined" || isCouponRevealBoot()
  ? null
  : createSyncStoragePersister({
      storage: window.localStorage,
      key: "DS_COUPONS_QUERY_CACHE_V2",
      throttleTime: 2000,
    });

const AppQueryProvider = ({ children }: { children: ReactNode }) => {
  if (!queryPersister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 2 * 60 * 1000,
        buster: "public-store-cache-v3-live",
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};

const PageFallback = () => (
  <div className="min-h-screen bg-background" />
);

const DeferredToaster = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 800);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  );
};

const App = () => (
  <AppQueryProvider>
    <CouponRevealProvider>
      <GoogleTagsLoader />
      <PublicContentSync />
      <DeferredToaster />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/why-different" element={<WhyDifferent />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/stores" element={<AllStores />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/insights" element={<Blog />} />
            <Route path="/insights/:slug" element={<BlogPost />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/store/:slug" element={<StorePage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/reviews/:slug" element={<ReviewRouterPage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/disclosure" element={<Disclosure />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CouponRevealProvider>
  </AppQueryProvider>
);

export default App;
