import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CoachingReport, FinalSummaryReport, RoundTwoReport } from "@/types/unity.types";

// Mirrors PresentationContext in unity.types.ts — sent alongside the
// transcript so the LLM can judge feedback against what was actually
// presented in Unity, not just generic feedback quality in a vacuum.
const PresentationContextInput = z.object({
  studentName: z.string(),
  persona: z.string(),
  courseContext: z.string(),
  activity: z.string(),
  behaviors: z.array(z.string()),
  presentationScript: z.string().optional(),
  // Was missing here — zod strips unrecognized keys by default, so
  // assessmentFocus (added to PresentationContext in unity.types.ts and
  // sent from vr-simulation.tsx) was being silently dropped before it ever
  // reached generateCoachingReport/generateRoundTwoReport/generateFinalSummary.
  // The S1-S4 assessmentFocus work only ever reached buildContextBlock()
  // in local dev calls that bypassed this validator — never in production.
  assessmentFocus: z.string().optional(),
});

const RubricScoresInput = z.object({
  speechClarity: z.number(),
  linguisticAppropriateness: z.number(),
  balance: z.number(),
  intentConsistency: z.number(),
});

const CoachingReportInput = z.object({
  transcript: z.string(),
  context: PresentationContextInput.optional(),
  personalGoal: z.string().optional(),
});

const RoundTwoReportInput = z.object({
  transcript2: z.string(),
  context: PresentationContextInput.optional(),
  priorRound: z.object({
    transcript1: z.string(),
    rubric1: RubricScoresInput,
    goals: z.array(z.string()),
  }),
});

// Round 1 (Stage 3) consolidated report — one call produces the rubric,
// emotion (for Unity's SALSA EmoteR), strengths/weaknesses (step 3.2),
// personalized recommendation (step 3.4), and suggested goals (step 3.5).
// See generateCoachingReport in ai.server.ts.
export const generateCoachingReportFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CoachingReportInput.parse(data))
  .handler(async ({ data }): Promise<CoachingReport | null> => {
    const { generateCoachingReport } = await import("@/lib/ai.server");
    return generateCoachingReport(data.transcript, data.context, data.personalGoal);
  });

// Round 2 (Stage 4) lighter report — rubric + emotion + an improvement
// summary aware of the Round 1 transcript/rubric and the goals the teacher
// set. See generateRoundTwoReport in ai.server.ts.
export const generateRoundTwoReportFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => RoundTwoReportInput.parse(data))
  .handler(async ({ data }): Promise<RoundTwoReport | null> => {
    const { generateRoundTwoReport } = await import("@/lib/ai.server");
    return generateRoundTwoReport(data.transcript2, data.context, data.priorRound);
  });

const FinalSummaryInput = z.object({
  transcript1: z.string(),
  transcript2: z.string(),
  rubric1: RubricScoresInput,
  rubric2: RubricScoresInput,
  goals: z.array(z.string()),
  context: PresentationContextInput.optional(),
});

// Summary Dashboard step — one fresh call over BOTH rounds together (not
// CoachingReport's Round-1-only strengths/weaknesses/recommendation).
// See generateFinalSummary in ai.server.ts.
export const generateFinalSummaryFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => FinalSummaryInput.parse(data))
  .handler(async ({ data }): Promise<FinalSummaryReport | null> => {
    const { generateFinalSummary } = await import("@/lib/ai.server");
    return generateFinalSummary(
      data.transcript1,
      data.transcript2,
      data.rubric1,
      data.rubric2,
      data.goals,
      data.context,
    );
  });
