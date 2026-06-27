import {
  compareAcademies,
  getAssistantReply,
  recommendAcademies,
  suggestSportsFromQuiz
} from "./modules/ai.js";
import {
  buildAcademyCollection,
  buildAdminAcademy,
  buildAdminOverride,
  buildSearchIndex,
  buildUserAcademy,
  filterAcademies,
  findAcademyById,
  inferNearestLocation,
  loadAppData,
  sortFilteredAcademies
} from "./modules/data-service.js";
import { storage } from "./modules/storage.js";
import {
  academyCardTemplate,
  adminMetricTemplate,
  adminRowTemplate,
  categoryChipTemplate,
  chatBubbleTemplate,
  coachTemplate,
  comparisonTemplate,
  dashboardMetricTemplate,
  emptyMiniStateTemplate,
  featuredCardTemplate,
  heroStatTemplate,
  legendCardTemplate,
  mapMarkerTemplate,
  metricCardTemplate,
  miniCardTemplate,
  newsTemplate,
  onboardingPreviewTemplate,
  quizResultTemplate,
  recommendationTemplate,
  reviewTemplate,
  spotlightTemplate,
  sportTileTemplate,
  stackCardTemplate,
  starButtonsTemplate,
  testimonialTemplate
} from "./modules/ui.js";
import {
  debounce,
  normalizeText,
  safeArray,
  toTitleCase,
  unique
} from "./modules/utils.js";

const elements = {
  body: document.body,
  menuToggle: document.querySelector("#menuToggle"),
  siteNav: document.querySelector("#siteNav"),
  themeToggle: document.querySelector("#themeToggle"),
  authTrigger: document.querySelector("#authTrigger"),
  searchForm: document.querySelector("#searchForm"),
  sportInput: document.querySelector("#sportInput"),
  locationInput: document.querySelector("#locationInput"),
  intentInput: document.querySelector("#intentInput"),
  sportSuggestions: document.querySelector("#sportSuggestions"),
  locationSuggestions: document.querySelector("#locationSuggestions"),
  useNearby: document.querySelector("#useNearby"),
  openQuizShortcut: document.querySelector("#openQuizShortcut"),
  clearFilters: document.querySelector("#clearFilters"),
  searchFeedback: document.querySelector("#searchFeedback"),
  geoStatus: document.querySelector("#geoStatus"),
  heroStats: document.querySelector("#heroStats"),
  dashboardMetrics: document.querySelector("#dashboardMetrics"),
  heroSportsGrid: document.querySelector("#heroSportsGrid"),
  heroSpotlight: document.querySelector("#heroSpotlight"),
  metricsGrid: document.querySelector("#metricsGrid"),
  featuredRail: document.querySelector("#featuredRail"),
  featuredIndicators: document.querySelector("#featuredIndicators"),
  featuredPrev: document.querySelector("#featuredPrev"),
  featuredNext: document.querySelector("#featuredNext"),
  topRatedGrid: document.querySelector("#topRatedGrid"),
  trendingSportsGrid: document.querySelector("#trendingSportsGrid"),
  resultsSummary: document.querySelector("#resultsSummary"),
  resultsCount: document.querySelector("#resultsCount"),
  matchMode: document.querySelector("#matchMode"),
  categoryChips: document.querySelector("#categoryChips"),
  mapStatusLabel: document.querySelector("#mapStatusLabel"),
  mapMarkers: document.querySelector("#mapMarkers"),
  mapFocusTitle: document.querySelector("#mapFocusTitle"),
  mapHelper: document.querySelector("#mapHelper"),
  mapPrimaryAction: document.querySelector("#mapPrimaryAction"),
  mapLegend: document.querySelector("#mapLegend"),
  resetMapView: document.querySelector("#resetMapView"),
  comparisonTray: document.querySelector("#comparisonTray"),
  compareCountLabel: document.querySelector("#compareCountLabel"),
  openComparisonFromTray: document.querySelector("#openComparisonFromTray"),
  resultsSkeleton: document.querySelector("#resultsSkeleton"),
  resultsGrid: document.querySelector("#resultsGrid"),
  emptyState: document.querySelector("#emptyState"),
  favoritesGrid: document.querySelector("#favoritesGrid"),
  recentGrid: document.querySelector("#recentGrid"),
  recommendationForm: document.querySelector("#recommendationForm"),
  recommendationResult: document.querySelector("#recommendationResult"),
  quizForm: document.querySelector("#quizForm"),
  quizResult: document.querySelector("#quizResult"),
  compareSelectA: document.querySelector("#compareSelectA"),
  compareSelectB: document.querySelector("#compareSelectB"),
  compareButton: document.querySelector("#compareButton"),
  comparisonOutput: document.querySelector("#comparisonOutput"),
  chatFeed: document.querySelector("#chatFeed"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  testimonialsGrid: document.querySelector("#testimonialsGrid"),
  newsGrid: document.querySelector("#newsGrid"),
  newsletterForm: document.querySelector("#newsletterForm"),
  newsletterEmail: document.querySelector("#newsletterEmail"),
  newsletterStatus: document.querySelector("#newsletterStatus"),
  downloadIos: document.querySelector("#downloadIos"),
  downloadAndroid: document.querySelector("#downloadAndroid"),
  onboardingStepper: document.querySelector("#onboardingStepper"),
  academyOnboardingForm: document.querySelector("#academyOnboardingForm"),
  wizardBack: document.querySelector("#wizardBack"),
  wizardSaveDraft: document.querySelector("#wizardSaveDraft"),
  academySubmitButton: document.querySelector("#academySubmitButton"),
  formStatus: document.querySelector("#formStatus"),
  onboardingPreview: document.querySelector("#onboardingPreview"),
  adminMetrics: document.querySelector("#adminMetrics"),
  adminAcademyRows: document.querySelector("#adminAcademyRows"),
  adminAcademyForm: document.querySelector("#adminAcademyForm"),
  adminName: document.querySelector("#adminName"),
  adminSport: document.querySelector("#adminSport"),
  adminLocation: document.querySelector("#adminLocation"),
  adminFees: document.querySelector("#adminFees"),
  adminDescription: document.querySelector("#adminDescription"),
  adminStatus: document.querySelector("#adminStatus"),
  adminCreateAcademy: document.querySelector("#adminCreateAcademy"),
  adminLoadSubmission: document.querySelector("#adminLoadSubmission"),
  adminResetForm: document.querySelector("#adminResetForm"),
  detailModal: document.querySelector("#detailModal"),
  detailBackdrop: document.querySelector("#detailBackdrop"),
  closeDetailModal: document.querySelector("#closeDetailModal"),
  detailBadge: document.querySelector("#detailBadge"),
  detailTitle: document.querySelector("#detailTitle"),
  detailDescription: document.querySelector("#detailDescription"),
  detailGallery: document.querySelector("#detailGallery"),
  detailSport: document.querySelector("#detailSport"),
  detailLocation: document.querySelector("#detailLocation"),
  detailRating: document.querySelector("#detailRating"),
  detailFees: document.querySelector("#detailFees"),
  detailTimings: document.querySelector("#detailTimings"),
  detailFacilities: document.querySelector("#detailFacilities"),
  detailCoaches: document.querySelector("#detailCoaches"),
  detailReviewSummary: document.querySelector("#detailReviewSummary"),
  detailReviews: document.querySelector("#detailReviews"),
  detailContactPrimary: document.querySelector("#detailContactPrimary"),
  detailEmailLink: document.querySelector("#detailEmailLink"),
  detailWhatsAppLink: document.querySelector("#detailWhatsAppLink"),
  detailMapLink: document.querySelector("#detailMapLink"),
  favoriteToggle: document.querySelector("#favoriteToggle"),
  reviewForm: document.querySelector("#reviewForm"),
  reviewTitle: document.querySelector("#reviewTitle"),
  reviewBody: document.querySelector("#reviewBody"),
  reviewStatus: document.querySelector("#reviewStatus"),
  reviewStars: document.querySelector("#reviewStars"),
  authModal: document.querySelector("#authModal"),
  authBackdrop: document.querySelector("#authBackdrop"),
  closeAuthModal: document.querySelector("#closeAuthModal"),
  authModalTitle: document.querySelector("#authModalTitle"),
  authModalDescription: document.querySelector("#authModalDescription"),
  authModeSignup: document.querySelector("#authModeSignup"),
  authModeLogin: document.querySelector("#authModeLogin"),
  authForm: document.querySelector("#authForm"),
  authName: document.querySelector("#authName"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmitButton: document.querySelector("#authSubmitButton"),
  authStatus: document.querySelector("#authStatus"),
  authSessionPanel: document.querySelector("#authSessionPanel"),
  authSessionName: document.querySelector("#authSessionName"),
  authSessionMeta: document.querySelector("#authSessionMeta"),
  authContinueButton: document.querySelector("#authContinueButton"),
  authLogoutButton: document.querySelector("#authLogoutButton"),
  toastStack: document.querySelector("#toastStack"),
  bottomNavLinks: document.querySelectorAll(".bottom-nav a"),
  revealNodes: document.querySelectorAll("[data-reveal]")
};

const wizardLabels = ["Basics", "Operations", "Media & contact", "Review"];

const state = {
  appData: null,
  academies: [],
  searchIndex: {
    sports: [],
    locations: [],
    academyNames: []
  },
  currentResults: [],
  selectedAcademyId: null,
  currentUser: storage.readCurrentUser(),
  favorites: [],
  recents: [],
  reviewsByAcademy: storage.readReviews(),
  settings: storage.readSettings(),
  authMode: "signup",
  reviewRating: 5,
  compareIds: [],
  onboardingStep: 1,
  chatMessages: [],
  featuredIndex: 0,
  adminSelectionId: null,
  searchRenderTimer: null
};

function setStatus(element, message, tone = "neutral") {
  element.textContent = message;
  element.classList.remove("is-success", "is-error", "is-pending", "is-neutral", "is-info");
  element.classList.add(`is-${tone}`);
}

function showToast(message, tone = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function syncBodyModalState() {
  const detailOpen = elements.detailModal.getAttribute("aria-hidden") === "false";
  const authOpen = elements.authModal.getAttribute("aria-hidden") === "false";
  elements.body.classList.toggle("modal-open", detailOpen || authOpen);
}

function openModal(shell) {
  shell.setAttribute("aria-hidden", "false");
  syncBodyModalState();
}

function closeModal(shell) {
  shell.setAttribute("aria-hidden", "true");
  syncBodyModalState();
}

function applyTheme(theme, shouldPersist = true) {
  elements.body.dataset.theme = theme;
  elements.themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";

  if (shouldPersist) {
    storage.writeSettings({
      ...state.settings,
      theme
    });
    state.settings.theme = theme;
  }
}

function hydrateScopedCollections() {
  state.favorites = storage.readFavorites(state.currentUser);
  state.recents = storage.readRecents(state.currentUser);
}

function getCurrentFilters() {
  return {
    sport: elements.sportInput.value.trim(),
    location: elements.locationInput.value.trim(),
    intent: elements.intentInput.value
  };
}

function persistFilters() {
  storage.writeSettings({
    ...state.settings,
    lastFilters: state.filters
  });
  state.settings.lastFilters = state.filters;
}

function seedSkeletons() {
  elements.resultsSkeleton.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton-card"></div>').join("");
}

function initializeRevealObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18
    }
  );

  elements.revealNodes.forEach((node) => observer.observe(node));
}

