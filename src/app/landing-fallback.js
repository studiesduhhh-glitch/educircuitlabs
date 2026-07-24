(function bootLandingFallback(){
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

  function setLabState(key){
    const state = labStates[key] || labStates.safe;
    const card = document.querySelector(".landing-product-card");
    card?.classList.remove("lab-warning", "lab-teacher");
    if(state.className) card?.classList.add(state.className);
    document.getElementById("landingLabScore").textContent = state.score;
    document.getElementById("landingLabStatus").textContent = state.status;
    document.getElementById("landingLabHint").textContent = state.hint;
    document.getElementById("landingLabCoach").textContent = state.coach;
    document.querySelectorAll("[data-landing-lab]").forEach(button => {
      button.classList.toggle("active", button.dataset.landingLab === key);
    });
    document.querySelectorAll(".landing-lab-node").forEach(node => {
      node.classList.toggle("warning", node.dataset.node === state.warningNode);
      node.classList.toggle("active", node.dataset.node !== state.warningNode);
    });
  }

  document.querySelectorAll("[data-landing-lab]").forEach(button => {
    button.addEventListener("click", () => setLabState(button.dataset.landingLab));
  });

  document.querySelectorAll("[data-scroll-target]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(button.dataset.scrollTarget)?.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });

  const loginCard = document.querySelector(".premium-login-card");
  const authFormTitle = document.getElementById("authFormTitle");
  const authModeNote = document.getElementById("authModeNote");
  const authCreateModeBtn = document.getElementById("authCreateModeBtn");
  const authLoginModeBtn = document.getElementById("authLoginModeBtn");
  const enterBtn = document.getElementById("enterBtn");
  const loginSchoolPass = document.getElementById("loginSchoolPass");
  const originalEnterPlatform = window.enterPlatform;
  const authFlow = window.EducircuitAuthFlow || {};
  let authMode = authFlow.getMode?.() || loginCard?.dataset.authMode || "create";

  function goToLoginStep(step){
    const nextStep = step === 2 ? 2 : 1;
    loginCard?.setAttribute("data-step", String(nextStep));
    document.querySelectorAll(".login-step").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.loginStep === String(nextStep));
    });
    document.getElementById("loginStepOne")?.classList.toggle("active", nextStep === 1);
    document.getElementById("loginStepTwo")?.classList.toggle("active", nextStep === 2);
  }

  function syncAuthMode(mode = authMode, { advance = false } = {}){
    authMode = mode === "login" ? "login" : "create";
    loginCard?.setAttribute("data-auth-mode", authMode);

    const isLogin = authMode === "login";
    const activeEnterBtn = document.getElementById("enterBtn");
    if(authFormTitle){
      authFormTitle.textContent = isLogin ? "Log In" : "Create Account";
    }
    if(authModeNote){
      authModeNote.textContent = isLogin
        ? "Enter your school code, email, and password to open your lab."
        : "Fill this once to create your Educircuit classroom account.";
    }
    if(activeEnterBtn){
      activeEnterBtn.textContent = isLogin ? "Log In" : "Create Account";
      activeEnterBtn.setAttribute("aria-label", isLogin ? "Log in to Educircuit" : "Create Educircuit account");
    }
    if(loginSchoolPass){
      loginSchoolPass.autocomplete = isLogin ? "current-password" : "new-password";
    }
    const stepTwo = document.getElementById("loginStepTwo");
    if(stepTwo){
      stepTwo.textContent = isLogin ? "2. Login" : "2. Create";
    }

    if(advance){
      goToLoginStep(2);
      setTimeout(() => {
        const firstField = isLogin ? document.getElementById("loginSchoolUser") : document.getElementById("loginName");
        firstField?.focus?.();
      }, 80);
    }
  }

  function openAuthMode(mode){
    syncAuthMode(mode, { advance:true });
  }

  function handleLoginBackStep(event){
    const stepper = window.EducircuitLoginStepper;
    if(stepper?.goToLoginStep){
      event?.preventDefault?.();
      event?.stopPropagation?.();
      stepper.goToLoginStep(1);
      return;
    }
    goToLoginStep(1);
  }

  document.addEventListener("click", (event) => {
    if(event.target.closest("#authCreateModeBtn")){
      event.preventDefault();
      openAuthMode("create");
      return;
    }
    if(event.target.closest("#authLoginModeBtn")){
      event.preventDefault();
      openAuthMode("login");
      return;
    }
    if(event.target.closest("#loginBackStepBtn")){
      handleLoginBackStep(event);
    }
  });
  window.enterPlatform = function(){
    if(loginCard?.dataset.step === "1"){
      openAuthMode(authMode);
      return;
    }
    originalEnterPlatform?.();
  };

  if(!authFlow.installed){
    authCreateModeBtn?.addEventListener("click", () => openAuthMode("create"));
    authLoginModeBtn?.addEventListener("click", () => openAuthMode("login"));
    authFlow.installed = true;
  }
  authFlow.getMode = () => authMode === "login" ? "login" : "create";
  authFlow.setMode = syncAuthMode;
  authFlow.openAuthMode = openAuthMode;
  authFlow.goToLoginStep = goToLoginStep;
  window.EducircuitAuthFlow = authFlow;
  syncAuthMode(authMode);

  function applyThemeFallback(theme){
    window.EducircuitRuntimePrefs = window.EducircuitRuntimePrefs || {};
    window.EducircuitRuntimePrefs.theme = theme;
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.textContent = isDark ? "Light Mode" : "Dark Mode";
      button.setAttribute("aria-pressed", String(isDark));
    });
  }

  const savedTheme = window.EducircuitRuntimePrefs?.theme;
  if(savedTheme && document.body.dataset.brandingThemeInstalled !== "true"){
    applyThemeFallback(savedTheme);
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    button.addEventListener("click", (event) => {
      if(document.body.dataset.brandingThemeInstalled === "true") return;
      event.preventDefault();
      applyThemeFallback(document.body.classList.contains("dark-mode") ? "light" : "dark");
    });
  });

  window.EducircuitUpgrade = window.EducircuitUpgrade || {};
  if(!window.EducircuitUpgrade.buildAiTeacherReply){
    window.EducircuitUpgrade.buildAiTeacherReply = function(question){
      const app = window.educircuitApp;
      const snapshot = app?.getProjectSnapshot?.() || {};
      const q = String(question || "").toLowerCase();
      const items = snapshot.items || [];
      const wires = snapshot.wires || [];
      const coach = app?.state?.coach || {};
      const counts = {};
      items.forEach(item => counts[item.type] = (counts[item.type] || 0) + 1);
      const parts = Object.entries(counts).map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`).join(", ") || "no components yet";
      const preciseLine = `Precise coach: ${coach.status || "Ready"}. ${coach.fix || "Add components, connect a complete loop, then run logic."}`;

      if(q.includes("quiz") || q.includes("test me")){
        return [
          "Absolutely. Quick friendly quiz:",
          "1. What does voltage do in a circuit?",
          "2. Why does an LED need correct polarity?",
          "3. How does a resistor protect a circuit?",
          "",
          "Reply with your answers and I will check them kindly."
        ].join("\n");
      }

      if(q.includes("debug") || q.includes("fix") || q.includes("wrong") || q.includes("not") || q.includes("coach")){
        return [
          "I checked the circuit like a teacher sitting next to you.",
          "",
          `Workspace: ${parts}. ${wires.length} wire${wires.length === 1 ? "" : "s"}. Battery: ${snapshot.defaultBatteryVoltage || 0}V.`,
          preciseLine,
          "",
          "Best next move: fix the first coach suggestion, then run logic again so I can re-check it."
        ].join("\n");
      }

      if(q.includes("voltage") || q.includes("current")){
        return "Voltage is the electrical push. Current is the flow. A component works when it has a complete loop, correct polarity, and enough voltage. " + preciseLine;
      }

      if(q.includes("resistor")){
        return "A resistor limits current. It is especially important with LEDs because it prevents too much current from damaging the LED. " + preciseLine;
      }

      if(q.includes("led")){
        return "An LED is a light-emitting diode. It needs correct polarity, enough voltage, and a resistor for safer real-world wiring. " + preciseLine;
      }

      if(q.includes("switch") || q.includes("logic")){
        return "A switch is a gate for current. In Educircuit, ON closes switches and relays, OFF opens them, and WAIT lets the output stay visible. Try ON -> WAIT 1s -> OFF.";
      }

      return [
        "I can help with that. I will answer kindly and connect it back to your circuit.",
        "",
        `Your current build: ${parts}.`,
        preciseLine,
        "",
        "Ask me to explain it simpler, quiz you, debug the circuit, or show the exact first fix."
      ].join("\n");
    };
  }
})();
