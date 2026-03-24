import { NextAuthOptions, getServerSession as nextAuthGetServerSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      const allowedEmails = process.env.ALLOWED_EMAIL;

      if (allowedEmails) {
        const emailList = allowedEmails.split(",").map((e) => e.trim().toLowerCase());
        if (!user.email || !emailList.includes(user.email.toLowerCase())) {
          return "/login?error=AccessDenied";
        }
      }

      // Store Google access/refresh tokens in the User model
      if (account?.provider === "google" && user.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              googleAccessToken: account.access_token ?? null,
              googleRefreshToken: account.refresh_token ?? null,
            },
          });
        } catch {
          // User may not exist yet on first sign-in; the adapter will create it
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
};

export async function getAuthSession() {
  return nextAuthGetServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user as {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
}

export async function getCurrentUser() {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      settings: true,
      courseProgress: true,
    },
  });

  return user;
}
