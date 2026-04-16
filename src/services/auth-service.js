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

export function formatAuthError(error, { mode = "login", role = "student" } = {}) {
  const code = error?.code || "";
  const message = error?.message || "";
  const isCreate = mode === "create";
  const roleLabel = role === "admin" ? "admin" : role === "teacher" ? "teacher" : "student";

  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    if (role === "admin") {
      return "No matching admin account was found. Check the email and password, or set Access Model to Create to make the school admin first.";
    }
    return `No matching ${roleLabel} account was found. Check the email and password, or set Access Model to Create if this is a new account.`;
  }

  if (code === "auth/email-already-in-use") {
    return "That email already has an Educircuit account. Set Access Model to Log in, then use the same email and password.";
  }

  if (code === "auth/weak-password") {
    return "Use a stronger password with at least 6 characters.";
  }

  if (code === "auth/invalid-email") {
    return "Enter a valid email address before continuing.";
  }

  if (code === "permission-denied") {
    return "Firebase blocked this account action. Check that the school exists and that this role is allowed, then try again.";
  }

  if (/school already exists/i.test(message) && isCreate && role === "admin") {
    return "This school already exists. Set Access Model to Log in for the admin account, or use a different school code for a new school.";
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

  function buildSchoolId(schoolName, schoolCode = "") {
    return slugify(schoolCode || schoolName) || "default-school";
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

  async function registerSchoolAdmin(payload) {
    const schoolId = buildSchoolId(payload.school, payload.schoolCode);
    const schoolRef = db.collection("schools").doc(schoolId);
    const existingSchool = await schoolRef.get();
    assert(!existingSchool.exists, "School already exists. Use the member sign-up flow or log in.");

    const cred = await auth.createUserWithEmailAndPassword(payload.email, payload.password);
    const adminRef = schoolRef.collection("admins").doc(cred.user.uid);
    const profilePath = adminRef.path;
    const batch = db.batch();

    batch.set(schoolRef, {
      id: schoolId,
      name: payload.school,
      adminIds: [cred.user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      leaderboardEnabled: true
    });

    batch.set(adminRef, {
      uid: cred.user.uid,
      name: payload.name,
      email: payload.email,
      role: "admin",
      school: payload.school,
      schoolId,
      className: payload.className || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch.set(
      db.collection("users").doc(cred.user.uid),
      buildRootProfile(cred.user.uid, {
        ...payload,
        role: "admin",
        schoolId,
        profilePath
      })
    );

    await batch.commit();
    return fetchUserProfile(cred.user.uid);
  }

  async function registerMember(payload) {
    assert(payload.role === "teacher" || payload.role === "student", "Members must be teachers or students.");
    const schoolId = buildSchoolId(payload.school, payload.schoolCode);
    const schoolRef = db.collection("schools").doc(schoolId);
    const schoolDoc = await schoolRef.get();
    assert(schoolDoc.exists, "School not found. Ask your admin to create the school first.");

    const cred = await auth.createUserWithEmailAndPassword(payload.email, payload.password);
    const collectionName = payload.role === "teacher" ? "teachers" : "students";
    const memberRef = schoolRef.collection(collectionName).doc(cred.user.uid);
    const profilePath = memberRef.path;
    const batch = db.batch();

    batch.set(memberRef, {
      uid: cred.user.uid,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      school: payload.school,
      schoolId,
      className: payload.className || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stats: {
        xp: 0,
        level: 1,
        weeklyXp: 0,
        weekKey: "",
        projectsSaved: 0,
        projectsSubmitted: 0,
        projectsGraded: 0,
        publicProjects: 0
      },
      badges: []
    });

    batch.set(
      db.collection("users").doc(cred.user.uid),
      buildRootProfile(cred.user.uid, {
        ...payload,
        schoolId,
        profilePath
      })
    );

    batch.update(schoolRef, {
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    return fetchUserProfile(cred.user.uid);
  }

  async function login(payload) {
    const cred = await auth.signInWithEmailAndPassword(payload.email, payload.password);
    const profile = await fetchUserProfile(cred.user.uid);
    assert(profile, "This account exists, but its Educircuit classroom profile is missing. Create the account again or ask the school admin to repair it.");
    return profile;
  }

  async function logout() {
    await auth.signOut();
  }

  async function updateUserProgress({ uid, schoolId, role, stats, badges = [] }) {
    if (!uid || !schoolId) return;
    const memberCollection =
      role === "teacher" || role === "admin" ? (role === "admin" ? "admins" : "teachers") : "students";
    const memberRef = db.collection("schools").doc(schoolId).collection(memberCollection).doc(uid);
    const rootRef = db.collection("users").doc(uid);

    await Promise.all([
      rootRef.set(
        {
          stats,
          badges,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      ),
      memberRef.set(
        {
          stats,
          badges,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
    ]);
  }

  return {
    buildSchoolId,
    fetchUserProfile,
    registerSchoolAdmin,
    registerMember,
    login,
    logout,
    updateUserProgress
  };
}
