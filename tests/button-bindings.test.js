import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const runtimeJs = fs.readFileSync(new URL("../src/app/runtime.js", import.meta.url), "utf8");
const fallbackJs = fs.readFileSync(new URL("../src/app/landing-fallback.js", import.meta.url), "utf8");
const upgradeJs = fs.readFileSync(new URL("../src/ui/upgrade-controller.js", import.meta.url), "utf8");
const allJs = `${runtimeJs}\n${fallbackJs}\n${upgradeJs}`;

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
  assert.doesNotMatch(indexHtml, /<script>\s*const state\s*=/);
  assert.match(indexHtml, /<link rel="stylesheet" href="\.\/styles\/app\.css\?v=20260416-compact1" \/>/);
  assert.match(indexHtml, /<link rel="stylesheet" href="\.\/styles\/upgrade\.css\?v=20260416-compact1" \/>/);
  assert.match(indexHtml, /<script src="\.\/src\/app\/runtime\.js\?v=20260416-compact1"><\/script>/);
  assert.match(upgradeJs, /applyTheme\(savedTheme \|\| "light"\)/);
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

test("login step requires account details and demo buttons do not bypass auth", () => {
  assert.match(runtimeJs, /const loginEmail = document\.getElementById\("loginEmail"\)/);
  assert.equal(runtimeJs.includes("/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/"), true);
  assert.match(fallbackJs, /validateFallbackStepOne/);
  assert.match(fallbackJs, /event\.target\.closest\("#loginNextStepBtn"\)/);
  assert.match(fallbackJs, /handleLoginNextStep\(\)/);
  assert.match(upgradeJs, /fillDemoCredentials/);
  assert.match(upgradeJs, /loginEmail\.classList\.add\("error"\)/);
  assert.doesNotMatch(upgradeJs, /loaded in demo mode/);
  assert.doesNotMatch(upgradeJs, /applyAuthenticatedProfile\(demoProfile\.uid/);
});
