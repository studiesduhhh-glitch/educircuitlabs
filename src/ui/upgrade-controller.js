import { analyzeCircuit } from "../core/circuit-engine.js";
import { buildCoachFeedback, buildHumanReadableDebugReport, buildTeacherStyleReply } from "../core/ai-debugger.js";
import { autoGradeProject, summarizeClassPerformance } from "../services/dashboard-service.js";

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

  document.querySelectorAll("#stopLogicBtn, #autoWireBtn, #toggleGridBtn, #clearBtn, #zoomOutBtn, #zoomInBtn, #langToggleBtn")
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
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.toggle("dark-mode", isDark);
    localStorage.setItem("educircuit-theme", theme);
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.textContent = isDark ? "Light Mode" : "Dark Mode";
      btn.setAttribute("aria-pressed", String(isDark));
    });
  }

  const savedTheme = localStorage.getItem("educircuit-theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(document.body.classList.contains("dark-mode") ? "light" : "dark");
    });
  });
}

function installLoginStepper({
  getPayload,
  validateStepOne,
  onSubmit,
  toast
} = {}) {
  const loginCard = document.querySelector(".premium-login-card");
  if (!loginCard) return null;

  const loginName = document.getElementById("loginName");
  const loginEmail = document.getElementById("loginEmail");
  const loginRole = document.getElementById("loginRole");
  const loginSchool = document.getElementById("loginSchool");
  const loginNextStepBtn = document.getElementById("loginNextStepBtn");
  const loginBackStepBtn = document.getElementById("loginBackStepBtn");
  const loginStepOne = document.getElementById("loginStepOne");
  const loginStepTwo = document.getElementById("loginStepTwo");

  const stepper = window.EducircuitLoginStepper || {};
  stepper.getPayload = getPayload || stepper.getPayload || (() => ({
    name: loginName?.value.trim(),
    email: loginEmail?.value.trim(),
    role: loginRole?.value
  }));
  stepper.validateStepOne = validateStepOne || stepper.validateStepOne || (payload => {
    if (!payload.name) throw new Error("Enter your name first.");
    if (!payload.email) throw new Error("Enter your email first.");
    if (!payload.role) throw new Error("Choose your role.");
  });
  stepper.onSubmit = onSubmit || stepper.onSubmit;
  stepper.toast = toast || stepper.toast || (message => window.alert(message));

  function goToLoginStep(step) {
    const nextStep = step === 2 ? 2 : 1;
    loginCard.setAttribute("data-step", String(nextStep));
    document.querySelectorAll(".login-step").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.loginStep === String(nextStep));
    });
    loginStepOne?.classList.toggle("active", nextStep === 1);
    loginStepTwo?.classList.toggle("active", nextStep === 2);
    if (nextStep === 2) {
      setTimeout(() => loginSchool?.focus(), 80);
    }
  }

  function handleNextStep() {
    try {
      stepper.validateStepOne(stepper.getPayload());
      goToLoginStep(2);
    } catch (error) {
      stepper.toast(error.message);
    }
  }

  stepper.goToLoginStep = goToLoginStep;
  stepper.handleNextStep = handleNextStep;

  if (!stepper.installed) {
    stepper.originalEnterPlatform = window.enterPlatform?.bind(window);
    loginNextStepBtn?.addEventListener("click", handleNextStep);
    loginBackStepBtn?.addEventListener("click", () => goToLoginStep(1));
    window.enterPlatform = () => {
      if (loginCard.dataset.step === "1") {
        handleNextStep();
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
}

function renderDashboardEnhancements(app) {
  const report = app.state.simulationReport;
  if (!report) return;

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
}

function renderAiTeacherPrecision(app) {
  const precisionText = document.getElementById("aiCoachPrecisionText");
  const suggestionChips = document.getElementById("aiCoachSuggestionChips");
  if (!precisionText && !suggestionChips) return;

  const report = buildHumanReadableDebugReport(app.getProjectSnapshot());
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
  const input = document.getElementById("aiTeacherInput");
  if (input) {
    input.placeholder = "Ask anything: debug my circuit, quiz me, explain voltage, help with homework, or make this simpler...";
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
    app.state.simulationReport = report;
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
  };

  upgradeApi.afterUpdateOutputs = () => {
    previousAfterUpdateOutputs?.();
    renderIntensityDecorations(app);
    renderDashboardEnhancements(app);
    renderAiTeacherPrecision(app);
    syncWorkspaceExperience(app);
  };

  window.EducircuitUpgrade = upgradeApi;
}

async function loadLeaderboard(services, schoolId) {
  if (!schoolId) return { students: [], schools: [], weekKey: services.gamification.getWeekKey() };
  const [schoolSnapshot, allSnapshot] = await Promise.all([
    services.db.collection("users").where("schoolId", "==", schoolId).get(),
    services.db.collection("users").get()
  ]);
  const schoolUsers = schoolSnapshot.docs.map(doc => doc.data());
  const allUsers = allSnapshot.docs.map(doc => doc.data());
  return {
    students: services.gamification.rankWeeklyLeaderboard(
      schoolUsers.filter(user => user.role === "student")
    ),
    schools: services.gamification.rankSchools(allUsers),
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
        <h4>Top Schools</h4>
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
          grade: project.grade || "Not graded",
          status: project.status || "DRAFT",
          feedback: project.feedback || "",
          ownerName: project.ownerName,
          defaultBatteryVoltage: project.defaultBatteryVoltage || app.state.defaultBatteryVoltage
        });
        app.state.remoteProjectId = project.id;
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
          app.state.currentProjectMeta = {
            visibility: "private",
            clonedFrom: project.id
          };
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
  const loginRole = document.getElementById("loginRole");
  const loginName = document.getElementById("loginName");
  const loginEmail = document.getElementById("loginEmail");
  const loginClass = document.getElementById("loginClass");
  const loginSchool = document.getElementById("loginSchool");
  const loginSchoolUser = document.getElementById("loginSchoolUser");
  const loginSchoolPass = document.getElementById("loginSchoolPass");
  const signUpBtn = replaceButton(document.getElementById("signUpBtn"), handleSignUp);
  const enterBtn = replaceButton(document.getElementById("enterBtn"), handleLogin);
  const demoStudentBtn = replaceButton(document.getElementById("demoStudentBtn"), () => fillDemoCredentials("student"));
  const demoTeacherBtn = replaceButton(document.getElementById("demoTeacherBtn"), () => fillDemoCredentials("teacher"));
  replaceButton(document.getElementById("logoutBtn"), handleLogout);

  ensureRoleOption(loginRole, "admin", "School Admin");

  function getPayload() {
    return {
      name: loginName.value.trim(),
      email: loginEmail.value.trim(),
      password: loginSchoolPass.value.trim(),
      role: loginRole.value,
      className: loginClass.value.trim(),
      school: loginSchool.value.trim(),
      schoolCode: loginSchoolUser.value.trim()
    };
  }

  function validateStepOne(payload) {
    if (!payload.name) throw new Error("Enter the full name for this account.");
    if (!payload.email) throw new Error("Enter an email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error("Enter a valid email address.");
    if (!payload.role) throw new Error("Choose a role.");
  }

  function validatePayload(payload) {
    validateStepOne(payload);
    if (!payload.password || payload.password.length < 6) throw new Error("Use a password with at least 6 characters.");
    if (!payload.school) throw new Error("Enter the school name.");
    if (!payload.schoolCode && payload.role !== "admin") throw new Error("Enter the school code from your admin.");
    if (payload.role === "student" && !payload.className) throw new Error("Enter your class or section.");
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
      alert(error.message);
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
      alert(error.message);
    }
  }

  function fillDemoCredentials(role) {
    if (typeof app.fillDemo === "function") {
      app.fillDemo(role);
    } else {
      loginName.value = role === "teacher" ? "Demo Teacher" : "Demo Student";
      loginEmail.value = `${role}@demo.educircuitlabs.app`;
      loginRole.value = role;
      loginClass.value = role === "teacher" ? "Robotics Lab" : "10-A";
      loginSchool.value = "STEM Academy";
      loginSchoolUser.value = "stem-academy";
      loginSchoolPass.value = "School@123";
      loginRole.dispatchEvent(new Event("change"));
    }
    installLoginStepper({
      getPayload,
      validateStepOne,
      onSubmit: handleLogin,
      toast: message => app.showToast(message)
    })?.goToLoginStep?.(1);
    app.showToast("Demo details filled. Review every field, then continue.");
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
      alert(error.message);
    }
  }

  installLoginStepper({
    getPayload,
    validateStepOne,
    onSubmit: handleLogin,
    toast: message => app.showToast(message)
  });

  loginRole.addEventListener("change", () => {
    if (loginRole.value === "admin") {
      signUpBtn.textContent = "Create School Admin";
      enterBtn.textContent = "Login as Admin";
    } else {
      signUpBtn.textContent = "Create Account";
      enterBtn.textContent = "Enter Platform";
    }
  });

  loginRole.dispatchEvent(new Event("change"));

  return { signUpBtn, enterBtn, demoStudentBtn, demoTeacherBtn };
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
      .filter(project => project.grade && project.grade !== "Not graded")
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

  window.openStudentProjectsPage = openPage;
  app.openStudentProjectsPage = openPage;

  return { refresh };
}

