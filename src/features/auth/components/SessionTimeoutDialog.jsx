import { CoreModal } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";

export function SessionTimeoutDialog({ secondsLeft, onContinue, onLogout }) {
  return (
    <CoreModal
      isOpen
      onClose={onContinue}
      title="Session about to expire"
      size="sm"
      footer={
        <>
          <CoreButton variant="secondary" onClick={onLogout}>
            Log out
          </CoreButton>
          <CoreButton onClick={onContinue}>Continue session</CoreButton>
        </>
      }
    >
      <p>
        You've been inactive for a while. You'll be logged out automatically
        in <strong>{secondsLeft}</strong> second{secondsLeft === 1 ? "" : "s"}.
      </p>
    </CoreModal>
  );
}
