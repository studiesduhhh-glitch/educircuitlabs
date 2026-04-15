import { analyzeCircuit } from "./circuit-engine.js";
import { getComponentSpec } from "./catalog.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const LEARNING_CHALLENGES = [
  {
    id: "led-circuit",
    title: "LED Circuit",
    shortTitle: "LED",
    description: "Build a safe LED loop with a battery, resistor, and LED.",
    requiredComponents: ["Battery", "Resistor", "LED"],
    requiredOutputs: ["led"],
    idealComponents: 3,
    idealWires: 3,
    requiredLogic: [],
    successMessage: "LED challenge complete. Your LED loop is safe and working."
  },
  {
    id: "motor-circuit",
    title: "Motor Circuit",
    shortTitle: "Motor",
    description: "Build a controlled motor loop with a battery, switch, and motor.",
    requiredComponents: ["Battery", "Switch", "Motor"],
    requiredOutputs: ["motor"],
    idealComponents: 3,
    idealWires: 3,
    requiredLogic: ["ON"],
    successMessage: "Motor challenge complete. Your motor has power and control."
  }
];

export function getLearningChallenge(id) {
  return LEARNING_CHALLENGES.find(challenge => challenge.id === id) || LEARNING_CHALLENGES[0];
}

function countTypes(items = []) {
  return items.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
}

function hasOutputComponent(items = []) {
  return items.some(item => Boolean(getComponentSpec(item.type)?.outputGroup));
}

function isErrorFree(report) {
  return !(report?.diagnostics || []).some(diagnostic => diagnostic.severity === "error");
}

function getActiveOutputGroups(report) {
  return Object.entries(report?.outputs || {})
    .filter(([, output]) => output?.active)
    .map(([group]) => group);
}

export function validateCircuit(snapshot = {}, report = analyzeCircuit(snapshot)) {
  const items = snapshot.items || [];
  const wires = snapshot.wires || [];
  const hasBattery = items.some(item => item.type === "Battery");
  const hasComponent = items.some(item => item.type !== "Battery");
  const hasOutput = hasOutputComponent(items);
  const hasClosedLoop = Boolean(report.hasClosedLoop);
  const noErrors = isErrorFree(report);
  const activeOutputs = getActiveOutputGroups(report);
  const hasActiveOutput = activeOutputs.length > 0 || (hasComponent && hasClosedLoop && noErrors && !hasOutput);

  const checks = [
    { id: "battery", label: "Battery added", passed: hasBattery },
    { id: "component", label: "Component added", passed: hasComponent },
    { id: "closed-loop", label: "Closed loop", passed: hasClosedLoop },
    { id: "safe", label: "No critical errors", passed: noErrors },
    { id: "active-output", label: "Output receives power", passed: hasActiveOutput }
  ];

  const isCorrect = hasBattery && hasComponent && hasClosedLoop && noErrors && hasActiveOutput;
  const primaryProblem = report.primaryFinding;

  return {
    isCorrect,
    status: isCorrect ? "success" : "error",
    message: isCorrect
      ? "Correct circuit. Power can leave the battery, pass through a component, and return safely."
      : primaryProblem?.message || "The circuit is not complete yet.",
    checks,
    activeOutputs,
    hasBattery,
    hasComponent,
    hasClosedLoop,
    hasOutput,
    noErrors,
    wireCount: wires.length
  };
}

export function validateChallenge(snapshot = {}, report = analyzeCircuit(snapshot), challengeId = "led-circuit") {
  const challenge = getLearningChallenge(challengeId);
  const items = snapshot.items || [];
  const wires = snapshot.wires || [];
  const logic = snapshot.logic || [];
  const counts = countTypes(items);
  const missingComponents = challenge.requiredComponents.filter(type => !counts[type]);
  const activeOutputs = getActiveOutputGroups(report);
  const missingOutputs = challenge.requiredOutputs.filter(output => !activeOutputs.includes(output));
  const missingLogic = challenge.requiredLogic.filter(step => !logic.includes(step));
  const circuitValidation = validateCircuit(snapshot, report);
  const passed =
    circuitValidation.isCorrect &&
    missingComponents.length === 0 &&
    missingOutputs.length === 0 &&
    missingLogic.length === 0;

  const requirements = [
    ...challenge.requiredComponents.map(type => ({
      id: `component-${type}`,
      label: `Add ${type}`,
      passed: !missingComponents.includes(type)
    })),
    ...challenge.requiredOutputs.map(output => ({
      id: `output-${output}`,
      label: `${output.toUpperCase()} turns on`,
      passed: !missingOutputs.includes(output)
    })),
    ...challenge.requiredLogic.map(step => ({
      id: `logic-${step}`,
      label: `Use ${step} logic`,
      passed: !missingLogic.includes(step)
    })),
    {
      id: "wire-efficiency",
      label: `${challenge.idealWires} wire target`,
      passed: wires.length > 0 && wires.length <= challenge.idealWires
    }
  ];

  return {
    challenge,
    passed,
    missingComponents,
    missingOutputs,
    missingLogic,
    requirements,
    message: passed
      ? challenge.successMessage
      : buildChallengeMessage(challenge, { missingComponents, missingOutputs, missingLogic, circuitValidation })
  };
}

