import { analyzeCircuit } from "../core/circuit-engine.js?v=20260719-voice-dark1";
import { buildCoachFeedback, buildHumanReadableDebugReport, buildTeacherStyleReply } from "../core/ai-debugger.js?v=20260719-voice-dark1";
import { LEARNING_CHALLENGES, evaluateLearningState } from "../core/learning-engine.js?v=20260719-voice-dark1";
import {
  buildGuidedLabSteps,
  buildMultimeterReading,
  buildReplayEntry,
  buildSnapshotSignature,
  getGuidedLabNextFix,
  replayEntriesDiffer
} from "../core/classroom-engine.js?v=20260719-voice-dark1";
import {
  buildVivaQuestions,
  evaluateVivaAnswer,
  summarizeVivaSession
} from "../core/viva-engine.js?v=20260719-voice-dark1";
import { autoGradeProject, summarizeClassPerformance } from "../services/dashboard-service.js?v=20260719-voice-dark1";
import { formatAuthError } from "../services/auth-service.js?v=20260719-voice-dark1";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createCard(title, description = "") {
  const card = document.createElement("div");
  card.className = "dashboard-card upgrade-card";
  card.innerHTML = `
    <h3 class="card-title">${title}</h3>
    ${description ? `<p class="upgrade-muted">${description}</p>` : ""}
  `;
  return card;
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function replaceButton(button, handler) {
  if (!button) return null;
  const clone = button.cloneNode(true);
  button.replaceWith(clone);
  clone.addEventListener("click", handler);
  return clone;
}

function ensureAdvancedState(app) {
  if (!app?.state) return null;
  const state = app.state;
  state.assignments = state.assignments || [];
  state.activeAssignment = state.activeAssignment || null;
  state.buildReplay = state.buildReplay || {
    history: [],
    lastSignature: "",
    isPlaying: false
  };
  state.multimeter = state.multimeter || {
    selection: { type: "overview" }
  };
  state.aiViva = state.aiViva || {
    active: false,
    questions: [],
    answers: [],
    currentIndex: 0,
    summary: null
  };
  state.voiceConversation = state.voiceConversation || {
    listening: false,
    supported: false,
    transcript: ""
  };
  state.voiceConversation.supported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  return state;
}

function formatDisplayDate(value) {
  if (!value) return "No due date";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getChallengeMeta(id) {
  return LEARNING_CHALLENGES.find(challenge => challenge.id === id) || LEARNING_CHALLENGES[0];
}

function buildEnhancedProjectSnapshot(app) {
  const snapshot = app.getProjectSnapshot?.() || {};
  const activeAssignment = app.state.activeAssignment;
  const challengeId = activeAssignment?.challengeId || ensureLearningState(app)?.selectedChallengeId || snapshot.challengeId || "";

  return {
    ...snapshot,
    challengeId,
    assignmentId: activeAssignment?.id || snapshot.assignmentId || null,
    assignmentTitle: activeAssignment?.title || snapshot.assignmentTitle || "",
    assignmentDueDate: activeAssignment?.dueDate || snapshot.assignmentDueDate || ""
  };
}

function syncClassroomContextFromProject(app, project = {}) {
  if (!app?.state) return;
  ensureAdvancedState(app);
  if (project.challengeId) {
    ensureLearningState(app);
    app.state.learning.selectedChallengeId = project.challengeId;
  }
  app.state.activeAssignment = project.assignmentId || project.assignmentTitle
    ? {
        id: project.assignmentId || null,
        title: project.assignmentTitle || project.name || "Assignment",
        dueDate: project.assignmentDueDate || "",
        challengeId: project.challengeId || ensureLearningState(app)?.selectedChallengeId || "led-circuit",
        className: project.className || ""
      }
    : null;
}

function ensureAiDebugToast() {
  let toast = document.getElementById("aiDebugToast");
  if (toast) return toast;
  toast = document.createElement("div");
  toast.id = "aiDebugToast";
  toast.className = "ai-debug-toast";
  document.body.appendChild(toast);
  return toast;
}

function showAiDebugMessage(message) {
  const toast = ensureAiDebugToast();
  if (typeof message === "object" && message) {
    const status = message.status === "safe" ? "safe" : "error";
    toast.className = `ai-debug-toast status-${status}`;
    toast.innerHTML = `
      <div class="ai-debug-toast-head">
        <span class="ai-debug-status-pill">${status}</span>
        <b>${escapeHtml(message.headline)}</b>
      </div>
      <p>${escapeHtml(message.explanation)}</p>
      <div class="ai-debug-toast-grid">
        <span><b>Suggestion</b>${escapeHtml(message.suggestion)}</span>
        <span><b>Efficiency</b>${escapeHtml(message.efficiency)}%</span>
      </div>
    `;
  } else {
    toast.className = "ai-debug-toast status-info";
    toast.textContent = message;
  }
  toast.classList.add("show");
  clearTimeout(showAiDebugMessage.timer);
  showAiDebugMessage.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 5200);
}

function healthClass(health = "safe") {
  if (health === "danger") return "danger";
  if (health === "warning") return "warning";
  return "success";
}

function debuggerStatus(coach = {}) {
  return coach.status || (coach.health === "safe" ? "safe" : "error");
}

function buildDebuggerResponse(report = {}) {
  const coach = report.coach || buildCoachFeedback(report.analysis || report);
  const status = debuggerStatus(coach);
  const suggestion = coach.suggestion || coach.primaryTip || "Run logic again after the next wiring change.";
  const explanation = coach.simpleExplanation || coach.conversation || coach.headline || "The circuit was checked.";
  const efficiency = coach.efficiencyPercent ?? coach.efficiencyScore ?? 0;

  return {
    status,
    health: coach.health || (status === "safe" ? "safe" : "danger"),
    headline: coach.headline || (status === "safe" ? "Circuit looks safe" : "Circuit needs a fix"),
    explanation,
    suggestion,
    efficiency
  };
}

function composeUpgradeHook(name, handler) {
  const api = window.EducircuitUpgrade || {};
  const previous = api[name];
  api[name] = (...args) => {
    previous?.(...args);
    handler(...args);
  };
  window.EducircuitUpgrade = api;
}

function installLandingInteractions() {
  if (document.body.dataset.landingInteractionsInstalled === "true") return;
  document.body.dataset.landingInteractionsInstalled = "true";
  document.body.classList.add("reveal-effects-enabled");

  document.querySelectorAll("[data-scroll-target]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(button.dataset.scrollTarget)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });

  const revealItems = document.querySelectorAll(".reveal-on-scroll");
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealItems.forEach(item => observer.observe(item));

  const labCard = document.querySelector(".landing-product-card");
  const labScore = document.getElementById("landingLabScore");
  const labStatus = document.getElementById("landingLabStatus");
  const labHint = document.getElementById("landingLabHint");
  const labCoach = document.getElementById("landingLabCoach");
  const labButtons = document.querySelectorAll("[data-landing-lab]");
  const labNodes = document.querySelectorAll(".landing-lab-node");
  const labStates = {
    safe: {
      score: "94%",
      status: "Live AI Coach",
      hint: "Safe loop, correct polarity, logic used",
      coach: "No short circuit found. LED has protection and voltage is in range.",
      className: "",
      warningNode: ""
    },
    warning: {
      score: "62%",
      status: "Fix Suggestion",
      hint: "LED works, but current protection is missing",
      coach: "Add a resistor in series with the LED. That keeps the circuit safer and improves your project score.",
      className: "lab-warning",
      warningNode: "resistor"
    },
    teacher: {
      score: "A-",
      status: "Teacher Review",
      hint: "Auto-grade plus editable feedback",
      coach: "Teacher view highlights safety, logic usage, and a feedback draft students can actually learn from.",
      className: "lab-teacher",
      warningNode: ""
    }
  };

  function setLabState(key) {
    const state = labStates[key] || labStates.safe;
    labCard?.classList.remove("lab-warning", "lab-teacher");
    if (state.className) labCard?.classList.add(state.className);
    if (labScore) labScore.textContent = state.score;
    if (labStatus) labStatus.textContent = state.status;
    if (labHint) labHint.textContent = state.hint;
    if (labCoach) labCoach.textContent = state.coach;
    labButtons.forEach(button => button.classList.toggle("active", button.dataset.landingLab === key));
    labNodes.forEach(node => {
      node.classList.toggle("warning", node.dataset.node === state.warningNode);
      node.classList.toggle("active", node.dataset.node !== state.warningNode);
    });
  }

  labButtons.forEach(button => {
    button.addEventListener("click", () => setLabState(button.dataset.landingLab));
  });

  labCard?.addEventListener("pointermove", event => {
    const rect = labCard.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    labCard.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-4px)`;
  });

  labCard?.addEventListener("pointerleave", () => {
    labCard.style.transform = "";
  });
}

function installMicroInteractions() {
  if (document.body.dataset.microInteractionsInstalled === "true") return;
  document.body.dataset.microInteractionsInstalled = "true";
  document.addEventListener("click", event => {
    const target = event.target.closest("button, .btn, .component-card, .example-item");
    if (!target || target.disabled) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ui-ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });
}

function ensureSimulationFeedbackPanel() {
  let panel = document.getElementById("simulationFeedbackPanel");
  if (panel) return panel;

  panel = document.createElement("aside");
  panel.id = "simulationFeedbackPanel";
  panel.className = "simulation-feedback-panel";
  const workspace = document.getElementById("workspaceArea");
  (workspace || document.body).appendChild(panel);
  return panel;
}

function showSimulationFeedback(report) {
  const panel = ensureSimulationFeedbackPanel();
  const coach = report.coach || buildCoachFeedback(report.analysis);
  const debuggerResponse = buildDebuggerResponse(report);
  const panelClass = healthClass(coach.health);
  const icon = coach.health === "danger" ? "!" : coach.health === "warning" ? "?" : "✓";
  const suggestions = coach.optimizationTips.slice(0, 3);

  panel.className = `simulation-feedback-panel ${panelClass}`;
  panel.innerHTML = `
    <div class="simulation-feedback-top">
      <div class="simulation-feedback-icon">${icon}</div>
      <div>
        <h4>${escapeHtml(coach.headline)}</h4>
        <p>${escapeHtml(coach.conversation)}</p>
      </div>
    </div>
    <ul>
      ${suggestions.map(tip => `<li>${escapeHtml(tip)}</li>`).join("")}
    </ul>
    <div class="debugger-response-grid" aria-label="AI debugger result">
      <div><span>Status</span><b class="debugger-status-${debuggerResponse.status}">${escapeHtml(debuggerResponse.status)}</b></div>
      <div><span>Efficiency</span><b>${escapeHtml(debuggerResponse.efficiency)}%</b></div>
      <div class="wide"><span>Simple explanation</span><p>${escapeHtml(debuggerResponse.explanation)}</p></div>
      <div class="wide"><span>Suggestion</span><p>${escapeHtml(debuggerResponse.suggestion)}</p></div>
    </div>
  `;
  requestAnimationFrame(() => panel.classList.add("show"));
  clearTimeout(showSimulationFeedback.timer);
  showSimulationFeedback.timer = setTimeout(() => {
    panel.classList.remove("show");
  }, 7200);
}

const runtimePrefs = window.EducircuitRuntimePrefs = window.EducircuitRuntimePrefs || {
  theme: "light",
  hideLanding: false,
  voiceCoachEnabled: true,
  voiceCoachVoice: ""
};
const DEFAULT_VOICE_KEY = "en-gb";
const DEFAULT_VOICE_LANG = "en-GB";
const CURATED_VOICE_GROUPS = [
  {
    label: "English",
    voices: [
      ["en-gb", "UK English"],
      ["en-us", "American English"],
      ["en-in", "Indian English"]
    ]
  },
  {
    label: "Indian Languages",
    voices: [
      ["hi-in", "हिन्दी"],
      ["ta-in", "தமிழ்"],
      ["te-in", "తెలుగు"],
      ["kn-in", "ಕನ್ನಡ"],
      ["ml-in", "മലയാളം"],
      ["bn-in", "বাংলা"],
      ["mr-in", "मराठी"],
      ["gu-in", "ગુજરાતી"],
      ["pa-in", "ਪੰਜਾਬੀ"],
      ["ur-in", "اردو"],
      ["or-in", "ଓଡ଼ିଆ"],
      ["as-in", "অসমীয়া"],
      ["sa-in", "संस्कृत"],
      ["kok-in", "कोंकणी"],
      ["ne-in", "नेपाली"],
      ["sd-in", "سنڌي"],
      ["ks-in", "کٲشُر"],
      ["doi-in", "डोगरी"],
      ["mai-in", "मैथिली"],
      ["brx-in", "बड़ो"],
      ["mni-in", "ꯃꯤꯇꯩꯂꯣꯟ"],
      ["sat-in", "ᱥᱟᱱᱛᱟᱲᱤ"]
    ]
  }
];
const CURATED_VOICE_LABELS = new Map(CURATED_VOICE_GROUPS.flatMap(group => group.voices));
const CURATED_VOICE_ORDER = new Map([...CURATED_VOICE_LABELS.keys()].map((key, index) => [key, index]));

function isVoiceCoachEnabled() {
  return runtimePrefs.voiceCoachEnabled !== false;
}

function updateVoiceCoachButton(button = document.getElementById("voiceCoachBtn")) {
  if (!button) return;
  const enabled = isVoiceCoachEnabled();
  button.textContent = enabled ? "Voice Coach On" : "Voice Coach Off";
  button.setAttribute("aria-pressed", String(enabled));
}

function getSpeechVoices() {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices?.() || [];
}

function getVoiceOptionValue(voice) {
  return voice?.voiceURI || voice?.name || "";
}

function normalizeVoiceLang(voice) {
  return String(voice?.lang || "").trim().toLowerCase().replace("_", "-");
}

function getCuratedVoiceKey(voice) {
  const lang = normalizeVoiceLang(voice);
  if (CURATED_VOICE_LABELS.has(lang)) return lang;

  const baseLang = lang.split("-")[0];
  const indiaKey = `${baseLang}-in`;
  if (CURATED_VOICE_LABELS.has(indiaKey) && (lang === baseLang || lang.endsWith("-in"))) {
    return indiaKey;
  }

  return "";
}

function getCuratedVoiceOptions() {
  const selectedValue = runtimePrefs.voiceCoachVoice || "";
  const byLanguage = new Map();

  getSpeechVoices().forEach(voice => {
    const key = getCuratedVoiceKey(voice);
    if (!key) return;

    const current = byLanguage.get(key);
    const isSelectedVoice = getVoiceOptionValue(voice) === selectedValue;
    if (!current || isSelectedVoice || (!current.voice.default && voice.default)) {
      byLanguage.set(key, {
        key,
        voice,
        label: CURATED_VOICE_LABELS.get(key),
        group: CURATED_VOICE_GROUPS.find(group => group.voices.some(([voiceKey]) => voiceKey === key))?.label || "Voices",
        order: CURATED_VOICE_ORDER.get(key) ?? 999
      });
    }
  });

  return [...byLanguage.values()].sort((a, b) => a.order - b.order);
}

function getSelectedVoice() {
  return getPreferredVoiceOption()?.voice || null;
}

function getPreferredVoiceOption(curatedOptions = getCuratedVoiceOptions()) {
  const selectedValue = runtimePrefs.voiceCoachVoice || "";
  const selectedOption = selectedValue
    ? curatedOptions.find(option => getVoiceOptionValue(option.voice) === selectedValue || option.key === selectedValue)
    : null;
  return selectedOption ||
    curatedOptions.find(option => option.key === DEFAULT_VOICE_KEY) ||
    curatedOptions.find(option => option.key.startsWith("en-")) ||
    null;
}

function updateVoiceCoachOptions(select = document.getElementById("voiceCoachSelect")) {
  if (!select) return;
  const selectedValue = runtimePrefs.voiceCoachVoice || "";
  const curatedOptions = getCuratedVoiceOptions();
  const groupedOptions = CURATED_VOICE_GROUPS.map(group => {
    const options = curatedOptions
      .filter(option => option.group === group.label)
      .map(option => `<option value="${escapeHtml(getVoiceOptionValue(option.voice))}">${escapeHtml(option.label)}</option>`)
      .join("");
    return options ? `<optgroup label="${escapeHtml(group.label)}">${options}</optgroup>` : "";
  }).join("");
  const unavailableNote = curatedOptions.length
    ? ""
    : `<option value="" disabled>No curated voices installed</option>`;
  const preferredOption = getPreferredVoiceOption(curatedOptions);
  const preferredValue = preferredOption ? getVoiceOptionValue(preferredOption.voice) : "";

  select.innerHTML = `<option value="">UK English default</option>${groupedOptions}${unavailableNote}`;
  select.value = curatedOptions.some(option => getVoiceOptionValue(option.voice) === selectedValue)
    ? selectedValue
    : preferredValue;
}

function installVoiceCoachToggle(app) {
  const toolbarGroup = document.querySelector(".canvas-toolbar .toolbar-group:last-child");
  if (!toolbarGroup || document.getElementById("voiceCoachBtn")) return;

  const controls = document.createElement("div");
  controls.className = "voice-coach-controls";

  const label = document.createElement("label");
  label.className = "voice-coach-label";
  label.htmlFor = "voiceCoachSelect";
  label.textContent = "Voice";

  const select = document.createElement("select");
  select.id = "voiceCoachSelect";
  select.className = "voice-coach-select";
  select.setAttribute("aria-label", "Voice Coach voice");
  select.addEventListener("change", () => {
    runtimePrefs.voiceCoachVoice = select.value;
    const label = select.selectedOptions?.[0]?.textContent || "Default voice";
    app.showToast?.(`Voice set to ${label}`);
  });

  const button = document.createElement("button");
  button.type = "button";
  button.id = "voiceCoachBtn";
  button.className = "secondary voice-coach-btn";
  button.addEventListener("click", () => {
    const nextEnabled = !isVoiceCoachEnabled();
    runtimePrefs.voiceCoachEnabled = nextEnabled;
    updateVoiceCoachButton(button);
    if (!nextEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    app.showToast?.(nextEnabled ? "Voice Coach enabled" : "Voice Coach muted");
  });

  controls.append(label, select, button);
  toolbarGroup.appendChild(controls);
  updateVoiceCoachOptions(select);
  updateVoiceCoachButton(button);

  if ("speechSynthesis" in window) {
    const refreshVoiceOptions = () => updateVoiceCoachOptions(select);
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoiceOptions);
    setTimeout(refreshVoiceOptions, 300);
  }
}

function sanitizeSpeechText(text = "") {
  return String(text)
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speakTextWithVoice(text, app, options = {}) {
  if (!isVoiceCoachEnabled()) return;
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    app?.showToast?.("Voice Coach is not supported in this browser");
    return;
  }

  const cleanedText = sanitizeSpeechText(text);
  if (!cleanedText) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanedText);
  const selectedVoice = getSelectedVoice();
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.lang = options.lang || selectedVoice?.lang || DEFAULT_VOICE_LANG;
  utterance.rate = options.rate || 0.92;
  utterance.pitch = options.pitch || 1;
  window.speechSynthesis.speak(utterance);
}

function buildVoiceCoachText(report = {}) {
  const analysis = report.analysis || report;
  const coach = report.coach || buildCoachFeedback(analysis);
  const diagnostic = (analysis.diagnostics || []).find(item => item.severity === "error") ||
    (analysis.diagnostics || []).find(item => item.severity === "warning");

  if (diagnostic) {
    const severity = diagnostic.severity === "error" ? "Error" : "Warning";
    return sanitizeSpeechText(
      `Circuit coach. ${severity}: ${diagnostic.title}. ${diagnostic.message}. To solve it: ${diagnostic.suggestion}`
    );
  }

  return sanitizeSpeechText(
    `Circuit coach. ${coach.headline}. ${coach.simpleExplanation || coach.conversation}. Efficiency ${coach.efficiencyPercent || coach.efficiencyScore || 0} percent.`
  );
}

function speakCircuitCoach(report, app) {
  const text = buildVoiceCoachText(report);
  speakTextWithVoice(text, app);
}

function hasActiveOutput(report = {}) {
  const outputs = report.analysis?.outputs || report.outputs || {};
  return Object.values(outputs).some(output => output?.active);
}

function hasBlockingError(report = {}) {
  const analysis = report.analysis || report;
  return Boolean(
    analysis.hasShortCircuit ||
    analysis.hasUnsafeVoltage ||
    (analysis.diagnostics || []).some(diagnostic => diagnostic.severity === "error")
  );
}

function setBatteryControlValue(voltage) {
  const value = Number(voltage || 0);
  const voltageRange = document.getElementById("batteryVoltageRange");
  const voltageValue = document.getElementById("batteryVoltageValue");
  if (voltageRange) voltageRange.value = String(value);
  if (voltageValue) voltageValue.textContent = `${value.toFixed(1)}V`;
}

function createQuickStartItem(app, type, x, y, extras = {}) {
  const spec = app.getCatalog?.(type);
  const id = `item-${app.state.nextId++}`;
  return {
    id,
    type,
    x,
    y,
    ports: spec?.ports?.slice() || ["negative", "positive"],
    voltage: type === "Battery" ? app.state.defaultBatteryVoltage : undefined,
    isClosed: type === "Switch" || type === "Relay" ? false : undefined,
    ledOn: false,
    motorOn: false,
    buzzerOn: false,
    ...extras
  };
}

function loadQuickStartCircuit(app, preset) {
  if (!app?.state) return;
  const state = app.state;
  const voltage = preset === "motor" ? 6 : 3;
  const title = preset === "motor" ? "Motor Quick Start" : "LED Quick Start";

  state.items = [];
  state.wires = [];
  state.logic = ["ON", "WAIT 1s"];
  state.learning = state.learning || {};
  state.learning.selectedChallengeId = preset === "motor" ? "motor-circuit" : "led-circuit";
  state.learning.lastResult = null;
  state.selectedPort = null;
  state.wireDrag = null;
  state.drag = null;
  state.logicArmed = false;
  state.currentProjectIndex = null;
  state.projectName = title;
  state.defaultBatteryVoltage = voltage;
  state.outputs = { led: false, motor: false, buzzer: false, overload: false };
  state.activeItems = [];
  state.burstItems = [];
  state.nextId = 1;

  const battery = createQuickStartItem(app, "Battery", 88, 112);
  if (preset === "motor") {
    const switchItem = createQuickStartItem(app, "Switch", 292, 112);
    const motor = createQuickStartItem(app, "Motor", 506, 112);
    state.items.push(battery, switchItem, motor);
    state.wires = [
      { id: "wire-quick-motor-start", from: { itemId: battery.id, port: "positive" }, to: { itemId: switchItem.id, port: "positive" } },
      { id: "wire-quick-motor-chain", from: { itemId: switchItem.id, port: "negative" }, to: { itemId: motor.id, port: "positive" } },
      { id: "wire-quick-motor-return", from: { itemId: motor.id, port: "negative" }, to: { itemId: battery.id, port: "negative" } }
    ];
  } else {
    const resistor = createQuickStartItem(app, "Resistor", 292, 112);
    const led = createQuickStartItem(app, "LED", 506, 112);
    state.items.push(battery, resistor, led);
    state.wires = [
      { id: "wire-quick-led-start", from: { itemId: battery.id, port: "positive" }, to: { itemId: resistor.id, port: "positive" } },
      { id: "wire-quick-led-chain", from: { itemId: resistor.id, port: "negative" }, to: { itemId: led.id, port: "positive" } },
      { id: "wire-quick-led-return", from: { itemId: led.id, port: "negative" }, to: { itemId: battery.id, port: "negative" } }
    ];
  }

  const projectNameText = document.getElementById("projectNameText");
  if (projectNameText) projectNameText.textContent = title;
  setBatteryControlValue(voltage);
  app.refreshSimulation?.();
  app.renderItems?.();
  app.renderLogic?.();
  app.updateTeacherStats?.();
  syncWorkspaceExperience(app);
  app.showToast?.(`${preset === "motor" ? "Motor" : "LED"} circuit loaded. Press Run Logic to watch current flow.`);
}

function ensureWorkspaceEmptyState(app) {
  const workspace = document.getElementById("workspaceArea");
  if (!workspace) return null;

  let emptyState = document.getElementById("workspaceEmptyState");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.id = "workspaceEmptyState";
    emptyState.className = "workspace-empty-state";
    emptyState.innerHTML = `
      <div class="workspace-empty-copy">
        <b>Drag components here to start building ⚡</b>
        <span>Or start with a ready-made classroom circuit.</span>
      </div>
      <div class="workspace-quick-starts">
        <button type="button" data-quick-start="led">LED circuit</button>
        <button type="button" data-quick-start="motor">motor circuit</button>
      </div>
    `;
    workspace.appendChild(emptyState);
  }

  if (emptyState.dataset.installed !== "true") {
    emptyState.dataset.installed = "true";
    emptyState.querySelectorAll("[data-quick-start]").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        loadQuickStartCircuit(app, button.dataset.quickStart);
      });
    });
  }

  return emptyState;
}

function decorateWireLayer(app) {
  const wireLayer = document.getElementById("wireLayer");
  if (!wireLayer || !app?.state) return;

  const report = app.state.simulationReport || analyzeCircuit(app.getProjectSnapshot?.() || app.state);
  const flowIsActive = document.body.classList.contains("simulation-flow-active");
  const shouldFlow = flowIsActive && hasActiveOutput(report) && !hasBlockingError(report);
  const activeWireIds = shouldFlow
    ? new Set((app.state.wires || []).map(wire => wire.id))
    : new Set();

  wireLayer.classList.add("wire-flow-ready");
  wireLayer.querySelectorAll("path[data-id]").forEach(path => {
    const isActive = activeWireIds.has(path.dataset.id);
    path.classList.add("wire-path-upgraded");
    path.classList.toggle("wire-path-active", isActive);
    path.classList.toggle("wire-path-paused", !isActive);

    let node = path.nextElementSibling;
    for (let index = 0; node && index < 4; index += 1, node = node.nextElementSibling) {
      if (node.querySelector?.("animateMotion")) {
        node.classList.add("wire-flow-dot");
        node.classList.toggle("is-active", isActive);
        break;
      }
    }
  });
}

function renderWorkspaceEmptyState(app) {
  const workspace = document.getElementById("workspaceArea");
  const emptyState = ensureWorkspaceEmptyState(app);
  if (!workspace || !emptyState || !app?.state) return;

  const isEmpty = !app.state.items?.length;
  workspace.classList.toggle("workspace-is-empty", isEmpty);
  workspace.classList.toggle("workspace-wiring", Boolean(app.state.selectedPort || app.state.wireDrag));
  emptyState.classList.toggle("hidden", !isEmpty);
}

function syncWorkspaceExperience(app) {
  renderWorkspaceEmptyState(app);
  decorateWireLayer(app);
}

function startCurrentFlowAnimation(app, report) {
  const workspace = document.getElementById("workspaceArea");
  const response = buildDebuggerResponse(report);
  const canAnimateFlow = hasActiveOutput(report) && !hasBlockingError(report);

  clearTimeout(startCurrentFlowAnimation.timer);
  document.body.classList.toggle("simulation-flow-active", canAnimateFlow);
  document.body.classList.toggle("simulation-flow-error", response.status !== "safe");
  workspace?.classList.add("simulation-running");
  workspace?.classList.toggle("simulation-running-error", !canAnimateFlow);
  decorateWireLayer(app);

  startCurrentFlowAnimation.timer = setTimeout(() => {
    document.body.classList.remove("simulation-flow-active", "simulation-flow-error");
    workspace?.classList.remove("simulation-running", "simulation-running-error");
    decorateWireLayer(app);
  }, 6200);
}

function installButtonHierarchy() {
  const primaryButtons = [
    document.getElementById("runLogicBtn"),
    document.getElementById("saveBtn")
  ];

  primaryButtons.forEach(button => {
    if (!button) return;
    button.classList.remove("secondary", "green");
    button.classList.add("primary-action");
  });

  document.querySelectorAll("#stopLogicBtn, #autoWireBtn, #toggleGridBtn, #clearBtn, #zoomOutBtn, #zoomInBtn")
    .forEach(button => button.classList.add("quiet-action"));
}

function installWorkspaceExperience(app) {
  if (!app?.state) return;
  installButtonHierarchy();

  if (document.body.dataset.workspaceExperienceInstalled !== "true") {
    document.body.dataset.workspaceExperienceInstalled = "true";
    composeUpgradeHook("afterRenderItems", () => syncWorkspaceExperience(app));
    composeUpgradeHook("afterUpdateOutputs", () => syncWorkspaceExperience(app));
    document.addEventListener("click", event => {
      const button = event.target.closest("#runLogicBtn");
      if (!button || button.dataset.upgradeOverride === "true") return;

      window.setTimeout(() => {
        const report = buildHumanReadableDebugReport(app.getProjectSnapshot());
        const debuggerResponse = buildDebuggerResponse(report);
        showSimulationFeedback(report);
        startCurrentFlowAnimation(app, report);
        showAiDebugMessage(debuggerResponse);
      }, 360);
    });
  }

  syncWorkspaceExperience(app);
}

function installBrandingAndTheme() {
  if (document.body.dataset.brandingThemeInstalled === "true") return;
  document.body.dataset.brandingThemeInstalled = "true";

  document.querySelectorAll(".brand-logo, .login-logo").forEach(img => {
    if (img.parentElement?.classList.contains("logo-pulse")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "logo-pulse app-logo-pulse";
    img.replaceWith(wrapper);
    wrapper.appendChild(img);
    const bolt = document.createElement("span");
    bolt.className = "lightning-bolt";
    bolt.textContent = "⚡";
    wrapper.appendChild(bolt);
  });

  const topActions = document.querySelector(".top-actions");
  if (topActions && !document.getElementById("appThemeToggleBtn")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondary theme-toggle-btn";
    btn.id = "appThemeToggleBtn";
    btn.dataset.themeToggle = "true";
    btn.textContent = "Dark Mode";
    topActions.insertBefore(btn, topActions.firstChild);
  }

  function applyTheme(theme) {
    runtimePrefs.theme = theme;
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.textContent = isDark ? "Light Mode" : "Dark Mode";
      btn.setAttribute("aria-pressed", String(isDark));
    });
  }

  const savedTheme = runtimePrefs.theme;
  applyTheme(savedTheme || "light");

  document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(document.body.classList.contains("dark-mode") ? "light" : "dark");
    });
  });
}

function installLoginStepper({
  onSubmit,
  toast
} = {}) {
  const loginCard = document.querySelector(".premium-login-card");
  if (!loginCard) return null;

  const loginBackStepBtn = document.getElementById("loginBackStepBtn");
  const loginStepOne = document.getElementById("loginStepOne");
  const loginStepTwo = document.getElementById("loginStepTwo");

  const stepper = window.EducircuitLoginStepper || {};
  stepper.onSubmit = onSubmit || stepper.onSubmit;
  stepper.toast = toast || stepper.toast || (message => window.educircuitApp?.showToast?.(message) || console.warn(message));

  function goToLoginStep(step) {
    const nextStep = step === 2 ? 2 : 1;
    loginCard.setAttribute("data-step", String(nextStep));
    document.querySelectorAll(".login-step").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.loginStep === String(nextStep));
    });
    loginStepOne?.classList.toggle("active", nextStep === 1);
    loginStepTwo?.classList.toggle("active", nextStep === 2);
    if (nextStep === 2) {
      const authMode = window.EducircuitAuthFlow?.getMode?.() || loginCard.dataset.authMode || "create";
      const firstFieldId = authMode === "login" ? "loginSchoolUser" : "loginName";
      setTimeout(() => document.getElementById(firstFieldId)?.focus(), 80);
    }
  }

  stepper.goToLoginStep = goToLoginStep;

  if (!stepper.installed) {
    stepper.originalEnterPlatform = window.enterPlatform?.bind(window);
    loginBackStepBtn?.addEventListener("click", () => goToLoginStep(1));
    window.enterPlatform = () => {
      if (loginCard.dataset.step === "1") {
        const authMode = window.EducircuitAuthFlow?.getMode?.() || loginCard.dataset.authMode || "create";
        window.EducircuitAuthFlow?.openAuthMode?.(authMode) || goToLoginStep(2);
        return;
      }
      if (typeof stepper.onSubmit === "function") {
        stepper.onSubmit();
        return;
      }
      stepper.originalEnterPlatform?.();
    };
    stepper.installed = true;
  }

  window.EducircuitLoginStepper = stepper;
  goToLoginStep(Number(loginCard.dataset.step || 1));
  if (window.EducircuitAuthFlow) {
    window.EducircuitAuthFlow.goToLoginStep = goToLoginStep;
  }
  return stepper;
}

function ensureRoleOption(select, value, label) {
  if (!select.querySelector(`option[value="${value}"]`)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.insertBefore(option, select.firstChild);
  }
}

function profileForLegacy(profile) {
  return {
    uid: profile.uid,
    name: profile.name,
    role: profile.role,
    className: profile.className || "",
    school: profile.school,
    schoolKey: profile.schoolId || profile.schoolKey || "",
    schoolId: profile.schoolId || profile.schoolKey || "",
    email: profile.email || ""
  };
}

function getProjectVisibilitySelect() {
  let select = document.getElementById("projectVisibilitySelect");
  if (select) return select;

  const studentPanel = document.getElementById("studentPanel");
  const shareCard = createCard("Sharing", "Control who can discover this project and allow cloning.");
  shareCard.id = "sharingCard";
  shareCard.innerHTML += `
    <div class="field">
      <label for="projectVisibilitySelect">Visibility</label>
      <select id="projectVisibilitySelect">
        <option value="private">Private</option>
        <option value="school">School</option>
        <option value="public">Public</option>
      </select>
    </div>
    <div class="small-note">Public projects appear on Explore Projects and can be cloned by other classrooms.</div>
  `;
  studentPanel.appendChild(shareCard);
  return shareCard.querySelector("#projectVisibilitySelect");
}

function setProjectVisibility(value = "private") {
  const select = getProjectVisibilitySelect();
  const allowed = new Set(["private", "school", "public"]);
  select.value = allowed.has(value) ? value : "private";
}

function isReviewedProject(project = {}) {
  const grade = String(project.grade || "").trim();
  const status = String(project.status || "").toUpperCase();
  return status === "GRADED" || Boolean(grade && grade !== "Not graded");
}

function ensureExplorePage() {
  let page = document.getElementById("exploreProjectsPage");
  if (page) return page;

  page = document.createElement("div");
  page.id = "exploreProjectsPage";
  page.className = "hidden upgrade-overlay";
  page.innerHTML = `
    <div class="upgrade-overlay-shell">
      <div class="upgrade-overlay-head">
        <div>
          <h2>Explore Projects</h2>
          <p>Discover public school projects and clone strong ideas into your own workspace.</p>
        </div>
        <button class="secondary" id="closeExploreProjectsBtn">Back</button>
      </div>
      <div id="exploreProjectsList" class="upgrade-project-grid"></div>
    </div>
  `;
  document.body.appendChild(page);
  page.querySelector("#closeExploreProjectsBtn").addEventListener("click", () => {
    page.classList.add("hidden");
  });
  return page;
}

function renderIntensityDecorations(app) {
  const report = app.state.simulationReport;
  if (!report?.componentStates) return;

  document.querySelectorAll(".canvas-item").forEach(card => {
    card.querySelector(".intensity-pill")?.remove();
    const componentState = report.componentStates[card.dataset.id];
    if (!componentState || componentState.intensityPercent <= 0) return;

    const pill = document.createElement("div");
    pill.className = "intensity-pill";
    pill.textContent = `${componentState.intensityPercent}%`;
    card.appendChild(pill);
  });

  const ledState = report.outputs?.led;
  const motorState = report.outputs?.motor;
  const buzzerState = report.outputs?.buzzer;
  const ledText = document.getElementById("ledStateText");
  const motorText = document.getElementById("motorStateText");
  const buzzerText = document.getElementById("buzzerStateText");
  if (ledText && ledState) ledText.textContent = ledState.active ? `ON • ${ledState.intensityPercent}%` : "OFF";
  if (motorText && motorState) motorText.textContent = motorState.active ? `ON • ${motorState.intensityPercent}%` : "OFF";
  if (buzzerText && buzzerState) buzzerText.textContent = buzzerState.active ? `ON • ${buzzerState.intensityPercent}%` : "OFF";
}

function installDashboardEnhancements(app) {
  ensureLearningState(app);
  const coachFixText = document.getElementById("coachFixText");
  if (coachFixText && !document.getElementById("coachEfficiencyValue")) {
    coachFixText.insertAdjacentHTML("afterend", `
      <div class="coach-score-card">
        <div class="coach-score-head">
          <span>AI efficiency score</span>
          <b id="coachEfficiencyValue">--</b>
        </div>
        <div class="coach-meter"><span id="coachEfficiencyBar"></span></div>
      </div>
      <div class="coach-suggestion-list" id="coachSuggestionList"></div>
    `);
  }

  const batteryVoltageRange = document.getElementById("batteryVoltageRange");
  const batteryCard = batteryVoltageRange?.closest(".dashboard-card");
  if (batteryCard && !document.getElementById("voltageHealthBar")) {
    batteryCard.insertAdjacentHTML("beforeend", `
      <div class="voltage-health-card">
        <div class="voltage-meter-head">
          <span>Voltage safety range</span>
          <b id="voltageHealthLabel">Live</b>
        </div>
        <div class="voltage-meter"><span id="voltageHealthBar"></span></div>
      </div>
    `);
  }

  const studentPanel = document.getElementById("studentPanel");
  if (studentPanel && !document.getElementById("componentHealthCard")) {
    const card = createCard("Component Health", "Live status for every component currently on the workspace.");
    card.id = "componentHealthCard";
    card.innerHTML += `<div class="component-health-list" id="componentHealthList"></div>`;
    studentPanel.appendChild(card);
  }

  if (studentPanel && !document.getElementById("learningChallengeCard")) {
    const card = createCard("Learning Challenge", "Pick a task, run logic, and get a score with hints.");
    card.id = "learningChallengeCard";
    card.innerHTML += `
      <div class="learning-challenge-tabs" id="learningChallengeTabs"></div>
      <div class="learning-score-row">
        <div>
          <span>Score</span>
          <b id="learningScoreValue">--</b>
        </div>
        <div>
          <span>Status</span>
          <b id="learningStatusValue">Ready</b>
        </div>
      </div>
      <div class="learning-meter"><span id="learningScoreBar"></span></div>
      <p class="learning-hint" id="learningHintText">Choose a challenge, build the circuit, then press Run Logic.</p>
      <div class="learning-requirements" id="learningRequirements"></div>
    `;
    studentPanel.insertBefore(card, document.getElementById("componentHealthCard") || null);
  }

  const challengeTabs = document.getElementById("learningChallengeTabs");
  if (challengeTabs && challengeTabs.dataset.learningTabsInstalled !== "true") {
    challengeTabs.dataset.learningTabsInstalled = "true";
    challengeTabs.addEventListener("click", event => {
      const button = event.target.closest("[data-learning-challenge]");
      if (!button) return;
      ensureLearningState(app);
      app.state.learning.selectedChallengeId = button.dataset.learningChallenge;
      app.state.learning.lastResult = getLearningResult(app);
      renderLearningPanel(app);
      app.showToast?.(`${button.textContent.trim()} challenge selected`);
    });
  }

  renderLearningPanel(app);
  renderGuidedLabMode(app);
  renderMultimeterCard(app);
  renderReplayBuildCard(app);
  renderAiVivaCard(app);
}

function ensureLearningState(app) {
  if (!app?.state) return null;
  app.state.learning = app.state.learning || {};
  app.state.learning.selectedChallengeId = app.state.learning.selectedChallengeId || LEARNING_CHALLENGES[0].id;
  app.state.learning.lastResult = app.state.learning.lastResult || null;
  return app.state.learning;
}

function getLearningResult(app) {
  ensureLearningState(app);
  const snapshot = app.getProjectSnapshot?.() || app.state;
  const report = app.state.simulationReport || analyzeCircuit(snapshot);
  return evaluateLearningState(snapshot, {
    report,
    challengeId: app.state.learning.selectedChallengeId
  });
}

function renderLearningPanel(app) {
  const card = document.getElementById("learningChallengeCard");
  if (!card || !app?.state) return;

  const learning = ensureLearningState(app);
  const result = learning.lastResult || getLearningResult(app);
  learning.lastResult = result;

  const tabs = document.getElementById("learningChallengeTabs");
  if (tabs) {
    tabs.innerHTML = LEARNING_CHALLENGES.map(challenge => `
      <button
        type="button"
        class="secondary ${challenge.id === learning.selectedChallengeId ? "active" : ""}"
        data-learning-challenge="${escapeHtml(challenge.id)}"
      >${escapeHtml(challenge.shortTitle || challenge.title)}</button>
    `).join("");
  }

  const status = result.challenge.passed
    ? "Complete"
    : result.circuit.isCorrect
      ? "Correct"
      : "Needs fix";
  const statusClass = result.challenge.passed || result.circuit.isCorrect
    ? "status-chip-safe"
    : result.hint.level === "error"
      ? "status-chip-danger"
      : "status-chip-warning";

  const scoreValue = document.getElementById("learningScoreValue");
  const statusValue = document.getElementById("learningStatusValue");
  const scoreBar = document.getElementById("learningScoreBar");
  const hintText = document.getElementById("learningHintText");
  const requirements = document.getElementById("learningRequirements");

  if (scoreValue) scoreValue.textContent = `${result.score.total}/100`;
  if (statusValue) {
    statusValue.textContent = status;
    statusValue.className = statusClass;
  }
  if (scoreBar) scoreBar.style.width = `${result.score.total}%`;
  if (hintText) {
    hintText.textContent = result.challenge.passed
      ? result.challenge.message
      : result.hint.message;
  }
  if (requirements) {
    requirements.innerHTML = result.challenge.requirements
      .map(requirement => `
        <div class="learning-requirement ${requirement.passed ? "passed" : "pending"}">
          <span>${requirement.passed ? "✓" : "•"}</span>
          <b>${escapeHtml(requirement.label)}</b>
        </div>
      `)
      .join("");
  }
}

function recordBuildHistory(app, options = {}) {
  if (!app?.state) return;
  ensureAdvancedState(app);
  const replayState = app.state.buildReplay;
  if (replayState.isPlaying) return;

  const snapshot = buildEnhancedProjectSnapshot(app);
  const signature = buildSnapshotSignature(snapshot);
  if (signature === replayState.lastSignature) return;

  const previousEntry = replayState.history[replayState.history.length - 1] || null;
  const nextEntry = buildReplayEntry(snapshot, previousEntry?.snapshot || null, options);
  if (previousEntry && !replayEntriesDiffer(previousEntry, nextEntry)) {
    replayState.lastSignature = signature;
    return;
  }

  replayState.history = [...replayState.history, nextEntry].slice(-12);
  replayState.lastSignature = signature;
  renderReplayBuildCard(app);
}

async function playReplayBuild(app) {
  ensureAdvancedState(app);
  const replayState = app.state.buildReplay;
  if (replayState.isPlaying) {
    replayState.isPlaying = false;
    renderReplayBuildCard(app);
    app.showToast?.("Replay paused");
    return;
  }

  if ((replayState.history || []).length < 2) {
    app.showToast?.("Build a little more first, then replay your steps.");
    return;
  }

  replayState.isPlaying = true;
  renderReplayBuildCard(app);

  for (const entry of replayState.history) {
    if (!replayState.isPlaying) break;
    app.applyProjectSnapshot?.(entry.snapshot, {
      ownerName: entry.snapshot.ownerName,
      projectId: entry.snapshot.id
    });
    syncClassroomContextFromProject(app, entry.snapshot);
    renderLearningPanel(app);
    renderGuidedLabMode(app);
    renderMultimeterCard(app);
    await wait(620);
  }

  replayState.isPlaying = false;
  renderReplayBuildCard(app);
  app.showToast?.("Replay finished");
}

function clearReplayBuild(app) {
  ensureAdvancedState(app);
  const snapshot = buildEnhancedProjectSnapshot(app);
  app.state.buildReplay = {
    history: [buildReplayEntry(snapshot, null, { label: "Current workspace" })],
    lastSignature: buildSnapshotSignature(snapshot),
    isPlaying: false
  };
  renderReplayBuildCard(app);
}

function ensureReplayBuildCard() {
  let card = document.getElementById("replayBuildCard");
  if (card) return card;

  const studentPanel = document.getElementById("studentPanel");
  if (!studentPanel) return null;

  card = createCard("Replay Build", "Review the build sequence and play your own steps back.");
  card.id = "replayBuildCard";
  card.innerHTML += `
    <div class="replay-build-actions">
      <button type="button" id="replayBuildBtn">Replay Build</button>
      <button type="button" class="secondary" id="clearReplayBuildBtn">Reset Timeline</button>
    </div>
    <div id="replayBuildTimeline" class="replay-build-timeline"></div>
  `;
  studentPanel.appendChild(card);
  return card;
}

function renderReplayBuildCard(app) {
  const card = ensureReplayBuildCard();
  if (!card || !app?.state) return;

  ensureAdvancedState(app);
  const replayState = app.state.buildReplay;
  const button = card.querySelector("#replayBuildBtn");
  const clearButton = card.querySelector("#clearReplayBuildBtn");
  const timeline = card.querySelector("#replayBuildTimeline");

  if (button && button.dataset.bound !== "true") {
    button.dataset.bound = "true";
    button.addEventListener("click", () => playReplayBuild(app));
  }
  if (clearButton && clearButton.dataset.bound !== "true") {
    clearButton.dataset.bound = "true";
    clearButton.addEventListener("click", () => clearReplayBuild(app));
  }

  button.textContent = replayState.isPlaying ? "Pause Replay" : "Replay Build";
  timeline.innerHTML = replayState.history.length
    ? replayState.history
        .slice()
        .reverse()
        .map(entry => `
          <article class="replay-build-entry">
            <b>${escapeHtml(entry.label)}</b>
            <span>${escapeHtml(entry.detail)}</span>
          </article>
        `)
        .join("")
    : "<p class=\"upgrade-muted\">Your timeline appears as you build.</p>";
}

function ensureGuidedLabCard() {
  let card = document.getElementById("guidedLabModeCard");
  if (card) return card;

  const studentPanel = document.getElementById("studentPanel");
  if (!studentPanel) return null;

  card = createCard("Guided Lab", "Step-by-step coaching follows your active challenge or teacher assignment.");
  card.id = "guidedLabModeCard";
  card.innerHTML += `
    <div class="guided-lab-meta">
      <b id="guidedLabTitle">No active lab yet</b>
      <span id="guidedLabMeta">Choose a challenge or assignment to begin.</span>
    </div>
    <div id="guidedLabSteps" class="guided-lab-steps"></div>
    <div class="upgrade-inline-actions">
      <button type="button" id="guidedLabNextFixBtn">Next Fix</button>
      <button type="button" class="secondary" id="guidedLabStartVivaBtn">Start Viva</button>
    </div>
  `;

  const learningCard = document.getElementById("learningChallengeCard");
  if (learningCard?.nextSibling) {
    studentPanel.insertBefore(card, learningCard.nextSibling);
  } else {
    studentPanel.appendChild(card);
  }
  return card;
}

function renderGuidedLabMode(app) {
  const card = ensureGuidedLabCard();
  if (!card || !app?.state) return;

  ensureAdvancedState(app);
  const learningResult = app.state.learning?.lastResult || getLearningResult(app);
  const activeAssignment = app.state.activeAssignment;
  const activeChallenge = getChallengeMeta(app.state.learning?.selectedChallengeId);
  const title = card.querySelector("#guidedLabTitle");
  const meta = card.querySelector("#guidedLabMeta");
  const stepsEl = card.querySelector("#guidedLabSteps");
  const nextFixBtn = card.querySelector("#guidedLabNextFixBtn");
  const startVivaBtn = card.querySelector("#guidedLabStartVivaBtn");
  const steps = buildGuidedLabSteps(learningResult, activeAssignment);
  const nextFix = getGuidedLabNextFix(learningResult);

  if (title) {
    title.textContent = activeAssignment?.title || activeChallenge.title;
  }
  if (meta) {
    meta.textContent = activeAssignment
      ? `${activeAssignment.className || "Classroom"} • Due ${formatDisplayDate(activeAssignment.dueDate)}`
      : `${activeChallenge.description} • Score ${learningResult.score.total}/100`;
  }
  if (stepsEl) {
    stepsEl.innerHTML = steps.length
      ? steps.map(step => `
          <div class="guided-lab-step ${step.passed ? "passed" : "pending"}">
            <span>${step.passed ? "✓" : "•"}</span>
            <b>${escapeHtml(step.label)}</b>
          </div>
        `).join("")
      : "<p class=\"upgrade-muted\">Run logic to get guided steps.</p>";
  }
  if (nextFixBtn) {
    nextFixBtn.textContent = learningResult.challenge?.passed ? "Challenge Complete" : "Next Fix";
    nextFixBtn.disabled = Boolean(learningResult.challenge?.passed);
    nextFixBtn.onclick = () => {
      app.showToast?.(nextFix);
      document.getElementById("aiTeacherBtn")?.click();
      const aiInput = document.getElementById("aiTeacherInput");
      if (aiInput) {
        aiInput.value = `Guide me through this next fix: ${nextFix}`;
      }
    };
  }
  if (startVivaBtn) {
    startVivaBtn.onclick = () => {
      document.getElementById("aiTeacherBtn")?.click();
      startVivaSession(app);
    };
  }
}

function ensureMultimeterCard() {
  let card = document.getElementById("liveMultimeterCard");
  if (card) return card;

  const studentPanel = document.getElementById("studentPanel");
  if (!studentPanel) return null;

  card = createCard("Live Multimeter", "Inspect the whole loop or one component at a time.");
  card.id = "liveMultimeterCard";
  card.innerHTML += `
    <div class="field">
      <label for="multimeterTargetSelect">Measure</label>
      <select id="multimeterTargetSelect"></select>
    </div>
    <div id="multimeterReadings" class="multimeter-readings"></div>
  `;
  studentPanel.appendChild(card);
  return card;
}

function renderMultimeterCard(app) {
  const card = ensureMultimeterCard();
  if (!card || !app?.state) return;

  ensureAdvancedState(app);
  const select = card.querySelector("#multimeterTargetSelect");
  const readingsEl = card.querySelector("#multimeterReadings");
  const snapshot = buildEnhancedProjectSnapshot(app);
  const report = app.state.simulationReport || analyzeCircuit(snapshot);
  const items = snapshot.items || [];
  const selection = app.state.multimeter.selection || { type: "overview" };

  if (select && select.dataset.bound !== "true") {
    select.dataset.bound = "true";
    select.addEventListener("change", () => {
      app.state.multimeter.selection = select.value === "overview"
        ? { type: "overview" }
        : { type: "item", id: select.value };
      renderMultimeterCard(app);
    });
  }

  const options = [
    `<option value="overview">Whole circuit</option>`,
    ...items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.type)}</option>`)
  ];
  select.innerHTML = options.join("");

  const selectedValue = selection.type === "item" && items.some(item => item.id === selection.id)
    ? selection.id
    : "overview";
  select.value = selectedValue;
  app.state.multimeter.selection = selectedValue === "overview"
    ? { type: "overview" }
    : { type: "item", id: selectedValue };

  const reading = buildMultimeterReading(snapshot, report, app.state.multimeter.selection);
  readingsEl.innerHTML = `
    <div class="multimeter-header">
      <b>${escapeHtml(reading.title)}</b>
      <span class="status-chip-${reading.status === "error" ? "danger" : reading.status === "warning" ? "warning" : "safe"}">
        ${escapeHtml(reading.status)}
      </span>
    </div>
    <div class="multimeter-grid">
      <div><span>Voltage</span><b>${escapeHtml(reading.voltage)}</b></div>
      <div><span>Current</span><b>${escapeHtml(reading.current)}</b></div>
      <div><span>Continuity</span><b>${escapeHtml(reading.continuity)}</b></div>
      <div class="wide"><span>Note</span><p>${escapeHtml(reading.note)}</p></div>
    </div>
  `;
}

function ensureAiVivaCard() {
  let card = document.getElementById("aiVivaCard");
  if (card) return card;

  const sidebar = document.querySelector(".ai-sidebar");
  if (!sidebar) return null;

  card = document.createElement("div");
  card.id = "aiVivaCard";
  card.className = "ai-card";
  sidebar.appendChild(card);
  return card;
}

function startVivaSession(app) {
  ensureAdvancedState(app);
  const snapshot = buildEnhancedProjectSnapshot(app);
  const report = app.state.simulationReport || analyzeCircuit(snapshot);
  const questions = buildVivaQuestions(snapshot, {
    report,
    learningResult: app.state.learning?.lastResult || getLearningResult(app)
  });

  app.state.aiViva = {
    active: true,
    questions,
    answers: [],
    currentIndex: 0,
    summary: null
  };
  renderAiVivaCard(app);
  speakTextWithVoice(questions[0]?.prompt || "", app);
  app.showToast?.("AI viva started");
}

function submitVivaAnswer(app) {
  ensureAdvancedState(app);
  const input = document.getElementById("aiVivaAnswerInput");
  const answer = input?.value.trim();
  const viva = app.state.aiViva;

  if (!answer) {
    app.showToast?.("Answer the viva question first.");
    return;
  }

  const question = viva.questions[viva.currentIndex];
  if (!question) return;

  const evaluation = evaluateVivaAnswer(question, answer, buildEnhancedProjectSnapshot(app));
  viva.answers[viva.currentIndex] = {
    ...evaluation,
    questionId: question.id,
    prompt: question.prompt,
    answer
  };
  if (viva.currentIndex === viva.questions.length - 1) {
    viva.summary = summarizeVivaSession({ answers: viva.answers.filter(Boolean) });
  }

  renderAiVivaCard(app);
  speakTextWithVoice(evaluation.feedback, app);
  app.showToast?.(evaluation.passed ? "Good viva answer" : "Viva feedback ready");
}

function moveToNextVivaQuestion(app) {
  ensureAdvancedState(app);
  const viva = app.state.aiViva;
  if (!viva.active) {
    startVivaSession(app);
    return;
  }

  if (!viva.answers[viva.currentIndex]) {
    app.showToast?.("Check this answer before moving on.");
    return;
  }

  if (viva.currentIndex >= viva.questions.length - 1) {
    viva.summary = summarizeVivaSession({ answers: viva.answers.filter(Boolean) });
    renderAiVivaCard(app);
    return;
  }

  viva.currentIndex += 1;
  renderAiVivaCard(app);
  speakTextWithVoice(viva.questions[viva.currentIndex]?.prompt || "", app);
}

function renderAiVivaCard(app) {
  const card = ensureAiVivaCard();
  if (!card || !app?.state) return;

  ensureAdvancedState(app);
  const viva = app.state.aiViva;
  const currentQuestion = viva.questions[viva.currentIndex];
  const currentAnswer = viva.answers[viva.currentIndex];
  const score = viva.answers.reduce((sum, answer) => sum + Number(answer?.score || 0), 0);

  if (!viva.active) {
    card.innerHTML = `
      <h3>AI Viva</h3>
      <p>Practice a circuit viva with targeted questions about your build, logic, and safety decisions.</p>
      <button type="button" id="startAiVivaBtn">Start Viva</button>
    `;
    card.querySelector("#startAiVivaBtn")?.addEventListener("click", () => startVivaSession(app), { once: true });
    return;
  }

  card.innerHTML = `
    <h3>AI Viva</h3>
    <div class="viva-score-row">
      <span>Question ${Math.min(viva.currentIndex + 1, viva.questions.length)} / ${viva.questions.length}</span>
      <b>${score} pts</b>
    </div>
    <p class="viva-question">${escapeHtml(currentQuestion?.prompt || "Viva complete")}</p>
    <textarea id="aiVivaAnswerInput" placeholder="Type your answer here...">${escapeHtml(currentAnswer?.answer || "")}</textarea>
    <div class="viva-actions">
      <button type="button" id="checkAiVivaBtn">Check Answer</button>
      <button type="button" class="secondary" id="nextAiVivaBtn">${viva.currentIndex >= viva.questions.length - 1 ? "Finish" : "Next Question"}</button>
    </div>
    <div class="viva-feedback-card">
      <b>${escapeHtml(currentAnswer?.passed ? "Strong answer" : currentAnswer ? "Needs more detail" : "Waiting for answer")}</b>
      <p>${escapeHtml(currentAnswer?.feedback || currentQuestion?.hint || "Answer the question, then I will coach it.")}</p>
      ${currentAnswer?.answerGuide ? `<small>${escapeHtml(currentAnswer.answerGuide)}</small>` : ""}
    </div>
    ${viva.summary ? `
      <div class="viva-summary">
        <b>${escapeHtml(`${viva.summary.percent}% viva score`)}</b>
        <p>${escapeHtml(viva.summary.summary)}</p>
        <small>${escapeHtml(viva.summary.recommendation)}</small>
      </div>
    ` : ""}
  `;

  card.querySelector("#checkAiVivaBtn")?.addEventListener("click", () => submitVivaAnswer(app), { once: true });
  card.querySelector("#nextAiVivaBtn")?.addEventListener("click", () => moveToNextVivaQuestion(app), { once: true });
}

function installVoiceConversationMode(app) {
  ensureAdvancedState(app);
  const inputBar = document.querySelector(".ai-inputbar");
  const aiMessages = document.getElementById("aiTeacherMessages");
  if (!inputBar || !aiMessages) return;

  let button = document.getElementById("voiceConversationBtn");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.id = "voiceConversationBtn";
    button.className = "secondary voice-conversation-btn";
    button.textContent = "Speak";
    inputBar.insertBefore(button, document.getElementById("aiTeacherSendBtn"));
  }

  let status = document.getElementById("voiceConversationStatus");
  if (!status) {
    status = document.createElement("div");
    status.id = "voiceConversationStatus";
    status.className = "voice-conversation-status";
    status.textContent = "Voice conversation is ready.";
    inputBar.insertAdjacentElement("afterend", status);
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  function updateVoiceConversationUi() {
    const isListening = Boolean(app.state.voiceConversation?.listening);
    button.textContent = isListening ? "Stop" : "Speak";
    button.setAttribute("aria-pressed", String(isListening));
  }

  function ensureRecognition() {
    if (!SpeechRecognition) return null;
    if (recognition) return recognition;

    recognition = new SpeechRecognition();
    recognition.lang = getSelectedVoice()?.lang || DEFAULT_VOICE_LANG;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      app.state.voiceConversation.listening = true;
      app.state.voiceConversation.transcript = "";
      status.textContent = "Listening...";
      updateVoiceConversationUi();
    };

    recognition.onresult = event => {
      const transcript = [...event.results]
        .map(result => result[0]?.transcript || "")
        .join(" ")
        .trim();
      app.state.voiceConversation.transcript = transcript;
      status.textContent = transcript ? `Heard: ${transcript}` : "Listening...";
      const finalResult = event.results[event.results.length - 1];
      if (finalResult?.isFinal) {
        const input = document.getElementById("aiTeacherInput");
        if (input) {
          input.value = transcript;
        }
        document.getElementById("aiTeacherSendBtn")?.click();
        status.textContent = "Voice message sent to the AI Teacher.";
      }
    };

    recognition.onerror = event => {
      app.state.voiceConversation.listening = false;
      status.textContent = "Voice input could not start.";
      updateVoiceConversationUi();
      app.showToast?.(event.error === "not-allowed" ? "Allow microphone access to use voice conversation." : "Voice conversation hit an error.");
    };

    recognition.onend = () => {
      app.state.voiceConversation.listening = false;
      updateVoiceConversationUi();
      if (!app.state.voiceConversation.transcript) {
        status.textContent = "Voice conversation is ready.";
      }
    };

    return recognition;
  }

  if (button.dataset.bound !== "true") {
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (!SpeechRecognition) {
        status.textContent = "This browser does not support voice input.";
        app.showToast?.("Voice input is not supported in this browser");
        return;
      }
      const activeRecognition = ensureRecognition();
      if (app.state.voiceConversation.listening) {
        activeRecognition.stop();
      } else {
        activeRecognition.lang = getSelectedVoice()?.lang || DEFAULT_VOICE_LANG;
        activeRecognition.start();
      }
    });
  }

  if (aiMessages.dataset.voiceObserverInstalled !== "true") {
    aiMessages.dataset.voiceObserverInstalled = "true";
    const observer = new MutationObserver(() => {
      const lastTeacherMessage = aiMessages.querySelector(".ai-message.teacher:last-child");
      const text = lastTeacherMessage?.textContent?.trim();
      if (!text || text === aiMessages.dataset.lastSpokenMessage) return;
      aiMessages.dataset.lastSpokenMessage = text;
      speakTextWithVoice(text, app, { rate: 0.96 });
    });
    observer.observe(aiMessages, {
      childList: true
    });
  }

  updateVoiceConversationUi();
}

