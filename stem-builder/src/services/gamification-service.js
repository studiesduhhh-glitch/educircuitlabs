const BADGE_RULES = [
  {
    id: "first-spark",
    label: "First Spark",
    check: stats => stats.projectsSaved >= 1
  },
  {
    id: "loop-master",
    label: "Loop Master",
    check: stats => stats.cleanSimulations >= 1
  },
  {
    id: "submission-pro",
    label: "Submission Pro",
    check: stats => stats.projectsSubmitted >= 3
  },
  {
    id: "mentor-mark",
    label: "Mentor Mark",
    check: stats => stats.projectsGraded >= 5
  },
  {
    id: "showcase-star",
    label: "Showcase Star",
    check: stats => stats.publicProjects >= 1
  }
];

export function createGamificationService() {
  function getWeekKey(date = new Date()) {
    const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = current.getUTCDay() || 7;
    current.setUTCDate(current.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
    return `${current.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }

  function createEmptyStats() {
    return {
      xp: 0,
      level: 1,
      weeklyXp: 0,
      weekKey: getWeekKey(),
      cleanSimulations: 0,
      projectsSaved: 0,
      projectsSubmitted: 0,
      projectsGraded: 0,
      publicProjects: 0
    };
  }

  function levelFromXp(xp) {
    return Math.max(1, Math.floor(xp / 120) + 1);
  }

  function eventXp(eventName) {
    return {
      save: 15,
      submit: 40,
      grade: 20,
      cleanSimulation: 25,
      publicShare: 30
    }[eventName] || 0;
  }

  function resetWeeklyIfNeeded(stats, date = new Date()) {
    const weekKey = getWeekKey(date);
    if (stats.weekKey === weekKey) return stats;
    return {
      ...stats,
      weekKey,
      weeklyXp: 0
    };
  }

  function applyEvent(existingStats = createEmptyStats(), eventName, context = {}) {
    const stats = resetWeeklyIfNeeded({
      ...createEmptyStats(),
      ...existingStats
    }, context.date || new Date());

    const earnedXp = eventXp(eventName);
    stats.xp += earnedXp;
    stats.weeklyXp += earnedXp;

    if (eventName === "save") stats.projectsSaved += 1;
    if (eventName === "submit") stats.projectsSubmitted += 1;
    if (eventName === "grade") stats.projectsGraded += 1;
    if (eventName === "cleanSimulation") stats.cleanSimulations += 1;
    if (eventName === "publicShare") stats.publicProjects += 1;

    if (context.visibility === "public") {
      stats.publicProjects = Math.max(stats.publicProjects, 1);
    }

    stats.level = levelFromXp(stats.xp);
    const badges = BADGE_RULES.filter(rule => rule.check(stats)).map(rule => rule.label);

    return { stats, badges };
  }

  function rankLeaderboard(users = []) {
    return [...users]
      .sort((a, b) => {
        const xpDiff = (b.stats?.xp || 0) - (a.stats?.xp || 0);
        if (xpDiff !== 0) return xpDiff;
        return (b.badges?.length || 0) - (a.badges?.length || 0);
      })
      .map((user, index) => ({
        rank: index + 1,
        ...user
      }));
  }

  function rankWeeklyLeaderboard(users = [], date = new Date()) {
    const weekKey = getWeekKey(date);
    return [...users]
      .map(user => ({
        ...user,
        stats: resetWeeklyIfNeeded(user.stats || createEmptyStats(), date)
      }))
      .sort((a, b) => (b.stats?.weeklyXp || 0) - (a.stats?.weeklyXp || 0))
      .map((user, index) => ({
        rank: index + 1,
        weekKey,
        ...user
      }));
  }

  function rankSchools(users = [], date = new Date()) {
    const weekKey = getWeekKey(date);
    const schools = new Map();

    users.forEach(user => {
      const schoolId = user.schoolId || user.schoolKey || user.school || "unknown-school";
      const stats = resetWeeklyIfNeeded(user.stats || createEmptyStats(), date);
      const current = schools.get(schoolId) || {
        schoolId,
        school: user.school || schoolId,
        xp: 0,
        weeklyXp: 0,
        users: 0
      };
      current.xp += stats.xp || 0;
      current.weeklyXp += stats.weeklyXp || 0;
      current.users += 1;
      schools.set(schoolId, current);
    });

    return [...schools.values()]
      .sort((a, b) => b.weeklyXp - a.weeklyXp || b.xp - a.xp)
      .map((school, index) => ({
        rank: index + 1,
        weekKey,
        ...school
      }));
  }

  return {
    getWeekKey,
    createEmptyStats,
    resetWeeklyIfNeeded,
    applyEvent,
    rankLeaderboard,
    rankWeeklyLeaderboard,
    rankSchools
  };
}