function initializeSectionObserver() {
  const sectionIds = ["home", "discover", "ai-lab", "add-academy", "admin"];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        elements.bottomNavLinks.forEach((link) => {
          link.classList.toggle("is-active", link.dataset.navTarget === entry.target.id);
        });
      });
    },
    {
      threshold: 0.4
    }
  );

  sectionIds.forEach((sectionId) => {
    const section = document.querySelector(`#${sectionId}`);

    if (section) {
      observer.observe(section);
    }
  });
}

function closeMenu() {
  elements.siteNav.classList.remove("is-open");
  elements.menuToggle.classList.remove("is-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
}

function refreshAcademyCollection() {
  // Every derived product surface reads from the same resolved academy collection.
  state.academies = buildAcademyCollection({
    reviewsByAcademy: state.reviewsByAcademy,
    userAcademies: storage.readUserAcademies(),
    adminOverrides: storage.readAdminOverrides()
  });
  state.searchIndex = buildSearchIndex(state.academies, state.appData.cities);
}

function renderHeroStats() {
  elements.heroStats.innerHTML = state.appData.heroStats.map(heroStatTemplate).join("");
}

function renderMetrics() {
  elements.metricsGrid.innerHTML = state.appData.metrics.map(metricCardTemplate).join("");
}

function renderDashboard() {
  elements.dashboardMetrics.innerHTML = state.appData.dashboardMetrics
    .map(dashboardMetricTemplate)
    .join("");
}

function renderSportControls() {
  const activeSport = normalizeText(state.filters.sport);

  elements.heroSportsGrid.innerHTML = state.appData.trendingSports
    .map((item) => sportTileTemplate(item, activeSport === normalizeText(item.sport)))
    .join("");

  elements.trendingSportsGrid.innerHTML = state.appData.trendingSports
    .map((item) => sportTileTemplate(item, activeSport === normalizeText(item.sport)))
    .join("");

  elements.categoryChips.innerHTML = unique(state.academies.map((academy) => academy.sport))
    .sort()
    .map((sport) => categoryChipTemplate(sport, normalizeText(sport) === activeSport))
    .join("");
}

function renderTestimonials() {
  elements.testimonialsGrid.innerHTML = state.appData.testimonials.map(testimonialTemplate).join("");
}

function renderNews() {
  elements.newsGrid.innerHTML = state.appData.news.map(newsTemplate).join("");
}

function getFeaturedAcademies() {
  return state.academies.filter((academy) => academy.featured);
}

function renderFeatured() {
  const featuredAcademies = getFeaturedAcademies();

  elements.featuredRail.innerHTML = featuredAcademies
    .map((academy) => featuredCardTemplate(academy, state.favorites.includes(academy.id)))
    .join("");
  elements.featuredIndicators.innerHTML = featuredAcademies
    .map(
      (_, index) => `
        <button
          class="carousel-dot${index === state.featuredIndex ? " is-active" : ""}"
          type="button"
          data-action="featured-dot"
          data-index="${index}"
          aria-label="Go to featured academy ${index + 1}"
        ></button>
      `
    )
    .join("");
}

function updateFeaturedPosition(index) {
  const featuredAcademies = getFeaturedAcademies();

  if (!featuredAcademies.length) {
    return;
  }

  state.featuredIndex = ((index % featuredAcademies.length) + featuredAcademies.length) % featuredAcademies.length;
  renderFeatured();
  elements.featuredRail.children[state.featuredIndex]?.scrollIntoView({
    behavior: "smooth",
    inline: "start",
    block: "nearest"
  });
}

function renderTopRated() {
  const candidates = state.currentResults.length ? state.currentResults : state.academies;
  const topRated = [...candidates].sort((left, right) => right.rating - left.rating).slice(0, 3);
  elements.topRatedGrid.innerHTML = topRated.map(stackCardTemplate).join("");
}

function getSelectedAcademy() {
  return findAcademyById(state.academies, state.selectedAcademyId) || state.currentResults[0] || null;
}

function renderHeroSpotlight() {
  elements.heroSpotlight.innerHTML = spotlightTemplate(getSelectedAcademy());
}

function renderResultsSummary() {
  const resultCount = state.currentResults.length;
  const sport = state.filters.sport || "all sports";
  const location = state.filters.location || "all cities";
  elements.resultsCount.textContent = `${resultCount} ${resultCount === 1 ? "academy" : "academies"}`;
  elements.matchMode.textContent = state.appData.intentCopy[state.filters.intent] || state.appData.intentCopy.all;
  elements.resultsSummary.textContent = `Showing ${resultCount} result${
    resultCount === 1 ? "" : "s"
  } for ${sport} in ${location}.`;

  if (!resultCount) {
    elements.searchFeedback.textContent =
      "No academies match the current combination yet. Try widening the location or use the AI quiz.";
    return;
  }

  elements.searchFeedback.textContent =
    "Discovery updated instantly with save, compare, review, and AI actions across every visible academy.";
}

function renderResultsGrid() {
  elements.resultsGrid.innerHTML = state.currentResults
    .map((academy) =>
      academyCardTemplate(academy, {
        isFavorite: state.favorites.includes(academy.id),
        isCompared: state.compareIds.includes(academy.id),
        isSelected: academy.id === state.selectedAcademyId
      })
    )
    .join("");

  elements.emptyState.hidden = Boolean(state.currentResults.length);
}

function renderMap() {
  const visibleAcademies = state.currentResults.slice(0, 6);
  const selectedAcademy = getSelectedAcademy();

  elements.mapMarkers.innerHTML = visibleAcademies
    .map((academy, index) => mapMarkerTemplate(academy, academy.id === selectedAcademy?.id, index))
    .join("");

  elements.mapLegend.innerHTML = visibleAcademies.map(legendCardTemplate).join("");

  if (!selectedAcademy) {
    elements.mapFocusTitle.textContent = "Pick an academy to focus the map";
    elements.mapHelper.textContent =
      "The map view is designed to connect directly to Google Maps or Mapbox once geocoding is wired in.";
    elements.mapPrimaryAction.removeAttribute("href");
    elements.mapStatusLabel.textContent = "No visible academies for the current search";
    return;
  }

  elements.mapFocusTitle.textContent = selectedAcademy.name;
  elements.mapHelper.textContent = `${selectedAcademy.locationLabel} • ${selectedAcademy.feeLabel} • ${selectedAcademy.rating.toFixed(
    1
  )} rating`;
  elements.mapPrimaryAction.href = selectedAcademy.contact.mapUrl;
  elements.mapStatusLabel.textContent = `Map preview centered on ${selectedAcademy.name}`;
}

function renderSavedRails() {
  const favoriteAcademies = state.favorites
    .map((academyId) => findAcademyById(state.academies, academyId))
    .filter(Boolean);
  const recentAcademies = state.recents
    .map((academyId) => findAcademyById(state.academies, academyId))
    .filter(Boolean);

  elements.favoritesGrid.innerHTML = favoriteAcademies.length
    ? favoriteAcademies.map((academy) => miniCardTemplate(academy, "Open saved")).join("")
    : emptyMiniStateTemplate(
        "No favorites yet",
        "Save academies to build a shortlist that persists across sessions."
      );

  elements.recentGrid.innerHTML = recentAcademies.length
    ? recentAcademies.map((academy) => miniCardTemplate(academy, "Continue")).join("")
    : emptyMiniStateTemplate(
        "No recent views yet",
        "Open academy profiles and they will appear here for quick return visits."
      );
}

function refreshSavedStateUi() {
  renderResultsGrid();
  renderSavedRails();
  renderFeatured();
  renderCompareSelects();
  renderAdminMetrics();

  if (state.selectedAcademyId && elements.detailModal.getAttribute("aria-hidden") === "false") {
    renderDetailModal(state.selectedAcademyId);
  }
}

function renderCompareState() {
  elements.comparisonTray.hidden = state.compareIds.length === 0;

  if (!state.compareIds.length) {
    return;
  }

  elements.compareCountLabel.textContent =
    state.compareIds.length === 1
      ? "Choose one more academy to run the comparison"
      : "Two academies selected and ready to compare";
}

function renderCompareSelects() {
  const optionsMarkup = state.academies
    .map(
      (academy) => `
        <option value="${academy.id}">
          ${academy.name} • ${academy.locationLabel}
        </option>
      `
    )
    .join("");

  elements.compareSelectA.innerHTML = `<option value="">Select academy A</option>${optionsMarkup}`;
  elements.compareSelectB.innerHTML = `<option value="">Select academy B</option>${optionsMarkup}`;

  if (state.compareIds[0]) {
    elements.compareSelectA.value = state.compareIds[0];
  }

  if (state.compareIds[1]) {
    elements.compareSelectB.value = state.compareIds[1];
  }
}

function renderChat() {
  elements.chatFeed.innerHTML = state.chatMessages.map(chatBubbleTemplate).join("");
  elements.chatFeed.scrollTop = elements.chatFeed.scrollHeight;
}

function seedChat() {
  state.chatMessages = [
    {
      role: "assistant",
      text: "Hi, I can help with beginner options, budget-friendly academies, top-rated programs, or sport suggestions."
    }
  ];
  renderChat();
}

function renderReviewStars() {
  elements.reviewStars.innerHTML = starButtonsTemplate(state.reviewRating);
}

function updateFavoriteButton() {
  const academy = getSelectedAcademy();
  if (!academy) {
    return;
  }

  elements.favoriteToggle.textContent = state.favorites.includes(academy.id) ? "Saved favorite" : "Save favorite";
}

function renderDetailModal(academyId) {
  const academy = findAcademyById(state.academies, academyId);

  if (!academy) {
    return;
  }

  state.selectedAcademyId = academy.id;
  elements.detailBadge.textContent = academy.featured ? "Featured academy" : "Academy details";
  elements.detailTitle.textContent = academy.name;
  elements.detailDescription.textContent = academy.description;
  elements.detailSport.textContent = academy.sport;
  elements.detailLocation.textContent = academy.locationLabel;
  elements.detailRating.textContent = `${academy.rating.toFixed(1)} / 5 from ${academy.reviewCount} review${
    academy.reviewCount === 1 ? "" : "s"
  }`;
  elements.detailFees.textContent = academy.feeLabel;
  elements.detailGallery.innerHTML = academy.images
    .map(
      (image) => `
        <div class="gallery-image">
          <img src="${image}" alt="${academy.name}" loading="lazy" />
        </div>
      `
    )
    .join("");
  elements.detailTimings.innerHTML = academy.batchTimings.map((timing) => `<span class="chip">${timing}</span>`).join("");
  elements.detailFacilities.innerHTML = academy.facilities.map((facility) => `<span class="chip">${facility}</span>`).join("");
  elements.detailCoaches.innerHTML = academy.coaches.map(coachTemplate).join("");

  const academyReviews = safeArray(state.reviewsByAcademy[academy.id]);
  elements.detailReviewSummary.innerHTML = `
    <span class="academy-card__rating">${academy.rating.toFixed(1)} / 5</span>
    <span>${academy.reviewCount} review${academy.reviewCount === 1 ? "" : "s"}</span>
  `;
  elements.detailReviews.innerHTML = academyReviews.length
    ? academyReviews
        .slice()
        .reverse()
        .map(reviewTemplate)
        .join("")
    : '<article class="review-card"><strong>No reviews yet</strong><p>Be the first parent or student to share feedback.</p></article>';

  elements.detailContactPrimary.href = academy.contact.website;
  elements.detailEmailLink.href = `mailto:${academy.contact.email}`;
  elements.detailWhatsAppLink.href = `https://wa.me/${String(academy.contact.whatsapp).replace(/[^\d]/g, "")}`;
  elements.detailMapLink.href = academy.contact.mapUrl;
  updateFavoriteButton();
  setStatus(
    elements.reviewStatus,
    state.currentUser
      ? `Reviewing as ${state.currentUser.name}.`
      : "Login as a parent or student to review an academy.",
    state.currentUser ? "success" : "neutral"
  );
}

function addRecentAcademy(academyId) {
  const nextRecents = [academyId, ...state.recents.filter((item) => item !== academyId)].slice(0, 6);
  state.recents = nextRecents;
  storage.writeRecents(state.currentUser, nextRecents);
}

function openAcademyDetail(academyId) {
  addRecentAcademy(academyId);
  renderDetailModal(academyId);
  renderSavedRails();
  renderHeroSpotlight();
  renderMap();
  openModal(elements.detailModal);
}

function updateAuthModeUi() {
  const isSignup = state.authMode === "signup";
  elements.authModeSignup.classList.toggle("is-active", isSignup);
  elements.authModeLogin.classList.toggle("is-active", !isSignup);
  elements.authModalTitle.textContent = isSignup
    ? "Create a local CoachNestly account"
    : "Login to your CoachNestly account";
  elements.authModalDescription.textContent = isSignup
    ? "Create a local account to save favorites, leave reviews, and keep preferences across sessions."
    : "Login to continue with your saved favorites, recent views, and review history.";
  elements.authSubmitButton.textContent = isSignup ? "Create account" : "Login";
  elements.authName.closest(".form-field").hidden = !isSignup;
  elements.authForm.querySelector(".role-field").hidden = !isSignup;
}

function updateAuthUi() {
  const isLoggedIn = Boolean(state.currentUser);
  elements.authTrigger.textContent = isLoggedIn ? `${state.currentUser.name} • ${toTitleCase(state.currentUser.role)}` : "Login";
  elements.authForm.hidden = isLoggedIn;
  elements.authSessionPanel.hidden = !isLoggedIn;

  if (!isLoggedIn) {
    return;
  }

  elements.authSessionName.textContent = state.currentUser.name;
  elements.authSessionMeta.textContent = `${state.currentUser.email} • ${toTitleCase(state.currentUser.role)}`;
}

function readAuthValues() {
  return {
    name: elements.authName.value.trim(),
    email: elements.authEmail.value.trim(),
    password: elements.authPassword.value.trim(),
    role: elements.authForm.querySelector('input[name="role"]:checked')?.value || "parent"
  };
}

function clearAuthErrors() {
  elements.authForm.querySelectorAll("[data-auth-error-for]").forEach((node) => {
    node.textContent = "";
  });
}

function setAuthFieldError(fieldName, message) {
  const errorNode = elements.authForm.querySelector(`[data-auth-error-for="${fieldName}"]`);

  if (errorNode) {
    errorNode.textContent = message;
  }
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthErrors();
  const values = readAuthValues();

  if (!validateEmail(values.email)) {
    setAuthFieldError("email", "Enter a valid email address.");
    return;
  }

  if (values.password.length < 6) {
    setAuthFieldError("password", "Use at least 6 characters.");
    return;
  }

  const users = storage.readUsers();

  if (state.authMode === "signup") {
    if (values.name.length < 2) {
      setAuthFieldError("name", "Enter your name.");
      return;
    }

    if (users.some((user) => normalizeText(user.email) === normalizeText(values.email))) {
      setAuthFieldError("email", "This email already has a local account.");
      return;
    }

    const nextUser = {
      id: `user-${Date.now()}`,
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      createdAt: new Date().toISOString()
    };

    storage.writeUsers([...users, nextUser]);
    state.currentUser = nextUser;
    storage.writeCurrentUser(nextUser);
    hydrateScopedCollections();
    updateAuthUi();
    refreshSavedStateUi();
    setStatus(elements.authStatus, "Account created and saved locally on this device.", "success");
    showToast("Account created. Favorites and reviews will now persist for this user.", "success");
    return;
  }

  const matchedUser = users.find(
    (user) =>
      normalizeText(user.email) === normalizeText(values.email) && user.password === values.password
  );

  if (!matchedUser) {
    setStatus(elements.authStatus, "Could not find a matching local account.", "error");
    return;
  }

  state.currentUser = matchedUser;
  storage.writeCurrentUser(matchedUser);
  hydrateScopedCollections();
  updateAuthUi();
  refreshSavedStateUi();
  setStatus(elements.authStatus, "Logged in successfully.", "success");
  showToast("Logged in. Your saved data is back.", "success");
}

function handleLogout() {
  state.currentUser = null;
  storage.writeCurrentUser(null);
  hydrateScopedCollections();
  updateAuthUi();
  refreshSavedStateUi();
  closeModal(elements.authModal);
  setStatus(elements.reviewStatus, "Login as a parent or student to review an academy.", "neutral");
  showToast("Logged out. Guest mode is still active on this device.", "info");
}

function toggleFavorite(academyId) {
  const alreadySaved = state.favorites.includes(academyId);
  const nextFavorites = alreadySaved
    ? state.favorites.filter((id) => id !== academyId)
    : [academyId, ...state.favorites].slice(0, 12);

  state.favorites = nextFavorites;
  storage.writeFavorites(state.currentUser, nextFavorites);
  renderResultsGrid();
  renderSavedRails();
  renderFeatured();
  renderCompareSelects();
  updateFavoriteButton();
  renderAdminMetrics();

  if (!state.currentUser && !alreadySaved) {
    showToast("Favorite saved locally. Create an account later to simulate account-based retention.", "info");
    return;
  }

  showToast(alreadySaved ? "Favorite removed." : "Academy saved to favorites.", alreadySaved ? "info" : "success");
}

function toggleCompare(academyId) {
  if (state.compareIds.includes(academyId)) {
    state.compareIds = state.compareIds.filter((id) => id !== academyId);
  } else if (state.compareIds.length < 2) {
    state.compareIds = [...state.compareIds, academyId];
  } else {
    state.compareIds = [state.compareIds[1], academyId];
    showToast("Comparison keeps two academies at a time, so the oldest selection was replaced.", "info");
  }

  renderResultsGrid();
  renderTopRated();
  renderCompareState();
  renderCompareSelects();
}

function runComparison(leftId = elements.compareSelectA.value, rightId = elements.compareSelectB.value) {
  if (!leftId || !rightId || leftId === rightId) {
    elements.comparisonOutput.textContent =
      "Choose two different academies to compare fees, quality, and fit.";
    return;
  }

  const leftAcademy = findAcademyById(state.academies, leftId);
  const rightAcademy = findAcademyById(state.academies, rightId);

  if (!leftAcademy || !rightAcademy) {
    elements.comparisonOutput.textContent = "Choose two academies to compare fees, quality, and fit.";
    return;
  }

  const comparison = compareAcademies(leftAcademy, rightAcademy);
  elements.comparisonOutput.innerHTML = comparisonTemplate(comparison, leftAcademy, rightAcademy);
}

function readOnboardingValues() {
  return {
    name: document.querySelector("#academyName").value.trim(),
    sport: document.querySelector("#academySport").value.trim(),
    city: document.querySelector("#academyCity").value.trim(),
    location: document.querySelector("#academyLocation").value.trim(),
    fees: document.querySelector("#academyFees").value.trim(),
    timings: document.querySelector("#academyTimings").value.trim(),
    coach: document.querySelector("#academyCoach").value.trim(),
    facilities: document.querySelector("#academyFacilities").value.trim(),
    contact: document.querySelector("#academyContact").value.trim(),
    email: document.querySelector("#academyEmail").value.trim(),
    imageTheme: document.querySelector("#academyImageTheme").value,
    description: document.querySelector("#academyDescription").value.trim()
  };
}

function clearWizardErrors() {
  elements.academyOnboardingForm.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = "";
  });
}

