import {
  escapeHtml,
  formatCompactNumber,
  formatDateLabel,
  formatRating,
  getSportClass
} from "./utils.js";

function renderRatingStars(rating) {
  const roundedRating = Math.round(rating);

  return Array.from({ length: 5 }, (_, index) =>
    index < roundedRating ? "&#9733;" : "&#9734;"
  ).join("");
}

export function heroStatTemplate(stat) {
  return `
    <article class="hero-stat">
      <span>${escapeHtml(stat.label)}</span>
      <strong>${escapeHtml(stat.value)}</strong>
    </article>
  `;
}

export function metricCardTemplate(metric) {
  return `
    <article class="metric-card">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <p>${escapeHtml(metric.hint)}</p>
    </article>
  `;
}

export function dashboardMetricTemplate(metric) {
  return `
    <article class="dashboard-metric">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
    </article>
  `;
}

export function sportTileTemplate(item, isActive = false) {
  return `
    <button class="sport-tile${isActive ? " is-active" : ""}" type="button" data-sport-tile="${escapeHtml(
      item.sport
    )}">
      <strong>${escapeHtml(item.sport)}</strong>
      <span>${escapeHtml(item.insight)}</span>
    </button>
  `;
}

export function spotlightTemplate(academy) {
  if (!academy) {
    return `
      <div class="hero-spotlight">
        <h3>Search spotlight ready</h3>
        <p>Pick a sport or location to surface a focused academy recommendation.</p>
      </div>
    `;
  }

  return `
    <div class="hero-spotlight">
      <span class="academy-pill ${getSportClass(academy.sport)}">${escapeHtml(academy.sport)}</span>
      <h3>${escapeHtml(academy.name)}</h3>
      <p>${escapeHtml(academy.description)}</p>
      <div class="academy-card__meta">
        <span class="academy-card__rating">${renderRatingStars(academy.rating)} ${formatRating(academy.rating)}</span>
        <span>${escapeHtml(academy.feeLabel)}</span>
      </div>
    </div>
  `;
}

export function featuredCardTemplate(academy, isFavorite = false) {
  return `
    <article class="featured-card" data-featured-id="${escapeHtml(academy.id)}">
      <div class="featured-card__image">
        <img src="${escapeHtml(academy.images[0])}" alt="${escapeHtml(
          academy.name
        )}" loading="lazy" />
      </div>
      <div class="featured-card__body">
        <div class="academy-card__labels">
          <span class="academy-pill ${getSportClass(academy.sport)}">${escapeHtml(academy.sport)}</span>
          <span class="academy-pill academy-pill--orange">${escapeHtml(academy.badges[0] || "Featured")}</span>
        </div>
        <div class="academy-card__title-wrap">
          <h3 class="academy-card__title">${escapeHtml(academy.name)}</h3>
          <p class="academy-card__location">${escapeHtml(academy.locationLabel)}</p>
          <p class="feature-card__description">${escapeHtml(academy.description)}</p>
        </div>
        <div class="featured-card__meta">
          <span class="academy-card__rating">${renderRatingStars(academy.rating)} ${formatRating(academy.rating)}</span>
          <span>${escapeHtml(academy.feeLabel)}</span>
        </div>
        <div class="featured-card__actions">
          <button class="ghost-button" type="button" data-action="favorite" data-id="${escapeHtml(
            academy.id
          )}">${isFavorite ? "Saved" : "Save"}</button>
          <button class="search-button" type="button" data-action="details" data-id="${escapeHtml(
            academy.id
          )}">View details</button>
        </div>
      </div>
    </article>
  `;
}

export function stackCardTemplate(academy) {
  return `
    <article class="stack-card" data-card-id="${escapeHtml(academy.id)}">
      <div class="stack-card__top">
        <span class="academy-pill ${getSportClass(academy.sport)}">${escapeHtml(academy.sport)}</span>
        <h3>${escapeHtml(academy.name)}</h3>
        <p>${escapeHtml(academy.locationLabel)}</p>
      </div>
      <div class="academy-card__meta">
        <span class="academy-card__rating">${renderRatingStars(academy.rating)} ${formatRating(academy.rating)}</span>
        <span>${escapeHtml(academy.feeLabel)}</span>
      </div>
      <div class="academy-card__actions">
        <button class="ghost-button" type="button" data-action="compare" data-id="${escapeHtml(
          academy.id
        )}">Compare</button>
        <button class="search-button" type="button" data-action="details" data-id="${escapeHtml(
          academy.id
        )}">View</button>
      </div>
    </article>
  `;
}

export function categoryChipTemplate(sport, isActive = false) {
  return `
    <button class="chip-button${isActive ? " is-active" : ""}" type="button" data-chip-sport="${escapeHtml(
      sport
    )}">
      ${escapeHtml(sport)}
    </button>
  `;
}