function installAssignmentSystem(app, services) {
  ensureAdvancedState(app);
  const studentPanel = document.getElementById("studentPanel");
  const teacherPanel = document.getElementById("teacherPanel");

  if (studentPanel && !document.getElementById("studentAssignmentsCard")) {
    const card = createCard("Assignments", "Teacher-created labs appear here and stay linked to your project.");
    card.id = "studentAssignmentsCard";
    card.innerHTML += `<div id="studentAssignmentList" class="assignment-list"></div>`;
    studentPanel.insertBefore(card, studentPanel.firstChild?.nextSibling || null);
  }

  if (teacherPanel && !document.getElementById("teacherAssignmentsCard")) {
    const card = createCard("Teacher Assignments", "Publish structured lab tasks for each class with challenge and due date.");
    card.id = "teacherAssignmentsCard";
    card.innerHTML += `
      <div class="assignment-form-grid">
        <div class="field">
          <label for="assignmentTitleInput">Title</label>
          <input id="assignmentTitleInput" type="text" placeholder="Week 3 LED Lab">
        </div>
        <div class="field">
          <label for="assignmentClassInput">Class</label>
          <input id="assignmentClassInput" type="text" placeholder="10-A or All Classes">
        </div>
        <div class="field">
          <label for="assignmentChallengeSelect">Challenge</label>
          <select id="assignmentChallengeSelect">
            ${LEARNING_CHALLENGES.map(challenge => `
              <option value="${escapeHtml(challenge.id)}">${escapeHtml(challenge.title)}</option>
            `).join("")}
          </select>
        </div>
        <div class="field">
          <label for="assignmentDueInput">Due Date</label>
          <input id="assignmentDueInput" type="date">
        </div>
      </div>
      <div class="field">
        <label for="assignmentInstructionsInput">Instructions</label>
        <textarea id="assignmentInstructionsInput" placeholder="What should students prove or explain?"></textarea>
      </div>
      <div class="assignment-form-actions">
        <button type="button" id="createAssignmentBtn">Create Assignment</button>
      </div>
      <div id="teacherAssignmentList" class="assignment-list"></div>
    `;
    teacherPanel.appendChild(card);
  }

  async function refreshAssignments() {
    if (!services.assignments) return;

    const user = app.state.user;
    const studentList = document.getElementById("studentAssignmentList");
    const teacherList = document.getElementById("teacherAssignmentList");
    if (!user?.schoolKey || app.state.demoMode) {
      app.state.assignments = [];
      if (studentList) studentList.innerHTML = "<p class=\"upgrade-muted\">Log in to see live Firebase assignments.</p>";
      if (teacherList) teacherList.innerHTML = "<p class=\"upgrade-muted\">Log in as a teacher or admin to publish assignments.</p>";
      renderGuidedLabMode(app);
      return;
    }

    const assignments = await services.assignments.listAssignments({
      schoolId: user.schoolKey,
      user
    });

    app.state.assignments = assignments;
    if (app.state.activeAssignment?.id) {
      const updatedActiveAssignment = assignments.find(assignment => assignment.id === app.state.activeAssignment.id);
      if (updatedActiveAssignment) {
        app.state.activeAssignment = updatedActiveAssignment;
      }
    }

    if (studentList) {
      studentList.innerHTML = assignments.length
        ? assignments.map(assignment => {
            const challenge = getChallengeMeta(assignment.challengeId);
            const active = app.state.activeAssignment?.id === assignment.id;
            return `
              <article class="assignment-item ${active ? "active" : ""}">
                <div>
                  <b>${escapeHtml(assignment.title)}</b>
                  <span>${escapeHtml(assignment.className || "Class")} • ${escapeHtml(challenge.shortTitle)} • ${escapeHtml(formatDisplayDate(assignment.dueDate))}</span>
                  <p>${escapeHtml(assignment.instructions || challenge.description)}</p>
                </div>
                <button type="button" data-assignment-start="${escapeHtml(assignment.id)}">${active ? "Active" : "Start"}</button>
              </article>
            `;
          }).join("")
        : "<p class=\"upgrade-muted\">No assignments yet. You can still use Guided Lab mode with the built-in challenges.</p>";

      studentList.querySelectorAll("[data-assignment-start]").forEach(button => {
        button.addEventListener("click", () => {
          const assignment = assignments.find(entry => entry.id === button.dataset.assignmentStart);
          if (!assignment) return;
          app.state.activeAssignment = assignment;
          ensureLearningState(app);
          app.state.learning.selectedChallengeId = assignment.challengeId || app.state.learning.selectedChallengeId;
          if (!app.state.items.length || app.state.projectName === "Untitled STEM Project") {
            app.state.projectName = assignment.title;
            document.getElementById("projectNameText").textContent = assignment.title;
          }
          renderLearningPanel(app);
          renderGuidedLabMode(app);
          renderAiVivaCard(app);
          app.showToast?.(`${assignment.title} is now active`);
          refreshAssignments();
        });
      });
    }

    if (teacherList) {
      teacherList.innerHTML = assignments.length
        ? assignments.map(assignment => `
            <article class="assignment-item teacher">
              <div>
                <b>${escapeHtml(assignment.title)}</b>
                <span>${escapeHtml(assignment.className || "All Classes")} • ${escapeHtml(getChallengeMeta(assignment.challengeId).title)}</span>
                <p>${escapeHtml(assignment.instructions || "No extra instructions")}</p>
              </div>
              <small>Due ${escapeHtml(formatDisplayDate(assignment.dueDate))}</small>
            </article>
          `).join("")
        : "<p class=\"upgrade-muted\">Create the first assignment for this classroom.</p>";
    }
  }

  const createAssignmentBtn = document.getElementById("createAssignmentBtn");
  if (createAssignmentBtn && createAssignmentBtn.dataset.bound !== "true") {
    createAssignmentBtn.dataset.bound = "true";
    createAssignmentBtn.addEventListener("click", async () => {
      const user = app.state.user;
      if (app.state.demoMode || !user?.schoolKey || !user?.uid) {
        app.showToast?.("Log in as a teacher or admin to create Firebase assignments");
        return;
      }
      if (user.role !== "teacher" && user.role !== "admin") {
        app.showToast?.("Switch to a teacher or admin account to create assignments");
        return;
      }

      const title = document.getElementById("assignmentTitleInput")?.value.trim();
      const className = document.getElementById("assignmentClassInput")?.value.trim() || "All Classes";
      const challengeId = document.getElementById("assignmentChallengeSelect")?.value || "led-circuit";
      const instructions = document.getElementById("assignmentInstructionsInput")?.value.trim() || "";
      const dueDate = document.getElementById("assignmentDueInput")?.value || "";

      if (!title) {
        app.showToast?.("Enter an assignment title first");
        return;
      }

      await services.assignments.createAssignment({
        schoolId: user.schoolKey,
        teacher: user,
        assignment: {
          title,
          className,
          challengeId,
          challengeTitle: getChallengeMeta(challengeId).title,
          instructions,
          dueDate
        }
      });

      document.getElementById("assignmentTitleInput").value = "";
      document.getElementById("assignmentInstructionsInput").value = "";
      app.showToast?.("Assignment published");
      await refreshAssignments();
    });
  }

  return { refreshAssignments };
}

