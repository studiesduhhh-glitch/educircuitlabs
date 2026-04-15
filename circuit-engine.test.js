import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCircuit } from "../src/core/circuit-engine.js";

function createItem(id, type, extras = {}) {
  const ports = ["negative", "positive"];
  return {
    id,
    type,
    ports,
    ...extras
  };
}

test("detects missing closed loop", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 5 });
  const led = createItem("led-1", "LED");
  const result = analyzeCircuit({
    items: [battery, led],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "led-1", port: "positive" }
      }
    ],
    defaultBatteryVoltage: 5
  });

  assert.equal(result.diagnostics.some(item => item.type === "missing_closed_loop"), true);
});

test("detects reverse polarity", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 5 });
  const led = createItem("led-1", "LED");
  const result = analyzeCircuit({
    items: [battery, led],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "led-1", port: "negative" }
      },
      {
        from: { itemId: "led-1", port: "positive" },
        to: { itemId: "battery-1", port: "negative" }
      }
    ],
    defaultBatteryVoltage: 5
  });

  assert.equal(result.diagnostics.some(item => item.type === "reverse_polarity"), true);
});

test("detects insufficient voltage", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 1.5 });
  const led = createItem("led-1", "LED");
  const result = analyzeCircuit({
    items: [battery, led],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "led-1", port: "positive" }
      },
      {
        from: { itemId: "led-1", port: "negative" },
        to: { itemId: "battery-1", port: "negative" }
      }
    ],
    defaultBatteryVoltage: 1.5
  });

  assert.equal(result.diagnostics.some(item => item.type === "insufficient_voltage"), true);
});

test("detects short circuit", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 9 });
  const switchItem = createItem("switch-1", "Switch", { isClosed: true });
  const result = analyzeCircuit({
    items: [battery, switchItem],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "switch-1", port: "positive" }
      },
      {
        from: { itemId: "switch-1", port: "negative" },
        to: { itemId: "battery-1", port: "negative" }
      }
    ],
    defaultBatteryVoltage: 9
  });

  assert.equal(result.diagnostics.some(item => item.type === "short_circuit"), true);
});

test("detects missing LED resistor", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 3 });
  const led = createItem("led-1", "LED");
  const result = analyzeCircuit({
    items: [battery, led],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "led-1", port: "positive" }
      },
      {
        from: { itemId: "led-1", port: "negative" },
        to: { itemId: "battery-1", port: "negative" }
      }
    ],
    defaultBatteryVoltage: 3
  });

  assert.equal(result.diagnostics.some(item => item.type === "missing_component"), true);
});

test("does not treat a resistor-protected LED path as a short", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 3 });
  const resistor = createItem("resistor-1", "Resistor");
  const led = createItem("led-1", "LED");
  const result = analyzeCircuit({
    items: [battery, resistor, led],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "resistor-1", port: "positive" }
      },
      {
        from: { itemId: "resistor-1", port: "negative" },
        to: { itemId: "led-1", port: "positive" }
      },
      {
        from: { itemId: "led-1", port: "negative" },
        to: { itemId: "battery-1", port: "negative" }
      }
    ],
    defaultBatteryVoltage: 3
  });

  assert.equal(result.diagnostics.some(item => item.type === "short_circuit"), false);
  assert.equal(result.diagnostics.some(item => item.type === "missing_component"), false);
  assert.equal(result.outputs.led.active, true);
});

test("detects over-voltage", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 9 });
  const led = createItem("led-1", "LED");
  const result = analyzeCircuit({
    items: [battery, led],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "led-1", port: "positive" }
      },
      {
        from: { itemId: "led-1", port: "negative" },
        to: { itemId: "battery-1", port: "negative" }
      }
    ],
    defaultBatteryVoltage: 9
  });

  assert.equal(result.diagnostics.some(item => item.type === "over_voltage"), true);
  assert.equal(result.hasUnsafeVoltage, true);
});

test("computes output intensity for an active load", () => {
  const battery = createItem("battery-1", "Battery", { voltage: 5 });
  const led = createItem("led-1", "LED");
  const result = analyzeCircuit({
    items: [battery, led],
    wires: [
      {
        from: { itemId: "battery-1", port: "positive" },
        to: { itemId: "led-1", port: "positive" }
      },
      {
        from: { itemId: "led-1", port: "negative" },
        to: { itemId: "battery-1", port: "negative" }
      }
    ],
    defaultBatteryVoltage: 5
  });

  assert.equal(result.outputs.led.active, true);
  assert.ok(result.outputs.led.intensityPercent > 0);
});
