import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/** Direct links and refreshed pages may have no in-app navigation history. */
export function useBackNavigation(fallback: Href = '/explore') {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
