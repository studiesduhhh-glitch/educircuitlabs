const SPORT_STYLES = {
  Cricket: {
    pillClass: "academy-pill--blue"
  },
  Football: {
    pillClass: "academy-pill--green"
  },
  Swimming: {
    pillClass: "academy-pill--orange"
  },
  Badminton: {
    pillClass: "academy-pill--blue"
  },
  Tennis: {
    pillClass: "academy-pill--green"
  },
  Basketball: {
    pillClass: "academy-pill--orange"
  },
  Boxing: {
    pillClass: "academy-pill--blue"
  },
  Volleyball: {
    pillClass: "academy-pill--green"
  },
  "All Sports": {
    pillClass: "academy-pill--blue"
  }
};

const SPORT_PRESETS = [
  {
    key: "all",
    label: "All Sports",
    shortLabel: "ALL",
    searchQuery: "sports coaching centre"
  },
  {
    key: "cricket",
    label: "Cricket",
    shortLabel: "CR",
    searchQuery: "cricket academy"
  },
  {
    key: "football",
    label: "Football",
    shortLabel: "FB",
    searchQuery: "football coaching centre"
  },
  {
    key: "swimming",
    label: "Swimming",
    shortLabel: "SW",
    searchQuery: "swimming academy"
  },
  {
    key: "badminton",
    label: "Badminton",
    shortLabel: "BD",
    searchQuery: "badminton academy"
  },
  {
    key: "tennis",
    label: "Tennis",
    shortLabel: "TN",
    searchQuery: "tennis coaching centre"
  },
  {
    key: "basketball",
    label: "Basketball",
    shortLabel: "BB",
    searchQuery: "basketball coaching centre"
  },
  {
    key: "boxing",
    label: "Boxing",
    shortLabel: "BX",
    searchQuery: "boxing academy"
  },
  {
    key: "volleyball",
    label: "Volleyball",
    shortLabel: "VB",
    searchQuery: "volleyball coaching centre"
  }
];

const DEFAULT_SEARCH_RADIUS_METERS = 12000;
const QUICK_GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 1600,
  maximumAge: 300000
};
const LIVE_GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 6000,
  maximumAge: 30000
};

const GOOGLE_MAPS_API_KEY =
  document
    .querySelector('meta[name="coachnestly-google-maps-api-key"]')
    ?.getAttribute("content")
    ?.trim() ||
  window.COACHNESTLY_GOOGLE_MAPS_API_KEY ||
  "";

const MOCK_COORDINATES = readMockCoordinatesFromUrl();