function setWizardFieldError(fieldName, message) {
  const node = elements.academyOnboardingForm.querySelector(`[data-error-for="${fieldName}"]`);

  if (node) {
    node.textContent = message;
  }
}

function validateWizardStep(step, values) {
  const errors = {};

  if (step === 1) {
    if (values.name.length < 3) {
      errors.name = "Enter an academy name with at least 3 characters.";
    }
    if (!values.sport) {
      errors.sport = "Enter a sport.";
    }
    if (!values.city) {
      errors.city = "Enter a city.";
    }
    if (!values.location) {
      errors.location = "Enter an area.";
    }
  }

  if (step === 2) {
    if (!values.fees) {
      errors.fees = "Add a fee label.";
    }
    if (!values.timings) {
      errors.timings = "Add batch timings.";
    }
    if (!values.coach) {
      errors.coach = "Add a head coach.";
    }
    if (!values.facilities) {
      errors.facilities = "Add at least one facility.";
    }
  }

  if (step === 3) {
    if (values.contact.length < 8) {
      errors.contact = "Add a phone or WhatsApp number.";
    }
    if (!validateEmail(values.email)) {
      errors.email = "Add a valid academy email.";
    }
    if (values.description.length < 24) {
      errors.description = "Describe the academy in at least 24 characters.";
    }
  }

  return errors;
}

