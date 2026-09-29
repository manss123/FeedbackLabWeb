/** Faces supplement the visible scale labels; they never indicate correctness. */
export function AssessmentScaleIcon({ level, total = 4 }: { level: number; total?: number }) {
  const faces = total === 5 ? ["😞", "😕", "😐", "🙂", "😊"] : ["😕", "😐", "🙂", "😊"];
  return (
    <span className="assessment-scale-icon shrink-0 text-lg leading-none" aria-hidden="true">
      {faces[level - 1]}
    </span>
  );
}
