export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface BlogDepthContext {
  storeName?: string | null;
  storeSlug?: string | null;
  codeCount?: number | null;
  dealCount?: number | null;
  bestOffer?: string | null;
  currentYear?: number | null;
}

export const cleanBlogText = (value: unknown, maxLength = 700): string => {
  const text = String(value ?? "")
    .replace(/\[coupon\s+[^\]]+\]/gi, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[`*_>#]/g, " ")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength - 3).trim();
  return `${clipped.replace(/\s+\S*$/, "")}...`;
};

export const blogContentWordCount = (value: unknown): number =>
  String(value ?? "")
    .replace(/\[coupon\s+[^\]]+\]/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#>*_[\]()`"{}]/g, " ")
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .length;

export const blogContentSectionCount = (value: unknown): number =>
  (String(value ?? "").match(/^#{2,3}\s+\S.+$/gm) || []).length;

const plain = (value: unknown, fallback = ""): string => cleanBlogText(value, 120) || fallback;

const plural = (count: number, singular: string, pluralValue = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralValue}`;

export const buildBlogDepthSupplement = (content: unknown, context: BlogDepthContext = {}): string => {
  const source = String(content ?? "");
  if (blogContentWordCount(source) >= 1600 && blogContentSectionCount(source) >= 8) return "";

  const storeName = plain(context.storeName, "this store");
  const currentYear = context.currentYear || new Date().getFullYear();
  const codeCount = Math.max(0, Number(context.codeCount || 0));
  const dealCount = Math.max(0, Number(context.dealCount || 0));
  const bestOffer = plain(context.bestOffer, "current offers");
  const offerSummary = codeCount || dealCount
    ? `DS Review Hub currently tracks ${plural(codeCount, "coupon code")} and ${plural(dealCount, "deal")} for ${storeName}, with the best listed value summarized as ${bestOffer}.`
    : `DS Review Hub tracks current ${storeName} coupon codes, promo codes, and no-code deals when they are available.`;

  return [
    `## How DS Review Hub Reviews ${storeName} Offers`,
    `Our ${currentYear} ${storeName} review process starts with the live offer list, coupon wording, merchant links, and available verification notes. The goal is not just to repeat a discount headline, but to help shoppers understand whether a ${storeName} coupon code is likely to fit their exact cart. ${offerSummary} Because retailers can change exclusions quickly, DS Review Hub keeps policy language cautious and recommends checking the final merchant checkout page before ordering.`,
    `## Coupon Troubleshooting Before Checkout`,
    `If a ${storeName} promo code does not apply, check the cart details before assuming the offer is expired. Many retailers exclude sale items, bundles, subscriptions, gift cards, limited releases, or products that already have automatic markdowns. A code can also be valid only for first-time customers, selected categories, or orders above a minimum subtotal. The safest workflow is to copy the DS Review Hub code exactly, paste it into the checkout discount field, and confirm that the order total changes before entering payment details.`,
    `## Shipping, Returns, and Policy Checks`,
    `Coupon savings are useful only if the final order still makes sense after shipping fees, delivery timing, return shipping, restocking rules, and final-sale restrictions. Before buying from ${storeName}, review the retailer's current shipping and return pages or the checkout summary. This is especially important for fashion, beauty, health, electronics, and specialty purchases where sizing, compatibility, shade matching, or product freshness can affect satisfaction. DS Review Hub does not invent merchant policies, so shoppers should treat this guide as a decision aid and verify final terms directly with the store.`,
    `## When to Wait for a Better Deal`,
    `${storeName} may be worth skipping temporarily if your cart contains mostly excluded items, if the discount is smaller than the shipping cost, or if you are unsure about return eligibility. In those cases, compare no-code deals against code-based discounts, watch for seasonal sales, and recheck DS Review Hub before checkout. The best deal is the one that lowers the final paid total on the exact items you planned to buy, not just the offer with the largest headline percentage.`,
    `## Final Buying Checklist`,
    `Before placing an order, confirm four things: the product matches your needs, the coupon or deal applies to your cart, the shipping and return terms are acceptable, and the final total still looks competitive. If one ${storeName} code fails, return to the DS Review Hub store page and compare the next available offer instead of forcing a single promo code. This simple check helps avoid expired codes, excluded products, and impulse purchases that looked stronger in the headline than they do at checkout.`,
  ].join("\n\n");
};

export const ensureBlogContentDepth = (content: unknown, context: BlogDepthContext = {}): string => {
  const source = String(content ?? "").trim();
  const supplement = buildBlogDepthSupplement(source, context);
  return supplement ? `${source}\n\n${supplement}`.trim() : source;
};

const explicitFaqItems = (value: unknown): BlogFaqItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const question = cleanBlogText(record.question ?? record.q, 180);
      const answer = cleanBlogText(record.answer ?? record.a, 700);
      return question && answer ? { question, answer } : null;
    })
    .filter(Boolean) as BlogFaqItem[];
};

