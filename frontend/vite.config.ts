import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

const bundleOfflineModel = process.env.NETRAI_BUNDLE_OFFLINE_MODEL === "true";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    command === "build" ? copyPublicAssets(bundleOfflineModel) : null,
  ].filter(Boolean) as PluginOption[],
  publicDir: command === "build" ? false : "public",
  server: {
    port: 5173,
  },
}));

function copyPublicAssets(includeOfflineModel: boolean): PluginOption {
  let root = "";
  let outDir = "";

  return {
    name: "netrai-copy-public-assets",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = resolve(root, config.build.outDir);
    },
    closeBundle() {
      const publicDir = join(root, "public");
      copyDirectory(publicDir, outDir, publicDir, includeOfflineModel);
    },
  };
}

function copyDirectory(sourceDir: string, targetDir: string, publicDir: string, includeOfflineModel: boolean) {
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const relativePath = relative(publicDir, sourcePath).replaceAll("\\", "/");

    if (!includeOfflineModel && (relativePath === "offline-models" || relativePath.startsWith("offline-models/"))) {
      continue;
    }

    const targetPath = join(targetDir, relativePath);
    if (entry.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyDirectory(sourcePath, targetDir, publicDir, includeOfflineModel);
    } else if (entry.isFile()) {
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }
  }
}
