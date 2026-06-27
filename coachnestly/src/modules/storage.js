import { cloneData, getScopeKey } from "./utils.js";

export const STORAGE_KEYS = {
  users: "coachnestly:users",
  currentUser: "coachnestly:current-user",
  favorites: "coachnestly:favorites",
  recents: "coachnestly:recents",
  reviews: "coachnestly:reviews",
  settings: "coachnestly:settings",
  userAcademies: "coachnestly:user-academies",
  adminOverrides: "coachnestly:admin-overrides",
  onboardingDraft: "coachnestly:onboarding-draft",
  newsletters: "coachnestly:newsletters"
};

const memoryStore = new Map();

function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return memoryStore.get(key) || null;
  }
}

function writeRaw(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return;
  } catch (error) {
    memoryStore.set(key, value);
  }
}

function removeRaw(key) {
  try {
    window.localStorage.removeItem(key);
    return;
  } catch (error) {
    memoryStore.delete(key);
  }
}

function readJson(key, fallbackValue) {
  const rawValue = readRaw(key);

  if (!rawValue) {
    return cloneData(fallbackValue);
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return cloneData(fallbackValue);
  }
}

function writeJson(key, value) {
  writeRaw(key, JSON.stringify(value));
}

function readScopedMap(key) {
  return readJson(key, {});
}

function writeScopedMap(key, value) {
  writeJson(key, value);
}

export const storage = {
  readUsers() {
    return readJson(STORAGE_KEYS.users, []);
  },

  writeUsers(users) {
    writeJson(STORAGE_KEYS.users, users);
  },

  readCurrentUser() {
    return readJson(STORAGE_KEYS.currentUser, null);
  },

  writeCurrentUser(user) {
    if (!user) {
      removeRaw(STORAGE_KEYS.currentUser);
      return;
    }

    writeJson(STORAGE_KEYS.currentUser, user);
  },

  readFavorites(user) {
    const scopedMap = readScopedMap(STORAGE_KEYS.favorites);
    return scopedMap[getScopeKey(user)] || [];
  },

  writeFavorites(user, favorites) {
    const scopedMap = readScopedMap(STORAGE_KEYS.favorites);
    scopedMap[getScopeKey(user)] = favorites;
    writeScopedMap(STORAGE_KEYS.favorites, scopedMap);
  },

  readRecents(user) {
    const scopedMap = readScopedMap(STORAGE_KEYS.recents);
    return scopedMap[getScopeKey(user)] || [];
  },

  writeRecents(user, recents) {
    const scopedMap = readScopedMap(STORAGE_KEYS.recents);
    scopedMap[getScopeKey(user)] = recents;
    writeScopedMap(STORAGE_KEYS.recents, scopedMap);
  },

  readReviews() {
    return readJson(STORAGE_KEYS.reviews, {});
  },

  writeReviews(reviews) {
    writeJson(STORAGE_KEYS.reviews, reviews);
  },

  readSettings() {
    return readJson(STORAGE_KEYS.settings, {
      theme: "light",
      lastFilters: {
        sport: "",
        location: "Hyderabad",
        intent: "all"
      }
    });
  },

  writeSettings(nextSettings) {
    const currentSettings = this.readSettings();
    writeJson(STORAGE_KEYS.settings, {
      ...currentSettings,
      ...nextSettings
    });
  },

  readUserAcademies() {
    return readJson(STORAGE_KEYS.userAcademies, []);
  },

  writeUserAcademies(academies) {
    writeJson(STORAGE_KEYS.userAcademies, academies);
  },

  readAdminOverrides() {
    return readJson(STORAGE_KEYS.adminOverrides, {});
  },

  writeAdminOverrides(overrides) {
    writeJson(STORAGE_KEYS.adminOverrides, overrides);
  },

  readOnboardingDraft() {
    return readJson(STORAGE_KEYS.onboardingDraft, {});
  },

  writeOnboardingDraft(draft) {
    writeJson(STORAGE_KEYS.onboardingDraft, draft);
  },

  clearOnboardingDraft() {
    removeRaw(STORAGE_KEYS.onboardingDraft);
  },

  readNewsletterSubscribers() {
    return readJson(STORAGE_KEYS.newsletters, []);
  },

  writeNewsletterSubscribers(emails) {
    writeJson(STORAGE_KEYS.newsletters, emails);
  }
};
