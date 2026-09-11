import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Network } from "@capacitor/network";

const DEVICE_RECHECK_MS = 5_000;

export function hasNativeNetwork(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Network");
}

export function observeDeviceNetwork(
  onConnection: (connected: boolean) => void,
  onForeground: (active: boolean) => void,
  watchWhileOffline: boolean,
): () => void {
  const native = hasNativeNetwork();
  let disposed = false;
  let connected: boolean | undefined;
  let appActive = true;
  let readVersion = 0;
  let isReading = false;
  const listeners: PluginListenerHandle[] = [];
  const isForeground = () => appActive && document.visibilityState !== "hidden";

  const report = (value: boolean) => {
    if (disposed) return;
    connected = value;
    onConnection(value);
  };
  const readConnection = async () => {
    if (disposed || isReading) return;
    if (!native) {
      report(navigator.onLine);
      return;
    }
    isReading = true;
    const version = ++readVersion;
    try {
      const status = await Network.getStatus();
      if (!disposed && version === readVersion) report(status.connected);
    } catch {
      // A missing native bridge can fall back to browser detection in older shells.
      if (!disposed && version === readVersion) report(connected ?? navigator.onLine);
    } finally {
      isReading = false;
    }
  };
  const trackListener = (listener: Promise<PluginListenerHandle>) => {
    void listener.then((handle) => {
      if (disposed) void handle.remove().catch(() => undefined);
      else listeners.push(handle);
    }).catch(() => undefined);
  };
  const handleNetworkEvent = () => { void readConnection(); };
  const handleForeground = () => {
    if (disposed) return;
    const active = isForeground();
    onForeground(active);
    if (active) void readConnection();
  };

  window.addEventListener("online", handleNetworkEvent);
  window.addEventListener("offline", handleNetworkEvent);
  document.addEventListener("visibilitychange", handleForeground);
  if (native) {
    trackListener(Network.addListener("networkStatusChange", (status) => {
      readVersion += 1;
      report(status.connected);
    }));
    if (Capacitor.isPluginAvailable("App")) {
      trackListener(App.addListener("appStateChange", ({ isActive }) => {
        appActive = isActive;
        handleForeground();
      }));
    }
  }
  handleForeground();
  // This checks the device, not the API, and catches a missed reconnect event.
  const timer = watchWhileOffline ? window.setInterval(() => {
    if (isForeground() && connected !== true) void readConnection();
  }, DEVICE_RECHECK_MS) : undefined;

  return () => {
    disposed = true;
    readVersion += 1;
    window.clearInterval(timer);
    window.removeEventListener("online", handleNetworkEvent);
    window.removeEventListener("offline", handleNetworkEvent);
    document.removeEventListener("visibilitychange", handleForeground);
    for (const listener of listeners) void listener.remove().catch(() => undefined);
  };
}
