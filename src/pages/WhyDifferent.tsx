import {
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  FileSearch,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";

const principles = [
  {
    icon: FileSearch,
    eyebrow: "Evidence",
    title: "Show the work behind the verdict",
    body: "A useful review identifies the sources, test context, checked date, and important unknowns. Readers should be able to tell the difference between hands-on use, primary-source research, and public customer signals.",
  },
  {
    icon: Scale,
    eyebrow: "Context",
    title: "Recommend for a use case—not for everyone",
    body: "Products are rarely best in the abstract. We explain the workflow, buyer, budget, or risk profile that makes a product a good fit, then surface the reasons another option may work better.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Independence",
    title: "Affiliate revenue does not buy the verdict",
    body: "DS Review Hub may earn from qualifying links. That relationship does not remove criticism, turn an unverified claim into a fact, or guarantee a favorable position in a comparison.",
  },
  {
    icon: RefreshCcw,
    eyebrow: "Freshness",
    title: "Treat every conclusion as time-sensitive",
    body: "AI products, ecommerce platforms, prices, and store policies change. Reviews carry a checked or updated date and should be revisited when a material change could alter the decision.",
  },
];

const promises = [
  "No made-up testing, ratings, savings, or customer consensus",
  "No hiding a meaningful limitation below a commercial CTA",
  "No treating one plan, version, or customer story as universal",
  "No guaranteed coupon or price claims when the retailer controls the final terms",
];

const WhyDifferent = () => {
  usePageMeta({
    title: "Our Editorial Standards | DS Review Hub",
    description: "Learn the DS Review Hub editorial principles for evidence, review independence, transparent affiliate links, corrections, and product updates.",
    canonical: "https://www.dsreviewhub.com/why-different",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-border bg-[#070809] py-16 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(3,255,136,0.12),transparent_34%)]" />
          <div className="container relative max-w-6xl">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-primary">
                <BadgeCheck className="h-4 w-4" /> Editorial standards
              </div>
              <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                Useful reviews require more than a confident opinion.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Our job is to make a buying decision clearer: what works, what does not, who the product suits, and how strong the evidence really is.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/learn" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-black">
                  Read the methodology <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/#review-library" className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-black hover:border-primary/50 hover:text-primary">
                  Browse reviews
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16 sm:py-20">
          <div className="container max-w-6xl">
            <div className="grid gap-5 md:grid-cols-2">
              {principles.map((principle) => (
                <article key={principle.title} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{principle.eyebrow}</p>
                      <h2 className="mt-3 text-2xl font-black tracking-[-0.025em]">{principle.title}</h2>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <principle.icon className="h-6 w-6" />
                    </span>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-muted-foreground">{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-[#0b0d0f] py-16 sm:py-20">
          <div className="container grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">The editorial promise</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">What we refuse to fake</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                Trust disappears quickly when a review claims experience it does not have. These are publication boundaries, not marketing copy.
              </p>
              <div className="mt-8 space-y-3">
                {promises.map((promise) => (
                  <div key={promise} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm font-semibold leading-6">{promise}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-3xl border border-primary/25 bg-primary/[0.07] p-6 sm:p-8">
              <Sparkles className="h-7 w-7 text-primary" />
              <h2 className="mt-5 text-2xl font-black tracking-tight">AI assists the workflow. Editors own the claims.</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                AI can help organize notes, spot comparison questions, and produce a first draft. It does not replace source checking, judgment, or the final publication decision.
              </p>
              <a href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">
                Flag an error or outdated fact <ArrowRight className="h-4 w-4" />
              </a>
            </aside>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container max-w-6xl">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Commercial transparency</p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.035em]">Offers remain useful—but separate from the verdict.</h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                    Review pages can link to an official website or a DS Review Hub store page with current offers. Readers should always verify final pricing, availability, shipping, returns, and eligibility at the retailer.
                  </p>
                </div>
                <a href="/disclosure" className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-black hover:border-primary/50 hover:text-primary">
                  Affiliate disclosure <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WhyDifferent;
