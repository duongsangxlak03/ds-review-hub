export interface MoneyPageGuideSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface MoneyPageGuideFaq {
  question: string;
  answer: string;
}

export interface MoneyPageGuide {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  facts: Array<{
    label: string;
    value: string;
  }>;
  sections: MoneyPageGuideSection[];
  faqs: MoneyPageGuideFaq[];
}

export interface MoneyPageGuideInput {
  slug?: string | null;
  storeName: string;
  category?: string | null;
  bestOffer?: string | null;
  couponCodeCount?: number;
  noCodeDealCount?: number;
  verifiedCouponCount?: number;
  customGuide?: StoreSavingsGuideInput | null;
}

export interface StoreSavingsGuideInput {
  priority?: string | null;
  shipping_note?: string | null;
  return_note?: string | null;
  stacking_note?: string | null;
  sale_item_note?: string | null;
  reference_urls?: unknown;
  status?: string | null;
}

interface CategoryGuideProfile {
  labels: string[];
  focus: string;
  checkHeading: string;
  checkBody: string;
  checkBullets: string[];
  saleItemText: string;
}

const defaultCategoryProfile: CategoryGuideProfile = {
  labels: [],
  focus: "checkout restrictions, cart value, and final price",
  checkHeading: "What to check before placing the order",
  checkBody:
    "Coupon terms can depend on cart contents, minimum order rules, excluded products, customer type, and expiration dates. Check the final checkout total before placing the order.",
  checkBullets: [
    "Confirm that the discount applies before payment.",
    "Look for minimum purchase rules, excluded products, and expiration dates.",
    "Compare the final total after shipping and taxes, not only the discount label.",
  ],
  saleItemText:
    "Some coupon codes may exclude sale, clearance, bundle, gift card, or limited-release items. Apply the code at checkout and confirm the final price before ordering.",
};

const categoryProfiles: CategoryGuideProfile[] = [
  {
    labels: ["fashion & apparel", "apparel", "accessories", "shoes"],
    focus: "sale items, sizing, final sale labels, and shipping thresholds",
    checkHeading: "What to check on fashion orders",
    checkBody:
      "Fashion and accessory discounts often depend on whether items are full price, sale, bundle, or final sale. Check the item page and cart before assuming a code applies to every product.",
    checkBullets: [
      "Look for final sale, bundle, jewelry, accessory, or gift card exclusions.",
      "Confirm sizing and return eligibility before checking out.",
      "Compare a promo code against any automatic sale price already in the cart.",
    ],
    saleItemText:
      "Many fashion coupons exclude sale, clearance, bundle, gift card, or final sale items. Apply the code in cart and confirm whether regular-priced or sale items receive the discount.",
  },
  {
    labels: ["electronics & tech", "electronics", "computers & laptops", "software & saas"],
    focus: "model eligibility, bundles, warranty terms, and subscription renewals",
    checkHeading: "What to check on tech orders",
    checkBody:
      "Tech discounts can vary by product model, bundle, renewal plan, and warranty option. Check whether the coupon applies to the exact item or plan in your cart.",
    checkBullets: [
      "Confirm eligible models, plan lengths, and bundle terms.",
      "Check whether the discount affects subscriptions, renewals, accessories, or only new purchases.",
      "Review shipping, warranty, and return terms before completing the order.",
    ],
    saleItemText:
      "Some tech coupons exclude bundles, subscriptions, renewals, refurbished products, accessories, or limited-time sale items. Check the checkout total for the exact item or plan.",
  },
  {
    labels: ["beauty & personal care", "beauty & fitness", "health & wellness", "health & personal care"],
    focus: "subscriptions, bundles, first-order terms, and product exclusions",
    checkHeading: "What to check on beauty and wellness orders",
    checkBody:
      "Beauty, wellness, and personal care offers often differ between one-time purchases, bundles, subscriptions, and first-order discounts. Make sure the offer fits your cart type.",
    checkBullets: [
      "Check whether the code applies to subscriptions, bundles, or one-time purchases.",
      "Compare first-order codes with sitewide or auto-applied sale prices.",
      "Review shipping, refill, return, and ingredient-related policies before ordering.",
    ],
    saleItemText:
      "Some beauty and wellness coupons exclude subscriptions, bundles, refills, gift cards, or sale items. Confirm eligibility in checkout before relying on the discount.",
  },
  {
    labels: ["food & grocery", "food & dining"],
    focus: "delivery fees, order minimums, subscriptions, and regional availability",
    checkHeading: "What to check on food and grocery orders",
    checkBody:
      "Food and grocery offers can depend on delivery region, order minimum, subscription status, and product availability. Confirm fees and eligibility before placing the order.",
    checkBullets: [
      "Check delivery fees, order minimums, and regional restrictions.",
      "Compare first-order, subscription, and one-time purchase discounts.",
      "Review perishable shipping or pickup terms when available.",
    ],
    saleItemText:
      "Some food and grocery coupons exclude subscriptions, bundles, alcohol, delivery fees, taxes, or specific product categories. Check the final cart total.",
  },
  {
    labels: ["home & garden"],
    focus: "oversized shipping, bundles, warranties, and return windows",
    checkHeading: "What to check on home orders",
    checkBody:
      "Home and garden discounts may change with product size, shipping method, warranty add-ons, and bundle pricing. Check whether the coupon applies before buying large items.",
    checkBullets: [
      "Review oversized shipping, handling fees, and delivery timing.",
      "Check bundle, clearance, and warranty exclusions.",
      "Compare the coupon discount with automatic sale pricing in cart.",
    ],
    saleItemText:
      "Some home and garden coupons exclude clearance, bundles, oversized items, warranties, or gift cards. Confirm the code in checkout before placing the order.",
  },
];

