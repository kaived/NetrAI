import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const sourceDir = join(frontendRoot, "node_modules", "onnxruntime-web", "dist");
const targetDir = join(frontendRoot, "public", "ort");

const requiredPrefixes = [
  "ort-wasm-simd-threaded",
  "ort-wasm"
];

if (!existsSync(sourceDir)) {
  throw new Error("onnxruntime-web/dist was not found. Run npm install first.");
}

mkdirSync(targetDir, { recursive: true });

for (const fileName of readdirSync(sourceDir)) {
  const shouldCopy = requiredPrefixes.some((prefix) => fileName.startsWith(prefix))
    && /\.(mjs|wasm)$/.test(fileName);

  if (shouldCopy) {
    const source = join(sourceDir, fileName);
    const target = join(targetDir, fileName);
    if (existsSync(target) && statSync(source).size === statSync(target).size) {
      continue;
    }
    copyFileSync(source, target);
  }
}

console.log("Copied ONNX Runtime Web assets to public/ort.");
