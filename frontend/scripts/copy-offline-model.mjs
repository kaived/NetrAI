import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const source = join(repoRoot, "backend", "models", "dr_classifier.onnx");
const targetDir = join(repoRoot, "frontend", "public", "offline-models");
const target = join(targetDir, "dr_classifier.onnx");

if (!existsSync(source)) {
  throw new Error("backend/models/dr_classifier.onnx was not found. Export or download the APTOS v1 ONNX model first.");
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

const sizeMb = statSync(target).size / (1024 * 1024);
console.log(`Copied aptos-baseline-v1 ONNX model to public/offline-models (${sizeMb.toFixed(1)} MB).`);
