import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import "./copy-ort-assets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const localOfflineModel = join(frontendRoot, "public", "offline-models", "dr_classifier.onnx");
const shouldBundleOfflineModel = process.env.NETRAI_BUNDLE_OFFLINE_MODEL === "true";

if (!shouldBundleOfflineModel && existsSync(localOfflineModel)) {
  rmSync(localOfflineModel, { force: true });
  console.log("Removed local offline ONNX model from public assets for web/Cloudflare build.");
}
