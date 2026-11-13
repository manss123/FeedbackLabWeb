/** Shared prerequisites for catalogue buttons and resumed activity runners. */
export const MODULE_SEQUENCE = ["m1", "m2", "m3", "m4", "m5"] as const;
export const SCENARIO_SEQUENCE = ["s1", "s2", "s3", "s4", "s5"] as const;

type LearningProgress = {
  pretest_completed: boolean;
  completed_modules: readonly string[];
  completed_scenarios: readonly string[];
};

export function canOpenModule(state: LearningProgress | undefined, id: string) {
  const index = MODULE_SEQUENCE.findIndex((moduleId) => moduleId === id);
  return (
    !!state?.pretest_completed &&
    index >= 0 &&
    MODULE_SEQUENCE.slice(0, index).every((moduleId) => state.completed_modules.includes(moduleId))
  );
}

export function canOpenVr(state: LearningProgress | undefined) {
  return (
    !!state?.pretest_completed &&
    MODULE_SEQUENCE.every((id) => state.completed_modules.includes(id))
  );
}

export function canOpenScenario(state: LearningProgress | undefined, id: string) {
  const index = SCENARIO_SEQUENCE.findIndex((scenarioId) => scenarioId === id);
  return (
    canOpenVr(state) &&
    index >= 0 &&
    SCENARIO_SEQUENCE.slice(0, index).every((scenarioId) =>
      state!.completed_scenarios.includes(scenarioId),
    )
  );
}
