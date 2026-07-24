import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appCss = fs.readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const upgradeCss = fs.readFileSync(new URL("../styles/upgrade.css", import.meta.url), "utf8");
const runtimeJs = fs.readFileSync(new URL("../src/app/runtime.js", import.meta.url), "utf8");
const fallbackJs = fs.readFileSync(new URL("../src/app/landing-fallback.js", import.meta.url), "utf8");
const upgradeJs = fs.readFileSync(new URL("../src/ui/upgrade-controller.js", import.meta.url), "utf8");
const storageGuardJs = fs.readFileSync(new URL("../src/app/storage-guard.js", import.meta.url), "utf8");
const projectServiceJs = fs.readFileSync(new URL("../src/services/project-service.js", import.meta.url), "utf8");
const assignmentServiceJs = fs.readFileSync(new URL("../src/services/assignment-service.js", import.meta.url), "utf8");
const vivaEngineJs = fs.readFileSync(new URL("../src/core/viva-engine.js", import.meta.url), "utf8");
const classroomEngineJs = fs.readFileSync(new URL("../src/core/classroom-engine.js", import.meta.url), "utf8");
const mainJs = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const firebaseJson = fs.readFileSync(new URL("../firebase.json", import.meta.url), "utf8");
const firestoreRules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const allJs = `${runtimeJs}\n${fallbackJs}\n${upgradeJs}\n${assignmentServiceJs}\n${vivaEngineJs}\n${classroomEngineJs}\n${mainJs}`;

function getAttr(attrs, name) {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] || "";
}

