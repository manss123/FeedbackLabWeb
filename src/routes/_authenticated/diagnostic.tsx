import { createFileRoute } from "@tanstack/react-router";
import { RankingAssessment } from "@/components/ranking-assessment";
export const Route = createFileRoute("/_authenticated/diagnostic")({
  head: () => ({
    meta: [
      { title: "แบบทดสอบก่อนเรียน — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RankingAssessment phase="pretest" />,
});
