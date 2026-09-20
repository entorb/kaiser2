import { defineConfig } from "vite"

export default defineConfig({
  root: "src",
  publicDir: "../public",
  base: "/kaiser2/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        audio: "list-audio.html",
        icons: "list-icon.html",
        images: "list-image.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "phaser"
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