const elements = {
  menuToggle: document.querySelector("#menuToggle"),
  siteNav: document.querySelector("#siteNav"),
  navLoginButton: document.querySelector("#authTrigger"),
  searchForm: document.querySelector("#searchForm"),
  sportInput: document.querySelector("#sportInput"),
  locationInput: document.querySelector("#locationInput"),
  searchFeedback: document.querySelector("#searchFeedback"),
  geoStatus: document.querySelector("#geoStatus"),
  locateMeButton: document.querySelector("#locateMeButton"),
  clearFilters: document.querySelector("#clearFilters"),
  heroStats: document.querySelector("#heroStats"),
  dashboardMetrics: document.querySelector("#dashboardMetrics"),
  heroSportsGrid: document.querySelector("#heroSportsGrid"),
  heroSpotlight: document.querySelector("#heroSpotlight"),
  featuredGrid: document.querySelector("#featuredGrid"),
  categoryChips: document.querySelector("#categoryChips"),
  resultsGrid: document.querySelector("#resultsGrid"),
  emptyState: document.querySelector("#emptyState"),
  resultsCount: document.querySelector("#resultsCount"),
  matchMode: document.querySelector("#matchMode"),
  resultsSummary: document.querySelector("#resultsSummary"),
  mapStatusLabel: document.querySelector("#mapStatusLabel"),
  mapHelper: document.querySelector("#mapHelper"),
  resetMapView: document.querySelector("#resetMapView"),
  mapCanvas: document.querySelector("#leafletMap"),
  mapPanel: document.querySelector("#map"),
  academyForm: document.querySelector("#academyForm"),
  academySubmitButton: document.querySelector("#academySubmitButton"),
  authBanner: document.querySelector("#authBanner"),
  formStatus: document.querySelector("#formStatus"),
  sportsList: document.querySelector("#sportsList"),
  areasList: document.querySelector("#areasList"),
  modalShell: document.querySelector("#detailsModal"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  closeModal: document.querySelector("#closeModal"),
  modalDone: document.querySelector("#modalDone"),
  modalBadge: document.querySelector("#modalBadge"),
  modalTitle: document.querySelector("#modalTitle"),
  modalDescription: document.querySelector("#modalDescription"),
  modalSport: document.querySelector("#modalSport"),
  modalDistance: document.querySelector("#modalDistance"),
  modalRating: document.querySelector("#modalRating"),
  modalLocation: document.querySelector("#modalLocation"),
  modalContact: document.querySelector("#modalContact"),
  authModalShell: document.querySelector("#authModal"),
  authBackdrop: document.querySelector("#authBackdrop"),
  closeAuthModal: document.querySelector("#closeAuthModal"),
  authModalBadge: document.querySelector("#authModalBadge"),
  authModalTitle: document.querySelector("#authModalTitle"),
  authModalDescription: document.querySelector("#authModalDescription"),
  authForm: document.querySelector("#authForm"),
  authStatus: document.querySelector("#authStatus"),
  authSessionPanel: document.querySelector("#authSessionPanel"),
  authSessionName: document.querySelector("#authSessionName"),
  authSessionEmail: document.querySelector("#authSessionEmail"),
  authContinueButton: document.querySelector("#authContinueButton"),
  authLogoutButton: document.querySelector("#authLogoutButton"),
  bottomNavLinks: document.querySelectorAll(".bottom-nav a")
};

const state = {
  currentUser: null,
  userCoordinates: null,
  locationAccuracy: null,
  autoLocationLabel: "",
  geolocationWatchId: null,
  sessionAcademies: [],
  liveResults: [],
  selectedResultId: null,
  activeMapUrl: "",
  dataMode: GOOGLE_MAPS_API_KEY ? "google-places" : "google-maps-live",
  authReturnTarget: null,
  pendingSearchId: 0,
  revealObserver: null,
  sectionObserver: null
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function readMockCoordinatesFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const mockEnabled =
    params.get("useMockLocation") === "1" ||
    params.get("debugLocation") === "1";

  if (!mockEnabled) {
    return null;
  }

  const lat = Number(params.get("mockLat"));
  const lng = Number(params.get("mockLng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function normalizeText(value) {
  return value.trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTitleCase(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatCoordinateLabel(coordinates) {
  if (!coordinates) {
    return "your live location";
  }

  return `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
}

function haversineKm(start, end) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRadians(end.lat - start.lat);
  const dLng = toRadians(end.lng - start.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(start.lat)) *
      Math.cos(toRadians(end.lat)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSportStyle(sport) {
  return SPORT_STYLES[sport] || SPORT_STYLES["All Sports"];
}

function getCurrentFilters() {
  const rawLocation = elements.locationInput.value.trim();
  const usesAutoLocation =
    rawLocation &&
    state.autoLocationLabel &&
    normalizeText(rawLocation) === normalizeText(state.autoLocationLabel);

  return {
    sport: elements.sportInput.value.trim(),
    location: usesAutoLocation ? "" : rawLocation
  };
}

function getLocationContextLabel(filters = getCurrentFilters()) {
  return filters.location || state.autoLocationLabel || "your live location";
}

function findPresetBySportName(value) {
  const normalizedValue = normalizeText(value);
  return (
    SPORT_PRESETS.find((preset) => normalizeText(preset.label) === normalizedValue) ||
    null
  );
}

function getActivePreset(filters = getCurrentFilters()) {
  if (filters.sport) {
    return (
      findPresetBySportName(filters.sport) || {
        key: normalizedSlug(filters.sport),
        label: toTitleCase(filters.sport),
        shortLabel: filters.sport.slice(0, 2).toUpperCase(),
        searchQuery: `${filters.sport} coaching centre`
      }
    );
  }

  return SPORT_PRESETS[0];
}

function normalizedSlug(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-");
}

function buildDiscoveryQuery(filters = getCurrentFilters()) {
  const preset = getActivePreset(filters);

  if (filters.location) {
    return `${preset.searchQuery} near ${filters.location}`;
  }

  return preset.searchQuery;
}

function buildGoogleMapsSearchUrl(query, coordinates = state.userCoordinates) {
  const params = new URLSearchParams({
    api: "1",
    query: coordinates
      ? `${query} near ${coordinates.lat},${coordinates.lng}`
      : `${query} near me`
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function buildGoogleMapsEmbedUrl(query, coordinates = state.userCoordinates) {
  const locationLabel = coordinates
    ? `${query} near ${coordinates.lat},${coordinates.lng}`
    : `${query} near me`;

  return `https://www.google.com/maps?q=${encodeURIComponent(
    locationLabel
  )}&z=13&output=embed`;
}

function buildResultEmbedUrl(result) {
  if (result.embedUrl) {
    return result.embedUrl;
  }

  if (result.coordinates) {
    return `https://www.google.com/maps?q=${result.coordinates.lat},${result.coordinates.lng}&z=15&output=embed`;
  }

  return buildGoogleMapsEmbedUrl(result.query || buildDiscoveryQuery());
}

function getResultById(resultId) {
  return state.liveResults.find((result) => result.id === resultId) || null;
}

function formatDistanceLabel(result) {
  if (typeof result.distanceKm === "number") {
    return `${result.distanceKm.toFixed(1)} km from you`;
  }

  return result.distanceLabel || "Live Google Maps search";
}

function getContactHref(contact) {
  return contact.includes("@")
    ? `mailto:${contact}`
    : `tel:${contact.replace(/[^\d+]/g, "")}`;
}

function buildHighlightMatcher(filters) {
  const tokens = [filters.sport, filters.location]
    .flatMap((value) => value.trim().split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 1);

  if (!tokens.length) {
    return null;
  }

  return new RegExp(
    `(${[...new Set(tokens)].map(escapeRegExp).join("|")})`,
    "gi"
  );
}

function highlightText(value, matcher) {
  const safeValue = escapeHtml(value);
  return matcher ? safeValue.replace(matcher, "<mark>$1</mark>") : safeValue;
}

function setGeoStatus(message, tone = "neutral") {
  elements.geoStatus.textContent = message;
  elements.geoStatus.className = `geo-feedback is-${tone}`;
}

function setFormStatus(message, tone = "neutral") {
  elements.formStatus.textContent = message;
  elements.formStatus.className =
    tone === "neutral" ? "form-status" : `form-status is-${tone}`;
}

function setAuthStatus(message, tone = "neutral") {
  elements.authStatus.textContent = message;
  elements.authStatus.className =
    tone === "neutral" ? "form-status" : `form-status is-${tone}`;
}

function syncBodyModalState() {
  const detailsOpen = elements.modalShell.getAttribute("aria-hidden") === "false";
  const authOpen = elements.authModalShell.getAttribute("aria-hidden") === "false";
  document.body.classList.toggle("modal-open", detailsOpen || authOpen);
}

function updateLocateButtonLabel() {
  if (MOCK_COORDINATES) {
    elements.locateMeButton.textContent = "Mock location active";
    elements.locateMeButton.disabled = true;
    return;
  }

  let label = "Use my location";

  if (state.geolocationWatchId !== null) {
    label = "Stop live location";
  } else if (state.userCoordinates) {
    label = "Resume live location";
  }

  elements.locateMeButton.textContent = label;
  elements.locateMeButton.disabled = false;
}

function clearFormErrors() {
  elements.academyForm.querySelectorAll(".field-error").forEach((errorNode) => {
    errorNode.textContent = "";
  });

  elements.academyForm
    .querySelectorAll("input, textarea")
    .forEach((field) => field.removeAttribute("aria-invalid"));
}

function clearAuthErrors() {
  elements.authForm
    .querySelectorAll("[data-auth-error-for]")
    .forEach((errorNode) => {
      errorNode.textContent = "";
    });

  elements.authForm
    .querySelectorAll("input")
    .forEach((field) => field.removeAttribute("aria-invalid"));
}

function setFieldError(fieldName, message) {
  const field = elements.academyForm.elements[fieldName];
  const errorNode = elements.academyForm.querySelector(
    `[data-error-for="${fieldName}"]`
  );

  if (field) {
    field.setAttribute("aria-invalid", "true");
  }

  if (errorNode) {
    errorNode.textContent = message;
  }
}

function setAuthFieldError(fieldName, message) {
  const field = elements.authForm.elements[fieldName];
  const errorNode = elements.authForm.querySelector(
    `[data-auth-error-for="${fieldName}"]`
  );

  if (field) {
    field.setAttribute("aria-invalid", "true");
  }

  if (errorNode) {
    errorNode.textContent = message;
  }
}

function renderDatalists() {
  elements.sportsList.innerHTML = SPORT_PRESETS.filter(
    (preset) => preset.key !== "all"
  )
    .map((preset) => `<option value="${escapeHtml(preset.label)}"></option>`)
    .join("");

  elements.areasList.innerHTML = "";
}

function renderHeroStats() {
  const stats = [
    {
      value: state.liveResults.length || 0,
      label: state.dataMode === "google-places"
        ? "Live nearby results from Google Places"
        : "Live Google Maps search lanes around you"
    },
    {
      value: state.locationAccuracy
        ? `${Math.round(state.locationAccuracy)}m`
        : "GPS",
      label: state.locationAccuracy
        ? "Approximate live accuracy from your device"
        : "Waiting for live device coordinates"
    },
    {
      value: state.sessionAcademies.length,
      label: "Academies added only for this session"
    },
    {
      value: GOOGLE_MAPS_API_KEY ? "API" : "MAPS",
      label: GOOGLE_MAPS_API_KEY
        ? "Google Places cards are enabled"
        : "Google Maps live search mode is active"
    }
  ];

  elements.heroStats.innerHTML = stats
    .map(
      (stat, index) => `
        <article class="metric-card" data-reveal style="--reveal-delay: ${index * 80}ms">
          <strong>${escapeHtml(String(stat.value))}</strong>
          <span>${escapeHtml(stat.label)}</span>
        </article>
      `
    )
    .join("");

  observeRevealElements(elements.heroStats);
}

function renderDashboardMetrics() {
  const metrics = [
    {
      value: getLocationContextLabel(),
      label: "Search origin updates from your current location"
    },
    {
      value: buildDiscoveryQuery(),
      label: "Active Google Maps discovery query"
    },
    {
      value: state.dataMode === "google-places" ? "Live place cards" : "Search shortcuts",
      label: GOOGLE_MAPS_API_KEY
        ? "Real Google Places cards when an API key is configured"
        : "Dynamic Google Maps searches without hardcoded centres"
    },
    {
      value: state.currentUser ? state.currentUser.name : "Guest",
      label: state.currentUser
        ? "Logged in for this tab only"
        : "Login remains temporary and non-persistent"
    }
  ];

  elements.dashboardMetrics.innerHTML = metrics
    .map(
      (metric) => `
        <article class="dashboard-metric">
          <strong>${escapeHtml(String(metric.value))}</strong>
          <span>${escapeHtml(metric.label)}</span>
        </article>
      `
    )
    .join("");
}

function renderHeroSportsGrid() {
  const filters = getCurrentFilters();
  const activeSport = normalizeText(filters.sport);

  elements.heroSportsGrid.innerHTML = SPORT_PRESETS.filter(
    (preset) => preset.key !== "all"
  )
    .slice(0, 6)
    .map((preset) => {
      const style = getSportStyle(preset.label);
      const isActive =
        activeSport && activeSport === normalizeText(preset.label);

      return `
        <article class="sport-tile${isActive ? " is-active" : ""}">
          <div>
            <strong>${escapeHtml(preset.label)}</strong>
            <span>Live Google Maps search near you</span>
          </div>
          <span class="sport-tile__pill ${style.pillClass}">${escapeHtml(
            preset.shortLabel
          )}</span>
        </article>
      `;
    })
    .join("");
}

function renderHeroSpotlight() {
  const spotlight = state.liveResults[0];

  if (!spotlight) {
    elements.heroSpotlight.innerHTML = `
      <div class="hero-spotlight__top">
        <span class="featured-badge">Live mode</span>
        <strong>Waiting for your live location</strong>
      </div>
      <p>
        CoachNestly no longer uses fixed city data. As soon as location is available,
        Google Maps searches and nearby discovery cards will refresh around you.
      </p>
    `;
    return;
  }

  elements.heroSpotlight.innerHTML = `
    <div class="hero-spotlight__top">
      <span class="featured-badge">${
        spotlight.source === "google-places" ? "Google Maps result" : "Live search"
      }</span>
      <strong>${escapeHtml(spotlight.name)}</strong>
    </div>
    <p>${escapeHtml(spotlight.description)}</p>
    <div class="hero-spotlight__actions">
      <button
        class="ghost-button"
        type="button"
        data-spotlight-action="focus"
        data-result-id="${escapeHtml(spotlight.id)}"
      >
        Preview on map
      </button>
      <button
        class="ghost-button"
        type="button"
        data-spotlight-action="details"
        data-result-id="${escapeHtml(spotlight.id)}"
      >
        View details
      </button>
    </div>
  `;
}

function renderFeaturedGrid() {
  const featuredResults = state.liveResults.slice(0, 3);

  if (!featuredResults.length) {
    elements.featuredGrid.innerHTML = "";
    return;
  }

  elements.featuredGrid.innerHTML = featuredResults
    .map((result, index) => {
      const style = getSportStyle(result.sport);

      return `
        <article class="featured-card featured-card--sponsored" data-reveal style="--reveal-delay: ${index * 70}ms">
          <div class="featured-card__top">
            <span class="featured-badge">${
              result.source === "google-places" ? "Nearby result" : "Live search"
            }</span>
            <span class="academy-distance">${escapeHtml(
              formatDistanceLabel(result)
            )}</span>
          </div>
          <div class="featured-card__title-wrap">
            <h3 class="featured-card__title">${escapeHtml(result.name)}</h3>
            <p class="featured-card__location">${escapeHtml(result.locationLabel)}</p>
            <p class="featured-card__description">${escapeHtml(
              result.description
            )}</p>
          </div>
          <div class="featured-card__meta">
            <div class="featured-card__rating">
              <strong>${escapeHtml(result.metaLabel)}</strong>
            </div>
            <span class="academy-pill ${style.pillClass}">${escapeHtml(
              result.sport
            )}</span>
          </div>
          <div class="featured-card__actions">
            <button
              class="card-button card-button--ghost"
              type="button"
              data-featured-action="focus"
              data-result-id="${escapeHtml(result.id)}"
            >
              Preview map
            </button>
            <a
              class="card-button card-button--primary"
              href="${escapeHtml(result.googleMapsUrl)}"
              target="_blank"
              rel="noreferrer"
            >
              Google Maps
            </a>
          </div>
        </article>
      `;
    })
    .join("");

  observeRevealElements(elements.featuredGrid);
}

function renderCategoryChips() {
  const activeSport = normalizeText(elements.sportInput.value);

  elements.categoryChips.innerHTML = SPORT_PRESETS.map((preset) => {
    const isActive =
      preset.key === "all" ? !activeSport : activeSport === normalizeText(preset.label);

    return `
      <button
        class="category-chip${isActive ? " is-active" : ""}"
        type="button"
        data-sport-chip="${escapeHtml(preset.key === "all" ? "" : preset.label)}"
      >
        ${escapeHtml(preset.label)}
      </button>
    `;
  }).join("");
}

function renderResults() {
  const filters = getCurrentFilters();
  const matcher = buildHighlightMatcher(filters);

  if (!state.liveResults.length) {
    elements.resultsGrid.innerHTML = "";
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;
  elements.resultsGrid.innerHTML = state.liveResults
    .map((result, index) => {
      const style = getSportStyle(result.sport);
      const selectedClass = state.selectedResultId === result.id ? " is-selected" : "";

      return `
        <article
          class="academy-card${selectedClass}"
          data-card-id="${escapeHtml(result.id)}"
          tabindex="0"
          data-reveal
          style="--reveal-delay: ${index * 45}ms"
        >
          <div class="academy-card__top">
            <div class="academy-card__labels">
              <span class="academy-pill ${style.pillClass}">${highlightText(
                result.sport,
                matcher
              )}</span>
              ${
                result.source === "session-academy"
                  ? '<span class="featured-badge">Session only</span>'
                  : result.source === "google-places"
                    ? '<span class="featured-badge">Google Maps</span>'
                    : '<span class="featured-badge">Live search</span>'
              }
            </div>
            <span class="academy-distance">${escapeHtml(
              formatDistanceLabel(result)
            )}</span>
          </div>
          <div class="academy-card__title-wrap">
            <h3 class="academy-card__title">${highlightText(
              result.name,
              matcher
            )}</h3>
            <p class="academy-card__location">${highlightText(
              result.locationLabel,
              matcher
            )}</p>
            <p class="academy-card__description">${highlightText(
              result.description,
              matcher
            )}</p>
          </div>
          <div class="academy-card__meta">
            <div class="academy-card__rating">
              <strong>${escapeHtml(result.metaLabel)}</strong>
            </div>
            <span class="academy-pill ${style.pillClass}">${
              result.source === "google-places" ? "Nearby" : "Dynamic"
            }</span>
          </div>
          <div class="academy-card__actions">
            <button
              class="card-button card-button--ghost"
              type="button"
              data-card-action="focus"
              data-result-id="${escapeHtml(result.id)}"
            >
              Preview map
            </button>
            <button
              class="card-button card-button--primary"
              type="button"
              data-card-action="details"
              data-result-id="${escapeHtml(result.id)}"
            >
              View details
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  observeRevealElements(elements.resultsGrid);
}

function updateResultsCopy() {
  const filters = getCurrentFilters();
  const resultLabel = state.liveResults.length === 1 ? "result" : "results";
  const searchQuery = buildDiscoveryQuery(filters);

  elements.resultsCount.textContent = `${state.liveResults.length} ${resultLabel}`;
  elements.matchMode.textContent =
    state.dataMode === "google-places" ? "Google Places live" : "Google Maps live";

  if (!state.userCoordinates) {
    elements.resultsSummary.textContent =
      "Allow location access to replace every fixed data point with live nearby discovery.";
    elements.searchFeedback.textContent =
      "This experience now waits for your live location before building nearby coaching discovery.";
    elements.mapStatusLabel.textContent = "Waiting for live location";
    elements.mapHelper.textContent =
      "Once location is available, the map and every search card refresh around your coordinates.";
    return;
  }

  if (!state.liveResults.length) {
    elements.resultsSummary.textContent =
      "No live nearby matches were found for the current search. Try another sport or clear the filters.";
    elements.searchFeedback.textContent =
      "Google Maps search updated, but there are no visible live results for this query yet.";
    elements.mapStatusLabel.textContent = "Live search returned no visible matches";
    elements.mapHelper.textContent =
      "Try another sport or reset the query to rebuild nearby discovery around your location.";
    return;
  }

  elements.resultsSummary.textContent = `Showing ${state.liveResults.length} live ${resultLabel} for "${searchQuery}" around ${getLocationContextLabel(
    filters
  )}.`;
  elements.searchFeedback.textContent = GOOGLE_MAPS_API_KEY
    ? "Cards are populated from live Google Places results near your current location."
    : "Map and cards are built from live Google Maps searches around your current location. Add a Google Maps API key to replace shortcuts with live place cards.";
  elements.mapStatusLabel.textContent = `${state.liveResults.length} live nearby ${resultLabel} synced to Google Maps`;
  elements.mapHelper.textContent =
    "Every visible card is generated from your current location or your active live search query. Nothing is stored permanently.";
}

function renderMapEmbed(url = state.activeMapUrl) {
  elements.mapCanvas.innerHTML = "";

  if (!url) {
    const placeholder = document.createElement("div");
    placeholder.className = "map-fallback";
    placeholder.textContent = "Waiting for live location to load Google Maps.";
    elements.mapCanvas.appendChild(placeholder);
    return;
  }

  state.activeMapUrl = url;

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.title = "Google Maps live coaching discovery";
  iframe.setAttribute("aria-label", "Google Maps live coaching discovery");

  elements.mapCanvas.appendChild(iframe);
}

function focusResult(resultId, { scrollToMap = false } = {}) {
  const result = getResultById(resultId);

  if (!result) {
    return;
  }

  state.selectedResultId = result.id;
  renderResults();
  renderMapEmbed(buildResultEmbedUrl(result));
  updateResultsCopy();

  if (scrollToMap && window.innerWidth < 960) {
    elements.mapPanel.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  }
}

function openDetailsModal(resultId) {
  const result = getResultById(resultId);

  if (!result) {
    return;
  }

  state.selectedResultId = result.id;
  renderResults();
  renderMapEmbed(buildResultEmbedUrl(result));
  updateResultsCopy();

  elements.modalBadge.textContent =
    result.source === "session-academy"
      ? "Session academy"
      : result.source === "google-places"
        ? "Google Maps result"
        : "Live Google Maps search";
  elements.modalTitle.textContent = result.name;
  elements.modalDescription.textContent = result.description;
  elements.modalSport.textContent = result.sport;
  elements.modalDistance.textContent = formatDistanceLabel(result);
  elements.modalRating.textContent = result.metaLabel;
  elements.modalLocation.textContent = result.locationLabel;
  elements.modalContact.href = result.contactHref || result.googleMapsUrl;
  elements.modalContact.textContent = result.contactHref ? "Contact" : "Open in Google Maps";
  elements.modalContact.target = result.contactHref ? "_self" : "_blank";
  elements.modalContact.rel = result.contactHref ? "" : "noreferrer";
  elements.modalShell.setAttribute("aria-hidden", "false");
  syncBodyModalState();
}

function closeDetailsModal() {
  elements.modalShell.setAttribute("aria-hidden", "true");
  syncBodyModalState();
}

function updateAuthModalView() {
  const isLoggedIn = Boolean(state.currentUser);

  elements.authModalBadge.textContent = isLoggedIn ? "Temporary session" : "Member login";
  elements.authModalTitle.textContent = isLoggedIn
    ? `Welcome, ${state.currentUser.name}`
    : "Login to add session-only academies";
  elements.authModalDescription.textContent = isLoggedIn
    ? "Your login lives only in this open tab. Reloading clears it."
    : "Use a quick temporary login. Nothing is stored permanently.";
  elements.authForm.hidden = isLoggedIn;
  elements.authSessionPanel.hidden = !isLoggedIn;

  if (isLoggedIn) {
    elements.authSessionName.textContent = state.currentUser.name;
    elements.authSessionEmail.textContent = state.currentUser.email;
  }
}

function updateAuthUI() {
  const isLoggedIn = Boolean(state.currentUser);

  elements.navLoginButton.textContent = isLoggedIn ? "Session" : "Login";
  elements.authBanner.textContent = isLoggedIn
    ? `Logged in as ${state.currentUser.name}. Any academy you add is visible only for this session and still adapts around the user's live location.`
    : "Login to add a session-only academy. Nothing here is stored permanently.";
  elements.academySubmitButton.textContent = isLoggedIn
    ? "Add session academy"
    : "Login to add academy";
  updateAuthModalView();
}

function openAuthModal({ returnTarget = null } = {}) {
  state.authReturnTarget = returnTarget;
  closeDetailsModal();
  clearAuthErrors();
  setAuthStatus("Your login stays temporary and disappears on refresh.", "neutral");
  updateAuthModalView();
  elements.authModalShell.setAttribute("aria-hidden", "false");
  syncBodyModalState();

  window.requestAnimationFrame(() => {
    if (state.currentUser) {
      elements.authContinueButton.focus();
      return;
    }

    elements.authForm.elements.email?.focus();
  });
}

function closeAuthModal() {
  elements.authModalShell.setAttribute("aria-hidden", "true");
  state.authReturnTarget = null;
  syncBodyModalState();
}

function renderDataViews() {
  renderDatalists();
  renderHeroStats();
  renderDashboardMetrics();
  renderHeroSportsGrid();
  renderHeroSpotlight();
  renderFeaturedGrid();
  renderCategoryChips();
}

function closeMenu() {
  elements.menuToggle.classList.remove("is-open");
  elements.siteNav.classList.remove("is-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
}

function initializeRevealObserver() {
  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    document
      .querySelectorAll("[data-reveal]")
      .forEach((element) => element.classList.add("is-visible"));
    return;
  }

  state.revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        state.revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18
    }
  );

  observeRevealElements();
}

function observeRevealElements(scope = document) {
  const revealItems = scope.querySelectorAll("[data-reveal]");

  revealItems.forEach((item) => {
    if (item.dataset.revealBound === "true") {
      return;
    }

    item.dataset.revealBound = "true";

    if (!state.revealObserver) {
      item.classList.add("is-visible");
      return;
    }

    state.revealObserver.observe(item);
  });
}

function initializeSectionObserver() {
  if (!("IntersectionObserver" in window)) {
    return;
  }

  const observedSections = document.querySelectorAll(
    "#home, #featured, #explore, #map, #add-academy"
  );

  state.sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        elements.bottomNavLinks.forEach((link) => {
          link.classList.toggle(
            "is-active",
            link.dataset.navTarget === entry.target.id
          );
        });
      });
    },
    {
      rootMargin: "-42% 0px -42% 0px",
      threshold: 0
    }
  );

  observedSections.forEach((section) => state.sectionObserver.observe(section));
}

