import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string;
      name: string;
      username: string;
      role: string;
      code?: string;
    };
  }

  interface User {
    id: string;
    email?: string;
    name: string;
    username: string;
    role: string;
    code?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    username: string;
    role: string;
    code?: string;
  }
}
