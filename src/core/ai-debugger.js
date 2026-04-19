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

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

function tokenizeMathExpression(expression) {
  const tokens = [];
  let index = 0;
  let expectNumber = true;
  const text = expression.replace(/[×x]/g, "*").replace(/[÷]/g, "/");

  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if ("+-*/".includes(char) && !expectNumber) {
      tokens.push(char);
      expectNumber = true;
      index += 1;
      continue;
    }

    const numberMatch = text.slice(index).match(expectNumber ? /^[+-]?\d+(?:\.\d+)?/ : /^\d+(?:\.\d+)?/);
    if (!numberMatch) return null;
    tokens.push(Number(numberMatch[0]));
    index += numberMatch[0].length;
    expectNumber = false;
  }

  return tokens.length >= 3 && typeof tokens[0] === "number" ? tokens : null;
}

function evaluateMathExpression(expression) {
  const tokens = tokenizeMathExpression(expression);
  if (!tokens) return null;

  const values = [tokens[0]];
  const operators = [];

  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index];
    const nextValue = tokens[index + 1];
    if (typeof operator !== "string" || typeof nextValue !== "number") return null;

    if (operator === "*" || operator === "/") {
      if (operator === "/" && nextValue === 0) return null;
      const previous = values.pop();
      values.push(operator === "*" ? previous * nextValue : previous / nextValue);
    } else {
      operators.push(operator);
      values.push(nextValue);
    }
  }

  return values.slice(1).reduce((total, value, index) => {
    return operators[index] === "-" ? total - value : total + value;
  }, values[0]);
}

function buildMathReply(question) {
  const text = String(question || "").toLowerCase();
  const percentMatch = text.match(/(-?\d+(?:\.\d+)?)\s*%\s*(?:of|x|\*)\s*(-?\d+(?:\.\d+)?)/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    const base = Number(percentMatch[2]);
    const answer = (percent / 100) * base;
    return [
      `The answer is ${formatNumber(answer)}.`,
      "",
      `Quick working: ${formatNumber(percent)}% of ${formatNumber(base)} = (${formatNumber(percent)} / 100) x ${formatNumber(base)} = ${formatNumber(answer)}.`
    ].join("\n");
  }

  const normalized = text
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b/g, "*")
    .replace(/\bmultiplied by\b/g, "*")
    .replace(/\bdivided by\b/g, "/");
  const expressionMatch = normalized.match(/(-?\d+(?:\.\d+)?(?:\s*[+\-*/x×÷]\s*[+-]?\d+(?:\.\d+)?)+)/);
  if (!expressionMatch) return "";

  const answer = evaluateMathExpression(expressionMatch[1]);
  if (answer === null) return "";

  return [
    `The answer is ${formatNumber(answer)}.`,
    "",
    `Quick working: ${expressionMatch[1].trim()} = ${formatNumber(answer)}.`,
    "If you want, I can also break the steps down slower."
  ].join("\n");
}

function buildWritingReply(question) {
  const topic = String(question || "")
    .replace(/^(can you|please|write|draft|make|create|give me|generate)\s+/i, "")
    .trim() || "the topic";

  return [
    "Sure. Here is a clean draft you can edit:",
    "",
    `Good communication makes ${topic} easier to understand because it gives people a clear goal, a shared plan, and a way to improve together. When ideas are explained simply, everyone can take part and mistakes become easier to fix. The best work usually happens when people ask questions, test their thinking, and keep improving one step at a time.`,
    "",
    "Want it in a different style? Ask for shorter, longer, more formal, more friendly, or more advanced."
  ].join("\n");
}

function buildCodingReply(question) {
  return [
    "I can help with coding too. Here is the practical way to approach it:",
    "",
    "1. Say what the program should do in one sentence.",
    "2. List the inputs and outputs.",
    "3. Break it into small functions.",
    "4. Test one small behavior at a time.",
    "",
    `For your question: "${question}"`,
    "Send me the code or the exact error, and I will explain what is happening, what to change, and why."
  ].join("\n");
}

function buildStudyReply(question) {
  return [
    "Here is a simple study plan:",
    "",
    "1. Learn the main idea first, not the tiny details.",
    "2. Make 5 quick questions from the topic.",
    "3. Try answering without looking.",
    "4. Check mistakes and rewrite the answer in simpler words.",
    "5. Do one practice problem or example.",
    "",
    `For this request: "${question}"`,
    "I can also turn it into flashcards, a quiz, or a 10-minute revision plan."
  ].join("\n");
}