function buildChallengeMessage(challenge, result) {
  if (result.missingComponents.length) {
    return `For the ${challenge.title}, add ${result.missingComponents.join(", ")}.`;
  }
  if (!result.circuitValidation.hasClosedLoop) {
    return "Close the loop from Battery + through your parts and back to Battery -.";
  }
  if (result.missingLogic.length) {
    return `Add ${result.missingLogic.join(", ")} logic, then run the circuit again.`;
  }
  if (result.missingOutputs.length) {
    return `The ${result.missingOutputs.join(", ")} output is not on yet. Check voltage, polarity, and wiring.`;
  }
  return result.circuitValidation.message;
}

export function getSmartHint(snapshot = {}, report = analyzeCircuit(snapshot), challengeResult = null) {
  const items = snapshot.items || [];
  const wires = snapshot.wires || [];
  const logic = snapshot.logic || [];
  const counts = countTypes(items);
  const validation = validateCircuit(snapshot, report);

  if (!items.length) return { level: "info", message: "Add a battery to start the circuit." };
  if (!counts.Battery) return { level: "error", message: "Add a battery so the circuit has power." };
  if (!validation.hasComponent) return { level: "info", message: "Add one output component like an LED or Motor." };
  if (!wires.length) return { level: "info", message: "Connect Battery + to your component +, then return to Battery -." };
  if (!validation.hasClosedLoop) return { level: "error", message: "Close the loop back to the battery negative terminal." };

  const primaryFinding = report.primaryFinding;
  if (primaryFinding?.type === "reverse_polarity") {
    return { level: "warning", message: "Swap the reversed wire so + flows into + and the final - returns to Battery -." };
  }
  if (primaryFinding?.type === "insufficient_voltage") {
    return { level: "warning", message: "Increase battery voltage or remove extra voltage drops before the output." };
  }
  if (primaryFinding?.type === "short_circuit") {
    return { level: "error", message: "Break the direct short and route power through a real load." };
  }
  if (primaryFinding?.type === "missing_component") {
    return { level: "warning", message: primaryFinding.suggestion };
  }

  if (challengeResult && !challengeResult.passed) {
    return { level: "info", message: challengeResult.message };
  }
  if (items.some(item => item.type === "Switch" || item.type === "Relay") && !logic.includes("ON")) {
    return { level: "info", message: "Add ON logic so switches and relays close during the run." };
  }
  if (!validation.isCorrect) {
    return { level: "info", message: validation.message };
  }

  return { level: "success", message: "Great job. The circuit is correct, safe, and ready to explain." };
}

export function calculateLearningScore(snapshot = {}, report = analyzeCircuit(snapshot), challengeResult = null) {
  const validation = validateCircuit(snapshot, report);
  const challenge = challengeResult?.challenge || null;
  const itemCount = (snapshot.items || []).length;
  const wireCount = (snapshot.wires || []).length;
  const targetComponents = challenge?.idealComponents || Math.max(1, itemCount);
  const targetWires = challenge?.idealWires || Math.max(1, wireCount);

  const correctness = clamp(
    (validation.hasBattery ? 15 : 0) +
      (validation.hasComponent ? 15 : 0) +
      (validation.hasClosedLoop ? 25 : 0) +
      (validation.noErrors ? 20 : 0) +
      (validation.isCorrect ? 25 : 0) -
      (challengeResult?.missingComponents.length || 0) * 8 -
      (challengeResult?.missingOutputs.length || 0) * 12 -
      (challengeResult?.missingLogic.length || 0) * 8,
    0,
    100
  );

  const extraComponents = Math.max(0, itemCount - targetComponents);
  const extraWires = Math.max(0, wireCount - targetWires);
  const missingWires = wireCount === 0 ? 30 : 0;
  const efficiency = clamp(100 - extraComponents * 7 - extraWires * 8 - missingWires, 0, 100);
  const total = clamp(Math.round(correctness * 0.7 + efficiency * 0.3), 0, 100);

  return {
    total,
    correctness: Math.round(correctness),
    efficiency: Math.round(efficiency),
    label: total >= 85 ? "Excellent" : total >= 65 ? "Good progress" : total >= 40 ? "Keep building" : "Needs setup"
  };
}

export function evaluateLearningState(snapshot = {}, options = {}) {
  const report = options.report || analyzeCircuit(snapshot);
  const challengeId = options.challengeId || "led-circuit";
  const validation = validateCircuit(snapshot, report);
  const challenge = validateChallenge(snapshot, report, challengeId);
  const hint = getSmartHint(snapshot, report, challenge);
  const score = calculateLearningScore(snapshot, report, challenge);

  return {
    circuit: validation,
    hint,
    challenge,
    score,
    report
  };
}
