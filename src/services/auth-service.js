function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function authError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function humanizeEmailName(email = "") {
  const localPart = String(email || "").split("@")[0] || "";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();
  if (!normalized) return "Educircuit User";
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function resolveProfileSchoolId(profile = {}) {
  return (
    profile.schoolId
    || profile.schoolKey
    || slugify(profile.schoolCode || profile.schoolUsername || profile.school || "")
  );
}

export function formatAuthError(error, { mode = "login", role = "student" } = {}) {
  const code = error?.code || "";
  const message = error?.message || "";
  const isCreate = mode === "create";
  const roleLabel = role === "admin" ? "admin" : role === "teacher" ? "teacher" : "student";

  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    if (role === "admin") {
      return "No matching admin account was found. Check the email and password, or create the school admin account first.";
    }
    return `No matching ${roleLabel} account was found. Check the email and password, or choose Create Account if this is your first time.`;
  }

  if (code === "auth/email-already-in-use") {
    return "That email already has an Educircuit account. Choose Log In and use the same email and password.";
  }

  if (code === "auth/weak-password") {
    return "Use a stronger password with at least 6 characters.";
  }

  if (code === "auth/invalid-email") {
    return "Enter a valid email address before continuing.";
  }

  if (code === "auth/school-code-mismatch") {
    return "That school code does not match this account. Check the code and try again.";
  }

  if (code === "auth/operation-not-allowed") {
    return "Email and password accounts are not enabled in Firebase yet.";
  }

  if (code === "auth/network-request-failed") {
    return "The network interrupted Firebase. Check your connection and try again.";
  }

  if (code === "auth/too-many-requests") {
    return "Firebase temporarily paused sign-in attempts. Wait a moment, then try again.";
  }

  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Firebase blocked this account action. Check that the school exists and that this role is allowed, then try again.";
  }

  if (/school already exists/i.test(message) && isCreate && role === "admin") {
    return "This school already exists. Choose Log In for the admin account, or use a different school code for a new school.";
  }

  if (/school not found/i.test(message)) {
    return "School not found. Ask the admin to create the school first, then create or log in to your account with the school code.";
  }

  if (/profile/i.test(message)) {
    return message;
  }

  return message || "Something went wrong while signing in. Check the details and try again.";
}

