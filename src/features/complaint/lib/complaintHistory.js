export function historyNote(note = "") {
  const match = /^Assignee:\s*(.*?)\s*(?:->|→)\s*([^\r\n]+)(?:\r?\n|$)/.exec(note);
  if (!match) return { note };
  const label = (value) => value.trim() === "UNASSIGNED" ? "Unassigned" : value.trim();
  return { previousAssignee: label(match[1]), assignee: label(match[2]), note: note.slice(match[0].length) };
}
