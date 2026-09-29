import { createFileRoute } from "@tanstack/react-router";
import { SurveyQuestionnaires } from "@/components/survey-questionnaires";

export const Route = createFileRoute("/_authenticated/survey")({
  head: () => ({
    meta: [
      { title: "แบบสอบถามหลังจบการทดลอง — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <SurveyQuestionnaires />,
});
