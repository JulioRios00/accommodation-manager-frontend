'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Keeps one selection in the URL's query string instead of component state.
 *
 * Pages are client components under the App Router, so they unmount on every
 * navigation and plain `useState` selections are lost. Holding them in the URL
 * means a tab, filter or month survives navigating away and back, a refresh and
 * the Back button, and the resulting link can be shared as-is.
 *
 * Pass `allowed` to constrain the value; anything else in the URL (a typo, a
 * stale bookmark) falls back to `defaultValue` rather than putting the page into
 * a state it can't render.
 *
 * NOTE: callers must sit inside a `<Suspense>` boundary — `useSearchParams`
 * bails out of prerendering, and a static page without one fails the build.
 */
export function useQueryParamState<T extends string>(
  key: string,
  defaultValue: T,
  allowed?: readonly T[],
): [T, (next: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(key);
  const value = useMemo<T>(() => {
    if (raw === null || raw === '') return defaultValue;
    if (allowed && !allowed.includes(raw as T)) return defaultValue;
    return raw as T;
  }, [raw, defaultValue, allowed]);

  const setValue = useCallback(
    (next: T) => {
      // Read the live query string rather than this render's snapshot, so two
      // params changed in quick succession don't overwrite one another.
      const params = new URLSearchParams(
        typeof window === 'undefined' ? searchParams.toString() : window.location.search,
      );
      // Leave the default out of the URL entirely — keeps links short and makes
      // "no params" mean "defaults" rather than something subtly different.
      if (next === defaultValue) params.delete(key);
      else params.set(key, next);

      const qs = params.toString();
      // replace, not push: a filter click shouldn't cost a Back press. scroll:false
      // stops the page jumping to the top each time the grid re-renders.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, key, defaultValue],
  );

  return [value, setValue];
}

/**
 * Restores the last-used query string when the user arrives at a bare URL.
 *
 * The sidebar links are static hrefs (`/payments`), so navigating away and back
 * through the nav lands on a URL with no params and every selection resets —
 * which is the exact round-trip users complain about. This remembers the last
 * query string per page and reinstates it when arriving with none.
 *
 * Only fires once, on mount: afterwards the user clearing filters back to their
 * defaults legitimately produces an empty query string, and re-restoring would
 * fight them. An explicit link with params, a refresh and Back/Forward all keep
 * whatever the URL says, because they aren't bare.
 */
export function useRestoreQueryParams(storageKey: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.toString();
  const restored = useRef(false);
  const key = `queryparams:${storageKey}`;

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (current !== '') return; // arrived with params — they win
    try {
      const saved = localStorage.getItem(key);
      if (saved) router.replace(`${pathname}?${saved}`, { scroll: false });
    } catch {
      // Private mode / blocked storage — just show the defaults.
    }
  }, [current, key, pathname, router]);

  // Remember whatever the URL currently says, including an empty string once the
  // user has genuinely cleared everything back to defaults.
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(key, current);
    } catch {
      // Ignore storage errors.
    }
  }, [current, key]);
}

/**
 * As above, but for a text input: the field stays responsive while the URL is
 * only rewritten once typing settles, so a search doesn't push a navigation per
 * keystroke.
 */
export function useDebouncedQueryParamState(
  key: string,
  defaultValue = '',
  delayMs = 300,
): [string, (next: string) => void] {
  const [urlValue, setUrlValue] = useQueryParamState(key, defaultValue);
  const [draft, setDraft] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  // Adopt the URL's value when it changes from elsewhere (Back/Forward, a pasted
  // link) — but not while our own debounced write is still in flight, or the
  // field would snap back to the previous value mid-typing.
  useEffect(() => {
    if (!pending.current) setDraft(urlValue);
  }, [urlValue]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const set = useCallback(
    (next: string) => {
      setDraft(next);
      pending.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        pending.current = false;
        setUrlValue(next);
      }, delayMs);
    },
    [setUrlValue, delayMs],
  );

  return [draft, set];
}
