import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Download, Edit, ExternalLink, Eye, EyeOff, Link2, Loader2, RefreshCcw, Sparkles, Trash2, Upload } from "lucide-react";
import type { Store, StoreReview } from "@/types/database";
import { REVIEW_IMPORT_SCHEMA_VERSION, reviewQualityIssues } from "@/lib/reviewImportContract.js";
import { parseReviewImport, type ReviewImportRow } from "@/lib/reviewImportCsv";
import { notifyPublicContentChanged } from "@/lib/publicContentSync";
import { queueSiteDeploy } from "@/lib/triggerSiteDeploy";

type ReviewWithStore = StoreReview & { stores?: Pick<Store, "name" | "slug" | "logo_url"> | null };
type ReviewVertical = "ai" | "ecommerce";

const verticalConfig = {
  ai: {
    label: "AI Reviews",
    singular: "AI product review",
    category: "AI Tools",
    brandPlaceholder: "e.g. Jasper",
    criteria: ["Output quality + reliability", "Use cases, limits + workflow fit", "Pricing, integrations + privacy"],
    description: "Review AI tools as software products: what they do well, where they fail, who should use them, and the operational tradeoffs.",
  },
  ecommerce: {
    label: "Ecommerce Reviews",
    singular: "ecommerce brand review",
    category: "Ecommerce",
    brandPlaceholder: "e.g. Nike",
    criteria: ["Product quality + catalog fit", "Price, delivery + fulfillment", "Returns, support + shopping trust"],
    description: "Review shopping brands as retailers: product value, buying experience, delivery, returns, support, and who the store best serves.",
  },
} satisfies Record<ReviewVertical, {
  label: string;
  singular: string;
  category: string;
  brandPlaceholder: string;
  criteria: string[];
  description: string;
}>;

type AffiliateIntakeResult = {
  store: Store;
  intake: {
    affiliate_url: string;
    resolved_url: string;
    brand_name: string;
    category: string;
  };
  reference_urls?: string[];
  image_urls?: string[];
};