function renderDashboardEnhancements(app) {
  const report = app.state.simulationReport;
  if (!report) {
    renderLearningPanel(app);
    renderGuidedLabMode(app);
    renderMultimeterCard(app);
    renderReplayBuildCard(app);
    renderAiVivaCard(app);
    return;
  }

  const coach = buildCoachFeedback(report);
  const statusClass = coach.health === "danger"
    ? "status-chip-danger"
    : coach.health === "warning"
      ? "status-chip-warning"
      : "status-chip-safe";

  const coachStatusText = document.getElementById("coachStatusText");
  if (coachStatusText) {
    coachStatusText.textContent = coach.headline;
    coachStatusText.className = statusClass;
  }

  const coachHintText = document.getElementById("coachHintText");
  const coachFixText = document.getElementById("coachFixText");
  if (coachHintText) coachHintText.textContent = coach.conversation;
  if (coachFixText) coachFixText.textContent = coach.primaryTip;

  const coachEfficiencyValue = document.getElementById("coachEfficiencyValue");
  const coachEfficiencyBar = document.getElementById("coachEfficiencyBar");
  const coachSuggestionList = document.getElementById("coachSuggestionList");
  if (coachEfficiencyValue) coachEfficiencyValue.textContent = `${coach.efficiencyScore}/100`;
  if (coachEfficiencyBar) coachEfficiencyBar.style.width = `${coach.efficiencyScore}%`;
  if (coachSuggestionList) {
    coachSuggestionList.innerHTML = coach.optimizationTips
      .slice(0, 3)
      .map(tip => `<div class="coach-suggestion">${escapeHtml(tip)}</div>`)
      .join("");
  }

  const batteryVoltage = Number(app.state.defaultBatteryVoltage || 0);
  const voltageHealthBar = document.getElementById("voltageHealthBar");
  const voltageHealthLabel = document.getElementById("voltageHealthLabel");
  if (voltageHealthBar) voltageHealthBar.style.width = `${Math.min(100, (batteryVoltage / 30) * 100)}%`;
  if (voltageHealthLabel) {
    voltageHealthLabel.textContent = batteryVoltage > 12
      ? "High voltage"
      : batteryVoltage >= 3
        ? "Learning range"
        : "Low voltage";
    voltageHealthLabel.className = batteryVoltage > 12
      ? "status-chip-danger"
      : batteryVoltage >= 3
        ? "status-chip-safe"
        : "status-chip-warning";
  }

  const componentHealthList = document.getElementById("componentHealthList");
  if (componentHealthList) {
    componentHealthList.innerHTML = app.state.items.length
      ? app.state.items.map(item => {
        const componentState = report.componentStates?.[item.id];
        const diagnostic = report.diagnostics?.find(entry => entry.itemId === item.id);
        const health = diagnostic?.severity === "error"
          ? "danger"
          : diagnostic?.severity === "warning"
            ? "warning"
            : componentState?.active || item.type === "Battery"
              ? "safe"
              : "warning";
        const spec = report.catalog?.find(entry => entry.type === item.type);
        const label = health === "danger" ? "Fix" : health === "warning" ? "Check" : "Safe";
        return `
          <div class="component-health-chip ${health}">
            <span>${spec?.icon || "•"} ${escapeHtml(item.type)}</span>
            <b class="status-chip-${health === "danger" ? "danger" : health === "warning" ? "warning" : "safe"}">${label}</b>
          </div>
        `;
      }).join("")
      : "<p class=\"upgrade-muted\">Add components to see live health checks.</p>";
  }

  renderLearningPanel(app);
  renderGuidedLabMode(app);
  renderMultimeterCard(app);
  renderReplayBuildCard(app);
  renderAiVivaCard(app);
}

