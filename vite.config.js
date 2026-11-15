import { defineConfig, loadEnv } from 'vite';
import { handleAsk } from './api/ask.js';
import evidence from './api/evidence.js';

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
        server.middlewares.use('/api/evidence', (request, response) => evidence(request, response));
      },
      configurePreviewServer(server) {
        const config = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
        server.middlewares.use('/api/ask', (request, response) =>
          handleAsk(request, response, config),
        );
        server.middlewares.use('/api/evidence', (request, response) => evidence(request, response));
      },
    },
  ],
}));
