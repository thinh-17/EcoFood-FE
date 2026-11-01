import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "click"];
const IDLE_SECONDS = Number(import.meta.env.VITE_IDLE_SECONDS) || 900;
const IDLE_COUNTDOWN_SECONDS = Number(import.meta.env.VITE_IDLE_COUNTDOWN_SECONDS) || 30;

/**
 * Pure client-side inactivity watcher, independent of the token-refresh
 * loop in authStore. Ported from the oke/frontend mockup's idleTimeout.js:
 * once the warning fires, ordinary activity does NOT silently dismiss it —
 * only the dialog's explicit "Continue Session" (continueSession()) does.
 */
export function useIdleTimeout(enabled) {
  const [showDialog, setShowDialog] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(IDLE_COUNTDOWN_SECONDS);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const armTimerRef = useRef(() => {});

  useEffect(() => {
    armTimerRef.current = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        pausedRef.current = true;
        setSecondsLeft(IDLE_COUNTDOWN_SECONDS);
        setShowDialog(true);
      }, IDLE_SECONDS * 1000);
    };
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleActivity = () => {
      if (!pausedRef.current) {
        armTimerRef.current();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));
    armTimerRef.current();

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [enabled]);

  useEffect(() => {
    if (!showDialog || secondsLeft <= 0) {
      return undefined;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [showDialog, secondsLeft]);

  const continueSession = () => {
    pausedRef.current = false;
    setShowDialog(false);
    armTimerRef.current();
  };

  return { showDialog, secondsLeft, continueSession, dismiss: () => setShowDialog(false) };
}
