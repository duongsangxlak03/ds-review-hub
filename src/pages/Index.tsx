import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LatestInsightsSection from "@/components/LatestInsightsSection";
import ReviewDirectorySection from "@/components/ReviewDirectorySection";
import ReviewTopicsSection from "@/components/ReviewTopicsSection";
import HowDifferentSection from "@/components/HowDifferentSection";
import ShareCodeSection from "@/components/ShareCodeSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import usePageMeta from "@/hooks/usePageMeta";

const Index = () => {
  usePageMeta({
    title: "DS Review Hub - Brand Reviews for Smarter Shopping",
    description: "Research online brands before you buy. Read practical reviews covering product quality, value, shipping, returns, customer experience, and current offers.",
    canonical: "https://www.dsreviewhub.com/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "DS Review Hub",
      url: "https://www.dsreviewhub.com",
      description: "Practical brand reviews, buying guidance, and current shopping offers.",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://www.dsreviewhub.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <LatestInsightsSection />
      <ReviewDirectorySection />
      <ReviewTopicsSection />
      <HowDifferentSection />
      <ShareCodeSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
