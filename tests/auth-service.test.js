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
