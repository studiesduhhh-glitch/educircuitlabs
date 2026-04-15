import test from "node:test";
import assert from "node:assert/strict";
import { buildCoachFeedback, buildHumanReadableDebugReport, buildTeacherStyleReply } from "../src/core/ai-debugger.js";

function createItem(id, type, extras = {}) {
  return {
    id,
    type,
    ports: ["negative", "positive"],
    ...extras
  };
}

test("coach feedback explains a safe circuit conversationally", () => {
  const report = buildHumanReadableDebugReport({
    items: [
      createItem("battery-1", "Battery", { voltage: 3 }),
      createItem("resistor-1", "Resistor"),
      createItem("led-1", "LED")
    ],
    wires: [
      { from: { itemId: "battery-1", port: "positive" }, to: { itemId: "resistor-1", port: "positive" } },
      { from: { itemId: "resistor-1", port: "negative" }, to: { itemId: "led-1", port: "positive" } },
      { from: { itemId: "led-1", port: "negative" }, to: { itemId: "battery-1", port: "negative" } }
    ],
    defaultBatteryVoltage: 3
  });

  assert.equal(report.coach.health, "safe");
  assert.match(report.narrative, /Efficiency score/i);
  assert.equal(report.coach.efficiencyScore > 70, true);
});

test("coach feedback surfaces safety warnings first", () => {
  const coach = buildCoachFeedback({
    qualityScore: 50,
    outputs: { led: { intensityPercent: 0 }, motor: { intensityPercent: 0 }, buzzer: { intensityPercent: 0 } },
    diagnostics: [
      {
        type: "short_circuit",
        severity: "error",
        message: "Battery positive reaches battery negative through conductors.",
        suggestion: "Add a load before reconnecting the battery."
      }
    ],
    primaryFinding: {
      suggestion: "Add a load before reconnecting the battery."
    }
  });

  assert.equal(coach.health, "danger");
  assert.match(coach.headline, /safety/i);
  assert.equal(coach.safetyWarnings.length, 1);
});

test("AI teacher gives precise circuit coach answers", () => {
  const reply = buildTeacherStyleReply(
    "Give me a precise circuit coach report",
    {
      items: [
        createItem("battery-1", "Battery", { voltage: 3 }),
        createItem("led-1", "LED")
      ],
      wires: [
        { from: { itemId: "battery-1", port: "positive" }, to: { itemId: "led-1", port: "positive" } },
        { from: { itemId: "led-1", port: "negative" }, to: { itemId: "battery-1", port: "negative" } }
      ],
      defaultBatteryVoltage: 3
    },
    "1 Battery, 1 LED. 2 wires connected."
  );

  assert.match(reply, /Most precise finding/i);
  assert.match(reply, /LED Needs A Resistor/i);
  assert.match(reply, /Efficiency score/i);
});

test("AI teacher supports interactive quiz prompts", () => {
  const reply = buildTeacherStyleReply("quiz me", {
    items: [],
    wires: [],
    defaultBatteryVoltage: 5
  });

  assert.match(reply, /general quiz/i);
  assert.match(reply, /Reply with your answers/i);
});

test("AI teacher answers general science questions without forcing circuit debug", () => {
  const reply = buildTeacherStyleReply("why is the sky blue?", {
    items: [],
    wires: [],
    defaultBatteryVoltage: 5
  });

  assert.match(reply, /scatters/i);
  assert.match(reply, /blue light/i);
  assert.doesNotMatch(reply, /Circuit Coach/i);
});

test("AI teacher handles general writing prompts", () => {
  const reply = buildTeacherStyleReply("write a short paragraph about teamwork", {
    items: [],
    wires: [],
    defaultBatteryVoltage: 5
  });

  assert.match(reply, /clean draft/i);
  assert.match(reply, /teamwork/i);
  assert.doesNotMatch(reply, /Circuit Coach/i);
});

test("AI teacher can solve simple math prompts", () => {
  const reply = buildTeacherStyleReply("what is 15% of 80?", {
    items: [],
    wires: [],
    defaultBatteryVoltage: 5
  });

  assert.match(reply, /answer is 12/i);
  assert.match(reply, /15% of 80/i);
});

test("AI teacher keeps live facts honest", () => {
  const reply = buildTeacherStyleReply("what is the latest news today?", {
    items: [],
    wires: [],
    defaultBatteryVoltage: 5
  });

  assert.match(reply, /does not have live internet/i);
  assert.match(reply, /verify with a live source/i);
});
