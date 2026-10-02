import { useCallback, useEffect, useRef, useState } from 'react';

export const PASSWORD_IDLE_MS = 1100;

// This decorative interaction only receives activity, never password contents.
export function usePasswordGuard() {
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setTyping(false);
  }, []);
  const active = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setTyping(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setTyping(false);
    }, PASSWORD_IDLE_MS);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { typing, active, stop };
}
