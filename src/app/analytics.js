(function bootstrapEducircuitAnalytics(window, document) {
  const CONFIG_META_NAME = "educircuit-ga4-measurement-id";
  const PLACEHOLDER_IDS = new Set(["", "G-XXXXXXXXXX", "G-REPLACE-ME"]);
  const state = {
    measurementId: "",
    initialized: false,
    historyTrackingInstalled: false,
    lastPageLocation: "",
    lastPageTitle: ""
  };

  function readMeasurementId() {
    const configured = window.EDUCIRCUIT_GA4_MEASUREMENT_ID;
    if (typeof configured === "string" && configured.trim()) {
      return configured.trim();
    }
    const meta = document.querySelector(`meta[name="${CONFIG_META_NAME}"]`);
    return meta?.content?.trim() || "";
  }

  function isValidMeasurementId(measurementId) {
    return /^G-[A-Z0-9]{6,}$/i.test(measurementId) && !PLACEHOLDER_IDS.has(measurementId);
  }

  function isDebugMode() {
    const host = String(window.location.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  }

  function ensureDataLayer() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
    }
  }

  function existingGoogleTagScript() {
    return document.querySelector("script[data-educircuit-ga4], script[src*='googletagmanager.com/gtag/js?id=']");
  }

  function ensureGoogleTagScript(measurementId) {
    const existing = existingGoogleTagScript();
    if (existing) return existing;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.educircuitGa4 = measurementId;
    script.onerror = () => {
      console.warn("Educircuit GA4: Google tag script could not be loaded.");
    };
    document.head.appendChild(script);
    return script;
  }

  function initialize() {
    state.measurementId = readMeasurementId();
    if (!isValidMeasurementId(state.measurementId)) {
      return false;
    }

    ensureDataLayer();
    ensureGoogleTagScript(state.measurementId);

    if (!state.initialized) {
      if (!window.__educircuitGa4Configured) {
        window.gtag("js", new Date());
        window.gtag("config", state.measurementId, {
          send_page_view: false,
          debug_mode: isDebugMode()
        });
        window.__educircuitGa4Configured = true;
      }
      state.initialized = true;
    }

    return true;
  }

  function normalizePagePath(pagePath) {
    if (!pagePath) return "/";
    if (/^https?:\/\//i.test(pagePath)) {
      return new URL(pagePath).pathname || "/";
    }
    return pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  }

  function buildPageLocation(pagePath) {
    const url = new URL(window.location.href);
    const normalizedPath = normalizePagePath(pagePath);
    url.pathname = normalizedPath;
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  function trackPageView({
    pagePath = window.location.pathname || "/",
    pageTitle = document.title || "Educircuit",
    pageLocation = "",
    pageReferrer = "",
    force = false
  } = {}) {
    if (!initialize()) return false;

    const resolvedPath = normalizePagePath(pagePath);
    const resolvedLocation = pageLocation || buildPageLocation(resolvedPath);
    const resolvedTitle = String(pageTitle || "Educircuit").trim();

    if (!force && state.lastPageLocation === resolvedLocation && state.lastPageTitle === resolvedTitle) {
      return false;
    }

    const payload = {
      page_title: resolvedTitle,
      page_location: resolvedLocation
    };
    if (pageReferrer || state.lastPageLocation) {
      payload.page_referrer = pageReferrer || state.lastPageLocation;
    }
    if (isDebugMode()) {
      payload.debug_mode = true;
    }

    window.gtag("event", "page_view", payload);
    state.lastPageLocation = resolvedLocation;
    state.lastPageTitle = resolvedTitle;
    return true;
  }

  function trackEvent(name, params = {}) {
    if (!initialize()) return false;
    window.gtag("event", name, {
      ...(isDebugMode() ? { debug_mode: true } : {}),
      ...params
    });
    return true;
  }

  function trackException(error, context = {}) {
    const description = typeof error === "string"
      ? error
      : error?.message || "Unknown JavaScript error";
    return trackEvent("exception", {
      description,
      fatal: false,
      ...context
    });
  }

  function installHistoryTracking() {
    if (state.historyTrackingInstalled || !window.history) return;
    state.historyTrackingInstalled = true;

    const wrapHistoryMethod = methodName => {
      const original = window.history[methodName];
      if (typeof original !== "function") return;
      window.history[methodName] = function wrappedHistoryMethod() {
        const result = original.apply(this, arguments);
        setTimeout(() => {
          trackPageView({
            pagePath: `${window.location.pathname}${window.location.search || ""}`,
            pageTitle: document.title || "Educircuit"
          });
        }, 0);
        return result;
      };
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");
    window.addEventListener("popstate", () => {
      trackPageView({
        pagePath: `${window.location.pathname}${window.location.search || ""}`,
        pageTitle: document.title || "Educircuit"
      });
    });
    window.addEventListener("hashchange", () => {
      trackPageView({
        pagePath: `${window.location.pathname}${window.location.search || ""}`,
        pageTitle: document.title || "Educircuit"
      });
    });
  }

  window.EducircuitAnalytics = {
    getMeasurementId: readMeasurementId,
    initialize,
    trackPageView,
    trackEvent,
    trackException,
    installHistoryTracking
  };

  window.addEventListener("error", event => {
    trackException(event?.error || event?.message || "Window error");
  });
  window.addEventListener("unhandledrejection", event => {
    trackException(event?.reason || "Unhandled promise rejection");
  });

  installHistoryTracking();
})(window, document);
