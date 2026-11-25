import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.API_PROXY_TARGET || "http://localhost:5080";
  const devPort = Number(env.DEV_PORT || 5173);
  if (!Number.isInteger(devPort) || devPort < 1 || devPort > 65535) {
    throw new Error("DEV_PORT must be an integer between 1 and 65535.");
  }

  return {
    base: "/",
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "robots.txt"],
        devOptions: {
          enabled: true,
        },
        manifest: {
          name: "GrainLedger",
          short_name: "GrainLedger",
          description: "Ghi nhận thu mua lúa tại nông hộ, kể cả khi mất kết nối.",
          id: "/",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#F5F5F7",
          theme_color: "#2F6B3A",
          lang: "vi",
          icons: [
            {
              src: "pwa-icon.png",
              sizes: "any",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: devPort,
      proxy: {
        "/api/auth/google": {
          target: proxyTarget,
          changeOrigin: false,
        },
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/health": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/signin-google": {
          target: proxyTarget,
          changeOrigin: false,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router-dom/")
            ) {
              return "vendor-react";
            }
            if (id.includes("node_modules/framer-motion/")) {
              return "vendor-motion";
            }
            if (id.includes("node_modules/recharts/")) {
              return "vendor-charts";
            }
            if (id.includes("node_modules/@phosphor-icons/")) {
              return "vendor-icons";
            }
            if (
              id.includes("node_modules/@tanstack/") ||
              id.includes("node_modules/zustand/") ||
              id.includes("node_modules/zod/") ||
              id.includes("node_modules/decimal.js/")
            ) {
              return "vendor-data";
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
