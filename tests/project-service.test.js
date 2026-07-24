import test from "node:test";
import assert from "node:assert/strict";
import { createProjectService } from "../src/services/project-service.js";

function createSaveDb() {
  const writes = [];

  return {
    writes,
    collection(name) {
      assert.equal(name, "schools");
      return {
        doc(schoolId) {
          return {
            collection(collectionName) {
              assert.equal(collectionName, "projects");
              return {
                doc(projectId) {
                  const id = projectId || "project-1";
                  return {
                    id,
                    async set(payload, options) {
                      writes.push({ schoolId, id, payload, options });
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
}

test("saved projects are always public and cloneable", async () => {
  const db = createSaveDb();
  const service = createProjectService({ db, firebase: {} });

  await service.saveProject({
    schoolId: "school-1",
    owner: {
      uid: "student-1",
      name: "Student One",
      role: "student",
      className: "10-A"
    },
    projectSnapshot: {
      name: "LED Circuit",
      items: [],
      wires: [],
      logic: []
    },
    analysis: null,
    visibility: "private"
  });

  assert.equal(db.writes.length, 2);
  const sourceWrite = db.writes.find(write => write.schoolId === "school-1");
  const galleryWrite = db.writes.find(write => write.schoolId === "public-gallery");
  assert.equal(sourceWrite.payload.visibility, "public");
  assert.equal(sourceWrite.payload.cloneable, true);
  assert.equal(galleryWrite.payload.visibility, "public");
  assert.equal(galleryWrite.payload.sourceSchoolId, "school-1");
  assert.equal(galleryWrite.payload.sourceProjectId, "project-1");
  assert.equal("grade" in galleryWrite.payload, false);
  assert.equal("feedback" in galleryWrite.payload, false);
});

test("Firebase saves source and gallery projects in one atomic batch", async () => {
  const db = createSaveDb();
  const stagedWrites = [];
  let commitCalls = 0;
  db.batch = () => ({
    set(ref, payload, options) {
      stagedWrites.push({ ref, payload, options });
    },
    async commit() {
      commitCalls += 1;
    }
  });
  const service = createProjectService({ db, firebase: {} });

  await service.saveProject({
    schoolId: "school-atomic",
    owner: {
      uid: "student-atomic",
      name: "Atomic Student",
      role: "student"
    },
    projectSnapshot: {
      name: "Atomic LED",
      items: [],
      wires: [],
      logic: []
    },
    analysis: null
  });

  assert.equal(stagedWrites.length, 2);
  assert.equal(commitCalls, 1);
  assert.equal(db.writes.length, 0);
});

test("Explore loads public projects across schools and sorts newest first", async () => {
  const calls = [];
  const docs = [
    {
      id: "older",
      data: () => ({
        schoolId: "school-a",
        name: "Older",
        visibility: "public",
        updatedAt: { seconds: 10 }
      })
    },
    {
      id: "newer",
      data: () => ({
        schoolId: "school-b",
        name: "Newer",
        visibility: "public",
        updatedAt: { seconds: 20 }
      })
    }
  ];
  const db = {
    collection(name) {
      calls.push(["collection", name]);
      return {
        doc(schoolId) {
          calls.push(["doc", schoolId]);
          return {
            collection(collectionName) {
              calls.push(["subcollection", collectionName]);
              return {
                where(...args) {
                  calls.push(["where", ...args]);
                  return this;
                },
                async get() {
                  return { docs };
                }
              };
            }
          };
        }
      };
    }
  };
  const service = createProjectService({ db, firebase: {} });

  const projects = await service.listPublicProjects();

  assert.deepEqual(calls, [
    ["collection", "schools"],
    ["doc", "public-gallery"],
    ["subcollection", "projects"],
    ["where", "visibility", "==", "public"]
  ]);
  assert.deepEqual(projects.map(project => project.id), ["newer", "older"]);
});

test("deleting an Explore project targets only the public gallery copy", async () => {
  const deletes = [];
  const db = {
    collection(name) {
      assert.equal(name, "schools");
      return {
        doc(schoolId) {
          assert.equal(schoolId, "public-gallery");
          return {
            collection(collectionName) {
              assert.equal(collectionName, "projects");
              return {
                doc(projectId) {
                  return {
                    async delete() {
                      deletes.push(projectId);
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
  const service = createProjectService({ db, firebase: {} });

  await service.deletePublicProject("school-1--project-1");

  assert.deepEqual(deletes, ["school-1--project-1"]);
});

test("existing owner projects are upgraded and mirrored to the public gallery", async () => {
  const writes = [];
  const docs = [
    {
      id: "private-project",
      data: () => ({ id: "private-project", visibility: "private" }),
      ref: {
        async set(payload, options) {
          writes.push({ target: "source-private", payload, options });
        }
      }
    },
    {
      id: "public-project",
      data: () => ({ id: "public-project", visibility: "public" }),
      ref: {
        async set(payload, options) {
          writes.push({ target: "source-public", payload, options });
        }
      }
    }
  ];
  const db = {
    collection(name) {
      assert.equal(name, "schools");
      return {
        doc(schoolId) {
          return {
            collection(collectionName) {
              assert.equal(collectionName, "projects");
              if (schoolId === "public-gallery") {
                return {
                  doc(projectId) {
                    return {
                      async set(payload, options) {
                        writes.push({ target: `gallery:${projectId}`, payload, options });
                      }
                    };
                  }
                };
              }
              assert.equal(schoolId, "school-1");
              return {
                where(field, operator, value) {
                  assert.deepEqual([field, operator, value], ["ownerId", "==", "student-1"]);
                  return this;
                },
                async get() {
                  return { docs };
                }
              };
            }
          };
        }
      };
    }
  };
  const service = createProjectService({ db, firebase: {} });

  const publishedCount = await service.publishSavedProjects({
    schoolId: "school-1",
    ownerId: "student-1"
  });

  assert.equal(publishedCount, 2);
  const sourceWrites = writes.filter(write => write.target.startsWith("source-"));
  const galleryWrites = writes.filter(write => write.target.startsWith("gallery:"));
  assert.deepEqual(sourceWrites, [{
    target: "source-private",
    payload: {
      visibility: "public",
      cloneable: true,
      updatedAt: sourceWrites[0].payload.updatedAt
    },
    options: { merge: true }
  }]);
  assert.equal(galleryWrites.length, 2);
  assert.equal(galleryWrites[0].payload.schoolId, "public-gallery");
  assert.equal(galleryWrites[1].payload.schoolId, "public-gallery");
});