export function academyCardTemplate(academy, flags = {}) {
  const compareLabel = flags.isCompared ? "Selected" : "Compare";
  const favoriteLabel = flags.isFavorite ? "Saved" : "Save";

  return `
    <article
      class="academy-card${flags.isSelected ? " is-selected" : ""}${flags.isFavorite ? " is-favorite" : ""}"
      data-card-id="${escapeHtml(academy.id)}"
    >
      <div class="academy-card__image">
        <img src="${escapeHtml(academy.images[0])}" alt="${escapeHtml(
          academy.name
        )}" loading="lazy" />
      </div>
      <div class="academy-card__content">
        <div class="academy-card__top">
          <div class="academy-card__labels">
            <span class="academy-pill ${getSportClass(academy.sport)}">${escapeHtml(academy.sport)}</span>
            <span class="academy-distance">${escapeHtml(academy.locationLabel)}</span>
          </div>
          <div class="academy-card__title-wrap">
            <h3 class="academy-card__title">${escapeHtml(academy.name)}</h3>
            <p class="academy-card__location">${escapeHtml(academy.idealFor)}</p>
            <p class="academy-card__description">${escapeHtml(academy.description)}</p>
          </div>
        </div>
        <div class="academy-card__meta">
          <span class="academy-card__rating">${renderRatingStars(academy.rating)} ${formatRating(academy.rating)}</span>
          <span>${escapeHtml(academy.feeLabel)}</span>
          <span>${escapeHtml(academy.reviewCount)} reviews</span>
        </div>
        <div class="academy-card__actions">
          <button class="ghost-button" type="button" data-action="favorite" data-id="${escapeHtml(
            academy.id
          )}">${favoriteLabel}</button>
          <button class="ghost-button" type="button" data-action="compare" data-id="${escapeHtml(
            academy.id
          )}">${compareLabel}</button>
          <button class="search-button" type="button" data-action="details" data-id="${escapeHtml(
            academy.id
          )}">View details</button>
        </div>
      </div>
    </article>
  `;
}

export function miniCardTemplate(academy, contextLabel = "Open academy") {
  return `
    <article class="mini-card" data-mini-id="${escapeHtml(academy.id)}">
      <div class="mini-card__image">
        <img src="${escapeHtml(academy.images[0])}" alt="${escapeHtml(academy.name)}" loading="lazy" />
      </div>
      <div class="mini-card__top">
        <span class="academy-pill ${getSportClass(academy.sport)}">${escapeHtml(academy.sport)}</span>
        <h3>${escapeHtml(academy.name)}</h3>
        <p>${escapeHtml(academy.locationLabel)}</p>
      </div>
      <div class="mini-card__actions">
        <button class="ghost-button" type="button" data-action="mini-open" data-id="${escapeHtml(
          academy.id
        )}">${escapeHtml(contextLabel)}</button>
      </div>
    </article>
  `;
}

export function emptyMiniStateTemplate(title, description) {
  return `
    <article class="mini-card">
      <div class="mini-card__top">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
    </article>
  `;
}

export function testimonialTemplate(item) {
  return `
    <article class="testimonial-card">
      <div class="testimonial-card__meta">
        <span class="academy-pill academy-pill--green">${escapeHtml(item.role)}</span>
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.quote)}</p>
    </article>
  `;
}

export function newsTemplate(item) {
  return `
    <article class="news-card">
      <div class="news-card__meta">
        <span class="academy-pill academy-pill--blue">${escapeHtml(item.tag)}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
    </article>
  `;
}

export function mapMarkerTemplate(academy, isActive = false, index = 0) {
  return `
    <div
      class="map-marker"
      style="left:${academy.mapPosition.x}%; top:${academy.mapPosition.y}%"
    >
      <button type="button" class="${isActive ? "is-active" : ""}" data-action="map-focus" data-id="${escapeHtml(
        academy.id
      )}" aria-label="Focus ${escapeHtml(academy.name)} on map">
        ${index + 1}
      </button>
    </div>
  `;
}

export function legendCardTemplate(academy) {
  return `
    <article class="legend-card">
      <strong>${escapeHtml(academy.name)}</strong>
      <p>${escapeHtml(academy.locationLabel)}</p>
    </article>
  `;
}

export function coachTemplate(coach) {
  return `
    <article class="coach-item">
      <strong>${escapeHtml(coach.name)}</strong>
      <p>${escapeHtml(coach.specialty)}</p>
      <p>${escapeHtml(coach.experience)}</p>
    </article>
  `;
}

