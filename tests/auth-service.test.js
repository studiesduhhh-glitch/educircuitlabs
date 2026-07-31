import test from "node:test";
import assert from "node:assert/strict";
import { createAuthService, formatAuthError } from "../src/services/auth-service.js";

function createMockDb(seed = {}) {
  const schools = { ...(seed.schools || {}) };
  const users = { ...(seed.users || {}) };
  const writes = [];

  function readPath(path) {
    const parts = path.split("/");
    if (parts[0] === "schools" && parts.length === 2) return schools[parts[1]];
    if (parts[0] === "users" && parts.length === 2) return users[parts[1]];
    return null;
  }

  function applyWrite(write) {
    const parts = write.path.split("/");
    if (parts[0] === "schools" && parts.length === 2) {
      schools[parts[1]] = write.options?.merge
        ? { ...(schools[parts[1]] || {}), ...write.data }
        : write.data;
    }
    if (parts[0] === "users" && parts.length === 2) {
      users[parts[1]] = write.data;
    }
  }

  function makeDoc(path) {
    return {
      path,
      collection(name) {
        return {
          doc(id) {
            return makeDoc(`${path}/${name}/${id}`);
          }
        };
      },
      async get() {
        const data = readPath(path);
        return {
          exists: Boolean(data),
          data: () => data
        };
      },
      async set(data, options) {
        const write = { type: "set", path, data, options };
        writes.push(write);
        applyWrite(write);
      }
    };
  }

  return {
    schools,
    users,
    writes,
    collection(name) {
      return {
        doc(id) {
          return makeDoc(`${name}/${id}`);
        }
      };
    },
    batch() {
      const pending = [];
      return {
        set(ref, data, options) {
          pending.push({ type: "set", path: ref.path, data, options });
        },
        update(ref, data) {
          pending.push({ type: "update", path: ref.path, data, options: { merge: true } });
        },
        async commit() {
          if (seed.failCommit) {
            throw new Error("Firestore registration write failed");
          }
          writes.push(...pending);
          pending.forEach(applyWrite);
        }
      };
    }
  };
}

const fakeFirebase = {
  auth: {
    Auth: {
      Persistence: {
        LOCAL: "local",
        SESSION: "session"
      }
    }
  },
  firestore: {
    FieldValue: {
      serverTimestamp: () => "SERVER_TIME",
      arrayUnion: value => ({ arrayUnion: [value] })
    }
  }
};

test("configures Firebase persistence from the remember-me choice", async () => {
  const selectedPersistence = [];
  const auth = {
    async setPersistence(persistence) {
      selectedPersistence.push(persistence);
    }
  };
  const service = createAuthService({ auth, db: createMockDb(), firebase: fakeFirebase });

  await service.configurePersistence(true);
  await service.configurePersistence(false);

  assert.deepEqual(selectedPersistence, ["local", "session"]);
});

test("maps invalid admin credentials to create-account guidance", () => {
  const message = formatAuthError(
    { code: "auth/invalid-credential", message: "Firebase: invalid credential" },
    { mode: "login", role: "admin" }
  );

  assert.match(message, /No matching admin account/);
  assert.match(message, /create the school admin account first/);
});

test("maps duplicate email to login guidance", () => {
  const message = formatAuthError(
    { code: "auth/email-already-in-use", message: "Firebase: email already in use" },
    { mode: "create", role: "student" }
  );

  assert.match(message, /already has an Educircuit account/);
  assert.match(message, /Choose Log In/);
});

test("maps school-code mismatch and Firebase availability errors clearly", () => {
  assert.match(
    formatAuthError({ code: "auth/school-code-mismatch" }),
    /school code does not match/i
  );
  assert.match(
    formatAuthError({ code: "auth/operation-not-allowed" }),
    /not enabled in Firebase/i
  );
  assert.match(
    formatAuthError({ code: "firestore/permission-denied" }),
    /Firebase blocked/i
  );
});

