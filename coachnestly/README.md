# CoachNestly MVP

CoachNestly is now a startup-ready front-end MVP for discovering nearby sports coaching academies.

## What changed

- Real academy search and instant filtering by sport, location, and intent
- Detail view with fees, timings, coaches, facilities, reviews, and contact actions
- Local auth flow with parent and student modes
- Favorites, recently viewed academies, and newsletter persistence via local storage
- AI recommendation, sport quiz, chatbot, and comparison experiences
- Multi-step academy onboarding plus a local admin dashboard concept
- Dark mode, toasts, skeleton loading, lazy-loaded assets, and stronger metadata

## Project structure

```text
.
├── assets/
├── index.html
├── styles.css
└── src/
    ├── app.js
    ├── data/
    │   ├── academies.js
    │   └── content.js
    └── modules/
        ├── ai.js
        ├── data-service.js
        ├── storage.js
        ├── ui.js
        └── utils.js
```

## Local run

Use any static server. Example:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

## Notes

- The current auth, reviews, onboarding, and admin flows are local-first so the MVP works without a backend.
- Data is organized into backend-ready records so it can be moved into an API and database with minimal reshaping.
