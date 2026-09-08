import { useEffect, useState } from "react";
import { checkApiHealth } from "../api";

const CONNECTIVITY_RECHECK_COOLDOWN_MS = 15_000;

export function useOnlineStatus(shouldCheckCloudReachability = true): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") {
      return true;
    }
    return navigator.onLine;
  });

  useEffect(() => {
    let isCancelled = false;
    let lastCheckedAt = 0;

    const refreshCloudReachability = async (force = false) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        return;
      }

      if (!shouldCheckCloudReachability) {
        setIsOnline(true);
        return;
      }

      const now = Date.now();
      if (!force && now - lastCheckedAt < CONNECTIVITY_RECHECK_COOLDOWN_MS) {
        return;
      }
      lastCheckedAt = now;

      const reachable = await checkApiHealth();
      if (!isCancelled) {
        setIsOnline(reachable);
      }
    };

    const handleOnline = () => {
      void refreshCloudReachability(true);
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
    void refreshCloudReachability(true);

    return () => {
      isCancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shouldCheckCloudReachability]);

  return isOnline;
}
