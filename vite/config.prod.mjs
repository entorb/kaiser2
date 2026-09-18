import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const base = "/kaiser2/";

const phasermsg = () => {
  return {
    name: "phasermsg",
    buildStart() {
      process.stdout.write(`Building for production...\n`);
    },
    buildEnd() {
      const line = "---------------------------------------------------------";
      const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;
      process.stdout.write(`${line}\n${msg}\n${line}\n`);

      process.stdout.write(`✨ Done ✨\n`);
    },
  };
};

export default defineConfig({
  root: "src",
  publicDir: "../public",
  base,
  logLevel: "warning",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
        audio: "list-audio.html",
        icons: "list-icon.html",
        images: "list-image.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "phaser";
        },
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
  },
  server: {
    port: 8080,
  },
  plugins: [
    phasermsg(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      manifest: {
        name: "KAISER II Remake",
        short_name: "Kaiser 2",
        description: "Remake of the 1989 Atari game Kaiser 2.",
        lang: "en",
        display: "standalone",
        orientation: "landscape",
        id: base,
        start_url: base,
        scope: base,
        background_color: "#241810",
        theme_color: "#241810",
        categories: ["games"],
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
