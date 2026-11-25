// Server only.
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { Resend } from 'resend';

import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { deleteUserFiles } from '@/lib/imagekit';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.EMAIL_FROM ?? 'Restyle <onboarding@resend.dev>',
        to: user.email,
        subject: 'Reset your Restyle password',
        html: `<p>Hi ${user.name},</p><p><a href="${url}">Tap here to set a new password</a>. The link expires in 1 hour.</p><p>If you didn't ask for this, ignore this email.</p>`,
      });
      if (error) console.error('reset email failed', error);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // ponytail: native iOS idToken sign-in only, so the bundle ID is the audience and no
    // client secret is needed. Add a Services ID + secret if Apple sign-in ever goes to web/Android.
    apple: {
      clientId: process.env.APPLE_BUNDLE_ID!,
      clientSecret: '',
    },
  },
  plugins: [expo()],
  trustedOrigins: [
    'homeai://',
    'https://appleid.apple.com',
    ...(process.env.NODE_ENV === 'development' ? ['exp://', 'exp://**'] : []),
  ],
  // Phone sessions live for weeks; don't force a re-login before account deletion.
  session: { freshAge: 0 },
  user: {
    deleteUser: {
      enabled: true,
      // Rows go via ON DELETE CASCADE; files need an explicit delete.
      beforeDelete: async (user) => deleteUserFiles(user.id),
    },
  },
});

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw Response.json({ error: 'Please sign in again.' }, { status: 401 });
  return session.user;
}
