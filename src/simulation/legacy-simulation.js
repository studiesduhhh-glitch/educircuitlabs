(function initEducircuitSimulation(global) {
  function evaluateCircuitState({
    state,
    getCatalog,
    buildCoachState,
    getCorrectionGuide,
    buildConnectionGraph,
    collectReachable,
    getNodeKey,
    LOAD_COMPONENTS,
    POWER_FLOW_COMPONENTS,
    HARD_SHORT_COMPONENTS
  }) {
    const batteries = state.items.filter(item => item.type === "Battery");
    if (!batteries.length) {
      return {
        led: false,
        motor: false,
        buzzer: false,
        overload: false,
        burstItems: [],
        message: "Add a battery to power the circuit.",
        coach: buildCoachState(
          "Need Battery",
          "Your circuit has no power source yet.",
          "Add a battery and connect Battery + through your components back to Battery -."
        )
      };
    }

    const batteryVoltage = batteries.reduce((max, item) => {
      const voltage = Number(item.voltage ?? state.defaultBatteryVoltage);
      return Math.max(max, voltage);
    }, 0);

    const powerGraph = buildConnectionGraph(POWER_FLOW_COMPONENTS);
    const shortGraph = buildConnectionGraph(HARD_SHORT_COMPONENTS);
    const positiveStarts = batteries.map(item => getNodeKey(item.id, "positive"));
    const negativeStarts = batteries.map(item => getNodeKey(item.id, "negative"));
    const positiveReachable = collectReachable(positiveStarts, powerGraph);
    const negativeReachable = collectReachable(negativeStarts, powerGraph);
    const shortReachable = collectReachable(positiveStarts, shortGraph);
    const samePolarityWire = state.wires.find(wire => {
      const samePortPolarity =
        (wire.from.port === "positive" && wire.to.port === "positive") ||
        (wire.from.port === "negative" && wire.to.port === "negative");
      const fromItem = state.items.find(item => item.id === wire.from.itemId);
      const toItem = state.items.find(item => item.id === wire.to.itemId);

      return samePortPolarity && fromItem?.type !== "Battery" && toItem?.type !== "Battery";
    });

    const activeLoads = [];
    let totalRequiredVoltage = 0;
    const voltageCaps = [];

    state.items.forEach(item => {
      if (!(item.type in LOAD_COMPONENTS) || item.ports.length < 2) return;
      const cfg = getCatalog(item.type);
      const positiveTerminal = getNodeKey(item.id, "positive");
      const negativeTerminal = getNodeKey(item.id, "negative");
      const positivePowered = positiveReachable.has(positiveTerminal);
      const negativeReturned = negativeReachable.has(negativeTerminal);
      const meetsVoltage = batteryVoltage >= (cfg?.minVoltage ?? 0);
      const isPowered = positivePowered && negativeReturned && meetsVoltage;

      if (isPowered) {
        activeLoads.push(item);
        totalRequiredVoltage += cfg?.minVoltage ?? 0;
        voltageCaps.push({
          item,
          limit: (cfg?.minVoltage ?? 0) * 2
        });
      }
    });

    const hardShort = negativeStarts.some(node => shortReachable.has(node));
    const totalVoltageLimit = activeLoads.length > 1
      ? totalRequiredVoltage * 2
      : (voltageCaps[0]?.limit ?? Infinity);
    const componentOverload = activeLoads.length === 1
      ? voltageCaps.some(entry => batteryVoltage > entry.limit)
      : false;
    const combinedOverload = activeLoads.length > 1 && batteryVoltage > totalVoltageLimit;
    const overload = hardShort || componentOverload || combinedOverload;
    const burstItems = overload
      ? [...new Set(activeLoads.map(item => item.id))]
      : [];

    let message = "";
    let coach = buildCoachState(
      "Ready",
      "Your circuit layout looks valid. Run logic to test the outputs.",
      getCorrectionGuide()
    );

    if (hardShort) {
      message = "Short circuit detected 💥 Fix the wiring and try again.";
      coach = buildCoachState(
        "Short Circuit",
        samePolarityWire
          ? "You connected two same-polarity non-battery terminals together, which creates a short circuit risk."
          : "The circuit path is creating a direct short between battery + and battery -.",
        getCorrectionGuide()
      );
    } else if (componentOverload) {
      const overloaded = voltageCaps.find(entry => batteryVoltage > entry.limit);
      message = `${overloaded?.item.type || "Component"} overloaded 💥 Battery voltage is above twice its safe requirement.`;
      coach = buildCoachState(
        "Component Overload",
        `${overloaded?.item.type || "This component"} needs about ${overloaded ? overloaded.limit / 2 : 0}V, so more than ${overloaded?.limit || 0}V is too much for it alone.`,
        "Lower the battery voltage or add more compatible components."
      );
    } else if (combinedOverload) {
      message = "The circuit overloaded and burst 💥 The battery voltage is too high for the total active circuit.";
      coach = buildCoachState(
        "Total Voltage Too High",
        `Your active components need about ${totalRequiredVoltage.toFixed(1)}V total, so they are safe up to ${totalVoltageLimit.toFixed(1)}V together.`,
        `Reduce the battery below ${totalVoltageLimit.toFixed(1)}V, or add components that match the higher supply.`
      );
    } else if (samePolarityWire) {
      coach = buildCoachState(
        "Wrong Polarity Link",
        "You linked two same-polarity non-battery terminals together, which is not the normal path for a working series circuit.",
        getCorrectionGuide()
      );
    } else if (state.wires.length && activeLoads.length === 0) {
      const hasOpenControl = state.items.some(item => (item.type === "Switch" || item.type === "Relay") && !item.isClosed);
      coach = buildCoachState(
        hasOpenControl ? "Control Open" : "Incomplete Loop",
        hasOpenControl
          ? "Your switch or relay is still open, so current cannot pass through the circuit yet."
          : "The circuit does not have a full loop from battery + back to battery -.",
        hasOpenControl
          ? "Run ON logic to close the switch/relay, then test the circuit again."
          : getCorrectionGuide()
      );
    }

    return {
      led: activeLoads.some(item => item.type === "LED") && !overload,
      motor: activeLoads.some(item => ["Motor", "Pump", "Servo"].includes(item.type)) && !overload,
      buzzer: activeLoads.some(item => item.type === "Buzzer") && !overload,
      activeItemIds: activeLoads.map(item => item.id),
      overload,
      burstItems,
      message,
      coach
    };
  }

  global.EducircuitSimulation = {
    evaluateCircuitState
  };
})(window);
