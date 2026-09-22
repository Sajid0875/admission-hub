/**
 * Marketing Asset Domain Types
 */

export type MarketingAssetType =
  | "poster"
  | "banner"
  | "video"
  | "reel"
  | "caption"
  | "whatsapp_template"
  | "brochure"
  | "testimonial";

export type MarketingAssetStatus = "active" | "inactive" | "archived";

export interface MarketingAsset {
  id: string;
  title: string;
  type: MarketingAssetType;
  fileUrl: string;
  thumbnailUrl?: string;
  language: string;
  courseId?: string;
  status: MarketingAssetStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMarketingAssetPayload {
  title: string;
  type: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  language?: string;
  courseId?: string | null;
  status?: string;
}
