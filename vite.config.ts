import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Config padrão Tauri v2: porta fixa, sem limpar tela do processo Rust,
// ignorar src-tauri no watch para não reiniciar o Vite em builds Rust.
export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "safari16",
  },
});
