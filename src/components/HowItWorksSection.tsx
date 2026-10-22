import { FileSearch, GitCompareArrows, ScanSearch } from "lucide-react";

const steps = [
  {
    num: 1,
    icon: ScanSearch,
    title: "Research the brand",
    desc: "We examine the brand's product range, public policies, pricing, positioning, and available customer-experience signals.",
    cta: "Browse reviews",
    ctaLink: "/#review-library",
  },
  {
    num: 2,
    icon: GitCompareArrows,
    title: "Compare the tradeoffs",
    desc: "The review turns that research into a clear verdict, pros and cons, best-fit use cases, and alternatives worth considering.",
    cta: "Our standards",
    ctaLink: "/why-different",
  },
  {
    num: 3,
    icon: FileSearch,
    title: "Make the buying decision",
    desc: "Check the latest price, policies, and available offers, then verify the final terms directly with the retailer before buying.",
    cta: "Read Insights",
    ctaLink: "/insights",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-16">
      <div className="container space-y-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-foreground">
          How DS Review Hub approaches a review
        </h2>
        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl bg-card border border-border p-8 flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-lg">
                {step.num}
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <step.icon className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {step.desc}
                </p>
                {step.cta && (
                  <a href={step.ctaLink} className="text-sm font-semibold text-primary hover:underline">
                    {step.cta} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
