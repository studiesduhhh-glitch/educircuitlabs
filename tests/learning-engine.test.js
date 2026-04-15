import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateLearningState,
  validateCircuit,
  validateChallenge
} from "../src/core/learning-engine.js";
import { analyzeCircuit } from "../src/core/circuit-engine.js";

const ledCircuit = {
  defaultBatteryVoltage: 3,
  items: [
    { id: "battery", type: "Battery", ports: ["negative", "positive"], voltage: 3 },
    { id: "resistor", type: "Resistor", ports: ["negative", "positive"] },
    { id: "led", type: "LED", ports: ["negative", "positive"] }
  ],
  wires: [
    { id: "w1", from: { itemId: "battery", port: "positive" }, to: { itemId: "resistor", port: "positive" } },
    { id: "w2", from: { itemId: "resistor", port: "negative" }, to: { itemId: "led", port: "positive" } },
    { id: "w3", from: { itemId: "led", port: "negative" }, to: { itemId: "battery", port: "negative" } }
  ],
  logic: []
};

const motorCircuit = {
  defaultBatteryVoltage: 6,
  items: [
    { id: "battery", type: "Battery", ports: ["negative", "positive"], voltage: 6 },
    { id: "switch", type: "Switch", ports: ["negative", "positive"], isClosed: true },
    { id: "motor", type: "Motor", ports: ["negative", "positive"] }
  ],
  wires: [
    { id: "w1", from: { itemId: "battery", port: "positive" }, to: { itemId: "switch", port: "positive" } },
    { id: "w2", from: { itemId: "switch", port: "negative" }, to: { itemId: "motor", port: "positive" } },
    { id: "w3", from: { itemId: "motor", port: "negative" }, to: { itemId: "battery", port: "negative" } }
  ],
  logic: ["ON"]
};

test("validates a complete LED learning challenge", () => {
  const report = analyzeCircuit(ledCircuit);
  const validation = validateCircuit(ledCircuit, report);
  const challenge = validateChallenge(ledCircuit, report, "led-circuit");
  const learning = evaluateLearningState(ledCircuit, { report, challengeId: "led-circuit" });

  assert.equal(validation.isCorrect, true);
  assert.equal(challenge.passed, true);
  assert.equal(learning.score.total >= 90, true);
  assert.equal(learning.hint.level, "success");
});

test("gives a smart hint when the loop is open", () => {
  const openCircuit = {
    ...ledCircuit,
    wires: ledCircuit.wires.slice(0, 2)
  };
  const learning = evaluateLearningState(openCircuit, { challengeId: "led-circuit" });

  assert.equal(learning.circuit.isCorrect, false);
  assert.equal(learning.challenge.passed, false);
  assert.match(learning.hint.message, /Close the loop/i);
  assert.equal(learning.score.total < 90, true);
});

test("checks motor challenge components, output, and ON logic", () => {
  const learning = evaluateLearningState(motorCircuit, { challengeId: "motor-circuit" });

  assert.equal(learning.challenge.passed, true);
  assert.equal(learning.circuit.activeOutputs.includes("motor"), true);
  assert.equal(learning.score.total >= 90, true);
});

test("reports missing challenge requirements clearly", () => {
  const learning = evaluateLearningState(ledCircuit, { challengeId: "motor-circuit" });

  assert.equal(learning.challenge.passed, false);
  assert.deepEqual(learning.challenge.missingComponents, ["Switch", "Motor"]);
  assert.equal(learning.challenge.missingOutputs.includes("motor"), true);
  assert.match(learning.challenge.message, /Switch, Motor/);
});
