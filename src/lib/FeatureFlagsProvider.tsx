'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { getFeatureFlags, FeatureFlag, FeatureFlagKey } from '@/services/api';

interface FeatureFlagsContextValue {
  flags: FeatureFlag[];
  /** False until the first fetch settles, so UI can avoid flashing the wrong gating. */
  loaded: boolean;
  /** Unknown/not-yet-fetched keys default to enabled — same "kill switch, not opt-in" stance
   *  as the backend's FeatureFlagService.isEnabled(). */
  isEnabled: (key: FeatureFlagKey) => boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: [],
  loaded: false,
  isEnabled: () => true,
  refresh: async () => {},
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setFlags(await getFeatureFlags());
    } catch {
      // Fall back to "everything enabled" if the flags can't be read.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!userLoaded) return;
    if (!isSignedIn) { setLoaded(true); return; }
    refresh();
  }, [userLoaded, isSignedIn, refresh]);

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => flags.find(f => f.key === key)?.enabled ?? true,
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, loaded, isEnabled, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
