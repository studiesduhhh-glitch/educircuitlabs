function numericGrade(value) {
  if (typeof value === "number") return value;
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function summarizeClassPerformance(projects = []) {
  const submissions = projects.filter(project => project.status === "SUBMITTED" || project.status === "GRADED");
  const graded = submissions.filter(project => project.status === "GRADED");
  const numericGrades = graded.map(project => numericGrade(project.grade)).filter(value => value !== null);
  const averageGrade = numericGrades.length
    ? Number((numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length).toFixed(1))
    : null;

  const byStudent = new Map();
  submissions.forEach(project => {
    const key = project.ownerName || "Unknown";
    const current = byStudent.get(key) || { ownerName: key, submitted: 0, graded: 0, averageGrade: null };
    current.submitted += 1;
    if (project.status === "GRADED") {
      current.graded += 1;
      const grade = numericGrade(project.grade);
      if (grade !== null) {
        current._grades = current._grades || [];
        current._grades.push(grade);
      }
    }
    byStudent.set(key, current);
  });

  const studentSummaries = [...byStudent.values()].map(entry => ({
    ownerName: entry.ownerName,
    submitted: entry.submitted,
    graded: entry.graded,
    averageGrade: entry._grades?.length
      ? Number((entry._grades.reduce((sum, value) => sum + value, 0) / entry._grades.length).toFixed(1))
      : null
  }));

  studentSummaries.sort((a, b) => (b.averageGrade || 0) - (a.averageGrade || 0));

  return {
    submissionsCount: submissions.length,
    gradedCount: graded.length,
    averageGrade,
    topPerformers: studentSummaries.slice(0, 5),
    studentSummaries
  };
}

export function autoGradeProject(project = {}, analysis = {}) {
  const diagnostics = analysis.diagnostics || [];
  const errorCount = diagnostics.filter(item => item.severity === "error").length;
  const warningCount = diagnostics.filter(item => item.severity === "warning").length;
  const logicCount = (project.logic || []).length;
  const componentCount = (project.items || []).length;
  const hasOutputs = Object.values(analysis.outputs || {}).some(output => output.active);

  const correctnessScore = Math.max(0, 50 - errorCount * 18 - warningCount * 7 + (hasOutputs ? 8 : 0));
  const logicScore = Math.min(25, logicCount * 8 + (logicCount >= 2 ? 5 : 0));
  const safetyScore = Math.max(0, 25 - errorCount * 12 - warningCount * 4);
  const totalScore = Math.max(0, Math.min(100, Math.round(correctnessScore + logicScore + safetyScore)));

  const feedbackParts = [];
  if (totalScore >= 90) {
    feedbackParts.push("Excellent engineering work. The circuit is safe, logical, and well structured.");
  } else if (totalScore >= 75) {
    feedbackParts.push("Strong project. A few refinements can make the circuit safer and more reliable.");
  } else if (totalScore >= 55) {
    feedbackParts.push("Good start. Focus on completing the loop, improving safety, and using logic blocks clearly.");
  } else {
    feedbackParts.push("This project needs revision before it is production-ready.");
  }

  if (componentCount < 2) {
    feedbackParts.push("Add more meaningful components so the circuit demonstrates a complete idea.");
  }

  if (logicCount === 0) {
    feedbackParts.push("Add ON/OFF/WAIT logic so the simulator can show intentional behavior.");
  }

  diagnostics.slice(0, 3).forEach(diagnostic => {
    feedbackParts.push(`${diagnostic.title}: ${diagnostic.suggestion}`);
  });

  return {
    totalScore,
    grade: String(totalScore),
    breakdown: {
      correctness: Math.round(correctnessScore),
      logic: Math.round(logicScore),
      safety: Math.round(safetyScore)
    },
    feedback: feedbackParts.join(" ")
  };
}
