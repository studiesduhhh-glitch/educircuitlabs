import test from "node:test";
import assert from "node:assert/strict";

import { analyzeCircuit } from "../src/core/circuit-engine.js";
import {
  buildGuidedLabSteps,
  buildMultimeterReading,
  buildReplayEntry
} from "../src/core/classroom-engine.js";

const motorSnapshot = {
  name: "Motor Lab",
  challengeId: "motor-circuit",
  defaultBatteryVoltage: 6,
  items: [
    { id: "battery-1", type: "Battery", ports: ["negative", "positive"], voltage: 6 },
    { id: "switch-1", type: "Switch", ports: ["negative", "positive"], isClosed: true },
    { id: "motor-1", type: "Motor", ports: ["negative", "positive"] }
  ],
  wires: [
    { id: "w1", from: { itemId: "battery-1", port: "positive" }, to: { itemId: "switch-1", port: "positive" } },
    { id: "w2", from: { itemId: "switch-1", port: "negative" }, to: { itemId: "motor-1", port: "positive" } },
    { id: "w3", from: { itemId: "motor-1", port: "negative" }, to: { itemId: "battery-1", port: "negative" } }
  ],
  logic: ["ON"]
};

test("replay entries describe build changes in human language", () => {
  const before = {
    ...motorSnapshot,
    items: motorSnapshot.items.slice(0, 2),
    wires: motorSnapshot.wires.slice(0, 1),
    logic: []
  };
  const entry = buildReplayEntry(motorSnapshot, before);
  assert.match(entry.label, /(Added|Connected|Updated|Moved|Toggled)/);
});

test("guided lab steps expose pass/fail items cleanly", () => {
  const steps = buildGuidedLabSteps({
    challenge: {
      requirements: [
        { id: "battery", label: "Add Battery", passed: true },
        { id: "switch", label: "Use Switch", passed: false }
      ]
    }
  }, { title: "Motor Assignment" });

  assert.equal(steps[0].label, "Motor Assignment");
  assert.equal(steps[2].passed, false);
});

test("multimeter reading reports live component voltage", () => {
  const report = analyzeCircuit(motorSnapshot);
  const reading = buildMultimeterReading(motorSnapshot, report, {
    type: "item",
    id: "motor-1"
  });

  assert.equal(reading.title, "Motor");
  assert.match(reading.voltage, /V/);
});
