export type CouponEventType = "show_code" | "open_deal" | "copy_code" | "vote_worked" | "vote_failed";

export interface CouponUsageStats {
  coupon_id: string;
  total_uses: number;
  uses_today: number;
  last_used_at: string | null;
  worked_votes: number;
  failed_votes: number;
}

export interface CouponVerification {
  id: string;
  coupon_id: string;
  verifier_name: string;
  verification_method: string;
  result: "working" | "failed" | "expired" | "unknown";
  note: string | null;
  screenshot_url: string | null;
  verified_at: string;
}

export interface CouponActivityDaily {
  coupon_id: string;
  activity_date: string;
  activity_count: number;
}

export const recordCouponEvent = (_couponId: string | undefined, _eventType: CouponEventType) => Promise.resolve();

export const formatRelativeTime = (value?: string | null, fallback = "No activity yet") => {
  if (!value) return fallback;
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Recently";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

export const computeCouponHealth = ({
  isVerified,
  expiryDate,
  usage,
  verifications,
}: {
  isVerified: boolean;
  expiryDate?: string | null;
  usage?: CouponUsageStats;
  verifications: CouponVerification[];
}) => {
  const isExpired = Boolean(expiryDate && new Date(expiryDate).getTime() < Date.now());

  if (isVerified && !isExpired) return 100;

  let score = isVerified ? 76 : 55;
  const latestVerification = verifications[0]?.verified_at;

  if (latestVerification) {
    const daysSinceVerification = (Date.now() - new Date(latestVerification).getTime()) / 86400000;
    if (daysSinceVerification <= 7) score += 12;
    else if (daysSinceVerification <= 30) score += 8;
    else if (daysSinceVerification <= 90) score += 4;
  }

  if ((usage?.uses_today || 0) > 0) score += Math.min(8, usage!.uses_today * 2);
  if ((usage?.worked_votes || 0) > 0) score += Math.min(8, usage!.worked_votes * 2);
  if ((usage?.failed_votes || 0) > 0) score -= Math.min(35, usage!.failed_votes * 12);

  if ((usage?.uses_today || 0) > 0 && (usage?.failed_votes || 0) === 0 && !isExpired) {
    score = Math.max(score, 96);
  }

  if (isExpired) score -= 35;

  return Math.max(15, Math.min(96, Math.round(score)));
};
