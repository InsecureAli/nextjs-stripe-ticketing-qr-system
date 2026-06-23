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

  // CRITICAL: Trust the proxy headers from ngrok
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",   // ← allows cross-origin (needed for ngrok)
        path: "/",
        secure: true,       // ← required when sameSite is "none"
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
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
        console.log("Email:", credentials?.email);
        console.log("==================================");

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        try {
          await connectToDatabase();
          console.log("✅ DB connected");

          const user = await User.findOne({
            email: credentials.email.toLowerCase().trim(),
          }).select("+password");

          console.log("👤 User found:", user ? "YES" : "NO");

          if (!user) return null;
          if (!user.password) return null;

          const isValid = await user.comparePassword(credentials.password);
          console.log("🔐 Password match:", isValid);

          if (!isValid) return null;

          console.log("✅ Login SUCCESS");

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("❌ Auth error:", error);
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