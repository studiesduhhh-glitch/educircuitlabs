import {
  COMPONENT_CATALOG,
  getComponentSpec,
  getNegativePort,
  getPositivePort,
  isConductiveType,
  isLoadType,
  normalizePortName
} from "./catalog.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNodeId(itemId, port) {
  return `${itemId}:${normalizePortName(port)}`;
}

function parseVoltage(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

class UnionFind {
  constructor() {
    this.parent = new Map();
  }

  make(x) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
    }
  }

  find(x) {
    this.make(x);
    const parent = this.parent.get(x);
    if (parent !== x) {
      const root = this.find(parent);
      this.parent.set(x, root);
      return root;
    }
    return parent;
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

function buildNetModel(items = [], wires = []) {
  const uf = new UnionFind();

  items.forEach(item => {
    (item.ports || []).forEach(port => {
      uf.make(toNodeId(item.id, port));
    });
  });

  wires.forEach(wire => {
    uf.union(
      toNodeId(wire.from.itemId, wire.from.port),
      toNodeId(wire.to.itemId, wire.to.port)
    );
  });

  const portToNet = new Map();
  items.forEach(item => {
    (item.ports || []).forEach(port => {
      portToNet.set(toNodeId(item.id, port), uf.find(toNodeId(item.id, port)));
    });
  });

  return { uf, portToNet };
}

function connect(graph, a, b, payload = {}) {
  if (!graph.has(a)) graph.set(a, []);
  graph.get(a).push({ to: b, ...payload });
}

function addBidirectional(graph, a, b, payload = {}) {
  connect(graph, a, b, payload);
  connect(graph, b, a, payload);
}

function collectReachable(starts, graph) {
  const queue = [...starts];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const edges = graph.get(current) || [];
    edges.forEach(edge => {
      if (!visited.has(edge.to)) {
        queue.push(edge.to);
      }
    });
  }

  return visited;
}

function computeVoltages(sources, graph) {
  const voltages = new Map();
  const queue = [...sources];

  sources.forEach(source => {
    voltages.set(source.net, Math.max(voltages.get(source.net) || 0, source.voltage));
  });

  while (queue.length) {
    const current = queue.shift();
    const currentVoltage = voltages.get(current.net) ?? current.voltage ?? 0;
    const edges = graph.get(current.net) || [];

    edges.forEach(edge => {
      const nextVoltage = currentVoltage - (edge.dropVoltage || 0);
      if (nextVoltage < 0) return;
      const existing = voltages.get(edge.to) ?? -Infinity;
      if (nextVoltage > existing + 0.01) {
        voltages.set(edge.to, nextVoltage);
        queue.push({ net: edge.to, voltage: nextVoltage });
      }
    });
  }

  return voltages;
}

function createDiagnostic(type, severity, title, message, suggestion, meta = {}) {
  return { type, severity, title, message, suggestion, ...meta };
}

