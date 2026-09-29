import { createFileRoute } from "@tanstack/react-router";
import { RankingAssessment } from "@/components/ranking-assessment";
export const Route = createFileRoute("/_authenticated/posttest")({
  head: () => ({
    meta: [
      { title: "แบบทดสอบหลังเรียน — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RankingAssessment phase="posttest" />,
});
