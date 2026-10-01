import type { ReactNode } from "react";
import overviewBanner from "@/assets/banners/overview-banner.webp";

/** Shared overview-style frame for the module and simulation catalogues. */
export function LearningHubLayout({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  return (
    <div className="w-full">
      <section className="relative mb-5 xl:min-h-[340px] 2xl:min-h-[380px]">
        <div
          className="overview-banner-frame pointer-events-none absolute inset-x-0 top-0 z-0"
          aria-hidden="true"
        >
          <img src={overviewBanner} alt="" className="overview-banner-art" />
        </div>
        <div className="app-content-container relative z-[1]">
          <div className="min-w-0 space-y-5 pb-4 pt-5 sm:pt-6 xl:w-[67%]">{hero}</div>
        </div>
      </section>
      <div className="app-content-container relative z-[1] space-y-5">{children}</div>
    </div>
  );
}