function renderAiTeacherPrecision(app) {
  const precisionText = document.getElementById("aiCoachPrecisionText");
  const suggestionChips = document.getElementById("aiCoachSuggestionChips");
  if (!precisionText && !suggestionChips) return;

  const report = buildHumanReadableDebugReport(buildEnhancedProjectSnapshot(app));
  const firstFix = report.coach.suggestion || report.coach.primaryTip || "Run logic, then ask me for the first exact fix.";

  if (precisionText) {
    precisionText.textContent = `Status: ${report.coach.status}. ${report.coach.simpleExplanation} Suggestion: ${report.coach.suggestion}. Efficiency: ${report.coach.efficiencyPercent}%.`;
  }

  if (suggestionChips) {
    suggestionChips.innerHTML = `
      <button class="ai-chip" data-ai-prompt="What is the first exact fix I should make?">First fix</button>
      <button class="ai-chip" data-ai-prompt="What is my efficiency score and why?">Efficiency</button>
      <button class="ai-chip" data-ai-prompt="${escapeHtml(firstFix)}">Use coach tip</button>
    `;
  }
}

function installAiTeacherEnhancements(app) {
  renderAiTeacherPrecision(app);
  renderAiVivaCard(app);
  installVoiceConversationMode(app);
  const input = document.getElementById("aiTeacherInput");
  if (input) {
    input.placeholder = "Ask about your circuit and get a quick status, fix, and tip...";
  }
}

