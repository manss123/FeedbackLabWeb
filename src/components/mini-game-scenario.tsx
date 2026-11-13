import { MessageCircle } from "lucide-react";

export function MiniGameScenario({
  title,
  situation,
  cues,
  image,
  videoId,
}: {
  title: string;
  situation: string;
  cues: string[];
  image?: string;
  videoId?: string;
}) {
  return (
    <section aria-label={`สถานการณ์ ${title}`} className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-monitor-teal">
        <MessageCircle className="size-5" /> สถานการณ์
      </p>
      <div className="grid items-stretch gap-4 min-[1440px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50">
          {videoId ? (
            <iframe
              key={videoId}
              title={`วิดีโอสถานการณ์ ${title}`}
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              className="aspect-video w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <img
              src={image}
              alt={`ภาพประกอบสถานการณ์ ${title}`}
              className="h-auto w-full object-contain"
              loading="lazy"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center rounded-xl border border-monitor-blue/15 bg-gradient-to-br from-background to-monitor-blue/5 p-4 sm:p-5">
          <p className="leading-relaxed">{situation}</p>
          {cues.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-text">
              {cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          )}
          {videoId && (
            <a
              className="mt-3 text-sm text-monitor-teal underline underline-offset-4"
              href={`https://youtu.be/${videoId}`}
              target="_blank"
              rel="noreferrer"
            >
              เปิดวิดีโอใน YouTube
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
