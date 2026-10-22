import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, BookOpen, Menu, X, Store as StoreIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackSearchUsed } from "@/lib/tracking";

const categories = [
  { label: "AI Tools", href: "/?review=AI%20Tools#review-library" },
  { label: "Technology", href: "/?review=Technology#review-library" },
  { label: "Ecommerce", href: "/?review=Ecommerce#review-library" },
  { label: "Software & SaaS", href: "/?review=Software#review-library" },
  { label: "Fashion & Apparel", href: "/?review=Fashion#review-library" },
  { label: "Beauty & Personal Care", href: "/?review=Beauty#review-library" },
  { label: "Health & Wellness", href: "/?review=Health#review-library" },
  { label: "Home & Garden", href: "/?review=Home#review-library" },
  { label: "Sports & Outdoors", href: "/#review-library" },
  { label: "Food & Grocery", href: "/#review-library" },
  { label: "Travel & Hotels", href: "/#review-library" },
  { label: "Education & Courses", href: "/#review-library" },
];

type StoreSuggestion = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  description: string | null;
};

const Navbar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileSuggestions, setMobileSuggestions] = useState<StoreSuggestion[]>([]);
  const [mobileSearching, setMobileSearching] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const searchTerm = mobileQuery.trim();

    if (searchTerm.length < 2) {
      setMobileSuggestions([]);
      setMobileSearching(false);
      return;
    }

    setMobileSearching(true);
    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, description")
        .ilike("name", `%${searchTerm}%`)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(6);

      if (!error) {
        setMobileSuggestions(data || []);
      }

      setMobileSearching(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [mobileQuery]);

  const submitMobileSearch = () => {
    const searchTerm = mobileQuery.trim();
    if (!searchTerm) return;

    trackSearchUsed({ search_query: searchTerm, page_type: "nav" });
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const openMobileStore = (store: StoreSuggestion) => {
    trackSearchUsed({ search_query: mobileQuery.trim() || store.name, page_type: "nav" });
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(`/store/${store.slug || store.id}`);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileCategoriesOpen(false);
  };

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container flex h-16 min-w-0 items-center justify-between">
        <div className="flex min-w-0 items-center gap-8">
          
          {/* VÙNG LOGO ĐÃ ĐƯỢC ĐỘ LẠI */}
          {/* Cách 1: Logo bằng chữ (Text Logo) cực ngầu */}
          <a href="/" className="flex min-w-0 items-center gap-1.5 group">
            <div className="bg-primary text-primary-foreground font-black text-xl md:text-2xl px-2 py-0.5 rounded-lg tracking-tighter group-hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1">
              <BookOpen className="h-5 w-5" />
              DS
            </div>
            <span className="truncate text-xl md:text-2xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Review Hub
            </span>
          </a>

          {/* Cách 2: Nếu ông có ảnh Logo (ví dụ file logo.png ném trong thư mục public), 
              hãy XÓA Cách 1 ở trên đi và MỞ KHÓA đoạn code dưới đây: 
          */}
          {/* <a href="/">
            <img src="/logo.png" alt="DS Review Hub Logo" className="h-10 md:h-12 w-auto object-contain hover:opacity-90 transition-opacity" />
          </a> 
          */}
          {/* KẾT THÚC VÙNG LOGO */}

          <div className="hidden md:flex items-center gap-6">
            {/* Find Deals Dropdown */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <button
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${open ? "text-primary" : "text-foreground/80 hover:text-foreground"}`}
              >
                Reviews <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="w-64 rounded-xl border border-border bg-card shadow-xl py-2 max-h-[70vh] overflow-y-auto z-50" style={{ scrollbarWidth: 'none' }}>
                    {categories.map((cat) => (
                      <a
                        key={cat.href}
                        href={cat.href}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm text-foreground/90 hover:bg-primary/5 hover:text-foreground transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        {cat.label}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                    <div className="border-t border-border mt-1 pt-1">
                      <a
                        href="/#review-library"
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        All Brand Reviews
                        <ChevronRight className="h-4 w-4" />
                      </a>
                      <a
                        href="/#review-library"
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        Browse all categories
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <a href="/why-different" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              How We Review
            </a>
            <a href="/learn" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Review Methodology
            </a>
            <a href="/insights" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Insights
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Search brands"
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileSearchOpen((value) => !value);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/5 md:hidden"
          >
            {mobileSearchOpen ? <X className="h-6 w-6" /> : <Search className="h-6 w-6" />}
          </button>
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setMobileSearchOpen(false);
              setMobileMenuOpen((value) => !value);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/5 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div ref={mobileSearchRef} className="border-t border-border bg-background px-3 py-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={mobileQuery}
              onChange={(event) => setMobileQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitMobileSearch();
                if (event.key === "Escape") setMobileSearchOpen(false);
              }}
              autoFocus
              placeholder="Search brands..."
              className="h-11 w-full rounded-xl border border-border bg-[#0b0c0e] pl-10 pr-20 text-[16px] font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="button"
              onClick={submitMobileSearch}
              className="absolute right-1.5 top-1/2 inline-flex h-8 -translate-y-1/2 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-black"
            >
              Find
            </button>
          </div>

          {mobileQuery.trim().length >= 2 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border bg-[#0b0c0e]">
              {mobileSearching ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">Searching stores...</div>
              ) : mobileSuggestions.length > 0 ? (
                <>
                  {mobileSuggestions.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => openMobileStore(store)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-white/5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="h-full w-full object-contain" loading="lazy" />
                        ) : (
                          <StoreIcon className="h-4 w-4 text-black/50" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">{store.name}</span>
                        {store.description && <span className="block truncate text-xs text-muted-foreground">{store.description}</span>}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <button
                  type="button"
                  onClick={submitMobileSearch}
                  className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-primary hover:bg-primary/10"
                >
                  Search all results for "{mobileQuery.trim()}"
                  <Search className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {mobileMenuOpen && (
        <div className="border-t border-border bg-black px-5 py-3 md:hidden">
          <div className="space-y-0">
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen((value) => !value)}
              className="flex w-full items-center justify-between border-b border-border py-3 text-left text-[16px] font-semibold text-foreground"
            >
              Reviews
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileCategoriesOpen ? "rotate-180" : ""}`} />
            </button>

            {mobileCategoriesOpen && (
              <div className="grid grid-cols-1 border-b border-border py-2">
                {categories.slice(0, 8).map((cat) => (
                  <a
                    key={cat.href}
                    href={cat.href}
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between py-2.5 text-[14px] font-medium text-foreground/75 hover:text-foreground"
                  >
                    {cat.label}
                    <ChevronRight className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}

            <a
              href="/#review-library"
              onClick={closeMobileMenu}
              className="block border-b border-border py-3 text-[16px] font-semibold text-foreground"
            >
              All Brand Reviews
            </a>
            <a
              href="/why-different"
              onClick={closeMobileMenu}
              className="block border-b border-border py-3 text-[16px] font-semibold text-foreground"
            >
              How We Review
            </a>
            <a
              href="/learn"
              onClick={closeMobileMenu}
              className="block border-b border-border py-3 text-[16px] font-semibold text-foreground"
            >
              Review Methodology
            </a>
            <a
              href="/deals"
              onClick={closeMobileMenu}
              className="my-4 flex h-10 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-black transition-colors hover:bg-primary/90"
            >
              Current Offers
            </a>
            <a
              href="/insights"
              onClick={closeMobileMenu}
              className="block border-b border-border py-3 text-[16px] font-semibold text-foreground"
            >
              Insights
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
