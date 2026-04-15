import { analyzeCircuit } from "./circuit-engine.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDiagnosticLine(diagnostic) {
  const friendlyPrefix = {
    short_circuit: "Safety alert",
    over_voltage: "Voltage warning",
    missing_component: "Build tip",
    missing_closed_loop: "Loop check",
    reverse_polarity: "Polarity check",
    insufficient_voltage: "Power check"
  }[diagnostic.type] || "Circuit note";

  return `${friendlyPrefix} - ${diagnostic.title}: ${diagnostic.message} Try this: ${diagnostic.suggestion}`;
}

function includesAny(text, words = []) {
  return words.some(word => text.includes(word));
}

function sentenceList(items = []) {
  return items.filter(Boolean).map(item => `- ${item}`).join("\n");
}

function outputSummary(outputs = {}) {
  return [
    `LED brightness: ${outputs.led?.intensityPercent || 0}%`,
    `Motor speed: ${outputs.motor?.intensityPercent || 0}%`,
    `Buzzer power: ${outputs.buzzer?.intensityPercent || 0}%`
  ].join(", ");
}

function componentCounts(snapshot = {}) {
  const counts = {};
  (snapshot.items || []).forEach(item => {
    counts[item.type] = (counts[item.type] || 0) + 1;
  });
  return Object.entries(counts).map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`);
}

function buildPreciseFinding(diagnostic, analysis = {}) {
  if (!diagnostic) {
    return "No blocking issue found. The circuit has no high-severity diagnostic right now.";
  }

  const state = diagnostic.itemId ? analysis.componentStates?.[diagnostic.itemId] : null;
  const voltageNote = state
    ? ` ${state.type} receives ${state.receivedVoltage}V and needs ${state.minVoltage}V minimum.`
    : "";
  return `${diagnostic.title}: ${diagnostic.message}${voltageNote} Next action: ${diagnostic.suggestion}`;
}

export function buildCoachFeedback(analysis = {}) {
  const diagnostics = analysis.diagnostics || [];
  const errors = diagnostics.filter(item => item.severity === "error");
  const warnings = diagnostics.filter(item => item.severity === "warning");
  const outputs = analysis.outputs || {};
  const bestOutputIntensity = Math.max(
    outputs.led?.intensityPercent || 0,
    outputs.motor?.intensityPercent || 0,
    outputs.buzzer?.intensityPercent || 0
  );
  const efficiencyScore = clamp(
    Math.round((analysis.qualityScore ?? 70) * 0.75 + bestOutputIntensity * 0.25),
    0,
    100
  );
  const health = errors.length ? "danger" : warnings.length ? "warning" : "safe";

  const safetyWarnings = diagnostics
    .filter(item => item.severity === "error" || item.type === "short_circuit" || item.type === "over_voltage")
    .map(item => item.message);

  const optimizationTips = [];
  if (analysis.primaryFinding?.suggestion) {
    optimizationTips.push(analysis.primaryFinding.suggestion);
  }
  if (bestOutputIntensity > 0 && bestOutputIntensity < 70) {
    optimizationTips.push("The output works, but it is dim or slow. Try reducing voltage drops or using a battery voltage closer to the component's recommended range.");
  }
  if (!diagnostics.length) {
    optimizationTips.push("Nice build. Try adding a switch or WAIT logic step so the project demonstrates controlled behavior.");
  }
  if (!optimizationTips.length) {
    optimizationTips.push("Run the logic again after each wiring change so you can compare the result immediately.");
  }

  const headline = health === "safe"
    ? "Circuit looks safe and ready"
    : health === "warning"
      ? "Almost there, one thing needs attention"
      : "Pause here, this circuit needs a safety fix";

  const status = health === "safe" ? "safe" : "error";
  const conversation = health === "safe"
    ? `Great job. Your circuit has a complete loop and the strongest output is running at about ${bestOutputIntensity}%.`
    : `I found ${errors.length + warnings.length} issue${errors.length + warnings.length === 1 ? "" : "s"}. Start with the first suggestion and run the simulator again.`;
  const simpleExplanation = health === "safe"
    ? `Current has a complete path and the strongest output is running at about ${bestOutputIntensity}%.`
    : errors.length
      ? "The simulator found a safety issue that should be fixed before treating this as a working circuit."
      : "The circuit can be improved; it is close, but one wiring or safety detail needs attention.";
  const suggestion = optimizationTips[0] || "Run the logic again after each wiring change so you can compare the result immediately.";

  const preciseFinding = buildPreciseFinding(analysis.primaryFinding, analysis);
  const preciseSteps = diagnostics.length
    ? diagnostics.slice(0, 4).map(diagnostic => buildPreciseFinding(diagnostic, analysis))
    : [
      "Circuit path: complete loop detected.",
      "Polarity: no reversed output component detected.",
      "Voltage: outputs are within the simulator's safe operating range."
    ];

  return {
    status,
    health,
    headline,
    conversation,
    simpleExplanation,
    suggestion,
    efficiencyScore,
    efficiencyPercent: efficiencyScore,
    safetyWarnings,
    optimizationTips,
    primaryTip: optimizationTips[0],
    preciseFinding,
    preciseSteps
  };
}

export function buildHumanReadableDebugReport(snapshot) {
  const analysis = analyzeCircuit(snapshot);
  const coach = buildCoachFeedback(analysis);

  if (!analysis.diagnostics.length) {
    return {
      analysis,
      coach,
      shortSummary: "Circuit check passed. The current layout forms a valid loop and the active outputs have enough voltage.",
      narrative:
        [
          "Circuit check passed.",
          "",
          "Status: safe",
          `Simple explanation: ${coach.simpleExplanation}`,
          `Suggestion: ${coach.suggestion}`,
          `Efficiency: ${coach.efficiencyPercent}%`,
          "",
          `The analyzer found a complete power loop, no reverse polarity, no short circuit, and enough voltage for the active outputs. Efficiency score: ${coach.efficiencyScore}/100. You can now simulate with confidence or experiment with more components.`
        ].join("\n"),
      findings: []
    };
  }

  const findings = analysis.diagnostics.map(formatDiagnosticLine);
  const shortSummary = analysis.primaryFinding
    ? `${analysis.primaryFinding.title}: ${analysis.primaryFinding.message}`
    : "The circuit needs attention.";

  const narrative = [
    "Smart AI Circuit Debugger Report",
    "",
    `Status: ${coach.status}`,
    `Simple explanation: ${coach.simpleExplanation}`,
    `Suggestion: ${coach.suggestion}`,
    `Efficiency: ${coach.efficiencyPercent}%`,
    "",
    `Summary: ${shortSummary}`,
    "No stress. This is exactly the kind of mistake engineers debug while prototyping.",
    "",
    "Findings:",
    ...findings.map(line => `- ${line}`),
    "",
    "Recommended next step:",
    analysis.primaryFinding?.suggestion || "Reconnect the circuit and run the simulator again."
  ].join("\n");

  return {
    analysis,
    coach,
    shortSummary,
    narrative,
    findings
  };
}

export function buildTeacherStyleReply(question, snapshot, circuitSummary = "") {
  const report = buildHumanReadableDebugReport(snapshot);
  const analysis = report.analysis;
  const outputs = analysis.outputs;
  const lowerQuestion = String(question || "").toLowerCase();
  const parts = componentCounts(snapshot);
  const hasCircuit = (snapshot.items || []).length > 0;
  const liveOutputSummary = outputSummary(outputs);
  const preciseCoach = [
    `Circuit Coach: ${report.coach.headline}`,
    `Status: ${report.coach.status}`,
    `Simple explanation: ${report.coach.simpleExplanation}`,
    `Suggestion: ${report.coach.suggestion}`,
    `Efficiency: ${report.coach.efficiencyPercent}%`,
    `Efficiency score: ${report.coach.efficiencyScore}/100`,
    `Most precise finding: ${report.coach.preciseFinding}`,
    `Live outputs: ${liveOutputSummary}`,
    circuitSummary ? `Workspace: ${circuitSummary}` : ""
  ].filter(Boolean).join("\n");

  const isDebugQuestion =
    lowerQuestion.includes("debug") ||
    lowerQuestion.includes("why") ||
    lowerQuestion.includes("not") ||
    lowerQuestion.includes("fix") ||
    lowerQuestion.includes("wrong") ||
    lowerQuestion.includes("coach") ||
    lowerQuestion.includes("precise");

  if (isDebugQuestion) {
    return [
      "I checked your circuit carefully. Here is the exact version:",
      "",
      preciseCoach,
      "",
      "Fix order:",
      sentenceList(report.coach.preciseSteps),
      "",
      "Try that change, then run logic again. I will re-check the circuit with you."
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (includesAny(lowerQuestion, ["quiz", "test me", "question me", "practice"])) {
    return [
      "Absolutely. Quick friendly quiz time:",
      "",
      "1. What are the two things an LED needs before it can glow?",
      "2. Why does a resistor protect an LED?",
      "3. What happens if battery positive reaches battery negative without a load?",
      "",
      "Reply with your answers, and I will check them kindly and explain anything that feels confusing."
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["explain my circuit", "current circuit", "my circuit", "what did i build"])) {
    return [
      "Here is your circuit in student-friendly words:",
      "",
      hasCircuit
        ? `You currently have ${parts.join(", ")} with ${(snapshot.wires || []).length} wire${(snapshot.wires || []).length === 1 ? "" : "s"}.`
        : "You have not placed components yet, so the first step is to add a Battery and one output like an LED.",
      `Battery setting: ${(snapshot.defaultBatteryVoltage || 0).toFixed ? snapshot.defaultBatteryVoltage.toFixed(1) : snapshot.defaultBatteryVoltage || 0}V.`,
      preciseCoach,
      "",
      "If you want, ask: 'walk me through each component' and I will explain the role of every part."
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["voltage", "volt", "current", "amp", "electricity"])) {
    return [
      "Think of voltage as electrical push, and current as the amount of charge flowing.",
      "",
      "In your simulator:",
      "- A component only turns on if it has a complete loop back to the battery.",
      "- It also needs enough voltage for its minimum requirement.",
      "- Too much voltage can damage sensitive components.",
      "",
      preciseCoach,
      "",
      "Tiny memory trick: voltage pushes, current flows, resistance limits."
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["resistor", "resistance", "ohm"])) {
    return [
      "A resistor is the circuit's current limiter. It does not just 'use up power'; it helps control how hard electricity flows through a part.",
      "",
      "For an LED, a resistor is important because LEDs can be damaged by too much current. In Educircuit, I flag an LED without a resistor as a safety warning.",
      "",
      preciseCoach
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["led", "light", "diode"])) {
    return [
      "An LED is a light-emitting diode. It is polarity-sensitive, so its positive side must receive power and its negative side must return to battery negative.",
      "",
      "Precise LED checklist:",
      "- Battery positive should reach LED positive.",
      "- LED negative should return to battery negative.",
      "- The LED should get at least about 2V.",
      "- Add a resistor in series for safety.",
      "",
      preciseCoach
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["switch", "relay", "logic", "on", "off", "wait"])) {
    return [
      "Logic blocks control the circuit over time.",
      "",
      "ON closes switches and relays, OFF opens them, and WAIT 1s lets the output stay visible before the next step. A switch is basically a gate: closed means current can pass, open means it cannot.",
      "",
      "A good beginner sequence is: ON -> WAIT 1s -> OFF.",
      "",
      preciseCoach
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["motor", "pump", "servo", "buzzer", "sensor"])) {
    return [
      "Motors, pumps, servos, buzzers, and sensors usually need more careful voltage planning than a simple LED.",
      "",
      "- Motors/pumps/servos are heavier loads, so weak voltage can make them slow or inactive.",
      "- Buzzers need enough voltage and a complete return path.",
      "- Sensors need stable power and correct polarity.",
      "",
      preciseCoach
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["short circuit", "short", "burst", "overload", "danger", "safe", "safety"])) {
    return [
      "A short circuit happens when battery positive can reach battery negative through an easy conductor path without a useful load.",
      "",
      "That is dangerous in real life because current can become very large and heat things up quickly. In Educircuit, I mark this as a red safety issue.",
      "",
      preciseCoach
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["grade", "feedback", "teacher", "submit", "rubric", "score"])) {
    return [
      "For grading, I look at three big things:",
      "",
      "- Correctness: does the circuit form a working loop?",
      "- Logic usage: did you use ON/OFF/WAIT intentionally?",
      "- Safety: are polarity, voltage, resistor use, and short-circuit risk handled?",
      "",
      preciseCoach,
      "",
      "A strong submission usually includes a clear project name, a safe loop, at least one logic step, and a short explanation of what the circuit does."
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["how to", "steps", "build", "make", "create"])) {
    return [
      "Sure. Here is a simple build plan:",
      "",
      "1. Place a Battery.",
      "2. Add one output component, like an LED, buzzer, or motor.",
      "3. Wire battery positive through the component path.",
      "4. Return the final negative side back to battery negative.",
      "5. Add ON -> WAIT 1s -> OFF logic.",
      "6. Run logic and let me check the result.",
      "",
      preciseCoach
    ].join("\n");
  }

  return [
    "I can help with that. I will answer like a friendly teacher and connect it back to your circuit when possible.",
    "",
    `Your question: "${question}"`,
    "",
    "A useful way to think about it:",
    "Break the idea into source, path, load, control, and safety. In circuits, most problems come from one of those five areas.",
    "",
    preciseCoach,
    "",
    "You can also ask me to: explain it simpler, give an example, quiz you, or debug the current circuit."
  ]
    .filter(Boolean)
    .join("\n");
}
