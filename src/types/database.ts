export interface Store {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  category: string | null;
  use_code_tips: UseCodeTip[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseCodeTip {
  code: string;
  affiliate_url: string;
  image_url: string;
  preview_image_url: string;
  thumbnail_url: string;
  caption: string;
}

export interface Coupon {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  code: string | null;
  discount_type: string | null;
  discount_value: string | null;
  url: string | null;
  expiry_date: string | null;
  is_active: boolean;
  is_verified: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  stores?: Store;
}

export interface StoreReview {
  id: string;
  store_id: string;
  title: string;
  h1: string | null;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  dek: string | null;
  summary: string;
  verdict: string | null;
  best_for: string[];
  pros: string[];
  cons: string[];
  content_sections: unknown[];
  faqs: unknown[];
  coupon_strategy: Record<string, unknown>;
  primary_coupon_id: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  sources: unknown[];
  research_queries: unknown[];
  title_candidates: unknown[];
  status: "draft" | "published" | "archived";
  generated_by: string;
  model: string | null;
  generated_at: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  stores?: Store;
}

export interface StoreSavingsGuide {
  id: string;
  store_id: string;
  priority: string | null;
  shipping_note: string | null;
  return_note: string | null;
  stacking_note: string | null;
  sale_item_note: string | null;
  reference_urls: unknown[];
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export interface GoogleTag {
  id: string;
  tag_id: string;
  tag_type: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Deal {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  original_price: number | null;
  deal_price: number | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stores?: Store;
}