function buttonRecords() {
  return [...indexHtml.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
    .map((match, index) => ({
      index,
      attrs: match[1],
      label: match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    }));
}

function hasIdListener(id) {
  return allJs.includes(`getElementById("${id}").addEventListener`) ||
    allJs.includes(`getElementById("${id}")?.addEventListener`) ||
    allJs.includes(`replaceButton(document.getElementById("${id}")`) ||
    allJs.includes(`const ${id} = document.getElementById("${id}")`);
}

test("all static buttons have an event binding path", () => {
  const missing = buttonRecords().filter(button => {
    const id = getAttr(button.attrs, "id");
    const uiAction = getAttr(button.attrs, "data-ui-action");
    const aiPrompt = getAttr(button.attrs, "data-ai-prompt");
    const landingLab = getAttr(button.attrs, "data-landing-lab");
    const scrollTarget = getAttr(button.attrs, "data-scroll-target");
    const themeToggle = button.attrs.includes("data-theme-toggle");

    if (id && hasIdListener(id)) return false;
    if (uiAction && runtimeJs.includes(`"${uiAction}"`)) return false;
    if (aiPrompt && runtimeJs.includes("[data-ai-prompt]")) return false;
    if (landingLab && fallbackJs.includes("[data-landing-lab]")) return false;
    if (scrollTarget && fallbackJs.includes("[data-scroll-target]")) return false;
    if (themeToggle && fallbackJs.includes("[data-theme-toggle]")) return false;

    return true;
  });

  assert.deepEqual(missing.map(button => `${button.index}: ${button.label}`), []);
});

test("deployed html stays clean and modular", () => {
  assert.doesNotMatch(indexHtml, /<<<<<<<|=======|>>>>>>>/);
  assert.doesNotMatch(`${indexHtml}\n${allJs}`, /hhere/i);
  assert.doesNotMatch(`${indexHtml}\n${mainJs}\n${upgradeJs}`, /20260419-ai-teacher1|20260719-auth-fix1/);
  assert.doesNotMatch(indexHtml, /<script>\s*const state\s*=/);
  assert.match(indexHtml, /<blockquote class="landing-founder-card">/);
  assert.match(indexHtml, /<cite>Head Developer and Designer<\/cite>/);
  assert.match(indexHtml, /<span class="founder-mission">Building technology that empowers students to learn, create, and innovate through Educircuit\.<\/span>/);
  assert.match(indexHtml, /<link rel="icon" href="\/favicon\.ico" sizes="any" \/>/);
  assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32\.png" \/>/);
  assert.match(indexHtml, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png" \/>/);
  assert.match(indexHtml, /<link rel="stylesheet" href="\.\/styles\/app\.css\?v=20260724-remember-auth1" \/>/);
  assert.match(indexHtml, /<link rel="stylesheet" href="\.\/styles\/upgrade\.css\?v=20260724-remember-auth1" \/>/);
  assert.match(indexHtml, /<script src="\.\/src\/app\/storage-guard\.js\?v=20260724-remember-auth1"><\/script>/);
  assert.match(indexHtml, /<script src="\.\/src\/app\/runtime\.js\?v=20260724-remember-auth1"><\/script>/);
  assert.match(upgradeJs, /applyTheme\(savedTheme \|\| "light"\)/);
  assert.match(mainJs, /createAssignmentService/);
});

test("active app code does not write browser storage", () => {
  assert.doesNotMatch(allJs, /\blocalStorage\b/);
  assert.doesNotMatch(allJs, /\bsessionStorage\b/);
  assert.doesNotMatch(allJs, /stem_schools/);
  assert.match(storageGuardJs, /Storage\?\.prototype/);
  assert.match(storageGuardJs, /blockedWrites\.push/);
  assert.match(storageGuardJs, /firebase:authUser:/);
  assert.match(storageGuardJs, /firebaseAuthPersistenceAllowed/);
  assert.doesNotMatch(storageGuardJs, /stem_schools|project|password|email/i);
});

test("production app avoids blocking browser dialogs and global Firestore scans", () => {
  assert.doesNotMatch(allJs, /\balert\(/);
  assert.doesNotMatch(allJs, /window\.alert/);
  assert.doesNotMatch(allJs, /db\.collection\("projects"\)\.add/);
  assert.doesNotMatch(upgradeJs, /db\.collection\("users"\)\.get/);
  assert.match(runtimeJs, /db\.collection\("schools"\)\.doc\(schoolId\)\.collection\("projects"\)\.add/);
});

test("Firebase deployment files are present and scoped", () => {
  assert.match(firebaseJson, /"rules": "firestore\.rules"/);
  assert.match(firebaseJson, /"hosting"/);
  assert.match(firestoreRules, /match \/schools\/\{schoolId\}/);
  assert.match(firestoreRules, /match \/projects\/\{projectId\}/);
  assert.match(firestoreRules, /publicLikeOnly/);
  assert.match(firestoreRules, /allow delete: if false/);
});

test("language picker includes Indian languages in native scripts", () => {
  assert.match(indexHtml, /id="languageSelect"/);
  assert.match(runtimeJs, /LANGUAGE_OPTIONS/);
  assert.match(runtimeJs, /हिन्दी/);
  assert.match(runtimeJs, /தமிழ்/);
  assert.match(runtimeJs, /తెలుగు/);
  assert.match(runtimeJs, /ಕನ್ನಡ/);
  assert.match(runtimeJs, /മലയാളം/);
  assert.match(runtimeJs, /اردو/);
  assert.match(runtimeJs, /ꯃꯤꯇꯩꯂꯣꯟ/);
  assert.match(runtimeJs, /document\.getElementById\("languageSelect"\)\?\.addEventListener\("change"/);
});

test("dynamic project and AI buttons are delegated", () => {
  assert.match(runtimeJs, /\[data-project-action\]/);
  assert.match(runtimeJs, /\[data-student-project-action\]/);
  assert.match(runtimeJs, /\[data-ai-prompt\]/);
  assert.match(upgradeJs, /\[data-quick-start\]/);
  assert.match(upgradeJs, /\[data-action='open'\]/);
  assert.match(upgradeJs, /\[data-action='auto-grade'\]/);
  assert.match(upgradeJs, /\[data-action='preview'\]/);
  assert.match(upgradeJs, /\[data-action='clone'\]/);
  assert.match(upgradeJs, /\[data-action='like'\]/);
});

test("project pages split saved, graded, and explore-visible work", () => {
  assert.match(runtimeJs, /function isGradedProject/);
  assert.match(runtimeJs, /\.filter\(\(\{ proj \}\) => !isGradedProject\(proj\)\)/);
  assert.match(upgradeJs, /function installSavedProjectsPortal/);
  assert.match(upgradeJs, /Log in to save projects to Firebase/);
  assert.match(upgradeJs, /Log in to submit projects to Firebase/);
  assert.match(upgradeJs, /\[data-ui-action='open-projects'\]/);
  assert.match(upgradeJs, /\[data-ui-action='open-student-projects'\]/);
  assert.match(upgradeJs, /event\.stopImmediatePropagation\(\)/);
  assert.match(upgradeJs, /function isReviewedProject/);
  assert.match(upgradeJs, /filter\(project => !isReviewedProject\(project\)\)/);
  assert.match(upgradeJs, /filter\(project => isReviewedProject\(project\)\)/);
  assert.match(upgradeJs, /visibility === "public"/);
  assert.match(projectServiceJs, /visibility = null/);
  assert.match(projectServiceJs, /payload\.visibility = visibility/);
  assert.match(projectServiceJs, /payload\.cloneable = visibility === "public"/);
});

test("login step is explicit and demo buttons open the simulator directly", () => {
  assert.match(indexHtml, /id="authCreateModeBtn"/);
  assert.match(indexHtml, /id="authLoginModeBtn"/);
  assert.match(indexHtml, /id="googleAuthBtn"/);
  assert.match(indexHtml, /id="rememberLogin"/);
  assert.match(indexHtml, /Stay signed in on this private device\./);
  assert.doesNotMatch(indexHtml, new RegExp("loginAccess" + "Model"));
  assert.doesNotMatch(indexHtml, /Access\s+Model/);
  assert.match(runtimeJs, /const loginEmail = document\.getElementById\("loginEmail"\)/);
  assert.equal(runtimeJs.includes("/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/"), true);
  assert.match(fallbackJs, /EducircuitAuthFlow/);
  assert.match(fallbackJs, /event\.target\.closest\("#authLoginModeBtn"\)/);
  assert.match(fallbackJs, /const activeEnterBtn = document\.getElementById\("enterBtn"\)/);
  assert.match(runtimeJs, /function openAuthMode/);
  assert.match(runtimeJs, /Persistence\?\.LOCAL/);
  assert.match(runtimeJs, /Persistence\?\.SESSION/);
  assert.match(runtimeJs, /configureAuthPersistence\(rememberLogin\.checked\)/);
  assert.match(runtimeJs, /getAuthMode\(\) === "create"/);
  assert.match(runtimeJs, /function buildDemoProfile/);
  assert.match(runtimeJs, /demoMode:\s*false/);
  assert.match(runtimeJs, /state\.demoMode = true/);
  assert.match(runtimeJs, /applyAuthenticatedProfile\(profile\.uid,\s*profile,\s*\{\s*demo:\s*true\s*\}\)/);
  assert.match(runtimeJs, /String\(uid \|\| ""\)\.startsWith\("demo-"\)/);
  assert.match(upgradeJs, /fillDemoCredentials/);
  assert.match(upgradeJs, /handleGoogleLogin/);
  assert.match(upgradeJs, /services\.auth\.configurePersistence\(Boolean\(rememberLogin\?\.checked\)\)/);
  assert.match(upgradeJs, /aria-busy/);
  assert.match(upgradeJs, /loginEmail\.classList\.add\("error"\)/);
  assert.match(upgradeJs, /loaded in demo mode/);
});

test("runtime boots safely when Firebase SDK is unavailable", () => {
  assert.match(runtimeJs, /function createOfflineFirebaseFallback/);
  assert.match(runtimeJs, /Firebase SDK is not available; Educircuit is running in offline demo mode/);
  assert.match(runtimeJs, /const firebaseApi = window\.firebase\?\.initializeApp/);
  assert.match(runtimeJs, /window\.firebase = firebaseApi/);
  assert.match(runtimeJs, /firebaseApi\.auth\.GoogleAuthProvider/);
  assert.match(runtimeJs, /firebaseApi\.firestore\.FieldValue\.arrayUnion/);
  assert.doesNotMatch(runtimeJs, /\bfirebase\.auth/);
  assert.doesNotMatch(runtimeJs, /\bfirebase\.firestore/);
});

test("landing launch opens the auth chooser for signed-out users", () => {
  assert.match(indexHtml, /data-ui-action="enter-landing"/);
  assert.match(runtimeJs, /function showLoginChooser/);
  assert.match(runtimeJs, /function enterLanding\(\)/);
  assert.match(runtimeJs, /document\.getElementById\("landingPage"\)\.classList\.add\("hidden"\)/);
  assert.match(runtimeJs, /showLoginChooser\(\)/);
  assert.match(runtimeJs, /loginCard\?\.setAttribute\("data-step", "1"\)/);
});

test("login mode hides signup-only fields after field layout rules", () => {
  const fieldRuleIndex = appCss.lastIndexOf(".field{");
  const loginHideRuleIndex = appCss.lastIndexOf(".login-screen .premium-login-card[data-auth-mode=\"login\"] .auth-create-field");

  assert.ok(fieldRuleIndex > -1);
  assert.ok(loginHideRuleIndex > fieldRuleIndex);
  assert.match(appCss.slice(loginHideRuleIndex), /display:none/);
});

test("legacy auth fallback does not store shared school passwords", () => {
  assert.doesNotMatch(runtimeJs, /schoolPassword:\s*payload\.schoolPassword/);
  assert.doesNotMatch(runtimeJs, /schoolData\.schoolPassword/);
  assert.doesNotMatch(runtimeJs, /buildSchoolAuthEmail/);
  assert.match(runtimeJs, /createUserWithEmailAndPassword\(payload\.email,\s*payload\.schoolPassword\)/);
  assert.match(runtimeJs, /selfServiceSignup/);
});

test("manual switch controls and voice coach are wired", () => {
  assert.match(runtimeJs, /function toggleSwitchItem/);
  assert.match(runtimeJs, /switch-toggle-control/);
  assert.match(runtimeJs, /aria-pressed/);
  assert.match(runtimeJs, /usesControlLogic/);
  assert.match(upgradeJs, /voiceCoachBtn/);
  assert.match(upgradeJs, /voiceCoachSelect/);
  assert.match(upgradeJs, /CURATED_VOICE_GROUPS/);
  assert.match(upgradeJs, /const DEFAULT_VOICE_KEY = "en-gb"/);
  assert.match(upgradeJs, /const DEFAULT_VOICE_LANG = "en-GB"/);
  assert.match(upgradeJs, /\["en-gb", "UK English"\]/);
  assert.match(upgradeJs, /American English/);
  assert.match(upgradeJs, /UK English/);
  assert.match(upgradeJs, /Indian Languages/);
  assert.match(upgradeJs, /हिन्दी/);
  assert.match(upgradeJs, /தமிழ்/);
  assert.match(upgradeJs, /کٲشُر/);
  assert.match(upgradeJs, /ꯃꯤꯇꯩꯂꯣꯟ/);
  assert.match(upgradeJs, /getSpeechVoices/);
  assert.match(upgradeJs, /getCuratedVoiceOptions/);
  assert.match(upgradeJs, /getPreferredVoiceOption/);
  assert.match(upgradeJs, /getSelectedVoice/);
  assert.match(upgradeJs, /UK English default/);
  assert.match(upgradeJs, /SpeechSynthesisUtterance/);
  assert.match(upgradeJs, /utterance\.voice = selectedVoice/);
  assert.match(upgradeJs, /selectedVoice\?\.lang \|\| DEFAULT_VOICE_LANG/);
  assert.match(upgradeJs, /speakCircuitCoach\(report, app\)/);
  assert.match(upgradeJs, /voiceConversationBtn/);
  assert.match(upgradeJs, /SpeechRecognition \|\| window\.webkitSpeechRecognition/);
});

test("dark mode has a polished simulator surface system", () => {
  assert.match(upgradeCss, /\.dark-mode \{\s*--bg:#0b0f14/);
  assert.match(upgradeCss, /body\.dark-mode \{\s*background:/);
  assert.match(upgradeCss, /\.dark-mode \.topbar,\s*\.dark-mode \.ai-topbar/);
  assert.match(upgradeCss, /\.dark-mode \.workspace-area \{/);
  assert.match(upgradeCss, /\.dark-mode \.logic-dock \{/);
  assert.match(upgradeCss, /\.dark-mode \.component-card,\s*\.dark-mode \.example-item,\s*\.dark-mode \.canvas-item/);
  assert.match(upgradeCss, /\.dark-mode \.component-card::after \{\s*display:none/);
  assert.match(upgradeCss, /body\.dark-mode\.upgrade-ready button\.secondary/);
  assert.match(upgradeCss, /\.dark-mode \.voice-coach-btn\[aria-pressed="true"\]/);
});

test("classroom roadmap features are connected to the current simulator", () => {
  assert.match(upgradeJs, /installAssignmentSystem/);
  assert.match(upgradeJs, /guidedLabModeCard/);
  assert.match(upgradeJs, /liveMultimeterCard/);
  assert.match(upgradeJs, /replayBuildCard/);
  assert.match(upgradeJs, /aiVivaCard/);
  assert.match(upgradeJs, /buildEnhancedProjectSnapshot/);
  assert.match(upgradeJs, /recordBuildHistory/);
  assert.match(upgradeJs, /services\.assignments/);
  assert.match(projectServiceJs, /assignmentId/);
  assert.match(projectServiceJs, /assignmentTitle/);
  assert.match(projectServiceJs, /challengeId/);
  assert.match(assignmentServiceJs, /createAssignmentService/);
  assert.match(vivaEngineJs, /buildVivaQuestions/);
  assert.match(vivaEngineJs, /evaluateVivaAnswer/);
  assert.match(classroomEngineJs, /buildMultimeterReading/);
  assert.match(classroomEngineJs, /buildReplayEntry/);
});