function createFallbackResultFromPreset(preset, filters, index) {
  const query = filters.sport && preset.key === "all"
    ? buildDiscoveryQuery(filters)
    : preset.searchQuery;
  const name = preset.key === "all"
    ? `${toTitleCase(query)} near you`
    : `${preset.label} coaching near you`;
  const locationLabel = filters.location || state.autoLocationLabel || "your live location";
  const googleMapsUrl = buildGoogleMapsSearchUrl(query);

  return {
    id: `search-${preset.key}-${index}`,
    name,
    sport: preset.label === "All Sports" ? getActivePreset(filters).label : preset.label,
    locationLabel,
    description: `Open a live Google Maps search for ${query} around ${locationLabel}. This card updates from the user's location instead of fixed city data.`,
    distanceLabel: "Live Google Maps search",
    metaLabel: "Google Maps live",
    googleMapsUrl,
    embedUrl: buildGoogleMapsEmbedUrl(query),
    query,
    source: "google-maps-search"
  };
}

function buildFallbackResults(filters = getCurrentFilters()) {
  const activePreset = getActivePreset(filters);
  const relatedPresets = filters.sport
    ? [
        activePreset,
        ...SPORT_PRESETS.filter(
          (preset) =>
            preset.key !== "all" &&
            normalizeText(preset.label) !== normalizeText(activePreset.label)
        ).slice(0, 3)
      ]
    : SPORT_PRESETS.slice(0, 5);

  return relatedPresets.map((preset, index) =>
    createFallbackResultFromPreset(preset, filters, index)
  );
}

