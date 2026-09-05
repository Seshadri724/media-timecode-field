import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/';

export default defineConfig({
  base,
  root: '.',
  server: {
    port: 5173,
    open: false,
  },
});
