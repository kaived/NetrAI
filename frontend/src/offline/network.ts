import { useEffect, useState } from "react";
import { checkApiHealth } from "../api";

const CONNECTIVITY_CHECK_INTERVAL_MS = 30_000;

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") {
      return true;
    }
    return navigator.onLine;
  });

  useEffect(() => {
    let isCancelled = false;
    let intervalId: number | undefined;

    const refreshCloudReachability = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        return;
      }

      const reachable = await checkApiHealth();
      if (!isCancelled) {
        setIsOnline(reachable);
      }
    };

    const handleOnline = () => {
      void refreshCloudReachability();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshCloudReachability();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void refreshCloudReachability();
    intervalId = window.setInterval(refreshCloudReachability, CONNECTIVITY_CHECK_INTERVAL_MS);

    return () => {
      isCancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isOnline;
}
