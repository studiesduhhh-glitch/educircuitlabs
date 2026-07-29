import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const analyticsSource = fs.readFileSync(new URL("../src/app/analytics.js", import.meta.url), "utf8");

function createAnalyticsHarness(measurementId, options = {}) {
  const scripts = [];
  const listeners = new Map();
  const location = {
    hostname: options.hostname || "educircuitlabs.com",
    pathname: "/",
    search: "",
    hash: "",
    href: "https://educircuitlabs.com/"
  };

  function updateLocation(nextUrl) {
    const resolved = new URL(nextUrl, location.href);
    location.pathname = resolved.pathname || "/";
    location.search = resolved.search || "";
    location.hash = resolved.hash || "";
    location.href = resolved.toString();
  }

  const document = {
    title: "Educircuit",
    head: {
      appendChild(node) {
        scripts.push(node);
        return node;
      }
    },
    querySelector(selector) {
      if (selector === 'meta[name="educircuit-ga4-measurement-id"]') {
        return { content: measurementId };
      }
      if (selector.includes("script[data-educircuit-ga4]")) {
        return scripts[0] || null;
      }
      return null;
    },
    createElement(tagName) {
      return {
        tagName: String(tagName || "").toUpperCase(),
        async: false,
        dataset: {},
        src: "",
        onerror: null
      };
    }
  };

  const history = {
    pushState(_state, _title, nextUrl) {
      if (nextUrl) updateLocation(nextUrl);
    },
    replaceState(_state, _title, nextUrl) {
      if (nextUrl) updateLocation(nextUrl);
    }
  };

  const window = {
    location,
    history,
    document,
    addEventListener(eventName, listener) {
      const bucket = listeners.get(eventName) || [];
      bucket.push(listener);
      listeners.set(eventName, bucket);
    },
    dispatch(eventName, payload) {
      (listeners.get(eventName) || []).forEach(listener => listener(payload));
    },
    console: {
      warn() {}
    }
  };

  const context = vm.createContext({
    window,
    document,
    console: window.console,
    URL,
    Date,
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {}
  });

  vm.runInContext(analyticsSource, context);

  return { window, scripts };
}

function getCalls(window) {
  return (window.dataLayer || []).map(entry => Array.from(entry));
}

test("analytics stays disabled when the measurement id is still a placeholder", () => {
  const { window, scripts } = createAnalyticsHarness("G-XXXXXXXXXX");

  assert.equal(window.EducircuitAnalytics.initialize(), false);
  assert.equal(scripts.length, 0);
  assert.equal(window.dataLayer, undefined);
});

test("analytics initializes once and injects one GA4 script", () => {
  const { window, scripts } = createAnalyticsHarness("G-TEST123456");

  assert.equal(window.EducircuitAnalytics.initialize(), true);
  assert.equal(window.EducircuitAnalytics.initialize(), true);
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].src, /googletagmanager\.com\/gtag\/js\?id=G-TEST123456/);

  const calls = getCalls(window);
  assert.equal(calls[0][0], "js");
  assert.equal(calls[1][0], "config");
  assert.equal(calls[1][1], "G-TEST123456");
  assert.equal(calls[1][2].send_page_view, false);
});

test("analytics respects an existing GA4 bootstrap without duplicating config", () => {
  const { window, scripts } = createAnalyticsHarness("G-TEST123456");
  window.__educircuitGa4Configured = true;
  window.dataLayer = [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  assert.equal(window.EducircuitAnalytics.initialize(), true);
  assert.equal(scripts.length, 1);
  assert.equal(getCalls(window).length, 0);
});

test("analytics sends manual page views and deduplicates identical repeats", () => {
  const { window } = createAnalyticsHarness("G-TEST123456");

  assert.equal(
    window.EducircuitAnalytics.trackPageView({
      pagePath: "/lab",
      pageTitle: "Educircuit | Circuit Lab"
    }),
    true
  );

  const afterFirstView = getCalls(window);
  assert.equal(afterFirstView.length, 3);
  assert.equal(afterFirstView[2][0], "event");
  assert.equal(afterFirstView[2][1], "page_view");
  assert.equal(afterFirstView[2][2].page_title, "Educircuit | Circuit Lab");
  assert.equal(afterFirstView[2][2].page_location, "https://educircuitlabs.com/lab");

  assert.equal(
    window.EducircuitAnalytics.trackPageView({
      pagePath: "/lab",
      pageTitle: "Educircuit | Circuit Lab"
    }),
    false
  );

  assert.equal(getCalls(window).length, afterFirstView.length);

  assert.equal(
    window.EducircuitAnalytics.trackPageView({
      pagePath: "/lab",
      pageTitle: "Educircuit | Circuit Lab",
      force: true
    }),
    true
  );

  assert.equal(getCalls(window).length, afterFirstView.length + 1);
});

test("history navigation triggers SPA page views", () => {
  const { window } = createAnalyticsHarness("G-TEST123456");

  window.history.pushState({}, "", "/ai-teacher");

  const calls = getCalls(window);
  const pageView = calls.find(call => call[0] === "event" && call[1] === "page_view");

  assert.ok(pageView);
  assert.equal(pageView[2].page_location, "https://educircuitlabs.com/ai-teacher");
  assert.equal(pageView[2].page_title, "Educircuit");
});
