import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Tag, ShoppingBag, TrendingUp } from "lucide-react";
import DeploySiteButton from "@/components/admin/DeploySiteButton";

const AdminDashboard = () => {
  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, is_active");
      if (error) throw error;
      return data;
    },
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["admin-coupons-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("id, is_active, expiry_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["admin-deals-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("id, is_active, expiry_date");
      if (error) throw error;
      return data;
    },
  });

  const now = new Date().toISOString();
  const expiredCoupons = coupons.filter((coupon) => coupon.expiry_date && coupon.expiry_date < now).length;
  const activeCoupons = coupons.filter((coupon) => coupon.is_active).length;
  const activeDeals = deals.filter((deal) => deal.is_active).length;

  const stats = [
    { label: "Total Stores", value: stores.length, active: stores.filter((store) => store.is_active).length, icon: Store, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Coupons", value: coupons.length, active: activeCoupons, icon: Tag, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Total Deals", value: deals.length, active: activeDeals, icon: ShoppingBag, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Expired Coupons", value: expiredCoupons, active: null, icon: TrendingUp, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Tong quan</h2>
          <p className="text-sm text-muted-foreground">
            Nội dung public tự cập nhật từ Supabase. SEO HTML và sitemap được xếp hàng rebuild tự động sau khi lưu.
          </p>
        </div>
        <DeploySiteButton source="admin-dashboard" className="w-full sm:w-auto" />
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Flow hằng ngày: sửa dữ liệu rồi bấm Lưu. Không cần deploy site thủ công.</p>
        <p className="mt-1">Khách đang mở site nhận dữ liệu mới gần như ngay lập tức; nếu Realtime không khả dụng, site tự kiểm tra lại tối đa sau 60 giây. Nút bên trên chỉ dùng khi cần ép rebuild SEO thủ công.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
              {stat.active !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.active} active
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