function installPerformanceEnhancements(app) {
  if (document.body.dataset.performanceEnhancementsInstalled === "true") return;
  document.body.dataset.performanceEnhancementsInstalled = "true";

  if (typeof window.drawWires === "function") {
    const legacyDrawWires = window.drawWires;
    let rafId = null;
    window.drawWires = function upgradedDrawWires(...args) {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        legacyDrawWires.apply(this, args);
      });
    };
  }

  document.body.classList.add("upgrade-ready");
}

function installSimulationUpgrade(app) {
  const upgradeApi = window.EducircuitUpgrade || {};
  const previousAfterRenderItems = upgradeApi.afterRenderItems;
  const previousAfterUpdateOutputs = upgradeApi.afterUpdateOutputs;

  upgradeApi.evaluateCircuitState = function upgradedEvaluateCircuitState() {
    const report = analyzeCircuit({
      items: app.state.items,
      wires: app.state.wires,
      defaultBatteryVoltage: app.state.defaultBatteryVoltage
    });

    const coachFeedback = buildCoachFeedback(report);
    const learningResult = evaluateLearningState(app.getProjectSnapshot?.() || app.state, {
      report,
      challengeId: ensureLearningState(app).selectedChallengeId
    });
    app.state.simulationReport = report;
    app.state.learning.lastResult = learningResult;
    app.state.outputIntensity = report.outputs;
    app.state.activeItems = report.activeItemIds;
    app.state.burstItems = report.burstItemIds;
    app.state.coach = {
      status: coachFeedback.headline,
      hint: coachFeedback.conversation,
      fix: coachFeedback.primaryTip,
      efficiencyScore: coachFeedback.efficiencyScore,
      health: coachFeedback.health,
      suggestions: coachFeedback.optimizationTips,
      debuggerStatus: coachFeedback.status,
      simpleExplanation: coachFeedback.simpleExplanation,
      suggestion: coachFeedback.suggestion,
      efficiencyPercent: coachFeedback.efficiencyPercent
    };

    return {
      led: report.outputs.led.active,
      motor: report.outputs.motor.active,
      buzzer: report.outputs.buzzer.active,
      activeItemIds: report.activeItemIds,
      overload: report.hasShortCircuit || report.hasUnsafeVoltage,
      burstItems: report.burstItemIds,
      message: report.primaryFinding?.message || "",
      coach: app.state.coach
    };
  };

  upgradeApi.buildAiTeacherReply = function upgradedAiTeacherReply(question) {
    const snapshot = app.getProjectSnapshot();
    const circuitSummary = typeof window.getCircuitSummary === "function" ? window.getCircuitSummary() : "";
    return buildTeacherStyleReply(question, snapshot, circuitSummary);
  };

  upgradeApi.afterRenderItems = () => {
    previousAfterRenderItems?.();
    renderIntensityDecorations(app);
    renderDashboardEnhancements(app);
    renderAiTeacherPrecision(app);
    syncWorkspaceExperience(app);
    recordBuildHistory(app);
  };

  upgradeApi.afterUpdateOutputs = () => {
    previousAfterUpdateOutputs?.();
    renderIntensityDecorations(app);
    renderDashboardEnhancements(app);
    renderAiTeacherPrecision(app);
    syncWorkspaceExperience(app);
    recordBuildHistory(app);
  };

  window.EducircuitUpgrade = upgradeApi;
}

