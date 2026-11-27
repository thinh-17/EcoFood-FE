import test from "node:test";
import assert from "node:assert/strict";
import { historyNote } from "./complaintHistory.js";

test("assignment metadata is separated from the original response text for display", () => {
  assert.deepEqual(historyNote("Assignee: UNASSIGNED -> handler-123\nfixed"), { previousAssignee: "Unassigned", assignee: "handler-123", note: "fixed" });
  assert.deepEqual(historyNote("Assignee: handler-a → handler-b\r\nline one\nline two"), { previousAssignee: "handler-a", assignee: "handler-b", note: "line one\nline two" });
});
test("ordinary customer notes, including markup and assignment-like prose, stay unchanged", () => {
  const note = "My note\nAssignee: UNASSIGNED -> someone\n<script>text</script>";
  assert.deepEqual(historyNote(note), { note });
  assert.deepEqual(historyNote(), { note: "" });
});