function renderWizardStepper() {
  elements.onboardingStepper.innerHTML = wizardLabels
    .map(
      (label, index) => `
        <article class="wizard-step-indicator${state.onboardingStep === index + 1 ? " is-active" : ""}">
          <strong>Step ${index + 1}</strong>
          <span>${label}</span>
        </article>
      `
    )
    .join("");
}

function updateWizardUi() {
  elements.academyOnboardingForm.querySelectorAll(".wizard-step").forEach((stepNode) => {
    const isCurrent = Number(stepNode.dataset.step) === state.onboardingStep;
    stepNode.hidden = !isCurrent;
    stepNode.classList.toggle("is-active", isCurrent);
  });

  elements.wizardBack.disabled = state.onboardingStep === 1;
  elements.wizardBack.hidden = state.onboardingStep === 1;
  elements.academySubmitButton.textContent =
    state.onboardingStep === 4
      ? "Submit academy"
      : state.onboardingStep === 3
        ? "Review academy"
        : "Next step";
  renderWizardStepper();
  elements.onboardingPreview.innerHTML = onboardingPreviewTemplate(readOnboardingValues());
}

function populateOnboardingDraft() {
  const draft = storage.readOnboardingDraft();
  Object.entries(draft).forEach(([key, value]) => {
    const field = elements.academyOnboardingForm.querySelector(`[name="${key}"]`);
    if (field) {
      field.value = value;
    }
  });
  updateWizardUi();
}

