import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'

// Validate Google OAuth credentials - support both naming conventions
const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET

if (!googleClientId || !googleClientSecret) {
  console.warn('⚠️  Google OAuth credentials are missing. Google sign-in will not work.')
  console.warn('   Please set GOOGLE_CLIENT_ID/GOOGLE_ID and GOOGLE_CLIENT_SECRET/GOOGLE_SECRET in your .env file')
} else {
  console.log('✅ Google OAuth credentials found')
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('Invalid credentials')
        }

        // Check if user has a password (email/password user)
        if (!user.password) {
          throw new Error('Please sign in with your OAuth provider or set a password')
        }

        const isValid = await verifyPassword(credentials.password, user.password)

        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
    // Only add Google provider if credentials are available
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign in
      if (account?.provider === 'google') {
        // Check if email is available
        if (!user.email) {
          console.error('Google OAuth: No email provided by Google')
          return false
        }

        try {
          // Check if user exists
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          })

          // If user doesn't exist, create them
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || (profile as any)?.name || 'Google User',
                // OAuth users don't need a password - leave it null
                password: null,
                role: 'USER',
              },
            })
          }

          // Update user object with database user info
          user.id = dbUser.id
          ;(user as any).role = dbUser.role

          return true
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }

      // For credentials provider, always allow
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'USER'
        token.email = user.email // Store email in token for reliability
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as UserRole) || 'USER'
        // Ensure email is set (fallback to token.email if session.email is missing)
        if (!session.user.email && (token.email as string)) {
          session.user.email = token.email as string
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