export function reviewTemplate(review) {
  return `
    <article class="review-card">
      <div class="review-card__meta">
        <strong>${escapeHtml(review.title)}</strong>
        <span>${renderRatingStars(review.rating)} ${escapeHtml(String(review.rating))}</span>
      </div>
      <p>${escapeHtml(review.body)}</p>
      <p>${escapeHtml(review.authorName)} • ${escapeHtml(review.role)} • ${formatDateLabel(review.createdAt)}</p>
    </article>
  `;
}

export function starButtonsTemplate(activeRating) {
  return Array.from({ length: 5 }, (_, index) => {
    const nextRating = index + 1;
    return `
      <button
        class="star-button${nextRating <= activeRating ? " is-active" : ""}"
        type="button"
        data-rating="${nextRating}"
        aria-label="Rate ${nextRating} star${nextRating === 1 ? "" : "s"}"
      >
        &#9733;
      </button>
    `;
  }).join("");
}

export function onboardingPreviewTemplate(values) {
  return `
    <div class="compare-row">
      <strong>${escapeHtml(values.name || "Academy name pending")}</strong>
      <span class="academy-pill academy-pill--blue">${escapeHtml(values.sport || "Sport")}</span>
    </div>
    <p>${escapeHtml(values.description || "Add a description in step 3 to complete the launch preview.")}</p>
    <div class="chip-list">
      <span class="chip">${escapeHtml(values.city || "City")}</span>
      <span class="chip">${escapeHtml(values.location || "Area")}</span>
      <span class="chip">${escapeHtml(values.fees || "Monthly fee")}</span>
      <span class="chip">${escapeHtml(values.timings || "Timings")}</span>
    </div>
  `;
}

export function adminMetricTemplate(metric) {
  return `
    <article class="admin-metric">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
    </article>
  `;
}

export function adminRowTemplate(academy) {
  return `
    <article class="admin-row" data-admin-id="${escapeHtml(academy.id)}">
      <div class="admin-row__top">
        <div>
          <strong>${escapeHtml(academy.name)}</strong>
          <p>${escapeHtml(academy.locationLabel)}</p>
        </div>
        <span class="academy-pill ${getSportClass(academy.sport)}">${escapeHtml(academy.sport)}</span>
      </div>
      <div class="academy-card__meta">
        <span>${escapeHtml(academy.feeLabel)}</span>
        <span>${formatRating(academy.rating)} rating</span>
        <span>${formatCompactNumber(academy.reviewCount)} reviews</span>
      </div>
      <div class="academy-card__actions">
        <button class="ghost-button" type="button" data-action="admin-edit" data-id="${escapeHtml(
          academy.id
        )}">Edit</button>
        <button class="search-button" type="button" data-action="details" data-id="${escapeHtml(
          academy.id
        )}">Preview</button>
      </div>
    </article>
  `;
}

export function recommendationTemplate(matches) {
  return `
    <div class="comparison-table">
      ${matches
        .map(
          ({ academy, score, reasons }) => `
            <div class="compare-row">
              <div>
                <strong>${escapeHtml(academy.name)}</strong>
                <p>${escapeHtml(reasons.join(" "))}</p>
              </div>
              <span class="academy-pill ${getSportClass(academy.sport)}">${escapeHtml(String(score))}% fit</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function quizResultTemplate(suggestions) {
  return `
    <div class="comparison-table">
      ${suggestions
        .map(
          (item) => `
            <div class="compare-row">
              <div>
                <strong>${escapeHtml(item.sport)}</strong>
                <p>${escapeHtml(item.reason)}</p>
              </div>
              <button class="ghost-button" type="button" data-action="apply-sport" data-sport="${escapeHtml(
                item.sport
              )}">
                Apply filter
              </button>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function comparisonTemplate(result, leftAcademy, rightAcademy) {
  return `
    <div class="compare-row">
      <strong>${escapeHtml(result.winner === "Tie" ? "Close match" : `${result.winner} leads`)}</strong>
      <span class="academy-pill academy-pill--green">${escapeHtml(leftAcademy.sport)} vs ${escapeHtml(
        rightAcademy.sport
      )}</span>
    </div>
    <p>${escapeHtml(result.verdict)}</p>
    <div class="comparison-table">
      ${result.rows
        .map(
          (row) => `
            <div class="compare-row">
              <div>
                <strong>${escapeHtml(row.label)}</strong>
                <p>${escapeHtml(leftAcademy.name)}: ${escapeHtml(row.left)}</p>
                <p>${escapeHtml(rightAcademy.name)}: ${escapeHtml(row.right)}</p>
              </div>
              <span class="academy-pill academy-pill--orange">${escapeHtml(row.winner)}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function chatBubbleTemplate(message) {
  return `
    <div class="chat-bubble chat-bubble--${escapeHtml(message.role)}">
      ${escapeHtml(message.text)}
    </div>
  `;
}
