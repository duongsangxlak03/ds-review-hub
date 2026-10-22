import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, X, Tag, Download, Search, GripVertical, Copy, ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import type { Store, Coupon, UseCodeTip } from "@/types/database";
import { notifyPublicContentChanged } from "@/lib/publicContentSync";
import { queueSiteDeploy } from "@/lib/triggerSiteDeploy";

interface CouponDraft {
  id?: string;
  title: string;
  code: string;
  discount_value: string;
  description: string;
  url: string;
  expiry_date: string;
  is_verified: boolean;
  sort_order: number;
}

const emptyCoupon = (): CouponDraft => ({
  title: "", code: "", discount_value: "", description: "", url: "", expiry_date: "", is_verified: true, sort_order: 999,
});

interface UseCodeTipDraft extends UseCodeTip {
  key: string;
  file?: File;
  preview_url?: string;
}

const STORE_TIP_BUCKET = "store-code-tips";
const MAX_STORE_TIPS = 3;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";

const parseUseCodeTips = (value: unknown): UseCodeTipDraft[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter((tip) => typeof tip.image_url === "string")
    .slice(0, MAX_STORE_TIPS)
    .map((tip) => ({
      key: crypto.randomUUID(),
      code: String(tip.code || ""),
      affiliate_url: String(tip.affiliate_url || ""),
      image_url: String(tip.image_url || ""),
      preview_image_url: String(tip.preview_image_url || tip.thumbnail_url || tip.image_url || ""),
      thumbnail_url: String(tip.thumbnail_url || tip.image_url || ""),
      caption: String(tip.caption || ""),
    }));
};

