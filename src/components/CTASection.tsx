import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-16">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl hero-gradient p-12 md:p-16 text-center space-y-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(270,60%,60%,0.2),transparent_60%)]" />
          <div className="relative space-y-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-accent-foreground">
              Research first. Buy with confidence.
            </h2>
            <p className="text-lg text-accent-foreground/75 max-w-xl mx-auto">
              Find the brand, understand the tradeoffs, and check the current value before you spend.
            </p>
            <Button size="lg" className="font-bold text-base px-10" asChild>
              <a href="/#review-library">Browse Brand Reviews</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
