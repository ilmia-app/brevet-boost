import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
