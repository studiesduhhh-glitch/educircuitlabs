import test from "node:test";
import assert from "node:assert/strict";
import { autoGradeProject, summarizeClassPerformance } from "../src/services/dashboard-service.js";
import { createGamificationService } from "../src/services/gamification-service.js";

test("summarizes teacher dashboard metrics", () => {
  const summary = summarizeClassPerformance([
    { ownerName: "Asha", status: "SUBMITTED", grade: "Not graded" },
    { ownerName: "Asha", status: "GRADED", grade: "92" },
    { ownerName: "Ravi", status: "GRADED", grade: "88" }
  ]);

  assert.equal(summary.submissionsCount, 3);
  assert.equal(summary.gradedCount, 2);
  assert.equal(summary.averageGrade, 90);
  assert.equal(summary.topPerformers[0].ownerName, "Asha");
});

test("awards xp and badges", () => {
  const gamification = createGamificationService();
  const saved = gamification.applyEvent(gamification.createEmptyStats(), "save");
  const submitted = gamification.applyEvent(saved.stats, "submit");
  const cleaned = gamification.applyEvent(submitted.stats, "cleanSimulation");

  assert.ok(cleaned.stats.xp > 0);
  assert.equal(cleaned.badges.includes("First Spark"), true);
  assert.equal(cleaned.badges.includes("Loop Master"), true);

  const shared = gamification.applyEvent(gamification.createEmptyStats(), "publicShare", { visibility: "public" });
  assert.equal(shared.stats.publicProjects, 1);
  assert.equal(shared.badges.includes("Showcase Star"), true);
});

test("ranks weekly students and schools", () => {
  const gamification = createGamificationService();
  const date = new Date("2026-04-15T00:00:00Z");
  const weekKey = gamification.getWeekKey(date);
  const users = [
    { name: "Asha", role: "student", schoolId: "stem", school: "STEM Academy", stats: { xp: 200, weeklyXp: 50, weekKey } },
    { name: "Ravi", role: "student", schoolId: "stem", school: "STEM Academy", stats: { xp: 120, weeklyXp: 75, weekKey } },
    { name: "Mina", role: "student", schoolId: "nova", school: "Nova School", stats: { xp: 300, weeklyXp: 90, weekKey } }
  ];

  const students = gamification.rankWeeklyLeaderboard(users.slice(0, 2), date);
  const schools = gamification.rankSchools(users, date);

  assert.equal(students[0].name, "Ravi");
  assert.equal(schools[0].school, "STEM Academy");
});

test("auto-grades projects using correctness, logic, and safety", () => {
  const grade = autoGradeProject(
    {
      items: [{ type: "Battery" }, { type: "LED" }],
      logic: ["ON", "WAIT 1s", "OFF"]
    },
    {
      outputs: { led: { active: true } },
      diagnostics: [
        {
          severity: "warning",
          title: "LED Needs A Resistor",
          suggestion: "Add a resistor in series with the LED."
        }
      ]
    }
  );

  assert.equal(Number.isInteger(grade.totalScore), true);
  assert.equal(grade.breakdown.logic > 0, true);
  assert.match(grade.feedback, /resistor/i);
});