function buildKnownConceptReply(lowerQuestion) {
  const concepts = [
    {
      keys: ["sky blue", "why is the sky blue", "blue sky"],
      reply: [
        "The sky looks blue because sunlight scatters in Earth's atmosphere.",
        "",
        "Sunlight has many colors. Blue light has a shorter wavelength, so air molecules scatter it more than red or yellow light. That scattered blue light reaches your eyes from all directions, making the sky look blue.",
        "",
        "At sunset, sunlight travels through more atmosphere, so much of the blue gets scattered away and warmer red/orange colors become more visible."
      ].join("\n")
    },
    {
      keys: ["photosynthesis"],
      reply: "Photosynthesis is how plants make food. They use sunlight, carbon dioxide, and water to make glucose, and they release oxygen as a useful byproduct."
    },
    {
      keys: ["gravity"],
      reply: "Gravity is the attractive force between objects with mass. On Earth, gravity pulls objects toward the planet's center, which is why things fall downward."
    },
    {
      keys: ["artificial intelligence", "what is ai", " ai "],
      reply: "Artificial intelligence is software designed to perform tasks that usually need human-like thinking, such as understanding language, recognizing patterns, making predictions, or helping solve problems."
    },
    {
      keys: ["machine learning"],
      reply: "Machine learning is a type of AI where a system improves by learning patterns from data instead of being programmed with every single rule by hand."
    },
    {
      keys: ["black hole"],
      reply: "A black hole is a region of space where gravity is so strong that nothing, not even light, can escape once it passes the event horizon."
    },
    {
      keys: ["climate change", "global warming"],
      reply: "Climate change means long-term shifts in Earth's climate patterns. A major cause today is extra greenhouse gases trapping more heat in the atmosphere."
    },
    {
      keys: ["atom"],
      reply: "An atom is a tiny unit of matter. It has a nucleus with protons and neutrons, with electrons around it. Different atoms make up different elements."
    },
    {
      keys: ["democracy"],
      reply: "Democracy is a system of government where people have a voice in decisions, usually by voting for leaders or laws."
    }
  ];

  const padded = ` ${lowerQuestion} `;
  const match = concepts.find(concept => concept.keys.some(key => padded.includes(key)));
  return match?.reply || "";
}

