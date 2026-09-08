import { Capacitor } from '@capacitor/core';

export function isNativeAppBuild(): boolean {
  return import.meta.env.VITE_NETRAI_APP_SHELL === 'android';
}

export function isInstalledAppShell(): boolean {
  if (isNativeAppBuild()) {
    return true;
  }

  if (Capacitor.isNativePlatform()) {
    return true;
  }

  if (Capacitor.getPlatform() !== 'web') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const capacitorBridge = (
    window as Window & {
      Capacitor?: {
        getPlatform?: () => string;
        isNativePlatform?: () => boolean;
      };
    }
  ).Capacitor;

  if (capacitorBridge?.isNativePlatform?.()) {
    return true;
  }

  const bridgePlatform = capacitorBridge?.getPlatform?.();
  if (bridgePlatform && bridgePlatform !== 'web') {
    return true;
  }

  const isStandalonePwa = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const isIosStandalone =
    typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandalonePwa || isIosStandalone;
}
