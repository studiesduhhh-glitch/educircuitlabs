function toNumericGrade(value) {
  if (typeof value === "number") return value;
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function createProjectService({ db, firebase }) {
  const FieldValue = firebase?.firestore?.FieldValue;
  const serverTimestamp = () => FieldValue?.serverTimestamp?.() || new Date();
  const increment = value => FieldValue?.increment?.(value) ?? value;
  const arrayUnion = value => FieldValue?.arrayUnion?.(value) ?? [value];
  const arrayRemove = value => FieldValue?.arrayRemove?.(value) ?? [];

  function schoolProjectsRef(schoolId) {
    return db.collection("schools").doc(schoolId).collection("projects");
  }

  function buildMetrics(projectSnapshot, analysis) {
    return {
      componentCount: (projectSnapshot.items || []).length,
      wireCount: (projectSnapshot.wires || []).length,
      logicCount: (projectSnapshot.logic || []).length,
      diagnosticsCount: analysis?.diagnostics?.length || 0,
      qualityScore: analysis?.qualityScore || 0,
      numericGrade: toNumericGrade(projectSnapshot.grade)
    };
  }

  async function saveProject({
    schoolId,
    owner,
    projectSnapshot,
    analysis,
    visibility = "private",
    projectId = null,
    status = "DRAFT"
  }) {
    const ref = projectId ? schoolProjectsRef(schoolId).doc(projectId) : schoolProjectsRef(schoolId).doc();
    const payload = {
      id: ref.id,
      schoolId,
      name: projectSnapshot.name,
      items: projectSnapshot.items || [],
      wires: projectSnapshot.wires || [],
      logic: projectSnapshot.logic || [],
      defaultBatteryVoltage: Number(projectSnapshot.defaultBatteryVoltage || 5),
      ownerId: owner.uid,
      ownerName: owner.name,
      ownerRole: owner.role,
      className: owner.className || "",
      status,
      visibility,
      cloneable: visibility === "public",
      grade: projectSnapshot.grade || "Not graded",
      feedback: projectSnapshot.feedback || "",
      assignmentId: projectSnapshot.assignmentId || null,
      assignmentTitle: projectSnapshot.assignmentTitle || "",
      assignmentDueDate: projectSnapshot.assignmentDueDate || "",
      challengeId: projectSnapshot.challengeId || "",
      metrics: buildMetrics(projectSnapshot, analysis),
      simulation: {
        summary: analysis?.summary || "",
        outputs: analysis?.outputs || {},
        diagnostics: analysis?.diagnostics || []
      },
      updatedAt: serverTimestamp()
    };

    if (!projectId) {
      payload.createdAt = serverTimestamp();
      payload.likeCount = Number(projectSnapshot.likeCount || 0);
      payload.likedBy = projectSnapshot.likedBy || [];
    } else if (projectSnapshot.likeCount !== undefined) {
      payload.likeCount = Number(projectSnapshot.likeCount || 0);
    }

    if (status === "SUBMITTED") {
      payload.submittedAt = serverTimestamp();
    }

    await ref.set(payload, { merge: true });
    return { ...payload, createdAt: payload.createdAt || new Date(), id: ref.id };
  }

  async function submitProject({ schoolId, projectId, owner, projectSnapshot, analysis, visibility }) {
    return saveProject({
      schoolId,
      owner,
      projectSnapshot,
      analysis,
      visibility,
      projectId,
      status: "SUBMITTED"
    });
  }

  async function gradeProject({
    schoolId,
    projectId,
    grade,
    feedback,
    gradedBy,
    autoGrade = null,
    visibility = null
  }) {
    const ref = schoolProjectsRef(schoolId).doc(projectId);
    const payload = {
      grade,
      feedback,
      status: "GRADED",
      gradedAt: serverTimestamp(),
      gradedById: gradedBy.uid,
      gradedByName: gradedBy.name,
      updatedAt: serverTimestamp(),
      "metrics.numericGrade": toNumericGrade(grade)
    };

    if (visibility) {
      payload.visibility = visibility;
      payload.cloneable = visibility === "public";
    }

    if (autoGrade) {
      payload.autoGrade = {
        totalScore: autoGrade.totalScore,
        breakdown: autoGrade.breakdown,
        feedback: autoGrade.feedback
      };
    }

    await ref.set(payload, { merge: true });
  }

  async function listStudentProjects({ schoolId, ownerId }) {
    const snapshot = await schoolProjectsRef(schoolId)
      .where("ownerId", "==", ownerId)
      .orderBy("updatedAt", "desc")
      .get();
    return snapshot.docs.map(doc => doc.data());
  }

  async function listTeacherSubmissions({ schoolId }) {
    const snapshot = await schoolProjectsRef(schoolId)
      .orderBy("updatedAt", "desc")
      .get();
    return snapshot.docs.map(doc => doc.data());
  }

  async function listPublicProjects({ schoolId = null, limit = 24 } = {}) {
    let query = schoolId
      ? schoolProjectsRef(schoolId).where("visibility", "==", "public")
      : db.collectionGroup("projects").where("visibility", "==", "public");

    query = query.orderBy("updatedAt", "desc").limit(limit);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
  }

  async function likeProject({ schoolId, projectId, userId }) {
    const ref = schoolProjectsRef(schoolId).doc(projectId);

    if (typeof db.runTransaction === "function" && FieldValue?.increment) {
      return db.runTransaction(async transaction => {
        const doc = await transaction.get(ref);
        const data = doc.exists ? doc.data() : {};
        const likedBy = data.likedBy || [];
        const hasLiked = likedBy.includes(userId);
        const nextLiked = !hasLiked;

        transaction.set(
          ref,
          {
            likeCount: increment(nextLiked ? 1 : -1),
            likedBy: nextLiked ? arrayUnion(userId) : arrayRemove(userId),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        return {
          liked: nextLiked,
          likeCount: Math.max(0, (data.likeCount || 0) + (nextLiked ? 1 : -1))
        };
      });
    }

    const doc = await ref.get();
    const data = doc.exists ? doc.data() : {};
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(userId);
    const nextLikedBy = hasLiked
      ? likedBy.filter(id => id !== userId)
      : [...likedBy, userId];

    await ref.set(
      {
        likedBy: nextLikedBy,
        likeCount: nextLikedBy.length,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return {
      liked: !hasLiked,
      likeCount: nextLikedBy.length
    };
  }

  function buildClonePayload(project, currentUser) {
    return {
      id: null,
      name: `${project.name} (Clone)`,
      items: project.items || [],
      wires: project.wires || [],
      logic: project.logic || [],
      defaultBatteryVoltage: Number(project.defaultBatteryVoltage || 5),
      visibility: "private",
      status: "DRAFT",
      grade: "Not graded",
      feedback: "",
      assignmentId: null,
      assignmentTitle: "",
      assignmentDueDate: "",
      challengeId: project.challengeId || "",
      ownerName: currentUser.name,
      clonedFrom: project.id
    };
  }

  return {
    saveProject,
    submitProject,
    gradeProject,
    listStudentProjects,
    listTeacherSubmissions,
    listPublicProjects,
    likeProject,
    buildClonePayload
  };
}
