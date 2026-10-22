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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Coupon, Store } from "@/types/database";
import { notifyPublicContentChanged } from "@/lib/publicContentSync";
import { queueSiteDeploy } from "@/lib/triggerSiteDeploy";

const AdminCoupons = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>("");

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("name");
      if (error) throw error;
      return data as Store[];
    },
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*, stores(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Coupon[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const storeId = selectedStore || editing?.store_id;
      if (!storeId) throw new Error("Vui lòng chọn store");
      const payload = {
        store_id: storeId,
        title: (form.get("title") as string).trim(),
        code: (form.get("code") as string).trim() || null,
        description: (form.get("description") as string).trim() || null,
        discount_value: (form.get("discount_value") as string).trim() || null,
        url: (form.get("url") as string).trim() || null,
        expiry_date: (form.get("expiry_date") as string) || null,
        is_verified: form.get("is_verified") === "on",
      };
      if (editing) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      notifyPublicContentChanged(queryClient, "admin-coupons-save");
      queueSiteDeploy("admin-coupons-save");
      setOpen(false);
      setEditing(null);
      setSelectedStore("");
      toast({ title: editing ? "Đã cập nhật coupon" : "Đã thêm coupon" });
    },
    onError: (e: Error) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      notifyPublicContentChanged(queryClient, "admin-coupons-delete");
      queueSiteDeploy("admin-coupons-delete");
      toast({ title: "Đã xoá coupon" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMutation.mutate(new FormData(e.currentTarget));
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setSelectedStore(c.store_id);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Coupons ({coupons.length})</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setSelectedStore(""); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm Coupon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa Coupon" : "Thêm Coupon"}</DialogTitle>
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
                  <Label>Mã giảm giá</Label>
                  <Input name="code" defaultValue={editing?.code ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Giá trị giảm</Label>
                  <Input name="discount_value" defaultValue={editing?.discount_value ?? ""} placeholder="20%" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link</Label>
                <Input name="url" defaultValue={editing?.url ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Hết hạn</Label>
                <Input name="expiry_date" type="date" defaultValue={editing?.expiry_date?.split("T")[0] ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea name="description" defaultValue={editing?.description ?? ""} />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Checkbox name="is_verified" defaultChecked={editing?.is_verified ?? true} />
                Verified tay bởi DS Review Hub
              </label>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      ) : coupons.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có coupon nào. Thêm store trước rồi thêm coupon.</p>
      ) : (
        <div className="grid gap-3">
          {coupons.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.stores?.name} {c.code && `• Mã: ${c.code}`} {c.discount_value && `• ${c.discount_value}`} {c.is_verified && "• Verified tay"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}>
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

export default AdminCoupons;
