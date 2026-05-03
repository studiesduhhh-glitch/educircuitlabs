# StudyFlow AI

StudyFlow AI is a modern Android productivity and student assistant app built with Kotlin, Jetpack Compose, MVVM, Room, and local AI-style planning logic.

## Features

- Email/password local authentication and a Google sign-in placeholder.
- Dashboard with daily tasks, upcoming deadlines, study progress, points, and streaks.
- Smart task manager with add/edit/delete, priority, deadlines, notifications, and completion tracking.
- Notes system with subject/topic tags.
- AI assistant that suggests study plans, breaks tasks into smaller steps, and supports local chat prompts.
- Analytics screen with productivity bars and completion stats.
- Offline-first storage with Room over SQLite.
- Bottom navigation, responsive Compose layouts, dark/light mode, and smooth UI animations.

## Run

1. Open this folder in Android Studio:

   `/Users/achyutaownsvishnu/Documents/stem-builder/studyflow-ai`

2. Let Gradle sync.
3. Run the `app` configuration on an emulator or Android phone.

Terminal build:

```sh
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
```

Debug APK:

`app/build/outputs/apk/debug/app-debug.apk`

## Notes

- Package: `com.studyflow.ai`
- Min SDK: 26
- Auth is local-first for this MVP. Firebase can be connected later by replacing `LocalSessionManager`.
- AI features are local rule-based helpers, so the app works offline without API keys.
