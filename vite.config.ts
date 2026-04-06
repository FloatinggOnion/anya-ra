import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
    base: "/anya-ra/",
    plugins: [svelte()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: "ws",
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },

    build: {
        target: "esnext",
        minify: "esbuild",
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // PDF.js chunk (lazy-loaded, ~1.9MB)
                    if (id.includes("pdfjs-dist")) {
                        return "pdf-viewer";
                    }

                    // CodeMirror chunk (lazy-loaded, ~600KB)
                    if (
                        id.includes("codemirror") ||
                        id.includes("@codemirror")
                    ) {
                        return "code-editor";
                    }

                    // Graph visualization chunk (lazy-loaded, ~400KB)
                    if (id.includes("@xyflow")) {
                        return "graph-canvas";
                    }

                    // Export utilities chunk (lazy-loaded, ~300KB)
                    if (
                        id.includes("jspdf") ||
                        id.includes("html2canvas") ||
                        id.includes("docx")
                    ) {
                        return "export-utils";
                    }

                    // Vendor chunk for shared dependencies
                    if (id.includes("node_modules/") && !id.includes("tauri")) {
                        return "vendor";
                    }
                },
            },
        },
    },

    optimizeDeps: {
        include: [
            "@tauri-apps/api",
            "@tauri-apps/plugin-store",
            "@tauri-apps/plugin-dialog",
            "codemirror",
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/lang-markdown",
        ],
        // Exclude lazy-loaded libraries from pre-bundling
        // This prevents them from being bundled into the main chunk during dev
        exclude: [
            "pdfjs-dist",
            "@xyflow/svelte",
            "jspdf",
            "html2canvas",
            "docx",
        ],
    },
});
