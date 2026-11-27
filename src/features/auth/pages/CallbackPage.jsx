import { useEffect, useRef, useState } from "react";
import { LoadingPage } from "../../../pages/LoadingPage/LoadingPage.jsx";
import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore.js";
import { ROUTES } from "../../../constants/routes.js";

export function CallbackPage() {
  const [status, setStatus] = useState(null);
  const handleCallback = useAuthStore((s) => s.handleCallback);
  const navigate = useNavigate();
  // guards against StrictMode's double-invoke redeeming the code twice
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    handleCallback(params)
      .then(() => {
        // always land on the homepage after a successful login
        navigate(ROUTES.HOME, { replace: true });
      })
      .catch((err) => setStatus(`Sign-in failed: ${err.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!status) return <LoadingPage fullscreen title="Verifying sign-in" description="Connecting you to your EcoFood workspace." />;
  return (
    <FeedbackMessage tone="warning">
      {status}
    </FeedbackMessage>
  );
}
