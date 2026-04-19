import { analyzeCircuit } from "./circuit-engine.js";
import { evaluateLearningState, getLearningChallenge } from "./learning-engine.js";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countTypes(items = []) {
  return items.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
}

function createQuestion(id, prompt, keywords, answerGuide, hint) {
  return {
    id,
    prompt,
    keywords,
    answerGuide,
    hint
  };
}

export function buildVivaQuestions(
  snapshot = {},
  { report = analyzeCircuit(snapshot), learningResult = null } = {}
) {
  const items = snapshot.items || [];
  const counts = countTypes(items);
  const selectedChallengeId = snapshot.challengeId || "led-circuit";
  const activeLearning = learningResult || evaluateLearningState(snapshot, {
    report,
    challengeId: selectedChallengeId
  });
  const challenge = getLearningChallenge(selectedChallengeId);
  const questions = [];

  questions.push(
    createQuestion(
      "power-source",
      "What is the power source in this circuit and what does it provide?",
      ["battery", "voltage", "power"],
      "The battery is the power source. It provides voltage that pushes current through the loop.",
      "Name the source first, then mention that it gives the circuit voltage."
    )
  );

  questions.push(
    createQuestion(
      "closed-loop",
      "Why does this circuit need a closed loop before the output can work?",
      ["loop", "return", "battery", "current"],
      "Current must leave battery positive, pass through components, and return to battery negative in a full loop.",
      "Mention both sides of the battery and the return path."
    )
  );

  if (counts.LED) {
    questions.push(
      createQuestion(
        "led-safety",
        "Why is resistor protection important in an LED circuit?",
        ["resistor", "current", "protect", "led"],
        "A resistor limits current so the LED stays safe instead of taking too much current.",
        "Think about how the LED is protected from too much current."
      )
    );
  }

  if (counts.Switch || counts.Relay) {
    questions.push(
      createQuestion(
        "switch-control",
        "What is the job of the switch or relay in this build?",
        ["switch", "control", "open", "close", "path"],
        "The switch or relay controls whether the path is open or closed, so current can be turned on and off.",
        "Use words like open, close, and control."
      )
    );
  }

  if (counts.Motor || counts.Pump || counts.Servo) {
    questions.push(
      createQuestion(
        "motor-load",
        "Why does a motor usually need more support than an LED?",
        ["motor", "more", "voltage", "current", "load"],
        "A motor is a heavier load, so it usually needs more voltage or current than a simple LED.",
        "Compare the motor to a lighter output like an LED."
      )
    );
  }

  const firstMissingRequirement = activeLearning.challenge.requirements.find(requirement => !requirement.passed);
  if (firstMissingRequirement) {
    questions.push(
      createQuestion(
        "guided-fix",
        `Your ${challenge.title} challenge is not complete yet. What is the next fix you should make?`,
        normalizeText(firstMissingRequirement.label).split(" ").filter(Boolean),
        firstMissingRequirement.label,
        `Start from this guided step: ${firstMissingRequirement.label}.`
      )
    );
  }

  questions.push(
    createQuestion(
      "efficiency",
      "What would improve the efficiency or quality score of this build?",
      ["correct", "safe", "clean", "less", "wires", "logic"],
      "A cleaner, safer loop with the right components, correct polarity, and no extra mistakes improves the score.",
      "Think about safety, polarity, and avoiding unnecessary parts."
    )
  );

  while (questions.length < 5) {
    questions.push(
      createQuestion(
        `general-${questions.length}`,
        "Explain how voltage and current work together in a simple circuit.",
        ["voltage", "current", "battery", "flow"],
        "Voltage is the electrical push from the battery, and current is the flow that moves through a closed path.",
        "One word is the push, the other is the flow."
      )
    );
  }

  return questions.slice(0, 5);
}

export function evaluateVivaAnswer(question = {}, answer = "", snapshot = {}) {
  const normalizedAnswer = normalizeText(answer);
  const normalizedKeywords = (question.keywords || []).map(normalizeText).filter(Boolean);
  const matchedKeywords = normalizedKeywords.filter(keyword => normalizedAnswer.includes(keyword));
  const coverage = normalizedKeywords.length
    ? matchedKeywords.length / normalizedKeywords.length
    : normalizedAnswer ? 1 : 0;
  const completenessBonus = normalizedAnswer.split(" ").length >= 8 ? 0.1 : 0;
  const rawScore = Math.min(1, coverage + completenessBonus);
  const score = Math.round(rawScore * 20);
  const passed = score >= 12;
  const challengeId = snapshot.challengeId || "led-circuit";
  const challenge = getLearningChallenge(challengeId);

  return {
    score,
    maxScore: 20,
    passed,
    matchedKeywords,
    missingKeywords: normalizedKeywords.filter(keyword => !matchedKeywords.includes(keyword)),
    feedback: passed
      ? `Good answer. You covered the main idea for the ${challenge.shortTitle} viva.`
      : `Almost there. ${question.hint || "Add the main circuit idea more clearly."}`,
    answerGuide: question.answerGuide || ""
  };
}

export function summarizeVivaSession(session = {}) {
  const answers = session.answers || [];
  const totalScore = answers.reduce((sum, answer) => sum + Number(answer.score || 0), 0);
  const maxScore = answers.reduce((sum, answer) => sum + Number(answer.maxScore || 20), 0) || 100;
  const percent = Math.round((totalScore / maxScore) * 100);
  const passedCount = answers.filter(answer => answer.passed).length;

  return {
    totalScore,
    maxScore,
    percent,
    summary: percent >= 85
      ? "Excellent viva. You explained the circuit clearly and accurately."
      : percent >= 65
        ? "Solid viva. A little more detail would make the explanations sharper."
        : "This viva needs another pass. Focus on loop completion, voltage, polarity, and control logic.",
    recommendation: percent >= 85
      ? "Try a harder circuit or teach this one back to someone else."
      : percent >= 65
        ? "Review the feedback and answer the missed question again."
        : "Run the guided lab steps, then retry the viva once the build is correct.",
    passedCount,
    questionCount: answers.length
  };
}