function sortResultsByDistance(results) {
  return [...results].sort((left, right) => {
    const leftDistance =
      typeof left.distanceKm === "number" ? left.distanceKm : Number.MAX_SAFE_INTEGER;
    const rightDistance =
      typeof right.distanceKm === "number" ? right.distanceKm : Number.MAX_SAFE_INTEGER;

    return leftDistance - rightDistance;
  });
}

function normalizeGooglePlace(place, filters) {
  const coordinates = place.location
    ? {
        lat: place.location.latitude,
        lng: place.location.longitude
      }
    : null;
  const activePreset = getActivePreset(filters);
  const displayName =
    typeof place.displayName === "string"
      ? place.displayName
      : place.displayName?.text || "Nearby coaching centre";
  const locationLabel = place.formattedAddress || "Google Maps listing";
  const distanceKm =
    state.userCoordinates && coordinates
      ? haversineKm(state.userCoordinates, coordinates)
      : null;

  return {
    id: place.id || displayName,
    name: displayName,
    sport: activePreset.label,
    locationLabel,
    description: `Live Google Maps result for ${buildDiscoveryQuery(
      filters
    )}. Results refresh around the user's current location instead of fixed coordinates.`,
    distanceKm,
    metaLabel:
      typeof place.rating === "number"
        ? `${place.rating.toFixed(1)} rating`
        : "Google Maps live",
    googleMapsUrl:
      place.googleMapsUri || buildGoogleMapsSearchUrl(`${displayName} ${locationLabel}`),
    embedUrl: coordinates
      ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15&output=embed`
      : buildGoogleMapsEmbedUrl(`${displayName} ${locationLabel}`),
    coordinates,
    query: buildDiscoveryQuery(filters),
    source: "google-places"
  };
}

async function fetchGooglePlacesResults(filters) {
  if (!GOOGLE_MAPS_API_KEY || !state.userCoordinates) {
    return [];
  }

  const requestBody = {
    textQuery: buildDiscoveryQuery(filters),
    maxResultCount: 8,
    locationBias: {
      circle: {
        center: {
          latitude: state.userCoordinates.lat,
          longitude: state.userCoordinates.lng
        },
        radius: DEFAULT_SEARCH_RADIUS_METERS
      }
    }
  };

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Google Places request failed with ${response.status}`);
  }

  const payload = await response.json();
  const places = Array.isArray(payload.places) ? payload.places : [];

  return sortResultsByDistance(
    places.map((place) => normalizeGooglePlace(place, filters))
  );
}

