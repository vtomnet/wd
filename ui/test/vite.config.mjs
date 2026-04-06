import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "use-sync-external-store/shim",
      "radix-ui",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "node_modules/shadcn-ui-upstream/apps/v4"),
    },
  },
  server: {
    host: "127.0.0.1",
    fs: {
      allow: [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../.."),
      ],
    },
  },
});
