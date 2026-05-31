import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            headers: { 'Content-Type': 'application/json' },
          });

          const data = await res.json();

          if (res.ok && data?.access_token && data?.user) {
            return {
              id: data.user.id,
              name: data.user.displayName || data.user.email.split('@')[0],
              email: data.user.email,
              role: data.user.role,
              accessToken: data.access_token,
            };
          }
          
          if (data?.message) {
            const errorMsg = Array.isArray(data.message) ? data.message[0] : data.message;
            throw new Error(errorMsg);
          }
          return null;
        } catch (error: unknown) {
          throw new Error(error instanceof Error ? error.message : 'Authentication failed');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        const extUser = user as { role?: string; accessToken?: string; id: string };
        token.role = extUser.role;
        token.id = extUser.id;
        token.accessToken = extUser.accessToken;
      }

      // Sync Google OAuth with NestJS Backend
      if (account && account.provider === 'google') {
        try {
          const cookieStore = await cookies();
          const oauthRole = cookieStore.get('oauth_role')?.value || 'consumer';

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const res = await fetch(`${apiUrl}/auth/social-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: token.email,
              displayName: token.name,
              avatarUrl: token.picture,
              role: oauthRole,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            token.accessToken = data.access_token;
            token.role = data.user.role;
            token.id = data.user.id;
          } else {
            console.error("Backend social login returned status:", res.status);
          }
        } catch (error) {
          console.error("Failed to sync Google user with backend:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { role?: string; id?: string };
        u.role = token.role as string;
        u.id = token.id as string;
        (session as { accessToken?: unknown }).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
