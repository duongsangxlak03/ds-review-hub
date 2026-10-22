import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Deal, Store } from "@/types/database";
import { notifyPublicContentChanged } from "@/lib/publicContentSync";
import { queueSiteDeploy } from "@/lib/triggerSiteDeploy";

const AdminDeals = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>("");

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("name");
      if (error) throw error;
      return data as Store[];
    },
  });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["admin-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, stores(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Deal[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const storeId = selectedStore || editing?.store_id;
      if (!storeId) throw new Error("Vui lòng chọn store");
      const payload = {
        store_id: storeId,
        title: (form.get("title") as string).trim(),
        description: (form.get("description") as string).trim() || null,
        url: (form.get("url") as string).trim() || null,
        image_url: (form.get("image_url") as string).trim() || null,
        original_price: parseFloat(form.get("original_price") as string) || null,
        deal_price: parseFloat(form.get("deal_price") as string) || null,
        expiry_date: (form.get("expiry_date") as string) || null,
      };
      if (editing) {
        const { error } = await supabase.from("deals").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deals").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      notifyPublicContentChanged(queryClient, "admin-deals-save");
      queueSiteDeploy("admin-deals-save");
      setOpen(false);
      setEditing(null);
      setSelectedStore("");
      toast({ title: editing ? "Đã cập nhật deal" : "Đã thêm deal" });
    },
    onError: (e: Error) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      notifyPublicContentChanged(queryClient, "admin-deals-delete");
      queueSiteDeploy("admin-deals-delete");
      toast({ title: "Đã xoá deal" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMutation.mutate(new FormData(e.currentTarget));
  };

  const openEdit = (d: Deal) => {
    setEditing(d);
    setSelectedStore(d.store_id);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Deals ({deals.length})</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setSelectedStore(""); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa Deal" : "Thêm Deal"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Store *</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger><SelectValue placeholder="Chọn store" /></SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tiêu đề *</Label>
                <Input name="title" required defaultValue={editing?.title ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giá gốc</Label>
                  <Input name="original_price" type="number" step="0.01" defaultValue={editing?.original_price ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Giá deal</Label>
                  <Input name="deal_price" type="number" step="0.01" defaultValue={editing?.deal_price ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link sản phẩm</Label>
                <Input name="url" defaultValue={editing?.url ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Link ảnh</Label>
                <Input name="image_url" defaultValue={editing?.image_url ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Hết hạn</Label>
                <Input name="expiry_date" type="date" defaultValue={editing?.expiry_date?.split("T")[0] ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea name="description" defaultValue={editing?.description ?? ""} />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      ) : deals.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có deal nào. Thêm store trước rồi thêm deal.</p>
      ) : (
        <div className="grid gap-3">
          {deals.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.stores?.name}
                    {d.original_price != null && d.deal_price != null && ` • ${d.original_price}đ → ${d.deal_price}đ`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDeals;