async function refreshLiveDiscovery() {
  renderMapEmbed(state.activeMapUrl);

  if (!state.userCoordinates) {
    state.liveResults = [];
    state.selectedResultId = null;
    state.activeMapUrl = "";
    renderDataViews();
    renderResults();
    updateResultsCopy();
    renderMapEmbed("");
    return;
  }

  const filters = getCurrentFilters();
  const searchQuery = buildDiscoveryQuery(filters);
  const searchId = ++state.pendingSearchId;

  elements.searchFeedback.textContent = GOOGLE_MAPS_API_KEY
    ? `Searching Google Places for "${searchQuery}" around your live location.`
    : `Updating Google Maps discovery for "${searchQuery}" around your live location.`;

  let liveResults = [];
  let nextMode = "google-maps-live";

  if (GOOGLE_MAPS_API_KEY) {
    try {
      liveResults = await fetchGooglePlacesResults(filters);
      nextMode = "google-places";
    } catch (error) {
      console.error(error);
      nextMode = "google-maps-live";
    }
  }

  if (searchId !== state.pendingSearchId) {
    return;
  }

  if (!liveResults.length) {
    liveResults = buildFallbackResults(filters);
  }

  state.dataMode = nextMode;
  state.liveResults = [...state.sessionAcademies, ...liveResults];

  if (!state.liveResults.some((result) => result.id === state.selectedResultId)) {
    state.selectedResultId = state.liveResults[0]?.id || null;
  }

  state.activeMapUrl =
    buildResultEmbedUrl(getResultById(state.selectedResultId) || {
      query: searchQuery
    }) || buildGoogleMapsEmbedUrl(searchQuery);

  renderDataViews();
  renderResults();
  updateResultsCopy();
  renderMapEmbed(state.activeMapUrl);
}

