import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";
import { Mail, MessageSquare, Building } from "lucide-react";

const Contact = () => {
  usePageMeta({
    title: "Contact Us - DS Review Hub",
    description: "Get in touch with DS Review Hub. Contact us for questions, feedback, partnership inquiries, or to report issues with coupons and deals.",
    canonical: "https://www.dsreviewhub.com/contact",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-12 space-y-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">Contact Us</h1>
        <p className="text-lg text-foreground/90 leading-relaxed">
          We'd love to hear from you. Whether you have a question about a coupon, want to report an issue, or are interested in partnering with us, feel free to reach out.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">General Inquiries</h2>
            <p className="text-sm text-muted-foreground">For general questions, feedback, or support.</p>
            <a href="mailto:support@dsreviewhub.com" className="text-sm font-semibold text-primary hover:underline">
              support@dsreviewhub.com
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Business & Partnerships</h2>
            <p className="text-sm text-muted-foreground">For advertising, affiliate partnerships, or brand collaborations.</p>
            <a href="mailto:partners@dsreviewhub.com" className="text-sm font-semibold text-primary hover:underline">
              partners@dsreviewhub.com
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Report a Coupon Issue</h2>
            <p className="text-sm text-muted-foreground">Found a broken code or expired deal? Let us know so we can fix it.</p>
            <a href="mailto:support@dsreviewhub.com?subject=Coupon%20Issue" className="text-sm font-semibold text-primary hover:underline">
              Report an issue
            </a>
          </div>
        </div>

        <section className="space-y-4 pt-4">
          <h2 className="text-2xl font-bold text-foreground">Response Time</h2>
          <p className="text-foreground/90 leading-relaxed">
            We typically respond to all inquiries within 1-2 business days. For urgent matters, please include "Urgent" in your email subject line.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