async function loadLeaderboard(services, schoolId) {
  if (!schoolId) return { students: [], schools: [], weekKey: services.gamification.getWeekKey() };
  const schoolSnapshot = await services.db.collection("users").where("schoolId", "==", schoolId).get();
  const schoolUsers = schoolSnapshot.docs.map(doc => doc.data());
  return {
    students: services.gamification.rankWeeklyLeaderboard(
      schoolUsers.filter(user => user.role === "student")
    ),
    schools: services.gamification.rankSchools(schoolUsers),
    weekKey: services.gamification.getWeekKey()
  };
}

function installGamificationPanels(app, services) {
  const studentPanel = document.getElementById("studentPanel");
  const teacherPanel = document.getElementById("teacherPanel");

  const progressCard = createCard("Progress Hub", "Earn XP for saving, submitting, debugging clean circuits, and sharing public work.");
  progressCard.id = "progressHubCard";
  progressCard.innerHTML += `
    <div class="upgrade-stat-row">
      <span>XP</span>
      <b id="xpValue">0</b>
    </div>
    <div class="upgrade-progress">
      <div class="upgrade-progress-bar" id="xpProgressBar"></div>
    </div>
    <div class="small-note" id="badgeListText">No badges yet</div>
  `;
  studentPanel.appendChild(progressCard);

  const leaderboardCard = createCard("School Leaderboard", "Weekly XP resets automatically so every class gets a fresh chance to climb.");
  leaderboardCard.id = "leaderboardCard";
  leaderboardCard.innerHTML += `
    <div class="small-note" id="leaderboardWeekText"></div>
    <div class="upgrade-leaderboard-grid">
      <section>
        <h4>Top Students</h4>
        <div id="topStudentsLeaderboard" class="leaderboard"></div>
      </section>
      <section>
        <h4>This School</h4>
        <div id="topSchoolsLeaderboard" class="leaderboard"></div>
      </section>
    </div>
  `;
  teacherPanel.appendChild(leaderboardCard);

  async function refreshGamificationUi() {
    const currentUser = app.state.user;
    if (!currentUser?.uid || !currentUser.schoolKey) return;
    const profile = await services.auth.fetchUserProfile(currentUser.uid);
    const stats = profile?.stats || services.gamification.createEmptyStats();
    app.state.userProgress = {
      stats,
      badges: profile?.badges || []
    };
    const xpValue = document.getElementById("xpValue");
    const xpProgressBar = document.getElementById("xpProgressBar");
    const badgeListText = document.getElementById("badgeListText");
    if (xpValue) xpValue.textContent = `${stats.xp} XP • Level ${stats.level}`;
    if (xpProgressBar) xpProgressBar.style.width = `${Math.min(100, (stats.xp % 120) / 1.2)}%`;
    if (badgeListText) badgeListText.textContent = profile?.badges?.length
      ? `Badges: ${profile.badges.join(", ")}`
      : "No badges yet";

    const leaderboardWeekText = document.getElementById("leaderboardWeekText");
    const topStudentsLeaderboard = document.getElementById("topStudentsLeaderboard");
    const topSchoolsLeaderboard = document.getElementById("topSchoolsLeaderboard");
    if (topStudentsLeaderboard || topSchoolsLeaderboard) {
      let entries = {
        students: [],
        schools: [],
        weekKey: services.gamification.getWeekKey()
      };
      try {
        entries = await loadLeaderboard(services, currentUser.schoolKey);
      } catch (error) {
        console.error(error);
      }
      if (leaderboardWeekText) {
        leaderboardWeekText.textContent = `Current weekly season: ${entries.weekKey}`;
      }
      if (topStudentsLeaderboard) {
        topStudentsLeaderboard.innerHTML = entries.students.length
          ? entries.students
            .slice(0, 5)
            .map(entry => `
              <div class="leader-item">
                <span>#${entry.rank} ${entry.name}</span>
                <b>${entry.stats?.weeklyXp || 0} XP</b>
              </div>
            `)
            .join("")
          : "<p class=\"upgrade-muted\">Student leaderboard appears after weekly XP is earned.</p>";
      }
      if (topSchoolsLeaderboard) {
        topSchoolsLeaderboard.innerHTML = entries.schools.length
          ? entries.schools
            .slice(0, 5)
            .map(entry => `
              <div class="leader-item">
                <span>#${entry.rank} ${entry.school}</span>
                <b>${entry.weeklyXp || 0} XP</b>
              </div>
            `)
            .join("")
          : "<p class=\"upgrade-muted\">School rankings appear after XP is earned.</p>";
      }
    }
  }

  return { refreshGamificationUi };
}