function buildGeneralTeacherReply(question) {
  const text = String(question || "").trim();
  const lowerQuestion = text.toLowerCase();
  if (!text) return "Ask me anything, and I will help you think it through.";

  const mathReply = buildMathReply(text);
  if (mathReply) return mathReply;

  if (/^(hi|hello|hey|yo|sup)\b/.test(lowerQuestion)) {
    return "Hey. I am here. Ask me about circuits, homework, writing, coding, science, math, or anything you want to understand better.";
  }

  if (includesAny(lowerQuestion, ["latest", "today", "right now", "current news", "weather", "stock price", "live score"])) {
    return [
      "I can help reason about that, but this classroom AI Teacher does not have live internet inside the simulator.",
      "",
      "For anything that changes by the minute, like news, weather, stock prices, sports scores, or current leaders, verify with a live source. If you paste the info here, I can explain or summarize it."
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["write", "draft", "essay", "paragraph", "story", "email", "speech"])) {
    return buildWritingReply(text);
  }

  if (includesAny(lowerQuestion, ["code", "program", "javascript", "python", "html", "css", "bug", "error"])) {
    return buildCodingReply(text);
  }

  if (includesAny(lowerQuestion, ["quiz", "test me", "question me", "practice"])) {
    return [
      "Absolutely. Here is a quick general quiz:",
      "",
      "1. Explain one idea you learned recently in one sentence.",
      "2. Give one real-world example of it.",
      "3. What question would you ask to understand it deeper?",
      "",
      "Reply with your answers, and I will check them kindly."
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["study", "revise", "revision", "memorize", "flashcards", "exam", "test tomorrow"])) {
    return buildStudyReply(text);
  }

  if (includesAny(lowerQuestion, ["summarize", "summary"])) {
    return [
      "Paste the text you want summarized, and I will turn it into:",
      "",
      "- a short summary",
      "- key points",
      "- simple explanation",
      "- quiz questions if you want"
    ].join("\n");
  }

  if (includesAny(lowerQuestion, ["translate"])) {
    return "Paste the text and tell me the target language. I can help translate it clearly and keep the meaning natural.";
  }

  const knownConceptReply = buildKnownConceptReply(lowerQuestion);
  if (knownConceptReply) return knownConceptReply;

  if (includesAny(lowerQuestion, ["what is", "explain", "why", "how does", "how do", "meaning of"])) {
    return [
      "Here is a helpful way to understand it:",
      "",
      `Question: ${text}`,
      "",
      "Short version: break the idea into three parts: what it is, why it matters, and one example. That makes almost any topic easier to learn.",
      "",
      "If you want the best answer, ask with the exact topic, for example: 'explain photosynthesis simply' or 'why is the sky blue?'"
    ].join("\n");
  }

  return [
    "I can help with that.",
    "",
    `You asked: "${text}"`,
    "",
    "Tell me whether you want a short answer, detailed explanation, example, quiz, code help, or a step-by-step solution, and I will shape the answer that way."
  ].join("\n");
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

function oneLine(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
}

function findItemById(snapshot = {}, itemId = "") {
  return (snapshot.items || []).find(item => item.id === itemId) || null;
}

function listComponentTypes(snapshot = {}, options = {}) {
  const includeBattery = options.includeBattery !== false;
  const names = [...new Set((snapshot.items || [])
    .map(item => item.type)
    .filter(Boolean)
    .filter(type => includeBattery || type !== "Battery"))];

  if (!names.length) return includeBattery ? "battery and a component" : "a component";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function firstLoadType(snapshot = {}) {
  return (snapshot.items || []).find(item => item.type !== "Battery" && item.type !== "Resistor" && item.type !== "Switch" && item.type !== "Relay")?.type
    || (snapshot.items || []).find(item => item.type !== "Battery")?.type
    || "component";
}

function buildWorkingImprovement(snapshot = {}) {
  const itemTypes = new Set((snapshot.items || []).map(item => item.type));
  const logic = snapshot.logic || [];
  const primaryLoad = firstLoadType(snapshot);

  if (!itemTypes.has("Switch")) {
    return `Add a Switch before the ${primaryLoad} so you can control it.`;
  }
  if (!logic.includes("ON")) {
    return "Add ON logic, then run the circuit again.";
  }
  if (!logic.includes("OFF")) {
    return "Add OFF logic so the output can stop cleanly.";
  }
  if (!logic.includes("WAIT 1s")) {
    return "Add WAIT 1s so the output change is easier to see.";
  }
  return `Try a second safe output with the same Battery after checking the voltage.`;
}

function buildCircuitTip(snapshot = {}, issueType = "") {
  const itemTypes = new Set((snapshot.items || []).map(item => item.type));
  const primaryLoad = firstLoadType(snapshot);

  if (issueType === "missing_component" && itemTypes.has("LED")) {
    return "A resistor limits current and helps protect an LED.";
  }
  if (issueType === "missing_closed_loop") {
    return "Current flows only when the path goes from Battery + back to Battery -.";
  }
  if (issueType === "short_circuit") {
    return "A load like an LED or motor must sit in the path to use power safely.";
  }
  if (issueType === "reverse_polarity") {
    return "Polarity matters because + should feed the component before - returns.";
  }
  if (issueType === "insufficient_voltage" || issueType === "over_voltage") {
    return "Each component works best only inside its safe voltage range.";
  }
  if (itemTypes.has("LED")) {
    return "An LED needs correct polarity, enough voltage, and a resistor.";
  }
  if (itemTypes.has("Motor") || itemTypes.has("Pump") || itemTypes.has("Servo")) {
    return `${primaryLoad} works only when it gets enough voltage in a closed loop.`;
  }
  if (itemTypes.has("Switch") || itemTypes.has("Relay")) {
    return "A switch controls current by opening or closing the path.";
  }
  return "A circuit needs a power source, a path, and a working component.";
}

function buildTeacherReplyFromReport(snapshot = {}, analysis = {}) {
  const items = snapshot.items || [];
  const wires = snapshot.wires || [];
  const diagnostics = analysis.diagnostics || [];
  const primaryFinding = analysis.primaryFinding || null;
  const activeOutputs = Object.values(analysis.outputs || {}).some(output => output?.active);
  const hasBattery = items.some(item => item.type === "Battery");
  const hasComponent = items.some(item => item.type !== "Battery");
  const components = listComponentTypes(snapshot);
  const primaryItem = primaryFinding?.itemId ? findItemById(snapshot, primaryFinding.itemId) : null;
  const primaryType = primaryItem?.type || firstLoadType(snapshot);

  let status = "Working";
  let why = `${components} form a closed loop and the circuit is running safely.`;
  let fix = buildWorkingImprovement(snapshot);
  let tip = buildCircuitTip(snapshot);

  if (!items.length) {
    status = "Partial";
    why = "No Battery or component is on the workspace yet.";
    fix = "Add a Battery, then add an LED or Motor.";
    tip = "A circuit starts with a power source and one load.";
  } else if (!hasBattery) {
    status = "Partial";
    why = `${listComponentTypes(snapshot, { includeBattery: false })} cannot work without a Battery.`;
    fix = "Add a Battery and wire it into the loop.";
    tip = "The Battery pushes current through the circuit.";
  } else if (!hasComponent) {
    status = "Partial";
    why = "The Battery is placed, but no output component is connected yet.";
    fix = "Add an LED, Motor, or Buzzer after the Battery.";
    tip = "A load is the part that uses electrical energy.";
  } else if (!wires.length) {
    status = "Partial";
    why = `${components} are placed, but no wires connect them yet.`;
    fix = "Connect Battery + through the component path, then back to Battery -.";
    tip = "Wires make the path that current follows.";
  } else if (primaryFinding?.type === "short_circuit") {
    status = "Not Working";
    why = "Battery positive is reaching Battery negative without a load.";
    fix = "Break the direct wire path and place an LED, Motor, or Buzzer in the loop.";
    tip = buildCircuitTip(snapshot, primaryFinding.type);
  } else if (primaryFinding?.type === "over_voltage") {
    status = "Not Working";
    why = `${primaryType} is getting too much voltage from the Battery.`;
    fix = `Lower the Battery voltage or protect the ${primaryType} before running again.`;
    tip = buildCircuitTip(snapshot, primaryFinding.type);
  } else if (primaryFinding?.type === "missing_closed_loop") {
    status = "Partial";
    why = "Battery positive does not return to Battery negative yet.";
    fix = `Finish the loop so the last component goes back to Battery -.`;
    tip = buildCircuitTip(snapshot, primaryFinding.type);
  } else if (primaryFinding?.type === "reverse_polarity") {
    status = "Partial";
    why = `${primaryType} is connected in the wrong direction.`;
    fix = `Swap the wires on ${primaryType} so + goes in first and - returns to the Battery.`;
    tip = buildCircuitTip(snapshot, primaryFinding.type);
  } else if (primaryFinding?.type === "insufficient_voltage") {
    const receivedVoltage = analysis.componentStates?.[primaryFinding.itemId]?.receivedVoltage;
    status = "Partial";
    why = `${primaryType} is underpowered${Number.isFinite(receivedVoltage) ? ` at ${receivedVoltage}V` : ""}.`;
    fix = `Increase the Battery voltage or reduce voltage drops before the ${primaryType}.`;
    tip = buildCircuitTip(snapshot, primaryFinding.type);
  } else if (primaryFinding?.type === "missing_component") {
    status = activeOutputs ? "Partial" : "Partial";
    why = primaryFinding.missingType === "Resistor"
      ? "The LED is connected without a resistor."
      : `${primaryType} is missing a needed part in the path.`;
    fix = primaryFinding.missingType === "Resistor"
      ? "Add a resistor in series with the LED."
      : oneLine(primaryFinding.suggestion || `Add the missing part before the ${primaryType}.`);
    tip = buildCircuitTip(snapshot, primaryFinding.type);
  } else if (diagnostics.length) {
    status = activeOutputs ? "Partial" : "Not Working";
    why = oneLine(primaryFinding?.message || `${primaryType} still has a circuit issue.`);
    fix = oneLine(primaryFinding?.suggestion || `Fix the ${primaryType} connection, then run again.`);
    tip = buildCircuitTip(snapshot, primaryFinding?.type || "");
  } else if (!activeOutputs && hasComponent) {
    status = "Partial";
    why = `${components} are connected, but no output is active yet.`;
    fix = "Press Run Logic and close any Switch in the path.";
    tip = "Logic and switches decide when current can flow.";
  }

  return [
    `Status: ${oneLine(status)}`,
    `Why: ${oneLine(why)}`,
    `Fix: ${oneLine(fix)}`,
    `Tip: ${oneLine(tip)}`
  ].join("\n");
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
  return buildTeacherReplyFromReport(snapshot, report.analysis, question, circuitSummary);
}
