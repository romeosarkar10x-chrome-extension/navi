import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ["@wxt-dev/module-react"],
    // Don't auto-launch a browser on `wxt dev`; load the extension manually.
    webExt: {
        disabled: true,
    },
    manifest: {
        name: "Navi",
        description: "AI-powered browser copilot sidebar",
        permissions: ["sidePanel", "storage", "scripting", "activeTab", "tabs"],
        // Needed so the side panel can call user-configured OpenAI-compatible
        // endpoints cross-origin without being blocked by CORS.
        host_permissions: ["http://*/*", "https://*/*"],
        action: {},
    },
    vite: () => ({
        plugins: [tailwindcss()],
    }),
});
