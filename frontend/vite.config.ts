import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

const bundleOfflineModel = process.env.NETRAI_BUNDLE_OFFLINE_MODEL === "true";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    serveOrtPublicAssets(),
    command === "build" ? copyPublicAssets(bundleOfflineModel) : null,
  ].filter(Boolean) as PluginOption[],
  publicDir: command === "build" ? false : "public",
  optimizeDeps: {
    exclude: ["onnxruntime-web", "onnxruntime-web/wasm"],
  },
  assetsInclude: ["**/*.wasm"],
  server: {
    port: 5173,
  },
}));

/**
 * Vite 6 rejects dynamic import() of files under /public (e.g. ORT's
 * ort-wasm-simd-threaded.mjs). Serve /ort/* as raw static files before
 * Vite's transform pipeline so onnxruntime-web can load them in dev.
 */
function serveOrtPublicAssets(): PluginOption {
  return {
    name: "netrai-serve-ort-public-assets",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split("?")[0] ?? "";
        if (!rawUrl.startsWith("/ort/")) {
          next();
          return;
        }

        const filePath = resolve(server.config.root, "public", rawUrl.slice(1));
        const ortRoot = resolve(server.config.root, "public", "ort");
        if (!filePath.startsWith(ortRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
          next();
          return;
        }

        if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) {
          res.setHeader("Content-Type", "text/javascript");
        } else if (filePath.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
        }

        res.setHeader("Cache-Control", "no-cache");
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

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
