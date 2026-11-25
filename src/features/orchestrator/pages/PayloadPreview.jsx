import { useState } from "react";

// Mirrors DCMP's own Sale Orchestrator "Preview" panel (a collapsed-by-
// default section under the form, with a Pretty/Raw JSON toggle and a Copy
// button) — reshaped for this platform's fixed submit-transaction contract
// instead of a dynamic payload schema.
export function PayloadPreview({ payload }) {
  const [raw, setRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(payload, null, raw ? 0 : 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      // Clipboard access can be denied (insecure context, permissions) —
      // the JSON is still fully visible and selectable below either way.
    }
  }

  return (
    <details className="sale-preview">
      <summary>Preview submit-transaction payload</summary>
      <div className="sale-preview-body">
        <div className="sale-preview-header">
          <div className="sale-preview-tabs">
            <button type="button" aria-pressed={!raw} onClick={() => setRaw(false)}>
              Pretty
            </button>
            <button type="button" aria-pressed={raw} onClick={() => setRaw(true)}>
              Raw
            </button>
          </div>
          <button type="button" className="sale-preview-copy" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre>{text}</pre>
      </div>
    </details>
  );
}
