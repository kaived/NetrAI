import { useEffect, useState } from "react";
import { checkApiHealth } from "../api";
import { hasNativeNetwork, observeDeviceNetwork } from "./deviceNetwork";

const CLOUD_STARTUP_RETRY_TIMEOUT_MS = 15_000;
const CLOUD_RECOVERY_DELAY_MS = 10_000;
const CLOUD_RECOVERY_MAX_DELAY_MS = 30_000;

export type ConnectionStatus = "idle" | "checking" | "online" | "offline" | "unavailable";

export function useConnectionStatus(shouldCheckCloudReachability = true): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() => {
    if (!hasNativeNetwork() && typeof navigator !== "undefined" && !navigator.onLine) return "offline";
    return shouldCheckCloudReachability ? "checking" : "idle";
  });

  useEffect(() => {
    let isCancelled = false;
    let requestId = 0;
    let isChecking = false;
    let deviceConnected = false;
    let isForeground = true;
    let recoveryDelay = CLOUD_RECOVERY_DELAY_MS;
    let recoveryTimer: number | undefined;
    let healthController: AbortController | undefined;

    const clearRecoveryTimer = () => { window.clearTimeout(recoveryTimer); };
    const cancelCheck = () => {
      requestId += 1;
      healthController?.abort();
      isChecking = false;
      clearRecoveryTimer();
    };
    const refreshCloudReachability = async () => {
      if (isCancelled || !deviceConnected || !isForeground) return;
      if (!shouldCheckCloudReachability) {
        setStatus("idle");
        return;
      }

      if (isChecking) return;
      clearRecoveryTimer();
      isChecking = true;
      healthController = new AbortController();
      const signal = healthController.signal;
      const currentRequestId = ++requestId;
      const isCurrentRequest = () => !isCancelled && currentRequestId === requestId;
      setStatus((current) => current === "online" ? current : "checking");

      let reachable = await checkApiHealth(undefined, signal);
      if (!isCurrentRequest()) return;

      // A slow cloud startup is not evidence that the device has lost internet.
      if (!reachable && deviceConnected) {
        reachable = await checkApiHealth(CLOUD_STARTUP_RETRY_TIMEOUT_MS, signal);
      }
      if (!isCurrentRequest()) return;

      isChecking = false;
      setStatus(reachable ? "online" : "unavailable");
      if (reachable) {
        recoveryDelay = CLOUD_RECOVERY_DELAY_MS;
      } else {
        recoveryTimer = window.setTimeout(() => { void refreshCloudReachability(); }, recoveryDelay);
        recoveryDelay = Math.min(recoveryDelay * 2, CLOUD_RECOVERY_MAX_DELAY_MS);
      }
    };

    const stopObserving = observeDeviceNetwork((connected) => {
      deviceConnected = connected;
      if (!connected) {
        cancelCheck();
        recoveryDelay = CLOUD_RECOVERY_DELAY_MS;
        setStatus("offline");
      } else {
        void refreshCloudReachability();
      }
    }, (active) => {
      isForeground = active;
      if (!active) cancelCheck();
    }, shouldCheckCloudReachability);

    return () => {
      isCancelled = true;
      cancelCheck();
      stopObserving();
    };
  }, [shouldCheckCloudReachability]);

  return status;
}
