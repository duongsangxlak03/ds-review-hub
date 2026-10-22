import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";

const About = () => {
  usePageMeta({
    title: "About DS Review Hub - Who We Are",
    description: "Learn how DS Review Hub researches AI tools, ecommerce platforms, online brands, and current shopping offers.",
    canonical: "https://www.dsreviewhub.com/about",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-12 space-y-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">About DS Review Hub</h1>

        <section className="space-y-4 text-foreground/90 leading-relaxed">
          <p>
            DS Review Hub is an independent review and buying-guidance publication covering AI tools, ecommerce platforms, software, and online brands.
          </p>
          <p>
            Our mission is simple: turn a noisy buying decision into a useful brief. We explain who a product or brand suits, where it falls short, what evidence supports the verdict, and which alternatives deserve a look.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">How We Review</h2>
          <div className="space-y-3 text-foreground/90 leading-relaxed">
            <p>
              DS Review Hub focuses on <strong>decision-useful evidence</strong>. A finished review aims to make the following clear:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Best fit</strong> — Who is most likely to get value from the product or brand</li>
              <li><strong>Tradeoffs</strong> — Important limitations, buying risks, and reasons to consider an alternative</li>
              <li><strong>Review record</strong> — The checked date, research scope, and sources used when available</li>
            </ul>
            <p>Read the complete <a href="/learn" className="text-primary hover:underline">DS Review Hub methodology</a>.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Our Team</h2>
          <p className="text-foreground/90 leading-relaxed">
            DS Review Hub is built by a small editorial and product team focused on practical research, transparent limitations, and pages that remain useful after the first click.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">How We Make Money</h2>
          <p className="text-foreground/90 leading-relaxed">
            DS Review Hub is free to use. We may earn a commission when you click certain affiliate links and make a purchase at a retailer website. This does not add extra cost to your order, buy a positive verdict, or remove criticism from a review.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Contact Us</h2>
          <p className="text-foreground/90 leading-relaxed">
            Have questions, feedback, or want to partner with us? We'd love to hear from you. Visit our <a href="/contact" className="text-primary hover:underline">Contact page</a> to get in touch.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