function saveOnboardingDraft() {
  const values = readOnboardingValues();
  storage.writeOnboardingDraft(values);
  showToast("Onboarding draft saved locally.", "success");
}

function resetOnboardingFlow() {
  elements.academyOnboardingForm.reset();
  document.querySelector("#academyImageTheme").value = "cricket";
  state.onboardingStep = 1;
  clearWizardErrors();
  storage.clearOnboardingDraft();
  updateWizardUi();
}

function handleOnboardingSubmit(event) {
  event.preventDefault();
  clearWizardErrors();
  const values = readOnboardingValues();

  if (state.onboardingStep < 4) {
    const errors = validateWizardStep(state.onboardingStep, values);

    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([field, message]) => setWizardFieldError(field, message));
      setStatus(elements.formStatus, "Complete the highlighted fields before moving ahead.", "error");
      return;
    }

    storage.writeOnboardingDraft(values);
    state.onboardingStep += 1;
    updateWizardUi();
    setStatus(elements.formStatus, "Step saved. Keep going to submit the academy.", "success");
    return;
  }

  const userAcademies = storage.readUserAcademies();
  const nextAcademy = buildUserAcademy(values);
  storage.writeUserAcademies([nextAcademy, ...userAcademies]);
  refreshAcademyCollection();
  runSearch({ preserveSelection: false });
  resetOnboardingFlow();
  state.adminSelectionId = nextAcademy.id;
  renderAdmin();
  openAcademyDetail(nextAcademy.id);
  showToast("Academy submitted and added to the marketplace.", "success");
}