const resizeImageToWebp = async (file: File, maxWidth: number, quality: number): Promise<Blob> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Could not read checkout screenshot."));
      nextImage.src = objectUrl;
    });

    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not optimize checkout screenshot.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Could not convert checkout screenshot to WebP.")),
        "image/webp",
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const AdminStores = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [coupons, setCoupons] = useState<CouponDraft[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [useCodeTips, setUseCodeTips] = useState<UseCodeTipDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Export States
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  // Pagination & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as Store[];
    },
  });

  useEffect(() => {
    if (editing) {
      setLogoPreview(editing.logo_url || "");
      setUseCodeTips(parseUseCodeTips(editing.use_code_tips));
      const fetchCoupons = async () => {
        try {
          const result = await supabase.from("coupons").select("*").eq("store_id", editing.id).order("sort_order", { ascending: true });
          let data = result.data;
          const error = result.error;
          if (error) {
            const fallback = await supabase.from("coupons").select("*").eq("store_id", editing.id);
            data = fallback.data;
          }
          setCoupons((data || []).map((c, idx) => ({
            id: c.id, title: c.title || "", code: c.code || "", discount_value: c.discount_value || "",
            description: c.description || "", url: c.url || "", expiry_date: c.expiry_date ? c.expiry_date.split("T")[0] : "", is_verified: c.is_verified ?? true, sort_order: c.sort_order ?? idx,
          })));
        } catch (err) {
          toast({ title: "Lỗi tải Coupons", variant: "destructive" });
        }
      };
      fetchCoupons();
    } else {
      setCoupons([]); setLogoPreview(""); setLogoFile(null); setUseCodeTips([]);
    }
  }, [editing]);

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("store-logos").upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (error) throw new Error("Lỗi upload logo: " + error.message);
    const { data } = supabase.storage.from("store-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadUseCodeTip = async (storeId: string, tip: UseCodeTipDraft): Promise<UseCodeTip> => {
    if (!tip.file) {
      return {
        code: tip.code.trim(),
        affiliate_url: tip.affiliate_url.trim(),
        image_url: tip.image_url,
        preview_image_url: tip.preview_image_url || tip.thumbnail_url || tip.image_url,
        thumbnail_url: tip.thumbnail_url || tip.image_url,
        caption: tip.caption.trim(),
      };
    }

    const [fullImage, previewImage, thumbnail] = await Promise.all([
      resizeImageToWebp(tip.file, 1400, 0.82),
      resizeImageToWebp(tip.file, 900, 0.76),
      resizeImageToWebp(tip.file, 260, 0.72),
    ]);
    const fileId = crypto.randomUUID();
    const fullPath = `${storeId}/${fileId}-full.webp`;
    const previewPath = `${storeId}/${fileId}-preview.webp`;
    const thumbnailPath = `${storeId}/${fileId}-thumb.webp`;
    const uploadOptions = { cacheControl: "31536000", upsert: false, contentType: "image/webp" };

    const [{ error: fullError }, { error: previewError }, { error: thumbnailError }] = await Promise.all([
      supabase.storage.from(STORE_TIP_BUCKET).upload(fullPath, fullImage, uploadOptions),
      supabase.storage.from(STORE_TIP_BUCKET).upload(previewPath, previewImage, uploadOptions),
      supabase.storage.from(STORE_TIP_BUCKET).upload(thumbnailPath, thumbnail, uploadOptions),
    ]);
    if (fullError) throw new Error("Checkout screenshot upload failed: " + fullError.message);
    if (previewError) throw new Error("Checkout screenshot preview upload failed: " + previewError.message);
    if (thumbnailError) throw new Error("Checkout screenshot thumbnail upload failed: " + thumbnailError.message);

    const { data: fullUrl } = supabase.storage.from(STORE_TIP_BUCKET).getPublicUrl(fullPath);
    const { data: previewUrl } = supabase.storage.from(STORE_TIP_BUCKET).getPublicUrl(previewPath);
    const { data: thumbnailUrl } = supabase.storage.from(STORE_TIP_BUCKET).getPublicUrl(thumbnailPath);
    return {
      code: tip.code.trim(),
      affiliate_url: tip.affiliate_url.trim(),
      image_url: fullUrl.publicUrl,
      preview_image_url: previewUrl.publicUrl,
      thumbnail_url: thumbnailUrl.publicUrl,
      caption: tip.caption.trim(),
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (formEl: HTMLFormElement) => {
      setUploading(true);
      const form = new FormData(formEl);
      let logoUrl = logoPreview;
      if (logoFile) logoUrl = await uploadLogo(logoFile);

      const payload = {
        name: (form.get("name") as string).trim(),
        slug: (form.get("slug") as string).trim() || null,
        description: (form.get("description") as string).trim() || null,
        website_url: (form.get("website_url") as string).trim() || null,
        logo_url: logoUrl || null,
      };

      let storeId: string;
      if (editing) {
        const { error } = await supabase.from("stores").update(payload).eq("id", editing.id);
        if (error) throw error;
        storeId = editing.id;
      } else {
        const { data, error } = await supabase.from("stores").insert(payload).select("id").single();
        if (error) throw error;
        storeId = data.id;
      }

      const optimizedTips = await Promise.all(useCodeTips.map((tip) => uploadUseCodeTip(storeId, tip)));
      const { error: tipsError } = await supabase.from("stores").update({ use_code_tips: optimizedTips }).eq("id", storeId);
      if (tipsError) throw tipsError;

      if (editing) {
        const existingIds = coupons.filter((c) => c.id).map((c) => c.id!);
        if (existingIds.length > 0) {
          await supabase.from("coupons").delete().eq("store_id", storeId).not("id", "in", `(${existingIds.join(",")})`);
        } else {
          await supabase.from("coupons").delete().eq("store_id", storeId);
        }
      }

      for (let idx = 0; idx < coupons.length; idx++) {
        const coupon = coupons[idx];
        if (!coupon.title.trim()) continue;
        const couponPayload = {
          store_id: storeId, title: coupon.title.trim(), code: coupon.code.trim() || null,
          discount_value: coupon.discount_value.trim() || null, description: coupon.description.trim() || null,
          url: coupon.url.trim() || null, expiry_date: coupon.expiry_date || null, is_verified: coupon.is_verified, sort_order: idx,
        };
        if (coupon.id) await supabase.from("coupons").update(couponPayload).eq("id", coupon.id);
        else await supabase.from("coupons").insert(couponPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      notifyPublicContentChanged(queryClient, "admin-stores-save");
      queueSiteDeploy("admin-stores-save");
      setOpen(false); setEditing(null);
      toast({ title: editing ? "Đã cập nhật store" : "Đã thêm store" });
    },
    onError: (e: Error) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
    onSettled: () => setUploading(false),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await supabase.from("coupons").delete().eq("store_id", id);
        await supabase.from("deals").delete().eq("store_id", id);
        const { error } = await supabase.from("stores").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      notifyPublicContentChanged(queryClient, "admin-stores-delete");
      queueSiteDeploy("admin-stores-delete");
      setSelectedIds(new Set());
      toast({ title: "Đã xoá hàng loạt!" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); saveMutation.mutate(e.currentTarget); };
  const openEdit = (store: Store) => { setEditing(store); setOpen(true); };
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file); setLogoPreview(URL.createObjectURL(file));
  };

  const handleUseCodeTipFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const nextFiles = files.slice(0, Math.max(0, MAX_STORE_TIPS - useCodeTips.length));
    const oversized = nextFiles.find((file) => file.size > 10 * 1024 * 1024);
    if (oversized) {
      toast({ title: "Checkout screenshot is too large", description: "Each source image must be 10MB or smaller.", variant: "destructive" });
      return;
    }

    setUseCodeTips((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        key: crypto.randomUUID(),
        file,
        preview_url: URL.createObjectURL(file),
        code: "",
        affiliate_url: "",
        image_url: "",
        preview_image_url: "",
        thumbnail_url: "",
        caption: "",
      })),
    ]);
  };

  const updateUseCodeTip = (key: string, field: "code" | "affiliate_url" | "caption", value: string) => {
    setUseCodeTips((current) => current.map((tip) => tip.key === key ? { ...tip, [field]: value } : tip));
  };

  const removeUseCodeTip = (key: string) => {
    setUseCodeTips((current) => {
      const removed = current.find((tip) => tip.key === key);
      if (removed?.preview_url) URL.revokeObjectURL(removed.preview_url);
      return current.filter((tip) => tip.key !== key);
    });
  };

  const updateCoupon = (index: number, field: keyof CouponDraft, value: string) => setCoupons((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  const updateCouponVerified = (index: number, value: boolean) => setCoupons((prev) => prev.map((c, i) => i === index ? { ...c, is_verified: value } : c));
  const removeCoupon = (index: number) => setCoupons((prev) => prev.filter((_, i) => i !== index));

  const getFilteredExportStores = () => {
    let filtered = stores.filter((s) => s.slug);
    if (exportDateFrom) filtered = filtered.filter((s) => s.created_at >= exportDateFrom);
    if (exportDateTo) {
      const toEnd = exportDateTo + "T23:59:59";
      filtered = filtered.filter((s) => s.created_at <= toEnd);
    }
    return filtered;
  };

  const exportStoreLinks = () => {
    const filtered = getFilteredExportStores();
    if (filtered.length === 0) {
      toast({ title: "Không có store nào trong khoảng ngày này", variant: "destructive" });
      return;
    }
    const baseUrl = window.location.origin;
    const csv = "store_name,store_slug,store_link,affiliate_link,created_at\n" + filtered.map((s) => `"${s.name}","${s.slug}","${baseUrl}/store/${s.slug}","${s.website_url || ""}","${s.created_at.split("T")[0]}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "store_links.csv"; a.click(); URL.revokeObjectURL(url);
    toast({ title: "Đã tải!", description: `${filtered.length} store links.` });
  };

  const copyStoreLinks = () => {
    const filtered = getFilteredExportStores();
    if (filtered.length === 0) {
      toast({ title: "Không có store nào trong khoảng ngày này", variant: "destructive" });
      return;
    }
    const baseUrl = window.location.origin;
    
    // 👇 THAY ĐỔI TỪ ĐOẠN NÀY 👇
    // Tạo header và map dữ liệu cách nhau bằng dấu Tab (\t)
    const header = "store_name\tstore_slug\tstore_link\taffiliate_link\tcreated_at\n";
    const text = header + filtered.map((s) => 
      `${s.name}\t${s.slug}\t${baseUrl}/store/${s.slug}\t${s.website_url || ""}\t${s.created_at.split("T")[0]}`
    ).join("\n");
    // 👆 ĐẾN ĐÂY 👆

    navigator.clipboard.writeText(text);
    toast({ title: "Đã copy!", description: `Copy thành công ${filtered.length} stores kèm link Affiliate.` });
  };
  const handleCopyLink = (slug: string | null) => {
    if (!slug) {
      toast({ title: "Lỗi", description: "Store này chưa có Slug", variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/store/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Đã copy link!" });
  };

  const categories = Array.from(new Set(stores.map((s) => s.category).filter(Boolean))) as string[];
  const filteredStores = stores.filter((s) => {
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.slug && s.slug.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !filterCategory || filterCategory === "all" || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Reset page when filtering
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategory]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === filteredStores.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredStores.map((s) => s.id)));
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
  const paginatedStores = filteredStores.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-4 w-full overflow-hidden">
      {/* Lọc và Tìm kiếm */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm store..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Tất cả danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>
        {(searchQuery || filterCategory) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setFilterCategory(""); }}>
            <X className="h-4 w-4 mr-1" /> Xoá lọc
          </Button>
        )}
      </div>

      {/* Header, Export & Add Store */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Stores ({filteredStores.length})</h2>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={() => { if(confirm("Xoá store đã chọn?")) bulkDeleteMutation.mutate(Array.from(selectedIds)); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Xoá {selectedIds.size}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={exportDateFrom} onChange={(e) => setExportDateFrom(e.target.value)} className="w-36 h-8 text-xs" placeholder="Từ ngày" />
          <Input type="date" value={exportDateTo} onChange={(e) => setExportDateTo(e.target.value)} className="w-36 h-8 text-xs" placeholder="Đến ngày" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={stores.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Export Links
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyStoreLinks}>
                <Copy className="h-4 w-4 mr-2" /> Copy tất cả links
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportStoreLinks}>
                <Download className="h-4 w-4 mr-2" /> Tải file CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm Store</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Sửa Store" : "Thêm Store"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Tên *</Label><Input name="name" required defaultValue={editing?.name ?? ""} /></div>
                  <div className="space-y-2"><Label>Slug</Label><Input name="slug" defaultValue={editing?.slug ?? ""} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <div className="flex gap-2">
                    <Input name="website_url" defaultValue={editing?.website_url ?? ""} className="flex-1" />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const val = document.querySelector<HTMLInputElement>('input[name="website_url"]')?.value?.trim();
                      if (!val) { toast({ title: "Nhập URL trước", variant: "destructive" }); return; }
                      try {
                        const domain = new URL(val.startsWith("http") ? val : `https://${val}`).hostname;
                        setLogoPreview(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`); setLogoFile(null);
                        toast({ title: "Đã lấy logo!" });
                      } catch { toast({ title: "URL không hợp lệ", variant: "destructive" }); }
                    }}><Download className="h-4 w-4 mr-1" /> Lấy logo</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && <img src={logoPreview} alt="Logo" className="w-14 h-14 rounded-lg object-contain border bg-secondary" />}
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm hover:bg-muted/30">
                      <Upload className="h-4 w-4" /> {logoFile ? logoFile.name : "Chọn ảnh logo"}
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                  </div>
                </div>
                <div className="space-y-2"><Label>Mô tả</Label><Textarea name="description" defaultValue={editing?.description ?? ""} rows={2} /></div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-base font-bold flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Use Code Tips ({useCodeTips.length}/{MAX_STORE_TIPS})</Label>
                      <p className="mt-1 text-xs text-muted-foreground">Optional checkout tips. Each tip can use its own code, affiliate link, screenshot, and description. Empty stores will not show this section.</p>
                    </div>
                    {useCodeTips.length < MAX_STORE_TIPS && (
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-semibold hover:bg-muted/30">
                        <Upload className="h-3.5 w-3.5" /> Add images
                        <input type="file" accept="image/*" multiple onChange={handleUseCodeTipFiles} className="hidden" />
                      </label>
                    )}
                  </div>
                  {useCodeTips.length > 0 && (
                    <div className="space-y-2">
                      {useCodeTips.map((tip, index) => (
                        <div key={tip.key} className="flex gap-3 rounded-lg border bg-secondary/30 p-3">
                          <img
                            src={tip.preview_url || tip.preview_image_url || tip.thumbnail_url || tip.image_url}
                            alt=""
                            className="h-20 w-24 shrink-0 rounded-md border bg-background object-cover object-top"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-muted-foreground">Checkout screenshot #{index + 1}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeUseCodeTip(tip.key)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Code</Label>
                                <Input
                                  value={tip.code}
                                  onChange={(e) => updateUseCodeTip(tip.key, "code", e.target.value)}
                                  placeholder="SAVE20"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Affiliate link</Label>
                                <Input
                                  value={tip.affiliate_url}
                                  onChange={(e) => updateUseCodeTip(tip.key, "affiliate_url", e.target.value)}
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Des / tip</Label>
                              <Input
                                value={tip.caption}
                                onChange={(e) => updateUseCodeTip(tip.key, "caption", e.target.value)}
                                placeholder="20% off sitewide. Excludes sale items."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Coupons (Kéo thả) */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-bold flex items-center gap-2"><Tag className="h-4 w-4" /> Coupons ({coupons.length})</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCoupons((prev) => [...prev, emptyCoupon()])}><Plus className="h-3 w-3 mr-1" /> Thêm coupon</Button>
                  </div>
                  <div className="space-y-3">
                    {coupons.map((coupon, i) => (
                      <div key={i} draggable onDragStart={() => setDraggedIndex(i)} onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault(); if (draggedIndex === null || draggedIndex === i) return;
                          const newC = [...coupons]; const item = newC[draggedIndex];
                          newC.splice(draggedIndex, 1); newC.splice(i, 0, item);
                          setCoupons(newC); setDraggedIndex(null);
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        className={`rounded-lg border bg-secondary/30 p-3 space-y-3 cursor-move transition-all ${draggedIndex === i ? 'opacity-40 border-primary border-dashed scale-[0.98]' : ''}`}
                      >
                        <div className="flex items-center justify-between pointer-events-none">
                          <div className="flex items-center gap-2"><GripVertical className="h-5 w-5 text-muted-foreground" /><span className="text-xs font-bold text-muted-foreground">Kéo thả để sắp xếp - #{i + 1}</span></div>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 pointer-events-auto" onClick={() => removeCoupon(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3" onDragStart={(e) => e.preventDefault()} draggable>
                          <Input placeholder="Tiêu đề *" value={coupon.title} onChange={(e) => updateCoupon(i, "title", e.target.value)} />
                          <Input placeholder="Mã code" value={coupon.code} onChange={(e) => updateCoupon(i, "code", e.target.value)} />
                          <Input placeholder="Giảm giá" value={coupon.discount_value} onChange={(e) => updateCoupon(i, "discount_value", e.target.value)} />
                          <Input type="date" value={coupon.expiry_date} onChange={(e) => updateCoupon(i, "expiry_date", e.target.value)} />
                        </div>
                        <Input placeholder="Link affiliate" value={coupon.url} onChange={(e) => updateCoupon(i, "url", e.target.value)} onDragStart={(e) => e.preventDefault()} draggable />
                        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground" onDragStart={(e) => e.preventDefault()}>
                          <Checkbox checked={coupon.is_verified} onCheckedChange={(v) => updateCouponVerified(i, v === true)} />
                          Verified tay bởi DS Review Hub
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploading}>
                  {saveMutation.isPending || uploading ? "Đang lưu..." : "Lưu Thay Đổi"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Danh sách Stores */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      ) : (
        <>
          <div className="grid gap-3 w-full">
            <div className="flex items-center gap-2 px-1">
              <Checkbox checked={selectedIds.size === filteredStores.length && filteredStores.length > 0} onCheckedChange={toggleAll} />
              <span className="text-xs text-muted-foreground">Chọn tất cả</span>
            </div>
            {paginatedStores.map((s) => (
              <Card key={s.id} className={`${selectedIds.has(s.id) ? "ring-2 ring-primary" : ""} overflow-hidden`}>
                <CardContent className="flex items-center justify-between py-4 px-4 w-full">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="w-10 h-10 rounded-lg object-contain border bg-secondary shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg border bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-muted-foreground">{s.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="font-semibold text-foreground truncate w-full">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate w-full block">{s.website_url || s.slug || "—"}</p>
                      {s.category && <p className="text-xs text-primary/70 mt-0.5 truncate w-full">{s.category}</p>}
                    </div>
                  </div>
                  {/* CÁC NÚT THAO TÁC Ở ĐÂY */}
                  <div className="flex gap-1 flex-shrink-0 ml-4">
                    <Button variant="ghost" size="icon" title="Copy Link" onClick={() => handleCopyLink(s.slug)}>
                      <Copy className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Xoá" onClick={() => { if(confirm("Xoá store này?")) bulkDeleteMutation.mutate([s.id]); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <p className="text-sm text-muted-foreground">
                Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredStores.length)} trong tổng số {filteredStores.length} stores
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                </Button>
                <div className="text-sm font-medium px-2">Trang {currentPage} / {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Sau <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminStores;
