// Live "designs left today" via Neon Realtime: the count updates the moment a design is saved,
// on every signed-in device, without refetching.
import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { DAILY_LIMIT, request } from '@/lib/api';

type UsedRow = { used: number };

const client = createRealtimeClient({ url: process.env.EXPO_PUBLIC_NEON_REALTIME_URL! });
const RemainingContext = createContext<number | null>(null);

/** null until the first live result arrives (or if Realtime is unreachable; the server still enforces the quota). */
export const useRemainingToday = () => useContext(RemainingContext);

const utcDay = () => new Date().toISOString().slice(0, 10);
const seal = (day: string) => request<SealedLiveQuery<UsedRow>>('/api/quota/live', { method: 'POST', body: JSON.stringify({ day }) });

export function QuotaProvider({ children }: { children: ReactNode }) {
  const [day, setDay] = useState(utcDay);
  const [sealed, setSealed] = useState<{ day: string; query: SealedLiveQuery<UsedRow> } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    seal(day).then((query) => !cancelled && setSealed({ day, query }), () => {});
    // The quota resets at 00:00 UTC: switch to the new day's query then.
    const now = new Date();
    const timer = setTimeout(() => setDay(utcDay()), Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime() + 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [day]);

  return (
    <RealtimeProvider client={client}>
      <RemainingContext.Provider value={remaining}>
        {sealed && <LiveCount key={sealed.day} sealed={sealed.query} day={sealed.day} onRemaining={setRemaining} />}
        {children}
      </RemainingContext.Provider>
    </RealtimeProvider>
  );
}

function LiveCount({ sealed, day, onRemaining }: { sealed: SealedLiveQuery<UsedRow>; day: string; onRemaining: (n: number) => void }) {
  const { data } = useLiveQuery(sealed, { refreshQuery: () => seal(day) });
  const used = data?.[0]?.used;
  useEffect(() => {
    if (used !== undefined) onRemaining(Math.max(0, DAILY_LIMIT - used));
  }, [used, onRemaining]);
  return null;
}