function stopLiveLocation({ clearDisplayedLocation = true } = {}) {
  if (state.geolocationWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.geolocationWatchId);
  }

  const shouldClearAutoLocation =
    clearDisplayedLocation &&
    state.autoLocationLabel &&
    normalizeText(elements.locationInput.value) ===
      normalizeText(state.autoLocationLabel);

  state.geolocationWatchId = null;
  state.locationAccuracy = null;

  if (shouldClearAutoLocation) {
    elements.locationInput.value = "";
  }

  updateLocateButtonLabel();
}

function handleLiveLocationSuccess(coordinates, accuracy, source = "watch") {
  const previousAutoLocationLabel = state.autoLocationLabel;
  state.userCoordinates = coordinates;
  state.locationAccuracy = accuracy || null;
  state.autoLocationLabel = `Live area: ${formatCoordinateLabel(coordinates)}`;

  if (
    !elements.locationInput.value.trim() ||
    (previousAutoLocationLabel &&
      normalizeText(elements.locationInput.value) ===
        normalizeText(previousAutoLocationLabel))
  ) {
    elements.locationInput.value = state.autoLocationLabel;
  }

  setGeoStatus(
    source === "quick"
      ? `Using a quick nearby fix around ${formatCoordinateLabel(
          coordinates
        )}. Refining your live location in the background.`
      : source === "cached"
        ? `Using your last known area around ${formatCoordinateLabel(
            coordinates
          )} while refreshing live location.`
        : `Using live device coordinates around ${formatCoordinateLabel(
            coordinates
          )}. Google Maps discovery now refreshes around the user's location.`,
    "success"
  );
  updateLocateButtonLabel();
  refreshLiveDiscovery();
}

function handleQuickGeolocationSuccess(position) {
  handleLiveLocationSuccess(
    {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    },
    position.coords.accuracy,
    "quick"
  );
}

