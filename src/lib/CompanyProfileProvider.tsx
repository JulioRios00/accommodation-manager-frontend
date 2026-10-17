'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { getCompanyProfile, CompanyProfile } from '@/services/api';

export const DEFAULT_APP_NAME = 'AccomManager';

interface CompanyProfileContextValue {
  appName: string;
  logoDataUrl: string | null;
  /** False until the first fetch settles, so the shell can avoid flashing the
   *  default name over a configured one. */
  loaded: boolean;
  /** Updates the cached branding after a save, without a round trip. */
  setProfile: (profile: CompanyProfile) => void;
  refresh: () => Promise<void>;
}

const CompanyProfileContext = createContext<CompanyProfileContextValue>({
  appName: DEFAULT_APP_NAME,
  logoDataUrl: null,
  loaded: false,
  setProfile: () => {},
  refresh: async () => {},
});

export function CompanyProfileProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const [appName, setAppName] = useState(DEFAULT_APP_NAME);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((profile: CompanyProfile) => {
    setAppName(profile.appName || DEFAULT_APP_NAME);
    setLogoDataUrl(profile.logoDataUrl);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await getCompanyProfile());
    } catch {
      // Branding is cosmetic — fall back to the built-in name rather than
      // blocking the shell if the request fails.
    } finally {
      setLoaded(true);
    }
  }, [apply]);

  useEffect(() => {
    if (!userLoaded) return;
    if (!isSignedIn) { setLoaded(true); return; }
    refresh();
  }, [userLoaded, isSignedIn, refresh]);

  return (
    <CompanyProfileContext.Provider value={{ appName, logoDataUrl, loaded, setProfile: apply, refresh }}>
      {children}
    </CompanyProfileContext.Provider>
  );
}

export function useCompanyProfile() {
  return useContext(CompanyProfileContext);
}
