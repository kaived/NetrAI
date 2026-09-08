/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_ACCESS_KEY?: string;
  readonly VITE_OFFLINE_MODEL_URL?: string;
  readonly VITE_PREFETCH_OFFLINE_MODEL?: string;
  readonly VITE_ANDROID_APK_URL?: string;
  readonly VITE_NETRAI_APP_SHELL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
