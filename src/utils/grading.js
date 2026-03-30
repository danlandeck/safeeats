export function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getGradeColor(grade) {
  switch (grade) {
    case "A": return "bg-slate-900 text-white";
    case "B": return "bg-slate-600 text-white";
    case "C": return "bg-amber-500 text-white";
    case "D": return "bg-orange-500 text-white";
    case "F": return "bg-red-600 text-white";
    default:  return "bg-slate-400 text-white";
  }
}