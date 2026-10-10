import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { normalizeEmail } from "@/lib/account/credentials";
import { findUserIdByEmail } from "@/lib/account/users";
import { getAccountSessionState, type AccountSessionState } from "@/lib/account/state";

type EmailStatus = AccountSessionState["emailStatus"];
import { clientIpFrom, RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";

// Il client riceve `code` in signIn(): la pagina di login mostra un messaggio dedicato.
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = normalizeEmail(credentials?.email);
        if (!email || typeof credentials?.password !== "string" || !credentials.password) return null;

        const limit = await enforceRateLimits("login", [
          { rule: RATE_LIMITS.loginEmail, subject: email },
          { rule: RATE_LIMITS.loginIp, subject: clientIpFrom(request?.headers) },
        ]);
        if (!limit.allowed) throw new RateLimitedSignin();

        // Senza distinzione maiuscole/minuscole: account creati prima della normalizzazione inclusi.
        const userId = await findUserIdByEmail(email);
        const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, plan: user.plan };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (!token.id) return token;

      // Riletto a ogni richiesta: piano ed email aggiornati, account eliminato e
      // sessioni emesse prima di un cambio/reset password non più valide.
      const state = await getAccountSessionState(token.id as string);
      if (!state) return null;
      if (user) {
        token.sv = state.sessionVersion ?? 0;
      } else if (state.sessionVersion !== null && state.sessionVersion !== ((token.sv as number | undefined) ?? 0)) {
        return null;
      }
      token.plan = state.plan === "PRO" ? "PRO" : "FREE";
      token.email = state.email;
      token.emailStatus = state.emailStatus;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.plan) session.user.plan = token.plan as import("@prisma/client").UserPlan;
      session.user.emailStatus = (token.emailStatus as EmailStatus | undefined) ?? "unknown";
      return session;
    },
  },
});
