import { spawnSync } from "node:child_process";

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

runNpm(["run", "sync:offline-model"]);
runNpm(["run", "build"], {
  env: {
    ...process.env,
    NETRAI_BUNDLE_OFFLINE_MODEL: "true",
    VITE_OFFLINE_MODEL_URL: "/offline-models/dr_classifier.onnx",
    VITE_PREFETCH_OFFLINE_MODEL: "true"
  }
});
