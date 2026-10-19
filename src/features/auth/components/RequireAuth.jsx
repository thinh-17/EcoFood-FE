import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { useAuthStore } from "../store/authStore.js";
import { useIdleTimeout } from "../hooks/useIdleTimeout.js";
import { SessionTimeoutDialog } from "./SessionTimeoutDialog.jsx";

/**
 * Route guard — re-runs the two-layer auth check on every navigation into a
 * protected route (not just on first page load), mirroring the oke/frontend
 * mockup's RequireAuth. Unlike the mockup (which bounces to its own login
 * form), there is no login page here: an unauthenticated user is redirected
 * straight to Keycloak, same as DCMP's handleWhenNotAuthenticated().
 */
export function RequireAuth({ children }) {
  const location = useLocation();
  const status = useAuthStore((s) => s.status);
  const isValid = useAuthStore((s) => s.isValid);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const startLogin = useAuthStore((s) => s.startLogin);
  const logout = useAuthStore((s) => s.logout);
  const redirectStarted = useRef(false);

  const idle = useIdleTimeout(status === "authenticated");

  useEffect(() => {
    if (isValid()) {
      return undefined;
    }

    let cancelled = false;
    checkAuth().then((result) => {
      if (cancelled || result.isAuth || redirectStarted.current) {
        return;
      }
      redirectStarted.current = true;
      startLogin();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!isValid()) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Đang chuyển hướng đến trang đăng nhập…
      </div>
    );
  }

  return (
    <>
      {children}
      {idle.showDialog && (
        <SessionTimeoutDialog
          secondsLeft={idle.secondsLeft}
          onContinue={idle.continueSession}
          onLogout={() => {
            idle.dismiss();
            logout();
          }}
        />
      )}
    </>
  );
}
