import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const sourceDir = join(frontendRoot, "node_modules", "onnxruntime-web", "dist");
const targetDir = join(frontendRoot, "public", "ort");

const requiredFiles = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm"
];

if (!existsSync(sourceDir)) {
  throw new Error("onnxruntime-web/dist was not found. Run npm install first.");
}

mkdirSync(targetDir, { recursive: true });

for (const fileName of readdirSync(targetDir)) {
  if (fileName.startsWith("ort-wasm") && !requiredFiles.includes(fileName)) {
    rmSync(join(targetDir, fileName), { force: true });
  }
}

for (const fileName of requiredFiles) {
  const source = join(sourceDir, fileName);
  const target = join(targetDir, fileName);

  if (!existsSync(source)) {
    throw new Error(`Required ONNX Runtime asset was not found: ${source}`);
  }

  if (existsSync(target) && statSync(source).size === statSync(target).size) {
    continue;
  }

  copyFileSync(source, target);
}

console.log("Copied ONNX Runtime Web assets to public/ort.");
