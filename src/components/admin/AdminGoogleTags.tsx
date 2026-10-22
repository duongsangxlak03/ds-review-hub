import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Code } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { GoogleTag } from "@/types/database";
import { notifyPublicContentChanged } from "@/lib/publicContentSync";

const AdminGoogleTags = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GoogleTag | null>(null);
  const [tagType, setTagType] = useState("google_ads");

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["admin-google-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_tags")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GoogleTag[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const payload = {
        tag_id: (form.get("tag_id") as string).trim(),
        tag_type: tagType,
        label: (form.get("label") as string).trim() || null,
        is_active: true,
      };
      if (!payload.tag_id) throw new Error("Vui lòng nhập Tag ID");
      if (editing) {
        const { error } = await supabase.from("google_tags").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("google_tags").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-google-tags"] });
      notifyPublicContentChanged(queryClient, "admin-google-tags-save");
      setOpen(false);
      setEditing(null);
      toast({ title: editing ? "Đã cập nhật thẻ" : "Đã thêm thẻ Google" });
    },
    onError: (e: Error) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("google_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-google-tags"] });
      notifyPublicContentChanged(queryClient, "admin-google-tags-delete");
      toast({ title: "Đã xoá thẻ" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("google_tags").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-google-tags"] });
      notifyPublicContentChanged(queryClient, "admin-google-tags-toggle");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMutation.mutate(new FormData(e.currentTarget));
  };

  const openEdit = (tag: GoogleTag) => {
    setEditing(tag);
    setTagType(tag.tag_type);
    setOpen(true);
  };

  const typeLabels: Record<string, string> = {
    google_ads: "Google Ads",
    gtm: "Google Tag Manager",
    ga4: "Google Analytics 4",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Google Tags ({tags.length})</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setTagType("google_ads"); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm thẻ Google</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa thẻ Google" : "Thêm thẻ Google"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Loại thẻ</Label>
                <Select value={tagType} onValueChange={setTagType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="gtm">Google Tag Manager</SelectItem>
                    <SelectItem value="ga4">Google Analytics 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tag ID *</Label>
                <Input name="tag_id" required defaultValue={editing?.tag_id ?? ""} placeholder="VD: AW-18015724125 hoặc GTM-XXXXX" />
                <p className="text-xs text-muted-foreground">
                  {tagType === "google_ads" && "Nhập ID dạng AW-XXXXXXXXXX"}
                  {tagType === "gtm" && "Nhập ID dạng GTM-XXXXXXX"}
                  {tagType === "ga4" && "Nhập ID dạng G-XXXXXXXXXX"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nhãn (ghi chú)</Label>
                <Input name="label" defaultValue={editing?.label ?? ""} placeholder="VD: Tài khoản chính, Camp 1..." />
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
      ) : tags.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có thẻ Google nào. Thêm thẻ để tracking.</p>
      ) : (
        <div className="grid gap-3">
          {tags.map((tag) => (
            <Card key={tag.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Code className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{tag.tag_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[tag.tag_type] || tag.tag_type}
                      {tag.label && ` • ${tag.label}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tag.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: tag.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tag)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tag.id)}>
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

export default AdminGoogleTags;
