import "server-only";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { z } from "zod";
import { getAuthSettings } from "@/lib/auth/config";
import {
  activeSession,
  issueSession,
  revokeSession,
  SESSION_SECONDS,
} from "@/lib/auth/sessions";

const profileSchema = z.object({ id: z.number().int().positive() });

export const { handlers, auth } = NextAuth(() => {
  const settings = getAuthSettings();
  return {
    secret: settings.secret,
    trustHost: true, // The route wrapper validates the configured origin first.
    useSecureCookies: settings.secure,
    session: { strategy: "jwt", maxAge: SESSION_SECONDS },
    pages: { signIn: "/login", error: "/login" },
    providers: [
      GitHub({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        authorization: { params: { scope: "" } },
        checks: ["state", "pkce"],
        userinfo: {
          url: "https://api.github.com/user",
          async request({ tokens }: { tokens: { access_token?: string } }) {
            if (!tokens.access_token) throw new Error("IDENTITY_UNAVAILABLE");
            const response = await fetch("https://api.github.com/user", {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                Accept: "application/vnd.github+json",
              },
              signal: AbortSignal.timeout(3000),
              cache: "no-store",
              redirect: "error",
            });
            if (!response.ok) throw new Error("IDENTITY_UNAVAILABLE");
            return profileSchema.parse(await response.json());
          },
        },
        profile(profile) {
          return {
            id: String(profileSchema.parse(profile).id),
            name: "Vlastník velínu",
            email: null,
            image: null,
          };
        },
      }),
    ],
    callbacks: {
      signIn({ account, profile }) {
        const parsed = profileSchema.safeParse(profile);
        return (
          account?.provider === "github" &&
          parsed.success &&
          String(parsed.data.id) === settings.ownerId
        );
      },
      jwt({ token, account, profile }) {
        if (account) {
          const id = String(profileSchema.parse(profile).id);
          if (account.provider !== "github" || id !== settings.ownerId)
            return null;
          const session = issueSession(id);
          // Never copy account access/refresh tokens, email or arbitrary JWT fields.
          return {
            sub: id,
            sessionId: session.id,
            validUntil: session.expiresAt,
          };
        }
        return activeSession(token.sessionId, token.sub) ? token : null;
      },
      session({ session, token }) {
        return {
          expires: new Date(Number(token.validUntil)).toISOString(),
          user: { id: token.sub! },
          sessionId: String(token.sessionId),
        };
      },
      redirect({ url }) {
        const destination = new URL(url, settings.origin);
        return destination.origin === settings.origin &&
          ["/login", "/control/github"].includes(destination.pathname)
          ? destination.href
          : `${settings.origin}/control/github`;
      },
    },
    events: {
      signOut(message) {
        if ("token" in message) revokeSession(message.token?.sessionId);
      },
    },
    // Auth errors can contain provider response bodies or token exchange details.
    logger: {
      error() {
        console.error("Authentication failed");
      },
      warn() {},
      debug() {},
    },
  };
});
