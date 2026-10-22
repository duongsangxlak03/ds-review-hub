import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CheckCircle2, Link, Loader2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { queueSiteDeploy } from "@/lib/triggerSiteDeploy";
import { notifyPublicContentChanged } from "@/lib/publicContentSync";

interface ImportRow {
  store_name: string;
  store_slug: string;
  store_logo_url: string;
  store_website_url: string;
  store_description: string;
  coupon_title: string;
  coupon_code: string;
  coupon_discount_text: string;
  coupon_description: string;
  coupon_affiliate_url: string;
  coupon_expires_at: string;
  deal_title: string;
  deal_discount_text: string;
  deal_description: string;
  deal_affiliate_url: string;
  deal_original_price: string;
  deal_sale_price: string;
  deal_image_url: string;
  deal_expires_at: string;
  deal_is_hot: string;
  guide_priority: string;
  guide_reference_urls: string;
  guide_shipping_note: string;
  guide_return_note: string;
  guide_stacking_note: string;
  guide_sale_item_note: string;
  guide_publish: string;
}

const HEADER_MAP = [
  "store_name", "store_slug", "store_logo_url", "store_website_url", "store_description",
  "store_category",
  "coupon_title", "coupon_code", "coupon_discount_text", "coupon_description", "coupon_affiliate_url", "coupon_expires_at",
  "deal_title", "deal_discount_text", "deal_description", "deal_affiliate_url",
  "deal_category", // ignored
  "deal_original_price", "deal_sale_price", "deal_image_url", "deal_expires_at",
  "deal_is_hot", // ignored
  "guide_priority", "guide_reference_urls", "guide_shipping_note", "guide_return_note", "guide_stacking_note", "guide_sale_item_note", "guide_publish",
];

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function storeNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    // Remove www prefix
    const clean = hostname.replace(/^www\./, "");
    // Split by dots and remove TLDs (.com, .net, .co.uk, etc.)
    const parts = clean.split(".");
    // For domains like "shop.rachealattard.com" → get the second-level domain
    // For "nike.com" → get "nike"
    // For "example.co.uk" → get "example"
    const tlds = ["com", "net", "org", "io", "co", "uk", "us", "au", "ca", "de", "fr", "jp", "in", "br", "it", "es", "nl", "ru", "info", "biz", "me", "tv", "site", "space", "shop", "store", "online", "xyz"];
    // Find the main domain: last part that is NOT a TLD
    let mainPart = parts[0];
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!tlds.includes(parts[i].toLowerCase())) {
        mainPart = parts[i];
        break;
      }
    }
    return mainPart
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

function parseCsv(text: string): ImportRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    const row: any = {};
    HEADER_MAP.forEach((key, i) => {
      row[key] = fields[i] || "";
    });
    // Auto-fill store_name from website_url if missing
    if (!row.store_name && row.store_website_url) {
      row.store_name = storeNameFromUrl(row.store_website_url);
    }
    return row as ImportRow;
  }).filter((row) => row.store_name && (row.coupon_title || row.deal_title || row.coupon_code || row.deal_discount_text || row.deal_affiliate_url));
}

function convertGoogleSheetUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
}

