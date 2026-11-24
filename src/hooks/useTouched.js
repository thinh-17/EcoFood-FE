import { useState } from "react";

/**
 * Tracks which fields a multi-step form's user has interacted with (blurred
 * at least once), so a required-field error can show live — as soon as you
 * leave that field empty — rather than only after a Next/Submit attempt.
 * `touchAll` marks every field at once, for when Next/Submit is clicked
 * without having touched every field individually (matches the pre-existing
 * submit-time behavior: nothing left unexplained just because it was never
 * blurred).
 */
export function useTouched() {
  const [touched, setTouched] = useState({});
  const touch = (field) => () => setTouched((previous) => ({ ...previous, [field]: true }));
  const touchAll = (fields) =>
    setTouched((previous) => ({ ...previous, ...Object.fromEntries(fields.map((field) => [field, true])) }));
  return { touched, touch, touchAll };
}
