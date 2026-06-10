import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Renderer build. base "./" so the built index.html loads its assets over the
// file:// protocol inside Electron (no dev server in production).
export default defineConfig({
  plugins: [preact()],
  base: "./",
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
  },
  server: { port: 5273, strictPort: true },
});
