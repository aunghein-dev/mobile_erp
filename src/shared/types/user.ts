import type { BusinessInfo } from "./business";

export type OfflineUser = {
  fullName: string;
  accountId: number;
  userImgUrl?: string | null;
  business: BusinessInfo;
  username: string;
  role: string;
  shopId: number;
};

export type UserProfile = {
  id: number;
  username: string;
  role: string;
  fullName: string;
  userImgUrl: string | null;
  business: BusinessInfo;
};

export type Teller = {
  id?: number;
  username: string;
  fullName?: string;
  role: string;
  shopId?: number;
  createdAt?: string;
};
