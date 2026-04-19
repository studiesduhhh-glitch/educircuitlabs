import test from "node:test";
import assert from "node:assert/strict";

import {
  assignmentMatchesStudent,
  buildAssignmentPayload
} from "../src/services/assignment-service.js";

test("assignment payload keeps classroom metadata", () => {
  const payload = buildAssignmentPayload({
    assignment: {
      id: "a1",
      title: " Week 3 Motor Lab ",
      className: "10-A",
      challengeId: "motor-circuit",
      challengeTitle: "Motor Circuit",
      instructions: "Build and explain the switch path.",
      dueDate: "2026-04-22"
    },
    teacher: {
      uid: "t1",
      name: "Ms Ada",
      role: "teacher"
    },
    schoolId: "school-1",
    createdAt: new Date("2026-04-18T10:00:00Z")
  });

  assert.equal(payload.title, "Week 3 Motor Lab");
  assert.equal(payload.className, "10-A");
  assert.equal(payload.challengeId, "motor-circuit");
  assert.equal(payload.createdByName, "Ms Ada");
  assert.equal(payload.schoolId, "school-1");
});

test("assignment matching respects class targeting and all-class rooms", () => {
  assert.equal(
    assignmentMatchesStudent({ className: "10-A" }, { className: "10-A" }),
    true
  );
  assert.equal(
    assignmentMatchesStudent({ className: "All Classes" }, { className: "10-B" }),
    true
  );
  assert.equal(
    assignmentMatchesStudent({ className: "10-A" }, { className: "10-B" }),
    false
  );
});
