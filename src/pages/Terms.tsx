import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";

const Terms = () => {
  usePageMeta({
    title: "Terms of Service - DS Review Hub",
    description: "DS Review Hub Terms of Service. Read our terms and conditions for using the platform.",
    canonical: "https://www.dsreviewhub.com/terms",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl py-12 space-y-8">
        <h1 className="text-3xl font-extrabold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 22, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              By accessing and using DS Review Hub ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              DS Review Hub is a coupon and deal aggregation platform that provides users with promo codes, coupons, and deals from various online retailers. We do not sell products directly and are not responsible for the products or services offered by third-party retailers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Accuracy of Information</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              While we strive to provide accurate and up-to-date coupon codes and deals, we cannot guarantee that all codes will work or that all deals are currently available. Promo codes may expire, be limited in availability, or have specific terms and conditions set by the retailer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. User Conduct</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You agree not to misuse the Service, including but not limited to: submitting false or misleading coupon codes, attempting to exploit the platform, or engaging in any activity that could harm the Service or other users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Intellectual Property</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All content on DS Review Hub, including text, graphics, logos, and software, is the property of DS Review Hub or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              DS Review Hub is provided "as is" without warranties of any kind. We shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the Service, including any losses from expired or non-working coupon codes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. Third-Party Links</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The Service contains links to third-party websites. We are not responsible for the content, products, or practices of these external sites. Your interactions with these sites are governed by their own terms and policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">8. Modifications</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We reserve the right to modify these Terms of Service at any time. Continued use of the Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">9. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For questions about these Terms, please contact us at support@dsreviewhub.com.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
