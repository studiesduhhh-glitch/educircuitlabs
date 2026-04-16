import test from "node:test";
import assert from "node:assert/strict";
import { formatAuthError } from "../src/services/auth-service.js";

test("maps invalid admin credentials to an access model hint", () => {
  const message = formatAuthError(
    { code: "auth/invalid-credential", message: "Firebase: invalid credential" },
    { mode: "login", role: "admin" }
  );

  assert.match(message, /No matching admin account/);
  assert.match(message, /Access Model to Create/);
});

test("maps duplicate email to login guidance", () => {
  const message = formatAuthError(
    { code: "auth/email-already-in-use", message: "Firebase: email already in use" },
    { mode: "create", role: "student" }
  );

  assert.match(message, /already has an Educircuit account/);
  assert.match(message, /Access Model to Log in/);
});
