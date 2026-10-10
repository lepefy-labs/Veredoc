import { UserPlan } from "@prisma/client";

type EmailStatus = "verified" | "unverified" | "legacy" | "unknown";

declare module "next-auth" {
  interface User {
    plan?: UserPlan;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      plan?: UserPlan;
      emailStatus?: EmailStatus;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: UserPlan;
    sv?: number;
    emailStatus?: EmailStatus;
  }
}
