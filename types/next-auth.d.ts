import { UserPlan } from "@prisma/client";

declare module "next-auth" {
  interface User {
    plan?: UserPlan;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      plan?: UserPlan;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
