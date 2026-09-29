import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadLearnerAccess } from "@/lib/learner-access";
import { LearnerAccessError, LearnerAccessPending } from "@/components/learner-access-state";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const access = await loadLearnerAccess(context.queryClient);
    if (!access) throw redirect({ to: "/", replace: true });
    const pathname = location.pathname.replace(/\/$/, "");
    if (
      (access.destination !== "/overview" && pathname !== access.destination) ||
      (access.destination === "/overview" && ["/consent", "/onboarding"].includes(pathname))
    ) {
      throw redirect({ to: access.destination, replace: true });
    }
    return { learnerUser: access.user };
  },
  pendingComponent: LearnerAccessPending,
  pendingMs: 0,
  errorComponent: LearnerAccessError,
  component: () => <Outlet />,
});
