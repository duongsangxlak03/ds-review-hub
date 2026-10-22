import { ArrowUpRight, Bot, Cloud, Cpu, House, ShoppingBag, Sparkles } from "lucide-react";

const topics = [
  {
    icon: Bot,
    eyebrow: "Fast-moving",
    title: "AI Tools",
    description: "AI assistants, creative tools, automation platforms, and the products changing how people work.",
    href: "/?review=AI%20Tools#review-library",
    accent: "from-emerald-400/20 to-cyan-400/5",
  },
  {
    icon: Cpu,
    eyebrow: "Hands-on context",
    title: "Technology",
    description: "Consumer electronics, connected devices, accessories, and the brands behind the hardware.",
    href: "/?review=Technology#review-library",
    accent: "from-blue-400/20 to-violet-400/5",
  },
  {
    icon: ShoppingBag,
    eyebrow: "Built for operators",
    title: "Ecommerce",
    description: "Platforms, storefront tools, fulfillment services, and software used to sell online.",
    href: "/?review=Ecommerce#review-library",
    accent: "from-orange-400/20 to-rose-400/5",
  },
  {
    icon: Cloud,
    eyebrow: "Work smarter",
    title: "Software & SaaS",
    description: "Productivity, business software, subscriptions, and tools worth adding to your stack.",
    href: "/?review=Software#review-library",
    accent: "from-violet-400/20 to-fuchsia-400/5",
  },
  {
    icon: House,
    eyebrow: "Everyday decisions",
    title: "Home & Lifestyle",
    description: "Home brands, appliances, everyday products, and services competing for your budget.",
    href: "/?review=Home#review-library",
    accent: "from-amber-400/20 to-yellow-400/5",
  },
  {
    icon: Sparkles,
    eyebrow: "Personal picks",
    title: "Beauty & Wellness",
    description: "Beauty, personal care, wellness products, and the claims shoppers should examine closely.",
    href: "/?review=Beauty#review-library",
    accent: "from-pink-400/20 to-purple-400/5",
  },
];

const ReviewTopicsSection = () => (
  <section className="py-16 sm:py-20">
    <div className="container">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">What we cover</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">Reviews across the modern buying landscape.</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          From fast-moving AI products to established consumer brands, each category gets criteria that match the decision being made.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <a
            key={topic.title}
            href={topic.href}
            className="group relative min-h-[245px] overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/45"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${topic.accent} opacity-70 transition-opacity group-hover:opacity-100`} />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/20">
                  <topic.icon className="h-6 w-6 text-primary" />
                </span>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-auto pt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{topic.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-foreground">{topic.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{topic.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default ReviewTopicsSection;
