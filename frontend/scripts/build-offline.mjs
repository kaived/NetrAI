import { spawnSync } from "node:child_process";

const DEFAULT_ANDROID_API_BASE_URL = "https://retinascan-api-58990504584.asia-south1.run.app";

function runNpm(args, options = {}) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", ["npm", ...args].join(" ")]
    : args;

  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: false,
    ...options
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveAndroidApiBaseUrl() {
  const explicitAndroidUrl = process.env.NETRAI_ANDROID_API_BASE_URL?.trim();
  if (explicitAndroidUrl) {
    return explicitAndroidUrl.replace(/\/$/, "");
  }

  const viteUrl = process.env.VITE_API_BASE_URL?.trim();
  if (!viteUrl || isLocalApiUrl(viteUrl)) {
    return DEFAULT_ANDROID_API_BASE_URL;
  }

  return viteUrl.replace(/\/$/, "");
}

function isLocalApiUrl(value) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value);
}

const androidApiBaseUrl = resolveAndroidApiBaseUrl();

runNpm(["run", "sync:offline-model"]);
runNpm(["run", "build"], {
  env: {
    ...process.env,
    NETRAI_BUNDLE_OFFLINE_MODEL: "true",
    VITE_API_BASE_URL: androidApiBaseUrl,
    VITE_OFFLINE_MODEL_URL: "/offline-models/dr_classifier.onnx",
    VITE_PREFETCH_OFFLINE_MODEL: "true",
    VITE_NETRAI_APP_SHELL: "android"
  }
});
