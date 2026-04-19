import { getComponentSpec } from "./catalog.js";

function cloneSnapshot(snapshot = {}) {
  return JSON.parse(JSON.stringify({
    id: snapshot.id || null,
    name: snapshot.name || "Untitled STEM Project",
    items: snapshot.items || [],
    wires: snapshot.wires || [],
    logic: snapshot.logic || [],
    defaultBatteryVoltage: snapshot.defaultBatteryVoltage || 5,
    ownerName: snapshot.ownerName || "",
    assignmentId: snapshot.assignmentId || null,
    assignmentTitle: snapshot.assignmentTitle || "",
    challengeId: snapshot.challengeId || "",
    grade: snapshot.grade || "Not graded",
    status: snapshot.status || "Not Submitted",
    feedback: snapshot.feedback || ""
  }));
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function deriveReplayLabel(snapshot = {}, previousSnapshot = null) {
  const items = snapshot.items || [];
  const wires = snapshot.wires || [];
  const logic = snapshot.logic || [];
  const previousItems = previousSnapshot?.items || [];
  const previousWires = previousSnapshot?.wires || [];
  const previousLogic = previousSnapshot?.logic || [];

  if (!previousSnapshot) {
    return items.length ? "Workspace loaded" : "Workspace ready";
  }
  if (!items.length && (previousItems.length || previousWires.length || previousLogic.length)) {
    return "Cleared workspace";
  }
  if (items.length > previousItems.length) {
    const previousIds = new Set(previousItems.map(item => item.id));
    const addedItem = items.find(item => !previousIds.has(item.id));
    return addedItem ? `Added ${addedItem.type}` : "Added component";
  }
  if (items.length < previousItems.length) {
    return "Removed component";
  }
  if (wires.length > previousWires.length) {
    return "Connected wire";
  }
  if (wires.length < previousWires.length) {
    return "Removed wire";
  }
  if (logic.length > previousLogic.length) {
    const addedLogic = logic.find((step, index) => previousLogic[index] !== step) || logic[logic.length - 1];
    return `Added ${addedLogic}`;
  }
  if (logic.length < previousLogic.length) {
    return "Updated logic";
  }
  if (snapshot.name !== previousSnapshot.name) {
    return "Renamed project";
  }
  const switchStateChanged = items.some(item => {
    const previousItem = previousItems.find(entry => entry.id === item.id);
    return previousItem && previousItem.isClosed !== item.isClosed;
  });
  if (switchStateChanged) {
    return "Toggled switch";
  }
  const movedComponent = items.some(item => {
    const previousItem = previousItems.find(entry => entry.id === item.id);
    return previousItem && (previousItem.x !== item.x || previousItem.y !== item.y);
  });
  if (movedComponent) {
    return "Moved component";
  }
  return "Updated build";
}

export function buildSnapshotSignature(snapshot = {}) {
  return JSON.stringify({
    name: snapshot.name || "",
    defaultBatteryVoltage: snapshot.defaultBatteryVoltage || 5,
    assignmentId: snapshot.assignmentId || null,
    challengeId: snapshot.challengeId || "",
    items: (snapshot.items || []).map(item => ({
      id: item.id,
      type: item.type,
      x: Math.round(Number(item.x || 0)),
      y: Math.round(Number(item.y || 0)),
      isClosed: Boolean(item.isClosed),
      voltage: Number(item.voltage || 0)
    })),
    wires: (snapshot.wires || []).map(wire => ({
      id: wire.id,
      from: wire.from,
      to: wire.to
    })),
    logic: snapshot.logic || []
  });
}

export function buildReplayEntry(snapshot = {}, previousSnapshot = null, options = {}) {
  const cleanSnapshot = cloneSnapshot(snapshot);
  return {
    id: options.id || `replay-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    label: options.label || deriveReplayLabel(cleanSnapshot, previousSnapshot),
    detail: `${cleanSnapshot.items.length} components • ${cleanSnapshot.wires.length} wires • ${cleanSnapshot.logic.length} logic blocks`,
    snapshot: cleanSnapshot,
    createdAt: options.createdAt || new Date().toISOString()
  };
}

export function buildGuidedLabSteps(result = {}, assignment = null) {
  const challengeRequirements = result.challenge?.requirements || [];
  const circuitChecks = result.circuit?.checks || [];
  const requirementSteps = challengeRequirements.map(requirement => ({
    id: requirement.id,
    label: requirement.label,
    passed: requirement.passed
  }));

  const baseSteps = requirementSteps.length
    ? requirementSteps
    : circuitChecks.map(check => ({
        id: check.id,
        label: check.label,
        passed: check.passed
      }));

  if (assignment?.title) {
    return [
      {
        id: "assignment-target",
        label: assignment.title,
        passed: Boolean(result.challenge?.passed || result.circuit?.isCorrect)
      },
      ...baseSteps
    ];
  }

  return baseSteps;
}

export function getGuidedLabNextFix(result = {}) {
  const nextRequirement = (result.challenge?.requirements || []).find(requirement => !requirement.passed);
  if (nextRequirement) {
    return `Next guided fix: ${nextRequirement.label}.`;
  }
  if (result.hint?.message) {
    return result.hint.message;
  }
  return result.challenge?.message || result.circuit?.message || "Run Logic to get the next guided fix.";
}

function buildOverviewReading(snapshot = {}, report = {}) {
  const diagnostics = report.diagnostics || [];
  const status = diagnostics.some(item => item.severity === "error")
    ? "error"
    : diagnostics.some(item => item.severity === "warning")
      ? "warning"
      : "safe";

  return {
    title: "Whole Circuit",
    status,
    voltage: `${Number(snapshot.defaultBatteryVoltage || 0).toFixed(1)}V source`,
    current: report.hasClosedLoop
      ? (report.activeItemIds || []).length ? "Current can flow through the loop" : "Loop is present but no load is active"
      : "Open loop",
    continuity: report.hasClosedLoop ? "Closed loop" : "Open return path",
    note: report.primaryFinding?.message || "Select a component to inspect a more precise reading."
  };
}

export function buildMultimeterReading(snapshot = {}, report = {}, selection = { type: "overview" }) {
  if (!selection || selection.type !== "item") {
    return buildOverviewReading(snapshot, report);
  }

  const items = snapshot.items || [];
  const item = items.find(entry => entry.id === selection.id);
  if (!item) {
    return buildOverviewReading(snapshot, report);
  }

  const spec = getComponentSpec(item.type) || {};
  const componentState = report.componentStates?.[item.id] || {};
  const diagnostic = (report.diagnostics || []).find(entry => entry.itemId === item.id);
  const status = diagnostic?.severity === "error"
    ? "error"
    : diagnostic?.severity === "warning"
      ? "warning"
      : componentState.active || item.type === "Battery"
        ? "safe"
        : "warning";
  const measuredVoltage = item.type === "Battery"
    ? Number(item.voltage ?? snapshot.defaultBatteryVoltage ?? 0)
    : Number(componentState.receivedVoltage || 0);
  const continuity = item.type === "Battery"
    ? "Source ready"
    : componentState.returnPath
      ? "Return path found"
      : "Return path open";

  return {
    title: item.type,
    status,
    voltage: `${measuredVoltage.toFixed(1)}V`,
    current: item.type === "Battery"
      ? "Providing source voltage"
      : componentState.active
        ? `${componentState.intensityPercent || 0}% output strength`
        : measuredVoltage > 0
          ? "Voltage present, but not fully active"
          : "No active flow",
    continuity,
    note: diagnostic?.message || spec.desc || "No extra diagnostic detail for this component yet."
  };
}

export function replayEntriesDiffer(a = {}, b = {}) {
  return !sameJson(a.snapshot || {}, b.snapshot || {});
}