function installActionOverrides(app, services, sharing, teacherDashboard, gamificationUi, studentProjectPortal) {
  const runLogicBtn = replaceButton(document.getElementById("runLogicBtn"), async () => {
    await window.runLogic();
    const report = buildHumanReadableDebugReport(app.getProjectSnapshot());
    const debuggerResponse = buildDebuggerResponse(report);
    showSimulationFeedback(report);
    startCurrentFlowAnimation(app, report);
    showAiDebugMessage(debuggerResponse);
    app.showToast(debuggerResponse.status === "safe"
      ? `Logic run complete. Efficiency ${debuggerResponse.efficiency}%.`
      : "AI coach found a fix suggestion.");
  });
  if (runLogicBtn) runLogicBtn.dataset.upgradeOverride = "true";

  replaceButton(document.getElementById("saveBtn"), async () => {
    app.saveProject({ silent: true });

    if (app.state.demoMode || !app.state.user.uid || !app.state.user.schoolKey) {
      app.showToast("Project saved locally in demo mode");
      return;
    }

    const snapshot = app.getProjectSnapshot();
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
  });

  replaceButton(document.getElementById("submitBtn"), async () => {
    window.submitProject();
    if (app.state.demoMode || !app.state.user.uid || !app.state.user.schoolKey) return;

    const snapshot = app.getProjectSnapshot();
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
  });

  replaceButton(document.getElementById("applyGradeBtn"), async () => {
    window.applyGrade();
    const gradeValue = document.getElementById("teacherGrade").value.trim();
    const feedbackValue = document.getElementById("teacherComment").value.trim();
    if (!gradeValue) return;
    if (app.state.demoMode || !app.state.remoteProjectId || !app.state.user.schoolKey) return;
    await services.projects.gradeProject({
      schoolId: app.state.user.schoolKey,
      projectId: app.state.remoteProjectId,
      grade: gradeValue,
      feedback: feedbackValue,
      gradedBy: app.state.user,
      autoGrade: app.state.pendingAutoGrade || null
    });
    app.state.pendingAutoGrade = null;

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
    await studentProjectPortal.refresh();
  });

  installButtonHierarchy();
}

export function installVisualPolish(app = {}) {
  installLandingInteractions();
  installMicroInteractions();
  installBrandingAndTheme();
  installLoginStepper({
    toast: message => app.showToast?.(message) || window.alert(message)
  });

  if (app?.state) {
    installDashboardEnhancements(app);
    installAiTeacherEnhancements(app);
    installPerformanceEnhancements(app);
    installWorkspaceExperience(app);
  }
}

export async function bootstrapUpgrade(app, services) {
  installVisualPolish(app);
  installSimulationUpgrade(app);
  const sharing = installProjectSharing(app, services);
  const teacherDashboard = installTeacherDashboard(app, services);
  const gamificationUi = installGamificationPanels(app, services);
  const studentProjectPortal = installStudentProjectPortal(app, services);
  installAuthUpgrade(app, services);
  installActionOverrides(app, services, sharing, teacherDashboard, gamificationUi, studentProjectPortal);

  services.refreshAll = async function refreshAll() {
    try {
      if (app.state.user.schoolKey) {
        await teacherDashboard.refreshTeacherDashboard();
      }
      await gamificationUi.refreshGamificationUi();
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
  await services.refreshAll();
  return services;
}
