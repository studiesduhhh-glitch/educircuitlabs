(function initEducircuitComponents(global) {
  function escapeHtml(value = "") {
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  function componentCard(component) {
    const card = document.createElement("div");
    card.className = "component-card";
    card.innerHTML = `
      <div class="component-icon">${escapeHtml(component.icon)}</div>
      <div class="component-name">${escapeHtml(component.type)}</div>
      <div class="component-meta">${escapeHtml(component.desc)}</div>
    `;
    return card;
  }

  function logicCard(name) {
    const item = document.createElement("div");
    item.className = "example-item";
    item.innerHTML = `<b>${escapeHtml(name)}</b>Click to add to logic workspace`;
    return item;
  }

  function projectPageCard(project, index) {
    const card = document.createElement("article");
    card.className = "project-page-card";
    card.innerHTML = `
      <h3>${escapeHtml(project.name)}</h3>
      <p class="project-card-meta">${escapeHtml(project.date)}</p>
      <div class="project-card-actions">
        <button data-project-action="open" data-project-index="${index}">Open</button>
        <button data-project-action="delete" data-project-index="${index}" class="red">Delete</button>
      </div>
    `;
    return card;
  }

  function projectListItem(project, index) {
    const item = document.createElement("div");
    item.className = "project-item";
    item.innerHTML = `
      <div class="project-info">
        <div class="project-name">${escapeHtml(project.name)}</div>
        <div class="project-date">${escapeHtml(project.date)}</div>
      </div>
      <div class="project-actions">
        <button class="secondary" data-project-action="open" data-project-index="${index}">Open</button>
        <button class="red" data-project-action="delete" data-project-index="${index}">Delete</button>
      </div>
    `;
    return item;
  }

  function studentProjectCard({ student, project, index, isTeacher }) {
    const card = document.createElement("article");
    card.className = "project-page-card";
    const ownerLabel = isTeacher ? student.name : "Reviewed work";
    const reviewed = project.gradedAt
      ? `<p class="project-card-meta">Reviewed: ${escapeHtml(project.gradedAt)}</p>`
      : "";

    card.innerHTML = `
      <h3>${escapeHtml(project.name)}</h3>
      <p class="project-card-meta">${escapeHtml(ownerLabel)}</p>
      <p class="project-card-meta">${escapeHtml(project.date)}</p>
      ${reviewed}
      <p class="project-card-grade">Grade: ${escapeHtml(project.grade)}</p>
      <div class="project-card-actions">
        <button data-student-project-action="open" data-student-name="${escapeHtml(student.name)}" data-project-index="${index}">Open</button>
      </div>
    `;
    return card;
  }

  function canvasItemStatus({ item, config, activeItemIds, burstItemIds }) {
    if (burstItemIds.includes(item.id)) {
      return `<div class="burst-indicator">💥</div>`;
    }
    if (item.type === "Switch" || item.type === "Relay") {
      return `<div class="pill compact-pill">${item.isClosed ? "Closed" : "Open"}</div>`;
    }
    if (item.type === "LED") {
      return `<div class="led-indicator ${activeItemIds.includes(item.id) ? "on" : ""}"></div>`;
    }
    if (item.type === "Motor" || item.type === "Pump" || item.type === "Servo") {
      return `<div class="motor-wheel ${activeItemIds.includes(item.id) ? "on" : ""}"></div>`;
    }
    if (item.type === "Buzzer") {
      return `<div class="buzzer-wave ${activeItemIds.includes(item.id) ? "on" : ""}"></div>`;
    }
    return `<div class="component-status-icon">${escapeHtml(config.icon)}</div>`;
  }

  global.EducircuitUI = {
    escapeHtml,
    componentCard,
    logicCard,
    projectPageCard,
    projectListItem,
    studentProjectCard,
    canvasItemStatus
  };
})(window);
