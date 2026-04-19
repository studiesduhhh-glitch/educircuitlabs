import test from "node:test";
import assert from "node:assert/strict";

import {
  buildVivaQuestions,
  evaluateVivaAnswer,
  summarizeVivaSession
} from "../src/core/viva-engine.js";

const ledSnapshot = {
  challengeId: "led-circuit",
  defaultBatteryVoltage: 5,
  items: [
    { id: "battery-1", type: "Battery", ports: ["negative", "positive"], voltage: 5 },
    { id: "resistor-1", type: "Resistor", ports: ["negative", "positive"] },
    { id: "led-1", type: "LED", ports: ["negative", "positive"] }
  ],
  wires: [
    { id: "w1", from: { itemId: "battery-1", port: "positive" }, to: { itemId: "resistor-1", port: "positive" } },
    { id: "w2", from: { itemId: "resistor-1", port: "negative" }, to: { itemId: "led-1", port: "positive" } },
    { id: "w3", from: { itemId: "led-1", port: "negative" }, to: { itemId: "battery-1", port: "negative" } }
  ],
  logic: []
};

test("viva engine builds a five-question oral quiz from the current circuit", () => {
  const questions = buildVivaQuestions(ledSnapshot);
  assert.equal(questions.length, 5);
  assert.match(questions[0].prompt, /power source/i);
});

test("viva answer scoring rewards correct circuit explanations", () => {
  const question = buildVivaQuestions(ledSnapshot)[0];
  const evaluation = evaluateVivaAnswer(
    question,
    "The battery is the power source and it provides voltage for the circuit.",
    ledSnapshot
  );

  assert.equal(evaluation.passed, true);
  assert.ok(evaluation.score >= 12);
});

test("viva summary produces a human-friendly result", () => {
  const summary = summarizeVivaSession({
    answers: [
      { score: 18, maxScore: 20, passed: true },
      { score: 14, maxScore: 20, passed: true },
      { score: 10, maxScore: 20, passed: false }
    ]
  });

  assert.equal(summary.questionCount, 3);
  assert.ok(summary.percent > 0);
  assert.match(summary.summary, /(Excellent|Solid|needs another pass)/);
});
