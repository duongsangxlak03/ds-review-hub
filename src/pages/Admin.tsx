import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminStores from "@/components/admin/AdminStores";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminDeals from "@/components/admin/AdminDeals";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminImport from "@/components/admin/AdminImport";
import AdminBlog from "@/components/admin/AdminBlog";
import AdminGoogleTags from "@/components/admin/AdminGoogleTags";
import AdminReviews from "@/components/admin/AdminReviews";
import DeploySiteButton from "@/components/admin/DeploySiteButton";
import { Store, ShoppingBag, Tag, LogOut, Menu, X, Home, Upload, FileText, Code, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "stores", label: "Stores", icon: Store },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "deals", label: "Deals", icon: ShoppingBag },
  { id: "import", label: "Import CSV", icon: Upload },
  { id: "blog", label: "Insights", icon: FileText },
  { id: "reviews", label: "Store Reviews", icon: Sparkles },
  { id: "google-tags", label: "Google Tags", icon: Code },
];

const Admin = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 lg:relative",
          sidebarOpen ? "w-64" : "w-0 lg:w-16 overflow-hidden"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Home className="h-5 w-5 text-primary shrink-0" />
          {sidebarOpen && (
            <span className="text-lg font-extrabold tracking-tight text-primary">
              SD Admin
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-md px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-lg font-bold capitalize">{activeTab}</h1>
          <div className="ml-auto flex items-center gap-3">
            <DeploySiteButton source={`admin-${activeTab}`} size="sm" className="hidden sm:inline-flex" />
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Về trang chủ
            </a>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "stores" && <AdminStores />}
          {activeTab === "coupons" && <AdminCoupons />}
          {activeTab === "deals" && <AdminDeals />}
          {activeTab === "import" && <AdminImport />}
          {activeTab === "blog" && <AdminBlog />}
          {activeTab === "reviews" && <AdminReviews />}
          {activeTab === "google-tags" && <AdminGoogleTags />}
        </main>
      </div>
    </div>
  );
};

export default Admin;
