import { ArrowRight, BadgeDollarSign, Boxes, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

const reviewAreas = [
  { icon: Boxes, title: "Products and ecosystems", desc: "What a brand sells, how its range fits together, and where the strongest value may be." },
  { icon: MessageSquareText, title: "Customer experience", desc: "Recurring themes around quality, delivery, support, returns, and the post-purchase experience." },
  { icon: BadgeDollarSign, title: "Price and offers", desc: "Whether the price makes sense—and which current offers may improve the value at checkout." },
];

const ShareCodeSection = () => {
  return (
    <section className="py-16">
      <div className="container space-y-12">
        <div className="rounded-2xl bg-card border border-border p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-extrabold text-foreground">
              A useful review should answer the hard questions.
            </h2>
            <p className="text-muted-foreground">
              Is the brand credible? Is the product worth its price? What happens when something goes wrong? We organize the evidence so the answer is easier to see.
            </p>
            <Button className="font-semibold" asChild>
              <a href="/why-different">
                See how we review <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-primary/25 bg-primary/10 text-6xl">◎</div>
        </div>

        <div>
          <h3 className="text-2xl font-extrabold text-foreground mb-6 text-center">
            What we look at
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {reviewAreas.map((t) => (
              <div key={t.title} className="rounded-xl bg-card border border-border p-6 space-y-3 hover:border-primary/30 transition-colors">
                <t.icon className="h-8 w-8 text-primary" />
                <h4 className="font-bold text-foreground">{t.title}</h4>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShareCodeSection;
