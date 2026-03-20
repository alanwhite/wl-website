import { UserStatus } from "@prisma/client";

export type { UserStatus };

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  tierId: string;
  tierLevel: number;
  tierName: string;
  roleIds: string[];
  roleSlugs: string[];
  status: UserStatus;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User {
    tierId: string;
    tierLevel: number;
    tierName: string;
    roleIds: string[];
    roleSlugs: string[];
    status: UserStatus;
  }
}