function renderAdminMetrics() {
  const totalReviews = Object.values(state.reviewsByAcademy).reduce(
    (sum, reviews) => sum + safeArray(reviews).length,
    0
  );
  const metrics = [
    { label: "Total academies", value: String(state.academies.length) },
    { label: "User submissions", value: String(storage.readUserAcademies().length) },
    { label: "Reviews collected", value: String(totalReviews) },
    { label: "Favorites saved", value: String(state.favorites.length) }
  ];

  elements.adminMetrics.innerHTML = metrics.map(adminMetricTemplate).join("");
}

function fillAdminForm(academy) {
  elements.adminName.value = academy?.name || "";
  elements.adminSport.value = academy?.sport || "";
  elements.adminLocation.value = academy?.locationLabel || "";
  elements.adminFees.value = academy?.feeLabel || "";
  elements.adminDescription.value = academy?.description || "";
}

function renderAdminRows() {
  elements.adminAcademyRows.innerHTML = state.academies.map(adminRowTemplate).join("");
}

function renderAdmin() {
  renderAdminMetrics();
  renderAdminRows();

  if (state.adminSelectionId) {
    fillAdminForm(findAcademyById(state.academies, state.adminSelectionId));
  }
}

function handleAdminSubmit(event) {
  event.preventDefault();

  const values = {
    name: elements.adminName.value.trim(),
    sport: elements.adminSport.value.trim(),
    location: elements.adminLocation.value.trim(),
    fees: elements.adminFees.value.trim(),
    description: elements.adminDescription.value.trim()
  };

  if (values.name.length < 3 || values.sport.length < 3 || values.location.length < 3) {
    setStatus(elements.adminStatus, "Add a name, sport, and location to continue.", "error");
    return;
  }

  if (!state.adminSelectionId) {
    const nextAcademy = buildAdminAcademy(values);
    storage.writeUserAcademies([nextAcademy, ...storage.readUserAcademies()]);
    refreshAcademyCollection();
    state.adminSelectionId = nextAcademy.id;
    renderAdmin();
    runSearch({ preserveSelection: false });
    setStatus(elements.adminStatus, "Academy created from the admin editor.", "success");
    showToast("Admin created a new academy entry.", "success");
    return;
  }

  const selectedAcademy = findAcademyById(state.academies, state.adminSelectionId);
  const nextOverride = buildAdminOverride(selectedAcademy, values);
  const overrides = storage.readAdminOverrides();
  storage.writeAdminOverrides({
    ...overrides,
    [state.adminSelectionId]: nextOverride
  });
  refreshAcademyCollection();
  renderAdmin();
  runSearch({ preserveSelection: true });
  setStatus(elements.adminStatus, "Academy changes saved to the local admin layer.", "success");
  showToast("Academy updated in admin.", "success");
}

function clearAdminForm() {
  state.adminSelectionId = null;
  fillAdminForm(null);
  setStatus(elements.adminStatus, "Editor reset. You can now create a new academy entry.", "neutral");
}

function handleReviewSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    openModal(elements.authModal);
    setStatus(elements.authStatus, "Create or login to a local account before reviewing.", "info");
    return;
  }

  const academy = getSelectedAcademy();
  const title = elements.reviewTitle.value.trim();
  const body = elements.reviewBody.value.trim();

  if (title.length < 3 || body.length < 12) {
    setStatus(elements.reviewStatus, "Add a short title and a more complete review.", "error");
    return;
  }

  const nextReview = {
    id: `review-${Date.now()}`,
    rating: state.reviewRating,
    title,
    body,
    authorName: state.currentUser.name,
    role: state.currentUser.role,
    createdAt: new Date().toISOString()
  };

  const reviewsByAcademy = storage.readReviews();
  reviewsByAcademy[academy.id] = [...safeArray(reviewsByAcademy[academy.id]), nextReview];
  storage.writeReviews(reviewsByAcademy);
  state.reviewsByAcademy = reviewsByAcademy;
  refreshAcademyCollection();
  runSearch({ preserveSelection: true });
  renderDetailModal(academy.id);
  elements.reviewForm.reset();
  state.reviewRating = 5;
  renderReviewStars();
  setStatus(elements.reviewStatus, "Review submitted and rating updated locally.", "success");
  showToast("Review saved. Academy ratings refreshed.", "success");
}

function renderSuggestionMenu(type, inputValue) {
  const source = type === "sport" ? state.searchIndex.sports : state.searchIndex.locations;
  const menu = type === "sport" ? elements.sportSuggestions : elements.locationSuggestions;
  const input = type === "sport" ? elements.sportInput : elements.locationInput;
  const normalizedQuery = normalizeText(inputValue);
  const suggestions = source
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 6);

  if (!suggestions.length || !normalizedQuery) {
    menu.hidden = true;
    input.setAttribute("aria-expanded", "false");
    return;
  }

  menu.innerHTML = suggestions
    .map(
      (suggestion) => `
        <button
          class="typeahead-option"
          type="button"
          data-action="suggestion"
          data-type="${type}"
          data-value="${suggestion}"
        >
          ${suggestion}
        </button>
      `
    )
    .join("");
  menu.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function hideSuggestionMenus() {
  elements.sportSuggestions.hidden = true;
  elements.locationSuggestions.hidden = true;
  elements.sportInput.setAttribute("aria-expanded", "false");
  elements.locationInput.setAttribute("aria-expanded", "false");
}

function runSearch({ showSkeleton = false, preserveSelection = false } = {}) {
  state.filters = getCurrentFilters();
  persistFilters();

  const applyResults = () => {
    // Search is client-side today, but this branch maps cleanly to a future API response.
    const filteredResults = sortFilteredAcademies(
      filterAcademies(state.academies, state.filters),
      state.favorites
    );

    state.currentResults = filteredResults;

    if (!preserveSelection || !state.currentResults.some((academy) => academy.id === state.selectedAcademyId)) {
      state.selectedAcademyId = state.currentResults[0]?.id || null;
    }

    elements.resultsSkeleton.hidden = true;
    renderSportControls();
    renderResultsSummary();
    renderResultsGrid();
    renderTopRated();
    renderMap();
    renderHeroSpotlight();
    renderSavedRails();
    renderCompareState();
    renderCompareSelects();
    renderAdminMetrics();
  };

  window.clearTimeout(state.searchRenderTimer);

  if (showSkeleton) {
    elements.resultsSkeleton.hidden = false;
    state.searchRenderTimer = window.setTimeout(applyResults, 220);
    return;
  }

  applyResults();
}

