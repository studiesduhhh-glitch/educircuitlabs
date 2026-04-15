(function initEducircuitState(global) {
  function createInitialState() {
    return {
      schools: {},
      user: {
        uid: "",
        name: "",
        role: "student",
        className: "",
        school: "",
        schoolKey: "",
        schoolUsername: ""
      },
      projectName: "Untitled STEM Project",
      items: [],
      wires: [],
      logic: [],
      zoom: 1,
      selectedPort: null,
      wireDrag: null,
      drag: null,
      currentProjectIndex: null,
      projectOwnerName: "",
      logicArmed: false,
      nextId: 1,
      gridVisible: true,
      defaultBatteryVoltage: 5,
      outputs: {
        led: false,
        motor: false,
        buzzer: false,
        overload: false
      },
      coach: {
        status: "Ready",
        hint: "Build a loop from battery + through your components and return to battery -.",
        fix: "Correct connection: Battery + -> first component +, each component - -> next component +, then final component - -> Battery -."
      },
      activeItems: [],
      aiTeacherMessages: [],
      burstItems: [],
      lang: "en"
    };
  }

  const state = global.EducircuitState || createInitialState();

  global.EducircuitState = state;
  global.EducircuitStateStore = {
    state,
    createInitialState,
    replace(nextState = {}) {
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, nextState);
      return state;
    }
  };
})(window);