export function analyzeCircuit({
  items = [],
  wires = [],
  defaultBatteryVoltage = 5
} = {}) {
  const netModel = buildNetModel(items, wires);
  const { portToNet } = netModel;

  const allGraph = new Map();
  const conductorGraph = new Map();
  const shortCircuitGraph = new Map();
  const voltageGraph = new Map();
  const loadEdges = [];
  const batteries = [];

  const itemById = new Map(items.map(item => [item.id, item]));
  const samePolarityWire = wires.find(wire => {
    const samePortPolarity = normalizePortName(wire.from.port) === normalizePortName(wire.to.port);
    const fromItem = itemById.get(wire.from.itemId);
    const toItem = itemById.get(wire.to.itemId);
    // Battery + to load + and load - to battery - are normal educational wiring patterns.
    return samePortPolarity && fromItem?.type !== "Battery" && toItem?.type !== "Battery";
  });

  items.forEach(item => {
    const spec = getComponentSpec(item.type);
    if (!spec || (item.ports || []).length < 2) return;

    const positivePort = getPositivePort(item);
    const negativePort = getNegativePort(item);
    const positiveNet = portToNet.get(toNodeId(item.id, positivePort));
    const negativeNet = portToNet.get(toNodeId(item.id, negativePort));

    if (!positiveNet || !negativeNet) return;

    if (spec.category === "source") {
      batteries.push({
        id: item.id,
        positiveNet,
        negativeNet,
        voltage: parseVoltage(item.voltage, defaultBatteryVoltage)
      });
      return;
    }

    const isClosed = spec.category !== "switch" || Boolean(item.isClosed);
    if (!isClosed) return;

    addBidirectional(allGraph, positiveNet, negativeNet, {
      itemId: item.id,
      type: item.type,
      dropVoltage: spec.dropVoltage || 0
    });

    if (isConductiveType(item.type)) {
      addBidirectional(conductorGraph, positiveNet, negativeNet, {
        itemId: item.id,
        type: item.type,
        dropVoltage: spec.dropVoltage || 0
      });

      if (spec.category === "switch" || (spec.dropVoltage || 0) <= 0.05) {
        addBidirectional(shortCircuitGraph, positiveNet, negativeNet, {
          itemId: item.id,
          type: item.type,
          dropVoltage: spec.dropVoltage || 0
        });
      }

      addBidirectional(voltageGraph, positiveNet, negativeNet, {
        itemId: item.id,
        type: item.type,
        dropVoltage: spec.dropVoltage || 0
      });
    } else if (isLoadType(item.type)) {
      connect(voltageGraph, positiveNet, negativeNet, {
        itemId: item.id,
        type: item.type,
        dropVoltage: spec.dropVoltage || spec.minVoltage || 0
      });

      loadEdges.push({
        item,
        spec,
        positiveNet,
        negativeNet
      });
    }
  });

  const batterySources = batteries.map(battery => ({
    net: battery.positiveNet,
    voltage: battery.voltage
  }));

  const batteryPositiveNets = batteries.map(battery => battery.positiveNet);
  const batteryNegativeNets = batteries.map(battery => battery.negativeNet);
  const positiveReach = collectReachable(batteryPositiveNets, allGraph);
  const negativeReach = collectReachable(batteryNegativeNets, allGraph);
  const conductorPositiveReach = collectReachable(batteryPositiveNets, conductorGraph);
  const conductorNegativeReach = collectReachable(batteryNegativeNets, conductorGraph);
  const shortCircuitPositiveReach = collectReachable(batteryPositiveNets, shortCircuitGraph);
  const voltageByNet = computeVoltages(batterySources, voltageGraph);

  const connectivityClosedLoop = batteryNegativeNets.some(net => positiveReach.has(net));
  const directShort = batteryNegativeNets.some(net => shortCircuitPositiveReach.has(net));
  const resistorInPoweredPath = items.some(item => {
    if (item.type !== "Resistor") return false;
    const positiveNet = portToNet.get(toNodeId(item.id, getPositivePort(item)));
    const negativeNet = portToNet.get(toNodeId(item.id, getNegativePort(item)));
    const nets = [positiveNet, negativeNet].filter(Boolean);
    const touchesPositiveSide = nets.some(net => positiveReach.has(net) || conductorPositiveReach.has(net));
    const touchesNegativeSide = nets.some(net => negativeReach.has(net) || conductorNegativeReach.has(net));
    return touchesPositiveSide && touchesNegativeSide;
  });
  const diagnostics = [];
  const componentStates = {};
  const activeItemIds = [];
  const burstItemIds = [];
  let unsafeVoltage = false;

  if (!batteries.length) {
    diagnostics.push(
      createDiagnostic(
        "missing_power",
        "error",
        "No Power Source",
        "The circuit has no battery, so no component can receive voltage.",
        "Add a battery and wire its positive terminal through the circuit back to the negative terminal."
      )
    );
  }

  if (samePolarityWire) {
    diagnostics.push(
      createDiagnostic(
        "reverse_polarity",
        "warning",
        "Same-Polarity Link",
        "A wire connects two ports with the same polarity, which usually indicates reversed or invalid wiring.",
        "Reconnect the wire so current flows from a positive terminal through components and returns to a negative terminal.",
        { wireId: samePolarityWire.id }
      )
    );
  }

  if (directShort) {
    diagnostics.push(
      createDiagnostic(
        "short_circuit",
        "error",
        "Short Circuit",
        "Battery positive can reach battery negative through conductors alone, creating a dangerous short circuit.",
        "Break the direct conductor path and route current through a valid load such as an LED, buzzer, or motor."
      )
    );
  }

  if (!connectivityClosedLoop && items.length > 1) {
    diagnostics.push(
      createDiagnostic(
        "missing_closed_loop",
        "error",
        "Open Circuit",
        "The circuit does not form a complete loop from battery positive back to battery negative.",
        "Close the path so power leaves the battery, passes through the intended components, and returns to the battery negative terminal."
      )
    );
  }

  loadEdges.forEach(({ item, spec, positiveNet, negativeNet }) => {
    const availableVoltage = parseVoltage(voltageByNet.get(positiveNet), 0);
    const sourceOnPositiveLead = conductorPositiveReach.has(positiveNet) || batteryPositiveNets.includes(positiveNet);
    const sourceOnNegativeLead = conductorPositiveReach.has(negativeNet) || batteryPositiveNets.includes(negativeNet);
    const returnPath = negativeReach.has(negativeNet) || conductorNegativeReach.has(negativeNet);
    const reversePolarity =
      spec.polaritySensitive &&
      sourceOnNegativeLead &&
      !sourceOnPositiveLead;
    const receivedVoltage = returnPath && sourceOnPositiveLead ? availableVoltage : 0;
    const safeVoltage = (spec.minVoltage || 0) * (spec.safeMultiplier || 2);
    const normalizedIntensity = spec.minVoltage > 0
      ? clamp(receivedVoltage / spec.minVoltage, 0, 1.5)
      : 0;
    const active = !reversePolarity && returnPath && receivedVoltage >= spec.minVoltage && !directShort;

    componentStates[item.id] = {
      id: item.id,
      type: item.type,
      receivedVoltage: Number(receivedVoltage.toFixed(2)),
      minVoltage: spec.minVoltage,
      intensity: Number(normalizedIntensity.toFixed(2)),
      intensityPercent: Math.round(clamp(normalizedIntensity / 1.5, 0, 1) * 100),
      active,
      reversePolarity,
      returnPath
    };

    if (reversePolarity) {
      diagnostics.push(
        createDiagnostic(
          "reverse_polarity",
          "warning",
          `${item.type} Reversed`,
          `${item.type} is connected with reversed polarity, so it cannot operate safely.`,
          `Swap the wires on ${item.type} so its positive side receives power before its negative side returns to the battery.`,
          { itemId: item.id }
        )
      );
    } else if (returnPath && receivedVoltage > 0 && receivedVoltage < spec.minVoltage) {
      diagnostics.push(
        createDiagnostic(
          "insufficient_voltage",
          "warning",
          `${item.type} Underpowered`,
          `${item.type} is only receiving ${receivedVoltage.toFixed(1)}V, below its ${spec.minVoltage.toFixed(1)}V minimum.`,
          `Increase the source voltage or reduce earlier voltage drops before ${item.type}.`,
          { itemId: item.id }
        )
      );
    } else if (receivedVoltage > safeVoltage && safeVoltage > 0) {
      unsafeVoltage = true;
      burstItemIds.push(item.id);
      diagnostics.push(
        createDiagnostic(
          "over_voltage",
          "error",
          `${item.type} Overvoltage`,
          `${item.type} is receiving ${receivedVoltage.toFixed(1)}V, above its safe operating range.`,
          `Lower the battery voltage or distribute the load so ${item.type} does not receive more than about ${safeVoltage.toFixed(1)}V.`,
          { itemId: item.id }
        )
      );
    } else if (item.type === "LED" && returnPath && !resistorInPoweredPath) {
      diagnostics.push(
        createDiagnostic(
          "missing_component",
          "warning",
          "LED Needs A Resistor",
          "The LED is wired without a resistor, so the real circuit would risk too much current.",
          "Add a resistor in series with the LED to limit current and make the build safer.",
          { itemId: item.id, missingType: "Resistor" }
        )
      );
    }

    if (active) {
      activeItemIds.push(item.id);
    }
  });

  const groupedOutputs = {
    led: { active: false, intensity: 0, intensityPercent: 0 },
    motor: { active: false, intensity: 0, intensityPercent: 0 },
    buzzer: { active: false, intensity: 0, intensityPercent: 0 }
  };

  Object.values(componentStates).forEach(componentState => {
    const spec = getComponentSpec(componentState.type);
    const outputGroup = spec?.outputGroup;
    if (!outputGroup || !groupedOutputs[outputGroup]) return;
    groupedOutputs[outputGroup].active = groupedOutputs[outputGroup].active || componentState.active;
    groupedOutputs[outputGroup].intensity = Math.max(groupedOutputs[outputGroup].intensity, componentState.intensity);
    groupedOutputs[outputGroup].intensityPercent = Math.max(
      groupedOutputs[outputGroup].intensityPercent,
      componentState.intensityPercent
    );
  });

  const severityRank = { error: 3, warning: 2, info: 1 };
  diagnostics.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0));

  const primaryFinding = diagnostics[0] || null;
  const qualityScore = clamp(
    100 -
      diagnostics.filter(item => item.severity === "error").length * 25 -
      diagnostics.filter(item => item.severity === "warning").length * 12,
    0,
    100
  );

  return {
    diagnostics,
    primaryFinding,
    componentStates,
    outputs: groupedOutputs,
    activeItemIds,
    burstItemIds,
    hasShortCircuit: directShort,
    hasUnsafeVoltage: unsafeVoltage,
    hasClosedLoop: connectivityClosedLoop,
    samePolarityWire: Boolean(samePolarityWire),
    netVoltages: Object.fromEntries(voltageByNet.entries()),
    qualityScore,
    guidance: diagnostics.map(diagnostic => diagnostic.suggestion),
    summary: diagnostics.length
      ? diagnostics.map(diagnostic => `${diagnostic.title}: ${diagnostic.message}`).join(" ")
      : "Circuit looks healthy. Voltage is propagating correctly and the output path is complete.",
    catalog: COMPONENT_CATALOG
  };
}
