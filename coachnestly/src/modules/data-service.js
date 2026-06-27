import { ACADEMIES_PAYLOAD } from "../data/academies.js";
import { CONTENT_PAYLOAD } from "../data/content.js";
import {
  buildGoogleMapsUrl,
  cloneData,
  createSlug,
  hashString,
  normalizeText,
  safeArray,
  toTitleCase,
  unique
} from "./utils.js";

const THEME_IMAGE_MAP = {
  cricket: ["assets/academy-cricket-1.svg", "assets/academy-cricket-2.svg"],
  football: ["assets/academy-football-1.svg", "assets/academy-court-1.svg"],
  swimming: ["assets/academy-swimming-1.svg", "assets/academy-fitness-1.svg"],
  badminton: ["assets/academy-racket-1.svg", "assets/academy-court-1.svg"],
  tennis: ["assets/academy-racket-1.svg", "assets/academy-football-1.svg"],
  basketball: ["assets/academy-court-1.svg", "assets/academy-fitness-1.svg"],
  boxing: ["assets/academy-fitness-1.svg", "assets/academy-court-1.svg"],
  volleyball: ["assets/academy-court-1.svg", "assets/academy-football-1.svg"],
  fitness: ["assets/academy-fitness-1.svg", "assets/academy-swimming-1.svg"]
};

export async function loadAppData() {
  return {
    academies: cloneData(ACADEMIES_PAYLOAD.academies),
    ...cloneData(CONTENT_PAYLOAD)
  };
}

function getThemeImages(theme = "") {
  return THEME_IMAGE_MAP[normalizeText(theme)] || THEME_IMAGE_MAP.fitness;
}

function parseFeeLabel(value = "") {
  const numericValue = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 4000;
}

function parseLocationLabel(value = "") {
  const parts = String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      area: toTitleCase(parts[0]),
      city: toTitleCase(parts[1])
    };
  }

  return {
    area: toTitleCase(value) || "New Area",
    city: "Hyderabad"
  };
}

function createMapPosition(seed = "") {
  const hash = hashString(seed);

  return {
    x: 18 + (hash % 60),
    y: 22 + (Math.floor(hash / 7) % 56)
  };
}

function normalizeAcademyRecord(academy) {
  const normalizedAcademy = {
    ...academy,
    seedRating: Number(academy.seedRating ?? academy.rating ?? 4.5),
    seedReviewCount: Number(academy.seedReviewCount ?? academy.reviewCount ?? 0),
    monthlyFee: Number(academy.monthlyFee ?? parseFeeLabel(academy.feeLabel)),
    feeLabel: academy.feeLabel || `₹${academy.monthlyFee} / month`,
    facilities: safeArray(academy.facilities),
    batchTimings: safeArray(academy.batchTimings),
    coaches: safeArray(academy.coaches),
    badges: safeArray(academy.badges),
    ageGroups: safeArray(academy.ageGroups),
    goals: safeArray(academy.goals),
    images: safeArray(academy.images).length ? academy.images : getThemeImages(academy.sport),
    mapPosition: academy.mapPosition || createMapPosition(academy.id),
    contact: {
      phone: academy.contact?.phone || "+91 90000 00000",
      email: academy.contact?.email || "hello@coachnestly.app",
      whatsapp: academy.contact?.whatsapp || academy.contact?.phone || "+919000000000",
      website: academy.contact?.website || `https://coachnestly.app/demo/${academy.id}`,
      mapQuery:
        academy.contact?.mapQuery ||
        `${academy.name} ${academy.area || ""} ${academy.city || ""}`.trim()
    }
  };

  normalizedAcademy.contact.mapUrl = buildGoogleMapsUrl(normalizedAcademy.contact.mapQuery);

  return normalizedAcademy;
}

function applyReviewMetrics(academy, reviews) {
  const safeReviews = safeArray(reviews);
  const reviewScore = safeReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const combinedReviewCount = academy.seedReviewCount + safeReviews.length;
  const combinedRating =
    combinedReviewCount === 0
      ? academy.seedRating
      : (academy.seedRating * academy.seedReviewCount + reviewScore) / combinedReviewCount;

  return {
    ...academy,
    rating: Number(combinedRating.toFixed(1)),
    reviewCount: combinedReviewCount
  };
}

export function buildAcademyCollection({
  reviewsByAcademy = {},
  userAcademies = [],
  adminOverrides = {}
}) {
  // Seed data stays immutable; user submissions and admin overrides layer on top of it.
  const baseAcademies = [...cloneData(ACADEMIES_PAYLOAD.academies), ...cloneData(userAcademies)];

  return baseAcademies
    .map((academy) => ({
      ...academy,
      ...(adminOverrides[academy.id] || {})
    }))
    .map(normalizeAcademyRecord)
    .map((academy) => applyReviewMetrics(academy, reviewsByAcademy[academy.id]))
    .sort((left, right) => {
      if (left.featured !== right.featured) {
        return Number(right.featured) - Number(left.featured);
      }

      if (left.topRated !== right.topRated) {
        return Number(right.topRated) - Number(left.topRated);
      }

      if (left.rating !== right.rating) {
        return right.rating - left.rating;
      }

      return right.reviewCount - left.reviewCount;
    });
}