function handleWatchGeolocationSuccess(position) {
  handleLiveLocationSuccess(
    {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    },
    position.coords.accuracy,
    "watch"
  );
}

function handleGeolocationError(error, context = "watch") {
  let message =
    "Location access is unavailable right now. The app cannot build live nearby discovery without it.";

  if (error && error.code === 1) {
    message =
      "Location permission was denied. This version only works correctly when it can read the user's live location.";
  }

  if (error && error.code === 3) {
    message =
      "Location lookup timed out. Try again so the app can rebuild around the user's current coordinates.";
  }

  if (context === "quick") {
    if (error && error.code === 1) {
      stopLiveLocation({ clearDisplayedLocation: true });
      setGeoStatus(message, "error");
      refreshLiveDiscovery();
      return;
    }

    setGeoStatus(
      "Fast location lookup took too long. Still trying to lock onto your live location...",
      "pending"
    );
    return;
  }

  if (error && error.code === 3 && state.userCoordinates) {
    setGeoStatus(
      "Using your last known area while waiting for the next live location update...",
      "neutral"
    );
    return;
  }

  stopLiveLocation({ clearDisplayedLocation: true });
  setGeoStatus(message, "error");
  refreshLiveDiscovery();
}

function requestUserLocation() {
  if (MOCK_COORDINATES) {
    return;
  }

  if (!navigator.geolocation) {
    setGeoStatus(
      "This browser does not support geolocation. Live nearby discovery needs device location access.",
      "error"
    );
    return;
  }

  if (state.geolocationWatchId !== null) {
    stopLiveLocation({ clearDisplayedLocation: false });
    setGeoStatus(
      "Live location paused. Tap Use my location to resume Google Maps discovery.",
      "neutral"
    );
    return;
  }

  if (state.userCoordinates) {
    handleLiveLocationSuccess(
      state.userCoordinates,
      state.locationAccuracy,
      "cached"
    );
  } else {
    setGeoStatus(
      "Getting a quick nearby fix and rebuilding Google Maps discovery around it...",
      "pending"
    );
  }

  navigator.geolocation.getCurrentPosition(
    handleQuickGeolocationSuccess,
    (error) => handleGeolocationError(error, "quick"),
    QUICK_GEO_OPTIONS
  );

  state.geolocationWatchId = navigator.geolocation.watchPosition(
    handleWatchGeolocationSuccess,
    (error) => handleGeolocationError(error, "watch"),
    LIVE_GEO_OPTIONS
  );
  updateLocateButtonLabel();
}

async function initializeLiveLocation() {
  if (MOCK_COORDINATES) {
    handleLiveLocationSuccess(MOCK_COORDINATES, 12);
    return;
  }

  if (!navigator.geolocation) {
    setGeoStatus(
      "This browser does not support geolocation. Live nearby discovery needs device location access.",
      "error"
    );
    return;
  }

  try {
    if (!navigator.permissions || !navigator.permissions.query) {
      setGeoStatus(
        "Tap Use my location to let CoachNestly rebuild everything around the user's live location.",
        "neutral"
      );
      return;
    }

    const permissionStatus = await navigator.permissions.query({
      name: "geolocation"
    });

    if (permissionStatus.state === "granted") {
      requestUserLocation();
      return;
    }

    if (permissionStatus.state === "denied") {
      setGeoStatus(
        "Location is blocked in this browser. Enable location for this site, then tap Use my location again.",
        "error"
      );
      return;
    }

    setGeoStatus(
      "Tap Use my location to allow live nearby discovery around the user's current coordinates.",
      "neutral"
    );
  } catch (error) {
    setGeoStatus(
      "Tap Use my location to let CoachNestly rebuild everything around the user's live location.",
      "neutral"
    );
  }
}

function validateAuthForm(values) {
  const errors = {};

  if (values.name.length < 2) {
    errors.name = "Enter your name to start a temporary session.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (values.password.length < 6) {
    errors.password = "Password should be at least 6 characters.";
  }

  return errors;
}

function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthErrors();

  const values = {
    name: elements.authForm.elements.name.value.trim(),
    email: elements.authForm.elements.email.value.trim().toLowerCase(),
    password: elements.authForm.elements.password.value.trim()
  };

  const errors = validateAuthForm(values);

  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([fieldName, message]) => {
      setAuthFieldError(fieldName, message);
    });
    setAuthStatus("Fix the highlighted fields to create a temporary session.", "error");
    return;
  }

  const returnTarget = state.authReturnTarget;

  state.currentUser = {
    name: toTitleCase(values.name),
    email: values.email
  };

  updateAuthUI();
  setAuthStatus(`Temporary session started as ${state.currentUser.name}.`, "success");
  setFormStatus(
    "You are logged in for this tab only. Any academy you add remains session-only.",
    "success"
  );
  closeAuthModal();

  if (returnTarget === "academy") {
    document.querySelector("#add-academy").scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
    window.requestAnimationFrame(() => {
      elements.academyForm.elements.name.focus();
    });
  }
}

function handleLogout() {
  state.currentUser = null;
  elements.authForm.reset();
  clearAuthErrors();
  updateAuthUI();
  setAuthStatus("Temporary session cleared.", "neutral");
  setFormStatus(
    "Login to add a session-only academy. Nothing is stored permanently.",
    "neutral"
  );
  closeAuthModal();
}

