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

  const lines = reply.split("\n");
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Status: Partial$/);
  assert.match(lines[1], /^Why: The LED is connected without a resistor\.$/);
  assert.match(lines[2], /^Fix: Add a resistor in series with the LED\.$/);
  assert.match(lines[3], /^Tip: A resistor limits current and helps protect an LED\.$/);
});

test("AI teacher gives four-line help for an incomplete workspace", () => {
  const reply = buildTeacherStyleReply("quiz me", {
    items: [],
    wires: [],
    defaultBatteryVoltage: 5
  });

  const lines = reply.split("\n");
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Status: Partial$/);
  assert.match(lines[1], /^Why: No Battery or component is on the workspace yet\.$/);
  assert.match(lines[2], /^Fix: Add a Battery, then add an LED or Motor\.$/);
  assert.match(lines[3], /^Tip: A circuit starts with a power source and one load\.$/);
});

test("AI teacher identifies short circuits with an exact fix", () => {
  const reply = buildTeacherStyleReply("why is this not working?", {
    items: [
      createItem("battery-1", "Battery", { voltage: 9 }),
      createItem("switch-1", "Switch", { isClosed: true })
    ],
    wires: [
      { from: { itemId: "battery-1", port: "positive" }, to: { itemId: "switch-1", port: "positive" } },
      { from: { itemId: "switch-1", port: "negative" }, to: { itemId: "battery-1", port: "negative" } }
    ],
    defaultBatteryVoltage: 9
  });

  const lines = reply.split("\n");
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Status: Not Working$/);
  assert.match(lines[1], /^Why: Battery positive is reaching Battery negative without a load\.$/);
  assert.match(lines[2], /^Fix: Break the direct wire path and place an LED, Motor, or Buzzer in the loop\.$/);
  assert.match(lines[3], /^Tip: A load like an LED or motor must sit in the path to use power safely\.$/);
});

test("AI teacher confirms a safe working circuit and suggests an upgrade", () => {
  const reply = buildTeacherStyleReply("how is my circuit?", {
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
    defaultBatteryVoltage: 3,
    logic: []
  });

  const lines = reply.split("\n");
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Status: Working$/);
  assert.match(lines[1], /^Why: Battery, Resistor, and LED form a closed loop and the circuit is running safely\.$/);
  assert.match(lines[2], /^Fix: Add a Switch before the LED so you can control it\.$/);
  assert.match(lines[3], /^Tip: An LED needs correct polarity, enough voltage, and a resistor\.$/);
});