function getAutoLogoUrl(websiteUrl: string): string | null {
  if (!websiteUrl) return null;
  try {
    const domain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
}

const cleanImportText = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();

const splitGuideUrls = (value: string) =>
  value
    .split(/[\n|;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

const hasGuideNotes = (row: ImportRow) =>
  Boolean(
    cleanImportText(row.guide_priority) ||
      cleanImportText(row.guide_reference_urls) ||
      cleanImportText(row.guide_shipping_note) ||
      cleanImportText(row.guide_return_note) ||
      cleanImportText(row.guide_stacking_note) ||
      cleanImportText(row.guide_sale_item_note)
  );

const guideStatusFrom = (value: string): "draft" | "published" => {
  const normalized = cleanImportText(value).toLowerCase();
  if (["0", "false", "no", "draft", "review"].includes(normalized)) return "draft";
  return "published";
};

const AdminImport = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [fetchingSheet, setFetchingSheet] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target?.result as string);
      if (rows.length === 0) {
        toast({ title: "Lỗi", description: "File CSV không có dữ liệu hợp lệ. Đảm bảo có ít nhất 1 dòng với store_name và coupon_title hoặc deal_title.", variant: "destructive" });
        return;
      }
      setPreview(rows);
      toast({ title: "Đã tải!", description: `${rows.length} dòng dữ liệu sẵn sàng import.` });
    };
    reader.readAsText(file);
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) return;
    const csvUrl = convertGoogleSheetUrl(sheetUrl);
    if (!csvUrl) {
      toast({ title: "Lỗi", description: "Link Google Sheets không hợp lệ.", variant: "destructive" });
      return;
    }
    setFetchingSheet(true);
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Không thể tải sheet. Hãy chia sẻ công khai (Anyone with the link).");
      const rows = parseCsv(await res.text());
      if (rows.length === 0) {
        toast({ title: "Lỗi", description: "Không tìm thấy dữ liệu hợp lệ.", variant: "destructive" });
      } else {
        setPreview(rows);
        setFileName("Google Sheets");
        toast({ title: "Đã tải!", description: `${rows.length} dòng dữ liệu.` });
      }
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setFetchingSheet(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      // Step 1: AI-generate missing copy
      const needsAI = rows.some(
        (r) => (r.coupon_code.trim() && !r.coupon_title.trim()) || 
               (!r.store_description.trim()) ||
               (!r.coupon_description.trim() && r.coupon_code.trim()) ||
               !(r as any).store_category?.trim() ||
               (r.deal_discount_text.trim() && !r.deal_description.trim()) ||
               (r.deal_affiliate_url.trim() && !r.deal_title.trim())
      );

      let enrichedRows = [...rows];

      if (needsAI) {
        try {
          const items = rows.map((r) => ({
            store_name: r.store_name,
            website_url: r.store_website_url,
            coupon_code: r.coupon_code,
            discount_text: r.coupon_discount_text,
            deal_title: r.deal_title,
            deal_discount_text: r.deal_discount_text,
            deal_original_price: r.deal_original_price,
            deal_sale_price: r.deal_sale_price,
            deal_affiliate_url: r.deal_affiliate_url,
          }));

          // Batch in groups of 10 to avoid token limits
          const batchSize = 10;
          const allResults: any[] = [];
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const cloudFunctionUrl = `${supabaseUrl}/functions/v1/generate-copy`;
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("Not authenticated. Please log in first.");
          }
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            try {
              const res = await fetch(cloudFunctionUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session.access_token}`,
                  "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ items: batch }),
              });
              if (!res.ok) {
                const errText = await res.text();
                console.error("AI copy generation error:", res.status, errText);
                allResults.push(...batch.map(() => ({})));
              } else {
                const data = await res.json();
                allResults.push(...(data.results || batch.map(() => ({}))));
              }
            } catch (err) {
              console.error("AI copy generation error:", err);
              allResults.push(...batch.map(() => ({})));
            }
          }

          enrichedRows = rows.map((r, i) => {
            const ai = allResults[i] || {};
            return {
              ...r,
              store_description: r.store_description.trim() || ai.store_description || "",
              store_category: (r as any).store_category?.trim() || ai.store_category || null,
              coupon_title: r.coupon_title.trim() || ai.coupon_title || (r.coupon_code.trim() && r.coupon_code.trim().toUpperCase() !== "NOCODE" ? `Save with code ${r.coupon_code}` : ""),
              coupon_description: r.coupon_description.trim() || ai.coupon_description || "",
              deal_title: r.deal_title.trim() || ai.deal_title || (r.deal_discount_text.trim() ? r.deal_discount_text.trim() : ""),
              deal_description: r.deal_description.trim() || ai.deal_description || "",
              deal_original_price: r.deal_original_price.trim() || (ai.deal_original_price ? String(ai.deal_original_price) : ""),
              deal_sale_price: r.deal_sale_price.trim() || (ai.deal_sale_price ? String(ai.deal_sale_price) : ""),
            };
          });
        } catch (err) {
          console.error("AI generation failed, continuing without:", err);
        }
      }

      // Step 2: Group by store_name and import
      const storeMap = new Map<string, ImportRow[]>();
      for (const row of enrichedRows) {
        const name = row.store_name.trim();
        if (!storeMap.has(name)) storeMap.set(name, []);
        storeMap.get(name)!.push(row);
      }

      let storesCreated = 0, couponsCreated = 0, dealsCreated = 0, guidesCreated = 0;

      for (const [storeName, storeRows] of storeMap) {
        const firstRow = storeRows[0];
        let { data: existingStore } = await supabase
          .from("stores").select("id").eq("name", storeName).maybeSingle();

        let storeId: string;
        if (existingStore) {
          storeId = existingStore.id;
          // Update category/description if AI generated them and store doesn't have them
          const updates: Record<string, string> = {};
          if ((firstRow as any).store_category) updates.category = (firstRow as any).store_category;
          if (firstRow.store_description) updates.description = firstRow.store_description;
          if (firstRow.store_logo_url) updates.logo_url = firstRow.store_logo_url;
          if (Object.keys(updates).length > 0) {
            await supabase.from("stores").update(updates).eq("id", storeId);
          }
        } else {
          const slug = firstRow.store_slug || storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const { data: newStore, error } = await supabase.from("stores").insert({
            name: storeName,
            slug,
            logo_url: firstRow.store_logo_url || getAutoLogoUrl(firstRow.store_website_url) || null,
            website_url: firstRow.store_website_url || null,
            description: firstRow.store_description || null,
            category: (firstRow as any).store_category || null,
          }).select("id").single();
          if (error) throw new Error(`Lỗi tạo store "${storeName}": ${error.message}`);
          storeId = newStore.id;
          storesCreated++;
        }

        // Insert coupons — now includes rows where AI generated the title
        const couponRows = storeRows.filter((r) => r.coupon_title.trim() || r.coupon_code.trim());
        if (couponRows.length > 0) {
          const payloads = couponRows.map((r) => ({
            store_id: storeId,
            title: r.coupon_title.trim() || `Save at ${storeName}`,
            code: r.coupon_code.trim() || null,
            discount_value: r.coupon_discount_text.trim() || null,
            description: r.coupon_description.trim() || null,
            url: r.coupon_affiliate_url.trim() || null,
            expiry_date: r.coupon_expires_at.trim() || null,
            is_verified: true,
          }));
          const { error } = await supabase.from("coupons").insert(payloads);
          if (error) throw new Error(`Lỗi thêm coupons cho "${storeName}": ${error.message}`);
          couponsCreated += payloads.length;
        }

        const dealRows = storeRows.filter((r) => r.deal_title.trim());
        if (dealRows.length > 0) {
          const payloads = dealRows.map((r) => ({
            store_id: storeId,
            title: r.deal_title.trim(),
            description: r.deal_description.trim() || r.deal_discount_text.trim() || null,
            url: r.deal_affiliate_url.trim() || null,
            original_price: parseFloat(r.deal_original_price) || null,
            deal_price: parseFloat(r.deal_sale_price) || null,
            image_url: r.deal_image_url.trim() || null,
            expiry_date: r.deal_expires_at.trim() || null,
          }));
          const { error } = await supabase.from("deals").insert(payloads);
          if (error) throw new Error(`Lỗi thêm deals cho "${storeName}": ${error.message}`);
          dealsCreated += payloads.length;
        }

        const guideRow = storeRows.find(hasGuideNotes);
        if (guideRow) {
          const guidePayload = {
            store_id: storeId,
            priority: cleanImportText(guideRow.guide_priority) || null,
            shipping_note: cleanImportText(guideRow.guide_shipping_note) || null,
            return_note: cleanImportText(guideRow.guide_return_note) || null,
            stacking_note: cleanImportText(guideRow.guide_stacking_note) || null,
            sale_item_note: cleanImportText(guideRow.guide_sale_item_note) || null,
            reference_urls: splitGuideUrls(guideRow.guide_reference_urls),
            status: guideStatusFrom(guideRow.guide_publish),
          };
          const { error } = await (supabase as any)
            .from("store_savings_guides")
            .upsert(guidePayload, { onConflict: "store_id" });
          if (error) {
            throw new Error(`Loi them savings guide cho "${storeName}": ${error.message}. Hay chay migration store_savings_guides truoc.`);
          }
          guidesCreated++;
        }
      }

      return { storesCreated, couponsCreated, dealsCreated, guidesCreated };
    },
    onSuccess: ({ storesCreated, couponsCreated, dealsCreated, guidesCreated }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-deals-count"] });
      notifyPublicContentChanged(queryClient, "admin-import");
      queueSiteDeploy("admin-import");
      clearPreview();
      toast({
        title: "Import xong, public data da dong bo",
        description: `${storesCreated} stores, ${couponsCreated} coupons, ${dealsCreated} deals, ${guidesCreated} guides. SEO rebuild da duoc xep hang tu dong.`,
      });
    },
    onError: (e: Error) => toast({ title: "Lỗi import", description: e.message, variant: "destructive" }),
  });

  const clearPreview = () => {
    setPreview([]);
    setFileName("");
    setSheetUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uniqueStores = new Set(preview.map((r) => r.store_name)).size;
  const totalCoupons = preview.filter((r) => r.coupon_title.trim()).length;
  const totalDeals = preview.filter((r) => r.deal_title.trim() || r.deal_discount_text.trim() || r.deal_affiliate_url.trim()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Import dữ liệu</h2>
        <a href="/bulk_import_template.csv" download className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <Download className="h-4 w-4" /> Tải template CSV
        </a>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Dùng đúng template CSV với 22 cột. Mỗi dòng có thể chứa <strong>Store + Coupon</strong>, <strong>Store + Deal</strong>, hoặc cả hai.
          Store trùng tên sẽ không tạo lại mà thêm coupons/deals vào store đó.
        </AlertDescription>
      </Alert>

      {preview.length === 0 && (
        <Tabs defaultValue="google-sheets">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="google-sheets" className="gap-2">
              <Link className="h-4 w-4" /> Google Sheets
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <Upload className="h-4 w-4" /> File CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google-sheets" className="mt-4">
            <Card>
              <CardContent className="py-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste link Google Sheets (cần Share → Anyone with the link).
                </p>
                <div className="flex gap-2">
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1"
                  />
                  <Button onClick={handleFetchSheet} disabled={fetchingSheet || !sheetUrl.trim()}>
                    {fetchingSheet ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tải dữ liệu"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv" className="mt-4">
            <Card>
              <CardContent className="py-6">
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" id="csv-upload" />
                <label
                  htmlFor="csv-upload"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/30 w-full"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{fileName || "Chọn file CSV"}</span>
                </label>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Xem trước: {uniqueStores} stores, {totalCoupons} coupons, {totalDeals} deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Store</th>
                    <th className="px-3 py-2 text-left font-medium">Coupon</th>
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Discount</th>
                    <th className="px-3 py-2 text-left font-medium">Deal</th>
                    <th className="px-3 py-2 text-left font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{row.store_name}</td>
                      <td className="px-3 py-2">{row.coupon_title || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.coupon_code || "—"}</td>
                      <td className="px-3 py-2">{row.coupon_discount_text || "—"}</td>
                      <td className="px-3 py-2">{row.deal_title || "—"}</td>
                      <td className="px-3 py-2">
                        {row.deal_sale_price ? `$${row.deal_sale_price}` : "—"}
                        {row.deal_original_price ? ` (was $${row.deal_original_price})` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => importMutation.mutate(preview)}
                disabled={importMutation.isPending}
                className="flex-1"
              >
                {importMutation.isPending
                  ? "🤖 AI đang generate copy & import..."
                  : `🚀 Import ${totalCoupons} coupons + ${totalDeals} deals (AI auto-fill)`}
              </Button>
              <Button variant="outline" onClick={clearPreview}>Huỷ</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminImport;
