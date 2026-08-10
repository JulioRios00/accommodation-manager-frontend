'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { getRolePermissions } from '@/services/api';
import type { PermissionMatrix } from '@/lib/permissions';

interface PermissionsContextValue {
  /** Stored overrides only — defaults are applied by lib/permissions. */
  overrides: PermissionMatrix;
  /** False until the first fetch settles, so UI can avoid flashing the wrong gating. */
  loaded: boolean;
  /** Replaces the cached overrides after a save, without a round trip. */
  setOverrides: (matrix: PermissionMatrix) => void;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  overrides: {},
  loaded: false,
  setOverrides: () => {},
  refresh: async () => {},
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const [overrides, setOverrides] = useState<PermissionMatrix>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setOverrides(await getRolePermissions());
    } catch {
      // Fall back to built-in defaults if the matrix can't be read.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!userLoaded) return;
    if (!isSignedIn) { setLoaded(true); return; }
    refresh();
  }, [userLoaded, isSignedIn, refresh]);

  return (
    <PermissionsContext.Provider value={{ overrides, loaded, setOverrides, refresh }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
