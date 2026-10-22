import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, X, Sparkles, Loader2, ExternalLink, Copy, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queueSiteDeploy, triggerSiteDeploy } from "@/lib/triggerSiteDeploy";
import { notifyPublicContentChanged } from "@/lib/publicContentSync";

const BLOG_IMAGE_BUCKET = "blog-images";
const LOCAL_BLOG_GENERATOR_URL = "http://127.0.0.1:4317";

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const postUrl = (slug?: string) => `https://www.dsreviewhub.com/insights/${slug || ""}`;

const csvValue = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const AdminBlog = () => {
  const queryClient = useQueryClient();
  const [editPost, setEditPost] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [aiStoreIds, setAiStoreIds] = useState<string[]>([]);
  const [aiStoreSearch, setAiStoreSearch] = useState("");
  const [aiReferenceUrls, setAiReferenceUrls] = useState("");
  const [aiImageUrls, setAiImageUrls] = useState("");
  const [aiPublish, setAiPublish] = useState(false);
  const [aiGenerationProgress, setAiGenerationProgress] = useState("");
  const [insightSourceUrl, setInsightSourceUrl] = useState("");
  const [insightSourceAuthor, setInsightSourceAuthor] = useState("");
  const [insightSourceText, setInsightSourceText] = useState("");
  const [insightCategory, setInsightCategory] = useState("AI & Automation");
  const [insightRights, setInsightRights] = useState("inspiration");
  const [insightImageUrl, setInsightImageUrl] = useState("");
  const [insightImageRights, setInsightImageRights] = useState("generated");
  const [insightVisualPreset, setInsightVisualPreset] = useState("auto");
  const [insightPublish, setInsightPublish] = useState(false);

  useEffect(() => {
    if (!showForm) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    setImageFile(null);
    setImagePreview(editPost?.image_url || "");
  }, [showForm, editPost?.id]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-blog-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredStores = stores.filter((store: any) =>
    `${store.name || ""} ${store.slug || ""}`.toLowerCase().includes(aiStoreSearch.trim().toLowerCase())
  );

  const toggleAiStore = (storeId: string) => {
    setAiStoreIds((current) =>
      current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]
    );
  };

  const copyPostLink = async (post: any) => {
    await navigator.clipboard.writeText(postUrl(post.slug));
    toast({ title: "Copied blog link", description: postUrl(post.slug) });
  };

  const exportBlogLinks = () => {
    const header = ["title", "status", "category", "url", "published_at", "created_at"];
    const rows = posts.map((post: any) => [
      post.title,
      post.is_published ? "published" : "draft",
      post.category || "",
      postUrl(post.slug),
      post.published_at || "",
      post.created_at || "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blog-links-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateBlogMutation = useMutation({
    mutationFn: async () => {
      if (aiStoreIds.length === 0) throw new Error("Choose at least one store.");

      const results: { url?: string }[] = [];
      for (let i = 0; i < aiStoreIds.length; i += 1) {
        const storeId = aiStoreIds[i];
        const store = stores.find((item: any) => item.id === storeId);
        setAiGenerationProgress(`${i + 1}/${aiStoreIds.length}`);

        const response = await fetch(`${LOCAL_BLOG_GENERATOR_URL}/generate-blog-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_id: storeId,
            reference_urls: splitLines(aiReferenceUrls),
            image_urls: splitLines(aiImageUrls),
            publish: aiPublish,
          }),
        });

        const raw = await response.text();
        let data: { error?: string; url?: string; stdout?: string } = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { error: raw || `Local generator failed with ${response.status}` };
        }

        if (!response.ok) throw new Error(`${store?.name || "Store"}: ${data.error || `Local generator failed with ${response.status}`}`);
        results.push(data);
      }

      return results;
    },
    onSuccess: async (results) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      notifyPublicContentChanged(queryClient, "admin-blog-generate");
      setAiReferenceUrls("");
      setAiImageUrls("");
      if (aiPublish) {
        try {
          await triggerSiteDeploy("admin-blog-publish");
        } catch (error) {
          toast({
            title: "Published, but deploy was not triggered",
            description: error instanceof Error ? error.message : "Use Rebuild SEO site after this.",
            variant: "destructive",
          });
        }
      }
      toast({
        title: aiPublish ? "Published blog posts and started SEO rebuild" : "Created draft blog posts",
        description: aiPublish
          ? `${results.length} post${results.length !== 1 ? "s" : ""} generated. Vercel is rebuilding sitemap and prerendered pages.`
          : `${results.length} post${results.length !== 1 ? "s" : ""} generated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Local blog generator failed",
        description: error.message.includes("Failed to fetch")
          ? "Start scripts/start-local-blog-generator.cmd first, then try again."
          : error.message,
        variant: "destructive",
      });
    },
    onSettled: () => setAiGenerationProgress(""),
  });

  const generateInsightMutation = useMutation({
    mutationFn: async () => {
      if (insightSourceText.trim().length < 80) {
        throw new Error("Paste the LinkedIn/source post text (at least 80 characters).");
      }
      if (insightImageUrl.trim() && !["owned", "licensed"].includes(insightImageRights)) {
        throw new Error("Choose Owned or Licensed before reusing a source image. Otherwise leave the URL empty and generate a local visual.");
      }

      const response = await fetch(`${LOCAL_BLOG_GENERATOR_URL}/generate-linkedin-insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: insightSourceUrl.trim(),
          source_author: insightSourceAuthor.trim(),
          source_text: insightSourceText.trim(),
          category: insightCategory,
          rights_status: insightRights,
          source_image_url: insightImageUrl.trim(),
          image_rights_status: insightImageRights,
          visual_preset: insightVisualPreset,
          publish: insightPublish,
        }),
      });

      const raw = await response.text();
      let data: { error?: string; url?: string; image_url?: string; preset?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || `Local generator failed with ${response.status}` }; }
      if (!response.ok) throw new Error(data.error || `Local generator failed with ${response.status}`);
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      notifyPublicContentChanged(queryClient, "admin-insight-generate");
      setInsightSourceText("");
      setInsightImageUrl("");
      if (insightPublish) {
        try { await triggerSiteDeploy("admin-insight-publish"); } catch (error) {
          toast({ title: "Published, but deploy was not triggered", description: error instanceof Error ? error.message : "Run Rebuild SEO site.", variant: "destructive" });
        }
      }
      toast({
        title: insightPublish ? "Insight published" : "Insight draft created",
        description: data.preset
          ? `Article + ${data.preset} visual were pushed to Admin.`
          : (data.url ? `Ready at ${data.url}` : "Open the draft below to edit and review it."),
      });
    },
    onError: (error: Error) => toast({
      title: "Insight generator failed",
      description: error.message.includes("Failed to fetch") ? "Start scripts/start-local-blog-generator.cmd first, then try again." : error.message,
      variant: "destructive",
    }),
  });

  const uploadBlogImage = async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error("File upload phải là ảnh.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ảnh blog tối đa 5MB.");
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;
    const { error } = await supabase.storage
      .from(BLOG_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (error) throw new Error("Lỗi upload ảnh blog: " + error.message);

    const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async (post: any) => {
      const slug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const uploadedImageUrl = imageFile ? await uploadBlogImage(imageFile) : post.image_url;
      const payload = {
        title: post.title,
        slug,
        excerpt: post.excerpt || null,
        content: post.content,
        image_url: uploadedImageUrl || null,
        category: post.category || null,
        tags: post.tags ? post.tags.split(",").map((t: string) => t.trim()) : [],
        is_published: post.is_published || false,
        published_at: post.is_published ? (post.published_at || new Date().toISOString()) : null,
      };

      if (post.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      notifyPublicContentChanged(queryClient, "admin-blog-save");
      queueSiteDeploy("admin-blog-save");
      setShowForm(false);
      setEditPost(null);
      setImageFile(null);
      setImagePreview("");
      toast({ title: "Đã lưu bài viết" });
    },
    onError: (e: any) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      notifyPublicContentChanged(queryClient, "admin-blog-delete");
      queueSiteDeploy("admin-blog-delete");
      toast({ title: "Đã xóa bài viết" });
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("blog_posts").update({
        is_published: !is_published,
        published_at: !is_published ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      notifyPublicContentChanged(queryClient, "admin-blog-publish-toggle");
      queueSiteDeploy("admin-blog-publish-toggle");
    },
  });

  const openNew = () => {
    setEditPost({ title: "", content: "", excerpt: "", image_url: "", category: "", tags: "", is_published: false });
    setImageFile(null);
    setImagePreview("");
    setShowForm(true);
  };

  const openEdit = (post: any) => {
    setEditPost({ ...post, tags: (post.tags || []).join(", ") });
    setImageFile(null);
    setImagePreview(post.image_url || "");
    setShowForm(true);
  };

  const handleImageChange = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Lỗi", description: "File upload phải là ảnh.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Lỗi", description: "Ảnh blog tối đa 5MB.", variant: "destructive" });
      return;
    }

    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    setEditPost((post: any) => ({ ...post, image_url: "" }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Insights Publishing</h2>
        <div className="flex items-center gap-2">
          <Button onClick={exportBlogLinks} size="sm" variant="outline" className="gap-1" disabled={posts.length === 0}>
            <Download className="h-4 w-4" /> Export Links
          </Button>
          <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Insight</Button>
        </div>
      </div>

      <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-base font-bold text-foreground">LinkedIn / source → original Insight</h3>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Paste a source post. Your local machine rewrites it, renders an original 1600×900 visual, uploads both, and creates an editable Admin draft.
            </p>
          </div>
          <Button onClick={() => generateInsightMutation.mutate()} disabled={insightSourceText.trim().length < 80 || generateInsightMutation.isPending} className="gap-2">
            {generateInsightMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generateInsightMutation.isPending ? "Writing + rendering..." : "Create local draft"}
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">LinkedIn or source URL</label>
              <Input value={insightSourceUrl} onChange={(event) => setInsightSourceUrl(event.target.value)} placeholder="https://www.linkedin.com/posts/..." />
            </div>
            <div>
              <label className="text-sm font-medium">Source author</label>
              <Input value={insightSourceAuthor} onChange={(event) => setInsightSourceAuthor(event.target.value)} placeholder="Madhav Mistry" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Topic</label>
                <select value={insightCategory} onChange={(event) => setInsightCategory(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {["AI & Automation", "Technology", "Ecommerce", "SEO & Discovery", "Marketing Systems", "Buying Intelligence"].map((topic) => <option key={topic}>{topic}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Text rights</label>
                <select value={insightRights} onChange={(event) => setInsightRights(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="inspiration">Inspiration only (recommended)</option>
                  <option value="excerpt_with_attribution">Short excerpt + attribution</option>
                  <option value="licensed_reprint">Licensed to reuse</option>
                  <option value="owned">My own source</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Paste the full post / notes *</label>
            <Textarea value={insightSourceText} onChange={(event) => setInsightSourceText(event.target.value)} placeholder="Paste the LinkedIn post here. The generator uses it as research material and creates a new article..." rows={9} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{insightSourceText.trim().length} characters</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <div>
            <label className="text-sm font-medium">Source image URL (optional)</label>
            <Input value={insightImageUrl} onChange={(event) => setInsightImageUrl(event.target.value)} placeholder="Only use an image you own or are licensed to republish" />
          </div>
          <div>
            <label className="text-sm font-medium">Image rights</label>
            <select value={insightImageRights} onChange={(event) => setInsightImageRights(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="generated">Generate locally (recommended)</option>
              <option value="owned">Owned</option>
              <option value="licensed">Licensed</option>
              <option value="unknown">Unknown — generate locally</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Visual layout</label>
            <select value={insightVisualPreset} onChange={(event) => setInsightVisualPreset(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="auto">Auto choose</option>
              <option value="workflow">Workflow</option>
              <option value="layers">Layers</option>
              <option value="stack">Modular stack</option>
              <option value="comparison">Comparison</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={insightPublish} onChange={(event) => setInsightPublish(event.target.checked)} />
            Publish immediately (draft first is safer)
          </label>
          {generateInsightMutation.data?.url && <a href={generateInsightMutation.data.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open generated insight <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
        {generateInsightMutation.data?.image_url && (
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            <img src={generateInsightMutation.data.image_url} alt="Generated Insight visual preview" className="aspect-video w-full object-cover" />
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span>Local 1600×900 visual · {generateInsightMutation.data.preset || "auto"}</span>
              <a href={generateInsightMutation.data.image_url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Open image</a>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Store-review article generator</h3>
            <p className="text-xs text-muted-foreground">Local Gemini bridge: {LOCAL_BLOG_GENERATOR_URL}</p>
          </div>
          <Button
            onClick={() => generateBlogMutation.mutate()}
            disabled={aiStoreIds.length === 0 || generateBlogMutation.isPending}
            className="gap-2"
          >
            {generateBlogMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generateBlogMutation.isPending ? `Generating ${aiGenerationProgress}` : `Generate AI Blog${aiStoreIds.length > 0 ? ` (${aiStoreIds.length})` : ""}`}
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Stores</label>
              <div className="flex items-center gap-2 text-xs">
                <button type="button" className="font-bold text-primary hover:underline" onClick={() => setAiStoreIds(stores.map((store: any) => store.id))}>
                  Select all
                </button>
                <button type="button" className="font-bold text-muted-foreground hover:text-foreground" onClick={() => setAiStoreIds([])}>
                  Clear
                </button>
              </div>
            </div>
            <Input
              value={aiStoreSearch}
              onChange={(event) => setAiStoreSearch(event.target.value)}
              placeholder="Search stores..."
              className="h-9"
            />
            <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-background p-2 space-y-1">
              {filteredStores.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">No stores found.</p>
              ) : (
                filteredStores.map((store: any) => (
                  <label key={store.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={aiStoreIds.includes(store.id)}
                      onChange={() => toggleAiStore(store.id)}
                    />
                    <span className="min-w-0 truncate">{store.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">{aiStoreIds.length} selected</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reference URLs</label>
            <Textarea
              value={aiReferenceUrls}
              onChange={(event) => setAiReferenceUrls(event.target.value)}
              placeholder="Optional, one URL per line"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Image URLs</label>
            <Textarea
              value={aiImageUrls}
              onChange={(event) => setAiImageUrls(event.target.value)}
              placeholder="Optional, one image URL per line"
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={aiPublish}
              onChange={(event) => setAiPublish(event.target.checked)}
            />
            Publish immediately
          </label>
          {generateBlogMutation.data?.[0]?.url && (
            <a
              href={generateBlogMutation.data[0].url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open latest generated post <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              {post.image_url && (
                <img src={post.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground">
                  {post.is_published ? "✅ Published" : "📝 Draft"}
                  {post.category && ` • ${post.category}`}
                  {post.content_type === "insight" || post.tags?.includes("DS Insight") ? " • Insight feed" : " • Legacy (hidden from Insights)"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => copyPostLink(post)} title="Copy blog link">
                  <Copy className="h-4 w-4" />
                </Button>
                {post.is_published && (
                  <Button variant="ghost" size="icon" asChild title="Open blog post">
                    <a href={postUrl(post.slug)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => togglePublish.mutate({ id: post.id, is_published: post.is_published })}>
                  {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa bài viết này?")) deleteMutation.mutate(post.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); setEditPost(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPost?.id ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>
          {editPost && (
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(editPost); }}
            >
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input value={editPost.title} onChange={(e) => setEditPost({ ...editPost, title: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Slug (auto-generated if empty)</label>
                <Input value={editPost.slug || ""} onChange={(e) => setEditPost({ ...editPost, slug: e.target.value })} placeholder="my-blog-post" />
              </div>
              <div>
                <label className="text-sm font-medium">Excerpt</label>
                <Textarea value={editPost.excerpt || ""} onChange={(e) => setEditPost({ ...editPost, excerpt: e.target.value })} rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">Content * (Markdown supported)</label>
                <Textarea value={editPost.content} onChange={(e) => setEditPost({ ...editPost, content: e.target.value })} rows={12} required />
                <p className="mt-1 text-xs text-muted-foreground">
                  Coupon box shortcode: <code>[coupon store="three-bird-nest" code="DELCID20"]</code>
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="blog-image-upload">Blog image</label>
                {imagePreview ? (
                  <>
                    <div className="relative overflow-hidden rounded-xl border border-border bg-secondary">
                      <img src={imagePreview} alt="" className="aspect-video w-full object-cover" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <label
                      htmlFor="blog-image-upload"
                      className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      <Upload className="h-4 w-4" />
                      Replace image
                    </label>
                  </>
                ) : (
                  <label
                    htmlFor="blog-image-upload"
                    className="block cursor-pointer rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
                  >
                    <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium">Upload ảnh đại diện bài blog</p>
                    <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP hoặc GIF. Tối đa 5MB.</p>
                  </label>
                )}
                <Input
                  id="blog-image-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    handleImageChange(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={editPost.category || ""} onChange={(e) => setEditPost({ ...editPost, category: e.target.value })} placeholder="Sale Calendars" />
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input value={editPost.tags || ""} onChange={(e) => setEditPost({ ...editPost, tags: e.target.value })} placeholder="SEO, Shopping" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editPost.is_published} onChange={(e) => setEditPost({ ...editPost, is_published: e.target.checked })} id="published" />
                <label htmlFor="published" className="text-sm">Publish immediately</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditPost(null); }}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlog;
