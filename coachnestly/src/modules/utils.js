const SPORT_CLASS_MAP = {
  cricket: "academy-pill--blue",
  football: "academy-pill--green",
  swimming: "academy-pill--blue",
  badminton: "academy-pill--orange",
  tennis: "academy-pill--green",
  basketball: "academy-pill--orange",
  boxing: "academy-pill--blue",
  volleyball: "academy-pill--green"
};

export function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

export function toTitleCase(value = "") {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatCompactNumber(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatRating(value = 0) {
  return Number(value).toFixed(1);
}

export function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function debounce(callback, wait = 160) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), wait);
  };
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entityMap[character] || character;
  });
}

export function buildGoogleMapsUrl(query = "") {
  const params = new URLSearchParams({
    api: "1",
    query
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function getSportClass(sport = "") {
  return SPORT_CLASS_MAP[normalizeText(sport)] || "academy-pill--blue";
}

export function createSlug(value = "") {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateLocalId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

export function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function hashString(value = "") {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function formatDateLabel(value = new Date().toISOString()) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getScopeKey(user) {
  return normalizeText(user?.email) || "guest";
}
