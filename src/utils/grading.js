export function getGrade(score) {
  if (score === null || score === undefined) return "U";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// Esri diverging ramp: deep green → light green → yellow → orange → red
export function getGradeColor(grade) {
  switch (grade) {
    case "A": return "bg-green-700 text-white";
    case "B": return "bg-green-400 text-white";
    case "C": return "bg-yellow-400 text-slate-800";
    case "D": return "bg-orange-400 text-white";
    case "F": return "bg-red-600 text-white";
    default:  return "bg-slate-300 text-slate-700";
  }
}