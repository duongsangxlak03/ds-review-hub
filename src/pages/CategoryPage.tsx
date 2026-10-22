import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Store as StoreIcon, Tag, ArrowLeft } from "lucide-react";
import usePageMeta from "@/hooks/usePageMeta";
import { trackCategoryPageView } from "@/lib/tracking";
import { useEffect } from "react";

const CATEGORY_MAP: Record<string, { name: string; aliases?: string[] }> = {
  "fashion-apparel": { name: "Fashion & Apparel", aliases: ["Apparel", "Accessories", "Shoes"] },
  "electronics-tech": { name: "Electronics & Tech", aliases: ["Electronics", "Computers & Laptops"] },
  "beauty-personal-care": { name: "Beauty & Personal Care", aliases: ["Beauty & Fitness"] },
  "health-wellness": { name: "Health & Wellness", aliases: ["Health & Personal Care"] },
  "food-grocery": { name: "Food & Grocery", aliases: ["Food & Dining"] },
  "home-garden": { name: "Home & Garden" },
  "sports-outdoors": { name: "Sports & Outdoors" },
  "travel-hotels": { name: "Travel & Hotels" },
  "entertainment-media": { name: "Entertainment & Media", aliases: ["Books & Media"] },
  "education-courses": { name: "Education & Courses" },
  "software-saas": { name: "Software & SaaS" },
  "finance-insurance": { name: "Finance & Insurance" },
  "baby-kids": { name: "Baby & Kids", aliases: ["Toys & Kids"] },
  "pets": { name: "Pets" },
  "automotive": { name: "Automotive" },
  "office-business": { name: "Office & Business", aliases: ["Services"] },
  "other": { name: "Other" },
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const categoryDef = slug ? CATEGORY_MAP[slug] : undefined;
  const categoryName = categoryDef ? categoryDef.name : slug || "";
  const categoryFilters = categoryDef ? [categoryDef.name, ...(categoryDef.aliases || [])] : [categoryName].filter(Boolean);

  useEffect(() => {
    if (categoryName) {
      trackCategoryPageView({ category: categoryName, page_type: "category" });
    }
  }, [categoryName]);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["category-stores", slug],
    queryFn: async () => {
      const { data: storeList } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, description, category")
        .eq("is_active", true)
        .in("category", categoryFilters)
        .order("name");
      if (!storeList || storeList.length === 0) return [];

      const storeIds = storeList.map((s) => s.id);
      const { data: coupons } = await supabase
        .from("coupons")
        .select("store_id")
        .in("store_id", storeIds)
        .eq("is_active", true);

      const countMap: Record<string, number> = {};
      (coupons || []).forEach((c) => {
        countMap[c.store_id] = (countMap[c.store_id] || 0) + 1;
      });

      return storeList.map((s) => ({ ...s, coupon_count: countMap[s.id] || 0 }));
    },
    enabled: !!categoryName,
  });

  usePageMeta({
    title: `${categoryName} Coupons & Promo Codes - DS Review Hub`,
    description: `Browse ${categoryName} coupons, promo codes, and deals listed on DS Review Hub.`,
    canonical: `https://www.dsreviewhub.com/category/${slug}`,
    noindex: !categoryDef || (!isLoading && stores.length === 0),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${categoryName} Coupons & Deals`,
      url: `https://www.dsreviewhub.com/category/${slug}`,
      description: `Browse coupons and deals for ${categoryName} stores.`,
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 space-y-8">
        <div className="space-y-3">
          <Link
            to="/stores"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Stores
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
            {categoryName}
          </h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Loading..."
              : `${stores.length} store${stores.length !== 1 ? "s" : ""} in ${categoryName}`}
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Loading stores...</div>
        )}

        {!isLoading && stores.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <StoreIcon className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">No stores found in this category yet.</p>
          </div>
        )}

        {!isLoading && stores.length > 0 && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stores.map((store) => (
              <Link
                key={store.id}
                to={`/store/${store.slug || store.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <StoreIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {store.name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {store.coupon_count} {store.coupon_count === 1 ? "code" : "codes"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CategoryPage;
