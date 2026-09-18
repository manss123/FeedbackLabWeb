export interface YouTubePlayer {
  destroy(): void;
  getCurrentTime(): number;
  getPlaybackRate(): number;
  getPlayerState(): number;
  getIframe(): HTMLIFrameElement;
}
interface PlayerEvent {
  target: YouTubePlayer;
  data: number;
}
interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: PlayerEvent) => void;
        onStateChange: (event: PlayerEvent) => void;
        onPlaybackRateChange: (event: PlayerEvent) => void;
        onError: (event: PlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YouTubeApi> | undefined;
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeApi>((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.onYouTubeIframeAPIReady;
    const ready = () => {
      try {
        previous?.();
      } finally {
        if (window.YT?.Player) {
          cleanup();
          resolve(window.YT);
        }
      }
    };
    const cleanup = () => {
      clearTimeout(timeout);
      script.onerror = null;
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      cleanup();
      script.remove();
      loading = undefined;
      reject(new Error("YouTube API failed to load"));
    };
    const timeout = window.setTimeout(fail, 20_000);
    window.onYouTubeIframeAPIReady = ready;
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
