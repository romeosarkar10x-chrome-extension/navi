import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Navi',
    description: 'AI-powered browser copilot sidebar',
    permissions: ['sidePanel'],
    action: {},
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
