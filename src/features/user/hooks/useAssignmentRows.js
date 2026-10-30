import { useState } from "react";

// Shared Access & Permissions row-editing state — used by both
// UserDetailForm (seeded from an existing user's tenantAssignments) and
// UserCreateForm (seeded empty). rowId identifies a row across re-renders
// independent of tenantId, which starts blank for a new row and can change
// as the user picks a different tenant.
export function useAssignmentRows(initialAssignments = []) {
  const [assignments, setAssignments] = useState(initialAssignments);

  function addAssignment() {
    setAssignments((prev) => [...prev, { rowId: crypto.randomUUID(), tenantId: "", roleIds: [] }]);
  }

  function changeTenant(index, tenantId) {
    // Resets roleIds — a role picked for the previous tenant's actor isn't
    // necessarily valid for the newly-chosen tenant's actor.
    setAssignments((prev) => prev.map((assignment, i) => (i === index ? { ...assignment, tenantId, roleIds: [] } : assignment)));
  }

  function changeRoles(index, roleIds) {
    setAssignments((prev) => prev.map((assignment, i) => (i === index ? { ...assignment, roleIds } : assignment)));
  }

  function removeAssignment(index) {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  }

  return { assignments, addAssignment, changeTenant, changeRoles, removeAssignment };
}
