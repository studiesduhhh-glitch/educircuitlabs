import { createAuthService } from "./services/auth-service.js?v=20260724-electron-party1";
import { createProjectService } from "./services/project-service.js?v=20260724-electron-party1";
import { createGamificationService } from "./services/gamification-service.js?v=20260724-electron-party1";
import { createAssignmentService } from "./services/assignment-service.js?v=20260724-electron-party1";
import { bootstrapUpgrade, installVisualPolish } from "./ui/upgrade-controller.js?v=20260724-electron-party1";

async function waitForLegacyApp() {
  if (typeof window === "undefined") {
    return null;
  }
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (window.educircuitApp?.state) {
      return window.educircuitApp;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Educircuit legacy runtime was not available in time.");
}

async function main() {
  const app = await waitForLegacyApp();
  if (!app) return;
  installVisualPolish(app);

  const firebase = window.firebase;

  if (!firebase || !app.db || !app.auth) {
    console.warn("Firebase runtime not available; data services are disabled, but visual UX is active.");
    return;
  }

  const services = {
    db: app.db,
    auth: createAuthService({
      auth: app.auth,
      db: app.db,
      firebase
    }),
    projects: createProjectService({
      db: app.db,
      firebase
    }),
    assignments: createAssignmentService({
      db: app.db,
      firebase
    }),
    gamification: createGamificationService()
  };

  window.EducircuitModules = services;
  await bootstrapUpgrade(app, services);
}

main().catch(error => {
  console.error("Educircuit upgrade bootstrap failed", error);
});
