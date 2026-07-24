function toNumericGrade(value) {
  if (typeof value === "number") return value;
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function timestampToMillis(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

const PUBLIC_GALLERY_SCHOOL_ID = "public-gallery";

export function createProjectService({ db, firebase }) {
  const FieldValue = firebase?.firestore?.FieldValue;
  const serverTimestamp = () => FieldValue?.serverTimestamp?.() || new Date();
  const increment = value => FieldValue?.increment?.(value) ?? value;
  const arrayUnion = value => FieldValue?.arrayUnion?.(value) ?? [value];
  const arrayRemove = value => FieldValue?.arrayRemove?.(value) ?? [];

  function schoolProjectsRef(schoolId) {
    return db.collection("schools").doc(schoolId).collection("projects");
  }

  function publicGalleryProjectsRef() {
    return schoolProjectsRef(PUBLIC_GALLERY_SCHOOL_ID);
  }

  function buildGalleryProjectId(schoolId, projectId) {
    return `${String(schoolId).replaceAll("/", "-")}--${String(projectId).replaceAll("/", "-")}`;
  }

  function buildGalleryPayload(source, sourceSchoolId, sourceProjectId) {
    const payload = {
      id: buildGalleryProjectId(sourceSchoolId, sourceProjectId),
      schoolId: PUBLIC_GALLERY_SCHOOL_ID,
      sourceSchoolId,
      sourceProjectId,
      name: source.name || "Untitled Circuit",
      items: source.items || [],
      wires: source.wires || [],
      logic: source.logic || [],
      defaultBatteryVoltage: Number(source.defaultBatteryVoltage || 5),
      ownerId: source.ownerId,
      ownerName: source.ownerName || "Educircuit Student",
      ownerRole: source.ownerRole || "student",
      status: source.status || "DRAFT",
      visibility: "public",
      cloneable: true,
      assignmentTitle: source.assignmentTitle || "",
      challengeId: source.challengeId || "",
      metrics: {
        componentCount: Number(source.metrics?.componentCount || 0),
        wireCount: Number(source.metrics?.wireCount || 0),
        logicCount: Number(source.metrics?.logicCount || 0),
        diagnosticsCount: Number(source.metrics?.diagnosticsCount || 0),
        qualityScore: Number(source.metrics?.qualityScore || 0)
      },
      simulation: {
        summary: source.simulation?.summary || "",
        outputs: source.simulation?.outputs || {},
        diagnostics: source.simulation?.diagnostics || []
      },
      createdAt: source.createdAt || serverTimestamp(),
      updatedAt: source.updatedAt || serverTimestamp()
    };

    if (source.likeCount !== undefined) {
      payload.likeCount = Number(source.likeCount || 0);
    }
    if (Array.isArray(source.likedBy)) {
      payload.likedBy = source.likedBy;
    }
    return payload;
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
    projectId = null,
    status = "DRAFT"
  }) {
    const publishedVisibility = "public";
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
      visibility: publishedVisibility,
      cloneable: true,
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

    const galleryPayload = buildGalleryPayload(payload, schoolId, ref.id);
    const galleryRef = publicGalleryProjectsRef().doc(galleryPayload.id);
    if (typeof db.batch === "function") {
      const batch = db.batch();
      batch.set(ref, payload, { merge: true });
      batch.set(galleryRef, galleryPayload, { merge: true });
      await batch.commit();
    } else {
      await Promise.all([
        ref.set(payload, { merge: true }),
        galleryRef.set(galleryPayload, { merge: true })
      ]);
    }
    return { ...payload, createdAt: payload.createdAt || new Date(), id: ref.id };
  }

  async function submitProject({ schoolId, projectId, owner, projectSnapshot, analysis }) {
    return saveProject({
      schoolId,
      owner,
      projectSnapshot,
      analysis,
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

  async function publishSavedProjects({ schoolId, ownerId }) {
    const query = schoolProjectsRef(schoolId).where("ownerId", "==", ownerId);
    const snapshot = await query.get();
    await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const sourceProjectId = data.id || doc.id;
      const sourceRef = doc.ref || schoolProjectsRef(schoolId).doc(sourceProjectId);
      const galleryPayload = buildGalleryPayload(data, schoolId, sourceProjectId);
      const galleryRef = publicGalleryProjectsRef().doc(galleryPayload.id);
      const writes = [galleryRef.set(galleryPayload, { merge: true })];
      if (data.visibility !== "public") {
        writes.push(sourceRef.set({
          visibility: "public",
          cloneable: true,
          updatedAt: serverTimestamp()
        }, { merge: true }));
      }
      await Promise.all(writes);
    }));
    return snapshot.docs.length;
  }

  async function listPublicProjects() {
    const snapshot = await publicGalleryProjectsRef()
      .where("visibility", "==", "public")
      .get();
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.data().id || doc.id }))
      .sort((a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt));
  }

  async function deletePublicProject(projectId) {
    if (!projectId) {
      throw new Error("A gallery project ID is required");
    }
    await publicGalleryProjectsRef().doc(projectId).delete();
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
      visibility: "public",
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
    publishSavedProjects,
    listPublicProjects,
    deletePublicProject,
    likeProject,
    buildClonePayload
  };
}
