import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
const resolveBunPackage = (pkg: string) => {
  const bunDir = path.resolve(__dirname, "node_modules/.bun");
  const bunName = pkg.replace("/", "+");

  if (fs.existsSync(bunDir)) {
    const match = fs.readdirSync(bunDir).find((entry) => entry === bunName || entry.startsWith(`${bunName}@`));
    if (match) {
      return path.resolve(bunDir, match, "node_modules", pkg);
    }
  }

  return path.resolve(__dirname, "node_modules", pkg);
};

const reactPath = resolveBunPackage("react");
const reactDomPath = resolveBunPackage("react-dom");
const reactRouterPath = resolveBunPackage("react-router");
const reactRouterDomPath = resolveBunPackage("react-router-dom");
const remixRouterPath = resolveBunPackage("@remix-run/router");

export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Don't activate the SW in dev — Lovable preview runs in an iframe and
      // a SW would cache stale builds + intercept navigation.
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "robots.txt",
      ],
      manifest: {
        name: "Sprint DNB",
        short_name: "Sprint DNB",
        description: "Planifie et réussis ton brevet des collèges",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#2F6FDB",
        lang: "fr",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions/],
        cleanupOutdatedCaches: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: reactPath,
      "react-dom": reactDomPath,
      "react/jsx-runtime": path.resolve(reactPath, "jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(reactPath, "jsx-dev-runtime.js"),
      "react-router": reactRouterPath,
      "react-router-dom": reactRouterDomPath,
      "@remix-run/router": remixRouterPath,
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "react-router", "react-router-dom", "@remix-run/router", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
