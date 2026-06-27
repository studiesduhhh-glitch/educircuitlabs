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
  const originalEnterPlatform = window.enterPlatform;
  function goToLoginStep(step){
    const nextStep = step === 2 ? 2 : 1;
    loginCard?.setAttribute("data-step", String(nextStep));
    document.querySelectorAll(".login-step").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.loginStep === String(nextStep));
    });
    document.getElementById("loginStepOne")?.classList.toggle("active", nextStep === 1);
    document.getElementById("loginStepTwo")?.classList.toggle("active", nextStep === 2);
  }

  function validateFallbackStepOne(){
    const loginName = document.getElementById("loginName");
    const loginEmail = document.getElementById("loginEmail");
    const loginRole = document.getElementById("loginRole");
    const fields = [loginName, loginEmail, loginRole].filter(Boolean);
    let valid = true;

    fields.forEach(field => field.classList.remove("error"));

    if(!loginName?.value.trim()){
      loginName?.classList.add("error");
      valid = false;
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail?.value.trim() || "")){
      loginEmail?.classList.add("error");
      valid = false;
    }

    if(!loginRole?.value){
      loginRole?.classList.add("error");
      valid = false;
    }

    if(!valid){
      window.educircuitApp?.showToast?.("Enter your name, valid email, and role first.") ||
        window.alert("Enter your name, valid email, and role first.");
    }

    return valid;
  }

  function handleLoginNextStep(event){
    const stepper = window.EducircuitLoginStepper;
    if(stepper?.handleNextStep){
      event?.preventDefault?.();
      event?.stopPropagation?.();
      stepper.handleNextStep();
      return;
    }
    if(!validateFallbackStepOne()) return;
    goToLoginStep(2);
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
    if(event.target.closest("#loginNextStepBtn")){
      handleLoginNextStep(event);
      return;
    }
    if(event.target.closest("#loginBackStepBtn")){
      handleLoginBackStep(event);
    }
  });
  window.enterPlatform = function(){
    if(loginCard?.dataset.step === "1"){
      handleLoginNextStep();
      return;
    }
    originalEnterPlatform?.();
  };

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
      const items = snapshot.items || [];
      const wires = snapshot.wires || [];
      const coach = app?.state?.coach || {};
      const counts = {};
      items.forEach(item => counts[item.type] = (counts[item.type] || 0) + 1);
      const componentNames = Object.keys(counts);
      const hasBattery = Boolean(counts.Battery);
      const hasOutput = componentNames.some(type => type !== "Battery" && type !== "Resistor" && type !== "Switch");
      const hasIssue = coach.status && !/safe|ready|working/i.test(coach.status);
      const loadName = componentNames.find(type => type !== "Battery" && type !== "Resistor") || "component";

      if(!items.length){
        return [
          "Status: Partial",
          "Why: No Battery or component is on the workspace yet.",
          "Fix: Add a Battery, then add an LED or Motor.",
          "Tip: A circuit starts with a power source and one load."
        ].join("\n");
      }

      if(!hasBattery){
        return [
          "Status: Partial",
          `Why: The ${loadName} cannot work without a Battery.`,
          "Fix: Add a Battery and connect it into the loop.",
          "Tip: The Battery pushes current through the circuit."
        ].join("\n");
      }

      if(!hasOutput){
        return [
          "Status: Partial",
          "Why: The Battery is placed, but no output component is connected.",
          "Fix: Add an LED, Motor, or Buzzer after the Battery.",
          "Tip: A load is the part that uses electrical energy."
        ].join("\n");
      }

      if(!wires.length){
        return [
          "Status: Partial",
          `Why: The ${loadName} is placed, but no wires connect the circuit.`,
          "Fix: Connect Battery + through the component, then back to Battery -.",
          "Tip: Wires make the path that current follows."
        ].join("\n");
      }

      if(hasIssue){
        return [
          "Status: Not Working",
          `Why: ${coach.status || "The circuit has a wiring issue."}`,
          `Fix: ${coach.fix || "Fix the first circuit coach suggestion, then run logic again."}`,
          "Tip: Current flows only through a complete safe loop."
        ].join("\n");
      }

      return [
        "Status: Working",
        `Why: Battery and ${loadName} are connected with ${wires.length} wire${wires.length === 1 ? "" : "s"}.`,
        `Fix: Add a Switch before the ${loadName} for better control.`,
        "Tip: A switch opens or closes the path for current."
      ].join("\n");
    };
  }
})();