export function createAuthService({ auth, db, firebase }) {
  const FieldValue = firebase?.firestore?.FieldValue;
  const serverTimestamp = () => FieldValue?.serverTimestamp?.() || new Date();
  const appendToArray = value => FieldValue?.arrayUnion?.(value) || [value];

  async function configurePersistence(remember = false) {
    if (typeof auth?.setPersistence !== "function") return;
    const persistence = remember
      ? firebase?.auth?.Auth?.Persistence?.LOCAL
      : firebase?.auth?.Auth?.Persistence?.SESSION;
    if (!persistence) return;
    await auth.setPersistence(persistence);
  }

  function buildSchoolId(schoolName, schoolCode = "") {
    return slugify(schoolCode || schoolName) || "default-school";
  }

  function normalizeProfilePayload(payload = {}, { requirePassword = true } = {}) {
    const normalized = {
      ...payload,
      name: String(payload.name || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      password: String(payload.password || ""),
      role: String(payload.role || "").trim().toLowerCase(),
      className: String(payload.className || "").trim(),
      school: String(payload.school || "").trim(),
      schoolCode: String(payload.schoolCode || "").trim()
    };

    assert(normalized.name.length >= 2, "Enter the full name for this account.");
    assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email), "Enter a valid email address.");
    if (requirePassword) {
      assert(normalized.password.length >= 6, "Use a password with at least 6 characters.");
    }
    assert(["student", "teacher", "admin"].includes(normalized.role), "Choose a valid account role.");
    assert(normalized.school, "Enter the school name.");
    assert(normalized.schoolCode, "Enter the school code.");
    if (normalized.role === "student") {
      assert(normalized.className, "Enter your class or section.");
    }

    return normalized;
  }

  function normalizeRegistrationPayload(payload = {}) {
    return normalizeProfilePayload(payload, { requirePassword: true });
  }

  function normalizeGoogleRegistrationPayload(user, payload = {}) {
    const googleEmail = String(user?.email || payload.email || "").trim().toLowerCase();
    const googleName = String(
      payload.name
      || user?.displayName
      || humanizeEmailName(googleEmail)
      || "Educircuit User"
    ).trim();

    return normalizeProfilePayload({
      ...payload,
      name: googleName,
      email: googleEmail,
      password: ""
    }, { requirePassword: false });
  }

  function buildStarterStats() {
    return {
      xp: 0,
      level: 1,
      weeklyXp: 0,
      weekKey: "",
      projectsSaved: 0,
      projectsSubmitted: 0,
      projectsGraded: 0,
      publicProjects: 0
    };
  }

  function buildRootProfile(uid, payload) {
    return {
      uid,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      className: payload.className || "",
      school: payload.school,
      schoolId: payload.schoolId,
      schoolKey: payload.schoolId,
      schoolCode: payload.schoolCode,
      schoolUsername: payload.schoolCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stats: payload.stats || {
        xp: 0,
        level: 1,
        weeklyXp: 0,
        weekKey: "",
        projectsSaved: 0,
        projectsSubmitted: 0,
        projectsGraded: 0,
        publicProjects: 0
      },
      badges: payload.badges || [],
      profilePath: payload.profilePath
    };
  }

  async function fetchUserProfile(uid) {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data() : null;
  }

  async function removeIncompleteUser(user, shouldDelete) {
    try {
      if (shouldDelete) {
        await user?.delete?.();
      } else {
        await auth.signOut?.();
      }
    } catch (cleanupError) {
      console.warn("Could not clean up incomplete Firebase registration", cleanupError);
    }
  }

  async function createOrRecoverCredential(payload) {
    try {
      return {
        credential: await auth.createUserWithEmailAndPassword(payload.email, payload.password),
        createdAuthUser: true
      };
    } catch (error) {
      if (error?.code !== "auth/email-already-in-use" || typeof auth.signInWithEmailAndPassword !== "function") {
        throw error;
      }

      let credential;
      try {
        credential = await auth.signInWithEmailAndPassword(payload.email, payload.password);
      } catch {
        throw error;
      }

      const existingProfile = await fetchUserProfile(credential.user.uid);
      if (existingProfile) {
        await auth.signOut?.();
        throw error;
      }

      return {
        credential,
        createdAuthUser: false
      };
    }
  }

  async function runRegistration(payload, registerProfile) {
    const { credential, createdAuthUser } = await createOrRecoverCredential(payload);
    try {
      return await registerProfile(credential.user);
    } catch (error) {
      await removeIncompleteUser(credential.user, createdAuthUser);
      throw error;
    }
  }

  async function createAdminProfileForUser(user, payload) {
    const schoolId = buildSchoolId(payload.school, payload.schoolCode);
    const schoolRef = db.collection("schools").doc(schoolId);
    const existingSchool = await schoolRef.get();
    const existingSchoolData = existingSchool.exists ? existingSchool.data() : null;
    const hasAdmin = Array.isArray(existingSchoolData?.adminIds) && existingSchoolData.adminIds.length > 0;
    assert(!hasAdmin, "School already exists. Use the member sign-up flow or log in.");

    const schoolName = String(existingSchoolData?.name || payload.school).trim();
    const adminRef = schoolRef.collection("admins").doc(user.uid);
    const profilePath = adminRef.path;
    const batch = db.batch();
    const schoolPayload = {
      id: schoolId,
      name: schoolName,
      adminIds: existingSchool.exists ? appendToArray(user.uid) : [user.uid],
      updatedAt: serverTimestamp(),
      leaderboardEnabled: true
    };

    if (existingSchool.exists) {
      batch.set(schoolRef, schoolPayload, { merge: true });
    } else {
      batch.set(schoolRef, {
        ...schoolPayload,
        createdAt: serverTimestamp()
      });
    }

    batch.set(adminRef, {
      uid: user.uid,
      name: payload.name,
      email: payload.email,
      role: "admin",
      school: schoolName,
      schoolId,
      schoolCode: payload.schoolCode,
      schoolUsername: payload.schoolCode,
      className: payload.className,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const rootProfile = buildRootProfile(user.uid, {
      ...payload,
      role: "admin",
      school: schoolName,
      schoolId,
      profilePath
    });
    batch.set(db.collection("users").doc(user.uid), rootProfile);
    await batch.commit();
    return {
      ...rootProfile,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async function createMemberProfileForUser(user, payload) {
    const schoolId = buildSchoolId(payload.school, payload.schoolCode);
    const schoolRef = db.collection("schools").doc(schoolId);
    const schoolDoc = await schoolRef.get();
    const schoolData = schoolDoc.exists ? schoolDoc.data() : null;
    const schoolName = String(schoolData?.name || payload.school).trim();
    const collectionName = payload.role === "teacher" ? "teachers" : "students";
    const memberRef = schoolRef.collection(collectionName).doc(user.uid);
    const profilePath = memberRef.path;
    const batch = db.batch();
    const stats = buildStarterStats();

    batch.set(memberRef, {
      uid: user.uid,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      school: schoolName,
      schoolId,
      schoolCode: payload.schoolCode,
      schoolUsername: payload.schoolCode,
      className: payload.className,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stats,
      badges: []
    });

    const rootProfile = buildRootProfile(user.uid, {
      ...payload,
      school: schoolName,
      schoolId,
      profilePath,
      stats,
      badges: []
    });
    batch.set(db.collection("users").doc(user.uid), rootProfile);

    if (schoolDoc.exists) {
      batch.update(schoolRef, {
        updatedAt: serverTimestamp()
      });
    } else {
      batch.set(schoolRef, {
        id: schoolId,
        name: schoolName,
        adminIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        leaderboardEnabled: true,
        selfServiceSignup: true,
        createdBy: user.uid,
        createdByRole: payload.role
      });
    }

    await batch.commit();
    return {
      ...rootProfile,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async function registerSchoolAdmin(rawPayload) {
    const payload = normalizeRegistrationPayload({
      ...rawPayload,
      role: "admin"
    });
    return runRegistration(payload, user => createAdminProfileForUser(user, payload));
  }

  async function registerMember(rawPayload) {
    const payload = normalizeRegistrationPayload(rawPayload);
    assert(payload.role === "teacher" || payload.role === "student", "Members must be teachers or students.");
    return runRegistration(payload, user => createMemberProfileForUser(user, payload));
  }

  async function completeGoogleRegistration(user, rawPayload) {
    assert(user?.uid, "Google sign-in did not return a valid Educircuit user session.");
    const existingProfile = await fetchUserProfile(user.uid);
    if (existingProfile) {
      return existingProfile;
    }

    const payload = normalizeGoogleRegistrationPayload(user, rawPayload);
    if (payload.role === "admin") {
      return createAdminProfileForUser(user, {
        ...payload,
        role: "admin"
      });
    }
    assert(payload.role === "teacher" || payload.role === "student", "Members must be teachers or students.");
    return createMemberProfileForUser(user, payload);
  }

  async function login(payload) {
    const cred = await auth.signInWithEmailAndPassword(payload.email, payload.password);
    const profile = await fetchUserProfile(cred.user.uid);
    if (!profile) {
      await auth.signOut();
      throw new Error("This account exists, but its Educircuit classroom profile is missing. Create the account again or ask the school admin to repair it.");
    }
    const suppliedSchoolId = buildSchoolId("", payload.schoolCode);
    const profileSchoolId = resolveProfileSchoolId(profile);
    if (!payload.schoolCode || !profileSchoolId || suppliedSchoolId !== profileSchoolId) {
      await auth.signOut();
      throw authError("auth/school-code-mismatch", "The supplied school code does not match this account.");
    }
    return profile;
  }

  async function logout() {
    await auth.signOut();
  }

  function getAuthenticatedEmail() {
    return String(auth?.currentUser?.email || "").trim().toLowerCase();
  }

  async function updateUserProgress({ uid, schoolId, role, stats, badges = [] }) {
    if (!uid || !schoolId) return;
    const memberCollection =
      role === "teacher" || role === "admin" ? (role === "admin" ? "admins" : "teachers") : "students";
    const memberRef = db.collection("schools").doc(schoolId).collection(memberCollection).doc(uid);
    const rootRef = db.collection("users").doc(uid);

    const progressPayload = {
      stats,
      badges,
      updatedAt: serverTimestamp()
    };

    await rootRef.set(progressPayload, { merge: true });

    try {
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        await memberRef.set(progressPayload, { merge: true });
      }
    } catch (error) {
      console.warn("Firebase member progress mirror could not be updated", error);
    }
  }

  return {
    buildSchoolId,
    configurePersistence,
    fetchUserProfile,
    registerSchoolAdmin,
    registerMember,
    completeGoogleRegistration,
    login,
    logout,
    getAuthenticatedEmail,
    updateUserProgress
  };
}
