import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";

const Privacy = () => {
  usePageMeta({
    title: "Privacy Policy - DS Review Hub",
    description: "DS Review Hub Privacy Policy. Learn how we collect, use, and protect your data.",
    canonical: "https://www.dsreviewhub.com/privacy",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl py-12 space-y-8">
        <h1 className="text-3xl font-extrabold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 22, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We collect information you provide directly, such as when you create an account, submit a coupon code, or contact us. We also automatically collect certain information when you visit our website, including your IP address, browser type, referring URLs, and pages viewed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. How We Use Your Information</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We use the information we collect to provide and improve our services, personalize your experience, communicate with you, and comply with legal obligations. We may also use your information for analytics and advertising purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Cookies and Tracking</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We use cookies and similar tracking technologies (including Google Analytics) to analyze website traffic and improve your experience. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Third-Party Links</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Our website contains links to third-party retailer websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Data Security</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Your Rights</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time. To exercise these rights, please contact us at privacy@dsreviewhub.com.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">8. Contact Us</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at privacy@dsreviewhub.com.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
