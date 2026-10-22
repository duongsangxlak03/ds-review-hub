import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";

const Disclosure = () => {
  usePageMeta({
    title: "Affiliate Disclosure - DS Review Hub",
    description: "DS Review Hub affiliate disclosure. Learn how we earn revenue through affiliate partnerships while providing free coupons and deals.",
    canonical: "https://www.dsreviewhub.com/disclosure",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-12 space-y-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">Affiliate Disclosure</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 2026</p>

        <div className="space-y-6 text-foreground/90 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">How DS Review Hub Makes Money</h2>
            <p>
              DS Review Hub is a free service. We do not charge users for accessing coupons, promo codes, or deals listed on our website.
            </p>
            <p>
              To keep our platform running, we participate in <strong>affiliate marketing programs</strong>. This means that when you click certain links on our site and make a purchase at a retailer website, we may earn a commission from that retailer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">What This Means for You</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>No direct fee from us</strong> - DS Review Hub does not charge shoppers to browse listed coupons and deals.</li>
              <li><strong>Retailer checkout controls the final price</strong> - Discounts, shipping, taxes, and eligibility are confirmed on the retailer website.</li>
              <li><strong>Affiliate links may be used</strong> - Some outbound links can track purchases and attribute commissions to DS Review Hub.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Our Commitment to Transparency</h2>
            <p>
              We believe in being upfront about how we operate. Some of the links on DS Review Hub are affiliate links, which means we receive compensation if you click through and make a purchase. However:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We aim to keep offer descriptions clear and avoid misleading deal claims.</li>
              <li>Offers marked verified were manually reviewed by DS Review Hub before listing.</li>
              <li>We label deals and codes with terms and conditions when available.</li>
              <li>Expired offers should be updated or removed when identified.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Affiliate Programs We Participate In</h2>
            <p>
              DS Review Hub participates in various affiliate networks and direct partnerships with retailers. These partnerships allow us to provide links that track purchases and attribute commissions to our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Questions?</h2>
            <p>
              If you have any questions about our affiliate relationships or how we make money, please don't hesitate to <a href="/contact" className="text-primary hover:underline">contact us</a>. We're happy to explain.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Disclosure;