const isFaqHeading = (value: string) =>
  /\b(faq|faqs|frequently asked questions?)\b/i.test(cleanBlogText(value, 120));

const isQuestionLine = (value: string) => {
  const text = cleanBlogText(value, 220).replace(/^q:\s*/i, "");
  return text.endsWith("?") && text.length >= 12 && text.length <= 180;
};

const pushFaq = (items: BlogFaqItem[], question: string, answerLines: string[]) => {
  const cleanQuestion = cleanBlogText(question.replace(/^q:\s*/i, ""), 180);
  const cleanAnswer = cleanBlogText(answerLines.join(" "), 700);
  if (!cleanQuestion || !cleanAnswer) return;
  if (!cleanQuestion.endsWith("?")) return;
  if (items.some((item) => item.question.toLowerCase() === cleanQuestion.toLowerCase())) return;
  items.push({ question: cleanQuestion, answer: cleanAnswer });
};

export const extractBlogFaqItems = (content: unknown, faqs?: unknown, maxItems = 8): BlogFaqItem[] => {
  const explicit = explicitFaqItems(faqs);
  if (explicit.length) return explicit.slice(0, maxItems);

  const lines = String(content ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const items: BlogFaqItem[] = [];
  let inFaqSection = false;
  let currentQuestion = "";
  let answerLines: string[] = [];

  for (const rawLine of lines) {
    if (!rawLine) continue;

    const headingMatch = rawLine.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[2].trim();

      if (isFaqHeading(headingText) && !isQuestionLine(headingText)) {
        pushFaq(items, currentQuestion, answerLines);
        inFaqSection = true;
        currentQuestion = "";
        answerLines = [];
        continue;
      }

      if (inFaqSection && isQuestionLine(headingText)) {
        pushFaq(items, currentQuestion, answerLines);
        currentQuestion = headingText;
        answerLines = [];
        continue;
      }

      if (inFaqSection && headingMatch[1].length <= 2 && !isQuestionLine(headingText)) {
        pushFaq(items, currentQuestion, answerLines);
        break;
      }
    }

    if (!inFaqSection) continue;

    const boldQuestionMatch = rawLine.match(/^\*\*([^*?]+\?)\*\*:?\s*(.*)$/);
    if (boldQuestionMatch) {
      pushFaq(items, currentQuestion, answerLines);
      currentQuestion = boldQuestionMatch[1];
      answerLines = boldQuestionMatch[2] ? [boldQuestionMatch[2]] : [];
      continue;
    }

    if (isQuestionLine(rawLine)) {
      pushFaq(items, currentQuestion, answerLines);
      currentQuestion = rawLine;
      answerLines = [];
      continue;
    }

    if (currentQuestion) answerLines.push(rawLine);
  }

  pushFaq(items, currentQuestion, answerLines);
  return items.slice(0, maxItems);
};
