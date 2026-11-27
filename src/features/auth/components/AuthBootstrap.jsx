import { useEffect, useRef, useState } from "react";
import { LoadingPage } from "../../../pages/LoadingPage/LoadingPage.jsx";
import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";

import { useAuthStore } from "../store/authStore.js";

/** Gates rendering until the tenant is resolved and the initial auth check runs. */
export function AuthBootstrap({ children }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const error = useAuthStore((s) => s.error);
  const [ready, setReady] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    bootstrap().finally(() => setReady(true));
  }, [bootstrap]);

  if (!ready) {
    return <LoadingPage fullscreen />;
  }

  if (error) {
    return (
      <FeedbackMessage error={error}>
        Unable to identify the tenant for this domain: {error}
      </FeedbackMessage>
    );
  }

  return children;
}
