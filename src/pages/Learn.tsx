import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  FlaskConical,
  RefreshCcw,
  Scale,
  ShoppingCart,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";

const process = [
  {
    number: "01",
    icon: FileSearch,
    title: "Define the buying question",
    body: "We start with the decision a reader is actually making: which tool fits the workflow, whether a store is worth ordering from, or which alternative offers better value.",
  },
  {
    number: "02",
    icon: FlaskConical,
    title: "Use the product and collect evidence",
    body: "When access is available, we complete representative tasks. We also check official pricing, policies, documentation, support material, and credible public customer signals.",
  },
  {
    number: "03",
    icon: Scale,
    title: "Compare the tradeoffs",
    body: "Features only matter in context. We compare usability, value, limitations, support, policies, and the alternatives a buyer is most likely to consider.",
  },
  {
    number: "04",
    icon: BadgeCheck,
    title: "Publish the review record",
    body: "Every finished review should show what was checked, when it was updated, the evidence used, who it suits, and what remains uncertain.",
  },
  {
    number: "05",
    icon: RefreshCcw,
    title: "Recheck material changes",
    body: "Prices, product capabilities, policies, and offers change. We revisit reviews when a meaningful change could alter the recommendation.",
  },
];

const scorecards = [
  {
    icon: Bot,
    eyebrow: "AI and software",
    title: "Task-first evaluation",
    criteria: [
      ["Output quality", "30%"],
      ["Workflow fit", "25%"],
      ["Ease of use", "15%"],
      ["Value for money", "15%"],
      ["Reliability and support", "15%"],
    ],
    note: "The exact tasks change by category. An AI writing tool should not be judged on the same test bench as an automation platform.",
  },
  {
    icon: ShoppingCart,
    eyebrow: "Ecommerce and brands",
    title: "Buying-risk evaluation",
    criteria: [
      ["Product or platform fit", "25%"],
      ["Total value", "20%"],
      ["Buying experience", "15%"],
      ["Shipping and returns", "20%"],
      ["Support and trust signals", "20%"],
    ],
    note: "For ecommerce platforms we test store-building workflows. For retail brands we focus on product fit, policies, fulfillment, and customer risk.",
  },
];

const evidenceLabels = [
  "Plan or version checked",
  "Representative tasks completed",
  "Official sources consulted",
  "Material limitations disclosed",
  "Alternatives compared",
  "Last checked date",
];

const Learn = () => {
  usePageMeta({
    title: "How We Review AI Tools and Ecommerce Brands | DS Review Hub",
    description: "See the DS Review Hub research process, review criteria, evidence standards, scoring approach, update policy, and affiliate disclosure.",
    canonical: "https://www.dsreviewhub.com/learn",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-border bg-[#070809] py-16 sm:py-24">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f1c_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1c_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
          <div className="container relative max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Our review methodology</p>
                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                  Evidence before scores. Context before clicks.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-gray-400 sm:text-lg">
                  DS Review Hub evaluates AI tools, ecommerce platforms, and online brands around the real decision a buyer needs to make. We publish the tradeoffs, not just the sales pitch.
                </p>
              </div>

              <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">The short version</p>
                <div className="mt-5 space-y-4">
                  {["Use it when practical", "Verify primary sources", "Show limitations", "Separate verdict from offer"].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-semibold text-gray-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16 sm:py-20">
          <div className="container max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">The process</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">How a review earns its verdict</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">The depth changes with the product, but the decision path stays consistent.</p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-5">
              {process.map((step) => (
                <article key={step.number} className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 lg:min-h-[310px]">
                  <span className="text-4xl font-black tracking-[-0.05em] text-white/10">{step.number}</span>
                  <step.icon className="mt-8 h-6 w-6 text-primary" />
                  <h3 className="mt-4 text-lg font-black leading-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-[#0b0d0f] py-16 sm:py-20">
          <div className="container max-w-6xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Category-specific scorecards</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">We do not grade everything with the same ruler.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                A numeric score appears only when the available evidence supports a repeatable comparison. Otherwise, we publish a qualitative verdict instead of inventing precision.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {scorecards.map((card) => (
                <article key={card.title} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{card.eyebrow}</p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight">{card.title}</h3>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <card.icon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-7 space-y-4">
                    {card.criteria.map(([label, weight]) => (
                      <div key={label}>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-semibold">{label}</span>
                          <span className="font-black text-primary">{weight}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-primary" style={{ width: weight }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-7 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">{card.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16 sm:py-20">
          <div className="container grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">The review record</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">What readers should be able to verify</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                Strong reviews make their evidence legible. As coverage expands, published pages include the following details whenever they are material and available.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {evidenceLabels.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold">
                    <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-3xl border border-amber-400/25 bg-amber-400/[0.06] p-6 sm:p-8">
              <AlertTriangle className="h-7 w-7 text-amber-400" />
              <h3 className="mt-5 text-2xl font-black tracking-tight">What we will not pretend to know</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                We do not label source research as hands-on testing, present a temporary coupon as guaranteed, or turn one customer complaint into a universal conclusion. Unknowns belong in the review.
              </p>
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4">
                <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-xs leading-5 text-muted-foreground">Material facts are tied to a checked date because software, pricing, and policies can change.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-[#070809] py-16 sm:py-20">
          <div className="container max-w-6xl">
            <div className="grid gap-5 lg:grid-cols-3">
              <article className="rounded-3xl border border-border bg-card p-6">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h2 className="mt-5 text-xl font-black">Corrections and updates</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">When evidence changes the conclusion, we update the article and its checked date. Readers and brands can submit a correction for review.</p>
                <a href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">Submit a correction <ArrowRight className="h-4 w-4" /></a>
              </article>
              <article className="rounded-3xl border border-border bg-card p-6">
                <ExternalLink className="h-6 w-6 text-primary" />
                <h2 className="mt-5 text-xl font-black">Affiliate independence</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">DS Review Hub may earn from outbound links. Commercial relationships do not buy a positive verdict, remove a limitation, or guarantee placement.</p>
                <a href="/disclosure" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">Read our disclosure <ArrowRight className="h-4 w-4" /></a>
              </article>
              <article className="rounded-3xl border border-primary/30 bg-primary/[0.07] p-6">
                <BadgeCheck className="h-6 w-6 text-primary" />
                <h2 className="mt-5 text-xl font-black">Ready to compare?</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Start with a published review, inspect the record, then check the retailer or product site for the final live terms.</p>
                <a href="/#review-library" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-black">Browse reviews <ArrowRight className="h-4 w-4" /></a>
              </article>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Learn;
