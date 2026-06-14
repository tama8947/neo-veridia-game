import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isGameRoute = nextUrl.pathname.startsWith('/lobby') ||
        nextUrl.pathname.startsWith('/room')
      if (isGameRoute && !isLoggedIn) return false
      return true
    },
    session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
  },
}
