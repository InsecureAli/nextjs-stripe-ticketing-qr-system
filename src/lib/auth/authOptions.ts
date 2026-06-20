import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/db/mongoose";
import User from "@/lib/models/User";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log("\n==================================");
        console.log("🔐 authorize() CALLED");
        console.log("==================================");
        console.log("Email:", credentials?.email);
        console.log("Password length:", credentials?.password?.length);

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        try {
          await connectToDatabase();
          console.log("✅ DB connected");

          const emailToSearch = credentials.email.toLowerCase().trim();
          console.log("🔍 Looking for:", emailToSearch);

          const user = await User.findOne({
            email: emailToSearch,
          }).select("+password");

          console.log("👤 User found:", user ? "YES" : "NO");

          if (!user) {
            console.log("❌ User not found");
            return null;
          }

          console.log("🔑 Password field exists:", !!user.password);
          console.log("🔑 Hash preview:", user.password?.substring(0, 15));

          if (!user.password) {
            console.log("❌ No password field on user document");
            return null;
          }

          const isValid = await user.comparePassword(credentials.password);
          console.log("🔐 Password match:", isValid);

          if (!isValid) {
            console.log("❌ Wrong password");
            return null;
          }

          console.log("✅ SUCCESS — returning user");
          console.log("==================================\n");

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };

        } catch (error) {
          console.log("❌ EXCEPTION:");
          console.error(error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};