interface ReviewDraft {
  title: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  dek: string;
  summary: string;
  verdict: string;
  hero_image_url: string;
  hero_image_alt: string;
  status: "draft" | "published" | "archived";
  best_for: string;
  pros: string;
  cons: string;
  content_sections: string;
  faqs: string;
  sources: string;
}

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const parseJsonField = (label: string, value: string) => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`);
    return parsed;
  } catch (error) {
    throw new Error(`${label} JSON khong hop le: ${error instanceof Error ? error.message : "Parse failed"}`);
  }
};

const formatJson = (value: unknown) => JSON.stringify(Array.isArray(value) ? value : [], null, 2);

type QualityReview = {
  title?: string | null;
  h1?: string | null;
  summary?: string | null;
  verdict?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  best_for?: unknown;
  pros?: unknown;
  cons?: unknown;
  content_sections?: unknown;
  faqs?: unknown;
  sources?: unknown;
};

const jsonArray = (value: string) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const draftForQualityCheck = (draft: ReviewDraft): QualityReview => ({
  ...draft,
  best_for: splitLines(draft.best_for),
  pros: splitLines(draft.pros),
  cons: splitLines(draft.cons),
  content_sections: jsonArray(draft.content_sections),
  faqs: jsonArray(draft.faqs),
  sources: jsonArray(draft.sources),
});

const toDraft = (review: ReviewWithStore): ReviewDraft => ({
  title: review.title || "",
  h1: review.h1 || "",
  meta_title: review.meta_title || "",
  meta_description: review.meta_description || "",
  dek: review.dek || "",
  summary: review.summary || "",
  verdict: review.verdict || "",
  hero_image_url: review.hero_image_url || "",
  hero_image_alt: review.hero_image_alt || "",
  status: review.status,
  best_for: (review.best_for || []).join("\n"),
  pros: (review.pros || []).join("\n"),
  cons: (review.cons || []).join("\n"),
  content_sections: formatJson(review.content_sections),
  faqs: formatJson(review.faqs),
  sources: formatJson(review.sources),
});

interface AdminReviewsProps {
  vertical: ReviewVertical;
}

const AdminReviews = ({ vertical }: AdminReviewsProps) => {
  const queryClient = useQueryClient();
  const config = verticalConfig[vertical];
  const reviewImportInputRef = useRef<HTMLInputElement>(null);
  const [selectedStore, setSelectedStore] = useState("");
  const [referenceUrls, setReferenceUrls] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [affiliateBrand, setAffiliateBrand] = useState("");
  const [affiliateCategory, setAffiliateCategory] = useState("");
  const [reviewImportRows, setReviewImportRows] = useState<ReviewImportRow[]>([]);
  const [reviewImportFileName, setReviewImportFileName] = useState("");
  const [editing, setEditing] = useState<ReviewWithStore | null>(null);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("name");
      if (error) throw error;
      return data as Store[];
    },
  });

  const { data: allReviews = [], isLoading } = useQuery({
    queryKey: ["admin-store-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_reviews")
        .select("*, stores(name, slug, logo_url)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ReviewWithStore[];
    },
  });

  const reviews = useMemo(
    () => allReviews.filter((review) => review.review_vertical === vertical),
    [allReviews, vertical],
  );
  const reviewByStoreId = useMemo(() => new Map(allReviews.map((review) => [review.store_id, review])), [allReviews]);
  const eligibleStores = stores.filter((store) => {
    const existingReview = reviewByStoreId.get(store.id);
    return !existingReview || existingReview.review_vertical === vertical;
  });
  const storesWithoutReview = eligibleStores.filter((store) => !reviewByStoreId.has(store.id));

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Not authenticated. Please log in again.");
    return accessToken;
  };

  const parseFunctionResponse = async <T,>(response: Response) => {
    const raw = await response.text();
    let data: (T & { error?: string; details?: string }) | null = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(raw || `Edge Function failed with ${response.status}`);
    }
    if (!response.ok || data?.error) {
      throw new Error([data?.error, data?.details].filter(Boolean).join(": ") || `Edge Function failed with ${response.status}`);
    }
    if (!data) throw new Error("Edge Function returned an empty response.");
    return data;
  };

  const requestReviewDraft = async (storeId: string, references: string[], images: string[]) => {
    const accessToken = await getAccessToken();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-store-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        store_id: storeId,
        review_vertical: vertical,
        reference_urls: Array.from(new Set(references.filter(Boolean))),
        image_urls: Array.from(new Set(images.filter(Boolean))),
        publish: false,
      }),
    });
    const data = await parseFunctionResponse<{ review?: ReviewWithStore }>(response);
    if (!data.review) throw new Error("Generator did not return a review draft.");
    return data.review;
  };

  const generateMutation = useMutation({
    mutationFn: async (storeId: string) => requestReviewDraft(storeId, splitLines(referenceUrls), splitLines(imageUrls)),
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-reviews"] });
      setSelectedStore("");
      setReferenceUrls("");
      setImageUrls("");
      setEditing(review);
      setDraft(toDraft(review));
      toast({ title: "Da tao draft review", description: "Kiem tra noi dung roi publish khi san sang." });
    },
    onError: (error: Error) => {
      toast({ title: "Loi generate review", description: error.message, variant: "destructive" });
    },
  });

  const affiliateGenerateMutation = useMutation({
    mutationFn: async () => {
      const accessToken = await getAccessToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ingest-affiliate-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          affiliate_url: affiliateUrl.trim(),
          brand_name: affiliateBrand.trim() || undefined,
          category: affiliateCategory.trim() || config.category,
        }),
      });
      const intake = await parseFunctionResponse<AffiliateIntakeResult>(response);
      const references = Array.from(new Set([...(intake.reference_urls || []), ...splitLines(referenceUrls)]));
      const images = Array.from(new Set([...(intake.image_urls || []), ...splitLines(imageUrls)]));
      const review = await requestReviewDraft(intake.store.id, references, images);
      return { review, intake };
    },
    onSuccess: ({ review, intake }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store-reviews"] });
      notifyPublicContentChanged(queryClient, "admin-affiliate-review-intake");
      queueSiteDeploy("admin-affiliate-review-intake");
      setAffiliateUrl("");
      setAffiliateBrand("");
      setAffiliateCategory("");
      setReferenceUrls("");
      setImageUrls("");
      setEditing(review);
      setDraft(toDraft(review));
      toast({
        title: `Draft ready for ${intake.intake.brand_name}`,
        description: "Affiliate link preserved. Review must pass the publication gate before going live.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Affiliate review intake failed", description: error.message, variant: "destructive" });
    },
  });

  const reviewImportMutation = useMutation({
    mutationFn: async (rows: ReviewImportRow[]) => {
      let imported = 0;
      for (const row of rows) {
        const { data: existingStore, error: lookupError } = await supabase
          .from("stores")
          .select("*")
          .eq("slug", row.storeSlug)
          .maybeSingle();
        if (lookupError) throw lookupError;

        const storePayload = {
          name: row.storeName,
          slug: row.storeSlug,
          category: row.storeCategory || existingStore?.category || null,
          description: row.storeDescription || existingStore?.description || null,
          logo_url: row.storeLogoUrl || existingStore?.logo_url || null,
          website_url: row.affiliateUrl,
          is_active: true,
        };
        const storeResult = existingStore
          ? await supabase.from("stores").update(storePayload).eq("id", existingStore.id).select("id").single()
          : await supabase.from("stores").insert(storePayload).select("id").single();
        if (storeResult.error) throw new Error(`Row ${row.rowNumber}: ${storeResult.error.message}`);

        const { data: existingReview, error: reviewLookupError } = await supabase
          .from("store_reviews")
          .select("review_vertical")
          .eq("store_id", storeResult.data.id)
          .maybeSingle();
        if (reviewLookupError) throw new Error(`Row ${row.rowNumber}: ${reviewLookupError.message}`);
        if (existingReview && existingReview.review_vertical !== vertical) {
          throw new Error(
            `Row ${row.rowNumber}: ${row.storeName} already belongs to ${existingReview.review_vertical === "ai" ? "AI Reviews" : "Ecommerce Reviews"}. Import it from the matching admin section.`,
          );
        }

        const generatedAt = row.checkedAt && !Number.isNaN(new Date(row.checkedAt).getTime())
          ? new Date(row.checkedAt).toISOString()
          : new Date().toISOString();
        const reviewPayload = {
          store_id: storeResult.data.id,
          review_vertical: vertical,
          title: row.title,
          h1: row.h1 || null,
          slug: row.slug || `${row.storeSlug}-review-${new Date().getFullYear()}`,
          meta_title: row.metaTitle || null,
          meta_description: row.metaDescription || null,
          dek: row.dek || null,
          summary: row.summary,
          verdict: row.verdict || null,
          best_for: row.bestFor,
          pros: row.pros,
          cons: row.cons,
          content_sections: row.contentSections,
          faqs: row.faqs,
          coupon_strategy: {},
          hero_image_url: row.heroImageUrl || null,
          hero_image_alt: row.heroImageAlt || null,
          sources: row.sources,
          research_queries: Array.from(new Set([row.resolvedUrl, ...row.researchQueries].filter(Boolean))),
          title_candidates: row.titleCandidates,
          status: "draft" as const,
          generated_by: "codex-plus-import",
          model: row.model,
          generated_at: generatedAt,
          published_at: null,
        };
        const { error: reviewError } = await supabase
          .from("store_reviews")
          .upsert(reviewPayload, { onConflict: "store_id" });
        if (reviewError) throw new Error(`Row ${row.rowNumber}: ${reviewError.message}`);
        imported += 1;
      }
      return { imported };
    },
    onSuccess: ({ imported }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store-reviews"] });
      notifyPublicContentChanged(queryClient, "admin-review-import");
      queueSiteDeploy("admin-review-import");
      setReviewImportRows([]);
      setReviewImportFileName("");
      if (reviewImportInputRef.current) reviewImportInputRef.current.value = "";
      toast({
        title: `Imported ${imported} review draft${imported === 1 ? "" : "s"}`,
        description: "Affiliate links were preserved. Nothing was auto-published.",
      });
    },
    onError: (error: Error) => toast({ title: "Review import failed", description: error.message, variant: "destructive" }),
  });

  const handleReviewImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = parseReviewImport(await file.text());
      setReviewImportRows(rows);
      setReviewImportFileName(file.name);
      toast({ title: `Loaded ${rows.length} review draft${rows.length === 1 ? "" : "s"}` });
    } catch (error) {
      setReviewImportRows([]);
      setReviewImportFileName("");
      if (reviewImportInputRef.current) reviewImportInputRef.current.value = "";
      toast({ title: "Invalid review CSV", description: error instanceof Error ? error.message : "Could not parse file.", variant: "destructive" });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing || !draft) throw new Error("Khong co review dang sua.");
      const payload = {
        review_vertical: vertical,
        title: draft.title.trim(),
        h1: draft.h1.trim() || null,
        meta_title: draft.meta_title.trim() || null,
        meta_description: draft.meta_description.trim() || null,
        dek: draft.dek.trim() || null,
        summary: draft.summary.trim(),
        verdict: draft.verdict.trim() || null,
        hero_image_url: draft.hero_image_url.trim() || null,
        hero_image_alt: draft.hero_image_alt.trim() || null,
        status: draft.status,
        best_for: splitLines(draft.best_for),
        pros: splitLines(draft.pros),
        cons: splitLines(draft.cons),
        content_sections: parseJsonField("Sections", draft.content_sections),
        faqs: parseJsonField("FAQs", draft.faqs),
        sources: parseJsonField("Sources", draft.sources),
        published_at: draft.status === "published" ? editing.published_at || new Date().toISOString() : null,
      };

      if (!payload.title || !payload.summary) {
        throw new Error("Title va summary la bat buoc.");
      }

      const qualityIssues = reviewQualityIssues(payload);
      if (payload.status === "published" && qualityIssues.length > 0) {
        throw new Error(`Review chua dat publication gate: ${qualityIssues.join(", ")}.`);
      }

      const { error } = await supabase.from("store_reviews").update(payload).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-latest-brand-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["public-store-review"] });
      notifyPublicContentChanged(queryClient, "admin-reviews-save");
      queueSiteDeploy("admin-reviews-save");
      setEditing(null);
      setDraft(null);
      toast({ title: "Da luu store review" });
    },
    onError: (error: Error) => toast({ title: "Loi luu review", description: error.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ review, status }: { review: ReviewWithStore; status: "draft" | "published" | "archived" }) => {
      const qualityIssues = reviewQualityIssues(review);
      if (status === "published" && qualityIssues.length > 0) {
        throw new Error(`Review chua dat publication gate: ${qualityIssues.join(", ")}. Mo Edit de hoan thien truoc.`);
      }

      const { error } = await supabase
        .from("store_reviews")
        .update({
          status,
          published_at: status === "published" ? review.published_at || new Date().toISOString() : null,
        })
        .eq("id", review.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-latest-brand-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["public-store-review"] });
      notifyPublicContentChanged(queryClient, "admin-reviews-status");
      queueSiteDeploy("admin-reviews-status");
      toast({ title: "Da cap nhat trang thai review" });
    },
    onError: (error: Error) => toast({ title: "Loi cap nhat", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-latest-brand-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["public-store-review"] });
      notifyPublicContentChanged(queryClient, "admin-reviews-delete");
      queueSiteDeploy("admin-reviews-delete");
      toast({ title: "Da xoa review" });
    },
  });

  const openEdit = (review: ReviewWithStore) => {
    setEditing(review);
    setDraft(toDraft(review));
  };

  const updateDraft = (field: keyof ReviewDraft, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Separate editorial workflow</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">{config.label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{config.description}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:max-w-2xl">
            {config.criteria.map((criterion) => (
              <div key={criterion} className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-xs font-semibold leading-5 text-foreground">
                {criterion}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/30 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--card))_58%)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] lg:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <Link2 className="h-3.5 w-3.5" /> {config.singular} intake
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl font-black tracking-tight text-foreground">
              Add one affiliate link. Build a {config.singular} draft.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The original affiliate URL stays attached to the store CTA. We resolve the merchant page for research, collect supporting evidence, and create a draft only—never an automatic publish.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-background/50 px-3 py-1.5">Affiliate URL preserved</span>
              <span className="rounded-full border border-border bg-background/50 px-3 py-1.5">Sources + alternatives required</span>
              <span className="rounded-full border border-border bg-background/50 px-3 py-1.5">Quality gate before publish</span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-background/70 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="affiliate-url">Affiliate URL</Label>
              <Input
                id="affiliate-url"
                type="url"
                value={affiliateUrl}
                onChange={(event) => setAffiliateUrl(event.target.value)}
                placeholder="https://merchant-or-network.com/your-aff-link"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="affiliate-brand">Brand override (optional)</Label>
                <Input
                  id="affiliate-brand"
                  value={affiliateBrand}
                  onChange={(event) => setAffiliateBrand(event.target.value)}
                  placeholder={config.brandPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="affiliate-category">Category override (optional)</Label>
                <Input
                  id="affiliate-category"
                  value={affiliateCategory}
                  onChange={(event) => setAffiliateCategory(event.target.value)}
                  placeholder={`e.g. ${config.category}`}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => affiliateGenerateMutation.mutate()}
              disabled={!affiliateUrl.trim() || affiliateGenerateMutation.isPending}
            >
              {affiliateGenerateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Research + Create Draft
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Import {config.label} batch</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Upload the CSV generated by your separate review tool. Every row is tagged as {vertical === "ai" ? "AI" : "Ecommerce"}, imported as a draft, and keeps the exact affiliate URL as the store CTA.
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Accepted contract: {REVIEW_IMPORT_SCHEMA_VERSION}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/review_import_template.csv" download>
                <Download className="mr-2 h-4 w-4" /> CSV schema
              </a>
            </Button>
            <input
              ref={reviewImportInputRef}
              id="review-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleReviewImportFile}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="review-import-file" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" /> Choose generated CSV
              </label>
            </Button>
          </div>
        </div>

        {reviewImportRows.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{reviewImportFileName}</p>
                <p className="text-xs text-muted-foreground">
                  {reviewImportRows.length} draft{reviewImportRows.length === 1 ? "" : "s"} · {reviewImportRows.filter((row) => row.issues.length).length} need editor fixes
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReviewImportRows([]);
                    setReviewImportFileName("");
                    if (reviewImportInputRef.current) reviewImportInputRef.current.value = "";
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" onClick={() => reviewImportMutation.mutate(reviewImportRows)} disabled={reviewImportMutation.isPending}>
                  {reviewImportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Import as drafts
                </Button>
              </div>
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Store</th>
                    <th className="px-4 py-2 font-semibold">Review</th>
                    <th className="px-4 py-2 font-semibold">Gate</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewImportRows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.storeSlug}`} className="border-t border-border align-top">
                      <td className="px-4 py-3 font-semibold text-foreground">{row.storeName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${row.issues.length ? "text-amber-500" : "text-primary"}`}>
                          {row.issues.length ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {row.issues.length ? `${row.issues.length} issue${row.issues.length === 1 ? "" : "s"}` : "Ready for editor"}
                        </span>
                        {row.issues.length > 0 && <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{row.issues.join(" · ")}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{config.label}</h2>
            <p className="text-sm text-muted-foreground">
              Manage only {vertical === "ai" ? "AI product" : "ecommerce brand"} drafts here, then publish each review to its own editorial page.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto]">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Chon store de generate" />
            </SelectTrigger>
            <SelectContent>
              {eligibleStores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}{reviewByStoreId.has(store.id) ? " (regenerate)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={referenceUrls}
            onChange={(event) => setReferenceUrls(event.target.value)}
            placeholder="Reference URLs moi dong 1 URL"
            rows={2}
          />
          <Textarea
            value={imageUrls}
            onChange={(event) => setImageUrls(event.target.value)}
            placeholder="Image URLs duoc cap quyen, moi dong 1 URL"
            rows={2}
          />
          <Button onClick={() => generateMutation.mutate(selectedStore)} disabled={!selectedStore || generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </div>

        {storesWithoutReview.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {storesWithoutReview.length} store{storesWithoutReview.length !== 1 ? "s" : ""} chua co review.
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Dang tai reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chua co {config.singular} nao.</p>
      ) : (
        <div className="grid gap-3">
          {reviews.map((review) => {
            const qualityIssues = reviewQualityIssues(review);
            return (
            <Card key={review.id} className={review.status === "published" ? "border-primary/50" : ""}>
              <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {review.stores?.logo_url && (
                      <img src={review.stores.logo_url} alt="" className="h-8 w-8 rounded bg-white object-contain p-1" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{review.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.stores?.name || "Unknown store"} - {review.status} - Updated {new Date(review.updated_at).toLocaleDateString()}
                      </p>
                      <p className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${qualityIssues.length === 0 ? "text-primary" : "text-amber-500"}`}>
                        {qualityIssues.length === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {qualityIssues.length === 0 ? "Publication gate passed" : `${qualityIssues.length} publication issue${qualityIssues.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.status === "published" && review.slug && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/reviews/${review.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-4 w-4" /> View page
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => generateMutation.mutate(review.store_id)} disabled={generateMutation.isPending}>
                    <RefreshCcw className="mr-1 h-4 w-4" /> Regenerate
                  </Button>
                  {review.status === "published" ? (
                    <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ review, status: "draft" })}>
                      <EyeOff className="mr-1 h-4 w-4" /> Unpublish
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ review, status: "published" })} disabled={qualityIssues.length > 0} title={qualityIssues.join(", ")}>
                      <Eye className="mr-1 h-4 w-4" /> Publish
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(review)}>
                    <Edit className="mr-1 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Xoa store review nay?")) deleteMutation.mutate(review.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing && !!draft} onOpenChange={(open) => { if (!open) { setEditing(null); setDraft(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {config.singular}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate();
              }}
            >
              {(() => {
                const qualityIssues = reviewQualityIssues(draftForQualityCheck(draft));
                return (
                  <div className={`rounded-xl border p-4 ${qualityIssues.length === 0 ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      {qualityIssues.length === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {qualityIssues.length === 0 ? "Publication gate passed" : `${qualityIssues.length} issue${qualityIssues.length === 1 ? "" : "s"} before publish`}
                    </div>
                    {qualityIssues.length > 0 && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{qualityIssues.join(" · ")}</p>
                    )}
                  </div>
                );
              })()}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(value) => updateDraft("status", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>H1</Label>
                  <Input value={draft.h1} onChange={(event) => updateDraft("h1", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hero Image URL</Label>
                  <Input value={draft.hero_image_url} onChange={(event) => updateDraft("hero_image_url", event.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input value={draft.meta_title} onChange={(event) => updateDraft("meta_title", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Input value={draft.meta_description} onChange={(event) => updateDraft("meta_description", event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dek</Label>
                <Textarea value={draft.dek} onChange={(event) => updateDraft("dek", event.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Summary *</Label>
                <Textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} rows={4} required />
              </div>
              <div className="space-y-2">
                <Label>Verdict</Label>
                <Textarea value={draft.verdict} onChange={(event) => updateDraft("verdict", event.target.value)} rows={3} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Best For</Label>
                  <Textarea value={draft.best_for} onChange={(event) => updateDraft("best_for", event.target.value)} rows={5} />
                </div>
                <div className="space-y-2">
                  <Label>Pros</Label>
                  <Textarea value={draft.pros} onChange={(event) => updateDraft("pros", event.target.value)} rows={5} />
                </div>
                <div className="space-y-2">
                  <Label>Cons</Label>
                  <Textarea value={draft.cons} onChange={(event) => updateDraft("cons", event.target.value)} rows={5} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content Sections JSON</Label>
                <Textarea value={draft.content_sections} onChange={(event) => updateDraft("content_sections", event.target.value)} rows={10} className="font-mono text-xs" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>FAQs JSON</Label>
                  <Textarea value={draft.faqs} onChange={(event) => updateDraft("faqs", event.target.value)} rows={8} className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Sources JSON</Label>
                  <Textarea value={draft.sources} onChange={(event) => updateDraft("sources", event.target.value)} rows={8} className="font-mono text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setEditing(null); setDraft(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Review"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviews;