function validateAcademyForm(values) {
  const errors = {};

  if (values.name.length < 3) {
    errors.name = "Enter an academy name with at least 3 characters.";
  }

  if (values.sport.length < 3) {
    errors.sport = "Enter a sport so live search can classify the academy.";
  }

  if (values.location.length < 2) {
    errors.location = "Enter a valid area or neighbourhood.";
  }

  const contactPattern = /^(\+?\d[\d\s-]{7,}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

  if (!contactPattern.test(values.contact)) {
    errors.contact = "Enter a valid phone number or email address.";
  }

  if (values.description.length < 20) {
    errors.description =
      "Description should be at least 20 characters so the listing is useful.";
  }

  return errors;
}

function buildSessionAcademyRecord(values) {
  const locationLabel = `${toTitleCase(values.location)} (session only)`;
  const searchQuery = `${values.name} ${values.location}`;

  return {
    id: `session-${Date.now()}`,
    name: toTitleCase(values.name),
    sport: toTitleCase(values.sport),
    locationLabel,
    description: `${values.description} This academy is visible only in the current session and is not stored permanently.`,
    distanceKm: state.userCoordinates
      ? haversineKm(state.userCoordinates, state.userCoordinates)
      : null,
    metaLabel: "Session only",
    googleMapsUrl: buildGoogleMapsSearchUrl(searchQuery),
    embedUrl: buildGoogleMapsEmbedUrl(searchQuery),
    query: searchQuery,
    source: "session-academy",
    contactHref: getContactHref(values.contact),
    contact: values.contact
  };
}

function handleAcademySubmit(event) {
  event.preventDefault();
  clearFormErrors();

  if (!state.currentUser) {
    setFormStatus("Login first. Added academies are temporary and tied to this session only.", "error");
    openAuthModal({ returnTarget: "academy" });
    return;
  }

  const values = {
    name: elements.academyForm.elements.name.value.trim(),
    sport: elements.academyForm.elements.sport.value.trim(),
    location: elements.academyForm.elements.location.value.trim(),
    contact: elements.academyForm.elements.contact.value.trim(),
    description: elements.academyForm.elements.description.value.trim()
  };

  const errors = validateAcademyForm(values);

  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([fieldName, message]) => {
      setFieldError(fieldName, message);
    });
    setFormStatus("Fix the highlighted fields and try again.", "error");
    return;
  }

  const academyRecord = buildSessionAcademyRecord(values);

  state.sessionAcademies = [academyRecord, ...state.sessionAcademies];
  elements.academyForm.reset();
  state.selectedResultId = academyRecord.id;
  setFormStatus(
    `${academyRecord.name} is live in this session only and will disappear on refresh.`,
    "success"
  );
  refreshLiveDiscovery();
  focusResult(academyRecord.id, { scrollToMap: true });
  openDetailsModal(academyRecord.id);
}

function bindEvents() {
  elements.menuToggle.addEventListener("click", () => {
    const isOpen = elements.menuToggle.classList.toggle("is-open");
    elements.siteNav.classList.toggle("is-open", isOpen);
    elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  elements.siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  elements.navLoginButton.addEventListener("click", () => {
    closeMenu();
    openAuthModal();
  });

  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshLiveDiscovery();
    document.querySelector("#explore").scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  });

  elements.sportInput.addEventListener("input", () => {
    refreshLiveDiscovery();
  });

  elements.locationInput.addEventListener("input", () => {
    refreshLiveDiscovery();
  });

  elements.clearFilters.addEventListener("click", () => {
    elements.searchForm.reset();

    if (state.autoLocationLabel) {
      elements.locationInput.value = state.autoLocationLabel;
    }

    state.selectedResultId = null;
    setGeoStatus(
      state.userCoordinates
        ? "Filters cleared. Discovery reset around the user's current live location."
        : "Filters cleared. Live location is still required to rebuild the experience.",
      "neutral"
    );
    refreshLiveDiscovery();
  });

  elements.locateMeButton.addEventListener("click", requestUserLocation);

  elements.categoryChips.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-sport-chip]");

    if (!chip) {
      return;
    }

    elements.sportInput.value = chip.dataset.sportChip || "";
    refreshLiveDiscovery();
  });

  elements.heroSpotlight.addEventListener("click", (event) => {
    const action = event.target.closest("[data-spotlight-action]");

    if (!action) {
      return;
    }

    const resultId = action.dataset.resultId;

    if (action.dataset.spotlightAction === "focus") {
      focusResult(resultId, { scrollToMap: true });
      return;
    }

    openDetailsModal(resultId);
  });

  elements.featuredGrid.addEventListener("click", (event) => {
    const action = event.target.closest("[data-featured-action]");

    if (!action) {
      return;
    }

    focusResult(action.dataset.resultId, { scrollToMap: true });
  });

  elements.resultsGrid.addEventListener("click", (event) => {
    const action = event.target.closest("[data-card-action]");

    if (action) {
      const resultId = action.dataset.resultId;

      if (action.dataset.cardAction === "details") {
        openDetailsModal(resultId);
        return;
      }

      focusResult(resultId, { scrollToMap: true });
      return;
    }

    const card = event.target.closest("[data-card-id]");

    if (!card) {
      return;
    }

    focusResult(card.dataset.cardId, { scrollToMap: true });
  });

  elements.resultsGrid.addEventListener("keydown", (event) => {
    const card = event.target.closest("[data-card-id]");

    if (!card || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    focusResult(card.dataset.cardId, { scrollToMap: true });
  });

  elements.resetMapView.addEventListener("click", () => {
    state.selectedResultId = state.liveResults[0]?.id || null;
    state.activeMapUrl = buildGoogleMapsEmbedUrl(buildDiscoveryQuery());
    renderResults();
    renderMapEmbed(state.activeMapUrl);
    updateResultsCopy();
  });

  elements.modalBackdrop.addEventListener("click", closeDetailsModal);
  elements.closeModal.addEventListener("click", closeDetailsModal);
  elements.modalDone.addEventListener("click", closeDetailsModal);
  elements.authBackdrop.addEventListener("click", closeAuthModal);
  elements.closeAuthModal.addEventListener("click", closeAuthModal);
  elements.authContinueButton.addEventListener("click", closeAuthModal);
  elements.authLogoutButton.addEventListener("click", handleLogout);
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.academyForm.addEventListener("submit", handleAcademySubmit);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (elements.authModalShell.getAttribute("aria-hidden") === "false") {
      closeAuthModal();
      return;
    }

    if (elements.modalShell.getAttribute("aria-hidden") === "false") {
      closeDetailsModal();
    }
  });
}

function initializeApp() {
  renderDataViews();
  renderResults();
  updateResultsCopy();
  updateAuthUI();
  updateLocateButtonLabel();
  initializeRevealObserver();
  initializeSectionObserver();
  bindEvents();
  setAuthStatus("Temporary session only. Refreshing clears login.", "neutral");
  setFormStatus(
    "Added academies live only in this session and are never stored permanently.",
    "neutral"
  );
  setGeoStatus(
    "The app now rebuilds everything from the user's live location instead of fixed city data.",
    "neutral"
  );
  renderMapEmbed("");
  initializeLiveLocation();
}

initializeApp();
