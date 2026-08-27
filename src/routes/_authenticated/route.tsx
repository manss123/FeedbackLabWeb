import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isSignedIn } from "@/lib/learner.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isSignedIn()) throw redirect({ to: "/auth" });
    return {};
  },
  component: () => <Outlet />,
});
