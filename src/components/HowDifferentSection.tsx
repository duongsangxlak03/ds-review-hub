import { ArrowRight, BadgeCheck, CalendarClock, FileCheck2, Scale, SearchCheck } from "lucide-react";

const features = [
  {
    icon: SearchCheck,
    title: "Research beyond the sales pitch",
    desc: "We review public policies, product positioning, customer-experience patterns, and current store information to surface what deserves a closer look.",
  },
  {
    icon: Scale,
    title: "Tradeoffs, not empty hype",
    desc: "Every useful review should explain who a brand suits, where it falls short, and which alternatives are worth comparing.",
  },
  {
    icon: BadgeCheck,
    title: "Transparent about how we earn",
    desc: "Some outbound links may earn us a commission. That never changes the need for clear sourcing, honest limitations, and practical context.",
  },
];

const bigStats = [
  { icon: FileCheck2, value: "Evidence", label: "Sources and test context shown" },
  { icon: Scale, value: "Tradeoffs", label: "Best fit, limits, and alternatives" },
  { icon: CalendarClock, value: "Freshness", label: "A visible checked or updated date" },
];

const HowDifferentSection = () => {
  return (
    <section id="different" className="border-y border-border bg-[#0b0d0f] py-16 sm:py-20">
      <div className="container space-y-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Our standard</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
            Reviews built around real buying decisions
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            We borrow the discipline of a test lab without pretending every product can be measured the same way.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-card border border-border p-8 space-y-4 hover:border-primary/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {bigStats.map((s) => (
            <div key={s.label} className="bg-background p-6 text-center">
              <s.icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-3 text-xl font-black text-foreground">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <a href="/learn" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-black text-primary transition-colors hover:bg-primary hover:text-black">
            See the full review methodology <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowDifferentSection;
