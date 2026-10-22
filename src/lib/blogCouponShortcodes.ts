export type BlogCouponShortcode = {
  raw: string;
  storeSlug: string;
  code?: string;
  label?: string;
};

export type BlogContentPart =
  | { type: "markdown"; value: string }
  | { type: "coupon"; shortcode: BlogCouponShortcode };

const COUPON_SHORTCODE_RE = /\[coupon\s+([^\]]+)\]/gi;
const ATTR_RE = /([a-zA-Z_][\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const parseCouponShortcode = (raw: string): BlogCouponShortcode | null => {
  const match = raw.match(/^\[coupon\s+([^\]]+)\]$/i);
  if (!match) return null;

  const attrs: Record<string, string> = {};
  let attrMatch: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((attrMatch = ATTR_RE.exec(match[1])) !== null) {
    attrs[attrMatch[1].toLowerCase()] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
  }

  const storeSlug = normalizeSlug(attrs.store || attrs.store_slug || attrs.slug || "");
  if (!storeSlug) return null;

  return {
    raw,
    storeSlug,
    code: attrs.code?.trim(),
    label: attrs.label?.trim(),
  };
};

export const extractCouponShortcodes = (content: string): BlogCouponShortcode[] => {
  const shortcodes: BlogCouponShortcode[] = [];
  let match: RegExpExecArray | null;
  COUPON_SHORTCODE_RE.lastIndex = 0;

  while ((match = COUPON_SHORTCODE_RE.exec(content || "")) !== null) {
    const shortcode = parseCouponShortcode(match[0]);
    if (shortcode) shortcodes.push(shortcode);
  }

  return shortcodes;
};

export const splitBlogContent = (content: string): BlogContentPart[] => {
  const parts: BlogContentPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  COUPON_SHORTCODE_RE.lastIndex = 0;

  while ((match = COUPON_SHORTCODE_RE.exec(content || "")) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) parts.push({ type: "markdown", value: before });

    const shortcode = parseCouponShortcode(match[0]);
    if (shortcode) {
      parts.push({ type: "coupon", shortcode });
    } else {
      parts.push({ type: "markdown", value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  const after = content.slice(lastIndex);
  if (after) parts.push({ type: "markdown", value: after });

  return parts;
};

export const shortcodeKey = (shortcode: BlogCouponShortcode) =>
  `${shortcode.storeSlug}:${String(shortcode.code || "").trim().toUpperCase()}`;
