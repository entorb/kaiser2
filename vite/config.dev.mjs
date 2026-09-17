import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  base: "/kaiser2/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        audio: "audio-list.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "phaser";
        },
      },
    },
  },
  server: {
    port: 8080,
  },
});
