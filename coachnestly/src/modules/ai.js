import { normalizeText, safeArray } from "./utils.js";

function getBudgetWeight(priceTier, budget) {
  if (budget === "flexible") {
    return 8;
  }

  if (budget === "mid") {
    return priceTier === "mid" ? 18 : priceTier === "value" ? 14 : 8;
  }

  return priceTier === "value" ? 20 : priceTier === "mid" ? 12 : 5;
}

export function recommendAcademies(academies, preferences, context = {}) {
  const { filters = {}, favoriteIds = [] } = context;

  return academies
    .map((academy) => {
      let score = academy.rating * 12;
      const reasons = [];

      if (safeArray(academy.ageGroups).includes(preferences.age)) {
        score += 20;
        reasons.push("Age band matches the academy's training batches.");
      }

      if (safeArray(academy.goals).includes(preferences.goal)) {
        score += 24;
        reasons.push("Training goals align with the athlete's target outcome.");
      }

      score += getBudgetWeight(academy.priceTier, preferences.budget);

      if (favoriteIds.includes(academy.id)) {
        score += 12;
        reasons.push("Already saved, so it fits prior interest patterns.");
      }

      if (filters.sport && normalizeText(filters.sport) === normalizeText(academy.sport)) {
        score += 16;
        reasons.push("Matches the sport already being explored.");
      }

      if (
        filters.location &&
        normalizeText(academy.locationLabel).includes(normalizeText(filters.location))
      ) {
        score += 14;
        reasons.push("Located close to the active search area.");
      }

      if (academy.topRated) {
        score += 8;
      }

      return {
        academy,
        score: Math.round(score),
        reasons: reasons.slice(0, 3)
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export function suggestSportsFromQuiz(answers) {
  const scores = {
    Cricket: 0,
    Football: 0,
    Swimming: 0,
    Badminton: 0,
    Tennis: 0,
    Basketball: 0,
    Boxing: 0,
    Volleyball: 0
  };

  if (answers.energy === "team") {
    scores.Football += 3;
    scores.Basketball += 2;
    scores.Volleyball += 2;
    scores.Cricket += 2;
  }

  if (answers.energy === "solo") {
    scores.Badminton += 3;
    scores.Tennis += 3;
    scores.Boxing += 2;
    scores.Swimming += 2;
  }

  if (answers.environment === "water") {
    scores.Swimming += 5;
  }

  if (answers.environment === "indoor") {
    scores.Badminton += 3;
    scores.Basketball += 2;
    scores.Boxing += 2;
  }

  if (answers.environment === "outdoor") {
    scores.Cricket += 3;
    scores.Football += 4;
    scores.Tennis += 2;
    scores.Volleyball += 2;
  }

  if (answers.outcome === "discipline") {
    scores.Swimming += 3;
    scores.Boxing += 3;
    scores.Tennis += 2;
  }

  if (answers.outcome === "fun") {
    scores.Basketball += 3;
    scores.Football += 2;
    scores.Volleyball += 2;
  }

  if (answers.outcome === "competition") {
    scores.Cricket += 3;
    scores.Football += 3;
    scores.Badminton += 2;
    scores.Tennis += 2;
  }

  return Object.entries(scores)
    .map(([sport, score]) => ({
      sport,
      score,
      reason:
        sport === "Swimming"
          ? "Great fit for water confidence and consistent individual progress."
          : sport === "Football"
            ? "Ideal for team-oriented athletes who like energy and match play."
            : sport === "Badminton"
              ? "Strong indoor option with fast, measurable skill growth."
              : sport === "Cricket"
                ? "Good for structured progression and competition pathways."
                : sport === "Tennis"
                  ? "Fits focused athletes who enjoy technical repetition."
                  : sport === "Basketball"
                    ? "Great for movement, teamwork, and high-energy sessions."
                    : sport === "Boxing"
                      ? "Builds discipline, confidence, and conditioning."
                      : "Best for athletes who enjoy team coordination and repetition."
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export function compareAcademies(leftAcademy, rightAcademy) {
  const rows = [
    {
      label: "Rating",
      left: `${leftAcademy.rating.toFixed(1)} / 5`,
      right: `${rightAcademy.rating.toFixed(1)} / 5`,
      winner:
        leftAcademy.rating === rightAcademy.rating
          ? "Tie"
          : leftAcademy.rating > rightAcademy.rating
            ? leftAcademy.name
            : rightAcademy.name
    },
    {
      label: "Fees",
      left: leftAcademy.feeLabel,
      right: rightAcademy.feeLabel,
      winner:
        leftAcademy.monthlyFee === rightAcademy.monthlyFee
          ? "Tie"
          : leftAcademy.monthlyFee < rightAcademy.monthlyFee
            ? leftAcademy.name
            : rightAcademy.name
    },
    {
      label: "Facilities",
      left: `${leftAcademy.facilities.length} included`,
      right: `${rightAcademy.facilities.length} included`,
      winner:
        leftAcademy.facilities.length === rightAcademy.facilities.length
          ? "Tie"
          : leftAcademy.facilities.length > rightAcademy.facilities.length
            ? leftAcademy.name
            : rightAcademy.name
    },
    {
      label: "Best for",
      left: leftAcademy.idealFor,
      right: rightAcademy.idealFor,
      winner: "Depends on athlete goals"
    }
  ];

  const leftScore =
    leftAcademy.rating * 10 +
    leftAcademy.facilities.length * 2 -
    leftAcademy.monthlyFee / 1000;
  const rightScore =
    rightAcademy.rating * 10 +
    rightAcademy.facilities.length * 2 -
    rightAcademy.monthlyFee / 1000;

  const winner =
    leftScore === rightScore
      ? "Tie"
      : leftScore > rightScore
        ? leftAcademy.name
        : rightAcademy.name;

  const verdict =
    winner === "Tie"
      ? "Both academies are strong. Choose based on sport fit, location convenience, and coaching style."
      : `${winner} edges ahead overall, but the better choice still depends on whether the athlete values price, facilities, or competitive intensity most.`;

  return {
    winner,
    verdict,
    rows
  };
}

export function getAssistantReply(message, academies, context = {}) {
  const normalizedMessage = normalizeText(message);
  let workingSet = [...academies];

  const matchedSport = academies.find((academy) =>
    normalizedMessage.includes(normalizeText(academy.sport))
  )?.sport;

  if (matchedSport) {
    workingSet = academies.filter(
      (academy) => normalizeText(academy.sport) === normalizeText(matchedSport)
    );
  }

  const matchedLocation = academies.find((academy) =>
    normalizedMessage.includes(normalizeText(academy.area))
  )?.area;

  if (matchedLocation) {
    workingSet = workingSet.filter((academy) =>
      normalizeText(academy.locationLabel).includes(normalizeText(matchedLocation))
    );
  }

  if (normalizedMessage.includes("cheap") || normalizedMessage.includes("budget")) {
    const cheapest = [...workingSet].sort((left, right) => left.monthlyFee - right.monthlyFee).slice(0, 2);
    return {
      text: cheapest.length
        ? `The most budget-friendly options right now are ${cheapest
            .map((academy) => `${academy.name} (${academy.feeLabel})`)
            .join(" and ")}.`
        : "I could not find budget-first academies for that search yet.",
      suggestedIds: cheapest.map((academy) => academy.id)
    };
  }

  if (
    normalizedMessage.includes("best") ||
    normalizedMessage.includes("top") ||
    normalizedMessage.includes("highest rated")
  ) {
    const topRated = [...workingSet].sort((left, right) => right.rating - left.rating).slice(0, 3);
    return {
      text: topRated.length
        ? `The strongest picks are ${topRated
            .map((academy) => `${academy.name} (${academy.rating.toFixed(1)})`)
            .join(", ")}.`
        : "I do not have top-rated matches for that search yet.",
      suggestedIds: topRated.map((academy) => academy.id)
    };
  }

  if (normalizedMessage.includes("beginner")) {
    const beginnerMatches = workingSet.filter((academy) =>
      safeArray(academy.goals).includes("beginner")
    );
    return {
      text: beginnerMatches.length
        ? `For beginners, I would start with ${beginnerMatches
            .slice(0, 2)
            .map((academy) => academy.name)
            .join(" and ")} because they both emphasize structured entry points.`
        : "I could not find beginner-focused academies in the visible set yet.",
      suggestedIds: beginnerMatches.slice(0, 2).map((academy) => academy.id)
    };
  }

  if (normalizedMessage.includes("timing") || normalizedMessage.includes("schedule")) {
    const firstMatch = workingSet[0] || academies[0];
    return {
      text: firstMatch
        ? `${firstMatch.name} currently lists batches like ${firstMatch.batchTimings
            .slice(0, 2)
            .join(" and ")}. Open the academy details to compare full schedules.`
        : "I do not have timing data for that request yet.",
      suggestedIds: firstMatch ? [firstMatch.id] : []
    };
  }

  if (normalizedMessage.includes("compare")) {
    return {
      text:
        "Use the AI comparison card or select two academies from the results list. I will help explain the trade-offs once both are chosen.",
      suggestedIds: []
    };
  }

  const fallbackSuggestions = academies.slice(0, 2);

  return {
    text:
      context.filters?.sport || context.filters?.location
        ? `Based on the current search, I would start with ${fallbackSuggestions
            .map((academy) => academy.name)
            .join(" and ")}. Ask me about beginner options, fees, best rated programs, or schedules.`
        : "Ask me for beginner-friendly academies, best-rated programs, budget options, or help choosing a sport.",
    suggestedIds: fallbackSuggestions.map((academy) => academy.id)
  };
}
