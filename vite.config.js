import { defineConfig } from "vite";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/auth": process.env.API_PROXY_TARGET || "http://localhost:5000",
      "/tasks": process.env.API_PROXY_TARGET || "http://localhost:5000",
      "/leaderboard": process.env.API_PROXY_TARGET || "http://localhost:5000",
      "/users": process.env.API_PROXY_TARGET || "http://localhost:5000",
      "/notifications": process.env.API_PROXY_TARGET || "http://localhost:5000",
      "/health": process.env.API_PROXY_TARGET || "http://localhost:5000",
    },
  },
  build: { sourcemap: false },
});
