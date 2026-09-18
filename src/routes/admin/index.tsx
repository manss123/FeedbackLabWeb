import { createFileRoute } from "@tanstack/react-router";
import { AdminResearchDashboard } from "@/components/admin-research-dashboard";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminResearchDashboard,
});
