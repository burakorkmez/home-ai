// FAKE auth client. Mirrors the Better Auth client surface (useSession, signIn.email,
// signIn.social, signUp.email, signOut, deleteUser, requestPasswordReset) so the
// real `createAuthClient({ plugins: [expoClient(...)] })` can replace it later.
import { useSyncExternalStore } from 'react';

import { resetFakeData } from '@/lib/api';

type User = { id: string; name: string; email: string };
type Session = { user: User };
type Result<T = null> = { data: T; error: null } | { data: null; error: { message: string } };

let session: Session | null = null;
const listeners = new Set<() => void>();
const setSession = (s: Session | null) => {
  session = s;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const wait = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const fail = (message: string) => ({ data: null, error: { message } }) as const;
const nameFromEmail = (email: string) => {
  const n = email.split('@')[0].split(/[._-]/)[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export const authClient = {
  useSession() {
    const data = useSyncExternalStore(subscribe, () => session, () => null);
    return { data, isPending: false };
  },
  signIn: {
    async email({ email, password }: { email: string; password: string }): Promise<Result<Session>> {
      await wait();
      if (password.length < 8) return fail('Invalid email or password');
      setSession({ user: { id: 'u_1', name: nameFromEmail(email), email } });
      return { data: session!, error: null };
    },
    async social({ provider }: { provider: 'google' | 'apple' }): Promise<Result<Session>> {
      await wait(1200);
      setSession({ user: { id: 'u_1', name: 'Alex', email: provider === 'apple' ? 'alex@privaterelay.appleid.com' : 'alex@gmail.com' } });
      return { data: session!, error: null };
    },
  },
  signUp: {
    async email({ name, email, password }: { name: string; email: string; password: string }): Promise<Result<Session>> {
      await wait();
      if (password.length < 8) return fail('Password must be at least 8 characters');
      setSession({ user: { id: 'u_1', name, email } });
      return { data: session!, error: null };
    },
  },
  async requestPasswordReset(_: { email: string }): Promise<Result> {
    await wait();
    return { data: null, error: null };
  },
  async signOut(): Promise<Result> {
    await wait(400);
    setSession(null);
    return { data: null, error: null };
  },
  async deleteUser(): Promise<Result> {
    await wait(1200);
    resetFakeData();
    setSession(null);
    return { data: null, error: null };
  },
};
