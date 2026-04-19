function normalizeClassName(value = "") {
  return String(value || "").trim().toLowerCase();
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }
  const date = new Date(value);
  const millis = date.getTime();
  return Number.isFinite(millis) ? millis : 0;
}

function assignmentCollection(db, schoolId) {
  return db.collection("schools").doc(schoolId).collection("assignments");
}

export function assignmentMatchesStudent(assignment = {}, user = {}) {
  const targetClass = normalizeClassName(assignment.className || assignment.targetClass || "all");
  const studentClass = normalizeClassName(user.className);
  return !targetClass ||
    targetClass === "all" ||
    targetClass === "all classes" ||
    targetClass === studentClass;
}

export function buildAssignmentPayload({
  assignment = {},
  teacher = {},
  schoolId = "",
  createdAt
} = {}) {
  const challengeId = String(assignment.challengeId || "led-circuit").trim();
  const className = String(assignment.className || "All Classes").trim() || "All Classes";

  return {
    id: assignment.id || "",
    schoolId,
    title: String(assignment.title || "Untitled Assignment").trim() || "Untitled Assignment",
    className,
    challengeId,
    challengeTitle: String(assignment.challengeTitle || challengeId).trim(),
    instructions: String(assignment.instructions || "").trim(),
    dueDate: String(assignment.dueDate || "").trim(),
    status: String(assignment.status || "ACTIVE").trim().toUpperCase(),
    createdById: teacher.uid || "",
    createdByName: teacher.name || "Teacher",
    createdByRole: teacher.role || "teacher",
    createdAt,
    updatedAt: createdAt
  };
}

export function createAssignmentService({ db, firebase }) {
  const FieldValue = firebase?.firestore?.FieldValue;
  const serverTimestamp = () => FieldValue?.serverTimestamp?.() || new Date();

  async function createAssignment({ schoolId, teacher, assignment }) {
    const ref = assignmentCollection(db, schoolId).doc();
    const payload = buildAssignmentPayload({
      assignment: {
        ...assignment,
        id: ref.id
      },
      teacher,
      schoolId,
      createdAt: serverTimestamp()
    });

    await ref.set(payload, { merge: true });
    return {
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async function listAssignments({ schoolId, user = null } = {}) {
    if (!schoolId) return [];

    const snapshot = await assignmentCollection(db, schoolId).get();
    let assignments = snapshot.docs
      .map(doc => doc.data())
      .filter(Boolean)
      .filter(assignment => String(assignment.status || "ACTIVE").toUpperCase() !== "ARCHIVED");

    if (user?.role === "student") {
      assignments = assignments.filter(assignment => assignmentMatchesStudent(assignment, user));
    }

    return assignments.sort((a, b) => {
      const dueDelta = toMillis(a.dueDate) - toMillis(b.dueDate);
      if (dueDelta !== 0) return dueDelta;
      return toMillis(b.updatedAt) - toMillis(a.updatedAt);
    });
  }

  return {
    buildAssignmentPayload,
    createAssignment,
    listAssignments
  };
}
