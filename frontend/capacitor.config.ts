import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.orbionixtech.netrai",
  appName: "NetrAI",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
