# Firestore Schema

## Root Collections

### `users/{uid}`
Stores the canonical identity record used after Firebase Auth login.

```json
{
  "uid": "auth-user-id",
  "name": "Asha Raman",
  "email": "asha@school.edu",
  "role": "student",
  "school": "STEM Academy",
  "schoolId": "stem-academy",
  "schoolKey": "stem-academy",
  "className": "10-A",
  "profilePath": "schools/stem-academy/students/auth-user-id",
  "stats": {
    "xp": 140,
    "level": 2,
    "weeklyXp": 65,
    "weekKey": "2026-W16",
    "cleanSimulations": 1,
    "projectsSaved": 3,
    "projectsSubmitted": 1,
    "projectsGraded": 0,
    "publicProjects": 1
  },
  "badges": ["First Spark", "Loop Master"],
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## School Hierarchy

### `schools/{schoolId}`

```json
{
  "id": "stem-academy",
  "name": "STEM Academy",
  "adminIds": ["admin-uid"],
  "leaderboardEnabled": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `schools/{schoolId}/admins/{adminId}`

```json
{
  "uid": "admin-uid",
  "name": "Admin Name",
  "email": "admin@school.edu",
  "role": "admin",
  "school": "STEM Academy",
  "schoolId": "stem-academy",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `schools/{schoolId}/teachers/{teacherId}`

```json
{
  "uid": "teacher-uid",
  "name": "Teacher Name",
  "email": "teacher@school.edu",
  "role": "teacher",
  "className": "Robotics Lab",
  "school": "STEM Academy",
  "schoolId": "stem-academy",
  "stats": {
    "xp": 220,
    "level": 2,
    "weeklyXp": 40,
    "weekKey": "2026-W16",
    "projectsGraded": 6
  },
  "badges": ["Mentor Mark"],
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `schools/{schoolId}/students/{studentId}`

```json
{
  "uid": "student-uid",
  "name": "Student Name",
  "email": "student@school.edu",
  "role": "student",
  "className": "10-A",
  "school": "STEM Academy",
  "schoolId": "stem-academy",
  "stats": {
    "xp": 140,
    "level": 2,
    "weeklyXp": 65,
    "weekKey": "2026-W16",
    "projectsSaved": 3,
    "projectsSubmitted": 1
  },
  "badges": ["First Spark"],
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `schools/{schoolId}/projects/{projectId}`

```json
{
  "id": "project-id",
  "schoolId": "stem-academy",
  "name": "Smart Lamp",
  "ownerId": "student-uid",
  "ownerName": "Student Name",
  "ownerRole": "student",
  "className": "10-A",
  "status": "SUBMITTED",
  "visibility": "public",
  "cloneable": true,
  "likeCount": 4,
  "likedBy": ["student-uid-2", "teacher-uid-1"],
  "grade": "95",
  "feedback": "Great loop closure and safe voltage budget.",
  "items": [],
  "wires": [],
  "logic": ["ON", "WAIT 1s", "OFF"],
  "simulation": {
    "summary": "Circuit looks healthy.",
    "outputs": {
      "led": { "active": true, "intensityPercent": 88 }
    },
    "diagnostics": []
  },
  "metrics": {
    "componentCount": 3,
    "wireCount": 2,
    "logicCount": 3,
    "diagnosticsCount": 0,
    "qualityScore": 100,
    "numericGrade": 95
  },
  "autoGrade": {
    "totalScore": 95,
    "breakdown": {
      "correctness": 50,
      "logic": 25,
      "safety": 20
    },
    "feedback": "Generated teacher-ready feedback."
  },
  "gradedById": "teacher-uid",
  "gradedByName": "Teacher Name",
  "submittedAt": "serverTimestamp",
  "gradedAt": "serverTimestamp",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## Recommended Indexes

1. `schools/{schoolId}/projects` on `ownerId ASC, updatedAt DESC`
2. `schools/{schoolId}/projects` on `visibility ASC, updatedAt DESC`
3. `users` on `schoolId ASC, stats.weekKey ASC, stats.weeklyXp DESC`
4. Collection group `projects` on `visibility ASC, updatedAt DESC`

## Security Rule Direction

- Only authenticated users can read their own `users/{uid}` doc.
- School admins can write `schools/{schoolId}` and nested `teachers` / `students`.
- Teachers and admins can read all `schools/{schoolId}/projects`.
- Students can write projects where `ownerId == request.auth.uid`.
- Public project reads should allow only docs with `visibility == "public"`.
