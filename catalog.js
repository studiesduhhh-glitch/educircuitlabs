export const ROLE_OPTIONS = ["admin", "teacher", "student"];

export const COMPONENT_SPECS = {
  Battery: {
    type: "Battery",
    category: "source",
    icon: "🔋",
    desc: "Power source with + and - terminals",
    ports: ["negative", "positive"],
    minVoltage: 0,
    dropVoltage: 0,
    polaritySensitive: false,
    outputGroup: null,
    safeMultiplier: 2
  },
  LED: {
    type: "LED",
    category: "load",
    icon: "💡",
    desc: "Visual output",
    ports: ["negative", "positive"],
    minVoltage: 2,
    dropVoltage: 2,
    polaritySensitive: true,
    outputGroup: "led",
    safeMultiplier: 1.8
  },
  Motor: {
    type: "Motor",
    category: "load",
    icon: "⚙️",
    desc: "Rotating output",
    ports: ["negative", "positive"],
    minVoltage: 6,
    dropVoltage: 4,
    polaritySensitive: true,
    outputGroup: "motor",
    safeMultiplier: 1.7
  },
  Switch: {
    type: "Switch",
    category: "switch",
    icon: "🎚️",
    desc: "Input control",
    ports: ["negative", "positive"],
    minVoltage: 0,
    dropVoltage: 0,
    polaritySensitive: false,
    outputGroup: null,
    safeMultiplier: 2
  },
  Buzzer: {
    type: "Buzzer",
    category: "load",
    icon: "🔔",
    desc: "Sound output",
    ports: ["negative", "positive"],
    minVoltage: 3,
    dropVoltage: 2.5,
    polaritySensitive: true,
    outputGroup: "buzzer",
    safeMultiplier: 1.8
  },
  Resistor: {
    type: "Resistor",
    category: "conductor",
    icon: "🧱",
    desc: "Current limiter",
    ports: ["negative", "positive"],
    minVoltage: 0,
    dropVoltage: 0.6,
    polaritySensitive: false,
    outputGroup: null,
    safeMultiplier: 3
  },
  Capacitor: {
    type: "Capacitor",
    category: "conductor",
    icon: "📦",
    desc: "Energy storage",
    ports: ["negative", "positive"],
    minVoltage: 0,
    dropVoltage: 0.2,
    polaritySensitive: false,
    outputGroup: null,
    safeMultiplier: 3
  },
  Relay: {
    type: "Relay",
    category: "switch",
    icon: "📡",
    desc: "Switching element",
    ports: ["negative", "positive"],
    minVoltage: 5,
    dropVoltage: 0.2,
    polaritySensitive: false,
    outputGroup: null,
    safeMultiplier: 2
  },
  "Soil Sensor": {
    type: "Soil Sensor",
    category: "load",
    icon: "🌱",
    desc: "Moisture input",
    ports: ["negative", "positive"],
    minVoltage: 3.3,
    dropVoltage: 1,
    polaritySensitive: true,
    outputGroup: null,
    safeMultiplier: 1.8
  },
  "Light Sensor": {
    type: "Light Sensor",
    category: "load",
    icon: "☀️",
    desc: "Brightness input",
    ports: ["negative", "positive"],
    minVoltage: 3.3,
    dropVoltage: 1,
    polaritySensitive: true,
    outputGroup: null,
    safeMultiplier: 1.8
  },
  "Temp Sensor": {
    type: "Temp Sensor",
    category: "load",
    icon: "🌡️",
    desc: "Temperature input",
    ports: ["negative", "positive"],
    minVoltage: 3.3,
    dropVoltage: 1,
    polaritySensitive: true,
    outputGroup: null,
    safeMultiplier: 1.8
  },
  Pump: {
    type: "Pump",
    category: "load",
    icon: "🚰",
    desc: "Water output",
    ports: ["negative", "positive"],
    minVoltage: 6,
    dropVoltage: 4,
    polaritySensitive: true,
    outputGroup: "motor",
    safeMultiplier: 1.7
  },
  Servo: {
    type: "Servo",
    category: "load",
    icon: "🦾",
    desc: "Angle motor",
    ports: ["negative", "positive"],
    minVoltage: 5,
    dropVoltage: 3.5,
    polaritySensitive: true,
    outputGroup: "motor",
    safeMultiplier: 1.7
  }
};

export const COMPONENT_CATALOG = Object.values(COMPONENT_SPECS);

export function getComponentSpec(type) {
  return COMPONENT_SPECS[type] || null;
}

export function normalizePortName(port) {
  if (port === "right") return "positive";
  if (port === "left") return "negative";
  return port;
}

export function getPositivePort(item) {
  const ports = item?.ports || [];
  return ports.find(port => normalizePortName(port) === "positive") || ports[1] || ports[0] || "positive";
}

export function getNegativePort(item) {
  const ports = item?.ports || [];
  return ports.find(port => normalizePortName(port) === "negative") || ports[0] || ports[1] || "negative";
}

export function isLoadType(type) {
  return getComponentSpec(type)?.category === "load";
}

export function isConductiveType(type) {
  const category = getComponentSpec(type)?.category;
  return category === "conductor" || category === "switch";
}
