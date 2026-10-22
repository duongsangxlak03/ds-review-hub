import { BookOpen, Sparkles } from "lucide-react";

type InsightVisualProps = {
  src?: string | null;
  alt: string;
  category?: string | null;
  className?: string;
  eager?: boolean;
};

const InsightVisual = ({ src, alt, category, className = "", eager = false }: InsightVisualProps) => {
  if (src) {
    return (
      <div className={`overflow-hidden bg-secondary ${className}`}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading={eager ? "eager" : "lazy"}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative isolate overflow-hidden bg-[#111417] ${className}`}
      role="img"
      aria-label={alt}
    >
      <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3 w-3" /> DS Insight
          </span>
          <BookOpen className="h-5 w-5 text-white/25" />
        </div>
        <p className="max-w-[85%] text-xl font-black leading-tight text-white line-clamp-3">{alt}</p>
        <span className="text-xs font-semibold text-white/45">{category || "Analysis & ideas"}</span>
      </div>
    </div>
  );
};

export default InsightVisual;
