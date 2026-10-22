import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Scale, Search, ShieldCheck, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackSearchUsed } from "@/lib/tracking";

type StoreSuggestion = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  description: string | null;
};

const HeroSection = () => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StoreSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const searchTerm = query.trim();

    if (searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, description")
        .ilike("name", `%${searchTerm}%`)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(8);

      if (!error) {
        setSuggestions(data || []);
        setShowSuggestions(true);
      }

      setIsSearching(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const submitSearch = () => {
    const searchTerm = query.trim();
    if (!searchTerm) return;

    trackSearchUsed({ search_query: searchTerm, page_type: "home" });
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const openStore = (store: StoreSuggestion) => {
    trackSearchUsed({ search_query: query.trim() || store.name, page_type: "home" });
    setShowSuggestions(false);
    navigate(`/store/${store.slug || store.id}`);
  };

  return (
    <section className="relative overflow-hidden bg-black py-14 sm:py-20 lg:py-24">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f20_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f20_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute left-[-12%] top-[-35%] h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />

      <div className="container relative z-10">
        <div className="grid min-w-0 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              Research for smarter shopping
            </div>

            <h1 className="mt-7 max-w-4xl text-[42px] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl xl:text-[82px]">
              Know the brand
              <br />
              <span className="text-primary">before you buy.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
              Practical reviews of product quality, value, shipping, returns, and customer experience—plus current offers when you're ready to shop.
            </p>

            <div className="relative mt-9 w-full max-w-2xl" ref={searchRef}>
              <div className="relative flex h-16 w-full items-center overflow-hidden rounded-xl border border-white/20 bg-[#0b0c0e]/95 shadow-2xl transition-colors focus-within:border-primary/70">
                <Search className="absolute left-5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => {
                    if (query.trim().length >= 2) setShowSuggestions(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitSearch();
                    if (event.key === "Escape") setShowSuggestions(false);
                  }}
                  placeholder="Search a brand or store"
                  className="h-full w-full bg-transparent pl-14 pr-24 text-[16px] font-medium text-white placeholder:text-gray-600 focus:outline-none sm:pr-32"
                />
                <button
                  type="button"
                  onClick={submitSearch}
                  className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-black transition-colors hover:bg-primary/90 sm:px-5"
                >
                  Search <ArrowRight className="hidden h-4 w-4 sm:block" />
                </button>
              </div>

              {showSuggestions && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-white/15 bg-[#0c0d0f] text-left shadow-2xl">
                  {isSearching ? (
                    <div className="px-4 py-5 text-sm text-gray-400">Searching brands...</div>
                  ) : suggestions.length > 0 ? (
                    <div className="max-h-[360px] overflow-y-auto">
                      {suggestions.map((store) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => openStore(store)}
                          className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5">
                            {store.logo_url ? (
                              <img src={store.logo_url} alt={store.name} className="h-full w-full object-contain" loading="lazy" />
                            ) : (
                              <Store className="h-5 w-5 text-black/50" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">{store.name}</span>
                            {store.description && <span className="block truncate text-xs text-gray-500">{store.description}</span>}
                          </span>
                        </button>
                      ))}
                      <button type="button" onClick={submitSearch} className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-primary hover:bg-primary/10">
                        Search all results for "{query.trim()}" <Search className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={submitSearch} className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-primary hover:bg-primary/10">
                      Search all results for "{query.trim()}" <Search className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-gray-500 sm:text-sm">
              <span className="text-gray-600">Explore</span>
              <a href="#review-library" className="hover:text-white">Brand Reviews</a>
              <a href="/insights" className="hover:text-white">Insights</a>
              <a href="/deals" className="hover:text-white">Current Offers</a>
            </div>
          </div>

          <aside className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-5 rounded-[32px] bg-gradient-to-br from-primary/20 via-transparent to-white/5 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0b0c0e]/95 p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Inside every review</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">The decision brief</h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-black">
                  <ShieldCheck className="h-6 w-6" />
                </span>
              </div>

              <div className="space-y-3 py-5">
                {["Product quality and fit", "Price and overall value", "Shipping, returns, and support", "Alternatives worth comparing"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">{index + 1}</span>
                    <span className="text-sm font-semibold text-gray-200">{item}</span>
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4">
                <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-xs leading-5 text-gray-300">Clear verdicts, visible tradeoffs, and affiliate transparency—so the commercial link never replaces the research.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
          {[
            ["Research", "The brand"],
            ["Compare", "The tradeoffs"],
            ["Decide", "With context"],
            ["Save", "When you buy"],
          ].map(([value, label]) => (
            <div key={value} className="bg-black/90 px-4 py-6 text-center">
              <p className={`text-xl font-black sm:text-2xl ${value === "Compare" ? "text-primary" : "text-white"}`}>{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
