import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '../../../../../lib/prisma'

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as any).id = user.id
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Create or update profile in our custom profiles table
          await prisma.profile.upsert({
            where: { email: user.email! },
            update: {
              email: user.email!,
            },
            create: {
              email: user.email!,
              walletAddress: '', // Will be set when user connects wallet
            },
          })
        } catch (error) {
          console.error('Error creating profile:', error)
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'database',
  },
})

export { handler as GET, handler as POST }
