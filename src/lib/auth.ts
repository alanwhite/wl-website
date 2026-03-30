import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import Passkey from "next-auth/providers/passkey";
import { prisma } from "./prisma";

const providers = [];

if (process.env.AUTH_GITHUB_ID) {
  providers.push(GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    allowDangerousEmailAccountLinking: true,
  }));
}

if (process.env.AUTH_GOOGLE_ID) {
  providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    allowDangerousEmailAccountLinking: true,
  }));
}

if (process.env.AUTH_FACEBOOK_ID) {
  providers.push(Facebook({
    clientId: process.env.AUTH_FACEBOOK_ID,
    clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    allowDangerousEmailAccountLinking: true,
  }));
}

// Test credentials provider — gated behind AUTH_CREDENTIALS_TEST=true
const credentialsEnabled = process.env.AUTH_CREDENTIALS_TEST === "true";

if (credentialsEnabled) {
  providers.push(Credentials({
    name: "Test Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (credentials?.password !== "test") return null;

      const email = credentials.email as string;
      if (!email) return null;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
        include: { userRoles: { include: { role: true } } },
      });
      if (!user) {
        // Get the pending tier for new users
        const pendingTier = await prisma.membershipTier.findFirst({ where: { level: 0, isSystem: true } });
        if (!pendingTier) throw new Error("System tier not found");

        user = await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0],
            tierId: pendingTier.id,
            tierLevel: pendingTier.level,
            tierName: pendingTier.name,
          },
          include: { userRoles: { include: { role: true } } },
        });
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tierId: user.tierId,
        tierLevel: user.tierLevel,
        tierName: user.tierName,
        roleIds: user.userRoles.map((ur) => ur.roleId),
        roleSlugs: user.userRoles.map((ur) => ur.role.slug),
        status: user.status,
      };
    },
  }));
}

// Passkey provider (requires database sessions, so only enabled in production mode)
const passkeysEnabled = !credentialsEnabled;
if (passkeysEnabled) {
  providers.push(Passkey);
}

// Credentials provider requires JWT strategy
const sessionStrategy = credentialsEnabled ? "jwt" as const : "database" as const;

async function fetchUserTierAndRoles(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tierId: true,
      tierLevel: true,
      tierName: true,
      status: true,
      userRoles: { select: { roleId: true, role: { select: { slug: true } } } },
    },
  });
  if (!dbUser) return null;
  return {
    tierId: dbUser.tierId,
    tierLevel: dbUser.tierLevel,
    tierName: dbUser.tierName,
    status: dbUser.status,
    roleIds: dbUser.userRoles.map((ur) => ur.roleId),
    roleSlugs: dbUser.userRoles.map((ur) => ur.role.slug),
  };
}

// Wrap PrismaAdapter to inject default tier on user creation
const baseAdapter = PrismaAdapter(prisma);
const adapter = {
  ...baseAdapter,
  async createUser(data: any) {
    const pendingTier = await prisma.membershipTier.findFirst({
      where: { level: 0, isSystem: true },
    });
    if (!pendingTier) throw new Error("System pending tier not found");

    return prisma.user.create({
      data: {
        ...data,
        tierId: pendingTier.id,
        tierLevel: pendingTier.level,
        tierName: pendingTier.name,
      },
    });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: adapter as any,
  providers,
  session: { strategy: sessionStrategy },
  pages: {
    signIn: "/login",
  },
  experimental: { enableWebAuthn: passkeysEnabled },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Initial sign-in: store user data in token
        token.id = user.id;
        token.tierId = (user as any).tierId;
        token.tierLevel = (user as any).tierLevel;
        token.tierName = (user as any).tierName;
        token.roleIds = (user as any).roleIds;
        token.roleSlugs = (user as any).roleSlugs;
        token.status = (user as any).status;
      }
      if (trigger === "update") {
        const data = await fetchUserTierAndRoles(token.id as string);
        if (data) {
          token.tierId = data.tierId;
          token.tierLevel = data.tierLevel;
          token.tierName = data.tierName;
          token.roleIds = data.roleIds;
          token.roleSlugs = data.roleSlugs;
          token.status = data.status;
        }
      }
      return token;
    },
    async session({ session, user, token }) {
      if (token) {
        // JWT mode: read from token (edge-safe, no DB call)
        session.user.id = token.id as string;
        session.user.tierId = token.tierId as string;
        session.user.tierLevel = token.tierLevel as number;
        session.user.tierName = token.tierName as string;
        session.user.roleIds = (token.roleIds as string[]) ?? [];
        session.user.roleSlugs = (token.roleSlugs as string[]) ?? [];
        session.user.status = token.status as any;
      } else if (user) {
        // DB mode (OAuth): read from adapter user
        const data = await fetchUserTierAndRoles(user.id);
        if (data) {
          session.user.id = user.id;
          session.user.tierId = data.tierId;
          session.user.tierLevel = data.tierLevel;
          session.user.tierName = data.tierName;
          session.user.roleIds = data.roleIds;
          session.user.roleSlugs = data.roleSlugs;
          session.user.status = data.status;
        }
      }
      return session;
    },
  },
});