test("student account creation bootstraps a new school code", async () => {
  const db = createMockDb();
  const auth = {
    async createUserWithEmailAndPassword(email) {
      assert.equal(email, "student@example.com");
      return { user: { uid: "student-1" } };
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  const profile = await service.registerMember({
    name: "Student One",
    email: "student@example.com",
    password: "secret123",
    role: "student",
    className: "10-A",
    school: "VVA",
    schoolCode: "kundy acsdmy"
  });

  assert.equal(profile.uid, "student-1");
  assert.equal(profile.role, "student");
  assert.equal(profile.schoolId, "kundy-acsdmy");
  assert.equal(db.users["student-1"].schoolCode, "kundy acsdmy");
  assert.equal(db.users["student-1"].schoolUsername, "kundy acsdmy");
  assert.equal(db.schools["kundy-acsdmy"].selfServiceSignup, true);
  assert.deepEqual(db.schools["kundy-acsdmy"].adminIds, []);
  assert.equal(db.users["student-1"].profilePath, "schools/kundy-acsdmy/students/student-1");
});

test("admin can claim a self-service school that has no admin yet", async () => {
  const db = createMockDb({
    schools: {
      "kundy-acsdmy": {
        id: "kundy-acsdmy",
        name: "VVA",
        adminIds: [],
        selfServiceSignup: true
      }
    }
  });
  const auth = {
    async createUserWithEmailAndPassword() {
      return { user: { uid: "admin-1" } };
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  const profile = await service.registerSchoolAdmin({
    name: "Admin One",
    email: "admin@example.com",
    password: "secret123",
    role: "admin",
    className: "",
    school: "VVA",
    schoolCode: "kundy acsdmy"
  });

  const schoolWrite = db.writes.find(write => write.path === "schools/kundy-acsdmy");
  assert.equal(profile.role, "admin");
  assert.equal(schoolWrite.options.merge, true);
  assert.deepEqual(schoolWrite.data.adminIds, { arrayUnion: ["admin-1"] });
});

test("failed profile creation removes the incomplete Firebase Auth account", async () => {
  const db = createMockDb({ failCommit: true });
  let deleteCalls = 0;
  const auth = {
    async createUserWithEmailAndPassword() {
      return {
        user: {
          uid: "student-orphan",
          async delete() {
            deleteCalls += 1;
          }
        }
      };
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  await assert.rejects(
    service.registerMember({
      name: "Student Orphan",
      email: "orphan@example.com",
      password: "secret123",
      role: "student",
      className: "10-A",
      school: "VVA",
      schoolCode: "cleanup-school"
    }),
    /Firestore registration write failed/
  );

  assert.equal(deleteCalls, 1);
});

test("create account repairs an older Auth user that has no Firestore profile", async () => {
  const db = createMockDb();
  let signInCalls = 0;
  const auth = {
    async createUserWithEmailAndPassword() {
      const error = new Error("Email already exists");
      error.code = "auth/email-already-in-use";
      throw error;
    },
    async signInWithEmailAndPassword(email, password) {
      signInCalls += 1;
      assert.equal(email, "recover@example.com");
      assert.equal(password, "secret123");
      return { user: { uid: "recovered-student" } };
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  const profile = await service.registerMember({
    name: "Recovered Student",
    email: "RECOVER@example.com",
    password: "secret123",
    role: "student",
    className: "10-A",
    school: "Recovery School",
    schoolCode: "recovery-school"
  });

  assert.equal(signInCalls, 1);
  assert.equal(profile.uid, "recovered-student");
  assert.equal(profile.email, "recover@example.com");
  assert.equal(db.users["recovered-student"].schoolId, "recovery-school");
});

test("create account does not overwrite a complete existing profile", async () => {
  const db = createMockDb({
    users: {
      "existing-student": {
        uid: "existing-student",
        email: "existing@example.com",
        role: "student",
        schoolId: "existing-school"
      }
    }
  });
  let signOutCalls = 0;
  const auth = {
    async createUserWithEmailAndPassword() {
      const error = new Error("Email already exists");
      error.code = "auth/email-already-in-use";
      throw error;
    },
    async signInWithEmailAndPassword() {
      return { user: { uid: "existing-student" } };
    },
    async signOut() {
      signOutCalls += 1;
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  await assert.rejects(
    service.registerMember({
      name: "Existing Student",
      email: "existing@example.com",
      password: "secret123",
      role: "student",
      className: "10-A",
      school: "Existing School",
      schoolCode: "existing-school"
    }),
    error => error.code === "auth/email-already-in-use"
  );

  assert.equal(signOutCalls, 1);
  assert.deepEqual(db.writes, []);
});

test("google account completion creates a classroom profile without asking for a password", async () => {
  const db = createMockDb();
  const service = createAuthService({ auth: {}, db, firebase: fakeFirebase });

  const profile = await service.completeGoogleRegistration(
    {
      uid: "google-student",
      email: "google.student@example.com",
      displayName: "Google Student"
    },
    {
      role: "student",
      className: "8-A",
      school: "Google Academy",
      schoolCode: "google-academy"
    }
  );

  assert.equal(profile.uid, "google-student");
  assert.equal(profile.email, "google.student@example.com");
  assert.equal(profile.profilePath, "schools/google-academy/students/google-student");
  assert.equal(db.users["google-student"].role, "student");
  assert.equal(db.schools["google-academy"].selfServiceSignup, true);
});

test("google account completion reuses an existing Educircuit profile", async () => {
  const db = createMockDb({
    users: {
      "google-existing": {
        uid: "google-existing",
        email: "existing@example.com",
        role: "teacher",
        schoolId: "existing-school",
        school: "Existing School"
      }
    }
  });
  const service = createAuthService({ auth: {}, db, firebase: fakeFirebase });

  const profile = await service.completeGoogleRegistration(
    {
      uid: "google-existing",
      email: "existing@example.com",
      displayName: "Existing Teacher"
    },
    {
      role: "teacher",
      school: "Wrong School",
      schoolCode: "wrong-school"
    }
  );

  assert.equal(profile.schoolId, "existing-school");
  assert.deepEqual(db.writes, []);
});

test("existing school membership uses the canonical Firebase school name", async () => {
  const db = createMockDb({
    schools: {
      "canonical-school": {
        id: "canonical-school",
        name: "Canonical Academy",
        adminIds: []
      }
    }
  });
  const auth = {
    async createUserWithEmailAndPassword() {
      return { user: { uid: "canonical-student" } };
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  const profile = await service.registerMember({
    name: "Canonical Student",
    email: "canonical@example.com",
    password: "secret123",
    role: "student",
    className: "9-B",
    school: "Misspelled Academy",
    schoolCode: "canonical-school"
  });

  assert.equal(profile.school, "Canonical Academy");
  assert.equal(db.users["canonical-student"].school, "Canonical Academy");
});

test("login signs out an Auth account that has no Firestore profile", async () => {
  let signOutCalls = 0;
  const auth = {
    async signInWithEmailAndPassword() {
      return { user: { uid: "missing-profile" } };
    },
    async signOut() {
      signOutCalls += 1;
    }
  };
  const service = createAuthService({ auth, db: createMockDb(), firebase: fakeFirebase });

  await assert.rejects(
    service.login({
      email: "missing@example.com",
      password: "secret123"
    }),
    /profile is missing/
  );

  assert.equal(signOutCalls, 1);
});

test("login rejects a school code that does not match the Firebase profile", async () => {
  const db = createMockDb({
    users: {
      "school-student": {
        uid: "school-student",
        email: "school@example.com",
        role: "student",
        schoolId: "correct-school"
      }
    }
  });
  let signOutCalls = 0;
  const auth = {
    async signInWithEmailAndPassword() {
      return { user: { uid: "school-student" } };
    },
    async signOut() {
      signOutCalls += 1;
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  await assert.rejects(
    service.login({
      email: "school@example.com",
      password: "secret123",
      schoolCode: "wrong-school"
    }),
    error => error.code === "auth/school-code-mismatch"
  );

  assert.equal(signOutCalls, 1);
});

test("login accepts legacy profiles that still use schoolKey", async () => {
  const db = createMockDb({
    users: {
      "legacy-school-student": {
        uid: "legacy-school-student",
        email: "legacy-school@example.com",
        role: "student",
        schoolKey: "legacy-school",
        schoolUsername: "legacy school"
      }
    }
  });
  const auth = {
    async signInWithEmailAndPassword() {
      return { user: { uid: "legacy-school-student" } };
    }
  };
  const service = createAuthService({ auth, db, firebase: fakeFirebase });

  const profile = await service.login({
    email: "legacy-school@example.com",
    password: "secret123",
    schoolCode: "legacy school"
  });

  assert.equal(profile.uid, "legacy-school-student");
});

test("progress sync succeeds when a legacy member mirror is missing", async () => {
  const db = createMockDb({
    users: {
      "legacy-student": {
        uid: "legacy-student",
        email: "legacy@example.com",
        role: "student",
        schoolId: "legacy-school"
      }
    }
  });
  const service = createAuthService({ auth: {}, db, firebase: fakeFirebase });

  await service.updateUserProgress({
    uid: "legacy-student",
    schoolId: "legacy-school",
    role: "student",
    stats: { xp: 20 },
    badges: ["first-save"]
  });

  assert.deepEqual(
    db.writes.map(write => write.path),
    ["users/legacy-student"]
  );
  assert.deepEqual(db.users["legacy-student"].stats, { xp: 20 });
});