function installTeacherDashboard(app, services) {
  const teacherPanel = document.getElementById("teacherPanel");
  const applyGradeBtn = document.getElementById("applyGradeBtn");
  if (applyGradeBtn && !document.getElementById("autoGradeBtn")) {
    const autoGradeBtn = document.createElement("button");
    autoGradeBtn.id = "autoGradeBtn";
    autoGradeBtn.type = "button";
    autoGradeBtn.className = "secondary";
    autoGradeBtn.textContent = "Auto Grade";
    applyGradeBtn.parentElement.appendChild(autoGradeBtn);
    autoGradeBtn.addEventListener("click", () => {
      const snapshot = app.getProjectSnapshot();
      const analysis = analyzeCircuit(snapshot);
      const grade = autoGradeProject(snapshot, analysis);
      document.getElementById("teacherGrade").value = grade.grade;
      document.getElementById("teacherComment").value = grade.feedback;
      app.state.pendingAutoGrade = grade;
      app.showToast(`Auto grade ready: ${grade.totalScore}%`);
    });
  }

  const submissionsCard = createCard("Student Submissions", "Teachers and admins can open, simulate, grade, and review all school projects from one place.");
  submissionsCard.id = "teacherSubmissionsCard";
  submissionsCard.innerHTML += `<div id="teacherSubmissionList" class="upgrade-submission-list"></div>`;
  teacherPanel.appendChild(submissionsCard);

  const classPerformanceCard = createCard("Class Performance", "Quick overview of submissions, grading progress, and top performers.");
  classPerformanceCard.id = "classPerformanceCard";
  classPerformanceCard.innerHTML += `<div id="classPerformanceSummary" class="upgrade-summary-grid"></div>`;
  teacherPanel.appendChild(classPerformanceCard);

  async function refreshTeacherDashboard() {
    const user = app.state.user;
    if (!user?.schoolKey) return;
    const listEl = document.getElementById("teacherSubmissionList");
    const summaryEl = document.getElementById("classPerformanceSummary");

    let projects = [];
    try {
      projects = await services.projects.listTeacherSubmissions({ schoolId: user.schoolKey });
    } catch (error) {
      console.error(error);
      app.showToast("Could not load Firestore submissions, showing local data only.");
      const schoolData = app.state.schools[user.school] || { students: [] };
      projects = schoolData.students.flatMap(student =>
        (student.projects || []).map((project, index) => ({
          ...project,
          id: `${student.name}-${index}`,
          ownerName: student.name,
          ownerId: student.name,
          className: student.class || "",
          schoolId: user.schoolKey
        }))
      );
    }

    const performance = summarizeClassPerformance(projects);
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="upgrade-summary-item"><span>Submissions</span><b>${performance.submissionsCount}</b></div>
        <div class="upgrade-summary-item"><span>Graded</span><b>${performance.gradedCount}</b></div>
        <div class="upgrade-summary-item"><span>Average Grade</span><b>${performance.averageGrade ?? "—"}</b></div>
        <div class="upgrade-summary-item"><span>Top Performer</span><b>${performance.topPerformers[0]?.ownerName || "—"}</b></div>
      `;
    }

    if (listEl) {
      listEl.innerHTML = projects.length
        ? projects
            .map(project => `
              <article class="upgrade-submission-card" data-project-id="${project.id}">
                <div>
                  <h4>${project.name}</h4>
                  <p>${project.ownerName || "Unknown"} • ${project.className || "Class TBD"}</p>
                  ${project.assignmentTitle ? `<p>Assignment: ${project.assignmentTitle}</p>` : ""}
                  <p>Status: ${project.status || "DRAFT"}${project.grade ? ` • Grade: ${project.grade}` : ""}</p>
                  ${project.metrics?.qualityScore ? `<span class="auto-grade-pill">Quality ${project.metrics.qualityScore}%</span>` : ""}
                </div>
                <div class="upgrade-inline-actions">
                  <button class="secondary" data-action="open" data-project-id="${project.id}">Open</button>
                  <button data-action="auto-grade" data-project-id="${project.id}">Auto Grade</button>
                </div>
              </article>
            `)
            .join("")
        : "<p class=\"upgrade-muted\">No submissions yet.</p>";
    }

    listEl?.querySelectorAll("[data-action='open']").forEach(button => {
      button.addEventListener("click", () => {
        const project = projects.find(entry => entry.id === button.dataset.projectId);
        if (!project) return;
        app.applyProjectSnapshot({
          id: project.id,
          name: project.name,
          items: project.items,
          wires: project.wires,
          logic: project.logic,
          assignmentId: project.assignmentId || null,
          assignmentTitle: project.assignmentTitle || "",
          assignmentDueDate: project.assignmentDueDate || "",
          challengeId: project.challengeId || "",
          grade: project.grade || "Not graded",
          status: project.status || "DRAFT",
          feedback: project.feedback || "",
          ownerName: project.ownerName,
          defaultBatteryVoltage: project.defaultBatteryVoltage || app.state.defaultBatteryVoltage
        });
        syncClassroomContextFromProject(app, project);
        app.state.remoteProjectId = project.id;
        app.state.currentProjectMeta = project;
        setProjectVisibility(project.visibility || "private");
        app.showToast(`${project.name} loaded for review`);
      });
    });

    listEl?.querySelectorAll("[data-action='auto-grade']").forEach(button => {
      button.addEventListener("click", () => {
        const project = projects.find(entry => entry.id === button.dataset.projectId);
        if (!project) return;
        const analysis = analyzeCircuit(project);
        const grade = autoGradeProject(project, analysis);
        app.applyProjectSnapshot(project, { ownerName: project.ownerName, projectId: project.id });
        syncClassroomContextFromProject(app, project);
        app.state.currentProjectMeta = project;
        setProjectVisibility(project.visibility || "private");
        document.getElementById("teacherGrade").value = grade.grade;
        document.getElementById("teacherComment").value = grade.feedback;
        app.state.pendingAutoGrade = grade;
        app.showToast(`Auto grade generated: ${grade.totalScore}%`);
      });
    });
  }

  return { refreshTeacherDashboard };
}

function installProjectSharing(app, services) {
  const topActions = document.querySelector(".top-actions");
  const exploreBtn = document.createElement("button");
  exploreBtn.className = "secondary";
  exploreBtn.id = "exploreProjectsBtn";
  exploreBtn.textContent = "Explore";
  topActions.insertBefore(exploreBtn, document.getElementById("saveBtn"));

  const explorePage = ensureExplorePage();
  const exploreList = explorePage.querySelector("#exploreProjectsList");

  async function renderExploreProjects() {
    exploreList.innerHTML = "<p class=\"upgrade-muted\">Loading public projects...</p>";
    try {
      const projects = await services.projects.listPublicProjects({
        schoolId: app.state.user.schoolKey || null
      });
      exploreList.innerHTML = projects.length
        ? projects
            .map(project => `
              <article class="upgrade-project-card ${(project.likedBy || []).includes(app.state.user.uid) ? "liked" : ""}" data-project-id="${project.id}">
                <div>
                  <h3>${project.name}</h3>
                  <p>${project.ownerName || "Unknown"} • ${project.schoolId || "School"}</p>
                  ${project.assignmentTitle ? `<p>${project.assignmentTitle}</p>` : ""}
                  <p>${project.simulation?.summary || "Shared public project"}</p>
                  <span class="upgrade-like-count">♥ ${project.likeCount || 0}</span>
                </div>
                <div class="upgrade-inline-actions">
                  <button class="secondary" data-action="preview" data-project-id="${project.id}">Preview</button>
                  <button data-action="clone" data-project-id="${project.id}">Clone</button>
                  <button class="secondary" data-action="like" data-project-id="${project.id}">Like</button>
                </div>
              </article>
            `)
            .join("")
        : "<p class=\"upgrade-muted\">No public projects available yet.</p>";

      exploreList.querySelectorAll("[data-action='preview']").forEach(button => {
        button.addEventListener("click", () => {
          const project = projects.find(entry => entry.id === button.dataset.projectId);
          if (!project) return;
          app.applyProjectSnapshot(project, { ownerName: project.ownerName, projectId: project.id });
          syncClassroomContextFromProject(app, project);
          app.state.currentProjectMeta = project;
          setProjectVisibility(project.visibility || "public");
          explorePage.classList.add("hidden");
          app.showToast(`${project.name} preview loaded`);
        });
      });

      exploreList.querySelectorAll("[data-action='clone']").forEach(button => {
        button.addEventListener("click", async () => {
          const project = projects.find(entry => entry.id === button.dataset.projectId);
          if (!project) return;
          const cloned = services.projects.buildClonePayload(project, app.state.user);
          app.applyProjectSnapshot(cloned, { ownerName: app.state.user.name, projectId: null });
          syncClassroomContextFromProject(app, cloned);
          app.state.currentProjectMeta = {
            visibility: "private",
            clonedFrom: project.id
          };
          setProjectVisibility("private");
          explorePage.classList.add("hidden");
          app.showToast("Project cloned into your workspace");
        });
      });

      exploreList.querySelectorAll("[data-action='like']").forEach(button => {
        button.addEventListener("click", async () => {
          const project = projects.find(entry => entry.id === button.dataset.projectId);
          if (!project) return;
          const userId = app.state.user.uid || `guest-${Date.now()}`;
          try {
            const result = await services.projects.likeProject({
              schoolId: project.schoolId,
              projectId: project.id,
              userId
            });
            project.likeCount = result.likeCount;
            project.likedBy = result.liked
              ? [...(project.likedBy || []), userId]
              : (project.likedBy || []).filter(id => id !== userId);
            await renderExploreProjects();
          } catch (error) {
            console.error(error);
            app.showToast("Could not update like right now");
          }
        });
      });
    } catch (error) {
      console.error(error);
      exploreList.innerHTML = "<p class=\"upgrade-muted\">Unable to load public projects right now.</p>";
    }
  }

  exploreBtn.addEventListener("click", async () => {
    explorePage.classList.remove("hidden");
    await renderExploreProjects();
  });

  return { renderExploreProjects, getVisibility: () => getProjectVisibilitySelect().value };
}

function installAuthUpgrade(app, services) {
  const loginCard = document.querySelector(".premium-login-card");
  const loginRole = document.getElementById("loginRole");
  const loginName = document.getElementById("loginName");
  const loginEmail = document.getElementById("loginEmail");
  const loginClass = document.getElementById("loginClass");
  const loginSchool = document.getElementById("loginSchool");
  const loginSchoolUser = document.getElementById("loginSchoolUser");
  const loginSchoolPass = document.getElementById("loginSchoolPass");
  const enterBtn = replaceButton(document.getElementById("enterBtn"), handlePrimaryAccess);
  const googleAuthBtn = replaceButton(document.getElementById("googleAuthBtn"), handleGoogleLogin);
  const demoStudentBtn = replaceButton(document.getElementById("demoStudentBtn"), () => fillDemoCredentials("student"));
  const demoTeacherBtn = replaceButton(document.getElementById("demoTeacherBtn"), () => fillDemoCredentials("teacher"));
  replaceButton(document.getElementById("logoutBtn"), handleLogout);

  ensureRoleOption(loginRole, "admin", "School Admin");
  const authFlow = window.EducircuitAuthFlow || {};
  const googleAvailable = Boolean(window.firebase?.auth?.GoogleAuthProvider && app.auth?.signInWithPopup);
  if (googleAuthBtn) {
    googleAuthBtn.hidden = !googleAvailable;
  }

  function getAuthMode() {
    return authFlow.getMode?.() || loginCard?.dataset.authMode || "create";
  }

  function getPayload() {
    return {
      name: loginName.value.trim(),
      email: loginEmail.value.trim(),
      password: loginSchoolPass.value.trim(),
      role: loginRole.value,
      className: loginClass.value.trim(),
      school: loginSchool.value.trim(),
      schoolCode: loginSchoolUser.value.trim(),
      accessModel: getAuthMode()
    };
  }

  function clearAuthErrors() {
    [loginName, loginEmail, loginRole, loginClass, loginSchool, loginSchoolUser, loginSchoolPass]
      .forEach(field => field?.classList.remove("error"));
  }

  function focusFirstError() {
    document.querySelector(".login-step.active .error")?.focus?.();
  }

  function validatePayload(payload) {
    clearAuthErrors();
    const errors = [];

    if (!payload.schoolCode) {
      loginSchoolUser.classList.add("error");
      errors.push("Enter the school code.");
    }
    if (!payload.email) {
      loginEmail.classList.add("error");
      errors.push("Enter an email address.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      loginEmail.classList.add("error");
      errors.push("Enter a valid email address.");
    }
    if (!payload.password) {
      loginSchoolPass.classList.add("error");
      errors.push("Enter your password.");
    }
    if (payload.accessModel === "create" && payload.password.length > 0 && payload.password.length < 6) {
      loginSchoolPass.classList.add("error");
      errors.push("Use a password with at least 6 characters.");
    }

    if (payload.accessModel === "create") {
      if (!payload.name) {
        loginName.classList.add("error");
        errors.push("Enter the full name for this account.");
      }
      if (!payload.role) {
        loginRole.classList.add("error");
        errors.push("Choose a role.");
      }
      if (!payload.school) {
        loginSchool.classList.add("error");
        errors.push("Enter the school name.");
      }
      if (payload.role === "student" && !payload.className) {
        loginClass.classList.add("error");
        errors.push("Enter your class or section.");
      }
    }

    if (errors.length) {
      focusFirstError();
      throw new Error(errors[0]);
    }
  }

  function syncRoleFields() {
    const isFaculty = loginRole.value === "teacher" || loginRole.value === "admin";
    loginClass.placeholder = isFaculty ? "Department / Staff (optional)" : "10-A";
    loginClass.previousElementSibling.textContent = isFaculty ? "Department / Section" : "Class / Section";
  }

  async function handlePrimaryAccess() {
    const payload = getPayload();
    if (payload.accessModel === "create") {
      await handleSignUp();
    } else {
      await handleLogin();
    }
  }

  async function handleSignUp() {
    const payload = getPayload();
    try {
      validatePayload(payload);
      const profile = payload.role === "admin"
        ? await services.auth.registerSchoolAdmin(payload)
        : await services.auth.registerMember(payload);
      app.applyAuthenticatedProfile(profile.uid, profileForLegacy(profile));
      app.state.demoMode = false;
      app.showToast(`${payload.role === "admin" ? "School admin" : "Member"} account created`);
      await wait(120);
      await services.refreshAll();
    } catch (error) {
      app.showToast?.(formatAuthError(error, { mode: "create", role: payload.role }));
    }
  }

  async function handleLogin() {
    const payload = getPayload();
    try {
      validatePayload(payload);
      const profile = await services.auth.login(payload);
      app.applyAuthenticatedProfile(profile.uid, profileForLegacy(profile));
      app.state.demoMode = false;
      app.showToast(`Welcome back, ${profile.name}`);
      await wait(120);
      await services.refreshAll();
    } catch (error) {
      app.showToast?.(formatAuthError(error, { mode: "login", role: payload.role }));
    }
  }

  async function handleGoogleLogin() {
    if (!googleAvailable) {
      app.showToast?.("Google sign-in is not available for this project yet.");
      return;
    }
    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      const credential = await app.auth.signInWithPopup(provider);
      const profile = await services.auth.fetchUserProfile(credential.user.uid);
      if (!profile) {
        await services.auth.logout();
        throw new Error("No Educircuit profile is linked to this Google account yet. Create an account with email and password first.");
      }
      app.applyAuthenticatedProfile(profile.uid, profileForLegacy(profile));
      app.state.demoMode = false;
      app.showToast(`Welcome back, ${profile.name}`);
      await wait(120);
      await services.refreshAll();
    } catch (error) {
      const message = error?.code === "auth/operation-not-allowed"
        ? "Google sign-in is not enabled in Firebase yet."
        : error.message || "Google sign-in could not finish.";
      app.showToast?.(message);
    }
  }

  function fillDemoCredentials(role) {
    if (typeof app.fillDemo === "function") {
      app.fillDemo(role);
      return;
    }

    const profile = {
      uid: `demo-${role === "teacher" ? "teacher" : "student"}`,
      name: role === "teacher" ? "Demo Teacher" : "Demo Student",
      email: `${role}@demo.educircuitlabs.app`,
      role: role === "teacher" ? "teacher" : "student",
      className: role === "teacher" ? "Robotics Lab" : "10-A",
      school: "STEM Academy",
      schoolKey: "stem-academy",
      schoolId: "stem-academy"
    };

    app.state.demoMode = true;
    app.applyAuthenticatedProfile(profile.uid, profileForLegacy(profile));
    app.showToast(`${profile.name} loaded in demo mode`);
  }

  async function handleLogout() {
    if (app.state.demoMode) {
      app.state.demoMode = false;
      app.resetAuthenticatedUser();
      return;
    }
    try {
      await services.auth.logout();
    } catch (error) {
      app.showToast?.(error.message || "Could not log out right now");
    }
  }

  installLoginStepper({
    onSubmit: handlePrimaryAccess,
    toast: message => app.showToast(message)
  });

  loginRole.addEventListener("change", syncRoleFields);

  syncRoleFields();
  authFlow.setMode?.(getAuthMode());

  return { enterBtn, googleAuthBtn, demoStudentBtn, demoTeacherBtn };
}

function installSavedProjectsPortal(app, services) {
  const page = document.getElementById("projectsPage");
  const container = document.getElementById("projectsPageList");
  const legacyRender = app.renderProjectsPage?.bind(app) || (() => {});

  async function fetchRemoteSavedProjects() {
    const user = app.state.user;
    if (!user?.schoolKey || !user.uid || app.state.demoMode) return [];
    const projects = await services.projects.listStudentProjects({
      schoolId: user.schoolKey,
      ownerId: user.uid
    });

    return projects
      .filter(project => !isReviewedProject(project))
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  }

  function renderRemoteSavedProjects(projects) {
    if (!container) return;
    container.innerHTML = projects.length
      ? `
        <div class="remote-graded-header">
          <div>
            <b>My Saved Projects</b>
            <span>Drafts and submitted work stay here until a teacher grades them.</span>
          </div>
          <span>${projects.length} saved</span>
        </div>
        ${projects.map(project => `
          <article class="upgrade-submission-card" data-project-id="${escapeHtml(project.id)}">
            <div>
              <h4>${escapeHtml(project.name || "Untitled Project")}</h4>
              <p>${escapeHtml(project.status || "DRAFT")} • ${escapeHtml(project.visibility || "private")}</p>
              ${project.assignmentTitle ? `<p>${escapeHtml(project.assignmentTitle)}</p>` : ""}
              <p>${escapeHtml(project.simulation?.summary || "Saved circuit project")}</p>
            </div>
            <div class="upgrade-inline-actions">
              <button class="secondary" data-action="open-saved" data-project-id="${escapeHtml(project.id)}">Open</button>
            </div>
          </article>
        `).join("")}
      `
      : "<p class=\"upgrade-muted\">No saved projects yet. Save or submit a circuit to see it here.</p>";

    container.querySelectorAll("[data-action='open-saved']").forEach(button => {
      button.addEventListener("click", () => {
        const project = projects.find(entry => entry.id === button.dataset.projectId);
        if (!project) return;
        app.applyProjectSnapshot(project, { ownerName: project.ownerName, projectId: project.id });
        syncClassroomContextFromProject(app, project);
        app.state.currentProjectMeta = project;
        setProjectVisibility(project.visibility || "private");
        page?.classList.add("hidden");
        app.showToast(`${project.name || "Project"} opened from My Projects`);
      });
    });
  }

  async function refresh({ force = false } = {}) {
    if (!container) return;
    const pageIsVisible = page && !page.classList.contains("hidden");
    if (!force && !pageIsVisible) return;
    legacyRender();
    if (app.state.demoMode || !app.state.user?.schoolKey || !app.state.user?.uid) return;
    container.innerHTML = "<p class=\"upgrade-muted\">Loading saved projects...</p>";
    try {
      renderRemoteSavedProjects(await fetchRemoteSavedProjects());
    } catch (error) {
      console.error(error);
      legacyRender();
      container.insertAdjacentHTML(
        "afterbegin",
        "<p class=\"upgrade-muted\">Could not sync Firestore saved projects right now. Showing local saved projects.</p>"
      );
    }
  }

  async function openPage() {
    page?.classList.remove("hidden");
    await refresh({ force: true });
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-ui-action='open-projects']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPage();
  }, true);

  window.openProjectsPage = openPage;
  app.openProjectsPage = openPage;

  return { refresh };
}

function installStudentProjectPortal(app, services) {
  const page = document.getElementById("studentProjectsPage");
  const container = document.getElementById("studentProjectsPageList");
  const legacyRender = app.renderStudentProjectsPage?.bind(app) || (() => {});

  async function fetchRemoteGradedProjects() {
    const user = app.state.user;
    if (!user?.schoolKey || app.state.demoMode) return [];
    const canReviewClass = user.role === "teacher" || user.role === "admin";
    const projects = canReviewClass
      ? await services.projects.listTeacherSubmissions({ schoolId: user.schoolKey })
      : await services.projects.listStudentProjects({ schoolId: user.schoolKey, ownerId: user.uid });

    return projects
      .filter(project => isReviewedProject(project))
      .sort((a, b) => String(b.gradedAt || b.updatedAt || "").localeCompare(String(a.gradedAt || a.updatedAt || "")));
  }

  function renderRemoteGradedProjects(projects) {
    if (!container) return;
    const user = app.state.user;
    container.innerHTML = projects.length
      ? `
        <div class="remote-graded-header">
          <div>
            <b>${user.role === "student" ? "Your Graded Work" : "Graded Student Work"}</b>
            <span>Synced from Firestore so feedback stays visible after teachers review projects.</span>
          </div>
          <span>${projects.length} reviewed</span>
        </div>
        ${projects.map(project => `
          <article class="upgrade-submission-card" data-project-id="${escapeHtml(project.id)}">
            <div>
              <h4>${escapeHtml(project.name || "Untitled Project")}</h4>
              <p>${escapeHtml(project.ownerName || "Unknown")} • ${escapeHtml(project.className || "Class TBD")}</p>
              ${project.assignmentTitle ? `<p>${escapeHtml(project.assignmentTitle)}</p>` : ""}
              <p>Status: ${escapeHtml(project.status || "GRADED")} • Grade: ${escapeHtml(project.grade)}</p>
              ${project.feedback ? `<p class="graded-feedback">${escapeHtml(project.feedback)}</p>` : ""}
            </div>
            <div class="upgrade-inline-actions">
              <button class="secondary" data-action="open-graded" data-project-id="${escapeHtml(project.id)}">Open</button>
            </div>
          </article>
        `).join("")}
      `
      : `<p class="upgrade-muted">${user.role === "student" ? "No graded work yet." : "No graded student projects yet."}</p>`;

    container.querySelectorAll("[data-action='open-graded']").forEach(button => {
      button.addEventListener("click", () => {
        const project = projects.find(entry => entry.id === button.dataset.projectId);
        if (!project) return;
        app.applyProjectSnapshot(project, { ownerName: project.ownerName, projectId: project.id });
        syncClassroomContextFromProject(app, project);
        app.state.currentProjectMeta = project;
        setProjectVisibility(project.visibility || "private");
        page?.classList.add("hidden");
        app.showToast(`${project.name} loaded with teacher feedback`);
      });
    });
  }

  async function refresh() {
    if (!container || app.state.demoMode || !app.state.user?.schoolKey) return;
    const pageIsVisible = page && !page.classList.contains("hidden");
    if (!pageIsVisible) return;
    container.innerHTML = "<p class=\"upgrade-muted\">Loading graded work...</p>";
    try {
      renderRemoteGradedProjects(await fetchRemoteGradedProjects());
    } catch (error) {
      console.error(error);
      legacyRender();
      container.insertAdjacentHTML(
        "afterbegin",
        "<p class=\"upgrade-muted\">Could not sync Firestore grades right now. Showing local graded work.</p>"
      );
    }
  }

  async function openPage() {
    page?.classList.remove("hidden");
    legacyRender();
    await refresh();
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-ui-action='open-student-projects']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPage();
  }, true);

  window.openStudentProjectsPage = openPage;
  app.openStudentProjectsPage = openPage;

  return { refresh };
}

function installActionOverrides(app, services, sharing, teacherDashboard, gamificationUi, savedProjectPortal, studentProjectPortal) {
  const runLogicBtn = replaceButton(document.getElementById("runLogicBtn"), async () => {
    await window.runLogic();
    const report = buildHumanReadableDebugReport(buildEnhancedProjectSnapshot(app));
    const debuggerResponse = buildDebuggerResponse(report);
    showSimulationFeedback(report);
    startCurrentFlowAnimation(app, report);
    showAiDebugMessage(debuggerResponse);
    speakCircuitCoach(report, app);
    const learningResult = getLearningResult(app);
    app.state.learning.lastResult = learningResult;
    renderLearningPanel(app);
    app.showToast(learningResult.challenge.passed
      ? `${learningResult.challenge.challenge.title} complete. Score ${learningResult.score.total}/100.`
      : learningResult.circuit.isCorrect
        ? `Circuit correct. Score ${learningResult.score.total}/100.`
        : `Hint: ${learningResult.hint.message}`);
  });
  if (runLogicBtn) runLogicBtn.dataset.upgradeOverride = "true";

  replaceButton(document.getElementById("saveBtn"), async () => {
    if (app.state.demoMode || !app.state.user.uid || !app.state.user.schoolKey) {
      app.showToast("Log in to save projects to Firebase");
      return;
    }

    app.saveProject({ silent: true });
    const snapshot = buildEnhancedProjectSnapshot(app);
    const report = app.state.simulationReport || analyzeCircuit(snapshot);
    const visibility = sharing.getVisibility();
    const savedProject = await services.projects.saveProject({
      schoolId: app.state.user.schoolKey,
      owner: app.state.user,
      projectSnapshot: snapshot,
      analysis: report,
      visibility,
      projectId: app.state.remoteProjectId,
      status: snapshot.status === "Graded" ? "GRADED" : "DRAFT"
    });

    app.state.remoteProjectId = savedProject.id;
    app.state.currentProjectMeta = savedProject;

    const updated = services.gamification.applyEvent(app.state.userProgress?.stats, "save");
    app.state.userProgress = updated;
    await services.auth.updateUserProgress({
      uid: app.state.user.uid,
      schoolId: app.state.user.schoolKey,
      role: app.state.user.role,
      stats: updated.stats,
      badges: updated.badges
    });

    if (visibility === "public") {
      const publicUpdated = services.gamification.applyEvent(updated.stats, "publicShare", { visibility });
      app.state.userProgress = publicUpdated;
      await services.auth.updateUserProgress({
        uid: app.state.user.uid,
        schoolId: app.state.user.schoolKey,
        role: app.state.user.role,
        stats: publicUpdated.stats,
        badges: publicUpdated.badges
      });
    }

    app.showToast("Project saved to Firestore");
    await services.refreshAll();
    await teacherDashboard.refreshTeacherDashboard();
    await gamificationUi.refreshGamificationUi();
    await savedProjectPortal.refresh();
  });

  replaceButton(document.getElementById("submitBtn"), async () => {
    if (app.state.demoMode || !app.state.user.uid || !app.state.user.schoolKey) {
      app.showToast("Log in to submit projects to Firebase");
      return;
    }

    window.submitProject();
    const snapshot = buildEnhancedProjectSnapshot(app);
    const report = app.state.simulationReport || analyzeCircuit(snapshot);
    const submitted = await services.projects.submitProject({
      schoolId: app.state.user.schoolKey,
      owner: app.state.user,
      projectSnapshot: snapshot,
      analysis: report,
      visibility: sharing.getVisibility(),
      projectId: app.state.remoteProjectId
    });

    app.state.remoteProjectId = submitted.id;
    const updated = services.gamification.applyEvent(app.state.userProgress?.stats, "submit");
    app.state.userProgress = updated;
    await services.auth.updateUserProgress({
      uid: app.state.user.uid,
      schoolId: app.state.user.schoolKey,
      role: app.state.user.role,
      stats: updated.stats,
      badges: updated.badges
    });

    await teacherDashboard.refreshTeacherDashboard();
    await gamificationUi.refreshGamificationUi();
    await savedProjectPortal.refresh();
  });

  replaceButton(document.getElementById("applyGradeBtn"), async () => {
    const gradeValue = document.getElementById("teacherGrade").value.trim();
    const feedbackValue = document.getElementById("teacherComment").value.trim();
    const visibility = sharing.getVisibility();
    if (!gradeValue) return;
    if (app.state.demoMode || !app.state.remoteProjectId || !app.state.user.schoolKey) {
      app.showToast("Open a Firebase project before grading");
      return;
    }

    window.applyGrade();
    await services.projects.gradeProject({
      schoolId: app.state.user.schoolKey,
      projectId: app.state.remoteProjectId,
      grade: gradeValue,
      feedback: feedbackValue,
      gradedBy: app.state.user,
      autoGrade: app.state.pendingAutoGrade || null,
      visibility
    });
    app.state.pendingAutoGrade = null;
    app.state.currentProjectMeta = {
      ...(app.state.currentProjectMeta || {}),
      status: "GRADED",
      grade: gradeValue,
      feedback: feedbackValue,
      visibility,
      cloneable: visibility === "public",
      assignmentId: app.state.activeAssignment?.id || app.state.currentProjectMeta?.assignmentId || null,
      assignmentTitle: app.state.activeAssignment?.title || app.state.currentProjectMeta?.assignmentTitle || "",
      assignmentDueDate: app.state.activeAssignment?.dueDate || app.state.currentProjectMeta?.assignmentDueDate || "",
      challengeId: app.state.activeAssignment?.challengeId || ensureLearningState(app)?.selectedChallengeId || app.state.currentProjectMeta?.challengeId || ""
    };

    const updated = services.gamification.applyEvent(app.state.userProgress?.stats, "grade");
    app.state.userProgress = updated;
    await services.auth.updateUserProgress({
      uid: app.state.user.uid,
      schoolId: app.state.user.schoolKey,
      role: app.state.user.role,
      stats: updated.stats,
      badges: updated.badges
    });

    await teacherDashboard.refreshTeacherDashboard();
    await gamificationUi.refreshGamificationUi();
    await savedProjectPortal.refresh();
    await studentProjectPortal.refresh();
    await sharing.renderExploreProjects();
    app.showToast(visibility === "public"
      ? "Grade applied and project added to Explore"
      : "Grade applied and student work updated");
  });

  installButtonHierarchy();
}

export function installVisualPolish(app = {}) {
  installLandingInteractions();
  installMicroInteractions();
  installBrandingAndTheme();
  installVoiceCoachToggle(app);
  installLoginStepper({
    toast: message => app.showToast?.(message) || console.warn(message)
  });

  if (app?.state) {
    ensureAdvancedState(app);
    installDashboardEnhancements(app);
    installAiTeacherEnhancements(app);
    installPerformanceEnhancements(app);
    installWorkspaceExperience(app);
  }
}

export async function bootstrapUpgrade(app, services) {
  ensureAdvancedState(app);
  installVisualPolish(app);
  installSimulationUpgrade(app);
  const sharing = installProjectSharing(app, services);
  const teacherDashboard = installTeacherDashboard(app, services);
  const gamificationUi = installGamificationPanels(app, services);
  const assignmentSystem = installAssignmentSystem(app, services);
  const savedProjectPortal = installSavedProjectsPortal(app, services);
  const studentProjectPortal = installStudentProjectPortal(app, services);
  installAuthUpgrade(app, services);
  installActionOverrides(app, services, sharing, teacherDashboard, gamificationUi, savedProjectPortal, studentProjectPortal);
  renderGuidedLabMode(app);
  renderMultimeterCard(app);
  renderReplayBuildCard(app);
  renderAiVivaCard(app);

  services.refreshAll = async function refreshAll() {
    try {
      if (app.state.user.schoolKey) {
        await teacherDashboard.refreshTeacherDashboard();
      }
      await assignmentSystem.refreshAssignments();
      await gamificationUi.refreshGamificationUi();
      await savedProjectPortal.refresh();
      await studentProjectPortal.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  document.getElementById("teacherModeBtn")?.addEventListener("click", () => {
    services.refreshAll();
  });

  window.EducircuitUpgrade = {
    ...(window.EducircuitUpgrade || {}),
    onModeChange: () => {
      services.refreshAll();
    }
  };

  const cleanSimulation = buildHumanReadableDebugReport(app.getProjectSnapshot());
  if (!cleanSimulation.analysis.diagnostics.length && app.state.user.uid) {
    const updated = services.gamification.applyEvent(app.state.userProgress?.stats, "cleanSimulation");
    app.state.userProgress = updated;
  }

  await wait(80);
  recordBuildHistory(app, { label: "Workspace ready" });
  await services.refreshAll();
  return services;
}
