# Educircuit

Educircuit is a desktop-first circuit simulation and classroom learning platform for students and teachers. Students build circuits, run logic, receive AI-guided feedback, save projects, and submit work. Teachers can review submissions, auto-grade circuits, publish assignments, and track classroom progress.

Live site: https://educircuitlabs.com  
Video demo: https://youtu.be/5_uD6pUBvkw

## Features

- Interactive circuit workspace with battery, LED, motor, switch, buzzer, resistor, wiring, and logic blocks.
- Circuit validation for closed loops, polarity, short circuits, voltage safety, and challenge requirements.
- AI Teacher feedback with short, classroom-friendly guidance.
- Voice coach and multilingual interface support.
- Firebase Authentication for students, teachers, and school admins.
- Firestore-backed saved projects, submissions, grading, assignments, XP, leaderboards, and public project sharing.
- Teacher dashboard with submissions, auto-grading, feedback, and classroom summaries.
- Desktop/laptop optimized simulator layout.

## Tech Stack

- HTML5
- CSS3
- JavaScript ES modules
- Firebase Authentication
- Cloud Firestore
- Node test runner

## Project Structure

```text
index.html                 Main application shell
styles/                    Production CSS
src/app/                   Runtime, landing fallback, storage guard
src/core/                  Circuit, AI debugger, learning, viva, classroom engines
src/services/              Firebase-backed auth, project, assignment, dashboard services
src/state/                 Global app state
src/ui/                    UI components, controller, performance helpers
src/simulation/            Legacy simulator bridge
tests/                     Automated regression tests
docs/                      Firestore schema documentation
firestore.rules            Production Firestore security rules
firebase.json              Firebase hosting and rules config
```

## Local Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Serve locally:

```bash
python3 -m http.server 5173
```

Open:

```text
http://localhost:5173/
```

## Firebase Setup

Before deploying, make sure the Firebase project has:

- Email/password Authentication enabled.
- Cloud Firestore enabled.
- The web app config in `src/app/runtime.js` pointing to the correct Firebase project.
- `firestore.rules` deployed.

Deploy hosting and rules:

```bash
firebase deploy --only firestore:rules,hosting
```

Deploy only Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## Security Notes

Educircuit stores classroom data by school:

- `users/{uid}`
- `schools/{schoolId}`
- `schools/{schoolId}/admins/{uid}`
- `schools/{schoolId}/teachers/{uid}`
- `schools/{schoolId}/students/{uid}`
- `schools/{schoolId}/assignments/{assignmentId}`
- `schools/{schoolId}/projects/{projectId}`

The included Firestore rules restrict project reads to owners, same-school staff, or public projects. Likes on public projects are limited to like-related fields. User profile access is scoped to the signed-in user or same-school users.

## CS50 Submission Checklist

- Run `npm test`.
- Open the local site and check the browser console.
- Test account creation, login, save, submit, grade, explore, AI Teacher, and voice coach flows.
- Deploy `firestore.rules` before sharing the production link.
- Keep unrelated projects and duplicate legacy files out of the submitted repository.

## Acknowledgements

Educircuit was built as a CS50 Final Project. The project applies concepts from web development, databases, authentication, testing, debugging, modular design, and product-focused software engineering.
