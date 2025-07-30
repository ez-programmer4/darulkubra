import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: "teacher" | "admin" | "controller" | "registral";
  code?: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.username ||
          !credentials?.password ||
          !credentials?.role
        ) {
          return null;
        }

        let user = null;
        let role = credentials.role;
        let code = "";

        // Check controllers
        if (role === "controller") {
          user = await prisma.wpos_wpdatatable_28.findFirst({
            where: { username: credentials.username },
          });
          code = user?.code || "";
        }
        // Check registrals
        else if (role === "registral") {
          user = await prisma.wpos_wpdatatable_33.findFirst({
            where: { username: credentials.username },
          });
        } else if (role === "teacher") {
          user = await prisma.wpos_wpdatatable_24.findFirst({
            where: { ustazid: credentials.username },
          });
          if (!user) return null;
          const isValid = await compare(credentials.password, user.password);
          if (!isValid) return null;
          return {
            id: user.ustazid,
            name: user.ustazname ?? "",
            username: user.ustazid ?? "",
            role,
          };
        }
        // Check admins
        else if (role === "admin") {
          user = await prisma.admin.findFirst({
            where: { username: credentials.username },
          });
        }

        if (!user) return null;

        // Add a type guard to check if user is an admin and has passcode
        if (user && "passcode" in user) {
          const isValid = await compare(credentials.password, user.passcode);
          if (!isValid) return null;
          // For admin, always use the integer id from the admin table
          return {
            id:
              user.id !== undefined && user.id !== null
                ? user.id.toString()
                : "",
            name: user.name ?? "",
            username: user.username ?? "",
            role: user.role ?? "admin",
            code: (user as any).code ?? "",
          };
        }

        // For registral and controller, use wdt_ID as id
        let userId = "";
        if (
          (role === "registral" || role === "controller") &&
          "wdt_ID" in user &&
          user.wdt_ID !== undefined
        ) {
          userId = user.wdt_ID.toString();
        } else if ("id" in user && user.id !== undefined && user.id !== null) {
          userId = user.id.toString();
        }
        return {
          id: userId,
          name: user.name ?? "",
          username: user.username ?? "",
          role,
          code: code ?? "",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.code = token.code as string | undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.username = user.username;
        token.role = user.role;
        token.code = user.code;
      }
      return token;
    },
  },
};

export async function getSessionUser(req: NextRequest) {
  // getServerSession in app router expects no args, so we use cookies from req
  // but in edge runtime, you may need to use headers/cookies directly
  // Here, we use getServerSession with authOptions
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");
  return session.user;
}