function requestNearbyLocation() {
  if (!navigator.geolocation) {
    setStatus(elements.geoStatus, "This browser does not support location lookup.", "error");
    return;
  }

  setStatus(elements.geoStatus, "Checking your location for the nearest supported area...", "pending");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const nearestArea = inferNearestLocation(
        {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        state.appData.cities
      );

      if (!nearestArea) {
        setStatus(elements.geoStatus, "We could not map your location to a supported launch area yet.", "error");
        return;
      }

      elements.locationInput.value = nearestArea;
      setStatus(elements.geoStatus, `Using ${nearestArea} from your device location.`, "success");
      runSearch({ showSkeleton: true, preserveSelection: false });
    },
    () => {
      setStatus(elements.geoStatus, "Location access was blocked. You can still type any area manually.", "error");
    },
    {
      enableHighAccuracy: false,
      timeout: 5000
    }
  );
}

function handleDelegatedAction(event) {
  const actionNode = event.target.closest("[data-action]");

  if (!actionNode) {
    return;
  }

  const action = actionNode.dataset.action;
  const academyId = actionNode.dataset.id;

  if (action === "details") {
    openAcademyDetail(academyId);
    return;
  }

  if (action === "favorite") {
    toggleFavorite(academyId);
    return;
  }

  if (action === "compare") {
    toggleCompare(academyId);
    return;
  }

  if (action === "mini-open") {
    openAcademyDetail(academyId);
    return;
  }

  if (action === "map-focus") {
    state.selectedAcademyId = academyId;
    renderMap();
    renderResultsGrid();
    renderHeroSpotlight();
    return;
  }

  if (action === "admin-edit") {
    state.adminSelectionId = academyId;
    fillAdminForm(findAcademyById(state.academies, academyId));
    setStatus(elements.adminStatus, "Academy loaded into the editor.", "success");
    return;
  }

  if (action === "suggestion") {
    if (actionNode.dataset.type === "sport") {
      elements.sportInput.value = actionNode.dataset.value;
    } else {
      elements.locationInput.value = actionNode.dataset.value;
    }
    hideSuggestionMenus();
    runSearch({ preserveSelection: false });
    return;
  }

  if (action === "apply-sport") {
    elements.sportInput.value = actionNode.dataset.sport;
    document.querySelector("#discover").scrollIntoView({ behavior: "smooth", block: "start" });
    runSearch({ showSkeleton: true, preserveSelection: false });
    return;
  }

  if (action === "featured-dot") {
    updateFeaturedPosition(Number(actionNode.dataset.index));
  }
}

