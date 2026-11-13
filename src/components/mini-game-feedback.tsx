import { Lightbulb, MessageCircle } from "lucide-react";

export function MiniGameFeedback({ response, hint }: { response: string; hint?: string }) {
  return (
    <div
      className={`grid gap-4 rounded-xl border border-border bg-white p-4 text-sm leading-relaxed ${hint ? "lg:grid-cols-2" : ""}`}
    >
      <div>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 font-bold text-sky-700">
          <MessageCircle className="size-4" />
          Feedback
        </span>
        <p>{response}</p>
      </div>
      {hint && (
        <div className="border-t border-border pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
            <Lightbulb className="size-4" />
            Hint
          </span>
          <p>{hint}</p>
        </div>
      )}
    </div>
  );
}
