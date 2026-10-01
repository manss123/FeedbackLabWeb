import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

/** Celebrate a newly completed game, without replaying completed drafts on mount. */
export function MiniGameFireworks({ completed }: { completed: boolean }) {
  const previous = useRef(completed);

  useEffect(() => {
    const celebrate = completed && !previous.current;
    previous.current = completed;
    if (!celebrate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "100",
    });
    document.body.appendChild(canvas);
    const fire = confetti.create(canvas, { resize: true, disableForReducedMotion: true });
    const compact = window.innerWidth < 640;
    const defaults: confetti.Options = {
      colors: ["#00c995", "#52b9ff", "#ffc94f", "#ff789f", "#a681ff", "#ffffff"],
      shapes: ["square", "circle"],
      gravity: 0.85,
      decay: 0.94,
      ticks: 260,
      scalar: compact ? 1 : 1.2,
      disableForReducedMotion: true,
    };
    const timers: number[] = [];
    let stopped = false;
    const cleanup = () => {
      if (stopped) return;
      stopped = true;
      timers.forEach(window.clearTimeout);
      fire.reset();
      canvas.remove();
    };
    const volley = (wave: number) => {
      if (stopped) return;
      // Opposing cannons spread the celebration across the viewport.
      const velocity = Math.min(85, Math.max(55, window.innerHeight / 15));
      for (const side of [0, 1]) {
        void fire({
          ...defaults,
          particleCount: compact ? 45 : 70,
          angle: side === 0 ? 60 : 120,
          spread: 65,
          startVelocity: velocity,
          origin: { x: side === 0 ? 0.06 : 0.94, y: 1 },
        });
      }
      const animation = fire({
        ...defaults,
        particleCount: compact ? 60 : 100,
        spread: 100,
        startVelocity: velocity * 1.05,
        origin: { x: 0.5, y: 1 },
      });
      if (wave === 1) void animation?.then(cleanup);
    };
    volley(0);
    timers.push(window.setTimeout(() => volley(1), 550));
    timers.push(window.setTimeout(cleanup, 8000));
    return cleanup;
  }, [completed]);

  return null;
}
