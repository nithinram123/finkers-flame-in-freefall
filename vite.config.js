import { defineConfig, loadEnv } from 'vite';
import { handleAsk } from './api/ask.js';

export default defineConfig(({ mode }) => ({
  esbuild: { jsx: 'automatic' },
  plugins: [
    {
      name: 'local-ask-api',
      configureServer(server) {
        const config = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
        server.middlewares.use('/api/ask', (request, response) =>
          handleAsk(request, response, config),
        );
      },
    },
  ],
}));