const customMoneyPageGuides: Record<string, MoneyPageGuide> = {
  "three-bird-nest": {
    slug: "three-bird-nest",
    eyebrow: "Three Bird Nest savings guide",
    title: "How to get the best Three Bird Nest discount",
    intro:
      "Three Bird Nest shoppers usually need to compare full-price promo codes against product-level sale deals. Start with the verified codes above, then check whether your cart is close enough to the free-shipping threshold to improve the final total.",
    facts: [
      {
        label: "Best first test",
        value: "Try a verified 20% off full-price code before comparing no-code product deals.",
      },
      {
        label: "Shipping angle",
        value: "Eligible US orders can qualify for free Economy shipping when the item total is over $150.",
      },
      {
        label: "Stacking note",
        value: "Coupon codes and promotions usually do not combine unless the checkout terms say otherwise.",
      },
      {
        label: "Return note",
        value: "Returns are generally for new, tagged items within 30 days; final sale items are excluded.",
      },
    ],
    sections: [
      {
        heading: "Which Three Bird Nest code should you try first?",
        body:
          "If your cart is mostly regular-priced clothing or accessories, test a verified full-price promo code first. If your cart is built around one discounted product, compare the code against the no-code deal price because the automatic sale may win.",
        bullets: [
          "Use the top verified code first when your cart contains full-price items.",
          "Compare no-code product deals when a single sale item is the main reason you are ordering.",
          "Check the final checkout total, not just the largest discount label on the coupon card.",
        ],
      },
      {
        heading: "Use the $150 free-shipping threshold when it helps",
        body:
          "Three Bird Nest can offer free Economy shipping on eligible US orders when the item total is over $150. If your cart is just below that mark, adding a small eligible item may beat paying shipping, but only if the final total still makes sense.",
        bullets: [
          "The threshold is based on item total, so shipping and taxes should not be counted toward it.",
          "A 20% code plus free shipping can be stronger than a higher-looking product deal on smaller carts.",
          "Always confirm the shipping line after the code is applied.",
        ],
      },
      {
        heading: "What to check before placing the order",
        body:
          "Three Bird Nest coupon terms can depend on product type, sale status, and cart contents. Before checking out, look for excluded sale items, final sale labels, gift card restrictions, and whether the checkout replaces one promotion with another.",
        bullets: [
          "Coupons may exclude sale, bundle, gift card, or final sale items.",
          "If one code fails, remove excluded items or try the next verified code from the list.",
          "If you forgot to apply a code, merchant support may only be able to help shortly after the order is placed.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does Three Bird Nest offer free shipping?",
        answer:
          "Three Bird Nest can offer free Economy shipping on eligible US orders when the item total is over $150. Shipping and taxes should not be counted toward that threshold, so check the final shipping line at checkout.",
      },
      {
        question: "Can Three Bird Nest coupon codes stack?",
        answer:
          "Three Bird Nest coupon codes and promotions generally cannot be combined unless a specific offer says otherwise. If checkout accepts only one promotion, compare the current DS Review Hub offers and keep the one with the best final total.",
      },
      {
        question: "Can I use a Three Bird Nest coupon on sale items?",
        answer:
          "Some Three Bird Nest coupon codes may exclude sale, bundle, gift card, limited-release, or final sale items. Apply the code at checkout and confirm whether the discount affects the items in your cart.",
      },
      {
        question: "What Three Bird Nest coupon should I try first?",
        answer:
          "Start with a verified full-price promo code when your cart includes regular-priced items. If your cart is mostly a single discounted product, compare that code with the current no-code deal before ordering.",
      },
      {
        question: "Can I return an order after using a Three Bird Nest promo code?",
        answer:
          "Three Bird Nest generally accepts returns for new, tagged items within 30 days, while final sale items are not returnable. Refund value may reflect the price paid after a coupon or discount.",
      },
      {
        question: "What payment methods work with Three Bird Nest deals?",
        answer:
          "Three Bird Nest lists major credit cards, PayPal, AfterPay, and Shop Pay as payment options. Confirm the current payment methods in checkout before relying on a specific wallet or pay-later option.",
      },
    ],
  },
};

const normalize = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const plural = (count: number, singular: string, pluralText = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralText}`;

const categoryProfileFor = (category?: string | null) => {
  const normalized = normalize(category);
  return categoryProfiles.find((profile) => profile.labels.includes(normalized)) || defaultCategoryProfile;
};

const cleanNote = (value?: string | null) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

export const moneyPageGuideForStore = ({
  slug,
  storeName,
  category,
  bestOffer,
  couponCodeCount = 0,
  noCodeDealCount = 0,
  verifiedCouponCount = 0,
  customGuide,
}: MoneyPageGuideInput): MoneyPageGuide | undefined => {
  const cleanStoreName = String(storeName || "").replace(/\s+/g, " ").trim();
  if (!cleanStoreName) return undefined;

  const custom = slug ? customMoneyPageGuides[slug] : undefined;
  if (custom) return custom;

  const profile = categoryProfileFor(category);
  const bestOfferText = bestOffer && bestOffer !== "current offers" ? bestOffer : "the strongest current offer";
  const hasCodes = couponCodeCount > 0;
  const hasDeals = noCodeDealCount > 0;
  const shippingNote = cleanNote(customGuide?.shipping_note);
  const returnNote = cleanNote(customGuide?.return_note);
  const stackingNote = cleanNote(customGuide?.stacking_note);
  const saleItemNote = cleanNote(customGuide?.sale_item_note);
  const offerMix = [
    couponCodeCount > 0 ? plural(couponCodeCount, "promo code") : "",
    noCodeDealCount > 0 ? plural(noCodeDealCount, "deal") : "",
  ].filter(Boolean).join(" and ");
  const listingText = offerMix || "current offers";

  return {
    slug: slug || "",
    eyebrow: `${cleanStoreName} savings guide`,
    title: `How to get the best ${cleanStoreName} discount`,
    intro:
      `Use the ${cleanStoreName} offers above as the starting point, then compare the final checkout total after restrictions, shipping, and taxes. DS Review Hub currently lists ${listingText} for ${cleanStoreName}, with ${bestOfferText} shown as the best available discount when applicable.`,
    facts: [
      {
        label: "Best first test",
        value: hasCodes
          ? `Start with a verified or high-value ${cleanStoreName} promo code, then compare it with any automatic sale price.`
          : `Start with the current ${cleanStoreName} no-code deals and confirm whether the savings apply automatically.`,
      },
      {
        label: "Offer mix",
        value: `${cleanStoreName} currently has ${listingText} listed on DS Review Hub.`,
      },
      {
        label: shippingNote ? "Shipping note" : "Category check",
        value: shippingNote || `For this type of store, pay extra attention to ${profile.focus}.`,
      },
      {
        label: "Verification note",
        value: verifiedCouponCount > 0
          ? `${plural(verifiedCouponCount, "offer")} marked verified should still be confirmed at checkout before payment.`
          : "Availability can change quickly, so always confirm the final discount at checkout.",
      },
    ],
    sections: [
      {
        heading: `Which ${cleanStoreName} offer should you try first?`,
        body: hasCodes && hasDeals
          ? `Try the strongest promo code first if your cart includes eligible regular-priced items. Then compare it with the no-code deals above, because an automatic sale can sometimes beat a code depending on what is in your cart.`
          : hasCodes
            ? `Start with the highest-value promo code above, especially if the offer looks storewide or applies to your entire order. If the first code fails, check the next listed code before abandoning the cart.`
            : `Start with the no-code deals above and open the retailer page to confirm whether the lower price or automatic discount appears in cart.`,
        bullets: [
          `Compare the final ${cleanStoreName} checkout total, not only the discount label.`,
          "Remove excluded items or try another listed offer if the first code fails.",
          "Check shipping, taxes, and minimum order rules before payment.",
        ],
      },
      {
        heading: profile.checkHeading,
        body: profile.checkBody,
        bullets: [
          ...profile.checkBullets.slice(0, saleItemNote || stackingNote || returnNote ? 2 : profile.checkBullets.length),
          ...(saleItemNote ? [saleItemNote] : []),
          ...(stackingNote ? [stackingNote] : []),
          ...(returnNote ? [returnNote] : []),
        ],
      },
      {
        heading: `Before you place a ${cleanStoreName} order`,
        body:
          `Keep the coupon list open while you check out, especially if ${cleanStoreName} swaps one promotion for another or removes a discount after cart changes. The retailer checkout page is always the source of truth for the final price.`,
        bullets: [
          "Copy codes exactly as shown, including numbers and special characters.",
          "Recheck the cart after changing quantity, color, size, subscription, or shipping method.",
          "Save the order confirmation in case the discount affects returns or refund value.",
        ],
      },
    ],
    faqs: [
      {
        question: `Does ${cleanStoreName} offer free shipping?`,
        answer:
          shippingNote || `Shipping rules can change by cart value, destination, product type, and promotion. Check the ${cleanStoreName} checkout page for the current free-shipping threshold or delivery fee before ordering.`,
      },
      {
        question: `Can ${cleanStoreName} coupon codes stack?`,
        answer:
          stackingNote || `Most stores allow only one promo code per order unless a specific promotion says otherwise. If ${cleanStoreName} checkout replaces one discount with another, keep the offer that gives the best final total.`,
      },
      {
        question: `Can I use a ${cleanStoreName} coupon on sale items?`,
        answer: saleItemNote || profile.saleItemText.replace(/coupon codes?/i, `${cleanStoreName} coupon codes`),
      },
      {
        question: `What ${cleanStoreName} coupon should I try first?`,
        answer:
          `Start with the highest-value verified promo code when your cart includes eligible items. If the cart is mostly sale or product-specific items, compare that code with the current no-code deals before ordering.`,
      },
      {
        question: `Why is my ${cleanStoreName} promo code not working?`,
        answer:
          `A ${cleanStoreName} promo code may fail if it expired, was entered incorrectly, requires a minimum purchase, excludes items in your cart, or applies only to certain customers. Recheck the offer details and try the next listed code if available.`,
      },
      {
        question: `Can I return an order after using a ${cleanStoreName} promo code?`,
        answer:
          returnNote || `Return eligibility depends on the ${cleanStoreName} return policy and the items purchased. A promo code may affect refund value, so review the retailer return terms before ordering.`,
      },
    ],
  };
};

export const moneyPageGuideForSlug = (slug?: string | null) =>
  slug ? customMoneyPageGuides[slug] : undefined;