export function buildSearchIndex(academies, cities) {
  const sports = unique(academies.map((academy) => academy.sport)).sort();
  const locations = unique([
    ...academies.flatMap((academy) => [academy.area, academy.city, academy.locationLabel]),
    ...safeArray(cities).flatMap((city) => [city.name, ...safeArray(city.areas)])
  ]).sort();
  const academyNames = unique(academies.map((academy) => academy.name)).sort();

  return {
    sports,
    locations,
    academyNames
  };
}

export function filterAcademies(academies, filters) {
  const sportQuery = normalizeText(filters.sport);
  const locationQuery = normalizeText(filters.location);
  const intentQuery = normalizeText(filters.intent);

  return academies.filter((academy) => {
    const sportMatch =
      !sportQuery ||
      [academy.sport, academy.name, ...academy.badges]
        .join(" ")
        .toLowerCase()
        .includes(sportQuery);

    const locationMatch =
      !locationQuery ||
      [academy.area, academy.city, academy.locationLabel]
        .join(" ")
        .toLowerCase()
        .includes(locationQuery);

    const intentMatch =
      intentQuery === "all" ||
      safeArray(academy.goals).map(normalizeText).includes(intentQuery);

    return sportMatch && locationMatch && intentMatch;
  });
}

export function sortFilteredAcademies(academies, favoriteIds = []) {
  return [...academies].sort((left, right) => {
    const leftFavorite = favoriteIds.includes(left.id);
    const rightFavorite = favoriteIds.includes(right.id);

    if (leftFavorite !== rightFavorite) {
      return Number(rightFavorite) - Number(leftFavorite);
    }

    if (left.topRated !== right.topRated) {
      return Number(right.topRated) - Number(left.topRated);
    }

    if (left.rating !== right.rating) {
      return right.rating - left.rating;
    }

    return left.monthlyFee - right.monthlyFee;
  });
}

export function buildUserAcademy(values) {
  // This mirrors the shape a backend endpoint would eventually accept and return.
  const sport = toTitleCase(values.sport || values.imageTheme || "Sports");
  const city = toTitleCase(values.city || "Hyderabad");
  const area = toTitleCase(values.location || "New Area");
  const id = createSlug(`${values.name}-${city}-${area}`) || `academy-${Date.now()}`;
  const images = getThemeImages(values.imageTheme || sport);
  const contactNumber = values.contact || "+91 90000 00000";

  return normalizeAcademyRecord({
    id,
    name: toTitleCase(values.name || "New Academy"),
    sport,
    city,
    area,
    locationLabel: `${area}, ${city}`,
    description:
      values.description ||
      "A newly submitted academy profile waiting to be enriched with more media, schedules, and verified operations data.",
    rating: 4.6,
    reviewCount: 2,
    monthlyFee: parseFeeLabel(values.fees || "4000"),
    feeLabel: values.fees || "₹4,000 / month",
    priceTier: "mid",
    batchTimings: [values.timings || "Mon-Sat • 6:00 AM - 7:30 AM"],
    coaches: [
      {
        name: values.coach || "Coach Profile Pending",
        specialty: `${sport} development`,
        experience: "Submitted by academy owner"
      }
    ],
    facilities: String(values.facilities || "Training space, parent support")
      .split(",")
      .map((item) => toTitleCase(item))
      .filter(Boolean),
    images,
    contact: {
      phone: contactNumber,
      email: values.email || "hello@coachnestly.app",
      whatsapp: contactNumber.replace(/\s+/g, ""),
      website: `https://coachnestly.app/demo/${id}`,
      mapQuery: `${values.name} ${area} ${city}`
    },
    coordinates: { lat: 17.385, lng: 78.4867 },
    mapPosition: createMapPosition(id),
    featured: false,
    topRated: false,
    trending: false,
    ageGroups: ["under-10", "11-14", "15-18"],
    goals: ["beginner", "competitive"],
    idealFor:
      "Families looking for a newly registered academy that can be reviewed and approved inside the marketplace.",
    badges: ["Submitted via onboarding", "Pending verification"]
  });
}

export function buildAdminAcademy(values) {
  const locationParts = parseLocationLabel(values.location);

  return buildUserAcademy({
    ...values,
    city: locationParts.city,
    location: locationParts.area,
    imageTheme: values.sport
  });
}

export function buildAdminOverride(academy, values) {
  const locationParts = parseLocationLabel(values.location || academy.locationLabel);

  return {
    ...academy,
    name: toTitleCase(values.name || academy.name),
    sport: toTitleCase(values.sport || academy.sport),
    area: locationParts.area,
    city: locationParts.city,
    locationLabel: `${locationParts.area}, ${locationParts.city}`,
    description: values.description || academy.description,
    feeLabel: values.fees || academy.feeLabel,
    monthlyFee: parseFeeLabel(values.fees || academy.feeLabel),
    images: academy.images,
    contact: {
      ...academy.contact,
      mapQuery: `${values.name || academy.name} ${locationParts.area} ${locationParts.city}`
    }
  };
}

export function inferNearestLocation(coordinates, cities = []) {
  if (!coordinates || !cities.length) {
    return null;
  }

  let closestCity = null;
  let shortestDistance = Number.POSITIVE_INFINITY;

  cities.forEach((city) => {
    const distance = Math.hypot(
      coordinates.lat - city.coordinates.lat,
      coordinates.lng - city.coordinates.lng
    );

    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestCity = city;
    }
  });

  return closestCity?.areas?.[0] || closestCity?.name || null;
}

export function findAcademyById(academies, academyId) {
  return academies.find((academy) => academy.id === academyId) || null;
}