function bindEvents() {
  const debouncedSearch = debounce(() => runSearch({ preserveSelection: false }), 160);

  elements.menuToggle.addEventListener("click", () => {
    const isOpen = elements.siteNav.classList.toggle("is-open");
    elements.menuToggle.classList.toggle("is-open", isOpen);
    elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  elements.siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  elements.themeToggle.addEventListener("click", () => {
    applyTheme(elements.body.dataset.theme === "dark" ? "light" : "dark");
  });

  elements.authTrigger.addEventListener("click", () => {
    updateAuthModeUi();
    updateAuthUi();
    openModal(elements.authModal);
  });

  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch({ showSkeleton: true, preserveSelection: false });
    document.querySelector("#discover").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.sportInput.addEventListener("input", () => {
    renderSuggestionMenu("sport", elements.sportInput.value);
    debouncedSearch();
  });

  elements.locationInput.addEventListener("input", () => {
    renderSuggestionMenu("location", elements.locationInput.value);
    debouncedSearch();
  });

  elements.intentInput.addEventListener("change", () => {
    runSearch({ preserveSelection: false });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-field--suggest")) {
      hideSuggestionMenus();
    }
  });

  elements.useNearby.addEventListener("click", requestNearbyLocation);

  elements.clearFilters.addEventListener("click", () => {
    elements.sportInput.value = "";
    elements.locationInput.value = state.appData.cities[0]?.areas?.[0] || "";
    elements.intentInput.value = "all";
    runSearch({ showSkeleton: true, preserveSelection: false });
    showToast("Filters reset.", "info");
  });

  elements.openQuizShortcut.addEventListener("click", () => {
    document.querySelector("#ai-lab").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.heroSportsGrid.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-sport-tile]");
    if (!tile) {
      return;
    }
    elements.sportInput.value = tile.dataset.sportTile;
    runSearch({ showSkeleton: true, preserveSelection: false });
  });

  elements.trendingSportsGrid.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-sport-tile]");
    if (!tile) {
      return;
    }
    elements.sportInput.value = tile.dataset.sportTile;
    runSearch({ showSkeleton: true, preserveSelection: false });
  });

  elements.categoryChips.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-chip-sport]");
    if (!chip) {
      return;
    }
    elements.sportInput.value = chip.dataset.chipSport;
    runSearch({ showSkeleton: true, preserveSelection: false });
  });

  elements.featuredPrev.addEventListener("click", () => updateFeaturedPosition(state.featuredIndex - 1));
  elements.featuredNext.addEventListener("click", () => updateFeaturedPosition(state.featuredIndex + 1));
  elements.featuredIndicators.addEventListener("click", handleDelegatedAction);
  elements.featuredRail.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) {
      handleDelegatedAction(event);
      return;
    }

    const card = event.target.closest("[data-featured-id]");
    if (card) {
      openAcademyDetail(card.dataset.featuredId);
    }
  });
  elements.topRatedGrid.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) {
      handleDelegatedAction(event);
      return;
    }

    const card = event.target.closest("[data-card-id]");
    if (card) {
      openAcademyDetail(card.dataset.cardId);
    }
  });
  elements.resultsGrid.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) {
      handleDelegatedAction(event);
      return;
    }

    const card = event.target.closest("[data-card-id]");
    if (card) {
      openAcademyDetail(card.dataset.cardId);
    }
  });
  elements.favoritesGrid.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) {
      handleDelegatedAction(event);
      return;
    }

    const card = event.target.closest("[data-mini-id]");
    if (card) {
      openAcademyDetail(card.dataset.miniId);
    }
  });
  elements.recentGrid.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) {
      handleDelegatedAction(event);
      return;
    }

    const card = event.target.closest("[data-mini-id]");
    if (card) {
      openAcademyDetail(card.dataset.miniId);
    }
  });
  elements.mapMarkers.addEventListener("click", handleDelegatedAction);
  elements.adminAcademyRows.addEventListener("click", handleDelegatedAction);
  elements.quizResult.addEventListener("click", handleDelegatedAction);

  elements.resetMapView.addEventListener("click", () => {
    state.selectedAcademyId = state.currentResults[0]?.id || null;
    renderMap();
    renderResultsGrid();
    renderHeroSpotlight();
  });

  elements.openComparisonFromTray.addEventListener("click", () => {
    if (state.compareIds.length === 2) {
      elements.compareSelectA.value = state.compareIds[0];
      elements.compareSelectB.value = state.compareIds[1];
      runComparison(state.compareIds[0], state.compareIds[1]);
      document.querySelector("#ai-lab").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    showToast("Choose two academies first.", "info");
  });

  elements.compareButton.addEventListener("click", () => runComparison());

  elements.recommendationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const matches = recommendAcademies(
      state.currentResults.length ? state.currentResults : state.academies,
      {
        age: document.querySelector("#recommendAge").value,
        goal: document.querySelector("#recommendGoal").value,
        budget: document.querySelector("#recommendBudget").value
      },
      {
        filters: state.filters,
        favoriteIds: state.favorites
      }
    );
    elements.recommendationResult.innerHTML = recommendationTemplate(matches);
  });

  elements.quizForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const suggestions = suggestSportsFromQuiz({
      energy: document.querySelector("#quizEnergy").value,
      environment: document.querySelector("#quizEnvironment").value,
      outcome: document.querySelector("#quizOutcome").value
    });
    elements.quizResult.innerHTML = quizResultTemplate(suggestions);
  });

  elements.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = elements.chatInput.value.trim();

    if (!message) {
      return;
    }

    state.chatMessages.push({ role: "user", text: message });
    const reply = getAssistantReply(message, state.currentResults.length ? state.currentResults : state.academies, {
      filters: state.filters
    });
    state.chatMessages.push({ role: "assistant", text: reply.text });
    state.chatMessages = state.chatMessages.slice(-10);
    elements.chatInput.value = "";
    renderChat();
  });

  elements.newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = elements.newsletterEmail.value.trim();

    if (!validateEmail(email)) {
      setStatus(elements.newsletterStatus, "Enter a valid email to join the newsletter.", "error");
      return;
    }

    const subscribers = storage.readNewsletterSubscribers();

    if (!subscribers.includes(email)) {
      storage.writeNewsletterSubscribers([email, ...subscribers]);
    }

    elements.newsletterForm.reset();
    setStatus(elements.newsletterStatus, "You are subscribed to product and academy updates.", "success");
    showToast("Newsletter signup saved locally.", "success");
  });

  elements.downloadIos.addEventListener("click", () => {
    showToast("App Store CTA clicked. Connect this to a future waitlist or mobile landing page.", "info");
  });

  elements.downloadAndroid.addEventListener("click", () => {
    showToast("Google Play CTA clicked. Great place for prelaunch signup collection.", "info");
  });

  elements.wizardBack.addEventListener("click", () => {
    state.onboardingStep = Math.max(1, state.onboardingStep - 1);
    updateWizardUi();
  });

  elements.wizardSaveDraft.addEventListener("click", saveOnboardingDraft);
  elements.academyOnboardingForm.addEventListener("input", () => {
    elements.onboardingPreview.innerHTML = onboardingPreviewTemplate(readOnboardingValues());
  });
  elements.academyOnboardingForm.addEventListener("submit", handleOnboardingSubmit);

  elements.adminAcademyForm.addEventListener("submit", handleAdminSubmit);
  elements.adminCreateAcademy.addEventListener("click", () => {
    clearAdminForm();
    document.querySelector("#admin").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.adminLoadSubmission.addEventListener("click", () => {
    const latestUserAcademy = storage.readUserAcademies()[0];
    const draft = storage.readOnboardingDraft();

    if (latestUserAcademy) {
      state.adminSelectionId = latestUserAcademy.id;
      fillAdminForm(latestUserAcademy);
      setStatus(elements.adminStatus, "Latest onboarding submission loaded into the editor.", "success");
      return;
    }

    if (draft.name) {
      clearAdminForm();
      fillAdminForm({
        name: draft.name,
        sport: draft.sport,
        locationLabel: `${draft.location || "Area"}, ${draft.city || "City"}`,
        feeLabel: draft.fees,
        description: draft.description
      });
      setStatus(elements.adminStatus, "Draft onboarding data loaded for quick admin creation.", "success");
      return;
    }

    setStatus(elements.adminStatus, "There is no recent submission or draft to load yet.", "error");
  });
  elements.adminResetForm.addEventListener("click", clearAdminForm);

  elements.favoriteToggle.addEventListener("click", () => {
    const academy = getSelectedAcademy();
    if (academy) {
      toggleFavorite(academy.id);
      renderDetailModal(academy.id);
    }
  });
  elements.reviewStars.addEventListener("click", (event) => {
    const star = event.target.closest("[data-rating]");

    if (!star) {
      return;
    }

    state.reviewRating = Number(star.dataset.rating);
    renderReviewStars();
  });
  elements.reviewForm.addEventListener("submit", handleReviewSubmit);

  elements.authModeSignup.addEventListener("click", () => {
    state.authMode = "signup";
    updateAuthModeUi();
  });
  elements.authModeLogin.addEventListener("click", () => {
    state.authMode = "login";
    updateAuthModeUi();
  });
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.authContinueButton.addEventListener("click", () => closeModal(elements.authModal));
  elements.authLogoutButton.addEventListener("click", handleLogout);

  elements.detailBackdrop.addEventListener("click", () => closeModal(elements.detailModal));
  elements.authBackdrop.addEventListener("click", () => closeModal(elements.authModal));
  elements.closeDetailModal.addEventListener("click", () => closeModal(elements.detailModal));
  elements.closeAuthModal.addEventListener("click", () => closeModal(elements.authModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal(elements.detailModal);
      closeModal(elements.authModal);
      closeMenu();
    }
  });
}

async function initializeApp() {
  seedSkeletons();
  initializeRevealObserver();
  initializeSectionObserver();
  bindEvents();
  updateAuthModeUi();
  updateAuthUi();
  hydrateScopedCollections();
  applyTheme(state.settings.theme || "light", false);

  state.appData = await loadAppData();
  refreshAcademyCollection();
  seedChat();
  renderHeroStats();
  renderMetrics();
  renderDashboard();
  renderTestimonials();
  renderNews();
  renderFeatured();
  renderAdmin();
  renderReviewStars();

  state.filters = {
    sport: state.settings.lastFilters?.sport || "",
    location: state.settings.lastFilters?.location || state.appData.cities[0]?.areas?.[0] || "",
    intent: state.settings.lastFilters?.intent || "all"
  };

  elements.sportInput.value = state.filters.sport;
  elements.locationInput.value = state.filters.location;
  elements.intentInput.value = state.filters.intent;
  populateOnboardingDraft();
  runSearch({ showSkeleton: true, preserveSelection: false });
}

initializeApp().catch(() => {
  showToast("The app could not initialize correctly. Please reload the page on a local server.", "error");
});
