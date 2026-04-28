import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient, ServerApiVersion } from "mongodb"
import connectDB from "./mongodb"
import User from "@/models/User"
import { verifyPassword } from "./auth"

type AuthUserFields = {
  plan?: string
  isVerified?: boolean
  agentsCreated?: number
}

type SessionUserFields = {
  id?: string
  plan?: string
  isVerified?: boolean
  agentsCreated?: number
}

function logAuthError(context: string, error: unknown) {
  console.error(context, {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error)
  })
}

// Create MongoDB client for NextAuth adapter
const client = new MongoClient(process.env.MONGODB_URI!, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(client),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          await connectDB()

          const user = await User.findOne({ email: credentials.email })
          if (!user) {
            return null
          }

          const isPasswordValid = await verifyPassword(credentials.password, user.password)
          if (!isPasswordValid) {
            return null
          }

          // Update last login
          user.lastLogin = new Date()
          await user.save()

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.fullName,
            image: null,
            plan: user.plan,
            isVerified: user.isVerified,
            agentsCreated: user.agentsCreated
          }
        } catch (error) {
          logAuthError("Auth error", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          await connectDB()

          // Check if user already exists in our custom User model
          let existingUser = await User.findOne({ email: user.email })

          if (!existingUser) {
            // Create new user for OAuth
            existingUser = await User.create({
              fullName: user.name || profile?.name || "Unknown User",
              email: user.email,
              password: "oauth-user", // Placeholder password for OAuth users
              isVerified: true, // OAuth users are considered verified
              plan: "starter"
            })
          }

          // Update last login
          existingUser.lastLogin = new Date()
          await existingUser.save()

          return true
        } catch (error) {
          logAuthError("OAuth sign in error", error)
          return true // Allow sign in even if our custom user creation fails
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Get user data from our custom User model for OAuth users
        if (account?.provider === "google" || account?.provider === "github") {
          try {
            await connectDB()
            const dbUser = await User.findOne({ email: user.email })
            if (dbUser) {
              token.plan = dbUser.plan
              token.isVerified = dbUser.isVerified
              token.agentsCreated = dbUser.agentsCreated
            }
          } catch (error) {
            logAuthError("JWT callback error", error)
            // Set defaults if database query fails
            token.plan = "starter"
            token.isVerified = true
            token.agentsCreated = 0
          }
        } else {
          // For credentials provider
          const authUser = user as AuthUserFields
          token.plan = authUser.plan
          token.isVerified = authUser.isVerified
          token.agentsCreated = authUser.agentsCreated
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & SessionUserFields
        sessionUser.id = token.sub!
        sessionUser.plan = (token.plan as string) || "starter"
        sessionUser.isVerified = (token.isVerified as boolean) || true
        sessionUser.agentsCreated = (token.agentsCreated as number) || 0
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/login" // Redirect errors to login page
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false
}
