import { OFFLINE_MODEL_URL } from "../inference/imageProcessing";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        if (import.meta.env.VITE_PREFETCH_OFFLINE_MODEL === "true") {
          return navigator.serviceWorker.ready.then(() => prefetchOfflineModel());
        }
        return undefined;
      })
      .catch((error) => {
        console.warn("NetrAI service worker registration failed", error);
      });
  });
}

async function prefetchOfflineModel(): Promise<void> {
  const response = await fetch(OFFLINE_MODEL_URL, { cache: "reload" });
  if (!response.ok) {
    throw new Error(`Offline model prefetch failed with HTTP ${response.status}.`);
  }
}
