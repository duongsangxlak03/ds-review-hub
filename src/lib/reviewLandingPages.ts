import fridgeHeroImage from "@/assets/review-portable-fridge-hero.jpg";

export type ReviewLandingPageTheme = "gear" | "fashion";

export interface ReviewLandingPageData {
  slug: string;
  theme?: ReviewLandingPageTheme;
  brandName: string;
  productName: string;
  category: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  heroImage: string;
  heroImageAlt?: string;
  updatedLabel: string;
  rating: number;
  ratingLabel: string;
  couponCode: string;
  couponLabel: string;
  primaryCta: string;
  affiliateUrl: string;
  verdict: string;
  metrics: Array<{
    label: string;
    value: string;
    note: string;
  }>;
  highlights: string[];
  products: Array<{
    name: string;
    fit: string;
    note: string;
    image?: string;
    price?: string;
    compareAtPrice?: string;
    url?: string;
    badge?: string;
  }>;
  pros: string[];
  cons: string[];
  trustSnapshot?: {
    sourceName: string;
    sourceUrl: string;
    score: string;
    scoreLabel: string;
    reviewCount: string;
    checkedLabel: string;
    summary: string;
    distribution: Array<{
      label: string;
      value: string;
    }>;
  };
  sectionLabels?: {
    verdictEyebrow?: string;
    verdictHeading?: string;
    highlightsHeading?: string;
    productsHeading?: string;
    prosHeading?: string;
    consHeading?: string;
    faqHeading?: string;
    couponTitle?: string;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export const reviewLandingPages: ReviewLandingPageData[] = [
  {
    slug: "setpower-fridge",
    theme: "gear",
    brandName: "SetPower",
    productName: "SetPower Portable Fridge",
    category: "Car Fridge",
    eyebrow: "Portable fridge coupon review",
    headline: "SetPower fridge deals are strongest when you match the model to the trip.",
    subhead:
      "A review-style landing page for shoppers comparing portable car fridges, current coupon value, and the easiest path to checkout.",
    heroImage: fridgeHeroImage,
    heroImageAlt: "Portable fridge at an outdoor campsite",
    updatedLabel: "Updated Jun 12, 2026",
    rating: 4.7,
    ratingLabel: "DS Review Hub campaign score",
    couponCode: "SAVE10",
    couponLabel: "Demo code for the test landing page",
    primaryCta: "Shop SetPower Deals",
    affiliateUrl: "https://www.setpowerusa.com/",
    verdict:
      "SetPower is a strong fit for road trips, camping, and vehicle-based cooling when shoppers want a dedicated compressor fridge instead of a standard ice cooler.",
    metrics: [
      {
        label: "Best fit",
        value: "Road trips",
        note: "Good angle for travel, camping, and overlanding traffic.",
      },
      {
        label: "Offer type",
        value: "Code",
        note: "Coupon-first CTA with manual copy and outbound click.",
      },
      {
        label: "Intent",
        value: "High",
        note: "Product-aware shoppers usually compare price and warranty.",
      },
    ],
    highlights: [
      "Compressor-style cooling makes the product easier to position than a basic ice chest.",
      "The best ad angle is practical savings: less ice, less food waste, more stable travel storage.",
      "Coupon copy should stay conservative and avoid guaranteed savings unless the merchant confirms it.",
      "Pair the code with a short buying guide so the page is not only a bridge to checkout.",
    ],
    products: [
      {
        name: "Compact single-zone fridge",
        fit: "Weekend car trips",
        note: "Best for users who need basic cold storage without taking too much trunk space.",
      },
      {
        name: "Dual-zone fridge/freezer",
        fit: "Longer camping runs",
        note: "Better for shoppers who want chilled drinks and frozen food in one setup.",
      },
      {
        name: "Battery-ready bundle",
        fit: "Off-grid use",
        note: "Useful when the ad angle is camping independence or backup cooling.",
      },
    ],
    pros: [
      "Clear use case for camping, road trips, van life, and emergency backup cooling.",
      "Easy coupon story: shoppers understand why a discount matters on higher-ticket gear.",
      "Good visual hook for ads because the product fits real lifestyle scenes.",
    ],
    cons: [
      "Claims must be verified before launch, especially temperature range and warranty details.",
      "A review angle needs original copy, comparison context, and disclosure to avoid thin affiliate risk.",
      "Model availability and coupon terms can change quickly, so data needs regular refreshes.",
    ],
    faqs: [
      {
        question: "Is this page meant for SEO or ads?",
        answer:
          "This test layout is built for ads. It can stay noindex while still being used as a campaign landing page.",
      },
      {
        question: "Should this live on offers or reviews?",
        answer:
          "For this format, reviews is the cleaner label because the page includes buying context, pros, cons, FAQ, and an editorial-style verdict.",
      },
      {
        question: "Can the same template scale to 1000 stores?",
        answer:
          "Yes. The page is data-driven, so each store can reuse the layout while changing brand, offer, products, FAQs, and CTA links.",
      },
    ],
  },
  {
    slug: "three-bird-nest",
    theme: "fashion",
    brandName: "Three Bird Nest",
    productName: "Three Bird Nest",
    category: "Women's boho clothing",
    eyebrow: "Trustpilot-backed store review",
    headline: "Three Bird Nest has cute boho pieces, but shoppers should check fit, fabric, and return rules first.",
    subhead:
      "We summarized public Trustpilot themes and current Three Bird Nest product data so shoppers can compare the upside, common complaints, and today's best-seller deals before ordering.",
    heroImage:
      "https://cdn.shopify.com/s/files/1/0179/2309/products/newphoto.jpg?v=1738814178",
    heroImageAlt: "Three Bird Nest wide leg pants product photography",
    updatedLabel: "Checked Jun 12, 2026",
    rating: 3.4,
    ratingLabel: "Trustpilot TrustScore from 625 reviews at check time",
    couponCode: "NO CODE",
    couponLabel:
      "Sale prices were visible on selected best sellers. Verify the final cart total and return eligibility before checkout.",
    primaryCta: "Shop Three Bird Nest Deals",
    affiliateUrl: "https://www.threebirdnest.com/",
    verdict:
      "Three Bird Nest is best for shoppers who want relaxed boho outfits, bralettes, soft pants, kimonos, and boutique-style layers. The review profile is mixed, so this page works best when it is honest: show the cute product story, then clearly flag quality, shipping, and return-policy checks.",
    metrics: [
      {
        label: "TrustScore",
        value: "3.4 / 5",
        note: "Public Trustpilot score at check time; treat this as mixed, not premium.",
      },
      {
        label: "Review volume",
        value: "625",
        note: "Enough review volume to summarize patterns instead of relying on one-off comments.",
      },
      {
        label: "Best angle",
        value: "Boho deals",
        note: "Lead with style and best sellers, then reduce risk with buying tips.",
      },
    ],
    trustSnapshot: {
      sourceName: "Trustpilot",
      sourceUrl: "https://www.trustpilot.com/review/threebirdnest.com",
      score: "3.4 / 5",
      scoreLabel: "TrustScore",
      reviewCount: "625 reviews",
      checkedLabel: "Checked Jun 12, 2026",
      summary:
        "Positive reviews often mention cute boho styles, comfort, and helpful support. Negative reviews repeatedly mention quality consistency, shipping delays, return friction, and refund expectations.",
      distribution: [
        {
          label: "5-star reviews",
          value: "61%",
        },
        {
          label: "1-star reviews",
          value: "16%",
        },
      ],
    },
    sectionLabels: {
      verdictEyebrow: "Quick verdict",
      verdictHeading: "Good for boho style shoppers, weaker for risk-free ordering",
      highlightsHeading: "What the customer data suggests",
      productsHeading: "Best-seller products to feature in the test",
      prosHeading: "What customers tend to like",
      consHeading: "What shoppers should check",
      faqHeading: "Before ordering",
      couponTitle: "Current deal",
    },
    highlights: [
      "The strongest conversion hook is visual: show several real products so the page feels like a boutique shopping guide, not a generic coupon page.",
      "The trust angle should stay balanced because the public review score is mixed, with both strong praise and serious complaints.",
      "Best-seller discounts create an easy deal story without inventing an exclusive coupon code.",
      "Buying tips can turn complaints into useful guidance: check sizing, final sale status, shipping timing, and return terms before placing an order.",
    ],
    products: [
      {
        name: "Scoop Neck Bralette Tee - Black",
        fit: "Low-ticket layering top",
        note: "A low-ticket product that fits the boho layering angle and can work as a first-click product in the grid.",
        image:
          "https://cdn.shopify.com/s/files/1/0179/2309/products/0nQ9gyPw.jpg?v=1653083112",
        price: "$14",
        compareAtPrice: "$28",
        url: "https://www.threebirdnest.com/products/scoop-neck-bralette-tops",
        badge: "Entry deal",
      },
      {
        name: "So Comfy Wide Leg Pant Cropped Length - Charcoal",
        fit: "Comfort pants",
        note: "Good hero product for comfort-led ads because the discount is visible and the product reads clearly in imagery.",
        image:
          "https://cdn.shopify.com/s/files/1/0179/2309/products/newphoto.jpg?v=1738814178",
        price: "$54",
        compareAtPrice: "$68",
        url: "https://www.threebirdnest.com/products/3bn-so-comfy-wide-leg-pant-charcoal",
        badge: "Comfort pick",
      },
      {
        name: "Cher Solid Raw Edge Flare Pant - Black",
        fit: "Sale-friendly bottom",
        note: "A stronger sale-price anchor for shoppers who care about savings before styling a full outfit.",
        image:
          "https://cdn.shopify.com/s/files/1/0179/2309/files/7Y2swIrw_1.jpg?v=1739240905",
        price: "$29",
        compareAtPrice: "$58",
        url: "https://www.threebirdnest.com/products/dylan-solid-raw-edge-flare-pant-black",
        badge: "Sale angle",
      },
      {
        name: "Simply Comfort Jumpsuit - Dark Gray",
        fit: "One-piece outfit",
        note: "Useful for the 'easy outfit' angle and gives the landing page more variety than tops and bottoms only.",
        image:
          "https://cdn.shopify.com/s/files/1/0179/2309/products/image_b9316318-2452-413b-9a70-6ad2d0907386.jpg?v=1738814024",
        price: "$36",
        compareAtPrice: "$72",
        url: "https://www.threebirdnest.com/products/simply-comfort-button-down-romper-gray",
        badge: "One-piece pick",
      },
    ],
    pros: [
      "Distinctive boho styling gives the page a clear visual identity for cold traffic.",
      "Best sellers include approachable price points, which makes a deal-led CTA easier to justify.",
      "Public review volume is large enough to summarize patterns and write a more useful buying guide.",
    ],
    cons: [
      "The Trustpilot score is mixed, so the page should not pretend this is a universally loved store.",
      "Quality, fit, and fabric expectations need to be framed carefully because complaints repeat in those areas.",
      "Return and refund expectations should be checked before checkout, especially for sale items and time-sensitive orders.",
    ],
    faqs: [
      {
        question: "Is Three Bird Nest legit?",
        answer:
          "Yes, it is an active women's clothing store with a public review profile and a large product catalog. The better question is whether the current item, return terms, and shipping timeline fit the shopper's expectations.",
      },
      {
        question: "What do customers like most?",
        answer:
          "Positive review themes commonly point to the boho style, comfortable pieces, boutique look, and helpful support experiences.",
      },
      {
        question: "What complaints show up most often?",
        answer:
          "Negative themes include quality consistency, fabric expectations, shipping delays, return friction, and refund outcomes. The landing page should mention these directly instead of hiding them.",
      },
      {
        question: "Should this page use a coupon code?",
        answer:
          "Only if a verified code exists. For this test page, a sale/deal CTA is cleaner than inventing a code. If DS Review Hub has a verified Three Bird Nest code later, the same block can switch from NO CODE to the live code.",
      },
    ],
  },
];

export const getReviewLandingPage = (slug?: string) =>
  reviewLandingPages.find((page) => page.slug === slug);
